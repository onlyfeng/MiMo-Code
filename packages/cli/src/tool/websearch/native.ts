// Provider-native in-turn web search (DC-WEBSEARCH-001). The session model
// searches through its provider's server tool when `websearch.native` opts the
// route in; search-specific failures fall back to the client `websearch` tool.
import { jsonSchema, type Tool } from "ai"
import type { Config } from "@/config"
import { Permission } from "@/permission"
import type { Provider } from "@/provider"
import { Log } from "@/util"

const log = Log.create({ service: "websearch.native" })

/** Tool key for the injected provider tool; the provider APIs name it the same. */
export const TOOL_NAME = "web_search"

const SUPPORTED_SDKS = new Set(["@ai-sdk/openai", "@ai-sdk/anthropic"])

type Settings = Config.Info["websearch"]

export type Route = { replay: "native" | "text" }

export type FallbackEntry = { providerID: string; modelID: string; variant?: string }

function entry(value: boolean | { replay?: "native" | "text" }): Route | undefined {
  if (value === false) return undefined
  if (value === true) return { replay: "native" }
  return { replay: value.replay ?? "native" }
}

/** The native-search route for a model, or undefined when it is not enabled. */
export function route(settings: Settings, model: Provider.Model): Route | undefined {
  const native = settings?.native
  if (!native || !SUPPORTED_SDKS.has(model.api.npm)) return undefined
  const value = native[`${model.providerID}/${model.id}`] ?? native[model.providerID]
  return value === undefined ? undefined : entry(value)
}

function parseRef(ref: string): Pick<FallbackEntry, "providerID" | "modelID"> | undefined {
  const index = ref.indexOf("/")
  if (index <= 0 || index === ref.length - 1) return undefined
  return { providerID: ref.slice(0, index), modelID: ref.slice(index + 1) }
}

/** Standalone search models for the websearch tool, in configured order. */
export function fallbackEntries(settings: Settings): FallbackEntry[] {
  return (settings?.fallback ?? []).flatMap((item) => {
    const ref = parseRef(typeof item === "string" ? item : item.model)
    if (!ref) return []
    return typeof item !== "string" && item.variant ? [{ ...ref, variant: item.variant }] : [ref]
  })
}

/** Whether the config gives the websearch tool something to do on any provider. */
export function exposed(settings: Settings): boolean {
  if (fallbackEntries(settings).length > 0) return true
  return Object.values(settings?.native ?? {}).some((value) => entry(value) !== undefined)
}

export type FailureKind = "search" | "replay"

type Failures = { search?: string; replay?: string }

// In-process only: a restart retries native search once more, which is cheap.
const MAX_SESSIONS = 500
const state = new Map<string, Map<string, Failures>>()

function modelKey(model: Provider.Model) {
  return JSON.stringify([model.providerID, model.id, model.api.id])
}

/** Records a failure for this session × model; true only the first time per kind. */
export function mark(sessionID: string, model: Provider.Model, kind: FailureKind, reason: string): boolean {
  let models = state.get(sessionID)
  if (!models) {
    if (state.size >= MAX_SESSIONS) {
      const oldest = state.keys().next().value
      if (oldest !== undefined) state.delete(oldest)
    }
    models = new Map()
    state.set(sessionID, models)
  }
  const key = modelKey(model)
  const current = models.get(key) ?? {}
  if (current[kind] !== undefined) return false
  models.set(key, { ...current, [kind]: reason })
  log.warn("native web search fallback", { kind, reason, providerID: model.providerID, modelID: model.id })
  return true
}

