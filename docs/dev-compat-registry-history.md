# dev/compat Registry History

This is the append-only audit ledger for inherited-`main`-to-`dev/compat`
reviews. New reviews append rows and details; they do not rewrite earlier
behavior references or decisions.

Pure registry/history commits may be recorded for traceability, but they are
never used as an inherited `main` or compat behavior review basis.

## Audit ledger

| Date | Accepted `main` tip | Main behavior | Compat behavior | Active DC | Changed-path total | Decision summary |
| --- | --- | --- | --- | ---: | --- | --- |
| 2026-08-24 | `060b3adb1373a802e301f5bafce225b90407ef49` | `edc2d123cbebfadc8fb7a8a18c4974def0fc2be5` | `f6abd31d57d3066a1924042670e3f59c26f8a0ca` | 7 | 47 paths; 3,643 insertions; 226 deletions | Retained approved private WebFetch and MCP reachability plus the existing platform, per-agent MaxMode, bounded-context, actor-context, and TUI metadata adaptations as compat-owned behavior. |
| 2026-08-24 | `fd5064df420d5c2dbe424ddaa020bb54655bef64` | `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8` | `d0d44b7df7af60fe9ef4df634d53f6c0782d0f2c` | 7 | 47 paths; 3,643 insertions; 226 deletions | Adopted the shared full IPv6 link-local classifier correction while retaining approved private WebFetch and MCP reachability plus all existing compat-owned platform, model, context, actor, and TUI adaptations. |
| 2026-08-25 | `98f1652bcab2038989f6e522fe41a2cb35b5e90f` | `413711ced1e60c408caefb10c585a2be8c4b5f01` | `166737181cff131961b0b84977afd230c556755b` | 7 | 47 paths; 3,643 insertions; 226 deletions | Adopted shared instance-disposal, runner, actor-notification, workflow-cleanup, and owned-worktree lifecycle hardening while retaining all seven compat-owned adaptations unchanged. |
| 2026-08-25 | `e65c86f341f2a5f15d375cc087e33b17037e36ca` | `1cfe7efc8f13da6157f30324c4eeac0111e99115` | `ca446d40348b62fe4174e34fe0cf5a311fa12c06` | 7 | 59 paths; 3,737 insertions; 228 deletions | Adopted the audited upstream recovery, turn-context, replayable nested-exec, bundled-skill, Desktop notification-card, and auto-worktree changes plus shared lifecycle corrections while preserving all seven compat-owned network, platform, model, context, actor, and TUI adaptations. |
| 2026-08-25 | `12b4bacedd3d0cb961578b29bfa7f613f6ac443f` | `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` | `bcbd16fc237a5b2c6f2800afe834830ad739aa01` | 7 | 58 paths; 3,593 insertions; 233 deletions | Inherited fixed instance cwd with inert SDK compatibility, centralized bounded retry, typed admission, and main-only recovery/resume publication while preserving all seven compat-owned network, platform, per-agent MaxMode, bounded-context, actor-context, and TUI adaptations. |
| 2026-08-27 | `45554bedf7fb7d041d16bbd6b8362ed2f54c56b7` | `d0acb856f1ec0edae6cce29ca44178af14d94293` | `268d5be1cd79e7da7c9f9cb6de5a65fed3c76e96` | 7 | 58 paths; 3,621 insertions; 257 deletions | Inherited the complete 13/13 shared transport, replace-agent, checkpoint, relative-path, title, skill, stable-memory, actor-context, and compaction audit while preserving all seven compat-owned adaptations and adding only evidence-backed fixture timeout headroom. |

## 2026-08-24 initial ownership review

- Accepted `origin/main` tip:
  `060b3adb1373a802e301f5bafce225b90407ef49`.
- Inherited main behavior from the shared history:
  `edc2d123cbebfadc8fb7a8a18c4974def0fc2be5`.
- Pre-documentation compat behavior:
  `f6abd31d57d3066a1924042670e3f59c26f8a0ca`.
- Active ownership result: DC-NET-001, DC-NET-002, DC-PLATFORM-001,
  DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001, and DC-TUI-001.
