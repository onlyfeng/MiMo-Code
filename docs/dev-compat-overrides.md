# dev/compat Override Registry

This is the authoritative registry for active behavior owned only by
`dev/compat`. The branch inherits the shared `main` FD/FC registries unchanged;
this file records only the remaining delta from that inherited behavior.

Review this registry whenever work targets `dev/compat` or propagates `main`
into it, including when a listed surface merges without conflicts. A pure
registry/history commit does not advance either behavior reference below.

## Current review record

- Last reviewed: 2026-11-28. Audited `4b029a9b4cf838f72ecb729345ddf10d8cef9ad0..f8b87f631277fc99f956740f7c83122132f87d3e`, upstream pull requests #2873 through #2879 (stateless Responses reasoning grouping, opt-in dream and distill documentation, version 0.1.18, test isolation). The prior compat tip included the publication record for the previous sync.

- Scope: C01–C06 (N=6). See [the shared synchronization record](upstream-sync-2026-11-28-f8b87f63.md).

- Starting main: `ba999dda14cf214a3dab04ad719657e900d4c6fb`. Starting compat: `ca28595bddfbbf3328edbd97776af8357cb2db78`. Main runtime snapshot: `4bde16cd18bff0ddb5ac35cf2531e6459461e6e2`. Compat runtime snapshot: `5f6366209212dfefbfc7516a3430323281ac02e7`.

- Result: inherit every capability through a clean merge; the compat merge brings in exactly the paths of the main synchronization delta. DC-WEBSEARCH-001's Anthropic reorder and its `transform.test.ts` cases are a separate hunk from the reasoning `itemId` exemption, and the compat overlay lines in `transform.ts`, `transform.test.ts` and both README files are unchanged. DC-SESSION-001's `inbox/controller.ts` and `sync/index.ts` additions are untouched by the inbox and sync test isolation. All DC owners are unchanged.

- Validation: CLI typecheck passes and root lint reports zero errors. On Bun 1.3.14, the affected matrix passes 81 files and 1,078 tests (one process per file), and upstream's shared-process leak combination passes 49/49. See [the shared record](upstream-sync-2026-11-28-f8b87f63.md#local-validation); exact-SHA CI is recorded in its publication section.

