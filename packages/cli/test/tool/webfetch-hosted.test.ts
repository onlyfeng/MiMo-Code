import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/unstable/http"
import path from "path"
import { Agent } from "../../src/agent/agent"
import { Auth } from "../../src/auth"
import { Config } from "../../src/config"
import { Provider } from "../../src/provider"
import { Truncate } from "../../src/tool"
import { Instance } from "../../src/project/instance"
import { WebFetchTool, retriesHosted } from "../../src/tool/webfetch"
import * as HostedFetch from "../../src/tool/webfetch-hosted/hosted"
import { SessionID, MessageID } from "../../src/session/schema"
import { tmpdir } from "../fixture/fixture"

const PAGE = "# Example Domain\n\nThis domain is for use in documentation examples."
const TARGET = "https://example.com/doc"

type Gateway = {
  // Anthropic Messages body for a model, or a status to fail with.
  messages?: Record<string, (url: string) => unknown>
  // Responses body for a model.
  responses?: Record<string, (url: string) => unknown>
}

const usage = { input_tokens: 1, output_tokens: 1 }

export const anthropicFetched = (url: string, data = PAGE) => ({
  type: "message",
  id: "msg_1",
  model: "test-claude",
  content: [
    { type: "server_tool_use", id: "srvtoolu_1", name: "web_fetch", input: { url } },
    {
      type: "web_fetch_tool_result",
      tool_use_id: "srvtoolu_1",
      content: {
        type: "web_fetch_result",
        url,
        retrieved_at: "2026-01-01T00:00:00Z",
        content: { type: "document", title: null, source: { type: "text", media_type: "text/plain", data } },
      },
    },
    { type: "text", text: "done" },
  ],
  stop_reason: "end_turn",
  usage,
})

const anthropicError = (url: string) => ({
  type: "message",
  id: "msg_1",
  model: "test-claude",
  content: [
    { type: "server_tool_use", id: "srvtoolu_1", name: "web_fetch", input: { url } },
    {
      type: "web_fetch_tool_result",
      tool_use_id: "srvtoolu_1",
      content: { type: "web_fetch_tool_result_error", error_code: "url_not_accessible" },
    },
    { type: "text", text: "could not fetch" },
  ],
  stop_reason: "end_turn",
  usage,
})

// The model answers from memory: plausible text, no fetch result.
const anthropicUnfetched = () => ({
  type: "message",
  id: "msg_1",
  model: "test-claude",
  content: [{ type: "text", text: "Example Domain" }],
  stop_reason: "end_turn",
  usage,
})

