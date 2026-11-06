import { afterEach, describe, expect, test } from "bun:test"
import path from "path"
import { Effect } from "effect"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"
import { Provider } from "../../src/provider"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { AppRuntime } from "../../src/effect/app-runtime"

const providerID = ProviderID.make("sse-gateway")
const modelID = ModelID.make("test-model")
const originalFetch = globalThis.fetch

afterEach(async () => {
  globalThis.fetch = originalFetch
  await Instance.disposeAll()
})

const chunk = (content: string, finish?: string) =>
  `data: ${JSON.stringify({ id: "c1", choices: [{ delta: { content }, finish_reason: finish ?? null }] })}\n\n`

// A gateway stream: `script` lists what to send and when (ms after the
// response). The stream stays open after the script ends unless it sends
// `[DONE]`, and stops when the client cancels it.
function serve(script: Array<{ at: number; text: string }>) {
  const fake = async () => {
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
  }
  globalThis.fetch = Object.assign(fake, { preconnect: originalFetch.preconnect })
}

const keepAlives = (from: number, to: number, every: number) =>
  Array.from({ length: Math.floor((to - from) / every) }, (_, i) => ({ at: from + i * every, text: ": keep-alive\n\n" }))

async function stream(options: Record<string, number>) {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "mimocode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          enabled_providers: [providerID],
          provider: {
            [providerID]: {
              name: "SSE Gateway",
              npm: "@ai-sdk/openai-compatible",
              env: [],
              models: { [modelID]: { tool_call: true, limit: { context: 8192, output: 2048 } } },
              options: { apiKey: "test-key", baseURL: "https://example.test/v1", ...options },
            },
          },
        }),
      )
    },
  })
  return await Instance.provide({
    directory: tmp.path,
    fn: () =>
      AppRuntime.runPromise(
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
      ),
  })
}

describe("provider SSE event timeout", () => {
  test("a stream that only sends keep-alive comments ends at the event timeout", async () => {
    serve([{ at: 0, text: ":\n\n" }, ...keepAlives(20, 5_000, 20)])
    const result = await stream({ chunkTimeout: 150, eventTimeout: 400 })
    expect(result.errors.some((message) => message.includes("SSE read timed out"))).toBe(true)
    expect(result.elapsed).toBeGreaterThanOrEqual(350)
    expect(result.elapsed).toBeLessThan(2_000)
  })

  test("without an event timeout, keep-alive comments keep the chunk timer alive", async () => {
    serve([
      ...keepAlives(0, 600, 20),
      { at: 600, text: chunk("late") },
      { at: 620, text: chunk("", "stop") + "data: [DONE]\n\n" },
    ])
    const result = await stream({ chunkTimeout: 150 })
    expect(result.errors).toEqual([])
    expect(result.text).toBe("late")
  })

  test("events keep resetting the event timeout across a longer stream", async () => {
    serve([
      ...Array.from({ length: 12 }, (_, i) => ({ at: i * 100, text: `: keep-alive\n\n${chunk(String(i % 10))}` })),
      { at: 1_250, text: chunk("", "stop") + "data: [DONE]\n\n" },
    ])
    const result = await stream({ chunkTimeout: 150, eventTimeout: 400 })
    expect(result.errors).toEqual([])
    expect(result.text).toBe("012345678901")
  })

  test("a keep-alive comment split across chunks is still not an event", async () => {
    // The second half starts a chunk but not a line; only carried line state
    // tells it apart from a `data:` line.
    serve(
      Array.from({ length: 250 }, (_, i) => ({ at: i * 20, text: i % 2 === 0 ? ": keep-" : "alive\n\n" })),
    )
    const result = await stream({ chunkTimeout: 150, eventTimeout: 400 })
    expect(result.errors.some((message) => message.includes("SSE read timed out"))).toBe(true)
    expect(result.elapsed).toBeLessThan(2_000)
  })
})