export function failures(sessionID: string, model: Provider.Model): Failures {
  return state.get(sessionID)?.get(modelKey(model)) ?? {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
}

// Every string an error carries about itself: messages, bodies, validated values
// and the cause chain. Bounded so a cyclic cause cannot loop.
function texts(error: unknown, depth = 0): string[] {
  if (depth > 4 || error === undefined || error === null) return []
  if (typeof error === "string") return [error]
  if (!isRecord(error)) return []
  const own = ["message", "responseBody"].flatMap((key) =>
    typeof error[key] === "string" ? [error[key] as string] : [],
  )
  const value = "value" in error && error.value !== undefined ? [JSON.stringify(error.value) ?? ""] : []
  return [...own, ...value, ...texts(error.data, depth + 1), ...texts(error.cause, depth + 1)]
}

function statusOf(error: unknown, depth = 0): number | undefined {
  if (depth > 4 || !isRecord(error)) return undefined
  if (typeof error.statusCode === "number") return error.statusCode
  if (typeof error.status === "number") return error.status
  return statusOf(error.data, depth + 1) ?? statusOf(error.cause, depth + 1)
}

function isTimeout(error: unknown, depth = 0): boolean {
  if (depth > 4 || !isRecord(error)) return false
  if (error.code === "ETIMEDOUT" || error.name === "TimeoutError") return true
  if (typeof error.message === "string" && /\btimed? ?out\b/i.test(error.message)) return true
  return isTimeout(error.cause, depth + 1)
}

function isCallerAbort(error: unknown) {
  return isRecord(error) && error.name === "AbortError" && error.code !== "ETIMEDOUT"
}

const NOT_SEARCH = /quota|billing|insufficient|invalid[_ -]?(?:api[_ -]?)?key|unauthorized|authentication/i
const REPLAY = /encrypted_content|search_result/i
const SEARCH_REJECTED = /web_search|server[_ -]?tool|tool[_ -]?type|unsupported tool/i
const SERVER_BLOCK = /tool_result|server_tool_use|web_search/

/** Whether a request or stream error is native search's fault, and which kind. */
export function classifyError(
  error: unknown,
  input: { beforeOutput: boolean; nativeActive: boolean },
): { kind: FailureKind; reason: string } | undefined {
  if (!input.nativeActive || isCallerAbort(error)) return undefined
  const status = statusOf(error)
  if (status === 401 || status === 402 || status === 429) return undefined
  const text = texts(error).join("\n")
  if (NOT_SEARCH.test(text)) return undefined
  const reason = (texts(error)[0] ?? "unknown").slice(0, 200)
  if (status !== undefined && status >= 400 && status < 500) {
    if (REPLAY.test(text)) return { kind: "replay", reason }
    if (SEARCH_REJECTED.test(text)) return { kind: "search", reason }
    return undefined
  }
  if (isRecord(error) && error.name === "AI_TypeValidationError" && SERVER_BLOCK.test(text))
    return { kind: "search", reason }
  if (input.beforeOutput && isTimeout(error)) return { kind: "search", reason }
  return undefined
}

/** An in-band native search failure reported by the stream, if any. */
export function classifyEvent(event: {
  type: string
  toolName?: string
  providerExecuted?: boolean
  output?: unknown
  error?: unknown
}): string | undefined {
  if (event.toolName !== TOOL_NAME) return undefined
  if (event.type === "tool-error") return `search error: ${texts(event.error)[0] ?? "unknown"}`.slice(0, 200)
  if (event.type !== "tool-result" || !isRecord(event.output) || Array.isArray(event.output)) return undefined
  if (event.output.type === "web_search_tool_result_error" || typeof event.output.errorCode === "string")
    return `search result error: ${String(event.output.errorCode ?? event.output.type)}`
  return undefined
}

// Built here rather than via `openai.tools.webSearch()` / `anthropic.tools.webSearch_20250305()`:
// those carry the provider package's own provider-utils schema type, which is not the
// one `ai` checks against. The SDKs only read the id and args when preparing tools.
const SERVER_TOOL_IDS: Record<string, `${string}.${string}`> = {
  "@ai-sdk/openai": "openai.web_search",
  "@ai-sdk/anthropic": "anthropic.web_search_20250305",
}

function providerTool(model: Provider.Model): Tool | undefined {
  const id = SERVER_TOOL_IDS[model.api.npm]
  if (!id) return undefined
  return { type: "provider", id, args: {}, inputSchema: jsonSchema({ type: "object" }) }
}

/**
 * Injects the provider's server search tool for this request when native search
 * applies, hiding the client `websearch` declaration. Inputs are not mutated;
 * `websearch` stays in `tools` so a fallback retry can declare it again.
 */
export function apply(input: {
  settings: Settings
  model: Provider.Model
  sessionID: string
  ruleset: Permission.Ruleset
  ephemeral?: boolean
  small?: boolean
  tools: Record<string, Tool>
  activeTools: string[]
}): { tools: Record<string, Tool>; activeTools: string[]; route: Route | undefined } {
  const skip = { tools: input.tools, activeTools: input.activeTools, route: undefined }
  if (input.ephemeral || input.small || !input.tools.websearch) return skip
  const configured = route(input.settings, input.model)
  if (!configured) return skip
  if (Permission.evaluate("websearch", "*", input.ruleset).action !== "allow") return skip
  const failed = failures(input.sessionID, input.model)
  if (failed.search !== undefined) return skip
  const server = providerTool(input.model)
  if (!server) return skip
  return {
    tools: { ...input.tools, [TOOL_NAME]: server },
    activeTools: [...input.activeTools.filter((name) => name !== "websearch" && name !== TOOL_NAME), TOOL_NAME],
    route: failed.replay !== undefined ? { replay: "text" } : configured,
  }
}
