# Upstream synchronization on 2026-11-26

## Scope

Full live synchronization through upstream
`6ad6bbb44acb3600ccc4c09ab3c64c79f5878593` (pull request #2867), fetched on
2026-11-26 with branch-only refspecs. Fork `main` had last reviewed
`c538fab349373356623acea5bb80defa7fc279c0`
([2026-11-25](upstream-sync-2026-11-25.md)); upstream added one commit since.
The starting tips were `92d3b8d44902533ccfe15d4e470a279fdf412d75` on `main`
(the merge of pull request #278) and `d8d14a2972182440a6f022f24dbdc01e30ec162d`
on `dev/compat` (its propagation). Compat already contained `main`, so
`92d3b8d4` is the propagation baseline.

Fork pull requests merged since the previous synchronization were reviewed
against the incoming change: #273–#278 from the
[2026-11-26 alignment review](fork-alignment-review-2026-11-26.md). Only #275,
which restored upstream's layout in `session/prompt.ts`, touches the same file;
upstream's hunks (`userImageAttachmentEnvelope` and the envelope block of
`createUserMessage`) merged cleanly over it. The others (#273 FD-004/FD-006,
#274 summarize test, #276 Auto-Worktree retirement, #277 shared terminal
notifier, #278 record) touch none of the incoming surfaces.

Two dedicated worktrees on `sync/upstream-6ad6bbb4` and `sync/compat-6ad6bbb4`
housed the integration; the original checkout was not touched. `bun.lock`,
`packages/cli/migration/` and every HTTP route and schema are unchanged on both
branches, so the SDK was not regenerated.

Runtime/test snapshots: `main` `d1039edaa94528da317b8668a2e244ec5fa98c9b`,
`dev/compat` `75e37ed2f052e20f7b14a98caee44e7baaed1cf0`.

## Capability inventory and results (2)

| ID | Selected behavior | Main result | dev/compat result | Decisive paths and tests |
| --- | --- | --- | --- | --- |
| C01 | User image attachments are described by a closed `<system-reminder>` that lists each image in order as `- <filename> (<mime>): <local path or "no local file">`, escapes any `</system-reminder>` in a name or path, and adds the `[Image: filename]` marker line only when non-synthetic, non-ignored user text contains such a marker. The `# Files mentioned by the user` header, the boilerplate paragraphs and the `## My request:` divider are gone. | Adopted (clean merge). The fork keeps its `metadata.userImageAttachment` tag on the reminder part; hook/spawn provenance and the `isUserAttachmentImagePart` filter are unchanged (FC-009). | Inherited (clean merge). DC-CONTEXT-001 lists `prompt.ts` and `message-v2.ts` as watch surfaces; compat-owned hunks there do not touch the envelope, and image sizing in preflight does not depend on the reminder text. | `session/prompt.ts` (`userImageAttachmentEnvelope`, `createUserMessage`); `test/session/prompt.test.ts` (envelope unit cases, file:// and data: image cases, multi-image order, marker present/absent, escaping). |
| C02 | The reminder is appended after the user parts with a fresh ascending part ID instead of being spliced ahead of the user body, so its stored order is its in-memory order and the prompt rebuilt from storage matches the one first sent. | Adapted. Upstream has no read-time reordering. The fork's `orderUserParts` (`session/message-v2.ts`, FC-009 2026-09-17 rule) moved any tagged envelope ahead of the user body on every read, so it would also have moved the new reminder: a reloaded message would have produced a different prompt from the first send. It now moves only a legacy envelope (tagged text ending in `## My request:`), which keeps rows persisted from 2026-09-17 until this synchronization in their original order. FC-009 note. | Inherited (`orderUserParts` is identical to `main`). | `session/message-v2.ts` (`orderUserParts`, `LEGACY_IMAGE_ENVELOPE_TAIL`); `test/session/image-envelope-read-order.test.ts` (new, mutation below); `test/session/prompt.test.ts` persisted read-back cases, which also assert that `MessageV2.parts` and `sessions.messages` equal the in-memory parts. |

## Merge

`main` merged upstream's four files. `session/prompt.ts` and both Compose
specs merged cleanly. `test/session/prompt.test.ts` had two conflicts, both at
the end of envelope tests that upstream rewrote: the fork had added
`MessageV2.parts` and `sessions.messages` equality checks next to the old
splice-order assertions. The resolution takes upstream's assertions and keeps
the fork's equality checks; in the marker test they now cover both prompts.

The semantic conflict in C02 had no textual conflict. With the tests resolved
and `orderUserParts` unchanged, `prompt.test.ts` gave 64 pass and 4 fail: each
failing persisted read-back case found the reminder at index 0 instead of last.
The adaptation is part of the merge commit.

Merging `main` into `dev/compat` was clean. Compat-owned changes in
`message-v2.ts`, `prompt.ts` and `prompt.test.ts` lie outside the envelope and
`orderUserParts` regions.

## Local validation

macOS 15 (Darwin 24.6) with the pinned Bun 1.3.14; dependencies came from
`bun ci`. Each test file ran in its own process from `packages/cli`, with
`MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE` and
the seven other ambient `MIMOCODE_*` switches of this host removed; the package
preload flags were kept. The files were chosen as tests that persist user
`file` parts and read them back, plus Compose-protocol ordering, replayed
media and title tests.

- `main` `d1039eda`: `bun run typecheck` in `packages/cli` passes; root
  `bun run lint` reports 0 errors (3,727 warnings). 15 files, 540 pass, 0 fail,
  2 skipped: `test/session/prompt.test.ts` 68,
  `test/session/prompt-effect.test.ts` 224 (2 skipped),
  `test/session/message-v2.test.ts` 68,
  `test/session/image-envelope-read-order.test.ts` 1,
  `test/server/sync-restore.test.ts` 50,
  `test/session/prompt-empty-content-guard.test.ts` 22,
  `test/session/rebuild-tail-digest.test.ts` 20,
  `test/session/tool-gate-cancel.test.ts` 19,
  `test/session/synthetic-reminder.test.ts` 18,
  `test/session/classify-integration.test.ts` 16,
  `test/cli/export-import.test.ts` 8, `test/session/resume-empty-residue.test.ts` 8,
  `test/session/title-first-turn.test.ts` 8,
  `test/session/rebuild-boundary-placement.test.ts` 7 and
  `test/sync/restore-order.test.ts` 3.
- `dev/compat` `75e37ed2`: `bun run typecheck` in `packages/cli` passes; root
  `bun run lint` reports 0 errors (3,815 warnings). The same 15 files plus
  `test/session/overflow.test.ts` (DC-CONTEXT-001 image sizing): 16 files,
  705 pass, 0 fail, 2 skipped.

Mutation check for C02, on `test/session/image-envelope-read-order.test.ts`:
dropping the legacy-tail condition, so that the new reminder is moved again,
fails on the current message's order; disabling the reorder fails on the
legacy message's order. Restored, it passes.

Local runs on this host are not exact-SHA CI.

## Review

Pull request #279 carried `d1039eda` and the record commit `52e503e6` to
`main` for review. The Codex review found nothing (👍 on `52e503e6`). Pull
request lint and typecheck passed, and the dispatched `test` workflow passed on
that head (run 45813401094).

## Publication

Both branches were published by direct fast-forward push, which marked pull
request #279 merged.

| Branch | Push | Exact-SHA push CI | Result |
| --- | --- | --- | --- |
| `main` | `92d3b8d4..52e503e6` (`d1039eda` runtime, `52e503e6` record) | lint 45814804838, typecheck 45814804677, test 45814804749 on `52e503e622c481826d08c16fe8bfca340a1d8f63` | All success; `windows-runtime` is skipped on `main` by design. |
| `dev/compat` | `d8d14a29..ea902af4` (`75e37ed2` runtime, record merge and compat record) | lint 45814811491, typecheck 45814811540, test 45814811548 on `ea902af42238db75851f77f32cdc8a70761b0cc7` | All success, including `windows-runtime`. |

Ancestry: upstream `6ad6bbb4` is an ancestor of `main` `52e503e6`, which is an
ancestor of `dev/compat` `ea902af4`; upstream had not advanced when the tips
were rechecked before the push.

## Follow-up on the same day

Two layout-only pull requests followed the synchronization; they are recorded
in [the alignment review](fork-alignment-review-2026-11-26.md). Pull request
#280 restored upstream's text in 16 layout-only hunks on `main` (merge
`6e3b0cd1e87fc30bf84418131c0734c4154af0fb`), propagated to compat as
`66ba012e61ef062536660ae117f1f9afe971d367`. Pull request #281 restored `main`'s
text in 8 layout-only hunks of compat (merge
`45d828da15d89f6d4214cee95d388ee683a0890c`). Each file's TypeScript token
stream is unchanged.

| Branch | Tip | Exact-SHA push CI | Result |
| --- | --- | --- | --- |
| `main` | `6e3b0cd1` | lint 45816529995, typecheck 45816529986, test 45816530009 | All success; `windows-runtime` skipped by design. |
| `dev/compat` | `45d828da` | lint 45817508499, typecheck 45817508515, test 45817508582 | All success, including `windows-runtime`. The `test` run for the intermediate `66ba012e` was cancelled when `45d828da` superseded it. |

The commit that adds this section, and its merge into `dev/compat`, change only
`docs/` and start no workflow. Their trees outside `docs/` equal `6e3b0cd1` and
`45d828da` respectively (`git diff --quiet <ancestor> <tip> -- .
':(exclude)docs'`), so the runs above are their CI evidence.
