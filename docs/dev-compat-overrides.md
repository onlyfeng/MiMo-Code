# dev/compat Override Registry

This is the authoritative registry for active behavior owned only by
`dev/compat`. The branch inherits the shared `main` FD/FC registries unchanged;
this file records only the remaining delta from that inherited behavior.

Review this registry whenever work targets `dev/compat` or propagates `main`
into it, including when a listed surface merges without conflicts. A pure
registry/history commit does not advance either behavior reference below.

## Review record

- Status: active
- Canonical owner: fork `dev/compat`
- Last reviewed: 2026-08-28
- Reviewed upstream: `35bb2636a99b457940f1c12f2c8f5ec554369c57`
- Accepted `main` tip: `cce5b8383ce812d608254dc4deecf672e2795773`
- Inherited main behavior: `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`
- Compat behavior: `710a5ffb8aa9b7dedc63789759b4d995d587f5d1`
- Prior compat tip: `a0b90a4cbf995d6457b8bf0e8ce5cd18275cfbef`
- Main-audit inheritance merge: `710a5ffb8aa9b7dedc63789759b4d995d587f5d1`
- History: [dev-compat-registry-history.md](dev-compat-registry-history.md)

`Base` names the inherited source/test behavior being reviewed. `Overrides`
names the compat source/test behavior and the shared or upstream contract that
it changes or extends. Neither field names this documentation commit.

The 2026-08-28 propagation used one merge for both accepted shared audit
documentation and behavior. Only DC-CONTEXT-001 and DC-ACTOR-001 had incoming
path overlap; all seven active entries were nevertheless re-reviewed against
the inherited tree.

## Sync index

| ID | Watch surfaces | Relationship to inherited `main` | Required decision |
| --- | --- | --- | --- |
| DC-NET-001 | WebFetch and SSRF call seam | Private-destination policy override | Preserve explicit intranet access or adopt a reviewed replacement |
| DC-NET-002 | Remote MCP URL and lifecycle tests | Compat guarantee; no production fork | Keep RFC1918 client creation unless policy changes explicitly |
| DC-PLATFORM-001 | `ripgrep` and `archive` fallbacks | Restricted-network/Windows adaptation under fixed-cwd path semantics | Keep compat-only; preserve inherited relative-path resolution |
| DC-MODEL-001 | Agent config, MaxMode, retry status, title path, SDK/OpenAPI | Per-agent extension over shared bounded retry; title generation stays shared | Preserve opt-in, final-step bound, title isolation, and subagent status isolation |
| DC-CONTEXT-001 | Model-visible text, request preflight, title/skills/memory, compaction | Bounded-content hardening around shared request construction | Preserve caps, snapshots, stable paths, effective-window preflight, and recovery routing |
| DC-ACTOR-001 | Actor context, default-fork checkpoint, replace-agent, static-prefix overflow | Full-context extension beyond shared capture and actor identity scope | Preserve frozen membership/system/cwd and fail unrecoverable prefixes |
| DC-TUI-001 | Prompt/footer model metadata and title locale | Request-metadata display override alongside shared locale propagation | Preserve provider/model/variant truth, locale submission, and known-limit disclosure |

## DC-NET-001 — approved private-network WebFetch

- Status: active
- Canonical owner: `dev/compat` WebFetch destination policy
- Base: inherited main behavior
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57` implements FC-010's inherited
  destination-classification, per-hop authorization, and resource-bound
  contract by applying `assertSafeUrl()` before the initial and redirected
  target's permission decision and request. DC-NET-001 overrides only whether
  compat WebFetch invokes that inherited classifier at its call seam.
- Overrides: compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1` removes only the
  `assertSafeUrl` import and its two call sites from WebFetch. The inherited
  classifier implementation and tests, including full IPv6 link-local
  `fe80::/10` coverage, remain byte-identical to `main`; compat WebFetch does
  not call that classifier.
