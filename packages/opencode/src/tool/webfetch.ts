import z from "zod"
import { Effect, Option } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import * as Tool from "./tool"
import TurndownService from "turndown"
import DESCRIPTION from "./webfetch.txt"
import { isImageAttachment } from "@/util/media"

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_TIMEOUT = 30 * 1000 // 30 seconds
const MAX_TIMEOUT = 120 * 1000 // 2 minutes
const MAX_REDIRECTS = 10

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
              acceptHeader =
                "text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1"
              break
            default:
              acceptHeader =
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
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
          const fetchUrl = (
            url: string,
            redirects = 0,
          ): Effect.Effect<HttpClientResponse.HttpClientResponse, unknown> =>
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
        }).pipe(Effect.orDie),
    }
  }),
)

function assertHttpUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("URL must start with http:// or https://")
  }
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
