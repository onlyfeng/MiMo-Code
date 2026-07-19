import { Cause, Effect, Exit } from "effect"
import { ActorRegistry } from "@/actor/registry"
import type { SessionID } from "@/session/schema"

export const runTurn = <A, E>(
  sessionID: SessionID,
  actorID: string,
  work: Effect.Effect<A, E>,
  options?: {
    readonly isCancelled?: Effect.Effect<boolean>
    readonly finalize?: boolean
    readonly markRunning?: boolean
  },
): Effect.Effect<A, E, ActorRegistry.Service> =>
  // Wrap the entire turn in Effect.uninterruptible so that status cleanup
  // always runs even when the fiber is externally interrupted (Fiber.interrupt).
  // The actual work is re-marked interruptible inside so it can be cancelled.
  Effect.uninterruptible(
    Effect.gen(function* () {
      const reg = yield* ActorRegistry.Service
      const interruptIfCancelled = Effect.gen(function* () {
        if (!(yield* options?.isCancelled ?? Effect.succeed(false))) return false
        if (options?.finalize !== false) {
          yield* reg
            .updateStatus(sessionID, actorID, {
              status: "idle",
              lastOutcome: "cancelled",
              lastError: undefined,
            })
            .pipe(Effect.ignore)
        }
        return true
      })
      if (yield* interruptIfCancelled) return yield* Effect.interrupt
      if (options?.markRunning !== false) {
        yield* reg.updateStatus(sessionID, actorID, { status: "running" }).pipe(Effect.ignore)
      }
      // Run work interruptibly so it can be cancelled by Fiber.interrupt.
      // Effect.exit captures the outcome without re-raising, letting us
      // write status unconditionally before propagating the cause.
      const exit: Exit.Exit<A, E> = yield* work.pipe(Effect.interruptible, Effect.exit)
      if (yield* interruptIfCancelled) return yield* Effect.interrupt
      if (options?.finalize === false) {
        if (Exit.isSuccess(exit)) return exit.value
        return yield* Effect.failCause(exit.cause) as Effect.Effect<A, E>
      }
      // Write the outcome unconditionally before re-raising.
      if (Exit.isSuccess(exit)) {
        yield* reg
          .updateStatus(sessionID, actorID, {
            status: "idle",
            lastOutcome: "success",
            lastError: undefined,
          })
          .pipe(Effect.ignore)
        return exit.value
      }
      const cause = exit.cause
      const cancelled = Cause.hasInterruptsOnly(cause)
      yield* reg
        .updateStatus(sessionID, actorID, {
          status: "idle",
          lastOutcome: cancelled ? "cancelled" : "failure",
          lastError: cancelled ? undefined : extractErrorString(cause),
        })
        .pipe(Effect.ignore)
      return yield* Effect.failCause(cause) as Effect.Effect<A, E>
    }),
  )

function extractErrorString(cause: Cause.Cause<unknown>): string {
  return Cause.pretty(cause)
}

export * as ActorTurn from "./turn"
