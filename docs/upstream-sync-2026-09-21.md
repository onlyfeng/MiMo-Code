# 2026-09-21 upstream synchronization

## Scope and immutable baselines

Full synchronization authorized by “同步 upstream 更新”, through branch-only,
tag-preserving fetch. Reviewed upstream range:
`50cd713989f47225cfc717868b245e1de32b35b7..479201262a0f08e6abe9c29022d2fb38b63e29b0`.
Starting main: `b40391abfd0624894a966ff39a39285152e5f439`;
starting compat: `1d5237f121854d65c4ca6d3bcd7e83312d5a7a8b`.
The delta comprises 21 commits and 145 upstream paths. The initial checkout was
clean. This operation owns only `sync/upstream-20260921` and
`sync/upstream-20260921-compat` and their matching dedicated worktrees.
The existing model-preview and exec-argument worktrees remain outside cleanup scope.

## Capability inventory (11)

All rows use the immutable upstream range above. Their canonical owner is shared
`main`; compat inherits them through its existing DC boundaries. All active
FD/FC/DC owners were checked, including clean merges and no-overlap capabilities.
Final source and publication snapshots are recorded separately below.

| ID | Selected behavior and decisive producers / consumers | main disposition | dev/compat disposition | Ownership, relationship and validation |
| --- | --- | --- | --- | --- |
| C01 | Default prompt cleanup, lowercase actual tool names, general-subagent skill rules and brand identity guard. Agent/session/tool prompts, checkpoint renderers, memory instructions, workflow guidance. | Adopt concise shared guidance; retain task lifecycle, spawn/run distinction, fixed cwd and authoritative checkpoint ownership. | Inherited; preserve full-context and model metadata guidance. | FC-002/011, FD-002/005; complementary guidance. Agent/system/LLM/checkpoint description tests. |
| C02 | Runner pending work, stale execution reclamation and exact ownership. `effect/runner.ts`, `session/run-state.ts`, async prompt/inbox callers. | Adapt to fork atomic start and generation leases; retain progress-aware inbox follower semantics. | Inherited with the same shared contract. | FC-001/008/009; overlapping lifecycle contracts. Runner/stale-reclaim/tuple-key/prompt tests. |
| C03 | Bounded host MCP connections, generation-owned connect/add/store/auth admission. `mcp/{host,index,managed-client,sampling}.ts`, Node embedder export. | Adopt host generations while retaining URL validation, sampling approval isolation and imported/native manual-connect policy; host removal cannot auto-connect a pending user entry. | Inherited; retain RFC1918 admission guarantee. | FC-004, FD-001, DC-NET-002; partial overlap. Host/admission/lifecycle/OAuth/sampling tests, including two pending fallback regressions. |
| C04 | MCP running presentation and bounded exception persistence. `mcp/tool-progress.ts`, prompt wrapper, processor completion, nested exec. | Adopt progress and truncation; merge terminal MCP fields without losing progress metadata and forward nested callbacks. | Inherited with the same shared contract. | FC-004/009, FD-006; complementary metadata with merge adaptation. Direct/exec real-wrapper progress tests and full exec suite. |
| C05 | Metadata-only abandoned Actor startup recovery and execution-owned question/orphan settlement before idle. Actor registry, bootstrap, selected-session prompt finalizers, status idle hook. | Adopt metadata-only startup with no transcript scan; repair questions only in the selected execution, retain owned-message snapshots, conditional retained-context recovery guidance and generation boundaries. | Inherited with the same shared contract. | FC-001/008/009, FD-009; complementary cleanup. Registry, bootstrap, orphan-tool, cancellation tests. |
| C06 | Exclusive trailing-user resume, unified recovery dispatch, completed-tool continuation and terminal-answer protection. Prompt/session transaction, HTTP recovery routes, TUI recover flow and generated API. | Adopt main-user recovery through the existing immediate transaction; retain constrained frozen Actor assistant recovery, task binding and no side-effect replay. | Inherited; preserve bounded request preflight, frozen context, variants and title locale. | FC-001/009, FD-009, DC-CONTEXT-001/DC-ACTOR-001/002/DC-TUI-001; adapted contract. Recovery-commit, HTTP, retained Actor, processor and TUI tests. |
| C07 | Default `.mimocode` + `.agents` skill roots, explicit brand-root opt-in and dotted-directory exclusion. Skill scanner, flags, config guidance and isolation consumers. | Adopt root policy; retain frozen authorized catalog and permission parity. | Inherited with the same shared contract. | FC-005/011; complementary discovery policy. External-root/discovery/permission tests and isolated non-test flag check. |
| C08 | Bounded UnknownError retries, original error identity and persisted timeout classification. Retry policy and MessageV2 error conversion. | Adopt classification and bounded fallback; request/candidate/judge scope budgets still take precedence over persistent live-step network policy; local ModelError contracts remain terminal before message classification. | Inherited; retain per-agent MaxMode and main-only retry status. | FC-013/009, FD-005/011, DC-MODEL-001; adapted budget semantics. Retry/error/classify and MaxMode contract tests. |
| C09 | Disable tool-directory and home-hook auto-loading; remove bundled evolve and stale extracted copies. Tool registry, plugin init, bundle extraction, TUI tips and docs. | Adopt retirement; preserve explicit plugin tools, configured hooks and existing permission gates. | Inherited with the same shared contract. | FC-005/006/011; adopted retirement, no unrelated owner retirement. Registry/file-hook/bundle tests. |
| C10 | Compose worktree base selection and short delivery commit ranges. Bundled compose-next skill. | Adopt upstream guidance. | Inherited with the same shared contract. | FC-011; no runtime overlap or new API. Bundled content review. |
| C11 | Per-step FIFO model tool admission, concurrent read/grep/glob, barriers for mutation, cancellation-safe release. `tool/gate.ts`, prompt native/MCP dispatch. | Adopt outer gate with existing request authority and nested exec composition; independent sessions/actors retain independent gates. | Inherited with the same shared contract. | FD-006, FC-001/009; complementary scheduling. Gate unit/cancel/hook/orchestration and exec tests. |

