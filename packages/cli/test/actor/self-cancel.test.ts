import { expect } from "bun:test"
import { Deferred, Effect, Layer } from "effect"
import { spawnRef } from "../../src/actor/spawn-ref"
import { Actor } from "../../src/actor/spawn"
import { ActorExecution } from "../../src/actor/execution"
import { ActorRegistry } from "../../src/actor/registry"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { prefixCaptureRef } from "../../src/session/prefix-capture-ref"
import { SessionPrefixSnapshot } from "../../src/session/prefix-snapshot"
import { SessionPrompt } from "../../src/session/prompt"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { TestLLMServer } from "../lib/llm-server"

const it = testEffect(
  Layer.mergeAll(AppLayer, TestLLMServer.layer, CrossSpawnSpawner.defaultLayer).pipe(
    Layer.provideMerge(ActorExecution.layer),
  ),
)
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
})

for (const context of ["none", "full"] as const) {
  it.live(
    `a peer can call actor to cancel its own spawn with ${context} context`,
    () =>
      provideTmpdirServer(
        ({ llm }) =>
          Effect.gen(function* () {
            const actor = yield* Actor.Service
            const sessions = yield* Session.Service
            const prompt = yield* SessionPrompt.Service
            const registry = yield* ActorRegistry.Service
            const executions = yield* ActorExecution.Service
            const parent = yield* sessions.create({
              title: "self cancellation",
              permission: [{ permission: "*", pattern: "*", action: "allow" }],
            })
            const toolExited = yield* Deferred.make<void>()
            const observations: { caller: number; owner: number | undefined; completed: boolean }[] = []
            const original = spawnRef.current
            spawnRef.current = {
              ...actor,
              cancel: (sessionID, actorID, mode) =>
                Effect.gen(function* () {
                  const execution = yield* executions.current(sessionID, actorID)
                  const observation = {
                    caller: yield* Effect.withFiber((fiber) => Effect.succeed(fiber.id)),
                    owner: execution?.fiber?.id,
                    completed: false,
                  }
                  observations.push(observation)
                  yield* actor.cancel(sessionID, actorID, mode).pipe(
                    Effect.onExit(() =>
                      Effect.sync(() => {
                        observation.completed = true
                      }).pipe(Effect.andThen(Deferred.succeed(toolExited, undefined))),
                    ),
                  )
                }),
            }
            yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                spawnRef.current = original
              }),
            )
            const forkContext =
              context === "full"
                ? yield* Effect.gen(function* () {
                    yield* prompt.prompt({
                      sessionID: parent.id,
                      model: ref,
                      noReply: true,
                      parts: [{ type: "text", text: "capture the cancellation tools" }],
                    })
                    const capture = prefixCaptureRef.current
                    if (!capture) throw new Error("prefix capture unavailable")
                    const messages = yield* sessions.messages({ sessionID: parent.id })
                    const prefix = yield* capture({
                      sessionID: parent.id,
                      agentName: "build",
                      providerID: ref.providerID,
                      modelID: ref.modelID,
                      msgs: messages,
                    })
                    const snapshot = yield* Effect.promise(() =>
                      SessionPrefixSnapshot.snapshotTools(prefix.tools, [
                        ...(prefix.activeTools ?? Object.keys(prefix.tools)),
                      ]),
                    )
                    expect(snapshot.some((item) => item.name === "actor")).toBe(true)
                    return {
                      ...prefix,
                      tools: SessionPrefixSnapshot.restoreTools(JSON.parse(JSON.stringify(snapshot))),
                      model: ref,
                      watermarkMsgID: messages.at(-1)!.info.id,
                    }
                  })
                : undefined
            const child = yield* actor.spawn({
              mode: "peer",
              sessionID: parent.id,
              agentType: "build",
              task: "Cancel yourself using the requested tool.",
              context,
              tools: ["actor"],
              background: true,
              model: ref,
              forkContext,
              onActorID: (actorID) =>
                Effect.runSync(llm.tool("actor", { operation: { action: "cancel", actor_id: actorID } })),
            })
            const outcome = yield* Deferred.await(child.outcome).pipe(Effect.timeout("5 seconds"))
            expect(outcome.status).toBe("cancelled")
            yield* actor.cancel(child.sessionID, child.actorID, "forced").pipe(Effect.timeout("2 seconds"))
            expect((yield* registry.get(child.sessionID, child.actorID))?.lastOutcome).toBe("cancelled")
            expect(yield* executions.current(child.sessionID, child.actorID)).toBeUndefined()
            expect(yield* llm.calls).toBe(1)
            yield* Deferred.await(toolExited).pipe(Effect.timeout("2 seconds"))
            expect(observations).toHaveLength(1)
            expect(observations[0].owner).toBeDefined()
            expect(observations[0].caller).not.toBe(observations[0].owner!)
            expect(observations[0].completed).toBe(true)
          }),
        { git: true, config },
      ),
    15000,
  )
}
