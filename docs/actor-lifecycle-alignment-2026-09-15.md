# Actor execution completion and cancellation

The approved C07 change makes postStop completion the terminal-result boundary.
Background spawn still returns after admission. Blocking run, outcome and wait
observe the preserved main result after housekeeping, including warnings when
postStop fails. Persistence and parent notification carry the same warning.

## Sources and ownership

- Implementation: `30b9df3d51bc912e8f3efb3122f66cb81fa5daaf`.
- Integrated main source/test tree: `577fc25060ed31e8ece68ee02ca5b1bced2cddcf`.
- Integration includes accepted main `321e70c9` and shared history correction
  `54deac13`; selected upstream remains `5198ff54`.
- FC-001 owns lifecycle/execution correctness; FC-008 owns quarantine closure
  and validation discipline. FD-009 system frozen-context consumers remain.
- Compat retains its model-facing context/lifecycle overlay and frozen
  turnContext. It inherits this shared execution behavior after main accepts it.

The source changes are confined to `src/actor/spawn.ts`,
`src/effect/runner.ts` and five existing test files. No new public API, lockfile
change, alternate cancellation service or upstream commit is introduced.

## Behavior and root causes

Spawn reserves an execution claim during admission and holds it through
postStop and final publication. A queued inbox continuation waits for the whole
execution. Housekeeping output does not replace the main result; a failed
housekeeping turn becomes a warning rather than discarding successful work.

Cancellation captures the selected execution, requests interruption and joins
its cleanup before retiring the actor. When cancellation owns the generation's
terminal claim, the execution publishes that cancellation after its finalizers;
the cancelling caller waits for it. A setup failure or never-started execution
retains the fallback publisher. Generation ownership, successor protection,
persistent tombstones, receiver disposal and task authority remain intact.
Continuation notification receipts are read after the execution joins, closing
the publication-to-receipt race. Independently queued work still has its own
settlement; an old completed notification must not hide a later queued cancel.

Two actual interruption gaps surfaced during validation:

1. A Runner child could be interrupted before its first instruction installed
   the exit finalizer. Its fiber exited while `Runner.done` stayed pending, so
   a joined cancellation never returned. The fork now starts with interruption
   masked until the finalizer is installed; the start wait and actual work are
   explicitly interruptible. The regression fixes `start=true/entered=false`
   and verifies cancellation, idle state and a subsequent successful run.
2. The cancelling caller could be interrupted after acquiring its episode but
   before installing cleanup. Even a synchronous Effect operation permits
   scheduler budget yields. A real scheduler sweep reproduced leaked ownership
   and a later cancel timeout. Acquisition, execution capture and owner cleanup
   now share one mask; follower waiting uses restore and remains interruptible.

The earlier nested-actor timeout was attributed to a shared execution key.
That attribution is withdrawn: the corrected InboxArrived observation and
real spawn-before-continuation test pass with the claim enabled. This is
separate from the two reproduced cancellation gaps above.

Both registered quarantine contracts are active again: postStop warnings and
waiting for the entire spawn execution. The warning case covers foreground and
background operation across outcome, wait, persistence and parent notice.

## Verification

Commands run from `packages/opencode` with Bun 1.3.14. Ambient experimental,
MCP-search, Codex-mode, compaction context/ratio and checkpoint-disable selectors
are removed. The package preload retains
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`; no new selector or preload is added.

| Snapshot and command | Actual result |
| --- | --- |
| Before final cancellation-mask patch: `bun test test/actor/ test/inbox/ test/plugin/actor-hooks.test.ts test/tool/actor-owned-lifecycle.test.ts test/tool/actor-exec-lifecycle.test.ts --timeout 30000` | 353 pass, 0 fail, 1,428 assertions, 37 files |
| Before final mask patch: real HTTP actor recovery suite | 13 pass, 0 fail, 175 assertions |
| Final mask source: cancel-notification, Runner, Runner warnings, execution-integration, actor-hooks, actor-owned-lifecycle and actor-exec-lifecycle files | 122 pass, 0 fail, 517 assertions |
| Final mask source: postStop and two cross-session regressions | 6 pass, 0 fail, 35 assertions |
| Final mask source: scheduler, owner and follower cases | 3 pass, 0 fail, 40 assertions |
| Final mask source: `bun typecheck` | Exit 0 |
| Integrated main: runtime-created persistent actor to public resume | 1 pass, 0 fail, 21 assertions |
| Integrated main before metadata-only inheritance: root `bun lint` | Exit 0; 4,506 warnings, 0 errors |
| Independent final scheduler/follower probes | 2 pass, 0 fail |

The old quarantined implementation fails both original assertions. Independent
red evidence also covers premature postStop cancellation publication, paused
notification receipts, Runner pre-start cancellation and owner acquisition
interruption. Removing only warnings from the parent envelope fails the parent
notification assertion while earlier outcome/wait/persistence assertions pass.
No assertion was deleted to conceal these failures. The existing postStop
reentry fixture now budgets both actual model turns; the deterministic Runner
and ownership regressions retain their short deadlines.

An independent reviewer checked final source and the actual Effect scheduler.
The speculative queued-ephemeral-restart concern was withdrawn after separate
graceful/forced probes verified no extra model call and no remaining queued row.

The 353-case matrix and HTTP results precede the final mask patch; they are not
misrepresented as a repeated complete matrix on the final source. Final-source
targeted regressions and final integrated-tree CI cover the subsequent change.
Publication requires current-head CI, review of any new feedback, and eventual
exact remote-tip CI on both main and compat. Local validation alone is not that
publication evidence.
