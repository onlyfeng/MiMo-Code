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
- Last reviewed: 2026-09-05
- Reviewed upstream: `ec3f989438d4b1f4e2b2c2044e1ecfc5327f45b7`
- Accepted `main` tip: `430fe9db3b8087976b326bdf4dc2bf1fd5eb5734`
- Inherited main behavior: `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae`
- Compat behavior: `9121d0efc66fbce72c75342cdf3d2159c13f8c34`
- Prior compat tip: `8b3466b844d206c1a9659e3fd677e887417b3b86`
- Main-audit inheritance merge: `9121d0efc66fbce72c75342cdf3d2159c13f8c34`
- History: [dev-compat-registry-history.md](dev-compat-registry-history.md)

`Base` names the inherited source/test behavior being reviewed. `Overrides`
names the compat source/test behavior and the shared or upstream contract that
it changes or extends. Neither field names this documentation commit.

The 2026-09-01 propagation inherited the accepted shared audit and behavior
through the recorded main-audit merge. DC-NET-001, DC-PLATFORM-001, and
DC-TUI-001 had no incoming `main` path overlap. DC-NET-002 had stdio MCP path
overlap; DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 had request, prefix,
compaction, or actor-path overlap. The final compat behavior at
`43bc1048b0bc16ff17d715ee9cb756d2c1cc319f` retains the reconciled lifecycle,
chronology, admission, checkpoint, and TUI behavior, then corrects the
checkpoint coverage seam and republishes the exact OpenAPI/SDK client contract.
The runtime corrections remain shared FC-001, FC-002, and FC-015 behavior at
compat seams; the publication corrections do not create a new persistent
compat owner. All seven active entries were re-reviewed against the final
behavior tree.

The later 2026-09-01 OAuth-branding propagation adopts the shared MiMoCode
callback-page and dynamic-registration literals without creating a compat
override. The three incoming production paths had no prior compat delta and
remain byte-identical to accepted `main`. DC-NET-002 is the only subsystem-
adjacent owner; its RFC1918 sentinel explicitly disables OAuth and therefore
does not claim private-server OAuth interoperability. All seven active entries
were re-reviewed against compat behavior `43bc1048b0bc16ff17d715ee9cb756d2c1cc319f`.

The 2026-09-01 Codex-mode specified-change propagation inherits FD-002's
narrowed residual registry and FD-005's tri-state harness resolution without
creating a compat override. DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 have
real prompt, prefix, preflight, MaxMode, or generated-contract overlap; their
per-agent routing, bounded request, and frozen full-context behavior remains
intact. The other four active owners have no incoming path overlap. All seven
entries were re-reviewed against compat behavior
`c594bb92ff5a11063c5e22936964ceae088e1d43`.

The subsequent 2026-09-01 full upstream sync classifies both substantive
changes through audited `main`: it adopts the action-oriented default-prompt
guidance and subsumes the upstream Codex false-disable result into FD-005's
stronger session-explicit > process true/false > complete-identity inference
contract. The only inherited behavior delta relative to the prior compat tip
is the default prompt plus its direct regression test. DC-MODEL-001,
DC-CONTEXT-001, and DC-ACTOR-001 were re-reviewed for prompt, harness, request,
and actor semantic adjacency; the other four owners have no incoming path or
symbol overlap. All seven entries remain active and unchanged at compat
behavior `17f24827b310d8e9b64d495370ca6ec63f28242c`.

The 2026-09-02 propagation inherits the complete 4/4 default-model, Compose
Next, and voice audit plus shared FC-016 hardening. DC-MODEL-001 was re-reviewed
against the stable live-registry fallback and retains per-agent MaxMode and
hidden-title isolation. DC-CONTEXT-001 remains request-semantics adjacent but
defines no alternate TUI voice protocol. DC-TUI-001 had a same-component
conflict: semantic reconciliation kept its authoritative provider/model/variant
metadata and `titleLocale` paths while inheriting the full Prompt voice owner,
stop/drain, and grapheme-safe editing behavior. The four other DC owners had no
incoming path or symbol overlap. All seven entries remain active and unchanged
at compat behavior `c8b02aeb991c37e570799bdd3696e276aa35ba77`.

