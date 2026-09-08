import { expect } from "bun:test"
import { Deferred, Effect, Fiber, Layer } from "effect"
import { Actor } from "../../src/actor/spawn"
import { ActorRegistry } from "../../src/actor/registry"
import { Agent } from "../../src/agent/agent"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Permission } from "../../src/permission"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { ToolRegistry } from "../../src/tool"
import { ToolScriptTool, viewExecSubtools } from "../../src/tool/tool-script"
import type * as Tool from "../../src/tool/tool"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { TestLLMServer } from "../lib/llm-server"

const it = testEffect(Layer.mergeAll(AppLayer, TestLLMServer.layer, CrossSpawnSpawner.defaultLayer))
const ref = { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") }
const config = (url: string, style: "json" | "shell") => ({
  model: "test/test-model",
  checkpoint: { thresholds: [] },
  experimental: { predict_next_prompt: false },
  tool: { invocation_style_by_tool: { actor: style } },
  provider: {
    test: {
      npm: "@ai-sdk/openai-compatible",
      options: { baseURL: url, apiKey: "fixture" },
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
    const session = yield* sessions.create({ title: "Actual exec Actor lifecycle" })
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
    const agent = yield* (yield* Agent.Service).get("build")
    const defs = yield* (yield* ToolRegistry.Service).registered({ ...ref, agent, harness: "codex" })
    const exec = yield* (yield* ToolScriptTool).init()
    const controller = new AbortController()
    const context: Tool.Context = {
      sessionID: session.id,
      messageID: assistant.id,
      agent: "build",
      actorID: "main",
      callID: "exec-life",
      abort: controller.signal,
      messages: [],
      metadata: () => Effect.void,
      ask: () => Effect.void,
      extra: { execTools: { current: defs } },
    }
    return { session, exec, context, controller, actor: yield* Actor.Service, registry: yield* ActorRegistry.Service }
  })
const operation = { subagent_type: "worker", description: "Lifecycle worker", prompt: "Keep working" }

for (const style of ["json", "shell"] as const) {
  it.live(
    `real QuickJS ${style} spawn survives VM completion and waiter cancellation before cancel and wait`,
    () =>
      provideTmpdirServer(
        ({ dir, llm }) =>
          Effect.gen(function* () {
            const fixture = yield* setup(dir)
            yield* llm.hang
            const spawned = yield* fixture.exec.execute(
              { code: `return await tools.actor({operation:${JSON.stringify({ ...operation, action: "spawn" })}})` },
              fixture.context,
            )
            expect(spawned.metadata.status).toBe("completed")
            const part = viewExecSubtools(spawned.metadata)[0]
            const actorID = part?.state.metadata?.actorId
            if (typeof actorID !== "string") throw new Error("real exec spawn did not expose its child id")
            expect(part.state.status).toBe("completed")
            try {
              yield* llm.wait(1)
              expect((yield* fixture.registry.get(fixture.session.id, actorID))?.status).toBe("running")
              const status = yield* fixture.exec.execute(
                { code: `return await tools.actor({operation:{action:"status",actor_id:${JSON.stringify(actorID)}}})` },
                fixture.context,
              )
              expect(status.metadata.status).toBe("completed")
              expect(viewExecSubtools(status.metadata)[0].state.output).toContain("running")
              const waiting = yield* Deferred.make<void>()
              const controller = new AbortController()
              const waiter = yield* fixture.exec
                .execute(
                  { code: `return await tools.actor({operation:{action:"wait",actor_id:${JSON.stringify(actorID)}}})` },
                  {
                    ...fixture.context,
                    abort: controller.signal,
                    metadata: (value) =>
                      viewExecSubtools(value.metadata).some((part) => part.state.status === "running")
                        ? Deferred.succeed(waiting, undefined).pipe(Effect.asVoid)
                        : Effect.void,
                  },
                )
                .pipe(Effect.forkScoped)
              yield* Deferred.await(waiting)
              // Let the admitted native wait enter its service while the actual provider
              // remains parked; aborting this VM must only release its observer.
              yield* Effect.sleep("50 millis")
              controller.abort()
              const stopped = yield* Fiber.join(waiter).pipe(Effect.timeout("5 seconds"))
              expect(stopped.metadata.status).toBe("cancelled")
              expect(viewExecSubtools(stopped.metadata).every((part) => part.state.status !== "running")).toBe(true)
              expect((yield* fixture.registry.get(fixture.session.id, actorID))?.status).toBe("running")
              const cancelled = yield* fixture.exec.execute(
                {
                  code: `await tools.actor({operation:{action:"cancel",actor_id:${JSON.stringify(actorID)}}}); return await tools.actor({operation:{action:"wait",actor_id:${JSON.stringify(actorID)},timeout_ms:1000}})`,
                },
                fixture.context,
              )
              expect(cancelled.metadata.status).toBe("completed")
              expect(viewExecSubtools(cancelled.metadata).map((part) => part.state.status)).toEqual([
                "completed",
                "completed",
              ])
              const row = yield* fixture.registry.get(fixture.session.id, actorID)
              expect(row?.status).toBe("idle")
              expect(row?.lastOutcome).toBe("cancelled")
              expect(yield* (yield* Permission.Service).list()).toEqual([])
            } finally {
              yield* fixture.actor.cancel(fixture.session.id, actorID, "forced")
            }
          }),
        { git: true, config: (url) => config(url, style) },
      ),
    30000,
  )

  it.live(
    `real QuickJS ${style} foreground run ${style === "json" ? "abort" : "Effect interruption"} joins its actual child`,
    () =>
      provideTmpdirServer(
        ({ dir, llm }) =>
          Effect.gen(function* () {
            const fixture = yield* setup(dir)
            const ready = yield* Deferred.make<string>()
            yield* llm.hang
            const work = yield* fixture.exec
              .execute(
                { code: `return await tools.actor({operation:${JSON.stringify({ ...operation, action: "run" })}})` },
                {
                  ...fixture.context,
                  metadata: (value) => {
                    const actorID = viewExecSubtools(value.metadata).find(
                      (part) => typeof part.state.metadata?.actorId === "string",
                    )?.state.metadata?.actorId
                    return typeof actorID === "string"
                      ? Deferred.succeed(ready, actorID).pipe(Effect.asVoid)
                      : Effect.void
                  },
                },
              )
              .pipe(Effect.forkScoped)
            const actorID = yield* Deferred.await(ready)
            yield* llm.wait(1)
            try {
              if (style === "json") {
                fixture.controller.abort()
                const result = yield* Fiber.join(work).pipe(Effect.timeout("5 seconds"))
                expect(result.metadata.status).toBe("cancelled")
                expect(viewExecSubtools(result.metadata).every((part) => part.state.status !== "running")).toBe(true)
              } else yield* Fiber.interrupt(work).pipe(Effect.timeout("5 seconds"))
              const row = yield* fixture.registry.get(fixture.session.id, actorID)
              expect(row?.status).toBe("idle")
              expect(row?.lastOutcome).toBe("cancelled")
              expect(yield* (yield* Permission.Service).list()).toEqual([])
            } finally {
              yield* fixture.actor.cancel(fixture.session.id, actorID, "forced")
            }
          }),
        { git: true, config: (url) => config(url, style) },
      ),
    30000,
  )
}
