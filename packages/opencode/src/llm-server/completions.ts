import { LLMServerScope } from "./scope"
import { type FinishReason, type LanguageModelUsage } from "ai"
import { Effect } from "effect"
import { RequestError } from "./error"
import { AppRuntime } from "../effect/app-runtime"
import { Provider } from "../provider"
import * as SDK from "./sdk"
import { ProviderOptionsError } from "./provider-options"
import { ImageError, prepareImages, type ImageTransport } from "./images"
import { audioRejection, inputAudio } from "./input-audio"
import {
  ChatCompletionRequest,
  unsupported,
  toModelMessages,
  completionID,
  completion,
  chunk,
  usageChunk,
  errorBody,
  finishReason,
  type EmittedToolCall,
} from "./protocol"

export { RequestError } from "./error"

function failed(error: unknown, abort: AbortSignal): never {
  abort.throwIfAborted()
  if (error instanceof RequestError) throw error
  if (error instanceof SDK.SDKError || error instanceof ProviderOptionsError)
    throw new RequestError(error.status, error.message)
  if (error instanceof ImageError)
    throw new RequestError(error.status, error.message, error.status === 502 ? "api_error" : "invalid_request_error")
  if (error instanceof Provider.ModelNotFoundError)
    throw new RequestError(404, "Model is not available in this instance", "invalid_request_error", "model_not_found")
  // Provider and plugin errors may contain credentials, prompts or response bodies.
  throw new RequestError(502, "Chat provider request failed", "api_error")
}

async function start(req: ChatCompletionRequest, abort: AbortSignal, imageTransport?: ImageTransport) {
  const parsed = Provider.parseModel(req.model)
  const resolved = await AppRuntime.runPromise(
    Effect.gen(function* () {
      const provider = yield* Provider.Service
      const model = yield* provider.getModel(parsed.providerID, parsed.modelID)
      return {
        model,
        language: yield* provider.getLanguage(model),
        provider: yield* provider.getProvider(model.providerID),
      }
    }),
    { signal: abort },
  )
  const model = resolved.model
  const urls = req.messages.flatMap((message) =>
    message.role === "user" && Array.isArray(message.content)
      ? message.content.flatMap((part) => (part.type === "image_url" ? [part.image_url.url] : []))
      : [],
  )
  if (urls.length && !model.capabilities.input.image)
    throw new RequestError(400, "This model does not support image input")
  const audio = req.messages.flatMap((message) =>
    message.role === "user" && Array.isArray(message.content)
      ? message.content.flatMap((part) => {
          if (part.type !== "input_audio") return []
          const value = inputAudio(part.input_audio)
          if (!value) throw new RequestError(400, "Invalid input audio")
          return [value]
        })
      : [],
  )
  const rejection = audioRejection(model, resolved.language, audio)
  if (rejection) throw new RequestError(400, rejection)
  const id = completionID()
  return {
    id,
    ref: req.model,
    result: await SDK.start({
      resolved,
      settings: req,
      abort,
      messages: async () =>
        toModelMessages(
          req.messages,
          await prepareImages(
            urls,
            abort,
            imageTransport,
            audio.reduce((total, part) => total + part.bytes, 0),
          ),
        ),
    }),
  }
}

type Started = Awaited<ReturnType<typeof start>>

async function collect(started: Started, controller: AbortController, abort: AbortSignal) {
  const output = await SDK.collect(started.result, controller, abort)
  return completion({
    id: started.id,
    model: started.ref,
    created: Math.floor(Date.now() / 1000),
    ...output,
  })
}