- Delta: after the effective `webfetch` permission approves a target,
  operator-configured private HTTP(S) destinations such as
  `http://192.168.1.1/wiki` may be requested. HTTP(S)-only validation,
  per-target permission asks, manual redirects with the 10-hop limit, timeout,
  the 5 MB response bound, and the injected HTTP client remain in force.
- Source surfaces: `packages/opencode/src/tool/webfetch.ts`. The inherited
  `packages/opencode/src/util/ssrf.ts` is a synchronization surface but is not
  forked by this entry.
- Test surfaces: `packages/opencode/test/tool/webfetch.test.ts`; inherited
  `packages/opencode/test/util/ssrf.test.ts` continues to validate the
  classifier itself, not its use by compat WebFetch.
- Review basis: inherited main
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`; compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1`.
- Evidence: the main-to-compat source diff is exactly the import and two
  classification-call deletions. The inherited classifier tests cover the
  complete IPv6 link-local `fe80::/10` range and DNS-resolved link-local
  addresses, while the `allows an approved RFC1918 fetch target` regression
  records the permission ask before the mocked private request. Ordinary
  approved RFC1918 access remains unchanged. The 13/13 shared title, path,
  skill, compaction, and actor-scope inventory does not change this call seam.
- Exit condition: retire or narrow this override only after a shared,
  operator-controlled private-network authorization mechanism preserves
  required intranet access while retaining per-hop permission and resource
  controls.

## DC-NET-002 — RFC1918 remote HTTP(S) MCP reachability

- Status: active
- Canonical owner: `dev/compat` remote-MCP compatibility guarantee
- Base: inherited main behavior
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57` and FC-004 validate that remote
  MCP URLs parse as HTTP(S), but deliberately make no fork-wide private-network
  promise.
- Overrides: compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1` adds a compat-owned guarantee and
  characterization test. There is no MCP production-source fork.
- Delta: an RFC1918 endpoint such as `http://192.168.1.1/mcp` reaches mocked
  client creation and is not rejected merely because its address is private.
  This does not claim real-network, proxy, DNS, redirect, authentication, or
  server interoperability coverage.
- Source surfaces: inherited
  `packages/opencode/src/mcp/index.ts`, which must remain byte-identical to
  `main` until a real compat override is required.
- Test surfaces: `packages/opencode/test/mcp/lifecycle.test.ts`, specifically
  the `compat permits an RFC1918 remote MCP endpoint` sentinel.
- Review basis: inherited main
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`; compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1`.
- Evidence: `packages/opencode/src/mcp/index.ts` is unchanged from accepted
  `main`, while the compat behavior adds only the mocked RFC1918 lifecycle
  guarantee on this surface.
- Exit condition: any future `main` private-address MCP classifier triggers a
  fresh policy review and, if intranet access remains required, a minimal
  compat-only production override. Retire the test owner only when the shared
  contract explicitly guarantees the same reachability.

## DC-PLATFORM-001 — restricted-network and Windows ripgrep/archive fallback

- Status: active
- Canonical owner: `dev/compat` platform and restricted-network adaptation
- Base: inherited main behavior
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57` retains the shared
  `ripgrep`/archive behavior without this environment-specific fallback set and
  resolves relative file-tool paths against immutable `Instance.directory`.
- Overrides: compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1` carries the established no-rg
  listing boundary and Windows archive extraction adaptation instead of
  promoting them to shared `main`.
- Delta: simple file listing remains available when `ripgrep` cannot be
  provisioned, while advanced search, glob, ignore, marker, read-error, abort,
  depth, and streaming cases fail closed or retain their reviewed semantics.
  Windows ZIP extraction uses the platform fallback with overwrite and
  zip-slip boundaries. The inherited relative-path capability does not restore
  mutable session cwd or broaden which no-rg operations may proceed.
- Source surfaces: `packages/opencode/src/file/ripgrep.ts` and
  `packages/opencode/src/util/archive.ts`.
- Test surfaces: `packages/opencode/test/file/ripgrep.test.ts` and
  `packages/opencode/test/util/archive.test.ts`.
