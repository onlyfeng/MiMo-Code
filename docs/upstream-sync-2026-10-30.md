# Upstream sync 2026-10-30: compaction outcomes and explicit search

## Scope and immutable baselines

Full live sync authorized by `同步 upstream 更新`: upstream/main → fork main → fork dev/compat.
Selected upstream `ee0a93b5dff36f689e28957b2e4377159a9a9731`; prior review `3e92e0d8f0308603180ad03dbc67828c94c09ec4`.
Starting main `4a1c42148765755fba39d80103a76879965b8a7f`; compat `df002b3d6e4fe43b5eb6dbfa5b5ec57a6870ab20`.
Both remotes were refreshed with branch-only, no-tag fetches; upstream is read-only.
Original compat checkout has untracked `.omo/`; it and the unrelated documentation branch are protected.
Operation resources: dedicated Git worktrees and local branches `sync/upstream-20261030-main` and `sync/upstream-20261030-compat`, operation-only Bun/node-gyp links and external validation logs. No remote temporary branch or PR.

## Capability inventory (N=3)

Immutable audit range `3e92e0d8..ee0a93b5`: three upstream commits and 21 changed paths. Shared owners live on main. All active FD/FC and eleven DC entries were checked against this delta, including clean merges. No owner retires or moves; only FD-005's now-removed sidecar clause retires.

| ID | Selected behavior, paths/producers/tests | Main counterpart, relationship and disposition | Compat counterpart and disposition | Owners and decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | `2491aae5`: `session/compaction.ts` process progress and failure/interruption cleanup, boundary model for summary/prefix/tail, `create` returns its message ID; summarize route validates the model before a boundary and accepts only a persisted projection. Incoming `prompt-effect` and `summarize-route-outcome` tests; `docs/compose/spec/compaction-failure-cleanup.md`. | Adapt rather than replace the already-owned route: HTTP still calls `SessionPrompt.startSummarize`, which keeps the main runner, main-slice agent/task and conditional atomic `createIfLatest`. Cleanup spans boundary creation and loop; projection validation wraps completion, including its cancellation fallback. `onCreated` observes boundary identity separately from `onUserCommitted`, so observation cannot hide pending input or change turn ownership. Keep atomic summary `createMessage`, reasoning acceptance, one empty retry, `toolChoice: none`, frozen membership, external admission and chronological tails. | Inherit shared behavior. `compaction.ts` retains DC-CONTEXT-001 active-only frozen tools and tail sizing; no new compat compaction implementation. Existing DC-ACTOR-001 preflight remains. | FC-001/FC-002/FC-009/FC-015; FD-001/FD-005/FD-009/FD-010/FD-011/FD-012; DC-CONTEXT-001/DC-ACTOR-001. Real HTTP covers unknown model, exhausted rollback, cancellation and success; real DB admission regression proves pending user visibility and exact boundary identity. Prompt compaction cases cover interruption, missing old model, permissions, tails and concurrency. |
| C02 | `d0684a3d`: delete Xiaomi `tool/websearch/mimo.ts` sidecar and provider-specific automatic exposure; `registry.ts` gates Exa search tools explicitly; `websearch/index.ts` is Exa-only on main. README translations, `mimocode-docs/reference/guide.md`, remove-search spec and credential-split spec explain setup. `read.ts` drops the stale mirror comment. | Adopt; remove obsolete sidecar tests and the FD-005 sidecar clause, preserving harness resolution. All providers including `opencode` and `xiaomi-*` get neither Exa tool without explicit enablement. No provider transport, credential placement or family consumer changes. | Adapt DC-WEBSEARCH-001: remove sidecar/import/key lookup and the family Exa exclusion; retain configured native exposure, standalone Responses fallback models, permissions, failure marking, replay and display. Configured fallback → Exa only when enabled → no-results/WebFetch hint, for every provider. `codesearch` always requires Exa enablement. | FD-005, FC-011; DC-WEBSEARCH-001. Registry-toolset checks four providers by default; registry/native and LLM-native suites retain configured exposure and replay. The fallback suite is run both without selectors and with only `MIMOCODE_ENABLE_EXA=1`, checking token-plan and ordinary fallback behavior. DC-NET-001/DC-NET-002/DC-WEBFETCH-001 retain destination/permission bounds; the other DC owners have no incoming owned behavior change. |
| C03 | `ee0a93b5` plus guidance in `d0684a3d`: bundled deep-research skill/sources and `workflow/builtin/{deep-research,fact-check}.js` use available search or search MCP; fall back to DuckDuckGo HTML through WebFetch when unavailable. | Adopt shipped content unchanged; no new tool authority. Existing skill discovery, workflow validation/lifetime and WebFetch permission boundaries remain. | Inherit; no compat override. | FC-005/FC-008/FC-010/FC-011. Skill builtin/mimocode-docs and workflow builtin tests plus source-text review. This proves content/integration, not a live DuckDuckGo or third-party API availability probe. |

The complete upstream path set is covered above. No SDK/OpenAPI request or response schema changed, so no generated artifact regeneration is required; OpenAPI reference tests run on both trees. The compat production overlay path set under packages remains 54, identical to the starting branches.

## Validation