async function* stream(started: Started, controller: AbortController, abort: AbortSignal, includeUsage: boolean) {
  const base = { id: started.id, model: started.ref, created: Math.floor(Date.now() / 1000) }
  const indexes = new Map<string, number>()
  let opened = false
  let reason: FinishReason | undefined
  let usage: LanguageModelUsage | undefined
  const open = () => {
    opened = true
    return chunk({ ...base, delta: { role: "assistant", content: "" } })
  }
  for await (const part of SDK.parts(started.result, controller, abort)) {
    if (part.type === "text-delta" || part.type === "reasoning-delta") {
      if (!opened) yield open()
      yield chunk({
        ...base,
        delta: part.type === "text-delta" ? { content: part.text } : { reasoning_content: part.text },
      })
      continue
    }
    if (part.type === "tool-input-start") {
      if (!opened) yield open()
      const index = indexes.size
      indexes.set(part.id, index)
      yield chunk({
        ...base,
        delta: {
          tool_calls: [{ index, id: part.id, type: "function", function: { name: part.toolName, arguments: "" } }],
        },
      })
      continue
    }
    if (part.type === "tool-input-delta") {
      const index = indexes.get(part.id)
      if (index === undefined) throw new Error("Unmatched provider tool input")
      yield chunk({ ...base, delta: { tool_calls: [{ index, function: { arguments: part.delta } }] } })
      continue
    }
    if (part.type === "tool-call") {
      if (part.invalid) throw new Error("Invalid provider tool call")
      if (indexes.has(part.toolCallId)) continue
      if (!opened) yield open()
      const index = indexes.size
      indexes.set(part.toolCallId, index)
      yield chunk({
        ...base,
        delta: {
          tool_calls: [
            {
              index,
              id: part.toolCallId,
              type: "function",
              function: { name: part.toolName, arguments: JSON.stringify(part.input ?? {}) },
            },
          ],
        },
      })
      continue
    }
    if (part.type === "finish") {
      reason = part.finishReason
      usage = part.totalUsage
    }
  }
  // Validate before opening an otherwise empty response so truncation remains 502.
  finishReason(reason)
  if (!opened) yield open()
  yield chunk({ ...base, delta: {}, finishReason: reason })
  if (includeUsage && usage) yield usageChunk({ ...base, usage })
}

/** Must run within the gateway's fixed Instance lease until response EOF/cancel. */
export async function execute(
  input: {
    req: ChatCompletionRequest
    scope: LLMServerScope.Scope
    abort: AbortSignal
  },
  imageTransport?: ImageTransport,
): Promise<Response> {
  input.abort.throwIfAborted()
  const parsed = ChatCompletionRequest.safeParse(input.req)
  if (!parsed.success) throw new RequestError(400, "Invalid chat completion request")
  const invalid = unsupported(parsed.data)
  if (invalid) throw new RequestError(400, invalid)
  const model = Provider.parseModel(parsed.data.model)
  if (!model.providerID || !model.modelID)
    throw new RequestError(400, "model must be an explicit provider/model identifier")
  if (!LLMServerScope.allows(input.scope, parsed.data.model))
    throw new RequestError(404, "Model is not available to this token", "invalid_request_error", "model_not_found")
  const controller = new AbortController()
  const abort = AbortSignal.any([input.abort, controller.signal])
  try {
    const started = await start(parsed.data, abort, imageTransport)
    if (!parsed.data.stream) return Response.json(await collect(started, controller, abort))
    const iterator = stream(started, controller, abort, parsed.data.stream_options?.include_usage === true)
    const first = await iterator.next()
    const encoder = new TextEncoder()
    let next = first
    let cancelled = false
    let finished = false
    let initial = true
    return new Response(
      new ReadableStream<Uint8Array>(
        {
          async pull(output) {
            try {
              if (!initial) next = await iterator.next()
              initial = false
              if (cancelled) return
              if (next.done) {
                output.enqueue(encoder.encode("data: [DONE]\n\n"))
                output.close()
                finished = true
                return
              }
              output.enqueue(encoder.encode(`data: ${JSON.stringify(next.value)}\n\n`))
            } catch {
              if (cancelled) return
              output.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify(errorBody({ message: "Chat provider request failed", type: "api_error" }))}\n\ndata: [DONE]\n\n`,
                ),
              )
              output.close()
              finished = true
            }
          },
          async cancel(reason) {
            if (finished) return
            cancelled = true
            controller.abort(reason)
            await iterator.return(undefined)
          },
        },
        { highWaterMark: 0 },
      ),
      {
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          "x-accel-buffering": "no",
        },
      },
    )
  } catch (error) {
    controller.abort()
    return failed(error, input.abort)
  }
}
