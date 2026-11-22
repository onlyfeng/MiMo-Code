# Upstream synchronization on 2026-11-22

## Scope

Full live synchronization through upstream
`2c76c13c85ef41fe206f9a54d1d0e9da97319cfb`, fetched on 2026-11-22. Fork `main`
had last reviewed `128adcb782a72ef3d10752ab9c14e4fdcb319099`
([2026-11-21](upstream-sync-2026-11-21.md)); upstream added one commit since.
The starting tips were `6a3c8173b57826139ecaaae00d3021c945a8310e` on `main`
(the merge of pull request #263) and `7723f83da65184447892c4c81a1171e8ad4e5008`
on `dev/compat`. Compat had last reviewed upstream
`75e1ed0b3b6561796bdfeb36edcf091f9793f24d` and had not yet received pull
request #263, so its propagation carries both upstream commits.

Two dedicated worktrees on `sync/upstream-2c76c13c-main` and
`sync/upstream-2c76c13c-compat` housed the integration; the original checkout
was not touched. `bun.lock` and `packages/cli/migration/` are unchanged on both
branches. Regenerating the SDK from each branch's merged sources reproduces the
committed generated files exactly.

Runtime/test snapshots: `main` `da9e883f6ecf9c1dbfde19d4e4161e1065124f05`,
`dev/compat` `671bb78490a76405f8213fc8724bb596a74f2695`.

## Capability inventory and results (2)

| ID | Selected behavior | Main result | dev/compat result | Decisive paths and tests |
| --- | --- | --- | --- | --- |
| C01 | `128adcb7` live skill discovery and persisted user-turn catalog reminders (one entry per context window, then fingerprinted deltas), with upstream's prefix rotation. | Adopted by pull request #263 (`6a3c8173`, runtime `d6604cee`) as recorded in [the 2026-11-21 record](upstream-sync-2026-11-21.md); unchanged here. | Inherited. DC-CONTEXT-001 keeps its 50 KiB catalog cap, now applied in `renderSkillCatalogReminder`; `getFrozen` also strips a capped system-tail catalog. The strict capped-v2 recognizer and `skillCatalogInSystem` retire. Pin-winner selection follows `main`, with compat's loaded-MCP tools hash and current-turn projection. DC-MODEL-001 and DC-ACTOR-001 reviewed. | `session/skill-reminder.ts`, `session/skill-catalog.ts`, `session/prompt.ts`, `session/message-v2.ts`, `session/llm-request-prefix.ts`, `session/compaction.ts`; `skill-catalog-compat-projection.test.ts`, `skill-catalog-compat-capture.test.ts` and the shared catalog/prefix suites. |
| C02 | `2c76c13c` `GET /experimental/session` accepts `view=brief`, which reads only summary columns and omits `prompt`, `permission`, `revert` and `summary.diffs`; the default response stays full. | Adopted. The upstream route case moves its fixture under `root: "cwd"`, the FC-008 convention for tests that pass the InstanceMiddleware containment check. FC-035's `revert.files` stays in the full view. | Inherited unchanged. Compat's separate model-selection route in the same file is unaffected. | `session/session.ts` (`fromBriefRow`, `listGlobal`), `server/routes/instance/experimental.ts`, `packages/sdk/src/v2/gen/`; `test/server/global-session-list.test.ts`. |

### dev/compat resolution (C01)

The merge of `main` into compat conflicted in six files (nine hunks), all on
the catalog's move out of the system prompt. Each was resolved by capability:

- **Prefix pin and rotation** (`prompt.ts`, cold capture and run loop). Follow
  `main`: a cold pin adopts a winning row only when it froze the same tools,
  otherwise the loop rotates to its own system and tools, and a tools-hash
  change rebuilds the system from current additions. Compat keeps the third
  `toolsHash` argument (loaded MCP membership), `currentUserID` on every
  prefix build, and `currentTurnMessages`, which no longer needs re-projecting
  after a pin race because the catalog is not in the system.
- **Compaction** reads the row through `getFrozen` and keeps compat's
  `frozenActiveTools` restoration from the legacy `active_tools` column.
- **Projection** (`message-v2.ts`, `llm-request-prefix.ts`) drops the
  `skillCatalogInSystem` option and keeps compat's current-turn boundary.
- **Catalog cap.** `SystemPrompt.skills` no longer renders text, so the
  DC-CONTEXT-001 cap moves to `renderSkillCatalogReminder`: the
  `<available_skills>` body of an entry and of an update's changed skills is
  head-capped with the existing marker, the wrapper stays intact, and the
  metadata still records the whole announced state.
- **Historical recognizer.** `isTruncatedCompatCatalog` retires. `main`'s v2
  recognizer accepts every engine-generated v2 snapshot without a
  `<skill_content` body and checks the stored hash only when one is present;
  compat hashed its capped output, so its historical snapshots still match.

One gap was not a textual conflict. `getFrozen` removes a system-tail catalog
only when it ends at `</available_skills>`, but compat froze capped catalogs
that end at the cap's truncation marker. An old compat session with a large
catalog would have kept the stale catalog in its frozen system beside the new
entry reminder. Compat's `LEGACY_SYSTEM_CATALOG` now ends a block at whichever
terminator comes first. "compat strips its capped system-tail catalog from a
frozen system" failed before the change and passes after it, as does "compat
caps the catalog entry and update reminders at the model-visible budget" for
the moved cap.

The compat-only tests follow the new rules: the projection suite keeps the
capped-snapshot, UTF-8 producer, strip and cap cases and drops the negative
cases of the retired strict recognizer, whose inputs `main`'s recognizer now
deliberately accepts; the capture suite asserts that a cold capture adopting a
pin winner projects the stored v2 snapshot into neither the inherited nor the
current-turn view.

## Local validation

macOS 15 (Darwin 24.6) with local Bun 1.4.3; the repository pins 1.3.14, so
CI remains the authority. Dependencies came from `bun ci`. `packages/cli`
`bun run typecheck` passes on both branches; root `bun run lint` reports zero
errors (3,732 warnings on `main`, 3,820 on compat).

Every run cleared the ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH`,
`MIMOCODE_CODEX_MODE`, `MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS`,
`MIMOCODE_ENABLE_AGENT_CLI_SKILLS`, `MIMOCODE_ENABLE_ANALYSIS`,
`MIMOCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT`, `MIMOCODE_ENABLE_EXA`,
`MIMOCODE_EXPERIMENTAL_TOKEN_EFFICIENCY` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`
and used `--timeout 120000`; the package preload supplies the usual harness
baseline. `HOME` was also set to an empty directory at process start. Bun
caches `os.homedir()` when the process starts, so the preload's HOME override
does not reach the global `~/.claude/CLAUDE.md` lookup in `instruction.ts`; on a
machine that has that file it enters the system prompt, and
`prompt-skill-command-multi` "pins system prompt and harness when the first
user query is a command" and `prompt-effect` "loop injects instruction files
but not the dynamic environment block" fail. Both pass with the empty HOME.

Focused runs:

- `main`: `test/server/global-session-list.test.ts` 5 pass. Before the fixture
  change the route case returned 403; with the route's `view` argument removed
  it fails. Session list, sync restore, actor liveness, revert and snapshot
  suites: 100 tests, all passing after the fixture change.
- compat: catalog, skill, command, prefix, projection and session-list suites
  313 tests in 34 files; `prompt-effect` 254 pass, 2 skip; MaxMode, overflow,
  checkpoint-writer and system suites 165 pass. Failures are the HOME case
  above and the three listed below.

Full CI-equivalent runs used the `test.yml` unit-shard membership (`cksum % 4`,
same exclusions, one `bun test` process per shard with a JUnit report):

| Tree | Tests | Fail | Skip |
| --- | ---: | ---: | ---: |
| compat `671bb784` | 7,797 | 21 | 31 |
| compat starting tip `7723f83d` | 7,780 | 21 | 31 |
| main `da9e883f` | 7,365 | 18 | 31 |

The two compat failure sets are identical except for two shared-process cases. The
`classify-integration` "full-context fork binds live dispatch only to matching
frozen schemas" pair failed twice on the merge and once on the starting tip;
`sync/restore-order` "an unchanged unsorted envelope retries without writes"
failed only on the starting tip. Both pass alone and in whole-file runs on both
trees, and a concurrent rerun of shard 3 on both trees passed the classify pair
on both. The nineteen failures common to both trees:

- `codex-compact` (8) and `actor-subagent-gating` (1): the explicit-Codex
  harness cases listed in the 2026-11-21 record.
- `prompt-effect` (3): "uses the frozen system and appends the compaction
  prompt ... with auto" and the two "frozen hidden tools ... through exec"
  cases, as in the 2026-11-19 and 2026-11-21 records.
- `tool/actor` (3): variant resolution against the local model catalog.
- `provider-event-timeout` (2) and `cli/tui/collapse` (1): local-Bun failures
  recorded before.
- `experiments/tool-schema-runner` (1): experiment model defaults.

Correction: only the `provider-event-timeout` and `collapse` cases are local.
The other fifteen also failed in CI once Actions was restored; they are
regressions from the 2026-11-13 synchronization, fixed in pull request #264.
See [CI after Actions was restored](#ci-after-actions-was-restored).

`main` fails seventeen of these (its `tool/actor` file has one of the three
variant cases; the other two are compat's DC-ACTOR-002 tests) plus
`prompt-effect` "full-context MCP dispatcher rejects changed frozen schemas".
That case passes alone twice on `main`, and it passed in both the shard and
whole-file runs on compat, which carries the same `main` changes; the only
change on `main` since `6a3c8173` is the session-list view.

Logs and reports stayed in the session scratch directory and were not
committed.

## Publication and CI

This record is published together with the runtime commits in one atomic push
of `main` and `dev/compat`; the review commits that carry it change only
`docs/` and have the same trees outside that directory as the runtime
snapshots above.

Exact-SHA CI is blocked. Before publication, dispatching `typecheck.yml` on
`main` returned `HTTP 422: Actions has been disabled for this repository`, as
in the two previous synchronizations; the last GitHub Actions runs on the
fork date from 2026-11-06. The local runs above are the only evidence for
these commits until Actions is restored, after which lint, typecheck and test
(compat with `windows_runtime=true`) should be dispatched on both branch tips.

### CI after Actions was restored

The owner re-enabled GitHub Actions on 2026-11-22. The first exact-SHA runs
on the published tips passed lint on both branches and typecheck on `main`
(runs 44963791505, 44963813960, 44963818489). The other three failed:

- **compat typecheck** (44963821472): the compat capture test introduced by
  this synchronization read `currentTurnMessages`, which `PrefixCaptureResult`
  does not declare. Local typecheck had run before that test was edited and
  was not repeated. Fixed in pull request #265.
- **unit shards 1, 3 and 4 on both branches, and compat Windows**
  (44963816316, 44963824024): fork-only tests that had never been migrated
  to two upstream changes adopted on 2026-11-13 (`ff3e8974`). Upstream
  `e3592f0e` makes Codex mode opt-in, and `c9c91d7b` offers exactly the
  declared effort levels. `f0a02f23` passes these tests and `ff3e8974` fails
  them. That synchronization, and the 2026-11-19 and 2026-11-21 records, had
  only local evidence and called them harness or environment cases. Pull
  request #264 selects `harness: "codex"` where the tests exercise Codex, as
  upstream did, and declares the fixture levels. Pull request #265 does the
  same for compat's two DC-ACTOR-002 cases.
- **unit shard 3 timeout**: upstream's unexplained log-queue stall. An
  instrumented dispatch (run 44972702047) caught the logger's `append` waiting
  on a `stream.write` callback that never arrived. The stall began when
  `bus/bus-integration.test.ts` finished its busy-SSE disposal cases. Every
  later bounded flush then paid its 1-second budget, and `lsp/client`'s
  `Log.init` timed out at 120 seconds. Pull request #264 runs that file in
  its own process (FC-008). An earlier commit wrongly isolated
  `npm-symlink-cache` and is reverted in the same pull request.

Pull request #264 merged as `e641c74d` after a green dispatched test run on
its head `2a522587` (44973772897). Push CI on `e641c74d` passed lint,
typecheck and test (44974452743, 44974452747, 44974452732). Pull request #265
merged into compat as `17cfc99a` after a green dispatched test run on
`84858551`, including Windows runtime (44974595191). Compat push CI is
recorded in the compat review record.
