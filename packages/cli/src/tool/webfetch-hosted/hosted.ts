// Gateway-hosted fetch for webfetch (DC-WEBFETCH-001). Each configured model
// fetches one public URL through its provider's server tool. An
// `@ai-sdk/anthropic` model runs `web_fetch` and returns the page text; an
// `@ai-sdk/openai` model runs Responses `web_search`, whose `open_page` action
// returns only the model's digest of the page. Neither is injected into the
// session request: the webfetch tool keeps its permission ask and truncation.
import { generateText, jsonSchema, type ContentPart, type Tool, type ToolSet } from "ai"
import type { LanguageModelV3, SharedV3ProviderOptions } from "@ai-sdk/provider"
import type { Config } from "@/config"

export type Entry = { providerID: string; modelID: string; variant?: string; maxContentTokens?: number }

/** `text` is the fetched page; `digest` is the model's account of it. */
export type Kind = "text" | "digest"

export type Fetched = { kind: Kind; output: string; mime?: string }

type Settings = Config.Info["webfetch"]

export const DEFAULT_MAX_CONTENT_TOKENS = 30_000

function parseRef(ref: string): Pick<Entry, "providerID" | "modelID"> | undefined {
  const index = ref.indexOf("/")
  if (index <= 0 || index === ref.length - 1) return undefined
  return { providerID: ref.slice(0, index), modelID: ref.slice(index + 1) }
}

/** Hosted fetch models in configured order; malformed refs are dropped. */
export function entries(settings: Settings): Entry[] {
  return (settings?.hosted ?? []).flatMap((item) => {
    const ref = parseRef(typeof item === "string" ? item : item.model)
    if (!ref) return []
    if (typeof item === "string") return [ref]
    return [
      {
        ...ref,
        ...(item.variant ? { variant: item.variant } : {}),
        ...(item.max_content_tokens ? { maxContentTokens: item.max_content_tokens } : {}),
      },
    ]
  })
}

export function first(settings: Settings): "local" | "hosted" {
  return settings?.first ?? "local"
}

/** The server tool for a provider SDK; undefined when it has none. */
export function kindFor(npm: string): Kind | undefined {
  if (npm === "@ai-sdk/anthropic") return "text"
  if (npm === "@ai-sdk/openai") return "digest"
  return undefined
}

// Built like native.ts SERVER_TOOL_IDS: the providers' own factories carry their
// provider-utils schema type, which is not the one `ai` checks against.
function serverTool(npm: string, maxContentTokens: number): Tool | undefined {
  if (npm === "@ai-sdk/anthropic")
    return {
      type: "provider",
      id: "anthropic.web_fetch_20250910",
      args: { maxUses: 1, maxContentTokens },
      inputSchema: jsonSchema({ type: "object" }),
    }
  if (npm === "@ai-sdk/openai")
    return {
      type: "provider",
      id: "openai.web_search",
      // Opening a page needs no search context size, and some Responses gateways
      // (Grok) reject that argument outright.
      args: { externalWebAccess: true },
      inputSchema: jsonSchema({ type: "object" }),
    }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

// Only differences proven not to name another resource pass: URL normalization
// (host case, default port, an empty path) and an http request opened over
// https, which Responses open_page was observed doing. Web fetch and Grok
// open_page echo the request verbatim. The fragment never reaches the server.
function sameUrl(requested: string, echoed: string) {
  if (!URL.canParse(requested) || !URL.canParse(echoed)) return false
  const want = new URL(requested)
  const got = new URL(echoed)
  const scheme = want.protocol === got.protocol || (want.protocol === "http:" && got.protocol === "https:")
  return (
    scheme &&
    want.username === got.username &&
    want.password === got.password &&
    want.host === got.host &&
    want.pathname === got.pathname &&
    want.search === got.search
  )
}

const PROMPT = (url: string) => `Use the web_fetch tool once to fetch exactly this URL: ${url}\nAfter the fetch, reply with: done`

const DIGEST_PROMPT = (url: string) =>
  `Open this exact URL with the web search tool's open_page action: ${url}\nThen return the page's content in markdown as faithfully and completely as you can, without commentary.`

export type Failure = { reason: string }

/**
 * Reads the server tool's own result for the requested URL. A model answering
 * without that result (from memory, or after fetching another URL) fails, so a
 * plausible reply is never mistaken for the page.
 */
export function extract(kind: Kind, url: string, content: ContentPart<ToolSet>[]): Fetched | Failure {
  if (kind === "text") {
    for (const part of content) {
      // `ai` delivers an errored server result as a tool-error part.
      if (part.type === "tool-error" && part.toolName === "web_fetch") {
        const code = isRecord(part.error) && typeof part.error.errorCode === "string" ? part.error.errorCode : "error"
        return { reason: `web_fetch ${code}` }
      }
      if (part.type !== "tool-result" || part.toolName !== "web_fetch" || !isRecord(part.output)) continue
      const output = part.output
      if (output.type === "web_fetch_tool_result_error")
        return { reason: `web_fetch ${typeof output.errorCode === "string" ? output.errorCode : "error"}` }
      if (output.type !== "web_fetch_result") continue
      if (typeof output.url !== "string") return { reason: "web_fetch returned no URL" }
      if (!sameUrl(url, output.url)) return { reason: `web_fetch returned another URL: ${output.url}` }
      const document = isRecord(output.content) ? output.content : undefined
      const source = document && isRecord(document.source) ? document.source : undefined
      if (!source || typeof source.data !== "string") return { reason: "web_fetch returned no content" }
      if (source.type !== "text") return { reason: `web_fetch returned ${String(source.mediaType ?? source.type)}` }
      return { kind, output: source.data, mime: "text/plain" }
    }
    return { reason: "no web_fetch result" }
  }
  const opened = content.some(
    (part) =>
      part.type === "tool-result" &&
      part.toolName === "web_search" &&
      isRecord(part.output) &&
      isRecord(part.output.action) &&
      part.output.action.type === "openPage" &&
      typeof part.output.action.url === "string" &&
      sameUrl(url, part.output.action.url),
  )
  if (!opened) return { reason: "no open_page result for the URL" }
  const text = content
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
    .trim()
  if (!text) return { reason: "open_page returned no text" }
  return { kind, output: text }
}

/** One hosted fetch. Never throws: failures carry a short reason. */
export async function fetchPage(input: {
  language: LanguageModelV3
  npm: string
  providerOptions: SharedV3ProviderOptions
  headers?: Record<string, string>
  url: string
  maxContentTokens?: number
  abort: AbortSignal
}): Promise<Fetched | Failure> {
  const kind = kindFor(input.npm)
  const tool = serverTool(input.npm, input.maxContentTokens ?? DEFAULT_MAX_CONTENT_TOKENS)
  if (!kind || !tool) return { reason: `unsupported SDK ${input.npm}` }
  const result = await generateText({
    model: input.language,
    tools: { [kind === "text" ? "web_fetch" : "web_search"]: tool },
    // Gateways reject forced tool_choice on some models; the result check above
    // is what proves a fetch happened.
    toolChoice: "auto",
    prompt: kind === "text" ? PROMPT(input.url) : DIGEST_PROMPT(input.url),
    providerOptions: input.providerOptions,
    headers: input.headers,
    abortSignal: input.abort,
    maxRetries: 0,
  }).then(
    (value) => ({ content: value.content }),
    (error: unknown) => ({ reason: (error instanceof Error ? error.message : String(error)).slice(0, 200) }),
  )
  if ("reason" in result) return result
  return extract(kind, input.url, result.content)
}
