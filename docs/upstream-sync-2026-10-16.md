# 2026-10-16 upstream synchronization through bf0563dd

## Scope, baseline and capability inventory (1)

Full sync against freshly fetched refs (2026-10-16): upstream `496bb8cbe614aecea27623457d143600cc12c275..bf0563ddc201b44e3f59c35b18dba17c4386564d`, one commit (`bf0563dd`, "keep media parts when replaying the user message after overflow compaction (#2662)", 7 paths). Starting fork tips: `main=40f69640279b27ce94d9bbadfa1dd750222710e2`, `dev/compat=b1a83b0bc4e4f973c019a0c3781cfd3ecb271802`. Main runtime merge: `92f5f6a5adeade500f0def7555dd43e14b083545`, with one conflict in `packages/cli/src/session/compaction.ts`. The range changes no manifest, lockfile, migration or SDK/OpenAPI input.

| ID | Upstream content | Main result | dev/compat result | Relationship, owner, disposition and evidence |
| --- | --- | --- | --- | --- |
| C01 | `bf0563dd`: after provider-overflow compaction, the replayed last user message copies every non-`compaction` part verbatim, including media `file` parts, keeping `mime`, `filename`, `url` and `source`; the `[Attached <mime>: <filename>]` substitution is removed. The summarization request keeps `stripMedia: true`. The attachment provenance envelope derives a local path from an absolute `source.path` or a `file:` URL, names `[Image: <file name>]` / `[PDF: <file name>]` markers as durable attachment identity, and the TUI writes those markers with unique `mimo-paste-*` paste names (spill files renamed from `opencode-paste-*`); attachment-only all-synthetic prompts keep the caller `system` (`prompt.system ?? input.system`) without pinning `session.prompt`; the bang-command argument tokenizer accepts the new marker shapes plus the legacy numeric ones. Adds `docs/compose/spec/compaction-replay-keep-media.md`. | Adapted. The substitution removal merges into FC-001's atomic replay (`commitUserMessageIfLatest`, `task_id`, `source: "hook"` provenance retained); FC-009's envelope stays synthetic with the fork's `userImageAttachment` metadata; FC-015's bounded projection, ratio trigger and frozen prefix, and FD-011's `toolChoice: "none"`, are untouched; FD-010/FD-012 decide the summary step, not the replay path. `message-v2.ts`'s own strip-media conversion is unchanged (spec S2.3). The spec is adopted unchanged. | Inherited through the main merge. | FC-001 (atomic replay), FC-009 (envelope provenance), FC-015 (compaction boundary). FC-016's TUI prompt surface changes paste markers and part `source.path` only (voice ownership and grapheme offsets untouched); FC-017's history locators are not producers of this path. Evidence: `test/session/prompt-effect.test.ts` (keeps replayed media, byte-identical to upstream after the merge), `test/session/prompt.test.ts` (envelope and attachment-only system cases), `test/cli/tui/clipboard-spill.test.ts`, `test/session/compaction-projection.test.ts`, `test/session/compaction-reasoning-fallback.test.ts`, `test/session/compaction-tool-choice.test.ts`, `test/session/message-v2.test.ts`, `test/session/skill-catalog-system-tail.test.ts`. |

Inventory count: 1 capability and 1 result row.

## Validation

Default-path runs unset the ambient `MIMOCODE_EXPERIMENTAL` (set to `1` on this host); `MIMOCODE_MCP_TOOL_SEARCH` and `MIMOCODE_CODEX_MODE` are absent. The package preload is unchanged. `bun ci` installs from `bun.lock` (1059 packages). On the merged main tree `92f5f6a5`:

- Package `bun run typecheck` exits 0; root lint exits 0 with 3536 warnings and no errors (unchanged from the pre-merge baseline).
- Focused matrix (`test/session/prompt.test.ts`, `test/cli/tui/clipboard-spill.test.ts`, `test/session/compaction-reasoning-fallback.test.ts`, `test/session/compaction-tool-choice.test.ts`, `test/session/compaction-projection.test.ts`, `test/session/message-v2.test.ts`, `test/session/skill-catalog-system-tail.test.ts`, `--timeout 30000`): 160 pass, 0 fail, 1213 assertions.
- `test/session/prompt-effect.test.ts --timeout 30000`: 181 pass, 2 existing skips, 0 fail; the updated overflow-replay case is byte-identical to upstream's.
- Merge shape: the single conflict in `packages/cli/src/session/compaction.ts` resolves to the fork's `flatMap`/`commitUserMessageIfLatest` replay block with only the media-to-text substitution dropped; `src/session/prompt.ts` auto-merges upstream's envelope, `?? input.system` and tokenizer changes beside the fork's `metadata: { userImageAttachment: true }`; the TUI and clipboard files auto-merge (fork regions were upstream-identical).

## Publication gates

Completion requires successful lint, typecheck and test CI on the exact final branch-tip SHAs, both remote tips equal to the published commits, and ancestry from `bf0563dd` through fork `main` to `dev/compat`. These are checked after publication.
