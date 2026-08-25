import { afterEach, describe, expect } from "bun:test"
import { Cause, Deferred, Effect, Exit, Fiber, Layer, Ref } from "effect"
import { Bus } from "../../src/bus"
import { GlobalBus } from "../../src/bus/global"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { RunDisposal } from "../../src/session/run-disposal"
import { SessionRunState } from "../../src/session/run-state"
import { SessionID } from "../../src/session/schema"
import { SessionStatus } from "../../src/session/status"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

let statusRaceGate:
  | {
      sessionID: SessionID
      idleEntered: Deferred.Deferred<void>
      releaseIdle: Deferred.Deferred<void>
      seen: string[]
    }
  | undefined
let statusBusyGate:
  | {
      sessionID: SessionID
      entered: Deferred.Deferred<void>
      release: Deferred.Deferred<void>
    }
  | undefined

const status = Layer.succeed(
  SessionStatus.Service,
  SessionStatus.Service.of({
    get: () => Effect.succeed({ type: "idle" }),
    list: () => Effect.succeed(new Map()),
    set: (sessionID, next) =>
      Effect.gen(function* () {
        const busyGate = statusBusyGate
        if (busyGate?.sessionID === sessionID && next.type === "busy") {
          yield* Deferred.succeed(busyGate.entered, undefined)
          yield* Deferred.await(busyGate.release)
        }
        const gate = statusRaceGate
        if (!gate || gate.sessionID !== sessionID) return
        if (next.type === "idle") {
          yield* Deferred.succeed(gate.idleEntered, undefined)
          yield* Deferred.await(gate.releaseIdle)
        }
        gate.seen.push(next.type)
      }),
  }),
)

