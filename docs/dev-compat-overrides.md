# dev/compat Override Registry

This is the authoritative registry for active behavior owned only by
`dev/compat`. The branch inherits the shared `main` FD/FC registries unchanged;
this file records only the remaining delta from that inherited behavior.

Review this registry whenever work targets `dev/compat` or propagates `main`
into it, including when a listed surface merges without conflicts. A pure
registry/history commit does not advance either behavior reference below.

## Current review record

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-21, full upstream synchronization through `479201262a0f08e6abe9c29022d2fb38b63e29b0`.
- Prior upstream: `50cd713989f47225cfc717868b245e1de32b35b7`.
- Starting compat: `1d5237f121854d65c4ca6d3bcd7e83312d5a7a8b`.
- Main runtime/tests: `3e1fe1607a5ec87fa2f919493b77078d44c60330`; shared guidance: `d19ea19f02ac4a4e9d0c0ff760c1da5a4a6ac7b8`.
- Integrated main: `16394bdc9766c37980a5dce098e3a425ae92c6c8`.
- Compat source/tests/CI: `43ea9dc20fe6ce8e36198aa3d452a56bed51e019`.
- Review: [eleven-capability synchronization](upstream-sync-2026-09-21.md), C01–C11.
- Resolution: inherit generation-owned MCP admission, trailing-user recovery, cancellation acknowledgement, selected-session orphan cleanup and FIFO tool gating. Preserve bounded preflight and active-schema caps, full-context/variant Actors, per-agent MaxMode, authoritative TUI metadata and all network/platform policies. The same 39 production overlay paths remain; 37 normalized diffs are unchanged, TUI sync changes only import context, and classify loses only formatting drift while inheriting the completed-tool/final-answer predicate. No owner retires or moves.
- Validation: Actor/variant/overflow/prefix/MaxMode/caps 337 pass; real Actor HTTP recovery 25 pass across four files; focused preflight/frozen-context/MCP prompt 27 pass; checkpoint/history 19 pass; tool gate integration 4 pass. The broader root matrix had 173 passing cases plus four gate fixtures rejected by compat preflight; only those test models changed from 32K to 128K, preserving output limits and all assertions. MCP/DC-NET 76 pass including real OAuth and both RFC1918 sentinels. Package typecheck passes; lint exits 0 with 4806 warnings and no errors. SDK/OpenAPI regenerate without drift.
- 2026-09-22 final-CI follow-up: inherit terminal summary ModelError conversion and early retry exclusion, including network-looking tool names. Migrate three retired directory-loader fixtures to explicit plugins without removing authority/visibility assertions; add a positive whitelist registration assertion. Final nine-file matrix: 242 pass, two existing skips, zero failures / 1418 assertions. Package typecheck and lint pass (4806 warnings, zero errors). Initial CI failures and reproduced fixes are retained in the shared record; final new tips require fresh CI.
- Shared ownership: FD/FC registries and shared history inherit main byte-for-byte. Final exact-tip CI and remote ancestry are checked after this record; local results are not publication evidence.

## Previous review record — 2026-09-19

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-19, full upstream synchronization through `50cd713989f47225cfc717868b245e1de32b35b7`.
- Prior upstream: `2bda17944b346ab85c8ee3cf0a0d4ab24819d37c`.
- Starting compat: `94b8005cd336136da9c47c077a7faab643c3eb0a`.
- Main runtime/tests: `6af6931fd6ee73999847d81809bd2476e419885d`; shared guidance: `7199810dcfe61becd47e4c4becd0166964ea5d40`.
- Integrated main: `b40391abfd0624894a966ff39a39285152e5f439`.
- Compat source/tests/CI: `b1aaec311837fa74af6526ea9137b6bac08d5967`.
- Review: [two-capability synchronization](upstream-sync-2026-09-19.md), C01 and C02.
- Resolution: inherit optional hints and main-resume cascade through retained Actor admission. The 39 compat production overlays remain; only a blank-line boundary and the location of shared actor guidance change in the normalized overlay diff. Full-context/variant transport, bounded preflight, per-agent MaxMode and authoritative TUI preview remain intact. No network or platform policy changes.
- Validation: isolated recovery 25 pass; full prompt/receipt/approval matrix 244 pass and 2 existing skips plus one obsolete fixed-delay assertion, corrected and passing on both branches; variant 13 pass; TUI metadata/preview 20 pass. Package typecheck passes; lint has zero errors. Compat SDK/OpenAPI independently regenerate without drift. Final push-SHA CI is checked after this record, not inferred from local results.
- Shared ownership: FD/FC registries are inherited byte-for-byte; no owner retires or moves between branches.

## Previous review record — 2026-09-18

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-18, full upstream synchronization through `2bda17944b346ab85c8ee3cf0a0d4ab24819d37c`.
- Prior upstream: `4cb859dd7c962b13eee5f34146350f520a380217`.
- Starting compat: `d3d25ec611bbd2c13462acfeaf4cfbcb79efdf4a`.
- Accepted main: `1435d830` (runtime/tests `759b6431963cbeb7b0940f4b7a92dc64690624d5`).
- Compat runtime integration: `cd49ecf343e08e04e13209b4e4bb00c46320a978`; subsequent commits update records only.
- Review: [single-capability synchronization](upstream-sync-2026-09-18.md), C01.
- Resolution: inherit session-wide Actor cancellation, generation/episode-bound quiet notifications and exact runner session/actor keys. Preserve FC-001 leases, terminal claims, retirement and disposal checks. All 39 compat-different production paths retain identical overlay content after excluding diff line offsets and blob IDs; full-context/variant Actors, bounded preflight, per-agent MaxMode and authoritative TUI model preview remain intact. No private-network or platform policy changes.
- Validation: complete final-source cancellation/Actor lifecycle files pass 43 tests; cascade/registry-only/runner isolation cases pass 3 tests (77 filtered). Package typecheck and lint pass with existing lint warnings. No public schema or generated output changed. Full prompt and final-SHA CI acceptance are collected after publication rather than inferred from these local results.
- Shared ownership: FD/FC registries and history are inherited byte-for-byte; no owner retires or moves between branches.

## Previous review record — 2026-09-17

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-17, full upstream synchronization through `4cb859dd7c962b13eee5f34146350f520a380217`.
- Prior upstream: `26aa00fc7e243a90586f5895ddcad2b7ce76b935`.
- Starting compat: `d7ae31894c6b5b4362076ca4b21ddf54c4b4c11a`.
- Accepted main: `b903e3aa9f62cb7c3658fb25e9d618ec4561f5b4`.
- Main runtime: `9c05eacb2817b0e100fb4b788b8085af6ba2aef5`; final main test snapshot: `13d287aac076b4b113f194991ad88c3786631625`.
- Compat source integration: `b277eca8`; final compat test snapshot: `3e39edd3084e5e31b96e67a7844bc5e067d0e4d3`; inherited shared records: `c4ba4d3fb1899133cbbf1448e8104c2022133bc7`.
- Review: [eleven-capability synchronization](upstream-sync-2026-09-17.md), C01–C11.
- Resolution: actual adapter-provider routing passes through current-turn conversion and frozen prefix capture. Native Responses error outputs retain compat input/text caps. Recall reminders remain disabled for structured-output requests while gaining persisted stable IDs. Empty-residue redispatch coexists with bounded preflight and overflow-placeholder receipts. Mandatory compaction tails, active-only schema budgets, checkpoint coverage, TUI metadata, per-agent MaxMode and full-context/variant Actor behavior remain.
- Scope: 36 compat-different source paths before and after integration; no DC owner or unrelated platform/private-network boundary moved to main. Shared FD/FC registries are inherited byte-for-byte.
- Validation: 21 focused matrix files pass (309 tests); complete Actor spawn/resume passes 77 tests, prompt attachments pass 62, and HTTP recovery-task/concurrent setmode pass 12. Full prompt-effect initially had 170 pass, 2 existing skips and 2 adapter-fallback assertion failures; after including the compat empty current-turn field, all 3 adapter fallback cases pass in a focused rerun. Final CI supplies the complete-file acceptance. Package typecheck and lint pass. SDK/OpenAPI regenerated with 140 operations, preserving checkpoint coverage, maxMode and Actor variant/full-context differences while removing only the upstream-retired auto-create operation.
- Publication: final-tip CI and live remote ancestry are checked after this record is committed; earlier acceptance runs remain historical.

## Previous synchronization review

The 2026-09-15 review through `26aa00fc` used starting compat `1caf307f`,
accepted main `a288fb47`, runtime `0b8c5d63` and compat integration `252f81e9`.
Its 245 passing tests and previous snapshot limits remain recorded in
[compat history](dev-compat-registry-history.md); they are not current-SHA evidence.

## Previous runtime review record

