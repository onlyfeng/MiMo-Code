/**
 * Line-level view of an SSE body for `wrapSSE`: which bytes start an event (a
 * non-comment line) and a content-free tally of what arrived. A stream that
 * stalls for minutes behind a gateway's heartbeats needs that tally to show
 * what the gateway actually sent: comments, events of some name, or `data:`
 * lines of some `type`. Payload text is never kept.
 */

const PREFIX = 256
const KEYS = 32

export interface Summary {
  durationMs: number
  bytes: number
  comments: number
  events: Record<string, number>
  dataTypes: Record<string, number>
  sinceLastEventMs: number
}

export function track(now: () => number = Date.now) {
  const started = now()
  const decoder = new TextDecoder()
  const events = new Map<string, number>()
  const dataTypes = new Map<string, number>()
  let lastEvent = started
  let bytes = 0
  let comments = 0
  let head = ""
  let length = 0

  const count = (map: Map<string, number>, key: string) => {
    if (map.has(key) || map.size < KEYS) map.set(key, (map.get(key) ?? 0) + 1)
  }

  const close = () => {
    if (length === 0) return
    if (head.startsWith(":")) comments++
    else if (head.startsWith("event:")) count(events, head.slice(6).trim() || "(empty)")
    else if (head.startsWith("data:")) {
      const data = head.slice(5).trim()
      const type = /"type"\s*:\s*"([^"]{1,64})"/.exec(data)?.[1]
      count(dataTypes, type ?? (data === "[DONE]" ? "[DONE]" : "(untyped)"))
    }
    head = ""
    length = 0
  }

  return {
    /** Feeds a chunk; true when it starts a non-comment line. */
    push(chunk: Uint8Array) {
      bytes += chunk.byteLength
      let event = false
      for (const char of decoder.decode(chunk, { stream: true })) {
        if (char === "\n" || char === "\r") {
          close()
          continue
        }
        if (length === 0 && char !== ":") event = true
        if (length < PREFIX) head += char
        length++
      }
      if (event) lastEvent = now()
      return event
    },
    lastEvent: () => lastEvent,
    summary(): Summary {
      const at = now()
      return {
        durationMs: at - started,
        bytes,
        comments,
        events: Object.fromEntries(events),
        dataTypes: Object.fromEntries(dataTypes),
        sinceLastEventMs: at - lastEvent,
      }
    },
  }
}

export * as SseStats from "./sse-stats"
