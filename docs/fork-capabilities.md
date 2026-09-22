# Fork Capability Inventory

This registry inventories active shared `main` capabilities and process
contracts that are not already owned by an FD. It lives on `main` and
`dev/compat` inherits it unchanged. Read it with
[upstream-deviations.md](upstream-deviations.md) before every upstream
synchronization, including when listed surfaces merge cleanly.

An FD is the sole authority for a deliberate rejection of upstream behavior.
An FC records a shared extension, hardening, adaptation, or repository contract;
cross-references below route reviewers to an FD but do not duplicate its
authority.

## Review record

- Status: active
- Canonical owner: fork `main`; inherited unchanged by `dev/compat`
- Last reviewed: 2026-09-22
- Upstream: `1579e7d9ee5fca87b707c3892dc725316674a9d6`
- Prior reviewed upstream: `479201262a0f08e6abe9c29022d2fb38b63e29b0`
- Main behavior (runtime/tests): `a08d967102b0199c828fb53f187ceb8494c40b91`
- Bundled guidance content: `a08d967102b0199c828fb53f187ceb8494c40b91`
- Prior fork `main` tip: `9fa2563885e1ee3742f27b4ca2e46fc9c0696d07`
- Complete code-difference audit: [2026-09-15 implementation closure](fork-difference-closure-2026-09-15.md), with fixed Git trees, per-file ownership, completed F01–F11 decisions and retained boundaries.
- Original audit baseline: [2026-09-15 findings](fork-difference-audit-2026-09-15.md); its 529 file pairs, source snapshots and pre-implementation findings remain historical.
- History: [fork-registry-history.md](fork-registry-history.md)

`Upstream` remains the overall upstream review baseline. `Main behavior` names
the reviewed runtime/test tree; bundled guidance has a separate content snapshot.
Pure registry/history commits advance neither reference. The selected released
capability audit is recorded in [the model API review](released-model-api-review-2026-09-08.md).

Latest reviewed synchronization: [2026-09-22 full sync](upstream-sync-2026-09-22.md), ten capabilities through `1579e7d9`. Adopt bounded tool-call flooding and same-batch failure cascade, runtime-local Actor status, inbox/TUI projections, automatic title tool choice, MiMo v2.6 PascalCase model names, the synchronized 0.1.15 release, MCP confirmation elicitation and opt-in host model transport. Preserve canonical internal tool IDs, generation-safe Question cleanup, frozen prefix authority, main-only orphan cleanup, retained Actor recovery, fork request admission and all active FD/FC boundaries.

Previous synchronization: [2026-09-21 full sync](upstream-sync-2026-09-21.md), eleven capabilities through `47920126`. Adopt concise prompts, explicit external skill roots, retired directory loaders, FIFO tool admission, generation-owned MCP connections and selected-session question cleanup. Adapt trailing-user recovery and cancellation to atomic admission, retained frozen Actor context, durable inbox progress and bounded retry scopes. No shared owner retires or moves.

Previous synchronization: [2026-09-19 full sync](upstream-sync-2026-09-19.md), two capabilities through `50cd7139`. Adopt optional uncommitted-change hints and adapt main-resume subagent cascade to retained Actor ownership, preserving atomic message admission and compat boundaries.

Previous synchronization: [2026-09-18 full sync](upstream-sync-2026-09-18.md), one capability through `2bda1794`. Adopt same-session Actor cancellation and durable quiet terminal notifications, preserving FC-001 generation ownership and all compat boundaries.

Previous synchronization: [2026-09-17 full sync](upstream-sync-2026-09-17.md), eleven capabilities through `4cb859dd`. Retain FC-007 opt-in notices and FC-013 bounded scope budgets, adopt image routing, stable reminders and atomic empty-residue recovery.

Previous synchronization: exact catalog tool names at `26aa00fc`; the [single-capability review](upstream-sync-2026-09-15-26aa00fc.md) records lookup, GitLab and nested MCP dispatch, retained parameter normalization, authoritative checkpoint guidance, and validation. Explicit advertised adapters and existing request/permission boundaries remain intact.

Previous synchronization: gateway error aliases at `b4cc11cd`, accepted on main through PR #128; propagation and exact-SHA validation are recorded in the [follow-up record](audit-followups-2026-09-15.md). This classification affects error messages only; it grants no harness, tool or provider authorization.

Previous synchronization: 2026-09-15, the specified upstream range
`6fbb1732..5198ff54` (21 commits, 17 non-merge). The
[capability inventory](upstream-sync-2026-09-15-5198ff54.md) records six incoming
capabilities and the separately approved actor lifecycle follow-up. FC-003 is
retired by an explicit behavior decision. FD-009 retains the system frozen-context
contract; only compat exposes full-context model creation. History adopts uniform
content and one-time resumable migration, with a bounded SQLite NUL projection
correction. FD-004's previously accepted upstream behaviors remain unchanged.
This is alignment to the selected SHA, not to newer upstream commits.
Earlier per-owner behavior references remain historical where this range does
not change their implementation. The preceding review is retained in the
[shared history](fork-registry-history.md).

## Sync index

| ID     | Watch surfaces                                                                                            | Upstream relationship                                            | Required decision                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| FC-001 | actor, inbox, runner, session state, recovery/resume                                                      | Typed upstream admission plus stronger fork lifecycle            | Preserve synchronous admission and async queue persistence                               |
| FC-002 | checkpoint writer and frozen request prefix                                                               | Extension plus adaptation                                        | Preserve writer-mode semantics                                                           |
| FC-004 | MCP configuration, connection state, and local exit diagnostics                                           | Explicit imported-server auto-connect plus fork hardening        | Preserve validation, redaction, and isolation                                            |
| FC-005 | skill discovery and invocation                                                                            | Stronger shared gates                                            | Preserve permission parity                                                               |
| FC-006 | plugin progress-checker configuration                                                                     | Fork integration hardening                                       | Preserve instance-local decision                                                         |
| FC-007 | project roots, fixed instance cwd, Auto-Worktree notice, inert SDK event, optional context, Bash deletion | Shared fixed cwd and SDK compatibility plus fork safety boundary | Preserve exact path, mutation, and cwd boundaries                                        |
| FC-008 | workflow cleanup, detached Effect context, package test isolation, synchronization, and CI/reporting      | Runtime/process hardening                                        | Preserve bounds, scoped services, clean defaults, and fail-closed evidence               |
| FC-009 | synthetic messages, text parts, and retry boundary                                                        | Adapted upstream stream/retry handling                           | Preserve provenance and prevent side-effect replay                                       |
| FC-010 | WebFetch and SSRF destination classification                                                              | Adapted contract plus fork hardening                             | Preserve complete `fe80::/10` classification, per-hop authorization, and resource bounds |
| FC-011 | model prompts, path guidance, and bundled skills                                                          | Fork-facing guidance                                             | Preserve factual shared guidance                                                         |
| FC-012 | publication, contribution, security                                                                       | Fork-specific process                                            | Preserve fork routing                                                                    |
| FC-013 | Retry configuration, request/candidate/judge scopes and MaxMode final step                                | Shared retry plus fork policy corrections                        | Preserve scope budgets, persistent live-step recovery, tool-free final step and status isolation |
| FC-014 | `.cursor/environment.json` Cloud Agent dev environment                                                    | Fork-only infra absent from upstream                             | Preserve Bun bootstrap and read-only `upstream` remote; never send to upstream           |
| FC-015 | compaction context budget, projection, frozen prefix, and trigger ratio                                   | Upstream trigger plus bounded fork projection                    | Preserve ratio parity, no-tool summaries, and config precedence                          |
| FC-016 | TUI voice Prompt ownership and grapheme-safe editor offsets                                               | Upstream voice protocol plus fork lifecycle/editor hardening     | Preserve owner identity, drain-before-idle, and grapheme boundaries                      |
| FC-017 | History SQLite projection and attachment preview formatting                                               | Upstream history with fork fidelity/budget corrections           | Preserve NUL data, SQL metadata bounds and original attachment locators                  |
| FC-018 | actor shell flag values (`extractNamedFlags` and the verb mappings)                                       | Fork hardening of shared parsing                                 | Reject an explicitly empty value in both flag forms                                      |

## FC-001 — linearized actor generations and persistent-peer lifecycle

- 2026-09-19 synchronization: Main resume captures a cancellation epoch before atomic admission, then cascades only eligible same-session subagents through Actor.recovery/resume. No registry-only or released-context takeover; child supervisors retain task/model/context ownership and terminal publication. Pending admission is bounded and withdrawn on Stop or timeout.

- 2026-09-17 synchronization: Empty-residue recovery deletes parent-scoped shells and binds any task within the existing immediate admission transaction. Ownership handoff precedes postcommit publication; failed/busy/stale/cancelled admission cannot clean up. Useful assistant output retains settlement and continuation. Recovery still selects the latest same-actor candidate; completed abandoned errors are not revived. The parent user is never fabricated or rewritten except the existing authorized task binding.

- 2026-09-10 title authority: inherit transactional title revisions and protected
  manual titles across imports, replay and HTTP conflicts. First genuine input
  commits a deterministic fallback before detached generation through the
  existing promptWork/send admission and queue handoff. Recovery alone does not
  retitle historical turns. This changes no Actor generation or task ownership.

- 2026-09-15 execution completion: spawn reserves an ActorExecution during
  admission and retains it through postStop and terminal publication. Blocking
  run/outcome/wait, persistence and parent notification observe the preserved
  main result with postStop warnings after housekeeping; background spawn still
  returns its identity after admission. Inbox continuations cannot overtake it.
  Cancellation closes execution admission, invalidates queued acquisition
  tickets, captures the selected execution, and interrupts/joins it through
  retirement. Old tickets cannot restart after the barrier opens; fresh valid
  generations and other sessions remain independent. A reserved worker cancelled
  before startup skips its model call through the protected finalizer path. A cancellation-owned generation is published
  by the execution; the cancelling owner waits rather than publishing early.
  Notification receipts are read after that join. A completed turn cannot hide
  cancellation of subsequently queued work; an already-cancelled turn does not
  receive a duplicate notice. Failed-send fallback remains. Owner acquisition and cleanup installation are
  masked together, while a follower's wait remains interruptible. Direct Effect
  hooks on an active execution fiber delegate cancellation to the existing
  service scope and wait interruptibly, including self/ancestor cancellation
  from a finalizer. External callers still join complete cleanup. Model tool
  calls already use independent Promise-bridge fibers; their interface is unchanged.
  Runner installs its exit finalizer before its child can be interrupted, then
  keeps the start wait and actual work interruptible. This prevents a child that
  exits before its first instruction from leaving the runner's done signal open.
  See [the lifecycle evidence](actor-lifecycle-alignment-2026-09-15.md).

- 2026-09-13 terminal publisher (historical partial fix): continuations gained
  a receipt recording whether their terminal envelope was actually published;
  failed sends do not suppress fallback notification. That receipt and its
  queued-work distinction remain. The former unjoined publication-to-receipt
  window is closed by the 2026-09-15 execution join, replacing the earlier
  decision to defer upstream's cancellation shape.

