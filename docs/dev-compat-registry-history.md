# dev/compat Registry History

This is the append-only audit ledger for inherited-`main`-to-`dev/compat`
reviews. New reviews append rows and details; they do not rewrite earlier
behavior references or decisions.

Pure registry/history commits may be recorded for traceability, but they are
never used as an inherited `main` or compat behavior review basis.

## Audit ledger

| Date | Accepted `main` tip | Main behavior | Compat behavior | Active DC | Changed-path total | Decision summary |
| --- | --- | --- | --- | ---: | --- | --- |
| 2026-09-04 | `704e74184eaea02040497a3cc980aeeb99912e05` | `59d53d7fd356aec1e0891a11cb11a6972ce84d7d` | `3e207de425621f660a249c074158d1d1564204f5` | 7 | 94 paths; 13,309 insertions; 2,005 deletions | Inherited PR #74's complete closing-run handoff, task binding, parent-linked classification, and atomic derived-user admission while preserving all seven compat owners and adding no runner state. |
| 2026-09-03 | `65a31144e14849ee2432001bd62bc7902f2c6f29` | `96d00e06ad1640a80f70c9eda1ed10e62ed5ab79` | `560de61b663a159771b53b05e826dc2cc91675ac` | 7 | 94 paths; 12,938 insertions; 1,662 deletions | Inherited PR #73's `prompt_async` persistence-before-join correction and 204/400/404 public contract while preserving all seven compat owners. |
| 2026-09-02 | `3ec8a8534ad4481c73f1946c966daf3a846cc29f` | `f1e2ba0019ee6ac13c2608474ae9237865b742f2` | `4130f181f86477f91245f42e8670d0c84203bcde` | 7 | 92 paths; 10,031 insertions; 1,662 deletions | Inherited the complete 2/2 WebSearch-model and session-ID audit without a compat fork; preserved request-scoped model flow, opaque legacy/new session keys, message chronology, and all seven DC owners with 112 focused passes. |
| 2026-09-02 | `3a2b6c88fd50d460199d8b5b2721413d164ecba9` | `dad492e0af72d22d3ec796f6814eda7e52ed51a8` | `6c2fe63ad3d08d3eed4d5dfc44bab3aa934e559e` | 7 | 92 paths; 10,031 insertions; 1,662 deletions | Inherited the complete 4/4 published projection, harness-description, compaction-description, and 0.1.14 release audit; regenerated compat artifacts, preserved all seven DC owners, and retained checkpoint/callable-SDK coverage. |
| 2026-09-02 | `28c1f36c8a3bc85bda7e3691960e7d0b531b8636` | `7bfe6ac48e0db40b2b0b42c00b05a35032fcc113` | `c8b02aeb991c37e570799bdd3696e276aa35ba77` | 7 | 92 paths; 10,085 insertions; 1,664 deletions | Inherited the complete 4/4 default-model, Compose Next, and voice audit plus FC-016; semantically resolved the Prompt conflict so shared owner/drain/grapheme behavior and compat provider/model/variant metadata both survive, with all seven DC owners unchanged. |
| 2026-09-01 | `c9bdea878aa289f427c4bfbe798411d4907df600` | `4866d01f754429e3782f60983311c24468a9949a` | `17f24827b310d8e9b64d495370ca6ec63f28242c` | 7 | 92 paths; 10,085 insertions; 1,664 deletions | Propagated the complete 2/2 freshly fetched upstream range, adopted action-oriented prompt guidance, subsumed the weaker upstream Codex result into FD-005's stronger resolver, and preserved all seven compat owners with 71 named overlap sentinels. |
| 2026-09-01 | `c6a2f5f3c8cd0851b36049da5176e2ee7fb81d05` | `0899a4802dd65c1ca98e68722a7ee0c017e5cb7c` | `c594bb92ff5a11063c5e22936964ceae088e1d43` | 7 | 92 paths; 10,085 insertions; 1,664 deletions | Inherited the complete 2/2 Codex-mode specified change, retained all seven compat owners, and revalidated per-agent MaxMode, bounded preflight, frozen full-context actors, and compat-generated contracts without selecting the unrelated upstream prompt guidance. |
| 2026-09-01 | `c3fd051a27585a3e2a04124e00ce0439b27130e6` | `c63ae51911f8455fd1cc8defcc4a0a2e827889e2` | `43bc1048b0bc16ff17d715ee9cb756d2c1cc319f` | 7 | 92 paths; 10,085 insertions; 1,664 deletions | Inherited the complete 1/1 OAuth-branding audit, adopted the shared MiMoCode callback and dynamic-registration identity unchanged, and re-reviewed all seven compat owners; only DC-NET-002 had subsystem adjacency, without a production fork or an OAuth-interoperability claim. |
| 2026-08-24 | `060b3adb1373a802e301f5bafce225b90407ef49` | `edc2d123cbebfadc8fb7a8a18c4974def0fc2be5` | `f6abd31d57d3066a1924042670e3f59c26f8a0ca` | 7 | 47 paths; 3,643 insertions; 226 deletions | Retained approved private WebFetch and MCP reachability plus the existing platform, per-agent MaxMode, bounded-context, actor-context, and TUI metadata adaptations as compat-owned behavior. |
| 2026-08-24 | `fd5064df420d5c2dbe424ddaa020bb54655bef64` | `e0389a146ad09a439bbb1009b5f01fc3cc63d7d8` | `d0d44b7df7af60fe9ef4df634d53f6c0782d0f2c` | 7 | 47 paths; 3,643 insertions; 226 deletions | Adopted the shared full IPv6 link-local classifier correction while retaining approved private WebFetch and MCP reachability plus all existing compat-owned platform, model, context, actor, and TUI adaptations. |
| 2026-08-25 | `98f1652bcab2038989f6e522fe41a2cb35b5e90f` | `413711ced1e60c408caefb10c585a2be8c4b5f01` | `166737181cff131961b0b84977afd230c556755b` | 7 | 47 paths; 3,643 insertions; 226 deletions | Adopted shared instance-disposal, runner, actor-notification, workflow-cleanup, and owned-worktree lifecycle hardening while retaining all seven compat-owned adaptations unchanged. |
| 2026-08-25 | `e65c86f341f2a5f15d375cc087e33b17037e36ca` | `1cfe7efc8f13da6157f30324c4eeac0111e99115` | `ca446d40348b62fe4174e34fe0cf5a311fa12c06` | 7 | 59 paths; 3,737 insertions; 228 deletions | Adopted the audited upstream recovery, turn-context, replayable nested-exec, bundled-skill, Desktop notification-card, and auto-worktree changes plus shared lifecycle corrections while preserving all seven compat-owned network, platform, model, context, actor, and TUI adaptations. |
| 2026-08-25 | `12b4bacedd3d0cb961578b29bfa7f613f6ac443f` | `6ae30e66ab0ecbb526f85009d300e7c2533fe72c` | `bcbd16fc237a5b2c6f2800afe834830ad739aa01` | 7 | 58 paths; 3,593 insertions; 233 deletions | Inherited fixed instance cwd with inert SDK compatibility, centralized bounded retry, typed admission, and main-only recovery/resume publication while preserving all seven compat-owned network, platform, per-agent MaxMode, bounded-context, actor-context, and TUI adaptations. |
| 2026-08-27 | `45554bedf7fb7d041d16bbd6b8362ed2f54c56b7` | `d0acb856f1ec0edae6cce29ca44178af14d94293` | `268d5be1cd79e7da7c9f9cb6de5a65fed3c76e96` | 7 | 58 paths; 3,621 insertions; 257 deletions | Inherited the complete 13/13 shared transport, replace-agent, checkpoint, relative-path, title, skill, stable-memory, actor-context, and compaction audit while preserving all seven compat-owned adaptations and adding only evidence-backed fixture timeout headroom. |
| 2026-08-28 | `cce5b8383ce812d608254dc4deecf672e2795773` | `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57` | `710a5ffb8aa9b7dedc63789759b4d995d587f5d1` | 7 | 58 paths; 3,621 insertions; 257 deletions | Inherited the complete 3/3 actor-follow-up, PPTX-sourcing, and overflow-fixture audit; preserved all seven compat owners, including bounded actor state/turn context and deterministic reserve-safe overflow evidence on the two overlapping owners. |
| 2026-09-01 | `ed33097a961c9d915b00b2bbb2ebaf23e7ad2288` | `2b4c6569ac308fa6a6662c2c044059893748e0ad` | `2c8e74968322005cec4d9a3e3dcccc634ca711c9` | 7 | 87 paths; 9,411 insertions; 1,498 deletions | Inherited the complete 18/18 shared audit, retained all seven compat owners, and corrected shared lifecycle, chronology, checkpoint-coverage, compaction-admission, and TUI projection behavior at compat seams without creating a new compat capability owner. |
| 2026-09-01 | `ed33097a961c9d915b00b2bbb2ebaf23e7ad2288` | `2b4c6569ac308fa6a6662c2c044059893748e0ad` | `f1175ce9d6a7f82045b3910e0f1db5eb686924d0` | 7 | 92 paths; 10,085 insertions; 1,664 deletions | Superseded the earlier same-day basis after exact-SHA CI reproduced the checkpoint coverage-seam P1 twice; reconstructed logical tails, published the checkpoint OpenAPI contract, and made all 141 published samples callable through SDK v2 without changing the 18/18 shared or 7/7 compat ownership result. |

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

## 2026-08-28 actor follow-up, PPTX sourcing, and overflow-fixture propagation

- Reviewed upstream: `35bb2636a99b457940f1c12f2c8f5ec554369c57`.
- Accepted fork `main` audit tip:
  `cce5b8383ce812d608254dc4deecf672e2795773`.
- Inherited main behavior:
  `64b4bdda6829ca697cecf4cf79eeec6a35ec2e57`.
- Prior compat tip: `a0b90a4cbf995d6457b8bf0e8ce5cd18275cfbef`.
- Compat behavior and main-audit inheritance merge:
  `710a5ffb8aa9b7dedc63789759b4d995d587f5d1`, whose parents are the prior
  compat tip and accepted main audit tip. This single merge carries both the
  shared behavior and its audit documentation.
- Propagation excluding all five registry/history paths changes 9 paths with
  284 insertions and 97 deletions. The current compat delta remains 58 paths,
  3,621 insertions, and 257 deletions relative to inherited main behavior.
- Active ownership remains DC-NET-001, DC-NET-002, DC-PLATFORM-001,
  DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001, and DC-TUI-001. No owner was
  added, retired, or silently transferred to compat.

### Complete shared-capability disposition (3/3)

| # | Inherited capability | Compat overlap and disposition | Canonical owner | Status |
| ---: | --- | --- | --- | --- |
| 1 | Actor follow-up contract | Adopt shared spawn/run `actor_id` rejection and `send` follow-up; preserve DC-ACTOR-001 frozen full-context/turn context and DC-CONTEXT-001 UTF-8-safe state cap; completed ephemeral full-context actors still fail closed | shared main | adapted with compat bounds |
| 2 | PPTX image sourcing | Inherit the corrected bundled guidance and shipped-content regression byte-for-byte; no active DC owns or alters the bundled skill | shared main | adopted exactly |
| 3 | Auto-overflow fixture isolation | Preserve the inherited empty checkpoint ladder, 25K reserve sentinel, and composed trigger formula while retaining compat's deterministic prompt, empty tool allowlist, and first-call assertion | shared main | adapted with compat fixture hardening |

Inventory count is 3 and result-row count is 3. Every shared capability keeps
`canonical_owner=shared main`, has a reviewed compat counterpart and disposition,
and is covered by final behavior-tree evidence.

### Active compat-owner review (7/7)

| Owner | Incoming relationship | Reviewed disposition | Final evidence |
| --- | --- | --- | --- |
| DC-NET-001 | no overlap | Preserve approved private WebFetch call-seam override; do not claim shared SSRF policy for Bash/curl | WebFetch/SSRF sentinels passed |
| DC-NET-002 | no overlap | Preserve test-backed RFC1918 remote MCP reachability without forking MCP lifecycle production code | MCP lifecycle sentinels passed |
| DC-PLATFORM-001 | no overlap | Preserve fail-closed no-rg and Windows archive adaptations under fixed cwd | ripgrep/archive sentinels passed |
| DC-MODEL-001 | no overlap | Preserve per-agent MaxMode, structured/final-step exclusions, and subagent status isolation | MaxMode and prompt-effect matrix passed |
| DC-CONTEXT-001 | direct semantic overlap | Compose the shared reserve-safe fixture with compat request preflight, bounded actor state, deterministic prompt/tool set, and first-call assertion | overflow/message/prompt matrix passed |
| DC-ACTOR-001 | direct path and contract overlap | Remove fake spawn/run resume while retaining frozen system/tools/MCP/permissions/turn context, bounded state, and static-prefix fail-closed behavior | actor/inbox/checkpoint matrix passed |
| DC-TUI-001 | no overlap | Preserve provider/model/variant truth and locale-adjacent presentation without taking ownership of shared title behavior | TUI model sentinels passed |

Owner count is 7 and result-row count is 7. The only incoming path overlap was
routed through DC-CONTEXT-001 and DC-ACTOR-001; clean merges on the other five
owners were still reviewed against their active registry contracts.

### Compat validation evidence

Validation used the package-owned
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` preload baseline while clearing
ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`,
`MIMOCODE_CODEX_MODE`, compaction selector variables, and the checkpoint-disable
selector from default-path invocations. The final behavior tree completed:

- actor, inbox, lifecycle, overflow, and auto-overflow: 223 passed, 0 failed;
- request preflight, MaxMode, message replay, checkpoint, and replace-agent:
  169 passed, 2 existing explicit skips, 0 failed;
- WebFetch, SSRF, MCP, platform, and TUI owner sentinels: 110 passed, 0 failed;
- bundled PPTX and skill contracts: 18 passed, 0 failed.

The final total is 520 passed, 2 existing explicit skips, and 0 failures.
`packages/opencode` and `packages/sdk/js` typechecks passed. Targeted lint on
all six changed TypeScript files completed with 0 errors and 37 warnings;
whitespace checks passed. `bun ci` completed from the frozen lockfile,
`bun.lock` and tracked manifests remain byte-identical to accepted main, and
SDK regeneration was not applicable because no source schema or generator input
changed.

