# Shared Fork Registry History

This is the append-only audit ledger for upstream-to-`main` reviews. It lives on
`main` and `dev/compat` inherits it unchanged. New reviews add rows; they do not
rewrite the behavior references or decisions recorded by earlier rows.

Pure registry/history commits may be recorded separately for traceability, but
they are never used as an `upstream` or `main behavior` review basis.

## Audit ledger

| Date | Upstream | Main behavior | Active FD | Active FC | Changed-path total | Decision summary |
| --- | --- | --- | ---: | ---: | --- | --- |
| 2026-09-03 | `f82c177709019c759ce2bb06bd1b04cba488811e` | `96d00e06ad1640a80f70c9eda1ed10e62ed5ab79` | 6 | 16 | 284 paths; 28,467 insertions; 10,209 deletions | Correction: restored upstream's fire-and-forget `prompt_async` queue contract after `1cfe7efc` incorrectly extended synchronous busy admission to that producer route; removed 409 from every published projection, bound the regression to the server's actual `AppRuntime`, and removed unrelated TUI recovery hardening. |
| 2026-09-02 | `3282b34c46281dc8cd0610433d676a5ec93baa6e` | `7bfe6ac48e0db40b2b0b42c00b05a35032fcc113` | 6 | 16 | 280 paths; 25,704 insertions; 10,208 deletions | Classified all four incoming capabilities: adopted stable live-registry default-model fallback and Workspace-before-Spec Compose Next, then adapted the snapshot-bound `voice_input` protocol with FC-016 Prompt-owner, stop/drain, and grapheme-boundary hardening while retaining the schema/unnamed-call interoperability fix. |
| 2026-09-01 | `d17e176ba179ea2568cdf5020bb65011aaf86493` | `4866d01f754429e3782f60983311c24468a9949a` | 6 | 15 | 92 paths; 10,085 insertions; 1,664 deletions | Ledger consistency correction for the already-recorded detailed review: adopted action-oriented tool guidance and retained the fork's stronger tri-state Codex-mode resolver, complete identity precedence, independent MCP-search opt-in, and transport separation. This row advances no behavior. |
| 2026-09-01 | `2ce93f4188275aff0dc0353d36ec5f7538bcb32b` | `c63ae51911f8455fd1cc8defcc4a0a2e827889e2` | 6 | 15 | 273 paths; 25,268 insertions; 10,065 deletions | Classified the single incoming OAuth-branding capability and adopted MiMoCode callback-page and dynamic-registration identity literals exactly; FC-004 remains the only clean carrier overlap, with URL validation, pending imports, request isolation, bounded diagnostics, and redaction unchanged. |
| 2026-08-23 | `c23eeaed1983197f1c45ac3ec14c6b99784b7d27` | `7c52b1412e9e39685b6975bdc4a4847fe2352647` | 6 | 13 | 211 paths; 19,057 insertions; 8,460 deletions | Retained the six shared rejection contracts and thirteen non-duplicating shared capability/process owners; adopted upstream custom-exec wrapper normalization while keeping the nested-authority and raw-size boundaries; restored the shared WebFetch target-classification baseline and scoped FC-010 to redirect permission/resource bounds; removed bounded upstream-format and loop-form drift. |
| 2026-08-23 | `c23eeaed1983197f1c45ac3ec14c6b99784b7d27` | `d1e3ddc3298a2b4504651d0fcaf7e8aa24affa39` | 6 | 13 | 211 paths; 19,073 insertions; 8,461 deletions | Correction: narrowed custom-exec leading-angle normalization to malformed variable-declaration assignments, preserving valid TypeScript const assertions and generic arrows while retaining the wrapper, raw-size, nested-authority, and timeout boundaries. |
| 2026-08-23 | `c23eeaed1983197f1c45ac3ec14c6b99784b7d27` | `edc2d123cbebfadc8fb7a8a18c4974def0fc2be5` | 6 | 13 | 211 paths; 19,096 insertions; 8,469 deletions | Correction: use actual async-body TypeScript diagnostics for leading-angle repair; preserve already-valid const assertions and generic arrows, including default generics, and repair only an invalid source when removing the angle yields zero diagnostics. |
| 2026-08-24 | `c23eeaed1983197f1c45ac3ec14c6b99784b7d27` | `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8` | 6 | 13 | 213 paths; 19,110 insertions; 8,473 deletions | Correction: upstream still blocks only textual `fe80:` link-local addresses; fork main now blocks the complete numeric and DNS-resolved IPv6 `fe80::/10` range through FC-010 without adding a duplicate owner. |
| 2026-08-25 | `5e32992a97ed7f8d2d00e4c312133716292dab9e` | `1cfe7efc8f13da6157f30324c4eeac0111e99115` | 6 | 13 | 234 paths; 22,785 insertions; 8,955 deletions | Adopted upstream recovery, turn-context, replayable nested-exec, bundled-skill, Desktop notification-card, and auto-worktree changes; hardened main run admission/cancellation, recovery mutation, nested-exec terminal settlement, TUI rendering, and GitLab workflow context without weakening the six FD or thirteen FC contracts. |
| 2026-08-25 | `fa6fdf176cef7f82659705b555333d6302725748` | `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` | 6 | 13 | 240 paths; 23,405 insertions; 9,188 deletions | Adopted fixed instance cwd with an inert SDK-compatibility event schema, centralized retry configuration/classification/request/live-step/status coordination, bounded MaxMode retry, and typed busy admission; corrected four retry boundary/configuration seams and published main-only recovery/resume while retaining all six FD and thirteen FC contracts. |
| 2026-08-27 | `1fc2daac07b5936f4dcba75143bc7d9af971caa1` | `07d16a5f757377b816a1979297ec1cce80b7c9bd` | 6 | 15 | 251 paths; 24,431 insertions; 10,181 deletions | Classified 12 incoming capabilities; adopted reliable localized titles, relative paths, versioned skill snapshots, checkpoint fork default, actor isolation, and compaction controls; adapted model identity, stable memory paths, retry publication, and reserve-safe compaction while retaining all six FD contracts and adding FC-015 as the sole compaction-boundary owner. |
| 2026-08-27 | `6da12e0c98d9e2c4838896eac642c65179501f8e` | `d0acb856f1ec0edae6cce29ca44178af14d94293` | 6 | 15 | 252 paths; 24,541 insertions; 10,196 deletions | Adopted actor-scoped `replace-agent` for main/peer, but separated identity replacement from checkpoint's unknown-actor fail-open: only main and positively registered non-system peers inherit the session base; subagent, system, ephemeral, and unknown actors retain their own prompt. |
| 2026-08-28 | `35bb2636a99b457940f1c12f2c8f5ec554369c57` | `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57` | 6 | 15 | 256 paths; 24,605 insertions; 10,234 deletions | Classified all three incoming capabilities: removed the unimplemented actor spawn/run resume argument while preserving lifecycle and frozen-context failure boundaries; adapted PPTX sourcing to actual tool/WebFetch behavior; isolated the auto-overflow fixture while retaining its reserve-safe 25K sentinel. |
| 2026-09-08 | `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85` (unchanged; POLICY-01 selected source below) | `aa2dbe494fb5903f918d8d7cd8b6d04404acb031` | 6 | 16 | Incremental from accepted main: 47 paths; 2,715 insertions; 517 deletions | N=1 POLICY-01: adopt full authorized nested Actor/question/plan composition with canonical control identity, complete native-schema freezing, generation-owned admission cleanup, real interactive routing and atomic plan-to-build transition. Local validation only; publication and compat gates remain pending. |
| 2026-09-08 | `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85` (unchanged; POLICY-04 selected source below) | `22c5a51099f460cb9b58c064c57c8632e2cd70be` | 6 | 16 | Incremental runtime/tests/plan from accepted main: 18 paths; 1,589 insertions; 143 deletions | N=1 POLICY-04: move the authorized skill catalog to the frozen system tail, persist catalog version and originating turn, migrate legacy pairs only at a later direct input, and preserve loaded bodies plus native tool snapshots. Local validation only; publication and compat gates remain pending. |
| 2026-09-08 | `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85` (unchanged) | `d9ed4dc480ddbe319d79e6ca655facc552e2cd35` | 6 | 16 | Incremental runtime/tests/plan from accepted main: 20 paths; 1,631 insertions; 157 deletions | POLICY-04 CI follow-up: update two prior prefix-layout/turn-revision assertions and route persistent-Actor fixture responses to the delegated user request, preserving concurrent parent notifications. Product implementation unchanged; current-head review/CI must be repeated. |

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

## 2026-08-28 actor follow-up, PPTX sourcing, and overflow-fixture synchronization

- Prior reviewed upstream: `6da12e0c98d9e2c4838896eac642c65179501f8e`.
- Freshly reviewed upstream: `35bb2636a99b457940f1c12f2c8f5ec554369c57`.
- Prior fork `main` tip: `45554bedf7fb7d041d16bbd6b8362ed2f54c56b7`.
- Upstream range: 3 commits, 8 paths, 259 insertions, and 98 deletions.
  It contains no workflow, dependency/lockfile, migration, SDK/OpenAPI input,
  package-version, or generated-artifact change.
- Main merge: `a2ecc8a4323ceed2f1b68d59355fd8b189df257c`;
  its parents are the prior fork tip and freshly reviewed upstream. Final main
  behavior: `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`.
- Main transition: 9 paths, 284 insertions, and 97 deletions from the prior fork
  tip. The final affected matrix completed 252 passing tests with zero failures;
  package typecheck passed, targeted lint completed with zero errors, diff
  whitespace checks passed, and `bun.lock` remained unchanged. SDK regeneration
  was not applicable because neither source schema nor generated input changed.
- Active ownership remains FD=6 and FC=15. All 6 active FD and 15 active FC
  records were reviewed; no owner was retired or added.

### Decision notes

- Adopted upstream's removal of the unimplemented actor `spawn`/`run`
  `actor_id` argument and preserved strict rejection through shell recovery and
  JSON schemas. Existing actors receive follow-up through `send` only while
  reusable; completed ephemeral full-context actors still fail closed once
  their frozen context has been released.
- Adapted the bundled PPTX image-sourcing guidance to runtime facts. WebFetch
  may return an image attachment but does not persist a local path for
  `python-pptx`; image generation is conditional on a currently listed tool;
  local downloads create parent directories, fail on HTTP errors, and remain
  time-bounded; shape and text remain a valid fallback.
- Adopted an explicit empty proactive-checkpoint ladder in the overflow fixture
  so its writer assertion measures auto-overflow alone. Retained 25K usage and
  the reserve-safe `min(ratio boundary, reserve boundary)` explanation because
  19.9K < 25K < 36K detects a regression to upstream's flat 90% formula; the
  proposed 50K fixture would not.

### Capability inventory (3/3)

`AR-20260828` is the audit range used by every result row:
`old_upstream=6da12e0c98d9e2c4838896eac642c65179501f8e`,
`new_upstream=35bb2636a99b457940f1c12f2c8f5ec554369c57`,
`main_merge=a2ecc8a4323ceed2f1b68d59355fd8b189df257c`, and
`main_behavior=64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`.
`MAIN-VERIFIED` means the row's affected tests are included in the final matrix
and the typecheck, lint, whitespace, and lockfile gates above passed.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Actor follow-up contract | `AR-20260828` | `5d1fc2a0`; `tool/actor.ts` schemas, recovery and shell mapping; actor prompt/help and tests | FD-009 frozen admission; FC-001 lifecycle; FC-011 guidance | DC-ACTOR-001 full-context overlay and DC-CONTEXT-001 bounded state | conflicting and complementary | schema, lifecycle wording, recovery, tests | shared main | Adapt: remove fake spawn/run resume, retain strict rejection, persistent wake, caller resolution, and ephemeral frozen-context failure | Actor/inbox/checkpoint matrix; `MAIN-VERIFIED` |
| 2 | PPTX image sourcing | `AR-20260828` | `da93ed21`; bundled `pptx-official/SKILL.md`; shipped-content regression | FC-011 factual bundled guidance; FC-010 distinguishes WebFetch from Bash download policy | Inherited unchanged; no compat-only owner | content extension with factual conflicts | model-visible content, tool availability, download failure semantics | shared main | Adapt to actual WebFetch attachments and conditional image generation; add fail-closed local download and shape/text fallback | Skill/WebFetch matrix; `MAIN-VERIFIED` |
| 3 | Auto-overflow fixture isolation | `AR-20260828` | `35bb2636`; `auto-overflow-writer-first.test.ts` thresholds, usage, and boundary comments | FC-002 writer semantics and FC-015 reserve-safe trigger | DC-CONTEXT-001 and DC-ACTOR-001 deterministic full-context fixture | conflicting | test contract and trigger explanation | shared main | Adopt empty checkpoint ladder; retain 25K reserve-boundary sentinel and composed `min()` formula | Overflow/actor matrix; `MAIN-VERIFIED` |

Inventory count is 3 and result-row count is 3. Every row records the audit
range, commit/path/symbol evidence, both branch counterparts, relationship,
drift, canonical owner, disposition, and status evidence; no incoming
capability remains unclassified.

### Changed-path calculation

The 256-path, 24,605-insertion, 10,234-deletion total compares the freshly
reviewed upstream tree with the frozen pre-documentation main behavior and
excludes all five shared/compat registry tracking paths:

