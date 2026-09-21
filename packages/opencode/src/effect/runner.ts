import { Cause, Deferred, Effect, Exit, Fiber, Schema, Scope, SynchronizedRef } from "effect"

export interface Runner<A, E = never, B = never> {
  readonly state: State<A, E>
  readonly busy: boolean
  readonly ensureRunning: (work: Effect.Effect<A, E>, onInterrupt?: Effect.Effect<A, E>, joinRunning?: boolean) => Effect.Effect<A, E>
  readonly startRunning: (
    work: Effect.Effect<A, E>,
    onInterrupt?: Effect.Effect<A, E>,
  ) => Effect.Effect<Effect.Effect<A, E>, B>
  readonly ensureExclusive: (work: Effect.Effect<A, E>, onInterrupt?: Effect.Effect<A, E>) => Effect.Effect<A, E | B>
  readonly startOwned: (work: Effect.Effect<A, E>, onInterrupt?: Effect.Effect<A, E>) => Effect.Effect<{ readonly runId: number; readonly interruptOwned: Effect.Effect<void>; readonly completion: Effect.Effect<A, E> }, B>
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
  pending?: { work: Effect.Effect<A, E>; done: Deferred.Deferred<A, E | Cancelled>; onInterrupt: Effect.Effect<A, E> | undefined }
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

  const finishRun = (id: number, done: Deferred.Deferred<A, E | Cancelled>, exit: Exit.Exit<A, E>): Effect.Effect<void> =>
    SynchronizedRef.modifyEffect(ref, Effect.fnUntraced(function* (st) {
      if (st._tag !== "Running" || st.run.id !== id) return [complete(done, exit), st] as const
      const pending = st.run.pending
      if (pending && opts?.canStart?.() !== false) {
        const run = yield* startRun(pending.work, pending.done, pending.onInterrupt)
        return [Effect.sync(() => Deferred.doneUnsafe(run.start, Effect.void)).pipe(Effect.andThen(complete(done, exit))), { _tag: "Running", run }] as const
      }
      if (pending) yield* Deferred.fail(pending.done, new Cancelled())
      return [idleIfCurrent(id).pipe(Effect.andThen(complete(done, exit))), { _tag: "Idle" }] as const
    })).pipe(Effect.flatten)

  const startRun = (
    work: Effect.Effect<A, E>,
    done: Deferred.Deferred<A, E | Cancelled>,
    onInterrupt = defaultOnInterrupt,
    id = next(),
  ): Effect.Effect<RunHandle<A, E>> =>
    Effect.gen(function* () {
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
    joinRunning = false,
  ): Effect.Effect<A, E> =>
    Effect.uninterruptibleMask((restore) =>
      SynchronizedRef.modifyEffect(
        ref,
        Effect.fnUntraced(function* (st) {
          if (opts?.canStart?.() === false) return [Effect.interrupt, st] as const
          switch (st._tag) {
            case "Running": {
              const exit = st.run.fiber.pollUnsafe()
              if (exit !== undefined) {
                if (st.run.pending) yield* Deferred.fail(st.run.pending.done, new Cancelled())
                yield* complete(st.run.done, exit)
                const done = yield* Deferred.make<A, E | Cancelled>()
                const run = yield* startRun(work, done, onInterrupt)
                return [Effect.sync(() => Deferred.doneUnsafe(run.start, Effect.void)).pipe(Effect.andThen(restore(awaitRun(done, onInterrupt)))), { _tag: "Running", run }] as const
              }
              if (opts?.onReentryWarn) yield* opts.onReentryWarn({ label: opts.label ?? "(unlabeled)", existingRunId: st.run.id })
              // Inbox observers retain the original exit so a failure before drain
              // cannot turn an attached wake into an implicit retry.
              if (joinRunning) return [restore(awaitRun(st.run.done, st.run.onInterrupt)), st] as const
              if (st.run.pending) return [restore(awaitRun(st.run.pending.done, st.run.pending.onInterrupt)), st] as const
              const pending = { work, done: yield* Deferred.make<A, E | Cancelled>(), onInterrupt }
              return [restore(awaitRun(pending.done, onInterrupt)), { _tag: "Running", run: { ...st.run, pending } }] as const
            }
            case "ShellThenRun": {
              const exit = st.shell.fiber.pollUnsafe()
              if (exit !== undefined) {
                yield* Deferred.fail(st.run.done, new Cancelled())
                const done = yield* Deferred.make<A, E | Cancelled>()
                const run = yield* startRun(work, done, onInterrupt)
                return [Effect.sync(() => Deferred.doneUnsafe(run.start, Effect.void)).pipe(Effect.andThen(restore(awaitRun(done, onInterrupt)))), { _tag: "Running", run }] as const
              }
              if (opts?.onReentryWarn) yield* opts.onReentryWarn({ label: opts.label ?? "(unlabeled)", existingRunId: st.run.id })
              return [restore(awaitRun(st.run.done, st.run.onInterrupt)), { ...st, run: { ...st.run, work } }] as const
            }
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
                    Effect.andThen(ensureRunning(work, onInterrupt, joinRunning)),
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
    onReserved?: (id: number) => void,
    exclusive = false,
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
                  Effect.andThen(startRunning(work, onInterrupt, onReserved)),
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
          onReserved?.(id)
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
  ): Effect.Effect<void, B> => startRunning(work, onInterrupt, undefined, true).pipe(Effect.asVoid)

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
        const claimed = yield* SynchronizedRef.modifyEffect(ref, claim)
        if (!claimed) return
        const active = claimed.cancellation.active
        const fiber = active._tag === "Running" ? active.run.fiber : active.shell.fiber
        const commit = Effect.gen(function* () {
          const changed = yield* SynchronizedRef.modify(ref, (st) => {
            if (st._tag !== "Cancelling" || st.cancellation !== claimed.cancellation) return [false, st] as const
            return [true, { _tag: "Idle" }] as const
          })
          if (changed) yield* idleIfCurrent(active._tag === "Running" ? active.run.id : active._tag === "Shell" ? active.shell.id : active.run.id)
          yield* Deferred.succeed(claimed.cancellation.committed, undefined)
        })
        if (claimed.owner) {
          if (opts?._testHooks?.beforeCancelSignal) yield* opts._testHooks.beforeCancelSignal
          yield* signalInterrupt(fiber)
          if (active._tag === "ShellThenRun")
            yield* Deferred.fail(active.run.done, new Cancelled()).pipe(Effect.asVoid)
          if (active._tag === "Running" && active.run.pending)
            yield* Deferred.fail(active.run.pending.done, new Cancelled()).pipe(Effect.asVoid)
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

  const ensureExclusive = (work: Effect.Effect<A, E>, onInterrupt = defaultOnInterrupt): Effect.Effect<A, E | B> =>
    startRunning(work, onInterrupt, undefined, true).pipe(Effect.flatten)

  const startOwned = (work: Effect.Effect<A, E>, onInterrupt = defaultOnInterrupt) =>
    Effect.gen(function* () {
      let runId = 0
      const completion = yield* startRunning(work, onInterrupt, (id) => { runId = id }, true)
      return { runId, interruptOwned: makeCancel(false, runId), completion }
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
    startRunning,
    start,
    startOwned,
    startShell,
    cancel,
    cancelDetached,
  }
}
