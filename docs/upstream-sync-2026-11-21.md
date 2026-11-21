# Upstream synchronization on 2026-11-21

## Scope

Local integration of upstream `128adcb782a72ef3d10752ab9c14e4fdcb319099` into
fork `main`, starting from the previous review at
`75e1ed0b3b6561796bdfeb36edcf091f9793f24d`. The starting fork `main` tip was
`4b5dbb976b763f420ac6d34ea0284dda26362cf4`. Upstream added one commit in this
range. A dedicated worktree on branch `sync/upstream-128adcb7-main` housed the
merge; `dev/compat` and its checkout were not touched. `bun.lock`, the SDK and
`packages/cli/migration/` are byte-identical to the starting fork.

The runtime tip is `a99333128562389148af961df0ad70e4566b699b`: the merge of
upstream, the fallback correction for ambiguous schema-3 positions, and three
review fixes: two keep the structured-output instruction out of frozen
prefixes, new and historical, and one anchors catalog delta replay on an
entry. The `dev/compat` propagation is recorded in the same file on that
branch.

## Capability inventory and results (1)

| ID | Selected behavior | Main result | Decisive paths and tests |
| --- | --- | --- | --- |
| C01 | `128adcb7` makes skill discovery a snapshot refreshed at its triggers (user-turn boundary, command list/get, `GET /skill`, tool name miss) with a `(path, mtime, size)` parse cache, and moves the catalog out of the system prompt into persisted user-turn reminders: one full entry per context window, then deltas of added, changed and removed skills keyed by a `{name, description, location}` fingerprint. Slash commands list live skills without waiting for MCP servers. | Adopted with the fork's FC-005 authorization, cancellation and history-compatibility boundaries. The fork's schema-3 system-tail freezing is retired as the catalog mechanism; its stored rows remain readable and are retired once on read. FC-002, FC-015, FD-002, FD-005, FD-009 and FD-010/011/012 keep their contracts. | `skill/index.ts`, `session/skill-catalog.ts`, `session/skill-reminder.ts`, `session/prompt.ts`, `session/system.ts`, `session/prefix-snapshot.ts`, `session/message-v2.ts`, `session/compaction.ts`, `command/index.ts`, `tool/skill.ts`, `tool/skill-search.ts`. Tests below. |

### Retained fork behavior

- **FC-005 authorization.** `SystemPrompt.skillCatalog` takes the same
  `canLoadSkills`/`canSearchSkills` gate as the tools, over effective
  `Agent.runtimePermission`, the agent tool allowlist and the owning user
  message's tool toggles. Upstream gated the catalog on `permission.skill`
  alone and dropped the per-call gate in both tools. The rescan-on-miss added
  by upstream runs inside those gates and re-reads the authorized set, so it
  cannot widen visibility.
- **Cancellation safety.** Builtin bundle extraction stays a producer forked
  into the layer scope, so a cancelled caller cannot turn a partial extraction
  into the process-wide answer; failure and interruption retire the generation
  so the next caller retries. Upstream's `Effect.onInterrupt` invalidation is
  not equivalent: it leaves a failed extraction cached for the process. Live
  directory scans keep upstream's ticketed single-flight.
- **Historical data.** The shipped
  `20260908000000_session_prefix_skill_catalog` migration is unchanged.
  `SessionPrefixSnapshot.getFrozen` removes a historical catalog once: a
  schema-3 row whose content version verifies loses exactly its recorded
  managed range, the catalog together with its format prefix (the engine's
  structured-output instruction, which the request now appends only in JSON
  mode); a row without a
  usable record falls back to the block pattern with host-supplied occurrences
  preserved. If a schema-3 position is ambiguous or stale, strict generated
  block-pattern removal is the fallback; host-supplied matching blocks remain.
  In history, generated v2 snapshots and recognized metadata-free legacy catalogs
  are suppressed by the fork's strict recognizer rather than upstream's
  marker-substring test, so user quotations and loaded `<skill_content>`
  bodies still reach the model. Stored messages are never rewritten.
