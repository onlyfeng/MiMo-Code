# Upstream sync 2026-10-28

## Scope and baselines

Full live sync authorized by `同步 upstream 更新`, upstream/main -> main -> dev/compat.
Selected upstream: `245460431c30815f894ba8318bcc98b581938a57`.
Prior upstream: `d85f355317f1471bf68b5c5a96ab517585e9fdfa`.
Starting main: `8ff244c76ff0035905ffd491882ef2750a3f081b`.
Starting compat: `e52c587f5221b05502288a2ab68555a714b5d458`.
Branch-only fetches preserve tags. Original workspace is on compat with untracked `.omo/`, preserved.
Operation resources: dedicated Git worktrees on `sync/upstream-20261028` and `sync/upstream-20261028-compat`; logs outside checkouts.

## Capability inventory (N=1)

Every row audits d85f3553..24546043, one upstream commit and eight paths.
No FD/FC/DC owner retires or moves.

| ID | Selected behavior and producers/tests | Main counterpart, relationship and drift | Compat counterpart | Owners and disposition | Evidence |
| --- | --- | --- | --- | --- | --- |
| C01 | Config-driven always-direct MCP tools: config/mcp.ts Local/Remote alwaysDirectTools; tool/mcp-tool-search.ts key flattening; session/prompt.ts catalog, active set and execution; incoming unit and prompt-effect wire tests; three Compose specs. | Adopt new optional config and direct exposure; exclude tools from deferred catalog/dispatch while retaining exec guest access. Resolve direct-call rejection conflict by adding !alwaysDirect beside existing GPT and legacy-frozen exceptions. Current authorization, frozen membership/schema, hooks and permissions remain authoritative. Regenerate SDK from resolved schema. | Inherit shared behavior; retain all eleven DC owners including full-context authority, request caps, provider routing and private MCP transport. | main owns C01; FD-005/FD-006 harness and authority, FD-009 frozen capture, FC-004 config/lifecycle, FC-002 prefix, adjacent DC-ACTOR-001/DC-CONTEXT-001/DC-NET-002. | Both branches pass incoming always-direct wire tests, authorization/frozen regressions, config/host/prefix/exec matrix and CLI typecheck; exact-SHA CI is tracked below. |

## Validation and publication

Runtime/test snapshots: main `f001dd2be038a3b66ae25ef431c6c594075ced7e`; compat `5cee6fc9bcc8710df59ac4187c854e02afa20b09`. Both use Bun 1.3.14 and `bun ci`; lockfile unchanged. Default commands remove ambient MIMOCODE_EXPERIMENTAL, MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL, MIMOCODE_MCP_TOOL_SEARCH and MIMOCODE_CODEX_MODE; package preload retains isolated HOME/XDG, in-memory DB and disabled default plugins, with no experimental selector.


| Branch | Owning cwd and check | Result |
| --- | --- | --- |
| main | CLI `bun run typecheck`; root `bun run lint` | Both exit 0; lint 3,675 warnings, zero errors. |
| compat | CLI `bun run typecheck`; root `bun run lint` | Both exit 0; lint 3,760 warnings, zero errors. |
| main | CLI `bun test test/session/prompt-effect.test.ts -t 'MCP\|mcp\|config-declared\|frozen hidden' --timeout 120000` | 68 pass, 149 filtered, zero failures; 439 assertions; 262.28 s. |
| compat | Same filtered prompt-effect command | 74 pass, 175 filtered, zero failures; 479 assertions; 263.38 s. |
| main | CLI nine-file affected matrix below, `--timeout 120000` | 172 pass, zero failures; 620 assertions; 139.39 s. |
| compat | Same nine-file matrix | 173 pass, zero failures; 627 assertions; 139.96 s. |
| main | CLI `bun test test/mcp/lifecycle.test.ts --timeout 120000`, separate process | 33 pass, zero failures; 113 assertions; 29.43 s. |
| compat | Same isolated lifecycle command | 34 pass, zero failures; 115 assertions; 13.14 s. |
| both | CLI `bun test test/tool/mcp-tool-search.test.ts --timeout 120000`, additional standalone run | Each 35 pass, zero failures; 157 assertions. Overlaps matrix coverage. |

Nine-file matrix: `test/tool/mcp-tool-search.test.ts`, `test/config/config.test.ts`,
`test/mcp/host.test.ts`, `test/mcp/claude-auto-connect.test.ts`,
`test/session/codex-compact.test.ts`, `test/session/prefix-snapshot.test.ts`,
`test/session/llm-request-prefix.test.ts`, `test/session/fork-prefix-invariant.test.ts`,
`test/session/exec-effect-carriers.test.ts`. Each branch runs those files together.
Package preload is unchanged. Test-local wrappers select their explicit MCP modes;
the regex above is a literal alternation (remove Markdown table escapes when running).
Logs are operation-scoped outside the checkouts. Timings overlap and are not wall-clock totals.

