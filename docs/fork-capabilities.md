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
- Last reviewed: 2026-08-24
- Upstream: `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`
- Prior reviewed upstream: `f57520c08d4d10e64ac035e90ba561e889119c98`
- Main behavior: `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`
- Prior fork `main` tip: `f63e6d4ee2eb26d7c43de32c69f61ae754b6eff0`
- History: [fork-registry-history.md](fork-registry-history.md)

`Upstream` and `main behavior` name the source/test trees reviewed here. A pure
registry or history commit does not advance either behavior reference.

## Sync index

| ID | Watch surfaces | Upstream relationship | Required decision |
| --- | --- | --- | --- |
| FC-001 | actor, inbox, runner, session state | Stronger lifecycle protocol | Preserve linearization |
| FC-002 | checkpoint writer and frozen request prefix | Extension plus adaptation | Preserve writer-mode semantics |
| FC-003 | read/edit state and instance disposal | Fork hardening | Preserve actor/instance scope |
| FC-004 | MCP configuration and connection state | Fork hardening | Preserve validation and isolation |
| FC-005 | skill discovery and invocation | Stronger shared gates | Preserve permission parity |
| FC-006 | plugin progress-checker configuration | Fork integration hardening | Preserve instance-local decision |
| FC-007 | project roots, optional context, Bash deletion | Fork safety boundary | Preserve exact path boundaries |
| FC-008 | workflow cleanup and CI | Runtime/process hardening | Preserve bounds and targeted quarantine |
| FC-009 | synthetic messages and text parts | Adapted upstream stream handling | Preserve provenance and lifecycle |
| FC-010 | WebFetch and SSRF destination classification | Adapted contract plus fork hardening | Preserve complete `fe80::/10` classification, per-hop authorization, and resource bounds |
| FC-011 | model prompts and bundled skills | Fork-facing guidance | Preserve factual shared guidance |
| FC-012 | publication, contribution, security | Fork-specific process | Preserve fork routing |
| FC-013 | MaxMode final step | Fork hardening | Preserve tool-free terminal step |

## FC-001 — linearized actor generations and persistent-peer lifecycle

- Status: active
- Canonical owner: fork `main` actor/inbox runtime
- Observable contract: generation ownership, terminal claims, cancellation
  episodes, persistent wake owner/follower behavior, detached graceful
  cancellation, inbox retirement tombstones, and parent notification are
  linearized per session and actor. Unknown or ambiguous lifecycle callers fail
  closed. Frozen-context admission is owned separately by FD-009.
- Upstream relationship: stronger fork lifecycle protocol layered over upstream
  actor execution.
- Watch surfaces: `packages/opencode/src/actor/`,
  `packages/opencode/src/effect/runner.ts`, `packages/opencode/src/inbox/`,
  `packages/opencode/src/session/run-state.ts`,
  `packages/opencode/src/tool/actor.ts`, and
  `packages/opencode/src/tool/session.ts`.
- Tests/evidence: actor lifecycle/cancel/spawn/turn suites,
  `packages/opencode/test/inbox/fork-agent-compat.test.ts`, inbox wake/retirement
  tests, `packages/opencode/test/effect/runner.test.ts`, and actor/session tool
  tests at the reviewed main behavior.
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: upstream provides equivalent generation ownership,
  cancellation settlement, persistent-peer wake, tombstone, and parent-notice
  guarantees with behavior-focused regressions.

## FC-002 — canonical checkpoint writer and mode-specific frozen context

- Status: active
- Canonical owner: fork `main` checkpoint/session runtime
- Observable contract: checkpoint generation uses one canonical writer tool and
  an isolated child session. Forked mode uses the parent agent's frozen prefix;
  default mode uses the checkpoint writer's own frozen system, tools, MCP
  membership, and permission with the aligned message delta. Disabling
  checkpoint generation removes checkpoint-only clauses while retaining durable
  project/global memory and notes guidance. FD-009 exclusively owns the
  fail-closed capture admission decision.
