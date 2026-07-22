# Actor Lifecycle Coordinator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Move the in-memory actor lifecycle state machine out of spawn.ts without changing actor behavior or public interfaces.

**Architecture:** Add one generic coordinator created inside each Actor.layer instance. It owns lifecycle maps and exposes atomic Effect operations for generation, terminal, wake, cancellation, persistent ownership, and fork-context transitions; spawn.ts retains all orchestration and durable side effects.

**Tech Stack:** TypeScript, Bun test, Effect Deferred/Effect/Exit, existing Actor integration tests.

## Global Constraints

- Base and PR target are onlyfeng/MiMo-Code:main; do not target XiaomiMiMo/MiMo-Code.
- Do not change Actor.Interface, registry schemas, inbox payloads, notifications, scheduling, or task/hook behavior.
- Do not modify packages/opencode/src/session/prompt.ts, packages/sdk, bun.lock, or unrelated files.
- Keep registry, inbox, notification, fiber, runPersistentTurn, cancellation-side-effect, and watchdog orchestration in packages/opencode/src/actor/spawn.ts.
- All multi-map ownership decisions remain one Effect.sync operation.
- Main actor cancellation must not retire main or write a cancelled tombstone.
- Persistent actors retain fork context and generation numbering while idle; ephemeral actors release both after fork completion.
- Run Bun tests and typecheck only from packages/opencode.
- Install dependencies only with bun ci; never use bun install or npm install.

---

### Task 1: Add the lifecycle coordinator with state-machine tests

**Files:**
- Create: packages/opencode/test/actor/lifecycle.test.ts
- Create: packages/opencode/src/actor/lifecycle.ts

**Interfaces:**
- Produces: createActorLifecycle<Result, ContextValue>()
- Produces: TerminalStatus, GenerationOwner<Result>, ForkGenerationOwner, WakeGenerationOwner<Result>, CancelEpisode, WakeOwnership<Result>, and CancelOwnership<Result>
- The coordinator methods are key, isCancelled, retainPersistent, releasePersistent, setForkContext, getForkContext, startFork, currentGeneration, hasGeneration, isCurrentOpen, acquireWake, markDelivered, claimTerminal, settleTerminal, finishGeneration, finishForkWork, acquireCancel, releaseCancel, and retire.

- [ ] **Step 1: Write the failing lifecycle tests**

Create packages/opencode/test/actor/lifecycle.test.ts with the following tests:

~~~typescript
import { describe, expect, test } from "bun:test"
import { Deferred, Effect, Exit } from "effect"
import { SessionID } from "../../src/session/schema"
import { createActorLifecycle } from "../../src/actor/lifecycle"

const run = Effect.runPromise

