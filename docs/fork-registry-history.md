# Shared Fork Registry History

This is the append-only audit ledger for upstream-to-`main` reviews. It lives on
`main` and `dev/compat` inherits it unchanged. New reviews add rows; they do not
rewrite the behavior references or decisions recorded by earlier rows.

Pure registry/history commits may be recorded separately for traceability, but
they are never used as an `upstream` or `main behavior` review basis.

## Audit ledger

| Date | Upstream | Main behavior | Active FD | Active FC | Changed-path total | Decision summary |
| --- | --- | --- | ---: | ---: | --- | --- |
| 2026-08-23 | `c23eeaed1983197f1c45ac3ec14c6b99784b7d27` | `7c52b1412e9e39685b6975bdc4a4847fe2352647` | 6 | 13 | 211 paths; 19,057 insertions; 8,460 deletions | Retained the six shared rejection contracts and thirteen non-duplicating shared capability/process owners; adopted upstream custom-exec wrapper normalization while keeping the nested-authority and raw-size boundaries; restored the shared WebFetch target-classification baseline and scoped FC-010 to redirect permission/resource bounds; removed bounded upstream-format and loop-form drift. |
| 2026-08-23 | `c23eeaed1983197f1c45ac3ec14c6b99784b7d27` | `d1e3ddc3298a2b4504651d0fcaf7e8aa24affa39` | 6 | 13 | 211 paths; 19,073 insertions; 8,461 deletions | Correction: narrowed custom-exec leading-angle normalization to malformed variable-declaration assignments, preserving valid TypeScript const assertions and generic arrows while retaining the wrapper, raw-size, nested-authority, and timeout boundaries. |
| 2026-08-23 | `c23eeaed1983197f1c45ac3ec14c6b99784b7d27` | `edc2d123cbebfadc8fb7a8a18c4974def0fc2be5` | 6 | 13 | 211 paths; 19,096 insertions; 8,469 deletions | Correction: use actual async-body TypeScript diagnostics for leading-angle repair; preserve already-valid const assertions and generic arrows, including default generics, and repair only an invalid source when removing the angle yields zero diagnostics. |
| 2026-08-24 | `c23eeaed1983197f1c45ac3ec14c6b99784b7d27` | `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8` | 6 | 13 | 213 paths; 19,110 insertions; 8,473 deletions | Correction: upstream still blocks only textual `fe80:` link-local addresses; fork main now blocks the complete numeric and DNS-resolved IPv6 `fe80::/10` range through FC-010 without adding a duplicate owner. |
| 2026-08-25 | `5e32992a97ed7f8d2d00e4c312133716292dab9e` | `1cfe7efc8f13da6157f30324c4eeac0111e99115` | 6 | 13 | 234 paths; 22,785 insertions; 8,955 deletions | Adopted upstream recovery, turn-context, replayable nested-exec, bundled-skill, Desktop notification-card, and auto-worktree changes; hardened main run admission/cancellation, recovery mutation, nested-exec terminal settlement, TUI rendering, and GitLab workflow context without weakening the six FD or thirteen FC contracts. |
| 2026-08-25 | `fa6fdf176cef7f82659705b555333d6302725748` | `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` | 6 | 13 | 240 paths; 23,405 insertions; 9,188 deletions | Adopted fixed instance cwd with an inert SDK-compatibility event schema, centralized retry configuration/classification/request/live-step/status coordination, bounded MaxMode retry, and typed busy admission; corrected four retry boundary/configuration seams and published main-only recovery/resume while retaining all six FD and thirteen FC contracts. |
| 2026-08-27 | `1fc2daac07b5936f4dcba75143bc7d9af971caa1` | `07d16a5f757377b816a1979297ec1cce80b7c9bd` | 6 | 15 | 251 paths; 24,431 insertions; 10,181 deletions | Classified 12 incoming capabilities; adopted reliable localized titles, relative paths, versioned skill snapshots, checkpoint fork default, actor isolation, and compaction controls; adapted model identity, stable memory paths, retry publication, and reserve-safe compaction while retaining all six FD contracts and adding FC-015 as the sole compaction-boundary owner. |
| 2026-08-27 | `6da12e0c98d9e2c4838896eac642c65179501f8e` | `d0acb856f1ec0edae6cce29ca44178af14d94293` | 6 | 15 | 252 paths; 24,541 insertions; 10,196 deletions | Adopted actor-scoped `replace-agent` for main/peer, but separated identity replacement from checkpoint's unknown-actor fail-open: only main and positively registered non-system peers inherit the session base; subagent, system, ephemeral, and unknown actors retain their own prompt. |

## 2026-08-23 review details

- Prior reviewed upstream: `f57520c08d4d10e64ac035e90ba561e889119c98`
- Freshly reviewed upstream: `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`
- Prior fork `main` tip: `f63e6d4ee2eb26d7c43de32c69f61ae754b6eff0`
- Main behavior: `7c52b1412e9e39685b6975bdc4a4847fe2352647`
- Incremental upstream review: 5 commits, including 2 first-parent commits.
- Main transition: 12 commits from the prior fork tip, including 10 non-merge
  commits. The final behavior SHA includes the upstream merge, shared behavior
  adjustments, tests, and bounded noise alignment before registry publication.
- Active ownership result: FD-001, FD-002, FD-004, FD-005, FD-006, and FD-009;
  FC-001 through FC-013. Missing FD numbers remain unused.
- Path universe after exclusions: 90 paths under `packages/opencode/src`, 91
  under `packages/opencode/test`, and 30 elsewhere, totaling 211 paths.

### Changed-path calculation

The 211-path, 19,057-insertion, 8,460-deletion total compares the reviewed
upstream tree directly with the pre-documentation main behavior tree. It
excludes all five registry/history tracking paths:

```text
docs/upstream-deviations.md
docs/fork-capabilities.md
docs/dev-compat-overrides.md
docs/fork-registry-history.md
docs/dev-compat-registry-history.md
```

Reproduction commands:

```bash
git diff --shortstat \
  c23eeaed1983197f1c45ac3ec14c6b99784b7d27 \
  7c52b1412e9e39685b6975bdc4a4847fe2352647 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  c23eeaed1983197f1c45ac3ec14c6b99784b7d27 \
  7c52b1412e9e39685b6975bdc4a4847fe2352647 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

### Decision notes

- Shared behavior remains owned once: FDs own explicit upstream rejections;
  FCs own extensions, adaptations, and process contracts without restating an
  FD as a second authority.
- FD-006 records the selective decision at the new upstream behavior: custom
  outer-wrapper normalization was adopted, the nested shell bridge and typo
  repair were rejected at the authority boundary, and the raw code size gate
  remains before and after normalization.
- Shared WebFetch behavior now keeps target classification in the source
  baseline. FC-010 owns only HTTP(S), per-hop permission, manual redirects up to
  10 hops, timeout, and the 5 MB response bound. Compatibility-only network
  guarantees are not published in the shared registries.
- Commit `7c52b1412e9e39685b6975bdc4a4847fe2352647` aligned 12 bounded format paths
  exactly to upstream: 10 paths received only EOF/blank-line changes, one
  example heading received upstream's trailing space, and
  `example-of-the-three-elements.md` received upstream's two-space CommonMark
  hard break. The last path is therefore recorded as exact upstream
  format/render alignment, not as a blanket behavior-neutral change.
- The same commit restored upstream's `Object.entries(provider.models)` loop in
  `packages/opencode/src/plugin/codex.ts`; the unused key does not change the
  loop's model-cost mutation behavior.

## 2026-08-23 tool-script normalization correction

- Reviewed upstream remains `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`.
- Corrected main behavior: `d1e3ddc3298a2b4504651d0fcaf7e8aa24affa39`.
- The correction narrows the adopted custom-exec wrapper normalization: a
  leading `<` is stripped only before a malformed `const`, `let`, or `var`
  identifier assignment. Valid leading TypeScript `<const>[1, 2]` assertions
  and `<const T>(x: T) => x` generic arrows remain source-preserving.
- Active ownership remains FD=6 and FC=13. FD-006 still retains the raw-code
  byte gate before and after normalization, `timeout_seconds`, direct-tool
  permission visibility, and nested `bash`/`exec_command` exclusions.

### Corrected changed-path calculation

The corrected 211-path, 19,073-insertion, 8,461-deletion total compares the
same reviewed upstream tree with the corrected pre-documentation main behavior
tree and excludes the same five registry/history tracking paths:

```bash
git diff --shortstat \
  c23eeaed1983197f1c45ac3ec14c6b99784b7d27 \
  d1e3ddc3298a2b4504651d0fcaf7e8aa24affa39 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  c23eeaed1983197f1c45ac3ec14c6b99784b7d27 \
  d1e3ddc3298a2b4504651d0fcaf7e8aa24affa39 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-08-23 syntax-aware tool-script angle repair correction

- Reviewed upstream remains `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`.
- Corrected main behavior: `edc2d123cbebfadc8fb7a8a18c4974def0fc2be5`.
- Explicit outer parameter wrappers are stripped before the existing async-body
  TypeScript transpile. A leading-angle candidate is considered only if the
  original wrapped source reports diagnostics, and is adopted only if it has
  zero diagnostics after removing `<`; otherwise the original source and its
  diagnostics remain authoritative. This preserves valid `<const>[1, 2]`,
  `<const T>(x: T) => x`, and `<const T = string>(x: T) => x` source.
- Active ownership remains FD=6 and FC=13. FD-006 still retains the raw-code
  byte checks before and after outer-wrapper normalization, `timeout_seconds`,
  direct-tool permission visibility, and nested `bash`/`exec_command`
  exclusions.

### Syntax-aware changed-path calculation

The syntax-aware 211-path, 19,096-insertion, 8,469-deletion total compares the
same reviewed upstream tree with the corrected pre-documentation main behavior
tree and excludes the same five registry/history tracking paths:

```bash
git diff --shortstat \
  c23eeaed1983197f1c45ac3ec14c6b99784b7d27 \
  edc2d123cbebfadc8fb7a8a18c4974def0fc2be5 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  c23eeaed1983197f1c45ac3ec14c6b99784b7d27 \
  edc2d123cbebfadc8fb7a8a18c4974def0fc2be5 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-08-24 IPv6 link-local SSRF correction

- Reviewed upstream remains `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`.
- Corrected main behavior: `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Upstream has the same defect: its IPv6 classifier blocks only a textual
  `fe80:` prefix. Fork main now blocks the complete `fe80::/10` range for both
  numeric URLs and DNS-resolved family-6 addresses. FC-010 owns this
  destination-classification hardening together with the WebFetch HTTP(S),
  per-hop permission, manual-redirect, timeout, and response-size boundaries.
- Active ownership remains FD=6 and FC=13; no duplicate FD or FC was added.

### IPv6 correction changed-path calculation

The 213-path, 19,110-insertion, 8,473-deletion total compares the same reviewed
upstream tree with the corrected pre-documentation main behavior tree and
excludes the same five registry/history tracking paths:

