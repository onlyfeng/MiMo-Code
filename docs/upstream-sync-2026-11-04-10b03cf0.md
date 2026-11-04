# Upstream sync 2026-11-04 through 10b03cf0

## Scope and immutable baselines

Full live synchronization: upstream/main → fork main → fork dev/compat. Source
integration, publication and exact-SHA lint/typecheck/test CI are complete at
the runtime/test snapshots below. A fresh ref check confirms alignment through
current upstream `10b03cf0` at that check. Final documentation-tip equivalence and scoped cleanup are recorded separately
in the execution receipt, after the documentation commits exist.

- Prior reviewed upstream: `6b66e8ce4aa89962b95a4dcb4119ee399cc9262f`.
- Selected upstream: `10b03cf04fe43aae89638e90570779c1e1216c5a`.
- Initial main: `07ac991f73dfa73216938571660a17c54f3be916`.
- Initial compat: `12bc737c9542ef944dbf3b62540c367fbd30d04b`.
- Range: `6b66e8ce..10b03cf0`, one commit, 13 incoming paths; upstream PR #2776.
- Validated main runtime/test SHA: `fc0cdcab5eed1e0bfd87732f411d72e056c87651`.
- Validated compat runtime/test SHA: `da08974dfb64ebd6aa995fbe51e87e49051cc076`.
- First CI candidates: main `a8f820c50fa75ea4aaba0ec791c8aad55133f810`; compat `f7a8e7c9530788906c6917b2ce5b0da1e1b56ea1`. Their evidence remains source-specific below.
- Concurrently accepted fork main: `5d728151e06bfc187e90b244a9fbd91fe4126fe6` (PR #224, FC-043).
- Concurrently accepted compat: `91b143fda5a2258a808cea4fec3b225a667775bd` (PR #225, propagation of FC-043).
- Bundled guidance snapshot: `5d728151e06bfc187e90b244a9fbd91fe4126fe6`; skill guidance remains unchanged from `fd04de73ced82599baac249e9cf96dfb55b9d778`.

Both remotes were refreshed for the selection with branch-only refspecs and
`--no-tags --no-prune-tags --prune --refmap=`. Upstream is read-only. The closing
source ref refresh still resolves upstream to `10b03cf0`, origin main to
`fc0cdcab` and origin compat to `da08974d`. Selected upstream → main → compat
ancestry is verified. This is a point-in-time alignment claim; an upstream
advance requires another inventory and propagation cycle.

Two dedicated local worktrees and branches were created from the initial main
and compat tips. An additional detached baseline worktree at `07ac991f` was
created for test diagnosis: three operation-created worktrees and two branches
in total. The original checkout's untracked `.omo/` state and all unrelated
worktrees are outside this operation's cleanup scope. The detached audit remains;
other operators removed the unrelated dirty fix and concurrent compat-sync
worktrees, not this operation. Logs and the resource manifest remain outside
the repository. The diagnostic baseline has been removed after a clean-state
check; final mutation-worktree cleanup is recorded in the execution receipt.

## Capability inventory (N=4)

The selected main FD/FC registries and compat DC registry were checked against
the complete delta, including clean merges. Shared behavior stays main-owned;
compat retains its existing context, actor, model and process-ownership overlays.
The upstream delta needs no new owner, retirement or unrelated consolidation.
Concurrent fork PR #224 adds main-owned FC-043 and is inherited by both branches.
The final inventory has three upstream capabilities and one accepted fork
capability. All four are complete on both published source snapshots, with
successful exact-SHA CI.

| ID | Selected behavior and producers/consumers | Main result | dev/compat result | Owners and decisive paths/tests |
| --- | --- | --- | --- | --- |
| C01 | `SessionReminder.tag/has/windowTarget` → `ensurePersistedUserSynthetic` → memory paths, loop streak and MCP synthetic parts; client tags enter through existing `TextPartInput.metadata`. | Complete: adopts validated key/rev identity instead of text matching. Retains MCP announcement metadata, request authorization, receipt order and frozen scope. Exact-SHA CI passed. | Complete: inherits tags while preserving receipt chronology, current-turn projection and frozen scope. Exact-SHA CI passed. | FD-005/006/009; FC-001/002/004/009. `src/session/{reminder,prompt}.ts`, `src/tool/mcp-tool-search.ts`; `test/session/{synthetic-reminder,session-memory-dir-reminder-persist,prompt-effect,skill-catalog-reopen}.test.ts`, `test/server/session-recovery-task.test.ts`, MCP/search and prefix suites. |
| C02 | Run-loop agent binding → per-window `session-env` part → model request; receiving `Instance.directory`, git root when inside git, and platform precede memory paths. | Complete: adopts the receiver environment and excludes exactly native hidden bounded agents. Retains strict `usageRecovered`, delivery before processing, frozen prefixes and FC-042 usage semantics. Exact-SHA CI passed. | Complete: reuses its earlier agent binding and retains the `recoverOverflowPlaceholder` receipt, request preflight, full-context actors and process ownership. Exact-SHA CI passed. | FC-002/007/042; DC-ACTOR-001, DC-CONTEXT-001, DC-SESSION-001. `src/session/prompt.ts`; `test/actor/spawn.test.ts`, `test/session/{rebuild-boundary-placement,prompt-effect,fork-queue,skill-catalog-reopen}.test.ts`, `test/server/session-recovery-task.test.ts`; bounded-writer and recovery suites. |
| C03 | Claude `SystemPrompt.environment` → shell name; bash execution already uses `Shell.acceptable()`. | Complete: adopts `Shell.acceptable()` while retaining resolved harness/template selection, frozen system behavior and the dynamic environment flag. Exact-SHA CI passed. | Complete: inherits the shell correction with the existing context overlay. Exact-SHA CI passed. | FD-005, FC-011. `src/session/system.ts`; `test/session/system.test.ts`, `test/shell/shell.test.ts`, `test/flag/dynamic-system-prompt-flag.test.ts`. |
| C04 | Concurrent fork `07ac991f..5d728151` (PR #224): bound the caller's `ActorTool.cancel` wait while cancellation continues detached. | Complete: preserves accepted main behavior and tool guidance unchanged. Exact-SHA CI passed. | Complete: inherits the cancel branch byte for byte, retaining context/variant/session-owner overlays. Exact-SHA CI passed. | FC-043, FC-001; DC-ACTOR-001, DC-SESSION-001. `src/tool/actor.{ts,txt}`, `src/effect/hard-timeout.ts`; `test/effect/hard-timeout.test.ts`, `test/tool/{actor-cancel,actor-owned-lifecycle,actor-exec-lifecycle}.test.ts` and compat actor consumers. |

Paths in the last column are relative to `packages/cli/`. Test references identify
the required evidence surfaces; they are not passing-result claims.

## Resolution and compatibility boundaries

`metadata.reminder = { key, rev }` identifies only non-ignored synthetic text.
Equal keys and revisions match independently of wording; absent/null revisions
match the absent-revision case. Malformed tags do not count. Memory paths use
the session memory directory as their revision, loop streak has no revision,
and MCP uses its existing semantic marker. Persisted IDs stay stable once the
tagged reminder exists.

There is no compatibility shim for old text-only reminders. An existing memory
paths part is not recognized by its wording, so one tagged copy can be appended
to the next eligible user in that window. Loop streak can repeat only if its
detection fires again on the same user. MCP announcement diffs still read
`metadata.mcpReminder`, including legacy parts, so the new tag alone does not
cause re-announcement. MCP readiness does not grant execution authority; the
shared budget, escaping, whitelist, frozen membership/schema checks and hidden
direct-call rules remain unchanged.

`windowTarget` considers this session's own users in the current context window.
It tries the first own user if unanswered, otherwise the last own user if
unanswered; intermediate users are not candidates.
Non-summary assistant replies prevent rewriting already-sent history. The
environment reminder precedes memory paths and is independent of whether the
actor serves checkpoints. Native hidden bounded agents receive no new
environment part. A non-bounded full-context child may receive its own reminder
beside the inherited parent's copy; duplicate content is accepted without
recapturing or modifying the frozen parent prefix. The system prefix and dynamic
system-prompt flag keep their existing contracts.

Main's `MessageV2.usageRecovered(msgs, lastFinished)` remains in place; the earlier
agent binding does not replace it with a weaker boundary test. FC-042 still
passes `compactsOnUsage: !isBoundedComputation`. Model/group variant resolution,
frozen capture, tool permissions and delivery-receipt ordering are retained.
Compat additionally retains its overflow-placeholder receipt and preflight when
reusing the earlier binding.

The main merge's four conflict files are `src/session/prompt.ts`,
`test/actor/spawn.test.ts`, `test/session/prompt-effect.test.ts` and
`test/session/system.test.ts`. The merge retains fork imports and MCP capture
assertions; the incoming dynamic-environment assertion is applied to the actual
flag-on test rather than the adjacent fork MCP capture test. Two fork-specific
regressions cover low-ID follow-up chronology without history rewrites, and
persistent full-context actor recovery without frozen-prefix mutation.
Independent source/test review found no blocking issue in those surfaces;
runtime results are recorded below.

No public schema, route, migration or SDK input changes. `TextPart.metadata` is
already a free-form record, and generated `TextPartInput.metadata` already carries
it. SDK regeneration is not needed for this delta. The new upstream Compose spec
is an implementation report. Concurrent FC-043 changes shipped `tool/actor.txt`
guidance, so its content snapshot advances to `5d728151`; the earlier skill
guidance remains unchanged.

## Concurrently accepted fork update

Fresh origin refs advanced main to `5d728151` while validation was running.
Both branches inherit FC-043 without replacing their reminder integration.
Compat later accepted the independent PR #225 sync at `91b143fd`; merging it
added only its DC history entry. The completed check
`git diff --quiet 8296406e cf0052d6 -- . ':(exclude)docs'` proves runtime/test
tree equivalence for that intermediate merge. The writer-budget fixture
correction advanced the first CI candidates to `a8f820c5` on main and
`f7a8e7c9` on compat. The subsequent window-reminder assertion corrections
advance the runtime/test snapshots again to `fc0cdcab` and `da08974d`.
Earlier snapshots remain historical evidence, not final validation targets.
Local ancestry checks confirm selected upstream and accepted main `5d728151`
are ancestors of `fc0cdcab`, and both `fc0cdcab` and accepted compat `91b143fd`
are ancestors of `da08974d`.
`ActorTool.cancel` waits at most 30 seconds, reports `cancelling` on timeout,
and leaves the cancellation running; an actual cancellation error remains an
error. This does not change `Actor.Service.cancel`, registry status schema or
SDK. Compat preserves its Token/SessionOwner imports, frozen/full-context,
variant selection and cross-process delivery policies. The tool cancel branch
matches accepted main byte for byte. Final validation includes hard-timeout,
Actor tool cancel and downstream lifecycle/compat consumers.

## Validation and toolchain evidence

Final full-suite acceptance completed through the repository's existing
exact-SHA CI on both corrected sources. Local validation combines the
completed group and partial evidence below with focused follow-up checks. CLI
typechecks and writer-fixture lint passed on the first candidates `a8f820c5` /
`f7a8e7c9`; those results do not validate the later test changes. The observed
results retain their own source and process boundaries. Tests run
from `packages/cli`, and typecheck uses that package's `bun run typecheck`.
Dependency installation uses pinned Bun 1.3.14 with `bun ci`; no manifest/lockfile
migration was made for this synchronization.

The operation's environment wrapper removes ambient `MIMOCODE_*` and
`OPENCODE_*` selectors. Package preload then supplies its isolated HOME/XDG roots,
model fixture, managed config root, disabled default plugins and in-memory
database. Opt-in cases must report their additional selectors. Default-off
claims require an isolated non-test child with the relevant selector removed
before import. Commands, process boundaries, counts and exit states are bound
to each recorded source or corrected test-tree snapshot. Failed and partial
attempts retain their original outcomes.

| Scope | Observed result / remaining evidence |
| --- | --- |
| Main initial `bun ci` | Failed in `tree-sitter-powershell` postinstall: `Unknown lockfile version` while parsing version 2. The repository lock is version 1. |
| Installer diagnosis | `node-gyp-build` fell back to Bun's temporary `node-gyp` shim, which invokes `bun x --silent node-gyp`; the existing node-gyp bunx cache has a version-2 lock. The installed Node toolchain's node-gyp 12.4.0 runs successfully. No global cache was modified. |
| Main frozen retry | An operation-local PATH shim allowed `bun ci` to exit 0 in 53.45 s with no dependency changes, but a subsequent Node require still failed because the initial failure had left the PowerShell native binding absent. Installer exit 0 alone is not complete dependency validation. |
| Main native-binding recovery | Explicit rebuild with the existing node-gyp in this operation's installed package directory completed with `gyp info ok`; an independent Node require exited 0 and exposed the native language object. Bun's shim also supports a per-command `npm_config_node_gyp` absolute path; no global cache or repository-lock rewrite is needed. |
| Compat dependency installation | Initial pinned `bun ci` exited 0 and installed 2,121 packages; the PowerShell binding exists and the independent Node require succeeded. This does not establish source/test validation. |
| Pre-fixture whole-tree lint | Main: 3,704 warnings, zero errors. Compat: 3,796 warnings, zero errors. These precede the final fixture correction. |
| Writer-fixture lint on first candidates | Both branches' scoped lint exited 0 with one existing warning and zero errors. The warning is the existing request-body type assertion; evidence is in `main-fixture-lint.log` and `compat-fixture-lint.log`. |
| Main CLI typecheck before window-assertion correction | `bun run typecheck` exited 0 on `a8f820c50fa75ea4aaba0ec791c8aad55133f810`; `main-typecheck-final.log`. |
| Compat CLI typecheck before window-assertion correction | `bun run typecheck` exited 0 on `f7a8e7c9530788906c6917b2ce5b0da1e1b56ea1`; `compat-typecheck-final.log`. |
| Window-assertion correction lint | Main's two corrected files exited 0 with one existing warning and zero errors; `main-window-fixtures-lint.log`. The warning is the existing `server.stop(true)` promise in the catalog test. |
| Final test acceptance | Both corrected sources `fc0cdcab` / `da08974d` passed fresh exact-SHA lint, typecheck and complete test CI. Main has nine successful test jobs and the configured Windows skip; compat has ten successful jobs including Windows runtime and launcher checks. Earlier local evidence remains source-specific below. |
| Independent review | Read-only reviews covered main production hunks, all 13 incoming paths, the fork queue/actor regressions, main/compat FC-043 inheritance, the writer fixture and both CI assertion corrections. No blocking finding in those reviewed surfaces. Static review does not establish runtime success. |

### Interrupted actor lifecycle diagnosis

The initial ad-hoc `common` batch reported 124 passes and one failure, then
stopped making progress and was interrupted. It is a failed, incomplete run.
The failure was `foreground admission interruption joins a child paused in
postStop`. Runtime logs suggested its internal three-second startup wait had
expired; that is an inference from the recorded stage, not a reproduced root
cause or proof of test pollution. This exercises `Actor.Service` admission and
postStop handling, not FC-043's tool-level `ActorTool.cancel` wait.

The isolated target passed on baseline `07ac991f` and reminder-only candidate
`ff323075`, each in a separate process. A four-file baseline prelude also passed
the target and adjacent postStop cases. Its 144 observed passes and zero observed
failures are partial evidence: that diagnostic process was deliberately stopped
before the complete group finished. The later local `common-shard-2` run passed
the actor target and its adjacent cases before reaching the independent writer
budget failure below. These observations do not turn either interrupted batch
into a complete passing matrix.

The operation retains `main-common.log`, `main-common-interruption.json`, the
baseline/candidate `poststop-focused` logs, and the baseline `poststop-prelude`
log and stop receipt. They preserve the failure, focused passes and intentional
partial termination as separate evidence.

### Writer step-budget fixture correction

The pre-fixture local `common-shard-2` run on `01cad4d` reached 120 writer
requests and `tool_choice: none`, but the 90-second settlement deadline expired
before the final stream settled. Runtime timestamps placed about 53 seconds
inside snapshot-related phases; this is elapsed-time diagnosis, not a precise
CPU profile. The original focused fixture also failed on baseline and candidate:

| Source / fixture | Writer calls | Last tool choice | Settlement | Result |
| --- | --- | --- | --- | --- |
| Baseline `07ac991f`, original | 107 | `auto` | `None` | Focused run exited 1. |
| Candidate `01cad4d`, original | 91 | `auto` | `None` | Focused run exited 1. |
| Candidate with local snapshot override, committed as `a8f820c5` | 120 | `none` | `Some` | Focused run exited 0: one pass, five filtered, zero failures, two assertions. |

This writer-budget correction adds two lines and removes one line in
`test/session/checkpoint-writer-runaway.test.ts`: a comment and `snapshot: false`
in this one read-only task-list loop's temporary-instance configuration.
`git: true` remains enabled. The shared fixture helper, other cases and
production source are unchanged. The production 120-step constant, 90-second
settlement deadline, 150-second test timeout, timeout cleanup and all exact
`Some`/`none`/call-count assertions remain intact. This removes filesystem
snapshot work from the step-budget fixture while retaining its termination
contract; it is not a production timeout or step-budget change.

The corrected focused command was
`clean-env bun test --timeout 120000 test/session/checkpoint-writer-runaway.test.ts -t "ends a writer whose model never stops calling tools"`,
run from `packages/cli`. Bun reported a 55.138-second test body and 71.12 seconds
for the process's test run. The outer runner measured 71.65 seconds. The tested
fixture blob `adfa08dd84fc1368d6a1728785c9a34d157dbd2e` is the blob committed in
`a8f820c5` and inherited by `f7a8e7c9`. This focused pass does not establish the
full suite or compat runtime result.

The retained `main-common-shard-2-before-fixture.log`,
`writer-budget-comparison.json` and `candidate-writer-budget-no-snapshot.log`
record the failed group, baseline/candidate comparison and corrected focused
result respectively.

### First exact-SHA CI failure and window-reminder assertion corrections

The first full-suite test runs failed on both branches:

| Branch / source | Test run | Failure boundary |
| --- | --- | --- |
| Main `a8f820c50fa75ea4aaba0ec791c8aad55133f810` | [Failed first test run](https://github.com/onlyfeng/MiMo-Code/actions/runs/41847508191) | Shard 1: the sole failing case was in `test/session/skill-catalog-reopen.test.ts`. Shard 2: the sole failing case was in `test/server/session-recovery-task.test.ts`. |
| Compat `f7a8e7c9530788906c6917b2ce5b0da1e1b56ea1` | [Failed first test run](https://github.com/onlyfeng/MiMo-Code/actions/runs/41848103379) | The same two cases failed, one in each of shards 1 and 2. |

The remaining applicable test jobs passed on those old SHAs. Main's
`windows-runtime` job was skipped; compat's passed. Old main
[lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/41847508126) and
[typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/41847508064), and old
compat [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/41848103748) and
[typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/41848103334), also
passed. These are historical results for `a8f820c5` / `f7a8e7c9`, including the
Windows success; they cannot replace the corrected sources' complete CI runs.

Both failures came from old memory-only normalization around assertions that
otherwise require preserved user parts. The new legitimate `session-env` part
remained in the comparison. Main `fc0cdcab` changes only these two test files
(11 insertions, nine deletions), and compat inherits it at `da08974d`.
Production source is unchanged on both branches. The tests now use the existing
`isWindowReminder` helper: it accepts only non-ignored synthetic text with a
valid `metadata.reminder` tag whose key is `session-env` or `memory-paths`.
Other parts remain in the exact comparison.

The recovery test retains its separate already-answered-user checks: original
parts must remain identical and `added` must equal `[]`. The catalog test keeps
its independent `SESSION_MEMORY_DIR_MARKER` / `isDirReminder` count of exactly
one memory reminder, frozen capture equality, old/new catalog assertions and
system/user content separation. `firstAfter` is explicitly typed as
`MessageV2.Part[]`. The caller audit found only these two missed normalization
sites; assertions about actual memory text, location or counts remain intact.
The repair uses the real HTTP recovery and two non-test process reopening
fixtures; it does not replace them with mocks or remove their contracts.

| Corrected local validation | Result |
| --- | --- |
| Main recovery-task full file, corrected tree committed as `fc0cdcab` | 11 passes, zero failures, 143 assertions; 38.91 seconds. `main-recovery-task-final.log`. |
| Main skill-catalog-reopen full file, corrected tree committed as `fc0cdcab` | One pass, zero failures, 23 assertions; 23.67 seconds. `main-catalog-reopen-final.log`. |
| Main two-file scoped lint | Exit 0, one existing warning, zero errors; `main-window-fixtures-lint.log`. |
| Compat recovery-task full file on `da08974d` | 11 passes, zero failures, 143 assertions; 29.95 seconds, exit 0. `compat-recovery-task-final.log`. |
| Compat skill-catalog-reopen full file on `da08974d` | One pass, zero failures, 23 assertions; 14.48 seconds, exit 0. `compat-catalog-reopen-final.log`. |

Compat's two files ran sequentially in independent processes. Independent
read-only review found no blocking issue in the two-file correction.

These assertion repairs close C01/C02 test consumers and leave N=4 unchanged.
Both `fc0cdcab` and `da08974d` subsequently passed fresh full-suite exact-SHA CI,
including all applicable isolated and Windows jobs. The final CI table below
uses those new runs, not green results from their parents.

### Local results and full-suite acceptance

Validation now uses the existing CI parallel jobs for complete suite acceptance,
with local focused checks alongside them. This changes execution placement only;
source, tests and workflows are unchanged by this execution-plan adjustment.
The first published sources `a8f820c5` / `f7a8e7c9` produced the evidence below
and the CI failures above. Their local results retain those source labels.
Corrected-source acceptance on `fc0cdcab` / `da08974d` is complete across all
existing Linux unit-test shards and isolated test jobs, plus the applicable
compat Windows runtime and launcher checks.

| Local scope | Source | Status and evidence |
| --- | --- | --- |
| Main `common-shard-2`, all six applicable files | `a8f820c5` | Completed: 127 passes, zero failures, 724 assertions; Bun reported 406.59 seconds and the runner 406.87 seconds, exit 0. `main-common-shard-2.log` and `main-matrix-results.json`. This includes the actor lifecycle and corrected writer-budget cases. |
| Main `common-shard-1` | `a8f820c5` | Partial: 76 observed passes and zero observed failures before an intentional SIGINT, exit -2. New environment, client-tag, dynamic-flag and frozen-MCP cases had passed. The full group did not finish and is not claimed passing. `main-local-matrix-handoff-to-ci.json` records the decision to move complete validation to CI. |
| Main system, shell and dynamic flag, whole files | `a8f820c5` | Completed: 25 passes, zero failures, 105 assertions across `test/session/system.test.ts`, `test/shell/shell.test.ts` and `test/flag/dynamic-system-prompt-flag.test.ts`; 48.23 seconds, exit 0. `main-shell-final.log`. |
| Compat focused integration | `f7a8e7c9` | Completed: 20 passes, 323 filtered, zero failures, 131 assertions across actor spawn, prompt-effect and fork-queue; 140.46 seconds, exit 0. `compat-integration-final.log`. The filter is `request preflight\|session environment reminder\|same reminder tag\|resume preserves the interrupted persistent actor user and frozen context\|preserves first-delivery ordering`, with `--timeout 120000`. |
| Compat core files | `f7a8e7c9` | Completed: 51 passes, zero failures, 181 assertions across synthetic-reminder, system, shell, dynamic-system-prompt-flag, actor-cancel, hard-timeout and session-owner-prompt; 48.90 seconds, exit 0 with `--timeout 120000`. `compat-core-final.log`. |

The partial group was stopped deliberately to hand full-suite verification to
CI, not because a watchdog declared success or the remaining tests passed. The
completed local group and focused runs do not substitute for either branch's
full-suite exact-SHA CI result.

### Affected coverage map

The operation's `matrix.json` and `run-matrix.py` retain the original five-group
affected-file plan below. The local groups above used
`clean-env bun test <group files> --timeout 120000 --bail` from `packages/cli`,
with source-SHA and clean-non-doc-tree checks. The original runner's watchdog
limits were 150 seconds without log output or 1,200 seconds total; any watchdog
termination would be incomplete. The uncompleted groups are coverage mapping
for CI and focused follow-up, not a claim that all files ran locally. File paths
below are relative to `packages/cli`.

| Group | Affected files |
| --- | --- |
| `common-shard-2` | `test/actor/spawn.test.ts`, `test/session/checkpoint-writer-runaway.test.ts`, `test/session/llm-request-prefix.test.ts`, `test/session/session-owner-prompt.test.ts`, `test/session/synthetic-reminder.test.ts`, `test/session/title-first-turn.test.ts`, `test/tool/actor-cancel.test.ts` |
| `common-shard-1` | `test/flag/dynamic-system-prompt-flag.test.ts`, `test/session/fork-prefix-invariant.test.ts`, `test/session/fork-queue.test.ts`, `test/session/prefix-snapshot.test.ts`, `test/session/prompt-effect.test.ts`, `test/session/prompt-rebuild-loop.test.ts`, `test/session/tool-gate-cancel.test.ts`, `test/tool/actor-send.test.ts`, `test/tool/actor-variant-guidance.test.ts` |
| `common-shard-3` | `test/effect/hard-timeout.test.ts`, `test/session/classify-integration.test.ts`, `test/session/llm-native-websearch.test.ts`, `test/session/overflow.test.ts`, `test/session/session-memory-dir-reminder-persist.test.ts`, `test/tool/actor-owned-lifecycle.test.ts`, `test/tool/actor.test.ts`, `test/tool/mcp-tool-search.test.ts` |
| `common-shard-4` | `test/server/session-recovery.test.ts`, `test/session/rebuild-boundary-placement.test.ts`, `test/session/system.test.ts`, `test/shell/shell.test.ts`, `test/tool/actor-exec-lifecycle.test.ts` |
| `recovery` | `test/server/session-actor-recovery.test.ts`, `test/actor/subagent-resume-cascade.test.ts`, `test/actor/subagent-resume-negatives.test.ts`, `test/actor/subagent-resume-route.integration.test.ts` |

Main excludes the five compat-only files: `test/session/session-owner-prompt.test.ts`,
`test/session/llm-native-websearch.test.ts`, `test/tool/actor.test.ts`,
`test/tool/actor-send.test.ts` and `test/tool/actor-variant-guidance.test.ts`.
The original coverage map therefore contains 28 files on main and 33 on compat;
it is not a completed local execution count. The two additional full-file
checks for `test/server/session-recovery-task.test.ts` and
`test/session/skill-catalog-reopen.test.ts` are recorded separately in the CI
correction section above. Local shard labels are not GitHub Actions results;
the separate corrected-source exact-SHA CI results follow.

## Exact-SHA CI and publication

| Branch | Validated source SHA | lint | typecheck | test | Refreshed source remote tip |
| --- | --- | --- | --- | --- | --- |
| `main` | `fc0cdcab5eed1e0bfd87732f411d72e056c87651` | [Success](https://github.com/onlyfeng/MiMo-Code/actions/runs/41851051242) | [Success](https://github.com/onlyfeng/MiMo-Code/actions/runs/41851051210) | [Success](https://github.com/onlyfeng/MiMo-Code/actions/runs/41851051310) | `fc0cdcab5eed1e0bfd87732f411d72e056c87651` |
| `dev/compat` | `da08974dfb64ebd6aa995fbe51e87e49051cc076` | [Success](https://github.com/onlyfeng/MiMo-Code/actions/runs/41851513398) | [Success](https://github.com/onlyfeng/MiMo-Code/actions/runs/41851513479) | [Success](https://github.com/onlyfeng/MiMo-Code/actions/runs/41851513311) | `da08974dfb64ebd6aa995fbe51e87e49051cc076` |

All publication targets are `onlyfeng/MiMo-Code`; upstream receives no writes.
All six runs completed successfully with `headSha` equal to their branch's
validated source above. Main's test run has nine successful jobs and the
configured `windows-runtime` skip. Compat's test run has ten successful jobs,
including actual Windows runtime and launcher validation.

The closing fresh fetch and `ls-remote` checks confirm `upstream/main` at
`10b03cf04fe43aae89638e90570779c1e1216c5a`, `origin/main` at
`fc0cdcab5eed1e0bfd87732f411d72e056c87651` and `origin/dev/compat` at
`da08974dfb64ebd6aa995fbe51e87e49051cc076`. Both source ancestry checks completed
successfully: selected upstream is an ancestor of published main, and published
main is an ancestor of published compat. The accepted concurrent fork tips are
also retained as recorded above.

This report identifies immutable runtime/test sources rather than attempting
to name the SHA of the documentation commit that contains it. After shared
documentation is committed on main and inherited by compat, record the actual
published documentation tips in the operation's execution receipt. Each must
descend from its validated source and satisfy
`git diff --quiet <source> <documentation-tip> -- . ':(exclude)docs'` before
reusing the successful source CI. Refresh remote equality and upstream → main →
compat ancestry for those documentation tips, and verify shared FD/FC/history/
report content is inherited unchanged. Record these post-documentation checks
in the execution receipt; they do not advance either runtime/test reference.

## Final state and cleanup

The operation's execution receipt is the authority for final documentation-tip
SHAs, non-doc tree equality, branch fast-forwards and cleanup results, which are
produced after this record is committed. Pre-cleanup verification found the
original checkout's `.omo/` hash unchanged from baseline, the original detached
audit retained, and ignored files in the three operation-created worktrees
limited to package `node_modules` dependencies. The clean detached diagnostic
baseline worktree was removed. The two mutation worktrees and their local
branches are eligible for removal only after published integration and absence
of user changes are verified. Other operators removed the unrelated
`exec-throw` and `sync-compat9` worktrees; this operation did not remove them.
Unrelated worktrees, `.omo/` and global dependency caches are outside cleanup
scope. Shared FD/FC/history/report content remains main-owned and is inherited
unchanged by compat; the compat DC record retains its own review.