The later 2026-09-02 OpenAPI projection and `0.1.14` propagation inherits all
four audited shared capabilities. DC-MODEL-001 and DC-CONTEXT-001 directly
overlap the generated OpenAPI contract; DC-ACTOR-001 is compaction/preflight
adjacent. The other four owners have no incoming path or symbol overlap. The
only textual conflict was the OpenAPI contract test, resolved by retaining the
compat checkpoint and callable-v2 coverage and adding the shared full
`CompactionPart` projection equality check. The automatically merged OpenAPI
was accepted only after it matched a fresh compat-source generation byte for
byte; JavaScript SDK generation was also idempotent. All sixteen manifests and
`bun.lock` adopt `0.1.14`, while all seven compat owners remain active and
unchanged at behavior `6c2fe63ad3d08d3eed4d5dfc44bab3aa934e559e`.

The final 2026-09-02 WebSearch-model and session-ID propagation inherits both
audited shared capabilities without creating a compat-only fork. All four
incoming paths had no prior compat delta, merged without conflict, and remain
byte-identical to accepted `main`. DC-MODEL-001 and DC-ACTOR-001 are adjacent
to request-scoped WebSearch model routing; DC-CONTEXT-001 and DC-ACTOR-001
consume session IDs as opaque keys. DC-TUI-001 has no changed component path
and retains its provider/model/variant truth. The three network/platform owners
have no path or contract overlap. All seven entries remain active and unchanged
at compat behavior `4130f181f86477f91245f42e8670d0c84203bcde`.

The 2026-09-03 PR #73 specified-change propagation inherits the shared
`prompt_async` queue correction without creating a compat-only override. The
route now persists through `SessionPrompt.prompt` before joining an active run,
and the runtime OpenAPI plus generated JavaScript SDK consistently omit a 409
response for that fire-and-forget endpoint. DC-CONTEXT-001 directly overlaps
the route and published contract; DC-MODEL-001 overlaps only generated schema
carriers. The other five owners have no changed path, and all seven active
entries remain unchanged at compat behavior
`560de61b663a159771b53b05e826dc2cc91675ac`.

The 2026-09-04 PR #74 propagation inherits the shared closing-run handoff,
persisted-task binding, parent-linked classification, and atomic admission for
derived user turns without adding a compat-only runner mechanism. Six content
conflicts were resolved semantically: compat keeps its request preflight,
external-admission checks, monotonic actor chronology, ID/idempotency guards,
MaxMode routing, and frozen actor context, while the shared conditional write
guards every synthetic continuation in the same immediate transaction.
DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 overlap those paths; the other
four owners have no incoming production overlap. All seven entries remain
active at compat behavior `3e207de425621f660a249c074158d1d1564204f5`.

## Sync index

| ID | Watch surfaces | Relationship to inherited `main` | Required decision |
| --- | --- | --- | --- |
| DC-NET-001 | WebFetch and SSRF call seam | Private-destination policy override | Preserve explicit intranet access or adopt a reviewed replacement |
| DC-NET-002 | Remote MCP URL and lifecycle tests | Compat guarantee; no production fork | Keep RFC1918 client creation unless policy changes explicitly |
| DC-PLATFORM-001 | `ripgrep` and `archive` fallbacks | Restricted-network/Windows adaptation under fixed-cwd path semantics | Keep compat-only; preserve inherited relative-path resolution |
| DC-MODEL-001 | Agent config, MaxMode, retry status, title path, SDK/OpenAPI | Per-agent extension over shared bounded retry; title generation stays shared | Preserve opt-in, final-step bound, title isolation, and subagent status isolation |
| DC-CONTEXT-001 | Model-visible text, request preflight, title/skills/memory, compaction, checkpoint coverage, chronology, and TUI context/revert projection | Bounded-content hardening around shared request construction | Preserve caps, snapshots, stable paths, effective-window preflight, positional coverage, chronology, and recovery routing |
| DC-ACTOR-001 | Actor context, default-fork checkpoint, replace-agent, static-prefix overflow | Full-context extension beyond shared capture and actor identity scope | Preserve frozen membership/system/cwd and fail unrecoverable prefixes |
| DC-TUI-001 | Prompt/footer model metadata and title locale | Request-metadata display override alongside shared locale propagation | Preserve provider/model/variant truth, locale submission, and known-limit disclosure |

## DC-NET-001 — approved private-network WebFetch

- Status: active
- Canonical owner: `dev/compat` WebFetch destination policy
- Base: inherited main behavior
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae` implements FC-010's inherited
  destination-classification, per-hop authorization, and resource-bound
  contract by applying `assertSafeUrl()` before the initial and redirected
  target's permission decision and request. DC-NET-001 overrides only whether
  compat WebFetch invokes that inherited classifier at its call seam.
- Overrides: compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34` removes only the
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
- 2026-09-05 synchronization: No WebFetch/SSRF path changed; private-network
  policy and inherited bounds remain intact.
