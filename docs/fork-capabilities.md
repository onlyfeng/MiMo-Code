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
- Last reviewed: 2026-10-30
- Upstream: `ee0a93b5dff36f689e28957b2e4377159a9a9731`
- Prior reviewed upstream: `3e92e0d8f0308603180ad03dbc67828c94c09ec4`
- Main behavior (runtime/tests): `f9ef3fcc5c4d8256f4805ea60897911f1753b6bf` (compaction cleanup, cancellation-aware owned summarize outcome and explicit search opt-in)
- Inherited compat behavior: `cd1fdc8de0b6eba7363dde88a4ea1bc191e04841` (shared changes inherited; configured native/fallback search retained with Exa opt-in)
- Bundled guidance content: `19362075089580aef8b709de58a5433cbfd6608b` (available search/MCP and DuckDuckGo fallback; explicit Exa/search MCP configuration)
- Prior fork `main` tip: `4a1c42148765755fba39d80103a76879965b8a7f`
- Complete code-difference audit: [2026-09-15 implementation closure](fork-difference-closure-2026-09-15.md), with fixed Git trees, per-file ownership, completed F01–F11 decisions and retained boundaries.
- Original audit baseline: [2026-09-15 findings](fork-difference-audit-2026-09-15.md); its 529 file pairs, source snapshots and pre-implementation findings remain historical.
- History: [fork-registry-history.md](fork-registry-history.md)

`Upstream` remains the overall upstream review baseline. `Main behavior` names
the reviewed runtime/test tree; bundled guidance has a separate content snapshot.
Pure registry/history commits advance neither reference. The selected released
capability audit is recorded in [the model API review](released-model-api-review-2026-09-08.md).

Latest reviewed synchronization: [2026-10-30 full sync through `ee0a93b5`](upstream-sync-2026-10-30.md), C01–C03 (N=3). Adopt failure/interruption cleanup and boundary-model selection for compaction inside the owned atomic summarize path; success requires a persisted projection even after cancellation. Remove the Xiaomi search sidecar and implicit provider search exposure; Exa is opt-in, while compat retains configured native/fallback routes. Adopt search MCP and DuckDuckGo fallback guidance. FD-005 retires only its sidecar clause; no FD/FC/DC owner retires. Validation and publication are tracked in the linked record.

Previous synchronization: [2026-10-29 full sync through `3e92e0d8`](upstream-sync-2026-10-29-3e92e0d8.md), C01–C04 (N=4). Adopt caller-supplied session ids bounded to the engine's `ses_` shape, and Xiaomi API/token-plan credentials stored under their own providers with every family consumer (WebSearch sidecar and gate, in-house ordering, large-model defaults, header, logout, login/fallback model, voice credentials) resolving `xiaomi-*`. FD-005's resolved sidecar API id and FC-016 voice ownership are unchanged; compat adapts only the DC-WEBSEARCH-001 sidecar gate and key. No owner retires. Validation and publication are tracked in the linked record.

Previous synchronization: [2026-10-28 quota sync through `ebd06ee2`](upstream-sync-2026-10-28-ebd06ee2.md), C01 (N=1). Exact provider quota exhaustion is terminal while ordinary429 keeps bounded request and persistent live-step budgets. Host precedence, scope isolation and compat native-search handling remain. No owner retires; validation/publication are tracked in the linked record.

Previous synchronization: [2026-10-28 full sync through `24546043`](upstream-sync-2026-10-28.md), C01 (N=1). Adopt config-driven always-direct MCP exposure and regenerate SDK. Retain GPT hidden direct calls, legacy frozen direct calls, request authorization and frozen schema gates. No owner retires. Validation and publication are tracked in the linked record.

Previous synchronization: [2026-10-27 full sync through `d85f3553`](upstream-sync-2026-10-27.md), four capabilities. Adopt Windows system-tar extraction and its installation fixtures, explicit MiMo npm wire coverage, README downloads/screenshots and the lighter two-by-two global concurrency regression. Keep the existing workflow resume budget and compat overlays. Windows CI now runs the existing launcher suite so the new PATH-shadow regression executes on actual Windows. No owner retires. Validation and publication are tracked in the linked record.

Previous synchronization: [2026-10-26 full sync through `0fe2cbbc`](upstream-sync-2026-10-26.md), five capabilities. Adopt the `MIMOCODE_ENABLE_AGENT_CLI_SKILLS` opt-in for the `claude-code`, `codex` and `grok-build` skills in place of PATH gating (FC-005, FC-011), drop the `claude` PATH probe from the environment prompt, take each model's declared npm instead of pinning MiMo-named ids (FD-005), and adopt the 0.1.16 release, the external FDS default and tag releases without a unit-test rerun (FC-012). The fork's PPTX guidance regression stays beside upstream's agent-CLI skill tests. No owner retires. Validation and publication are tracked in the linked record.

Previous synchronization: [2026-10-22 full sync through `e37f2c2d`](upstream-sync-2026-10-22.md), five capabilities. Adopt persistent pure-empty retries and durable retry records with chronological cleanup, legacy normalization, receipt identity and bounded reasoning continuation. Append rebuild boundaries after the tail with explicit placement identity, preserve backdated chronological windows and receipt-aware writer/turn history, retain atomic recovery settlement, and adopt stable Compose Next anchors and upstream spec provenance. Validation and publication are tracked in the linked record. No owner retires.

Previous synchronization: [2026-10-21 full sync through `8fd65328`](upstream-sync-2026-10-21-786151b3.md), seven capabilities. Adopt the per-context-window memory paths reminder in place of the per-message recall reminder. File tools still resolve the legacy `{current_session_id}` placeholder for system prompts already frozen in prefix snapshots (FC-002). Adopt the lossless session database: no turn-end prune, `stripNonEssential`, `SessionCompaction.prune`, rebuild microcompact, `compaction.prune` or pressure levels (FC-015). Adopt the empty-turn part reset into the fork's pure-empty branch (FC-009), the YAML-safe Compose Next source contract (FC-011) and the `mimo-v2.6-flash` voice control default (FC-016). Terminal HTTP403/HTTP402 refusals now stop before the capacity heuristic (FC-013); upstream added this while the sync was in progress. The merged and reverted session error settlement is tree-neutral. `hasActorTool` still fails closed (FC-001) and `auto_worktree` stays (FC-007). No FD/FC owner retires. Publication evidence is in the linked record.

Previous synchronization: [2026-10-20/21 full sync through `cf8c09d5`](upstream-sync-2026-10-20-c1527b91.md), four capabilities. Contain non-interrupt prefix-capture defects around the complete frozen capture, count settled writer Deferreds from the drain snapshot, and retain the fork's scoped non-empty capture fixture. FD-009 still rejects empty captures before child creation; no shared owner retires. All four decisions are published on both branches; the live addition adopts Compose Next unavailable-input, spec source and finish guidance unchanged. Main `7e3b1ae7` and compat `6a02b3d3` each pass exact-SHA lint/typecheck/test, including compat Windows. The linked record contains all six runs; final docs-only descendant equivalence, refreshed tips/ancestry and scoped cleanup are checked in the execution receipt.

Previous synchronization: [2026-10-20 full sync through `4e58a801`](upstream-sync-2026-10-20.md), thirteen capabilities. Adopt durable input receipts and lane scheduling in place of the old send/drain and async-only queue contracts; preserve atomic admission, task/provenance, recovery, approval and generation ownership. Adapt sticky MCP deferral through a fixed dispatcher and frozen prefix, queue-aware checkpoint/post/goal views, and pure-empty retry policy while retaining bounded reasoning-only continuation. No active FD/FC owner retires. All thirteen decisions have propagated into compat, preserving eleven DC owners and fifty-two production overlay paths. The linked record retains the failed compat OpenAPI CI and the successful corrected-source lint/typecheck/test runs on both branches, including compat Windows. Final docs-only descendant equivalence and scoped cleanup are checked in the execution receipt.

Previous synchronization: [2026-10-16 sync through `bf0563dd`](upstream-sync-2026-10-16.md), one capability. Adopt verbatim media replay after overflow compaction into FC-001's atomic replay commit, extend FC-009's attachment envelope with file-URL local paths and stable `[Image: <name>]`/`[PDF: <name>]` marker identity, keep the caller `system` on attachment-only messages, and adopt unique `mimo-paste-*` paste names.

Path note: living registry entries use the `packages/cli/` and `packages/sdk/` layout from the 2026-10-02 synchronization, including inside older dated bullets; dated synchronization records keep the paths of their time.

Previous synchronization: [2026-10-15 sync through `496bb8cb`](upstream-sync-2026-10-15.md), one capability. Adapt upstream's inbox wake ownership into FC-001's single `Inbox.wake`: an `Instance.claim` taken before receiver preparation lasts until the wake fiber exits, so ordinary disposal cannot close the scope holding a scheduled wake. Upstream's abort-immediately-after-send case is not adopted; FC-001 records the pre-existing asynchronous-admission gap it exposes.

Previous synchronization: [2026-10-14 sync through `6ba6a625`](upstream-sync-2026-10-14-6ba6a625.md), one capability. Adopt replay-safe history migrations and the replay-safe `migrate()` wrapper unchanged; the two edited shipped migrations are upstream-owned and journal-name selection keeps applied databases from rerunning them.

Previous synchronization: [2026-10-14 full sync](upstream-sync-2026-10-14.md), twelve capabilities from two upstream commits through `e27e87de`. Adopt native Windows memory path parsing unchanged. Adopt the settled tool execution boundary (`ToolPart.execution`, `inputComplete`, transactional tool-part writes, `ToolSettlement` for plugin, registry, MCP and exec results), request-phase `session.status{retry}`, Deferred-backed `InstanceState` initialization and owned-run `awaitExit`. Adapt exact-target resume, pending-input refusal, the host execution attempt and empty-stop recovery into FC-001's settlement and continuation model without upstream's history trim; keep FD-006's exec close-abort-join and MCP harness-tag escaping (FD-005).