### Shared inheritance and changed-path calculation

At behavior merge `710a5ffb`, the three shared registries, bundled PPTX skill,
its shipped-content regression, `AGENTS.md`, and `bun.lock` are byte-identical
to accepted main tip `cce5b838`. The two compat registries remain the only
branch-specific audit overlays.

```bash
git diff --shortstat \
  a0b90a4cbf995d6457b8bf0e8ce5cd18275cfbef \
  710a5ffb8aa9b7dedc63789759b4d995d587f5d1 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --shortstat \
  64b4bdda6829ca697cecf4cf79eeec6a35ec2e57 \
  710a5ffb8aa9b7dedc63789759b4d995d587f5d1 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --name-only \
  64b4bdda6829ca697cecf4cf79eeec6a35ec2e57 \
  710a5ffb8aa9b7dedc63789759b4d995d587f5d1 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-09-01 prefix, projection, recovery, and CI synchronization propagation

- Reviewed upstream:
  `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`.
- Accepted fork `main` audit tip:
  `ed33097a961c9d915b00b2bbb2ebaf23e7ad2288`.
- Inherited main behavior:
  `2b4c6569ac308fa6a6662c2c044059893748e0ad`.
- Prior compat tip: `d3ef2e08c5a5317d264631a929025f3f69af75c7`.
- Initial compat integration merge:
  `2d9d8e755ccf5c53c5883257070b83667ec1462d`, whose parents are prior compat
  `d3ef2e08c5a5317d264631a929025f3f69af75c7` and accepted main
  `ed33097a961c9d915b00b2bbb2ebaf23e7ad2288`.
- Final compat behavior follow-up:
  `2c8e74968322005cec4d9a3e3dcccc634ca711c9`, based on the integration merge.
- Main-audit inheritance merge remains
  `2d9d8e755ccf5c53c5883257070b83667ec1462d`. It carries the accepted shared
  audit and the initial reconciled compat behavior; the final behavior is the
  follow-up above.
- Active ownership remains DC-NET-001, DC-NET-002, DC-PLATFORM-001,
  DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001, and DC-TUI-001. No owner was
  added, retired, or transferred away from compat.
- The `2c8e7496` follow-up corrects shared FC-001, FC-002, and FC-015 at compat
  context, actor, server, and TUI seams. Atomic admission, global revert, and
  checkpoint-coverage projection therefore remain shared-contract corrections,
  not new persistent `dev/compat` capability owners.

### Complete shared-capability disposition (18/18)

| # | Inherited capability | Compat overlap and disposition | Canonical owner | Status |
| ---: | --- | --- | --- | --- |
| 1 | Local MCP stdio-exit diagnostics | Adopt bounded/redacted natural-exit diagnostics; DC-NET-002 remains limited to remote RFC1918 reachability | shared main | adopted with compat sentinel |
| 2 | Ask-timeout test isolation | Adopt per-test environment acquire/release without changing permission semantics | shared main | adopted exactly |
| 3 | Default-off Auto-Worktree notices | Adopt post-mutation, primary-root, once-per-session notices; keep DC-PLATFORM-001 fallbacks independent | shared main | adopted with platform bounds |
| 4 | Same-session subagent permission inheritance | Adopt only for admitted subagents; preserve peer fail-closed behavior and DC-ACTOR-001 lifecycle scope | shared main | adapted with actor bounds |
| 5 | Stable path-hash test sharding | Adopt TS/TSX discovery, dedicated stdio isolation, and strict fresh JUnit completeness for `main`, `dev`, and `dev/compat` | shared main | adapted exactly |
| 6 | Checkpoint tail digest | Adopt request-only tail collapse and persisted `digestUpTo`; use exact chronological intervals, expose authoritative checkpoint coverage independently of the newest-100 page, retain physical history, cap final model-visible digest text at 50 KiB, and preserve DC context/actor boundaries | shared main | adopted with compat bounds |
| 7 | Errored-assistant recovery | Adopt recoverable errored candidates plus explicit abandonment cleanup; preserve actor-slice isolation | shared main | adapted with lifecycle bounds |
| 8 | Opt-in loop-streak recovery | Adopt default-off whole-assistant request cropping, persisted provenance, and later-request replay | shared main | adopted with context bounds |
| 9 | Instruction files independent of dynamic environment | Keep instructions on by default across normal, MaxMode, and capture paths; disabling them also suppresses `InstructionsLoaded` | shared main | adapted exactly |
| 10 | Prediction-context extraction | Adopt recent-real-user plus last-assistant context, exclude synthetic catalog/skill bodies, strip media, and retain DC-CONTEXT-001 caps | shared main | adopted with compat bounds |
| 11 | Versioned skill-catalog semantics | Reject system-tail placement; retain complete permission-filtered, hash-versioned user-part snapshots without rewriting history | shared main | upstream placement rejected; fork contract retained |
| 12 | Persistent request-prefix snapshots | Store the authorized searchable tool/MCP pool separately from wire-active and loaded-MCP membership; hash the complete snapshot, restore the full pool for capture, and restore only active tools for compaction | shared main | adopted and adapted |
| 13 | Build-time Bun path pinning | Adopt the validated Bun executable for dependency installation and reject ancestor-bin hijacking | shared main | adopted exactly |
| 14 | Compaction summary and projection | Keep summary, manifest, complete arrived rounds, and `min(40K, usable-fixed)` optional-tail budget; external user/spawn arrivals remain mandatory beyond that optional budget, and admission handoff suppresses a stale continuation only after the replacement request commits successfully | shared main | adopted with reserve-safe bounds |
| 15 | Compaction reuses frozen prefix | Adopt exact frozen system/tool-schema bytes and active membership; preserve compat model/context accounting | shared main | adopted with compat bounds |
| 16 | Compaction tool-use policy | Reject upstream automatic tool execution; retain frozen schemas for prefix stability while enforcing `toolChoice: "none"` | shared main | upstream behavior rejected |
| 17 | Implicit LLM-server advertisement | Reject implicit listener/base-URL publication; FD-004's explicit-listener boundary remains authoritative | shared main | upstream behavior rejected |
| 18 | Node-target MiMoCode version | Adopt the source-derived version define and verify the built module under plain Node | shared main | adopted exactly |

Inventory count is 18 and result-row count is 18. Every shared capability has
a reviewed compat counterpart, canonical owner, disposition, and final status
evidence; no incoming capability remains unclassified.

### Active compat-owner review (7/7)

| Owner | Incoming relationship | Reviewed disposition | Final evidence |
| --- | --- | --- | --- |
| DC-NET-001 | no direct overlap | Preserve approved private WebFetch after-permission call seam; shared SSRF utilities remain inherited | WebFetch and SSRF sentinels passed |
| DC-NET-002 | complementary MCP overlap | Adopt local stdio diagnostics while preserving mocked RFC1918 remote client creation and avoiding a private-address production fork | lifecycle plus isolated stdio regressions passed |
| DC-PLATFORM-001 | complementary Auto-Worktree/build overlap | Preserve fail-closed no-rg and Windows archive fallbacks under fixed cwd; shared mutation detection does not broaden fallback authority | ripgrep, archive, and Auto-Worktree matrices passed |
| DC-MODEL-001 | direct prefix/instruction/compaction overlap | Preserve per-agent MaxMode, structured/final-step exclusions, per-agent status isolation, and final `toolChoice: "none"` | MaxMode and prompt-effect matrices passed |
| DC-CONTEXT-001 | direct semantic overlap | Compose caps and preflight with versioned user-side skills, frozen prefix membership, reserve-safe projection, atomic external admission, exact chronology, positional checkpoint coverage, global revert/redo, recovery episodes, and mandatory arrived-user projection | context, coverage, projection, revert, recovery, and mutation sentinels passed |
| DC-ACTOR-001 | direct permission/prefix overlap | Preserve frozen system, tools, searchable MCP pool, active/loaded subsets, permissions, turn context, bounded state, actor-scope admission and handoff, and unrecoverable-prefix failure | actor, permission, prefix-capture, admission, fork, and compaction matrices passed |
| DC-TUI-001 | adjacent TUI runtime overlap | Preserve provider/model/variant truth, locale submission, and known-limit disclosure; checkpoint-context and global revert/redo changes do not transfer metadata presentation ownership | TUI metadata and adjacent context/revert sentinels passed |

Owner count is 7 and result-row count is 7. Cleanly merging owners were reviewed
alongside direct overlaps; no compat-only invariant was silently replaced by
the inherited tree.

### Race, projection, and overflow evidence

- DC-CONTEXT-001 closes the pre-persistence admission race. A deterministic
  regression admits a direct `noReply` request, holds it inside MCP
  `readResource` before its message is durable, completes the held compaction
  summary, and proves no stale continuation hook remains. The persisted request
  is the final user after release. Removing the pending-admission guard makes
  this regression RED by leaving one stale continuation hook.
- External user admission now commits the user message and all parts in one
  immediate transaction, validates ownership, preserves canonical exact retry,
  rejects ID collisions, and assigns actor-local monotonic creation time.
  Compaction waits on each same-actor admission token: a successful replacement
  suppresses the stale continuation, while a failed admission resumes the
  original request.
- Every affected history consumer uses `(time.created, id)` with the ID ordered
  by SQLite BINARY/UTF-8 bytes. U+E000 and U+10000 regressions bind the result
  against JavaScript's opposite UTF-16 ordering. Forking, classification,
  checkpoint activity, tail collapse, and revert cleanup use exact positions;
  missing or reversed tail endpoints fail closed.
- TUI undo/redo resolves the global chronological suffix, paginates until its
  boundary is found or the source is exhausted, and blocks when the boundary is
  absent. Event upsert/removal, part cleanup, and the 100-message cap share the
  same canonical ordering.
- Checkpoint context uses a separate authoritative coverage projection rather
  than pinning a backdated marker in the newest-100 message window. Cold sync,
  live provisional coverage, response sequencing, unresolved-watermark
  fail-closed state, session/part deletion, and directory switching are covered
  independently.
- Projection treats newly arrived `source=user` and `source=spawn` requests as
  mandatory even when the optional tail budget is zero; synthetic
  `source=hook` continuation is not mandatory. This preserves external work
  before the next request preflight can make a fail-closed size decision.
- The oversized-arrival regression retains both the beginning and ending
  markers of an approximately 400 KiB external request. It remains in the
  recovery floor and terminates as `overflow-static` without projecting the
  request away or starting an unbounded additional recovery cycle.
- Prefix regressions bind the full authorized searchable MCP catalog, the
  wire-active subset, and the loaded subset independently. Full-context capture
  can search a previously unloaded authorized MCP tool, while compaction sends
  only the frozen wire-active subset with `toolChoice: "none"`.
- A plain-Node HTTP boundary smoke on Node v24.16.0 and
  `node:sqlite MAX_VARIABLE_NUMBER=32766` reproduced the old unbounded `IN`
  limit: 32,764 IDs / 32,766 parameters prepared, while 32,765 IDs / 32,767
  parameters failed with `too many SQL variables`. The final fixed-parameter
  watermark self-join resolved 32,765 checkpoints and 32,765 distinct
  watermarks across 65,530 messages with HTTP 200, 32,765 returned/all resolved,
  exact first/last assertions, and 1,125 ms request-plus-parse time. Ordering is
  performed afterward with `compareUtf8Bytes`, avoiding the Node planner's
  quadratic joined-row `ORDER BY` path.

### Compat validation evidence

- The final four stable hash shards produced strict JUnit evidence for 5,701
  executed tests, 41 skipped/todo tests, and zero failures. The isolated stdio
  process independently passed all 6 tests under the same report contract, for
  a combined 5,707 executed tests.
- All selected package typechecks and migration verification passed. Root lint
  completed with 0 errors and 4,315 warnings.
- The fresh OpenAPI input hash was
  `11702c3c1632b02471f8d8be6bf60a660dec9b1a518546fc886c6f2f651f8db2`.
  JavaScript SDK generation completed twice with identical output hashes:
  `sdk.gen.ts=809d4cf45dd3d4afe2c15d2daa50adfa269ddd90a6d6e1ffbe8cae2025c08491`
  and `types.gen.ts=6f68358e140afbfab5cd38e9a505d2981e95db353d0d2da072d37400c065edf8`.
  `bun ci` used the frozen lockfile and changed no tracked lockfile, manifest,
  or generated output.
- The build-node artifact imported successfully under plain Node and contained
  source-derived version
  `0.0.0-codex/sync-upstream-20260901-compat-2c8e7496`; its bundle SHA-256 is
  `513dc9013e172180172ae722e7ad740a47f660ca0cadfc4a66a6b4babf3ad0fc`.
  The current-platform native build passed its smoke test with version `local`.
- Focused stdio, permission, Auto-Worktree, checkpoint/digest, recovery,
  loop-streak, instruction, prediction, skill, prefix, compaction, overflow,
  MaxMode, actor, chronology, admission, revert, checkpoint-coverage, platform,
  network, and TUI matrices passed. Admission, positional-range, Unicode-order,
  stale-response, unresolved-watermark, live-provisional, and actual-part guard
  mutations produced the expected RED before restored production guards
  returned their regressions to green.

### Shared inheritance and changed-path calculation

Propagation from prior compat to final behavior, excluding all five
registry/history paths, changes 92 paths with 11,994 insertions and 1,336
deletions. The final compat delta relative to inherited main behavior is 87
paths with 9,411 insertions and 1,498 deletions. The post-integration behavior
follow-up alone changes 32 paths with 3,074 insertions and 283 deletions.

`AGENTS.md`, `docs/upstream-deviations.md`, `docs/fork-capabilities.md`,
`docs/fork-registry-history.md`, and `bun.lock` are byte-identical between the
accepted `main` tip and final compat behavior.

```bash
git diff --shortstat \
  d3ef2e08c5a5317d264631a929025f3f69af75c7 \
  2c8e74968322005cec4d9a3e3dcccc634ca711c9 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --shortstat \
  2b4c6569ac308fa6a6662c2c044059893748e0ad \
  2c8e74968322005cec4d9a3e3dcccc634ca711c9 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-09-01 post-CI checkpoint coverage and published-SDK correction

- Reviewed upstream:
  `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`.
- Accepted fork `main` audit tip:
  `ed33097a961c9d915b00b2bbb2ebaf23e7ad2288`.
