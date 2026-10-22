import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Database, eq } from "../../src/storage"
import { PartTable } from "../../src/session/session.sql"
import { extract } from "../../src/history/extract"
import { indexImportedParts } from "../../src/history/import"
import { HistoryFtsTable } from "../../src/history/fts.sql"
import { captureExportData, sanitize } from "../../src/cli/cmd/export"
import { storeImportedSession } from "../../src/cli/cmd/import"
import { Bus } from "../../src/bus"
import { GlobalBus, type GlobalEvent } from "../../src/bus/global"
import { SyncEvent } from "../../src/sync"
import { EventSequenceTable, EventTable } from "../../src/sync/event.sql"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(Session.defaultLayer, CrossSpawnSpawner.defaultLayer))

const turn = Effect.fn("test.retryRecordTurn")(function* (
  sessionID: SessionID,
  name: string,
  created: number,
  agentID = "main",
) {
  const sessions = yield* Session.Service
  const user = yield* sessions.updateMessage({
    id: MessageID.make(`msg_${name}_${sessionID}`),
    sessionID,
    agentID,
    role: "user",
    agent: "build",
    model: { providerID: ProviderID.make("test"), modelID: ModelID.make("model") },
    time: { created },
  })
  const assistant = yield* sessions.updateMessage({
    id: MessageID.ascending(),
    sessionID,
    agentID,
    role: "assistant",
    parentID: user.id,
    agent: "build",
    mode: "build",
    modelID: ModelID.make("model"),
    providerID: ProviderID.make("test"),
    path: { cwd: "/tmp/example", root: "/tmp/example" },
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: created + 0.5 },
  })
  const retry: MessageV2.RetryPart = {
    id: PartID.ascending(),
    messageID: assistant.id,
    sessionID,
    type: "retry",
    attempt: 2,
    phase: "stream",
    scope: "live-step",
    kind: "server",
    message: "retry-record-marker",
    next: created + 1,
    time: { created, updated: created + 1 },
  }
  yield* sessions.updatePart(retry)
  return { user, assistant, retry }
})

it.live("retry records use parent chronology when later users have smaller opaque IDs", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const sessions = yield* Session.Service
      const session = yield* sessions.create({})
      const previous = yield* turn(session.id, "z_previous", 10)
      const current = yield* turn(session.id, "m_current", 20)
      const later = yield* turn(session.id, "a_later", 30)
      yield* turn(session.id, "n_peer", 25, "peer")
      const other = yield* sessions.create({})
      yield* turn(other.id, "n_other_session", 25)

      expect(previous.user.id > current.user.id).toBe(true)
      expect(later.user.id < current.user.id).toBe(true)
      expect(
        MessageV2.page({ sessionID: session.id, limit: 20 })
          .items.filter((message) => message.info.role === "user")
          .map((message) => message.info.id),
      ).toEqual([previous.user.id, current.user.id, later.user.id])
      const records = MessageV2.retryParts(session.id, "main", current.user.id)
      expect(records.map((part) => part.id).sort()).toEqual([current.retry.id, later.retry.id].sort())
      expect(MessageV2.retryParts(session.id, "main", MessageID.make("msg_missing"))).toEqual([])
    }),
  ),
)

for (const names of [
  { name: "ASCII", previous: "a_previous", current: "m_current", later: "z_later" },
  { name: "UTF8", previous: "z_previous", current: "\uE000_current", later: "\u{10000}_later" },
]) {
  it.live(`retry record parent chronology uses the persisted ${names.name} ID tie break for equal timestamps`, () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({})
        const previous = yield* turn(session.id, names.previous, 10)
        const current = yield* turn(session.id, names.current, 10)
        const later = yield* turn(session.id, names.later, 10)
        const records = MessageV2.retryParts(session.id, "main", current.user.id)
        expect(records.map((part) => part.id).sort()).toEqual([current.retry.id, later.retry.id].sort())
        expect(records.some((part) => part.id === previous.retry.id)).toBe(false)
      }),
    ),
  )
}

function legacyRetry(sessionID: SessionID, messageID: MessageID, id = PartID.ascending()) {
  return {
    id,
    sessionID,
    messageID,
    type: "retry" as const,
    attempt: 2,
    error: {
      name: "APIError" as const,
      data: {
        message: "SECRET-legacy-message\u0000suffix",
        responseBody: "SECRET-legacy-response",
        responseHeaders: { authorization: "SECRET-legacy-header" },
        isRetryable: true,
      },
    },
    time: { created: 1 },
  }
}

test("legacy retry normalization preserves content while the public part schema stays strict", () => {
  const value = legacyRetry(SessionID.make("ses_example"), MessageID.make("msg_example"))
  expect(MessageV2.Part.safeParse(value).success).toBe(false)
  const parsed = MessageV2.Part.parse(MessageV2.normalizeRetryPart(value))
  expect(parsed).toEqual({
    id: value.id,
    sessionID: value.sessionID,
    messageID: value.messageID,
    type: "retry",
    attempt: 2,
    phase: "stream",
    scope: "live-step",
    kind: "unknown",
    message: `${value.error.data.message} ${value.error.data.responseBody}`,
    next: 1,
    time: { created: 1, updated: 1 },
  })
  expect(MessageV2.normalizeRetryPart(parsed)).toEqual(parsed)
  const indexed = extract(parsed, "assistant")
  expect(indexed?.kind).toBe("retry")
  expect(indexed?.body).toContain(value.error.data.message)
  expect(indexed?.body).toContain(value.error.data.responseBody)
})

