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
- Last reviewed: 2026-11-26
- Upstream: `6ad6bbb44acb3600ccc4c09ab3c64c79f5878593`
- Prior reviewed upstream: `c538fab349373356623acea5bb80defa7fc279c0` (2026-11-25)
- Review completion: `main` adopts upstream's closed image attachment reminder (C01) and adapts its append-only placement (C02): `orderUserParts` now moves only a legacy envelope ahead of the user body on read, so a reloaded message keeps the prompt first sent (FC-009 note). `dev/compat` inherits it through a clean merge. See [the synchronization record](upstream-sync-2026-11-26.md).
- Main behavior (runtime/tests): `d1039edaa94528da317b8668a2e244ec5fa98c9b` (synchronization merge over pull request #278)
- Inherited compat behavior: `75e37ed2f052e20f7b14a98caee44e7baaed1cf0` (propagation merge over the pull request #278 propagation)
- Bundled guidance content: `79c6e5a01d15cf376a4033524de387a932fd6a7f` (categorized skills, provider reference, corrected explicit-session harness precedence; fork guidance retained).
- Prior fork `main` tip: `92d3b8d44902533ccfe15d4e470a279fdf412d75`. Prior fork `dev/compat` tip: `d8d14a2972182440a6f022f24dbdc01e30ec162d`
- Complete code-difference audit: [2026-09-15 implementation closure](fork-difference-closure-2026-09-15.md), with fixed Git trees, per-file ownership, completed F01–F11 decisions and retained boundaries.
- Original audit baseline: [2026-09-15 findings](fork-difference-audit-2026-09-15.md); its 529 file pairs, source snapshots and pre-implementation findings remain historical.
- History: [fork-registry-history.md](fork-registry-history.md)

`Upstream` remains the overall upstream review baseline. `Main behavior` names
the runtime/test tree the last upstream review covered; bundled guidance has a
separate content snapshot. Pure registry/history commits advance neither
reference, and neither do fork pull requests merged between synchronizations
(FC-044 through FC-056 and later corrections to existing entries): each such
entry names its own evidence, and the next synchronization reviews it. The
selected released capability audit is recorded in
[the model API review](released-model-api-review-2026-09-08.md).

Latest reviewed synchronization is the [2026-11-26 closed image attachment reminder](upstream-sync-2026-11-26.md), C01–C02 (N=2).

Path note: living registry entries use the `packages/cli/` and `packages/sdk/` layout from the 2026-10-02 synchronization, including inside older dated bullets; dated synchronization records keep the paths of their time.

Earlier synchronization summaries (35, from the 2026-09-15 specified range through the 2026-11-04 `10b03cf0` sync) moved verbatim to [the shared history](fork-registry-history.md#2026-11-07-registry-normalization); the linked synchronization records remain authoritative.

The dated notes that entries carried through 2026-11-26 (178 notes and one superseded FC-007 paragraph) moved verbatim to [the shared history](fork-registry-history.md#2026-11-26-registry-consolidation-fc-dated-notes). Rules from them that are still in force were folded into each entry's fields. Later reviews add new dated notes at the top of an entry; a later consolidation folds them the same way.

## Sync index

| ID     | Watch surfaces                                                                                            | Upstream relationship                                            | Required decision                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| FC-001 | actor, inbox, runner, session state, recovery/resume                                                      | Typed upstream admission plus stronger fork lifecycle            | Preserve atomic acceptance, lane ownership, settlement and recovery                               |
| FC-002 | checkpoint writer and frozen request prefix                                                               | Extension plus adaptation                                        | Preserve writer-mode semantics                                                           |
| FC-004 | MCP configuration, connection state, and local exit diagnostics                                           | Explicit imported-server auto-connect plus fork hardening        | Preserve validation, redaction, and isolation                                            |
| FC-005 | skill discovery and invocation                                                                            | Stronger shared gates                                            | Preserve permission parity                                                               |
| FC-006 | plugin progress-checker configuration                                                                     | Fork integration hardening                                       | Preserve instance-local decision                                                         |
| FC-007 | project roots, fixed instance cwd, inert SDK event, optional context, Bash deletion | Shared fixed cwd and SDK compatibility plus fork safety boundary | Preserve exact path, mutation, and cwd boundaries                                        |
| FC-008 | workflow cleanup, detached Effect context, package test isolation, synchronization, and CI/reporting      | Runtime/process hardening                                        | Preserve bounds, scoped services, clean defaults, and fail-closed evidence               |
| FC-009 | synthetic messages, text parts, and retry boundary                                                        | Adapted upstream stream/retry handling                           | Preserve provenance and prevent side-effect replay                                       |
| FC-010 | WebFetch and SSRF destination classification                                                              | Adapted contract plus fork hardening                             | Preserve complete `fe80::/10` classification, per-hop authorization, and resource bounds |
| FC-011 | model prompts, path guidance, and bundled skills                                                          | Fork-facing guidance                                             | Preserve factual shared guidance                                                         |
| FC-012 | publication, contribution, security                                                                       | Fork-specific process                                            | Preserve fork routing                                                                    |
| FC-013 | Retry configuration, request/candidate/judge scopes and MaxMode final step                                | Shared retry plus fork policy corrections                        | Preserve scope budgets, persistent live-step recovery (bounded for background system agents and for pure-empty output), tool-free final step and status isolation |
| FC-014 | `.cursor/environment.json` Cloud Agent dev environment                                                    | Fork-only infra absent from upstream                             | Preserve Bun bootstrap and read-only `upstream` remote; never send to upstream           |
| FC-015 | compaction context budget, projection, frozen prefix, and trigger ratio                                   | Upstream trigger plus bounded fork projection                    | Preserve ratio parity, no-tool summaries, and config precedence                          |
| FC-016 | TUI voice Prompt ownership and grapheme-safe editor offsets                                               | Upstream voice protocol plus fork lifecycle/editor hardening     | Preserve owner identity, drain-before-idle, and grapheme boundaries                      |
| FC-017 | History SQLite projection, attachment preview formatting and legacy retry-part reads                      | Upstream history with fork fidelity/budget corrections           | Preserve NUL data, SQL metadata bounds, attachment locators and legacy retry reads       |
| FC-019 | `quickjs-emscripten-core` dependency patch, `patchedDependencies`, sandbox runtime disposal               | Fork patch of the dependency upstream ships unpatched            | Keep the patch until a release refreshes heap views; re-verify it on any version bump    |
| FC-020 | Stringified object/array tool arguments: AI SDK tool-call parse and `Tool.define` validation              | Fork hardening of upstream's raw tool-call input                 | Decode only container-typed string failures; persist and execute one input               |
| FC-021 | Checkpoint writer: bounded-agent overflow, writer view sizing, writer step budget                         | Fork hardening of upstream writer loop and fork view             | Stop on overflow; fit the view to the window; keep a finite budget                       |
| FC-022 | `Log.clone` and the per-service logger cache                                                              | Fork fix of upstream logger tag sharing                          | Clones never reach the shared per-service logger                                         |
| FC-023 | Model fallback variant: model-less prompts, command fallback model, shell user record                     | Fork fix of upstream variant loss on the model fallback          | Continue the variant only with the fallback model; a named model keeps its default       |
| FC-024 | Inbox boot reconciliation: outcome of a claim the restart cut off                                        | Fork fix of upstream boot recovery outcome                       | A delivered claim is `interrupted`, an undelivered one `never_ran`                       |
| FC-025 | Grok tool schemas: discriminated-union `operation` envelopes (cron, task, actor)                          | Fork model-specific schema adaptation                            | Flatten the envelope for Grok only; zod parses the original union                        |
| FC-026 | Cron bridge across instance recycling: remount from instance bootstrap                                    | Fork fix of upstream bridge lifecycle                            | Remount the last mount after a recycle; an explicit stop stays stopped                   |
| FC-027 | Checkpoint writer closing reply: prompt Turn 2, constraint 8 and the writer task                          | Fork fix of upstream writer prompt                               | Close with one short line; never end with an empty reply                                 |
| FC-028 | Checkpoint ladder across restarts and multiple crossings: seeding and one writer per evaluation           | Fork fix of upstream threshold state                             | Count thresholds a writer was started for as crossed; start one writer for the highest   |
| FC-029 | Checkpoint writer file text: CURRENT FILES block in the writer task and validation re-prompts             | Fork fix of upstream writer inputs under the Codex harness       | Give the writer the text it edits; never rely on it being able to read the memory files  |
| FC-030 | TUI session resume variant: restore from the last user message, saved per-model choice                    | Fork fix of upstream TUI resume                                  | Show the resumed variant without saving it; no recorded variant keeps the saved choice   |
| FC-031 | Actor send sender id: the inbox row and the rendered `from` of a send                                     | Fork fix of upstream sender identity                             | Record the lane actor id; never an agent name                                            |
| FC-032 | Bash timeout note for a command run over ssh                                                              | Fork fix of upstream timeout guidance                            | Say the remote side may still run; do not advise a longer retry                          |
| FC-033 | Tool run start time: gate admission and progress updates                                                  | Fork fix of upstream tool timing                                 | Start at admission; a progress update keeps the start                                    |
| FC-034 | Durable cron: lock takeover by waiting schedulers, permanent recurring jobs                               | Fork fix of upstream scheduler ownership                         | Keep retrying the lock while idle; permanent only with durable recurring                 |
| FC-035 | Undo scope: patch `written` files, and revert and unrevert of a session's own writes                      | Fork fix of upstream revert scope                                | Revert what the session's write tools wrote; leave other writers' files                  |
| FC-036 | Checkpoint writer delta under `checkpoint.fork: false`: window check and parent-view fallback             | Fork fix of upstream writer view                                 | Fork the parent view when the delta would overflow; never start a writer that cannot fit |
| FC-037 | Actor send receipts: `actor receipt` and the receiver model in send results                               | Fork addition to upstream actor tool                             | Let a sender check delivery itself; show the model and variant the receiver runs         |
| FC-038 | Actor send idempotency key: per-sender/receiver namespace, revive only unseen messages                    | Fork addition to upstream actor tool                             | A keyed resend is a no-op unless the earlier message ended unseen                        |
| FC-039 | TUI stdin parser: split terminal replies (DCS/OSC/APC) wait for their terminator                          | Fork patch of upstream opentui parser                            | Keep a split reply one response; never type its tail into the prompt                     |
| FC-040 | Subagent writability for the progress check ignores catch-all allows after its own deny                   | Fork fix of upstream postStop check                              | Never ask a read-only subagent to write its journal under `--yolo`                       |
| FC-041 | Exec `files.readText` reads the memory directory                                                          | Fork fix of upstream exec file jail                              | Let a harness without a read tool read task journals                                     |
| FC-042 | A bounded agent's usage past the compaction trigger is not an overflow                                    | Fork fix of upstream bounded overflow                            | Stop a writer only when the provider rejects its request                                 |
| FC-043 | `actor cancel` waits a bounded time for the actor to stop                                                 | Fork fix of upstream actor tool                                  | A stuck child never freezes the caller's turn                                            |
| FC-044 | Checkpoint writer returns only `.output` from exec tool calls                                             | Fork addition to upstream writer prompt                          | Keep the full patch diff out of the writer's context                                     |
| FC-045 | Checkpoint extraction prompt targets 85% of each budget                                                   | Fork addition to upstream writer retry                           | Trim once, with room, instead of a hundred tokens per re-prompt                          |
| FC-046 | Checkpoint ladder after a rebuild: thresholds within one step of the rebuilt context                      | Fork fix of upstream threshold state                             | Start the first writer after the context has grown; never skip the final threshold      |
| FC-047 | Checkpoint writer model under `checkpoint.fork: false`: `agent."checkpoint-writer".model`               | Fork addition to upstream writer spawn                           | Let a no-fork writer run on a configured model; a parent-view fork keeps the parent's   |
| FC-048 | Step-finish summaries: snapshot anchors from the part table, one summary per session, patch budgets      | Fork fix of upstream session summary                             | Keep a step's summary cost flat on long sessions and large worktrees                     |
| FC-049 | Provider `eventTimeout`: SSE comments do not count as stream progress                                     | Fork addition to upstream SSE chunk timeout                      | End a stalled upstream that a gateway holds open with keep-alive comments                |
| FC-050 | Legacy Claude environment snapshots and oversized frozen-prefix recovery | Legacy recovery after unified environment adoption | Rebuild oversized historical prefixes; the unified environment no longer injects git status |
| FC-051 | Revert and prompt admission exclude each other per session; TUI undo awaits its revert              | Fork fix of upstream revert/prompt ordering                      | A turn admitted during a revert is never hidden and later deleted                        |
| FC-052 | Build provenance: `MIMOCODE_BUILD` define from the build scripts, `build=` on the startup log line       | Fork addition to upstream build defines and startup log          | Tie a running process to the commit it was built from after the binary is rebuilt        |
| FC-053 | Config providers on `@ai-sdk/xai` (`Provider.getLanguage` fallback, `sdkKey`) and `@ai-sdk/openai` reasoning options | Fork fix of upstream config-provider routing | Route `@ai-sdk/xai` config providers to Responses under the `xai` key; force reasoning only for declared reasoning models |
| FC-054 | Log sink writes, opens and closes in `util/log.ts` | Fork hardening of the upstream log queue | A sink that stops answering is abandoned after `writeTimeout`; the queue, flush and shutdown never wait on it forever |
| FC-055 | `@ai-sdk/google` 3.0.73 `thinkingLevel` patch and `GOOGLE_SDK_EFFORTS` in `provider/transform.ts` | Fork patch of the dependency upstream pins unpatched | Send a declared Gemini `xhigh` through the direct Google SDKs; gateways fronting Gemini keep four levels; retire when upstream pins `@ai-sdk/google` >= 3.0.146 and allows `xhigh` |
| FC-056 | file-hook artifact import in `plugin/index.ts` (`importFromDisk`) | Fork fix for compiled Windows binaries; upstream imports the artifact directly | Keep hook artifacts next to their hook and import them from on-disk code until Bun's embedded resolver sees new files |

Grouped sections: [Actor and inbox](#actor-and-inbox) holds FC-001, FC-024, FC-031, FC-037, FC-038 and FC-043; [Checkpoint writer and ladder](#checkpoint-writer-and-ladder) holds FC-002, FC-021, FC-027, FC-028, FC-029, FC-036, FC-044, FC-045, FC-046 and FC-047. Every other entry keeps its own section in numeric order. Retired identifiers FC-003 (2026-09-15) and FC-018 (2026-09-24) are not reused; their entries moved verbatim to [the shared history](fork-registry-history.md#2026-11-07-registry-normalization).

## Actor and inbox

FC-001 owns actor generations, admission, settlement and recovery. FC-024,
FC-031, FC-037, FC-038 and FC-043 are narrower fixes and additions on the same
actor tool, inbox and lifecycle surfaces. Each keeps its own retirement
condition; review the group together whenever upstream changes `actor/`,
`inbox/`, `tool/actor.ts`, `effect/runner.ts` or `session/run-state.ts`. Each
entry's own source list remains the complete watch surface.

### FC-001 — linearized actor generations and persistent-peer lifecycle

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
- Input queue and lanes (upstream `949a3bcc`, adopted 2026-10-20): durable
  input receipts and the lane scheduler replace the former `Inbox.send`, drain
  and wake implementation. `Controller.accept` commits the complete user
  message and parts with its receipt, keeping the fork's generated-part replay
  checks, provenance, task binding and ownership validation. Receipt states are
  `accepted`, `claimed`, `settled`, `cancelled` and `rejected`; outcomes
  distinguish success, assistant error, interruption and never-ran input. First
  delivery fixes input placement; terminal receipts are retained and garbage
  collected rather than deleted by a drain. `session.receipt.updated` replaces
  `InboxArrived`, accepted-only consumers inspect the committed user input, and
  the API keeps the `inboxID` result field for actor callers as the receipt
  identifier. The scheduler owns wake work; the synchronous session
  cancellation epoch (`CancelEpoch`), per-run generation, acquisition checks and
  owned cleanup remain.
  - The scheduler owns each `(sessionID, actorID)` lane, claim extension and idle re-kicks. The synchronous `/message` route streams 200 when admitted idle and returns 202 plus the persisted user and `receiptId` when busy; `/prompt_async` returns 202 with `receiptId`, or 204 when no turn is admitted. Receipt lookup is session-scoped. Strict internal `startPrompt`/command/shell/summarize/recovery occupation remains independently guarded; the HTTP queue fallback does not weaken those atomic entry points. `noReply` persists history without accepting, claiming or scheduling a turn, and cannot replace a queued task's authority. Cancellation advances the persisted queue epoch before signalling execution, settles accepted unclaimed input as `never_ran`, and cannot restart an old-epoch wake. Such a queued prompt returns its original user rather than manufacturing an aborted assistant. Resume checks queue epoch as well as the retained actor/runner generation before occupation.
  - Main completion automatically waits for owned subagent executions and legacy live runners. New input wakes the wait without cancelling the child; a receipt-only wake cannot move the current input frontier backward. Explicit actor wait observes execution and input revisions; timeout preserves a discoverable running child and returns structured state. Generation handoff, persistent-peer retirement, frozen context, exactly one terminal notice and close-abort-join remain fork-owned. Seedless main input can remain accepted without spinning or inventing a model; a later valid prompt may consume it. Only a positively known peer uses the configured-model fallback.
  - Queue rendering is shared by model requests, checkpoint context, post-hook trajectories, goal judging and fork/export/import projections. Accepted but unconsumed input remains hidden; consumed inputs retain first-delivery order, including caller IDs older than a current frontier. A checkpoint boundary must not have its continuation authority displaced by reconstructing an older consumed input. Structured completion stays attached to its original caller even if a later prompt is consumed in the same lane run. A newly admitted user may settle an older unfinished error while preserving that error. Atomic replay, task inheritance, fail-closed public actor recovery, invocation approval and generation ownership remain active. Evidence and accepted-source CI: [thirteen-capability record](upstream-sync-2026-10-20.md).
- Run tracking and retry supersession: live-claim run tracking is process-wide,
  with monotonic run ids across every prompt entry. A run with no surviving
  claimed input interrupts instead of consuming retry supersession
  indefinitely, and settlement releases the live marker even when
  acknowledgement fails or there is nothing to acknowledge. A newly accepted
  lane input supersedes a failing retry step through the claim, consume, task
  and run-approval boundaries; recovery keeps its locked parent and does not
  observe that watcher. Successful cleanup removes retry parts but keeps
  assistant identities referenced by durable first-delivery receipts.
- Resume and recovery admission: resume settles the selected assistant inside
  its admission transaction and continues from it; upstream `002cb4c9`'s history
  trim and parent-user restart are not adopted. `POST /session/:id/resume`
  accepts an exact `assistantMessageID` (exclusive with `userMessageID`, also
  forwarded to actor resume). A pending question or permission refuses resume
  with 409 before occupation and again at admission. Admission runs before
  `SessionRunState`'s orphan sweep through `startOwned`'s `admit` argument, so a
  rejected or cancelled admission writes nothing; a Stop before admission
  reports 404 from the route while `startResume` reports the interruption. An
  optional host execution `attempt` is prepared, rechecked, admitted before the
  settlement commit, gated on `beforeWork` and finished when the run fiber exits
  (`Runner.startOwned` exposes `awaitExit`); main model calls carry
  `ExecutionScope`, and actor resume refuses `attempt`. Main resume captures a
  cancellation epoch before atomic admission, then cascades only to eligible
  same-session subagents through `Actor` recovery/resume: no registry-only or
  released-context takeover, child supervisors keep task, model and context
  ownership and terminal publication, and pending admission is bounded and
  withdrawn on Stop or timeout. An optional model override goes through the
  single `startResumeTurn` admission path and is resolved before
  `commitRecoveryCandidate`, so an unresolvable model settles nothing; the
  classification skip uses the candidate the runner actually settled.
  Upstream's `resume`/`resumeBackground` remain absent.
- Recovery candidates and settlement: `time.completed` is the settlement
  marker. A step-level `time.completed` does not prove the round finished, so a
  turn that stopped on `tool-calls` or `length` is a candidate while a clean
  `stop`/`other` turn is not; settling an already-errored assistant is
  idempotent, and a settled errored assistant is not a candidate again (upstream
  keeps it one). The settlement guard is "completed and errored", and the
  `expectedParentID` candidate-identity check runs before any write. An empty
  provider stop stays a candidate, even after completion or a later error,
  until an abandonment settles it with `MessageAbortedError`; a completed
  errored assistant with delivered output stays settled. An interrupt-only exit
  while a run-loop step is still preparing (after the assistant is created,
  before stream cleanup owns it) persists `MessageAbortedError("Aborted")` and
  publishes `Session.Event.Error` before idle; the assistant keeps no
  `time.completed`, so it stays a candidate, and the next admitted user's orphan
  sweep keeps that error. Empty-residue recovery deletes parent-scoped shells
  and binds any task inside the immediate admission transaction, skipping
  summary and structured-output assistants; ownership handoff precedes
  postcommit publication, and failed, busy, stale or cancelled admission cannot
  clean up. Recovery selects the latest same-actor candidate, does not revive a
  completed abandoned error, and never fabricates or rewrites the parent user
  except for an authorized task binding. Late subtask metadata after settlement
  leaves the persisted tool part unchanged.
- Execution, cancellation and notification: spawn reserves an `ActorExecution`
  during admission and keeps it through postStop and terminal publication.
  Blocking run/outcome/wait, persistence and parent notification observe the
  preserved main result with postStop warnings after housekeeping; background
  spawn returns its identity after admission, and inbox continuations cannot
  overtake it. Cancellation closes execution admission, invalidates queued
  acquisition tickets, then captures, interrupts and joins the selected
  execution through retirement; old tickets cannot restart after the barrier
  opens, while fresh generations and other sessions stay independent. A
  reserved worker cancelled before startup skips its model call. The execution
  publishes a cancellation-owned generation and the cancelling owner waits;
  notification receipts are read after that join, a completed turn cannot hide
  cancellation of later queued work, and an already-cancelled turn gets no
  duplicate notice. Continuation receipts record whether the terminal envelope
  was actually published, so a failed send does not suppress the fallback
  notice. Owner acquisition and cleanup installation are masked together while
  a follower's wait stays interruptible. Effect hooks on an active execution
  fiber, and model tools (which run in the processor's tool scope that execution
  cleanup closes and joins), delegate cancellation to the service scope and wait
  interruptibly, so an actor cancelling its own spawn through the `actor` tool
  does not deadlock. Runner installs its exit finalizer before its child can be
  interrupted. Session abort cancels every runner and registered actor in the
  session; terminal cancellation is durable and drains into the parent's main
  history without automatic wake or toast. Quiet delivery follows execution,
  generation and cancellation-episode ownership, and runner keys nest by exact
  session and actor identity. Terminal notifications go through upstream's
  shared `makeTerminalNotifier` (`actor/notification.ts`): `withNotificationTarget`
  runs it inside the parent's Instance and run-disposal scope, the caller passes
  the `actor` it already holds, and the toast goes through the injected `Bus`
  service. Spawn-turn and cancel-owner deliveries toast; a resumed persistent
  turn notifies as a `continuation` without a toast, like a woken peer.
- Message chronology and atomic commits: caller IDs are identity keys, not
  admission order. `createMessage` allocates an actor-local monotonic committed
  timestamp; metadata updates keep the creation time and completion cannot
  precede it. `commitUserMessage` and `commitUserMessageIfLatest` commit a user
  or derived user with all its parts, validating session, actor and part
  ownership, and the latest-user condition shares that immediate transaction.
  A same-owner prompt retry may reuse producer-generated part IDs only when the
  complete persisted content matches: anonymous parts match by relative order,
  explicit IDs and persisted content stay strict, reordered explicit parts are
  equivalent after canonical sorting, and runtime-added parts make a later
  replay conflict; this is not a lifetime replay receipt. Shell writes and
  streamed assistant/tool output stay outside that transaction. Fork, revert and
  cursor consumers use chronological positions with UTF-8 ID ties matching
  SQLite BINARY (`compareUtf8Bytes`). Session IDs are upstream's marker-free
  descending form in the same `ses` namespace; existing `ses_-…` IDs stay valid,
  and message descending IDs keep their chronology marker.
- Other carried rules: summarize stays in `SessionPrompt.startSummarize` with
  its owned main runner, atomic `createIfLatest`, task identity and commit
  receipt; it validates the model before mutation, removes unprojected
  boundaries on exit, and verifies the projection after the runner completes,
  including the cancellation fallback, so a cancelled compaction never reports
  success. `MessageV2.planResumeTrim`, `assertResumeModelBoundary` and the
  route's `resolveCurrentAgent` ship without a production caller, so their
  upstream tests do not cover the fork's path. Session fork reads its
  source-message snapshot before creating the destination and reuses it for
  cutoff validation and busy-agent inspection, keeping the transaction's fresh
  rendered-order copy. `hasActorTool(undefined)` is `false` (fail closed, PR #53)
  and `ToolRegistry.available` is its only production caller. Title revisions
  are transactional and manual titles stay protected across imports, replay and
  HTTP conflicts; the first genuine input commits a deterministic fallback
  title before detached generation, and recovery alone does not retitle
  historical turns.
- Upstream relationship: adopts upstream durable receipts, lane scheduling and
  automatic subagent waiting, plus typed exclusive Runner admission and
  actor-scoped `replace-agent`, while retaining the stronger
  fork generation, cancellation, disposal, persistent-peer, fail-closed identity
  evidence. Public actor recovery adapts upstream's `agentID` selector through
  the existing constrained actor lifecycle, without caller-supplied task
  replacement or detached background resume.
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
  The carried rules above are covered by `test/server/session-recovery.test.ts`
  (exact-target, host-attempt, empty-stop and candidate-predicate matrices),
  `test/session/prompt-sweep.test.ts` (settlement boundary),
  `test/effect/runner.test.ts`, `test/session/invalid-output-continuation.test.ts`,
  `test/actor/self-cancel.test.ts`, `test/actor/spawn-notification.test.ts`,
  `test/server/summarize-agent-main-slice.test.ts` and the HTTP
  cancelled-compaction case, `test/tool/actor-subagent-gating.test.ts`
  (`hasActorTool`), `test/inbox/queue-controller.test.ts`,
  `test/session/cancel-epoch.test.ts`, and the step-preparation and
  resume-timing cases of `test/session/prompt-effect.test.ts`. The published
  actor-recovery contract is asserted on the runtime OpenAPI document; the
  committed `packages/sdk/openapi.json` is gone since upstream `698f0f29`.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
- Retirement condition: upstream provides equivalent generation ownership,
  typed atomic main prompt/command/init/shell/summarize/recovery/resume
  admission, default-main and constrained public actor recovery identity, equivalent constrained
  actor recovery, cancellation settlement,
  stale-idle exclusion, persistent-peer wake, tombstone, and parent-notice
  guarantees plus positive known-peer evidence for parent identity replacement,
  with behavior-focused regressions.

### FC-024 — boot reconciliation reports a delivered claim as interrupted

- Status: active
- Canonical owner: fork `main` inbox boot recovery in
  `packages/cli/src/inbox/controller.ts` (`reconcileOnBoot`)
- Observable contract:
  - When a process restarts, `reconcileOnBoot` cancels its session's stale-epoch
    and crashed `claimed` rows. A row whose input was already delivered into the
    conversation (`consumed`) settles as `interrupted`; a row not yet delivered
    settles as `never_ran`. Stale-epoch `accepted` rows are never consumed, so
    they stay `never_ran`.
  - This is the rule `cancelInputs` in the same file already applies when a
    session stops.
  - A run still live in this process survives controller or Instance
    replacement and is excluded from same-epoch crash reconciliation; stale-epoch
    fencing still cancels its input. Crash fixtures withdraw their live marker
    explicitly, and a mixed live/orphan regression runs beside the
    consumed-outcome case.
- Motivation: `reconcileOnBoot` wrote `never_ran` for every claimed row, so a
  sender reading the receipt after a crash could not tell an input the model had
  already seen and partly acted on from one it never received. Recovery rules
  such as "resend once when `never_ran` and `consumed=0`" depend on that
  difference; resending a consumed input replays work that already ran.
- Upstream relationship: upstream `reconcileOnBoot` writes `never_ran`
  unconditionally. Fork fix of shared code; `dev/compat` inherits it unchanged.
- Watch surfaces: `reconcileOnBoot` and `cancelInputs` in
  `packages/cli/src/inbox/controller.ts`; the `consumed` anchor in
  `packages/cli/src/session/prompt.ts`.
- Tests/evidence: `packages/cli/test/inbox/queue-controller.test.ts`
  "reconcileOnBoot reports a claim already delivered into the conversation as
  interrupted" claims two inputs, marks one delivered, and expects
  `interrupted` and `never_ran` respectively. Writing `never_ran` again fails it.
  "reconcileOnBoot cancels claimed rows" still expects `never_ran` for an
  undelivered claim.
- Retirement condition: upstream distinguishes consumed claims on boot recovery.

### FC-031 — an actor send names the sending lane, so it can be answered

- Status: active
- Canonical owner: fork `main` actor tool — the `send` action's
  `senderActorID` in `packages/cli/src/tool/actor.ts`, and the `send` entry of
  `packages/cli/src/tool/actor.txt`
- Observable contract:
  - An `actor send` records the sending lane's actor id as the inbox row's
    `sender_actor_id`: `main` for a session's main lane, the actor id (such as
    `general-1`) for a subagent or peer lane, for direct and `exec` calls alike.
  - The receiver sees `<inbox from="<session_id>:<actor_id>">`, and a send to
    that session and actor reaches the sender. The tool description says so.
- Motivation: a direct call recorded `ctx.agent`, the agent's name, while an
  `exec` call recorded the actor id. A main lane running agent `build`
  therefore signed its messages `<session>:build`, and a reply to
  `to_actor_id: "build"` failed with receiver not found, since the main lane's
  actor id is `main`. In recorded collaboration 565 rows carried `build` as the
  sender, 391 of them across sessions, so every such receiver had to know the
  sender's lane out of band to answer.
- Upstream relationship: upstream records `ctx.agent` for every send; the fork
  already used the actor id for `exec` calls. Fork fix of shared code;
  `dev/compat` inherits it unchanged.
- Watch surfaces: the files above; `ctx.actorID` in the tool context built in
  `packages/cli/src/session/prompt.ts`; `renderInboxRow` in
  `packages/cli/src/inbox/render.ts`; receiver lookup in `Inbox.accept`
  (`packages/cli/src/inbox/inbox.ts`).
- Known limit: rows written before the fix keep the agent name.
- Tests/evidence: `packages/cli/test/tool/actor-send.test.ts` "the sender is the
  lane's actor id, so the receiver can reply to it": a main lane running `build`
  sends across sessions, the row and the rendered `from` name `main`, a reply to
  the rendered sender is accepted, and a subagent lane's send records its actor
  id. Restoring the agent name fails it.
- Retirement condition: upstream records the sending lane's actor id.

### FC-037 — a sender can read what became of its actor message

- Status: active
- Canonical owner: fork `main` actor tool — `receipt` action, `receiptOf` and
  `inputModel` in `packages/cli/src/tool/actor.ts`, documented in `actor.txt`
- Observable contract:
  - `actor receipt` with `inbox_id` (as returned by `send`) returns that
    message's receipt: receiver session and actor, sender, `state`, `outcome`,
    `consumed`, `delivered`, `error`, times, and `model` (provider, model,
    variant of the receiver's input message). Without `inbox_id` it returns the
    20 newest messages the calling session sent.
  - Only the sending or the receiving session can read a receipt; any other
    session gets `not found`, as for a missing id.
  - `actor send`'s result carries the same `model`: the model and variant the
    receiver's lane will run the message with (for example a lane at `max`).
  - Subagents keep `send` only; `receipt` is for primary agents.
- Motivation: a coordinating agent had no tool to learn whether a dispatch was
  delivered, ran, or settled `never_ran`; its re-dispatch rule (resend once when
  `never_ran` and not consumed) could only be run by reading SQLite directly.
  It also could not see that a dispatched task would run at the receiver's
  inherited variant.
- Upstream relationship: upstream has no receipt query. Fork addition;
  `dev/compat` inherits it and adds `delivery` to cross-session send results.
- Watch surfaces: the file above; `InboxTable` in
  `packages/cli/src/inbox/inbox.sql.ts`; the actor `operation` union, which
  FC-025 flattens for grok.
- Tests/evidence: `packages/cli/test/tool/actor-send.test.ts` "a sender reads
  what became of its message and the model the receiver runs it with" (send
  result and receipt carry the receiver's `max` variant; sender and receiver
  read the receipt, a third session does not; the list holds only sent rows; a
  `never_ran` settlement reads as such). Reading receipts without the session
  check, listing by receiver, dropping either `model`, or deriving `consumed`
  from the state each fails it. `registry-toolset.test.ts` and
  `actor.test.ts` cover the advertised action list and the flattened union.
- Retirement condition: upstream exposes inbox receipts to the actor tool.

### FC-038 — a keyed actor send is delivered once, and requeued only if it went unseen

- Status: active
- Canonical owner: fork `main` — `idempotency_key` of the `send` action in
  `packages/cli/src/tool/actor.ts`, `reviveUnseen` in `AcceptInput`
  (`packages/cli/src/inbox/schema.ts`) and `unseen`/the revive branch in
  `writeAccept` (`packages/cli/src/inbox/controller.ts`), passed through
  `Inbox.accept`
- Observable contract:
  - `actor send` with `idempotency_key` stores
    `actor-send:<sender session>:<sender actor>:<receiver actor>:<key>`, so
    neither senders nor a receiver session's actors share keys, and none
    collide with message-id keys.
  - A send whose key already names a row returns that row
    (`deduplicated: true`) while it is accepted, claimed, consumed, or ended
    and seen.
  - "Unseen" means: `cancelled` or settled `never_ran`, not consumed, and no
    assistant message on the receiving lane minted after the row ended —
    compared by message ID (`MessageID.ascendingAfter`), whose time is the
    wall clock at minting, because `time_created` may be bumped past the clock
    and is not comparable with `time_updated`. (An ended,
    unconsumed input still renders on the lane's next turn, so a later turn
    counts as having seen it.) Such a row is queued again in the same
    transaction — the same row and the same user message, back to `accepted`
    in the current epoch — and the result reports `revived: true`. No second
    message is created, so nothing has to be hidden from rendering and receipt
    GC cannot expose a duplicate.
  - `deduplicated` and `revived` come from the accept transaction itself, so
    overlapping keyed sends each report what their own transaction did.
  - The revived message is the original one; a resend's own content is not
    used.
  - Sends without a key, and every other keyed accept (prompt receipts keyed
    by message id), keep reusing the existing row unconditionally.
- Motivation: a coordinator's rule "resend once with the same task key when a
  message settled `never_ran` unconsumed" needs a key that dedupes live and
  delivered messages but not lost ones; the store reused any keyed row, so a
  resend after a loss was silently dropped.
- Upstream relationship: upstream does not expose keys to the actor tool. Fork
  addition; `dev/compat` inherits it.
- Watch surfaces: the files above; `MessageV2.renderedOrder` and
  `SessionCheckpoint.withEndedInputs` (ended unconsumed inputs render on the
  next turn — the reason for the "unseen" rule); the partial unique index on
  `(receiver_session_id, idempotency_key)`; `actor.txt`.
- Tests/evidence: `packages/cli/test/tool/actor-send.test.ts` "a keyed resend
  is a no-op until the earlier message ended unseen, then goes out once"
  (queued, consumed and seen-`never_ran` resends dedupe; another sender's key
  and another receiver actor are separate; an unseen `never_ran` is revived
  once as the same message; unkeyed sends always go out);
  `packages/cli/test/inbox/queue-sync.test.ts` "a keyed resend revives the
  unseen row instead of adding a message, and only while unseen" (one sync
  delta, one user message, a later user input does not count as seen, an
  assistant minted in the tick the input ended does not either even with a
  bumped `time_created`, a later assistant turn does, replay rebuilds the same
  state). Disabling the revive,
  reviving consumed rows, ignoring the later turn or its role, comparing
  `time_created` instead of the minted ID, shifting the ID bound by a tick, reviving into a
  stale epoch, dropping the sync record or either result flag, or not passing
  `reviveUnseen` from the tool each fails one of them.
- Retirement condition: upstream offers keyed actor sends with these semantics.

### FC-043 — `actor cancel` returns while a stuck actor is still stopping

- Status: active
- Canonical owner: fork `main` — the `cancel` branch and `actorCancelWait` in
  `packages/cli/src/tool/actor.ts` (uses `awaitWithHardTimeout`,
  `packages/cli/src/effect/hard-timeout.ts`)
- Observable contract:
  - `actor cancel` waits up to 30 s for `Actor.cancel` to finish. If the actor
    has not stopped by then (a tool call in uninterruptible work), it returns
    `status: "cancelling"` with a hint; the cancellation keeps running in a
    detached fiber and completes when that work ends.
  - Otherwise the result is unchanged (`status: "cancelled"`).
- Motivation: `Actor.cancel` joins the actor's execution inside an
  uninterruptible region. A subagent whose `exec` never settled made the
  coordinator's `actor cancel` hang for 92 minutes; 15 inputs (user prompt,
  cron fires, notifications) queued behind it until the process was restarted.
- Upstream relationship: upstream's tool waits for cancellation without bound.
  Fork fix; `dev/compat` inherits it. The workflow runtime already bounds its
  own child cancels the same way (`RECLAIM_ACTOR_TIMEOUT_MS`).
- Watch surfaces: `tool/actor.ts` cancel branch; `Actor.cancel` in
  `packages/cli/src/actor/spawn.ts`; `actor.txt`.
- Tests/evidence: `packages/cli/test/tool/actor-cancel.test.ts` "cancel returns
  cancelling when the actor does not stop in time, and keeps cancelling"
  (an uninterruptible cancel; fails or hangs with an unbounded wait or a plain
  `Effect.timeout`, which cannot interrupt it).
- Retirement condition: upstream bounds the tool-level cancel wait, or
  `Actor.cancel` no longer joins uninterruptibly.

## Checkpoint writer and ladder

FC-002 owns the canonical checkpoint writer and its frozen context. FC-021,
FC-027, FC-028, FC-029, FC-036, FC-044, FC-045, FC-046 and FC-047 are
narrower fixes and additions to the same writer, its prompts and the threshold
ladder. Each keeps its own retirement condition; review the group together
whenever upstream changes `session/checkpoint*.ts`, `session/prune.ts`,
`session/tail-digest.ts` or `agent/prompt/checkpoint-writer.txt`. Each entry's
own source list remains the complete watch surface.

### FC-002 — canonical checkpoint writer and mode-specific frozen context

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
  Skill catalogs are no longer generated into cold or warm frozen prefixes;
  capture and compaction remove historical catalogs once through `getFrozen`
  (FC-005 owns that migration), and full-context Actors and writers inherit
  user reminder metadata and complete frozen native-tool authority.
  Memory and environment reminders: the memory paths reminder is identified by
  `{ key: "memory-paths", rev: sessionMemoryDir }`, and a `session-env`
  reminder (receiving `Instance.directory`, git root only inside git, platform)
  is placed before it. `SessionReminder.windowTarget` selects only an
  unanswered own user in the current window, so sent history and frozen system
  bytes never change. The environment reminder also reaches subagents that do
  not serve checkpoints but not native hidden bounded agents. Strict
  `MessageV2.usageRecovered`, receipt-aware window ordering and FC-042's
  `compactsOnUsage` gate apply. An old untagged memory paths reminder may repeat
  once on the next eligible user; legacy file-tool placeholders stay supported.
  Writer context and tasks: the writer's context uses `MessageV2.renderedOrder`
  with consumed receipts, so unclaimed input never enters a writer snapshot and
  first-delivery order survives queue reconstruction; the same queue-aware view
  feeds post-hook trajectories and goal judging. New rebuild parts carry
  `placement: "after-tail"`, while legacy records keep exact chronological seam
  reconstruction; model requests use the boundary digest plus unanswered text
  and media, the writer and logical turn recover the full receipt-aware history,
  and queued inputs stay out until delivery or terminal settlement. FC-021
  bounds that history by the usable window. The writer has no `task` tool, since
  it runs in a child session whose task list is empty: its prompt carries a
  TASK SNAPSHOT of the parent's tasks (`taskRegistry.list` including terminal
  tasks, rendered as a tree and capped at 300, keeping unfinished tasks and
  their ancestors first, then the most recently active finished ones), §4 of
  the checkpoint comes only from it, and the writer never changes task state.
  The elision marker points at `history around` followed by `get(part_id)`.
  Disposing a SessionPrompt layer hands `prefixCaptureRef` to the most recent
  captor that is still live, never to a disposed one, so a test layer built
  beside the process-wide AppRuntime cannot strand it without a captor.
- Upstream relationship: fork extension plus adapted request construction.
  Upstream `9780b2e5` adopted the fork's disabled-checkpoint memory clause;
  the writer modes, frozen prefix authority and file-tool placeholders stay
  fork-owned.
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
  `checkpoint-child-session.test.ts` asserts the tool list without `task` and
  the snapshot lines (removing the block from the prompt fails it);
  `checkpoint-progress-reconcile.test.ts` "renderTaskSnapshot" covers the cap
  order; placement, writer-tail, legacy golden, rebuild-unify and tail-digest
  tests cover the appended window; `prefix-capture-ref.test.ts` covers captor
  hand-off.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0b665c7e681e44cac6f1a6acf18732015fb2bf86`.
- Retirement condition: upstream exposes the same canonical writer, isolated
  child, mode-specific prefix ownership, aligned delta, and disabled-checkpoint
  guidance behavior; FD-009 remains separately satisfied or retired. The legacy
  `{current_session_id}` resolution retires only when frozen system prompts that
  carry it are rewritten or invalidated, or upstream resolves it.

### FC-021 — the checkpoint writer stops, fits the window, and has a step budget

- Status: active
- Canonical owner: fork `main` checkpoint writer bounds — `prompt.ts`
  (bounded-agent overflow), `checkpoint.ts` and `prune.ts` (writer view sizing),
  `agent.ts` (writer step budget)
- Observable contract, three parts:
  - Bounded-agent overflow. A bounded computation agent (native and hidden:
    title, summary, checkpoint-writer) has no compaction or rebuild, so when
    the provider rejects its request as a context overflow, nothing can shrink
    the next one. That step is settled with a `ContextOverflowError` and the
    loop ends, on the fork path and on the regular path alike. The actor
    therefore fails as `kind: "overflow"`, `retryable: false`, and prune arms
    no final-threshold recovery gate for it. `halt` in `processor.ts` has
    already published the provider's error, so nothing is published twice.
  - Writer view sizing. `prune.fireCheckpoints` passes the usable window and
    the parent's latest provider-reported usage to `tryStartCheckpointWriter`.
    The writer still reads the newest rebuild boundary's tail at full fidelity
    unless `used + est(full view) − est(parent view)` exceeds the usable
    window. In that case it forks the parent's own view
    (`collapseCheckpointTail(window)`), whose boundary carries the checkpoint
    and the tail digest, and the watermark is computed on that view, so a
    successful writer moves the next rebuild's tail start past the old
    segments. The estimate is the per-part maximum of chars/4 and bytes/3;
    only the difference between the two views is estimated, the rest is the
    provider's number. A writer started by `rebuildEnsuringCheckpoint` passes
    no context and keeps the full view.
  - Writer step budget. `checkpoint-writer` declares
    `steps: CHECKPOINT_WRITER_STEPS` (120). At the budget the last step goes
    out with `toolChoice: "none"` and the MAX_STEPS reminder, so the writer
    has to answer in text. Each validator re-prompt (`MAX_PRE_REACT` = 3) is a
    new prompt with its own budget, which bounds a writer at 480 steps. A user
    `agent.checkpoint-writer.steps` still overrides it.
- Motivation: on 2026-10-31 local sessions on a 1M-token model kept failing
  with `maximum context length is 1048576 tokens; the prompt has 1051956
  tokens`. The failing requests were the checkpoint writer's. Its first
  request was 996,878 tokens while the parent's own request at the same moment
  was 723,407: the writer had re-expanded a rebuild tail that spanned every
  rebuild since the last good checkpoint (2,576 messages). A step truncated at
  the window edge left an invalid tool call, every later request was
  1,051,956 tokens, and the writer re-sent it every six seconds for 4,392
  steps, until the process exited. Because a failed writer leaves the watermark
  where it was, each failure made the next writer's view larger: another
  session's writer started at 2,091,097 tokens. Separately, two writers on a
  third session never stopped calling tools (alternating `task` list and
  `read`, saying "Stop." in their reasoning), each step about 925K cached
  tokens, for about 6,000 steps.
- Upstream relationship: upstream `7bc7dc3a` has all three gaps. Its bounded
  agents return `"continue"` on a provider-signalled overflow, its writer
  always takes the full-fidelity tail (documented as a deliberate quality
  choice in `llm-request-prefix.ts`), and `checkpoint-writer` declares no
  `steps`. This is fork hardening of shared code; the full-fidelity default is
  kept whenever it fits.
- Watch surfaces: in `packages/cli/src/session/prompt.ts`,
  `isBoundedComputation`, `writeBoundedOverflowError`, both `result ===
  "overflow"` sites, and `maxSteps`/`isLastStep`; in
  `packages/cli/src/session/checkpoint.ts`, the view selection in
  `tryStartCheckpointWriter`, `TryStartCheckpointWriterInput.context`,
  `estimateViewTokens`, `withRebuildTail`/`readRebuildTail` and
  `computeBoundary`; `packages/cli/src/session/tail-digest.ts`
  (`collapseCheckpointTail`); the writer start in
  `packages/cli/src/session/prune.ts`; the `checkpoint-writer` definition in
  `packages/cli/src/agent/agent.ts`; `classifyAssistantError` and
  `MAX_PRE_REACT` in `packages/cli/src/actor/spawn.ts`; the overflow branch of
  `halt` in `packages/cli/src/session/processor.ts`; and the parent/writer
  divergence note in `packages/cli/src/session/llm-request-prefix.ts`.
- Tests/evidence: `packages/cli/test/session/checkpoint-writer-runaway.test.ts`
  drives real sessions against a content-routed stub that tells writer
  requests from foreground ones:
  - a writer whose request is rejected as an overflow settles as a
    non-retryable `overflow` failure after exactly one request. The stub holds
    the writer's request until the settlement wait has started, because a
    writer that settles first leaves no slot and the wait reports `no-writer`;
  - a bounded agent prompted directly (no fork context) stops after one
    rejected request with `ContextOverflowError`;
  - with every writer failing, two rebuilds on one stale checkpoint leave a
    tail larger than the window; the next writer, for `fork: true` and
    `fork: false`, receives the boundary and none of the tail's file content;
  - a writer whose model never stops calling tools ends after exactly
    `CHECKPOINT_WRITER_STEPS` requests, the last with `tool_choice: "none"`.

  The full-tail behavior for a tail that fits stays covered by
  `checkpoint-writer-rebuild-tail.test.ts`. Mutation-checked: disabling the
  fork-path overflow branch makes the writer re-send 106 times in 20 seconds;
  disabling the regular-path branch makes the direct prompt re-send 67 times;
  disabling the view fallback puts the tail's file content back into both
  fork modes; removing `steps` lets the writer run past 320 requests. Each
  fails on its assertion, not on a timeout. The legacy boundary (tail inside
  the window) goes through the same expression via `collapseCheckpointTail`
  and has no end-to-end case of its own.
- Retirement condition: per part — upstream stops a bounded agent on a
  provider-signalled overflow; upstream bounds the writer's view by the window;
  upstream gives the writer a step budget. The regression cases stay in every
  case.

### FC-027 — the checkpoint writer closes with one line

- Status: active
- Canonical owner: fork `main` checkpoint writer prompt in
  `packages/cli/src/agent/prompt/checkpoint-writer.txt` (Turn 2, constraint 8)
  and the writer task in `packages/cli/src/session/checkpoint.ts`
  (`composeWriterPrompt`)
- Observable contract:
  - After its edits the writer is told to end with one short line such as
    `Checkpoint updated.`, without a summary and never with an empty reply. The
    last instruction of the writer task says the same.
  - Nothing else about the writer changes: its tools, the edit pass, its budgets
    and the success rule (the watermark advances only when the run succeeds).
- Motivation: a final step with no text, no reasoning and no tool call is
  invalid output. The processor retries it, and for a background system agent
  the bounded retries (FC-013) then fail the run. The writer prompt said "then
  stop", "your response is complete. Do not summarize what you wrote" and "stop
  immediately". Most models still closed with a line; a GPT-family model behind
  a gateway took it literally. In recorded runs one session's writers on that
  model failed 16 of 21 times in about 16 hours, all with "empty output", and
  the failed runs cost $85 of the $108 its writers spent. The inspected failure
  had already rewritten checkpoint.md when its empty reply failed the run. The
  watermark stayed at the last success for twelve hours, so every later writer
  and rebuild covered the same growing range again.
- Upstream relationship: upstream's prompt and task carry the same three
  "stop" instructions and the same empty-output handling. Fork fix of shared
  prompt text; `dev/compat` inherits it unchanged.
- Watch surfaces: Turn 2 and constraint 8 in `checkpoint-writer.txt`; the last
  line of `composeWriterPrompt`; the empty-output retry in
  `packages/cli/src/session/processor.ts` and `classifyAssistantStep` in
  `packages/cli/src/session/classify.ts`; the system-agent retry bound (FC-013).
- Tests/evidence: `packages/cli/test/session/checkpoint-child-session.test.ts`
  "writer is told to close with one line, not to end with an empty reply" reads
  the spawned writer's task and expects the closing-line instructions and none
  of the old "stop" wording; restoring the old wording fails it. The case pins
  the instruction, not a model's compliance, which is read from recorded writer
  outcomes.
- Retirement condition: upstream asks the writer for a closing line, or the
  runtime accepts an empty final reply from a writer whose edits applied.

### FC-028 — the checkpoint ladder survives a restart and starts one writer at a time

- Status: active
- Canonical owner: fork `main` checkpoint ladder in
  `packages/cli/src/session/prune.ts` (`fireCheckpoints`, `reachedTokens`) and
  `lastSucceededWriterStart` in `packages/cli/src/session/checkpoint.ts`
- Observable contract:
  - The first time a process evaluates a session's ladder, every threshold at or
    below the context size the session had reached when it started its last
    writer that succeeded counts as crossed. That size is the main lane's newest
    assistant usage from before the writer's child session was created; the
    writer is that child session's `checkpoint-writer` actor with outcome
    `success`. A later writer that failed or never finished does not count, so
    its threshold fires again after the restart; this also stands in for the
    final threshold's recovery gate, which does not survive a restart. With no
    succeeded writer, or with a rebuild or compaction boundary after it, the
    whole ladder stays armed, as `resetThresholds` leaves it after a rebuild —
    except the non-final thresholds near the rebuilt context, which FC-046
    counts as crossed.
  - When one evaluation finds several thresholds newly crossed, it starts one
    writer, for the highest, and marks them all crossed. The final-threshold
    recovery gate is unchanged within a process.
- Motivation: `crossed` is process memory, so a restarted process treated every
  threshold a session had passed as new. In recorded restarts three sessions
  each started a writer at their first turn after the restart for a threshold
  passed before it (for example 270000 at 609251 tokens), and two sessions also
  queued a second writer behind the first for the same range. Each writer is a
  pass over the whole context. The checkpoint watermark cannot stand in for the
  ladder: `computeBoundary` leaves a tail of 10K–20K tokens after it, so the
  context at the watermark sits below the threshold that fired.
- Upstream relationship: upstream keeps `crossed` in memory only and starts a
  writer per newly crossed threshold. Fork fix of shared code; `dev/compat`
  inherits it unchanged.
- Watch surfaces: `fireCheckpoints`, `reachedTokens` and `resetThresholds` in
  `prune.ts`; the writer child session and its pending-writer slot in
  `tryStartCheckpointWriter`, and `lastSucceededWriterStart` in
  `checkpoint.ts`; the writer actor's `last_outcome` in
  `packages/cli/src/actor/actor.sql.ts`; `isBoundaryUser` in
  `packages/cli/src/session/tail-digest.ts`.
- Tests/evidence: `packages/cli/test/session/prune.test.ts`
  "SessionPrune.fireCheckpoints after a process restart" builds a fresh layer
  per case: "a threshold a succeeded writer was started for does not fire
  again", "the context reached is read from before the writer started, not
  after", "a threshold whose last writer failed or never finished fires again",
  "a rebuild after the last writer arms the whole ladder again" and "thresholds
  crossed together start one writer". "resetThresholds drops a pending gate" now
  expects one writer for the two thresholds its replay crosses together.
  Seeding nothing, ignoring the rebuild boundary, reading the newest usage
  instead of the one before the writer, or counting a writer that did not
  succeed each fails its case; a writer per threshold fails the last case and
  the reset case.
- Retirement condition: upstream rebuilds the ladder after a restart and starts
  one writer per evaluation.

### FC-029 — the checkpoint writer is given the text it edits

- Status: active
- Canonical owner: fork `main` checkpoint writer inputs — `renderCurrentFiles`
  and `composeWriterPrompt` in `packages/cli/src/session/checkpoint.ts`,
  `renderCurrentFile`, `readCurrentFiles`, `buildExtractionReflection` and
  `buildReflectionMessage` in `packages/cli/src/session/checkpoint-retry.ts`,
  the `actor.preStop` hook in `packages/cli/src/plugin/checkpoint-splitover.ts`,
  and Turn 1 and the notes.md instruction in
  `packages/cli/src/agent/prompt/checkpoint-writer.txt`
- Observable contract:
  - The writer task carries a CURRENT FILES block: the text of CHECKPOINT_PATH,
    MEMORY_PATH and NOTES_PATH read when the writer starts, each between
    `<current-file name="…" path="…">` tags, followed by NOTES_TEMPLATE. Turn 1
    tells the writer to work from that block and not to read those three files
    again; the notes.md reset uses the template block.
  - A validation re-prompt from the `actor.preStop` hook carries the current
    text of each file it names: the over-budget files for an extraction, the
    files with errors otherwise. A file within its budget and without errors is
    not repeated.
  - CHECKPOINT_PATH and MEMORY_PATH, which the writer edits in place, are shown
    up to `CURRENT_FILE_CHAR_LIMIT` (100,000 characters): to the last whole line
    within the limit, never splitting a surrogate pair, followed by a line
    saying how much is shown. Turn 1 then has a writer that can read the
    rest, and one that cannot leave the unseen part as it is. NOTES_PATH is
    always shown whole, because Turn 2 resets it and a part not shown would be
    deleted unreconciled; it is emptied at every checkpoint, so it holds only
    what was appended since the last writer.
- Motivation: on the Codex harness (GPT-family models) the tool set has no
  `read`, `write` or `edit`; files are read through `exec`'s `files`, whose jail
  is the worktree and the OS temp directory. The memory directory is outside
  it, so a writer on that harness could not read the checkpoint it was told to
  read and edit, nor see the result of its own `apply_patch` edits. In recorded
  runs such writers reported reads failing with "path outside allowed roots",
  found no read tool in `ALL_TOOLS`, and declined the extraction re-prompts
  because they could not see the section to extract. One session's checkpoint
  grew to 62,876 characters (its whole budget is about 44,000) with §5 at
  22,372, while its writers spent every re-prompt on refusals.
- Upstream relationship: upstream's writer prompt and re-prompts point at the
  paths only, and its Codex harness has the same `files` jail. Fork fix of
  shared code; `dev/compat` inherits it unchanged.
- Watch surfaces: the files above; the writer's tool whitelist
  `CHECKPOINT_WRITER_TOOLS`; `available` and `tools` in
  `packages/cli/src/tool/registry.ts` (which tools the Codex harness drops);
  `resolveJailed` in `packages/cli/src/tool/tool-script.ts`; FC-021's writer view
  sizing, which does not count the task.
- Known limit: the block is not counted in FC-021's view projection. It holds
  at most two files of `CURRENT_FILE_CHAR_LIMIT` characters plus notes.md, and
  a writer that can read would read the same text into its context anyway.
- Tests/evidence: `packages/cli/test/session/checkpoint-child-session.test.ts`
  "writer task carries the current text of the files it edits and the notes
  template" seeds the three files (notes.md empty) and expects each verbatim
  between its tags, the template, and none of the old "Read BOTH" wording;
  "writer task shows notes.md whole even past the current-file limit" seeds a
  notes.md longer than the limit and expects all of it.
  `packages/cli/test/plugin/checkpoint-splitover.test.ts`: the extraction case
  expects the over-budget checkpoint verbatim and no MEMORY block; the
  duplicate-title case expects the erroring checkpoint verbatim instead of
  "Read your output". `packages/cli/test/session/checkpoint-retry.test.ts`
  "renderCurrentFile": a file within the limit is shown whole, a longer one is
  cut after its last whole line, and a single over-long line is cut before a
  surrogate pair. Dropping the block from the task, the text from either
  re-prompt, the files from the hook, the line cut, the surrogate guard or the
  whole-notes exception each fails its case.
- Retirement condition: upstream gives the writer the files' text, or the
  Codex harness can read the memory directory.

### FC-036 — a no-fork checkpoint writer whose delta would overflow forks the parent view

- Status: active
- Canonical owner: fork `main` checkpoint writer — `deltaTooLarge` in
  `tryStartCheckpointWriter` in `packages/cli/src/session/checkpoint.ts`
- Observable contract:
  - With `checkpoint.fork: false` the writer is sent its own system prompt and
    the messages since the last checkpoint. When the caller reports the
    parent's usable window (`context`) and that request's estimate exceeds it,
    the writer forks the parent's view instead, exactly as under
    `fork: true` (including FC-021's choice between the full and the parent's
    own view). The log line is `writer delta exceeds the usable window,
    forking the parent view`, with the `estimated` request size.
  - The estimate covers what the writer is sent: its system prompt and the
    delta rendered as model messages. Tool metadata (such as a code-mode
    tool's nested trace) and reasoning provider metadata stay in the stored
    parts but never reach the writer, so they are not counted. The writer's
    request is therefore built before the decision; when it does not fit, the
    parent's view is captured as well.
  - Without `context`, or with a delta that fits, `fork: false` is unchanged.
  - When the writer runs on its own configured model (FC-047), the delta is
    checked against that model's usable window instead; the fork still runs on
    the parent's model.
- Motivation: the delta has no other bound. With no checkpoint yet, or after
  writers kept failing, it grows past the window; every writer then overflows,
  the watermark never advances, and the delta keeps growing. The parent's view
  is what the parent runs with, so it fits. A 2026-11-04 A/B on real models
  (local report) found `fork: false` writers cost 1/4–1/2 of `fork: true` with
  equal or better checkpoints, so the fallback is what lets `fork: false` be
  used safely.
- Upstream relationship: upstream has no fallback for either mode. Fork fix of
  shared code; `dev/compat` inherits it unchanged.
- Watch surfaces: the file above; FC-021's view projection in the same
  function; `estimateWriterRequestTokens`; `MessageV2.toModelMessagesEffect`,
  which decides what a stored part renders to; the `context` passed by
  `packages/cli/src/session/prune.ts`.
- Tests/evidence: `packages/cli/test/session/checkpoint-fork-mode.test.ts`
  "fork:false forks the parent view only when the delta exceeds the usable
  window" (usable 1000 forks with the parent's agent; usable 1000000 keeps the
  writer's own). Dropping the fallback fails the first case. The test's prefix
  capture renders messages with the real `MessageV2.toModelMessagesEffect`.
  "fork:false sizes the delta by the writer's rendered request, not the stored
  parts" fails when the check goes back to the stored parts: on a coordinator
  session with code-mode traces the stored parts were about three times the
  rendered request, which sent writers to an expensive parent-model fork.
- Retirement condition: upstream bounds the no-fork writer's delta.
### FC-044 — the checkpoint writer returns only `.output` from exec calls

- Status: active
- Canonical owner: fork `main` — `checkpointWriterExecReturn`, placed after the
  tool contract in `composeWriterPrompt` (`packages/cli/src/session/checkpoint.ts`)
- Observable contract:
  - The writer task tells a writer that calls its tools through `exec` (the
    Codex harness, where `apply_patch` replaces edit/write) to return each
    result's `.output`, not the whole result.
  - Patch application is unchanged: the tool writes the file inside the call;
    the `exec` return value is only what reaches the model. A patch that does
    not apply still throws, so the `exec` reports `code_error`.
- Motivation: a returned `apply_patch` result carries `metadata.diff` and
  `files[].patch` — since upstream `eb8ee1cd` the untrimmed full diff. In one
  coordinator session 97% of the writers' exec output (≈405K characters over 16
  writers) was these echoes, re-read on every later writer step.
- Upstream relationship: upstream's writer prompt has no such instruction.
  Fork addition; `dev/compat` inherits it.
- Watch surfaces: `composeWriterPrompt`; `tool/tool-script.ts` return
  serialization; `tool/apply_patch.ts` result shape.
- Tests/evidence: `packages/cli/test/session/checkpoint-child-session.test.ts`
  (the writer task carries the instruction; fails without it);
  `packages/cli/test/tool/exec-apply-patch-output.test.ts` (`testEffect`, the
  registry's real `apply_patch` through `exec`: the patch applies and returns the
  summary without `@@`, the full result does carry the diff, and a patch that
  does not apply fails the `exec` and leaves the file unchanged).
- Retirement condition: `exec` stops serializing nested tool metadata into the
  return value, or the writer stops calling tools through `exec`.

### FC-045 — an over-budget checkpoint is trimmed once, to a target below the budget

- Status: active
- Canonical owner: fork `main` — `EXTRACTION_TARGET_RATIO` and the targets in
  `buildExtractionReflection` (`packages/cli/src/session/checkpoint-retry.ts`);
  `tokens`/`budget` on budget violations (`packages/cli/src/session/checkpoint-validator.ts`)
- Observable contract:
  - The `EXTRACTION REQUIRED` re-prompt lists, for every over-budget file and
    section, its size, a target of 85% of the budget and the amount to move
    (tokens and about 4 characters per token), and asks for one pass to that
    target rather than to just under the budget.
  - Validation is unchanged: a file passes at its budget, as before. Only the
    prompt aims lower, so no new re-prompt is introduced.
  - A violation without measured sizes keeps the previous prompt.
- Motivation: from 2026-11-01 to 2026-11-05, 146 of 345 writers were re-prompted
  to extract; 47 needed two or three rounds. The median overshoot was 113
  tokens, each round removed a median of 167 tokens, and the file was left a
  median of 53 tokens over after a round — writers trimmed to the line, so the
  next round or the next writer went over again. Steps after the first
  extraction prompt cost 8% of all writer spend, and the prompts carried 4.5M
  characters of file text.
- Upstream relationship: upstream's prompt names the overshoot only. Fork
  addition; `dev/compat` inherits it.
- Watch surfaces: the files above; `plugin/checkpoint-splitover.ts` (the
  re-prompt loop); `CHECKPOINT_SECTION_BUDGETS`/`MEMORY_SECTION_BUDGETS`.
- Tests/evidence: `packages/cli/test/session/checkpoint-retry.test.ts`
  "buildExtractionReflection targets (FC-045)" (targets for a file and a
  section from real validators; the plain prompt for a violation without
  sizes). Setting the ratio to 1, dropping the targets, or not carrying the
  sizes on either violation kind fails it.
- Retirement condition: upstream aims extraction below the budget, or the
  writer stops being re-prompted for budget overruns.

### FC-046 — a rebuilt context does not start a writer until it has grown

- Status: active
- Canonical owner: fork `main` checkpoint ladder in
  `packages/cli/src/session/prune.ts` (`fireCheckpoints`, `reachedTokens`)
- Observable contract:
  - The first time the ladder is evaluated after a rebuild or compaction
    boundary — in the process that rebuilt, after `resetThresholds`, or in a
    restarted process — every threshold below the baseline plus one ladder step
    counts as crossed. The baseline is the context size of the main lane's first
    finished step after the boundary. Until that step exists the ladder is not
    initialized at all — the tokens passed in can be the compaction summary's —
    and the next evaluation starts over. The step is the ladder's last spacing,
    the same step the final-threshold recovery gate uses.
  - A compaction summary is not a step of the lane: its usage is the
    summarization request over the old history. The walk skips it, both for
    the baseline and for FC-028's reached size.
  - The final threshold is never skipped, so a rebuilt context already past it
    starts a writer at once.
  - Sessions without a boundary, and thresholds a succeeded writer covers
    (FC-028), behave as before.
- Motivation: a rebuild loads the checkpoint, the verbatim tail after its
  watermark and the system prompt, so the rebuilt context starts part full. With
  the `30%/55%/75%` ladder on a 272K window it started at 58K–75K, and the 30%
  threshold (73K) fired a few steps later. In one 12-hour window a session
  rebuilt 20 times and ran 58 writers; 20 started before the context had grown
  by 15% of the window since the rebuild, about 30% of that session's writer spend.
  The next writer covers that tail anyway, because the checkpoint still ends at
  the old watermark. On a 400K window a 144K rebuilt context would cross the
  first threshold (108K) on its first step.
- Upstream relationship: upstream re-arms the whole ladder on a rebuild. Fork
  fix of shared code; `dev/compat` inherits it unchanged.
- Watch surfaces: `fireCheckpoints`, `reachedTokens` and `resetThresholds` in
  `prune.ts`; `isBoundaryUser` in `packages/cli/src/session/tail-digest.ts`;
  `lastSucceededWriterStart` in `packages/cli/src/session/checkpoint.ts` (the
  walk only runs when a writer has succeeded).
- Tests/evidence: `packages/cli/test/session/prune.test.ts`
  "SessionPrune.fireCheckpoints after a process restart": "after a rebuild,
  thresholds within one step of the rebuilt context do not fire", "after a
  rebuild, the final threshold is never skipped", "after a restart, the baseline
  is the first step after the rebuild, not the current one", "a rebuild in the
  running process skips the thresholds near the rebuilt context", "after a
  compaction, the summary's usage is not the baseline", "before the first step
  after a compaction, the ladder waits instead of measuring the summary",
  "without a rebuild, the first threshold of a new session still fires", and the
  updated
  "a rebuild after the last writer arms the whole ladder again". Disabling the
  skip, measuring from the current size, letting the final threshold be
  skipped, counting the compaction summary, or falling back to the passed-in
  size before the first step each fails a case.
- Retirement condition: upstream measures the ladder from the rebuilt context.

### FC-047 — a no-fork checkpoint writer can run on its own configured model

- Status: active
- Canonical owner: fork `main` — `ownModel`/`writerModel` in
  `tryStartCheckpointWriter` (`packages/cli/src/session/checkpoint.ts`); the
  late-bound resolver in `packages/cli/src/session/agent-model-ref.ts`,
  registered by `SessionPrompt.layer` (`resolveAgentModel` in
  `packages/cli/src/session/prompt.ts`)
- Observable contract:
  - With `checkpoint.fork: false`, a model configured as
    `agent."checkpoint-writer".model` (a literal `provider/model` or a
    model-group name) is the writer's model: its system prompt and tools are
    built for that model, and the actor is spawned on it. The log line is
    `checkpoint writer runs on its configured model`.
  - The FC-036 delta check sizes the writer's rendered request against that
    model's usable window. When it does not fit, the writer forks the parent's
    view on the parent's model, as before. A window of 0 (the model publishes no limit) bounds nothing, as in
    `isOverflow`.
  - With `checkpoint.fork: true`, without a configured writer model, or when it
    does not resolve (logged as `agent model resolution failed`), the writer runs
    on the parent's model as before.
- Motivation: the writer always ran on the parent's model, because the parent
  model passed to the spawn wins over the agent's configured one. A no-fork
  writer reads no parent prefix, so it gains nothing from sharing the parent's
  model and cache. On a session with an expensive coordinator model, writers
  were about a third of the session's spend (58 writers in 12 hours). This lets
  a cheaper model be measured and chosen for the writer alone.
- Upstream relationship: upstream spawns the writer on the parent's model. Fork
  addition; `dev/compat` inherits it.
- Watch surfaces: `tryStartCheckpointWriter` and the no-fork `buildPrefix` call
  in `checkpoint.ts`; scoped bindings for `prefixCaptureRef` and `agentModelRef` in
  `SessionPrompt.layer`; `Agent` config merge of `model`/`modelRef`;
  `Provider.resolveModelRef`.
- Tests/evidence: `packages/cli/test/session/checkpoint-fork-mode.test.ts`
  "fork:false runs the writer on its configured model", "fork:false checks the
  delta against the configured model's window and forks the parent view on the
  parent's model", "fork:false sizes the delta by the writer's rendered request,
  not the stored parts", "fork:false treats a writer model with an unknown window as
  unbounded", "fork:true keeps the parent's model even when the writer names
  one" and "fork:false without a configured writer model keeps the parent's
  model"; `packages/cli/test/session/agent-model-ref.test.ts` runs the
  real resolver through `AppLayer` (literal model, model group, none,
  unresolvable). Always using the parent's model, checking against the parent's
  window, treating an unknown window as 0, dropping group resolution, or letting
  a resolution failure escape each fails a case.
- Retirement condition: upstream lets the writer run on its own configured
  model.

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
  harnesses retain the fixed search/use entries across catalog changes, and
  search always sees the live authorized catalog while changed-catalog
  announcements wait for the next user-turn boundary.
  Startup connects servers in a background fiber (upstream `2f373289`;
  `MCP.tools()` waits at most three seconds). Claude imports without an explicit
  `auto_connect: true`, and entries with `auto_connect: false`, are never
  attempted at startup, and upstream's settlement cleanup skips their `pending`
  placeholders so that status survives. `MCP.readiness()` reads current status
  and tool definitions without awaiting settlement or starting a connection;
  the prompt intersects readiness tools with the request-authorized catalog,
  reports the latest outcomes at user boundaries, and never turns readiness into
  invocation authority. Readiness `directTools` (upstream `c538fab3`) come from
  the same request-authorized set that exposes them top-level.
  `announcedMcpReminders` validates replayed historical reminder metadata field
  by field (`toolNames`, `directToolNames`): a malformed value is skipped
  without erasing an earlier valid state, instead of throwing in
  `mcpReminderMarker` or corrupting the removal list. Every array field upstream
  adds to that metadata needs the same check.
  Local and remote MCP config accept optional `alwaysDirectTools`: sanitized
  server-local names select top-level tools outside deferred search/use (FD-006
  owns their execution authority), and config arrays use the mutable schema
  convention so ACP accepts the regenerated SDK types. Server requests are
  associated with the originating call (upstream `81a37ab5`); the shared
  `executeMcp` wrapper (FD-006) supplies the `messageID` and elicitation
  recorder. MCP, LSP, formatter and Claude-import configuration use ordinary
  configuration sources again (upstream `bfd5a2f4` reversed the 2026-10-31
  execution-source filter); `MIMOCODE_ONLY_CONFIG_DIR_PLUGINS` is a plugin-only
  boundary, and `mergeClaudeMcp` keeps the fork's control-overrides argument.
  The models-only reload behind provider refresh skips Claude MCP import, so
  MCP configuration changes still require a restart.
- POLICY-01 carrier review: request-pinned MCP membership remains unchanged;
  same-named MCP tools cannot acquire canonical Actor/plan control identity or
  its commit callback. Imported-server and transport policies are unchanged.
- Upstream relationship: adapts released automatic connection through explicit
  per-entry configuration; retains fork validation and lifecycle hardening.
  Upstream has no `auto_connect`; the 2026-06-24 upstream PR for pending Claude
  imports (#1269) was withdrawn. Usage and source precedence:
  [Claude MCP auto-connect](claude-mcp-autoconnect.md).
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
  at the reviewed main behavior. `test/mcp/real-transport-oauth.test.ts` runs
  the actual MCP SDK HTTP transport and a self-owned OAuth issuer in an isolated
  non-test child (discovery, DCR, S256 PKCE, callback, refresh, cancellation;
  lab evidence, not enterprise IdP interoperability, see the
  [runtime evidence](runtime-validation-2026-09-15.md)).
  `test/tool/mcp-tool-search.test.ts` covers malformed historical reminder
  metadata and always-direct status; `test/mcp/elicitation.test.ts` and
  `test/mcp/elicitation-form.test.ts` cover call association;
  `test/config/config.test.ts` covers project sources and the pending Claude
  import, with real Node plugin-host tests.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
- Retirement condition: upstream matches URL validation, explicit import auto-connect and pending-import
  lifecycle, request isolation, and frozen membership; model identity and tool
  authority still satisfy FD-005 and FD-006.

## FC-005 — permission-consistent skill discovery and invocation

- Status: active
- Canonical owner: fork `main` skill/session runtime
- Observable contract: catalog visibility, skill search and loading use
  `canLoadSkills`/`canSearchSkills`, effective `Agent.runtimePermission`, agent
  tool allowlists and the owning user's tool toggles. A disabled surface cannot
  be restored by a rescan. The catalog is announced only before a user turn's
  first assistant step. Each context window receives one full entry followed
  by deltas for added, changed and removed skills; unchanged states emit
  nothing. Full-context writers inherit announced metadata without a second
  entry; compaction starts a new announcement window. A delta counts as
  announced only on top of an entry in the same window, so a user turn that
  overflow compaction replays with only its delta gets a full entry again
  rather than leaving unchanged skills invisible. Loaded skill bodies stay
  in existing messages/tool results.
  Discovery refreshes at user-turn boundaries, command lookup/listing, the
  skill route and tool misses. Stat-keyed parsing reuses unchanged files.
  Command listing does not wait for MCP servers; once background collection
  adds MCP prompt commands, `command.updated` is published and the TUI
  refetches its cached list, so late prompts reach slash completion; a
  response that resolves after a directory or workspace switch is dropped.
  Builtin extraction remains a scoped producer that caller cancellation cannot
  poison; reload invalidates its generation and always rebuilds the snapshot,
  even when every file keeps its path, mtime and size (a parse that failed for
  an unreadable file can succeed after chmod). Interrupted directory scans do
  not publish a partial snapshot and later callers retry.
  Frozen prefixes/profile keys and native tool contracts do not depend on live
  skills. Prefix rotation is upstream's: a tools-hash change rebuilds the
  system from current additions (environment, the structured-output
  instruction in `json_schema` mode, instruction files) and rotates the row.
  StructuredOutput is part of that hash, so the instruction enters and leaves
  a frozen system together with its tool. A cold pin that loses a race keeps
  the winner's system only when the winner froze the same tools, and otherwise
  rotates to its own.
  Rows written by older engines are cleaned once on read
  (`SessionPrefixSnapshot.getFrozen`): upstream's generated block pattern
  removes a system-tail catalog with host-owned copies kept; the engine's
  structured-output instruction is removed, again with host copies kept, when
  the row's own tools lack StructuredOutput (an older JSON-mode cold capture,
  or a schema-3 range carried across tools-only rotations); a system message
  left blank by either removal is dropped; and any schema-3 record is cleared,
  including one whose catalog text was empty. Every other frozen byte stays.
  Historical v2 and recognized generated
  user catalogs are suppressed in projection; stored history is never
  rewritten, quotations and loaded `<skill_content>` survive. Legacy catalog
  recognition goes through `isLegacySkillCatalogPart` and
  `isGeneratedSkillCatalog`, which match the proven historical format rather
  than a substring; upstream's `isSkillCatalogReminder` ships without a caller.
  Discovery is live and catalogs are persisted user-turn reminders (upstream
  `128adcb7`, adopted 2026-11-21); system-tail generation and schema-3 catalog
  freezing are retired, while the shipped
  `20260908000000_session_prefix_skill_catalog` migration, its column and type
  remain as historical readers ([historical layout and migration](skill-catalog-system-tail.md)).
- Upstream relationship: adopts live scan, reminder/delta placement, prefix
  rotation and structured-output placement; retains stronger shared
  authorization, producer lifetime and historical recognition, and adds the
  read-time cleanup of fork-written rows. Deviates from upstream's replay rule,
  which accepts any reminder metadata as announced state, by requiring an
  entry in the window before a delta counts, from upstream's snapshot reuse
  by rebuilding on an explicit reload, and by announcing late MCP prompt
  commands to clients that cached the listing. The old system-tail POLICY-04
  selection, including its frozen-system-across-rotation rule from
  `8ed2c580`, is historical, superseded by this synchronization.
- Watch surfaces: `packages/cli/src/skill/index.ts`,
  `packages/cli/src/skill/search-access.ts`,
  `packages/cli/src/session/skill-catalog.ts`,
  `packages/cli/src/session/skill-reminder.ts`,
  `packages/cli/src/session/message-v2.ts`,
  `packages/cli/src/session/prefix-snapshot.ts`,
  `packages/cli/src/session/llm-request-prefix.ts`,
  `packages/cli/src/session/session.sql.ts`,
  `packages/cli/migration/20260908000000_session_prefix_skill_catalog/migration.sql`,
  `packages/cli/src/session/prompt.ts`, `packages/cli/src/session/system.ts`,
  `packages/cli/src/session/compaction.ts`, `packages/cli/src/session/tail-digest.ts`,
  `packages/cli/src/command/index.ts`,
  `packages/cli/src/cli/cmd/tui/context/sync.tsx`, `packages/cli/src/tool/skill.ts`,
  `packages/cli/src/tool/skill-search.ts` and
  `packages/cli/src/session/observed-tool-parts.ts`.
- Tests/evidence: per-file counts and baseline reproductions are recorded in
  [2026-11-21 validation](upstream-sync-2026-11-21.md). Skill/tool/system suites
  guard authorization parity; `prompt-skill-command-multi.test.ts` covers
  entry/delta, turn timing, legacy/schema-3 retirement and full-context writers.
  `skill-catalog.test.ts` and `message-v2.test.ts` cover historical
  recognition; `prefix-snapshot.test.ts` ("retires legacy catalogs and unbacked
  format instructions on read") covers the read-time cleanup of fork-written
  layouts. `skill-catalog-frozen-refresh.test.ts` covers skill changes that
  leave the prefix alone, a tools rotation that rebuilds it, and the
  structured-output instruction entering and leaving with its tool;
  `codex-compact.test.ts` "warm snapshots follow structured schema and text
  format changes" checks the same on the Codex wire. The capture, reopen and
  system-tail suites test the reminder architecture while keeping native tool,
  cold-capture race, restart and no-tool compaction assertions.
  `test/skill/skill.test.ts` "reload recovers a SKILL.md that became readable
  without changing", `test/command/command-live.test.ts` "announces MCP prompt
  commands that arrive after the listing" and `test/cli/tui/command-refresh.test.tsx`
  cover the reload and late-command deviations.
  `test/storage/prefix-skill-catalog-migration.test.ts` exercises the
  unchanged migration against a real old database. Local evidence does not
  establish publication, exact-head CI or compat propagation.
- Review basis: upstream `128adcb782a72ef3d10752ab9c14e4fdcb319099`;
  main behavior `d6604ceef828ef6c9ae30536933517a13b46eb8f` (pull request #263).
- Retirement condition: upstream shares one effective permission/tool decision
  across catalog, search and invocation, equivalent cancellation/retry and
  generation invalidation, and lossless historical migration/projection that
  protects host content, quotations, loaded bodies and frozen native tools.
  FD-006 remains the tool-authority owner.

## FC-006 — instance-local plugin memory-write decision

- Status: active
- Canonical owner: fork `main` plugin service and plugin API
- Observable contract: the subagent progress checker receives
  `memoryWriteEnabled` from the same instance-local configuration service used
  by memory write gates. It does not depend on an HTTP config round trip that
  can reject a valid out-of-cwd worktree; an absent value remains fail-open for
  manual hook calls. `plugin/index.ts` differs from upstream only by this
  `actor.postStop` injection. It sits on upstream's `registerHook` path and
  guarded loops, reads the live configuration, and is not refreshed by
  provider refresh (`Plugin.list({ initialize: false })` reuses initialized
  hooks). Hooks run through upstream's `ToolSettlement`.
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

- Retirement condition: the progress-checker hook no longer writes memory or
  upstream supplies an equivalent instance-local decision without HTTP/cwd
  coupling.

## FC-007 — protected roots, fixed instance cwd, inert SDK event, deletion boundaries, and optional context

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
  throwing accessor used by ordinary runtime paths. Bash keeps `pathsOverlap`,
  `tmpOnlyDelete` and explicit delete approval under upstream's token-budget
  truncation; full output stays archived and `metadata.truncated` prevents
  wrapper re-truncation. The opt-in Auto-Worktree notice retired on
  2026-11-26 with upstream `71a12699`: a config that still sets `auto_worktree`
  loads with the key dropped, and `auto_worktree_hint_sent` is an inert column.
  Instance generations: `InstanceState`'s cache is keyed by generation. Upstream's
  `Deferred` initialization in the entry's scope is adapted onto it: the lookup
  resolves its context by generation and provides `InstanceRef` and
  `WorkspaceRef` explicitly, and a disposed generation refuses new entries.
  Disposal can interrupt a Bus still initializing, so the detached
  `Bus.publish` helper treats an interrupt-only exit as a no-op. An `expected`
  owner for `Instance.provide` that is closing, absent or not the cached context
  is rejected by identity. CronBridge mounts belong to the InstanceState
  generation that started them: disposal stops that owner's exact handle, an old
  generation cannot stop a replacement, and ownership is registered outside the
  lifecycle lock and rechecked immediately before a mount is published. The
  capability API's directory and token policy is FD-004's.
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
  `test/tool/bash-delete-permission.test.ts` and
  `test/permission/auto-approve-delete.test.ts` under `packages/cli` cover
  the deny-first deletion path, dangerous-startup grant, and single deletion
  confirmation; run lifecycle evidence belongs to FC-001/FD-001.
  `test/effect/instance-state.test.ts` covers the generation-keyed cache,
  `test/inbox/drain-crash-reopen.test.ts` the interrupt-only Bus exit, the cron
  bridge integration suite real disposal/reopen, in-flight start/dispose and
  replacement ownership, and `test/config/config.test.ts` the dropped
  `auto_worktree` key.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0353965ea38ce3d963f123acb2f9a965bcbb98c3`.
- Retirement condition: upstream retains fixed instance cwd and supplies
  equivalent inert compatibility schema, protected-root, project/worktree
  containment, fixed-cwd relative file-tool resolution, MultiEdit normalization,
  deletion, and optional-context semantics without forbidding legitimate
  temporary projects.

## FC-008 — bounded workflow cleanup and targeted CI quarantine

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
  retains its instance-scoped services. Config refresh retains an instance
  while its main or Actor execution is live, and isolated workflow worktree
  removal waits for `server.instance.disposed` from the owning instance before
  deleting the directory; after one hour it releases the listener and reports a
  cleanup failure. Reclaim logs a worktree-removal defect and still persists
  and publishes the original outcome; pure interruption propagates.
  Default-path validation, including
  upstream-sync regressions, clears ambient `MIMOCODE_EXPERIMENTAL`,
  `MIMOCODE_MCP_TOOL_SEARCH` (which replaced
  `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH` on 2026-10-13), and
  `MIMOCODE_CODEX_MODE`.
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
  worktree cases and the HTTP actor recovery and subagent-resume suites in
  normal shards except resume negatives, and runs resume negatives and the real stdio observer suite in separate processes,
  because it requires the real transport despite process-global mocks. No case
  is skipped by this isolation. Each shard and dedicated job removes its prior report and
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
- CI layout: shards keep the stable path hash. Re-measured on 2026-11-26,
  upstream's duration-weighted split would save about 84 s of wall-clock per run
  and no runner minutes, while moving files between shards whenever a test file
  is added; `script/test-shard.ts` ships unused and `test/script/test-shard.test.ts`
  covers only that tool. Revisit if a shard approaches its 12-minute budget.
  Dedicated discovery-checked, JUnit-verified jobs run `subagent-resume-negatives`
  and `test/bus/bus-integration.test.ts` (both trigger upstream's shared
  log-queue stall: on Linux the bus suite's busy-SSE disposal loses a log write
  callback, slowing every later test and starving `lsp/client`'s `Log.init`),
  `provider-refresh` (`refresh`, `refresh-boundaries` and the fork's
  `refresh-harness`, each in its own process, since a refresh needs process-wide
  instance idleness), the real stdio observer, and `release-script`
  (`script/release.test.ts` and `script/build-provenance.test.ts`); discovery
  requires each of these files. The Windows job runs only on pushes to
  `dev/compat` and on dispatch with `windows_runtime` (kept beside upstream's
  `workflow_call`), never for a pull request. It also runs
  `test/installation/launcher.test.ts` with a 120-second cap, records the event
  and checkout SHAs, uploads bounded evidence, and fails when its entry is
  missing; a skipped main-side Windows job is not a platform result, and
  DC-PLATFORM-001 owns the compat entry. Bun follows the package declaration and
  dependencies install with `bun ci` through `.github/actions/setup-bun`, which
  also exposes npm's bundled `node-gyp` on a job-temporary PATH for native
  install scripts. The locked `@npmcli/agent@4.0.2` patch is tested on actual
  proxy transport. The root `bunfig.toml` is upstream's: a bare root `bun test`
  covers only `script/` with isolated HOME/XDG and database and refuses
  `packages/**` paths. Root `bun run test` delegates to `packages/cli`, and root
  `script/generate.ts` rebuilds the SDK without formatting the repository; the
  OpenAPI tests check the runtime and generated documents.
- Test harness: the preload roots the process-wide data directory
  (`mimocode-test-data-<pid>`, holding the XDG directories and HOME) under the
  resolved `os.tmpdir()` and points `os.homedir()` at that home, because Bun
  caches `os.homedir()` at startup; a named `import { homedir }` keeps the
  original binding (only `cron/loop-file.ts` uses one). Default fixture projects
  sit under the resolved `/var/tmp` on POSIX (then home, the git-free parent of
  cwd and temp as fallbacks; Windows keeps the fallbacks), so nothing
  discoverable lies above a non-git fixture and the fixture stays outside the
  temp tree that Bash's temp-only deletion exemption covers. `outsideGit`
  fixtures sit under a per-process `/tmp` root. Every root is `<prefix><pid>`:
  startup reclaims roots of dead processes (never a live or EPERM PID) and
  removes a root already named for a reused current PID or stops the run, and
  afterAll removes the roots synchronously before any timer await; only a
  failure there (Windows EBUSY) takes the GC-and-retry path. Tests do not write
  into the checkout: when `process.cwd()/.mimocode` is absent the preload
  creates it, records the created directory's identity in a temp marker, and
  removes it at the end of the run (or reclaims a killed run's) only while it
  holds nothing beyond runtime artifacts and no live test process or cron-lock
  owner may still use it. Tool tests use git fixtures, and server route tests
  name their fixture directory on every request, with those fixtures under
  `root: "cwd"`. `test/lib/effect.ts` reports the first bounded log flush that
  misses its 1-second budget in each process as a GitHub `::warning::`.
  Fixtures that hold an HTTP reply pending release it during cleanup before
  awaiting the scripted server stop, because client abort does not cancel a
  fetch-handler Promise; progress-reconcile fixtures use generated unique
  session IDs. Tests that assert notification routing observe the published
  event rather than polling rows the system consumes.
- POLICY-01 Question lifecycle: registration, Asked publication and answer
  waiting share one resource lifetime. Abort, interruption, publication failure
  and instance disposal remove only a still-owned pending question and publish
  its existing Rejected terminal once; replied/rejected questions are not
  rejected again. Registration refuses a closed instance generation. Cleanup
  uses a publisher captured from that generation, reaching typed and wildcard
  subscribers without recreating the disposed instance or clearing a new
  generation's question. Ordinary late Bus publication still rejects disposal.
  `Question.ask` takes `abortSignal` in its input (upstream `002cb4c9`); an
  abort dismisses and then awaits the request, so a reply already in flight
  wins. `reply` stays uninterruptible and publishes `Replied` through the
  captured publisher before completing the waiter, which receives the whole
  `Replied` payload (answers plus `source`, `reason` and any structured
  `elicitation`, upstream `81a37ab5`); `ask` still resolves with the answers.
  The detached `Bus.publish` helper ignores an interrupt-only exit from
  instance disposal (FC-007).
  Watch `packages/cli/src/{question,bus}/index.ts` and
  `packages/cli/src/tool/question.ts`;
  `test/question/lifecycle.test.ts`, `test/question/question.test.ts`,
  `test/tool/plan.test.ts`, real `test/cli/tui/question-lifecycle.test.tsx`
  and two `test/mcp/elicitation.test.ts` cases (payload fields) cover these
  consumers.
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
- Tests/evidence: hard-timeout, runner, workflow runtime/worktree suites,
  `test/project/instance-dispose.test.ts`, `test/fixture/fixture-root.test.ts`
  (isolated `os.homedir()`, nothing discoverable above a fixture), four
  complete local hash shards, positive/negative JUnit verifier fixtures, and
  exact-SHA CI for the reviewed behavior tree when published; local tests do not
  substitute for that remote evidence.
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
- Retirement condition: runtime bounds may retire only with equivalent upstream
  settlement. Restoring a quarantined test requires effective assertions and
  bounded exact-SHA CI settlement; the workflow case's restored execution alone
  does not close the 2026-09-15 Linux workflow-deadline timeout follow-up,
  recorded in the history.

## FC-009 — synthetic-message provenance and text-part adaptation

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
- Carried provenance rules: persisted synthetic reminders dedupe through
  validated `metadata.reminder = { key, rev }` in
  `ensurePersistedUserSynthetic`; only non-ignored synthetic text counts, equal
  key and revision dedupe regardless of wording, and there is no text-only
  shim, so an old untagged memory reminder may repeat once and loop streak may
  repeat if detection fires again on the same user. `TextPartInput.metadata`
  carries client tags without a public schema change. Compose and loop-streak
  reminders persist with stable IDs, and hydration restores Compose protocol
  priority (`promoteComposeProtocolFirst`). Machine provenance joins hook
  provenance as an explicit union; internal GitHub, command and inbox source
  labels stay non-user. Optional uncommitted hints persist `source: "hook"` with
  the inherited task and model variant under atomic latest-user and token
  checks, and their worker owns no earlier run-approval scope. Inbox acceptance
  persists complete synthetic agent input and provenance with its receipt;
  import, export, sync and fork preserve referenced message identity and queue
  visibility without cloning runnable receipts into a fork. Mid-turn direct
  user text is sent verbatim rather than wrapped against a moving last-finished
  assistant, keeping byte identity around signed thinking. A dropped pure-empty
  step resets by removing its parts (upstream `a7440d13`, no `message.removed`
  for a turn that still delivers), while reasoning-only output keeps the run
  loop's scoped continuation; pure-empty tool-free replay uses the scoped retry
  policy. Tool execution boundaries (`ToolPart.execution`,
  `ToolStateError.inputComplete`, transactional `Session.mutateToolPart`,
  upstream `002cb4c9`) are adopted with the side-effect replay boundary
  unchanged: completed tools still merge running metadata and failed tools
  keep the record guard. The model-visible session error carries a
  NamedError's `data.message` (`session/trajectory.ts`), not its whole payload.
- User image attachments: a closed `<system-reminder>` appended after the user
  parts (upstream `6ad6bbb4`) lists each image with the local path from an
  absolute `source.path` or a `file:` URL, never a fabricated Read result, and
  the fork tags it with `metadata.userImageAttachment`. On read, `orderUserParts`
  (`session/message-v2.ts`) moves only a legacy envelope (tagged text ending in
  `## My request:`, persisted 2026-09-17 to 2026-11-26) ahead of the user body;
  moving the current reminder would make a reloaded prompt differ from the
  first send. An attachment-only all-synthetic prompt keeps the caller `system`
  on the persisted user (`prompt.system ?? input.system`) while still skipping
  the `resolvePrompt` fallback. Overflow replay copies media `file` parts
  verbatim under FC-001's `commitUserMessageIfLatest`, keeping `source: "hook"`
  and `task_id`. Responses tool images stay tied to their tool call, using the
  actual adapter provider and shared image limits.
- Automatic titles use persisted genuine user text, the configured lite model
  then the exact source model, and an isolated StructuredOutput request;
  attachment-only input keeps a filename fallback and image bytes never enter
  it. Ephemeral generation bypasses mutable chat parameter and header hooks and
  rejects workflow connectors.
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
- Tests/evidence: `test/session/image-envelope-read-order.test.ts` (fails if
  the legacy guard or the reorder is removed), the persisted read-back,
  envelope and attachment-only-system cases of `test/session/prompt.test.ts`,
  the keeps-replayed-media case of `test/session/prompt-effect.test.ts`,
  `test/session/tool-gate-cancel.test.ts`, `test/history/import.test.ts`,
  the pure-empty identity case of `invalid-output-continuation.test.ts`, the
  `sessionErrorText` regression, and
  `packages/cli/test/session/processor-effect.test.ts`,
  `packages/cli/test/session/main-runloop-history-invariant.test.ts`,
  `packages/cli/test/session/trajectory.test.ts`, prompt regressions, and
  generated SDK/OpenAPI `source` fields at the reviewed main behavior. Processor
  characterizations cover both an in-band retryable 503 and a raw stream fault
  after one completed tool side effect without a second model/tool execution,
  plus retry isolation for ephemeral title requests.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
- Retirement condition: the legacy image-envelope reorder retires on its own
  once rows persisted before 2026-11-26 no longer need their original order.
  Otherwise: upstream provides equivalent provenance and complete
  hook/retry text-part lifecycle, no-side-effect-replay behavior, and local-only
  retry publication for ephemeral or non-main requests, and regenerated
  artifacts preserve the same source discriminator.

## FC-010 — WebFetch and SSRF destination classification, authorization, and resource bounds

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
- DNS classification resolves every record (`lookup` with `all: true`) rather
  than trusting the first answer: a hostname answering with a public and a
  private address fails closed, and an empty answer fails closed as a
  resolution failure. Upstream still checks the first answer only. The check
  races the request's own resolution, so it stays defense-in-depth;
  `test/util/ssrf.test.ts` covers the mixed and empty answers.
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
  carries repository-specific branch or CI reminders; PDF CJK guidance uses
  project-controlled fonts, explicit TTC face indexes, and language-matched runtime-supported CID
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
  documentation improvements. Most upstream content changes (Compose Next
  presentation and markers, search and MCP setup wording, the `claude-code`,
  `codex` and `grok-build` load-on-authorization descriptions, Claude import
  configuration, the unified default prompt) are adopted unchanged; vendor
  prompt templates, including MiniMax, retired on 2026-11-13. What remains
  fork-owned: the PPTX image-sourcing guidance (adapted from upstream instead of
  shipping unconditional `image_gen`, text-only WebFetch or unchecked curl
  claims), Actor help that distinguishes reusable actors from completed
  ephemeral full-context actors, the factual Task/Actor, fixed-cwd and
  authorized exec guidance, the compaction-row wording in bundled
  `mimocode-docs/reference/config.md`, and the TUI skill i18n keys:
  `skill/localized-alias.ts` reads `tui.skill.<name>.slash`, so upstream's
  `tui.skill.mimocode.*` keys have been dead since `5bf07b7e` renamed the bundle
  to `mimocode-docs`. Compose Next keeps explicit invocation, workspace
  ownership and publication authorization boundaries.
- Watch surfaces: `packages/cli/src/session/prompt/default.txt`,
  `packages/cli/src/tool/actor.ts`,
  `packages/cli/src/tool/actor.txt`,
  `packages/cli/src/skill/builtin/.bundle/mimocode-docs/`,
  `packages/cli/src/skill/builtin/.bundle/compose-next/SKILL.md`,
  GPT prompt text, TUI skill i18n, and
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
  regression, skill-description,
  `packages/cli/test/skill/mimocode-docs.test.ts` at the main runtime/test
  SHA, plus bundled-content review at the separate guidance content SHA.
  `packages/cli/test/skill/builtin.test.ts`
  binds the shipped PPTX guidance to the available-tool and WebFetch facts,
  beside upstream's own cases.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0353965ea38ce3d963f123acb2f9a965bcbb98c3`.
- Retirement condition: the corresponding prompts/content cease to ship or
  upstream guidance is factually equivalent for fork branch names, keys,
  runtime support, and user-facing errors.

## FC-012 — fork publication, contribution, and security routing

- Status: active process contract
- Canonical owner: fork repository governance
- Observable contract: pushes and pull requests target `onlyfeng/MiMo-Code`,
  never the read-only upstream. Shared work enters `main` before propagation to
  `dev/compat`; compatibility-only work targets `dev/compat`. Fork-only security
  issues are not routed through upstream public disclosure channels, which stay
  separate from upstream's adopted reporting text and workspace-trust warning.
  Releases use upstream's CI stages (`script/release.ts`, run by `release.yml` on
  a pushed tag, with the trusted-publisher `--allow-publish` and the preflight
  stage that checks tarball names and versions and proves an FDS canary write),
  but `GH_REPO` stays required with no default: the `github` stage throws
  before any `gh` call when it is unset, so a fork release can never fall back
  to the read-only upstream (upstream defaults it to `XiaomiMiMo/MiMo-Code`), and
  `release.yml` sets it from `github.repository`. Upstream's npm trusted-publisher
  configuration names upstream's repository and is not authority to publish
  fork work. A tag release builds after typecheck and lint without rerunning
  unit tests, so a fork tag depends on the tagged commit's exact-SHA branch CI;
  a passing preflight is not a rollback transaction. The launcher keeps its
  release URL, checksum, cache and staged-run behavior around upstream's
  `tarCommand()`. The `CLAUDE.md` → `AGENTS.md` symlink, which upstream
  removed, stays so Claude Code sessions load the same conventions.
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
- Retirement condition: fork ownership or publication topology changes through
  an explicit governance decision and every repository-facing route is updated.

## FC-013 — retry budget resolution and MaxMode final-step enforcement

- Current default policy: server and rate-limit live-step recovery now use
  persistent retry without a deadline, matching network and upstream defaults.
  Request, stream, unknown, candidate and judge budgets remain bounded, and
  pure-empty output uses the separate bounded `emptyOutput` budget (8 retries,
  no deadline) rather than the server budget. This
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
  may publish session-global retry status or `RetryAttempt` events; the
  processor's stream retry callback applies that boundary to both. Request-phase
  retries of durable main requests publish `session.status{retry}` through the
  processor's `setRetry` (upstream `002cb4c9`), and the visible attempt
  continues across phases while `phaseAttempt` restarts; subagent and ensemble
  retries stay out of session status, and request retries publish diagnostics
  only for durable main requests. Request and stream retries persist per-actor
  records.
- Retry classification: a complete terminal signal is terminal before any
  capacity heuristic (`retryConstraint(error) === "terminal"` precedes
  `exhausted`/`unavailable`, upstream `8fd65328`), so HTTP 403 membership or
  subscription refusals and HTTP 402 balance refusals make one request and
  settle as an assistant API error; complete HTTP 429, `code`/`type` limitation
  and exact quota-exhausted signals are terminal regardless of provider and
  survive serialization, with host decisions taking precedence. Ordinary 429
  keeps the bounded request budget and the persistent live-step rate-limit
  budget. `InvalidOutputError` is retryable unknown: `SessionRetry.policy` owns a
  genuinely empty attempt only when it is replay-safe, tool-free,
  non-structured and not a length finish, removes that attempt's parts and
  retries without injecting a repair user, and persists the terminal error on
  exhaustion. Reasoning-only output (non-GPT), incomplete checkpoint completion
  and tool or settlement residue keep the fork's bounded, actor-scoped
  continuation with atomic source and task ownership; upstream's global
  reasoning-only-final policy is not adopted. A stream that ends with unified
  `other` and no provider finish reason raises `StreamIncompleteError` (live
  `rawFinish`), which uses bounded stream recovery, not the `emptyOutput`
  budget; historical raw-less `other` messages stay readable by content, and
  MaxMode excludes live incomplete candidates while keeping the raw finish on
  accepted replay. Summary assistants stay with FD-010–FD-012.
- Background system agents (`SYSTEM_SPAWNED_AGENT_TYPES`: checkpoint writer,
  dream, distill) retry within `SYSTEM_AGENT_MAX_RETRIES` (4) and
  `SYSTEM_AGENT_RETRY_DEADLINE_MS` (5 minutes) whatever the configured mode,
  keeping the class's delays. `SessionRetry.boundForSystemAgent` is passed as
  the stream policy's `cap`, applied after the network and persistent-host
  constraints that would otherwise reset a budget to persistent, and also caps
  the request ladder in `llm.ts`. They retry on their own schedule instead (the
  next threshold or pass); a persistent budget once held a writer slot for
  about 21 hours. Upstream's `MIMOCODE_EMPTY_STEP_DROP_LIMIT` (`flag/flag.ts`,
  `942de16e`) has no reader here: the 2026-11-13 synchronization adapted its
  bound into the `emptyOutput` budget and this cap, so `dropEmptyAssistant` and
  its counter are absent and setting the variable does nothing. A sync that
  brings back a reader must decide which bound governs.
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
  `retry.emptyOutput` is an ordinary budget without that count rule: it
  defaults to bounded with 8 retries, `mode: "persistent"` drops the count, and
  `retry.server` settings never reach it.
  Request, max-candidate and max-judge scopes select their
  corresponding retry budgets; these rules are shared policy, not harness
  identity. `docs/architecture/retry-coordinator.md` and retry tests describe
  the same precedence. The jitter precedence and bounded network fallback were
  recorded by the 2026-09-15 code audit without changing their implementation.
- Upstream relationship: adopts persistent network/server/rate-limit defaults
  while retaining bounded request/stream/unknown/candidate/judge budgets and
  fork budget resolution, final-step enforcement and subagent status isolation.
  Upstream routes pure-empty `InvalidOutputError` to the persistent server
  budget; the fork's `emptyOutput` budget (config key, `RetryDecision.emptyOutput`
  flag and `budgetFor` branch) is fork-only and must survive syncs that touch
  `decide` or `budgetFor`. `decide` still reports `kind: "server"` and adds
  `emptyOutput: true`, and `budgetFor` routes it after the scope, host-class,
  network and rate-limit checks, so retry parts, status events and the SDK
  `kind` enum match upstream. Upstream's `useMaxMode` gate still lacks the
  `!isLastStep` term (the 2026-07-23 upstream PR #1871 was withdrawn), so the
  final-step contract stays fork-only. `docs/architecture/retry-coordinator.md`,
  which upstream deleted, is this entry's fork-maintained policy reference.
- Watch surfaces: `packages/cli/src/session/max-mode.ts`,
  `packages/cli/src/session/prompt.ts`,
  `packages/cli/src/session/retry.ts`, `packages/cli/src/config/retry.ts`,
  `packages/cli/src/session/status.ts`, and processor final-step routing.
- Tests/evidence: default budgets, overrides and classification in
  `packages/cli/test/session/retry.test.ts`; system-agent and pure-empty bounds
  end to end in `packages/cli/test/session/invalid-output-continuation.test.ts`;
  the MaxMode final-step regressions in
  `packages/cli/test/session/prompt-effect.test.ts`, step-budget coverage in
  `packages/cli/test/session/max-mode.test.ts`, and candidate/judge
  EConnReset coverage in `packages/cli/test/session/max-mode-econnreset.test.ts`
  at main behavior. Named carriers: `retry.test.ts` "InvalidOutputError retries
  under the bounded emptyOutput budget, not the server budget", "policy gives up
  on endless empty output after the emptyOutput count" and "a system-agent cap
  bounds network and persistent-host retries"; `invalid-output-continuation.test.ts`
  "endless empty output stops at the default bound even under a persistent
  server budget" and the checkpoint-writer bound cases (removing the
  `budgetFor` routing or the cap fails them); `title-first-turn.test.ts`
  TP-REFUSAL-01 and `test/error/host-registry.test.ts` (terminal refusals);
  `processor-effect.test.ts`, `status-retry-map.test.ts` and
  `retry-density-invalid-baseurl.test.ts` (phase-continuous main status); and
  HTTP/SSE fixtures that require main status and events but neither for an
  actor retry.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.
- Retirement condition: MaxMode itself consumes and enforces the final-step
  tool choice, bounded candidate/judge retry, and main-only status publication
  with equivalent regressions. The background system-agent bound and the
  pure-empty `emptyOutput` bound retire separately, each only when upstream
  bounds those retries by default with equivalent regressions; retiring the
  MaxMode part does not retire them.

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
  Compaction is the third `getFrozen` consumer: its projection suppresses
  historical generated catalogs and keeps current reminder metadata, its system
  excludes the retired catalog, and the next context window receives an entry
  reminder. Overflow replay copies every non-`compaction` part verbatim,
  including media (FC-009), while the summarization request itself strips media
  under overflow. Rows already marked `time.compacted` still project the cleared
  placeholder, a config that still sets the removed `compaction.prune` loads
  with one warning, and checkpoint thresholds resolve against `usable()`.
  `/status` labels the ratio gap `headroom`; the buffer setting only validates
  configured budgets.
  Chronological projections: rebuild tails, recovery usage, checkpoint context
  and persisted loop-streak spans resolve actual message positions rather than
  lexical ID ranges. Missing or reversed checkpoint bounds keep live messages
  through context filtering and later tail collapse, and the transient invalid
  range is never written back. TUI buckets use the same `(created, UTF-8 ID)`
  order; undo hydration follows pagination through its exact boundary. Once an
  authoritative update clears revert, each actor bucket returns to its
  100-message limit and evicted cached parts are removed, and ordinary upserts
  also remove the whole excess prefix; an active revert keeps hydrated history.
  Main's footer stays pending when it cannot resolve a local watermark;
  DC-CONTEXT-001 owns compat's extra checkpoint-coverage protocol.
  Concurrent admission: pending external requests are scoped by session and
  actor until their message and parts commit or admission ends. Compaction
  waits for that actor's pending admissions before and after inserting an
  automatic continuation, and a newer committed request removes the exact stale
  continuation and its parts; a failed or interrupted admission releases the
  wait, and another actor's pending request does not block. Snapshot tails use
  message identity and the actual chronological endpoint, not an array length
  shared across views.
- Upstream relationship: adopts upstream's max-context controls and ratio-only
  trigger. The retained fork adaptations concern bounded projection, frozen
  request identity, and no-tool summaries, not extra trigger headroom. Upstream
  `6f83cd0e` removed persisted-part pruning (turn-end prune, `stripNonEssential`,
  `SessionCompaction.prune`, rebuild-time microcompact, pressure levels and
  `MIMOCODE_DISABLE_PRUNE`), and the fork's `observedToolParts` protection
  inside `SessionCompaction.prune` retired with it. Upstream's boundary-model
  summary selection and failed/interrupted cleanup are adopted; compat keeps
  active-only frozen tool membership and its tail budget under DC-CONTEXT-001.
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
- Retirement condition: upstream preserves equivalent configuration precedence,
  value grammar, provider caps, zero restoration, ratio triggers, bounded
  frozen-prefix projection, and no-tool summaries, with behavior-focused
  regressions.

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

- Status: active; explicit owner added by the 2026-09-15 code audit for already accepted fixes.
- Canonical owner: fork `main` history projection; inherited unchanged by `dev/compat`.
- Observable contract: SQLite projection keeps JSON escapes until final parsing so NUL-containing strings survive old SQLite. Individual preview fields are selected by a 4,000-byte decoded-value check; the complete projected attachment metadata list is checked against 4,000 bytes of serialized JSON. Both decisions occur in SQLite before crossing the driver boundary. Escaping and multiple fields add JSON bytes: this is not a 4,000-byte bound on a field's serialized representation, the whole driver row, SQLite's internal materialization cost or complete `history get` results. Inline data URLs are omitted from previews, while original attachment positions/locators and raw stored data remain unchanged.
- An oversized attachment list produces a structural omission notice, never a fabricated `tool:0` attachment. A real attachment whose MIME equals the notice text remains an attachment because its URL key distinguishes the shape, including a null URL after data removal.
- Legacy retry rows: `normalizeRetryPart` (`session/retry-record.ts`) maps a historical error-based `retry` part without a string `message` to the strict public `RetryPart`: the joined error message and response body, `phase: "stream"`, `scope: "live-step"`, `kind: "unknown"`, attempt 0 when absent, and `next`/`time.updated` at the created time. It runs at every read boundary: part hydration (`message-v2.ts`, `session.ts`), sync replay before storage and publication (`projectors.ts`), session import and export, and history extraction. Current-shape and unrecognized values pass through unchanged; the public schema is not widened and shipped SQL is not edited. Export then redacts the normalized message like any other retry part.
- Upstream relationship: adopts uniform indexing, transactional import and resumable one-time migration; retains NUL-fidelity and SQL-preview/locator corrections. Startup after completed migration does not promise repair of later missed asynchronous index writes. Upstream ships the strict durable `RetryPart` schema with no legacy-row normalization or migration.
- Watch surfaces: `packages/cli/src/history/projection.ts`, `packages/cli/src/history/media.ts`, `packages/cli/src/history/service.ts`, `packages/cli/src/history/import.ts` and `packages/cli/src/history/extract.ts`; for legacy retry reads, `packages/cli/src/session/retry-record.ts`, `packages/cli/src/session/message-v2.ts`, `packages/cli/src/session/session.ts`, `packages/cli/src/session/projectors.ts`, `packages/cli/src/cli/cmd/import.ts` and `packages/cli/src/cli/cmd/export.ts`. Read actual producers/callers when upstream reorganizes these paths. The fork-different production files are `projection.ts`, `media.ts` and `extract.ts` under `history/`, plus every listed retry-read file; `retry-record.ts` exists only in the fork.
- Tests/evidence: `packages/cli/test/history/` NUL/projection/media/attachment-around tests and the C05 record in [selected synchronization](upstream-sync-2026-09-15-5198ff54.md). The accepted final history run has 68 passes, five upstream benchmark skips, and 625 assertions; this audit does not rerun or relabel that evidence. Legacy retry reads: `packages/cli/test/session/retry-record-chronology.test.ts` covers the strict public schema, search/export/re-import of persisted legacy parts, and the normalized replay event/log shape.
- Review basis: upstream `5198ff540efb5ca9fff2baa64555324d43a721b9`, main runtime/test behavior `4eacc84dccf83c22f533c35bea282d4c5a38cacd` (history fixes already present at `64e47eb7695e3ce137ba95a6d1f5b4b381eed58d`).
- Retirement condition: upstream supplies equivalent NUL fidelity, SQL-side field/list budgets and structural locator-safe omission behavior, proven against raw retrieval and real preview formatting. The legacy retry normalization retires separately, once upstream normalizes or migrates error-based retry rows at the same read boundaries.

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

## FC-020 — stringified object and array tool arguments are decoded

- Status: active
- Canonical owner: fork `main` tool-argument decoding, shared by the AI SDK
  tool-call parse in `prompt.ts` and the `Tool.define` wrapper
- Observable contract: one rule, `Tool.safeParseArgs`, validates the arguments
  with the tool's zod schema and returns a valid input as the raw arguments,
  not zod's output. When validation fails, each `invalid_type` issue whose
  `expected` is `object`, `record`, `array` or `tuple`, and whose value at that
  path is a string, is `JSON.parse`d. The parsed value replaces the string only
  when it is a JSON object (for `object`/`record`) or array (for
  `array`/`tuple`). The decoded input is accepted only when the whole input then
  passes the schema; otherwise the original `ZodError` stands. Replacement is
  copy-on-write. A string where the schema wants a string, JSON-looking or not,
  is never touched. Decoding is one pass: a plain `z.union` (`invalid_union`)
  and a JSON string nested inside a decoded value are not decoded. The rule
  applies in two places:
  - Model-facing path: `prompt.ts` registers every `Tool.define` tool with
    `jsonSchema(schema, { validate })` (`decodedInputSchema`). The `validate`
    returns the decoded input when the rule accepts it and the input unchanged
    otherwise; it never fails. The AI SDK takes that value as the tool-call
    input, so the persisted part input sees the decoded input, and so does the
    replay to the model. The same holds for the doom-loop comparison, the
    post-execution checks (gate classification, workflow failure cascade,
    write/edit extension reload) and `execute`. A whole input sent as one JSON
    string is decoded at the root as well. It therefore persists and runs,
    instead of failing the `MessageV2.ToolPart` record check and settling as
    aborted. Invalid input still reaches `Tool.wrap`, which reports it as
    before, and `experimental_repairToolCall` still fires only for JSON-parse
    and unknown-tool errors. A fork turn keeps the frozen schema bytes and takes
    the live `validate`. MCP tools, `StructuredOutput` and schema-only tool sets
    (prefix capture, snapshot restore for compaction) do not carry it.
  - `Tool.wrap` validates through the same rule and passes the decoded input to
    `execute`, so a direct caller, such as a nested `exec` guest call, also runs
    decoded. A nested call's sub-part keeps the guest's value, and FD-006's
    native actor parse in `tool-script.ts` still rejects a stringified actor
    envelope first.
- Motivation: a gz4399 grok model sends cron
  `{"operation":"{\"action\":\"list\"}"}` and repeats the same shape after each
  validation error, so neither `schedule` nor `list` ever runs. The
  schema-side `.meta({ type: "object" })` on the cron/task/actor `operation`
  envelopes does not stop it. Without a `validate` the AI SDK repair hook never
  sees the shape, so the zod parse in `Tool.wrap` was the first validation. A
  first version decoded only there and persisted the model's text. Readers of
  the persisted input then saw the string; for example, the TUI question panel
  iterated the characters of `questions`.
- Upstream relationship: upstream `ee0a93b5` registers tools with
  `jsonSchema(schema)`, and its `Tool.wrap` calls `parameters.parse(args)` and
  executes the raw arguments. Its `ToolCompat.repairToolCall` only remaps keys
  inside the AI SDK repair hook; the repaired input is persisted the same way
  this decoded input is. This is fork hardening of shared code, not a rejected
  upstream decision.
- Watch surfaces: `packages/cli/src/tool/tool.ts` (`safeParseArgs`,
  `parseArgs`, `wrap`, `decodeStringifiedArgs`, `JSON_CONTAINERS`); in
  `packages/cli/src/session/prompt.ts`, `decodedInputSchema`, tool registration
  and the fork-turn rebuild that takes `inputSchema` from the frozen tool; the
  AI SDK's use of a schema's `validate` result as the parsed tool-call input
  (`safeValidateTypes` in `@ai-sdk/provider-utils`); the
  `experimental_repairToolCall` hook in `packages/cli/src/session/llm.ts`;
  `SessionPrefixSnapshot.toolsHash`, which must keep ignoring the
  function-valued `validate`; and the `zod` version, since the `invalid_type`
  code and the `expected` names are zod v4's.
- Tests/evidence: `packages/cli/test/tool/tool-stringified-args.test.ts` (a
  stringified discriminated-union envelope, array, record and tuple, and whole
  input; a JSON-looking string field left alone; a decoded value that fails the
  schema and a non-JSON string both still rejected) and the "stringified
  operation envelope" cases in `packages/cli/test/tool/cron.test.ts` (`list` and
  `schedule`) cover `Tool.wrap`. The prompt loop is covered by
  `packages/cli/test/session/stringified-tool-args.test.ts`, through
  TestLLMServer:
  - control: an object `write` into `.mimocode/skill/` completes, and the
    extension reload surfaces the skill;
  - the same `write` sent as one JSON string completes, persists the decoded
    object and reloads;
  - a cron `operation` sent as JSON text completes with "No scheduled jobs."
    and persists as an object.

  Mutation-checked:
  - restoring upstream's `parse(args)` and `execute(args)` in `Tool.wrap` fails
    exactly the six unit decoding cases (envelope, array, record-and-tuple,
    whole input, cron `list` and `schedule`), each with
    `expected <container>, received string`, while the three negative and four
    existing cron cases pass;
  - removing `record` and `tuple` from `JSON_CONTAINERS` fails only the
    record-and-tuple case;
  - registering tools with plain `jsonSchema(schema)` fails the whole-string
    `write` (part `error`, "Tool execution aborted") and the cron case
    (executed, but the persisted `operation` is the string), while the control
    passes.