```bash
git diff --shortstat \
  c23eeaed1983197f1c45ac3ec14c6b99784b7d27 \
  e0389a146ad09a439bbb1009b5f01fc3cc63d7d8 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  c23eeaed1983197f1c45ac3ec14c6b99784b7d27 \
  e0389a146ad09a439bbb1009b5f01fc3cc63d7d8 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-08-25 upstream synchronization

- Prior reviewed upstream: `c23eeaed1983197f1c45ac3ec14c6b99784b7d27`.
- Freshly reviewed upstream: `5e32992a97ed7f8d2d00e4c312133716292dab9e`.
- Prior fork `main` tip: `98f1652bcab2038989f6e522fe41a2cb35b5e90f`.
- Upstream merge behavior: `10fc0c5ef2a3d65edc35766628b2bc178a99d00a`.
- Corrected main behavior: `1cfe7efc8f13da6157f30324c4eeac0111e99115`.
- Incoming range: 6 first-parent commits, 36 paths, 2,395 insertions, and
  62 deletions from the prior reviewed upstream.
- Active ownership remains FD=6 and FC=13; no duplicate owner was added.

### Decision notes

- Adopted append-only interrupted-turn recovery and its generated API/SDK, but
  restricted mutation to main sessions and shared atomic admission with normal
  prompt, command, shell, summarize, and resume entry points. Concurrent callers
  now receive the same stable HTTP 409 boundary.
- Adopted per-turn context propagation through the GitLab workflow path and
  telemetry. The provider request receives the same context that telemetry
  records for both append and replace-agent workflows.
- Adopted replayable nested `exec` parts and live TUI children. FD-006 still
  excludes actor, shell, `exec_command`, and control tools; terminal settlement
  closes admission, aborts and joins work, caps persisted `sub_parts` at 256 KiB,
  and preserves bounded ANSI-free outer output.
- Adopted the upstream `mate` bundled skill, Desktop notification cards, and
  auto-worktree conflict/hint/routing changes without adding fork-only owners.
  The Desktop change was source/type checked; no visual runtime claim is made.
- Retained FD-002 instruction delivery for normal and MaxMode requests, FD-009
  fail-closed frozen capture, FC-013's tool-free final step, and all remaining
  active FD/FC contracts after reviewing clean merges as well as conflicts.

### Capability inventory (10/10)

`AR-20260825` is the audit range used by every row:
`old_upstream=c23eeaed1983197f1c45ac3ec14c6b99784b7d27`,
`new_upstream=5e32992a97ed7f8d2d00e4c312133716292dab9e`,
`main_merge=10fc0c5ef2a3d65edc35766628b2bc178a99d00a`,
`main_behavior=1cfe7efc8f13da6157f30324c4eeac0111e99115`,
`compat_merge=d346cc168b10df75769f44e3a4a8cba9a4d44259`, and
`compat_behavior=ca446d40348b62fe4174e34fe0cf5a311fa12c06`.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Interrupted-turn recovery | `AR-20260825` | `84f17b64`; `server/routes/instance/session.ts` `session.recovery`/`session.resume`; `session/prompt.ts` `recoveryCandidates`/`resume`; generated SDK methods | FC-001 Runner/SessionRunState admission and main-session identity | Inherits shared API; DC-CONTEXT-001/DC-ACTOR-001 remain additional prompt policy | complementary | behavior, contract, schema-config, tests | shared main | Adopt and adapt: append-only/main-only recovery, shared atomic admission, stable 409, regenerated SDK | Recovery route 4/4, prompt-busy, MessageAbortedError, typecheck, and idempotent SDK generation passed |
| 2 | Turn-context tail and GitLab request telemetry | `AR-20260825` | `84f17b64`; `session/llm.ts` `turnContextMessages`/`appendTurnContext`; `turn-context-tail.test.ts` | FD-002 request-system parity and FC-013 MaxMode routing | DC-CONTEXT-001 counts current context as unshrinkable; DC-ACTOR-001 freezes parent `turnContext` | complementary | behavior, tests | shared main | Adopt; use one `providerSystem` for provider, workflow, and telemetry; preserve compat frozen/preflight extensions | Turn-context-tail and GitLab append/replace-agent regressions plus compat frozen-context audit passed |
| 3 | Replayable nested-exec schema | `AR-20260825` | `32574b4f`; `tool/tool-script.ts` `exec_schema`/`sub_parts`/`viewExecSubtools`; `exec-subtool-metadata.md` | FD-006 existing nested authority, timeout, and raw-code limits | Inherits shared schema unchanged | partial duplicate | schema-config, behavior, tests | shared main | Adopt and adapt: validate persisted snapshots and cap final serialization at 256 KiB | Tool-script replay/scalar/malformed/256 KiB regressions passed |
| 4 | Nested-exec live lifecycle and expanded TUI | `AR-20260825` | `32574b4f`; `tool-script.ts` progress publication; TUI `routes/session/index.tsx` | FD-006 nested execution plus fork cancellation/resource boundaries | Inherits shared lifecycle and TUI behavior unchanged | partial duplicate | behavior, tests, naming-style | shared main | Adapt: close admission, abort running calls, reject queued calls, join cleanup, coalesce snapshots, and extract `ExecExpandedBody` while retaining outer output | Close-abort-join and live-metadata tests passed; expanded TUI 2/2 passed |
| 5 | Actor send-only from nested exec | `AR-20260825` | `0e5bf7b3`; `tool/actor.ts` `ctx.extra.fromExec`; `tool-script.ts` nested context | FD-006 excludes `actor` entirely from nested `exec` | Inherits FD-006; DC-ACTOR-001 governs direct full-context actors, not nested exposure | conflicting | behavior, contract, tests, docs | shared main | Reject nested actor exposure; retain `fromExec` send-only guard as defense in depth | Actor exclusion, declaration, `fromExec`, and compat frozen-actor regressions passed |
| 6 | Desktop actor notification cards | `AR-20260825` | `c3eeb3d7`; UI `actor-notification.ts`, `ActorNotificationCard`, `message-part.tsx` `notificationParts` | No Desktop counterpart; TUI has a separate actor-notification renderer | Inherits shared UI files unchanged | no overlap | none | shared main | Adopt exactly; no new FD/FC owner | UI and Desktop typecheck plus repository lint passed; no visual runtime claim |
| 7 | `mate` bundled skill | `AR-20260825` | `77ea45c4`; `skill/builtin/.bundle/mate/SKILL.md` | Existing builtin-skill discovery framework; no `mate` duplicate | Inherits shared bundle unchanged | no overlap | none | shared main | Adopt exactly; no new FD/FC owner | Frontmatter/content review and bundled-skill discovery regression passed |
| 8 | Auto-worktree detector and route | `AR-20260825` | `5e32992a`; `tool/conflict-detection.ts` `checkConflict`; `ExperimentalRoutes.worktree.auto`; `auto-worktree.md` | Existing `Worktree.Service` and FC-007 protected worktree/root boundary; no registered duplicate | Inherits shared detector/route; DC-PLATFORM-001 has no overlapping owner | complementary | schema-config, tests | shared main | Adopt exactly; record the optional `sessionID` body vs generated `body?: never` mismatch as a follow-up candidate, without expanding sync authority | Source audit, SDK regeneration, and typecheck passed; incoming range has no focused route regression |
| 9 | First-turn auto-worktree soft hint | `AR-20260825` | `5e32992a`; `session/prompt.ts` first-assistant-less `checkConflict` branch | No duplicate; FD-002 still owns instruction delivery, not this soft hint | DC-CONTEXT-001 counts the injected current-turn system text during preflight | complementary | behavior, tests | shared main | Adopt; preserve compat request-boundary accounting | Prompt suites and compat preflight regressions passed; incoming range has no focused hint regression |
| 10 | Governance, dependencies, migrations, and CI | `AR-20260825` | Range path audit: no `.github/workflows`, dependency/lockfile, package-version, or migration changes | FC-008 CI/runtime process and FC-012 fork-only routing | Inherits shared workflow/governance files unchanged | no overlap | none | shared main | Retain existing fork workflow filters and fork-only push policy; no workflow mutation | Name-status/config scan clean; exact-SHA remote CI remains the publication gate |

Inventory count is 10 and result-row count is 10. Every row records an audit
range, both branch counterparts, relationship, drift, canonical owner,
disposition, and status evidence; no capability remains unclassified.

### Changed-path calculation

The 234-path, 22,785-insertion, 8,955-deletion total compares the freshly
reviewed upstream tree with the corrected pre-documentation main behavior and
excludes all five shared/compat registry tracking paths:

```bash
git diff --shortstat \
  5e32992a97ed7f8d2d00e4c312133716292dab9e \
  1cfe7efc8f13da6157f30324c4eeac0111e99115 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  5e32992a97ed7f8d2d00e4c312133716292dab9e \
  1cfe7efc8f13da6157f30324c4eeac0111e99115 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-08-25 fixed instance cwd, SDK compatibility, and retry coordinator synchronization

