import { EffectLogger, InstanceState } from "@/effect"
import { Instance } from "@/project/instance"
import { Runner } from "@/effect"
import { Context, Effect, Exit, Fiber, Layer, Scope, Semaphore } from "effect"
import * as Session from "./session"
import { MessageV2 } from "./message-v2"
import { isRunDisposing, RunDisposal } from "./run-disposal"
import { SessionID } from "./schema"
import { SessionStatus } from "./status"
import { Database } from "@/storage"
import { ExecutionOwnership } from "./execution-ownership"
import * as CancelEpoch from "./cancel-epoch"
import { orphanToolIdleSweepRef, assistantMessageIdsSnapshotRef } from "./orphan-tool-idle-hook"

type RunnerEntry = {
  runner: Runner.Runner<MessageV2.WithParts, never, Session.BusyError>
  control: {
    statusLock: ReturnType<typeof Semaphore.makeUnsafe>
    latest: number
    active: boolean
    leases: number
  }
  cleanup: () => void
}

const release = (entry: RunnerEntry) =>
  Effect.sync(() => {
    entry.control.leases--
    entry.cleanup()
  })

export interface Interface {
  readonly sessionExecutionSnapshot: (sessionID: SessionID, agentID?: string) => Effect.Effect<{ readonly isIdle: () => boolean; readonly isCancelled: () => boolean }>
  readonly executionSnapshot: (sessionID: SessionID, agentID: string) => Effect.Effect<{ readonly fiber: Fiber.Fiber<MessageV2.WithParts> | undefined; readonly isCurrent: () => boolean }>

  readonly assertNotBusy: (sessionID: SessionID, agentID?: string) => Effect.Effect<void, Session.BusyError>
  readonly start: (
    sessionID: SessionID,
    agentID: string,
    onInterrupt: Effect.Effect<MessageV2.WithParts>,
    work: Effect.Effect<MessageV2.WithParts>,
    admit?: Effect.Effect<void>,
  ) => Effect.Effect<void, Session.BusyError>
  readonly cancel: (sessionID: SessionID) => Effect.Effect<void>
  readonly cancelActor: (sessionID: SessionID, agentID: string) => Effect.Effect<void>
  readonly cancelActorDetached: (sessionID: SessionID, agentID: string) => Effect.Effect<void>
  readonly ensureRunning: (
    sessionID: SessionID,
    agentID: string,
    onInterrupt: Effect.Effect<MessageV2.WithParts>,
    work: Effect.Effect<MessageV2.WithParts>,
    joinRunning?: boolean,
    cancelEpoch?: number,
  ) => Effect.Effect<MessageV2.WithParts>
  readonly startRunning: (
    sessionID: SessionID,
    agentID: string,
    onInterrupt: Effect.Effect<MessageV2.WithParts>,
    work: Effect.Effect<MessageV2.WithParts>,
  ) => Effect.Effect<Effect.Effect<MessageV2.WithParts>, Session.BusyError>
  readonly startOwned: (sessionID: SessionID, agentID: string, onInterrupt: Effect.Effect<MessageV2.WithParts>, work: Effect.Effect<MessageV2.WithParts>, admit?: Effect.Effect<void>) => Effect.Effect<{ readonly runId: number; readonly interruptOwned: Effect.Effect<void>; readonly awaitExit: Effect.Effect<void>; readonly completion: Effect.Effect<MessageV2.WithParts> }, Session.BusyError>
  readonly ensureExclusive: (sessionID: SessionID, agentID: string, onInterrupt: Effect.Effect<MessageV2.WithParts>, work: Effect.Effect<MessageV2.WithParts>) => Effect.Effect<MessageV2.WithParts, Session.BusyError>
  readonly startShell: (
    sessionID: SessionID,
    onInterrupt: Effect.Effect<MessageV2.WithParts>,
    work: Effect.Effect<MessageV2.WithParts>,
  ) => Effect.Effect<MessageV2.WithParts, Session.BusyError>
  readonly withRunDisposal: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SessionRunState") {}

/**
 * Runners are keyed by session then agentID — NOT a flat `${sessionID}:${agentID}`
 * string. Flat prefixes are ambiguous when a legal imported session id itself
 * contains a colon (`ses_example` vs `ses_example:child`).
 */

// A child executor must observe cancellation, not the stale assistant its caller
// happens to pass. Upstream applies this in its runner factory, which takes
// onInterrupt; this fork threads onInterrupt per start, so the same coercion
// happens at the entry points instead.
const interruptFor = (agentID: string, onInterrupt: Effect.Effect<MessageV2.WithParts>) =>
  agentID === "main" ? onInterrupt : Effect.interrupt

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const status = yield* SessionStatus.Service
    const elog = EffectLogger.create({ service: "SessionRunState" })

