import { afterEach, beforeAll, expect, test } from "bun:test"
import { pathToFileURL } from "node:url"
import path from "node:path"
import z from "zod"
import { Instance } from "../../src/project/instance"
import { execute } from "../../src/llm-server/completions"
import { ChatCompletionRequest } from "../../src/llm-server/protocol"
import { tmpdir, prepareConfigDependencies } from "../fixture/fixture"
import { Global } from "../../src/global"
import { Env } from "../../src/env"
import { Auth } from "../../src/auth"
import { makeRuntime } from "../../src/effect/run-service"
import { imageBytes, imageFixture } from "./image-fixture"

beforeAll(() => prepareConfigDependencies(Global.Path.config))
afterEach(() => Instance.disposeAll())
const env = makeRuntime(Env.Service, Env.defaultLayer)

function rejected(promise: Promise<unknown>) {
  return promise.then(
    () => {
      throw new Error("Expected request failure")
    },
    (error: unknown) => error,
  )
}
const base = ChatCompletionRequest.parse({ model: "local/chat", messages: [{ role: "user", content: "hello" }] })
const request = (
  req: Partial<ChatCompletionRequest> = {},
  models = ["local/chat"],
  abort = new AbortController().signal,
) => execute({ req: { ...base, ...req }, models, abort })
const wireChunk = (delta: Record<string, unknown>, finish: string | null = null) => ({
  id: "vendor-id",
  object: "chat.completion.chunk",
  created: 1,
  model: "wire-model",
  choices: [{ index: 0, delta, finish_reason: finish }],
})
const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`
const vendorUsage = {
  prompt_tokens: 12,
  completion_tokens: 7,
  total_tokens: 19,
  prompt_tokens_details: { cached_tokens: 4 },
  completion_tokens_details: { reasoning_tokens: 2 },
}
const vendorBody = (chunks = [wireChunk({ content: "Hello." }), wireChunk({}, "stop")]) =>
  chunks.map(frame).join("") + frame({ ...wireChunk({}), choices: [], usage: vendorUsage }) + "data: [DONE]\n\n"
type Seen = { path: string; headers: Headers; body: Record<string, unknown> }
async function fixture<T>(
  fn: (seen: Seen[]) => Promise<T>,
  options: {
    handle?: (request: Request, body: Record<string, unknown>) => Response | Promise<Response>
    plugin?: string
    providerID?: string
    apiID?: string
    npm?: string
    images?: boolean
  } = {},
) {
  const seen: Seen[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const body = z.record(z.string(), z.unknown()).parse(await req.json())
      seen.push({ path: new URL(req.url).pathname, headers: req.headers, body })
      return options.handle
        ? options.handle(req, body)
        : new Response(vendorBody(), { headers: { "content-type": "text/event-stream" } })
    },
  })
  try {
    await using tmp = await tmpdir({
      config: {
        enabled_providers: [options.providerID ?? "local"],
        provider: {
          [options.providerID ?? "local"]: {
            npm: options.npm ?? "@ai-sdk/openai-compatible",
            env: options.providerID === "xiaomi" ? ["XIAOMI_API_KEY"] : [],
            options: {
              apiKey: "local-vendor-key",
              baseURL: `http://127.0.0.1:${server.port}/v1`,
              headers: { "x-provider": "provider" },
            },
            models: {
              chat: {
                id: options.apiID ?? "wire-model",
                temperature: true,
                reasoning: true,
                modalities: { input: options.images === false ? ["text"] : ["text", "image"], output: ["text"] },
                options: { reasoningEffort: "low" },
                variants: { high: { reasoningEffort: "high" } },
                headers: { "x-model": "model", "X-Override": "model" },
              },
              speech: { modalities: { input: ["text"], output: ["audio"] } },
            },
          },
        },
      },
      init: async (dir) => {
        if (!options.plugin) return
        const file = path.join(dir, "chat-plugin.mjs")
        await Bun.write(file, options.plugin)
        const config = z.record(z.string(), z.unknown()).parse(await Bun.file(path.join(dir, "mimocode.json")).json())
        await Bun.write(
          path.join(dir, "mimocode.json"),
          JSON.stringify({ ...config, plugin: [pathToFileURL(file).href] }),
        )
      },
    })
    return await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        if (options.providerID === "xiaomi") env.runSync((service) => service.set("XIAOMI_API_KEY", "local-vendor-key"))
        return fn(seen)
      },
    })
  } finally {
    await server.stop(true)
  }
}