- Review basis: inherited main
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`; compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1`.
- Evidence: focused regressions distinguish simple fallback listings from
  operations that require real `ripgrep` and cover real-cwd marker scanning,
  ignore semantics, errors, abort, deep trees, and the Windows ZIP guard at the
  compat behavior tree. Relative Edit/MultiEdit coverage independently binds
  the inherited file-tool contract to the same fixed instance cwd.
- Exit condition: keep this entry compat-only; it is not proposed for `main`.
  Reconsider only when the supported deployment can reliably provision the
  shared binaries, or upstream supplies equivalent fallbacks with the same
  fail-closed boundaries.

## DC-MODEL-001 — per-agent MaxMode

- Status: active
- Canonical owner: `dev/compat` agent configuration and MaxMode routing
- Base: inherited main behavior
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57` provides shared MaxMode
  orchestration, bounded candidate/judge retry, main-only session-global retry
  status/event publication, and FC-013's tool-free final-step boundary without
  a compat-style per-agent opt-in contract. It also owns reliable multimodal
  title generation through the hidden `title` agent's `modelRef: "lite"`,
  structured output, and ephemeral retry path.
- Overrides: compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1` adds `agent.maxMode` and generated
  SDK/OpenAPI exposure, then routes eligible non-final, non-`json_schema` steps
  through MaxMode when the experimental configuration exists.
- Delta: any configured agent may opt in with `maxMode: true`; the dedicated
  Max agent continues to work, absent experimental MaxMode configuration stays
  disabled, structured-output requests skip the mode, and the final step
  preserves FC-013's `toolChoice: "none"` termination boundary. Eligible
  subagents inherit bounded retry but cannot write session-global retry status
  or publish `RetryAttempt` events. The source-generated title API and
  `titleLocale` path stay shared; this override neither routes the ephemeral
  title call through per-agent MaxMode nor gives it session-global status.
- Source surfaces: `packages/opencode/src/agent/agent.ts`,
  `packages/opencode/src/config/agent.ts`,
  `packages/opencode/src/session/max-mode.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/sdk/js/src/v2/gen/types.gen.ts`, and
  `packages/sdk/openapi.json`.
- Test surfaces: `packages/opencode/test/session/max-mode.test.ts`,
  `packages/opencode/test/session/max-mode-econnreset.test.ts`, and MaxMode
  routing cases in `packages/opencode/test/session/prompt-effect.test.ts`.
- Review basis: inherited main
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`; compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1`.
- Evidence: the agent config schema, resolved agent information, generated
  public schemas, routing predicate, structured-output exclusion, retry
  behavior, main-only session status/event gate, and final-step cases are all
  represented in the named source/test surfaces at the compat behavior tree;
  title generation and locale regressions remain inherited alongside them.
- Exit condition: retire when shared `main` exposes equivalent per-agent
  opt-in, generated interfaces, mode exclusions, retry behavior, and final-step
  enforcement; do not retire merely because the global experimental switch
  exists.

## DC-CONTEXT-001 — model-visible content caps and request preflight

- Status: active
- Canonical owner: `dev/compat` model-request safety boundary
- Base: inherited main behavior
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57` retains FD-002 instruction
  delivery, shared retry/title construction, versioned skill snapshots, stable
  per-session memory-path templates, FC-007's fixed `Instance.directory`, and
  FC-015's effective compaction window without this complete compat cap,
  serialization, and preflight set.
- Overrides: compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1` bounds model-visible content and
  estimates the effective request before dispatch. DC-ACTOR-001 separately owns
  the full-context/static-prefix actor extension.
