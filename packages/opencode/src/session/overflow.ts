import type { Config } from "@/config"
import type { Provider } from "@/provider"
import { ProviderTransform } from "@/provider"
import type { MessageV2 } from "./message-v2"
import type { ModelMessage } from "ai"
import { Token } from "../util"
import { capUtf8TextByBytes } from "../util/text-truncate"

const COMPACTION_BUFFER = 20_000

// Cap the output reservation so models with large output windows (e.g. 32K, 64K)
// don't strangle the usable input window. 20K covers >99.99% of compaction
// summary outputs based on production telemetry of summary token counts.
const OUTPUT_CAP = 20_000
const REQUEST_PREFLIGHT_GUARD = 5_000
const REQUEST_PREFLIGHT_TOOL_SCHEMA_MAX_BYTES = 80 * 1024

type RequestEstimateInput = {
  prebuiltSystem?: string[]
  system?: string[]
  messages: ModelMessage[]
  tools?: Record<string, unknown>
  toolChoice?: unknown
}

export type RequestOverflowClassification =
  | { type: "ok" }
  | { type: "overflow"; requestTokens: number; staticTokens: number }
  | { type: "overflow-static"; requestTokens: number; staticTokens: number }

function safeStringify(input: unknown) {
  const seen = new WeakSet<object>()
  return JSON.stringify(input, (_key, value) => {
    if (typeof value === "function") return "[function]"
    if (typeof value === "symbol") return value.toString()
    if (value && typeof value === "object") {
      if (seen.has(value)) return "[circular]"
      seen.add(value)
    }
    return value
  }) ?? ""
}

export function usable(input: { cfg: Config.Info; model: Provider.Model }) {
  const context = input.model.limit.context
  if (context === 0) return 0

  const reserved =
    input.cfg.compaction?.reserved ?? Math.min(COMPACTION_BUFFER, ProviderTransform.maxOutputTokens(input.model))
  const outputReserve = Math.min(ProviderTransform.maxOutputTokens(input.model), OUTPUT_CAP)

  return input.model.limit.input
    ? Math.max(0, input.model.limit.input - reserved)
    : Math.max(0, context - outputReserve - reserved)
}

export function isOverflow(input: { cfg: Config.Info; tokens: MessageV2.Assistant["tokens"]; model: Provider.Model }) {
  if (input.cfg.compaction?.auto === false) return false
  if (input.model.limit.context === 0) return false

  const count =
    input.tokens.total || input.tokens.input + input.tokens.output + input.tokens.cache.read + input.tokens.cache.write
  return count >= usable(input)
}

export function estimateRequestTokens(input: RequestEstimateInput) {
  const tools = safeStringify(input.tools ?? {})
  const serialized = safeStringify({
    system: input.prebuiltSystem ?? input.system ?? [],
    messages: input.messages,
    tools: capUtf8TextByBytes(tools, REQUEST_PREFLIGHT_TOOL_SCHEMA_MAX_BYTES, "tool schemas"),
    toolChoice: input.toolChoice,
  })
  const charEstimate = Token.estimate(serialized)
  const byteEstimate = Math.round(Buffer.byteLength(serialized, "utf8") / 3)
  return Math.max(charEstimate, byteEstimate)
}

export function isRequestOverflow(input: {
  cfg: Config.Info
  model: Provider.Model
  requestTokens: number
}) {
  if (input.cfg.compaction?.auto === false) return false
  if (input.model.limit.context === 0) return false
  const limit = usable(input)
  if (limit <= 0) return input.requestTokens > 0
  const guard = Math.min(REQUEST_PREFLIGHT_GUARD, Math.floor(limit * 0.1))
  return input.requestTokens >= Math.max(1, limit - guard)
}

export function classifyRequestOverflow(
  input: RequestEstimateInput & {
    cfg: Config.Info
    model: Provider.Model
  },
): RequestOverflowClassification {
  const requestTokens = estimateRequestTokens(input)
  if (!isRequestOverflow({ cfg: input.cfg, model: input.model, requestTokens })) return { type: "ok" }
  const staticTokens = estimateRequestTokens({ ...input, messages: [] })
  return isRequestOverflow({ cfg: input.cfg, model: input.model, requestTokens: staticTokens })
    ? { type: "overflow-static", requestTokens, staticTokens }
    : { type: "overflow", requestTokens, staticTokens }
}

export function pressureLevel(input: {
  cfg: Config.Info
  tokens: MessageV2.Assistant["tokens"]
  model: Provider.Model
}): 0 | 1 | 2 | 3 {
  if (input.cfg.compaction?.auto === false) return 0
  if (input.model.limit.context === 0) return 0

  const count =
    input.tokens.total || input.tokens.input + input.tokens.output + input.tokens.cache.read + input.tokens.cache.write
  const limit = usable(input)
  if (limit === 0) return 0

  const ratio = count / limit
  if (ratio < 0.50) return 0
  if (ratio < 0.70) return 1
  if (ratio < 0.85) return 2
  return 3
}
