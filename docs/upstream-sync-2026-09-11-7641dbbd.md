# Upstream synchronization 2026-09-11 (7641dbbd)

This record starts from the accepted
[cb00c280 baseline](upstream-sync-2026-09-10-cb00c280.md). Upstream advanced
from `943b965d` to `7641dbbd` while the first capability was being published, so
the selected SHA was moved forward and both capabilities were propagated in one
pass rather than publishing an already-stale baseline.

## Selected immutable range

- Upstream: `cb00c2808043bb0c4f0a4cfc5855912d82c9abe8..7641dbbd3b8aa20ffd4fb74089f2dc65bf032201`
  (three commits: `8a179796` behind merge `943b965d`, then `7641dbbd`;
  13 paths, 754 insertions, 58 deletions).
- Starting main: `ea633a0bd8a343b8e8ea8fefc20b8cf15e0ced17`.
- Starting compat: `c1ee9ecbeda90224d4a7abbcfc877b9016b1117e`; already contains
  starting main.
- Canonical owner for both selected capabilities: shared main. Compat inherits
  through the direct `main` merge; no compat-only implementation is selected.
- Main source/test after the merges: `332d1961f2bc9d2b1b9e0e56f2143b09a80d2077`
  (15 paths, 980 insertions, 53 deletions from the starting main tip — the
  incoming 13 plus the two fork regressions and the regenerated
  `packages/sdk/openapi.json`).
  C01 landed at `6407d53ccbf883c0b6ad3b2ef9370d33e2ed56e4`; C02 at the tip.
- Bundled guidance content is unchanged at
  `c35c34d45a2e24ab6e48a7a3fd438d1c456352ed`. The lockfile is unchanged; the
  JavaScript SDK and published OpenAPI were regenerated from fork sources.

## Capability inventory (2)

| ID | Selected behavior and decisive paths/tests | Main counterpart / relationship / drift | Compat counterpart and owners | Disposition |
| --- | --- | --- | --- | --- |
| C01 | Every inline attachment is bounded where it is produced, on a size known up front (stat, or the base64 length), so an oversized payload never becomes base64 and never reaches the session DB: under `MIMOCODE_MAX_ATTACHMENT_SIZE` (50 MB) it is attached as-is, an image above it but under `MIMOCODE_MAX_ATTACHMENT_SOURCE_SIZE` (150 MB) is recompressed to a JPEG under the limit, and anything else is replaced by a notice naming the size and the limit. The read tool additionally refuses a PDF when the active model declares no `pdf` input support, pointing at the bundled `pdf-official` skill instead of attaching bytes the model cannot consume. `src/flag/flag.ts`, `src/util/media.ts`, `src/provider/image.ts`, `src/tool/read.ts`, `src/session/prompt.ts`, `src/mcp/tool-result.ts`; `test/tool/read.test.ts`, `test/session/prompt.test.ts`, `test/mcp/tool-result.test.ts` | FC-003's read-before-edit state lives in the same image branch of `src/tool/read.ts`; complementary, but the new refusal path reads bytes it then drops, which the fork's `markFileRead` contract has to answer. No other owned contract changes | Inherited through the direct main merge; FC-003 owns read state, FC-007 the read tool's path safety, FD-006 the nested-exec relay bound, DC-CONTEXT-001 the compat projection caps | Adopt the gate and the PDF capability refusal unchanged; place `markFileRead` on the image success path so a refused attachment authorizes no edit |
| C02 | A step-level `time.completed` no longer proves a turn finished: an assistant that stopped on `tool-calls` or `length`, recorded no finish, or carries an error is a recovery candidate again, while a clean `stop`/`other` turn is not; settlement of an already-errored assistant is idempotent; the resumed loop skips classifying the abandoned assistant so it creates a new step; and resume accepts an optional `modelProviderID`/`modelID` override, rejected 400 when only one half is given. `src/session/prompt.ts`, `src/server/routes/instance/session.ts`, `packages/sdk/`; `test/server/session-recovery.test.ts` | Fork owns recovery admission: upstream's `resume`/`resumeBackground` do not exist here, `startResumeTurn` is the single admission path, `abandonRecoveredAssistant` carries an `expectedParentID` identity check, and an actor resume validates a frozen model identity. Upstream also hand-edited the generated SDK and left `openapi.json` stale | Inherited through the direct main merge; FC-001 owns recovery/resume admission, FD-009 the frozen identity, FD-004 the generated API surface, DC-CONTEXT-001 lists the same two source files for its compat caps | Adopt the predicate for `tool-calls`/`length`/unsettled turns, the idempotent settlement, the classification skip and the override; keep `time.completed` as FC-001's settlement marker instead of upstream's "any error is always a candidate"; plumb the override through the fork's admission path, refuse it for a non-main `agentID`, and regenerate both published artifacts |