const completionSchema = z.object({
  model: z.string(),
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable(),
        tool_calls: z
          .array(z.object({ id: z.string(), function: z.object({ name: z.string(), arguments: z.string() }) }))
          .optional(),
      }),
      finish_reason: z.string(),
    }),
  ),
  usage: z.unknown(),
})
const chunkSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(z.object({ delta: z.record(z.string(), z.unknown()), finish_reason: z.string().nullable() })),
  usage: z.unknown().optional(),
})

test("non-streaming uses configured API identity, credentials and records usage", () =>
  fixture(async (seen) => {
    const response = await request({
      temperature: 0.4,
      max_tokens: 20,
      max_completion_tokens: 30,
      reasoning_effort: "high",
    })
    expect(response.status).toBe(200)
    expect(completionSchema.parse(await response.json())).toMatchObject({
      model: "local/chat",
      choices: [{ message: { content: "Hello." }, finish_reason: "stop" }],
      usage: vendorUsage,
    })
    expect(seen).toHaveLength(1)
    expect(seen[0].path).toBe("/v1/chat/completions")
    expect(seen[0].headers.get("authorization")).toBe("Bearer local-vendor-key")
    expect(seen[0].headers.get("x-provider")).toBe("provider")
    expect(seen[0].headers.get("x-model")).toBe("model")
    expect(seen[0].body).toMatchObject({
      model: "wire-model",
      stream: true,
      temperature: 0.4,
      max_tokens: 30,
      reasoning_effort: "high",
    })
  }))

test("SSE emits stable identity, text, terminal and separately requested usage", () =>
  fixture(async () => {
    const response = await request({ stream: true, stream_options: { include_usage: true } })
    expect(response.headers.get("content-type")).toContain("text/event-stream")
    const frames = (await response.text())
      .split("\n\n")
      .filter(Boolean)
      .map((value) => value.slice(6))
    expect(frames.at(-1)).toBe("[DONE]")
    expect(frames.filter((value) => value === "[DONE]")).toHaveLength(1)
    const chunks = frames.slice(0, -1).map((value) => chunkSchema.parse(JSON.parse(value)))
    expect(new Set(chunks.map((value) => value.id)).size).toBe(1)
    expect(chunks.map((value) => value.model)).toEqual(Array(chunks.length).fill("local/chat"))
    expect(chunks[0].choices[0].delta).toMatchObject({ role: "assistant" })
    expect(chunks[1].choices[0].delta).toEqual({ content: "Hello." })
    expect(chunks.at(-2)?.choices[0].finish_reason).toBe("stop")
    expect(chunks.at(-1)).toMatchObject({ choices: [], usage: vendorUsage })
  }))

test("tools are returned to the caller without executing a server tool", () =>
  fixture(
    async (seen) => {
      const tools = [
        {
          type: "function" as const,
          function: {
            name: "bash",
            description: "Caller-owned tool",
            parameters: { type: "object", properties: { command: { type: "string" } } },
          },
        },
      ]
      const response = await request({ tools, tool_choice: "required" })
      expect(completionSchema.parse(await response.json()).choices[0]).toMatchObject({
        finish_reason: "tool_calls",
        message: {
          content: null,
          tool_calls: [{ id: "call_1", function: { name: "bash", arguments: '{"command":"echo caller-owned"}' } }],
        },
      })
      expect(seen).toHaveLength(1)
      expect(seen[0].body).toMatchObject({ tool_choice: "required", tools })
    },
    {
      handle: () =>
        new Response(
          vendorBody([
            wireChunk({
              tool_calls: [
                { index: 0, id: "call_1", type: "function", function: { name: "bash", arguments: '{"command":' } },
              ],
            }),
            wireChunk({ tool_calls: [{ index: 0, function: { arguments: '"echo caller-owned"}' } }] }),
            wireChunk({}, "tool_calls"),
          ]),
          { headers: { "content-type": "text/event-stream" } },
        ),
    },
  ))

