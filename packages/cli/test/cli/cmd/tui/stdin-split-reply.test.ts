import { describe, expect, test } from "bun:test"
import { StdinParser } from "@opentui/core"

// FC-039 (patch): a terminal reply that reaches stdin in two chunks must stay
// one response, not leak its tail into the prompt as typed keys.
type ParsedEvent = Parameters<Parameters<StdinParser["drain"]>[0]>[0]

function parse(chunks: Array<{ text: string; gapMs: number }>) {
  const events: ParsedEvent[] = []
  const parser = new StdinParser({ timeoutMs: 20, armTimeouts: true, onTimeoutFlush: () => parser.drain((e) => events.push(e)) })
  return (async () => {
    for (const chunk of chunks) {
      parser.push(Buffer.from(chunk.text, "latin1"))
      parser.drain((e) => events.push(e))
      await Bun.sleep(chunk.gapMs)
    }
    parser.drain((e) => events.push(e))
    parser.destroy()
    return events
  })()
}

describe("stdin parser split terminal replies (patch)", () => {
  test("a DCS reply split by more than the key timeout stays one response", async () => {
    const events = await parse([
      { text: "\x1bP1$r", gapMs: 60 },
      { text: "48;2;10;10;10m\x1b\\", gapMs: 30 },
    ])
    expect(events).toEqual([{ type: "response", protocol: "dcs", sequence: "\x1bP1$r48;2;10;10;10m\x1b\\" }])
  })

  test("an OSC reply split the same way stays one response", async () => {
    const events = await parse([
      { text: "\x1b]11;rgb:0a0a/", gapMs: 60 },
      { text: "0a0a/0a0a\x07", gapMs: 30 },
    ])
    expect(events.filter((e) => e.type === "key")).toEqual([])
  })

  test("a lone Escape is still a key after the short timeout", async () => {
    const events = await parse([{ text: "\x1b", gapMs: 60 }])
    expect(events).toEqual([expect.objectContaining({ type: "key", key: expect.objectContaining({ name: "escape" }) })])
  })
})

// FC-039: a reply whose halves arrive after the string timeout (a slow host, or
// an event loop stalled past it) must not type its tail into the prompt either.
describe("stdin parser late tails of flushed terminal replies (patch)", () => {
  function manual() {
    let now = 0
    const clock = { now: () => now, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {} }
    const events: ParsedEvent[] = []
    const parser = new StdinParser({ timeoutMs: 20, armTimeouts: false, clock })
    const feed = (text: string) => {
      parser.push(Buffer.from(text, "latin1"))
      parser.drain((e) => events.push(e))
    }
    const wait = (ms: number) => {
      now += ms
      parser.flushTimeout(now)
      parser.drain((e) => events.push(e))
    }
    const keys = () => events.flatMap((e) => (e.type === "key" ? [e.key.sequence] : []))
    return { feed, wait, keys, events }
  }

  for (const [name, head, tail] of [
    ["DCS", "\x1bP1$r48;2;10;10;", "10m\x1b\\"],
    ["OSC with ST", "\x1b]11;rgb:0a0a/", "0a0a/0a0a\x1b\\"],
    ["OSC with BEL", "\x1b]11;rgb:0a0a/", "0a0a/0a0a\x07"],
  ] as const)
    test(`the tail of a ${name} reply flushed on timeout is not typed`, () => {
      const p = manual()
      p.feed(head)
      p.wait(1500)
      p.feed(tail)
      expect(p.keys()).toEqual([])
      expect(p.events.filter((e) => e.type === "response")).toHaveLength(2)
    })

  test("typing after a flushed reply is still typed", () => {
    const p = manual()
    p.feed("\x1bP1$r48;2;10;10;")
    p.wait(1500)
    p.feed("h")
    p.feed("i")
    expect(p.keys()).toEqual(["h", "i"])
  })

  test("a typed Alt+backslash after a flushed reply is still a key", () => {
    const p = manual()
    p.feed("\x1bP1$r")
    p.wait(1500)
    p.feed("\x1b\\")
    expect(p.keys()).toEqual(["\x1b\\"])
  })

  test("a tail arriving long after the flush is not swallowed", () => {
    const p = manual()
    p.feed("\x1bP1$r48;2;10;10;")
    p.wait(1500)
    p.wait(20_000)
    p.feed("10m\x1b\\")
    expect(p.keys().length).toBeGreaterThan(0)
  })
})
