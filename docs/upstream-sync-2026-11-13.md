# 2026-11-13 upstream synchronization

## Scope and immutable baselines

Full synchronization authorized by the upstream-update request, with live branch-only fetches from both remotes and propagation through upstream/main, fork main, and dev/compat. Upstream is read-only.

Code integration and publication are complete through the selected upstream. Local affected verification passes. The synchronization's CI acceptance remains blocked by GitHub Actions being disabled; this record does not claim successful exact-SHA CI or a full-suite pass.

- Selected upstream: `c9c91d7b6fff20164629475218fa0a58e16d14b8`.
- Previous upstream ancestor: `26d1f3a601ab29533a2eaf787895236b92c9aed7`.
- Starting main: `f0a02f2376c2c3b668ae1935577e3ddd68b855bb`.
- Starting compat: `790149b7e6c137c8a7c079868243eb2b852fdc76`.
- The original worktree was clean on dev/compat. Two dedicated synchronization worktrees and branches were created; no existing worktree is selected for cleanup. The previously absent upstream remote was configured from the repository's Cloud Agent definition, with push disabled.

## Capability inventory (7)

The complete selected delta consists of four upstream commits and 57 changed paths. Each row is owned by main and inherited by compat; compat-specific consumers remain owned by their DC entries. Rows below record the pre-merge disposition, reconciled against the runtime snapshots in the acceptance table.

| ID | Selected behavior and audit range | Producers, consumers and tests | Existing counterparts and owners | Disposition and drift |
| --- | --- | --- | --- | --- |
| C01 | Unified default system prompt; `e3592f0e` | `session/system.ts`, removed model prompt templates, agent defaults; `session/system.test.ts`, `agent/agent.test.ts` | Both branches: FD-002, FD-005, FC-011, FC-050; compat DC-CONTEXT-001/DC-ACTOR-001 | Adopt shared default presentation while retaining immutable instructions, positive actor identity, bounded environment and frozen-prefix authority. Review old model-specific assertions. |
| C02 | Codex harness is explicit opt-in; `e3592f0e` | `flag/flag.ts`, registry and gpt tool selection, actor fixtures; flag, registry-toolset and gpt tests | Both branches: FD-005/FD-006, FC-005; compat DC-ACTOR-002/DC-WEBSEARCH-001 | Adopt opt-in default; retain explicit session precedence, API identity, authorized nested execution and compat native-search decisions. Legacy `harness_model` remains configuration-compatible but does not select the harness. A shared prefix policy generation prevents reuse of old model-selected systems. |
| C03 | Present Compose Next specs and split large features into independently deliverable sub-documents; `994aa695` | Bundled `compose-next/SKILL.md`; skill discovery regressions | Both branches: FC-011/FC-005; compat DC-CONTEXT-001 | Adopt guidance additions; retain existing fork guidance and content caps. |
| C04 | Finite empty-step/checkpoint-writer loops; `942de16e` | `session/classify.ts`, processor/prompt/checkpoint, checkpoint-writer prompt; invalid-output, checkpoint-child-session and classify tests | Both branches: FC-009/FC-013/FC-021/FC-027; compat DC-MODEL-001/DC-SESSION-001 | Adapt into existing fork pure-empty retry budget and finite system-agent recovery; retain useful-output and tool-side-effect boundaries. |
| C05 | Request-error logging excludes request bodies; `942de16e` | `session/llm.ts`; `session/llm-stream-error-log.test.ts` | Both branches: FC-008/FC-009/FC-049; compat DC-WEBSEARCH-001 | Adopt body redaction while retaining safe error metadata, event timeout and search-specific retry handling. |
| C06 | Limits, sampling and effort derive from resolved model metadata; `c9c91d7b` | Provider model/transform, LLM and completions; provider/transform, llm and real Responses regressions | Both branches: FD-005, FC-025/FC-053/FC-015; compat DC-CONTEXT-001/DC-MODEL-001 | Adopt metadata policy while retaining declared-reasoning SDK options, custom xai Responses routing, Grok operation schemas, and compat effective-window preflight. |
| C07 | Model-driven finish-reason/step termination and published error schema; `c9c91d7b` | message-v2, classify, processor, prompt, MaxMode and generated v2 types; classify integration, retry and max-mode regressions | Both branches: FC-009/FC-013 and FD-002; compat DC-MODEL-001/DC-CONTEXT-001 | Integrate with bounded fork recovery and immutable retry requests; regenerate SDK from resolved sources separately for both branches. |

