import { describe, expect } from "bun:test"
import { Effect, Exit, Layer } from "effect"
import { ActorRegistry } from "../../src/actor/registry"
import { Bus } from "../../src/bus"
import { GlobalBus, type GlobalEvent } from "../../src/bus/global"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Inbox } from "../../src/inbox"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { Database, eq, sql } from "../../src/storage"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const base = Layer.mergeAll(
  Session.defaultLayer,
  ActorRegistry.defaultLayer,
  Bus.defaultLayer,
  CrossSpawnSpawner.defaultLayer,
)
const it = testEffect(Inbox.layer.pipe(Layer.provideMerge(base)))

const seed = Effect.fn(function* () {
  const sessions = yield* Session.Service
  const actors = yield* ActorRegistry.Service
  const inbox = yield* Inbox.Service
  const session = yield* sessions.create({ title: "Atomic inbox" })
  yield* actors.register({
    sessionID: session.id,
    actorID: "receiver",
    mode: "subagent",
    parentActorID: undefined,
    agent: "general",
    description: "Atomic inbox receiver",
    contextMode: "none",
    contextWatermark: undefined,
    background: false,
    lifecycle: "ephemeral",
  })
  yield* sessions.createMessage({
    id: MessageID.ascending(),
    sessionID: session.id,
    agentID: "receiver",
    role: "user",
    agent: "general",
    model: { providerID: ProviderID.make("test"), modelID: ModelID.make("model") },
    time: { created: Date.now() },
  })
  // Start at the durable queue boundary, without scheduling an unrelated wake.
  const rows = ["first notification", "second notification"].map((text, index) => ({
    id: `${session.id}_notification_${index}`,
    receiver_session_id: session.id,
    receiver_actor_id: "receiver",
    type: "actor_notification",
    content: { text },
    created_at: Date.now(),
  }))
  Database.use((db) => db.insert(InboxTable).values(rows).run())
  const pending = () =>
    Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, session.id)).all())
  const messages = () =>
    sessions
      .messages({ sessionID: session.id, agentID: "receiver" })
      .pipe(
        Effect.map((messages) =>
          messages.filter((message) => message.info.role === "user" && message.info.source === "spawn"),
        ),
      )
  return { session, inbox, pending, messages }
})

describe("Inbox.drain atomic queue consumption", () => {
  for (const stage of ["part", "delete"] as const) {
    it.live(`a ${stage} write failure leaves the complete queue and no partial transcript or events`, () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const f = yield* seed()
          const before = f.pending()
          const events: GlobalEvent[] = []
          const listener = (event: GlobalEvent) => {
            if (event.payload.type === "sync" && event.payload.syncEvent.aggregateID === f.session.id)
              events.push(event)
          }
          GlobalBus.on("event", listener)
          Database.use((db) =>
            db.run(
              stage === "part"
                ? sql`CREATE TEMP TRIGGER reject_inbox_write BEFORE INSERT ON part WHEN json_extract(NEW.data, '$.text') = 'second notification' BEGIN SELECT RAISE(ABORT, 'inbox part write failure'); END`
                : sql`CREATE TEMP TRIGGER reject_inbox_write BEFORE DELETE ON inbox BEGIN SELECT RAISE(ABORT, 'inbox queue delete failure'); END`,
            ),
          )
          const result = yield* f.inbox.drain(f.session.id, "receiver").pipe(
            Effect.exit,
            Effect.ensuring(
              Effect.sync(() => {
                Database.use((db) => db.run(sql`DROP TRIGGER reject_inbox_write`))
                GlobalBus.off("event", listener)
              }),
            ),
          )
          expect(Exit.isFailure(result)).toBe(true)
          expect(f.pending()).toEqual(before)
          expect(yield* f.messages()).toEqual([])
          expect(events).toEqual([])

          expect(yield* f.inbox.drain(f.session.id, "receiver")).toBe(2)
          const messages = yield* f.messages()
          expect(messages).toHaveLength(1)
          expect(
            messages[0].parts.map((part) => (part.type === "text" ? part.text : "")).sort((a, b) => a.localeCompare(b)),
          ).toEqual(["first notification", "second notification"])
          expect(f.pending()).toEqual([])
          expect(yield* f.inbox.drain(f.session.id, "receiver")).toBe(0)
        }),
      ),
    )
  }

  it.live("a postcommit observer sees the complete message and an already consumed queue", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        const observations: { queued: number; parts: number }[] = []
        const listener = (event: GlobalEvent) => {
          if (event.payload.type !== "sync" || event.payload.syncEvent.aggregateID !== f.session.id) return
          observations.push({
            queued: f.pending().length,
            parts: Database.use(
              (db) =>
                db.get<{ count: number }>(sql`SELECT count(*) AS count FROM part WHERE session_id = ${f.session.id}`)
                  .count,
            ),
          })
        }
        GlobalBus.on("event", listener)
        const count = yield* f.inbox
          .drain(f.session.id, "receiver")
          .pipe(Effect.ensuring(Effect.sync(() => GlobalBus.off("event", listener))))
        expect(count).toBe(2)
        expect(observations).toHaveLength(3)
        expect(observations).toEqual([
          { queued: 0, parts: 2 },
          { queued: 0, parts: 2 },
          { queued: 0, parts: 2 },
        ])
      }),
    ),
  )

  it.live("a throwing postcommit publisher cannot strand or replay an already committed batch", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        let observed = false
        const listener = (event: GlobalEvent) => {
          if (event.payload.type !== "sync" || event.payload.syncEvent.aggregateID !== f.session.id) return
          observed = true
          throw new Error("inbox postcommit publisher failure")
        }
        GlobalBus.on("event", listener)
        const result = yield* f.inbox
          .drain(f.session.id, "receiver")
          .pipe(Effect.exit, Effect.ensuring(Effect.sync(() => GlobalBus.off("event", listener))))
        expect(observed).toBe(true)
        expect(Exit.isSuccess(result)).toBe(true)
        if (Exit.isSuccess(result)) expect(result.value).toBe(2)
        const messages = yield* f.messages()
        expect(messages).toHaveLength(1)
        expect(messages[0].parts).toHaveLength(2)
        expect(f.pending()).toEqual([])
        expect(yield* f.inbox.drain(f.session.id, "receiver")).toBe(0)
        expect(yield* f.messages()).toEqual(messages)
      }),
    ),
  )
})
