import { expect, test } from "bun:test"
import { Deferred, Effect, Exit, Fiber } from "effect"
import { ActorExecution } from "../../src/actor/execution"
import { SessionID } from "../../src/session/schema"

const sessionID = SessionID.make("ses_execution_test")
const otherSessionID = SessionID.make("ses_execution_other")

test("cancellation invalidates late wake tickets while preserving other sessions and fresh main generations", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const execution = yield* ActorExecution.Service
      const old = yield* execution.reserve(sessionID, "main")
      const waiting = yield* execution.acquire(sessionID, "main").pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* execution.withCancellation(
        sessionID,
        "main",
        Effect.gen(function* () {
          expect(Exit.isFailure(yield* execution.acquire(sessionID, "main").pipe(Effect.exit))).toBe(true)
          expect(Exit.isFailure(yield* execution.reserve(sessionID, "main").pipe(Effect.exit))).toBe(true)
          const other = yield* execution.acquire(otherSessionID, "main")
          expect(yield* execution.current(sessionID, "main")).toBe(old)
          expect(yield* execution.current(otherSessionID, "main")).toBe(other)
          yield* execution.release(other)
        }),
      )
      // The waiter resumes only after the cancellation scope has ended. It must
      // retain its invalid ticket instead of becoming a fresh acquisition.
      yield* execution.release(old)
      expect(Exit.isFailure(yield* Fiber.await(waiting))).toBe(true)
      expect(yield* execution.current(sessionID, "main")).toBeUndefined()
      const next = yield* execution.acquire(sessionID, "main")
      expect(next).not.toBe(old)
      expect(next.cancelled).toBe(false)
      yield* execution.release(old)
      expect(yield* execution.current(sessionID, "main")).toBe(next)
      yield* execution.release(next)
    }).pipe(Effect.scoped, Effect.provide(ActorExecution.layer)),
  )
})

test("interrupted cancellation and waiting scopes release their admission bookkeeping", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const execution = yield* ActorExecution.Service
      const old = yield* execution.reserve(sessionID, "actor")
      const waiting = yield* execution.acquire(sessionID, "actor").pipe(Effect.forkChild)
      yield* Effect.yieldNow
      yield* Fiber.interrupt(waiting)
      expect(Exit.isFailure(yield* Fiber.await(waiting))).toBe(true)
      const entered = yield* Deferred.make<void>()
      const cancelling = yield* execution
        .withCancellation(sessionID, "actor", Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never)))
        .pipe(Effect.forkChild)
      yield* Deferred.await(entered)
      yield* Fiber.interrupt(cancelling)
      expect(Exit.isFailure(yield* Fiber.await(cancelling))).toBe(true)
      expect(yield* execution.current(sessionID, "actor")).toBe(old)
      yield* execution.release(old)
      const next = yield* execution.reserve(sessionID, "actor")
      expect(next.cancelled).toBe(false)
      yield* execution.release(next)
    }).pipe(Effect.scoped, Effect.provide(ActorExecution.layer)),
  )
})

test("nested cancellation scopes keep admission closed until the last owner exits", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const execution = yield* ActorExecution.Service
      yield* execution.withCancellation(
        sessionID,
        "actor",
        Effect.gen(function* () {
          yield* execution.withCancellation(sessionID, "actor", Effect.void)
          expect(Exit.isFailure(yield* execution.reserve(sessionID, "actor").pipe(Effect.exit))).toBe(true)
        }),
      )
      const next = yield* execution.reserve(sessionID, "actor")
      expect(yield* execution.current(sessionID, "actor")).toBe(next)
      yield* execution.release(next)
    }).pipe(Effect.scoped, Effect.provide(ActorExecution.layer)),
  )
})