- Shared inheritance result: `AGENTS.md`, `docs/upstream-deviations.md`,
  `docs/fork-capabilities.md`, `docs/fork-registry-history.md`, and `bun.lock`
  are byte-identical to the accepted `origin/main` tree. FD-007 is absent from
  both active shared registries and survives only as DC-TUI-001's legacy ID.

### Changed-path calculation

The 47-path, 3,643-insertion, 226-deletion total compares the shared history's
current `main behavior` directly with the pre-documentation `compat behavior`.
It excludes all five registry/history tracking paths:

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
  edc2d123cbebfadc8fb7a8a18c4974def0fc2be5 \
  f6abd31d57d3066a1924042670e3f59c26f8a0ca -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  edc2d123cbebfadc8fb7a8a18c4974def0fc2be5 \
  f6abd31d57d3066a1924042670e3f59c26f8a0ca -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

### Complete changed-path ownership map

Each of the 47 changed paths is assigned below. A primary owner names the
registry entry that must lead review of the path; parenthetical owners identify
cross-cutting hunks. Historical/supporting Markdown is recorded as merge
history, not promoted into a capability. No formatting-only difference is
classified as a compatibility capability.

#### Merge history and supporting documentation — 4 paths

- `README.md` — supporting per-agent MaxMode prose inherited from compat
  history; not a capability owner.
- `README.zh.md` — supporting per-agent MaxMode prose inherited from compat
  history; not a capability owner.
- `docs/superpowers/plans/2026-07-22-actor-state-truncation-helper.md` —
  historical implementation plan; not an active contract.
- `docs/superpowers/specs/2026-07-22-actor-state-truncation-helper-design.md` —
  historical design; not an active contract.

#### DC-NET-001 — 2 paths

- `packages/opencode/src/tool/webfetch.ts`.
- `packages/opencode/test/tool/webfetch.test.ts`.

#### DC-NET-002 — 1 path

- `packages/opencode/test/mcp/lifecycle.test.ts`. Production
  `packages/opencode/src/mcp/index.ts` is unchanged and therefore is not in the
  changed-path universe.

#### DC-PLATFORM-001 — 4 paths

- `packages/opencode/src/file/ripgrep.ts`.
- `packages/opencode/src/util/archive.ts`.
- `packages/opencode/test/file/ripgrep.test.ts`.
- `packages/opencode/test/util/archive.test.ts`.

#### DC-MODEL-001 — 7 paths

- `packages/opencode/src/agent/agent.ts`.
- `packages/opencode/src/config/agent.ts`.
- `packages/opencode/src/session/max-mode.ts` (DC-CONTEXT-001 also owns its
  model-visible judge/input caps).
- `packages/opencode/test/session/max-mode-econnreset.test.ts`.
- `packages/opencode/test/session/max-mode.test.ts` (DC-CONTEXT-001 also owns
  cap/preflight cases).
- `packages/sdk/js/src/v2/gen/types.gen.ts`.
- `packages/sdk/openapi.json`.

#### DC-TUI-001 — 6 paths

- `packages/opencode/src/cli/cmd/tui/component/model-metadata.tsx`.
- `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx`.
- `packages/opencode/src/cli/cmd/tui/routes/session/subagent-footer.tsx`.
- `packages/opencode/src/cli/cmd/tui/util/model.ts`.
- `packages/opencode/test/cli/tui/model-metadata.test.tsx`.
- `packages/opencode/test/cli/tui/model.test.ts`.

#### DC-ACTOR-001 — 4 paths

- `packages/opencode/src/tool/actor.ts` (DC-CONTEXT-001 also owns its bounded
  serialization/truncation hunk).
- `packages/opencode/test/session/auto-overflow-writer-first.test.ts`.
- `packages/opencode/test/session/recall-reminder.test.ts`.
- `packages/opencode/test/tool/actor.test.ts` (DC-CONTEXT-001 also owns bounded
  actor-state cases).

#### DC-CONTEXT-001 — 19 paths

- `packages/opencode/src/inbox/render.ts`.
- `packages/opencode/src/session/classify.ts`.
- `packages/opencode/src/session/instruction.ts`.
- `packages/opencode/src/session/llm.ts`.
- `packages/opencode/src/session/message-v2.ts`.
- `packages/opencode/src/session/overflow.ts` (DC-ACTOR-001 also owns the
  static-prefix actor recovery boundary).