- Status: active
- Canonical owner: fork `main` actor/inbox runtime
- Observable contract: generation ownership, terminal claims, cancellation
  episodes, main prompt/command/init/shell/summarize/recovery/resume admission,
  busy/idle publication, persistent wake owner/follower behavior,
  execution-aware cancellation, inbox retirement tombstones, and parent notification
  are linearized per session and actor. `SessionPrompt.startPrompt`,
  `startCommand`, `startSummarize`, and `startResume` share
  `SessionRunState.startRunning` atomic admission; outer entry points report a
  typed `Session.BusyError`. That admission covers the synchronous entry points
  only. `POST /session/:sessionID/prompt_async` is deliberately outside it: the
  route is fire-and-forget, so it persists the user message through
  `SessionPrompt.prompt` before joining any in-flight run, never reports
  `Session.BusyError`, and declares no 409. A busy session queues the message
  for the running loop rather than dropping it. If that prompt joins a runner
  which had already taken its final snapshot, the caller checks whether the
  returned assistant covers its user row in the same actor transcript and
  starts or joins the successor run when it does not.
  CLI permission correlation is owned inside that admitted runner work, never
  by a waiter that merely joins it. A live in-memory run scope follows its
  initial user, successfully committed atomic continuations, and current
  interactive child work. It is not persisted on messages or actor records.
  Selecting an unrelated queued user closes the previous scope, including
  outstanding asks held by old children or captured bridges; completion,
  cancellation, and client loss also close it. Persistent inbox wakes and
  recovered actor generations do not inherit it. These correlation rules do
  not override existing system/background non-interactive permission routing.
  FD-001 owns the approval policy; [Yolo and run approval](yolo-run-approval.md)
  records the consumer and cancellation boundaries.
  Each persisted user row owns its optional `task_id`: `session.pre` uses the
  first actor-scoped user selected for the run, each loop iteration gives tools
  the task binding of its actual last user, and `session.post` reports the final
  selected binding. Synthetic continuation and context-boundary users inherit
  that binding; the caller that happens to win runner admission is not authority.
  Public session recovery and resume default to main. An explicit `agentID`
  selects only a controllable registered persistent full-context actor through
  the existing actor recovery lifecycle. Same-session registered targets may
  have another registered controller, and a peer can be addressed through its
  own session or original parent. Optional POST/tool `task_id` validates an
  existing value or atomically fills a missing binding from the trusted spawn
  task namespace. Missing tasks return 404; different bindings, blocked/terminal
  tasks and another owner return 409. Omitted/same-value inputs preserve the
  original task state, including historical archived bindings. GET stays read-only.
  No detached `resumeBackground` path is introduced. Unknown or ambiguous
  lifecycle callers fail closed.
  Explicit internal full-context persistent creation retains the existing
  lifecycle. The model-facing `actor spawn --context full --lifecycle persistent`
  extension belongs only to dev/compat after the 2026-09-15 alignment; main's
  spawn/run expose neither selector and retain their ephemeral defaults.
  No context-free persistent creation option is introduced through the tool.
  Separately, `actor resume <actor-id>` admits only a controllable registered
  persistent full-context actor retaining its original frozen context and
  receiver generation. It uses the persisted interrupted candidate's parent
  user and task binding, strict runner admission, and actor-owned completion.
  Internal retry and compaction users can advance that runner's current parent
  only through its own successful conditional-write receipt, preserving the
  original session, actor, agent, task and model source. A hook label alone
  grants no authority; failed conditional writes never advance the receipt.
  Inbox messages remain queued throughout recovery and use the existing wake
  path afterwards. Cancellation before successful admission withdraws the
  request without settling the old assistant; cancellation of an accepted
  caller cannot release the running actor's generation early. FD-009 owns the
  frozen-context and resolved-model/harness identity checks.
  Resume settles the selected old assistant after atomic runner admission and
  successful candidate validation. Optional task claim, started event, User
  binding and old assistant settlement share one immediate transaction; a
  synchronous commit callback transfers Actor ownership before another Effect
  can yield. Withdrawing before commit writes nothing; cancellation afterwards
  belongs to the accepted generation. This precedes the `admitted` signal and
  the new `runLoop`. Runner ownership and busy publication precede
  this work; the guarantee concerns successful admission, not every status
  event. Busy rejection, a stale-candidate `NotFoundError`, and cancellation
  before admitted work starts leave persisted messages unchanged. The existing
  run-loop finalizer remains as idempotent settlement cleanup.
  Frozen-context admission is owned separately by FD-009. Title locale
  propagation through prompt, command, and main resume remains independent of
  the constrained public actor selector.
  Actor registration is positive evidence for peer-only session-base behavior;
  an unknown actor cannot inherit a parent identity by a checkpoint fail-open.
  Actor `spawn` and `run` always create a fresh actor and reject the former
  `actor_id` resume argument. Follow-up work uses `send`: persistent peers may
  wake from idle, while a completed ephemeral full-context actor cannot be
  revived after its frozen context is released. A non-retryable processor error
  remains an explicit recovery candidate until recovery/resume or a newly
  admitted user turn abandons and completes it; background cleanup cannot
  silently remove that choice. Same-session subagent ask routing may inherit a
  persisted parent grant, but peers, explicit deny, and non-interactive
  boundaries do not.
- POLICY-01 lifecycle extension: Actor admission creates the generation and
  registers work inside one masked acquisition, then hands off its exact
  cancellation handle while the service still owns the resource. Cancellation
  before handoff joins cleanup, including post-stop work, and settles a work
  fiber that never started. Repeated old cancellation cannot act on a successor
  generation. Foreground timeout returns the still-running actor's ID; wait
  cancellation withdraws only that observer. Background notifications target
  the registered parent actor.
  Foreground main plan approval uses the actual assistant parent user in the
  existing conditional user-message transaction, committing the continuation
  and its parts together. Only a successful commit produces the trusted control
  receipt and registers the owned continuation. A newer queued user supersedes
  stale approval. The next turn selects build; the previous exec guest cannot
  continue. This receipt grants no general permission or lifecycle authority.
  Watch `src/tool/plan.ts`, `src/session/session.ts`, `src/session/prompt.ts`,
  and TUI `routes/session/{plan-switch.ts,index.tsx}` under `packages/opencode`.
  Tests include actor-owned-lifecycle, actor-exec-lifecycle, plan-approval,
  exec-interaction and real TUI plan-switch events.
- Upstream relationship: selectively adopts upstream typed Runner admission and
  busy failures plus actor-scoped `replace-agent`, while retaining the stronger
  fork generation, cancellation, disposal, persistent-peer, fail-closed identity
  evidence. Public actor recovery adapts upstream's `agentID` selector through
  the existing constrained actor lifecycle, without caller-supplied task
  replacement or detached background resume.
- 2026-09-18 synchronization: session abort cancels every runner and registered
  Actor in the target session. Terminal cancellation remains durable and is
  drained into parent main history without automatic wake or toast. Quiet
  delivery follows execution/generation and cancellation-episode ownership,
  including a quiet follower joining a registry-only cancel. Runner keys are
  nested by exact session and actor identity; leases, admission, retirement,
  disposal checks and terminal-delivery deduplication remain authoritative.
- Watch surfaces: `packages/opencode/src/actor/`,
  `packages/opencode/src/effect/runner.ts`, `packages/opencode/src/inbox/`,
  `packages/opencode/src/server/routes/instance/session.ts`,
  `packages/opencode/src/session/checkpoint.ts`,
  `packages/opencode/src/session/compaction.ts`,
  `packages/opencode/src/session/llm.ts`,
  `packages/opencode/src/session/message-v2.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/session/run-state.ts`,
  `packages/opencode/src/session/session.ts`, `packages/opencode/src/task/registry.ts`,
  `packages/opencode/src/tool/actor.ts`, `packages/opencode/src/tool/plan.ts`,
  `packages/opencode/src/tool/session.ts`,
  `packages/sdk/openapi.json`, and `packages/sdk/js/src/v2/gen/`.
- Tests/evidence: actor lifecycle/cancel/spawn/turn suites,
  `packages/opencode/test/server/session-actor-recovery.test.ts` exercises real
  HTTP/v2 SDK subagent and peer recovery, including independent receiver
  directories, exact candidate identity, concurrent 202/409, rejected control
  paths, task overrides, cancellation and expired receiver/model identities.
  See [public actor recovery](actor-recovery-api.md).
  Existing evidence also includes
  `packages/opencode/test/inbox/fork-agent-compat.test.ts`, inbox wake/retirement
  tests, `packages/opencode/test/effect/runner.test.ts`, server
  prompt/prompt_async-queue/recovery and resume admission tests
  (`packages/opencode/test/server/session-prompt-busy.test.ts`), session
  run-state tuple/disposal tests, closing-run success/failure/non-assistant
  handoff, stale-continuation/compaction, cancel, and per-user task-binding tests,
  default-main and constrained actor-selector OpenAPI regressions, replace-agent actor-scope regressions, and
  actor/session tool tests at the reviewed main behavior.
- 2026-09-07 recovery-timing review: adapted upstream early settlement inside
  `startResume` validation rather than before the fork's atomic admission.
  `test/session/prompt-effect.test.ts` observes the old assistant already
  completed while `session.pre` blocks the new loop; it covers subsequent
  success, partial-context retention, finalizer idempotence, real
  non-retryable-error recovery, and unchanged messages on all three rejected or
  cancelled admission paths. Main-only identity and locale propagation remain
  unchanged.
- 2026-09-05 subtask review: adopted terminal-state assignment and the
  running-only metadata guard. A real cancellation regression calls late
  metadata after settlement and requires the entire persisted tool part to
  remain unchanged. Prompt queue admission, task binding, and atomic derived
  user creation remain unchanged.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
- 2026-08-28 review: adopted strict spawn/run argument rejection and the
  existing `send` follow-up path while preserving caller-resolution,
  generation, persistent wake, and frozen-context fail-closed contracts.
- 2026-09-02 session-ID format review: adopted marker-free descending session
  IDs while retaining the same `ses` namespace, opaque lookup semantics, and
  lifecycle/admission/resume ownership. Existing `ses_-...` identifiers remain
  valid inputs; message descending IDs deliberately retain their chronology
  marker.
- 2026-09-03 correction: `prompt_async` had been routed through `startPrompt`
  since `1cfe7efc`, which made the whole of `promptWork` — `createUserMessage`
  included — the admitted work, so a busy session answered 409 and never
  persisted the message. The TUI's queue depends on that message existing, so
  typing during a turn silently lost the input. Admission for the fire-and-forget
  route is now the upstream `prompt` path again; the synchronous `/message`,
  `/init`, `/summarize`, `/command`, and resume routes keep `startRunning`,
  which is what the zombie-runner hardening in `1cfe7efc` was for.
- 2026-09-04 closing-window correction: a persisted prompt that joins an older
  successful, failed, or non-assistant runner result hands off through the
  existing `run` path until an assistant covers it. Pure interruption and a
  shared `MessageAbortedError` stop handoff; a joined failure is retried once,
  while failure from work this caller actually started is preserved. Coverage
  uses actor transcript order and assistant `parentID`, without tickets, tail
  movement, new Runner state, cancellation generation, or detached delivery.
  Optional task authority is persisted with each user row and resolved from the
  actor-scoped user actually selected by the loop, not from whichever queued
  caller wins successor admission; derived synthetic users preserve the binding.
  Old assistant results remain durable, but a derived synthetic/control user or
  compaction follow-up is committed only while its source user is still latest
  for the actor. That check, the message, and all of its parts share one immediate
  database transaction. Pre-persistence prompt parsing, caller interruption,
  process disposal, and durable exactly-once delivery remain outside this contract.
- Retirement condition: upstream provides equivalent generation ownership,
  typed atomic main prompt/command/init/shell/summarize/recovery/resume
  admission, default-main and constrained public actor recovery identity, equivalent constrained
  actor recovery, cancellation settlement,
  stale-idle exclusion, persistent-peer wake, tombstone, and parent-notice
  guarantees plus positive known-peer evidence for parent identity replacement,
  with behavior-focused regressions.

- 2026-09-12 wake-routing retirement (historical): a woken non-main turn moved
  to ActorExecution and runTurn instead of the fork wake generation. Spawn's
  execution claim was deferred after a timeout was attributed to a nested actor
  sharing its key. The 2026-09-15 review withdraws that causal claim: with the
  corrected InboxArrived observation, the nested primary case and actual
  spawn-before-continuation ordering pass. Spawn now holds the same execution
  claim. Earlier removed wake-generation-specific tests remain historical;
  generation ownership, terminal claims and disposal provenance remain shared
  contracts for spawn and actor resume. The two remaining quarantines are now
  active; no upstream PR is opened for this fork correction.
- 2026-09-11 recovery-predicate and resume-override review: adopted the part of
  upstream's allowlist predicate that is a genuine fix — a step-level
  `time.completed` does not prove the round finished, so a turn that stopped on
  `tool-calls` or `length` is a candidate again, while a clean `stop`/`other`
  turn is not — and its idempotent settlement of an already-errored assistant.
  Upstream additionally keeps every errored message a candidate even after it is
  settled; that is not taken. `time.completed` remains this entry's settlement
  marker: the processor leaves an errored turn without it so recovery can find
  it, and `sweepOrphanAssistants`/`abandonRecoveredAssistant` set it when a new
  user admission or a resume abandons the turn, which is what "until
  recovery/resume or a newly admitted user turn abandons and completes it"
  means above. The settlement guard is now "completed and errored" rather than
  "completed" so a `tool-calls`/`length` candidate that already carries
  `time.completed` can still be settled; the fork's `expectedParentID`
  candidate-identity check is unchanged and still runs before any write. Upstream's `resume` / `resumeBackground` remain absent:
  the optional model override is plumbed through the single `startResumeTurn`
  admission path, resolved before `commitRecoveryCandidate` so an unresolvable
  model settles nothing, and the classification skip uses the candidate the
  runner actually settled rather than the caller's argument. `packages/sdk/`
  artifacts are regenerated from the merged route; FD-009 owns the actor
  frozen-identity refusal. Evidence:
  `packages/opencode/test/server/session-recovery.test.ts` predicate matrix plus
  the two fork-owned cases, plus `packages/opencode/test/session/prompt-sweep.test.ts`
  for the settlement boundary; the predicate is mutation-checked from both
  sides, since the fork's older exclusion loses the `tool-calls`/`length` fix and
  upstream's exclusion loses the settlement contract.

- 2026-09-09 POLICY-02 review: registered/live-context recovery target selection,
  task consistency and missing-binding admission are integrated at `6ff976a97026610335dc367d8875a87d1d91d1a7`.
  The retained spawn task namespace, synchronous commit/ownership boundary and
  metadata-only background updates preserve existing task and message sources.
  HTTP/SDK/tool publication and actual provider/transaction regressions are
  recorded in the shared history; no cross-restart recovery is introduced.

- 2026-09-15 retired-path cleanup: production inbox turns use ActorExecution
  and SessionPrompt. The unused `Actor.runPersistentTurn`, private
  `continueTurn` and sole-consumer `WakeSourceDisposal` are removed. Existing
  `finishPersistentTurn` and `acquireWake` remain because resume uses them.
  Ten old tests were individually mapped to actual Inbox/cancellation/lock
  paths or explicitly retired obsolete DTO/owner-follower semantics; the
  independent ten-case regression passed. Real continuation notifications
  arrive through the parent Inbox without a toast. This does not reinstate the
  deleted testing entry's notification policy. See F09 in
  [the implementation report](audit-followups-2026-09-15.md).

