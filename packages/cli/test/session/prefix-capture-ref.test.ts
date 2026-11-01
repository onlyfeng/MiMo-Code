import { describe, expect, test } from "bun:test"
import { Effect, Exit, Layer, Scope } from "effect"
import { prefixCaptureRef } from "../../src/session/prefix-capture-ref"
import { SessionPrompt } from "../../src/session/prompt"

// Each build is a separate SessionPrompt layer, as when a test builds its own
// beside the process-wide AppRuntime.
const open = async () => {
  const scope = await Effect.runPromise(Scope.make())
  await Effect.runPromise(Layer.buildWithScope(SessionPrompt.defaultLayer, scope))
  return { capture: prefixCaptureRef.current, close: () => Effect.runPromise(Scope.close(scope, Exit.void)) }
}

describe("prefix capture registration", () => {
  test("disposing one SessionPrompt layer gives the slot back to another that is still live", async () => {
    const outer = await open()
    try {
      expect(outer.capture).toBeDefined()
      const inner = await open()
      expect(inner.capture).toBeDefined()
      expect(inner.capture).not.toBe(outer.capture)
      await inner.close()
      expect(prefixCaptureRef.current).toBe(outer.capture)
    } finally {
      await outer.close()
    }
    expect(prefixCaptureRef.current).not.toBe(outer.capture)
  }, 60_000)

  test("disposal out of order never reinstates a disposed layer's captor", async () => {
    const first = await open()
    const second = await open()
    await first.close()
    expect(prefixCaptureRef.current).toBe(second.capture)
    await second.close()
    expect(prefixCaptureRef.current).not.toBe(first.capture)
    expect(prefixCaptureRef.current).not.toBe(second.capture)
  }, 60_000)
})
