import { describe, expect, test } from "bun:test"
import { PromptInput, hasSubstantiveContent } from "../../src/session/prompt"
import type { MessageV2 } from "../../src/session/message-v2"

// ---------------------------------------------------------------------------
// Schema: PromptInput.parts must have at least one element
// ---------------------------------------------------------------------------
describe("PromptInput.parts schema", () => {
  const base = { sessionID: "sess_test" }

  test("rejects empty parts array", () => {
    const result = PromptInput.safeParse({ ...base, parts: [] })
    expect(result.success).toBe(false)
  })

  test("accepts a single text part", () => {
    const result = PromptInput.safeParse({
      ...base,
      parts: [{ type: "text", text: "hello" }],
    })
    expect(result.success).toBe(true)
  })

  test("accepts a single file part", () => {
    const result = PromptInput.safeParse({
      ...base,
      parts: [{ type: "file", url: "file:///tmp/x.png", mime: "image/png" }],
    })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// hasSubstantiveContent — production-side guard
// ---------------------------------------------------------------------------
describe("hasSubstantiveContent", () => {
  const makePart = (overrides: Partial<MessageV2.Part> = {}): MessageV2.Part =>
    ({
      id: "p1",
      messageID: "m1",
      sessionID: "s1",
      type: "text",
      text: "",
      synthetic: false,
      time: { start: 0, end: 0 },
      ...overrides,
    }) as MessageV2.Part

  // --- cases that should be rejected (no substantive content) ---

  test("empty parts array → false", () => {
    expect(hasSubstantiveContent([])).toBe(false)
  })

  test("text with empty string → false", () => {
    expect(hasSubstantiveContent([makePart({ type: "text", text: "" })])).toBe(false)
  })

  test("text with whitespace only → false", () => {
    expect(hasSubstantiveContent([makePart({ type: "text", text: "   \n\t  " })])).toBe(false)
  })

  test("ignored text with non-empty content → false", () => {
    expect(
      hasSubstantiveContent([makePart({ type: "text", text: "some text", ignored: true })]),
    ).toBe(false)
  })

  test("text/plain file → false (droppable by send-side filter)", () => {
    expect(
      hasSubstantiveContent([
        makePart({ type: "file", url: "file:///tmp/x.txt", mime: "text/plain" } as any),
      ]),
    ).toBe(false)
  })

  test("application/x-directory file → false (droppable)", () => {
    expect(
      hasSubstantiveContent([
        makePart({
          type: "file",
          url: "file:///tmp/dir",
          mime: "application/x-directory",
        } as any),
      ]),
    ).toBe(false)
  })

  test("only ignored text + text/plain file → false", () => {
    expect(
      hasSubstantiveContent([
        makePart({ type: "text", text: "real content", ignored: true }),
        makePart({ type: "file", url: "file:///tmp/x.txt", mime: "text/plain" } as any),
      ]),
    ).toBe(false)
  })

  // --- cases that should be accepted (substantive content) ---

  test("non-empty non-ignored text → true", () => {
    expect(
      hasSubstantiveContent([makePart({ type: "text", text: "hello world" })]),
    ).toBe(true)
  })

  test("image file → true", () => {
    expect(
      hasSubstantiveContent([
        makePart({ type: "file", url: "data:image/png;base64,abc", mime: "image/png" } as any),
      ]),
    ).toBe(true)
  })

  test("application/pdf file → true", () => {
    expect(
      hasSubstantiveContent([
        makePart({ type: "file", url: "file:///tmp/doc.pdf", mime: "application/pdf" } as any),
      ]),
    ).toBe(true)
  })

  test("checkpoint part → true", () => {
    expect(
      hasSubstantiveContent([
        makePart({ type: "checkpoint" } as any),
      ]),
    ).toBe(true)
  })

  test("compaction part → true", () => {
    expect(
      hasSubstantiveContent([
        makePart({ type: "compaction" } as any),
      ]),
    ).toBe(true)
  })

  test("subtask part → true", () => {
    expect(
      hasSubstantiveContent([
        makePart({ type: "subtask" } as any),
      ]),
    ).toBe(true)
  })

  test("ignored text alongside real text → true (real text wins)", () => {
    expect(
      hasSubstantiveContent([
        makePart({ type: "text", text: "ignored", ignored: true }),
        makePart({ type: "text", text: "real content" }),
      ]),
    ).toBe(true)
  })

  test("empty text alongside image → true (image wins)", () => {
    expect(
      hasSubstantiveContent([
        makePart({ type: "text", text: "" }),
        makePart({ type: "file", url: "data:image/png;base64,abc", mime: "image/png" } as any),
      ]),
    ).toBe(true)
  })

  test("oversized image that becomes text placeholder is still substantive", () => {
    // When an oversized/undecodable image is processed, it becomes a text part
    // with content like "ERROR: Image file is empty or corrupted..." — this is
    // non-empty text and should be substantive.
    expect(
      hasSubstantiveContent([
        makePart({
          type: "text",
          text: "ERROR: Image file is empty or corrupted. Please provide a valid image.",
        }),
      ]),
    ).toBe(true)
  })
})