- Status: active；七项 DC 政策继续由 `dev/compat` 维护。
- Last reviewed: 2026-09-15，继承共享运行验收并补充 compat 实际调用链和 Windows 证据。
- Selected upstream: `b4cc11cd652195af9a80297ed543218f3172e6c4`；本轮不追加 upstream 同步。
- Accepted Inbox main: `d11a9652981e7b5953584205474249775ee54236`（PR #134）。
- Starting accepted compat: `78f65017acacae66dfccc1ec28338e131492a929`（PR #135），已继承 Inbox 原子 drain。
- Accepted runtime main: `2bbd3c0b20f2fb9c005c593585bd320c0e0a91d8`（PR #138），继承 PR #136 的 `c643adf9dffa57191153cc4452003ba03e3cab32`。共享 runtime/test 当前快照为 `f20e91358da8ba4feef8d669ae1b105486e2566f`，其中插件作用域夹具仍为 `15ca0f83a466f0581ce4e1add6883e0e204318ed`；共享安装设施为 `9bf2b8bcc696abf8797487b090c342a5a64f7a7c`，不将 CI 安装改动记为生产行为推进。
- Compat integration source: `302a1727fd2e3462738719656bc521641f525812`。私网及初次 Windows、插件预算、作用域夹具、后续 Windows 四组证据分别绑定 `289f6316`、`3bd11622`、`3f65c815` 和 `b7e3f850`；实验日志清理复验另绑定 `c7b2fdc5`；集成引用不改写各自执行 SHA。
- Inherited bundled guidance: `c6e30d0bd2a651ae40fbf26a1b8913a16696a13e`，本轮未修改。
- Scope and evidence: [Inbox 修正](inbox-crash-consistency-2026-09-15.md)、[共享运行验收](runtime-validation-2026-09-15.md)、[compat 运行验收](compat-runtime-validation-2026-09-15.md)。
- Publication authority: 对应 PR 另行记录 reviewed head、实际接受 tip 的 CI 与最终 ancestry；候选 Windows 成功不等同于新集成 SHA 已接受。PR #135 的 reviewed head 八项 CI 通过且已合并，但接受 tip 的 push 分片 1 在全部断言通过后超过八分钟预算，仍按 CI 失败记录；诊断见 compat 运行报告。后续 compat PR 及最终接受 SHA 的 CI 另行验收。

FC-001 的队列到完整用户消息事务保持共享。FC-006/FC-004 的插件与 MCP 协议验证入口随 main 继承，FC-008 维护共享 Windows 调度及 frozen install。FD-006 的独立实验载体继承自有日志清理修正，不改变生产 exec 权限与模型语义。DC-NET-002 保留私网准入保证，DC-PLATFORM-001 保留平台适配并拥有 compat 验收脚本。DC-CONTEXT-001/DC-ACTOR-001 的 cap、coverage、full/persistent 和 frozen context 保持原归属；其余 DC-NET-001、DC-MODEL-001、DC-TUI-001 无新增生产行为。七项全部 active，没有整体上移或政策退休。此前历史记录保留原始来源和验收范围。

## 2026-09-09 specified audio convergence

AUDIO-ALIGN-01 replaces only the audio-retention decision of the earlier full sync.
Standalone speech/transcription, static audio keys, capability selection and provider
speech factories retire through the direct main merge. Registry discovery and chat
input audio are inherited byte-for-byte; all seven DC owners retain their contracts.
DC-MODEL-001, DC-CONTEXT-001 and DC-ACTOR-001 have request-semantics adjacency, but
no audio override. TUI voice, MCP sampling, private WebFetch policy, platform fallbacks
and TUI metadata are unchanged. Historical adoption paragraphs below describe their
original snapshots. The [audio convergence record](audio-upstream-alignment-2026-09-09.md)
is historical: FD-004's 2026-09-14 capability-route retirement supersedes its
upload/auth/token details. [Current audio guidance](audio-api.md) and FD-004
are authoritative for the present audio boundary.

## 2026-09-10 title authority synchronization

All seven capabilities in the [shared inventory](upstream-sync-2026-09-10.md)
are inherited. DC-CONTEXT-001 and DC-ACTOR-001 retain atomic message/part
identity, monotonic chronology, frozen turn context, active-tool membership and
bounded request recovery. DC-MODEL-001 retains per-agent MaxMode; detached title
requests remain outside that execution path. DC-TUI-001 retains request metadata
and both titleLocale submission paths, while checkpoint coverage maps coexist
with title revision reads and deleted-session guards. DC-NET-001/002 and
DC-PLATFORM-001 have no incoming owned implementation changes. No owner retires.

Three conflicts were reconciled by capability: TUI sync keeps checkpoint/revert
pagination and clears both checkpoint and title state on deletion; session fork
accepts protected manual titles while validating chronological boundaries; prompt
tests inherit text-only title expectations alongside preflight-domain sentinels.
The new duplicate-receipt fixture uses stable part IDs and verifies unchanged
persisted count/IDs, preserving compat's stronger content identity checks.
Checkpoint coverage test sessions now supply the required title source/revision.
The shared migration CI follow-up checks the complete journal name set rather
than assuming one pending migration; historical schema/data and restart
assertions remain intact. Both related migration files pass on compat (2/2).
Generated SDK/OpenAPI preserve compat operations and include the new title API.

Source evidence and the seven final result rows are recorded in the latest
[compat history entry](dev-compat-registry-history.md). Earlier dated review
paragraphs and per-owner implementation SHAs below remain historical snapshots.

## 2026-09-10 plugin hook objects and Xiaomi chat SDK

Both capabilities in the [cb00c280 shared inventory](upstream-sync-2026-09-10-cb00c280.md)
are inherited byte-for-byte: compat carried no divergence on
`src/plugin/index.ts`, `src/provider/provider.ts` or either test file, so the
`main` merge was clean and needed no compat adaptation. No compat-only override
is added and no owner retires.

DC-MODEL-001 is the nearest owner: the Xiaomi SDK split changes which class
serves chat, not which transport is selected, so per-agent MaxMode, retry status
and the reported `xiaomi.chat` / `xiaomi.responses` provider names are unchanged.
DC-TUI-001 keeps its request provider/model/variant display truth for the same
reason. DC-CONTEXT-001 and DC-ACTOR-001 are request-semantics adjacent only; the
plugin change guards registration and dispatch without altering hook contracts,
frozen turn context or chronology. DC-NET-001/002 and DC-PLATFORM-001 have no
incoming owned implementation change.

Source evidence and the two final result rows are recorded in the latest
[compat history entry](dev-compat-registry-history.md).

## 2026-09-11 inline attachment bounds and recovery-candidate breadth

Both capabilities in the [7641dbbd shared inventory](upstream-sync-2026-09-11-7641dbbd.md)
are inherited. C01's five production files (`src/flag/flag.ts`,
`src/util/media.ts`, `src/provider/image.ts`, `src/tool/read.ts`,
`src/mcp/tool-result.ts`) and all three C01 test files are byte-identical to
accepted `main` after the merge, as is
`test/server/session-recovery.test.ts`. No compat-only override is added and no
owner retires.

Two conflicts, both in `src/session/prompt.ts` and both unions. The `./classify`
import keeps compat's `REQUEST_OVERFLOW_RECOVERY_MESSAGE` beside main's new
`@/util/media` and `@/provider/image` imports. The existing-assistant branch
keeps compat's per-iteration `agents.get(lastUser.agent)` resolution and its
`recoverOverflowPlaceholder: usageRecovered || isBoundedComputation` argument
while adopting main's `lastAssistant.id !== resumeFrom` guard; the two are
independent, since the guard decides whether the branch runs and
`recoverOverflowPlaceholder` decides how it classifies.

DC-CONTEXT-001 is the nearest owner and keeps its contract unchanged: the new
attachment gate is a production-time bound above its model-visible caps, whose
rejection notice is an ordinary synthetic text part, and the recovery change
touches candidate selection, settlement and the resume model source rather than
caps, serialization or request preflight. Its `src/server/routes/instance/session.ts`
overlay is limited to the compat-only `checkpoint-coverage` route, which the
merge left untouched; the resume route is byte-identical to main.
DC-ACTOR-001 keeps full-context actor and static-prefix overflow behavior:
`resumeFrom` is bound to the candidate the runner settled, and FD-009's frozen
identity refusal means an actor resume still cannot switch models. The inherited
predicate keeps `time.completed` as the settlement marker rather than upstream's
"any errored message is always a candidate", so a compat turn settled by
`sweepOrphanAssistants` leaves the candidate list here exactly as it does on
main.
DC-MODEL-001 keeps per-agent MaxMode; a resume model override selects the model
for the resumed turn without entering MaxMode's retry policy. DC-TUI-001's
request provider/model/variant display reports whatever model the turn actually
used, including an overridden one. DC-NET-001/002 and DC-PLATFORM-001 have no
incoming owned implementation changes.

The generated SDK and `packages/sdk/openapi.json` were regenerated from compat
sources and are byte-identical to the merge result, so compat keeps its own
operations and gains the same two resume query parameters.

Source evidence and the two final result rows are recorded in the latest
[compat history entry](dev-compat-registry-history.md).

## 2026-09-11 bounded history search and paged part details

The single capability in the [f11e35ed shared inventory](upstream-sync-2026-09-11-f11e35ed.md)
is inherited. The merge was clean on every path. Sixteen of the seventeen
incoming paths have no compat divergence at all; `src/session/checkpoint.ts`
keeps compat's own overlay and takes only the two copy lines redirecting
verbatim recall from `around` alone to `around` then `get(part_id)`, which is
factually correct here because compat inherits the same history tool. No
compat-only override is added and no owner retires.

DC-CONTEXT-001 is the nearest owner and keeps its contract: it consumes that
checkpoint text, and the marker changes length by a few characters inside an
already-bounded field, so no model-visible cap, serialization path or request
preflight moves. The bounded history work stays below those caps — SQL
projections leave unused media payloads in the database and `get` pages
`part_id` details, which reduces rather than widens what can reach a request.
DC-ACTOR-001, DC-MODEL-001, DC-TUI-001, DC-NET-001/002 and DC-PLATFORM-001 have
no incoming owned implementation change. The new
`20260908000000_history_media_rebuild` migration clears only the derived
`history_fts` index; original parts and sessions are untouched and the startup
backfill is resumable.