## Semantic decisions

- Trailing-user admission validates the actual latest user and optional task in
  the same transaction. Rejected, stale, busy or withdrawn admission cannot
  settle messages, claim a task or start a model call. Public Actor recovery
  remains assistant-only through retained frozen context; explicit Actor
  `userMessageID` is rejected. The convenience background entry delegates to
  atomic `startResume`; it is not a second detached admission implementation.
- Ordinary runner callers gain pending lost-wake protection. An inbox follower
  that only observes current work retains its progress-aware handoff: failure
  before durable drain does not implicitly replay or consume its queued row.
- MCP host refresh restores user configuration with its original auto-connect
  policy. Same-named host entries do not inherit Claude import provenance.
  Presentation metadata remains client-only. Terminal result fields merge into
  progress fields; direct and nested execution use the same actual wrapper.
- The final upstream increment removes startup transcript scanning. Historical
  question repair stays in selected-session execution; recovery GET is read-only.
  Its removed registry-to-message import also removes the initialization failure
  seen at the intermediate upstream snapshot. Original static tool authority
  controls are retained; all 130 exec/search/GPT/registry tests pass.
- Cancellation separates signal acknowledgement from completed cleanup: ordinary
  cancel joins its fiber, while instance disposal can release a signalled old
  generation without blocking. Old monitors cannot idle a successor. Orphan
  cleanup captures its original disposal scope and cannot mutate a new instance;
  a real persisted-tool regression failed with both disposal guards removed.
