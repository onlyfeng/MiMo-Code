# Upstream synchronization 2026-09-10 (cb00c280)

This is the second selected range reviewed on 2026-09-10. The
[title authority synchronization](upstream-sync-2026-09-10.md) remains the
record for `1c13f051..ceecd1c7`; this record starts from that accepted baseline.

## Selected immutable range

- Upstream: `ceecd1c71f88c4840f9fdbdf2450fa331121be22..cb00c2808043bb0c4f0a4cfc5855912d82c9abe8`
  (two non-merge commits behind two merge commits; 4 paths).
- Starting main: `e2f62b39c25566a4c96bdc2bd7ac234248789171`.
- Starting compat: `a04b7921e80c9f7f148daadff0068839be70a347`; already contains starting main.
- Canonical owner for both selected capabilities: shared main. Compat inherits
  through the direct `main` merge; no compat-only implementation is selected.
- Main source/test after the merge: `67abd1f745135c164a0c30d3769f32ddd10823a8`.
  Bundled guidance content is unchanged at `c35c34d45a2e24ab6e48a7a3fd438d1c456352ed`.

## Capability inventory (2)

| ID | Selected behavior and decisive paths/tests | Main counterpart / relationship / drift | Compat counterpart and owners | Disposition |
| --- | --- | --- | --- | --- |
| C01 | Every plugin registration path validates the resolved hook before registering it, and the trigger/config/event loops guard each entry, so a plugin whose `server()` resolves to a non-object is skipped with a warning instead of crashing the first `trigger()`: `src/plugin/index.ts`; `test/plugin/trigger.test.ts` | Fork adds `memoryWriteEnabled` to the `actor.postStop` aggregate from the instance-local configuration service; complementary, no contract drift | Inherited plugin service; FC-006 owns the progress-checker decision | Adopt the validation and guards, keeping the FC-006 injection on top of the rewritten loops |
| C02 | Xiaomi models on `@ai-sdk/openai-compatible` serve chat from the stock SDK and keep the bundled Copilot fork for `responses()` only, so `reasoning_content` becomes reasoning parts instead of being dropped: `src/provider/provider.ts`; `test/provider/provider.test.ts` | Fork's custom xiaomi `getModel` selects `responses()`/`languageModel()` from the complete resolved identity rather than the bare model ID; complementary — upstream splits the SDK, FD-005 still selects the transport | Inherited provider resolution; FD-005 owns identity, FD-004 lists the same file for the model API surface | Adopt the SDK split; both members the fork's loader calls exist on the composed object, and transport selection stays with FD-005 |

## Owner review map

All active FD/FC/DC entries were considered against the selected delta.

- FD-005 owns `src/provider/provider.ts` transport selection. Upstream now
  restricts the bundled Responses harness to PTC, which moves upstream toward
  the fork's position; the fork keeps resolved-identity selection, so
  `usesMimoResponsesApi(model.id, model.api.id, model.family)` still decides
  `responses()` versus `languageModel()`. No contract changes.
- FD-004 lists the same file among its model API watch surfaces. The change is
  below the listener, token and admission boundary; discovery, scope and
  authentication are untouched, and no generated SDK/OpenAPI input changed.
- FC-006 owns `src/plugin/index.ts` for the instance-local
  `memoryWriteEnabled` decision. Upstream rewrote the registration and trigger
  loops around it; the injection and its fail-open absence are preserved.
- FD-001/002/006/009/010/011/012 and FC-001/002/003/004/005/007/008/009/010/011/012/013/014/015/016
  have no incoming owned implementation changes.
- DC-NET-001/002, DC-PLATFORM-001, DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001
  and DC-TUI-001 have no incoming owned implementation changes. DC-TUI-001
  displays request provider/model/variant truth; the SDK split preserves the
  reported `xiaomi.chat` and `xiaomi.responses` provider names.
- No owner retires and no unrelated consolidation is selected.

## Conflict resolution

`test/provider/provider.test.ts` was the only conflict. Both sides appended a
test at the same anchor after the existing non-PTC transport test: the fork's
`xiaomi transport selection uses the complete resolved model identity` and
upstream's `xiaomi non-PTC chat streams reasoning_content as reasoning parts`.
Both are kept; no assertion was relaxed. `src/plugin/index.ts` and
`src/provider/provider.ts` merged without conflict, and the FC-006 injection
and FD-005 loader signature survive in the merged tree.

## Main validation

- `bun ci` completed with an unchanged lockfile. `bun typecheck` passed in
  `packages/opencode`.
- Final affected matrix at `67abd1f745135c164a0c30d3769f32ddd10823a8`, run from
  `packages/opencode` with `bun test --timeout 30000` (the package script's
  budget): `test/plugin/`, `test/provider/`, `test/llm-server/`,
  `test/flag/codex-mode-flag.test.ts`, `test/tool/harness-alias.test.ts`,
  `test/tool/websearch.test.ts` and `test/tool/tool-script.test.ts` —
  1135 passed, 0 failed, 3459 assertions across 45 files in 130.18 s of
  test-process time.
- Both incoming behaviors were mutation-checked, not merely observed green.
  Restoring the pre-merge bundled loader failed two xiaomi cases, including the
  empty `reasoning-delta` list. Removing the `registerHook` validation and the
  trigger-loop guard failed `skips plugins that return undefined instead of a
  hook object`. Both source files were restored and re-diffed before commit.
- Ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` were
  removed for every run; the package's own preload
  (`@opentui/solid/preload` and `./test/preload.ts`) is preserved as the harness
  baseline.
- `bun lint` reported 0 errors (4506 repository warnings; the pre-merge baseline
  was 4499 and no warning cleanup is included). `git diff --check` passed.
- Note for reproduction: a bare `bun test` uses Bun's 5 s default and times out
  the first plugin fixture when `test/plugin/trigger.test.ts` shares a process.
  The package script uses 30 s and CI uses 120 s; that timeout is a harness
  budget artifact, not a product failure.

## Capability results (2)

| ID | Main result | Compat integration decision | Decisive evidence |
| --- | --- | --- | --- |
| C01 | Adopted hook-object validation and guarded trigger/config/event loops | Inherit through the direct main merge; FC-006 injection unchanged | `test/plugin/trigger.test.ts`, `test/plugin/subagent-progress-checker.test.ts`; mutation check fails without the guard |
| C02 | Adopted the stock chat / bundled Responses split; FD-005 keeps resolved-identity transport selection | Inherit through the direct main merge; no compat provider override | `test/provider/provider.test.ts` xiaomi cases (4/4); mutation check drops all reasoning deltas without the fix |

Remote-tip equality, exact-tip CI and upstream→main→compat ancestry are checked
independently after final publication, and are not inferred from local results.