- Review basis: inherited main
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae`; compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34`.
- Evidence: the main-to-compat source diff is exactly the import and two
  classification-call deletions. The inherited classifier tests cover the
  complete IPv6 link-local `fe80::/10` range and DNS-resolved link-local
  addresses, while the `allows an approved RFC1918 fetch target` regression
  records the permission ask before the mocked private request. Ordinary
  approved RFC1918 access remains unchanged. The 18/18 shared capability
  inventory does not change this call seam.
- 2026-09-01 review: incoming changes had no WebFetch/SSRF call-seam overlap;
  the explicit private-destination policy override remains unchanged.
- 2026-09-01 OAuth-branding propagation: no WebFetch/SSRF path or symbol
  overlap; the approved private-destination call seam remains unchanged.
- 2026-09-01 tool-guidance/Codex-convergence sync: no WebFetch/SSRF path or
  symbol overlap; the approved private-destination call seam remains unchanged.
- 2026-09-02 default-model/Compose/voice sync: no WebFetch/SSRF path or symbol
  overlap; the approved private-target call seam and inherited HTTP bounds are
  unchanged.
- 2026-09-02 OpenAPI/0.1.14 sync: no WebFetch/SSRF path or symbol overlap; the
  approved private-target call seam and inherited HTTP bounds remain unchanged.
- 2026-09-02 WebSearch/session-ID sync: Xiaomi WebSearch does not use the
  WebFetch/SSRF call seam. The approved private-target policy, per-hop asks,
  timeout, redirect limit, and 5 MB bound remain unchanged.
- 2026-09-03 PR #73 propagation: no WebFetch/SSRF path or symbol overlap; the
  approved private-target behavior and inherited bounds remain unchanged.
- 2026-09-04 PR #74 propagation: no WebFetch/SSRF path or symbol overlap; the
  approved private-target behavior and inherited bounds remain unchanged.
- Exit condition: retire or narrow this override only after a shared,
  operator-controlled private-network authorization mechanism preserves
  required intranet access while retaining per-hop permission and resource
  controls.

## DC-NET-002 — RFC1918 remote HTTP(S) MCP reachability

- Status: active
- Canonical owner: `dev/compat` remote-MCP compatibility guarantee
- Base: inherited main behavior
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae` and FC-004 validate that remote
  MCP URLs parse as HTTP(S), but deliberately make no fork-wide private-network
  promise.
- Overrides: compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34` adds a compat-owned guarantee and
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
- 2026-09-05 synchronization: No remote MCP URL or connection path changed;
  RFC1918 client behavior remains intact.
- Review basis: inherited main
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae`; compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34`.
- Evidence: `packages/opencode/src/mcp/index.ts` is unchanged from accepted
  `main`, while the compat behavior adds only the mocked RFC1918 lifecycle
  guarantee on this surface.
- 2026-09-01 review: incoming stdio MCP transport and lifecycle changes
  overlapped the MCP path without weakening the compat RFC1918 reachability
  guarantee.
- 2026-09-01 OAuth-branding propagation: shared callback and
  dynamic-registration literals are adjacent to this MCP owner but do not fork
  `mcp/index.ts`. The RFC1918 sentinel sets `oauth: false`, passed at the final
  behavior tree, and continues to make no authentication-interoperability claim.
- 2026-09-01 tool-guidance/Codex-convergence sync: no MCP transport/config path
  or symbol overlap; the RFC1918 reachability guarantee remains unchanged.
- 2026-09-02 default-model/Compose/voice sync: no MCP transport/config path or
  symbol overlap; RFC1918 client creation remains the same bounded guarantee.
- 2026-09-02 OpenAPI/0.1.14 sync: no MCP transport/config path or symbol
  overlap; the RFC1918 client-creation guarantee remains unchanged.
- 2026-09-02 WebSearch/session-ID sync: the Xiaomi `MimoWebsearch` sidecar is
  not the remote-MCP lifecycle. No MCP path changed, and the RFC1918
  client-creation guarantee remains unchanged.
- 2026-09-03 PR #73 propagation: no MCP path or symbol overlap; RFC1918 remote
  MCP reachability remains unchanged.
