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