The first broader main process included `lifecycle.test.ts` with real transport suites:
135 pass, 23 fail and one unhandled error. That file globally mocks MCP Client and
stdio/HTTP transport modules; real-transport suites loaded in the same process then
observe incompatible mocked transports (`this._transport?.send is not a function`),
while the lifecycle fixtures observe already-loaded real clients. The corrected
matrix excludes it and it passes separately on both branches. This matches the
existing CI `mcp-mock-suites` isolation, so neither production code nor CI changes.
An initial unfiltered prompt-effect run was intentionally stopped to narrow the
matrix and is not counted as a passing run.

Regenerated SDK adds the two optional `alwaysDirectTools` arrays. Its generated
mutable arrays exposed a CLI ACP assignment type error against the original
readonly Effect arrays. Both config classes now follow the existing `command`
field's `Schema.mutable` convention; final CLI typecheck passes. Compat SDK
regeneration completes with no additional diff, retaining its generated extensions.
The first main dependency install used ambient Bun 1.4.3; the locked install and
all verification subsequently use pinned 1.3.14. A fresh compat install initially
hit the missing node-gyp fallback and an incompatible transient lockfile; exposing
npm's bundled node-gyp on the operation PATH makes pinned `bun ci` succeed.
No repository lockfile or user configuration was changed.

Source review covers all active FD/FC/DC owners. Request disables, effective
permissions, actor/agent/frozen whitelists, changed-schema rejection, local-name
collision handling and frozen active membership remain in place. Shared generated
SDK and config additions are main-owned; no new compat owner is introduced.
The non-test overlay path set under packages is unchanged at 54 paths.

## Exact-SHA CI and publication

| Branch / source snapshot | lint | typecheck | complete test |
| --- | --- | --- | --- |
| main `f001dd2be038a3b66ae25ef431c6c594075ced7e` | [40640236623](https://github.com/onlyfeng/MiMo-Code/actions/runs/40640236623) | [40640236643](https://github.com/onlyfeng/MiMo-Code/actions/runs/40640236643) | [40640236601](https://github.com/onlyfeng/MiMo-Code/actions/runs/40640236601), attempt 2: nine successful jobs; Windows skipped as configured |
| compat `5cee6fc9bcc8710df59ac4187c854e02afa20b09` | [40640240182](https://github.com/onlyfeng/MiMo-Code/actions/runs/40640240182) | [40640240168](https://github.com/onlyfeng/MiMo-Code/actions/runs/40640240168) | [40640240310](https://github.com/onlyfeng/MiMo-Code/actions/runs/40640240310): all ten jobs pass, including [Windows runtime and launcher](https://github.com/onlyfeng/MiMo-Code/actions/runs/40640240310/job/122656445581) |

The first main test attempt fails only the existing invalid-output continuation
case `a message sent to a subagent while its retried attempt hangs supersedes the
subagent step`, at its explicit 30-second timeout. The same source file and its
server fixture are unchanged from the starting main. The CI trace shows its model
loop reaching final within about 0.3 seconds, followed by the timeout roughly
29.6 seconds later. On the same SHA, the complete file passes locally (21/21,
135 assertions, 36.53 seconds). This supports a timing-dependent hypothesis,
without establishing its root cause. Exactly one same-SHA failed-job rerun then
passes the original complete CI shard; no source, assertion, timeout or CI
partition changes are made to obtain that result. The historical failure remains
visible in attempt 1. A simultaneous local diagnostic uses the same 171-file
shard membership and invocation order; it is intentionally stopped after remote
CI succeeds and is not counted as a passing matrix.

Final review/report commits change only docs and therefore start no workflow.
Reuse the exact-source-SHA runs above only after proving both ancestry and tree
equality outside docs:

```sh
git diff --quiet f001dd2be038a3b66ae25ef431c6c594075ced7e origin/main -- . ':(exclude)docs'
git diff --quiet 5cee6fc9bcc8710df59ac4187c854e02afa20b09 origin/dev/compat -- . ':(exclude)docs'
git merge-base --is-ancestor upstream/main origin/main
git merge-base --is-ancestor origin/main origin/dev/compat
```

Fresh branch-only fetches during CI retain upstream `24546043`. After final
publication, repeat fetches, remote-tip equality, the outside-docs and ancestry
proofs, and shared-registry equality. No PR or remote temporary branch is created.
Shared FD/FC/history/report records are inherited unchanged; only compat owns
its DC review. Cleanup covers only the two clean integrated operation worktrees,
their local branches and the operation's temporary executable links. Logs remain
outside the repository for evidence. Local branches may fast-forward after
proving no unique work; original untracked `.omo/` is preserved.