const responsesOpened = (url: string, text = "Digest: the page describes Example Domain.") => ({
  id: "resp_1",
  object: "response",
  created_at: 1,
  status: "completed",
  model: "test-digest",
  output: [
    { id: "ws_1", type: "web_search_call", status: "completed", action: { type: "open_page", url } },
    {
      id: "msg_1",
      type: "message",
      status: "completed",
      role: "assistant",
      content: [{ type: "output_text", text, annotations: [] }],
    },
  ],
  incomplete_details: null,
  usage: {
    input_tokens: 1,
    input_tokens_details: { cached_tokens: 0 },
    output_tokens: 1,
    output_tokens_details: { reasoning_tokens: 0 },
  },
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

const transportFailure = HttpClient.make((request) =>
  Effect.fail(
    new HttpClientError.HttpClientError({
      reason: new HttpClientError.TransportError({ request, cause: new Error("getaddrinfo ENOTFOUND") }),
    }),
  ),
)

const status = (code: number, body = "blocked") =>
  HttpClient.make((request) =>
    Effect.succeed(HttpClientResponse.fromWeb(request, new Response(body, { status: code }))),
  )

const ok = (body: string) =>
  HttpClient.make((request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(request, new Response(body, { status: 200, headers: { "content-type": "text/plain" } })),
    ),
  )

async function run(input: {
  gateway: Gateway
  webfetch?: unknown
  direct: HttpClient.HttpClient
  url?: string
  asks?: string[]
}) {
  const calls: Array<{ path: string; model: string; body: Record<string, unknown>; beta?: string }> = []
  using server = Bun.serve({
    port: 0,
    fetch: async (req) => {
      const body = (await req.json()) as Record<string, unknown>
      const model = String(body.model)
      const pathname = new URL(req.url).pathname
      calls.push({ path: pathname, model, body, beta: req.headers.get("anthropic-beta") ?? undefined })
      const url = input.url ?? TARGET
      const handler = pathname.endsWith("/messages") ? input.gateway.messages?.[model] : input.gateway.responses?.[model]
      if (!handler) return json({ error: { message: "unknown model" } }, 404)
      const result = handler(url)
      return result instanceof Response ? result : json(result)
    },
  })
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "mimocode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          ...(input.webfetch === undefined ? {} : { webfetch: input.webfetch }),
          provider: {
            "test-claude": {
              name: "Claude",
              npm: "@ai-sdk/anthropic",
              models: {
                "test-claude": {
                  name: "Claude",
                  tool_call: true,
                  limit: { context: 128000, output: 4096 },
                  variants: { low: { effort: "low" } },
                },
                "test-claude-2": { name: "Claude 2", tool_call: true, limit: { context: 128000, output: 4096 } },
              },
              options: { apiKey: "test-key", baseURL: `${server.url.origin}/v1` },
            },
            "test-digest": {
              name: "Digest",
              npm: "@ai-sdk/openai",
              models: { "test-digest": { name: "Digest", tool_call: true, limit: { context: 128000, output: 4096 } } },
              options: { apiKey: "test-key", baseURL: `${server.url.origin}/v1` },
            },
            "test-compat": {
              name: "Compat",
              npm: "@ai-sdk/openai-compatible",
              models: { "chat-model": { name: "Chat", tool_call: true, limit: { context: 128000, output: 4096 } } },
              options: { apiKey: "test-key", baseURL: `${server.url.origin}/v1` },
            },
          },
        }),
      )
    },
  })
  return await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const result = await WebFetchTool.pipe(
        Effect.flatMap((info) => info.init()),
        Effect.flatMap((tool) =>
          tool.execute(
            { url: input.url ?? TARGET, format: "markdown" },
            {
              sessionID: SessionID.make("ses_webfetch_hosted"),
              messageID: MessageID.make("message"),
              callID: "",
              agent: "build",
              abort: AbortSignal.any([]),
              messages: [],
              metadata: () => Effect.void,
              ask: (request) =>
                Effect.sync(() => {
                  input.asks?.push(...request.patterns)
                }),
            },
          ),
        ),
        Effect.provide(
          Layer.mergeAll(
            Truncate.defaultLayer,
            Agent.defaultLayer,
            Auth.defaultLayer,
            Config.defaultLayer,
            Provider.defaultLayer,
            // Last, so the direct route is this client and never the host network.
            Layer.succeed(HttpClient.HttpClient, input.direct),
          ),
        ),
        Effect.runPromise,
      ).then(
        (value) => ({ value, error: undefined }),
        (error: unknown) => ({ value: undefined, error: error instanceof Error ? error.message : String(error) }),
      )
      return { ...result, calls }
    },
  })
}

describe("tool.webfetch.hosted config", () => {
  test("entries parse strings and objects and drop malformed refs", () => {
    expect(
      HostedFetch.entries({
        hosted: ["a/b", { model: "c/org/d", variant: "low", max_content_tokens: 500 }, "bad", { model: "/x" }],
      }),
    ).toEqual([
      { providerID: "a", modelID: "b" },
      { providerID: "c", modelID: "org/d", variant: "low", maxContentTokens: 500 },
    ])
    expect(HostedFetch.entries(undefined)).toEqual([])
    expect(HostedFetch.first(undefined)).toBe("local")
    expect(HostedFetch.first({ first: "hosted" })).toBe("hosted")
  })

  test("config accepts the webfetch block and rejects bad values", async () => {
    expect(
      Config.Info.safeParse({
        webfetch: { first: "hosted", hosted: ["test/model", { model: "test/other", variant: "low", max_content_tokens: 8000 }] },
      }).success,
    ).toBe(true)
    expect(Config.Info.safeParse({ webfetch: { first: "remote" } }).success).toBe(false)
    expect(Config.Info.safeParse({ webfetch: { hosted: [{ model: "a/b", max_content_tokens: 0 }] } }).success).toBe(false)
  })

  test("retriesHosted takes transport failures and blocked statuses, not page answers", async () => {
    const statusError = async (code: number) =>
      Effect.runPromise(
        HttpClientResponse.filterStatusOk(
          HttpClientResponse.fromWeb(
            { method: "GET", url: TARGET } as never,
            new Response("", { status: code }),
          ),
        ).pipe(Effect.flip),
      )
    for (const code of [403, 429, 503]) expect(retriesHosted(await statusError(code))).toBe(true)
    for (const code of [404, 410, 400, 401]) expect(retriesHosted(await statusError(code))).toBe(false)
    expect(retriesHosted(new Error("Request timed out"))).toBe(true)
    expect(retriesHosted(new Error("Response too large (exceeds 5MB limit)"))).toBe(false)
  })
})

