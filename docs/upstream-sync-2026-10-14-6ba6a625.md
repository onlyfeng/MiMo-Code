# 2026-10-14 upstream synchronization through 6ba6a625

## Scope, baseline and capability inventory (1)

Full sync against freshly fetched refs (2026-10-14 14:34 UTC): upstream `e27e87de81a74db5475bd93540f8889dfbc70ec6..6ba6a6254a6d040bb81ec9453962a52fc46c9c6d`, one commit (#2661, "make kind/body_idx column ensure idempotent", 7 paths). Starting fork tips: `main=f0571cd9eac31c8c9cc10e3793370ba89fe1b2b2`, `dev/compat=51ad5319ff141103f116c6445a009db20d8fce6a`. Main runtime merge: `22874d87c9b0134d0e7540880c9050e4ae94d274`, conflict-free; every changed path is byte-identical to upstream. The range changes no manifest or lockfile and adds no migration directory.

| ID | Upstream content | Main result | dev/compat result | Relationship, owner, disposition and evidence |
| --- | --- | --- | --- | --- |
| C01 | `6ba6a625` (#2661): a desynced `__drizzle_migrations` journal (an unjournaled `20261011000000_history_fts_kind` while `history_fts.kind` exists) no longer aborts every startup. The shipped `20261011000000_history_fts_kind` and `20261012000000_history_cjk_unigram` migrations use `CREATE INDEX IF NOT EXISTS` and `INSERT OR IGNORE`; the new `storage/migrate-replay-safe.ts` wraps drizzle `migrate()` so only ALTER duplicate-column/no-such-column and CREATE INDEX already-exists errors count as applied. | Adopted unchanged. | Inherited. | FC-017 note (history migrations). AGENTS.md forbids editing shipped migration SQL because engines have applied those journals; these two files are upstream-owned and were byte-identical to upstream before the merge, the edits change no schema, and drizzle selects migrations by journal name (`getMigrationsToRun`), so a database that recorded them does not rerun them. Keeping the old bytes would only make them fork-different. The replay-safe runner also covers the fork-only `ALTER TABLE ... ADD` migrations. Every `test/history/` and `test/storage/` file passes alone, including `fts-kind-idempotent` 4 and the real-`Client()` `fts-kind-boot.e2e` 1, plus `title-migration`, `skill-catalog`, `node-migration` and the memory FTS suites. |

Inventory count: 1 capability and 1 result row. No FD/FC/DC owner watches `storage/db.ts` or the history migrations; FC-017's history watch surfaces (`projection.ts`, `media.ts`, `service.ts`, `import.ts`) are unchanged.

## Validation

Default-path runs unset the ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`. `bun ci` installs from `bun.lock`. On main `22874d87c9b0134d0e7540880c9050e4ae94d274`: package and root `bun run typecheck` exit 0; root lint exits 0 with 3535 warnings and no errors. The affected matrix is every `test/history/` file (all pass; the bench file skips 5 as before), every `test/storage/` file (`db` 4, `json-migration` 22, `prefix-skill-catalog-migration` 1, `storage` 13), `test/session/title-migration` 1, `test/session/skill-catalog` 27 and `test/memory/` FTS 5+10. Because every test opens the database through the changed runner, exact-tip CI's full sharded suite is the publication gate for the remaining files; it was not repeated locally.

## Publication gates

Completion requires successful lint, typecheck and test CI on the exact final branch-tip SHAs, both remote tips equal to the published commits, and ancestry from `6ba6a625` through fork `main` to `dev/compat`. These are checked after publication.
