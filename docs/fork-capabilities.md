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
- Last reviewed: 2026-09-02
- Upstream: `2a0eb706e95a77cba34a319e9f11f33f26d4450c`
- Prior reviewed upstream: `3282b34c46281dc8cd0610433d676a5ec93baa6e`
- Main behavior: `dad492e0af72d22d3ec796f6814eda7e52ed51a8`
- Prior fork `main` tip: `28c1f36c8a3bc85bda7e3691960e7d0b531b8636`
- History: [fork-registry-history.md](fork-registry-history.md)

`Upstream` and `main behavior` name the source/test trees reviewed here. A pure
registry or history commit does not advance either behavior reference.

## Sync index

| ID | Watch surfaces | Upstream relationship | Required decision |
| --- | --- | --- | --- |
| FC-001 | actor, inbox, runner, session state, recovery/resume | Typed upstream admission plus stronger fork lifecycle | Preserve atomic admission and linearization |
| FC-002 | checkpoint writer and frozen request prefix | Extension plus adaptation | Preserve writer-mode semantics |
| FC-003 | read/edit state and instance disposal | Fork hardening | Preserve actor/instance scope |
| FC-004 | MCP configuration, connection state, and local exit diagnostics | Fork hardening | Preserve validation, redaction, and isolation |
| FC-005 | skill discovery and invocation | Stronger shared gates | Preserve permission parity |
| FC-006 | plugin progress-checker configuration | Fork integration hardening | Preserve instance-local decision |
| FC-007 | project roots, fixed instance cwd, Auto-Worktree notice, inert SDK event, optional context, Bash deletion | Shared fixed cwd and SDK compatibility plus fork safety boundary | Preserve exact path, mutation, and cwd boundaries |
| FC-008 | workflow cleanup, detached Effect context, validation, and CI/reporting | Runtime/process hardening | Preserve bounds, scoped services, clean defaults, and fail-closed evidence |
| FC-009 | synthetic messages, text parts, and retry boundary | Adapted upstream stream/retry handling | Preserve provenance and prevent side-effect replay |
| FC-010 | WebFetch and SSRF destination classification | Adapted contract plus fork hardening | Preserve complete `fe80::/10` classification, per-hop authorization, and resource bounds |
| FC-011 | model prompts, path guidance, and bundled skills | Fork-facing guidance | Preserve factual shared guidance |
| FC-012 | publication, contribution, security | Fork-specific process | Preserve fork routing |
| FC-013 | MaxMode final step and bounded retry | Shared retry plus fork hardening | Preserve tool-free terminal step and status isolation |
| FC-014 | `.cursor/environment.json` Cloud Agent dev environment | Fork-only infra absent from upstream | Preserve Bun bootstrap and read-only `upstream` remote; never send to upstream |
| FC-015 | compaction context budget, projection, frozen prefix, and trigger ratio | Upstream controls plus fork safety adaptation | Preserve reserve headroom, no-tool summaries, and config precedence |
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
  typed `Session.BusyError`. Recovery and resume remain main-only, accept no
  agent/task selector, and have no detached `resumeBackground` path. Unknown or
  ambiguous lifecycle callers fail closed. Frozen-context admission is owned
  separately by FD-009. Title locale propagation through prompt, command, and
  main-only resume paths does not broaden recovery/resume beyond the main agent.
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
- Upstream relationship: selectively adopts upstream typed Runner admission and
  busy failures plus actor-scoped `replace-agent`, while retaining the stronger
  fork generation, cancellation, disposal, persistent-peer, fail-closed identity
  evidence, and main-only recovery/resume protocol.
- Watch surfaces: `packages/opencode/src/actor/`,
  `packages/opencode/src/effect/runner.ts`, `packages/opencode/src/inbox/`,
  `packages/opencode/src/server/routes/instance/session.ts`,
  `packages/opencode/src/session/llm.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/session/run-state.ts`,
  `packages/opencode/src/tool/actor.ts`, and
  `packages/opencode/src/tool/session.ts`.
