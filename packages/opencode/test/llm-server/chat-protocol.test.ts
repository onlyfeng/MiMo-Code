import { expect, test } from "bun:test"
import { ChatCompletionRequest, unsupported, toModelMessages, finishReason, usage } from "../../src/llm-server/protocol"

const base = { model: "local/chat", messages: [{ role: "user", content: "hello" }] }

test.each([
  { model: "", messages: [] },
  { ...base, temperature: 3 },
  { ...base, max_tokens: 0 },
  {
    ...base,
    messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "https://example.com/a.png" } }] }],
  },
  {
    ...base,
    messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "data:image/png;base64,!!!!" } }] }],
  },
  {
    ...base,
    messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "data:text/html;base64,SGk=" } }] }],
  },
])("rejects invalid or remote image input: %j", (value) => {
  expect(ChatCompletionRequest.safeParse(value).success).toBe(false)
})

test.each([
  { n: 2 },
  { logprobs: true },
  { top_logprobs: 0 },
  { logit_bias: { "1": 1 } },
  { response_format: { type: "json_object" } },
  { parallel_tool_calls: false },
  { store: true },
  { verbosity: "low" },
  { modalities: ["audio"] },
  { functions: [] },
  { provider_options: {} },
  { provider_options: { messages: [] } },
  { provider_options: { tools: [], response_format: { type: "json_object" } } },
  { tool_choice: "required" },
])("refuses unsupported behavior instead of ignoring it: %j", (extra) => {
  expect(unsupported(ChatCompletionRequest.parse({ ...base, ...extra }))).toBeDefined()
})

test("accepts one result and explicit no-op log settings", () => {
  expect(unsupported(ChatCompletionRequest.parse({ ...base, n: 1, logprobs: false, logit_bias: {} }))).toBeUndefined()
})

test("rejects duplicate tool names and a choice outside the declared tools", () => {
  const tool = { type: "function", function: { name: "lookup", parameters: { type: "object" } } }
  expect(unsupported(ChatCompletionRequest.parse({ ...base, tools: [tool, tool] }))).toBeDefined()
  expect(
    unsupported(
      ChatCompletionRequest.parse({
        ...base,
        tools: [tool],
        tool_choice: { type: "function", function: { name: "missing" } },
      }),
    ),
  ).toBeDefined()
})

test("converts tools and reasoning with their original call identifiers", () => {
  const request = ChatCompletionRequest.parse({
    ...base,
    messages: [
      { role: "developer", content: "Be brief." },
      {
        role: "assistant",
        content: "Checking.",
        reasoning_content: "Need a lookup.",
        tool_calls: [{ id: "call_1", type: "function", function: { name: "lookup", arguments: '{"city":"BJ"}' } }],
      },
      { role: "tool", tool_call_id: "call_1", content: "20C" },
    ],
  })
  expect(toModelMessages(request.messages)).toEqual([
    { role: "system", content: "Be brief." },
    {
      role: "assistant",
      content: [
        { type: "reasoning", text: "Need a lookup." },
        { type: "text", text: "Checking." },
        { type: "tool-call", toolCallId: "call_1", toolName: "lookup", input: { city: "BJ" } },
      ],
    },
    {
      role: "tool",
      content: [
        { type: "tool-result", toolCallId: "call_1", toolName: "lookup", output: { type: "text", value: "20C" } },
      ],
    },
  ])
})

test("rejects malformed historical tool arguments and unmatched results", () => {
  expect(
    unsupported(
      ChatCompletionRequest.parse({
        ...base,
        messages: [{ role: "assistant", tool_calls: [{ id: "a", function: { name: "lookup", arguments: "{bad" } }] }],
      }),
    ),
  ).toBeDefined()
  expect(
    unsupported(
      ChatCompletionRequest.parse({ ...base, messages: [{ role: "tool", tool_call_id: "missing", content: "x" }] }),
    ),
  ).toBeDefined()
})

test("inline images preserve MIME and bytes", () => {
  const request = ChatCompletionRequest.parse({
    ...base,
    messages: [
      { role: "user", content: [{ type: "image_url", image_url: { url: "data:image/png;base64,aGVsbG8=" } }] },
    ],
  })
  expect(toModelMessages(request.messages)).toEqual([
    { role: "user", content: [{ type: "image", image: "aGVsbG8=", mediaType: "image/png" }] },
  ])
})

test("bounds each decoded image before the SDK sees it", () => {
  const data = Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64")
  expect(
    ChatCompletionRequest.safeParse({
      ...base,
      messages: [
        { role: "user", content: [{ type: "image_url", image_url: { url: `data:image/png;base64,${data}` } }] },
      ],
    }).success,
  ).toBe(false)
})

test("does not convert incomplete provider output into a successful stop", () => {
  expect(() => finishReason("other")).toThrow()
  expect(() => finishReason("error")).toThrow()
  expect(finishReason("tool-calls")).toBe("tool_calls")
})

test("reports provider usage including cache and reasoning details", () => {
  expect(
    usage({
      inputTokens: 12,
      outputTokens: 7,
      totalTokens: 19,
      inputTokenDetails: { noCacheTokens: 8, cacheReadTokens: 4, cacheWriteTokens: 0 },
      outputTokenDetails: { textTokens: 5, reasoningTokens: 2 },
    }),
  ).toEqual({
    prompt_tokens: 12,
    completion_tokens: 7,
    total_tokens: 19,
    prompt_tokens_details: { cached_tokens: 4 },
    completion_tokens_details: { reasoning_tokens: 2 },
  })
})
