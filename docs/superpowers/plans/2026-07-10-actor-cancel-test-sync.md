# Actor Cancel Regression Test Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the final-turn forced-cancel regression test enter its pre-delivery race window deterministically while preserving the fork's existing production cancellation behavior.

**Architecture:** Synchronize the background actor test on the local test-LLM request before waiting for the custom pre-stop barrier. Keep the barrier and terminal-state assertions unchanged, add stage-specific timeout errors, and prove the test still detects a deliberately reintroduced delivery/cancellation regression before publishing a PR to the fork's `main` branch.

**Tech Stack:** TypeScript, Bun test runner, Effect 4 beta, Git, GitHub CLI.

## Global Constraints

- Modify production code only temporarily for the deliberate regression check; no production-code change may remain in the commit.
- Run tests and `bun typecheck` from `packages/opencode`, never from the repository root.
- The pull request must target `onlyfeng/MiMo-Code:main` from `fix/actor-cancel-test-sync`.
- After the PR is merged, synchronize fork `main` into `dev/compat`; do not put a direct test-only commit onto `dev/compat`.
- Do not open a pull request against `XiaomiMiMo/MiMo-Code`.

---

### Task 1: Synchronize and diagnose the final-turn cancel regression test

**Files:**
- Modify: `packages/opencode/test/actor/spawn.test.ts:524`
- Temporarily mutate and restore: `packages/opencode/src/actor/spawn.ts:548`
- Reference: `docs/superpowers/specs/2026-07-10-actor-cancel-test-sync-design.md`

**Interfaces:**
- Consumes: `TestLLMServer.wait(count: number)`, `preStopPause.hit`, `Actor.cancel(sessionID, actorID, "forced")`, and `SpawnResult.outcome`.
- Produces: A deterministic regression test that reaches the final-turn/pre-delivery pause and emits a distinct error for each timed stage.

- [ ] **Step 1: Confirm the existing RED baseline**

Run from `packages/opencode`:

```bash
bun test test/actor/spawn.test.ts --test-name-pattern 'cancel\(forced\) after the final turn but before delivery settles cancelled'
```

Expected: FAIL with `TimeoutError` before any `Actor.cancel` code is executed.

- [ ] **Step 2: Add event synchronization and stage-specific timeout errors**

In `packages/opencode/test/actor/spawn.test.ts`, replace the three generic timed waits in the focused test with the following sequence:

```ts
yield* llm.wait(1)
yield* Deferred.await(hit).pipe(
  Effect.timeoutOrElse({
    duration: "1 second",
    orElse: () => Effect.fail(new Error("timed out waiting for actor.preStop pause")),
  }),
)
expect((yield* reg.get(result.sessionID, result.actorID))?.lastOutcome).toBe("success")

yield* actor.cancel(result.sessionID, result.actorID, "forced").pipe(
  Effect.timeoutOrElse({
    duration: "1 second",
    orElse: () => Effect.fail(new Error("timed out waiting for forced actor cancellation")),
  }),
)
yield* Deferred.succeed(release, undefined)

const outcome = yield* Deferred.await(result.outcome).pipe(
  Effect.timeoutOrElse({
    duration: "1 second",
    orElse: () => Effect.fail(new Error("timed out waiting for cancelled actor outcome")),
  }),
)
expect(outcome.status).toBe("cancelled")
expect((yield* reg.get(result.sessionID, result.actorID))?.lastOutcome).toBe("cancelled")
```

- [ ] **Step 3: Verify the focused test is GREEN repeatedly**

Run from `packages/opencode`:

```bash
for i in 1 2 3; do
  bun test test/actor/spawn.test.ts --test-name-pattern 'cancel\(forced\) after the final turn but before delivery settles cancelled'
done
```

Expected: all three runs report `1 pass`, `0 fail`.

- [ ] **Step 4: Prove the test detects the production regression**

Temporarily change the delivery decision inside `packages/opencode/src/actor/spawn.ts` from:

```ts
const delivery = yield* Effect.sync(() => {
  deliveredActors.add(key)
  return cancelledActors.has(key) ? "cancelled" as const : "success" as const
})
```

to:

```ts
const delivery = yield* Effect.sync(() => {
  deliveredActors.add(key)
  return "success" as const
})
```

Run from `packages/opencode`:

```bash
bun test test/actor/spawn.test.ts --test-name-pattern 'cancel\(forced\) after the final turn but before delivery settles cancelled'
```

Expected: FAIL because `outcome.status` is `success` instead of `cancelled`.

- [ ] **Step 5: Restore production behavior and re-run the focused test**

Restore the exact production expression:

```ts
return cancelledActors.has(key) ? "cancelled" as const : "success" as const
```

Run from `packages/opencode`:

```bash
bun test test/actor/spawn.test.ts --test-name-pattern 'cancel\(forced\) after the final turn but before delivery settles cancelled'
```

Expected: `1 pass`, `0 fail`, and `git diff -- packages/opencode/src/actor/spawn.ts` produces no output.

- [ ] **Step 6: Run actor and fork-agent regression coverage**

Run from `packages/opencode`:

```bash
bun test test/actor/spawn.test.ts test/actor/spawn-notification.test.ts test/inbox/fork-agent-compat.test.ts
```

Expected: all non-skipped tests pass with zero failures.

- [ ] **Step 7: Run prompt and MaxMode regression coverage**

Run from `packages/opencode`:

```bash
bun test test/session/max-mode.test.ts test/session/prompt-effect.test.ts
```

Expected: all non-skipped tests pass with zero failures.

- [ ] **Step 8: Run static verification**

Run from `packages/opencode`:

```bash
bun typecheck
```

Run from the repository root:

```bash
bunx oxlint packages/opencode/test/actor/spawn.test.ts
git diff --check
git status --short
```

Expected: typecheck and oxlint exit successfully; diff check emits no output; status shows only the intended test-file change.

- [ ] **Step 9: Commit the implementation**

```bash
git add packages/opencode/test/actor/spawn.test.ts
git commit -m "test(actor): synchronize final-turn cancel regression"
```

Expected: commit contains only `packages/opencode/test/actor/spawn.test.ts`.

---

### Task 2: Publish the fork main pull request

**Files:**
- No additional file changes.
- Verify commits: design, implementation plan, and test synchronization.

**Interfaces:**
- Consumes: verified branch `fix/actor-cancel-test-sync` based on fork `main`.
- Produces: A draft pull request whose base repository is `onlyfeng/MiMo-Code` and base branch is `main`.

- [ ] **Step 1: Verify branch scope before publishing**

```bash
git status --short --branch
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
```

Expected: clean worktree; exactly the design, plan, and test commits are ahead of `origin/main`; no production source file remains changed.

- [ ] **Step 2: Push the feature branch to the fork**

```bash
git push -u origin fix/actor-cancel-test-sync
```

Expected: `origin/fix/actor-cancel-test-sync` is created in `onlyfeng/MiMo-Code`.

- [ ] **Step 3: Create a draft pull request against fork main**

```bash
gh pr create -R onlyfeng/MiMo-Code \
  --base main \
  --head fix/actor-cancel-test-sync \
  --draft \
  --title "test(actor): synchronize final-turn cancel regression" \
  --body $'## Summary\n- synchronize the final-turn forced-cancel regression on the first test-LLM request\n- report preStop, cancel, and outcome timeout stages distinctly\n- preserve the existing fork cancellation implementation\n\n## Verification\n- focused test repeated three times\n- deliberate regression mutation fails as expected\n- actor, inbox, prompt, and MaxMode regressions\n- bun typecheck and touched-file oxlint'
```

Expected: GitHub returns a pull request URL under `https://github.com/onlyfeng/MiMo-Code/pull/`.

- [ ] **Step 4: Verify pull request routing explicitly**

```bash
pr=$(gh pr view fix/actor-cancel-test-sync -R onlyfeng/MiMo-Code --json number -q .number)
gh api "repos/onlyfeng/MiMo-Code/pulls/$pr" --jq '{repo: .base.repo.full_name, base: .base.ref, head: .head.ref, draft: .draft}'
```

Expected:

```json
{"repo":"onlyfeng/MiMo-Code","base":"main","head":"fix/actor-cancel-test-sync","draft":true}
```

- [ ] **Step 5: Record the post-merge synchronization action**

Do not merge within this task. Report that after approval and merge of this PR, the required follow-up is the standard verified `main -> dev/compat` synchronization so both branches retain identical actor test behavior.
