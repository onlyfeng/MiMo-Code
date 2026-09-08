import { Context, Effect } from "effect"

// Correlates permission events with a live CLI invocation. This is not a grant:
// normal permission evaluation (including explicit deny) still runs first.
export interface Scope {
  readonly id: string
  readonly signal: AbortSignal
  active: boolean
  readonly messages: Set<string>
  close(): void
}

export const Current = Context.Reference<{ scope: Scope | undefined } | undefined>("@opencode/RunApproval", {
  defaultValue: () => undefined,
})

export const RequestSignal = Context.Reference<AbortSignal | undefined>("@opencode/RunApprovalRequestSignal", {
  defaultValue: () => undefined,
})

export const id = (scope: Scope | undefined) => (scope?.active ? scope.id : undefined)
export function register(scope: Scope | undefined, messageID: string, expectedUserID?: string) {
  if (!scope?.active || (expectedUserID && !scope.messages.has(expectedUserID))) return
  scope.messages.add(messageID)
}

export const current = Effect.gen(function* () {
  return (yield* Current)?.scope
})

export const provide =
  (scope: Scope | undefined) =>
  <A, E, R>(work: Effect.Effect<A, E, R>) =>
    Effect.suspend(() => work.pipe(Effect.provideService(Current, { scope })))

// A bridge outlives a model step. Give it its own holder so selecting queued
// input in the parent cannot strip the old bridge's cancellation signal.
export const capture = <A, E, R>(work: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    return yield* work.pipe(provide(yield* current))
  })

export const select = (messageID: string) =>
  Effect.gen(function* () {
    const holder = yield* Current
    if (!holder?.scope || holder.scope.messages.has(messageID)) return
    holder.scope.close()
    holder.scope = undefined
  })

export const signal = (scope: Scope | undefined, caller?: AbortSignal) =>
  scope ? (caller ? AbortSignal.any([scope.signal, caller]) : scope.signal) : caller

// Install inside admitted runner work, never around a waiter joining a run.
// Children hold this same object, so completion/cancellation also expires their
// captured bridges and aborts pending asks. Nothing is persisted on an actor.
export const own =
  (runID: string | undefined) =>
  <A, E, R>(work: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      if (!runID) return yield* work.pipe(provide(undefined))
      const request = yield* RequestSignal
      const controller = new AbortController()
      const close = () => {
        scope.active = false
        controller.abort()
      }
      const scope: Scope = { id: runID, active: true, signal: controller.signal, messages: new Set(), close }
      if (request?.aborted) close()
      request?.addEventListener("abort", close, { once: true })
      return yield* work.pipe(
        provide(scope),
        Effect.ensuring(
          Effect.sync(() => {
            close()
            request?.removeEventListener("abort", close)
          }),
        ),
      )
    })