```bash
git diff --shortstat \
  35bb2636a99b457940f1c12f2c8f5ec554369c57 \
  64b4bdda6829ca697cecf4cf79eeec6a35ec2e57 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  35bb2636a99b457940f1c12f2c8f5ec554369c57 \
  64b4bdda6829ca697cecf4cf79eeec6a35ec2e57 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-09-01 prefix snapshots, compaction projection, recovery, and CI synchronization

- Prior reviewed upstream:
  `35bb2636a99b457940f1c12f2c8f5ec554369c57`.
- Freshly reviewed upstream:
  `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`.
- Prior fork `main` tip:
  `cce5b8383ce812d608254dc4deecf672e2795773`.
- Main behavior merge:
  `e7f40fb3a5a81f5a9efd36aa494caac3849d7896`, whose parents are the prior
  fork tip and freshly reviewed upstream.
- Final main behavior:
  `2b4c6569ac308fa6a6662c2c044059893748e0ad`. After the first exact-SHA
  workflow correctly failed closed, it replaced a pipe under `pipefail` in
  zero-case allowlist discovery with an explicit array scan. The test inputs,
  hash buckets, and report expectations are unchanged.
- The upstream range contains 21 commits, including 16 non-merge commits and
  13 first-parent commits, across 68 paths with 6,296 insertions and 1,019
  deletions. It changes no tracked lockfile or package manifest.
- The main transition contains 65 paths with 6,609 insertions and 500
  deletions. All 6 active FD and 15 active FC records were reviewed; no owner
  was added, retired, or transferred.

### Decision notes

- Adopted local MCP stdio-exit diagnostics, ask-timeout isolation,
  default-off Auto-Worktree notices, same-session subagent grant inheritance,
  checkpoint tail digests, explicit errored-turn recovery, opt-in loop-streak
  cropping, prediction context, persistent request-prefix snapshots, Bun path
  pinning, compaction projection, frozen-prefix summary requests, and Node
  build version injection.
- Adapted request-prefix persistence to the complete resolved model identity,
  frozen schema-only tool order, loaded MCP membership, and live-executor
  rebinding. Missing frozen tools and newly live tools both fail closed.
- Kept instruction files enabled by default while independently gating the
  dynamic environment block. The explicit disable flag suppresses both model
  content and the `InstructionsLoaded` event.
- Rejected upstream's system-tail skill-catalog placement, compaction tool
  execution, and implicit LLM-server listener advertisement. Versioned,
  permission-filtered user-part catalog snapshots, `toolChoice: "none"`, and
  FD-004's explicit-listener boundary remain authoritative.
- Adapted projection tail budgeting to
  `min(40K, usable - frozen system/tools/summary/manifest)`, preserving the
  reserve-safe FC-015 boundary and the 25K regression sentinel.
- Replaced positional CI sharding with stable path-hash shards, kept TSX and
  runtime-worktree coverage, isolated the real stdio observer process, and
  added strict XML/count/file-completeness verification. The verifier accepts
  only fresh, parseable, non-empty reports whose top-level suites exactly
  match the shard's expected runnable files; known missing-file, truncated,
  zero-execution, zero-suite, and error-mismatch reports are rejected.

### Capability inventory (18/18)

`AR-20260901` is the audit range used by every result row:
`old_upstream=35bb2636a99b457940f1c12f2c8f5ec554369c57`,
`new_upstream=2c5cd4972c3f3cb8947a5117c7910d485e6f6179`, and
`main_merge=e7f40fb3a5a81f5a9efd36aa494caac3849d7896`,
`main_behavior=2b4c6569ac308fa6a6662c2c044059893748e0ad`.

`MAIN-VERIFIED` means the final four shards executed 5,517 tests with 41
skipped/todo and zero failures, and the OpenCode/SDK typechecks, root lint,
migration checks, two-pass SDK generation, build-node/build smoke tests, and
focused matrices passed. Compatibility counterpart text names the overlay
contract that must survive normal `main` to `dev/compat` propagation; it
does not claim a compat SHA.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Local MCP startup-exit diagnostics | `AR-20260901` | `50c7c368`; `mcp/stdio-transport.ts` `ObservingStdioTransport`, `exitSnapshot`, `stderrSnapshot`; `mcp/index.ts` `connectLocal` | FC-004 MCP configuration and connection lifecycle | DC-NET-002 continues to own only remote RFC1918 MCP reachability | complementary | runtime, failure contract, logging, process lifecycle, tests | shared main | Adopt and adapt: use the public child-process API, retain `childProcessEnv`, bound the stderr tail to 4 KiB, redact log/status details, and distinguish natural exit from host shutdown | Dedicated `stdio-exit-observe.test.ts` process and `mcp/lifecycle.test.ts`; `MAIN-VERIFIED` |
| 2 | Ask-timeout test-environment isolation | `AR-20260901` | `50c7c368`; per-test environment acquire/release in `permission/skip-all-timeout.test.ts` | FC-008 bounded CI isolation and the existing skip-all forced-ask timeout contract | Inherits shared test policy; no compatibility-only owner | complementary | tests, environment isolation, CI ordering | shared main | Adopt: remove module-level environment leakage without changing runtime permission semantics | `skip-all-timeout` and MCP sampling shard regressions; `MAIN-VERIFIED` |
| 3 | Post-mutation Auto-Worktree notice and default-off toggle | `AR-20260901` | `f02ee661`, `75190e25`; `auto-worktree-hint.ts` `walkGitLayout`, `sessionMutatedMainWorktrees`, `buildAutoWorktreeNotice`; `Config.Info.auto_worktree`; `auto_worktree_hint_sent` migration | FC-007 fixed cwd, protected roots, and path boundaries | Inherits shared behavior; DC-PLATFORM-001 platform fallbacks remain independent | conflicting and complementary | runtime, config, migration, tool detection, SDK, docs, tests | shared main | Adopt and adapt: inject only after a successful write or Git mutation, only for a primary root session, and only once per session; omitted/false configuration emits no notice and true explicitly enables it | Auto-worktree config/notice/bash-write/scan matrices and SDK generation; `MAIN-VERIFIED` |
| 4 | Same-session subagent permission inheritance | `AR-20260901` | `35065860`; `agent/config.ts` `decideAskRouting`; `prompt.ts` session ID propagation; ask-routing and inheritance tests | FC-001 actor generation/lifecycle and FD-009 fail-closed admission | DC-ACTOR-001 full-context actor overlay | complementary | permission, actor identity, lifecycle, tests | shared main | Adopt and adapt: only `mode=subagent` may fall back to the current `sessionID`; peers cannot self-inherit, and explicit deny, non-interactive, and skip-all boundaries remain intact | `ask-routing.test.ts` and `permission/inherit.test.ts`; `MAIN-VERIFIED` |
| 5 | Stable test sharding and MCP process isolation | `AR-20260901` | `35065860`; `.github/workflows/test.yml` path-hash sharding, TS/TSX discovery, dedicated stdio job, and `verify-junit.py` | FC-008 bounded workflow cleanup and targeted isolation | Workflow continues to cover `main`, `dev`, and `dev/compat` | conflicting | workflow, discovery, isolation, JUnit contract | shared main | Adapt: reject position-based sharding and whole-file runtime exclusion; retain TSX and runtime-worktree discovery, assign files by stable path hash, isolate the stdio test polluted by `mock.module`, and fail closed on malformed, incomplete, or zero-execution JUnit | Four shards with 5,517 executed, 41 skipped/todo, and zero failures, plus the dedicated JUnit job; `MAIN-VERIFIED` |
| 6 | Checkpoint rebuild-tail activity digest | `AR-20260901` | `d2386a22`; `tail-digest.ts` `renderTailDigest`, `collapseCheckpointTail`; `CheckpointPart.digestUpTo`; checkpoint rendering | FC-002 canonical checkpoint writer and FC-015 context boundary | DC-CONTEXT-001 preflight and DC-ACTOR-001 frozen actor context | complementary | runtime, persisted schema, model projection, SDK, tests | shared main | Adopt and adapt: retain physical history, collapse the summarized assistant tail only in the model request, persist `digestUpTo` only when activity was emitted, and leave legacy boundaries unchanged | Rebuild-tail-digest, checkpoint-render, and prune matrices plus SDK generation; `MAIN-VERIFIED` |
| 7 | Errored-assistant recovery candidates | `AR-20260901` | `d1a50729`; `processor.ts` error-completion policy; `prompt.ts` `recoveryCandidates`, `sweepOrphanAssistants` | FC-001 recovery and admission lifecycle | DC-ACTOR-001 and DC-CONTEXT-001 retain actor/context boundaries | partial duplicate with lifecycle conflict | recovery, lifecycle, TUI pending state, tests | shared main | Adopt and adapt: keep errored assistants recoverable during background sweeps; when a new user explicitly abandons the old turn in an idle session, immediately complete that orphan so subsequent messages do not remain permanently QUEUED | Errored-candidate and immediate-sweep regressions; `MAIN-VERIFIED` |
| 8 | Opt-in loop-streak request recovery | `AR-20260901` | `9d096aaa`; `prompt/loop-streak.ts` `streakKey`, `detectStreak`, `cropMessagesForStreak`, `applyPersistedCrops`; `experimental.loop_streak_recovery` | FC-009 synthetic provenance and FC-015 bounded context | DC-CONTEXT-001 request preflight and DC-ACTOR-001 actor context | complementary | behavior, config, persisted metadata, cache, tests, docs | shared main | Adopt and adapt: default off; crop whole assistant messages only in the request layer, retain DB history, create no new user, persist the span as an ignored synthetic part on the existing parent user, reapply it on later requests, and retain the text-loop fallback | `loop-streak.test.ts` and prompt request-boundary integration; `MAIN-VERIFIED` |
| 9 | Instruction-file injection decoupled from the dynamic environment | `AR-20260901` | `03fcb66a`; `Flag.MIMOCODE_DISABLE_INSTRUCTIONS`; `prompt.ts` `instruction.system`, `InstructionsLoaded` | FD-002 reported instructions must reach the model and FD-005 resolved identity | DC-MODEL-001 MaxMode, DC-CONTEXT-001, and DC-ACTOR-001 | conflicting and complementary | model-visible content, environment flags, event contract, frozen prefix, tests | shared main | Adopt and adapt: inject instructions by default through normal, MaxMode, and capture paths; keep the runtime environment controlled by the dynamic flag; when disabled, suppress both instruction content and the `InstructionsLoaded` event | Normal, disabled, and MaxMode instruction regressions; `MAIN-VERIFIED` |
| 10 | Prediction-context extraction | `AR-20260901` | `03fcb66a`; exported `predictContext`; prediction-side `stripMedia` | FC-009 synthetic-message provenance and FC-011 fork-facing prompt behavior | DC-CONTEXT-001 keeps side-channel input bounded | complementary | prediction context, provenance, media handling, tests | shared main | Adopt: use only the three most recent real user queries and the last assistant, exclude synthetic catalog/skill bodies, and keep the prediction call outside the session trajectory | `prompt.test.ts` `predictContext` matrix; `MAIN-VERIFIED` |
| 11 | Skill-catalog model placement and version semantics | `AR-20260901` | `8b9b5fec`; upstream moves the catalog to the system tail; main `prompt.ts` `insertReminders`, `canonicalSkillCatalog`, `skillCatalogSnapshotVersion` | FC-005 permission-consistent versioned catalog and FD-009 frozen capture | DC-CONTEXT-001 accounts for retained snapshots | conflicting | model-visible placement, persistence, cache, permissions, tests | shared main | Reject upstream placement: retain hash-versioned, permission-filtered, complete user-part snapshots; append a new snapshot when the catalog changes without rewriting history or freezing the old catalog indefinitely | Multi-turn skill-command, permission, and checkpoint regressions; `MAIN-VERIFIED` |
| 12 | Persistent session-prefix snapshot | `AR-20260901` | `4bd85803`; `prefix-snapshot.ts` `profileKey`, `pin`, `rotate`, `advance`, `toolsHash`, `snapshotTools`, `restoreTools`; prefix/tool/loaded-MCP migrations | FD-002, FD-005, FD-006, FD-009, FC-005, and FC-015 | DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 | conflicting and complementary | runtime, cache prefix, schema, migrations, tool membership, capture, tests | shared main | Adopt and adapt: key profiles by model, agent, harness, system, and permission; freeze the system, schema-only tools, and loaded MCP membership; rotate explicitly when tools change; checkpoint capture reads frozen membership before a live rotation | Prefix-snapshot, frozen MCP capture, and migration matrices; `MAIN-VERIFIED` |
| 13 | Build-time Bun path pinning | `AR-20260901` | `0abee120`; `script/build.ts` package Bun-version guard and `process.execPath install`; `local-install.sh` | FC-012 fork publication and FC-014 Cloud Agent environment | Inherits shared build contract | complementary | build, runtime selection, installer | shared main | Adopt: prevent an ancestor `node_modules/.bin/bun` from hijacking the build and install build dependencies through the already-validated Bun executable | Build smoke and root lockfile/lint gates; `MAIN-VERIFIED` |
| 14 | Compaction summary plus compression-time tail projection | `AR-20260901` | `f551822a`; `buildFileManifest`, `buildTail`, `shrinkLargeToolResults`, `buildSummaryMessage`, `projectionTailBudget`; `CompactionPart.projection` | FC-002 checkpoint semantics and FC-015 reserve-safe compaction | DC-CONTEXT-001 effective-window preflight and DC-ACTOR-001 static-prefix overflow | conflicting and complementary | runtime, context budget, schema, generated SDK/OpenAPI, config, tests | shared main | Adopt and adapt: retain the summary, file manifest, and complete API rounds; cap the tail at `min(40K, usable-fixed)` under the fork effective-window/reserve contract; preserve the 25K reserve sentinel and regenerate SDK/OpenAPI from source | Compaction-projection, rebuild-boundary, auto-overflow, and two-pass generation checks; `MAIN-VERIFIED` |
| 15 | Compaction reuses the frozen system/tools prefix | `AR-20260901` | `893d7e83`; `compaction.ts` `SessionPrefixSnapshot.get`; frozen `system`, restored tools, and `activeTools`; prompt-effect frozen-prefix test | FD-002, FD-005, FD-006, and FC-015 | DC-MODEL-001 and DC-CONTEXT-001 retain the same frozen/effective context | complementary | cache prefix, system identity, tool schema, migrations, tests | shared main | Adopt and adapt: continue the parent turn's frozen system and exact tool-schema bytes for the summary request rather than rebuilding the current registry prefix; a legacy missing snapshot warns and follows the compatibility fallback | Exact-wire frozen system/tools regression; `MAIN-VERIFIED` |
| 16 | Compaction tool-use policy | `AR-20260901` | `6080a114`; upstream `toolChoice: "auto"`; main `compaction.ts` `toolChoice: "none"`; `processor.ts` summary tool-call guard | FD-006 tool authority and FC-015 compaction boundary | Inherits shared policy; no compatibility-only owner | conflicting | runtime, tool contract, cache prefix, tests | shared main | Reject tool execution: retain frozen tools and `activeTools` to preserve the schema prefix and cache, but send `toolChoice=none`; restored schema-only tools have no execute closure and the summary processor also rejects tool calls | Prompt-effect regression asserts both exact frozen-tool equality and `tool_choice=none`; `MAIN-VERIFIED` |
| 17 | Implicit LLM-server listener advertisement | `AR-20260901` | `ceaf172b`; upstream `Server.listen` advertisement and base-URL publication surfaces | FD-004 ordinary instances expose no implicit OpenAI-compatible listener | Compatibility inherits FD-004; no separate override | conflicting | network, listener lifecycle, security, API contract | shared main | Reject: do not restore the removed llm-server capability; ordinary serve/TUI instances publish no implicit `/v1` listener address, while explicit user-authentication metadata remains unaffected | LLM-server residual audit and FD-004/API/build matrix; `MAIN-VERIFIED` |
| 18 | MiMoCode version injected into the Node target | `AR-20260901` | `8a2626cf`; `script/build-node.ts` defines `MIMOCODE_VERSION: Script.version` | FC-012 fork build/publication and FC-014 environment | Inherits the shared build-node surface | complementary | build-node, compile-time define, runtime version | shared main | Adopt: make Node and Bun builds consume the same source-derived MiMoCode version without introducing a manually maintained version value | Build-node typecheck/smoke and build smoke; `MAIN-VERIFIED` |

Inventory count is 18 and result-row count is 18. Every incoming substantive
capability records the audit range, commit/path/symbol evidence, both branch
counterparts, relationship, drift, canonical owner, disposition, and status
evidence; no incoming capability remains unclassified.

### Validation evidence

- The final four hash shards produced strict JUnit evidence for 5,517 executed
  tests, 41 skipped/todo tests, and zero failures. Their expected top-level
  suite counts were 138, 133, 112, and 106. The isolated stdio observer process
  passed 6 tests and the same verifier contract. After the CI-only discovery
  correction, Bash 3.2 re-executed the exact allowlist scan and revalidated all
  four saved fresh reports against the unchanged current file buckets.
- Focused MCP, permission, Auto-Worktree, checkpoint/digest, recovery,
  loop/prefix, skills, compaction, overflow, and request-layer matrices passed.
  Known-good reports were accepted; missing-file, truncated-XML,
  zero-execution, zero-suite, and error-count mismatch reports were rejected.
- `packages/opencode` and `packages/sdk/js` typechecks passed. Migration
  verification reported the schema up to date. Root lint completed with zero
  errors and 4,269 repository-wide warnings.
- JavaScript SDK generation completed twice with identical output. The
  build-node command and the single-platform build/smoke command both passed
  with source-derived local version metadata. `bun ci` completed from the
  frozen lockfile and no tracked lockfile or package manifest changed.

### Changed-path calculation

The 273-path, 25,268-insertion, 10,065-deletion total compares the freshly
reviewed upstream tree with the frozen pre-documentation main behavior and
excludes all five shared/compat registry tracking paths:

```bash
git diff --shortstat \
  2c5cd4972c3f3cb8947a5117c7910d485e6f6179 \
  2b4c6569ac308fa6a6662c2c044059893748e0ad -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  2c5cd4972c3f3cb8947a5117c7910d485e6f6179 \
  2b4c6569ac308fa6a6662c2c044059893748e0ad -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-09-01 OAuth branding synchronization

- Prior reviewed upstream:
  `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`.
- Freshly reviewed upstream:
  `2ce93f4188275aff0dc0353d36ec5f7538bcb32b`.
- Prior fork `main` tip:
  `ed33097a961c9d915b00b2bbb2ebaf23e7ad2288`.
- Main behavior merge:
  `c63ae51911f8455fd1cc8defcc4a0a2e827889e2`, whose parents are the prior
  fork tip and freshly reviewed upstream.
- The incoming range contains 2 commits, including 1 first-parent merge and
  1 substantive non-merge commit, across 3 production paths with 8 insertions
  and 8 deletions. It changes no test, fixture, dependency manifest, lockfile,
  migration, workflow, generated SDK/OpenAPI surface, or SDK/OpenAPI input.
- All 6 active FD and 15 active FC records were reviewed. No owner was added,
  retired, or transferred.

### Decision notes

- Adopted MiMoCode branding in the MCP OAuth success/error pages, MCP dynamic
  client-registration name and URI, and Codex browser OAuth success/error pages.
- FC-004 is the only clean carrier overlap because `mcp/index.ts` constructs
  the provider and callback. Its URL validation, Claude-import pending state,
  request/frozen-fork isolation, bounded stdio diagnostics, and secret redaction
  remain unchanged.
- Retained the unrelated Codex protocol literals such as `originator=opencode`
  and the OpenCode-compatible user agent; they are outside the incoming commit
  and are not presentation branding.
- Existing stored MCP OAuth client registrations are reused by the runtime, so
  the new dynamic-registration metadata applies when a client is newly
  registered or re-registered; this review does not claim an immediate update
  to every existing authorization-server consent record.

### Capability inventory (1/1)

`AR-20260901-OAUTH` is the audit range used by the result row:
`old_upstream=2c5cd4972c3f3cb8947a5117c7910d485e6f6179`,
`new_upstream=2ce93f4188275aff0dc0353d36ec5f7538bcb32b`,
`main_merge=c63ae51911f8455fd1cc8defcc4a0a2e827889e2`, and
`main_behavior=c63ae51911f8455fd1cc8defcc4a0a2e827889e2`.

`MAIN-VERIFIED` means the exact eight new literals and zero superseded literals
were asserted, the MCP metadata and success callback were exercised through the
runtime, 59 focused OAuth/MCP/Codex tests passed, OpenCode typecheck passed, and
root lint completed with zero errors. Compatibility counterpart text identifies
the overlay review required during propagation; it does not claim a compat SHA.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | OAuth-facing MiMoCode branding consistency | `AR-20260901-OAUTH` | `b2007fe8`; `mcp/oauth-callback.ts` `HTML_SUCCESS`/`HTML_ERROR`; `mcp/oauth-provider.ts` `McpOAuthProvider.clientMetadata`; `plugin/codex.ts` `HTML_SUCCESS`/`HTML_ERROR` | FC-004 carries MCP OAuth connection lifecycle; the prior fork tree retained the upstream OpenCode literals without a fork-specific override | The three paths had no prior compat delta; DC-NET-002 is adjacent to remote MCP creation but owns no OAuth interoperability or branding override | complementary | behavior, contract, naming-style | shared main | Adopt upstream exactly; preserve OAuth state, callback, token, registration-reuse, and unrelated Codex protocol fields | Exact 8-new/0-old source gate, runtime metadata/callback assertion, focused tests, typecheck, lint, and diff checks; `MAIN-VERIFIED` |

Inventory count is 1 and result-row count is 1. The row records the audit
range, both branch counterparts, relationship, drift, canonical owner,
disposition, and status evidence; no incoming capability remains unclassified.

### Validation evidence

- The exact source gate was RED before merge (`0` new and `8` superseded
  literals) and GREEN afterward (`8` new and `0` superseded literals).
  A runtime assertion verified `client_name="MiMoCode"`,
  `client_uri="https://mimo.xiaomi.com/mimocode"`, and the successful MCP
  callback response and returned authorization code.
- Focused default-path runs passed 4 MCP callback, 4 MCP auto-connect, 3 MCP
  browser, 33 MCP lifecycle, and 15 Codex plugin tests: 59 passed and 0 failed.
- `packages/opencode` typecheck passed. Root lint completed with 0 errors and
  4,271 pre-existing repository-wide warnings.
- `bun ci` used the frozen lockfile. `bun.lock` and the checked dependency
  manifests remained unchanged. No SDK generation was required because no
  SDK/OpenAPI input or generated surface changed.
- The actual merge tree equals the pre-merge `merge-tree` prediction
  `d6953991f08ca27ec91c12a07b6558e2295abc6a`; both merge parents and the
  intended range pass `git diff --check`.

### Changed-path calculation

The 273-path, 25,268-insertion, 10,065-deletion total compares the freshly
reviewed upstream tree with the pre-documentation main behavior and excludes
all five shared/compat registry tracking paths:

```bash
git diff --shortstat \
  2ce93f4188275aff0dc0353d36ec5f7538bcb32b \
  c63ae51911f8455fd1cc8defcc4a0a2e827889e2 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  2ce93f4188275aff0dc0353d36ec5f7538bcb32b \
  c63ae51911f8455fd1cc8defcc4a0a2e827889e2 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-09-01 Codex-mode specified-change follow-up

- This is a named specified-change propagation, not a full upstream sync. The
  registry-wide review record remains anchored at upstream `2ce93f4188275aff0dc0353d36ec5f7538bcb32b`.
- Selected upstream behavior: `cce933568906ae670decf9a081618ebf25aa8afe`,
  contained in upstream tip `d17e176ba179ea2568cdf5020bb65011aaf86493`;
  the fork adapts only its tri-state intent rather than mechanically copying it.
- Fork behavior: `0899a4802dd65c1ca98e68722a7ee0c017e5cb7c`.
- The unrelated incoming prompt-guidance commit `eb6766d5` and its merge
  `dcb15e2f` were not selected or adapted by this specified change.

### Capability inventory (2/2)

`AR-20260901-CODEX-MODE` records the focused decision below. `MAIN-VERIFIED`
means 214 default-path tests passed with zero failures and one pre-existing
remote-instruction TODO across flag, resolver, system, instruction/event parity,
actor scope, prefix, registry/agent, actual request wire, MaxMode, retry,
snapshot, and nested dispatch surfaces; OpenCode and JavaScript SDK typechecks
passed; and generated description drift was limited to the three OpenAPI and
three SDK occurrences owned by the two source schema descriptions.

### Validation evidence

The test matrix ran at exact behavior commit
`0899a4802dd65c1ca98e68722a7ee0c017e5cb7c`, with all three ambient selectors
removed from every default-path process. To reproduce, check out that commit and
run this single block from the repository root; the first two commands fail
closed if either prerequisite is wrong:

```bash
test "$(git rev-parse HEAD)" = \
  0899a4802dd65c1ca98e68722a7ee0c017e5cb7c
cd packages/opencode

env -u MIMOCODE_EXPERIMENTAL \
  -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
  -u MIMOCODE_CODEX_MODE \
  bun test \
  test/flag/codex-mode-flag.test.ts \
  test/tool/gpt.test.ts \
  test/session/system.test.ts \
  test/session/llm-request-prefix.test.ts \
  test/agent/agent.test.ts \
  --timeout 120000
# expected: 92 pass, 0 fail

env -u MIMOCODE_EXPERIMENTAL \
  -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
  -u MIMOCODE_CODEX_MODE \
  bun test test/session/prompt-effect.test.ts \
  -t 'native tool schema|instruction files' \
  --timeout 120000
# expected: 6 pass, 0 fail

env -u MIMOCODE_EXPERIMENTAL \
  -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
  -u MIMOCODE_CODEX_MODE \
  bun test \
  test/session/max-mode.test.ts \
  test/session/llm-retry.test.ts \
  test/session/prefix-snapshot.test.ts \
  test/tool/tool-script.test.ts \
  --timeout 120000
# expected: 97 pass, 0 fail

env -u MIMOCODE_EXPERIMENTAL \
  -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
  -u MIMOCODE_CODEX_MODE \
  bun test \
  test/session/instruction.test.ts \
  test/session/llm-system-prompt.test.ts \
  test/session/replace-agent-subagent.test.ts \
  --timeout 120000
# expected: 19 pass, 1 pre-existing TODO, 0 fail
```

From the repository root, typechecks ran independently from their package
directories:

```bash
(cd packages/opencode && bun typecheck)
(cd packages/sdk/js && bun typecheck)
# expected: both exit 0
```

From the repository root, the two source descriptions project to exactly two
source, three OpenAPI, and three JavaScript SDK occurrences; the selected range
is whitespace-clean:

```bash
test "$(rg -F -c 'Explicit codex or default is authoritative.' \
  packages/opencode/src/session/prompt.ts)" -eq 2