- Prior reviewed upstream: `5e32992a97ed7f8d2d00e4c312133716292dab9e`.
- Freshly reviewed upstream: `fa6fdf176cef7f82659705b555333d6302725748`.
- Prior fork `main` tip: `e65c86f341f2a5f15d375cc087e33b17037e36ca`.
- Intermediate main behavior: `30d7d6290f1e4112399fa0be795775c6eb8238e3`;
  its parents are prior fork `main` tip and upstream `e32a0a3e`.
- Final main merge and behavior: `6ae30e66ab0ecbb526f85009d300e7c2533fe72c`;
  its parents are intermediate main behavior `30d7d629` and upstream
  `fa6fdf17`.
- Incoming range: 3 first-parent commits, 65 paths, 3,323 insertions, and
  901 deletions from the prior reviewed upstream.
- Main transition: two first-parent merge commits. Their combined first-parent
  tree delta is 60 paths, 3,720 insertions, and 911 deletions.
- Final main `6ae30e66` passed 77 focused OpenAPI-reference and tool-script
  tests with 0 failures. Package and SDK typecheck and idempotent JavaScript
  SDK generation passed.
- Intermediate compat behavior: `79bfd1bdb62fe4eb61a26be8fe44c4abbc848f6d`;
  its parents are prior compat tip `19cad20c689eaa027db802cc942a374afa1b50bf`
  and intermediate main behavior `30d7d629`.
- Frozen compat behavior: `bcbd16fc237a5b2c6f2800afe834830ad739aa01`;
  its parents are intermediate compat behavior `79bfd1bd` and final main
  behavior `6ae30e66`.
- The compat delta is 58 paths, 3,593 insertions, and 233 deletions after the
  same five registry/history exclusions. The broader intermediate compat matrix
  at `79bfd1bd` completed 397 tests with 2 documented skips and 0 failures;
  package typecheck, lint, and idempotent JavaScript SDK generation passed.
  Final compat `bcbd16fc` passed 3 focused regressions with 0 failures, package
  and SDK typecheck, and idempotent JavaScript SDK generation.
- Active ownership remains FD=6 and FC=13; no duplicate owner was added.
- Path universe after exclusions: 103 paths under `packages/opencode/src`, 106
  under `packages/opencode/test`, and 31 elsewhere, totaling 240 paths.

### Decision notes

- Adopted removal of mutable session cwd and `change_directory`.
  `SessionCwd.get()` now resolves only `Instance.directory`; callers use
  absolute paths or explicit `workdir`. FC-007 retains the protected-root,
  project/worktree containment, deletion, and optional-context boundaries.
  Upstream `fa6fdf17` restores `SessionCwd.Event.Changed` and generated
  `EventSessionCwd` only as an inert SDK-compatibility schema: there is no
  setter, clear path, event publisher, TUI override, or mutable cwd state.
- The same upstream regeneration exposes the already-adopted `worktree.auto`
  client that was present in intermediate main `30d7d629` and inventoried in
  the prior audit. This is generated-surface convergence, not a tenth
  capability or a new owner.
- Adopted one configurable retry coordinator and corrected four seams before
  freezing main behavior: raw faults after provider output cannot re-enter
  request retry; bounded network mode remains finite when `maxRetries` is
  omitted; top-level jitter defaults propagate through budget/provider
  precedence; and request-scoped setup failures retain request budget and
  telemetry even when their error kind is stream-shaped.
- Preserved the tool side-effect boundary. A completed tool call followed by an
  in-band retryable 503 or a raw stream fault does not replay the whole model
  step, make a second provider call, or execute the tool twice.
- Adopted bounded candidate/judge MaxMode retry with fresh attempt-local
  accumulators. Subagents may execute eligible MaxMode work but cannot publish
  session-global retry status or `RetryAttempt` events; FC-013's tool-free final
  step remains unchanged.
- Adopted typed Runner admission and `Session.BusyError` while retaining fork
  generation, cancellation, stale-idle, persistent-peer, and disposal
  hardening. Recovery/resume remain main-only and atomically admitted; upstream
  agent/task selectors and `resumeBackground` were rejected.
- Regenerated the published OpenAPI from resolved fork routes. Runtime and
  published recovery/resume operations omit their upstream agent/task selectors,
  describe main-agent behavior, and retain the stable HTTP 409 busy boundary.