- `packages/opencode/src/session/prompt.ts` (DC-MODEL-001 and DC-ACTOR-001 also
  own their routing/context hunks).
- `packages/opencode/src/session/system.ts`.
- `packages/opencode/src/util/safe-stringify.ts`.
- `packages/opencode/src/util/text-truncate.ts` (DC-ACTOR-001 also owns the
  actor-state helper use).
- `packages/opencode/test/inbox/render.test.ts`.
- `packages/opencode/test/lib/llm-server.ts`.
- `packages/opencode/test/session/classify.test.ts`.
- `packages/opencode/test/session/instruction.test.ts`.
- `packages/opencode/test/session/message-v2.test.ts`.
- `packages/opencode/test/session/overflow.test.ts` (DC-ACTOR-001 also owns the
  `overflow-static` cases).
- `packages/opencode/test/session/prompt-effect.test.ts` (DC-MODEL-001 and
  DC-ACTOR-001 also own their routing/context cases).
- `packages/opencode/test/util/safe-stringify.test.ts`.
- `packages/opencode/test/util/text-truncate.test.ts` (DC-ACTOR-001 also owns
  actor-state cases).

### Decision notes

- DC-NET-001 removes only the WebFetch destination-classifier calls. It retains
  the shared HTTP(S), permission, redirect, timeout, size, and injectable-client
  boundaries.
- DC-NET-002 owns a testable guarantee, not a production fork. A future shared
  MCP private-address restriction requires an explicit compat decision.
- DC-PLATFORM-001 remains a compat adaptation and is not proposed for `main`.
- Per-agent MaxMode, bounded request content/preflight, full-context actor
  handling, and request metadata display remain environment/project
  adaptations rather than shared-policy claims.
- DC-TUI-001 records Legacy ID: FD-007 and both known `variant: none` limits;
  the shared FD/FC registries remain unchanged.

## 2026-08-24 shared SSRF correction propagation

- Accepted `origin/main` tip:
  `fd5064df420d5c2dbe424ddaa020bb54655bef64`.
- Inherited main behavior from the shared history:
  `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8`.
- Pre-documentation compat behavior:
  `d0d44b7df7af60fe9ef4df634d53f6c0782d0f2c`.
- Active ownership remains DC-NET-001, DC-NET-002, DC-PLATFORM-001,
  DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001, and DC-TUI-001.
- Shared inheritance result: `packages/opencode/src/util/ssrf.ts`,
  `packages/opencode/test/util/ssrf.test.ts`,
  `docs/upstream-deviations.md`, `docs/fork-capabilities.md`,
  `docs/fork-registry-history.md`, `bun.lock`, and
  `packages/opencode/src/mcp/index.ts` are byte-identical to the accepted
  `origin/main` tree.
- DC-NET-001 still removes exactly the `assertSafeUrl` import and its initial
  and redirect call sites from WebFetch. The inherited classifier and tests
  now cover the complete IPv6 link-local `fe80::/10` range, but compat
  WebFetch does not call that classifier; approved ordinary RFC1918 access
  remains unchanged.
- PR #66 review comment `discussion_r3839067435` identified that the prior
  textual `fe80:` check did not cover the full link-local range. Main behavior
  `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8` uses the first-hextet `/10`
  mask and adds direct `fe80`, `fe90`, `fea0`, and `febf` plus DNS-resolved
  `febf` regressions. This propagation inherits that source/test correction
  without broadening the compat WebFetch call seam.

### Corrected changed-path calculation

The 47-path, 3,643-insertion, 226-deletion total compares the corrected
inherited main behavior directly with the propagated pre-documentation compat
behavior. It excludes the same five registry/history tracking paths. The
complete ownership map remains identical to the initial review.

