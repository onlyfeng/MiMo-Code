const MAX_CHARS = 10_000

const SECTION_START = "\nStatus:\n"
const SECTION_END = "\n\nRecent commits:"

/**
 * True when a frozen system prompt carries a Claude environment status section
 * longer than the historical 10,000-character limit and needs to be rebuilt.
 */
export function oversized(system: readonly string[]) {
  return system.some((part) => {
    if (!part.includes("gitStatus:")) return false
    const start = part.indexOf(SECTION_START)
    if (start < 0) return false
    const end = part.indexOf(SECTION_END, start)
    const length = (end < 0 ? part.length : end) - (start + SECTION_START.length)
    return length > MAX_CHARS
  })
}

export * as GitStatusPrompt from "./git-status"
