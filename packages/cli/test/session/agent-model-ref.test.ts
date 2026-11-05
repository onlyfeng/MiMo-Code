import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Config } from "../../src/config"
import { Provider } from "../../src/provider"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { agentModelRef } from "../../src/session/agent-model-ref"
import { usable } from "../../src/session/overflow"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

// FC-047: SessionPrompt.layer registers the resolver that lets a no-fork
// checkpoint writer run on `agent."checkpoint-writer".model`.
const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer))

const provider = "agent-model-test"
const models = {
  "parent-model": { name: "Parent", tool_call: true, limit: { context: 200_000, output: 10_000 } },
  "writer-model": { name: "Writer", tool_call: true, limit: { context: 500_000, output: 10_000 } },
}
const config = (agent: Record<string, { model?: string }>, groups?: Record<string, { default: string; models: string[] }>) => ({
  config: {
    model: `${provider}/parent-model`,
    provider: { [provider]: { npm: "@ai-sdk/openai-compatible", options: { baseURL: "http://127.0.0.1:9/v1", apiKey: "test" }, models } },
    agent,
    ...(groups ? { model_groups: groups } : {}),
  },
})

const resolve = (agentName: string) =>
  Effect.gen(function* () {
    const fn = agentModelRef.current
    if (!fn) throw new Error("SessionPrompt did not register the agent model resolver")
    return yield* fn(agentName)
  })

// The usable window the run loop would compute for the writer model under this config.
const expectedUsable = Effect.gen(function* () {
  const model = yield* Provider.Service.use((p) => p.getModel(ProviderID.make(provider), ModelID.make("writer-model")))
  return usable({ cfg: yield* Config.Service.use((c) => c.get()), model })
})

describe("agent model resolver (FC-047)", () => {
  it.live("resolves a literal provider/model configured for the writer, with that model's window", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const resolved = yield* resolve("checkpoint-writer")
          expect(resolved).toEqual({ providerID: provider, modelID: "writer-model", usable: yield* expectedUsable })
          expect(resolved?.usable).toBeGreaterThan(0)
        }),
      config({ "checkpoint-writer": { model: `${provider}/writer-model` } }),
    ),
  )

  it.live("resolves a model-group name to the group's default", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const resolved = yield* resolve("checkpoint-writer")
          expect(resolved?.modelID).toBe("writer-model")
        }),
      config(
        { "checkpoint-writer": { model: "writer-tier" } },
        { "writer-tier": { default: `${provider}/writer-model`, models: [`${provider}/writer-model`] } },
      ),
    ),
  )

  it.live("an agent with no configured model resolves to nothing", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          expect(yield* resolve("checkpoint-writer")).toBeUndefined()
        }),
      config({}),
    ),
  )

  it.live("a configured model that does not resolve yields nothing rather than failing the writer", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          expect(yield* resolve("checkpoint-writer")).toBeUndefined()
          expect(yield* resolve("no-such-agent")).toBeUndefined()
        }),
      config({ "checkpoint-writer": { model: `${provider}/missing-model` } }),
    ),
  )
})
