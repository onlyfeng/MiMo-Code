import z from "zod"
import { Cause, Effect, Exit, Option } from "effect"
import { mergeDeep, pipe } from "remeda"
import { FetchHttpClient, HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import * as Tool from "./tool"
import * as HostedFetch from "./webfetch-hosted/hosted"
import * as Destination from "./webfetch-hosted/destination"
import TurndownService from "turndown"
import DESCRIPTION from "./webfetch.txt"
import { Config } from "@/config"
import { Provider, ProviderTransform } from "@/provider"
import { ModelID, ProviderID } from "@/provider/schema"
import { Log } from "@/util"
import { isImageAttachment } from "@/util/media"

const log = Log.create({ service: "webfetch" })

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_TIMEOUT = 30 * 1000 // 30 seconds
const MAX_TIMEOUT = 120 * 1000 // 2 minutes
const HOSTED_TIMEOUT = 90 * 1000
const MAX_REDIRECTS = 10
// A direct fetch answered with one of these may succeed from a gateway's egress;
// any other HTTP status is the page's own answer and would only be paid for twice.
const BLOCKED_STATUSES = new Set([403, 407, 429, 451, 502, 503, 504])

const parameters = z.object({
  url: z.string().describe("The URL to fetch content from"),
  format: z
    .enum(["text", "markdown", "html"])
    .default("markdown")
    .describe("The format to return the content in (text, markdown, or html). Defaults to markdown."),
  timeout: z.number().describe("Optional timeout in seconds (max 120)").optional(),
})

export const WebFetchTool = Tool.define(
  "webfetch",
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    const provider = Option.getOrUndefined(yield* Effect.serviceOption(Provider.Service))
    const config = Option.getOrUndefined(yield* Effect.serviceOption(Config.Service))

    // One configured hosted fetch model (DC-WEBFETCH-001). An entry that does not
    // resolve, names an undeclared variant or has no server fetch tool is skipped.
    const hostedFetch = Effect.fn("WebFetchTool.hostedFetch")(function* (
      entry: HostedFetch.Entry,
      url: string,
      ctx: Tool.Context,
    ) {
      const ref = `${entry.providerID}/${entry.modelID}`
      if (!provider) return { ref, reason: "no provider service" }
      const resolved = yield* Effect.exit(
        Effect.gen(function* () {
          const model = yield* provider.getModel(ProviderID.make(entry.providerID), ModelID.make(entry.modelID))
          const variant = entry.variant ? model.variants?.[entry.variant] : {}
          if (!variant || !HostedFetch.kindFor(model.api.npm)) return undefined
          const info = yield* provider.getProvider(model.providerID)
          const language = yield* provider.getLanguage(model)
          const options = pipe(
            ProviderTransform.options({ model, sessionID: ctx.sessionID, providerOptions: info.options }),
            mergeDeep(model.options),
            mergeDeep(variant),
          )
          return { model, language, providerOptions: ProviderTransform.providerOptions(model, options) }
        }),
      )
      if (Exit.isFailure(resolved) || !resolved.value) {
        log.warn("skipping webfetch hosted entry", { ref, variant: entry.variant })
        return { ref, reason: "not a usable hosted fetch model" }
      }
      const { model, language, providerOptions } = resolved.value
      const result = yield* Effect.promise(() =>
        HostedFetch.fetchPage({
          language,
          npm: model.api.npm,
          providerOptions,
          headers: model.headers,
          url,
          maxContentTokens: entry.maxContentTokens,
          abort: AbortSignal.any([ctx.abort, AbortSignal.timeout(HOSTED_TIMEOUT)]),
        }),
      )
      if ("reason" in result) log.warn("webfetch hosted entry failed", { ref, reason: result.reason })
      return { ref, ...result }
    })

    return {
      description: DESCRIPTION,
      parameters,
      execute: (params: z.infer<typeof parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          assertHttpUrl(params.url)

          const ask = (url: string) =>
            ctx.ask({
              permission: "webfetch",
              patterns: [url],
              always: ["*"],
              metadata: {
                url,
                format: params.format,
                timeout: params.timeout,
              },
            })

          yield* ask(params.url)

          const timeout = Math.min((params.timeout ?? DEFAULT_TIMEOUT / 1000) * 1000, MAX_TIMEOUT)
          const settings = config ? (yield* config.get()).webfetch : undefined

          // DC-WEBFETCH-001: a configured block adds hosted fetch models around the direct fetch.
          if (settings) {
            const entries = HostedFetch.entries(settings)
            const destination = yield* Effect.promise(() => Destination.classify(params.url))
            const direct = () =>
              directFetch(params, timeout, http, ask).pipe(
                Effect.map((result) => ({ ...result, metadata: { ...result.metadata, servedBy: "direct" } })),
              )
            // A private target and an empty list keep today's direct-only behavior.
            if (destination === "private" || entries.length === 0) return yield* direct()

            const failures: string[] = []
            const hosted = Effect.gen(function* () {
              for (const entry of entries) {
                const result = yield* hostedFetch(entry, params.url, ctx)
                if ("kind" in result) return result
                failures.push(`hosted ${result.ref}: ${result.reason}`)
              }
              return undefined
            })
            const served = (result: { kind: HostedFetch.Kind; output: string; ref: string }) => ({
              output:
                result.kind === "digest"
                  ? `[Model digest of ${params.url} by ${result.ref}; not the page's own text]\n\n${result.output}`
                  : result.output,
              title: `${params.url} (${result.kind === "digest" ? "hosted digest" : "hosted"} ${result.ref})`,
              metadata: { servedBy: result.ref, hosted: result.kind },
            })

            if (HostedFetch.first(settings) === "hosted") {
              const result = yield* hosted
              if (result) return served(result)
              const exit = yield* Effect.exit(direct())
              if (Exit.isSuccess(exit)) return exit.value
              return yield* Effect.die(chainError(Cause.squash(exit.cause), failures, "direct"))
            }

            const exit = yield* Effect.exit(direct())
            if (Exit.isSuccess(exit)) return exit.value
            const error = Cause.squash(exit.cause)
            if (!retriesHosted(error)) return yield* Effect.failCause(exit.cause)
            const result = yield* hosted
            if (result) return served(result)
            return yield* Effect.die(chainError(error, failures))
          }

          return yield* directFetch(params, timeout, http, ask)
        }).pipe(Effect.orDie),
    }
  }),
)