- **Request-local structured output.** The structured-output instruction is
  appended per request and never contributes to a pinned prefix, in both
  directions: a session that switches to JSON mode after its prefix was frozen
  still receives it, and a prefix captured cold while already in JSON mode does
  not carry it, so a later plain-text request on that prefix stops demanding
  the then-unregistered `StructuredOutput` tool. The snapshot row stays
  byte-stable across those transitions. Upstream computes system additions only
  when no frozen prefix exists, which loses the instruction for a warm session
  and freezes it for a cold structured one.

### Retired fork behavior

- Catalog generation and freezing: `captureSkillCatalog`, `newSkillCatalogSlot`,
  `bindSkillCatalog`, `refreshFrozenSkillCatalog`, `selectSkillCatalog`, the
  `skillCatalogInSystem` projection option and the per-turn
  catalog/`turnID`/`formatPrefix` re-pinning. New prefixes record no catalog.
  Basis: the catalog is no longer system-prompt content, so a frozen managed
  range has nothing to own, and keeping it would announce the catalog twice.
  The reader-side types and helpers stay for stored rows.
- `SystemPrompt.skills` (returning catalog text) is replaced by
  `skillCatalog` plus `refreshSkills`.

## Local validation

Windows, Bun 1.3.14 from the lockfile, pinned at
`~/.cache/mimocode-build/bun-v1.3.14/bun-windows-x64`; dependencies installed
with `bun ci`. `packages/cli` `bun run typecheck` passes. Root `bun run lint`
reports 3,730 warnings and 0 errors.

Each file ran in its own process with every ambient `MIMOCODE_*` variable
cleared, so `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH` and
`MIMOCODE_CODEX_MODE` were unset. The package preload supplies the harness
baseline (isolated HOME/USERPROFILE/XDG, `MIMOCODE_TEST_TMPDIR_ROOT`,
`MIMOCODE_TEST_OUTSIDE_GIT_ROOT`, `MIMOCODE_TEST_MANAGED_CONFIG_DIR`,
`MIMOCODE_MODELS_PATH`, `MIMOCODE_DISABLE_DEFAULT_PLUGINS=true`,
`MIMOCODE_DB=:memory:`). Suites that exercise session loops used
`--timeout 120000`; the 5-second default times out several real-provider
fixtures on this machine regardless of this change.

Catalog and skill surface, all passing:

| File | Result |
| --- | --- |
| `test/skill/skill.test.ts` | 20 pass |
| `test/skill/builtin.test.ts` | 5 pass |
| `test/skill/bundle-discovery.test.ts` | 1 pass |
| `test/skill/discovery.test.ts` | 6 pass |
| `test/skill/loop.test.ts` | 2 pass |
| `test/skill/mimocode-docs.test.ts` | 9 pass |
| `test/skill/search.test.ts` | 11 pass |
| `test/skill/skill-description.test.ts` | 10 pass |
| `test/skill/skill-external-roots.test.ts` | 7 pass |
| `test/tool/skill.test.ts` | 5 pass |
| `test/tool/skill-search.test.ts` | 6 pass |
| `test/session/skill-catalog.test.ts` | 38 pass |
| `test/session/skill-catalog-capture.test.ts` | 3 pass |
| `test/session/skill-catalog-frozen-refresh.test.ts` | 2 pass |
| `test/session/skill-catalog-reopen.test.ts` | 1 pass |
| `test/session/skill-catalog-system-tail.test.ts` | 4 pass |
| `test/session/prompt-skill-command-multi.test.ts` | 12 pass |
| `test/session/system.test.ts` | 12 pass |
| `test/session/prefix-snapshot.test.ts` | 7 pass |
| `test/session/llm-request-prefix.test.ts` | 16 pass |
| `test/storage/prefix-skill-catalog-migration.test.ts` | 1 pass |
| `test/command/command-live.test.ts` | 1 pass |
| `test/command/deep-research-command.test.ts` | 2 pass |
| `test/command/loops.test.ts` | 2 pass |
| `test/command/rebuild.test.ts` | 2 pass |
| `test/installation/no-instance.test.ts` | 2 pass |