test "$(rg -F -c 'Explicit codex or default is authoritative.' \
  packages/sdk/openapi.json)" -eq 3
test "$(rg -F -c 'Explicit codex or default is authoritative.' \
  packages/sdk/js/src/v2/gen/types.gen.ts)" -eq 3
git diff --check c3fd051a27585a3e2a04124e00ce0439b27130e6 \
  0899a4802dd65c1ca98e68722a7ee0c017e5cb7c
# expected: all exit 0
```

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | FD-002 registry narrowing after default-on instruction alignment | `AR-20260901-CODEX-MODE` | `03fcb66a`, `6a2cb49c`; `Flag.MIMOCODE_DISABLE_INSTRUCTIONS`; `prompt.ts` `currentAdditions`, `InstructionsLoaded`; `llm.ts` `buildSystemArray` | FD-002 residual parity, immutable retry set, and known-actor replacement | DC-MODEL-001 retry reuse; DC-CONTEXT-001 and DC-ACTOR-001 preserve frozen/actor boundaries | partial duplicate with residual conflict | event, request payload, retry, actor identity, tests | shared main | Narrow: upstream now supplies default-on instruction delivery; retain only disable event/payload parity, retry-immutable resolved sets, and unknown-identity fail-closed replacement | Existing normal/disabled/MaxMode/retry/actor-scope matrix remains authoritative; `MAIN-VERIFIED` |
| 2 | Tri-state Codex-mode resolution | `AR-20260901-CODEX-MODE` | `cce93356`; `flag.ts` `MIMOCODE_CODEX_MODE`; `tool/gpt.ts` `resolveHarnessMode`; `session/system.ts` `provider`; behavior `0899a480` | FD-005 one resolved identity/harness decision | DC-MODEL-001 retry reuse; compat preserves its system/prompt overlays | complementary with fork classification precedence | flag semantics, prompt, toolset, aliases, retry, generated schema | shared main | Adapt: session explicit wins; under auto, true forces Codex, false selects the native non-Codex harness even for GPT, and unset model-infers; transport stays separate while the dedicated MCP-search selector remains an independent opt-in | 214 focused tests, one pre-existing TODO, two typechecks, six generated-description assertions, and `git diff --check`; `MAIN-VERIFIED` |

Inventory count is 2 and result-row count is 2. The selected tri-state behavior
was adapted through the fork resolver rather than copied wholesale; no active
FD was retired, added, renumbered, or transferred.

## 2026-09-01 live tool-guidance and Codex-mode convergence synchronization

- Prior reviewed upstream:
  `2ce93f4188275aff0dc0353d36ec5f7538bcb32b`.
- Freshly reviewed upstream:
  `d17e176ba179ea2568cdf5020bb65011aaf86493`.
- Prior fork `main` tip:
  `c6a2f5f3c8cd0851b36049da5176e2ee7fb81d05`.
- Main behavior merge:
  `4866d01f754429e3782f60983311c24468a9949a`, whose parents are the prior
  fork tip and freshly reviewed upstream.
- The incoming range contains 4 commits, including 2 first-parent merges and
  2 substantive commits, across 8 paths with 63 insertions and 28 deletions.
  It changes no dependency manifest, lockfile, migration, workflow, version,
  or final generated SDK/OpenAPI surface.
- All 6 active FD and 15 active FC records were reviewed. No owner was added,
  retired, or transferred.

### Decision notes

- Adopted the action-oriented default native tool guidance from `eb6766d5`,
  removed its trailing whitespace, and bound the `task`, `actor`, and
  independent-call claims to the shipped runtime with a focused system-prompt
  regression. This model-visible content does not widen tool authority.
- Classified `cce93356` as a partial duplicate with a conflicting precedence
  contract. The fork already implements its tri-state intent through
  `resolveHarnessMode`, but additionally preserves explicit session precedence,
  complete identity resolution, MiMo precedence, native prompt-family
  selection, independent MCP-search opt-in, and transport separation.
- Resolved all four production conflicts per those invariants. Two opposite
  assertions that would otherwise have merged cleanly were rejected; the final
  Codex-mode production, schema-description, and generated trees remain
  unchanged from the prior fork behavior.

### Capability inventory (2/2)

`AR-20260901-D17` is the audit range used by every result row:
`old_upstream=2ce93f4188275aff0dc0353d36ec5f7538bcb32b`,
`new_upstream=d17e176ba179ea2568cdf5020bb65011aaf86493`,
`main_merge=4866d01f754429e3782f60983311c24468a9949a`, and
`main_behavior=4866d01f754429e3782f60983311c24468a9949a`.

`MAIN-VERIFIED` means 217 default-path tests passed with zero failures and one
pre-existing remote-instruction TODO; both package typechecks, root lint with
zero errors, frozen-lockfile installation, source facts, and diff checks passed.
Compatibility counterpart text names the overlay review required during
propagation; it does not claim a compat SHA.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Action-oriented default tool guidance | `AR-20260901-D17` | `eb6766d5`; `session/prompt/default.txt` `# Using your tools`; `system.test.ts` guidance regression | FC-011 factual prompt guidance; FD-006 remains the authority boundary; FC-001 owns actor lifecycle | The prior compat blob was identical; DC-CONTEXT-001 accounts for the prompt and DC-ACTOR-001 freezes it without owning the text | complementary | model-visible content, docs, naming-style, tests | shared main | Adopt with incoming whitespace removed: prefer listed tools, track multi-step work with `task`, use background `actor spawn` by default and blocking `run` exceptionally, and parallelize only independent calls | Runtime source facts, direct prompt assertions, request/prefix matrices, and `MAIN-VERIFIED` |
| 2 | Tri-state Codex-mode upstream convergence | `AR-20260901-D17` | `cce93356`; `flag.ts` `MIMOCODE_CODEX_MODE`; `tool/gpt.ts` `resolveHarnessMode`; `system.ts` `provider`; prompt schema descriptions and focused tests | FD-005 resolved identity/harness decision; FD-006 and FC-005 are downstream tool/discovery boundaries | DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 overlap prompt/system paths but define no alternate harness precedence | partial duplicate and conflicting | behavior, contract, schema-config, tests, docs, generated artifacts | shared main | Preserve/adapt: explicit session mode wins, then explicit process true/false, then complete-identity model inference with MiMo precedence; retain native prompt families, independent MCP-search opt-in, and transport separation | Positive/negative resolver, system, request, MaxMode, retry, prefix, and nested-dispatch matrices; no final SDK/OpenAPI input drift; `MAIN-VERIFIED` |

Inventory count is 2 and result-row count is 2. Every incoming substantive
capability records both branch counterparts, relationship, drift, canonical
owner, disposition, and status evidence; no incoming capability remains
unclassified.

### Validation evidence

- The stable behavior commit passed 93 flag/resolver/system/prefix/agent tests,
  8 request-construction tests, 97 MaxMode/retry/prefix/nested-exec tests, and
  19 instruction/system/actor-scope tests, with one pre-existing TODO and zero
  failures.
- `packages/opencode` and `packages/sdk/js` typechecks passed. Root lint
  completed with 4,274 warnings and zero errors.
- `bun ci` installed from the frozen lockfile. `bun.lock` and tracked package
  manifests remained unchanged.
- SDK generation was not required: conflict resolution retained the prior
  source schema descriptions, and the final SDK/OpenAPI input and generated
  trees have no behavior delta.
- The upstream range's sole `git diff --check` failure was removed from the
  adopted prompt content; the final merge range is whitespace-clean.

### Reproduction

Run from a clean checkout of the behavior commit. The package preload then
adds only its owned test baseline; the command removes every ambient selector
that could change the default path.

```bash
(
  set -e
  set -o pipefail
  test "$(git rev-parse HEAD)" = \
    4866d01f754429e3782f60983311c24468a9949a

  bun ci
  git diff --exit-code -- bun.lock ':(glob)**/package.json'

  run_default() {
    env -u MIMOCODE_EXPERIMENTAL \
      -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
      -u MIMOCODE_CODEX_MODE \
      -u MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL \
      -u MIMOCODE_COMPACTION_MAX_CONTEXT \
      -u MIMOCODE_COMPACTION_TRIGGER_RATIO \
      -u MIMOCODE_DISABLE_CHECKPOINT "$@"
  }
  selectors="$(run_default env | LC_ALL=C sort | \
    rg '^MIMOCODE_(EXPERIMENTAL|EXPERIMENTAL_MCP_TOOL_SEARCH|CODEX_MODE|EXPERIMENTAL_WORKFLOW_TOOL|COMPACTION_MAX_CONTEXT|COMPACTION_TRIGGER_RATIO|DISABLE_CHECKPOINT)=' || true)"
  test -z "$selectors"

  reports_dir="$(mktemp -d)"
  trap 'rm -rf "$reports_dir"' EXIT
  report_index=0
  run_counted() {
    expected_pass="$1"
    expected_todo="$2"
    shift 2
    report_index=$((report_index + 1))
    report="$reports_dir/$report_index.log"
    run_default bun test "$@" 2>&1 | tee "$report"
    test "$(awk '$2 == "pass" { value = $1 } END { print value + 0 }' "$report")" \
      -eq "$expected_pass"
    test "$(awk '$2 == "todo" { value = $1 } END { print value + 0 }' "$report")" \
      -eq "$expected_todo"
    test "$(awk '$2 == "fail" { value = $1 } END { print value + 0 }' "$report")" \
      -eq 0
  }

  cd packages/opencode
  run_counted 93 0 \
    test/flag/codex-mode-flag.test.ts \
    test/tool/gpt.test.ts \
    test/session/system.test.ts \
    test/session/llm-request-prefix.test.ts \
    test/agent/agent.test.ts --timeout 120000
  run_counted 8 0 test/session/prompt-effect.test.ts \
    -t 'native tool schema|process-disabled auto GPT requests|locks system and harness|persists auto|instruction files' \
    --timeout 120000
  run_counted 97 0 \
    test/session/max-mode.test.ts \
    test/session/llm-retry.test.ts \
    test/session/prefix-snapshot.test.ts \
    test/tool/tool-script.test.ts --timeout 120000
  run_counted 19 1 \
    test/session/instruction.test.ts \
    test/session/llm-system-prompt.test.ts \
    test/session/replace-agent-subagent.test.ts --timeout 120000
  bun typecheck
  cd ../sdk/js
  bun typecheck
  cd ../../..

  bun lint
  git diff --exit-code -- .
  git diff --exit-code \
    c6a2f5f3c8cd0851b36049da5176e2ee7fb81d05 \
    4866d01f754429e3782f60983311c24468a9949a -- \
    packages/opencode/src/flag/flag.ts \
    packages/opencode/src/session/prompt.ts \
    packages/opencode/src/session/system.ts \
    packages/opencode/src/tool/gpt.ts \
    packages/sdk/openapi.json \
    packages/sdk/js/src/v2/gen
  git diff --check \
    c6a2f5f3c8cd0851b36049da5176e2ee7fb81d05 \
    4866d01f754429e3782f60983311c24468a9949a
)
```

Expected result: the four test groups report `93/0`, `8/0`, `97/0`, and
`19/1` pass/todo with zero failures; both typechecks exit zero; lint reports
4,274 warnings and zero errors; frozen dependency files, the retained
Codex-mode/schema/SDK surfaces, the tracked worktree, and whitespace checks are
clean.

## 2026-09-02 default-model, Compose Next, and voice-control synchronization

- Prior reviewed upstream:
  `d17e176ba179ea2568cdf5020bb65011aaf86493`.
- Freshly reviewed upstream:
  `3282b34c46281dc8cd0610433d676a5ec93baa6e`.
- Prior fork `main` tip:
  `c9bdea878aa289f427c4bfbe798411d4907df600`.
- Main behavior merge:
  `39ced157d4d907255475624d806693aa989b8736`, whose parents are the prior
  fork tip and freshly reviewed upstream.
- The incoming range contains 4 commits, all first-parent commits, across 24
  paths with 1,618 insertions and 458 deletions. It changes no dependency
  manifest, lockfile, migration, workflow, version, SDK/OpenAPI producer, or
  generated SDK/OpenAPI surface.
- All 6 active FD and the prior 15 active FC records were reviewed. FC-016 was
  added for the durable voice Prompt-owner, stop/drain, and grapheme-boundary
  adaptation; no owner was retired, renumbered, or transferred.

### Decision notes

- Adopted `4f723f99`'s stable default-model chain. A configured default is now
  accepted only when it exists in the live registry; a valid recent model wins
  next; the last resort walks allowed providers and selects the first ID-sorted
  model that supports text, tool calls, and a non-zero context. The retired
  `mimo-auto` special case and menu-priority substring sort no longer select an
  unusable model, and a stale configured model logs only once. FD-005 remains
  authoritative for the later resolved-identity, harness, prompt, discovery,
  toolset, retry, and transport decisions.
- Adopted `6972b329`'s Workspace-before-Spec Compose Next contract. The active
  workspace is selected before a durable feature document is written there;
  no-spec review and missing-document finalize paths remain conditional. This
  updates FC-011's bundled guidance without widening file or worktree authority.
- Adopted `0bf62bf4`'s forced `voice_input` protocol. Control edits apply to a
  frozen before/selection/after snapshot through insert, set, or
  `set_with_cursor`; stale mutations are dropped, ASR inserts without sending,
  send remains control-only, and surgical unchanged-buffer inserts preserve
  paste/file extmarks. Agent switching was removed from the voice protocol.
- Adopted `3282b34c`'s interoperability correction: the nested operation schema
  emits `type: object`, a single otherwise-valid tool call may omit its function
  name, and protocol diagnostics retain call-name/content evidence. The two
  voice commits are one delivered protocol plus a separately auditable schema
  hardening capability.
- Adapted the incoming voice editor at `7bfe6ac4`: async control and ASR results
  are bound to the live Prompt/session owner rather than text equality, stopped
  recordings remain `finishing` until recorder drain and pending completion,
  stale stop continuations cannot overwrite a replacement recording, and
  display-width conversion walks complete grapheme clusters. FC-016 owns this
  hardening.

### Capability inventory (4/4)

`AR-20260902-3282` is the audit range used by every result row:
`old_upstream=d17e176ba179ea2568cdf5020bb65011aaf86493`,
`new_upstream=3282b34c46281dc8cd0610433d676a5ec93baa6e`,
`main_merge=39ced157d4d907255475624d806693aa989b8736`, and
`main_behavior=7bfe6ac48e0db40b2b0b42c00b05a35032fcc113`.

`MAIN-VERIFIED` means the 149-test provider/voice/offset default-path matrix passed
with zero failures; package-local opencode and JavaScript SDK typechecks, the
12-task pre-push typecheck, frozen installation, root lint with zero errors,
dependency/generated-surface checks, and `git diff --check` passed. The package
preload retained its owned `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`; every
ambient user selector was removed before the default-path tests.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Stable live-registry default-model fallback | `AR-20260902-3282` | `4f723f99`; `provider.ts` `defaultModel`, `warnedStaleDefaultModels`; six new fallback regressions | FD-005 watches provider identity but owns harness classification after model selection; existing recent/config chain was a weaker partial implementation | DC-MODEL-001 uses inherited lite/default resolution for hidden title calls; DC-TUI-001 records the server-default variant display limit but defines no alternate fallback | partial duplicate and complementary | behavior, config, logging, tests, docs | shared main | Adopt the upstream live-registry validation, recent-first ordering, usable-chat filter, stable ID order, and one-time warning; retain FD-005's complete-identity and harness precedence | Six new defaultModel regressions plus the complete provider file matrix; `MAIN-VERIFIED` |
| 2 | Workspace-owned Compose Next specification | `AR-20260902-3282` | `6972b329`; bundled `compose-next/SKILL.md` Workspace/Spec order; README/spec/mimocode guide | FC-011 owns factual bundled workflow guidance; FC-005 discovery is adjacent but unchanged | No DC owner or path overlap | conflicting prior ordering, then equivalent adoption | workflow contract, docs, naming-style | shared main | Adopt Workspace-before-Spec, workspace-root feature paths, no-spec acceptance criteria, and conditional finalize semantics | Shipped bundle/source excerpts, changed-path review, and `MAIN-VERIFIED` |
| 3 | Snapshot-bound `voice_input` caret/selection control | `AR-20260902-3282` | `0bf62bf4`; `7bfe6ac4`; `voice-edit.ts`; `offset.ts`; `voice.ts` `processVoiceControl`; Prompt owner/stop lifecycle; voice/offset/i18n/spec tests | FC-016 owns Prompt/session binding, drain-before-idle, and grapheme-safe coordinates; FC-011 owns only the changed mimocode-facing command text | DC-TUI-001 changes the same Prompt path through `ModelMetadata`, `currentModelMetadata`, provider/model/variant layout, and `titleLocale`; DC-CONTEXT-001 is request-context adjacent but has no alternate voice protocol | adapted upstream behavior plus complementary same-path compat overlay | behavior, protocol, owner lifecycle, editor coordinates, tests, docs, i18n | shared main | Adopt the protocol; harden same-text remount/session ownership, replacement/stop races, and combining/ZWJ offsets; preserve DC-TUI-001 metadata/title layout during propagation | Snapshot/extmark/VAD/ASR/send plus real-OpenTUI grapheme and owner-state regressions; `MAIN-VERIFIED` |
| 4 | Voice tool schema and unnamed-call interoperability | `AR-20260902-3282` | `3282b34c`; `VoiceInputOperation.meta({ type: "object" })`; `parseVoiceControlResponse`; nested-schema and unnamed-call tests | Complements capability 3 and is consumed under FC-016 without changing its schema semantics | Inherited by compat; DC-TUI-001 has no direct `voice.ts` or voice-test delta | complementary | schema contract, gateway compatibility, diagnostics, tests | shared main | Adopt the Zod-owned object shape, single unnamed-call tolerance, and diagnostic evidence without accepting multiple or wrong-name calls | Positive schema/unnamed-call and negative wrong-name/multiple-call regressions; `MAIN-VERIFIED` |

Inventory count is 4 and result-row count is 4. Every substantive incoming
capability records both branch counterparts, relationship, drift, canonical
owner, disposition, and status evidence; no incoming capability remains
unclassified.

### Validation evidence

- Before the merge, the provider/voice baseline passed 123 tests with zero
  failures. The direct upstream merge passed 134 provider/voice tests. At the
  stable hardened behavior, provider plus voice/offset passed 149 tests with
  zero failures and 414 assertions (`92/0` plus `57/0`). One resource-contended
  parallel run timed out the first provider test at five seconds; the complete
  provider file then passed serially, with that test completing in 1.12 seconds.
- `packages/opencode` and `packages/sdk/js` package-local typechecks passed. The
  pre-push Turbo typecheck reported 12 successful tasks out of 12.
- Root lint completed with 4,285 warnings and zero errors. The warnings are the
  repository baseline class; no lint error was introduced.
- `bun ci` installed from the frozen lockfile. `bun.lock` and tracked package
  manifests remained unchanged.
- SDK generation was not required because no SDK/OpenAPI producer or generated
  surface changed. The selected range and final merge are whitespace-clean.

### Reproduction

Run from a clean checkout of the behavior commit:

```bash
(
  set -e
  test "$(git rev-parse HEAD)" = \
    7bfe6ac48e0db40b2b0b42c00b05a35032fcc113

  bun ci
  git diff --exit-code -- bun.lock ':(glob)**/package.json'

  cd packages/opencode
  env -u MIMOCODE_EXPERIMENTAL \
    -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
    -u MIMOCODE_CODEX_MODE \
    -u MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL \
    -u MIMOCODE_COMPACTION_MAX_CONTEXT \
    -u MIMOCODE_COMPACTION_TRIGGER_RATIO \
    -u MIMOCODE_DISABLE_CHECKPOINT \
    bun test test/provider/provider.test.ts
    bun test test/cli/tui/voice.test.ts test/cli/cmd/tui/offset.test.ts
  bun typecheck
  cd ../sdk/js
  bun typecheck
  cd ../../..

  ./.husky/pre-push
  bun lint
  git diff --check c9bdea878aa289f427c4bfbe798411d4907df600 \
    7bfe6ac48e0db40b2b0b42c00b05a35032fcc113
)
```

