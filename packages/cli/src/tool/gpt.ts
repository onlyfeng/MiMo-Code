import { Flag } from "@/flag/flag"
import type { McpToolSearchMode } from "./mcp-tool-search"

export type HarnessMode = "auto" | "codex" | "default"

// Explicit configuration names a canonical modern GPT identity, never a
// display name or wildcard. This compatibility field never selects a harness.
export const GPT_HARNESS_MODEL_PATTERN =
  /^gpt-(?:[5-9]|[1-9][0-9]+)(?:\.[0-9]+)*(?:-(?!oss(?:-|$)|mimo(?:-|$)|gpt-4)[a-z0-9]+)*$/

// An explicit session harness takes precedence over the process default.
export function usesCodexMode(harness?: HarnessMode) {
  if (harness === "codex") return true
  if (harness === "default") return false
  return Flag.MIMOCODE_CODEX_MODE === true
}

export function mcpToolSearchMode(configured: McpToolSearchMode, harness: HarnessMode | undefined): McpToolSearchMode {
  if (usesCodexMode(harness)) return { type: "always" }
  return configured
}