- Inherited main behavior:
  `2b4c6569ac308fa6a6662c2c044059893748e0ad`.
- Prior compat tip:
  `d3ef2e08c5a5317d264631a929025f3f69af75c7`.
- Superseded compat behavior basis:
  `2c8e74968322005cec4d9a3e3dcccc634ca711c9`.
- Documentation snapshot whose exact-SHA CI exposed the regression:
  `57c1e8a66851fe8f8058185af77988e2b1534462`.
- Corrective behavior sequence:
  - `26e2aac36f50afca70e1ba193624bd163a8c4b6c` reconstructs checkpoint
    tails from persisted coverage seams.
  - `fcfe7a4f5049e77df96dcc79977a4f04e76d561e` republishes the checkpoint
    coverage OpenAPI route and schemas.
  - `afc76301bcc30076525c8103275f3c80635c6079` guards the generated and
    published checkpoint contract.
  - `f1175ce9d6a7f82045b3910e0f1db5eb686924d0` targets every published
    code sample at the callable v2 SDK surface.
- Final compat behavior:
  `f1175ce9d6a7f82045b3910e0f1db5eb686924d0`.
- Main-audit inheritance merge remains
  `2d9d8e755ccf5c53c5883257070b83667ec1462d`.
- The complete inherited shared-capability disposition remains 18/18. Active
  compat ownership remains DC-NET-001, DC-NET-002, DC-PLATFORM-001,
  DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001, and DC-TUI-001: 7/7, with no
  owner added, retired, or transferred.

### Exact-SHA failure and coverage-seam correction

The `test` workflow run `33457418977` failed at exact SHA `57c1e8a6` on both
attempt 1 and the same-SHA rerun. Both failures were `unit (shard 1/4)`:
job `99700245518` on attempt 1 and job `99702155504` on attempt 2. Both stopped
at `request preflight stops when recovery makes no progress`: the regression
expected assistant `finish: "error"` but observed `finish: "stop"`. The exact-SHA
lint run `33457419002` and typecheck run `33457418957` were green, which did not
override the repeated behavioral failure.

The marker created by `insertRebuildBoundary` is backdated to
`boundaryCreatedAt + 1` while receiving a new ascending ID. Under canonical
`(time.created, id)` ordering, it can therefore sort after an already-persisted
same-timestamp live user. The old newest-first filter encountered that marker
first and stopped, silently removing the active turn and allowing recovery to
terminate with the wrong outcome.

The deterministic pre-fix reproduction quantized `Date.now()` while preserving
the normal default-path environment:

```bash
env -u MIMOCODE_EXPERIMENTAL \
  -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
  -u MIMOCODE_CODEX_MODE \
  bun test \
  --preload <(printf '%s\n' \
    'const realDateNow = Date.now.bind(Date); Date.now = () => Math.floor(realDateNow() / 100) * 100') \
  test/session/prompt-effect.test.ts \
  -t 'recovery makes no progress' \
  --timeout 120000
```

The correction treats `coveredUpTo` as the logical seam. It continues across
stream pages until that exact message is found, moves the active marker to the
logical beginning, preserves canonical order for all non-boundary tail
messages, and removes only superseded context boundaries. Legacy checkpoint
parts without `source` use the same seam. Missing or reversed coverage fails
closed to the complete observed history rather than trimming user work.
Regressions cover same-time marker ordering, exact assistant-tail collapse,
legacy markers, repeated same-watermark rebuilds, missing/reversed seams, and a
tail spanning the 50-message stream page.

### Published OpenAPI and callable SDK evidence

The runtime OpenAPI contained the checkpoint coverage route, but the checked-in
`packages/sdk/openapi.json` omitted
`/session/{sessionID}/checkpoint-coverage`, `CheckpointCoverage`, and
`CompactionPart.projection`. The republished artifact now carries all three, and
the regression compares both the generated document and checked-in artifact.

The previous generator imported the legacy package root and emitted literal
operation IDs. That produced stale targets for underscore operation IDs instead
of the camel-cased v2 client members. The final generator imports
`@mimo-ai/sdk/v2` and converts underscore segments before emitting the member
path. The guard requires generated and published operation-ID sets to be
identical, requires each published sample to equal the generator output, and
resolves its target on a real v2 client object. The final artifact contains
141 operations, 141 samples, 141 unique callable targets, and zero missing
targets.

These are shared checkpoint/publication corrections at compat seams. They
strengthen FC-002/FC-015 and the generated SDK evidence without creating a new
`dev/compat` capability owner.

### Final compat validation evidence

- Frozen dependency installation completed with 2,311 installs across 2,580
  packages; tracked manifests, `bun.lock`, and generated outputs remained
  unchanged.
- Four stable hash shards produced 5,708 executed tests, 41 skipped/todo tests,
  and 0 failures. Isolated stdio produced 6 executed tests, 0 skipped, and 0
  failures, for 5,714 executed tests combined.
- `packages/opencode` and `packages/sdk/js` typechecks passed; migration
  verification returned exactly `Migrations are up to date`.
- Root lint completed with 0 errors and 4,319 warnings.
- The focused coverage/projection audit passed 76 tests with 0 failures; the
  published-contract guard independently passed 4 tests with 0 failures.
- Fresh OpenAPI input SHA-256:
  `b8cdcb7ed5b5e0940cfdaf584ce56ce99de4304eb78cb22b55f1a2527e374286`.
  It is byte-identical to the checked-in published artifact.
- Two-pass generated output SHA-256:
  `sdk.gen.ts=809d4cf45dd3d4afe2c15d2daa50adfa269ddd90a6d6e1ffbe8cae2025c08491`,
  `types.gen.ts=6f68358e140afbfab5cd38e9a505d2981e95db353d0d2da072d37400c065edf8`,
  and v2 generated tree
  `20e03f5b5ba73d1a4f4c627670e741d2844142d502fa5d9dfcc78a9605e96d12`.
- The build-node artifact imported under plain Node v24.16.0 with source-derived
  version `0.0.0-codex/sync-upstream-20260901-compat-f1175ce9`; bundle SHA-256:
  `6af88f40f006450527b2abcc1094d74c65f77952778f7bfeb6e7dfbb7cc2c07f`.
- The current-platform `mimocode-darwin-x64` native build passed its executable
  smoke with version `local` and package metadata `darwin` / `x64`.
- A plain-Node checkpoint-coverage smoke populated 32,765 checkpoints, 32,765
  distinct effective watermarks, and 65,530 messages under
  `node:sqlite MAX_VARIABLE_NUMBER=32766`. The HTTP boundary returned 200 with
  all 32,765 watermarks resolved and exact first/last object assertions; cleanup
  completed explicitly.

### Shared inheritance and changed-path calculation

Propagation from prior compat to final behavior, excluding all five
registry/history paths, changes 97 paths with 12,667 insertions and 1,501
deletions. The final compat delta relative to inherited main behavior is 92
paths with 10,085 insertions and 1,664 deletions. The post-integration behavior
sequence changes 38 paths with 3,748 insertions and 449 deletions.

`AGENTS.md`, `docs/upstream-deviations.md`, `docs/fork-capabilities.md`,
`docs/fork-registry-history.md`, and `bun.lock` remain byte-identical between
the accepted `main` tip and final compat behavior.

```bash
git diff --shortstat \
  d3ef2e08c5a5317d264631a929025f3f69af75c7 \
  f1175ce9d6a7f82045b3910e0f1db5eb686924d0 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --shortstat \
  2b4c6569ac308fa6a6662c2c044059893748e0ad \
  f1175ce9d6a7f82045b3910e0f1db5eb686924d0 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --shortstat \
  2d9d8e755ccf5c53c5883257070b83667ec1462d \
  f1175ce9d6a7f82045b3910e0f1db5eb686924d0 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-09-01 OAuth branding propagation

- Reviewed upstream:
  `2ce93f4188275aff0dc0353d36ec5f7538bcb32b`.
- Accepted fork `main` audit tip:
  `c3fd051a27585a3e2a04124e00ce0439b27130e6`.
- Inherited main behavior:
  `c63ae51911f8455fd1cc8defcc4a0a2e827889e2`.
- Prior compat tip:
  `358c0bf50d20e168d8b83de7d491e0ca608061e6`.
- Compat integration merge and final pre-documentation behavior:
  `43bc1048b0bc16ff17d715ee9cb756d2c1cc319f`, whose parents are the prior
  compat tip and accepted fork `main` audit tip.
- The actual compat merge tree equals the pre-merge prediction
  `939a1cc5f564cf44eb3e6e85651a1cd95f129ca4`; no conflict resolution or
  compat behavior follow-up was required.
- Active ownership remains DC-NET-001, DC-NET-002, DC-PLATFORM-001,
  DC-MODEL-001, DC-CONTEXT-001, DC-ACTOR-001, and DC-TUI-001. No owner was
  added, retired, or transferred.

### Complete shared-capability disposition (1/1)

`AR-20260901-OAUTH-COMPAT` is the complete audit range:
`old_upstream=2c5cd4972c3f3cb8947a5117c7910d485e6f6179`,
`new_upstream=2ce93f4188275aff0dc0353d36ec5f7538bcb32b`,
`main_merge=c63ae51911f8455fd1cc8defcc4a0a2e827889e2`,
`main_tip=c3fd051a27585a3e2a04124e00ce0439b27130e6`,
`compat_merge=43bc1048b0bc16ff17d715ee9cb756d2c1cc319f`, and
`compat_behavior=43bc1048b0bc16ff17d715ee9cb756d2c1cc319f`.

| # | Inherited capability | `audit_range` | Main and compat counterparts | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | OAuth-facing MiMoCode branding consistency | `AR-20260901-OAUTH-COMPAT` | Main FC-004 carries MCP OAuth lifecycle; compat has no prior delta in the three incoming paths, while DC-NET-002 remains an adjacent `oauth: false` remote-MCP sentinel | complementary | behavior, contract, naming-style | shared main | Inherit the eight upstream literals exactly; preserve all shared OAuth control flow and every compat owner | Three blobs equal accepted main, exact 8-new/0-old gate, runtime metadata/callback assertion, 60-test final matrix, typecheck, lint, lock parity; `COMPAT-VERIFIED` |

Inventory count is 1 and result-row count is 1. The row records every SHA in
the audit range, both branch counterparts, relationship, drift, canonical
owner, disposition, and final status evidence.

### Active compat-owner review (7/7)

| Owner | Incoming relationship | Reviewed disposition | Final evidence |
| --- | --- | --- | --- |
| DC-NET-001 | no path or symbol overlap | Preserve the approved private WebFetch call seam and inherited SSRF utilities | Owner paths are unchanged from prior compat; exact-SHA CI remains the full sentinel gate |
| DC-NET-002 | MCP subsystem adjacency only | Inherit OAuth branding without a production fork; retain RFC1918 client creation and its explicit lack of authentication-interoperability coverage | Full lifecycle matrix passed 34/34, including `compat permits an RFC1918 remote MCP endpoint` with `oauth: false` |
| DC-PLATFORM-001 | no path or symbol overlap | Preserve restricted-network ripgrep and Windows archive fallbacks | Owner paths are unchanged from prior compat; exact-SHA CI remains the full sentinel gate |
| DC-MODEL-001 | `plugin/codex.ts` module adjacency only | Preserve per-agent MaxMode, final-step, title, retry-status, and generated-schema behavior; incoming changes only private HTML literals | Codex plugin matrix passed 15/15; owner source/generated paths are unchanged |
| DC-CONTEXT-001 | no path or symbol overlap | Preserve all caps, preflight, checkpoint, chronology, and published-contract behavior | Owner paths and generated artifacts are unchanged; no SDK/OpenAPI input changed |
| DC-ACTOR-001 | no path or symbol overlap | Preserve frozen membership, actor identity, bounded state, and static-prefix failure | Owner paths are unchanged from prior compat; exact-SHA CI remains the full sentinel gate |
| DC-TUI-001 | user-visible topic adjacency only | Keep provider/model/variant truth and `titleLocale`; browser callback HTML shares no TUI component or state | Owner paths are unchanged from prior compat; exact-SHA CI remains the full sentinel gate |

Owner count is 7 and result-row count is 7. Cleanly merging and zero-overlap
owners were reviewed alongside the single subsystem-adjacent owner; no
compat-only invariant was silently replaced.

### Compat validation evidence

- The three incoming source blobs are byte-identical to accepted `main`.
  Static assertions found exactly 8 new MiMoCode literals and 0 superseded
  OpenCode literals; a runtime assertion verified the dynamic-registration
  metadata and successful MCP callback response.
- The final serial affected matrix passed 60 tests with 0 failures: 4 MCP
  callback, 4 MCP auto-connect, 3 MCP browser, 34 MCP lifecycle, and 15 Codex
  plugin tests. It cleared all unrelated experimental, harness, compaction, and
  checkpoint selectors while preserving the package preload baseline.
- An earlier parallel run placed lint, typecheck, and all focused
  tests under shared CPU pressure; two unchanged 5-second MCP browser tests
  timed out while the third browser test and every other focused test passed.
  The single evidence-supported same-SHA serial rerun passed that file 3/3 in
  9.34 seconds and the complete affected matrix 60/60, so no production or test
  timeout change was made.
- `packages/opencode` typecheck passed. Root lint completed with 0 errors and
  4,320 pre-existing repository-wide warnings.
- `bun ci` used the frozen lockfile. `bun.lock` and dependency manifests remain
  byte-identical to accepted `main`; compat generated artifacts remain unchanged
  from the prior compat tip. SDK generation was not required because no
  SDK/OpenAPI input changed.
- Both the intended propagation range and final main-to-compat delta pass
  `git diff --check`.

### Shared inheritance and changed-path calculation

Propagation from prior compat to final behavior, excluding all five registry
and history paths, changes 3 paths with 8 insertions and 8 deletions. The final
compat delta relative to inherited main behavior remains 92 paths with 10,085
insertions and 1,664 deletions.

`AGENTS.md`, `docs/upstream-deviations.md`, `docs/fork-capabilities.md`,
`docs/fork-registry-history.md`, `bun.lock`, and every dependency manifest are
byte-identical between the accepted `main` tip and compat behavior.

```bash
git diff --shortstat \
  358c0bf50d20e168d8b83de7d491e0ca608061e6 \
  43bc1048b0bc16ff17d715ee9cb756d2c1cc319f -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --shortstat \
  c63ae51911f8455fd1cc8defcc4a0a2e827889e2 \
  43bc1048b0bc16ff17d715ee9cb756d2c1cc319f -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-09-01 Codex-mode specified-change propagation

