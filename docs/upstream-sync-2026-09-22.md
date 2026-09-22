# 2026-09-22 upstream synchronization

## Scope and immutable baselines

Full synchronization authorized by “同步 upstream 更新”, using branch-only,
tag-preserving fetch. Selected upstream range:
`479201262a0f08e6abe9c29022d2fb38b63e29b0..799e5052362d1067e8eb795528460023fbb3d07f`.
Starting main: `9fa2563885e1ee3742f27b4ca2e46fc9c0696d07`;
starting compat: `72c7b04b714ca9c2fe59cf37b07feb71030b5eea`.
The delta contains five first-parent commits and 69 paths. The root checkout had
the pre-existing untracked `api.json`; two existing Paseo worktrees are outside
this operation. This operation owns only `sync/upstream-20260922-main`,
`sync/upstream-20260922-compat` and their matching `.worktrees` entries.

## Capability inventory (7)

Every row uses the immutable range above. The reviewed main runtime snapshot is
`623d5cd1f5dad65d374e078aa2e315b4ea65eb65`; publication and exact-SHA CI are
recorded after the registry commit lands.

| ID | Selected behavior and decisive producers / consumers | main disposition | dev/compat disposition | Ownership, relationship and planned evidence |
| --- | --- | --- | --- | --- |
| C01 | Tool-call flooding recovery admits the first client tool, cancels excess calls, persists canonical failures, emits one synthetic reminder, and never replays the cancelled batch. `session/toolcall-flooding.ts`, `session/{llm,processor}.ts`, stream and recovery tests. | Adopted with fork replay, retry and request-scope boundaries intact. | Inherit from main; recheck compat request construction. | FC-001/009/013, FD-005/006/011; overlapping run-loop and request surfaces. Flooding stream/session tests plus retry and prompt-effect contracts. |
| C02 | Failed or invalid calls cancel later calls in the same model batch; structured output remains gated from ordinary tools. `tool/{gate,invalid}.ts`, processor dispatch and fail-cascade/structured-output tests. | Adopted through the processor-owned gate; fork whitelists, disabled tools and nested authority remain authoritative. | Inherit from main; recheck bounded preflight and context projection. | FD-006, FC-001/009, DC-CONTEXT-001; complementary scheduling with authority and bounded-request overlap. Gate, invalid, structured-output and nested execution tests. |
| C03 | Remove speculative multi-pattern search advice and align bundled Compose/search guidance with actual tools. Agent/session/tool prompts and bundled Compose Next skill. | Adopted; existing task/Actor workflow guidance remains. | Inherit unchanged. | FC-011; shared guidance owner with no new runtime API. Content review and existing prompt/tool description tests. |
| C04 | Actor status reports runtime-local execution separately from persisted lifecycle, removes background stall watchdog notifications, and distinguishes stopped work from success. Actor registry/spawn/waiter/schema, HTTP status and actor tool consumers. | Adopted without replacing fork generation ownership, retained recovery, cancellation or terminal notification bridges. | Inherit from main; reconcile DC Actor creation and full-context ownership. | FC-001/008/009, FD-009, DC-ACTOR-001/002; direct lifecycle overlap. Actor execution, waiter, status and cancellation tests. |
| C05 | Preserve background Actor messages across new prompts and present inbox messages as user bubbles while showing stopped actors distinctly from terminal outcomes. Inbox renderer, session/TUI sync and routes. | Adopted; orphan sweeps remain main-slice-only and chronological projection is retained. | Inherit from main; reconcile TUI metadata/context overlays. | FC-001/009, DC-CONTEXT-001/DC-TUI-001; complementary inbox behavior with TUI projection overlap. Inbox/TUI actor-status and prompt-orphan tests. |
| C06 | Automatic title requests may use tool-capable compatible endpoints without allowing title tool execution, while main-only orphan recovery remains isolated. Prompt/LLM request construction and title tests. | Adopted `toolChoice: auto`; title remains ephemeral, permission-denied and output-validated. | Inherit from main; recheck MaxMode and server-authoritative title metadata. | FD-005/006/011, FC-009/013, DC-MODEL-001/DC-TUI-001; adapted hidden-title request contract. Title-first-turn, LLM request and structured-output tests. |
| C07 | MiMo v2.6 advertises explicit PascalCase builtin tool names, preserves canonical internal IDs, permissions, history and frozen prefix hashes; external/Codex names remain unchanged. `tool/names.ts`, registry/tool metadata, LLM projection and prefix snapshots. | Adopted as a model-facing projection. Internal IDs, permission keys, exec nesting, persisted history and snapshot membership stay canonical. | Inherit from main; recheck compat request/preflight and Actor schema projection. | FD-005/006, FC-002/005/009/011, DC-CONTEXT-001/DC-ACTOR-001; broad request-surface overlap with shared-main ownership. Flag, names, live PascalCase, permission, prefix and flooding integration tests. |