- Delta: instruction, inbox, replayed tool input/output, synthetic error media,
  judge fields, and actor state use explicit UTF-8/character caps and
  non-throwing serialization. Title inputs and retained v2 skill-catalog
  snapshots remain bounded; stable `{current_session_id}` memory instructions
  are counted without being rewritten before filesystem-tool execution.
  Request preflight accounts for system/messages, treats current-turn context
  as unshrinkable, includes only active tool schemas, and uses the inherited
  effective window, including `MIMOCODE_COMPACTION_MAX_CONTEXT` and the
  reserve-safe trigger ratio. It routes recoverable overflow to existing
  recovery and distinguishes an unrecoverable static prefix. Preflight does not
  restore a mutable cwd store, setter, clear path, `Event.Changed` publisher,
  or `change_directory` tool; cross-directory calls continue to use absolute
  paths or explicit `workdir`.
- Source surfaces: `packages/opencode/src/inbox/render.ts`,
  `packages/opencode/src/session/classify.ts`,
  `packages/opencode/src/session/instruction.ts`,
  `packages/opencode/src/session/llm.ts`,
  `packages/opencode/src/session/max-mode.ts`,
  `packages/opencode/src/session/message-v2.ts`,
  `packages/opencode/src/session/overflow.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/session/system.ts`,
  `packages/opencode/src/tool/actor.ts`,
  `packages/opencode/src/util/safe-stringify.ts`, and
  `packages/opencode/src/util/text-truncate.ts`.
- Test surfaces: inbox rendering, request classification, instruction, MaxMode,
  message replay, overflow, prompt-effect, actor, safe-stringify, and
  text-truncation suites under `packages/opencode/test/`, with
  `packages/opencode/test/lib/llm-server.ts` supporting request-boundary
  assertions.
- Review basis: inherited main
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`; compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1`.
- Evidence: focused tests at the compat behavior tree cover oversized
  instructions, structured provider/tool replay, unserializable inputs,
  synthetic media, UTF-8/surrogate limits, active-tool filtering, recoverable
  overflow, current-turn context pressure, effective-window configuration,
  retained skill snapshots, stable memory paths, title requests, and
  static-only overflow classification.
- 2026-08-28 review: the inherited auto-overflow fixture now declares an empty
  proactive checkpoint ladder and retains the shared 25K reserve-boundary
  sentinel. Compat additionally preserves its deterministic short agent prompt,
  empty tool allowlist, and first-call assertion.
- Exit condition: retire only when shared `main` enforces equivalent caps and
  non-throwing serialization at every model-visible boundary and performs the
  same request-aware, active-tool preflight without weakening FD-002 delivery.

## DC-ACTOR-001 — full-context actor and static-prefix overflow extensions

- Status: active
- Canonical owner: `dev/compat` actor request/context integration
- Base: inherited main behavior
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57` provides FD-009's fail-closed
  frozen-context admission, FC-001's lifecycle linearization, FC-007's fixed
  instance cwd, default-fork checkpoint writers, and FD-002's fail-closed
  main/registered-peer `replace-agent` identity scope.
- Overrides: compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1` extends those shared invariants
  with explicit full-context actor propagation, bounded actor-visible state,
  and static-prefix overflow handling; it does not replace their ownership.
- Delta: an actor requesting full context inherits the parent's frozen request
  membership, including the captured system, tools, permissions, per-turn
  context, and cwd, rather than a live or guessed child set. Actor state is
  truncated through shared UTF-8 primitives. The inherited checkpoint default
  is `fork: true`; explicit `fork: false` keeps its writer-owned frozen prefix.
  A full-context subagent/system actor retains its admitted identity and frozen
  system instead of gaining the session's `replace-agent` base; only main or a
  positively registered non-system peer may receive that replacement.
  Request preflight uses the inherited effective compaction window and
  distinguishes history that recovery can reduce from a system/tool/current-
  turn prefix that cannot be repaired by compaction, preventing a futile loop.
- Source surfaces: `packages/opencode/src/actor/spawn.ts`,
  `packages/opencode/src/session/checkpoint.ts`,
  `packages/opencode/src/session/overflow.ts`,
  `packages/opencode/src/session/prefix-capture-ref.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/tool/actor.ts`,
  `packages/opencode/src/tool/session.ts`, and
  `packages/opencode/src/util/text-truncate.ts`.
