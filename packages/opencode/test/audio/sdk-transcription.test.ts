import { afterEach, beforeAll, expect, test } from "bun:test"
import path from "node:path"
import { createServer, type Socket } from "node:net"
import { pathToFileURL } from "node:url"
import z from "zod"
import { Instance } from "../../src/project/instance"
import { Global } from "../../src/global"
import { Server } from "../../src/server/server"
import { transcribe } from "../../src/audio/service"
import { LLMServerCapability } from "../../src/llm-server/capability"
import { prepareConfigDependencies, tmpdir } from "../fixture/fixture"

beforeAll(() => prepareConfigDependencies(Global.Path.config))
afterEach(() => Instance.disposeAll())

const bytes = Buffer.from([1, 2, 3])
const frame = (parts: readonly unknown[], finishReason: string | undefined = "STOP") =>
  `data: ${JSON.stringify({ candidates: [{ content: { role: "model", parts }, finishReason }] })}\n\n`
const transcription = (abort = new AbortController().signal, model = "asr/audio") =>
  transcribe({ req: { model, language: "zh" }, audio: bytes, mediaType: "audio/flac", abort })

async function fixture<T>(
  fn: (seen: { body: Record<string, unknown>; headers: Headers; path: string }[], directory: string) => Promise<T>,
  options: {
    npm?: string
    output?: number
    baseURL?: string
    plugin?: string
    handle?: (req: Request) => Response | Promise<Response>
  } = {},
) {
  const seen: { body: Record<string, unknown>; headers: Headers; path: string }[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      seen.push({
        body: z.record(z.string(), z.unknown()).parse(await req.json()),
        headers: req.headers,
        path: new URL(req.url).pathname,
      })
      return (
        options.handle?.(req) ??
        new Response(frame([{ text: "private thought", thought: true }, { text: "你好。" }]), {
          headers: { "content-type": "text/event-stream" },
        })
      )
    },
  })
  try {
    await using tmp = await tmpdir({
      config: {
        model: "asr/audio",
        enabled_providers: ["asr"],
        provider: {
          asr: {
            npm: options.npm ?? "@ai-sdk/google",
            options: {
              apiKey: "fixture-key",
              baseURL: options.baseURL ?? `http://127.0.0.1:${server.port}/v1`,
              headers: { "x-provider": "provider" },
            },
            models: {
              audio: {
                id: "gemini-2.5-flash",
                modalities: { input: ["text", "audio"], output: ["text"] },
                limit: { context: 128_000, output: options.output ?? 8192 },
                options: { thinkingConfig: { thinkingBudget: 0 } },
                headers: { "x-model": "model" },
              },
              noaudio: { modalities: { input: ["text"], output: ["text"] } },
              notext: { modalities: { input: ["text", "audio"], output: ["image"] } },
              dedicated: { modalities: { input: ["audio"], output: ["text"] } },
            },
          },
        },
      },
      init: async (dir) => {
        if (!options.plugin) return
        const plugin = path.join(dir, "asr-plugin.mjs")
        await Bun.write(plugin, options.plugin)
        const file = Bun.file(path.join(dir, "mimocode.json"))
        await Bun.write(file, JSON.stringify({ ...(await file.json()), plugin: [pathToFileURL(plugin).href] }))
      },
    })
    return await Instance.provide({ directory: tmp.path, fn: () => fn(seen, tmp.path) })
  } finally {
    await server.stop(true)
  }
}

test.each(["@ai-sdk/google", "@ai-sdk/google-vertex"])(
  "SDK ASR uses real %s transport and discovers without generation",
  (npm) =>
    fixture(
      async (seen) => {
        expect((await LLMServerCapability.resolve("transcription")).map((item) => item.ref)).toEqual(["asr/audio"])
        expect(seen).toHaveLength(0)
        expect(await transcription()).toEqual({ text: "你好。" })
        expect(seen).toHaveLength(1)
        expect(seen[0].path).toContain("gemini-2.5-flash:streamGenerateContent")
        expect(seen[0].body.contents).toEqual([
          {
            role: "user",
            parts: [
              {
                text: "Transcribe the audio verbatim. The audio is in zh. Output only the transcript, with no commentary, labels, or quotation marks.",
              },
              { inlineData: { mimeType: "audio/flac", data: "AQID" } },
            ],
          },
        ])
        expect(seen[0].body.generationConfig).toMatchObject({ maxOutputTokens: 4096 })
        expect(seen[0].body.generationConfig).toMatchObject({ thinkingConfig: { thinkingBudget: 0 } })
        expect(seen[0].headers.get("x-goog-api-key")).toBe("fixture-key")
        expect(seen[0].headers.get("x-provider")).toBe("provider")
        expect(seen[0].headers.get("x-model")).toBe("model")
      },
      { npm },
    ),
)

