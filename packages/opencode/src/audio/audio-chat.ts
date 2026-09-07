import { Buffer } from "node:buffer"
import { Effect } from "effect"
import { AppRuntime } from "@/effect/app-runtime"
import { Provider } from "@/provider"
import { Log } from "@/util"

const log = Log.create({ service: "audio.chat" })
const MAX_RESPONSE_BYTES = 32 * 1024 * 1024

function fields(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown) {
  return typeof value === "string" ? value : undefined
}

export class AudioChatError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function endpoint(providerID: string, abort: AbortSignal, modelHeaders?: Record<string, string>) {
  const info = await AppRuntime.runPromise(
    Effect.gen(function* () {
      const providers = yield* (yield* Provider.Service).list()
      return Object.entries(providers).find(([id]) => id === providerID)?.[1]
    }),
    { signal: abort },
  ).catch((error: unknown) => {
    abort.throwIfAborted()
    throw error
  })
  if (!info) throw new AudioChatError(404, `Unknown provider \`${providerID}\``)

  const options: Record<string, unknown> = info.options ?? {}
  const base = text(options.baseURL)
  // The raw transport never guesses a public endpoint for configured credentials.
  if (!base) throw new AudioChatError(501, `Provider \`${providerID}\` has no baseURL configured for audio over chat`)
  const key = text(options.apiKey) ?? info.key
  const headers = new Headers({
    "content-type": "application/json",
    ...(key ? { authorization: `Bearer ${key}` } : {}),
  })
  if (fields(options.headers)) {
    Object.entries(options.headers).forEach(([name, value]) => {
      if (typeof value === "string") headers.set(name, value)
    })
  }
  Object.entries(modelHeaders ?? {}).forEach(([name, value]) => headers.set(name, value))
  return { url: `${base.replace(/\/$/, "")}/chat/completions`, headers }
}

async function read(response: Response) {
  if (!response.body) throw new AudioChatError(502, "upstream returned an empty response body")
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.byteLength
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        throw new AudioChatError(502, "upstream audio response exceeds 32 MiB")
      }
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }
  const value: unknown = await Promise.resolve()
    .then(() => JSON.parse(Buffer.concat(chunks).toString("utf8")))
    .catch(() => undefined)
  if (!fields(value)) throw new AudioChatError(502, "upstream returned a body that is not a JSON object")
  return value
}

async function post(providerID: string, body: unknown, abort: AbortSignal, headers?: Record<string, string>) {
  abort.throwIfAborted()
  const target = await endpoint(providerID, abort, headers)
  abort.throwIfAborted()
  const response = await fetch(target.url, {
    method: "POST",
    headers: target.headers,
    body: JSON.stringify(body),
    signal: abort,
  }).catch(() => {
    abort.throwIfAborted()
    throw new AudioChatError(502, "upstream audio request failed")
  })
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    log.error("upstream audio call failed", { providerID, status: response.status })
    // An upstream body may echo credentials, prompts or transcripts.
    throw new AudioChatError(502, `upstream audio request returned HTTP ${response.status}`)
  }
  return read(response).catch((error: unknown) => {
    abort.throwIfAborted()
    if (error instanceof AudioChatError) throw error
    throw new AudioChatError(502, "upstream audio response could not be read")
  })
}

function firstMessage(body: Record<string, unknown>) {
  const choices = body.choices
  if (!Array.isArray(choices) || choices.length === 0) throw new AudioChatError(502, "upstream returned no choices")
  const choice: unknown = choices[0]
  if (!fields(choice) || !fields(choice.message))
    throw new AudioChatError(502, "upstream returned a choice with no message")
  return choice.message
}

/** Audio-in-chat synthesis places the target text in an assistant message. */
export async function synthesize(input: {
  providerID: string
  modelID: string
  text: string
  voice?: string
  format?: string
  instructions?: string
  headers?: Record<string, string>
  abort: AbortSignal
}) {
  const body = await post(
    input.providerID,
    {
      model: input.modelID,
      messages: [
        ...(input.instructions ? [{ role: "user", content: input.instructions }] : []),
        { role: "assistant", content: input.text },
      ],
      audio: { format: input.format ?? "wav", ...(input.voice ? { voice: input.voice } : {}) },
    },
    input.abort,
    input.headers,
  )
  const audio = firstMessage(body).audio
  if (!fields(audio)) throw new AudioChatError(502, "upstream returned no audio in message.audio")
  const data = text(audio.data)
  if (!data) throw new AudioChatError(502, "upstream returned an empty audio payload")
  const bytes = Buffer.from(data, "base64")
  // Buffer.from tolerates invalid characters and can silently return empty bytes.
  // A canonical round trip also accepts unpadded base64 without accepting garbage.
  if (!bytes.byteLength || bytes.toString("base64").replace(/=+$/, "") !== data.replace(/={1,2}$/, ""))
    throw new AudioChatError(502, "upstream returned invalid base64 audio")
  return { audio: bytes, format: input.format ?? "wav" }
}

/** Dedicated ASR sends only audio; multimodal models also need an instruction. */
export async function transcribe(input: {
  providerID: string
  modelID: string
  audio: Uint8Array
  mediaType: string
  language?: string
  instruction?: string
  disableThinking?: boolean
  headers?: Record<string, string>
  abort: AbortSignal
}) {
  const body = await post(
    input.providerID,
    {
      model: input.modelID,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: { data: `data:${input.mediaType};base64,${Buffer.from(input.audio).toString("base64")}` },
            },
            ...(input.instruction ? [{ type: "text", text: input.instruction }] : []),
          ],
        },
      ],
      ...(input.instruction ? {} : input.language ? { asr_options: { language: input.language } } : {}),
      ...(input.disableThinking ? { thinking: { type: "disabled" } } : {}),
      ...(input.instruction ? { max_tokens: 4096 } : {}),
    },
    input.abort,
    input.headers,
  )
  const message = firstMessage(body)
  const content = text(message.content)
  if (content) return { text: content }
  if (text(message.reasoning_content) != null)
    throw new AudioChatError(
      502,
      "upstream returned reasoning instead of transcript content; use a dedicated transcription model",
    )
  throw new AudioChatError(502, "upstream returned no transcript text")
}

export * as AudioChat from "./audio-chat"