- 2026-09-04 PR #74 propagation: no remote-MCP path or symbol overlap; RFC1918
  reachability remains unchanged.
- Exit condition: any future `main` private-address MCP classifier triggers a
  fresh policy review and, if intranet access remains required, a minimal
  compat-only production override. Retire the test owner only when the shared
  contract explicitly guarantees the same reachability.

## DC-PLATFORM-001 — restricted-network and Windows ripgrep/archive fallback

- Status: active
- Canonical owner: `dev/compat` platform and restricted-network adaptation
- Base: inherited main behavior
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae` retains the shared
  `ripgrep`/archive behavior without this environment-specific fallback set and
  resolves relative file-tool paths against immutable `Instance.directory`.
- Overrides: compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34` carries the established no-rg
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
- 2026-09-05 synchronization: No archive/ripgrep fallback path changed;
  restricted-network and Windows behavior remains intact.
- Review basis: inherited main
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae`; compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34`.
- Evidence: focused regressions distinguish simple fallback listings from
  operations that require real `ripgrep` and cover real-cwd marker scanning,
  ignore semantics, errors, abort, deep trees, and the Windows ZIP guard at the
  compat behavior tree. Relative Edit/MultiEdit coverage independently binds
  the inherited file-tool contract to the same fixed instance cwd.
- 2026-09-01 review: incoming changes had no ripgrep/archive fallback overlap;
  the restricted-network and Windows adaptations remain unchanged.
- 2026-09-01 OAuth-branding propagation: no platform-fallback path or symbol
  overlap; both adaptations remain compat-only and unchanged.
- 2026-09-01 tool-guidance/Codex-convergence sync: no ripgrep/archive path or
  symbol overlap; both platform adaptations remain compat-only and unchanged.
- 2026-09-02 default-model/Compose/voice sync: no ripgrep/archive path or symbol
  overlap; both platform fallbacks remain compat-only and unchanged.
- 2026-09-02 OpenAPI/0.1.14 sync: no ripgrep/archive path or symbol overlap;
  both platform fallbacks remain compat-only and unchanged.
- 2026-09-02 WebSearch/session-ID sync: no ripgrep/archive path or symbol
  overlap; the restricted-network and Windows fallbacks remain unchanged.
- 2026-09-03 PR #73 propagation: no ripgrep/archive path or symbol overlap;
  both platform fallbacks remain unchanged.
- 2026-09-04 PR #74 propagation: no ripgrep/archive path or symbol overlap;
  both platform fallbacks remain unchanged.
- Exit condition: keep this entry compat-only; it is not proposed for `main`.
  Reconsider only when the supported deployment can reliably provision the
  shared binaries, or upstream supplies equivalent fallbacks with the same
  fail-closed boundaries.

## DC-MODEL-001 — per-agent MaxMode

- Status: active
- Canonical owner: `dev/compat` agent configuration and MaxMode routing
- Base: inherited main behavior
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae` provides shared MaxMode
  orchestration, bounded candidate/judge retry, main-only session-global retry
  status/event publication, and FC-013's tool-free final-step boundary without
  a compat-style per-agent opt-in contract. It also owns reliable multimodal
  title generation through the hidden `title` agent's `modelRef: "lite"`,
  structured output, and ephemeral retry path.
- Overrides: compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34` adds `agent.maxMode` and generated
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
- 2026-09-05 synchronization: Inherited title mention cleanup and subtask
  terminal-state guards without changing per-agent MaxMode, lite/ephemeral
  title isolation, or retry status ownership.
- Review basis: inherited main
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae`; compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34`.
- Evidence: the agent config schema, resolved agent information, generated
  public schemas, routing predicate, structured-output exclusion, retry
  behavior, main-only session status/event gate, and final-step cases are all
  represented in the named source/test surfaces at the compat behavior tree;
  title generation and locale regressions remain inherited alongside them.
- 2026-09-01 review: compat retains per-agent MaxMode opt-in, main-only
  session-global status/events, and the tool-free final-step boundary.
- 2026-09-01 OAuth-branding propagation: `plugin/codex.ts` changes only private
  browser-page literals; loader, model limits, MaxMode routing, retry status,
  generated schemas, and the tool-free final step remain unchanged.
