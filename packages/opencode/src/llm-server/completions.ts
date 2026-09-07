import {
  streamText,
  wrapLanguageModel,
  jsonSchema,
  tool,
  type ToolSet,
  type FinishReason,
  type LanguageModelUsage,
} from "ai"
import { Effect } from "effect"
import { mergeDeep, pipe } from "remeda"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { AppRuntime } from "../effect/app-runtime"
import { Provider, ProviderTransform } from "../provider"
import { Plugin } from "../plugin"
import { SessionID, MessageID } from "../session/schema"
import type { User } from "../session/message-v2"
import {
  ChatCompletionRequest,
  unsupported,
  toModelMessages,
  toToolChoice,
  completionID,
  completion,
  chunk,
  usageChunk,
  errorBody,
  finishReason,
  type EmittedToolCall,
} from "./protocol"

export class RequestError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    message: string,
    readonly type = "invalid_request_error",
    readonly code?: string,
  ) {
    super(message)
    this.name = "RequestError"
  }
}

function failed(error: unknown, abort: AbortSignal): never {
  abort.throwIfAborted()
  if (error instanceof RequestError) throw error
  if (error instanceof Provider.ModelNotFoundError)
    throw new RequestError(404, "Model is not available in this instance", "invalid_request_error", "model_not_found")
  // Provider and plugin errors may contain credentials, prompts or response bodies.
  throw new RequestError(502, "Chat provider request failed", "api_error")
}

function variantFor(model: Provider.Model, effort: string) {
  if (Object.hasOwn(model.variants ?? {}, effort)) return model.variants![effort]
  throw new RequestError(400, "reasoning_effort is not available for this model")
}

function toolSet(tools: NonNullable<ChatCompletionRequest["tools"]>): ToolSet {
  return Object.fromEntries(
    tools.map((entry) => [
      entry.function.name,
      tool({
        description: entry.function.description,
        inputSchema: jsonSchema(entry.function.parameters ?? { type: "object", properties: {} }),
        ...(entry.function.strict === undefined ? {} : { strict: entry.function.strict }),
      }),
    ]),
  )
}

async function start(req: ChatCompletionRequest, abort: AbortSignal) {
  const parsed = Provider.parseModel(req.model)
  const resolved = await AppRuntime.runPromise(
    Effect.gen(function* () {
      const provider = yield* Provider.Service
      const model = yield* provider.getModel(parsed.providerID, parsed.modelID)
      if (Provider.modelKind(model) !== "language") throw new RequestError(400, "This model requires an audio endpoint")
      return {
        model,
        language: yield* provider.getLanguage(model),
        provider: yield* provider.getProvider(model.providerID),
      }
    }),
    { signal: abort },
  )
  const model = resolved.model
  const id = completionID()
  const sessionID = SessionID.descending()
  const message: User = {
    id: MessageID.ascending(),
    sessionID,
    role: "user",
    time: { created: Date.now() },
    agent: "llm-api",
    model: { providerID: model.providerID, modelID: model.id, variant: req.reasoning_effort },
  }
  const options = pipe(
    ProviderTransform.options({ model, sessionID, providerOptions: resolved.provider.options }),
    mergeDeep(model.options),
    mergeDeep(req.reasoning_effort ? variantFor(model, req.reasoning_effort) : {}),
  )
  const context = { sessionID, agent: "llm-api", model, provider: resolved.provider, message }
  const hooked = await AppRuntime.runPromise(
    Effect.gen(function* () {
      const plugin = yield* Plugin.Service
      const params = yield* plugin.trigger("chat.params", context, {
        temperature: model.capabilities.temperature
          ? (req.temperature ?? ProviderTransform.temperature(model))
          : undefined,
        topP: req.top_p ?? ProviderTransform.topP(model),
        topK: req.top_k ?? ProviderTransform.topK(model),
        maxOutputTokens: req.max_completion_tokens ?? req.max_tokens ?? ProviderTransform.maxOutputTokens(model),
        options,
      })
      const headers = yield* plugin.trigger("chat.headers", context, { headers: {} as Record<string, string> })
      return { params, headers: headers.headers }
    }),
    { signal: abort },
  )
  abort.throwIfAborted()
  const headers = new Headers(model.headers)
  new Headers(hooked.headers).forEach((value, name) => headers.set(name, value))
  const tools = req.tools?.length ? ProviderTransform.tools(toolSet(req.tools), model) : undefined
  return {
    id,
    ref: req.model,
    result: streamText({
      model: wrapLanguageModel({
        model: resolved.language,
        middleware: {
          specificationVersion: "v3",
          async transformParams(args) {
            // The shared transform accepts SDK prompts but exposes the wider ModelMessage return type.
            // @ts-expect-error same SDK middleware boundary as session/llm.ts
            args.params.prompt = ProviderTransform.message(args.params.prompt, model, hooked.params.options)
            return args.params
          },
        },
      }),
      messages: toModelMessages(req.messages),
      tools,
      toolChoice: tools ? toToolChoice(req.tool_choice) : undefined,
      temperature: hooked.params.temperature,
      topP: hooked.params.topP,
      topK: hooked.params.topK,
      maxOutputTokens: hooked.params.maxOutputTokens,
      stopSequences: typeof req.stop === "string" ? [req.stop] : req.stop,
      seed: req.seed,
      presencePenalty: req.presence_penalty,
      frequencyPenalty: req.frequency_penalty,
      providerOptions: ProviderTransform.providerOptions(model, hooked.params.options),
      headers: Object.fromEntries(headers),
      maxRetries: 0,
      abortSignal: abort,
      onError() {},
    }),
  }
}

