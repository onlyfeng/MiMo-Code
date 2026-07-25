import { describe, expect, test } from "bun:test"
import { safeStringify, safeStringifySimple, safeStringifyNoThrow } from "../../src/util/safe-stringify"

describe("safeStringify", () => {
  test("serializes plain objects", () => {
    const result = safeStringify({ a: 1, b: "hello" })
    expect(result.serialized).toBe('{"a":1,"b":"hello"}')
    expect(result.transformed).toBe(false)
  })

  test("detects circular references", () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    const result = safeStringify(obj)
    expect(result.serialized).toContain('"self":"[circular]"')
    expect(result.transformed).toBe(true)
  })

  test("replaces functions", () => {
    const obj = { fn: () => {} }
    const result = safeStringify(obj)
    expect(result.serialized).toContain('"fn":"[function]"')
    expect(result.transformed).toBe(true)
  })

  test("replaces symbols", () => {
    const obj = { s: Symbol("test") }
    const result = safeStringify(obj)
    expect(result.serialized).toContain('"s":"Symbol(test)"')
    expect(result.transformed).toBe(true)
  })

  test("handles bigint when enabled", () => {
    const obj = { n: 123n }
    const result = safeStringify(obj, { bigint: true })
    expect(result.serialized).toBe('{"n":"123"}')
    expect(result.transformed).toBe(true)
  })

  test("throws on bigint when bigint option is false", () => {
    const obj = { n: 123n }
    expect(() => safeStringify(obj)).toThrow()
  })

  test("handles shared (non-circular) DAG references", () => {
    const shared = { x: 1 }
    const obj = { before: shared, after: shared }
    const result = safeStringify(obj)
    // DAG shared references are reported as [circular] — this is a known
    // limitation of the WeakSet-based detection. Documented for correctness.
    expect(result.serialized).toContain('"after":"[circular]"')
    expect(result.transformed).toBe(true)
  })

  test("returns String(undefined) for undefined input", () => {
    const result = safeStringify(undefined)
    expect(result.serialized).toBe("undefined")
  })
})

describe("safeStringifySimple", () => {
  test("returns just the serialized string", () => {
    expect(safeStringifySimple({ a: 1 })).toBe('{"a":1}')
  })

  test("handles circular references", () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    expect(safeStringifySimple(obj)).toContain('"self":"[circular]"')
  })
})

describe("safeStringifyNoThrow", () => {
  test("serializes normal objects", () => {
    expect(safeStringifyNoThrow({ cmd: "ls" })).toBe('{"cmd":"ls"}')
  })

  test("handles bigint via bigint option", () => {
    expect(safeStringifyNoThrow({ n: 42n })).toBe('{"n":"42"}')
  })

  test("returns default fallback on toJSON error", () => {
    const bad = { toJSON: () => { throw new Error("boom") } }
    const result = safeStringifyNoThrow(bad)
    expect(result).toBe("[unserializable tool input]")
  })

  test("returns custom fallback when provided", () => {
    const bad = { toJSON: () => { throw new Error("boom") } }
    const result = safeStringifyNoThrow(bad, "[custom fallback]")
    expect(result).toBe("[custom fallback]")
  })
})