- 2026-09-01 tool-guidance/Codex-convergence sync: audited upstream/main prompt,
  system, and harness semantic adjacency was reviewed; the final compat
  production delta is empty on those owner surfaces. Compat inherits the
  stronger shared tri-state resolver and action guidance while preserving
  per-agent MaxMode, final-step, title, retry-status, and generated-schema
  behavior; 20 owner sentinels passed.
- 2026-09-02 default-model/Compose/voice sync: inherited the stable live-registry
  default-model fallback, including recent/config validation and usable-chat
  filtering. Per-agent MaxMode, the lite hidden-title path, final-step bound,
  retry-status isolation, and generated schemas remain compat-owned and
  unchanged.
- 2026-09-02 OpenAPI/0.1.14 sync: the generated OpenAPI surface overlaps this
  owner but regenerates to the established compat artifact. `AgentConfig.maxMode`
  and its routing, final-step, structured-output, and status-isolation behavior
  remain unchanged; 20 owner sentinels passed.
- 2026-09-02 WebSearch/session-ID sync: inherited request-scoped
  `model.api.id` for Xiaomi WebSearch. Per-agent MaxMode, final-step and
  `json_schema` gates, hidden-title routing, and retry-status isolation remain
  compat-owned and unchanged.
- 2026-09-03 PR #73 propagation: generated OpenAPI/SDK carriers overlap, but
  `AgentConfig.maxMode`, routing, final-step, structured-output, hidden-title,
  and retry-status behavior remain unchanged.
- 2026-09-04 PR #74 propagation: prompt handoff and task metadata overlap the
  run loop, while per-agent MaxMode routing, final-step and structured-output
  gates, hidden-title isolation, and retry-status ownership remain unchanged.
- Exit condition: retire when shared `main` exposes equivalent per-agent
  opt-in, generated interfaces, mode exclusions, retry behavior, and final-step
  enforcement; do not retire merely because the global experimental switch
  exists.

## DC-CONTEXT-001 — model-visible content caps and request preflight

- Status: active
- Canonical owner: `dev/compat` model-request safety boundary
- Base: inherited main behavior
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae` retains FD-002 instruction
  delivery, shared retry/title construction, versioned skill snapshots, stable
  per-session memory-path templates, FC-007's fixed `Instance.directory`, and
  FC-015's effective compaction window without this complete compat cap,
  serialization, and preflight set.
- Overrides: compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34` bounds model-visible content and
  estimates the effective request before dispatch. DC-ACTOR-001 separately owns
  the full-context/static-prefix actor extension.
- Delta: instruction, inbox, replayed tool input/output, synthetic error media,
  judge fields, and actor state use explicit UTF-8/character caps and
  non-throwing serialization. HTTP title inputs and retained v2 skill-catalog
  snapshots remain bounded; stable `{current_session_id}` memory instructions
  are counted without being rewritten before filesystem-tool execution.
  Request preflight accounts for system/messages, treats current-turn context
  as unshrinkable, includes only active tool schemas, and uses the inherited
  effective window, including `MIMOCODE_COMPACTION_MAX_CONTEXT` and the
  reserve-safe trigger ratio. It routes recoverable overflow to existing
  recovery and distinguishes an unrecoverable static prefix. Preflight does not
  restore a mutable cwd store, setter, clear path, `Event.Changed` publisher,
  or `change_directory` tool; cross-directory calls continue to use absolute
  paths or explicit `workdir`. Checkpoint tail collapse, TUI context accounting,
  and revert/redo use exact chronological positions rather than caller-supplied
  ID ranges. The independent checkpoint-coverage projection survives a marker
  falling outside the newest-100 message page, resolves
  `digestUpTo ?? coveredUpTo`, and fails closed while a watermark is unresolved.
  Checkpoint rebuild filtering reconstructs the logical tail through the
  persisted `coveredUpTo` seam, including across stream pages and when
  canonical `(time.created, id)` order places a synthetic marker after a
  same-timestamp live message. The active marker moves to the logical seam,
  superseded context boundaries are removed, and missing or reversed coverage
  fails closed to the full observed history. The published OpenAPI exposes
  `/session/{sessionID}/checkpoint-coverage`, `CheckpointCoverage`, and
  `CompactionPart.projection`. Every published code sample imports
  `@mimo-ai/sdk/v2`, camelizes underscore operation-ID segments, and targets an
  actual callable v2 client method.