```bash
git diff --shortstat \
  e0389a146ad09a439bbb1009b5f01fc3cc63d7d8 \
  d0d44b7df7af60fe9ef4df634d53f6c0782d0f2c -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  e0389a146ad09a439bbb1009b5f01fc3cc63d7d8 \
  d0d44b7df7af60fe9ef4df634d53f6c0782d0f2c -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-08-25 shared lifecycle hardening propagation

- Accepted `origin/main` tip:
  `98f1652bcab2038989f6e522fe41a2cb35b5e90f`.
- Inherited main behavior:
  `413711ced1e60c408caefb10c585a2be8c4b5f01`.
- Pre-documentation compat behavior:
  `166737181cff131961b0b84977afd230c556755b`.
- Active ownership remains DC-NET-001, DC-NET-002, DC-PLATFORM-001,
  DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001, and DC-TUI-001.
- PR #68 adds shared instance-disposal, runner handoff, actor-notification,
  workflow cleanup, and owned child-worktree lifecycle hardening. It introduces
  no new compat-only capability.
- The only overlap with the compat delta is
  `packages/opencode/src/session/prompt.ts` and its
  `packages/opencode/test/session/prompt-effect.test.ts` coverage. The merged
  tree preserves both the shared disposal propagation and the compat MaxMode,
  bounded-context, and full-context actor paths.
- WebFetch private-network access, RFC1918 MCP reachability,
  restricted-network ripgrep/archive fallbacks, per-agent MaxMode, bounded
  request content, actor context, and TUI metadata contracts remain unchanged.
- The predicted and actual merge tree is
  `c325dadb34b0bf3be95accbaaf5dd5bd96022e91`; the compat delta remains 47
  paths, 3,643 insertions, and 226 deletions after excluding the five registry
  and history files.

## 2026-08-25 upstream synchronization propagation

- Accepted fork `main` tip:
  `e65c86f341f2a5f15d375cc087e33b17037e36ca`.
- Inherited main behavior:
  `1cfe7efc8f13da6157f30324c4eeac0111e99115`.
- Initial main-to-compat merge behavior:
  `d346cc168b10df75769f44e3a4a8cba9a4d44259`.
- Corrected pre-documentation compat behavior:
  `ca446d40348b62fe4174e34fe0cf5a311fa12c06`.
- Active ownership remains DC-NET-001, DC-NET-002, DC-PLATFORM-001,
  DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001, and DC-TUI-001.
- The inherited shared registry supplies the complete 10/10 capability
  inventory for audit range `AR-20260825`; every incoming capability has a
  canonical owner, disposition, and status evidence.
- DC-CONTEXT-001 preserves all UTF-8 caps, non-throwing serialization, active
  tool filtering, and overflow routing while counting the newly inherited
  current-turn context as an unshrinkable request component.
- DC-ACTOR-001 preserves fail-closed FD-009 admission and extends the inherited
  turn-context path with the parent's frozen `turnContext`; child live context
  cannot replace that captured membership.
- The compat delta grew from 47 to 59 paths. The 12 new paths are all
  DC-ACTOR-001 carriers or fixtures for the frozen `turnContext` shape:
  `packages/opencode/src/actor/spawn.ts`,
  `packages/opencode/src/session/checkpoint.ts`,
  `packages/opencode/src/session/prefix-capture-ref.ts`,
  `packages/opencode/src/tool/session.ts`,
  `packages/opencode/test/actor/cancel-notification.test.ts`,
  `packages/opencode/test/actor/spawn-notification.test.ts`,
  `packages/opencode/test/actor/spawn.test.ts`,
  `packages/opencode/test/inbox/fork-agent-compat.test.ts`,
  `packages/opencode/test/session/checkpoint-fork-mode.test.ts`,
  `packages/opencode/test/session/checkpoint-main-slice.test.ts`,
  `packages/opencode/test/session/checkpoint-prefix-capture-fixture.ts`, and
  `packages/opencode/test/session/classify-integration.test.ts`. No other DC
  owner count changed.
- DC-MODEL-001 remains integrated with the shared run-step path: per-agent
  MaxMode keeps its structured-output and final-step exclusions without writing
  subagent session status. The generated SDK retains both shared recovery/resume
  methods and compat-only `maxMode` fields.
- DC-NET-001, DC-NET-002, DC-PLATFORM-001, and DC-TUI-001 do not overlap the
  incoming range and remain unchanged. The shared Desktop notification cards
  do not replace the compat TUI metadata owner.
- Compat validation at the behavior tree completed 250 affected tests with
  2 documented skips and 0 failures, package typechecks, idempotent JavaScript
  SDK generation, and an independent frozen-context/patch-equivalence audit.

### Changed-path calculation

The 59-path, 3,737-insertion, 228-deletion total compares inherited main
behavior with the corrected pre-documentation compat behavior and excludes all
five shared/compat registry tracking paths:

```bash
git diff --shortstat \
  1cfe7efc8f13da6157f30324c4eeac0111e99115 \
  ca446d40348b62fe4174e34fe0cf5a311fa12c06 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  1cfe7efc8f13da6157f30324c4eeac0111e99115 \
  ca446d40348b62fe4174e34fe0cf5a311fa12c06 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-08-25 fixed-cwd and retry synchronization propagation

