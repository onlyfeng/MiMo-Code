import { describe, expect, test } from "bun:test"
import { APICallError, jsonSchema, tool } from "ai"
import { TypeValidationError, type LanguageModelV3Prompt, type LanguageModelV3ToolResultOutput } from "@ai-sdk/provider"
import type { Permission } from "../../src/permission"
import * as NativeWebSearch from "../../src/tool/websearch/native"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { ProviderTest } from "../fake/provider"

function model(npm = "@ai-sdk/openai", providerID = "test", id = "model") {
  return ProviderTest.model({
    id: ModelID.make(id),
    providerID: ProviderID.make(providerID),
    api: { id, url: "https://example.com", npm },
  })
}

describe("websearch.native.route", () => {
  test("provider key enables every model of that provider", () => {
    expect(NativeWebSearch.route({ native: { test: true } }, model())).toEqual({ replay: "native" })
    expect(NativeWebSearch.route({ native: { test: true } }, model("@ai-sdk/anthropic", "test", "other"))).toEqual({
      replay: "native",
    })
  })

  test("provider/model key overrides provider key", () => {
    expect(NativeWebSearch.route({ native: { test: true, "test/model": false } }, model())).toBeUndefined()
    expect(NativeWebSearch.route({ native: { "test/model": { replay: "text" } } }, model())).toEqual({
      replay: "text",
    })
    expect(NativeWebSearch.route({ native: { test: false, "test/model": true } }, model())).toEqual({
      replay: "native",
    })
  })

  test("unsupported sdk is ignored", () => {
    expect(NativeWebSearch.route({ native: { test: true } }, model("@ai-sdk/openai-compatible"))).toBeUndefined()
  })

  test("no config means no route", () => {
    expect(NativeWebSearch.route(undefined, model())).toBeUndefined()
    expect(NativeWebSearch.route({}, model())).toBeUndefined()
    expect(NativeWebSearch.route({ native: { other: true } }, model())).toBeUndefined()
  })

  test("fallbackEntries parses strings and objects", () => {
    expect(
      NativeWebSearch.fallbackEntries({ fallback: ["test/model", { model: "test/other", variant: "low" }, "bad"] }),
    ).toEqual([
      { providerID: "test", modelID: "model" },
      { providerID: "test", modelID: "other", variant: "low" },
    ])
    expect(NativeWebSearch.fallbackEntries(undefined)).toEqual([])
  })

  test("model ids may contain slashes after the provider", () => {
    expect(NativeWebSearch.fallbackEntries({ fallback: ["test/org/model"] })).toEqual([
      { providerID: "test", modelID: "org/model" },
    ])
  })

  test("exposed", () => {
    expect(NativeWebSearch.exposed(undefined)).toBe(false)
    expect(NativeWebSearch.exposed({ native: { test: false } })).toBe(false)
    expect(NativeWebSearch.exposed({ fallback: [] })).toBe(false)
    expect(NativeWebSearch.exposed({ fallback: ["test/model"] })).toBe(true)
    expect(NativeWebSearch.exposed({ native: { "test/model": { replay: "text" } } })).toBe(true)
  })
})

describe("websearch.config", () => {
  test("config accepts the websearch block", async () => {
    const { Config } = await import("../../src/config")
    const parsed = Config.Info.safeParse({
      websearch: {
        native: { test: true, "test/model": { replay: "text" }, "test/other": false },
        fallback: ["test/model", { model: "test/other", variant: "low" }],
      },
    })
    expect(parsed.success).toBe(true)
    expect(Config.Info.safeParse({ websearch: { native: { test: "yes" } } }).success).toBe(false)
  })
})