- Retirement condition: upstream decodes stringified container arguments where
  the AI SDK parses tool calls, with the same accept-only-when-valid rule, so
  that the persisted input and `execute` agree. The regression cases stay in
  either case.

## FC-022 — cloned loggers keep their own tags

- Status: active
- Canonical owner: fork `main` logger construction in
  `packages/cli/src/util/log.ts`
- Observable contract: `Logger.clone()` returns a private logger with a copy of
  the tags. `tag()` on a clone changes only that clone; the per-service logger
  `Log.create` hands every other caller is never replaced or mutated by a
  clone. `Log.create(tags)` itself is unchanged.
- Motivation: `clone()` called `create({ ...tags })`, and because the tags
  carry `service`, `create` returned the cached per-service logger. Every
  `log.clone().tag(...)` therefore mutated one shared object, so concurrent
  LLM streams and processors wrote each other's `session.id`, `agent` and
  `messageID`. During the FC-021 incident the logs showed the main session
  failing with the writer's request body while the database showed those main
  steps succeeding. `server/proxy.ts` also renamed `Log.Default`'s service to
  `server-proxy` this way, so every default-logger line in the main process
  carried that label; after this fix those lines say `service=default`.
- Upstream relationship: upstream `7bc7dc3a` has the same `clone()`. Fork fix
  of shared code.