Structured output, all passing: `structured-output` 25,
`structured-output-integration` 1, `structured-output-retry` 3,
`turn-queue-admission` 20.

Compaction and checkpoint, all passing: `compaction-agent-scope` 3,
`compaction-projection` 11, `compaction-reasoning-fallback` 10,
`compaction-tool-choice` 1, `checkpoint-align` 7, `checkpoint-boundary` 11,
`checkpoint-child-session` 11, `checkpoint-context` 8, `checkpoint-drain` 4,
`checkpoint-extract-titles` 5, `checkpoint-fork-mode` 20,
`checkpoint-main-slice` 1, `checkpoint-memory-write` 6, `checkpoint-paths` 6,
`checkpoint-permission` 4, `checkpoint-progress-reconcile` 23,
`checkpoint-rebuild-fallback-decision` 2, `checkpoint-rebuild-nonblocking` 2,
`checkpoint-rebuild-unify` 4, `checkpoint-rebuild-v3` 11,
`checkpoint-render-verify` 10, `checkpoint-retry` 14,
`checkpoint-splitover-integration` 4, `checkpoint-templates` 7,
`checkpoint-thresholds` 22, `checkpoint-validator` 22,
`checkpoint-watermark-transactional` 2, `checkpoint-writer-rebuild-tail` 2,
`checkpoint-writer-runaway` 6, `checkpoint-writer-wait-timeout` 8.

### Pre-existing failures

- `test/session/message-v2.test.ts`: 66 pass, 1 fail — "local binary and
  structured text references become paths instead of uploads". Reproduced at
  `origin/main` (`4b5dbb97`) in a separate temporary worktree with the same
  command, where the file reports 65 pass, 1 fail. This is the known Windows
  fixture class recorded in
  [the 2026-11-19 record](upstream-sync-2026-11-19.md): the fixture asserts a
  POSIX file URL for a path on another volume.
- `test/installation/no-instance.test.ts` and
  `test/session/checkpoint-splitover-integration.test.ts` failed only in the
  first sweep under the 5-second default timeout and pass on this change with
  `--timeout 120000`; the baseline behaves identically.
- `test/session/prompt-effect.test.ts`: 210 pass, 4 fail on this change;
  `origin/main` reports 208 pass, 4 fail with the same four names (the two
  extra passes are upstream's new compaction catalog test and the fork's
  overflow-replay delta test). The four are "uses the
  frozen system and appends the compaction prompt to the existing conversation
  with auto", "frozen hidden tools execute matching schemas through exec and
  direct dispatch", "frozen hidden tools reject changed schemas through exec
  and direct dispatch" and "the session environment reminder rides once on the
  window's first user message, outside the system prompt". These are the
  harness and Windows fixture cases described in
  [the 2026-11-19 record](upstream-sync-2026-11-19.md).
- `test/session/codex-compact.test.ts`: 2 pass, 8 fail, identical names on
  this change and at `origin/main`. The eight are the explicit-Codex harness
  cases ("request-pinned actor" status/tool denial/permission denial,
  "production wire retains control tools", the two "hidden direct MCP" cases,
  "nested bash approval" and "nested view_image"). The ninth case, "warm
  snapshots follow structured schema and text format changes", passes on both.
- `test/actor/spawn.test.ts`: 77 pass, 3 fail, identical names at
  `origin/main`: "exposes GPT orchestration and read tools to read-only GPT
  subagents in explicit Codex mode", "a subagent's own window carries the
  session environment reminder but not memory paths" and "resume preserves
  the interrupted persistent actor user and frozen context".
- `test/workflow/runtime.test.ts`: 28 pass, 1 fail, identical name at
  `origin/main`: "settles without terminal notifications after its parent
  generation reloads".

