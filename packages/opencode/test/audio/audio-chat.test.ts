import { beforeAll, describe, expect } from "bun:test"
import { Buffer } from "node:buffer"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { Effect } from "effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { prepareConfigDependencies, provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

import { AudioChat, AudioChatError } from "../../src/audio/audio-chat"
import { Global } from "../../src/global"

const it = testEffect(CrossSpawnSpawner.defaultLayer)

beforeAll(() => prepareConfigDependencies(Global.Path.config))

type Seen = { url: string; method: string; headers: Headers; body: Record<string, unknown> }

function vendor(
  input: {
    message?: unknown
    response?: () => Response | Promise<Response>
    options?: Record<string, unknown>
    noBase?: boolean
  },
  fn: (seen: Seen[]) => Promise<void>,
) {
  return Effect.gen(function* () {
    const seen: Seen[] = []
    const server = yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve({
          hostname: "127.0.0.1",
          port: 0,
          fetch: async (req) => {
            seen.push({ url: req.url, method: req.method, headers: req.headers, body: await req.json() })
            return (
              input.response?.() ??
              Response.json({ choices: [{ message: input.message ?? { content: "transcript" } }] })
            )
          },
        }),
      ),
      (server) => Effect.promise(() => server.stop(true)),
    )
    yield* provideTmpdirInstance(() => Effect.promise(() => fn(seen)), {
      config: {
        enabled_providers: ["raw-audio"],
        provider: {
          "raw-audio": {
            npm: "@ai-sdk/openai-compatible",
            options: {
              apiKey: "fixture-provider-secret",
              ...(input.noBase ? {} : { baseURL: `${server.url}v1/` }),
              ...input.options,
            },
            models: { tts: { name: "Speech" }, asr: { name: "Transcription" } },
          },
        },
      },
    })
  })
}

const speech = () => ({ providerID: "raw-audio", modelID: "tts", text: "你好", abort: new AbortController().signal })
const transcription = () => ({
  providerID: "raw-audio",
  modelID: "asr",
  audio: new Uint8Array([1, 2, 3]),
  mediaType: "audio/wav",
  abort: new AbortController().signal,
})

