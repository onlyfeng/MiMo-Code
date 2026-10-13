import { Flag } from "@/flag/flag"
import type { McpToolSearchMode } from "./mcp-tool-search"

export type HarnessMode = "auto" | "codex" | "default"
export type ResolvedHarnessMode = Exclude<HarnessMode, "auto">

// Explicit configuration names a canonical modern GPT identity, never a
// display name, wildcard, or arbitrary instruction to force the Codex harness.
export const GPT_HARNESS_MODEL_PATTERN =
  /^gpt-(?:[5-9]|[1-9][0-9]+)(?:\.[0-9]+)*(?:-(?!oss(?:-|$)|mimo(?:-|$)|gpt-4)[a-z0-9]+)*$/

export type HarnessResolutionInput = {
  modelID: string
  modelAPIID?: string
  modelFamily?: string
  harnessModel?: string
  harness?: HarnessMode
}

function codexHarnessOverride(harness?: HarnessMode): boolean | undefined {
  if (harness === "codex") return true
  if (harness === "default") return false
  return undefined
}

export function isGPTModel(...values: Array<string | undefined>) {
  const ids = values.flatMap((value) => (value ? [value.toLowerCase()] : []))
  if (ids.some((id) => id.includes("gpt-oss"))) return false
  return ids.some((id) => id.includes("gpt"))
}

export function resolveHarnessMode(input: HarnessResolutionInput): ResolvedHarnessMode {
  const override = codexHarnessOverride(input.harness)
  if (override !== undefined) return override ? "codex" : "default"
  const processMode = Flag.MIMOCODE_CODEX_MODE
  if (processMode !== undefined) return processMode ? "codex" : "default"
  const identities = [input.modelID, input.modelAPIID, input.modelFamily].flatMap((value) =>
    value ? [value.toLowerCase()] : [],
  )
  if (
    identities.some(
      (id) => id.includes("gpt-4") || id.includes("gpt-oss") || /(?:^|[/_.:-])(?:mimo|oss)(?:$|[/_.:-])/.test(id),
    )
  )
    return "default"
  if (input.harnessModel && GPT_HARNESS_MODEL_PATTERN.test(input.harnessModel)) return "codex"
  const modelID = input.modelID.toLowerCase()
  if (modelID.includes("gpt-") && !modelID.includes("oss") && !modelID.includes("gpt-4")) return "codex"
  return "default"
}

// The configured deferral mode applies to the default harness; the resolved
// Codex harness always defers, since exec reaches MCP tools without a search.
export function mcpToolSearchMode(
  configured: McpToolSearchMode,
  harness: HarnessMode | undefined,
  modelID = "",
  modelAPIID?: string,
  modelFamily?: string,
  harnessModel?: string,
): McpToolSearchMode {
  if (resolveHarnessMode({ modelID, modelAPIID, modelFamily, harnessModel, harness }) === "codex") return { type: "always" }
  return configured
}

export function isMimoV25Model(...values: Array<string | undefined>) {
  return values.some((value) => value && /(?:^|[/_-])mimo-v2\.5(?:-pro)?$/.test(value.toLowerCase()))
}

export function usesGPTToolset(
  modelID: string,
  harness?: HarnessMode,
  modelAPIID?: string,
  modelFamily?: string,
  harnessModel?: string,
) {
  return (
    resolveHarnessMode({
      modelID,
      modelAPIID,
      modelFamily,
      harnessModel,
      harness,
    }) === "codex"
  )
}
