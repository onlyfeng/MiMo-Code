import { describe, expect } from "bun:test"
import { Effect, Exit, Layer, Scope } from "effect"
import { prefixCaptureRef } from "../../src/session/prefix-capture-ref"
import { SessionPrompt } from "../../src/session/prompt"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.empty)

// A separate SessionPrompt layer, as when a test builds its own runtime beside
// the process-wide AppRuntime: its own memo map, so nothing is shared, and its
// own scope. The test's scope also closes it, so a failed assertion cannot
// leave its captor registered for later tests; closing twice does nothing.
const open = Effect.gen(function* () {
  const scope = yield* Scope.make()
  const close = Scope.close(scope, Exit.void)
  yield* Effect.addFinalizer(() => close)
  yield* Layer.buildWithMemoMap(SessionPrompt.defaultLayer, yield* Layer.makeMemoMap, scope)
  return { capture: prefixCaptureRef.current, close }
})

describe("prefix capture registration", () => {
  it.live("disposing one SessionPrompt layer gives the slot back to another that is still live", () =>
    Effect.gen(function* () {
      const outer = yield* open
      expect(outer.capture).toBeDefined()
      const inner = yield* open
      expect(inner.capture).toBeDefined()
      expect(inner.capture).not.toBe(outer.capture)
      yield* inner.close
      expect(prefixCaptureRef.current).toBe(outer.capture)
      yield* outer.close
      expect(prefixCaptureRef.current).not.toBe(outer.capture)
    }), 60_000)

  it.live("disposal out of order never reinstates a disposed layer's captor", () =>
    Effect.gen(function* () {
      const first = yield* open
      const second = yield* open
      yield* first.close
      expect(prefixCaptureRef.current).toBe(second.capture)
      yield* second.close
      expect(prefixCaptureRef.current).not.toBe(first.capture)
      expect(prefixCaptureRef.current).not.toBe(second.capture)
    }), 60_000)
})