Final runtime/test snapshots: main `f9ef3fcc5c4d8256f4805ea60897911f1753b6bf`; compat `cd1fdc8de0b6eba7363dde88a4ea1bc191e04841`.
Bun 1.3.14; locked dependencies installed independently with `bun ci`, with the bundled npm node-gyp on the operation PATH. No lockfile or dependency manifest changes.
Every ambient `MIMOCODE_*` variable is removed for default validation. Package preload retains isolated HOME/XDG, model fixture, disabled default plugins and in-memory DB; it enables no experimental selector. An isolated non-test process with selectors removed reports experimental=false and Exa=false. The Exa opt-in run adds only `MIMOCODE_ENABLE_EXA=1`.

Initial affected matrices (source trees before the final admission-observer correction; unchanged search/compaction contracts reused below):

| Branch | Matrix | Result |
| --- | --- | --- |
| main | 13 files: compaction-agent-scope/tool-choice/reasoning-fallback/projection, skill-catalog-system-tail, run-approval, registry-toolset/registry/harness-alias, skill builtin/mimocode-docs, workflow builtin, openapi-refs | 83 pass / 0 fail / 0 skip; 532 assertions; 142.49 s |
| compat | Same plus websearch, websearch-native, llm-native-websearch, summarize-route-outcome/main-slice | 138 pass / 0 fail / 0 skip; 720 assertions; 155.65 s |
| compat opt-in | websearch fallback suite with only Exa enabled | 7 pass / 0 fail; 23 assertions; 43.94 s |

Final compaction/admission matrix: `bun test test/session/prompt-effect.test.ts -t 'compaction|boundary observation' --timeout 120000` on the final source snapshots: main 19 pass / 202 filtered / 0 fail, 173 assertions, 89.06 s; compat 23 pass / 230 filtered / 0 fail, 197 assertions, 100.96 s. These include the new pending-input boundary observation regression. Mutation proof: making `onCreated` enable hidden-queue filtering fails that regression (0 pass / 1 fail); restoring the committed source passes (1 pass / 0 fail, five assertions). A Git diff confirms source/tests are byte-identical to the final source snapshot after restoration. Final HTTP outcome matrix: four pass / zero fail / 26 assertions on each branch (main 14.98 s; compat 12.80 s). Final package `bun run typecheck` exits 0 on both branches. Initial local lint has zero errors (main 3,692 warnings; compat 3,777); final exact-SHA lint/typecheck/test CI also passes (below). The exploratory prompt/HTTP run completes with 221 pass / two skip / one known fixture failure (621.65 s): it initially included the unadapted single-empty HTTP fixture. That failure is retained in the log, not counted as a passing matrix. The corrected route suite queues two empty responses under FD-012 and separately passes on both branches, including cancellation.

Logs use prefix `mimo-sync-20261030-` outside the checkouts, with branch suffixes `main`/`compat` and `matrix`, `compaction-final`, `route-final2`, `type-final2`, `lint` and `exa`.

## Exact-SHA CI and publication

All six final-source workflows succeed on their first attempts. No same-SHA rerun is used. The earlier source publication (`51500fc9`/`ceac9f14`) is superseded by the admission-observer correction; its test workflows were cancelled by the new push and are not final evidence.

| Branch / source snapshot | lint | typecheck | complete test |
| --- | --- | --- | --- |
| main `f9ef3fcc5c4d8256f4805ea60897911f1753b6bf` | [40985024247](https://github.com/onlyfeng/MiMo-Code/actions/runs/40985024247) | [40985024253](https://github.com/onlyfeng/MiMo-Code/actions/runs/40985024253) | [40985024216](https://github.com/onlyfeng/MiMo-Code/actions/runs/40985024216): nine successful jobs; Windows skipped as configured |
| compat `cd1fdc8de0b6eba7363dde88a4ea1bc191e04841` | [40985025287](https://github.com/onlyfeng/MiMo-Code/actions/runs/40985025287) | [40985025370](https://github.com/onlyfeng/MiMo-Code/actions/runs/40985025370) | [40985025288](https://github.com/onlyfeng/MiMo-Code/actions/runs/40985025288): all ten successful jobs, including [Windows runtime and launcher](https://github.com/onlyfeng/MiMo-Code/actions/runs/40985025288/job/123834188874) |

Both source tips are published only to `onlyfeng/MiMo-Code`. Fresh refs immediately before the documentation publication remain upstream `ee0a93b5`, main `f9ef3fcc`, compat `cd1fdc8d`. The shared FD/FC records, history and this report are main-owned and inherited unchanged; the DC review is compat-only. Documentation-only descendants start no workflow and reuse the source-SHA CI above only with these final-publication checks:

```sh
git diff --quiet f9ef3fcc5c4d8256f4805ea60897911f1753b6bf origin/main -- . ':(exclude)docs'
git diff --quiet cd1fdc8de0b6eba7363dde88a4ea1bc191e04841 origin/dev/compat -- . ':(exclude)docs'
git merge-base --is-ancestor upstream/main origin/main
git merge-base --is-ancestor origin/main origin/dev/compat
git ls-remote origin refs/heads/main refs/heads/dev/compat
```

The final execution receipt records the documentation tips and refresh/ancestry results. Local main/compat are advanced only by safe fast-forward. Scoped cleanup verifies the two operation worktrees are clean and integrated before removing them and their local branches; operation executable links are removed, external logs remain, and `.omo/` plus unrelated branches are preserved. No runtime upgrade or local binary delivery is claimed by this source synchronization.