- This is a named specified-change propagation, not a full upstream sync.
- Selected upstream behavior:
  `cce933568906ae670decf9a081618ebf25aa8afe`, contained in upstream tip
  `d17e176ba179ea2568cdf5020bb65011aaf86493`.
- Accepted fork `main` merge: `c6a2f5f3c8cd0851b36049da5176e2ee7fb81d05`
  from PR #71; inherited main behavior:
  `0899a4802dd65c1ca98e68722a7ee0c017e5cb7c`.
- Prior compat tip: `5d31bec1fb936806b4cfec9427f9f774b96b9ef9`.
- Compat integration merge and final pre-documentation behavior:
  `c594bb92ff5a11063c5e22936964ceae088e1d43`, whose parents are the prior
  compat tip and accepted fork `main` tip.
- The actual merge tree `ff196d8153dd1893e152b91c05acf1ce4ef9718a`
  equals the pre-merge `merge-tree` prediction; no conflict resolution or
  compat behavior correction was required.
- Upstream prompt-guidance commit `eb6766d5` and its merge `dcb15e2f` were not
  selected or adapted. All six shared FD and all seven compat DC remain active.

### Complete shared-capability disposition (2/2)

`AR-20260901-CODEX-MODE-COMPAT` records both incoming decisions.

| # | Inherited capability | Main and compat counterparts | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | FD-002 registry narrowing after default-on instruction alignment | Main retains disable event/payload parity, immutable retry sets, and unknown-actor fail-closed replacement; compat extends the same request path with caps, preflight, MaxMode, and frozen actors | partial duplicate with residual conflict | request, retry, actor identity, registry | shared main | Inherit the narrower active record; retain all three shared residuals and every compat request/actor bound | 223 default-path focused tests, including compat-only instruction cap and retry cases; one pre-existing TODO, zero failures |
| 2 | FD-005 tri-state Codex-mode resolution | Main owns session explicit > process true/false > auto model inference; compat preserves per-agent MaxMode and request-prefix extensions around that one result | complementary | flag, prompt, toolset, discovery, aliases, generated schema | shared main | Inherit the adapted tri-state resolver; preserve native non-Codex behavior under false, independent MCP-search opt-in, transport separation, and all compat overlays | 223 default-path focused tests plus 71 compat-owner sentinels; two typechecks; exact OpenAPI/SDK regeneration |

Inventory count is 2 and result-row count is 2. No shared or compat owner was
retired, added, renumbered, or transferred.

### Active compat-owner review (7/7)

| Owner | Incoming relationship | Reviewed disposition | Final evidence |
| --- | --- | --- | --- |
| DC-NET-001 | no path or symbol overlap | Preserve approved private WebFetch behavior | Owner paths remain unchanged |
| DC-NET-002 | MCP-search naming is adjacent, but no MCP transport/config path changes | Preserve RFC1918 client creation; the shared independent search selector does not alter transport policy | Owner paths and RFC1918 guarantee remain unchanged |
| DC-PLATFORM-001 | no path or symbol overlap | Preserve restricted-network ripgrep and Windows archive fallbacks | Owner paths remain unchanged |
| DC-MODEL-001 | real overlap in prompt/system, MaxMode request wiring, and SDK/OpenAPI | Inherit tri-state harness resolution while preserving per-agent opt-in, final-step bound, title isolation, and subagent retry-status isolation | 20 MaxMode predicate and live-wire sentinels passed |
| DC-CONTEXT-001 | real overlap in prompt construction, instruction delivery, request preflight, and generated contract | Preserve effective windows, active-tool estimates, recovery floors, immutable retry sets, and model-visible caps | 43 overflow/preflight sentinels passed |
| DC-ACTOR-001 | real overlap in frozen prefix, prompt routing, actor identity, and MCP membership | Preserve captured system/tools/context/permissions, active child requests, searchable frozen MCP catalog, and fail-closed static prefixes | 8 full-context actor sentinels passed |
| DC-TUI-001 | no TUI component or state overlap | Preserve provider/model/variant truth and title locale | Owner paths remain unchanged |

Owner count is 7 and result-row count is 7. Clean merges and adjacent surfaces
were reviewed together with the three true overlap owners.

### Compat validation evidence

- With `MIMOCODE_EXPERIMENTAL`,
  `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE`, and the
  unrelated ambient `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` removed, the four
  default-path groups passed 92, 6, 105, and 20 tests respectively: 223 pass,
  1 pre-existing remote-instruction TODO, 0 fail.
- The limited-prefix pre-launch audit found
  `MIMOCODE_EXPERIMENTAL=1` and
  `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL=1`; the other two target selectors were
  absent. Removing all four left no ambient `MIMOCODE_*` values. Bun's package
  preload then installed only the six isolated-test values listed below.
- The three compat-owner groups passed 20 DC-MODEL-001, 43 DC-CONTEXT-001,
  and 8 DC-ACTOR-001 sentinels: 71 pass, 0 fail. These are reported separately
  because some intentionally overlap the default-path files.
- `packages/opencode` and `packages/sdk/js` typechecks passed. Root lint finished
  with 0 errors and 4,323 pre-existing warnings.
- `bun ci` installed 4,542 packages from the frozen lockfile. `bun.lock` and
  dependency manifests remain byte-identical to accepted `main`.
- Runtime OpenAPI generation is byte-identical to tracked
  `packages/sdk/openapi.json` at SHA-256
  `ac8bf7e7fb817b39b6b0212afa01ce4111718e02adc7d65bad34809973fa3d33`.
  `./packages/sdk/js/script/build.ts` ran twice and left both generated trees
  clean. The compat first-parent delta is exactly three OpenAPI descriptions
  and three JS SDK JSDoc replacements; compat-only MaxMode, checkpoint,
  projection, route, and `/v2` sample surfaces remain present.
- Fork `main` push workflows test `33488838942`, lint `33488839072`, and
  typecheck `33488838933` all succeeded for exact SHA
  `c6a2f5f3c8cd0851b36049da5176e2ee7fb81d05`.
- At this local behavior record, `origin/dev/compat` is still
  `5d31bec1fb936806b4cfec9427f9f774b96b9ef9`; status is `LOCAL-VERIFIED` and
  exact compat remote-tip CI is pending fork PR publication. This paragraph is
  not remote-completion evidence.
- The predicted and actual merge trees match, dependency state is unchanged,
  and both propagation ranges pass `git diff --check`.

#### Reproduction commands

From a clean checkout of the exact compat behavior, this block reproduces the
223 default-path tests and 71 compat-owner sentinels. The helper removes all
four ambient selectors from every test process and fails if any other
pre-launch `MIMOCODE_*` value remains. Package-owned `test/preload.ts` then
deliberately sets and preserves only this reported harness baseline:
`MIMOCODE_TEST_TMPDIR_ROOT=<fixture>`, `MIMOCODE_MODELS_PATH=<fixture>`,
`MIMOCODE_TEST_MANAGED_CONFIG_DIR=<fixture>`,
`MIMOCODE_DISABLE_DEFAULT_PLUGINS=true`, `MIMOCODE_DB=:memory:`, and
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`.

```bash
(
  set -e
  set -o pipefail
  test "$(git rev-parse HEAD)" = \
    c594bb92ff5a11063c5e22936964ceae088e1d43
  cd packages/opencode
  run_default() {
    env -u MIMOCODE_EXPERIMENTAL \
      -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
      -u MIMOCODE_CODEX_MODE \
      -u MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL "$@"
  }
  ambient="$(run_default env | LC_ALL=C sort | rg '^MIMOCODE_' || true)"
  printf '%s\n' "$ambient"
  test -z "$ambient"

  reports_dir="$(mktemp -d)"
  trap 'rm -rf "$reports_dir"' EXIT
  report_index=0
  run_counted() {
    expected_pass="$1"
    expected_todo="$2"
    shift 2
    report_index=$((report_index + 1))
    report="$reports_dir/$report_index.log"
    if ! run_default bun test "$@" 2>&1 | tee "$report"; then
      return 1
    fi
    actual_pass="$(awk '$2 == "pass" { value = $1 } END { print value + 0 }' "$report")"
    actual_todo="$(awk '$2 == "todo" { value = $1 } END { print value + 0 }' "$report")"
    actual_fail="$(awk '$2 == "fail" { value = $1 } END { print value + 0 }' "$report")"
    test "$actual_pass" -eq "$expected_pass"
    test "$actual_todo" -eq "$expected_todo"
    test "$actual_fail" -eq 0
  }

  run_counted 92 0 \
    test/flag/codex-mode-flag.test.ts \
    test/tool/gpt.test.ts \
    test/session/system.test.ts \
    test/session/llm-request-prefix.test.ts \
    test/agent/agent.test.ts --timeout 120000
  run_counted 6 0 test/session/prompt-effect.test.ts \
    -t 'native tool schema|instruction files' --timeout 120000

  run_counted 105 0 \
    test/session/max-mode.test.ts \
    test/session/llm-retry.test.ts \
    test/session/prefix-snapshot.test.ts \
    test/tool/tool-script.test.ts --timeout 120000
  run_counted 20 1 \
    test/session/instruction.test.ts \
    test/session/llm-system-prompt.test.ts \
    test/session/replace-agent-subagent.test.ts --timeout 120000
  run_counted 15 0 test/session/max-mode.test.ts --timeout 120000
  run_counted 5 0 test/session/prompt-effect.test.ts \
    -t 'MaxMode candidate retries|MaxMode final step|subagent maxMode retries|last-step maxMode|json_schema output' \
    --timeout 120000

  run_counted 39 0 test/session/overflow.test.ts \
    -t 'request preflight overflow|compaction.max_context|MIMOCODE_COMPACTION_MAX_CONTEXT|MIMOCODE_COMPACTION_TRIGGER_RATIO' \
    --timeout 120000
  run_counted 4 0 test/session/prompt-effect.test.ts \
    -t 'request preflight recovers old history|oversized current user text|unrecoverable static prefix|current turn context as unrecoverable' \
    --timeout 120000
  run_counted 3 0 test/tool/actor.test.ts \
    -t 'captures the caller-visible prefix|fails before spawning' \
    --timeout 120000
  run_counted 2 0 test/session/llm-request-prefix.test.ts \
    -t 'frozen full-context tools' --timeout 120000
  run_counted 3 0 test/session/prompt-effect.test.ts \
    -t 'full-context fork includes a newly committed request|pinned full-context fork can search an MCP tool|frozen fork preflight fails closed' \
    --timeout 120000
)
```

Run the publication checks from a clean disposable checkout because the SDK
build recreates its ignored `dist` directory:

```bash
(
  set -e
  test "$(git rev-parse HEAD)" = \
    c594bb92ff5a11063c5e22936964ceae088e1d43
  generated_openapi="$(mktemp)"
  trap 'rm -f "$generated_openapi"' EXIT

  (cd packages/opencode && bun dev generate > "$generated_openapi")
  cmp "$generated_openapi" packages/sdk/openapi.json
  test "$(shasum -a 256 "$generated_openapi" | awk '{print $1}')" = \
    ac8bf7e7fb817b39b6b0212afa01ce4111718e02adc7d65bad34809973fa3d33

  ./packages/sdk/js/script/build.ts
  git diff --exit-code -- packages/sdk/js/src/gen packages/sdk/js/src/v2/gen
  ./packages/sdk/js/script/build.ts
  git diff --exit-code -- packages/sdk/js/src/gen packages/sdk/js/src/v2/gen

  (cd packages/opencode && bun typecheck)
  (cd packages/sdk/js && bun typecheck)
  bun lint
  git diff --check \
    5d31bec1fb936806b4cfec9427f9f774b96b9ef9..c594bb92ff5a11063c5e22936964ceae088e1d43
  git diff --check \
    0899a4802dd65c1ca98e68722a7ee0c017e5cb7c..c594bb92ff5a11063c5e22936964ceae088e1d43
)
# expected: all commands exit 0; lint reports 0 errors
```

### Shared inheritance and changed-path calculation

Propagation from prior compat to final behavior, excluding all five registry
and history paths, changes 10 paths with 152 insertions and 48 deletions. The
final compat delta relative to inherited main behavior remains 92 paths with
10,085 insertions and 1,664 deletions.

`AGENTS.md`, `docs/upstream-deviations.md`, `docs/fork-capabilities.md`,
`docs/fork-registry-history.md`, `bun.lock`, and every dependency manifest are
byte-identical between accepted `main` and compat behavior.

```bash
git diff --shortstat \
  5d31bec1fb936806b4cfec9427f9f774b96b9ef9 \
  c594bb92ff5a11063c5e22936964ceae088e1d43 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --shortstat \
  0899a4802dd65c1ca98e68722a7ee0c017e5cb7c \
  c594bb92ff5a11063c5e22936964ceae088e1d43 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

## 2026-09-01 full upstream tool-guidance and Codex-convergence sync

- This is the complete propagation of freshly fetched upstream range
  `2ce93f4188275aff0dc0353d36ec5f7538bcb32b..d17e176ba179ea2568cdf5020bb65011aaf86493`,
  not a named subset. The range contains four commits: two substantive changes
  and two first-parent merge carriers, across eight paths with 63 insertions and
  28 deletions.
- Accepted fork `main` behavior:
  `4866d01f754429e3782f60983311c24468a9949a`; accepted main audit tip:
  `c9bdea878aa289f427c4bfbe798411d4907df600`.
- Prior compat tip:
  `d2016a7a84adff5cafff14cad54c4d8a6e11ceb2`.
- Compat integration merge and final pre-documentation behavior:
  `17f24827b310d8e9b64d495370ca6ec63f28242c`, whose parents are the prior
  compat tip and accepted main audit tip.
- The actual merge tree and a fresh `git merge-tree --write-tree` prediction
  are both `88b79af45838efaa546501dd43f825a099fe575a`; no compat conflict resolution
  or behavior follow-up was required.
- All six shared FD, all fifteen shared FC, and all seven compat DC entries
  remain active. No owner was added, retired, renumbered, or transferred.

### Complete shared-capability disposition (2/2)

