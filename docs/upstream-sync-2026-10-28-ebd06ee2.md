# Upstream sync 2026-10-28: quota exhaustion

## Scope and immutable baselines

Full live sync authorized by `再次同步 upstream 更新`, upstream/main -> main -> dev/compat.
Selected upstream `ebd06ee2fafad8f20d358aaac68200536ff9be65`; prior reviewed upstream `245460431c30815f894ba8318bcc98b581938a57`.
Starting main `49c5e2e9ff62b489b999e998f9e8fedae0922bef`; starting compat `48e52e5cd073e88cdcdf573bb81e831713d81d39`.
Both remotes use fresh branch-only fetches without tags. Original checkout is on compat with untracked `.omo/`, preserved.
Operation resources: dedicated Git worktrees and local branches `sync/upstream-20261028-quota` and `sync/upstream-20261028-quota-compat`; operation-only Bun/node-gyp executable links; logs outside checkouts.

## Capability inventory (N=1)

The audit range is 24546043..ebd06ee2, one upstream commit and three paths. No owner retires or moves.

| ID | Selected behavior, producers and tests | Main counterpart, relationship and drift | Compat counterpart | Owners and disposition | Evidence |
| --- | --- | --- | --- | --- | --- |
| C01 | session/retry.ts decide recognizes HTTP429 + code429 + type limitation + exact case-normalized/trimmed quota exhausted as terminal in request and stream phases. retry.test.ts covers raw SDK, normalized/serialized errors, numeric codes, provider independence and negative controls; host-error-registry spec documents interception and precedence. | Clean adoption beside fork retry-budget resolution, main-only status/events and bounded scopes. Host decisions and terminal invariants keep precedence; ordinary429 retains bounded request and persistent live-step rate-limit recovery. No provider normalization or SDK retry-flag mutation. | Inherit unchanged classifier/tests; retain native-search error routing and all eleven DC owners. | Canonical owner main, FC-013 retries and FC-008 validation fixtures; adjacent FD-010/011/012 summary recovery and DC-MODEL-001/DC-WEBSEARCH-001. Adopt classifier unchanged and adapt the ordinary429 budget test to both existing scopes. | Both branches pass quota classification, host rules, budget scopes, processor, title and MaxMode regression; exact-SHA CI below. |

## Validation

Runtime/test snapshots: main `224410e8544505fa75da185ec3d1f28d91945df9`; compat `4fa1d2cb055104509e14e5d64f5629bac6d8ce92`.
Pinned Bun 1.3.14, dependencies installed with bun ci and npm bundled node-gyp exposed on the operation PATH. Default commands remove MIMOCODE_EXPERIMENTAL, MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL, MIMOCODE_MCP_TOOL_SEARCH and MIMOCODE_CODEX_MODE. Package preload retains isolated HOME/XDG, in-memory DB and disabled default plugins, without experimental selectors.
The affected CLI matrix uses bun test with --timeout 120000 on test/session/retry.test.ts, test/error/host-registry.test.ts, test/session/processor-effect.test.ts, test/session/title-first-turn.test.ts, test/session/max-mode.test.ts and test/session/max-mode-econnreset.test.ts. CLI bun run typecheck and root bun run lint validate both branches. Both branch typechecks exit 0; lint has zero errors (main 3,675 warnings, compat 3,760 warnings).
No schema/HTTP input or generated-source input changes; SDK regeneration is unnecessary. The production code diff is the five-line retry decision; no other capability is consolidated.

| Branch | Final six-file matrix | Assertions / duration |
| --- | --- | --- |
| main | 211 pass, 2 skip, 0 fail | 1,914 / 119.89 s |
| compat | 219 pass, 2 skip, 0 fail | 1,930 / 119.87 s |

Both also pass the focused `bun test test/session/retry.test.ts -t 'provider-independent quota response' --timeout 120000`: 7 pass, 122 filtered, zero failures and 38 assertions each (overlapping matrix coverage).
The two existing processor skips cover repeated failed Bash pause and try-best denial behavior; no new skip is introduced. Shared retry implementation/tests match between branches. The compat production overlay path set remains unchanged at 54 paths. Final lint/typecheck were repeated after adapting the test. Timings overlap and are not cumulative wall-clock duration.

## Publication and cleanup

