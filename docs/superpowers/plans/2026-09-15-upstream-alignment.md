# Reviewed upstream alignment implementation plan

> **For agentic workers:** Execute each bounded task with focused tests and independent review. The user approved this design on 2026-09-15; continue through fork publication and propagation without another design gate.

**Goal:** Adopt the reviewed upstream range through `5198ff54` on main, preserve the explicit compat actor extension, then align actor execution completion and cancellation.

**Architecture:** Shared runtime corrections remain on main. Only dev/compat exposes model-facing `none|state|full` actor context and persistent actor creation. Frozen-context system consumers remain shared. Lifecycle completion has one authoritative result after postStop, while background spawn returns its identity after admission.

**Tech Stack:** TypeScript, Bun 1.3.14, Effect, SQLite/Drizzle, generated JavaScript SDK/OpenAPI.

**Spec:** The approved read-only audit and decisions are reproduced in the capability inventory and acceptance requirements below.

## Global constraints

- Selected upstream is `5198ff540efb5ca9fff2baa64555324d43a721b9`; starting main is `a197d4a84939f36a813cb39750a5fb86cce6b37d`; starting compat is `51591791c592a21513e7703e3109c9a6d12def9a`.
- This is specified-range execution. Exclude newer upstream commits, including observed remote tip `b4cc11cd652195af9a80297ed543218f3172e6c4`.
- Publish only to `onlyfeng/MiMo-Code`, through feature PRs to main and compat. Preserve unrelated worktrees and branches.
- Install only with `bun ci`; retain `bun.lock`. Run tests and `bun typecheck` from package directories.
- Clear ambient `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and `MIMOCODE_CODEX_MODE`; preserve package preload flags. Clear compaction/checkpoint selectors for default-path matrices.
- Keep FD/FC shared registries identical on both branches; update all seven compat DC dispositions separately.
- Runtime validation precedes publication; final remote SHAs, exact-SHA CI, ancestry, and exclusion proof precede completion.
- Comments, docs, shipped skill content and test assertions use synthetic values, never machine-specific ones.

## Capability inventory (7)

| ID | Behavior | Main ownership and disposition | Compat disposition | Decisive surfaces |
| --- | --- | --- | --- | --- |
| C01 | Finite Read media MIME allowlist | Adopt while preserving modality and size limits | Inherit; preserve context bounds | tool/read.ts, util/media.ts, tool/read and util/media tests |
| C02 | Remove read-before-edit gate | Retire FC-003; retain filesystem permission and path guards | Inherit | read-state, edit, notebook-edit; placeholder and attachment tests |
| C03 | Model-facing actor context | Remove context and dependent persistent creation; preserve FD-009 system runtime | Preserve none/state/full, persistent, state limits, frozen turnContext | actor tool JSON/shell/repair; checkpoint; session ask; recovery |
| C04 | Memory independent of checkpoint enablement | Adopt converged FC-002 clause; preserve FD-002 identity rules | Inherit with frozen prefix overlay | llm.ts, llm-system-prompt tests |
| C05 | Versioned history indexing | Adopt uniform content, import transactions, legacy config normalization and one-time migration | Inherit; validate chronology/projection interfaces | history, storage, import, Config, SDK/OpenAPI |
| C06 | Plugin SDK npm version selection | Pin only valid non-local semver identities | Inherit | installation/version, core/TUI config and tests |
| C07 | Actor execution completion and cancellation | Adapt execution claim, postStop settlement, warnings and cancel/join without losing generation ownership | Inherit; preserve persistent context semantics | actor/spawn, execution, prompt, inbox, hooks and lifecycle tests |

## Task 1: Integrate C01-C06 on main

- [x] Confirm unchanged fork baselines and preserve the primary checkout; create operation-owned worktrees.
- [x] Merge exactly the selected upstream commit without committing until semantic conflicts are resolved.
- [x] Resolve C02 by deleting gate references and obsolete scope-only tests. Preserve placeholder resolution and attachment delivery assertions in their owning suites.
- [x] Resolve C03 across schema, shell parsing, bare-argument recovery, execute and descriptions. Reject removed context/persistent requests explicitly; keep actor resume and shared frozen-context consumers.
- [x] Resolve C04 while preserving distinct memory eligibility and fail-closed replace-agent identity.
- [x] Resolve history fixture cleanup around instance disposal, database close and migration cancellation. Retain session-scoped assertions and add the incoming restart/rollback/import tests.
- [x] Generate SDK/OpenAPI from final source; verify history configuration is absent.
- [x] Run focused changed and downstream tests, package typecheck and lint; record commands, environment and actual results.
- [x] Update FC-003 retirement, FD-009 ownership, history recovery limits, review headers and shared history.
- [ ] Independently review the exact diff; publish and merge the fork main PR with current-head CI and thread checks.

## Task 2: Propagate C01-C06 to dev/compat

- [x] Start from the current fork compat tip and merge the accepted main commit.
- [x] Restore the full actor model interface and implementation as a compat-owned overlay, including lifecycle, context repair and checkpoint description.
- [x] Preserve bounded state, forkContext/turnContext, frozen native/active tools, memory/system/cwd and static-prefix overflow behavior.
- [x] Exercise none/state/full, JSON/shell, run/spawn and persistent recovery/cancel. Missing captor or history must fail before actor admission.
- [x] Reconcile all seven DC owners; regenerate branch-specific SDK/OpenAPI without losing MaxMode or checkpoint coverage.
- [ ] Run the affected compat matrix and independent review, then publish and merge the compat PR with exact-head gates.

## Task 3: Align C07 after the selected sync

- [x] Reproduce the two quarantined contracts using real hook/execution fixtures before changing production behavior.
- [x] Re-evaluate the earlier claim timeout using the corrected InboxArrived observation; document a real wait dependency if a failure persists.
- [x] Hold spawn execution ownership through postStop and keep continuation inbox consumption serialized.
- [x] Publish one coherent terminal result after postStop across persistence, registry, parent notification, ActorWaiter and outcome; preserve successful results with warnings when postStop fails.
- [x] Interrupt and join the selected execution on cancellation; retain generation isolation, successor protection, persistent retirement, disposal and background admission responsiveness.
- [x] Unquarantine the two cases and cover the cancellation/publish race, warnings, nested actors, hook failure, queued wakes and disposal.
- [ ] Independently review and merge the lifecycle main PR; propagate it through a compat PR and validate its frozen-context consumers.

## Task 4: Final evidence and cleanup

- [ ] Check final main and compat remote tips, all required CI on those exact SHAs, selected-upstream to main to compat ancestry, and excluded-upstream absence.
- [ ] Reconcile all seven inventory rows and distinguish source/test behavior from pure registry commits.
- [ ] Remove only clean, integrated worktrees and local branches created by this operation. Preserve unrelated resources and all user state.

## Execution record

Implementation and validation results are recorded in the synchronization report and registry histories as they are obtained. Planned checks above are not evidence of success.