    const state = yield* InstanceState.make(
      Effect.fn("SessionRunState.state")(function* (instance) {
        const data = {
          instance,
          scope: yield* Scope.make("parallel"),
          runners: new Map<SessionID, Map<string, RunnerEntry>>(),
          disposing: false,
          actorCancellations: new Map<SessionID, Map<string, number>>(),
        }
        yield* Effect.addFinalizer(
          Effect.fnUntraced(function* () {
            data.disposing = true
            const runners = [...data.runners.values()].flatMap((actors) => [...actors.values()])
            data.runners.clear()
            yield* Effect.forEach(runners, (entry) => entry.runner.cancelDetached, {
              concurrency: "unbounded",
              discard: true,
            })
            yield* Scope.close(data.scope, Exit.void).pipe(
              Effect.forkDetach({ startImmediately: true }),
              Effect.asVoid,
            )
          }),
        )
        return data
      }),
    )

    const currentState = Effect.fn("SessionRunState.currentState")(function* () {
      const instance = yield* InstanceState.context
      if (instance.disposing) return yield* Effect.interrupt
      const data = yield* InstanceState.get(state)
      if (instance.disposing || data.disposing || data.instance !== instance) return yield* Effect.interrupt
      return data
    })

    const withRunDisposal = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      Effect.gen(function* () {
        const inherited = yield* RunDisposal
        if (isRunDisposing(inherited)) return yield* Effect.interrupt
        const data = yield* currentState()
        if (isRunDisposing(inherited) || data.disposing) return yield* Effect.interrupt
        return yield* effect.pipe(Effect.provideService(RunDisposal, data))
      })

    const runner = Effect.fn("SessionRunState.runner")(function* (
      sessionID: SessionID,
      agentID: string,
    ) {
      const inherited = yield* RunDisposal
      if (isRunDisposing(inherited)) return yield* Effect.interrupt
      const data = yield* currentState()
      if (isRunDisposing(inherited) || data.disposing) return yield* Effect.interrupt
      const existing = data.runners.get(sessionID)?.get(agentID)
      if (existing) {
        existing.control.leases++
        return { data, entry: existing }
      }
      const isMain = agentID === "main"
      const control = {
        statusLock: Semaphore.makeUnsafe(1),
        latest: 0,
        active: false,
        leases: 1,
      }
      const cleanup = () => {
        const current = data.runners.get(sessionID)?.get(agentID)
        if (control.leases !== 0 || control.active || current?.control !== control || current.runner.busy) return
        const actors = data.runners.get(sessionID)
        actors?.delete(agentID)
        if (actors?.size === 0) data.runners.delete(sessionID)
      }
      const next: Runner.Runner<MessageV2.WithParts, never, Session.BusyError> = Runner.make<
        MessageV2.WithParts,
        never,
        Session.BusyError
      >(data.scope, {
        onRunStart: Effect.sync(() => Instance.claim(data.instance.directory)),
        onShellStart: Effect.sync(() => Instance.claim(data.instance.directory)),
        label: `${sessionID}:${agentID}`,
        onReentryWarn: (info) => elog.warn("runner-reentry", info),
        onStart: (id) => {
          control.latest = id
          control.active = true
        },
        onIdle: (id) =>
          control.statusLock.withPermits(1)(
            Effect.gen(function* () {
              if (data.runners.get(sessionID)?.get(agentID)?.runner !== next || id !== control.latest) return
              control.active = false
              if (isMain && !data.disposing) yield* status.set(sessionID, { type: "idle" })
              cleanup()
            }),
          ),
        // Do not clobber session.status{retry} with busy: request-ladder retries
        // re-enter the runner and would wipe the reconnect row mid-wait.
        onBusy: isMain
          ? control.statusLock.withPermits(1)(
              Effect.gen(function* () {
                const current = yield* status.get(sessionID)
                if (current.type !== "retry") yield* status.set(sessionID, { type: "busy" })
              }),
            )
          : Effect.void,
        canStart: () => !data.disposing,
        busy: () => new Session.BusyError(sessionID),
      })
      const entry = { runner: next, control, cleanup }
      const actors = data.runners.get(sessionID) ?? new Map<string, RunnerEntry>()
      actors.set(agentID, entry)
      data.runners.set(sessionID, actors)
      return { data, entry }
    })

