import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { ActorRegistry } from "../../src/actor/registry"
import { Bus } from "../../src/bus"
import { writeCronTasks, type CronTask } from "../../src/cron/cron-task"
import { Scheduler, defaultLayer as SchedulerDefaultLayer } from "../../src/cron/scheduler"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Inbox } from "../../src/inbox"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { schedulerRef } from "../../src/inbox/scheduler"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { CronBridge, layer as cronBridgeLayer } from "../../src/session/cron-bridge"
import { MessageV2 } from "../../src/session/message-v2"
import type { SessionID } from "../../src/session/schema"
import type { InjectScheduledPromptInput } from "../../src/session/prompt"
import { SessionStatus } from "../../src/session/status"
import { Database, eq } from "../../src/storage"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const base = Layer.mergeAll(SchedulerDefaultLayer, SessionStatus.defaultLayer, Bus.layer)
const inboxDeps = Layer.mergeAll(Bus.layer, ActorRegistry.defaultLayer, Session.defaultLayer)
const it = testEffect(
  Layer.mergeAll(
    base,
    cronBridgeLayer.pipe(Layer.provide(base)),
    Session.defaultLayer,
    ActorRegistry.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Inbox.layer.pipe(Layer.provide(inboxDeps)),
  ),
)

afterEach(async () => {
  await Instance.disposeAll()
})

const rowsFor = (sessionID: SessionID) =>
  Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, sessionID)).all())

describe("durable cron delivery to another session (DC-SESSION-001)", () => {
  it.live(
    "a durable task for another session reaches its inbox once per slot, while this session is busy",
    provideTmpdirInstance((dir) =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const bridge = yield* CronBridge
        const scheduler = yield* Scheduler
        const status = yield* SessionStatus.Service
        const here = yield* sessions.create({ title: "holds the cron lock" })
        const there = yield* sessions.create({ title: "created the task" })

        // This process must not run the other session's lane.
        const kicks: string[] = []
        const previous = schedulerRef.current
        schedulerRef.current = { kick: (lane) => Effect.sync(() => void kicks.push(lane.sessionID)) }
        yield* Effect.addFinalizer(() => Effect.sync(() => void (schedulerRef.current = previous)))

        const task: CronTask = {
          id: "watch1",
          cron: "* * * * *",
          prompt: "check the lanes",
          createdAt: Date.now() - 5 * 60_000,
          recurring: true,
          durable: true,
          createdBySessionId: there.id,
        }
        yield* writeCronTasks([task], dir)
        const injected: InjectScheduledPromptInput[] = []
        const inject = (input: InjectScheduledPromptInput) => Effect.sync(() => void injected.push(input))

        // A turn of this session is running; the bridge reads that when it starts.
        yield* status.set(here.id, { type: "busy" })
        yield* bridge.start(here.id, dir, inject)
        yield* scheduler.tickOnce()
        for (let waited = 0; rowsFor(there.id).length === 0 && waited < 2_000; waited += 20) yield* Effect.sleep(20)

        const rows = rowsFor(there.id)
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ type: "cron", receiver_actor_id: "main", state: "accepted" })
        expect(rows[0].idempotency_key).toMatch(/^cron:watch1:\d+$/)
        const message = MessageV2.get({ sessionID: there.id, messageID: rows[0].input_message_id! })
        expect(message.parts).toEqual([
          expect.objectContaining({
            type: "text",
            synthetic: true,
            text: expect.stringMatching(/^\[cron fire @ \S+\] check the lanes$/),
            metadata: expect.objectContaining({ origin: expect.objectContaining({ kind: "cron", taskId: "watch1" }) }),
          }),
        ])
        expect(injected).toEqual([])
        expect(kicks).toEqual([])

        // A restart before the fire was recorded fires the slot again; it is delivered once.
        yield* bridge.stop()
        yield* writeCronTasks([task], dir)
        yield* bridge.start(here.id, dir, inject)
        yield* scheduler.tickOnce()
        yield* Effect.sleep(200)
        expect(rowsFor(there.id)).toHaveLength(1)
        yield* bridge.stop()
      }),
    ),
    30_000,
  )
})
