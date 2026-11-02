import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock } from "bun:test"
import { Deferred, Effect, Fiber, Layer, Logger, ManagedRuntime } from "effect"
import { Bus } from "../../src/bus"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { InboxController } from "../../src/inbox"
import { InboxLaneStateTable, InboxTable, InboxWakeTable } from "../../src/inbox/inbox.sql"
import { schedulerRef } from "../../src/inbox/scheduler"
import type { Lane } from "../../src/inbox/schema"
import { Instance } from "../../src/project/instance"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { ProcessLiveness } from "../../src/session/process-liveness"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { SessionOwner } from "../../src/session/session-owner"
import { SessionOwnerTable } from "../../src/session/session-owner.sql"
import { Database, eq, sql } from "../../src/storage"
import { Log } from "../../src/util"
import { GlobalBus } from "../../src/bus/global"
import { SyncEvent } from "../../src/sync"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { startProcessOwner } from "../lib/process-owner"

void Log.init({ print: false })

const originalScheduler = schedulerRef.current
let kick: ReturnType<typeof mock<(lane: Lane) => Effect.Effect<void>>>
beforeEach(() => {
  kick = mock((_lane: Lane) => Effect.void)
  schedulerRef.current = { kick }
})
afterEach(async () => {
  schedulerRef.current = originalScheduler
  await Instance.disposeAll()
})

const it = testEffect(Layer.mergeAll(Session.defaultLayer, CrossSpawnSpawner.defaultLayer, Bus.layer, InboxController.defaultLayer))

// The application routes Effect logs to its log file; a woken lane must keep that
// logger, or its logs land on the terminal under the TUI.
const logged: string[] = []
const capture = Logger.layer([Logger.make((options) => { logged.push(String(options.message)) })], { mergeWithExisting: false })
const itLogged = testEffect(Layer.mergeAll(Session.defaultLayer, CrossSpawnSpawner.defaultLayer, Bus.layer, InboxController.defaultLayer)
  .pipe(Layer.provideMerge(capture)))

// A controller built earlier in this process and never disposed, like the global
// AppRuntime one other test files start. Wakes must still go to the current one.
let stale: ManagedRuntime.ManagedRuntime<InboxController.Service, never> | undefined
beforeAll(async () => {
  stale = ManagedRuntime.make(InboxController.defaultLayer)
  await stale.runPromise(InboxController.Service.use(() => Effect.void))
})
afterAll(async () => {
  await stale?.dispose()
})

function input(sessionID: SessionID) {
  const id = MessageID.ascending()
  const message: MessageV2.User = {
    id, sessionID, agentID: "main", role: "user", time: { created: Date.now() }, agent: "build",
    model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
  }
  const part: MessageV2.TextPart = { id: PartID.ascending(), sessionID, messageID: id, type: "text", text: "from another session" }
  return { lane: { sessionID, agentID: "main" }, message, parts: [part] as MessageV2.Part[], type: "text", senderSessionID: SessionID.descending() }
}

const wakes = (sessionID: SessionID) =>
  Database.use((db) => db.select().from(InboxWakeTable).where(eq(InboxWakeTable.session_id, sessionID)).all())
const owner = (sessionID: SessionID) =>
  Database.use((db) => db.select().from(SessionOwnerTable).where(eq(SessionOwnerTable.session_id, sessionID)).get())

const kicked = (sessionID: SessionID) => kick.mock.calls.filter(([lane]) => lane.sessionID === sessionID).length

// What a lane run does with its waiting input: claim it, then settle it.
const consume = (tq: InboxController.Interface) => (lane: Lane) => Effect.gen(function* () {
  const runId = Date.now()
  const claim = yield* tq.claimNext(lane, runId)
  if (!claim) return
  yield* tq.ack(lane, claim.claimFrontier, claim.receipts.map((receipt) => ({ receiptId: receipt.id, outcome: "success" as const })), runId)
})