- 2026-09-15 shared chronology/admission: caller IDs are identity keys, not
  admission order. `createMessage` allocates an actor-local monotonic committed
  timestamp; metadata updates preserve creation time and completion cannot
  precede it. User and derived-user message/parts submitted through
  `commitUserMessage` or `commitUserMessageIfLatest` are committed together
  with session/actor/part ownership validation; latest-user conditional
  admission shares that transaction. Same-owner prompt retries may reuse
  producer-generated part IDs only when the complete current persisted content
  matches. Anonymous parts match by relative order; explicit IDs and complete
  persisted content/metadata remain strict. Reordering explicitly identified
  input parts can be equivalent after canonical sorting. Runtime-added
  parts can make a later replay conflict. This is not a lifetime replay receipt.
  Inbox draining commits its synthetic user message, all rendered parts and the
  selected queue deletion in one immediate transaction. After asynchronous seed
  resolution, admission rechecks cancellation, persistent-peer retirement and
  the still-present receiver rows under that write lock. Concurrent drains or GC
  cannot replay a previously selected row. Failed writes leave the whole batch
  queued; postcommit observers see the complete transcript and consumed queue.
  A publication callback failure preserves the committed drain count, while
  Effect interruption still propagates. This guarantees queue-to-transcript
  atomicity, not exactly-once model execution or durable event delivery. See
  [the crash/reopen evidence](inbox-crash-consistency-2026-09-15.md).
  Shell message/parts writes and streamed assistant/tool output remain outside
  the `commitUserMessage*` transaction.
  Fork/revert and cursor
  consumers use chronological positions, with UTF-8 ID ties matching SQLite
  BINARY. Producer and transaction regressions are recorded under F06 in
  [the implementation report](audit-followups-2026-09-15.md).

## FC-002 — canonical checkpoint writer and mode-specific frozen context

- Status: active
- Canonical owner: fork `main` checkpoint/session runtime
- Observable contract: checkpoint generation uses one canonical writer tool and
  an isolated child session. Forked mode is the default and uses the parent
  agent's frozen prefix; explicit `checkpoint.fork: false` uses the checkpoint
  writer's own frozen system, tools, MCP membership, and permission with the
  aligned message delta. Stable per-session memory instructions retain the
  literal `{current_session_id}` placeholder in frozen history and resolve it
  only at filesystem-tool boundaries. Disabling checkpoint generation removes
  checkpoint-only clauses while retaining durable project/global memory and
  notes guidance. FD-009 exclusively owns the fail-closed capture admission
  decision. Complete authorized definitions and advertised names are captured
  separately for both writer modes, including independently frozen native
  Actor input contracts in warm and cold capture; explicit non-fork writers
  also retain their own resolved model identity when no warm prefix exists.
- POLICY-04 carrier review: cold capture pins a complete catalog/system/history
  pair; warm capture reuses the stored layout. Full-context Actors and writers
  inherit that copied pair, including legacy layout, without rereading a live
  catalog or expanding frozen native-tool authority. FC-005 owns migration.
- Upstream relationship: fork extension plus adapted request construction.
- Watch surfaces: `packages/opencode/src/session/checkpoint.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/session/memory-path-template.ts`,
  `packages/opencode/src/session/prefix-capture-ref.ts`,
  `packages/opencode/src/session/llm.ts`, and
  `packages/opencode/src/session/prompt.ts`; Read/Write/Edit/Glob/Grep and
  `apply_patch` filesystem boundaries.
- Tests/evidence: checkpoint child-session, fork-mode, main-slice,
  prefix-capture, rebuild, watermark, writer-timeout, memory-write, and
  system-prompt suites plus `memory-path-template.test.ts` at the reviewed main
  behavior.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0b665c7e681e44cac6f1a6acf18732015fb2bf86`.
- Retirement condition: upstream exposes the same canonical writer, isolated
  child, mode-specific prefix ownership, aligned delta, disabled-checkpoint
  guidance behavior, and stable placeholder resolution only at filesystem-tool
  boundaries; FD-009 remains separately satisfied or retired.

- 2026-09-11 history-escalation copy review: the verbatim elision marker and its
  doc comment now point at `history around` followed by `get(part_id)` instead of
  `around` alone, because upstream's bounded history returns summaries from
  `around` and the original text from `get`. That is factually correct in this
  fork, which merged the same history tool. The two lines are the entire
  incoming change to `src/session/checkpoint.ts`; the writer modes, frozen
  context, watermark advancement and token budget are untouched.

- 2026-09-15 memory convergence: upstream `9780b2e5` adopts the fork's
  disabled-checkpoint memory behavior. Only that clause converges: canonical
  writer modes, frozen prefix authority and stable filesystem placeholders remain
  shared. FD-002 still separates memory eligibility from fail-closed actor
  identity replacement.

## FC-003 — actor- and instance-scoped read-before-edit state (retired)

- Status: retired by the approved 2026-09-15 behavior change.
- Scope: shared main and inherited dev/compat.
- Decision: adopt upstream `99a5f9eb` through `5198ff54`, removing the
  read-before-edit gate itself. Actor/instance-scoped evidence no longer has a
  consumer. This supersedes the former requirement for equivalent upstream
  scoping; it does not claim that upstream supplied that implementation.
- Retired surfaces: `src/tool/read-state.ts`, Read's `markFileRead` calls,
  Edit/NotebookEdit's prior-read checks, and scope-only read-state tests.
- Retained behavior: permission and path checks, current-file edit matching,
  stable current-session path resolution, finite media types, and attachment
  refusal/compression. The latter assertions remain in `test/tool/read.test.ts`;
  path, no-prior-read, and self-written-file edits remain in `test/tool/edit.test.ts`.
- Historical isolation and attachment-gate reviews remain in the shared registry
  history. Reintroducing a gate would require a new explicit behavior decision.

## FC-004 — MCP configuration and connection lifecycle

- Status: active
- Canonical owner: fork `main` MCP runtime
- Observable contract: remote MCP URLs must parse as HTTP(S); malformed or
  unsupported values produce a stable failed status before client creation.
  Claude-imported entries remain pending unless MiMoCode configuration explicitly
  sets that entry's `auto_connect: true`, or a caller connects manually.
  `enabled: false` takes precedence; `auto_connect: false` keeps an enabled
  entry pending. Imported command/URL provenance and MiMoCode control overrides
  are preserved separately; a Claude file cannot grant its own auto-connect.
  Request-local discovery/loaded-tool membership stays isolated across sessions
  and frozen forks. Local stdio servers retain bounded exit and stderr
  diagnostics across fast natural exits and host shutdown; secrets are redacted
  before either logs or failed status details expose the diagnostic. In Codex
  compact mode, authorized MCP wrappers remain available through exec and
  compatible hidden direct calls, without requiring an invisible search call.
  Request-disabled tools never enter a warm frozen executable pool. Other
  harnesses retain explicit search/load gating when that feature is enabled.
- POLICY-01 carrier review: request-pinned MCP membership remains unchanged;
  same-named MCP tools cannot acquire canonical Actor/plan control identity or
  its commit callback. Imported-server and transport policies are unchanged.
- Upstream relationship: adapts released automatic connection through explicit
  per-entry configuration; retains fork validation and lifecycle hardening.
- Watch surfaces: `packages/opencode/src/mcp/index.ts`,
  `packages/opencode/src/config/mcp.ts`, `packages/opencode/src/config/config.ts`,
  `packages/opencode/src/mcp/oauth-callback.ts`,
  `packages/opencode/src/mcp/oauth-provider.ts`,
  `packages/opencode/src/mcp/stdio-transport.ts`, plus request-local MCP
  propagation in session prefix and tool-registry code.
- Tests/evidence: `packages/opencode/test/mcp/lifecycle.test.ts`,
  `packages/opencode/test/mcp/claude-auto-connect.test.ts`, config merge tests,
  `packages/opencode/test/mcp/oauth-auto-connect.test.ts`,
  `packages/opencode/test/mcp/oauth-browser.test.ts`,
  `packages/opencode/test/mcp/oauth-callback.test.ts`, the isolated real-process
  `packages/opencode/test/mcp/stdio-exit-observe.test.ts`, and frozen
  prefix/tool-search regressions prove URL rejection, pending imports, OAuth
  callback/connection behavior, redacted exit diagnosis, and request isolation
  at the reviewed main behavior.
- 2026-09-15 real protocol evidence: `test/mcp/real-transport-oauth.test.ts`
  launches an isolated non-test child using the actual MCP SDK HTTP transport
  and a self-owned OAuth issuer. Resource/issuer discovery, DCR, S256 PKCE,
  callback, read-only tool execution, token refresh and pending-auth cancellation
  pass on loopback and a self-owned local RFC1918 interface. This is concrete lab
  evidence, not enterprise IdP/proxy/TLS interoperability or a new fork-wide
  private-network policy. DC-NET-002 remains compat-owned. See the
  [runtime evidence](runtime-validation-2026-09-15.md).
- 2026-09-08 selected integration: `auto_connect` explicitly enables a selected
  imported server while retaining pending defaults and disabled precedence.
  The real-transport regression runs in an isolated child process to avoid
  unrelated suites' process-wide MCP SDK mocks. Usage and source precedence
  are documented in [Claude MCP auto-connect](claude-mcp-autoconnect.md).
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
- 2026-09-01 OAuth branding review: adopted upstream's MiMoCode callback-page
  and dynamic-registration literals. This is a clean carrier overlap only;
  URL validation, pending-import state, request isolation, bounded diagnostics,
  and secret redaction are unchanged.
- Retirement condition: upstream matches URL validation, explicit import auto-connect and pending-import
  lifecycle, request isolation, and frozen membership; model identity and tool
  authority still satisfy FD-005 and FD-006.

## FC-005 — permission-consistent skill discovery and invocation

- Status: active
- Canonical owner: fork `main` skill/session runtime
- Observable contract: skill listing, reminders, search, and loading use the
  same effective permission, agent allowlist, and user tool toggles. Stable
  global discovery runs in a scoped producer that one caller cannot cancel;
  failures remain retryable and reload invalidates the generation. The
  authorized catalog is a frozen system-tail block after environment/format
  and before instruction files. An internal schema-3 snapshot stores canonical
  text, its SHA-256 content version, and originating user turn ID. Within the
  same authorized prefix profile, tool continuations, retries, recovery and
  synthetic continuations reuse that catalog; a later direct user turn may
  refresh it, including to an explicitly empty catalog. Advancing the message
  watermark does not change catalog ownership. Loaded skill bodies remain in
  their existing messages and tool results.
  Legacy SQL NULL means the old system/messages pair, not an empty catalog.
  Continuing that old turn preserves its pair; a new direct turn migrates it.
  New-layout projection suppresses only strictly recognized generated catalog
  parts, without deleting or rewriting stored history or user quotations.
  Codex routes skill/search invocation through exec with the same validators
  and permission gates. Completed nested skill loads identifiable in retained
  validated records protect the containing exec result from pruning.
- POLICY-01 carrier review: skill/custom registry entries and definition hooks
  cannot acquire canonical Actor/plan authority by name or expand the frozen
  native Actor contract. FD-006 owns this control boundary; skill matching,
  catalog placement and activation policy are unchanged by this selection.
- POLICY-04 adoption: selects the system-tail placement from release
  `2a0eb706e95a77cba34a319e9f11f33f26d4450c` and upstream snapshot
  `0abfeba186191c1a361cf3f27b802e9d29bf0fdc`, while retaining the fork's frozen
  prefix, permission and legacy-pair boundaries. N=1; the overall upstream
  baseline is unchanged. See [skill catalog layout](skill-catalog-system-tail.md).
- Upstream relationship: upstream discovery and catalog placement are retained
  with stronger shared permission, producer-lifetime and frozen-pair gates.
- Watch surfaces: `packages/opencode/src/skill/index.ts`,
  `packages/opencode/src/skill/search-access.ts`,
  `packages/opencode/src/session/skill-catalog.ts`,
  `packages/opencode/src/session/message-v2.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/session/prefix-snapshot.ts`,
  `packages/opencode/src/session/session.sql.ts`,
  `packages/opencode/migration/20260908000000_session_prefix_skill_catalog/migration.sql`,
  `packages/opencode/src/tool/skill.ts`,
  `packages/opencode/src/tool/skill-search.ts`,
  `packages/opencode/src/session/observed-tool-parts.ts`,
  `packages/opencode/src/session/compaction.ts`,
  `packages/opencode/src/session/system.ts`, and
  `packages/opencode/src/session/prompt.ts`.
- Tests/evidence: skill search/description/discovery and tool skill/search
  suites retain the permission contract. `skill-catalog-system-tail.test.ts`
  checks actual provider recovery, next-direct-turn migration, same-turn tool
  continuation, cold capture and compaction; `skill-catalog-capture.test.ts`
  covers capture freezing. `skill-catalog.test.ts`, `message-v2.test.ts` and
  `prompt-skill-command-multi.test.ts` cover historical recognition, loaded
  bodies and filtered system placement. `prefix-snapshot.test.ts` and
  `test/storage/prefix-skill-catalog-migration.test.ts` cover metadata and real
  old-database migration. Session tests are under `packages/opencode/test/session/`.
  Local evidence does not assert publication, exact-head CI or compat acceptance.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0b665c7e681e44cac6f1a6acf18732015fb2bf86`.