Expected result: 149 tests and 414 assertions pass with zero failures; both
package typechecks and all 12 pre-push tasks succeed; lint reports 4,285
warnings and zero errors; frozen dependency, generated-surface, and whitespace
checks remain clean.

## 2026-09-02 OpenAPI projection contract and 0.1.14 release synchronization

- Prior reviewed upstream:
  `3282b34c46281dc8cd0610433d676a5ec93baa6e`.
- Freshly reviewed upstream:
  `2a0eb706e95a77cba34a319e9f11f33f26d4450c`.
- Prior fork `main` tip:
  `28c1f36c8a3bc85bda7e3691960e7d0b531b8636`.
- Main merge:
  `a11d64c8a10032f824966ad39e5d73195e3f8642`, whose parents are the prior
  fork tip and freshly reviewed upstream.
- Stable main behavior:
  `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- The incoming range contains two first-parent commits / PRs (#2310 and #2311)
  across 19 paths with 88 insertions and 39 deletions. It changes no runtime
  source, migration, workflow, or test source.
- Merge conflicts were limited to `packages/sdk/openapi.json` and
  `packages/sdk/js/src/v2/gen/types.gen.ts`. Both were regenerated from fork
  source; neither upstream generated file was accepted as an authority.
- Relative to prior `main`, all sixteen package manifests and `bun.lock` adopt
  `0.1.14`. Published OpenAPI adds `CompactionPart.projection` and updates the
  deprecated compaction-field descriptions. JavaScript SDK types remain
  byte-identical to prior `main`; an OpenAPI contract regression binds the
  runtime and published projection schemas.

### Decision notes

- Adopted upstream's missing published `CompactionPart.projection` carrier for
  the already-shipped runtime projection. The regression failed on the prior
  fork artifact and passed after regeneration.
- Rejected upstream's generated harness wording because it omits FD-005's
  explicit-session precedence. Fork-source regeneration keeps the stronger
  session, process tri-state, and model-inference order in both artifacts.
- Adopted the deprecated `tail_turns` description and adapted
  `preserve_recent_tokens`: 40K is an upper bound, additionally capped by the
  reserve-safe usable window after frozen-prefix and projection overhead.
- Adopted the synchronized `0.1.14` release metadata without changing fork
  publication routing or dependency selections.

### Capability inventory (4/4)

`AR-20260902-2A0` is the audit range used by every result row:
`old_upstream=3282b34c46281dc8cd0610433d676a5ec93baa6e`,
`new_upstream=2a0eb706e95a77cba34a319e9f11f33f26d4450c`,
`prior_main=28c1f36c8a3bc85bda7e3691960e7d0b531b8636`,
`main_merge=a11d64c8a10032f824966ad39e5d73195e3f8642`, and
`main_behavior=dad492e0af72d22d3ec796f6814eda7e52ed51a8`.

`MAIN-VERIFIED` means 197 default-path tests passed, two pre-existing
  cancellation tests were skipped, and zero tests failed; both package
  typechecks, root lint with zero errors, frozen installation, independent
  published-OpenAPI and JavaScript-SDK generation checks, release/surface
  assertions, and diff checks passed. Compatibility counterparts below are
  propagation audit targets and claim no compat result.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Published compaction projection schema | `AR-20260902-2A0` | `159d8479`; `packages/sdk/openapi.json`; `CompactionPart.projection`; OpenAPI contract regression | FC-015 projection and reserve-safe context boundary; FD-004 guards the published API | DC-CONTEXT-001 publishes checkpoint coverage beside the inherited projection; DC-ACTOR-001 is semantically adjacent but owns no alternate schema | generated representation gap for existing behavior | schema, generated artifact, API contract, tests | shared main | Adopt through fork-source regeneration while retaining every fork-only schema | Runtime/published literal projection comparison, generator idempotence, and `MAIN-VERIFIED` |
| 2 | Harness API-description precedence | `AR-20260902-2A0` | `159d8479`; prompt, async-prompt, and command `harness` descriptions in OpenAPI and JS types | FD-005 resolved identity and session/process harness precedence | DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 are request-path neighbors but define no alternate harness priority | partial duplicate with conflicting description | config contract, docs, generated artifact | shared main | Retain fork wording: explicit session mode wins; process true/false applies only under `auto`, then model inference | Fork-source regeneration; JS types byte-identical to prior main; Codex/system/request regressions in `MAIN-VERIFIED` |
| 3 | Deprecated compaction-config descriptions | `AR-20260902-2A0` | `159d8479`; OpenAPI `tail_turns` and `preserve_recent_tokens` descriptions | FC-015 projection tail and usable-window/reserve boundary | DC-CONTEXT-001 preserves effective-window preflight and published checkpoint contracts; no alternate compatibility setting | partial duplicate with one conflicting bound | config docs, schema, generated artifact | shared main | Adopt the projected-tail deprecation and preserve the stronger at-most-40K plus reserve-safe effective-window bound | Overflow and compaction-projection matrices plus generated-source review in `MAIN-VERIFIED` |
| 4 | 0.1.14 workspace release metadata | `AR-20260902-2A0` | `2a0eb706`; sixteen package manifests and `bun.lock` | FC-012 fork publication routing; FD-004 watches SDK publication | No compat-only dependency or version owner; every changed file must be inherited byte-for-byte | no overlap | release metadata, lockfile | shared main | Adopt the complete synchronized version set without changing dependencies or publication destinations | `bun ci` made no changes; changed manifests and lockfile equal upstream; `MAIN-VERIFIED` |

Inventory count is 4 and result-row count is 4. Every incoming capability has
a main and compatibility counterpart, relationship, drift, canonical owner,
disposition, and status evidence; no incoming capability remains unclassified.

### Validation evidence

- Before resolution, the new projection regression passed for runtime OpenAPI
  but failed for the published artifact. After regeneration, all three OpenAPI
  contract tests passed.
- The final default-path matrix ran eight files: 197 passed, two skipped, and
  zero failed. The skips are existing cancellation cases, not this sync's
  generated or release surfaces.
- `packages/opencode` and `packages/sdk/js` typechecks passed. Root lint
  completed with 4,285 warnings and zero errors.
- `bun ci` completed without changing the frozen lockfile or manifests. A fresh
  runtime OpenAPI document was byte-identical to the published artifact, and the
  JavaScript SDK generator was idempotent after resolution.
- All changed manifests and `bun.lock` equal upstream; JavaScript SDK types
  equal prior `main`; no runtime, migration, or workflow path changed. The
  stable behavior range and current documentation edits pass `git diff --check`.

### Reproduction

Run from a clean checkout of the stable behavior commit:

```bash
(
  set -e
  test "$(git rev-parse HEAD)" = \
    dad492e0af72d22d3ec796f6814eda7e52ed51a8

  bun ci
  openapi_probe="$(mktemp)"
  trap 'rm -f "$openapi_probe"' EXIT
  bun run --cwd packages/opencode dev generate > "$openapi_probe"
  cmp "$openapi_probe" packages/sdk/openapi.json
  ./packages/sdk/js/script/build.ts
  git diff --exit-code -- packages/sdk/js/src/v2/gen
  git diff --exit-code \
    2a0eb706e95a77cba34a319e9f11f33f26d4450c..HEAD -- \
    bun.lock ':(glob)**/package.json'

  cd packages/opencode
  env -u MIMOCODE_EXPERIMENTAL \
    -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
    -u MIMOCODE_CODEX_MODE \
    -u MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL \
    -u MIMOCODE_COMPACTION_MAX_CONTEXT \
    -u MIMOCODE_COMPACTION_TRIGGER_RATIO \
    -u MIMOCODE_DISABLE_CHECKPOINT \
    bun test \
      test/server/openapi-refs.test.ts \
      test/session/compaction-projection.test.ts \
      test/session/overflow.test.ts \
      test/flag/codex-mode-flag.test.ts \
      test/tool/gpt.test.ts \
      test/session/system.test.ts \
      test/session/prompt-effect.test.ts \
      test/session/llm-request-prefix.test.ts --timeout 120000
  bun typecheck
  cd ../sdk/js
  bun typecheck
  cd ../../..

  bun lint
  git diff --check \
    28c1f36c8a3bc85bda7e3691960e7d0b531b8636 \
    dad492e0af72d22d3ec796f6814eda7e52ed51a8
)
```

Expected result: 197 tests pass, two existing cancellation tests skip, and no
test fails; both typechecks exit zero; lint reports 4,285 warnings and zero
errors; SDK generation, release metadata, and whitespace checks remain clean.

## 2026-09-02 WebSearch model identity and session-ID format synchronization

- Prior reviewed upstream:
  `2a0eb706e95a77cba34a319e9f11f33f26d4450c`.
- Freshly reviewed upstream:
  `f82c177709019c759ce2bb06bd1b04cba488811e`.
- Prior fork `main` tip:
  `3a2b6c88fd50d460199d8b5b2721413d164ecba9`.
- Main merge and stable main behavior:
  `f1e2ba0019ee6ac13c2608474ae9237865b742f2`, whose parents are the prior
  fork tip and freshly reviewed upstream.
- The incoming range contains two first-parent commits / PRs (#2312 and #2195)
  across four paths with 116 insertions and four deletions. It changes no
  migration, database schema, OpenAPI/SDK artifact, package metadata, lockfile,
  or workflow.

### Decision notes

- Adopted WebSearch's use of the resolved session model's `model.api.id` for
  Xiaomi sidecar requests. This removes a hard-coded MiMo model without
  changing FD-005's model-resolution, harness, prompt/tool, alias, retry, or
  transport authority.
- Adopted marker-free descending session IDs. New session payloads remain 26
  characters: 16 hexadecimal time/counter characters followed by ten base62
  characters. Message descending IDs retain their `-` marker, and legacy
  `ses_-...` identifiers remain accepted as opaque `SessionID` values, so no
  migration is required.

### Capability inventory (2/2)

`AR-20260902-F82` is the audit range used by every result row:
`old_upstream=2a0eb706e95a77cba34a319e9f11f33f26d4450c`,
`new_upstream=f82c177709019c759ce2bb06bd1b04cba488811e`,
`prior_main=3a2b6c88fd50d460199d8b5b2721413d164ecba9`, and
`main_merge=main_behavior=f1e2ba0019ee6ac13c2608474ae9237865b742f2`.

`MAIN-LOCAL-VERIFIED` means 158 targeted default-path tests passed with zero
failures, the ID compatibility probe passed, all four incoming paths equal
upstream byte-for-byte, the merge parents and exact four-path allowlist match,
and the behavior range passes `git diff --check`. Compatibility counterparts
below are propagation audit targets and do not claim a compat result.

| # | Capability | `audit_range` | Commit/path/symbol evidence | `main_counterpart` | `compat_counterpart` | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C05 | Session-model Xiaomi WebSearch sidecar | `AR-20260902-F82` | `24b6d018`; `websearch/index.ts` request model; new local-SSE `websearch.test.ts` | FD-005 resolved identity; FD-006 direct-tool authority; FC-010/FC-011/FC-015 are adjacent but define no alternate request model | DC-MODEL-001 must preserve selected-model flow; DC-ACTOR-001 inherits actor-selected identity; no direct compat path overlap | upstream convergence with existing identity authority | behavior, request payload, regression | shared main | Adopt `model.api.id`; preserve fork model resolution, harness/tool, transport, and authority boundaries | Local SSE regression plus FD-005 identity/harness matrix; `MAIN-LOCAL-VERIFIED` |
| C06 | Marker-free descending session IDs | `AR-20260902-F82` | `f82c1777`; `id.ts` session branch; `id.test.ts` session/message ordering regressions | FC-001 lifecycle and opaque session ownership; FD-009 recovery/resume uses opaque IDs | DC-CONTEXT-001 and DC-ACTOR-001 consume opaque session IDs; no compat owner defines an alternate ID format or ordering; no direct compat path overlap | compatible format change | identifier format, compatibility, tests | shared main | Adopt for newly generated sessions; retain legacy input acceptance and the message-ID chronology marker | ID regression plus generated/new-message/legacy-input probe; `MAIN-LOCAL-VERIFIED` |

Inventory count is 2 and result-row count is 2. Every incoming capability has
a main and compatibility counterpart, relationship, drift, canonical owner,
disposition, and status evidence; no incoming capability remains unclassified.

### Validation evidence

- The incoming ID and WebSearch suites passed 11 tests. Session lifecycle,
  inheritance, recovery, global listing, and actor-registry neighbors passed 41;
  session-list behavior passed five; the FD-005 flag/GPT/system/request-prefix/
  agent matrix passed 93; and focused prompt/harness cases passed eight. The
  total is 158 passes and zero failures with all seven ambient experimental,
  harness, workflow, compaction, and checkpoint selectors removed.
- A direct runtime probe generated a marker-free session ID, confirmed a new
  descending message ID still contains `-`, and parsed a legacy `ses_-...`
  value successfully.
- The merge is clean and has the exact expected parents. Its four incoming
  paths are byte-identical to upstream, and no unrelated path changed relative
  to the prior `main` tip.

### Reproduction

Run from a clean checkout of the stable behavior commit:

```bash
(
  set -e
  test "$(git rev-parse HEAD)" = \
    f1e2ba0019ee6ac13c2608474ae9237865b742f2

  test "$(git rev-parse HEAD^1)" = \
    3a2b6c88fd50d460199d8b5b2721413d164ecba9
  test "$(git rev-parse HEAD^2)" = \
    f82c177709019c759ce2bb06bd1b04cba488811e
  git diff --check HEAD^1 HEAD
  test "$(git diff --name-only HEAD^1 HEAD)" = "$(printf '%s\n' \
    packages/opencode/src/id/id.ts \
    packages/opencode/src/tool/websearch/index.ts \
    packages/opencode/test/id/id.test.ts \
    packages/opencode/test/tool/websearch.test.ts)"
  git diff --exit-code HEAD^2 HEAD -- \
    packages/opencode/src/id/id.ts \
    packages/opencode/src/tool/websearch/index.ts \
    packages/opencode/test/id/id.test.ts \
    packages/opencode/test/tool/websearch.test.ts

  bun -e '
    import { Identifier } from "./packages/opencode/src/id/id.ts"
    const session = Identifier.descending("session")
    const message = Identifier.descending("message")
    const legacy = "ses_-0000000000000000abcdefghi"
    if (!/^ses_[0-9a-f]{16}[0-9A-Za-z]{10}$/.test(session)) process.exit(1)
    if (!message.startsWith("msg_-")) process.exit(1)
    if (Identifier.descending("session", legacy) !== legacy) process.exit(1)
    if (Identifier.schema("session").parse(legacy) !== legacy) process.exit(1)
  '

  cd packages/opencode
  run_default() {
    env -u MIMOCODE_EXPERIMENTAL \
      -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
      -u MIMOCODE_CODEX_MODE \
      -u MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL \
      -u MIMOCODE_COMPACTION_MAX_CONTEXT \
      -u MIMOCODE_COMPACTION_TRIGGER_RATIO \
      -u MIMOCODE_DISABLE_CHECKPOINT "$@"
  }
  run_default bun test \
    test/id/id.test.ts \
    test/tool/websearch.test.ts --timeout 120000
  run_default bun test \
    test/session/session-create-registers-main.test.ts \
    test/session/context-inheritance.test.ts \
    test/session/main-lifecycle.test.ts \
    test/server/global-session-list.test.ts \
    test/server/session-recovery.test.ts \
    test/actor/registry.test.ts --timeout 120000
  run_default bun test test/server/session-list.test.ts --timeout 120000
  run_default bun test \
    test/flag/codex-mode-flag.test.ts \
    test/tool/gpt.test.ts \
    test/session/system.test.ts \
    test/session/llm-request-prefix.test.ts \
    test/agent/agent.test.ts --timeout 120000
  run_default bun test -t \
    'native tool schema|process-disabled auto GPT requests|locks system and harness|persists auto|instruction files' \
    --timeout 120000
)
```

Expected result: the behavior SHA and both merge parents match; the incoming
range is whitespace-clean; the exact four-path allowlist matches upstream
byte-for-byte; the new-session, descending-message, and legacy-session probe
passes; and the five groups pass 11, 41, 5, 93, and 8 tests, respectively, for
158 total passes and zero failures. Exact published-SHA CI remains required by
the synchronization completion gate.

## 2026-09-03 `prompt_async` queue contract correction

- Reviewed upstream:
  `f82c177709019c759ce2bb06bd1b04cba488811e`.
- Prior fork `main` tip:
  `3ec8a8534ad4481c73f1946c966daf3a846cc29f`.
- Stable main behavior:
  `96d00e06ad1640a80f70c9eda1ed10e62ed5ab79`.
- The correction range changes six paths. Relative to the reviewed upstream,
  the stable behavior contains 284 paths with 28,467 insertions and 10,209
  deletions.

### Decision notes

- `1cfe7efc8f13da6157f30324c4eeac0111e99115` correctly introduced atomic
  admission for synchronous session execution, but incorrectly generalized it
  to the asynchronous producer route. Applying `startPrompt` before
  `createUserMessage` made a busy session return 409 without recording the
  user's input.
- Restored upstream's `SessionPrompt.prompt` path for `prompt_async`; synchronous
  prompt, command, init, shell, summarize, and resume entry points retain their
  typed busy admission. The runtime route, published OpenAPI, and JavaScript SDK
  now agree that `prompt_async` has no 409 response.
- Removed the unrelated TUI `throwOnError` and editor-restoration changes. The
  correction owns queue persistence only; final-transition draining remains a
  separate run-loop invariant.

### Validation evidence

- The server regression occupies the main runner inside the same `AppRuntime`
  used by the HTTP route and requires exactly one persisted user message. A
  mutation back to `startPrompt` produced `{ status: 204, texts: [] }`; restoring
  `prompt` produced `{ status: 204, texts: ["queued while busy"] }`.
- The focused busy-route and OpenAPI matrix passed nine tests with zero
  failures. Both `packages/opencode` and `packages/sdk/js` typechecks exited
  zero, and the runtime and published `prompt_async` response projections both
  contain exactly `204`, `400`, and `404`.
- The two TUI files are byte-identical to prior fork `main`; this correction
  adds no client-side failure-recovery behavior and no run-loop break change.

## 2026-09-04 closing-run prompt handoff correction

- Base fork `main`: `65a31144e14849ee2432001bd62bc7902f2c6f29`.
- Stable behavior: `77c72b070e9da493b68e3a5ce60d642fb604acf7`.
- Scope: the final run-loop snapshot to Runner Idle transition and the task
  binding of the actor-scoped user actually selected by the successor.

### Decision

- A prompt still persists before joining an active run. When that shared result
  belongs to an older user row, `promptWork` reuses the existing `run` path to
  start or join the successor and stops once the returned assistant's parent
  covers the prompt in the same actor transcript.
- Assistant staleness, text-form tool retries, output-length continuation, and
  loop-streak guards use `parentID` rather than lexical ID order, because the
  public API accepts caller-supplied message IDs.
- A shared `MessageAbortedError` stops handoff. The correction adds no
  ticket/lane, database tail, timestamp movement, Runner state, cancellation
  generation, or detached fiber.
- Optional `task_id` is persisted on each user message. The first selected user
  binds `session.pre`; each iteration binds tools from its actual last user; and
  `session.post` reports the final selected user. Synthetic continuation,
  compaction, checkpoint/rebuild, and `plan_exit` users inherit that binding.
- This does not claim durable or exactly-once delivery across caller
  interruption, instance disposal, or compaction/checkpoint visibility changes.

### Validation

- `packages/opencode/test/session/prompt-effect.test.ts`: 88 passed, 2 skipped,
  0 failed, including closing-window, terminal-error, cancellation, and
  reverse-ID output-length regressions; the closing test proves the successor
  input contains both queued prompts and binds hooks/tools to the latest one.
- Classifier unit/integration tests: 43 passed, 0 failed.
- Busy-route regression: 5 passed, 0 failed; prompt metadata/plan tests passed
  28/28 and 4/4; compaction/rebuild tests passed 18/18.
- Root typecheck completed 12/12 tasks; lint completed with zero errors; the v2
  JavaScript SDK regenerated idempotently from the published OpenAPI document.

## 2026-09-05 Bash, subtask, title, and fixture synchronization

- Prior reviewed upstream: `f82c177709019c759ce2bb06bd1b04cba488811e`.
- Reviewed upstream: `ec3f989438d4b1f4e2b2c2044e1ecfc5327f45b7`.
- Prior fork main tip: `704e74184eaea02040497a3cc980aeeb99912e05`.
- Main merge and stable behavior: `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae`.
- Range: 10 commits, five first-parent commits, 16 incoming paths. No
  dependency, lockfile, migration, workflow, or generated SDK input changes.

### Capability inventory (7/7)

Every row uses audit range `AR-20260905-EC3` with the source and main behavior
SHAs above. Compat counterparts are the pre-merge audit of `8b3466b8`; their
final merge and validation belong to `dev-compat-registry-history.md`.

| ID | Capability / commit | Paths and symbols | main counterpart | compat counterpart | Relationship | Drift | canonical_owner | Disposition | Status evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C01 | Remove resetDatabase fixture / `af49d5da` | test/fixture/db.ts; SSE/project-init-git/share/workspace fixtures; prefix/subtask tests | FC-008 | FC-008; shared tests; compat no unique fixture owner | complementary | tests | shared main | adopt reset removal; retain active prefix/subtask assertions | Main affected matrix and typecheck; compat final evidence pending propagation |
| C02 | Keep terminal subtask tool state / `99e51b2d` | src/session/prompt.ts handleSubtask; prompt-effect late metadata regression | FD-002/009 FC-001/009 | FD-002/009 FC-001/009; DC-ACTOR/CONTEXT prompt carrier | complementary | behavior,tests | shared main | adopt terminal guard and state assignment; add late metadata regression | Main affected matrix and typecheck; compat final evidence pending propagation |
| C03 | Export LLMServerTokens through Node entry / `1d6a9fe2` | src/node.ts; absent src/llm-server/tokens.ts | FD-004 | FD-004; shared Node export | conflicting | API/build | shared main | omit dangling export under FD-004; no token implementation exists | Main affected matrix and typecheck; compat final evidence pending propagation |
| C04 | Unify Bash output on token budget / `c2cf9b8f` | src/tool/bash.ts and descriptions; bash.test.ts; DC-CONTEXT replay adapter | FD-001/006 FC-007 | FD-001/006 FC-007; shared Bash boundary | partial duplicate; conflicting compat replay | behavior,contract,tests,docs | shared main; replay adapter dev/compat-only | adopt token budget; preserve permission; reconcile compat head+tail within existing cap | Main affected matrix and typecheck; compat final evidence pending propagation |
| C05 | Quarantine timeout auth override test / `c56f26c9` | test/plugin/auth-override.test.ts prepareConfigDependencies | FC-008 | FC-008; shared test isolation | conflicting | tests | shared main | reject skip: fork fixed fixture and exact baseline CI passes | Main affected matrix and typecheck; compat final evidence pending propagation |
| C06 | Cover mixed CJK case-insensitive session search / `e3e9c1b4` | test/server/session-list.test.ts; Session.list SQL LIKE | FC-001 | FC-001; shared list contract | no overlap | tests | shared main | adopt SQL LIKE characterization | Main affected matrix and typecheck; compat final evidence pending propagation |
| C07 | Strip leading slash mentions from title context / `ec3f9894` | src/session/prompt.ts titleInputText/titleContext/stripLeadingSlashMentions; prompt.test.ts | FC-011 | FC-011; DC-TUI titleLocale and DC-ACTOR prompt carrier | complementary | behavior,tests | shared main | adopt leading mention cleanup; preserve locale/ephemeral/filter paths | Main affected matrix and typecheck; compat final evidence pending propagation |

Inventory and result counts are both seven. All six FD and all sixteen FC
entries remain required; no retirement condition is met by this range. The
Bash change is complementary to permission/cwd ownership and conflicts with
compat's head-only replay slice, so the latter requires a bounded adaptation.
No duplicate consolidation, compat promotion, or upstream publication occurs.

### Validation

- Ran package `bun typecheck`, repository lint (zero errors), `git diff --check`,
  and the stable affected session/Bash/exec/fixture matrix. Commands remove
  `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and
  `MIMOCODE_CODEX_MODE`; the package preload retains its
  `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` harness baseline.
