import { describe, expect, test } from "bun:test"
import { takeUtf8PrefixByBytes, takeUtf8SuffixByBytes } from "../../src/util/text-truncate"

const text = "A界🙂Z"

describe("UTF-8 byte slices", () => {
  test("keeps the requested ASCII prefix or suffix", () => {
    expect(takeUtf8PrefixByBytes("abcdef", 3)).toBe("abc")
    expect(takeUtf8SuffixByBytes("abcdef", 3)).toBe("def")
  })

  test("stops at complete multibyte boundaries", () => {
    expect(takeUtf8PrefixByBytes(text, 1)).toBe("A")
    expect(takeUtf8PrefixByBytes(text, 2)).toBe("A")
    expect(takeUtf8PrefixByBytes(text, 4)).toBe("A界")
    expect(takeUtf8PrefixByBytes(text, 5)).toBe("A界")
    expect(takeUtf8PrefixByBytes(text, 8)).toBe("A界🙂")

    expect(takeUtf8SuffixByBytes(text, 1)).toBe("Z")
    expect(takeUtf8SuffixByBytes(text, 2)).toBe("Z")
    expect(takeUtf8SuffixByBytes(text, 5)).toBe("🙂Z")
    expect(takeUtf8SuffixByBytes(text, 6)).toBe("🙂Z")
    expect(takeUtf8SuffixByBytes(text, 8)).toBe("界🙂Z")
  })

  test("handles zero, negative, and oversized budgets", () => {
    expect(takeUtf8PrefixByBytes(text, 0)).toBe("")
    expect(takeUtf8SuffixByBytes(text, 0)).toBe("")
    expect(takeUtf8PrefixByBytes(text, -1)).toBe("")
    expect(takeUtf8SuffixByBytes(text, -1)).toBe("")
    expect(takeUtf8PrefixByBytes(text, Buffer.byteLength(text, "utf8"))).toBe(text)
    expect(takeUtf8SuffixByBytes(text, Buffer.byteLength(text, "utf8") + 1)).toBe(text)
  })

  test("never exceeds the byte budget or emits a replacement character", () => {
    Array.from({ length: Buffer.byteLength(text, "utf8") + 1 }, (_, budget) => budget).forEach((budget) => {
      const prefix = takeUtf8PrefixByBytes(text, budget)
      const suffix = takeUtf8SuffixByBytes(text, budget)

      expect(Buffer.byteLength(prefix, "utf8")).toBeLessThanOrEqual(budget)
      expect(Buffer.byteLength(suffix, "utf8")).toBeLessThanOrEqual(budget)
      expect(prefix).not.toContain("\uFFFD")
      expect(suffix).not.toContain("\uFFFD")
    })
  })
})
