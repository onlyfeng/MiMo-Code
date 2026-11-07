# dev/compat Override Registry

This is the authoritative registry for active behavior owned only by
`dev/compat`. The branch inherits the shared `main` FD/FC registries unchanged;
this file records only the remaining delta from that inherited behavior.

Review this registry whenever work targets `dev/compat` or propagates `main`
into it, including when a listed surface merges without conflicts. A pure
registry/history commit does not advance either behavior reference below.

## Current review record

- Last reviewed: 2026-11-06; selected upstream `10b03cf04fe43aae89638e90570779c1e1216c5a..3a12665a9e27789b04dc7529d4ce0c10128e9ad8`.
- Scope: C01 (N=1), non-interactive workspace trust and approval documentation, in [the shared synchronization record](upstream-sync-2026-11-06.md).
- Starting main: `9550108ac29870628a3a9c5c1d6b920259651eea`; starting compat: `4ad2d84daa40c2e787becbdc081f06369cbaed78`; inherited main content: `28a37f58e4b665ab63173b7348c35efb201a15a2`.
- Result: inherit SECURITY.md and shared FD/FC/history/report unchanged; preserve fork-specific private vulnerability reporting. Main owns C01 under FC-012; FD-001’s invocation-scoped approval remains intact. No runtime, test, schema, generated artifact, dependency or migration changes.
- 2026-11-07 propagation: main FC-053 now owns the former DC-PROVIDER-001 routing and reasoning default, so eleven DC owners remain; the line below records the 2026-11-06 review as it stood.
- Override review: all twelve DC owners remain compat-owned. DC-SESSION-001 process/session ownership does not add a workspace-trust gate; DC-NET-001/002, DC-PLATFORM-001, DC-CONTEXT-001, DC-MODEL-001, DC-ACTOR-001/002, DC-TUI-001, DC-PROVIDER-001, DC-WEBSEARCH-001 and DC-WEBFETCH-001 retain their implementations and exit conditions. No override adapts, retires or moves.
- Validation: whitespace, local Markdown links, identical shared documents, preserved reporting section and complete tree equality outside SECURITY.md/docs against starting compat. Content-only selection; no local runtime test pass is claimed. Historical runtime/test references remain historical.
- Publication: acceptance commit `6f85fdb7e70dd4f4953f016a3d6a5d809e2e96da` passed [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/42163147168), [typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/42163147229), and [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/42163146988): all ten test jobs succeeded, including Windows runtime and launcher extraction. Main acceptance `28a37f58` also passed all three workflows. This receipt changes only docs; final docs-only descendants require tree equality outside docs, live upstream/main/compat ancestry and remote equality in the execution receipt.