- The late-metadata mutation check fails without the running guard and passes
  with it. The retained error-metadata subtask test also passes.
- `bun ci` preserves `bun.lock`; Node entry, auth-override and fork-prefix
  tests remain byte-identical to the prior main tip. No `resetDatabase`
  references or unresolved conflict markers remain.
- Exact published-SHA CI is a separate completion gate. Pre-sync test runs
  `33849354969` and `33851920767` contain existing timeouts; their outcomes
  are not proof for the new branch tips.

Stable main matrix: **383 pass, 2 existing skip, 0 fail** across 24 test files.

| Group | Files (under `packages/opencode`) | Pass / skip |
| --- | --- | --- |
| session | `test/session/prompt-effect.test.ts`, `test/session/prompt.test.ts`, `test/session/fork-prefix-invariant.test.ts`, `test/session/llm-request-prefix.test.ts`, `test/session/max-mode.test.ts`, `test/session/replace-agent-subagent.test.ts`, `test/session/checkpoint-fork-mode.test.ts`, `test/session/run-state-tuple-key.test.ts`, `test/session/run-state-dispose.test.ts` | 170 / 2 |
| bash | `test/tool/bash.test.ts`, `test/tool/auto-worktree-bash-write.test.ts`, `test/tool/bash-isolated-git-guard.test.ts`, `test/tool/bash-conflict-ownership.test.ts`, `test/permission/auto-approve-delete.test.ts`, `test/permission/skip-all.test.ts`, `test/cli/yolo.test.ts`, `test/cli/tui/permission-bash-delete.test.tsx` | 116 / 0 |
| exec | `test/tool/tool-script.test.ts` | 75 / 0 |
| fixture-1 | `test/control-plane/sse.test.ts` | 2 / 0 |
| fixture-2 | `test/server/project-init-git.test.ts` | 2 / 0 |
| fixture-3 | `test/share/share-next.test.ts` | 8 / 0 |
| fixture-4 | `test/workspace/workspace-restore.test.ts` | 2 / 0 |
| fixture-5 | `test/server/session-list.test.ts` | 6 / 0 |
| fixture-6 | `test/plugin/auth-override.test.ts` | 2 / 0 |

Run each row from `packages/opencode` with the three ambient selectors
removed, using `bun test <row files> --timeout 120000`. Fixture rows run in
separate processes so their existing database close/reset behavior is isolated.

## 2026-09-07 recovery timing and isolated fixture synchronization

- Prior reviewed upstream: `ec3f989438d4b1f4e2b2c2044e1ecfc5327f45b7`.
- Reviewed upstream: `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`.
- Prior fork main tip: `95b592e08b4471c1018757d01620055368c51ef5`.
- Prior fork compat tip: `26e225997deee7573baeae1715b092d9491f3fa7`.
- Main merge and stable behavior: `62a43906cfaa7184f5a3f795d512f4b670d9ec65`.
- Upstream range: two commits, one first-parent commit, six incoming paths.
  Four capabilities come from that range; the fifth is the accepted main-only
  synchronization skill awaiting propagation to compat. No dependency,
  lockfile, migration, workflow, or generated SDK input changes.

### Capability inventory (5/5)

Every row uses audit range `AR-20260907-6203` and the SHAs above. Counterparts
describe the selected pre-merge branch tips. Abbreviated paths use the package
named in their row; C01 paths are under `packages/opencode`.
Final main-to-compat propagation, compat validation, and published branch-tip
evidence belong to `dev-compat-registry-history.md` on compat.

| ID | Capability | Paths, producers, and tests | main counterpart | compat counterpart | Relationship | Drift | canonical_owner | Disposition and evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C01 | Early recovered-assistant settlement | `src/session/prompt.ts`: `startResume`, `startRunning`, `abandonRecoveredAssistant`, `admitted`, `runLoop`; `test/session/prompt-effect.test.ts`, recovery/busy/OpenAPI and Runner/run-state suites | Atomic main-only admission; settlement previously in finalizer | Same admission plus DC-MODEL-001/DC-CONTEXT-001/DC-ACTOR-001 overlays | Complementary intent; different admission protocol | behavior, tests | shared main: FC-001/009, FD-002/009; compat overlays retain their owners | Adapt settlement after atomic admission and candidate lookup, before admission success and new loop; preserve finalizer and message non-mutation on Busy/NotFound/pre-work cancellation; focused RED/GREEN and main session/runtime/server groups pass |
| C02 | Preserve session-diff line endings | `packages/ui/src/components/session-diff.ts`: patch reconstruction and `text`; paired `session-diff.test.ts` with six new cases | Same blobs as prior upstream | Same blobs as main | No fork overlap | behavior, tests | shared main; no FD/FC/DC override | Adopt both upstream files unchanged; 8 tests and UI typecheck pass |
| C03 | Supply App language fixture `intl()` | `packages/app/src/components/prompt-input/submit.test.ts`: language fixture and prompt/custom-command captures; producer `submit.ts` forwards `language.intl()` as `titleLocale` | Existing `zh-CN` fixture and two locale assertions | Same blob as main; shared locale evidence adjacent to DC-TUI-001 | Equivalent fixture capability with stronger fork assertions | tests | shared main; FC-001 locale contract, DC-TUI-001 evidence adjacency | Keep fork file unchanged, subsuming upstream `en-US` fixture; 5 tests and App typecheck pass; assertions reject missing or wrong locale |
| C04 | Isolate enterprise storage test HTTP | `packages/enterprise/bunfig.toml`, `test/preload.ts`; real producer `src/core/storage.ts`; complete `test/core/storage.test.ts` and `test/core/share.test.ts` | No preload counterpart | No preload counterpart; same storage source/tests as main | No fork overlap | test configuration, tests | shared main: FC-008 | Adopt both upstream files unchanged; 16 tests and enterprise typecheck pass with fixed test credentials and in-memory interception of the current S3 origin; no live S3/R2 claim |
| C05 | Propagate accepted synchronization skill | `.mimocode/skills/upstream-sync/SKILL.md`, produced by accepted main commit `95b592e0`; propagation check is blob equality | Already accepted at selected main | File absent at selected compat | Main-to-compat documentation propagation; outside upstream increment | process documentation | shared main: FC-008/012 | Inherit unchanged through main; no code change or new consolidation; final equality and branch-tip evidence are recorded in compat history |

Inventory and result counts are both five. All six FD and all sixteen FC
entries remain active; this range meets no retirement condition. Shared
registries retain their ownership and are inherited unchanged by compat.

### Recovery decision and evidence boundary

- Upstream settles before its Runner call. The fork settles inside admitted
  validation work, after both the atomic claim and successful candidate lookup,
  before completing `admitted` or entering `runLoop`. Runner ownership and busy
  publication still occur first; this is not a guarantee about every status
  event preceding storage mutation.
- Main-only identity, existing locale propagation, synchronous resume wrapper,
  partial-context retention, and idempotent finalizer remain intact. Rejected
  Busy/NotFound requests and cancellation before work starts preserve complete
  persisted message snapshots.
- Before the timing change, two new completion assertions failed; the final
  focused recovery run passes 8 tests with zero failures. The full session
  group below includes those tests, so they are not counted twice.
- The enterprise preload is package test configuration. It exercises the real
  adapter's key/JSON/list-bound behavior through intercepted HTTP; unrelated
  origins still use the original fetch. It does not prove general network
  isolation, R2, signature validation, pagination, or deployed-bucket behavior.

### Local main validation

Stable main matrix: **220 pass, 2 existing skip, 0 fail**. Core groups account
for 191 passes; UI/App/enterprise account for 29. Every command below exits
zero. Counts describe this stable behavior tree, not a future compat tree or
published branch-tip CI result.

| Package / group | Files relative to package | Pass / skip |
| --- | --- | --- |
| opencode / session | `test/session/prompt-effect.test.ts`, `test/session/llm-request-prefix.test.ts`, `test/session/fork-prefix-invariant.test.ts`, `test/session/checkpoint-fork-mode.test.ts`, `test/session/replace-agent-subagent.test.ts` | 116 / 2 |
| opencode / runtime | `test/effect/runner.test.ts`, `test/session/run-state-tuple-key.test.ts`, `test/session/run-state-dispose.test.ts` | 61 / 0 |
| opencode / server | `test/server/session-recovery.test.ts`, `test/server/session-prompt-busy.test.ts`, `test/server/openapi-refs.test.ts` | 14 / 0 |
| ui | `src/components/session-diff.test.ts` | 8 / 0 |
| app | `src/components/prompt-input/submit.test.ts` | 5 / 0 |
| enterprise | `test/core/storage.test.ts`, `test/core/share.test.ts` | 16 / 0 |

Run each row from its package directory with `bun test <row files> --timeout
120000`. Clear `MIMOCODE_EXPERIMENTAL`,
`MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE`, and
`MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`; core groups additionally clear
`MIMOCODE_COMPACTION_MAX_CONTEXT`, `MIMOCODE_COMPACTION_TRIGGER_RATIO`, and
`MIMOCODE_DISABLE_CHECKPOINT`. Preserve package preloads: opencode retains
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` and its managed fixture defaults,
App retains HappyDOM, and enterprise loads its new S3 fixture. These are test
harness baselines, not an isolated-runtime default-off proof. Run the complete
enterprise files because the storage list cases share their setup data.

Package `bun typecheck` passes in opencode, UI, App, and enterprise; lint has
zero errors. UI/App/enterprise test evidence is local and explicit: the current
test workflow runs opencode and cannot stand in for those three package runs.
Final remote-tip equality, ancestry, and successful CI for each exact published
SHA remain synchronization completion gates, with propagation evidence routed
to the compat history rather than asserted here in advance.

## 2026-09-07 explicit basic audio adoption

- Mode: specified change, approved basic TTS and standard multipart transcription.
- Source: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; audio files are
  unchanged in live upstream main `9061f90b94dfe0339616aada7019d1c2e70709ba`.
  This operation does not advance the reviewed upstream baseline or incorporate
  the newer tool-name case flag.
- Prior main: `774a795682c648b7f3637b9159c063ef6a2a4018`.
- Main source/test behavior: `9847165e0749f33c7ac01b72f933ac9cf47e3e55`.
- Prior compat: `bf85673a521537b5cb44002401eb55ad856e4009`.
- Compat source/test inheritance: `9f3e37daa94e2b28d85c3a758e0241307f3eceff`.

### Capability inventory and result (1)

| ID | Selected behavior / surfaces | Owner and main result | Compat result | Evidence |
| --- | --- | --- | --- | --- |
| AUDIO-01 | Upstream basic speech/transcription schemas, raw audio transport, provider speech factory, and two HTTP handlers | FD-004; adopt as serve-only explicit audio option with separate Bearer auth before body/bootstrap, fixed directory, bounded requests, cancellation and intake-first shutdown | Inherited byte-for-byte without conflicts; no new DC override | `src/audio/`, `src/server/audio.ts`, `cli/cmd/serve.ts`, Provider speech cache; audio/provider/HTTP/OpenAPI/TUI-voice matrix |

Inventory and result counts are one. All six FD and sixteen FC owners were
checked against the selected changed surfaces. FD-004 now permits only this
explicit audio exception; the general model-discovery/chat-proxy/token service,
voice design/cloning and automatic TUI listener remain absent. FD-005 has
provider-file overlap, but existing language transport and harness identity are
unchanged. FC-007's fixed-directory boundary is applied before audio bootstrap.
FC-016's independent TUI voice path remains unchanged. Other owner contracts
have no changed implementation. The historical generation-retirement plan's
blanket `/v1` exclusion is amended, without declaring its pending work complete.

All seven compat owners retain their existing behavior. DC-MODEL-001 and
DC-CONTEXT-001 have generated-contract adjacency only; regeneration adds no API
schema changes. DC-TUI-001 has voice-path adjacency, with no TUI component delta.
The three network/platform owners and DC-ACTOR-001 have no changed owned path.
Configured provider HTTP transport is distinct from the WebFetch permission and
SSRF seam; neither branch's WebFetch policy changes.

### Verification scope

- Main: **225 pass, 0 fail**, nine affected test files; compat: **227 pass,
  0 fail**, the same matrix including its existing additional cases.
- Both package `bun typecheck` commands pass. Main repository lint reports zero
  errors; existing warning policy remains unchanged. Source and generated diffs
  pass `git diff --check`; frozen `bun ci` leaves `bun.lock` unchanged.
- SDK and published OpenAPI are regenerated from each branch's source and remain
  unchanged. They contain no optional audio or general capability endpoints.
- Main's Node bundle builds and loads on plain Node v24.16.0 without `Bun`;
  default routes return 404, explicit audio rejects wrong credentials with 401,
  and no database is created by these admission probes.
- Local HTTP fixtures cover native/raw TTS and raw ASR, real credentials/headers
  on the wire, headers-only unauthorized requests, actual chunked size limits,
  concurrent admission, client abort and listener shutdown. A separate non-test
  child proves an audio key does not itself enable the feature.
- The shared-bootstrap cancellation regression first failed twice, then passed:
  audio cancellation/close finishes before an unrelated bootstrap is released.
  The callback is discarded before entry; entered provider work still drains.
- Default-path commands remove ambient experimental, MCP search, Codex mode,
  workflow-tool, compaction max/ratio and checkpoint-disable selectors. Package
  preload retains `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`; the non-test child
  removes that selector too.
- No live paid-provider call was made. Raw custom fetch/OAuth adapters, native
  Whisper-style transcription, non-OpenAI-shaped ASR fallback and native speech
  response-size limiting are outside this adoption. See [audio-api.md](audio-api.md).
- Exact final remote-SHA CI and publication are verified after the registry
  companion commits; these local results alone do not establish publication.


## 2026-09-07 explicit model API specified adoption

- Selected upstream source: `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; this operation does not advance
  the upstream review baseline or incorporate unrelated upstream commits.
- Prior fork main tip: `f45bbccddb5d6d532f6ad8ff2acc2c93a625dddb`.
- Main source/test behavior: `3c361041eedb84e67e2c86e2fca1cd7c880e7d3f`. Subsequent registry-only commits
  do not change this source basis.
- Reviewed the six active FD and sixteen active FC owners. FD-004 now permits
  the explicitly enabled capability service and finite temporary tokens; its
  implicit-listener rejection remains active. FC-007/008 cover fixed directory
  and cancellation; FD-005 retains resolved model identity. Other owned source
  surfaces, TUI, actor/MaxMode/compaction behavior, provider core, workflow files,
  and existing generated artifacts remain identical to the prior main tip.
- Capability inventory N=2, both adapted from the selected upstream source:

| ID | Accepted behavior | Preserved boundary | Local evidence |
| --- | --- | --- | --- |
| MODEL-01 | Capability-based model selection and scoped model listing | Current configured providers; dry-resolved factories; dedicated/default/stable ranking; usable raw transcription remains available when chat is unavailable | 15 capability regressions; real CLI capability/model issuance; HTTP model scope |
| MODEL-02 | Explicit chat/SSE proxy, existing audio reuse, temporary tokens and CLI/Node management | Fixed directory and one model; finite idle/absolute expiry; auth before body/bootstrap; two requests/25 MiB/120 seconds; acknowledged stream cancellation; independent Basic/static-audio credentials | Protocol/service, token, CLI, native HTTP and shared-bootstrap regressions; real source-entry renewal and Node provider calls |

