import { EffectLogger, InstanceState } from "@/effect"
import { Runner } from "@/effect"
import { Context, Effect, Exit, Layer, Scope, Semaphore } from "effect"
import * as Session from "./session"
import { MessageV2 } from "./message-v2"
import { isRunDisposing, RunDisposal } from "./run-disposal"
import { SessionID } from "./schema"
import { SessionStatus } from "./status"

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
  readonly assertNotBusy: (sessionID: SessionID, agentID?: string) => Effect.Effect<void, Session.BusyError>
  readonly start: (
    sessionID: SessionID,
    agentID: string,
    onInterrupt: Effect.Effect<MessageV2.WithParts>,
    work: Effect.Effect<MessageV2.WithParts>,
  ) => Effect.Effect<void, Session.BusyError>
  readonly cancel: (sessionID: SessionID) => Effect.Effect<void>
  readonly cancelActor: (sessionID: SessionID, agentID: string) => Effect.Effect<void>
  readonly cancelActorDetached: (sessionID: SessionID, agentID: string) => Effect.Effect<void>
  readonly ensureRunning: (
    sessionID: SessionID,
    agentID: string,
    onInterrupt: Effect.Effect<MessageV2.WithParts>,
    work: Effect.Effect<MessageV2.WithParts>,
  ) => Effect.Effect<MessageV2.WithParts>
  readonly startRunning: (
    sessionID: SessionID,
    agentID: string,
    onInterrupt: Effect.Effect<MessageV2.WithParts>,
    work: Effect.Effect<MessageV2.WithParts>,
  ) => Effect.Effect<Effect.Effect<MessageV2.WithParts>, Session.BusyError>
  readonly startShell: (
    sessionID: SessionID,
    onInterrupt: Effect.Effect<MessageV2.WithParts>,
    work: Effect.Effect<MessageV2.WithParts>,
  ) => Effect.Effect<MessageV2.WithParts, Session.BusyError>
  readonly withRunDisposal: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SessionRunState") {}

const runnerKey = (sessionID: SessionID, agentID: string) => `${sessionID}:${agentID}`

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
          runners: new Map<string, RunnerEntry>(),
          disposing: false,
        }
        yield* Effect.addFinalizer(
          Effect.fnUntraced(function* () {
            data.disposing = true
            const runners = [...data.runners.values()]
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
      const key = runnerKey(sessionID, agentID)
      const inherited = yield* RunDisposal
      if (isRunDisposing(inherited)) return yield* Effect.interrupt
      const data = yield* currentState()
      if (isRunDisposing(inherited) || data.disposing) return yield* Effect.interrupt
      const existing = data.runners.get(key)
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
        const current = data.runners.get(key)
        if (control.leases !== 0 || control.active || current?.control !== control || current.runner.busy) return
        data.runners.delete(key)
      }
      const next: Runner.Runner<MessageV2.WithParts, never, Session.BusyError> = Runner.make<
        MessageV2.WithParts,
        never,
        Session.BusyError
      >(data.scope, {
        label: key,
        onReentryWarn: (info) => elog.warn("runner-reentry", info),
        onStart: (id) => {
          control.latest = id
          control.active = true
        },
        onIdle: (id) =>
          control.statusLock.withPermits(1)(
            Effect.gen(function* () {
              if (data.runners.get(key)?.runner !== next || id !== control.latest) return
              control.active = false
              if (isMain && !data.disposing) yield* status.set(sessionID, { type: "idle" })
              cleanup()
            }),
          ),
        onBusy: isMain ? control.statusLock.withPermits(1)(status.set(sessionID, { type: "busy" })) : Effect.void,
        canStart: () => !data.disposing,
        busy: () => new Session.BusyError(sessionID),
      })
      const entry = { runner: next, control, cleanup }
      data.runners.set(key, entry)
      return { data, entry }
    })

    const assertNotBusy = Effect.fn("SessionRunState.assertNotBusy")(function* (
      sessionID: SessionID,
      agentID = "main",
    ) {
      const data = yield* currentState()
      const existing = data.runners.get(runnerKey(sessionID, agentID))
      if (existing && (existing.control.active || existing.runner.busy))
        return yield* Effect.fail(new Session.BusyError(sessionID))
      return
    })

    const start: Interface["start"] = Effect.fn("SessionRunState.start")(function* (
      sessionID: SessionID,
      agentID: string,
      onInterrupt: Effect.Effect<MessageV2.WithParts>,
      work: Effect.Effect<MessageV2.WithParts>,
    ) {
      const current = yield* runner(sessionID, agentID)
      yield* current.entry.runner
        .start(work, onInterrupt)
        .pipe(
          Effect.provideService(RunDisposal, current.data),
          Effect.ensuring(release(current.entry)),
        )
      return
    })

    const cancel = Effect.fn("SessionRunState.cancel")(function* (sessionID: SessionID) {
      const existing = (yield* runner(sessionID, "main")).entry
      yield* Effect.gen(function* () {
        if (existing.control.active || existing.runner.busy) {
          yield* existing.runner.cancel
          return
        }
        yield* existing.control.statusLock.withPermits(1)(
          Effect.gen(function* () {
            if (existing.control.active || existing.runner.busy) return
            yield* status.set(sessionID, { type: "idle" })
          }),
        )
      }).pipe(
        Effect.ensuring(release(existing)),
      )
    })

    const cancelActor = Effect.fn("SessionRunState.cancelActor")(function* (
      sessionID: SessionID,
      agentID: string,
    ) {
      const key = runnerKey(sessionID, agentID)
      const data = yield* currentState()
      const existing = data.runners.get(key)
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
      const key = runnerKey(sessionID, agentID)
      const data = yield* currentState()
      const existing = data.runners.get(key)
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
    ) {
      const current = yield* runner(sessionID, agentID)
      return yield* current.entry.runner
        .ensureRunning(work, onInterrupt)
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
      const current = yield* runner(sessionID, "main")
      return yield* current.entry.runner
        .startShell(work, onInterrupt)
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
      const current = yield* runner(sessionID, agentID)
      const completion = yield* current.entry.runner
        .startRunning(work, onInterrupt)
        .pipe(
          Effect.provideService(RunDisposal, current.data),
          Effect.ensuring(release(current.entry)),
        )
      return completion.pipe(Effect.provideService(RunDisposal, current.data))
    })

    return Service.of({
      assertNotBusy,
      cancel,
      cancelActor,
      cancelActorDetached,
      ensureRunning,
      start,
      startRunning,
      startShell,
      withRunDisposal,
    })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(SessionStatus.defaultLayer))

export * as SessionRunState from "./run-state"