- Detached workflow and callback effects retain their owning Effect context.
  The accompanying `AGENTS.md` default-environment rule is an FC-008
  publication/process companion: default-path validation clears ambient
  `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and
  `MIMOCODE_CODEX_MODE`, while package-owned preload flags remain a separately
  reported harness baseline. Opt-in tests add only their target selector beyond
  that baseline; default-off assertions for a preload-enabled feature require
  an isolated non-test child process with its selector removed before flag
  import. This rule does not advance the frozen main behavior or this
  changed-path calculation.
- The incoming range contains no workflow, dependency/lockfile, migration, or
  repository-governance change. All six FD and thirteen FC contracts remain
  active after reviewing clean merges as well as conflict resolutions.

### Capability inventory (9/9)

`AR-20260825-R3` is the audit range used by every row:
`old_upstream=5e32992a97ed7f8d2d00e4c312133716292dab9e`,
`new_upstream=fa6fdf176cef7f82659705b555333d6302725748`,
`main_merge=main_behavior=6ae30e66ab0ecbb526f85009d300e7c2533fe72c`,
and
`compat_merge=compat_behavior=bcbd16fc237a5b2c6f2800afe834830ad739aa01`.

`INTERMEDIATE-MATRIX` below means the broader row-specific main tests ran at
`30d7d629`, while compat `79bfd1bd` completed 397 tests with 2 documented skips
and 0 failures plus package typecheck, lint, and idempotent SDK generation. It
is intermediate behavior evidence, not a claim that the full matrix reran at
the final SHAs. `FINAL-MAIN-VERIFIED` means `6ae30e66` completed 77 focused
OpenAPI-reference and tool-script tests with 0 failures, package and SDK
typecheck, and idempotent SDK generation. `COMPAT-VERIFIED` means `bcbd16fc`
completed 3 focused published-OpenAPI/main-only, subagent MaxMode retry
status/event-isolation, and
full-context MaxMode regressions with 0 failures, package and SDK typecheck, and
idempotent SDK generation. Every listed `packages/opencode` test command cleared
the three ambient selectors above and ran with the package-owned
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` preload baseline.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Fixed instance cwd, `change_directory` removal, and inert SDK compatibility | `AR-20260825-R3` | `2b537aa9`; `SessionCwd.get`; deleted `change-directory.ts`; `fa6fdf17` `SessionCwd.Event.Changed`, generated `EventSessionCwd`, and OpenAPI schema; no publisher | FC-007 fixed cwd, inert compatibility schema, and protected-root/deletion boundaries | `bcbd16fc` inherits the shared cwd/tool/schema surface unchanged; no DC owner overlaps | complementary | behavior, contract, schema-config, docs, tests | shared main | Adopt removal and inert schema; use absolute paths or explicit `workdir`; never restore mutation or publication | Final source/generated residual audit proves no setter, clear path, or `Event.Changed` publisher; the removed upstream focused cwd test is not claimed as runtime evidence; `INTERMEDIATE-MATRIX`; `FINAL-MAIN-VERIFIED`; `COMPAT-VERIFIED` |
| 2 | Retry configuration and budgets | `AR-20260825-R3` | `e32a0a3e`; `config/retry.ts` `ConfigRetry.Budget`/`Info`; `session/retry.ts` `resolve`/`budgetFor`/`policy` | Shared config plus finite bounded-network default and global/budget/provider jitter precedence | `bcbd16fc` inherits shared config; DC-MODEL-001 consumes it without changing ownership | partial duplicate | schema-config, behavior, generated API, tests | shared main | Adopt and correct configuration precedence and bounded defaults | `INTERMEDIATE-MATRIX`: bounded-network, jitter-precedence, deadline, and budget tests passed; `FINAL-MAIN-VERIFIED`; `COMPAT-VERIFIED` |
| 3 | Error normalization and retry classifier | `AR-20260825-R3` | `e32a0a3e`; `provider/error.ts` `summarizeCause`/`isRetryableNetworkError`/`allowsModelNotFoundRetry`; `message-v2.ts` `fromError`/`isAuthError` | One classifier for request/live/MaxMode policy with abort precedence and adapter-scoped 404 retry | `bcbd16fc` inherits the classifier; DC-CONTEXT-001 retains bounded error serialization | partial duplicate | behavior, error contract, tests | shared main | Adopt shared normalization/classification | `INTERMEDIATE-MATRIX`: provider-error, message normalization, auth/abort, and 404 regressions passed; `FINAL-MAIN-VERIFIED`; `COMPAT-VERIFIED` |
| 4 | Pre-output request-phase retry | `AR-20260825-R3` | `e32a0a3e`; `session/llm.ts` `retryRequest`/`protectRequestReplayBoundary`; `session/retry.ts` request-scope phase/budget | Provider SDK retry stays disabled; output-free faults may retry, post-output raw faults stay out, and request scope controls budget/telemetry | `bcbd16fc` reuses the already preflighted bounded request; DC-CONTEXT-001 caps and active-tool accounting remain mandatory | partial duplicate | behavior, request boundary, status, tests | shared main | Adopt and correct request replay/telemetry boundaries | `INTERMEDIATE-MATRIX`: before/after-provider-output and stream-shaped setup-error regressions passed; `FINAL-MAIN-VERIFIED`; `COMPAT-VERIFIED` |
| 5 | Live-step retry and tool side-effect boundary | `AR-20260825-R3` | `e32a0a3e`; `session/processor.ts` `ctx.retrySafe`; tool-call transition; `SessionRetry.policy` `replaySafe` | FC-009 removes attempt-local parts only while replay-safe and forbids whole-step replay after a tool call | `bcbd16fc` inherits the boundary while retaining DC-CONTEXT-001 caps and DC-ACTOR-001 frozen context | partial duplicate | behavior, persistence, side-effect boundary, tests | shared main | Adopt and adapt with FC-009 text-part lifecycle | `INTERMEDIATE-MATRIX`: in-band 503 and raw-fault characterizations each prove one provider/tool execution after a completed side effect; `FINAL-MAIN-VERIFIED`; `COMPAT-VERIFIED` |
| 6 | Retry status, attempt, and notice events | `AR-20260825-R3` | `e32a0a3e`; `session/status.ts` `setRetry`; `Session.Event.RetryAttempt`; TUI status and generated API fields | Global and phase attempts, persistent `maxAttempts: 0`, notice/idle reset, and main-only MaxMode status/event writes | `bcbd16fc` inherits the event schema and retains DC-MODEL-001 subagent status isolation | partial duplicate | event schema, API, TUI behavior, tests | shared main | Adopt fields/UI and preserve main-agent publication gate | `INTERMEDIATE-MATRIX`: retry/status/TUI/global-attempt regressions passed; `FINAL-MAIN-VERIFIED`; `COMPAT-VERIFIED` |
| 7 | Bounded MaxMode candidate/judge retry | `AR-20260825-R3` | `e32a0a3e`; `session/max-mode.ts` `retryPolicy`/`runCandidate`/`judge`; `max-mode-econnreset.test.ts` | FC-013 combines bounded retry with the tool-free final step and main-only status/event writes | `bcbd16fc` retains DC-MODEL-001 per-agent opt-in, preflight/caps, and structured-output/final-step exclusions | partial duplicate | behavior, config, status isolation, tests | shared main | Adopt bounded retry; retain fork final-step and status isolation | `INTERMEDIATE-MATRIX`: MaxMode routing/final-step and candidate/judge EConnReset regressions passed; `FINAL-MAIN-VERIFIED`; `COMPAT-VERIFIED` |
| 8 | Typed Runner admission and hardened lifecycle | `AR-20260825-R3` | `e32a0a3e`; `effect/runner.ts` `Runner<A,E,B>`/`start`; `session/run-state.ts`; Effect-context bridge call sites | FC-001 retains `startRunning`, generation IDs, two-phase cancellation, stale-idle exclusion, detached cancel, and disposal | `bcbd16fc` inherits the same shared FC-001 lifecycle and typed busy failures | complementary | type/API, concurrency, cancellation, Effect context, tests | shared main | Layer typed busy/start API over the stronger atomic fork lifecycle | `INTERMEDIATE-MATRIX`: runner/run-state focused matrix passed 46 tests with 0 failures; `FINAL-MAIN-VERIFIED`; `COMPAT-VERIFIED` |
| 9 | Recovery/resume lifecycle and published API | `AR-20260825-R3` | `e32a0a3e`; `server/routes/instance/session.ts` recovery/resume; `session/prompt.ts` `ResumeTurnInput`/`startResume`; `openapi-refs.test.ts` | FC-001 keeps atomic main-only admission, typed `Session.BusyError`, and stable 409; no `resumeBackground` | `bcbd16fc` inherits shared admission/API while retaining DC-CONTEXT-001 preflight and DC-ACTOR-001 frozen context | conflicting | API/schema, identity, admission, concurrency, tests | shared main | Adopt typed errors; reject upstream agent/task selectors, background resume, and assert-then-start TOCTOU | `INTERMEDIATE-MATRIX`: resume service 2/2, server recovery/busy 8/8, and runtime/published main-only OpenAPI regressions passed; `FINAL-MAIN-VERIFIED`; `COMPAT-VERIFIED` |

