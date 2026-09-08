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
- Last reviewed: 2026-09-08
- Upstream: `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`
- Prior reviewed upstream: `ec3f989438d4b1f4e2b2c2044e1ecfc5327f45b7`
- Main behavior (runtime/tests): `85ce2094506417608777ff1c410a3dd070f42551`
- Bundled guidance content: `85ce2094506417608777ff1c410a3dd070f42551`
- Prior fork `main` tip: `d415822c29539a4b6eebeafb59de1b88da18b95c`
- History: [fork-registry-history.md](fork-registry-history.md)

`Upstream` remains the overall upstream review baseline. `Main behavior` names
the reviewed runtime/test tree; bundled guidance has a separate content snapshot.
Pure registry/history commits advance neither reference. The selected released
capability audit is recorded in [the model API review](released-model-api-review-2026-09-08.md).

## Sync index

| ID | Watch surfaces | Upstream relationship | Required decision |
| --- | --- | --- | --- |
| FC-001 | actor, inbox, runner, session state, recovery/resume | Typed upstream admission plus stronger fork lifecycle | Preserve synchronous admission and async queue persistence |
| FC-002 | checkpoint writer and frozen request prefix | Extension plus adaptation | Preserve writer-mode semantics |
| FC-003 | read/edit state and instance disposal | Fork hardening | Preserve actor/instance scope |
| FC-004 | MCP configuration, connection state, and local exit diagnostics | Explicit imported-server auto-connect plus fork hardening | Preserve validation, redaction, and isolation |
| FC-005 | skill discovery and invocation | Stronger shared gates | Preserve permission parity |
| FC-006 | plugin progress-checker configuration | Fork integration hardening | Preserve instance-local decision |
| FC-007 | project roots, fixed instance cwd, Auto-Worktree notice, inert SDK event, optional context, Bash deletion | Shared fixed cwd and SDK compatibility plus fork safety boundary | Preserve exact path, mutation, and cwd boundaries |
| FC-008 | workflow cleanup, detached Effect context, package test isolation, synchronization, and CI/reporting | Runtime/process hardening | Preserve bounds, scoped services, clean defaults, and fail-closed evidence |
| FC-009 | synthetic messages, text parts, and retry boundary | Adapted upstream stream/retry handling | Preserve provenance and prevent side-effect replay |
| FC-010 | WebFetch and SSRF destination classification | Adapted contract plus fork hardening | Preserve complete `fe80::/10` classification, per-hop authorization, and resource bounds |
| FC-011 | model prompts, path guidance, and bundled skills | Fork-facing guidance | Preserve factual shared guidance |
| FC-012 | publication, contribution, security | Fork-specific process | Preserve fork routing |
| FC-013 | MaxMode final step and bounded retry | Shared retry plus fork hardening | Preserve tool-free terminal step and status isolation |
| FC-014 | `.cursor/environment.json` Cloud Agent dev environment | Fork-only infra absent from upstream | Preserve Bun bootstrap and read-only `upstream` remote; never send to upstream |
| FC-015 | compaction context budget, projection, frozen prefix, and trigger ratio | Upstream trigger plus bounded fork projection | Preserve ratio parity, no-tool summaries, and config precedence |
| FC-016 | TUI voice Prompt ownership and grapheme-safe editor offsets | Upstream voice protocol plus fork lifecycle/editor hardening | Preserve owner identity, drain-before-idle, and grapheme boundaries |

## FC-001 — linearized actor generations and persistent-peer lifecycle

- Status: active
- Canonical owner: fork `main` actor/inbox runtime
- Observable contract: generation ownership, terminal claims, cancellation
  episodes, main prompt/command/init/shell/summarize/recovery/resume admission,
  busy/idle publication, persistent wake owner/follower behavior, detached
  graceful cancellation, inbox retirement tombstones, and parent notification
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
  Only `actor spawn --context full --lifecycle persistent` explicitly selects
  the existing persistent lifecycle for a full-context subagent; ordinary
  spawn and run retain their ephemeral defaults. No context-free persistent
  creation option is introduced through the actor tool.
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