Local affected-suite verification: **334 pass, 0 fail** across 16 files under the
package's 30-second per-test budget; package typecheck and repository lint pass
(lint retains warnings). Seven ambient experimental/context selectors are
removed; package preload's orchestrator selector is retained as the harness
baseline. A separate non-test child removes the orchestrator selector as well
and proves default-off requests remain 404 before bootstrap. SDK/OpenAPI
regeneration is unchanged. Node v24.16.0 builds and runs token lifecycle,
scoped discovery and non-stream/SSE chat against a local provider, with no Bun
global; the smoke host explicitly exits after listener/instance disposal.
Real serve CLI startup, issuance, revocation, default-off behavior, mutually
exclusive flags, cross-directory source renewal, and SIGTERM exit 0 are verified
with user configuration blocked from the isolated fixture.

Independent transport review reproduced the Bun HTTP sink's unhandled abort
and verified the SSE error/close correction. A real provider request reproduced
client provider_options overriding the scoped model; the entire client option
bag is now rejected, while trusted project/model/plugin options remain.

Changed-path calculation against selected upstream, excluding the five
registry/history paths as above: **310 files changed, 33398 insertions(+), 9911 deletions(-)**. The incremental main source change
contains 31 paths, 4,155 insertions and 162 deletions. Final remote SHA/CI and
main-to-compat ancestry are publication checks, distinct from these local tests.


## 2026-09-07 selected harness, schema experiment and actor recovery

- Scope: specified change; selected upstream source remains
  `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`. No upstream branch was fetched or advanced,
  and no unrelated upstream commit was integrated.
- Prior main tip: `4d876d54a304689db1f86e5f6f8f0da577d0f5d4`.
- Main source/test behavior: `40f5019ff8f6e47f7fe646164fafb73f0089f9e2`. Registry-only commits do not advance this basis.
- Prior compat tip: `a6cbcb3b61a98eb9abbe5e1aa2a06880f1c5f286`; compat propagation and its
  seven-DC verification are recorded in its separate append-only ledger.
- Capability inventory N=3; the selected source/test delta is the prior main tip
  through the behavior SHA above. All three capabilities are canonically owned by main.

| ID | Selected behavior and disposition | Preserved contract | Decisive source and evidence |
| --- | --- | --- | --- |
| ALIAS-01 | FD-005: adapt GPT API alias inference into explicit `harness_model` declarations | Session then process then inference; MiMo/GPT-4/OSS exclusions; one prompt/tool/MCP/exec/retry decision; configuration snapshot provenance and three prefix-key producers | `config/config.ts`, `config/provider.ts`, `provider/provider.ts`, `tool/gpt.ts`, prefix/registry call sites; `test/tool/harness-alias.test.ts` including plugin config mutation across two instances |
| SCHEMA-01 | FD-006: retain an independent read/glob/grep declaration experiment; no production adoption | Validators, permission/control tools, membership and executors unchanged; synthetic fixture confinement; measured usage separated from replay and tokenizer estimates | `script/experiments/tool-schema*.ts`, 19 experiment regressions, [versioned results](experiments/tool-schema-2026-09-07.md) |
| RECOVERY-01 | FC-001 / FD-009: adapt resume for a registered persistent actor retaining its original receiver and frozen context | Explicit spawn persistent+full only; default ephemeral/run unchanged; persisted user/task, strict admission, owned cancellation, deferred inbox, model/harness identity; public main-only selectors unchanged | `actor/spawn.ts`, `session/prompt.ts`, `tool/actor.ts`; real create/interruption/resume/idle-cancel test and receiver-retirement, admission and cancellation regressions |

All six FD and sixteen FC entries were reviewed, including clean overlaps.
FD-002 and FC-002/005/013 preserve instruction identity, frozen prefix, skill
permission and MaxMode behavior while carrying the unified harness identity.
FD-004 has provider/schema adjacency only: its explicit discovery/proxy/audio
admission is unchanged. FC-007 retains fixed cwd and tool permission boundaries;
FC-009/015 retain retry provenance and compaction projection/budgets. FC-003/004,
FC-006/008, FC-010/011/012/014/016 and FD-001 have no changed owned implementation.
The experiment follows the existing package isolation contract and never enters
production imports. No owner is retired or renumbered.

The constrained actor changes add a source-bound frozen-context receipt and
actor-owned recovery supervisor. The migration [producer inventory](compose/spec/instance-generation-producer-inventory.md)
adds three manual rows and refreshes two changed notification rows; it distinguishes
detached graceful cancellation, Runner cancellation and generation settlement.
The original generation-retirement plan remains pending; these current
Instance/RunDisposal receipts do not claim its planned GenerationLease APIs exist.

### Local verification at the source/test behavior

- Final affected actor/session/checkpoint/inbox/tool/HTTP matrix: **577 pass,
  4 skip, 0 fail, 2,048 assertions**, 54 files, package 30-second test budget.
  The skips are declared live/legacy skips, not failed or zero-case filters.
- Alias call-chain matrix: **454 pass, 0 fail**, 14 files; after the global-config
  isolation correction, config/provider/alias matrix: **185 pass, 0 fail**, three
  files. These overlapping suites are reported separately, not summed.
- Experiment suite: **19 pass, 0 fail, 113 assertions**. Final declarations yield
  24/24 offline replays and 64 local SDK HTTP requests, with zero validator,
  denied or execution errors. `o200k_base` tools count is 18,342 to 17,852
  (-490, 2.67%); this is not provider billing usage or model quality evidence.
  The two final live pilot requests timed out; valid tool evaluations are zero,
  and schema error/completion rates remain null. The earlier declaration version
  and all six attempted live requests are explicitly distinguished in the result.
- Package `bun typecheck`, repository `bun lint` (zero errors, warnings retained),
  `git diff --check`, frozen `bun ci`, Node bundle and plain Node import/schema
  smoke pass. The lockfile is unchanged. Node smoke proves import/schema use,
  not a live-provider actor recovery run.
- SDK/OpenAPI generation is idempotent. The 140-operation public surface is
  unchanged; only Config model and Provider model `harness_model` fields are added.
- Seven ambient experimental/context selectors are cleared as recorded in the
  implementation plan; package preload retains orchestrator=true. A separate
  non-test child removes it too and proves an undeclared opaque API alias stays
  on default harness while an explicit trusted declaration selects Codex.
- Independent reviews reproduced and closed configuration-hook trust pollution,
  receiver/cancellation continuation races, actor-tool caller/creation admission,
  and idle persistent-context release. No real user configuration was changed;
  the live experiment's isolated credential copy and directory were removed.

Exact final remote tips, their active-workflow CI and selected-source/main/compat
ancestry are publication checks performed after the registry companion commits;
none is implied by these local test results.

### Same-operation ownership correction

The preceding selected-capability entry incorrectly included FC-011 in its
unchanged-implementation group. That FC-011 classification is withdrawn:
`tool/actor.ts`, `tool/actor.txt`, `tool/actor.shell.txt` and the bundled
`mimocode-docs` configuration reference changed under its existing content
ownership. They document explicit persistent/full creation, constrained resume,
idle wait/status and cancellation release, and trusted harness configuration;
they do not grant additional permission. The active FC-011 watch list now names
these paths explicitly so a path-based audit also detects them. This correction
changes only documentation evidence; main source/test behavior remains
`40f5019ff8f6e47f7fe646164fafb73f0089f9e2`, and the capability inventory remains N=3.


### Same-operation actor continuation correction and final main validation

- Final main source/test behavior: `f9e8a8a4f8be6cb826319e7dfa20c680606f6601`; prior selected
  source/test behavior was `40f5019ff8f6e47f7fe646164fafb73f0089f9e2`.
  This is a RECOVERY-01 correction, not a fourth inventory capability.
- Actual resumed provider-overflow and invalid-output regressions showed that
  legitimate internal users were rejected by the original fixed-parent guard.
  The runner now accepts only its own successful conditional-write receipts,
  checking the original session, actor, configured agent, task, and model source
  before advancing its local parent. Compaction exposes an internal receipt
  after successful writes; no public schema or selector is added.
- A foreign hook user, even with matching model/task fields, gains no authority.
  A lost compaction conditional write creates no continuation receipt or extra
  model request. It may safely finish at the owned summary; the contract is
  absence of foreign-user takeover, not an unconditional failure result.
- The four decisive continuation tests pass with 35 assertions. The final
  affected matrix is **589 pass, 4 skip, 0 fail, 2,128 assertions**, 56 files,
  under the package 30-second per-test budget. Source/test/generated hashes
  remain unchanged during that matrix. The declared live/legacy skips remain.
- Final package typecheck, repository lint (zero errors; warnings retained),
  Node bundle and plain Node import/alias-schema smoke pass. Owning SDK/OpenAPI
  generation is idempotent and the previously described 140-operation public
  contract is unchanged. A first smoke harness incorrectly expected the removed
  Config.get export; the corrected smoke checks the existing Config.Service and
  schema exports without changing production code.
- All six active FD and sixteen FC records now refer to the final source basis.
  FD-009 additionally watches compaction's internal continuation seam. The
  ownership correction above remains in force; FC-011 has changed content.
  FC-001/009/015 and FD-002/009 retain source, retry, and compaction boundaries;
  the other previously reviewed owners are unchanged by this follow-up.
- ALIAS-01 and SCHEMA-01 source/tests and experiment declarations are unchanged
  by the follow-up, so their separately scoped evidence above still applies.
  No further live-provider request was made. The seven cleared selectors and
  package preload baseline remain as recorded in the implementation plan.
- User guidance, the selected design/plan, and the migration producer inventory
  explain owned continuations. The broader generation-retirement migration
  remains pending. Selected upstream stays `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  registry-only commits do not advance this final source/test basis.

Final remote-tip equality, active-workflow CI for each final SHA, and ancestry
through main to compat are publication gates checked after these records.


## 2026-09-08 Codex compact tools specified integration

- Mode: specified behavior, capability inventory N=1. Selected upstream remains
  `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; the released compact registration
  comes from `1a0ffba7842af3f11edcb456688bbdf067407c08` in v0.1.14. No upstream
  branch or release tag was advanced, and unrelated newer upstream work is excluded.
- Prior fork main tip: `c1dfc423fe021072d37b8585b5bcc33c4742d514`; prior compat tip:
  `ad7b70702ef77cacb4a83189e0fff30d480d0c66`.
- Main source/test behavior: `69eb01bbd0e2c54da76c145613a31d23d2cedbf3`. Later registry/history changes do
  not advance this behavior reference. Compat integration has its own ledger.

| ID | Selected behavior and disposition | Main result | Compat target | Decisive source and evidence |
| --- | --- | --- | --- | --- |
| COMPACT-01 | Adapt released Codex compact registration and nested execution | Automatic for the final resolved Codex harness, with direct actor and interactive control exceptions | Inherit through main while retaining all seven DC contracts | registry registered/advertised split; prompt frozen pool; tool-script pinned dispatch, permission receipts and media; real SDK compact, prefix, checkpoint and effect-carrier regressions |

The user decision replaces the earlier blanket production rejection in FD-006.
It does not remove FD-006's residual authority, direct-control, schema, cancellation,
media or size/unit contracts, and does not turn the independent SCHEMA-01 experiment
into evidence of production token savings or model quality. The existing
FD-005 resolver, trusted aliases and session/process/inference precedence remain.

All six FD and sixteen FC entries were reviewed. The changed shared owners are
FD-006/009 and FC-002/004/005/007/008/011/015, with FD-001/002/005 and FC-001/009/013
checked at their permission, prompt, actor, retry and final-step carrier seams.
FD-004 and FC-003/006/010/012/014/016 have unchanged owned production behavior.
No identifier is retired or renumbered. Public API schemas, generated SDK/OpenAPI,
lockfile and workflows are unchanged; no generation is required from unchanged
public schema inputs.

Warm captures now retain complete authorized tool definitions, including schemas, and separate active
names. Parent-disabled MCP tools cannot enter a child's frozen authority; hidden
schemas must match before rebinding. New request-local StructuredOutput schemas
participate in prefix identity, so JSON A / JSON B / text requests rotate correctly.
Both checkpoint modes carry the model identity from their corresponding captor.
Codex hidden MCP calls need no redundant invisible search; explicit non-Codex
search retains its permission-only discovery exception and user-disable boundary.

Nested built-in calls retain post-hook input and child cancellation for permission
receipts. Close/abort/join waits for Effect finalizers. Media is relayed through
ordinary outer FileParts with 8-item / 10-MiB limits. Bounded terminal evidence
feeds manifests, worktree hints, pruning and retry detection; media does not consume
the nested-record budget, cancelled/rejected results are not observed as effects,
and absent nested paths cannot imply a cwd mutation. Oversized evidence fields
or whole records may still be omitted within the existing 256-KiB budget.

The [usage guide](codex-compact-tools.md), selected design/plan, historical
architecture notes and [producer inventory](compose/spec/instance-generation-producer-inventory.md)
record this decision. The inventory adds three manually classified exec rows;
GenerationLease and the broader retirement Tasks 1–10 remain pending.

### Validation

- The final affected inventory contains 165 test files. Its initial frozen-tree
  run at `82829017922e8f7215431aa0c06dfb71cf8635f6` recorded 2,093 pass,
  1 fail, 13 skip and 5,761 assertions. The only failure was the unchanged
  queued-cancellation test's whole-case three-second limit. The original fork
  baseline independently reproduced that same limit; phase timing on the new
  tree showed the first HTTP request arrived after the limit, before cancellation.
- The final test-only correction keeps a separate three-second bound on cancel
  plus joining both callers, while allowing 30 seconds for the complete fixture.
  The decisive fixed case passes all three assertions. Its complete request-flow
  file was rerun; 106 pass, 0 fail, 2 skip and 531 assertions. Together with the other 164 unchanged
  files, the effective inventory is 2,094 pass, 0 fail, 13 skip and 5,761 assertions. The original failed
  record is retained, not rewritten as a green matrix. All 1,367 hashed
  source/test/lock files except this one test are unchanged from that matrix.
- Earlier focused regressions corrected stale compact-wire fixtures and exposed
  a real MCP discovery dispatch regression. The permission-only discovery case
  first failed, then passed after retaining the search exception without bypassing
  explicit user disable or tool execution permissions. The four affected files'
  focused verification passed 92 cases and 524 assertions before the final matrix.
- All eight ambient selectors were removed before module loading:
  MIMOCODE_EXPERIMENTAL, MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH,
  MIMOCODE_CODEX_MODE, MIMOCODE_DISABLE_CHECKPOINT,
  MIMOCODE_COMPACTION_MAX_CONTEXT, MIMOCODE_COMPACTION_TRIGGER_RATIO,
  MIMOCODE_ENABLE_EXEC_TOOL and MIMOCODE_EXPERIMENTAL_TOKEN_EFFICIENCY.
  Package preload flags, including orchestrator=true, remain the harness baseline.
  Explicit search cases temporarily enable only their dedicated Flag property
  and restore it on release; surrounding default cases retain ordinary behavior.
  Test subprocesses used a 30-second default per-case limit, with actor/spawn
  and prompt-effect CLI budgets of 90 seconds. File walls were 180 seconds,
  except prompt-effect at 600 seconds; the final main matrix had no file timeout.
- Package typecheck, repository lint (zero errors, existing warnings retained),
  documentation consistency and diff checks pass. Frozen bun ci preserved the
  lockfile. The Node bundle and plain Node v24.16.0 import/export smoke pass
  with no Bun global. Production source did not change after that build.
  No live-provider token, error-rate or completion-rate benchmark was performed.

Final remote-tip equality, exact-SHA test/typecheck/lint CI and selected-source
ancestry through main to compat are publication checks, distinct from these
local results. This specified integration does not claim current-upstream parity.


## 2026-09-08 compact integration CI follow-up

This continues the same specified COMPACT-01 inventory (N=1), with selected
upstream and all FD/FC ownership unchanged. Main source/test behavior advances
to `1ad318dc86895a63763fe47bfa965ca8d5b3d45b`; production trees are identical to
`69eb01bbd0e2c54da76c145613a31d23d2cedbf3`. Later audit commits only update docs.

The first published tip `a7def0bff1acd7c88fd27b4342af336e0bdf83a7` passed lint
and typecheck, but test run `34153723673` failed five cases in three files
outside the earlier 165-file local inventory. The failed CI result is retained;
no same-SHA rerun was used. The agent and system fixtures still expected old
prompt text or top-level apply_patch/view_image. The main classifier fixtures
had the same handmade/missing frozen schemas already corrected in compat.

The four-file test-only correction:

- Checks compact declarations, single-call exec guidance and direct actor/control
  tools, while retaining ordinary non-Codex file-tool expectations.
- Captures actual parent schemas for read, grep and skill_search. Matching read
  schemas execute; changed schemas fail closed without file content; grep's
  whitelist denial and skill permission denial stay independently observable.
- Routes the optional live orchestrator's observation through the existing
  read-only nested-tool projection. It sees retained validated terminal children,
  including exec_command normalized to Bash; omitted records remain unavailable.
  Only its default-off placeholder was run; all 13 real-provider cases remain skipped.

Final effective local inventory: **2,178 pass, 0 fail, 26 skip and 6,091 assertions
across 169 files**. This extends the prior 165-file effective result with complete
system (19 pass / 86 assertions), agent (51 / 194), classifier (13 / 49), and
live-default (1 pass / 13 skip / 1 assertion) files. The separately repeated
five-case nested-projection suite is not counted twice. Per-file hashes and
production invariance bind the inherited results to the final test tree.

Package typecheck and repository lint pass (4,399 warnings, zero errors).
The same eight default selectors are cleared before import, preserving package
preload flags; the live-default check additionally clears its opt-in selectors.
Node build/import evidence remains valid for unchanged production. No real
provider benchmark is added. Shared registries retain all six FD and sixteen FC
entries, now referencing the final source/test behavior. Final publication still
requires successful CI for the new exact branch tips and fresh remote/ancestry proof.


## 2026-09-08 selected Actor/MCP completion audit

- Scope: complete the three user-selected capabilities from the predecessor's
  uncommitted implementation; do not advance the reviewed upstream baseline
  `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`.
- Prior main tip: `588d183d5e8b944fa613205e55b41d805d7d5231`.
- Main source/test behavior: `cedd542f215424ccde54d0a779b6747dc2b34d28`.
- Selected behavior delta: 29 paths, 1,882 insertions, 136 deletions. The full
  tree comparison to the selected upstream is 351 paths, 45,496 insertions,
  10,618 deletions; this is fork divergence, not the size of incoming work.
- All three capability results and the released-feature backlog are recorded in
  [the completion review](upstream-integration-review-2026-09-08.md). Canonical
  owners remain main; all six FD and sixteen FC entries remain active.
- EXEC-ACTOR-01 retains narrowed send/status, request authority, hook revalidation,
  and direct lifecycle tools. Independent review corrected renamed registered
  caller resolution and closed outer-interruption and parked-guest VM cleanup
  gaps. Sandbox active cancellation preserves existing consumers without a signal.
- MCP-AUTO-01 preserves pending defaults and disabled precedence while allowing
  explicit per-name auto_connect for imported transports, with real HTTP/stdio
  execution and cleanup rather than config-parse-only evidence.
- API-ACTOR-01 admits only directly controlled registered persistent/full-context
  actors retaining the original receiver and frozen identity. Exact assistant
  selection and persisted task ownership are retained; task_id is rejected for
  both main and actor calls. Existing HTTP error normalization now covers actor
  NotFound consistently. No duplicate completion worker is introduced.
- Main validation: four exec/actor files 135 pass; sandbox full file 31 pass
  (final cancellation cases 4 pass after test-only timeout/type cleanup); config
  and real MCP transport files 88 pass; MCP lifecycle/OAuth files 37 pass;
  actor spawn and recovery files 79 pass; prefix/OpenAPI/busy contracts 13 pass.
  Additional main task-selector and parent-routing cases passed after their
  focused assertion/message updates. These groups overlap and are not a unique
  aggregate count. Early actor audit runs retained ambient WORKFLOW_TOOL=1;
  the final tool/config/contract runs clear it alongside the three required
  selectors. Package ORCHESTRATOR preload remains enabled and is not production
  default evidence.