All six repaired exact-source-SHA workflows pass on their first attempts. Final review commits are docs-only; any reuse of source-SHA CI requires ancestor and outside-docs tree equality. Final live refs must prove upstream -> main -> compat. Cleanup is limited to clean integrated operation-created worktrees, local branches and executable links; preserve original .omo/ and unrelated state.

Initial six-file matrices exposed the upstream ordinary429 test assuming a persistent request budget: main 210 pass/2 skip/1 fail and compat 218 pass/2 skip/1 fail. budgetFor intentionally selects the bounded request budget before considering the error kind (FC-013). The incoming regression now tests request and stream phases separately, asserting bounded and persistent respectively. Product behavior and assertions about ordinary retryability remain intact.


## CI fixture correction

The first source main c252a26a fails CI [40661718663](https://github.com/onlyfeng/MiMo-Code/actions/runs/40661718663), shard 4, at `buildProgressDiff (integration) > empty when nothing to reconcile`. The actual output contains exactly the T1/T2 rows from the immediately preceding mixed-progress fixture. Compat 4502ffd8 passes all its CI; its pass does not invalidate the observed shared fixture defect.

`withTmpHome` used Date.now() as session identity and switched MIMOCODE_HOME after Global.Path.data was initialized. That switch did not affect checkpoint-paths, and cleanup removed an unused temporary directory, leaving actual session memory behind. Consecutive tests in one millisecond reused the same session and read prior progress. A new fixed-clock two-fixture regression reproduces the stale T1 output reliably on the old helper (one failing test). The corrected helper uses SessionID.descending(), creates actual session memory and removes its own metaDir in finally, without mutating process environment. Both complete fixture files pass 22/22 with 27 assertions. An initial local implementation typo called nonexistent SessionID.ascending; it failed locally and was corrected to the supported generator before publication. No production checkpoint behavior, assertion or timeout was weakened.

The six-file retry matrices above ran at c252a26a/4502ffd8. Their files, production inputs, dependency lockfile and environment are unchanged at the repaired snapshots; only the independent checkpoint fixture file changes. Its focused whole-file results supplement those matrices. Final CLI typecheck/lint exit 0 on both repaired snapshots, and all repaired exact-SHA workflows pass independently. No same-SHA CI rerun is used to hide the fixture failure.


## Exact-SHA CI evidence

| Branch / source snapshot | lint | typecheck | complete test |
| --- | --- | --- | --- |
| main 224410e8544505fa75da185ec3d1f28d91945df9 | [40663273019](https://github.com/onlyfeng/MiMo-Code/actions/runs/40663273019) | [40663272981](https://github.com/onlyfeng/MiMo-Code/actions/runs/40663272981) | [40663272998](https://github.com/onlyfeng/MiMo-Code/actions/runs/40663272998): nine jobs successful; Windows skipped as configured |
| compat 4fa1d2cb055104509e14e5d64f5629bac6d8ce92 | [40663278555](https://github.com/onlyfeng/MiMo-Code/actions/runs/40663278555) | [40663278560](https://github.com/onlyfeng/MiMo-Code/actions/runs/40663278560) | [40663278582](https://github.com/onlyfeng/MiMo-Code/actions/runs/40663278582): all ten jobs successful, including [Windows runtime and launcher](https://github.com/onlyfeng/MiMo-Code/actions/runs/40663278582/job/122731350053) |

The shared FD/FC review, history and report are main-owned and inherited unchanged.
Compat records its eleven retained DC owners separately. Final docs-only pushes
start no workflow; source-SHA CI above is reusable only with these proofs:

```sh
git diff --quiet 224410e8544505fa75da185ec3d1f28d91945df9 origin/main -- . ':(exclude)docs'
git diff --quiet 4fa1d2cb055104509e14e5d64f5629bac6d8ce92 origin/dev/compat -- . ':(exclude)docs'
git merge-base --is-ancestor upstream/main origin/main
git merge-base --is-ancestor origin/main origin/dev/compat
```

Fresh branch-only fetches during validation retain upstream ebd06ee2. Repeat
remote-tip and ancestry proofs after docs publication. No PR or remote temporary
branch is created. Local main and compat may fast-forward only after proving no
unique work. Remove the two clean integrated operation worktrees/branches and
operation executable links; keep operation logs as evidence and preserve the
original untracked .omo/ directory.