No SDK/OpenAPI input changed, so no regeneration was required and compat's own
operations are unaffected.

Source evidence and the final result row are recorded in the latest
[compat history entry](dev-compat-registry-history.md).

## 2026-09-12 actor execution model, models catalog, media reading

All four capabilities in the [98702641 shared inventory](upstream-sync-2026-09-12-98702641.md)
are inherited, including **FC-001's retirement of its continuation
wake-generation routing**: a woken non-main turn now runs on upstream's
`ActorExecution` claim and settles through `runTurn`, and the eight fork-owned
tests that encoded behavior the execution map does not model were removed with
it on `main`. Compat adds no override for that path and no owner retires here.

One conflict, in `src/inbox/inbox.ts`: main's cancelled-before-commit drain
guard is adopted while compat keeps its `createMessage` wording for the
non-transactional crash window that comment documents — compat seeds the
synthetic user message through `createMessage`, main through `updateMessage`.

DC-ACTOR-001 keeps its full-context actor extension: `ForkContext` still
requires compat's `turnContext`, so the upstream `keeps forkContexts isolated`
fixture ported on `main` carries that field here. DC-CONTEXT-001 is unchanged —
the media work bounds encoded size at production time above its model-visible
caps, and the actor delivery persists `actorResult` on a message the caps
already govern. DC-MODEL-001, DC-TUI-001, DC-NET-001/002 and DC-PLATFORM-001
have no incoming owned implementation change.

The generated SDK and `packages/sdk/openapi.json` were regenerated from compat
sources; compat's own operations are preserved and the new `actorResult`
projection is published.

Source evidence and the four final result rows are recorded in the latest
[compat history entry](dev-compat-registry-history.md).

## 2026-09-14 capability route adoption, MiMo transport pinning, and two capability corrections

Direct inherit, no compat override, no owner added or retired. Covers PRs #109,
#110 and #111. Both merges applied with no conflicts, and the intersection that
matters is empty: of the 41 `src` files this propagation newly inherits,
**none** is a file where `dev/compat` holds a delta of its own. Measured from the real base — `git merge-base
origin/dev/compat origin/main`, which is `72064c41`, the previous propagation —
rather than from the compat tip, which would have counted every override in
reverse and reported all 39 as overlapping.

Two things `dev/compat` was carrying resolve themselves rather than needing a
decision:

- `src/server/server.ts` had lost upstream's `/** Bind port. ... */` JSDoc on
  compat only. Main's copy was rebuilt from upstream and carries it, so the
  merge restores it.
- `test/llm-server/chat-completions.test.ts` still asserted the fork's
  `mimo-v2-flash-ptc` -> `/v1/responses` selection, which `main` retired in #109
  when it adopted upstream's pinning of every MiMo id to
  `@ai-sdk/openai-compatible`. The file is deleted by #110, so the stale
  assertion leaves with it. Verified this is not a lost override: `dev/compat`
  against `main@72064c41` shows **zero** delta on `provider/provider.ts` and
  `tool/gpt.ts`, so compat's divergence there was un-propagated main history,
  not a compat decision. `usesMimoResponsesApi`, `isMimoModel` and the `xiaomi`
  loader go with it.

All seven active DC entries were re-reviewed against the incoming behavior.
DC-ACTOR-001, DC-CONTEXT-001, DC-MODEL-001, DC-TUI-001, DC-NET-001/002 and
DC-PLATFORM-001 have no incoming owned implementation change: the capability
route lives at `routes/instance/capability.ts` and `src/llm-server/`, and
`routes/instance/session.ts` — the one `server/` file compat does own — is not
on that path. DC-NET-001's seam is unmoved; `util/ssrf.ts` is touched by neither
inherited PR.

`mimo serve --llm-server` is gone on compat too, as a consequence of inheriting
it: the flag gated only the address advertisement of a route that is always
mounted and always demands a minted token. `mimo serve` now advertises like
upstream, while `mimo acp` and `mimo web` pass `advertise: false` like upstream.

Previously issued capability tokens stop working here as on `main` — the fork
wrote `version: 2` records where upstream reads `version: 1`, and upstream's
reader treats an unknown version as an empty store. `mimo llm-server issue` is
the remedy.

#111 rides along with two one-line corrections to the surface #110 adopted, so
compat inherits them at the same time rather than a round later: `model.options`
is merged at upstream's own precedence point, so a model configured in
`mimocode.json` no longer behaves differently over `/v1` than in a session; and
`Server.listen` brackets an IPv6 literal before assigning it to `URL.hostname`,
which the WHATWG parser otherwise discards. Both carry a mutation-checked test.
Neither touches a compat-owned surface.

Source evidence and the final result row are recorded in the latest
[compat history entry](dev-compat-registry-history.md).

## 2026-09-14 revoke guard (second propagation, same day)

Direct inherit, no compat override, no owner added or retired. Covers PRs #114
and #116, the second folded in before this merged so compat never carries the
incomplete guard: `llm-server revoke <id> --all` deleted every token for the
directory instead of the one named, and now refuses the ambiguous form.

The guard took three rounds to close, which is worth recording because each
round was a different way of naming a token that it did not see. It was missing
entirely; then it tested truthiness, so an empty positional from an unset shell
variable walked past; then it read only the positional, while
`parserConfiguration({ "populate--": true })` in `src/index.ts` puts an id after
`--` in `args["--"]` instead. The test harness had the same blind spot — it
built its own yargs without that configuration, so it was measuring a parse
shape the real CLI never produces. Every argument shape is now enumerated
against the production parser, and the four that still pass through were each
checked to be non-destructive.

The overlap check flagged `cli/cmd/llm-server.ts` on a first pass, and that false
positive is worth recording because it is the same trap as the previous
propagation wearing a different face. The compat-owned set was computed as
`main..dev/compat` while `main` already carried the incoming fix, so the change
being propagated showed up as a compat delta in reverse.

Both sides have to be measured against the same merge-base. Against `5979dfa3`,
`main` changed `src/cli/cmd/llm-server.ts` and
`test/cli/llm-server-revoke.test.ts`, and neither appears among compat's own
changes. The merge applied with no conflicts, and `cli/cmd/llm-server.ts` is now
byte-identical to `main`.

## 2026-09-14 registry reconciliation (third propagation, same day)

Registry-only inherit, no compat override, no owner added or retired, and no
runtime or test change. #117 touches `docs/upstream-deviations.md`,
`docs/fork-capabilities.md` and `docs/fork-registry-history.md` and nothing
else, so the inherited source/test behavior reference stays at `bbac42b7`.
Measured from the shared merge-base `8f94a80c`, none of the three is among
compat's own changes, and all three are byte-identical to `main` after the
merge.

What compat inherits is a correction to its instructions. FD-004's sync index
row still required authentication-before-bootstrap and the TUI-owned listener,
FC-008's 2026-09-07 model API lifecycle review still read as a live contract,
and the FD/FC review-record headers still named upstream `98702641`. A sync on
either branch would have started from the wrong baseline and could have
restored hardening that FD-004 records as retired. The four review findings the
#110 scope reset left unwritten are recorded as well.

## 2026-09-14 TP-R14-12 unquarantine (fourth propagation, same day)

Direct inherit, no compat override, no owner added or retired. #119 changes one
log message in `src/actor/spawn.ts`, unskips `[TP-R14-12] undeliverable terminal
notification is logged` in `test/actor/cancel-notification.test.ts`, and adds an
FC-008 row. The case was quarantined as a pipeline gap; it was the fork's
`actor inbox notification failed` wording on its inbox send, where upstream's
case asserts `actor terminal notification failed`.

Unlike the previous three propagations today, the overlap is not empty: both
source files are DC-ACTOR-001 surfaces and compat carries its own delta on each
— `turnContext` on `ForkContext` in `spawn.ts`, and `turnContext: undefined` in
two fixtures in the test file. Neither hunk touches the log line or the
TP-R14-12 case, the merge applied without conflicts, and DC-ACTOR-001 keeps its
override unedited. Verified on the merged tree rather than inferred from the
clean merge: after a known-good neighbour passed there, TP-R14-12 passed with no
timeout, the whole `cancel-notification.test.ts` is 28 pass / 0 fail, and
`test/actor` + `test/inbox` + `actor-hooks` + `actor-owned-lifecycle` are 347
pass / 2 skip / 0 fail. The two skips are the cases that stay quarantined.

## 2026-09-15 selected upstream 5198ff54

This specified propagation inherits the six incoming capabilities through fork
main. It excludes upstream commits after `5198ff54`. No DC owner retires; the
complete model-facing actor context interface is now explicitly compat-owned.
Shared FD/FC records are inherited byte-for-byte.