- Both main package typechecks pass. Lint has zero errors with existing repository
  warnings. Fresh SDK/OpenAPI generation matches the predecessor's generated
  files byte for byte. The final publication tips require their own exact-SHA CI;
  these local results do not substitute for the delivery-time remote proof.
- Unrelated and predecessor worktrees are preserved; only this operation's own
  clean, integrated worktrees/branches are eligible for cleanup.

- Compat behavior `972b3b3195e1ef3b9cba7ab4e3989046164c7aad` inherits
  all three capabilities. The sole textual conflict kept compat's generated
  OpenAPI producer while accepting the actor query contract. Fresh generation
  matches the merged artifacts. Tools/sandbox: 168 pass; MCP: 126 pass;
  public contracts: 16 pass; HTTP frozen-context recovery: 9 pass; complete
  context/actor/checkpoint matrix: 303 pass, two pre-existing timing skips,
  zero failures. Both package typechecks and zero-error lint pass. The only
  extra compat source/test delta is a regression proving original turnContext
  bytes survive live context changes; no compat production adaptation is added.


## 2026-09-08 Actor/MCP CI contract correction

- First publication was not accepted as complete: main `9b3823b7` and compat
  `a03186c0` passed lint/typecheck, but test shard 4 failed. The two stale actor
  exclusions failed on both branches; the new HTTP suite failed 8 main / 9
  compat cases because another scoped prompt layer cleared the real
  AppRuntime prefix captor. The remaining initial CI jobs passed.
- Main source/test behavior is now
  `224920e08eb3506214f540f1411cc7bd9f26a87e`; compat inherits it at
  `100abd923867627ac9de7998993b5d4e51e92d92`. The runtime, generated SDK and
  OpenAPI source are unchanged from `cedd542f` / `972b3b31`; this correction
  changes only three contract test files and the CI workflow.
- Actor declarations now assert exactly send/status, while the direct actor
  schema accepts all eight lifecycle/control actions. Ordinary subagents
  cannot gain direct or nested actor access through an actor:allow override.
  The three complete contract files pass 71 tests after reproducing the two
  original failures.
- Two real unit-test producers reproduced captor loss after AppRuntime
  warmup. Normal application entry points share one ownership chain; no
  normal-entry runtime failure was demonstrated. FC-008 isolates the whole
  HTTP recovery file in its own job, alongside the existing separate stdio
  observer job. Discovery requires both files, and each dedicated job deletes
  stale output and verifies exact-file, nonzero-execution JUnit. No case is
  removed or skipped, and no artificial context capture is substituted.
- Isolated HTTP evidence is 8 main cases / 103 assertions and 9 compat cases /
  161 assertions, each with zero failures/skips and successful JUnit verification.
  Both owning opencode typechecks pass. All seven selectors named in the shared
  review are cleared for these tests, retaining package preload isolation.
- Final branch tips still require fresh remote equality, successful exact-SHA
  test/typecheck/lint, and selected-upstream-to-main-to-compat ancestry. Prior
  failed runs are not reused as successful publication evidence.


## 2026-09-08 selected released model API capabilities

- Specified-change scope: user items 1, 2, 3, 5, 6, 7, in that order; item 4
  voice design/cloning remains excluded. The six-row inventory, exact source
  boundaries and complete FD/FC/DC classification are recorded in the
  [model API review](released-model-api-review-2026-09-08.md).
- Released capability source: v0.1.14
  `2a0eb706e95a77cba34a319e9f11f33f26d4450c`; prior main tip
  `2d90dfd732a95dc5e5e601e783994860abddde1f`. The overall upstream review baseline
  remains `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; it was not fetched forward.
- Final runtime/test implementation:
  `07ca6cea1ac8a3231701d4ec07b489b713741cd7`. Bundled guidance content:
  `3cb9d8df7d453d8995de22f3242eee4bc81f6e97`. Pure registry/history changes do
  not advance either source or content reference.
- FD-004 now owns bounded public image URLs, inline chat audio, verified
  Google/Vertex SDK transcription, model/transport-aware provider options,
  explicit finite/all-model scope, and independently nullable token lifetimes.
  Finite defaults remain 1h idle / 24h absolute; only two explicit nulls mean
  no expiry. Legacy v1 remains finite and exact-scope, with atomic migration
  only on real mutation. Revocation and all request limits still apply.
- All six active FD and sixteen FC were reviewed for this final delta.
  FC-007 includes an existing changed API evidence file; FC-008 records API
  cleanup and bounded CLI child execution; FC-009 reviews ephemeral hook
  context and zero SDK retries; FC-010 keeps WebFetch rules independent;
  FC-011 directly owns the bundled API guidance. Unchanged owners receive
  an incremental static review basis, not a claim of complete runtime retesting.
  Seven compat DC were pre-reviewed against `3737e4d3`; final propagation
  and overlay validation are still separate publication steps at this snapshot.
- Final main affected matrix: **732 pass, 0 fail, 0 skip, 2,261 assertions
  across 21 files**, 354.54 seconds. JUnit discovery independently verifies
  exactly 21 expected files and 732 executed cases. This includes every
  llm-server/audio suite, optional model/audio HTTP admission and bootstrap
  cancellation, OpenAPI contracts, real CLI issuance/renewal, builtin guidance,
  and provider transformations. Earlier focused and independent results overlap
  this matrix and are not added to its unique count.
- The seven named default selectors in the review are removed before the Bun
  run; package-owned preload flags and isolation remain. Package typecheck
  passes. Repository lint reports 4,457 warnings and zero errors.
- Complete Node build and actual bundle smoke pass on Node v24.16.0; four
  optional routes remain 404 despite a valid issued credential. Scope, four
  expiry combinations, permanent revocation, and runtime/published OpenAPI
  omission pass. Seven real Node HTTP/TLS/image cancellation probes also pass.
  These use isolated local fixtures and a fixed model catalog; no remote model
  generation is claimed. Default-off Node runs do not use Bun test preload.
- SDK/OpenAPI generation inputs did not change; runtime and published schemas
  retain the existing optional-route omission. Actor/task authority, session
  MaxMode, and unrelated upstream changes remain outside this operation.
- Each capability received independent review. Publication completion still
  requires the final fork branch tips, successful test/typecheck/lint on each
  exact SHA, selected-baseline ancestry through main to compat, and preservation
  of prior worktrees. Local green runs do not substitute for that proof.


## 2026-09-08 MEDIA-DNS-01 image connection fallback

PR #77 feedback identified a first-address-only failure: a hostname could have
multiple validated public addresses, but an unreachable first address prevented
using a reachable later one. This is one repair to MEDIA-01, not another adopted
capability or a new compat override.

| Inventory item | Reviewed behavior | Owner and source |
| --- | --- | --- |
| MEDIA-DNS-01 (N=1) | Sequential fallback within the already fully validated public DNS answer set, restricted to explicit refused/unreachable connection errors; TLS, HTTP and body failures remain terminal | FD-004; `packages/opencode/src/llm-server/images.ts` and its image test/fixture at `d5798519cd1227ab4061bd69ef9efc5f483b74d8` |

- Prior main: `85dfc3f2edbd1eca5cf92daa3521a7bcf2027cb5`; current runtime/test
  behavior: `d5798519cd1227ab4061bd69ef9efc5f483b74d8`. The overall upstream
  baseline remains `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; bundled guidance
  content remains `3cb9d8df7d453d8995de22f3242eee4bc81f6e97`. Pure registry/history
  edits advance neither runtime nor content snapshots.
- The complete source/test delta is three files: `src/llm-server/images.ts`,
  `test/llm-server/images.test.ts`, and `test/llm-server/image-fixture.ts`, under
  `packages/opencode`. All six active FD and sixteen FC were reviewed against
  this final delta. FD-004 has direct source/evidence overlap; FD-005 and FC-004,
  FC-007, FC-008, FC-009 and FC-010 have semantic adjacency. FD-001/002/006/009
  and FC-001/002/003/005/006/011/012/013/014/015/016 have no relevant changed
  carrier. This is an incremental owner review, not a claim that all owner
  runtime suites were rerun. Existing dated evidence remains historical.
- The fallback whitelist is `ECONNREFUSED`, `ENETUNREACH`, `EHOSTUNREACH`, and
  `EADDRNOTAVAIL`, with absent `syscall` or `syscall: connect`. It excludes
  reset/timeout and TLS failures. Each attempt retains numeric-address pinning,
  original Host/SNI, native TLS verification and close-before-next cleanup.
  Cancellation, per-request deadlines, per-hop public-address validation,
  redirect count, and media limits remain in force. HTTP responses and body
  failures do not trigger candidate replay; `sdk.ts` generation `maxRetries: 0`
  is unchanged. WebFetch private-network policy and the other five adopted model
  API capabilities are unchanged; voice design/cloning remains excluded.
- Main focused validation reported 272 pass, 0 fail, 0 skip, 686 assertions
  across four files in 42.44 seconds; the coordinator independently checked its
  JUnit counts. Package typecheck passed. Repository lint reported 4,462 warnings
  and zero errors. The run cleared seven ambient selectors while preserving
  package-owned preload flags: `MIMOCODE_EXPERIMENTAL`,
  `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`,
  `MIMOCODE_CODEX_MODE`, `MIMOCODE_COMPACTION_MAX_CONTEXT`,
  `MIMOCODE_COMPACTION_TRIGGER_RATIO`, and `MIMOCODE_DISABLE_CHECKPOINT` were
  unset. These are local results for this source tree,
  not remote exact-SHA CI evidence.
- Independent real-socket probes at the final source passed 10/10 on Node
  v24.16.0 and 10/10 on Bun 1.3.14, with zero failures. They cover refused-first
  fallback, candidate exhaustion, cancellation at error/close, no replay after
  a real GET reset or HTTP 500, per-redirect DNS fallback/private rejection,
  and original Host/SNI TLS success plus hostname-mismatch rejection before
  any HTTP request. The trusted request seam maps validated public numeric
  candidates to local temporary closed ports and HTTP/TLS sockets; this is not
  live public-network availability or IPv6-link evidence.
- Compat preflight at `14716fe3` confirms images source/tests/fixture equal main
  and do not overlap its 96-path overlay. All seven DC were reviewed: NET-001,
  NET-002 and CONTEXT-001 have semantic adjacency; PLATFORM-001, MODEL-001,
  ACTOR-001 and TUI-001 have no relevant changed carrier. Public image policy
  must stay identical on both branches; approved private WebFetch and the mocked
  private-MCP sentinel remain separate. Actual propagation, final overlay checks,
  remote branch tips and exact-SHA CI remain pending for this repair.

## 2026-09-08 specified compaction-trigger alignment

- Scope: COMPACTION-01 only. Main source/test behavior is
  `fd285d92a3779b583a9ca82842516c863eb743bf`, based on fork
  `1f88fded9402ebcb2f6379477d77f7d8d15549a2` (26 selected files).
  The overall upstream review baseline remains
  `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; comparison with release
  `2a0eb706e95a77cba34a319e9f11f33f26d4450c` and selected upstream snapshot
  `0abfeba186191c1a361cf3f27b802e9d29bf0fdc` imports no unrelated commits.
- Provenance: upstream `70ef8edccaeb10fc9a03399eeb0448316d1d9429` raised
  the existing buffer to 33K; upstream
  `957bc463c33d1d38cdfc4510151ec2f60ba5a92a` replaced the reserve cutoff
  with a flat ratio. Fork merge
  `07d16a5f757377b816a1979297ec1cce80b7c9bd` retained both cutoffs.
  This review supersedes that fork policy at the user's request; it does not
  attribute the old constants to a new fork capability.
- FC-015 now uses `floor(effective * ratio)`, default 90%, while preserving
  upstream budget validation/precedence and the fork's bounded projection,
  frozen context, and no-tool summaries. `/context-limit` previews candidates
  through the actual resolver and reports the applied trigger. Config schema,
  generated SDK/OpenAPI, bundled guidance and translated references describe
  the remaining budget-validation role of `reserved`.
- Local final affected matrix: 123 pass, zero failures, 320 assertions across
  eight files; package typecheck passed. Full repository lint reported zero
  errors (4,455 warnings); final changed-code lint reported zero errors
  (82 warnings). The prompt-effect sweep had 105 pass, two existing skips,
  and one stale high-pressure fixture failure; after resizing that fixture to
  reach the new threshold, its isolated regression passed. SDK generation and
  generated-description consistency checks passed.
- Final matrix unset `MIMOCODE_EXPERIMENTAL`,
  `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`,
  `MIMOCODE_CODEX_MODE`, `MIMOCODE_COMPACTION_MAX_CONTEXT`,
  `MIMOCODE_COMPACTION_TRIGGER_RATIO`, and `MIMOCODE_DISABLE_CHECKPOINT`.
  Package-owned preload `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` remains the
  harness baseline; individual opt-in tests set their own target selector.
- Compat additionally removes its 5K request-preflight advance so estimates
  use the shared trigger. Its real wire estimate, static/recoverable overflow
  classification, and frozen actor/context behavior remain separate retained
  capabilities. Final compat validation and exact-SHA publication evidence
  are recorded by the propagation review, not asserted by this main entry.


## 2026-09-08 POLICY-06 yolo deletion and invocation approval

Specified behavior adoption, first in the approved order POLICY-06 → POLICY-01
→ POLICY-04 → POLICY-03 → POLICY-02. The separately completed compaction policy
is unchanged. This operation does not advance the overall upstream review
baseline `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85` or import unrelated commits.

- Released upstream source: `2bff8074b572aee6dd0d0bc5e86fe5db9bff8013`, included
  in v0.1.14 `2a0eb706e95a77cba34a319e9f11f33f26d4450c`.
- Selected local upstream snapshot: `0abfeba186191c1a361cf3f27b802e9d29bf0fdc`.
- Previous main: `df9a263bdfa60f762b0c90b6126a774ef60737ed`.
- Main runtime/tests and bundled permissions guidance: `6df77610eed88d86d674c6fd145852c5b4208289`.
- Registry-only commits do not advance that source snapshot. Main and compat
  PR head review, merge, and branch push CI are recorded separately after they
  actually complete.

| Capability | Result | Retained fork contract | Owners |
| --- | --- | --- | --- |
| POLICY-06 | Startup yolo includes deletion approval; local/attached CLI uses once replies for its own active invocation | Explicit bash/bash_delete/external-directory deny wins; no per-run shared Boolean flip or restoration; runtime delete and skip-all remain independent | FD-001, FC-001, FC-007 |

The invocation UUID is optional correlation, never a credential or persisted
permission grant. Scope ownership starts inside admitted prompt/command work.
Successful atomic continuations and explicitly admitted children carry the same
live scope. Selecting unrelated queued input closes the previous scope and
cancels old pending asks, while the new input retains ordinary human approval.
Captured bridges keep separate holders, so clearing the current holder cannot
remove an old bridge's cancellation signal. Actor recovery/persistent wakes and
server-initiated MCP sampling do not inherit a stale caller scope.

CLI rejection uses optional `scope: "request"` to avoid the old session-wide
rejection cascade affecting another invocation. Missing scope retains the human
UI behavior; once/always remain unchanged. SDK/OpenAPI were generated from
source, retaining the existing flattened reply call signature. Only synchronous
prompt and command advertise runID; prompt_async does not silently accept an
unsupported correlation field.

A delete confirmation covers the whole command once, after explicit regular
Bash and external-directory deny checks. The existing temporary-target exemption
and protected project/worktree paths remain unchanged. See
[Yolo and run approval](yolo-run-approval.md) for the entry-point contracts.

### Validation at the source snapshot

Bun 1.3.14, from package directories. Default-path commands remove ambient
MIMOCODE_EXPERIMENTAL, MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH,
MIMOCODE_CODEX_MODE, MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL,
MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS, and MIMOCODE_AUTO_APPROVE_DELETE.
Package preloads, including ORCHESTRATOR=true, remain the harness baseline.
No ratio, max-context, or disable-checkpoint ambient override was present.

| Matrix | Result |
| --- | --- |
| Bash deletion, isolated Git, conflict ownership, delete flag, TUI deletion prompt (6 files) | 73 pass / 0 fail |
| Permission directory, HTTP reply scope, OpenAPI refs, CLI yolo/completion (18 files) | 198 pass / 0 fail |
| MCP sampling permission, cancellation, and old-connection correlation | 14 pass / 0 fail |
| Final real CLI attach, HTTP reply scope, and prompt/command/async admission (3 files) | 11 pass / 0 fail |
| Run scope, real tool bridge, child scope, disconnect, queue, doom loop, and continuation (3 files) | Final corrected group: 12 pass / 0 fail |
| Independent frozen-scope/queue/compaction review | 5 pass / 0 fail |
| opencode and JavaScript SDK package typecheck | pass |
| Repository lint | 0 errors; existing warnings remain |
| Source-generated v2 SDK/OpenAPI and diff whitespace check | pass |

The checkpoint fixture failure came from an independent checkpoint writer
consuming the test's queued provider response. The corrected fixture provides a
real existing checkpoint, still requiring two real permission events with the
same runID and different assistant parents. No assertion was weakened. The
per-group counts overlap and are not an aggregate suite total.

Actual regressions were demonstrated before fixes: delete grants bypassing deny,
foreign queued input receiving the old runID, MCP sampling inheriting a connection
creator's runID, and request rejection cancelling another run's pending ask.
The final CLI test launches real Bun subprocesses against the HTTP server and
model fixture: yolo deletes once, a later strict invocation refuses deletion,
and shared autoApproveDelete remains false with no pending asks.

Active FD/FC owners were reviewed for all touched surfaces, including cleanly
merging bridges. Relevant compat overlays are DC-ACTOR-001 and DC-CONTEXT-001;
DC-MODEL-001, DC-NET-002, and DC-TUI-001 have adjacent consumers. Existing frozen
contexts, chronology, model routing, network, and TUI overlays must be preserved
when the accepted main commit is propagated. No unrelated or pre-existing dirty
worktree is part of this operation.


## 2026-09-08 — POLICY-06 mixed-command review correction

PR #83 review found that independent delete auto-approval could bypass ordinary
Bash/external-directory asks for a mixed command such as `rm victim && curl ...`.
The same shared behavior was already on main, so the correction is reviewed on
main before propagation into the pending compat PR.

Runtime/tests and bundled guidance: `db2211ddbe0e064e4207583145e66c471deb73ab`. Prior accepted
main: `bfa3c2466d07da01881b252a0337ac444b4ae927`. The selected upstream
baseline is unchanged. FD-001 and FC-007 now distinguish an actual pending reply
from an automatic grant. A request-local internal receipt preserves the complete
command's single manual confirmation without a shared-switch reread; an automatic
delete grant still reaches ordinary Bash and external-directory authorization.
Explicit denies, temporary classification, and run-scoped approval remain intact.
No HTTP or SDK shape changes.

Validation: 4 real red regressions then 44 related permission/CLI tests and 15
Bash scanning tests passed, with 183 and 33 assertions respectively. Mixed-command
fixtures check untouched files and zero HTTP requests before approval, successful
effects after once, and no effects after rejection. Automatic approval followed
by a concurrent switch change still preserves ordinary asks. Manual/forwarded
pending replies and real CLI yolo attach retain their expected behavior.
Package typecheck passed; repository lint reported 0 errors and 4468 existing
warnings. All six ambient experiment/yolo/delete selectors were cleared while
preserving package preload. Runtime evidence is macOS zsh; PowerShell is not
installed locally and was not claimed tested. Whitespace diff check passed.

Compat inherits both shared production files unchanged; DC-ACTOR-001 and
DC-CONTEXT-001 run-scope carriers remain as previously reviewed. Exact PR-head
Codex review, CI, and final remote propagation are separate merge gates.


### POLICY-06 forwarded approval follow-up

PR #84 Codex review identified the explicit `session approve` path as a second
completion producer that bypasses `Permission.reply`. Source `c7014557445832a97248ed7b0af568e51bfd291d`
marks the original ask's receipt only inside the successful Deferred completion
for that one-shot forwarded approval. Automatic pre-grants and denied or already
settled requests cannot be relabelled. The original statement above referring
only to a pending reply is superseded by this equivalent explicit approval path.

New real SessionTool approve/deny/pregrant and late-completion regressions:
4 passed. With the existing mixed Bash matrix, 22 tests / 151 assertions passed;
20 forwarding/forward-ref/delete-control tests / 42 assertions passed separately.
Package typecheck and whitespace checks passed. No HTTP/SDK changes; selected
upstream unchanged. This correction requires a fresh current-head Codex review
before main is merged and propagated to compat.


## 2026-09-08 POLICY-01 full authorized exec composition

- Selected capability count: **N=1**, POLICY-01. The user-approved selection
  adopts broader nested Actor operations and interactive question/plan controls.
  Selected source: `0abfeba186191c1a361cf3f27b802e9d29bf0fdc`; released v0.1.14
  reference: `2a0eb706e95a77cba34a319e9f11f33f26d4450c`. The overall reviewed
  upstream remains `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; no upstream ref
  advancement is claimed.
