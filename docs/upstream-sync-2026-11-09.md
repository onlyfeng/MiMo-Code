# 2026-11-09 upstream synchronization

## Scope and immutable inputs

Full live synchronization authorized by “同步 upstream 更新”, through
`upstream/main -> onlyfeng/MiMo-Code main -> dev/compat`.

- Selected upstream: `26d1f3a601ab29533a2eaf787895236b92c9aed7`; previous reviewed upstream / merge base: `3a12665a9e27789b04dc7529d4ce0c10128e9ad8`.
- Starting main: `dee7b1b84b7853bf47b43aea3d490e1b42dc7792`; starting compat: `c9aac17e023b5d7d4d28d11071077a79f3a4101f` (already contains starting main).
- Branch-only, tag-preserving origin/upstream fetch on 2026-11-09.
- Complete incoming delta: one commit, four files, seven insertions and two deletions.
- Original checkout: dev/compat, only untracked `.omo/`; preserve it. Two operation-created temporary Git worktrees/branches, one for each target; no pre-existing linked worktrees.

## Capability inventory (N=1)

| ID | Selected behavior / relationship | Main result | dev/compat result | Owner and decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Explicit Compose Next Report/Journey log empty states; adopt upstream unchanged | Report uses `[Not finalized yet]`; Journey log uses `None`, replaced when useful entries exist | Inherit identical bundled guidance and three spec examples | Canonical main FC-011; `packages/cli/src/skill/builtin/.bundle/compose-next/SKILL.md`, `docs/compose/spec/{agent-cli-skills-switch,always-direct-mcp-tools,host-error-registry}.md`; existing `test/skill/builtin.test.ts` and `test/skill/search.test.ts` cover bundle/discovery integration |

Reviewed active FD/FC entries on starting main and all eleven DC entries on
starting compat. Only FC-011's bundled guidance watch surface changes. FC-005
permission-consistent discovery and DC-CONTEXT-001 skill content caps are adjacent
consumers with no changed contract. Both branches start with byte-identical
Compose Next guidance. Its explicit invocation, workspace, source tracking,
finalization and publication authorization rules remain unchanged. No owner
retires or changes branch. No runtime, test, migration, schema, SDK, generated
output, manifest or lockfile changes; no bulk migration of existing specs.

## Validation and publication

Guidance content snapshot: `e7805cfb3903a8f7a0aafd6fd024b5e74bf49b3d`. Historical runtime/test registry snapshots
remain historical. Local validation checks whitespace, relative documentation
links, exact adoption of all four upstream files, shared registry equality,
and whole-tree equality against each starting branch outside docs and the one
bundled skill file. This content-only change adds no tests. Focused local integration results and dependency setup are recorded below.

The bundled skill lives outside docs, so the initial publication triggers all
three workflows for each branch, including compat's Windows acceptance. Required
exact-SHA CI, final remote equality, live upstream refresh and ancestry proof are
incomplete because GitHub refuses workflow execution (details below). A docs-only receipt preserves the acceptance trees but cannot supply missing successful CI. Operation resources are removed only after integration
and clean-state verification; original `.omo/` must remain untouched.


## Execution receipt: published, CI blocked

| Branch | Published acceptance SHA | Focused local regression | Remote CI |
| --- | --- | --- | --- |
| main | `b3f6bfd6d7ec93853bc3b83f8d8e9d54ae45cfb9` | 16 pass, 0 fail, 47 assertions | no runs; blocked |
| dev/compat | `80217fac92e4cf4d134a724369369aa3b69df74a` | 16 pass, 0 fail, 47 assertions | no runs; blocked |

Both regressions ran from their own `packages/cli` directory with Bun 1.3.14
(`0d9b296a`): `env -u MIMOCODE_EXPERIMENTAL -u MIMOCODE_MCP_TOOL_SEARCH -u MIMOCODE_CODEX_MODE bunx --bun bun@1.3.14 test test/skill/builtin.test.ts test/skill/search.test.ts --timeout 120000`.
Each exited 0 in 3.30 seconds; no skips/filter misses. Package preload remains
`@opentui/solid/preload` plus `test/preload.ts` (`MIMOCODE_DB=:memory:`, managed
fixtures and default plugins disabled); no additional feature selector was set.
The regression proves existing bundle/discovery integration, not that an agent
will follow every sentence of guidance.

Initial `bun ci` on local Bun 1.4.3 stalled in native dependency install scripts
and was terminated only for operation-owned processes. An early test attempt
before installation completed ran zero cases because a dependency was missing;
this is not a product regression or passing evidence. Final frozen installs used
`bun ci --ignore-scripts --linker hoisted` (1047 packages each, exit 0; Bun 1.4.3),
then tests used the pinned Bun 1.3.14. Native build scripts were skipped; no native
runtime or binary acceptance is claimed. `bun.lock` remains unchanged. Logs are
operation-local temporary execution artifacts, not shipped content.

Remote proof after initial publication matched both complete SHAs above, and a
fresh upstream branch fetch still selected `26d1f3a6`. Git ancestry proves selected
upstream -> main -> compat. Static checks pass for whitespace, local relative
links, exact upstream adoption, identical shared records and complete tree equality
outside docs and the selected bundled skill file against each starting branch.

GitHub created no push runs for either SHA. Manual dispatch of `lint.yml` on main
was rejected with HTTP 422: `Actions has been disabled for this repository.`
Repository Actions permissions still report `enabled: true`, all four workflows
are active, and the repository is neither archived nor disabled. Those settings
do not explain the service-side refusal. Account usage lookup returned HTTP 404
and reported that the current token lacks the `user` scope; billing/usage as a
cause is unverified. No settings, token scopes or spending limits were changed.

**Acceptance is incomplete.** After the account/repository execution restriction
is resolved, dispatch lint/typecheck/test on both final branch tips (compat test
with `windows_runtime=true`), verify each run's exact `headSha`, and repeat live
remote-tip and ancestry proof. Local tests and docs-only tree equivalence cannot
replace the missing remote successes. The final receipt changes only docs;
cleanup is limited to clean, integrated operation-created worktrees/branches,
with the original checkout's `.omo/` preserved.