test.each([
  { parts: [{ text: "partial" }], reason: "MAX_TOKENS" },
  { parts: [{ text: "private thought", thought: true }], reason: "STOP" },
  { parts: [{ text: "  " }], reason: "STOP" },
  { parts: [{ text: "partial" }], reason: "SAFETY" },
  { parts: [{ text: "partial" }], reason: "OTHER" },
  { parts: [{ text: "partial" }, { functionCall: { name: "unrequested", args: {} } }], reason: "STOP" },
])("SDK ASR rejects incomplete or non-transcript output: %j", ({ parts, reason }) =>
  fixture(
    async (seen) => {
      await expect(transcription()).rejects.toMatchObject({ status: 502, message: "Audio provider request failed" })
      expect(seen).toHaveLength(1)
    },
    { handle: () => new Response(frame(parts, reason), { headers: { "content-type": "text/event-stream" } }) },
  ),
)

test("SDK ASR caps its default to the model limit and preserves trusted hooks", () =>
  fixture(
    async (seen) => {
      await transcription()
      expect(seen[0].body.generationConfig).toMatchObject({ maxOutputTokens: 512, topP: 0.23 })
      expect(seen[0].headers.get("x-hook")).toBe("hook")
    },
    {
      output: 512,
      plugin: `export const Hook = async () => ({
    "chat.params": async (_, output) => { output.topP = 0.23; output.maxOutputTokens = 9999 },
    "chat.headers": async (_, output) => { output.headers["x-hook"] = "hook" }
  })`,
    },
  ))

test("SDK ASR rejects wrong input/output capabilities and dedicated models without sending", () =>
  fixture(async (seen) => {
    for (const model of ["asr/noaudio", "asr/notext", "asr/dedicated"])
      await expect(transcription(undefined, model)).rejects.toBeInstanceOf(Error)
    expect(seen).toHaveLength(0)
  }))

test("SDK ASR provider errors are sanitized without retries", () =>
  fixture(
    async (seen) => {
      await expect(transcription()).rejects.toMatchObject({ status: 502, message: "Audio provider request failed" })
      expect(seen).toHaveLength(1)
    },
    {
      handle: () =>
        Response.json(
          { error: { code: 429, message: "secret-response-key", status: "RESOURCE_EXHAUSTED" } },
          { status: 429 },
        ),
    },
  ))

test("SDK ASR refuses a stream with no finish even when text arrived", () =>
  fixture(
    async (seen) => {
      await expect(transcription()).rejects.toMatchObject({ status: 502, message: "Audio provider request failed" })
      expect(seen).toHaveLength(1)
    },
    {
      handle: () =>
        new Response('data: {"candidates":[{"content":{"role":"model","parts":[{"text":"partial"}]}}]}\n\n', {
          headers: { "content-type": "text/event-stream" },
        }),
    },
  ))

test("SDK ASR bounds output independently of its token setting without retrying", () =>
  fixture(
    async (seen) => {
      await expect(transcription()).rejects.toMatchObject({ status: 502, message: "Audio provider request failed" })
      expect(seen).toHaveLength(1)
    },
    {
      handle: () =>
        new Response(frame([{ text: "x".repeat(16 * 1024 * 1024 + 1) }]), {
          headers: { "content-type": "text/event-stream" },
        }),
    },
  ))

test("SDK ASR refuses adapters without verified audio serialization in both discovery and execution", () =>
  fixture(
    async (seen) => {
      expect(await LLMServerCapability.resolve("transcription")).toEqual([])
      await expect(transcription()).rejects.toMatchObject({ status: 501 })
      expect(seen).toHaveLength(0)
    },
    { npm: "@ai-sdk/anthropic" },
  ))

