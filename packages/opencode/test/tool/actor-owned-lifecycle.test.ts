import { expect } from "bun:test"
import { Deferred, Effect, Exit, Fiber, Layer } from "effect"
import { Actor } from "../../src/actor/spawn"
import { spawnRef } from "../../src/actor/spawn-ref"
import { ActorRegistry } from "../../src/actor/registry"
import { ActorRegistered } from "../../src/actor/events"
import { GlobalBus, type GlobalEvent } from "../../src/bus/global"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { Database, and, eq } from "../../src/storage"
import { ActorTool } from "../../src/tool/actor"
import type * as Tool from "../../src/tool/tool"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { TestLLMServer } from "../lib/llm-server"

const it = testEffect(Layer.mergeAll(AppLayer, TestLLMServer.layer, CrossSpawnSpawner.defaultLayer))
const ref = { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") }
const config = (url: string) => ({
  model: "test/test-model",
  provider: {
    test: {
      npm: "@ai-sdk/openai-compatible",
      options: { baseURL: url, apiKey: "test" },
      models: { "test-model": { name: "Test", limit: { context: 100000, output: 10000 } } },
    },
  },
  agent: {
    worker: {
      mode: "subagent" as const,
      model: "test/test-model",
      prompt: "Complete this task.",
      completionGate: false,
    },
  },
})

const setup = (dir: string) =>
  Effect.gen(function* () {
    const sessions = yield* Session.Service
    const registry = yield* ActorRegistry.Service
    const actor = yield* Actor.Service
    const session = yield* sessions.create({ title: "Owned actor lifecycle" })
    const user = yield* sessions.updateMessage({
      id: MessageID.ascending(),
      sessionID: session.id,
      role: "user",
      agent: "build",
      model: ref,
      time: { created: Date.now() },
    })
    const assistant = yield* sessions.updateMessage({
      id: MessageID.ascending(),
      sessionID: session.id,
      role: "assistant",
      parentID: user.id,
      agent: "build",
      mode: "build",
      path: { cwd: dir, root: dir },
      providerID: ref.providerID,
      modelID: ref.modelID,
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      time: { created: Date.now() },
    })
    const controller = new AbortController()
    const context: Tool.Context = {
      sessionID: session.id,
      messageID: assistant.id,
      agent: "build",
      actorID: "main",
      abort: controller.signal,
      messages: [],
      metadata: () => Effect.void,
      ask: () => Effect.void,
    }
    const tool = yield* (yield* ActorTool).init()
    return { session, registry, actor, controller, context, tool }
  })

const operation = { action: "run" as const, subagent_type: "worker", description: "Owned work", prompt: "Do the work" }

it.live(
  "ActorTool registration cancellation cannot orphan an unreturned background child",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const fixture = yield* setup(dir)
          const admitted: string[] = []
          // Global publication is synchronous inside register; the local Bus
          // subscription is asynchronous and may observe an already handed-off actor.
          const onRegistered = (event: GlobalEvent) => {
            if (event.payload.type !== ActorRegistered.type) return
            const value = ActorRegistered.properties.parse(event.payload.properties)
            if (value.sessionID !== fixture.session.id || value.mode !== "subagent") return
            admitted.push(value.actorID)
            fixture.controller.abort()
          }
          GlobalBus.on("event", onRegistered)
          yield* llm.hang
          try {
            const result = yield* fixture.tool
              .execute({ operation: { ...operation, action: "spawn" } }, fixture.context)
              .pipe(Effect.exit)
            expect(Exit.isFailure(result)).toBe(true)
            expect(admitted).toHaveLength(1)
            expect((yield* fixture.registry.get(fixture.session.id, admitted[0]!))?.lastOutcome).toBe("cancelled")
          } finally {
            GlobalBus.off("event", onRegistered)
            for (const actorID of admitted) yield* fixture.actor.cancel(fixture.session.id, actorID, "forced")
          }
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "ActorTool cancellation at the spawn return boundary retains child ownership",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const fixture = yield* setup(dir)
          const original = spawnRef.current
          const admitted: { child?: Actor.SpawnResult } = {}
          // Only insert a scheduler boundary after the actual service admits
          // the child; registry, provider, work fiber and cancel remain real.
          spawnRef.current = {
            ...fixture.actor,
            spawn: (input) =>
              fixture.actor.spawn(input).pipe(
                Effect.tap((child) =>
                  Effect.gen(function* () {
                    admitted.child = child
                    fixture.controller.abort()
                    yield* Effect.yieldNow
                  }),
                ),
              ),
          }
          yield* llm.hang
          try {
            const result = yield* fixture.tool
              .execute({ operation: { ...operation, action: "spawn" } }, fixture.context)
              .pipe(Effect.exit)
            expect(Exit.isFailure(result)).toBe(true)
            const child = admitted.child
            if (!child) throw new Error("Expected actual spawn to admit a child")
            expect((yield* fixture.registry.get(child.sessionID, child.actorID))?.lastOutcome).toBe("cancelled")
            expect(yield* Deferred.isDone(child.outcome)).toBe(true)
            expect((yield* Deferred.await(child.outcome)).status).toBe("cancelled")
          } finally {
            spawnRef.current = original
            if (admitted.child) yield* admitted.child.cancel!
          }
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "owned admission cleanup settles an unstarted child outcome",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const fixture = yield* setup(dir)
          yield* llm.hang
          const child = yield* fixture.actor.spawn({
            mode: "subagent",
            sessionID: fixture.session.id,
            agentType: "worker",
            task: "Cancelled before running",
            context: "none",
            tools: [],
            model: ref,
            background: true,
          })
          yield* child.cancel!
          const result = yield* Deferred.await(child.outcome).pipe(Effect.timeout("2 seconds"))
          expect(result.status).toBe("cancelled")
          expect((yield* fixture.registry.get(fixture.session.id, child.actorID))?.lastOutcome).toBe("cancelled")
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "ActorTool wait cancellation stops only the observer",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const fixture = yield* setup(dir)
          yield* llm.hang
          const child = yield* fixture.actor.spawn({
            mode: "subagent",
            sessionID: fixture.session.id,
            agentType: "worker",
            task: "Keep working",
            context: "none",
            tools: [],
            model: ref,
            background: true,
          })
          yield* llm.wait(1)
          const fiber = yield* fixture.tool
            .execute({ operation: { action: "wait", actor_id: child.actorID } }, fixture.context)
            .pipe(Effect.exit, Effect.forkScoped)
          try {
            yield* Effect.sleep("20 millis")
            fixture.controller.abort()
            expect(Exit.isFailure(yield* Fiber.join(fiber).pipe(Effect.timeout("2 seconds")))).toBe(true)
            expect((yield* fixture.registry.get(fixture.session.id, child.actorID))?.status).toBe("running")
            expect(yield* Deferred.isDone(child.outcome)).toBe(false)
          } finally {
            yield* child.cancel!
          }
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "ActorTool rejects pre-aborted admission without registering a child",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const fixture = yield* setup(dir)
          yield* llm.text("must not run")
          fixture.controller.abort()
          const result = yield* fixture.tool.execute({ operation }, fixture.context).pipe(Effect.exit)
          expect(Exit.isFailure(result)).toBe(true)
          expect(
            (yield* fixture.registry.listBySession(fixture.session.id)).filter((row) => row.mode === "subagent"),
          ).toEqual([])
        }),
      { git: true, config },
    ),
  30000,
)

