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
- Last reviewed: 2026-08-25
- Accepted `main` tip: `12b4bacedd3d0cb961578b29bfa7f613f6ac443f`
- Inherited main behavior: `6ae30e66ab0ecbb526f85009d300e7c2533fe72c`
- Compat behavior: `bcbd16fc237a5b2c6f2800afe834830ad739aa01`
- Prior compat tip: `19cad20c689eaa027db802cc942a374afa1b50bf`
- History: [dev-compat-registry-history.md](dev-compat-registry-history.md)

`Base` names the inherited source/test behavior being reviewed. `Overrides`
names the compat source/test behavior and the shared or upstream contract that
it changes or extends. Neither field names this documentation commit.

## Sync index

| ID | Watch surfaces | Relationship to inherited `main` | Required decision |
| --- | --- | --- | --- |
| DC-NET-001 | WebFetch and SSRF call seam | Private-destination policy override | Preserve explicit intranet access or adopt a reviewed replacement |
| DC-NET-002 | Remote MCP URL and lifecycle tests | Compat guarantee; no production fork | Keep RFC1918 client creation unless policy changes explicitly |
| DC-PLATFORM-001 | `ripgrep` and `archive` fallbacks | Restricted-network/Windows adaptation | Keep compat-only; do not promote by default |
| DC-MODEL-001 | Agent config, MaxMode, retry status, SDK/OpenAPI | Per-agent extension over shared bounded retry | Preserve opt-in, final-step bound, and subagent status isolation |
| DC-CONTEXT-001 | Model-visible text, request preflight, fixed cwd | Bounded-content hardening over shared retry/cwd | Preserve caps, safe serialization, recovery routing, and inherited cwd |
| DC-ACTOR-001 | Actor context, fixed cwd, static-prefix overflow | Full-context extension beyond shared capture | Preserve frozen membership/cwd and fail unrecoverable prefixes |
| DC-TUI-001 | Prompt/footer model metadata | Request-metadata display override | Preserve provider/model/variant truth and known-limit disclosure |

## DC-NET-001 — approved private-network WebFetch

- Status: active
- Canonical owner: `dev/compat` WebFetch destination policy
- Base: inherited main behavior
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` implements FC-010's inherited
  destination-classification, per-hop authorization, and resource-bound
  contract by applying `assertSafeUrl()` before the initial and redirected
  target's permission decision and request. DC-NET-001 overrides only whether
  compat WebFetch invokes that inherited classifier at its call seam.
- Overrides: compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01` removes only the
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
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c`; compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01`.
- Evidence: the main-to-compat source diff is exactly the import and two
  classification-call deletions. The inherited classifier tests cover the
  complete IPv6 link-local `fe80::/10` range and DNS-resolved link-local
  addresses, while the `allows an approved RFC1918 fetch target` regression
  records the permission ask before the mocked private request. Ordinary
  approved RFC1918 access remains unchanged.
- Exit condition: retire or narrow this override only after a shared,
  operator-controlled private-network authorization mechanism preserves
  required intranet access while retaining per-hop permission and resource
  controls.

## DC-NET-002 — RFC1918 remote HTTP(S) MCP reachability

- Status: active
- Canonical owner: `dev/compat` remote-MCP compatibility guarantee
- Base: inherited main behavior
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` and FC-004 validate that remote
  MCP URLs parse as HTTP(S), but deliberately make no fork-wide private-network
  promise.
- Overrides: compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01` adds a compat-owned guarantee and
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
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c`; compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01`.
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
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` retains the shared
  `ripgrep`/archive behavior without this environment-specific fallback set.
- Overrides: compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01` carries the established no-rg
  listing boundary and Windows archive extraction adaptation instead of
  promoting them to shared `main`.
- Delta: simple file listing remains available when `ripgrep` cannot be
  provisioned, while advanced search, glob, ignore, marker, read-error, abort,
  depth, and streaming cases fail closed or retain their reviewed semantics.
  Windows ZIP extraction uses the platform fallback with overwrite and
  zip-slip boundaries.
- Source surfaces: `packages/opencode/src/file/ripgrep.ts` and
  `packages/opencode/src/util/archive.ts`.
- Test surfaces: `packages/opencode/test/file/ripgrep.test.ts` and
  `packages/opencode/test/util/archive.test.ts`.
- Review basis: inherited main
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c`; compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01`.
- Evidence: focused regressions distinguish simple fallback listings from
  operations that require real `ripgrep` and cover real-cwd marker scanning,
  ignore semantics, errors, abort, deep trees, and the Windows ZIP guard at the
  compat behavior tree.
- Exit condition: keep this entry compat-only; it is not proposed for `main`.
  Reconsider only when the supported deployment can reliably provision the
  shared binaries, or upstream supplies equivalent fallbacks with the same
  fail-closed boundaries.

## DC-MODEL-001 — per-agent MaxMode

- Status: active
- Canonical owner: `dev/compat` agent configuration and MaxMode routing
- Base: inherited main behavior
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` provides shared MaxMode
  orchestration, bounded candidate/judge retry, main-only session-global retry
  status/event publication, and FC-013's tool-free final-step boundary without
  a compat-style per-agent opt-in contract.
- Overrides: compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01` adds `agent.maxMode` and generated
  SDK/OpenAPI exposure, then routes eligible non-final, non-`json_schema` steps
  through MaxMode when the experimental configuration exists.
