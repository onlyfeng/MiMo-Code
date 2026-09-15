# Actor execution completion and cancellation

The approved C07 change makes postStop completion the terminal-result boundary.
Background spawn still returns after admission. Blocking run, outcome and wait
observe the preserved main result after housekeeping, including warnings when
postStop fails. Persistence and parent notification carry the same warning.

## Accepted publication

Main accepted C07 through PR #124 at `648f7cdf100b30ff046db7518d8f832473b61481`;
compat inherited it through PR #125 at `90abf6e447d7a5e5b405aba301bf1a951f469bf6`.
Both accepted SHAs passed test, typecheck and lint. The
[final synchronization record](upstream-sync-2026-09-15-5198ff54.md#accepted-result-and-publication-evidence)
contains exact run links and ancestry evidence, and supersedes publication gates
in the historical validation narrative below. The two actor quarantines are
closed; the independent workflow deadline fixture-disposer quarantine is still
open under FC-008. This is not a claim that all skipped tests have been enabled.

## Sources and ownership

- Initial implementation: `30b9df3d51bc912e8f3efb3122f66cb81fa5daaf`.
- Review corrections: workflow `66cfbf17`, execution admission `65c84b90`,
  and queued receipt/final formatting `1ae37485`.
- Final integrated main source/test tree: `4eacc84dccf83c22f533c35bea282d4c5a38cacd`.
- Direct execution-hook cancellation coordination: `4eacc84d`.
- Integration includes accepted main `e4075dfc` and final shared history
  behavior `64e47eb7`; selected upstream remains `5198ff54`.
- FC-001 owns lifecycle/execution correctness; FC-008 owns quarantine closure
  and validation discipline. FD-009 system frozen-context consumers remain.
- Compat retains its model-facing context/lifecycle overlay and frozen
  turnContext. It has inherited this shared execution behavior from accepted main.

The initial lifecycle patch changes `src/actor/spawn.ts`,
`src/effect/runner.ts` and five existing test files. The review follow-ups below
also cover execution admission and its workflow timeout caller. No new public API, lockfile
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
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`. The initial matrices below also
inherited shell `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL=1`; they are not a
preload-only default-path run. Follow-up actor matrices clear that selector;
workflow-specific regressions report it explicitly as their target selector.

| Snapshot and command                                                                                                                                                                                    | Actual result                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Before final cancellation-mask patch: `bun test test/actor/ test/inbox/ test/plugin/actor-hooks.test.ts test/tool/actor-owned-lifecycle.test.ts test/tool/actor-exec-lifecycle.test.ts --timeout 30000` | 353 pass, 0 fail, 1,428 assertions, 37 files |
| Before final mask patch: real HTTP actor recovery suite                                                                                                                                                 | 13 pass, 0 fail, 175 assertions              |
| Final mask source: cancel-notification, Runner, Runner warnings, execution-integration, actor-hooks, actor-owned-lifecycle and actor-exec-lifecycle files                                               | 122 pass, 0 fail, 517 assertions             |
| Final mask source: postStop and two cross-session regressions                                                                                                                                           | 6 pass, 0 fail, 35 assertions                |
| Final mask source: scheduler, owner and follower cases                                                                                                                                                  | 3 pass, 0 fail, 40 assertions                |
| Final mask source: `bun typecheck`                                                                                                                                                                      | Exit 0                                       |
| Integrated main: runtime-created persistent actor to public resume                                                                                                                                      | 1 pass, 0 fail, 21 assertions                |
| Integrated main before metadata-only inheritance: root `bun lint`                                                                                                                                       | Exit 0; 4,506 warnings, 0 errors             |
| Independent final scheduler/follower probes                                                                                                                                                             | 2 pass, 0 fail                               |

The old quarantined implementation fails both original assertions. Independent
red evidence also covers premature postStop cancellation publication, paused
notification receipts, Runner pre-start cancellation and owner acquisition
interruption. Removing only warnings from the parent envelope fails the parent
notification assertion while earlier outcome/wait/persistence assertions pass.
No assertion was deleted to conceal these failures. The existing postStop
reentry fixture now budgets both actual model turns; the deterministic Runner
and ownership regressions retain their short deadlines.

An independent reviewer checked final source and the actual Effect scheduler.
Initial graceful/forced queued-work probes found no extra model call or
remaining row, but they did not cover a wake already waiting in
`ActorExecution.acquire`. A later controlled real Inbox/LLM fixture reproduced
that separate race: the successor consumed its row before retirement, remained
active after cancel returned, and then published a completed result. The early
probes therefore do not establish cancellation isolation at that boundary.

The 353-case matrix and HTTP results precede the final mask patch; they are not
misrepresented as a repeated complete matrix on the final source. Final-source
targeted regressions and final integrated-tree CI cover the subsequent change.
Publication requires current-head CI, review of any new feedback, and eventual
exact remote-tip CI on both main and compat. Local validation alone is not that
publication evidence.

## PR 124 workflow timeout follow-up

At `66cfbf1724a605da6b15702c1b8a3e53a525e216`, the workflow timeout caller
uses the existing hard-timeout helper to limit its cancellation join to the
existing five-second reclaim grace. The Actor cancellation fiber continues
owning cleanup after that grace expires; the workflow returns its timeout/null
sentinel, emits one timeout event, and can advance parallel/pipeline barriers.
Shared Actor.cancel still interrupts and joins its selected execution.

Two real Actor fixtures hold an uninterruptible postStop finalizer in shared
and worktree isolation. Both reproduce the prior hang, then pass while that
finalizer remains blocked; releasing it lets detached cancellation finish.
The final targeted matrix (new cleanup tests and existing timeout/cancel
regressions) is 7 pass, 0 fail and 23 assertions, with package typecheck passing.
An independent review also passes the shared fixture, three hard-timeout tests
and a delayed-cleanup-failure probe without an unhandled rejection.

This workflow-specific matrix explicitly retains
`MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL=1` and the package ORCHESTRATOR preload,
with the standard umbrella/MCP/Codex and compaction/checkpoint selectors
removed. Five seconds bounds the cancellation join only: the worktree path
still performs its existing bounded instance-close wait and filesystem/Git
cleanup, so it is not an absolute bound on the entire agent call.

## PR 124 execution admission and receipt follow-ups

The cancellation episode now closes admission in the existing ActorExecution
service before capturing its execution. Pending acquire tickets become invalid,
and acquire/reserve calls during that episode are rejected. The barrier spans
join, tombstone, queue settlement and retirement. An old ticket stays invalid
after the barrier opens, while fresh valid generations can acquire normally.
Nested scopes, failures and interruptions release their bookkeeping; the key
remains session-and-actor scoped, with no permanent main-session tombstone.

Reservation now precedes lifecycle-generation creation so a rejected reservation
cannot strand a generation. Independent review reproduced cancellation after
reservation but before generation/fiber setup: the old worker still called the
model. The protected work entry now checks the execution's cancellation marker,
interrupts before any model call, and retains all terminal/release finalizers.
Both graceful and forced cases reproduce the original failure and pass with the
fix. Independent validation also verifies claim release, repeated cancellation
and subsequent admission on the same key.

The first 130-case integration matrix then exposed one existing receipt case:
a completed execution's receipt hid cancellation of queued work because the
old execution had been captured. The barrier correctly kept that queued row
pending. After joining, pending work now invalidates the old completed receipt;
the earlier idle/cancelled branch still drains without a duplicate notification.
The original assertion was retained. Independent real continuation probes for
both cancellation modes verify exactly one notice when the prior execution
itself was already cancelled (2 pass, 18 assertions).

The intermediate 129-pass/one-failure matrix is not final evidence. The admission/receipt
checks below run on `1ae37485`, before the direct-hook follow-up below. Actor default-path
runs remove WORKFLOW_TOOL as well as the umbrella/MCP/Codex and
compaction/checkpoint selectors, retaining the package ORCHESTRATOR preload.
The integrated workflow-specific matrix explicitly enables WORKFLOW_TOOL and
passes 7 tests, 0 failures and 23 assertions on the same source.

| Stable admission/receipt source check                                                                                                                            | Actual result                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `bun test` execution, cancel-notification, Runner, Runner warnings, execution-integration, actor-hooks, actor-owned-lifecycle and actor-exec-lifecycle (8 files) | 130 pass, 0 fail, 569 assertions |
| PostStop joins/reentry and two cross-session cases                                                                                                               | 6 pass, 0 fail, 35 assertions    |
| Workflow timeout/cancel/worktree integration after admission fixes                                                                                               | 7 pass, 0 fail, 23 assertions    |
| Package `bun typecheck`                                                                                                                                          | Exit 0                           |
| Focused admission lint                                                                                                                                           | Exit 0; 26 warnings, 0 errors    |

Independent review covers the blocked-acquire and reserve-before-generation
reproductions, ten execution-barrier assertions and both already-cancelled
receipt cases. The final runtime tree retains these fixes while removing
unrelated formatter changes; TypeScript AST comparison confirms equivalence.

## PR 124 direct execution-hook cancellation follow-up

The automated tool self-cancellation finding assumed the model tool ran on its
own Runner fiber. Actual calls disprove that premise: the initial peer and both
actor/session continuation tools enter cancellation from independent
EffectBridge fibers. The two continuation probes pass on a frozen `21a8fbbd`
archive (22 assertions), including actual cancellation, execution release,
registry settlement, repeated cancel and fresh admission. An initial failed
probe had its service reference replaced during bootstrap and never invoked
cancellation; it is not product failure evidence.

A different supported path does reproduce a hang: a direct Effect postStop hook
awaits cancellation of its own execution. It also hangs on the old `a197d4a8`
baseline, after that implementation has already published outcome. The stricter
execution join exposes the existing cleanup defect before outcome publication.

At `4eacc84dccf83c22f533c35bea282d4c5a38cacd`, ActorExecution identifies whether
the current fiber actually owns an active execution. Only such direct callers
transfer the complete cancellation to the existing Actor service scope and
wait interruptibly, even inside a finalizer. External callers keep the masked
owner and strict execution join. The same transfer handles a child hook
cancelling its ancestor, whose recursive cancellation reaches that child. No
Runner, tool schema, Promise bridge or cross-context marker change is needed.

Final default-path validation on that exact source clears all seven ambient
selectors listed above and retains the package ORCHESTRATOR preload:

| Final execution-hook source check                                                                                                                    | Actual result                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Execution, real none/full tool self-cancel, cancel-notification, Runner, Runner warnings, execution-integration, hooks and lifecycle tools (9 files) | 132 pass, 0 fail, 586 assertions |
| Existing postStop/cross-session cases plus direct hook, finalizer and ancestor cancellation                                                          | 9 pass, 0 fail, 50 assertions    |
| Workflow timeout/cancel/worktree integration, explicit WORKFLOW_TOOL=1                                                                               | 7 pass, 0 fail, 23 assertions    |
| Package `bun typecheck`                                                                                                                              | Exit 0                           |
| Focused four-file lint                                                                                                                               | Exit 0; 48 warnings, 0 errors    |

The two default actor groups total 141 passes and 636 assertions; the separate
workflow group explicitly enables WORKFLOW_TOOL with the other six selectors
removed and package ORCHESTRATOR retained. Source/test hashes
remain fixed throughout. Independent real Actor probes pass two additional
cases with 16 assertions: external cancellation followed by finalizer
self-cancellation preserves the external join, and the coordinator retains
caller Effect context and InstanceRef. These probes are separate evidence, not
added to the matrix total. Whole-tree PR CI and actual merged branch CI remain
publication requirements.