- Accepted fork `main` audit tip:
  `12b4bacedd3d0cb961578b29bfa7f613f6ac443f`.
- Inherited main behavior:
  `6ae30e66ab0ecbb526f85009d300e7c2533fe72c`.
- Prior compat tip: `19cad20c689eaa027db802cc942a374afa1b50bf`.
- Intermediate compat behavior:
  `79bfd1bdb62fe4eb61a26be8fe44c4abbc848f6d`, whose parents are the prior
  compat tip and intermediate main behavior `30d7d629`.
- Final compat behavior: `bcbd16fc237a5b2c6f2800afe834830ad739aa01`,
  whose parents are intermediate compat behavior `79bfd1bd` and final main
  behavior `6ae30e66`.
- Main-audit inheritance merge:
  `627d6641ac1d24eb1ff618cba1d471be4cf11eb6`, whose parents are final compat
  behavior `bcbd16fc` and accepted main audit tip `12b4bace`. This documentation
  merge does not advance either behavior reference.
- Active ownership remains DC-NET-001, DC-NET-002, DC-PLATFORM-001,
  DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001, and DC-TUI-001. No eighth
  compat-only owner was added.
- The shared `AR-20260825-R3` 9/9 capability inventory is inherited through the
  accepted main audit. Every shared capability keeps `canonical_owner=shared
  main`; this propagation changes only the recorded compat counterpart.

### Compat decisions

- DC-MODEL-001 retains per-agent MaxMode over the inherited bounded
  candidate/judge retry coordinator. Eligible subagents can execute MaxMode but
  cannot write session-global retry status or publish `RetryAttempt` events;
  structured-output and final-step exclusions remain intact.
- DC-CONTEXT-001 retains caps, non-throwing serialization, active-tool
  accounting, and request preflight around the inherited retry coordinator.
  It consumes the fixed `Instance.directory` and does not add a cwd setter,
  clear path, event publisher, TUI override, or `change_directory` tool.
- DC-ACTOR-001 retains frozen full-context membership and static-prefix
  overflow handling. Children keep the admitted instance cwd; the inherited
  `SessionCwd.Event.Changed` and generated `EventSessionCwd` remain inert SDK
  compatibility declarations rather than a live context or authority channel.
- DC-NET-001, DC-NET-002, DC-PLATFORM-001, and DC-TUI-001 preserve their prior
  call-seam, platform, and presentation contracts. None receives ownership of
  shared retry, fixed cwd, typed admission, or main-only recovery/resume.
