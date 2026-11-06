import { describe, expect } from "bun:test"
import { NodeFileSystem } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { Provider } from "../../src/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(
  Provider.defaultLayer.pipe(Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, CrossSpawnSpawner.defaultLayer))),
)

const providerID = ProviderID.make("sse-gateway")
const modelID = ModelID.make("test-model")

const chunk = (content: string, finish?: string) =>
  `data: ${JSON.stringify({ id: "c1", choices: [{ delta: { content }, finish_reason: finish ?? null }] })}\n\n`

const keepAlives = (from: number, to: number, every: number) =>
  Array.from({ length: Math.floor((to - from) / every) }, (_, i) => ({ at: from + i * every, text: ": keep-alive\n\n" }))

type Script = Array<{ at: number; text: string }>

// A local gateway: `script` lists what the response body sends and when (ms
// after the response starts). The body stays open after the script unless it
// sends `[DONE]`, and stops when the client cancels it.
const gateway = (script: Script) =>
  Effect.acquireRelease(
    Effect.sync(() =>
      Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        fetch() {
          const timers: ReturnType<typeof setTimeout>[] = []
          const enc = new TextEncoder()
          const body = new ReadableStream<Uint8Array>({
            start(ctrl) {
              for (const step of script) {
                timers.push(
                  setTimeout(() => {
                    try {
                      ctrl.enqueue(enc.encode(step.text))
                      if (step.text.includes("[DONE]")) ctrl.close()
                    } catch {}
                  }, step.at),
                )
              }
            },
            cancel() {
              for (const timer of timers) clearTimeout(timer)
            },
          })
          return new Response(body, { headers: { "content-type": "text/event-stream" } })
        },
      }),
    ),
    (server) => Effect.promise(() => server.stop(true)),
  )

// Streams one completion through the real provider fetch wrapper.
const stream = (script: Script, options: Record<string, number>) =>
  Effect.gen(function* () {
    const server = yield* gateway(script)
    return yield* provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const provider = yield* Provider.Service
          const language = yield* provider.getLanguage(yield* provider.getModel(providerID, modelID))
          return yield* Effect.promise(async () => {
            const started = Date.now()
            const result = await language.doStream({ prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }] })
            const text: string[] = []
            const errors: string[] = []
            const reader = result.stream.getReader()
            try {
              while (true) {
                const next = await reader.read()
                if (next.done) break
                if (next.value.type === "text-delta") text.push(next.value.delta)
                if (next.value.type === "error") {
                  const error = next.value.error
                  errors.push(error instanceof Error ? error.message : String(error))
                }
              }
            } catch (error) {
              errors.push(error instanceof Error ? error.message : String(error))
            }
            return { text: text.join(""), errors, elapsed: Date.now() - started }
          })
        }),
      {
        config: {
          enabled_providers: [providerID],
          provider: {
            [providerID]: {
              name: "SSE Gateway",
              npm: "@ai-sdk/openai-compatible",
              options: { apiKey: "test-key", baseURL: `${server.url.origin}/v1`, ...options },
              models: { [modelID]: { tool_call: true, limit: { context: 8192, output: 2048 } } },
            },
          },
        },
      },
    )
  })

describe("provider SSE event timeout", () => {
  it.live("a stream that only sends keep-alive comments ends at the event timeout", () =>
    Effect.gen(function* () {
      // The chunk timeout is longer than the event timeout, so only the event
      // timer can end this stream before the script runs out.
      const result = yield* stream([{ at: 0, text: ":\n\n" }, ...keepAlives(20, 6_000, 20)], {
        chunkTimeout: 3_000,
        eventTimeout: 1_000,
      })
      expect(result.errors.some((message) => message.includes("SSE read timed out"))).toBe(true)
      expect(result.elapsed).toBeGreaterThanOrEqual(900)
      expect(result.elapsed).toBeLessThan(2_900)
    }),
  )

  it.live("without an event timeout, keep-alive comments keep the chunk timer alive", () =>
    Effect.gen(function* () {
      const result = yield* stream(
        [
          ...keepAlives(0, 2_500, 50),
          { at: 2_500, text: chunk("late") },
          { at: 2_550, text: chunk("", "stop") + "data: [DONE]\n\n" },
        ],
        { chunkTimeout: 1_000 },
      )
      expect(result.errors).toEqual([])
      expect(result.text).toBe("late")
    }),
  )

  it.live("events keep resetting the event timeout across a longer stream", () =>
    Effect.gen(function* () {
      const result = yield* stream(
        [
          ...Array.from({ length: 12 }, (_, i) => ({ at: i * 300, text: `: keep-alive\n\n${chunk(String(i % 10))}` })),
          { at: 3_400, text: chunk("", "stop") + "data: [DONE]\n\n" },
        ],
        { chunkTimeout: 3_000, eventTimeout: 1_000 },
      )
      expect(result.errors).toEqual([])
      expect(result.text).toBe("012345678901")
    }),
  )

  it.live("a keep-alive comment split across chunks is still not an event", () =>
    Effect.gen(function* () {
      // The second half starts a chunk but not a line; only carried line state
      // tells it apart from a `data:` line.
      const result = yield* stream(
        Array.from({ length: 300 }, (_, i) => ({ at: i * 20, text: i % 2 === 0 ? ": keep-" : "alive\n\n" })),
        { chunkTimeout: 3_000, eventTimeout: 1_000 },
      )
      expect(result.errors.some((message) => message.includes("SSE read timed out"))).toBe(true)
      expect(result.elapsed).toBeLessThan(2_900)
    }),
  )
})