## Validation and publication

GitHub's Actions permissions API reports `enabled: true`, but actual lint, typecheck and test dispatches on both published branches each return HTTP 422, `Actions has been disabled for this repository`. No new runs were created. The service-level rejection is authoritative; the permissions response is not proof of runnable CI. Local Bun 1.4.4 could not apply the pinned QuickJS patch. Bun 1.3.14 was obtained without changing the repository lockfile. Native lifecycle installation requires a missing Windows node-gyp command; `bun ci --ignore-scripts` on pinned Bun succeeds for source validation. This does not establish native build or packaged-binary acceptance. Final branch CI remains required.

Main SDK was regenerated with `bun run packages/sdk/script/build.ts` under Bun 1.3.14. Only the intended v2 type file changes: raw finish, incomplete-stream error and accurate harness descriptions; original fork schema extensions remain. CLI and SDK owning-package `bun run typecheck` pass. Root lint passes with 3,724 warnings and zero errors.

Local tests use Bun 1.3.14 from `packages/cli`, unsetting ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE`, and retaining the two package preloads. The host additionally supplies `MIMOCODE_ENABLE_AGENT_CLI_SKILLS=1`, `MIMOCODE_ENABLE_ANALYSIS=false`, `MIMOCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT=1`, `MIMOCODE_EXPERIMENTAL_TOKEN_EFFICIENCY=1` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL=1`. Harness permission-sensitive checks also remove ambient `MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS` and `MIMOCODE_ENABLE_EXA`; other local batches inherit those two enabled host options and are not default-permission evidence. Clean-host final CI is required.

| Main local matrix | Result |
| --- | --- |
| Provider, transform, xai config, OpenAI Responses reasoning and capability streaming (five files) | 343 pass, zero fail; real wire limits/sampling/effort and xAI xhigh adapter rejection |
| LLM, retry, auto-resume-after-tools, MaxMode EConnReset | 179 pass, zero fail |
| Flag independent child process and request-body log privacy | 4 pass, zero fail |
| Compaction reasoning fallback, tool choice and overflow | 69 pass, zero fail across the three existing files |
| Checkpoint fork-mode and writer runaway | 26 pass, zero fail |
| Replace-agent subagent, LLM system prompt, skill catalog system tail | 18 pass, zero fail |
| Prefix snapshot and legacy Git-status helper/recovery | 12 pass, zero fail |
| Alias and request-prefix integration after explicit opt-in migration | 24 pass, zero fail |
| Harness gpt/system/registry/agent; skill-search/whitelist; spawn focused; gpt/flag follow-up | 94 / 11 / 7 / 21 pass; overlapping batches, zero fail |
| Retry/classify/auto-resume; full invalid-output, classify integration and checkpoint-child coverage | 177 / 29 / 16 / 11 pass; overlapping batches, zero fail |
| Prompt-effect focused retry, ownership and frozen native Actor batches | 4 / 3 / 5 pass; overlapping subsets, zero fail; full file left to CI |

Counts above are per-batch evidence and must not be added into a unique-test total. Initial conflict-parser failures and old automatic-Codex assertions were repaired before acceptance. Two early large local batches reached the shell's 60-second limit; their successful replacements are the reported bounded batches, not inferred passes.

Additional main checks: debug-agent passes 10 cases after old inference fixtures migrate to explicit opt-in; builtin skill content passes 5. The unchanged `tool-script.test.ts` has 101 passes and four Windows failures (path literals embedded in guest JS and symlink EPERM). These are not counted as passes or asserted to pass at the starting commit; the test blob is unchanged and the observed failures are unrelated to harness selection. Full Linux shared-process shards remain unverified because CI cannot start.

Compat independently regenerated the SDK from its resolved runtime schema, preserving agent MaxMode, native search/fetch, checkpoint coverage and all existing API extensions. CLI/SDK package typecheck pass; root lint reports 3,809 warnings, zero errors. Its validation removes the three mandatory ambient selectors; permission-sensitive parent batches also remove skip-permissions/Exa, retaining the five host options listed above and package preload.

