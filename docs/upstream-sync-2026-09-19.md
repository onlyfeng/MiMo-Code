# 2026-09-19 upstream synchronization

## Scope and immutable baselines

Full synchronization authorized by “同步 upstream 更新”. Branch-only, tag-preserving
fetch selected upstream `50cd713989f47225cfc717868b245e1de32b35b7`; prior review
`2bda17944b346ab85c8ee3cf0a0d4ab24819d37c`. Starting main:
`1435d83080210dd996f7d0292153ff78fee7f75a`; starting compat:
`94b8005cd336136da9c47c077a7faab643c3eb0a`.
The original compat checkout was clean. This operation created dedicated worktrees
on `sync/upstream-20260919` and `sync/upstream-20260919-compat`. Existing
model-preview and exec-argument worktrees remain outside its cleanup scope.

## Capability inventory (2)

| ID | Selected behavior / producers and consumers | main disposition | dev/compat disposition | Canonical owner / relationship / evidence |
| --- | --- | --- | --- | --- |
| C01 | `2bda1794..5b4ab220`: optional dirty-worktree reminder after user turns, explicit machine provenance, cancellation/deletion/disposal invalidation. `session/prompt.ts`, `session/prompt/uncommitted-hint.ts`, `session/session.ts`, `session/message-v2.ts`, `config/config.ts`, `inbox/*`, `project/instance.ts`, `cli/cmd/github.ts`, command SDK/OpenAPI and compose specification. | Adopt disabled-by-default policy and source transport; adapt follow-up writes to atomic latest-user admission and instance-owned execution without inherited run-approval scope. | Inherit shared behavior while retaining caps, MaxMode and authoritative model metadata. | main; FD-001/002/005/006/009, FC-001/007/008/009/011/013/015; DC-CONTEXT-001, DC-MODEL-001, DC-ACTOR-001/002, DC-TUI-001. Tests: `session/uncommitted-hint`, `session/prompt-effect`, `session/recovery-commit`, generated API contracts. |
| C02 | `5b4ab220..50cd7139`: main resume cascades eligible same-session subagents; honest failed terminal state and recoverability guidance. `session/prompt.ts`, resume route, `actor/registry.ts`, `actor/spawn.ts`, `tool/actor.txt`, diagnostic runner and Actor tests. | Adapt cascade to existing retained-context Actor recovery; preserve main HTTP atomic admission, generation ownership, task/model identity, quiet cancellation and terminal receipt handling. | Inherit shared cascade through existing full-context/variant owner; no broadening of eligibility. | main; FC-001/011 and FD-001/009; DC-ACTOR-001/002, DC-CONTEXT-001. Tests: `actor/subagent-resume-*`, `server/session-actor-recovery`, lifecycle/cancellation and run-state suites. |

The complete incoming delta consists of 23 files and belongs to these two rows.
All active FD/FC/DC entries were compared against the delta, including clean merges.
Network policies, platform fallbacks, MCP transport, tool routing and TUI editing
receive no independent behavior change. No owner is retired or promoted.

## Semantic reconciliation

- Main resume keeps `startResume` and returns HTTP 202 only after the existing
  atomic admission; failed admission never starts a cascade. The accepted epoch
  is captured before admission. Session Stop invalidates outstanding epochs and
  aborts in-flight child admission signals. A timed-out child admission is
  withdrawn, not reported successful. Child completion stays in Actor's supervisor.
- Cascade excludes main, peers, running/pending rows, cancelled actors and actors
  without retained current-instance context. Only the existing persistent,
  full-context Actor recovery contract can admit a child. Upstream's registry-only
  ephemeral fixture is not an authorization source. Existing terminal handling
  already reports persisted assistant errors as failures and preserves partial
  delivery; no parallel terminal publisher is added.
- Hint workers use the service scope, clear run approval, retain task and actual
  model variant, label their persisted message `source: hook`, and atomically
  commit message plus parts only while the source user and cancellation token
  remain current. Instance cleanup retains the fork's context-identity checks.
- Machine provenance is a union with hook provenance. Hook-only consumers narrow
  the union. Command source/provenance, config types and OpenAPI are regenerated
  from the resolved implementation; compat generation is checked independently.
- Incoming cascade coverage is adapted to a shared real Actor fixture with frozen
  context. The diagnostic runner invokes that matrix rather than pretending that
  registry-only rows satisfy fork recovery admission. Historical upstream receipts
  in the compose specification are upstream evidence, not local acceptance.

## Validation and publication

