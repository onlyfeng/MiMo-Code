import z from "zod"
import type { LanguageModel } from "ai"
import type { Provider } from "../provider"
import { ModelCapability } from "../provider/capability-registry"
import { transcriptionMediaType } from "./protocol"

const MAX_AUDIO = 20 * 1024 * 1024
const FORMAT = z.enum(["wav", "mp3", "mpeg", "mpga", "m4a", "mp4", "flac", "ogg", "webm"])
export type AudioFormat = z.infer<typeof FORMAT>
const DATA_URL = /^data:(audio\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/

/** Inline data only: never give the SDK an audio URL it could download. */
export function inputAudio(input: { data: string; format?: AudioFormat }) {
  const match = DATA_URL.exec(input.data)
  const declared = input.format ? transcriptionMediaType({ filename: `audio.${input.format}` }) : undefined
  const mediaType = match ? transcriptionMediaType({ reported: match[1] }) : declared
  const data = match ? match[2] : input.data
  if (!mediaType || (declared && declared !== mediaType)) return undefined
  if (data.length > Math.ceil(MAX_AUDIO / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return undefined
  const bytes = Buffer.from(data, "base64")
  if (!bytes.length || bytes.length > MAX_AUDIO || bytes.toString("base64") !== data) return undefined
  return { data, mediaType, bytes: bytes.length }
}

export const InputAudio = z
  .strictObject({ data: z.string().min(1), format: FORMAT.optional() })
  .refine(
    (input) => inputAudio(input) !== undefined,
    "requires canonical base64 audio of at most 20 MiB and a matching format or audio data URL",
  )

/** API-only refinement: the sampling registry's package-level policy stays intact. */
export function audioRejection(
  model: Provider.Model,
  language: LanguageModel,
  audio: { mediaType: string; bytes: number }[],
) {
  if (!audio.length) return undefined
  if (audio.some((part) => !Number.isSafeInteger(part.bytes) || part.bytes <= 0 || part.bytes > MAX_AUDIO))
    return "Input audio must contain 1 byte to 20 MiB"
  if (!model.capabilities.input.audio) return "This model does not support audio input"
  if (typeof language === "string") return "This audio transport is not supported"
  if (["@ai-sdk/openai", "@ai-sdk/azure"].includes(model.api.npm)) {
    if (!language.provider.endsWith(".chat")) return "This model transport does not support audio input"
    const declaration = ModelCapability.adapterDeclaration("@ai-sdk/openai-compatible").audio
    return audio.some((part) => declaration.mimeTypes !== "any" && !declaration.mimeTypes.includes(part.mediaType))
      ? "This model transport does not support the audio format"
      : undefined
  }
  // Google Interactions has a separate serializer; this API uses the verified
  // GenerateContent adapter. Compatible completion models are not chat models.
  if (
    (model.api.npm === "@ai-sdk/google" && language.provider.endsWith(".interactions")) ||
    (model.api.npm === "@ai-sdk/openai-compatible" && !language.provider.endsWith(".chat")) ||
    (model.api.npm === "@ai-sdk/google-vertex" && language.provider !== "google.vertex.chat")
  )
    return "This model transport does not support audio input"
  const rejection = ModelCapability.rejectionFor(
    model,
    audio.map((part) => ({ modality: "audio", mimeType: part.mediaType, bytes: part.bytes })),
  )
  return rejection ? `This model ${ModelCapability.describeRejection(rejection)}` : undefined
}
