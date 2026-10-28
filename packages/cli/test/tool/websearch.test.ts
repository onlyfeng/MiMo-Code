import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/unstable/http"
import path from "path"
import { Agent } from "../../src/agent/agent"
import { Auth } from "../../src/auth"
import { Config } from "../../src/config"
import { Provider } from "../../src/provider"
import { Truncate } from "../../src/tool"
import { Instance } from "../../src/project/instance"
import { WebSearchTool, fallbackTimeout } from "../../src/tool/websearch"
import { SessionID, MessageID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { ProviderTest } from "../fake/provider"
import { tmpdir } from "../fixture/fixture"

// A git fixture rather than this checkout: an instance rooted in the repository
// runs config discovery against its .mimocode and installs dependencies there.
const projectRoot = (await tmpdir({ git: true })).path

const sse = (model: string) => {
  const frame = {
    model,
    choices: [
      {
        delta: {
          annotations: [
            {
              type: "url_citation",
              url: "https://example.com/result",
              title: "Example",
              summary: "A search hit",
              site_name: "Example",
              publish_time: "2026-01-01",
            },
          ],
        },
      },
    ],
  }
  return `data: ${JSON.stringify(frame)}\n\ndata: [DONE]\n\n`
}

describe("tool.websearch", () => {
  test("xiaomi sidecar uses the session model's API id, not a hardcoded model", async () => {
    let requested: string | undefined
    using server = Bun.serve({
      port: 0,
      fetch: async (req) => {
        requested = ((await req.json()) as { model?: string }).model
        return new Response(sse(requested ?? ""), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      },
    })

    const model = ProviderTest.model({
      id: ModelID.make("catalog-mimo-pro"),
      providerID: ProviderID.make("xiaomi"),
      api: {
        id: "mimo-v2.5-pro",
        url: server.url.origin,
        npm: "@ai-sdk/openai-compatible",
      },
    })

    const fakeAuth = Layer.mock(Auth.Service)({
      get: (providerID: string) =>
        Effect.succeed(providerID === "xiaomi" ? new Auth.Api({ type: "api", key: "test-key" }) : undefined),
    })

    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const result = await WebSearchTool.pipe(
          Effect.flatMap((info) => info.init()),
          Effect.flatMap((tool) =>
            tool.execute(
              { query: "latest mimo release" },
              {
                sessionID: SessionID.make("ses_test"),
                messageID: MessageID.make("message"),
                callID: "",
                agent: "build",
                abort: AbortSignal.any([]),
                messages: [],
                extra: { model },
                metadata: () => Effect.void,
                ask: () => Effect.void,
              },
            ),
          ),
          Effect.provide(
            Layer.mergeAll(
              FetchHttpClient.layer,
              Truncate.defaultLayer,
              Agent.defaultLayer,
              fakeAuth,
              Config.defaultLayer,
              Provider.defaultLayer,
            ),
          ),
          Effect.runPromise,
        )

        expect(requested).toBe("mimo-v2.5-pro")
        expect(result.output).toContain("https://example.com/result")
      },
    })
  })

  test("token-plan sidecar uses its own provider key and API id", async () => {
    let requested: string | undefined
    let authorization: string | undefined
    using server = Bun.serve({
      port: 0,
      fetch: async (req) => {
        requested = ((await req.json()) as { model?: string }).model
        authorization = req.headers.get("api-key") ?? undefined
        return new Response(sse(requested ?? ""), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      },
    })

    const model = ProviderTest.model({
      id: ModelID.make("mimo-v2.6-pro"),
      providerID: ProviderID.make("xiaomi-token-plan-cn"),
      api: {
        id: "mimo-v2.6-pro",
        url: server.url.origin,
        npm: "@ai-sdk/openai-compatible",
      },
    })

    const fakeAuth = Layer.mock(Auth.Service)({
      get: (providerID: string) =>
        Effect.succeed(
          providerID === "xiaomi-token-plan-cn"
            ? new Auth.Api({ type: "api", key: "test-token-plan-key" })
            : new Auth.Api({ type: "api", key: "wrong-key" }),
        ),
    })

    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const result = await WebSearchTool.pipe(
          Effect.flatMap((info) => info.init()),
          Effect.flatMap((tool) =>
            tool.execute(
              { query: "latest mimo release" },
              {
                sessionID: SessionID.make("ses_test"),
                messageID: MessageID.make("message"),
                callID: "",
                agent: "build",
                abort: AbortSignal.any([]),
                messages: [],
                extra: { model },
                metadata: () => Effect.void,
                ask: () => Effect.void,
              },
            ),
          ),
          Effect.provide(
            Layer.mergeAll(
              FetchHttpClient.layer,
              Truncate.defaultLayer,
              Agent.defaultLayer,
              fakeAuth,
              Config.defaultLayer,
              Provider.defaultLayer,
            ),
          ),
          Effect.runPromise,
        )

        expect(requested).toBe("mimo-v2.6-pro")
        expect(authorization).toBe("test-token-plan-key")
        expect(result.output).toContain("https://example.com/result")
      },
    })
  })

  describe("fallback", () => {
    type Handler = (body: Record<string, unknown>) => Response
    const responsesBody = (output: unknown[]) => ({
      id: "resp_1",
      object: "response",
      created_at: 1,
      status: "completed",
      model: "test-model",
      output,
      incomplete_details: null,
      usage: {
        input_tokens: 1,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 1,
        output_tokens_details: { reasoning_tokens: 0 },
      },
    })
    const searched = responsesBody([
      {
        id: "ws_1",
        type: "web_search_call",
        status: "completed",
        action: { type: "search", query: "bun", sources: [{ type: "url", url: "https://example.com/a" }] },
      },
      {
        id: "msg_1",
        type: "message",
        status: "completed",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: "Bun 1.4.3 per Alpha; see also https://invented.example/x",
            annotations: [{ type: "url_citation", start_index: 0, end_index: 5, url: "https://example.com/a", title: "Alpha" }],
          },
        ],
      },
    ])
    const unsearched = responsesBody([
      {
        id: "msg_1",
        type: "message",
        status: "completed",
        role: "assistant",
        content: [{ type: "output_text", text: "From memory: https://invented.example/x", annotations: [] }],
      },
    ])
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

    async function run(input: {
      handlers: Record<string, Handler>
      fallback: unknown[]
      model?: ReturnType<typeof ProviderTest.model>
      exa?: (url: string) => Response | undefined
      timeout?: number
    }) {
      const requests: Array<{ model: string; body: Record<string, unknown> }> = []
      using server = Bun.serve({
        port: 0,
        fetch: async (req) => {
          const body = (await req.json()) as Record<string, unknown>
          const model = String(body.model)
          requests.push({ model, body })
          const handler = input.handlers[model]
          return handler ? handler(body) : json({ error: { message: "unknown model" } }, 404)
        },
      })
      await using tmp = await tmpdir({
        git: true,
        init: async (dir) => {
          await Bun.write(
            path.join(dir, "mimocode.json"),
            JSON.stringify({
              $schema: "https://opencode.ai/config.json",
              websearch: { fallback: input.fallback },
              provider: {
                test: {
                  name: "Test",
                  npm: "@ai-sdk/openai",
                  models: {
                    "test-model": { name: "Test Model", tool_call: true, limit: { context: 128000, output: 4096 } },
                    "test-second": { name: "Second", tool_call: true, limit: { context: 128000, output: 4096 } },
                  },
                  options: { apiKey: "test-key", baseURL: `${server.url.origin}/v1` },
                },
                compat: {
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
      const sessionModel =
        input.model ??
        ProviderTest.model({ id: ModelID.make("other"), providerID: ProviderID.make("other"), api: { id: "other", url: server.url.origin, npm: "@ai-sdk/anthropic" } })
      const exaFetch: typeof globalThis.fetch = Object.assign(
        async (request: RequestInfo | URL, init?: RequestInit) => {
          const url = request instanceof Request ? request.url : String(request)
          const reply = input.exa?.(url)
          if (reply) return reply
          return fetch(request, init)
        },
        { preconnect: fetch.preconnect },
      )
      // Await here: returning the bare promise would dispose the server and fixture first.
      return await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const result = await WebSearchTool.pipe(
            Effect.flatMap((info) => info.init()),
            Effect.flatMap((tool) =>
              tool.execute(
                { query: "bun latest", ...(input.timeout === undefined ? {} : { timeout: input.timeout }) },
                {
                  sessionID: SessionID.make("ses_fallback"),
                  messageID: MessageID.make("message"),
                  callID: "",
                  agent: "build",
                  abort: AbortSignal.any([]),
                  messages: [],
                  extra: { model: sessionModel },
                  metadata: () => Effect.void,
                  ask: () => Effect.void,
                },
              ),
            ),
            Effect.provide(
              Layer.mergeAll(
                FetchHttpClient.layer,
                Layer.succeed(FetchHttpClient.Fetch, exaFetch),
                Truncate.defaultLayer,
                Agent.defaultLayer,
                Auth.defaultLayer,
                Config.defaultLayer,
                Provider.defaultLayer,
              ),
            ),
            Effect.runPromise,
          )
          return { result, requests }
        },
      })
    }

    test("codex fallback returns answer and search sources", async () => {
      const { result, requests } = await run({ handlers: { "test-model": () => json(searched) }, fallback: ["test/test-model"] })
      expect(result.output).toContain("https://example.com/a")
      expect(result.output).toContain("Sources:")
      expect(result.output).not.toContain("https://invented.example/x")
      expect(result.metadata).toMatchObject({ servedBy: "test/test-model" })
      const body = requests[0].body
      expect((body.tools as Array<{ type: string }>)[0].type).toBe("web_search")
      expect(body.store).toBe(false)
    })

    test("fallbackTimeout yields a positive integer delay for AbortSignal.timeout", () => {
      expect(fallbackTimeout(0.5)).toBe(1)
      expect(fallbackTimeout(1500.2)).toBe(1501)
      expect(fallbackTimeout(-5000)).toBe(60_000)
      expect(fallbackTimeout(0)).toBe(60_000)
      expect(fallbackTimeout(undefined)).toBe(60_000)
      expect(fallbackTimeout(30_000)).toBe(30_000)
    })

    test("a non-positive timeout falls back to the default instead of failing", async () => {
      const { result } = await run({
        handlers: { "test-model": () => json(searched) },
        fallback: ["test/test-model"],
        timeout: -5,
      })
      expect(result.metadata).toMatchObject({ servedBy: "test/test-model" })
    })

    test("codex fallback without a search falls through", async () => {
      const { result, requests } = await run({
        handlers: { "test-model": () => json(unsearched), "test-second": () => json(searched) },
        fallback: ["test/test-model", "test/test-second"],
      })
      expect(requests.map((item) => item.model)).toEqual(["test-model", "test-second"])
      expect(result.metadata).toMatchObject({ servedBy: "test/test-second" })
    })

    test("invalid fallback entries are skipped", async () => {
      const { result, requests } = await run({
        handlers: { "test-second": () => json(searched) },
        fallback: ["test/missing", { model: "test/test-model", variant: "nope" }, "compat/chat-model", "test/test-second"],
      })
      expect(requests.map((item) => item.model)).toEqual(["test-second"])
      expect(result.metadata).toMatchObject({ servedBy: "test/test-second" })
    })

    test("codex failure falls through to exa", async () => {
      const { result } = await run({
        handlers: { "test-model": () => json({ error: { message: "boom" } }, 500) },
        fallback: ["test/test-model"],
        exa: (url) =>
          url.startsWith("https://mcp.exa.ai/")
            ? new Response(`data: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: "exa says hi" }] } })}\n\n`, {
                status: 200,
                headers: { "content-type": "text/event-stream" },
              })
            : undefined,
      })
      expect(result.output).toBe("exa says hi")
      expect(result.metadata).toMatchObject({ servedBy: "exa" })
    })

    test("a keyless token-plan session uses the fallback and never reaches exa", async () => {
      const family = ProviderTest.model({
        id: ModelID.make("mimo-v2.6-pro"),
        providerID: ProviderID.make("xiaomi-token-plan-cn"),
        api: { id: "mimo-v2.6-pro", url: "http://127.0.0.1:9", npm: "@ai-sdk/openai-compatible" },
      })
      let exaCalls = 0
      const exa = (url: string) => {
        if (!url.startsWith("https://mcp.exa.ai/")) return undefined
        exaCalls++
        return new Response(`data: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: "exa says hi" }] } })}\n\n`, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        })
      }

      const served = await run({ handlers: { "test-model": () => json(searched) }, fallback: ["test/test-model"], model: family, exa })
      expect(served.result.metadata).toMatchObject({ servedBy: "test/test-model" })

      const unserved = await run({
        handlers: { "test-model": () => json({ error: { message: "boom" } }, 500) },
        fallback: ["test/test-model"],
        model: family,
        exa,
      })
      expect(unserved.result.output).toContain("Web search unavailable")
      expect(unserved.result.metadata).not.toHaveProperty("servedBy")
      expect(exaCalls).toBe(0)
    })
  })
})