test("scope is exact and nonempty, and validation precedes any provider request", () =>
  fixture(async (seen) => {
    expect(await rejected(request({}, []))).toMatchObject({ status: 404 })
    expect(await rejected(request({ model: "local/wire-model" }))).toMatchObject({ status: 404 })
    expect(await rejected(request({ model: "chat" }, ["chat"]))).toMatchObject({ status: 400 })
    expect(await rejected(request({ model: "local/missing" }, ["local/missing"]))).toMatchObject({ status: 404 })
    expect(await rejected(request({ model: "local/speech" }, ["local/speech"]))).toMatchObject({ status: 400 })
    expect(await rejected(request({ parallel_tool_calls: false }))).toMatchObject({ status: 400 })
    expect(await rejected(request({ reasoning_effort: "impossible" }))).toMatchObject({ status: 400 })
    expect(seen).toHaveLength(0)
  }))

test("plugins receive a complete synthetic user message and override effective options and headers", () =>
  fixture(
    async (seen) => {
      await (await request({ reasoning_effort: "high" })).text()
      expect(seen[0].body).toMatchObject({ temperature: 0.7, reasoning_effort: "minimal" })
      expect(seen[0].headers.get("x-override")).toBe("hook")
      expect(seen[0].headers.get("x-hook-context")).toBe("user:llm-api:local:chat:true")
    },
    {
      plugin: `export default async () => ({
  "chat.params": async (input, output) => { if (!input.message.id || !input.message.time.created || output.options.reasoningEffort !== "high") throw new Error("missing user or variant context"); output.temperature = 0.7; output.options = { reasoningEffort: "minimal" }; },
  "chat.headers": async (input, output) => { output.headers["x-override"] = "hook"; output.headers["x-hook-context"] = [input.message.role, input.agent, input.message.model.providerID, input.message.model.modelID, input.sessionID === input.message.sessionID].join(":"); }
})`,
    },
  ))

test("pre-frame provider errors are sanitized and are not retried", () =>
  fixture(
    async (seen) => {
      const error = await rejected(request({ stream: true }))
      expect(error).toMatchObject({ status: 502, message: "Chat provider request failed", type: "api_error" })
      expect(String(error)).not.toContain("vendor-secret")
      expect(seen).toHaveLength(1)
    },
    { handle: () => Response.json({ error: { message: "vendor-secret local-vendor-key" } }, { status: 429 }) },
  ))

test("a truncated non-streaming provider body fails instead of claiming stop", () =>
  fixture(
    async () => {
      expect(await rejected(request())).toMatchObject({ status: 502 })
    },
    {
      handle: () =>
        new Response(frame(wireChunk({ content: "partial" })), { headers: { "content-type": "text/event-stream" } }),
    },
  ))

test("a truncated SSE has one safe error frame and DONE after its partial content", () =>
  fixture(
    async () => {
      const body = await (await request({ stream: true })).text()
      expect(body).toContain('"content":"partial"')
      expect(body).toContain('"message":"Chat provider request failed"')
      expect(body).not.toContain('"finish_reason":"stop"')
      expect(body.match(/"error":/g)).toHaveLength(1)
      expect(body.match(/data: \[DONE\]/g)).toHaveLength(1)
    },
    {
      handle: () =>
        new Response(frame(wireChunk({ content: "partial" })), { headers: { "content-type": "text/event-stream" } }),
    },
  ))

test("an empty truncated SSE fails before response headers", () =>
  fixture(
    async () => {
      expect(await rejected(request({ stream: true }))).toMatchObject({ status: 502 })
    },
    { handle: () => new Response("", { headers: { "content-type": "text/event-stream" } }) },
  ))

test("an already aborted request never reaches the provider", () =>
  fixture(async (seen) => {
    const controller = new AbortController()
    controller.abort(new DOMException("Caller cancelled", "AbortError"))
    expect(await rejected(request({}, ["local/chat"], controller.signal))).toMatchObject({ name: "AbortError" })
    expect(seen).toHaveLength(0)
  }))

async function deadline<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  const limit = Promise.withResolvers<T>()
  const timer = setTimeout(() => limit.reject(new Error("Fixture deadline exceeded")), ms)
  return Promise.race([promise, limit.promise]).finally(() => clearTimeout(timer))
}

