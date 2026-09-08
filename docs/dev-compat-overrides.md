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
- Last reviewed: 2026-09-08
- Reviewed upstream: `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`
- Accepted `main` tip: `fb16a8fd5a7b916421e7a04ca31f06559e086298`
- Inherited main behavior: `0b665c7e681e44cac6f1a6acf18732015fb2bf86`
- Compat behavior: `a3ed4d703767db5b130a6b38ce3e38317b2ece36`
- Prior compat tip: `f9123761f62de7457f5eb2152afba02889927b8d`
- Main source inheritance merge: `a3ed4d703767db5b130a6b38ce3e38317b2ece36`
- Shared audit commit: `e136aa2ae24e13ec0f988a1a261d3af127b8eeda`
- Inherited bundled guidance content: `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`
- Tested local preview: `25dad8230a4313dcfbdaf520ff87c95244c50c07`
- Publication state: POLICY-04 main PR #87 and correction PR #90 accepted after current-head Codex review and all eight CI checks; compat inherits the formal merge and awaits its own review and CI.
- History: [dev-compat-registry-history.md](dev-compat-registry-history.md)

`Base` names the inherited source/test behavior being reviewed. `Overrides`
names the compat source/test behavior and the shared or upstream contract that
it changes or extends. Neither field names this documentation commit. Shared
bundled guidance has a separate content snapshot and is inherited unchanged.

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

The 2026-09-07 propagation inherits all five audited capabilities: four from
upstream `ec3f9894..6203ea2e` and the already accepted main synchronization
skill. Recovery settlement remains shared FC-001 behavior: atomic runner
admission and candidate validation precede old-assistant settlement, which
precedes admission success and the new loop; the finalizer remains idempotent.
DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 have direct prompt-path overlap
with request/context semantic adjacency. DC-TUI-001 has only App locale-fixture
adjacency, and the three network/platform owners have no incoming overlap.
The single test conflict retained the new recovery cases and the existing
400-case type predicate. All seven owners remain active at compat behavior
`d5396a50856f264eda899c3094d9dd232d728307`; the later shared-audit inheritance
merge changes documentation only.

The subsequent 2026-09-07 specified audio adoption inherits AUDIO-01 without
conflicts or a compat-only adaptation. The two explicit, authenticated audio
endpoints and every selected provider/server/test source are byte-identical to
accepted main. DC-MODEL-001 and DC-CONTEXT-001 have generated-contract adjacency;
regeneration preserves their existing schemas. DC-TUI-001 retains its independent
TUI metadata behavior. The network/platform owners and DC-ACTOR-001 have no
changed owned implementation. All seven overrides remain active at the new
compat behavior recorded above; the later main-audit merge is documentation-only.

The 2026-09-07 explicit model API propagation inherits both selected capabilities
(MODEL-01 and MODEL-02) and FD-004's narrowed listener boundary. All 92 prior
non-registry main-to-compat delta paths retain their original blobs on both
sides; none overlaps this incoming source change. DC-MODEL-001,
DC-CONTEXT-001 and DC-ACTOR-001 are semantic neighbors, but standard proxy calls
do not run or replace per-agent MaxMode, bounded-context preflight or actor
context capture. Network/platform policies and TUI metadata are unchanged.
All seven owners remain active; no compat-only model API implementation is added.

The 2026-09-07 selected-capability propagation inherits ALIAS-01, SCHEMA-01,
and RECOVERY-01 from main source `f9e8a8a4f8be6cb826319e7dfa20c680606f6601`, with the compat adaptation
at `e9e0a6b57a0a865927afaba5316782cdc0af7ee4`. The accepted main tip is `c1dfc423fe021072d37b8585b5bcc33c4742d514`; the final
main-audit inheritance merge is `c7e154ded8c2ac4c4dd950b1040d065a939c5f65`. These are shared FD-005,
FD-006, FC-001, and FD-009 decisions, not an eighth compat override. SCHEMA-01
remains an explicit declaration experiment; it does not adopt compressed
declarations into the production default or hide permission/control tools.

DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 have actual agent, prompt,
prefix, compaction, actor, checkpoint, or generated-contract overlap. Their
per-agent MaxMode, current-turn/active-tool preflight, frozen context, and
published compat contracts remain in force. The two network owners,
DC-PLATFORM-001, and DC-TUI-001 have no incoming owned implementation change.

The shared recovery correction advances run-local user authority only through
successful conditional-write receipts from that runner's own continuation or
compaction. A hook label, matching model, or matching task alone grants no
authority. Compat retains both pending-external-request guards, compaction
projection, and `continuationMessageID` tracking/cleanup, alongside frozen
`turnContext` and same-capture `modelIdentity`, including cold-start checkpoint
writers. Earlier dated main-only recovery statements describe the prior
capability boundary; the adopted internal persistent/full-context actor resume
does not broaden the public session recovery/resume API beyond the main actor.

Validation for this propagation: 771 pass, 4 skip, 0 fail, 2,858 assertions across 65 files; opencode and SDK typecheck, repository lint, Node build/import/schema smoke, and source-derived SDK/OpenAPI generation pass. Warnings remain. Source/test/generated hashes did not change during validation or the later audit merge. Exact final remote-SHA CI is checked separately at publication. Historical validation
paragraphs below retain their original scope and are not this operation's
matrix or exact-head CI record.

The 2026-09-08 specified COMPACT-01 propagation adopts automatic Codex compact
advertisements, direct actor/interactive control exceptions and request-pinned
hidden execution from shared main. This production decision supersedes the
prior compact-mode rejection; SCHEMA-01 remains its separate experiment.
All seven DC entries remain active. MODEL/CONTEXT/ACTOR have direct semantic
and source overlap; network/platform/TUI contracts retain their existing behavior.

Frozen snapshots retain the complete authorized definition pool and separate
advertised names. New all-boolean JSON active flags override the legacy compat
active_tools column, while legacy and mixed snapshots retain the old fallback
rules. Live tool schemas must match frozen definitions before rebinding;
whitelist checks remain independent. Active-only preflight and compaction keep
compat current-turn context, MaxMode, chronology, caps and admission receipts.

Final local evidence: 2,601 pass, 0 fail, 26 skip, 1 todo and 7,362 assertions across 192 files; package typecheck, lint and Node build/import checks pass. Of the 94 prior delta paths,
76 retain their original blob and mode on both sides; the additional classifier
test adaptation now captures real parent schemas and separately proves schema
drift rejection. Shared FD/FC registries and history inherit the accepted main
tip byte-for-byte. The history ledger distinguishes the original failed/time-limited
matrix from complete replacement-file runs. Final exact-SHA CI and remote ancestry
are separate publication checks. The dated 2026-09-07 evidence above remains
historical and is not the validation record for this propagation.

The 2026-09-08 released model API propagation inherits the six selected
capabilities from accepted main `85dfc3f2` at compat runtime/test tree
`8c73cc2b`. All 96 pre-existing overlay paths retain their prior main/compat
blob pairs; none of the 38 incoming paths needs a compat specialization.
All seven DC entries were re-reviewed for actual overlay and semantic adjacency.
Images retain main's independent public-destination policy, while the approved
WebFetch private-target exception and MCP configuration sentinel remain separate.
Shared FD/FC registries, history and bundled guidance inherit main byte-for-byte.
Validation and publication boundaries are recorded in the appended compat history.