## Semantic decisions

- The outer processor gate owns both flooding and fail-cascade state. Invalid
  read/search arguments are failures rather than parallel-read exemptions;
  request whitelists, disabled tools, hook cancellation and nested exec remain
  execution-time authority checks.
- PascalCase is a model-facing name projection selected from the complete model
  identity. History and permission decisions restore canonical IDs. Frozen
  prefix snapshots store the optional model name and include it in the hash, so
  a renamed wire surface cannot borrow an older executable pool.
- Runtime-local Actor execution is authoritative for `running`; a persisted
  running row without a local owner reports `idle`, `executionActive: false` and
  `executionState: stopped` without rewriting history. The fork's generation,
  recovery, task, cancellation and terminal-notification ownership remains.
- The upstream stall watchdog is retired. Startup zombie handling and explicit
  cancellation remain; a quiet background process is not guessed failed from a
  timer. Main prompt cleanup scans only the main slice and therefore cannot
  abandon a live background Actor message.
- The title request may use `toolChoice: auto`, but exposes only the structured
  output tool under a deny-by-default ephemeral permission set. It does not gain
  ordinary tool authority or durable tool messages.
- The upstream Actor import order exposed a fork cycle in `tool-script.ts`.
  Controlled nested-tool checks are now lazy and string-keyed, avoiding module
  initialization reads while preserving the exact Actor/PlanExit control tokens.
  The incoming HTTP actor test also uses the fork's cwd-contained fixture root.

## Validation and source snapshot

All default-path commands ran from `packages/opencode` with
`MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and
`MIMOCODE_CODEX_MODE` removed. Package-owned preload flags remained the harness
baseline.

| Scope | Result |
| --- | --- |
| Locked dependency install | Root `bun ci`, exit 0; lockfile unchanged. |
| Pre-merge baseline | 149 pass across 8 files, 678 assertions, 0 fail. |
| Flooding/failure/PascalCase focused matrix | 139 pass across 11 files, 1015 assertions, 0 fail. |
| CI `session-actor-recovery` command | 24 pass across 4 files, 241 assertions, 0 fail. |
| Exact four CI unit shards | 6805 pass, 43 existing skips, 1 todo, 0 fail. Shards: 1775/9, 1853/10, 1611/8 plus 1 todo, 1566/16. |
| Import/exec/Codex regressions after correction | Codex/import 11 pass; tool-script 99 pass; actor/system 31 pass. |
| Static checks | Package `bun typecheck` and repository `git diff --check`, exit 0. |

Main runtime/tests and bundled guidance:
`623d5cd1f5dad65d374e078aa2e315b4ea65eb65`. No SDK/OpenAPI input,
dependency lockfile, migration or workflow file changed in the selected range.
Compat reconciliation, exact final-SHA CI, refreshed remote-tip equality and
`upstream/main -> main -> dev/compat` ancestry remain publication gates.
