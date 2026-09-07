import { createHash, timingSafeEqual } from "node:crypto"
import path from "node:path"
import { Hono } from "hono"
import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { Flag } from "@/flag/flag"
import {
  SpeechRequest,
  TranscriptionRequest,
  speechUnsupported,
  transcriptionUnsupported,
  transcriptionMediaType,
} from "@/audio/protocol"
import { RequestError, synthesize, transcribe } from "@/audio/service"
import { readBody, inInstance } from "./api-request"

export type AudioOptions = { key: string; directory: string }

const MAX_CONCURRENT = 2
const TIMEOUT = 120_000

function failure(c: Context, status: ContentfulStatusCode, message: string, type = "invalid_request_error") {
  c.header("Cache-Control", "no-store")
  return c.json({ error: { message, type, param: null, code: null } }, status)
}

export async function prepareAudio(c: Context, signal: AbortSignal, models?: string[]) {
  const contentType = c.req.header("content-type") ?? ""
  if (c.req.path.endsWith("/speech")) {
    if (contentType.split(";")[0].trim().toLowerCase() !== "application/json")
      return failure(c, 415, "Speech requests require application/json")
    const bytes = await readBody(c.req.raw, signal)
    const value: unknown = await new Response(bytes).json().catch(() => undefined)
    const parsed = SpeechRequest.safeParse(value)
    if (!parsed.success) return failure(c, 400, "Invalid speech request; specify model and input (1–4096 characters)")
    if (models && !models.includes(parsed.data.model)) return failure(c, 403, "Model is outside token scope")
    const unsupported = speechUnsupported(parsed.data)
    if (unsupported) return failure(c, 400, unsupported)
    return async () => {
      signal.throwIfAborted()
      const result = await synthesize({ req: parsed.data, abort: signal })
      signal.throwIfAborted()
      return c.body(Buffer.from(result.audio), 200, {
        "Content-Type": result.contentType,
        "Cache-Control": "no-store",
      })
    }
  }
  if (!/^multipart\/form-data\s*;/i.test(contentType))
    return failure(c, 415, "Transcription requests require multipart/form-data")
  const bytes = await readBody(c.req.raw, signal)
  const form = await new Response(bytes, { headers: { "content-type": contentType } }).formData().catch(() => undefined)
  if (!form) return failure(c, 400, "Invalid multipart body")
  const fields = [...form.entries()]
  if (new Set(fields.map(([key]) => key)).size !== fields.length) return failure(c, 400, "Duplicate multipart fields")
  const file = form.get("file")
  if (!(file instanceof File) || !file.size) return failure(c, 400, "A nonempty audio file is required")
  const parsed = TranscriptionRequest.safeParse(Object.fromEntries(fields.filter(([key]) => key !== "file")))
  if (!parsed.success) return failure(c, 400, "Invalid transcription request fields")
  if (models && !models.includes(parsed.data.model)) return failure(c, 403, "Model is outside token scope")
  const unsupported = transcriptionUnsupported(parsed.data)
  if (unsupported) return failure(c, 400, unsupported)
  const mediaType = transcriptionMediaType({ reported: file.type, filename: file.name })
  if (!mediaType) return failure(c, 400, "Unsupported audio container")
  return async () => {
    signal.throwIfAborted()
    const result = await transcribe({
      req: parsed.data,
      audio: new Uint8Array(await file.arrayBuffer()),
      mediaType,
      abort: signal,
    })
    signal.throwIfAborted()
    c.header("Cache-Control", "no-store")
    return parsed.data.response_format === "text" ? c.text(result.text) : c.json({ text: result.text })
  }
}

/** Mounted before generic auth and instance routing, exclusively under /v1/audio. */
export function createAudio(opts?: AudioOptions) {
  if (opts && !/^[\x21-\x7e]{32,4096}$/.test(opts.key))
    throw new Error("Audio API requires MIMOCODE_AUDIO_API_KEY with 32–4096 non-whitespace ASCII characters")
  if (opts && Flag.MIMOCODE_WORKSPACE_ID) throw new Error("Audio API cannot run inside a routed workspace server")
  const directory = opts ? path.resolve(opts.directory) : undefined
  const digest = opts ? createHash("sha256").update(opts.key).digest() : undefined
  const active = new Set<{ controller: AbortController; done: Promise<void> }>()
  let closing = false
  const app = new Hono().all("/*", async (c) => {
    if (!directory || !digest) return failure(c, 404, "Audio API is not enabled")
    const token = /^Bearer ([\x21-\x7e]{1,4096})$/i.exec(c.req.header("authorization") ?? "")?.[1]
    if (!token || !timingSafeEqual(digest, createHash("sha256").update(token).digest())) {
      c.header("WWW-Authenticate", "Bearer")
      return failure(c, 401, "Invalid audio API credential", "authentication_error")
    }
    if (closing) return failure(c, 503, "Audio API is closing")
    if (c.req.path !== "/v1/audio/speech" && c.req.path !== "/v1/audio/transcriptions")
      return failure(c, 404, "Unknown audio endpoint")
    if (c.req.method !== "POST") {
      c.header("Allow", "POST")
      return failure(c, 405, "Audio endpoints require POST")
    }
    const requested = [...(c.req.queries("directory") ?? []), c.req.header("x-mimocode-directory")].filter(
      (value) => value !== undefined,
    )
    if (
      requested.some((value) => path.resolve(value) !== directory) ||
      c.req.query("workspace") !== undefined ||
      c.req.query("workspaceID") !== undefined ||
      c.req.header("x-mimocode-workspace") !== undefined
    )
      return failure(c, 403, "Audio API is restricted to its startup directory")
    if (active.size >= MAX_CONCURRENT) {
      c.header("Retry-After", "1")
      return failure(c, 429, "Audio API allows at most two concurrent requests", "rate_limit_error")
    }
    const controller = new AbortController()
    const signal = AbortSignal.any([c.req.raw.signal, controller.signal])
    const done = Promise.withResolvers<void>()
    const entry = { controller, done: done.promise }
    active.add(entry)
    const timer = setTimeout(
      () => controller.abort(new DOMException("Audio request timed out", "TimeoutError")),
      TIMEOUT,
    )
    try {
      const run = await prepareAudio(c, signal)
      if (run instanceof Response) return run
      return await inInstance(directory, signal, run)
    } catch (error) {
      if (signal.aborted)
        return failure(c, signal.reason?.name === "TimeoutError" ? 504 : 503, "Audio request cancelled", "api_error")
      if (error instanceof RequestError) return failure(c, error.status, error.message, error.type)
      // SDK errors can contain provider credentials, response bodies and request text.
      return failure(c, 502, "Audio provider request failed", "api_error")
    } finally {
      clearTimeout(timer)
      active.delete(entry)
      done.resolve()
    }
  })
  return {
    app,
    close() {
      closing = true
      const pending = [...active]
      pending.forEach((entry) => entry.controller.abort())
      return Promise.all(pending.map((entry) => entry.done)).then(() => {})
    },
  }
}
