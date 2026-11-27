# Upstream synchronization on 2026-11-27 through 4b029a9b

## Scope

Full live synchronization of `6aed4550c95a25204e50ae73f1d9893312d1782a..4b029a9b4cf838f72ecb729345ddf10d8cef9ad0`
(upstream pull request #2870), fetched with branch-only refspecs. The starting
fork tips were `main` `869c4a961774b58d5b541565729f91c088aac61f` and
`dev/compat` `0563324ca3697c4f607653b7a2d964d2e323bd99`. The compat tip
already included the starting main tip. The intervening fork changes since the
previous registry review recorded its publication.

The integration used dedicated worktrees on `sync/upstream-4b029a9b` and
`sync/compat-4b029a9b`. Runtime and test snapshots are
`8c57554c3229ef7ac9654ee0f32293779e794512` on main and
`a7c494174f20b8b7d2a570980aaa822a9a264ba9` on compat.

## Capability inventory (1)

| ID | Selected behavior | main | dev/compat | Decisive paths and tests |
| --- | --- | --- | --- | --- |
| C01 | The default compaction prompt asks for the full summary in the reply body and tells the model to avoid tools and file writes. The next turn receives the plain summary text. | Adopted the upstream prompt. Moved its new assertions into the fork's existing explicit Codex and opt-in auto cases, preserving frozen-prefix parity and the literal `tool_choice: "none"` assertion. | Inherited through a clean merge. The active-tool filter and projection budget remain owned by DC-CONTEXT-001. | `packages/cli/src/agent/prompt/compaction.txt`, registered by `agent/agent.ts` and consumed by `session/compaction.ts`; both frozen-prefix cases in `packages/cli/test/session/prompt-effect.test.ts` check the last request message and the exact summary in the following turn. |

FD-010, FD-011, FD-012 and FC-015 were reviewed together. Summary acceptance,
thinking fallback, empty-step retry, and the frozen request and projection
rules are implemented in the unchanged `session/compaction.ts`. Plugins can
still replace the prompt or add context through `experimental.session.compacting`.
Compat's three production hunks in that file remain identical. The first-parent
diffs on both branches contain the same two changed paths. The wire schema,
migration journal and lockfile have identical contents, so the existing SDK
applies.

## Local validation

Windows with pinned Bun 1.3.14 and dependencies installed using `bun ci`.
Ambient `MIMOCODE_*` variables were cleared. The CLI preloads
`@opentui/solid/preload` and `test/preload.ts` were kept, including isolated test
home, XDG and fixture paths, `MIMOCODE_DISABLE_DEFAULT_PLUGINS=true` and
`MIMOCODE_DB=:memory:`. Only the auto case sets `MIMOCODE_CODEX_MODE=true`
for its own scope.

- `bun run typecheck` from `packages/cli` succeeds on both branches.
- Root `bun run lint` succeeds with zero errors (3,727 warnings on main and
  3,815 on compat).
- `bun test --timeout 120000 test/session/prompt-effect.test.ts -t 'uses the frozen system and appends the compaction prompt'`
  from `packages/cli` passes 2/2 on each branch (224 filtered on main and 259
  on compat).
- The adjacent suite covers `codex-compact`, `compaction-reasoning-fallback`,
  `compaction-tool-choice`, `compaction-projection`,
  `rebuild-boundary-model-context`, `skill-catalog-system-tail`, and
  `summarize-route-outcome` under the same CLI preload and timeout.
  Main passes 44/44 and compat passes 45/45 (96.75 s and 98.94 s).

## Publication

Pending push and exact-SHA CI.
