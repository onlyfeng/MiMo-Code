# 2026-09-23 upstream synchronization

## Selected range and capability inventory (3)

Selected upstream: `1579e7d9ee5fca87b707c3892dc725316674a9d6..a273d3450ee05ba5163320eae59d7716b778e480` (one commit). Starting fork tips: `main=b02cd8669ab99051db713749f3a5651e18cb8984`, `dev/compat=c28a6dbe53735a209bfe4952abae4729665ee13e`. The upstream change touches 23 paths. This inventory is the pre-merge semantic map; final dispositions and evidence are completed after validation.

| ID | Incoming behavior, source, and tests | Main counterpart and owner | Compat counterpart and owner | Relationship, drift, planned disposition |
| --- | --- | --- | --- | --- |
| C01 | Remove MiMo v2.6 PascalCase tool name projection. `tool/names.ts`, `tool/{registry,tool}.ts`, `session/{llm,llm-request-prefix,prefix-snapshot,prompt,session.sql}.ts`; delete flag and casing tests. | C07 in the 2026-09-22 sync, with FD-005/006 and FC-002/005/009/011 boundaries; shared `main` owns the model-facing tool surface. | DC-CONTEXT-001 and DC-ACTOR-001 own exact provider-facing preflight and frozen membership; `dev/compat` owns those overlays. | Direct replacement of yesterday's model-name projection, complementary to canonical tool IDs and frozen context. Behavior/schema/tests/docs drift. Adopt canonical names while preserving fork request authority and snapshot identity. |
| C02 | Remove tool-call flooding middleware, stream recovery, reminder, flag, and tests. `session/{llm,processor,toolcall-flooding}.ts`. | C01 in the 2026-09-22 sync, overlapping FC-001/009/013 and FD-005/006/011; shared `main` owns stream admission and retry. | DC-CONTEXT-001 owns bounded request preflight; DC-ACTOR-001 owns frozen Actor context. | Direct replacement of yesterday's flooding path, complementary to FIFO and fail cascade. Behavior/tests/docs drift. Remove only flooding, retain gate and fork retry/authority boundaries. |
| C03 | Add same-step exact tool-call duplicate cancellation before FIFO, with opt-out and coordinated `doom_loop` prompt. `session/{toolcall-duplicate,prompt,processor}.ts`, `flag.ts`, duplicate and cascade tests. | No existing duplicate guard; FC-001/006/013 and FD-006 cover admission and authority. Shared `main` owns the new guard. | DC-CONTEXT-001 and DC-ACTOR-001 require the model-facing builtin/MCP path and frozen tools to remain intact. | Complementary to FIFO/fail cascade; new behavior/config/tests/docs. Adopt before execution, without cancelling distinct suffix calls or changing nested exec authority. |

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

Publication, compatibility reconciliation, exact-SHA CI, and refreshed ancestry remain completion gates.
