import { LLMServerScope } from "@/llm-server/scope"
import { randomUUID } from "node:crypto"
import path from "node:path"
import { Hono } from "hono"
import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { Flag } from "@/flag/flag"
import { RequestError as AudioError } from "@/audio/service"
import { LLMServerTokens } from "@/llm-server/tokens"
import { LLMServerCapability } from "@/llm-server/capability"
import { ChatCompletionRequest, unsupported } from "@/llm-server/protocol"
import { execute, RequestError } from "@/llm-server/completions"
import { prepareAudio } from "./audio"
import { inInstance, readBody } from "./api-request"

export type ModelAPIOptions = { directory: string }

function failure(c: Context, status: ContentfulStatusCode, message: string, type = "invalid_request_error") {
  c.header("Cache-Control", "no-store")
  return c.json({ error: { message, type, param: null, code: null } }, status)
}

// Keep the instance callback and admission alive until the response is consumed
// or its underlying producer has acknowledged cancellation.
function streamBody(body: ReadableStream<Uint8Array>, controller: AbortController, signal: AbortSignal) {
  const reader = body.getReader()
  const done = Promise.withResolvers<void>()
  let finished = false
  let cancelled = false
  let output: ReadableStreamDefaultController<Uint8Array>
  const finish = () => {
    if (finished) return
    finished = true
    signal.removeEventListener("abort", abort)
    reader.releaseLock()
    done.resolve()
  }
  const abort = () => {
    if (finished) return
    // Bun's HTTP response sink reports error() as an unhandled rejection even
    // when the client's reader handles its abort. Terminate SSE explicitly;
    // keep the lease until the producer has acknowledged cancellation below.
    if (!cancelled) {
      output.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ error: { message: "Model request cancelled", type: "api_error", param: null, code: null } })}\n\ndata: [DONE]\n\n`,
        ),
      )
      output.close()
    }
    void reader
      .cancel(signal.reason)
      .catch(() => {})
      .finally(finish)
  }
  const stream = new ReadableStream<Uint8Array>({
    start(next) {
      output = next
      signal.addEventListener("abort", abort, { once: true })
      if (signal.aborted) abort()
    },
    async pull(next) {
      try {
        const item = await reader.read()
        if (finished || signal.aborted) return
        if (item.done) {
          next.close()
          finish()
          return
        }
        next.enqueue(item.value)
      } catch (error) {
        if (finished || signal.aborted) return
        controller.abort(error)
      }
    },
    async cancel(reason) {
      cancelled = true
      controller.abort(reason)
      await done.promise
    },
  })
  return { stream, done: done.promise }
}

async function prepare(c: Context, scope: LLMServerScope.Scope, signal: AbortSignal) {
  if (c.req.path === "/v1/models") {
    return async () => {
      const available = await LLMServerCapability.available(signal, scope)
      signal.throwIfAborted()
      return c.json({
        object: "list",
        data: available
          .filter((entry) => LLMServerScope.allows(scope, entry.ref))
          .map((entry) => ({
            id: entry.ref,
            object: "model",
            created: 0,
            owned_by: entry.model.providerID,
          })),
      })
    }
  }
  if (c.req.path.startsWith("/v1/audio/")) return prepareAudio(c, signal, scope)
  if ((c.req.header("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json")
    return failure(c, 415, "Chat requests require application/json")
  const bytes = await readBody(c.req.raw, signal)
  const value: unknown = await new Response(bytes).json().catch(() => undefined)
  const parsed = ChatCompletionRequest.safeParse(value)
  if (!parsed.success) return failure(c, 400, "Invalid chat completion request")
  if (!LLMServerScope.allows(scope, parsed.data.model)) return failure(c, 403, "Model is outside token scope")
  const rejection = unsupported(parsed.data)
  if (rejection) return failure(c, 400, rejection)
  return () => execute({ req: parsed.data, scope, abort: signal })
}

/** Explicitly mounted before generic auth, body parsing, and instance routing. */
export function createModelAPI(opts?: ModelAPIOptions) {
  if (opts && Flag.MIMOCODE_WORKSPACE_ID) throw new Error("Model API cannot run inside a routed workspace server")
  const directory = opts ? path.resolve(opts.directory) : undefined
  const id = randomUUID()
  const active = new Set<{ controller: AbortController; done: Promise<void> }>()
  let closing = false
  const app = new Hono().all("/*", (c) => {
    c.header("Cache-Control", "no-store")
    if (!directory) return failure(c, 404, "Model API is not enabled")
    if (closing) return failure(c, 503, "Model API is closing", "api_error")
    // No secrets or project state: CLI uses this identity to reject stale addresses.
    if (c.req.path === "/v1/_mimocode" && c.req.method === "GET") return c.json({ id })
    const token = /^Bearer ([\x21-\x7e]{1,4096})$/i.exec(c.req.header("authorization") ?? "")?.[1]
    if (!token) {
      c.header("WWW-Authenticate", "Bearer")
      return failure(c, 401, "Invalid model API credential", "authentication_error")
    }
    if (active.size >= 2) {
      c.header("Retry-After", "1")
      return failure(c, 429, "Model API allows at most two concurrent requests", "rate_limit_error")
    }
    const controller = new AbortController()
    const signal = AbortSignal.any([c.req.raw.signal, controller.signal])
    const done = Promise.withResolvers<void>()
    const result = Promise.withResolvers<Response>()
    const entry = { controller, done: done.promise }
    active.add(entry)
    const timer = setTimeout(
      () => controller.abort(new DOMException("Model request timed out", "TimeoutError")),
      120_000,
    )
    void (async () => {
      const auth = await LLMServerTokens.verify({ directory, token, signal })
      signal.throwIfAborted()
      if (!auth.ok) {
        c.header("WWW-Authenticate", "Bearer")
        return failure(c, 401, "Invalid or expired model API credential", "authentication_error")
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
        return failure(c, 403, "Model API is restricted to its startup directory")
      const method =
        c.req.path === "/v1/models"
          ? "GET"
          : ["/v1/chat/completions", "/v1/audio/speech", "/v1/audio/transcriptions"].includes(c.req.path)
            ? "POST"
            : undefined
      if (!method) return failure(c, 404, "Unknown model API endpoint")
      if (c.req.method !== method) {
        c.header("Allow", method)
        return failure(c, 405, `This endpoint requires ${method}`)
      }
      const run = await prepare(c, auth.scope, signal)
      if (run instanceof Response) return run
      return inInstance(directory, signal, async () => {
        const response = await run()
        // Cancellation can win between the service returning an unread SSE body
        // and our consumer taking ownership. Retire that producer before leaving.
        if (signal.aborted) await response.body?.cancel(signal.reason).catch(() => {})
        signal.throwIfAborted()
        response.headers.set("Cache-Control", "no-store")
        if (response.body && response.headers.get("content-type")?.startsWith("text/event-stream")) {
          const body = streamBody(response.body, controller, signal)
          result.resolve(new Response(body.stream, { status: response.status, headers: response.headers }))
          await body.done
        }
        return response
      })
    })()
      .then(result.resolve, (error) => {
        if (signal.aborted) {
          result.resolve(
            failure(c, signal.reason?.name === "TimeoutError" ? 504 : 503, "Model request cancelled", "api_error"),
          )
          return
        }
        if (error instanceof RequestError || error instanceof AudioError) {
          result.resolve(failure(c, error.status, error.message, error.type))
          return
        }
        result.resolve(failure(c, 502, "Model API request failed", "api_error"))
      })
      .finally(() => {
        clearTimeout(timer)
        active.delete(entry)
        done.resolve()
      })
    return result.promise
  })
  return {
    app,
    id,
    close() {
      closing = true
      const pending = [...active]
      pending.forEach((entry) => entry.controller.abort())
      return Promise.all(pending.map((entry) => entry.done)).then(() => {})
    },
  }
}
