import { expect, test } from "bun:test"
import { Effect } from "effect"
import * as RunApproval from "../../src/session/run-approval"
import { EffectBridge } from "../../src/effect"

test("run approval expires captured bridges and child references on completion", async () => {
  const captured = await Effect.runPromise(
    Effect.gen(function* () {
      const scope = yield* RunApproval.current
      const bridge = yield* EffectBridge.make().pipe(RunApproval.capture)
      expect(RunApproval.id(scope)).toBe("root")
      expect(
        yield* Effect.promise(() =>
          bridge.promise(
            Effect.gen(function* () {
              return RunApproval.id(yield* RunApproval.current)
            }),
          ),
        ),
      ).toBe("root")
      return { scope, bridge }
    }).pipe(RunApproval.own("root")),
  )
  expect(RunApproval.id(captured.scope)).toBeUndefined()
  expect(captured.scope?.signal.aborted).toBe(true)
  expect(
    await captured.bridge.promise(
      Effect.gen(function* () {
        return RunApproval.id(yield* RunApproval.current)
      }),
    ),
  ).toBeUndefined()
})

test("run approval HTTP disconnect aborts existing child asks without changing an independent run", async () => {
  const controller = new AbortController()
  await Effect.runPromise(
    Effect.gen(function* () {
      const parent = yield* RunApproval.current
      yield* Effect.gen(function* () {
        const strict = yield* RunApproval.current
        const pending = RunApproval.signal(parent, new AbortController().signal)
        controller.abort()
        expect(pending?.aborted).toBe(true)
        expect(RunApproval.id(parent)).toBeUndefined()
        expect(RunApproval.id(strict)).toBe("independent")
      }).pipe(RunApproval.own("independent"), Effect.provideService(RunApproval.RequestSignal, undefined))
    }).pipe(RunApproval.own("root"), Effect.provideService(RunApproval.RequestSignal, controller.signal)),
  )
})

test("run approval handoff preserves old bridge cancellation while new input can ask a human", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const scope = yield* RunApproval.current
      RunApproval.register(scope, "owned-user")
      const bridge = yield* EffectBridge.make().pipe(RunApproval.capture)
      yield* RunApproval.select("external-user")
      expect(yield* RunApproval.current).toBeUndefined()
      expect(RunApproval.signal(yield* RunApproval.current)).toBeUndefined()
      const old = yield* Effect.promise(() => bridge.promise(RunApproval.current))
      expect(old).toBe(scope)
      expect(old?.signal.aborted).toBe(true)
      expect(RunApproval.id(old)).toBeUndefined()
    }).pipe(RunApproval.own("root")),
  )
})