- Watch surfaces: `create` and `clone` in `packages/cli/src/util/log.ts`, and
  the clone callers `packages/cli/src/session/llm.ts`,
  `packages/cli/src/session/processor.ts`, `packages/cli/src/lsp/client.ts` and
  `packages/cli/src/server/proxy.ts`.
- Tests/evidence: "cloned loggers keep their own tags" in
  `packages/cli/test/util/log.test.ts` tags two clones of one service logger,
  then checks that each line carries its own `session.id` and that the base
  logger carries none. Restoring `create({ ...tags })` in `clone()` fails it
  with the other clone's tag on the line.
- Retirement condition: upstream's `clone()` stops returning the cached
  per-service logger.

## FC-023 — a turn that names no model keeps the session's variant

- Status: active
- Canonical owner: fork `main` user-message model resolution in
  `packages/cli/src/session/model-selection.ts` and `packages/cli/src/session/prompt.ts` (`continuedVariant`, `createUserMessage`,
  `shell` and `command`)
- Observable contract:
  - A prompt that names no model, for an agent without one, takes the last
    user message's model through `lastModel`. It now takes that message's
    `variant` too, while the model still offers it; otherwise the variant is
    unset.
  - A prompt that names a model without a variant still gets that model's
    default. The agent-variant rule is unchanged.
  - A command whose model comes from the same fallback passes the continued
    variant to its prompt, unless the agent-variant rule applies: an agent
    variant on the agent's own model still wins.
  - A shell run's user message keeps the previous user message's variant when
    it runs on that message's model. The shell API has no variant field, and
    later model-less turns continue this message.
  - A checkpoint rebuild boundary (`insertRebuildBoundary`) keeps the variant
    of the lane's newest user message when it is written for that message's
    model, and has none on another model. The boundary becomes the lane's
    newest user message, so later model-less turns and the TUI's restored
    selection read their variant from it.
