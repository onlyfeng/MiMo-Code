import { describe, expect } from "bun:test"
import { Cause, Deferred, Effect, Exit, Fiber, Layer, Ref } from "effect"
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

  it.live(
    "rejects a stale instance context even when no disposal marker was inherited",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          let entered = false

          yield* run.assertNotBusy(SessionID.make("session-run-state-stale-instance"))
          yield* Effect.promise(() => Instance.dispose())
          const exit = yield* run
            .withRunDisposal(
              Effect.sync(() => {
                entered = true
              }),
            )
            .pipe(Effect.exit)

          expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true)
          expect(entered).toBe(false)
        }),
      ),
    5_000,
  )

  it.live(
    "rejects an inherited marker as soon as its instance starts disposing",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const marker = yield* run.withRunDisposal(
            Effect.gen(function* () {
              return yield* RunDisposal
            }),
          )
          let entered = false
          const instance = marker.instance
          if (!instance) return yield* Effect.die("run marker did not capture its instance")
          instance.disposing = true

          const exit = yield* run
            .withRunDisposal(
              Effect.sync(() => {
                entered = true
              }),
            )
            .pipe(Effect.provideService(RunDisposal, marker), Effect.exit)

          expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true)
          expect(entered).toBe(false)
          return undefined
        }),
      ),
    5_000,
  )

  it.live(
    "keeps the disposal marker across a caller continuation",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const entered = yield* Deferred.make<void>()
          const release = yield* Deferred.make<void>()
          const marker = yield* Ref.make(false)
          const restarted = yield* Ref.make(false)
          yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined).pipe(Effect.ignore))
          const caller = yield* run
            .withRunDisposal(
              Deferred.succeed(entered, undefined).pipe(
                Effect.andThen(Deferred.await(release)),
                Effect.andThen(
                  Effect.gen(function* () {
                    yield* Ref.set(marker, (yield* RunDisposal).disposing)
                    return yield* run.startShell(
                      SessionID.make("session-run-state-dispose-continuation"),
                      Effect.interrupt,
                      Ref.set(restarted, true).pipe(Effect.andThen(Effect.interrupt)),
                    )
                  }),
                ),
              ),
            )
            .pipe(Effect.exit, Effect.forkChild)

          yield* Deferred.await(entered)
          yield* Effect.promise(() => Instance.dispose())
          yield* Deferred.succeed(release, undefined)
          const exit = yield* Fiber.join(caller)

          expect(yield* Ref.get(marker)).toBe(true)
          expect(yield* Ref.get(restarted)).toBe(false)
          expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true)
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
