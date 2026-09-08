import { randomUUID } from "node:crypto"
import z from "zod"
import type { FinishReason, LanguageModelUsage, ModelMessage } from "ai"
import { acceptableImage, DATA_URL, type Image } from "./images"

const TextPart = z.strictObject({ type: z.literal("text"), text: z.string() })
const TextContent = z.union([z.string(), z.array(TextPart)])
const ContentPart = z.discriminatedUnion("type", [
  TextPart,
  z.strictObject({
    type: z.literal("image_url"),
    image_url: z.strictObject({
      url: z
        .string()
        .refine(
          acceptableImage,
          "requires an HTTP(S) URL without credentials or a canonical image data URL of at most 5 MiB",
        ),
      detail: z.enum(["auto", "low", "high"]).optional(),
    }),
  }),
])
const ToolCall = z.strictObject({
  id: z.string().min(1),
  type: z.literal("function").optional(),
  function: z.strictObject({ name: z.string().min(1), arguments: z.string() }),
})
const Message = z.discriminatedUnion("role", [
  z.strictObject({ role: z.literal("system"), content: TextContent, name: z.string().optional() }),
  z.strictObject({ role: z.literal("developer"), content: TextContent, name: z.string().optional() }),
  z.strictObject({
    role: z.literal("user"),
    content: z.union([z.string(), z.array(ContentPart)]),
    name: z.string().optional(),
  }),
  z.strictObject({
    role: z.literal("assistant"),
    content: TextContent.nullish(),
    tool_calls: z.array(ToolCall).optional(),
    name: z.string().optional(),
    reasoning_content: z.string().optional(),
  }),
  z.strictObject({ role: z.literal("tool"), content: TextContent, tool_call_id: z.string().min(1) }),
])

// Reject unknown behavior rather than silently promising fields that streamText
// cannot honor. Client provider_options is declared only to reject it explicitly:
// compatible SDKs spread arbitrary keys after model/messages in the request body.
export const ChatCompletionRequest = z.strictObject({
  model: z.string().min(1),
  messages: z.array(Message).min(1),
  tools: z
    .array(
      z.strictObject({
        type: z.literal("function").optional(),
        function: z.strictObject({
          name: z.string().min(1),
          description: z.string().optional(),
          parameters: z.record(z.string(), z.unknown()).optional(),
          strict: z.boolean().optional(),
        }),
      }),
    )
    .optional(),
  tool_choice: z
    .union([
      z.enum(["auto", "none", "required"]),
      z.strictObject({ type: z.literal("function"), function: z.strictObject({ name: z.string().min(1) }) }),
    ])
    .optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().positive().optional(),
  max_tokens: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
  stop: z.union([z.string(), z.array(z.string()).max(4)]).optional(),
  seed: z.number().int().optional(),
  stream: z.boolean().optional(),
  stream_options: z.strictObject({ include_usage: z.boolean().optional() }).optional(),
  user: z.string().optional(),
  reasoning_effort: z.string().optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  n: z.number().int().optional(),
  logprobs: z.boolean().nullish(),
  top_logprobs: z.number().int().nullish(),
  logit_bias: z.record(z.string(), z.number()).nullish(),
  response_format: z.unknown().optional(),
  verbosity: z.string().optional(),
  parallel_tool_calls: z.boolean().optional(),
  store: z.boolean().optional(),
  service_tier: z.string().optional(),
  metadata: z.unknown().optional(),
  modalities: z.array(z.string()).optional(),
  audio: z.unknown().optional(),
  prediction: z.unknown().optional(),
  functions: z.unknown().optional(),
  function_call: z.unknown().optional(),
  web_search_options: z.unknown().optional(),
  provider_options: z.record(z.string(), z.json()).optional(),
})
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequest>

export function unsupported(req: ChatCompletionRequest): string | undefined {
  if (req.n != null && req.n !== 1) return "Only n: 1 is supported"
  if (req.logprobs) return "logprobs is not supported"
  if (req.top_logprobs != null) return "top_logprobs is not supported"
  if (req.logit_bias && Object.keys(req.logit_bias).length) return "logit_bias is not supported"
  for (const key of [
    "response_format",
    "verbosity",
    "parallel_tool_calls",
    "store",
    "service_tier",
    "metadata",
    "modalities",
    "audio",
    "prediction",
    "functions",
    "function_call",
    "web_search_options",
    "provider_options",
  ] as const) {
    if (req[key] != null) return `${key} is not supported`
  }
  const names = new Set((req.tools ?? []).map((item) => item.function.name))
  if (names.size !== (req.tools?.length ?? 0)) return "Tool names must be unique"
  if (req.tool_choice === "required" && names.size === 0) return "tool_choice requires declared tools"
  if (typeof req.tool_choice === "object" && !names.has(req.tool_choice.function.name))
    return "tool_choice must name a declared tool"
  const calls = new Set<string>()
  const results = new Set<string>()
  for (const message of req.messages) {
    if ("name" in message && message.name != null) return "Message names are not supported"
    if (
      message.role === "user" &&
      Array.isArray(message.content) &&
      message.content.some(
        (part) => part.type === "image_url" && part.image_url.detail && part.image_url.detail !== "auto",
      )
    )
      return "Image detail is not supported"
    if (message.role === "assistant") {
      for (const call of message.tool_calls ?? []) {
        if (calls.has(call.id)) return "Historical tool call IDs must be unique"
        calls.add(call.id)
        try {
          JSON.parse(call.function.arguments || "{}")
        } catch {
          return "Historical tool arguments must be valid JSON"
        }
      }
    }
    if (message.role === "tool") {
      if (!calls.has(message.tool_call_id) || results.has(message.tool_call_id))
        return "Tool results must reference an earlier unmatched tool call"
      results.add(message.tool_call_id)
    }
  }
  return undefined
}