| Owner           | Disposition                                                  | Evidence and boundary                                                                                                                                                             |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DC-NET-001      | Retain private-network WebFetch                              | No owned implementation change; finite Read media MIME changes do not replace per-request private WebFetch approval                                                               |
| DC-NET-002      | Retain RFC1918 HTTP(S) MCP guarantee                         | Production remains inherited from main; existing mocked lifecycle evidence is not a new real-private-network or OAuth validation                                                  |
| DC-PLATFORM-001 | Retain restricted-network and Windows fallbacks              | Ripgrep/archive production overlay unchanged; no upstream equivalent in this range                                                                                                |
| DC-MODEL-001    | Retain per-agent MaxMode                                     | Agent selector tests pass; regenerated SDK/OpenAPI preserve maxMode                                                                                                               |
| DC-CONTEXT-001  | Retain UTF-8 content caps, preflight and checkpoint coverage | History's local result budget does not replace these capabilities; bounds, frozen catalog, server coverage and TUI synchronization tests pass                                     |
| DC-ACTOR-001    | Retain and adapt none/state/full and persistent creation     | Preserve complete capture/execute chain and bounded state; repair input recovery without dropping explicit values; validate runtime-created and model-created persistent recovery |
| DC-TUI-001      | Retain provider/model/variant display                        | Metadata and coverage synchronization tests pass; no equivalent upstream UI replaces this overlay                                                                                 |

The actor overlay includes JSON schema, shell parser, no-script argument
recovery, execution, tool descriptions and public creation tests. Missing
captured history or a prefix captor still fails before admission. Captured
system, tool schemas, active/loaded MCP membership, permissions, model identity,
turnContext, watermark and cwd remain tied to the same frozen request. State
uses the existing UTF-8 cap; persistent creation requires full context.

Recovery preserves valid context/lifecycle fields in all supported envelope
forms. Malformed values are rejected; conflicting inner/outer copies are
rejected instead of choosing an actor lifetime silently. The shared generic
shell wrapper's mixed script/outer-field policy is unchanged.

The shared history preview follow-up is inherited from accepted main PR #123.
Its SQL byte budgets and structural omission formatting preserve raw parts and
original attachment locators, including arbitrary stored MIME text. It does not
replace compat context caps or frozen-prefix behavior; all seven owners above
retain their dispositions.

The initial propagation retained the actor lifecycle quarantine. The final C07
inheritance below supersedes that initial-stage status.

## 2026-09-15 final lifecycle inheritance