`AR-20260901-UPSTREAM-COMPAT` is the complete audit range:
`old_upstream=2ce93f4188275aff0dc0353d36ec5f7538bcb32b`,
`new_upstream=d17e176ba179ea2568cdf5020bb65011aaf86493`,
`main_merge=4866d01f754429e3782f60983311c24468a9949a`,
`main_tip=c9bdea878aa289f427c4bfbe798411d4907df600`,
`prior_compat=d2016a7a84adff5cafff14cad54c4d8a6e11ceb2`,
`compat_merge=17f24827b310d8e9b64d495370ca6ec63f28242c`, and
`compat_behavior=17f24827b310d8e9b64d495370ca6ec63f28242c`.

| # | Incoming capability and commit/path evidence | `audit_range` | Main counterpart | Compat counterpart | Relationship | Drift | `canonical_owner` | Disposition | Status evidence |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Action-oriented default-prompt tool guidance; `eb6766d5c9daf035c979d98db84ec80c6cf99967` via merge carrier `dcb15e2f706aaf546a76129eed980b91dc5024a3`, changing `packages/opencode/src/session/prompt/default.txt` | `AR-20260901-UPSTREAM-COMPAT` | FC-011 owns prompt/tool-schema truth and direct system-prompt regression coverage | DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 are semantically adjacent to prompt routing, request construction, and actor spawning; none owns this shared guidance | complementary | prompt guidance, task/actor claims, whitespace | shared main | Inherit the adapted guidance and its direct regression; retain the fork's tool names and remove upstream trailing whitespace | Final default-path matrix 226 pass, 1 pre-existing TODO, 0 fail; 71 compat-owner sentinels passed; final behavior matches accepted main on both changed paths |
| 2 | Explicit false Codex-mode result; `cce933568906ae670decf9a081618ebf25aa8afe`, changing `flag.ts`, `prompt.ts`, `system.ts`, `gpt.ts`, and three tests | `AR-20260901-UPSTREAM-COMPAT` | FD-005 owns the stronger session explicit > process true/false > complete-identity inference contract, MiMo precedence, independent MCP-search selector, and transport separation | DC-MODEL-001 preserves per-agent MaxMode; DC-CONTEXT-001 and DC-ACTOR-001 preserve bounded/frozen request seams around the shared resolved harness | partial duplicate with conflicting priority/tests | harness selection, prompt, toolset, aliases, request seams | shared main | Subsumed rather than copied: reject the upstream assertions that let process-level false override an explicit session `codex` result, while retaining process false over model inference when no explicit session mode exists | Codex flag/tool/system/request matrix included in 93 + 8 passing tests; DC-MODEL/DC-CONTEXT/DC-ACTOR sentinels passed 20/43/8 |

Inventory count is 2 and result-row count is 2. Every row records old/new
upstream through the named audit range, the accepted main and compat SHAs,
commit/path evidence, both branch counterparts, relationship, drift,
canonical owner, disposition, and final status evidence.

### Active compat-owner review (7/7)

| Owner | Incoming relationship | Reviewed disposition | Final evidence |
| --- | --- | --- | --- |
| DC-NET-001 | no path or symbol overlap | Preserve the approved private WebFetch call seam and inherited SSRF utilities | Incoming range and final propagation delta do not touch owner paths or symbols; blobs remain unchanged |
| DC-NET-002 | no MCP transport/config path or symbol overlap | Preserve RFC1918 client creation and its deliberately bounded interoperability claim | Owner paths and RFC1918 guarantee are unchanged |
| DC-PLATFORM-001 | no path or symbol overlap | Preserve restricted-network ripgrep and Windows archive fallbacks | Owner paths are unchanged |
| DC-MODEL-001 | audited upstream/main prompt, system, and harness semantic adjacency; no compat production delta | Inherit action guidance and the stronger shared tri-state resolver while preserving per-agent opt-in, final-step, title, generated-schema, and retry-status bounds | 20 MaxMode predicate/live-wire sentinels passed |
| DC-CONTEXT-001 | model-visible default/system-prompt semantic adjacency | Preserve model-visible caps, effective-window preflight, recovery floors, checkpoint coverage, chronology, and generated contracts | 43 overflow/preflight sentinels passed; SDK/OpenAPI inputs and outputs are unchanged |
| DC-ACTOR-001 | task/actor guidance and prompt-routing semantic adjacency | Preserve frozen system/tools/context/permissions, active child requests, searchable captured MCP membership, and static-prefix fail-closed behavior | 8 full-context actor/request-prefix sentinels passed |
| DC-TUI-001 | no TUI component, request-metadata, or locale overlap | Preserve provider/model/variant truth and `titleLocale` submission | Owner paths are unchanged |

Owner count is 7 and result-row count is 7. The three semantically adjacent
owners were validated with named sentinels; the four no-overlap owners were
still reviewed and remain unchanged.

### Compat validation evidence

- `bun ci` installed 4,542 packages from the frozen lockfile. `bun.lock` and
  every dependency manifest are byte-identical to both the prior compat tip and
  accepted `main`.
- Every default-path test process removed seven experimental, harness,
  compaction, and checkpoint selectors. The four final groups passed 93, 8,
  105, and 20 tests: 226 pass, 1 pre-existing remote-instruction TODO, 0 fail.
- The compat-owner groups separately passed 20 DC-MODEL-001, 43
  DC-CONTEXT-001, and 8 DC-ACTOR-001 sentinels: 71 pass, 0 fail. They are
  reported separately because some intentionally overlap final-matrix files.
- `packages/opencode` and `packages/sdk/js` typechecks passed. Root lint
  completed with 4,323 pre-existing repository-wide warnings and 0 errors.
- Relative to the prior compat tip, excluding the five registry/history paths,
  final behavior changes exactly two paths with 22 insertions and 11 deletions:
  `packages/opencode/src/session/prompt/default.txt` and its direct
  `packages/opencode/test/session/system.test.ts` regression. Both blobs are
  byte-identical to inherited main behavior.
- `packages/opencode/src/session/prompt.ts`, OpenAPI generation code, tracked
  `packages/sdk/openapi.json`, and both JavaScript SDK generated trees are
  unchanged from the prior compat tip. SDK generation was therefore not
  applicable; this conclusion is guarded by explicit zero-diff assertions.
- Both propagation ranges pass `git diff --check`. At this local behavior
  record, exact remote-tip CI for the forthcoming compat documentation commit
  is pending publication; this paragraph is not remote-completion evidence.

### Shared inheritance and changed-path calculation

The final compat delta relative to inherited main behavior remains 92 paths
with 10,085 insertions and 1,664 deletions after excluding the five registry
and history paths. `AGENTS.md`, the three shared registry/history documents,
`bun.lock`, and every dependency manifest are byte-identical between accepted
`main` and compat behavior.

```bash
git diff --shortstat \
  d2016a7a84adff5cafff14cad54c4d8a6e11ceb2 \
  17f24827b310d8e9b64d495370ca6ec63f28242c -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'

git diff --shortstat \
  4866d01f754429e3782f60983311c24468a9949a \
  17f24827b310d8e9b64d495370ca6ec63f28242c -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md'
```

### Exact behavior reproduction

Run this block from a clean disposable checkout of exact compat behavior
`17f24827b310d8e9b64d495370ca6ec63f28242c`. It installs only the frozen lock,
removes all seven non-default selectors before each test process, verifies the
ambient selector set is empty, and asserts every pass/TODO/fail count.
Package-owned `test/preload.ts` still installs its isolated-test baseline after
the process starts: `MIMOCODE_TEST_TMPDIR_ROOT=<fixture>`,
`MIMOCODE_MODELS_PATH=<fixture>`,
`MIMOCODE_TEST_MANAGED_CONFIG_DIR=<fixture>`,
`MIMOCODE_DISABLE_DEFAULT_PLUGINS=true`, `MIMOCODE_DB=:memory:`, and
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`.

```bash
(
  set -e
  set -o pipefail
  test "$(git rev-parse HEAD)" = \
    17f24827b310d8e9b64d495370ca6ec63f28242c
  bun ci

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
  ambient="$(run_default env | LC_ALL=C sort | rg '^MIMOCODE_' || true)"
  printf '%s\n' "$ambient"
  test -z "$ambient"

  run_counted() {
    expected_pass="$1"
    expected_todo="$2"
    shift 2
    if ! output="$(run_default bun test "$@" 2>&1)"; then
      printf '%s\n' "$output"
      return 1
    fi
    printf '%s\n' "$output"
    actual_pass="$(printf '%s\n' "$output" | awk '$2 == "pass" { value = $1 } END { print value + 0 }')"
    actual_todo="$(printf '%s\n' "$output" | awk '$2 == "todo" { value = $1 } END { print value + 0 }')"
    actual_fail="$(printf '%s\n' "$output" | awk '$2 == "fail" { value = $1 } END { print value + 0 }')"
    test "$actual_pass" -eq "$expected_pass"
    test "$actual_todo" -eq "$expected_todo"
    test "$actual_fail" -eq 0
  }

  run_counted 93 0 \
    test/flag/codex-mode-flag.test.ts \
    test/tool/gpt.test.ts \
    test/session/system.test.ts \
    test/session/llm-request-prefix.test.ts \
    test/agent/agent.test.ts --timeout 120000
  run_counted 8 0 test/session/prompt-effect.test.ts \
    -t 'native tool schema|process-disabled auto GPT requests|locks system and harness|persists auto|instruction files' \
    --timeout 120000
  run_counted 105 0 \
    test/session/max-mode.test.ts \
    test/session/llm-retry.test.ts \
    test/session/prefix-snapshot.test.ts \
    test/tool/tool-script.test.ts --timeout 120000
  run_counted 20 1 \
    test/session/instruction.test.ts \
    test/session/llm-system-prompt.test.ts \
    test/session/replace-agent-subagent.test.ts --timeout 120000

  run_counted 15 0 test/session/max-mode.test.ts --timeout 120000
  run_counted 5 0 test/session/prompt-effect.test.ts \
    -t 'MaxMode candidate retries|MaxMode final step|subagent maxMode retries|last-step maxMode|json_schema output' \
    --timeout 120000
  run_counted 39 0 test/session/overflow.test.ts \
    -t 'request preflight overflow|compaction.max_context|MIMOCODE_COMPACTION_MAX_CONTEXT|MIMOCODE_COMPACTION_TRIGGER_RATIO' \
    --timeout 120000
  run_counted 4 0 test/session/prompt-effect.test.ts \
    -t 'request preflight recovers old history|oversized current user text|unrecoverable static prefix|current turn context as unrecoverable' \
    --timeout 120000
  run_counted 3 0 test/tool/actor.test.ts \
    -t 'captures the caller-visible prefix|fails before spawning' \
    --timeout 120000
  run_counted 2 0 test/session/llm-request-prefix.test.ts \
    -t 'frozen full-context tools' --timeout 120000
  run_counted 3 0 test/session/prompt-effect.test.ts \
    -t 'full-context fork includes a newly committed request|pinned full-context fork can search an MCP tool|frozen fork preflight fails closed' \
    --timeout 120000

  bun typecheck
  (cd ../sdk/js && bun typecheck)
  cd ../..
  lint_summary="$(bun lint 2>&1 | tee /dev/stderr | tail -n 2)"
  printf '%s\n' "$lint_summary" | \
    rg -q '^Found 4323 warnings and 0 errors\.$'

  test "$(git diff --name-only \
    d2016a7a84adff5cafff14cad54c4d8a6e11ceb2..17f24827b310d8e9b64d495370ca6ec63f28242c \
    -- . \
    ':(exclude)docs/upstream-deviations.md' \
    ':(exclude)docs/fork-capabilities.md' \
    ':(exclude)docs/dev-compat-overrides.md' \
    ':(exclude)docs/fork-registry-history.md' \
    ':(exclude)docs/dev-compat-registry-history.md')" = \
    "$(printf '%s\n' \
      packages/opencode/src/session/prompt/default.txt \
      packages/opencode/test/session/system.test.ts)"
  test "$(git diff --shortstat \
    d2016a7a84adff5cafff14cad54c4d8a6e11ceb2..17f24827b310d8e9b64d495370ca6ec63f28242c \
    -- . \
    ':(exclude)docs/upstream-deviations.md' \
    ':(exclude)docs/fork-capabilities.md' \
    ':(exclude)docs/dev-compat-overrides.md' \
    ':(exclude)docs/fork-registry-history.md' \
    ':(exclude)docs/dev-compat-registry-history.md')" = \
    " 2 files changed, 22 insertions(+), 11 deletions(-)"
  test "$(git diff --shortstat \
    4866d01f754429e3782f60983311c24468a9949a..17f24827b310d8e9b64d495370ca6ec63f28242c \
    -- . \
    ':(exclude)docs/upstream-deviations.md' \
    ':(exclude)docs/fork-capabilities.md' \
    ':(exclude)docs/dev-compat-overrides.md' \
    ':(exclude)docs/fork-registry-history.md' \
    ':(exclude)docs/dev-compat-registry-history.md')" = \
    " 92 files changed, 10085 insertions(+), 1664 deletions(-)"

  git diff --exit-code \
    d2016a7a84adff5cafff14cad54c4d8a6e11ceb2..17f24827b310d8e9b64d495370ca6ec63f28242c \
    -- bun.lock ':(glob)**/package.json'
  git diff --exit-code \
    c9bdea878aa289f427c4bfbe798411d4907df600..17f24827b310d8e9b64d495370ca6ec63f28242c \
    -- bun.lock ':(glob)**/package.json'
  git diff --exit-code \
    4866d01f754429e3782f60983311c24468a9949a..17f24827b310d8e9b64d495370ca6ec63f28242c \
    -- packages/opencode/src/session/prompt/default.txt \
    packages/opencode/test/session/system.test.ts
  git diff --exit-code \
    d2016a7a84adff5cafff14cad54c4d8a6e11ceb2..17f24827b310d8e9b64d495370ca6ec63f28242c \
    -- packages/opencode/src/session/prompt.ts \
    packages/opencode/src/cli/cmd/generate.ts \
    packages/sdk/openapi.json \
    packages/sdk/js/src/gen \
    packages/sdk/js/src/v2/gen
  git diff --check \
    d2016a7a84adff5cafff14cad54c4d8a6e11ceb2..17f24827b310d8e9b64d495370ca6ec63f28242c
  git diff --check \
    4866d01f754429e3782f60983311c24468a9949a..17f24827b310d8e9b64d495370ca6ec63f28242c
  git diff --exit-code -- .
)
# expected: 226 pass, 1 TODO, 0 fail in the four final groups;
# 71 pass, 0 fail in owner sentinels; both typechecks and all static gates
# exit 0; lint reports 4,323 warnings and 0 errors.
```

## 2026-09-02 default-model, Compose Next, and voice propagation

- Reviewed upstream: `3282b34c46281dc8cd0610433d676a5ec93baa6e`.
- Prior accepted `main` tip:
  `c9bdea878aa289f427c4bfbe798411d4907df600`.
- Accepted `main` tip:
  `28c1f36c8a3bc85bda7e3691960e7d0b531b8636`.
- Inherited main behavior:
  `7bfe6ac48e0db40b2b0b42c00b05a35032fcc113`.
- Prior compat tip:
  `a2d1a1bd97242ec602f800965b48fd963acc8068`.
- Compat behavior merge:
  `c8b02aeb991c37e570799bdd3696e276aa35ba77`, whose parents are the prior
  compat tip and accepted `main` tip.
- All four shared incoming capabilities and all seven active DC owners were
  reviewed. No compat owner was added, retired, renumbered, or transferred;
  FC-016 remains a shared `main` owner inherited by compat.

### Shared capability inheritance (4/4)

| # | Capability | Shared owner | Compat overlap | Decision | Evidence |
| ---: | --- | --- | --- | --- | --- |
| 1 | Stable live-registry default-model fallback | FD-005 plus shared provider selection | DC-MODEL-001 is semantically adjacent through default/lite model use | Inherit registry validation, recent/config precedence, usable-chat filtering, stable order, and one-time warning; retain per-agent MaxMode and hidden-title isolation | Complete provider file `92/0`; DC-MODEL sentinels `20/0` |
| 2 | Workspace-owned Compose Next specification | FC-011 | No DC path or symbol overlap | Inherit Workspace-before-Spec and conditional no-spec/finalize guidance unchanged | Shared bundle/spec blobs are byte-identical to accepted `main` |
| 3 | Snapshot-bound `voice_input` plus FC-016 owner/grapheme hardening | FC-016 | DC-TUI-001 changes the same Prompt component; DC-CONTEXT-001 is request-semantics adjacent | Resolve semantically: retain compat metadata/title locale and inherit every voice owner, stop/drain, ASR/control, and grapheme branch | Voice/offset/model-metadata matrix `77/0`; title-locale sentinel `1/0`; TUI context matrix `20/0` |
| 4 | Voice schema and unnamed-call interoperability | Shared voice protocol under FC-016 | No alternate DC schema or parser | Inherit object schema, single unnamed-call tolerance, and negative wrong-name/multiple-call rejection unchanged | Voice protocol regressions in the `77/0` matrix |

Capability count is 4 and result-row count is 4. Every shared result has a
compat counterpart and disposition; no incoming behavior remains unclassified.

### Compat owner review (7/7)

| Owner | Incoming overlap | Preserved result | Status evidence |
| --- | --- | --- | --- |
| DC-NET-001 | none | Approved private WebFetch call seam and inherited bounds unchanged | Owner source diff unchanged |
| DC-NET-002 | none | RFC1918 remote MCP reachability guarantee unchanged | Owner source/test diff unchanged |
| DC-PLATFORM-001 | none | Restricted-network ripgrep and Windows archive fallbacks unchanged | Owner source/test diff unchanged |
| DC-MODEL-001 | provider-selection semantic adjacency | Per-agent MaxMode, final-step bound, hidden-title isolation, retry-status scope, and generated schema unchanged | `15/0` MaxMode core plus `5/0` prompt wire sentinels |
| DC-CONTEXT-001 | provider context eligibility and same Prompt path adjacency | Content caps, effective-window preflight, recovery, checkpoint coverage, chronology, and published contracts unchanged | `20/0` TUI context/coverage sentinels; shared generated surfaces unchanged |
| DC-ACTOR-001 | none | Frozen full-context membership, permissions, active child, and static-prefix behavior unchanged | Owner paths unchanged |
| DC-TUI-001 | direct Prompt conflict | `ModelMetadata`, effective provider/model/variant display, narrow flex layout, and both `titleLocale` submissions retained alongside the complete shared voice flow | `20/0` model/metadata tests, `45/0` voice tests, `12/0` offset tests, and `1/0` title-locale test |

Owner count is 7 and result-row count is 7. The direct conflict was resolved by
capability rather than side selection: compat intentionally omits
`currentProviderLabel` because `ModelMetadata` remains authoritative, while all
FC-016 symbols and guards are inherited.

### Validation evidence

- `bun ci` installed 4,542 packages from the frozen lockfile without changing
  `bun.lock` or a dependency manifest.
- Default-path affected and owner matrices passed 210 tests with zero failures
  and 557 assertions: provider `92/0`; voice/offset/model/metadata `77/0`;
  title locale `1/0`; TUI context/coverage `20/0`; and MaxMode `20/0`.
  All seven ambient selectors were removed; the package preload retained its
  owned `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` baseline.
- `packages/opencode` and `packages/sdk/js` typechecks passed. The pre-push
  Turbo typecheck reported 12 successful tasks out of 12. Root lint completed
  with 4,334 warnings and zero errors; the 49-warning delta from shared main is
  the established compat baseline class.
- `AGENTS.md`, all three shared FD/FC registry/history documents, the voice
  protocol specification, `bun.lock`, and every dependency manifest are
  byte-identical to accepted `main`.
  SDK/OpenAPI generation was not required because no producer or generated
  surface changed in the selected upstream range.
- Both propagation ranges pass `git diff --check`. At this local behavior
  record, exact remote-tip CI for the forthcoming compat documentation commit
  is pending publication; this is not remote-completion evidence.

### Shared inheritance and changed-path calculation

The compat source/test delta relative to inherited main behavior remains 92
paths with 10,085 insertions and 1,664 deletions after excluding the five
registry/history paths and the shared voice-protocol specification companion.
That companion was updated only in accepted `main`'s audit-doc commit after the
frozen main behavior and is byte-identical in compat; counting its 9 insertions
and 5 deletions would falsely label shared documentation as a compat override.
The raw propagation relative to the prior compat tip, excluding only the five
registry/history paths, changes 26 paths with 1,884 insertions and 507 deletions
and includes the newly introduced shared specification. The only inherited
same-component conflict is Prompt; its final diff from shared main is the
established DC-CONTEXT-001/DC-TUI-001 overlay, including 40 insertions and 43
deletions.

```bash
git diff --shortstat \
  7bfe6ac48e0db40b2b0b42c00b05a35032fcc113 \
  c8b02aeb991c37e570799bdd3696e276aa35ba77 -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md' \
  ':(exclude)docs/compose/spec/voice-control-tool-protocol.md'
