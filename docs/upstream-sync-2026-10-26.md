# Upstream sync 2026-10-26

## Scope and immutable baselines

Full live sync, authorized by `同步 upstream 更新`: `upstream/main -> main -> dev/compat`.
Selected upstream: `0fe2cbbc33ed90507d053e78475ef93615ed4c51` (four non-merge commits over the reviewed baseline).
Reviewed upstream baseline: `e37f2c2d01460df19b31d67b8116d6c66fe33db8`.
Starting main: `06fda781992309ec8e68518b5b08f0c5dd0378bc`.
Starting compat: `5a8382b16be549fc09d3aa1e492a82f78f7f6641`.
Both remotes were refreshed with branch-only refspecs and no tag changes, and refreshed again before publication with unchanged tips. The main workspace stays on compat with its pre-existing untracked `.omo/` preserved.
Operation resources: two dedicated sibling worktrees on local branches `sync/upstream-20261026` and `sync/upstream-20261026-compat`. No remote temporary branch or PR was created. Logs stay outside the checkouts.

## Capability inventory (N=5), reconciled

All rows audit `e37f2c2d..0fe2cbbc`. Shared canonical owner is `main`; compat inherits with the listed overlay.

| ID | Selected behavior and surfaces | Main counterpart / relationship / drift | Compat counterpart / relationship / drift | Owners and disposition | Evidence |
| --- | --- | --- | --- | --- | --- |
| C01 | Agent-CLI skills (`claude-code`, `codex`, `grok-build`) extract only with `MIMOCODE_ENABLE_AGENT_CLI_SKILLS=true` instead of following the `claude`/`codex` binaries on PATH. `flag/flag.ts`, `skill/builtin/extract.ts` (`AGENT_CLI_SKILL_NAMES`, `shouldExtractBuiltinSkill` replace `REQUIRED_COMMANDS`/`isBuiltinSkillInstalled`), the three bundled descriptions, deleted host-only `agents/openai.yaml`, the `mimocode-docs` discovery row, README rows and the delivered spec (upstream `18adffc9`). | `extract.ts` and the bundles were byte-identical to the old upstream. The only conflict is `test/skill/builtin.test.ts`, where the fork's PPTX guidance regression (FC-011) sits beside the replaced binary-gating cases. | Identical to main; inherits. | FC-005 (extract set only; discovery, permission and catalog gates unchanged), FC-011 (bundled content). Adopt; keep the PPTX regression. | Both branches pass all nine `test/skill/` files in the focused matrix. A real `debug skill` run from source, with isolated HOME/XDG and the selector removed, lists 24 skills without the three agent-CLI skills; with `MIMOCODE_ENABLE_AGENT_CLI_SKILLS=true` it lists 27, including all three. |
| C02 | The Anthropic environment block no longer adds `Claude Code is available as a CLI` from a PATH probe. `session/system.ts` (`18adffc9`). | The fork's `system.ts` uses `InstanceState`, resolved harness prompts and the permission-filtered catalog; it has no other `which` use. Clean merge. | The compat available-skills byte cap is retained (DC-CONTEXT-001). | FD-002, FD-005 and FC-005 watch this file; no owner changes. Prefixes captured earlier keep their frozen environment text; new captures omit the line. Adopt. | `test/session/system.test.ts`, `llm-system-prompt.test.ts` and `llm.test.ts` pass on both branches. |
| C03 | Release `0.1.16` across `packages/{cli,plugin,sdk,shared}/package.json` and the workspace entries of `bun.lock` (`d3c71e33`). | The fork's extra `quickjs-emscripten-core@0.32.0` `patchedDependencies` line (FC-019) merges cleanly. The quickjs and `@jitl` versions do not change, so FC-019's rerun-without-patch trigger is not engaged. | Identical to main; inherits. | FC-012 (release record), FC-019 (lock watch). Adopt. | Bun 1.3.14 `bun ci` completes on both branches without a lockfile diff. |
| C04 | Tag releases drop the unit `test` job (build needs typecheck and lint only); `script/fds-upload.ts` defaults to the external `cnbj1.fds.api.xiaomi.com` endpoint, with `MIMO_FDS_ENDPOINT` still overriding (`b8dbe084`). | `release.yml` and `fds-upload.ts` were identical to the old upstream. The required fork `GH_REPO` in `script/release.ts` is untouched. | Identical to main; inherits. | FC-012, FC-008 (CI). Adopt. A tag release now relies on exact-SHA branch CI rather than rerunning unit tests; no publishing stage ran during this sync. | Root `script/release.test.ts` passes 11/11; root typecheck, including `tsconfig.scripts.json`, exits 0. |
| C05 | The declared model npm is used as is: `isMimoOrSmartModel`/`resolveModelNpm` are removed, so models.dev and config models take the model or provider `npm`, then the existing or catalog value, then `@ai-sdk/openai-compatible` (`0fe2cbbc`). | The fork's `harness_model` additions to `provider.ts` are disjoint; clean merge. FD-005 recorded the old pin as the adopted transport position; transport now follows the declared SDK, and FD-005 still owns only identity resolution. | DC-PROVIDER-001 routes a config provider on `@ai-sdk/xai` to Responses; a MiMo-named id there now reaches that routing instead of being pinned. The only conflict is `test/provider/provider.test.ts`: the compat xAI wire test is kept unchanged beside upstream's renamed npm tests. | FD-005 (text updated), DC-PROVIDER-001. Adopt. | Provider, transform, capability-registry, model-groups, refresh, gpt and harness-alias suites pass on both branches; compat additionally passes `openai-responses-reasoning.test.ts`. |

