import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import path from "path"
import { jsonSchema, tool, type ModelMessage } from "ai"
import { Effect, Stream } from "effect"
import { makeRuntime } from "../../src/effect/run-service"
import { LLM } from "../../src/session/llm"
import { Instance } from "../../src/project/instance"
import { Provider } from "../../src/provider"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { tmpdir } from "../fixture/fixture"
import type { Agent } from "../../src/agent/agent"
import type { MessageV2 } from "../../src/session/message-v2"
import { SessionID, MessageID } from "../../src/session/schema"
import { AppRuntime } from "../../src/effect/app-runtime"

const llm = makeRuntime(LLM.Service, LLM.defaultLayer)

type Body = Record<string, unknown>
const state = {
  server: null as ReturnType<typeof Bun.serve> | null,
  handlers: [] as Array<(body: Body) => Response>,
  bodies: [] as Body[],
}

beforeAll(() => {
  state.server = Bun.serve({
    port: 0,
    async fetch(req) {
      const body = (await req.json()) as Body
      state.bodies.push(body)
      const next = state.handlers.shift()
      return next ? next(body) : new Response("unexpected request", { status: 500 })
    },
  })
})

beforeEach(() => {
  state.handlers.length = 0
  state.bodies.length = 0
})

afterAll(() => {
  void state.server?.stop()
})

