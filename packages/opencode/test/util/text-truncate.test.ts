import { describe, expect, test } from "bun:test"
import {
  capUtf8TextByBytes,
  capTextByChars,
  takeUtf8PrefixByBytes,
  takeUtf8SuffixByBytes,
} from "../../src/util/text-truncate"

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

  test("preserves isolated UTF-16 surrogates under actor-compatible budgets", () => {
    ;["\uD800", "\uDC00"].forEach((surrogate) => {
      const malformed = `A${surrogate}Z`
      const fullBudget = Buffer.byteLength(surrogate, "utf8") + 2
      const partialBudget = fullBudget - 1

      expect(takeUtf8PrefixByBytes(malformed, fullBudget)).toBe(malformed)
      expect(takeUtf8SuffixByBytes(malformed, fullBudget)).toBe(malformed)
      expect(takeUtf8PrefixByBytes(malformed, partialBudget)).toBe(`A${surrogate}`)
      expect(takeUtf8SuffixByBytes(malformed, partialBudget)).toBe(`${surrogate}Z`)
    })
  })
})

describe("capUtf8TextByBytes", () => {
  test("returns text unchanged when under budget", () => {
    expect(capUtf8TextByBytes("hello", 100, "test")).toBe("hello")
  })

  test("passes through non-string values", () => {
    expect(capUtf8TextByBytes(undefined as any, 100, "test")).toBeUndefined()
    expect(capUtf8TextByBytes(null as any, 100, "test")).toBeNull()
  })

  test("head mode keeps prefix and truncates tail", () => {
    const long = "a".repeat(1000)
    const result = capUtf8TextByBytes(long, 100, "test", "suffix", "head")
    expect(result).toContain("truncated suffix")
    expect(result).not.toContain("a".repeat(100))
    expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(120) // cap + marker overhead
  })

  test("tail mode keeps suffix and truncates head", () => {
    const long = "a".repeat(1000)
    const result = capUtf8TextByBytes(long, 100, "test", "suffix", "tail")
    expect(result).toContain("truncated suffix")
    expect(result).toContain("a".repeat(50)) // tail portion preserved
    expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(120)
  })

  test("head+tail mode keeps both ends", () => {
    const long = "a".repeat(500) + "MIDDLE" + "b".repeat(500)
    const result = capUtf8TextByBytes(long, 100, "test", "suffix", "head+tail")
    expect(result).toContain("truncated suffix")
    expect(result).toContain("aaa") // head portion
    expect(result).toContain("bbb") // tail portion
    expect(result).not.toContain("MIDDLE")
  })

  test("handles multibyte characters without splitting", () => {
    const cjk = "界".repeat(200) // 3 bytes each = 600 bytes
    const result = capUtf8TextByBytes(cjk, 100, "test")
    expect(result).not.toContain("\uFFFD")
    expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(120)
  })

  test("empty string returns empty", () => {
    expect(capUtf8TextByBytes("", 100, "test")).toBe("")
  })
})

describe("capTextByChars", () => {
  test("returns text unchanged when under budget", () => {
    expect(capTextByChars("hello", 100, "test")).toBe("hello")
  })

  test("truncates long text with marker", () => {
    const long = "x".repeat(20_000)
    const result = capTextByChars(long, 1000, "test")
    expect(result).toContain("truncated")
    expect(result.length).toBeLessThan(20_000)
  })

  test("preserves head and tail portions", () => {
    const head = "A".repeat(100)
    const tail = "Z".repeat(100)
    const long = head + "MIDDLE".repeat(500) + tail
    const result = capTextByChars(long, 300, "test")
    expect(result).toContain("AAA")
    expect(result).toContain("ZZZ")
    expect(result).not.toContain("MIDDLE".repeat(10))
  })

  test("handles emoji/astral characters without splitting surrogates", () => {
    const emoji = "🙂".repeat(100) // Each emoji is 2 UTF-16 code units
    const result = capTextByChars(emoji, 200, "test")
    expect(result).not.toContain("\uFFFD")
    expect(result.length).toBeLessThanOrEqual(200)
    const emojiCount = (result.match(/🙂/g) || []).length
    expect(emojiCount).toBeGreaterThan(0)
  })

  test.each([10, 50, 60, 100, 2000])(
    "small maxChars=%i never exceeds cap",
    (maxChars) => {
      const text = "x".repeat(10_000)
      const result = capTextByChars(text, maxChars, "test")
      expect(result.length).toBeLessThanOrEqual(maxChars)
      // For maxChars >= marker length, truncated marker is intact
      if (maxChars >= 60) expect(result).toContain("truncated")
    },
  )

  test("full budget is used (no 10% leak)", () => {
    const long = "x".repeat(10_000)
    const maxChars = 1000
    const result = capTextByChars(long, maxChars, "test")
    // The result should be close to maxChars (within marker overhead)
    expect(result.length).toBeGreaterThan(maxChars * 0.85)
    expect(result.length).toBeLessThanOrEqual(maxChars + 100) // marker can add some chars
  })
})
