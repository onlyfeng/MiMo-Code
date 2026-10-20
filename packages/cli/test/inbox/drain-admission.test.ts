import { describe, expect } from "bun:test"
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect"
import { ActorRegistry } from "../../src/actor/registry"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Inbox, InboxController } from "../../src/inbox"
import { defaultModelRef } from "../../src/inbox/inbox-ref"
import { gcInboxRows } from "../../src/inbox/inbox"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { Database, eq } from "../../src/storage"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(Inbox.defaultLayer, InboxController.defaultLayer, Session.defaultLayer,
  ActorRegistry.defaultLayer, CrossSpawnSpawner.defaultLayer))
const model = { providerID: ProviderID.make("test"), modelID: ModelID.make("model") }

const seed = Effect.fn(function* () {
  const sessions = yield* Session.Service
  const actors = yield* ActorRegistry.Service
  const inbox = yield* Inbox.Service
  const controller = yield* InboxController.Service
  const session = yield* sessions.create({ title: "Inbox admission" })
  yield* actors.register({ sessionID: session.id, actorID: "receiver", mode: "peer", agent: "general",
    description: "Admission receiver", contextMode: "none", background: false, lifecycle: "persistent" })
  const entered = yield* Deferred.make<void>()
  const release = yield* Deferred.make<void>()
  const previous = defaultModelRef.current
  defaultModelRef.current = { defaultModel: () => Deferred.succeed(entered, undefined).pipe(Effect.andThen(Deferred.await(release)), Effect.as(model)) }
  yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined).pipe(Effect.andThen(Effect.sync(() => {
    defaultModelRef.current = previous
  }))))
  const input = { receiverSessionID: session.id, receiverActorID: "receiver", type: "actor_notification", content: "notification" }
  const rows = () => Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, session.id)).all())
  return { sessions, actors, inbox, controller, session, entered, release, input, rows }
})

describe("Inbox admission after asynchronous model resolution", () => {
  for (const boundary of ["cancelled", "epoch", "retired"] as const) {
    it.live(`${boundary} during seed resolution writes no transcript or receipt`, provideTmpdirInstance(() => Effect.gen(function* () {
      const f = yield* seed()
      let cancelled = false
      const epoch = yield* f.controller.getEpoch(f.session.id)
      const accepting = yield* f.inbox.accept(f.input, { deferKick: true, isCancelled: () => cancelled, expectedEpoch: epoch }).pipe(Effect.forkChild)
      yield* Deferred.await(f.entered)
      expect(f.rows()).toEqual([])
      expect(yield* f.sessions.messages({ sessionID: f.session.id, agentID: "receiver" })).toEqual([])
      if (boundary === "cancelled") cancelled = true
      if (boundary === "epoch") yield* f.controller.abortSession(f.session.id)
      if (boundary === "retired") yield* f.actors.updateStatus(f.session.id, "receiver", { status: "idle", lastOutcome: "cancelled" })
      yield* Deferred.succeed(f.release, undefined)
      const exit = yield* Fiber.await(accepting)
      expect(Exit.isFailure(exit)).toBe(true)
      expect(f.rows()).toEqual([])
      expect(yield* f.sessions.messages({ sessionID: f.session.id, agentID: "receiver" })).toEqual([])
    })))
  }

  it.live("interrupting seed resolution writes nothing and a fresh admission remains possible", provideTmpdirInstance(() => Effect.gen(function* () {
    const f = yield* seed()
    const accepting = yield* f.inbox.accept(f.input, { deferKick: true }).pipe(Effect.forkChild)
    yield* Deferred.await(f.entered)
    yield* Fiber.interrupt(accepting)
    const exit = yield* Fiber.await(accepting)
    expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true)
    expect(f.rows()).toEqual([])
    yield* Deferred.succeed(f.release, undefined)
    const receipt = yield* f.inbox.accept(f.input, { deferKick: true })
    expect(f.rows().map((row) => row.id)).toEqual([receipt.inboxID])
  })))

  it.live("concurrent claims cannot consume the same input and terminal-only GC preserves accepted work", provideTmpdirInstance(() => Effect.gen(function* () {
    const f = yield* seed()
    yield* Deferred.succeed(f.release, undefined)
    const receipt = yield* f.inbox.accept(f.input, { deferKick: true })
    Database.use((db) => db.update(InboxTable).set({ time_updated: 0 }).where(eq(InboxTable.id, receipt.inboxID)).run())
    yield* gcInboxRows(0)
    expect(f.rows()).toHaveLength(1)
    const lane = { sessionID: f.session.id, agentID: "receiver" }
    const claims = yield* Effect.all([f.controller.claimNext(lane, 1), f.controller.claimNext(lane, 2)], { concurrency: "unbounded" })
    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(claims.find(Boolean)?.receipts.map((item) => item.id)).toEqual([receipt.inboxID])
    yield* f.controller.cancelLane(lane)
    expect(f.rows()[0].state).toBe("cancelled")
    expect(f.rows()[0].outcome).toBe("never_ran")
    expect(yield* f.controller.claimNext(lane, 3)).toBeUndefined()
    expect((yield* f.sessions.messages({ sessionID: f.session.id, agentID: "receiver" }))[0].parts).toHaveLength(1)
  })))
})