- Source and synchronization surfaces:
  `packages/opencode/src/cli/cmd/tui/context/sync.tsx`,
  `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`,
  `packages/opencode/src/cli/cmd/tui/util/model.ts`,
  `packages/opencode/src/inbox/render.ts`,
  `packages/opencode/src/server/routes/instance/session.ts`,
  `packages/opencode/src/session/checkpoint.ts`,
  `packages/opencode/src/session/classify.ts`,
  `packages/opencode/src/session/compaction.ts`,
  `packages/opencode/src/session/instruction.ts`,
  `packages/opencode/src/session/llm.ts`,
  `packages/opencode/src/session/max-mode.ts`,
  `packages/opencode/src/session/message-v2.ts`,
  `packages/opencode/src/session/overflow.ts`,
  `packages/opencode/src/session/prefix-snapshot.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/session/revert.ts`,
  `packages/opencode/src/session/session.ts`,
  `packages/opencode/src/session/system.ts`,
  `packages/opencode/src/session/tail-digest.ts`,
  `packages/opencode/src/tool/actor.ts`,
  `packages/shared/src/util/encode.ts`,
  `packages/opencode/src/util/safe-stringify.ts`,
  `packages/opencode/src/util/text-truncate.ts`,
  `packages/opencode/src/cli/cmd/generate.ts`,
  `packages/sdk/js/src/v2/gen/sdk.gen.ts`,
  `packages/sdk/js/src/v2/gen/types.gen.ts`, and
  `packages/sdk/openapi.json`.
- Test surfaces: inbox rendering, request classification, instruction, MaxMode,
  message replay, overflow, prompt-effect, actor, checkpoint coverage,
  checkpoint tail, context usage, select-messages, revert, safe-stringify, and
  text-truncation suites under `packages/opencode/test/`, including
  `packages/opencode/test/cli/tui/checkpoint-coverage-sync.test.tsx`,
  `packages/opencode/test/server/checkpoint-coverage.test.ts`,
  `packages/opencode/test/server/openapi-refs.test.ts`,
  `packages/opencode/test/session/checkpoint-rebuild-unify.test.ts`,
  `packages/opencode/test/session/messages-pagination.test.ts`,
  `packages/opencode/test/session/prompt-rebuild-loop.test.ts`, and
  `packages/opencode/test/lib/llm-server.ts` supporting request-boundary
  assertions.
- 2026-09-05 synchronization: The new default Bash preview can exceed the
  existing 50 KiB model-replay cap. Completed Bash output with truncated=true
  and a non-empty archive outputPath now uses the existing head+tail slice
  within that same cap, retaining the tail and full-output pointer. Other
  tools and unarchived Bash retain head slicing. HTTP title input validation
  remains bounded; automatic/internal ensureTitle-to-genTitle input has no
  unified cap, a pre-existing limit clarified here rather than a new sync
  regression.
- Review basis: inherited main
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae`; compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34`.
- Evidence: focused tests at the compat behavior tree cover oversized
  instructions, structured provider/tool replay, unserializable inputs,
  synthetic media, UTF-8/surrogate limits, active-tool filtering, recoverable
  overflow, current-turn context pressure, effective-window configuration,
  retained skill snapshots, stable memory paths, title requests, and
  static-only overflow classification. Coverage tests bind the independent
  cold/live projection, response sequencing, unresolved-watermark fail-closed
  state, deletion and directory-switch invalidation, and SQLite BINARY/UTF-8
  ordering, including the U+E000 versus U+10000 counterexample to UTF-16 order.
  Coverage-seam regressions bind a same-timestamp live user behind the physical
  marker, legacy markers without `source`, repeated markers at one watermark,
  cross-page reconstruction, exact assistant-tail collapse, and fail-closed
  missing/reversed seams. The published-contract guard requires the generated
  and checked-in operation sets to match, requires the checkpoint route/schema
  and projection field in both documents, and resolves every generated sample
  target against a real v2 client. The final artifact contains 141 operations,
  141 samples, 141 unique callable targets, and no missing target.
- 2026-08-28 review: the inherited auto-overflow fixture now declares an empty
  proactive checkpoint ladder and retains the shared 25K reserve-boundary
  sentinel. Compat additionally preserves its deterministic short agent prompt,
  empty tool allowlist, and first-call assertion.
- 2026-09-01 review: compat preserves prefix snapshots and compaction
  projections, 50 KiB model-visible caps, request-preflight recovery floors,
  exact overflow placeholders, external-request episode/admission boundaries,
  bounded recovery attempts, positional checkpoint coverage, and global
  revert/redo projection. Exact-SHA CI on the first documentation snapshot
  invalidated its stop-at-marker assumption twice. The final behavior
  reconstructs checkpoint tails from their persisted coverage seam and binds
  the runtime, published OpenAPI, and callable v2 SDK samples without
  establishing a new compat-only capability.
