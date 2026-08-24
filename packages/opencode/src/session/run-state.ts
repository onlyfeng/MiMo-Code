import { EffectLogger, InstanceState } from "@/effect"
import { Runner } from "@/effect"
import { Effect, Exit, Layer, Scope, Context } from "effect"
import * as Session from "./session"
import { MessageV2 } from "./message-v2"
import { RunDisposal } from "./run-disposal"
import { SessionID } from "./schema"
import { SessionStatus } from "./status"

export interface Interface {
  readonly assertNotBusy: (sessionID: SessionID) => Effect.Effect<void>
  readonly cancel: (sessionID: SessionID) => Effect.Effect<void>
  readonly cancelActor: (sessionID: SessionID, agentID: string) => Effect.Effect<void>
  readonly cancelActorDetached: (sessionID: SessionID, agentID: string) => Effect.Effect<void>
  readonly ensureRunning: (
    sessionID: SessionID,
    agentID: string,
    onInterrupt: Effect.Effect<MessageV2.WithParts>,
    work: Effect.Effect<MessageV2.WithParts>,
  ) => Effect.Effect<MessageV2.WithParts>
  readonly startShell: (
    sessionID: SessionID,
    onInterrupt: Effect.Effect<MessageV2.WithParts>,
    work: Effect.Effect<MessageV2.WithParts>,
  ) => Effect.Effect<MessageV2.WithParts>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SessionRunState") {}

const runnerKey = (sessionID: SessionID, agentID: string) => `${sessionID}:${agentID}`

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const status = yield* SessionStatus.Service
    const elog = EffectLogger.create({ service: "SessionRunState" })

    const state = yield* InstanceState.make(
      Effect.fn("SessionRunState.state")(function* () {
        const data = {
          scope: yield* Scope.make("parallel"),
          runners: new Map<string, Runner.Runner<MessageV2.WithParts>>(),
          disposing: false,
        }
        yield* Effect.addFinalizer(
          Effect.fnUntraced(function* () {
            data.disposing = true
            const runners = [...data.runners.values()]
            data.runners.clear()
            yield* Effect.forEach(runners, (runner) => runner.cancelDetached, {
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

    const runner = Effect.fn("SessionRunState.runner")(function* (
      sessionID: SessionID,
      agentID: string,
      onInterrupt: Effect.Effect<MessageV2.WithParts>,
    ) {
      const key = runnerKey(sessionID, agentID)
      if ((yield* RunDisposal).disposing) return yield* Effect.interrupt
      const data = yield* InstanceState.get(state)
      if (data.disposing) return yield* Effect.interrupt
      const existing = data.runners.get(key)
      if (existing) return { data, runner: existing }
      const isMain = agentID === "main"
      const next = Runner.make<MessageV2.WithParts>(data.scope, {
        label: key,
        onReentryWarn: (info) => elog.warn("runner-reentry", info),
        onIdle: Effect.gen(function* () {
          data.runners.delete(key)
          if (!isMain || data.disposing) return
          yield* status.set(sessionID, { type: "idle" })
        }),
        onBusy: isMain ? status.set(sessionID, { type: "busy" }) : Effect.void,
        onInterrupt,
        canStart: () => !data.disposing,
        busy: () => {
          throw new Session.BusyError(sessionID)
        },
      })
      data.runners.set(key, next)
      return { data, runner: next }
    })

    const assertNotBusy = Effect.fn("SessionRunState.assertNotBusy")(function* (sessionID: SessionID) {
      const data = yield* InstanceState.get(state)
      if (data.disposing) return
      const existing = data.runners.get(runnerKey(sessionID, "main"))
      if (existing?.busy) throw new Session.BusyError(sessionID)
    })

    const cancel = Effect.fn("SessionRunState.cancel")(function* (sessionID: SessionID) {
      const key = runnerKey(sessionID, "main")
      const data = yield* InstanceState.get(state)
      if (data.disposing) return
      const existing = data.runners.get(key)
      if (!existing || !existing.busy) {
        yield* status.set(sessionID, { type: "idle" })
        return
      }
      yield* existing.cancel
    })

    const cancelActor = Effect.fn("SessionRunState.cancelActor")(function* (
      sessionID: SessionID,
      agentID: string,
    ) {
      const key = runnerKey(sessionID, agentID)
      const data = yield* InstanceState.get(state)
      if (data.disposing) return
      const existing = data.runners.get(key)
      if (!existing || !existing.busy) return
      yield* existing.cancel
    })

    const cancelActorDetached = Effect.fn("SessionRunState.cancelActorDetached")(function* (
      sessionID: SessionID,
      agentID: string,
    ) {
      const key = runnerKey(sessionID, agentID)
      const data = yield* InstanceState.get(state)
      if (data.disposing) return
      const existing = data.runners.get(key)
      if (!existing || !existing.busy) return
      yield* existing.cancelDetached
    })

    const ensureRunning = Effect.fn("SessionRunState.ensureRunning")(function* (
      sessionID: SessionID,
      agentID: string,
      onInterrupt: Effect.Effect<MessageV2.WithParts>,
      work: Effect.Effect<MessageV2.WithParts>,
    ) {
      const current = yield* runner(sessionID, agentID, onInterrupt)
      return yield* current.runner
        .ensureRunning(work)
        .pipe(Effect.provideService(RunDisposal, current.data))
    })

    const startShell = Effect.fn("SessionRunState.startShell")(function* (
      sessionID: SessionID,
      onInterrupt: Effect.Effect<MessageV2.WithParts>,
      work: Effect.Effect<MessageV2.WithParts>,
    ) {
      const current = yield* runner(sessionID, "main", onInterrupt)
      return yield* current.runner
        .startShell(work)
        .pipe(Effect.provideService(RunDisposal, current.data))
    })

    return Service.of({ assertNotBusy, cancel, cancelActor, cancelActorDetached, ensureRunning, startShell })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(SessionStatus.defaultLayer))

export * as SessionRunState from "./run-state"
