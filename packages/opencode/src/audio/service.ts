import { experimental_generateSpeech as generateSpeech } from "ai"
import { Effect } from "effect"
import { AppRuntime } from "../effect/app-runtime"
import { Provider } from "../provider"
import * as SDK from "../llm-server/sdk"
import { audioRejection } from "./input"
import { AudioChat, AudioChatError } from "./audio-chat"
import {
  SpeechRequest,
  TranscriptionRequest,
  speechContentType,
  speechUnsupported,
  transcriptionUnsupported,
  transcriptionMediaType,
} from "./protocol"

export class RequestError extends Error {
  constructor(
    readonly status: 400 | 404 | 413 | 501 | 502,
    message: string,
    readonly type = "invalid_request_error",
    readonly code?: string,
  ) {
    super(message)
    this.name = "RequestError"
  }
}

function failed(error: unknown): never {
  if (error instanceof RequestError) throw error
  if (error instanceof Error && error.name === "AbortError") throw error
  if (error instanceof Provider.ModelNotFoundError) {
    throw new RequestError(404, "Model is not available in this instance", "invalid_request_error", "model_not_found")
  }
  // AudioChat errors contain locally generated messages only. SDK errors can
  // contain credentials or provider response bodies and must not be forwarded.
  if (error instanceof AudioChatError) {
    if (error.status === 400 || error.status === 404 || error.status === 501 || error.status === 502) {
      throw new RequestError(error.status, error.message, error.status === 502 ? "api_error" : "invalid_request_error")
    }
  }
  throw new RequestError(502, "Audio provider request failed", "api_error")
}

async function resolveModel(ref: string, kind: "speech" | "transcription", abort: AbortSignal) {
  const parsed = Provider.parseModel(ref)
  if (!parsed.providerID || !parsed.modelID) {
    throw new RequestError(400, "model must be an explicit provider/model identifier")
  }
  const model = await AppRuntime.runPromise(
    Effect.gen(function* () {
      return yield* (yield* Provider.Service).getModel(parsed.providerID, parsed.modelID)
    }),
    { signal: abort },
  ).catch((error) => {
    abort.throwIfAborted()
    return failed(error)
  })
  if (
    Provider.modelKind(model) !== kind &&
    !(kind === "transcription" && Provider.modelKind(model) === "language" && model.capabilities.input.audio)
  ) {
    throw new RequestError(
      400,
      `Model does not support ${kind === "speech" ? "speech synthesis" : "audio transcription"}`,
    )
  }
  return model
}

/** Shared by discovery and execution; resolving a factory does not generate audio. */
export async function resolveTransport(model: Provider.Model, kind: "speech" | "transcription", abort: AbortSignal) {
  abort.throwIfAborted()
  if (kind === "speech") {
    const speech = await AppRuntime.runPromise(
      Effect.gen(function* () {
        return yield* (yield* Provider.Service).getSpeech(model)
      }),
      { signal: abort },
    ).catch((error) => {
      abort.throwIfAborted()
      if (error instanceof Provider.SpeechUnsupportedError) return undefined
      return failed(error)
    })
    if (speech) return { type: "native" as const, speech }
  }
  if (!["@ai-sdk/openai", "@ai-sdk/azure", "@ai-sdk/openai-compatible"].includes(model.api.npm)) {
    if (
      kind === "transcription" &&
      Provider.modelKind(model) === "language" &&
      model.capabilities.input.audio &&
      model.capabilities.output.text &&
      ["@ai-sdk/google", "@ai-sdk/google-vertex"].includes(model.api.npm)
    ) {
      const resolved = await SDK.resolve(model, abort).catch((error) => {
        abort.throwIfAborted()
        return failed(error)
      })
      // Probe only the factory/adapter, never a generation request. Actual MIME
      // and byte limits are checked with the same gate during execution.
      if (!audioRejection(model, resolved.language, [{ mediaType: "audio/wav", bytes: 1 }]))
        return { type: "sdk" as const, resolved }
    }
    throw new RequestError(
      501,
      `This provider does not support audio-over-chat ${kind}`,
      "invalid_request_error",
      "unsupported_capability",
    )
  }
  const provider = await AppRuntime.runPromise(
    Effect.gen(function* () {
      return yield* (yield* Provider.Service).getProvider(model.providerID)
    }),
    { signal: abort },
  ).catch((error) => {
    abort.throwIfAborted()
    return failed(error)
  })
  const base = provider?.options.baseURL
  const url = typeof base === "string" && base === base.trim() && URL.canParse(base) ? new URL(base) : undefined
  if (!url || !["http:", "https:"].includes(url.protocol) || url.search || url.hash || url.username || url.password) {
    throw new RequestError(
      501,
      "Audio over chat requires an explicit HTTP(S) baseURL without credentials, query or fragment",
      "invalid_request_error",
      "unsupported_capability",
    )
  }
  return { type: "chat" as const }
}