describe("tool.webfetch.hosted chain", () => {
  test("without a webfetch block a failing direct fetch fails as before", async () => {
    const { error, calls } = await run({ gateway: { messages: { "test-claude": anthropicFetched } }, direct: transportFailure })
    expect(error).toContain("Transport error")
    expect(calls).toEqual([])
  })

  test("a successful direct fetch never asks the gateway", async () => {
    const { value, calls } = await run({
      gateway: { messages: { "test-claude": anthropicFetched } },
      webfetch: { hosted: ["test-claude/test-claude"] },
      direct: ok("direct page"),
    })
    expect(value?.output).toBe("direct page")
    expect(value?.metadata).toMatchObject({ servedBy: "direct" })
    expect(calls).toEqual([])
  })

  test("a transport failure falls to the first hosted model, which returns the page text", async () => {
    const asks: string[] = []
    const { value, calls } = await run({
      gateway: { messages: { "test-claude": anthropicFetched } },
      webfetch: { hosted: [{ model: "test-claude/test-claude", variant: "low", max_content_tokens: 1234 }] },
      direct: transportFailure,
      asks,
    })
    expect(value?.output).toBe(PAGE)
    expect(value?.metadata).toMatchObject({ servedBy: "test-claude/test-claude", hosted: "text" })
    expect(asks).toEqual([TARGET])
    expect(calls).toHaveLength(1)
    expect(calls[0].path).toBe("/v1/messages")
    expect(calls[0].beta).toContain("web-fetch-2025-09-10")
    const tools = calls[0].body.tools as Array<Record<string, unknown>>
    expect(tools).toEqual([expect.objectContaining({ type: "web_fetch_20250910", name: "web_fetch", max_uses: 1, max_content_tokens: 1234 })])
    expect(calls[0].body.tool_choice).toMatchObject({ type: "auto" })
  })

  test("a hosted reply without a fetch result is a failure, not the page", async () => {
    const { value, calls } = await run({
      gateway: { messages: { "test-claude": anthropicUnfetched, "test-claude-2": anthropicFetched } },
      webfetch: { hosted: ["test-claude/test-claude", "test-claude/test-claude-2"] },
      direct: transportFailure,
    })
    expect(calls.map((call) => call.model)).toEqual(["test-claude", "test-claude-2"])
    expect(value?.output).toBe(PAGE)
    expect(value?.metadata).toMatchObject({ servedBy: "test-claude/test-claude-2" })
  })

  test("a fetch of another URL is a failure", async () => {
    const { error } = await run({
      gateway: { messages: { "test-claude": () => anthropicFetched("https://other.example/") } },
      webfetch: { hosted: ["test-claude/test-claude"] },
      direct: transportFailure,
    })
    expect(error).toContain("web_fetch returned another URL")
  })

  test("order: text, then digest, which is labelled as a digest", async () => {
    const { value, calls } = await run({
      gateway: { messages: { "test-claude": anthropicError }, responses: { "test-digest": responsesOpened } },
      webfetch: { hosted: ["test-claude/test-claude", "test-digest/test-digest"] },
      direct: transportFailure,
    })
    expect(calls.map((call) => call.path)).toEqual(["/v1/messages", "/v1/responses"])
    expect(value?.output).toStartWith(`[Model digest of ${TARGET} by test-digest/test-digest; not the page's own text]`)
    expect(value?.output).toContain("Digest: the page describes Example Domain.")
    expect(value?.metadata).toMatchObject({ servedBy: "test-digest/test-digest", hosted: "digest" })
    const tools = calls[1].body.tools as Array<Record<string, unknown>>
    expect(tools[0]).toMatchObject({ type: "web_search", external_web_access: true })
    // Grok's Responses gateway rejects search_context_size.
    expect(tools[0]).not.toHaveProperty("search_context_size")
  })

  test("a digest reply without an open_page of the URL is a failure", async () => {
    const searchedOnly = (url: string) => {
      const body = responsesOpened(url)
      body.output[0] = { id: "ws_1", type: "web_search_call", status: "completed", action: { type: "search", query: "x" } } as never
      return body
    }
    const { error } = await run({
      gateway: { responses: { "test-digest": searchedOnly } },
      webfetch: { hosted: ["test-digest/test-digest"] },
      direct: transportFailure,
    })
    expect(error).toContain("no open_page result for the URL")
  })

  test("all routes failing reports the direct error first, then each hosted reason", async () => {
    const { error } = await run({
      gateway: { messages: { "test-claude": anthropicError } },
      webfetch: { hosted: ["test-claude/test-claude", "test-claude/missing", "test-compat/chat-model"] },
      direct: transportFailure,
    })
    const lines = (error ?? "").split("\n")
    expect(lines[0]).toContain("Transport error")
    expect(lines.slice(1)).toEqual([
      "- hosted test-claude/test-claude: web_fetch url_not_accessible",
      "- hosted test-claude/missing: not a usable hosted fetch model",
      "- hosted test-compat/chat-model: not a usable hosted fetch model",
    ])
  })

  test("a page's own 404 is not retried on the gateway", async () => {
    const { error, calls } = await run({
      gateway: { messages: { "test-claude": anthropicFetched } },
      webfetch: { hosted: ["test-claude/test-claude"] },
      direct: status(404),
    })
    expect(error).toContain("404")
    expect(calls).toEqual([])
  })

  test("a blocked 403 is retried on the gateway", async () => {
    const { value } = await run({
      gateway: { messages: { "test-claude": anthropicFetched } },
      webfetch: { hosted: ["test-claude/test-claude"] },
      direct: status(403),
    })
    expect(value?.metadata).toMatchObject({ servedBy: "test-claude/test-claude" })
  })

  test("a private target never reaches the gateway", async () => {
    const url = "http://192.168.1.1/wiki"
    const { error, calls } = await run({
      gateway: { messages: { "test-claude": anthropicFetched } },
      webfetch: { first: "hosted", hosted: ["test-claude/test-claude"] },
      direct: transportFailure,
      url,
    })
    expect(error).toContain("Transport error")
    expect(calls).toEqual([])
  })

  test("first: hosted asks the gateway before the direct fetch", async () => {
    let directCalls = 0
    const direct = HttpClient.make((request) =>
      Effect.sync(() => {
        directCalls++
        return HttpClientResponse.fromWeb(request, new Response("direct page", { status: 200 }))
      }),
    )
    const { value } = await run({
      gateway: { messages: { "test-claude": anthropicFetched } },
      webfetch: { first: "hosted", hosted: ["test-claude/test-claude"] },
      direct,
      url: "https://93.184.215.14/doc",
    })
    expect(value?.metadata).toMatchObject({ servedBy: "test-claude/test-claude" })
    expect(directCalls).toBe(0)
  })

  test("first: hosted falls back to direct and lists the hosted reasons ahead of its error", async () => {
    const { error } = await run({
      gateway: { messages: { "test-claude": anthropicError } },
      webfetch: { first: "hosted", hosted: ["test-claude/test-claude"] },
      direct: transportFailure,
      url: "https://93.184.215.14/doc",
    })
    const lines = (error ?? "").split("\n")
    expect(lines[0]).toBe("hosted test-claude/test-claude: web_fetch url_not_accessible")
    expect(lines[1]).toStartWith("- direct: Transport error")
  })
})
