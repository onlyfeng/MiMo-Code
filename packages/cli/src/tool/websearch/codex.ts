// Standalone Responses web search for the websearch tool (DC-WEBSEARCH-001):
// one request to a configured `websearch.fallback` model with its server
// `web_search` tool. Only pages the search returned count as sources.
import { Effect } from "effect"
import { generateText, jsonSchema, type ContentPart, type ToolSet } from "ai"
import type { LanguageModelV3, SharedV3ProviderOptions } from "@ai-sdk/provider"
import { Log } from "@/util"

const log = Log.create({ service: "websearch.codex" })

const URL_PATTERN = /https?:\/\/[^\s)\]>"'`]+/g

type Source = { url: string; title?: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
}

/** Answer text plus the sources the search returned; undefined when nothing was searched or found. */
export function format(content: ContentPart<ToolSet>[]): string | undefined {
  if (!content.some((part) => part.type === "tool-result" && part.toolName === "web_search")) return undefined
  const sources = new Map<string, Source>()
  for (const part of content) {
    if (part.type === "source" && part.sourceType === "url" && !sources.has(part.url))
      sources.set(part.url, { url: part.url, ...(part.title ? { title: part.title } : {}) })
    if (part.type !== "tool-result" || part.toolName !== "web_search" || !isRecord(part.output)) continue
    const found = Array.isArray(part.output.sources) ? part.output.sources : []
    for (const item of found)
      if (isRecord(item) && typeof item.url === "string" && !sources.has(item.url)) sources.set(item.url, { url: item.url })
  }
  if (sources.size === 0) return undefined
  // A URL the model wrote but the search never returned may be invented.
  const text = content
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
    .replace(URL_PATTERN, (match) => {
      const url = match.replace(/[.,;:!?]+$/, "")
      return sources.has(url) ? match : `(unverified link)${match.slice(url.length)}`
    })
    .trim()
  const list = [...sources.values()].map((item, index) => `${index + 1}. ${item.title ?? item.url} — ${item.url}`)
  return [text, "", "Sources:", ...list].join("\n").trim()
}

export const search = Effect.fn("WebSearchCodex.search")(function* (input: {
  language: LanguageModelV3
  providerOptions: SharedV3ProviderOptions
  headers?: Record<string, string>
  query: string
  abort: AbortSignal
}) {
  const result = yield* Effect.tryPromise(() =>
    generateText({
      model: input.language,
      tools: { web_search: { type: "provider", id: "openai.web_search", args: {}, inputSchema: jsonSchema({ type: "object" }) } },
      toolChoice: "required",
      prompt: `Search the web and answer concisely with citations. Query: ${input.query}`,
      providerOptions: input.providerOptions,
      headers: input.headers,
      abortSignal: input.abort,
      maxRetries: 0,
    }),
  ).pipe(
    Effect.catch((error) => {
      log.warn("fallback search failed", { error: error instanceof Error ? error.message : String(error) })
      return Effect.succeed(undefined)
    }),
  )
  return result ? format(result.content) : undefined
})
