# Upstream synchronization — 2026-11-18

## Scope and baseline

Full live synchronization of `upstream/main -> main -> dev/compat`. Branch-only fetches on 2026-11-18 selected `53e481145a6abedae20346ad2cdccdaee299a699`. The previous review ended at `c34db3645db4ffdf7f2b29a788bd76d9ec3be531`, so the audit covers one commit and eight paths. Starting fork tips were `4f33166e17df59299c2e2ea16396525d0ef0740e` and `b6c4bc8d036a7d4f4b9d464d2c8214b3f8448c2f`. The original checkout was clean on `dev/compat`. A dedicated Git worktree housed the two operation-owned integration branches and the frozen-lock installation.

## Capability inventory (1)

| ID | Selected behavior and test paths | Fork counterparts and owners | Disposition |
| --- | --- | --- | --- |
| C01 | Reset the process-wide memory root and SQLite FTS rows before each test and after instance disposal in the four affected files under `packages/cli/test/memory` and in `test/tool/memory.test.ts`. Document how to set up shared process state in `test/AGENTS.md`. | Both branches previously cleared the directory in individual tests and the index in teardown. FC-008 owns the harness. FC-002, FC-006 and FC-041 cover adjacent checkpoint and memory write behavior. DC-CONTEXT-001 owns adjacent compat behavior. Compat has a separate process-liveness release in its preload. | Adopt the upstream fixture and guidance verbatim. Both branches retain their preload, shard assignments, production code and SDK. |

## Validation

The test snapshots are main `51c508648582e50274ce7f46eb6464fc73ce2858` and compat `c813b0f05988b9cdb9d291d10ea29f17ae673eeb`. The eight incoming files match upstream on both snapshots. Diffs against the respective starting tips confirm no changes in CLI source, SDK, lockfile, preload or workflows. The merges required no conflict resolution.

Windows validation used Bun 1.3.14 and `bun ci --ignore-scripts` with a fresh isolated cache. The unchanged lockfile and dependency tree served both branches in the dedicated worktree. Each invocation removed all ambient `MIMOCODE_*` variables. The package preload supplies isolated HOME/USERPROFILE/XDG and configuration roots, `MIMOCODE_TEST_TMPDIR_ROOT`, `MIMOCODE_TEST_OUTSIDE_GIT_ROOT`, `MIMOCODE_TEST_MANAGED_CONFIG_DIR`, `MIMOCODE_MODELS_PATH`, `MIMOCODE_DISABLE_DEFAULT_PLUGINS=true` and `MIMOCODE_DB=:memory:`. The compat preload also releases its process-liveness lock at teardown.

- A scratch `beforeAll` seeded one real checkpoint in the memory directory and indexed it through `reconcileMemory`. The native-layout test from the starting main reproduced the failure with `indexed: 6, pruned: 1`. The merged test passed the same assertion with `pruned: 0`. The scratch copies were removed before running the matrix.
- From `packages/cli`, `bun test test/memory test/tool/memory.test.ts test/session/checkpoint-memory-write.test.ts test/session/checkpoint-progress-reconcile.test.ts test/tool/memory-write-gate.test.ts --timeout 120000` passed on both branches. Each reported 149 passes, two POSIX-only skips, zero failures, and 730 assertions. Elapsed test time was 14.74 s on main and 19.40 s on compat.
- The broader initial main run additionally included `test/tool/memory-path-guard.test.ts`. That file had 29 failures on Windows. A standalone run on the starting main and on the merged main reproduced the same 29 failures and 50 passes. The fixture uses a POSIX memory root. The guard implementation and test are byte-identical across the main merge, and the final matrix above covers the affected test suites and checkpoint consumers.
- `bun run typecheck` passed from `packages/cli` on each branch. Root `bun run lint` exited zero with 3,736 warnings on main, 3,822 on compat, and zero errors on both.

## Publication and CI

The two test snapshots were pushed atomically to `onlyfeng/MiMo-Code`. The remote heads matched both SHAs and `upstream/main` matched the selected SHA at the post-push check. Exact-SHA `gh run list` queries returned no runs. Manual dispatch of `lint.yml`, `typecheck.yml` and `test.yml` on each branch returned HTTP 422, “Actions has been disabled for this repository.” The compat test dispatch included `windows_runtime=true`. The repository permissions endpoint reported Actions enabled and the workflows were active, but the dispatch endpoint refused execution.

The final review commits touch only `docs/`. The required proof compares each final tip to its respective test snapshot with `git diff --quiet <test-snapshot> <tip> -- . ':(exclude)docs'`. Successful CI on those test snapshots remains pending, so the documentation-only rule supplies no passing CI evidence.

## Capability results (1)

| ID | Selected behavior | Main result | dev/compat result | Decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Isolate memory directory and FTS state in shared-process tests | Adopted upstream fixture and guidance | Inherited verbatim with compat preload | Native-layout reproduction, affected matrix and byte equality of the eight incoming files |