    const ownership = Effect.fn("SessionRunState.ownership")(function* (sessionID: SessionID) {
      const identity = yield* ExecutionOwnership.captureIdentity
      const check = Effect.sync(() => Database.use((db) => ExecutionOwnership.assertOwnership(db, sessionID, identity)))
      yield* check
      return check
    })

    const sessionExecutionSnapshot: Interface["sessionExecutionSnapshot"] = Effect.fn("SessionRunState.sessionExecutionSnapshot")(function* (sessionID, agentID) {
      const data = yield* currentState()
      const generation = CancelEpoch.current(sessionID)
      const actorGeneration = agentID == null ? undefined : data.actorCancellations.get(sessionID)?.get(agentID) ?? 0
      return {
        isIdle: () => ![...(data.runners.get(sessionID)?.values() ?? [])].some((entry) => entry.control.active || entry.runner.busy),
        isCancelled: () => data.disposing || CancelEpoch.current(sessionID) !== generation ||
          (agentID != null && (data.actorCancellations.get(sessionID)?.get(agentID) ?? 0) !== actorGeneration),
      }
    })

    const executionSnapshot: Interface["executionSnapshot"] = Effect.fn("SessionRunState.executionSnapshot")(function* (sessionID, agentID) {
      const data = yield* currentState()
      const current = () => {
        const entry = data.runners.get(sessionID)?.get(agentID)?.runner.state
        if (!entry || entry._tag === "Idle") return undefined
        const active = entry._tag === "Cancelling" ? entry.cancellation.active : entry
        return active._tag === "Shell" ? active.shell.fiber : active.run.fiber
      }
      const fiber = current()
      return { fiber, isCurrent: () => !data.disposing && current() === fiber }
    })

    const assertNotBusy = Effect.fn("SessionRunState.assertNotBusy")(function* (
      sessionID: SessionID,
      agentID = "main",
    ) {
      const data = yield* currentState()
      const existing = data.runners.get(sessionID)?.get(agentID)
      if (existing && (existing.control.active || existing.runner.busy))
        return yield* Effect.fail(new Session.BusyError(sessionID))
      return
    })