- Delta: any configured agent may opt in with `maxMode: true`; the dedicated
  Max agent continues to work, absent experimental MaxMode configuration stays
  disabled, structured-output requests skip the mode, and the final step
  preserves FC-013's `toolChoice: "none"` termination boundary. Eligible
  subagents inherit bounded retry but cannot write session-global retry status
  or publish `RetryAttempt` events.
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
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c`; compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01`.
- Evidence: the agent config schema, resolved agent information, generated
  public schemas, routing predicate, structured-output exclusion, retry
  behavior, main-only session status/event gate, and final-step cases are all
  represented in the named source/test surfaces at the compat behavior tree.
- Exit condition: retire when shared `main` exposes equivalent per-agent
  opt-in, generated interfaces, mode exclusions, retry behavior, and final-step
  enforcement; do not retire merely because the global experimental switch
  exists.

## DC-CONTEXT-001 — model-visible content caps and request preflight

- Status: active
- Canonical owner: `dev/compat` model-request safety boundary
- Base: inherited main behavior
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` retains FD-002 instruction
  delivery, the shared retry pipeline, and FC-007's fixed `Instance.directory`
  plus inert `EventSessionCwd` compatibility schema without this complete
  compat cap, serialization, and preflight set.
- Overrides: compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01` bounds model-visible content and
  estimates the effective request before dispatch. DC-ACTOR-001 separately owns
  the full-context/static-prefix actor extension.
- Delta: instruction, inbox, replayed tool input/output, synthetic error media,
  judge fields, and actor state use explicit UTF-8/character caps and
  non-throwing serialization. Request preflight accounts for system/messages,
  treats current-turn context as unshrinkable, includes only active tool schemas,
  routes recoverable overflow to existing recovery, and distinguishes an
  unrecoverable static prefix. Preflight does not restore a mutable cwd store,
  setter, clear path, `Event.Changed` publisher, or `change_directory` tool;
  cross-directory calls continue to use absolute paths or explicit `workdir`.
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
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c`; compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01`.
- Evidence: focused tests at the compat behavior tree cover oversized
  instructions, structured provider/tool replay, unserializable inputs,
  synthetic media, UTF-8/surrogate limits, active-tool filtering, recoverable
  overflow, current-turn context pressure, and static-only overflow
  classification.
- Exit condition: retire only when shared `main` enforces equivalent caps and
  non-throwing serialization at every model-visible boundary and performs the
  same request-aware, active-tool preflight without weakening FD-002 delivery.

## DC-ACTOR-001 — full-context actor and static-prefix overflow extensions

- Status: active
- Canonical owner: `dev/compat` actor request/context integration
- Base: inherited main behavior
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` provides FD-009's fail-closed
  frozen-context admission, FC-001's lifecycle linearization, and FC-007's
  fixed instance cwd with an inert SDK event schema.
- Overrides: compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01` extends those shared invariants
  with explicit full-context actor propagation, bounded actor-visible state,
  and static-prefix overflow handling; it does not replace their ownership.
- Delta: an actor requesting full context inherits the parent's frozen request
  membership, including the captured per-turn context, rather than a live or
  guessed child set. Actor state is truncated through shared UTF-8 primitives.
  Full-context children retain the admitted instance directory; they do not
  recapture cwd or publish the inert `SessionCwd.Event.Changed` declaration.
  Request preflight distinguishes history that recovery can reduce from a
  system/tool/current-turn prefix that cannot be repaired by compaction,
  preventing a futile overflow loop.
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
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c`; compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01`.
- Evidence: the full-context actor suite covers inherited system/tool/permission
  membership, frozen parent turn context, and bounded state; overflow tests
  distinguish recoverable message pressure from `overflow-static`, while prompt
  tests prove the latter terminates with a stable diagnostic rather than
  repeatedly compacting.
- Exit condition: retire only when shared `main` supplies equivalent
  frozen-membership full-context actors, bounded state transport, and
  unrecoverable-static-prefix handling while FD-009 and FC-001 remain satisfied
  or are retired independently.

## DC-TUI-001 — request provider/model/variant display

- Status: active
- Canonical owner: `dev/compat` TUI request-metadata presentation
- Legacy ID: FD-007
- Base: inherited main behavior
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` follows upstream's condensed
  model presentation, which may omit the provider label or an unselected
  variant.
- Overrides: compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01` displays one request-oriented
  `alias · providerID/modelID · variant: <value>` row in the prompt and
  subagent footer.
- Delta: provider/model is unconditional, the persisted or explicitly selected
  named variant is shown, and the absence of such a value is rendered as
  `variant: none` instead of inventing a provider default. Metadata shrinks
  before established footer controls on narrow terminals.
- Source surfaces:
  `packages/opencode/src/cli/cmd/tui/component/model-metadata.tsx`,
  `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`,
  `packages/opencode/src/cli/cmd/tui/routes/session/subagent-footer.tsx`, and
  `packages/opencode/src/cli/cmd/tui/util/model.ts`.
- Test surfaces:
  `packages/opencode/test/cli/tui/model-metadata.test.tsx` and
  `packages/opencode/test/cli/tui/model.test.ts`.
- Review basis: inherited main
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c`; compat behavior
  `bcbd16fc237a5b2c6f2800afe834830ad739aa01`.
- Evidence: rendering tests cover the unified label and narrow layout; model
  tests cover explicit and persisted variants, literal/group agent refs,
  mismatched models, absent variants, and unknown built-in tiers.
- Known limits: an unconfigured built-in tier can display `variant: none` while
  the server resolves an agent variant through its default-model path. An
  in-session agent switch can likewise display `variant: none` until the TUI has
  request-persisted metadata that reflects the server's resolved agent variant.
- Exit condition: retire when the server exposes authoritative pending-request
  provider/model/variant metadata, or shared `main` renders equivalent truth
  without client-side default-model guessing and covers both known limits.