Previous synchronization: [2026-10-13 full sync](upstream-sync-2026-10-13.md), fourteen capabilities through the user-frozen baseline `b258d28f`. Adopt MCP tool lazy loading (`MIMOCODE_MCP_TOOL_SEARCH`, deferral on by default) with FD-005's resolved harness identity and prefix-capture parity, background MCP startup with FC-004's pending imports preserved, retirement of the legacy compose agent and skills, the host-served plugin SDK (FC-006's dependency wait retires), CI tag releases with a required `GH_REPO` (FC-012), the npm FDS launcher, cron session affinity, cross-drive containment, the root script-test guard (FC-008), OpenCode Go session headers and the `history_fts.kind` index.

Previous synchronization: [2026-10-10 full sync](upstream-sync-2026-10-10.md), two capabilities through `f98dcd1c`. Adopt upstream's opt-in startup import of Claude Code sessions: `MIMOCODE_ENABLE_CLAUDE_IMPORT` replaces `MIMOCODE_DISABLE_CLAUDE_IMPORT`, startup import is off by default and manual `session import-claude` is unchanged. Adopt the matching bundled `mimocode-docs` configuration entry and the closed `xlsx-official` library-choice table row. No fork owner adapts or moves.

Previous synchronization: [2026-10-04 full sync](upstream-sync-2026-10-04.md), seven capabilities through `6babeb0b`. Adopt upstream's instance-preserving provider refresh: the `POST /global/provider/refresh` endpoint and v2 SDK method, the `Instance.updateIdle` admission barrier, models-only Config reload, execution claims for HTTP API operations and MCP sampling, and stale sampling-owner rejection. Adapt the refresh to keep FD-005 harness alias trust, keep FD-001's sampling approval isolation, and run the refresh suites in an FC-008 isolated job.

Previous synchronization: [2026-10-02 full sync](upstream-sync-2026-10-02.md), ten capabilities through `698f0f29`. Adopt upstream's `packages/cli` and flattened `packages/sdk` layout, the removal of the private overlay, free channel, committed OpenAPI snapshot, husky and non-spec docs, the first-launch agreement and the leftover `MIMOCODE_*` renames. Keep the root test guard (FC-008), the `CLAUDE.md` link and a required release `GH_REPO` (FC-012), and FC-013's retry reference document.

Previous synchronization: [2026-09-30 full sync](upstream-sync-2026-09-30.md), one capability through `336aee0e`. Adapt upstream's preparation-phase cancellation: an interrupt before stream cleanup owns the assistant persists `MessageAbortedError` and publishes the error before idle, with the fork's transactional assistant creation as the acquire step; FC-001 recovery candidacy is unchanged.

Previous synchronization: [2026-09-29 full sync](upstream-sync-2026-09-29.md), seven capabilities through `87a27da5`. Adopt upstream's removal of the unmaintained web/desktop/cloud packages and the turbo-free typecheck toolchain; retire fork edits to the deleted files and FC-008's enterprise fixture; keep fork experiment scripts in the package typecheck project.

Previous synchronization: [2026-09-27 full sync](upstream-sync-2026-09-27.md), four capabilities through `454521a8`. Adopt deferred instance refresh, workspace-bound cron storage, interactive Bash request ownership and UTC cron guidance; retain shared Actor, workflow and approval contracts.

Previous synchronization: [2026-09-26 full sync](upstream-sync-2026-09-26.md), six capabilities through `849ca66c`. Remove unpublished duplicate-call cancellation and TaskGate re-entry, adopt interactive subagent asks and host error classification, and retain shared fork approval, Actor lifecycle and scoped retry contracts.

Previous synchronization: [2026-09-24 full sync](upstream-sync-2026-09-24.md), three capabilities through `2b993ac9`. Retire Orchestrator and tool-specific shell invocation, preserve local image attachment paths, and keep the shared fork permission, Actor, frozen context and request-authority contracts. FC-018 retires with its parser; the remaining FD/FC owners stay active.

Previous synchronization: [2026-09-23 full sync](upstream-sync-2026-09-23.md), three capabilities through `a273d345`. It removed PascalCase model-facing projection and tool-call flooding middleware, and introduced the now-retired same-step exact duplicate cancellation. Canonical tool IDs, FIFO and failure cascade, fork replay boundaries and hidden-MCP/native Actor snapshot identity remain active.

Previous synchronization: [2026-09-22 full sync](upstream-sync-2026-09-22.md), ten capabilities through `1579e7d9`. It introduced the now-retired flooding and PascalCase projection alongside still-active failure cascade, runtime-local Actor status, inbox/TUI projections, automatic title tool choice, the 0.1.15 release, MCP confirmation elicitation and opt-in host model transport.

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
| FC-001 | actor, inbox, runner, session state, recovery/resume                                                      | Typed upstream admission plus stronger fork lifecycle            | Preserve atomic acceptance, lane ownership, settlement and recovery                               |
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
| FC-019 | `quickjs-emscripten-core` dependency patch, `patchedDependencies`, sandbox runtime disposal               | Fork patch of the dependency upstream ships unpatched            | Keep the patch until a release refreshes heap views; re-verify it on any version bump    |

## FC-001 — linearized actor generations and persistent-peer lifecycle

- 2026-10-30 synchronization: Keep summarize in `SessionPrompt.startSummarize` and its owned main runner, atomic `createIfLatest`, task identity and commit receipt. Validate the model before mutation, remove unprojected boundaries on exit, and verify projection after runner completion including cancellation fallback. The HTTP cancelled-compaction regression proves no false success.

- 2026-10-22 live advancement: a newly accepted lane input supersedes a failing retry step through the existing claim/consume/task and run-approval boundaries. Recovery keeps its locked parent and does not observe the new-input watcher. Successful cleanup removes retry parts but retains assistant identities referenced by durable first-delivery receipts. Tests cover lower-ID admission, supersession, receipt anchors, recovery and retained authority.

- 2026-10-21 synchronization: upstream `88673c41` deletes `recall-reminder.test.ts`, its only consumer of the `actor` hint, and moves the `hasActorTool` predicate cases into `test/tool/actor-subagent-gating.test.ts` with upstream's "an unresolvable agent keeps the tool" case. The fork keeps PR #53's fail-closed result: that moved case asserts `hasActorTool(undefined) === false`, and `ToolRegistry.available` remains the only production caller.

- 2026-10-20 post-sync convergence: remove the retired inbox wake's optional
  Runner join/admission arguments, `runLoop` inbox-deferral argument and
  `CancelEpoch` wake holds. The durable scheduler now owns that work; the
  synchronous session cancellation epoch, per-run generation, acquisition
  checks and owned cleanup remain. Session fork reads its source-message
  snapshot before destination creation and reuses it for cutoff validation
  and subsequent busy-agent inspection, while retaining the transaction's
  fresh rendered-order copy. Instance-owned cron cleanup discovered during
  final CI is recorded under FC-007.

- 2026-10-20 synchronization: adopt upstream `949a3bcc`'s durable input receipts and lane scheduler, replacing the old `Inbox.send`/drain/wake implementation and the async-only queue contract. `Controller.accept` commits the complete user message and parts with its receipt, preserving fork generated-part replay checks, provenance, task binding and ownership validation. Receipt states are `accepted`, `claimed`, `settled`, `cancelled` and `rejected`; outcomes distinguish success, assistant error, interruption and never-ran input. First delivery fixes input placement, while terminal receipt retention and GC replace destructive drain deletion. `session.receipt.updated` replaces `InboxArrived`; accepted-only consumers inspect the committed user input, not legacy row content. The API retains the `inboxID` result field for actor callers as a receipt identifier. Earlier dated send/drain/wake and async-only descriptions below are historical where superseded by this review.
- The scheduler owns each `(sessionID, actorID)` lane, claim extension and idle re-kicks. The synchronous `/message` route streams 200 when admitted idle and returns 202 plus the persisted user and `receiptId` when busy; `/prompt_async` returns 202 with `receiptId`, or 204 when no turn is admitted. Receipt lookup is session-scoped. Strict internal `startPrompt`/command/shell/summarize/recovery occupation remains independently guarded; the HTTP queue fallback does not weaken those atomic entry points. `noReply` persists history without accepting, claiming or scheduling a turn, and cannot replace a queued task's authority. Cancellation advances the persisted queue epoch before signalling execution, settles accepted unclaimed input as `never_ran`, and cannot restart an old-epoch wake. Such a queued prompt returns its original user rather than manufacturing an aborted assistant. Resume checks queue epoch as well as the retained actor/runner generation before occupation.
- Main completion automatically waits for owned subagent executions and legacy live runners. New input wakes the wait without cancelling the child; a receipt-only wake cannot move the current input frontier backward. Explicit actor wait observes execution and input revisions; timeout preserves a discoverable running child and returns structured state. Generation handoff, persistent-peer retirement, frozen context, exactly one terminal notice and close-abort-join remain fork-owned. Seedless main input can remain accepted without spinning or inventing a model; a later valid prompt may consume it. Only a positively known peer uses the configured-model fallback.
- Queue rendering is shared by model requests, checkpoint context, post-hook trajectories, goal judging and fork/export/import projections. Accepted but unconsumed input remains hidden; consumed inputs retain first-delivery order, including caller IDs older than a current frontier. A checkpoint boundary must not have its continuation authority displaced by reconstructing an older consumed input. Structured completion stays attached to its original caller even if a later prompt is consumed in the same lane run. A newly admitted user may settle an older unfinished error while preserving that error. Atomic replay, task inheritance, fail-closed public actor recovery, invocation approval and generation ownership remain active. Evidence and accepted-source CI: [thirteen-capability record](upstream-sync-2026-10-20.md).

- 2026-10-15 follow-up (closes the pre-admission cancel gap): `SessionRunState.cancel` first advances a per-session `CancelEpoch` (`packages/cli/src/session/cancel-epoch.ts`) synchronously. `Inbox.wake` records that epoch before its first suspension and passes it as the loop input's `cancelEpoch`; the main-agent inbox loop hands it to `SessionRunState.ensureRunning`, which gives `Runner.ensureRunning` an `admit` predicate evaluated inside the same atomic transition as `canStart`, both on entry and after `onBusy`. A wake whose epoch moved is refused with an interrupt before it starts or joins a run, so no model request is made and its inbox row stays durable for the next ordinary run; a wake scheduled after the cancel records the new epoch and runs normally. Non-main receivers keep their `ActorExecution` path (`exec.cancelled`), and `LoopInput` stays internal (no HTTP/SDK change). Upstream's "abort immediately after send cannot let a queued wake restart the receiver" case is now carried verbatim; removing the admission predicate makes it fail again. `Session.remove` releases the removed session's epoch beside its other process-wide session state, deferred while a scheduled wake still holds it: `Inbox.wake` records the epoch and takes a `CancelEpoch.hold` together with its instance claim and releases both when the wake exits, because dropping the entry earlier would read as the initial epoch and admit a wake recorded before a cancel (`test/session/cancel-epoch.test.ts`).

- 2026-10-15 synchronization: upstream `f82fa60a` makes a scheduled inbox wake hold an `Instance.claim` until its fiber exits. Adapted into `Inbox.wake`, the single entry for `send` and `wakePending`: the claim is taken on the current service instance before receiver lookup and instance preparation, and claim, preparation, `EffectBridge` fork and exit-observer registration form one uninterruptible handoff; the outer wake fiber starts immediately and the bridged receiver loop keeps its own instance and run-disposal marker. Known gap at that point (closed by the follow-up below): a cancel issued after `send` returns but before the bridged loop reaches Runner admission did not stop that wake, because the bridge (`Effect.runFork`) and the `InstanceState` lookup in `SessionRunState.runner` suspend before admission, so `SessionRunState.cancel` finds no busy runner. The gap predates this range (reproduced on `a7d242df` without disposal: the receiver issues a second model request); upstream closes it by synchronous admission and asserts it in `wake-instance-handoff.test.ts` ("abort immediately after send cannot let a queued wake restart the receiver"), which the fork did not carry until the pre-admission cancellation path below existed. Evidence: `test/inbox/wake-instance-handoff.test.ts` (five adopted cases), `test/inbox/` and `test/actor/cancel-notification.test.ts`.

- 2026-10-14 synchronization: upstream `002cb4c9` rebuilds resume around an exact reviewed target and a history trim that restarts from the parent user. The trim and parent restart are not adopted: resume still settles the selected assistant in its admission transaction and continues from it, so `MessageV2.planResumeTrim` and `assertResumeModelBoundary` ship unused. Adopted into `startResumeTurn`: `POST /session/:id/resume` accepts an exact `assistantMessageID` (exclusive with `userMessageID`, also forwarded to actor resume); a pending question or permission in the session refuses resume with 409 before occupation and again at admission; admission runs before `SessionRunState`'s orphan sweep through the new `startOwned` `admit` argument, so a rejected or cancelled admission writes nothing; a Stop before admission reports 404 from `POST /session/:id/resume` while `startResume` keeps reporting the interruption; and an optional host execution `attempt` is prepared, rechecked, admitted before the settlement commit, gated on `beforeWork` and finished when the run fiber exits (`Runner.startOwned` now exposes `awaitExit`), with `ExecutionScope` on main model calls. Actor resume refuses `attempt`. An empty provider stop is a candidate even after completion or a later error, until an abandonment settles it with `MessageAbortedError`; a completed errored assistant with delivered output stays settled as before. Residue cleanup skips summary and structured-output assistants. Model tools now run in the processor's tool scope, which execution cleanup closes and joins, so `Actor.cancel` called from a tool delegates to the service scope and waits interruptibly exactly as a direct execution hook does; without that, a peer cancelling its own spawn through the `actor` tool deadlocked (`test/actor/self-cancel.test.ts`). Evidence: `test/server/session-recovery.test.ts` (exact-target matrix, host attempt lifecycle, empty-stop matrix), `test/effect/runner.test.ts`, `test/session/invalid-output-continuation.test.ts`.

- 2026-10-13 registry correction: `packages/cli/src/agent/config.ts` and `packages/shared/src/util/encode.ts` join the watch surfaces. Both were already fork-different (`hasActorTool` fails closed for an unresolvable caller since PR #53; `compareUtf8Bytes` is the SQLite BINARY tie-break the chronology consumers use) but no entry named them, so a path-based sync review could not find them. No behavior changes.

- 2026-10-04 synchronization: upstream `6babeb0b` adds an `Instance.updateIdle` barrier for explicit provider refreshes. A refresh returns `pending` while any request, execution claim, disposal or failed cleanup exists, so live Actor and session executions defer it. While a refresh is applying, new requests wait and `Instance.claim` throws `InstanceBusyError` exactly as upstream; only the explicit refresh endpoint opens that window and no TUI path calls it. Actor generation ownership and terminal claims are unchanged.

- 2026-10-02 synchronization: upstream `698f0f29` deletes the committed `packages/sdk/openapi.json`; the SDK build now writes a scratch copy at that path and removes it. The published actor-recovery contract is asserted on the runtime OpenAPI document and carried by the generated v2 SDK, so the snapshot leaves this entry's surfaces.

- 2026-09-30 synchronization: an interrupt-only exit while a run-loop step is still preparing (after `sessions.createMessage` commits the assistant, before stream cleanup owns it — snapshot capture, language resolution, tool resolution) now persists `MessageAbortedError("Aborted")` and publishes `Session.Event.Error` before SessionRunState publishes idle. An assistant that the processor already errored or completed is untouched. The assistant still has no `time.completed`, so it stays a recovery candidate exactly as a stream-phase abort does; the next admitted user's orphan sweep keeps that error rather than writing the generic abandonment message. `test/session/prompt-effect.test.ts` covers both preparation boundaries and the following turn.

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
  episodes, durable input acceptance, lane claim/settlement, main prompt and
  exclusive command/init/shell/summarize/recovery/resume admission, busy/idle
  publication, execution-aware cancellation, receiver retirement and parent
  notification are linearized per session and actor. Every queue producer uses
  the same atomic message/parts/receipt acceptance; the queue is not specific
  to the asynchronous HTTP route. HTTP `/message` has an idle 200 / busy 202
  contract rather than dropping a busy user's message with 409, while the
  explicitly exclusive runtime entry points keep typed busy refusal. The
  asynchronous route acknowledges durable acceptance with a receipt before
  execution, and receipt state remains queryable after terminal settlement.
  A queued lane caller waits for lane ownership; entering Runner is not evidence
  that it was accepted. First-delivery ordering and per-caller terminal results
  replace the old final-snapshot follower/retry workaround.
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
  Accepted inbox receipts remain durable throughout recovery and are scheduled
  afterwards through the same lane scheduler. Cancellation before successful admission withdraws the
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
  and TUI `routes/session/{plan-switch.ts,index.tsx}` under `packages/cli`.
  Tests include actor-owned-lifecycle, actor-exec-lifecycle, plan-approval,
  exec-interaction and real TUI plan-switch events.
- Upstream relationship: adopts upstream durable receipts, lane scheduling and
  automatic subagent waiting, plus typed exclusive Runner admission and
  actor-scoped `replace-agent`, while retaining the stronger
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
- Watch surfaces: `packages/cli/src/actor/`,
  `packages/cli/src/agent/config.ts` (`hasActorTool` fails closed for an
  unresolvable caller, PR #53),
  `packages/cli/src/effect/runner.ts`, `packages/cli/src/inbox/`,
  `packages/cli/src/session/cancel-epoch.ts`, `packages/cli/src/session/execution-ownership.ts`,
  `packages/cli/src/server/routes/instance/session.ts`,
  `packages/cli/src/session/checkpoint.ts`,
  `packages/cli/src/session/compaction.ts`,
  `packages/cli/src/session/llm.ts`,
  `packages/cli/src/session/message-v2.ts`,
  `packages/cli/src/session/prompt.ts`,
  `packages/cli/src/session/run-state.ts`,
  `packages/cli/src/session/session.ts`, `packages/cli/src/task/registry.ts`,
  `packages/cli/src/tool/actor.ts`, `packages/cli/src/tool/plan.ts`,
  `packages/cli/src/tool/session.ts`,
  `packages/shared/src/util/encode.ts` (`compareUtf8Bytes`, the SQLite BINARY
  tie-break used by chronology consumers),
  and `packages/sdk/src/v2/gen/`.
- Tests/evidence: actor lifecycle/cancel/spawn/turn suites,
  `packages/cli/test/server/session-actor-recovery.test.ts` exercises real
  HTTP/v2 SDK subagent and peer recovery, including independent receiver
  directories, exact candidate identity, concurrent 202/409, rejected control
  paths, task overrides, cancellation and expired receiver/model identities.
  See [public actor recovery](actor-recovery-api.md).
  Existing evidence also includes
  `packages/cli/test/inbox/fork-agent-compat.test.ts`, inbox wake/retirement
  tests, `packages/cli/test/effect/runner.test.ts`, server
  prompt/prompt_async-queue/recovery and resume admission tests
  (`packages/cli/test/server/session-prompt-busy.test.ts`), session
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
- 2026-09-04 closing-window correction (historical follower implementation, replaced by durable lane receipts on 2026-10-20): a persisted prompt that joins an older
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
  `packages/cli/test/server/session-recovery.test.ts` predicate matrix plus
  the two fork-owned cases, plus `packages/cli/test/session/prompt-sweep.test.ts`
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

- 2026-09-15 shared chronology/admission (message identity/atomic replay retained; the drain/deletion implementation below was replaced on 2026-10-20): caller IDs are identity keys, not
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

- 2026-10-22 synchronization: new rebuild parts carry `placement: "after-tail"`; legacy records retain exact chronological seam reconstruction. Model requests use the boundary digest and unanswered text/media, while the writer and logical turn recover full receipt-aware history. Queued inputs are excluded until delivery or terminal settlement. Task provenance, run approval and fail-closed frozen capture remain unchanged. The appended window and legacy collapse are covered by placement, writer-tail, legacy golden, rebuild-unify and tail-digest tests.

- 2026-10-21 synchronization: upstream `88673c41` replaces the per-message recall reminder and `SessionCheckpoint.hasMemoryOrTasks` with one memory paths reminder per context window, and names the project and session segments `<project_id>`/`<session_id>` in the memory instructions. Adopted unchanged in the system text, which therefore no longer names the real project ID or tells the model to keep `{current_session_id}` verbatim. Read/Write/Edit/Glob/Grep and `apply_patch` still resolve `{current_session_id}`: system prompts frozen in an existing session's prefix snapshot keep that sentence, and the runLoop reuses the frozen system instead of rebuilding it. Writer modes, frozen prefix ownership and FD-009 admission are unchanged.

- 2026-10-20 synchronization: checkpoint writer context uses `MessageV2.renderedOrder` with consumed receipts, so unclaimed inputs do not enter a writer snapshot and first-delivery order survives queue reconstruction. The same queue-aware view feeds post-hook trajectories and goal judging; context-boundary continuation identity and run-approval ownership remain distinct from historical input reconstruction. Frozen new MCP captures carry a fixed dispatcher and complete authorized hidden pool; legacy active/loaded masks remain readable under FD-005/FD-006. Canonical writer modes and fail-closed admission do not retire.

- Status: active
- Canonical owner: fork `main` checkpoint/session runtime
- Observable contract: checkpoint generation uses one canonical writer tool and
  an isolated child session. Forked mode is the default and uses the parent
  agent's frozen prefix; explicit `checkpoint.fork: false` uses the checkpoint
  writer's own frozen system, tools, MCP membership, and permission with the
  aligned message delta. Memory instructions name the project and session as
  the literals `<project_id>`/`<session_id>`, so the system prompt is identical
  across projects and sessions; the first unsent own user message of each
  context window persists one memory paths reminder with both real paths.
  File tools still resolve the legacy `{current_session_id}` placeholder that
  system prompts frozen before this contract carry. Disabling checkpoint generation removes
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
- Watch surfaces: `packages/cli/src/session/checkpoint.ts`,
  `packages/cli/src/session/checkpoint-paths.ts`,
  `packages/cli/src/session/llm-request-prefix.ts`,
  `packages/cli/src/session/memory-path-template.ts`,
  `packages/cli/src/session/prefix-capture-ref.ts`,
  `packages/cli/src/session/llm.ts`, and
  `packages/cli/src/session/prompt.ts`; Read/Write/Edit/Glob/Grep and
  `apply_patch` filesystem boundaries.
- Tests/evidence: checkpoint child-session, fork-mode, main-slice,
  prefix-capture, rebuild, watermark, writer-timeout, memory-write, and
  system-prompt suites plus `memory-path-template.test.ts`,
  `synthetic-reminder.test.ts` and `session-memory-dir-reminder-persist.test.ts`
  at the reviewed main behavior. The system-prompt stability case runs in a git
  fixture, because the fork's non-git fixture resolves the project ID to
  `global`, a word the global memory path also contains. Fork
  `server/session-recovery-task.test.ts` asserts that an answered recovered user
  gains no part. Its historical-task case and `skill-catalog-reopen.test.ts`
  exclude the reminder only on a never-sent user, and the reopen case asserts
  exactly one.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0b665c7e681e44cac6f1a6acf18732015fb2bf86`.
- Retirement condition: upstream exposes the same canonical writer, isolated
  child, mode-specific prefix ownership, aligned delta, and disabled-checkpoint
  guidance behavior; FD-009 remains separately satisfied or retired. The legacy
  `{current_session_id}` resolution retires only when frozen system prompts that
  carry it are rewritten or invalidated, or upstream resolves it.

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

- 2026-10-13 upstream PR record: `XiaomiMiMo/MiMo-Code#1282` (scope read state by actor and instance, opened 2026-06-24) is closed as obsolete; upstream removed the read-before-edit gate it scoped, which is the retirement recorded below. Its head branch `codex/upstream-read-state-scope` is deleted from the fork.

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

- 2026-10-28 synchronization: local and remote MCP config accept optional `alwaysDirectTools`; sanitized server-local names select top-level tools outside deferred search/use, without changing host override precedence, connection lifecycle or startup controls. Config arrays use the existing mutable schema convention so ACP accepts the regenerated SDK types. FD-006 retains execution and frozen authority.

- 2026-10-20 live catch-up through `4e58a801`: optional `MCP.readiness()` reads current configured-server status and tool definitions without awaiting connection settlement or starting a connection. Pending Claude imports, `auto_connect` precedence, ownership and refresh lifetime remain unchanged. The prompt intersects readiness tools with the existing request-authorized search/dispatch catalog, reports latest outcomes at user boundaries and never turns connection readiness into invocation authority. Malformed historical reminder metadata is ignored without erasing an earlier valid state.

- 2026-10-20 synchronization: adopt sticky MCP deferral and fixed search/use entries through connection churn and an initially empty catalog. Search always sees the live authorized catalog, while changed catalog announcements wait for the next user-turn boundary. This does not auto-connect pending Claude imports or broaden connection authority. FD-005/FD-006 own resolved harness, dispatch and frozen implementation authority; the old conversation-loaded membership is now only a legacy snapshot compatibility carrier.

- 2026-10-13 upstream PR record: `XiaomiMiMo/MiMo-Code#1269` (keep Claude imports pending until connect, opened 2026-06-24) is withdrawn. Upstream still has no `auto_connect` and has since rewritten `mcp/index.ts`; the fork keeps the pending-import contract here, with `test/mcp/lifecycle.test.ts` and `test/mcp/claude-auto-connect.test.ts` as its evidence, and does not resubmit. Its head branch `codex/upstream-mcp-claude-pending-connect` is deleted from the fork.

- 2026-10-13 synchronization: upstream `2f373289` connects startup MCP servers in a background fiber; `MCP.tools()` waits at most three seconds and every other accessor awaits the settled state. Claude imports without explicit `auto_connect: true`, and entries with `auto_connect: false`, are still never attempted at startup. Upstream's new cleanup deletes a `pending` placeholder that an attempt left behind; it now skips those entries, so their pending status survives settlement. Removing the guard fails `test/mcp/lifecycle.test.ts` ("Claude Code local MCP server is pending until explicitly connected") and `test/mcp/claude-auto-connect.test.ts`. Upstream `463cbb28` makes MCP deferral the default for every function-calling model; request-local loaded membership and frozen seeding are unchanged (FD-005 note).

- 2026-10-04 synchronization: the models-only Config reload behind upstream's provider refresh skips Claude MCP import, plugin origins, command/agent scans and dependency installation, and publishes only the model keys. The ordinary path keeps the fork's native-override argument to `mergeClaudeMcp`, so pending imports and explicit `auto_connect` are unchanged; MCP configuration changes still require a restart.

- Status: active
- Canonical owner: fork `main` MCP runtime
- Observable contract: remote MCP URLs must parse as HTTP(S); malformed or
  unsupported values produce a stable failed status before client creation.
  Claude-imported entries remain pending unless MiMoCode configuration explicitly
  sets that entry's `auto_connect: true`, or a caller connects manually.
  `enabled: false` takes precedence; `auto_connect: false` keeps an enabled
  entry pending. Imported command/URL provenance and MiMoCode control overrides
  are preserved separately; a Claude file cannot grant its own auto-connect.
  Deferred MCP discovery and fixed `mcp_tool_use` dispatch use the request-authorized catalog;
  searching does not grant execution authority or add active tool schemas.
  New deferred-MCP frozen captures use the fixed dispatcher with empty loaded-tool membership.
  Legacy loaded membership remains only a frozen-snapshot compatibility input,
  constrained by captured schemas and current request authorization.
  Local stdio servers retain bounded exit and stderr
  diagnostics across fast natural exits and host shutdown; secrets are redacted
  before either logs or failed status details expose the diagnostic. In Codex
  compact mode, authorized MCP wrappers remain available through exec and
  compatible hidden direct calls, without requiring an invisible search call.
  Request-disabled tools never enter a warm frozen executable pool. Deferred
  harnesses retain the fixed search/use entries across catalog changes.
- POLICY-01 carrier review: request-pinned MCP membership remains unchanged;
  same-named MCP tools cannot acquire canonical Actor/plan control identity or
  its commit callback. Imported-server and transport policies are unchanged.
- Upstream relationship: adapts released automatic connection through explicit
  per-entry configuration; retains fork validation and lifecycle hardening.
- Watch surfaces: `packages/cli/src/mcp/index.ts`,
  `packages/cli/src/config/mcp.ts`, `packages/cli/src/config/config.ts`,
  `packages/cli/src/mcp/oauth-callback.ts`,
  `packages/cli/src/mcp/oauth-provider.ts`,
  `packages/cli/src/mcp/stdio-transport.ts`, plus request-local MCP
  propagation in session prefix and tool-registry code.
- Tests/evidence: `packages/cli/test/mcp/lifecycle.test.ts`,
  `packages/cli/test/mcp/claude-auto-connect.test.ts`, config merge tests,
  `packages/cli/test/mcp/oauth-auto-connect.test.ts`,
  `packages/cli/test/mcp/oauth-browser.test.ts`,
  `packages/cli/test/mcp/oauth-callback.test.ts`, the isolated real-process
  `packages/cli/test/mcp/stdio-exit-observe.test.ts`, and frozen
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

- 2026-10-26 synchronization: upstream `18adffc9` replaces binary-presence gating of bundled skill extraction (`REQUIRED_COMMANDS`, `isBuiltinSkillInstalled`) with `AGENT_CLI_SKILL_NAMES` and `shouldExtractBuiltinSkill`: `claude-code`, `codex` and `grok-build` extract only when `MIMOCODE_ENABLE_AGENT_CLI_SKILLS` is true, and `MIMOCODE_DISABLE_OFFICIAL_SKILLS` still removes the office/media set. This changes only the extracted set; listing, search, loading and the frozen catalog keep their shared permission gates. An isolated `debug skill` run lists the three skills only with the selector set. Evidence: `test/skill/builtin.test.ts`, `test/skill/bundle-discovery.test.ts`.

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
- Watch surfaces: `packages/cli/src/skill/index.ts`,
  `packages/cli/src/skill/search-access.ts`,
  `packages/cli/src/session/skill-catalog.ts`,
  `packages/cli/src/session/message-v2.ts`,
  `packages/cli/src/session/llm-request-prefix.ts`,
  `packages/cli/src/session/prefix-snapshot.ts`,
  `packages/cli/src/session/session.sql.ts`,
  `packages/cli/migration/20260908000000_session_prefix_skill_catalog/migration.sql`,
  `packages/cli/src/tool/skill.ts`,
  `packages/cli/src/tool/skill-search.ts`,
  `packages/cli/src/session/observed-tool-parts.ts`,
  `packages/cli/src/session/compaction.ts`,
  `packages/cli/src/session/system.ts`, and
  `packages/cli/src/session/prompt.ts`.
- Tests/evidence: skill search/description/discovery and tool skill/search
  suites retain the permission contract. `skill-catalog-system-tail.test.ts`
  checks actual provider recovery, next-direct-turn migration, same-turn tool
  continuation, cold capture and compaction; `skill-catalog-capture.test.ts`
  covers capture freezing. `skill-catalog.test.ts`, `message-v2.test.ts` and
  `prompt-skill-command-multi.test.ts` cover historical recognition, loaded
  bodies and filtered system placement. `prefix-snapshot.test.ts` and
  `test/storage/prefix-skill-catalog-migration.test.ts` cover metadata and real
  old-database migration. Session tests are under `packages/cli/test/session/`.
  Local evidence does not assert publication, exact-head CI or compat acceptance.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0b665c7e681e44cac6f1a6acf18732015fb2bf86`.
- Retirement condition: upstream uses one effective permission/tool decision
  across discovery and invocation and provides equivalent retryable,
  generation-aware producer behavior plus versioned system-tail snapshots,
  same-turn freezing and lossless legacy-pair migration without rewriting
  history; FD-006 remains the tool-authority owner.

## FC-006 — instance-local plugin memory-write decision

- 2026-10-14 synchronization: upstream `002cb4c9` runs `tool.execute.before`/`after` hooks through `ToolSettlement`, so Stop waits for an admitted hook and a file hook's timeout still joins its promise. Adopted unchanged; `plugin/index.ts` still differs from upstream only by the `actor.postStop` `memoryWriteEnabled` injection.

- 2026-10-13 synchronization: upstream `4fcfe1b7` serves the plugin SDK from the host and removes per-directory dependency installs with `Config.waitForDependencies`. The fork's 2026-09-26 file-plugin dependency wait therefore has nothing to wait for and retires with its `pathToFileURL` import; `plugin/index.ts` now differs from upstream only by the `actor.postStop` `memoryWriteEnabled` injection, which is unchanged.

- 2026-10-04 synchronization: `Plugin.list({ initialize: false })` lets provider refresh reuse initialized hooks without loading plugins. The `actor.postStop` `memoryWriteEnabled` injection reads the live configuration; memory keys are not refreshed, so the decision is unchanged.

- 2026-10-02 synchronization: upstream `50b505a3` removes the private `src/ext` overlay loader from `plugin/index.ts` and its `url` import. The fork's 2026-09-26 file-plugin dependency-wait check still calls `pathToFileURL`, so the merge restores that import. The `actor.postStop` `memoryWriteEnabled` injection is unchanged.

- Status: active
- Canonical owner: fork `main` plugin service and plugin API
- Observable contract: the subagent progress checker receives
  `memoryWriteEnabled` from the same instance-local configuration service used
  by memory write gates. It does not depend on an HTTP config round trip that
  can reject a valid out-of-cwd worktree; an absent value remains fail-open for
  manual hook calls.
- Upstream relationship: fork integration hardening for the existing progress
  checker.
- Watch surfaces: `packages/cli/src/plugin/index.ts`,
  `packages/cli/src/plugin/subagent-progress-checker.ts`, and
  `packages/plugin/src/index.ts`.
- Tests/evidence:
  `packages/cli/test/plugin/subagent-progress-checker.test.ts` exercises
  enabled, disabled and absent values passed directly to the hook.
  `packages/cli/test/plugin/subagent-progress-chain.test.ts` additionally
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

- 2026-10-20 post-sync CI correction: CronBridge mounts now belong to the
  InstanceState generation that started them. A long-lived application Layer
  previously retained its scheduler after instance disposal, allowing it to
  consume later session tasks from the process-wide pool. Disposal marks its
  owner closed and stops that owner's exact handle; an old generation cannot
  stop a replacement mount. Ownership is registered outside the lifecycle
  lock and rechecked immediately before publishing a mount, so concurrent
  start/dispose cannot leave a late scheduler. Existing Layer cleanup,
  reentrant stop behavior, scheduling policy and test deadlines remain.
  This does not add a stronger join guarantee for every concurrent stop
  finalizer. Real disposal/reopen, in-flight start/dispose and replacement
  ownership regressions cover the boundary.

- 2026-10-14 synchronization: upstream `002cb4c9` forks `InstanceState` initialization into the cache entry's scope behind a `Deferred`, so cancelling one caller cannot interrupt a shared initialization and invalidation waits for it to exit. Adapted onto the fork's generation-keyed cache: the lookup resolves its context by generation and provides `InstanceRef` and `WorkspaceRef` explicitly, and a disposed generation still refuses new entries (upstream's dispose case asserts that refusal). Disposal can now interrupt a Bus state that is still initializing, so the detached `Bus.publish` helper (used fire-and-forget by sync events) treats an interrupt-only exit as a no-op instead of an unhandled rejection that ended the process (`test/inbox/drain-crash-reopen.test.ts`). Registry correction: `packages/cli/src/effect/instance-state.ts` was already fork-different (generation keys, per-directory context sets, disposed-instance refusal) but unlisted, and joins the watch surfaces. Evidence: `test/effect/instance-state.test.ts`.

- 2026-10-04 synchronization: upstream `6babeb0b` adds `Instance.updateIdle`, the `updating` admission barrier and an `expected` owner for `Instance.provide`. Protected-root and filesystem-root rejection, instance generations, `peek` and the stale-context `dispose()` path are unchanged; an `expected` owner that is closing, absent or not the cached context is rejected by identity.

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
  effects. Only an actual reply to that full-command request replaces ordinary
  asks; automatic deletion approval still runs ordinary Bash/path authorization.
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
- Watch surfaces: `packages/cli/src/project/instance.ts`,
  `packages/cli/src/effect/instance-state.ts`,
  `packages/cli/src/session/cron-bridge.ts`,
  `packages/cli/src/util/local-context.ts`,
  `packages/cli/src/tool/bash.ts`,
  `packages/cli/src/tool/read.ts`,
  `packages/cli/src/tool/write.ts`,
  `packages/cli/src/tool/edit.ts`,
  `packages/cli/src/tool/multiedit.ts`,
  `packages/cli/src/tool/glob.ts`,
  `packages/cli/src/tool/grep.ts`,
  `packages/cli/src/tool/apply_patch.ts`,
  `packages/cli/src/tool/auto-worktree-hint.ts`,
  `packages/cli/src/session/observed-tool-parts.ts`,
  `packages/cli/src/tool/session-cwd.ts`, and
  `packages/cli/src/tool/registry.ts`; TUI cwd context/sidebar/plugin API;
  and generated SDK/OpenAPI event surfaces.
- Tests/evidence: project path/worktree/instance-disposal suites,
  `packages/cli/test/session/cron-bridge.integration.test.ts`,
  `packages/cli/test/installation/no-instance.test.ts`, and
  `packages/cli/test/tool/bash.test.ts` cover exact-path, prefix, and
  missing-context behavior; Edit/MultiEdit regressions cover relative resolution
  against the fixed cwd. Registry/agent/tool-script fixtures plus source and
  generated-artifact review cover removal of the mutable cwd surface and prove
  the compatibility event is declared but never published; the removed
  upstream `session-cwd.test.ts` is not claimed as runtime evidence.
  Auto-Worktree config, notice, Bash-write, and path-scan regressions cover the
  explicit toggle, one-shot notice, real mutations, negative cache, and
  completed apply-patch metadata.
  `test/tool/bash-delete-permission.test.ts` and
  `test/permission/auto-approve-delete.test.ts` under `packages/cli` cover
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

- 2026-10-28 quota-sync CI correction: progress-reconcile fixtures use generated unique session IDs and remove actual session memory, replacing ineffective late MIMOCODE_HOME changes and millisecond-only IDs. A fixed-clock two-fixture regression reproduces the old stale-progress collision and passes with the corrected fixture. Runtime checkpoint behavior and assertions remain unchanged; see [the quota sync record](upstream-sync-2026-10-28-ebd06ee2.md).

- 2026-10-27 synchronization: adopt the lighter two-child/two-agent global concurrency regression while keeping the existing 60-second two-level-resume budget. The Windows runtime job additionally runs `test/installation/launcher.test.ts` with a 120-second per-test cap and preserves its log in the existing artifact, so the incoming PATH-shadow/system-tar regression executes on Windows rather than only skipping on Linux/macOS. No production workflow semaphore or cleanup boundary changes.

- 2026-10-22 synchronization validation: `.github/actions/setup-bun/action.yml` exposes npm's bundled `node-gyp` on a job-temporary PATH before locked installation. A runner may execute the trusted tree-sitter-powershell native install script even though the CLI uses its WASM asset. Repeated CI ENOENT established that no build executable was available; this setup reuses the existing npm dependency without adding installs, changing the lockfile, widening trust or altering product module resolution.

- 2026-10-14 synchronization: upstream `002cb4c9` adds `abortSignal` to `Question.ask`'s input and passes `ctx.abort` from the question and plan tools. It replaces the fork's second-argument signal; the POLICY-01 lifecycle (closed-generation admission, captured publisher, single `Rejected` through `dismiss`) is unchanged, and an abort now dismisses and then awaits the request so a reply already in flight wins. The detached `Bus.publish` helper now ignores an interrupt-only exit from instance disposal (see the FC-007 note). Evidence: `test/question/question.test.ts`, `test/question/lifecycle.test.ts`, `test/cli/tui/question-lifecycle.test.tsx`, `test/tool/plan.test.ts`.

- 2026-10-13 format alignment, second pass: the first pass only reverted hunks that were formatting in their entirety and only looked at `packages/cli/src`. This pass covers every modified `ts`/`tsx`/`md` file outside `docs/` (273, including the 143 modified test files) and reaches formatting noise inside mixed hunks: a three-way merge of ours = upstream bytes, base = `prettier(upstream)`, theirs = `prettier(fork)` keeps upstream's bytes wherever the fork only reformatted, after which only the hunks whose restored block is a contiguous substring of the upstream file are kept, and files the merge cannot stitch fall back to the single-hunk test at `-U0` granularity. Two guards: the result must be Prettier-equivalent to the fork file, and a hunk whose first line changes indentation is never restored, because upstream's indentation of a block only fits upstream's nesting (upstream's own `prompt.ts` skill-mention block is mis-indented, and the fork keeps its corrected form rather than inherit that). Outcome: 24 files, 433 fewer changed lines and 274 fewer hunks against upstream `b258d28f` (3061 → 2787), `test/mcp/host.test.ts` byte-identical to upstream again, and the realigned `prompt-effect.test.ts` diff drops from 370 hunks to 168 with two restored lines. The remaining difference is semantic: over the same 273 files the raw diff (39.6K changed lines) is already smaller than the Prettier-normalized diff of the two trees (40.2K), and the per-file excess that remains (648 lines in `session/prompt.ts`, under 100 anywhere else) sits where the fork changed code that upstream itself keeps un-formatted, which no byte-level revert can remove. Changed test files pass locally except one `actor-subagent-gating` case that fails identically on the untouched tree whenever `MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS` is inherited from an enclosing MiMoCode session, and passes with it unset.

- 2026-10-13 `.gitignore` alignment: the root `.gitignore` is upstream's bytes again, including its inert `.mimocde` entry and missing final newline. Fork PR #51 removed that entry to avoid a blanket `.mimocode/` rule while the repository still tracked assets there; nothing under `.mimocode/` is tracked on either side now and the runtime regenerates its own nested ignore file, so the entry ignores nothing and the two-line difference bought only a conflict surface.

- 2026-10-13 format alignment: 53 fork hunks across 13 `packages/cli/src` files differed from upstream `b258d28f` only by Prettier output (line wrapping, `0.50` → `0.5`, double spaces); upstream does not run Prettier (184 of its 709 `ts/tsx` files fail the repository config) and `bun lint` is oxlint, so those hunks were pure merge-conflict surface. They are reverted to upstream's bytes; `session/overflow.ts` is byte-identical to upstream again. Every touched file is Prettier-equivalent before and after, so runtime behavior is unchanged and the `Main behavior` reference does not advance. `packages/cli/src/cli/cmd/generate.ts` also joins the watch surfaces: it carries the `codeSample` producer recorded under the 2026-09-15 tooling convergence but was not listed.

- 2026-10-13 synchronization: upstream `c68463f2`/`ca056a8e` restore a root `bunfig.toml` that scopes bare root `bun test` to `script/`, isolates HOME/XDG and the database, and refuses `packages/**` test paths. It replaces the fork's `do-not-run-tests-from-root` guard with the same protection. Upstream `4a5e2140` adds `workflow_call` triggers and an unverified shard-4 `script/release.test.ts` step; the fork keeps its `windows_runtime` dispatch input beside `workflow_call` and runs the release script tests in a dedicated `release-script` job with JUnit verification. Default-path validation now clears `MIMOCODE_MCP_TOOL_SEARCH`, which replaced `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`.

- 2026-10-10 Actions usage reduction: GitHub disabled this fork's workflows for Actions usage. Between 2026-06-22 and 2026-10-04 the fork ran 758 `test` workflows; recent ones averaged about 27 runner-minutes (four shards, four isolated jobs, and a Windows job for `dev/compat`). In September 233 of 415 were `pull_request` runs, repeated on every PR push. `test.yml` skips every job of a pull request whose head is a branch of this repository; such a branch dispatches `test` when it needs pre-merge evidence. A pull request from another repository cannot be dispatched by ref, so its Linux jobs still run, under GitHub's read-only fork-PR token; dispatching an untrusted head from a base-repository ref would instead run its workflow with this repository's permissions. All three workflows ignore pushes and pull requests confined to `docs/`; no test, lint or typecheck input lives there. The Windows job runs only on pushes to `dev/compat` and on dispatch with `windows_runtime`, never for a pull request, so its environment record drops the pull-request head SHA. `AGENTS.md` and the upstream-sync skill let a tip without runs because its push changed only `docs/` cite an ancestor's exact-SHA runs after proving the tree outside `docs/` identical. Shard layout, isolation jobs, JUnit verification and step budgets are unchanged.

- 2026-10-04 synchronization: upstream `6babeb0b` runs its two provider refresh suites in separate processes on shard 4/4, because the refresh needs process-wide instance idleness that other session fixtures' detached work can hold. The fork's discovery-checked layout instead adds a `provider-refresh` job that runs `refresh`, `refresh-boundaries` and the fork's `refresh-harness` suite each in its own process with JUnit verification; discovery requires all three, and every other file keeps its hash shard.

- 2026-10-02 synchronization: upstream `f40c76ac` deletes the root `bunfig.toml` with its `[test] root` guard and makes root `bun run test` delegate to `packages/cli`. The fork adopts the delegation but keeps a root `bunfig.toml` with only the guard: Bun reads `bunfig.toml` from the working directory, so a bare root `bun test` would otherwise discover every package test without `packages/cli/bunfig.toml`'s preload and lose the isolated HOME/XDG and fixture roots. Husky and its pre-push typecheck are removed with upstream; CI remains the gate. The isolation `test.yml` keeps its jobs on `packages/cli`. With the committed OpenAPI snapshot deleted by upstream `698f0f29`, root `script/generate.ts` only rebuilds the SDK, and the OpenAPI tests check the runtime and generated documents.

- 2026-09-29 synchronization: upstream removed `packages/enterprise`, so the
  package-scoped enterprise S3 fixture clause below retires with it; the
  opencode harness contracts are unchanged. Root typecheck now also checks
  `tsconfig.scripts.json`, which has no `@/` path mapping. The fork-only
  `script/experiments/**` carrier imports opencode source through that alias,
  so the scripts project excludes it, as upstream excludes `generate.ts` and
  `schema.ts`; `packages/cli/tsconfig.json` keeps checking every experiment
  file. Upstream also deleted the tracked `.mimocode/.gitignore`. The runtime
  regenerates an untracked copy that ignores `.gitignore` but not `references/`,
  so the upstream-sync skill's local re-include is now defensive only.

- 2026-09-29 skill relocation: the fork-only upstream-sync skill follows
  upstream's project-skill layout from `.mimocode/skills/upstream-sync/` to
  `.agents/skills/upstream-sync/`, which skill discovery scans unless
  `MIMOCODE_DISABLE_AGENTS_SKILLS` is set. Nothing ignores `references/` or
  nested `.gitignore` files under `.agents`, so the local re-include file is
  removed. Skill content is unchanged; this is a path move of shared process
  guidance that propagates unchanged into compat.

- 2026-09-27 synchronization: config refresh retains an instance while its
  main or Actor execution is live. Isolated workflow worktree removal now waits
  for `server.instance.disposed` from that owning instance before removing the
  directory; a one-hour timeout releases the listener and reports cleanup
  failure if the event does not arrive. This
  preserves in-flight Actor files without extending the workflow caller's
  bounded settlement. `test/workflow/runtime-worktree.test.ts` and
  `test/project/instance-dispose.test.ts` cover the lifecycle boundary.

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
  repository root, and `packages/cli/.mimocode/` (`.cron-lock`,
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
  The former `packages/enterprise` S3 test fixture retired with that package
  on 2026-09-29.
  CI triggers on pushes to `main`, `dev`, and `dev/compat` and on manual
  dispatch; `lint` and `typecheck` also run on pull requests to those
  branches. `test` runs its Linux jobs for a pull request only when the head
  comes from another repository, which cannot be dispatched by ref; a branch of
  this repository dispatches `test` when it needs pre-merge evidence.
  A push or pull request that changes only `docs/` starts no workflow, since no
  test, lint or typecheck input lives there; a tip without runs for that reason
  cites the successful exact-SHA runs of an ancestor whose tree outside `docs/`
  is identical. The `test` workflow retains `.test.tsx`
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
  Watch `packages/cli/src/{question,bus}/index.ts` and
  `packages/cli/src/tool/question.ts`;
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
  than the reviewed upstream workflow; the adopted package-scoped enterprise
  storage fixture retired with upstream's package removal.
- Watch surfaces: `packages/cli/src/effect/hard-timeout.ts`,
  `packages/cli/src/effect/bridge.ts`,
  `packages/cli/src/flag/flag.ts`,
  `packages/cli/src/workflow/runtime.ts`,
  `packages/cli/src/workflow/sandbox.ts`,
  `packages/cli/bunfig.toml`, `packages/cli/test/preload.ts`,
  `packages/cli/test/fixture/fixture.ts`,
  `packages/cli/test/fixture/fixture-root.test.ts`,
  `packages/cli/test/tool/{bash,webfetch,websearch,read}.test.ts`,
  `packages/cli/test/server/{workflows-route,session-messages,session-task-route,session-select,title-authority,session-actions}.test.ts`,
  `packages/cli/test/cli/tui/worker-listener.test.ts`,
  `packages/cli/test/workflow/runtime-worktree.test.ts`,
  `.agents/skills/upstream-sync/SKILL.md`,
  `.agents/skills/upstream-sync/references/`,
  `.github/workflows/test.yml`, `.github/scripts/verify-junit.py`,
  `.github/workflows/lint.yml`,
  `.github/workflows/typecheck.yml`, `tsconfig.scripts.json`,
  `script/generate.ts`, `packages/cli/src/cli/cmd/generate.ts` (the
  `codeSample` producer behind the `@mimo-ai/sdk/v2` camelCase OpenAPI
  examples), the root `bunfig.toml`, and `AGENTS.md`.
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

- 2026-10-21 synchronization: upstream `a7440d13` resets a dropped empty step by removing its parts instead of deleting and rebuilding the assistant under the same ID, so no `message.removed` is published for a turn that still delivers content. Adopted into the fork's pure-empty branch only: reasoning-only output keeps the run loop's scoped continuation, so upstream's think-only identity case is adapted to a pure-empty stop in `invalid-output-continuation.test.ts`. Upstream `88673c41` retires the persisted recall reminder; the memory paths reminder is persisted through the same marker-deduplicated `ensurePersistedUserSynthetic`, at most once per context window on an unsent own user message.

- 2026-10-20 synchronization: inbox acceptance persists complete synthetic agent input and provenance with a durable receipt; later rendering hides unconsumed rows and places consumed input at its first delivery. Import/export/sync/fork preserve referenced message identity and queue visibility without cloning runnable receipts into a fork. Mid-turn direct user text is sent verbatim rather than wrapped against a moving last-finished assistant, preserving byte identity around signed thinking. This does not claim to repair every other history rewrite or an already poisoned signature. Pure empty, tool-free replay uses the scoped retry policy; reasoning-only and settled-tool continuation retain their existing bounded, atomic provenance paths.

- 2026-10-16 synchronization: upstream `bf0563dd` extends the user image attachment envelope and replay provenance. The envelope's local path now derives from an absolute `source.path` or, when absent, a `file:` URL; a new sentence names `[Image: <file name>]` / `[PDF: <file name>]` markers as session-stable attachment identity, matched by the same file name. An attachment-only all-synthetic prompt keeps the caller `system` on the persisted user message (`prompt.system ?? input.system`) while still skipping the `resolvePrompt` fallback, so `session.prompt` is not pinned. The overflow replay copies media `file` parts verbatim (the `[Attached <mime>: <filename>]` substitution is gone) under FC-001's atomic `commitUserMessageIfLatest`, retaining `source: "hook"` and `task_id`. The fork's `userImageAttachment` metadata and hook/spawn provenance rules are unchanged. Evidence: `test/session/prompt.test.ts` envelope and attachment-only-system cases, `test/session/prompt-effect.test.ts` keeps-replayed-media case.

- 2026-10-14 synchronization: upstream `002cb4c9` records a tool's execution boundary (`ToolPart.execution`, `ToolStateError.inputComplete`) through transactional `Session.mutateToolPart`, closes a per-attempt tool scope on cleanup instead of waiting 250 ms for unsettled calls, and lets `ToolSettlement` persist a tool's real result after an interruption; projectors and imports refuse tool identity changes and never downgrade `started`. Adopted with the side-effect replay boundary unchanged; completed tools still merge running metadata and failed tools keep the record guard. Evidence: `test/session/processor-effect.test.ts`, `test/session/tool-gate-cancel.test.ts`, `test/history/import.test.ts`.

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
- Watch surfaces: `packages/cli/src/session/message-v2.ts`,
  `packages/cli/src/session/processor.ts`,
  `packages/cli/src/session/compaction.ts`, and synthetic producers in
  prompt, checkpoint, plan, dream, and distill flows.
- Tests/evidence: `packages/cli/test/session/processor-effect.test.ts`,
  `packages/cli/test/session/main-runloop-history-invariant.test.ts`,
  `packages/cli/test/session/trajectory.test.ts`, prompt regressions, and
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

- 2026-10-15 fork hardening (prompted by the dropped June stash review): DNS classification resolves every record (`lookup` with `all: true`) instead of trusting the first answer — a hostname returning a public and a private address together fails closed, and an empty answer list fails closed as a resolution failure. The upstream base still checks the first answer only. The check still races the request's own resolution (TOCTOU), so it remains defense-in-depth. The injected-resolver API now passes `{ all: true }` and expects the record list. Evidence: `test/util/ssrf.test.ts` adds the mixed-answer fail-closed and empty-answer cases (29/29 with `test/tool/webfetch.test.ts` 5/5).

- Status: active
- Canonical owner: shared `main` WebFetch and SSRF destination-classification boundary
- Observable contract: WebFetch accepts only HTTP(S). Destination classification
  runs before permission for the initial URL and every manual redirect target,
  blocking classified private/internal numeric targets and every hostname's
  DNS answers,
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
- Watch surfaces: `packages/cli/src/tool/webfetch.ts`, its permission
  plumbing, and `packages/cli/src/util/ssrf.ts` where target classification
  is applied before the WebFetch permission ask.
- Tests/evidence: `packages/cli/test/tool/webfetch.test.ts` proves redirect
  target re-authorization through its local `Bun.serve` redirect and proves that
  rejected initial and redirect targets stop before their permission ask and
  request. `packages/cli/test/util/ssrf.test.ts` covers numeric `fe80`,
  `fe90`, `fea0`, and `febf` link-local representatives plus a DNS-resolved
  family-6 `febf::1` target. Source review at main behavior confirms HTTP(S)
  scheme enforcement, the 10-hop cap, acquisition timeout and post-read 5 MiB
  rejection; that test file
  has no focused scheme or resource-bound regression for those source contracts.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.
- Retirement condition: upstream preserves equivalent numeric and DNS-resolved
  destination classification that checks every DNS answer, including IPv6
  `fe80::/10`, with the same HTTP(S),
  per-hop permission, manual-redirect, timeout, and response-size contract and
  behavior-focused tests.

## FC-011 — fork-facing model prompts and bundled skill guidance

- 2026-10-30 synchronization: Adopt available search/MCP wording, explicit Exa/search MCP setup, and DuckDuckGo HTML through WebFetch when no search tool is available. Permission/discovery and workflow lifetime contracts remain unchanged; prompt text is content evidence, not a live search-provider availability claim.

- 2026-10-26 synchronization: adopt upstream `18adffc9` unchanged. The `claude-code`, `codex` and `grok-build` descriptions now say to load only on explicit authorization and to confirm the binary first; their host-only `agents/openai.yaml` files are deleted, and the `mimocode-docs` discovery row names the opt-in selector. The fork's PPTX guidance regression in `test/skill/builtin.test.ts` is kept beside upstream's new cases.

- 2026-10-21 synchronization: adopt upstream `12a59e90` unchanged. Compose Next spec `source` takes a branch name, PR URL or MR URL, so the frontmatter stays valid YAML; fill-ins use `{{}}`, S labels move onto Design H3s, `covers` and the Journey log are optional, and any merge needs its own confirmation. Bundled `mimocode-docs` drops `compaction.prune` and names `xiaomi/mimo-v2.6-flash` as the voice control default; the fork's compaction-row wording and `auto_worktree` entry in `config.md` are kept.

- 2026-10-21 live synchronization: adopt `cf8c09d5` Compose Next unavailable-input handling, spec `source` tracking and Finish confirmation unchanged. The explicit invocation entry and discovery/permission boundaries remain; this is shipped content, not a runtime schema or bulk spec migration. Content loading/discovery and permission/search tests cover the integration, while behavioral wording is reviewed as guidance.

- 2026-10-13 MiniMax reminder removal: the shipped `session/prompt/minimax.txt` no longer carries "The default branch in this repo is `main`. CI triggers on …". Upstream `25b7bac3` pasted that repository-specific sentence into a prompt every MiniMax user receives, twice; fork PR #43 kept it and updated the branch list to `dev/compat`, which made it current for this repository and still a fabricated fact for every other project. The sentence is deleted, so the file differs from upstream by two removed lines and nothing added, and this repository's branch guidance reaches the model through `AGENTS.md` like every other instruction. `test/session/system.test.ts` now asserts the absence of any repository-specific CI reminder (mutation-checked against upstream's text). The TUI skill i18n keys stay corrected: `skill/localized-alias.ts` reads `tui.skill.<name>.slash`, so upstream's `tui.skill.mimocode.*` keys have been dead since `5bf07b7e` renamed the bundle to `mimocode-docs`.

- 2026-10-13 synchronization: upstream `3c6e6bb0` retires the compose agent and `compose:*` skills from bundled `mimocode-docs` content, the TUI tips and `gpt.txt`; upstream `463cbb28` documents harness-injected `<system-reminder>` content in the provider prompts. Both are adopted unchanged; the fork's harness, compaction and `auto_worktree` additions to `config.md` are untouched, and `test/skill/` suites pass.

- 2026-10-10 synchronization: upstream `a4b06963` replaces the `_CLAUDE_IMPORT` disable toggle in bundled `mimocode-docs/reference/config.md` with an `MIMOCODE_ENABLE_CLAUDE_IMPORT` entry: startup import of Claude Code sessions is off by default, manual session imports remain, and Codex sessions are imported only on request. Upstream `f98dcd1c` gives the `xlsx-official/create.md` library-choice table's combined row its own Library cell. Both are adopted unchanged; the fork's harness, compaction and `auto_worktree` additions to `config.md` are untouched, and `test/skill/mimocode-docs.test.ts` and `test/skill/builtin.test.ts` pass.

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
  outside that pool. Built-in skill keys match `mimocode-docs`; no shipped prompt
  carries repository-specific branch or CI reminders; actor heredoc
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
- Watch surfaces: `packages/cli/src/session/prompt/default.txt`,
  `packages/cli/src/tool/actor.ts`,
  `packages/cli/src/tool/actor.txt`,
  `packages/cli/src/tool/actor.shell.txt`,
  `packages/cli/src/skill/builtin/.bundle/mimocode-docs/`,
  `packages/cli/src/skill/builtin/.bundle/compose-next/SKILL.md`,
  MiniMax/GPT prompt text, actor shell tokenizer/help, TUI skill i18n, and
  bundled `pdf-official` and `mimocode-docs` content.
- POLICY-01 content carriers: `docs/codex-compact-tools.md`,
  `packages/cli/src/agent/prompt/generate-gpt.txt`,
  `packages/cli/src/session/prompt/gpt.txt`,
  `packages/cli/src/tool/tool-script.txt`,
  `packages/cli/src/tool/plan-exit.txt`, and
  bundled `mimocode-docs/reference/config.md` under `packages/cli`.
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
  `packages/cli/test/skill/mimocode-docs.test.ts` at the main runtime/test
  SHA, plus bundled-content review at the separate guidance content SHA.
  `packages/cli/test/skill/builtin.test.ts`
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

- 2026-10-27 synchronization: launcher extraction adopts upstream `tarCommand()`: on Windows prefer the existing absolute system tar, then fall back to PATH; other platforms still use PATH tar. Release URL/checksum/cache and staged-run behavior are retained. Adopt the README download links and desktop screenshots while preserving fork routing. See [the four-capability record](upstream-sync-2026-10-27.md).

- 2026-10-26 synchronization: adopt upstream's `0.1.16` across the four workspace manifests and `bun.lock` (`d3c71e33`), and `b8dbe084`'s tag release that builds after typecheck and lint without rerunning unit tests, with `script/fds-upload.ts` defaulting to the external `cnbj1.fds.api.xiaomi.com` endpoint (`MIMO_FDS_ENDPOINT` still overrides). `GH_REPO` remains required and fork-scoped. A fork tag therefore depends on the exact-SHA branch CI of the tagged commit. No publishing stage ran during this sync. FC-019's patched quickjs versions are unchanged by the bump.

- 2026-10-20 synchronization: adopt trusted-publisher `--allow-publish` and a preflight stage before npm/GitHub publication. The preflight checks SDK/plugin/CLI tarball name and version and proves an FDS signed canary write. Keep `GH_REPO` mandatory and scoped to the fork; the upstream-owned npm trust configuration is not authority to publish fork work there. A passing preflight is neither a release rollback transaction nor proof that every later publication stage succeeded. No publishing stage is invoked during synchronization validation.

- 2026-10-13 synchronization: upstream `4a5e2140` replaces the maintainer release scripts with CI stages in `script/release.ts` run by `release.yml` on a pushed tag. The fork adopts the stages and keeps `GH_REPO` required: the `github` stage throws before any `gh` call when it is unset, so a fork release can never fall back to the `upstream` remote. `release.yml` itself sets `GH_REPO` from `github.repository`. The npm trusted-publisher setup still names upstream's repository and applies only to upstream's packages.

- 2026-10-02 synchronization: upstream `327f5b63` makes `script/release.ts` default `GH_REPO` to `XiaomiMiMo/MiMo-Code`, which would aim an unconfigured fork release at the read-only upstream. The fork keeps `GH_REPO` required, with no default, and adopts the rest of the `.env` release flow. Upstream `698f0f29` removes the `CLAUDE.md` → `AGENTS.md` symlink; the fork keeps it so Claude Code sessions load the same routing conventions as other agents.

- Status: active process contract
- Canonical owner: fork repository governance
- Observable contract: pushes and pull requests target `onlyfeng/MiMo-Code`,
  never the read-only upstream. Shared work enters `main` before propagation to
  `dev/compat`; compatibility-only work targets `dev/compat`. Fork-only security
  issues are not routed through upstream public disclosure channels.
- Upstream relationship: fork-specific governance that must not be overwritten
  by upstream repository documents.
- Watch surfaces: `AGENTS.md`, the `CLAUDE.md` link, `CONTRIBUTING.md`,
  `SECURITY.md`, `script/release.ts`, pull request templates, and
  repository-facing CI guidance.
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

- 2026-10-28 quota synchronization: adopt terminal handling for complete HTTP429/code429/type limitation/exact quota exhausted signals in SessionRetry.decide, independent of provider identity and preserved through serialization. Host decisions retain precedence; SDK normalization is unchanged. Adapt the incoming ordinary429 test to the existing bounded request budget and persistent live-step rate-limit budget. Classification and all other retry contracts remain unchanged; see [C01](upstream-sync-2026-10-28-ebd06ee2.md).

- 2026-10-22 live advancement: pure-empty InvalidOutputError uses the persistent server live-step budget, with explicit bounded overrides and cancellation still effective. The retrySafe/tool-residue/non-length/non-structured guards remain; reasoning-only output keeps bounded actor-scoped continuation and atomic provenance. Request and stream retries persist per-actor records, while global status and RetryAttempt stay main-only; ephemeral/quiet MaxMode scopes remain isolated. Summary retry/fallback ownership remains under FD-010/011/012.

- 2026-10-21 synchronization: upstream `8fd65328` checks `retryConstraint(error) === "terminal"` before the `exhausted`/`unavailable` capacity heuristic in `decide`. HTTP403 membership and subscription-quota refusals and HTTP402 balance refusals now make one request and settle as an assistant API error instead of persistent server recovery. The fork had the same order, so the moved line is the whole change. Budget resolution, scope isolation and main-only publication are unchanged. Upstream `a7440d13` also changes the empty-attempt cleanup that the 2026-10-20 bullet below describes: the assistant identity is kept and only its parts are removed (FC-009). Evidence: `title-first-turn.test.ts` TP-REFUSAL-01, `retry.test.ts`, `test/error/host-registry.test.ts`.

- 2026-10-20 post-sync correction: the processor's stream retry callback now
  applies the main-agent boundary to both retry status and `RetryAttempt`
  publication. The earlier code guarded only status, so ordinary actor
  pure-empty retries could emit session-global events despite this contract.
  HTTP/SSE fixture regressions check successful main and actor retries,
  main status/event publication and the absence of both for the actor.

- 2026-10-20 synchronization: classify `InvalidOutputError` as retryable unknown and let `SessionRetry.policy` own a genuinely empty conversation attempt only when it is replay-safe, tool-free, non-structured and not a length finish. Remove the empty attempt and recreate its assistant shell before retry; exhaustion persists the terminal error, and no repair user is injected for this clean case. Reasoning-only output, incomplete checkpoint completion and tool/settlement residue retain fork bounded continuation and atomic source/task ownership rather than losing useful history or replaying side effects. Candidate/judge budgets, main-only retry publication and the MaxMode tool-free final step remain. Summary assistants remain under FD-010/FD-011/FD-012 and the separate compaction retry bound.

- 2026-10-14 synchronization: upstream `002cb4c9` lets request-phase retries publish `session.status{retry}` through the processor's `setRetry`, and runner, loop and stream busy writes no longer replace a retry row. Adopted for durable main requests only, keeping the fork's main-only `RetryAttempt` guard and status lock. The visible attempt now continues across phases (request 1, stream 2) while `phaseAttempt` restarts; subagent and ensemble retries stay out of session status. Evidence: `test/session/processor-effect.test.ts`, `status-retry-map.test.ts`, `retry-density-invalid-baseurl.test.ts`.

- 2026-10-13 upstream PR record: `XiaomiMiMo/MiMo-Code#1871` (honor `toolChoice` on MaxMode's final step, opened 2026-07-23) is withdrawn. Upstream's `useMaxMode` gate still lacks the `!isLastStep` term, so the behavior remains fork-only under this entry's final-step contract; the PR predates the `packages/cli` rename and is not resubmitted. Its head branch `fix/maxmode-laststep-toolchoice` is deleted from the fork.

- 2026-10-02 synchronization: upstream `ac04af98` deletes `docs/architecture/retry-coordinator.md` with its other non-spec documents. The fork rewrote that file as this entry's retry-policy and configuration reference, so it stays as fork documentation.

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
- Watch surfaces: `packages/cli/src/session/max-mode.ts`,
  `packages/cli/src/session/prompt.ts`,
  `packages/cli/src/session/retry.ts`,
  `packages/cli/src/session/status.ts`, and processor final-step routing.
- Tests/evidence: default budgets, overrides and classification in
  `packages/cli/test/session/retry.test.ts`; the MaxMode final-step regressions in
  `packages/cli/test/session/prompt-effect.test.ts`, step-budget coverage in
  `packages/cli/test/session/max-mode.test.ts`, and candidate/judge
  EConnReset coverage in `packages/cli/test/session/max-mode-econnreset.test.ts`
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

- 2026-10-30 synchronization: Adopt boundary-model summary selection and failed/interrupted cleanup without changing chronological tails, pending external admission or frozen-prefix sizing. Compat retains active-only frozen tool membership and its tail budget under DC-CONTEXT-001.

- 2026-10-21 synchronization: upstream `6f83cd0e` stops rewriting persisted parts to shrink context. Turn-end prune and `stripNonEssential`, `SessionCompaction.prune`, rebuild-time microcompact, `Overflow.pressureLevel`/`contextPressureLevel`, the `compaction.prune` key and `MIMOCODE_DISABLE_PRUNE` are removed; a config that still sets `compaction.prune` loads with one warning. Adopted unchanged; the fork's `observedToolParts` protection inside `SessionCompaction.prune` retires with that function. Rows already marked `time.compacted` still project the cleared placeholder. Checkpoint thresholds keep resolving against `usable()`, and the ratio trigger, bounded projection, frozen prefix and `toolChoice: "none"` are unchanged. The fork keeps `auto_worktree` in `normalizeLoadedConfig`; only the prune hunk is taken from that conflict. Evidence: `test/session/turn-end-lossless.test.ts`, `rebuild-boundary-lossless.test.ts`, `legacy-compacted-row.test.ts`, `overflow.test.ts`, `test/config/config.test.ts`.

- 2026-10-16 synchronization: upstream `bf0563dd` copies every non-`compaction` part verbatim in the overflow replay, including media `file` parts, so the replayed user message and the next model turn keep the image; the summarization request still strips media under overflow. Adopted into the fork's atomic replay commit without touching the bounded projection, ratio trigger, frozen prefix reuse or FD-011's `toolChoice: "none"`. Evidence: `test/session/prompt-effect.test.ts` (keeps replayed media), `test/session/compaction-projection.test.ts`, `test/session/compaction-reasoning-fallback.test.ts`, `test/session/compaction-tool-choice.test.ts`.

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
- Watch surfaces: `packages/cli/src/config/config.ts`,
  `packages/cli/src/flag/flag.ts`,
  `packages/cli/src/session/overflow.ts`,
  `packages/cli/src/session/compaction.ts`,
  `packages/cli/src/session/prefix-snapshot.ts`,
  `packages/cli/src/session/observed-tool-parts.ts`, and bundled configuration
  guidance in `mimocode-docs/reference/config.md`; TUI
  `component/dialog-context-limit.tsx`, `component/dialog-status.tsx`, and `util/model.ts` consume the same
  resolver, and SDK/OpenAPI plus configuration reference translations publish
  the current buffer semantics. The active Compose specification in
  `docs/compose/spec/context-budget-control.md` distinguishes this ratio rule
  from historical reserve-based measurements.
- Tests/evidence: `packages/cli/test/session/overflow.test.ts` covers value
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

- 2026-10-29 synchronization: upstream `3e92e0d8` makes `resolveCredentials` walk the Xiaomi family (token-plan clusters before `xiaomi`) when a configured family provider has no key, with per-cluster default base URLs. Adopted unchanged: credentials are chosen before any request starts, so Prompt ownership, stop/drain and grapheme offsets are unchanged. `test/cli/tui/voice.test.ts` covers the fallback beside the existing lifecycle cases.

- 2026-10-21 synchronization: upstream `786151b3` changes the default voice control model to `xiaomi/mimo-v2.6-flash` (request fallback `mimo-v2.6-flash`); ASR stays on `mimo-v2.5-asr`. Adopted with the schema description and generated SDK text. Prompt ownership, stop/drain and grapheme offsets are unchanged; `test/cli/tui/voice.test.ts` covers the new default.

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
  `packages/cli/src/cli/cmd/tui/component/prompt/index.tsx`,
  `packages/cli/src/cli/cmd/tui/component/prompt/offset.ts`,
  `packages/cli/src/cli/cmd/tui/util/voice-edit.ts`,
  `packages/cli/src/cli/cmd/tui/util/voice.ts`, and the voice/offset tests
  and protocol specification.
- Tests/evidence:
  `packages/cli/test/cli/cmd/tui/offset.test.ts` covers combining and ZWJ
  grapheme round trips alongside CJK/newline/tab offsets;
  `packages/cli/test/cli/tui/voice.test.ts` exercises live OpenTUI
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

- 2026-10-22 live advancement: new retry records expose phase/scope/kind/message/next and both timestamps. Historical schema-valid error-based retry rows normalize at hydration, import and replay boundaries without weakening the public schema or editing shipped SQL. Legacy message and response content remain searchable through bounded NUL-safe projections; export redacts the resulting message. Replay normalizes the original event object before storage and publication. Reverse-ID and UTF8 tie-break tests enforce parent chronology and actor/session isolation.

- 2026-10-14 synchronization: upstream `6ba6a625` makes the shipped `20261011000000_history_fts_kind` and `20261012000000_history_cjk_unigram` migrations replay-safe (`CREATE INDEX IF NOT EXISTS`, `INSERT OR IGNORE`) and routes `Database.Client()` through `migrateReplaySafe`. Adopted unchanged: both migrations are upstream-owned and were byte-identical to upstream, the edits change no schema, and drizzle selects migrations by journal name, so the AGENTS.md rule against editing shipped migrations (which protects applied journals) is not engaged. FC-017's projection, media and preview bounds are untouched. Evidence: `test/history/fts-kind-idempotent.test.ts`, `test/history/fts-kind-boot.e2e.test.ts` and every other `test/history/` file.

- 2026-10-13 synchronization: upstream `5f55525c` restores `history_fts.kind` with a dual-column body/body_idx index, two new migrations and a background re-extract. The merge is clean and touches neither `projection.ts` nor `media.ts`; NUL, preview-budget and attachment-locator tests in `test/history/` pass.

- 2026-09-17 synchronization: Adopt shared tool-result previews and resumable migration version 6, including legacy chunk deduplication and Node SQLite query planning. Projection/media retain the registered SQL NUL, field/list budget and attachment-locator rules. This index preview is separate from raw history retrieval.

- Status: active; explicit owner added by the 2026-09-15 code audit for already accepted fixes.
- Canonical owner: fork `main` history projection; inherited unchanged by `dev/compat`.
- Observable contract: SQLite projection keeps JSON escapes until final parsing so NUL-containing strings survive old SQLite. Individual preview fields are selected by a 4,000-byte decoded-value check; the complete projected attachment metadata list is checked against 4,000 bytes of serialized JSON. Both decisions occur in SQLite before crossing the driver boundary. Escaping and multiple fields add JSON bytes: this is not a 4,000-byte bound on a field's serialized representation, the whole driver row, SQLite's internal materialization cost or complete `history get` results. Inline data URLs are omitted from previews, while original attachment positions/locators and raw stored data remain unchanged.
- An oversized attachment list produces a structural omission notice, never a fabricated `tool:0` attachment. A real attachment whose MIME equals the notice text remains an attachment because its URL key distinguishes the shape, including a null URL after data removal.
- Upstream relationship: adopts uniform indexing, transactional import and resumable one-time migration; retains NUL-fidelity and SQL-preview/locator corrections. Startup after completed migration does not promise repair of later missed asynchronous index writes.
- Watch surfaces: `packages/cli/src/history/projection.ts`, `packages/cli/src/history/media.ts`, `packages/cli/src/history/service.ts` and `packages/cli/src/history/import.ts`. Read actual producers/callers when upstream reorganizes these paths; the two current fork-different production files are `projection.ts` and `media.ts`.
- Tests/evidence: `packages/cli/test/history/` NUL/projection/media/attachment-around tests and the C05 record in [selected synchronization](upstream-sync-2026-09-15-5198ff54.md). The accepted final history run has 68 passes, five upstream benchmark skips, and 625 assertions; this audit does not rerun or relabel that evidence.
- Review basis: upstream `5198ff540efb5ca9fff2baa64555324d43a721b9`, main runtime/test behavior `4eacc84dccf83c22f533c35bea282d4c5a38cacd` (history fixes already present at `64e47eb7695e3ce137ba95a6d1f5b4b381eed58d`).
- Retirement condition: upstream supplies equivalent NUL fidelity, SQL-side field/list budgets and structural locator-safe omission behavior, proven against raw retrieval and real preview formatting.

## FC-018 — explicit empty values in actor shell flags (retired)

- Status: retired on 2026-09-24 by upstream `2b993ac9`: the tool shell invocation format, parser and flag mappings were removed. JSON Actor schema validation remains active under FD-006, but this shell-only hardening has no runtime surface. The former contract and evidence below are historical.
- Former status: active
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
- Watch surfaces: `packages/cli/src/tool/actor.ts` — `extractNamedFlags`
  and the run/spawn/send flag mappings that consume its result.
- Tests/evidence: `packages/cli/test/tool/actor.shell.test.ts`, "an
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

## FC-019 — QuickJS heap views survive WASM memory growth

- Status: active
- Canonical owner: fork `main` dependency patch for the workflow and `exec`
  sandbox runtime
- Observable contract: root `patchedDependencies` patches
  `quickjs-emscripten-core@0.32.0` so `ModuleMemory.newTypedArray()` returns a
  `typedArray` getter that builds a view over the current
  `module.HEAPU8.buffer`, from the original pointer and length, on every access.
  Allocation, zero initialization, the pointer and the `Lifetime` free path are
  unchanged. Both published entries carry the change: `dist/index.js`
  (CommonJS) and `dist/chunk-V2S4ZYJR.mjs` (ESM, which Bun and the compiled
  binary load). A guest value built in an asynchronous continuation may grow
  the WASM heap and the runtime still disposes cleanly, so `exec` reports the
  ordinary result status: `budget_exceeded` for a return value over the 256 KiB
  cap, `completed` for a small selection of the same data, with completed
  nested tool calls and their side effects kept. The sandbox memory limit,
  deadlines and the return cap are unchanged.
- Root cause: the unpatched factory stores one view made at allocation time,
  and `memory.grow` detaches its buffer, so later reads return `undefined`.
  `executePendingJobs()` allocates `ctxPtrOut`, runs guest jobs, then reads
  `ctxPtrOut.value.typedArray[0]`. After growth that `undefined` misses
  `contextMap`, and `newContext({ contextPointer: undefined })` registers a
  second context. `rt.dispose()` then aborts with
  `Assertion failed: list_empty(&rt->gc_obj_list) ... JS_FreeRuntime`, which
  `exec` reports as `code_error` after nested tools have already succeeded; the
  CLI process still exits 0. The per-context `uint32Out` view read by
  `getLength()` and `getOwnPropertyNames()` goes stale the same way and is fixed
  by the same getter. Raising or removing the sandbox memory limit does not
  avoid the abort.
- Upstream relationship: upstream ships the same unpatched 0.32.0, the latest
  published release on 2026-10-12, with the same sandbox. This is fork hardening
  of a shared dependency, not a rejected upstream decision; no upstream PR is
  opened.
- Watch surfaces: root `package.json` `patchedDependencies`, the
  `patchedDependencies` block of `bun.lock`,
  `patches/quickjs-emscripten-core@0.32.0.patch`, the `quickjs-emscripten-core`
  and `@jitl/quickjs-singlefile-mjs-release-sync` versions in
  `packages/cli/package.json`, and `packages/cli/src/workflow/sandbox.ts`. The
  patch is keyed to the exact version and to minified bundle text, so any bump
  of either package needs the regression cases run again without it.
- Tests/evidence: `test/workflow/sandbox.test.ts`, "exports a large JSON value
  after async resumption without leaking its runtime", returns a
  10,000,000-character string serialized after `await` and then evaluates a
  second script. `test/tool/tool-script.test.ts`, "large nested tool metadata
  preserves success when returning full result", runs a synthetic tool that
  writes a file and returns 12,000 diagnostics: `budget_exceeded`, the file
  written and one `completed` sub-part. Its "output" sibling is the control and
  stays `completed` with or without the patch. On 2026-10-12 on macOS x64 both
  files pass 133/133 with the patch under Bun 1.3.14 and 1.4.3. Mutation-checked
  under Bun 1.4.3: without the patch exactly the two non-control cases fail and
  the other 131 pass. Direct runtime probes of each entry register one context
  with the patch, and two followed by the abort without it. `build:local`
  binaries built under Bun 1.3.14 and driven through `mimo run --format json` by
  a scripted local model returned `code_error` with the assertion for a
  3,770,766-byte return value without the patch and `budget_exceeded` with it;
  small-value, output-only, `--version` and help runs passed in both builds. The
  investigation recorded the same binary result on Windows x64.
- Mutation-check note: `bun ci` does not reinstall a package when its
  `patchedDependencies` entry is removed. An already patched
  `node_modules/.bun/quickjs-emscripten-core@0.32.0` stays patched and the
  regression cases still pass, so delete that directory, or install fresh,
  before running them unpatched. Restoring the entry does reinstall it.
- Retirement condition: a published `quickjs-emscripten-core` release reads
  heap views from the current buffer after memory growth, and both regression
  cases pass on a fresh install without the patch; or upstream adopts an
  equivalent patch, which the fork then takes in place of its own. The
  regression cases stay in either case.
