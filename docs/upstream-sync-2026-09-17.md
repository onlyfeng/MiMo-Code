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
Statuses below are pre-merge decisions, not completed validation.

| ID | Selected behavior / producer and tests | Main counterpart, relationship and disposition | Compat counterpart / owners | Evidence |
| --- | --- | --- | --- | --- |
| C01 | History FTS tool-result previews, chunk writes and resumable v6 migration; `history/`, `tool/preview.ts`, `test/history/` | Adopt shared preview and migration; retain SQL NUL/metadata/locator fidelity (FC-017) | Same history implementation; no independent override | pending |
| C02 | User image provenance; `session/prompt.ts`, `test/session/prompt.test.ts` | Adopt real user media envelope, retain attachment size and synthetic provenance boundaries (FC-009) | Retain DC-CONTEXT-001 caps | pending |
| C03 | Persist Compose/recall/loop reminders; `prompt.ts`, `message-v2.ts`, reminder persistence tests | Adopt stable IDs/load order; retain frozen request membership (FD-002/009, FC-002/009) | Preserve full-context capture and stable memory templates (DC-ACTOR-001/DC-CONTEXT-001) | pending |
| C04 | Retry status density; `llm.ts`, `max-mode.ts`, `status.ts`, density tests | Adopt processor-owned visible retry status; keep main-only diagnostics, bounded MaxMode and frozen instructions (FC-013, FD-002/005) | Preserve per-agent MaxMode (DC-MODEL-001) | pending |
| C05 | Title slash prefixes; `prompt.ts`, `agent/prompt/title.txt`, title-input tests | Adopt leading command stripping, retain deterministic fallback/manual title authority (FC-001/009) | Preserve titleLocale and request metadata (DC-TUI-001) | pending |
| C06 | Recoverable retry/error classification; `retry.ts`, `provider/error.ts`, retry/transport tests | Adopt expanded transport classification; retain bounded server/rate-limit defaults, explicit request and candidate/judge budget precedence, jitter resolution and bounded-mode defaults (FC-013) | Same policy, per-agent routing preserved | pending |
| C07 | `context_window_exceeded`; `provider/error.ts`, retry tests | Adopt overflow classification rather than transport retry (FC-015) | Existing bounded preflight/recovery remains (DC-CONTEXT-001/DC-ACTOR-001) | pending |
| C08 | Auto-worktree hard gate then removal; `tool/bash.ts`, `external-directory.ts`, config/routes/SDK and notice tests | Retain registered opt-in post-success notice and mutation metadata (FC-007); do not adopt the intermediate hard gate. Review independent obsolete conflict-route removal | Inherit fixed cwd and notice; no compat policy change | pending |
| C09 | Unbundle design skills; builtin bundles, Compose brainstorm, skill tests | Adopt removal and recommendation updates; preserve unrelated fork guidance (FC-005/011) | Same bundle content | pending |
| C10 | Native Responses tool images; `tool-attachment.ts`, `message-v2.ts`, provider Responses conversion/transform, prefix/compaction callers | Adopt actual adapter-provider routing and image budgets, preserve frozen schemas and mandatory compaction tail (FD-006/009, FC-002/015) | Preserve replay caps, frozen full-context and preflight estimation (DC-CONTEXT-001/DC-ACTOR-001) | pending |
| C11 | Resume empty residue; `prompt.ts`, TUI sync/session render, resume-empty tests | Adopt removal/re-dispatch only after successful atomic admission; preserve task identity, generation ownership and no side-effect replay (FC-001/009) | Preserve checkpoint coverage/revert pagination and recovery receipts (DC-CONTEXT-001) | pending |

## Validation and publication

Pending. Runtime/test snapshots, generated artifacts, final branch SHA CI,
remote equality and ancestry must be established before reporting completion.
