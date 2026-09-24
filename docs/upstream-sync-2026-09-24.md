# 2026-09-24 upstream synchronization

## Selected range and capability inventory (3)

Selected upstream: `a273d3450ee05ba5163320eae59d7716b778e480..2b993ac98283bb1283313982e699df706e9ad235` (three first-parent commits, 120 paths). Starting fork tips: `main=616fc5fa0a132d6899aaaafc3a7b0eacb12e20aa`, `dev/compat=6516e800e2bfc9bd2403ad90572c538c31339bf7`. The incoming range changes no dependency manifest or lockfile. Its upstream source has one `git diff --check` blank line at the end of `tool/session.ts`; the fork merge removes it.

| ID | Upstream content | main merge result | dev/compat merge result | Key paths and evidence |
| --- | --- | --- | --- | --- |
| C01 | `a8f777a4`: retire Orchestrator mode, orchestration session/fleet tools, permission forwarding and isolated Git command guard. Keep HTTP frozen `/ask` and ordinary Actor peers. | Adopt removal; retain shared fork `run --yolo` scope, deny-first permission, parent grant inheritance, frozen `forkQuery` membership and Actor generation lifecycle. | Inherit shared removal; reconcile full-context/variant Actor, per-agent MaxMode, private-network/platform and TUI metadata owners. | `agent/config.ts`, `session/prompt.ts`, `permission/index.ts`, `tool/{session,registry,bash}.ts`, TUI and tests. Canonical owner: shared `main`; relationship: conflicting Orchestrator-only code, complementary retained shared contracts; drift: behavior, schema, tests, docs. |
| C02 | `456678b6`: preserve decoded absolute `file://` image path after inlining, in the stored file source and synthetic image envelope. | Adopt path provenance alongside FC-009. | Inherit, with DC-CONTEXT-001 request preflight preserved. | `session/prompt.ts`, `test/session/prompt.test.ts`; canonical owner: shared `main`; relationship: complementary; drift: behavior and tests. |
| C03 | `2b993ac9`: retire configurable tool shell invocation forms and their parsers, wrappers, schemas and tests. | Adopt JSON-only tool invocation; retire FC-018. Preserve Bash commands, TUI shell command and nested `exec` semantics. | Inherit; keep DC-ACTOR-002 JSON `variant` validation/transport, retire its `--variant` shell form. | `tool/{actor,task,cron,registry,tool}.ts`, `session/prompt.ts`, config, SDK/OpenAPI, tests; canonical owner: shared `main`, with compat-only JSON variant overlay; relationship: conflicts with retired FC-018 and shell part of DC-ACTOR-002; drift: behavior, schema, config, tests, docs. |

Inventory count: 3 capabilities, 3 result rows. All three are owned by shared `main`; C03's remaining Actor variant extension is owned by `dev/compat`. Active FD/FC/DC watch surfaces were reviewed even where the file merged cleanly, including `tool/tool-script.ts`, the image envelope, TUI Prompt, frozen prefix, actor spawn, generated schema and SDK.

## Semantic boundaries

- C01 removes the Orchestrator identity and forwarding route without removing the ordinary parent-grant snapshot. Background children inherit only grants the parent already holds; deny precedence and `run --yolo`'s live invocation scope remain. HTTP `/ask` still captures frozen messages and rejects an empty inherited prefix. The TUI cycles ordinary modes, and worker notifications remain synthetic-message based.
- C02 records the original absolute image path, not the inlined data URL, as source provenance. Pasted data URLs have no invented local path. The synthetic envelope is part of the model-visible request and remains subject to the existing request budget.
- C03 removes tool-specific shell syntax and its configuration. `actor` keeps strict JSON validation and compact Codex declarations with the frozen native schema. The unrelated Bash, TUI shell and nested `exec_command` contracts remain available. FC-018 is retired because its parser no longer exists; compat's model `variant` remains in JSON.

## Main validation

Main source/test integration: `22f3ea5e1b597dd60709ed6e96256042a421414b`. Default-path checks unset ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and `MIMOCODE_CODEX_MODE`; package-owned preload flags remain the harness baseline.

- `bun ci` installed locked dependencies; `bun.lock` did not change. `./packages/sdk/js/script/build.ts` regenerated OpenAPI and JS SDK after schema changes.
- `bun typecheck` passed. Root `bun lint` exited 0 with 4604 warnings and zero errors. The intended merge passed `git diff --check`.
- The first affected 14-file matrix ran 366 tests: 362 passed, two existing skips, and two `/ask` failures. The two failing fixtures stored user messages with no text part; the fork's retained empty-prefix guard correctly rejected them. After adding real text parts, the full `/ask` file passed 3/3.
- A second 13-file matrix ran 148 tests: 145 passed and three `external-directory` fixture failures. Upstream's new helper returned a pending Promise while its `using` Git fixture was disposed. Awaiting the helper's callback fixed that lifetime error; the full file then passed 9/9. Other files in the two matrices were unchanged after their passing run.
- First pushed tip `f91ad3f1` passed lint and typecheck CI but failed three unit assertions across two shards. Two OpenAPI tests exposed a stale published spec: live generation had callable v2 samples and current recovery text, while the committed artifact did not. Regeneration from the main worktree synchronized it; a focused three-file rerun passed 11/11. The remaining failure expected a peer to forward a question to its parent after C01 removed that path. The focused runtime rerun confirms background peers receive `[Never-Ask]` and no question event; the assertion now checks that behavior. Current-tip CI must still pass before acceptance.

## Publication gates

The final branch-tip exact-SHA CI, remote equality, ancestry and compat reconciliation are recorded after publication. Historical baseline CI is not acceptance for either new SHA.
