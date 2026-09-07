import { Flag } from "@/flag/flag"

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

export function isMcpToolSearchEnabled(
  enabled: boolean,
  harness: HarnessMode | undefined,
  modelID = "",
  modelAPIID?: string,
  modelFamily?: string,
  harnessModel?: string,
) {
  // The dedicated MCP selector is independent of prompt/toolset selection.
  if (enabled) return true
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

export function isMimoV25Model(...values: Array<string | undefined>) {
  return values.some((value) => value && /(?:^|[/_-])mimo-v2\.5(?:-pro)?$/.test(value.toLowerCase()))
}

export function isMimoModel(...values: Array<string | undefined>) {
  return values.some((value) => value && /(?:^|[/_-])mimo(?:$|[/_.-])/i.test(value))
}

export function usesMimoResponsesApi(...values: Array<string | undefined>) {
  if (isMimoV25Model(...values)) return false
  const ids = values.flatMap((value) => (value ? [value.toLowerCase()] : []))
  return isMimoModel(...ids) && ids.some((id) => /(?:^|[/_.-])ptc(?:$|[/_.-])/.test(id))
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