describe("actor lifecycle coordinator", () => {
  test("keys include both the session and actor identity", () => {
    const lifecycle = createActorLifecycle<string, string>()
    const first = lifecycle.key(SessionID.make("session-a"), "actor")
    const second = lifecycle.key(SessionID.make("session-b"), "actor")

    expect(first).toBe("session-a:actor")
    expect(second).toBe("session-b:actor")
    expect(first).not.toBe(second)
  })

  test("publishes a wake result before releasing generation followers", async () => {
    const lifecycle = createActorLifecycle<string, string>()
    const key = lifecycle.key(SessionID.make("session"), "actor")
    await run(lifecycle.retainPersistent(key))

    const ownership = await run(lifecycle.acquireWake(key))
    expect(ownership._tag).toBe("owner")
    if (ownership._tag !== "owner") throw new Error("expected wake owner")

    const follower = await run(lifecycle.acquireWake(key))
    expect(follower._tag).toBe("follower")
    if (follower._tag !== "follower") throw new Error("expected wake follower")

    await run(lifecycle.finishGeneration(key, ownership.owner, Exit.succeed("done")))

    expect(await run(Deferred.isDone(follower.active.result))).toBe(true)
    expect(await run(Deferred.isDone(follower.active.done))).toBe(true)
    const result = await run(Deferred.await(follower.active.result))
    expect(Exit.isSuccess(result) ? result.value : undefined).toBe("done")
  })

  test("allows exactly one terminal claimant and clears cancellation with its generation", async () => {
    const lifecycle = createActorLifecycle<string, string>()
    const key = lifecycle.key(SessionID.make("session"), "actor")
    const owner = await run(lifecycle.startFork(key))

    expect(await run(lifecycle.claimTerminal(key, owner, "cancelled", "cancel"))).toBe(true)
    expect(await run(lifecycle.claimTerminal(key, owner, "completed", "turn"))).toBe(false)
    expect(await run(lifecycle.isCancelled(key))).toBe(true)

    await run(lifecycle.settleTerminal(owner))
    expect(await run(Deferred.isDone(owner.terminalDone))).toBe(true)
    await run(lifecycle.finishGeneration(key, owner))
    expect(await run(lifecycle.isCancelled(key))).toBe(false)
  })

  test("retains persistent context and numbering but releases ephemeral ownership", async () => {
    const lifecycle = createActorLifecycle<string, string>()
    const persistent = lifecycle.key(SessionID.make("session"), "persistent")
    await run(lifecycle.retainPersistent(persistent))
    await run(lifecycle.setForkContext(persistent, "persistent-context"))
    const first = await run(lifecycle.startFork(persistent))
    await run(lifecycle.finishForkWork(persistent, first, "persistent"))

    expect(await run(lifecycle.getForkContext(persistent))).toBe("persistent-context")
    const wake = await run(lifecycle.acquireWake(persistent))
    expect(wake._tag).toBe("owner")
    if (wake._tag !== "owner") throw new Error("expected persistent wake owner")
    expect(wake.owner.generation).toBe(2)
    await run(lifecycle.finishGeneration(persistent, wake.owner, Exit.succeed("done")))
    await run(lifecycle.retire(persistent))
    expect(await run(lifecycle.getForkContext(persistent))).toBeUndefined()
    expect((await run(lifecycle.startFork(persistent))).generation).toBe(1)

    const ephemeral = lifecycle.key(SessionID.make("session"), "ephemeral")
    await run(lifecycle.setForkContext(ephemeral, "ephemeral-context"))
    const ephemeralOwner = await run(lifecycle.startFork(ephemeral))
    await run(lifecycle.finishForkWork(ephemeral, ephemeralOwner, "ephemeral"))
    expect(await run(lifecycle.getForkContext(ephemeral))).toBeUndefined()
    expect((await run(lifecycle.startFork(ephemeral))).generation).toBe(1)
  })

  test("serializes cancel owners and followers and preserves delivered no-op behavior", async () => {
    const lifecycle = createActorLifecycle<string, string>()
    const key = lifecycle.key(SessionID.make("session"), "persistent")
    await run(lifecycle.retainPersistent(key))
    const generation = await run(lifecycle.startFork(key))

    const owner = await run(lifecycle.acquireCancel(key))
    expect(owner._tag).toBe("owner")
    if (owner._tag !== "owner") throw new Error("expected cancel owner")
    expect(owner.claimed).toBe(true)

    const follower = await run(lifecycle.acquireCancel(key))
    expect(follower._tag).toBe("follower")
    if (follower._tag !== "follower") throw new Error("expected cancel follower")
    expect(follower.episode).toBe(owner.episode)

    await run(lifecycle.releaseCancel(key, owner.episode))
    expect(await run(Deferred.isDone(follower.episode.done))).toBe(true)
    await run(lifecycle.settleTerminal(generation))
    await run(lifecycle.finishGeneration(key, generation))

    const deliveredKey = lifecycle.key(SessionID.make("session"), "ephemeral")
    const delivered = await run(lifecycle.startFork(deliveredKey))
    await run(lifecycle.markDelivered(deliveredKey, delivered))
    expect((await run(lifecycle.acquireCancel(deliveredKey)))._tag).toBe("noop")
  })
})
~~~

