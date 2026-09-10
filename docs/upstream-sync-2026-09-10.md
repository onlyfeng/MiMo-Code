# Upstream synchronization 2026-09-10

## Selected immutable range

- Upstream: `1c13f05105b7c671a3e201b61410ccbfa8acf96e..ceecd1c71f88c4840f9fdbdf2450fa331121be22` (one commit, 61 paths).
- Starting main: `3fd2245fcf836ff0309f6d1d75332ca32c493625`.
- Starting compat: `eaf6cdcc54c1cc4e6cf716e766b9a2f59265c162`; already contains starting main.
- Canonical owner for all selected capabilities: shared main. Compat-only ownership remains in the DC registry.
- Main source/test and bundled guidance: `c35c34d45a2e24ab6e48a7a3fd438d1c456352ed`.
- Status: main integration validated. Compat-specific source reconciliation and final publication evidence are recorded in its override/history registry.

## Capability inventory (7)

| ID | Selected behavior and decisive paths/tests | Main counterpart / relationship / drift | Compat counterpart and owners | Disposition |
| --- | --- | --- | --- | --- |
| C01 | Revisioned title authority, migration/import protection, transactional event replay and HTTP/SDK conflict contract: session/session.ts, session/projectors.ts, session/session.sql.ts, storage, sync/index.ts, server session route; title-authority, title-migration, title-sdk, Node title-authority | Existing title setter and fork session prompt/catalog/task fields; complementary, schema/caller drift | Inherited session core plus checkpoint projection; FC-001/002, FD-004, DC-CONTEXT-001 | Adapt every caller and regenerate OpenAPI/SDK from resolved source |
| C02 | First genuine input commits fallback before detached text-only title generation; configured lite then source model, ephemeral hook/workflow isolation: session/prompt.ts, session/llm.ts; title-first-turn, title-input, prompt tests | Existing ephemeral title and retry isolation; partial duplicate, input/model/contract drift | Shared title API with bounded inputs and no per-agent MaxMode; FD-002/005/009, FC-001/009/013, DC-MODEL/CONTEXT/ACTOR-001 | Adopt title behavior, retain stronger request identity, retry and frozen-context invariants |
| C03 | Current main root session set-title tool with protected-user and revision gates: tool/session.ts, tool/registry.ts, session.txt; title-tool | Existing orchestrator session tool, compact advertised/executable pools; complementary schema drift | Shared session tool plus actor context transport; FD-006/009, FC-001, DC-ACTOR-001 | Adopt title-only default tool without granting orchestration or widening frozen authority |
| C04 | Revision-aware TUI rename/readback/SSE and App title editor with conflict confirmation: TUI dialog-session-rename, context/sync, util/session-title; App title-editor, i18n, e2e, UI CSS source scope | Existing rename and title synchronization; complementary UI contract drift | TUI metadata remains separately owned; DC-TUI-001, FC-008 | Adopt shared editors, retain metadata/locale; App remains an unmaintained surface with bounded checks |
| C05 | Picker-confirmed skill command submission before catalog sync, multiline arguments and command text parts: TUI prompt/index.tsx, prompt/part.ts, command schema; skill-picker-submit | Existing permission-gated skills and voice prompt editor; complementary submission drift | Same prompt with metadata and locale; FC-005/016, DC-TUI-001 | Adopt routing while retaining server authorization and voice ownership |
| C06 | Host config defaults below user values and small_model alias only when lite absent: config/config.ts; title-defaults | Existing trusted model alias capture; complementary config precedence drift | Inherited configuration plus per-agent model options; FD-005, DC-MODEL-001 | Reconcile defaults before trusted configuration capture without changing explicit precedence |
| C07 | Preserve unsupported local attachment metadata and send a path placeholder instead of a provider media fetch: session/prompt.ts, message-v2.ts; message-v2/title-input | Existing media transform and fixed cwd; complementary attachment representation drift | Bounded media/context projection; FC-007/009, DC-CONTEXT-001 | Adopt alongside existing synthetic error media handling |

## Owner review map

All active FD/FC/DC entries were considered against the selected delta. Direct or semantic overlaps are recorded above. FD-001 run approval and FC-001 lifecycle carriers in prompt/routes must survive clean hunks. FC-002/005 and FD-009 frozen prefix/catalog fields must survive session and prompt conflicts. FD-004 keeps authentication-before-bootstrap and actor recovery API extensions. FD-010/011/012 and FC-015 compaction retain their existing acceptance, retry, tool-choice and budget contracts; this delta changes no compaction implementation. FC-003/004/006/010/011/012/014 have no incoming owned implementation changes; FC-011 has session-tool guidance adjacency only. DC-NET-001/002 and DC-PLATFORM-001 have no incoming owned implementation changes. No owner retirement or unrelated consolidation is selected.

