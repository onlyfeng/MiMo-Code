import { describe, expect } from "bun:test"
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect"
import { Bus } from "../../src/bus"
import { GlobalBus } from "../../src/bus/global"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Instance } from "../../src/project/instance"
import { RunDisposal } from "../../src/session/run-disposal"
import { SessionRunState } from "../../src/session/run-state"
import { SessionID } from "../../src/session/schema"
import { SessionStatus } from "../../src/session/status"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const status = Layer.succeed(
  SessionStatus.Service,
  SessionStatus.Service.of({
    get: () => Effect.succeed({ type: "idle" }),
    list: () => Effect.succeed(new Map()),
    set: () => Effect.void,
  }),
)

const it = testEffect(
  Layer.mergeAll(
    SessionRunState.layer.pipe(Layer.provide(status)),
    CrossSpawnSpawner.defaultLayer,
  ),
)

const realStatus = SessionStatus.layer.pipe(Layer.provideMerge(Bus.layer))
const itWithStatus = testEffect(
  Layer.mergeAll(
    SessionRunState.layer.pipe(Layer.provide(realStatus)),
    realStatus,
    CrossSpawnSpawner.defaultLayer,
  ),
)

describe("SessionRunState instance disposal", () => {
  it.live(
    "releases the instance before interrupted runner cleanup finishes",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const started = yield* Deferred.make<void>()
          const cleanupStarted = yield* Deferred.make<void>()
          const releaseCleanup = yield* Deferred.make<void>()
          yield* Effect.addFinalizer(() => Deferred.succeed(releaseCleanup, undefined).pipe(Effect.ignore))
          const caller = yield* run
            .ensureRunning(
              SessionID.make("session-run-state-dispose"),
              "main",
              Effect.interrupt,
              Deferred.succeed(started, undefined).pipe(
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() =>
                  Deferred.succeed(cleanupStarted, undefined).pipe(
                    Effect.andThen(Deferred.await(releaseCleanup)),
                  ),
                ),
              ),
            )
            .pipe(Effect.forkChild)

          yield* Deferred.await(started)
          const disposing = yield* Effect.promise(() => Instance.dispose()).pipe(
            Effect.forkDetach({ startImmediately: true }),
          )
          yield* Deferred.await(cleanupStarted).pipe(Effect.timeout("1 second"))

          const disposeExit = yield* Fiber.join(disposing).pipe(
            Effect.timeout("1 second"),
            Effect.exit,
            Effect.ensuring(
              Deferred.succeed(releaseCleanup, undefined).pipe(
                Effect.andThen(
                  Effect.all([Fiber.await(caller), Fiber.await(disposing)], {
                    discard: true,
                  }),
                ),
              ),
            ),
          )

          expect(Exit.isSuccess(disposeExit)).toBe(true)
        }),
      ),
    5_000,
  )

  it.live(
    "interrupts shell work without waiting for its cleanup",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const started = yield* Deferred.make<void>()
          const cleanupStarted = yield* Deferred.make<void>()
          const releaseCleanup = yield* Deferred.make<void>()
          yield* Effect.addFinalizer(() => Deferred.succeed(releaseCleanup, undefined).pipe(Effect.ignore))
          const caller = yield* run
            .startShell(
              SessionID.make("session-run-state-dispose-shell"),
              Effect.interrupt,
              Deferred.succeed(started, undefined).pipe(
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() =>
                  Deferred.succeed(cleanupStarted, undefined).pipe(
                    Effect.andThen(Deferred.await(releaseCleanup)),
                  ),
                ),
              ),
            )
            .pipe(Effect.forkChild)

          yield* Deferred.await(started)
          const disposing = yield* Effect.promise(() => Instance.dispose()).pipe(
            Effect.forkDetach({ startImmediately: true }),
          )
          yield* Deferred.await(cleanupStarted).pipe(Effect.timeout("1 second"))

          const disposeExit = yield* Fiber.join(disposing).pipe(
            Effect.timeout("1 second"),
            Effect.exit,
            Effect.ensuring(
              Deferred.succeed(releaseCleanup, undefined).pipe(
                Effect.andThen(
                  Effect.all([Fiber.await(caller), Fiber.await(disposing)], {
                    discard: true,
                  }),
                ),
              ),
            ),
          )

          expect(Exit.isSuccess(disposeExit)).toBe(true)
        }),
      ),
    5_000,
  )

  it.live(
    "does not recreate runners from inherited disposal context after cache invalidation",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const sessionID = SessionID.make("session-run-state-dispose-restart")
          const started: string[] = []
          const work = (label: string) =>
            Effect.sync(() => started.push(label)).pipe(
              Effect.andThen(Effect.die(new Error(`unexpected ${label} start`))),
            )

          yield* run.assertNotBusy(sessionID)
          yield* Effect.promise(() => Instance.dispose())

          const ensureExit = yield* run
            .ensureRunning(sessionID, "main", Effect.interrupt, work("ensure"))
            .pipe(Effect.provideService(RunDisposal, { disposing: true }), Effect.exit)
          const shellExit = yield* run
            .startShell(sessionID, Effect.interrupt, work("shell"))
            .pipe(Effect.provideService(RunDisposal, { disposing: true }), Effect.exit)

          expect(Exit.isFailure(ensureExit) && Cause.hasInterruptsOnly(ensureExit.cause)).toBe(true)
          expect(Exit.isFailure(shellExit) && Cause.hasInterruptsOnly(shellExit.cause)).toBe(true)
          expect(started).toEqual([])
        }),
      ),
    5_000,
  )

  itWithStatus.live(
    "does not publish idle after instance disposal begins",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const sessionID = SessionID.make("session-run-state-dispose-status")
          const idleEvents: string[] = []
          const listener = (event: { payload: { type: string; properties?: { sessionID?: unknown } } }) => {
            if (event.payload.type !== SessionStatus.Event.Idle.type) return
            if (event.payload.properties?.sessionID !== sessionID) return
            idleEvents.push(event.payload.type)
          }
          GlobalBus.on("event", listener)
          yield* Effect.addFinalizer(() => Effect.sync(() => GlobalBus.off("event", listener)))

          const run = yield* SessionRunState.Service
          const sessionStatus = yield* SessionStatus.Service
          const started = yield* Deferred.make<void>()
          const cleanupStarted = yield* Deferred.make<void>()
          const releaseCleanup = yield* Deferred.make<void>()
          yield* Effect.addFinalizer(() => Deferred.succeed(releaseCleanup, undefined).pipe(Effect.ignore))
          const caller = yield* run
            .ensureRunning(
              sessionID,
              "main",
              Effect.interrupt,
              Deferred.succeed(started, undefined).pipe(
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() =>
                  Deferred.succeed(cleanupStarted, undefined).pipe(
                    Effect.andThen(sessionStatus.set(sessionID, { type: "idle" })),
                    Effect.andThen(Deferred.await(releaseCleanup)),
                  ),
                ),
              ),
            )
            .pipe(Effect.forkChild)

          yield* Deferred.await(started)
          const disposing = yield* Effect.promise(() => Instance.dispose()).pipe(
            Effect.forkDetach({ startImmediately: true }),
          )
          yield* Deferred.await(cleanupStarted).pipe(Effect.timeout("1 second"))
          const disposeExit = yield* Fiber.join(disposing).pipe(Effect.timeout("1 second"), Effect.exit)
          yield* Deferred.succeed(releaseCleanup, undefined)
          yield* Fiber.await(caller)

          expect(Exit.isSuccess(disposeExit)).toBe(true)
          expect(idleEvents).toEqual([])
        }),
      ),
    5_000,
  )
})
