# Inbox crash consistency — 2026-09-15

## Scope and immutable sources

This specified correction closes the queue-to-transcript crash window recorded
under FC-001. It does not import additional upstream commits or promote compat
policy to main. Main owns the correction; `dev/compat` inherits it.

- Selected upstream: `b4cc11cd652195af9a80297ed543218f3172e6c4`.
- Starting main: `370d12295f4c4628e10012ae46f3bcb454a5b587`.
- Starting compat: `49dce5816792e95050cd64561080d3257b714b7f`.
- Source/test implementation: `74d4bfb6008071fca87c245c7791530660d64876`.
- The prior [complete audit](fork-difference-closure-2026-09-15.md) and its
  inventory remain evidence for their fixed trees. Their earlier Inbox boundary
  is superseded by this correction, without rewriting their historical counts.

## Capability inventory (N = 1)

| ID | Selected behavior and surfaces | Main disposition | Compat disposition | Owner and retained contracts |
| --- | --- | --- | --- | --- |
| IC-01 | Atomic `Inbox.drain`: `src/inbox/inbox.ts`, internal `Session.commitUserMessageSync`, drain/actor/prompt tests | Implement the shared storage correction | Inherit the same transaction; retain compat rendering and context limits | FC-001; preserve FC-002 checkpoint delivery, FC-015 mandatory spawn suffix, FD-009 frozen identity, DC-CONTEXT-001 caps/coverage and DC-ACTOR-001 full-context ownership |

Paths above are relative to `packages/opencode`. Before the correction, both
branches had identical Inbox and Session storage implementations. Compat's
different notification rendering and turn-context policy do not require a
different storage transaction.

## Behavior

The old drain wrote the user message, each part and the queue deletion separately.
A process exit could leave a partial user message with a replayable queue. A
second drain could also consume an old selection after an asynchronous model
seed lookup, and a late retirement or GC could invalidate that selection.

The existing bounded receiver selection and seed/rendering policy are retained.
One synchronous immediate SQLite transaction then rechecks persistent-peer
retirement, cancellation and the selected IDs still belonging to this receiver.
It writes one complete `source: spawn` user message and all synthetic text parts,
and deletes exactly the still-present selected rows. Blank rows are consumed
without creating an empty user message. New arrivals remain for a later drain.

Session exposes an internal synchronous composition method using the same
validation, ownership checks, monotonic committed timestamp and SyncEvent
projectors as `commitUserMessage`. The existing Effect API wraps that method;
no HTTP, SDK, schema or migration changes are needed. No asynchronous fiber is
started inside the database transaction.

Database publication callbacks run after commit. A nonthrowing committed-count
witness precedes them: if an observer throws, drain logs the publication failure
and returns the durable consumed count. Returning zero or reporting a rolled-back
batch would cause the consumer loop to leave an already-created turn unattended.
Pure or mixed Effect interruption still propagates.

## Decisive validation

All tests run from `packages/opencode`, with the eight ambient selectors removed:

```sh
env -u MIMOCODE_EXPERIMENTAL \
  -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
  -u MIMOCODE_CODEX_MODE \
  -u MIMOCODE_COMPACTION_MAX_CONTEXT \
  -u MIMOCODE_COMPACTION_TRIGGER_RATIO \
  -u MIMOCODE_DISABLE_CHECKPOINT \
  -u MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL \
  -u MIMOCODE_EXPERIMENTAL_WORKSPACES \
  bun test test/inbox test/actor/spawn-notification.test.ts \
  test/actor/cancel-notification.test.ts test/session/compaction-projection.test.ts
```

Package Solid/test preloads remain the harness baseline, including
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` and isolated test home/XDG state.
Crash children import real application modules without `bun:test` or the test
preload, use their own on-disk database, and inherit the isolated environment.

| Evidence | Original main behavior | Corrected implementation |
| --- | --- | --- |
| Native SQLite failures on a part insert or queue delete; actual postcommit observations and throwing publisher (`drain-atomic.test.ts`) | 4 failures after correcting the fixture layer | 4 pass; no partial transcript, no rolled-back publication, committed count retained |
| Deferred seed admission, concurrent drain, late retirement, partial/full GC (`drain-admission.test.ts`) | 4 failures; precommit cancellation and real fiber interruption already passed | 7 pass / 42 assertions, including real postcommit interruption |
| Actual SIGKILL after the second part, before queue deletion, and at first postcommit publication; distinct process reopens SQLite (`drain-crash-reopen.test.ts`) | 3 failures at the verified kill boundaries | 3 pass / 58 assertions; complete queue or complete message, one transcript, no replay |
| Final Inbox/Actor/compaction matrix above | Existing baseline selected tests: 17 pass | 126 pass / 0 fail / 582 assertions across 16 files |
| `prompt-effect.test.ts -t 'atomic user admission\|user message and parts roll back\|createMessage rejects\|prompt retries\|cancelling main\|main inbox wake'`, same environment wrapper | Existing consumer contracts | 11 pass / 0 fail / 58 assertions; other cases filtered out |
| Final assertion formatting/lint corrections, atomic and crash files | No production changes | 7 pass / 0 fail / 87 assertions |
| Package `bun typecheck`; focused `bun x oxlint` from repository root | Existing Session lint warnings remain outside the diff | Both exit 0; no new-file warnings |

The crash instrumentation wraps the real SQLite statement's `run` and kills
the writer at the selected boundary; it does not substitute database behavior.
A synchronous boundary receipt distinguishes the intentional SIGKILL from the
watchdog. Recovery snapshots compare the original selected IDs and contents,
the complete synthetic message, an empty queue, and an idempotent second drain.

Early fixture setup errors are not product failures. The postcommit interruption
test also passed before the explicit `Cause.hasInterrupts` guard; it is boundary
coverage, not evidence of a previously reproduced swallowed interruption bug.

## Limits and publication authority

This proves durable queue-to-transcript atomicity. It does not promise exactly-once
LLM execution, event delivery after a process exit, or automatic restart scheduling.
Shell writes and streamed assistant/tool output remain outside this transaction.
Persistent-peer retirement keeps its existing discard policy; main remains
runnable and Inbox-addressable after cancellation.

The implementation SHA above identifies the source/test evidence. PR acceptance,
review feedback, exact merged-tip CI and main-to-compat ancestry are separate
publication checks, recorded with the corresponding fork PRs. Pure documentation
commits do not change the implementation reference. Real plugin, private-network
OAuth and Windows acceptance are subsequent work with their own runtime evidence.