- CI adopts four separate MCP mock processes while retaining all `.test.tsx`
  discovery, stable path-hash assignment, enabled worktree tests, four real Actor
  recovery files, strict fresh JUnit coverage, and Windows acceptance. Independent
  audit accounted for 622 files: 613 ordinary shard inputs, 4 MCP mocks, 1 stdio
  observer and 4 Actor recovery files, with no duplicate or missing assignment.
  The three zero-case inputs remain loaded; they are excluded only from expected
  suites. Verifier probes reject missing, duplicate and all-skipped reports.

## Validation and source snapshots

Main acceptance, with package cwd `packages/opencode` and the environment below:

| Scope | Actual result and evidence boundary |
| --- | --- |
| Complete prompt-effect | 182 pass, 2 existing skips, 0 fail; 184 tests / 1047 assertions; exit 0. |
| Session/recovery 16-file matrix | 202 pass, 2 existing skips, 0 fail; exit 0. Final cancellation adjustment additionally passes all 51 Runner and 16 instance-disposal tests. |
| Real retained Actor HTTP recovery, four separate files | 24 pass / 241 assertions; exit 0; compat reruns this boundary. |
| MCP focused processes | 192 pass across host/admission, imported-server fallback, lifecycle, headers, OAuth, stdio, sampling and real-wrapper presentation. Mock suites run separately. |
| Guidance/skill/tool matrix | Initial 288 pass and one timing-fixture failure. The occupied-slot fixture now uses an explicit completion barrier; complete exec rerun 99 pass. |
| Final static exec/search/GPT/registry | 130 pass / 534 assertions; exit 0 after the startup-scan removal. |
| Other inherited contracts | Recovery/task/prefix/agent/MaxMode seven-file set 53 pass. API+LLM corrections 21 pass; request timeout retains the scope-specific budget. |

Main runtime/tests: `6bbef7997c6f067558fb89100e17742e732720ca`;
bundled guidance: `d19ea19f02ac4a4e9d0c0ff760c1da5a4a6ac7b8`. The final startup/registry/orphan matrix passes
50 tests / 156 assertions (exit 0). Package `bun typecheck` passes; root
`bun lint` exits 0 with 4745 warnings and zero errors. The clean upstream merge
renamed a test fixture; both retained idle-admission callers were migrated and
the entire three-file matrix rerun. SDK and OpenAPI were regenerated from the
resolved main routes; this last metadata-only increment changes no schema.

Compat runtime/tests: `96c64b4854b97365e3ae8358a51f4024ff296f1e`.

Compat acceptance:

- The 39 production overlay paths remain exactly the same set. Shared MCP files
  are byte-identical; full-context/variant Actor creation, bounded preflight,
  per-agent MaxMode, server-authoritative TUI metadata, private-network admission
  and platform policies retain their DC owners.
- Real retained Actor recovery: 25 tests across four files pass.
  Focused prompt preflight/frozen-context/MCP cases: 27 pass. Checkpoint/history
  contracts: 19 pass in three files.
- MCP/DC-NET: 76 pass, 0 fail across eight isolated command groups, including
  sampling, pending fallback and a real SDK/OAuth transport; both RFC1918
  sentinels pass. All ten MCP source files match main byte-for-byte.
- Root affected matrix: 173 pass and four gate integration failures. Persisted
  ModelError with zero tool parts proved the 32K test model was rejected by
  compat's existing bounded preflight. Three incoming test fixtures now use
  128K context; all four gate integration tests pass without production changes.
- Compat SDK/OpenAPI regenerate with no drift, retaining compat operations and
  gaining the shared recovery union. OpenAPI generation writes to a real file;
  the initial piped-output process stalled and was stopped before the successful
  exit-0 generation.
- The final 13-file Actor/variant/overflow/prefix/MaxMode/cap matrix passes
  337 tests / 1425 assertions (exit 0). Package typecheck passes; root lint
  exits 0 with 4806 warnings and zero errors. Publication checks bind both
  final tips, including these documentation commits.

