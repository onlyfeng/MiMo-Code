# 2026-10-10 upstream synchronization

## Selected range and capability inventory (2)

Audit range: upstream `6babeb0b98f9b4818bddf04a4331edfee04dbf85..f98dcd1cf7e70e7eb42f721fdf72bc4a6b87914f` (three commits: `a4b06963` merged by `38f4c459` from upstream PR #2621, and squash `f98dcd1c` from upstream PR #2624; four paths). Starting fork tips: `main=f15b68709eab8dedfbdd936c62e595e463a5ea81`, `dev/compat=ced528534fe5af2e994b888493a5099e7ded2dde`. Main runtime merge: `2f13453afab188f9ae4bc21ed7daecf099b653de`. Compat runtime merge: `ae9c919b3d3f915aa326e27f96a7dc2e8ba0fab2`. The range adds no migration, changes no lockfile, manifest, API schema or workflow, and needs no SDK regeneration.

| ID | Upstream content | Main result | dev/compat result | Relationship, drift, owner, disposition and evidence |
| --- | --- | --- | --- | --- |
| C01 | `src/flag/flag.ts`, `src/index.ts`, bundled `mimocode-docs/reference/config.md`: startup import of Claude Code sessions becomes opt-in. `Flag.MIMOCODE_ENABLE_CLAUDE_IMPORT` (`true`/`1`) replaces the `MIMOCODE_DISABLE_CLAUDE_IMPORT` check in the CLI middleware; the once-per-process-tree `MIMOCODE_CLAUDE_IMPORTED` guard and best-effort error handling stay. Manual `mimo session import-claude` and the global external-import routes are unchanged. | Adopted; `index.ts` is byte-for-byte upstream. `flag.ts` and `config.md` merge cleanly and keep exactly their pre-merge fork drift (FD-004/FD-005/FC-015 flag getters; harness, compaction and `auto_worktree` documentation). | Inherited; the four files are identical to main and compat's overlay touches none of them. | Upstream product behavior. Watch-surface owners checked: FD-004, FD-005 and FC-015 (`flag.ts`, other keys untouched), FC-011 (bundled `config.md`, adopted, note recorded), FC-004 (Claude MCP config import is a separate path, unchanged). No remaining source, test or document reads `MIMOCODE_DISABLE_CLAUDE_IMPORT`. Evidence: isolated CLI probes below. |
| C02 | Bundled `xlsx-official/create.md`: the "Both — data + formulas + formatting" row of the library-choice table gets its own Library cell (`pandas` + `openpyxl`) and the table is re-aligned. | Adopted; byte-for-byte upstream. | Inherited. | FC-011 bundled skill content (adopted, note recorded). Evidence: `test/skill/builtin.test.ts` passes. |

Inventory count: 2 capabilities and 2 result rows. Active entries whose watch surfaces the range touches were checked: FD-004, FD-005 and FC-015 (`flag/flag.ts`) and FC-011 (bundled `mimocode-docs` and skill content) on main; on compat no DC entry watches the changed files, and the historical 2026-09-14 revoke-guard review that cites `src/index.ts` concerns its `populate--` parser configuration, which is unchanged. FC-011 records a note. No owner retires or moves.

## Default-off evidence

The test preload is not proof that startup import is off by default, so each case ran `bun run src/index.ts db "SELECT source, count(*) AS n FROM external_import GROUP BY source"` from `packages/cli` in a non-test child under `env -i` (only `PATH`, `TMPDIR`, a fresh HOME/XDG tree and `MIMOCODE_DISABLE_DEFAULT_PLUGINS=true`), with one Claude Code session file under `$HOME/.claude/projects/`. The CLI middleware runs before the query, so an `external_import` row means startup imported the session.

| Tree | Extra environment | `cc` rows |
| --- | --- | --- |
| pre-merge `ced52853` (control) | none | 1 |
| pre-merge `ced52853` (control) | `MIMOCODE_DISABLE_CLAUDE_IMPORT=1` | 0 |
| main merge `2f13453a` | none | 0 |
| main merge `2f13453a` | `MIMOCODE_ENABLE_CLAUDE_IMPORT=1` | 1 |
| main merge `2f13453a` | `MIMOCODE_ENABLE_CLAUDE_IMPORT=true` | 1 |
| main merge `2f13453a` | `MIMOCODE_DISABLE_CLAUDE_IMPORT=1` only | 0 |
| main merge `2f13453a` | `MIMOCODE_ENABLE_CLAUDE_IMPORT=1 MIMOCODE_CLAUDE_IMPORTED=1` | 0 |
| compat merge `ae9c919b` | none | 0 |
| compat merge `ae9c919b` | `MIMOCODE_ENABLE_CLAUDE_IMPORT=1` | 1 |

The control tree `ced52853` is the starting compat tip; its `flag.ts` and `index.ts` equal main's `f15b6870`. Every probe exited 0, and the checkouts held no written file afterwards.

## Validation and publication gates

Default-path local tests unset the ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` (and `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE`, which were not set); the package preload's own settings stay unchanged (fixture roots, test HOME/XDG, `MIMOCODE_MODELS_PATH`, `MIMOCODE_DISABLE_DEFAULT_PLUGINS=true`, in-memory `MIMOCODE_DB`). `bun ci` installs 2,121 packages on both branches.

Main at `2f13453a`: package and root `bun run typecheck` exit 0; root lint exits 0 with 3,475 warnings and no errors. Focused matrix, each file in its own process: `skill/mimocode-docs` 9, `skill/builtin` 6, `skill/search` 11, the six `flag/` suites 16, `history/import` 4, `cli/debug-agent` 8, `cli/run-yolo-attach` 1, `cli/llm-server-revoke` 5, `agent/agent` 52, `util/glob` 17, `tool/actor-spawn-preference` 1 (+1 existing skip), `tool/memory-path-guard` 79 pass with no failure. `session/prompt-effect` passes 180 with 2 existing skips and one failure: `shell rejects with BusyError when loop running` timed out on its own 5 s test budget, the same case the 2026-10-04 record saw time out under host load; the 1-minute load average was 18–36 during the run. Run alone it then passed once and timed out once. Restoring the two changed runtime files (`flag.ts`, `index.ts`) to `f15b6870` and running the case alone four times passed 4/4; restoring the merged files and repeating passed 4/4. The case never reaches the CLI middleware, and the only other runtime change is one additional eagerly read flag key, so the merge does not cause the timeout.

Compat at `ae9c919b`: package and root `bun run typecheck` exit 0; root lint exits 0 with 3,532 warnings and no errors. Compat's difference from main is byte-identical before and after the merge apart from hunk offsets (115 paths). The same focused matrix, each file in its own process, passes with no failure: the counts above for every file except `session/prompt-effect`, which carries compat's additional cases and passes 212 with 2 existing skips.

Final completion requires successful lint, typecheck and test CI on the exact final branch-tip SHAs, both remote tips equal to the published commits, and ancestry from `f98dcd1c` through fork `main` to `dev/compat`. These are checked after publication; local results are not a substitute.
