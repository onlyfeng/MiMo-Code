# MiniMax CI Reminder Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the MiniMax system prompt state the current `main`, `dev`, and `dev/compat` CI branch contract exactly once, with a regression test that prevents renewed drift.

**Architecture:** Test the real imported `minimax.txt` asset because the defect is static model-visible prompt content, not provider selection logic. Replace the duplicate stale reminders with one current sentence and leave workflows, provider routing, and historical baseline documents unchanged.

**Tech Stack:** Bun test runner, TypeScript, text-loader imports, Git, GitHub Actions.

## Global Constraints

- Work from the latest fork `origin/main` on `agent/minimax-ci-reminder`.
- Push and create a pull request only in `onlyfeng/MiMo-Code`; never target `XiaomiMiMo/MiMo-Code`.
- Run tests and typecheck from `packages/opencode`, never the repository root.
- Install dependencies only with `bun ci` if required; do not mutate `bun.lock`.
- Do not modify workflow behavior, branch protection, provider selection, or historical baseline evidence.
- Reply to PR #42 with the follow-up PR link, but do not resolve its review thread unilaterally.
- Do not squash merge. Stop after exact-SHA CI, Codex review, and other requested reviews have been inspected and report their states to the user.

---

### Task 1: Correct and protect the MiniMax CI reminder

**Files:**
- Modify: `packages/opencode/test/session/system.test.ts`
- Modify: `packages/opencode/src/session/prompt/minimax.txt:126-127`

**Interfaces:**
- Consumes: Bun's existing `.txt` import support and the real `PROMPT_MINIMAX` asset selected by `SystemPrompt.provider()`.
- Produces: One exact model-visible CI sentence naming `main`, `dev`, and `dev/compat`, plus a regression test that rejects the old sentence and duplicates.

- [ ] **Step 1: Add the real prompt import and failing regression test**

Add this import beside the existing `SystemPrompt` import:

```ts
import PROMPT_MINIMAX from "../../src/session/prompt/minimax.txt"
```

Add this test as the first test inside `describe("session.system", ...)`:

```ts
test("keeps MiniMax CI branch guidance current and singular", () => {
  const current = "The default branch in this repo is `main`. CI triggers on `main`, `dev`, and `dev/compat`."
  const legacy = "The default branch in this repo is `main`. CI triggers on `main` and `dev`."

  expect(PROMPT_MINIMAX).toContain(current)
  expect(PROMPT_MINIMAX).not.toContain(legacy)
  expect(PROMPT_MINIMAX.split(current)).toHaveLength(2)
})
```

- [ ] **Step 2: Run the focused test and record RED**

Run from `packages/opencode`:

```bash
bun test test/session/system.test.ts -t "keeps MiniMax CI branch guidance current and singular"
```

Expected: one failing test because `PROMPT_MINIMAX` does not contain the current three-branch sentence.

- [ ] **Step 3: Replace both stale duplicate reminders with one current reminder**

In `packages/opencode/src/session/prompt/minimax.txt`, replace lines 126-127 with exactly:

```text
- The default branch in this repo is `main`. CI triggers on `main`, `dev`, and `dev/compat`.
```

- [ ] **Step 4: Run focused and file-level tests and record GREEN**

Run from `packages/opencode`:

```bash
bun test test/session/system.test.ts -t "keeps MiniMax CI branch guidance current and singular"
bun test test/session/system.test.ts
```

Expected: the focused test passes, then all tests in `system.test.ts` pass with zero failures.

- [ ] **Step 5: Run type and repository consistency verification**

Run from `packages/opencode`:

```bash
bun typecheck
```

Run from the worktree root:

```bash
git diff --check
test -z "$(rg -nF 'CI triggers on `main` and `dev`.' packages/opencode/src/session/prompt || true)"
rg -n 'CI triggers|branches: \[main, dev, dev/compat\]' AGENTS.md .github/workflows packages/opencode/src/session/prompt/minimax.txt
```

Expected: typecheck and diff-check exit zero, the legacy search is empty, and the consistency search shows the current three-branch contract in `AGENTS.md`, six workflow filters, and MiniMax once.

- [ ] **Step 6: Commit the tested fix**

```bash
git add packages/opencode/test/session/system.test.ts packages/opencode/src/session/prompt/minimax.txt
git commit -m "fix(ci): align minimax branch reminder"
```

Expected: the commit contains only the test and MiniMax prompt asset.

---

### Task 2: Review and publish the unmerged follow-up

**Files:**
- Inspect: `docs/superpowers/specs/2026-07-22-minimax-ci-reminder-followup-design.md`
- Inspect: `docs/superpowers/plans/2026-07-22-minimax-ci-reminder-followup.md`
- Inspect: `packages/opencode/test/session/system.test.ts`
- Inspect: `packages/opencode/src/session/prompt/minimax.txt`

**Interfaces:**
- Consumes: the verified Task 1 commit and fork repository `onlyfeng/MiMo-Code`.
- Produces: a reviewable draft PR targeting fork `main`, a traceable reply on PR #42, and exact review/CI status evidence without merging.

- [ ] **Step 1: Request independent local review**

Dispatch a read-only reviewer over `origin/main..HEAD`. Require it to verify the Codex feedback, exact prompt wording, singular occurrence, test quality, scope, and the prohibition on merge.

Expected: no Critical or Important findings. Address and re-review any such findings before publishing.

- [ ] **Step 2: Verify publish scope and push only the feature branch**

```bash
git status --short --branch
git diff --check origin/main..HEAD
git diff --stat origin/main..HEAD
git push -u origin agent/minimax-ci-reminder
```

Expected: the worktree is clean, the range contains only the design, plan, test, and MiniMax prompt files, and the push targets `onlyfeng/MiMo-Code`.

- [ ] **Step 3: Open a draft PR against fork main**

Create the draft PR in `onlyfeng/MiMo-Code` with base `main`, head `agent/minimax-ci-reminder`, and a body that links PR #42, explains that Codex feedback arrived after merge, summarizes RED-GREEN evidence, and lists verification commands.

Expected: the PR repository is `onlyfeng/MiMo-Code`, base is `main`, head SHA equals local `HEAD`, and `isDraft` is true.

- [ ] **Step 4: Make the verified PR reviewable and request Codex review**

After confirming the pushed SHA and draft metadata, mark the PR ready for review and add the top-level comment:

```text
@codex review
```

Reply in PR #42's original inline thread with the new PR URL and state that the corrective PR remains unmerged pending review. Do not resolve the original thread.

- [ ] **Step 5: Inspect all checks and reviews for the exact head SHA**

Use GitHub metadata plus thread-aware GraphQL reads to inspect:

- lint, typecheck, and all four test shards;
- Codex review submission and any inline threads;
- other requested reviewers and review decisions;
- exact `headSha` equality for every relevant check.

Expected: report actual pending/success/failure states. Even if everything passes, do not merge; return control to the user for explicit merge authorization.