Both worktrees use locked `bun ci`. Initial attempts stalled in Electron's
binary-download postinstall; the operation stopped only those owned installers
and reran with `ELECTRON_SKIP_BINARY_DOWNLOAD=1`. Both completed with unchanged
lockfiles. Desktop binary delivery is outside this TUI/core synchronization.
Default-path tests remove ambient `MIMOCODE_EXPERIMENTAL`,
`MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE`,
`MIMOCODE_COMPACTION_MAX_CONTEXT`, `MIMOCODE_COMPACTION_TRIGGER_RATIO`, and
`MIMOCODE_DISABLE_CHECKPOINT`. Package preload retains its orchestrator opt-in,
in-memory SQLite, fixture configuration and disabled default plugins.
An isolated non-test process verified `.agents` on, all three brand roots off,
and orchestrator off with their selectors absent; this does not rely on preload.

Logs use the operation prefix `mimocode-sync-20260921`. Initial failing snapshots
and their corrections are retained separately from passing final checks.
One actual MCP/OAuth subprocess hit its existing 30-second watchdog; diagnostic
execution and an unchanged original-test rerun completed. Its first timeout is
not proven to be a platform defect or flake. Final exact-SHA CI remains required.

Final push-SHA workflow URLs, remote-tip equality, ancestry and cleanup are
checked after the registry commits and reported on publication. Local source
acceptance does not establish that an installed client was upgraded.


## Final-CI follow-up — 2026-09-22

The initial published snapshots `840a5810` and `1082c39d` passed lint,
typecheck, Actor/MCP/stdio isolation, shard 1 and shard 3; compat also passed
Windows. Both test workflows failed only on four cases in shards 2 and 4:
[main run](https://github.com/onlyfeng/MiMo-Code/actions/runs/35622687337) and
[compat run](https://github.com/onlyfeng/MiMo-Code/actions/runs/35622785765).
They are failed historical runs, not final acceptance.

- Three fixture files still assumed retired tool-directory loading.
  `control-origin`, `registry-invocation-style` and `whitelist` now use explicit
  plugin registration, retaining every previous authority and visibility
  assertion. Whitelist also asserts the custom tool actually registered; this
  assertion failed against its former fixture, exposing an otherwise empty
  negative test. All three full files pass (20 tests / 126 assertions). The
  five-second local default was insufficient for one unchanged whitelist case;
  the explicit 30-second local run passed, below CI's existing 120-second budget.
- Bounded UnknownError retries exposed a real FD-011 regression: a forbidden
  summary tool call could be retried on the same summary message and then
  accepted. Both processor guards now throw the existing ModelError, conversion
  preserves that identity, and retry classification makes it terminal before
  network/rate-limit keyword matching. Valid tool names such as `ETIMEDOUT`
  cannot turn that local contract failure into a network retry. Normal unknown
  and provider-network retries remain unchanged.
- Two processor event regressions require stop and one stream attempt; the
  integration test requires the rejected summary's original boundary to roll
  back and no tool part to be written. It permits the existing outer loop to
  create a separate new compaction attempt. Frozen-prefix tests retain literal
  `tool_choice: none` coverage. Final main matrix: 204 pass, two existing skips,
  zero failures / 1229 assertions across six files. Typecheck and lint pass;
  an independent review also reproduced both processor branches and the
  keyword classification boundary. Ten think-only/content-filter/empty-summary
  fallback tests passed on the earlier guard snapshot and are not relabelled
  as final-source validation.

Current main runtime/tests: `3e1fe1607a5ec87fa2f919493b77078d44c60330`.
Bundled guidance remains at its previously recorded snapshot. No public schema
changed, so existing independently regenerated SDK/OpenAPI remain valid.
Compat follow-up runtime/tests: `43ea9dc20fe6ce8e36198aa3d452a56bed51e019`.
The combined nine-file matrix passes 242 tests, two existing skips, zero failures
and 1418 assertions (exit 0). Package typecheck and root lint exit 0, with the
same 4806 warnings and no errors. The merge is conflict-free and changes no
compat production overlay; all previous DC boundaries remain. Both new final
commit SHAs require fresh CI.