it.live("persisted legacy retry parts stay searchable, export safely and import again", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const sessions = yield* Session.Service
      const session = yield* sessions.create({})
      const current = yield* turn(session.id, "current", 10)
      const value = legacyRetry(session.id, current.assistant.id, current.retry.id)
      const { id, sessionID: _, messageID: __, ...data } = value
      // Seed the historical JSON directly: schema parsing on the write path would
      // hide a missing compatibility reader by normalizing the fixture first.
      yield* Effect.sync(() =>
        Database.use((db) =>
          db
            .update(PartTable)
            .set({ data: data as unknown as typeof PartTable.$inferSelect.data })
            .where(eq(PartTable.id, id))
            .run(),
        ),
      )
      const persisted = MessageV2.parts(current.assistant.id).find((part) => part.id === id)
      expect(persisted).toBeDefined()
      expect(extract(persisted!, "assistant")?.body).toContain(value.error.data.responseBody)
      yield* Effect.sync(() => Database.transaction((tx) => indexImportedParts(tx, [id])))
      const indexed = Database.use((db) =>
        db.select().from(HistoryFtsTable).where(eq(HistoryFtsTable.part_id, id)).get(),
      )
      expect(indexed?.body).toContain(value.error.data.message)
      expect(indexed?.body).toContain(value.error.data.responseBody)

      const exported = captureExportData(session.id)
      const redacted = sanitize(exported)
      expect(JSON.stringify(redacted)).not.toContain("SECRET-")
      for (const message of redacted.messages)
        for (const part of message.parts) expect(MessageV2.Part.safeParse(part).success).toBe(true)

      const legacyMessages = exported.messages.map((message) => ({
        ...message,
        parts: message.parts.map((part) => (part.id === id ? value : part)),
      }))
      yield* sessions.remove(session.id)
      yield* Effect.sync(() => storeImportedSession(exported.info, legacyMessages, exported.queue))
      const imported = MessageV2.parts(current.assistant.id).find((part) => part.id === id)
      expect(imported).toBeDefined()
      expect(extract(imported!, "assistant")?.body).toContain(value.error.data.message)
      expect(extract(imported!, "assistant")?.body).toContain(value.error.data.responseBody)
      yield* Effect.sync(() => storeImportedSession(exported.info, legacyMessages, exported.queue))
    }),
  ),
)

it.live("legacy retry replay publishes and logs the normalized public shape", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const sessions = yield* Session.Service
      const session = yield* sessions.create({})
      const current = yield* turn(session.id, "current", 10)
      const value = legacyRetry(session.id, current.assistant.id, current.retry.id)
      const eventID = `retry-record-${current.retry.id}`
      const sequence = Database.use((db) =>
        db.select().from(EventSequenceTable).where(eq(EventSequenceTable.aggregate_id, session.id)).get(),
      )
      const received = Promise.withResolvers<unknown>()
      const off = Bus.subscribe(MessageV2.Event.PartUpdated, (event) => {
        if (event.properties.part.id === value.id) received.resolve(event.properties)
      })
      const syncData: unknown[] = []
      const listener = (event: GlobalEvent) => {
        if (event.payload.type === "sync" && event.payload.syncEvent.id === eventID)
          syncData.push(event.payload.syncEvent.data)
      }
      GlobalBus.on("event", listener)
      try {
        yield* Effect.sync(() =>
          SyncEvent.replay(
            {
              id: eventID,
              aggregateID: session.id,
              seq: (sequence?.seq ?? -1) + 1,
              type: "message.part.updated.1",
              data: { sessionID: session.id, part: value, time: 20 },
            },
            { publish: true },
          ),
        )
        const published = yield* Effect.promise(() => received.promise).pipe(Effect.timeout("5 seconds"))
        const logged = Database.use((db) => db.select().from(EventTable).where(eq(EventTable.id, eventID)).get())
        expect(logged).toBeDefined()
        expect(syncData).toHaveLength(1)
        for (const data of [published, logged!.data, syncData[0]]) {
          const parsed = MessageV2.Event.PartUpdated.schema.parse(data)
          expect(parsed.part).toMatchObject({
            id: value.id,
            type: "retry",
            kind: "unknown",
            message: `${value.error.data.message} ${value.error.data.responseBody}`,
          })
          expect(JSON.stringify(data)).not.toContain('"error":')
          expect(JSON.stringify(data)).not.toContain("SECRET-legacy-header")
        }
        expect(MessageV2.parts(current.assistant.id).find((part) => part.id === value.id)).toMatchObject({
          type: "retry",
          phase: "stream",
          scope: "live-step",
          kind: "unknown",
        })
      } finally {
        off()
        GlobalBus.off("event", listener)
      }
    }),
  ),
)