- Retirement condition: upstream uses one effective permission/tool decision
  across discovery and invocation and provides equivalent retryable,
  generation-aware producer behavior plus versioned system-tail snapshots,
  same-turn freezing and lossless legacy-pair migration without rewriting
  history; FD-006 remains the tool-authority owner.

## FC-006 — instance-local plugin memory-write decision

- Status: active
- Canonical owner: fork `main` plugin service and plugin API
- Observable contract: the subagent progress checker receives
  `memoryWriteEnabled` from the same instance-local configuration service used
  by memory write gates. It does not depend on an HTTP config round trip that
  can reject a valid out-of-cwd worktree; an absent value remains fail-open for
  manual hook calls.
- Upstream relationship: fork integration hardening for the existing progress
  checker.
- Watch surfaces: `packages/opencode/src/plugin/index.ts`,
  `packages/opencode/src/plugin/subagent-progress-checker.ts`, and
  `packages/plugin/src/index.ts`.
- Tests/evidence:
  `packages/opencode/test/plugin/subagent-progress-checker.test.ts` exercises
  enabled, disabled and absent values passed directly to the hook.
  `packages/opencode/test/plugin/subagent-progress-chain.test.ts` additionally
  runs three isolated real Config/built-in Plugin/Actor/Write chains. Opposing
  checkout/worktree memory settings remain isolated during interleaved calls,
  even though the actual out-of-cwd HTTP config request is rejected. Disabled
  writes fail without a journal or reentry; enabled writes complete a five-section
  journal after one postStop nudge; a read-only actor receives no impossible
  write request. The model response is scripted; application services and the
  Write tool are real. [Runtime evidence](runtime-validation-2026-09-15.md)
  distinguishes this chain from the earlier direct-hook tests.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.
- 2026-09-10 hook-validation review: upstream `1493f7813e3041e9da2ea52738940591d03ed8a8`,
  merged by `cb00c2808043bb0c4f0a4cfc5855912d82c9abe8`, routes every registration
  path through `registerHook` and guards the trigger, config and event loops, so
  a plugin resolving to a non-object is skipped with a warning. FC-006's
  instance-local `memoryWriteEnabled` injection into the `actor.postStop`
  aggregate is preserved on top of the rewritten loops, including its fail-open
  behavior when the value is absent.

- Retirement condition: the progress-checker hook no longer writes memory or
  upstream supplies an equivalent instance-local decision without HTTP/cwd
  coupling.

## FC-007 — protected roots, fixed instance cwd, inert SDK event, deletion boundaries, and optional context

- 2026-09-17 synchronization: Upstream removed automatic isolation and its notice. Retain this owner's explicit opt-in post-success notice, config and mutation metadata; reject the intermediate hard write gate. Adopt removal of the unused conflict-detection auto-create route and regenerate its SDK/OpenAPI removal. Ordinary explicit worktree operations remain. The notice is independent of auto-creation.

- Status: active
- Canonical owner: fork `main` instance and Bash path-safety boundary
- Observable contract: session cwd is the fixed `Instance.directory`;
  `SessionCwd.get()` has no mutable store, setter, or cleanup. The
  `SessionCwd.Event.Changed` declaration and generated `EventSessionCwd` schema
  remain solely for SDK compatibility; no source path publishes the event or
  changes the fixed cwd. No `change_directory` tool or TUI session-cwd override
  exists. File tools accept relative paths only by resolving them against that
  immutable instance cwd; MultiEdit applies the same normalization to every
  entry. Callers address other directories with absolute paths or an explicit
  `workdir`. Filesystem root and protected system directories cannot become
  project instances. A deletion target containing, equaling, or lying inside the active
  project/worktree cannot receive the temporary-file no-confirmation exemption.
  A non-temporary deletion uses one `bash_delete` confirmation for the full
  command, after checking explicit denies for its Bash and external-directory
  effects. Only an actual reply or explicit forwarded one-shot approval of
  that full-command request replaces ordinary asks; automatic deletion approval still runs ordinary Bash/path authorization.
  Delete auto-approval, including dangerous startup, is evaluated in
  the Permission service after explicit `bash_delete` denies; it cannot skip
  those earlier Bash/path deny checks. Broad ordinary allow rules do not
  silently grant deletion, and a matching deny is not bypassed by a one-time
  CLI run reply. The existing temporary-only path remains separate and still
  passes through ordinary Bash/external-directory authorization.
  Optional context lookup supports pre-install state without weakening the
  throwing accessor used by ordinary runtime paths. When explicitly enabled,
  Auto-Worktree guidance is emitted only after a successful main-worktree
  mutation, only for a primary root session, and only once per session; omitted
  or false configuration remains silent. Detection consumes completed absolute
  tool metadata and does not cache a pre-repository negative lookup. Validated
  terminal nested exec effects retained within the snapshot budget feed the
  same detector; exec_command evidence
  is normalized to Bash and never bypasses its success/path checks.
- Upstream relationship: adopts the shared fixed-instance-cwd simplification
  and inert SDK event compatibility while retaining fork root and deletion
  safety hardening; FD-001 separately owns startup delete approval and the
  residual prohibition on run-driven shared approval mutation.
- Watch surfaces: `packages/opencode/src/project/instance.ts`,
  `packages/opencode/src/util/local-context.ts`,
  `packages/opencode/src/tool/bash.ts`,
  `packages/opencode/src/tool/read.ts`,
  `packages/opencode/src/tool/write.ts`,
  `packages/opencode/src/tool/edit.ts`,
  `packages/opencode/src/tool/multiedit.ts`,
  `packages/opencode/src/tool/glob.ts`,
  `packages/opencode/src/tool/grep.ts`,
  `packages/opencode/src/tool/apply_patch.ts`,
  `packages/opencode/src/tool/auto-worktree-hint.ts`,
  `packages/opencode/src/session/observed-tool-parts.ts`,
  `packages/opencode/src/tool/session-cwd.ts`, and
  `packages/opencode/src/tool/registry.ts`; TUI cwd context/sidebar/plugin API;
  and generated SDK/OpenAPI event surfaces.
- Tests/evidence: project path/worktree/instance-disposal suites,
  `packages/opencode/test/installation/no-instance.test.ts`, and
  `packages/opencode/test/tool/bash.test.ts` cover exact-path, prefix, and
  missing-context behavior; Edit/MultiEdit regressions cover relative resolution
  against the fixed cwd. Registry/agent/tool-script fixtures plus source and
  generated-artifact review cover removal of the mutable cwd surface and prove
  the compatibility event is declared but never published; the removed
  upstream `session-cwd.test.ts` is not claimed as runtime evidence.
  Auto-Worktree config, notice, Bash-write, and path-scan regressions cover the
  explicit toggle, one-shot notice, real mutations, negative cache, and
  completed apply-patch metadata.
  `test/tool/bash-delete-permission.test.ts` and
  `test/permission/auto-approve-delete.test.ts` under `packages/opencode` cover
  the deny-first deletion path, dangerous-startup grant, and single deletion
  confirmation; run lifecycle evidence belongs to FC-001/FD-001.
- 2026-09-05 Bash-output review: accepted token-budget truncation while
  retaining `pathsOverlap`, `tmpOnlyDelete`, explicit delete approval, and
  immutable instance-cwd handling. Full output remains archived independently
  of the inline preview; `metadata.truncated` prevents wrapper re-truncation.
- 2026-09-07 explicit model API review (historical; superseded by FD-004's
  2026-09-14 retirement): capability discovery and token-scoped
  model API admission use a fixed startup directory. Requests cannot select a
  different directory or workspace; the new Node token export is opt-in host
  functionality. FD-004 remains the canonical listener/auth owner. Coverage:
  `test/server/model-api.test.ts`, shared `server/api-request.ts`, and CLI tests.
