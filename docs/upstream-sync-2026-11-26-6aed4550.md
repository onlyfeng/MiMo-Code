# Upstream synchronization on 2026-11-26 through 6aed4550

## Scope

Full live synchronization through upstream
`6aed4550c95a25204e50ae73f1d9893312d1782a` (pull request #2868), fetched on
2026-11-26 with branch-only refspecs. Fork `main` had last reviewed
`6ad6bbb44acb3600ccc4c09ab3c64c79f5878593`
([earlier the same day](upstream-sync-2026-11-26.md)); upstream added one
commit since. The starting tips were `3d268917d29a0c30c54372ea7c286e9512fce690`
on `main` (the merge of pull request #285) and
`25c859e82c775f6249b4a871c1daa8ff1d778723` on `dev/compat` (its propagation).
Compat already contained `main`, so `3d268917` is the propagation baseline.

Fork pull requests merged since the previous synchronization were reviewed
against the incoming change: #280 and #281 (layout-only, recorded in
[the earlier record](upstream-sync-2026-11-26.md#follow-up-on-the-same-day)),
#282–#284 (registry consolidation, documentation only) and #285 (bundled
`config.md` row). None of them touches `session/prompt.ts`,
`test/session/prompt.test.ts` or the Compose spec.

Two dedicated worktrees on `sync/upstream-6aed4550` and
`propagate/compat-6aed4550` housed the integration; the original checkout was
not touched. `bun.lock`, `packages/cli/migration/` and every HTTP route and
schema are unchanged on both branches, so the SDK was not regenerated.

Runtime/test snapshots: `main` `72dc3114b2eebc7deb26a497e3ba6e3ad8df8b86`,
`dev/compat` `730b7656f6255197d272825c5baa1c97b243f5f4`.

## Capability inventory and results (1)

| ID | Selected behavior | Main result | dev/compat result | Decisive paths and tests |
| --- | --- | --- | --- | --- |
| C01 | The image attachment reminder escapes a closing `</system-reminder>` tag in a filename or path case-insensitively by inserting a backslash before its slash (`</SYSTEM-REMINDER>` becomes `<\/SYSTEM-REMINDER>`), so removing the backslash recovers the exact name or path. Previously every match was rewritten to lowercase `<\/system-reminder>`. | Adopted (clean merge). No FD/FC entry covers the escaping; FC-009's `metadata.userImageAttachment` tag and the legacy-only `orderUserParts` reorder do not read the reminder body. The fork's `neutralizeHarnessTags` (FD-005) is a separate scheme for MCP text that already preserves the tag's case. | Inherited (clean merge). The compat `prompt.ts` overlay (DC-CONTEXT-001) lies outside `userImageAttachmentEnvelope`, and the overlay delta against `main` is unchanged apart from blob ids. | `session/prompt.ts` (`userImageAttachmentEnvelope`); `test/session/prompt.test.ts` ("image envelope escapes literal closing system-reminder tag in filename or path"); `docs/compose/spec/user-image-attachment-reminder.md` [S2.1]. |

Paths in the last column are relative to `packages/cli/` except the spec.
`userImageAttachmentEnvelope` has no other caller or test in the fork.

## Local validation

macOS 15 (Darwin 24.6) with the pinned Bun 1.3.14; dependencies came from
`bun ci`. Tests ran from `packages/cli` with every ambient `MIMOCODE_*`
switch of this host removed (including `MIMOCODE_EXPERIMENTAL`,
`MIMOCODE_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE` when set); the package
preload flags were kept.

- `main` `72dc3114`: `bun run typecheck` in `packages/cli` passes; root
  `bun run lint` reports 0 errors (3,727 warnings).
  `test/session/prompt.test.ts`, `test/session/image-envelope-read-order.test.ts`
  and `test/session/message-v2.test.ts`: 137 pass, 0 fail.
- `dev/compat` `730b7656`: `bun run typecheck` passes; root `bun run lint`
  reports 0 errors (3,815 warnings). The same three files: 152 pass, 0 fail.

Mutation check for C01: restoring the previous lowercase replacement string
fails the upstream assertion (the restored path keeps `</system-reminder>`
instead of `</SYSTEM-REMINDER>`); with upstream's line it passes again.

Local runs on this host are not exact-SHA CI.

## Review

Pull request #286 carried `72dc3114` and the record commit `be32df92` to
`main` for review. The Codex review found nothing (👍 and a completed review
with no findings on `be32df92`). Pull request lint (45849478444) and typecheck
(45849478511) passed, and the dispatched `test` workflow passed on that head
(run 45849476969).

## Publication

`main` was published by direct fast-forward push to the reviewed head, which
marked pull request #286 merged. `dev/compat` was published by direct
fast-forward push of the propagation merge, the record merge and the compat
review record.

| Branch | Push | Exact-SHA push CI | Result |
| --- | --- | --- | --- |
| `main` | `3d268917..be32df92` (`72dc3114` runtime, `be32df92` record) | lint 45851039295, typecheck 45851039393, test 45851039153 on `be32df92f425b7df5ef1e189d3eb58ef0415fcf7` | All success; `windows-runtime` is skipped on `main` by design. |
| `dev/compat` | `25c859e8..9fe8e5da` (`730b7656` runtime, record merge `90f62f98`, compat record `9fe8e5da`) | lint 45851087083, typecheck 45851087049, test 45851087019 on `9fe8e5daa64af637a1f76105bd61e5c0bc92a7cb` | All success, including `windows-runtime`. |

Ancestry: upstream `6aed4550` is an ancestor of `main` `be32df92`, which is an
ancestor of `dev/compat` `9fe8e5da`; upstream had not advanced when the tips
were rechecked after the push CI.

The commit that adds these sections, and its merge into `dev/compat`, change
only `docs/`. Their exact-SHA evidence is the runs above, with
`git diff --quiet <tip> <new tip> -- . ':(exclude)docs'` as the proof.
