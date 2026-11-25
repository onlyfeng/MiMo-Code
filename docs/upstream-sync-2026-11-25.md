# Upstream synchronization on 2026-11-25

## Scope

Full live synchronization through upstream
`c538fab349373356623acea5bb80defa7fc279c0` (pull request #2863), fetched on
2026-11-25 with branch-only refspecs. Fork `main` had last reviewed
`81a37ab596e5ee4d086697df81731a06817e2237`
([2026-11-24](upstream-sync-2026-11-24.md)); upstream added one commit since.
The starting tips were `f1d3628423da4ebc3c9e5c3739f9b321d4bdbf10` on `main`
(the merge of pull request #271) and `2ce781c493580987723acbbfb7bc3c9addf43ec7`
on `dev/compat` (the merge of pull request #272). Compat already contained
`main`, so `f1d36284` is the propagation baseline.

Fork pull requests merged since the previous synchronization were reviewed
against the incoming change: #270 (FC-055, watch surfaces `patchedDependencies`
and `bun.lock`), #271 (FC-056, the file-hook block in `plugin/index.ts`) and,
on compat, #272 (DC-RESOURCE-001, `ripgrep.ts` and the TUI renderer). The
upstream commit touches none of those surfaces.

Two dedicated worktrees on `sync/upstream-c538fab3` and `sync/compat-c538fab3`
housed the integration; the original checkout was not touched. `bun.lock`,
`packages/cli/migration/` and every HTTP route and schema are unchanged on both
branches, so the SDK was not regenerated.

Runtime/test snapshots: `main` `b9499a965e10f906f2a2ead5e0698e243cd0ce54`,
`dev/compat` `c70dfa435437a0dd49a4d60aa5946d02cffb227c`.

## Capability inventory and results (3)

| ID | Selected behavior | Main result | dev/compat result | Decisive paths and tests |
| --- | --- | --- | --- | --- |
| C01 | Readiness carries each connected server's request-exposed always-direct tools (`directTools`) and counts them in `toolCount`. Server reminders name them as directly callable, and "No tools are available" appears only when a server has neither deferred nor direct tools. The `mcp_tool_search` status reads `(N tools, M direct)` and a search miss names the direct tools. | Adopted (clean merge). The fork's request-authorized view is unchanged: `directMcpTools` is built from `alwaysDirectTools`, which already requires the tool to be searchable (permission, agent allowlist, `tools` override and frozen schema) and the model to support tool calls; readiness is still not authorization (FD-005 2026-10-20 note). | Inherited (clean merge). Compat-owned `prompt.ts` hunks do not touch the readiness, reminder or dispatcher regions. | `session/prompt.ts` (`directMcpTools`, `mcpReadiness`), `tool/mcp-tool-search.ts` (`directToolsLine`, `mcpDirectToolNames`, `renderMcpServerReminder`, `renderMcpReadiness`, `mcpSearchMissOutput`); `test/session/prompt-effect.test.ts` ("reports a server whose tools are all always-direct…", mutation below), `test/tool/mcp-tool-search.test.ts` ("always-direct MCP tools in status and reminders"). |
| C02 | `mcp_tool_use` called with an always-direct name still rejects it, and the error now points at the top-level tool instead of `mcp_tool_search`. | Adopted (clean merge). FD-006's exclusion of always-direct tools from deferred dispatch is unchanged: only the rejection text differs. | Inherited. | `session/prompt.ts` (`mcp_tool_use` fallback); `test/session/prompt-effect.test.ts` (both always-direct cases assert the new text). |
| C03 | Direct tool names join the server reminder fingerprint only when present, so markers of servers without direct tools stay identical to ones already announced; moving a tool between the catalog and direct exposure is not reported as removed. | Adapted. FC-004's replay rule ignores malformed historical reminder metadata without erasing earlier valid state, but `announcedMcpReminders` passed unknown fields through, and the new `directToolNames` is sorted by `mcpReminderMarker` and diffed by `renderMcpServerReminder`. A non-array value would throw during replay; an array with non-strings would corrupt the removal list. It is now validated like `toolNames`. FC-004 note. | Inherited (`mcp-tool-search.ts` is identical to `main`). | `tool/mcp-tool-search.ts` (`announcedMcpReminders`, `mcpReminderMarker`); `test/tool/mcp-tool-search.test.ts` ("malformed historical reminder metadata cannot erase valid state or break replay", extended with a valid `directToolNames`, two malformed values and the replayed removal list: fails before the adaptation, passes after). |

## Merge

Both merges were clean. `main` merged upstream's four files; the only fork
drift in `mcp-tool-search.ts` (historical metadata validation and
`hasMcpDeferralEvidence`) and in `mcp-tool-search.test.ts` (the malformed
metadata test) sits outside upstream's hunks. The adaptation for C03 is part of
the merge commit. Merging `main` into `dev/compat` overlapped compat-owned
changes only in `session/prompt.ts` and `test/session/prompt-effect.test.ts`,
in regions away from upstream's hunks.

## Local validation

macOS 15 (Darwin 24.6) with the pinned Bun 1.3.14; dependencies came from
`bun ci`. Each test file ran in its own process from `packages/cli`, with
`MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE` and
the seven other ambient `MIMOCODE_*` switches of this host removed; the package
preload flags were kept.

- `main` `b9499a96`: root `bun typecheck` (every workspace plus scripts)
  passes; root `bun run lint` reports 0 errors (3,756 warnings).
  `test/tool/mcp-tool-search.test.ts` 41 pass; `test/session/prompt-effect.test.ts`
  224 pass, 0 fail, 2 skipped; `test/session/llm-request-prefix.test.ts` 16 pass;
  `test/session/codex-compact.test.ts` 10 pass; `test/config/config.test.ts`
  95 pass; the 28 files of `test/mcp/` 164 pass, 0 fail.
- `dev/compat` `c70dfa43`: root `bun typecheck` passes; root `bun run lint`
  reports 0 errors (3,844 warnings). `test/tool/mcp-tool-search.test.ts` 41 pass;
  `test/session/prompt-effect.test.ts` 259 pass, 0 fail, 2 skipped;
  `test/session/llm-request-prefix.test.ts` 16 pass;
  `test/session/codex-compact.test.ts` 10 pass.

Running `test/mcp/` as one directory in a single process gave 130 pass and 34
fail on `main`; every file passes alone and the merge changes nothing under
`src/mcp/`, so this records cross-file interference in that ad-hoc grouping,
not a result of this synchronization. The CI shards are the shared-process
evidence.

Mutation check for C01: dropping `directTools` from the merged readiness in
`session/prompt.ts` (and counting only deferred tools) makes the direct-only
prompt case fail with the original defect, "MCP server kernel connected. No
tools are available for this request."; restoring it passes.

Local runs on this host are not exact-SHA CI; the CI result is recorded
below.

## Publication

Both branches were published by direct fast-forward push, as for the previous
synchronization.

| Branch | Push | Exact-SHA push CI | Result |
| --- | --- | --- | --- |
| `main` | `f1d36284..e6f77f18` (`b9499a96` runtime, `e6f77f18` record) | lint 45600578809, typecheck 45600578935, test 45600578725 on `e6f77f18a3280e9cd1d9dfd79389e5b4c72bd3d6` | All success; `windows-runtime` is skipped on `main` by design. |
| `dev/compat` | `2ce781c4..a51745c4` (`c70dfa43` runtime, record merge and compat record) | lint 45600583957, typecheck 45600583967, test 45600583955 on `a51745c41c028e6ae84752836ce445c143420751` | All success, including `windows-runtime`. |

Ancestry: upstream `c538fab3` is an ancestor of `main` `e6f77f18`, which is an
ancestor of `dev/compat` `a51745c4`; upstream had not advanced when the tips
were rechecked after CI.

The commit that adds this section, and its merge into `dev/compat`, change only
`docs/` and start no workflow. Their trees outside `docs/` equal `e6f77f18` and
`a51745c4` respectively (`git diff --quiet <ancestor> <tip> -- .
':(exclude)docs'`), so the runs above are their CI evidence.