Accepted main `648f7cdf100b30ff046db7518d8f832473b61481` (PR #124) is inherited
at `3cf81dabd6efc66d7cbd037292eee742a2a33728`. Runtime/test behavior remains
`1a072e7aa3b142fc9804974bd8142729817c92db`; later documentation and empty-tree
ancestry merges do not change that behavior. Both registered actor quarantine
cases now run, and the shared execution claim extends through postStop,
terminal publication and cancellation cleanup. Admission, reserved-worker and
receipt fixes prevent cancelled work from starting or being hidden by old
notifications. Direct Effect execution-hook self/ancestor cancellation uses
the existing service scope; external callers still join full cleanup.

All seven DC dispositions in the table above remain. DC-ACTOR-001 retains its
complete model context/lifecycle interface, captured tools and frozen
turnContext through execution and recovery. Shared execution, Runner and
workflow files match main; actor spawn retains only its existing turnContext
and watermark explanation. The other six owners have no additional owned
production change from this lifecycle inheritance. SDK/OpenAPI and bun.lock
remain unchanged from the accepted first-stage compat branch.

Final default-path validation passes 372 actor/inbox/hook/lifecycle tests,
14 real HTTP recovery tests and 4 frozen native Actor cases: 390 passes,
1,849 assertions, no failures or skips. Package typecheck passes. Seven ambient
selectors are removed and the package ORCHESTRATOR preload is retained. The
source/test/harness manifest and entire packages tree remain unchanged during
validation. Final seven capability results and source boundaries are in
[the history](dev-compat-registry-history.md#2026-09-15-final-lifecycle-inheritance-and-capability-results).

The selected propagation is accepted at `90abf6e447d7a5e5b405aba301bf1a951f469bf6`
(PR #125), with exact-SHA test/typecheck/lint and main ancestry verified.
The [shared accepted result](upstream-sync-2026-09-15-5198ff54.md#accepted-result-and-publication-evidence)
is the publication summary; dated staging gates below remain historical.
At that historical runtime snapshot the workflow deadline/disposer case was
still skipped. The first audit batch below restored execution; PR #129 later
reproduced the Linux timeout. The shared implementation report records that
failure and the subsequent cleanup fix; local first-batch passes did not close
the remaining FC-008 validation debt.

## 2026-09-15 audit implementation, first batch

Accepted main `f10fddb67d830b82890206759c53cef4d8710460` (PR #128)
is inherited at `f48b6e918d683688348d0c8bfc59cd0199fc7fc8`. Gateway alias
errors and debug trusted harness identity are shared; workflow deadline coverage
is restored with a real-startup gate, and the Runner reentry test uses explicit
synchronization. No production cleanup/lifecycle policy changed in this batch.
Compat adds complete schema estimation, terminal serialization failure handling,
tiny content budgets and single-format snapshot writes with legacy reads.
The seven owner dispositions and evidence are recorded in
[the compat implementation report](compat-audit-followups-2026-09-15.md).

## First-batch review record

- Status: historical first-batch snapshot
- Canonical owner: fork `dev/compat`
- Last reviewed: 2026-09-15
- Reviewed upstream: `b4cc11cd652195af9a80297ed543218f3172e6c4`
- Accepted `main` tip: `f10fddb67d830b82890206759c53cef4d8710460`
- Inherited main behavior: `0b12e39ebfae5e0a01e623de1b4f58e96c86cb09`
- Compat behavior: `f48b6e918d683688348d0c8bfc59cd0199fc7fc8`
- Prior compat tip: `b3b32061cfcf997d3fb1cac0a73302e551678a96`
- Main source inheritance merge: `f48b6e918d683688348d0c8bfc59cd0199fc7fc8`
- Prior shared audit commit: `5f06049e568276cd1cea9012f6b114e6ddb2fac2`
- Inherited bundled guidance content: `3fa41ad98ac15668b2b3be899767c6498772ad4b`
- Historical publication state: this first batch was recorded before PR #129 acceptance. The preceding documentation tip `b3b32061cfcf997d3fb1cac0a73302e551678a96` (PR #127) had successful exact-SHA test, typecheck and lint; later PR state is recorded below.
- Original audit baseline: [2026-09-15 report](fork-difference-audit-2026-09-15.md), with the original fixed Git trees, 529 file pairs and pre-implementation findings.
- First-batch shared documentation inheritance: accepted main `f10fddb67d830b82890206759c53cef4d8710460`; these first-batch fields do not describe the later reviewed source or PR head.
- History: [dev-compat-registry-history.md](dev-compat-registry-history.md)

## F01–F11 accepted review record (historical)

- Status: active
- Canonical owner: fork `dev/compat`; seven DC policies remain active.
- Last reviewed: 2026-09-15
- Reviewed upstream: `b4cc11cd652195af9a80297ed543218f3172e6c4`
- Accepted `main` tip: `89866569ee21e106f3c31c39072d8ec3e976d20a` (PR #131)
- Inherited main behavior (runtime/tests): `3a12d1800d9bfd002f543764e4ec72047e6e6bb3`.
- Compat behavior (runtime/tests): `02cd25b5385dbaffcc629693ca1df2da15af68f2`.
- Prior validated behavior: main `cdfd1a804599eda21fdc5bced9c0d1de025d07da`, inherited by compat source merge `05724a5c433a547d9177ebd8bc8e9184962f128e`; these remain historical validation baselines.
- Accepted-main ancestry merge: `c407439ff4d213977acf3986d79a4e31627cf9db`; its complete tree equals `02cd25b5`.
- Inherited bundled guidance content: `c6e30d0bd2a651ae40fbf26a1b8913a16696a13e`
- Accepted PR #129 head: `c407439ff4d213977acf3986d79a4e31627cf9db`.
- Accepted compat tip: `ab81af7293ac5ea1ee219bb6aab491d4fd665307`; its complete tree equals `c407439f` and behavior snapshot `02cd25b5`.
- Historical gate: all eight checks passed at `bb6d4049`, but Codex reported the P2 cache bound after revert clears, so acceptance was paused. Main PR #131 accepted the correction, followed by the compat candidate-cache adaptation.
- Accepted-head CI: all eight checks succeeded at `c407439f`: [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940004167), [typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940004188), [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940004185).
- Codex review: the [summary](https://github.com/onlyfeng/MiMo-Code/pull/129#issuecomment-5674809678) completed at 2026-09-15 07:15:08Z, with no new reviews or threads. The technically disproved P1 thread remains unresolved and non-outdated in the UI; the corrected P2 thread is outdated. These UI states are not described as resolved.
- Accepted-SHA CI: [test 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948422), [typecheck 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948433) and [lint 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948413) all succeeded at `ab81af72`; PR-head success does not substitute for these runs.
- Complete code-difference audit: [2026-09-15 implementation closure](fork-difference-closure-2026-09-15.md), with fixed current trees, per-file ownership and retained boundaries.
- Original audit baseline: [2026-09-15 findings](fork-difference-audit-2026-09-15.md); original coverage and earlier findings remain historical.
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
POLICY-04 publication is complete: main `fb16a8fd5a7b916421e7a04ca31f06559e086298` and compat `823e21d2fd7c3a2603d14bf15289351a6c555f81` passed exact-tip push CI and ancestry verification. See [the POLICY-04 history](dev-compat-registry-history.md#2026-09-08-policy-04-system-tail-catalog-local-integration).
These current review references do not re-date or claim to rerun older evidence.

The POLICY-03 review inherits default TUI model API startup and origin-scoped
Basic authentication across SDK clients and raw fetch, including interactive
Bash replies. All incoming files match accepted main. The seven active DC
owners retain all 97 non-registry overlay paths and normalized source deltas;
there is no new compat production difference. Model directory, token, media,
MaxMode, frozen context and request metadata contracts remain unchanged.

Local validation groups: worker/listener/thread/scoped SDK 23 tests / 127
assertions; HTTP/bootstrap/TUI events 24 / 131; the raw-fetch correction matrix
8 / 46 overlaps six earlier cases and is not added wholesale. Package typecheck
passed. POLICY-03 publication is complete: main `6e4ed8d3f859bd1355789748ae7a5f385cf0fbb1` and compat `f38eecbf31fad26a8ff03dd2a90970be52fa71e5` passed exact-tip push CI and ancestry verification. Shared registries and the layout guide matched that accepted main.

The POLICY-02 review inherits registered/live-context recovery and validated
optional task binding. The task namespace comes from the original spawn;
claim, original-user binding and interrupted-assistant settlement commit
atomically. Main HTTP cancellation is checked before commit; after commit the
runner retains ownership. Every recovered loop pins the committed original user
and defers queued inbox until a later ordinary run. Metadata-only summary/setmode updates preserve
concurrent recovery state and cannot resurrect deleted messages.

Compat retains createMessage/commitUserMessage/commitUserMessageIfLatest,
monotonic chronology and completed >= created during recovery settlement.
Frozen turnContext, active/native tools, three-dimensional tool hashes, content
caps, current-turn preflight and MaxMode remain intact. The same registry
exclusions give 97 -> 98 overlay paths, retaining all prior paths and 42 package
src paths. Only the recovery-commit test is new; 94 prior normalized deltas are
unchanged. Session chronology and two Actor fixtures are the three adapted
existing deltas. Shared FD/FC/history are byte-identical to accepted main.

Local evidence: core/entry/stale writers 26 tests / 131 assertions; real
HTTP/SDK/OpenAPI 28 / 339; Actor lifecycle 71 / 362. The cancellation follow-up
runs main HTTP, existing recovery and commit tests: 30 / 156, overlapping prior
evidence and not added wholesale. The shared Actor resume follow-up also passes
31 cases / 226 assertions. Package typecheck and repository lint pass;
standard SDK/OpenAPI regeneration from resolved sources adds no difference.
Six ambient selectors are cleared; package preload remains the harness baseline.
Cross-restart recovery is outside this change.

The POLICY-02 durable-inbox follow-up rearms pending rows after successful or
failed recovery through the existing Inbox/Runner/Actor lifecycle. It preserves
the recovered user during execution and does not depend on a live sender wake
or a manual later prompt. Plugin cancellation (including a subsequent post-hook failure), interruption, disposal and retired receivers do not
restart execution. Both live and durable wake variants consume each row once. The wake tracks the
queue tail, and persistent owners recheck it after settling each turn, so a
provider or runtime failure in the first 100-row batch does not strand later rows.
Both owners and concurrent followers require observed queue consumption before
retrying after failure; a failure before consumption does not trigger extra work.
Compat keeps its inherited Inbox content cap and all existing instance/context
boundaries. No additional compat delta is introduced by this shared correction.

The preceding compat main HTTP/Actor matrix passes 91 tests / 605 assertions;
Inbox tests pass 54 / 133 across eleven files, and inbox/handoff tests pass
8 / 30. The final joined-failure correction passes 35 tests / 319 assertions across
main HTTP, Actor inbox and prompt handoff; the above earlier groups overlap. The preceding five-second retirement-fixture timeout is recorded in
shared history; this complete run passes with explicit fixture budgets. Earlier matrices are
historical, overlapping evidence. Package typecheck and repository lint pass;
this internal helper changes no public schema or generated SDK. Shared registry
files remain byte-identical to the accepted main correction.

## Sync index

| ID              | Watch surfaces                                                                                                                             | Relationship to inherited `main`                                             | Required decision                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| DC-NET-001      | WebFetch and SSRF call seam                                                                                                                | Private-destination policy override                                          | Preserve explicit intranet access or adopt a reviewed replacement                                                         |
| DC-NET-002      | Remote MCP URL and lifecycle tests                                                                                                         | Compat guarantee; no production fork                                         | Keep RFC1918 client creation unless policy changes explicitly                                                             |
| DC-PLATFORM-001 | `ripgrep` and `archive` fallbacks                                                                                                          | Restricted-network/Windows adaptation under fixed-cwd path semantics         | Keep compat-only; preserve inherited relative-path resolution                                                             |
| DC-MODEL-001    | Agent config, MaxMode, retry status, title path, SDK/OpenAPI                                                                               | Per-agent extension over shared bounded retry; title generation stays shared | Preserve opt-in, final-step bound, title isolation, and subagent status isolation                                         |
| DC-CONTEXT-001  | Model-visible text, request preflight, title/skills/memory, compaction, checkpoint coverage, chronology, and TUI context/revert projection | Bounded-content hardening around shared request construction                 | Preserve caps, snapshots, stable paths, effective-window preflight, positional coverage, chronology, and recovery routing |
| DC-ACTOR-001    | Actor context, default-fork checkpoint, replace-agent, static-prefix overflow                                                              | Full-context extension beyond shared capture and actor identity scope        | Preserve frozen membership/system/cwd and fail unrecoverable prefixes                                                     |
| DC-ACTOR-002    | Actor run/spawn `variant`, shell `--variant`, argument recovery, `actor models` listing, spawn-to-prompt propagation                       | Model-facing extension over inherited actor model selection                  | Preserve pre-admission validation, explicit precedence, non-inheritance, and actor-lifetime persistence                   |
| DC-TUI-001      | Prompt/footer model metadata and title locale                                                                                              | Request-metadata display override alongside shared locale propagation        | Preserve provider/model/variant truth, locale submission, and known-limit disclosure                                      |

## DC-NET-001 — approved private-network WebFetch

- 2026-09-09 full sync: no incoming owned production-path change; retain the existing override and shared invariants.

- POLICY-02 review: No incoming compat-owned production overlap; the existing overlay is retained. This review does not claim new runtime coverage of this owner.

- POLICY-03 review: No changed compat-owned production surface; all incoming TUI/auth files match main, and the existing overlay remains intact.
- Status: active
- Canonical owner: `dev/compat` WebFetch destination policy
- Base: inherited main behavior
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271` implements FC-010's inherited
  destination-classification, per-hop authorization, and resource-bound
  contract by applying `assertSafeUrl()` before the initial and redirected
  target's permission decision and request. DC-NET-001 overrides only whether
  compat WebFetch invokes that inherited classifier at its call seam.
- Overrides: compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef` removes only the
  `assertSafeUrl` import and its two call sites from WebFetch. The inherited
  classifier implementation and tests, including full IPv6 link-local
  `fe80::/10` coverage, remain byte-identical to `main`; compat WebFetch does
  not call that classifier. The former separate model API image downloader and
  its MEDIA-DNS-01 policy were retired by FD-004 on 2026-09-14; the old
  `src/llm-server/images.ts` no longer exists. Current `/v1` remote image URLs
  follow upstream's SDK path without that downloader's per-hop checks. This
  shared capability API behavior is independent of compat's WebFetch policy.
- Delta: after the effective `webfetch` permission approves a target,
  operator-configured private HTTP(S) destinations such as
  `http://192.168.1.1/wiki` may be requested. HTTP(S)-only validation,
  per-target permission asks, manual redirects with the 10-hop limit and the
  injected HTTP client remain in force. As in main, the timeout covers response
  acquisition/redirects; the 5 MiB check rejects a declared oversized body or a
  fully buffered oversized response. It is not a streaming memory or complete
  body-read deadline guarantee.
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
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
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

- 2026-09-09 full sync: no incoming owned production-path change; retain the existing override and shared invariants.

- POLICY-02 review: No incoming compat-owned production overlap; the existing overlay is retained. This review does not claim new runtime coverage of this owner.

- POLICY-03 review: No changed compat-owned production surface; all incoming TUI/auth files match main, and the existing overlay remains intact.
- Status: active
- Canonical owner: `dev/compat` remote-MCP compatibility guarantee
- Base: inherited main behavior
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271` and FC-004 validate that remote
  MCP URLs parse as HTTP(S), but deliberately make no fork-wide private-network
  promise.
- Overrides: compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef` adds a compat-owned guarantee and
  characterization test. There is no MCP production-source fork.
- Delta: RFC1918 HTTP(S) MCP 地址不会仅因私网属性被拒绝，保留 compat 的客户端准入保证。现有 lifecycle sentinel 使用 mock client 且 `oauth: false`，其证明仍限定为准入政策；本轮新增真实协议和本机接口证据来自继承的隔离 MCP/OAuth 夹具。该实验不将 compat 产品保证扩展为 main 的契约，也不构成企业服务器互操作保证。
- Source surfaces: inherited
  `packages/opencode/src/mcp/index.ts`, which must remain byte-identical to
  `main` until a real compat override is required.
- Test surfaces: `packages/opencode/test/mcp/lifecycle.test.ts` 中的 `compat permits an RFC1918 remote MCP endpoint` 是 compat 准入 sentinel；共享实际协议入口为 `packages/opencode/test/mcp/real-transport-oauth.test.ts` 和 `packages/opencode/test/fixture/mcp-real-transport-child.ts`。后者由实际 MCP.Service/SDK、隔离 issuer 与生产 callback 完成验证，默认 loopback，私网模式要求 bind 地址属于本机。
- 2026-09-05 synchronization: No remote MCP URL or connection path changed;
  RFC1918 client behavior remains intact.
- 2026-09-07 synchronization: No MCP path or symbol overlap. Production MCP
  remains byte-identical to accepted main; the existing RFC1918 test keeps its
  mocked client-creation scope and does not establish OAuth interoperability.
- 2026-09-07 explicit model API propagation: No MCP client or lifecycle overlap; temporary model credentials do not change MCP authentication.
- POLICY-04 review: No incoming production-path overlap; the existing source overlay is retained. This review does not claim new runtime coverage of this owner.
- Review basis: inherited main
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
- Evidence: MCP 生产源码沿用已接受 main，compat 自有准入 sentinel 不改变该生产路径。`289f6316` 的独立 sentinel 为 1 pass / 2 assertions；同源码 loopback MCP 通过，自有 RFC1918 接口实际 OAuth/MCP 为 1 pass / 2 wrapper assertions。用户选定本机隔离服务，不接企业环境；企业 IdP、代理、DNS/TLS 和企业 MCP 不在本轮范围。协议步骤、取消边界和固定执行来源见 [RV02](compat-runtime-validation-2026-09-15.md#rv02本机隔离-mcpoauth-与私网接口)。历史条目中的 mock-only 说明保留其原日期范围。Status 与既有 exit condition 均不变。
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

- 2026-09-09 full sync: no incoming owned production-path change; retain the existing override and shared invariants.

- POLICY-02 review: No incoming compat-owned production overlap; the existing overlay is retained. This review does not claim new runtime coverage of this owner.

- POLICY-03 review: No changed compat-owned production surface; all incoming TUI/auth files match main, and the existing overlay remains intact.
- Status: active
- Canonical owner: `dev/compat` platform and restricted-network adaptation
- Base: inherited main behavior
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271` retains the shared
  `ripgrep`/archive behavior without this environment-specific fallback set and
  resolves relative file-tool paths against immutable `Instance.directory`.
- Overrides: compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef` carries the established no-rg
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
- Test surfaces: `packages/opencode/test/file/ripgrep.test.ts` 与 `packages/opencode/test/util/archive.test.ts` 保留；新增实际 Windows 入口 `packages/opencode/script/verify-windows-runtime.ts` 和 `packages/opencode/test/fixture/windows-archive-runtime.ts`。`.github/workflows/test.yml` 的调度和安装设施由共享 FC-008 维护；平台入口与 compat fallback 归本项。
- 2026-09-05 synchronization: No archive/ripgrep fallback path changed;
  restricted-network and Windows behavior remains intact.
- 2026-09-07 synchronization: No ripgrep/archive path or symbol overlap.
  Restricted-network and Windows fallbacks, their failure boundaries, and the
  inherited fixed-instance-cwd contract remain unchanged.
- 2026-09-07 explicit model API propagation: No ripgrep/archive path overlap; all platform fallback blobs remain unchanged.
- POLICY-04 review: No incoming production-path overlap; the existing source overlay is retained. This review does not claim new runtime coverage of this owner.
- Review basis: inherited main
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
- Evidence: `289f63163e71a0c058ece11ff16755efeb1c6879` 的 [Windows run 34958196675](https://github.com/onlyfeng/MiMo-Code/actions/runs/34958196675/job/104345235279) 在 Windows Server 2025/Bun 1.3.14 上执行实际生产 `powershell`/`.NET ZipFile`：11 个解压场景全部通过，8 个选定 no-rg 用例通过且共有 15 次断言、0 选中项 skip；JUnit 另有 15 个筛选排除项，不计为通过。工件的 Windows CRLF 源文件 hash 与该提交 Git blob 的 CRLF 转换逐一对应。三个平台生产源在后续插件测试修正 `3bd11622` 上不变，此后 PR 候选 `b7e3f850` 的实际 Windows run `34965350598` 也通过同一 11/8 矩阵；其 PR merge checkout 与 head 树、源码 hash 已单独核对，不能把该 Windows 成功当作 scoped-fixture 修正后的验收。完整环境、事件/checkout 身份及覆盖边界见 [RV03](compat-runtime-validation-2026-09-15.md#rv03真实-windows-解压与-no-rg)。POSIX symlink/权限项、移除 Archive 模块的环境与企业限制镜像均未被计入；不声称整个 ZIP 解压具备事务回滚。Status 与 keep-compat-only exit condition 均不变。
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

- 2026-09-18 retry defaults: inherit persistent server/rate-limit live-step
  recovery. Per-agent MaxMode candidate/judge budgets, final-step enforcement
  and subagent retry-status isolation remain unchanged.

- 2026-09-09 full sync: no incoming owned production-path change; retain the existing override and shared invariants.

- POLICY-02 review: Inherited recovery query/schema and Session changes preserve MaxMode, retry/status isolation and generated compat APIs. Fresh standard SDK/OpenAPI generation matches the resolved artifacts.

- POLICY-03 review: No changed compat-owned production surface; all incoming TUI/auth files match main, and the existing overlay remains intact.
- Status: active
- Canonical owner: `dev/compat` agent configuration and MaxMode routing
- Base: inherited main behavior
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271` provides shared MaxMode
  orchestration, bounded candidate/judge retry, main-only session-global retry
  status/event publication, and FC-013's tool-free final-step boundary without
  a compat-style per-agent opt-in contract. It also owns reliable multimodal
  title generation through the hidden `title` agent's `modelRef: "lite"`,
  structured output, and ephemeral retry path.
- Overrides: compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef` adds `agent.maxMode` and generated
  SDK/OpenAPI exposure, then routes eligible non-final, non-`json_schema` steps
  through MaxMode when the experimental configuration exists.
- Delta: any configured agent may opt in with `maxMode: true`; the dedicated
  Max agent continues to work, absent experimental MaxMode configuration stays
  disabled, structured-output requests skip the mode, and the final step
  preserves FC-013's `toolChoice: "none"` termination boundary. Eligible
  subagents' MaxMode candidate/judge calls inherit bounded retry. Subagents
  cannot write session-global retry status or publish `RetryAttempt` events.
  The source-generated title API and
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
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
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

- 2026-09-15 prior validated implementation snapshot: compat
  `05724a5c433a547d9177ebd8bc8e9184962f128e` inherits main
  `cdfd1a804599eda21fdc5bced9c0d1de025d07da`. F06 chronology, transactional
  user admission, checkpoint/loop-streak/TUI position handling, F07 compaction
  admission guards, and callable SDK examples are now shared contracts, not
  exclusive compat policies. F04 request preflight and F10 legacy snapshot
  reads remain compat-owned. Local affected regressions and the two measured
  integration-test budgets are recorded in [the compat implementation report](compat-audit-followups-2026-09-15.md).
  This historical snapshot preceded the Codex P2 concerning cache bounds after
  revert clears. Main PR #131 accepted `89866569ee21e106f3c31c39072d8ec3e976d20a`
  with behavior `3a12d1800d9bfd002f543764e4ec72047e6e6bb3`; compat behavior is
  `02cd25b5385dbaffcc629693ca1df2da15af68f2`, and pushed PR head
  `c407439ff4d213977acf3986d79a4e31627cf9db` inherits accepted main without
  changing that tree. Session updates and refreshes now release undo history
  immediately; compat records no-parts marker candidates before deleting evicted
  parts, keeps the existing 100-candidate cap and retains known coverage for PartRemoved.
  The layered red/green evidence is recorded in the implementation report.
  PR #129 is accepted at `ab81af7293ac5ea1ee219bb6aab491d4fd665307` with the same
  complete tree; its post-merge test/typecheck/lint runs all succeeded, as
  recorded in the current review record above.

- 2026-09-09 full sync: image normalization is inherited through the existing model transform. Keep bounded replay/error media, active-tool preflight, frozen context and chronology; adapt image fixtures to actual containers. Provider/API/schema inputs and compat SDK operations remain unchanged.

- POLICY-02 wake follow-up: Inherit durable-row rearming through the existing receiver lifecycle; keep content caps, frozen context, cancellation and disposal boundaries.

- POLICY-02 review: Preserve monotonic message producers and completed >= created in atomic recovery settlement, alongside metadata-only stale-writer fixes. Frozen catalog, current-turn preflight, checkpoint coverage and continuation provenance remain unchanged.

- POLICY-03 review: No changed compat-owned production surface; all incoming TUI/auth files match main, and the existing overlay remains intact.

- 2026-09-10 FD-010/FD-011/FD-012 propagation review: no compat-side change is
  needed and none is made. The inherited summary fallback promotes reasoning to
  a synthetic text part, which reaches the projection through the same summary
  path as a model-authored one and is therefore already bounded by this entry's
  caps. Its content-filter and error rejections publish `ContentFilterError` and
  `ModelError` on the session error surface exactly as the conversation path
  does, and compat adds no listener of its own. FD-012's bounded retry re-enters
  the same processor rather than building a second request path, so current-turn
  preflight, active-tool scope and frozen context apply to the retry
  identically; its completion-marker invariant is orthogonal to this entry.
  FD-012 also pins compaction `tokens` to the LATEST attempt rather than the sum
  — compat's own context readout reads that field as the current footprint, so
  aggregating would inflate it here exactly as it would on main. FD-011's
  `toolChoice: "none"` matches what compat already sent; the merge conflict
  there was resolved by keeping compat's `frozenActiveTools` (this entry's
  active-only membership) and adopting main's `as const`, a type narrowing only.
  The inherited fixture's compaction budget was raised on main first (90_000,
  trigger 81_000) because compat preflights every request against the usable
  window: the earlier 36_000 trigger cleared the seeded usage but not the fixed
  request prefix, so the turn AFTER a successful compaction failed here while
  passing on main.
- Status: active
- Canonical owner: `dev/compat` model-request safety boundary
- 2026-09-15 code-inventory subcontracts (existing behavior, no new owner):
  content caps/serialization; request estimation and current-turn recovery floor;
  inherited message chronology/idempotent admission; compat checkpoint coverage
  over a shared logical tail; legacy active-tool snapshot reads; structured-output
  replay; and inherited generated client examples. These have different retirement
  conditions and must not be treated as one indivisible product policy.
  Shared `createMessage` allocates monotonic actor commit timestamps;
  user and derived-user messages submitted through `commitUserMessage*`
  admit their message and parts in one transaction,
  with ownership and current-content equivalence checks. The prompt
  producer can reuse generated anonymous part IDs in relative order, while
  explicit identities remain strict; runtime additions can make old input
  non-equivalent. Debug, inbox, prompt and compaction producers,
  fork/revert/checkpoint and TUI consumers use chronological position with UTF-8
  BINARY ID tie-breaking, not caller-ID magnitude. Inbox now joins the shared
  synchronous admission primitive: its complete synthetic user/parts and live
  selected queue deletion share one immediate transaction, after cancellation,
  retirement and receiver-row rechecks. Compat rendering/caps still run before
  that admission; frozen context and mandatory spawn projection are retained.
  `shellImpl` writes its message and parts separately; streaming assistant output
  is not one atomic message/parts transaction. Those two paths remain outside
  the `commitUserMessage*` transaction. The Inbox guarantee does not extend to
  exactly-once model execution or crash-durable event publication.
  `currentUserID` feeds the current-turn projection through `llm-request-prefix`.
  JSON-schema requests suppress the active recall reminder and can recover the
  structured result from a completed StructuredOutput part. These local prompt
  corrections were previously under-specified; they are candidates for shared
  correctness review rather than a new compat product feature.
  Request preflight is heuristic and applies only when its runtime gates allow
  it: `compaction.auto=false`, unknown context capacity and hidden native bounded
  agents can bypass it. Provider conversion or later `_noop` insertion can change
  the wire shape. No exact provider-token or universal request-fit guarantee is
  claimed.
  UTF-8 truncation now includes its omission marker and separator within a
  positive requested byte budget, falling back to a bounded prefix when the
  marker itself cannot fit. Actor state also respects tiny positive token
  budgets. Wrappers remain additional bytes; content caps are not a strict
  total wire bound.

- Base: inherited main behavior
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271` retains FD-002 instruction
  delivery, shared retry/title construction, frozen system-tail skill catalogs, stable
  per-session memory-path templates, FC-007's fixed `Instance.directory`, and
  FC-015's effective compaction window without this complete compat cap,
  serialization, and preflight set.
- Overrides: compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef` bounds model-visible content and
  estimates the effective request before dispatch. DC-ACTOR-001 separately owns
  the full-context/static-prefix actor extension.
- Delta: instruction, inbox, replayed tool input/output, synthetic error media,
  judge fields, and actor state use explicit UTF-8/character caps and
  serialization helpers. This is not a universal non-throwing guarantee:
  `safeStringifySimple` can throw on BigInt; `safeStringify` can throw from
  getters or `toJSON` even with BigInt conversion. The judge uses
  `safeStringifyNoThrow`. Request preflight separately catches descriptor or
  request-estimate serialization failure and terminates that request before
  dispatch/recovery; earlier replay helpers are not globally made non-throwing. HTTP title text, image, and part validation
  retains its existing limits; system-tail catalogs remain bounded at 50 KiB.
  Historical capped v2 directories migrate only after strict generated-part
  recognition, preserving loaded skill bodies and ordinary text. Stable `{current_session_id}` memory instructions
  are counted without being rewritten before filesystem-tool execution.
  Request preflight accounts for system/messages, treats current-turn context
  as unshrinkable, includes only active tool schemas, and uses the inherited
  effective window, including `MIMOCODE_COMPACTION_MAX_CONTEXT` and the
  upstream ratio trigger. The estimator serializes complete active tool
  schemas with JSON.stringify; the former 80 KiB estimation-only cutoff is
  removed. Repeated object references are counted as serialized occurrences.
  An unserializable request yields a terminal preflight error, with no dispatch
  or compaction retry. The estimate remains heuristic rather than an exact
  provider token count or a guarantee that every request fits.
  Preflight compares the estimate directly with that
  trigger, without its former additional 5K/10% advance. Estimation can still
  observe a larger current request than the previous provider usage record;
  shared thresholds do not imply identical trigger timing. It routes recoverable
  overflow to existing recovery and distinguishes an unrecoverable static prefix.
  The shared rebuild helper reloads the latest persisted same-actor messages
  immediately before inserting its boundary, including a high-usage assistant
  completed after the request began.
  F06's strict `usageRecovered` validates real persisted checkpoint endpoints;
  an empty preflight placeholder created after the digest is not covered merely
  because recovery succeeded. Compat additionally passes the loop-local
  `skipOverflowCheck` receipt to `recoverOverflowPlaceholder`. This receipt is
  set only after successful compaction creation or checkpoint rebuild, and is
  cleared before constructing the next actual request. Classification still
  requires an existing cancelled assistant, `MessageAbortedError`, the exact
  overflow-recovery message and no parts. A real cancellation or an interrupted
  response with content is not resumed by this receipt. The next preflight still
  enforces its no-progress test and two-recovery episode limit; the receipt does
  not exempt the request from those checks or relax checkpoint watermarks.
  Shared F07 projection locates the snapshot endpoint by message identity in
  persisted order (`afterSnapshot`), including when the input omitted old rows.
  After the existing large-tool-result shrinking, the first newly arrived
  external user/spawn request and its entire suffix remain mandatory; eligible
  legacy user rows are classified by real, non-synthetic text/file content.
  Only older optional rounds spend the remaining tail budget. The mandatory
  suffix can exceed that budget, including when a missing frozen prefix leaves
  zero optional budget. Compat preflight then handles an oversized request;
  projecting the new request away is not a recovery strategy. Same-session/actor
  pending admissions settle before continuation checks on both sides of insert;
  a stale owned continuation and its parts are removed. Failed or interrupted
  admissions release the guard, and another actor's pending request does not
  block this actor. These guards do not grant the new request the old run's
  approval receipt.
  Preflight does not
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
  fails closed to the full observed history. An invalid marker's digest is
  cleared only in the temporary view so later tail collapse cannot undo that
  protection; persisted messages/parts remain unchanged. TUI updates retain an
  already-hydrated undo boundary, and active revert disables event-driven message
  eviction. These F06 fixes coexist with the independent coverage cache.
  The published OpenAPI exposes
  `/session/{sessionID}/checkpoint-coverage` and `CheckpointCoverage` as
  compat additions. `CompactionPart.projection` is already shared with main and
  must stay equivalent; it is not an additional compat API field. Every published code sample imports
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
- Additional actual carriers: `packages/opencode/src/cli/cmd/debug/agent.ts`,
  `packages/opencode/src/inbox/inbox.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/session/session.sql.ts`, and
  `packages/opencode/migration/20260901000001_session_prefix_active_tools/migration.sql`.
  New pin/rotate writes encode per-tool `active` only in shared JSON. The
  separate nullable legacy column and migration remain for old/mixed rows,
  including an explicit empty mask. Complete JSON flags take precedence over
  stale column values. The unused two-argument `restoreTools` filter is removed;
  production retains the full stored executable pool and separately selects
  advertised tools. Independent MCP membership/hash binding is unchanged.
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
- 2026-09-17 test hygiene: `checkpoint-coverage.test.ts` follows the inherited
  FC-008 convention. Its fixtures are `root: "cwd"`, and it names the fixture
  directory on every request, so the suite no longer boots an instance for the
  checkout and installs dependencies into the repository's `.mimocode`. The
  endpoint assertions are unchanged.
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
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
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
- Exit condition: retire the supported cap/preflight overlay only when shared
  `main` provides equivalent behavior without weakening FD-002 delivery.
  F04 now counts complete active schemas and terminates unserializable preflight
  requests. Universal non-throwing replay serialization, exact provider-token
  accounting and a strict total wire bound remain outside that guarantee.

## DC-ACTOR-001 — full-context actor and static-prefix overflow extensions

- 2026-09-15 Inbox crash consistency: inherit FC-001's atomic drain without
  changing full-context capture, system/model actor ownership, persistent-peer
  retirement or recovery. No model-facing context field is added to main.

- 2026-09-15 ownership adaptation: inherited main now creates only none-context
  ephemeral model actors. Compat explicitly owns the complete none/state/full
  schema, shell and no-script recovery interfaces, descriptions and persistent
  creation, together with its existing bounded state and frozen turnContext.
  Main retains the shared FD-009 system full-context runtime. Valid recovered
  values are preserved, malformed or conflicting copies are rejected, and both
  runtime-created and model-created persistent actors retain recovery coverage.

- 2026-09-09 full sync: no incoming owned production-path change; retain the existing override and shared invariants.

- POLICY-02 wake follow-up: Inherit durable-row rearming through the existing receiver lifecycle; keep content caps, frozen context, cancellation and disposal boundaries.

- POLICY-02 review: Retain full frozen turnContext and native/active tool snapshots while inheriting broader registered targets, trusted task namespaces and commit ownership. Real actor and HTTP fixtures retain isolated append/replace context coverage.

- POLICY-03 review: No changed compat-owned production surface; all incoming TUI/auth files match main, and the existing overlay remains intact.
- Status: active
- Canonical owner: `dev/compat` actor request/context integration
- Base: inherited main behavior
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271` provides FD-009's fail-closed
  frozen-context admission, FC-001's lifecycle linearization, FC-007's fixed
  instance cwd, default-fork checkpoint writers, and FD-002's fail-closed
  main/registered-peer `replace-agent` identity scope.
- Overrides: compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef` extends those shared invariants
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
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
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

## DC-ACTOR-002 — explicit subagent model variant

- Status: active
- Canonical owner: `dev/compat` model-facing actor creation
- Base: inherited main behavior
  `0b8c5d634077f19c2d8c03179f2c869a01a18cec` lets actor `run`/`spawn` choose
  only `model`. A child request's variant then comes solely from the prompt-side
  agent fallback: the agent's configured `variant`, applied only when the request
  uses the agent's configured model and that model defines it. The caller's own
  variant is never inherited.
- Overrides: compat adds an optional `variant` selector to `run`/`spawn` across
  the strict JSON schema, shell `--variant`, no-script argument recovery, tool
  descriptions and `actor models`, starting from compat
  `3ff9794a0b5a2568e819b4876f2448f9d666dc15`.
- Delta: the tool resolves the child model exactly as before, then requires the
  variant to be an own key of that model's merged, non-disabled `variants`.
  Otherwise it fails with a recoverable error before admission (no registry row,
  fork capture or child turn), naming the valid variants or stating that the
  model defines none. A valid value travels through `SpawnInput.variant` into
  every prompt turn the spawn drives (initial, pre-stop, completion-gate and
  post-stop re-entry), outranks the agent fallback, and is persisted on each
  child user message. Woken `send` turns reuse it through the drain seed's
  persisted user model; `resume` accepts no variant and retries the original
  user. No-script argument recovery keeps an explicit variant from flat fields
  or beside an operation envelope, including malformed values, and leaves
  conflicting root and envelope copies in place so the strict schema rejects
  the call instead of silently using the default. An explicitly empty
  `--variant ""` is rejected by the shared parser (FC-018) before the schema
  sees it, so the shell mapping keeps the same truthiness spread as every other
  flag. Without an explicit variant the tool adopts the agent's own configured
  variant when the child's model is the agent's configured model, compared as
  provider-aware resolved identities. That holds for the group member picked for
  the caller's provider, and however the call names that model — the agent's own
  group reference or the resolved member itself — while the prompt-side
  comparison would treat it as a different model. A configured value the
  resolved model does not define is dropped. With neither an explicit nor a
  configured variant, the spawn input, prompt input, tool metadata and
  model/variant selection are unchanged and no extra provider lookup runs. Tool
  metadata adds `variant` only when set. `actor models` appends
  `[variants: …]` to models that define variants. DC-TUI-001 renders the
  persisted value in the subagent footer without a TUI change.
- Boundaries: no parent-variant inheritance, no variant inside `model`, no
  workflow `agent()` or session-tool peer selector, and no resume override. The
  prompt-side fallback is unchanged and still resolves the agent's group without
  provider context for every other caller; the actor path no longer depends on
  it, because it adopts the agent's configured variant itself after resolving
  that group provider-aware.
- Source surfaces: `packages/opencode/src/tool/actor.ts`,
  `packages/opencode/src/tool/actor.txt`,
  `packages/opencode/src/tool/actor.shell.txt`, and
  `packages/opencode/src/actor/spawn.ts`.
- Test surfaces: `packages/opencode/test/tool/actor.test.ts`,
  `packages/opencode/test/tool/actor.shell.test.ts`,
  `packages/opencode/test/tool/actor-recover.test.ts`,
  `packages/opencode/test/tool/actor-models.test.ts`,
  `packages/opencode/test/tool/actor-variant-guidance.test.ts`,
  `packages/opencode/test/actor/spawn.test.ts`, and
  `packages/opencode/test/inbox/drain-seed-variant.test.ts`.
- Evidence: shell, recovery and strict-schema tests cover the entry points.
  Actor tool tests prove forwarding against an overridden model, rejection of
  unknown and disabled variants and of models without variants before any
  spawn, and an unchanged spawn input when omitted. A cross-provider group
  fixture proves the agent's configured variant reaches the member picked for
  the caller's provider, that an unsupported configured value is dropped rather
  than failing the call, and that an explicit variant outranks it. A real
  prompt-loop test proves the persisted child variant and the request's
  reasoning effort, and the drain-seed test proves a woken turn keeps the
  variant. Forwarding, validation, schema, drain-seed and agent-variant
  assertions were each mutation-checked.
- Exit condition: retire when shared `main` exposes an equivalent validated
  per-actor variant selector for model-created actors with the same precedence,
  pre-admission validation and actor lifetime. If this capability is propagated
  to `main`, move its contract to the shared registry instead of duplicating it.

## DC-TUI-001 — request provider/model/variant display

- 2026-09-18 model-selection correction: ordinary prompt metadata is resolved
  by `POST /experimental/model-selection`, using the same server resolver as
  actual user-message creation. The TUI sends its selected model, agent and
  explicit variant; it no longer mirrors agent model-group or default-model
  selection. Preview results never update the selected variant store or delay
  submission. Pending and failed previews display `resolving` and `unknown`,
  respectively; `none` requires a successful response without a named variant.
  Replaced requests and disposed components cannot accept late responses.
  Preview requests carry the submitting session's workspace, or the selected
  workspace for a new session; an unloaded session cannot publish a result.

- 2026-09-09 full sync: retain provider/model/variant metadata and titleLocale; the multimodal title test now sends actual PNG/JPEG bytes through the inherited image transform.

- POLICY-02 review: No incoming compat-owned production overlap; the existing overlay is retained. This review does not claim new runtime coverage of this owner.

- POLICY-03 review: No changed compat-owned production surface; all incoming TUI/auth files match main, and the existing overlay remains intact.
- Status: active
- Canonical owner: `dev/compat` TUI request-metadata presentation
- Legacy ID: FD-007
- Base: inherited main behavior
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271` follows upstream's condensed
  model presentation, which may omit the provider label or an unselected
  variant, and propagates the current BCP 47 `titleLocale` through TUI prompt
  submissions and automatic title generation.
- Overrides: compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef` displays one request-oriented
  `alias · providerID/modelID · variant: <value>` row in the prompt and
  subagent footer.
- Delta: provider/model is unconditional. Ordinary prompt variants come from
  the server preview; subagent variants come from persisted messages. A
  successfully resolved or persisted absence of a named variant is rendered as
  `variant: none` instead of inventing a provider default. Metadata shrinks
  before established footer controls on narrow terminals. The same prompt
  submits `language.intl()` as `titleLocale`; presentation metadata does not
  guess or alter that locale.
- Source surfaces:
  `packages/opencode/src/cli/cmd/tui/component/model-metadata.tsx`,
  `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`,
  `packages/opencode/src/cli/cmd/tui/routes/session/subagent-footer.tsx`, and
  `packages/opencode/src/cli/cmd/tui/util/model.ts`,
  `packages/opencode/src/cli/cmd/tui/util/model-preview.ts`,
  `packages/opencode/src/session/model-selection.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/server/routes/instance/experimental.ts`, and the
  generated SDK/OpenAPI model-selection operation.
- Test surfaces:
  `packages/opencode/test/cli/tui/model-metadata.test.tsx` and
  `packages/opencode/test/cli/tui/model.test.ts`,
  `packages/opencode/test/cli/tui/model-preview.test.tsx`, and
  `packages/opencode/test/server/model-selection.test.ts`.
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
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
- Evidence: rendering tests cover the unified label and narrow layout. HTTP
  preview tests compare literal/group/tier resolution and explicit/default
  variants with actual persisted no-reply prompts. Reactive preview tests
  cover reordered responses, repeated selections, scope refresh, failure and
  disposal. SDK tests verify workspace query placement and request cancellation;
  real local-workspace routing agrees with session-ID-routed submissions.
  Model tests retain persisted metadata and context-budget coverage;
  the removed client inference tests are replaced by server behavior coverage.
  Prompt and App submission tests cover the independently inherited locale path.
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
- Known limits: a preview describes ordinary prompt selection at resolution
  time, not a reservation of future configuration. Shell and commands with
  their own agent/model overrides use separate execution paths. An older
  attached server without the preview endpoint displays an unknown variant
  instead of falling back to client inference. Subagent metadata continues to
  describe persisted requests.
- 2026-09-07 selected-capability review: No owned TUI metadata or locale-submission
  implementation overlap. Request provider/model/variant truth, both
  `titleLocale` paths, narrow-layout behavior, and the existing variant-display
  limits remain unchanged. The shared backend harness alias does not create
  a second compat metadata resolver.
- 2026-09-08 selected Actor/MCP completion: No metadata or titleLocale component changed; provider/model/variant presentation and existing known limits remain unchanged.
- Exit condition: the client inference portion is removed by the server
  resolver correction. Retire the remaining compat presentation/API overlay
  when shared `main` exposes the equivalent preview and metadata display.