- 2026-09-09 POLICY-02 review: registered/live-context recovery target selection,
  task consistency and missing-binding admission are integrated at `6ff976a97026610335dc367d8875a87d1d91d1a7`.
  The retained spawn task namespace, synchronous commit/ownership boundary and
  metadata-only background updates preserve existing task and message sources.
  HTTP/SDK/tool publication and actual provider/transaction regressions are
  recorded in the shared history; no cross-restart recovery is introduced.

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
  main behavior `b948ef02e6a44aa8eb8cdf67662d69335f58f6df`.
- Retirement condition: upstream exposes the same canonical writer, isolated
  child, mode-specific prefix ownership, aligned delta, disabled-checkpoint
  guidance behavior, and stable placeholder resolution only at filesystem-tool
  boundaries; FD-009 remains separately satisfied or retired.

## FC-003 — actor- and instance-scoped read-before-edit state

- Status: active
- Canonical owner: fork `main` read/edit tool runtime
- Observable contract: successful reads are remembered by session, actor, and
  owning directory instance. Edit validation consumes only matching state, and
  instance disposal removes only that directory's state. One actor or project
  cannot authorize another to edit an unread file.
- Upstream relationship: fork hardening beyond upstream read-before-edit state.
- Watch surfaces: `packages/opencode/src/tool/read-state.ts`,
  `packages/opencode/src/tool/read.ts`, `packages/opencode/src/tool/edit.ts`, and
  `packages/opencode/src/project/instance.ts`.
- Tests/evidence: `packages/opencode/test/tool/read-state.test.ts`,
  `packages/opencode/test/tool/edit.test.ts`, and instance-disposal regressions
  at the reviewed main behavior.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.
- Retirement condition: upstream provides equivalent session/actor/instance
  scoping, consumption, and disposal behavior with cross-actor/project tests.

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
  main behavior `b948ef02e6a44aa8eb8cdf67662d69335f58f6df`.
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
  enabled, disabled, absent, and instance-local configuration paths.
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
- 2026-09-07 explicit model API review: capability discovery and token-scoped
  chat/audio admission use a fixed startup directory. Requests cannot select a
  different directory or workspace; the new Node token export is opt-in host
  functionality. FD-004 remains the canonical listener/auth owner. Coverage:
  `test/server/model-api.test.ts`, shared `server/api-request.ts`, and CLI tests.
- POLICY-03 carrier review: TUI-generated Basic authentication is distinct
  from operator configuration. Both instance-route directory guards and the
  non-loopback bind guard preserve their operator-origin policy; automatic
  credentials cannot authorize a broader directory. Model tokens retain their
  exact startup directory and reject workspace switching regardless of Basic
  credentials. Existing orchestrator and explicit noAuth exceptions retain
  their original scope. The fixed-cwd and deletion contracts above are unchanged.
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
- Upstream relationship: stronger runtime cleanup plus a narrower quarantine
  than the reviewed upstream workflow; adopts its package-scoped enterprise
  storage fixture.
- Watch surfaces: `packages/opencode/src/effect/hard-timeout.ts`,
  `packages/opencode/src/effect/bridge.ts`,
  `packages/opencode/src/flag/flag.ts`,
  `packages/opencode/src/workflow/runtime.ts`,
  `packages/opencode/src/workflow/sandbox.ts`,
  `packages/opencode/bunfig.toml`, `packages/opencode/test/preload.ts`,
  `packages/opencode/test/workflow/runtime-worktree.test.ts`,
  `packages/enterprise/bunfig.toml`, `packages/enterprise/test/preload.ts`,
  `packages/enterprise/src/core/storage.ts`,
  `packages/enterprise/test/core/storage.test.ts`,
  `packages/enterprise/test/core/share.test.ts`,
  `.mimocode/skills/upstream-sync/SKILL.md`,
  `.github/workflows/test.yml`, `.github/scripts/verify-junit.py`,
  `.github/workflows/lint.yml`,
  `.github/workflows/typecheck.yml`, and `AGENTS.md`.
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
- 2026-09-05 fixture review: removed `resetDatabase` and its four call sites,
  preserving local disposal and the fork project-init authorization fixture.
  Rejected incoming auth-override, fork-prefix, and failed-subtask skips: the
  fork already has relevant fixture isolation and all three pass on both
  pre-sync branch SHAs. Existing unrelated CI timeouts are tracked separately;
  this decision does not claim that the fixture removal fixes those failures.