describe("websearch.native.runtime", () => {
  const settings = { native: { test: true } }
  const allow: Permission.Ruleset = [{ permission: "*", pattern: "*", action: "allow" }]
  const websearch = tool({
    description: "client search",
    inputSchema: jsonSchema({ type: "object", properties: { query: { type: "string" } } }),
    execute: async () => "client",
  })
  const read = tool({
    description: "read",
    inputSchema: jsonSchema({ type: "object", properties: {} }),
    execute: async () => "read",
  })
  const apiError = (statusCode: number, body: string) =>
    new APICallError({
      message: body,
      url: "https://example.com/v1/messages",
      requestBodyValues: {},
      statusCode,
      responseBody: body,
    })
  const before = { beforeOutput: true, nativeActive: true }

  test("marks once per session and model", () => {
    const m = model()
    expect(NativeWebSearch.mark("ses_mark", m, "search", "first")).toBe(true)
    expect(NativeWebSearch.mark("ses_mark", m, "search", "again")).toBe(false)
    expect(NativeWebSearch.failures("ses_mark", m)).toEqual({ search: "first" })
    expect(NativeWebSearch.failures("ses_other", m)).toEqual({})
    expect(NativeWebSearch.failures("ses_mark", model("@ai-sdk/openai", "test", "second"))).toEqual({})
  })

  test("replay rejection", () => {
    const error = apiError(400, "messages.1.content.0: Invalid `encrypted_content` in `search_result` block")
    expect(NativeWebSearch.classifyError(error, before)?.kind).toBe("replay")
  })

  test("tool rejection", () => {
    expect(NativeWebSearch.classifyError(apiError(400, "unsupported tool type: web_search_20250305"), before)?.kind).toBe(
      "search",
    )
    expect(NativeWebSearch.classifyError(apiError(422, '{"error":"tools[3].type web_search is invalid"}'), before)?.kind).toBe(
      "search",
    )
  })

  test("nonstandard stream block", () => {
    const error = new TypeValidationError({
      value: { type: "content_block_start", index: 4, content_block: { type: "tool_result", tool_use_id: "call_1" } },
      cause: new Error("invalid union"),
    })
    expect(NativeWebSearch.classifyError(error, { beforeOutput: false, nativeActive: true })?.kind).toBe("search")
  })

  test("hang before output", () => {
    const timeout = Object.assign(new Error("Response header timed out after 60000ms"), { code: "ETIMEDOUT" })
    expect(NativeWebSearch.classifyError(timeout, before)?.kind).toBe("search")
    expect(NativeWebSearch.classifyError(new Error("Request timed out"), before)?.kind).toBe("search")
    expect(NativeWebSearch.classifyError(timeout, { beforeOutput: false, nativeActive: true })).toBeUndefined()
  })

  test("abort is not a search failure", () => {
    expect(NativeWebSearch.classifyError(new DOMException("Aborted", "AbortError"), before)).toBeUndefined()
  })

  test("auth and rate limits are not search failures", () => {
    expect(NativeWebSearch.classifyError(apiError(401, "invalid api key for web_search"), before)).toBeUndefined()
    expect(NativeWebSearch.classifyError(apiError(429, "rate limited web_search"), before)).toBeUndefined()
    expect(NativeWebSearch.classifyError(apiError(400, "insufficient_quota web_search"), before)).toBeUndefined()
  })

  test("inactive native never classifies", () => {
    expect(
      NativeWebSearch.classifyError(apiError(400, "unsupported tool type: web_search_20250305"), {
        beforeOutput: true,
        nativeActive: false,
      }),
    ).toBeUndefined()
  })

  test("classifyEvent", () => {
    expect(
      NativeWebSearch.classifyEvent({
        type: "tool-result",
        toolName: "web_search",
        providerExecuted: true,
        output: { type: "web_search_tool_result_error", errorCode: "unavailable" },
      }),
    ).toContain("unavailable")
    expect(
      NativeWebSearch.classifyEvent({ type: "tool-error", toolName: "web_search", providerExecuted: true, error: "boom" }),
    ).toBeDefined()
    expect(
      NativeWebSearch.classifyEvent({
        type: "tool-result",
        toolName: "web_search",
        providerExecuted: true,
        output: [{ type: "web_search_result", url: "https://example.com/a", title: "A", encryptedContent: "ENC" }],
      }),
    ).toBeUndefined()
    expect(NativeWebSearch.classifyEvent({ type: "tool-error", toolName: "read", error: "boom" })).toBeUndefined()
  })

  const baseApply = (m: ReturnType<typeof model>, overrides: Partial<Parameters<typeof NativeWebSearch.apply>[0]> = {}) =>
    NativeWebSearch.apply({
      settings,
      model: m,
      sessionID: "ses_apply",
      ruleset: allow,
      tools: { websearch, read },
      activeTools: ["websearch", "read"],
      ...overrides,
    })

  test("apply injects provider tool and hides websearch", () => {
    const result = baseApply(model())
    expect(result.route).toEqual({ replay: "native" })
    expect(result.activeTools).toEqual(["read", "web_search"])
    expect(result.tools.web_search?.type).toBe("provider")
    expect((result.tools.web_search as { id?: string }).id).toBe("openai.web_search")
    expect(result.tools.websearch).toBe(websearch)
    const anthropic = baseApply(model("@ai-sdk/anthropic"), { sessionID: "ses_apply_anthropic" })
    expect((anthropic.tools.web_search as { id?: string }).id).toBe("anthropic.web_search_20250305")
  })

  test("apply keeps websearch reachable through exec when it is not a top-level tool", () => {
    const result = baseApply(model(), { sessionID: "ses_apply_exec", activeTools: ["read"] })
    expect(result.activeTools).toEqual(["read", "web_search"])
  })

  test("apply skips", () => {
    const m = model()
    const unchanged = (result: ReturnType<typeof NativeWebSearch.apply>) => {
      expect(result.route).toBeUndefined()
      expect(result.activeTools).toEqual(["websearch", "read"])
      expect(result.tools.web_search).toBeUndefined()
    }
    unchanged(baseApply(m, { ephemeral: true }))
    unchanged(baseApply(m, { small: true }))
    unchanged(baseApply(m, { settings: undefined }))
    unchanged(
      baseApply(m, {
        ruleset: [...allow, { permission: "websearch", pattern: "*", action: "ask" }],
      }),
    )
    const noClient = baseApply(m, { tools: { read }, activeTools: ["read"] })
    expect(noClient.route).toBeUndefined()
    expect(noClient.activeTools).toEqual(["read"])
    NativeWebSearch.mark("ses_apply_marked", m, "search", "broken")
    unchanged(baseApply(m, { sessionID: "ses_apply_marked" }))
  })

  test("apply skips when a query-specific rule is not allow", () => {
    const m = model()
    for (const action of ["deny", "ask"] as const) {
      const result = baseApply(m, {
        sessionID: `ses_apply_scoped_${action}`,
        ruleset: [...allow, { permission: "websearch", pattern: "internal*", action }],
      })
      expect(result.route).toBeUndefined()
      expect(result.activeTools).toEqual(["websearch", "read"])
    }
  })

  test("apply injects when a later universal allow overrides a scoped rule", () => {
    const result = baseApply(model(), {
      sessionID: "ses_apply_scoped_overridden",
      ruleset: [
        { permission: "websearch", pattern: "internal*", action: "deny" },
        { permission: "websearch", pattern: "*", action: "allow" },
      ],
    })
    expect(result.route).toEqual({ replay: "native" })
  })

  test("apply keeps native after replay mark", () => {
    const m = model()
    NativeWebSearch.mark("ses_apply_replay", m, "replay", "rejected")
    const result = baseApply(m, { sessionID: "ses_apply_replay" })
    expect(result.route).toEqual({ replay: "text" })
    expect(result.activeTools).toContain("web_search")
  })
})

