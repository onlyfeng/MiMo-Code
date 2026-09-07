import { describe, expect, test } from "bun:test"
import {
  SpeechRequest,
  TranscriptionRequest,
  speechUnsupported,
  transcriptionUnsupported,
  speechContentType,
  transcriptionMediaType,
} from "../../src/audio/protocol"

describe("audio request protocol", () => {
  test("accepts preset voices and bounded text with SDK speech options", () => {
    const input = {
      model: "provider/tts",
      input: "a".repeat(4096),
      voice: "Chloe",
      response_format: "wav" as const,
      speed: 1.5,
      instructions: "calm",
      provider_options: { vendor: { style: "neutral" } },
    }
    expect(SpeechRequest.parse(input)).toEqual(input)
  })

  test("rejects oversized or empty text, invalid formats and non-preset voice objects", () => {
    for (const extra of [
      { input: "" },
      { input: "a".repeat(4097) },
      { instructions: "a".repeat(4097) },
      { voice: "" },
      { voice: { type: "clone", audio: "sample" } },
      { voice: { type: "design", description: "calm" } },
      { speed: 0.1 },
      { speed: 5 },
      { response_format: "ogg" },
      { voice_clone: "sample" },
    ]) {
      expect(SpeechRequest.safeParse({ model: "provider/tts", input: "hello", ...extra }).success).toBe(false)
    }
  })

  test("refuses event streams while accepting complete audio responses", () => {
    const base = { model: "provider/tts", input: "hello" }
    expect(speechUnsupported(SpeechRequest.parse({ ...base, stream_format: "sse" }))).toContain("stream_format")
    expect(speechUnsupported(SpeechRequest.parse({ ...base, stream_format: "audio" }))).toBeUndefined()
    expect(speechUnsupported(SpeechRequest.parse(base))).toBeUndefined()
  })

  test("limits voices to bounded preset names without URLs or sample payloads", () => {
    for (const voice of ["Chloe", "中文 音色", "af_heart-v2.0", "a".repeat(128)]) {
      expect(SpeechRequest.safeParse({ model: "provider/tts", input: "hello", voice }).success).toBe(true)
    }
    for (const voice of [
      "a".repeat(129),
      "data:audio/wav;base64,AQID",
      "https://example.test/sample.wav",
      "//example.test/sample.wav",
      "AQI=",
      "+/",
    ]) {
      expect(SpeechRequest.safeParse({ model: "provider/tts", input: "hello", voice }).success).toBe(false)
    }
  })

  test("prefers detected speech media type over the requested format", () => {
    expect(speechContentType({ reported: "audio/flac", requested: "mp3" })).toBe("audio/flac")
    expect(speechContentType({ reported: "audio/mpeg", requested: "flac" })).toBe("audio/mpeg")
  })

  test("refuses provider options and bounds synthesis instructions", () => {
    const base = { model: "provider/tts", input: "hello" }
    expect(speechUnsupported(SpeechRequest.parse({ ...base, provider_options: {} }))).toContain("provider_options")
    expect(SpeechRequest.safeParse({ ...base, instructions: "a".repeat(4096) }).success).toBe(true)
    expect(SpeechRequest.safeParse({ ...base, instructions: "a".repeat(4097) }).success).toBe(false)
  })

  test("uses the requested format when the SDK reports its undetected mp3 fallback", () => {
    for (const [requested, expected] of Object.entries({
      mp3: "audio/mpeg",
      opus: "audio/opus",
      aac: "audio/aac",
      flac: "audio/flac",
      wav: "audio/wav",
      pcm: "audio/pcm",
      unknown: "application/octet-stream",
    })) {
      expect(speechContentType({ reported: "audio/mp3", requested })).toBe(expected)
    }
    expect(speechContentType({ reported: "audio/mp3" })).toBe("audio/mpeg")
    expect(speechContentType({})).toBe("audio/mpeg")
  })

  test("accepts json and text transcription with an optional language hint", () => {
    for (const response_format of [undefined, "json", "text"] as const) {
      const input = { model: "provider/asr", language: "zh", response_format }
      expect(TranscriptionRequest.parse(input)).toEqual(input)
      expect(transcriptionUnsupported(TranscriptionRequest.parse(input))).toBeUndefined()
    }
    expect(TranscriptionRequest.safeParse({ model: "" }).success).toBe(false)
    expect(TranscriptionRequest.safeParse({ model: "provider/asr", unsupported: true }).success).toBe(false)
  })

  test("refuses unsupported transcription options even when their value is empty or zero", () => {
    for (const extra of [
      { prompt: "" },
      { temperature: 0 },
      { response_format: "verbose_json" },
      { response_format: "srt" },
      { response_format: "vtt" },
    ]) {
      expect(transcriptionUnsupported(TranscriptionRequest.parse({ model: "provider/asr", ...extra }))).toBeDefined()
    }
  })

  test("normalizes upload MIME aliases before forwarding audio", () => {
    for (const [reported, expected] of Object.entries({
      "Audio/X-WAV; charset=binary": "audio/wav",
      "audio/wave": "audio/wav",
      "audio/vnd.wave": "audio/wav",
      "audio/x-mpeg": "audio/mpeg",
      "audio/mp3": "audio/mpeg",
      "audio/x-m4a": "audio/mp4",
      "audio/x-flac": "audio/flac",
    })) {
      expect(transcriptionMediaType({ reported, filename: "other.mp3" })).toBe(expected)
    }
  })

  test("uses known file extensions when MIME is missing and declines unknown containers", () => {
    expect(transcriptionMediaType({ reported: "application/octet-stream", filename: "VOICE.WAV" })).toBe("audio/wav")
    expect(transcriptionMediaType({ filename: "voice.m4a" })).toBe("audio/mp4")
    expect(transcriptionMediaType({ filename: "voice.webm" })).toBe("audio/webm")
    expect(transcriptionMediaType({ reported: "audio/ogg", filename: "voice.wav" })).toBe("audio/ogg")
    expect(transcriptionMediaType({ filename: "voice.bin" })).toBeUndefined()
    expect(transcriptionMediaType({})).toBeUndefined()
  })

  test("declines unsupported audio MIME types even when a known extension is supplied", () => {
    expect(transcriptionMediaType({ reported: "audio/unknown" })).toBeUndefined()
    expect(transcriptionMediaType({ reported: "audio/unknown", filename: "voice.wav" })).toBeUndefined()
  })
})
