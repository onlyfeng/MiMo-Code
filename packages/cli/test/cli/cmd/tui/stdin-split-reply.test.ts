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