for (const mode of ["signal", "interrupt"] as const) {
  it.live(
    `ActorTool foreground ${mode} cancels and joins an admitted child`,
    () =>
      provideTmpdirServer(
        ({ dir, llm }) =>
          Effect.gen(function* () {
            const fixture = yield* setup(dir)
            const ready = yield* Deferred.make<string>()
            yield* llm.hang
            const fiber = yield* fixture.tool
              .execute(
                { operation },
                {
                  ...fixture.context,
                  metadata: (input) => Deferred.succeed(ready, String(input.metadata?.actorId)).pipe(Effect.asVoid),
                },
              )
              .pipe(Effect.exit, Effect.forkScoped)
            const actorID = yield* Deferred.await(ready)
            yield* llm.wait(1)
            try {
              const ended = mode === "signal" ? (fixture.controller.abort(), Fiber.join(fiber)) : Fiber.interrupt(fiber)
              yield* ended.pipe(Effect.timeout("2 seconds"))
              const row = yield* fixture.registry.get(fixture.session.id, actorID)
              expect(row?.status).toBe("idle")
              expect(row?.lastOutcome).toBe("cancelled")
            } finally {
              yield* fixture.actor.cancel(fixture.session.id, actorID, "forced")
            }
          }),
        { git: true, config },
      ),
    30000,
  )
}