```

Expected result: `92 files changed, 10085 insertions(+), 1664 deletions(-)`.

### Exact behavior reproduction

Run from a clean disposable checkout of exact compat behavior
`c8b02aeb991c37e570799bdd3696e276aa35ba77`:

```bash
(
  set -e
  test "$(git rev-parse HEAD)" = \
    c8b02aeb991c37e570799bdd3696e276aa35ba77
  bun ci

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
  test -z "$(run_default env | LC_ALL=C sort | rg '^MIMOCODE_' || true)"
  run_default bun test test/provider/provider.test.ts
  run_default bun test test/cli/tui/voice.test.ts \
    test/cli/cmd/tui/offset.test.ts \
    test/cli/tui/model.test.ts \
    test/cli/tui/model-metadata.test.tsx
  run_default bun test test/session/prompt.test.ts -t titleLocale
  run_default bun test test/cli/tui/context-usage.test.ts \
    test/cli/tui/checkpoint-coverage-sync.test.tsx --timeout 120000
  run_default bun test test/session/max-mode.test.ts --timeout 120000
  run_default bun test test/session/prompt-effect.test.ts \
    -t 'MaxMode candidate retries|MaxMode final step|subagent maxMode retries|last-step maxMode|json_schema output' \
    --timeout 120000
  bun typecheck
  (cd ../sdk/js && bun typecheck)
  cd ../..

  ./.husky/pre-push
  bun lint
  git diff --exit-code \
    28c1f36c8a3bc85bda7e3691960e7d0b531b8636 \
    c8b02aeb991c37e570799bdd3696e276aa35ba77 -- \
    AGENTS.md docs/upstream-deviations.md docs/fork-capabilities.md \
    docs/fork-registry-history.md \
    docs/compose/spec/voice-control-tool-protocol.md \
    bun.lock ':(glob)**/package.json'
  git diff --check \
    7bfe6ac48e0db40b2b0b42c00b05a35032fcc113 \
    c8b02aeb991c37e570799bdd3696e276aa35ba77
)
```

Expected result: 210 tests and 557 assertions pass with zero failures; both
package typechecks and all 12 pre-push tasks succeed; lint reports 4,334
warnings and zero errors; shared registries, dependencies, and whitespace
checks remain clean.

## 2026-09-02 OpenAPI projection and 0.1.14 propagation

- Reviewed upstream:
  `2a0eb706e95a77cba34a319e9f11f33f26d4450c`.
- Prior accepted `main` tip:
  `28c1f36c8a3bc85bda7e3691960e7d0b531b8636`.
- Accepted `main` tip:
  `3a2b6c88fd50d460199d8b5b2721413d164ecba9`.
- Inherited main behavior:
  `dad492e0af72d22d3ec796f6814eda7e52ed51a8`.
- Prior compat tip:
  `eff9a8cd92564b37f30b7cf20aa78401b20bef73`.
- Compat behavior merge:
  `6c2fe63ad3d08d3eed4d5dfc44bab3aa934e559e`, whose parents are the prior
  compat tip and accepted `main` tip.
- All four shared capabilities and all seven active DC owners were reviewed.
  No compat owner was added, retired, renumbered, or transferred.
- The only textual conflict was
  `packages/opencode/test/server/openapi-refs.test.ts`. Semantic resolution
  retained the compat checkpoint-coverage and callable-v2 tests and inherited
  the shared full runtime/published `CompactionPart` equality regression.

### Shared capability inheritance (4/4)

| # | Capability | Shared owner | Compat overlap | Decision | Evidence |
| ---: | --- | --- | --- | --- | --- |
| 1 | Published compaction projection schema | FC-015 and FD-004 | Direct DC-CONTEXT-001 published-contract overlap; DC-ACTOR-001 is semantically adjacent | Inherit the runtime/published equality regression while retaining the existing compat-generated projection and every checkpoint/MaxMode schema | OpenAPI `5/0`; compaction projection `9/0`; fresh compat runtime OpenAPI equals the published artifact |
| 2 | Harness API-description precedence | FD-005 | DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 are request-path neighbors | Retain explicit session precedence, process true/false only under `auto`, then model inference | Harness matrices `93/0` plus `8/0`; generated artifacts are byte-identical to prior compat |
| 3 | Deprecated compaction-config descriptions | FC-015 | Direct DC-CONTEXT-001 effective-window adjacency | Retain the projected-tail deprecation and the stronger at-most-40K plus reserve-safe usable-window bound | Filtered overflow matrix `39/0`; runtime/published generation parity |
| 4 | 0.1.14 workspace release metadata | FC-012; FD-004 watches SDK/OpenAPI publication | No compat-only dependency or version owner | Inherit all sixteen manifests and `bun.lock` byte-for-byte | Release files equal accepted `main` and exact upstream `2a0eb706`; frozen installation made no changes |

Capability count is 4 and result-row count is 4. Every shared capability has a
compat counterpart and disposition; no inherited behavior remains
unclassified.

### Compat owner review (7/7)

| Owner | Incoming overlap | Preserved result | Status evidence |
| --- | --- | --- | --- |
| DC-NET-001 | none | Approved private WebFetch call seam and inherited bounds unchanged | WebFetch/SSRF owner paths have zero propagation diff |
| DC-NET-002 | none | RFC1918 remote MCP reachability guarantee unchanged | MCP owner paths have zero propagation diff |
| DC-PLATFORM-001 | none | Restricted-network ripgrep and Windows archive fallbacks unchanged | Platform owner paths have zero propagation diff |
| DC-MODEL-001 | Generated harness/schema semantic adjacency | Per-agent MaxMode, final-step bound, hidden-title isolation, and retry-status scope unchanged | `15/0` MaxMode core plus `5/0` prompt-routing sentinels; generated artifacts unchanged |
| DC-CONTEXT-001 | Direct projection and compaction-description overlap | Existing projection, effective-window bound, checkpoint coverage, chronology, and recovery routing retained; new equality regression inherited | OpenAPI `5/0`, projection `9/0`, filtered overflow `39/0`; fresh generation equals the published artifact |
| DC-ACTOR-001 | Projection/harness semantic adjacency | Frozen membership, system, cwd, permissions, active-child, and static-prefix behavior unchanged | Actor/full-context sentinels `8/0`; actor and prefix owner paths unchanged |
| DC-TUI-001 | none | Provider/model/variant truth and `titleLocale` submission unchanged | Prompt/TUI owner paths have zero propagation diff |

Owner count is 7 and result-row count is 7. All owners remain active and
unchanged.

### Validation evidence

- `bun ci` checked 2,311 installs across 2,580 packages without changing the
  lockfile or manifests.
- The final shared inheritance matrix passed 154 tests with zero failures:
  OpenAPI `5/0`, compaction projection `9/0`, filtered overflow `39/0`, harness
  files `93/0`, and filtered prompt/harness cases `8/0`.
- The MaxMode owner matrix passed 20 tests with zero failures (`15/0` plus
  `5/0`). The actor/full-context owner matrix passed 8 tests with zero failures
  (`3/0`, `2/0`, and `3/0`). All seven ambient user selectors were removed for
  these matrices; the package-owned preload baseline was retained.
- An initial broad eight-file run used Bun's default 5,000 ms timeout.
  `MaxMode candidate retries publish global attempts and retry status` timed
  out while the other 253 tests passed, two existing cancellation tests
  skipped, and the runner reported only that timed-out case. At the same
  behavior SHA, that case passed alone in 3.74 seconds with
  `--timeout 120000` and passed again in the formal five-case MaxMode matrix.
  The two clean reproductions classify the first result as harness timing, not
  a product-behavior failure.
- Fresh compat OpenAPI generated before and after propagation was byte-identical
  and matched `packages/sdk/openapi.json`. Two final JavaScript SDK generator
  runs were idempotent. Both generated artifacts have zero diff from the prior
  compat behavior.
- `packages/opencode` and `packages/sdk/js` typechecks passed. The pre-push
  Turbo typecheck reported 12 successful tasks out of 12. Root lint completed
  with 4,334 warnings and zero errors, matching the established compat warning
  baseline.
- Excluding the three inherited shared registry/history documents, propagation
  changes exactly eighteen paths: sixteen package manifests, `bun.lock`, and
  `packages/opencode/test/server/openapi-refs.test.ts` (50 insertions and 31
  deletions). No runtime, producer, migration, workflow, or generated path
  changed.
- The sixteen manifests, `bun.lock`, and three shared registry/history
  documents are byte-identical to accepted `main`; release files also match
  exact upstream. The propagation range passes `git diff --check`. Exact remote
  CI for the forthcoming compat documentation tip remains pending publication.

### Shared inheritance and changed-path calculation

The compat source/test delta relative to inherited main behavior remains 92
paths with 10,031 insertions and 1,662 deletions after excluding the five
registry/history paths and the shared voice-protocol specification companion.
The behavior propagation relative to the prior compat tip changes 21 paths
with 253 insertions and 85 deletions; excluding the three inherited shared
registry/history documents yields the eighteen paths and 50/31 delta described
above.

```bash
git diff --shortstat \
  dad492e0af72d22d3ec796f6814eda7e52ed51a8 \
  6c2fe63ad3d08d3eed4d5dfc44bab3aa934e559e -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md' \
  ':(exclude)docs/compose/spec/voice-control-tool-protocol.md'
