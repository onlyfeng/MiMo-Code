# Actor Lifecycle Coordinator Design

## Goal

Extract the actor generation, terminal-claim, cancellation-episode, persistent-ownership, and fork-context state machine from `packages/opencode/src/actor/spawn.ts` into one internal coordinator without changing actor behavior, public APIs, storage, notifications, or scheduling.

## Branch and Delivery Strategy

This change branches from `onlyfeng/MiMo-Code:main` and opens a pull request back to the fork's `main` branch. It is not an upstream pull request.

The implementation branch is `refactor/actor-lifecycle-coordinator`. The coordinator is internal to `packages/opencode/src/actor/`; it is not re-exported from an actor package index and does not expand `Actor.Interface`.

The later actor-state truncation cleanup is a separate pull request based on `dev/compat`. It does not stack on this branch.

## Problem

`spawn.ts` currently owns the actor orchestration and the mutable state that linearizes that orchestration:

- fork contexts and persistent-actor membership;
- cancelled, delivered, and live generation markers;
- generation counters and generation owners;
- terminal ownership and terminal-settlement barriers;
- cancellation episodes and their follower barriers.

The individual state transitions are implemented inline and several call sites also mutate the same maps directly. This makes it difficult to review the completed-versus-cancelled race, wake ownership, persistent retirement, and cleanup rules as one state machine. A mechanical file split would preserve the duplication and could separate mutations that must remain atomic.

## Architecture

Add `packages/opencode/src/actor/lifecycle.ts` with a factory that creates one coordinator per `Actor.layer` instance. The factory is generic over the generation result and fork-context value so the module does not import `Actor`, `MessageV2`, or `ForkContext` from `spawn.ts` and cannot introduce an actor-module cycle.

The coordinator owns all lifecycle maps and the cancellation-episode counter. It exposes operations that correspond to the existing synchronous linearization regions rather than exposing the maps:

- form a session-scoped actor key;
- store, read, retain, and retire persistent fork-context ownership;
- start a fork generation;
- atomically acquire a wake as blocked, cancel-episode follower, fork follower, wake follower, or new wake owner;
- inspect whether a generation is still current and unclaimed;
- claim and settle one terminal outcome;
- finish a generation and publish its shared `Exit` before releasing ownership;
- finish ephemeral fork work or retain persistent state;
- atomically acquire cancellation as no-op, episode follower, or episode owner;
- release a cancellation episode and retire actor-lifetime state;
- expose the narrow cancelled/delivered/live queries and mutations required by existing orchestration and watchdog logic.

`spawn.ts` continues to own effects outside this in-memory state machine: session creation, registry writes, durable inbox handling, `SessionRunState`, fibers, task gates, hooks, parent notifications, TUI events, and the stall watchdog. Coordinator operations return Effect values where the current code requires an Effect boundary; each multi-map ownership decision remains one `Effect.sync` section.

## State and Ordering Invariants

The refactor must preserve these invariants exactly:

1. Actor identity remains scoped by both `sessionID` and `actorID`.
2. Generation numbers increase monotonically while an actor has retained lifecycle ownership.
3. Fork and wake followers observe the active generation's completion barrier; wake followers also receive the same terminal-processing `Exit` before a new generation can be acquired.
4. At most one claimant owns a generation's terminal status. A later turn or cancel observes the existing claim and cannot overwrite it.
5. The terminal-settlement barrier completes after registry and notification work associated with the winning claim, including failure paths.
6. A cancel episode has one owner. Concurrent cancellers wait on the same episode barrier, and the barrier is released even when cancellation orchestration defects.
7. A persistent actor retains its fork context and generation counter while idle. An ephemeral actor releases fork context after fork work finishes.
8. Explicit persistent retirement removes fork context, persistent membership, delivered state, and any unowned generation counter.
9. Cancelling the main actor may interrupt its active Runner but must not retire it or write a cancelled tombstone.
10. Delivery and generation cleanup remain ordered so no fiber can observe an owner-less gap before the shared terminal result is published.

## Error and Interruption Handling

The coordinator does not swallow or translate orchestration failures. It only records ownership and completes existing deferred barriers. `spawn.ts` retains the current `Effect.uninterruptible`, `Effect.ensuring`, `Effect.ignoreCause`, and logging boundaries that guarantee cleanup.

Completing an already-settled deferred remains harmless through the existing ignored Effect result. Cancellation episode release and terminal settlement remain finalizers, not best-effort follow-up work.

## Testing Strategy

Use test-driven development for the new module:

1. Add `packages/opencode/test/actor/lifecycle.test.ts` before production code.
2. Observe RED because the coordinator module or wished-for operation is missing.
3. Cover key scoping, monotonic generation ownership, single terminal claim, result-before-release ordering, persistent versus ephemeral cleanup, cancel owner/follower acquisition, episode release, and retirement.
4. Add only the implementation needed to make those tests pass.
5. Run the existing actor integration matrix to prove orchestration behavior is unchanged.

Focused verification from `packages/opencode`:

```bash
bun test test/actor/lifecycle.test.ts test/actor/spawn-lifecycle.test.ts test/actor/spawn-no-deadlock.test.ts test/actor/cancel-notification.test.ts test/actor/cancel-cascade.test.ts test/actor/spawn-notification.test.ts test/actor/stall-watchdog.test.ts test/session/main-lifecycle.test.ts --timeout 30000
bun typecheck
```

Repository verification also includes `git diff --check origin/main...HEAD`. The pull request is published only after the focused tests, typecheck, diff check, and an independent branch review pass.

## Files

- Create `packages/opencode/src/actor/lifecycle.ts`: internal lifecycle coordinator and its ownership result types.
- Modify `packages/opencode/src/actor/spawn.ts`: replace direct lifecycle-map access with coordinator operations while retaining orchestration.
- Create `packages/opencode/test/actor/lifecycle.test.ts`: deterministic unit coverage for the coordinator state machine.
- Add this design and its implementation plan under `docs/superpowers/`.

## Non-Goals

- Changing actor behavior, terminal statuses, registry schemas, inbox payloads, notifications, or public interfaces.
- Moving `runAgentLoop`, `forkWork`, `runPersistentTurn`, cancellation side effects, hooks, task gates, or watchdog orchestration out of `spawn.ts`.
- Editing `session/prompt.ts`, which differs between `main` and `dev/compat`.
- Combining the `dev/compat` actor-state truncation cleanup with this pull request.
- Opening or updating a pull request against `XiaomiMiMo/MiMo-Code`.