- 2026-09-07 model API lifecycle review: token verification precedes body and
  bootstrap; both optional API modes use bounded uploads and cancellation-aware
  instance waiting. SSE retains admission and its instance lease until EOF or
  producer cancellation acknowledgement, including cancellation at response
  handoff. Bun cancellation uses an explicit SSE error and close; unrelated
  shared bootstrap producers remain owned by their original callers. CLI stop
  closes admission before instance disposal. Direct and native HTTP regressions
  cover these seams without changing the ordinary actor/workflow lifecycle.
- Selected model API evidence: CLI test children have a 20-second execution
  bound, unconditional kill and a bounded two-second drain on cleanup; multi-child
  cases declare their total 60-second budget. Image/SDK cancellation and Node
  checks cover adjacent API resources, not a rerun of all workflow lifecycle tests.
- POLICY-03 lifecycle review: the TUI worker stops model API admission and
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
- Retirement condition: runtime bounds may retire only with equivalent upstream
  settlement. The single test skip retires after the disposer is fixed and
  bounded exact-SHA CI proves process exit.

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

## FC-010 — WebFetch and SSRF destination classification, authorization, and resource bounds

- Status: active
- Canonical owner: shared `main` WebFetch and SSRF destination-classification boundary
- Observable contract: WebFetch accepts only HTTP(S). Destination classification
  runs before permission for the initial URL and every manual redirect target,
  blocking classified private/internal numeric targets and hostname results,
  including the complete IPv6 link-local `fe80::/10` range. Each target that passes
  classification triggers the effective `webfetch` permission before its
  request; a rejected target stops before its permission ask and request.
  Redirects are capped at 10 hops, the request timeout applies, and responses
  larger than 5 MB are rejected.
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
  scheme enforcement, the 10-hop cap, timeout, and 5 MB bound; that test file
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
  valid fallback. Bundled `mimocode-docs` also documents the TUI-owned default
  model API, explicit `serve`/embedding modes and explicit token issuance,
  bounded public image and inline audio inputs, verified SDK transcription,
  provider option whitelist, explicit model scopes, and independent lifetime
  controls; the content snapshot is recorded separately from runtime/tests.
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
- POLICY-03 content carriers: `docs/model-api.md`, `docs/audio-api.md`, and
  bundled `mimocode-docs/reference/model-api.md` and `commands.md` distinguish
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

## FC-013 — MaxMode final-step and bounded retry enforcement

- Status: active
- Canonical owner: fork `main` session run loop
- Observable contract: MaxMode orchestration may run before the configured
  final step, but the final step uses the ordinary processor so
  `toolChoice: "none"` forces a text-only response and terminates the loop.
  MaxMode cannot continue tool calls beyond the final-step boundary. Candidate
  and judge calls use bounded configurable retry with fresh attempt-local
  accumulators. Eligible subagents may execute MaxMode, but only the main agent
  may publish session-global retry status or `RetryAttempt` events.
- Upstream relationship: adopts shared bounded retry while retaining fork
  final-step enforcement and subagent status isolation.
- Watch surfaces: `packages/opencode/src/session/max-mode.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/session/retry.ts`,
  `packages/opencode/src/session/status.ts`, and processor final-step routing.
- Tests/evidence: the MaxMode final-step regressions in
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
  file manifest, and complete API rounds, but its tail budget is the smaller of
  40K tokens and the remaining usable window after the frozen system/tools and
  fixed projection content. Compaction reuses the frozen request prefix and
  keeps `toolChoice: "none"`; schema bytes remain cache-stable without granting
  summary-time tool execution. Complete authorized definitions remain available
  for frozen rebinding, while compaction sends and budgets only the frozen
  advertised subset. Its file manifest includes retained validated terminal
  nested exec effects within the snapshot budget; these read-only views never
  create tool-execution authority.
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
  main behavior `b948ef02e6a44aa8eb8cdf67662d69335f58f6df`. The selected trigger
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
