import { describe, expect } from "bun:test"
import { Cause, Effect, Exit, Layer } from "effect"
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/unstable/http"
import { Agent } from "../../src/agent/agent"
import { Auth } from "../../src/auth"
import { Config } from "../../src/config"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Permission } from "../../src/permission"
import { Provider } from "../../src/provider"
import { Truncate } from "../../src/tool"
import { WebFetchTool, hostedTimeout, retriesHosted } from "../../src/tool/webfetch"
import * as HostedFetch from "../../src/tool/webfetch-hosted/hosted"
import { SessionID, MessageID } from "../../src/session/schema"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(
  Layer.mergeAll(
    CrossSpawnSpawner.defaultLayer,
    Truncate.defaultLayer,
    Agent.defaultLayer,
    Auth.defaultLayer,
    Config.defaultLayer,
    Provider.defaultLayer,
  ),
)

const PAGE = "# Example Domain\n\nThis domain is for use in documentation examples."
const TARGET = "https://example.com/doc"

type Gateway = {
  // Anthropic Messages body for a model, or a status to fail with.
  messages?: Record<string, (url: string) => unknown>
  // Responses body for a model.
  responses?: Record<string, (url: string) => unknown>
}

type Call = { path: string; model: string; body: Record<string, unknown>; beta?: string }

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

// A local gateway answering Messages and Responses requests by model, stopped with the test scope.
const serveGateway = (gateway: Gateway, url: string) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const calls: Call[] = []
      const server = Bun.serve({
        port: 0,
        fetch: async (req) => {
          const body = (await req.json()) as Record<string, unknown>
          const model = String(body.model)
          const pathname = new URL(req.url).pathname
          calls.push({ path: pathname, model, body, beta: req.headers.get("anthropic-beta") ?? undefined })
          const handler = pathname.endsWith("/messages") ? gateway.messages?.[model] : gateway.responses?.[model]
          if (!handler) return json({ error: { message: "unknown model" } }, 404)
          const result = await handler(url)
          return result instanceof Response ? result : json(result)
        },
      })
      return { server, calls }
    }),
    ({ server }) => Effect.promise(() => server.stop(true)),
  )

const providers = (origin: string): Config.Info["provider"] => ({
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
    options: { apiKey: "test-key", baseURL: `${origin}/v1` },
  },
  "test-digest": {
    name: "Digest",
    npm: "@ai-sdk/openai",
    models: { "test-digest": { name: "Digest", tool_call: true, limit: { context: 128000, output: 4096 } } },
    options: { apiKey: "test-key", baseURL: `${origin}/v1` },
  },
  "test-compat": {
    name: "Compat",
    npm: "@ai-sdk/openai-compatible",
    models: { "chat-model": { name: "Chat", tool_call: true, limit: { context: 128000, output: 4096 } } },
    options: { apiKey: "test-key", baseURL: `${origin}/v1` },
  },
})

const run = (input: {
  gateway: Gateway
  webfetch?: Config.Info["webfetch"]
  direct: HttpClient.HttpClient
  url?: string
  // The caller's timeout in seconds.
  timeout?: number
  asks?: string[]
  // A pattern the user rejects when asked.
  reject?: string
}) =>
  Effect.gen(function* () {
    const url = input.url ?? TARGET
    const { server, calls } = yield* serveGateway(input.gateway, url)
    const exit = yield* provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const info = yield* WebFetchTool
          const tool = yield* info.init()
          return yield* Effect.exit(
            tool.execute(
              { url, format: "markdown", timeout: input.timeout },
              {
                sessionID: SessionID.make("ses_webfetch_hosted"),
                messageID: MessageID.make("message"),
                callID: "",
                agent: "build",
                abort: AbortSignal.any([]),
                messages: [],
                metadata: () => Effect.void,
                ask: (request) =>
                  request.patterns.includes(input.reject ?? "")
                    ? Effect.die(new Permission.RejectedError())
                    : Effect.sync(() => {
                        input.asks?.push(...request.patterns)
                      }),
              },
            ),
          )
          // The direct route is this client and never the host network.
        }).pipe(Effect.provideService(HttpClient.HttpClient, input.direct)),
      {
        git: true,
        config: {
          ...(input.webfetch === undefined ? {} : { webfetch: input.webfetch }),
          provider: providers(server.url.origin),
        },
      },
    )
    if (Exit.isSuccess(exit)) return { value: exit.value, error: undefined, raw: undefined, calls }
    const raw = Cause.squash(exit.cause)
    return { value: undefined, error: raw instanceof Error ? raw.message : String(raw), raw, calls }
  })