export async function synthesize(input: {
  req: SpeechRequest
  abort: AbortSignal
}): Promise<{ audio: Uint8Array; contentType: string }> {
  const parsed = SpeechRequest.safeParse(input.req)
  if (!parsed.success) throw new RequestError(400, "Invalid speech request")
  const rejection = speechUnsupported(parsed.data)
  if (rejection) throw new RequestError(400, rejection)
  input.abort.throwIfAborted()
  const model = await resolveModel(parsed.data.model, "speech", input.abort)
  const transport = await resolveTransport(model, "speech", input.abort)
  if (transport.type === "chat") {
    if (parsed.data.speed !== undefined)
      throw new RequestError(400, "speed is not supported by this audio-over-chat provider")
    const result = await AudioChat.synthesize({
      providerID: model.providerID,
      modelID: model.api.id,
      text: parsed.data.input,
      voice: parsed.data.voice,
      format: parsed.data.response_format,
      instructions: parsed.data.instructions,
      headers: model.headers,
      abort: input.abort,
    }).catch(failed)
    return { audio: result.audio, contentType: speechContentType({ requested: result.format }) }
  }

  if (transport.type !== "native") throw new RequestError(501, "Unsupported speech transport")
  const result = await generateSpeech({
    model: transport.speech,
    text: parsed.data.input,
    voice: parsed.data.voice,
    outputFormat: parsed.data.response_format,
    instructions: parsed.data.instructions,
    speed: parsed.data.speed,
    headers: model.headers,
    maxRetries: 0,
    abortSignal: input.abort,
  }).catch(failed)
  return {
    audio: result.audio.uint8Array,
    contentType: speechContentType({ reported: result.audio.mediaType, requested: parsed.data.response_format }),
  }
}

export async function transcribe(input: {
  req: TranscriptionRequest
  audio: Uint8Array
  mediaType: string
  abort: AbortSignal
}): Promise<{ text: string; mode?: string }> {
  const parsed = TranscriptionRequest.safeParse(input.req)
  if (!parsed.success) throw new RequestError(400, "Invalid transcription request")
  const rejection = transcriptionUnsupported(parsed.data)
  if (rejection) throw new RequestError(400, rejection)
  input.abort.throwIfAborted()
  const model = await resolveModel(parsed.data.model, "transcription", input.abort)
  const transport = await resolveTransport(model, "transcription", input.abort)
  if (Provider.modelKind(model) === "language") {
    const language =
      parsed.data.language && parsed.data.language !== "auto" ? ` The audio is in ${parsed.data.language}.` : ""
    const instruction = `Transcribe the audio verbatim.${language} Output only the transcript, with no commentary, labels, or quotation marks.`
    if (transport.type === "sdk") {
      const mediaType = transcriptionMediaType({ reported: input.mediaType })
      if (!mediaType) throw new RequestError(400, "Unsupported transcription audio format")
      const rejection = audioRejection(model, transport.resolved.language, [
        { mediaType, bytes: input.audio.byteLength },
      ])
      if (rejection) throw new RequestError(400, rejection)
      const controller = new AbortController()
      const abort = AbortSignal.any([input.abort, controller.signal])
      try {
        const cap = Number.isSafeInteger(model.limit.output) && model.limit.output > 0 ? model.limit.output : 4096
        const result = await SDK.start({
          resolved: transport.resolved,
          settings: { max_tokens: Math.min(4096, cap) },
          outputCap: cap,
          messages: () => [
            {
              role: "user",
              content: [
                { type: "text", text: instruction },
                { type: "file", data: input.audio, mediaType },
              ],
            },
          ],
          abort,
        })
        const output = await SDK.collect(result, controller, abort)
        abort.throwIfAborted()
        if (output.finishReason !== "stop" || !output.text.trim() || output.toolCalls.length)
          throw new Error("Incomplete transcription")
        return { text: output.text }
      } catch (error) {
        input.abort.throwIfAborted()
        return failed(error)
      } finally {
        controller.abort()
      }
    }
    return AudioChat.transcribe({
      providerID: model.providerID,
      modelID: model.api.id,
      audio: input.audio,
      mediaType: input.mediaType,
      instruction,
      disableThinking: true,
      headers: model.headers,
      abort: input.abort,
    }).catch(failed)
  }
  return AudioChat.transcribe({
    providerID: model.providerID,
    modelID: model.api.id,
    audio: input.audio,
    mediaType: input.mediaType,
    language: parsed.data.language,
    headers: model.headers,
    abort: input.abort,
  }).catch(failed)
}
