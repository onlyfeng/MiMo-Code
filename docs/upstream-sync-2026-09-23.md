# 2026-09-23 upstream synchronization

## Selected range and capability inventory (3)

Selected upstream: `1579e7d9ee5fca87b707c3892dc725316674a9d6..a273d3450ee05ba5163320eae59d7716b778e480` (one commit). Starting fork tips: `main=b02cd8669ab99051db713749f3a5651e18cb8984`, `dev/compat=c28a6dbe53735a209bfe4952abae4729665ee13e`. Accepted main: `616fc5fa0a132d6899aaaafc3a7b0eacb12e20aa` (runtime/tests `2c53e908ac96eb4f7d00deb3a719780991abaea5`); compat source/tests: `bc1525552a25c724b728d4815d8b45195237b8f6`. The upstream change touches 23 paths.

| ID | Incoming behavior, source, and tests | Main counterpart and owner | Compat counterpart and owner | Relationship, drift, disposition and evidence |
| --- | --- | --- | --- | --- |
| C01 | Remove MiMo v2.6 PascalCase tool name projection. `tool/names.ts`, `tool/{registry,tool}.ts`, `session/{llm,llm-request-prefix,prefix-snapshot,prompt,session.sql}.ts`; delete flag and casing tests. | Yesterday's C07, with FD-005/006 and FC-002/005/009/011 boundaries; shared `main` owns the model-facing tool surface. Adopted canonical names. | DC-CONTEXT-001 and DC-ACTOR-001 own exact provider-facing preflight and frozen membership; `dev/compat` retained those overlays. | Direct replacement of yesterday's projection; behavior/schema/tests/docs drift. Main typecheck and 120-test prefix/gate matrix pass; compat 344-test matrix preserves hidden schemas, native Actor parameters and loaded MCP identity. |
| C02 | Remove tool-call flooding middleware, stream recovery, reminder, flag, and tests. `session/{llm,processor,toolcall-flooding}.ts`. | Yesterday's C01, overlapping FC-001/009/013 and FD-005/006/011; shared `main` owns stream admission and retry. Removal adopted. | DC-CONTEXT-001 owns bounded request preflight; DC-ACTOR-001 owns frozen Actor context. Both retained. | Direct replacement of yesterday's flooding path; behavior/tests/docs drift. FIFO/fail cascade and replay remain separate; main gate/LLM tests and compat 344-test matrix pass. |
| C03 | Add same-step exact tool-call duplicate cancellation before FIFO, with opt-out and coordinated `doom_loop` prompt. `session/{toolcall-duplicate,prompt,processor}.ts`, `flag.ts`, duplicate and cascade tests. | No prior duplicate guard; FC-001/006/013 and FD-006 cover admission and authority. Shared `main` adopted the new guard. | DC-CONTEXT-001 and DC-ACTOR-001 retain model-facing builtin/MCP admission and frozen tools; new 128K fixture reaches the compat runtime. | Complementary to FIFO/fail cascade; new behavior/config/tests/docs. Four duplicate tests pass on both branches; main 301-test prompt/LLM matrix and compat 344-test matrix prove distinct suffix calls, opt-out and `doom_loop` behavior. |

Active FD/FC review also covers cleanly merged `flag.ts`, `processor.ts`, `session.sql.ts`, and `tool.ts`. Active compat owner review covers the five main merge conflict paths and the nine compat-changed source paths in the incoming range. No release, SDK, migration, or workflow files change.

## Main semantic decisions

- C01 removes the MiMo v2.6 model-facing casing projection end to end. Canonical tool IDs continue to drive provider schemas, persisted tool calls, permissions and replay. Historical snapshot JSON may carry an unused `model_name`; the current snapshot type, hash and restoration no longer produce or consume it. The fork still hashes and freezes hidden executable schemas, active membership and native Actor parameters.
- C02 removes the flooding middleware and its synthetic recovery batch. The existing `protectRequestReplayBoundary` still keeps a provider error after output from returning to request-level retry. FIFO admission, fail cascade, permissions, hook cancellation and nested `exec` authorization remain independent.
- C03 claims an exact builtin or model-facing MCP signature before FIFO admission. A duplicate returns the upstream interrupted tool result without closing the gate for distinct calls. Script-owned MCP calls inside `exec` do not claim a model-facing signature. The legacy run-approval fixture exercises `doom_loop` with duplicate detection explicitly disabled; the new default-path test proves repeated writes are cancelled without that ask.

## Validation

Default-path commands remove ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and `MIMOCODE_CODEX_MODE`. Package-owned preload flags remain the test harness baseline.

| Scope | Result |
| --- | --- |
| Locked dependencies | Root `bun ci` completed; `bun.lock` unchanged. |
| Package typecheck | `bun typecheck` passed. |
| Duplicate/FIFO/cascade/frozen-prefix/retry matrix | 120 passed across 13 files, 745 assertions, zero failures. |
| Repository lint | 4757 warnings, zero errors. |
| Broader prompt/LLM/tool-script matrix | 301 passed, 6 existing skips, zero failures across 5 files / 1472 assertions. The first run exposed the obsolete default-on `doom_loop` expectation; its opt-out fixture passed alone, then the full matrix passed. |

At main publication, exact-SHA `616fc5fa` workflows `lint` (35851727748), `typecheck` (35851727745) and `test` (35851727757) all completed successfully. This does not establish compat CI; its final SHA is checked separately after publication.

## dev/compat reconciliation

The accepted compat merge `bc152555` retains 39 production overlay paths, with 37 unchanged stable per-path patch IDs. The two adapted paths remove the obsolete model-name field while keeping current-turn MCP request projection, loaded-MCP hash membership, hidden executable schemas, frozen native Actor parameters and legacy active-tool restoration. Three compat-only edits in retired PascalCase/flooding tests were limited to model context size and retire with those tests. The new duplicate test uses 128K input context so DC-CONTEXT-001 reaches tool execution; output tokens and behavior assertions are unchanged.

Compat verification: `bun ci` left `bun.lock` equal to main; package typecheck passes; root lint reports 4818 warnings and zero errors. The final affected 16-file matrix passed 344 tests with 2 existing skips and 2021 assertions. Actor spawn and model-context tests passed 83 tests and 457 assertions. All selected commands removed ambient experimental and Codex-mode selectors and kept package preload flags as the harness baseline.

Publication, compat exact-SHA CI and refreshed ancestry remain completion gates at this source snapshot.
