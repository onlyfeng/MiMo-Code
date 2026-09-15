import { describe, expect } from "bun:test"
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect"
import { ActorRegistry } from "../../src/actor/registry"
import { Bus } from "../../src/bus"
import { GlobalBus, type GlobalEvent } from "../../src/bus/global"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Inbox } from "../../src/inbox"
import { gcInboxRows } from "../../src/inbox/inbox"
import { defaultModelRef } from "../../src/inbox/inbox-ref"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { Database, eq, inArray } from "../../src/storage"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const base = Layer.mergeAll(
  Session.defaultLayer,
  ActorRegistry.defaultLayer,
  Bus.defaultLayer,
  CrossSpawnSpawner.defaultLayer,
)
const it = testEffect(Inbox.layer.pipe(Layer.provideMerge(base)))
const model = { providerID: ProviderID.make("test"), modelID: ModelID.make("model") }

const seed = Effect.fn(function* (readers = 1) {
  const sessions = yield* Session.Service
  const actors = yield* ActorRegistry.Service
  const inbox = yield* Inbox.Service
  const session = yield* sessions.create({ title: "Inbox admission" })
  yield* actors.register({
    sessionID: session.id,
    actorID: "receiver",
    mode: "subagent",
    parentActorID: undefined,
    agent: "general",
    description: "Inbox admission receiver",
    contextMode: "none",
    contextWatermark: undefined,
    background: false,
    lifecycle: "persistent",
  })
  const sent = yield* Effect.all(
    ["first notification", "second notification"].map((content) =>
      inbox.send({ receiverSessionID: session.id, receiverActorID: "receiver", type: "actor_notification", content }),
    ),
  )
  // Keep real send admission, but give the fixture a deterministic queue order
  // without relying on same-millisecond ULIDs sorting in call order.
  const rows = sent.map((row, index) => {
    const inboxID = `${session.id}_inbox_${index}`
    Database.use((db) => db.update(InboxTable).set({ id: inboxID }).where(eq(InboxTable.id, row.inboxID)).run())
    return { inboxID }
  })
  const entered = yield* Effect.all(Array.from({ length: readers }, () => Deferred.make<void>()))
  const release = yield* Deferred.make<void>()
  const previous = defaultModelRef.current
  let reader = 0
  // No prior model-bearing message exists. Pause the real tier-2 resolver,
  // after drain has read the queue but before it can commit that batch.
  defaultModelRef.current = {
    defaultModel: () =>
      Effect.gen(function* () {
        const waiting = entered[reader++]
        if (waiting) yield* Deferred.succeed(waiting, undefined)
        yield* Deferred.await(release)
        return model
      }),
  }
  yield* Effect.addFinalizer(() =>
    Deferred.succeed(release, undefined).pipe(
      Effect.andThen(
        Effect.sync(() => {
          defaultModelRef.current = previous
        }),
      ),
    ),
  )
  return {
    actors,
    inbox,
    session,
    rows,
    entered,
    release,
    pending: () =>
      Database.use((db) =>
        db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, session.id)).orderBy(InboxTable.id).all(),
      ),
    messages: () => sessions.messages({ sessionID: session.id, agentID: "receiver" }),
  }
})