Earlier review records and dated propagation notes (75 sections, dated 2026-09-09 to 2026-11-06) moved verbatim to [the compat history](dev-compat-registry-history.md#2026-11-07-registry-normalization). They record past decisions; the DC entries below and the current review record above are the live contract.

The dated notes that entries still carried through 2026-11-26 (155 notes) and the undated per-review logs (`POLICY-02`/`POLICY-03`/`POLICY-04 review`, 23 bullets) moved verbatim to [the compat history](dev-compat-registry-history.md#2026-11-26-registry-consolidation-dc-dated-notes). Rules from them that are still in force were folded into each entry's fields ("Carried rules" where no existing field fit). Later reviews add new dated notes at the top of an entry; a later consolidation folds them the same way.

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
| DC-BUILD-001 | Local version in the CLI, user agent and persisted session | Compat extends FC-052's embedded build time | Keep the same timestamp for the lifetime of a local binary |
| DC-RESOURCE-001 | `ripgrep` config, rg arguments and run timeout in `ripgrep.ts`, TUI `fps` and `rendererConfig` | Compat-only opt-in limits; unset keeps the inherited behavior | Preserve unset-means-inherited; retire for an equivalent upstream setting |

Retired identifier: DC-PROVIDER-001 moved to shared FC-053 on 2026-11-07 and is not reused; its last compat entry is kept verbatim in [the compat history](dev-compat-registry-history.md#2026-11-07-inherit-fc-053-and-the-fc-008-ci-alignment).

## DC-BUILD-001 — local build version

Commit `70aac89e` uses FC-052's embedded UTC build time to distinguish local
builds. A binary built with version `local` reports, for example,
`local-20260102T030405Z` for its entire lifetime. Published versions retain
their supplied value. A source run with no build metadata reports `local`.

The CLI's `--version`, the installation user agent and new sessions all read
`InstallationVersion` from `packages/cli/src/installation/version.ts`.
Existing sessions retain the version recorded at creation. The startup log
also carries FC-052's commit, dirty status and full build time. The local
version contract can move to FC-052 if shared `main` adopts it.

`packages/cli/test/installation/build-provenance.test.ts` exercises the CLI
entry point, user agent and persisted session using build-time definitions.

## DC-RESOURCE-001 — opt-in local resource limits

Commit `90aac15f` adds two opt-in settings for machines that run many TUI
sessions at once. Both are unset by default, so the inherited behavior is
unchanged until a user sets them.

- Status: active
- Canonical owner: `dev/compat` local resource limits
- Base: inherited `main` runs each ripgrep process with ripgrep's own thread
  heuristic (CPU count, at most 12) and no time limit, and renders the TUI at
  fixed rates: 60 frames per second, or 10 for animation and 15 for on-demand
  redraws in a plain terminal.
- Overrides:
  - `ripgrep.threads` and `ripgrep.timeout` (milliseconds) in the main config.
    `Ripgrep.search` and `Ripgrep.files`, and `tree` through it, pass
    `--threads=<n>`. A run that outlasts the timeout fails with a
    `RipgrepTimeoutError` naming the setting; failing the run closes its scope,
    which ends the rg process. The limit covers the rg run only, not
    provisioning a ripgrep download. The limits are read at call time through
    `Effect.serviceOption(Config.Service)`; without a Config service, as in unit
    tests, ripgrep keeps its defaults. The no-rg listing fallback of
    DC-PLATFORM-001 is not affected.
  - `fps` in the TUI config sets both opentui rates: `targetFps`, which drives
    continuous animation, and `maxFps`, which throttles on-demand redraws such
    as streaming output. A plain terminal keeps its fixed rates unless `fps` is
    lower.
- Delta: these settings bound per-process parallel reads, run time and render
  rate. They are not a path filter; search-scope policy stays with project
  plugins and ignore files.
- Compatibility: the main config is strict, so a binary without this entry
  rejects a config that sets `ripgrep`, both at startup and on a later model
  refresh. Install a binary that has the entry before adding the key. A binary
  without `fps` warns and ignores the whole TUI config file that sets it.
- Source surfaces: `packages/cli/src/config/config.ts` (`ripgrep` block),
  `packages/cli/src/file/ripgrep.ts` (limit helpers, `filesArgs`, `searchArgs`
  and the `files`/`search` timeout), `packages/cli/src/cli/cmd/tui/config/tui-schema.ts`
  (`fps`), `packages/cli/src/cli/cmd/tui/util/frame-rate.ts`,
  `packages/cli/src/cli/cmd/tui/app.tsx` (`rendererConfig`) and the generated
  `packages/sdk/src/v2/gen/types.gen.ts`.
- Test surfaces: `packages/cli/test/file/ripgrep-limits.test.ts`,
  `packages/cli/test/cli/tui/frame-rate.test.ts` and the `fps` case in
  `packages/cli/test/config/tui.test.ts`.
- Required decision: preserve unset-means-inherited for both settings. Review
  `filesArgs`/`searchArgs` when upstream changes rg arguments and
  `rendererConfig` when it changes renderer options. If upstream adds its own
  ripgrep limits or TUI frame-rate option, adopt it and retire this entry.
- Evidence: on Windows with Bun 1.3.14, `bun run typecheck` in `packages/cli`
  passes. The new and affected suites (`test/file/`, the frame-rate and TUI
  config tests, the grep, glob, skill and skill-search tools, `test/server/`)
  report 450 pass and 2 fail. Both failures are
  `test/file/path-traversal.test.ts` cases that assert POSIX system paths and
  fail identically on the unchanged `dev/compat` tree. `test/config/`: 199 pass,
  0 fail. `c224afaf` seeds 1000 files so the 1ms timeout case cannot race a
  coarse Windows timer; it passed five consecutive runs.
- Binary evidence (2026-11-25, a local single-target build of this branch with
  FC-056 merged, run with an isolated home and data directory): with
  `ripgrep.timeout: 50`, `mimo debug rg search` over a repository checkout
  stopped with `RipgrepTimeoutError` naming `ripgrep.timeout`; with
  `threads: 2, timeout: 60000` and with no block it completed. The previously
  installed binary, which lacks this entry, refused the same config at startup
  with `Unrecognized key: "ripgrep"`, which is the upgrade-order hazard recorded
  under Compatibility.

## DC-NET-001 — approved private-network WebFetch

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
- Carried rules: the inherited classifier checks every DNS answer
  (`lookup` with `all: true`, FC-010) and fails closed on mixed or empty
  answers; compat WebFetch still does not call it, so this owner's behavior is
  unchanged by that hardening.
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
- Exit condition: retire or narrow this override only after a shared,
  operator-controlled private-network authorization mechanism preserves
  required intranet access while retaining per-hop permission and resource
  controls.

## DC-NET-002 — RFC1918 remote HTTP(S) MCP reachability

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
- Review basis: inherited main
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
- Evidence: MCP 生产源码沿用已接受 main，compat 自有准入 sentinel 不改变该生产路径。`289f6316` 的独立 sentinel 为 1 pass / 2 assertions；同源码 loopback MCP 通过，自有 RFC1918 接口实际 OAuth/MCP 为 1 pass / 2 wrapper assertions。用户选定本机隔离服务，不接企业环境；企业 IdP、代理、DNS/TLS 和企业 MCP 不在本轮范围。协议步骤、取消边界和固定执行来源见 [RV02](compat-runtime-validation-2026-09-15.md#rv02本机隔离-mcpoauth-与私网接口)。历史条目中的 mock-only 说明保留其原日期范围。Status 与既有 exit condition 均不变。
- Exit condition: any future `main` private-address MCP classifier triggers a
  fresh policy review and, if intranet access remains required, a minimal
  compat-only production override. Retire the test owner only when the shared
  contract explicitly guarantees the same reachability.

## DC-PLATFORM-001 — restricted-network and Windows ripgrep/archive fallback

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
- Carried rules: the Windows runtime entry is
  `packages/cli/script/verify-windows-runtime.ts`; it reaches
  `src/util/process.ts` through `test/fixture/windows-archive-runtime.ts`, so
  compat lists it in `tsconfig.scripts.json`'s `exclude` (that project has no
  `@/` mapping) while `packages/cli/tsconfig.json` still checks it. The shared
  `windows-runtime` job runs on each push to `dev/compat` that changes more than
  `docs/` and on dispatch with `windows_runtime: true`, never for a pull
  request; a compat branch that changes `ripgrep.ts`, `archive.ts` or the
  Windows entry dispatches `test.yml` with that input for pre-merge platform
  evidence. The entry also runs DC-SESSION-001's `session-owner` suite
  (`process-liveness` and `session-owner` tests) and records
  `src/session/process-liveness.ts` in its source hashes. `ripgrep.ts` also
  carries DC-RESOURCE-001's opt-in `ripgrep.threads` and `ripgrep.timeout`,
  which apply only to spawned rg runs; the no-rg listing fallback, archive
  extraction and their fail-closed boundaries are unchanged by them.
- Review basis: inherited main
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
- Evidence: `289f63163e71a0c058ece11ff16755efeb1c6879` 的 [Windows run 34958196675](https://github.com/onlyfeng/MiMo-Code/actions/runs/34958196675/job/104345235279) 在 Windows Server 2025/Bun 1.3.14 上执行实际生产 `powershell`/`.NET ZipFile`：11 个解压场景全部通过，8 个选定 no-rg 用例通过且共有 15 次断言、0 选中项 skip；JUnit 另有 15 个筛选排除项，不计为通过。工件的 Windows CRLF 源文件 hash 与该提交 Git blob 的 CRLF 转换逐一对应。三个平台生产源在后续插件测试修正 `3bd11622` 上不变，此后 PR 候选 `b7e3f850` 的实际 Windows run `34965350598` 也通过同一 11/8 矩阵；其 PR merge checkout 与 head 树、源码 hash 已单独核对，不能把该 Windows 成功当作 scoped-fixture 修正后的验收。完整环境、事件/checkout 身份及覆盖边界见 [RV03](compat-runtime-validation-2026-09-15.md#rv03真实-windows-解压与-no-rg)。POSIX symlink/权限项、移除 Archive 模块的环境与企业限制镜像均未被计入；不声称整个 ZIP 解压具备事务回滚。Status 与 keep-compat-only exit condition 均不变。
- Exit condition: keep this entry compat-only; it is not proposed for `main`.
  Reconsider only when the supported deployment can reliably provision the
  shared binaries, or upstream supplies equivalent fallbacks with the same
  fail-closed boundaries.

## DC-MODEL-001 — per-agent MaxMode

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
- Carried rules: compat inherits FC-013's retry policy unchanged
  (`session/retry.ts`, `config/retry.ts` and the processor's empty-output
  classification are identical on both branches): persistent server and
  rate-limit live-step recovery, and the bounded `retry.emptyOutput` budget for
  pure-empty output. The per-agent `maxMode` schema is carried by the generated
  v2 SDK types. Pin-winner selection follows main; compat's tools hash also
  binds loaded MCP membership, so a concurrent cold pin is adopted only when it
  froze the same tools, otherwise the loop rotates to its own. MaxMode routing
  reads the resolved prefix and is not on that path.
- Review basis: inherited main
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
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
  retains its existing limits; skill catalog reminders remain bounded at 50 KiB.
  Historical capped v2 snapshots and capped system-tail catalogs are removed
  only as recognized generated content, preserving loaded skill bodies and ordinary text. Stable `{current_session_id}` memory instructions
  are counted without being rewritten before filesystem-tool execution.
  Request preflight accounts for system/messages, treats current-turn context
  as unshrinkable, includes only active tool schemas, and uses the inherited
  effective window, including `MIMOCODE_COMPACTION_MAX_CONTEXT` and the
  upstream ratio trigger. The estimator serializes complete active tool
  schemas with JSON.stringify; the former 80 KiB estimation-only cutoff is
  removed. Repeated object references are counted as serialized occurrences.
  Image attachments are sized from their pixel dimensions in the full request,
  the measured tail and the recovery floor. Checkpoint tail and writer window
  estimates use the same image allowance for stored and rendered attachments.
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
  The checkpoint-coverage operation and schema are asserted on the runtime
  OpenAPI document and carried by the generated v2 SDK; the committed snapshot
  is gone since upstream `698f0f29`.
- Skill catalog cap: since the catalog became persisted user-turn reminders
  (FC-005), the 50 KiB cap lives in `renderSkillCatalogReminder`
  (`session/skill-reminder.ts`). The `<available_skills>` body of an entry, and
  of an update's added or changed skills, is head-capped with the existing
  marker while the reminder wrapper and closing tag stay intact, and the
  metadata records the whole announced state. Main's `getFrozen` cleanup removes
  a system-tail catalog only when it ends at `</available_skills>`; a compat row
  frozen with a capped catalog ends at the truncation marker, so compat's
  `LEGACY_SYSTEM_CATALOG` (`skill-catalog.ts`) ends a block at whichever
  terminator comes first. Main's v2 recognizer accepts every engine-generated v2
  snapshot without a `<skill_content` body and checks the schema-2 hash only when
  one is stored, which compat's hash of its capped output satisfies.
- Bounded agents and the writer: request preflight skips bounded computation
  agents (`!isBoundedComputation`), the checkpoint writer among them. Their
  provider-signalled overflow is terminal (FC-021), so compat's `runStep` writes
  no overflow-recovery placeholder for them (a `MessageAbortedError` would
  misclassify the failure and `recoverOverflowPlaceholder` would resume it);
  every other agent keeps the placeholder, its exact-message classification and
  the no-progress and two-recovery limits, and the `"overflow-static"` break
  precedes the bounded-overflow break. A no-fork writer's delta is sized by
  FC-036's rendered-request check, the only window bound before a writer
  request, and compat's `turnContext` is kept on both the no-fork writer
  context and the parent-view fork. The writer task and `actor.preStop`
  re-prompts reach the writer as plain user text, so the 50 KiB caps do not cut
  its CURRENT FILES block, which `CURRENT_FILE_CHAR_LIMIT` bounds instead.
  Run-loop agent resolution uses `resolveStoredAgent`, so a retired stored agent
  name keeps preflight and bounded-computation policy on the default agent.
- Cap and replay details: completed Bash output with `truncated: true` and a
  non-empty archived `outputPath` replays as a head+tail slice within the same
  50 KiB cap, keeping the tail and the full-output pointer; other tools and
  unarchived Bash keep head slicing. HTTP title limits stay; locale has no
  schema length cap, and the automatic `ensureTitle`-to-`genTitle` input has no
  unified cap. UTF-8 truncation fits its omission marker and separator inside a
  positive byte budget, falling back to a bounded prefix when the marker cannot
  fit, and actor state respects tiny positive token budgets; wrappers remain
  additional bytes, so the caps are not a strict total wire bound. The memory
  paths reminder is not format-gated: JSON-schema requests receive it too, and
  they can recover the structured result from a completed StructuredOutput part.
- Subcontracts with separate retirement conditions (not one product policy):
  content caps and serialization; request estimation and the current-turn
  recovery floor; compat checkpoint coverage over a shared logical tail; legacy
  active-tool snapshot reads; structured-output replay. Message chronology,
  idempotent admission and callable generated examples are shared contracts
  now. Request preflight is heuristic and runs only when its gates allow:
  `compaction.auto=false`, unknown context capacity and hidden native bounded
  agents bypass it, and provider conversion or later `_noop` insertion can
  change the wire shape. No exact provider-token or universal request-fit
  guarantee is claimed.
- POLICY-04 additional surfaces: `packages/cli/src/session/skill-catalog.ts`,
  `packages/cli/src/session/skill-reminder.ts`,
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
  `test/session/skill-catalog-compat-projection.test.ts` (capped historical v2,
  marker-bounded system-tail strip, capped entry and update reminders) and
  `test/session/skill-catalog-compat-capture.test.ts` (a pin-winner capture
  projects the stored v2 snapshot into neither view) cover the skill catalog
  cap. The active and auto-disabled `request preflight handles a large ... MCP
  schema` cases opt out of MCP deferral so their preflight still sees the
  directly exposed 1 MiB schema.
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
- Exit condition: retire the supported cap/preflight overlay only when shared
  `main` provides equivalent behavior without weakening FD-002 delivery.
  F04 now counts complete active schemas and terminates unserializable preflight
  requests. Universal non-throwing replay serialization, exact provider-token
  accounting and a strict total wire bound remain outside that guarantee.

## DC-ACTOR-001 — full-context actor and static-prefix overflow extensions

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
- Carried rules: compat owns the complete model-facing `none`/`state`/`full`
  context schema and the `lifecycle` selector as strict JSON fields, persistent
  creation, bounded state capture and the frozen `turnContext`; main creates
  only none-context ephemeral model actors and keeps the shared FD-009
  full-context runtime. Valid recovered values are preserved, malformed or
  conflicting copies are rejected, and runtime- and model-created persistent
  actors keep recovery coverage (the shell and no-script recovery surfaces
  retired with FC-018 on 2026-09-24). `PrefixCaptureResult` carries the
  compat-only `turnContext`; captures and compaction read the row through
  `SessionPrefixSnapshot.getFrozen`, keeping `active_tools` restoration, loaded
  MCP identity in the tools hash, `turnContext` and the current-turn
  projection, and a winning cold pin's system and tools are adopted as on main.
  Real HTTP tests keep the original `turnContext` bytes once in append and
  replace-agent modes after live parent and receiver updates, including
  isolated peers. `actor send` signs with the lane actor id (FC-031) and keeps
  compat's `delivery` field; nested subagent sends go only to the registered
  parent, and exec send/status share the original authority under
  `capStateContext` and UTF-8 limits. Both writer modes run as the
  `checkpoint-writer` actor of a child session created before the spawn and get
  the CURRENT FILES block after the frozen prefix; where a forked writer's
  frozen tools still list `task`, the per-tool runtime whitelist in `prompt.ts`
  rejects the call, so the writer cannot change task state.
- Review basis: inherited main
  `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`; compat behavior
  `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef`.
- Evidence: the full-context actor suite covers inherited system/tool/permission
  membership, frozen parent turn context/system/cwd, actor-scoped replacement,
  default and explicit checkpoint modes, and bounded state; overflow tests
  distinguish recoverable message pressure from `overflow-static`, while prompt
  tests prove the latter terminates with a stable diagnostic rather than
  repeatedly compacting.
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
- Carried evidence: parent same/different-model forwarding, explicit over
  agent and parent priority, unsupported configured values, provider-aware
  group selection and metadata consistency are covered; a real group-selected
  child persists the configured variant and sends its reasoning effort on the
  wire. Since upstream `c9c91d7b` offers only declared reasoning levels, the
  fixtures declare the levels they select.
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

- The preview endpoint owns its request and response schemas. It calls the shared FC-023 prompt resolver in `session/model-selection.ts`.

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
- Carried rules: `ModelMetadata` is the authoritative footer display, so
  upstream's `currentProviderLabel` row stays absent and compat keeps its
  `flexShrink={0}` agent label. Prompt metadata previews come from
  `POST /experimental/model-selection`, the server resolver that user-message
  creation uses: the TUI sends its selected model, agent and explicit variant,
  previews never update the selected variant store or delay submission, pending
  and failed previews show `resolving` and `unknown`, `none` needs a successful
  response without a named variant, late responses for replaced requests or
  disposed components are dropped, and a preview carries the submitting
  session's workspace. The preview reads `variant.current()`, so it shows a
  resumed variant (FC-030), and submission sends that same value. Compat creates
  user messages through `SessionModelSelection.resolve`, whose fallback
  continues the last user message's model and variant only when neither the
  input nor the agent names a model and the model still offers the variant
  (FC-023); a preview always names the TUI's model and never reaches that
  fallback.
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
- Known limits: a preview describes ordinary prompt selection at resolution
  time, not a reservation of future configuration. Shell and commands with
  their own agent/model overrides use separate execution paths. An older
  attached server without the preview endpoint displays an unknown variant
  instead of falling back to client inference. Subagent metadata continues to
  describe persisted requests.
- Exit condition: the client inference portion is removed by the server
  resolver correction. Retire the remaining compat presentation/API overlay
  when shared `main` exposes the equivalent preview and metadata display.

## DC-WEBSEARCH-001 — provider-native web search and layered fallback

Configured fallback search and hosted WebFetch entries use `tool/web-model.ts`
to parse literal provider/model references, check supported SDKs and variants,
and apply provider, model and variant options in that order. Each tool owns its
route eligibility, permissions, result validation and retry behavior.

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
- Carried rules: the Xiaomi gateway search sidecar is gone (upstream
  `d0684a3d`) and no provider-specific automatic exposure remains; this owner
  keeps explicitly configured native search and standalone fallback models.
  Every provider reaches Exa only under `MIMOCODE_ENABLE_EXA` (or its
  experimental alias), and exhausted routes return a no-results/WebFetch hint.
  The native-search resend before output is one-shot per stream attempt and
  outside the request ladder's retry count, so a capped background system agent
  (FC-013) makes at most one extra request per attempt and still stops.
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

A failed lock probe keeps the session with its current owner. A missing lock
or a confirmed free lock permits adoption. Reclaiming a free lock requires a
second probe under the directory's coordination lock. An unavailable
coordination database defers adoption until a later attempt.

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
- Carried rules: same-process live-claim shielding and monotonic claim run ids
  (FC-001) do not authorize a process to run another process's session:
  ownership checks, immediate transactions, current-controller wake checks and
  recovery guards remain. True orphan recovery keeps FC-024's consumed
  outcomes, and a stop-fenced run with no remaining claim interrupts. A keyed
  resend that revives an unseen row places the owner's wake in the accept
  transaction like an inserted input (`placeWake`, FC-038).
- Exit condition: retire when shared `main` (or upstream) gains process-level
  session ownership with equivalent delivery, or MiMo runs one process per
  database. If propagated to `main`, move the contract to the shared registry.

### C13 stable candidate verification

Runtime/tests `a10363fe376ad2e4d405c27b6d84128918f6c1e3` passes owning-package typecheck and root lint (3,724 warnings, zero errors). Frozen dispatcher/capture, capped resources, pinned full-context/compaction masks and actual reminder evidence pass ten critical cases; native-search wire integration passes 39 cases, Actor/send passes 55. These overlapping subsets are not a combined total. The full MCP/prompt/prefix subset completes with 102 pass, zero failures and 630 assertions in 223.82 seconds; final exact-SHA CI is recorded above. No SDK, lockfile or public schema changed in C13; the 52 production overlay paths remain the same set as at the initial baseline.