test("body cancellation converges during a pending pull and closes the vendor connection", () => {
  const closed = Promise.withResolvers<void>()
  return fixture(
    async () => {
      const response = await request({ stream: true })
      const reader = response.body!.getReader()
      expect(new TextDecoder().decode((await reader.read()).value)).toContain('"role":"assistant"')
      expect(new TextDecoder().decode((await reader.read()).value)).toContain('"content":"first"')
      const pending = reader.read()
      await deadline(reader.cancel(new DOMException("Client disconnected", "AbortError")))
      expect((await pending).done).toBe(true)
      await deadline(closed.promise)
    },
    {
      handle: (req) => {
        req.signal.addEventListener("abort", () => closed.resolve(), { once: true })
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(frame(wireChunk({ content: "first" }))))
            },
            cancel() {
              closed.resolve()
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        )
      },
    },
  )
})

test("body cancellation before the first client read still closes the vendor connection", () => {
  const closed = Promise.withResolvers<void>()
  return fixture(
    async () => {
      const response = await request({ stream: true })
      await deadline(response.body!.cancel())
      await deadline(closed.promise)
    },
    {
      handle: (req) => {
        req.signal.addEventListener("abort", () => closed.resolve(), { once: true })
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(frame(wireChunk({ content: "first" }))))
            },
            cancel() {
              closed.resolve()
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        )
      },
    },
  )
})

test("external cancellation interrupts a pending first provider response", () => {
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  return fixture(
    async (seen) => {
      const controller = new AbortController()
      const result = rejected(request({ stream: true }, ["local/chat"], controller.signal))
      try {
        await deadline(started.promise)
        controller.abort(new DOMException("Stopped", "AbortError"))
        expect(await deadline(result)).toMatchObject({ name: "AbortError" })
        expect(seen).toHaveLength(1)
      } finally {
        controller.abort()
        release.resolve()
        await result
      }
    },
    {
      handle: async () => {
        started.resolve()
        await release.promise
        return new Response(vendorBody(), { headers: { "content-type": "text/event-stream" } })
      },
    },
  )
})

test("reasoning and fragmented tool SSE remain replayable and preserve explicit strict", () =>
  fixture(
    async (seen) => {
      const body = await (
        await request({
          stream: true,
          tools: [
            {
              function: {
                name: "lookup",
                strict: true,
                parameters: { type: "object", properties: { city: { type: "string" } } },
              },
            },
          ],
        })
      ).text()
      const chunks = body
        .split("\n\n")
        .filter((value) => value && value !== "data: [DONE]")
        .map((value) => chunkSchema.parse(JSON.parse(value.slice(6))))
      expect(chunks.some((value) => value.choices[0]?.delta.reasoning_content === "Think.")).toBe(true)
      const calls = chunks.flatMap((value) =>
        z
          .array(
            z.object({
              index: z.number(),
              id: z.string().optional(),
              function: z.object({ name: z.string().optional(), arguments: z.string() }),
            }),
          )
          .parse(value.choices[0]?.delta.tool_calls ?? []),
      )
      expect(calls[0]).toMatchObject({ index: 0, id: "call_2", function: { name: "lookup" } })
      expect(calls.map((value) => value.function.arguments).join("")).toBe('{"city":"BJ"}')
      expect(chunks.at(-1)?.choices[0].finish_reason).toBe("tool_calls")
      expect(seen[0].body.tools).toMatchObject([{ function: { strict: true } }])
    },
    {
      handle: () =>
        new Response(
          vendorBody([
            wireChunk({ reasoning_content: "Think." }),
            wireChunk({
              tool_calls: [
                { index: 0, id: "call_2", type: "function", function: { name: "lookup", arguments: '{"city":' } },
              ],
            }),
            wireChunk({ tool_calls: [{ index: 0, function: { arguments: '"BJ"}' } }] }),
            wireChunk({}, "tool_calls"),
          ]),
          { headers: { "content-type": "text/event-stream" } },
        ),
    },
  ))

