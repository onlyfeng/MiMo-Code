import { describe, expect, test } from "bun:test"
import path from "path"
import { Effect, Layer } from "effect"
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/unstable/http"
import { Agent } from "../../src/agent/agent"
import { Tool, Truncate } from "../../src/tool"
import { Instance } from "../../src/project/instance"
import { WebFetchTool } from "../../src/tool/webfetch"
import { SessionID, MessageID } from "../../src/session/schema"

const projectRoot = path.join(import.meta.dir, "../..")

const ctx: Tool.Context = {
  sessionID: SessionID.make("ses_test"),
  messageID: MessageID.make("message"),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

async function withFetch(fetch: (req: Request) => Response | Promise<Response>, fn: (url: URL) => Promise<void>) {
  using server = Bun.serve({ port: 0, fetch })
  await fn(server.url)
}

function exec(
  args: { url: string; format: "text" | "markdown" | "html" },
  http = FetchHttpClient.layer,
  context = ctx,
) {
  return WebFetchTool.pipe(
    Effect.flatMap((info) => info.init()),
    Effect.flatMap((tool) => tool.execute(args, context)),
    Effect.provide(Layer.mergeAll(http, Truncate.defaultLayer, Agent.defaultLayer)),
    Effect.runPromise,
  )
}

describe("tool.webfetch", () => {
  test("returns image responses as file attachments", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
    await withFetch(
      () => new Response(bytes, { status: 200, headers: { "content-type": "IMAGE/PNG; charset=binary" } }),
      async (url) => {
        await Instance.provide({
          directory: projectRoot,
          fn: async () => {
            const result = await exec({ url: new URL("/image.png", url).toString(), format: "markdown" })
            expect(result.output).toBe("Image fetched successfully")
            expect(result.attachments).toBeDefined()
            expect(result.attachments?.length).toBe(1)
            expect(result.attachments?.[0].type).toBe("file")
            expect(result.attachments?.[0].mime).toBe("image/png")
            expect(result.attachments?.[0].url.startsWith("data:image/png;base64,")).toBe(true)
            expect(result.attachments?.[0]).not.toHaveProperty("id")
            expect(result.attachments?.[0]).not.toHaveProperty("sessionID")
            expect(result.attachments?.[0]).not.toHaveProperty("messageID")
          },
        })
      },
    )
  })

  test("keeps svg as text output", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>hello</text></svg>'
    await withFetch(
      () =>
        new Response(svg, {
          status: 200,
          headers: { "content-type": "image/svg+xml; charset=UTF-8" },
        }),
      async (url) => {
        await Instance.provide({
          directory: projectRoot,
          fn: async () => {
            const result = await exec({ url: new URL("/image.svg", url).toString(), format: "html" })
            expect(result.output).toContain("<svg")
            expect(result.attachments).toBeUndefined()
          },
        })
      },
    )
  })

  test("keeps text responses as text output", async () => {
    await withFetch(
      () =>
        new Response("hello from webfetch", {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
      async (url) => {
        await Instance.provide({
          directory: projectRoot,
          fn: async () => {
            const result = await exec({ url: new URL("/file.txt", url).toString(), format: "text" })
            expect(result.output).toBe("hello from webfetch")
            expect(result.attachments).toBeUndefined()
          },
        })
      },
    )
  })

  test("asks before following fetch redirects", async () => {
    const asks: string[][] = []
    const context = {
      ...ctx,
      ask: (input: { patterns: ReadonlyArray<string> }) =>
        Effect.sync(() => {
          asks.push([...input.patterns])
        }),
    }

    await withFetch(
      (req) => {
        if (new URL(req.url).pathname === "/start") {
          return new Response(null, { status: 302, headers: { location: "/internal" } })
        }
        return new Response("redirected content", {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
        })
      },
      async (url) => {
        await Instance.provide({
          directory: projectRoot,
          fn: async () => {
            const start = new URL("/start", url).toString()
            const redirected = new URL("/internal", url).toString()
            const result = await exec({ url: start, format: "text" }, FetchHttpClient.layer, context)
            expect(result.output).toBe("redirected content")
            expect(asks).toEqual([[start], [redirected]])
          },
        })
      },
    )
  })

  test("asks for redirected private network targets before fetching them", async () => {
    const start = "https://example.com/start"
    const internal = "http://10.0.0.5/wiki"
    const asks: string[][] = []
    const requested: string[] = []
    const context = {
      ...ctx,
      ask: (input: { patterns: ReadonlyArray<string> }) =>
        Effect.sync(() => {
          asks.push([...input.patterns])
        }),
    }
    const http = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.sync(() => {
          requested.push(request.url)
          if (request.url === start) {
            return HttpClientResponse.fromWeb(
              request,
              new Response(null, { status: 302, headers: { location: internal } }),
            )
          }
          return HttpClientResponse.fromWeb(
            request,
            new Response("internal knowledge", { headers: { "content-type": "text/plain; charset=utf-8" } }),
          )
        }),
      ),
    )

    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const result = await exec({ url: start, format: "text" }, http, context)
        expect(result.output).toBe("internal knowledge")
        expect(requested).toEqual([start, internal])
        expect(asks).toEqual([[start], [internal]])
      },
    })
  })

  test("allows private network URLs as user-approved fetch targets", async () => {
    const requested: string[] = []
    const http = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.sync(() => {
          requested.push(request.url)
          return HttpClientResponse.fromWeb(
            request,
            new Response("internal knowledge", { headers: { "content-type": "text/plain; charset=utf-8" } }),
          )
        }),
      ),
    )

    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const url = "http://10.0.0.5/wiki"
        const result = await exec({ url, format: "text" }, http)
        expect(result.output).toBe("internal knowledge")
        expect(requested).toEqual([url])
      },
    })
  })
})