## Main validation and reconciliation

- `bun ci` completed with an unchanged lockfile. Opencode and App package typechecks passed; the SDK source generator built the v2 client and the published OpenAPI was regenerated from the same resolved server. No handwritten generated conflict resolution remains.
- The final affected matrix ran 32 files in separate Bun processes: 383 passed, zero skipped/failed. Cumulative test-process time was 596.69 seconds with two workers; this is not wall-clock elapsed time. The matrix covers every incoming Bun test file except prompt-effect, which ran in the separate seam group below, plus request-prefix/system, frozen catalog/capture, snapshots, approval, compaction, harness alias, exec, real HTTP actor recovery/task claims, voice and registry sentinels.
- The separate prompt-effect/retry/skill-command seam group ran 152 cases: initially 149 passed, two existing skips and one 3-second fixture timeout. Both BusyError assertions completed in the isolated timeout reproduction; the real fixture plus cancellation/disposal completed in 3.568 seconds when the budget was raised to the neighboring integration budget of 20 seconds. Both assertNotBusy cases passed after that test-only change. No assertion or production cancellation policy changed. Final-tip CI revalidates the complete committed tree.
- Real Node migration and two-process SQLite CAS/restart tests passed 4/4, with event logging both disabled and enabled. They exercise the freshly built Node engine, not Bun emulation.
- App title editor unit tests passed 2/2. Its browser fixture passed 10/10 using the installed Chrome with video capture disabled in a temporary runner configuration. Earlier attempts could not launch the absent Playwright browser/video binaries; the successful run covers editing/conflict/late-response behavior, not video tooling. No shipped runner settings changed.
- Default-tool proof used a separate non-test Bun process with experimental, MCP-search, Codex and Orchestrator selectors absent before imports: one session tool, create rejected, set-title committed a generated title. The process explicitly disposed the application/instance and terminated its verification harness. The test package's preload is not used for this assertion.
- Ordinary Bun suites preserve package preload: Orchestrator=true, in-memory DB, isolated home/config/cache, fixture model catalog and disabled default plugins. Ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE` are removed; compaction matrix processes also remove context/ratio/checkpoint overrides. Individual opt-in cases restore their own selectors.
- Lint completed with zero errors (4499 repository warnings); `git diff --check` passed. No broad warning cleanup is included.
- Independent source review found no blocking defect in the main conflicts or compat owner seams. Its approval/retry checks passed 15 cases; a subsequent frozen-catalog case exceeded its 20-second budget in that combined invocation, then passed alone with 15 assertions in 17.81 seconds. The combined timeout remains a validation limitation; its cause was not established, and the successful isolated matrix is not a claim that every scheduling arrangement passes.
- The new title HTTP fixture uses `root: "cwd"` so the existing directory admission policy is exercised without an out-of-cwd 403. The server boundary is unchanged.

## Capability results (7)

| ID | Main result | Compat integration decision | Decisive evidence |
| --- | --- | --- | --- |
| C01 | Adopted CAS, protected imports, replay and generated HTTP/SDK contract | Inherit title authority alongside chronological fork/checkpoint coverage | title-authority, title-migration, title-sdk; Node 4/4 |
| C02 | Adapted into promptWork/send; stronger retry publication retained | Inherit isolated title request alongside bounded context, frozen actors and per-agent MaxMode | title-first-turn, prompt, llm-request-prefix/system and retry; frozen capture/recovery tests |
| C03 | Adopted default title-only session tool and gated full tool | Inherit through the same authorized direct/exec/frozen pools | non-test default proof; title-tool, registry, tool-script |
| C04 | Adopted revision-aware editors and title synchronization | Preserve checkpoint/revert bookkeeping and metadata presentation | TUI title-authority, App 2/2 unit and 10/10 browser |
| C05 | Adopted picker routing and command text input | Preserve ModelMetadata, both titleLocale submissions and owned voice editor | skill-picker-submit, skill-command/mention, voice |
| C06 | Adopted host defaults before trusted alias capture | Preserve per-agent model configuration and request identity | title-defaults, harness-alias |
| C07 | Adopted local attachment path placeholders | Preserve bounded model-message/media projection | message-v2 and title-input |

Compat rows describe the integration decisions; final compat runtime evidence and source SHA belong to its override/history record. Remote-tip equality, exact-tip CI and upstream→main→compat ancestry are independently checked after final publication, and are not inferred from local test results.