- Motivation: cron fires (`injectScheduledPrompt`) send no model, and the
  variant was rebuilt from the input and the agent only, so every fire ran at
  the model's default variant. Inbox deliveries and actor notifications copy
  the last user message's model through `resolveDrainSeed`, so after one fire
  they lost the variant as well. The TUI restores its selected variant from the
  session's last user message when it opens a session, so it then showed the
  default too. In one incident two sessions whose typed prompts ran almost
  only at `max` held 344 cron and 98 inbox user messages without a variant, and
  every turn one session delegated to another ran at the default.
- Upstream relationship: upstream `7bc7dc3a` resolves the variant the same way.
  Fork fix of shared code. Both branches use the `main` resolver. The
  `dev/compat` model-selection preview calls it too (DC-TUI-001).
- Watch surfaces: `previousModel`, `lastModel`, `continuedVariant`,
  `agentVariant`, `createUserMessage`, `shell` and `command` in
  `packages/cli/src/session/prompt.ts`; `resolveDrainSeed` in
  `packages/cli/src/inbox/inbox.ts`; `injectScheduledPrompt`; the session sync
  in `packages/cli/src/cli/cmd/tui/component/prompt/index.tsx`;
  `insertRebuildBoundary` in `packages/cli/src/session/checkpoint.ts`.
