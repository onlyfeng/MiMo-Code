import { Cause, Deferred, Effect, Exit, Fiber, Schema, Scope, SynchronizedRef } from "effect"

export interface Runner<A, E = never, B = never> {
  readonly state: State<A, E>
  readonly busy: boolean
  readonly ensureRunning: (
    work: Effect.Effect<A, E>,
    onInterrupt?: Effect.Effect<A, E>,
    beforeAcquire?: Effect.Effect<void>,
  ) => Effect.Effect<A, E>
  readonly startRunning: (
    work: Effect.Effect<A, E>,
    onInterrupt?: Effect.Effect<A, E>,
    beforeAcquire?: Effect.Effect<void>,
  ) => Effect.Effect<Effect.Effect<A, E>, B>
  readonly ensureExclusive: (work: Effect.Effect<A, E>, onInterrupt?: Effect.Effect<A, E>, beforeAcquire?: Effect.Effect<void>) => Effect.Effect<A, E | B>
  readonly startOwned: (work: Effect.Effect<A, E>, onInterrupt?: Effect.Effect<A, E>, beforeAcquire?: Effect.Effect<void>) => Effect.Effect<{ readonly runId: number; readonly interruptOwned: Effect.Effect<void>; readonly awaitExit: Effect.Effect<void>; readonly completion: Effect.Effect<A, E> }, B>
  readonly start: (work: Effect.Effect<A, E>, onInterrupt?: Effect.Effect<A, E>, beforeAcquire?: Effect.Effect<void>) => Effect.Effect<void, B>
  readonly startShell: (
    work: Effect.Effect<A, E>,
    onInterrupt?: Effect.Effect<A, E>,
    beforeAcquire?: Effect.Effect<void>,
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

type ActiveState<A, E> =
  | { readonly _tag: "Running"; readonly run: RunHandle<A, E> }
  | { readonly _tag: "Shell"; readonly shell: ShellHandle<A, E> }

interface CancellationHandle<A, E> {
  active: ActiveState<A, E>
  committed: Deferred.Deferred<void>
  signalled: Deferred.Deferred<void>
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
    onRunStart?: Effect.Effect<() => void>
    onShellStart?: Effect.Effect<() => void>
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
  let cancelGeneration = 0

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

  const finishRun = (id: number, done: Deferred.Deferred<A, E | Cancelled>, exit: Exit.Exit<A, E>): Effect.Effect<void> =>
    SynchronizedRef.modifyEffect(ref, Effect.fnUntraced(function* (st) {
      if (st._tag !== "Running" || st.run.id !== id) return [complete(done, exit), st] as const
      return [idleIfCurrent(id).pipe(Effect.andThen(complete(done, exit))), { _tag: "Idle" }] as const
    })).pipe(Effect.flatten)

  const startRun = (
    work: Effect.Effect<A, E>,
    done: Deferred.Deferred<A, E | Cancelled>,
    onInterrupt = defaultOnInterrupt,
    id = next(),
  ): Effect.Effect<RunHandle<A, E>> =>
    Effect.gen(function* () {
      const release = opts?.onRunStart ? yield* opts.onRunStart : () => {}
      const start = yield* Deferred.make<void>()
      const entered = yield* Deferred.make<void>()
      const fiber = yield* Deferred.await(start).pipe(
        Effect.andThen(Deferred.succeed(entered, undefined)),
        Effect.andThen(work),
        Effect.interruptible,
        Effect.onExit((exit) =>
          (opts?._testHooks?.onRunExit ?? Effect.void).pipe(
            Effect.andThen(Deferred.await(start)),
            Effect.andThen(finishRun(id, done, exit)),
            Effect.uninterruptible,
          ),
        ),
        Effect.ensuring(Effect.sync(release)),
        // Install the finalizer even if cancellation precedes the first
        // instruction; the start wait and actual work remain interruptible.
        Effect.forkIn(scope, { uninterruptible: true }),
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
          return [Effect.void, st] as const
        }),
      ).pipe(Effect.flatten),
    )

  const ensureRunning = (
    work: Effect.Effect<A, E>,
    onInterrupt = defaultOnInterrupt,
    beforeAcquire = Effect.void,
  ): Effect.Effect<A, E> =>
    Effect.suspend(() => ensureRunningAt(work, cancelGeneration, onInterrupt, beforeAcquire))

  const ensureRunningAt = (
    work: Effect.Effect<A, E>,
    generation: number,
    onInterrupt: Effect.Effect<A, E> | undefined,
    beforeAcquire: Effect.Effect<void>,
  ): Effect.Effect<A, E> =>
    Effect.uninterruptibleMask((restore) =>
      SynchronizedRef.modifyEffect(ref, Effect.fnUntraced(function* (st) {
        if (generation !== cancelGeneration || opts?.canStart?.() === false)
          return [restore(Effect.interrupt), st] as const
        yield* beforeAcquire
        const retry = () => ensureRunningAt(work, generation, onInterrupt, beforeAcquire)
        switch (st._tag) {
          case "Running": {
            const exit = st.run.fiber.pollUnsafe()
            if (exit === undefined) {
              if (opts?.onReentryWarn) yield* opts.onReentryWarn({ label: opts.label ?? "(unlabeled)", existingRunId: st.run.id })
              // Inbox owns pending input; each execution waiter retains only its work.
              return [restore(Deferred.await(st.run.done).pipe(Effect.exit, Effect.andThen(Effect.suspend(retry)))), st] as const
            }
            yield* complete(st.run.done, exit)
            break
          }
          case "Shell":
            return [restore(Fiber.await(st.shell.fiber).pipe(Effect.andThen(Effect.suspend(retry)))), st] as const
          case "Cancelling":
            return [restore(Deferred.await(st.cancellation.committed).pipe(Effect.andThen(Effect.suspend(retry)))), st] as const
          case "Idle":
            break
        }
        const id = next()
        yield* busy.pipe(
          Effect.andThen(beforeAcquire),
          Effect.onExit((exit) => Exit.isFailure(exit) ? idle(id) : Effect.void),
        )
        if (generation !== cancelGeneration || opts?.canStart?.() === false)
          return [idle(id).pipe(Effect.andThen(restore(Effect.interrupt))), st] as const
        const done = yield* Deferred.make<A, E | Cancelled>()
        const run = yield* startRun(work, done, onInterrupt, id).pipe(
          Effect.onExit((exit) => Exit.isFailure(exit) ? idle(id) : Effect.void),
        )
        return [
          (opts?._testHooks?.beforeRunStart ?? Effect.void).pipe(
            Effect.andThen(Effect.sync(() => Deferred.doneUnsafe(run.start, Effect.void))),
            Effect.andThen(restore(awaitRun(done, run.onInterrupt))),
          ),
          { _tag: "Running", run } as const,
        ] as const
      })).pipe(Effect.flatten),
    )

  const startRunning = (
    work: Effect.Effect<A, E>,
    onInterrupt = defaultOnInterrupt,
    onReserved?: (run: RunHandle<A, E>) => void,
    exclusive = false,
    beforeAcquire = Effect.void,
  ): Effect.Effect<Effect.Effect<A, E>, B> =>
    Effect.uninterruptibleMask((restore) =>
      SynchronizedRef.modifyEffect(
        ref,
        Effect.fnUntraced(function* (st) {
          if (opts?.canStart?.() === false) return [Effect.interrupt, st] as const
          if (st._tag === "Cancelling" && !exclusive)
            return [
              restore(
                Deferred.await(st.cancellation.committed).pipe(
                  Effect.andThen(startRunning(work, onInterrupt, onReserved, exclusive, beforeAcquire)),
                ),
              ),
              st,
            ] as const
          if (st._tag !== "Idle") {
            return [busyFailure<Effect.Effect<A, E>>(), st] as const
          }
          yield* beforeAcquire
          const id = next()
          yield* busy.pipe(
            Effect.andThen(beforeAcquire),
            Effect.onExit((exit) => Exit.isFailure(exit) ? idle(id) : Effect.void),
          )
          if (opts?.canStart?.() === false)
            return [idle(id).pipe(Effect.andThen(Effect.interrupt)), st] as const
          const done = yield* Deferred.make<A, E | Cancelled>()
          const run = yield* startRun(work, done, onInterrupt, id).pipe(
          Effect.onExit((exit) => Exit.isFailure(exit) ? idle(id) : Effect.void),
        )
          onReserved?.(run)
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
    beforeAcquire = Effect.void,
  ): Effect.Effect<void, B> => startRunning(work, onInterrupt, undefined, true, beforeAcquire).pipe(Effect.asVoid)

  const startShell = (
    work: Effect.Effect<A, E>,
    onInterrupt = defaultOnInterrupt,
    beforeAcquire = Effect.void,
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
                  Effect.andThen(startShell(work, onInterrupt, beforeAcquire)),
                ),
              ),
              st,
            ] as const
          if (st._tag !== "Idle") {
            return [busyFailure<A>(), st] as readonly [Effect.Effect<A, E | B>, State<A, E>]
          }
          yield* beforeAcquire
          const id = next()
          yield* busy.pipe(
            Effect.andThen(beforeAcquire),
            Effect.onExit((exit) => Exit.isFailure(exit) ? idle(id) : Effect.void),
          )
          if (opts?.canStart?.() === false) {
            yield* idle(id)
            return [restore(Effect.interrupt), st] as const
          }
          const release = opts?.onShellStart
            ? yield* opts.onShellStart.pipe(Effect.onExit((exit) => Exit.isFailure(exit) ? idle(id) : Effect.void))
            : () => {}
          const fiber = yield* work.pipe(
            Effect.interruptible,
            Effect.ensuring(finishShell(id)),
            Effect.ensuring(Effect.sync(release)),
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

  // Cancellation reserves the generation and signals outside the runner lock.
  // Ordinary/owned cancellation retains it until finalizers exit; detached
  // cancellation releases after signalling for Actor and instance disposal.
  // The completion monitor survives interruption of the cancelling caller.
  const makeCancel = (detached: boolean, ownedID?: number) => {
    const claim = (
      st: State<A, E>,
    ): Effect.Effect<
      readonly [{ cancellation: CancellationHandle<A, E>; owner: boolean } | undefined, State<A, E>]
    > =>
      Effect.gen(function* () {
        if (st._tag === "Idle") return [undefined, st] as const
        const active = st._tag === "Cancelling" ? st.cancellation.active : st
        if (ownedID !== undefined && (active._tag !== "Running" || active.run.id !== ownedID)) return [undefined, st] as const
        if (st._tag === "Cancelling") return [{ cancellation: st.cancellation, owner: false }, st] as const
        const cancellation = { active: st, committed: yield* Deferred.make<void>(), signalled: yield* Deferred.make<void>() }
        return [{ cancellation, owner: true }, { _tag: "Cancelling", cancellation }] as const
      })
    return Effect.uninterruptibleMask((restore) =>
      Effect.gen(function* () {
        // Owned cancellation releases only its execution; independent waiters
        // remain eligible after it. A session-wide Stop withdraws every waiter.
        if (ownedID === undefined) cancelGeneration++
        const claimed = yield* SynchronizedRef.modifyEffect(ref, claim)
        if (!claimed) return
        const active = claimed.cancellation.active
        const fiber = active._tag === "Running" ? active.run.fiber : active.shell.fiber
        const commit = Effect.gen(function* () {
          const changed = yield* SynchronizedRef.modify(ref, (st) => {
            if (st._tag !== "Cancelling" || st.cancellation !== claimed.cancellation) return [false, st] as const
            return [true, { _tag: "Idle" }] as const
          })
          if (changed) yield* idleIfCurrent(active._tag === "Running" ? active.run.id : active.shell.id)
          yield* Deferred.succeed(claimed.cancellation.committed, undefined)
        })
        if (claimed.owner) {
          if (opts?._testHooks?.beforeCancelSignal) yield* opts._testHooks.beforeCancelSignal
          yield* signalInterrupt(fiber)
          yield* Deferred.succeed(claimed.cancellation.signalled, undefined)
          if (detached) yield* commit
          else yield* Fiber.await(fiber).pipe(Effect.andThen(commit), Effect.uninterruptible, Effect.forkIn(scope))
        }
        if (detached) {
          if (!claimed.owner) {
            yield* Deferred.await(claimed.cancellation.signalled)
            yield* commit
          }
          return
        }
        yield* restore(Deferred.await(claimed.cancellation.committed))
        if (active._tag === "Running") {
          yield* restore(Fiber.interrupt(active.run.fiber))
          yield* restore(Deferred.await(active.run.done).pipe(Effect.ignore))
          return
        }
        yield* restore(Fiber.interrupt(active.shell.fiber))
      }),
    )
  }

  const ensureExclusive = (work: Effect.Effect<A, E>, onInterrupt = defaultOnInterrupt, beforeAcquire = Effect.void): Effect.Effect<A, E | B> =>
    startRunning(work, onInterrupt, undefined, true, beforeAcquire).pipe(Effect.flatten)

  const startOwned = (work: Effect.Effect<A, E>, onInterrupt = defaultOnInterrupt, beforeAcquire = Effect.void) =>
    Effect.gen(function* () {
      let reserved: RunHandle<A, E> | undefined
      const completion = yield* startRunning(work, onInterrupt, (run) => { reserved = run }, true, beforeAcquire)
      const run = reserved!
      // Fiber exit includes the run's finalizers, without depending on an admission waiter.
      return { runId: run.id, interruptOwned: makeCancel(false, run.id), awaitExit: Fiber.await(run.fiber).pipe(Effect.asVoid), completion }
    })

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
    ensureExclusive,
    startRunning: (work, onInterrupt, beforeAcquire) => startRunning(work, onInterrupt, undefined, false, beforeAcquire),
    start,
    startOwned,
    startShell,
    cancel,
    cancelDetached,
  }
}