Inventory count is 9 and result-row count is 9. Every row records an audit
range, commit/path/symbol evidence, both branch counterparts, relationship,
drift, canonical owner, disposition, and status evidence; no incoming
capability remains unclassified.

### Changed-path calculation

The 240-path, 23,405-insertion, 9,188-deletion total compares the freshly
reviewed upstream tree with the frozen pre-documentation main behavior and
excludes all five shared/compat registry tracking paths:

```bash
git diff --shortstat \
  fa6fdf176cef7f82659705b555333d6302725748 \
  6ae30e66ab0ecbb526f85009d300e7c2533fe72c -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  fa6fdf176cef7f82659705b555333d6302725748 \
  6ae30e66ab0ecbb526f85009d300e7c2533fe72c -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-08-27 title, stable-prefix, and compaction synchronization

- Prior reviewed upstream: `fa6fdf176cef7f82659705b555333d6302725748`.
- Freshly reviewed upstream: `1fc2daac07b5936f4dcba75143bc7d9af971caa1`.
- Prior fork `main` tip: `a308ca96782a12e1c8df80059562b16ee456794e`.
- Main merge and behavior: `07d16a5f757377b816a1979297ec1cce80b7c9bd`;
  its parents are the prior fork `main` tip and freshly reviewed upstream.
- Incoming range: 17 commits including 9 first-parent commits, 70 paths,
  1,895 insertions, and 458 deletions. It contains no workflow,
  dependency/lockfile, migration, or package-version change.
- Main transition: one merge commit, 68 paths, 2,557 insertions, and 1,105
  deletions from the prior fork tip. `bun.lock` has the same blob before the
  merge and at the reviewed upstream.
- Main validation completed seven focused groups with 229, 106, 136, 12, 21,
  33, and 5 passing tests respectively, zero final failures, five documented
  skips, and one existing todo. One test first exceeded its five-second local
  timeout under concurrent load and passed alone in 3.308 seconds. The three
  affected packages passed typecheck; lint completed with 0 errors; JavaScript
  SDK regeneration was idempotent; OpenAPI references resolved.
- Active ownership is FD=6 and FC=15. FC-015 is the sole new active owner; the
  other incoming behavior is adopted exactly or routed through existing FD/FC
  contracts without duplicate ownership.

### Decision notes

- MiMo Responses transport now requires a resolved PTC identity, but transport
  does not select the Codex harness or toolset. FD-005's complete identity and
  MiMo v2.5 precedence remain authoritative; FD-006's direct-tool and nested
  authority boundary is unchanged.
- Adopted the SYSTEM role for replace-agent context while retaining one
  provider-system value across provider payloads, workflow telemetry, and
  frozen-prefix capture.
- Adopted checkpoint fork mode as the default. Explicit `fork: false` retains
  the writer-owned frozen prefix and all FC-002/FD-009 fail-closed checks.
- Relative file paths resolve against immutable `Instance.directory`, including
  every MultiEdit entry. This does not restore mutable session cwd.
- Adopted reliable multimodal structured title generation, the source-derived
  `/experimental/title` SDK surface, and end-to-end `titleLocale`. Automatic
  title retries are ephemeral and cannot publish global retry status/events;
  recovery and resume remain main-only.
- Adopted hash-versioned full skill-catalog snapshots without weakening
  permission/tool visibility or rewriting prior history.
- Rejected upstream's final literal `current_session_id` simplification because
  it targets the wrong directory. Frozen instructions retain
  `{current_session_id}` and filesystem tools resolve it at execution time.
- Upstream actor context isolation is already satisfied by the fork's stronger
  session/actor generation and lifecycle implementation.
- Adopted `MIMOCODE_COMPACTION_MAX_CONTEXT` and trigger-ratio configuration.
  The ratio is an earlier-trigger ceiling layered over the reserve boundary,
  never a replacement for reserved response/summary headroom.

### Capability inventory (12/12)

`AR-20260827` is the audit range used by every row:
`old_upstream=fa6fdf176cef7f82659705b555333d6302725748`,
`new_upstream=1fc2daac07b5936f4dcba75143bc7d9af971caa1`, and
`main_merge=main_behavior=07d16a5f757377b816a1979297ec1cce80b7c9bd`.
`MAIN-VERIFIED` means the row's affected tests are included in the focused
groups above and the final typecheck/lint/generated-artifact gates passed.
Compatibility counterpart text names the overlay contract that must survive
normal `main` to `dev/compat` propagation; it does not claim a compat SHA.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | MiMo transport, harness, and toolset identity | `AR-20260827` | `26684027`, `fe113efb`; `usesMimoResponsesApi`, `usesGPTToolset`, provider identity, registry | FD-005 complete identity; FD-006 tool authority | Inherit FD-005/FD-006; DC-MODEL-001 only changes per-agent MaxMode | conflicting | behavior, identity, tools, tests | shared main | Adapt: PTC selects transport only; preserve v2.5 and explicit harness precedence | Provider/system/GPT/registry/tool-script matrix; `MAIN-VERIFIED` |
| 2 | Replace-agent SYSTEM role | `AR-20260827` | `fe113efb`; `turnContextMessages`, `buildSystemArray`, `providerSystem` | FD-002 instruction parity and frozen request prefix | DC-CONTEXT-001 preflights the same replacement context | partial duplicate | message role, frozen prefix, tests | shared main | Adopt SYSTEM role; keep provider payload, workflow telemetry, and frozen capture on one provider system | LLM system/prompt/turn-context tests; `MAIN-VERIFIED` |
| 3 | Checkpoint writer defaults to fork mode | `AR-20260827` | `9085bc54`; `checkpoint.fork`, `forkMode`, bundled config docs | FC-002 mode semantics; FD-009 capture admission | DC-CONTEXT-001 and DC-ACTOR-001 retain bounded frozen capture | conflicting | default, frozen context, docs, tests | shared main | Adopt default true; retain explicit false and fail-closed mode-specific prefixes | Checkpoint fork/message/system tests; `MAIN-VERIFIED` |
| 4 | Relative workspace paths | `AR-20260827` | `689a9890`; MultiEdit and file-tool schemas, Gemini/Compose guidance | FC-007 immutable instance cwd and path safety | DC-PLATFORM-001 remains independent | partial duplicate | path behavior, docs, tests | shared main | Adopt relative resolution against fixed cwd; preserve absolute path/workdir cross-directory rule | Edit/MultiEdit regressions; `MAIN-VERIFIED` |
| 5 | Reliable multimodal title generation | `AR-20260827` | `1844a2f8`; `genTitle`, `titleInputText`, `setTitleIfDefault`, ephemeral LLM | FC-001 lifecycle and FC-009 retry publication | DC-CONTEXT-001 bounds title request context | partial duplicate | behavior, concurrency, retry, tests | shared main | Adopt structured/multimodal/fallback behavior; retain stable root title and ephemeral retry isolation | Prompt/LLM/title tests; `MAIN-VERIFIED` |
| 6 | `/experimental/title` and JavaScript SDK | `AR-20260827` | `1844a2f8`; `experimental.title.generate`, `genTitle`, generated SDK/OpenAPI | FD-004 source-derived API artifacts | Inherit source-generated surface | no overlap | API, schema, generated code | shared main | Adopt from resolved source and regenerate; do not copy generated upstream files | OpenAPI refs, SDK typecheck/idempotence; `MAIN-VERIFIED` |
| 7 | End-to-end `titleLocale` | `AR-20260827` | `1844a2f8`; prompt/command/resume inputs, TUI/App submission, SDK | FC-001 main-only recovery/resume | Inherit locale while preserving compat preflight | complementary | API, UI, lifecycle, tests | shared main | Adopt locale propagation; reject any reintroduction of agent/task resume selectors | Prompt, recovery, App submit tests; `MAIN-VERIFIED` |
| 8 | Versioned skill-catalog snapshots | `AR-20260827` | `8ff4012f`; `skill-catalog.ts`, `insertReminders`, model-message conversion | FC-005 permission-consistent skill catalog; FD-009 frozen capture | DC-CONTEXT-001 counts retained snapshots | complementary | persistence, cache prefix, permissions, tests | shared main | Adapt immutable v2 hash snapshots on top of permission/tool gates | Prompt skill-command/message tests; `MAIN-VERIFIED` |
| 9 | Stable per-session memory paths | `AR-20260827` | `c9c4ff43`, `576b5c12`; memory-path template and filesystem tools | FC-002 stable frozen memory instructions | DC-CONTEXT-001 counts instructions without rewriting history | conflicting | path semantics, prompt cache, tool boundary, tests | shared main | Reject final literal simplification; retain placeholder and execution-boundary resolution | Memory-path and tool regressions; `MAIN-VERIFIED` |
| 10 | Session/actor-scoped fork context | `AR-20260827` | `6c24713d`; actor spawn fork-context key/get/cancel | FC-001 generation/lifecycle; FD-009 frozen admission | DC-ACTOR-001 full-context capture remains stronger | equivalent duplicate | identity, lifecycle, tests | shared main | Retain stronger existing session/actor generation implementation | Actor/fork-context residual audit and sentinel tests; `MAIN-VERIFIED` |
| 11 | `MIMOCODE_COMPACTION_MAX_CONTEXT` | `AR-20260827` | `c9ad1186`; flag getter and overflow `budget` | FC-015 context budget | DC-CONTEXT-001 consumes the same effective window in preflight | no overlap | config grammar, precedence, tests | shared main | Adopt with provider cap, reserve validation, wildcard, and zero-restore behavior | Overflow 64-test matrix segment; `MAIN-VERIFIED` |
| 12 | Configurable compaction trigger ratio | `AR-20260827` | `957bc463`, `9f8852f3`; `contextWindow`, `usable`, ratio parser | FC-015 reserve-safe trigger | DC-CONTEXT-001 preflight must use the inherited effective trigger | conflicting | formula, reserve contract, docs, tests | shared main | Adapt: `min(floor(effective * ratio), max(0, effective - reserved))`; ratio may only move earlier | Overflow/default-environment regressions; `MAIN-VERIFIED` |

Inventory count is 12 and result-row count is 12. Every row records the audit
range, commit/path/symbol evidence, both branch counterparts, relationship,
drift, canonical owner, disposition, and status evidence; no incoming
capability remains unclassified.

### Changed-path calculation

The 251-path, 24,431-insertion, 10,181-deletion total compares the freshly
reviewed upstream tree with the frozen pre-documentation main behavior and
excludes all five shared/compat registry tracking paths:

```bash
git diff --shortstat \
  1fc2daac07b5936f4dcba75143bc7d9af971caa1 \
  07d16a5f757377b816a1979297ec1cce80b7c9bd -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  1fc2daac07b5936f4dcba75143bc7d9af971caa1 \
  07d16a5f757377b816a1979297ec1cce80b7c9bd -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-08-27 replace-agent actor-scope follow-up synchronization