## Owner review map

All active FD/FC/DC entries were considered against the selected delta.

- FC-003 owns read-before-edit state in `src/tool/read.ts`. Resolved in favor of
  the existing fork convention: only a path that actually delivers content marks
  the file, exactly as the no-vision branch already returns a warning without
  marking.
- FC-007 owns the read tool's protected-root and fixed-cwd behavior. The gate is
  applied after path resolution and containment; no path, cwd, or deletion
  boundary is touched.
- FC-011 owns bundled-skill guidance. Upstream's new refusal names
  `pdf-official`, which the fork ships in the same bundle under the same
  `OFFICIAL_SKILL_NAMES` / `MIMOCODE_DISABLE_OFFICIAL_SKILLS` opt-out, so the
  message is factually correct here with no fork-facing rewrite.
- FC-010 bounds WebFetch responses at 5 MB, below the new 50 MB attachment
  limit; `src/tool/webfetch.ts` is unchanged and its bound still binds first.
- FD-006 bounds the nested-exec relay at eight attachments and 10 MiB encoded
  data. That relay is stricter than the new production gate and
  `src/tool/tool-script.ts` is unchanged, so nested execution observes no change.
- FC-001 owns recovery and resume admission. The broadened predicate and the
  idempotent settlement are adopted; the fork's `expectedParentID` check, single
  `startResumeTurn` admission path, synchronous commit boundary and absent
  `resumeBackground` are preserved. `resumeFrom` is bound to the candidate the
  runner actually settled, which is stricter than upstream's caller argument
  because an actor resume selects the latest candidate itself. Upstream's
  predicate additionally keeps every errored message a candidate even after it
  has been settled, so that a failed resume can be retried. FC-001 says the
  opposite — an errored turn stays a candidate "until recovery/resume or a newly
  admitted user turn abandons and completes it" — and `sweepOrphanAssistants`
  implements exactly that, leaving an errored turn without `time.completed` so
  recovery can find it and setting it when a new user admission abandons it. The
  merged predicate therefore keeps `time.completed` as the settlement marker and
  lets only `tool-calls` and `length` escape it.
- FD-009 owns the frozen model identity. The HTTP route refuses a model override
  for a non-main `agentID`; the run loop's `resumeIdentity` comparison remains as
  the fail-closed check behind it.
- FD-004 owns the generated API boundary and requires regeneration rather than
  copying. Upstream hand-updated `packages/sdk/js/src/v2/gen/` and left
  `packages/sdk/openapi.json` without the new parameters; both were regenerated
  from the merged fork route with `./packages/sdk/js/script/build.ts` plus
  `bun dev generate`, so they agree and carry the fork's constrained schemas.
- FD-005 and FC-015 list `src/flag/flag.ts` as a watch surface. The delta only
  appends two new lazily-read numeric flags; no existing flag, harness
  resolution, or compaction budget changed.
- FD-002 and FC-009 list `src/session/prompt.ts`. The C01 change is confined to
  the `data:` and `file:` attachment branches, whose rejection notice is an
  ordinary `synthetic: true` text part; the C02 change is confined to recovery
  selection, settlement and the resume model source. Instruction delivery and
  synthetic provenance are unchanged.
- DC-CONTEXT-001 caps model-visible content at projection time on `dev/compat`
  and lists both `src/session/prompt.ts` and
  `src/server/routes/instance/session.ts`. The new attachment gate is a
  production-time bound above those caps; the recovery change alters neither the
  caps nor request preflight, and adds no compat-only surface.
- FD-001/010/011/012 and FC-002/004/005/006/008/012/013/014/016, DC-NET-001/002,
  DC-PLATFORM-001, DC-MODEL-001, DC-ACTOR-001 and DC-TUI-001 have no incoming
  owned implementation changes.
- No owner retires and no unrelated consolidation is selected.

## Conflict resolution

### C01 — `packages/opencode/src/tool/read.ts` (two hunks)

1. Imports: the fork's `resolveCurrentSessionPath` and `markFileRead` and
   upstream's `shrinkAttachment`, `builtinSkillRoot` and the widened
   `@/util/media` list are both kept.
