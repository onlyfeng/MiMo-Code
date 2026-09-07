import z from "zod"

/** OpenAI-shaped speech input, limited to preset voice names. */
export const SpeechRequest = z.strictObject({
  model: z.string().min(1),
  input: z.string().min(1).max(4096),
  voice: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[\p{L}\p{N}_. -]+$/u)
    .optional(),
  response_format: z.enum(["mp3", "opus", "aac", "flac", "wav", "pcm"]).optional(),
  speed: z.number().min(0.25).max(4).optional(),
  instructions: z.string().max(4096).optional(),
  stream_format: z.enum(["sse", "audio"]).optional(),
  provider_options: z.record(z.string(), z.json()).optional(),
})
export type SpeechRequest = z.infer<typeof SpeechRequest>

export function speechUnsupported(req: SpeechRequest): string | undefined {
  if (req.stream_format === "sse") return "stream_format: sse is not supported; audio is returned as one complete body"
  if (req.provider_options !== undefined) return "provider_options is not supported for speech"
  return undefined
}

const SPEECH_MEDIA_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  opus: "audio/opus",
  aac: "audio/aac",
  flac: "audio/flac",
  wav: "audio/wav",
  pcm: "audio/pcm",
}

export function speechContentType(input: { reported?: string; requested?: string }) {
  // The SDK reports audio/mp3 when detection fails; audio/mpeg is a detected mp3.
  if (input.reported && input.reported !== "audio/mp3") return input.reported
  if (input.requested) return SPEECH_MEDIA_TYPES[input.requested] ?? "application/octet-stream"
  return SPEECH_MEDIA_TYPES.mp3
}

/** Non-file fields from the multipart transcription request. */
export const TranscriptionRequest = z.strictObject({
  model: z.string().min(1),
  language: z.string().optional(),
  response_format: z.enum(["json", "text", "verbose_json", "srt", "vtt"]).optional(),
  // Declared so unsupported options are refused, including empty/zero values.
  prompt: z.string().optional(),
  temperature: z.number().optional(),
})
export type TranscriptionRequest = z.infer<typeof TranscriptionRequest>

export function transcriptionUnsupported(req: TranscriptionRequest): string | undefined {
  if (req.prompt != null) return "prompt is not supported by transcription models on this server"
  if (req.temperature != null) return "temperature is not supported for transcription"
  if (req.response_format === "verbose_json" || req.response_format === "srt" || req.response_format === "vtt")
    return `response_format ${req.response_format} is not supported; use json or text`
  return undefined
}

const TRANSCRIBE_MEDIA_TYPES: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  mpeg: "audio/mpeg",
  mpga: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  flac: "audio/flac",
  ogg: "audio/ogg",
  webm: "audio/webm",
}

const MEDIA_TYPE_ALIASES: Record<string, string> = {
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "audio/x-mpeg": "audio/mpeg",
  "audio/mp3": "audio/mpeg",
  "audio/x-m4a": "audio/mp4",
  "audio/x-flac": "audio/flac",
}

export function transcriptionMediaType(input: { reported?: string; filename?: string }) {
  const reported = input.reported?.toLowerCase().split(";")[0]?.trim()
  if (reported) {
    const canonical = MEDIA_TYPE_ALIASES[reported] ?? reported
    if (canonical.startsWith("audio/"))
      return Object.values(TRANSCRIBE_MEDIA_TYPES).includes(canonical) ? canonical : undefined
  }
  const ext = input.filename?.toLowerCase().split(".").pop()
  return ext ? TRANSCRIBE_MEDIA_TYPES[ext] : undefined
}
