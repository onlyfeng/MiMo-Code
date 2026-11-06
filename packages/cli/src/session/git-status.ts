/**
 * The repository status the Claude environment prompt carries. It sits in the
 * fixed request prefix, which compaction never trims, so it has to stay small:
 * listing every untracked file put 86,424 lines (9.7M characters) of one
 * worktree's scratch directory into the prefix, and requests no longer fit any
 * model's window.
 */

/** `--untracked-files=normal` names an untracked directory once, not each file under it. */
export const ARGS = ["status", "--short", "--untracked-files=normal"]
export const MAX_LINES = 200
export const MAX_CHARS = 10_000

/** Caps `text` at `MAX_LINES` lines and `MAX_CHARS` characters, ending with a note of what was left out. */
export function cap(text: string) {
  const lines = text.split("\n")
  const kept: string[] = []
  let size = 0
  for (const line of lines) {
    if (kept.length >= MAX_LINES || size + line.length + 1 > MAX_CHARS - 200) break
    kept.push(line)
    size += line.length + 1
  }
  const omitted = lines.length - kept.length
  if (omitted === 0) return text
  return [...kept, `... ${omitted} more entries omitted; run \`git status\` for the full list.`].join("\n")
}

const SECTION_START = "\nStatus:\n"
const SECTION_END = "\n\nRecent commits:"

/**
 * True when a frozen system prompt carries a Claude environment status section
 * longer than `cap` allows, i.e. one rendered before the cap existed. Such a
 * prefix has to be rebuilt; reusing it keeps every request over the window.
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
