# Dev/Compat CI Trigger Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically run the existing lint, typecheck, and sharded test workflows for pull requests into `dev/compat` and direct synchronization pushes to `dev/compat`.

**Architecture:** Extend only the existing GitHub Actions branch filters, leaving every workflow job and manual-dispatch path unchanged. Deliver the shared policy through fork `main`, then use the authorized direct `main -> dev/compat` synchronization merge so the first `dev/compat` push proves the new trigger against the exact merge SHA.

**Tech Stack:** GitHub Actions YAML, Git, GitHub CLI, ripgrep, jq, Bun/tsgo.

## Global Constraints

- All GitHub commands must explicitly target `onlyfeng/MiMo-Code`; no pull request or push may target `XiaomiMiMo/MiMo-Code`.
- Both event filters in all three workflows must be exactly `branches: [main, dev, dev/compat]`.
- Preserve `workflow_dispatch`, all job definitions, permissions, concurrency, runner versions, commands, and test sharding.
- Do not add branch protection or required checks.
- Do not synchronize newer upstream commits as part of this CI-only change.
- If GitHub Actions or API requests are degraded, preserve the exact SHA and retry after recovery; do not alter workflow definitions to compensate for an external outage.
- If dependencies are missing, use `bun ci`; do not use `bun install` or `npm install`.
- Run package tests and typechecking from `packages/opencode`, never from the repository root.

---

### Task 1: Extend the CI trigger contract

**Files:**
- Modify: `.github/workflows/test.yml:3-8`
- Modify: `.github/workflows/typecheck.yml:3-8`
- Modify: `.github/workflows/lint.yml:3-8`
- Modify: `AGENTS.md:5`
- Test: shell contract assertions; no persistent test file

**Interfaces:**
- Consumes: the approved branch contract in `docs/superpowers/specs/2026-07-22-dev-compat-ci-triggers-design.md`
- Produces: identical `push` and `pull_request` branch filters for `test`, `typecheck`, and `lint`, plus matching repository instructions

- [ ] **Step 1: Run the trigger contract as a RED test**

Run from the repository root:

```bash
set -eu
for file in .github/workflows/test.yml .github/workflows/typecheck.yml .github/workflows/lint.yml; do
  test "$(rg -c '^    branches: \[main, dev, dev/compat\]$' "$file")" -eq 2
  test "$(rg -c '^  workflow_dispatch:$' "$file")" -eq 1
done
rg -x -- '- CI triggers on `main`, `dev`, and `dev/compat` branches\.' AGENTS.md
```

Expected: exit 1 because the current workflow filters contain only `[main, dev]`. This proves the contract check detects the missing branch.

- [ ] **Step 2: Apply the minimal workflow and documentation change**

Replace only the event block in each of `.github/workflows/test.yml`, `.github/workflows/typecheck.yml`, and `.github/workflows/lint.yml` with:

```yaml
on:
  push:
    branches: [main, dev, dev/compat]
  pull_request:
    branches: [main, dev, dev/compat]
  workflow_dispatch:
```

Replace the CI statement in `AGENTS.md` with exactly:

```markdown
- CI triggers on `main`, `dev`, and `dev/compat` branches.
```

- [ ] **Step 3: Re-run the trigger contract as a GREEN test**

Run:

```bash
set -eu
for file in .github/workflows/test.yml .github/workflows/typecheck.yml .github/workflows/lint.yml; do
  test "$(rg -c '^    branches: \[main, dev, dev/compat\]$' "$file")" -eq 2
  test "$(rg -c '^  workflow_dispatch:$' "$file")" -eq 1
done
rg -x -- '- CI triggers on `main`, `dev`, and `dev/compat` branches\.' AGENTS.md
```

Expected: exit 0 with the matching `AGENTS.md` line printed.

- [ ] **Step 4: Verify scope and repository health**

Run:

```bash
git diff --check
git diff -- .github/workflows/test.yml .github/workflows/typecheck.yml .github/workflows/lint.yml AGENTS.md
```

Expected: no whitespace errors; the diff contains six branch-filter additions and one documentation-line replacement, with no job changes.

Run from `packages/opencode`:

```bash
bun typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit the trigger implementation separately from the design documents**

Run:

```bash
git add .github/workflows/test.yml .github/workflows/typecheck.yml .github/workflows/lint.yml AGENTS.md
git diff --cached --check
git commit -m "ci: run checks for dev compat"
```

Expected: one commit containing exactly the three workflow files and `AGENTS.md`.

---

### Task 2: Publish and merge the fork `main` pull request

**Files:**
- No new file changes
- Verify: commits from Task 1 plus the committed design and plan documents

**Interfaces:**
- Consumes: the verified `fix/dev-compat-ci-triggers` branch
- Produces: a merged pull request whose base repository is `onlyfeng/MiMo-Code` and base branch is `main`

- [ ] **Step 1: Reconcile the feature branch with the current fork main**

Run:

```bash
git fetch --no-tags --prune origin
git rebase origin/main
git status --short --branch
git remote get-url --push origin
```

Expected: clean feature branch; push URL is `https://github.com/onlyfeng/MiMo-Code.git`. If the rebase changes commits, repeat Task 1 Step 3 and Step 4 before pushing.

- [ ] **Step 2: Push the feature branch and open a draft PR**

Run:

```bash
git push -u origin fix/dev-compat-ci-triggers
gh pr create -R onlyfeng/MiMo-Code \
  --base main \
  --head fix/dev-compat-ci-triggers \
  --draft \
  --title "ci: run checks for dev compat" \
  --body 'Adds dev/compat to the existing push and pull_request filters for lint, typecheck, and test while retaining main, dev, and workflow_dispatch. Updates AGENTS.md to match. Does not add required checks or change workflow jobs.'
```

Expected: a draft PR URL under `https://github.com/onlyfeng/MiMo-Code/pull/`.

- [ ] **Step 3: Prove PR routing before monitoring checks**

Run:

```bash
PR=$(gh pr view fix/dev-compat-ci-triggers -R onlyfeng/MiMo-Code --json number --jq .number)
gh api "repos/onlyfeng/MiMo-Code/pulls/$PR" --jq '{base_repo: .base.repo.full_name, base_ref: .base.ref, head_ref: .head.ref, draft: .draft}'
```

Expected:

```json
{"base_ref":"main","base_repo":"onlyfeng/MiMo-Code","draft":true,"head_ref":"fix/dev-compat-ci-triggers"}
```

- [ ] **Step 4: Wait for the existing main CI contract**

Run:

```bash
gh pr checks "$PR" -R onlyfeng/MiMo-Code --watch --fail-fast
gh pr checks "$PR" -R onlyfeng/MiMo-Code --json name,state,bucket,link
```

Expected: lint, typecheck, and all four unit-test shards are successful; no failing or pending check remains.

- [ ] **Step 5: Mark the PR ready and squash-merge it**

Run:

```bash
gh pr ready "$PR" -R onlyfeng/MiMo-Code
gh pr merge "$PR" -R onlyfeng/MiMo-Code --squash --delete-branch
gh pr view "$PR" -R onlyfeng/MiMo-Code --json state,mergedAt,mergeCommit,url
```

Expected: state is `MERGED`, `mergedAt` is non-null, and `mergeCommit.oid` identifies the new fork `main` head.

---

### Task 3: Synchronize main into dev/compat and prove automatic CI

**Files:**
- No manual file edits
- Merge: fork `main` into fork `dev/compat`

**Interfaces:**
- Consumes: the merged fork `main` commit from Task 2
- Produces: `origin/dev/compat` containing the CI trigger change and three successful automatic push workflows for its exact merge SHA

- [ ] **Step 1: Fast-forward the local main worktree to the merged PR**

