import { afterEach, describe, expect, test } from "bun:test"
import { Effect } from "effect"
import z from "zod"
import { Instance } from "../../src/project/instance"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Provider } from "../../src/provider"
import { synthesize, transcribe } from "../../src/audio/service"
import { tmpdir } from "../fixture/fixture"

afterEach(() => Instance.disposeAll())

function rejected(promise: Promise<unknown>) {
  return promise.then(
    () => {
      throw new Error("Expected the audio request to fail")
    },
    (error: unknown) => error,
  )
}

const bytes = Buffer.from("RIFF....WAVEaudio-fixture")
type Seen = { path: string; headers: Headers; body: Record<string, unknown> }

async function fixture<T>(
  fn: (seen: Seen[]) => Promise<T>,
  options: {
    npm?: string
    handle?: (request: Request, body: Record<string, unknown>) => Response | Promise<Response>
  } = {},
) {
  const seen: Seen[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const body = z.record(z.string(), z.unknown()).parse(await request.json())
      seen.push({ path: new URL(request.url).pathname, headers: request.headers, body })
      if (options.handle) return options.handle(request, body)
      if (new URL(request.url).pathname === "/v1/audio/speech") {
        return new Response(bytes, { headers: { "content-type": "audio/wav" } })
      }
      return Response.json({
        choices: [
          {
            index: 0,
            message: body.audio
              ? { role: "assistant", content: "", audio: { data: bytes.toString("base64") } }
              : { role: "assistant", content: "This is the transcript." },
            finish_reason: "stop",
          },
        ],
      })
    },
  })
  try {
    await using tmp = await tmpdir({
      config: {
        enabled_providers: ["audio"],
        provider: {
          audio: {
            npm: options.npm ?? "@ai-sdk/openai-compatible",
            options: {
              apiKey: "local-vendor-key",
              baseURL: `http://127.0.0.1:${server.port}/v1`,
              headers: { "x-provider-header": "provider-value" },
            },
            models: {
              tts: {
                id: "wire-tts",
                modalities: { input: ["text"], output: ["audio"] },
                headers: { "x-model-header": "model-value" },
              },
              asr: {
                id: "wire-asr",
                modalities: { input: ["audio"], output: ["text"] },
                headers: { "x-model-header": "asr-value" },
              },
              multimodal: { modalities: { input: ["text", "audio"], output: ["text"] } },
              chat: { modalities: { input: ["text"], output: ["text"] } },
            },
          },
        },
      },
    })
    return await Instance.provide({ directory: tmp.path, fn: () => fn(seen) })
  } finally {
    await server.stop(true)
  }
}

const speech = (req: Parameters<typeof synthesize>[0]["req"], abort = new AbortController().signal) =>
  synthesize({ req, abort })
const transcription = (req: Parameters<typeof transcribe>[0]["req"], abort = new AbortController().signal) =>
  transcribe({ req, audio: bytes, mediaType: "audio/wav", abort })