- Tests/evidence: actor lifecycle/cancel/spawn/turn suites,
  `packages/opencode/test/inbox/fork-agent-compat.test.ts`, inbox wake/retirement
  tests, `packages/opencode/test/effect/runner.test.ts`, server prompt/recovery
  and resume admission tests, session run-state tuple/disposal tests,
  main-only OpenAPI regressions, replace-agent actor-scope regressions, and
  actor/session tool tests at the reviewed main behavior.
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- 2026-08-28 review: adopted strict spawn/run argument rejection and the
  existing `send` follow-up path while preserving caller-resolution,
  generation, persistent wake, and frozen-context fail-closed contracts.
- Retirement condition: upstream provides equivalent generation ownership,
  typed atomic main prompt/command/init/shell/summarize/recovery/resume
  admission, main-only recovery/resume identity, cancellation settlement,
  stale-idle exclusion, persistent-peer wake, tombstone, and parent-notice
  guarantees plus positive known-peer evidence for parent identity replacement,
  with behavior-focused regressions.

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
  decision.
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
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
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
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- Retirement condition: upstream provides equivalent session/actor/instance
  scoping, consumption, and disposal behavior with cross-actor/project tests.

## FC-004 — MCP configuration and connection lifecycle

- Status: active
- Canonical owner: fork `main` MCP runtime
- Observable contract: remote MCP URLs must parse as HTTP(S); malformed or
  unsupported values produce a stable failed status before client creation.
  Claude-imported entries remain pending until explicit connection, and
  request-local discovery/loaded-tool membership stays isolated across sessions
  and frozen forks. Local stdio servers retain bounded exit and stderr
  diagnostics across fast natural exits and host shutdown; secrets are redacted
  before either logs or failed status details expose the diagnostic.
- Upstream relationship: fork validation and lifecycle hardening.
- Watch surfaces: `packages/opencode/src/mcp/index.ts`,
  `packages/opencode/src/mcp/oauth-callback.ts`,
  `packages/opencode/src/mcp/oauth-provider.ts`,
  `packages/opencode/src/mcp/stdio-transport.ts`, plus request-local MCP
  propagation in session prefix and tool-registry code.
- Tests/evidence: `packages/opencode/test/mcp/lifecycle.test.ts`,
  `packages/opencode/test/mcp/oauth-auto-connect.test.ts`,
  `packages/opencode/test/mcp/oauth-browser.test.ts`,
  `packages/opencode/test/mcp/oauth-callback.test.ts`, the isolated real-process
  `packages/opencode/test/mcp/stdio-exit-observe.test.ts`, and frozen
  prefix/tool-search regressions prove URL rejection, pending imports, OAuth
  callback/connection behavior, redacted exit diagnosis, and request isolation
  at the reviewed main behavior.
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- 2026-09-01 OAuth branding review: adopted upstream's MiMoCode callback-page
  and dynamic-registration literals. This is a clean carrier overlap only;
  URL validation, pending-import state, request isolation, bounded diagnostics,
  and secret redaction are unchanged.
- Retirement condition: upstream matches URL validation, pending-import
  lifecycle, request isolation, and frozen membership; model identity and tool
  authority still satisfy FD-005 and FD-006.

## FC-005 — permission-consistent skill discovery and invocation

- Status: active
- Canonical owner: fork `main` skill/session runtime
- Observable contract: skill listing, reminders, search, and loading use the
  same effective permission, agent allowlist, and user tool toggles. Stable
  global discovery runs in a scoped producer that one caller cannot cancel;
  failures remain retryable and reload invalidates the generation. The model
  history contains immutable, hash-versioned full catalog snapshots; an
  unchanged catalog is not duplicated, while a changed catalog appends a new
  snapshot without rewriting prior turns or weakening permission/tool filters.
- Upstream relationship: upstream discovery is retained with stronger shared
  permission and producer-lifetime gates.
