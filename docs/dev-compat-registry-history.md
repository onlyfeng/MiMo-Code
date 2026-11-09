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

## 2026-09-05 upstream ec3f9894 propagation

- Audit range `AR-20260905-EC3`: old upstream `f82c177709019c759ce2bb06bd1b04cba488811e`,
  new upstream `ec3f989438d4b1f4e2b2c2044e1ecfc5327f45b7`.
- Accepted main tip: `430fe9db3b8087976b326bdf4dc2bf1fd5eb5734`; main behavior: `eb2ace2e1cb2554707f5e062cc5649a5ef0a3eae`.
- Prior compat tip: `8b3466b844d206c1a9659e3fd677e887417b3b86`.
- Compat merge and stable behavior: `9121d0efc66fbce72c75342cdf3d2159c13f8c34`.
- The merge inherits shared main and includes the required DC-CONTEXT-001
  Bash replay adaptation. The following registry commit changes no behavior.

### Capability inventory (7/7)

The commit/path/symbol evidence for C01-C07 is the matching seven-row main
audit in `fork-registry-history.md`. Every row below uses the complete source,
main, and compat audit range above and records the final branch disposition.

| ID | Upstream capability / commit | main_counterpart | compat_counterpart | Relationship | Drift | canonical_owner | Disposition | Status evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C01 | Remove resetDatabase fixture / `af49d5da` | FC-008 fixture cleanup; active fork assertions | Inherited unchanged; prefix/subtask assertions stay active | complementary | tests | shared main | adopt reset removal; retain active prefix/subtask assertions | Stable main and compat affected matrices; final source-delta review |
| C02 | Keep terminal subtask tool state / `99e51b2d` | FC-001 subtask settlement | Inherited guard and late-metadata regression; preserved DC-ACTOR context | complementary | behavior,tests | shared main | adopt terminal guard and state assignment; add late metadata regression | Stable main and compat affected matrices; final source-delta review |
| C03 | Export LLMServerTokens through Node entry / `1d6a9fe2` | FD-004 absent token subsystem | Inherited exclusion; Node entry remains unchanged | conflicting | API/build | shared main | omit dangling export under FD-004; no token implementation exists | Stable main and compat affected matrices; final source-delta review |
| C04 | Unify Bash output on token budget / `c2cf9b8f` | Shared Bash token-budget implementation | DC-CONTEXT-001 head+tail replay adaptation within 50 KiB | partial duplicate; conflicting compat replay | behavior,contract,tests,docs | shared main | adopt token budget; preserve permission; reconcile compat head+tail within existing cap | Stable main and compat affected matrices; final source-delta review |
| C05 | Quarantine timeout auth override test / `c56f26c9` | FC-008 repaired auth fixture | Inherited active test; rejected upstream skip | conflicting | tests | shared main | reject skip: fork fixed fixture and exact baseline CI passes | Stable main and compat affected matrices; final source-delta review |
| C06 | Cover mixed CJK case-insensitive session search / `e3e9c1b4` | Shared Session.list LIKE characterization | Inherited test-only coverage | no overlap | tests | shared main | adopt SQL LIKE characterization | Stable main and compat affected matrices; final source-delta review |
| C07 | Strip leading slash mentions from title context / `ec3f9894` | Shared title helpers and locale/ephemeral path | Inherited mention cleanup; DC-MODEL/TUI behavior preserved | complementary | behavior,tests | shared main | adopt leading mention cleanup; preserve locale/ephemeral/filter paths | Stable main and compat affected matrices; final source-delta review |

Inventory and result counts are both seven. The Bash replay adaptation is
owned only by DC-CONTEXT-001; it does not promote the compat cap into main.
All seven DC entries remain active, and the six FD / sixteen FC registries
are inherited byte-for-byte from accepted main. No duplicate consolidation,
cap broadening, owner promotion, or upstream publication was performed.

### Validation and limits

- Package typecheck and repository lint completed with zero errors. The
  matrix below removes the three ambient selectors, preserves package preload
  `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`, and uses `--timeout 120000`.
- The real MessageV2 replay regression first failed for archived Bash tail
  retention, then passed after the adapter. Read, missing/empty archive path,
  and untruncated Bash controls retain the prior head-only behavior; UTF-8
  byte caps and complete archive pointers are checked.
- The final prompt delta exactly adopts upstream title/subtask changes while
  preserving the pre-sync compat carrier. The CJK test matches shared main.
  The SDK/OpenAPI, lockfile, manifests, workflows, TUI, network, and platform
  fallback surfaces are unchanged by this propagation.
- HTTP title body/part validation has existing size limits. Automatic and
  internal title calls have no common input cap; this older limitation is
  documented without changing that independent behavior.
- Exact pushed-SHA CI, remote tips, and ancestry are separate completion
  evidence, not implied by these local results.

| Group | Files (under `packages/opencode`) | Pass / skip |
| --- | --- | --- |
| session | `test/session/prompt-effect.test.ts`, `test/session/prompt.test.ts`, `test/session/fork-prefix-invariant.test.ts`, `test/session/llm-request-prefix.test.ts`, `test/session/max-mode.test.ts`, `test/session/replace-agent-subagent.test.ts`, `test/session/checkpoint-fork-mode.test.ts`, `test/session/run-state-tuple-key.test.ts`, `test/session/run-state-dispose.test.ts` | 214 / 2 |
| bash | `test/tool/bash.test.ts`, `test/tool/auto-worktree-bash-write.test.ts`, `test/tool/bash-isolated-git-guard.test.ts`, `test/tool/bash-conflict-ownership.test.ts`, `test/permission/auto-approve-delete.test.ts`, `test/permission/skip-all.test.ts`, `test/cli/yolo.test.ts`, `test/cli/tui/permission-bash-delete.test.tsx` | 116 / 0 |
| exec | `test/tool/tool-script.test.ts` | 75 / 0 |
| fixture-1 | `test/control-plane/sse.test.ts` | 2 / 0 |
| fixture-2 | `test/server/project-init-git.test.ts` | 2 / 0 |
| fixture-3 | `test/share/share-next.test.ts` | 8 / 0 |
| fixture-4 | `test/workspace/workspace-restore.test.ts` | 2 / 0 |
| fixture-5 | `test/server/session-list.test.ts` | 6 / 0 |
| fixture-6 | `test/plugin/auth-override.test.ts` | 2 / 0 |
| compat | `test/session/message-v2.test.ts`, `test/util/text-truncate.test.ts`, `test/session/overflow.test.ts`, `test/cli/tui/model-metadata.test.tsx` | 157 / 0 |

Stable compat matrix: **584 pass, 2 existing skip, 0 fail**.
Run each row separately from `packages/opencode` with the three selectors
removed, using `bun test <row files> --timeout 120000`.

## 2026-09-07 recovery timing and isolated fixture propagation

- Audit range `AR-20260907-6203`: prior upstream
  `ec3f989438d4b1f4e2b2c2044e1ecfc5327f45b7`, selected upstream
  `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`.
- Prior compat tip: `26e225997deee7573baeae1715b092d9491f3fa7`.
- Accepted main tip: `774a795682c648b7f3637b9159c063ef6a2a4018`.
- Inherited main behavior: `62a43906cfaa7184f5a3f795d512f4b670d9ec65`.
- Compat merge and stable behavior: `d5396a50856f264eda899c3094d9dd232d728307`.
- Shared-audit inheritance merge: `51d1ccbf68856b09ea720ffd5ade5e377421acb7`.
  This merge and the following compat registry update change documentation
  only; neither advances the source/test behavior references above.

### Capability inventory (5/5)

Every row uses the complete audit range above. C01-C04 cover the four
capabilities in the selected upstream range; C05 propagates the previously
accepted main synchronization skill and is outside that upstream increment.
The matching main audit in `fork-registry-history.md` supplies producer,
commit, symbol, and main-validation details. Paths below are repository-relative
unless their owning package is named explicitly.

| ID | Capability | main counterpart | compat counterpart | Relationship | Drift | canonical_owner | Disposition and status evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C01 | Early recovered-assistant settlement | FC-001 atomic main-only admission, now with early settlement | Same admission plus DC-MODEL-001/DC-CONTEXT-001/DC-ACTOR-001 overlays | Complementary intent; upstream uses a different admission protocol | behavior, tests | shared main: FC-001/009, FD-002/009; existing compat overlays retain their owners | Inherit shared adaptation after atomic admission and candidate validation, before admission success and the new loop. The complete startResume/resume block matches main; session/runtime/server matrices pass, including rejection non-mutation and successful 400 recovery |
| C02 | Preserve session-diff line endings | Adopted upstream session-diff implementation and tests | Same two UI blobs | No fork overlap | behavior, tests | shared main; no FD/FC/DC override | Inherit packages/ui/src/components/session-diff.ts and its test unchanged from upstream. Main executed 8 tests and UI typecheck; compat evidence is exact blob and package/lockfile equality, not a repeated test run |
| C03 | Supply App language fixture intl() | Existing zh-CN fixture and two titleLocale assertions subsume upstream en-US fixture | Same unchanged App submit fixture; DC-TUI-001 evidence adjacency | Equivalent fixture capability with stronger fork assertions | tests | shared main: FC-001 locale contract; DC-TUI-001 presentation owner unchanged | Preserve packages/app/src/components/prompt-input/submit.test.ts and both locale assertions. Main executed 5 tests and App typecheck; compat inherits equal fixture, producer, package, and lockfile blobs |
| C04 | Isolate enterprise storage test HTTP | New package preload and bunfig, adopted from upstream | Same fixture, storage/share producers, and tests | No fork overlap | test configuration, tests | shared main: FC-008 | Inherit packages/enterprise/bunfig.toml and test/preload.ts byte-for-byte from upstream. Main executed 16 storage/share tests and enterprise typecheck; compat inherits those blobs and unchanged package/lockfile inputs. No live S3/R2 or general network-isolation claim |
| C05 | Propagate accepted synchronization skill | Already accepted in main at 95b592e0 | File absent at prior compat; now identical to accepted main | Main-to-compat documentation propagation; outside upstream increment | process documentation | shared main: FC-008/012 | Inherit .mimocode/skills/upstream-sync/SKILL.md unchanged. Exact blob equality proves propagation; no new runtime behavior, compat owner, or duplicate consolidation |

Inventory and result counts are both five. The six FD and sixteen FC entries
remain active and are inherited byte-for-byte from accepted main, as is the
shared history. No compat owner was added, retired, renumbered, or promoted.

### Compat owner review (7/7)

| Owner | Incoming overlap | Preserved result and evidence |
| --- | --- | --- |
| DC-NET-001 | No overlap | WebFetch/SSRF source and tests have no incoming delta. The three-line approved-private-target call-seam override, per-hop asks, and resource bounds remain unchanged |
| DC-NET-002 | No overlap | MCP source remains byte-identical to main; the existing RFC1918 lifecycle sentinel retains mocked client-creation scope with OAuth disabled |
| DC-PLATFORM-001 | No overlap | Ripgrep/archive source and tests are unchanged; restricted-network and Windows fallbacks retain their failure and fixed-cwd boundaries |
| DC-MODEL-001 | Direct prompt-path overlap; MaxMode semantic adjacency | Per-agent opt-in, final-step and structured-output gates, hidden-title routing, and retry-status isolation retained; session and MaxMode/context matrices pass |
| DC-CONTEXT-001 | Direct prompt/recovery overlap | Caps, active-tool preflight, current-turn recovery floor, effective window, external-admission checks, checkpoint chronology, and published contract retained; session/server/MaxMode-context matrices pass |
| DC-ACTOR-001 | Direct prompt-path overlap; full-context semantic adjacency | Main-only recovery does not broaden actor identity; frozen membership/system/tools/permissions/cwd and static-prefix failure retained by unchanged source and session/overflow regressions |
| DC-TUI-001 | App locale-fixture semantic adjacency; no TUI component overlap | Provider/model/variant metadata and both titleLocale submission paths unchanged. Existing App locale assertions are inherited unchanged; known variant-display limits remain recorded |

### Merge review and evidence boundaries

- Relative to prior compat, the only opencode production change is the
  15-line `startResume` validation hunk in `src/session/prompt.ts`. The complete
  `startResume` and synchronous `resume` block is byte-identical to accepted
  main. Other compat production owners and their established boundaries have
  no incoming source delta.
- The sole textual conflict was in `test/session/prompt-effect.test.ts`, where
  new recovery cases met the existing assistant type narrowing. Local hunk
  resolution retains all new cases and the same type predicate in the enhanced
  400-provider-error case; it does not replace the surrounding compat tests.
- Settlement occurs after runner ownership and candidate validation, before
  admission success and the new loop. Busy publication still precedes this
  work; the change does not promise storage mutation before every status event.
  Existing finalizer idempotence, main-only recovery identity, locale propagation, and
  frozen/context ownership remain intact.
- The gate-based recovery tests observe completed/abandoned state while
  `session.pre` blocks model dispatch, then require a new assistant and actual
  answer with the original user parent and partial context. They preserve
  existing user metadata and parts while allowing established synthetic
  skill-catalog additions. Busy, stale-candidate, and pre-work cancellation
  controls require complete persisted message snapshots to remain unchanged.
  No claim is made that all exceptional candidates with a nonempty finish
  reason become newly recoverable.
- UI and enterprise fixture files match the selected upstream exactly. The
  App fixture, synchronization skill, shared registries, and MCP production
  source match accepted main. All package manifests and `bun.lock` match main;
  manifests, lockfile, SDK/OpenAPI artifacts, and workflows are unchanged from
  prior compat. No SDK generation or unrelated consolidation was needed.

### Local compat validation

Stable compat matrix: **331 pass, 2 existing skip, 0 fail** across 14 opencode
test files. These are completed compat runs, verified against their command
records and terminal logs; they do not include main's 29 non-core tests.

| Group | Files relative to packages/opencode | Pass / skip |
| --- | --- | --- |
| session | `test/session/prompt-effect.test.ts`, `test/session/llm-request-prefix.test.ts`, `test/session/fork-prefix-invariant.test.ts`, `test/session/checkpoint-fork-mode.test.ts`, `test/session/replace-agent-subagent.test.ts` | 151 / 2 |
| runtime | `test/effect/runner.test.ts`, `test/session/run-state-tuple-key.test.ts`, `test/session/run-state-dispose.test.ts` | 61 / 0 |
| server | `test/server/session-recovery.test.ts`, `test/server/session-prompt-busy.test.ts`, `test/server/openapi-refs.test.ts` | 16 / 0 |
| MaxMode/context | `test/session/max-mode.test.ts`, `test/session/max-mode-econnreset.test.ts`, `test/session/overflow.test.ts` | 103 / 0 |

Run each row separately from `packages/opencode` using
`bun test <row files> --timeout 120000`. All four recorded commands cleared
`MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`,
`MIMOCODE_CODEX_MODE`, `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`,
`MIMOCODE_COMPACTION_MAX_CONTEXT`, `MIMOCODE_COMPACTION_TRIGGER_RATIO`, and
`MIMOCODE_DISABLE_CHECKPOINT`. The package preload retains
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` and its managed fixture defaults;
this is the package harness baseline, not an isolated-runtime default-off proof.
Package `bun typecheck` and repository `bun lint` also exited zero.

Main's UI/App/enterprise runs total 29 passes and are recorded in shared
history. They were not repeated on compat: exact inherited source/test/fixture,
package-manifest, and lockfile equality supplies the stated inheritance
basis. The normal opencode CI workflow does not replace those explicit
non-core checks.

The accepted main tip `774a795682c648b7f3637b9159c063ef6a2a4018` has successful
exact-SHA [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/34092812586),
[typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/34092812580), and
[lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/34092812567) runs; the
test run includes all four shards and the isolated stdio observer. This main
evidence does not stand in for the final compat documentation SHA.

Final compat documentation publication and successful CI for each exact final
branch SHA, remote-tip equality, and selected-upstream-to-main-to-compat
ancestry remain separate synchronization completion gates. No pending CI is
reported as successful by this record.

## 2026-09-07 explicit basic audio adoption

- Mode: specified AUDIO-01 change; reviewed upstream remains
  `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`.
- Prior compat: `bf85673a521537b5cb44002401eb55ad856e4009`.
- Inherited main behavior: `9847165e0749f33c7ac01b72f933ac9cf47e3e55`.
- Compat behavior merge: `9f3e37daa94e2b28d85c3a758e0241307f3eceff`.
- Accepted main registry companion: `f45bbccddb5d6d532f6ad8ff2acc2c93a625dddb`.
- Shared-audit inheritance merge: `bfe7c3a418c8ec878c7f79f65f7466cfe0226585`
  changes documentation only relative to the verified compat behavior.

### Capability inventory and result (1)

| ID | Main contract | Compat disposition | Verification |
| --- | --- | --- | --- |
| AUDIO-01 | Explicit speech/transcription on the existing serve socket, dedicated Bearer before body/bootstrap, fixed directory and bounded/cancellable requests | Inherit every selected source/test unchanged, with no conflicts; all seven DC owners remain active | 227 tests across nine affected files, package typecheck, source-derived SDK/OpenAPI and Node admission smoke |

DC-MODEL-001 and DC-CONTEXT-001 have generated-schema adjacency; regenerated
artifacts stay byte-identical to the existing compat artifacts. DC-TUI-001 is
adjacent to the unchanged TUI voice path. DC-NET-001, DC-NET-002,
DC-PLATFORM-001 and DC-ACTOR-001 have no changed owned path. The new provider
HTTP adapter does not modify WebFetch policy, MCP routing, session/actor context,
MaxMode or model-status projection. Shared FD/FC registries and history remain
identical to accepted main. The newer upstream tool-name case flag is excluded.

Validation at the recorded behavior:

- **227 pass, 0 fail, 716 assertions**, nine files: audio protocol/transport/service,
  Provider, audio HTTP/admission/shared-bootstrap cancellation, OpenAPI and TUI
  voice. Main's corresponding matrix is 225 pass / 0 fail.
- `bun ci` preserves the lockfile; package `bun typecheck` passes. The SDK build
  and published OpenAPI generation leave tracked artifacts unchanged.
- Node build and plain Node v24.16.0 smoke pass: default audio returns four 404s,
  explicitly enabled wrong-credential requests return two 401s, with no `Bun`
  global or database creation. Successful audio requests are covered by the local
  HTTP fixtures, not a live paid provider call.
- The seven ambient default-path selectors are removed; package preload retains
  its Orchestrator flag. The separate non-test child additionally removes it and
  proves that an API key alone cannot enable audio.
- Later registry commits do not change these source/test trees. Exact final
  branch-tip CI, remote equality, main-to-compat ancestry and excluded upstream
  commits are checked after publication; none is implied by the local matrix.


## 2026-09-07 explicit model API propagation

- Accepted main tip: `4d876d54a304689db1f86e5f6f8f0da577d0f5d4`.
- Inherited main source/test behavior: `3c361041eedb84e67e2c86e2fca1cd7c880e7d3f`.
- Prior compat tip: `94a8b3b0e0b57fa2b8344b59a723aa514469cb61`.
- Compat source/test behavior: `072b557f2176f12d46271f0b111144d3fd26ddab`.
- Shared-audit inheritance merge: `d5e067fed337d78d8b52a8d660e51df57088372c`. Later registry-only changes do
  not advance the main or compat behavior reference.
- Inventory N=2: MODEL-01 capability discovery and MODEL-02 explicit scoped
  chat/audio proxy plus finite temporary tokens are both inherited unchanged.
  FD-004 remains the shared owner; no eighth DC entry is introduced.
- All seven active owners were re-reviewed. MODEL/CONTEXT/ACTOR have semantic
  adjacency; NET/PLATFORM/TUI have no incoming owned path overlap. Standard
  proxy calls do not execute agent tools, MaxMode, compaction or actor context.
- Source invariance: the prior 92 non-registry delta paths have the same path
  set and identical old/new blobs on each side after propagation. The incoming
  source paths have no intersection with that compat delta. Shared FD/FC and
  history are inherited byte-for-byte from accepted main.
- Validation: **336 pass, 0 fail** across 16 affected test files with the same
  default selectors and package 30-second test budget as main; package
  typecheck and repository lint pass (warnings retained). Generated JS SDK
  and published OpenAPI are unchanged after regeneration from compat source.
  Node v24.16.0 builds and exercises token lifecycle, scoped discovery and real
  non-stream/SSE chat with no Bun global; the smoke host explicitly exits after
  listener/instance disposal. Ordinary default-off routes remain 404.
- Changed-path calculation, inherited main behavior to compat behavior with
  the five registry/history paths excluded: **92 files changed, 10497 insertions(+), 2115 deletions(-)**. Final remote-tip,
  exact-SHA CI, and selected-upstream/main/compat ancestry are verified at
  publication, separately from this local source/test evidence.


## 2026-09-07 selected harness, schema experiment and actor recovery

- Mode: specified ALIAS-01 / SCHEMA-01 / RECOVERY-01 propagation. Selected
  upstream stays `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; no upstream fetch or
  unrelated upstream integration is performed by this operation.
- Prior compat tip: `a6cbcb3b61a98eb9abbe5e1aa2a06880f1c5f286`.
- Accepted final main tip: `c1dfc423fe021072d37b8585b5bcc33c4742d514`.
- Inherited main source/test behavior: `f9e8a8a4f8be6cb826319e7dfa20c680606f6601`.
- Compat source/test behavior merge: `e9e0a6b57a0a865927afaba5316782cdc0af7ee4`.
- Final shared-audit inheritance merge: `c7e154ded8c2ac4c4dd950b1040d065a939c5f65`. Semantic
  reconciliation kept the two pending-external checks, continuationMessageID
  tracking/cleanup, and successful-write receipts together. The resulting
  source/test/generated hashes equal the validated compat behavior snapshot;
  only documentation differs from that snapshot. Later registry commits do
  not advance either source/test behavior reference.

Capability inventory N=3, all canonically owned by shared main:

| ID | Main contract | Compat result | Decisive evidence |
| --- | --- | --- | --- |
| ALIAS-01 | Explicit trusted harness_model, session/process/inference precedence and identity exclusions | Inherit the shared resolver and trust provenance; carry the identity through compat frozen prefixes, compaction and per-agent routing | harness-alias and request-prefix tests; same-source cold writer identity assertion; generated Config/Provider model fields |
| SCHEMA-01 | Standalone read/glob/grep declaration experiment with unchanged permissions, validators and executors | Inherit the experiment and its regressions; keep production tool exposure unchanged | 19 experiment tests within the final compat matrix; the versioned main experiment report remains separately attributed, not a compat live-quality claim |
| RECOVERY-01 | Registered persistent/full actor resume with frozen receiver/model context, persisted task source and atomic ownership | Preserve required turnContext, current-turn/active-tool preflight, chronology and external-request guards while inheriting owned continuation receipts | Real spawn/interruption/resume/idle-cancel and source/race regressions; eight compat integration cases (90 assertions), including compaction, invalid output, foreign hook and lost CAS |

All seven DC entries were re-reviewed and remain active. DC-MODEL-001,
DC-CONTEXT-001 and DC-ACTOR-001 have real agent/prompt/prefix/compaction/
checkpoint/actor/generated overlaps. Per-agent MaxMode and final-step bounds,
content caps, effective-window preflight, frozen MCP/tool membership, coverage,
chronology and static-prefix failure behavior remain. The cold fork:false writer
now carries modelIdentity from its own writerPrefix; it does not borrow a live
or parent identity. Public session recovery/resume stays main-only, while the
internal actor tool admits the explicitly supported retained-context lifecycle.

DC-NET-001, DC-NET-002, DC-PLATFORM-001 and DC-TUI-001 have no changed owned
implementation; their 16 explicit owned source/test paths are byte-identical to
the prior compat tip. MCP production also equals main. Of the 92 prior
non-registry main/compat delta paths, 16 overlap the selected incoming work.
The other 76 paths have 75 unchanged blobs and one deliberately strengthened
checkpoint-fork-mode test asserting the cold writer identity. These blob and
marker checks establish preservation scope, not behavioral correctness alone.

Final local validation:

- **771 pass, 4 skip, 0 fail, 2,858 assertions**, 65 files under the package's
  30-second per-test budget. The declared live/legacy skips remain. The matrix
  covers actor/inbox/Runner, checkpoint/compaction/prefix/overflow, request
  admission, MaxMode, actor tools, alias inference, experiments and OpenAPI.
- Source/test/generated snapshots did not change during validation or the later
  shared-audit merge. Shared FD/FC registries and history inherit final main
  byte-for-byte. All seven current DC Base/Overrides/review references name the
  source/test commits recorded above.
- Opencode and JavaScript SDK package typecheck, repository lint (zero errors,
  warnings retained), git diff checks, Node bundle and plain Node import/alias
  schema smoke pass. Frozen bun ci preserves bun.lock.
- Two owning SDK/OpenAPI generation rounds are idempotent across 45 tracked SDK
  files. The 141-operation compat contract retains MaxMode, checkpoint coverage,
  compaction projection and callable-v2 checks while adding the two shared
  harness_model fields. Internal recovery receipts add no public selector.
- The same seven ambient selectors are cleared before imports; package preload
  retains orchestrator=true as the harness baseline. The inherited separate
  non-test default-off proof and unchanged main alias trust regressions remain
  separately scoped; this matrix does not claim a new live provider benchmark.
- Independent source review confirms successful conditional-write receipts
  grant only owned continuation authority. A failed compaction CAS can finish
  the owned summary without writing another user or issuing another request;
  neither failure labels nor matching external hook metadata grant authority.

Final fork remote equality, successful active-workflow CI for both exact final
branch tips, selected-upstream/main/compat ancestry, and excluded upstream
commits are checked at publication. Local validation alone is not that proof.


## 2026-09-08 Codex compact tools specified propagation

- Mode: specified COMPACT-01 propagation, capability inventory N=1. Selected
  upstream remains `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; no upstream ref
  or release tag was advanced and no unrelated newer upstream work is included.
- Prior compat tip: `ad7b70702ef77cacb4a83189e0fff30d480d0c66`.
- Accepted final main tip: `588d183d5e8b944fa613205e55b41d805d7d5231`.
- Inherited main source/test behavior: `1ad318dc86895a63763fe47bfa965ca8d5b3d45b`.
- Compat source/test behavior: `15219ecfe351c07ebf5162f2f7b44422e9925b58`.
- Shared-audit inheritance merge: `15219ecfe351c07ebf5162f2f7b44422e9925b58`. Later registry/history changes
  do not advance either behavior reference.

| ID | Main contract | Compat result | Decisive evidence |
| --- | --- | --- | --- |
| COMPACT-01 | Automatic Codex compact advertisements, direct actor/interactive controls, request-pinned hidden executors and permissions | Inherit shared behavior while preserving all seven DC contracts, full frozen executor membership and active-only request budgets | Real SDK wire and permission cases; frozen prefix/checkpoint and legacy active-mask regressions; actor/MaxMode/preflight matrix |

DC-MODEL-001, DC-CONTEXT-001 and DC-ACTOR-001 have direct prompt, prefix,
checkpoint, compaction or actor overlap. Per-agent MaxMode, shared runStep,
final-step tool limits, UTF-8/content caps, current-turn context, chronological
coverage and unrecoverable static-prefix failure remain. Both external-request
guards, continuation tracking/cleanup and successful conditional-write receipts
retain their owned admission semantics. Network/platform/TUI owners keep their
existing contracts; there is no eighth DC owner.

New all-boolean active flags in the shared snapshot JSON take precedence over
the legacy compat active_tools column. Old or mixed snapshots still honor that
column, including an explicit empty array; missing legacy metadata falls back
to all stored tools. Restoration retains the complete frozen authorized pool,
while preflight and compaction count only advertised descriptors, including the
actual exec declaration text. loaded_mcp_tools remains a compat hash dimension.
This avoids dropping hidden native tools or reactivating stale legacy names.

The 94-path prior main/compat delta is partitioned into 76 protected unchanged
paths, 14 incoming overlaps, one explicitly reserved actor wire-test oracle,
one shared frozen-schema fixture adaptation, and two compat registry/history
paths. All 76 protected paths retain their original blob and mode on both sides. The final MCP search dispatch correction
is inherited identically, with no new compat production fork. Three generated
SDK/OpenAPI blobs retain the prior compat versions; public schema inputs did
not change, so this operation does not claim a fresh generation round.

### Validation

- Effective affected inventory: **2,601 pass, 0 fail, 26 skip, 1 todo and 7,362 assertions
  across 192 files**. The existing instruction-suite todo is
  retained, not counted as a pass. Evidence combines 186 unchanged complete
  files with the final complete classifier, request-flow and actor files, plus
  the newly included system, agent and live-default test files.
- The original frozen `ae7a405858628a400f268f738635628a5eb7304c` matrix recorded
  2,461 pass, 2 fail, 13 skip, 1 todo and 6,733 assertions: 187 file passes,
  one classifier failure and one actor file wall timeout. Those records remain.
  The classifier fixtures had incompatible handmade or missing schemas; their
  corrected parent captures pass 13 cases and 49 assertions, including a separate
  schema-drift rejection. Grep uses its real schema so its whitelist rejection
  remains independent of the schema gate.
- Actor's complete 600-second-wall follow-up passes 66 cases and 337 assertions
  in 137.962 seconds. The original incomplete file is not counted twice or
  relabeled as a pass. The inherited cancellation test separates initialization
  from its preserved three-second cancel/join bound; the final entire request-flow
  file passes 142 cases, 2 skips and 765 assertions. Its earlier green result is
  replaced, not added to the effective totals.
- Within the original matrix, only the classifier and request-flow test files
  changed; production and all other selected tests remain unchanged. The three
  added system, agent and live-default files correct shared expectations exposed
  by main CI and observe retained nested effects using the existing projection.
  Their final complete runs add 71 pass, 13 skip and 281 assertions. The
  live-default result does not execute the 13 skipped provider cases. The classifier merge preserves
  compat required turnContext and is byte-identical to its earlier validated
  file. Hash evidence separates inherited
  validation from the replacement runs. All eight ambient selectors and scoped
  MCP search test flags follow the shared main ledger, retaining package preload
  defaults. Per-case budgets are 30 seconds by default and 90 seconds for the
  two long actor/request files; file walls are 180 seconds normally and 600 seconds
  for the explicit long-file runs.
- Owning-package typecheck, repository lint (4,449 warnings, zero errors),
  Node bundle and plain Node v24.16.0 import/export smoke pass with no Bun global.
  Production did not change after that build. Frozen bun ci preserves bun.lock;
  source-derived public SDK/OpenAPI inputs are unchanged. No live-provider token,
  error-rate or task-completion benchmark is claimed.

Shared FD/FC registries and main history inherit final main byte-for-byte.
Exact final remote-tip equality, test/typecheck/lint CI and selected-source
ancestry through main to compat are checked separately at publication. This
specified propagation does not claim current-upstream parity.


## 2026-09-08 selected Actor/MCP completion

- Previous compat tip: `9d076e1bd1ec13d6a5f1a62459d13585c25f2b55`.
- Inherited main source/test behavior: `cedd542f215424ccde54d0a779b6747dc2b34d28`.
- Compat source/test behavior and inheritance merge:
  `972b3b3195e1ef3b9cba7ab4e3989046164c7aad`.
- Shared audit commit: `9b3823b7a40c716ed8f2adcd58af56a90d63c692`.
- All 3/3 selected capabilities are inherited with main as canonical owner;
  see [the shared capability results](upstream-integration-review-2026-09-08.md).
  The six FD, sixteen FC and seven DC owners remain active.
- Ten of the 95 pre-existing main-to-compat delta paths overlapped incoming
  implementation/contracts. Before this registry update, the other 85 paths
  retained their original compat blobs. The only conflict was the OpenAPI test:
  keep compat's generatedOpenapi producer, checkpoint coverage and callable-v2
  samples while adding the controlled actor selector/no-task-override assertions.
  Both generated artifacts reproduce the merge result from compat source.
- DC-CONTEXT-001 and DC-ACTOR-001 retain required turnContext, request preflight,
  current-turn floor, pending-external guards, continuation receipts and UTF-8
  state caps. The added HTTP seam regression changes live parent and receiver
  prompt data after capture and verifies the original Unicode context exactly
  once in both append and replace-agent modes. It introduces no production
  override. The same HTTP-to-Actor-to-startResumeTurn-to-runLoop path reaches
  existing frozen preflight, whose oversized-static/history/no-progress cases
  run in the complete matrix.
- DC-MODEL-001 retains per-agent MaxMode and main-only status publication;
  DC-NET-002 retains RFC1918 MCP behavior alongside explicit auto_connect;
  the other network, platform and TUI owners have no incoming implementation
  overlap. Shared sandbox active cancellation and exec cleanup are inherited
  unchanged from main.
- Final local validation: tools/sandbox 168 pass; config/MCP 126 pass; public
  contracts 16 pass; HTTP actor recovery 9 pass; context/actor/checkpoint
  303 pass, 2 pre-existing skips, 0 fail. Those skips are the existing Bash
  cancellation timing fixtures; this operation added no skip. Owning opencode
  and SDK package typechecks pass; lint reports zero errors (4,462 warnings).
  Frozen bun ci leaves bun.lock unchanged. Every final matrix clears the four
  ambient selectors listed in the shared review; context matrices also clear
  checkpoint/max-context/ratio selectors, preserving package ORCHESTRATOR
  preload and test isolation. Generated OpenAPI/SDK match the merged artifacts.
- Final branch publication is checked using remote-tip equality, exact-SHA
  test/typecheck/lint results and selected-upstream-to-main-to-compat ancestry.
  This specified integration does not claim alignment to newer upstream main.


## 2026-09-08 Actor/MCP CI correction inheritance

- Previous published compat `a03186c0` passed lint/typecheck but failed test
  shard 4 on two obsolete actor exclusions and nine HTTP cases sharing a
  captor overwritten by independent unit-test layers. That publication was
  not accepted as complete.
- Inherited main source/test behavior is
  `224920e08eb3506214f540f1411cc7bd9f26a87e`; compat behavior and source
  inheritance merge are `100abd923867627ac9de7998993b5d4e51e92d92`. Shared
  audit commit is `2d90dfd732a95dc5e5e601e783994860abddde1f`.
- Inheritance changes only three actor contract tests and shared FC-008 CI
  process isolation. Runtime/SDK/OpenAPI source remains byte-identical to
  compat behavior `972b3b31`; all seven DC overrides and the extra frozen
  turnContext HTTP case remain intact. No compat-only runtime adaptation or
  new capability is introduced.
- The isolated HTTP suite passes all nine cases with 161 assertions and zero
  failures/skips, including append/replace-agent and receiver variants. The
  dedicated job retains per-case JUnit, expected-file and nonzero-execution
  checks. Shared path-hash membership changes only by moving this file to its
  own process. Owning package typecheck passes; default test environment clears
  all seven selectors documented in the shared review and retains the package
  preload baseline.
- Final publication requires fresh remote-tip equality, successful exact-SHA
  test/typecheck/lint, and the selected upstream to main to compat ancestry.
  First-publication failures and earlier local matrices are not substituted
  for those final remote checks.


## 2026-09-08 released model API capability inheritance

- Previous compat tip: `3737e4d32a3cfd61a843ef55fd11c6b8dbc35d12`.
- Accepted main tip: `85dfc3f2edbd1eca5cf92daa3521a7bcf2027cb5` (PR #76).
- Inherited main runtime/test behavior:
  `07ca6cea1ac8a3231701d4ec07b489b713741cd7`; shared audit commit:
  `128a527bdb25f9846a7c85b61b81ed435772acb2`.
- Compat runtime/test behavior and actual inheritance merge:
  `8c73cc2b19b50724a17f8a6d9d77aa300c40d9ff`. Inherited bundled guidance content:
  `3cb9d8df7d453d8995de22f3242eee4bc81f6e97`. Pure compat registry/history
  changes do not advance these implementation or content snapshots.
- All six selected capabilities are inherited, with main as canonical owner:
  MEDIA-01, AUDIO-02, ASR-03, OPTIONS-05, SCOPE-06, EXPIRY-07. See the
  [shared six-row inventory](released-model-api-review-2026-09-08.md). User
  item 4 voice design/cloning remains excluded. The overall upstream review
  baseline remains `6203ea2e`; this is not a full upstream sync.
- The actual merge has no conflicts. The complete binary diff for
  `2d90dfd7 -> 3737e4d3` is byte-identical to `85dfc3f2 -> 8c73cc2b`:
  SHA-256 `97278c8d3f1f6bdf806a4e99bce535a91836cebc3a8d2e610072b7d8fd7b4cf1`.
  All 96 existing overlay paths retain their original blob pairs; all 38
  incoming paths equal accepted main. Separately, all 44 existing production,
  migration and generated overlay paths retain their original blob pairs,
  including the existing SDK/OpenAPI differences.
- All seven active DC were reviewed on that actual merge. DC-PLATFORM-001
  has no incoming adjacency; the two network, model, context, actor and TUI
  owners have semantic adjacency but no incoming path overlap or new override.
  Per-agent MaxMode, frozen full-context/preflight, display metadata and
  restricted-network/platform fallbacks remain intact.
- DC-NET-001 still removes exactly WebFetch's classifier import and two calls.
  The separate image downloader inherits main byte-for-byte and still checks
  public DNS addresses and redirects. Shared SSRF and MCP production source
  also equal main. DC-NET-002's private-address sentinel covers mocked client
  construction, not a live private-server connection or image permission.
- The shared FD/FC registries, shared history and builtin guidance inherit main
  unchanged. Only this compat registry/history is updated after the source merge.
  SDK/OpenAPI producer inputs remain unchanged; no copied or hand-edited
  generated output is introduced.
- Final compat affected API matrix: **734 pass, 0 fail, 0 skip and 2,272
  assertions across 21 files**, 268.24 seconds. JUnit verifies exactly the
  expected 21 files and 734 executions. Compared with main's 732-case matrix,
  the two additional cases are existing compat OpenAPI contract tests; no
  new compat-only feature test is introduced by this merge.
- Owning opencode typecheck passes; repository lint reports 4,507 warnings and
  zero errors. Frozen bun ci preserves bun.lock. The same seven default
  selectors as the shared review are removed, retaining package preload flags.
- Complete compat Node build and actual bundle smoke pass on Node v24.16.0,
  including finite/multi/all scope, four lifetime combinations, permanent
  revocation, default-off four routes with a valid token, and runtime/published
  OpenAPI omission. It uses a new isolated home and fixed local model catalog,
  removes orchestrator in addition to the four primary selectors, and loads no
  Bun test preload. Main's seven Node image probes are not counted as a second
  compat run; identical image source plus compat's full Bun image suite verify
  inheritance separately.
- Targeted compat owner checks, reported separately: approved private WebFetch
  1 pass; isolated RFC1918 MCP client sentinel 1; platform fallback/archive 12;
  MaxMode unit file 15 and actual prompt retry/final-step sentinels 2; context
  preflight/overflow 16; full-context actor/checkpoint 11; TUI model metadata
  and mapping 20. Every group has zero failures and skips. The MCP check is
  client-construction evidence; macOS platform checks do not claim Windows
  host end-to-end coverage. These focused results are not a complete rerun of
  all historical DC evidence.
- Independent actual-tree and registry review found no new override or scope
  expansion. Final publication still requires successful test/typecheck/lint
  for both exact remote branch tips, fresh remote equality and ancestry from
  the selected baseline through main to compat. Only this operation's clean,
  integrated worktrees/branches are eligible for cleanup; earlier Agent work
  remains protected by the saved HEAD/status/diff/untracked hashes.


## 2026-09-08 MEDIA-DNS-01 inheritance

| Inventory (N=1) | Main accepted | Compat inheritance |
| --- | --- | --- |
| MEDIA-DNS-01: validated image-address connection fallback, a repair to MEDIA-01 | PR #78, `1f88fded9402ebcb2f6379477d77f7d8d15549a2`; source/tests `d5798519cd1227ab4061bd69ef9efc5f483b74d8` | Tested candidate `76685956e50b49605b92b681fae8e647512078c4`; actual-main ancestry merge `cdf6820c4fd151ad4b55fd9f7540c89f32ad1dbd` |

- Prior compat is `14716fe320c6271b3c0157bbccf686efd3fc2ace`. Candidate
  `76685956` first inherited main candidate/audit `f11b25e8e7ecdb1351cb10af8200253ea7f3920a`.
  Actual main `1f88fded` has exactly that candidate's tree. The later compat
  ancestry merge `cdf6820c` has exactly `76685956`'s tree, so the local results
  below describe one tested runtime/test tree, not a second run on the ancestry
  merge. Shared audit is `f11b25e8`; bundled guidance remains
  `3cb9d8df7d453d8995de22f3242eee4bc81f6e97`, and overall upstream review remains
  `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`.
- Before this compat-only documentation update, the complete binary diff
  `85dfc3f2 -> 14716fe3` equals `f11b25e8 -> 76685956`, with 96 overlay paths
  and SHA-256 `70ffad2aa5aba24646ab2cd45f5366e3d7d5532bcfe9f550ee962dda1d4e26aa`.
  The two tree equalities also establish the same overlay at actual main and
  its compat ancestry merge. Image implementation, tests and fixture, and the
  shared FD/FC/history documents are byte-identical to accepted main. Existing
  SDK/OpenAPI differences are preserved; no additional generated delta or DC
  is introduced. This entry does not rewrite the previous six-capability audit.
- All seven active DC were reviewed. NET-001, NET-002 and CONTEXT-001 have
  semantic adjacency but no changed overlay carrier; PLATFORM-001, MODEL-001,
  ACTOR-001 and TUI-001 have no relevant changed carrier. Images retain the
  shared connection-error whitelist, fully validated public DNS candidates,
  pinned addresses, original Host/SNI/TLS identity, cancellation, and existing
  request/media bounds. TLS, HTTP and body failures do not retry another address.
  WebFetch's private-target exception stays confined to its existing call seam;
  MCP production and its private-address characterization are unchanged.
- Final local compat validation: 277 pass, zero fail, zero skip, 703 assertions
  across five files in 48.27 seconds; the coordinator independently checked
  JUnit counts. Package typecheck passed; repository lint reported 4,512
  warnings and zero errors. The run unset `MIMOCODE_EXPERIMENTAL`,
  `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`,
  `MIMOCODE_CODEX_MODE`, `MIMOCODE_COMPACTION_MAX_CONTEXT`,
  `MIMOCODE_COMPACTION_TRIGGER_RATIO`, and `MIMOCODE_DISABLE_CHECKPOINT`, while
  preserving package-owned preload flags. The WebFetch RFC1918 regression uses
  a controlled HttpClient; it is not a live private-network or MCP test.
- Independent network probes on the shared main source passed the same ten
  cases on Node v24.16.0 and Bun 1.3.14, ten passes and zero failures each.
  These were not rerun on compat. Equal image blobs establish source inheritance;
  the probes map validated public numeric candidates to real local temporary
  sockets, not live public/IPv6 routes. They do not establish Happy Eyeballs.
- PR #78's main candidate `f11b25e8` passed three workflows/eight jobs before
  merge. Codex completed at 2026-09-08T07:14:39Z with zero review threads at that
  candidate. These are pre-merge candidate results: final-main push CI was still
  running at this checkpoint, and the compat PR and push CI were pending.
  Final remote-SHA publication and ancestry verification remain separate gates.
  Pure compat registry/history changes do not advance the runtime/content bases.

## 2026-09-08 specified compaction-trigger alignment

- Scope: COMPACTION-01. Inherits main source
  `fd285d92a3779b583a9ca82842516c863eb743bf` and its shared audit, from
  original compat `f0a4e9b8735ef4f27f2361bc8194adf957c976b1`.
  Final compat source/test behavior is
  `cd203928f9e8cae7353607233cfe89d3dae15a4b`; later documentation merges do
  not advance that behavior basis. The overall upstream review baseline
  remains `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`.
- DC-CONTEXT-001 now uses the shared ratio trigger directly for request
  preflight, removing the extra 5K (or 10% on small windows) advance. It keeps
  real wire estimation, active tool schema selection, current-turn content,
  recovery-floor classification, and bounded recovery. Full request estimates
  and previous provider usage remain distinct observations of the same
  numeric threshold.
- All seven owners were reviewed for this selected behavior: CONTEXT-001 has
  direct implementation changes; ACTOR-001 retains frozen-prefix and stalled
  recovery behavior; TUI-001 retains its provider/model/variant metadata while
  inheriting truthful budget previews; MODEL-001 has shared configuration and
  schema adjacency without a routing change. NET-001, NET-002 and PLATFORM-001
  have no changed owned implementation. No eighth override is introduced.
- The two merge conflicts were test-only: TUI model tests retain the compat
  metadata/variant groups plus the shared budget-preview group; projection
  tests retain mandatory external-user/spawn tails and the shared ratio-window
  check. Shared code and generated descriptions inherit semantically, while
  compat request estimation remains an intentional branch difference.
- Local validation: 85 overflow cases, 84 related cases across seven files,
  and 14 request/frozen-preflight/MCP-pressure/recovery-budget cases all pass
  (183 total, zero failures, 512 assertions). Package typecheck and diff check
  pass. Two schema fixtures were enlarged to remain over the new threshold;
  the stalled-summary fixture now uses an 18K window so its 50KiB-capped
  replay still exceeds 16.2K. Recovery assertions and limits were preserved.
- Tests unset the three required ambient selectors plus
  `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`, `MIMOCODE_COMPACTION_TRIGGER_RATIO`,
  `MIMOCODE_COMPACTION_MAX_CONTEXT`, and `MIMOCODE_DISABLE_CHECKPOINT`.
  Package preload, including `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`, was
  retained. Actual remote tips, PR review and exact-SHA CI are separate
  publication gates and are not established by these local results.

### 2026-09-08 PR #80 review propagation

- Accepted main `df9a263bdfa60f762b0c90b6126a774ef60737ed` is inherited at compat behavior
  `4f7a82b89d43248f3396820dff5fc015356d4d2e`. Main Codex review completed on PR head
  `cf1e00be3279b97589fe6ffa58e40cc06f6dc46b` with no new findings after
  the two P2 corrections. This records main review only; compat review and
  exact-head CI remain independent publication gates.
- `/status` inherits the `headroom` label for `effective - usable`; the active
  Compose specification uses the ratio formula and marks previous formulas
  and measurements as historical. FC-015 is inherited unchanged.
- DC-CONTEXT-001's Base, Overrides and Review basis now identify the same
  accepted behavior. Its numeric preflight threshold remains aligned with
  main, with no additional 5K/10% advance. Historical reserve decisions
  remain dated records.


## 2026-09-08 POLICY-06 yolo approval inheritance

This specified-change propagation inherits PR #82 after its current head
`eca7be824261a773afae3acbd149a1271a687756` received Codex Completed with a +1 and no findings, all eight
PR checks succeeded, and the PR merged into main `bfa3c2466d07da01881b252a0337ac444b4ae927`. The accepted main
tree equals the reviewed PR tree. The overall upstream review baseline remains
`6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; no unrelated upstream commit was merged.

