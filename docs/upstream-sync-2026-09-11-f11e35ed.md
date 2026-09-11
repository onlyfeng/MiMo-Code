# Upstream synchronization 2026-09-11 (f11e35ed)

This is the second selected range reviewed on 2026-09-11. The
[7641dbbd record](upstream-sync-2026-09-11-7641dbbd.md) remains the record for
`cb00c280..7641dbbd`; this record starts from that accepted, published and
CI-verified baseline. Upstream advanced again while that range was being
propagated into `dev/compat`, so this range was selected and propagated as its
own pass.

## Selected immutable range

- Upstream: `7641dbbd3b8aa20ffd4fb74089f2dc65bf032201..f11e35ede439df5555ca1f0309ffea8e9b49f06e`
  (one squash-merge commit; 17 paths, 1,280 insertions, 201 deletions).
- Starting main: `bcf2fba7c337a812071ccacc5184347c0bd5536e`.
- Starting compat: `2a2632d4455920701f4ce50074b7c4da91244902`; already contains
  starting main.
- Canonical owner for the selected capability: shared main. Compat inherits
  through the direct `main` merge; no compat-only implementation is selected.
- Main source/test after the merge: `635618207270af55435aee88ce27003fc1809b44`
  (17 paths, 1,280 insertions, 201 deletions from the starting main tip —
  identical to the incoming delta, because the merge needed no fork adaptation).
- Bundled guidance content is unchanged at
  `c35c34d45a2e24ab6e48a7a3fd438d1c456352ed`; `src/tool/history.txt` and
  `src/tool/memory.txt` are runtime tool descriptions, not bundled skill content.
  No SDK/OpenAPI input and no lockfile changed.

## Capability inventory (1)

| ID | Selected behavior and decisive paths/tests | Main counterpart / relationship / drift | Compat counterpart and owners | Disposition |
| --- | --- | --- | --- | --- |
| C03 | History search and `get` stop materializing inline base64 for large media sessions: SQL projections leave unused media payloads in the database, `get` returns paged `part_id` details instead of indexing inline attachments, data-URL cleaning rejects mid-token `data:` prefixes and newline/space-wrapped base64, attachment URLs are normalized to `data:<mime>;base64`, FTS receives a neutral `[media <mime>]` marker instead of UX instructions, `around` always keeps its anchor message and reports `metadata.truncated`, and a one-shot `20260908000000_history_media_rebuild` migration clears the derived `history_fts` index so the resumable startup backfill rebuilds it. `src/history/{backfill,extract,media,projection,service}.ts`, `src/tool/{history,memory}.ts` and their `.txt` descriptions, `src/session/checkpoint.ts`, `migration/20260908000000_history_media_rebuild/migration.sql`; `test/history/{details,media,writer}.test.ts`, `test/tool/history.test.ts` | Sixteen of the seventeen incoming paths had no fork divergence at all. `src/session/checkpoint.ts` is the only diverged file, and its incoming change is the two copy lines that redirect verbatim recall from `around` alone to `around` then `get(part_id)` | Inherited through the direct main merge; FC-002 owns the checkpoint writer, FC-015 its budget, FC-011 the tool-description guidance, DC-CONTEXT-001 the compat caps that consume the same checkpoint text | Adopt unchanged; the checkpoint copy is factually correct here because the merged history tool provides both hops |

## Owner review map

All active FD/FC/DC entries were considered against the selected delta.

- FC-002 owns `src/session/checkpoint.ts`. The incoming change is confined to the
  elision marker string and its doc comment. Writer modes, frozen context,
  watermark advancement and the per-message cap are untouched.
- FC-015 owns the compaction budget that consumes that checkpoint text. The
  marker's length changes by a few characters inside an already-bounded field;
  no cap, ratio or trigger changed.
- FC-011 owns fork-facing guidance. `src/tool/history.txt` and
  `src/tool/memory.txt` are runtime tool descriptions rather than bundled skill
  content, and their new `search/around → get(part_id)` escalation is accurate
  for the merged tool, so no fork-facing rewrite is needed and the bundled
  guidance snapshot does not move.