- Test surfaces: `packages/opencode/test/tool/actor.test.ts`,
  `packages/opencode/test/actor/cancel-notification.test.ts`,
  `packages/opencode/test/actor/spawn-notification.test.ts`,
  `packages/opencode/test/actor/spawn.test.ts`,
  `packages/opencode/test/inbox/fork-agent-compat.test.ts`,
  `packages/opencode/test/session/auto-overflow-writer-first.test.ts`,
  `packages/opencode/test/session/checkpoint-fork-mode.test.ts`,
  `packages/opencode/test/session/checkpoint-main-slice.test.ts`,
  `packages/opencode/test/session/checkpoint-prefix-capture-fixture.ts`,
  `packages/opencode/test/session/classify-integration.test.ts`,
  `packages/opencode/test/session/recall-reminder.test.ts`,
  `packages/opencode/test/session/overflow.test.ts`,
  `packages/opencode/test/session/prompt-effect.test.ts`, and actor-state cases
  in `packages/opencode/test/util/text-truncate.test.ts`.
- Review basis: inherited main
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`; compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1`.
- Evidence: the full-context actor suite covers inherited system/tool/permission
  membership, frozen parent turn context/system/cwd, actor-scoped replacement,
  default and explicit checkpoint modes, and bounded state; overflow tests
  distinguish recoverable message pressure from `overflow-static`, while prompt
  tests prove the latter terminates with a stable diagnostic rather than
  repeatedly compacting.
- 2026-08-28 review: inherited spawn/run schemas reject the former `actor_id`
  resume argument, while compat retains UTF-8-safe state caps, captured
  `turnContext`, loaded MCP membership, and failure when completed ephemeral
  full-context actors no longer own frozen context.
- Exit condition: retire only when shared `main` supplies equivalent
  frozen-membership full-context actors, bounded state transport, and
  unrecoverable-static-prefix handling while FD-009 and FC-001 remain satisfied
  or are retired independently.

## DC-TUI-001 — request provider/model/variant display

- Status: active
- Canonical owner: `dev/compat` TUI request-metadata presentation
- Legacy ID: FD-007
- Base: inherited main behavior
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57` follows upstream's condensed
  model presentation, which may omit the provider label or an unselected
  variant, and propagates the current BCP 47 `titleLocale` through TUI prompt
  submissions and automatic title generation.
- Overrides: compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1` displays one request-oriented
  `alias · providerID/modelID · variant: <value>` row in the prompt and
  subagent footer.
- Delta: provider/model is unconditional, the persisted or explicitly selected
  named variant is shown, and the absence of such a value is rendered as
  `variant: none` instead of inventing a provider default. Metadata shrinks
  before established footer controls on narrow terminals. The same prompt
  submits `language.intl()` as `titleLocale`; presentation metadata does not
  guess or alter that locale.
- Source surfaces:
  `packages/opencode/src/cli/cmd/tui/component/model-metadata.tsx`,
  `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`,
  `packages/opencode/src/cli/cmd/tui/routes/session/subagent-footer.tsx`, and
  `packages/opencode/src/cli/cmd/tui/util/model.ts`.
- Test surfaces:
  `packages/opencode/test/cli/tui/model-metadata.test.tsx` and
  `packages/opencode/test/cli/tui/model.test.ts`.
- Review basis: inherited main
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`; compat behavior
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1`.
- Evidence: rendering tests cover the unified label and narrow layout; model
  tests cover explicit and persisted variants, literal/group agent refs,
  mismatched models, absent variants, and unknown built-in tiers. Prompt and
  App submission tests cover the independently inherited locale path.
- Known limits: an unconfigured built-in tier can display `variant: none` while
  the server resolves an agent variant through its default-model path. An
  in-session agent switch can likewise display `variant: none` until the TUI has
  request-persisted metadata that reflects the server's resolved agent variant.
- Exit condition: retire when the server exposes authoritative pending-request
  provider/model/variant metadata, or shared `main` renders equivalent truth
  without client-side default-model guessing and covers both known limits.