2. The image branch: upstream replaces `const bytes = yield* fs.readFile(...)`
   with a `Buffer`, a shrink attempt and a refusal return; the fork called
   `markFileRead` immediately after that read. `markFileRead` now sits after the
   `if (!fitted)` refusal return, on the success path. Bytes read but not
   delivered therefore do not authorize a later edit, matching the no-vision
   branch above it. The stat-based reject and the PDF capability refusal return
   before any read.

Everything else in C01 merged without conflict and matches upstream exactly.

### C02 — `src/session/prompt.ts`, `src/server/routes/instance/session.ts`, `packages/sdk/`

- Recovery predicate: `tool-calls` and `length` escape the `time.completed`
  check, which is upstream's actual fix. Upstream's further clause — any errored
  message stays a candidate even once settled — is not taken: `time.completed`
  remains the fork's settlement marker, as `sweepOrphanAssistants` documents
  ("errored assistants are intentionally left without time.completed so
  /recovery can find them") and as FC-001 requires. Taking upstream's clause
  verbatim fails `test/session/prompt-sweep.test.ts`'s
  `keeps an errored assistant recoverable until a new user admission abandons
  it`, which is what caught it.
- `abandonRecoveredAssistant`: upstream's idempotent "completed **and** errored"
  skip replaces the fork's "completed" skip, so a `tool-calls`/`length` candidate
  that already carries `time.completed` can still be settled by a resume. The
  fork's `expectedParentID` candidate-identity check is unchanged and still runs
  before any write.
- `runLoop`: the fork's `(sessionID, agentID, titleLocale, resumeIdentity,
  recoveryParentID)` signature gains upstream's `resumeFrom` and `modelOverride`;
  upstream's unrelated `task_id` / `notifyParentOnComplete` parameters are not
  reintroduced.
- Model resolution: the override selects the provider/model IDs, and the fork's
  `resumeIdentity` comparison still runs on the resolved model, so an override
  that changed a frozen identity dies there.
- `resume` / `resumeBackground`: taken from the fork side, i.e. absent. The
  override is plumbed through `startResumeTurn` instead, validated with
  `provider.getModel` **before** `commitRecoveryCandidate`, and `resumeFrom` is
  set from the settled candidate (`recovered.id`).
- HTTP route: the fork's validators, constrained `agentID`, `TaskID` and
  descriptions are kept, plus the two new parameters, the paired-parameter 400
  in the fork's `NamedError.Unknown` shape, and a 400 for an override on a
  non-main `agentID`.
- `packages/sdk/js/src/v2/gen/{sdk,types}.gen.ts`: resolved to the fork side and
  then regenerated, together with `packages/sdk/openapi.json`, which upstream had
  left stale.

`packages/opencode/test/server/session-recovery.test.ts` merged cleanly.
Upstream's 400 test used the default fixture root, which the fork's
`InstanceMiddleware` rejects with 403; it now uses the documented
`tmpdir({ root: "cwd" })` opt-in. No assertion was relaxed.

## Main validation

- `bun ci` completed with an unchanged lockfile. Repository-wide `bun typecheck`
  passed (12/12 packages).
- Final affected matrix at `332d1961f2bc9d2b1b9e0e56f2143b09a80d2077`, run from
  `packages/opencode` with `bun test --timeout 120000` in three sequential
  processes, following the isolation `.github/workflows/test.yml` already
  applies:
  - `test/tool/ test/mcp/ test/util/ test/provider/ test/flag/ test/skill/` —
    2219 passed, 3 skipped, 0 failed, 6306 assertions across 138 files in
    280.16 s.
  - `test/server/` (every file except `session-actor-recovery.test.ts`)
    `test/session/ test/actor/ test/inbox/ test/effect/` — 1700 passed,
    23 skipped, 1 todo, 0 failed, 5803 assertions across 168 files in 664.93 s.
  - `test/server/session-actor-recovery.test.ts` in its own process — 13 passed,
    0 failed, 175 assertions in 24.94 s.
- Isolation note, verified rather than assumed: running the whole `test/server/`
  directory in one process fails all 13 `session-actor-recovery.test.ts` cases
  with `Missing actual prefix captor`. That reproduces identically at the
  pre-merge `ea633a0b` baseline (13 failures, same names) and is the reason
  `.github/workflows/test.yml` already excludes that file from the shards and
  runs it in a dedicated `session-actor-recovery` job: it needs the real
  AppRuntime prefix captor, which focused prompt layers in unit tests replace
  and dispose process-wide. The third process above reproduces the CI
  arrangement.
- An earlier combined run of part two, executed while a compat `bun ci`,
  `bun lint`, `bun typecheck` and SDK regeneration were running in a second
  worktree, additionally reported a 120 s timeout in
  `test/session/prompt-effect.test.ts` and one `skill-catalog-capture.test.ts`
  failure. Both files pass on the merged tree when re-run without that load,
  and the clean matrix above reproduces neither. They are recorded as
  contention artifacts of that run, not as findings.
- Seven mutation checks, not merely green observation:
  - Forcing `classifyAttachment` to return `"fits"` failed 9 of 108 cases across
    `test/tool/read.test.ts`, `test/mcp/tool-result.test.ts`,
    `test/session/prompt.test.ts` and `test/tool/read-state.test.ts`.
  - Disabling the PDF capability gate failed `tool.read pdf capability gate >
    refuses a PDF without reading it when the model lacks pdf input`.
  - Moving `markFileRead` back above the shrink result failed
    `tool.read-state attachment gate > an oversized image that could not be
    attached does not authorize an edit`.
  - Restoring the old `"completed" in msg.info.time` recovery exclusion failed
    the `completed + tool-calls` and `completed + length` predicate cases.
  - Taking upstream's predicate verbatim, so that any errored message stays a
    candidate after settlement, failed `sweepOrphanAssistants > keeps an errored
    assistant recoverable until a new user admission abandons it`. The merged
    predicate is therefore pinned from both sides.
  - Moving the override's `getModel` validation after
    `commitRecoveryCandidate` failed `an unresolvable model override leaves the
    turn recoverable`.
  - Removing the non-main `agentID` override refusal failed `resume with a model
    override for a non-main agent returns 400`.
  Every mutated file was restored and re-diffed before its commit.
- Coverage limit, recorded rather than claimed: ignoring `resumeFrom` (reverting
  `lastAssistant.id !== resumeFrom` to `lastAssistant`) changes no test outcome
  in `test/server/session-recovery.test.ts`,
  `test/server/session-actor-recovery.test.ts` or
  `test/session/prompt-effect.test.ts` (149 tests, all passing either way).
  Upstream ships no regression for it either. The parameter is adopted for
  upstream parity and is bound to the settled candidate; its effect on a resumed
  turn's first step is unproven here.
- Ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` were
  removed for every run; the package's own preload is preserved as the harness
  baseline.