The MEDIA-DNS-01 follow-up inherits accepted main `1f88fded` through ancestry
merge `cdf6820c`. Its complete tree equals the tested compat candidate
`76685956`; the candidate and final ancestry merge are distinct provenance
references, not separate runtime test runs. The 96-path overlay is preserved,
with no new DC. Current validation and publication limits are in the appended
[compat history](dev-compat-registry-history.md#2026-09-08-media-dns-01-inheritance).

The POLICY-06 propagation inherits accepted main `bfa3c2466d07da01881b252a0337ac444b4ae927` at compat
runtime/test tree `8b265508032ac27554ec71c54b1f49bebf10cbc8`. All 96 existing overlay paths and the normalized
production deltas in all 43 production overlay paths remain unchanged. The
only manual integration is deduplicating an existing checkpointPath test import.
Run approval is separate from frozen turnContext and chronological message
admission; successful continuations retain it, while unrelated queued input
closes the old scope. All seven DC owners were re-reviewed; no new override is
introduced. See the appended [compat history](dev-compat-registry-history.md#2026-09-08-policy-06-yolo-approval-inheritance).

The POLICY-06 PR #84 correction re-review inherits accepted main
`3350f0f2ce17501d4d925f5e293f07d809f29f22`, source
`c7014557445832a97248ed7b0af568e51bfd291d`, and shared audit
`0e57377e9f6201dee1b23efb3ccc0239378b9d8d` at compat source
`f912482a26b8ae32f03987798dd5068f24860b91`. This ancestry merge has the same
tree as preview `c01b3002dc32bf275df6fc646564c4358680fbe3`. Against old main
`bfa3c2466d07da01881b252a0337ac444b4ae927` and old compat
`9e8017c75a28899f6b4dab87aec26ea1c4c1921c`, the source snapshots retain all
96 overlay paths, including all 43 production paths: both the main and compat
blob at every overlay path are unchanged. Shared FD/FC registries, their
history, and bundled permission guidance match accepted main byte-for-byte.
This current-record update adds no runtime override and preserves the earlier
propagation snapshots above.

All seven DC owners were re-reviewed against the correction diff. Its only
runtime changes are shared `permission/index.ts` and `tool/bash.ts`, with no
existing compat overlay path overlap. DC-NET-001/002 and DC-PLATFORM-001 retain
their destination, MCP reachability, and fallback contracts; DC-TUI-001 retains
its request-metadata display. DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001
retain MaxMode, chronology, frozen context, parent permissions, and cwd.
Compat prompt/Actor bridges still carry the current RunApproval independently
of frozen context, and unrelated queued input still closes its prior scope.
An explicit full-command delete reply, including the winning forwarded
one-shot reply, now supplies the shared per-request receipt. Automatic delete
approval or an earlier delegation grant does not supply that receipt, so
ordinary Bash/external-directory checks still run; explicit deny remains
binding. A late forwarded resolver cannot relabel an automatic completion.

The correction matrix recorded 50 passes and one attached-CLI timeout, with
211 assertions; that same CLI case then passed alone with 15 assertions in
20.49 seconds overall. Package typecheck passed. These are a matrix plus an
isolated rerun, not a new all-green matrix or final-tip CI claim. No additional
runtime test was run for this registry-only re-review.

The POLICY-01 propagation inherits accepted main `d415822c29539a4b6eebeafb59de1b88da18b95c` at
compat runtime/test tree `5946f3c26b089adb412c6cee07d8129a09cfbfe3`. Main runtime/tests and
bundled guidance are `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`; the reviewed PR head is
`eb4ab66ee85cda01ad2e543a0a70ef14a4f78023`. The formal ancestry merges have the same tree as
tested preview `9e8d2d247a2f59d863966717599e315136580140`.

The overlay now has 95 paths and 42 production paths. Only the old plan.ts
producer override disappears: shared plan approval now uses
commitUserMessageIfLatest, while compat's transaction retains validated
message/part ownership and monotonic actor chronology. Prefix restore combines
native Actor schema metadata with compat active-tool filtering; toolsHash keeps
both native contracts and loaded MCP membership. The two test conflicts retain
both assertions and one copy of checkpointPath.

All seven DC owners were checked. DC-CONTEXT-001 and DC-ACTOR-001 retain their
preflight caps, frozen turnContext, actor slices and run-approval admission.
DC-MODEL-001 retains per-agent MaxMode and final-step gates. DC-TUI-001 retains
model metadata while consuming trusted plan receipts and Question terminal
events. Network and platform source policies are unchanged and were checked by
diff; no new override is introduced. Shared FD/FC and their history match main.

Local validation comprises 21 prefix/plan cases, 4 frozen-native cases, 25 real
Actor/interaction/compat admission cases, and 15 TUI cases; groups overlap and
are not an aggregate. Package typecheck passed; lint reports 0 errors and 4526
warnings. Formal compat PR review, exact-head CI and final push CI remain
publication gates. See [the POLICY-01 history](dev-compat-registry-history.md#2026-09-08-policy-01-full-exec-actor-and-interaction-inheritance).

The POLICY-04 local integration moves the catalog into the frozen system tail,
while retaining compat's 50 KiB catalog cap, current-turn preflight projection,
loaded MCP identity, active/native tool snapshots, and frozen actor turnContext.
A narrow compat recognizer accepts historical truncated v2 catalogs only with
the original schema/hash, exact truncation marker and byte budget; ordinary or
loaded skill text is not removed. CONTEXT/MODEL/ACTOR have real production-path
overlap; NET-001/NET-002/PLATFORM/TUI have none for this incoming change. All
seven owners were re-reviewed; no new DC is introduced.

The common five-registry exclusion gives 93 old versus 97 new overlay paths
(41 versus 42 production paths); raw counts are 95 and 99. Existing paths are
retained. Four additions belong to the existing context contract: the catalog
recognizer, the shared capture-test adaptation, and two compat-specific tests.
Shared FD/FC/history and the catalog guide match main audit `e136aa2ae24e13ec0f988a1a261d3af127b8eeda` byte-for-byte.
The latest candidate also recognizes verified v2 descriptions containing
`<skill_content>` before applying the legacy loaded-body safeguard. It refreshes
the verified catalog/format slot, retaining
all other frozen system bytes. Structured/text transitions follow the current
request without changing the catalog version. Compat's truncated-v2 recognizer, current-turn
projection and three-dimensional tool hash remain intact. The follow-up matrix
has 43 passing cases / 148 assertions, with no failures; package typecheck
passed and repository lint reports 4537 warnings / zero errors. The prior
preview's 101 cases / 479 assertions remain prior evidence, not repeated runs.
Formal main acceptance and inheritance are complete; compat publication awaits its own review and CI. See [the POLICY-04 history](dev-compat-registry-history.md#2026-09-08-policy-04-system-tail-catalog-local-integration).
These current review references do not re-date or claim to rerun older evidence.

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
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86` implements FC-010's inherited
  destination-classification, per-hop authorization, and resource-bound
  contract by applying `assertSafeUrl()` before the initial and redirected
  target's permission decision and request. DC-NET-001 overrides only whether
  compat WebFetch invokes that inherited classifier at its call seam.
- Overrides: compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36` removes only the
  `assertSafeUrl` import and its two call sites from WebFetch. The inherited
  classifier implementation and tests, including full IPv6 link-local
  `fe80::/10` coverage, remain byte-identical to `main`; compat WebFetch does
  not call that classifier. The separate model API image downloader is identical
  to main and still rejects private destinations at every hop; this override
  grants no exception to `src/llm-server/images.ts`. MEDIA-DNS-01 inherits
  sequential fallback within each fully validated public DNS answer set for
  the shared refused/unreachable connection-error whitelist only. TLS, HTTP
  and body failures remain terminal; WebFetch policy is unchanged.
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
- 2026-09-07 synchronization: No WebFetch/SSRF path or symbol overlap. The
  approved private-target call seam and inherited per-hop authorization,
  HTTP(S), redirect, timeout, and response-size bounds remain unchanged.
- 2026-09-07 explicit model API propagation: No WebFetch path overlap; approved private-network policy remains owned here.
- POLICY-04 review: No incoming production-path overlap; the existing source overlay is retained. This review does not claim new runtime coverage of this owner.
- Review basis: inherited main
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86`; compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36`.
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
- 2026-09-07 selected-capability review: No WebFetch/SSRF call-seam overlap.
  Approved private-destination access and inherited per-hop permission,
  HTTP(S), redirect, timeout, and response-size bounds remain unchanged.
  Shared ALIAS-01/SCHEMA-01/RECOVERY-01 adds no network-policy override.
- 2026-09-08 selected Actor/MCP completion: The selected Actor/MCP integration has no WebFetch or destination-classification overlap; the private-network WebFetch override remains unchanged.
- Exit condition: retire or narrow this override only after a shared,
  operator-controlled private-network authorization mechanism preserves
  required intranet access while retaining per-hop permission and resource
  controls.

## DC-NET-002 — RFC1918 remote HTTP(S) MCP reachability

- Status: active
- Canonical owner: `dev/compat` remote-MCP compatibility guarantee
- Base: inherited main behavior
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86` and FC-004 validate that remote
  MCP URLs parse as HTTP(S), but deliberately make no fork-wide private-network
  promise.
- Overrides: compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36` adds a compat-owned guarantee and
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
- 2026-09-07 synchronization: No MCP path or symbol overlap. Production MCP
  remains byte-identical to accepted main; the existing RFC1918 test keeps its
  mocked client-creation scope and does not establish OAuth interoperability.
- 2026-09-07 explicit model API propagation: No MCP client or lifecycle overlap; temporary model credentials do not change MCP authentication.
- POLICY-04 review: No incoming production-path overlap; the existing source overlay is retained. This review does not claim new runtime coverage of this owner.
- Review basis: inherited main
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86`; compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36`.
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
- 2026-09-07 selected-capability review: No remote-MCP client or lifecycle
  implementation overlap. MCP production remains identical to accepted main;
  the RFC1918 sentinel retains its mocked client-creation scope and makes no
  new real-network, authentication, or OAuth interoperability claim.
- 2026-09-08 selected Actor/MCP completion: Inherited shared per-name Claude MCP auto_connect and disabled precedence. MCP source remains byte-identical to main; the existing RFC1918 client-creation sentinel passes, without extending its oauth:false evidence scope.
- Exit condition: any future `main` private-address MCP classifier triggers a
  fresh policy review and, if intranet access remains required, a minimal
  compat-only production override. Retire the test owner only when the shared
  contract explicitly guarantees the same reachability.

## DC-PLATFORM-001 — restricted-network and Windows ripgrep/archive fallback

- Status: active
- Canonical owner: `dev/compat` platform and restricted-network adaptation
- Base: inherited main behavior
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86` retains the shared
  `ripgrep`/archive behavior without this environment-specific fallback set and
  resolves relative file-tool paths against immutable `Instance.directory`.
- Overrides: compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36` carries the established no-rg
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
- 2026-09-07 synchronization: No ripgrep/archive path or symbol overlap.
  Restricted-network and Windows fallbacks, their failure boundaries, and the
  inherited fixed-instance-cwd contract remain unchanged.
- 2026-09-07 explicit model API propagation: No ripgrep/archive path overlap; all platform fallback blobs remain unchanged.
- POLICY-04 review: No incoming production-path overlap; the existing source overlay is retained. This review does not claim new runtime coverage of this owner.
- Review basis: inherited main
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86`; compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36`.
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
- 2026-09-07 selected-capability review: No ripgrep/archive fallback
  implementation or test overlap. Restricted-network/Windows adaptations,
  inherited fixed-cwd relative-path semantics, and fail-closed fallback
  boundaries remain unchanged.
- 2026-09-08 selected Actor/MCP completion: No rg, glob, archive or platform implementation overlaps this integration; fallback behavior is unchanged.
- Exit condition: keep this entry compat-only; it is not proposed for `main`.
  Reconsider only when the supported deployment can reliably provision the
  shared binaries, or upstream supplies equivalent fallbacks with the same
  fail-closed boundaries.

## DC-MODEL-001 — per-agent MaxMode

- Status: active
- Canonical owner: `dev/compat` agent configuration and MaxMode routing
- Base: inherited main behavior
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86` provides shared MaxMode
  orchestration, bounded candidate/judge retry, main-only session-global retry
  status/event publication, and FC-013's tool-free final-step boundary without
  a compat-style per-agent opt-in contract. It also owns reliable multimodal
  title generation through the hidden `title` agent's `modelRef: "lite"`,
  structured output, and ephemeral retry path.
- Overrides: compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36` adds `agent.maxMode` and generated
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
- 2026-09-07 synchronization: The prompt carrier directly overlaps shared
  recovery settlement; MaxMode is semantically adjacent. Per-agent opt-in,
  structured-output exclusion, final-step bounds, hidden-title routing, and
  retry-status isolation remain unchanged. App locale-fixture inheritance
  creates no alternate title or MaxMode path.
- 2026-09-07 explicit model API propagation: The proxy uses resolved models and returns client tool calls; it does not run or change per-agent MaxMode or title state.
- POLICY-04 review: Real prompt-path overlap: catalog layout and pin-winner selection retain per-agent MaxMode, final gates, and candidate instruction delivery.
- Review basis: inherited main
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86`; compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36`.
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
- 2026-09-07 selected-capability review: Actual overlap includes `agent.ts`,
  `prompt.ts`, and generated SDK/OpenAPI carriers. Shared `harness_model`
  resolution and recovery identity flow coexist with per-agent MaxMode opt-in,
  non-final/non-`json_schema` gating, hidden-title isolation, and main-only
  session-global retry status/events. Fresh compat generation retains
  `Agent.maxMode` and `AgentConfig.maxMode`; ALIAS-01 creates no compat-only
  harness resolver or eighth DC owner.
- 2026-09-08 compact-tool integration: The shared Codex advertisement subset
  flows through compat's existing `runStep` and per-agent MaxMode paths.
  Non-final/non-`json_schema` gating, hidden-title isolation, and retry-status
  ownership remain unchanged; compact declarations add no new MaxMode policy.
- 2026-09-08 selected Actor/MCP completion: Actor HTTP recovery uses the same runLoop/runStep path, preserving per-agent MaxMode, final-step and structured-output gates, and main-only retry publication. SDK regeneration retains agent maxMode and title contracts.
- Exit condition: retire when shared `main` exposes equivalent per-agent
  opt-in, generated interfaces, mode exclusions, retry behavior, and final-step
  enforcement; do not retire merely because the global experimental switch
  exists.

## DC-CONTEXT-001 — model-visible content caps and request preflight

- Status: active
- Canonical owner: `dev/compat` model-request safety boundary
- Base: inherited main behavior
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86` retains FD-002 instruction
  delivery, shared retry/title construction, frozen system-tail skill catalogs, stable
  per-session memory-path templates, FC-007's fixed `Instance.directory`, and
  FC-015's effective compaction window without this complete compat cap,
  serialization, and preflight set.
- Overrides: compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36` bounds model-visible content and
  estimates the effective request before dispatch. DC-ACTOR-001 separately owns
  the full-context/static-prefix actor extension.
- Delta: instruction, inbox, replayed tool input/output, synthetic error media,
  judge fields, and actor state use explicit UTF-8/character caps and
  non-throwing serialization. HTTP title text, image, and part validation
  retains its existing limits; system-tail catalogs remain bounded at 50 KiB.
  Historical capped v2 directories migrate only after strict generated-part
  recognition, preserving loaded skill bodies and ordinary text. Stable `{current_session_id}` memory instructions
  are counted without being rewritten before filesystem-tool execution.
  Request preflight accounts for system/messages, treats current-turn context
  as unshrinkable, includes only active tool schemas, and uses the inherited
  effective window, including `MIMOCODE_COMPACTION_MAX_CONTEXT` and the
  upstream ratio trigger. Preflight compares the estimate directly with that
  trigger, without its former additional 5K/10% advance. Estimation can still
  observe a larger current request than the previous provider usage record;
  shared thresholds do not imply identical trigger timing. It routes recoverable overflow to existing
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
- POLICY-04 additional surfaces: `packages/opencode/src/session/skill-catalog.ts`,
  `packages/opencode/test/session/skill-catalog-capture.test.ts`,
  `packages/opencode/test/session/skill-catalog-compat-capture.test.ts`, and
  `packages/opencode/test/session/skill-catalog-compat-projection.test.ts`.
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
  tools and unarchived Bash retain head slicing. HTTP title text/image/part limits
  remain in force; locale has no schema length cap; automatic/internal ensureTitle-to-genTitle input has no
  unified cap, a pre-existing limit clarified here rather than a new sync
  regression.
- 2026-09-07 synchronization: Direct prompt/recovery overlap inherits shared
  settlement after atomic admission and candidate validation, before admission
  success or the new loop. Caps, active-tool preflight, current-turn recovery
  floors, effective windows, checkpoint chronology, external-admission guards,
  and the published compat contract remain unchanged.
- 2026-09-07 explicit model API propagation: Proxy body/output/concurrency bounds are shared FD-004 behavior; existing request preflight, content caps and generated contracts remain unchanged.
- POLICY-04 review: Real system/prompt/prefix/message/compaction overlap: preserve caps and current-turn recovery floors; reconcile both pin-winner message projections and the strict capped-v2 recognizer.
- Review basis: inherited main
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86`; compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36`.
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
- 2026-09-07 selected-capability review: Actual overlap includes request-prefix
  construction/capture/snapshots, prompt, compaction, checkpoint, actor context,
  and SDK/OpenAPI carriers. `currentTurnMessages`, required frozen
  `turnContext`, active tool/MCP membership, effective-window preflight,
  chronology, coverage, and callable-v2 contracts remain intact. Shared
  successful-commit receipts coexist with both pending-external-request
  guards, `continuationMessageID` cleanup, and the existing projection.
  Recovery may stop at its owned summary when a continuation CAS loses; this
  grants no authority to the competing user. SCHEMA-01 remains an experiment
  and changes neither production validators nor default authority exposure.
- 2026-09-08 compact-tool integration: Prefix snapshots retain the complete
  request-authorized pool separately from advertised tools. Complete boolean
  `active` flags in the shared JSON format take precedence over a potentially
  stale compat `active_tools` column; legacy JSON uses that column, including
  an empty list, and falls back to all stored tools only when neither format
  records a mask. Loaded MCP membership remains a separate hash input.
  Request preflight and compaction-tail budgeting count only advertised
  descriptors, including exec's compact declarations. Current-turn context,
  pending-external checks, successful-commit receipts, and continuation cleanup
  remain intact. Request-local structured schemas participate in snapshot
  rotation when a session changes output format.
- 2026-09-08 selected Actor/MCP completion: The shared actor recovery entry preserves currentTurnMessages, frozen turnContext, active-tool preflight, reserve-safe overflow, pending-external guards and owned continuation receipts. Fresh generation retains CheckpointCoverage, projection, and callable-v2 samples. The complete context/actor/checkpoint matrix passes 303 tests with two pre-existing timing skips.
- Exit condition: retire only when shared `main` enforces equivalent caps and
  non-throwing serialization at every model-visible boundary and performs the
  same request-aware, active-tool preflight without weakening FD-002 delivery.

## DC-ACTOR-001 — full-context actor and static-prefix overflow extensions

- Status: active
- Canonical owner: `dev/compat` actor request/context integration
- Base: inherited main behavior
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86` provides FD-009's fail-closed
  frozen-context admission, FC-001's lifecycle linearization, FC-007's fixed
  instance cwd, default-fork checkpoint writers, and FD-002's fail-closed
  main/registered-peer `replace-agent` identity scope.
- Overrides: compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36` extends those shared invariants
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
- 2026-09-07 synchronization: Direct prompt-path overlap is adjacent to
  full-context request execution. Recovery remains main-only; frozen actor
  membership/system/tools/permissions/cwd, known-actor replacement, and
  static-prefix failure behavior remain unchanged.
- 2026-09-07 explicit model API propagation: Proxy requests create no persistent session or actor; frozen full-context and checkpoint behavior remains unchanged.
- POLICY-04 review: Real frozen-capture/prompt overlap: inherit the winning system/catalog pair with native/active membership, loaded MCP identity, turnContext, and chronological child boundaries.
- Review basis: inherited main
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86`; compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36`.
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
- 2026-09-07 selected-capability review: Actual overlap includes actor spawn and
  tool entry, prompt, prefix capture/snapshots, checkpoint, and compaction.
  Frozen membership/system/tools/permissions/cwd and required `turnContext`
  remain intact; the same capture also carries `modelIdentity`, including the
  explicit `fork: false` cold writer. RECOVERY-01 is inherited shared behavior:
  only an eligible persistent/full-context actor retaining its receiver and
  frozen context can resume. Owned continuation/compaction receipts preserve
  the original user and task while foreign hook messages gain no authority.
  Recoverable child history remains distinct from an unrecoverable static
  prefix. The earlier dated “Recovery remains main-only” note is historical;
  internal actor resume is now supported, while public session recovery/resume
  and its OpenAPI remain main-only with no agent/task selectors.
- 2026-09-08 compact-tool integration: Full-context actors inherit the complete
  authorized tool pool and its separate advertised subset. Hidden native and
  MCP schemas that differ from the frozen contract fail closed; each request
  still owns its StructuredOutput executor. Required frozen `turnContext`,
  same-capture `modelIdentity` in both checkpoint modes, parent permissions,
  original receiver/cwd, and static-prefix overflow handling remain intact.
- 2026-09-08 selected Actor/MCP completion: Public recovery now supports the controlled agentID selector through the existing persistent/full-context Actor lifecycle; older dated main-only notes describe their historical state. task_id remains rejected. Nine real HTTP tests preserve original turnContext bytes once in append/replace-agent modes after live parent/receiver updates, including isolated peers. New exec send/status shares the original authority while capStateContext and UTF-8 limits remain in place.
- Exit condition: retire only when shared `main` supplies equivalent
  frozen-membership full-context actors, bounded state transport, and
  unrecoverable-static-prefix handling while FD-009 and FC-001 remain satisfied
  or are retired independently.

## DC-TUI-001 — request provider/model/variant display

- Status: active
- Canonical owner: `dev/compat` TUI request-metadata presentation
- Legacy ID: FD-007
- Base: inherited main behavior
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86` follows upstream's condensed
  model presentation, which may omit the provider label or an unselected
  variant, and propagates the current BCP 47 `titleLocale` through TUI prompt
  submissions and automatic title generation.
- Overrides: compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36` displays one request-oriented
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
- 2026-09-07 synchronization: Only the shared App locale fixture is
  semantically adjacent; no TUI component path changed. The existing zh-CN
  fixture and both locale assertions are retained, while TUI request metadata,
  locale submission, and the known variant-display limits remain unchanged.
- 2026-09-07 explicit model API propagation: Discovery and proxy requests do not change the TUI model/variant selection or titleLocale; all metadata surface blobs remain unchanged.
- POLICY-04 review: No incoming production-path overlap; the existing source overlay is retained. This review does not claim new runtime coverage of this owner.
- Review basis: inherited main
  `0b665c7e681e44cac6f1a6acf18732015fb2bf86`; compat behavior
  `a3ed4d703767db5b130a6b38ce3e38317b2ece36`.
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
- 2026-09-07 selected-capability review: No owned TUI metadata or locale-submission
  implementation overlap. Request provider/model/variant truth, both
  `titleLocale` paths, narrow-layout behavior, and the existing variant-display
  limits remain unchanged. The shared backend harness alias does not create
  a second compat metadata resolver.
- 2026-09-08 selected Actor/MCP completion: No metadata or titleLocale component changed; provider/model/variant presentation and existing known limits remain unchanged.
- Exit condition: retire when the server exposes authoritative pending-request
  provider/model/variant metadata, or shared `main` renders equivalent truth
  without client-side default-model guessing and covers both known limits.