function sse(chunks: unknown[], done = false) {
  const lines = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}`)
  if (done) lines.push("data: [DONE]")
  return new Response(lines.join("\n\n") + "\n\n", { status: 200, headers: { "Content-Type": "text/event-stream" } })
}

const responsesOk = () =>
  sse(
    [
      { type: "response.created", response: { id: "resp-1", created_at: 1, model: "test-model", service_tier: null } },
      { type: "response.output_text.delta", item_id: "item-1", delta: "Hello", logprobs: null },
      {
        type: "response.completed",
        response: {
          incomplete_details: null,
          usage: { input_tokens: 1, input_tokens_details: null, output_tokens: 1, output_tokens_details: null },
          service_tier: null,
        },
      },
    ],
    true,
  )

const anthropicStart = { type: "message_start", message: { id: "msg-1", model: "test-model", usage: { input_tokens: 3 } } }
const anthropicText = (index: number, text: string) => [
  { type: "content_block_start", index, content_block: { type: "text", text: "" } },
  { type: "content_block_delta", index, delta: { type: "text_delta", text } },
  { type: "content_block_stop", index },
]
const anthropicEnd = [
  { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 2 } },
  { type: "message_stop" },
]
const anthropicOk = () => sse([anthropicStart, ...anthropicText(0, "Hello"), ...anthropicEnd])

const rejected = (message: string) =>
  new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message } }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  })

const websearch = tool({
  description: "Search the web",
  inputSchema: jsonSchema({ type: "object", properties: { query: { type: "string" } } }),
  execute: async () => "client result",
})

const agent = {
  name: "test",
  mode: "primary",
  options: {},
  permission: [{ permission: "*", pattern: "*", action: "allow" }],
} satisfies Agent.Info

async function withProvider(
  npm: "@ai-sdk/openai" | "@ai-sdk/anthropic",
  websearchConfig: unknown,
  fn: (model: Provider.Model) => Promise<void>,
) {
  const server = state.server
  if (!server) throw new Error("Server not initialized")
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "mimocode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          enabled_providers: ["test"],
          ...(websearchConfig === undefined ? {} : { websearch: websearchConfig }),
          provider: {
            test: {
              name: "Test",
              npm,
              models: { "test-model": { name: "Test Model", tool_call: true, limit: { context: 128000, output: 4096 } } },
              options: { apiKey: "test-key", baseURL: `${server.url.origin}/v1` },
            },
          },
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const model = await AppRuntime.runPromise(
        Effect.gen(function* () {
          const provider = yield* Provider.Service
          return yield* provider.getModel(ProviderID.make("test"), ModelID.make("test-model"))
        }),
      )
      await fn(model)
    },
  })
}

function input(model: Provider.Model, sessionID: string, overrides: Partial<LLM.StreamInput> = {}): LLM.StreamInput {
  const id = SessionID.make(sessionID)
  const user = {
    id: MessageID.make(`user-${sessionID}`),
    sessionID: id,
    role: "user",
    time: { created: Date.now() },
    agent: agent.name,
    model: { providerID: model.providerID, modelID: model.id },
  } satisfies MessageV2.User
  return {
    user,
    sessionID: id,
    model,
    agent,
    system: ["You are a helpful assistant."],
    messages: [{ role: "user", content: "Search for bun" }],
    tools: { websearch },
    ...overrides,
  }
}

async function drain(value: LLM.StreamInput) {
  return llm.runPromise((svc) => svc.stream(value).pipe(Stream.runDrain, Effect.exit))
}

function toolsOf(body: Body) {
  return (body.tools as Array<Record<string, unknown>> | undefined) ?? []
}
const hasFunction = (body: Body, name: string) => toolsOf(body).some((item) => item.name === name && item.type !== "web_search")
const hasType = (body: Body, type: string) => toolsOf(body).some((item) => item.type === type)

const searchedHistory = (output: unknown): ModelMessage[] => [
  { role: "user", content: "Search for bun" },
  {
    role: "assistant",
    content: [
      { type: "tool-call", toolCallId: "srv_1", toolName: "web_search", input: { query: "bun latest" }, providerExecuted: true },
      // @ts-expect-error provider-executed results sit in assistant content
      { type: "tool-result", toolCallId: "srv_1", toolName: "web_search", output },
      { type: "text", text: "Bun 1.4.3" },
    ],
  },
  { role: "user", content: "And then?" },
]
const results = [{ type: "web_search_result", url: "https://example.com/a", title: "Alpha", pageAge: null, encryptedContent: "ENC" }]

describe("session.llm native web search", () => {
  test("responses request carries web_search and hides websearch", async () => {
    await withProvider("@ai-sdk/openai", { native: { test: true } }, async (model) => {
      state.handlers.push(responsesOk, responsesOk)
      await drain(input(model, "ses_native_inject"))
      await drain(input(model, "ses_native_inject", { ephemeral: true }))
      expect(hasType(state.bodies[0], "web_search")).toBe(true)
      expect(hasFunction(state.bodies[0], "websearch")).toBe(false)
      expect(hasType(state.bodies[1], "web_search")).toBe(false)
    })
  })

  test("no websearch config leaves payload unchanged", async () => {
    await withProvider("@ai-sdk/openai", undefined, async (model) => {
      state.handlers.push(responsesOk)
      await drain(input(model, "ses_native_off"))
      expect(hasType(state.bodies[0], "web_search")).toBe(false)
      expect(hasFunction(state.bodies[0], "websearch")).toBe(true)
    })
  })

  test("tool rejection retries once without native", async () => {
    await withProvider("@ai-sdk/openai", { native: { test: true } }, async (model) => {
      state.handlers.push(() => rejected("unsupported tool type web_search"), responsesOk)
      const exit = await drain(input(model, "ses_native_reject"))
      expect(exit._tag).toBe("Success")
      expect(state.bodies).toHaveLength(2)
      expect(hasType(state.bodies[0], "web_search")).toBe(true)
      expect(hasType(state.bodies[1], "web_search")).toBe(false)
      expect(hasFunction(state.bodies[1], "websearch")).toBe(true)
    })
  })

  test("max-candidate scope still falls back", async () => {
    await withProvider("@ai-sdk/openai", { native: { test: true } }, async (model) => {
      state.handlers.push(() => rejected("unsupported tool type web_search"), responsesOk)
      const exit = await drain(input(model, "ses_native_maxmode", { retryScope: "max-candidate" }))
      expect(exit._tag).toBe("Success")
      expect(state.bodies).toHaveLength(2)
      expect(hasFunction(state.bodies[1], "websearch")).toBe(true)
    })
  })

  test("replay rejection retries with text replay", async () => {
    await withProvider("@ai-sdk/anthropic", { native: { test: true } }, async (model) => {
      state.handlers.push(
        () => rejected("messages.1.content.0: Invalid `encrypted_content` in `search_result` block"),
        anthropicOk,
      )
      const exit = await drain(input(model, "ses_native_replay", { messages: searchedHistory({ type: "json", value: results }) }))
      expect(exit._tag).toBe("Success")
      expect(state.bodies).toHaveLength(2)
      const first = JSON.stringify(state.bodies[0].messages)
      expect(first).toContain("web_search_tool_result")
      expect(hasType(state.bodies[1], "web_search_20250305")).toBe(true)
      const second = JSON.stringify(state.bodies[1].messages)
      expect(second).not.toContain("web_search_tool_result")
      expect(second).not.toContain("server_tool_use")
      expect(second).toContain("[web_search] \\\"bun latest\\\"")
      expect(second).not.toContain("ENC")
    })
  })

  test("nonstandard stream block marks native failed", async () => {
    await withProvider("@ai-sdk/anthropic", { native: { test: true } }, async (model) => {
      state.handlers.push(
        () =>
          sse([
            anthropicStart,
            ...anthropicText(0, "Searching"),
            { type: "content_block_start", index: 1, content_block: { type: "tool_result", tool_use_id: "call_1", content: "[]" } },
            ...anthropicEnd,
          ]),
        anthropicOk,
      )
      await drain(input(model, "ses_native_block"))
      await drain(input(model, "ses_native_block"))
      expect(hasType(state.bodies[0], "web_search_20250305")).toBe(true)
      expect(hasType(state.bodies[1], "web_search_20250305")).toBe(false)
      expect(hasFunction(state.bodies[1], "websearch")).toBe(true)
    })
  })

  test("fallback after model switch replays as text", async () => {
    await withProvider("@ai-sdk/anthropic", { native: { test: true } }, async (model) => {
      state.handlers.push(anthropicOk)
      await drain(
        input(model, "ses_native_switch", {
          messages: searchedHistory({ type: "text", value: '[{"url":"https://example.com/a","encryptedContent":"ENC"}]' }),
        }),
      )
      expect(hasType(state.bodies[0], "web_search_20250305")).toBe(true)
      const sent = JSON.stringify(state.bodies[0].messages)
      expect(sent).not.toContain("server_tool_use")
      expect(sent).toContain("https://example.com/a")
      expect(sent).not.toContain("ENC")
    })
  })
})

describe("session.llm native web search preflight", () => {
  test("wireTools counts the provider tool the request will carry", async () => {
    await withProvider("@ai-sdk/openai", { native: { test: true } }, async (model) => {
      const wire = LLM.wireTools(input(model, "ses_native_preflight"), { native: { test: true } })
      expect(Object.keys(wire)).toEqual(["web_search"])
      const off = LLM.wireTools(input(model, "ses_native_preflight_off"), undefined)
      expect(Object.keys(off)).toEqual(["websearch"])
    })
  })
})
