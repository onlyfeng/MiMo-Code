# Upstream synchronization on 2026-11-28 through f8b87f63

## Scope

Full live synchronization of `4b029a9b4cf838f72ecb729345ddf10d8cef9ad0..f8b87f631277fc99f956740f7c83122132f87d3e`
(upstream pull requests #2873 through #2879, seven commits), fetched with
branch-only refspecs. The starting fork tips were `main`
`ba999dda14cf214a3dab04ad719657e900d4c6fb` and `dev/compat`
`ca28595bddfbbf3328edbd97776af8357cb2db78`, which already contained that
`main`. No fork pull request merged between the previous synchronization and
this one.

The integration used dedicated worktrees on `sync/upstream-f8b87f63` and
`sync/compat-f8b87f63`. Runtime and test snapshots are
`4bde16cd18bff0ddb5ac35cf2531e6459461e6e2` on main and
`5f6366209212dfefbfc7516a3430323281ac02e7` on compat.

## Capability inventory (6)

| ID | Selected behavior | main | dev/compat | Decisive paths and tests |
| --- | --- | --- | --- | --- |
| C01 | #2873 replayed Copilot-like and Gemini signatures in OpenAI-compatible chat; #2874 reverted it. | Nothing to adopt. `git diff --quiet 41f7f90c^ cd4d88d5` holds over all 13 paths of #2873, and the merge leaves each of them identical to the starting main. | Nothing inherited. | `provider/compatible-tool-signature.ts`, `provider/openai-compatible-metadata.ts`, `session/message-v2.ts`, `session/llm.ts`, `session/processor.ts`, `sdk/src/v2/gen/types.gen.ts`: unchanged. |
| C02 | Stateless (`store !== true`) `@ai-sdk/openai` and `@ai-sdk/azure` Responses requests keep `itemId` on reasoning parts so the stock SDK recombines multi-summary reasoning into one item carrying `id` and `encrypted_content`. Other parts still drop `itemId`. #2875 shipped this with `@ai-sdk/openai` patches; #2877 removed the patches. | Adopted the `mapProviderOptions` part-type argument and the reasoning exemption through a clean merge. Root `package.json`, `patches/` and the lockfile's `patchedDependencies` are unchanged (FC-019 and FC-055 patches untouched). FC-053's `xai` key was never in the stripped-SDK list and is unaffected. | Inherited. DC-WEBSEARCH-001's Anthropic reorder in the same file is a separate hunk, and the compat overlay lines in `transform.ts` and `transform.test.ts` are unchanged. | `packages/cli/src/provider/transform.ts` (`message`); `test/provider/openai-responses-reasoning-group.test.ts` (new, real SDK serialization) and the two updated `transform.test.ts` cases. Replacing the exemption with a comment fails 6/6 and 2/220 of them. |
| C03 | `dream.auto` and `distill.auto` are documented as off by default in the README files and the bundled `mimocode-docs` skill. | Adopted. `session/auto-dream.ts` enables either run only when the value `=== true` on both branches, so the text matches behavior. The fork's other bundled-guidance rows merged without conflict. | Inherited; the compat README overlay is unchanged. | `README.md`, `README.zh.md`, `.bundle/mimocode-docs/SKILL.md`, `reference/config.md`, `reference/guide.md`; `test/skill/mimocode-docs.test.ts`. |
| C04 | Version 0.1.18 for the `cli`, `plugin`, `sdk` and `shared` packages. | Adopted with the lockfile's matching version fields; no other lockfile line changes, and no `0.1.17` reference remains outside `docs/`. | Inherited. | Four `package.json` files and `bun.lock`. |
| C05 | The inbox queue suites save, clear and restore `schedulerRef.current`; the sync suite sets `MIMOCODE_EXPERIMENTAL_WORKSPACES` only inside the instance callback. | Adopted through a clean merge onto the fork's queue-controller cases. | Inherited. Compat's `src/sync/index.ts` and `src/inbox/controller.ts` overlays are untouched by this change. | `test/inbox/queue-controller.test.ts`, `test/inbox/queue-steer-integration.test.ts`, `test/sync/index.test.ts`. |
| C06 | #2879 cancels the main session that upstream's route test resumes, so its retry loop cannot outlive the test and write into a later suite's database. | Kept the fork's route test. Under FD-009 the fork replaced upstream's registry-only ephemeral-recovery case with a retained full-context actor case through `test/fixture/retained-recovery-actor.ts`; the test upstream fixed does not exist here. | Inherited the same test. | `test/actor/subagent-resume-route.integration.test.ts`. A temporary probe (not committed) wrapped `fetch` and ran the fork case four times. No provider request followed teardown within 9 s. The parent reported `busy` ("Waiting for 1 subagent(s)") at teardown in two runs. See the follow-up below. |

FD-009 (frozen-context recovery), FC-019 and FC-055 (dependency patches),
FC-053 (`@ai-sdk/openai` reasoning options and the `xai` key) and the shared
bundled-guidance rows were reviewed against the merged trees. No entry's
contract changes. The wire schema, migration journal and SDK inputs are
unchanged, so no generated artifact was regenerated.

Follow-up after publication: `withActor` cancelled the spawned and controller
actors but not the parent session that a main resume wakes. A closer probe
showed that the parent session goes idle on its own within about 55 ms of the
child's cancellation, without another provider request, so it was not a
leaked retry loop. Across 42 teardowns of the three suites that use the
fixture, one run still held its instance claim when the servers would have
stopped, and it released 32 ms later. The fixture now cancels the parent
session, disposes each fixture directory while both servers still answer,
and requires `Instance.refreshStatus` to reach `applied`. A temporary case
that holds an instance claim past teardown fails that assertion with
`pending`, and an idle fixture in the same tree passes. No failure had been
attributed to the window.

## Local validation

macOS with pinned Bun 1.3.14 and dependencies installed using `bun ci`.
Ambient `MIMOCODE_*` variables were cleared. The CLI preloads
`@opentui/solid/preload` and `test/preload.ts` were kept, including isolated test
home, XDG and fixture paths, `MIMOCODE_DISABLE_DEFAULT_PLUGINS=true` and
`MIMOCODE_DB=:memory:`.

- `bun run typecheck` from `packages/cli` succeeds on both branches.
- Root `bun run lint` succeeds with zero errors (3,726 warnings on main and
  3,814 on compat).
- Affected matrix, one `bun test --timeout 120000 <file>` process per file
  from `packages/cli`: every file in `test/provider` (including `copilot/` and
  the three refresh suites), `test/session/llm*`, `test/session/message-v2*`,
  `test/session/compaction-reasoning-fallback`, `test/inbox`, `test/sync`,
  `test/skill`, `test/actor/subagent-resume-*` and
  `test/server/session-actor-recovery`. Main passes 77 files, 1,035 tests,
  with 0 failures; compat, whose directories hold four more
  files, passes 81 files, 1,078 tests, with 0 failures.
- Upstream's shared-process leak combination (`wake-instance-handoff`, both
  inbox queue suites, `subagent-resume-route` and `sync/index` in one process)
  passes 49/49 on each branch.