- Harness validation used
  `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` as the compat baseline. Default-path
  invocations cleared ambient `MIMOCODE_EXPERIMENTAL`,
  `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and `MIMOCODE_CODEX_MODE`.

### Validation evidence

The broader intermediate matrix ran at `79bfd1bd`; it is not claimed as a full
rerun at the final compat SHA. Its six independently completed Bun test groups
were:

- message-v2, overflow, LLM retry, provider error, and processor Effect:
  153 pass, 2 skip, 0 fail;
- MaxMode unit and EConnReset integration: 23 pass, 0 skip, 0 fail;
- prompt Effect cases matching `MaxMode|maxMode|request preflight`: 11 pass,
  0 skip, 0 fail;
- actor tool, classifier integration, and fork-agent compatibility: 41 pass,
  0 skip, 0 fail;
- WebFetch, SSRF, MCP lifecycle, ripgrep, archive, and TUI model metadata:
  110 pass, 0 skip, 0 fail;
- agent, generated OpenAPI references, and TUI session-status store: 59 pass,
  0 skip, 0 fail.

The intermediate total is 397 pass, 2 documented skips, and 0 failures. Final
compat `bcbd16fc` then passed 3 focused regressions with 0 failures: published
OpenAPI recovery/resume remains main-only, subagent MaxMode retry cannot write
global status/events, and a full-context subagent uses the MaxMode
candidate/judge replay path. Package and SDK typecheck passed, and JavaScript
SDK generation was idempotent at the final compat behavior.

### Shared inheritance and changed-path calculation

At audit merge `627d6641`, `AGENTS.md`, `docs/upstream-deviations.md`,
`docs/fork-capabilities.md`, and `docs/fork-registry-history.md` are
byte-identical to accepted main tip `12b4bace`. The two compat registries remain
the branch-specific registry overlays.

The 58-path, 3,593-insertion, 233-deletion total compares final inherited main
behavior with final compat behavior and excludes all five shared/compat
registry tracking paths:

```bash
git diff --shortstat \
  6ae30e66ab0ecbb526f85009d300e7c2533fe72c \
  bcbd16fc237a5b2c6f2800afe834830ad739aa01 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  6ae30e66ab0ecbb526f85009d300e7c2533fe72c \
  bcbd16fc237a5b2c6f2800afe834830ad739aa01 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-08-27 title, stable-prefix, compaction, and actor-scope synchronization propagation

- Reviewed upstream: `6da12e0c98d9e2c4838896eac642c65179501f8e`.
- Accepted fork `main` audit tip:
  `45554bedf7fb7d041d16bbd6b8362ed2f54c56b7`.
- Inherited main behavior:
  `d0acb856f1ec0edae6cce29ca44178af14d94293`.
- Prior compat tip: `15415d9fad6041716b130baa849c80b0c62a33d1`.
- Compat behavior merge: `268d5be1cd79e7da7c9f9cb6de5a65fed3c76e96`,
  whose parents are the prior compat tip and main audit tree `4422d2bc`.
- Main-audit inheritance merge:
  `ee7442b8df4ca8017e9f288d9938f3581581cbfc`, whose parents are the compat
  behavior and accepted main audit tip. It carries documentation evidence only
  and does not advance either behavior reference.
- Active ownership remains DC-NET-001, DC-NET-002, DC-PLATFORM-001,
  DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001, and DC-TUI-001. No eighth
  compat-only owner was added.
- The inherited shared audit is complete at 13/13: the initial
  `AR-20260827` inventory contributes 12/12 rows and the
  `AR-20260827-R2` replace-agent actor-scope follow-up contributes 1/1. Every
  row retains `canonical_owner=shared main`; compat records only the reviewed
  counterpart and preserves its seven explicit overlays.

### Complete shared-capability disposition (13/13)

| # | Inherited capability | Compat overlap and disposition | Canonical owner | Status |
| ---: | --- | --- | --- | --- |
| 1 | MiMo transport, harness, and toolset identity | Inherit FD-005/FD-006 exactly; DC-MODEL-001 changes only per-agent MaxMode and does not let transport select harness/tools | shared main | adopted |
| 2 | Replace-agent SYSTEM role | Preserve DC-CONTEXT-001 preflight and DC-ACTOR-001 frozen system while using the shared provider-system role | shared main | adopted with compat bounds |
| 3 | Checkpoint writer defaults to fork mode | Preserve DC-ACTOR-001 full-context capture and the explicit `fork: false` writer-owned prefix | shared main | adopted with compat capture |
| 4 | Relative workspace paths | Resolve against fixed `Instance.directory`; DC-PLATFORM-001 remains an independent no-rg/archive fallback and DC-CONTEXT-001 adds no cwd mutator | shared main | adopted |
| 5 | Reliable multimodal title generation | Keep shared structured/fallback title behavior and ephemeral retry; DC-CONTEXT-001 bounds request content without giving the call session-global status | shared main | adopted with compat bounds |
| 6 | `/experimental/title` and JavaScript SDK | Regenerate from resolved source while retaining the independent compat `maxMode` schema fields | shared main | adopted |
| 7 | End-to-end `titleLocale` | Preserve locale through prompt/App submission; DC-TUI-001 continues to own provider/model/variant presentation only | shared main | adopted |
| 8 | Versioned skill-catalog snapshots | Retain immutable v2 hash snapshots and count/bound them under DC-CONTEXT-001 without rewriting prior history | shared main | adopted with compat bounds |
| 9 | Stable per-session memory paths | Retain `{current_session_id}` in frozen instructions and resolve only at filesystem-tool execution; DC-CONTEXT-001 counts the stable text | shared main | adapted exactly |
| 10 | Session/actor-scoped fork context | Retain the stronger shared generation/lifecycle implementation and layer DC-ACTOR-001 frozen full-context membership on it | shared main | adopted |
| 11 | `MIMOCODE_COMPACTION_MAX_CONTEXT` | Use the inherited effective window for DC-CONTEXT-001 request preflight and DC-ACTOR-001 static-prefix classification | shared main | adopted |
| 12 | Configurable compaction trigger ratio | Preserve `min(floor(effective * ratio), max(0, effective - reserved))`; compat preflight cannot consume reserved headroom | shared main | adapted exactly |
| 13 | Actor-scoped `replace-agent` base | Main/known non-system peer may inherit; subagent, system, ephemeral, and unknown actors fail closed while DC-ACTOR-001 preserves frozen custom systems | shared main | adapted exactly |

