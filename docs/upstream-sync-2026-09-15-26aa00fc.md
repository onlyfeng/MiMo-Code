# Upstream synchronization: exact tool names (2026-09-15)

## Scope and immutable baseline

Full synchronization, authorized flow: upstream/main -> fork main -> fork dev/compat.

- Prior upstream: `b4cc11cd652195af9a80297ed543218f3172e6c4`.
- Selected upstream: `26aa00fc7e243a90586f5895ddcad2b7ce76b935`.
- Starting main: `2bbd3c0b20f2fb9c005c593585bd320c0e0a91d8`.
- Starting compat: `1caf307ff8c26137cfd095fe9fa5374293e2e208`.
- Delta: one upstream commit, nine paths. Both remotes freshly fetched with branch-only, tag-preserving refspecs.
- Original checkout is clean, on an older dev/compat tip; the pre-existing separate sync worktree is protected. This operation uses its own temporary main and compat branches/worktrees. Local resource paths are kept in operation logs, not portable repository guidance.

## Capability inventory (1)

| ID | Selected behavior and carriers | Main / compat counterparts | Relationship and drift | Canonical owner / disposition | Evidence |
| --- | --- | --- | --- | --- | --- |
| C01 | Exact catalog tool names in `util/tool-compat.ts`, `session/llm.ts` GitLab dispatch and `tool/tool-script.ts` MCP dispatch; remove `IGNORE_TOOL_NAME_CASE` in `flag/flag.ts`; align `agent/prompt/checkpoint-writer.txt`, `session/prompt/default.txt` and `docs/compose/spec/tool-name-case-hint.md`; incoming `test/util/tool-compat.test.ts` and `test/tool/tool-script.test.ts` | Both branches contain each runtime counterpart; compat additionally materializes active wire schemas in `llm.ts` | Adopt exact lookup; retain argument-key normalization and raw exec wrapping. Fork checkpoint guidance uses the runtime-generated contract rather than a hard-coded whitelist. Explicit advertised built-in adapters, canonical Actor/plan authority, frozen membership and compat preflight remain independent | Shared main; FD-002/005/006/009, FC-002/004/011; adjacent flag owners FD-004, FC-008/015. Adapt checkpoint guidance and preserve fork dispatch guards. DC-CONTEXT-001 retains active-schema helpers; other six DC owners have no incoming implementation overlap | Reconciled against main `0b8c5d63` and compat `252f81e9`; all affected tests pass |

All active FD/FC/DC contracts were reviewed against the complete nine-path delta.
No HTTP/schema/SDK inputs change, so SDK regeneration is unnecessary.
No owner retirement or unrelated consolidation is selected.

## Final reconciliation

| ID | Selected behavior | main result | dev/compat result | Decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Exact catalog names, with retained argument normalization | Adopted; checkpoint runtime contract and exec control checks preserved | Inherited; existing active-schema/preflight implementation preserved | Tool utility and incoming utility tests match upstream byte-for-byte; GitLab regression rejects wrong case/separators/MCP aliases without executing; nested dispatch retains whitelist, reserved-name, Actor and plan-exit sentinels |

The complete `packages/` main-to-compat diff is identical before and after the
merge after removing only blob IDs and hunk coordinates. This verifies all
existing package overlays remain in place, including the six DC owners without
incoming implementation overlap. `llm.ts` retains compat's `filterActiveTools`
and `materializeWireToolDescriptors`; its actual wire-membership and schema
budget tests also pass. No SDK/OpenAPI, migration or dependency input changed.
No duplicate implementation was introduced and no consolidation is required.

## Validation

- Main runtime/tests and prompt content: `0b8c5d634077f19c2d8c03179f2c869a01a18cec`.
- Compat source integration: `252f81e93973671580b139a4d55b7bddd5aa4d3b`.
- Bun: `1.3.14`; dependencies installed separately with `bun ci`, lockfile unchanged.
- Each branch runs two separate Bun test processes from `packages/opencode`; no name filter or skipped tests. Tests within each row share a process.
- Default-path environment removes `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE`, `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`, `MIMOCODE_EXPERIMENTAL_WORKSPACES`, `MIMOCODE_COMPACTION_MAX_CONTEXT`, `MIMOCODE_COMPACTION_TRIGGER_RATIO`, and `MIMOCODE_DISABLE_CHECKPOINT` before launch.
- Package preloads remain `@opentui/solid/preload` and `test/preload.ts`; the latter sets `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`, in-memory SQLite, isolated test config/home and fixture model catalog, and disables default plugins. This is the package test baseline, not proof that Orchestrator is enabled in production.

| Branch | Command from package directory | Outcome |
| --- | --- | --- |
| main | `bun test test/util/tool-compat.test.ts test/tool/tool-script.test.ts test/tool/tool-script-ref.test.ts --timeout 120000` | 118 pass, 0 fail, 354 assertions; 41.11 s; exit 0 |
| main | `bun test test/session/llm-gitlab-workflow-system.test.ts test/session/llm.test.ts test/session/checkpoint-permission.test.ts test/session/prefix-snapshot.test.ts --timeout 120000` | 28 pass, 0 fail, 102 assertions; 35.66 s; exit 0 |
| dev/compat | Same three tool suites | 118 pass, 0 fail, 354 assertions; 35.28 s; exit 0 |
| dev/compat | Same four request/contract suites plus `test/session/overflow.test.ts`, `--timeout 120000` | 127 pass, 0 fail, 302 assertions; 30.87 s; exit 0 |
| both | `bun typecheck` | exit 0 separately |
| both | `bun lint` from repository root | exit 0 separately; main 4509 warnings, compat 4565 warnings; zero errors |
| both | `git diff --check` and overlay comparison | pass |

The durations above are per process and are not added into wall-clock time.
Operation logs use the `mimocode-sync-20260915-` prefix in the host temporary
directory, with branch and install/tools/contracts/typecheck/lint suffixes.
Bun tests exercise synthetic local providers and actual dispatch; they do not
establish live GitLab service interoperability or install a client binary.

## Publication and resource closure

The source snapshots above were tested before this documentation commit. Shared
FD/FC review records advance to the selected upstream and source/content SHA;
compat records its inheritance separately. Documentation-only descendants do
not change those tested package trees.

At record creation, final pushes, exact-final-SHA `test`/`typecheck`/`lint` CI,
remote-tip equality, and final refreshed upstream ancestry remain pending. Their
post-publication evidence is reported with the completed operation rather than
claimed in advance here. The compat test workflow also runs its Windows runtime
job. Only operation-created temporary resources may be removed after integration;
the pre-existing separate worktree is preserved.