- Prior reviewed upstream: `1fc2daac07b5936f4dcba75143bc7d9af971caa1`.
- Freshly reviewed upstream: `6da12e0c98d9e2c4838896eac642c65179501f8e`.
- Prior fork `main` tip: `8ddf3a2c9d97bf1239d8a0ba80eb67318b74bc8c`.
- Upstream range: 2 commits including 1 first-parent merge, 2 files, 319
  insertions, and 12 deletions. It contains no dependency/lockfile, workflow,
  migration, generated-artifact, documentation, or configuration change.
- Main merge: `6a7b454598d3a34c9bf63557a845a8e766fa47f1`;
  its parents are the prior fork tip and freshly reviewed upstream. Final main
  behavior: `d0acb856f1ec0edae6cce29ca44178af14d94293`, which adds the fail-closed
  identity correction and its missing actor-scope regressions.
- Main transition: 2 files, 415 insertions, and 13 deletions from the prior fork
  tip. The focused actor-registry, replace-agent, and durable-memory matrix
  completed 37 tests with 0 failures. The expanded prompt/retry/MaxMode/context
  matrix completed 96 tests: 94 passed, 2 documented skips, and 0 failed; all
  three selected package typechecks passed.
- Active ownership remains FD=6 and FC=15; the new behavior is routed through
  FD-002 and FC-001, with no new or duplicate owner.

