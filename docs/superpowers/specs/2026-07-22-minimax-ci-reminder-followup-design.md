# MiniMax CI Reminder Follow-up Design

## Goal

Resolve the actionable Codex review feedback that arrived after PR #42 was already merged. MiniMax-backed sessions must receive the same current CI branch guidance as `AGENTS.md` and the three GitHub Actions workflows, without retaining a duplicate reminder.

## Confirmed Root Cause

`SystemPrompt.provider()` selects `packages/opencode/src/session/prompt/minimax.txt` when the model API ID contains `minimax`. When the agent has no custom prompt, `session/llm.ts` injects this provider prompt into the model system content. Repository instructions from `AGENTS.md` are also added later.

PR #42 updated `AGENTS.md` and the lint, typecheck, and test workflows to include `dev/compat`, but `minimax.txt` still contains two identical lines saying CI runs only on `main` and `dev`. A MiniMax session can therefore receive both the old and current branch guidance in the same request.

The Codex review was submitted after PR #42 had already been squash-merged, so the correction requires a separate follow-up pull request.

## Options Considered

### 1. Update and deduplicate the MiniMax reminder with a regression test

This is the selected approach. Replace the two stale duplicate lines with one current line and add a focused test against the real imported prompt text. The test makes the three required properties explicit: current branches are present, the old sentence is absent, and the reminder occurs once.

### 2. Replace both stale lines without a test

This is the smallest textual diff, but it preserves accidental duplication and provides no durable check against another instruction drift.

### 3. Generate provider guidance dynamically from workflow files

This would create runtime coupling between packaged model prompts and repository-only CI configuration. It is disproportionate to a static repository reminder and could fail in installed distributions where workflow files are unavailable.

## Implementation

Add a narrow test to `packages/opencode/test/session/system.test.ts` that imports the real MiniMax prompt and verifies the exact current sentence:

```text
The default branch in this repo is `main`. CI triggers on `main`, `dev`, and `dev/compat`.
```

The test must also reject the exact old sentence and require a single occurrence of the current reminder. It is written and observed failing before the prompt is changed.

Then replace the two duplicate stale lines in `packages/opencode/src/session/prompt/minimax.txt` with one current line. No provider selection, workflow, agent, or runtime code changes are included.

Historical design and plan documents that quote `[main, dev]` as the pre-fix baseline remain unchanged because they are evidence, not active configuration.

## Verification

From `packages/opencode`:

```bash
bun test test/session/system.test.ts
bun typecheck
```

From the repository worktree:

```bash
git diff --check
rg -nF 'CI triggers on `main` and `dev`.' packages/opencode/src/session/prompt
```

The old-text search must return no matches. A repository-wide consistency check must confirm that `AGENTS.md`, all six workflow branch filters, and the MiniMax reminder name `main`, `dev`, and `dev/compat` correctly.

## Review and Delivery

Create the branch from the latest fork `origin/main`, push only to `onlyfeng/MiMo-Code`, and open a draft pull request targeting fork `main`. The PR body links PR #42 and its late Codex feedback.

After local independent review passes, make the PR reviewable and request Codex review. Reply in the original PR #42 thread with the follow-up PR link, but do not resolve that thread unilaterally.

The follow-up PR must remain unmerged while CI, Codex, and any other requested reviews are pending. This task ends by reporting their exact states to the user; it does not perform squash merge.

## Non-Goals

- Reopening or rewriting PR #42.
- Changing CI workflow behavior or branch protection.
- Refactoring prompt selection or instruction loading.
- Editing historical baseline evidence in prior design or plan documents.
- Syncing `main` into `dev/compat` before the follow-up PR is explicitly approved and merged.