describe("tool.webfetch.hosted config", () => {
  it.effect("entries parse strings and objects and drop malformed refs", () =>
    Effect.sync(() => {
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
    }),
  )

  it.effect("config accepts the webfetch block and rejects bad values", () =>
    Effect.sync(() => {
      expect(
        Config.Info.safeParse({
          webfetch: {
            first: "hosted",
            hosted: ["test/model", { model: "test/other", variant: "low", max_content_tokens: 8000 }],
          },
        }).success,
      ).toBe(true)
      expect(Config.Info.safeParse({ webfetch: { first: "remote" } }).success).toBe(false)
      expect(Config.Info.safeParse({ webfetch: { hosted: [{ model: "a/b", max_content_tokens: 0 }] } }).success).toBe(
        false,
      )
    }),
  )

  it.effect("retriesHosted takes transport failures and blocked statuses, not page answers", () =>
    Effect.gen(function* () {
      const statusError = (code: number) =>
        HttpClientResponse.filterStatusOk(
          HttpClientResponse.fromWeb({ method: "GET", url: TARGET } as never, new Response("", { status: code })),
        ).pipe(Effect.flip)
      for (const code of [403, 429, 503]) expect(retriesHosted(yield* statusError(code))).toBe(true)
      for (const code of [404, 410, 400, 401]) expect(retriesHosted(yield* statusError(code))).toBe(false)
      expect(retriesHosted(new Error("Request timed out"))).toBe(true)
      expect(retriesHosted(new Error("Response too large (exceeds 5MB limit)"))).toBe(false)
    }),
  )

  it.effect("hostedTimeout takes the caller's timeout, else the hosted default", () =>
    Effect.sync(() => {
      expect(hostedTimeout(undefined)).toBe(90_000)
      expect(hostedTimeout(0)).toBe(90_000)
      expect(hostedTimeout(-5000)).toBe(90_000)
      expect(hostedTimeout(1500.2)).toBe(1501)
      expect(hostedTimeout(5000)).toBe(5000)
    }),
  )

  it.effect("a fetch result naming no URL is a failure", () =>
    Effect.sync(() => {
      const result = HostedFetch.extract("text", TARGET, [
        {
          type: "tool-result",
          toolCallId: "srvtoolu_1",
          toolName: "web_fetch",
          input: { url: TARGET },
          output: {
            type: "web_fetch_result",
            content: { type: "document", title: null, source: { type: "text", mediaType: "text/plain", data: PAGE } },
          },
          providerExecuted: true,
        } as never,
      ])
      expect(result).toEqual({ reason: "web_fetch returned no URL" })
    }),
  )

  it.effect("the URL proof tolerates only normalization and an https upgrade", () =>
    Effect.sync(() => {
      const fetched = (echo: string) =>
        ({
          type: "tool-result",
          toolCallId: "srvtoolu_1",
          toolName: "web_fetch",
          input: { url: echo },
          output: {
            type: "web_fetch_result",
            url: echo,
            content: { type: "document", title: null, source: { type: "text", mediaType: "text/plain", data: PAGE } },
          },
          providerExecuted: true,
        }) as never
      const opened = (echo: string) => [
        {
          type: "tool-result",
          toolCallId: "ws_1",
          toolName: "web_search",
          input: {},
          output: { action: { type: "openPage", url: echo } },
          providerExecuted: true,
        } as never,
        { type: "text", text: "digest" } as never,
      ]
      const accepted = (result: unknown) => expect(result).toMatchObject({ output: expect.any(String) })
      const rejected = (result: unknown) => expect(result).toMatchObject({ reason: expect.stringContaining("") })

      // Host case, default port and an empty path name the same resource.
      accepted(HostedFetch.extract("text", "https://example.com", [fetched("https://EXAMPLE.com:443/")]))
      // Responses open_page was observed opening an http request over https.
      accepted(HostedFetch.extract("digest", "http://example.com/doc", opened("https://example.com/doc")))
      accepted(HostedFetch.extract("text", "https://example.com/doc#part", [fetched("https://example.com/doc")]))

      rejected(HostedFetch.extract("text", "https://example.com/account", [fetched("http://example.com/account")]))
      rejected(HostedFetch.extract("text", "https://example.com/account", [fetched("https://example.com/account/")]))
      rejected(HostedFetch.extract("text", "https://user@example.com/doc", [fetched("https://example.com/doc")]))
      rejected(HostedFetch.extract("text", "https://example.com/doc?a=1", [fetched("https://example.com/doc?a=2")]))
      rejected(HostedFetch.extract("digest", "https://example.com/account", opened("http://example.com/account/")))
    }),
  )
})