test("inline images and historical tool results reach the actual provider", () =>
  fixture(async (seen) => {
    const image =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII="
    await (
      await request({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe" },
              { type: "image_url", image_url: { url: image } },
            ],
          },
          {
            role: "assistant",
            tool_calls: [{ id: "history", function: { name: "lookup", arguments: '{"city":"BJ"}' } }],
          },
          { role: "tool", tool_call_id: "history", content: "20C" },
        ],
      })
    ).text()
    const messages = z.array(z.record(z.string(), z.unknown())).parse(seen[0].body.messages)
    expect(messages[0].content).toMatchObject([
      { type: "text", text: "Describe" },
      { type: "image_url", image_url: { url: image } },
    ])
    expect(messages[1].tool_calls).toMatchObject([
      { id: "history", function: { name: "lookup", arguments: '{"city":"BJ"}' } },
    ])
    expect(messages[2]).toMatchObject({ role: "tool", tool_call_id: "history", content: "20C" })
  }))

test("remote image bytes reach the real provider SDK without exposing its credentials to the image host", () =>
  fixture(async (seen) =>
    imageFixture(async ({ transport, seen: downloaded }) => {
      const url = "http://images.example/picture.png"
      const response = await execute(
        {
          req: ChatCompletionRequest.parse({
            ...base,
            messages: [{ role: "user", content: [{ type: "image_url", image_url: { url } }] }],
          }),
          models: ["local/chat"],
          abort: new AbortController().signal,
        },
        transport,
      )
      expect(completionSchema.parse(await response.json()).choices[0].message.content).toBe("Hello.")
      expect(seen).toHaveLength(1)
      expect(seen[0].body.messages).toMatchObject([
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBytes.toString("base64")}` } },
          ],
        },
      ])
      expect(seen[0].headers.get("authorization")).toBe("Bearer local-vendor-key")
      expect(downloaded).toHaveLength(1)
      expect(downloaded[0].headers.authorization).toBeUndefined()
      expect(downloaded[0].headers["x-provider"]).toBeUndefined()
      expect(downloaded[0].headers["x-model"]).toBeUndefined()
      expect(JSON.stringify(seen[0].body)).not.toContain("images.example")
    }),
  ))

test.each([
  { extra: {}, models: [], status: 404 },
  { extra: { model: "local/missing" }, models: ["local/missing"], status: 404 },
  { extra: { model: "local/speech" }, models: ["local/speech"], status: 400 },
  { extra: { reasoning_effort: "impossible" }, models: ["local/chat"], status: 400 },
  { extra: { parallel_tool_calls: false }, models: ["local/chat"], status: 400 },
])("validates model scope and options before image DNS or provider work: %j", ({ extra, models, status }) =>
  fixture(async (seen) => {
    let lookups = 0
    await expect(
      execute(
        {
          req: {
            ...base,
            ...extra,
            messages: [
              { role: "user", content: [{ type: "image_url", image_url: { url: "http://images.example/p.png" } }] },
            ],
          },
          models: [...models],
          abort: new AbortController().signal,
        },
        {
          lookup: async () => {
            lookups++
            return [{ address: "127.0.0.1", family: 4 }]
          },
        },
      ),
    ).rejects.toMatchObject({ status })
    expect(lookups).toBe(0)
    expect(seen).toHaveLength(0)
  }),
)

test("rejects images for a text-only model before downloading or invoking the provider", () =>
  fixture(
    async (seen) => {
      let lookups = 0
      await expect(
        execute(
          {
            req: {
              ...base,
              messages: [
                { role: "user", content: [{ type: "image_url", image_url: { url: "http://images.example/p.png" } }] },
              ],
            },
            models: ["local/chat"],
            abort: new AbortController().signal,
          },
          {
            lookup: async () => {
              lookups++
              return [{ address: "127.0.0.1", family: 4 }]
            },
          },
        ),
      ).rejects.toMatchObject({ status: 400 })
      expect(lookups).toBe(0)
      expect(seen).toHaveLength(0)
    },
    { images: false },
  ))

test.each([
  ["mimo-v2.5", "/v1/chat/completions"],
  ["mimo-v2-flash-ptc", "/v1/responses"],
])("MiMo API identity %s preserves the fork endpoint selection", (apiID, expectedPath) =>
  fixture(
    async (seen) => {
      expect(await rejected(request({ model: "xiaomi/chat" }, ["xiaomi/chat"]))).toMatchObject({ status: 502 })
      expect(seen).toHaveLength(1)
      expect(seen[0].path).toBe(expectedPath)
      expect(seen[0].body.model).toBe(apiID)
    },
    {
      providerID: "xiaomi",
      npm: "@ai-sdk/openai-compatible",
      apiID,
      handle: () => Response.json({ error: { message: "fixture-stop" } }, { status: 400 }),
    },
  ),
)

test("provider output limits abort an oversized completion", () =>
  fixture(
    async () => {
      expect(await rejected(request())).toMatchObject({ status: 502, message: "Chat provider request failed" })
    },
    {
      handle: () =>
        new Response(vendorBody([wireChunk({ content: "x".repeat(17 * 1024 * 1024) }), wireChunk({}, "stop")]), {
          headers: { "content-type": "text/event-stream" },
        }),
    },
  ))

test("external abort and body cancel converge together during an active pull", () => {
  const closed = Promise.withResolvers<void>()
  return fixture(
    async () => {
      const controller = new AbortController()
      const response = await request({ stream: true }, ["local/chat"], controller.signal)
      const reader = response.body!.getReader()
      await reader.read()
      await reader.read()
      const pending = reader.read()
      controller.abort()
      await deadline(reader.cancel(controller.signal.reason))
      expect((await pending).done).toBe(true)
      await deadline(closed.promise)
    },
    {
      handle: (req) => {
        req.signal.addEventListener("abort", () => closed.resolve(), { once: true })
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(frame(wireChunk({ content: "first" }))))
            },
            cancel() {
              closed.resolve()
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        )
      },
    },
  )
})

test("cancellation interrupts provider initialization while a configured plugin is waiting", async () => {
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch() {
      started.resolve()
      await release.promise
      return new Response("ready")
    },
  })
  try {
    await fixture(
      async (seen) => {
        const controller = new AbortController()
        const result = rejected(request({}, ["local/chat"], controller.signal))
        try {
          await deadline(started.promise)
          controller.abort()
          expect(await deadline(result)).toMatchObject({ name: "AbortError" })
          expect(seen).toHaveLength(0)
        } finally {
          controller.abort()
          release.resolve()
          await result
        }
      },
      { plugin: `export default async () => { await fetch(${JSON.stringify(String(server.url))}); return {} }` },
    )
  } finally {
    release.resolve()
    await server.stop(true)
  }
})

test("malformed provider tool arguments fail instead of returning a successful completion", () =>
  fixture(
    async () => {
      expect(await rejected(request({ tools: [{ function: { name: "lookup" } }] }))).toMatchObject({ status: 502 })
    },
    {
      handle: () =>
        new Response(
          vendorBody([
            wireChunk({
              tool_calls: [{ index: 0, id: "bad", type: "function", function: { name: "lookup", arguments: "{bad" } }],
            }),
            wireChunk({}, "tool_calls"),
          ]),
          { headers: { "content-type": "text/event-stream" } },
        ),
    },
  ))

test("provider_options cannot replace the scoped provider model on the wire", () =>
  fixture(async (seen) => {
    const result = await request({ provider_options: { model: "outside-scope" } }).catch((error: unknown) => error)
    expect(seen[0]?.body.model).not.toBe("outside-scope")
    expect(result).toMatchObject({ status: 400 })
    expect(seen).toHaveLength(0)
  }))

test("trusted configured model options still reach the provider", () =>
  fixture(async (seen) => {
    await (await request()).text()
    expect(seen[0].body.reasoning_effort).toBe("low")
  }))

test("configured plugin auth loaders supply provider-only credentials", async () => {
  Auth.inject(JSON.stringify({ local: { type: "api", key: "plugin-auth-secret" } }))
  try {
    await fixture(
      async (seen) => {
        const body = await (await request()).text()
        expect(seen[0].headers.get("x-loader-auth")).toBe("plugin-auth-secret")
        expect(body).not.toContain("plugin-auth-secret")
      },
      {
        plugin: `export default async () => ({ auth: { provider: "local", methods: [], loader: async (getAuth) => ({ headers: { "x-loader-auth": (await getAuth()).key } }) } })`,
      },
    )
  } finally {
    Auth.inject(undefined)
  }
})