    /**
     * Snapshot assistant message IDs while work is still exiting, then sweep
     * orphans only on that set (RL-ORPHAN-D01). Field evidence: the original
     * orphan sat on an INCOMPLETE assistant (completed only stamped at next
     * prompt entry as Abandoned). Snapshot covers those messages; new turns
     * create new message IDs and cannot enter an earlier snapshot.
     */
    const withOrphanSweep = (sessionID: SessionID, agentID: string, work: Effect.Effect<MessageV2.WithParts>) => {
      if (agentID !== "main") return work
      return Effect.gen(function* () {
        // A retiring instance may finish after its replacement has registered
        // new hooks. Keep this run bound to its original services and lifetime.
        const disposal = yield* RunDisposal
        const sweep = orphanToolIdleSweepRef.current
        const snapshot = assistantMessageIdsSnapshotRef.current
        return yield* work.pipe(
          Effect.ensuring(
            Effect.gen(function* () {
              if (!sweep || !snapshot || isRunDisposing(disposal)) return
              const ownedMessageIds = yield* snapshot(sessionID)
              if (isRunDisposing(disposal)) return
              yield* sweep(sessionID, { ownedMessageIds }).pipe(Effect.ignore)
            }),
          ),
        )
      })
    }

    const start: Interface["start"] = Effect.fn("SessionRunState.start")(function* (
      sessionID: SessionID,
      agentID: string,
      onInterrupt: Effect.Effect<MessageV2.WithParts>,
      work: Effect.Effect<MessageV2.WithParts>,
      admit?: Effect.Effect<void>,
    ) {
      const check = yield* ownership(sessionID)
      const current = yield* runner(sessionID, agentID)
      yield* current.entry.runner
        .start(check.pipe(Effect.andThen(admit ?? Effect.void), Effect.andThen(withOrphanSweep(sessionID, agentID, work))), interruptFor(agentID, onInterrupt), check)
        .pipe(
          Effect.provideService(RunDisposal, current.data),
          Effect.ensuring(release(current.entry)),
        )
      return
    })

    // Cancel a snapshot of this session's runners; leases and generation-aware
    // cleanup keep a replacement admitted during interruption reachable.
    const cancel = Effect.fn("SessionRunState.cancel")(function* (sessionID: SessionID) {
      CancelEpoch.advance(sessionID)
      const main = yield* runner(sessionID, "main")
      const targets = [...(main.data.runners.get(sessionID)?.values() ?? [])]
      targets.forEach((entry) => entry.control.leases++)
      yield* Effect.forEach(targets, (entry) => entry.runner.cancel, {
        concurrency: "unbounded",
        discard: true,
      }).pipe(
        Effect.andThen(main.entry.control.statusLock.withPermits(1)(
          Effect.gen(function* () {
            const current = main.data.runners.get(sessionID)
            if (current && [...current.values()].some((entry) => entry.control.active || entry.runner.busy)) return
            yield* status.set(sessionID, { type: "idle" })
          }),
        )),
        Effect.ensuring(Effect.forEach(targets, release, { discard: true })),
        Effect.ensuring(release(main.entry)),
      )
    })

    const cancelActor = Effect.fn("SessionRunState.cancelActor")(function* (
      sessionID: SessionID,
      agentID: string,
    ) {
      const data = yield* currentState()
      const cancellations = data.actorCancellations.get(sessionID) ?? new Map<string, number>()
      cancellations.set(agentID, (cancellations.get(agentID) ?? 0) + 1)
      data.actorCancellations.set(sessionID, cancellations)
      const existing = data.runners.get(sessionID)?.get(agentID)
      if (!existing) return
      existing.control.leases++
      yield* (existing.control.active || existing.runner.busy ? existing.runner.cancel : Effect.void).pipe(
        Effect.ensuring(release(existing)),
      )
    })

    const cancelActorDetached = Effect.fn("SessionRunState.cancelActorDetached")(function* (
      sessionID: SessionID,
      agentID: string,
    ) {
      const data = yield* currentState()
      const cancellations = data.actorCancellations.get(sessionID) ?? new Map<string, number>()
      cancellations.set(agentID, (cancellations.get(agentID) ?? 0) + 1)
      data.actorCancellations.set(sessionID, cancellations)
      const existing = data.runners.get(sessionID)?.get(agentID)
      if (!existing) return
      existing.control.leases++
      yield* (existing.control.active || existing.runner.busy ? existing.runner.cancelDetached : Effect.void).pipe(
        Effect.ensuring(release(existing)),
      )
    })

