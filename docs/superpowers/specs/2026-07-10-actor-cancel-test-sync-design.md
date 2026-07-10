# Actor Cancel Regression Test Synchronization Design

## Goal

Make the existing `cancel(forced) after the final turn but before delivery settles cancelled` regression test enter the intended pre-delivery cancellation window deterministically, without changing the fork's production cancellation behavior.

## Branch and Delivery Strategy

The affected `packages/opencode/src/actor/spawn.ts` and `packages/opencode/test/actor/spawn.test.ts` blobs are identical on the fork's `main` and `dev/compat` branches. This is shared baseline behavior rather than a compatibility-only change.

The fix therefore branches from the fork's `main` and opens a pull request to `onlyfeng/MiMo-Code:main`. After that PR is merged, `main` is merged into `dev/compat` through the repository's normal synchronization flow.

## Diagnosis

The current regression test starts a background actor and immediately applies a one-second timeout to `Deferred.await(hit)`. That timer includes the full first prompt turn and local test-LLM request. Coverage from a failing run shows that `Actor.cancel` is never executed, proving the failure occurs before the test enters the intended cancellation window.

The custom pause plugin remains correctly wired: another test using the same layer reaches its post-stop pause successfully. The adjacent graceful-cancel test also demonstrates the established event-based synchronization pattern by waiting for `llm.wait(1)` before asserting cancellation behavior.

The fork's production code already contains the cancellation linearization protocol based on `liveActors`, `cancelledActors`, and `deliveredActors`. No production-code adjustment is required for this fork PR.

## Test Change

Modify only `packages/opencode/test/actor/spawn.test.ts`:

1. After spawning the background actor, wait for `llm.wait(1)` so the test does not spend its pre-stop budget waiting for the first model request to begin.
2. Continue using the existing `preStopPause.hit` deferred as the exact condition that identifies the final-turn/pre-delivery window.
3. Replace the three generic timeouts with stage-specific failures for:
   - entering the pre-stop pause;
   - returning from forced cancellation;
   - settling the cancelled outcome after releasing the pause.
4. Keep the existing assertions that both the deferred outcome and ActorRegistry terminal state are `cancelled`.

The change must not weaken the race assertion by removing the pause barrier or by accepting a successful outcome.

## Verification

The implementation is accepted only when all of the following hold:

- The existing focused test is observed failing before the test change.
- The focused test passes repeatedly after event synchronization is added.
- A temporary deliberate mutation of the production delivery/cancellation handshake makes the focused test fail, proving the test still detects the runtime regression; the mutation is then removed.
- The full `packages/opencode/test/actor/spawn.test.ts` file passes.
- Related actor, inbox, prompt, and MaxMode regression tests pass.
- `bun typecheck` passes from `packages/opencode`.
- `git diff --check` passes and the worktree remains free of unrelated changes.

## Upstream Boundary

Current `upstream/main` does not contain this exact regression test and does not contain the fork's cancellation linearization protocol. Static inspection confirms a related upstream runtime gap: cancellation can stamp ActorRegistry as cancelled while delivery subsequently settles the public outcome as success.

That upstream production fix is intentionally outside this pull request. It should be handled as a separate upstream-oriented patch proposal so this fork PR remains a narrow test-reliability correction.

## Non-Goals

- Refactoring `Actor.spawn` or `Actor.cancel` production code.
- Changing timeout behavior in unrelated tests.
- Opening a pull request directly against `XiaomiMiMo/MiMo-Code`.