- Prior accepted main: `3350f0f2ce17501d4d925f5e293f07d809f29f22`.
  Implementation source: `5626738d6ee8ee6d40b0068d4221ed0a2066c1eb`; final
  runtime/tests and guidance after
  merging accepted main:
  `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`. This snapshot retains the
  accepted POLICY-06 deletion and forwarded-approval corrections; this review
  does not revise FD-001 or FC-007 policy.
- Incremental source/content delta from the accepted main baseline: 47 files,
  2,715 insertions and 517 deletions, excluding the five registry/history paths.
  This is an incremental POLICY-01 measurement, not the full upstream-to-fork
  path universe. Pure registry updates remain outside the source basis.

### Contracts and review findings

FD-006 now permits full authorized nested canonical Actor operations and
question/plan_exit while retaining their direct entries. Canonical definition
identity prevents same-named custom/MCP tools from acquiring Actor/plan control
privileges or the trusted plan-commit callback. FD-009 freezes the complete
native Actor input schema separately from wire schemas, through warm/cold
capture, hashing, JSON storage and rebinding. A legacy JSON wire schema may
prove native authority only by exact equality; legacy shell wrappers cannot
prove it and fail closed. No live native schema is injected to repair a frozen
actor, and this metadata does not change public HTTP/SDK or provider schemas.

FC-001 owns generation-bound admission handoff and child cleanup. Independent
review reproduced a service-return/tool-assignment cancellation window that
left a pending child. The final implementation transfers the cancellation
handle through onAdmitted while the service still owns the resource; the same
probe then observed an idle cancelled child with a settled outcome. Generation
creation also moved into masked admission, closing the earlier static
pre-acquire boundary without labelling it a separately reproduced failure.
Cancellation joins actual work/post-stop cleanup, including unstarted fibers;
old handles cannot cancel successor generations. Timeout preserves supervised
work and its visible actor ID; observer cancellation does not cancel the actor.
Nested exec metadata preserves actor IDs, including background work whose guest
call was not awaited, and real terminal inbox notifications reach the parent.

Prompt-owned interaction routes ordinary eligible peer questions to the parent
without changing the originating message/tool identity. Background/system,
unknown actors, missing authority and Never-Ask do not acquire an interactive
pending question. FC-008 owns atomic Question registration/publication/waiting,
exactly-once terminal cleanup and generation-captured Bus publication without
recreating a disposed instance. The closed-state registration guard covers the
capture-to-registration disposal boundary.

Only the foreground root main plan turn may approve the build transition.
The actual assistant parent user anchors a conditional transaction that writes
user and parts together; a newer user supersedes approval. Successful commit
records a trusted receipt and ends the old exec guest before result delivery,
including its catch/finally paths. Raw-file and tool calls share admission
exclusion, and receipts survive bounded nested records and post-commit failures.
The real next provider request selects build after Yes; No retains plan.
FC-009 retains hook/synthetic provenance, FC-011 updates only matching guidance.
FC-002/004/005 retain checkpoint, MCP and skill authority across the changed
prefix/registry carriers. FD-005 identity, FC-007 path/deletion and FC-013 final
step/retry contracts remain separate and unchanged.

### Local validation and evidence limits

The final sequential package matrix comprised five files:

| File under packages/opencode | Passed | Failed | Assertions |
| --- | ---: | ---: | ---: |
| test/tool/actor-exec-lifecycle.test.ts | 4 | 0 | 34 |
| test/session/exec-interaction.test.ts | 6 | 0 | 59 |
| test/tool/tool-script.test.ts | 95 | 0 | 314 |
| test/tool/actor-owned-lifecycle.test.ts | 10 | 0 | 28 |
| test/tool/control-origin.test.ts | 2 | 0 | 12 |
| This non-overlapping matrix only | 117 | 0 | 447 |

Each file ran separately from `packages/opencode` using
`bun test --timeout 60000 <file>`. The runs cleared
`MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`,
`MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`, `MIMOCODE_CODEX_MODE`,
`MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS` and `MIMOCODE_AUTO_APPROVE_DELETE`.
Package preloads `@opentui/solid/preload` and `./test/preload.ts`, including the
latter's ORCHESTRATOR setting, remained in force. This is package-harness
coverage, not proof of production feature activation with all selectors absent.

Package `bun typecheck` exited 0. Repository `bun lint` exited 0 with
**4477 warnings and 0 errors**; no claim is made that every warning predates
this change or that lint proves formatting. The evidence is recorded in
`/tmp/mimocode-policy-align-20260908/policy01-final-verification.md`, the
adjacent `policy01-final-results.json`, and the seven
`policy01-final-*.log` files. Separate recorded groups comprise plan/Question (51 passed, 0 failed, 154
assertions across seven files; `plan-question-root-final.log`), native/control
(46 passed, 0 failed, 247 assertions across five files;
`control-wrapper-final.log`), and cold frozen capture (4 passed, 0 failed,
34 assertions, 116 filtered cases; `native-freeze-root-final.log`). These
groups overlap other coverage and are not added to the matrix total.
This registry-edit pass reviewed those recorded results rather than rerunning
runtime tests.

A subsequent coexistence check ran against exact HEAD
`aa2dbe494fb5903f918d8d7cd8b6d04404acb031` after accepting the POLICY-06
correction. The Bash delete/forwarded-approval pair passed 22 tests with
151 assertions; actual exec interaction plus run-scope tests passed nine with
72 assertions. This separate affected-surface matrix totals **31 passed,
0 failed, 223 assertions**, and package typecheck exited 0. It used the same
six cleared ambient selectors and preserved package preload. Evidence:
`policy01-inherited-verification.md`, `policy01-inherited-results.json`, and
`policy01-inherited-{bash,interaction,typecheck}.log` in the same temporary
evidence directory. The interaction cases overlap the earlier matrix; these
31 tests are not added to its 117-test total and do not claim all Actor or
permission coverage. No repeat lint or remote CI result is implied.

### Compat propagation watch and pending gates

This entry records a reviewed local source tree, not a published POLICY-01 PR,
remote CI success or completed compat propagation. At this review point the
prior POLICY-06 compat PR #83 remained under review. POLICY-01 must inherit
its final accepted state before propagating.

All seven compat owners were reviewed for clean as well as conflicting overlap:
DC-NET-001 keeps approved private WebFetch and the separate public-only image
transport; DC-NET-002 keeps the isolated RFC1918 MCP sentinel; DC-PLATFORM-001
keeps ripgrep/archive fallbacks. DC-MODEL-001 retains per-agent MaxMode,
structured-output exclusion and main-only retry status. DC-CONTEXT-001 retains
caps, current-turn/active-tool preflight, loaded MCP hash membership and
chronological admission. DC-ACTOR-001 retains frozen turnContext/system/cwd,
actor-scoped messages and static-prefix overflow handling. DC-TUI-001 retains
provider/model/variant and locale display alongside the new plan receipt
consumer. These are required propagation checks, not completed compat tests.

The inspected compat commitUserMessageIfLatest already performs its latest-user
check in the same immediate transaction as validated message/part insertion,
with ownership, duplicate-ID and monotonic actor chronology guards. Preserve
that helper and the new plan CAS producer, then layer the accepted shared
committed-only run correlation. Restoring the old createMessage/updatePart pair
would lose atomic plan approval; copying main's helper wholesale would lose
compat admission hardening. Preserve prompt frozen preprocessing and
actor/spawn turnContext alongside the new native-schema contract.

Exact-head CI, current-head review feedback, main acceptance and subsequent
compat propagation remain root-owned gates after this local registry update.

## 2026-09-08 POLICY-04 frozen skill catalog system tail

- Selected capability N=1: POLICY-04; selected upstream snapshot
  `0abfeba186191c1a361cf3f27b802e9d29bf0fdc`, released source
  `2a0eb706e95a77cba34a319e9f11f33f26d4450c`. Overall upstream review remains
  `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; this is not a full sync.
- Accepted prior main: `d415822c29539a4b6eebeafb59de1b88da18b95c`.
  Runtime/tests/plan: `22c5a51099f460cb9b58c064c57c8632e2cd70be`, tree-identical to implementation
  `3e2fca0e` after inheriting that formal main ancestor.
- FC-005 owns the layout/version/migration contract. FC-002 and FC-015 retain
  the captured pair across Actor/checkpoint and compaction consumers. FD-002
  instruction enablement remains unchanged. POLICY-01 native contracts,
  POLICY-06 approval ownership and the accepted pure 90% threshold are retained.
- A nullable schema-3 catalog record stores canonical text, content hash and
  originating user turn independently of the stable profile and tool hashes.
  Cold capture pins and returns the winning pair. A normal loop losing the
  initial pin uses that pair while retaining its live executable tool pool.
  Legacy SQL NULL preserves history layout until a later direct user input;
  projection suppresses only recognized generated parts and never rewrites DB
  messages or moves loaded skill bodies.
- Local focused validation: 122 pass, 0 fail, 653 assertions across 13 files.
  This combines helper/projection, actual old-schema database migration and
  reopen, existing skill command gates, real cold-capture competition, two
  non-test session-reopen children, actual provider continuations/compaction,
  native full-Actor contracts and prefix/checkpoint consumers. The 16-case
  prefix/checkpoint subset includes recording fixtures and is not claimed as
  full checkpoint E2E. Ambient experimental, MCP-search, Codex, workflow, yolo
  and auto-delete selectors were removed; package-owned preloads were retained.
- Package typecheck passed. Repository lint passed with 4,486 warnings and
  zero errors; warnings are not classified as all pre-existing. No public
  schema changed and no SDK/OpenAPI field carries the internal catalog column.
  Exact-head remote CI, Codex review and compat propagation are later gates.

## 2026-09-08 POLICY-04 CI test convergence

PR #87 at `2f297184b9eb8b8cbc46f61604c900d291d48d4b` completed Codex review
with a positive connector reaction. CI exposed two prior prefix tests still
asserting history placement/revision 1, plus a pre-existing Actor fixture
whose shared response FIFO let a parent-notification request consume the
child's recovery response. A real parent-first probe reproduced the latter
without modifying production code; routing responses by the delegated user
input fixed the same ordering while keeping the real parent request.

Corrected source/test basis: `d9ed4dc480ddbe319d79e6ca655facc552e2cd35`. The two prefix tests pass with 14
assertions; the formal Actor recovery case passes with 27. The deterministic
parent-first probe passes separately with 27 and is not double-counted.
Combined focused evidence is 125 pass, 0 fail, 694 assertions across 14 files.
Package typecheck passes. No product or timeout change was needed. New-head
Codex completion and all CI remain required before merge.

## 2026-09-08 POLICY-04 frozen non-catalog prefix follow-up

- Runtime/tests source: `8ed2c5806a5e8d79aed7212c7c7c020bc817b2c4`, following reviewed candidate `110222157896b16e7ba85bc3d5d3f5eef975a6e1`. Bundled guidance remains `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`; the overall upstream baseline and selected released source remain unchanged. This is a local follow-up, not a formal acceptance or compat propagation claim.
- Codex identified that refreshing the directory rebuilt frozen instructions and plugin output. A verified optional internal catalog position now permits only that range to change; tool-schema rotation also preserves every non-catalog system byte. Legacy schema-3 rows infer only a unique complete match; ambiguous or invalid old positions retain the old pair and log the reason. Empty legacy and standalone-catalog transitions never introduce empty system entries. Temporary construction markers are fully materialized before pin or dispatch.
- The failed shard-1 reopen test exited its child successfully but received a truncated long stdout JSON line. Child results now use an awaited JSON file read after child exit; the original bounded timeout and real persistent database/reopen paths remain.
- Focused follow-up matrix: 33 passing tests / 180 assertions (24 catalog helpers plus 9 real prefix/capture/compaction/reopen cases). This overlaps the prior 125-test matrix and is not added to it. New behavior, cancellation-free empty transitions and stdout transport fixes each have their own reproduced RED; the current patch passed package typecheck, diff check and lint (4,487 warnings, zero errors). The last empty-catalog helper fix was verified by its helper cases and final typecheck; the nine provider cases were not redundantly rerun.
- Main PR87 must receive a fresh Codex review and exact-head CI before merge. Compat must inherit this patch and retain its capped-history projection and current-turn split before its own review/publication gates.

## 2026-09-09 POLICY-04 request-owned format correction

- Runtime/tests: `b948ef02e6a44aa8eb8cdf67662d69335f58f6df`. The preceding PR87 head `c1e391d184bb0a3efbf7a60a38f553c41d6c5935` completed Codex review but failed CI and was not merged.
- CI caught a real JSON-to-text format regression: freezing the entire non-catalog prefix retained the StructuredOutput instruction after its tool was removed. The managed range now records the caller-owned format prefix independently of the catalog content hash; format transitions change that prefix while instruction files, environment and plugin content remain frozen. A competing pin also preserves the winner's catalog while applying the current caller's format.
- Old structured-tool snapshots prove the presence of their generated format instruction; migration adopts only its verified adjacent or unique position. Empty and ambiguous range behavior remains bounded. Cold capture persists the complete range metadata. The shared MockLLM fixture now preserves the caller-controlled system tail, matching the real builder's post-plugin append instead of discarding it and losing the slot token.
- Verification: 39 tests /135 assertions across catalog helpers, actual Codex structured-schema transitions and text-loop fixtures; 9 prefix/capture/reopen/compaction tests /134 assertions; final expanded four-case pin/capture matrix /64 assertions overlaps the previous three captures. There are 49 distinct tests in these seven files. New provider assertions switch text to JSON and back after editing AGENTS/plugin data and prove frozen non-format bytes stay unchanged. Current source passes package typecheck, diff check and lint (4,487 warnings, zero errors). Fresh-head CI and Codex review remain required.

### 2026-09-09 POLICY-04 authenticated legacy description correction

Source `0b665c7e681e44cac6f1a6acf18732015fb2bf86` addresses PR #88 review 3960268908 in the shared main owner.
A valid hash/schema-authenticated v2 catalog may contain `<skill_content>` in a
description; recognition now validates that form before the substring guard for
metadata-free legacy content. Loaded bodies and malformed metadata remain
preserved. A failing recognition regression was reproduced before correction;
31 tests / 110 assertions then passed, including real legacy prefix migration
with the description token. Package typecheck and repository lint passed with
zero errors. This correction requires its own main PR and subsequent compat
inheritance before POLICY-04 completion.

## 2026-09-08 POLICY-03 default TUI model API local review

- Selected upstream source: `0abfeba186191c1a361cf3f27b802e9d29bf0fdc`, released in v0.1.14 (`2a0eb706e95a77cba34a319e9f11f33f26d4450c`). The overall upstream review baseline remains `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; this is selected behavior adoption, not a full upstream merge.
- Main runtime/tests and changed bundled guidance: `0353965ea38ce3d963f123acb2f9a965bcbb98c3`; local development base `d415822c29539a4b6eebeafb59de1b88da18b95c`. Policy 04 must be inherited and accepted before publication/propagation is complete.
- Ordinary TUI owns a loopback ephemeral model listener, isolated automatic credentials, startup directory scope, and shutdown. Explicit HTTP TUI transport carries Basic credentials through the workspace SDK factory. Model callers still require scoped Bearer tokens; attach reuses the existing listener. Operator-supplied password provenance alone can relax operator directory/bind limits. Existing model/media implementations remain the shared provider path.
- Reviewed ownership: FD-004 and FC-007/008/011; adjacent authentication, media, permission and interaction consumers checked. Remaining entries retain their prior individually recorded review bases. Incremental implementation from the development base: 19 paths, 1,129 insertions, 87 deletions (includes focused tests, guide and plan).
- Default-path validation cleared six ambient feature/approval selectors, preserved the package harness baseline, and ran from the package directory. Bun matrix: 203 passing tests, 629 assertions, 12 files, zero failures. This comprises worker-listener 8/55, thread wiring 12/51, real dual-worker lifecycle 1/7, workspace SDK auth 2/14, and existing model/media/TUI regression 180/502. The existing regression groups were run sequentially once; counts exclude exploratory RED runs.
- Two standalone POSIX PTY scenarios separately launched ordinary TUI and attach without test preload; production Solid preload remained. Natural /exit returned zero; ordinary owned socket/discovery retired before process completion, while attach preserved the remote listener. Both exercised a real local HTTP chat through the SDK (two provider calls total). This is local controlled-provider evidence, not an external hosted-provider claim.
- Package typecheck passed after the final SDK-header fix; repository lint passed with 4,485 warnings and zero errors; diff check passed. No public API schema changed, so no SDK generation was required by this policy. Current-head Codex review, exact PR/branch CI, formal inheritance and compat propagation remain pending.

## 2026-09-08 POLICY-03 inheritance of the POLICY-04 review correction

The TUI model API branch locally inherited POLICY-04 candidate
`c1e391d184bb0a3efbf7a60a38f553c41d6c5935` (runtime `8ed2c5806a5e8d79aed7212c7c7c020bc817b2c4`)
through merge `bfb0c5e2c63fcad0b055c9e7bca58089268500d9`. This aggregate runtime/test basis
contains both POLICY-03 and the frozen catalog slot correction; the subsequent
registry audit adds no runtime change. Bundled guidance remains
`0353965ea38ce3d963f123acb2f9a965bcbb98c3`. Individual FD/FC review bases remain
with their respective reviewed policy sources, which are ancestors of this merge.

Runtime files merged without conflicts. POLICY-03 package changes match its
original source; the inherited POLICY-04 correction matches its candidate source.
The three registry/history conflicts retain both policies and historical records.
This local inheritance passes package typecheck and diff checks; provider tests
are not repeated and the earlier 203-test/629-assertion POLICY-03 evidence is not
relabelled as a new merged-tree test run. POLICY-04 current-head review, CI and
formal main acceptance remain pending; this is neither publication nor compat
propagation.

## 2026-09-09 — POLICY-03 inherits final POLICY-04 format follow-up

Runtime/test snapshot `9ef178175cb4707fb63e54f9313f97ec7363664f` inherits PR #87 candidate
`32b01dcd828f692ea0656e53319cd48abf054c18`, including structured/text format
refresh and the mock provider system-tail contract. Source merges were clean.
Bundled guidance snapshot is `0353965ea38ce3d963f123acb2f9a965bcbb98c3`.
Publication remains ordered after the preceding policy is accepted on both branches;
this local inheritance is not evidence of remote acceptance.

### POLICY-03 accepted predecessor ancestry

Snapshot `f860c352f292d6d7aa0bf97cc282d4c3e5ef4fb4` inherits accepted POLICY-04 main
`69275c9cf4d772afe2167b82922e1dcebd9ab468` with a tree-identical merge.
The inherited-format package typecheck passed. POLICY-03 publication retains
its own exact-head CI and Codex review gates and waits for POLICY-04 compat acceptance.
