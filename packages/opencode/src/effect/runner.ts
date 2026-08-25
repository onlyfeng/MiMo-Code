import { Cause, Deferred, Effect, Exit, Fiber, Schema, Scope, SynchronizedRef } from "effect"

export interface Runner<A, E = never, B = never> {
  readonly state: State<A, E>
  readonly busy: boolean
  readonly ensureRunning: (work: Effect.Effect<A, E>, onInterrupt?: Effect.Effect<A, E>) => Effect.Effect<A, E>
  readonly startRunning: (
    work: Effect.Effect<A, E>,
    onInterrupt?: Effect.Effect<A, E>,
  ) => Effect.Effect<Effect.Effect<A, E>, B>
  readonly start: (work: Effect.Effect<A, E>, onInterrupt?: Effect.Effect<A, E>) => Effect.Effect<void, B>
  readonly startShell: (
    work: Effect.Effect<A, E>,
    onInterrupt?: Effect.Effect<A, E>,
  ) => Effect.Effect<A, E | B>
  readonly cancel: Effect.Effect<void>
  readonly cancelDetached: Effect.Effect<void>
}

export class Cancelled extends Schema.TaggedErrorClass<Cancelled>()("RunnerCancelled", {}) {}

interface RunHandle<A, E> {
  id: number
  done: Deferred.Deferred<A, E | Cancelled>
  start: Deferred.Deferred<void>
  entered: Deferred.Deferred<void>
  fiber: Fiber.Fiber<A, E>
  onInterrupt: Effect.Effect<A, E> | undefined
}

interface ShellHandle<A, E> {
  id: number
  fiber: Fiber.Fiber<A, E>
  onInterrupt: Effect.Effect<A, E> | undefined
}

interface PendingHandle<A, E> {
  id: number
  done: Deferred.Deferred<A, E | Cancelled>
  work: Effect.Effect<A, E>
  onInterrupt: Effect.Effect<A, E> | undefined
}

type ActiveState<A, E> =
  | { readonly _tag: "Running"; readonly run: RunHandle<A, E> }
  | { readonly _tag: "Shell"; readonly shell: ShellHandle<A, E> }
  | { readonly _tag: "ShellThenRun"; readonly shell: ShellHandle<A, E>; readonly run: PendingHandle<A, E> }

interface CancellationHandle<A, E> {
  active: ActiveState<A, E>
  committed: Deferred.Deferred<void>
}

export type State<A, E> =
  | { readonly _tag: "Idle" }
  | ActiveState<A, E>
  | { readonly _tag: "Cancelling"; readonly cancellation: CancellationHandle<A, E> }

