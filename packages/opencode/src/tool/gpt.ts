import { Flag } from "@/flag/flag"

export function isGPTModel(...values: Array<string | undefined>) {
  const ids = values.flatMap((value) => (value ? [value.toLowerCase()] : []))
  if (ids.some((id) => id.includes("gpt-oss"))) return false
  return ids.some((id) => id.includes("gpt"))
}

export function isMcpToolSearchEnabled(enabled: boolean, ...modelIDs: Array<string | undefined>) {
  if (Flag.MIMOCODE_CODEX_MODE || enabled) return true
  if (isMimoV25Model(...modelIDs)) return false
  return isGPTModel(...modelIDs) || usesMimoCodexMode(...modelIDs)
}

export function isMimoV25Model(...values: Array<string | undefined>) {
  return values.some((value) => value && /(?:^|[/_-])mimo-v2\.5(?:-pro)?$/.test(value.toLowerCase()))
}

export function usesMimoCodexMode(...values: Array<string | undefined>) {
  const ids = values.flatMap((value) => (value ? [value.toLowerCase()] : []))
  if (isMimoV25Model(...ids)) return false
  return ids.some((id) => /(?:^|[/_-])mimo(?:$|[/_.-])/.test(id))
}

export function usesGPTToolset(modelID: string, ...aliases: Array<string | undefined>) {
  const modelIDs = [modelID, ...aliases]
  if (Flag.MIMOCODE_CODEX_MODE) return true
  if (isMimoV25Model(...modelIDs)) return false
  return (
    (modelID.includes("gpt-") && !modelID.includes("oss") && !modelID.includes("gpt-4")) ||
    usesMimoCodexMode(...modelIDs)
  )
}
