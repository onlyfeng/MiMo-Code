// Provider-native in-turn web search (DC-WEBSEARCH-001). The session model
// searches through its provider's server tool when `websearch.native` opts the
// route in; search-specific failures fall back to the client `websearch` tool.
import type { Config } from "@/config"
import type { Provider } from "@/provider"

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