describe("audio over chat transport", () => {
  it.live("synthesizes preset voice audio with assistant text and separate style instructions", () =>
    vendor({ message: { audio: { data: Buffer.from("RIFF....WAVEpayload").toString("base64") } } }, async (seen) => {
      const result = await AudioChat.synthesize({ ...speech(), voice: "Chloe", instructions: "calm", format: "wav" })
      expect(result.audio.toString()).toBe("RIFF....WAVEpayload")
      expect(result.format).toBe("wav")
      expect(seen).toHaveLength(1)
      expect(new URL(seen[0]!.url).pathname).toBe("/v1/chat/completions")
      expect(seen[0]!.method).toBe("POST")
      expect(seen[0]!.body).toEqual({
        model: "tts",
        messages: [
          { role: "user", content: "calm" },
          { role: "assistant", content: "你好" },
        ],
        audio: { voice: "Chloe", format: "wav" },
      })
    }),
  )

  it.live("defaults synthesis to wav without adding a style message or voice", () =>
    vendor({ message: { audio: { data: "YQ==" } } }, async (seen) => {
      expect((await AudioChat.synthesize(speech())).format).toBe("wav")
      expect(seen[0]!.body).toEqual({
        model: "tts",
        messages: [{ role: "assistant", content: "你好" }],
        audio: { format: "wav" },
      })
    }),
  )

  it.live("merges provider credentials and headers with case-insensitive model overrides", () =>
    vendor(
      { options: { headers: { "X-Provider": "provider", "X-Override": "provider", ignored: 42 } } },
      async (seen) => {
        await AudioChat.transcribe({ ...transcription(), headers: { "x-override": "model", "X-Model": "model" } })
        expect(seen[0]!.headers.get("authorization")).toBe("Bearer fixture-provider-secret")
        expect(seen[0]!.headers.get("content-type")).toBe("application/json")
        expect(seen[0]!.headers.get("x-provider")).toBe("provider")
        expect(seen[0]!.headers.get("x-override")).toBe("model")
        expect(seen[0]!.headers.get("x-model")).toBe("model")
        expect(seen[0]!.headers.get("ignored")).toBeNull()
      },
    ),
  )

  it.live("lets explicit model authorization override provider authorization", () =>
    vendor(
      { message: { audio: { data: "YQ==" } }, options: { headers: { Authorization: "provider-auth" } } },
      async (seen) => {
        await AudioChat.synthesize({ ...speech(), headers: { authorization: "model-auth" } })
        expect(seen[0]!.headers.get("authorization")).toBe("model-auth")
      },
    ),
  )

  it.live("transcribes dedicated ASR audio without text parts and sends only the requested language", () =>
    vendor({}, async (seen) => {
      expect(await AudioChat.transcribe({ ...transcription(), language: "zh" })).toEqual({ text: "transcript" })
      expect(seen[0]!.body).toEqual({
        model: "asr",
        messages: [
          { role: "user", content: [{ type: "input_audio", input_audio: { data: "data:audio/wav;base64,AQID" } }] },
        ],
        asr_options: { language: "zh" },
      })
      await AudioChat.transcribe(transcription())
      expect(seen[1]!.body.asr_options).toBeUndefined()
    }),
  )

  it.live("multimodal transcription uses its instruction and thinking control without ASR options", () =>
    vendor({}, async (seen) => {
      await AudioChat.transcribe({
        ...transcription(),
        language: "zh",
        instruction: "Transcribe verbatim",
        disableThinking: true,
      })
      expect(seen[0]!.body).toEqual({
        model: "asr",
        messages: [
          {
            role: "user",
            content: [
              { type: "input_audio", input_audio: { data: "data:audio/wav;base64,AQID" } },
              { type: "text", text: "Transcribe verbatim" },
            ],
          },
        ],
        thinking: { type: "disabled" },
        max_tokens: 4096,
      })
    }),
  )

  it.live("refuses a raw provider without an explicit base URL before sending a request", () =>
    vendor({ noBase: true }, async (seen) => {
      const error = await AudioChat.synthesize(speech()).catch((error: unknown) => error)
      expect(error).toBeInstanceOf(AudioChatError)
      expect(error).toMatchObject({ status: 501 })
      expect(seen).toHaveLength(0)
    }),
  )

  it.live("refuses an unknown provider before sending a request", () =>
    vendor({}, async (seen) => {
      await expect(AudioChat.synthesize({ ...speech(), providerID: "missing" })).rejects.toMatchObject({ status: 404 })
      expect(seen).toHaveLength(0)
    }),
  )

  it.live("redacts upstream rejection bodies from audio errors", () =>
    vendor(
      {
        response: () =>
          Response.json(
            { error: { message: "fixture-provider-secret", param: "private-transcript" } },
            { status: 401 },
          ),
      },
      async () => {
        const error = await AudioChat.synthesize(speech()).catch((error: unknown) => error)
        expect(error).toBeInstanceOf(AudioChatError)
        expect(error).toMatchObject({ status: 502 })
        expect(String(error)).toContain("401")
        expect(String(error)).not.toContain("fixture-provider-secret")
        expect(String(error)).not.toContain("private-transcript")
      },
    ),
  )

  for (const [name, body] of [
    ["malformed JSON", "fixture-provider-secret"],
    ["non-object JSON", "[]"],
    ["missing choices", "{}"],
    ["missing message", '{"choices":[{}]}'],
    ["missing audio", '{"choices":[{"message":{"content":"private-transcript"}}]}'],
    ["empty audio", '{"choices":[{"message":{"audio":{"data":""}}}]}'],
    ["invalid base64 audio", '{"choices":[{"message":{"audio":{"data":"???"}}}]}'],
    ["invalid trailing base64 audio", '{"choices":[{"message":{"audio":{"data":"YQ==??"}}}]}'],
  ]) {
    it.live(`rejects ${name} without exposing response content`, () =>
      vendor({ response: () => new Response(body) }, async () => {
        const error = await AudioChat.synthesize(speech()).catch((error: unknown) => error)
        expect(error).toMatchObject({ status: 502 })
        expect(String(error)).not.toContain("fixture-provider-secret")
        expect(String(error)).not.toContain("private-transcript")
      }),
    )
  }

  it.live("does not mistake reasoning content for a transcript", () =>
    vendor({ message: { content: null, reasoning_content: "private reasoning transcript" } }, async () => {
      const error = await AudioChat.transcribe(transcription()).catch((error: unknown) => error)
      expect(error).toMatchObject({ status: 502 })
      expect(String(error)).toContain("reasoning")
      expect(String(error)).not.toContain("private reasoning transcript")
    }),
  )

  it.live("cancels an active upstream fetch when the caller aborts", () => {
    const started = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    return vendor(
      {
        response: async () => {
          started.resolve()
          await release.promise
          return Response.json({ choices: [] })
        },
      },
      async () => {
        const controller = new AbortController()
        const result = AudioChat.transcribe({ ...transcription(), abort: controller.signal }).catch(
          (error: unknown) => error,
        )
        await started.promise
        controller.abort()
        const error = await result.finally(() => release.resolve())
        expect(error).toMatchObject({ name: "AbortError" })
      },
    )
  })

  it.live("does not send an already cancelled request", () =>
    vendor({}, async (seen) => {
      const controller = new AbortController()
      controller.abort()
      await expect(AudioChat.synthesize({ ...speech(), abort: controller.signal })).rejects.toMatchObject({
        name: "AbortError",
      })
      expect(seen).toHaveLength(0)
    }),
  )

  it.live("cancels provider lookup while a configured plugin is still initializing", () =>
    Effect.gen(function* () {
      const started = Promise.withResolvers<void>()
      const release = Promise.withResolvers<void>()
      const received: string[] = []
      const server = yield* Effect.acquireRelease(
        Effect.sync(() =>
          Bun.serve({
            hostname: "127.0.0.1",
            port: 0,
            fetch: async (request) => {
              received.push(new URL(request.url).pathname)
              started.resolve()
              await release.promise
              return new Response("ready")
            },
          }),
        ),
        (server) => Effect.promise(() => server.stop(true)),
      )
      yield* provideTmpdirInstance((dir) =>
        Effect.promise(async () => {
          const file = path.join(dir, "audio-plugin.ts")
          await Bun.write(
            file,
            `export const audioPlugin = async () => { await fetch(${JSON.stringify(`${server.url}initialize`)}); return {} }`,
          )
          await Bun.write(
            path.join(dir, "mimocode.json"),
            JSON.stringify({
              plugin: [pathToFileURL(file).href],
              enabled_providers: ["raw-audio"],
              provider: {
                "raw-audio": {
                  npm: "@ai-sdk/openai-compatible",
                  options: { baseURL: `${server.url}v1`, apiKey: "fixture-provider-secret" },
                  models: { tts: { name: "Speech" } },
                },
              },
            }),
          )
          const controller = new AbortController()
          const result = AudioChat.synthesize({ ...speech(), abort: controller.signal }).catch(
            (error: unknown) => error,
          )
          const deadline = Promise.withResolvers<"deadline">()
          const timer = setTimeout(() => deadline.resolve("deadline"), 5000)
          try {
            expect(await Promise.race([started.promise.then(() => "started"), deadline.promise])).toBe("started")
            controller.abort()
            // The plugin remains blocked until this assertion has completed.
            expect(await Promise.race([result, deadline.promise])).toMatchObject({ name: "AbortError" })
            expect(received).toEqual(["/initialize"])
          } finally {
            clearTimeout(timer)
            controller.abort()
            release.resolve()
            await result
          }
        }),
      )
    }),
  )

  it.live("limits actual streamed response bytes without relying on Content-Length", () =>
    vendor(
      {
        response: () => {
          let chunks = 0
          return new Response(
            new ReadableStream<Uint8Array>({
              pull(controller) {
                if (chunks++ === 33) {
                  controller.close()
                  return
                }
                controller.enqueue(new Uint8Array(1024 * 1024).fill(32))
              },
            }),
          )
        },
      },
      async () => {
        const error = await AudioChat.synthesize(speech()).catch((error: unknown) => error)
        expect(error).toMatchObject({ status: 502 })
        expect(String(error)).toContain("response exceeds")
      },
    ),
  )
})