type Started = Awaited<ReturnType<typeof start>>

// fullStream tees its history internally. Limit accumulated output and read only
// on demand; promise getters such as result.finishReason would create another
// eager drain. The finish event already carries everything needed for the wire.
async function* parts(started: Started, controller: AbortController, abort: AbortSignal) {
  const reader = started.result.fullStream.getReader()
  let ended = false
  let bytes = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) {
        ended = true
        break
      }
      abort.throwIfAborted()
      bytes += Buffer.byteLength(JSON.stringify(next.value))
      if (bytes > 16 * 1024 * 1024) throw new Error("Provider output exceeded the proxy limit")
      if (next.value.type === "error") throw next.value.error
      if (next.value.type === "abort") throw new DOMException("Request aborted", "AbortError")
      yield next.value
    }
  } finally {
    if (!ended) {
      controller.abort()
      // Cancelling one SDK tee branch can wait for its retained sibling forever.
      // Abort transport first, then drain this reader through SDK termination.
      while (!(await reader.read().catch(() => ({ done: true }))).done) {
        /* drain aborted SDK work */
      }
    }
    reader.releaseLock()
  }
}

async function collect(started: Started, controller: AbortController, abort: AbortSignal) {
  const text: string[] = []
  const reasoning: string[] = []
  const toolCalls: EmittedToolCall[] = []
  let reason: FinishReason | undefined
  let usage: LanguageModelUsage | undefined
  for await (const part of parts(started, controller, abort)) {
    if (part.type === "text-delta") text.push(part.text)
    if (part.type === "reasoning-delta") reasoning.push(part.text)
    if (part.type === "tool-call") {
      if (part.invalid) throw new Error("Invalid provider tool call")
      toolCalls.push({ id: part.toolCallId, name: part.toolName, input: part.input })
    }
    if (part.type === "finish") {
      reason = part.finishReason
      usage = part.totalUsage
    }
  }
  return completion({
    id: started.id,
    model: started.ref,
    created: Math.floor(Date.now() / 1000),
    text: text.join(""),
    reasoning: reasoning.join("") || undefined,
    toolCalls,
    finishReason: reason,
    usage,
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
  for await (const part of parts(started, controller, abort)) {
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
export async function execute(input: {
  req: ChatCompletionRequest
  models: string[]
  abort: AbortSignal
}): Promise<Response> {
  input.abort.throwIfAborted()
  const parsed = ChatCompletionRequest.safeParse(input.req)
  if (!parsed.success) throw new RequestError(400, "Invalid chat completion request")
  const invalid = unsupported(parsed.data)
  if (invalid) throw new RequestError(400, invalid)
  const model = Provider.parseModel(parsed.data.model)
  if (!model.providerID || !model.modelID)
    throw new RequestError(400, "model must be an explicit provider/model identifier")
  if (!input.models.includes(parsed.data.model))
    throw new RequestError(404, "Model is not available to this token", "invalid_request_error", "model_not_found")
  const controller = new AbortController()
  const abort = AbortSignal.any([input.abort, controller.signal])
  try {
    const started = await start(parsed.data, abort)
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