function directFetch(
  params: z.infer<typeof parameters>,
  timeout: number,
  http: HttpClient.HttpClient,
  ask: (url: string) => Effect.Effect<void>,
) {
  return Effect.gen(function* () {
    // Build Accept header based on requested format with q parameters for fallbacks
    let acceptHeader = "*/*"
    switch (params.format) {
      case "markdown":
        acceptHeader = "text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1"
        break
      case "text":
        acceptHeader = "text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1"
        break
      case "html":
        acceptHeader = "text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1"
        break
      default:
        acceptHeader = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
    }
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      Accept: acceptHeader,
      "Accept-Language": "en-US,en;q=0.9",
    }
    const fetchRequestInit = Option.getOrUndefined(yield* Effect.serviceOption(FetchHttpClient.RequestInit))
    const executeRequest = (url: string, requestHeaders: Record<string, string>) =>
      http.execute(HttpClientRequest.get(url).pipe(HttpClientRequest.setHeaders(requestHeaders))).pipe(
        Effect.provideService(FetchHttpClient.RequestInit, {
          ...(fetchRequestInit ?? {}),
          redirect: "manual",
        }),
      )
    const fetchUrl = (url: string, redirects = 0): Effect.Effect<HttpClientResponse.HttpClientResponse, unknown> =>
      Effect.gen(function* () {
        const browserResponse = yield* executeRequest(url, headers)
        const response =
          browserResponse.status === 403 && browserResponse.headers["cf-mitigated"] === "challenge"
            ? yield* executeRequest(url, { ...headers, "User-Agent": "mimocode" })
            : browserResponse

        if (response.status >= 300 && response.status < 400 && response.headers.location) {
          if (redirects >= MAX_REDIRECTS) {
            throw new Error("Too many redirects")
          }

          const redirectUrl = new URL(response.headers.location, url).toString()
          assertHttpUrl(redirectUrl)
          yield* ask(redirectUrl)
          return yield* fetchUrl(redirectUrl, redirects + 1)
        }

        return yield* HttpClientResponse.filterStatusOk(response)
      })

    const response = yield* fetchUrl(params.url).pipe(
      Effect.timeoutOrElse({ duration: timeout, orElse: () => Effect.die(new Error("Request timed out")) }),
    )

    // Check content length
    const contentLength = response.headers["content-length"]
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      throw new Error("Response too large (exceeds 5MB limit)")
    }

    const arrayBuffer = yield* response.arrayBuffer
    if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
      throw new Error("Response too large (exceeds 5MB limit)")
    }

    const contentType = response.headers["content-type"] || ""
    const mime = contentType.split(";")[0]?.trim().toLowerCase() || ""
    const title = `${params.url} (${contentType})`

    if (isImageAttachment(mime)) {
      const base64Content = Buffer.from(arrayBuffer).toString("base64")
      return {
        title,
        output: "Image fetched successfully",
        metadata: {},
        attachments: [
          {
            type: "file" as const,
            mime,
            url: `data:${mime};base64,${base64Content}`,
          },
        ],
      }
    }

    const content = new TextDecoder().decode(arrayBuffer)

    // Handle content based on requested format and actual content type
    switch (params.format) {
      case "markdown":
        if (contentType.includes("text/html")) {
          const markdown = convertHTMLToMarkdown(content)
          return {
            output: markdown,
            title,
            metadata: {},
          }
        }
        return { output: content, title, metadata: {} }

      case "text":
        if (contentType.includes("text/html")) {
          const text = yield* Effect.promise(() => extractTextFromHTML(content))
          return { output: text, title, metadata: {} }
        }
        return { output: content, title, metadata: {} }

      case "html":
        return { output: content, title, metadata: {} }

      default:
        return { output: content, title, metadata: {} }
    }
  })
}

function assertHttpUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("URL must start with http:// or https://")
  }
}

/**
 * Whether a failed direct fetch is worth a hosted retry: the request never got
 * an answer (DNS, connection, TLS, timeout) or the site refused this host. A
 * page's own 404 or 401 would be the same from the gateway.
 */
export function retriesHosted(error: unknown): boolean {
  if (HttpClientError.isHttpClientError(error)) {
    if (error.reason._tag === "TransportError") return true
    if (error.reason._tag === "StatusCodeError") return BLOCKED_STATUSES.has(error.reason.response.status)
    return false
  }
  return error instanceof Error && error.message === "Request timed out"
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/** The first route's own error, followed by each later route's reason. */
function chainError(error: unknown, failures: string[], route?: string) {
  const rest = route ? [...failures, `${route}: ${errorText(error)}`] : failures
  const first = route ? (rest.shift() ?? errorText(error)) : errorText(error)
  return new Error(rest.length ? `${first}\n${rest.map((line) => `- ${line}`).join("\n")}` : first)
}

async function extractTextFromHTML(html: string) {
  let text = ""
  let skipContent = false

  const rewriter = new HTMLRewriter()
    .on("script, style, noscript, iframe, object, embed", {
      element() {
        skipContent = true
      },
      text() {
        // Skip text content inside these elements
      },
    })
    .on("*", {
      element(element) {
        // Reset skip flag when entering other elements
        if (!["script", "style", "noscript", "iframe", "object", "embed"].includes(element.tagName)) {
          skipContent = false
        }
      },
      text(input) {
        if (!skipContent) {
          text += input.text
        }
      },
    })
    .transform(new Response(html))

  await rewriter.text()
  return text.trim()
}

function convertHTMLToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  })
  turndownService.remove(["script", "style", "meta", "link"])
  return turndownService.turndown(html)
}