describe("tool.webfetch.hosted chain", () => {
  it.live("without a webfetch block a failing direct fetch fails as before", () =>
    Effect.gen(function* () {
      const { error, calls } = yield* run({
        gateway: { messages: { "test-claude": anthropicFetched } },
        direct: transportFailure,
      })
      expect(error).toContain("Transport error")
      expect(calls).toEqual([])
    }),
  )

  it.live("a successful direct fetch never asks the gateway", () =>
    Effect.gen(function* () {
      const { value, calls } = yield* run({
        gateway: { messages: { "test-claude": anthropicFetched } },
        webfetch: { hosted: ["test-claude/test-claude"] },
        direct: ok("direct page"),
      })
      expect(value?.output).toBe("direct page")
      expect(value?.metadata).toMatchObject({ servedBy: "direct" })
      expect(calls).toEqual([])
    }),
  )

  it.live("a transport failure falls to the first hosted model, which returns the page text", () =>
    Effect.gen(function* () {
      const asks: string[] = []
      const { value, calls } = yield* run({
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
      expect(tools).toEqual([
        expect.objectContaining({ type: "web_fetch_20250910", name: "web_fetch", max_uses: 1, max_content_tokens: 1234 }),
      ])
      expect(calls[0].body.tool_choice).toMatchObject({ type: "auto" })
    }),
  )

  it.live("a hosted reply without a fetch result is a failure, not the page", () =>
    Effect.gen(function* () {
      const { value, calls } = yield* run({
        gateway: { messages: { "test-claude": anthropicUnfetched, "test-claude-2": anthropicFetched } },
        webfetch: { hosted: ["test-claude/test-claude", "test-claude/test-claude-2"] },
        direct: transportFailure,
      })
      expect(calls.map((call) => call.model)).toEqual(["test-claude", "test-claude-2"])
      expect(value?.output).toBe(PAGE)
      expect(value?.metadata).toMatchObject({ servedBy: "test-claude/test-claude-2" })
    }),
  )

  it.live("a fetch of another URL is a failure", () =>
    Effect.gen(function* () {
      const { error } = yield* run({
        gateway: { messages: { "test-claude": () => anthropicFetched("https://other.example/") } },
        webfetch: { hosted: ["test-claude/test-claude"] },
        direct: transportFailure,
      })
      expect(error).toContain("web_fetch returned another URL")
    }),
  )

  it.live("order: text, then digest, which is labelled as a digest", () =>
    Effect.gen(function* () {
      const { value, calls } = yield* run({
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
    }),
  )

  it.live("a digest reply without an open_page of the URL is a failure", () =>
    Effect.gen(function* () {
      const searchedOnly = (url: string) => {
        const body = responsesOpened(url)
        body.output[0] = { id: "ws_1", type: "web_search_call", status: "completed", action: { type: "search", query: "x" } } as never
        return body
      }
      const { error } = yield* run({
        gateway: { responses: { "test-digest": searchedOnly } },
        webfetch: { hosted: ["test-digest/test-digest"] },
        direct: transportFailure,
      })
      expect(error).toContain("no open_page result for the URL")
    }),
  )

  it.live("all routes failing reports the direct error first, then each hosted reason", () =>
    Effect.gen(function* () {
      const { error } = yield* run({
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
    }),
  )

  it.live("a page's own 404 is not retried on the gateway", () =>
    Effect.gen(function* () {
      const { error, calls } = yield* run({
        gateway: { messages: { "test-claude": anthropicFetched } },
        webfetch: { hosted: ["test-claude/test-claude"] },
        direct: status(404),
      })
      expect(error).toContain("404")
      expect(calls).toEqual([])
    }),
  )

  it.live("a blocked 403 is retried on the gateway", () =>
    Effect.gen(function* () {
      const { value } = yield* run({
        gateway: { messages: { "test-claude": anthropicFetched } },
        webfetch: { hosted: ["test-claude/test-claude"] },
        direct: status(403),
      })
      expect(value?.metadata).toMatchObject({ servedBy: "test-claude/test-claude" })
    }),
  )

  it.live("a private target never reaches the gateway", () =>
    Effect.gen(function* () {
      const { error, calls } = yield* run({
        gateway: { messages: { "test-claude": anthropicFetched } },
        webfetch: { first: "hosted", hosted: ["test-claude/test-claude"] },
        direct: transportFailure,
        url: "http://192.168.1.1/wiki",
      })
      expect(error).toContain("Transport error")
      expect(calls).toEqual([])
    }),
  )

  it.live("first: hosted asks the gateway before the direct fetch", () =>
    Effect.gen(function* () {
      let directCalls = 0
      const direct = HttpClient.make((request) =>
        Effect.sync(() => {
          directCalls++
          return HttpClientResponse.fromWeb(request, new Response("direct page", { status: 200 }))
        }),
      )
      const { value } = yield* run({
        gateway: { messages: { "test-claude": anthropicFetched } },
        webfetch: { first: "hosted", hosted: ["test-claude/test-claude"] },
        direct,
        url: "https://93.184.215.14/doc",
      })
      expect(value?.metadata).toMatchObject({ servedBy: "test-claude/test-claude" })
      expect(directCalls).toBe(0)
    }),
  )

  it.live("first: hosted falls back to direct and lists the hosted reasons ahead of its error", () =>
    Effect.gen(function* () {
      const { error } = yield* run({
        gateway: { messages: { "test-claude": anthropicError } },
        webfetch: { first: "hosted", hosted: ["test-claude/test-claude"] },
        direct: transportFailure,
        url: "https://93.184.215.14/doc",
      })
      const lines = (error ?? "").split("\n")
      expect(lines[0]).toBe("hosted test-claude/test-claude: web_fetch url_not_accessible")
      expect(lines[1]).toStartWith("- direct: Transport error")
    }),
  )

  it.live("the caller's timeout bounds each hosted entry", () =>
    Effect.gen(function* () {
      const slow = async (url: string) => {
        await Bun.sleep(3000)
        return anthropicFetched(url)
      }
      const { value } = yield* run({
        gateway: { messages: { "test-claude": slow } },
        webfetch: { first: "hosted", hosted: ["test-claude/test-claude"] },
        direct: ok("direct page"),
        url: "https://93.184.215.14/doc",
        timeout: 1,
      })
      // The 1s limit aborts the 3s gateway reply, so the direct fetch serves.
      expect(value?.metadata).toMatchObject({ servedBy: "direct" })
    }),
  )

  it.live("first: hosted keeps the user's rejection of a direct redirect", () =>
    Effect.gen(function* () {
      const next = "https://93.184.215.14/next"
      const redirect = HttpClient.make((request) =>
        Effect.succeed(
          HttpClientResponse.fromWeb(request, new Response(null, { status: 302, headers: { location: next } })),
        ),
      )
      const { raw, calls } = yield* run({
        gateway: { messages: { "test-claude": anthropicError } },
        webfetch: { first: "hosted", hosted: ["test-claude/test-claude"] },
        direct: redirect,
        url: "https://93.184.215.14/doc",
        reject: next,
      })
      expect(calls).toHaveLength(1)
      // The processor blocks the turn only on this error type.
      expect(raw).toBeInstanceOf(Permission.RejectedError)
    }),
  )
})
