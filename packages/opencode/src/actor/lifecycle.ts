import { Deferred, Effect, Exit } from "effect"
import type { SessionID } from "@/session/schema"

export type TerminalStatus = "completed" | "failed" | "cancelled"
export type TerminalClaim = {
  status: TerminalStatus
  owner: "turn" | "cancel"
  error?: string
}

type GenerationBase = {
  generation: number
  done: Deferred.Deferred<void>
  terminalDone: Deferred.Deferred<void>
  terminal?: TerminalClaim
}

export type ForkGenerationOwner = GenerationBase & {
  kind: "fork"
  result?: never
}

export type WakeGenerationOwner<Result> = GenerationBase & {
  kind: "wake"
  result: Deferred.Deferred<Exit.Exit<Result>>
}

export type GenerationOwner<Result> = ForkGenerationOwner | WakeGenerationOwner<Result>
export type CancelEpisode = { id: number; done: Deferred.Deferred<void> }

export type WakeOwnership<Result> =
  | { _tag: "blocked" }
  | { _tag: "episode"; episode: CancelEpisode }
  | { _tag: "fork"; active: ForkGenerationOwner }
  | { _tag: "follower"; active: WakeGenerationOwner<Result> }
  | { _tag: "owner"; owner: WakeGenerationOwner<Result> }

export type CancelOwnership<Result> =
  | { _tag: "noop" }
  | { _tag: "follower"; episode: CancelEpisode }
  | {
      _tag: "owner"
      episode: CancelEpisode
      generation: GenerationOwner<Result> | undefined
      claimed: boolean
    }

