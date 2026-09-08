import { expect } from "bun:test"
import { Deferred, Effect, Fiber, Layer } from "effect"
import { ActorRegistry } from "../../src/actor/registry"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Inbox } from "../../src/inbox"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { Plugin } from "../../src/plugin"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { Database, eq } from "../../src/storage"
import { ToolRegistry, Truncate } from "../../src/tool"
import { ToolScriptTool, renderToolScriptDeclarations, viewExecSubtools } from "../../src/tool/tool-script"
import type * as Tool from "../../src/tool/tool"
import { shellWrap } from "../../src/tool/shell-wrap"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(
  Layer.mergeAll(
    ToolRegistry.defaultLayer,
    Agent.defaultLayer,
    Plugin.defaultLayer,
    Truncate.defaultLayer,
    Session.defaultLayer,
    ActorRegistry.defaultLayer,
    Inbox.defaultLayer,
    Bus.layer,
    CrossSpawnSpawner.defaultLayer,
  ),
)

const setup = Effect.gen(function* () {
  const sessions = yield* Session.Service
  const registry = yield* ActorRegistry.Service
  const session = yield* sessions.create({ title: "Nested actor operations" })
  yield* registry.register({
    sessionID: session.id,
    actorID: "general-1",
    mode: "subagent",
    agent: "general",
    description: "A real inbox receiver",
    contextMode: "none",
    background: true,
    lifecycle: "ephemeral",
  })
  yield* registry.updateStatus(session.id, "general-1", { status: "running" })
  const tools = yield* ToolRegistry.Service
  const actor = (yield* tools.named()).actor
  const exec = yield* (yield* ToolScriptTool).init()
  const context: Tool.Context = {
    sessionID: session.id,
    messageID: MessageID.ascending(),
    agent: "build",
    actorID: "main",
    abort: new AbortController().signal,
    callID: "exec-actor-test",
    extra: { execTools: { current: [actor] } },
    messages: [],
    metadata: () => Effect.void,
    ask: () => Effect.void,
  }
  return { session, registry, actor, exec, context }
})

for (const style of ["json", "shell"] as const) {
  it.live(`nested actor send and status use real inbox and registry in ${style} mode`, () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const fixture = yield* setup
        const actor = style === "shell" ? shellWrap(fixture.actor) : fixture.actor
        const result = yield* fixture.exec.execute(
          {
            code: `const sent = await tools.actor({ operation: { action: "send", to_actor_id: "general-1", content: "nested hello" } });
const status = await tools.actor({ operation: { action: "status", actor_id: "general-1" } });
return { sent: JSON.parse(sent.output), status: JSON.parse(status.output) }`,
          },
          { ...fixture.context, extra: { execTools: { current: [actor] } } },
        )
        expect(result.metadata.status).toBe("completed")
        expect(result.output).toMatch(/"status":\s*"running"/)
        const rows = yield* Effect.sync(() =>
          Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, fixture.session.id)).all()),
        )
        expect(rows).toHaveLength(1)
        expect(rows[0].content).toEqual({ text: "nested hello" })
        expect(rows[0].sender_actor_id).toBe("main")
        const parts = viewExecSubtools(result.metadata)
        expect(parts.map((part) => part.state.status)).toEqual(["completed", "completed"])
        expect(parts.map((part) => part.callID)).toEqual(["exec-actor-test:1", "exec-actor-test:2"])
        const declaration = renderToolScriptDeclarations([actor])
        expect(declaration).toContain('action: "send"')
        expect(declaration).toContain('action: "status"')
        expect(declaration).not.toContain('action: "spawn"')
        expect(declaration).not.toContain("script: string")
        expect(fixture.actor.parameters.safeParse({ operation: { action: "cancel", actor_id: "general-1" } }).success).toBe(true)
      }),
    ),
  )
}

it.live("nested actor rejects lifecycle actions and shell-shaped bypasses without changing the receiver", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const fixture = yield* setup
      const result = yield* fixture.exec.execute(
        {
          code: `const errors = []; for (const input of [
{ operation: { action: "cancel", actor_id: "general-1" } },
{ script: "cancel general-1" },
{ operation: { action: "send", to_actor_id: "general-1", content: "hidden", script: "cancel general-1" } }
]) { try { await tools["actor"](input); } catch (error) { errors.push(error.message); } }
return errors`,
        },
        fixture.context,
      )
      expect(result.metadata.status).toBe("completed")
      expect(result.output).not.toContain("unknown tool")
      expect((yield* fixture.registry.get(fixture.session.id, "general-1"))?.status).toBe("running")
      const rows = yield* Effect.sync(() =>
        Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, fixture.session.id)).all()),
      )
      expect(rows).toHaveLength(0)
    }),
  ),
)