```

Expected result: `92 files changed, 10031 insertions(+), 1662 deletions(-)`.

### Exact behavior reproduction

Run from a clean checkout of exact compat behavior
`6c2fe63ad3d08d3eed4d5dfc44bab3aa934e559e`. Use `--timeout 120000`; Bun's
default five-second timeout can be insufficient for the MaxMode timing case
under broad-matrix load.

```bash
(
  set -e
  test "$(git rev-parse HEAD)" = \
    6c2fe63ad3d08d3eed4d5dfc44bab3aa934e559e
  bun ci
  git diff --exit-code -- bun.lock ':(glob)**/package.json'

  openapi_probe="$(mktemp)"
  trap 'rm -f "$openapi_probe"' EXIT
  bun run --cwd packages/opencode dev generate > "$openapi_probe"
  jq empty "$openapi_probe"
  cmp packages/sdk/openapi.json "$openapi_probe"
  jq -e '
    .components.schemas.Config.properties.compaction.properties as $c
    | ([.. | objects | .harness?.description?
        | select(type == "string")]) as $h
    | (.components.schemas.CompactionPart.properties.projection.type == "object")
      and (.components.schemas.AgentConfig.properties.maxMode.type == "boolean")
      and (.paths["/session/{sessionID}/checkpoint-coverage"].get.operationId
        == "session.checkpointCoverage")
      and (.components.schemas.CheckpointCoverage.type == "object")
      and ($c.tail_turns.description
        == "Deprecated compatibility setting. Projected compaction now keeps only whole API rounds that arrive while compaction is running.")
      and ($c.preserve_recent_tokens.description
        == "Deprecated compatibility setting. Compression-time API rounds use at most 40000 tokens, capped by the reserve-safe effective window after frozen prefix and projection overhead.")
      and (($h | length) == 3)
      and ($h | all(contains(
        "Explicit codex or default is authoritative. Auto uses an explicit MIMOCODE_CODEX_MODE true/false when set, then falls back to model inference."
      )))
  ' packages/sdk/openapi.json
  test "$(jq '[.paths[][]
    | select(type == "object" and has("operationId"))] | length' \
    packages/sdk/openapi.json)" = 141
  test "$(jq '[.paths[][]
    | select(type == "object" and has("operationId"))
    | .["x-codeSamples"][]?] | length' packages/sdk/openapi.json)" = 141
  ./packages/sdk/js/script/build.ts
  ./packages/sdk/js/script/build.ts
  git diff --exit-code -- \
    packages/sdk/openapi.json packages/sdk/js/src/gen \
    packages/sdk/js/src/v2/gen

  git diff --exit-code \
    eff9a8cd92564b37f30b7cf20aa78401b20bef73 HEAD -- \
    packages/opencode/src packages/sdk/openapi.json \
    packages/sdk/js/src/gen packages/sdk/js/src/v2/gen
  test "$(git diff --name-only \
    eff9a8cd92564b37f30b7cf20aa78401b20bef73 HEAD -- \
    packages/opencode/test)" = \
    packages/opencode/test/server/openapi-refs.test.ts
  git diff --exit-code \
    2a0eb706e95a77cba34a319e9f11f33f26d4450c HEAD -- \
    bun.lock ':(glob)**/package.json'
  git diff --exit-code \
    3a2b6c88fd50d460199d8b5b2721413d164ecba9 HEAD -- \
    docs/upstream-deviations.md docs/fork-capabilities.md \
    docs/fork-registry-history.md
  git diff --name-only \
    eff9a8cd92564b37f30b7cf20aa78401b20bef73 HEAD -- . \
    ':(exclude)docs/upstream-deviations.md' \
    ':(exclude)docs/fork-capabilities.md' \
    ':(exclude)docs/fork-registry-history.md' | diff -u - <(
      printf '%s\n' \
        bun.lock \
        packages/app/package.json \
        packages/console/app/package.json \
        packages/console/core/package.json \
        packages/console/function/package.json \
        packages/console/mail/package.json \
        packages/desktop/package.json \
        packages/enterprise/package.json \
        packages/function/package.json \
        packages/opencode/package.json \
        packages/opencode/test/server/openapi-refs.test.ts \
        packages/plugin/package.json \
        packages/sdk/js/package.json \
        packages/shared/package.json \
        packages/slack/package.json \
        packages/ui/package.json \
        packages/web/package.json \
        sdks/vscode/package.json
    )
  test "$(git diff --shortstat \
    eff9a8cd92564b37f30b7cf20aa78401b20bef73 HEAD -- . \
    ':(exclude)docs/upstream-deviations.md' \
    ':(exclude)docs/fork-capabilities.md' \
    ':(exclude)docs/fork-registry-history.md')" = \
    ' 18 files changed, 50 insertions(+), 31 deletions(-)'

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

  run_default bun test test/server/openapi-refs.test.ts --timeout 120000
  run_default bun test test/session/compaction-projection.test.ts \
    --timeout 120000
  run_default bun test test/session/overflow.test.ts \
    -t 'request preflight overflow|compaction.max_context|MIMOCODE_COMPACTION_MAX_CONTEXT|MIMOCODE_COMPACTION_TRIGGER_RATIO' \
    --timeout 120000
  run_default bun test \
    test/flag/codex-mode-flag.test.ts \
    test/tool/gpt.test.ts \
    test/session/system.test.ts \
    test/session/llm-request-prefix.test.ts \
    test/agent/agent.test.ts --timeout 120000
  run_default bun test test/session/prompt-effect.test.ts \
    -t 'native tool schema|process-disabled auto GPT requests|locks system and harness|persists auto|instruction files' \
    --timeout 120000

  run_default bun test test/session/max-mode.test.ts --timeout 120000
  run_default bun test test/session/prompt-effect.test.ts \
    -t 'MaxMode candidate retries|MaxMode final step|subagent maxMode retries|last-step maxMode|json_schema output' \
    --timeout 120000
  run_default bun test test/tool/actor.test.ts \
    -t 'captures the caller-visible prefix|fails before spawning' \
    --timeout 120000
  run_default bun test test/session/llm-request-prefix.test.ts \
    -t 'frozen full-context tools' --timeout 120000
  run_default bun test test/session/prompt-effect.test.ts \
    -t 'full-context fork includes a newly committed request|pinned full-context fork can search an MCP tool|frozen fork preflight fails closed' \
    --timeout 120000

  bun typecheck
  (cd ../sdk/js && bun typecheck)
  cd ../..

  ./.husky/pre-push
  bun lint
  git diff --check \
    eff9a8cd92564b37f30b7cf20aa78401b20bef73 \
    6c2fe63ad3d08d3eed4d5dfc44bab3aa934e559e
)
```

Expected result: the shared matrix passes `154/0`; the MaxMode and actor owner
matrices pass `20/0` and `8/0`; both package typechecks and all 12 pre-push
tasks succeed; lint reports 4,334 warnings and zero errors; frozen dependency,
generated-surface, owner-path, and whitespace checks remain clean.

## 2026-09-02 Xiaomi WebSearch model and session-ID propagation

- Reviewed upstream:
  `f82c177709019c759ce2bb06bd1b04cba488811e`.
- Prior accepted `main` tip:
  `3a2b6c88fd50d460199d8b5b2721413d164ecba9`.
- Accepted `main` tip:
  `3ec8a8534ad4481c73f1946c966daf3a846cc29f`.
- Inherited main behavior:
  `f1e2ba0019ee6ac13c2608474ae9237865b742f2`.
- Prior compat tip:
  `bd1eba712180daf135b81146af9266875b6dc6a9`.
- Compat behavior merge:
  `4130f181f86477f91245f42e8670d0c84203bcde`, whose parents are the prior
  compat tip and accepted `main` tip.
- Both shared capabilities and all seven active DC owners were reviewed. No
  compat owner was added, retired, renumbered, or transferred. The merge had no
  textual conflict.

### Shared capability inheritance (2/2)

| # | Capability | Shared owner | Compat overlap | Decision | Evidence |
| ---: | --- | --- | --- | --- | --- |
| C05 | Session-model Xiaomi WebSearch sidecar | FD-005; FD-006 is authority-adjacent | DC-MODEL-001 and DC-ACTOR-001 are selected-model neighbors; no compat path fork | Inherit request-scoped `model.api.id`; never substitute a catalog/default literal; retain per-agent MaxMode and actor model flow | Incoming WebSearch regression; four incoming blobs equal main; direct ID/WebSearch suite `11/0` |
| C06 | Marker-free descending session IDs | Shared ID generation; FC-001 and FD-009 consume opaque IDs | DC-CONTEXT-001 and DC-ACTOR-001 consume the key; no compat owner defines an alternate format | Inherit marker-free new session IDs; accept legacy IDs; keep the descending message-ID marker and all actor/checkpoint chronology | ID regression, actor/session sentinels, and new/message/legacy runtime probe |

Capability count is 2 and result-row count is 2. Every shared capability has a
compat counterpart and disposition; no inherited behavior remains
unclassified.

### Compat owner review (7/7)

| Owner | Incoming overlap | Preserved result | Status evidence |
| --- | --- | --- | --- |
| DC-NET-001 | none; WebSearch is not the WebFetch/SSRF call seam | Approved private WebFetch policy, per-hop asks, redirects, timeout, and 5 MB bound unchanged | RFC1918 WebFetch sentinel `1/0`; owner paths have zero propagation diff |
| DC-NET-002 | none; `MimoWebsearch` is not remote-MCP lifecycle | RFC1918 remote-MCP client-creation guarantee unchanged | RFC1918 MCP sentinel `1/0`; owner paths have zero propagation diff |
| DC-PLATFORM-001 | none | Restricted-network ripgrep and Windows archive fallbacks unchanged | Focused ripgrep/archive sentinels `2/0`; owner paths have zero propagation diff |
| DC-MODEL-001 | WebSearch selected-model adjacency | Request-scoped API ID inherited; per-agent MaxMode, final-step/structured-output bounds, hidden title, and retry-status isolation unchanged | MaxMode owner matrix `20/0`; incoming WebSearch regression |
| DC-CONTEXT-001 | Opaque session-key and WebSearch-output adjacency | Legacy/new IDs coexist without migration; stable memory path, checkpoint chronology, preflight, and output truncation unchanged | Lifecycle/context/list/recovery plus memory-path matrices within late default-path `60/0`; ID probe |
| DC-ACTOR-001 | Actor-selected WebSearch model and child session ID | `session_id === actor_id === child.id`; frozen membership/system/cwd/permissions and static-prefix bounds unchanged | Actor/full-context `8/0`; new-session/fork-context `2/0` |
| DC-TUI-001 | no changed component path | Session IDs remain opaque round trips; provider/model/variant truth and `titleLocale` submission unchanged | TUI model/metadata matrix `20/0`; owner paths have zero propagation diff |

Owner count is 7 and result-row count is 7. All owners remain active and
unchanged.

### Validation evidence

- `bun ci` checked 2,311 installs across 2,580 packages without changing the
  lockfile or manifests.
- The late default-path matrix passed 60 tests with zero failures: direct ID
  and WebSearch `11/0`; lifecycle/context/recovery/registry `41/0`; session
  listing `5/0`; actor session/fork-context `2/0`; and stable memory path `1/0`.
  Every process removed all seven ambient selectors and used a 120-second
  timeout.
- Compat owner matrices passed 52 additional tests with zero failures: MaxMode
  `20/0`, actor/full-context `8/0`, TUI model/metadata `20/0`, and the four
  network/platform sentinels `4/0`.
- A runtime probe generated a marker-free session ID, confirmed descending
  message IDs retain `-`, and accepted a legacy `ses_-...` value through both
  the given-ID and session-schema paths.
- Excluding the three inherited shared registry/history documents, propagation
  changes exactly the four audited paths with 116 insertions and four
  deletions. Those four blobs are byte-identical to inherited main behavior;
  the shared registries are byte-identical to accepted `main`.
- The inherited-main-to-compat non-registry patch remains exactly the prior
  reviewed overlay: 92 paths, 10,031 insertions, 1,662 deletions, and binary
  diff SHA-256 `9b4d95b61ab45e509a3f161cc0fe71c1a5b89a339d87b06bcd1f57a3173832c2`.
- `packages/opencode` and `packages/sdk/js` typechecks passed. The pre-push
  Turbo typecheck reported 12 successful tasks out of 12. Root lint completed
  with 4,334 warnings and zero errors, matching the established compat warning
  baseline.
- The merge parentage and changed-path allowlist are exact, and the propagation
  range passes `git diff --check`.

### Shared inheritance and changed-path calculation

```bash
git diff --shortstat \
  f1e2ba0019ee6ac13c2608474ae9237865b742f2 \
  4130f181f86477f91245f42e8670d0c84203bcde -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md' \
  ':(exclude)docs/compose/spec/voice-control-tool-protocol.md'