- Prior compat: `20c286a09324b8cb3a5d09e60feadf0e1b6572a0`.
- Inherited main runtime/tests and bundled guidance: `6df77610eed88d86d674c6fd145852c5b4208289`.
- Tested integration candidate: `b190bc6b`.
- Accepted-main ancestry merge and compat behavior: `8b265508032ac27554ec71c54b1f49bebf10cbc8`.
- Candidate and final ancestry merge have the identical tree
  `9579b162f0773e3d24f73b1c2590e00162b6d6c0`. These are distinct provenance
  references, not duplicate runtime test runs. Registry-only commits do not
  advance either source reference.

| Capability | Result on compat | Preserved owners |
| --- | --- | --- |
| POLICY-06 | Inherits startup yolo deletion, explicit deny priority, live CLI invocation correlation, isolated rejection and cancellation | FD-001 and FC-001/007 unchanged from main; DC-CONTEXT-001/DC-ACTOR-001 preserve chronology, atomic writes and frozen context |

All 96 prior overlay paths remain present. The normalized added/deleted
production text for all 43 source/migration overlay paths matches the prior
main-to-compat delta. Of 36 incoming paths, 24 share the main blob and 12 retain
existing compat intersections; generated SDK/OpenAPI are regenerated from the
merged source and remain byte-identical to the resolved merge output. Shared
FD/FC registries, history and bundled guidance inherit main unchanged.

The merge was textually clean but typecheck found a duplicate checkpointPath
import in the shared test file. Keeping the existing compat import resolves it;
no production specialization was needed. The affected checkpoint run case was
rechecked after that correction. CAS continuation registration still requires
successful submission with an owned expected user ID. Normalized timestamps do
not change the registered ID. Unrelated queued/inbox input, persistent wakes,
retained resume, and independent MCP sampling cannot borrow an old CLI scope.

### Active owner audit

- DC-CONTEXT-001 and DC-ACTOR-001 directly intersect prompt/session/checkpoint,
  Actor and HTTP paths. Atomic chronology, current-turn preflight, frozen
  membership/system/tools/turnContext/cwd and static-prefix behavior remain.
- DC-MODEL-001 intersects prompt/LLM and generated schemas; per-agent MaxMode
  remains the same overlay and is independent of approval correlation.
- DC-NET-002 is adjacent through MCP sampling; production MCP transport remains
  inherited, and no new private-network or OAuth claim is made.
- DC-NET-001, DC-PLATFORM-001 and DC-TUI-001 have no changed owned production
  surface. Existing WebFetch policy, platform fallbacks and model metadata remain.

### Local validation

Bun 1.3.14, tests and typecheck from package directories. Clear ambient
MIMOCODE_EXPERIMENTAL, MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH, MIMOCODE_CODEX_MODE,
MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL, MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS and
MIMOCODE_AUTO_APPROVE_DELETE; retain package preload including ORCHESTRATOR=true.

| Matrix | Result |
| --- | --- |
| Run approval, real tool/child/queue/continuation/disconnect (3 files) | 12 pass / 0 fail |
| Delete authorization and HTTP reply/admission (4 files) | 31 pass / 0 fail |
| Compat atomic admission, frozen context and fresh preflight budget | 13 pass / 0 fail |
| Real CLI attach, Actor recovery HTTP and OpenAPI contract (3 files) | 16 pass / 0 fail |
| MCP independent approval | 3 pass / 0 fail |
| Affected checkpoint case after duplicate import correction | 1 pass / 0 fail |
| opencode and JavaScript SDK package typecheck | pass |
| Source-generated SDK/OpenAPI, overlay/registry equality and diff checks | pass |
| Repository lint | 0 errors; existing warnings remain |

Groups overlap and are not an aggregate count. Remote compat PR head review,
exact-head CI, merge and final branch push CI remain separate publication gates;
this local validation does not claim those gates have already completed.


## 2026-09-08 POLICY-06 mixed-command approval correction

Codex feedback on PR #83 identified that an automatic deletion grant could
bypass ordinary authorization for other effects in the same Bash command. The
shared correction was accepted on main through PR #84 at
`3350f0f2ce17501d4d925f5e293f07d809f29f22`, after final head
`0e57377e9f6201dee1b23efb3ccc0239378b9d8d` completed Codex re-review with no
findings and all eight CI checks successful. Runtime/tests and guidance are
identified by `c7014557445832a97248ed7b0af568e51bfd291d`.

Compat source `f912482a26b8ae32f03987798dd5068f24860b91` inherits that formal
main merge. Explicit approval of a complete command, including its winning
forwarded SessionTool reply, retains a single confirmation. Automatic deletion
approval still requires ordinary Bash/external-directory authorization; deny
and invocation isolation remain intact. No public schema changed.

All 96 existing overlay paths, including 43 production paths, retain their
previous main and compat blobs. Shared registries and guidance match accepted
main. All seven DC entries were checked against the two changed runtime files
and the existing RunApproval carriers; no new override is introduced.

The correction matrix recorded 50 passes and one 20-second CLI child startup
timeout (211 assertions). The same real CLI test passed in isolation with 15
assertions; package typecheck passed. The preview and formal ancestry merge
have identical trees. Final compat HEAD Codex review, PR CI, and post-merge push
CI remain required; this entry records local validation and main acceptance.


## 2026-09-08 POLICY-01 full exec Actor and interaction inheritance

| Capability inventory (N=1) | Accepted main | Compat result |
| --- | --- | --- |
| POLICY-01 | Full authorized native Actor, question and atomic plan_exit through exec; direct entries retained | Same capability with active-tool filtering, loaded MCP hashing, frozen turnContext and chronological message transactions preserved |

Main `d415822c29539a4b6eebeafb59de1b88da18b95c` accepted PR #85 head `eb4ab66ee85cda01ad2e543a0a70ef14a4f78023` after
Codex Completed, a connector thumbs-up, no findings, and all eight CI checks
successful. Runtime/tests and content source: `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
Prior accepted compat: `852681e69d8a78e172a0f602b295380ed93b91e8`; integration source:
`5946f3c26b089adb412c6cee07d8129a09cfbfe3`. Formal ancestry merges leave the tested preview
`9e8d2d247a2f59d863966717599e315136580140` tree unchanged.

The four conflicts are resolved by combining native metadata with compat
prefix filtering, adopting the shared CAS plan producer, and preserving both
test contracts without duplicate imports. The plan producer becomes identical
to main while the called compat transaction still enforces ownership, atomic
parts and monotonic time. Overlay paths change from 96 to 95 and production
paths from 43 to 42, solely because this obsolete producer override disappears.
No other overlay path is added or removed. Shared registries remain identical.

All seven DC owners were reviewed for semantic as well as textual intersections:
CONTEXT/ACTOR retain caps, preflight, frozen turnContext and live run-approval
ownership; MODEL retains MaxMode/final gates; TUI retains provider/model/variant
and consumes the new terminal controls. NET-001/002 and PLATFORM source
contracts are unchanged by this delta and were checked by diff.

| Validation group | Result |
| --- | --- |
| Prefix and plan conflict cases, 3 files | 21 pass, 80 assertions |
| Real frozen native Actor cases | 4 pass, 34 assertions |
| Actual provider/exec Actor and interaction paths | 20 pass, 121 assertions |
| Compat atomic admission, chronology and checkpoint membership | 4 pass, 20 assertions |
| Retained Actor resume and frozen turnContext | 1 pass, 11 assertions |
| TUI plan/Question and model metadata, 4 files | 15 pass, 43 assertions |
| Package typecheck | pass |
| Repository lint | 0 errors, 4526 warnings |

Tests ran from packages/opencode with all six ambient experimental, Codex,
workflow and permission selectors cleared, retaining the package preload.
Groups overlap and are not summed. This source snapshot is validated locally;
new compat HEAD Codex review, CI, merge and final remote push CI remain separate
required gates. The overall upstream baseline remains 6203ea2e; this is selected
capability propagation, not a full upstream sync.


## 2026-09-08 POLICY-04 system-tail catalog local integration

| Capability inventory (N=1) | Main candidate | Compat result |
| --- | --- | --- |
| POLICY-04 | Frozen system-tail catalog; loaded skill bodies stay in messages; legacy recovery retains its paired layout | Same behavior with existing catalog byte cap, current-turn/preflight and frozen actor context preserved; strict historical capped-v2 migration |

Runtime/tests: `d9ed4dc480ddbe319d79e6ca655facc552e2cd35`; shared audit:
`110222157896b16e7ba85bc3d5d3f5eef975a6e1`. Prior compat:
`f9123761f62de7457f5eb2152afba02889927b8d`; tested local preview:
`cb8523163ec41e376be3ad1a6d0c998e3227b811`. Accepted formal main:
`69275c9cf4d772afe2167b82922e1dcebd9ab468`; final compat source/inheritance merge:
`8944fa9da062b4848c976e346cc01e8c3b71a90f`. These final references were filled after PR #87 acceptance and a tree-identical
formal ancestry merge; the following paragraphs retain the earlier preview evidence. The overall upstream reference stays
`6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; bundled guidance content stays
`aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.

The three conflicts in system.ts, llm-request-prefix.ts and prompt.ts combine
shared catalog placement with compat caps, source-ID-aware current-turn
messages and frozen turnContext. Both cold capture and runLoop pin losers use
the winner's system/catalog and recompute full and current-turn projections
together. Active/native fields and the loaded-MCP hash dimension remain.
Shared prefix/capture tests gain required activeTools arguments and matching
loaded-MCP hash input, retaining their original assertions.

Independent review reproduced a real legacy compatibility gap: the historical
50 KiB head cap could truncate catalog XML before its closing tag, preventing
the shared strict recognizer from removing the generated v2 part after layout
migration. The compat recognizer additionally verifies the original v2 schema
and hash, exact known truncation marker, producer byte budget and UTF-8 boundary.
It does not widen metadata-free legacy recognition or remove loaded skill
bodies. This correction remains DC-CONTEXT-001, not a new capability or owner.

All seven active DC entries were reviewed. CONTEXT/MODEL/ACTOR have real
production overlap; NET-001/NET-002/PLATFORM/TUI have no incoming production
intersection and retain their prior source delta. Existing historical evidence
is not re-dated as newly executed coverage.

Using the same five standard registry exclusions on both sides, the canonical
comparison is accepted old main `d415822c29539a4b6eebeafb59de1b88da18b95c` to prior
compat (93 paths) versus new main audit `110222157896b16e7ba85bc3d5d3f5eef975a6e1`
to preview (97 paths). Raw counts are 95 and 99; production counts are 41 and 42.
No old overlay path disappears. The four additions are skill-catalog.ts,
skill-catalog-capture.test.ts and the two skill-catalog-compat tests. Of the 93
existing paths, 87 normalized diffs are unchanged; six reconcile layout options,
pin winners, retained caps and shared test fixtures. Comparing runtime source
d9ed4dc4 instead of its later audit yields 98 non-registry paths solely because
the shared guide's source reference was subsequently updated; that extra guide
diff is not a compat override. Shared FD/FC/history and the catalog guide are
byte-identical to the main audit. No public schema changes or SDK regeneration
were required. Reproducible path/hash evidence is recorded in the operation
artifact `policy04-compat-overlay-proof.json`.

| Local validation | Result |
| --- | --- |
| Existing message/prefix/migration/request-prefix/fork tests, five files | 71 pass, 224 assertions |
| Compat capped-v2 and pin-winner projection tests | 11 pass, 36 assertions |
| System-tail/capture/real two-process reopen tests | 8 pass, 118 assertions |
| Native contract and current-turn/preflight/MaxMode cases | 8 pass, 58 assertions |
| Inherited two-test-file CI correction, targeted follow-up | 3 pass, 43 assertions |
| Package typecheck | pass |
| Recorded repository lint before the final CI test correction | 0 errors, 4536 warnings; final recheck pending |

The distinct groups total 101 pass / 0 fail and 479 assertions. Tests ran from
packages/opencode with the six ambient experimental/Codex/workflow/permission
selectors cleared and package preload retained, using 60-second budgets.
The final source/lint recheck, accepted-main ancestry, compat PR Codex review,
exact-head CI, merge and remote push CI remain separate pending gates; this
entry records local integration only.


### POLICY-04 follow-up: frozen catalog slot and CI result transport

The updated candidate runtime/tests are `8ed2c5806a5e8d79aed7212c7c7c020bc817b2c4`;
shared audit/guidance are `c1e391d184bb0a3efbf7a60a38f553c41d6c5935`. Local merge
`66ee9b2dcc0caa9089bf180f0b031f5248fcd97f` inherits that candidate from prior preview
`cb8523163ec41e376be3ad1a6d0c998e3227b811`. Accepted formal main remains
`69275c9cf4d772afe2167b82922e1dcebd9ab468` and final compat source/inheritance remains
`8944fa9da062b4848c976e346cc01e8c3b71a90f`; no formal ancestry or remote CI completion
is claimed here.

The slot refresh preserves every non-catalog frozen byte, with conservative
old-snapshot migration and empty-message handling. Cross-process test results
now use awaited JSON files instead of a potentially truncated stdout line.
Two source conflicts retain compat's capped-v2 recognizer and combine the new
materialized catalog pair with currentUserID, active_tools and the third
loaded-MCP hash dimension. Cold/runLoop pin winners retain synchronized full
and current-turn projections; actor turnContext is unchanged. The new shared
frozen-refresh test needs no compat adaptation and matches main byte-for-byte.

All seven DC owners remain reviewed: CONTEXT/MODEL/ACTOR are production-adjacent
or overlapping for the inherited prompt changes; NET-001/NET-002/PLATFORM/TUI
have no production intersection in this follow-up. No owner or overlay path
is removed or added relative to the preceding preview. Canonical overlay
remains 93 old / 97 new paths (raw 95 / 99), production 41 / 42. New comparison
uses main audit c1e391d1, not runtime 8ed2c580. Shared FD/FC/history and the
catalog guide match that main audit byte-for-byte; source-only guide-reference
differences are not counted as compat ownership. The operation overlay proof
records each path, blob and normalized diff.

Final specified matrix: 44 pass / 0 fail / 216 assertions across seven files,
54.66 seconds; package typecheck exit0; root `bun lint` reports 4537 warnings
and zero errors; diffcheck passes. All six ambient selectors were cleared,
package preload retained and each test has an explicit 60-second budget.
The initial integration attempt had one legacy resume assertion failure and
a conflict-resolution omission of the third tool-hash input; after restoring
that input, the single case and the entire unchanged-assertion matrix passed.
This record does not claim the initial failure independently proves causation.
The earlier 101-case matrix is not rerun or added to this count. No public
schema or generated SDK changed. Formal PR87 acceptance, final ancestry,
compat PR review/CI and final remote push remain separate publication gates.

### POLICY-04 final format fix and accepted-main inheritance

PR #87 head `32b01dcd828f692ea0656e53319cd48abf054c18` passed all eight CI checks and Codex completed
with no major issues at 2026-09-08T16:41:14Z. Accepted main `69275c9cf4d772afe2167b82922e1dcebd9ab468`
is an ancestor of compat source `8944fa9da062b4848c976e346cc01e8c3b71a90f`. The latter has the same
tree as tested preview `25dad8230a4313dcfbdaf520ff87c95244c50c07`; only merge ancestry changed.

The inherited follow-up keeps current-request structured/text format instructions
inside their managed slot while preserving frozen non-catalog bytes and directory
version. The provider test double now honors the real post-plugin system tail.
Compat retains the strict truncated-v2 recognizer, current-turn projections,
active/native snapshots and loaded-MCP hash dimension. Shared registries and
the catalog guide match the accepted main audit byte-for-byte.

Final affected matrix: 55 pass / 0 fail / 251 assertions across seven files
(60.95 seconds), six ambient selectors cleared and package preload retained.
Package typecheck passed; repository lint has 4537 warnings / 0 errors.
The prior 44-case and 101-case runs are separate historical evidence, not added
to this matrix. Compat PR review, exact-head CI and post-merge push CI remain
publication gates. No public API schema or SDK output changed.

### 2026-09-09 POLICY-04 accepted authenticated-description correction

Main correction PR #90 accepted head `e136aa2ae24e13ec0f988a1a261d3af127b8eeda` after all eight CI checks
and Codex completed with no major issues. Formal main `fb16a8fd5a7b916421e7a04ca31f06559e086298` is inherited
by compat source `a3ed4d703767db5b130a6b38ce3e38317b2ece36` with a tree-identical ancestry merge. Shared
FD/FC/history and the layout guide match the accepted main audit.

The recognizer authenticates v2 descriptions before applying the metadata-free
legacy loaded-content guard. Compat still requires its exact capped producer
budget; the real capped-description projection now covers `<skill_content>`.
Both full and current-turn model projections remove only verified generated
catalogs. Malformed producer budgets, hashes and actual loaded bodies remain.

The final affected four-file matrix has 43 pass / 0 fail / 148 assertions;
package typecheck passed and repository lint has zero errors. Earlier 55-case
and 101-case matrices remain historical, overlapping evidence. Registry source
references now identify the correction. The seven DC owner inventory and
97-path overlay remain unchanged; final compat review and remote CI are pending.

## 2026-09-09 POLICY-03 default TUI model API inheritance

| Capability inventory (N=1) | Main result | Compat result |
| --- | --- | --- |
| POLICY-03 | Ordinary TUI starts its authenticated model API, with scoped directory and owned shutdown | Same behavior; no new compat production difference |

Accepted main `6e4ed8d3f859bd1355789748ae7a5f385cf0fbb1` is inherited by source `ec963d93abcc41a41aff9a65a6fd8f4b5aabfdef` with a
tree-identical ancestry merge. Prior compat is `823e21d2fd7c3a2603d14bf15289351a6c555f81`. Shared runtime/tests
are `37bbc8229ca70a92b5eaaa7bafd725d070f3f271`, shared audit `e44e926c2cf9dff4f3fc04cb4f3f5493af194d87`, and bundled guidance `0353965ea38ce3d963f123acb2f9a965bcbb98c3`.
All seven active DC owners were reviewed. Every incoming file equals main;
all 97 prior non-registry overlay paths and normalized deltas remain, including
42 package src paths. Shared registries and the catalog guide are identical.

The actual worker/socket/thread/scoped-SDK matrix passed 23 cases / 127
assertions; HTTP/bootstrap/TUI event regressions passed 24 / 131. The later raw
fetch correction passed 8 / 46, including real authenticated BashInteractive
completion and workspace adaptor requests. Six cases overlap prior groups;
there are 49 distinct tests / 271 assertions across the combined evidence,
not 55 tests. Six ambient selectors were cleared and package preload retained.
Final package typecheck passed. Source-only merges after these runs changed no
runtime/test content. Final PR review, CI and remote push CI remain gates.

## 2026-09-09 POLICY-02 registered recovery and task inheritance

| Capability inventory (N=1) | Main result | Compat result |
| --- | --- | --- |
| POLICY-02 | Broader live registered recovery, task consistency and validated missing binding | Same behavior with retained chronology and frozen-context extensions |

Accepted main `540dad7493235cc5c0ce800ed49dfe1cb3a6e2b3` is inherited by source `ade6a56b2f6a5ab0725077c772db32138edbc89e`.
Prior compat is `f38eecbf31fad26a8ff03dd2a90970be52fa71e5`, whose POLICY-03
exact-tip CI and main ancestry are verified. Runtime/guidance is `afa6198588ba7f6e0a0c92623622c10da68837d7`; shared audit is `e9b426595c67b269c8fafa0555145f6da21fc1dd`.
All seven active DC owners were reviewed; shared FD/FC/history match main.

The POLICY-02 review inherits registered/live-context recovery and validated
optional task binding. The task namespace comes from the original spawn;
claim, original-user binding and interrupted-assistant settlement commit
atomically. Main HTTP cancellation is checked before commit; after commit the
runner retains ownership. Every recovered loop pins the committed original user
and defers queued inbox until a later ordinary run. Metadata-only summary/setmode updates preserve
concurrent recovery state and cannot resurrect deleted messages.

Compat retains createMessage/commitUserMessage/commitUserMessageIfLatest,
monotonic chronology and completed >= created during recovery settlement.
Frozen turnContext, active/native tools, three-dimensional tool hashes, content
caps, current-turn preflight and MaxMode remain intact. The same registry
exclusions give 97 -> 98 overlay paths, retaining all prior paths and 42 package
src paths. Only the recovery-commit test is new; 94 prior normalized deltas are
unchanged. Session chronology and two Actor fixtures are the three adapted
existing deltas. Shared FD/FC/history are byte-identical to accepted main.

Local evidence: core/entry/stale writers 26 tests / 131 assertions; real
HTTP/SDK/OpenAPI 28 / 339; Actor lifecycle 71 / 362. The cancellation follow-up
runs main HTTP, existing recovery and commit tests: 30 / 156, overlapping prior
evidence and not added wholesale. The shared Actor resume follow-up also passes
31 cases / 226 assertions. Package typecheck and repository lint pass;
standard SDK/OpenAPI regeneration from resolved sources adds no difference.
Six ambient selectors are cleared; package preload remains the harness baseline.
Cross-restart recovery is outside this change.

Final compat current-head Codex review, all eight PR CI checks and merged-tip
push CI are publication gates. These references do not rewrite older evidence.

### 2026-09-09 POLICY-02 accepted durable inbox wake correction

PR #93 review exposed a shared wake gap after preserving the recovered user.
Main correction PR #94 accepts source `996ba09e92b9506ce0b09a34525851ffd85af3ec`, audit `c5e1a04fa43ad53ba489a79b5418ad2e4fa01f68`, formal main `9d26949e36c178d723a60b5664f7b31162ad64d8` and is inherited by compat source `a21254e9482785426bbe3ad58c895f83b2b764b8`.
The ancestry merge preserves the tested preview tree exactly. Existing 98
non-registry overlay paths (42 package src) remain; the incoming wake helper
introduces no new compat difference. Shared FD/FC/history match main.

The POLICY-02 durable-inbox follow-up rearms pending rows after successful or
failed recovery through the existing Inbox/Runner/Actor lifecycle. It preserves
the recovered user during execution and does not depend on a live sender wake
or a manual later prompt. Plugin cancellation (including a subsequent post-hook failure), interruption, disposal and retired receivers do not
restart execution. Both live and durable wake variants consume each row once. The wake tracks the
queue tail, and persistent owners recheck it after settling each turn, so a
provider or runtime failure in the first 100-row batch does not strand later rows.
Both owners and concurrent followers require observed queue consumption before
retrying after failure; a failure before consumption does not trigger extra work.
Compat keeps its inherited Inbox content cap and all existing instance/context
boundaries. No additional compat delta is introduced by this shared correction.

The preceding compat main HTTP/Actor matrix passes 91 tests / 605 assertions;
Inbox tests pass 54 / 133 across eleven files, and inbox/handoff tests pass
8 / 30. The final joined-failure correction passes 35 tests / 319 assertions across
main HTTP, Actor inbox and prompt handoff; the above earlier groups overlap. The preceding five-second retirement-fixture timeout is recorded in
shared history; this complete run passes with explicit fixture budgets. Earlier matrices are
historical, overlapping evidence. Package typecheck and repository lint pass;
this internal helper changes no public schema or generated SDK. Shared registry
files remain byte-identical to the accepted main correction.

Current compat HEAD review, all eight CI checks and merged-tip push CI remain
the final publication gates. Prior main/compat evidence is not re-dated.

## 2026-09-09 full upstream sync through 1c13f051

- Upstream: `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85..1c13f05105b7c671a3e201b61410ccbfa8acf96e`; accepted main `f4146b1a2feccaa224d7f7c8fde0c826161bdd90`; main behavior `f3200d2ab9baa4ea2788b33b11d9236e18b29b71`; compat behavior `ace4085284584c0477f4becae1a825d588c97264`.
- The [shared inventory](upstream-sync-2026-09-09.md) has N=6 and covers all 43 upstream paths. All seven DC owners remain active.

| ID | Selected behavior | Main result | Compat result | Decisive evidence |
| --- | --- | --- | --- | --- |
| SYNC-01 | Tool-name case control | Adopted | Inherited unchanged | `src/util/tool-compat.ts`, `test/util/tool-compat.test.ts`, nested exec tests |
| SYNC-02 | Image MIME/BMP conversion | Adopted with existing bounds | Inherited with existing replay/preflight caps | provider image/transform, message/title/read tests, prefix/compaction tests |
| SYNC-03 | Chat-only audio retirement | Rejected under FD-004 | Same retained model/audio contract | audio/model API, discovery/token and generated-contract tests; shared audio/provider/API source equality |
| SYNC-04 | Missing catalog/auth protection | Adopted | Inherited unchanged | provider/plugin tests and source equality |
| SYNC-05 | Portable examples/research guidance | Adopted | Inherited unchanged | AGENTS policy, bundled-skill/system/TUI tests |
| SYNC-06 | Desktop README/screenshots | Adopted | Inherited alongside compat README content | README asset references and diff inspection |

- Resolved the sole textual conflict by using actual JPEG bytes in the multimodal title fixture. No compat-owned production file changed. Shared FD/FC registries, audio/model/provider implementation, tool-name resolver and `bun.lock` match main; existing generated compat operations remain unchanged.
- Validation: Bun 1.3.14 `bun ci` with unchanged lockfile; package `bun typecheck` passed; lint 0 errors (4573 reported warnings). Focused matrix 473 passed / 6 files; integration/context matrix 352 passed / 13 files; model/audio/API matrix 438 passed / 15 files; separate audio HTTP suite 16 passed / 1 file, including the non-test default-path child. Total: 1279 passed, 0 failed.
- The validation commands unset the seven default-path selectors listed in the shared review. Package preload retains `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`; strict tool-name cases set `MIMOCODE_IGNORE_TOOL_NAME_CASE=false` only. The non-test API child removes preload selectors. Real-provider fixtures use local controlled HTTP endpoints, not production model credentials.
- Docs/diff consistency checks pass. Seven incoming production files are byte-identical to main; no compat-owned production path, migration, API input, generated output or lockfile changed. No local binary build is claimed.
- Final publication proof must match the eventual remote SHA to successful test/lint/typecheck runs and prove selected upstream -> main -> compat ancestry. This source/test record is not a substitute for that live check.

## 2026-09-09 specified audio convergence

- Inventory N=1: AUDIO-ALIGN-01, selected upstream `534f32d8` semantics at unchanged
  baseline `1c13f05105b7c671a3e201b61410ccbfa8acf96e`; no new upstream fetch.
- Accepted main tip `ab722d0e0c7c65c5109110b08af34a3e2eb47a94`, shared source/tests and bundled content `254181bb0ac08dc1fd43c3534efc3405c9c58d6c`.
  Direct inheritance merge and compat behavior `a6cd04a5d89c3df54d3f0a3df494540294474fd1`; prior compat tip
  `6b6a36698c3a66b826586d6d2512cc54bcf6f8a8`. No merge conflicts.
- All seven DC owners reviewed. AUDIO-ALIGN-01 is inherited unchanged from main;
  DC-MODEL-001/CONTEXT-001/ACTOR-001 retain request/compaction boundaries, and
  DC-NET-001/002, DC-PLATFORM-001 and DC-TUI-001 have no changed owned runtime path.
  No compat-only audio implementation remains or is introduced.
- Byte comparison confirms the shared API, provider, CLI, media, tests and FD/FC/history
  records match main. Existing compat API/SDK extensions, TUI voice, MCP sampling,
  WebFetch policy, lockfile, schema inputs and workflows are unchanged.
- `bun ci` and package `bun typecheck` pass. The final related matrix passes 579 tests
  across 20 files, 2223 assertions, zero failures. Includes the shared 565-case matrix
  and 14 compat-adjacent compaction scope/projection cases. Actual source CLI refuses
  retired flags; headers-only requests prove removed routes do not wait for bodies.
- Default validation unsets `MIMOCODE_EXPERIMENTAL`,
  `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE`,
  `MIMOCODE_COMPACTION_MAX_CONTEXT`, `MIMOCODE_COMPACTION_TRIGGER_RATIO`,
  `MIMOCODE_DISABLE_CHECKPOINT`, and `MIMOCODE_IGNORE_TOOL_NAME_CASE`. The package
  preload retains `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`; the non-test child
  independently removes its opt-in selectors before production imports.
- `git diff --check` passes. Final remote-tip equality, exact-SHA CI and ancestry
  are publication checks, distinct from this source/test record.


## 2026-09-10 — title authority full synchronization

- Selected upstream: `1c13f05105b7c671a3e201b61410ccbfa8acf96e..ceecd1c71f88c4840f9fdbdf2450fa331121be22`.
- Accepted main tip/shared audit: `9173219ae94997b398fc1fcd9659c413ee81e2c6`; inherited source/tests and bundled guidance: `c35c34d45a2e24ab6e48a7a3fd438d1c456352ed`.
- Compat source/test behavior and direct inheritance merge: `cd92030860e33506c5bc79b7e417ada3bed542d5`; prior tip: `eaf6cdcc54c1cc4e6cf716e766b9a2f59265c162`. Later registry commits do not advance these source references.

### Capability results (7)

| ID | Selected behavior | Main result | Compat result | Decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Revisioned title persistence, imports, replay and HTTP/SDK | Adopted | Inherited with chronological fork and checkpoint fields | title-authority, title-migration, title-sdk; rebuilt Node CAS/restart 4/4 |
| C02 | First-input fallback and isolated text-only generation | Adapted to fork admission and retry ownership | Inherited with strict receipt identity, frozen context, bounded preflight and MaxMode isolation | title-first-turn 5/5; prompt-effect seams 29/29; admission guards |
| C03 | Current-session title-only default tool | Adopted | Inherited without enabling create or widening frozen tools | separate non-test default child; title-tool and registry |
| C04 | Revision-aware TUI/App editors and title reads | Adopted | Inherited with checkpoint maps, revert pagination and deletion guards | TUI title-authority, checkpoint-coverage-sync; App tree identical to validated main |
| C05 | Picker skill commands and multiline text parts | Adopted | Inherited with ModelMetadata, both titleLocale paths and voice | skill-picker-submit, voice; metadata tests |
| C06 | Host defaults and lite alias precedence | Adapted before trusted declaration capture | Inherited with per-agent model routing unchanged | title-defaults, harness-alias, max-mode |
| C07 | Unsupported local attachment placeholders | Adopted | Inherited with model-visible content caps | message-v2, title-input, prompt and overflow tests |

- All seven active DC entries were re-reviewed; shared FD/FC/history and the inventory are inherited byte-for-byte. App/UI and lockfile match main. No unrelated network, platform, audio or provider routing policy changed.
- `bun ci`, source SDK/OpenAPI generation and package `bun typecheck` passed. The first typecheck identified missing title fields in a compat-only checkpoint fixture; it passed after adding the required fields and again after the receipt test adaptation.
- Affected Bun matrix: 32 separately executed files. Initially 400 passed and one new title receipt case failed because its repeated message used newly generated part IDs. After adapting only that fixture to compat's existing identity contract, the affected file passed 5/5 with 102 assertions; the reconciled matrix covers 401 passing cases and no remaining failure. No production consistency check was relaxed.
- Compat owner matrix: 144 passed across nine separate files, zero failed/skipped; covers overflow, frozen fork prefix, MaxMode, writer-first recovery, checkpoint API, metadata and TUI synchronization. The title/context/frozen/checkpoint/preflight prompt-effect filter passed 29 cases with 231 assertions. Admission/BusyError filter passed 3 cases with nine assertions; chronological direct admission and transaction rollback passed another two cases with 14 assertions. Filtered-out cases are not reported as skips or coverage.
- Rebuilt plain-Node title migration/CAS/restart tests passed 4/4. A separate non-test Bun child with Orchestrator and all ambient experimental selectors absent proved one title-only session tool, create rejected and generated-title commit accepted. Ordinary suites retain package preload Orchestrator=true, fixture model catalog, isolated home/config/cache, in-memory DB and disabled default plugins; they unset experimental, MCP-search, Codex, context-limit, trigger-ratio and checkpoint selectors before imports.
- Lint passed with zero errors and 4549 repository warnings before the final receipt-only test adaptation; the final publication hook/typecheck and exact-tip CI validate the committed tree. `git diff --check` and shared-record consistency checks passed. App unit/browser results are the main source evidence (2/2 and 10/10), reused only because the entire App/UI tree is identical; no additional compat browser run is claimed.
- Independent review found no blocking production defect in the reconciled main/compat seams. The shared inventory records its combined-run frozen-catalog timing limitation. Final remote-tip equality, exact-SHA CI and upstream -> main -> compat ancestry are separately checked after publication.

### Migration journal CI follow-up

- Accepted main/shared audit: `e2f62b39c25566a4c96bdc2bd7ac234248789171`; inherited source/test snapshot: `cd6db2dbf4678be6aabf166e4140a5376ad3d5a6`. Compat source/test inheritance merge: `174d85f6e9ea6112c08143ea103659f93217b5ee`. Runtime and bundled guidance remain the earlier title-sync implementation; no production source or generated output changed in this follow-up.
- The first main exact-tip CI found the prefix migration fixture's fixed one-pending-migration assumption. Compat inherits the shared correction unchanged: exact current journal names, historical pre-cutoff SQL, original row/schema preservation and second-upgrade equality. Local compat migration tests passed 2/2, 16 assertions.
- C01 evidence is extended by this migration regression; the seven capability decisions above remain unchanged. The shared audit/FD/FC/history are byte-identical to accepted main. Final source publication still requires new exact-tip test/lint/typecheck success and remote ancestry proof.

## 2026-09-10 — plugin hook objects and Xiaomi chat SDK inheritance

- Selected upstream: `ceecd1c71f88c4840f9fdbdf2450fa331121be22..cb00c2808043bb0c4f0a4cfc5855912d82c9abe8`.
- Accepted main tip/shared audit: `02a7a9805ea9725ff5e08bbadd13fcea0bf47d3a`; inherited source/tests: `67abd1f745135c164a0c30d3769f32ddd10823a8`; bundled guidance remains `c35c34d45a2e24ab6e48a7a3fd438d1c456352ed`.
- Compat source/test behavior and direct inheritance merge: `35a577506c8ddeb556b5deac1b838b1a2d5feb5e`; prior tip: `a04b7921e80c9f7f148daadff0068839be70a347`. Later registry commits do not advance these source references.

### Capability results (2)

| ID | Selected behavior | Main result | Compat result | Decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Plugin registration validates the resolved hook and the trigger/config/event loops guard each entry | Adopted with FC-006's instance-local `memoryWriteEnabled` injection preserved | Inherited byte-for-byte; no compat divergence existed on the file | `test/plugin/` 184/184 within the affected matrix; mutation check fails `skips plugins that return undefined instead of a hook object` without the guard |
| C02 | Xiaomi non-PTC chat on the stock `@ai-sdk/openai-compatible` model, bundled Copilot fork for `responses()` only | Adopted; FD-005 keeps resolved-identity transport selection | Inherited byte-for-byte; no compat provider override | `test/provider/provider.test.ts` xiaomi cases 4/4; mutation check empties the `reasoning-delta` list without the fix |

- All seven active DC entries were re-reviewed against the incoming diff; none has an owned implementation change. Shared FD/FC registries, their history and the new inventory are inherited byte-for-byte from accepted main.
- The merge into `dev/compat` was conflict-free. All four incoming paths (`src/plugin/index.ts`, `src/provider/provider.ts`, `test/plugin/trigger.test.ts`, `test/provider/provider.test.ts`) had identical main and compat blobs before the merge, so this propagation adds no compat overlay path.
- `bun ci` completed with an unchanged lockfile; package `bun typecheck` passed. No API input changed, so no SDK/OpenAPI regeneration was required.
- Affected matrix at `35a577506c8ddeb556b5deac1b838b1a2d5feb5e`, run from `packages/opencode` with `bun test --timeout 30000` over `test/plugin/`, `test/provider/`, `test/llm-server/`, `test/flag/codex-mode-flag.test.ts`, `test/tool/harness-alias.test.ts`, `test/tool/websearch.test.ts` and `test/tool/tool-script.test.ts`: 1135 passed, 0 failed, 3459 assertions across 45 files in 131.66 s of test-process time. This matches the identical main matrix, which is expected because the covered trees are the same.
- Ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` were removed for every run; the package preload (`@opentui/solid/preload`, `./test/preload.ts`) remains the harness baseline.
- Repository lint passed with zero errors and 4556 warnings; `git diff --check` passed. Final remote-tip equality, exact-SHA CI and upstream -> main -> compat ancestry are separate publication checks.