describe("Inbox.drain admission after asynchronous model resolution", () => {
  it.live("two drains that read the same queue commit one complete spawn user", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed(2)
        const first = yield* f.inbox.drain(f.session.id, "receiver").pipe(Effect.forkChild)
        const second = yield* f.inbox.drain(f.session.id, "receiver").pipe(Effect.forkChild)
        yield* Effect.all(f.entered.map((entered) => Deferred.await(entered)))
        expect(f.pending().map((row) => row.id)).toEqual(f.rows.map((row) => row.inboxID))
        expect(yield* f.messages()).toEqual([])

        yield* Deferred.succeed(f.release, undefined)
        const counts = yield* Effect.all([Fiber.join(first), Fiber.join(second)])
        const messages = yield* f.messages()
        expect(counts.sort((a, b) => a - b)).toEqual([0, 2])
        expect(messages).toHaveLength(1)
        expect(messages[0].info).toMatchObject({
          sessionID: f.session.id,
          agentID: "receiver",
          role: "user",
          source: "spawn",
          agent: "general",
          model,
        })
        expect(
          messages[0].parts.map((part) => ({
            sessionID: part.sessionID,
            messageID: part.messageID,
            type: part.type,
            text: part.type === "text" ? part.text : undefined,
            synthetic: part.type === "text" ? part.synthetic : undefined,
          })),
        ).toEqual(
          ["first notification", "second notification"].map((text) => ({
            sessionID: f.session.id,
            messageID: messages[0].info.id,
            type: "text",
            text,
            synthetic: true,
          })),
        )
        expect(new Set(messages[0].parts.map((part) => part.id)).size).toBe(2)
        expect(f.pending()).toEqual([])
        expect(yield* f.inbox.drain(f.session.id, "receiver")).toBe(0)
      }),
    ),
  )

  it.live("retirement while the seed is pending discards the queue without creating a spawn user", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        const draining = yield* f.inbox.drain(f.session.id, "receiver").pipe(Effect.forkChild)
        yield* Deferred.await(f.entered[0])
        yield* f.actors.updateStatus(f.session.id, "receiver", { status: "idle", lastOutcome: "cancelled" })
        yield* Deferred.succeed(f.release, undefined)

        expect(yield* Fiber.join(draining)).toBe(0)
        expect(yield* f.messages()).toEqual([])
        expect(f.pending()).toEqual([])
      }),
    ),
  )

  it.live("cancellation while the seed is pending leaves the batch for a later drain", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        const before = f.pending()
        let cancelled = false
        const draining = yield* f.inbox.drain(f.session.id, "receiver", () => cancelled).pipe(Effect.forkChild)
        yield* Deferred.await(f.entered[0])
        cancelled = true
        yield* Deferred.succeed(f.release, undefined)

        expect(yield* Fiber.join(draining)).toBe(0)
        expect(yield* f.messages()).toEqual([])
        expect(f.pending()).toEqual(before)
        expect(yield* f.inbox.drain(f.session.id, "receiver")).toBe(2)
        expect(
          (yield* f.messages()).flatMap((message) => message.parts).map((part) => part.type === "text" && part.text),
        ).toEqual(["first notification", "second notification"])
        expect(f.pending()).toEqual([])
      }),
    ),
  )

  it.live("interrupting the pending seed leaves no transcript and does not claim the queue", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        const before = f.pending()
        const draining = yield* f.inbox.drain(f.session.id, "receiver").pipe(Effect.forkChild)
        yield* Deferred.await(f.entered[0])
        yield* Fiber.interrupt(draining)
        const result = yield* Fiber.await(draining)

        expect(Exit.isFailure(result) && Cause.hasInterruptsOnly(result.cause)).toBe(true)
        expect(yield* f.messages()).toEqual([])
        expect(f.pending()).toEqual(before)
        yield* Deferred.succeed(f.release, undefined)
        expect(yield* f.inbox.drain(f.session.id, "receiver")).toBe(2)
        expect(
          (yield* f.messages()).flatMap((message) => message.parts).map((part) => part.type === "text" && part.text),
        ).toEqual(["first notification", "second notification"])
        expect(f.pending()).toEqual([])
      }),
    ),
  )

  it.live("interruption requested by a postcommit observer remains cancellation without replaying the batch", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        const interrupted = yield* Deferred.make<void>()
        const draining = yield* f.inbox.drain(f.session.id, "receiver").pipe(Effect.forkChild)
        yield* Deferred.await(f.entered[0])
        const listener = (event: GlobalEvent) => {
          if (event.payload.type !== "sync" || event.payload.syncEvent.aggregateID !== f.session.id) return
          GlobalBus.off("event", listener)
          Effect.runFork(Fiber.interrupt(draining).pipe(Effect.andThen(Deferred.succeed(interrupted, undefined))))
        }
        GlobalBus.on("event", listener)
        yield* Effect.addFinalizer(() => Effect.sync(() => GlobalBus.off("event", listener)))
        yield* Deferred.succeed(f.release, undefined)
        const result = yield* Fiber.await(draining)
        yield* Deferred.await(interrupted)

        expect(Exit.isFailure(result) && Cause.hasInterruptsOnly(result.cause)).toBe(true)
        const messages = yield* f.messages()
        expect(messages).toHaveLength(1)
        expect(messages[0].parts.map((part) => part.type === "text" && part.text)).toEqual([
          "first notification",
          "second notification",
        ])
        expect(f.pending()).toEqual([])
        expect(yield* f.inbox.drain(f.session.id, "receiver")).toBe(0)
        expect(yield* f.messages()).toEqual(messages)
      }),
    ),
  )

  for (const expired of [1, 2]) {
    it.live(`GC of ${expired} pre-read rows during seed resolution never replays deleted content`, () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const f = yield* seed()
          // Age only fixture rows; the real GC consumer performs the deletion.
          Database.use((db) =>
            db
              .update(InboxTable)
              .set({ created_at: 0 })
              .where(
                inArray(
                  InboxTable.id,
                  f.rows.slice(0, expired).map((row) => row.inboxID),
                ),
              )
              .run(),
          )
          const draining = yield* f.inbox.drain(f.session.id, "receiver").pipe(Effect.forkChild)
          yield* Deferred.await(f.entered[0])
          yield* gcInboxRows(0)
          expect(f.pending().map((row) => row.id)).toEqual(f.rows.slice(expired).map((row) => row.inboxID))
          yield* Deferred.succeed(f.release, undefined)

          expect(yield* Fiber.join(draining)).toBe(2 - expired)
          const messages = yield* f.messages()
          expect(messages).toHaveLength(expired === 1 ? 1 : 0)
          expect(messages.flatMap((message) => message.parts).map((part) => part.type === "text" && part.text)).toEqual(
            expired === 1 ? ["second notification"] : [],
          )
          expect(f.pending()).toEqual([])
          expect(yield* f.inbox.drain(f.session.id, "receiver")).toBe(0)
        }),
      ),
    )
  }
})
