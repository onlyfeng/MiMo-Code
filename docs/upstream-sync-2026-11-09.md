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
bundled skill file. This low-impact content-only change adds no tests and requires
no local dependency installation; no local runtime test pass is claimed.

The bundled skill lives outside docs, so the initial publication triggers all
three workflows for each branch, including compat's Windows acceptance. Required
exact-SHA CI, final remote equality, live upstream refresh and ancestry proof are
pending. A later docs-only receipt may reuse these runs only with proven complete
tree equality outside docs. Operation resources are removed only after integration
and clean-state verification; original `.omo/` must remain untouched.
