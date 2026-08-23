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