- Upstream relationship: fork extension plus adapted request construction.
- Watch surfaces: `packages/opencode/src/session/checkpoint.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/session/prefix-capture-ref.ts`,
  `packages/opencode/src/session/llm.ts`, and
  `packages/opencode/src/session/prompt.ts`.
- Tests/evidence: checkpoint child-session, fork-mode, main-slice,
  prefix-capture, rebuild, watermark, writer-timeout, memory-write, and
  system-prompt suites at the reviewed main behavior.
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: upstream exposes the same canonical writer, isolated
  child, mode-specific prefix ownership, aligned delta, and disabled-checkpoint
  guidance behavior; FD-009 remains separately satisfied or retired.

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
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: upstream provides equivalent session/actor/instance
  scoping, consumption, and disposal behavior with cross-actor/project tests.

## FC-004 — MCP configuration and connection lifecycle

- Status: active
- Canonical owner: fork `main` MCP runtime
- Observable contract: remote MCP URLs must parse as HTTP(S); malformed or
  unsupported values produce a stable failed status before client creation.
  Claude-imported entries remain pending until explicit connection, and
  request-local discovery/loaded-tool membership stays isolated across sessions
  and frozen forks.
- Upstream relationship: fork validation and lifecycle hardening.
- Watch surfaces: `packages/opencode/src/mcp/index.ts` plus request-local MCP
  propagation in session prefix and tool-registry code.
- Tests/evidence: `packages/opencode/test/mcp/lifecycle.test.ts` and frozen
  prefix/tool-search regressions prove URL rejection, pending imports, and
  request isolation at the reviewed main behavior.
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: upstream matches URL validation, pending-import
  lifecycle, request isolation, and frozen membership; model identity and tool
  authority still satisfy FD-005 and FD-006.

## FC-005 — permission-consistent skill discovery and invocation

- Status: active
- Canonical owner: fork `main` skill/session runtime
- Observable contract: skill listing, reminders, search, and loading use the
  same effective permission, agent allowlist, and user tool toggles. Stable
  global discovery runs in a scoped producer that one caller cannot cancel;
  failures remain retryable and reload invalidates the generation.
- Upstream relationship: upstream discovery is retained with stronger shared
  permission and producer-lifetime gates.
- Watch surfaces: `packages/opencode/src/skill/index.ts`,
  `packages/opencode/src/skill/search-access.ts`,
  `packages/opencode/src/tool/skill.ts`,
  `packages/opencode/src/tool/skill-search.ts`,
  `packages/opencode/src/session/system.ts`, and
  `packages/opencode/src/session/prompt.ts`.
- Tests/evidence: skill search/description/discovery suites, tool skill/search
  suites, and prompt skill-command tests at the reviewed main behavior.
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: upstream uses one effective permission/tool decision
  across discovery and invocation and provides equivalent retryable,
  generation-aware producer behavior; FD-006 remains the tool-authority owner.

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
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: the progress-checker hook no longer writes memory or
  upstream supplies an equivalent instance-local decision without HTTP/cwd
  coupling.

## FC-007 — protected instance roots, deletion boundaries, and optional context

- Status: active
- Canonical owner: fork `main` instance and Bash path-safety boundary
- Observable contract: filesystem root and protected system directories cannot
  become project instances. A deletion target containing, equaling, or lying
  inside the active project/worktree cannot receive the temporary-file
  no-confirmation exemption. Optional context lookup supports pre-install state
  without weakening the throwing accessor used by ordinary runtime paths.
- Upstream relationship: fork safety hardening; FD-001 separately owns yolo
  delete-approval state.
- Watch surfaces: `packages/opencode/src/project/instance.ts`,
  `packages/opencode/src/util/local-context.ts`, and
  `packages/opencode/src/tool/bash.ts`.
- Tests/evidence: project path/worktree/instance-disposal suites,
  `packages/opencode/test/installation/no-instance.test.ts`, and
  `packages/opencode/test/tool/bash.test.ts` cover exact-path, prefix, and
  missing-context behavior.
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: upstream supplies equivalent protected-root,
  project/worktree containment, and optional-context semantics without
  forbidding legitimate temporary projects.

## FC-008 — bounded workflow cleanup and targeted CI quarantine