- 2026-09-01 OAuth-branding propagation: no request, preflight, cap,
  checkpoint, chronology, or generated-contract path overlaps this owner; the
  complete bounded-context behavior remains unchanged.
- 2026-09-01 tool-guidance/Codex-convergence sync: model-visible default and
  system-prompt semantics were re-reviewed. The action guidance introduces no
  new request payload or generated-contract delta, and all caps, preflight,
  recovery, checkpoint, and chronology bounds remain intact; 43 owner
  sentinels passed.
- 2026-09-02 default-model/Compose/voice sync: FC-016's Prompt snapshot is a TUI
  editor/owner boundary, not an alternate model-request context contract.
  Provider fallback now rejects unusable chat models, while every compat cap,
  effective-window preflight, recovery, checkpoint, chronology, and generated
  contract remains intact.
- 2026-09-02 OpenAPI/0.1.14 sync: adopted the shared full runtime/published
  `CompactionPart` projection equality guard while retaining compat checkpoint
  coverage and callable-v2 sample checks. Fresh generation preserves all 141
  operations and samples, `CheckpointCoverage`, reserve-safe descriptions, and
  the compat context contract.
- 2026-09-02 WebSearch/session-ID sync: session IDs remain opaque keys; new and
  legacy formats coexist without migration, while descending message IDs keep
  their chronology marker. Stable memory paths, checkpoint coverage, request
  preflight, and existing WebSearch-output truncation remain unchanged.
- 2026-09-03 PR #73 propagation: inherited the shared `prompt_async` queue
  producer and its 204/400/404 public contract. Compat content caps, prefix
  snapshots, preflight, compaction, checkpoint chronology, and recovery routes
  remain unchanged.
- 2026-09-04 PR #74 propagation: inherited closing-run handoff, parent-linked
  classification, and atomic derived-user admission. The guarded write reuses
  compat schema, ownership, ID/idempotency, and monotonic actor chronology in
  one immediate transaction; compaction retains both pending-external checks,
  projection, preflight, checkpoint coverage, and bounded recovery.
- Exit condition: retire only when shared `main` enforces equivalent caps and
  non-throwing serialization at every model-visible boundary and performs the
  same request-aware, active-tool preflight without weakening FD-002 delivery.

## DC-ACTOR-001 — full-context actor and static-prefix overflow extensions

- Status: active
- Canonical owner: `dev/compat` actor request/context integration
- Base: inherited main behavior
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae` provides FD-009's fail-closed
  frozen-context admission, FC-001's lifecycle linearization, FC-007's fixed
  instance cwd, default-fork checkpoint writers, and FD-002's fail-closed
  main/registered-peer `replace-agent` identity scope.
- Overrides: compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34` extends those shared invariants
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
  `packages/opencode/src/session/compaction.ts`,
  `packages/opencode/src/session/overflow.ts`,
  `packages/opencode/src/session/prefix-capture-ref.ts`,
  `packages/opencode/src/session/prefix-snapshot.ts`,
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
- 2026-09-05 synchronization: Inherited the subtask running-only metadata
  guard and terminal assignments while retaining full-context
  membership/system/cwd, known-actor replacement, and static-prefix overflow
  behavior.
- Review basis: inherited main
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae`; compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34`.
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
- 2026-09-01 review: compat retains frozen fork system, tools, permissions,
  turn context, and cwd across request recovery; old child history can compact
  without losing the active turn, while an unrecoverable frozen prefix fails
  closed.
- 2026-09-01 OAuth-branding propagation: no actor, frozen-prefix, or overflow
  path overlaps this owner; admitted membership and static-prefix failure remain
  unchanged.
- 2026-09-01 tool-guidance/Codex-convergence sync: actor/task guidance is
  semantically adjacent to spawning but changes no actor schema or transport.
  Frozen membership, searchable MCP capture, active-child inclusion, and
  static-prefix fail-closed behavior remain intact; 8 owner sentinels passed.
- 2026-09-02 default-model/Compose/voice sync: no actor runtime, prefix,
  permission, child-lifecycle, or static-preflight path overlap. Compose Next
  guidance and FC-016 remain shared behavior outside this compat owner.