it.live("nested actor status rejects unknown or mismatched caller identities", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const fixture = yield* setup
      for (const caller of [
        { agent: "missing-agent", actorID: "main" },
        { agent: "build", actorID: "missing-actor" },
        { agent: "build", actorID: "general-1" },
        { agent: "general", actorID: "general-1" },
      ]) {
        const result = yield* fixture.exec.execute(
          { code: 'return await tools.actor({ operation: { action: "status", actor_id: "general-1" } })' },
          { ...fixture.context, ...caller },
        )
        expect(result.metadata.status).toBe("code_error")
        expect(result.output).not.toContain('"description":"A real inbox receiver"')
      }
    }),
  ),
)

it.live("nested actor rechecks hook rewrites before a lifecycle side effect", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const fixture = yield* setup
      const plugin = yield* Plugin.Service
      const exec = yield* (yield* ToolScriptTool.pipe(
        Effect.provideService(Plugin.Service, {
          ...plugin,
          trigger: (name, input, output) => {
            if (name !== "tool.execute.before" || (input as { tool?: string }).tool !== "actor")
              return plugin.trigger(name, input, output)
            return Effect.sync(() => {
              if (output && typeof output === "object")
                Object.assign(output, { args: { operation: { action: "cancel", actor_id: "general-1" } } })
              return output
            })
          },
        }),
      )).init()
      const result = yield* exec.execute(
        { code: 'return await tools.actor({ operation: { action: "status", actor_id: "general-1" } })' },
        fixture.context,
      )
      expect(result.metadata.status).toBe("code_error")
      expect((yield* fixture.registry.get(fixture.session.id, "general-1"))?.status).toBe("running")
      expect(viewExecSubtools(result.metadata)[0]?.state.input).toEqual({
        operation: { action: "cancel", actor_id: "general-1" },
      })
    }),
  ),
)

it.live("authorized nested actor preserves subagent sender identity and restricts sends to its parent", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const fixture = yield* setup
      const result = yield* fixture.exec.execute(
        { code: `await tools.actor({ operation: { action: "send", to_actor_id: "main", content: "parent update" } });
try { await tools.actor({ operation: { action: "send", to_actor_id: "general-1", content: "wrong target" } }); }
catch (error) { return error.message; }` },
        { ...fixture.context, agent: "general", actorID: "general-1" },
      )
      expect(result.metadata.status).toBe("completed")
      expect(result.output).toContain("registered parent target")
      const rows = yield* Effect.sync(() =>
        Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, fixture.session.id)).all()),
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].sender_actor_id).toBe("general-1")
      expect(rows[0].receiver_actor_id).toBe("main")
      expect(rows[0].content).toEqual({ text: "parent update" })
    }),
  ),
)

it.live("nested actor honors empty request pools and actor runtime exclusions", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const fixture = yield* setup
      for (const extra of [
        { execTools: { current: [] } },
        { ...fixture.context.extra, toolWhitelist: ["read"] },
        { ...fixture.context.extra, disabledTools: new Set(["actor"]) },
      ]) {
        const result = yield* fixture.exec.execute(
          { code: 'return await tools.actor({ operation: { action: "send", to_actor_id: "general-1", content: "denied" } })' },
          { ...fixture.context, extra },
        )
        expect(result.metadata.status).toBe("code_error")
        expect(result.output).toContain("unknown tool: actor")
      }
      const rows = yield* Effect.sync(() =>
        Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, fixture.session.id)).all()),
      )
      expect(rows).toHaveLength(0)
    }),
  ),
)

it.live("nested actor resolves the registered config key for a renamed subagent", () =>
  provideTmpdirInstance(
    () => Effect.gen(function* () {
      const fixture = yield* setup
      const result = yield* fixture.exec.execute(
        { code: 'return await tools.actor({ operation: { action: "send", to_actor_id: "main", content: "renamed update" } })' },
        { ...fixture.context, agent: "General Worker", actorID: "general-1" },
      )
      expect(result.metadata.status).toBe("completed")
      const rows = yield* Effect.sync(() =>
        Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, fixture.session.id)).all()),
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].sender_actor_id).toBe("general-1")
      expect(rows[0].receiver_actor_id).toBe("main")
    }),
    { config: { agent: { general: { name: "General Worker" } } } },
  ),
)

