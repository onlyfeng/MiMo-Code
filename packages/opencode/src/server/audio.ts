import { createHash, timingSafeEqual } from "node:crypto"
import path from "node:path"
import { Hono } from "hono"
import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { AppRuntime } from "@/effect/app-runtime"
import { Instance } from "@/project/instance"
import { InstanceBootstrap } from "@/project/bootstrap"
import { Flag } from "@/flag/flag"
import {
  SpeechRequest,
  TranscriptionRequest,
  speechUnsupported,
  transcriptionUnsupported,
  transcriptionMediaType,
} from "@/audio/protocol"
import { RequestError, synthesize, transcribe } from "@/audio/service"

export type AudioOptions = { key: string; directory: string }

const MAX_BODY = 25 * 1024 * 1024
const MAX_CONCURRENT = 2
const TIMEOUT = 120_000

function failure(c: Context, status: ContentfulStatusCode, message: string, type = "invalid_request_error") {
  c.header("Cache-Control", "no-store")
  return c.json({ error: { message, type, param: null, code: null } }, status)
}

async function body(req: Request, signal: AbortSignal) {
  if (Number(req.headers.get("content-length")) > MAX_BODY) {
    await req.body?.cancel().catch(() => {})
    throw new RequestError(413, "Audio request body exceeds 25 MiB", "invalid_request_error")
  }
  const reader = req.body?.getReader()
  if (!reader) throw new RequestError(400, "Request body is required", "invalid_request_error")
  const chunks: Uint8Array[] = []
  let length = 0
  const cancel = () => void reader.cancel().catch(() => {})
  signal.addEventListener("abort", cancel, { once: true })
  try {
    while (true) {
      signal.throwIfAborted()
      const next = await reader.read()
      signal.throwIfAborted()
      if (next.done) return Buffer.concat(chunks, length)
      length += next.value.byteLength
      if (length > MAX_BODY) {
        await reader.cancel()
        throw new RequestError(413, "Audio request body exceeds 25 MiB", "invalid_request_error")
      }
      chunks.push(next.value)
    }
  } finally {
    signal.removeEventListener("abort", cancel)
    reader.releaseLock()
  }
}

// A generic API may already own this directory's bootstrap. Cancelling an audio
// waiter must not wait for or cancel that shared producer. Once entered, retain
// the instance lease until the provider call actually observes cancellation.
function inInstance(directory: string, signal: AbortSignal, fn: () => Promise<Response>) {
  const state: { run?: () => Promise<Response>; entered: boolean } = { run: fn, entered: false }
  return new Promise<Response>((resolve, reject) => {
    const abort = () => {
      if (state.entered) return
      // Release parsed text/uploads held by the callback even if the shared
      // bootstrap remains pending. Its eventual callback must never call a model.
      state.run = undefined
      signal.removeEventListener("abort", abort)
      reject(signal.reason)
    }
    if (signal.aborted) return abort()
    signal.addEventListener("abort", abort, { once: true })
    Instance.provide({
      directory,
      init: () => AppRuntime.runPromise(InstanceBootstrap, { signal }),
      fn() {
        signal.throwIfAborted()
        state.entered = true
        const run = state.run
        state.run = undefined
        if (!run) throw new Error("Audio request is no longer active")
        return run()
      },
    })
      .then(resolve, reject)
      .finally(() => {
        state.run = undefined
        signal.removeEventListener("abort", abort)
      })
  })
}

async function execute(c: Context, directory: string, signal: AbortSignal) {
  const contentType = c.req.header("content-type") ?? ""
  if (c.req.path.endsWith("/speech")) {
    if (contentType.split(";")[0].trim().toLowerCase() !== "application/json")
      return failure(c, 415, "Speech requests require application/json")
    const bytes = await body(c.req.raw, signal)
    const value: unknown = await new Response(bytes).json().catch(() => undefined)
    const parsed = SpeechRequest.safeParse(value)
    if (!parsed.success) return failure(c, 400, "Invalid speech request; specify model and input (1–4096 characters)")
    const unsupported = speechUnsupported(parsed.data)
    if (unsupported) return failure(c, 400, unsupported)
    return inInstance(directory, signal, async () => {
      signal.throwIfAborted()
      const result = await synthesize({ req: parsed.data, abort: signal })
      signal.throwIfAborted()
      return c.body(Buffer.from(result.audio), 200, {
        "Content-Type": result.contentType,
        "Cache-Control": "no-store",
      })
    })
  }
  if (!/^multipart\/form-data\s*;/i.test(contentType))
    return failure(c, 415, "Transcription requests require multipart/form-data")
  const bytes = await body(c.req.raw, signal)
  const form = await new Response(bytes, { headers: { "content-type": contentType } }).formData().catch(() => undefined)
  if (!form) return failure(c, 400, "Invalid multipart body")
  const fields = [...form.entries()]
  if (new Set(fields.map(([key]) => key)).size !== fields.length) return failure(c, 400, "Duplicate multipart fields")
  const file = form.get("file")
  if (!(file instanceof File) || !file.size) return failure(c, 400, "A nonempty audio file is required")
  const parsed = TranscriptionRequest.safeParse(Object.fromEntries(fields.filter(([key]) => key !== "file")))
  if (!parsed.success) return failure(c, 400, "Invalid transcription request fields")
  const unsupported = transcriptionUnsupported(parsed.data)
  if (unsupported) return failure(c, 400, unsupported)
  const mediaType = transcriptionMediaType({ reported: file.type, filename: file.name })
  if (!mediaType) return failure(c, 400, "Unsupported audio container")
  return inInstance(directory, signal, async () => {
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
  })
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
      return await execute(c, directory, signal)
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