### Decision notes

- Adopted upstream's core rule that a session `replace-agent` base applies to
  main/peer, while subagents, system-spawned actors, and ephemeral helpers retain
  their own agent identity prompt.
- Rejected direct reuse of `ActorRegistry.servesCheckpoint` for identity
  replacement. That checkpoint-duty predicate intentionally fails open for an
  unregistered actor; an identity override must fail closed. Main is recognized
  explicitly, and a peer requires a registered non-system `mode: "peer"` row.
- Retained the fork contract that disabling checkpoint generation removes only
  checkpoint-specific clauses while durable project/global memory guidance
  remains available.
- Added coverage for main, registered subagent, registered peer,
  system-spawned peer, ephemeral request, unknown actor, and frozen custom
  system preservation.

### Capability inventory (1/1)

`AR-20260827-R2` is the audit range used by the result row:
`old_upstream=1fc2daac07b5936f4dcba75143bc7d9af971caa1`,
`new_upstream=6da12e0c98d9e2c4838896eac642c65179501f8e`,
`main_merge=6a7b454598d3a34c9bf63557a845a8e766fa47f1`, and
`main_behavior=d0acb856f1ec0edae6cce29ca44178af14d94293`.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Actor-scoped `replace-agent` base | `AR-20260827-R2` | `edf689e0`; `session/llm.ts` `buildSystemArray`; `replace-agent-subagent.test.ts` | FD-002 instruction identity and FC-001 actor registration | DC-CONTEXT-001 preflight, DC-ACTOR-001 frozen system, and DC-MODEL-001 retry reuse | complementary with unsafe predicate reuse | identity, actor scope, retry/frozen context, tests | shared main | Adapt: main or known non-system peer may inherit; subagent/system/ephemeral/unknown fail closed to own prompt | Focused matrix 37/0; expanded matrix 94 pass, 2 documented skips, 0 failures; three package typechecks; final compat propagation required |

Inventory count is 1 and result-row count is 1. The row records the audit
range, commit/path/symbol evidence, both branch counterparts, relationship,
drift, canonical owner, disposition, and status evidence; no incoming
capability remains unclassified.

### Changed-path calculation

The 252-path, 24,541-insertion, 10,196-deletion total compares the freshly
reviewed upstream tree with the frozen pre-documentation main behavior and
excludes all five shared/compat registry tracking paths:

```bash
git diff --shortstat \
  6da12e0c98d9e2c4838896eac642c65179501f8e \
  d0acb856f1ec0edae6cce29ca44178af14d94293 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  6da12e0c98d9e2c4838896eac642c65179501f8e \
  d0acb856f1ec0edae6cce29ca44178af14d94293 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```