it.live("nested subagent sends use its registered non-main parent and reject cross-session targets", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const fixture = yield* setup
      const sessions = yield* Session.Service
      const unrelated = yield* sessions.create({ title: "Unrelated receiver" })
      yield* fixture.registry.register({
        sessionID: fixture.session.id,
        actorID: "general-2",
        parentActorID: "general-1",
        mode: "subagent",
        agent: "general",
        description: "Nested sender with explicit parent",
        contextMode: "none",
        background: true,
        lifecycle: "ephemeral",
      })
      const result = yield* fixture.exec.execute(
        { code: `await tools.actor({ operation: { action: "send", to_actor_id: "general-1", content: "real parent" } });
const errors = [];
for (const operation of [
  { action: "send", to_actor_id: "main", content: "wrong parent" },
  { action: "send", to_actor_id: "general-1", to_session_id: ${JSON.stringify(unrelated.id)}, content: "wrong session" }
]) { try { await tools.actor({ operation }); } catch (error) { errors.push(error.message); } }
return errors.length;` },
        { ...fixture.context, agent: "general", actorID: "general-2" },
      )
      expect(result.metadata.status).toBe("completed")
      expect(result.output).toContain("<return_value>\n2\n</return_value>")
      const rows = yield* Effect.sync(() =>
        Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.sender_session_id, fixture.session.id)).all()),
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].sender_actor_id).toBe("general-2")
      expect(rows[0].receiver_actor_id).toBe("general-1")
      expect(rows[0].receiver_session_id).toBe(fixture.session.id)
    }),
  ),
)

it.live("interrupting the exec fiber joins nested actor cleanup without a caller signal abort", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const fixture = yield* setup
      const plugin = yield* Plugin.Service
      const entered = yield* Deferred.make<void>()
      const cleaned = yield* Deferred.make<void>()
      const controller = new AbortController()
      yield* Effect.addFinalizer(() => Effect.sync(() => controller.abort()))
      const exec = yield* (yield* ToolScriptTool.pipe(
        Effect.provideService(Plugin.Service, {
          ...plugin,
          trigger: (name, input, output) => {
            if (name !== "tool.execute.before" || (input as { tool?: string }).tool !== "actor")
              return plugin.trigger(name, input, output)
            return Deferred.succeed(entered, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.ensuring(Deferred.succeed(cleaned, undefined)),
            )
          },
        }),
      )).init()
      const running = yield* exec.execute(
        { code: 'return await tools.actor({ operation: { action: "send", to_actor_id: "general-1", content: "interrupted" } })' },
        { ...fixture.context, abort: controller.signal },
      ).pipe(Effect.forkChild)
      yield* Deferred.await(entered).pipe(Effect.timeout("3 seconds"))
      yield* Fiber.interrupt(running).pipe(Effect.timeout("3 seconds"))
      expect(controller.signal.aborted).toBe(false)
      expect(yield* Deferred.isDone(cleaned)).toBe(true)
      const rows = yield* Effect.sync(() =>
        Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, fixture.session.id)).all()),
      )
      expect(rows).toHaveLength(0)
    }),
  ),
)

it.live("cancelling exec also stops a guest parked on its own unresolved promise", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const fixture = yield* setup
      const entered = yield* Deferred.make<void>()
      const controller = new AbortController()
      const running = yield* fixture.exec.execute(
        { code: 'await tools.actor({ operation: { action: "status", actor_id: "general-1" } }); return new Promise(() => {});' },
        {
          ...fixture.context,
          abort: controller.signal,
          metadata: (value) =>
            viewExecSubtools(value.metadata).some((part) => part.state.status === "completed")
              ? Deferred.succeed(entered, undefined).pipe(Effect.asVoid)
              : Effect.void,
        },
      ).pipe(Effect.forkChild)
      yield* Deferred.await(entered).pipe(Effect.timeout("3 seconds"))
      controller.abort()
      const result = yield* Fiber.join(running).pipe(Effect.timeout("3 seconds"))
      expect(result.metadata.status).toBe("cancelled")
      expect(viewExecSubtools(result.metadata)[0]?.state.status).toBe("completed")
    }),
  ),
)

it.live("cancelling exec during the actor hook joins cleanup before any inbox write", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const fixture = yield* setup
      const plugin = yield* Plugin.Service
      const entered = yield* Deferred.make<void>()
      const cleaned = yield* Deferred.make<void>()
      const controller = new AbortController()
      const exec = yield* (yield* ToolScriptTool.pipe(
        Effect.provideService(Plugin.Service, {
          ...plugin,
          trigger: (name, input, output) => {
            if (name !== "tool.execute.before" || (input as { tool?: string }).tool !== "actor")
              return plugin.trigger(name, input, output)
            return Deferred.succeed(entered, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.ensuring(Deferred.succeed(cleaned, undefined)),
            )
          },
        }),
      )).init()
      const running = yield* exec.execute(
        { code: 'return await tools.actor({ operation: { action: "send", to_actor_id: "general-1", content: "cancelled" } })' },
        { ...fixture.context, abort: controller.signal },
      ).pipe(Effect.forkChild)
      yield* Deferred.await(entered).pipe(Effect.timeout("3 seconds"))
      controller.abort()
      const result = yield* Fiber.join(running).pipe(Effect.timeout("3 seconds"))
      expect(result.metadata.status).toBe("cancelled")
      expect(yield* Deferred.isDone(cleaned)).toBe(true)
      const rows = yield* Effect.sync(() =>
        Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.receiver_session_id, fixture.session.id)).all()),
      )
      expect(rows).toHaveLength(0)
    }),
  ),
)
