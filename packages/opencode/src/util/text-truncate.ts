// Centralized caps for model-visible text. Injection sources (instructions,
// skills, inbox, MCP/data text, synthetic command/skill content) and history
// replay share one byte budget; the max-mode judge uses character budgets.
export const MODEL_VISIBLE_TEXT_CAP_BYTES = 50 * 1024
export const JUDGE_FIELD_MAX_CHARS = 8_000
export const JUDGE_TOOL_INPUT_MAX_CHARS = 2_000

export type TruncateKeep = "head" | "tail" | "head+tail"

// Largest byte index <= maxBytes that doesn't split a UTF-8 multibyte sequence.
// Continuation bytes match 0b10xxxxxx (0x80-0xBF); walk back to a lead byte.
function utf8HeadBoundary(buf: Buffer, maxBytes: number) {
  if (buf.length <= maxBytes) return buf.length
  let end = maxBytes
  while (end > 0 && (buf[end]! & 0xc0) === 0x80) end--
  return end
}

// Smallest byte index >= start that begins a UTF-8 character.
function utf8TailBoundary(buf: Buffer, start: number) {
  let i = Math.max(0, start)
  while (i < buf.length && (buf[i]! & 0xc0) === 0x80) i++
  return i
}

export function takeUtf8PrefixByBytes(text: string, maxBytes: number) {
  const buf = Buffer.from(text, "utf8")
  if (buf.length <= maxBytes) return text
  return buf.subarray(0, utf8HeadBoundary(buf, Math.max(0, maxBytes))).toString("utf8")
}

export function takeUtf8SuffixByBytes(text: string, maxBytes: number) {
  const buf = Buffer.from(text, "utf8")
  if (buf.length <= maxBytes) return text
  return buf.subarray(utf8TailBoundary(buf, buf.length - Math.max(0, maxBytes))).toString("utf8")
}

// UTF-8 safe, O(n) byte cap. `keep` selects which slice survives — use
// `head+tail` for tool errors / tracebacks whose signal sits at the tail.
// The marker always contains `<label> truncated <suffix>` so callers (and
// the model) can identify what was dropped and why.
export function capUtf8TextByBytes(
  text: string,
  maxBytes: number,
  label: string,
  suffix = "before model injection",
  keep: TruncateKeep = "head",
) {
  // Replay paths hand us values typed as string that are undefined at runtime
  // (e.g. a completed tool part persisted without output); pass them through
  // untouched like the pre-truncation code did.
  if (typeof text !== "string") return text
  const buf = Buffer.from(text, "utf8")
  if (buf.length <= maxBytes) return text

  const marker = (omitted: number) => `... ${omitted} bytes of ${label} truncated ${suffix} ...`

  if (keep === "tail") {
    const reserve = Buffer.byteLength(`${marker(buf.length)}\n\n`, "utf8")
    const start = utf8TailBoundary(buf, buf.length - Math.max(0, maxBytes - reserve))
    const tail = buf.subarray(start).toString("utf8")
    return `${marker(buf.length - Buffer.byteLength(tail, "utf8"))}\n\n${tail}`
  }

  if (keep === "head+tail") {
    const reserve = Buffer.byteLength(`\n\n${marker(buf.length)}\n\n`, "utf8")
    const budget = Math.max(0, maxBytes - reserve)
    const headEnd = utf8HeadBoundary(buf, Math.floor(budget * 0.65))
    const tailStart = utf8TailBoundary(buf, buf.length - Math.max(0, budget - headEnd))
    const head = buf.subarray(0, headEnd).toString("utf8")
    const tail = buf.subarray(tailStart).toString("utf8")
    const omitted = buf.length - Buffer.byteLength(head, "utf8") - Buffer.byteLength(tail, "utf8")
    return `${head}\n\n${marker(omitted)}\n\n${tail}`
  }

  const reserve = Buffer.byteLength(`\n\n${marker(buf.length)}`, "utf8")
  const end = utf8HeadBoundary(buf, Math.max(0, maxBytes - reserve))
  const head = buf.subarray(0, end).toString("utf8")
  return `${head}\n\n${marker(buf.length - Buffer.byteLength(head, "utf8"))}`
}

// Character-budget variant for the max-mode judge (counts visible chars, not
// bytes) and keeps both ends. Splits on UTF-16 surrogate boundaries so an
// emoji / astral char is never cut in half.
export function capTextByChars(
  text: string,
  maxChars: number,
  label: string,
  suffix = "before max-mode judge injection",
) {
  if (text.length <= maxChars) return text
  const marker = `\n\n[... ${label} truncated ${suffix} ...]\n\n`
  const budget = Math.max(0, maxChars - marker.length)
  const head = text.slice(0, Math.floor(budget * 0.65)).replace(/[\uD800-\uDBFF]$/, "")
  const tail = text.slice(-Math.floor(budget * 0.25)).replace(/^[\uDC00-\uDFFF]/, "")
  return head + marker + tail
}
