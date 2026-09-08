import {
  streamText,
  wrapLanguageModel,
  jsonSchema,
  tool,
  type ToolSet,
  type FinishReason,
  type LanguageModelUsage,
  type ModelMessage,
} from "ai"
import { Effect } from "effect"
import { mergeDeep, omit, pipe } from "remeda"
import { AppRuntime } from "../effect/app-runtime"
import { Provider, ProviderTransform } from "../provider"
import { Plugin } from "../plugin"
import { SessionID, MessageID } from "../session/schema"
import type { User } from "../session/message-v2"
import { toToolChoice, type ChatCompletionRequest, type EmittedToolCall } from "./protocol"
import * as ProviderOptions from "./provider-options"

export class SDKError extends Error {
  constructor(
    readonly status: 400,
    message: string,
  ) {
    super(message)
  }
}

/** Resolves factories without generating; callers retain their own admission. */
export async function resolve(model: Provider.Model, abort: AbortSignal) {
  return AppRuntime.runPromise(
    Effect.gen(function* () {
      const service = yield* Provider.Service
      return {
        model,
        language: yield* service.getLanguage(model),
        provider: yield* service.getProvider(model.providerID),
      }
    }),
    { signal: abort },
  )
}

function variantFor(model: Provider.Model, effort: string) {
  if (Object.hasOwn(model.variants ?? {}, effort)) return model.variants![effort]
  throw new SDKError(400, "reasoning_effort is not available for this model")
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

export async function start(input: {
  resolved: Awaited<ReturnType<typeof resolve>>
  settings: Omit<ChatCompletionRequest, "messages" | "model">
  messages: () => ModelMessage[] | Promise<ModelMessage[]>
  abort: AbortSignal
  outputCap?: number
}) {
  const model = input.resolved.model
  const resolved = input.resolved
  const req = input.settings
  const abort = input.abort
  const sessionID = SessionID.descending()
  const message: User = {
    id: MessageID.ascending(),
    sessionID,
    role: "user",
    time: { created: Date.now() },
    agent: "llm-api",
    model: { providerID: model.providerID, modelID: model.id, variant: req.reasoning_effort },
  }
  const defaults = pipe(
    ProviderTransform.options({ model, sessionID, providerOptions: resolved.provider.options }),
    mergeDeep(model.options),
  )
  const variant = req.reasoning_effort ? variantFor(model, req.reasoning_effort) : undefined
  const max = req.max_completion_tokens ?? req.max_tokens ?? ProviderTransform.maxOutputTokens(model)
  const prepared =
    req.provider_options && Object.keys(req.provider_options).length
      ? ProviderOptions.prepare({
          model,
          language: resolved.language,
          defaults,
          client: req.provider_options,
          variant,
          maxOutputTokens: max,
          explicitOutput: req.max_completion_tokens != null || req.max_tokens != null,
        })
      : { options: mergeDeep(defaults, variant ?? {}), maxOutputTokens: max }
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
        maxOutputTokens: prepared.maxOutputTokens,
        options: prepared.options,
      })
      const headers = yield* plugin.trigger("chat.headers", context, { headers: {} as Record<string, string> })
      return { params, headers: headers.headers }
    }),
    { signal: abort },
  )
  abort.throwIfAborted()
  const output =
    req.provider_options && Object.keys(req.provider_options).length
      ? ProviderOptions.outputLimit(
          model,
          hooked.params.options,
          hooked.params.maxOutputTokens,
          req.max_completion_tokens != null || req.max_tokens != null,
        )
      : hooked.params.maxOutputTokens
  const headers = new Headers(model.headers)
  new Headers(hooked.headers).forEach((value, name) => headers.set(name, value))
  const tools = req.tools?.length ? ProviderTransform.tools(toolSet(req.tools), model) : undefined
  const maxOutputTokens = input.outputCap === undefined ? output : Math.min(output, input.outputCap)
  if (input.outputCap !== undefined && (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens <= 0))
    throw new SDKError(400, "Invalid transcription output limit")
  const messages = await input.messages()
  abort.throwIfAborted()
  return streamText({
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
    messages,
    tools,
    toolChoice: tools ? toToolChoice(req.tool_choice) : undefined,
    temperature: hooked.params.temperature,
    topP: hooked.params.topP,
    topK: hooked.params.topK,
    maxOutputTokens,
    stopSequences: typeof req.stop === "string" ? [req.stop] : req.stop,
    seed: req.seed,
    presencePenalty: req.presence_penalty,
    frequencyPenalty: req.frequency_penalty,
    providerOptions: ProviderTransform.providerOptions(model, hooked.params.options),
    headers: Object.fromEntries(headers),
    maxRetries: 0,
    abortSignal: abort,
    onError() {},
  })
}

type Started = Awaited<ReturnType<typeof start>>

// fullStream tees its history internally. Limit accumulated output and read only
// on demand; promise getters such as result.finishReason would create another
// eager drain. The finish event already carries everything needed for the wire.
export async function* parts(result: Started, controller: AbortController, abort: AbortSignal) {
  const reader = result.fullStream.getReader()
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
      // start-step echoes the serialized request, including input media. That
      // data already has its own bound and must not consume the output budget.
      bytes += Buffer.byteLength(
        JSON.stringify(next.value.type === "start-step" ? omit(next.value, ["request"]) : next.value),
      )
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

export async function collect(result: Started, controller: AbortController, abort: AbortSignal) {
  const text: string[] = []
  const reasoning: string[] = []
  const toolCalls: EmittedToolCall[] = []
  let reason: FinishReason | undefined
  let usage: LanguageModelUsage | undefined
  for await (const part of parts(result, controller, abort)) {
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
  return {
    text: text.join(""),
    reasoning: reasoning.join("") || undefined,
    toolCalls,
    finishReason: reason,
    usage,
  }
}