it.live(
  "ActorTool cancellation during onReady reclaims its admitted background child",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const fixture = yield* setup(dir)
          const ready = yield* Deferred.make<string>()
          yield* llm.hang
          const fiber = yield* fixture.tool
            .execute(
              { operation: { ...operation, action: "spawn" } },
              {
                ...fixture.context,
                metadata: (input) =>
                  Deferred.succeed(ready, String(input.metadata?.actorId)).pipe(Effect.andThen(Effect.never)),
              },
            )
            .pipe(Effect.exit, Effect.forkScoped)
          const actorID = yield* Deferred.await(ready)
          try {
            fixture.controller.abort()
            yield* Fiber.join(fiber).pipe(Effect.timeout("2 seconds"))
            const row = yield* fixture.registry.get(fixture.session.id, actorID)
            expect(row?.status).toBe("idle")
            expect(row?.lastOutcome).toBe("cancelled")
          } finally {
            yield* fixture.actor.cancel(fixture.session.id, actorID, "forced")
          }
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "ActorTool run timeout leaves a discoverable running child",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const fixture = yield* setup(dir)
          const ready = yield* Deferred.make<string>()
          yield* llm.hang
          const fiber = yield* fixture.tool
            .execute(
              { operation: { ...operation, timeout_ms: 50 } },
              {
                ...fixture.context,
                metadata: (input) => Deferred.succeed(ready, String(input.metadata?.actorId)).pipe(Effect.asVoid),
              },
            )
            .pipe(Effect.forkScoped)
          const actorID = yield* Deferred.await(ready)
          try {
            const result = yield* Fiber.join(fiber).pipe(Effect.timeout("2 seconds"))
            expect(result.output).toContain('<actor_result status="timeout">')
            expect(result.output).toContain(`actor_id: ${actorID}`)
            expect((yield* fixture.registry.get(fixture.session.id, actorID))?.status).toBe("running")
          } finally {
            yield* fixture.actor.cancel(fixture.session.id, actorID, "forced")
          }
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "nested primary ActorTool hands background ownership to the real parent",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const fixture = yield* setup(dir)
          yield* fixture.registry.register({
            sessionID: fixture.session.id,
            actorID: "controller-1",
            mode: "peer",
            agent: "build",
            description: "Actual caller",
            contextMode: "none",
            background: false,
            lifecycle: "persistent",
          })
          const release = yield* Deferred.make<void>()
          yield* llm.hangUntil(release)
          const result = yield* fixture.tool.execute(
            { operation: { ...operation, action: "spawn" } },
            {
              ...fixture.context,
              actorID: "controller-1",
              extra: { fromExec: true },
            },
          )
          const actorID = String(result.metadata.actorId)
          try {
            yield* llm.wait(1)
            fixture.controller.abort()
            expect((yield* fixture.registry.get(fixture.session.id, actorID))?.parentActorID).toBe("controller-1")
            expect((yield* fixture.registry.get(fixture.session.id, actorID))?.status).toBe("running")
            yield* Deferred.succeed(release, undefined)
            for (let count = 0; count < 100; count++) {
              const rows = yield* Effect.sync(() =>
                Database.use((db) =>
                  db
                    .select()
                    .from(InboxTable)
                    .where(
                      and(
                        eq(InboxTable.sender_session_id, fixture.session.id),
                        eq(InboxTable.sender_actor_id, actorID),
                      ),
                    )
                    .all(),
                ),
              )
              if (rows.length > 0) {
                expect(rows).toHaveLength(1)
                expect(rows[0]?.receiver_actor_id).toBe("controller-1")
                expect(rows[0]?.receiver_session_id).toBe(fixture.session.id)
                return
              }
              yield* Effect.sleep("20 millis")
            }
            throw new Error("No terminal notification was delivered")
          } finally {
            yield* Deferred.succeed(release, undefined)
            yield* fixture.actor.cancel(fixture.session.id, actorID, "forced")
          }
        }),
      { git: true, config },
    ),
  30000,
)
