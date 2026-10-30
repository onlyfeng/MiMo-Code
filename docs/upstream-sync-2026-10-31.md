# Upstream sync 2026-10-31: project configuration execution boundary

## Scope and immutable baselines

Full live sync authorized by `同步 upstream 更新`: upstream/main → fork main → fork dev/compat.
Selected upstream `7bc7dc3a9150b3606973164d076b602b5e064690` (upstream PR #2737); prior review `ee0a93b5dff36f689e28957b2e4377159a9a9731`.
Starting main `a8892c5c5036be2f6fc41fd70e53f42b59760ce9`; compat `ba60dff21688385113a873e89ef19fc4ed9ad8a1`. Both include FC-020 (PR #176/#177), which landed after the previous review and is first covered by this review's behavior references.
Both remotes were refreshed with branch-only, no-tag fetches; upstream is read-only.
The original checkout (`dev/compat`, behind its remote, untracked `.omo/`) is protected.
Operation resources: dedicated Git worktrees in the session scratchpad on local branches `sync/upstream-20261030-7bc7dc3a-main` and `sync/upstream-20261030-7bc7dc3a-compat`, an operation-only pinned Bun, node-gyp link, clean-environment wrapper and logs. No remote temporary branch or PR.

## Capability inventory (N=3)

Immutable audit range `ee0a93b5..7bc7dc3a`: twelve upstream commits plus their merge; nine net paths. `9bd5e1bc` (checkpoint writer admission) and `63b32247` (CI node-gyp) are reverted by `c4febb4c` inside the range; `git diff --quiet ee0a93b5 7bc7dc3a -- packages/cli/src/session packages/cli/test/session .github` proves them tree-neutral, so neither is a capability. All active FD/FC entries and the eleven DC entries were checked against this delta, including the clean merges. No owner retires or moves.

| ID | Selected behavior, paths/producers/tests | Main counterpart, relationship and disposition | Compat counterpart and disposition | Owners and decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Host execution policy. New `config/host.ts` (`canServePluginSdk`, `onlyConfigDir`, `inConfigDir`, `allowsExecution`) is shared by `plugin/host.ts`. On the Node build, including a partial Bun shim, or Bun with `MIMOCODE_ONLY_CONFIG_DIR_PLUGINS`, `loadConfig` drops whole `mcp`/`lsp`/`formatter` sections from any source outside `MIMOCODE_CONFIG_DIR` and the host-injected `MIMOCODE_CONFIG_CONTENT`/`MIMOCODE_CONFIG_DEFAULTS`, before merging. `mergeClaudeMcp` skips rejected Claude files. Flag comment updated. Tests: `host executable configuration policy` in `test/config/config.test.ts`, `test/mcp/project-config-execution.test.ts`, `test/plugin/host-node.test.ts` + fixture. Spec `docs/compose/spec/project-config-execution.md` covers C01–C03. | Adapt the only conflict: `mergeClaudeMcp` keeps FC-004's control-overrides argument and adopts the guard as its first statement. `mcp_origins` derive from the already filtered `next.mcp`. A host-source `auto_connect: true` no longer supplies startup authority to a project `.claude.json` transport; the leftover transportless control is ignored by `isMcpConfigured`. Without the guard, the per-source filter alone still lets that combination auto-start the project command under the restricted policy (mutation below). New fork regression in `test/mcp/claude-auto-connect.test.ts`. Fork-only schema additions (`auto_worktree`, MCP startup controls) carry no executable payload. FD-005 harness declarations derive from `provider`, which is not filtered. | Inherit. The compat `websearch`/`webfetch` overlay selects models and network routes, not local executables, and is not filtered. DC-NET-002 remote URL admission is untouched; `mcp/index.ts` stays byte-identical to main. | FC-004 (dated note, `config/host.ts` watch surface); adjacent FD-005, DC-NET-002, DC-WEBSEARCH-001, DC-WEBFETCH-001. Regression fails when the guard is removed (below). Upstream MCP test: the fork keeps Claude imports pending (FC-004), so its `claude` marker check alone proves nothing there. Its exact `status()` equality still proves the project import is absent. `host-node` proves the predicate under real Node with and without a shim, not the complete loader. |
| C02 | Legacy TOML (`<config>/config`). It is parsed from disk on every load through `Primitive.fileParse`, without an import cache. Its normalized and validated settings pass the same source filter. Migration writes `config.json` and deletes the legacy file only when the destination is inside the host boundary. Models-only reads include current legacy model settings without writes; the models-only early return moves after the legacy block. Tests: legacy cases in `test/config/config.test.ts`, including `legacy model refresh reads allowed settings without migration writes`. | Adopt unchanged (clean merge). The fork's `normalizeLoadedConfig` keeps `auto_worktree` (FC-007), and it now also applies to legacy settings. `prepareModelRefresh` still copies the fresh parse's harness declarations onto both refreshed objects (FD-005). | Inherit; no compat override. | FC-007, FD-005 adjacent; `test/config/config.test.ts`, `test/provider/refresh-harness.test.ts`. |
| C03 | `Config.update` reads, normalizes and validates the stored project `config.json` directly before merging the update. The filtered runtime view, variable substitution and plugin resolution no longer reach the written file; invalid stored config dies before writing. Test: restricted repeated model save in `test/config/config.test.ts`. | Adopt unchanged. The fork's `updateGlobal`, used by the TUI model/provider/context dialogs, already reads the stored file and is unchanged. | Inherit; no compat override. | `test/config/config.test.ts`. |

The complete upstream path set is covered above. The `Info` schema is unchanged, so no SDK/OpenAPI regeneration is required. The compat production overlay under `packages/` remains the same 54 paths. Its `config.ts` hunk is identical before and after propagation, and every other touched path is byte-identical to main.

## Validation

Final runtime/test snapshots: main `b7103b2b17f7201e96a3a563d0b5ac3d127ee51b`; compat `f37f9b0ec111c54fb68f7eccb3d0534768f917ea`.
Bun 1.3.14 (the `packageManager` pin; the default local Bun is newer) installed locked dependencies independently in each worktree with `bun ci`, with npm's bundled node-gyp on the operation PATH as in the CI setup action. No lockfile or manifest changes.
Every ambient `MIMOCODE_*`/`OPENCODE_*` variable is removed; five ambient selectors were present, including `MIMOCODE_EXPERIMENTAL`. Package preload retains isolated tmp roots, the models fixture, a managed config directory, disabled default plugins and an in-memory DB. Host-policy tests set `MIMOCODE_ONLY_CONFIG_DIR_PLUGINS`/`MIMOCODE_CONFIG_DIR` themselves and restore them.

Process boundaries follow `test.yml`: `lifecycle`, `oauth-auto-connect` and `refresh-harness` each run in an independent process, and the rest share one process.

| Branch | Matrix | Result |
| --- | --- | --- |
| main | `bun run typecheck` | exit 0 |
| main | shared: `test/config/` plus `plugin/host-sdk`, `plugin/host-node`, `mcp/project-config-execution`, `mcp/claude-auto-connect`, `mcp/real-transport-oauth`, `tool/harness-alias`, `cli/debug-agent`, `plugin/subagent-progress-chain`, `session/instruction` (20 files) | 246 pass / 4 skip / 1 todo / 0 fail; 747 assertions; 127.81 s |
| main | independent `mcp/lifecycle`, `mcp/oauth-auto-connect`, `provider/refresh-harness` | 33/0 (113 assertions), 4/0 (10), 2/0 (7) |
| compat | `bun run typecheck` | exit 0 |
| compat | same shared set plus `tool/webfetch-hosted`, `tool/websearch-native`, `tool/websearch`, `session/llm-native-websearch`, `tool/registry` (25 files) | 324 pass / 4 skip / 1 todo / 0 fail; 1,024 assertions; 166.77 s |
| compat | independent `mcp/lifecycle` (includes the DC-NET-002 RFC1918 sentinel), `mcp/oauth-auto-connect`, `provider/refresh-harness` | 34/0 (115), 4/0 (10), 2/0 (7) |

The four skips are upstream's existing platform skips. Mutation proof for the FC-004 regression: the child-mode run of `test/mcp/claude-auto-connect.test.ts` passes 9/0. With the guard line deleted, the regression fails 0/1 because `status()` gains a connected `selected` server. The restored `config.ts` is identical to the staged resolution. Root lint has zero errors on both trees (main 3,694 warnings, compat 3,779). The new upstream test hashes to CI unit shard 1, which contains no `mock.module` users.

An exploratory first run combined all 23 main files, including the CI-isolated MCP SDK mock suites, in one process. It produced 38 failures and 3 errors such as `this._transport.send is not a function`, because module-scope SDK mocks leaked into real-transport suites. That composition is invalid by `test.yml`'s own isolation, and it is not counted. Its log is retained.

Not claimed: a Node bundle (`script/build-node.ts`) smoke, desktop integration or local binary delivery.

## Exact-SHA CI and publication

All six final-source workflows succeed on their first attempts; no rerun is used.

| Branch / source snapshot | lint | typecheck | complete test |
| --- | --- | --- | --- |
| main `b7103b2b17f7201e96a3a563d0b5ac3d127ee51b` | [41087578203](https://github.com/onlyfeng/MiMo-Code/actions/runs/41087578203) | [41087578041](https://github.com/onlyfeng/MiMo-Code/actions/runs/41087578041) | [41087578361](https://github.com/onlyfeng/MiMo-Code/actions/runs/41087578361): nine successful jobs; Windows skipped as configured |
| compat `f37f9b0ec111c54fb68f7eccb3d0534768f917ea` | [41088208413](https://github.com/onlyfeng/MiMo-Code/actions/runs/41088208413) | [41088208659](https://github.com/onlyfeng/MiMo-Code/actions/runs/41088208659) | [41088207963](https://github.com/onlyfeng/MiMo-Code/actions/runs/41088207963): all ten successful jobs, including [Windows runtime](https://github.com/onlyfeng/MiMo-Code/actions/runs/41088207963/job/124174862568) |

Both source tips are published only to `onlyfeng/MiMo-Code` by fast-forward pushes. Fresh refs immediately before the documentation publication remain upstream `7bc7dc3a`, main `b7103b2b`, compat `f37f9b0e`; upstream ⊂ main ⊂ compat. The shared FD/FC records, history and this report are main-owned and inherited unchanged; the DC review is compat-only. Documentation-only descendants start no workflow and reuse the source-SHA CI above only with these final-publication checks:

```sh
git diff --quiet b7103b2b17f7201e96a3a563d0b5ac3d127ee51b origin/main -- . ':(exclude)docs'
git diff --quiet f37f9b0ec111c54fb68f7eccb3d0534768f917ea origin/dev/compat -- . ':(exclude)docs'
git merge-base --is-ancestor upstream/main origin/main
git merge-base --is-ancestor origin/main origin/dev/compat
git ls-remote origin refs/heads/main refs/heads/dev/compat
```

Local `main`/`dev/compat` are advanced only by safe fast-forward. Scoped cleanup removes the two operation worktrees and their local branches after verifying they are clean and integrated, together with the operation-only toolchain links; `.omo/` and unrelated branches are preserved. No runtime upgrade or local binary delivery is claimed by this source synchronization.