- POLICY-03 carrier review (historical model-token containment; superseded
  by FD-004's 2026-09-14 retirement): TUI-generated Basic authentication is distinct
  from operator configuration. Both instance-route directory guards and the
  non-loopback bind guard preserve their operator-origin policy; automatic
  credentials cannot authorize a broader directory. Model tokens retain their
  exact startup directory and reject workspace switching regardless of Basic
  credentials. Existing orchestrator and explicit noAuth exceptions retain
  their original scope. The fixed-cwd and deletion contracts above are unchanged.
  Current `/v1` token checks run inside the route after instance bootstrap;
  operator-password servers follow upstream's directory policy. The historical
  no-workspace/pre-bootstrap clauses do not describe today's capability API.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0353965ea38ce3d963f123acb2f9a965bcbb98c3`.
- Retirement condition: upstream retains fixed instance cwd and supplies
  equivalent inert compatibility schema, protected-root, project/worktree
  containment, fixed-cwd relative file-tool resolution, MultiEdit normalization,
  deletion, and optional-context semantics without forbidding legitimate
  temporary projects.

- 2026-09-09 POLICY-02 review: registered/live-context recovery target selection,
  task consistency and missing-binding admission are integrated at `6ff976a97026610335dc367d8875a87d1d91d1a7`.
  The retained spawn task namespace, synchronous commit/ownership boundary and
  metadata-only background updates preserve existing task and message sources.
  HTTP/SDK/tool publication and actual provider/transaction regressions are
  recorded in the shared history; no cross-restart recovery is introduced.

## FC-008 — bounded workflow cleanup and targeted CI quarantine

- 2026-09-19 synchronization: The three new subagent-resume suites share the dedicated real-AppRuntime recovery job. Combined unit execution reproduced a missing prefix captor after focused test layers disposed the global reference; discovery requires all four recovery files and JUnit verifies every file. This changes test isolation, not product behavior.

- 2026-09-17 per-run test roots: `test/preload.ts` roots the process-wide data
  directory (`mimocode-test-data-<pid>`, holding the XDG directories and HOME)
  under the resolved `os.tmpdir()` again, as upstream does. Its home-directory
  placement predated `62fd366c`, after which Instance accepts temp-tree project
  directories such as worktrees under `Global.Path.data`. The temp directory is
  resolved because macOS's sits behind the `/var` symlink and runtime events
  report canonical paths: unresolved, three `test/workflow/runtime-worktree.test.ts`
  cases failed on macOS, which Linux CI's `/tmp` cannot reproduce.
  Default fixture projects are rooted under the resolved `/var/tmp` on POSIX
  (then the home directory, the git-free parent of cwd, and temp as fallbacks;
  Windows keeps those fallbacks). A non-git fixture's worktree is `/`, so config,
  command and skill discovery walk every ancestor. Measured on macOS: rooted
  under home, a probe fixture discovered the developer's own `~/.mimocode` and
  `~/.claude`, and 23 of its 63 skills came from the real home; rooted inside the
  checkout as upstream does, it loaded the repository's `.mimocode`, and a full
  6458-case run failed seven fork-only deletion/listener security cases
  deterministically because their "outside" directory joined the project
  worktree; rooted under `/var/tmp`, nothing was discovered and the full run
  passed.
  CI runners have no such home directories, which is why the home placement
  stayed green there. The root also stays outside the temp tree: Bash exempts
  temp-only deletions, so a fixture project there would let the "target outside
  temp" deletion cases pass through project containment instead. The candidate
  filter mirrors Instance's current protected paths; its earlier `/root` and
  `/var` prefixes had been stale since upstream `20b79f71`. `root: "home"` is
  removed: `test/file/path-traversal.test.ts` passes in upstream's form, so its
  helper and the shared `~/.mimocode-home-fixtures` directory are gone.
  `test/fixture/fixture-root.test.ts` requires that nothing discoverable lies
  above a non-git fixture; with the home root restored it fails, listing the
  home directories. `outsideGit`
  fixtures now sit under a per-process `/tmp` root that the preload passes to
  `test/fixture/fixture.ts`. Every root is `<prefix><pid>`. Preload startup
  reclaims, best effort, roots whose process no longer exists and never touches
  another live or EPERM PID, which covers killed and timed-out runs. A root
  already named for the current PID belongs to a run whose PID was reused; it
  is removed with retries, and a removal that still fails stops the run instead
  of letting it inherit that state. afterAll removes the roots
  synchronously before any timer await; only a root that fails there (Windows
  EBUSY) takes the existing GC-and-retry path, followed by a last synchronous
  pass. Under Bun 1.3.14 `bun test` runs no `exit` listeners, stops awaiting
  afterAll at its first timer when a test file fails to load, and detached
  Config dependency installs recreate removed paths whenever the hook yields.
  Before: a concurrent-writer reproduction leaked the data root in 3 of 3 runs,
  and each probed load-failure run left its root. After: 0 of 6 and 0 of 3. The
  three roots of a SIGKILLed run were reclaimed by the next run while a
  concurrently running process kept its own.

- 2026-09-17 tests no longer write into the checkout: a package test run used to
  leave `.mimocode/package.json`, a lockfile and `node_modules` at the
  repository root, and `packages/opencode/.mimocode/` (`.cron-lock`,
  `.gitignore`, installed dependencies) inside the checkout. Upstream's copies of
  the same tests use the same paths. There were two writers. A session boot
  starts the cron bridge, which is on by default, and its scheduler lock and
  task file follow `process.cwd()`, which is this package directory. The harness
  keeps that production path enabled instead of switching cron off. When
  `process.cwd()/.mimocode` is absent at startup, the preload creates it with a
  non-recursive mkdir. Only when that call created it does the preload record the
  directory's identity (device, inode and birth time) in a marker in
  the temp directory. A directory someone else created, or deleted and
  recreated, never matches that identity. The owned directory is removed at the
  end of the run, and a killed run's is reclaimed at the next startup, unless
  another test process (a live `mimocode-test-data-<pid>` root) or a live
  foreign `.cron-lock` owner may still use it. A lock that cannot be parsed yet
  counts as live, because a scheduler opens it before writing its owner, until
  it has gone a minute without changes. The lock is re-read immediately before
  the removal, which backs off if the lock changed; what remains is the same
  check-then-rename interval the scheduler's own takeover has. It is removed only while it holds
  nothing beyond runtime artifacts (`.cron-lock`, `.gitignore`,
  `package.json`, `package-lock.json`, `bun.lock` and `node_modules`). Any
  other content, such as `scheduled_tasks.json`, hands the directory over by
  dropping the marker. Without the end-of-run release,
  `cancel-notification.test.ts` leaves the directory behind. The cron suites
  stay in upstream's form. The second writer was instances rooted in the repository,
  which ran config discovery against its `.mimocode` and installed dependencies
  there. `bash.test.ts`, `webfetch.test.ts` and `websearch.test.ts` now use a git
  fixture instead of the checkout, and `read.test.ts` reads a copy of its large
  image from a fixture. Route requests that named no directory booted an
  instance for `process.cwd()`. The `workflows-route`, `session-messages`,
  `session-task-route`, `session-select`, `title-authority` and
  `session-actions` server tests now send their fixture directory on every
  request. Unauthenticated servers only admit directories under cwd, so those
  fixtures move under `root: "cwd"`. `worker-listener.test.ts` gives its cwd
  fixtures a git root and names that directory on the requests that boot an
  instance (`/config`, and `/v1/models`, whose route bootstraps before checking
  its token). The writers were located file by file and, for those that only
  wrote alongside others, by order-preserving bisection of the CI shard order.
  Before the change, each of those tests left repository artifacts; after it,
  none did.

- 2026-09-15 runtime acceptance infrastructure: the shared test workflow adds
  a Windows job for compat PR/push and explicit manual dispatch. Bun follows the
  package declaration and dependencies use `bun ci`, including the shared
  `.github/actions/setup-bun` composite after the CI reproducibility review.
  A missing Windows entry
  fails. The job records event, checkout and PR-head SHAs separately and uploads
  bounded evidence. DC-PLATFORM-001 owns the actual compat archive/no-rg entry;
  a skipped main-side Windows job is not a platform acceptance result. Existing
  Linux jobs and their failure/reporting boundaries are preserved.

- 2026-09-15 quarantine closure: both remaining registered actor cases run
  normally: postStop failure preserves a successful result with warnings, and
  inbox waits for the entire spawn execution. The warning test now covers
  foreground/background and outcome/wait/persistence/parent notice. No new skip
  replaces either case. Final cancellation regressions cover the Runner
  pre-first-instruction exit, owner-acquisition interruption, queued execution
  admission, cancellation before worker startup and direct Effect hook
  self/ancestor cancellation. Workflow agent timeouts
  bound the cancellation join to the existing reclaim grace while detached
  cleanup continues; shared cancellation retains interrupt/join semantics.
  The dated actor quarantine entries below describe their historical snapshots.
  The separate workflow deadline case is restored. The restored
  `it.live` case proves the hanging LLM request was consumed, a child worktree
  and running Instance existed, the exact workflow deadline fired, and the
  worktree and Instance were disposed. Its former two-second deadline could
  precede child startup; the test now explicitly gates on startup before testing
  reclamation. Four workflow/disposal suites pass together (44 tests) and the
  process exits naturally in that local matrix. PR #129 at `eaf99b8b` subsequently
  reproduced a 120-second timeout in this case on Linux; other tests continued
  until the shard's eight-minute budget ended. A second observation located the
  wait inside workflow settlement after child disposal. Worktree removal can
  fail as an Effect defect, which the old typed-error ignore did not catch;
  that failure stranded terminal persistence and the completion signal.
  Reclaim now logs removal defects and continues publishing the original
  outcome. Pure interruption still propagates and existing cleanup deadlines
  remain unchanged. Real removal followed by fault injection proves both
  deadline and cancellation settle, persist and notify after child disposal.
  Concurrent reclaim/isolated removal is observed; the exact Git failure in the
  intermittent Linux run remains an inference, not a captured exception.
  F03 records default/opt-in and final CI evidence separately in
  [the implementation report](audit-followups-2026-09-15.md).
  A separate Runner reentry fixture now uses explicit started/reentered/release
  signals instead of five/fifty-millisecond timer ordering, preserving the
  assertion that both waiters share the first execution and emit one warning.

- SDK generation validation captures stdout in a temporary file, matching the
  standard root/SDK build redirect. The pipe fixture could remain alive after
  delivering a complete document on Bun; file capture preserves the actual
  generator, full-document/callable/HTTP assertions and original child deadline.
  This does not claim to fix every production pipe or Bun callback/exit path.

- Status: active process/runtime contract
- Canonical owner: fork `main` workflow runtime and repository CI
- Observable contract: non-success workflow cleanup bounds caller wait even
  when actor cancellation is uninterruptible, while detached cleanup continues.
  Workflow timers, persistence, journal, failure, phase, and log callbacks fork
  through an `EffectBridge` captured from the owning layer, so detached work
  retains its instance-scoped services. Default-path validation, including
  upstream-sync regressions, clears ambient `MIMOCODE_EXPERIMENTAL`,
  `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and `MIMOCODE_CODEX_MODE`.
  Compaction/default-path tests additionally clear
  `MIMOCODE_COMPACTION_MAX_CONTEXT`, `MIMOCODE_COMPACTION_TRIGGER_RATIO`, and
  `MIMOCODE_DISABLE_CHECKPOINT`.
  Package-owned preload flags are preserved and reported as the harness
  baseline; opt-in tests add only their target selector beyond that baseline
  and report the full non-default environment. Default-off assertions for a
  preload-enabled feature run in an isolated non-test child process with its
  selector removed before flag-module import.
  Enterprise tests launched from `packages/enterprise` preload fixed test S3
  configuration and intercept the current storage adapter's HTTP origin with
  an in-memory object fixture. The real adapter still performs key, JSON, and
  list-bound construction. This package test setup does not configure product
  execution; unrelated HTTP origins still use the original fetch, so it is not
  a blanket network-isolation guarantee or evidence of live S3/R2 behavior.
  CI triggers on `main`, `dev`, and `dev/compat`, retains `.test.tsx`
  discovery, assigns all ordinary inputs by a stable path hash, runs enabled
  worktree cases in normal shards, and runs the real stdio observer and HTTP
  actor recovery suites in separate processes. The former requires the real
  transport despite process-global mocks; the latter requires the live
  AppRuntime prefix captor despite scoped unit-test prompt layers. No case is
  skipped by this isolation. Each shard and dedicated job removes its prior report and
  then requires strict XML/count consistency, at least one executed case, a
  non-empty suite for every reported file, and exact expected-file coverage.
  The explicit Linux zero-case inputs are still loaded by Bun and excluded only
  from the expected suite set, so a future registered case fails as unexpected
  until the allowlist is retired.
  Each unit shard step carries a 12-minute budget, raised from upstream's 8 after
  shard 1 measured 412-488 seconds across five 2026-09-15 pushes and twice had a
  complete passing run cancelled. The budget bounds a hung shard; per-test hangs
  stay capped by the suite's own 120-second timeout, so this raise weakens no
  hang detection and changes no reporting requirement.
- POLICY-01 Question lifecycle: registration, Asked publication and answer
  waiting share one resource lifetime. Abort, interruption, publication failure
  and instance disposal remove only a still-owned pending question and publish
  its existing Rejected terminal once; replied/rejected questions are not
  rejected again. Registration refuses a closed instance generation. Cleanup
  uses a publisher captured from that generation, reaching typed and wildcard
  subscribers without recreating the disposed instance or clearing a new
  generation's question. Ordinary late Bus publication still rejects disposal.
  Watch `packages/opencode/src/{question,bus}/index.ts` and
  `packages/opencode/src/tool/question.ts`;
  `test/question/lifecycle.test.ts` and real
  `test/cli/tui/question-lifecycle.test.tsx` cover these consumers.
- 2026-09-12 racy-observation fix: `nested primary ActorTool hands background
ownership to the real parent` polled the `InboxTable` row its assertion is
  about. That row exists to wake the persistent peer it addresses, so the peer's
  continuation drains it within milliseconds and the poll observes a state the
  system is designed to erase. A drained row never returns, so the earlier
  window widening (2s to 20s) only moved the failure from ~2.5s to ~21s. The
  case now observes `InboxArrived`, published after the row commits and before
  `wake()`, matching how `test/actor/cancel-notification.test.ts` already counts
  envelopes. Behavior is unchanged and was verified identical with
  `spawn.ts`/`prompt.ts` reverted to `e92d7a52`; the assertion is
  mutation-checked against a suppressed notification and against one misrouted
  to `main`. Prefer the bus envelope over inbox rows whenever a test asserts
  notification routing.
- 2026-09-14 TP-R14-12 unquarantined: `[TP-R14-12] undeliverable terminal
notification is logged` runs again, and the rationale it was quarantined under
  — upstream behaviour the fork's actor pipeline does not yet reproduce — was
  wrong. The case asserts upstream's log wording, `actor terminal notification
failed`; the fork's own inbox send in `spawn.ts` logged
  `actor inbox notification failed`, a line upstream does not have. Aligning
  that one message is the whole fix, mutation-checked: with the fork wording the
  case fails its assertion, with upstream's it passes. #107 had passed it from
  its first commit (CI run 34693434562, shard 4/4), which the 2026-09-13
  follow-up below did not record. At that snapshot two cases stayed quarantined, both reducing to
  the postStop publish-ordering product decision recorded there: `[TP-R14-07]
postStop LLM failure preserves the successful result with a warning` and
  `inbox waits for the entire spawn execution before starting a continuation`.
- 2026-09-13 quarantine follow-up: the peer `success`/`failure` continuation
  envelope-count cases are fixed and unskipped; see the FC-001 terminal-publisher
  entry. At that snapshot three cases stayed quarantined, all `skip`ped in place with their
  inline rationale:
  `[TP-R14-07] postStop LLM failure preserves the successful result with a
warning` (`test/plugin/actor-hooks.test.ts`) and `inbox waits for the entire
spawn execution before starting a continuation`
  (`test/actor/execution-integration.test.ts`) both reduce to one blocker — the
  fork publishes an actor's outcome and leaves it idle _before_ postStop, where
  upstream publishes after — and the second additionally needs a spawn-side
  execution claim held across the whole spawn. What holds these open is a
  product decision, not a test conflict: publishing after postStop means a
  spawn's caller, and a blocking `actor run`, resolves only once postStop
  finishes. Exactly one fork case reads on the early publish, `delivered no-op
cancel preserves forkContext while postStop is still running`, and only in how
  it sequences its awaits.
  `[TP-R14-12] undeliverable terminal notification is logged`
  (`test/actor/cancel-notification.test.ts`) is independent of that ordering and
  is untouched by this PR.
- 2026-09-12 quarantine: four upstream-new actor cases are skipped in place with
  an inline rationale — `inbox waits for the entire spawn execution before
starting a continuation`, `[TP-R14-12] undeliverable terminal notification is
logged`, and the peer `success`/`failure` variants of
  `[TP-R14-08] [TP-R14-09] ... continuation settles ... once`. They assert
  upstream behavior the fork's actor pipeline does not yet reproduce after the
  FC-001 wake-routing retirement. Each is `skip`ped rather than deleted so the
  gap stays visible, and is tracked for a dedicated follow-up fork PR; no
  upstream PR is opened. The peer `cancelled` variant and both subagent variants
  run normally.
- Upstream relationship: stronger runtime cleanup plus a narrower quarantine
  than the reviewed upstream workflow; adopts its package-scoped enterprise
  storage fixture.
- Watch surfaces: `packages/opencode/src/effect/hard-timeout.ts`,
  `packages/opencode/src/effect/bridge.ts`,
  `packages/opencode/src/flag/flag.ts`,
  `packages/opencode/src/workflow/runtime.ts`,
  `packages/opencode/src/workflow/sandbox.ts`,
  `packages/opencode/bunfig.toml`, `packages/opencode/test/preload.ts`,
  `packages/opencode/test/fixture/fixture.ts`,
  `packages/opencode/test/fixture/fixture-root.test.ts`,
  `packages/opencode/test/tool/{bash,webfetch,websearch,read}.test.ts`,
  `packages/opencode/test/server/{workflows-route,session-messages,session-task-route,session-select,title-authority,session-actions}.test.ts`,
  `packages/opencode/test/cli/tui/worker-listener.test.ts`,
  `packages/opencode/test/workflow/runtime-worktree.test.ts`,
  `packages/enterprise/bunfig.toml`, `packages/enterprise/test/preload.ts`,
  `packages/enterprise/src/core/storage.ts`,
  `packages/enterprise/test/core/storage.test.ts`,
  `packages/enterprise/test/core/share.test.ts`,
  `.mimocode/skills/upstream-sync/SKILL.md`,
  `.mimocode/skills/upstream-sync/references/`,
  `.mimocode/skills/upstream-sync/.gitignore`,
  `.github/workflows/test.yml`, `.github/scripts/verify-junit.py`,
  `.github/workflows/lint.yml`,
  `.github/workflows/typecheck.yml`, `script/generate.ts`, and `AGENTS.md`.
- Tests/evidence: hard-timeout, runner, workflow runtime/worktree suites, four
  complete local hash shards, positive/negative JUnit verifier fixtures, and
  exact-SHA CI for the reviewed behavior tree when published; local tests do not
  substitute for that remote evidence.
- 2026-09-07 fixture and synchronization review: adopted the two enterprise
  preload files unchanged. Both complete storage/share test files pass locally
  (16 tests), exercising the current S3 adapter against intercepted HTTP with
  test credentials; the package typecheck passes. The fixture covers the
  current read/write/delete/list requests, not R2, signature verification,
  pagination, or external-service availability. The accepted `95b592e0`
  upstream-sync skill is shared process guidance to propagate unchanged from
  main into compat; it adds no runtime capability or new retirement decision.
  Final propagation evidence belongs to `dev-compat-registry-history.md`, and
  final published branch SHAs still require their own CI results.
- 2026-09-10 skill reference split: the upstream-sync skill moved its
  conditional detail into `references/validation-and-ci.md`,
  `references/publication-and-cleanup.md` and `references/evidence-record.md`,
  leaving `SKILL.md` as the scope and baseline entry. A local
  `.gitignore` re-includes that directory, because `.mimocode/.gitignore`
  ignores agent-cached `references/` directories and nested `.gitignore` files
  and a file inside an excluded directory cannot be re-included on its own.
  These are fork-only paths upstream does not define, so they join the watch
  surfaces above; like `95b592e0` this is shared process guidance to propagate
  unchanged from main into compat, adding no runtime capability and no new
  retirement decision. Review-thread adjudication for the cleanup-scope finding
  is recorded on PR #105.
- 2026-09-15 tooling convergence: root `script/generate.ts` keeps SDK then
  OpenAPI generation and stops implicitly formatting the whole repository,
  matching upstream's generation policy. Generator-local formatting and failure
  propagation remain. JavaScript OpenAPI examples import `@mimo-ai/sdk/v2`
  and call the generated camelCase methods, including `session.promptAsync`;
  actual generated/published samples are checked against the client and the
  async prompt example sends the expected HTTP path/body. Main publishes 140
  operations; compat's extra coverage operation remains its own protocol.
  Generated artifacts still mix actual fork schema additions with refreshes of
  upstream source fields whose checked-in artifacts lag. Compare producers
  before attributing every artifact hunk to a fork feature.
  Three no-caller model API child fixtures are removed; the live TUI worker
  default/listener tests remain. See F05/F09/F11 in the implementation report.
- 2026-09-05 fixture review: removed `resetDatabase` and its four call sites,
  preserving local disposal and the fork project-init authorization fixture.
  Rejected incoming auth-override, fork-prefix, and failed-subtask skips: the
  fork already has relevant fixture isolation and all three pass on both
  pre-sync branch SHAs. Existing unrelated CI timeouts are tracked separately;
  this decision does not claim that the fixture removal fixes those failures.
- 2026-09-07 model API lifecycle review (historical; retired by FD-004 on
  2026-09-14): token verification precedes body and
  bootstrap; both optional API modes use bounded uploads and cancellation-aware
  instance waiting. SSE retains admission and its instance lease until EOF or
  producer cancellation acknowledgement, including cancellation at response
  handoff. Bun cancellation uses an explicit SSE error and close; unrelated
  shared bootstrap producers remain owned by their original callers. CLI stop
  closes admission before instance disposal. Direct and native HTTP regressions
  cover these seams without changing the ordinary actor/workflow lifecycle.
- Selected model API evidence (historical tests of the retired implementation): CLI test children have a 20-second execution
  bound, unconditional kill and a bounded two-second drain on cleanup; multi-child
  cases declare their total 60-second budget. Image/SDK cancellation and Node
  checks cover adjacent API resources, not a rerun of all workflow lifecycle tests.
- POLICY-03 lifecycle review (the model API admission clauses are historical
  and retired by FD-004; listener shutdown still exists): the TUI worker stops model API admission and
  joins pending listener startup before checkpoint draining and instance
  disposal. Its GlobalBus bridge remains available for terminal events; only
  final cleanup releases automatic authentication. Repeated shutdown shares
  completion. Listener startup errors return a bounded RPC result: default
  startup reports the error and keeps the TUI's internal RPC transport usable;
  explicit HTTP startup failure exits through cleanup. The host clears its
  upgrade timer on every teardown path. Real socket/worker tests and host wiring
  tests are distinct from actual CLI PTY evidence; none implies all-platform
  terminal coverage or new exact-head CI success.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0353965ea38ce3d963f123acb2f9a965bcbb98c3`.
- 2026-08-25 publication companion: the `AGENTS.md` default-environment rule is
  a process-only registry companion and does not advance the frozen main
  behavior or its changed-path calculation.
- 2026-09-02 test-sharding review: the new WebSearch regression is an ordinary
  `.test.ts` input and therefore enters the existing stable path-hash shard 1/4.
  Its local pass is supporting evidence; the final published `main` SHA remains
  subject to the strict XML/count and exact-file CI gates.
- 2026-09-14 capability route disposition: the 2026-09-07 model API lifecycle
  review, the selected model API evidence and the model API clauses of the
  POLICY-03 lifecycle review above describe the retired fork model API and are
  historical. FD-004 now owns `/v1` and adopts upstream's capability route
  whole: token verification runs in the route after `InstanceMiddleware` has
  bootstrapped the instance, instance waiting is not cancellation-aware, and
  there is no admission, server-owned deadline or bounded upload. None of that
  is to be restored during a sync. The retirement condition below governs this
  entry's workflow and process bounds; the model API bounds were retired by
  FD-004's decision rather than by an upstream settlement, and FD-004 records
  each resulting behaviour.
- Retirement condition: runtime bounds may retire only with equivalent upstream
  settlement. Restoring a quarantined test requires effective assertions and
  bounded exact-SHA CI settlement; the workflow case's restored execution alone
  does not close the Linux timeout follow-up above.

- 2026-09-15 retired-fixture inventory: `test/fixture/llm-server-cli-child.ts`,
  `test/fixture/model-api-default-child.ts` and `test/llm-server/tokens-child.ts`
  have no current callers in the tracked tree. They retain former model/audio
  API or token-helper assumptions and do not count as executed validation of
  today's capability API. Delete or deliberately reconnect them in a focused
  cleanup; the current actor/quarantine result is unaffected.

## FC-009 — synthetic-message provenance and text-part adaptation

- 2026-09-19 synchronization: Machine provenance joins hook provenance as an explicit union. Internal GitHub/command/inbox source labels remain non-user. Optional uncommitted hints persist source=hook with inherited task/model variant and atomic latest-user/token checks; their worker owns no prior run-approval scope.

- 2026-09-17 synchronization: Compose, recall and loop-streak reminders are persisted with stable IDs. Hydration restores Compose protocol priority. User image attachments use a synthetic provenance envelope rather than a fabricated Read result; its tagged envelope is placed before genuine user content after reload without changing IDs. Responses tool images remain tied to their tool call, using the actual adapter provider and shared image limits.

- 2026-09-10 title isolation: automatic titles use persisted genuine user text,
  configured lite then the exact source model, and an isolated StructuredOutput
  request. Attachment-only input keeps a filename fallback; image bytes never
  enter this title request. Ephemeral generation bypasses mutable chat parameter
  and header hooks and rejects workflow connectors. Preserve the stronger fork
  rule that only non-ephemeral main requests publish global retry state/events.

- Status: adapted
- Canonical owner: shared `main` session runtime
- Observable contract: synthetic user messages carry `source: "spawn"` or
  `source: "hook"` and cannot masquerade as direct user requests for automatic
  skill matching. Hook-cleared, hook-created, metadata-only, and retry paths
  persist or remove text parts consistently while keeping `stepPartIds` aligned.
  Retry cleanup may remove attempt-local parts only before the attempt crosses a
  tool side-effect boundary. Once a tool call is persisted or completed, a
  retryable stream failure cannot replay the whole model step. Ephemeral helper
  requests, including automatic title generation, may retry locally but cannot
  publish session-global retry status or `RetryAttempt` events; only durable
  main-agent requests may publish them. Opt-in loop-streak recovery crops whole
  repeated assistant messages only at request construction, records the span on
  the existing parent user as ignored synthetic metadata, and never deletes the
  persisted trajectory or fabricates a new user turn.
- POLICY-01 synthetic producer: an approved plan continuation remains
  `source: "hook"` with a synthetic text part and the actual user's model,
  tools, format, system, harness, provenance and task binding. Failed conditional
  commits write neither message nor parts; approval does not masquerade as a
  new direct-user request. FC-001 owns the atomic transition.
- Upstream relationship: upstream text-part deferral and centralized retry are
  adapted to fork hook, skill-activation, and side-effect-boundary rules.
- Watch surfaces: `packages/opencode/src/session/message-v2.ts`,
  `packages/opencode/src/session/processor.ts`,
  `packages/opencode/src/session/compaction.ts`, and synthetic producers in
  prompt, checkpoint, plan, dream, and distill flows.
- Tests/evidence: `packages/opencode/test/session/processor-effect.test.ts`,
  `packages/opencode/test/session/main-runloop-history-invariant.test.ts`,
  `packages/opencode/test/session/trajectory.test.ts`, prompt regressions, and
  generated SDK/OpenAPI `source` fields at the reviewed main behavior. Processor
  characterizations cover both an in-band retryable 503 and a raw stream fault
  after one completed tool side effect without a second model/tool execution,
  plus retry isolation for ephemeral title requests.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
- Retirement condition: upstream provides equivalent provenance and complete
  hook/retry text-part lifecycle, no-side-effect-replay behavior, and local-only
  retry publication for ephemeral or non-main requests, and regenerated
  artifacts preserve the same source discriminator.

- 2026-09-15 error-summary carrier: `session/trajectory.ts` extracts a
  NamedError's `data.message` for the model-visible session error instead of
  serializing its complete data/metadata. The `sessionErrorText` regression
  covers this helper; it does not prove end-to-end provider exception redaction.

## FC-010 — WebFetch and SSRF destination classification, authorization, and resource bounds

- Status: active
- Canonical owner: shared `main` WebFetch and SSRF destination-classification boundary
- Observable contract: WebFetch accepts only HTTP(S). Destination classification
  runs before permission for the initial URL and every manual redirect target,
  blocking classified private/internal numeric targets and hostname results,
  including the complete IPv6 link-local `fe80::/10` range. Each target that passes
  classification triggers the effective `webfetch` permission before its
  request; a rejected target stops before its permission ask and request.
  Redirects are capped at 10 hops. The timeout wraps response acquisition and
  the redirect chain, not the subsequent `response.arrayBuffer` body read.
  A Content-Length above 5 MiB is rejected early; otherwise the complete buffer
  is read before the 5 MiB check. This rejects oversized results but does not
  bound streamed-body allocation or total body-read time.
- Upstream relationship: adapts the shared upstream WebFetch contract while
  retaining fork per-hop authorization and resource bounds, and hardens the
  fork's destination classification to block the complete IPv6 `fe80::/10` range.
- Watch surfaces: `packages/opencode/src/tool/webfetch.ts`, its permission
  plumbing, and `packages/opencode/src/util/ssrf.ts` where target classification
  is applied before the WebFetch permission ask.
- Tests/evidence: `packages/opencode/test/tool/webfetch.test.ts` proves redirect
  target re-authorization through its local `Bun.serve` redirect and proves that
  rejected initial and redirect targets stop before their permission ask and
  request. `packages/opencode/test/util/ssrf.test.ts` covers numeric `fe80`,
  `fe90`, `fea0`, and `febf` link-local representatives plus a DNS-resolved
  family-6 `febf::1` target. Source review at main behavior confirms HTTP(S)
  scheme enforcement, the 10-hop cap, acquisition timeout and post-read 5 MiB
  rejection; that test file
  has no focused scheme or resource-bound regression for those source contracts.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.
- Retirement condition: upstream preserves equivalent numeric and DNS-resolved
  destination classification, including IPv6 `fe80::/10`, with the same HTTP(S),
  per-hop permission, manual-redirect, timeout, and response-size contract and
  behavior-focused tests.

## FC-011 — fork-facing model prompts and bundled skill guidance

- Status: active process/content contract
- Canonical owner: fork `main` prompt and bundled-skill content
- Observable contract: the default native prompt tells models to use only the
  currently listed tool surface, track multi-step work through the `task`
  lifecycle, delegate through `actor` with background `spawn` as the default
  and blocking `run` as the exception, and parallelize only independent calls.
  Codex guidance routes hidden calls, including single operations, through exec
  and permits authorized Actor, question and plan composition through exec,
  while retaining direct entries. Successful plan approval ends the current
  guest before the next build turn. Ordinary subagent restrictions and the
  current request pool still constrain these calls; guidance grants no tools
  outside that pool. Model-visible CI reminders
  include `dev/compat`; built-in skill keys match `mimocode-docs`; actor heredoc
  errors explain flag placement; PDF CJK guidance uses project-controlled
  fonts, explicit TTC face indexes, and language-matched runtime-supported CID
  fallbacks. Model and
  bundled-skill path guidance describes the fixed instance cwd and directs
  cross-directory work through absolute paths or explicit `workdir`; it does
  not advertise `change_directory`. PPTX image guidance reflects that WebFetch
  can return an image attachment but does not persist a local path for
  `python-pptx`; generation is conditional on a listed image tool, local
  downloads create their parent directory and fail closed, and shape/text is a
  valid fallback. Bundled `mimocode-docs` also documents the capability API
  upstream mounts at `/v1` on every instance server: the implicit loopback
  listener, the carve-out that lets a minted token past the generated Basic
  credential, scoped token issuance and lifetime controls, and image/audio
  inputs on upstream's terms. Its attach guidance is the one place the fork's
  text diverges from upstream's, because this fork's TUI worker serves a
  directory chosen at startup and upstream's wording would hand these users a 401. The retired fork model API's whitelist, `--all-models`/`--directory`
  flags and parallel admission implementation are retired. The TUI-owned
  listener still exists in `cli/cmd/tui/worker-listener.ts`, with generated Basic
  credentials and `advertiseDirectory`; upstream's capability route is served
  through it. The content snapshot is recorded separately from runtime/tests.
- Upstream relationship: fork-facing guidance plus selectively adopted upstream
  documentation improvements.
- Watch surfaces: `packages/opencode/src/session/prompt/default.txt`,
  `packages/opencode/src/tool/actor.ts`,
  `packages/opencode/src/tool/actor.txt`,
  `packages/opencode/src/tool/actor.shell.txt`,
  `packages/opencode/src/skill/builtin/.bundle/mimocode-docs/`,
  MiniMax/GPT prompt text, actor shell tokenizer/help, TUI skill i18n, and
  bundled `pdf-official` and `mimocode-docs` content.
- POLICY-01 content carriers: `docs/codex-compact-tools.md`,
  `packages/opencode/src/agent/prompt/generate-gpt.txt`,
  `packages/opencode/src/session/prompt/gpt.txt`,
  `packages/opencode/src/tool/tool-script.txt`,
  `packages/opencode/src/tool/plan-exit.txt`, and
  bundled `mimocode-docs/reference/config.md` under `packages/opencode`.
  Content snapshot: `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
  Other selected policies and existing native task/Actor guidance are unchanged.
- Audio convergence: standalone speech/transcription, static-key mode and capability
  selection are retired across runtime, CLI and bundled guidance; see
  [2026-09-09 audio alignment](audio-upstream-alignment-2026-09-09.md).
- POLICY-03 content carriers: `docs/model-api.md`, `docs/audio-api.md`, and
  bundled `mimocode-docs/reference/capability-api.md` and `commands.md` distinguish
  TUI startup, attach reuse, in-memory ordinary API authentication and explicit
  Bearer model access. Content snapshot: `0353965ea38ce3d963f123acb2f9a965bcbb98c3`.
- Tests/evidence: session system, including the actionable task/actor guidance
  regression, actor-shell, skill-description,
  `packages/opencode/test/skill/mimocode-docs.test.ts` at the main runtime/test
  SHA, plus bundled-content review at the separate guidance content SHA.
  `packages/opencode/test/skill/builtin.test.ts`
  binds the shipped PPTX guidance to the available-tool and WebFetch facts.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0353965ea38ce3d963f123acb2f9a965bcbb98c3`.
- 2026-08-28 review: adapted upstream PPTX image-sourcing guidance instead of
  shipping unconditional `image_gen`, text-only WebFetch, or unchecked curl
  claims. Actor help also distinguishes reusable actors from completed
  ephemeral full-context actors.
- 2026-09-01 tools-guidance review: adopted upstream's dynamic, action-oriented
  default guidance after binding the `task` and `actor` lifecycle claims to the
  shipped runtime and removing the incoming trailing whitespace. The static
  tool inventory was retired from this prompt without changing registry or
  permission behavior.
- 2026-09-02 Compose Next review: adopted upstream's workspace-first ordering
  from `6972b3290415f5e87e859e6b38f3c212f091e8e5`. Workspace now owns the
  active workspace before Spec writes its durable document there; without-spec
  and missing-document finalize paths remain conditional. This is bundled
  workflow guidance and does not widen file, worktree, or publication authority.
- 2026-09-07 selected-capability review: actor help documents explicit
  persistent full-context creation, constrained resume, successful idle status
  and cancellation release. Bundled configuration guidance describes
  `harness_model`; these instructions do not widen runtime permission or
  restore public actor/task recovery selectors.
- 2026-09-11 PDF-gate review: the read tool now refuses a PDF when the active
  model declares no `pdf` input support and names the bundled skill by path —
  `<builtinSkillRoot()>/pdf-official/SKILL.md`. That is factually correct here:
  the fork ships `pdf-official` in the same bundle under the same
  `OFFICIAL_SKILL_NAMES` / `MIMOCODE_DISABLE_OFFICIAL_SKILLS` opt-out as
  upstream, so no fork-facing rewrite is needed. This is a runtime message, not
  bundled content; the guidance content snapshot is unchanged.
- Retirement condition: the corresponding prompts/content cease to ship or
  upstream guidance is factually equivalent for fork branch names, keys,
  runtime support, and user-facing errors.

- 2026-09-09 POLICY-02 review: registered/live-context recovery target selection,
  task consistency and missing-binding admission are integrated at `6ff976a97026610335dc367d8875a87d1d91d1a7`.
  The retained spawn task namespace, synchronous commit/ownership boundary and
  metadata-only background updates preserve existing task and message sources.
  HTTP/SDK/tool publication and actual provider/transaction regressions are
  recorded in the shared history; no cross-restart recovery is introduced.

## FC-012 — fork publication, contribution, and security routing

- Status: active process contract
- Canonical owner: fork repository governance
- Observable contract: pushes and pull requests target `onlyfeng/MiMo-Code`,
  never the read-only upstream. Shared work enters `main` before propagation to
  `dev/compat`; compatibility-only work targets `dev/compat`. Fork-only security
  issues are not routed through upstream public disclosure channels.
- Upstream relationship: fork-specific governance that must not be overwritten
  by upstream repository documents.
- Watch surfaces: `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, pull request
  templates, and repository-facing CI guidance.
- Tests/evidence: repository remote/branch policy, generated contribution and
  security links, and exact repository scoping in release/PR operations; these
  are process checks rather than runtime tests.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.
- 2026-09-02 release review: adopted upstream's synchronized `0.1.14` version
  across all sixteen workspace package manifests and `bun.lock`; fork-only
  publication destinations and branch routing remain unchanged.
- Retirement condition: fork ownership or publication topology changes through
  an explicit governance decision and every repository-facing route is updated.

## FC-013 — retry budget resolution and MaxMode final-step enforcement

- 2026-09-17 synchronization: Retain bounded server/rate-limit defaults and scope-first request/candidate/judge budgets against upstream persistent defaults. Adopt expanded transport classification and processor-owned visible retry status. Request retries publish diagnostics only for durable main requests; ensemble calls suppress that diagnostic stream. Jitter precedence, bounded network fallback, immutable instructions, side-effect replay guards and MaxMode final-step enforcement remain.

- Current default policy: server and rate-limit live-step recovery now use
  persistent retry without a deadline, matching network and upstream defaults.
  Request, stream, unknown, candidate and judge budgets remain bounded. This
  supersedes the server/rate-limit default retained in the 2026-09-17 sync;
  explicit user, project and provider overrides still apply. Cancellation,
  terminal errors, side-effect replay guards and the exact GPT overload
  silent-retry limit of three remain enforced.
- Status: active
- Canonical owner: fork `main` session run loop
- Observable contract: MaxMode orchestration may run before the configured
  final step, but the final step uses the ordinary processor so
  `toolChoice: "none"` forces a text-only response and terminates the loop.
  MaxMode cannot continue tool calls beyond the final-step boundary. Candidate
  and judge calls use bounded configurable retry with fresh attempt-local
  accumulators. Eligible subagents may execute MaxMode, but only the main agent
  may publish session-global retry status or `RetryAttempt` events.
- Configuration delta: `session/retry.ts` resolves top-level jitter as each
  budget's default. Priority from lowest to highest is global top-level jitter, global budget jitter,
  provider top-level jitter, then provider budget jitter. Switching network,
  server or rate-limit retry from persistent to bounded without `maxRetries`
  supplies 5, 8 or 5 respectively. `mode: "bounded"` restores the count limit;
  restoring the former server/rate-limit 15-minute window also requires
  `deadlineMs: 900000`. For server/rate-limit only, an explicit `maxRetries`
  retains bounded behavior when neither global nor provider config sets a
  mode; `maxRetries: 0` therefore still disables retries. With neither mode
  nor count configured, the new persistent default applies. Any explicit mode
  keeps the existing provider-over-global precedence, and persistent mode
  ignores the count. Network behavior is unchanged by this compatibility rule.
  Request, max-candidate and max-judge scopes select their
  corresponding retry budgets; these rules are shared policy, not harness
  identity. `docs/architecture/retry-coordinator.md` and retry tests describe
  the same precedence. The jitter precedence and bounded network fallback were
  recorded by the 2026-09-15 code audit without changing their implementation.
- Upstream relationship: adopts persistent network/server/rate-limit defaults
  while retaining bounded request/stream/unknown/candidate/judge budgets and
  fork budget resolution, final-step enforcement and subagent status isolation.
- Watch surfaces: `packages/opencode/src/session/max-mode.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/session/retry.ts`,
  `packages/opencode/src/session/status.ts`, and processor final-step routing.
- Tests/evidence: default budgets, overrides and classification in
  `packages/opencode/test/session/retry.test.ts`; the MaxMode final-step regressions in
  `packages/opencode/test/session/prompt-effect.test.ts`, step-budget coverage in
  `packages/opencode/test/session/max-mode.test.ts`, and candidate/judge
  EConnReset coverage in `packages/opencode/test/session/max-mode-econnreset.test.ts`
  at main behavior.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.
- Retirement condition: MaxMode itself consumes and enforces the final-step
  tool choice, bounded candidate/judge retry, and main-only status publication
  with equivalent regressions.

## FC-014 — fork Cloud Agent development environment

- Status: active process contract
- Canonical owner: fork `main` repository infrastructure; inherited unchanged by
  `dev/compat`
- Observable contract: `.cursor/environment.json` defines the Cursor Cloud Agent
  development environment for the fork. The `install` script runs under
  `set -eo pipefail` so a failed download (e.g. `curl … | bash`) aborts the build
  instead of silently succeeding. On Cursor's default base image it (re)installs
  the pinned Bun (`bun-v1.3.14`) into `$HOME/.bun` whenever the resolved
  `bun --version` is not exactly that pinned version — so an absent, stale, or
  image-provided Bun is replaced — then asserts the pinned version is present
  (failing the build otherwise) and symlinks it into `/usr/local/bin` so
  non-interactive agent shells resolve `bun` without a profile edit. It then
  re-creates a read-only `upstream` remote (`git remote remove` + `add`, which
  clears any pre-existing single- or multi-valued URLs) pointing its fetch URL at
  the canonical `https://github.com/XiaomiMiMo/MiMo-Code.git` with its push URL
  disabled, and runs `bun ci` (frozen lockfile). There is no `start`; the dev
  server and TUI are launched on demand. This is tooling/infra, not product
  runtime behavior, so it does not advance the behavior references in the review
  record.
- Upstream relationship: fork-only infrastructure that upstream does not define.
  It must never be pushed to the read-only upstream (see FC-012). Because the
  file lives on `main`, promotable Cloud Agent builds (which build each repo's
  default branch) include it, and `dev/compat` inherits it through the normal
  `main → dev/compat` propagation.
- Watch surfaces: `.cursor/environment.json` and any `.cursor/` build assets it
  references.
- Tests/evidence: validated by triggering a Cloud Agent environment build off a
  branch and confirming, on a freshly booted agent, `bun --version` on the
  default PATH, `git remote get-url upstream`, install idempotence, `bun ci`,
  repository `typecheck`, and a live engine action. These are process/infra
  checks rather than runtime tests.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.
- Retirement condition: retire or replace when the base image ships the pinned
  Bun and preconfigures the read-only `upstream` remote, or when fork
  environment management moves out of the repository by an explicit governance
  decision. If upstream ever introduces its own `.cursor/environment.json`, a
  sync merge surfaces the conflict here; reconcile so the fork-owned config (or a
  reviewed replacement) wins rather than silently adopting the inherited file.
  Keep the `bun-v<version>` in `install` aligned with `packageManager` in
  `package.json`.

## FC-015 — bounded compaction context and upstream ratio trigger

- Status: active
- Canonical owner: shared `main` overflow and compaction boundary
- Observable contract: `compaction.max_context` has precedence over
  `MIMOCODE_COMPACTION_MAX_CONTEXT`; valid absolute, shorthand, percentage, and
  per-model wildcard values may lower the effective context window but cannot
  exceed the provider cap. As in upstream, a configured budget must exceed the
  legacy compaction/output reserves to be accepted; those reserves are not
  subtracted from the trigger. A zero per-model value restores the provider
  window. The trigger ratio accepts a decimal or percentage in `(0, 1]`,
  defaults to `0.9`, and sets `usable = floor(effective * ratio)` without an
  additional fixed-reserve ceiling. The TUI budget picker validates and previews
  each candidate through the same resolver and reports the applied trigger.
  Compression-time projection retains its summary,
  file manifest, and complete API rounds. Its optional tail budget is the smaller of
  40K tokens and the remaining usable window after the frozen system/tools and
  fixed projection content. A new external user/spawn request that arrived after
  the summary snapshot, and all messages after it, must remain visible even when
  that optional budget is zero. Their cost consumes the available optional budget
  before older complete rounds are selected; ordinary overflow handling still
  applies to an oversized required request. Compaction reuses the frozen request prefix and
  keeps `toolChoice: "none"`; schema bytes remain cache-stable without granting
  summary-time tool execution. Complete authorized definitions remain available
  for frozen rebinding, while compaction sends and budgets only the frozen
  advertised subset. Its file manifest includes retained validated terminal
  nested exec effects within the snapshot budget; these read-only views never
  create tool-execution authority.
- 2026-09-15 shared chronological projections: rebuild tails, recovery usage,
  checkpoint context and persisted loop-streak spans resolve actual message
  positions rather than lexical ID ranges. Missing/reversed checkpoint bounds
  retain live messages through both context filtering and later tail collapse;
  the transient invalid range is not written back to storage. TUI buckets use
  the same `(created, UTF-8 ID)` order and undo hydration follows pagination
  through its exact boundary, preserving that boundary during live updates.
  After authoritative single-session or list updates clear revert, each actor
  bucket returns to its normal 100-message limit and all evicted cached parts
  are removed. Normal message upserts likewise remove the entire excess prefix.
  Active revert still retains hydrated history; the real SyncProvider event and
  bootstrap regressions in `test/cli/tui/revert-cache.test.tsx` cover this change.
  Main's existing footer compares a locally resolved watermark and remains
  pending when it cannot resolve one. The extra checkpoint-coverage HTTP/SDK
  and TUI cache protocol stays owned by DC-CONTEXT-001 on compat.
  Additional carriers: `session/session.ts`, `message-v2.ts`, `checkpoint.ts`,
  `tail-digest.ts`, `revert.ts`, `prompt/loop-streak.ts`, shared UTF-8 ordering,
  and TUI sync/session/model utilities. Real SQL pagination, atomic admission,
  composed projection and TUI state-helper tests bind these paths; no
  interactive terminal playtest is claimed.
- 2026-09-15 concurrent admission review: pending external requests are scoped
  by session and actor until their message and parts commit or admission ends.
  Compaction waits for that actor's pending admissions before and after inserting
  an automatic continuation; a newer committed request removes the exact stale
  continuation and its parts. Failed/interrupted admission releases the wait,
  and another actor's pending request does not block this actor. Snapshot tails
  use message identity and the actual chronological endpoint rather than an
  array length shared across different views. Real MCP gates cover pre-insert,
  post-insert, failure, cross-actor and interruption paths, including a second
  compaction while a cancelled resource remains unresolved. No additional tool
  authority or compat preflight policy is introduced.
- POLICY-04 carrier review: compaction is the third frozen-prefix consumer.
  Its history projection uses the layout paired with the selected frozen
  system, preserving legacy catalog messages or suppressing known generated
  catalog parts for schema 3. It reuses the stored catalog despite live skill
  changes; the ratio-only trigger and no-tool summary boundary remain intact.
- Upstream relationship: adopts upstream's max-context controls and ratio-only
  trigger. The retained fork adaptations concern bounded projection, frozen
  request identity, and no-tool summaries, not extra trigger headroom.
- Watch surfaces: `packages/opencode/src/config/config.ts`,
  `packages/opencode/src/flag/flag.ts`,
  `packages/opencode/src/session/overflow.ts`,
  `packages/opencode/src/session/compaction.ts`,
  `packages/opencode/src/session/prefix-snapshot.ts`,
  `packages/opencode/src/session/observed-tool-parts.ts`, and bundled configuration
  guidance in `mimocode-docs/reference/config.md`; TUI
  `component/dialog-context-limit.tsx`, `component/dialog-status.tsx`, and `util/model.ts` consume the same
  resolver, and SDK/OpenAPI plus configuration reference translations publish
  the current buffer semantics. The active Compose specification in
  `docs/compose/spec/context-budget-control.md` distinguishes this ratio rule
  from historical reserve-based measurements.
- Tests/evidence: `packages/opencode/test/session/overflow.test.ts` covers value
  grammar, invalid values, config/environment precedence, provider/input caps,
  legacy budget validity, zero restoration, and exact ratio boundaries at the
  reviewed main behavior. `auto-overflow-writer-first.test.ts` disables the
  proactive checkpoint ladder and proves a 25K turn does not rebuild under a
  40K budget, while a 50K turn rebuilds exactly once. TUI `model.test.ts` rejects
  invalid small budgets and checks candidate triggers against the real resolver.
  `compaction-projection.test.ts` and prompt-effect regressions bind the
  projection budget, frozen system/tool bytes, and no-tool summary policy.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0b665c7e681e44cac6f1a6acf18732015fb2bf86`. The selected trigger
  was additionally compared with release `2a0eb706e95a77cba34a319e9f11f33f26d4450c`
  and upstream `0abfeba186191c1a361cf3f27b802e9d29bf0fdc`; this named-behavior
  adoption does not advance the overall upstream review baseline.
- 2026-08-28 review: adopted the explicit empty checkpoint threshold ladder
  from upstream's fixture retune, but rejected its 50K usage and flat-ratio
  explanation because both would hide removal of the reserve boundary.
- 2026-09-02 generated-contract review: adopted the missing published
  `CompactionPart.projection` schema and the deprecated `tail_turns` description
  by regenerating from fork source. The `preserve_recent_tokens` description
  retained the then-current at-most-40K plus reserve-safe effective-window bound.
- 2026-09-08 policy adjustment: supersedes the retained reserve trigger from
  the 2026-08-27/28 reviews at the user's request. The 33K and 20K constants
  came from upstream; the fork had retained the old cutoff when upstream moved
  to the ratio. No fork feature was identified as requiring that extra cutoff.
  The projection description now refers to the ratio trigger, and the buffer
  description explicitly limits its role to configured-budget validation.
- 2026-09-08 PR #80 review follow-up: `/status` labels the ratio gap as
  `headroom`, while the active Compose specification records the ratio formula
  and marks former reserve formulas and live measurements as historical.
- Retirement condition: upstream preserves equivalent configuration precedence,
  value grammar, provider caps, zero restoration, ratio triggers, bounded
  frozen-prefix projection, and no-tool summaries, with behavior-focused
  regressions.

- 2026-09-09 POLICY-02 review: registered/live-context recovery target selection,
  task consistency and missing-binding admission are integrated at `6ff976a97026610335dc367d8875a87d1d91d1a7`.
  The retained spawn task namespace, synchronous commit/ownership boundary and
  metadata-only background updates preserve existing task and message sources.
  HTTP/SDK/tool publication and actual provider/transaction regressions are
  recorded in the shared history; no cross-restart recovery is introduced.

## FC-016 — owned voice results and grapheme-safe Prompt editing

- Status: active
- Canonical owner: shared `main` TUI voice/editor boundary
- Observable contract: every asynchronous voice-control and ASR request
  captures the live Prompt binding that supplied its session, buffer snapshot,
  callbacks, and send policy. A Prompt remount or session switch kills the prior
  binding; equal buffer text is only a content-staleness check inside one owner
  and never authorizes a result to cross into a replacement Prompt. Control
  results revalidate ownership after the model await and before every edit or
  submit; ASR revalidates before reading or mutating the current buffer. A new
  recording supersedes an older one. A stopped recording may finish only its
  final segment on the same still-live owner; `finishing` remains visible until
  the recorder is drained and all pending requests settle, and an old stop
  continuation cannot overwrite replacement-recording state. Display-width to
  UTF-16 conversion iterates extended grapheme clusters, so combining sequences
  and ZWJ emoji are never split; editor-specific newline width 1 and tab width 2
  remain unchanged.
- Upstream relationship: adopts upstream's snapshot-bound `voice_input`
  protocol and schema interoperability, then adds fork hardening for Prompt
  ownership, stop/drain lifecycle, and grapheme-safe editor coordinates.
- Watch surfaces:
  `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`,
  `packages/opencode/src/cli/cmd/tui/component/prompt/offset.ts`,
  `packages/opencode/src/cli/cmd/tui/util/voice-edit.ts`,
  `packages/opencode/src/cli/cmd/tui/util/voice.ts`, and the voice/offset tests
  and protocol specification.
- Tests/evidence:
  `packages/opencode/test/cli/cmd/tui/offset.test.ts` covers combining and ZWJ
  grapheme round trips alongside CJK/newline/tab offsets;
  `packages/opencode/test/cli/tui/voice.test.ts` exercises live OpenTUI
  selection/insertion, same-text rebinding, stopped-owner flush, replacement
  recording rejection, drain/pending settlement, and stale stop-continuation
  state. Independent semantic review traced every post-await control/ASR
  mutation and state branch at the reviewed main behavior.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.
- Retirement condition: upstream binds asynchronous voice results to a live
  Prompt/session owner, prevents stop/drain state races, converts editor offsets
  on grapheme boundaries, and supplies equivalent real-editor and lifecycle
  regressions.

## FC-017 — faithful and bounded history previews

- 2026-09-17 synchronization: Adopt shared tool-result previews and resumable migration version 6, including legacy chunk deduplication and Node SQLite query planning. Projection/media retain the registered SQL NUL, field/list budget and attachment-locator rules. This index preview is separate from raw history retrieval.

- Status: active; explicit owner added by the 2026-09-15 code audit for already accepted fixes.
- Canonical owner: fork `main` history projection; inherited unchanged by `dev/compat`.
- Observable contract: SQLite projection keeps JSON escapes until final parsing so NUL-containing strings survive old SQLite. Individual preview fields are selected by a 4,000-byte decoded-value check; the complete projected attachment metadata list is checked against 4,000 bytes of serialized JSON. Both decisions occur in SQLite before crossing the driver boundary. Escaping and multiple fields add JSON bytes: this is not a 4,000-byte bound on a field's serialized representation, the whole driver row, SQLite's internal materialization cost or complete `history get` results. Inline data URLs are omitted from previews, while original attachment positions/locators and raw stored data remain unchanged.
- An oversized attachment list produces a structural omission notice, never a fabricated `tool:0` attachment. A real attachment whose MIME equals the notice text remains an attachment because its URL key distinguishes the shape, including a null URL after data removal.
- Upstream relationship: adopts uniform indexing, transactional import and resumable one-time migration; retains NUL-fidelity and SQL-preview/locator corrections. Startup after completed migration does not promise repair of later missed asynchronous index writes.
- Watch surfaces: `packages/opencode/src/history/projection.ts`, `packages/opencode/src/history/media.ts`, `packages/opencode/src/history/service.ts` and `packages/opencode/src/history/import.ts`. Read actual producers/callers when upstream reorganizes these paths; the two current fork-different production files are `projection.ts` and `media.ts`.
- Tests/evidence: `packages/opencode/test/history/` NUL/projection/media/attachment-around tests and the C05 record in [selected synchronization](upstream-sync-2026-09-15-5198ff54.md). The accepted final history run has 68 passes, five upstream benchmark skips, and 625 assertions; this audit does not rerun or relabel that evidence.
- Review basis: upstream `5198ff540efb5ca9fff2baa64555324d43a721b9`, main runtime/test behavior `4eacc84dccf83c22f533c35bea282d4c5a38cacd` (history fixes already present at `64e47eb7695e3ce137ba95a6d1f5b4b381eed58d`).
- Retirement condition: upstream supplies equivalent NUL fidelity, SQL-side field/list budgets and structural locator-safe omission behavior, proven against raw retrieval and real preview formatting.

## FC-018 — explicit empty values in actor shell flags

- Status: active
- Canonical owner: fork `main` actor shell argument parsing
- Observable contract: `extractNamedFlags` rejects an explicitly empty value in
  both flag forms. `--flag=` already failed; `--flag ""` now fails the same way
  with `actor: --<flag> requires a value`. A recognized flag is therefore either
  absent or carries a non-empty value, so the verb mappings' truthiness spreads
  cannot silently drop a value the caller supplied. Non-empty values, position-
  independent flag scanning, heredoc prompts and unrelated tokens are unchanged.
- Upstream relationship: upstream accepts the empty space-form value and then
  drops the selector while mapping, so `actor run explore "d" "p" --model ""`
  launches at the default model instead of reporting the empty value. This is
  fork hardening of shared code, not a rejected upstream decision.
- Watch surfaces: `packages/opencode/src/tool/actor.ts` — `extractNamedFlags`
  and the run/spawn/send flag mappings that consume its result.
- Tests/evidence: `packages/opencode/test/tool/actor.shell.test.ts`, "an
  explicitly empty flag value fails like a missing one", covering `--model ""`,
  `--model=""`, `--task ""` and `--command ""`. Reverting the guard to the
  `undefined`-only check fails that case and nothing else.
- Propagation note: propagated to `dev/compat` on 2026-09-16 through merge
  `e3920adbbb91f44959a6110a48d6ca5cb1f5087d` with adaptation
  `452123b7b4941ef0f605961fd9e8f8a23a079462`. That branch previously kept an
  explicitly empty `--variant ""` for its strict schema; the shared parser now
  rejects it at parse time, its shell test asserts that error, and DC-ACTOR-002
  records the parse-time contract.
- Retirement condition: upstream rejects empty values in both flag forms, or the
  flag mappings stop depending on truthiness so an empty value reaches schema
  validation with an equivalent error.
