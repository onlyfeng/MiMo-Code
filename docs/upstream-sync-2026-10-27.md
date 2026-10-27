# Upstream sync 2026-10-27

## Scope and immutable baselines

Full live sync, authorized by `同步 upstream 更新`: `upstream/main -> main -> dev/compat`.
Selected upstream: `d85f355317f1471bf68b5c5a96ab517585e9fdfa`.
Reviewed upstream baseline: `0fe2cbbc33ed90507d053e78475ef93615ed4c51`.
Starting remote main: `0abaacd194a2e899498886c909573fe6aed322a1`.
Starting remote compat: `d12b7bed616f271a3a33aba36e4da8cbaf14746d`.
Both remotes were fetched with branch-only refspecs, without tag changes.
The selected delta has four commits and ten paths, including cleanly merging fork watch surfaces.

Operation resources: two dedicated Git worktrees on local branches
`sync/upstream-20261027` and `sync/upstream-20261027-compat`.
The original workspace started on local compat `5a8382b1`, with untracked `.omo/`;
that user content is preserved. Logs are outside the checkouts.

## Capability inventory (N=4)

Every row audits `0fe2cbbc..d85f3553`; the canonical shared owner is `main`.
No FD, FC or DC owner retires or moves.

| ID | Selected behavior, producer and tests | Main counterpart / relationship / drift | Compat counterpart / relationship / drift | Owners and disposition | Evidence |
| --- | --- | --- | --- | --- | --- |
| C01 | Windows release extraction prefers an existing absolute `%SystemRoot%/System32/tar.exe`, accepting `SystemRoot`, `SYSTEMROOT` or `windir`, then falls back to PATH. `launcher.js:tarCommand`, `extractBinary`, and installation launcher/bin/postinstall fixtures (`7037cc96`). | New helper; Linux and macOS keep `tar`. Existing release URL, checksum, cache and Windows staged-run behavior remain. Adopt unchanged. | Launcher and incoming installation tests match main. The independent DC-PLATFORM-001 archive fallback and ripgrep behavior are untouched. Inherit. | FC-012 publication/launcher; FC-008 CI; adjacent DC-PLATFORM-001. Add the existing launcher suite to the Windows CI job because its prior acceptance entry did not execute this new Windows-only regression. | Both local affected matrices pass; actual Windows launcher CI passes 26/26, including the PATH-shadow zip extraction case. The regression shadows PATH tar with a non-extractor and requires the downloaded Windows zip to unpack. |
| C02 | Explicit provider/model npm selects Anthropic `/messages` for MiMo-named model IDs and aliases. New real-SDK local-server wire suite `test/provider/mimo-npm.test.ts` covers three npm precedence cases and two model IDs each (`ac628364`). | Production behavior already adopted in the prior sync; this commit adds only regression coverage. No second npm resolver or model-name heuristic is introduced. Adopt test. | Existing config xAI Responses routing and SDK option mapping remain DC-PROVIDER-001-owned. The new Anthropic suite is identical to main. Inherit test and retain overlay. | FD-005 identity versus transport separation; DC-PROVIDER-001. | Provider, transform and all three npm wire cases pass on both branches; compat also passes its declared-reasoning wire suite. |
| C03 | README download links, desktop screenshots and Chinese introduction refresh; `README.md`, `README.zh.md`, `assets/readme/mimo-desktop-{cn,en}.jpg` (`d8108f7d`). | Adopt upstream content while retaining existing fork-specific README sections and repository routing. | Clean merge retains compat's existing README additions. Inherit. | FC-012 fork-facing publication/routing. | Diff review preserves the prior fork README delta; both referenced JPEG files exist and have valid JPEG boundaries. No runtime or SDK input changes. |
| C04 | Global workflow concurrency regression uses two children with two agents instead of four, a 100ms settle and unconditional gate release (`d85f3553`). `test/workflow/runtime-nested.test.ts`. | Clean merge adopts four total calls and `[2, 2]` while retaining the fork's existing 60-second two-level-resume budget. That is the only test-file difference against selected upstream. Production global semaphore and bounded workflow cleanup do not change. | Test matches main; Actor/context overlays remain outside this test-only delta. Inherit. | FC-008 bounded workflow cleanup/testing; adjacent FC-001 Actor lifecycle. | Nested/runtime/timeout-cleanup suites pass on both branches, including the exact two-by-two global ceiling case; existing two-level-resume and hung-agent-event skips remain. |

## Validation

Runtime/test source snapshots: main `f49d577b2c7fa51f8444ef5e00297af68dde2211` and compat `19ce44bc94fad9208036fc5731940d05e40fbb71`.
The initial install used the ambient Bun 1.4.3; both checkouts were subsequently
installed again with the repository-pinned Bun 1.3.14 using `bun ci`.
The lockfile remains unchanged. All test commands use Bun 1.3.14.
Default-path commands remove `MIMOCODE_EXPERIMENTAL`,
`MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`, `MIMOCODE_MCP_TOOL_SEARCH` and
`MIMOCODE_CODEX_MODE`. The package preload stays unchanged: isolated HOME/XDG,
in-memory database, default plugins disabled and no experimental selector.
No HTTP, schema or configuration input changed; no SDK regeneration is required.

