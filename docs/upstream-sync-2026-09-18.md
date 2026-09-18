# 2026-09-18 upstream synchronization

## Scope and baselines

Full synchronization authorized by “同步 upstream 更新”. Branch-only fetch selected
upstream `2bda17944b346ab85c8ee3cf0a0d4ab24819d37c`, advancing the prior review
`4cb859dd7c962b13eee5f34146350f520a380217` by one commit (#2424).
Starting main: `912d81687be1f923aebd9c33d8bdb03391efca34`.
Starting compat: `d3d25ec611bbd2c13462acfeaf4cfbcb79efdf4a`.
The original compat checkout was clean. Two dedicated operation worktrees and
`sync/upstream-20260918` / `sync/upstream-20260918-compat` were created; existing
model-preview and exec-argument worktrees are outside cleanup scope.

## Capability inventory (1)

| ID | Selected behavior / range and decisive paths | main result | dev/compat result | Owner / drift / disposition |
| --- | --- | --- | --- | --- |
| C01 | `4cb859dd..2bda1794`: session abort cancels same-session runners and Actors; terminal notifications remain durable without waking parents; runner keys isolate session and actor identities. Producers: `session/prompt.ts`, `session/run-state.ts`, `actor/execution.ts`, `actor/spawn.ts`, `actor/notification.ts`, `inbox/inbox.ts`. Tests: `actor/spawn.test.ts`, `actor/cancel-notification.test.ts`, `session/run-state-group-cancel.test.ts`, `session/run-state-dispose.test.ts`, `actor/lifecycle.test.ts`. | Adapt to FC-001 execution/generation ownership, terminal claims, cancellation followers, runner leases and disposal checks; retain existing recovery admission and inbox transactions. | Inherit shared cancellation; preserve frozen full-context, variant transport, bounded content/preflight, per-agent MaxMode and server-authoritative TUI preview. | Canonical owner: main, FC-001. Direct overlap: FD-001/002/005/006/009, FC-002/005/009/013 and DC-ACTOR-001/002, DC-CONTEXT-001, DC-MODEL-001, DC-TUI-001. Adopt upstream behavior through existing fork owners; no owner retirement or unrelated consolidation. |

All selected upstream changes belong to C01, including the test-layer status
sharing correction. The other active FD/FC/DC owners were checked against the
complete seven-file upstream delta; they have no incoming implementation change.
There are no public schema, configuration, SDK or OpenAPI changes to regenerate.
The 39 compat-different production paths are identical before and after integration.
Private-network policies, platform fallbacks and the newly accepted model preview
remain compat-owned. Shared FD/FC records are inherited without independent edits.

## Semantic resolution

The initial runtime integration is `f4fdbf4809ff3adcf8ad7140c519390412aa88cb`;
initial compat integration is `efe2ee26182a1e73045923bac4899fad25a68838`.
These are source snapshots, not final publication acceptance.

- Session abort first marks known executions and fork-owned persistent generations,
  then interrupts runners and joins Actor cancellation. The marker stays on the
  cancelled execution/generation; a new main turn cannot re-enable a late notifier,
  and a successor Actor generation does not inherit it.
- `wake: false` retains the inbox insert and event while skipping the wake loop
  and toast. Main inbox draining materializes cancellation notifications without
  issuing a model request. Continuation delivery still returns its successful
  write receipt, preserving terminal deduplication.
- The runner map now nests session and actor keys. Existing leases, generation
  identity, admission, disposal guards and status locks remain authoritative.
- A registry-only pending Actor has no captured spawn notification target. Its
  cancellation resolves the current target through `withRunDisposal`, retaining
  both the original notification source and target instance-generation checks.
- Independent review found that a quiet follower could join an existing ordinary
  registry-only cancel without an execution/generation to mark. The correction
  binds quiet intent to the existing cancellation episode as well; its owner and
  descendant cancels consume that intent before notification.

## Validation and publication

Dependencies are installed with `bun ci` on both branches, with no lockfile
mutation. Tests run from `packages/opencode` with ambient
`MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and
`MIMOCODE_CODEX_MODE` removed. Prompt/compaction checks additionally remove
`MIMOCODE_COMPACTION_MAX_CONTEXT`, `MIMOCODE_COMPACTION_TRIGGER_RATIO`, and
`MIMOCODE_DISABLE_CHECKPOINT`. Package preload retains orchestrator=true,
in-memory SQLite, fixture-local config and disabled default plugins. These runs
are not proof that preload-enabled features are off by default.

Final reviewed main runtime/tests: `759b6431963cbeb7b0940f4b7a92dc64690624d5`.
Compat runtime integration: `cd49ecf343e08e04e13209b4e4bb00c46320a978`.
Independent review accepted the correction to cancellation followers at this
main snapshot. The final source/overlay comparison preserves all 39 compat
production deltas byte-for-byte after excluding diff line offsets and blob IDs.

| Matrix (package cwd unless noted) | main | dev/compat | Scope / log suffix |
| --- | --- | --- | --- |
| `bun test test/actor/cancel-notification.test.ts test/actor/lifecycle.test.ts --timeout 120000` | 43 pass, 0 fail | 43 pass, 0 fail | Complete final-source notification/lifecycle files; `cancel-final.log` |
| `bun test test/actor/spawn.test.ts test/session/run-state-group-cancel.test.ts -t 'process-group kill\|session cancel reaches' --timeout 120000` | 3 pass, 75 filtered, 0 fail | 3 pass, 77 filtered, 0 fail | Real hung main + two child calls, quiet pending-row cancellation, durable inline history, exact tuple isolation and next-run admission; `cascade-final.log` |
| `bun typecheck` | exit 0 | exit 0 | Final runtime/test snapshots; `typecheck-final.log` |
| Root `bun lint` plus changed-file lint after the follower correction | 0 errors | 0 errors | Existing repository warnings retained; corrected shared files add no lint error |

Earlier integration checks covered 67 runner/disposal/lifecycle cases and 121
Actor notification/inbox cases without failure. They are bounded pre-correction
evidence, not the final branch suite. The follower regression was independently
red (`wakes=1`) before the episode correction and green afterwards (`wakes=0`,
exactly one durable notification and cancelled registry outcome). A broad
integration invocation that retained an old loaded module while discovering the
new regression was stopped and superseded; its counts are not acceptance evidence.
The additional complete prompt-effect/run-approval checks and exact final-SHA CI
are collected separately after this record; this source record does not predict
their outcomes. Logs use the operation prefix `mimocode-sync-20260918-`.

Final push-SHA `test`, `typecheck`, `lint`, live remote-tip equality and ancestry
must be checked after the registry commits. Local results or pre-registry CI do
not declare publication complete. No additional source change is authorized by
this evidence record alone.