| Compat local matrix | Result |
| --- | --- |
| Provider/transform/xai/OpenAI Responses/capability streaming | 345 pass, zero fail |
| Overflow, prefix snapshots and actual request prefixes | 126 pass, zero fail |
| Session owner, execution ownership, model-selection API | 30 pass, zero fail |
| MaxMode, request-log privacy, isolated flag defaults | 19 pass, zero fail |
| System/gpt and compat skill catalog projection/capture; spawn variants/tools | 42 + 7 pass, zero fail |
| Classify/auto-resume, invalid-output, rawFinish integration and selected prompt contracts | 52 + 6 + 6 + 5 + 4 pass, zero fail |
| Native search request/fallback/replay and tool wire behavior | 9 + 30 pass, zero fail |

Native-search review also checked `pause_turn` against starting compat `790149b7`: the pinned SDK maps it to `stop`, and text-bearing results already terminate. Explicit pause continuation remains an existing unsupported boundary, not a newly supported capability or a regression introduced by this merge.

## Final capability acceptance

The table has exactly seven result rows, matching inventory N=7. Results describe published source and local verification; remote CI acceptance is a separate blocked condition.

| ID | Selected behavior | main result | dev/compat result | Decisive paths/tests |
| --- | --- | --- | --- | --- |
| C01 | Unified default prompt/environment | Adopted, vendor templates removed; fork Task/Actor and instruction authority retained | Inherited; UTF-8 skill catalog caps retained | `session/system.ts`, system/agent tests, compat catalog capture/projection, legacy Git-status recovery |
| C02 | Model-independent Codex opt-in | Adopted with explicit session priority; legacy aliases no longer select tools; persistent profile policy version added | Inherited; variant selection and read-only subagent tools retained | `tool/gpt.ts`, `session/prefix-snapshot.ts`, isolated flag/gpt child tests, harness-alias/request-prefix/debug-agent/spawn tests |
| C03 | Compose Next presentation/sub-documents | Adopted guidance; no workflow authorization expansion | Inherited unchanged | Bundled `compose-next/SKILL.md`, builtin skill tests |
| C04 | Finite writer/empty-step recovery | Adapted into independent eight-retry emptyOutput budget, system cap and atomic non-GPT continuation | Inherited; overflow placeholders and process ownership retained | retry/invalid-output/checkpoint/classify integration, writer-fork/runaway and ownership tests |
| C05 | Request-body-free stream error logging | Adopted | Inherited | `session/llm.ts`, real request-marker `llm-stream-error-log.test.ts` |
| C06 | Declared limits/sampling/effort | Adopted; xAI Responses/options and Grok schemas retained | Inherited; native server-tool ordering and effective-window preflight retained | provider/transform/Responses/capability wire matrices, overflow and native-search tests |
| C07 | Raw finish, incomplete streams and public schema | Adopted with fork reasoning-only continuation and no tool replay; SDK regenerated | Inherited with compat MaxMode/context/recovery API extensions; SDK regenerated | classify/processor/auto-resume/MaxMode tests and both generated v2 type files |

## Publication and cleanup evidence

- Published main runtime/test/guidance snapshot: `ff3e89742fe306d2d350cd0861696a1bd7782e70`.
- Published compat runtime/test snapshot: `8856b86559a1894b51d4523db21015a32b358fba`, inheriting that main snapshot.
- Both `git merge-base --is-ancestor` checks for selected upstream → runtime main → runtime compat exit zero. No lockfile or migration journal changed. Later registry/history/report commits are documentation-only and do not advance these runtime references.
- Main owns identical FD/FC registries and shared history/report on both branches. FD-005 retires automatic model/alias harness inference while retaining explicit session priority. FC-050 retires production Claude status generation and retains legacy snapshot recovery. Compat updates only its own current review record/history in addition to inheriting main documents.
- Exact-SHA lint/typecheck/test run URLs are unavailable: all three workflow dispatches on each branch are rejected with HTTP 422. Windows CI is also unavailable. To finish acceptance, restore repository Actions availability, dispatch all three workflows at the then-current branch tips (enable the Windows input for a manual compat test run), and verify each run's full `headSha`. Do not substitute historical green runs or the passing local subsets.
- Final branch-tip equality, live upstream recheck, documentation-only tree equivalence and operation-resource cleanup are verified by the closing terminal evidence. The source snapshot references above intentionally remain immutable when this record is inherited into later documentation commits.
