# 2026-11-06 upstream synchronization

## Scope and immutable inputs

Full live synchronization, authorized by “同步 Upstream 更新”, through
`upstream/main -> onlyfeng/MiMo-Code main -> dev/compat`.

- Selected upstream: `3a12665a9e27789b04dc7529d4ce0c10128e9ad8`.
- Previous reviewed upstream / merge base: `10b03cf04fe43aae89638e90570779c1e1216c5a`.
- Starting main: `9550108ac29870628a3a9c5c1d6b920259651eea`.
- Starting compat: `4ad2d84daa40c2e787becbdc081f06369cbaed78` (already includes starting main).
- Refreshed origin and upstream branch refs without tags on 2026-11-06.
- Complete incoming range: one commit, one file (`SECURITY.md`), 19 insertions and 7 deletions.
- Preserve the original checkout’s untracked `.omo/` and pre-existing linked worktree. Only operation-created resources qualify for cleanup.

## Capability inventory (N=1)

| ID | Selected behavior / relationship | Main result | dev/compat result | Owner and decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Document existing non-interactive workspace-trust bypass and run approval; adopt content with retained fork security routing | Merge upstream security text; preserve fork private-reporting section | Inherit shared security text unchanged; retain every compat override | FC-012 canonical main owner; adjacent FD-001, FD-002, FD-004, FC-004, FC-007 and DC-SESSION-001; `SECURITY.md`, `cli/cmd/tui/thread.ts`, `cli/cmd/run.ts`, `cli/cmd/run-approval.ts`, `project/workspace-trust.ts` |

Reviewed active FD/FC records on starting main and all twelve DC records on
starting compat, including semantic adjacency without path overlap. Only
FC-012’s watch surface is edited by upstream. No owner retires or changes branch.

`checkTrust`/`markTrusted` have no production caller outside TUI `thread.ts`;
its trust gate precedes worker/config startup. Run approval’s live invocation
correlation returns `reject` normally and `once` under yolo, and ignores foreign
requests. Permission evaluation rejects explicit denies before asking. These
facts support the incoming documentation without changing the retained FD-001
approval scope. Main and compat have identical run, run-approval, workspace-trust,
serve and ACP files. Compat config adds provider/search policy but no trust gate;
its process ownership remains separate from workspace trust. FC-004’s pending
Claude MCP connections remain subject to their existing startup controls.

The fork-specific Reporting Security Issues section must remain byte-identical
to starting main, and shared security/FD/FC/history/report files must be identical
on both final branches.

## Validation and publication receipt

This selection changes only security documentation and review records. No
runtime, tests, migrations, SDK inputs, generated outputs, manifests or lockfile
are changed. Verify the complete tree outside `SECURITY.md` and `docs/` against
each starting branch with `git diff --quiet`. Check whitespace, local Markdown
links and preserved private-reporting content. No new tests or local dependency
installation are needed for this content-only change; no local runtime test pass
is claimed. Historical behavior snapshots in registries remain historical.

`SECURITY.md` is outside `docs/`, so this push triggers lint, typecheck and test;
the docs-only ancestor exception does not apply. Required final-tip workflow
results, refreshed remote SHAs and upstream/main/compat ancestry remain pending
until obtained in the execution receipt. A previous SHA’s CI is not final-tip CI.

Sync completion requires all three workflows to succeed for each exact branch
tip (compat includes its configured Windows runtime acceptance), remote equality,
a final live upstream refresh and operation-scoped cleanup. The final execution
receipt reports these outcomes separately from the content review above.