const toText = (content: string | Array<{ type: "text"; text: string }>) =>
  typeof content === "string" ? content : content.map((part) => part.text).join("")

export function toModelMessages(
  messages: ChatCompletionRequest["messages"],
  images: ReadonlyMap<string, Image> = new Map(),
): ModelMessage[] {
  const names = new Map<string, string>()
  return messages.map((message): ModelMessage => {
    if (message.role === "system" || message.role === "developer")
      return { role: "system", content: toText(message.content) }
    if (message.role === "user") {
      if (typeof message.content === "string") return { role: "user", content: message.content }
      return {
        role: "user",
        content: message.content.map((part) => {
          if (part.type === "text") return { type: "text", text: part.text }
          const match = DATA_URL.exec(part.image_url.url)
          if (match) return { type: "image", image: match[2], mediaType: match[1] }
          const image = images.get(part.image_url.url)
          if (!image) throw new Error("Remote image has not been downloaded")
          return { type: "image", image: image.bytes, mediaType: image.mediaType }
        }),
      }
    }
    if (message.role === "tool")
      return {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: message.tool_call_id,
            toolName: names.get(message.tool_call_id)!,
            output: { type: "text", value: toText(message.content) },
          },
        ],
      }
    const text = message.content == null ? "" : toText(message.content)
    const calls = (message.tool_calls ?? []).map((call) => {
      names.set(call.id, call.function.name)
      const input: unknown = JSON.parse(call.function.arguments || "{}")
      return { type: "tool-call" as const, toolCallId: call.id, toolName: call.function.name, input }
    })
    const reasoning = message.reasoning_content ? [{ type: "reasoning" as const, text: message.reasoning_content }] : []
    if (!calls.length && !reasoning.length) return { role: "assistant", content: text }
    return { role: "assistant", content: [...reasoning, ...(text ? [{ type: "text" as const, text }] : []), ...calls] }
  })
}

export function toToolChoice(choice: ChatCompletionRequest["tool_choice"]) {
  if (choice == null) return undefined
  if (typeof choice === "string") return choice
  return { type: "tool" as const, toolName: choice.function.name }
}

export function finishReason(reason: FinishReason | undefined) {
  if (reason === "tool-calls") return "tool_calls"
  if (reason === "length") return "length"
  if (reason === "content-filter") return "content_filter"
  if (reason === "stop") return "stop"
  throw new Error("The provider did not complete the response")
}

export function usage(value: LanguageModelUsage | undefined) {
  const input = value?.inputTokens ?? 0
  const output = value?.outputTokens ?? 0
  const cached = value?.inputTokenDetails?.cacheReadTokens
  const reasoning = value?.outputTokenDetails?.reasoningTokens
  return {
    prompt_tokens: input,
    completion_tokens: output,
    total_tokens: value?.totalTokens ?? input + output,
    ...(cached ? { prompt_tokens_details: { cached_tokens: cached } } : {}),
    ...(reasoning ? { completion_tokens_details: { reasoning_tokens: reasoning } } : {}),
  }
}

export function completionID() {
  return `chatcmpl-${randomUUID().replaceAll("-", "")}`
}

export type EmittedToolCall = { id: string; name: string; input: unknown }

export function completion(input: {
  id: string
  model: string
  created: number
  text: string
  reasoning?: string
  toolCalls: EmittedToolCall[]
  finishReason: FinishReason | undefined
  usage: LanguageModelUsage | undefined
}) {
  return {
    id: input.id,
    object: "chat.completion",
    created: input.created,
    model: input.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: input.text || null,
          ...(input.reasoning ? { reasoning_content: input.reasoning } : {}),
          ...(input.toolCalls.length
            ? {
                tool_calls: input.toolCalls.map((call) => ({
                  id: call.id,
                  type: "function",
                  function: { name: call.name, arguments: JSON.stringify(call.input ?? {}) },
                })),
              }
            : {}),
        },
        logprobs: null,
        finish_reason: finishReason(input.finishReason),
      },
    ],
    usage: usage(input.usage),
  }
}

/**
 * One `chat.completion.chunk`. `delta` is passed through verbatim so a caller
 * can emit a role-only opener, a text delta, a partial `tool_calls` entry, or
 * the empty delta that accompanies a terminal `finish_reason`.
 */
export function chunk(input: {
  id: string
  model: string
  created: number
  delta: Record<string, unknown>
  finishReason?: FinishReason | undefined
  usage?: LanguageModelUsage
}) {
  return {
    id: input.id,
    object: "chat.completion.chunk",
    created: input.created,
    model: input.model,
    choices: [
      {
        index: 0,
        delta: input.delta,
        logprobs: null,
        finish_reason: input.finishReason === undefined ? null : finishReason(input.finishReason),
      },
    ],
    ...(input.usage ? { usage: usage(input.usage) } : {}),
  }
}

/**
 * A usage-only chunk, sent when the caller asked for
 * `stream_options.include_usage`. OpenAI sends it after the final
 * `finish_reason` chunk and gives it an EMPTY `choices` array.
 */
export function usageChunk(input: { id: string; model: string; created: number; usage: LanguageModelUsage }) {
  return {
    id: input.id,
    object: "chat.completion.chunk",
    created: input.created,
    model: input.model,
    choices: [],
    usage: usage(input.usage),
  }
}

export function errorBody(input: { message: string; type: string; code?: string; param?: string }) {
  return {
    error: {
      message: input.message,
      type: input.type,
      param: input.param ?? null,
      code: input.code ?? null,
    },
  }
}