git diff --binary \
  f1e2ba0019ee6ac13c2608474ae9237865b742f2 \
  4130f181f86477f91245f42e8670d0c84203bcde -- . \
  ':(exclude)docs/upstream-deviations.md' \
  ':(exclude)docs/fork-capabilities.md' \
  ':(exclude)docs/dev-compat-overrides.md' \
  ':(exclude)docs/fork-registry-history.md' \
  ':(exclude)docs/dev-compat-registry-history.md' \
  ':(exclude)docs/compose/spec/voice-control-tool-protocol.md' | shasum -a 256
```

Expected result: `92 files changed, 10031 insertions(+), 1662 deletions(-)` and
SHA-256 `9b4d95b61ab45e509a3f161cc0fe71c1a5b89a339d87b06bcd1f57a3173832c2`.

### Exact behavior reproduction

Run from a clean checkout of exact compat behavior
`4130f181f86477f91245f42e8670d0c84203bcde`.

```bash
(
  set -e
  test "$(git rev-parse HEAD)" = \
    4130f181f86477f91245f42e8670d0c84203bcde
  test "$(git rev-parse HEAD^1)" = \
    bd1eba712180daf135b81146af9266875b6dc6a9
  test "$(git rev-parse HEAD^2)" = \
    3ec8a8534ad4481c73f1946c966daf3a846cc29f

  bun ci
  git diff --exit-code -- bun.lock ':(glob)**/package.json'
  test "$(git diff --name-only HEAD^1 HEAD -- . \
    ':(exclude)docs/upstream-deviations.md' \
    ':(exclude)docs/fork-capabilities.md' \
    ':(exclude)docs/fork-registry-history.md')" = "$(printf '%s\n' \
      packages/opencode/src/id/id.ts \
      packages/opencode/src/tool/websearch/index.ts \
      packages/opencode/test/id/id.test.ts \
      packages/opencode/test/tool/websearch.test.ts)"
  test "$(git diff --shortstat HEAD^1 HEAD -- . \
    ':(exclude)docs/upstream-deviations.md' \
    ':(exclude)docs/fork-capabilities.md' \
    ':(exclude)docs/fork-registry-history.md')" = \
    ' 4 files changed, 116 insertions(+), 4 deletions(-)'
  git diff --exit-code \
    f1e2ba0019ee6ac13c2608474ae9237865b742f2 HEAD -- \
    packages/opencode/src/id/id.ts \
    packages/opencode/src/tool/websearch/index.ts \
    packages/opencode/test/id/id.test.ts \
    packages/opencode/test/tool/websearch.test.ts
  git diff --exit-code \
    3ec8a8534ad4481c73f1946c966daf3a846cc29f HEAD -- \
    docs/upstream-deviations.md docs/fork-capabilities.md \
    docs/fork-registry-history.md
  test "$(git diff --name-only \
    f1e2ba0019ee6ac13c2608474ae9237865b742f2 HEAD -- . \
    ':(exclude)docs/upstream-deviations.md' \
    ':(exclude)docs/fork-capabilities.md' \
    ':(exclude)docs/dev-compat-overrides.md' \
    ':(exclude)docs/fork-registry-history.md' \
    ':(exclude)docs/dev-compat-registry-history.md' \
    ':(exclude)docs/compose/spec/voice-control-tool-protocol.md' \
    | wc -l | tr -d ' ')" = 92
  test "$(git diff --binary \
    f1e2ba0019ee6ac13c2608474ae9237865b742f2 HEAD -- . \
    ':(exclude)docs/upstream-deviations.md' \
    ':(exclude)docs/fork-capabilities.md' \
    ':(exclude)docs/dev-compat-overrides.md' \
    ':(exclude)docs/fork-registry-history.md' \
    ':(exclude)docs/dev-compat-registry-history.md' \
    ':(exclude)docs/compose/spec/voice-control-tool-protocol.md' \
    | shasum -a 256 | awk '{print $1}')" = \
    9b4d95b61ab45e509a3f161cc0fe71c1a5b89a339d87b06bcd1f57a3173832c2
  git diff --check HEAD^1 HEAD

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

  run_default bun test test/id/id.test.ts test/tool/websearch.test.ts \
    --timeout 120000
  run_default bun test \
    test/session/session-create-registers-main.test.ts \
    test/session/context-inheritance.test.ts \
    test/session/main-lifecycle.test.ts \
    test/server/global-session-list.test.ts \
    test/server/session-recovery.test.ts \
    test/actor/registry.test.ts --timeout 120000
  run_default bun test test/server/session-list.test.ts --timeout 120000
  run_default bun test test/actor/spawn.test.ts \
    -t 'creates a new sessionID|forkContext stored under child session id' \
    --timeout 120000
  run_default bun test test/session/llm-system-prompt.test.ts \
    -t 'memory instructions keep session paths stable' --timeout 120000

  run_default bun test test/session/max-mode.test.ts --timeout 120000
  run_default bun test test/session/prompt-effect.test.ts \
    -t 'MaxMode candidate retries|MaxMode final step|subagent maxMode retries|last-step maxMode|json_schema output' \
    --timeout 120000
  run_default bun test test/tool/actor.test.ts \
    -t 'captures the caller-visible prefix|fails before spawning' \
    --timeout 120000
  run_default bun test test/session/llm-request-prefix.test.ts \
    -t 'frozen full-context tools' --timeout 120000
  run_default bun test test/session/prompt-effect.test.ts \
    -t 'full-context fork includes a newly committed request|pinned full-context fork can search an MCP tool|frozen fork preflight fails closed' \
    --timeout 120000
  run_default bun test \
    test/cli/tui/model.test.ts test/cli/tui/model-metadata.test.tsx \
    --timeout 120000
  run_default bun test test/tool/webfetch.test.ts \
    -t 'allows an approved RFC1918 fetch target' --timeout 120000
  run_default bun test test/mcp/lifecycle.test.ts \
    -t 'compat permits an RFC1918 remote MCP endpoint' --timeout 120000
  run_default bun test test/file/ripgrep.test.ts \
    -t 'fallback files handles only simple listings' --timeout 120000
  run_default bun test test/util/archive.test.ts \
    -t 'windows zip extractor uses a case-sensitive zip-slip guard' \
    --timeout 120000

  bun typecheck
  (cd ../sdk/js && bun typecheck)
  cd ../..
  ./.husky/pre-push
  bun lint
)
```

Expected result: late default-path tests pass `60/0`; compat owner matrices pass
`52/0`; both package typechecks and all 12 pre-push tasks succeed; lint exits
with 4,334 warnings and zero errors; dependency, path/blob, ID compatibility,
parentage, and whitespace checks remain clean.

## 2026-09-03 PR #73 `prompt_async` queue correction propagation

- Reviewed upstream remains
  `f82c177709019c759ce2bb06bd1b04cba488811e`; this specified-change
  propagation did not select or merge a new upstream range.
- Prior accepted `main` tip:
  `3ec8a8534ad4481c73f1946c966daf3a846cc29f`.
- Accepted `main` tip:
  `65a31144e14849ee2432001bd62bc7902f2c6f29`.
- Inherited main behavior:
  `96d00e06ad1640a80f70c9eda1ed10e62ed5ab79`.
- Prior compat tip:
  `6ee56c116384d54f1269766e348e655d2dc659d6`.
- Compat behavior merge:
  `560de61b663a159771b53b05e826dc2cc91675ac`, whose parents are the prior
  compat tip and accepted `main` tip.
- The conflict-free merge tree exactly matched the pre-merge prediction
  `8493a389421541fda972abb35b10756d97b0a2ae`. No compat owner was added,
  retired, renumbered, or transferred.

### Shared capability inheritance (1/1)

| # | Capability | Shared owner | Compat overlap | Decision | Evidence |
| ---: | --- | --- | --- | --- | --- |
| 1 | Fire-and-forget `prompt_async` queue persistence and 204/400/404 API contract | FC-001; FD-004 owns the API publication boundary | DC-CONTEXT-001 directly overlaps the route and generated contract; DC-MODEL-001 overlaps generated carriers only | Inherit `SessionPrompt.prompt` persistence-before-join and remove 409 from runtime OpenAPI and generated JavaScript SDK; retain all compat context and model extensions | Busy-route `5/0`; OpenAPI contract `6/0`; SDK regeneration idempotent |

Capability count is 1 and result-row count is 1. The final PR #73 tree has no
TUI source change; final-transition draining remains separately scoped to PR
#74 and is not included in this propagation.

### Compat owner review (7/7)

| Owner | Incoming overlap | Preserved result | Status evidence |
| --- | --- | --- | --- |
| DC-NET-001 | none | Approved private WebFetch call seam and inherited bounds unchanged | Owner paths have zero propagation diff |
| DC-NET-002 | none | RFC1918 remote-MCP reachability unchanged | Owner paths have zero propagation diff |
| DC-PLATFORM-001 | none | Restricted-network ripgrep and Windows archive fallbacks unchanged | Owner paths have zero propagation diff |
| DC-MODEL-001 | generated OpenAPI/SDK carriers only | Per-agent MaxMode schema, routing, final-step, structured-output, hidden-title, and retry-status behavior retained | Idempotent SDK generation and both package typechecks |
| DC-CONTEXT-001 | direct session route and published API contract | Queue persistence inherited while checkpoint coverage, compaction projection, callable-v2 samples, caps, preflight, chronology, and recovery remain intact | Busy-route `5/0`; OpenAPI contract `6/0` |
| DC-ACTOR-001 | FC-001 lifecycle adjacency only; no actor path | Frozen membership, system, cwd, permissions, and static-prefix behavior unchanged | Actor owner paths have zero propagation diff |
| DC-TUI-001 | no component path | Existing queued-state rendering now receives its persisted producer; metadata and locale behavior unchanged | Final propagation has no TUI source path |

Owner count is 7 and result-row count is 7. All owners remain active and
unchanged.

### Local validation evidence

- `bun ci` installed 4,542 packages from the frozen lockfile without changing
  `bun.lock` or a dependency manifest.
- Fresh JavaScript SDK generation completed with no working-tree diff.
- With all seven ambient selectors removed, the two affected server suites
  passed 11 tests and 39 assertions with zero failures: busy-route `5/0` and
  OpenAPI contract `6/0`.
- `packages/opencode` and `packages/sdk/js` typechecks both exited zero.
- The repository pre-push gate completed all 12 Turbo typecheck tasks, and root
  lint exited zero with 4,335 warnings and no errors.
- The merge parentage, predicted/actual tree identity, dependency equality, and
  propagation whitespace checks passed. Exact remote-tip CI remains pending
  publication of the compat documentation commit and is not claimed here.

## 2026-09-04 PR #74 closing-run handoff propagation

- Reviewed upstream remains
  `f82c177709019c759ce2bb06bd1b04cba488811e`; this propagation selected no new
  upstream range.
- Prior accepted `main` tip:
  `65a31144e14849ee2432001bd62bc7902f2c6f29`.
- Accepted `main` tip:
  `704e74184eaea02040497a3cc980aeeb99912e05`.
- Inherited main behavior:
  `59d53d7fd356aec1e0891a11cb11a6972ce84d7d`.
- Prior compat tip:
  `e94a67e4c6c303776ccad5f399c8de7499000dda`.
- Compat behavior merge:
  `3e207de425621f660a249c074158d1d1564204f5`, whose parents are the prior
  compat tip and accepted `main` tip.
- Six content conflicts were reconciled by capability in session classify,
  compaction, prompt, user admission, and their two combined test files. No
  compat owner was added, retired, renumbered, or transferred.

### Shared capability inheritance (4/4)

| Capability | Decision | Compat preservation |
| --- | --- | --- |
| Closing-run queued-prompt handoff | Inherit caller-local handoff and one retry after a joined run exits | Keep existing Runner and external-admission state; add no ticket, lane, or runner mode |
| Persisted task binding | Carry `task_id` from the latest user through assistants and derived turns | Keep per-agent MaxMode and actor identity boundaries |
| Parent-linked classification | Treat only an assistant whose `parentID` matches the current user as its result | Keep compat overflow-placeholder recovery |
| Atomic derived-user admission | Compare the latest actor user and commit message plus parts in one immediate transaction | Reuse compat schema, ownership, ID/idempotency, monotonic-time, and pending-external guards |

### Compat owner review (7/7)

| Owner | Incoming overlap | Preserved result |
| --- | --- | --- |
| DC-NET-001 | none | Approved private WebFetch policy unchanged |
| DC-NET-002 | none | RFC1918 remote MCP reachability unchanged |
| DC-PLATFORM-001 | none | Restricted-network and Windows fallbacks unchanged |
| DC-MODEL-001 | prompt and generated carriers | Per-agent MaxMode, final-step, title, structured-output, and retry-status isolation retained |
| DC-CONTEXT-001 | session admission, classification, checkpoint, compaction, prompt, SDK/OpenAPI | Caps, preflight, projection, checkpoint chronology, external-admission checks, and recovery retained |
| DC-ACTOR-001 | checkpoint, prompt, and compaction | Frozen membership/system/tools/permissions/cwd and static-prefix failure retained |
| DC-TUI-001 | no component path | Provider/model/variant and locale truth unchanged |

### Local validation evidence

- Frozen install completed without changing `bun.lock`; JavaScript SDK
  generation was idempotent.
- Full `prompt-effect` passed 131 tests, skipped 2, and failed 0. Focused
  classify, prompt/plan, compaction, busy-route, checkpoint, MaxMode, actor,
  prefix, OpenAPI, coverage, and overflow matrices all passed with zero
  failures.
- Root typecheck completed all 12 tasks. Root lint exited zero with no errors;
  propagation whitespace checks passed.
- The first full prompt run inherited the local umbrella experimental selector
  and failed seven default-MCP assertions. Clearing that selector made those
  seven tests and the complete suite pass; no code change was required.
- Exact remote-tip CI remains pending publication of the compat documentation
  commit and is not claimed here.