test.each([
  { mediaType: "image/png", size: 3 },
  { mediaType: "text/html", size: 3 },
  { mediaType: "audio/unknown", size: 3 },
  { mediaType: "audio/wav", size: 0 },
  { mediaType: "audio/wav", size: 20 * 1024 * 1024 + 1 },
])("SDK ASR service rejects invalid media before generation: %j", ({ mediaType, size }) =>
  fixture(async (seen) => {
    await expect(
      transcribe({
        req: { model: "asr/audio" },
        audio: Buffer.alloc(size),
        mediaType,
        abort: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ status: 400 })
    expect(seen).toHaveLength(0)
  }),
)

async function deadline<T>(promise: Promise<T>) {
  const pending = Promise.withResolvers<T>()
  const timer = setTimeout(() => pending.reject(new Error("ASR cancellation did not converge")), 1500)
  return Promise.race([promise, pending.promise]).finally(() => clearTimeout(timer))
}

test.each(["headers", "body"])("SDK ASR cancellation closes the real provider socket during %s", async (stage) => {
  const sockets = new Set<Socket>()
  const received = Promise.withResolvers<void>()
  const closed = Promise.withResolvers<void>()
  const server = createServer((socket) => {
    sockets.add(socket)
    socket.on("error", () => {})
    socket.on("close", () => {
      sockets.delete(socket)
      closed.resolve()
    })
    let data = Buffer.alloc(0)
    let sent = false
    socket.on("data", (chunk) => {
      data = Buffer.concat([data, chunk])
      const end = data.indexOf("\r\n\r\n")
      if (sent || end < 0) return
      const length = Number(/content-length: (\d+)/i.exec(data.toString("utf8", 0, end))?.[1])
      if (!Number.isFinite(length) || data.length < end + 4 + length) return
      sent = true
      if (stage === "body") {
        const part = 'data: {"candidates":[{"content":{"role":"model","parts":[{"text":"partial"}]}}]}\n\n'
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nTransfer-Encoding: chunked\r\n\r\n${Buffer.byteLength(part).toString(16)}\r\n${part}\r\n`,
        )
      }
      received.resolve()
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Missing ASR fixture address")
  try {
    await fixture(
      async () => {
        const controller = new AbortController()
        const result = transcription(controller.signal)
        await deadline(Promise.race([received.promise, result]))
        controller.abort()
        await expect(deadline(result)).rejects.toMatchObject({ name: "AbortError" })
        // Assert before fixture/server cleanup can manufacture the disconnect.
        await deadline(closed.promise)
      },
      { baseURL: `http://127.0.0.1:${address.port}/v1` },
    )
  } finally {
    sockets.forEach((socket) => socket.destroy())
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test.each(["json", "text"])("explicit HTTP multipart SDK ASR returns the existing %s contract", (format) =>
  fixture(async (seen, directory) => {
    const key = "test-asr-sdk-key-01234567890123456789"
    const server = await Server.listen({ hostname: "127.0.0.1", port: 0, audio: { key, directory } })
    try {
      const form = new FormData()
      form.set("model", "asr/audio")
      form.set("language", "zh")
      form.set("response_format", format)
      form.set("file", new File([bytes], "recording.flac", { type: "audio/flac" }))
      const response = await fetch(new URL("/v1/audio/transcriptions", server.url), {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, connection: "close" },
        body: form,
      })
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain(format === "json" ? "application/json" : "text/plain")
      expect(format === "json" ? await response.json() : await response.text()).toEqual(
        format === "json" ? { text: "你好。" } : "你好。",
      )
      expect(seen).toHaveLength(1)
      expect(seen[0].body.contents).toEqual([
        {
          role: "user",
          parts: [
            {
              text: "Transcribe the audio verbatim. The audio is in zh. Output only the transcript, with no commentary, labels, or quotation marks.",
            },
            { inlineData: { mimeType: "audio/flac", data: "AQID" } },
          ],
        },
      ])
      expect(seen[0].headers.get("authorization")).toBeNull()
    } finally {
      await server.stop(true)
    }
  }),
)