Main runtime integration: `7199810d`; final shared source/tests/CI snapshot:
`6af6931fd6ee73999847d81809bd2476e419885d`. Compat integration: `ff809d63`;
final inherited source/tests/CI snapshot: `b1aaec311837fa74af6526ea9137b6bac08d5967`.
Later registry commits change documentation only.

Both branches installed locked dependencies with `bun ci`; neither lockfile
changed. Tests run from `packages/opencode` with ambient `MIMOCODE_EXPERIMENTAL`,
`MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, and `MIMOCODE_CODEX_MODE` removed.
Prompt matrices additionally remove `MIMOCODE_COMPACTION_MAX_CONTEXT`,
`MIMOCODE_COMPACTION_TRIGGER_RATIO`, and `MIMOCODE_DISABLE_CHECKPOINT`.
The package preload retains orchestrator=true, in-memory SQLite, fixture config
and disabled default plugins; this preload is not evidence of default-off flags.
A separate non-test process confirmed the absent uncommitted-hint configuration
resolves disabled. Hint tests explicitly enable only their configuration key.

| Matrix / command suffix (`bun test … --timeout 120000`) | main | dev/compat | Evidence scope |
| --- | --- | --- | --- |
| `test/server/session-actor-recovery.test.ts test/actor/subagent-resume-{cascade,negatives,route.integration}.test.ts` | 24 pass, 0 fail | 25 pass, 0 fail | Dedicated real AppRuntime process; JUnit verified every file and case. Compat retains the appended frozen turn-context case. |
| `test/session/{prompt-effect,uncommitted-hint,recovery-commit,run-approval}.test.ts` | 213 pass, 2 skip, 0 fail before the one-test settlement correction | 244 pass, 2 skip, 1 superseded timing assertion; corrected case passes below | Existing skip cases retained. Full-source prompt, atomic receipt, schema/provenance, caps/MaxMode, permission and cancellation contracts. |
| `test/session/prompt-effect.test.ts -t 'dirty USER turn produces'` | 1 pass, 156 filtered, 0 fail | 1 pass, 187 filtered, 0 fail | Final corrected settlement assertion; original user result and actual hint completion/idle are observed. |
| `test/actor/registry.test.ts -t 'settles running'` | 1 pass, 29 filtered, 0 fail | shared implementation inherited | Qualified retained-context recoverability guidance. |
| `test/server/openapi-refs.test.ts test/cron/end-to-end.test.ts test/session/{cron-bridge,keepalive}.integration.test.ts` | 16 pass, 0 fail | shared source and independently generated API inherited | API references and internal scheduling mocks/contracts. |
| `test/tool/actor.test.ts test/actor/spawn.test.ts test/inbox/drain-seed-variant.test.ts -t variant` | not a main contract | 13 pass, 114 filtered, 0 fail | Explicit variant and configured-agent variant precedence plus persisted inbox seed. |
| `test/cli/tui/{model-preview,model-metadata}.test.tsx test/cli/tui/model.test.ts` | not a main contract | 20 pass, 0 fail | Authoritative preview, stale replies, rendering and request metadata. |
| Package `bun typecheck`; root `bun lint` | exit 0; 0 lint errors | exit 0; 0 lint errors | Existing lint warnings remain. SDK build and isolated OpenAPI generation ran separately on both branches; compat regeneration matched its merged outputs. |

A combined Actor/unit invocation recorded 92 passes and 8 missing-prefix-captor
failures: focused unit layers had disposed the global reference required by the
real AppRuntime. The 89 ordinary registry/lifecycle/cancellation/runner cases
passed; three recovery cases also passed before that disposal. All recovery cases
were then validated together in the dedicated matrix above. CI now assigns all
four recovery files to that job, requires discovery of all four, and checks their
JUnit coverage; no test is removed from CI.

The original upstream hint test assumed that a 2.5-second delay implied idle.
Compat under concurrent local load observed the hint's legitimate busy follow-up.
The shared correction waits up to ten seconds for the actual scripted follow-up
and idle, retaining content/variant assertions and proving the original caller
returned its own result. Both branches pass the corrected case. Other passing
cases in the full matrix remain bounded evidence for their unchanged code.

Logs use the operation prefix `mimocode-sync-20260919-`; they record subprocess
boundaries rather than summing parallel durations as wall-clock time.

Final push-SHA `test`, `typecheck`, `lint`, live remote-tip equality and ancestry
are verified after the registry commits. This record describes local source
acceptance; final CI URLs and remote proofs are reported on publication.