- `bun lint` reported 0 errors and 4508 warnings; the pre-merge baseline at
  `ea633a0b` reported 0 errors and 4507. `git diff --check` passed.
- Note for reproduction: `test/tool/edit.test.ts` run alone or in a small file
  set fails before its first test with
  `ReferenceError: Cannot access 'ActorControl' before initialization` from
  `src/tool/tool-script.ts`. This reproduces identically at the pre-merge
  `ea633a0b` baseline and disappears as soon as another `test/tool` file shares
  the process, as in CI. It is a module-initialization-order artifact of file
  selection, not a regression from this delta.

## Recommendation (not applied)

`src/provider/transform.ts` carries a private `base64ByteSize` that now
duplicates the exported one in `src/util/media.ts`. Consolidating them is outside
this synchronization's authority and is recorded here only as a follow-up
candidate.

## Capability results (2)

| ID | Main result | Compat integration decision | Decisive evidence |
| --- | --- | --- | --- |
| C01 | Adopted the production-time attachment gate and the PDF capability refusal unchanged; FC-003 read state moved to the image success path | Inherit through the direct main merge; no compat override | `test/tool/read.test.ts` size-limit and PDF-gate cases, `test/mcp/tool-result.test.ts`, `test/session/prompt.test.ts`, and the new `test/tool/read-state.test.ts` attachment-gate cases; three mutation checks fail without their fix |
| C02 | Adopted the recovery predicate, idempotent settlement, classification skip and resume model override through the fork's `startResumeTurn` admission; actor overrides refused, artifacts regenerated | Inherit through the direct main merge; no compat override | `test/server/session-recovery.test.ts` predicate matrix, paired-parameter 400, actor-override 400 and pre-settlement validation; `test/server/openapi-refs.test.ts`; three mutation checks fail without their fix, and the `resumeFrom` coverage gap is recorded above |

Remote-tip equality, exact-tip CI and upstream→main→compat ancestry are checked
independently after final publication, and are not inferred from local results.