- Watch surfaces: `packages/opencode/src/skill/index.ts`,
  `packages/opencode/src/skill/search-access.ts`,
  `packages/opencode/src/session/skill-catalog.ts`,
  `packages/opencode/src/session/message-v2.ts`,
  `packages/opencode/src/tool/skill.ts`,
  `packages/opencode/src/tool/skill-search.ts`,
  `packages/opencode/src/session/system.ts`, and
  `packages/opencode/src/session/prompt.ts`.
- Tests/evidence: skill search/description/discovery suites, tool skill/search
  suites, and versioned prompt skill-command snapshot tests at the reviewed main
  behavior.
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- Retirement condition: upstream uses one effective permission/tool decision
  across discovery and invocation and provides equivalent retryable,
  generation-aware producer behavior plus immutable hash-versioned snapshots
  that append on catalog change without rewriting history; FD-006 remains the
  tool-authority owner.

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
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
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
  Optional context lookup supports pre-install state without weakening the
  throwing accessor used by ordinary runtime paths. When explicitly enabled,
  Auto-Worktree guidance is emitted only after a successful main-worktree
  mutation, only for a primary root session, and only once per session; omitted
  or false configuration remains silent. Detection consumes completed absolute
  tool metadata and does not cache a pre-repository negative lookup.
- Upstream relationship: adopts the shared fixed-instance-cwd simplification
  and inert SDK event compatibility while retaining fork root and deletion
  safety hardening; FD-001 separately owns yolo delete-approval state.
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
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- Retirement condition: upstream retains fixed instance cwd and supplies
  equivalent inert compatibility schema, protected-root, project/worktree
  containment, fixed-cwd relative file-tool resolution, MultiEdit normalization,
  deletion, and optional-context semantics without forbidding legitimate
  temporary projects.

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
  CI triggers on `main`, `dev`, and `dev/compat`, retains `.test.tsx`
  discovery, assigns all ordinary inputs by a stable path hash, runs enabled
  worktree cases in normal shards, and isolates only the real stdio observer
  process from process-global mocks. Each shard removes its prior report and
  then requires strict XML/count consistency, at least one executed case, a
  non-empty suite for every reported file, and exact expected-file coverage.
  The explicit Linux zero-case inputs are still loaded by Bun and excluded only
  from the expected suite set, so a future registered case fails as unexpected
  until the allowlist is retired.
- Upstream relationship: stronger runtime cleanup plus a narrower quarantine
  than the reviewed upstream workflow.
- Watch surfaces: `packages/opencode/src/effect/hard-timeout.ts`,
  `packages/opencode/src/effect/bridge.ts`,
  `packages/opencode/src/flag/flag.ts`,
  `packages/opencode/src/workflow/runtime.ts`,
  `packages/opencode/bunfig.toml`, `packages/opencode/test/preload.ts`,
  `packages/opencode/test/workflow/runtime-worktree.test.ts`, and
  `.github/workflows/test.yml`, `.github/scripts/verify-junit.py`,
  `.github/workflows/lint.yml`,
  `.github/workflows/typecheck.yml`, and `AGENTS.md`.
- Tests/evidence: hard-timeout, runner, workflow runtime/worktree suites, four
  complete local hash shards, positive/negative JUnit verifier fixtures, and
  exact-SHA CI for the reviewed behavior tree when published; local tests do not
  substitute for that remote evidence.
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- 2026-08-25 publication companion: the `AGENTS.md` default-environment rule is
  a process-only registry companion and does not advance the frozen main
  behavior or its changed-path calculation.
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
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
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
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
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
  This guidance does not widen runtime authority. Model-visible CI reminders
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
  valid fallback.
- Upstream relationship: fork-facing guidance plus selectively adopted upstream
  documentation improvements.
- Watch surfaces: `packages/opencode/src/session/prompt/default.txt`,
  MiniMax/GPT prompt text, actor shell tokenizer/help, TUI skill i18n, and
  bundled `pdf-official` and `mimocode-docs` content.
