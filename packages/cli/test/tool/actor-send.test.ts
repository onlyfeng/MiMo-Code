import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import { Config } from "../../src/config"
import { Provider } from "../../src/provider"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { SessionCheckpoint } from "../../src/session/checkpoint"
import { Database, and, eq } from "../../src/storage"
import { MessageID, SessionID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { MessageV2 } from "../../src/session/message-v2"
import { ActorTool } from "../../src/tool/actor"
import { ActorRegistry } from "../../src/actor/registry"
import { TaskRegistry } from "../../src/task/registry"
import { ActorWaiter } from "../../src/actor/waiter"
import { Inbox } from "../../src/inbox"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { renderInboxRow } from "../../src/inbox/render"
import { Team } from "../../src/team"
import { Truncate } from "../../src/tool"
import { ToolRegistry } from "../../src/tool"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

afterEach(async () => {
  await Instance.disposeAll()
})

const inboxDeps = Layer.mergeAll(Bus.layer, ActorRegistry.defaultLayer, Session.defaultLayer)

const it = testEffect(
  Layer.mergeAll(
    Agent.defaultLayer,
    Bus.layer,
    Config.defaultLayer,
    Provider.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Session.defaultLayer,
    Truncate.defaultLayer,
    ToolRegistry.defaultLayer,
    ActorRegistry.defaultLayer,
    ActorWaiter.layer.pipe(Layer.provide(Bus.layer), Layer.provide(ActorRegistry.defaultLayer), Layer.provide(Session.defaultLayer)),
    Team.defaultLayer,
    SessionCheckpoint.defaultLayer,
    TaskRegistry.defaultLayer,
    Inbox.layer.pipe(Layer.provide(inboxDeps)),
  ),
)

function ctxFor(sessionID: SessionID, actorID?: string) {
  return {
    sessionID,
    ...(actorID ? { actorID } : {}),
    messageID: MessageID.ascending(),
    agent: "build",
    abort: new AbortController().signal,
    extra: {},
    messages: [],
    metadata: () => Effect.void,
    ask: () => Effect.void,
  }
}

describe("actor tool — send action", () => {
  it.live(
    "send to existing actor writes a row in the inbox table",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const registry = yield* ActorRegistry.Service
        const chat = yield* sessions.create({ title: "chat" })

        const actorID = yield* registry.allocateActorID(chat.id, "general")
        yield* registry.register({
          sessionID: chat.id,
          actorID,
          mode: "subagent",
          agent: "general",
          description: "explore task",
          contextMode: "none",
          background: true,
          lifecycle: "ephemeral",
        })
        yield* registry.updateStatus(chat.id, actorID, { status: "running" })

        const tool = yield* ActorTool
        const def = yield* tool.init()
        const result = yield* def.execute(
          {
            operation: {
              action: "send",
              to_actor_id: actorID,
              content: "hello actor",
            },
          },
          ctxFor(chat.id),
        )

        // Tool result: success shape
        const parsed = JSON.parse(result.output) as { inboxID: string; inputMessageID: string }
        expect(parsed.inboxID).toBeTruthy()
        expect(result.title).toBe(`Sent to ${actorID}`)

        // Verify row landed in inbox table for this receiver
        const rows = yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .select()
              .from(InboxTable)
              .where(and(eq(InboxTable.receiver_session_id, chat.id), eq(InboxTable.receiver_actor_id, actorID)))
              .all(),
          ),
        )
        expect(rows).toHaveLength(1)
        expect(rows[0].id).toBe(parsed.inboxID)
        expect(String(rows[0].input_message_id)).toBe(parsed.inputMessageID)
        expect(rows[0].content).toBeNull()
        const message = MessageV2.get({ sessionID: chat.id, messageID: rows[0].input_message_id! })
        expect(message.parts).toEqual([expect.objectContaining({ type: "text", synthetic: true, text: expect.stringContaining("hello actor") })])
      }),
    ),
  )

  it.live(
    "cross-session send to missing receiver returns structured error without throwing",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "chat" })

        const tool = yield* ActorTool
        const def = yield* tool.init()
        const result = yield* def.execute(
          {
            operation: {
              action: "send",
              to_actor_id: "does-not-exist",
              to_session_id: SessionID.descending(),
              content: "hello nobody",
            },
          },
          ctxFor(chat.id),
        )

        // Does NOT throw — receiver-not-found is surfaced as a structured tool result
        const parsed = JSON.parse(result.output) as { inboxID: string | null; error: string }
        expect(parsed.inboxID).toBeNull()
        expect(parsed.error).toBe("receiver not found")
        expect(result.title).toContain("receiver not found")
      }),
    ),
  )

  it.live(
    "send without to_session_id defaults to current session",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const registry = yield* ActorRegistry.Service
        const chat = yield* sessions.create({ title: "chat" })

        const actorID = yield* registry.allocateActorID(chat.id, "general")
        yield* registry.register({
          sessionID: chat.id,
          actorID,
          mode: "subagent",
          agent: "general",
          description: "target actor",
          contextMode: "none",
          background: true,
          lifecycle: "ephemeral",
        })

        const tool = yield* ActorTool
        const def = yield* tool.init()
        // Omit to_session_id — should default to ctx.sessionID (chat.id)
        const result = yield* def.execute(
          {
            operation: {
              action: "send",
              to_actor_id: actorID,
              content: "default session test",
            },
          },
          ctxFor(chat.id),
        )

        const parsed = JSON.parse(result.output) as { inboxID: string; inputMessageID: string }
        expect(parsed.inboxID).toBeTruthy()

        // Row is on the current session (chat.id), not some other session
        const rows = yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .select()
              .from(InboxTable)
              .where(and(eq(InboxTable.receiver_session_id, chat.id), eq(InboxTable.receiver_actor_id, actorID)))
              .all(),
          ),
        )
        expect(rows).toHaveLength(1)
        expect(rows[0].receiver_session_id).toBe(chat.id)
      }),
    ),
  )

  it.live(
    "the sender is the lane's actor id, so the receiver can reply to it",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const registry = yield* ActorRegistry.Service
        const a = yield* sessions.create({ title: "a" })
        const b = yield* sessions.create({ title: "b" })
        const tool = yield* ActorTool
        const def = yield* tool.init()
        const rowOf = (id: string) =>
          Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.id, id)).get())

        // The main lane of a, running agent "build", writes to b's main lane.
        const sent = yield* def.execute(
          { operation: { action: "send", to_actor_id: "main", to_session_id: b.id, content: "ping" } },
          ctxFor(a.id, "main"),
        )
        const row = rowOf(JSON.parse(sent.output).inboxID)
        expect(row?.sender_actor_id).toBe("main")
        const from = row ? renderInboxRow(row).match(/<inbox from="([^"]+)"/)?.[1] : undefined
        expect(from).toBe(`${a.id}:main`)

        // Replying to the rendered sender reaches it.
        const [session, actor] = (from ?? "").split(":")
        const reply = yield* def.execute(
          { operation: { action: "send", to_actor_id: actor, to_session_id: session, content: "pong" } },
          ctxFor(b.id, "main"),
        )
        expect(JSON.parse(reply.output).inboxID).toBeTruthy()

        // A subagent lane is named by its actor id, not its agent name.
        const child = yield* registry.allocateActorID(a.id, "general")
        yield* registry.register({
          sessionID: a.id,
          actorID: child,
          mode: "subagent",
          agent: "general",
          description: "child",
          contextMode: "none",
          background: true,
          lifecycle: "ephemeral",
        })
        const fromChild = yield* def.execute(
          { operation: { action: "send", to_actor_id: "main", content: "progress" } },
          { ...ctxFor(a.id, child), agent: "general" },
        )
        expect(rowOf(JSON.parse(fromChild.output).inboxID)?.sender_actor_id).toBe(child)
      }),
    ),
  )

  it.live(
    "a sender reads what became of its message and the model the receiver runs it with",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const a = yield* sessions.create({ title: "sender" })
        const b = yield* sessions.create({ title: "receiver" })
        const c = yield* sessions.create({ title: "bystander" })
        // The receiver's lane runs at the max variant; input it is sent inherits that.
        const model = { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model"), variant: "max" }
        yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: b.id,
          agentID: "main",
          agent: "build",
          model,
          time: { created: Date.now() },
        })
        const def = yield* (yield* ActorTool).init()
        const sent = JSON.parse(
          (yield* def.execute(
            { operation: { action: "send", to_actor_id: "main", to_session_id: b.id, content: "take task 3" } },
            ctxFor(a.id, "main"),
          )).output,
        )
        expect(sent.model).toEqual(model)

        const receipt = (sessionID: SessionID, inboxID?: string) =>
          def
            .execute({ operation: { action: "receipt", ...(inboxID ? { inbox_id: inboxID } : {}) } }, ctxFor(sessionID, "main"))
            .pipe(Effect.map((result) => JSON.parse(result.output)))
        expect(yield* receipt(a.id, sent.inboxID)).toMatchObject({
          inbox_id: sent.inboxID,
          receiver_session_id: b.id,
          receiver_actor_id: "main",
          state: "accepted",
          consumed: false,
          delivered: false,
          model,
        })
        expect(yield* receipt(b.id, sent.inboxID)).toMatchObject({ inbox_id: sent.inboxID })
        expect(yield* receipt(c.id, sent.inboxID)).toEqual({ inbox_id: sent.inboxID, error: "not found" })
        const listed = yield* receipt(a.id)
        expect(listed.map((row: { inbox_id: string }) => row.inbox_id)).toEqual([sent.inboxID])
        expect(yield* receipt(c.id)).toEqual([])

        // A message that settled without being seen reads as such.
        Database.use((db) =>
          db.update(InboxTable).set({ state: "settled", outcome: "never_ran" }).where(eq(InboxTable.id, sent.inboxID)).run(),
        )
        expect(yield* receipt(a.id, sent.inboxID)).toMatchObject({ state: "settled", outcome: "never_ran", consumed: false })
      }),
    ),
  )

  it.live(
    "a keyed resend is a no-op until the earlier message ended unseen, then goes out once",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const a = yield* sessions.create({ title: "sender" })
        const other = yield* sessions.create({ title: "another sender" })
        const b = yield* sessions.create({ title: "receiver" })
        const def = yield* (yield* ActorTool).init()
        const send = (from: SessionID, key?: string) =>
          def
            .execute(
              { operation: { action: "send", to_actor_id: "main", to_session_id: b.id, content: "take task 3", ...(key ? { idempotency_key: key } : {}) } },
              ctxFor(from, "main"),
            )
            .pipe(Effect.map((result) => JSON.parse(result.output)))
        const settle = (id: string, set: Partial<typeof InboxTable.$inferInsert>) =>
          Database.use((db) => db.update(InboxTable).set(set).where(eq(InboxTable.id, id)).run())
        const rows = () => Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, b.id)).all())

        const first = yield* send(a.id, "task-3")
        expect(first.deduplicated).toBe(false)
        // Queued: the resend returns the same message.
        expect(yield* send(a.id, "task-3")).toMatchObject({ inboxID: first.inboxID, deduplicated: true })
        // Another sender's key is its own.
        expect((yield* send(other.id, "task-3")).inboxID).not.toBe(first.inboxID)
        // Consumed: still a no-op.
        settle(first.inboxID, { state: "settled", outcome: "success", consumed: true })
        expect(yield* send(a.id, "task-3")).toMatchObject({ inboxID: first.inboxID, deduplicated: true })
        // Ended but seen by the receiver's turn: not resent.
        settle(first.inboxID, { state: "settled", outcome: "never_ran", consumed: true })
        expect(yield* send(a.id, "task-3")).toMatchObject({ inboxID: first.inboxID, deduplicated: true })
        // Ended unseen: sent anew once, superseding the old message.
        settle(first.inboxID, { state: "settled", outcome: "never_ran", consumed: false })
        const again = yield* send(a.id, "task-3")
        expect(again).toMatchObject({ deduplicated: false, supersedes: first.inboxID })
        expect(again.inboxID).not.toBe(first.inboxID)
        expect(yield* send(a.id, "task-3")).toMatchObject({ inboxID: again.inboxID, deduplicated: true })
        const old = rows().find((row) => row.id === first.inboxID)
        expect(old?.idempotency_key).toBe(`actor-send:${a.id}:main:task-3#superseded:${first.inboxID}`)
        // Without a key every send is a new message.
        expect((yield* send(a.id)).inboxID).not.toBe((yield* send(a.id)).inboxID)
        expect(rows()).toHaveLength(5)
      }),
    ),
  )
})