    const ensureRunning = Effect.fn("SessionRunState.ensureRunning")(function* (
      sessionID: SessionID,
      agentID: string,
      onInterrupt: Effect.Effect<MessageV2.WithParts>,
      work: Effect.Effect<MessageV2.WithParts>,
      joinRunning = false,
      cancelEpoch?: number,
    ) {
      const check = yield* ownership(sessionID)
      const current = yield* runner(sessionID, agentID)
      return yield* current.entry.runner
        .ensureRunning(
          check.pipe(Effect.andThen(withOrphanSweep(sessionID, agentID, work))),
          interruptFor(agentID, onInterrupt),
          joinRunning,
          cancelEpoch == null ? undefined : () => CancelEpoch.current(sessionID) === cancelEpoch,
          check,
        )
        .pipe(
          Effect.provideService(RunDisposal, current.data),
          Effect.ensuring(release(current.entry)),
        )
    })

    const startShell = Effect.fn("SessionRunState.startShell")(function* (
      sessionID: SessionID,
      onInterrupt: Effect.Effect<MessageV2.WithParts>,
      work: Effect.Effect<MessageV2.WithParts>,
    ) {
      const check = yield* ownership(sessionID)
      const current = yield* runner(sessionID, "main")
      return yield* current.entry.runner
        .startShell(check.pipe(Effect.andThen(work)), onInterrupt, check)
        .pipe(
          Effect.provideService(RunDisposal, current.data),
          Effect.ensuring(release(current.entry)),
        )
    })

    const startRunning = Effect.fn("SessionRunState.startRunning")(function* (
      sessionID: SessionID,
      agentID: string,
      onInterrupt: Effect.Effect<MessageV2.WithParts>,
      work: Effect.Effect<MessageV2.WithParts>,
    ) {
      const check = yield* ownership(sessionID)
      const current = yield* runner(sessionID, agentID)
      const completion = yield* current.entry.runner
        .startRunning(check.pipe(Effect.andThen(withOrphanSweep(sessionID, agentID, work))), interruptFor(agentID, onInterrupt), check)
        .pipe(
          Effect.provideService(RunDisposal, current.data),
          Effect.ensuring(release(current.entry)),
        )
      return completion.pipe(Effect.provideService(RunDisposal, current.data))
    })

    const startOwned: Interface["startOwned"] = Effect.fn("SessionRunState.startOwned")(function* (sessionID, agentID, onInterrupt, work, admit) {
      const check = yield* ownership(sessionID)
      const current = yield* runner(sessionID, agentID)
      // An unadmitted run owns no history to settle, even on cancellation.
      const admitted = check.pipe(Effect.andThen(admit ?? Effect.void), Effect.andThen(withOrphanSweep(sessionID, agentID, work)))
      return yield* current.entry.runner.startOwned(admitted, interruptFor(agentID, onInterrupt), check).pipe(
        Effect.provideService(RunDisposal, current.data),
        Effect.ensuring(release(current.entry)),
      )
    })
    const ensureExclusive: Interface["ensureExclusive"] = Effect.fn("SessionRunState.ensureExclusive")(function* (sessionID, agentID, onInterrupt, work) {
      const check = yield* ownership(sessionID)
      const current = yield* runner(sessionID, agentID)
      return yield* current.entry.runner.ensureExclusive(check.pipe(Effect.andThen(withOrphanSweep(sessionID, agentID, work))), interruptFor(agentID, onInterrupt), check).pipe(
        Effect.provideService(RunDisposal, current.data),
        Effect.ensuring(release(current.entry)),
      )
    })

    return Service.of({
      sessionExecutionSnapshot,
      executionSnapshot,
      assertNotBusy,
      cancel,
      cancelActor,
      cancelActorDetached,
      ensureRunning,
      start,
      startRunning,
      startOwned,
      ensureExclusive,
      startShell,
      withRunDisposal,
    })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(SessionStatus.defaultLayer))

export * as SessionRunState from "./run-state"