- Tests/evidence: session system, including the actionable task/actor guidance
  regression, actor-shell, skill-description,
  `packages/opencode/test/skill/mimocode-docs.test.ts`, and bundled-content
  reviews at the main behavior SHA. `packages/opencode/test/skill/builtin.test.ts`
  binds the shipped PPTX guidance to the available-tool and WebFetch facts.
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
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
- Retirement condition: the corresponding prompts/content cease to ship or
  upstream guidance is factually equivalent for fork branch names, keys,
  runtime support, and user-facing errors.

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
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
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
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
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
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- Retirement condition: retire or replace when the base image ships the pinned
  Bun and preconfigures the read-only `upstream` remote, or when fork
  environment management moves out of the repository by an explicit governance
  decision. If upstream ever introduces its own `.cursor/environment.json`, a
  sync merge surfaces the conflict here; reconcile so the fork-owned config (or a
  reviewed replacement) wins rather than silently adopting the inherited file.
  Keep the `bun-v<version>` in `install` aligned with `packageManager` in
  `package.json`.

## FC-015 — bounded compaction context and reserve-safe trigger

- Status: active
- Canonical owner: shared `main` overflow and compaction boundary
- Observable contract: `compaction.max_context` has precedence over
  `MIMOCODE_COMPACTION_MAX_CONTEXT`; valid absolute, shorthand, percentage, and
  per-model wildcard values may lower the effective context window but cannot
  exceed the provider cap or consume required reserve/output headroom. A zero
  per-model value restores the provider window. The trigger ratio accepts a
  decimal or percentage in `(0, 1]`, defaults to `0.9`, and may trigger only
  earlier: `usable` is the minimum of the ratio boundary and the non-negative
  existing reserve boundary. Compression-time projection retains its summary,
  file manifest, and complete API rounds, but its tail budget is the smaller of
  40K tokens and the remaining usable window after the frozen system/tools and
  fixed projection content. Compaction reuses the frozen request prefix and
  keeps `toolChoice: "none"`; schema bytes remain cache-stable without granting
  summary-time tool execution.
- Upstream relationship: adopts upstream's max-context and ratio controls while
  adapting the flat ratio so it cannot replace the reserve safety contract.
- Watch surfaces: `packages/opencode/src/config/config.ts`,
  `packages/opencode/src/flag/flag.ts`,
  `packages/opencode/src/session/overflow.ts`,
  `packages/opencode/src/session/compaction.ts`,
  `packages/opencode/src/session/prefix-snapshot.ts`, and bundled configuration
  guidance in `mimocode-docs/reference/config.md`.
- Tests/evidence: `packages/opencode/test/session/overflow.test.ts` covers value
  grammar, invalid values, config/environment precedence, provider/input caps,
  reserve invariants, zero restoration, and ratio parsing/composition at the
  reviewed main behavior. `auto-overflow-writer-first.test.ts` disables the
  proactive checkpoint ladder and keeps a 25K usage sentinel where the
  reserve-safe boundary has fired but a flat 90% boundary has not.
  `compaction-projection.test.ts` and prompt-effect regressions bind the
  projection budget, frozen system/tool bytes, and no-tool summary policy.
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- 2026-08-28 review: adopted the explicit empty checkpoint threshold ladder
  from upstream's fixture retune, but rejected its 50K usage and flat-ratio
  explanation because both would hide removal of the reserve boundary.
- 2026-09-02 generated-contract review: adopted the missing published
  `CompactionPart.projection` schema and the deprecated `tail_turns` description
  by regenerating from fork source. The `preserve_recent_tokens` description
  retains the stronger at-most-40K plus reserve-safe effective-window bound.
- Retirement condition: upstream preserves equivalent configuration precedence,
  value grammar, provider caps, zero restoration, and the invariant that a
  ratio can only move compaction earlier without consuming reserve/output
  headroom, with behavior-focused regressions.

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
- Review basis: upstream `2a0eb706e95a77cba34a319e9f11f33f26d4450c`;
  main behavior `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- Retirement condition: upstream binds asynchronous voice results to a live
  Prompt/session owner, prevents stop/drain state races, converts editor offsets
  on grapheme boundaries, and supplies equivalent real-editor and lifecycle
  regressions.