- FC-005 owns skill discovery and its own `20260908000000_session_prefix_skill_catalog`
  migration. The incoming migration is a different directory under the same date
  prefix; the fork already carries two migrations sharing that prefix, and its
  journal regression checks the complete migration-name set rather than a
  count, so no ordering or identity assumption breaks. The new statement is
  `DELETE FROM history_fts` — a derived index only, with original parts and
  sessions untouched and the startup backfill resumable through `NOT EXISTS`.
- FC-008 owns package test isolation. `test/history/large-session.bench.test.ts`
  arrives as an ordinary `.test.ts` input and enters the existing path-hash
  shard; its benchmark cases are skipped unless explicitly enabled.
- DC-CONTEXT-001 caps model-visible content on `dev/compat` and consumes the same
  checkpoint text. A copy-only change inside an already-bounded field alters no
  cap, serialization or preflight behavior.
- Every other active FD, FC and DC entry has no incoming owned implementation
  change. No owner retires and no unrelated consolidation is selected.

## Conflict resolution

None. The merge was clean on every path, including `src/session/checkpoint.ts`,
whose fork divergence does not overlap the two incoming copy lines.

## Main validation

- `bun typecheck` passed repository-wide (12/12 packages). `bun lint` reported
  0 errors and 4541 warnings; the pre-merge baseline at `bcf2fba7` reported
  0 errors and 4508, the increase coming with the 1,280 incoming lines and with
  no warning cleanup included. `git diff --check` passed. The lockfile is
  unchanged and no generated SDK/OpenAPI input changed, so no regeneration was
  required.
- Affected matrix at `635618207270af55435aee88ce27003fc1809b44`, run from
  `packages/opencode` with `bun test --timeout 120000` in three sequential
  processes, mirroring the isolation `.github/workflows/test.yml` applies to
  `session-actor-recovery.test.ts`:
  - `test/tool/ test/mcp/ test/util/ test/provider/ test/flag/ test/skill/
    test/history/ test/storage/` — 2305 passed, 9 skipped, 1 failed,
    6772 assertions across 151 files in 311.66 s. The single failure is
    discussed below.
  - `test/server/` (every file except `session-actor-recovery.test.ts`)
    `test/session/ test/actor/ test/inbox/ test/effect/` — 1700 passed,
    23 skipped, 1 todo, 0 failed, 5803 assertions across 168 files in 732.86 s.
  - `test/server/session-actor-recovery.test.ts` in its own process — 13 passed,
    0 failed, 175 assertions in 24.95 s.
- The one local failure, `test/history/details.test.ts > SQL preview bounds
  NUL-containing fields without losing get details`, is an upstream test that
  does not pass on this platform. The projection's
  `length(CAST(json_extract(...) AS BLOB)) > 4000` preview guard does not fire
  for a value whose first byte is NUL here: the field comes back as `""` and the
  `[large field omitted…]` marker is never substituted. It was reproduced on
  upstream's own unmodified tree at `f11e35ed`, checked out and installed
  separately on the same machine and the same pinned Bun 1.3.14, where it fails
  identically (3 passed, 1 failed). Upstream's `test` workflow for `f11e35ed` is
  green on `ubuntu-latest` (run 34616566146), so this is a darwin/Linux SQLite
  text-with-embedded-NUL difference, not a fork integration defect and not a
  regression introduced by this merge. No fork source, test or assertion was
  changed for it; the fork's own Linux CI on the final SHA is the authority.
- Reproduction note, unchanged from the previous range: a `test/tool/*.test.ts`
  file run alone or in a small file set fails before its first test with
  `ReferenceError: Cannot access 'ActorControl' before initialization` from
  `src/tool/tool-script.ts`. `test/tool/history.test.ts` and
  `test/tool/memory.test.ts` hit it when run beside `test/history/` and
  `test/storage/` only; both pass inside the full `test/tool/` directory, which
  is how the matrix above and CI run them. This reproduces at the pre-merge
  baseline and is a module-initialization-order artifact of file selection.

## Capability results (1)

| ID | Main result | Compat integration decision | Decisive evidence |
| --- | --- | --- | --- |
| C03 | Adopted unchanged; the only diverged file took two copy lines that are factually correct here | Inherit through the direct main merge; no compat override | `test/history/details.test.ts`, `test/history/media.test.ts`, `test/tool/history.test.ts` and `test/storage/` migration regressions within the matrix above |

Remote-tip equality, exact-tip CI and upstream→main→compat ancestry are checked
independently after final publication, and are not inferred from local results.