- 2026-09-02 OpenAPI/0.1.14 sync: compaction and effective-window contracts are
  semantically adjacent, but no actor production path changed. Eight frozen-
  membership, searchable-tool, and fail-closed preflight sentinels passed.
- 2026-09-02 WebSearch/session-ID sync: a peer still uses the same value for
  `session_id`, `actor_id`, and child ID under the new format. Actor-selected
  request models continue through `ctx.extra.model` to WebSearch; frozen
  membership, system, cwd, permissions, and static-prefix behavior are intact.
- 2026-09-03 PR #73 propagation: FC-001 queue admission is lifecycle-adjacent,
  but no actor path changed. Frozen membership, system, cwd, permissions, and
  static-prefix behavior remain intact.
- 2026-09-04 PR #74 propagation: actor prompt and compaction paths inherit
  atomic derived turns and parent task binding. Full-context membership,
  frozen system/tools/permissions/cwd, and static-prefix fail-closed behavior
  remain compat-owned and unchanged.
- Exit condition: retire only when shared `main` supplies equivalent
  frozen-membership full-context actors, bounded state transport, and
  unrecoverable-static-prefix handling while FD-009 and FC-001 remain satisfied
  or are retired independently.

## DC-TUI-001 — request provider/model/variant display

- Status: active
- Canonical owner: `dev/compat` TUI request-metadata presentation
- Legacy ID: FD-007
- Base: inherited main behavior
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae` follows upstream's condensed
  model presentation, which may omit the provider label or an unselected
  variant, and propagates the current BCP 47 `titleLocale` through TUI prompt
  submissions and automatic title generation.
- Overrides: compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34` displays one request-oriented
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
- 2026-09-05 synchronization: No TUI component or locale submission path
  changed. Title context now strips leading mentions while
  provider/model/variant metadata remains authoritative.
- Review basis: inherited main
  `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae`; compat behavior
  `9121d0efc66fbce72c75342cdf3d2159c13f8c34`.
- Evidence: rendering tests cover the unified label and narrow layout; model
  tests cover explicit and persisted variants, literal/group agent refs,
  mismatched models, absent variants, and unknown built-in tiers. Prompt and
  App submission tests cover the independently inherited locale path.
- 2026-09-01 review: incoming `main` changes had no TUI metadata or locale-path
  overlap. The compat follow-up changed adjacent prompt, model-ordering,
  checkpoint-context, and global revert/redo paths without changing the
  provider/model/variant display or `titleLocale` submission contract.
- 2026-09-01 OAuth-branding propagation: browser callback HTML has no shared
  component or state with TUI request metadata; provider/model/variant truth and
  `titleLocale` submission remain unchanged.
- 2026-09-01 tool-guidance/Codex-convergence sync: no TUI component, request
  metadata, or locale path overlap; provider/model/variant truth and
  `titleLocale` submission remain unchanged.
- 2026-09-02 default-model/Compose/voice sync: resolved the Prompt conflict
  semantically. Compat retains `ModelMetadata`, effective provider/model/variant
  rendering, flex behavior, and both `titleLocale` submission paths; it inherits
  FC-016's complete voice binding, stop/drain, and grapheme-safe editor flow.
  The upstream-only `currentProviderLabel` is intentionally absent because the
  compat metadata component is authoritative.
- 2026-09-02 OpenAPI/0.1.14 sync: no TUI metadata, layout, or locale path
  overlap; the request-oriented provider/model/variant truth remains unchanged.
- 2026-09-02 WebSearch/session-ID sync: no TUI component path changed. Session
  IDs remain opaque round-trip values; provider/model/variant truth and both
  `titleLocale` submission paths remain unchanged.
- 2026-09-03 PR #73 propagation: no TUI component path changed. The existing
  client-visible queued state now has its shared persisted producer restored;
  provider/model/variant truth and locale submission remain unchanged.
- 2026-09-04 PR #74 propagation: no TUI component path changed. Shared handoff
  now drains persisted queued turns; provider/model/variant truth and locale
  submission remain unchanged.
- Known limits: an unconfigured built-in tier can display `variant: none` while
  the server resolves an agent variant through its default-model path. An
  in-session agent switch can likewise display `variant: none` until the TUI has
  request-persisted metadata that reflects the server's resolved agent variant.
- Exit condition: retire when the server exposes authoritative pending-request
  provider/model/variant metadata, or shared `main` renders equivalent truth
  without client-side default-model guessing and covers both known limits.