- [ ] **Step 2: Run the test and verify RED**

Run from packages/opencode:

~~~bash
bun test test/actor/lifecycle.test.ts
~~~

Expected: FAIL because ../../src/actor/lifecycle cannot be resolved. A syntax error or unrelated dependency failure is not an acceptable RED result.

- [ ] **Step 3: Implement the minimal coordinator**

Create packages/opencode/src/actor/lifecycle.ts:

~~~typescript
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

  const key = (sessionID: SessionID, actorID: string) => sessionID + ":" + actorID
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

  const finishGeneration = (
    actorKey: string,
    owner: GenerationOwner<Result>,
    result?: Exit.Exit<Result>,
  ) =>
    Effect.sync(() => {
      if (owner.kind === "wake" && result) Deferred.doneUnsafe(owner.result, Effect.succeed(result))
      if (generationOwners.get(actorKey) === owner) generationOwners.delete(actorKey)
      if (liveActors.get(actorKey) === owner.generation) liveActors.delete(actorKey)
      if (deliveredActors.get(actorKey) === owner.generation) deliveredActors.delete(actorKey)
      if (owner.terminal?.status === "cancelled") cancelledActors.delete(actorKey)
      if (!persistentActors.has(actorKey) && !generationOwners.has(actorKey) && !liveActors.has(actorKey)) {
        generationCounters.delete(actorKey)
      }
      Deferred.doneUnsafe(owner.done, Effect.void)
    })

  const finishForkWork = (
    actorKey: string,
    owner: ForkGenerationOwner,
    lifecycle: "ephemeral" | "persistent",
  ) =>
    Effect.gen(function* () {
      yield* finishGeneration(actorKey, owner)
      if (lifecycle === "persistent") return
      yield* Effect.sync(() => {
        forkContexts.delete(actorKey)
        persistentActors.delete(actorKey)
        if (!liveActors.has(actorKey)) generationCounters.delete(actorKey)
      })
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
    setForkContext: (actorKey: string, context: ContextValue) =>
      Effect.sync(() => forkContexts.set(actorKey, context)),
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
    finishGeneration,
    finishForkWork,
    acquireCancel,
    releaseCancel,
    retire,
  }
}
~~~

- [ ] **Step 4: Run the coordinator tests and verify GREEN**

Run from packages/opencode:

~~~bash
bun test test/actor/lifecycle.test.ts
~~~

Expected: 5 pass, 0 fail, with no warnings or unhandled errors.

- [ ] **Step 5: Run typecheck for the new public-internal types**

Run from packages/opencode:

~~~bash
bun typecheck
~~~

Expected: exit 0.

- [ ] **Step 6: Commit the coordinator**

~~~bash
git add packages/opencode/src/actor/lifecycle.ts packages/opencode/test/actor/lifecycle.test.ts
git commit -m "refactor(actor): add lifecycle coordinator"
~~~

### Task 2: Route spawn orchestration through the coordinator

**Files:**
- Modify: packages/opencode/src/actor/spawn.ts

**Interfaces:**
- Consumes: createActorLifecycle<MessageV2.WithParts, ForkContext>()
- Consumes: GenerationOwner<MessageV2.WithParts>, ForkGenerationOwner, and TerminalStatus
- Produces: the unchanged Actor.Interface service.

- [ ] **Step 1: Import and instantiate the coordinator**

Add this import:

~~~typescript
import {
  createActorLifecycle,
  type ForkGenerationOwner,
  type GenerationOwner,
  type TerminalStatus,
} from "@/actor/lifecycle"
~~~

Replace the lifecycle maps, inline owner types, counter, actorKey, and helper functions near the start of Actor.layer with:

~~~typescript
const lifecycleState = createActorLifecycle<MessageV2.WithParts, ForkContext>()
const actorKey = lifecycleState.key
const isCancelled = (sessionID: SessionID, actorID: string) =>
  lifecycleState.isCancelled(actorKey(sessionID, actorID))