Earlier review records and dated propagation notes (75 sections, dated 2026-09-09 to 2026-11-06) moved verbatim to [the compat history](dev-compat-registry-history.md#2026-11-07-registry-normalization). They record past decisions; the DC entries below and the current review record above are the live contract.

## Sync index

| ID              | Watch surfaces                                                                                                                             | Relationship to inherited `main`                                             | Required decision                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| DC-NET-001      | WebFetch and SSRF call seam                                                                                                                | Private-destination policy override                                          | Preserve explicit intranet access or adopt a reviewed replacement                                                         |
| DC-NET-002      | Remote MCP URL and lifecycle tests                                                                                                         | Compat guarantee; no production fork                                         | Keep RFC1918 client creation unless policy changes explicitly                                                             |
| DC-PLATFORM-001 | `ripgrep` and `archive` fallbacks                                                                                                          | Restricted-network/Windows adaptation under fixed-cwd path semantics         | Keep compat-only; preserve inherited relative-path resolution                                                             |
| DC-MODEL-001    | Agent config, MaxMode, retry status, title path, SDK/OpenAPI                                                                               | Per-agent extension over shared bounded retry; title generation stays shared | Preserve opt-in, final-step bound, title isolation, and subagent status isolation                                         |
| DC-CONTEXT-001  | Model-visible text, request preflight, title/skills/memory, compaction, checkpoint coverage, chronology, and TUI context/revert projection | Bounded-content hardening around shared request construction                 | Preserve caps, snapshots, stable paths, effective-window preflight, positional coverage, chronology, and recovery routing |
| DC-ACTOR-001    | Actor context, default-fork checkpoint, replace-agent, static-prefix overflow                                                              | Full-context extension beyond shared capture and actor identity scope        | Preserve frozen membership/system/cwd and fail unrecoverable prefixes                                                     |
| DC-ACTOR-002    | Actor run/spawn JSON `variant`, `actor models` listing, spawn-to-prompt propagation                       | Model-facing extension over inherited actor model selection                  | Preserve pre-admission validation, explicit/configured precedence, parent fallback, and actor-lifetime persistence                   |
| DC-TUI-001      | Prompt/footer model metadata and title locale                                                                                              | Request-metadata display override alongside shared locale propagation        | Preserve provider/model/variant truth, locale submission, and known-limit disclosure                                      |
| DC-WEBSEARCH-001 | `websearch` config, `LLM.stream` tool injection/retry/replay, preflight `LLM.wireTools`, Anthropic tool-call reorder, websearch tool chain, registry exposure | Compat-only extension; main has no native search and no `websearch` config | Preserve opt-in native search, search-specific in-turn fallback, text replay downgrade, and the fallback chain order |
| DC-WEBFETCH-001 | `webfetch` config, WebFetch route chain, destination classification, hosted fetch models | Compat-only extension; main has no hosted fetch and no `webfetch` config | Preserve direct-first default, private targets direct-only, result-block proof, digest labelling and chained failure reasons |
| DC-SESSION-001 | `ExecutionOwnership`, `SessionRunState` entries, `preparePrompt`, inbox `maybeKick`/wake poller/`reconcileOnBoot`, `actor send`, `sweepAbandonedZombies`, TUI `claimSession` | Compat-only extension; main assumes one process per database | Keep one live driver per session; never adopt across sessions; gate any new lane start, run entry or boot-time recovery of other processes' state |

Retired identifier: DC-PROVIDER-001 moved to shared FC-053 on 2026-11-07 and is not reused; its last compat entry is kept verbatim in [the compat history](dev-compat-registry-history.md#2026-11-07-inherit-fc-053-and-the-fc-008-ci-alignment).

## DC-NET-001 — approved private-network WebFetch

- 2026-10-15 propagation: main `a7d242df` (first pushed as `ebb8b62b`) makes the inherited classifier check
  every DNS answer (`lookup` with `all: true`) instead of trusting the first,
  failing closed on mixed public/private answers and empty results, and
  resolves empty-answer lookups as failures. The merge inherits
  `src/util/ssrf.ts` and `test/util/ssrf.test.ts` byte-identically; compat
  WebFetch still does not call the classifier, so DC-NET-001 behavior is
  unchanged. Evidence: `test/util/ssrf.test.ts` 29/29 and
  `test/tool/webfetch.test.ts` 5/5 on main.

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
- Source surfaces: `packages/cli/src/tool/webfetch.ts`. The inherited
  `packages/cli/src/util/ssrf.ts` is a synchronization surface but is not
  forked by this entry.
- Test surfaces: `packages/cli/test/tool/webfetch.test.ts`; inherited
  `packages/cli/test/util/ssrf.test.ts` continues to validate the
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

- 2026-10-13 full sync: upstream `2f373289` moves startup MCP connections into a background fiber. Compat's `mcp/index.ts` takes main's FC-004 adaptation byte-for-byte; remote URL validation and client creation are unchanged, and the RFC1918 sentinel passes in `test/mcp/lifecycle.test.ts` (34 pass).

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
  `packages/cli/src/mcp/index.ts`, which must remain byte-identical to
  `main` until a real compat override is required.
- Test surfaces: `packages/cli/test/mcp/lifecycle.test.ts` 中的 `compat permits an RFC1918 remote MCP endpoint` 是 compat 准入 sentinel；共享实际协议入口为 `packages/cli/test/mcp/real-transport-oauth.test.ts` 和 `packages/cli/test/fixture/mcp-real-transport-child.ts`。后者由实际 MCP.Service/SDK、隔离 issuer 与生产 callback 完成验证，默认 loopback，私网模式要求 bind 地址属于本机。
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

- 2026-11-01 DC-SESSION-001 follow-up: the Windows entry adds a fourth focused suite, `session-owner` (`test/session/process-liveness.test.ts` and `test/session/session-owner.test.ts`), and records `src/session/process-liveness.ts` in its source hashes. That suite and its subject belong to DC-SESSION-001; the archive, no-rg and other focused cases are unchanged.

- 2026-10-10 FC-008 Actions usage reduction (main PR #153): the shared `windows-runtime` job no longer runs for any pull request, including one into `dev/compat`. It runs on each push to `dev/compat` that changes more than `docs/`, and on dispatch with `windows_runtime: true`; a compat branch that changes `ripgrep.ts`, `archive.ts` or the Windows entry dispatches `test.yml` on that branch with the input when it needs pre-merge platform evidence. The environment record no longer carries a pull-request head SHA. The platform entry and both fallbacks are unchanged.

- 2026-10-02 full sync: the Windows runtime entry is now `packages/cli/script/verify-windows-runtime.ts`; the shared `test.yml` `windows-runtime` job and the `tsconfig.scripts.json` exclusion follow the rename. The ripgrep/archive overlay is unchanged.

- 2026-09-29 full sync: upstream's root typecheck now also checks `tsconfig.scripts.json`, which includes `packages/cli/script/**` without the package's `@/` path mapping. `script/verify-windows-runtime.ts` reaches `src/util/process.ts` through `test/fixture/windows-archive-runtime.ts`, so compat adds it to that project's `exclude` list; `packages/cli/tsconfig.json` still checks it. The production overlay and the Windows job are unchanged.

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
- Source surfaces: `packages/cli/src/file/ripgrep.ts` and
  `packages/cli/src/util/archive.ts`.
- Test surfaces: `packages/cli/test/file/ripgrep.test.ts` 与 `packages/cli/test/util/archive.test.ts` 保留；新增实际 Windows 入口 `packages/cli/script/verify-windows-runtime.ts` 和 `packages/cli/test/fixture/windows-archive-runtime.ts`。`.github/workflows/test.yml` 的调度和安装设施由共享 FC-008 维护；平台入口与 compat fallback 归本项。根 `tsconfig.scripts.json` 中对该入口的 `exclude` 也归本项。
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

- 2026-10-02 full sync: upstream deletes the committed `packages/sdk/openapi.json`; the per-agent `maxMode` schema is now carried by the generated v2 SDK types, regenerated from compat sources without a diff, and the snapshot leaves this entry's surfaces.

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
- Source surfaces: `packages/cli/src/agent/agent.ts`,
  `packages/cli/src/config/agent.ts`,
  `packages/cli/src/session/max-mode.ts`,
  `packages/cli/src/session/prompt.ts`,
  and `packages/sdk/src/v2/gen/types.gen.ts`.
- Test surfaces: `packages/cli/test/session/max-mode.test.ts`,
  `packages/cli/test/session/max-mode-econnreset.test.ts`, and MaxMode
  routing cases in `packages/cli/test/session/prompt-effect.test.ts`.
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

- 2026-11-07 FC-036 and FC-047 sizing propagation (`main` PR #256): a no-fork writer's delta is sized by the request it is sent (the writer's system prompt plus the delta rendered as model messages), not by its stored parts. Compat's request preflight still skips bounded computation agents, the writer among them, so this check stays the only window bound before a writer request, and a writer that still overflows stops through FC-021 as before. `estimateRequestTokens` is not used for it, so the decision is the same on both branches. The merge conflict in the fork-context construction keeps compat's `turnContext` on both the no-fork writer context and the parent-view fork.
- 2026-11-04 FC-035 propagation (`main` PR #211): undo reverts only the patch files the session's write tools wrote (`written`), and redo or a further undo restores only the files the revert stored (`revert.files`). `revert.ts`, `export.ts` and the write gate were identical on both branches; the revert's chronological positions this owner relies on are unchanged.
- 2026-11-03 FC-032 and FC-033 propagation (`main` PRs #207, #208): the bash timeout note for an ssh command and the tool start time (set at gate admission, kept by the `metadata` callback in `prompt.ts`) apply unchanged. Neither touches content caps, the measured preflight or the recovery floor.
- 2026-11-03 measured request preflight: the whole-request estimate ran 1.3 to 2.0 times above the provider's count for the previous step in every preflight overflow recorded that day — seven of seven, across claude-opus-5-5 (1.31, 1.62), kimi-k3.1-pro (1.70), grok-4.7 (1.56) and gpt-6-astra (2.04, 2.00, and once 9.4) — so each routed a request that fit into recovery; gpt-6-astra sessions were rebuilt at about 390K of an 872K window. An estimate that reaches the trigger is now checked against the measured request described below (`measuredRequest` and `classifyRequestOverflow` in `packages/cli/src/session/overflow.ts`, the preflight in `runStep` in `packages/cli/src/session/prompt.ts`). Known limit: tool or system prompt growth since the counted step is not measured; it stays within the trigger's headroom, and a provider overflow error still routes to recovery. Tests: `packages/cli/test/session/overflow.test.ts` "request preflight measured from provider usage" and `packages/cli/test/session/prompt-effect.test.ts` "request preflight measures the request from the previous step's provider count" (under and near the trigger). Ignoring the measurement, dropping what came after the counted step, measuring across a boundary, from a summary or another model, counting output, or letting a measurement raise the estimate each fails a case.
- 2026-11-03 FC-029 propagation (`main` PR #201): the writer task grows by the CURRENT FILES block. Compat's request preflight skips bounded computation agents (`!isBoundedComputation`), the writer among them, so it does not see the block; as on `main`, a writer request that overflows still stops through FC-021, and the block is bounded by `CURRENT_FILE_CHAR_LIMIT` for checkpoint.md and MEMORY.md (notes.md is shown whole because the writer resets it). The 50 KiB model-visible caps (tool output and input replay, skill, MCP and shell text, compaction summary and manifest, inbox content, instructions) do not touch it: the writer task and the `actor.preStop` re-prompts reach the writer as plain user text parts (`spawn.ts` `runAgentLoop`), so a checkpoint above 50 KiB is shown up to `CURRENT_FILE_CHAR_LIMIT`, not cut at the cap.
- 2026-11-03 FC-027 and FC-028 propagation (`main` PRs #198, #199): no interaction with the caps or the request preflight. The writer task gains one sentence, and prune's restart seeding reads persisted messages and actor rows, not request estimates.
- 2026-10-31 FC-021 propagation: main makes a bounded computation agent's provider-signalled overflow terminal (`ContextOverflowError`, actor failure `kind: "overflow"`). Compat's `runStep` therefore no longer writes the empty overflow-recovery placeholder for bounded agents: that `MessageAbortedError` would classify the writer's failure as an abort, and `recoverOverflowPlaceholder` (which includes `isBoundedComputation`) would resume it. Request preflight still skips bounded agents. For every other agent, the placeholder, its exact-message classification, and the no-progress and two-recovery limits are unchanged. The fork and regular paths keep the `"overflow-static"` break ahead of main's new bounded-overflow break.

- 2026-10-21 full sync: upstream `6f83cd0e` removes turn-end prune, the last caller of `pressureLevel`, so `pressureLevel` and `contextPressureLevel` leave `overflow.ts`. Compat keeps `estimateRequestTokens`, `isRequestOverflow` and `classifyRequestOverflow`. Request preflight never read the pressure bands, so its gates and the `overflow`/`overflow-static` classification are unchanged. Upstream `88673c41` deletes the per-message recall reminder. Compat's `shouldInjectActiveRecallReminder` JSON-schema suppression retires with it. The memory paths reminder that replaces it is not format-gated: it only fills in the real paths for the placeholders in the memory instructions, which JSON-schema requests also receive. It is also aimed at one message per context window rather than at the current request. The compat checkpoint stub in `test/tool/actor.test.ts` drops `hasMemoryOrTasks`. The marker-chronology assertion that compat had added to the deleted `rebuild-microcompact.test.ts` stays covered by the shared `checkpoint-rebuild-unify.test.ts`.

- 2026-10-13 full sync: upstream `463cbb28` defers MCP schemas behind `mcp_tool_search` by default and drops the pressure-degraded catalog in the search description. The active and auto-disabled `request preflight handles a large ... MCP schema` cases now opt out of deferral so their preflight still sees the directly exposed 1 MiB schema; the inactive case keeps search on. `contextPressureLevel` stays in `overflow.ts` behind `pressureLevel`, which `prune.ts` still calls; the compat-only catalog-pressure test retires with the description catalog. Run-loop agent resolution uses `resolveStoredAgent`, so a retired stored agent name keeps preflight and bounded-computation policy on the default agent.

- 2026-10-02 full sync: with the committed OpenAPI snapshot deleted upstream, the checkpoint-coverage operation and `CheckpointCoverage` schema are asserted on the runtime OpenAPI document and carried by the generated v2 SDK; every runtime operation's code sample must resolve to a callable client method.

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
  recorded in the F01–F11 accepted review record, now in
  [the compat history](dev-compat-registry-history.md#f01f11-accepted-review-record-historical).

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
  JSON-schema requests can recover the structured result from a completed
  StructuredOutput part; their former recall-reminder suppression retired with
  the reminder on 2026-10-21. These local prompt
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
  trigger, without its former additional 5K/10% advance. An estimate that
  reaches the trigger is then checked against a measured request: the input
  the provider counted for the lane's newest step with a count (uncached,
  cache-read and cache-write together), plus the estimate of everything sent
  after that step's request — its output and tool results, later messages, the
  turn context and request-local messages. A measured request under the trigger
  is sent. No measurement is made across a rebuild or compaction boundary,
  from a compaction summary, or from a step on another model; the estimate then
  decides, as it does when the measured request also reaches the trigger. A
  measurement never raises an estimate. The recovery floor and the no-progress
  test keep using the estimate. Shared thresholds do not imply identical
  trigger timing. It routes recoverable
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
- POLICY-04 additional surfaces: `packages/cli/src/session/skill-catalog.ts`,
  `packages/cli/test/session/skill-catalog-capture.test.ts`,
  `packages/cli/test/session/skill-catalog-compat-capture.test.ts`, and
  `packages/cli/test/session/skill-catalog-compat-projection.test.ts`.
- Source and synchronization surfaces:
  `packages/cli/src/cli/cmd/tui/context/sync.tsx`,
  `packages/cli/src/cli/cmd/tui/routes/session/index.tsx`,
  `packages/cli/src/cli/cmd/tui/util/model.ts`,
  `packages/cli/src/inbox/render.ts`,
  `packages/cli/src/server/routes/instance/session.ts`,
  `packages/cli/src/session/checkpoint.ts`,
  `packages/cli/src/session/classify.ts`,
  `packages/cli/src/session/compaction.ts`,
  `packages/cli/src/session/instruction.ts`,
  `packages/cli/src/session/llm.ts`,
  `packages/cli/src/session/max-mode.ts`,
  `packages/cli/src/session/message-v2.ts`,
  `packages/cli/src/session/overflow.ts`,
  `packages/cli/src/session/prefix-snapshot.ts`,
  `packages/cli/src/session/prompt.ts`,
  `packages/cli/src/session/revert.ts`,
  `packages/cli/src/session/session.ts`,
  `packages/cli/src/session/system.ts`,
  `packages/cli/src/session/tail-digest.ts`,
  `packages/cli/src/tool/actor.ts`,
  `packages/shared/src/util/encode.ts`,
  `packages/cli/src/util/safe-stringify.ts`,
  `packages/cli/src/util/text-truncate.ts`,
  `packages/cli/src/cli/cmd/generate.ts`,
  `packages/sdk/src/v2/gen/sdk.gen.ts`, and
  `packages/sdk/src/v2/gen/types.gen.ts`.
- Additional actual carriers: `packages/cli/src/cli/cmd/debug/agent.ts`,
  `packages/cli/src/inbox/inbox.ts`,
  `packages/cli/src/session/llm-request-prefix.ts`,
  `packages/cli/src/session/session.sql.ts`, and
  `packages/cli/migration/20260901000001_session_prefix_active_tools/migration.sql`.
  New pin/rotate writes encode per-tool `active` only in shared JSON. The
  separate nullable legacy column and migration remain for old/mixed rows,
  including an explicit empty mask. Complete JSON flags take precedence over
  stale column values. The unused two-argument `restoreTools` filter is removed;
  production retains the full stored executable pool and separately selects
  advertised tools. Independent MCP membership/hash binding is unchanged.
- Test surfaces: inbox rendering, request classification, instruction, MaxMode,
  message replay, overflow, prompt-effect, actor, checkpoint coverage,
  checkpoint tail, context usage, select-messages, revert, safe-stringify, and
  text-truncation suites under `packages/cli/test/`, including
  `packages/cli/test/cli/tui/checkpoint-coverage-sync.test.tsx`,
  `packages/cli/test/server/checkpoint-coverage.test.ts`,
  `packages/cli/test/server/openapi-refs.test.ts`,
  `packages/cli/test/session/checkpoint-rebuild-unify.test.ts`,
  `packages/cli/test/session/messages-pagination.test.ts`,
  `packages/cli/test/session/prompt-rebuild-loop.test.ts`, and
  `packages/cli/test/lib/llm-server.ts` supporting request-boundary
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

- 2026-11-03 FC-031 propagation (`main` PR #205): `actor send` records the sending lane's actor id on every path (`ctx.actorID ?? "main"`), replacing the agent name on direct calls. Compat's send handler carries the same line and keeps its `delivery` field; a full-context subagent signs with its registry actor id and a peer with its own actor id under its own session, so a reply to the rendered `from` reaches either. Nested subagent sends still go only to the registered parent.
- 2026-11-03 FC-029 propagation (`main` PR #201): the writer task carries a CURRENT FILES block (the current checkpoint.md, MEMORY.md and notes.md text and NOTES_TEMPLATE), and the `actor.preStop` re-prompts carry the current text of the files they name. The merge is clean; compat's `coverage` read and writer `turnContext` are untouched. `composeWriterPrompt` builds the task for default-fork and `fork: false` writers alike, so both modes get the block; it follows the frozen prefix, so prefix-cache alignment is unchanged.
- 2026-11-03 FC-027 and FC-028 propagation (`main` PRs #198, #199): the writer task's last line now asks the writer to close with one short line, and `checkpoint.ts` gains `lastSucceededWriterStart`, from which prune rebuilds its crossed thresholds after a restart. The merge conflicts only in `checkpoint.ts`'s imports and keeps both sides: compat's `NotFoundError`, `sql` and `alias`, and main's `desc` and `ActorRegistryTable`. Default-fork and `fork: false` writers both run as the `checkpoint-writer` actor of a child session created before the spawn, so the seeding reads either mode's outcome. The new restart cases in `prune.test.ts` stub the checkpoint service, so their stub also returns compat's `coverage`, as the file's existing stub does.
- 2026-11-02 PR #189 propagation: main's FC-002 change drops `task` from the checkpoint writer's tools and gives the writer a TASK SNAPSHOT of the parent's tasks in `composeWriterPrompt`; `checkpoint.ts` merges without conflict. Even where a forked writer's frozen tools still list `task`, the per-tool runtime whitelist in `prompt.ts` rejects the call at execution, so the writer cannot change task state from its child session; `checkpoint-writer-runaway.test.ts`, whose scripted writer keeps calling `task`, still ends at the step budget. Compat's `coverage` read and the writer prefix's `turnContext` are unchanged.

- 2026-11-01 PR #185 propagation: main's FC-002 captor registration (`registerPrefixCapture`) merges without conflict into `prefix-capture-ref.ts` and the compat `prompt.ts` overlay. The compat-only `turnContext` field of `PrefixCaptureResult` and the compat capture body are unchanged; only the finalizer now unregisters its own captor instead of clearing the slot. A full-context actor therefore still reads the live layer's frozen system, tools, permissions and turnContext, and disposing another `SessionPrompt` layer in the same process no longer removes it. Overflow handling and the DC-SESSION-001 `preparePrompt` overlay are untouched. `retry.test.ts` and the new `prefix-capture-ref.test.ts` are byte-identical to main.

- 2026-09-24 synchronization: preserve the strict JSON `context` and `lifecycle`
  selectors, bounded state capture, and frozen full-context actor lifecycle.
  Retire only the historical shell and no-script argument recovery surfaces
  with shared FC-018; runtime and HTTP actor recovery remain.

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
- Source surfaces: `packages/cli/src/actor/spawn.ts`,
  `packages/cli/src/session/checkpoint.ts`,
  `packages/cli/src/session/compaction.ts`,
  `packages/cli/src/session/overflow.ts`,
  `packages/cli/src/session/prefix-capture-ref.ts`,
  `packages/cli/src/session/prefix-snapshot.ts`,
  `packages/cli/src/session/prompt.ts`,
  `packages/cli/src/tool/actor.ts`,
  `packages/cli/src/tool/session.ts`, and
  `packages/cli/src/util/text-truncate.ts`.
- Test surfaces: `packages/cli/test/tool/actor.test.ts`,
  `packages/cli/test/actor/cancel-notification.test.ts`,
  `packages/cli/test/actor/spawn-notification.test.ts`,
  `packages/cli/test/actor/spawn.test.ts`,
  `packages/cli/test/inbox/fork-agent-compat.test.ts`,
  `packages/cli/test/session/auto-overflow-writer-first.test.ts`,
  `packages/cli/test/session/checkpoint-fork-mode.test.ts`,
  `packages/cli/test/session/checkpoint-main-slice.test.ts`,
  `packages/cli/test/session/checkpoint-prefix-capture-fixture.ts`,
  `packages/cli/test/session/classify-integration.test.ts`,
  `packages/cli/test/session/overflow.test.ts`,
  `packages/cli/test/session/prompt-effect.test.ts`, and actor-state cases
  in `packages/cli/test/util/text-truncate.test.ts`.
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
- Base: inherited main `fd04de73ced82599baac249e9cf96dfb55b9d778` supports
  parent-turn variant inheritance and explicitly forwards a supported agent
  variant on the actual selected model when no model override was supplied.
  On main, an explicit model selection takes the parent path even when it names
  the agent's model. Main still exposes no explicit actor `variant` selector.
- Overrides: compat adds an optional `variant` selector to `run`/`spawn` across
  the strict JSON schema, tool descriptions and `actor models`, starting from
  compat
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
  user. The 2026-09-24 sync removes the shell and no-script entry points with
  shared FC-018; strict JSON validation still rejects malformed values and
  conflicting operation envelopes before spawning. Without an explicit
  variant, the tool adopts the agent's own configured value when the child's
  model is the agent's configured model, compared as provider-aware resolved
  identities. That holds for the group member picked for
  the caller's provider, and however the call names that model — the agent's own
  group reference or the resolved member itself — while the prompt-side
  comparison would treat it as a different model. A configured value the
  resolved model does not define is dropped. With neither an explicit nor a
  configured variant, inherit the parent's value as-is for the same resolved
  model; for another model, inherit only if its merged variants contain that
  value. A configured but unsupported agent value still drops to default and
  does not fall through to the parent. With none of these values, the spawn
  input remains unset. Tool metadata adds `variant` only when set. `actor models` appends
  `[variants: …]` to models that define variants. DC-TUI-001 renders the
  persisted value in the subagent footer without a TUI change.
- Boundaries: no variant inside `model`, no
  workflow `agent()` or session-tool peer selector, and no resume override. The
  prompt-side fallback is unchanged and still resolves the agent's group without
  provider context for every other caller; the actor path no longer depends on
  it, because it adopts the agent's configured variant itself after resolving
  that group provider-aware.
- Source surfaces: `packages/cli/src/tool/actor.ts`,
  `packages/cli/src/tool/actor.txt`, and
  `packages/cli/src/actor/spawn.ts`.
- Test surfaces: `packages/cli/test/tool/actor.test.ts`,
  `packages/cli/test/tool/actor-models.test.ts`,
  `packages/cli/test/tool/actor-variant-guidance.test.ts`,
  `packages/cli/test/actor/spawn.test.ts`, and
  `packages/cli/test/inbox/drain-seed-variant.test.ts`.
- 2026-11-04 evidence: parent same/different-model forwarding, explicit-over-agent/parent priority, unsupported configured value, provider-aware group selection and metadata consistency are covered alongside the existing tests. A real group-selected child persists the configured variant and sends its reasoning effort on the wire.
- Evidence: JSON schema and runtime tests cover the remaining entry points.
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

- 2026-11-03 FC-030 propagation (`main` PR #203): resuming a session holds the last main-lane user message's variant in memory for that model (`variant.resume`) instead of saving it with `variant.set`; a message without a variant keeps the saved per-model choice. Compat's `local.tsx` matches main and its restore effect is the inherited one, so the change applies unchanged. The `ModelMetadata` preview reads `variant.current()` and so resolves the resumed variant; previews still never write the selected variant store, and submission sends the same `variant.current()` value.

- 2026-11-02 FC-023 rebuild-boundary propagation (`main` PR #193): `insertRebuildBoundary` keeps the variant of the lane's newest user message when the boundary is on that message's model. Compat restores the TUI selection and resolves model-less turns through `SessionModelSelection.resolve`, whose fallback takes the last user message's model and variant; with the boundary now carrying the variant, a session reopened after a rebuild shows it and inbox deliveries keep it. `checkpoint.ts` merges without conflict beside compat's `coverage` read and writer `turnContext`.
- 2026-10-31 FC-023 propagation: main continues the fallback model's variant in `createUserMessage`. Compat creates user messages through `SessionModelSelection.resolve`, so the resolver applies the same rule: only when neither the input nor the agent names a model, and only while the model still offers the variant. The resolver's fallback type now carries the optional variant that `lastModel` returns. The preview endpoint always sends the TUI's selected model, so a preview never reaches the fallback and its results are unchanged; a named model without a variant still previews and resolves to its default. Shell and command continuation come unchanged from main's `prompt.ts`.

- 2026-10-13 full sync: upstream `3c6e6bb0` removes the compose agent and its "(legacy)" label from the Prompt footer. Compat keeps its `flexShrink={0}` agent label and `ModelMetadata` display; only the retired suffix branch is dropped.

- 2026-10-02 full sync: upstream removes the free `mimo-auto` channel, including the Prompt footer guard that hid the provider label for it. Compat keeps `ModelMetadata` as the authoritative footer display, so the upstream-only `currentProviderLabel` row stays absent; provider/model/variant truth and `titleLocale` submission are unchanged.

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
  `packages/cli/src/cli/cmd/tui/component/model-metadata.tsx`,
  `packages/cli/src/cli/cmd/tui/component/prompt/index.tsx`,
  `packages/cli/src/cli/cmd/tui/routes/session/subagent-footer.tsx`, and
  `packages/cli/src/cli/cmd/tui/util/model.ts`,
  `packages/cli/src/cli/cmd/tui/util/model-preview.ts`,
  `packages/cli/src/session/model-selection.ts`,
  `packages/cli/src/session/prompt.ts`,
  `packages/cli/src/server/routes/instance/experimental.ts`, and the
  generated SDK/OpenAPI model-selection operation.
- Test surfaces:
  `packages/cli/test/cli/tui/model-metadata.test.tsx` and
  `packages/cli/test/cli/tui/model.test.ts`,
  `packages/cli/test/cli/tui/model-preview.test.tsx`, and
  `packages/cli/test/server/model-selection.test.ts`.
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

## DC-WEBSEARCH-001 — provider-native web search and layered fallback

- 2026-11-04 FC-035 propagation (`main` PR #211): the processor's two patch-part sites gain `written` (and `cleanup` clears the message's write record); the native-search output display in `completeToolCall` is a separate hunk and merges unchanged.
- 2026-11-02 PR #189 propagation: main's FC-013 change bounds background system agents' retries in the `llm.ts` request ladder and as the processor stream policy's final `cap`; both merge without conflict beside this owner's code. The native-search resend before output stays one-shot per stream attempt and outside the ladder's retry count, so a capped system agent makes at most one extra request per attempt and still stops. The native display path in `processor.ts` is untouched.

- 2026-10-30 synchronization: adopt the removal of Xiaomi gateway search (`d0684a3d`) without retiring this owner. No sidecar or provider-specific automatic exposure remains. Keep explicitly configured native search and standalone fallback models; every provider can reach Exa only under `MIMOCODE_ENABLE_EXA` (or the existing experimental alias), and exhausted routes return a no-results/WebFetch hint. Native permission/replay/failure/display contracts remain. Default and Exa-only opt-in runs cover the fallback suite; default registry tests include Xiaomi API/token-plan, OpenAI and OpenCode.

- 2026-10-29 synchronization: upstream `3e92e0d8` stores Xiaomi token-plan credentials under `xiaomi-token-plan-{cn,ams,sgp}` and widens main's sidecar and tool gate to every `xiaomi`/`xiaomi-*` provider, keyed by the model's own provider. Compat keeps its layered chain and applies the same family gate and key to the sidecar; family sessions still skip Exa after the configured fallbacks. Native search, failure marking, replay and display are unchanged. Evidence: the token-plan sidecar and keyless token-plan fallback cases in `test/tool/websearch.test.ts`, family exposure in `test/tool/registry-toolset.test.ts`.

- Status: active
- Canonical owner: `dev/compat` web search
- Added: 2026-10-18 (tenth owner; see the dated record near the top).
- Base: inherited main exposes built-in `websearch` and `codesearch` only
  when Exa is explicitly enabled. The client `websearch` tool calls Exa's MCP;
  it has no Xiaomi gateway branch. Main declares no provider-native search tool,
  although `processor.ts` and `message-v2.ts` persist provider-executed tool parts.
- Contract:
  - Config: top-level `websearch.native` (keys `provider` or
    `provider/model`, the latter wins; `true`, `false` or
    `{ "replay": "native" | "text" }`) and `websearch.fallback` (ordered
    `provider/model` strings or `{ model, variant }`).
  - Native search: `LLM.stream` injects `openai.web_search` (`@ai-sdk/openai`)
    or `anthropic.web_search_20250305` (`@ai-sdk/anthropic`) as provider tool
    `web_search` and removes `websearch` from the active declarations, only
    for non-ephemeral, non-small requests whose resolved tools include
    `websearch`, whose `websearch` rules allow every query (the last all-star rule
    allows and no query-scoped rule after it denies or asks — server search
    bypasses the client tool's ask), and whose
    session × model has no `search` failure. Preflight sizing uses the same
    `LLM.wireTools`.
  - Failure handling (in-process, per session × provider/model/api id):
    4xx naming the search tool type, SDK type-validation errors on server tool
    blocks and pre-output timeouts mark `search`; 4xx naming
    `encrypted_content`/`search_result` mark `replay`; in-band
    `web_search_tool_result_error`/`tool-error` mark `search`. 401/402/429,
    quota and auth errors never mark. A pre-output failure is resent once at
    once (outside the retry budget, ahead of MaxMode's early return); later
    failures reach the processor's existing retry with native already off.
  - Replay: provider-executed `web_search` call/result pairs are rewritten as
    assistant text (query, titles, URLs, no encrypted content) unless the
    request carries native search, the route replays natively and is not
    marked, and the stored result is the provider's JSON. The Anthropic
    tool-call reorder in `ProviderTransform.message` moves only client tool
    calls, keeping a server call ahead of its own result.
  - `websearch` tool chain: each resolvable `fallback` entry
    (`@ai-sdk/openai` model, existing variant) as one standalone Responses
    search returning the answer plus only search-returned sources → Exa only
    when enabled, for every provider → a no-results/WebFetch hint.
    `metadata.servedBy` names the serving layer. The tool is also exposed
    whenever `websearch` config enables native search or lists a fallback;
    this exposure alone never enables Exa. `codesearch` requires Exa enablement.
  - Display: stored output of a provider `web_search` part is a readable list;
    `providerOutput` keeps the raw result for replay. The TUI renders it as
    `Native Web Search "<query>" (N results)`.
- Delta: without a `websearch` block nothing changes. With it, configured
  routes search in-turn on the session model (billed at that model's price),
  and every provider gets the `websearch` tool.
- Source surfaces: `packages/cli/src/tool/websearch/native.ts`,
  `packages/cli/src/tool/websearch/codex.ts`,
  `packages/cli/src/tool/websearch/index.ts`, `packages/cli/src/tool/registry.ts`,
  `packages/cli/src/session/llm.ts` (`run`, `attempt`, `stream` retry ladder,
  `transformParams`, `wireTools`), `packages/cli/src/session/prompt.ts`
  (preflight), `packages/cli/src/session/processor.ts` (`completeToolCall`),
  `packages/cli/src/provider/transform.ts` (Anthropic reorder),
  `packages/cli/src/config/config.ts`, the TUI session route, and
  `packages/sdk/src/v2/gen/types.gen.ts`.
- Test surfaces: `test/tool/websearch-native.test.ts` (config, classification,
  injection, replay, display), `test/session/llm-native-websearch.test.ts`
  (wire payloads, one-shot fallback, MaxMode, replay downgrade, server-call
  order, preflight), `test/tool/websearch.test.ts` (fallback chain, Exa
  fall-through), `test/tool/registry.test.ts` (exposure),
  `test/session/processor-effect.test.ts` (stored display/raw output),
  `test/provider/transform.test.ts` (reorder).
- Evidence (2026-10-18, relay gateway): two-turn probes through the shipped
  SDK versions — Responses `web_search` works on all 10 relay-codex and 6
  relay-grok models; Anthropic `web_search_20250305` works on relay-claude
  but the gateway rejects replayed `encrypted_content` intermittently
  (byte-identical replays of a captured MiMo request fail 6/6; fresh fable
  two-turn probes fail 2 of 6); relay-kimi hangs or streams a malformed
  `server_tool_use`, relay-glm and relay-macaron stream non-standard
  `tool_result` blocks, relay-deepseek silently drops the tool. `mimo run`
  end-to-end (search, then write a file) completes natively on gpt-6-luna,
  grok-4.7, claude-fable-5-1 and claude-opus-5-5, through the Codex layer on
  glm-5.3 and kimi-k3, and through in-turn fallback when native search is
  forced on glm-5.3 (type validation), kimi-k3 (malformed block) and claude
  without `replay: "text"` (replay rejection). The first end-to-end round
  exposed the Anthropic reorder bug (server call moved after its result,
  rejected 400); its fix is covered by the transform and wire-order tests.
- Exit condition: retire when shared `main` offers provider-native search with
  an equivalent opt-in, failure fallback and replay safety, or when the user
  drops the `websearch` config. If propagated to `main`, move the contract to
  the shared registry.

## DC-WEBFETCH-001 — gateway-hosted fetch around the direct fetch

- Status: active
- Canonical owner: `dev/compat` WebFetch routing
- Added: 2026-10-19 (eleventh owner).
- Base: inherited WebFetch (with DC-NET-001's approved private targets) fetches
  only directly from this host. On a host without public DNS or egress it
  cannot fetch any public page, although `websearch` still works there through
  the gateway.
- Contract:
  - Config: top-level `webfetch.hosted` (ordered `provider/model` strings or
    `{ model, variant, max_content_tokens }`) and `webfetch.first`
    (`"local"`, the default, or `"hosted"`). Without the block, routing is
    unchanged. The list does not depend on the session model.
  - Routes: the permission ask for the requested URL always runs first, and a
    rejection ends the call. A `private` destination, or an empty list, uses
    only the direct fetch; the list is checked first, so an empty one costs
    no DNS lookup. Otherwise `first: "local"` tries direct, then each
    hosted entry; `first: "hosted"` tries each hosted entry, then direct.
    A permission rejection, correction or denial raised by the direct route
    (a redirect hop's ask) propagates unchanged under either order, never
    folded into the chained error, so the processor still blocks the turn.
  - Direct-to-hosted switch: only on a transport failure (DNS, connection, TLS),
    a timeout, or a blocking status (403, 407, 429, 451, 502, 503, 504). Any
    other HTTP status is the page's own answer and fails without a hosted call.
  - Destinations (`tool/webfetch-hosted/destination.ts`, compat-only; the
    main-owned `util/ssrf.ts` is unchanged and still unused by WebFetch):
    `private` covers every address that is not globally reachable unicast,
    checked against the IANA IPv4 and IPv6 special-purpose registries (their
    few globally reachable anycast exceptions inside `192.0.0.0/24` and
    `2001::/23` are private too: they serve no pages, and private only means
    direct-only). IPv4: loopback, RFC1918, CGN, link-local, unspecified, IETF
    protocol assignments, the three documentation TEST-NETs, deprecated 6to4
    relay `192.88.99.0/24`, benchmarking `198.18.0.0/15`, multicast, reserved
    and broadcast. IPv6: everything outside global unicast `2000::/3`, plus
    IETF protocol assignments `2001::/23` (Teredo, ORCHID, benchmarking) and
    documentation `2001:db8::/32` and `3fff::/20`; IPv4-mapped, NAT64
    (`64:ff9b::/96`, so DNS64 answers for public names stay public) and 6to4
    addresses are judged by their embedded IPv4 address, and a malformed
    address is private. Plus single-label and local-suffix names, and names
    with any such DNS answer.
    A fake-IP DNS proxy answers every name from `198.18.0.0/15`, so on such a
    host every target is direct-only. Names that fail to resolve, or that the
    resolver has not answered within the call's `timeout`, are `unresolved`
    and may go hosted, because a host without public DNS (or with a stalled
    resolver) is the case this exists for; the lookup itself cannot be
    cancelled and is only ignored past that limit.
    Classification never throws: an unparseable URL is `private`, so the
    direct fetch reports it as before. `assertSafeUrl` cannot be reused for routing:
    it passes loopback and throws on every unresolvable public name.
  - Hosted fetch (`tool/webfetch-hosted/hosted.ts`): one non-streaming request
    per entry with `toolChoice: "auto"` (gateways reject forced choice on some
    models) and no retries, each bounded by the caller's `timeout` when it
    gave a positive one (rounded up to whole milliseconds), else 90 s to allow
    for a model turn. The protocol follows the entry's SDK, not its
    provider name. `@ai-sdk/anthropic` sends `web_fetch_20250910`
    (`max_uses: 1`, `max_content_tokens`, default 30000) and returns the
    `web_fetch_result` text; `@ai-sdk/openai` sends Responses `web_search`
    (`external_web_access` only: a Grok Responses gateway rejects
    `search_context_size`) and returns the answer only when an `open_page`
    action names the URL, prefixed as a model digest. A reply without that
    server result, a result for another URL or naming none, a `web_fetch_tool_result_error`
    (delivered by `ai` as a `tool-error` part), a PDF/base64 source, an
    unresolvable entry, an undeclared variant or any other SDK fails the entry.
    "Another URL" compares scheme, credentials, host, path and query; only URL
    normalization (host case, default port, an empty path) and an `http`
    request echoed as `https` pass. Probes on 2026-10-20: relay-claude
    `web_fetch` and relay-grok `open_page` echoed every request verbatim
    (`http`, trailing slash, bare host); relay-codex `open_page` added the
    root slash and opened an `http` URL over `https`.
    Hosted fetch is never injected into the session request.
  - Output: the tool's normal truncation applies. `metadata.servedBy` is
    `direct` or the entry ref; `metadata.hosted` is `text` or `digest`. When
    every route fails, the error is the first route's own error followed by
    one `- <route>: <reason>` line per later route.
- Delta: hosted entries are billed per fetch, and the page counts again as
  session input. The server follows redirects, so only the requested URL is
  asked; `format` is not honored by hosted results (plain text or digest).
  Gateway results may be cached: a `web_fetch_result.retrieved_at` two days
  old was observed, so a live page is current only through the direct fetch.
- Source surfaces: `packages/cli/src/tool/webfetch.ts`,
  `packages/cli/src/tool/webfetch.txt`,
  `packages/cli/src/tool/webfetch-hosted/{destination,hosted}.ts`,
  `packages/cli/src/config/config.ts`, `packages/sdk/src/v2/gen/types.gen.ts`.
- Test surfaces: `test/tool/webfetch-hosted.test.ts` (config, switch rules,
  route order, result proof, digest label, private bypass, chained errors,
  against a local mock gateway), `test/tool/webfetch-destination.test.ts`,
  plus unchanged `test/tool/webfetch.test.ts` for the no-block path.
- Evidence (2026-10-19, on this compat base): 217 pass, 0 fail across 9
  related files; ten mutants of the routing, classification and proof rules
  are each killed; CLI and SDK typechecks and root lint (0 errors) pass.
  Live relay-gateway probes the same day: Anthropic `web_fetch` returns page
  text on relay-claude models; Responses `open_page` reads the page on
  relay-codex and relay-grok models; relay-glm swaps in a non-standard reader,
  relay-kimi has no server fetch and answers from memory, and relay-deepseek
  and relay-macaron return the call to the client. An end-to-end local build
  on a host without public DNS fetched through the text route, the Grok digest
  route after an unresolvable first entry, and the chain from a Codex session.
- Adoption review (2026-10-20): two corrections on top of the imported change,
  each with a test that fails on the imported code at its assertion:
  `first: "hosted"` had folded a direct redirect's permission rejection into
  the chained error (the processor then kept the turn running), and
  `classify` threw on an unparseable URL despite its never-throws contract.
  PR review then moved the empty-list check ahead of the DNS lookup, bounded
  hosted entries and the destination lookup by the caller's `timeout`,
  required the result's URL and its exact identity, widened `private` to every non-global IPv4 and
  IPv6 address (IPv6 as a global-unicast allowlist),
  and moved the hosted tests onto `testEffect`. With ambient `MIMOCODE_*`
  flags unset: `webfetch-hosted`, `webfetch-destination`, `webfetch`,
  `websearch`, `websearch-native`, `registry`, `registry-toolset`, `config`
  and `permission/next` pass 309/309; the private-bypass, URL-proof,
  missing-URL, caller-timeout, lookup-limit, scheme-downgrade, scheme-upgrade
  and rejection-propagation mutants are each killed; package typecheck exits 0; root lint 0 errors; SDK regeneration
  matches the committed `types.gen.ts`.
- Exit condition: retire when shared `main` offers an equivalent hosted fetch
  with direct-first routing and private-target protection, or when the user
  drops the `webfetch` config. If propagated to `main`, move the contract to
  the shared registry.

## DC-SESSION-001 — one live process drives a session

- 2026-11-04 FC-038 propagation (`main` PR #216): a keyed resend that revives an unseen row places the owner's wake in the accept transaction like an inserted input (`placeWake`).
- 2026-11-04 durable cron delivery: a durable task's fire for another session goes to that session's inbox instead of being refused there, and the lock holder's own turn no longer holds it back (see the Delivery contract); the FC-034 note below describes the state before it.
- 2026-11-03 FC-034 propagation (`main` PR #209): a scheduler started while another process held `.cron-lock` retries it every 30 seconds while idle, start/stop/ticks are serialized, and `permanent` durable recurring jobs are accepted; the cron files are identical on both branches. A durable task whose target session another process owns still goes through the in-process prompt path, which this override refuses (`OwnedElsewhereError`), so that fire is lost: cross-session durable delivery through the inbox is not part of this propagation, and a per-session wake source should stay a session-only cron.
- Status: active
- Canonical owner: `dev/compat` session process ownership
- Added: 2026-10-31 (twelfth owner).
- Base: inherited `main` checks execution ownership by directory and workspace
  only. Run state, the bus and the TUI live in each process's memory, so when
  several `mimo` windows share `mimocode.db`, any process that accepts input
  for a session can start it. A cross-session `actor send` ran the receiver's
  turn inside the sender's process: the receiver's window showed nothing, two
  processes could drive one session, and their concurrent writes raised
  `database is locked`. The actor abandon sweep settled live processes' long
  tool calls as failures.
- Contract:
  - Liveness (`session/process-liveness.ts`): each process holds an exclusive
    SQLite lock on `<data dir>/instances/<instance id>.lock` for its lifetime
    (`locking_mode=EXCLUSIVE` after one write, on the `#db` client, so Bun and
    Node behave alike). Another instance is alive exactly while that lock
    cannot be taken; a probe that takes it deletes the file. No heartbeat or
    expiry: a paused, sleeping or busy process stays alive, a killed one is
    dead at once. The connection is held strongly, because Bun closes an
    unreachable database on collection. Publishing and locking a new lock
    file, and deleting one that probed free, both run under the directory's
    coordination lock (`coordination.db`); a probe that finds a file free looks
    again under it, so a starting process's file is never deleted. Deleting a
    dead instance's file is best effort (Windows refuses while a concurrent
    probe has it open; a later probe deletes it). `release()` closes and
    deletes this process's own lock for a test harness about to delete the
    directory; the test preload calls it after `Database.close()`.
  - Ownership (`session_owner`): every `SessionRunState` entry (through
    `claimExecution`, after instance ownership) and `preparePrompt` (before it
    writes) claim the session for the current process. Another live owner
    fails the call with `OwnedElsewhereError`, naming its pid; a dead owner's
    session is adopted with a compare-and-set. Ownership lasts until the
    process exits.
  - Delivery: inbox accepts stay durable everywhere; only the owner kicks the
    lane. When ownership stops a process (another live owner, or input that
    may not adopt an unowned receiver) it writes an `inbox_wake` row, in the
    accept transaction itself, so a sender interrupted after the commit
    cannot leave input that no process starts. Each
    controller looks at the wakes for its own sessions every 1–1.5 s, kicks the
    lane in the session's own instance, and clears the wake only after that
    run settles (unless it was rung again since), so an owner that exits first
    leaves it for the next owner. A run that settles while input that was
    already waiting when it started is still accepted (it failed before its
    claim, or claimed nothing) rings the lane's wake again; the poller then
    waits out a backoff (1.5 s, doubling to 60 s) before kicking it, counts one
    attempt per round however many runs end together, logs the first retry
    and gives up with an error after eight rounds; a run that leaves nothing
    waiting resets the count. `ringWake` makes each ring strictly later than
    the last, so a wake read before a ring is never cleared by it. Before the first woken lane of a session it
    has not run yet, the controller runs that session's `reconcileOnBoot`, so a
    later first prompt cannot cancel the woken run's claims as crashed work.
    Only the process's current controller (`inboxControllerRef`) takes wakes,
    as only the current scheduler runs lanes. A wake also releases the owner's
    `observeInput` waiters, so remote input reaches an actor wait or retry
    backoff as local input does. The owner announces input messages another
    process wrote (`SyncEvent.announce`: bus events only, no projection) when
    it takes their wake or when a running turn claims them first, once per
    process, so its own TUI shows each delivered message before the reply.
    A woken lane runs with the controller's context, so its Effect logs reach
    the log file rather than the terminal under the TUI. An adoptable lane in
    a process without a scheduler waits for its next run, as before.
  - `actor send` to another session passes `adoptReceiver: false` and reports
    `delivery`: `this_process`, `queued_for_owner` with `owner_pid`, or
    `receiver_not_open` with a hint naming `mimo -s <id>`. Same-session sends
    and internal flows (child notifications, prompts, workflows) keep
    adopting.
  - Durable cron: every fire of a durable task (a task from
    `.mimocode/scheduled_tasks.json`, which any lock holder may fire) is
    written to its session's inbox (`type: "cron"`, receiver `main`), not
    prompted here; a task of another session than the bridge's
    (`createdBySessionId`) never adopts the receiver, one of the bridge's own
    session may. It renders as the in-process fire (`[cron fire @ …] <prompt>`,
    no `<inbox>` wrapper) and its part carries the cron origin, so the TUI shows
    the cron badge. The key `cron:<task id>:<slot>` uses the due time the
    scheduler fired (`StartOpts.onFire`'s `due`), the same in every process for
    a fire not yet recorded, so a slot fired twice is delivered once whichever
    process fires it. Fires for another session are not held back by the bridge
    session's turn (`StartOpts.firesElsewhere`); the bridge session's own tasks
    wait for it to be idle, and its session-only tasks keep the in-process
    path. A sentinel (`<<loop.md>>`, `<<autonomous-loop>>`) in a fire for
    another session is expanded in full every time (`resolveAtFireTime`'s
    `remember: false`): this process never sees that session's compaction, so
    it cannot know the earlier copy is still in its context. A fire is still marked done when handed over: a failed accept (for
    example a deleted session) is logged as `scheduled fire failed`, and that
    one-shot is gone or the recurring task waits for its next slot.
  - A TUI started with `-s <id>` without `--fork` claims that session through
    the worker `claimSession` RPC (`ExecutionOwnership.claimOpened`), so queued
    input starts without a keystroke, but only when the window's directory and
    workspace own the session; a session from another project is not claimed.
  - `sweepAbandonedZombies` skips actors whose instance is alive; the registry
    layer takes the liveness lock before it writes rows naming the process.
  - Write contention: with several processes on one WAL database, a deferred
    transaction that reads before it writes fails at once (`database is
    locked`) when another process commits first, without waiting out the
    busy timeout. Every such transaction this owner adds or relies on starts
    with the write lock (`behavior: "immediate"`): the boot sweep, inbox
    `claim`, `ack`, `withStop`, `abortSession`, `reconcileOnBoot` and
    `cancelLane`, and the prompt's `recordDelivery` and
    `cancelAcceptedPrompt` (`writeAccept` already did). `InstanceBootstrap`
    runs the sweep through `Effect.try`, so a sweep that still fails is logged
    and the boot goes on; a woken lane whose run fails is logged. A TUI refresh
    after `server.instance.disposed` is not fatal: it retries (0.5 s, 2 s,
    5 s), a newer disposal supersedes it, and if every attempt fails the window
    keeps its data and shows an error toast.
- Delta: windows still running an older binary neither claim nor honour
  ownership, so every window needs a restart. Switching sessions inside a
  window claims on the first turn, not on view. Opening a window for a
  receiver nobody has open is not automatic.
- Source surfaces: `packages/cli/src/session/{process-liveness,session-owner,session-owner.sql,execution-ownership,run-state,prompt}.ts`,
  `packages/cli/src/inbox/{controller,inbox,inbox.sql,schema,render}.ts`,
  `packages/cli/src/cron/scheduler.ts` (`onFire`'s slot, `firesElsewhere`),
  `packages/cli/src/session/cron-bridge.ts` (delivery to another session),
  `packages/cli/src/cron/sentinel.ts` (`remember`),
  `packages/cli/src/tool/actor.ts`, `packages/cli/src/actor/registry.ts`,
  `packages/cli/src/storage/index.ts`,
  `packages/cli/src/cli/cmd/tui/{worker,thread}.ts`,
  `packages/cli/src/project/bootstrap.ts`,
  `packages/cli/src/cli/cmd/tui/context/sync.tsx` (dispose refresh only),
  `packages/cli/migration/20261031000000_session_owner/migration.sql`.
- Harness surfaces: `packages/cli/test/preload.ts` (`release()` before the
  data directory is removed) and the `session-owner` focused suite in
  `packages/cli/script/verify-windows-runtime.ts` (entry owned by
  DC-PLATFORM-001).
- Test surfaces: `test/session/session-owner-e2e.test.ts` (two real processes
  over one database file: the turn runs in the receiver, the sender never sees
  that session busy, one model request), `test/session/process-liveness.test.ts`,
  `test/session/session-owner.test.ts`, `test/session/session-owner-prompt.test.ts`,
  the six run-entry cases in `test/session/execution-ownership.test.ts`,
  `test/inbox/session-owner-delivery.test.ts` (including the unclaimed-input
  retry and its backoff), `test/session/cron-inbox-delivery.test.ts`, the
  two cases for another session's task and the fired slot in
  `test/cron/scheduler.test.ts`, the `cron` row case in
  `test/inbox/render.test.ts`, the three `delivery` cases in
  `test/tool/actor-send.test.ts`, the live-instance sweep case in
  `test/actor/registry.test.ts`, `test/actor/zombie-sweep-busy.test.ts` (the
  sweep in one process waits out another process's write lock), the
  throwing-sweep case in `test/actor/abandon-question-bootstrap.test.ts`, and
  `test/cli/tui/dispose-refresh.test.tsx`. Fixtures: `test/fixture/process-owner.ts`,
  `test/fixture/session-owner-peer.ts`, `test/fixture/zombie-sweep-peer.ts`,
  `test/fixture/sqlite-write-holder.ts`, `test/lib/process-owner.ts`.
- Evidence (2026-11-01, PR #183 runtime/tests `501ede28`, pinned Bun 1.3.14,
  ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH` and
  `MIMOCODE_CODEX_MODE` unset):
  - Exact-SHA CI passes: lint, typecheck, and test with all four unit shards
    and the dedicated suites. That dispatch did not set `windows_runtime`;
    the first Windows run, on merge `e332bb94`, failed at teardown (see the
    2026-11-01 note).
  - A local focused run passes 1583 cases, with 2 skips and 8 failures. The
    run covers `test/inbox`, `test/actor`, `test/tool`, and the owner,
    execution-ownership and run-state session files. All 8 failures are the
    `subagent-resume-negatives` "Missing actual prefix captor" cases, which
    pass 8/8 alone.
  - Each guarded rule failed its test when removed, checked against the code
    as it stood when the rule was added:
    - the run-state claim, the prompt claim, the open-time instance check, and
      the sweep's liveness filter;
    - the kick's ownership check, the accept-transaction wake, the wake
      poller, wake retention, first-run reconciliation, and current-controller
      polling;
    - the release of remote waiters, the claim-time and wake-time
      announcements, and the controller logger context;
    - the coordinated second probe and busy detection in liveness;
    - the tool's `adoptReceiver: false`.
  - Removing both the kick check and the run-state claim fails the
    two-process test.
  - Codex review raised ten findings over seven rounds, all fixed; the final
    round on `501ede28` reported none.
  - Six `aistudy` agent windows on build `045168f1` exchanged cross-session
    messages. The display faults they showed are fixed in `71020407` and
    `4543da04`: log lines over the TUI, and a delivered message missing
    until reload.
- Exit condition: retire when shared `main` (or upstream) gains process-level
  session ownership with equivalent delivery, or MiMo runs one process per
  database. If propagated to `main`, move the contract to the shared registry.

### C13 stable candidate verification

Runtime/tests `a10363fe376ad2e4d405c27b6d84128918f6c1e3` passes owning-package typecheck and root lint (3,724 warnings, zero errors). Frozen dispatcher/capture, capped resources, pinned full-context/compaction masks and actual reminder evidence pass ten critical cases; native-search wire integration passes 39 cases, Actor/send passes 55. These overlapping subsets are not a combined total. The full MCP/prompt/prefix subset completes with 102 pass, zero failures and 630 assertions in 223.82 seconds; final exact-SHA CI is recorded above. No SDK, lockfile or public schema changed in C13; the 52 production overlay paths remain the same set as at the initial baseline.
