import { Flag } from "@/flag/flag"

export type HarnessMode = "auto" | "codex" | "default"
export type ResolvedHarnessMode = Exclude<HarnessMode, "auto">

export type HarnessResolutionInput = {
  modelID: string
  modelAPIID?: string
  modelFamily?: string
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
  const ids = [input.modelID, input.modelAPIID, input.modelFamily]
  const override = codexHarnessOverride(input.harness)
  if (isMimoModel(...ids)) {
    if (override !== undefined) return override ? "codex" : "default"
    return Flag.MIMOCODE_CODEX_MODE ? "codex" : "default"
  }
  const modelID = input.modelID.toLowerCase()
  if (modelID.includes("gpt-") && !modelID.includes("oss") && !modelID.includes("gpt-4")) return "codex"
  if (override !== undefined) return override ? "codex" : "default"
  if (Flag.MIMOCODE_CODEX_MODE) return "codex"
  return "default"
}

export function isMcpToolSearchEnabled(
  enabled: boolean,
  harness: HarnessMode | undefined,
  ...modelIDs: Array<string | undefined>
) {
  if (enabled) return true
  const mode = resolveHarnessMode({
    modelID: modelIDs[0] ?? "",
    modelAPIID: modelIDs[1],
    modelFamily: modelIDs[2],
    harness,
  })
  if (harness === "codex" || harness === "default") return mode === "codex"
  if (mode === "codex") return true
  if (isMimoModel(...modelIDs)) return false
  return isGPTModel(...modelIDs)
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

export function usesGPTToolset(modelID: string, harness?: HarnessMode, ...aliases: Array<string | undefined>) {
  return (
    resolveHarnessMode({
      modelID,
      modelAPIID: aliases[0],
      modelFamily: aliases[1],
      harness,
    }) === "codex"
  )
}