~~~

Change forkWork input.generation and abortSetup owner to ForkGenerationOwner. Other orchestration values that accept either owner kind use GenerationOwner<MessageV2.WithParts>.

- [ ] **Step 2: Replace fork-generation and actor-lifetime map access**

Use these exact coordinator operations:

~~~typescript
yield* lifecycleState.retainPersistent(key)
const generation = yield* lifecycleState.startFork(key)
yield* lifecycleState.setForkContext(key, input.forkContext)
yield* lifecycleState.markDelivered(key, input.generation)
yield* lifecycleState.finishForkWork(key, input.generation, input.lifecycle)
yield* lifecycleState.retire(key)
~~~

Replace all inline claim/settle/finish calls with lifecycleState.claimTerminal, lifecycleState.settleTerminal, and lifecycleState.finishGeneration. Preserve their current ordering relative to registry writes, notifications, Deferred outcome completion, and finalizers.

The spawn-setup failure path remains:

~~~typescript
if (yield* lifecycleState.claimTerminal(key, owner, "failed", "turn", error)) {
  yield* actorReg
    .updateStatus(sessionID, actorID, {
      status: "idle",
      lastOutcome: "failure",
      lastError: error,
    })
    .pipe(Effect.ignoreCause)
}
yield* lifecycleState.settleTerminal(owner)
yield* lifecycleState.finishGeneration(key, owner)
yield* lifecycleState.retire(key)
~~~

- [ ] **Step 3: Replace wake ownership with one atomic coordinator call**

The non-persistent fallback reads lifecycleState.currentGeneration(key).

For a persistent actor already carrying a cancelled terminal row, call lifecycleState.releasePersistent(key) before interrupting. For active persistent actors, call lifecycleState.retainPersistent(key).

Replace the entire multi-map wake acquisition Effect.sync block with:

~~~typescript
const ownership = yield* lifecycleState.acquireWake(key)
~~~

Keep the existing blocked, episode, fork, follower, and owner branches. The follower branch reads ownership.active.result without a non-null assertion because the discriminated type is a WakeGenerationOwner.

Before starting guarded work, replace the generation-owner comparison with:

~~~typescript
if (!(yield* lifecycleState.isCurrentOpen(key, owner))) return yield* Effect.interrupt
~~~

Compute the cancellation component of terminal status with:

~~~typescript
const cancelled =
  !effectFailure &&
  !assistantFailure &&
  ((yield* lifecycleState.isCancelled(key)) || (Exit.isFailure(result) && Cause.hasInterruptsOnly(result.cause)))
~~~

Finish a wake by passing terminalResult to lifecycleState.finishGeneration before returning or failing exactly as the current code does.

- [ ] **Step 4: Replace cancel ownership with one atomic coordinator call**

Replace the cancel ownership Effect.sync block with:

~~~typescript
const ownership = yield* lifecycleState.acquireCancel(key)
~~~

Keep the no-op and follower behavior unchanged. Replace the local releaseEpisode and retire Effects with:

~~~typescript
const releaseEpisode = lifecycleState.releaseCancel(key, ownership.episode)
const retire = lifecycleState.retire(key)
const settleClaim =
  ownership.claimed && ownership.generation
    ? lifecycleState.settleTerminal(ownership.generation)
    : Effect.void
~~~

Replace the live generation query with:

~~~typescript
const live = yield* lifecycleState.hasGeneration(key)
~~~

Do not move any child cascade, registry lookup, Runner cancellation, inbox drain, terminal notification, main-mode guard, uninterruptible region, or ensuring finalizer into lifecycle.ts.

- [ ] **Step 5: Replace fork-context reads and confirm no lifecycle maps remain**

Implement getForkContext with:

~~~typescript
const getForkContext = Effect.fn("Actor.getForkContext")(function* (sessionID: SessionID, actorID: string) {
  return yield* lifecycleState.getForkContext(actorKey(sessionID, actorID))
})
~~~

Run:

~~~bash
rg -n "forkContexts|cancelledActors|deliveredActors|liveActors|generationCounters|persistentActors|generationOwners|cancelEpisodes|cancelEpisodeID" packages/opencode/src/actor/spawn.ts
~~~

Expected: no matches. Mentions inside lifecycle.ts are expected.

- [ ] **Step 6: Run focused coordinator and actor integration tests**

Run from packages/opencode:

~~~bash
bun test test/actor/lifecycle.test.ts test/actor/spawn-lifecycle.test.ts test/actor/spawn-no-deadlock.test.ts test/actor/cancel-notification.test.ts test/actor/cancel-cascade.test.ts test/actor/spawn-notification.test.ts test/actor/stall-watchdog.test.ts test/session/main-lifecycle.test.ts --timeout 30000
~~~

Expected: 48 pass, 0 fail. In particular, preserve the existing assertions for main cancellation without a tombstone, completed-versus-cancelled ownership, lost-wake retry, persistent fork-context retention, ephemeral cleanup, cancel episode release, and watchdog visibility of wake generations.

- [ ] **Step 7: Run typecheck**

Run from packages/opencode:

~~~bash
bun typecheck
~~~

Expected: exit 0.

- [ ] **Step 8: Commit the spawn integration**

~~~bash
git add packages/opencode/src/actor/spawn.ts
git commit -m "refactor(actor): centralize lifecycle state"
~~~

### Task 3: Verify the complete PR branch

**Files:**
- Verify only; no new files or behavior.

**Interfaces:**
- Consumes: the complete branch diff from origin/main.
- Produces: fresh evidence suitable for PR publication.

- [ ] **Step 1: Inspect scope**

~~~bash
git status --short --branch
git diff --stat origin/main...HEAD
git diff --name-only origin/main...HEAD
~~~

Expected changed paths only:

~~~text
docs/superpowers/plans/2026-07-22-actor-lifecycle-coordinator.md
docs/superpowers/specs/2026-07-22-actor-lifecycle-coordinator-design.md
packages/opencode/src/actor/lifecycle.ts
packages/opencode/src/actor/spawn.ts
packages/opencode/test/actor/lifecycle.test.ts
~~~

- [ ] **Step 2: Run fresh final verification**

Run from packages/opencode:

~~~bash
bun test test/actor/lifecycle.test.ts test/actor/spawn-lifecycle.test.ts test/actor/spawn-no-deadlock.test.ts test/actor/cancel-notification.test.ts test/actor/cancel-cascade.test.ts test/actor/spawn-notification.test.ts test/actor/stall-watchdog.test.ts test/session/main-lifecycle.test.ts --timeout 30000
bun typecheck
~~~

Run from the worktree root:

~~~bash
git diff --check origin/main...HEAD
~~~

Expected: tests and typecheck exit 0, and git diff --check prints nothing.

- [ ] **Step 3: Review the complete branch**

Generate a review package:

~~~bash
/Users/a4399/.codex/plugins/cache/openai-curated-remote/superpowers/6.1.1/skills/subagent-driven-development/scripts/review-package origin/main HEAD
~~~

Pass the printed package path, this plan path, and the design-spec path to an independent reviewer. Require separate specification-compliance and code-quality verdicts. Resolve every Critical or Important finding and rerun its named covering tests before publishing.

- [ ] **Step 4: Publish the fork PR**

Push the branch:

~~~bash
git push -u origin refactor/actor-lifecycle-coordinator
~~~

Open a draft pull request in onlyfeng/MiMo-Code against main titled:

~~~text
refactor(actor): extract lifecycle coordination state
~~~

The PR body must summarize the behavior-preserving extraction, list the invariants protected, state that no public API or behavior changed, and include the exact test and typecheck commands used.
