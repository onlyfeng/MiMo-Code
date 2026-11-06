import { describe, expect, test } from "bun:test"
import { SseStats } from "../../src/provider/sse-stats"

const enc = new TextEncoder()

// A clock the test moves by hand.
function clock(start = 1_000) {
  let now = start
  return { now: () => now, advance: (ms: number) => (now += ms) }
}

describe("SseStats", () => {
  test("only a non-comment line counts as an event, even split across chunks", () => {
    const time = clock()
    const stats = SseStats.track(time.now)
    time.advance(500)
    expect(stats.push(enc.encode(":\n\n: keep-"))).toBe(false)
    // The second half of a comment starts a chunk, not a line.
    expect(stats.push(enc.encode("alive\n\n"))).toBe(false)
    expect(stats.lastEvent()).toBe(1_000)
    time.advance(500)
    expect(stats.push(enc.encode("event: response.created\n"))).toBe(true)
    expect(stats.lastEvent()).toBe(2_000)
  })

  test("tallies comments, event names and data types without keeping payload text", () => {
    const time = clock()
    const stats = SseStats.track(time.now)
    const body = [
      ":",
      "",
      "event: response.created",
      'data: {"type":"response.created","sequence_number":0}',
      "",
      ": keep-alive",
      "",
      "event: keepalive",
      'data: {"type":"keepalive","sequence_number":1}',
      "",
      "event: response.output_text.delta",
      'data: {"type":"response.output_text.delta","delta":"secret answer text"}',
      "",
      "data: [DONE]",
      "",
      "",
    ].join("\r\n")
    // Feed it in 7-byte pieces so lines and the CRLF pairs split everywhere.
    const bytes = enc.encode(body)
    for (let i = 0; i < bytes.length; i += 7) stats.push(bytes.slice(i, i + 7))
    time.advance(90_000)

    const summary = stats.summary()
    expect(summary).toEqual({
      durationMs: 90_000,
      bytes: bytes.length,
      comments: 2,
      events: { "response.created": 1, keepalive: 1, "response.output_text.delta": 1 },
      dataTypes: { "response.created": 1, keepalive: 1, "response.output_text.delta": 1, "[DONE]": 1 },
      sinceLastEventMs: 90_000,
    })
    expect(JSON.stringify(summary)).not.toContain("secret")
  })

  test("a multi-byte character split across chunks is decoded once", () => {
    const stats = SseStats.track(clock().now)
    const bytes = enc.encode('data: {"type":"增量"}\n')
    const cut = bytes.indexOf(0xe5) + 1
    stats.push(bytes.slice(0, cut))
    stats.push(bytes.slice(cut))
    expect(stats.summary().dataTypes).toEqual({ 增量: 1 })
  })
})
