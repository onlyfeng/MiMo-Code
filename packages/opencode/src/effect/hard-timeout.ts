import { Effect, Fiber } from "effect"

// Bound the caller's wait even when the cleanup itself is uninterruptible.
// The detached fiber keeps cleanup running after timeout; Fiber.join preserves
// the effect's success and failure semantics for callers that do keep waiting.
export function awaitWithHardTimeout<A, E, R>(effect: Effect.Effect<A, E, R>, timeoutMs: number) {
  return Effect.gen(function* () {
    const fiber = yield* effect.pipe(Effect.forkDetach({ startImmediately: true }))
    return yield* Fiber.join(fiber).pipe(Effect.timeout(timeoutMs))
  })
}