describe("audio service", () => {
  test("raw TTS sends the API model, preset, instructions and model headers", () =>
    fixture(async (seen) => {
      const result = await speech({
        model: "audio/tts",
        input: "Read this.",
        voice: "alloy",
        instructions: "Speak softly.",
      })
      expect(Buffer.from(result.audio)).toEqual(bytes)
      expect(result.contentType).toBe("audio/wav")
      expect(seen).toHaveLength(1)
      expect(seen[0].path).toBe("/v1/chat/completions")
      expect(seen[0].body).toEqual({
        model: "wire-tts",
        messages: [
          { role: "user", content: "Speak softly." },
          { role: "assistant", content: "Read this." },
        ],
        audio: { format: "wav", voice: "alloy" },
      })
      expect(seen[0].headers.get("authorization")).toBe("Bearer local-vendor-key")
      expect(seen[0].headers.get("x-provider-header")).toBe("provider-value")
      expect(seen[0].headers.get("x-model-header")).toBe("model-value")
    }))

  test("native TTS sends supported options through the real speech factory", () =>
    fixture(
      async (seen) => {
        const result = await speech({
          model: "audio/tts",
          input: "Native speech.",
          voice: "alloy",
          response_format: "wav",
          speed: 1.25,
          instructions: "Speak softly.",
        })
        expect(Buffer.from(result.audio)).toEqual(bytes)
        expect(result.contentType).toBe("audio/wav")
        expect(seen).toHaveLength(1)
        expect(seen[0].path).toBe("/v1/audio/speech")
        expect(seen[0].body).toMatchObject({
          model: "wire-tts",
          input: "Native speech.",
          voice: "alloy",
          response_format: "wav",
          speed: 1.25,
          instructions: "Speak softly.",
        })
        expect(seen[0].headers.get("authorization")).toBe("Bearer local-vendor-key")
        expect(seen[0].headers.get("x-provider-header")).toBe("provider-value")
        expect(seen[0].headers.get("x-model-header")).toBe("model-value")
      },
      { npm: "@ai-sdk/openai" },
    ))

  test("speech factory caches separately from the language factory", () =>
    fixture(
      async () => {
        await AppRuntime.runPromise(
          Effect.gen(function* () {
            const provider = yield* Provider.Service
            const parsed = Provider.parseModel("audio/tts")
            const model = yield* provider.getModel(parsed.providerID, parsed.modelID)
            const first = yield* provider.getSpeech(model)
            const second = yield* provider.getSpeech(model)
            const language = yield* provider.getLanguage(model)
            expect(first).toBe(second)
            expect(first).not.toBe(language)
            expect(first.modelId).toBe("wire-tts")
          }),
        )
      },
      { npm: "@ai-sdk/openai" },
    ))

  test("dedicated ASR sends audio without an instruction or thinking settings", () =>
    fixture(async (seen) => {
      expect(await transcription({ model: "audio/asr", language: "en" })).toEqual({ text: "This is the transcript." })
      expect(seen).toHaveLength(1)
      expect(seen[0].body).toEqual({
        model: "wire-asr",
        messages: [
          {
            role: "user",
            content: [
              { type: "input_audio", input_audio: { data: `data:audio/wav;base64,${bytes.toString("base64")}` } },
            ],
          },
        ],
        asr_options: { language: "en" },
      })
      expect(seen[0].headers.get("x-model-header")).toBe("asr-value")
    }))

  test("multimodal ASR adds an instruction and disables thinking", () =>
    fixture(async (seen) => {
      expect((await transcription({ model: "audio/multimodal", language: "en" })).text).toBe("This is the transcript.")
      expect(seen[0].body).toMatchObject({ model: "multimodal", thinking: { type: "disabled" }, max_tokens: 4096 })
      expect(seen[0].body).toMatchObject({
        messages: [
          {
            content: [
              { type: "input_audio" },
              { type: "text", text: expect.stringMatching(/Transcribe the audio verbatim.*The audio is in en\./) },
            ],
          },
        ],
      })
      expect(seen[0].body.asr_options).toBeUndefined()
    }))

  test.each([{ speed: 1.1 }, { provider_options: { unsupported: true } }, { stream_format: "sse" as const }])(
    "rejects unsupported raw speech options before sending: %j",
    (extra) =>
      fixture(async (seen) => {
        expect(await rejected(speech({ model: "audio/tts", input: "Hello.", ...extra }))).toMatchObject({ status: 400 })
        expect(seen).toHaveLength(0)
      }),
  )

  test("native TTS also refuses SSE before sending", () =>
    fixture(
      async (seen) => {
        expect(await rejected(speech({ model: "audio/tts", input: "Hello.", stream_format: "sse" }))).toMatchObject({
          status: 400,
        })
        expect(seen).toHaveLength(0)
      },
      { npm: "@ai-sdk/openai" },
    ))

  test("native TTS refuses an opaque option bag instead of silently discarding it", () =>
    fixture(
      async (seen) => {
        expect(
          await rejected(speech({ model: "audio/tts", input: "Hello.", provider_options: { speed: 1.5 } })),
        ).toMatchObject({ status: 400 })
        expect(seen).toHaveLength(0)
      },
      { npm: "@ai-sdk/openai" },
    ))

  test.each([{ input: "" }, { speed: 9 }])("direct service calls validate speech fields: %j", (extra) =>
    fixture(
      async (seen) => {
        expect(await rejected(speech({ model: "audio/tts", input: "Hello.", ...extra }))).toMatchObject({ status: 400 })
        expect(seen).toHaveLength(0)
      },
      { npm: "@ai-sdk/openai" },
    ),
  )

  test.each([{ prompt: "bias" }, { temperature: 0 }, { response_format: "verbose_json" as const }])(
    "rejects unsupported ASR options before sending: %j",
    (extra) =>
      fixture(async (seen) => {
        expect(await rejected(transcription({ model: "audio/asr", ...extra }))).toMatchObject({ status: 400 })
        expect(seen).toHaveLength(0)
      }),
  )

  test.each(["tts", "/tts", "audio/", "standard"])("requires an explicit provider/model: %s", (model) =>
    fixture(async (seen) => {
      expect(await rejected(speech({ model, input: "Hello." }))).toMatchObject({ status: 400 })
      expect(seen).toHaveLength(0)
    }),
  )

  test("unknown and unavailable models cannot be resolved implicitly", () =>
    fixture(async (seen) => {
      expect(await rejected(speech({ model: "audio/missing", input: "Hello." }))).toMatchObject({ status: 404 })
      expect(await rejected(speech({ model: "other/tts", input: "Hello." }))).toMatchObject({ status: 404 })
      expect(seen).toHaveLength(0)
    }))

  test("wrong model modalities are rejected before sending", () =>
    fixture(async (seen) => {
      expect(await rejected(speech({ model: "audio/chat", input: "Hello." }))).toMatchObject({ status: 400 })
      expect(await rejected(transcription({ model: "audio/chat" }))).toMatchObject({ status: 400 })
      expect(await rejected(transcription({ model: "audio/tts" }))).toMatchObject({ status: 400 })
      expect(seen).toHaveLength(0)
    }))

  test("non-chat-shaped multimodal ASR is unsupported without a general chat proxy", () =>
    fixture(
      async (seen) => {
        expect(await rejected(transcription({ model: "audio/multimodal" }))).toMatchObject({ status: 501 })
        expect(seen).toHaveLength(0)
      },
      { npm: "@ai-sdk/anthropic" },
    ))

  test.each(["@ai-sdk/openai-compatible", "@ai-sdk/openai"])(
    "upstream failure via %s is sanitized without retrying",
    (npm) =>
      fixture(
        async (seen) => {
          const error = await speech({ model: "audio/tts", input: "Hello." }).catch((error: unknown) => error)
          expect(error).toMatchObject({ status: 502 })
          expect(error).toBeInstanceOf(Error)
          if (error instanceof Error) expect(error.message).not.toContain("secret-from-response")
          expect(seen).toHaveLength(1)
        },
        {
          npm,
          handle: () =>
            Response.json({ error: { message: "secret-from-response", type: "rate_limit_error" } }, { status: 429 }),
        },
      ),
  )

  test("reasoning content is never passed off as a transcript", () =>
    fixture(
      async () => {
        expect(await rejected(transcription({ model: "audio/multimodal" }))).toMatchObject({ status: 502 })
      },
      {
        handle: () =>
          Response.json({ choices: [{ message: { content: null, reasoning_content: "private reasoning" } }] }),
      },
    ))

  test.each(["@ai-sdk/openai-compatible", "@ai-sdk/openai"])("aborted TTS sends no request via %s", (npm) =>
    fixture(
      async (seen) => {
        const controller = new AbortController()
        controller.abort()
        expect(await rejected(speech({ model: "audio/tts", input: "Hello." }, controller.signal))).toMatchObject({
          name: "AbortError",
        })
        expect(seen).toHaveLength(0)
      },
      { npm },
    ),
  )

  test.each(["@ai-sdk/openai-compatible", "@ai-sdk/openai"])(
    "cancellation interrupts an in-flight TTS request via %s",
    (npm) => {
      const received = Promise.withResolvers<void>()
      const release = Promise.withResolvers<void>()
      return fixture(
        async (seen) => {
          const controller = new AbortController()
          const result = speech({ model: "audio/tts", input: "Hello." }, controller.signal)
          try {
            await Promise.race([received.promise, result])
            controller.abort()
            expect(await rejected(result)).toMatchObject({ name: "AbortError" })
            expect(seen).toHaveLength(1)
          } finally {
            release.resolve()
          }
        },
        {
          npm,
          handle: async () => {
            received.resolve()
            await release.promise
            return new Response(bytes, { headers: { "content-type": "audio/wav" } })
          },
        },
      )
    },
  )

  test("speech SDK caches and endpoints remain scoped to each instance", () =>
    fixture(
      async (firstSeen) => {
        const first = await AppRuntime.runPromise(
          Effect.gen(function* () {
            const provider = yield* Provider.Service
            const parsed = Provider.parseModel("audio/tts")
            return yield* provider.getSpeech(yield* provider.getModel(parsed.providerID, parsed.modelID))
          }),
        )
        await fixture(
          async (secondSeen) => {
            const second = await AppRuntime.runPromise(
              Effect.gen(function* () {
                const provider = yield* Provider.Service
                const parsed = Provider.parseModel("audio/tts")
                return yield* provider.getSpeech(yield* provider.getModel(parsed.providerID, parsed.modelID))
              }),
            )
            expect(second).not.toBe(first)
            await speech({ model: "audio/tts", input: "Second instance." })
            expect(secondSeen).toHaveLength(1)
            expect(firstSeen).toHaveLength(0)
          },
          { npm: "@ai-sdk/openai" },
        )
        await speech({ model: "audio/tts", input: "First instance." })
        expect(firstSeen).toHaveLength(1)
      },
      { npm: "@ai-sdk/openai" },
    ))
})
