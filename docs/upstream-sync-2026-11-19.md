# Upstream synchronization on 2026-11-19

## Scope

Full live synchronization through `75e1ed0b3b6561796bdfeb36edcf091f9793f24d`, starting from the previous review at `53e481145a6abedae20346ad2cdccdaee299a699`. The starting fork tips were `14af2d4cf623357c42c2c268b19c5b03dec12fdb` on `main` and `938df325fb90b768941900b7b7eaf0ff260702b5` on `dev/compat`. Two dedicated Git worktrees housed integration. The original checkout started clean on `dev/compat`.

## Capability inventory and results (3)

| ID | Selected behavior | Main result | dev/compat result | Decisive paths and tests |
| --- | --- | --- | --- | --- |
| C01 | `b24e577f` splits media from plain `read` into `read_image`, `read_audio` and `read_video`. Model and adapter support govern discovery and execution. Media `@` references dispatch to the readers. PDF references inline only with PDF input support. | Adopted with the fork's resolved harness, read and external-directory permissions, fixed session cwd, legacy session path placeholder and bounded nested exec evidence. FD-001/005/006/010–012 and FC-007/009/011/015/020/041 cover related consumers. | Inherited alongside native web search and the existing image preflight, prefix and session ownership contracts. Reviewed DC-CONTEXT-001, DC-MODEL-001, DC-ACTOR-001, DC-WEBSEARCH-001 and DC-SESSION-001. | `tool/read-common.ts`, `tool/read-media.ts`, `tool/registry.ts`, `tool/tool-script.ts`, `session/prompt.ts`, `session/compaction.ts`. Regressions cover gated readers, permission, historical path placeholders, media references, frozen execution, and image request preflight. |
| C02 | `09ce279e` identifies image, audio and video tool calls by kind. | Adopted in TUI and CLI. ACP reports the read kind and path from C01. | Inherited alongside DC-TUI-001 request metadata and DC-CONTEXT-001 projection. | `tool/media-kind.ts`, `cli/cmd/run.ts`, `cli/cmd/tui/routes/session/index.tsx` and `acp/agent.ts`. The kind mapping has unit coverage and CLI typecheck covers the rendering paths. |
| C03 | `75e1ed0b` accepts credentials with non-string desktop metadata and preserves raw sibling entries on writes. | Adopted. The decoded credential contract still exposes string metadata. | Inherited directly with the same provider-family behavior. | `auth/index.ts`, auth tests and provider credential-write, Xiaomi family and MiMo plugin tests. |

The SDK, public endpoint schemas, migrations and lockfile match the respective starting forks. The compat image token estimator, overflow and checkpoint code, and native web search and hosted fetch implementations match the starting compat. The merge preserves the branch's provider-call image regression.

## Local validation

Windows used Bun 1.3.14 from the lockfile and both branches passed `bun run typecheck` in `packages/cli` and root `bun run lint`. Lint reported 3,737 warnings on main and 3,822 on compat, with zero errors. An incomplete dependency installation in the second worktree produced module and type errors. Compat validation used the complete frozen-lock install from the first worktree, where both branches have the same dependency manifests and lockfile.

The test commands ran in `packages/cli` with all ambient `MIMOCODE_*` variables cleared. Package preload supplies isolated HOME, USERPROFILE and XDG paths, `MIMOCODE_TEST_TMPDIR_ROOT`, `MIMOCODE_TEST_OUTSIDE_GIT_ROOT`, `MIMOCODE_TEST_MANAGED_CONFIG_DIR`, `MIMOCODE_MODELS_PATH`, `MIMOCODE_DISABLE_DEFAULT_PLUGINS=true` and `MIMOCODE_DB=:memory:`. Compat also releases the process-liveness lock at teardown.

- Main ran the 17-file matrix covering `test/auth`, the provider credential consumers and MiMo plugin, the read and registry tool suites, permissions, prompt, system, compaction projection and tool choice, exec carriers, memory path and run approval. It recorded 316 passes and two failures over 934 assertions. Both failures also reproduced at the starting compat checkout. The image-envelope fixture supplies a drive-less POSIX file URL. The read-normalization fixture strips the drive from a path on a different volume than the checkout. The nested exec attachment regression passed separately.
- Compat ran the same contracts in three processes. The media and permission matrix passed 204 tests, prompt passed 70, and auth plus provider consumers passed 45. The two reproduced Windows fixture cases were filtered by test name. Native search passed another 39 tests. The focused checkpoint and overflow matrix passed 71 tests with 334 filtered and 178 assertions. It includes the real provider-dispatch regression for a large current-turn PNG and the active-turn image floor. The broader compaction run surfaced an assertion that `bash` is inactive in a frozen prefix. The same expected-false, actual-true failure reproduced before the sync.
- Local logs use the `mimo-sync-75e1ed0b-` prefix in the OS temporary directory. The test processes used `--timeout 120000` and the compat runs used explicit test-name filters for the two Windows fixtures.

## Publication and CI

The fork accepted the two runtime commits in one atomic push. The runtime snapshots are `1d0a9ee8c93c5a723aee4740a4c104fd3ef7e574` and `9771c91853c8650402eac6631ddf4b57a5927f51`. Remote branches matched those commits and upstream still pointed at `75e1ed0b3b6561796bdfeb36edcf091f9793f24d`. Git ancestry places the upstream tip under main and main under compat.

The exact runtime SHAs had no Actions runs. Manual dispatch of lint, typecheck and test returned HTTP 422, “Actions has been disabled for this repository,” for both branches. Compat test dispatch included `windows_runtime=true`. The repository permissions endpoint reports Actions enabled and all three workflows are active. The dispatch response blocks exact-SHA acceptance. The two review commits change only `docs/` and have the same trees outside that directory as their runtime snapshots. GitHub CI acceptance remains pending.