- Tests/evidence: `packages/cli/test/session/prompt-continued-variant.test.ts`:
  - a cron-shaped prompt continues `max`, and a named model without a variant
    keeps its default;
  - a variant the model no longer offers is not continued;
  - a shell run on the same model keeps `max` for the next fire;
  - a command without a model keeps `max`;
  - a command whose agent sets `low` on that same model keeps `low`.

  Reverting any one site fails its case. Inheriting whenever the model matches
  the previous turn fails the named-model case.
  `packages/cli/test/session/rebuild-boundary-lossless.test.ts` "keeps the
  variant the previous turn ran at on the same model": a boundary after a
  `max` turn keeps `max`, one on another model or after a turn without a
  variant has none. Dropping the variant from the boundary fails it.
- Retirement condition: upstream continues the variant along with the model.

## FC-025 — Grok receives a flat `operation` envelope

- Status: active
- Canonical owner: fork `main` tool schema transform in
  `packages/cli/src/provider/transform.ts` (`isGrok`,
  `flattenNestedDiscriminatedUnions`, called from `schema`)
- Observable contract:
  - For a model whose model id or API id contains `grok`, a top-level tool
    parameter whose schema is a discriminated union is sent as one object: the
    discriminator becomes a required string `enum`, every variant's other
    fields become optional properties tagged "(only when action=…)", and
    `additionalProperties: false` stays. This applies to the `operation`
    envelope of `cron`, `task` and `actor`.
  - The arguments a model sends against that flat object are the same nested
    shape, so zod still parses them with the original union and rejects a
    missing or unknown action.
  - Only a union the flat form can represent qualifies: every branch is an
    object schema, one property holds a distinct string `const` in each branch
    and no other property holds a distinct `const` in each branch, and a
    property shared by several branches has one `type`. A `const` present in
    only some branches (compat's `spawn` `lifecycle`) does not block it. When the branches
    constrain such a property differently (actor's `task_id`), the flat form
    widens it to that type and zod applies each branch's constraint. The union
    node may carry only `type: "object"`, `description` and `title` beside the
    branches, and each branch only `type`, `properties`, `required`,
    `description`, `title` and a missing or `false` `additionalProperties`, with
    no property named after an `Object.prototype` member. Any
    other union, such as an MCP tool's `string | null`, a numeric discriminator,
    a shared property whose type differs between branches, a node with its own
    `properties` or `required`, or a branch with dynamic properties, is left as
    it is, for Grok too.
  - Every other model receives the nested union unchanged. The existing
    root-level flattening is unchanged for all models.
- Motivation: Grok answers a property whose schema is `anyOf` of object
  variants with an empty object. In recorded calls through a Grok gateway
  (`@ai-sdk/openai` Responses), every `task` (191), `cron` (14) and `actor` (5)
  call sent `{"operation":{}}` and failed with "Invalid input at
  operation.action", across 26 sessions, so Grok sessions could not schedule,
  track tasks or message actors. FC-020 decodes a stringified envelope, which is
  a different failure.
- Upstream relationship: upstream sends the nested union to every model. Fork
  model-specific adaptation; `dev/compat` inherits it unchanged.
- Watch surfaces: `schema`, `flattenDiscriminatedUnion`,
  `flattenNestedDiscriminatedUnions` and `isGrok` in
  `packages/cli/src/provider/transform.ts`; the `operation` envelopes in
  `packages/cli/src/tool/cron.ts`, `task.ts` and `actor.ts`; the frozen-prefix
  tool capture in `packages/cli/src/session/llm-request-prefix.ts`, which uses
  the same `schema`.
- Tests/evidence:
  - `packages/cli/test/tool/cron.test.ts` "cron schema: nested operation union
    for grok": Grok gets a flat `operation` with the six-action enum and a
    per-action tag, zod still accepts `{ action: "list" }` and rejects `{}`; a
    non-Grok model keeps the six-branch union. Removing the Grok call fails the
    Grok case.
  - `packages/cli/test/provider/transform.test.ts` "grok nested unions": a
    `string | null` property, object branches without a discriminator, a
    numeric discriminator, a shared property of differing types, a node with its
    own required property, a branch with `additionalProperties`, branches with
    a second `const` property and a branch property named `constructor` pass
    through
    unchanged; a discriminated object union is flattened with its description
    kept; a shared string property constrained differently is widened to
    `string`, and a shared object property whose inner field is named
    `description` is compared by that field. Accepting a non-string
    discriminator, accepting differing types, skipping the widening, accepting
    a rival discriminator, or ignoring nested `description` keys each fails a
    case; rejecting any second `const` fails "flattens when another const
    appears in only some branches".
  - `packages/cli/test/tool/task.test.ts` and `actor.test.ts`: the same flat
    shape for `task` and for `actor` (eight actions, `spawn` first).
- Retirement condition: Grok fills nested discriminated-union properties, or
  upstream flattens them for every model.

## FC-026 — the cron bridge survives instance recycling

- Status: active
- Canonical owner: fork `main` cron bridge in
  `packages/cli/src/session/cron-bridge.ts` (`resume`) and instance bootstrap in
  `packages/cli/src/project/bootstrap.ts` (`InstanceBootstrap`)
- Observable contract:
  - The bridge remembers the last mount this process made: session, workspace
    root, directory and inject. Disposing the instance stops the bridge but keeps
    that record; an explicit `stop()` clears it.
  - `InstanceBootstrap` calls `resume()`. When the new instance has the
    remembered directory and no bridge is mounted, the bridge mounts again for
    the remembered session, takes the scheduler lock and fires due jobs without
    waiting for a prompt. Another directory, a mounted bridge, or a bridge
    stopped on purpose is left as it is.
  - The worktree bootstrap runtime has no cron bridge, so bootstrap skips the
    call there.
- Motivation: the hourly models catalog reload disposes every instance, and a
  busy session defers that disposal until it goes idle. The scheduler fires a
  due job only on an idle tick, so it was stopped at exactly the moment its jobs
  could fire, and the prompt loop mounted it again only when the next turn had
  already made the session busy. In recorded runs a coordinator session's bridge
  stopped at the hourly reload and stayed down until the next prompt, once for
  an hour and a half, and its 10-minute session-only fallback job did not fire
  once in the following hours.
- Upstream relationship: upstream stops the bridge with the instance and mounts
  it only from the prompt loop. Fork fix of shared code; `dev/compat` inherits
  it unchanged.
- Watch surfaces: `start`, `stop`, the instance-owner finalizer and `resume` in
  `cron-bridge.ts`; `InstanceBootstrap`; the `cronBridge.start` call in
  `packages/cli/src/session/prompt.ts`; `Instance.provide` callers that pass no
  `init`.
- Known gap: an instance created by a caller that passes no `init` skips
  bootstrap, so the bridge then mounts at the next prompt, as before. Recorded
  recycles were recreated through bootstrap in all but one case.
- Tests/evidence: `packages/cli/test/session/cron-bridge.integration.test.ts`
  "a recycled instance resumes the last mount without a new start" disposes the
  instance, resumes, and expects a second mount, the lock file and a fired due
  job; a second resume mounts nothing. "resume does not restart a bridge stopped
  on purpose or mount another directory" covers the other cases. Dropping the
  record on instance disposal fails the first; keeping it after `stop()` fails
  the second.
- Retirement condition: upstream keeps the scheduler across instance recycling
  or mounts it on instance creation.

## FC-030 — a resumed session shows its variant without overwriting the saved choice

- Status: active
- Canonical owner: fork `main` TUI — `variant.resume`, `variant.selected` and
  `variant.set` in `packages/cli/src/cli/cmd/tui/context/local.tsx`, and the
  session restore effect in
  `packages/cli/src/cli/cmd/tui/component/prompt/index.tsx`
- Observable contract:
  - Opening a session shows the variant its last main-lane user message ran at,
    while that message's model is the current model. It is held in memory only:
    `model.json`, the per-model choice every TUI process on the machine shares,
    is not rewritten.
  - A last user message without a variant is no choice: the saved choice for
    the model shows, and a variant shown for an earlier session is dropped.
  - A message whose model is not available leaves the fallback model's saved
    choice as it is.
  - An explicit choice (the variant dialog, Default included, or the cycle key)
    replaces the shown variant and is saved, as before.
- Motivation: the restore called `variant.set(msg.model.variant)`, which turns
  a missing variant into `"default"` and saves the whole map. Messages without
  a variant are common: deliveries copy the last user message's model (FC-023),
  so one break in that chain — such as a checkpoint rebuild boundary before
  FC-023's extension — leaves every later delivery without one. In recorded
  restarts five sessions whose last user messages were such deliveries came
  back at Default and overwrote the saved `max`/`xhigh` for their models, and
  each needed the variant chosen again by hand. The same call also wrote a
  missing model's variant onto the fallback model's key.
- Upstream relationship: upstream restores with the same `variant.set` call.
  Fork fix of shared code; `dev/compat` inherits it unchanged.
- Watch surfaces: the files above; `save` and the `model.json` load in
  `local.tsx`; `lastUserMessage` in `prompt/index.tsx`; FC-023's continued
  variant in `packages/cli/src/session/prompt.ts` and the rebuild boundary in
  `packages/cli/src/session/checkpoint.ts`, which decide whether history
  carries a variant at all.
- Known limit: history cannot tell an explicit Default from a message that lost
  its variant, as both record none; both show the saved choice. The saved
  choice is per model and shared across processes, so a later choice of the
  same model in another session shows instead.
- Tests/evidence: `packages/cli/test/cli/tui/variant-resume.test.tsx` mounts the
  production App with `-s` against a fake server and a seeded `model.json`,
  holding the history until the saved choice has loaded: "a last message
  without a variant keeps the saved choice", "a recorded variant shows without
  replacing the saved choice, and a later choice replaces it", "switching to a
  session whose last message has no variant shows the saved choice again" and
  "the variant of a model that is not available is not given to the fallback
  model". The old `variant.set` call fails all four; saving the resumed
  variant, ignoring it, matching it to any model, keeping it past a choice or
  past a session without one, or reading a missing variant as Default each
  fails its case.
- Retirement condition: upstream restores the variant without saving it and
  keeps the saved choice when history records none.

## FC-032 — a timed-out ssh command is reported as possibly still running remotely

- Status: active
- Canonical owner: fork `main` bash tool — `runsOverSsh` and the timeout note
  in `run` in `packages/cli/src/tool/bash.ts`
- Observable contract:
  - When the bash tool stops a command at its timeout and the command line
    starts `ssh` — directly, or behind `env`, `nohup`, `sudo`, `command`,
    `exec`, `time`, `timeout` or `sshpass`, by any path — the note says that
    stopping the local ssh client does not stop what it started on the remote
    host, that the remote work may still be running, to check the remote host
    before running it again, and to run long remote work detached with its
    output in a file. It does not advise retrying with a larger timeout.
  - Any other timed-out command keeps the existing note.
- Motivation: killing the local client leaves the remote command running. In
  recorded collaboration 17 of 33 bash timeouts were ssh commands to a remote
  Windows host running Python or PowerShell. The note told the agent to retry
  with a larger timeout, so a retry started the same work a second time beside
  the first; idle PowerShell processes were found left on that host.
- Upstream relationship: upstream gives the same retry advice for every
  timeout. Fork fix of shared code; `dev/compat` inherits it unchanged.
- Watch surfaces: the timeout note in `run`, `parts` and `commands` in
  `packages/cli/src/tool/bash.ts`.
- Known limit: only the command's own words are read, so ssh started from a
  script or another program is not recognized.
- Tests/evidence: `packages/cli/test/tool/bash.test.ts` "a timed-out ssh command
  is reported as possibly still running remotely" runs a stand-in `ssh` that
  sleeps, called by path and behind `env`, and expects the remote note without
  the retry advice; "terminates command on timeout" now also expects no remote
  note. Ignoring the detection, dropping the command runners, reading the path
  as the name, or treating every command as remote each fails a case.
- Retirement condition: upstream distinguishes remote commands in its timeout
  note.

## FC-033 — a tool part records when its run started

- Status: active
- Canonical owner: fork `main` tool timing — gate admission in `executeTool`
  in `packages/cli/src/session/processor.ts`, and the tool context's `metadata`
  callback in `packages/cli/src/session/prompt.ts`
- Observable contract:
  - A tool part's `state.time.start` is the moment its run began: when the
    step's tool gate admitted it, after any wait behind earlier tools in that
    step, not when the model emitted the call.
  - A progress update from a running tool (`ctx.metadata`, which bash sends for
    its output) keeps that start; only a call still `pending` gets one from it.
  - So `time.end - time.start` is the run's own duration.
- Motivation: the `metadata` callback rebuilt the running state with
  `time: { start: Date.now() }`, so every progress update moved the start to
  that moment. A bash command that slept 400 ms and then printed one line was
  recorded as running for about 10 ms, and a long command's recorded start
  trailed its last output. Calls queued behind a barrier tool counted the
  queue wait as their own run.
- Upstream relationship: upstream rebuilds the state the same way; the gate is
  a fork addition. Fork fix of shared code; `dev/compat` inherits it unchanged.
- Watch surfaces: the files above; `completeToolCall` and `failToolCall` in
  `processor.ts`, which keep the start; the orphan sweep in `prompt.ts`, which
  compares a running part's start with its cutoff; tool duration display in
  `packages/cli/src/cli/cmd/tui/routes/session/index.tsx`.
- Tests/evidence: `packages/cli/test/session/tool-gate-orchestration.test.ts`
  "a tool records when its run started: after any wait in the gate, unmoved by
  progress updates" runs a 400 ms bash command and a quick one in one step and
  expects the first to span at least 400 ms and the second to start after the
  first ends. Restoring either the reset in the callback or the call-time start
  fails it.
- Retirement condition: upstream keeps a running tool's start across progress
  updates.

## FC-034 — durable cron keeps firing after its lock holder stops

- Status: active
- Canonical owner: fork `main` cron scheduler — `takeOverLock` in `tick` and
  `add` in `packages/cli/src/cron/scheduler.ts`, and the `schedule` action of
  `packages/cli/src/tool/cron.ts` and `cron.txt`
- Observable contract:
  - Durable tasks (`.mimocode/scheduled_tasks.json`) are read and fired only
    by the scheduler holding the workspace's `.cron-lock`. A scheduler that
    started while another process held the lock tries for it again every 30
    seconds (`StartOpts.lockRetryMs`) while its session is idle, and on
    getting it fires what came due meanwhile, missed one-shots included.
  - A scheduler's start, stop and ticks run one at a time. The lock names the
    process, not the scheduler, so a takeover interleaved with a stop and a
    restart could otherwise end with the restarted scheduler believing it held
    a lock file that had been removed; a stop during a tick also cleared the
    runtime the tick was still reading.
  - `cron schedule` accepts `permanent: true` together with `durable: true` on
    a recurring job; such a job is not ended by the 7-day recurring age limit
    and runs until deleted. `permanent` on a session-only or one-shot job is
    refused.
- Motivation: the lock was tried only when a scheduler started. Every other
  process stayed a non-owner for its whole life, so once the holder's
  scheduler stopped — its process exited, or its instance was recycled — no
  durable task fired until some scheduler started again. In recorded
  collaboration all six processes in one workspace logged `lock held by live
  process` at start and never retried, and the lock passed between processes
  only through restarts. Without `permanent`, a durable recurring job used as
  a long-running wake source would also end after a week.
- Upstream relationship: upstream tries the lock at start only, and its tool
  does not expose the task's existing `permanent` field. Fork fix of shared
  code; `dev/compat` inherits it and adds its own delivery of a durable task
  to a session another process owns.
- Watch surfaces: the files above; `tryAcquireSchedulerLock` and
  `releaseSchedulerLock` in `packages/cli/src/cron/cron-lock.ts`;
  `recurringMaxAgeMs` in `packages/cli/src/cron/cron-jitter.ts`.
- Known limit: firing stays fire-and-forget; a task is marked fired, or a
  one-shot removed, when it is handed to delivery, not when delivery commits.
- Tests/evidence: `packages/cli/test/cron/scheduler.test.ts` "a scheduler
  without the lock takes it over once the holder lets go, then fires durable
  tasks", "a durable one-shot missed while nobody held the lock fires once
  after the lock is taken over", "a scheduler without the lock waits out its
  retry interval before trying again", "a takeover racing a stop and a
  restart leaves the restarted scheduler holding the lock" (20 rounds) and "a
  permanent durable task outlives
  the recurring age limit; others age out";
  `packages/cli/test/tool/cron.test.ts` "permanent on a session-only / one-shot
  job is refused". Dropping the takeover, ignoring the interval, not storing
  `permanent`, storing it on a session-only task, running ticks outside the
  serialization, or accepting `permanent` on the tool each fails a case.
- Retirement condition: upstream retries the scheduler lock after start and
  exposes permanent durable jobs.

## FC-035 — undo reverts only the files the session's write tools wrote

- Status: active
- Canonical owner: fork `main` undo scope — `SnapshotWritten` in
  `packages/cli/src/snapshot/written.ts` and its `record` call at the end of
  `assertWriteAllowed` in `packages/cli/src/tool/external-directory.ts`; the
  patch part's `written` field, filled at the two patch sites (finish-step and
  `cleanup`) in `packages/cli/src/session/processor.ts`; `revert` and
  `unrevert` in `packages/cli/src/session/revert.ts` and the revert's `files`
- Observable contract:
  - A patch part keeps `files`, every file that changed in the worktree during
    its step, and adds `written`: the ones this session's write tools wrote
    (edit, write, apply_patch, notebook_edit, including calls made from exec),
    recorded at the write gate against the calling assistant message.
  - Undo puts back only `written` files, each to its state before the step.
    Files changed by bash or exec commands, or by other processes sharing the
    worktree, keep their contents. A patch recorded before `written` existed
    reverts all its files, as before.
  - The revert stores the files it changed as `files`. Redo (unrevert), and a
    further undo while one is in place, restore only those files from the
    pre-undo snapshot, so edits other processes made after the undo survive.
    A revert stored before `files` existed restores the whole snapshot, as
    before.
  - A sanitized export redacts `written` entries with the same token as the
    file's entry in `files`, and redacts `revert.files`.
- Motivation: a patch's file list comes from a whole-worktree snapshot diff.
  With several agent processes in one worktree, a step's patch also listed
  files other agents edited during that step, so `/undo` reverted their work,
  and redo restored the entire pre-undo snapshot, rolling back everything they
  had written since the undo. Bash and exec commands report no file list, so
  their writes cannot be told apart from another process's.
- Known limits: files this session changed only through bash or exec commands
  (`sed -i`, a generator, `rm`) are no longer reverted by undo. A subagent
  running as a peer child session records against its own session, so the
  parent's undo leaves its files; same-session lanes count as this session.
- Upstream relationship: upstream reverts every file in a patch and unreverts
  by restoring the whole snapshot. Fork fix of shared code; `dev/compat`
  inherits it unchanged.
- Watch surfaces: the files above; `patch`, `revert` and `restore` in
  `packages/cli/src/snapshot/index.ts`; `PatchPart` in
  `packages/cli/src/session/message-v2.ts` and the session `revert` schema in
  `session.ts` and `session.sql.ts`; `sanitize` in
  `packages/cli/src/cli/cmd/export.ts`. A new write tool must call
  `assertWriteAllowed` for its writes to be undone.
- Tests/evidence: `packages/cli/test/session/snapshot-tool-race.test.ts` "undo
  reverts the files the turn's write tools wrote and keeps the rest" runs the
  write tool and then bash through the prompt loop, expects `written` to name
  only the written file, undo to remove it but keep the bash file, and redo to
  bring it back without touching the bash file's later contents;
  `packages/cli/test/session/revert-compact.test.ts` "undo and redo leave alone
  the files another process writes in the worktree" covers an undo, a further
  undo and a redo with another writer between each;
  `packages/cli/test/snapshot/written.test.ts` covers per-message records that
  a patch claims once and a new file written through a symlinked directory,
  including directories the write creates (recorded under the real path of
  the nearest existing ancestor);
  `packages/cli/test/cli/export-import.test.ts` "sanitizes real tool errors,
  session prompts and assistant error/result payloads" covers the redaction.
  Dropping the record call, the `written` field, the filter in revert, the
  file-scoped restore or the stored `files`, the real-path keys, or clearing a
  record when taken each fails a case, as does leaving either new field
  unredacted.
- Retirement condition: upstream attributes patch files to the tools that
  wrote them, or scopes undo and redo to the session's own writes.

## FC-039 — a terminal reply split across stdin reads is not typed into the prompt

- Status: active
- Canonical owner: fork `main` dependency patch —
  `patches/@opentui%2Fcore@0.1.101.patch`, `StdinParser.pendingTimeoutMs`
  (with `STRING_SEQUENCE_TIMEOUT_MS`)
- Observable contract:
  - While the parser is inside a DCS, OSC or APC string (after `ESC P`,
    `ESC ]`, `ESC _`), it waits up to 1000 ms for the terminator before
    flushing; everything else, a lone Escape included, keeps the 20 ms key
    timeout.
  - So a terminal reply delivered in two reads is still one `response` event
    and nothing of it reaches the prompt.
  - When the second half arrives after that wait anyway (a slow host, or an
    event loop stalled past it), the flushed string is remembered for 10 s:
    a following read that is a run of reply characters (hex digits, `;:/,.$?=#`,
    `r g b m`, space) ending in the string terminator (`ESC \`, or `BEL` for
    OSC) is taken as its tail and emitted as an opaque response, not keys.
    Typed text uses other letters, so coalesced typing ending in Ctrl+G or
    Alt+\\ stays keys, and a bare `ESC \` is still a key. A typed run made only
    of those characters and ending in a terminator, within 10 s of a flushed
    reply, would be dropped — an accepted residual.
- Motivation: a window hosted by a terminal multiplexer showed text such as
  `48;2;10;10;10m` (later `10m`, after the wait) in the prompt: the tail of a DECRPSS reply
  (`ESC P 1 $ r 48;2;10;10;10m ESC \`) whose two halves arrived more than
  20 ms apart. The parser flushed the head as an opaque response and parsed the
  tail in ground state as typed keys (the closing `ESC \` became Alt+\).
  Nobody types these introducers by hand, so the longer wait costs nothing.
- Upstream relationship: upstream `@opentui/core` 0.1.101 applies the 20 ms
  timeout to every pending sequence. Fork patch alongside the existing CJK
  extmark fix in the same patch file; `dev/compat` inherits it.
- Watch surfaces: the patch file; any `@opentui/core` upgrade, which must keep
  or replace this behavior.
- Tests/evidence: `packages/cli/test/cli/cmd/tui/stdin-split-reply.test.ts`
  drives the real parser: a DCS and an OSC reply split by 60 ms stay one
  response; a lone Escape is still a key. Both split cases fail on the
  unpatched parser. "late tails of flushed terminal replies": DCS, OSC-ST and
  OSC-BEL tails arriving 1.5 s later are not typed (fail without the
  recovery); typing after a flush, coalesced `hello` + Ctrl+G and `ok` +
  Alt+\\ in one read, a typed Alt+\\ and a tail after the 10 s window are
  still keys (the coalesced cases fail with a printable-only check).
- Retirement condition: upstream opentui gives open string sequences their own
  timeout, or the dependency is upgraded past such a fix.

## FC-040 — a read-only subagent is not asked to write its journal under a global allow

- Status: active
- Canonical owner: fork `main` — `ownWritability` and the `canWrite` it feeds in
  `packages/cli/src/actor/spawn.ts` (input to `actor.postStop`, read by
  `packages/cli/src/plugin/subagent-progress-checker.ts`)
- Observable contract:
  - A subagent whose own ruleset ends its defaults with a catch-all deny
    (`explore`: `"*": "deny"`) reports `canWrite: false` even when a catch-all
    allow is merged after it — `--yolo`
    (`MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS`, which merges `"*": "allow"` under
    the user config) or a global `permission: {"*": "allow"}` — so the
    progress checker does not nudge it to write `tasks/<id>/progress.md`.
  - An explicit later rule still decides: `write`/`edit: "allow"` after the
    deny makes it writable. Agents without a catch-all deny are unchanged.
  - Runtime tool permissions are unchanged; this only feeds `canWrite`.
- Motivation: under `--yolo` every built-in agent's ruleset ended in
  `"*": "allow"`, so `canWrite` was true for `explore`; its read-only prompt
  then refused the "write the journal" nudge three times (MAX_POST_REACT),
  wasting three turns and delaying the result by about a minute each time
  (6 explore runs in one 2-hour coordinator session).
- Upstream relationship: upstream computes `canWrite` from the merged agent
  ruleset the same way. Fork fix; `dev/compat` inherits it.
- Watch surfaces: the files above; `Config` `MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS`
  merge; agent default rulesets in `packages/cli/src/agent/agent.ts`.
- Tests/evidence: `packages/cli/test/actor/poststop-progress-write-permission.repro.test.ts`
  "explore bound to task_id skips the progress check … under a global allow"
  (real spawn, one LLM turn, no journal; fails with the merged ruleset) and
  "ownWritability (FC-040)" (catch-all allow after deny stays read-only;
  explicit later write/edit allow stays writable; agents without a deny
  unchanged — dropping the filter or the explicit-rule exception fails it).
- Retirement condition: upstream derives subagent writability independently of
  catch-all allows, or `--yolo` stops overriding agent catch-all denies.

## FC-041 — exec can read the memory directory

- Status: active
- Canonical owner: fork `main` — `execReadRoots` in
  `packages/cli/src/tool/tool-script.ts`
- Observable contract:
  - `files.readText` in `exec` reads the worktree, the OS temp dir and
    `<data>/memory/` (session checkpoints, notes, `tasks/<id>/progress.md`,
    project and global memory). The rejection message names all three.
  - `files.writeText` stays OS-temp-only; memory writes keep going through the
    write tools and memory-path-guard.
- Motivation: in the codex harness the agent has no `read` tool, so `exec` is
  its only way to read a file. Coordinators reading a subagent's progress
  journal were rejected ("path outside allowed roots (worktree, tmp)") while
  the `read` tool already reads the memory tree without asking
  (`assertExternalDirectoryEffect` defers it to memory-path-guard).
- Upstream relationship: upstream jails reads to worktree + tmp. Fork fix;
  `dev/compat` inherits it.
- Watch surfaces: `tool-script.ts` jail roots, `resolveJailed`, the `files`
  declaration text; `external-directory.ts` memory deferral.
- Tests/evidence: `packages/cli/test/tool/tool-script.test.ts`
  "files.readText reads the memory directory" and "files.readText roots
  include the memory directory wherever it lives" (the second fails when the
  memory root is dropped; the first alone cannot, because the test data dir
  lies under tmp).
- Retirement condition: upstream lets `exec` read the memory tree.

## FC-042 — a bounded agent stops on a rejected request, not on the compaction trigger

- Status: active
- Canonical owner: fork `main` — `compactsOnUsage` in the processor `Input`
  (`packages/cli/src/session/processor.ts`), passed as `!isBoundedComputation`
  from `packages/cli/src/session/prompt.ts`
- Observable contract:
  - For a bounded agent (native and hidden: `checkpoint-writer`, `title`,
    `summary`, …) a step whose reported usage reaches the compaction trigger
    (`usable` = 90% of the effective window, after `compaction.max_context`) is
    not an overflow; the loop continues.
  - The provider rejecting a request as too large still ends a bounded agent
    after that one request with `ContextOverflowError` (unchanged).
  - Agents with context management are unchanged: the trigger routes them to
    compaction/checkpoint recovery.
  - `isBoundedComputation` is computed early in the loop, so session-environment
    injection (FD-009) uses the same `native && hidden` predicate as
    `compactsOnUsage`.
- Motivation: bounded agents have no compaction, so the trigger could only end
  them. With `compaction.max_context: "272K"` on gpt-6-astra (window 1.05M) the
  checkpoint writer was failed at 244.8K on steps the provider had accepted:
  11 of 27 writers of one coordinator session in 5.5 hours ($45), each leaving
  the checkpoint behind.
- Upstream relationship: upstream marks the same usage overflow for every
  agent. Fork fix; `dev/compat` inherits it.
- Watch surfaces: `processor.ts` finish-step `isOverflow` check and `halt`;
  `prompt.ts` `isBoundedComputation` and `writeBoundedOverflowError` branches.
- Tests/evidence: `packages/cli/test/session/checkpoint-writer-runaway.test.ts`
  "keeps running past the compaction trigger until the provider rejects a
  request" (380K reported on a 400K window, second step runs; fails without
  the flag in either file); the file's existing rejected-request cases still
  settle after one request.
- Retirement condition: upstream distinguishes the compaction trigger from a
  provider overflow for agents without context management.

## FC-048 — a step's summary costs the same on a long session as on a new one

- Status: active
- Canonical owner: fork `main` — `anchor`, `summarizeSession`, `summarizeTurn`
  and the per-session queue in `summarize`
  (`packages/cli/src/session/summary.ts`); `PATCH_FILE_BYTES`,
  `PATCH_TOTAL_BYTES` and the blob-size pass in `diffFull`
  (`packages/cli/src/snapshot/index.ts`)
- Observable contract:
  - `SessionSummary.summarize` reads the snapshots that bound its diffs from the
    part table: the session diff runs from the first step-start to the last
    step-finish carrying a snapshot in the main slice, and a turn's diff from the
    first to the last of the assistants answering that user message. These are
    the snapshots the hydrated slice yields, without hydrating it.
  - One summary runs per session at a time. A request that arrives while one
    runs is queued; the running summary makes one more pass for every queued
    message and then frees the slot. The call that only queued returns at once.
  - In `diffFull`, a row whose before and after blobs together exceed
    `PATCH_FILE_BYTES` (1 MiB), or that no longer fits `PATCH_TOTAL_BYTES`
    (8 MiB) after earlier rows, keeps its file, status and counts but carries
    an empty patch, as a binary row does. The log line is `snapshot diff past
    its patch budget; rows without patches keep their counts`. When the size
    pass fails, every row is patched as before.
- Motivation: every step finish forks a summary. Each one hydrated the session's
  whole main slice to find two snapshot hashes (13,433 messages, about 0.5 GB on
  a coordinator session), and rebuilt a full-context diff from the session's
  first snapshot. With untracked lab outputs in the worktree that diff reached
  7,164 files and 278 MB per write, summaries overlapped, and `diffFull` held
  the snapshot lock that the next step's snapshot waited on (26–56 s). Four
  agents in one worktree grew to 2–12 GB each and the machine swapped.
- Known limits: rows past the budgets show counts without patch text in the
  session and message diff views. Revert does not read patch text; it uses patch
  parts and snapshots.
- Upstream relationship: upstream hydrates the slice and patches every row on
  every step finish. Fork fix of shared code; `dev/compat` inherits it.
- Watch surfaces: `summarize`, `computeDiff` and `diff` in `summary.ts`; the
  `summarize` callers in `processor.ts` (step finish) and `prompt.ts` (turn
  start); `diffFull` and `load` in `snapshot/index.ts`; the order
  `Session.messages`/`MessageV2.page` use, which `anchor` mirrors; the
  `message_session_time_created_id_idx` and `part_message_id_id_idx` indexes
  the anchor queries walk.
- Tests/evidence: `packages/cli/test/session/summary-anchors.test.ts` "the
  session diff spans the main slice and the turn diff spans that turn's
  answers", "a turn without a snapshot on both ends gets an empty diff" and
  "summaries of one session run one at a time and a request made meanwhile
  still lands"; `summary-main-slice.test.ts` keeps lanes out of both anchors;
  `packages/cli/test/snapshot/diff-budget.test.ts` "a file past the per-file
  budget keeps its counts without a patch", "patching stops once the total
  budget is spent and every row is kept" and "a modified file whose blobs fit
  the budget is still patched", on real git. Taking the last
  step-start, dropping the turn or main-slice filter, removing the queue, or
  removing either budget each fails a case.
- Retirement condition: upstream stops hydrating the session per step and bounds
  its summary diffs.

## FC-049 — a stream held open by keep-alive comments still times out

- Status: active
- Canonical owner: fork `main` — `sseEventScanner` and the event timer in
  `wrapSSE`, and the `eventTimeout` option read in the provider fetch wrapper
  (`packages/cli/src/provider/provider.ts`); `eventTimeout` in the provider
  options schema (`packages/cli/src/config/provider.ts`) and the generated SDK
  type
- Observable contract:
  - `provider.<id>.options.eventTimeout` (milliseconds) bounds the wait for an
    SSE line that is not a comment (`event:`, `data:`, `id:`, `retry:`). Comment
    lines (`:` and `: keep-alive`) do not reset it; line state carries across
    chunks, so a comment split between chunks is still a comment.
  - When it expires the stream aborts with `SSE read timed out`, the error retry
    already treats as transient, and logs `SSE stream sent no event within the
    event timeout`.
  - `chunkTimeout` keeps its meaning: any bytes, comments included, reset it.
    Without `eventTimeout` nothing changes.
  - Every wrapped stream keeps a content-free tally (`SseStats` in
    `packages/cli/src/provider/sse-stats.ts`). One that ends normally after
    120 s, or times out, fails to read or is cancelled after 60 s, logs `SSE
    stream summary` once with `outcome`, `durationMs`, `bytes`, `comments`, the
    count per `event:` name, the count per `data:` `type` and
    `sinceLastEventMs`. Payload text is never logged.
- Motivation: a gateway sent `:` and `: keep-alive` comments while its upstream
  stalled. They reset the 45 s `chunkTimeout` on every comment, so one request
  waited 900 s until the gateway itself failed the stream
  (`upstream_http2_stream_error`, `sequence_number` 0), and the agent stood
  still for 15 minutes.
- Known limits: off unless configured, because a reasoning model may think for
  minutes behind heartbeats; choose a value above the longest silent reasoning
  the provider shows. A gateway that keeps a stalled stream alive with
  non-comment lines (a named keepalive event, a typed `data:` line) also resets
  the event timer; the stream summary is there to show which it sends. One such
  900 s stall recurred with `eventTimeout` set, after the comment-only case was
  verified against the shipped binary.
- Upstream relationship: upstream has only the byte-level chunk timeout. Fork
  addition; `dev/compat` inherits it.
- Watch surfaces: `wrapSSE` and `SseStats`, the option parsing beside `chunkTimeout` and
  `headerTimeout` in `provider.ts`; the transient classification of `SSE read
  timed out` in `provider/error.ts` and `session/retry.ts`; the provider options
  schema and `packages/sdk/src/v2/gen/types.gen.ts`.
- Tests/evidence: `packages/cli/test/provider/provider-event-timeout.test.ts`
  "a stream that only sends keep-alive comments ends at the event timeout",
  "without an event timeout, keep-alive comments keep the chunk timer alive",
  "events keep resetting the event timeout across a longer stream" and "a
  keep-alive comment split across chunks is still not an event", through the
  real provider fetch wrapper and an `@ai-sdk/openai-compatible` stream from a
  local `Bun.serve` gateway. `packages/cli/test/provider/sse-stats.test.ts`
  covers the tally: comments split across chunks are not events, event names
  and data types are counted over CRLF lines cut every 7 bytes without payload
  text, and a multi-byte character split across chunks is decoded once.
  Counting comments as events, dropping the carried line state, ignoring
  `eventTimeout`, or never resetting the timer each fails a case.
- Retirement condition: upstream bounds the time between SSE events apart from
  comments.

<a id="fc-050--the-claude-environments-git-status-stays-small-and-old-oversized-prefixes-are-rebuilt"></a>

## FC-050 — old oversized environment prefixes are rebuilt

- Status: active
- Canonical owner: fork `main` — historical environment recognition in
  `packages/cli/src/session/git-status.ts` and its use in
  `SessionPrefixSnapshot.get` (`packages/cli/src/session/prefix-snapshot.ts`)
- Observable contract:
  - `SessionPrefixSnapshot.get` drops a frozen prefix whose environment status
    section exceeds the historical 10,000-character limit and returns
    nothing, so the caller pins a freshly rendered prefix. The log line is
    `dropped a frozen prefix with an oversized git status`. Prefixes without an
    environment block are untouched.
- Motivation: the environment listed every untracked file. One worktree put
  86,424 lines (9.7M characters, a scratch `.tmp/`) into the fixed prefix, and
  another 7,222 lines (1.0M characters, generated lab trees). The prefix is never
  compacted, so every Claude request failed the local preflight with "the fixed
  request prefix and active turn still do not fit"; three Opus subagents in one
  afternoon failed on their first step. Retrying or a new session re-rendered the
  same list, and a frozen prefix kept it after the worktree was cleaned.
- Upstream relationship: adopts unified environment generation; retains
  historical frozen-prefix recovery. `dev/compat` inherits it.
- Watch surfaces: `SystemPrompt.environment`;
  `SessionPrefixSnapshot.get`/`pin`/`rotate` and their callers
  in `prompt.ts` and `compaction.ts`; the `Status:`/`Recent commits:` labels
  `oversized` locates.
- Tests/evidence: `packages/cli/test/session/git-status-prompt.test.ts` reads persisted
  rows with oversized, capped, and exactly-at-limit status sections and with a plain
  prompt. It verifies that a fresh prefix can be pinned after the old one is dropped.
- Retirement condition: the fork no longer reads frozen prefixes rendered
  before the bounded/unified environment policy.

## FC-051 — a prompt admitted during a revert is not hidden and later deleted

- Status: active
- Canonical owner: fork `main` — `admission`, `exclusive` and the per-session
  gate in `packages/cli/src/session/revert.ts`; `preparePrompt` in
  `packages/cli/src/session/prompt.ts`; the `session.undo` command in
  `packages/cli/src/cli/cmd/tui/routes/session/index.tsx`
- Observable contract:
  - Per session, prompt admissions (`preparePrompt`: read the session, commit
    a pending revert, create the user message, accept the receipt) run
    alongside each other but never during `SessionRevert.revert` or
    `unrevert`, which hold the session to themselves.
  - A prompt sent while a revert runs therefore waits for it, sees the revert
    and commits it before its own message exists, as when it is sent after.
  - A revert asked for while an admission runs waits for it, then applies (or
    fails busy if the turn has started).
  - TUI undo puts the reverted message back into the prompt only after the
    revert returns without an error, and only if the prompt and the open
    session are unchanged since undo started: a draft typed while the revert
    ran is kept. The message is read before the revert; if another prompt
    committed the revert away meanwhile, it is not brought back.
- Motivation: undo's revert ran fire-and-forget while the TUI put the message
  straight back into the prompt. On a long session the revert took 11.85 s; the
  message was resent meanwhile, its admission saw no revert to commit, and its
  turn started. The revert then marked the session reverted to a point before
  that turn, so the TUI hid 40 minutes of the turn's work, including a pending
  question, and the next prompt's cleanup deleted 43 messages.
- Known limits: the gate is per process; with DC-SESSION-001 only the owning
  process admits a session's prompts. Shell and summarize entry points commit a
  pending revert outside the gate, as before.
- Upstream relationship: upstream checks only that the session is idle when a
  revert starts. Fork fix of shared code; `dev/compat` inherits it.
- Watch surfaces: `SessionRevert.revert`/`unrevert`/`cleanup`; `preparePrompt`
  and its callers; the TUI `session.undo` and `session.redo` commands.
- Tests/evidence: `packages/cli/test/session/revert-admission.test.ts` "a
  prompt sent while the session is held for a revert waits, then lands" and "a
  revert waits for a prompt admission in progress, then applies" (which also
  checks that the next prompt commits the revert first), through `AppLayer`.
  Removing the gate from `preparePrompt` or from `revert` each fails a case.
- Retirement condition: upstream orders reverts and prompt admissions per
  session.

## FC-052 — a running process logs the commit it was built from

- Status: active
- Canonical owner: fork `main` — `readBuildProvenance` in
  `script/build-provenance.ts`; the `MIMOCODE_BUILD` define in
  `packages/cli/script/build.ts` and `build-node.ts`; `InstallationBuild` and
  `describeBuild` in `packages/cli/src/installation/version.ts`; the `mimocode`
  startup log line in `packages/cli/src/index.ts`
- Observable contract:
  - Each build records the full commit SHA (`MIMOCODE_COMMIT_SHA` when git is
    unavailable), whether the build had local changes, and when it started.
    Local changes are a changed tracked file anywhere (staged or not) or an
    untracked, non-ignored file under `packages/`; they are read before
    `generate.ts` writes its ignored snapshot.
  - The startup line in `dev-main-<pid>-*.log` (or the non-dev log) carries
    `build=<sha>`, `<sha>+dirty`, `<sha>+dirty-unknown` when git could not
    tell, or `source` when running unbuilt, and `built_at=<ISO time>`.
  - `--version`, `MIMOCODE_VERSION`, the user agent and session `version` are
    unchanged; the provenance is not added to environment info or telemetry.
- Motivation: a set of long-running sessions was restarted on a local build
  and the binary was rebuilt within the hour. `--version` printed `local` for
  both, so which commit each process ran, and whether a fix had reached it,
  could only be inferred from reflog times and the inode `lsof` showed.
- Known limits: `+dirty` does not say what changed, and untracked files
  outside `packages/` are not counted.
- Upstream relationship: upstream defines only the version and channel. Fork
  addition; `dev/compat` inherits it.
- Watch surfaces: the `define` blocks of both build scripts and the order of
  `generate.ts` in them; `Script.version` in `script/meta.ts`; the startup log
  call in `index.ts` middleware.
- Tests/evidence: `script/build-provenance.test.ts` builds real git fixtures:
  "a clean checkout reports its full commit and is not dirty", "a changed
  tracked file anywhere makes the build dirty, staged or not", "an untracked
  file under packages/ makes the build dirty; one elsewhere or ignored does
  not" and "outside git, the commit falls back to MIMOCODE_COMMIT_SHA and
  dirtiness is unknown". `packages/cli/test/installation/build-provenance.test.ts`
  covers the log token and that a source run has no build. A `build:local`
  binary started under a temporary HOME logged
  `build=<head>+dirty built_at=...` with uncommitted changes and
  `build=<head>` after commit.
- Retirement condition: upstream embeds and logs the build commit.

## FC-053 — a config provider on `@ai-sdk/xai` uses Responses, and an OpenAI-compatible reasoning model keeps its effort

- Status: active
- Canonical owner: fork `main` — the loader fallback in `Provider.getLanguage`
  (`packages/cli/src/provider/provider.ts`), and `sdkKey` and
  `providerOptions` in `packages/cli/src/provider/transform.ts`
- Origin: compat DC-PROVIDER-001 (added 2026-10-12, corrected 2026-10-13),
  promoted to shared `main` on 2026-11-07. DC-PROVIDER-001 retires when this
  entry propagates into `dev/compat`.
- Base: upstream keys custom model loaders by provider ID, and only the
  built-in `xai` provider calls `sdk.responses()`. A provider defined in config
  with `npm: "@ai-sdk/xai"` has no loader, so `getLanguage` falls back to
  `sdk.languageModel()`, which `@ai-sdk/xai` maps to Chat. `sdkKey()` has no
  `@ai-sdk/xai` entry either, so `providerOptions()` files that provider's
  options (`reasoningEffort`, `store: false`, `promptCacheKey`) under its own
  provider ID; the SDK reads only `xai` and silently drops them. Separately,
  `@ai-sdk/openai` infers reasoning from OpenAI model names, so a compatible
  endpoint's reasoning model such as Grok loses its effort and summary unless
  `forceReasoning` is set.
- Observable contract:
  - A model without a provider-ID loader whose `api.npm` is `@ai-sdk/xai` gets
    `sdk.responses()`. `sdkKey("@ai-sdk/xai")` returns `xai`, which also remaps
    stored message `providerOptions` from the provider ID to `xai`, so replayed
    reasoning items keep their `itemId` and encrypted content.
  - `providerOptions()` defaults `forceReasoning: true` for `@ai-sdk/openai`
    models declaring `capabilities.reasoning`, on ordinary and small-model
    requests alike. Explicit options override the default, so
    `forceReasoning: false` opts out. This enables the SDK's
    encrypted-reasoning include with `store: false`. Non-reasoning models and
    other SDKs keep their previous options. No model-name heuristic or
    gateway-specific rule is involved.
- Delta: for the built-in `xai` provider the key already equals its ID and its
  loader already selects Responses, so nothing changes there. Every other
  provider ID on `@ai-sdk/xai` moves from Chat to Responses, and its configured
  options reach the SDK. The bundled `@ai-sdk/xai` (3.0.102) Responses option
  schema accepts only `none`/`low`/`medium`/`high` for `reasoningEffort`, so an
  `xhigh` variant on such a provider fails SDK validation instead of being
  dropped. That enum is an adapter limit, not a model one: Grok 4.7 and 4.6
  support `xhigh` (<https://docs.x.ai/developers/model-capabilities/text/reasoning>),
  which an OpenAI-compatible gateway can carry through `@ai-sdk/openai`.
- Boundaries: providers with their own loader are unchanged. The reasoning
  default is scoped to `@ai-sdk/openai` and reasoning-capable models.
  Strict-tool defaults are unchanged; `@ai-sdk/xai` stays out of
  `EXPLICIT_NON_STRICT_TOOL_SDKS` for the reason recorded beside that list.
  FC-025 matches Grok on its model id, so its `operation` flattening applies
  on either SDK and is independent of this routing. Upstream's declared model
  output limits, sampling and effort capabilities (`c9c91d7b`, adopted
  2026-11-13) apply on top of these corrections; an `xhigh` config on the
  pinned xAI adapter is rejected before any HTTP request, with no silent
  downgrade or dependency upgrade.
- Upstream relationship: upstream `3a12665a` has neither the `@ai-sdk/xai`
  fallback nor the `sdkKey` entry nor the reasoning default. Fork fix;
  `dev/compat` inherits it.
- Watch surfaces: `Provider.getLanguage` and its `modelLoaders`, `sdkKey`,
  `providerOptions` and the `EXPLICIT_NON_STRICT_TOOL_SDKS` notes, and any
  `@ai-sdk/xai` or `@ai-sdk/openai` version bump.
- Tests/evidence: `packages/cli/test/provider/xai-config-provider.test.ts`
  runs `Provider.Service` through the Effect harness against a local gateway
  and captures the actual request: one POST to `<baseURL>/responses` with
  `reasoning.effort`, `store: false` and the encrypted-reasoning include.
  Removing the `getLanguage` fallback fails it on `xai.chat`; removing the
  `xai` SDK key fails it on the missing reasoning options.
  `packages/cli/test/provider/transform.test.ts` ("uses xai key for a config
  provider on @ai-sdk/xai") and
  `packages/cli/test/provider/openai-responses-reasoning.test.ts` serialize
  real SDK requests for six Grok ids (including `xhigh` for 4.7 and 4.6),
  small-model requests, the explicit opt-out and the SDK scope. On compat, eight
  isolated CLI runs across six Grok ids through a local capture proxy verified
  streamed `/v1/responses`, unchanged effort values, session cache keys,
  `store: false` and exact encrypted-reasoning replay on tool loops; these
  prove transport and replay, not an effect of effort on reasoning volume.
  2026-11-07 port to `main` (local Bun 1.4.3, CI pins 1.3.14; every ambient
  `MIMOCODE_*` variable removed): with only the tests ported, eight cases fail
  against main's source (the wire test, the `xai` key, five reasoning-model
  serializations and the SDK-scope case); with the source ported, the four
  provider files pass 391 tests with 0 failures. Compat's Promise-style copy
  of the wire test in `provider.test.ts` became the Effect-harness file above
  and is removed from compat on propagation. `test/provider` (without the three
  refresh suites CI runs in their own processes), the whole
  `test/session/prompt-effect.test.ts` (221 pass, 2 skip) and eight other
  `@ai-sdk/openai` consumer suites show no new failure. The only remaining
  failures, two `provider-event-timeout` keep-alive cases, fail identically on
  main's unchanged source on that host. Package typecheck passes.
- Retirement condition: upstream routes config providers by SDK package,
  through an equivalent fallback or a declared per-provider API choice, and
  honors declared reasoning capabilities for compatible models without relying
  solely on model names. The regression cases stay in either case.

## FC-054 — a log sink that stops answering cannot hold the log queue

- Status: active
- Canonical owner: fork `main` — `append`, `open` and `close` in
  `packages/cli/src/util/log.ts`
- Base: upstream serializes every log operation on one promise queue. Each
  `append` waits for `stream.write`'s callback; `open` waits for the stream's
  `open` or `error` event, and rotation, reinitialization and `Log.shutdown`
  wait for `close`. None of these waits is bounded.
- Observable contract: a write, open or close that has not settled within
  `writeTimeout` (5 s by default; `Log.init` option) stops holding the queue.
  A stalled write abandons its stream and keeps appending to the same file
  through a new one. A stalled close destroys the stream and continues. A
  stalled open counts as a failed sink, which drops records as an unusable log
  directory does. Writes that settle in time behave exactly as upstream's.
- Evidence: on Linux CI an instrumented dispatch (run 44972702047) caught
  `append` waiting on a `stream.write` callback that never arrived. The stream
  was open, with 76 bytes buffered and no drain pending, and about 26,000
  operations were queued behind it until `lsp/client`'s `Log.init` hit its
  120-second hook timeout. Repeating the triggering busy-SSE disposal 100
  times in isolated processes (run 44991169360) never stalled, so the trigger
  depends on earlier work in the same process. The mechanism inside Bun's
  file stream is not identified. Upstream `33943835` records the same stall as
  an unknown follow-up and notes that production `Log.shutdown` waits on that
  queue.
- Known limits: the stalled record itself may be lost or written late. A
  healthy write slower than `writeTimeout` also replaces its stream; later
  records still reach the same file. FC-008's isolation of `bus-integration`
  remains, so CI avoids the known trigger. A Linux CI check put the suite back in the
  same Bun process as `lsp/client` (run 45021920193). All 162 files finished
  in 208 seconds, but the shared log queue exceeded its one-second flush budget
  during the bus tests. The regular shards keep the isolated suite.
- Upstream relationship: fork hardening of shared upstream code; `dev/compat`
  inherits it.
- Watch surfaces: `append`, `open`, `close`, `rotate` and `closeCurrent` in
  `packages/cli/src/util/log.ts`, and the flush budget in
  `packages/cli/test/lib/effect.ts`.
- Tests/evidence: `packages/cli/test/util/log.test.ts` "a write whose callback
  never arrives does not hold the queue" withholds one callback and requires
  the queue, later records and the reopened file to proceed. "a stream that
  never closes does not hold reinitialization or shutdown" covers close.
  With the write bound disabled, the first case fails on its assertion.
- Exit condition: retire when upstream bounds the sink, or when Bun's file
  stream is shown to deliver every callback, demonstrated by shard-level CI
  with the bound removed and `bus-integration` back in its hash shard.

## FC-055 — a declared Gemini `xhigh` thinking level reaches the request

- Status: active
- Canonical owner: fork `main` — `patches/@ai-sdk%2Fgoogle@3.0.73.patch` with its
  `patchedDependencies` entry, and `GOOGLE_SDK_EFFORTS` / `googleEffort` in
  `packages/cli/src/provider/transform.ts`
- Base: upstream pins `@ai-sdk/google` 3.0.73, whose provider-options schema
  accepts `thinkingConfig.thinkingLevel` only as `minimal`/`low`/`medium`/`high`,
  and `googleEffort` drops every other level. models.dev declares
  `low`/`medium`/`high`/`xhigh` for Gemini 4 Neon and Hydrogen (Carbon and Argon
  stop at `high`), so their `xhigh` variant was silently missing, and an `xhigh`
  written in config failed with "invalid google provider options" before any
  request.
- Observable contract: the patch adds `xhigh` to the two `thinkingLevel` enums
  (Generate Content and Interactions options) in every `dist` build and type
  declaration, exactly as the SDK's own changeset `271ca50` does from 3.0.146;
  nothing else in the adapter changes. `@ai-sdk/google-vertex` depends on the
  same 3.0.73 install, so both direct SDKs use `GOOGLE_SDK_EFFORTS` and offer a
  model's declared `xhigh`; a level the model does not declare is still never
  added. `@ai-sdk/gateway` and the SAP provider keep the four-level set, because
  their upstream schemas are not verified to accept `xhigh`; GitHub Copilot sends
  no Gemini effort at all, as before.
- Upstream relationship: fork patch of a dependency upstream ships unpatched;
  `dev/compat` inherits it.
- Watch surfaces: the `patchedDependencies` entry and `bun.lock`, any
  `@ai-sdk/google` or `@ai-sdk/google-vertex` version change, and `googleEffort`,
  `GOOGLE_EFFORTS` and `GOOGLE_SDK_EFFORTS` in `transform.ts`.
- Tests/evidence: `packages/cli/test/provider/google-thinking-level-wire.test.ts`
  drives the real adapter with the provider options `ProviderTransform` produces
  and reads the request body: a declared and a configured `xhigh` reach
  `generationConfig.thinkingConfig`, while `max` is still rejected. With the
  installed enum reverted, the two `xhigh` cases fail on the thrown validation
  error. `test/provider/transform.test.ts` "direct Google SDKs offer a declared
  xhigh, gateways fronting Gemini drop it" fails when `googleEffort` uses the
  four-level set for the direct SDKs. A fresh `bun ci` reapplies the patch.
  On 2026-11-24 `mimo run` from this source with `--variant xhigh` against a
  Gemini 4 Neon `/v1beta` gateway sent `thinkingLevel: "xhigh"` on both turns of
  a tool round trip, where the installed pre-patch binary stopped at "invalid
  google provider options".
- Exit condition: retire the patch and `GOOGLE_SDK_EFFORTS` when upstream pins
  `@ai-sdk/google` >= 3.0.146 and lets `googleEffort` send `xhigh`.

## FC-056 — file hooks load from a compiled Windows binary

- Status: active
- Canonical owner: fork `main` — `importFromDisk` and `diskLoader` in
  `packages/cli/src/plugin/index.ts`, used by the file-hook loader
- Base: upstream transpiles each `.mimocode/hook(s)/*.{js,ts}` file with
  `Bun.build`, writes the artifact next to the hook as `<hook>.<time>.mjs`, and
  `import()`s it from the plugin service. In a compiled Windows binary an
  `import()` issued by the binary's embedded code cannot see a file created in
  a directory it has already read, so every file hook failed with
  "Cannot find module '<hook>.<time>.mjs' from 'B/~BUN/root/chunk-….js'" while
  `bun run` loaded it. Neither a file URL nor a bare path changes this.
- Observable contract: an `import()` issued by a module on disk does see the
  file. Once per process the loader writes a one-line module
  (`export default (url) => import(url)`) into a new temporary directory, which
  the embedded code has never read, imports it, removes the directory, and
  imports every hook artifact through it by file URL. The artifact stays next
  to its hook, so `import.meta`, top-level await, host SDK imports and hot
  reload are unchanged. If the loader cannot be created it logs a warning and
  imports directly, as upstream does. `require()` is not used: in the running
  CLI it rejects every file, including a pre-existing CommonJS file, as an
  "async module".
- Upstream relationship: fork fix of upstream's file-hook loader; `dev/compat`
  inherits it.
- Watch surfaces: the file-hook loading block in `plugin/index.ts`
  (`Bun.build`, the artifact path, `importFromDisk`) and any Bun upgrade that
  changes standalone module resolution.
- Tests/evidence: `packages/cli/test/plugin/file-hooks.test.ts` "keeps
  import.meta at the hook's own directory" and "loads a hook with asynchronous
  top-level await next to other hooks" pin what a loader change could break;
  the suite passes 7/7 and `test/plugin/host-sdk.test.ts` "serves
  @mimo-ai/plugin to file hooks" passes. Plain `bun test` does not reproduce
  the compiled-binary failure. On 2026-11-25 a local single-target Windows
  build loaded two file hooks that the previously installed binary rejected
  with "Cannot find module": a probe hook whose module code ran with
  `import.meta` in its `hooks` directory, and a project hook that imports a
  sibling plugin module.
- Known upstream behavior now reachable on Windows binaries, unchanged here:
  the trigger snapshots a hook's output with `structuredClone`, which throws
  `DataCloneError` for `tool.definition` output (its zod schema), and a hook
  with an `event` handler can keep a one-shot command from exiting.
- Exit condition: retire `importFromDisk` when a compiled Windows binary on
  the pinned Bun imports a freshly written artifact from embedded code; re-test
  on each Bun upgrade.