export const make = <A, E = never, B = never>(
  scope: Scope.Scope,
  opts?: {
    onIdle?: (id: number) => Effect.Effect<void>
    onBusy?: Effect.Effect<void>
    /** Synchronous generation marker, invoked when a run or shell reserves its id. */
    onStart?: (id: number) => void
    onInterrupt?: Effect.Effect<A, E>
    canStart?: () => boolean
    busy?: () => B
    label?: string
    onReentryWarn?: (info: { label: string; existingRunId: number }) => Effect.Effect<void>
    /** @internal Deterministic scheduling seams for Runner race tests. */
    _testHooks?: {
      beforeRunPublish?: Effect.Effect<void>
      beforeRunStart?: Effect.Effect<void>
      beforeCancelSignal?: Effect.Effect<void>
      onRunExit?: Effect.Effect<void>
    }
  },
): Runner<A, E, B> => {
  const ref = SynchronizedRef.makeUnsafe<State<A, E>>({ _tag: "Idle" })
  const idle = opts?.onIdle ?? (() => Effect.void)
  const busy = opts?.onBusy ?? Effect.void
  const defaultOnInterrupt = opts?.onInterrupt
  let ids = 0

  const state = () => SynchronizedRef.getUnsafe(ref)
  const next = () => {
    ids += 1
    opts?.onStart?.(ids)
    return ids
  }

  const complete = (done: Deferred.Deferred<A, E | Cancelled>, exit: Exit.Exit<A, E>) =>
    Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)
      ? Deferred.fail(done, new Cancelled()).pipe(Effect.asVoid)
      : Deferred.done(done, exit).pipe(Effect.asVoid)

  const idleIfCurrent = (id: number) =>
    Effect.suspend(() => state()._tag === "Idle" && id === ids ? idle(id) : Effect.void)

  const finishRun = (id: number, done: Deferred.Deferred<A, E | Cancelled>, exit: Exit.Exit<A, E>) =>
    SynchronizedRef.modify(
      ref,
      (st) =>
        [
          Effect.gen(function* () {
            if (st._tag === "Running" && st.run.id === id) yield* idle(id)
            yield* complete(done, exit)
          }),
          st._tag === "Running" && st.run.id === id ? ({ _tag: "Idle" } as const) : st,
        ] as const,
    ).pipe(Effect.flatten)

  const startRun = (
    work: Effect.Effect<A, E>,
    done: Deferred.Deferred<A, E | Cancelled>,
    onInterrupt = defaultOnInterrupt,
    id = next(),
  ) =>
    Effect.gen(function* () {
      const start = yield* Deferred.make<void>()
      const entered = yield* Deferred.make<void>()
      const fiber = yield* Deferred.await(start).pipe(
        Effect.andThen(Deferred.succeed(entered, undefined)),
        Effect.andThen(work),
        Effect.onExit((exit) =>
          (opts?._testHooks?.onRunExit ?? Effect.void).pipe(
            Effect.andThen(Deferred.await(start)),
            Effect.andThen(finishRun(id, done, exit)),
            Effect.uninterruptible,
          ),
        ),
        Effect.forkIn(scope),
      )
      if (opts?._testHooks?.beforeRunPublish) yield* opts._testHooks.beforeRunPublish
      return { id, done, start, entered, fiber, onInterrupt } satisfies RunHandle<A, E>
    })

  const awaitRun = (done: Deferred.Deferred<A, E | Cancelled>, onInterrupt: Effect.Effect<A, E> | undefined) =>
    Deferred.await(done).pipe(
      Effect.catch(
        (e): Effect.Effect<A, E> => (e instanceof Cancelled ? (onInterrupt ?? Effect.die(e)) : Effect.fail(e)),
      ),
    )

  const busyFailure = <C>(): Effect.Effect<C, B> =>
    opts?.busy ? Effect.fail(opts.busy()) : Effect.die(new Error("Runner is busy"))

  const finishShell = (id: number) =>
    Effect.uninterruptible(
      SynchronizedRef.modifyEffect(
        ref,
        Effect.fnUntraced(function* (st) {
          if (st._tag === "Shell" && st.shell.id === id) return [idle(id), { _tag: "Idle" }] as const
          if (st._tag === "ShellThenRun" && st.shell.id === id) {
            if (opts?.canStart?.() === false)
              return [
                Deferred.fail(st.run.done, new Cancelled()).pipe(Effect.andThen(idle(st.run.id)), Effect.asVoid),
                { _tag: "Idle" },
              ] as const
            const run = yield* startRun(st.run.work, st.run.done, st.run.onInterrupt, st.run.id)
            return [
              (opts?._testHooks?.beforeRunStart ?? Effect.void).pipe(
                Effect.andThen(Effect.sync(() => Deferred.doneUnsafe(run.start, Effect.void))),
                Effect.asVoid,
              ),
              { _tag: "Running", run },
            ] as const
          }
          return [Effect.void, st] as const
        }),
      ).pipe(Effect.flatten),
    )

  const ensureRunning = (
    work: Effect.Effect<A, E>,
    onInterrupt = defaultOnInterrupt,
  ): Effect.Effect<A, E> =>
    Effect.uninterruptibleMask((restore) =>
      SynchronizedRef.modifyEffect(
        ref,
        Effect.fnUntraced(function* (st) {
          if (opts?.canStart?.() === false) return [Effect.interrupt, st] as const
          switch (st._tag) {
            case "Running":
            case "ShellThenRun":
              if (opts?.onReentryWarn)
                yield* opts.onReentryWarn({ label: opts.label ?? "(unlabeled)", existingRunId: st.run.id })
              return [restore(awaitRun(st.run.done, st.run.onInterrupt)), st] as const
            case "Shell": {
              const run = {
                id: next(),
                done: yield* Deferred.make<A, E | Cancelled>(),
                work,
                onInterrupt,
              } satisfies PendingHandle<A, E>
              return [restore(awaitRun(run.done, run.onInterrupt)), { _tag: "ShellThenRun", shell: st.shell, run }] as const
            }
            case "Cancelling":
              return [
                restore(
                  Deferred.await(st.cancellation.committed).pipe(
                    Effect.andThen(ensureRunning(work, onInterrupt)),
                  ),
                ),
                st,
              ] as const
            case "Idle": {
              const id = next()
              yield* busy
              if (opts?.canStart?.() === false)
                return [idle(id).pipe(Effect.andThen(restore(Effect.interrupt))), st] as const
              const done = yield* Deferred.make<A, E | Cancelled>()
              const run = yield* startRun(work, done, onInterrupt, id)
              return [
                (opts?._testHooks?.beforeRunStart ?? Effect.void).pipe(
                  Effect.andThen(Effect.sync(() => Deferred.doneUnsafe(run.start, Effect.void))),
                  Effect.andThen(restore(awaitRun(done, run.onInterrupt))),
                ),
                { _tag: "Running", run },
              ] as const
            }
          }
          return [Effect.interrupt, st] as const
        }),
      ).pipe(Effect.flatten),
    )

  const startRunning = (
    work: Effect.Effect<A, E>,
    onInterrupt = defaultOnInterrupt,
  ): Effect.Effect<Effect.Effect<A, E>, B> =>
    Effect.uninterruptibleMask((restore) =>
      SynchronizedRef.modifyEffect(
        ref,
        Effect.fnUntraced(function* (st) {
          if (opts?.canStart?.() === false) return [Effect.interrupt, st] as const
          if (st._tag === "Cancelling")
            return [
              restore(
                Deferred.await(st.cancellation.committed).pipe(
                  Effect.andThen(startRunning(work, onInterrupt)),
                ),
              ),
              st,
            ] as const
          if (st._tag !== "Idle") {
            return [busyFailure<Effect.Effect<A, E>>(), st] as const
          }
          const id = next()
          yield* busy
          if (opts?.canStart?.() === false)
            return [idle(id).pipe(Effect.andThen(Effect.interrupt)), st] as const
          const done = yield* Deferred.make<A, E | Cancelled>()
          const run = yield* startRun(work, done, onInterrupt, id)
          return [
            (opts?._testHooks?.beforeRunStart ?? Effect.void).pipe(
              Effect.andThen(Effect.sync(() => Deferred.doneUnsafe(run.start, Effect.void))),
              Effect.andThen(
                Effect.raceFirst(
                  Deferred.await(run.entered),
                  Deferred.await(done).pipe(Effect.exit, Effect.asVoid),
                ),
              ),
              Effect.as(awaitRun(done, run.onInterrupt)),
            ),
            { _tag: "Running", run },
          ] as const
        }),
      ).pipe(Effect.flatten),
    )

  const start = (
    work: Effect.Effect<A, E>,
    onInterrupt = defaultOnInterrupt,
  ): Effect.Effect<void, B> => startRunning(work, onInterrupt).pipe(Effect.asVoid)

  const startShell = (
    work: Effect.Effect<A, E>,
    onInterrupt = defaultOnInterrupt,
  ): Effect.Effect<A, E | B> =>
    Effect.uninterruptibleMask((restore) =>
      SynchronizedRef.modifyEffect(
        ref,
        Effect.fnUntraced(function* (st) {
          if (opts?.canStart?.() === false) return [restore(Effect.interrupt), st] as const
          if (st._tag === "Cancelling")
            return [
              restore(
                Deferred.await(st.cancellation.committed).pipe(
                  Effect.andThen(startShell(work, onInterrupt)),
                ),
              ),
              st,
            ] as const
          if (st._tag !== "Idle") {
            return [busyFailure<A>(), st] as readonly [Effect.Effect<A, E | B>, State<A, E>]
          }
          const id = next()
          yield* busy
          if (opts?.canStart?.() === false) {
            yield* idle(id)
            return [restore(Effect.interrupt), st] as const
          }
          const fiber = yield* work.pipe(
            Effect.interruptible,
            Effect.ensuring(finishShell(id)),
            Effect.forkChild,
          )
          const shell = { id, fiber, onInterrupt } satisfies ShellHandle<A, E>
          return [
            restore(
              Effect.gen(function* () {
                const exit = yield* Fiber.await(fiber)
                if (Exit.isSuccess(exit)) return exit.value
                if (Cause.hasInterruptsOnly(exit.cause) && shell.onInterrupt) return yield* shell.onInterrupt
                return yield* Effect.failCause(exit.cause)
              }),
            ),
            { _tag: "Shell", shell },
          ] as readonly [Effect.Effect<A, E | B>, State<A, E>]
        }),
      ).pipe(Effect.flatten),
    )

  const signalInterrupt = <X, EE>(fiber: Fiber.Fiber<X, EE>) =>
    Effect.withFiber((parent) =>
      Effect.sync(() => {
        fiber.interruptUnsafe(parent.id)
      }),
    )

  // Cancellation reserves a transient state, dispatches the stop signal outside
  // the runner lock, then commits Idle and publishes it. This whole sequence is
  // masked; only target cleanup waits restore caller interruption.
  const makeCancel = (detached: boolean) => {
    const claim = (
      st: State<A, E>,
    ): Effect.Effect<
      readonly [{ cancellation: CancellationHandle<A, E>; owner: boolean } | undefined, State<A, E>]
    > =>
      Effect.gen(function* () {
        if (st._tag === "Idle") return [undefined, st] as const
        if (st._tag === "Cancelling") return [{ cancellation: st.cancellation, owner: false }, st] as const
        const cancellation = { active: st, committed: yield* Deferred.make<void>() }
        return [{ cancellation, owner: true }, { _tag: "Cancelling", cancellation }] as const
      })
    return Effect.uninterruptibleMask((restore) =>
      Effect.gen(function* () {
        const claimed = yield* SynchronizedRef.modifyEffect(ref, claim)
        if (!claimed) return
        const active = claimed.cancellation.active
        const fiber = active._tag === "Running" ? active.run.fiber : active.shell.fiber
        if (claimed.owner) {
          if (opts?._testHooks?.beforeCancelSignal) yield* opts._testHooks.beforeCancelSignal
          yield* signalInterrupt(fiber)
          if (active._tag === "ShellThenRun")
            yield* Deferred.fail(active.run.done, new Cancelled()).pipe(Effect.asVoid)
          yield* SynchronizedRef.modify(ref, (st) => {
            if (st._tag !== "Cancelling" || st.cancellation !== claimed.cancellation) return [false, st] as const
            return [true, { _tag: "Idle" }] as const
          })
          yield* idleIfCurrent(
            active._tag === "Running" ? active.run.id : active._tag === "Shell" ? active.shell.id : active.run.id,
          )
          yield* Deferred.succeed(claimed.cancellation.committed, undefined)
        }
        if (detached) {
          if (!claimed.owner) yield* Deferred.await(claimed.cancellation.committed)
          return
        }
        if (!claimed.owner) yield* restore(Deferred.await(claimed.cancellation.committed))
        if (active._tag === "Running") {
          yield* restore(Fiber.interrupt(active.run.fiber))
          yield* restore(Deferred.await(active.run.done).pipe(Effect.ignore))
          return
        }
        yield* restore(Fiber.interrupt(active.shell.fiber))
      }),
    )
  }

  const cancel = makeCancel(false)
  const cancelDetached = makeCancel(true)

  return {
    get state() {
      return state()
    },
    get busy() {
      return state()._tag !== "Idle"
    },
    ensureRunning,
    startRunning,
    start,
    startShell,
    cancel,
    cancelDetached,
  }
}