- Status: active process/runtime contract
- Canonical owner: fork `main` workflow runtime and repository CI
- Observable contract: non-success workflow cleanup bounds caller wait even
  when actor cancellation is uninterruptible, while detached cleanup continues.
  CI triggers on `main`, `dev`, and `dev/compat`, retains `.test.tsx` discovery,
  runs enabled worktree cases in normal shards, and skips only the known
  `deadline-fired` case pending its fixture-disposer fix.
- Upstream relationship: stronger runtime cleanup plus a narrower quarantine
  than the reviewed upstream workflow.
- Watch surfaces: `packages/opencode/src/effect/hard-timeout.ts`,
  `packages/opencode/src/workflow/runtime.ts`,
  `packages/opencode/test/workflow/runtime-worktree.test.ts`, and
  `.github/workflows/test.yml`, `.github/workflows/lint.yml`, and
  `.github/workflows/typecheck.yml`.
- Tests/evidence: hard-timeout, runner, workflow runtime/worktree suites and
  exact-SHA CI for the reviewed behavior tree when published; local tests do not
  substitute for that remote evidence.
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
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
- Upstream relationship: upstream text-part deferral adapted to fork hook and
  skill-activation rules.
- Watch surfaces: `packages/opencode/src/session/message-v2.ts`,
  `packages/opencode/src/session/processor.ts`,
  `packages/opencode/src/session/compaction.ts`, and synthetic producers in
  prompt, checkpoint, plan, dream, and distill flows.
- Tests/evidence: `packages/opencode/test/session/processor-effect.test.ts`,
  `packages/opencode/test/session/main-runloop-history-invariant.test.ts`,
  `packages/opencode/test/session/trajectory.test.ts`, prompt regressions, and
  generated SDK/OpenAPI `source` fields at the reviewed main behavior.
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: upstream provides equivalent provenance and complete
  hook/retry text-part lifecycle behavior, and regenerated artifacts preserve
  the same source discriminator.

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
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: upstream preserves equivalent numeric and DNS-resolved
  destination classification, including IPv6 `fe80::/10`, with the same HTTP(S),
  per-hop permission, manual-redirect, timeout, and response-size contract and
  behavior-focused tests.

## FC-011 — fork-facing model prompts and bundled skill guidance

- Status: active process/content contract
- Canonical owner: fork `main` prompt and bundled-skill content
- Observable contract: model-visible CI reminders include `dev/compat`;
  built-in skill keys match `mimocode-docs`; actor heredoc errors explain flag
  placement; PDF CJK guidance uses project-controlled fonts, explicit TTC face
  indexes, and language-matched runtime-supported CID fallbacks.
- Upstream relationship: fork-facing guidance plus selectively adopted upstream
  documentation improvements.
- Watch surfaces: MiniMax/GPT prompt text, actor shell tokenizer/help, TUI skill
  i18n, and bundled `pdf-official` and `mimocode-docs` content.
- Tests/evidence: session system, actor-shell, skill-description,
  `packages/opencode/test/skill/mimocode-docs.test.ts`, and bundled-content
  reviews at the main behavior SHA.
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
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
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: fork ownership or publication topology changes through
  an explicit governance decision and every repository-facing route is updated.

## FC-013 — MaxMode final-step budget enforcement

- Status: active
- Canonical owner: fork `main` session run loop
- Observable contract: MaxMode orchestration may run before the configured
  final step, but the final step uses the ordinary processor so
  `toolChoice: "none"` forces a text-only response and terminates the loop.
  MaxMode cannot continue tool calls beyond the final-step boundary.
- Upstream relationship: fork hardening of shared MaxMode orchestration.
- Watch surfaces: `packages/opencode/src/session/prompt.ts` and processor
  final-step routing.
- Tests/evidence: the MaxMode final-step regressions in
  `packages/opencode/test/session/prompt-effect.test.ts` and step-budget coverage
  in `packages/opencode/test/session/max-mode.test.ts` at main behavior.
- Review basis: upstream `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`;
  main behavior `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Retirement condition: MaxMode itself consumes and enforces the final-step
  tool choice with equivalent termination regressions.