describe("websearch.native.replay", () => {
  const anthropicResults = [
    { type: "web_search_result", url: "https://example.com/a", title: "Alpha", pageAge: null, encryptedContent: "ENC" },
    { type: "web_search_result", url: "https://example.com/b", title: null, pageAge: null, encryptedContent: "ENC" },
  ]
  const conversation = (output: LanguageModelV3ToolResultOutput): LanguageModelV3Prompt => [
    { role: "user", content: [{ type: "text", text: "search" }] },
    {
      role: "assistant",
      content: [
        { type: "text", text: "Looking." },
        { type: "tool-call", toolCallId: "srv_1", toolName: "web_search", input: { query: "bun latest" }, providerExecuted: true },
        { type: "tool-result", toolCallId: "srv_1", toolName: "web_search", output },
        { type: "text", text: "Done." },
      ],
    },
    { role: "user", content: [{ type: "text", text: "next" }] },
  ]
  const assistantText = (prompt: LanguageModelV3Prompt) => {
    const message = prompt[1]
    if (message.role !== "assistant") throw new Error("expected assistant")
    return message.content
  }

  test("keeps native replay when allowed", () => {
    const prompt = conversation({ type: "json", value: anthropicResults })
    expect(NativeWebSearch.downgradeReplay(prompt, true)).toBe(prompt)
  })

  test("downgrades when native is off", () => {
    const content = assistantText(NativeWebSearch.downgradeReplay(conversation({ type: "json", value: anthropicResults }), false))
    expect(content.map((part) => part.type)).toEqual(["text", "text", "text"])
    const text = content[1].type === "text" ? content[1].text : ""
    expect(text.startsWith('[web_search] "bun latest"')).toBe(true)
    expect(text).toContain("1. Alpha — https://example.com/a")
    expect(text).toContain("2. https://example.com/b")
    expect(text).not.toContain("https://example.com/b — https://example.com/b")
    expect(text).not.toContain("ENC")
  })

  test("downgrades text output even when native is allowed", () => {
    const content = assistantText(
      NativeWebSearch.downgradeReplay(conversation({ type: "text", value: '[{"url":"https://example.com/a","encryptedContent":"ENC"}]' }), true),
    )
    expect(content.some((part) => part.type === "tool-call" || part.type === "tool-result")).toBe(false)
    const text = content[1].type === "text" ? content[1].text : ""
    expect(text).toContain("https://example.com/a")
    expect(text).not.toContain("ENC")
  })

  test("openai action shape", () => {
    const prompt: LanguageModelV3Prompt = [
      {
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: "ws_1", toolName: "web_search", input: {}, providerExecuted: true },
          {
            type: "tool-result",
            toolCallId: "ws_1",
            toolName: "web_search",
            output: {
              type: "json",
              value: { action: { type: "search", query: "q" }, sources: [{ type: "url", url: "https://example.com/b" }] },
            },
          },
        ],
      },
    ]
    const message = NativeWebSearch.downgradeReplay(prompt, false)[0]
    const text = message.role === "assistant" && message.content[0].type === "text" ? message.content[0].text : ""
    expect(text).toContain('"q"')
    expect(text).toContain("https://example.com/b")
  })

  test("error output and client tools", () => {
    const prompt = conversation({ type: "json", value: { type: "web_search_tool_result_error", errorCode: "unavailable" } })
    const content = assistantText(NativeWebSearch.downgradeReplay(prompt, false))
    expect(content[1].type === "text" ? content[1].text : "").toBe('[web_search] "bun latest" failed: unavailable')
    const client: LanguageModelV3Prompt = [
      {
        role: "assistant",
        content: [{ type: "tool-call", toolCallId: "c1", toolName: "websearch", input: { query: "x" } }],
      },
    ]
    expect(NativeWebSearch.downgradeReplay(client, false)).toBe(client)
  })

  test("display", () => {
    expect(NativeWebSearch.display(anthropicResults, { query: "bun latest" })).toBe(
      '[web_search] "bun latest"\n1. Alpha — https://example.com/a\n2. https://example.com/b',
    )
    expect(NativeWebSearch.display({ type: "web_search_tool_result_error", errorCode: "unavailable" })).toBe(
      "[web_search] failed: unavailable",
    )
    expect(NativeWebSearch.display({ action: { type: "search", query: "q" }, sources: [] })).toBe('[web_search] "q"')
    expect(NativeWebSearch.display({ action: { type: "openPage", url: "https://example.com/p" } })).toBe(
      "[web_search] openPage\n1. https://example.com/p",
    )
    expect(NativeWebSearch.display("plain")).toBeUndefined()
  })
})
