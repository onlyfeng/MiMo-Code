---
name: upstream-sync
description: Use when MiMo-Code needs a full upstream synchronization, a named change propagated between fork branches, or an explicitly frozen upstream baseline audited.
---

# MiMo-Code upstream synchronization

Fix the scope before fetching. Current refs, source, registries, workflows, and
exact-SHA CI are authoritative; history and agent memory are risk hints only.

## Select scope and baseline

| User intent                     | Mode             | Binding boundary                                                                                                                                                      |
| ------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “同步 upstream 更新”            | Full sync        | Unless explicitly frozen, fetch live `origin` and `upstream`; audit the complete selected delta and propagate `upstream/main -> main -> dev/compat`.                  |
| Names a PR, commit, or behavior | Specified change | Carry only that behavior. Do not merge or audit unrelated upstream work or advance the upstream review baseline; prove excluded commits stayed out.                   |
| Freezes an upstream SHA         | Frozen baseline  | Do not fetch `upstream` or advance the named SHA. If that commit or sources needed to audit it are unavailable locally, stop. Report alignment only through that SHA. |

Resolve ambiguous scope before fetching or mutation. A frozen baseline constrains
either scope; it does not authorize propagation. Audit-only requests stay read-only:
compare selected trees and report findings, skipping merge, commit, publication,
and cleanup steps below. Do not broaden a specified change into a full sync.
Refresh `origin` in every mode and `upstream` only for a full sync without a frozen
baseline, using `git fetch --no-tags --prune <remote>`. Record selected SHAs after
fetching and use them for the audit.

## Evidence-driven workflow

1. Read the current `AGENTS.md`. From the selected fork `main` SHA, review active
   entries in `docs/upstream-deviations.md` and `docs/fork-capabilities.md`; when
   work can reach `dev/compat`, also read `docs/dev-compat-overrides.md` from the
   selected compat SHA (`git show <sha>:<path>`). Recheck affected owner entries
   whenever the selected refs advance.
   Query project memory, if available, only for prior risk patterns; recheck all
   mutable facts live.
2. Record remotes, branch tips, worktrees, dirty/untracked state, and selected
   immutable SHAs. Leave existing state in place and work in dedicated
   worktrees. `upstream` is read-only; pushes, PR creation, and other writes
   target only `onlyfeng/MiMo-Code`. Use `-R onlyfeng/MiMo-Code` for fork GitHub
   queries and `--repo onlyfeng/MiMo-Code` for PR creation; verify the PR's base
   repository afterwards. Upstream evidence queries must be explicitly scoped
   and read-only.
3. Before merging, build `Capability inventory (N)`. Each selected capability
   gets one ID and records the immutable audit range, paths/symbols/producers/
   tests, `main` and compat counterparts (or `none`), relationship, and drift.
   Assign a canonical owner (`main` or compat-only), applicable FD/FC/DC IDs,
   disposition, and evidence. Full sync covers the complete delta, including
   capabilities without path overlap; specified change covers only named
   behavior; frozen mode stops at the named SHA.
4. Resolve by capability, including cleanly merged watch surfaces. Never choose
   whole files as ours/theirs or use synchronization authority for unrelated
   consolidation. Check callers when changing a function's contract. Regenerate
   derived SDK/OpenAPI artifacts only from resolved sources when their inputs
   changed. Skip empty merges when ancestry already proves inclusion; still
   check whether `main -> dev/compat` has an integration delta.
5. Validate stable branch states: install dependencies only with `bun ci`; run tests and
   `bun typecheck` from the owning package; clear the default-path selectors
   required by current `AGENTS.md` and applicable canonical owners, preserving and reporting package
   preload flags. Run focused regressions, then one final affected matrix.
   Later code, configuration, generated-output, or test changes invalidate
   affected branch and descendant validation. Documentation-only corrections
   need documentation and consistency checks, not repeated runtime matrices.
6. Reconcile every inventory row against the final branch states, including
   contracts, tests, documentation, and naming drift. Record duplicate or
   consolidation findings as recommendations unless separately authorized.
   Update only review records this operation advances, before the final push;
   pure registry/history commits do not advance source/test behavior SHAs.
7. After publishing the final commits, refresh mode-permitted refs and prove
   remote-tip equality, live-workflow CI success for each exact final SHA, and
   mode-specific ancestry or exclusions. Full sync requires the selected
   upstream SHA to be an ancestor of fork `main`, then `main` of `dev/compat`.
   If live upstream advanced, audit the new delta before claiming current
   parity. Any later commit requires fresh final-SHA CI and remote proof,
   including documentation-only commits. A clean merge, local green run, or
   old CI is insufficient. For a current failure, inspect the failed log and
   reproduce narrowly; permit at most one same-SHA rerun when evidence supports
   an infrastructure/timing failure. A timeout alone is not evidence of a flake
   or completion.
8. Remove only this operation's clean, integrated temporary branches and
   worktrees, after verifying they contain no user work. Keep open-PR resources
   and unrelated or dirty worktrees.

## Completion report

Use exactly one row per capability: ID, selected behavior, `main` result,
`dev/compat` result (or not targeted), and decisive paths/tests. Every inventory
ID must appear exactly once and the result row count must equal `N`.
For audit-only work, distinguish observed state from proposed changes; do not
claim propagation or publication. Separately report selected and final SHAs,
exact-SHA CI, ancestry or exclusions, registry updates, remaining
state, cleanup, and any missing evidence. Never claim current-upstream parity in
specified-change or frozen mode.
