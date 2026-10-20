import { describe, expect } from "bun:test"
import { Effect, Exit, Layer } from "effect"
import { GlobalBus, type GlobalEvent } from "../../src/bus/global"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { InboxController } from "../../src/inbox"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { Session } from "../../src/session"
import { MessageID, PartID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Database, eq, sql } from "../../src/storage"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(InboxController.defaultLayer, Session.defaultLayer, CrossSpawnSpawner.defaultLayer))
const seed = Effect.fn(function* () {
  const sessions = yield* Session.Service
  const controller = yield* InboxController.Service
  const session = yield* sessions.create({ title: "Atomic inbox" })
  const message = { id: MessageID.ascending(), sessionID: session.id, agentID: "main", role: "user" as const,
    source: "spawn" as const, agent: "general", model: { providerID: ProviderID.make("test"), modelID: ModelID.make("model") }, time: { created: Date.now() } }
  const parts = ["first notification", "second notification"].map((text) => ({ id: PartID.ascending(), sessionID: session.id,
    messageID: message.id, type: "text" as const, synthetic: true, text }))
  const input = { lane: { sessionID: session.id, agentID: "main" }, message, parts, type: "actor_notification" }
  const rows = () => Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, session.id)).all())
  return { sessions, controller, session, input, rows, accept: () => controller.accept(input, { deferKick: true }) }
})

describe("Inbox acceptance commits transcript and receipt together", () => {
  for (const stage of ["part", "receipt"] as const) {
    it.live(`${stage} write failure leaves no transcript, receipt or published event`, provideTmpdirInstance(() => Effect.gen(function* () {
      const f = yield* seed()
      const events: GlobalEvent[] = []
      const listener = (event: GlobalEvent) => {
        if (event.payload.type === "sync" && event.payload.syncEvent.aggregateID === f.session.id) events.push(event)
      }
      GlobalBus.on("event", listener)
      Database.use((db) => db.run(stage === "part"
        ? sql`CREATE TEMP TRIGGER reject_accept BEFORE INSERT ON part WHEN json_extract(NEW.data, '$.text') = 'second notification' BEGIN SELECT RAISE(ABORT, 'part failed'); END`
        : sql`CREATE TEMP TRIGGER reject_accept BEFORE INSERT ON inbox BEGIN SELECT RAISE(ABORT, 'receipt failed'); END`))
      const exit = yield* f.accept().pipe(Effect.exit, Effect.ensuring(Effect.sync(() => {
        Database.use((db) => db.run(sql`DROP TRIGGER reject_accept`))
        GlobalBus.off("event", listener)
      })))
      expect(Exit.isFailure(exit)).toBe(true)
      expect(f.rows()).toEqual([])
      expect(yield* f.sessions.messages({ sessionID: f.session.id })).toEqual([])
      expect(events).toEqual([])
      const receipt = yield* f.accept()
      expect(receipt.state).toBe("accepted")
      expect((yield* f.sessions.messages({ sessionID: f.session.id }))[0].parts).toHaveLength(2)
    })))
  }

  for (const throws of [false, true]) {
    it.live(`postcommit observer sees the complete acceptance${throws ? " even when it throws" : ""}`, provideTmpdirInstance(() => Effect.gen(function* () {
      const f = yield* seed()
      const observed: { receipts: number; parts: number }[] = []
      const listener = (event: GlobalEvent) => {
        if (event.payload.type !== "sync" || event.payload.syncEvent.aggregateID !== f.session.id) return
        observed.push({ receipts: f.rows().length, parts: Database.use((db) =>
          db.get<{ count: number }>(sql`SELECT count(*) AS count FROM part WHERE session_id = ${f.session.id}`).count) })
        if (throws) throw new Error("postcommit observer failed")
      }
      GlobalBus.on("event", listener)
      const receipt = yield* f.accept().pipe(Effect.ensuring(Effect.sync(() => GlobalBus.off("event", listener))))
      expect(observed.length).toBeGreaterThan(0)
      expect(observed.every((item) => item.receipts === 1 && item.parts === 2)).toBe(true)
      expect((yield* f.accept()).id).toBe(receipt.id)
      expect(f.rows()).toHaveLength(1)
      expect((yield* f.sessions.messages({ sessionID: f.session.id }))[0].parts).toHaveLength(2)
    })))
  }

  it.live("same-message replay validates complete content and preserves opaque ID chronology", provideTmpdirInstance(() => Effect.gen(function* () {
    const f = yield* seed()
    const lower = MessageID.ascending()
    const higher = MessageID.ascending()
    f.input.message.id = higher
    f.input.parts.forEach((part) => { part.messageID = higher })
    const first = yield* f.accept()
    const message = { ...f.input.message, id: lower }
    const parts = f.input.parts.map((part) => ({ ...part, id: PartID.ascending(), messageID: lower }))
    const second = yield* f.controller.accept({ ...f.input, message, parts }, { deferKick: true })
    expect(first.id < second.id).toBe(true)
    const claimed = yield* f.controller.claimNext(f.input.lane, 1)
    expect(claimed?.receipts.map((receipt) => receipt.inputMessageID)).toEqual([higher, lower])
    expect(claimed?.claimFrontier).toBe(lower)
    const conflict = yield* f.controller.accept({ ...f.input, parts: f.input.parts.map((part) => ({ ...part, text: "changed" })) }, { deferKick: true }).pipe(Effect.exit)
    expect(Exit.isFailure(conflict)).toBe(true)
    expect(f.rows()).toHaveLength(2)
  })))
})