Baseline worktrees used for these reproductions were created from
`origin/main`, installed with `bun ci`, and removed afterwards. A first install
can produce an incomplete dependency tree (`drizzle-orm`,
`@jridgewell/gen-mapping`) whose module-resolution errors are not
reproductions; the recorded results come from a clean reinstall.

## Review follow-up

The automated review on the pull request reported one finding against
`71cf0272` and one against `06bf5a2c`, both in fork code. Both were confirmed
and fixed:

- **Structured-output instruction frozen by a cold capture.** The instruction
  was still part of `currentAdditions`, which supplies the system tail only
  when no prefix is frozen. `LLM.buildSystemArray` collapses that tail into one
  string and `SessionPrefixSnapshot.pin` stores it, so a session whose first
  request used `json_schema` kept telling the model to call `StructuredOutput`
  on later plain-text requests, after the tool was gone. The request-local
  guard compared whole array elements, so it never found the embedded copy and
  that first request carried the instruction twice. The instruction now never
  enters `currentAdditions`, and the guard tests substrings.
  `codex-compact.test.ts` "warm snapshots follow structured schema and text
  format changes" already asserted this and failed on `71cf0272` while passing
  at `origin/main`; it passes again. A default-harness regression case in
  `skill-catalog-frozen-refresh.test.ts` covers the cold JSON capture, the
  single wire copy and the switch back to text; reverting the source fix makes
  it fail. Fixed in `b922a551`.
- **Structured-output instruction kept by schema-3 retirement.** A schema-3
  row's managed range was its format prefix followed by the catalog, and that
  prefix was only ever the engine's structured-output instruction. The retired
  re-pinning code cleared it when a session returned to text mode. Retirement
  on read removed the catalog but kept the prefix, then persisted the system
  and cleared the record, so a session pinned in JSON mode kept demanding
  `StructuredOutput` on every later plain-text request. The whole managed range
  now goes, and the request appends the instruction whenever it is in JSON
  mode. The schema-3 cases in `skill-catalog.test.ts`, `prefix-snapshot.test.ts`
  and `prompt-skill-command-multi.test.ts` previously asserted that the prefix
  stays. They now assert that it is removed and that the retired row equals
  the pre-catalog bytes, and each fails when the old behavior is restored.
  Fixed in `cac9eecd`.

A third finding, against `9fc21241`, concerns behavior adopted unchanged from
upstream. It was confirmed and fixed as a fork deviation:

- **Catalog delta trusted without its entry after overflow replay.**
  Overflow compaction replays the latest user turn past the boundary with its
  parts and metadata, leaving the earlier entry behind. A delta's metadata
  records the whole resulting catalog state, but its text lists only the
  changed and removed skills. The window therefore believed every skill was
  announced, reported no change on later turns, and unchanged skills stayed
  invisible to the model. `announcedSkillCatalog` now accepts a delta only on
  top of an entry in the same window, so this case announces a full entry
  again. `skill-catalog.test.ts` covers the rule. `prompt-effect.test.ts`
  ("re-announces a full skill catalog when overflow replay carries only a
  delta") reproduces the compaction path end to end. Both fail when the old
  rule is restored. The upstream spec `docs/compose/spec/skill-catalog-live.md`
  is kept verbatim; FC-005 records the deviation.

After these fixes, `packages/cli` typecheck passes and root lint reports 0
errors.

## Publication and CI

Branch `sync/upstream-128adcb7-main` is pushed to `onlyfeng/MiMo-Code` and
proposed as pull request #263 against `main`.

CI is not verified and cannot be. GitHub Actions is disabled for
`onlyfeng/MiMo-Code`: the pull request reports no checks, and dispatching
`test.yml`, `lint.yml` and `typecheck.yml` each returns
`HTTP 422: Actions has been disabled for this repository`. There are therefore
no exact-SHA CI runs for these commits, and the only evidence is the local
validation above. The same refusal was recorded for the previous
synchronization.

Propagation into `dev/compat` is prepared locally on
`sync/upstream-128adcb7-compat` and is not pushed. It must be re-merged from
`main` after this pull request lands, because the compat branch predates the
`main` commits above.
