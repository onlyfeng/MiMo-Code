# Dev/Compat CI Trigger Coverage Design

## Goal

Ensure every pull request into `dev/compat` and every direct synchronization push to `dev/compat` automatically runs the same lint, typecheck, and sharded test workflows that already protect `main`, while preserving the upstream `dev` branch filters.

## Current State

The fork uses `dev/compat` as its compatibility integration branch, but all three GitHub Actions workflows still inherit the upstream branch filters:

```yaml
push:
  branches: [main, dev]
pull_request:
  branches: [main, dev]
```

The fork currently has no `dev` branch. As a result, feature pull requests targeting `dev/compat` and direct `main -> dev/compat` synchronization pushes do not create checks. Manual dispatch proved that the current synchronized head `6907128e5bd03249128fc4cf748f01b3ca60773c` passes all three workflows, but manual execution does not protect future changes.

## Options Considered

### 1. Continue manual workflow dispatch

This avoids repository changes but depends on a person noticing every untested `dev/compat` update, dispatching three workflows, and matching each run to the correct commit SHA. The historical missed checks demonstrate that this is not a reliable integration gate.

### 2. Add `dev/compat` to existing branch filters

This is the selected approach. It reuses the current workflow jobs without changing their commands, permissions, concurrency, or test sharding. Keeping `dev` in the filters minimizes upstream merge conflicts and preserves upstream behavior if the fork later creates that branch.

### 3. Add branch protection and required checks

Required checks would enforce successful CI before merging, but that is a separate governance decision. It changes repository administration and failure-handling policy beyond the trigger gap, so it is intentionally deferred.

## Workflow Changes

Modify both `push.branches` and `pull_request.branches` in these files:

- `.github/workflows/test.yml`
- `.github/workflows/typecheck.yml`
- `.github/workflows/lint.yml`

Each filter becomes:

```yaml
branches: [main, dev, dev/compat]
```

No job definitions, runner versions, permissions, concurrency groups, test commands, or `workflow_dispatch` behavior change.

The two event filters serve different required paths:

- `pull_request` covers the fork's normal `feature -> dev/compat` integration flow.
- `push` covers the repository's authorized direct `main -> dev/compat` synchronization merge.

## Documentation Change

Update the repository-level `AGENTS.md` statement from “CI triggers on both `main` and `dev` branches” to state that CI triggers on `main`, `dev`, and `dev/compat`. This keeps agent instructions aligned with the actual workflow contract.

## Branch and Delivery Strategy

Create the change from fork `main`, push a feature branch only to `onlyfeng/MiMo-Code`, and open a pull request with base `main`. The pull request must receive the existing `main` checks.

After the pull request is merged, merge fork `main` into `dev/compat` through the normal synchronization flow. The resulting `dev/compat` push must automatically create lint, typecheck, and test runs for the exact merge SHA. No pull request or push may target `XiaomiMiMo/MiMo-Code`.

## Verification

The implementation is accepted only when all of the following hold:

- All six branch-filter entries across the three workflow files contain exactly `main`, `dev`, and `dev/compat`.
- `workflow_dispatch` remains present in all three workflows.
- The only documentation change is the matching CI-trigger statement in `AGENTS.md`.
- `git diff --check` passes.
- `bun typecheck` passes from `packages/opencode`.
- The feature pull request targets `onlyfeng/MiMo-Code:main` and its lint, typecheck, and four test-shard jobs succeed.
- After merging `main -> dev/compat`, GitHub Actions automatically creates successful lint, typecheck, and test runs whose `headSha` equals the new `origin/dev/compat` SHA.
- Both local branch worktrees are clean and match their corresponding fork refs at closeout.

## Failure Handling

If GitHub Actions is degraded, preserve the exact commit SHA and retry after the external incident resolves; do not change workflow definitions to compensate for a service outage. If the new automatic run fails, inspect the failing job logs and fix the demonstrated repository issue before considering the synchronization complete.

## Non-Goals

- Adding or changing branch protection or required checks.
- Removing the upstream `dev` branch filters.
- Changing workflow jobs, test sharding, permissions, or concurrency behavior.
- Synchronizing newer upstream commits as part of this CI-only change.
- Opening a pull request against the upstream Xiaomi repository.