Inventory count is 13 and result-row count is 13. Each inherited capability
has a compat counterpart, canonical owner, disposition, and status; no incoming
capability remains unclassified and all seven active DC entries were reviewed.

### Compat validation evidence

Validation used the package-owned
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` preload baseline while clearing
ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and
`MIMOCODE_CODEX_MODE` for default-path invocations. The final behavior tree
completed:

- core title, prompt, skill, memory, compaction, checkpoint, retry, and
  replace-agent groups: 280 passed, 2 existing skips, 0 failures;
- network and platform sentinels: 138 passed, 0 failures;
- the initial content, actor, and TUI matrix: 215 passed, 1 existing todo, and
  1 timed-out failure when a `spawn-notification` integration fixture exceeded
  Bun's five-second outer timeout after its assertion completed;
- the exact timed fixture passed with evidence-accurate 15-second headroom, and
  the complete `spawn-notification` file then passed all 10 tests;
- supplemental provider, tool, cron, recovery, context, and system regressions,
  including generated-SDK resume serialization: 159 passed, 0 failures; App
  submission: 5 passed, 0 failures;
- all three selected package typechecks passed; targeted lint completed with
  0 errors and 90 warnings; JavaScript SDK regeneration was idempotent.

The timeout adjustment is a compat test-only adaptation in
`packages/opencode/test/actor/spawn-notification.test.ts`; it changes no runtime
behavior or assertion. The exact same fixture at prior compat tip `15415d9f`
also completed its assertions but took 6.215 seconds and therefore crossed
Bun's five-second default. The 15-second outer limit records measured fixture
headroom rather than reclassifying a product failure.

### Shared inheritance and changed-path calculation

At documentation merge `ee7442b8`, `docs/upstream-deviations.md`,
`docs/fork-capabilities.md`, and `docs/fork-registry-history.md` are
byte-identical to accepted main tip `45554bed`; `AGENTS.md` and `bun.lock` are
also unchanged. The two compat registries remain branch-specific overlays.

The propagation from prior compat tip to final compat behavior, excluding all
five registry/history paths, changes 72 paths with 2,981 insertions and 1,118
deletions. The current compat delta compares inherited main behavior directly
with compat behavior: 58 paths, 3,621 insertions, and 257 deletions, with every
path continuing to map to the same seven active owners or recorded supporting
history.

```bash
git diff --shortstat \
  15415d9fad6041716b130baa849c80b0c62a33d1 \
  268d5be1cd79e7da7c9f9cb6de5a65fed3c76e96 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --shortstat \
  d0acb856f1ec0edae6cce29ca44178af14d94293 \
  268d5be1cd79e7da7c9f9cb6de5a65fed3c76e96 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  d0acb856f1ec0edae6cce29ca44178af14d94293 \
  268d5be1cd79e7da7c9f9cb6de5a65fed3c76e96 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```