describe("inbox delivery across processes", () => {
  it.live("an input that must not adopt its receiver waits, unowned, until a process opens the session", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    kick.mockImplementation(consume(tq))
    const session = yield* (yield* Session.Service).create({})
    const receipt = yield* tq.accept({ ...input(session.id), adoptReceiver: false })

    expect(receipt.state).toBe("accepted")
    expect(kicked(session.id)).toBe(0)
    expect(owner(session.id)).toBeUndefined()
    expect(wakes(session.id)).toHaveLength(1)

    // Opening the session claims it; the wake poller then starts the lane here
    // (its first-run reconciliation may start the same lane as well).
    Database.use((db) => SessionOwner.claim(db, session.id))
    for (let waited = 0; (kicked(session.id) === 0 || wakes(session.id).length > 0) && waited < 5_000; waited += 50) yield* Effect.sleep(50)
    expect(kicked(session.id)).toBeGreaterThan(0)
    expect(wakes(session.id)).toHaveLength(0)
  })), 30_000)

  it.live("a receiver another live process runs is never started here; its owner is woken instead", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    const session = yield* (yield* Session.Service).create({})
    const other = yield* Effect.promise(() => startProcessOwner(ProcessLiveness.directory()))
    yield* Effect.addFinalizer(() => Effect.promise(other.kill))
    Database.use((db) => db.insert(SessionOwnerTable)
      .values({ session_id: session.id, instance_id: other.instanceID, pid: other.pid, time_claimed: Date.now() }).run())

    yield* tq.accept(input(session.id))
    yield* Effect.sleep(2_500)
    expect(kicked(session.id)).toBe(0)
    expect(owner(session.id)?.instance_id).toBe(other.instanceID)
    expect(wakes(session.id)).toHaveLength(1)
  })), 30_000)

  // What another process leaves behind when it accepts input for a session this process owns.
  const remoteAccept = (sessionID: SessionID) => Database.use((db) => {
    db.insert(InboxLaneStateTable).values({ session_id: sessionID, agent_id: "main", input_revision: 1, time_updated: Date.now() })
      .onConflictDoUpdate({ target: [InboxLaneStateTable.session_id, InboxLaneStateTable.agent_id], set: { input_revision: sql`${InboxLaneStateTable.input_revision} + 1` } }).run()
    SessionOwner.ringWake(db, { sessionID, agentID: "main" })
  })
  const until = (check: () => boolean) => Effect.gen(function* () {
    for (let waited = 0; !check() && waited < 5_000; waited += 50) yield* Effect.sleep(50)
  })

  it.live("a wake stays until its lane has run, so an owner that dies first leaves it for the next one", provideTmpdirInstance(() => Effect.gen(function* () {
    const session = yield* (yield* Session.Service).create({})
    const release = yield* Deferred.make<void>()
    kick.mockImplementation(() => Deferred.await(release))
    Database.use((db) => SessionOwner.claim(db, session.id))
    remoteAccept(session.id)

    yield* until(() => kicked(session.id) > 0)
    expect(kicked(session.id)).toBe(1)
    // The lane is still running: the wake survives, and the poller does not kick again.
    yield* Effect.sleep(2_000)
    expect(wakes(session.id)).toHaveLength(1)
    expect(kicked(session.id)).toBe(1)

    yield* Deferred.succeed(release, undefined)
    yield* until(() => wakes(session.id).length === 0)
    expect(wakes(session.id)).toHaveLength(0)
  })), 30_000)

  it.live("a reopened session is reconciled before its woken lane runs, so a first prompt cannot cancel that run", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    const session = yield* (yield* Session.Service).create({})
    const receipt = yield* tq.accept({ ...input(session.id), adoptReceiver: false })
    const release = yield* Deferred.make<void>()
    yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
    // The woken run claims the receipt and is still working on it.
    kick.mockImplementation(() => Effect.sync(() => Database.use((db) => db.update(InboxTable).set({ state: "claimed", run_id: 1 })
      .where(eq(InboxTable.id, receipt.id)).run())).pipe(Effect.andThen(Deferred.await(release))))

    // Opening the session in this process: the poller starts the queued input.
    Database.use((db) => SessionOwner.claim(db, session.id))
    yield* until(() => kicked(session.id) > 0)
    expect((yield* tq.getReceipt(receipt.id)).state).toBe("claimed")

    // The user's first prompt reconciles the session; the live claim must survive it.
    yield* tq.reconcileOnBoot(session.id)
    expect((yield* tq.getReceipt(receipt.id)).state).toBe("claimed")
  })), 30_000)

  it.live("input another process accepted wakes this process's input waiters", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    const session = yield* (yield* Session.Service).create({})
    const release = yield* Deferred.make<void>()
    // The lane is busy, as in an actor wait; only the waiter can see the new input.
    kick.mockImplementation(() => Deferred.await(release))
    yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
    Database.use((db) => SessionOwner.claim(db, session.id))
    const lane = { sessionID: session.id, agentID: "main" }
    const before = yield* tq.observeInput(lane, -1)
    const waiting = yield* tq.observeInput(lane, before).pipe(Effect.forkChild)
    // Let the waiter subscribe first; a poll with nothing new must not release it.
    yield* Effect.sleep(2_000)
    expect(waiting.pollUnsafe()).toBeUndefined()

    remoteAccept(session.id)
    yield* until(() => waiting.pollUnsafe() !== undefined)
    expect(waiting.pollUnsafe()).toBeDefined()
    expect(yield* Fiber.join(waiting)).toBe(before + 1)
  })), 30_000)

  it.live("a sender interrupted right after accepting still leaves the receiver's wake", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    const session = yield* (yield* Session.Service).create({})
    const sent = input(session.id)
    // Interrupt the accepting fiber the moment its commit announces the message,
    // before anything after the commit runs.
    let accepting: Fiber.Fiber<unknown, unknown> | undefined
    const listener = (event: { payload: { type: string; properties?: { info?: { id?: string } } } }) => {
      if (event.payload.type === "message.updated" && event.payload.properties?.info?.id === sent.message.id) accepting?.interruptUnsafe()
    }
    GlobalBus.on("event", listener)
    yield* Effect.addFinalizer(() => Effect.sync(() => GlobalBus.off("event", listener)))
    accepting = yield* tq.accept({ ...sent, adoptReceiver: false }).pipe(Effect.forkChild)
    yield* Fiber.await(accepting)

    const receipt = Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.input_message_id, sent.message.id)).get())
    expect(receipt?.state).toBe("accepted")
    expect(wakes(session.id)).toHaveLength(1)
    expect(kicked(session.id)).toBe(0)
  })), 30_000)

  it.live("input another process wrote is shown here even when a running turn claims it before any wake poll", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    const session = yield* (yield* Session.Service).create({})
    Database.use((db) => SessionOwner.claim(db, session.id))
    const shown: string[] = []
    const listener = (event: { payload: { type: string; properties?: { info?: { id?: string } } } }) => {
      if (event.payload.type === "message.updated" && event.payload.properties?.info?.id) shown.push(event.payload.properties.info.id)
    }
    GlobalBus.on("event", listener)
    yield* Effect.addFinalizer(() => Effect.sync(() => GlobalBus.off("event", listener)))

    // Another process accepts input: its message is stored, but only its own bus announced it.
    const remote = input(session.id)
    SyncEvent.run(MessageV2.Event.Updated, { sessionID: session.id, info: remote.message }, { publish: false })
    for (const part of remote.parts) SyncEvent.run(MessageV2.Event.PartUpdated, { sessionID: session.id, part, time: Date.now() }, { publish: false })
    Database.use((db) => {
      db.insert(InboxTable).values({
        id: "receipt_remote", receiver_session_id: session.id, receiver_actor_id: "main", type: "text",
        input_message_id: remote.message.id, state: "accepted", epoch: 0, created_at: Date.now(), time_updated: Date.now(),
      }).run()
    })
    expect(shown).not.toContain(remote.message.id)

    // The running turn takes it first.
    const claimed = yield* tq.claimNext({ sessionID: session.id, agentID: "main" }, 1)
    expect(claimed?.receipts.map((receipt) => receipt.id)).toEqual(["receipt_remote"])
    expect(shown).toContain(remote.message.id)
  })), 30_000)

  itLogged.live("a woken lane runs with the controller's logger, not the default console one", provideTmpdirInstance(() => Effect.gen(function* () {
    const session = yield* (yield* Session.Service).create({})
    kick.mockImplementation(() => Effect.logInfo("woken lane log"))
    Database.use((db) => SessionOwner.claim(db, session.id))
    remoteAccept(session.id)
    yield* until(() => kicked(session.id) > 0 && wakes(session.id).length === 0)
    expect(kicked(session.id)).toBeGreaterThan(0)
    expect(logged.some((line) => line.includes("woken lane log"))).toBe(true)
  })), 30_000)

  it.live("without a lane scheduler an adoptable input leaves neither an owner nor a wake", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    const session = yield* (yield* Session.Service).create({})
    schedulerRef.current = undefined
    const receipt = yield* tq.accept(input(session.id))
    expect(receipt.state).toBe("accepted")
    expect(owner(session.id)).toBeUndefined()
    expect(wakes(session.id)).toHaveLength(0)
  })), 30_000)

  it.live("an input that may adopt starts an unowned receiver in this process", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    kick.mockImplementation(consume(tq))
    const session = yield* (yield* Session.Service).create({})
    yield* tq.accept(input(session.id))
    expect(kicked(session.id)).toBe(1)
    expect(owner(session.id)?.instance_id).toBe(ProcessLiveness.INSTANCE_ID)
    expect(wakes(session.id)).toHaveLength(0)
  })), 30_000)

  it.live("input a run leaves unclaimed is kicked again until a run claims it", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    const session = yield* (yield* Session.Service).create({})
    const receipt = yield* tq.accept({ ...input(session.id), adoptReceiver: false })
    // The first round (the woken kick and its first-run reconciliation kick) ends
    // without claiming, as runs that fail before their claim do.
    let first: number | undefined
    let claimedAt: number | undefined
    kick.mockImplementation((lane) => {
      const now = Date.now()
      first ??= now
      if (now - first < 1_000) return Effect.void
      claimedAt ??= now
      return consume(tq)(lane)
    })

    Database.use((db) => SessionOwner.claim(db, session.id))
    yield* until(() => kicked(session.id) > 0)
    yield* Effect.sleep(300)
    expect((yield* tq.getReceipt(receipt.id)).state).toBe("accepted")
    expect(wakes(session.id)).toHaveLength(1)

    for (let waited = 0; (yield* tq.getReceipt(receipt.id)).state !== "settled" && waited < 10_000; waited += 100) yield* Effect.sleep(100)
    expect((yield* tq.getReceipt(receipt.id)).state).toBe("settled")
    // The claiming run is the retry, after its backoff, not the first round.
    expect(claimedAt! - first!).toBeGreaterThanOrEqual(1_400)
    yield* until(() => wakes(session.id).length === 0)
    expect(wakes(session.id)).toHaveLength(0)
  })), 30_000)

  it.live("a lane that keeps leaving its input unclaimed is retried with growing backoff, not on every poll", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    const session = yield* (yield* Session.Service).create({})
    yield* tq.accept({ ...input(session.id), adoptReceiver: false })
    // Kicks that start together form one round.
    const rounds: number[] = []
    kick.mockImplementation(() => Effect.sync(() => {
      const now = Date.now()
      if (rounds.length === 0 || now - rounds[rounds.length - 1]! > 500) rounds.push(now)
    }))

    Database.use((db) => SessionOwner.claim(db, session.id))
    for (let waited = 0; rounds.length < 3 && waited < 15_000; waited += 50) yield* Effect.sleep(50)
    expect(rounds.length).toBeGreaterThanOrEqual(3)
    // Each retry waits at least its backoff (1.5 s, then 3 s) instead of the 1–1.5 s poll.
    expect(rounds[1]! - rounds[0]!).toBeGreaterThanOrEqual(1_400)
    expect(rounds[2]! - rounds[1]!).toBeGreaterThanOrEqual(2_900)
  })), 30_000)
})