export function createActorLifecycle<Result, ContextValue>() {
  const forkContexts = new Map<string, ContextValue>()
  const cancelledActors = new Set<string>()
  const deliveredActors = new Map<string, number>()
  const liveActors = new Map<string, number>()
  const generationCounters = new Map<string, number>()
  const persistentActors = new Set<string>()
  const generationOwners = new Map<string, GenerationOwner<Result>>()
  const cancelEpisodes = new Map<string, CancelEpisode>()
  const cancelEpisodeID = { current: 0 }

  const key = (sessionID: SessionID, actorID: string) => JSON.stringify([sessionID, actorID])
  const nextGeneration = (actorKey: string) => {
    const generation = (generationCounters.get(actorKey) ?? 0) + 1
    generationCounters.set(actorKey, generation)
    liveActors.set(actorKey, generation)
    return generation
  }

  const startFork = (actorKey: string) =>
    Effect.sync(() => {
      const owner: ForkGenerationOwner = {
        generation: nextGeneration(actorKey),
        kind: "fork",
        done: Deferred.makeUnsafe<void>(),
        terminalDone: Deferred.makeUnsafe<void>(),
      }
      generationOwners.set(actorKey, owner)
      return owner
    })

  const acquireWake = (actorKey: string): Effect.Effect<WakeOwnership<Result>> =>
    Effect.sync(() => {
      const episode = cancelEpisodes.get(actorKey)
      if (episode) return { _tag: "episode", episode }
      if (!persistentActors.has(actorKey) || cancelledActors.has(actorKey)) return { _tag: "blocked" }
      const active = generationOwners.get(actorKey)
      if (active?.kind === "fork") return { _tag: "fork", active }
      if (active) return { _tag: "follower", active }
      const owner: WakeGenerationOwner<Result> = {
        generation: nextGeneration(actorKey),
        kind: "wake",
        done: Deferred.makeUnsafe<void>(),
        result: Deferred.makeUnsafe<Exit.Exit<Result>>(),
        terminalDone: Deferred.makeUnsafe<void>(),
      }
      generationOwners.set(actorKey, owner)
      return { _tag: "owner", owner }
    })

  const finishGenerationState = (actorKey: string, owner: GenerationOwner<Result>) => {
    if (generationOwners.get(actorKey) === owner) generationOwners.delete(actorKey)
    if (liveActors.get(actorKey) === owner.generation) liveActors.delete(actorKey)
    if (deliveredActors.get(actorKey) === owner.generation) deliveredActors.delete(actorKey)
    if (owner.terminal?.status === "cancelled") cancelledActors.delete(actorKey)
    if (!persistentActors.has(actorKey) && !generationOwners.has(actorKey) && !liveActors.has(actorKey)) {
      generationCounters.delete(actorKey)
    }
    Deferred.doneUnsafe(owner.done, Effect.void)
  }

  const finishFork = (actorKey: string, owner: ForkGenerationOwner) =>
    Effect.sync(() => finishGenerationState(actorKey, owner))

  const finishWake = (actorKey: string, owner: WakeGenerationOwner<Result>, result: Exit.Exit<Result>) =>
    Effect.sync(() => {
      Deferred.doneUnsafe(owner.result, Effect.succeed(result))
      finishGenerationState(actorKey, owner)
    })

  const finishForkWork = (actorKey: string, owner: ForkGenerationOwner, lifecycle: "ephemeral" | "persistent") =>
    Effect.sync(() => {
      finishGenerationState(actorKey, owner)
      if (lifecycle === "persistent") return
      forkContexts.delete(actorKey)
      persistentActors.delete(actorKey)
      deliveredActors.delete(actorKey)
      if (!liveActors.has(actorKey)) generationCounters.delete(actorKey)
    })

  const claimTerminal = (
    actorKey: string,
    owner: GenerationOwner<Result>,
    status: TerminalStatus,
    claimant: "turn" | "cancel",
    error?: string,
  ) =>
    Effect.sync(() => {
      if (generationOwners.get(actorKey) !== owner) return false
      if (owner.terminal) return false
      owner.terminal = { status, owner: claimant, ...(error ? { error } : {}) }
      if (status === "cancelled") cancelledActors.add(actorKey)
      return true
    })

  const settleTerminal = (owner: GenerationOwner<Result>) =>
    Deferred.succeed(owner.terminalDone, undefined).pipe(Effect.ignore)

  const acquireCancel = (actorKey: string): Effect.Effect<CancelOwnership<Result>> =>
    Effect.sync(() => {
      if (deliveredActors.has(actorKey) && !persistentActors.has(actorKey)) return { _tag: "noop" }
      const activeEpisode = cancelEpisodes.get(actorKey)
      if (activeEpisode) return { _tag: "follower", episode: activeEpisode }
      const episode = { id: ++cancelEpisodeID.current, done: Deferred.makeUnsafe<void>() }
      cancelEpisodes.set(actorKey, episode)
      const generation = generationOwners.get(actorKey)
      if (!generation || generation.terminal) {
        return { _tag: "owner", episode, generation, claimed: false }
      }
      generation.terminal = { status: "cancelled", owner: "cancel" }
      cancelledActors.add(actorKey)
      return { _tag: "owner", episode, generation, claimed: true }
    })

  const releaseCancel = (actorKey: string, episode: CancelEpisode) =>
    Effect.gen(function* () {
      yield* Effect.sync(() => {
        if (cancelEpisodes.get(actorKey) === episode) cancelEpisodes.delete(actorKey)
      })
      yield* Deferred.succeed(episode.done, undefined).pipe(Effect.ignore)
    })

  const retire = (actorKey: string) =>
    Effect.sync(() => {
      forkContexts.delete(actorKey)
      persistentActors.delete(actorKey)
      deliveredActors.delete(actorKey)
      if (!generationOwners.has(actorKey)) generationCounters.delete(actorKey)
    })

  return {
    key,
    isCancelled: (actorKey: string) => Effect.sync(() => cancelledActors.has(actorKey)),
    retainPersistent: (actorKey: string) => Effect.sync(() => persistentActors.add(actorKey)),
    releasePersistent: (actorKey: string) => Effect.sync(() => persistentActors.delete(actorKey)),
    setForkContext: (actorKey: string, context: ContextValue) => Effect.sync(() => forkContexts.set(actorKey, context)),
    getForkContext: (actorKey: string) => Effect.sync(() => forkContexts.get(actorKey)),
    startFork,
    currentGeneration: (actorKey: string) => Effect.sync(() => generationOwners.get(actorKey)),
    hasGeneration: (actorKey: string) => Effect.sync(() => generationOwners.has(actorKey)),
    isCurrentOpen: (actorKey: string, owner: GenerationOwner<Result>) =>
      Effect.sync(() => generationOwners.get(actorKey) === owner && owner.terminal === undefined),
    acquireWake,
    markDelivered: (actorKey: string, owner: GenerationOwner<Result>) =>
      Effect.sync(() => deliveredActors.set(actorKey, owner.generation)),
    claimTerminal,
    settleTerminal,
    finishFork,
    finishWake,
    finishForkWork,
    acquireCancel,
    releaseCancel,
    retire,
  }
}
