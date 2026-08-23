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
