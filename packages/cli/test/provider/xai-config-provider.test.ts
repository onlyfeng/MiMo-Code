import { describe, expect } from "bun:test"
import { NodeFileSystem } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { Provider, ProviderTransform } from "../../src/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(
  Provider.defaultLayer.pipe(Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, CrossSpawnSpawner.defaultLayer))),
)

const providerID = ProviderID.make("example-gateway")
const modelID = ModelID.make("grok-4")

// A local xAI-compatible gateway: records the path and JSON body of every
// request and answers with one completed Responses message.
const gateway = Effect.acquireRelease(
  Effect.sync(() => {
    const requests: { path: string; body: Record<string, unknown> }[] = []
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(req) {
        const body: Record<string, unknown> = await req.json()
        requests.push({ path: new URL(req.url).pathname, body })
        return Response.json({
          id: "resp_1",
          object: "response",
          model: modelID,
          status: "completed",
          output: [
            {
              type: "message",
              id: "msg_1",
              role: "assistant",
              status: "completed",
              content: [{ type: "output_text", text: "ok" }],
            },
          ],
          usage: { input_tokens: 1, output_tokens: 1 },
        })
      },
    })
    return { server, requests }
  }),
  ({ server }) => Effect.promise(() => server.stop(true)),
)

describe("config provider on @ai-sdk/xai", () => {
  // FC-053: a provider defined in config has no loader of its own; it must still
  // reach Responses, and its options must be filed under the SDK's `xai` key.
  it.live("sends Responses requests with its provider options", () =>
    Effect.gen(function* () {
      const { server, requests } = yield* gateway
      yield* provideTmpdirInstance(
        () =>
          Effect.gen(function* () {
            const provider = yield* Provider.Service
            const model = yield* provider.getModel(providerID, modelID)
            const language = yield* provider.getLanguage(model)
            expect(language.provider).toBe("xai.responses")
            const result = yield* Effect.promise(() =>
              language.doGenerate({
                prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
                providerOptions: ProviderTransform.providerOptions(model, { reasoningEffort: "high", store: false }),
              }),
            )
            expect(result.content).toEqual([expect.objectContaining({ type: "text", text: "ok" })])
          }),
        {
          config: {
            provider: {
              [providerID]: {
                name: "Example Gateway",
                npm: "@ai-sdk/xai",
                env: [],
                models: {
                  [modelID]: { reasoning: true, tool_call: true, limit: { context: 8192, output: 2048 } },
                },
                options: { apiKey: "test-key", baseURL: `${server.url.origin}/v1` },
              },
            },
          },
        },
      )
      expect(requests.map((request) => request.path)).toEqual(["/v1/responses"])
      expect(requests[0].body).toMatchObject({
        model: modelID,
        reasoning: { effort: "high" },
        store: false,
        include: ["reasoning.encrypted_content"],
      })
    }),
  )

  it.live("rejects configured xhigh at SDK validation before sending a request", () =>
    Effect.gen(function* () {
      const { server, requests } = yield* gateway
      yield* provideTmpdirInstance(
        () =>
          Effect.gen(function* () {
            const provider = yield* Provider.Service
            const model = yield* provider.getModel(providerID, modelID)
            const language = yield* provider.getLanguage(model)
            expect(language.provider).toBe("xai.responses")
            expect(model.variants?.xhigh).toEqual({ reasoningEffort: "xhigh" })
            yield* Effect.promise(async () => {
              await expect(
                language.doGenerate({
                  prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
                  providerOptions: ProviderTransform.providerOptions(model, model.variants!.xhigh),
                }),
              ).rejects.toMatchObject({
                name: "AI_InvalidArgumentError",
                argument: "providerOptions",
                message: "invalid xai provider options",
              })
            })
          }),
        {
          config: {
            provider: {
              [providerID]: {
                name: "Example Gateway",
                npm: "@ai-sdk/xai",
                env: [],
                models: {
                  [modelID]: {
                    reasoning: true,
                    tool_call: true,
                    limit: { context: 8192, output: 2048 },
                    variants: { xhigh: {} },
                  },
                },
                options: { apiKey: "test-key", baseURL: `${server.url.origin}/v1` },
              },
            },
          },
        },
      )
      expect(requests).toEqual([])
    }),
  )
})