## 2026-09-11 — upstream-sync skill reference split inheritance

- Accepted main tip/shared audit: `ea633a0bd8a343b8e8ea8fefc20b8cf15e0ced17` (PR #105 merge `195b7f17a23c870edce94ac3710bc52621d2feea`, PR #106 merge `ea633a0bd8a343b8e8ea8fefc20b8cf15e0ced17`).
- Compat inheritance merge: `c0a319f41f86f8c9de4eb7e09b2df78799963362`; prior tip: `a7094298c296f4ad5102a5714458423d87ddac12`.
- Inherited source/test behavior is unchanged at `67abd1f745135c164a0c30d3769f32ddd10823a8`; this propagation advances no runtime, test or generated-artifact reference.
- Scope: process guidance only. The upstream-sync skill moved its conditional detail into `references/validation-and-ci.md`, `references/publication-and-cleanup.md` and `references/evidence-record.md`, keeping `SKILL.md` as the scope and baseline entry; a local `.gitignore` re-includes that directory against `.mimocode/.gitignore`. FC-008 now lists the reference directory and the rule file beside `SKILL.md`.
- All six incoming paths had no prior compat divergence and merged without conflict; each is byte-identical to accepted main after the merge. No compat overlay path is added.
- All seven active DC entries were re-reviewed: none has an incoming owned implementation change, and none watches `.mimocode/`. No owner is added, retired or renumbered. Shared FD/FC registries and their history are inherited byte-for-byte.
- The cleanup-scope review finding on PR #105 was adjudicated on the PR: the prescription to restrict cleanup to operation-created worktrees was already the rule, and the separately-authorized named-worktree removal was retained, with its precondition moved inline to the table it governs. Codex re-review and the follow-up review both finished with no findings.
- Final remote-tip equality, exact-SHA CI and `main -> dev/compat` ancestry are verified after publication, separately from this record.

## 2026-09-11 — inline attachment bounds and recovery-candidate breadth inheritance

- Selected upstream: `cb00c2808043bb0c4f0a4cfc5855912d82c9abe8..7641dbbd3b8aa20ffd4fb74089f2dc65bf032201`.
- Accepted main tip/shared audit: `bcf2fba7c337a812071ccacc5184347c0bd5536e`; inherited source/tests: `332d1961f2bc9d2b1b9e0e56f2143b09a80d2077`; bundled guidance remains `c35c34d45a2e24ab6e48a7a3fd438d1c456352ed`.
- Compat source/test behavior and direct inheritance merge: `43e8d80270345bdadda596eab7e9b1871ed30b92`; prior tip: `c1ee9ecbeda90224d4a7abbcfc877b9016b1117e`. Later registry commits do not advance these source references.

### Capability results (2)

| ID | Selected behavior | Main result | Compat result | Decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Inline attachments are bounded where they are produced, oversized images recompressed and everything else refused with a notice; the read tool refuses a PDF the active model cannot take | Adopted unchanged; FC-003's `markFileRead` moved to the image success path | Inherited byte-for-byte — all five production files and all three incoming test files are identical to accepted main | `test/tool/read.test.ts`, `test/tool/read-state.test.ts`, `test/mcp/tool-result.test.ts` and `test/session/prompt.test.ts` within the compat matrix below; the covered runtime is identical to main, so main's three C01 mutation checks apply unchanged |
| C02 | Recovery-candidate predicate fix for `tool-calls`/`length` turns, idempotent settlement, resumed-loop classification skip, and an optional resume model override | Adopted through the fork's single `startResumeTurn` admission, keeping `time.completed` as FC-001's settlement marker; actor overrides refused; artifacts regenerated | Inherited with two union conflicts in `src/session/prompt.ts`; DC-CONTEXT-001/DC-ACTOR-001 contracts unchanged | `test/server/session-recovery.test.ts` predicate matrix and both fork-owned cases, plus `test/session/prompt-sweep.test.ts` for the settlement boundary and `test/session/prompt-effect.test.ts` for compat's overflow-placeholder classification, all within the compat matrix below |

- All seven active DC entries were re-reviewed against the incoming diff; none has an owned implementation change. Shared FD/FC registries, their history and the new inventory are inherited byte-for-byte from accepted main.
- Two conflicts, both unions in `src/session/prompt.ts`: the `./classify` import keeps compat's `REQUEST_OVERFLOW_RECOVERY_MESSAGE` beside main's new media/image imports, and the existing-assistant branch keeps compat's per-iteration agent resolution and `recoverOverflowPlaceholder` while adopting main's `lastAssistant.id !== resumeFrom` guard. `src/server/routes/instance/session.ts` merged cleanly; its only compat delta remains the `checkpoint-coverage` route.
- `bun ci` completed with an unchanged lockfile; repository `bun typecheck` passed 12/12. The JavaScript SDK and `packages/sdk/openapi.json` were regenerated from compat sources and are byte-identical to the merge result, so no compat operation was lost and both resume query parameters are published.
- Affected matrix at `43e8d80270345bdadda596eab7e9b1871ed30b92`, run from `packages/opencode` with `bun test --timeout 120000` in three sequential processes, mirroring the isolation `.github/workflows/test.yml` applies to `session-actor-recovery.test.ts`:
  - `test/tool/ test/mcp/ test/util/ test/provider/ test/flag/ test/skill/` — 2258 passed, 3 skipped, 0 failed, 6434 assertions across 141 files in 287.68 s.
  - `test/server/` (every file except `session-actor-recovery.test.ts`) `test/session/ test/actor/ test/inbox/ test/effect/` — 1818 passed, 23 skipped, 1 todo, 0 failed, 6277 assertions across 171 files in 767.81 s.
  - `test/server/session-actor-recovery.test.ts` in its own process — 14 passed, 0 failed, 233 assertions in 25.56 s.
  The counts exceed main's because compat carries additional owned cases; no case is skipped by the isolation.
  That matrix ran on the equivalent merge before the shared registry commit was folded in; `packages/` is byte-identical in the published merge, which carries only the additional shared documentation.
- Ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` were removed for every run; the package preload (`@opentui/solid/preload`, `./test/preload.ts`) remains the harness baseline.
- Repository lint passed with zero errors and 4558 warnings; `git diff --check` passed. Final remote-tip equality, exact-SHA CI and upstream -> main -> compat ancestry are separate publication checks.

## 2026-09-11 — bounded history search and paged part details inheritance

- Selected upstream: `7641dbbd3b8aa20ffd4fb74089f2dc65bf032201..f11e35ede439df5555ca1f0309ffea8e9b49f06e`.
- Accepted main tip/shared audit: `4fa2402fdb51c1c5fcfacc5f4471a6c4005ea0cb`; inherited source/tests: `635618207270af55435aee88ce27003fc1809b44`; bundled guidance remains `c35c34d45a2e24ab6e48a7a3fd438d1c456352ed`.
- Compat source/test behavior and direct inheritance merge: `84b55973efe3e2571185e2769b85faea852a1e97`; prior tip: `2a2632d4455920701f4ce50074b7c4da91244902`. Later registry commits do not advance these source references.

### Capability results (1)

| ID | Selected behavior | Main result | Compat result | Decisive evidence |
| --- | --- | --- | --- | --- |
| C03 | History search and `get` stop materializing inline base64: SQL projections leave unused media in the database, `get` returns paged `part_id` details, data-URL cleaning is hardened, FTS takes a neutral `[media <mime>]` marker, `around` keeps its anchor, and one migration clears the derived `history_fts` index | Adopted unchanged; the only diverged file took two copy lines | Inherited; sixteen of seventeen paths had no compat divergence and `src/session/checkpoint.ts` keeps compat's overlay beside the same two copy lines | `test/history/details.test.ts`, `test/history/media.test.ts`, `test/tool/history.test.ts` and `test/storage/` migration regressions within the compat matrix below |

- All seven active DC entries were re-reviewed against the incoming diff; none has an owned implementation change. Shared FD/FC registries, their history and the new inventory are inherited byte-for-byte from accepted main.
- DC-CONTEXT-001 consumes the changed checkpoint text. The elision marker changes length by a few characters inside an already-bounded field, so no model-visible cap, serialization path or request preflight moves; the bounded history work reduces rather than widens what can reach a request.
- `bun ci` completed with an unchanged lockfile; repository `bun typecheck` passed 12/12. No API input changed, so no SDK/OpenAPI regeneration was required and compat's own operations are unaffected.
- Affected matrix at `84b55973efe3e2571185e2769b85faea852a1e97`, run from `packages/opencode` with `bun test --timeout 120000` in three sequential processes, mirroring the isolation `.github/workflows/test.yml` applies to `session-actor-recovery.test.ts`:
  - `test/tool/ test/mcp/ test/util/ test/provider/ test/flag/ test/skill/ test/history/ test/storage/` — 2344 passed, 9 skipped, 1 failed, 6900 assertions across 154 files in 313.55 s.
  - `test/server/` (every file except `session-actor-recovery.test.ts`) `test/session/ test/actor/ test/inbox/ test/effect/` — 1818 passed, 23 skipped, 1 todo, 0 failed, 6277 assertions across 171 files in 786.59 s.
  - `test/server/session-actor-recovery.test.ts` in its own process — 14 passed, 0 failed, 233 assertions in 26.93 s.
- The single failure is the same upstream darwin-only case the shared inventory records, `test/history/details.test.ts > SQL preview bounds NUL-containing fields without losing get details`. It reproduces on upstream's unmodified `f11e35ed` tree on the same machine, upstream's own ubuntu-latest `test` run for that SHA is green, and accepted main `4fa2402f` passed all three fork workflows on ubuntu-latest (test run 34620471134), so it is a platform difference rather than a compat integration defect. No compat assertion was relaxed.
- Ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` were removed for every run; the package preload (`@opentui/solid/preload`, `./test/preload.ts`) remains the harness baseline.
- Repository lint passed with zero errors and 4591 warnings; `git diff --check` passed. Final remote-tip equality, exact-SHA CI and upstream -> main -> compat ancestry are separate publication checks.

## 2026-09-12 — actor execution model, models catalog and media reading inheritance

- Selected upstream: `f11e35ede439df5555ca1f0309ffea8e9b49f06e..98702641a985fd2a3b81e407f58df7cbcee1f248`.
- Accepted main tip/shared audit: `e92d7a52e3597207775a2a9be0c28c282c34dbad`; inherited source/tests: `bca24711ed37d3620cd7304603b81e98849642e5`; bundled guidance remains `c35c34d45a2e24ab6e48a7a3fd438d1c456352ed`.
- Compat source/test behavior and inheritance merges: `b79ba5cf5736c4408ace43ebaa697f315b30a08c`; prior tip: `2fb8dc206ff9b7c8c43c2699e5e2a2d81d3cbe90`. Later registry commits do not advance these source references.

### Capability results (4)

| ID | Selected behavior | Main result | Compat result | Decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Terminal actor outcomes delivered after the execution settles: `actorResult` persisted and `result_message_id` published, executions serialized per `(session, actor)`, hook failures surfaced as warnings | Adopted; **FC-001's continuation wake-generation routing retired** with its eight fork-owned tests | Inherited; no compat override on that path | `test/actor/` + `test/inbox/` and `test/tool/actor-owned-lifecycle.test.ts` clean on compat |
| C02 | Local-first models catalog with fail-closed `MIMOCODE_MODELS_PATH` and TUI hot-reload | Adopted unchanged | Inherited | `test/provider/models-catalog*.test.ts` within the compat matrix |
| C03 | Audio and video read as inline attachments; video a first-class modality; read guidance described from model capabilities | Adopted unchanged | Inherited | `test/util/media.test.ts`, `test/session/tool-attachment.test.ts`, `test/llm-server/` 311/311 |
| C04 | `TaskRegistry` publishes Bus events on the calling fiber's Instance | Adopted unchanged | Inherited | `test/task/` within the compat matrix |

- All seven active DC entries were re-reviewed; none has an owned implementation change. DC-ACTOR-001 keeps its full-context extension — `ForkContext` still requires compat's `turnContext`, so the ported upstream `keeps forkContexts isolated` fixture carries that field here. Shared FD/FC registries, their history and the new inventory are inherited byte-for-byte from accepted main.
- One conflict, in `src/inbox/inbox.ts`: main's cancelled-before-commit drain guard adopted while compat keeps its `createMessage` wording for the non-transactional crash window that comment documents.
- `bun ci` completed with an unchanged lockfile and applied the new `@ai-sdk/openai-compatible` patch; repository `bun typecheck` passed 12/12. The JavaScript SDK and `packages/sdk/openapi.json` were regenerated from compat sources, preserving compat operations and publishing the new `actorResult` projection.
- Affected matrix at `b79ba5cf5736c4408ace43ebaa697f315b30a08c`, run from `packages/opencode` with `bun test --timeout 120000` in three sequential processes mirroring the CI isolation for `session-actor-recovery.test.ts`: part one `test/tool/ test/mcp/ test/util/ test/provider/ test/flag/ test/skill/ test/history/ test/storage/` — 2388 passed, 9 skipped, 1 failed, 7053 assertions across 158 files in 307.28 s; part two `test/server/` (minus the isolated file) `test/session/ test/actor/ test/inbox/ test/effect/ test/task/ test/plugin/` — 2057 passed, 27 skipped, 1 todo, 0 failed, 6805 assertions across 194 files in 847.09 s; part three the isolated file — 14 passed, 0 failed. A follow-up run added `test/llm-server/` (311/311) after that gap was found by main's exact-SHA CI.
- The single part-one failure is the darwin-only NUL projection case already recorded in the [f11e35ed inventory](upstream-sync-2026-09-11-f11e35ed.md); it reproduces on upstream's unmodified tree on this machine and is green on Linux CI.
- `nested primary ActorTool hands background ownership to the real parent` failed once at 23 s in a combined compat run and did not reproduce on re-run, passes in isolation, and is green on main's exact-SHA CI for the same source. Recorded as a timing flake, not a finding.
- Ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` were removed for every run; the package preload remains the harness baseline. Repository lint passed with zero errors and 4601 warnings; `git diff --check` passed. Final remote-tip equality, exact-SHA CI and upstream -> main -> compat ancestry are separate publication checks.

## 2026-09-13 — terminal publisher inheritance (PR #108)

- Accepted main tip/shared audit: `72064c41ec7311a4d3ca05dc480956f73463c0ff`;
  inherited source/tests: `070100b0357c53d8417af5f93a81cf7414283221`; bundled
  guidance remains `c35c34d45a2e24ab6e48a7a3fd438d1c456352ed`.
- Compat source/test behavior and inheritance merge:
  `4d3abe9ee44d3f87ed62a5636d5e1e4f4b3c7e6e`; prior tip:
  `7c710d74f7bd6cbc10684292ebfe58f382770e64`.
- **Direct inherit, no compat override.** Main closed FC-001's one settling path
  that published without contending for the generation's terminal claim:
  `SessionPrompt`'s continuation, which the 2026-09-12 wake-routing retirement
  moved onto `ActorExecution`. It now records the envelope it published and
  `Actor.cancel` consumes that record instead of publishing a second one. This
  unskips the peer `success`/`failure` variants of `[TP-R14-08] [TP-R14-09]
  ... continuation settles ... once`.
- All seven active DC entries were re-reviewed against the incoming surfaces.
  Only DC-ACTOR-001 names `src/actor/spawn.ts` and `src/session/prompt.ts`, and
  its delta — full-context propagation, frozen request membership, bounded
  actor-visible state, static-prefix overflow, the checkpoint fork default and
  the `replace-agent` identity scope — does not touch terminal-envelope
  publication. Its `Base` does reference FC-001's lifecycle linearization, which
  this change extends; that extension is inherited unchanged, so the entry keeps
  its override and needs no edit. The merge applied with no conflicts.
- The record is in-process de-duplication by design. Across a restart the
  branch degrades to the prior behavior — publish — which is what inherited
  `main` did unconditionally before this change, so compat exposure only
  narrows. Two review findings were declined on that basis and answered with
  evidence on PR #108; the remaining duplicate window (a continuation between
  publishing and recording) closes only by `Actor.cancel` interrupting and
  joining the execution, which is upstream's cancel shape and is scoped to a
  separate PR together with the spawn-side execution claim.
- Three upstream cases stay quarantined under FC-008, all reducing to the
  fork's early-publish contract: `[TP-R14-07] postStop LLM failure preserves the
  successful result with a warning`, `inbox waits for the entire spawn execution
  before starting a continuation`, and `[TP-R14-12] undeliverable terminal
  notification is logged`.

## 2026-09-14 — capability route adoption, MiMo transport pinning, and two capability corrections (PRs #109, #110, #111)

- Accepted main tip/shared audit: `5979dfa34d07dc595d3084cbf4e79038c1220df5`;
  inherited source/tests: `4cf8ff6105655df5aea1c26d73d97ab2b9f6ce30`; reviewed
  upstream: `6fbb1732232c9d0ecefee209798a8586d78cb70d`; bundled guidance advances
  to `11833785` (`model-api.md` retired, `capability-api.md` added, the
  `serve --llm-server` row dropped).
- Compat source/test behavior and inheritance merge:
  `627aa5c204584ff40ce082c52a69988471c86b66`; prior tip:
  `331e850481d9e960263e9289c2a2219684c3f7ae`.
- **Direct inherit, no compat override, no owner added or retired.** Main
  retired the fork's parallel model API — `server/model-api.ts`,
  `server/api-request.ts` and seven `src/llm-server/` modules — and mounted
  upstream's `CapabilityRoutes` at `/v1` inside `InstanceRoutes` instead, then
  adopted upstream's pinning of every MiMo model id to
  `@ai-sdk/openai-compatible`, which retires `usesMimoResponsesApi`,
  `isMimoModel` and the `xiaomi` loader.
- The overlap check was run from `git merge-base origin/dev/compat origin/main`
  (`72064c41`, the previous propagation), not from the compat tip. Measuring
  from the tip counts every compat override in reverse and reports all 39 as
  overlapping; from the real base, **none** of the 41 newly inherited `src`
  files is one compat holds a delta on.
- Two compat-only carryings resolve without a decision. `src/server/server.ts`
  had lost upstream's `/** Bind port. ... */` JSDoc on compat alone, and main's
  copy — rebuilt from upstream — restores it. `test/llm-server/chat-completions.test.ts`
  still asserted `mimo-v2-flash-ptc` -> `/v1/responses`, which #109 retired; the
  file is deleted by #110, so the stale assertion leaves with it. Confirmed this
  is not a lost override rather than assumed: `dev/compat` against
  `main@72064c41` shows zero delta on `provider/provider.ts` and `tool/gpt.ts`,
  so that divergence was un-propagated main history, not a compat decision.
- All seven active DC entries were re-reviewed against the incoming surfaces.
  None names a file on the capability path: that path is
  `routes/instance/capability.ts` plus `src/llm-server/`, and the one `server/`
  file compat owns, `routes/instance/session.ts`, is not on it. DC-NET-001's
  seam is unmoved — `util/ssrf.ts` is touched by neither inherited PR. The merge
  applied with no conflicts.
- Two user-visible consequences arrive with the inheritance. `mimo serve
  --llm-server` is gone; the flag gated only the address advertisement of a
  route that is always mounted and always demands a minted token, and `mimo
  serve` now advertises like upstream while `mimo acp` and `mimo web` pass
  `advertise: false` like upstream. Previously issued capability tokens stop
  working: the fork wrote `version: 2` records where upstream reads
  `version: 1`, and upstream's reader treats an unknown version as an empty
  store. `mimo llm-server issue` is the remedy for both.
- #111 rides along rather than waiting a round: `model.options` is merged at
  upstream's own precedence point, and `Server.listen` brackets an IPv6 literal
  before assigning it to `URL.hostname`. Both carry a mutation-checked test and
  neither touches a compat-owned surface.
- Verification on the merge: `bun typecheck` 0 errors; the inherited surface
  (`test/llm-server/`, `serve-advertise`, `worker-listener`, `util/self`,
  `test/flag/`) 111 pass / 0 fail; the compat-owned surfaces most likely to
  interact (`test/actor/`, `test/inbox/`) 317 pass / 2 skip / 0 fail.

## 2026-09-14 — revoke guard inheritance (PRs #114, #116)

- Accepted main tip/shared audit: `8f94a80c54bfdf630f95767a7e46d5c5977bea1c`;
  inherited source/tests: `bbac42b72bc63ebe52cb74a153c248b4e51a09d2`; reviewed
  upstream and bundled guidance unchanged from the entry above.
- Compat source/test behavior and inheritance merge:
  `644eddc4bbbcf6f10acb2cb00ee28dbc498b50b9`; prior tip:
  `5e6662f7216f0a4c1063e788aec89108c2478e80`.
- **Direct inherit, no compat override, no owner added or retired.** One source
  file and one new test. `mimo llm-server revoke <id> --all` answered `--all`
  first, so the id was discarded in silence and every token for the directory
  was deleted while the caller had named exactly one; the ambiguous form now
  fails. The guard tests presence (`args.id != null`) rather than truthiness,
  because yargs binds an empty positional as `""` and
  `revoke "$TOKEN_ID" --all` with the variable unset is the case it exists for.
  #116 closes the last shape: `parserConfiguration({ "populate--": true })` puts
  an id after `--` in `args["--"]`, never in the positional, so
  `revoke --all -- llmk_...` named a token and still deleted every one. The test
  harness shared that blind spot — it built its own yargs without that
  configuration and so measured a parse shape the real CLI never produces; it now
  sets it explicitly, and dropping it again fails the terminator case.
- The overlap check produced a false positive on the first pass, recorded here
  because it is the previous propagation's trap in a new form: the compat-owned
  set was taken as `main..dev/compat` while `main` already carried the incoming
  fix, so the change being propagated appeared as a compat delta in reverse.
  Measured from the shared merge-base `5979dfa3`, `main` changed only
  `src/cli/cmd/llm-server.ts` and `test/cli/llm-server-revoke.test.ts`, and
  neither is among compat's own changes.
- All seven active DC entries were re-reviewed; none names the CLI token
  commands. The merge applied with no conflicts and `cli/cmd/llm-server.ts` is
  byte-identical to `main` on this branch.

## 2026-09-14 — registry reconciliation inheritance (PR #117)

- Accepted main tip/shared audit: `a2d8d88638c6b898ce36c93f88d66e9a54ea4636`; inherited source/tests remain
  `bbac42b72bc63ebe52cb74a153c248b4e51a09d2` because the change is registry-only.
- Compat source/test behavior and inheritance merge are unchanged at
  `644eddc4bbbcf6f10acb2cb00ee28dbc498b50b9`; this propagation merges `main`
  at `15ed8252da7784c4e61a5c782c78430cb32faa0a` on top of compat tip `8dc952058f9052bd374801b9d26146e6b932200e`.
- **Registry-only inherit, no compat override, no owner added or retired.** The
  three incoming files are the shared FD/FC registries and their history, none
  of which compat changes on its own; measured from the shared merge-base
  `8f94a80c`, the overlap is empty and all three are byte-identical to `main`.
- The inherited content corrects instructions both branches read at the start
  of a sync: FD-004's sync index row and FC-008's 2026-09-07 model API lifecycle
  review still required behaviour FD-004 records as retired, and the FD/FC
  review-record headers still named upstream `98702641` rather than `6fbb1732`.
  All seven active DC entries were re-reviewed; none depends on the corrected
  rows.

## 2026-09-14 — TP-R14-12 unquarantine inheritance (PR #119)

- Accepted main tip/shared audit: `a197d4a84939f36a813cb39750a5fb86cce6b37d`; inherited source/tests:
  `f45cf4f69c3368fb83eb1efe4a989c8f4969c553`.
- Compat source/test behavior and inheritance merge: `c797fa738d86d54eacf26d184d5cd78c4b4e9409`; prior tip:
  `0c480aa95af2b2bb2dbe752242cfa5334ead5d56`.
- **Direct inherit, no compat override, no owner added or retired.** #119 aligns
  the fork's inbox-send log message in `spawn.ts` with upstream's
  `actor terminal notification failed`, which is what `[TP-R14-12] undeliverable
  terminal notification is logged` asserts, and unskips that case. The
  quarantine rationale — a pipeline gap — was wrong.
- Overlap from the shared merge-base `a2d8d886` is `src/actor/spawn.ts` and
  `test/actor/cancel-notification.test.ts`, both DC-ACTOR-001 surfaces. Compat's
  own hunks there add `turnContext` to `ForkContext` and to two fixtures; none
  touches the log line or the case. The merge applied without conflicts and
  DC-ACTOR-001 keeps its override unedited.
- Verified on the merged tree: a known-good neighbour passes; TP-R14-12 passes
  with no timeout; `cancel-notification.test.ts` 28 pass / 0 fail;
  `test/actor` + `test/inbox` + `actor-hooks` + `actor-owned-lifecycle` 347 pass /
  2 skip / 0 fail; `bun typecheck` 0 errors. The remaining skips are the two
  cases still quarantined on the postStop publish-ordering decision.

## 2026-09-15 selected upstream 5198ff54 propagation

- Scope: specified range through `5198ff540efb5ca9fff2baa64555324d43a721b9`, with newer upstream excluded.
- Prior compat: `51591791c592a21513e7703e3109c9a6d12def9a`; accepted main: `321e70c9f491e2f9ff406bf56614c955fc5294de` (PR #121).
- Main source/test behavior: `ee03fe5e9c9c7abd8edb2e28dd6189d903b2ba62`; shared audit: `0d1311eefe5c5c7cb2028425b880d5a659ad5dc5`.
- Compat runtime/test behavior: `bd47323d3c375be255d0c0ca0319d4e5882847e3`; accepted-main ancestry merge: `208f0cb0c9082e5a7706c15d322daa42e37febac` (no source-tree change).
- PR #121 current-head CI passed at `0d1311ee`: [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/34879017303), [typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/34879017290), [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/34879017320). Two review findings were technically corrected at `ee03fe5e`; thread UI state is separate from that evidence.

### Final capability results for this stage (N = 7)

| ID | Selected behavior | Main result | Compat result | Decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Finite Read MIME | Adopted | Inherited, including corrected format-specific size guidance | Shared Read/media source, descriptions and tests |
| C02 | Remove prior-read gate | FC-003 retired | Inherited | Gate and obsolete state tests absent; permissions/path/media tests retained |
| C03 | Model actor context ownership | none-context model creation, system full runtime retained | Adapted: explicit none/state/full and persistent interface retained | Tool/recovery/state tests, both creation-to-resume paths, real HTTP frozen turnContext and native schema tests |
| C04 | Memory independent of checkpoint | Converged FC-002 clause adopted | Inherited with frozen prefix overlay | llm changes are comments only relative to prior compat; identity and prefix semantics retained |
| C05 | Versioned uniform history | Adopted with NUL correction | Inherited | History/migration/API matrix; generated Config.history absent |
| C06 | Plugin SDK npm identity | Adopted | Inherited in core/TUI config | Semver helper source and tests unchanged from accepted main |
| C07 | postStop, execution and cancellation | Separate follow-up pending | Separate inheritance pending | Existing quarantine retained in this stage |

All seven DC owners were reconciled in [the override registry](#2026-09-15-selected-upstream-5198ff54); none retires. Production files without incoming owner changes were compared directly, not declared behaviorally re-tested. NET-002 has no new real-private-network/OAuth evidence.

### Validation

Commands ran in `packages/opencode` under Bun 1.3.14 with ambient experimental, MCP-search and Codex selectors removed. Default integration matrices also removed compaction ratio/context and checkpoint-disable selectors. Package preload still owns `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`. These initial local runs inherited shell `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL=1`; they are not preload-only default-path evidence. `bun ci` preserved the lockfile.

| Matrix | Actual result |
| --- | --- |
| Actor tools/recovery/descriptions | 95 pass, 478 assertions |
| Runtime and model persistent creation-to-resume | 2 pass, 52 assertions |
| Real HTTP actor recovery | 14 pass, 233 assertions |
| Frozen native Actor contract | 4 pass, 34 assertions |
| MaxMode, overflow, UTF-8 caps, TUI metadata/coverage, server coverage and frozen catalog (8 files) | 144 pass, 372 assertions |
| History, history tool, JSON/prefix migration and OpenAPI refs (14 files) | 93 pass, 5 existing benchmark skips, 758 assertions |
| Package `bun typecheck` | Exit 0 |
| Root `bun lint` | Exit 0; 4,563 warnings, 0 errors |
| SDK build and OpenAPI generation | Exit 0; byte-identical to semantic merge generated artifacts |
| Independent recovery/state-cap review tests | 5 pass, 250 assertions |

Two initial frozen-contract cases timed out under concurrent load; the unchanged four-case suite passed serially without increasing timeouts. Full and malformed recovery regressions fail against the old recovery implementation. The SDK/OpenAPI retain per-agent MaxMode and callable checkpoint coverage while removing history configuration. Shared FD/FC/history blobs are identical to accepted main.

Independent review of `bd47323d3c375be255d0c0ca0319d4e5882847e3` found no P1/P2; source files remained fixed during review. Publication and final remote-tip CI are subsequent gates, not inferred from these local results.

## 2026-09-15 shared history preview follow-up

- Accepted main: `e4075dfc141df0b4141fdd817b309bb52b3bca91` (PR #123); main behavior: `64e47eb7695e3ce137ba95a6d1f5b4b381eed58d`; shared audit: `90eef40fc1268bece3e63a7db64180a4a75bd7b2`.
- Compat inheritance and behavior: `967b340faa1389741f08d45cff0ada2a09f52463`. Its only incoming production changes are shared history projection and formatting. All seven DC dispositions and the C03 model interface remain unchanged.
- The initial PR #122 preview-budget finding is corrected through main: SQLite bounds total attachment metadata, previews omit without fabricating a locator, and structural marker recognition preserves real attachments with identical MIME text. Raw get, original locators and delivery remain intact.
- Main PR #123 passed all eight checks at `90eef40f`: [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/34884042595), [typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/34884042999), [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/34884042628). The old locator review thread is technically fixed; its UI resolution state is separate.
- On the compat inheritance tree, `bun test test/history` passes 68 tests, with five benchmark skips, 0 failures and 625 assertions. This run explicitly unsets WORKFLOW_TOOL in addition to umbrella/MCP/Codex selectors; package ORCHESTRATOR preload remains active. History source/tests, shared FD/FC/history and lockfile are byte-identical to accepted main.
- This advances C05's result in the seven-row stage inventory above. C07 remains a separately reviewed lifecycle change; the new compat PR head still requires fresh CI before merge.

## 2026-09-15 final lifecycle inheritance and capability results

- Selected upstream: `5198ff540efb5ca9fff2baa64555324d43a721b9`; newer upstream, including `b4cc11cd`, remains excluded.
- Accepted main: `648f7cdf100b30ff046db7518d8f832473b61481` (PR #124); inherited main source/test behavior: `4eacc84dccf83c22f533c35bea282d4c5a38cacd`; shared audit: `5f06049e568276cd1cea9012f6b114e6ddb2fac2`.
- Prior accepted compat: `b277f8efa0dd379997c40a50798c9086d88c6480` (PR #122). Final compat source/test behavior: `1a072e7aa3b142fc9804974bd8142729817c92db`; accepted-main ancestry merge: `3cf81dabd6efc66d7cbd037292eee742a2a33728`. Later documentation and empty-tree ancestry merges do not advance runtime behavior.
- Direct Effect execution-hook callers coordinate self/ancestor cancellation in the existing service scope. External callers still join full cleanup; model tool calls already use independent bridge fibers. All seven DC owners retain their contracts. Relative to the completed first stage, only four production files change: actor execution, actor spawn, Effect Runner and workflow runtime. Shared execution/Runner/workflow files are identical to main; spawn differs only by the existing frozen turnContext field and watermark explanation. Full-context Actor tool/recovery, context bounds, MaxMode, TUI, network and platform source overlays remain unchanged. SDK/OpenAPI and bun.lock are unchanged.

### Final capability results (N = 7)

| ID | Selected behavior | Main result | Compat result | Decisive evidence |
| --- | --- | --- | --- | --- |
| C01 | Finite Read MIME allowlist | Adopted with modality and size guards | Inherited | Shared Read/media source and existing permission/path/attachment tests |
| C02 | Remove prior-read gate | FC-003 retired with its gate | Inherited | Gate and obsolete state tests absent; remaining file-integrity guards retained |
| C03 | Actor context ownership | Model interface has none-context ephemeral creation; shared system full runtime and resume retained | Explicit none/state/full and persistent full creation retained and recovery adapted | JSON/shell/recovery tools, UTF-8 state caps, runtime/model persistent recovery, real HTTP and frozen native contract |
| C04 | Memory independent of checkpoint | Converged FC-002 rule adopted; FD-002 identity distinction retained | Inherited with frozen prefix behavior | llm system-prompt and frozen-context tests |
| C05 | Uniform resumable history indexing | Adopted with NUL and SQL metadata-budget/locator fixes | Inherited | History/migration/API matrix; final default history 68 pass/625 assertions; raw get and locators preserved |
| C06 | Plugin SDK npm identity | Valid non-local semver pinned | Inherited | Shared semver helper and core/TUI configuration tests |
| C07 | Whole execution completion and cancellation | Accepted postStop result/warnings, interrupt/join, admission barrier, pre-start guard, receipt correction, direct Effect hook self/ancestor cancellation and bounded workflow cancellation wait | Inherited while preserving full-context lifecycle | Final 372-case compat matrix, HTTP14/native4, main132/postStop9/workflow7 and independent real race probes; both formerly quarantined cases enabled |

### Final-source validation

Commands ran from packages/opencode with Bun 1.3.14. The default matrix explicitly unsets umbrella EXPERIMENTAL, MCP_TOOL_SEARCH, CODEX_MODE, WORKFLOW_TOOL, COMPACTION_MAX_CONTEXT, COMPACTION_TRIGGER_RATIO and DISABLE_CHECKPOINT selectors. Package preload retains ORCHESTRATOR=true. This replaces the earlier ambient WORKFLOW_TOOL=1 boundary for the final lifecycle matrix, while retaining those earlier results as historical evidence.

| Check | Actual result |
| --- | --- |
| Actor, inbox, actor hooks, owned lifecycle and exec lifecycle (40 files) | 372 pass, 0 fail, 0 skip, 1,582 assertions |
| Real HTTP actor recovery, separate process | 14 pass, 0 fail, 233 assertions |
| Frozen native Actor shell contract, serial after HTTP | 4 pass, 0 fail, 34 assertions; existing 15-second test timeouts unchanged |
| Package bun typecheck | Exit 0 |
| Final source manifest | 1,254 source/test/harness files in the validation manifest unchanged throughout validation |
| C03 tool input/recovery/descriptions default-path check on unchanged five source/test files | 95 pass, 0 fail, 478 assertions |

The first three runtime groups total 390 passes and 1,849 assertions. The C03 group is separate evidence on unchanged tool-interface files, not part of that total. Shared FD/FC/history registries are byte-identical to main. These source checks do not claim a distributable binary, a new private-network/OAuth acceptance test, or automatic repair of future asynchronous history-index misses after migration completion.

Main acceptance precedes this compat publication. The resulting PR head and actual merged compat SHA require their own CI; final remote-tip ancestry and exact-SHA CI are verified after publication and reported with the operation result.

Main PR #124 passed all eight checks at `5f06049e`: [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/34889363962), [typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/34889363859), [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/34889363855). Its latest automated review completed without new findings. The older tool self-cancellation thread is technically disproved by real frozen-source calls; UI resolution is separate. Direct Effect hook cancellation was independently reproduced and corrected.

## 2026-09-15 accepted publication and documentation closure

Compat PR #125 merged at `90abf6e447d7a5e5b405aba301bf1a951f469bf6`, inheriting accepted main `648f7cdf100b30ff046db7518d8f832473b61481`. Exact merged-SHA [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/34891295940), [typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/34891295906) and [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/34891295928) succeeded. Remote tips and `5198ff54 -> main -> compat` ancestry were rechecked on 2026-09-15. This closes the publication gates of the preceding final-source entry.

All seven capability results in that entry remain valid; runtime/test behavior stays `1a072e7aa3b142fc9804974bd8142729817c92db`. Shared documentation corrects FD-004 correction counting, FD-012 configurable retry wording and FC-008's still-quarantined workflow deadline/disposer case. The two actor cases are enabled. No runtime, SDK, lockfile or reviewed upstream baseline changes are part of this documentation closure. Later documentation commits need their own publication/CI evidence and do not inherit the accepted runtime merge's CI.

## 2026-09-15 complete compatibility difference audit

- Reconciled every one of the 107 main-to-compat file comparisons at main `648f7cdf100b30ff046db7518d8f832473b61481` and compat `90abf6e447d7a5e5b405aba301bf1a951f469bf6`. The [shared report](fork-difference-audit-2026-09-15.md) contains the seven owner results, ranked consolidation proposals and evidence limits.
- DC-CONTEXT-001 now distinguishes chronology/atomic message creation, structured-output replay, request estimation, legacy tool-mask storage and checkpoint coverage. Documentation no longer promises universal non-throwing serialization or treats shared CompactionPart.projection as a new compat API.
- DC-NET-001's retired upload contract and DC-NET-002's mock-only test boundary are explicit. Bundled guidance inherits main content `3fa41ad98ac15668b2b3be899767c6498772ad4b`; runtime/test behavior stays `1a072e7aa3b142fc9804974bd8142729817c92db`.
- This is documentation reconciliation; no suggested runtime migration, deletion, or newer upstream commit is adopted.

## 2026-09-15 F01–F11 shared inheritance and compatibility closure

- 选定 upstream 为 `b4cc11cd652195af9a80297ed543218f3172e6c4`。main PR #131 已接受为 `89866569ee21e106f3c31c39072d8ec3e976d20a`，main runtime/test 为 `3a12d1800d9bfd002f543764e4ec72047e6e6bb3`；compat runtime/test 为 `02cd25b5385dbaffcc629693ca1df2da15af68f2`。PR #129 最终 head `c407439ff4d213977acf3986d79a4e31627cf9db` 真实合并接受 main，并接受为 `ab81af7293ac5ea1ee219bb6aab491d4fd665307`；两棵提交树均与 `02cd25b5` 完全相同。bundled guidance 为 `c6e30d0bd2a651ae40fbf26a1b8913a16696a13e`。此前 `bb6d4049` 继承 main PR #130 接受点 `806a11e4`，CDF/05724 是 P2 修正前的历史验证基线；纯文档不推进行为引用。
- `f48b6e91` 的第一批 main 继承、`eaf99b8b` 的本地验证与 Linux 120 秒失败属于历史阶段。F03 清理 defect、F05 SDK file capture、F06 消息时序/有限事务与身份、F07 并发压缩保护、F09 退役清理和 F11 生成策略现已共享；F04/F10 及完整 F08 coverage 协议仍属 compat。七项 DC 均保留，不因共享上移自动退役产品策略。
- 原子提交仅覆盖经 `commitUserMessage*` 的用户及派生用户消息和 parts。`shellImpl`、Inbox 消息/parts/队列删除仍分步，流式 assistant 也不具备整体原子保证；有限匿名 ID 重试仍要求同 owner 及当前持久内容一致。
- `05724a5c` 历史源码的本地 42 文件矩阵为 482 pass、0 fail、2826 断言、171.23 秒，opencode/SDK/shared typecheck 通过；历史完整 prompt 的 165 pass、2 skip、1 timeout 与仅四 Actor 用例 15 秒预算后 17 断言通过分别保留。SDK 原 pipe 在完整输出 141 operations 后仍退出 137，文件捕获按真实构建路径保持全部断言和原时限，未声称直接捕获 Bun 原生机制。
- 历史 head `bb6d4049` 八项 CI 通过，但 Codex 新增清除 revert 后缓存不收缩的 P2，PR #129 因而曾转为 draft。`f1a9f601` 原行为 6 pass/3 fail 定位容量缺口；`fe9011fb` 继承 main 并消费 removed 数组后 7 pass/2 fail 定位候选缺口；`02cd25b5` 删除前保存无 parts 候选后 9 pass/0 fail/53 断言。Map 上限仍为 100，已知 coverage 不随淘汰删除，PartRemoved 继续有效。已空权威响应的单项/批量探针前后均 requests=2、coverage=[]、pending=false，未见新增可见问题，未扩协议或永久跟踪 partID。
- 固定 `02cd25b5` 的最终九文件矩阵为 61 pass、0 fail、390 断言、11.66 秒，opencode typecheck 通过、14.15 秒；独立两文件 Provider/coverage 为 11 pass、0 fail、241 断言、4.26 秒。历史 42 文件结果不移称为新 head 完整复跑。PR #129 在 `c407439f` 的八项检查已全部成功：[test](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940004167)、[typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940004188)、[lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940004185)。Codex [summary](https://github.com/onlyfeng/MiMo-Code/pull/129#issuecomment-5674809678) 于 2026-09-15 07:15:08Z 完成，没有新增 reviews/threads；既有 P1 误报 UI 仍 unresolved/non-outdated，P2 已 outdated，不称全部线程已解决。接受 SHA `ab81af72` 的 [test 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948422)、[typecheck 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948433)、[lint 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948413) 均已成功。
- 当前完整清单与残差决定见[实施收尾报告](fork-difference-closure-2026-09-15.md)，各阶段源码/测试证据见[compat 实施记录](compat-audit-followups-2026-09-15.md)。[原始审计](fork-difference-audit-2026-09-15.md)及其 529 pairs/470 paths coverage 保持原快照；后续 closing 文档通过独立接受 SHA 与外部回执核验，不能回写自身为已审代码快照。

## 2026-09-15 Inbox atomic drain inheritance

- Accepted main is `d11a9652981e7b5953584205474249775ee54236` (PR #134), with implementation `74d4bfb6008071fca87c245c7791530660d64876`. Compat source/test merge `31e904ff1aa730d0a618901929b05aaba6fc34a9` inherits that accepted main without conflicts from starting compat `49dce5816792e95050cd64561080d3257b714b7f`. Selected upstream stays `b4cc11cd652195af9a80297ed543218f3172e6c4`.
- IC-01 inherits the same Inbox/Session transaction and all three new regression files. DC-CONTEXT-001 retains notification UTF-8 caps, request preflight and checkpoint coverage; DC-ACTOR-001 retains model-created full/persistent actors, frozen turn context and retirement/recovery boundaries. DC-NET-001/002, DC-PLATFORM-001, DC-MODEL-001 and DC-TUI-001 have no owned implementation changes. All seven policies remain active; no compat capability is promoted.
- At `31e904ff`, the default-path matrix passed 142 tests / 657 assertions across 19 files in 106.24 seconds: `test/inbox`, `test/actor/spawn-notification.test.ts`, `test/actor/cancel-notification.test.ts`, `test/session/compaction-projection.test.ts`, `test/server/checkpoint-coverage.test.ts` and `test/cli/tui/checkpoint-coverage-sync.test.tsx`. The same eleven prompt consumer cases selected on main passed 11 / 58 assertions in 17.58 seconds, with 157 other cases filtered out. Package `bun typecheck` exited 0. Tests ran from `packages/opencode` with the eight selectors removed and package preload preserved as documented in the shared Inbox report; no timeout was raised.
- Shared FD/FC/history documentation is inherited unchanged. Current DC wording supersedes the old three-step Inbox statement; shell and streamed assistant/tool output remain outside whole-message atomicity. The source report does not claim exactly-once model execution or crash-durable event delivery.
- Main PR #134 head `050be713bcded58028039a5c8d54df95064dbaaa` passed all eight checks: [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/34956449428), [typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/34956449348), [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/34956449303). Codex completed at 2026-09-15 10:13:51Z with no findings or review threads. Compat PR-head and exact accepted-tip CI are separate publication checks, recorded with the inheritance PR.

## 2026-09-15 shared runtime inheritance and actual compat acceptance

- 在已接受 Inbox compat `78f65017acacae66dfccc1ec28338e131492a929` 上继承运行验收 main `c643adf9dffa57191153cc4452003ba03e3cab32`，集成源码为 `24fc2224bd7041957eac0335310d1286170626ef`。选定 upstream 仍为 `b4cc11cd652195af9a80297ed543218f3172e6c4`。共享 FD/FC/history 和公共运行报告随 main 继承，七项 DC 继续 active；没有整体上移或政策退休。
- RV01/RV02 继承共享真实应用/协议入口；RV03 增加 compat Windows 执行脚本与夹具。`289f6316` 的实际 Windows 运行验证 11 个解压场景和 8 个 no-rg 用例；其插件复验的三个 5 秒子测试超时通过共享 `5165307c` 修正，在 compat `3bd11622` 复验为 3 pass / 0 fail / 6 wrapper assertions。该修正仅为新 child 设置 15 秒预算，25/30 秒外层边界不变。共享 `9bf2b8bc` 安装修正使用声明 Bun 与 `bun ci`，不推进入口 runtime/test 行为引用。
- RV02 的用户范围为本机隔离服务；loopback、自有 RFC1918 实际链及独立准入 sentinel 的执行来源、结果和企业环境边界见 [compat 运行验收](compat-runtime-validation-2026-09-15.md)。候选工件保持原 SHA，后续集成与接受 tip 的 CI/审核由对应 PR 发布回执独立证明；不把阶段性测试相加为一轮完整运行。

## 2026-09-15 shared scoped plugin fixture follow-up

- main PR #138 接受 `2bbd3c0b20f2fb9c005c593585bd320c0e0a91d8` 后，compat 集成为 `302a1727fd2e3462738719656bc521641f525812`，继承 shared fixture `15ca0f83a466f0581ce4e1add6883e0e204318ed`。共享 FD/FC/history 和运行报告保持 main 原文；upstream `b4cc11cd`、bundled guidance 与七项 DC 政策不变。
- PR #137 的 scoped fixture 反馈修正为 Effect-aware 多实例测试和 owned instance 作用域释放，保留全部实际调用链、35 处原断言及 15/25/30 秒预算。候选 compat `3f65c815168af2ac75de3433018c9d8ccac4b7ac` 本机三个 wrapper 3 pass / 0 fail / 6 assertions，24.57 秒；不把原隔离进程说成已证明的生产泄漏。
- 先前 `b7e3f850` 候选的九项 CI 全绿，实际 Windows run `34965350598` 再次证明 11 个解压场景和 8 个 no-rg 用例；因新 review feedback 仍保留 draft。新集成 head 和最终接受 SHA 需要自己的 CI/审核；实际 scope、原始 Windows 来源与平台边界见[compat 运行验收](compat-runtime-validation-2026-09-15.md)。

- 同一 main PR #138 还修复独立实验自有日志流遗漏关闭的问题，源码 `f20e91358da8ba4feef8d669ae1b105486e2566f`。旧实现自然退出仍在真实文件关闭断言确定失败；compat `c7b2fdc59d5852c97131f4a4db4b809d1cc06d88` 完整实验文件复验 11 pass / 0 fail / 69 assertions，13.00 秒。保留 15/30 秒预算，父端并行消费两个管道。旧 `31365b8a` 的单次 exit143 与其成功重跑作为历史间歇现象记录，不声称该次 CI 根因已证，详见 compat RV04。

## 2026-09-15 exact tool-name synchronization

- Selected upstream: `26aa00fc7e243a90586f5895ddcad2b7ce76b935`.
- Accepted main: `a288fb47233e390d8cb984dfcf78108918501011`; source/content `0b8c5d634077f19c2d8c03179f2c869a01a18cec`.
- Starting compat: `1caf307ff8c26137cfd095fe9fa5374293e2e208`; source integration `252f81e93973671580b139a4d55b7bddd5aa4d3b`.
- C01 inherits exact ordinary/GitLab/nested MCP lookup and authoritative checkpoint guidance. Main's control guards and argument normalization remain, as do all seven compat policies. The package overlay is unchanged apart from blob identities and hunk positions.
- Validation: 118 tool and 127 request/checkpoint/prefix/overflow tests pass; package typecheck passes; lint reports 4565 warnings and zero errors. Full commands/environment and the single result row are in the [shared sync record](upstream-sync-2026-09-15-26aa00fc.md).
- Shared registry files are inherited unchanged. This documentation commit advances no runtime/test snapshot; final CI and remote proof are checked after publication.

## 2026-09-17 full upstream synchronization

Selected upstream `4cb859dd7c962b13eee5f34146350f520a380217`, starting compat
`d7ae31894c6b5b4362076ca4b21ddf54c4b4c11a`, accepted main
`b903e3aa9f62cb7c3658fb25e9d618ec4561f5b4`. Compat runtime and generated artifacts are bound to `b277eca8`; final test snapshot is `3e39edd3084e5e31b96e67a7844bc5e067d0e4d3`, with shared record inheritance at `c4ba4d3fb1899133cbbf1448e8104c2022133bc7`.
The [shared inventory](upstream-sync-2026-09-17.md) has exactly eleven rows,
all inherited with the declared DC adaptations. No DC owner retires.

- DC-NET-001/002 and DC-PLATFORM-001: no owned production changes; retain approved intranet behavior and Windows/restricted-network fallbacks. Actual final Windows acceptance belongs to final-SHA CI.
- DC-MODEL-001: per-agent MaxMode remains; new quiet request diagnostics do not make ensemble calls ephemeral or grant subagents session-global status.
- DC-CONTEXT-001: actual Responses provider flows through the source-ID-aware current-turn converter; replay input/text caps, active schema budgets, recovery receipts and checkpoint coverage remain.
- DC-ACTOR-001/002: frozen full-context admission, task identity, cancellation ownership and validated per-actor variants remain. Empty shells are removed atomically after admission, while useful output continues normally.
- DC-TUI-001: request metadata/titleLocale and coverage/revert pagination coexist with the inherited recovery-badge cleanup and slash-prefix title input.

Local evidence: 309 passing tests across 21 focused files, 77 complete Actor tests, 62 prompt attachment tests and 12 HTTP recovery-task/setmode tests. The full prompt-effect run had 170 pass, 2 existing skips and 2 adapter-fallback assertion mismatches; all 3 fallback cases pass after the assertion correction. This is a complete-run plus focused-fix record, not a claim that the full local file was rerun. Package typecheck and lint pass; SDK/OpenAPI regeneration preserves the 140-operation compat surface. Test environment uses the shared record's explicit selector unsets and package-owned preload baseline. Final remote tips, exact-SHA CI and the complete
upstream → main → compat ancestry chain are verified after publication.


## 2026-09-18 — quiet session-wide cancellation

Starting compat `d3d25ec611bbd2c13462acfeaf4cfbcb79efdf4a` inherits main
`1435d830`, whose runtime/tests are `759b6431963cbeb7b0940f4b7a92dc64690624d5`.
Compat runtime integration is `cd49ecf343e08e04e13209b4e4bb00c46320a978`.
[C01](upstream-sync-2026-09-18.md) covers upstream `4cb859dd..2bda1794`.
All 39 existing compat source overlays are unchanged in content; eight DC owners
remain active. Final-source cancellation/lifecycle tests pass 43 cases and
cascade/registry-only/session-key tests pass 3 (77 filtered); typecheck and lint
pass. Prior broad integration runs are not final-SHA evidence. Shared records
remain main-owned. Final branch CI, remote equality and ancestry follow the
record-only commit and are verified separately.


## 2026-09-21 full synchronization

- Selected upstream: `479201262a0f08e6abe9c29022d2fb38b63e29b0`; starting compat: `1d5237f121854d65c4ca6d3bcd7e83312d5a7a8b`.
- Integrated main: `840a5810f7e5d14eb0f543d13afe982aff97e10e`; main runtime/tests: `6bbef7997c6f067558fb89100e17742e732720ca`.
- Compat runtime/tests: `96c64b4854b97365e3ae8358a51f4024ff296f1e`; subsequent shared and compat records change no runtime behavior.
- Inventory: inherit all C01–C11 in [the shared review](upstream-sync-2026-09-21.md). All eight DC owners remain active. No production overlay path is added or removed; canonical ownership and network/platform policy are unchanged.
- Resolve classify by preserving overflow recovery while inheriting completed-tool/final-answer detection. Preserve both compat preflight fixtures and incoming MCP progress tests. Three incoming gate fixture models require 128K capacity to exercise tools under the existing compat budget; real persisted ModelError and absent tool parts established the prior preflight rejection. No production budget was relaxed.
- Validation: 412 session/Actor/context/variant/gate tests pass across the reported groups (337 + 25 + 27 + 19 + 4); separate root matrix 173 pass before its four fixture corrections, and MCP/DC-NET 76 pass. These overlapping groups are not a unique-suite total. Typecheck and lint exit 0; independently regenerated SDK/OpenAPI have no drift. Final branch-tip CI and ancestry remain separate publication checks.


## 2026-09-22 final-CI correction inheritance

- Inherited main: `16394bdc9766c37980a5dce098e3a425ae92c6c8`; main runtime/tests: `3e1fe1607a5ec87fa2f919493b77078d44c60330`.
- Compat runtime/tests: `43ea9dc20fe6ce8e36198aa3d452a56bed51e019`. Upstream baseline remains `479201262a0f08e6abe9c29022d2fb38b63e29b0`; bundled guidance and all eight DC owners remain unchanged.
- Conflict-free inheritance fixes summary protocol rejection being retried as UnknownError and migrates three test fixtures to explicit plugins. Final compat nine-file affected matrix: 242 pass, two existing skips, zero failures / 1418 assertions. Typecheck and lint exit 0. No generated API changes.
- Initial `1082c39d` CI passed Windows, lint/typecheck, shard 1/3 and all isolated suites, but failed four now-reproduced cases in shards 2/4; it is not acceptance evidence for the corrected new tip. Fresh final-SHA workflows and remote ancestry are required after publication.

## 2026-10-20 full upstream synchronization

- Upstream baseline advances from `bf0563ddc201b44e3f59c35b18dba17c4386564d` to `113e3192568a342076e68c70d55b99bd67869dcf`. Starting compat: `97fce708b8dc9353d274b83f718e1a3c7d27416a`; inherited main runtime: `1b2bb10c930997c6c58da89fe7720e2e1c71db5d`; compat runtime/tests: `ac2b653cde97fb3046e6510ff4e5183b59186bd5`. The subsequent main review/test tip `f6632fb8085b4005df4abeb36933b30ee9d74811` carries no additional production changes.
- Inherit all twelve capabilities from the [shared inventory](upstream-sync-2026-10-20.md), preserving eleven DC owners and the same 52 production overlay paths. Adapt fixed MCP dispatch to current-turn masks/hash and real native-search wire preflight; queued receipt authority cannot be borrowed by a stored noReply user to reset recovery budgets. Preserve explicit actor variant on timeout handoff as well as completed outcomes, full-context teardown and trusted nested send provenance.
- The [current DC review](#2026-10-20-owner-impact-review) records every owner, cleanly merged surfaces and independent local matrices. Frozen install, regenerated SDK and CLI/SDK typechecks pass; lint has zero errors. The stopped bare five-second prompt run and combined-process prefix-captor collision remain documented, with bounded targeted and isolated regressions passing; neither is mislabeled as a complete passing matrix. Exact published-SHA CI, including Windows runtime, remains the final publication gate.
- Shared FD/FC registries and the synchronization report inherit main unchanged. This history update changes no runtime behavior and does not advance the runtime SHA.

## 2026-10-20 live readiness catch-up

- Live upstream selection extends to `4e58a80184794d52d913d4b886b96f496f2c7020`; inherit main runtime `b18a1207cd66c312216698c175441b8c49778907` through compat runtime/tests `a10363fe376ad2e4d405c27b6d84128918f6c1e3`, followed by main review `3d9527fd667de159110f594ea79c25dfbf2c5401`. Inventory expands to thirteen with C13. The previous `00f40d32` tip has successful exact-SHA lint/typecheck/test, including all ten test jobs and Windows; it proves only the preceding selection.
- Resolve prompt imports and fixture signatures while keeping current-turn projection, caps, legacy masks/hash, native `LLM.wireTools` preflight and frozen membership/schema authority. Optional readiness and malformed-metadata guards inherit main unchanged; silent auto gains no auxiliary history marker. All eleven owners and the same 52 production overlay paths remain.
- C13 critical 10/10, native-wire 39/39, Actor/send 55/55 and typecheck pass; root lint reports 3,724 warnings and zero errors. SDK and lockfile have no additional changes. Independent complete MCP subset and the new published-SHA CI remain separately recorded publication evidence.

## 2026-10-20 shared OpenAPI repeatability correction

- Completed C13 local evidence: the full MCP affected subset passes 102 tests,
  zero failures and 630 assertions in 223.82 seconds. The previously recorded
  critical 10/10, native-wire 39/39, Actor/send 55/55, typecheck and lint results
  remain valid local evidence. These overlapping groups are not an aggregate
  test count or a substitute for final exact-SHA CI.
- Failed candidate: `dcb6160f59e09031a9e21bb562bed328b40ba7c5` has two
  OpenAPI assertion failures in
  [test run 39410900737](https://github.com/onlyfeng/MiMo-Code/actions/runs/39410900737),
  while the other nine jobs pass. This SHA was not rerun. The original
  assertions are retained; the correction fixes a production generator defect:
  a second generation loses 22 references because cached route response
  metadata was mutated by the first resolution.
- Shared main source/tests: `d2f22b8d293dfb16d28e609c8f6d58047a5ee369`.
  Compat inheritance: `dcc13401331125450c1cdf39308bdefa5994e86f`.
  `Server.openapi()` now isolates response metadata on each fresh app before
  generation. New consecutive and concurrent generation regressions preserve
  the existing checkpoint coverage, model-selection and SDK assertions.
  All eleven DC owners and the same 52 CLI-source/SDK overlay paths remain;
  this correction is inherited shared behavior, not a new compat capability.
- Local correction checks: the complete OpenAPI/model-selection pair passes
  17 tests with zero failures; CLI typecheck and SDK generation exit 0.
  Generated SDK files and `bun.lock` have no additional diff. The complete
  eight-file server adjacency group passes 63 tests, zero failures and 948
  assertions in 72.01 seconds.
- **Accepted exact-SHA evidence:** workflows for
  `dcc13401331125450c1cdf39308bdefa5994e86f` are
  [lint 39413089967](https://github.com/onlyfeng/MiMo-Code/actions/runs/39413089967),
  [typecheck 39413089966](https://github.com/onlyfeng/MiMo-Code/actions/runs/39413089966)
  and [test 39413089981](https://github.com/onlyfeng/MiMo-Code/actions/runs/39413089981).
  All three workflows completed successfully with the exact headSha, including
  all ten test jobs and actual Windows runtime. Final docs-only descendant
  equivalence, remote tips, ancestry and scoped cleanup are checked in the
  execution receipt. This registry-only update advances no runtime behavior reference.

## 2026-10-22 — inherited `e37f2c2d` synchronization

C01-C05 remain shared main capabilities; all eleven DC owners remain. Preserve capped rebuild context and digest, coverage/preflight, full-context actor, model/display/search policy and unchanged network/platform overlays. See [shared evidence](upstream-sync-2026-10-22.md) and the current compat registry for validation and exact-SHA publication.

The final preflight adaptation is fork PR #174: the new appended rebuild digests oversized post-checkpoint history, sends the active turn once and succeeds; frozen-fork no-progress and exhausted-budget guards remain intact. The 18-case preflight set passes. Shared CI bootstrap repair is inherited from main and adds no DC owner.

Live advancement is inherited from main runtime/test `3f6ac1542e605d61bc828dffbdaed74dfc51d620` into compat runtime/test `be4b22055b299a608b064730cc922508a0b002e6`. Persistent empty retries and durable retry parts preserve chronological parent selection, legacy normalization, main-only diagnostics, bounded reasoning continuation and receipt identity. Native-search fallback supplies the required retry kind without a policy change. The 52 production overlay paths and all eleven DC owners are unchanged. Local validation: 125 pass/two existing skips/zero failures, plus 25 native/request/structured retry and 17 OpenAPI/TUI passes. Shared CI and final docs-only equivalence are recorded in the linked evidence.

Final runtime/test CI at `be4b22055b299a608b064730cc922508a0b002e6` completed successfully for lint, typecheck and the complete test workflow, including actual Windows runtime. Final registry-only descendants retain the same outside-docs tree; remote/local equality, live ancestry and scoped cleanup are verified in the final execution receipt.

## 2026-11-07 registry normalization

Moved verbatim from `dev-compat-overrides.md` at compat `25170084fe5cd40a84d6f3b57dd5bda4e8063fbf`: every
section between the current review record and the sync index (75 sections),
with each heading one level deeper. This pure registry commit changes no DC
decision, owner, behavior reference or exit condition and advances neither
behavior reference. Positional words inside these records (`above`, `below`)
refer to their original place in `dev-compat-overrides.md`, where the DC
entries and the current review record remain.

Two links earlier in this file pointed into the moved records and now point
at the same headings here: the 2026-09-15 `5198ff54` owner reconciliation and
the 2026-10-20 owner impact review.

### Previous review record: 10b03cf0 synchronization

- Status: active; all twelve DC owners remain compat-owned. No override retires or moves. Runtime/test integration and complete exact-SHA CI are verified; final documentation-tip publication and cleanup are tracked in the shared record.
- Last reviewed: 2026-11-04; selected upstream `6b66e8ce4aa89962b95a4dcb4119ee399cc9262f..10b03cf04fe43aae89638e90570779c1e1216c5a`.
- Starting main: `07ac991f73dfa73216938571660a17c54f3be916`; starting compat: `12bc737c9542ef944dbf3b62540c367fbd30d04b`.
- Inherited main runtime/tests: `fc0cdcab5eed1e0bfd87732f411d72e056c87651`; reviewed compat runtime/tests: `da08974dfb64ebd6aa995fbe51e87e49051cc076`.
- Scope: C01–C04 (N=4: three upstream capabilities plus concurrently accepted FC-043) in [the shared synchronization record](upstream-sync-2026-11-04-10b03cf0.md): synthetic reminder identity through `metadata.reminder` key/rev tags, a persisted session-environment reminder once per context window, Claude environment text naming `Shell.acceptable()`, and the bounded `ActorTool.cancel` wait. Main owns all four capabilities; compat inherits them with the prompt integration below.
- Direct adaptation: moved compat's existing `agent`/`isBoundedComputation` binding before window-reminder injection and reused that single binding. Preserved `recoverOverflowPlaceholder: skipOverflowCheck || usageRecovered || isBoundedComputation`, bounded-agent exemptions, and the existing overflow branches. Independent static review found no blocking issue; runtime coverage and final CI are recorded below.
- Adjacent review: DC-CONTEXT-001 retains UTF-8 content caps, final request preflight and its bounded recovery episodes, and persisted receipt chronology. New reminder parts are persisted before model-message conversion and included in preflight on both normal and full-context dispatch paths. DC-ACTOR-001 retains frozen system, tools, permissions, cwd and `turnContext`; reminder tags do not grant authority. DC-SESSION-001 retains ownership checks before prompt writes and its immediate receipt transactions. DC-WEBSEARCH-001 retains native-search `LLM.wireTools` sizing; MCP producers retain `metadata.mcpReminder` beside the new identity tag so announcement history and deferral evidence keep their existing consumers. `system.ts` retains the compat available-skills cap beside the shell correction.
- Other owners: DC-NET-001/002, DC-PLATFORM-001, DC-MODEL-001, DC-ACTOR-002, DC-TUI-001, DC-PROVIDER-001 and DC-WEBFETCH-001 retain their current policies; no incoming capability changes their ownership or exit conditions.
- Local validation: on `f7a8e7c9`, focused integration passed 20 tests with 323 filtered, zero failures and 131 assertions; seven core files passed 51 tests with zero failures and 181 assertions. On corrected `da08974d`, the complete recovery-task file passed 11 tests/143 assertions and skill-catalog-reopen passed one test/23 assertions. These local runs are bounded evidence, not a claim that the complete suite ran locally. Tests ran from `packages/cli` with ambient selectors removed, including `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE`, while preserving package preload flags. Detailed commands, earlier failures and intentionally incomplete local groups remain in the shared record.
- Final CI: exact `da08974dfb64ebd6aa995fbe51e87e49051cc076` passed [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/41851513398), [typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/41851513479), and [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/41851513311). All ten test jobs succeeded, including actual Windows runtime and launcher verification. The inherited main source `fc0cdcab` also passed its exact-SHA lint/typecheck/test; links are in the shared record. These complete CI results establish final suite acceptance independently of the focused local runs.
- Ref and ancestry proof: the final source refresh still selected upstream `10b03cf0`, with `origin/main=fc0cdcab` and `origin/dev/compat=da08974d`; selected upstream is an ancestor of main, and main is an ancestor of compat. Any later documentation-only tips require the non-document tree-equivalence and publication receipts recorded in the shared synchronization record.
- Concurrent accepted main: `5d728151e06bfc187e90b244a9fbd91fe4126fe6` (PR #224, FC-043). Inherited the bounded ActorTool cancel wait and guidance unchanged, retaining Token/SessionOwner imports and existing context, variant and cross-process delivery policies. The tool waits at most 30 seconds, reports `cancelling` on timeout and leaves cancellation running; an actual cancellation error remains an error. This does not modify Actor.Service cancellation or any DC ownership.
- Shared ownership: FD/FC/history/report inherit main unchanged; this file owns the compat review. Runtime/test references name the verified source commits; documentation-only updates do not advance them.

### Previous review record: 6b66e8ce synchronization

- Status: active; all twelve DC owners remain compat-owned. No override retires or moves.
- Last reviewed: 2026-11-04; live upstream `7bc7dc3a..6b66e8ce`.
- Starting compat: `bfd640db8b96fa8dd05d877c96c448711f90a1e9`; concurrently accepted compat: `78e06c71c476a018894c00520149805e196aa3de` (PR #223).
- Inherited main runtime/tests: `2516c8e76ba2bd452998e66153878bfd35f15ddf`; reviewed compat runtime/tests: `9a1e4d700607429f8218f7ede3ff37d51f82114f`.
- Scope: C01–C07 (N=7) in [the shared synchronization record](upstream-sync-2026-11-04.md). All upstream capabilities and the concurrently accepted FC-042 update are inherited. Main owns the retained configuration persistence deviation (FD-013).
- Direct adaptation: C02 preserves explicit child variant validation, provider-aware configured-agent precedence and unsupported-configured-value fallback; parent inheritance applies only when neither selector owns the child. Selection, metadata, frozen context, persisted user and actual request agree. Main's configured-model group correction is inherited; main's explicit-model priority remains intentionally different.
- Adjacent review: preserve DC-ACTOR-001 frozen/full context, DC-PROVIDER-001 Responses/sdkKey/declared reasoning, DC-WEBSEARCH-001 native search ordering, DC-SESSION-001 process ownership and DC-CONTEXT-001 preflight/checkpoint coverage. Cloud sharing removal preserves compat model-selection, agent MaxMode, search/fetch configuration and their regenerated SDK surfaces. The two new migrations do not rewrite shipped journals.
- Validation: `bun ci` with Bun 1.3.14 and clean environment; generated v2 SDK, CLI typecheck and lint (zero errors). Full local results, exact-SHA CI and Windows evidence are in the shared record.
- Shared ownership: FD/FC/history/report inherit main unchanged; this file owns the compat review.

### Previous review record: 7bc7dc3a synchronization

- Status: active; all eleven DC owners remain compat-owned. No override retires or moves.
- Last reviewed: 2026-10-31; live upstream `ee0a93b5..7bc7dc3a`.
- Starting compat: `ba60dff21688385113a873e89ef19fc4ed9ad8a1`; inherited main runtime/tests: `b7103b2b17f7201e96a3a563d0b5ac3d127ee51b`; reviewed compat runtime/tests: `f37f9b0ec111c54fb68f7eccb3d0534768f917ea`.
- Scope: C01–C03 (N=3) in [the shared synchronization record](upstream-sync-2026-10-31.md). Main owns the host execution policy for MCP/LSP/formatter configuration, the FC-004 `mergeClaudeMcp` adaptation and regression, legacy TOML rereads with bounded migration, and stored-config persistence. Compat inherits all of them through a clean merge.
- Direct adaptation: none. The compat `config.ts` overlay (`websearch`/`webfetch` schema) is identical before and after propagation. Those blocks select models and network routes, not local executables, so the host filter leaves them in place; every other touched path is byte-identical to main.
- Adjacent review: DC-NET-002 keeps RFC1918 remote MCP admission. `mcp/index.ts` stays byte-identical to main, and the sentinel passes in the isolated `lifecycle` run (34/0). Under the restricted policy, a project-sourced remote MCP entry is dropped before admission, which is a source boundary, not a private-address classifier, so this owner's exit condition is not triggered. DC-WEBSEARCH-001 and DC-WEBFETCH-001 config consumers pass unchanged. DC-ACTOR-001/002, DC-CONTEXT-001, DC-MODEL-001, DC-TUI-001, DC-PROVIDER-001 and DC-PLATFORM-001 have no incoming implementation delta. The production overlay under `packages/` remains the same 54 paths.
- Validation: pinned Bun 1.3.14 `bun ci`, CLI typecheck exit 0, root lint zero errors. The 25-file shared matrix passes 324 with four existing skips, one todo and zero failures (1,024 assertions); the independent `lifecycle`, `oauth-auto-connect` and `refresh-harness` runs pass 34/4/2. Exact-SHA lint/typecheck/test pass on the first attempt, including all ten test jobs and Windows runtime; links are in the shared record.
- Shared ownership: FD/FC/history/report inherit main unchanged; this file owns the compat review.

### Previous review record: ee0a93b5 synchronization

- Status: active; all eleven DC owners remain compat-owned. No override retires or moves.
- Last reviewed: 2026-10-30
- Upstream: `ee0a93b5dff36f689e28957b2e4377159a9a9731`
- Main behavior: `f9ef3fcc5c4d8256f4805ea60897911f1753b6bf`
- Compat behavior: `cd1fdc8de0b6eba7363dde88a4ea1bc191e04841`
- Review: [2026-10-30 C01–C03 inventory](upstream-sync-2026-10-30.md). Inherit failed/interrupted compaction cleanup, requested model and truthful owned summarize outcomes; keep DC-CONTEXT-001 active-only tool membership/tail sizing and DC-ACTOR-001 preflight. DC-WEBSEARCH-001 drops the Xiaomi sidecar, retains configured native/fallback routes, and permits Exa only when enabled for any provider. Remaining DC owned contracts are unchanged; production overlay remains 54 paths. Final source lint/typecheck/test CI passes, including Windows runtime and launcher; documentation-tip proof and cleanup are tracked in the linked record.

### Previous review record: 3e92e0d8 synchronization

- Status: active; all eleven DC owners remain compat-owned. No override retires or moves.
- Last reviewed: 2026-10-29; live upstream `ebd06ee2..3e92e0d8`.
- Starting compat: `b01a3be82a44f376f94e5810da7f16bb845771cf`; inherited main runtime/tests: `61a589679a10968dfad60280eb4aa2c4993765fd`; reviewed compat runtime/tests: `6bc84001a223e12306d0c39796c24bff2747b3c9`.
- Scope: C01–C04 (N=4) in [the shared synchronization record](upstream-sync-2026-10-29-3e92e0d8.md). Main owns caller-supplied session ids, Xiaomi credential placement and the family consumers; compat inherits them with one adaptation.
- Direct adaptation: DC-WEBSEARCH-001 (C03). The sidecar gate and its credential key follow the session model's Xiaomi family provider, configured fallbacks still run next, and family sessions still never reach Exa. The tool gate keeps `NativeWebSearch.exposed` beside the family check. The upstream token-plan sidecar test gains the compat Config/Provider layers; a new regression covers a keyless token-plan session through a fallback and, when it fails, the WEBFETCH hint with zero Exa calls. Reverting the Exa gate, or the gate and key, fails those tests.
- Adjacent review: DC-TUI-001 display helpers and DC-CONTEXT-001 checkpoint coverage keep their `util/model.ts` code beside `familyDefaultModel` (test import union only). DC-PROVIDER-001 xAI routing and `forceReasoning` merge cleanly beside the family checks in `provider.ts`/`transform.ts`. DC-ACTOR-001/002 and DC-CONTEXT-001 treat session ids as opaque keys, so supplied ids change nothing there. DC-MODEL-001, DC-NET-001/002, DC-PLATFORM-001 and DC-WEBFETCH-001 have no incoming implementation delta. The non-test compat overlay path set remains 54 paths.
- Validation: pinned Bun 1.3.14 bun ci; final CLI typecheck exits 0 and lint has zero errors. Final 21-file matrix: 667 pass, zero skips, zero failures and 1,850 assertions. The SDK regenerated from compat source equals the merge. Exact-SHA lint/typecheck/test links are in the shared record.
- Shared ownership: FD/FC/history/report inherit main unchanged; this file owns the compat review.

### Previous review record: ebd06ee2 synchronization

- Status: active; all eleven DC owners remain compat-owned. No override retires or moves.
- Last reviewed: 2026-10-28; live upstream `24546043..ebd06ee2`.
- Starting compat: `48e52e5cd073e88cdcdf573bb81e831713d81d39`; inherited main runtime/tests: `224410e8544505fa75da185ec3d1f28d91945df9`; reviewed compat runtime/tests: `4fa1d2cb055104509e14e5d64f5629bac6d8ce92`.
- Scope: C01 (N=1) in [the shared quota synchronization record](upstream-sync-2026-10-28-ebd06ee2.md). Main owns exact quota-exhaustion classification and the scope-specific ordinary429 test adaptation. Compat inherits both without a conflict.
- Direct adaptation: none. DC-MODEL-001 MaxMode budgets and DC-WEBSEARCH-001 native-search error routing retain their existing behavior; quota/auth failures still do not mark native search unsupported. Shared bounded request versus persistent live-step budgets and main-only status/event publication are unchanged.
- Adjacent review: DC-ACTOR-001/002, DC-CONTEXT-001, DC-TUI-001, DC-PROVIDER-001, DC-NET-001/002, DC-PLATFORM-001 and DC-WEBFETCH-001 have no incoming implementation delta. The non-test compat overlay path set remains 54 paths.
- Validation: pinned Bun 1.3.14 bun ci and final CLI typecheck exit 0; lint has zero errors. Final six-file matrix: 219 pass, two existing skips, zero failures and 1,930 assertions. Focused quota tests: 7 pass, 122 filtered, zero failures (overlap). The inherited checkpoint progress fixture correction additionally passes 22/22, including the new fixed-clock isolation regression; no checkpoint runtime policy changes. Repaired exact-SHA lint/typecheck/test all pass on the first attempt, including all ten test jobs and Windows; links are in the shared record.
- Shared ownership: FD/FC/history/report inherit main unchanged; this file owns the compat review.

### Previous review record: 24546043 synchronization

- Status: active; all eleven DC owners remain compat-owned. No override retires or moves.
- Last reviewed: 2026-10-28; live upstream `d85f3553..24546043`.
- Starting compat: `e52c587f5221b05502288a2ab68555a714b5d458`; inherited main runtime/tests: `f001dd2be038a3b66ae25ef431c6c594075ced7e`; reviewed compat runtime/tests: `5cee6fc9bcc8710df59ac4187c854e02afa20b09`.
- Scope: C01 (N=1) in [the shared synchronization record](upstream-sync-2026-10-28.md). Main owns config-driven always-direct MCP exposure, the SDK regeneration and mutable config-array correction. Compat inherits all shared source changes without a conflict.
- Direct adaptation: none. DC-ACTOR-001 retains frozen membership, model and schema authority; DC-CONTEXT-001 retains preflight and content caps on direct and exec paths. The shared direct-call rejection preserves GPT hidden and legacy frozen exceptions alongside always-direct selection.
- Adjacent review: DC-NET-002 private remote MCP transport and DC-PLATFORM-001 fallbacks are untouched. DC-MODEL-001, DC-TUI-001, DC-WEBSEARCH-001 and DC-PROVIDER-001 selection/routing remain unchanged beside the inherited prompt change; DC-ACTOR-002, DC-NET-001 and DC-WEBFETCH-001 have no incoming implementation delta. The production overlay path set under packages remains identical at 54 paths excluding tests.
- Validation: pinned Bun 1.3.14 locked install, CLI typecheck and lint pass (zero errors). The affected matrix passes 173/173, filtered MCP/frozen prompt-effect passes 74/74 (175 filtered), and isolated lifecycle passes 34/34. Regenerated SDK has no additional diff. Exact-source-SHA lint/typecheck/test all pass, including all ten test jobs and Windows runtime; links are in the shared record.
- Shared ownership: FD/FC registries, history and shared report inherit main unchanged; this file owns compat review details.

### Previous review record: d85f3553 synchronization

- Status: active; all eleven DC owners remain compat-owned. No override retires or moves.
- Last reviewed: 2026-10-27; live upstream `0fe2cbbc..d85f3553`.
- Starting compat: `d12b7bed616f271a3a33aba36e4da8cbaf14746d`; inherited main runtime/tests: `f49d577b2c7fa51f8444ef5e00297af68dde2211`; reviewed compat runtime/tests: `19ce44bc94fad9208036fc5731940d05e40fbb71`.
- Scope: C01-C04 in [the shared synchronization record](upstream-sync-2026-10-27.md). Main owns Windows system-tar launcher extraction, explicit MiMo npm wire coverage, README assets/downloads and the lighter workflow concurrency regression. The inherited Windows CI additionally executes the existing launcher suite on actual Windows.
- Direct adaptation: none; both merges are clean. Launcher and selected incoming tests match main. DC-PLATFORM-001 retains its separate archive and ripgrep fallbacks. DC-PROVIDER-001 retains xAI Responses routing and SDK options beside the new Anthropic explicit-npm suite. No incoming source changes its implementation.
- Adjacent review: DC-CONTEXT-001, DC-ACTOR-001/002, DC-MODEL-001, DC-TUI-001, DC-NET-001/002, DC-WEBSEARCH-001 and DC-WEBFETCH-001 retain their contracts. The production overlay path set under `packages/` is identical before and after propagation (54 paths excluding `/test/`); no generated or lockfile delta is introduced.
- Validation: Bun 1.3.14 locked install, CLI typecheck and lint pass with zero lint errors. The local affected installation/provider/workflow/platform matrix passes 486 tests with three skips and no failures across 14 files. Exact-source-SHA lint/typecheck/test all pass, including all ten test jobs and actual Windows launcher extraction (26/26; the PATH-shadow zip regression executes and passes). Links are in the shared record.
- Shared ownership: shared registries/history/report are inherited unchanged from main; this file owns the compat review.

### Previous review record: 0fe2cbbc synchronization

- Status: active; all eleven DC owners remain compat-owned. No override retires or moves.
- Last reviewed: 2026-10-26; live upstream `e37f2c2d..0fe2cbbc`.
- Starting compat: `5a8382b16be549fc09d3aa1e492a82f78f7f6641`; inherited main runtime/tests: `33f43f4d200fb7609c9d281e7f06f285960b79b7`; reviewed compat runtime/tests: `07dc3d41b0cc199e8b6401c8c2ac7b85f8f90eb9`.
- Scope: C01-C05 in [the shared synchronization record](upstream-sync-2026-10-26.md). Main owns the agent-CLI skill opt-in, the removed `claude` PATH probe, declared model npm, the 0.1.16 release and the release workflow changes.
- Direct adaptation: DC-PROVIDER-001 keeps its `config provider on @ai-sdk/xai sends Responses requests with its provider options` wire test unchanged beside upstream's renamed npm tests; that test file was the only conflict. With the MiMo pin gone, a MiMo-named id on a config `@ai-sdk/xai` provider now reaches the compat Responses routing instead of `@ai-sdk/openai-compatible`, which matches this owner's declared-SDK rule. DC-CONTEXT-001 keeps the available-skills byte cap in `session/system.ts` next to the removed environment line.
- Adjacent review: the extracted skill set changes before discovery, so DC-ACTOR-001 frozen catalogs and DC-CONTEXT-001 caps no longer receive the agent-CLI skills merely because a binary is on PATH; neither policy changes. DC-MODEL-001, DC-TUI-001, DC-ACTOR-002, DC-WEBSEARCH-001, DC-WEBFETCH-001, DC-NET-001/002 and DC-PLATFORM-001 have no incoming implementation delta. The non-test overlay path set under `packages/` is identical before and after the merge.
- Validation: Bun 1.3.14 `bun ci` completes without a lockfile diff; CLI and root typecheck exit 0; root lint has zero errors. The affected skill/provider/system/tool matrix plus `openai-responses-reasoning.test.ts` passes 586/586 across 23 files. Exact-SHA CI is tracked in the shared record.
- Shared ownership: shared registries/history/report are inherited unchanged from main; this file owns the compat review.

### Previous review record: e37f2c2d synchronization

- Status: active; all eleven DC owners remain compat-owned. No override retires or moves.
- Last reviewed: 2026-10-22; live upstream `8fd65328..e37f2c2d`.
- Starting compat: `ac667d4b2db1dce6f893ca6d6944f72ab5f21e61`; inherited main runtime/tests: `3f6ac1542e605d61bc828dffbdaed74dfc51d620`; reviewed compat runtime/tests: `be4b22055b299a608b064730cc922508a0b002e6`.
- Scope: C01-C05 in [the shared synchronization record](upstream-sync-2026-10-22.md). Main owns appended boundary placement, chronological legacy compatibility, receipt-aware writer/turn restoration, atomic recovery settlement, Compose Next anchors, spec provenance, persistent pure-empty retries and normalized durable retry records.
- Direct adaptation: import unions in checkpoint/prompt retain coverage queries, schema helpers, model selection and request overflow classification. DC-CONTEXT-001 retains capped digest/rebuild output, current-turn preflight, canonical request sizing and coverage; DC-ACTOR-001 retains frozen full-context authority, capture and static overflow handling.
- Live retry/record adaptation: the native-search immediate-fallback callback supplies the new required retry kind without changing its policy. Recovery keeps its parent lock and disables the new-input watcher; summary/MaxMode budgets, reasoning-only bounded continuation and receipt delivery identities remain shared contracts. The production overlay path set remains exactly 52 paths.
- Adjacent review: DC-MODEL-001 per-agent MaxMode, DC-TUI-001 selection display and DC-WEBSEARCH-001 native/fallback routing inherit changed prompt code without a policy change. DC-ACTOR-002 and DC-PROVIDER-001 remain unchanged. DC-NET-001/002, DC-PLATFORM-001 and DC-WEBFETCH-001 have no incoming implementation delta; Windows remains a final CI runtime requirement.
- Validation: Bun 1.3.14 `bun ci` completes without changing the lockfile; CLI typecheck exits 0, root lint has zero errors and SDK regeneration exits 0 with no extra diff. The final window/coverage/search matrix passes 75/75 (382 assertions); the corrected preflight matrix passes 18/18 (228 filtered, 113 assertions), including no-progress and recovery-budget guard cases. PR #174 aligns the obsolete stalled-main-rebuild expectation with actual successful recovery, adding wire-content assertions; its lint/typecheck pass and the integration tree equals its reviewed head. Shared FC-008 subsequently exposes npm bundled node-gyp before locked CI installs. Live-advancement validation adds 125 passes (two existing skips, 626 assertions) over 15 files; native/request/structured retry supplement adds 25 passes; OpenAPI/TUI supplement adds 17 passes and 665 assertions. CLI package typecheck passes, resolved SDK has no extra diff, lint has zero errors. Exact-SHA final CI is tracked in the shared record.
- Shared ownership: shared registries/history/report are inherited unchanged from main; this file owns the compat review.

### Previous review record: 8fd65328 synchronization

- Status: active; all eleven DC owners remain compat-owned. No override is retired or promoted to shared `main`.
- Last reviewed: 2026-10-21; full live synchronization over `cf8c09d5315ea04a5af613f392ff17a8832b33c1..8fd65328d976ae5636b46221264626e71ce0037f`.
- Starting compat: `e7bbf8e60116074b50fa9a53eb3f61224cac1b1f`; inherited main runtime/tests: `4c710d22f6985e1c100e6a5dac2e069d85fb8c7c`; reviewed compat runtime/tests: `17cfd7672a3e0b362405274308c4bba26c4a0224`, integrated with accepted main PR #172 merge `1c5a6cccb92494c5c0b0796e153b88829a3e39dc` without further source change.
- Scope: C01–C07 in [the shared synchronization record](upstream-sync-2026-10-21-786151b3.md). Main owns the memory paths reminder and the legacy placeholder resolution, the lossless session database, the empty-turn identity reset, Compose Next, the voice default and the terminal refusal order.
- Bundled guidance: main `dfd6d5f8a9b25dfadb86cda088cd285aea466a49` is inherited unchanged; no DC owner or discovery/permission policy changes.
- Direct adaptation: DC-CONTEXT-001 keeps `estimateRequestTokens`, `isRequestOverflow` and `classifyRequestOverflow` while `pressureLevel`/`contextPressureLevel` leave with turn-end prune, and retires the JSON-schema recall-reminder suppression together with the recall reminder. The memory paths reminder is not format-gated. `capSyntheticText` and the other content caps are unchanged. Compat-only test adaptations: the `actor.test.ts` checkpoint stub drops `hasMemoryOrTasks`; the pressure-level tests leave `overflow.test.ts`; `recall-reminder.test.ts` and `rebuild-microcompact.test.ts` follow upstream's deletion. The marker-chronology assertion compat had added to the latter stays covered by the shared `checkpoint-rebuild-unify.test.ts`.
- Adjacent review: DC-ACTOR-001 full-context actors share the parent session ID, so the memory paths reminder in copied history names the correct directory. Subagent runLoops do not serve checkpoint and receive no reminder of their own. Frozen system/tool/permission membership and `overflow-static` handling are unchanged. DC-MODEL-001, DC-TUI-001, DC-WEBSEARCH-001, DC-ACTOR-002 and DC-PROVIDER-001 share `prompt.ts` or `retry.ts` without changed selection, display, search, variant or routing behavior. The compat `title-first-turn.test.ts` overlay merges with upstream's TP-REFUSAL-01 cases without conflict. DC-NET-001, DC-NET-002, DC-PLATFORM-001 and DC-WEBFETCH-001 have no changed admission, transport or fallback boundary.
- Validation: Bun 1.3.14 `bun ci` completes without a lockfile diff; CLI typecheck exits 0 at `edc727db` and `6f0ee690`; SDK regeneration produces no extra diff. The 55-file affected matrix at `edc727db` passes 1,208 tests with five skips and one 30s timeout, `resume continues an incomplete assistant…`, which passes alone. Over three standalone runs of compat `prompt-effect.test.ts`, two pass 244/0 and one fails `MCP auto deferral recognizes legacy announcement metadata` because `prompt.loop` sends no model request. That is the same symptom recorded for main, and the concurrently run compat baseline `e7bbf8e6` passes 244/0. The root cause is not established. The C07 set at `6f0ee690` passes 209, and its single failure is a 30s timeout that also fails on main's baseline. The first PR-head CI exposed five shared fork-test assertions pinned to the old reminder behavior; the inherited main correction passes 12/0 locally on compat. The propagation branch `17cfd767` passes dispatch test [39606863322](https://github.com/onlyfeng/MiMo-Code/actions/runs/39606863322) on all ten jobs, including the Windows runtime, and root lint exits 0 with zero errors. Exact-SHA CI for the pushed `dev/compat` tip is recorded in the shared synchronization record.
- Shared ownership: FD/FC registries, history and the shared report inherit main unchanged. Only this file owns compat review details; pure documentation commits do not advance source/test snapshots.

### Previous review record: cf8c09d5 synchronization

- Status: active; all eleven DC owners remain compat-owned. No override is retired or promoted to shared `main`.
- Last reviewed: 2026-10-21; full live synchronization begun on 2026-10-20 over `4e58a80184794d52d913d4b886b96f496f2c7020..cf8c09d5315ea04a5af613f392ff17a8832b33c1`.
- Starting compat: `61f0f9169133674b2a9f67c0586b89d74cd226a3`; inherited main runtime/tests: `03b3dfffa9a61d368ec67a550c3481aad911cbad`; reviewed compat runtime/tests: `646975a29693ec04e09d1fa35f6e135d6098989d`.
- Scope: C01–C04 in [the shared synchronization record](upstream-sync-2026-10-20-c1527b91.md). Main owns capture defect containment, Deferred snapshot drain accounting, scoped capture fixture isolation and the writer-registration test barrier.
- Bundled guidance: `6e37642aa9a77165b2e83182aa61e66038d195dc` is inherited at compat `fbe9e8844498685c672ed8169171fdc111e0b259`. C04 adopts the Compose Next text unchanged; no DC owner or discovery/permission policy changes.
- Direct adaptation: DC-CONTEXT-001 and DC-ACTOR-001 retain `turnContext`, `currentTurnMessages`, current-user projection, frozen model/catalog/tool/permission identity, loaded MCP membership and legacy active masks. The complete prior capture body is unchanged inside the new interrupt-preserving boundary; empty capture still rejects child creation.
- Adjacent review: DC-MODEL-001, DC-TUI-001 and DC-WEBSEARCH-001 share `prompt.ts` without changed selection, display or search behavior. DC-ACTOR-002 and DC-PROVIDER-001 keep variant admission and Responses routing; adapter interrupts propagate. DC-NET-001, DC-NET-002, DC-PLATFORM-001 and DC-WEBFETCH-001 have no changed admission, transport or fallback boundary.
- Validation: Bun 1.3.14 `bun ci` completes without a lockfile diff. Corrected capture/drain focused tests pass 9/9 with 33 assertions; CLI typecheck exits 0 after using the existing `const empty` assertion pattern. The 19-file affected matrix passes 419 tests with two skips and zero failures (2,448 assertions). Each branch additionally passes 38 C04 skill-loading/discovery/permission/search tests. Published C04 source `6a02b3d3a89ecfaf36e4ec0cb77af79479384001` passes exact-SHA lint/typecheck/test, with all ten test jobs successful including Windows runtime. The shared record links the six successful workflows for both branches and verifies upstream-to-main-to-compat ancestry; final docs-only descendant equivalence, refreshed remote tips and scoped cleanup are checked independently in the execution receipt.
- Failure history: the first focused run passed 8 and failed F40 because spawn preceded writer registration. Main's first matrix reproduced the same shared test race. The inherited fix waits for the public running state within the original budget; it changes no production behavior. The initial fresh-object assertion type error and its narrow correction are retained in the shared record.
- Shared ownership: FD/FC registries, history and the shared report inherit main unchanged. Only this file owns compat review details; pure documentation commits do not advance source/test snapshots.

### Previous review record: first 2026-10-20 synchronization

- Status: active; all eleven DC owners remain compat-owned. No override is retired or promoted to shared `main`.
- Last reviewed: 2026-10-20, full upstream synchronization over `bf0563ddc201b44e3f59c35b18dba17c4386564d..4e58a80184794d52d913d4b886b96f496f2c7020`.
- Starting compat: `97fce708b8dc9353d274b83f718e1a3c7d27416a`; initial inherited main runtime: `1b2bb10c930997c6c58da89fe7720e2e1c71db5d`; initial reviewed compat runtime/tests: `ac2b653cde97fb3046e6510ff4e5183b59186bd5`. The completed intermediate compat tip `00f40d329cf26e19dbaff131158494aec8b19e82` integrates main `f6632fb8085b4005df4abeb36933b30ee9d74811`. C13 inherits main runtime `b18a1207cd66c312216698c175441b8c49778907` at compat runtime/tests `a10363fe376ad2e4d405c27b6d84128918f6c1e3`, with main review `3d9527fd667de159110f594ea79c25dfbf2c5401`; final publication references are recorded in [the synchronization report](upstream-sync-2026-10-20.md).
- Scope: all thirteen shared capability rows C01–C13, including cleanly merged DC surfaces and the newer DC-ACTOR-002, DC-PROVIDER-001, DC-WEBSEARCH-001 and DC-WEBFETCH-001 entries. The prior eight-owner and 120-path records below are historical snapshots.
- Latest shared correction: main `5e366d0923c5570c5097ae1a9c5deffb86e5a79d` is inherited by compat `e92151b7c473c1f350c334b083a96a7c60127fd4`. CronBridge now stops the scheduler owned by a disposed instance generation; this shared FC-007 correction adds no DC owner. The prior OpenAPI correction at main `d2f22b8d293dfb16d28e609c8f6d58047a5ee369` / compat `dcc13401331125450c1cdf39308bdefa5994e86f` remains inherited. Final publication evidence is recorded in the shared synchronization report.
- Resolution: adopt the shared durable queue, receipt lifecycle, actor waits, execution ownership, fixed `mcp_tool_use` dispatcher, readiness hints, empty-output retries, thinking-signature fix and UI/release changes while preserving the eleven contracts below. Silent auto-mode without a real reminder/call may re-evaluate; no auxiliary cache-mode state is persisted. Schema generation uses the resolved compat source, including checkpoint coverage and model selection.
- Validation: default-path commands remove ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE`, retaining package preload and each test's scoped opt-ins. `bun ci` completes without a lockfile change; SDK regeneration exits 0 with no additional generated diff, CLI/SDK typechecks pass, and lint reports zero errors. The completed local groups and incomplete full-file runs are distinguished below; exact-SHA CI remains the publication gate.
- Shared ownership: FD/FC registries and the shared report inherit main unchanged; only this compat registry owns the overlay decisions below.

#### 2026-10-20 specified post-sync convergence

Compat `6ec7fcda7d09eec541054b02a08c401cd6aca2ad` inherits main
`8cbf76bc725b93f65561868b515213d45ff72380` without conflicts. The shared
queue-interface cleanup, fork-history reuse, main-only retry diagnostics and
MCP contract correction are owned by main; no DC owner is added or retired.
The prompt/processor overlay against main is unchanged by this inheritance,
and all compat-only prompt cases remain.

The subsequent shared cron correction at main `5e366d0923c5570c5097ae1a9c5deffb86e5a79d`
is inherited through compat `e92151b7c473c1f350c334b083a96a7c60127fd4`.
Its source and tests match main exactly; no compat-specific cron variant is
introduced. The lifecycle regressions use the shared Effect test harness.

Layout snapshot `79f210072d52a66bcd79be1b0cbec348a4e53cfa` moves the unchanged
`blankTo` comment and function below `renderInboxRow`, matching upstream, and
restores its two-line structural-subset comment. Removing that moved block and
the restored comment leaves the rest of the file byte-identical. DC-CONTEXT-001
retains UTF-8 caps, the closed notification wrapper and blank-body fallback;
the redundant content casts remain absent.

The four render/empty-part/notification suites pass 42 tests with zero failures
and 84 assertions. The inherited queue/lifecycle group passes 106 tests and CLI
typecheck exits 0. A separate local 25-file integration run finishes with
203 pass and nine deadline-related failures; it is not full passing evidence.
A targeted recheck with CI-matching Bun 1.3.14 yielded 5 pass and four
deadline-related failures; these local results do not establish their cause.
The layout is published through PR #166, based on the shared cron correction.
Final merge SHA and exact-SHA CI are recorded in the shared synchronization
report after the integration checks complete.

#### 2026-10-20 owner impact review

| Owner | Incoming relationship and retained contract | Decisive surfaces and validation |
| --- | --- | --- |
| DC-NET-001 | Queue and hosted-search changes do not replace explicit approval for private-network WebFetch. Private destinations remain direct-only under hosted fetch. | `tool/webfetch.ts`, hosted destination routing; WebFetch and hosted-fetch default/permission/private-bypass tests. |
| DC-NET-002 | MCP catalog deferral and readiness reporting change discovery, not remote HTTP(S) admission or connection waits. Retain the RFC1918 reachability guarantee without adding a production fork. | MCP lifecycle suite, including the private-address admission sentinel; this is not a new real-private-subnet transport claim. |
| DC-PLATFORM-001 | Inherit exact instance/workspace identity and fixed cwd while keeping restricted-network and Windows ripgrep/archive fallbacks. | `file/ripgrep.ts`, `util/archive.ts`; ripgrep/archive tests. Windows runtime remains an independently executed platform check. |
| DC-MODEL-001 | New receipt scheduling and empty-output retry policy retain per-agent MaxMode, final-step bounds, title isolation and main-only status ownership. | Agent config, `session/max-mode.ts`, prompt model selection; MaxMode/retry-status suites and full prompt matrix. |
| DC-CONTEXT-001 | Queue-rendered input replaces raw inbox draining. Preserve UTF-8 caps, current-turn preflight, legacy active masks/toolsHash, checkpoint coverage and chronology; noReply storage cannot reset an admitted request's recovery budget. C13 real reminders enter the same current-user conversion and preflight while readiness stays outside schema hashes. | `inbox/render.ts`, `message-v2.ts`, prefix/compaction/preflight, TUI coverage and HTTP schema; message/context/catalog, prefix, recovery-budget, coverage/OpenAPI and prompt suites. |
| DC-ACTOR-001 | Shared actor wait/cancel and durable notifications retain frozen full-context membership/system/cwd/turnContext, bounded recovery and refusal of an unrecoverable static prefix. Notification rendering retains its cap and closed wrapper. Readiness lists only names surviving the frozen request catalog; it cannot expand the executable pool. | `actor/spawn.ts`, `tool/actor.ts`, checkpoint/prompt capture; actor/inbox/tool ownership, frozen-prefix and full-context compaction tests. |
| DC-ACTOR-002 | New background-handle and wait behavior retains provider-aware model/variant validation, explicit precedence, no accidental parent inheritance and actor-lifetime persistence. | Actor tool schema/models listing and spawn-to-prompt propagation; variant-guidance, spawn, tool-model and ownership tests. |
| DC-TUI-001 | Inherit actor send/footer/login UI changes while retaining request provider/model/variant truth and title locale. Receipt acceptance does not alter the preview or selected variant store. | Prompt/subagent metadata, server model-selection endpoint; model metadata/preview, model-selection and checkpoint-coverage synchronization tests. |
| DC-PROVIDER-001 | Thinking-signature preservation does not replace SDK-based Responses routing or declared reasoning capability. Retain custom xAI routing and explicit OpenAI `forceReasoning` opt-out. | `provider/provider.ts`, `provider/transform.ts`; provider, transform and real-SDK Responses reasoning serialization suites. |
| DC-WEBSEARCH-001 | Fixed MCP dispatch, evidence-based sticky deferral and readiness hints coexist with opt-in provider-native search. Preserve native permission gating, search-specific in-turn fallback, replay downgrade, raw server output and identical `LLM.wireTools` preflight. | `llm.ts`, prompt preflight, processor/transform, websearch chain and TUI native-search display; native-search wire, replay, fallback, registry and provider tests. |
| DC-WEBFETCH-001 | Main has no hosted-fetch replacement. Keep direct-first default, private-target bypass, requested-URL proof, caller timeout, permission rejection propagation and chained route errors. | Hosted fetch/destination/config/SDK surfaces; WebFetch hosted/destination/direct tests. |

#### C13 readiness propagation

The live increment `113e3192..4e58a801` adds the shared readiness amendment
without introducing a DC owner. Live resolution and prefix capture use
`hasMcpDeferralEvidence`: new `mcpReminder` parts, actual search/use calls and
legacy `mcpDeferredTools` announcements retain deferral. Without real evidence,
silent auto may choose a different mode when tools arrive. Capture must retain
`currentUserID` and both `inheritedMessages` and `currentTurnMessages`; it must
not manufacture a bookkeeping part to stabilize that choice.

Connection status comes from the non-blocking MCP getter. Connected names and
descriptions are intersected with the existing request-authorized catalog after
permission, request-disable, agent/frozen membership, executable/schema and
local-collision checks. The active mask still selects wire schemas separately;
readiness neither grants hidden implementations nor changes `toolsHash` or
legacy `active_tools`. The actual native-search wire subset remains the input
to compat preflight. Real entry/server reminders share the upstream token
budget and remain subject to the existing current-turn and request-window
checks; earlier sent history is not rewritten. Invalid historical reminder
metadata is ignored by the shared parser rather than becoming a compat fork.

No lockfile, manifest, public schema or SDK input changes in C13. SDK files are
unchanged against the completed intermediate compat tip; no regeneration is
needed for that readiness amendment. Its completed local groups are:

| C13 scope | Observed result |
| --- | --- |
| Critical readiness/evidence cases | 10 pass, 0 fail. |
| Native-search wire and current-turn integration | 39 pass, 0 fail. |
| Actor tool and real Inbox send | 55 pass, 0 fail. |
| Complete MCP affected subset | 102 pass, 0 fail; 630 assertions; 223.82 seconds. |
| CLI typecheck and repository lint | Exit 0; lint reports zero errors and 3,724 warnings. |

These groups overlap and are not a unique-suite total. They establish local
C13 behavior; the final published-SHA workflows remain a separate gate.

#### Shared OpenAPI correction and accepted-source evidence

The C13 candidate `dcb6160f59e09031a9e21bb562bed328b40ba7c5`
failed two OpenAPI assertions in
[test run 39410900737](https://github.com/onlyfeng/MiMo-Code/actions/runs/39410900737);
the other nine jobs passed. That SHA was not rerun. The failure exposed a
production generator defect: resolving a document mutated response metadata
shared by cached route modules, leaving 22 dangling references on the second
generation.

The inherited main correction `d2f22b8d` copies response metadata onto each
fresh generation app before resolution. Consecutive and concurrent generation
regressions retain the existing checkpoint coverage, model-selection and SDK
contract assertions. Compat `dcc13401` inherits this shared implementation;
the eleven DC owners and the same 52 CLI-source/SDK overlay paths remain.
The complete OpenAPI/model-selection pair passes 17 tests with zero failures.
CLI typecheck and SDK generation exit 0, with no additional SDK or `bun.lock`
diff. The complete eight-file server adjacency group passes 63 tests with
zero failures and 948 assertions in 72.01 seconds.

**Accepted exact-SHA evidence:** the new workflows
for `dcc13401331125450c1cdf39308bdefa5994e86f` are
[lint 39413089967](https://github.com/onlyfeng/MiMo-Code/actions/runs/39413089967),
[typecheck 39413089966](https://github.com/onlyfeng/MiMo-Code/actions/runs/39413089966)
and [test 39413089981](https://github.com/onlyfeng/MiMo-Code/actions/runs/39413089981).
All three workflows are completed/success with this exact headSha; all ten
test jobs pass, including Windows runtime. The earlier successful `00f40d32`
runs and the failed `dcb6160f` run are historical. Final docs-only descendant
equivalence, remote tips, ancestry and scoped cleanup are checked separately
in the execution receipt.

#### Initial C01–C12 validation and publication boundary

The groups below overlap and are not an aggregate test count. All use the
three-selector default environment described above and the package preload.
`bun ci` installs 1059 packages without changing `bun.lock`. The resolved
runtime retains 52 differing CLI-source/SDK paths against the inherited main
runtime; shared fixture corrections are not additional DC capabilities.

| Scope | Observed result |
| --- | --- |
| Ripgrep/archive and UTF-8/serialization helpers | 63 pass across four files. |
| MCP lifecycle | 34 pass, including the RFC1918 admission sentinel. |
| WebFetch, hosted routing/destinations, native WebSearch and tool registry | 141 pass across seven files. |
| Provider/transform/Responses reasoning | 370 pass with a 45-second command budget. The earlier 15-second run timed out only on the two oversized-image recompression cases; no production image policy was changed. |
| Native-search wire behavior and per-agent MaxMode | 34 pass across four files. |
| Model metadata/preview/selection and checkpoint coverage/OpenAPI | 50 pass before the old prompt-async response assertion was corrected to include 202; the complete OpenAPI file then passes 6/6. |
| Message replay, classification, instructions, overflow, checkpoint tail and TUI context selection | 290 pass and one existing todo across eight files. |
| Frozen skill catalogs and compat projection | 49 pass across seven files. |
| MCP/prefix/full-context/compaction subset | 57 pass. |
| Recovery receipt/renderer/task integration | 45 pass across three files. |
| Inbox directory | 131 pass across 21 files. |
| Actor ownership/tool run | 63 pass; explicit-variant timeout handoff additionally passes its real-server lifecycle regression, preserving the live child and its variant metadata. |
| Recovery-budget authority | Two accepted-input cases pass; a stored noReply user cannot reset the exhausted budget and its counterexample passes. |
| Processor and writer-first overflow adaptation | 33 pass and two existing skips. |

The bare full-prompt command was stopped after 95 passes and one five-second
budget timeout; it is not a complete passing file. The timed-out frozen-hidden
tool case has no explicit five-second test budget and starts real exec/Bash
children. Both matching/changed-schema cases pass under the package's normal
30-second command budget, with 20 assertions. The combined actor directory
also is not reported as fully green: an AppRuntime/local-layer prefix-captor
reference collision precedes eight negative recovery cases; those eight pass
in their dedicated process without weakening their assertions. Final complete
coverage is the branch's exact-SHA CI gate, whose owning jobs use their declared
process isolation and 120-second test budget.

SDK regeneration and CLI/SDK typechecks pass; repository lint reports zero
errors and 3720 warnings. Remote-tip CI/ancestry evidence is recorded at
publication. No local subset or stopped process substitutes for
that final gate. This intermediate phase subsequently passed all ten jobs of
[the exact-tip test run](https://github.com/onlyfeng/MiMo-Code/actions/runs/39409350305)
for `00f40d329cf26e19dbaff131158494aec8b19e82`, including all four shards,
Windows runtime, recovery and MCP isolation jobs. That successful older tip
does not substitute for C13's final branch-tip validation.

### Previous review record — 2026-10-16

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-10-16, full upstream synchronization through `bf0563ddc201b44e3f59c35b18dba17c4386564d`.
- Prior upstream: `496bb8cbe614aecea27623457d143600cc12c275`.
- Starting compat: `b1a83b0bc4e4f973c019a0c3781cfd3ecb271802`.
- Integrated main: `aaa53f4e56136ee1bf845b02ff080716ea2a0c66`; compat runtime merge: `a0d4a550242e86f11eaba52c63d68d646badcb33` (of main runtime merge `92f5f6a5adeade500f0def7555dd43e14b083545`).
- Review: [one-capability synchronization](upstream-sync-2026-10-16.md), C01.
- Resolution: inherit main's adaptation unchanged. The merge is conflict-free: the incoming hunks meet no DC overlay — DC-CONTEXT-001's compaction active-tools membership (`frozenActiveTools`) sits in the frozen-prefix construction beside the unchanged summary path, and its `capSyntheticText` and model-selection hunks in `prompt.ts` do not overlap the envelope, `?? input.system` or tokenizer changes; the merged overlay diff against main is content-identical to the pre-merge overlay on all five overlay paths (`compaction.ts`, `prompt.ts`, TUI `prompt/index.tsx`, `prompt-effect.test.ts`, `prompt.test.ts`), and the `[Attached <mime>: <filename>]` substitution is gone from compat's replay exactly as on main. Both shared registries are byte-identical to main after the merge. The compat-different set stays at 120 paths, 42 under `packages/cli/src` and `packages/sdk/src`; no DC owner retires or moves.
- Validation: default path with ambient `MIMOCODE_EXPERIMENTAL` unset (`MIMOCODE_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE` absent). At `a0d4a550`: package `bun run typecheck` exits 0; root lint reports 3599 warnings and zero errors; focused matrix (`prompt`, `clipboard-spill`, `compaction-reasoning-fallback`, `compaction-tool-choice`, `compaction-projection`, `message-v2`, `skill-catalog-system-tail`, `overflow`) 274 pass, 0 fail; `test/session/prompt-effect.test.ts` 212 pass, 2 existing skips, 0 fail — the compat baseline counts.
- Shared ownership: FD/FC registries inherit final main byte-for-byte. Remote-tip CI and ancestry are checked after publication.

### 2026-11-06 inherit FC-052

Inherited from `main` PR #249 (FC-052: the build scripts read the commit SHA, local-change state and build time before `generate.ts` runs and define `MIMOCODE_BUILD`; the `mimocode` startup log line adds `build=<sha>[+dirty|+dirty-unknown]|source` and `built_at`); no owner added or retired. Conflict-free: `build.ts`, `build-node.ts`, `index.ts`, `installation/version.ts`, `.github/workflows/test.yml` and `script/meta.ts` have no compat overlay, and the merged files are byte-identical to `main`. `--version`, the user agent and session `version` are unchanged on compat as on `main`. The ssh agents run local `dev/compat` builds, so their restart check can read `build=` from each process's `dev-main-<pid>-*.log` instead of inferring the commit from the binary's inode.
Validation at the merge: root `script/release.test.ts` and `script/build-provenance.test.ts` 15 pass, 0 fail; `packages/cli` `test/installation/` 51 pass, 1 existing skip, 0 fail; package `bun run typecheck` and `tsgo -p tsconfig.scripts.json` exit 0, with `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE` unset.

### 2026-11-06 inherit FC-051

Inherited from `main` PR #247 (FC-051: prompt admissions and `SessionRevert.revert`/`unrevert` share a per-session gate, so a prompt sent during a revert waits and commits it; TUI undo restores the prompt only after its revert returns, keeps a draft typed meanwhile, and skips a message another prompt committed away); no owner added or retired. Conflict-free. Compat's `preparePrompt` (with the DC-SESSION-001 `ExecutionOwnership` claim and the inbox receipt) runs whole inside `SessionRevert.admission`, so the claim and the receipt are taken after a pending revert is committed. Compat's TUI overlay in `routes/session/index.tsx` (the DC-WEBSEARCH-001 native web search row) does not meet the undo command. The gate is per process: under DC-SESSION-001 the owning process admits a session's prompts, and an ssh agent's TUI is its own owner, which is the case this fixes (ssh_01 lost 43 messages to it today).

### 2026-11-06 inherit FC-050 and the FC-049 stream summary

Inherited from `main` PRs #243 (FC-050: the Claude environment runs `git status --short --untracked-files=normal`, capped at 200 lines / 10,000 characters, and `SessionPrefixSnapshot.get` drops a frozen prefix whose status section exceeds the cap) and #245 (FC-049 extension: `SseStats` replaces the byte scanner and a long or aborted stream logs a content-free `SSE stream summary`); no owner added or retired. Conflict-free. Compat's `system.ts` overlay (the byte cap on the available-skills catalog) and `prefix-snapshot.ts` overlay (`toolsHash` with loaded MCP tools, `restoreActiveTools` with the legacy mask) do not meet the git status rendering or `get`; every compat caller of `SessionPrefixSnapshot.get` (`compaction.ts`, both `prompt.ts` sites) treats a missing row as "pin a fresh prefix", so a dropped oversized prefix is rebuilt there as on `main`. On this host three Opus `general` lanes failed today on a 1,006,035-character status section; those frozen rows are dropped on their next read.

### 2026-11-06 inherit the FC-049 test margins

Inherited from `main` PR #242 (test only: the FC-049 cases use a 3 s chunk timeout against a 1 s event timeout, 50 ms heartbeats against a 1 s chunk timeout, and event spacing well inside each); no owner added or retired. Conflict-free. It fixes the `dev/compat` tip's shard 4 failure on `4ad2d84d`, where the 150 ms chunk timeout fired before an event under CI load ("SSE read timed out" in "events keep resetting the event timeout across a longer stream").

### 2026-11-06 inherit FC-048, FC-049 and the sandbox timer test

Inherited from `main` PRs #238 (FC-048: a step-finish summary reads its session and turn snapshot anchors from the part table instead of hydrating the main slice, runs once per session at a time with later requests folded into one more pass, and `diffFull` leaves the patch empty for rows past a 1 MiB per-file or 8 MiB total blob budget), #239 (FC-049: a provider `eventTimeout` that SSE comments do not reset; off unless configured) and #240 (the sandbox cancellation cases count only timers created by the sandbox module); no owner added or retired. Conflict-free: `summary.ts`, `snapshot/index.ts` and `sandbox.test.ts` have no compat overlay, and compat's `provider.ts` overlay (the `@ai-sdk/xai` Responses routing in `getLanguage`) does not meet `wrapSSE` or the timeout option parsing. Against DC-SESSION-001 the per-session summary queue is per process, which matches its single-owner rule: only the owning process runs a session's steps and so its summaries. The anchors keep the `agent_id = 'main'` slice, so inbox lanes bound neither diff, as before. The sandbox test fix targets the compat-only flake: a pending DC-SESSION-001 wake-poller timer was counted as a sandbox timer.

### 2026-11-05 inherit FC-047 and the FC-046 deferral

Inherited from `main` PR #235 (FC-046: with no step finished since a rebuild or compaction boundary the ladder is not initialized, so a compaction summary's usage never becomes the baseline) and PR #236 (FC-047: under `checkpoint.fork: false` the writer runs on `agent."checkpoint-writer".model` when one resolves; the FC-036 delta check uses that model's positive usable window, and a parent-view fork stays on the parent's model); no owner added or retired. The only conflict was the `checkpoint.ts` import block: compat's `@/storage` import (with `NotFoundError`, `sql`) and `alias` are kept, `agentModelRef` is added, and `InboxTable` stays imported once. Compat's `tryStartCheckpointWriter` overlay does not touch the no-fork model sites, so every no-fork prefix, fork-context and spawn model reads `writerModel` exactly as on `main`.

### 2026-11-05 inherit FC-046

Inherited from `main` PR #233 (FC-046: after a rebuild or compaction boundary the checkpoint ladder counts the non-final thresholds below the rebuilt context plus one ladder step as crossed; the final threshold still fires; compaction summaries are not read as the lane's context); no owner added or retired. Conflict-free; `prune.ts` has no compat overlay, and compat's `prune.test.ts` overlay (the `coverage` stub member) is untouched.

### 2026-11-05 inherit FC-039 late-tail recovery

Inherited from `main` PR #231 (FC-039 extension: the tail of a DCS/OSC/APC reply that arrives after the 1 s string wait is recognized by its reply characters and terminator within 10 s and kept out of the prompt); no owner added or retired. Conflict-free; the opentui patch has no compat overlay.

### 2026-11-05 inherit FC-045

Inherited from `main` PR #228 (FC-045: the checkpoint extraction re-prompt targets 85% of each over-budget file and section in one pass; validation thresholds unchanged); no owner added or retired. Conflict-free; the writer retry files have no compat overlay.

### 2026-11-04 inherit FC-044

Inherited from `main` PR #226 (FC-044: the checkpoint writer task tells an `exec` caller to return only each result's `.output`); no owner added or retired. Conflict-free; `composeWriterPrompt` has no compat overlay.

### 2026-11-04 inherit FC-043

Inherited from `main` PR #224 (FC-043: `actor cancel` waits at most 30 s for the actor to stop, then returns `cancelling` while cancellation continues detached); no owner added or retired. One import-block conflict in `src/tool/actor.ts` with DC-SESSION-001's `SessionOwner` import; both kept. The compat cancel path is otherwise main's.

### 2026-11-04 inherit FC-042

Inherited from `main` PR #222 (FC-042: a bounded agent's usage reaching the compaction trigger is not an overflow; only a provider rejection ends it); no owner added or retired. Conflict-free. DC-CONTEXT-001's request preflight already skips bounded agents (`!isBoundedComputation`), so with FC-042 a bounded agent such as the checkpoint writer runs until the provider rejects a request; its `max_context`-derived trigger no longer ends it early.

### 2026-11-04 inherit FC-040 and FC-041

Inherited from `main` PRs #219 (FC-040: a read-only subagent's `canWrite` ignores catch-all allows merged after its own catch-all deny, so `--yolo` no longer has the progress checker ask `explore` to write a journal) and #220 (FC-041: `exec` `files.readText` reads `<data>/memory/`); no owner added or retired. The merge is conflict-free: DC-ACTOR-001's `spawn.ts` overlay (frozen `turnContext`, subagent `variant`) does not meet the `canWrite` hunk, and `tool-script.ts` carries no compat overlay.

### 2026-11-04 inherit FC-036, FC-037, FC-038 and FC-039

Inherited from `main` PRs #214 (FC-036 writer delta window guard), #215 (FC-037 `actor receipt` and the receiver model in send results), #216 (FC-038 keyed actor sends) and #217 (FC-039 split terminal replies in the opentui stdin parser); no owner added or retired.

- Conflicts: `src/inbox/controller.ts`, `src/inbox/inbox.ts` and `src/tool/actor.ts`, all with DC-SESSION-001. Resolution keeps both sides: `AgentInput` carries `adoptReceiver`, `metadata`, `idempotencyKey` and `reviveUnseen`; `actor send` keeps `adoptReceiver: false` across sessions and adds the FC-038 key; its result merges the compat `delivery` fields with FC-037's `model` and FC-038's flags, and a deduplicated send is titled `Already sent to …` before the compat `Queued for …: session not open`.
- DC-SESSION-001 adaptation: FC-038 requeues an unseen keyed row in place. Its revive branch now uses the same in-transaction wake placement as an inserted input (`placeWake`, extracted from the insert path unchanged), so a revived message for a session open in another process, or in none, leaves a wake instead of waiting for an unrelated one.
- Test adaptation: the inherited FC-038 actor-send case expects the compat title `Queued for <actor>: session not open` for the same key to another actor of an unopened receiver.
- Evidence: `test/tool/actor-send.test.ts` "a keyed resend that revives an unseen message leaves a wake for the unopened receiver" (fails when the revive branch skips `placeWake`).

### 2026-11-04 DC-SESSION-001 durable cron delivery to another session

Follow-up to PR #209, no inherited change and no owner added or retired. A durable task fires in whichever process holds `.cron-lock`, but it belongs to the session that created it. The bridge prompted that session in its own process, so when another live process owned it `preparePrompt` refused with `OwnedElsewhereError` and the fire was lost; the fire also waited for the lock holder's own session to go idle. Such a fire is now written to the target session's inbox (`type: "cron"`, receiver `main`, `adoptReceiver: false`): it runs in the process that has the session open, or waits until one opens it. It reads as the in-process fire does and carries the cron origin. Its idempotency key names the task and the slot the scheduler fired (`onFire`'s new `due`), which every process computes alike for a fire not yet recorded, so a slot fired twice is delivered once. The lock holder's turn no longer holds these fires back (`StartOpts.firesElsewhere`); its own session's tasks still wait for it. A durable task of the lock holder's own session also goes through the inbox with the same key (Codex review: a fire delivered by one process and refired in-process by the next lock holder would otherwise run twice); only session-only tasks keep the in-process path. A sentinel in a fire for another session is expanded in full every time, since this process never sees that session's compaction reset its short-reminder cache (Codex review).

Evidence (runtime/tests on `fix/compat-cron-inbox-delivery`, pinned Bun 1.3.14, ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE` unset):
- `test/session/cron-inbox-delivery.test.ts`: with the lock holder's session busy, a durable task created by another session lands as one accepted `cron` row for that session's `main` lane, keyed `cron:<task>:<slot>`, with the fire text and cron origin, nothing injected or kicked here; firing the slot again after a restart leaves one row. A durable task of the lock holder's own session lands the same way, runs here, and also stays one row when refired. Two cross-session sentinel tasks both deliver the full autonomous-loop preamble; `test/cron/sentinel.test.ts` covers fires that must not remember, for both sentinel kinds. `test/cron/scheduler.test.ts`: a busy session fires another session's due task and holds its own until idle; a restarted scheduler gives an unrecorded fire the same slot. `test/inbox/render.test.ts`: a `cron` row renders without the `<inbox>` wrapper. In `test/session/cron-bridge.integration.test.ts` the restart case now expects its fire, aimed at the creating session after the bridge remounted for another, in that session's inbox.
- Each of these fails a case: rendering a `cron` row as text, dropping the key or the part metadata in `Inbox.accept`, prompting the other session in-process, keying by fire time, not passing `firesElsewhere`, adopting the receiver, returning early or holding every task while busy, and passing the fire time as the slot, firing an own-session durable task in-process, getting either adoption rule wrong, remembering a cross-session sentinel, and letting a fire that must not remember read or write the cache.

### 2026-11-03 DC-SESSION-001 cron bridge remount (FC-026)

Inherited from `main` PR #197, no owner added or retired. `InstanceBootstrap` now remounts this process's cron bridge after an instance recycle. A remounted bridge fires through `injectScheduledPrompt`, which enters `SessionPrompt.prompt` and so `preparePrompt`; that claims the session for the current process first, so a process whose session another live owner has taken fails the fire with `OwnedElsewhereError` instead of driving it. Compat's `bootstrap.ts` hunk (the abandoned-actor sweep through `Effect.try`) and main's remount are separate hunks and merge without conflict.

### 2026-11-02 DC-SESSION-001 boot reconciliation outcome (FC-024)

Inherited from `main` PR #191, no owner added or retired. `reconcileOnBoot` now settles a claim already delivered into the conversation (`consumed`) as `interrupted` and an undelivered one as `never_ran`, the rule `cancelInputs` already applied. Compat's controller overlay (owner checks, unclaimed-input retry, write-contention transactions) merges without conflict around it: the two changed `set` calls are inside the existing `immediate` transaction and `assertOwnership`. The unclaimed-input retry reacts only to `accepted` rows, which reconciliation leaves `never_ran` as before, so its rings and backoff are unchanged.

### 2026-11-02 DC-SESSION-001 unclaimed input retry

Follow-up to PR #187, no inherited change and no owner added or retired. Woken input could stay accepted for hours with its owner alive and idle: a woken run ended without claiming it (it failed before the claim, or claimed nothing), the wake was cleared when the run settled, and `laneKick` requeues only after a success or a claim, so nothing kicked the lane again until the next input. In the six `aistudy` windows this held three lanes for 9 to 10 hours each. Any kick that settles with waiting input still accepted now rings the lane again, and the wake poller retries it with a bounded backoff (contract above). Two delivery cases changed their stand-in scheduler from a no-op to one that claims and settles the input, as a lane does: with a no-op the wake now rightly stays, because the input is still waiting.

Evidence (runtime/tests on `fix/compat-inbox-wake-retention`, pinned Bun 1.3.14, ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE` unset):
- `test/inbox/session-owner-delivery.test.ts` passes 12/12 twice. Both new cases fail when the settle-time ring is removed (the wake is cleared after the first run and the input is never claimed), and when the poller's backoff gate is removed (the lane is kicked on every poll).

### 2026-11-02 DC-SESSION-001 write contention

Follow-up to PR #183, no inherited change and no owner added or retired. Six windows over one database file showed two faults. A window exited: its instance was disposed under a running session, the TUI's refresh made the server boot a fresh instance, the boot-time sweep's read-then-write transaction met another process's commit and threw `database is locked`, the throw escaped `Effect.catch` as a defect, and the refresh's fatal bootstrap exited the TUI. Woken input stayed accepted for hours: the inbox claim, a deferred read-then-write, failed the same way, and the failure was neither logged nor retried. `main` is not affected: its sweep is a single write, and only compat reads first. The contract above now covers write contention.

Evidence (runtime/tests on `fix/compat-sqlite-busy-resilience`, pinned Bun 1.3.14, ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE` unset):
- Each new case failed when its rule was removed: the deferred sweep fails in about 4 ms with `database is locked` while another process holds the write lock, and with `immediate` it waits for the commit (about 1 s) and settles the row; `Effect.sync` lets the throwing sweep fail the boot; a fatal dispose refresh never retries.
- Locally `test/inbox`, `test/actor`, `test/cli/tui`, `test/project` and the owner, liveness and execution-ownership session files pass 1010 cases, 5 skip, 3 fail. The three failures (two `poststop-progress-write-permission` cases and one `spawn` read-only GPT tool case) fail identically on the unchanged base `df211e32` on this host. Package typecheck exits 0; root lint reports zero errors.
- Exact-SHA CI on `2dd59fe0` passes lint, typecheck and the test run dispatched with `windows_runtime: true` (all four unit shards, the dedicated suites and `windows-runtime`). Codex review on `2dd59fe0` reported no findings.

### 2026-11-01 DC-SESSION-001 Windows lock release

Follow-up to PR #183, no inherited change and no owner added or retired. The first `windows-runtime` run on merge `e332bb94` passed every selected case but failed each focused suite's teardown with `EBUSY` while deleting the per-run test data directory: the process's liveness lock file stays open for its lifetime, and Windows cannot delete an open file. `ProcessLiveness.release()` closes and deletes this process's lock, and the test preload calls it after `Database.close()`, before it removes its directories. Deleting another instance's dead lock file is now best effort: on Windows a concurrent probe's open handle makes the deletion fail, which used to throw out of `status`/`claim`; a file left behind is deleted by a later probe. The Windows entry (DC-PLATFORM-001) also runs `process-liveness` and `session-owner` as a focused suite, so the lock primitive is checked on real Windows locking and deletion rules. New overlays: `test/preload.ts` and `script/verify-windows-runtime.ts`, both previously identical to main.

Evidence (PR #184, runtime/tests `66a2baae`, pinned Bun 1.3.14, ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE` unset):
- Exact-SHA CI dispatched with `windows_runtime: true` passes lint, typecheck, all four unit shards, the dedicated suites and `windows-runtime`. On Windows, archive, no-rg, `hidden-tools`, `run-approval`, `tool-gate-orchestration` and the new `session-owner` suite all exit 0; the three focused suites that failed teardown on `e332bb94` no longer do.
- On Windows the release case confirms that the lock is closed before its file is deleted, and the existing liveness and ownership cases pass on Windows locking (kill, probe, coordinated second probe, adoption).
- Both new cases failed before the fix: `release` was missing, and `isAlive` threw `EACCES` on an undeletable dead file. The deletion-blocker case is skipped for POSIX root, which deletes inside a read-only directory. On Windows it uses only the open handle, because Bun's recursive mkdir fails with `EEXIST` on a read-only directory.
- Locally, the owner, liveness, e2e, prompt, execution-ownership, registry, delivery and actor-send files pass 75/0. Typecheck exits 0 and lint reports zero errors. The final Codex round on `66a2baae` reported no findings.

### 2026-10-31 DC-SESSION-001 added

New compat owner, no inherited change: one live process drives a session when several MiMo processes share one database (design `docs/superpowers/specs/2026-10-31-session-process-ownership-design.md`). It adds the twelfth owner to the sync index. New source files: `session/process-liveness.ts`, `session/session-owner.ts`, `session/session-owner.sql.ts` and migration `20261031000000_session_owner`. Overlays: `session/execution-ownership.ts`, `session/run-state.ts`, `session/prompt.ts` (`preparePrompt`), `inbox/controller.ts`, `inbox/inbox.ts`, `inbox/inbox.sql.ts`, `inbox/schema.ts`, `tool/actor.ts` (`send`), `actor/registry.ts`, `storage/index.ts`, `cli/cmd/tui/worker.ts` and `cli/cmd/tui/thread.ts`, plus tests. `session/prompt.ts` and `tool/actor.ts` were already compat-different. With a single process the visible behavior is unchanged; a cross-session `actor send` now reports where the message runs.

### 2026-10-19 DC-WEBFETCH-001 added

New compat owner, no inherited change: an opt-in `webfetch` config block lists gateway models that fetch a public URL when the direct fetch cannot (a host without public DNS or egress), with private targets kept direct-only. It adds two new source files, `tool/webfetch-hosted/destination.ts` and `tool/webfetch-hosted/hosted.ts`, and overlays on `tool/webfetch.ts`, `tool/webfetch.txt`, `config/config.ts` and the generated SDK `types.gen.ts`, plus two test files. Without a `webfetch` config block, WebFetch routing is unchanged; the only always-on change is the tool description's added line about hosted results.

### 2026-10-18 DC-WEBSEARCH-001 added

New compat owner, no inherited change: provider-native web search with in-turn fallback and a configurable Codex search layer for the `websearch` tool (design `docs/superpowers/specs/2026-10-18-compat-native-websearch-design.md`). It adds the tenth owner to the sync index (the current review record above still counts eight; DC-ACTOR-002 and DC-PROVIDER-001 were added after it). The compat-different set grows from 120 paths (42 under `packages/cli/src` and `packages/sdk/src`) to 135 (49): two new source files, `tool/websearch/native.ts` and `tool/websearch/codex.ts`, and overlays on `config/config.ts`, `session/llm.ts`, `session/prompt.ts`, `session/processor.ts`, `provider/transform.ts`, `tool/registry.ts`, `tool/websearch/index.ts`, the TUI session route, the generated SDK `types.gen.ts`, tests and the design/plan documents. `session/llm.ts`, `session/prompt.ts`, `provider/transform.ts` and the SDK types were already compat-different. Without a `websearch` config block, request payloads, tool lists and websearch results are unchanged.

### 2026-10-15 pre-admission inbox wake cancellation propagation

Direct inherit of main `40f69640` (PRs #160, #161, #162), no compat override, no owner added or retired. Main's FC-001 follow-up advances a per-session `CancelEpoch` in `SessionRunState.cancel`, records it with a hold when `Inbox.wake` schedules, and refuses the wake inside `Runner.ensureRunning`'s atomic admission once it moved; `Session.remove` releases the entry after the last hold. Compat merge `8cdd8ea8` is conflict-free. `session/run-state.ts`, `effect/runner.ts`, `inbox/inbox.ts`, `inbox/inbox-ref.ts`, `session/cancel-epoch.ts` and `session/session.ts` are byte-identical to main; the compat `session/prompt.ts` overlay auto-merges and carries both `cancelEpoch` hunks (the `LoopInput` field and the main-agent inbox loop's `ensureRunning` argument), so DC-CONTEXT-001, DC-ACTOR-001, DC-MODEL-001 and DC-TUI-001 keep their contracts. Both shared registries are byte-identical to main after the merge. The compat-different set stays at 120 paths, 42 under `packages/cli/src` and `packages/sdk/src`. Validation at `8cdd8ea8` with ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` unset: package typecheck exits 0; root lint 3599 warnings, zero errors; `test/inbox/` 83/83 (including upstream's abort-immediately-after-send case); `test/effect/runner*` 63/63; 23 session/server/run-state files including `test/session/cancel-epoch.test.ts` 570 pass, 7 skip; `test/actor/` 274 pass with only the eight `subagent-resume-negatives` cascade cases failing, as on main on this host. Exact-tip CI remains the publication gate.

### 2026-10-13 second format-alignment propagation

Direct inherit of main `4158021f` (PR #159), no compat override, no owner added or retired. Main realigned 24 files to upstream bytes where the fork had only reformatted, including 15 test files, with every result Prettier-equivalent to the previous fork file. Two conflicts, `src/session/prompt.ts` and `src/session/llm-request-prefix.ts`, both where a restored upstream block meets a compat overlay hunk; each is resolved by re-running the three-way merge with compat's side winning every conflict (`git merge-file --ours`) and is Prettier-equivalent to pre-merge compat, as is every auto-merged file, so DC-CONTEXT-001, DC-ACTOR-001, DC-MODEL-001 and DC-TUI-001 keep their contracts unchanged by construction. Both shared registries are byte-identical to main after the merge. The compat-different set stays at 120 paths, 42 under `packages/cli/src` and `packages/sdk/src`; the `prompt.ts` overlay against main is 560 changed lines (551 before, a diff-alignment artifact of semantically identical content). Package `bun run typecheck` exits 0 at the merge; exact-tip CI remains the publication gate.

### 2026-10-13 A-group minimization propagation

Direct inherit of main `7163fb75` (PR #158), no compat override, no owner added or retired. Main trimmed the comments around the three retained FD-004 corrections, deleted the repository-specific CI sentence from the shipped MiniMax prompt (FC-011 contract change: no shipped prompt carries repository-specific branch or CI reminders), and restored upstream's `.gitignore` bytes (FC-008). The merge is conflict-free: none of the eight changed paths has a compat overlay, and compat's `src/session/system.ts` delta (DC-TUI-001/DC-CONTEXT-001 adjacent) does not touch prompt-file content. Both shared registries are byte-identical to main after the merge. The compat-different set stays at 120 paths, 42 under `packages/cli/src` and `packages/sdk/src`. Package `bun run typecheck` exits 0 at the merge; `test/session/system.test.ts`, `test/llm-server/streaming.test.ts`, `test/cli/cmd/serve-advertise.test.ts` and `test/cli/llm-server-revoke.test.ts` pass 43/43; exact-tip CI remains the publication gate.

### 2026-10-13 format-alignment propagation

Direct inherit of main `2a2c815c` (PR #157), no compat override, no owner added or retired. Main reverted 53 Prettier-only hunks in 13 `packages/cli/src` files to upstream `b258d28f` bytes and completed FC-001/FC-008 watch surfaces; FC-003, FC-004, FC-013 and FD-009 record the closed upstream PRs #1282, #1870, #1871 and #1269. The compat merge is `9abe6484`.

Two `src/session/prompt.ts` conflicts, both where a reverted formatting hunk met a compat overlay, resolve to the compat side: the early `resolveStoredAgent`/`isBoundedComputation` placement from the 2026-10-13 synchronization (C05), and DC-CONTEXT-001's `capSyntheticText` cap on skill command content. Verified rather than assumed: every merged `src` file is Prettier-equivalent to the pre-merge compat file under the repository config, so the merge changes no compat behavior; DC-CONTEXT-001, DC-ACTOR-001, DC-MODEL-001 and DC-TUI-001, whose overlays share these files, keep their contracts unchanged. Both shared registries are byte-identical to main after the merge. The compat-different set stays at 120 paths, 42 under `packages/cli/src` and `packages/sdk/src`. Package `bun run typecheck` exits 0 at `9abe6484`; exact-tip CI remains the publication gate.

### Previous review record — 2026-10-15 through 496bb8cb

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-10-15, full upstream synchronization through `496bb8cbe614aecea27623457d143600cc12c275`. Earlier on 2026-10-15: main SSRF all-answers classification propagated (DC-NET-001 note) through main `a7d242df8c0651038827ac99e434ef0e815f3885` and compat merge `8f583cc1` (content first carried by `3ea3588b66954a37e47e79c012b9aa7f0f8d5e36`). Main repair: `ebb8b62b` had been committed on compat `308b32a8` and pushed to main, fast-forwarding main onto the compat line and exposing every DC-owned surface there; main was force-reset to `973653dc` plus the same SSRF change (`a7d242df`). `ebb8b62b` remains only in compat history and is no longer a main commit.
- Prior upstream: `6ba6a6254a6d040bb81ec9453962a52fc46c9c6d`.
- Starting compat: `1d066a86b589f028625eb7a6fa596a18894c0878`.
- Integrated main: `c90e42905a22762ed4f30f91bec9f4a133fd5e87`; compat runtime merges: `582c8a42` (of main runtime merge `076db1db726b7d0d7eaaaae4c29ea830be73d027`) and `5d27d117` (of main's test-only CI follow-up `78d17520`).
- Review: [one-capability synchronization](upstream-sync-2026-10-15.md), C01.
- Resolution: inherit main's adaptation of upstream inbox wake ownership unchanged. Both merges are conflict-free and `packages/cli/src/inbox/inbox.ts` is byte-identical to main, so DC-CONTEXT-001's inbox watch (render caps in `inbox/render.ts`) is untouched; compat's two added lines in `test/actor/cancel-notification.test.ts` and its `fork-agent-compat` addition merge beside main's test changes. FC-001's asynchronous-admission gap recorded at that point applied to compat identically and is closed by the propagation below. Compat-only tests that seed inbox rows do not call `send`, so none shares the drain-fixture race. The compat-different set stays at 120 paths, 42 under `packages/cli/src` and `packages/sdk/src`; no DC owner retires or moves.
- Validation: default path with ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` unset. At `582c8a42`: package typecheck exits 0; root lint reports 3599 warnings and zero errors; `test/inbox/` 82/82; inbox-touching session/server files (`server/session-recovery-task`, `session/codex-compact`, `message-v2`, `prompt-effect`, `snapshot-tool-race`, `text-loop-integration`, `title-input`) 318 pass, 2 skip; `test/actor/` 274 pass with only the eight `subagent-resume-negatives` cascade cases failing, as on main and the pre-merge tree on this host. At `5d27d117`, which adds only main's test-only fixture change: `test/inbox/` 82/82.
- Shared ownership: FD/FC registries inherit final main byte-for-byte. Remote-tip CI and ancestry are checked after publication.

### Previous review record — 2026-10-14 through e27e87de

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-10-14, full upstream synchronization through `e27e87de81a74db5475bd93540f8889dfbc70ec6` (`002cb4c9`, then `e27e87de` after upstream advanced during publication).
- Prior upstream: `b258d28f436446bb1c9768fe0134693219be7cdc`.
- Starting compat: `d4de4b9210f0d168a08336037c5fffe0a25da093`.
- Integrated main: `f0571cd9eac31c8c9cc10e3793370ba89fe1b2b2`; compat runtime merges: `8da62ce008b4a51dc9ac0f6bc71dbd2f54451ada` (of main runtime merge `772adc245b9337eb1ec9776934cf5549c84dd753`), then main's test-only `cancel-notification` CI fix `41096cc8` merged unchanged beside compat's existing two-line difference in that file, then `206260c4d83023197670993b5faec799eb3fc602` (of main runtime merge `f8737765`, native Windows memory paths, clean; `memory/paths.ts` identical to main and the memory suites pass).
- Review: [twelve-capability synchronization](upstream-sync-2026-10-14.md), C01–C12.
- Resolution: inherit main's adaptations unchanged. Compat-specific work: the new `tool-gate-cancel` settlement, exec and input-boundary cases use a 128000-token test model, as the file's existing compat case already does, so DC-CONTEXT-001 request preflight admits the complete tool prefix; with the 32000-token upstream model all 18 cases fail preflight. One conflict, `src/session/message-v2.ts`, where main's added `planResumeTrim`/`assertResumeModelBoundary` meet DC-CONTEXT-001's renamed internal converter `toModelMessagesWithCurrentTurnInternalEffect`; both are kept. Upstream's skip of structural-only assistants lands inside that internal converter, before DC-CONTEXT-001's model-visible caps, which are unchanged. DC-MODEL-001, DC-ACTOR-001, DC-TUI-001 and DC-PROVIDER-001 overlays in `prompt.ts` and `llm.ts` merge without conflict and keep their contracts; the resume, tool-boundary and retry-status changes touch none of their hunks. The compat-different set stays at 120 paths, 42 under `packages/cli/src` and `packages/sdk/src`, before and after; no DC owner retires or moves.
- Validation: package and root `bun run typecheck` exit 0 at `8da62ce0`; root lint reports 3582 warnings and zero errors. SDK regeneration from compat sources leaves `packages/sdk/src` unchanged; `bun.lock` and every manifest match main. The four local hash shards on `9469c099` (the merge before the test adaptation) pass 6718; shard 1's failures are the 18 preflight-rejected `tool-gate-cancel` cases, which pass 19/19 alone on `8da62ce0`, plus the baseline `collapse` and `worker-model-api` cases, and shard 4 fails only the ten combined-process `account/repo` baseline cases. All 12 isolated files pass: `test/mcp/` lifecycle 34 including the RFC1918 sentinel, headers 3, oauth 4+3, stdio-exit 6; provider refresh 6+7+2; actor recovery 13. Exact-tip CI remains the publication gate.
- Shared ownership: FD/FC registries inherit final main byte-for-byte. Remote-tip CI and ancestry are checked after publication.

### Previous review record — 2026-10-13

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-10-13, full upstream synchronization through the user-frozen baseline `b258d28f436446bb1c9768fe0134693219be7cdc`.
- Prior upstream: `f98dcd1cf7e70e7eb42f721fdf72bc4a6b87914f`.
- Starting compat: `dfcd150320267d6b8d50d9b4ff7a690f5ceac1e8`.
- Integrated main: `d3497f88670e7a9fe349a9dd298de9be3dc2e2b4`; compat runtime merge: `93fdf62de50d791623386d7d092103646f9830a7` (of main runtime merge `848c635c1eb57d326f0d135f1c20caafc9c5f17f`), reached through `3a4c6506` and `90aa24ff` as the baseline advanced.
- Review: [fourteen-capability synchronization](upstream-sync-2026-10-13.md), C01–C14.
- Resolution: inherit main's adaptations unchanged. Compat-specific work: the run loop's early agent resolution uses `resolveStoredAgent` like main (C05); the TUI agent label drops the retired compose suffix and keeps DC-TUI-001's `flexShrink`; DC-CONTEXT-001's active and auto-disabled large-schema preflight cases opt out of the new default MCP deferral so they still measure a directly exposed schema; compat-only MCP search assertions read the `<system-reminder>` catalog; the Windows verifier clears `MIMOCODE_MCP_TOOL_SEARCH`. `packages/cli/src/mcp/index.ts` stays byte-identical to main (DC-NET-002). The compat-different set stays at 120 paths, 42 under `packages/cli/src` and `packages/sdk/src`, before and after; no DC owner retires or moves.
- Validation: package and root `bun run typecheck` exit 0 at `93fdf62d`; root lint reports 3571 warnings and zero errors. The four local hash shards pass 6596 with only the three baseline groups failing that also fail on unmodified `origin/main` locally (`collapse`, `worker-model-api`, combined-process `account/repo`), plus one concurrent-load exec stdout miss that passes on rerun; every `test/mcp/` file passes alone (lifecycle 34 including the RFC1918 sentinel), provider refresh 6+7+2, actor recovery 24, `prompt-effect` 212 with 2 existing skips. SDK regeneration leaves `packages/sdk/src` unchanged; `bun.lock` and every manifest match main. Exact-tip CI remains the publication gate.
- Shared ownership: FD/FC registries inherit final main byte-for-byte. Remote-tip CI and ancestry are checked after publication.

### Previous review record — 2026-10-10

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-10-10, full upstream synchronization through `f98dcd1cf7e70e7eb42f721fdf72bc4a6b87914f`.
- Prior upstream: `6babeb0b98f9b4818bddf04a4331edfee04dbf85`.
- Starting compat: `ced528534fe5af2e994b888493a5099e7ded2dde`.
- Integrated main: `f04cfaf9622a3c8923908e1c780c4fc1567de81b`; compat runtime merge: `ae9c919b3d3f915aa326e27f96a7dc2e8ba0fab2` (of main runtime merge `2f13453afab188f9ae4bc21ed7daecf099b653de`).
- Review: [two-capability synchronization](upstream-sync-2026-10-10.md), C01–C02.
- Resolution: inherit upstream's opt-in startup import of Claude Code sessions (`MIMOCODE_ENABLE_CLAUDE_IMPORT`) and the bundled `mimocode-docs` and `xlsx-official` guidance unchanged. The merge is conflict-free: the four changed files are identical to main and compat's overlay touches none of them. No DC owner watches the CLI middleware, the flag module or bundled skill content, and compat's difference from main is byte-identical before and after the merge apart from hunk offsets. The compat-different set stays at 115 paths with the same 38 production overlay paths; no DC owner retires or moves.
- Validation: package and root `bun run typecheck` exit 0 at `ae9c919b`; root lint reports 3532 warnings and zero errors. Isolated non-test CLI probes import no Claude Code session at startup by default and import it with `MIMOCODE_ENABLE_CLAUDE_IMPORT=1`. The focused matrix of 18 files (bundled-skill, flag, history import, CLI child-process, agent, glob, Actor spawn preference, memory path guard and `prompt-effect` suites), each in its own process, passes with no failure; `prompt-effect` passes 212 with 2 existing skips. `bun.lock` and every package manifest match main. Exact-tip CI remains the publication gate.
- Shared ownership: FD/FC registries inherit final main byte-for-byte. Remote-tip CI and ancestry are checked after publication.

### Previous review record — 2026-10-04

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-10-04, full upstream synchronization through `6babeb0b98f9b4818bddf04a4331edfee04dbf85`.
- Prior upstream: `698f0f29058848b154eabd73d3a7955d4f18eb00`.
- Starting compat: `9ab1ab6cc38b525d46f8f26e98614b25a1ddd9c1`.
- Integrated main: `f15b68709eab8dedfbdd936c62e595e463a5ea81`; compat runtime merge: `ab5e60e69d01c95e0153c0227164d47a865c45c5` (of main runtime merge `fcd946d60fe89105d899ce5f41eac7a7c02e3a18`).
- Review: [seven-capability synchronization](upstream-sync-2026-10-04.md), C01–C07.
- Resolution: inherit upstream's instance-preserving provider refresh with main's FD-005 harness-trust, FD-001 sampling-approval and FC-008 isolated-job adaptations. The merge is conflict-free: compat's overlay touches none of the changed runtime files, and its difference from main is byte-identical before and after the merge apart from hunk offsets in the generated SDK, which keeps compat's model-selection and checkpoint-coverage operations beside the new `global.refreshProviders()`. DC-MODEL-001, DC-ACTOR-002 and DC-TUI-001 read models through the Provider service, so after an applied refresh their next read sees the new view; per-agent `maxMode` and agent `model` are not refreshed model keys. The compat-different set stays at 115 paths with the same 38 production overlay paths; no DC owner retires or moves.
- Validation: package and root `bun run typecheck` exit 0 at `ab5e60e6`; root lint reports 3532 warnings and zero errors. A focused matrix of 92 affected and compat Provider-consumer files, grouped by CI hash shard, passes 1562 with 7 existing skips; provider refresh suites pass 6+7+2 in separate processes and actor recovery passes 24. Two `prompt-effect` shell cases timed out on their own 5 s/10 s budgets under unrelated host load and time out identically with the changed runtime files restored to `9ab1ab6c`; their bodies are identical on main, where they passed. SDK regeneration from compat sources leaves `packages/sdk/src` unchanged. `bun.lock` and every package manifest match main. Exact-tip CI remains the publication gate.
- Shared ownership: FD/FC registries inherit final main byte-for-byte. Remote-tip CI and ancestry are checked after publication.

### Previous review record — 2026-10-02

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-10-02, full upstream synchronization through `698f0f29058848b154eabd73d3a7955d4f18eb00`.
- Prior upstream: `336aee0eb1a5a88efe637f60142303cc8e7555bf`.
- Starting compat: `cde67e5a3ed539296589752e92ed73d735a21c99`.
- Integrated main: `fb89f49417f9486d0a543971df01c887b696394d`; compat runtime merge: `6b6bd00628d0a8ad156ff34e4cbecf7ef079ad51` (of main runtime `c1935943d080ea5ab4234135d95243717da52c01`).
- Review: [ten-capability synchronization](upstream-sync-2026-10-02.md), C01–C10.
- Resolution: inherit the `packages/cli` and flattened `packages/sdk` layout, the private-overlay and free-channel removal, the first-launch agreement, the release flow with a required `GH_REPO`, the root test guard, the docs pruning, the `MIMOCODE_*` renames and the retained `CLAUDE.md` link. Twenty of the 21 compat-only files moved with the directory rename; the `20260901000001_session_prefix_active_tools` migration was moved by hand, and the Windows verifier exclusion in `tsconfig.scripts.json` now names `packages/cli/script/`. The Prompt footer conflict is upstream removing its `mimo-auto` provider-label guard; compat keeps `ModelMetadata` (DC-TUI-001). The committed OpenAPI snapshot is deleted with main, so compat's `openapi-refs.test.ts` checks the checkpoint-coverage operation and schema, recovery, compaction projection and `prompt_async` contracts on the runtime document, and resolves every runtime operation's `codeSample()` on the v2 client. The compat-different production overlay remains the same 38 paths after renaming; the whole compat-different set drops from 116 to 115 paths with the snapshot. No DC owner retires or moves.
- Validation: package and root `bun run typecheck` exit 0 at `e15ad3a7` and root typecheck again at `6b6bd006`; root lint reports 3525 warnings and zero errors at both. The complete package suite at `6b6bd006` (620 files in CI's shard and isolation layout) passes 6702 with 29 existing skips; its one failure, `MCP exception throw direct is bounded [TP-RUN-R12-36]`, occurred only while all four shards ran concurrently, and the case alone, its whole file and shard 1 rerun alone in the same order all pass. SDK regeneration from compat sources leaves `packages/sdk/src` unchanged. `bun.lock` and every package manifest match main. Exact-tip CI remains the publication gate.
- Shared ownership: FD/FC registries inherit final main byte-for-byte. Remote-tip CI and ancestry are checked after publication.

### Previous review record — 2026-09-30

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-30, full upstream synchronization through `336aee0eb1a5a88efe637f60142303cc8e7555bf`.
- Prior upstream: `87a27da5247577644071e8e1f186553c32c73a6f`.
- Starting compat: `93967b9419d7bc3f503f670a4038dae53001bf09`.
- Integrated main: `907a0bd8a4050bd4db8f45c30514d4497b72984d`; compat runtime merge: `850ef7018baf7d9601b1a00779ca2cb1c46f22e1` (of main runtime merge `a1ce1f58863d0972f723b09279386eacccfd5fc3`).
- Review: [one-capability synchronization](upstream-sync-2026-09-30.md), C01.
- Resolution: inherit preparation-phase cancellation settlement. The `prompt.ts` conflict is upstream's reindent of the step body against compat's own body; the same `acquireUseRelease` wrap around `sessions.createMessage` is applied, and compat's `prompt.ts` delta against main is byte-identical after normalizing leading whitespace, so per-agent MaxMode, bounded request preflight, overflow placeholders and full-context Actor step code are unchanged. DC-CONTEXT-001's overflow placeholder still needs `finish: "cancelled"` and the exact recovery message, so a settled preparation abort (`MessageAbortedError("Aborted")`, no finish) is never classified as one. `prompt-effect.test.ts` merges cleanly. The compat-different path set is unchanged and the production overlay remains 38 paths; no DC owner retires or moves.
- Validation: package and root `bun run typecheck` exit 0; root lint reports 3533 warnings and zero errors. The two new cases pass. A 31-file shared-process matrix (the main affected set plus classify, MaxMode and overflow suites) passes 770 with 4 existing skips; its 8 failures are the `subagent-resume-negatives` process-global captor artifact that fails identically at main's baseline `dbd2343d`, and that file passes 8/8 alone. `bun.lock` and every package manifest match main. No API input changed, so the SDK/OpenAPI were not regenerated. Exact-tip CI remains the publication gate.
- Shared ownership: FD/FC registries inherit final main byte-for-byte. Remote-tip CI and ancestry are checked after publication.

### Previous review record — 2026-09-29

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-29, full upstream synchronization through `87a27da5247577644071e8e1f186553c32c73a6f`.
- Prior upstream: `454521a8527686a4132c6dda2d2ff62607dcb892`.
- Starting compat: `d56ee4607d0a25e6e44a904779430c84f927335c`.
- Integrated main: `d287acdf91e57f623790da61b75a4efdbeeb24c8`; compat runtime merge: `fa0f2e538e6e2b21b0bc35fc2531c8ab9cb2d160`; compat toolchain adaptation: `639fc10f1f9facb5bb57f949d18ccf7ac0703ad6`.
- Review: [seven-capability synchronization](upstream-sync-2026-09-29.md), C01–C07.
- Resolution: inherit the removal of the unmaintained web/desktop/cloud packages, the English fallback for TUI locales without their own dictionary, the `.agents/skills` layout, the removed opencode tooling, the turbo-free typecheck, the WebSocket proxy buffer copy and the `bun run typecheck` prompt guidance. Compat had no files under the removed directories. `prompt.ts` and both READMEs merge without conflict. The production overlay remains 38 paths; no DC owner retires or moves. DC-PLATFORM-001 adds one tooling path, `tsconfig.scripts.json`, which keeps the compat Windows verifier out of the alias-free root scripts project.
- Validation: root `bun run typecheck` exits 0 after the exclusion (before it, the verifier failed on `@/util/child-process-env`); root lint reports 3533 warnings and zero errors. The main affected matrix plus `test/util/archive.test.ts` passes 196, with 4 existing skips and 0 fail across 11 files. `bun.lock` and every package manifest match main. No API input changed, so the SDK/OpenAPI were not regenerated. Exact-tip CI remains the publication gate.
- Shared ownership: FD/FC registries inherit final main byte-for-byte. Remote-tip CI and ancestry are checked after publication.

### Previous review record — 2026-09-27

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-27, full upstream synchronization through `454521a8527686a4132c6dda2d2ff62607dcb892`.
- Prior upstream: `849ca66cc8debbbcc08904039e05bd2e79be348d`.
- Starting compat: `5eebf4466133bbebfd368fed6ce13592a0c53bc3`.
- Integrated main: `832e317712af9a7c135d11ed9c9811cffbe27017`; initial compat runtime merge: `b3fb3b82176a409aa1d32595b91e5691725ca98b`; the current merge inherits main's `41164111b0938de4e267c1b9cd2685e3ccd97c03` test/API correction and shared review record.
- Review: [four-capability synchronization](upstream-sync-2026-09-27.md), C01–C04.
- Resolution: inherit execution-aware config refresh, instance-directory cron storage, interactive Bash request ownership and UTC cron guidance. Keep full-context/variant Actors, bounded request preflight, per-agent MaxMode, authoritative TUI metadata, and network/platform policies. The production overlay remains 38 paths; no DC owner retires or moves. The generated SDK and OpenAPI retain compat model selection and checkpoint coverage alongside the shared config status endpoint.
- Validation: 400/400 tests pass across instance, Actor, Question/worktree, Runner/approval/Bash/cron/OpenAPI, InstanceState, RunState/TUI, compat context/model/variant and deferred notification groups. Package `bun typecheck` passes; root lint reports 4744 warnings and zero errors. SDK regeneration produces no unexplained generated diff, and `bun.lock` matches main. Exact-tip CI remains the publication gate.
- Shared ownership: FD/FC registries inherit final main byte-for-byte. Remote-tip CI and ancestry are checked after publication.

### Previous review record — 2026-09-26

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-26, full upstream synchronization through `849ca66cc8debbbcc08904039e05bd2e79be348d`.
- Prior upstream: `2b993ac98283bb1283313982e699df706e9ad235`.
- Starting compat: `b4885f356caaf14e4601ef400887e07733c95f91`.
- Integrated main: `9f6f827c1bd0cceb9e59e45a53762cc8c5f1cfaf`; compat source/tests: `96bc3179c8252634b5ff1d4f81cad3f2b9c3d9e5`.
- Review: [six-capability synchronization](upstream-sync-2026-09-26.md), C01–C06.
- Resolution: inherit duplicate-call rollback, fixture lifetime repair, interactive background subagent approvals with source-isolated rejection, TaskGate completion removal, host error catalog/retry rules, and disposed-stream cleanup. Retain frozen tool membership, bounded request preflight, full-context/variant Actors, per-agent MaxMode, request metadata and network/platform policies. The shared MaxMode retry owner, generated host-error fields and plugin dependency wait repair are included. The production overlay remains 38 paths; no DC owner retires or moves.
- Validation: 399/399 across the core host/error/retry/LLM/bus/Actor/MaxMode/Task matrix, 50/50 across compat TUI/model/context/recovery overlays, 13/13 preflight and MaxMode cases, and 53/53 plugin/toolset/MaxMode checks after the accepted main repair. Package `bun typecheck` and SDK regeneration pass without generated diff; root lint passed with 4727 warnings and zero errors before the final shared repair. `bun.lock` matches main. Exact-tip CI remains the publication gate.
- Shared ownership: FD/FC registries inherit main byte-for-byte. Exact-tip CI and remote ancestry are checked after this record; local results are not publication evidence.

### Previous review record — 2026-09-24

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-24, full upstream synchronization through `2b993ac98283bb1283313982e699df706e9ad235`.
- Prior upstream: `a273d3450ee05ba5163320eae59d7716b778e480`.
- Starting compat: `6516e800e2bfc9bd2403ad90572c538c31339bf7`.
- Integrated main: `d1d42cfac9a9d530b86f4877c0e4433be02f569d`; compat source/tests: `9ec7ad539aadf1f32571bf6b2506251e72724097`.
- Review: [three-capability synchronization](upstream-sync-2026-09-24.md), C01–C03.
- Resolution: inherit the Orchestrator removal, local image path provenance, and JSON-only tool invocation. Keep the eight DC owners, including full/state Actor context and JSON `variant` selection. Retire compat shell `--variant` and no-script recovery with the shared FC-018 shell interface. Keep inherited Actor peer sessions but route background interaction through parent grants; no Orchestrator-only forwarding survives. The production overlay has 38 paths after `actor.shell.txt` retires; no DC owner retires or moves.
- Validation: 58 Actor JSON/context/variant cases pass; 221 pass across 13 Actor, recovery, request, image, OpenAPI and exec-interaction files; the session-recovery file passes 22/22 after fixing its temporary-directory lifetime. The real MCP OAuth transport passes 1/1 after preventing the laboratory from reusing the callback port. Package `bun typecheck` passes after the final source merge. Root lint exited 0 with 4661 warnings and zero errors before the shared fixture-only correction; current-tip CI supplies the final lint gate. SDK/OpenAPI regeneration is stable and `bun.lock` matches main. Final exact-tip CI remains the publication gate.
- Shared ownership: FD/FC registries inherit main byte-for-byte. Exact-tip CI and remote ancestry are checked after this record; local results are not publication evidence.

### Previous review record — 2026-09-23

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-23, full upstream synchronization through `a273d3450ee05ba5163320eae59d7716b778e480`.
- Prior upstream: `1579e7d9ee5fca87b707c3892dc725316674a9d6`.
- Starting compat: `c28a6dbe53735a209bfe4952abae4729665ee13e`.
- Integrated main: `616fc5fa0a132d6899aaaafc3a7b0eacb12e20aa`; compat source/tests: `bc1525552a25c724b728d4815d8b45195237b8f6`.
- Review: [three-capability synchronization](upstream-sync-2026-09-23.md), C01–C03.
- Resolution: inherit canonical lowercase model-facing tool names, removal of the flooding middleware and its synthetic recovery, and same-step exact duplicate cancellation before FIFO. Retain the independent failure cascade, bounded request preflight, hidden MCP/native Actor snapshot identity, full-context/variant Actors, per-agent MaxMode, request metadata and all network/platform policies. The same 39 compat production overlay paths remain; 37 per-path stable patch IDs are unchanged. `llm-request-prefix.ts` and `prefix-snapshot.ts` adapt the retired model-name projection while retaining compat-loaded MCP membership, current-turn request projection and frozen native schemas. The three old PascalCase/flooding test files had only 32K-to-128K compat fixture edits; they retire with their upstream behavior. The new duplicate test fixture uses 128K to reach tool execution without changing output limits or assertions. No DC owner retires or moves.
- Validation: 344 passed, 2 existing skips across 16 request, duplicate, gate, prompt and frozen-context files; 83 passed across Actor spawn and model-context files; zero failures. Package typecheck passes; root lint exits 0 with 4818 warnings and zero errors. `bun.lock` matches accepted `main`.
- Shared ownership: FD/FC registries inherit main byte-for-byte. Exact-tip CI and remote ancestry are checked after this record; local results are not publication evidence.

### Previous review record — 2026-09-22

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-22, full upstream synchronization through `1579e7d9ee5fca87b707c3892dc725316674a9d6`.
- Prior upstream: `14dfe68a1c121f859544ba810b3c308e8501bfb2`; initial selected baseline: `479201262a0f08e6abe9c29022d2fb38b63e29b0`.
- Starting compat: `72c7b04b714ca9c2fe59cf37b07feb71030b5eea`.
- Integrated main: `b02cd8669ab99051db713749f3a5651e18cb8984`; compat source/tests: `ca4550bb54253d5b0cc6ea27f0d229bd7d834fa4` (late increment starts from accepted compat `1932539709b83f5f5ffe6d1a39e234cc90a73e2c`).
- Review: [ten-capability synchronization](upstream-sync-2026-09-22.md), C01–C10.
- Resolution: inherit tool-call flooding and failure cascade, runtime-local Actor execution state, Inbox/TUI presentation, automatic title requests, PascalCase MiMo v2.6 tool projection, the 0.1.15 release, MCP confirmation elicitation and opt-in host model transport. Preserve generation-safe Question cleanup, bounded preflight and active-schema caps, hidden MCP and frozen-prefix identity, full-context/variant Actors, per-agent MaxMode, authoritative TUI metadata and all network/platform policies. The same 39 compat production overlays remain. Thirty-four per-path patch IDs were unchanged through C01–C08; the five adapted paths carry Inbox caps, current-turn request projection, provider tool-name projection plus request preflight, hidden-MCP/model-name snapshot identity, and compat Actor guidance. C09/C10 add no compat-owned path. No owner retires or moves.
- Validation: frozen prefix/PascalCase/flooding stream 39 pass; failure/PascalCase/live request matrix 79 pass; Actor/status/Inbox/TUI matrix 188 pass; context/preflight/MaxMode/model-metadata matrix 150 pass; late MCP/host/Question/prefix matrix 75 pass. The six new live-request fixtures use 128K rather than 32K input capacity so compat preflight reaches the behavior under test; output limits and assertions are unchanged. Package typecheck and SDK/OpenAPI regeneration pass; lint exits 0 with 4818 warnings and no errors.
- Shared ownership: FD/FC registries and shared history inherit main byte-for-byte. Final exact-tip CI and remote ancestry are checked after this record; local results are not publication evidence.

### Previous review record — 2026-09-21

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-21, full upstream synchronization through `479201262a0f08e6abe9c29022d2fb38b63e29b0`.
- Prior upstream: `50cd713989f47225cfc717868b245e1de32b35b7`.
- Starting compat: `1d5237f121854d65c4ca6d3bcd7e83312d5a7a8b`.
- Main runtime/tests: `3e1fe1607a5ec87fa2f919493b77078d44c60330`; shared guidance: `d19ea19f02ac4a4e9d0c0ff760c1da5a4a6ac7b8`.
- Integrated main: `16394bdc9766c37980a5dce098e3a425ae92c6c8`.
- Compat source/tests/CI: `43ea9dc20fe6ce8e36198aa3d452a56bed51e019`.
- Review: [eleven-capability synchronization](upstream-sync-2026-09-21.md), C01–C11.
- Resolution: inherit generation-owned MCP admission, trailing-user recovery, cancellation acknowledgement, selected-session orphan cleanup and FIFO tool gating. Preserve bounded preflight and active-schema caps, full-context/variant Actors, per-agent MaxMode, authoritative TUI metadata and all network/platform policies. The same 39 production overlay paths remain; 37 normalized diffs are unchanged, TUI sync changes only import context, and classify loses only formatting drift while inheriting the completed-tool/final-answer predicate. No owner retires or moves.
- Validation: Actor/variant/overflow/prefix/MaxMode/caps 337 pass; real Actor HTTP recovery 25 pass across four files; focused preflight/frozen-context/MCP prompt 27 pass; checkpoint/history 19 pass; tool gate integration 4 pass. The broader root matrix had 173 passing cases plus four gate fixtures rejected by compat preflight; only those test models changed from 32K to 128K, preserving output limits and all assertions. MCP/DC-NET 76 pass including real OAuth and both RFC1918 sentinels. Package typecheck passes; lint exits 0 with 4806 warnings and no errors. SDK/OpenAPI regenerate without drift.
- 2026-09-22 final-CI follow-up: inherit terminal summary ModelError conversion and early retry exclusion, including network-looking tool names. Migrate three retired directory-loader fixtures to explicit plugins without removing authority/visibility assertions; add a positive whitelist registration assertion. Final nine-file matrix: 242 pass, two existing skips, zero failures / 1418 assertions. Package typecheck and lint pass (4806 warnings, zero errors). Initial CI failures and reproduced fixes are retained in the shared record; final new tips require fresh CI.
- Shared ownership: FD/FC registries and shared history inherit main byte-for-byte. Final exact-tip CI and remote ancestry are checked after this record; local results are not publication evidence.

### Previous review record — 2026-09-19

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-19, full upstream synchronization through `50cd713989f47225cfc717868b245e1de32b35b7`.
- Prior upstream: `2bda17944b346ab85c8ee3cf0a0d4ab24819d37c`.
- Starting compat: `94b8005cd336136da9c47c077a7faab643c3eb0a`.
- Main runtime/tests: `6af6931fd6ee73999847d81809bd2476e419885d`; shared guidance: `7199810dcfe61becd47e4c4becd0166964ea5d40`.
- Integrated main: `b40391abfd0624894a966ff39a39285152e5f439`.
- Compat source/tests/CI: `b1aaec311837fa74af6526ea9137b6bac08d5967`.
- Review: [two-capability synchronization](upstream-sync-2026-09-19.md), C01 and C02.
- Resolution: inherit optional hints and main-resume cascade through retained Actor admission. The 39 compat production overlays remain; only a blank-line boundary and the location of shared actor guidance change in the normalized overlay diff. Full-context/variant transport, bounded preflight, per-agent MaxMode and authoritative TUI preview remain intact. No network or platform policy changes.
- Validation: isolated recovery 25 pass; full prompt/receipt/approval matrix 244 pass and 2 existing skips plus one obsolete fixed-delay assertion, corrected and passing on both branches; variant 13 pass; TUI metadata/preview 20 pass. Package typecheck passes; lint has zero errors. Compat SDK/OpenAPI independently regenerate without drift. Final push-SHA CI is checked after this record, not inferred from local results.
- Shared ownership: FD/FC registries are inherited byte-for-byte; no owner retires or moves between branches.

### Previous review record — 2026-09-18

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-18, full upstream synchronization through `2bda17944b346ab85c8ee3cf0a0d4ab24819d37c`.
- Prior upstream: `4cb859dd7c962b13eee5f34146350f520a380217`.
- Starting compat: `d3d25ec611bbd2c13462acfeaf4cfbcb79efdf4a`.
- Accepted main: `1435d830` (runtime/tests `759b6431963cbeb7b0940f4b7a92dc64690624d5`).
- Compat runtime integration: `cd49ecf343e08e04e13209b4e4bb00c46320a978`; subsequent commits update records only.
- Review: [single-capability synchronization](upstream-sync-2026-09-18.md), C01.
- Resolution: inherit session-wide Actor cancellation, generation/episode-bound quiet notifications and exact runner session/actor keys. Preserve FC-001 leases, terminal claims, retirement and disposal checks. All 39 compat-different production paths retain identical overlay content after excluding diff line offsets and blob IDs; full-context/variant Actors, bounded preflight, per-agent MaxMode and authoritative TUI model preview remain intact. No private-network or platform policy changes.
- Validation: complete final-source cancellation/Actor lifecycle files pass 43 tests; cascade/registry-only/runner isolation cases pass 3 tests (77 filtered). Package typecheck and lint pass with existing lint warnings. No public schema or generated output changed. Full prompt and final-SHA CI acceptance are collected after publication rather than inferred from these local results.
- Shared ownership: FD/FC registries and history are inherited byte-for-byte; no owner retires or moves between branches.

### Previous review record — 2026-09-17

- Status: active; all eight DC owners remain compat-owned.
- Last reviewed: 2026-09-17, full upstream synchronization through `4cb859dd7c962b13eee5f34146350f520a380217`.
- Prior upstream: `26aa00fc7e243a90586f5895ddcad2b7ce76b935`.
- Starting compat: `d7ae31894c6b5b4362076ca4b21ddf54c4b4c11a`.
- Accepted main: `b903e3aa9f62cb7c3658fb25e9d618ec4561f5b4`.
- Main runtime: `9c05eacb2817b0e100fb4b788b8085af6ba2aef5`; final main test snapshot: `13d287aac076b4b113f194991ad88c3786631625`.
- Compat source integration: `b277eca8`; final compat test snapshot: `3e39edd3084e5e31b96e67a7844bc5e067d0e4d3`; inherited shared records: `c4ba4d3fb1899133cbbf1448e8104c2022133bc7`.
- Review: [eleven-capability synchronization](upstream-sync-2026-09-17.md), C01–C11.
- Resolution: actual adapter-provider routing passes through current-turn conversion and frozen prefix capture. Native Responses error outputs retain compat input/text caps. Recall reminders remain disabled for structured-output requests while gaining persisted stable IDs. Empty-residue redispatch coexists with bounded preflight and overflow-placeholder receipts. Mandatory compaction tails, active-only schema budgets, checkpoint coverage, TUI metadata, per-agent MaxMode and full-context/variant Actor behavior remain.
- Scope: 36 compat-different source paths before and after integration; no DC owner or unrelated platform/private-network boundary moved to main. Shared FD/FC registries are inherited byte-for-byte.
- Validation: 21 focused matrix files pass (309 tests); complete Actor spawn/resume passes 77 tests, prompt attachments pass 62, and HTTP recovery-task/concurrent setmode pass 12. Full prompt-effect initially had 170 pass, 2 existing skips and 2 adapter-fallback assertion failures; after including the compat empty current-turn field, all 3 adapter fallback cases pass in a focused rerun. Final CI supplies the complete-file acceptance. Package typecheck and lint pass. SDK/OpenAPI regenerated with 140 operations, preserving checkpoint coverage, maxMode and Actor variant/full-context differences while removing only the upstream-retired auto-create operation.
- Publication: final-tip CI and live remote ancestry are checked after this record is committed; earlier acceptance runs remain historical.

### Previous synchronization review

The 2026-09-15 review through `26aa00fc` used starting compat `1caf307f`,
accepted main `a288fb47`, runtime `0b8c5d63` and compat integration `252f81e9`.
Its 245 passing tests and previous snapshot limits remain recorded in
[compat history](dev-compat-registry-history.md); they are not current-SHA evidence.

### Previous runtime review record

- Status: active；七项 DC 政策继续由 `dev/compat` 维护。
- Last reviewed: 2026-09-15，继承共享运行验收并补充 compat 实际调用链和 Windows 证据。
- Selected upstream: `b4cc11cd652195af9a80297ed543218f3172e6c4`；本轮不追加 upstream 同步。
- Accepted Inbox main: `d11a9652981e7b5953584205474249775ee54236`（PR #134）。
- Starting accepted compat: `78f65017acacae66dfccc1ec28338e131492a929`（PR #135），已继承 Inbox 原子 drain。
- Accepted runtime main: `2bbd3c0b20f2fb9c005c593585bd320c0e0a91d8`（PR #138），继承 PR #136 的 `c643adf9dffa57191153cc4452003ba03e3cab32`。共享 runtime/test 当前快照为 `f20e91358da8ba4feef8d669ae1b105486e2566f`，其中插件作用域夹具仍为 `15ca0f83a466f0581ce4e1add6883e0e204318ed`；共享安装设施为 `9bf2b8bcc696abf8797487b090c342a5a64f7a7c`，不将 CI 安装改动记为生产行为推进。
- Compat integration source: `302a1727fd2e3462738719656bc521641f525812`。私网及初次 Windows、插件预算、作用域夹具、后续 Windows 四组证据分别绑定 `289f6316`、`3bd11622`、`3f65c815` 和 `b7e3f850`；实验日志清理复验另绑定 `c7b2fdc5`；集成引用不改写各自执行 SHA。
- Inherited bundled guidance: `c6e30d0bd2a651ae40fbf26a1b8913a16696a13e`，本轮未修改。
- Scope and evidence: [Inbox 修正](inbox-crash-consistency-2026-09-15.md)、[共享运行验收](runtime-validation-2026-09-15.md)、[compat 运行验收](compat-runtime-validation-2026-09-15.md)。
- Publication authority: 对应 PR 另行记录 reviewed head、实际接受 tip 的 CI 与最终 ancestry；候选 Windows 成功不等同于新集成 SHA 已接受。PR #135 的 reviewed head 八项 CI 通过且已合并，但接受 tip 的 push 分片 1 在全部断言通过后超过八分钟预算，仍按 CI 失败记录；诊断见 compat 运行报告。后续 compat PR 及最终接受 SHA 的 CI 另行验收。

FC-001 的队列到完整用户消息事务保持共享。FC-006/FC-004 的插件与 MCP 协议验证入口随 main 继承，FC-008 维护共享 Windows 调度及 frozen install。FD-006 的独立实验载体继承自有日志清理修正，不改变生产 exec 权限与模型语义。DC-NET-002 保留私网准入保证，DC-PLATFORM-001 保留平台适配并拥有 compat 验收脚本。DC-CONTEXT-001/DC-ACTOR-001 的 cap、coverage、full/persistent 和 frozen context 保持原归属；其余 DC-NET-001、DC-MODEL-001、DC-TUI-001 无新增生产行为。七项全部 active，没有整体上移或政策退休。此前历史记录保留原始来源和验收范围。

### 2026-09-09 specified audio convergence

AUDIO-ALIGN-01 replaces only the audio-retention decision of the earlier full sync.
Standalone speech/transcription, static audio keys, capability selection and provider
speech factories retire through the direct main merge. Registry discovery and chat
input audio are inherited byte-for-byte; all seven DC owners retain their contracts.
DC-MODEL-001, DC-CONTEXT-001 and DC-ACTOR-001 have request-semantics adjacency, but
no audio override. TUI voice, MCP sampling, private WebFetch policy, platform fallbacks
and TUI metadata are unchanged. Historical adoption paragraphs below describe their
original snapshots. The [audio convergence record](audio-upstream-alignment-2026-09-09.md)
is historical: FD-004's 2026-09-14 capability-route retirement supersedes its
upload/auth/token details. [Current audio guidance](audio-api.md) and FD-004
are authoritative for the present audio boundary.

### 2026-09-10 title authority synchronization

All seven capabilities in the [shared inventory](upstream-sync-2026-09-10.md)
are inherited. DC-CONTEXT-001 and DC-ACTOR-001 retain atomic message/part
identity, monotonic chronology, frozen turn context, active-tool membership and
bounded request recovery. DC-MODEL-001 retains per-agent MaxMode; detached title
requests remain outside that execution path. DC-TUI-001 retains request metadata
and both titleLocale submission paths, while checkpoint coverage maps coexist
with title revision reads and deleted-session guards. DC-NET-001/002 and
DC-PLATFORM-001 have no incoming owned implementation changes. No owner retires.

Three conflicts were reconciled by capability: TUI sync keeps checkpoint/revert
pagination and clears both checkpoint and title state on deletion; session fork
accepts protected manual titles while validating chronological boundaries; prompt
tests inherit text-only title expectations alongside preflight-domain sentinels.
The new duplicate-receipt fixture uses stable part IDs and verifies unchanged
persisted count/IDs, preserving compat's stronger content identity checks.
Checkpoint coverage test sessions now supply the required title source/revision.
The shared migration CI follow-up checks the complete journal name set rather
than assuming one pending migration; historical schema/data and restart
assertions remain intact. Both related migration files pass on compat (2/2).
Generated SDK/OpenAPI preserve compat operations and include the new title API.

Source evidence and the seven final result rows are recorded in the latest
[compat history entry](dev-compat-registry-history.md). Earlier dated review
paragraphs and per-owner implementation SHAs below remain historical snapshots.

### 2026-09-10 plugin hook objects and Xiaomi chat SDK

Both capabilities in the [cb00c280 shared inventory](upstream-sync-2026-09-10-cb00c280.md)
are inherited byte-for-byte: compat carried no divergence on
`src/plugin/index.ts`, `src/provider/provider.ts` or either test file, so the
`main` merge was clean and needed no compat adaptation. No compat-only override
is added and no owner retires.

DC-MODEL-001 is the nearest owner: the Xiaomi SDK split changes which class
serves chat, not which transport is selected, so per-agent MaxMode, retry status
and the reported `xiaomi.chat` / `xiaomi.responses` provider names are unchanged.
DC-TUI-001 keeps its request provider/model/variant display truth for the same
reason. DC-CONTEXT-001 and DC-ACTOR-001 are request-semantics adjacent only; the
plugin change guards registration and dispatch without altering hook contracts,
frozen turn context or chronology. DC-NET-001/002 and DC-PLATFORM-001 have no
incoming owned implementation change.

Source evidence and the two final result rows are recorded in the latest
[compat history entry](dev-compat-registry-history.md).

### 2026-09-11 inline attachment bounds and recovery-candidate breadth

Both capabilities in the [7641dbbd shared inventory](upstream-sync-2026-09-11-7641dbbd.md)
are inherited. C01's five production files (`src/flag/flag.ts`,
`src/util/media.ts`, `src/provider/image.ts`, `src/tool/read.ts`,
`src/mcp/tool-result.ts`) and all three C01 test files are byte-identical to
accepted `main` after the merge, as is
`test/server/session-recovery.test.ts`. No compat-only override is added and no
owner retires.

Two conflicts, both in `src/session/prompt.ts` and both unions. The `./classify`
import keeps compat's `REQUEST_OVERFLOW_RECOVERY_MESSAGE` beside main's new
`@/util/media` and `@/provider/image` imports. The existing-assistant branch
keeps compat's per-iteration `agents.get(lastUser.agent)` resolution and its
`recoverOverflowPlaceholder: usageRecovered || isBoundedComputation` argument
while adopting main's `lastAssistant.id !== resumeFrom` guard; the two are
independent, since the guard decides whether the branch runs and
`recoverOverflowPlaceholder` decides how it classifies.

DC-CONTEXT-001 is the nearest owner and keeps its contract unchanged: the new
attachment gate is a production-time bound above its model-visible caps, whose
rejection notice is an ordinary synthetic text part, and the recovery change
touches candidate selection, settlement and the resume model source rather than
caps, serialization or request preflight. Its `src/server/routes/instance/session.ts`
overlay is limited to the compat-only `checkpoint-coverage` route, which the
merge left untouched; the resume route is byte-identical to main.
DC-ACTOR-001 keeps full-context actor and static-prefix overflow behavior:
`resumeFrom` is bound to the candidate the runner settled, and FD-009's frozen
identity refusal means an actor resume still cannot switch models. The inherited
predicate keeps `time.completed` as the settlement marker rather than upstream's
"any errored message is always a candidate", so a compat turn settled by
`sweepOrphanAssistants` leaves the candidate list here exactly as it does on
main.
DC-MODEL-001 keeps per-agent MaxMode; a resume model override selects the model
for the resumed turn without entering MaxMode's retry policy. DC-TUI-001's
request provider/model/variant display reports whatever model the turn actually
used, including an overridden one. DC-NET-001/002 and DC-PLATFORM-001 have no
incoming owned implementation changes.

The generated SDK and `packages/sdk/openapi.json` were regenerated from compat
sources and are byte-identical to the merge result, so compat keeps its own
operations and gains the same two resume query parameters.

Source evidence and the two final result rows are recorded in the latest
[compat history entry](dev-compat-registry-history.md).

### 2026-09-11 bounded history search and paged part details

The single capability in the [f11e35ed shared inventory](upstream-sync-2026-09-11-f11e35ed.md)
is inherited. The merge was clean on every path. Sixteen of the seventeen
incoming paths have no compat divergence at all; `src/session/checkpoint.ts`
keeps compat's own overlay and takes only the two copy lines redirecting
verbatim recall from `around` alone to `around` then `get(part_id)`, which is
factually correct here because compat inherits the same history tool. No
compat-only override is added and no owner retires.

DC-CONTEXT-001 is the nearest owner and keeps its contract: it consumes that
checkpoint text, and the marker changes length by a few characters inside an
already-bounded field, so no model-visible cap, serialization path or request
preflight moves. The bounded history work stays below those caps — SQL
projections leave unused media payloads in the database and `get` pages
`part_id` details, which reduces rather than widens what can reach a request.
DC-ACTOR-001, DC-MODEL-001, DC-TUI-001, DC-NET-001/002 and DC-PLATFORM-001 have
no incoming owned implementation change. The new
`20260908000000_history_media_rebuild` migration clears only the derived
`history_fts` index; original parts and sessions are untouched and the startup
backfill is resumable.

No SDK/OpenAPI input changed, so no regeneration was required and compat's own
operations are unaffected.

Source evidence and the final result row are recorded in the latest
[compat history entry](dev-compat-registry-history.md).

### 2026-09-12 actor execution model, models catalog, media reading

All four capabilities in the [98702641 shared inventory](upstream-sync-2026-09-12-98702641.md)
are inherited, including **FC-001's retirement of its continuation
wake-generation routing**: a woken non-main turn now runs on upstream's
`ActorExecution` claim and settles through `runTurn`, and the eight fork-owned
tests that encoded behavior the execution map does not model were removed with
it on `main`. Compat adds no override for that path and no owner retires here.

One conflict, in `src/inbox/inbox.ts`: main's cancelled-before-commit drain
guard is adopted while compat keeps its `createMessage` wording for the
non-transactional crash window that comment documents — compat seeds the
synthetic user message through `createMessage`, main through `updateMessage`.

DC-ACTOR-001 keeps its full-context actor extension: `ForkContext` still
requires compat's `turnContext`, so the upstream `keeps forkContexts isolated`
fixture ported on `main` carries that field here. DC-CONTEXT-001 is unchanged —
the media work bounds encoded size at production time above its model-visible
caps, and the actor delivery persists `actorResult` on a message the caps
already govern. DC-MODEL-001, DC-TUI-001, DC-NET-001/002 and DC-PLATFORM-001
have no incoming owned implementation change.

The generated SDK and `packages/sdk/openapi.json` were regenerated from compat
sources; compat's own operations are preserved and the new `actorResult`
projection is published.

Source evidence and the four final result rows are recorded in the latest
[compat history entry](dev-compat-registry-history.md).

### 2026-09-14 capability route adoption, MiMo transport pinning, and two capability corrections

Direct inherit, no compat override, no owner added or retired. Covers PRs #109,
#110 and #111. Both merges applied with no conflicts, and the intersection that
matters is empty: of the 41 `src` files this propagation newly inherits,
**none** is a file where `dev/compat` holds a delta of its own. Measured from the real base — `git merge-base
origin/dev/compat origin/main`, which is `72064c41`, the previous propagation —
rather than from the compat tip, which would have counted every override in
reverse and reported all 39 as overlapping.

Two things `dev/compat` was carrying resolve themselves rather than needing a
decision:

- `src/server/server.ts` had lost upstream's `/** Bind port. ... */` JSDoc on
  compat only. Main's copy was rebuilt from upstream and carries it, so the
  merge restores it.
- `test/llm-server/chat-completions.test.ts` still asserted the fork's
  `mimo-v2-flash-ptc` -> `/v1/responses` selection, which `main` retired in #109
  when it adopted upstream's pinning of every MiMo id to
  `@ai-sdk/openai-compatible`. The file is deleted by #110, so the stale
  assertion leaves with it. Verified this is not a lost override: `dev/compat`
  against `main@72064c41` shows **zero** delta on `provider/provider.ts` and
  `tool/gpt.ts`, so compat's divergence there was un-propagated main history,
  not a compat decision. `usesMimoResponsesApi`, `isMimoModel` and the `xiaomi`
  loader go with it.

All seven active DC entries were re-reviewed against the incoming behavior.
DC-ACTOR-001, DC-CONTEXT-001, DC-MODEL-001, DC-TUI-001, DC-NET-001/002 and
DC-PLATFORM-001 have no incoming owned implementation change: the capability
route lives at `routes/instance/capability.ts` and `src/llm-server/`, and
`routes/instance/session.ts` — the one `server/` file compat does own — is not
on that path. DC-NET-001's seam is unmoved; `util/ssrf.ts` is touched by neither
inherited PR.

`mimo serve --llm-server` is gone on compat too, as a consequence of inheriting
it: the flag gated only the address advertisement of a route that is always
mounted and always demands a minted token. `mimo serve` now advertises like
upstream, while `mimo acp` and `mimo web` pass `advertise: false` like upstream.

Previously issued capability tokens stop working here as on `main` — the fork
wrote `version: 2` records where upstream reads `version: 1`, and upstream's
reader treats an unknown version as an empty store. `mimo llm-server issue` is
the remedy.

#111 rides along with two one-line corrections to the surface #110 adopted, so
compat inherits them at the same time rather than a round later: `model.options`
is merged at upstream's own precedence point, so a model configured in
`mimocode.json` no longer behaves differently over `/v1` than in a session; and
`Server.listen` brackets an IPv6 literal before assigning it to `URL.hostname`,
which the WHATWG parser otherwise discards. Both carry a mutation-checked test.
Neither touches a compat-owned surface.

Source evidence and the final result row are recorded in the latest
[compat history entry](dev-compat-registry-history.md).

### 2026-09-14 revoke guard (second propagation, same day)

Direct inherit, no compat override, no owner added or retired. Covers PRs #114
and #116, the second folded in before this merged so compat never carries the
incomplete guard: `llm-server revoke <id> --all` deleted every token for the
directory instead of the one named, and now refuses the ambiguous form.

The guard took three rounds to close, which is worth recording because each
round was a different way of naming a token that it did not see. It was missing
entirely; then it tested truthiness, so an empty positional from an unset shell
variable walked past; then it read only the positional, while
`parserConfiguration({ "populate--": true })` in `src/index.ts` puts an id after
`--` in `args["--"]` instead. The test harness had the same blind spot — it
built its own yargs without that configuration, so it was measuring a parse
shape the real CLI never produces. Every argument shape is now enumerated
against the production parser, and the four that still pass through were each
checked to be non-destructive.

The overlap check flagged `cli/cmd/llm-server.ts` on a first pass, and that false
positive is worth recording because it is the same trap as the previous
propagation wearing a different face. The compat-owned set was computed as
`main..dev/compat` while `main` already carried the incoming fix, so the change
being propagated showed up as a compat delta in reverse.

Both sides have to be measured against the same merge-base. Against `5979dfa3`,
`main` changed `src/cli/cmd/llm-server.ts` and
`test/cli/llm-server-revoke.test.ts`, and neither appears among compat's own
changes. The merge applied with no conflicts, and `cli/cmd/llm-server.ts` is now
byte-identical to `main`.

### 2026-09-14 registry reconciliation (third propagation, same day)

Registry-only inherit, no compat override, no owner added or retired, and no
runtime or test change. #117 touches `docs/upstream-deviations.md`,
`docs/fork-capabilities.md` and `docs/fork-registry-history.md` and nothing
else, so the inherited source/test behavior reference stays at `bbac42b7`.
Measured from the shared merge-base `8f94a80c`, none of the three is among
compat's own changes, and all three are byte-identical to `main` after the
merge.

What compat inherits is a correction to its instructions. FD-004's sync index
row still required authentication-before-bootstrap and the TUI-owned listener,
FC-008's 2026-09-07 model API lifecycle review still read as a live contract,
and the FD/FC review-record headers still named upstream `98702641`. A sync on
either branch would have started from the wrong baseline and could have
restored hardening that FD-004 records as retired. The four review findings the
#110 scope reset left unwritten are recorded as well.

### 2026-09-14 TP-R14-12 unquarantine (fourth propagation, same day)

Direct inherit, no compat override, no owner added or retired. #119 changes one
log message in `src/actor/spawn.ts`, unskips `[TP-R14-12] undeliverable terminal
notification is logged` in `test/actor/cancel-notification.test.ts`, and adds an
FC-008 row. The case was quarantined as a pipeline gap; it was the fork's
`actor inbox notification failed` wording on its inbox send, where upstream's
case asserts `actor terminal notification failed`.

Unlike the previous three propagations today, the overlap is not empty: both
source files are DC-ACTOR-001 surfaces and compat carries its own delta on each
— `turnContext` on `ForkContext` in `spawn.ts`, and `turnContext: undefined` in
two fixtures in the test file. Neither hunk touches the log line or the
TP-R14-12 case, the merge applied without conflicts, and DC-ACTOR-001 keeps its
override unedited. Verified on the merged tree rather than inferred from the
clean merge: after a known-good neighbour passed there, TP-R14-12 passed with no
timeout, the whole `cancel-notification.test.ts` is 28 pass / 0 fail, and
`test/actor` + `test/inbox` + `actor-hooks` + `actor-owned-lifecycle` are 347
pass / 2 skip / 0 fail. The two skips are the cases that stay quarantined.

### 2026-09-15 selected upstream 5198ff54

This specified propagation inherits the six incoming capabilities through fork
main. It excludes upstream commits after `5198ff54`. No DC owner retires; the
complete model-facing actor context interface is now explicitly compat-owned.
Shared FD/FC records are inherited byte-for-byte.

| Owner           | Disposition                                                  | Evidence and boundary                                                                                                                                                             |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DC-NET-001      | Retain private-network WebFetch                              | No owned implementation change; finite Read media MIME changes do not replace per-request private WebFetch approval                                                               |
| DC-NET-002      | Retain RFC1918 HTTP(S) MCP guarantee                         | Production remains inherited from main; existing mocked lifecycle evidence is not a new real-private-network or OAuth validation                                                  |
| DC-PLATFORM-001 | Retain restricted-network and Windows fallbacks              | Ripgrep/archive production overlay unchanged; no upstream equivalent in this range                                                                                                |
| DC-MODEL-001    | Retain per-agent MaxMode                                     | Agent selector tests pass; regenerated SDK/OpenAPI preserve maxMode                                                                                                               |
| DC-CONTEXT-001  | Retain UTF-8 content caps, preflight and checkpoint coverage | History's local result budget does not replace these capabilities; bounds, frozen catalog, server coverage and TUI synchronization tests pass                                     |
| DC-ACTOR-001    | Retain and adapt none/state/full and persistent creation     | Preserve complete capture/execute chain and bounded state; repair input recovery without dropping explicit values; validate runtime-created and model-created persistent recovery |
| DC-TUI-001      | Retain provider/model/variant display                        | Metadata and coverage synchronization tests pass; no equivalent upstream UI replaces this overlay                                                                                 |

At the 2026-09-15 review, the actor overlay included JSON schema, shell
parser, no-script argument recovery, execution, tool descriptions and public
creation tests. Missing captured history or a prefix captor still fails before admission. Captured
system, tool schemas, active/loaded MCP membership, permissions, model identity,
turnContext, watermark and cwd remain tied to the same frozen request. State
uses the existing UTF-8 cap; persistent creation requires full context.

Recovery preserves valid context/lifecycle fields in all supported envelope
forms. Malformed values are rejected; conflicting inner/outer copies are
rejected instead of choosing an actor lifetime silently. That review left the
shared generic shell wrapper's mixed script/outer-field policy unchanged; the
2026-09-24 synchronization retires the wrapper and its compat extensions.

The shared history preview follow-up is inherited from accepted main PR #123.
Its SQL byte budgets and structural omission formatting preserve raw parts and
original attachment locators, including arbitrary stored MIME text. It does not
replace compat context caps or frozen-prefix behavior; all seven owners above
retain their dispositions.

The initial propagation retained the actor lifecycle quarantine. The final C07
inheritance below supersedes that initial-stage status.

### 2026-09-15 final lifecycle inheritance

Accepted main `648f7cdf100b30ff046db7518d8f832473b61481` (PR #124) is inherited
at `3cf81dabd6efc66d7cbd037292eee742a2a33728`. Runtime/test behavior remains
`1a072e7aa3b142fc9804974bd8142729817c92db`; later documentation and empty-tree
ancestry merges do not change that behavior. Both registered actor quarantine
cases now run, and the shared execution claim extends through postStop,
terminal publication and cancellation cleanup. Admission, reserved-worker and
receipt fixes prevent cancelled work from starting or being hidden by old
notifications. Direct Effect execution-hook self/ancestor cancellation uses
the existing service scope; external callers still join full cleanup.

All seven DC dispositions in the table above remain. DC-ACTOR-001 retains its
complete model context/lifecycle interface, captured tools and frozen
turnContext through execution and recovery. Shared execution, Runner and
workflow files match main; actor spawn retains only its existing turnContext
and watermark explanation. The other six owners have no additional owned
production change from this lifecycle inheritance. SDK/OpenAPI and bun.lock
remain unchanged from the accepted first-stage compat branch.

Final default-path validation passes 372 actor/inbox/hook/lifecycle tests,
14 real HTTP recovery tests and 4 frozen native Actor cases: 390 passes,
1,849 assertions, no failures or skips. Package typecheck passes. Seven ambient
selectors are removed and the package ORCHESTRATOR preload is retained. The
source/test/harness manifest and entire packages tree remain unchanged during
validation. Final seven capability results and source boundaries are in
[the history](dev-compat-registry-history.md#2026-09-15-final-lifecycle-inheritance-and-capability-results).

The selected propagation is accepted at `90abf6e447d7a5e5b405aba301bf1a951f469bf6`
(PR #125), with exact-SHA test/typecheck/lint and main ancestry verified.
The [shared accepted result](upstream-sync-2026-09-15-5198ff54.md#accepted-result-and-publication-evidence)
is the publication summary; dated staging gates below remain historical.
At that historical runtime snapshot the workflow deadline/disposer case was
still skipped. The first audit batch below restored execution; PR #129 later
reproduced the Linux timeout. The shared implementation report records that
failure and the subsequent cleanup fix; local first-batch passes did not close
the remaining FC-008 validation debt.

### 2026-09-15 audit implementation, first batch

Accepted main `f10fddb67d830b82890206759c53cef4d8710460` (PR #128)
is inherited at `f48b6e918d683688348d0c8bfc59cd0199fc7fc8`. Gateway alias
errors and debug trusted harness identity are shared; workflow deadline coverage
is restored with a real-startup gate, and the Runner reentry test uses explicit
synchronization. No production cleanup/lifecycle policy changed in this batch.
Compat adds complete schema estimation, terminal serialization failure handling,
tiny content budgets and single-format snapshot writes with legacy reads.
The seven owner dispositions and evidence are recorded in
[the compat implementation report](compat-audit-followups-2026-09-15.md).

### First-batch review record

- Status: historical first-batch snapshot
- Canonical owner: fork `dev/compat`
- Last reviewed: 2026-09-15
- Reviewed upstream: `b4cc11cd652195af9a80297ed543218f3172e6c4`
- Accepted `main` tip: `f10fddb67d830b82890206759c53cef4d8710460`
- Inherited main behavior: `0b12e39ebfae5e0a01e623de1b4f58e96c86cb09`
- Compat behavior: `f48b6e918d683688348d0c8bfc59cd0199fc7fc8`
- Prior compat tip: `b3b32061cfcf997d3fb1cac0a73302e551678a96`
- Main source inheritance merge: `f48b6e918d683688348d0c8bfc59cd0199fc7fc8`
- Prior shared audit commit: `5f06049e568276cd1cea9012f6b114e6ddb2fac2`
- Inherited bundled guidance content: `3fa41ad98ac15668b2b3be899767c6498772ad4b`
- Historical publication state: this first batch was recorded before PR #129 acceptance. The preceding documentation tip `b3b32061cfcf997d3fb1cac0a73302e551678a96` (PR #127) had successful exact-SHA test, typecheck and lint; later PR state is recorded below.
- Original audit baseline: [2026-09-15 report](fork-difference-audit-2026-09-15.md), with the original fixed Git trees, 529 file pairs and pre-implementation findings.
- First-batch shared documentation inheritance: accepted main `f10fddb67d830b82890206759c53cef4d8710460`; these first-batch fields do not describe the later reviewed source or PR head.
- History: [dev-compat-registry-history.md](dev-compat-registry-history.md)

### F01–F11 accepted review record (historical)

- Status: active
- Canonical owner: fork `dev/compat`; seven DC policies remain active.
- Last reviewed: 2026-09-15
- Reviewed upstream: `b4cc11cd652195af9a80297ed543218f3172e6c4`
- Accepted `main` tip: `89866569ee21e106f3c31c39072d8ec3e976d20a` (PR #131)
- Inherited main behavior (runtime/tests): `3a12d1800d9bfd002f543764e4ec72047e6e6bb3`.
- Compat behavior (runtime/tests): `02cd25b5385dbaffcc629693ca1df2da15af68f2`.
- Prior validated behavior: main `cdfd1a804599eda21fdc5bced9c0d1de025d07da`, inherited by compat source merge `05724a5c433a547d9177ebd8bc8e9184962f128e`; these remain historical validation baselines.
- Accepted-main ancestry merge: `c407439ff4d213977acf3986d79a4e31627cf9db`; its complete tree equals `02cd25b5`.
- Inherited bundled guidance content: `c6e30d0bd2a651ae40fbf26a1b8913a16696a13e`
- Accepted PR #129 head: `c407439ff4d213977acf3986d79a4e31627cf9db`.
- Accepted compat tip: `ab81af7293ac5ea1ee219bb6aab491d4fd665307`; its complete tree equals `c407439f` and behavior snapshot `02cd25b5`.
- Historical gate: all eight checks passed at `bb6d4049`, but Codex reported the P2 cache bound after revert clears, so acceptance was paused. Main PR #131 accepted the correction, followed by the compat candidate-cache adaptation.
- Accepted-head CI: all eight checks succeeded at `c407439f`: [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940004167), [typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940004188), [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940004185).
- Codex review: the [summary](https://github.com/onlyfeng/MiMo-Code/pull/129#issuecomment-5674809678) completed at 2026-09-15 07:15:08Z, with no new reviews or threads. The technically disproved P1 thread remains unresolved and non-outdated in the UI; the corrected P2 thread is outdated. These UI states are not described as resolved.
- Accepted-SHA CI: [test 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948422), [typecheck 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948433) and [lint 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948413) all succeeded at `ab81af72`; PR-head success does not substitute for these runs.
- Complete code-difference audit: [2026-09-15 implementation closure](fork-difference-closure-2026-09-15.md), with fixed current trees, per-file ownership and retained boundaries.
- Original audit baseline: [2026-09-15 findings](fork-difference-audit-2026-09-15.md); original coverage and earlier findings remain historical.
- History: [dev-compat-registry-history.md](dev-compat-registry-history.md)

`Base` names the inherited source/test behavior being reviewed. `Overrides`
names the compat source/test behavior and the shared or upstream contract that
it changes or extends. Neither field names this documentation commit. Shared
bundled guidance has a separate content snapshot and is inherited unchanged.

The 2026-09-01 propagation inherited the accepted shared audit and behavior
through the recorded main-audit merge. DC-NET-001, DC-PLATFORM-001, and
DC-TUI-001 had no incoming `main` path overlap. DC-NET-002 had stdio MCP path
overlap; DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 had request, prefix,
compaction, or actor-path overlap. The final compat behavior at
`43bc1048b0bc16ff17d715ee9cb756d2c1cc319f` retains the reconciled lifecycle,
chronology, admission, checkpoint, and TUI behavior, then corrects the
checkpoint coverage seam and republishes the exact OpenAPI/SDK client contract.
The runtime corrections remain shared FC-001, FC-002, and FC-015 behavior at
compat seams; the publication corrections do not create a new persistent
compat owner. All seven active entries were re-reviewed against the final
behavior tree.

The later 2026-09-01 OAuth-branding propagation adopts the shared MiMoCode
callback-page and dynamic-registration literals without creating a compat
override. The three incoming production paths had no prior compat delta and
remain byte-identical to accepted `main`. DC-NET-002 is the only subsystem-
adjacent owner; its RFC1918 sentinel explicitly disables OAuth and therefore
does not claim private-server OAuth interoperability. All seven active entries
were re-reviewed against compat behavior `43bc1048b0bc16ff17d715ee9cb756d2c1cc319f`.

The 2026-09-01 Codex-mode specified-change propagation inherits FD-002's
narrowed residual registry and FD-005's tri-state harness resolution without
creating a compat override. DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 have
real prompt, prefix, preflight, MaxMode, or generated-contract overlap; their
per-agent routing, bounded request, and frozen full-context behavior remains
intact. The other four active owners have no incoming path overlap. All seven
entries were re-reviewed against compat behavior
`c594bb92ff5a11063c5e22936964ceae088e1d43`.

The subsequent 2026-09-01 full upstream sync classifies both substantive
changes through audited `main`: it adopts the action-oriented default-prompt
guidance and subsumes the upstream Codex false-disable result into FD-005's
stronger session-explicit > process true/false > complete-identity inference
contract. The only inherited behavior delta relative to the prior compat tip
is the default prompt plus its direct regression test. DC-MODEL-001,
DC-CONTEXT-001, and DC-ACTOR-001 were re-reviewed for prompt, harness, request,
and actor semantic adjacency; the other four owners have no incoming path or
symbol overlap. All seven entries remain active and unchanged at compat
behavior `17f24827b310d8e9b64d495370ca6ec63f28242c`.

The 2026-09-02 propagation inherits the complete 4/4 default-model, Compose
Next, and voice audit plus shared FC-016 hardening. DC-MODEL-001 was re-reviewed
against the stable live-registry fallback and retains per-agent MaxMode and
hidden-title isolation. DC-CONTEXT-001 remains request-semantics adjacent but
defines no alternate TUI voice protocol. DC-TUI-001 had a same-component
conflict: semantic reconciliation kept its authoritative provider/model/variant
metadata and `titleLocale` paths while inheriting the full Prompt voice owner,
stop/drain, and grapheme-safe editing behavior. The four other DC owners had no
incoming path or symbol overlap. All seven entries remain active and unchanged
at compat behavior `c8b02aeb991c37e570799bdd3696e276aa35ba77`.

The later 2026-09-02 OpenAPI projection and `0.1.14` propagation inherits all
four audited shared capabilities. DC-MODEL-001 and DC-CONTEXT-001 directly
overlap the generated OpenAPI contract; DC-ACTOR-001 is compaction/preflight
adjacent. The other four owners have no incoming path or symbol overlap. The
only textual conflict was the OpenAPI contract test, resolved by retaining the
compat checkpoint and callable-v2 coverage and adding the shared full
`CompactionPart` projection equality check. The automatically merged OpenAPI
was accepted only after it matched a fresh compat-source generation byte for
byte; JavaScript SDK generation was also idempotent. All sixteen manifests and
`bun.lock` adopt `0.1.14`, while all seven compat owners remain active and
unchanged at behavior `6c2fe63ad3d08d3eed4d5dfc44bab3aa934e559e`.

The final 2026-09-02 WebSearch-model and session-ID propagation inherits both
audited shared capabilities without creating a compat-only fork. All four
incoming paths had no prior compat delta, merged without conflict, and remain
byte-identical to accepted `main`. DC-MODEL-001 and DC-ACTOR-001 are adjacent
to request-scoped WebSearch model routing; DC-CONTEXT-001 and DC-ACTOR-001
consume session IDs as opaque keys. DC-TUI-001 has no changed component path
and retains its provider/model/variant truth. The three network/platform owners
have no path or contract overlap. All seven entries remain active and unchanged
at compat behavior `4130f181f86477f91245f42e8670d0c84203bcde`.

The 2026-09-03 PR #73 specified-change propagation inherits the shared
`prompt_async` queue correction without creating a compat-only override. The
route now persists through `SessionPrompt.prompt` before joining an active run,
and the runtime OpenAPI plus generated JavaScript SDK consistently omit a 409
response for that fire-and-forget endpoint. DC-CONTEXT-001 directly overlaps
the route and published contract; DC-MODEL-001 overlaps only generated schema
carriers. The other five owners have no changed path, and all seven active
entries remain unchanged at compat behavior
`560de61b663a159771b53b05e826dc2cc91675ac`.

The 2026-09-04 PR #74 propagation inherits the shared closing-run handoff,
persisted-task binding, parent-linked classification, and atomic admission for
derived user turns without adding a compat-only runner mechanism. Six content
conflicts were resolved semantically: compat keeps its request preflight,
external-admission checks, monotonic actor chronology, ID/idempotency guards,
MaxMode routing, and frozen actor context, while the shared conditional write
guards every synthetic continuation in the same immediate transaction.
DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 overlap those paths; the other
four owners have no incoming production overlap. All seven entries remain
active at compat behavior `3e207de425621f660a249c074158d1d1564204f5`.

The 2026-09-07 propagation inherits all five audited capabilities: four from
upstream `ec3f9894..6203ea2e` and the already accepted main synchronization
skill. Recovery settlement remains shared FC-001 behavior: atomic runner
admission and candidate validation precede old-assistant settlement, which
precedes admission success and the new loop; the finalizer remains idempotent.
DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 have direct prompt-path overlap
with request/context semantic adjacency. DC-TUI-001 has only App locale-fixture
adjacency, and the three network/platform owners have no incoming overlap.
The single test conflict retained the new recovery cases and the existing
400-case type predicate. All seven owners remain active at compat behavior
`d5396a50856f264eda899c3094d9dd232d728307`; the later shared-audit inheritance
merge changes documentation only.

The subsequent 2026-09-07 specified audio adoption inherits AUDIO-01 without
conflicts or a compat-only adaptation. The two explicit, authenticated audio
endpoints and every selected provider/server/test source are byte-identical to
accepted main. DC-MODEL-001 and DC-CONTEXT-001 have generated-contract adjacency;
regeneration preserves their existing schemas. DC-TUI-001 retains its independent
TUI metadata behavior. The network/platform owners and DC-ACTOR-001 have no
changed owned implementation. All seven overrides remain active at the new
compat behavior recorded above; the later main-audit merge is documentation-only.

The 2026-09-07 explicit model API propagation inherits both selected capabilities
(MODEL-01 and MODEL-02) and FD-004's narrowed listener boundary. All 92 prior
non-registry main-to-compat delta paths retain their original blobs on both
sides; none overlaps this incoming source change. DC-MODEL-001,
DC-CONTEXT-001 and DC-ACTOR-001 are semantic neighbors, but standard proxy calls
do not run or replace per-agent MaxMode, bounded-context preflight or actor
context capture. Network/platform policies and TUI metadata are unchanged.
All seven owners remain active; no compat-only model API implementation is added.

The 2026-09-07 selected-capability propagation inherits ALIAS-01, SCHEMA-01,
and RECOVERY-01 from main source `f9e8a8a4f8be6cb826319e7dfa20c680606f6601`, with the compat adaptation
at `e9e0a6b57a0a865927afaba5316782cdc0af7ee4`. The accepted main tip is `c1dfc423fe021072d37b8585b5bcc33c4742d514`; the final
main-audit inheritance merge is `c7e154ded8c2ac4c4dd950b1040d065a939c5f65`. These are shared FD-005,
FD-006, FC-001, and FD-009 decisions, not an eighth compat override. SCHEMA-01
remains an explicit declaration experiment; it does not adopt compressed
declarations into the production default or hide permission/control tools.

DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001 have actual agent, prompt,
prefix, compaction, actor, checkpoint, or generated-contract overlap. Their
per-agent MaxMode, current-turn/active-tool preflight, frozen context, and
published compat contracts remain in force. The two network owners,
DC-PLATFORM-001, and DC-TUI-001 have no incoming owned implementation change.

The shared recovery correction advances run-local user authority only through
successful conditional-write receipts from that runner's own continuation or
compaction. A hook label, matching model, or matching task alone grants no
authority. Compat retains both pending-external-request guards, compaction
projection, and `continuationMessageID` tracking/cleanup, alongside frozen
`turnContext` and same-capture `modelIdentity`, including cold-start checkpoint
writers. Earlier dated main-only recovery statements describe the prior
capability boundary; the adopted internal persistent/full-context actor resume
does not broaden the public session recovery/resume API beyond the main actor.

Validation for this propagation: 771 pass, 4 skip, 0 fail, 2,858 assertions across 65 files; opencode and SDK typecheck, repository lint, Node build/import/schema smoke, and source-derived SDK/OpenAPI generation pass. Warnings remain. Source/test/generated hashes did not change during validation or the later audit merge. Exact final remote-SHA CI is checked separately at publication. Historical validation
paragraphs below retain their original scope and are not this operation's
matrix or exact-head CI record.

The 2026-09-08 specified COMPACT-01 propagation adopts automatic Codex compact
advertisements, direct actor/interactive control exceptions and request-pinned
hidden execution from shared main. This production decision supersedes the
prior compact-mode rejection; SCHEMA-01 remains its separate experiment.
All seven DC entries remain active. MODEL/CONTEXT/ACTOR have direct semantic
and source overlap; network/platform/TUI contracts retain their existing behavior.

Frozen snapshots retain the complete authorized definition pool and separate
advertised names. New all-boolean JSON active flags override the legacy compat
active_tools column, while legacy and mixed snapshots retain the old fallback
rules. Live tool schemas must match frozen definitions before rebinding;
whitelist checks remain independent. Active-only preflight and compaction keep
compat current-turn context, MaxMode, chronology, caps and admission receipts.

Final local evidence: 2,601 pass, 0 fail, 26 skip, 1 todo and 7,362 assertions across 192 files; package typecheck, lint and Node build/import checks pass. Of the 94 prior delta paths,
76 retain their original blob and mode on both sides; the additional classifier
test adaptation now captures real parent schemas and separately proves schema
drift rejection. Shared FD/FC registries and history inherit the accepted main
tip byte-for-byte. The history ledger distinguishes the original failed/time-limited
matrix from complete replacement-file runs. Final exact-SHA CI and remote ancestry
are separate publication checks. The dated 2026-09-07 evidence above remains
historical and is not the validation record for this propagation.

The 2026-09-08 released model API propagation inherits the six selected
capabilities from accepted main `85dfc3f2` at compat runtime/test tree
`8c73cc2b`. All 96 pre-existing overlay paths retain their prior main/compat
blob pairs; none of the 38 incoming paths needs a compat specialization.
All seven DC entries were re-reviewed for actual overlay and semantic adjacency.
Images retain main's independent public-destination policy, while the approved
WebFetch private-target exception and MCP configuration sentinel remain separate.
Shared FD/FC registries, history and bundled guidance inherit main byte-for-byte.
Validation and publication boundaries are recorded in the appended compat history.

The MEDIA-DNS-01 follow-up inherits accepted main `1f88fded` through ancestry
merge `cdf6820c`. Its complete tree equals the tested compat candidate
`76685956`; the candidate and final ancestry merge are distinct provenance
references, not separate runtime test runs. The 96-path overlay is preserved,
with no new DC. Current validation and publication limits are in the appended
[compat history](dev-compat-registry-history.md#2026-09-08-media-dns-01-inheritance).

The POLICY-06 propagation inherits accepted main `bfa3c2466d07da01881b252a0337ac444b4ae927` at compat
runtime/test tree `8b265508032ac27554ec71c54b1f49bebf10cbc8`. All 96 existing overlay paths and the normalized
production deltas in all 43 production overlay paths remain unchanged. The
only manual integration is deduplicating an existing checkpointPath test import.
Run approval is separate from frozen turnContext and chronological message
admission; successful continuations retain it, while unrelated queued input
closes the old scope. All seven DC owners were re-reviewed; no new override is
introduced. See the appended [compat history](dev-compat-registry-history.md#2026-09-08-policy-06-yolo-approval-inheritance).

The POLICY-06 PR #84 correction re-review inherits accepted main
`3350f0f2ce17501d4d925f5e293f07d809f29f22`, source
`c7014557445832a97248ed7b0af568e51bfd291d`, and shared audit
`0e57377e9f6201dee1b23efb3ccc0239378b9d8d` at compat source
`f912482a26b8ae32f03987798dd5068f24860b91`. This ancestry merge has the same
tree as preview `c01b3002dc32bf275df6fc646564c4358680fbe3`. Against old main
`bfa3c2466d07da01881b252a0337ac444b4ae927` and old compat
`9e8017c75a28899f6b4dab87aec26ea1c4c1921c`, the source snapshots retain all
96 overlay paths, including all 43 production paths: both the main and compat
blob at every overlay path are unchanged. Shared FD/FC registries, their
history, and bundled permission guidance match accepted main byte-for-byte.
This current-record update adds no runtime override and preserves the earlier
propagation snapshots above.

All seven DC owners were re-reviewed against the correction diff. Its only
runtime changes are shared `permission/index.ts` and `tool/bash.ts`, with no
existing compat overlay path overlap. DC-NET-001/002 and DC-PLATFORM-001 retain
their destination, MCP reachability, and fallback contracts; DC-TUI-001 retains
its request-metadata display. DC-MODEL-001, DC-CONTEXT-001, and DC-ACTOR-001
retain MaxMode, chronology, frozen context, parent permissions, and cwd.
Compat prompt/Actor bridges still carry the current RunApproval independently
of frozen context, and unrelated queued input still closes its prior scope.
An explicit full-command delete reply, including the winning forwarded
one-shot reply, now supplies the shared per-request receipt. Automatic delete
approval or an earlier delegation grant does not supply that receipt, so
ordinary Bash/external-directory checks still run; explicit deny remains
binding. A late forwarded resolver cannot relabel an automatic completion.

The correction matrix recorded 50 passes and one attached-CLI timeout, with
211 assertions; that same CLI case then passed alone with 15 assertions in
20.49 seconds overall. Package typecheck passed. These are a matrix plus an
isolated rerun, not a new all-green matrix or final-tip CI claim. No additional
runtime test was run for this registry-only re-review.

The POLICY-01 propagation inherits accepted main `d415822c29539a4b6eebeafb59de1b88da18b95c` at
compat runtime/test tree `5946f3c26b089adb412c6cee07d8129a09cfbfe3`. Main runtime/tests and
bundled guidance are `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`; the reviewed PR head is
`eb4ab66ee85cda01ad2e543a0a70ef14a4f78023`. The formal ancestry merges have the same tree as
tested preview `9e8d2d247a2f59d863966717599e315136580140`.

The overlay now has 95 paths and 42 production paths. Only the old plan.ts
producer override disappears: shared plan approval now uses
commitUserMessageIfLatest, while compat's transaction retains validated
message/part ownership and monotonic actor chronology. Prefix restore combines
native Actor schema metadata with compat active-tool filtering; toolsHash keeps
both native contracts and loaded MCP membership. The two test conflicts retain
both assertions and one copy of checkpointPath.

All seven DC owners were checked. DC-CONTEXT-001 and DC-ACTOR-001 retain their
preflight caps, frozen turnContext, actor slices and run-approval admission.
DC-MODEL-001 retains per-agent MaxMode and final-step gates. DC-TUI-001 retains
model metadata while consuming trusted plan receipts and Question terminal
events. Network and platform source policies are unchanged and were checked by
diff; no new override is introduced. Shared FD/FC and their history match main.

Local validation comprises 21 prefix/plan cases, 4 frozen-native cases, 25 real
Actor/interaction/compat admission cases, and 15 TUI cases; groups overlap and
are not an aggregate. Package typecheck passed; lint reports 0 errors and 4526
warnings. Formal compat PR review, exact-head CI and final push CI remain
publication gates. See [the POLICY-01 history](dev-compat-registry-history.md#2026-09-08-policy-01-full-exec-actor-and-interaction-inheritance).

The POLICY-04 local integration moves the catalog into the frozen system tail,
while retaining compat's 50 KiB catalog cap, current-turn preflight projection,
loaded MCP identity, active/native tool snapshots, and frozen actor turnContext.
A narrow compat recognizer accepts historical truncated v2 catalogs only with
the original schema/hash, exact truncation marker and byte budget; ordinary or
loaded skill text is not removed. CONTEXT/MODEL/ACTOR have real production-path
overlap; NET-001/NET-002/PLATFORM/TUI have none for this incoming change. All
seven owners were re-reviewed; no new DC is introduced.

The common five-registry exclusion gives 93 old versus 97 new overlay paths
(41 versus 42 production paths); raw counts are 95 and 99. Existing paths are
retained. Four additions belong to the existing context contract: the catalog
recognizer, the shared capture-test adaptation, and two compat-specific tests.
Shared FD/FC/history and the catalog guide match main audit `e136aa2ae24e13ec0f988a1a261d3af127b8eeda` byte-for-byte.
The latest candidate also recognizes verified v2 descriptions containing
`<skill_content>` before applying the legacy loaded-body safeguard. It refreshes
the verified catalog/format slot, retaining
all other frozen system bytes. Structured/text transitions follow the current
request without changing the catalog version. Compat's truncated-v2 recognizer, current-turn
projection and three-dimensional tool hash remain intact. The follow-up matrix
has 43 passing cases / 148 assertions, with no failures; package typecheck
passed and repository lint reports 4537 warnings / zero errors. The prior
preview's 101 cases / 479 assertions remain prior evidence, not repeated runs.
POLICY-04 publication is complete: main `fb16a8fd5a7b916421e7a04ca31f06559e086298` and compat `823e21d2fd7c3a2603d14bf15289351a6c555f81` passed exact-tip push CI and ancestry verification. See [the POLICY-04 history](dev-compat-registry-history.md#2026-09-08-policy-04-system-tail-catalog-local-integration).
These current review references do not re-date or claim to rerun older evidence.

The POLICY-03 review inherits default TUI model API startup and origin-scoped
Basic authentication across SDK clients and raw fetch, including interactive
Bash replies. All incoming files match accepted main. The seven active DC
owners retain all 97 non-registry overlay paths and normalized source deltas;
there is no new compat production difference. Model directory, token, media,
MaxMode, frozen context and request metadata contracts remain unchanged.

Local validation groups: worker/listener/thread/scoped SDK 23 tests / 127
assertions; HTTP/bootstrap/TUI events 24 / 131; the raw-fetch correction matrix
8 / 46 overlaps six earlier cases and is not added wholesale. Package typecheck
passed. POLICY-03 publication is complete: main `6e4ed8d3f859bd1355789748ae7a5f385cf0fbb1` and compat `f38eecbf31fad26a8ff03dd2a90970be52fa71e5` passed exact-tip push CI and ancestry verification. Shared registries and the layout guide matched that accepted main.

The POLICY-02 review inherits registered/live-context recovery and validated
optional task binding. The task namespace comes from the original spawn;
claim, original-user binding and interrupted-assistant settlement commit
atomically. Main HTTP cancellation is checked before commit; after commit the
runner retains ownership. Every recovered loop pins the committed original user
and defers queued inbox until a later ordinary run. Metadata-only summary/setmode updates preserve
concurrent recovery state and cannot resurrect deleted messages.

Compat retains createMessage/commitUserMessage/commitUserMessageIfLatest,
monotonic chronology and completed >= created during recovery settlement.
Frozen turnContext, active/native tools, three-dimensional tool hashes, content
caps, current-turn preflight and MaxMode remain intact. The same registry
exclusions give 97 -> 98 overlay paths, retaining all prior paths and 42 package
src paths. Only the recovery-commit test is new; 94 prior normalized deltas are
unchanged. Session chronology and two Actor fixtures are the three adapted
existing deltas. Shared FD/FC/history are byte-identical to accepted main.

Local evidence: core/entry/stale writers 26 tests / 131 assertions; real
HTTP/SDK/OpenAPI 28 / 339; Actor lifecycle 71 / 362. The cancellation follow-up
runs main HTTP, existing recovery and commit tests: 30 / 156, overlapping prior
evidence and not added wholesale. The shared Actor resume follow-up also passes
31 cases / 226 assertions. Package typecheck and repository lint pass;
standard SDK/OpenAPI regeneration from resolved sources adds no difference.
Six ambient selectors are cleared; package preload remains the harness baseline.
Cross-restart recovery is outside this change.

The POLICY-02 durable-inbox follow-up rearms pending rows after successful or
failed recovery through the existing Inbox/Runner/Actor lifecycle. It preserves
the recovered user during execution and does not depend on a live sender wake
or a manual later prompt. Plugin cancellation (including a subsequent post-hook failure), interruption, disposal and retired receivers do not
restart execution. Both live and durable wake variants consume each row once. The wake tracks the
queue tail, and persistent owners recheck it after settling each turn, so a
provider or runtime failure in the first 100-row batch does not strand later rows.
Both owners and concurrent followers require observed queue consumption before
retrying after failure; a failure before consumption does not trigger extra work.
Compat keeps its inherited Inbox content cap and all existing instance/context
boundaries. No additional compat delta is introduced by this shared correction.

The preceding compat main HTTP/Actor matrix passes 91 tests / 605 assertions;
Inbox tests pass 54 / 133 across eleven files, and inbox/handoff tests pass
8 / 30. The final joined-failure correction passes 35 tests / 319 assertions across
main HTTP, Actor inbox and prompt handoff; the above earlier groups overlap. The preceding five-second retirement-fixture timeout is recorded in
shared history; this complete run passes with explicit fixture budgets. Earlier matrices are
historical, overlapping evidence. Package typecheck and repository lint pass;
this internal helper changes no public schema or generated SDK. Shared registry
files remain byte-identical to the accepted main correction.

## 2026-11-07 inherit FC-053 and the FC-008 CI alignment

- Starting compat: `db5579e9d391d4db054d022d9247d628ca113d2c`; merged main: `118bfd5463d052a14abc04e19f9d0742985d37ce`.
- FC-053 (main PR #254) is DC-PROVIDER-001 promoted unchanged: the `@ai-sdk/xai` loader fallback, the `xai` SDK key, the `forceReasoning` default for declared `@ai-sdk/openai` reasoning models and their tests already matched compat line for line, so the merge brought no change to those hunks. Main moved the wire case from `provider.test.ts` into `xai-config-provider.test.ts` on the Effect harness; compat drops its old `provider.test.ts` copy, so that file now equals main. DC-PROVIDER-001 retires and its identifier is not reused; eleven DC owners remain. DC-WEBSEARCH-001 keeps the provider-executed tool-call ordering in `normalizeMessages` and its two `transform.test.ts` cases, now the only compat-vs-main difference in those provider files.
- FC-008 (main PR #253) runs the HTTP actor recovery and subagent-resume suites in their hash shards instead of a dedicated job. Compat's Windows runtime job is unchanged.
- No other DC owner's surface changes.

### DC-PROVIDER-001 — last compat entry (retired 2026-11-07)

#### DC-PROVIDER-001 — Responses routing and declared reasoning capability

- 2026-11-02 FC-025 propagation (`main` PRs #192, #195): Grok now receives a flat `operation` envelope for `cron`, `task` and `actor`. Grok is matched on its model id, so a Grok gateway routed through `@ai-sdk/openai` Responses, which this owner forces to reasoning, matches as well; the routing, `forceReasoning` and provider-executed tool-call ordering hunks in `transform.ts` are untouched. Compat's actor `spawn` branch fixes `lifecycle` with a `const` (DC-ACTOR-001); #195 lets a constant present in only some branches through, so the compat `actor` envelope flattens for Grok too (`test/tool/actor.test.ts` grok case).
- 2026-10-13 full sync: upstream `597e7103` adds `Provider.effectiveBaseURL` and an OpenCode Go session header in `session/llm.ts`. Compat's loader fallback and reasoning mapping are untouched; `test/provider/provider.test.ts` passes 95.

- Status: active
- Canonical owner: `dev/compat` provider model loading
- Added: 2026-10-12. Adds a ninth DC owner after the 2026-10-10 review record,
  which counts eight.
- 2026-10-13 correction: Responses is an OpenAI-defined protocol also
  implemented by xAI. Grok 4.7 and 4.6 support `xhigh`, as documented at
  <https://docs.x.ai/developers/model-capabilities/text/reasoning>. The bundled
  `@ai-sdk/xai` version's narrower effort enum is an adapter limitation, not a
  model capability limit. An OpenAI-compatible gateway can instead use
  `@ai-sdk/openai`, whose `languageModel()` already selects Responses.
  However, that SDK infers reasoning from OpenAI model names and drops Grok's
  effort/summary unless `forceReasoning` is set. `providerOptions()` now
  defaults it to `true` for `@ai-sdk/openai` models declaring
  `capabilities.reasoning`. Explicit options override this default. This
  common mapping covers both main-model and small-model calls, enabling the
  SDK's encrypted-reasoning include with `store: false`. Non-reasoning models
  and other SDKs retain their previous options. No model-name heuristic or
  gateway-specific rule is added; the original xAI routing remains supported.
- Base: inherited main behavior
  `c2ca53fdcb5a96032ac2a40148712574fc7c7b43` keys custom model loaders by
  provider ID. Only the built-in `xai` provider calls `sdk.responses()`. A
  provider defined in config with `npm: "@ai-sdk/xai"` has no loader, so
  `getLanguage` falls back to `sdk.languageModel()`, which `@ai-sdk/xai` maps to
  Chat. `sdkKey()` has no `@ai-sdk/xai` entry either, so `providerOptions()`
  files that provider's options (`reasoningEffort`, `store: false`,
  `promptCacheKey`) under its own provider ID. The SDK reads only `xai` and
  silently drops them.
- Overrides: a model without a provider-ID loader whose `api.npm` is
  `@ai-sdk/xai` gets `sdk.responses()`. `sdkKey("@ai-sdk/xai")` returns `xai`,
  which also remaps stored message `providerOptions` from the provider ID to
  `xai`, so replayed reasoning items keep their `itemId` and encrypted content.
- Delta: for the built-in `xai` provider the key already equals its ID and its
  loader already selects Responses, so nothing changes. Every other provider
  ID on `@ai-sdk/xai` moves from Chat to Responses. Its configured options now
  reach the SDK, including `store: false` and the implied
  `include: ["reasoning.encrypted_content"]`. The xAI Responses option schema
  accepts only `none`/`low`/`medium`/`high` for `reasoningEffort`, so an
  `xhigh` variant on such a provider now fails SDK validation instead of being
  dropped.
- Boundaries: the original loader fallback does not change providers with their
  own loader. The reasoning-option default is scoped to `@ai-sdk/openai` and
  reasoning-capable models; `forceReasoning: false` remains an explicit opt-out.
  Strict-tool defaults are unchanged. `@ai-sdk/xai` stays out of
  `EXPLICIT_NON_STRICT_TOOL_SDKS` for the reason recorded beside that list.
- Source surfaces: `packages/cli/src/provider/provider.ts` (`getLanguage`)
  and `packages/cli/src/provider/transform.ts` (`sdkKey`, `providerOptions`).
- Test surfaces: `packages/cli/test/provider/provider.test.ts`
  (`config provider on @ai-sdk/xai sends Responses requests with its provider
  options`) and `packages/cli/test/provider/transform.test.ts` (`uses xai key
  for a config provider on @ai-sdk/xai`), plus
  `packages/cli/test/provider/openai-responses-reasoning.test.ts`.
- Original evidence: the wire test captures the actual request a config provider sends:
  one POST to `<baseURL>/responses`, with `reasoning.effort`, `store: false`
  and the encrypted-reasoning include. Restoring either source file alone
  fails it, with `xai.chat` for the first and missing options for the second.
  Package typecheck passes. `provider.test.ts` (96), `transform.test.ts`
  (264), `strict-schema-wire.test.ts` and `empty-content-wire.test.ts` pass.
  A real `mimo run` against an xAI-compatible gateway completed a read-tool
  round trip with `low` and `high` variants. The stored reasoning parts carry
  `xai.itemId` (`rs_…`) and `reasoningEncryptedContent`, and the second step
  reused them with `store: false`.
- Correction evidence: eight real-SDK serialization tests cover six Grok IDs
  (including `xhigh` for 4.7/4.6), ordinary and small-model requests, explicit
  opt-out and SDK scoping. Removing the reasoning default fails the five
  reasoning-model cases. Provider/strict-schema/empty-content suites pass,
  and the transform suite passes with a 15-second test timeout; its unrelated
  image recompression case exceeds the default five seconds on this host.
  Package typecheck and root lint pass. Eight isolated CLI runs across all six
  configured Grok IDs through a local capture proxy verify streamed
  `/v1/responses`, unchanged effort values, session cache
  keys, `store: false`, and exact encrypted-reasoning replay on tool loops.
  Grok 4.7 is exercised with `low`, `medium` and `xhigh`, and 4.6 with `xhigh`.
  Each primary session completes a read-tool round trip and answers the file's
  secret. Auxiliary title/checkpoint requests are identified separately by
  session cache key; they do not inherit the primary variant. These checks
  prove transport and replay, not a statistical effect of effort
  on reasoning-token volume.
- Exit condition: retire when shared `main` routes config providers by SDK
  package, either through an equivalent fallback or a declared per-provider
  API choice, and honors declared reasoning capabilities for compatible
  models without relying solely on model names. If propagated to `main`, move
  the contract to the shared registry.

## 2026-11-09 Compose Next empty states

C01 (N=1), FC-011 shared guidance, inherited unchanged from main `b3f6bfd6`. All eleven active DC contracts retained; no runtime/test changes. Previous 2026-11-06 acceptance remains in [its synchronization report](upstream-sync-2026-11-06.md); current evidence is in [the new report](upstream-sync-2026-11-09.md).