## Validation

Bun 1.3.14 (the `packageManager` pin) ran through `bunx`. Default-path commands remove the ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` found in the shell and unset `MIMOCODE_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE` and `MIMOCODE_ENABLE_AGENT_CLI_SKILLS`. The package preload is unchanged: isolated HOME/XDG, in-memory database, default plugins disabled, no experimental selector. No HTTP, schema or config input changed, so the SDK was not regenerated.

| Branch / snapshot | Owning cwd and command | Result |
| --- | --- | --- |
| main `33f43f4d` | root `bun ci`; CLI `bun run typecheck`; root `bun run typecheck`; root `bun lint` | Install and both typechecks exit 0; lint 3,672 warnings, zero errors; lockfile unchanged. |
| main `33f43f4d` | CLI `bun test test/skill` plus provider (provider, transform, capability-registry, capability-registry-wire, model-groups, refresh, refresh-harness, refresh-boundaries), session (system, llm-system-prompt, llm) and tool (gpt, harness-alias) files, `--timeout 120000` | 574 pass, 0 fail, 22 files, 65.88 s. |
| main `33f43f4d` | root `bun test script/release.test.ts` | 11 pass, 0 fail. |
| main `33f43f4d` | CLI `bun run --conditions=browser ./src/index.ts debug skill`, isolated HOME/XDG, selector unset and `=true` | 24 skills without, 27 with the three agent-CLI skills. |
| compat `07dc3d41` | root `bun ci`; CLI and root `bun run typecheck`; root `bun lint` | Install and both typechecks exit 0; lint 3,757 warnings, zero errors; lockfile unchanged. |
| compat `07dc3d41` | Same CLI matrix plus `test/provider/openai-responses-reasoning.test.ts` | 586 pass, 0 fail, 23 files, 60.76 s. |

The compat conflict resolution reproduces compat's previous test overlay exactly: its diff against main's resolved test equals the old compat-versus-main diff. The non-test overlay path set under `packages/` is identical before and after the merge (54 paths when counted as every path outside `/test/`). All eleven DC owners are retained.

## Publication

All six exact-source-SHA workflows completed successfully:

| Branch / verified source snapshot | lint | typecheck | complete test |
| --- | --- | --- | --- |
| main `33f43f4d200fb7609c9d281e7f06f285960b79b7` | [40323450269](https://github.com/onlyfeng/MiMo-Code/actions/runs/40323450269) | [40323450248](https://github.com/onlyfeng/MiMo-Code/actions/runs/40323450248) | [40323450354](https://github.com/onlyfeng/MiMo-Code/actions/runs/40323450354): nine jobs pass; Windows runtime skipped on main as configured |
| dev/compat `07dc3d41b0cc199e8b6401c8c2ac7b85f8f90eb9` | [40323600788](https://github.com/onlyfeng/MiMo-Code/actions/runs/40323600788) | [40323602290](https://github.com/onlyfeng/MiMo-Code/actions/runs/40323602290) | [40323600734](https://github.com/onlyfeng/MiMo-Code/actions/runs/40323600734): all ten jobs pass, including the Windows runtime |

Fresh branch-only fetches after CI still select upstream `0fe2cbbc33ed90507d053e78475ef93615ed4c51`; the remote runtime tips equal the two snapshots above, and ancestry runs `upstream/main -> main -> dev/compat`. The final registry and report commits are confined to `docs/`, so they start no workflow. They inherit these runs only after outside-docs equality is proven with:

```sh
git diff --quiet 33f43f4d200fb7609c9d281e7f06f285960b79b7 origin/main -- . ':(exclude)docs'
git diff --quiet 07dc3d41b0cc199e8b6401c8c2ac7b85f8f90eb9 origin/dev/compat -- . ':(exclude)docs'
git merge-base --is-ancestor upstream/main origin/main
git merge-base --is-ancestor origin/main origin/dev/compat
```

Cleanup targets only the two operation-created worktrees and their two local branches, after clean-state and integration checks. The existing `.omo/`, unrelated resources and tags are preserved.
