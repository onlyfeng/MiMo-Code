import { afterEach, beforeEach, describe, expect, mock } from "bun:test"
import { Effect, Layer } from "effect"
import { Bus } from "../../src/bus"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { InboxController } from "../../src/inbox"
import { InboxWakeTable } from "../../src/inbox/inbox.sql"
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
import { Database, eq } from "../../src/storage"
import { Log } from "../../src/util"
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

describe("inbox delivery across processes", () => {
  it.live("an input that must not adopt its receiver waits, unowned, until a process opens the session", provideTmpdirInstance(() => Effect.gen(function* () {
    const tq = yield* InboxController.Service
    const session = yield* (yield* Session.Service).create({})
    const receipt = yield* tq.accept({ ...input(session.id), adoptReceiver: false })

    expect(receipt.state).toBe("accepted")
    expect(kicked(session.id)).toBe(0)
    expect(owner(session.id)).toBeUndefined()
    expect(wakes(session.id)).toHaveLength(1)

    // Opening the session claims it; the wake poller then starts the lane here.
    Database.use((db) => SessionOwner.claim(db, session.id))
    for (let waited = 0; kicked(session.id) === 0 && waited < 5_000; waited += 50) yield* Effect.sleep(50)
    expect(kicked(session.id)).toBe(1)
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
    const session = yield* (yield* Session.Service).create({})
    yield* tq.accept(input(session.id))
    expect(kicked(session.id)).toBe(1)
    expect(owner(session.id)?.instance_id).toBe(ProcessLiveness.INSTANCE_ID)
    expect(wakes(session.id)).toHaveLength(0)
  })), 30_000)
})