afterEach(() => {
  statusRaceGate = undefined
  statusBusyGate = undefined
})

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
    "atomically admits only one main run",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const sessionID = SessionID.make("session-run-state-exclusive-start")
          const release = yield* Deferred.make<void>()

          const first = yield* run.startRunning(
            sessionID,
            "main",
            Effect.interrupt,
            Deferred.await(release).pipe(Effect.andThen(Effect.die("exclusive test released"))),
          )
          const second = yield* run
            .startRunning(
              sessionID,
              "main",
              Effect.interrupt,
              Effect.die("concurrent work must not run"),
            )
            .pipe(Effect.exit)

          expect(Exit.isFailure(second) && Cause.squash(second.cause)).toBeInstanceOf(Session.BusyError)
          yield* Deferred.succeed(release, undefined)
          yield* first.pipe(Effect.exit)
        }),
      ),
    5_000,
  )

  it.live(
    "stale cancelled cleanup cannot delete a replacement runner",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const sessionID = SessionID.make("session-run-state-stale-cleanup")
          const firstStarted = yield* Deferred.make<void>()
          const cleanupStarted = yield* Deferred.make<void>()
          const releaseCleanup = yield* Deferred.make<void>()
          const releaseThird = yield* Deferred.make<void>()

          yield* run
            .startRunning(
              sessionID,
              "main",
              Effect.interrupt,
              Deferred.succeed(firstStarted, undefined).pipe(
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() =>
                  Deferred.succeed(cleanupStarted, undefined).pipe(
                    Effect.andThen(Deferred.await(releaseCleanup)),
                  ),
                ),
              ),
            )
            .pipe(Effect.asVoid)
          yield* Deferred.await(firstStarted)

          const cancelling = yield* run.cancel(sessionID).pipe(Effect.forkChild)
          yield* Deferred.await(cleanupStarted)

          const second = yield* run.startRunning(
            sessionID,
            "main",
            Effect.interrupt,
            Effect.die("second run completed"),
          )
          yield* second.pipe(Effect.exit)

          const third = yield* run.startRunning(
            sessionID,
            "main",
            Effect.interrupt,
            Deferred.await(releaseThird).pipe(Effect.andThen(Effect.die("third run completed"))),
          )

          yield* Deferred.succeed(releaseCleanup, undefined)
          yield* Fiber.await(cancelling)
          const fourth = yield* run
            .startRunning(sessionID, "main", Effect.interrupt, Effect.die("fourth work must not run"))
            .pipe(Effect.exit)

          expect(Exit.isFailure(fourth) && Cause.squash(fourth.cause)).toBeInstanceOf(Session.BusyError)
          yield* Deferred.succeed(releaseThird, undefined)
          yield* third.pipe(Effect.exit)
        }),
      ),
    5_000,
  )

  it.live(
    "a stale idle publication cannot overwrite a newly admitted busy run",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const sessionID = SessionID.make("session-run-state-stale-idle")
          const firstStarted = yield* Deferred.make<void>()
          const finishFirst = yield* Deferred.make<void>()
          const secondStarted = yield* Deferred.make<void>()
          const finishSecond = yield* Deferred.make<void>()
          const idleEntered = yield* Deferred.make<void>()
          const releaseIdle = yield* Deferred.make<void>()
          const seen: string[] = []
          statusRaceGate = { sessionID, idleEntered, releaseIdle, seen }
          yield* Effect.addFinalizer(() =>
            Effect.all(
              [
                Deferred.succeed(finishFirst, undefined),
                Deferred.succeed(finishSecond, undefined),
                Deferred.succeed(releaseIdle, undefined),
              ],
              { discard: true },
            ).pipe(Effect.ignore),
          )

          const first = yield* run.startRunning(
            sessionID,
            "main",
            Effect.interrupt,
            Deferred.succeed(firstStarted, undefined).pipe(
              Effect.andThen(Deferred.await(finishFirst)),
              Effect.andThen(Effect.die("first complete")),
            ),
          )
          yield* Deferred.await(firstStarted)
          yield* Deferred.succeed(finishFirst, undefined)
          yield* Deferred.await(idleEntered)

          const admittingSecond = yield* run
            .startRunning(
              sessionID,
              "main",
              Effect.interrupt,
              Deferred.succeed(secondStarted, undefined).pipe(
                Effect.andThen(Deferred.await(finishSecond)),
                Effect.andThen(Effect.die("second complete")),
              ),
            )
            .pipe(Effect.forkChild)
          yield* Effect.yieldNow
          yield* Deferred.succeed(releaseIdle, undefined)
          const second = yield* Fiber.join(admittingSecond).pipe(Effect.timeout("1 second"))
          yield* Deferred.await(secondStarted).pipe(Effect.timeout("1 second"))

          expect(seen.at(-1)).toBe("busy")

          yield* Deferred.succeed(finishSecond, undefined)
          yield* Effect.all([first.pipe(Effect.exit), second.pipe(Effect.exit)], { discard: true })
        }),
      ),
    5_000,
  )

  it.live(
    "a stale idle publication cannot overwrite a newly ensured busy run",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const sessionID = SessionID.make("session-run-state-stale-idle-ensure")
          const firstStarted = yield* Deferred.make<void>()
          const finishFirst = yield* Deferred.make<void>()
          const secondStarted = yield* Deferred.make<void>()
          const finishSecond = yield* Deferred.make<void>()
          const idleEntered = yield* Deferred.make<void>()
          const releaseIdle = yield* Deferred.make<void>()
          const seen: string[] = []
          statusRaceGate = { sessionID, idleEntered, releaseIdle, seen }
          yield* Effect.addFinalizer(() =>
            Effect.all(
              [
                Deferred.succeed(finishFirst, undefined),
                Deferred.succeed(finishSecond, undefined),
                Deferred.succeed(releaseIdle, undefined),
              ],
              { discard: true },
            ).pipe(Effect.ignore),
          )

          const first = yield* run.startRunning(
            sessionID,
            "main",
            Effect.interrupt,
            Deferred.succeed(firstStarted, undefined).pipe(
              Effect.andThen(Deferred.await(finishFirst)),
              Effect.andThen(Effect.die("first complete")),
            ),
          )
          yield* Deferred.await(firstStarted)
          yield* Deferred.succeed(finishFirst, undefined)
          yield* Deferred.await(idleEntered)

          const second = yield* run
            .ensureRunning(
              sessionID,
              "main",
              Effect.interrupt,
              Deferred.succeed(secondStarted, undefined).pipe(
                Effect.andThen(Deferred.await(finishSecond)),
                Effect.andThen(Effect.die("second complete")),
              ),
            )
            .pipe(Effect.forkChild)
          yield* Effect.yieldNow
          yield* Deferred.succeed(releaseIdle, undefined)
          yield* Deferred.await(secondStarted).pipe(Effect.timeout("1 second"))

          expect(seen.at(-1)).toBe("busy")

          yield* Deferred.succeed(finishSecond, undefined)
          yield* Effect.all([first.pipe(Effect.exit), Fiber.await(second)], { discard: true })
        }),
      ),
    5_000,
  )

  it.live(
    "an idle abort publication cannot overwrite a newly admitted busy run",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const sessionID = SessionID.make("session-run-state-idle-abort")
          const finishFirst = yield* Deferred.make<void>()
          const secondStarted = yield* Deferred.make<void>()
          const finishSecond = yield* Deferred.make<void>()

          const first = yield* run.startRunning(
            sessionID,
            "main",
            Effect.interrupt,
            Deferred.await(finishFirst).pipe(Effect.andThen(Effect.die("first complete"))),
          )
          yield* Deferred.succeed(finishFirst, undefined)
          yield* first.pipe(Effect.exit)

          const idleEntered = yield* Deferred.make<void>()
          const releaseIdle = yield* Deferred.make<void>()
          const seen: string[] = []
          statusRaceGate = { sessionID, idleEntered, releaseIdle, seen }
          yield* Effect.addFinalizer(() =>
            Effect.all(
              [Deferred.succeed(finishSecond, undefined), Deferred.succeed(releaseIdle, undefined)],
              { discard: true },
            ).pipe(Effect.ignore),
          )

          const cancelling = yield* run.cancel(sessionID).pipe(Effect.forkChild)
          yield* Deferred.await(idleEntered)
          const admitting = yield* run
            .startRunning(
              sessionID,
              "main",
              Effect.interrupt,
              Deferred.succeed(secondStarted, undefined).pipe(
                Effect.andThen(Deferred.await(finishSecond)),
                Effect.andThen(Effect.die("second complete")),
              ),
            )
            .pipe(Effect.forkChild)

          yield* Effect.yieldNow
          yield* Deferred.succeed(releaseIdle, undefined)
          const second = yield* Fiber.join(admitting).pipe(Effect.timeout("1 second"))
          yield* Effect.all([Fiber.await(cancelling), Deferred.await(secondStarted)], { discard: true })

          expect(seen.at(-1)).toBe("busy")

          yield* Deferred.succeed(finishSecond, undefined)
          yield* second.pipe(Effect.exit)
        }),
      ),
    5_000,
  )

  it.live(
    "uses the current run's interrupt fallback after returning to idle",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const sessionID = SessionID.make("session-run-state-current-interrupt")
          const interrupted: string[] = []
          const runOnce = (label: string) =>
            Effect.gen(function* () {
              const completion = yield* run.startRunning(
                sessionID,
                "main",
                Effect.sync(() => interrupted.push(label)).pipe(Effect.andThen(Effect.interrupt)),
                Effect.never,
              )
              const caller = yield* completion.pipe(Effect.forkChild)
              yield* run.cancel(sessionID)
              yield* Fiber.await(caller)
            })

          yield* runOnce("first")
          yield* runOnce("second")

          expect(interrupted).toEqual(["first", "second"])
        }),
      ),
    5_000,
  )

  it.live(
    "keeps shell admission cancelable when its caller is interrupted during busy publication",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const sessionID = SessionID.make("session-run-state-shell-admission-interrupt")
          const entered = yield* Deferred.make<void>()
          const release = yield* Deferred.make<void>()
          statusBusyGate = { sessionID, entered, release }
          yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined).pipe(Effect.ignore))

          const caller = yield* run.startShell(sessionID, Effect.interrupt, Effect.never).pipe(Effect.forkChild)
          yield* Deferred.await(entered)
          const interrupting = yield* Fiber.interrupt(caller).pipe(Effect.forkChild)
          yield* Effect.yieldNow
          yield* Deferred.succeed(release, undefined)
          yield* Fiber.await(interrupting)
          yield* run.cancel(sessionID)

          const available = yield* run.assertNotBusy(sessionID).pipe(Effect.exit)
          expect(Exit.isSuccess(available)).toBe(true)
        }),
      ),
    5_000,
  )

  it.live(
    "does not strand admission when a cancel caller is interrupted during work cleanup",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const run = yield* SessionRunState.Service
          const sessionID = SessionID.make("session-run-state-cancel-caller-interrupt")
          const cleanupStarted = yield* Deferred.make<void>()
          const releaseCleanup = yield* Deferred.make<void>()
          yield* Effect.addFinalizer(() => Deferred.succeed(releaseCleanup, undefined).pipe(Effect.ignore))

          const completion = yield* run.startRunning(
            sessionID,
            "main",
            Effect.interrupt,
            Effect.never.pipe(
              Effect.onInterrupt(() =>
                Deferred.succeed(cleanupStarted, undefined).pipe(
                  Effect.andThen(Deferred.await(releaseCleanup)),
                ),
              ),
            ),
          )
          const cancelling = yield* run.cancel(sessionID).pipe(Effect.forkChild)
          yield* Deferred.await(cleanupStarted)
          yield* Fiber.interrupt(cancelling)
          yield* Deferred.succeed(releaseCleanup, undefined)
          yield* completion.pipe(Effect.exit)
          yield* run.cancel(sessionID)

          const available = yield* run.assertNotBusy(sessionID).pipe(Effect.exit)
          expect(Exit.isSuccess(available)).toBe(true)
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