| Branch | Owning cwd and command | Result |
| --- | --- | --- |
| main | root `bun ci`; CLI `bun run typecheck`; root `bun run lint` | Install and CLI typecheck exit 0; lint 3,672 warnings, zero errors. |
| main | CLI `bun test test/installation test/provider/mimo-npm.test.ts test/provider/provider.test.ts test/provider/transform.test.ts test/workflow/runtime-nested.test.ts test/workflow/runtime.test.ts test/workflow/runtime-timeout-cleanup.test.ts --timeout 120000` | 450 pass, 3 skip, 0 fail; 1,293 assertions; 11 files; 354.73 s. |
| compat | root `bun ci`; CLI `bun run typecheck`; root `bun run lint` | Install and CLI typecheck exit 0; lint 3,757 warnings, zero errors. |
| compat | Same CLI matrix plus `test/provider/openai-responses-reasoning.test.ts test/util/archive.test.ts test/file/ripgrep.test.ts` | 486 pass, 3 skip, 0 fail; 1,393 assertions; 14 files; 162.28 s. |

Both matrices ran as one test process per branch with package preload and the
selectors above removed. These are separate overlapping results, not a combined
unique-case count. The main test process started at `1fae2d5d`; the package tree is
identical at `f49d577b` (the only later non-doc change adds the Windows CI step).
Compat package sources are likewise identical between `26660f52` and `19ce44bc`.
The existing image recompression case took 54 seconds on the loaded local main
run, but passed within the selected 120-second cap. No local test failed.
The three skips on each branch are the Windows-only extraction regression and
the already-skipped two-level-resume and hung-agent-event cases.

The non-test compat overlay path set under `packages/` is unchanged at 54 paths;
launcher, incoming npm suite and nested workflow suite match main exactly.
The selected workflow parses as YAML and its Windows job invokes the launcher
suite. A plain Node v24.22.1 import of `launcher.js` and assertions for the
non-Windows and missing-Windows-environment tar fallbacks also pass; this does
not substitute for actual Windows extraction. All six exact-source-SHA CI workflows pass; see publication below.

## Publication and cleanup

All six exact-source-SHA workflows completed successfully without a rerun:

| Branch / verified source snapshot | lint | typecheck | complete test |
| --- | --- | --- | --- |
| main `f49d577b2c7fa51f8444ef5e00297af68dde2211` | [40468665911](https://github.com/onlyfeng/MiMo-Code/actions/runs/40468665911) | [40468665937](https://github.com/onlyfeng/MiMo-Code/actions/runs/40468665937) | [40468665946](https://github.com/onlyfeng/MiMo-Code/actions/runs/40468665946): nine jobs pass; Windows skipped on main as configured |
| dev/compat `19ce44bc94fad9208036fc5731940d05e40fbb71` | [40468683298](https://github.com/onlyfeng/MiMo-Code/actions/runs/40468683298) | [40468683686](https://github.com/onlyfeng/MiMo-Code/actions/runs/40468683686) | [40468683368](https://github.com/onlyfeng/MiMo-Code/actions/runs/40468683368): all ten jobs pass, including Windows |

Fresh branch-only fetches after publication and near CI completion still select
upstream `d85f355317f1471bf68b5c5a96ab517585e9fdfa`; the remote runtime tips equal
the two verified source snapshots above. Their ancestry is upstream -> main -> compat.
The final registry/report commits change only `docs/`, so they start no workflow.
They reuse these runs only with outside-docs tree equality and ancestry proven:

```sh
git diff --quiet f49d577b2c7fa51f8444ef5e00297af68dde2211 origin/main -- . ':(exclude)docs'
git diff --quiet 19ce44bc94fad9208036fc5731940d05e40fbb71 origin/dev/compat -- . ':(exclude)docs'
git merge-base --is-ancestor upstream/main origin/main
git merge-base --is-ancestor origin/main origin/dev/compat
```

The shared FD/FC registries advance only this review; bundled guidance retains
its prior content snapshot. Compat inherits the shared registries/report exactly
and records its eleven retained DC owners in its own registry. No PR or remote
temporary branch was created.
Cleanup is limited to the two operation-created clean, integrated Git worktrees
and local branches. Local main and compat may fast-forward after checking they
have no unique work; the pre-existing `.omo/` is preserved. Final remote-tip,
outside-docs equality, ancestry and cleanup checks are repeated after this
record's docs-only publication.
The actual Windows job [122070223754](https://github.com/onlyfeng/MiMo-Code/actions/runs/40468683368/job/122070223754) passes the launcher suite 26/26. Its log explicitly reports `(pass) ensureBinary > extracts a Windows zip when another tar comes first on PATH` (167.19 ms); this supplements the local macOS skip with Windows execution evidence.