Run in the main linked worktree:

```bash
git switch main
git fetch --no-tags --prune origin
git pull --ff-only origin main
git status --short --branch
```

Expected: local `main` is clean and equals `origin/main`.

- [ ] **Step 2: Merge main into the clean dev/compat worktree**

Run in `/Users/a4399/Documents/ai/onlyfeng/MiMo-Code`:

```bash
git status --short --branch
git fetch --no-tags --prune origin
git merge --no-ff main -m "Merge branch 'main' into dev/compat"
git diff HEAD^1..HEAD --check
```

Expected: a merge commit with first parent equal to the previous `dev/compat` head and second parent equal to the new `main` head; no conflict or whitespace error.

- [ ] **Step 3: Verify the merged compatibility branch locally**

Run from `packages/opencode` in the `dev/compat` worktree:

```bash
bun typecheck
```

Expected: exit 0.

Run from the repository root:

```bash
git status --short --branch
git merge-base --is-ancestor main dev/compat
git diff --check origin/dev/compat..dev/compat
```

Expected: only the new merge is ahead of `origin/dev/compat`; `main` is an ancestor; no whitespace errors.

- [ ] **Step 4: Push only the authorized synchronization merge**

Run:

```bash
git remote get-url --push origin
git push origin dev/compat
DEV_SHA=$(git rev-parse HEAD)
test "$(git ls-remote origin refs/heads/dev/compat | cut -f1)" = "$DEV_SHA"
```

Expected: push URL is `https://github.com/onlyfeng/MiMo-Code.git`, the push succeeds, and the remote SHA equals `DEV_SHA`.

- [ ] **Step 5: Wait for all three automatically triggered push workflows**

Run:

```bash
for attempt in $(seq 1 30); do
  RUNS=$(gh run list -R onlyfeng/MiMo-Code --branch dev/compat --event push --commit "$DEV_SHA" --limit 20 --json databaseId,workflowName,status,conclusion,headSha,url)
  test "$(printf '%s' "$RUNS" | jq '[.[] | .workflowName] | unique | length')" -eq 3 && break
  sleep 10
done
printf '%s' "$RUNS" | jq -e '[.[] | select(.headSha == "'$DEV_SHA'") | select(.workflowName == "test" or .workflowName == "typecheck" or .workflowName == "lint")] | group_by(.workflowName) | map(sort_by(.databaseId) | last) | length == 3'
printf '%s' "$RUNS" | jq -r '.[] | select(.headSha == "'$DEV_SHA'") | .databaseId' | while read -r run_id; do
  gh run watch "$run_id" -R onlyfeng/MiMo-Code --exit-status
done
gh run list -R onlyfeng/MiMo-Code --branch dev/compat --event push --commit "$DEV_SHA" --limit 20 --json databaseId,workflowName,status,conclusion,headSha,url | jq -e '[.[] | select(.headSha == "'$DEV_SHA'") | select(.workflowName == "test" or .workflowName == "typecheck" or .workflowName == "lint")] | group_by(.workflowName) | map(sort_by(.databaseId) | last) | (length == 3 and all(.[]; .status == "completed" and .conclusion == "success"))'
```

Expected: three unique workflows are discovered for the exact `DEV_SHA`, every watched run exits successfully, and the final jq assertion returns `true`.

- [ ] **Step 6: Close out refs and local branch inventory**

Run:

```bash
git fetch --no-tags --prune origin
git status --short --branch
git diff --quiet main origin/main
git diff --quiet dev/compat origin/dev/compat
git merge-base --is-ancestor main dev/compat
git branch --format='%(refname:short)|%(objectname:short)|%(upstream:short)|%(upstream:trackshort)'
```

Expected: both primary branches match their fork refs, `main` is contained in `dev/compat`, both active worktrees are clean, and the remaining local branches are explicitly reported without deleting unrelated user branches.
