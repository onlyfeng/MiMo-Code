# Upstream sync 2026-10-22

## Scope and immutable baselines

Full live sync, authorized by `同步 upstream 更新`: `upstream/main -> main -> dev/compat`.
Selected upstream: `213365a0a3fd1ec0b171687d85bc453f05d33863`.
Starting main: `dda5cdb52ab81655b0e6236401663ab8c5f24ca5`.
Starting compat: `ac667d4b2db1dce6f893ca6d6944f72ab5f21e61`.
Reviewed upstream baseline: `8fd65328d976ae5636b46221264626e71ce0037f`.
Both remotes refreshed with branch-only refspecs, no tag changes. Main workspace remains on compat with its pre-existing untracked `.omo/` preserved.
Operation resources: dedicated main/compat sync worktrees and temporary local sync branches; no pre-existing worktree is eligible for cleanup.

## Capability inventory (N=3), before merge

All rows audit `8fd65328..213365a0`. Shared canonical owner is `main`; compat inherits with the listed overlay.

| ID | Selected behavior and surfaces | Main counterpart / relationship / drift | Compat counterpart / relationship / drift | Owners and disposition | Evidence |
| --- | --- | --- | --- | --- | --- |
| C01 | Append rebuild boundary after newest message; digest answered tail, copy unanswered text/media; preserve queued/ended inputs, full-history writer and logical turn state; legacy boundaries and SDK deferredInputs. `checkpoint.ts`, `prompt.ts`, `message-v2.ts`, `tail-digest.ts`, request-prefix, command/help and new rebuild tests. | Existing checkpoint/rebuild and atomic inbox/recovery; adapt changed placement without losing frozen authority, run approval or logical parent. | Existing capped rebuild digest, current-turn request preflight, coverage endpoint and frozen full-context actor; preserve those extensions. | FD-001/002/005/006/009, FC-001/002/011/015; DC-CONTEXT-001, DC-ACTOR-001, DC-MODEL-001, DC-TUI-001, DC-WEBSEARCH-001. Adopt placement and adapt fork callers/tests; regenerate SDK from resolved sources. | Pending: incoming placement/writer/legacy suites plus downstream checkpoint/prompt/prefix/approval/recovery/coverage/preflight contracts. |
| C02 | Stable Compose Next `Sn` and `Sn.m` anchors and amendment guidance. Bundled `compose-next/SKILL.md`. | Prior YAML-safe source and merge confirmation; complementary. | Inherits shared bundle without additional override. | FC-011. Adopt anchors while retaining existing guidance. | Pending: builtin/skill tests and content inspection. |
| C03 | Delivered spec source links point at merged upstream PR URLs; remove obsolete inbox spec and update lossless DB spec. `docs/compose/spec/`. | Several frontmatter conflicts with fork corrections and behavior notes. | Inherits main documentation. | FC-001/006/007/011/015 and applicable FD notes remain authoritative. Adopt provenance and preserve fork behavior annotations. | Pending: frontmatter/link/anchor review and registry consistency. |

## Validation and publication

Runtime/test integration: `fa79aa92`; legacy same-time correction: `a69ef021`.
C01 uses an optional `CheckpointPart.placement: "after-tail"` discriminator. Backdated legacy markers keep the fork's chronological seam reconstruction; new markers stop at the appended boundary. The raw writer history and logical run-loop turn are restored through receipt-aware chronological positions, never an ID range. Recovery settlement excludes checkpoint markers from its atomic latest-message/parent queries without dropping queue visibility or lease checks. Task/source/run-approval and frozen tool rebinding are retained. Compat retains capped digest/rendering, coverage, preflight and full-context actor extensions. SDK was regenerated on both resolved branches.

The legacy same-time regression initially exposed that upstream timestamp-based detection cannot distinguish all fork records. The explicit discriminator plus the existing exact-position collapse resolves this; the original legacy fixture is now seeded with its persisted old shape. Its assertions remain intact. A reverse-ID unanswered input is covered by the real request placement test.

Bun is pinned to packageManager 1.3.14 for validation; `bun ci` completed on both branches and bun.lock is unchanged. Default commands remove ambient MIMOCODE_EXPERIMENTAL, MIMOCODE_MCP_TOOL_SEARCH and MIMOCODE_CODEX_MODE. Package preload remains @opentui/solid/preload plus test/preload.ts (isolated HOME/XDG, in-memory DB, default plugins disabled; no added experimental selectors).

Local evidence so far: main CLI typecheck exit 0; root lint 3,661 warnings / 0 errors; SDK generation exit 0. A 41-case rebuild run passed 40 and exposed the legacy same-time collapse; after the correction its owning legacy/unify set passes 24/24, and the reverse-ID real request passes 1/1 (6 filtered). Broader checkpoint/prompt and final branch CI remain pending; temporary logs use the operation prefix outside the repository.

C02 content review preserves YAML source quoting and merge confirmation, adopts stable S1/S2/S3 and S2.1 anchors. C03 frontmatter adopts the upstream PR sources while keeping the fork's later context-budget review date and all retained behavior notes; the obsolete inbox spec deletion changes no implementation. No FD/FC/DC owner retires.

## Publication

Pending exact-SHA lint/typecheck/test on both final branches, remote/ancestry verification, refreshed upstream check and scoped cleanup. This record will be completed from actual runs.
