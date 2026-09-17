# 2026-09-17 upstream synchronization

## Scope and immutable baselines

Full synchronization authorized by “同步 upstream 更新”. Selected upstream:
`4cb859dd7c962b13eee5f34146350f520a380217`; prior review/merge base:
`26aa00fc7e243a90586f5895ddcad2b7ce76b935`. Starting main:
`89ee712592a371742740e705cc72f49fdd1bb9ea`; starting compat:
`d7ae31894c6b5b4362076ca4b21ddf54c4b4c11a`. Branch-only fetch preserves tags.
The original compat checkout is clean. This operation uses dedicated temporary
main and compat worktrees; only its integrated, clean resources may be removed.

## Capability inventory (11)

All rows audit `26aa00fc..4cb859dd`. Canonical owner is shared main; compat
inherits each disposition while retaining its separately registered overrides.
Dispositions below were checked against the merged main source and the compat integration; local validation and publication are recorded separately.

| ID | Selected behavior / producer and tests | Main counterpart, relationship and disposition | Compat counterpart / owners | Evidence |
| --- | --- | --- | --- | --- |
| C01 | History FTS tool-result previews, chunk writes and resumable v6 migration; `history/`, `tool/preview.ts`, `test/history/` | Adopt shared preview and migration; retain SQL NUL/metadata/locator fidelity (FC-017) | Same history implementation; no independent override | integrated; validation below |
| C02 | User image provenance; `session/prompt.ts`, `test/session/prompt.test.ts` | Adopt real user media envelope, retain attachment size and synthetic provenance boundaries (FC-009) | Retain DC-CONTEXT-001 caps | integrated; validation below |
| C03 | Persist Compose/recall/loop reminders; `prompt.ts`, `message-v2.ts`, reminder persistence tests | Adopt stable IDs/load order; retain frozen request membership (FD-002/009, FC-002/009) | Preserve full-context capture and stable memory templates (DC-ACTOR-001/DC-CONTEXT-001) | integrated; validation below |
| C04 | Retry status density; `llm.ts`, `max-mode.ts`, `status.ts`, density tests | Adopt processor-owned visible retry status; keep main-only diagnostics, bounded MaxMode and frozen instructions (FC-013, FD-002/005) | Preserve per-agent MaxMode (DC-MODEL-001) | integrated; validation below |
| C05 | Title slash prefixes; `prompt.ts`, `agent/prompt/title.txt`, title-input tests | Adopt leading command stripping, retain deterministic fallback/manual title authority (FC-001/009) | Preserve titleLocale and request metadata (DC-TUI-001) | integrated; validation below |
| C06 | Recoverable retry/error classification; `retry.ts`, `provider/error.ts`, retry/transport tests | Adopt expanded transport classification; retain bounded server/rate-limit defaults, explicit request and candidate/judge budget precedence, jitter resolution and bounded-mode defaults (FC-013) | Same policy, per-agent routing preserved | integrated; validation below |
| C07 | `context_window_exceeded`; `provider/error.ts`, retry tests | Adopt overflow classification rather than transport retry (FC-015) | Existing bounded preflight/recovery remains (DC-CONTEXT-001/DC-ACTOR-001) | integrated; validation below |
| C08 | Auto-worktree hard gate then removal; `tool/bash.ts`, `external-directory.ts`, config/routes/SDK and notice tests | Retain registered opt-in post-success notice and mutation metadata (FC-007); do not adopt the intermediate hard gate. Review independent obsolete conflict-route removal | Inherit fixed cwd and notice; no compat policy change | integrated; validation below |
| C09 | Unbundle design skills; builtin bundles, Compose brainstorm, skill tests | Adopt removal and recommendation updates; preserve unrelated fork guidance (FC-005/011) | Same bundle content | integrated; validation below |
| C10 | Native Responses tool images; `tool-attachment.ts`, `message-v2.ts`, provider Responses conversion/transform, prefix/compaction callers | Adopt actual adapter-provider routing and image budgets, preserve frozen schemas and mandatory compaction tail (FD-006/009, FC-002/015) | Preserve replay caps, frozen full-context and preflight estimation (DC-CONTEXT-001/DC-ACTOR-001) | integrated; validation below |
| C11 | Resume empty residue; `prompt.ts`, TUI sync/session render, resume-empty tests | Adopt removal/re-dispatch only after successful atomic admission; preserve task identity, generation ownership and no side-effect replay (FC-001/009) | Preserve checkpoint coverage/revert pagination and recovery receipts (DC-CONTEXT-001) | integrated; validation below |

## Resolution and local evidence

Main runtime/guidance source: `9c05eacb2817b0e100fb4b788b8085af6ba2aef5`;
final main test snapshot: `13d287aac076b4b113f194991ad88c3786631625`. C08 retains the notice but removes the
unused auto-create API. C06 retains bounded defaults as well as request priority.
No other FD/FC is retired or consolidated. The eight DC owners remain compat-owned.

Both worktrees use `bun ci` without lockfile mutation. Package test commands run
from `packages/opencode`, with `MIMOCODE_EXPERIMENTAL`,
`MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE` unset.
Package preload retains `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`, in-memory DB,
fixture-local config and disabled default plugins; this is not default-off proof.

Main evidence:

- Complete `test/history`: 97 pass, 5 existing benchmark skips; includes real Node SQLite migration.
- Complete `test/session/prompt-effect.test.ts`: 141 pass, 2 existing skips.
- Complete `test/session/prompt.test.ts`: 60 pass after fixing envelope hydration order; both direct parts and persisted message reads are asserted.
- Provider/Responses, reminder persistence, processor, compaction, prefix, title, skill, recovery and permission suites pass in separate processes. The initial policy-mismatched upstream expectations were adapted to FC-013 and atomic empty-shell deletion, preserving behavior assertions.
- Recovery-commit, resume-empty, compaction-projection and retry-scope final group: 41 pass. Deletion-trigger failure proves task/message transaction rollback and no ownership callback.
- Real HTTP actor recovery: 13 pass after adopting empty-shell removal assertions, retaining concurrent admission, unchanged parent users, frozen systems and task/actor identity checks.
- Bash notice metadata plus deletion permission group: 64 pass. The notice file alone has an ActorControl circular-import initialization failure, reproduced on the untouched starting compat checkout; the actual grouped execution is green. This is a process-arrangement limit, not a new production fix or a waived CI failure.
- Complete Actor spawn/resume suite: 75 pass after updating empty-shell assertions; user identity, frozen context, admission and cancellation assertions remain. Complete config suite: 91 pass.
- Real HTTP recovery-task and concurrent setmode suites: 12 pass on each branch. Original user part IDs/content remain identical; exactly one new persisted recall reminder is asserted. The setmode fixture now contains useful assistant output, retaining its settlement and concurrent field-preservation assertions.
- Initial main CI at `1c0fe133` failed on obsolete empty-shell and non-persisted-reminder assumptions in these tests and Actor spawn/resume. The corrected suites passed locally; final-SHA CI must supersede that failed run.
- Core package `bun typecheck` and root `bun lint` pass (lint retains existing warnings).
- SDK and OpenAPI regenerated from the resolved source. Main exposes 139 operations; compat retains its extra checkpoint-coverage operation (140). Neither exposes the removed auto-create endpoint. All remaining registered API differences stay intact.

Compat validation and source integration are recorded in its own current review
and history. Final push-SHA CI and live remote/ancestry proof are collected after
the registry commits; local success alone does not declare synchronization complete.