## Publication

The two branches were fast-forwarded in one atomic push to
`onlyfeng/MiMo-Code`. The push workflows ran on the following exact SHAs.

| Branch | Tested SHA | Lint | Typecheck | Test |
| --- | --- | --- | --- | --- |
| `main` | `42f8c54d2cdbfcb2b05294bdcf310b1e92f8dc15` | [success](https://github.com/onlyfeng/MiMo-Code/actions/runs/46103583039) | [success](https://github.com/onlyfeng/MiMo-Code/actions/runs/46103583057) | [success](https://github.com/onlyfeng/MiMo-Code/actions/runs/46103583002) |
| `dev/compat` | `836c7fcff5ea15f9f529679b7e2ca01eccfae722` | [success](https://github.com/onlyfeng/MiMo-Code/actions/runs/46103583119) | [success](https://github.com/onlyfeng/MiMo-Code/actions/runs/46103583065) | [success, including Windows runtime](https://github.com/onlyfeng/MiMo-Code/actions/runs/46103583035) |

The publication record and its propagation change only `docs/`. The tested
SHAs are ancestors of the publication tips, and
`git diff --quiet <tested-sha> <tip> -- . ':(exclude)docs'` verifies that their
trees outside `docs/` are identical. The required ancestry is upstream
`f8b87f631277fc99f956740f7c83122132f87d3e` → final main → final dev/compat.
