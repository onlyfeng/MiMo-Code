# Upstream synchronization on 2026-11-24

## Scope

Full live synchronization through upstream
`81a37ab596e5ee4d086697df81731a06817e2237` (pull request #2862), fetched on
2026-11-24 with branch-only refspecs. Fork `main` had last reviewed
`2c76c13c85ef41fe206f9a54d1d0e9da97319cfb`
([2026-11-22](upstream-sync-2026-11-22.md)); upstream added one commit since.
The starting tips were `27bc66918bddab241cf485ae82ad5710a9e4bb0f` on `main`
(the merge of pull request #268) and `7e8f7703c2b095eb4887c8627cd66de88ebc329e`
on `dev/compat` (the merge of pull request #269). Compat already contained
`main`, so `27bc6691` is the propagation baseline.

Two dedicated worktrees on `sync/upstream-81a37ab5-main` and
`sync/upstream-81a37ab5-compat` housed the integration; the original checkout
was not touched. `bun.lock` and `packages/cli/migration/` are unchanged on both
branches. Regenerating the SDK from each branch's merged sources reproduces the
committed generated files exactly.

Runtime/test snapshots: `main` `20eb00ddaa626fe67dc06f632f9c389913515ed8`,
`dev/compat` `b8236b3f83ac73d218fb561b38a679c2a94ecfd6`.

## Capability inventory and results (4)

| ID | Selected behavior | Main result | dev/compat result | Decisive paths and tests |
| --- | --- | --- | --- | --- |
| C01 | Questions carry the MCP elicitation request they were raised for (`Request.elicitation`); a reply may add `source`, `reason` and a structured `elicitation` answer; `Question.askElicitation` resolves with the whole reply while `ask` still resolves with answers. HTTP question routes and the SDK expose the new fields. | Adapted. Conflict in `question/index.ts` resolved by keeping the POLICY-01 lifecycle (closed-generation admission inside acquire/use/release, captured publisher, single `Rejected` through `dismiss`, uninterruptible `reply`) and adopting upstream's `raise`/`askElicitation` split and full `Replied` payload. Owner note in FC-008 (POLICY-01). | Inherited unchanged (clean merge). | `question/index.ts`, `server/routes/instance/question.ts`, `server/routes/instance/httpapi/question.ts`, `packages/sdk/src/v2/gen/`; `test/question/lifecycle.test.ts`, `test/question/question.test.ts`, `test/cli/tui/question-lifecycle.test.tsx`, `test/mcp/elicitation.test.ts` (mutation: dropping the payload fields fails two cases). |
| C02 | Form-mode elicitation (MCP 2025-11-25) covers the flat requested-schema subset: enums, `oneOf`, legacy `enumNames`, booleans and multi-select arrays become choices, strings and numbers free text; answers are validated (required, choices, length, pattern, formats, ranges, item counts) before `accept`, otherwise the request is cancelled. | Adopted (clean merge). FC-004 pending imports, `auto_connect`/`enabled` precedence and URL validation unchanged. | Inherited unchanged. DC-NET-002 RFC1918 reachability unaffected. | `mcp/elicitation-form.ts`, `mcp/elicitation.ts`; `test/mcp/elicitation-form.test.ts`, `test/mcp/elicitation.test.ts`, `test/mcp/lifecycle.test.ts`. |
| C03 | Server requests are associated with the originating `tools/call`: the call id joins the turn-lifecycle `_meta`, a request is matched by the echoed call id, else session and turn, else the only call in flight; unmatched or ambiguous requests get -32602; an associated request is not withdrawn when another call starts, and its question is attached to the tool call. | Adapted. Conflicts in `session/prompt.ts` kept the fork's progress presentation, effective permission and exec tool wiring and added upstream's recorder, `messageID` and `onMcpElicitation`. The shared `executeMcp` wrapper serves direct calls, `mcp_tool_use` dispatch and exec's `execMcpTools`, so every MCP entry is associated and recorded; upstream's passthrough in `tool-script.ts` is kept and superseded there. Notes in FC-004 and FD-006. | Inherited unchanged (clean merge). | `mcp/index.ts` (`convertMcpTool`), `mcp/tool-context.ts`, `session/prompt.ts` (`recordMcpElicitation`, `executeMcp`), `tool/tool-script.ts`; `test/mcp/elicitation.test.ts`, `test/mcp/lifecycle.test.ts`, `test/tool/tool-script.test.ts`, `test/session/prompt-effect.test.ts`. |
| C04 | An `elicitation` message part records each request and its outcome. It is never sent to the model, history indexing ignores it, a step retry keeps it, and a sanitized export redacts its message, content, metadata and reason. | Adopted (clean merge). The fork has no other structural-part predicate that needs it; the checkpoint writer's size estimate counts it conservatively. | Inherited. Compat's DC-CONTEXT-001 replay caps and current-turn split filter UI messages after conversion, where elicitation parts are already gone, and the checkpoint rebuild copies only text and file parts, so the record stays out of model requests. | `session/message-v2.ts` (`ElicitationPart`, `toModelMessagesEffect`, `planResumeTrim`), `session/processor.ts` (`resetStep`), `history/extract.ts`, `cli/cmd/export.ts`; `test/session/message-v2.test.ts`, `test/history/*.test.ts`, `test/cli/export-import.test.ts`. |

## Conflict resolution

`main` conflicted in two files.

- `question/index.ts` (four hunks): both sides rewrote `Question.ask`. The fork
  side is the POLICY-01 lifecycle recorded since 2026-10-14; upstream's side
  generalized the waiter to the whole reply. The resolution keeps the fork's
  admission, release and publication order and changes only the deferred's
  value type and the value `reply` completes it with.
- `session/prompt.ts` (four hunks): all were adjacent additions. The fork's
  `toolPresentationProgress` import, `effectivePermission`, `execTools` and the
  awaited progress presentation stay; upstream's recorder import, recorder
  definition, `onMcpElicitation` in the tool extra, and `messageID` and
  `onMcpElicitation` in the wrapper's `experimental_context` are added.

The merge of `main` into `dev/compat` was clean.

## Local validation

macOS 15 (Darwin 24.6) with the pinned Bun 1.3.14; dependencies came from
`bun ci`. Each test file ran in its own process from `packages/cli`, with
`MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE` and
the seven other ambient `MIMOCODE_*` switches of this host removed; the package
preload flags were kept.

- `main` `20eb00dd`: root `bun typecheck` (every workspace plus scripts)
  passes; root `bun run lint` reports 0 errors (3,754 warnings). 75 files (all
  MCP suites, question, history, retry/processor, message-v2, prompt-effect,
  exec, plan, export and session recovery): 1,125 pass, 0 fail.
  `test/session/structured-output-retry.test.ts` timed out twice at 5 seconds
  while three other files ran beside it and passed 3/3 alone.
- `dev/compat` `b8236b3f`: root `bun typecheck` passes; root `bun run lint`
  reports 0 errors (3,842 warnings). The same 75 files plus 35 compat-owned
  session, MCP, preflight and question suites that differ from `main`
  (110 files): 1,773 pass, 0 fail.

Mutation check for C01: removing `source`, `reason` and `elicitation` from the
value `reply` completes the waiter with fails "form choices are answered,
exposed on the question and recorded" and "structured replies are validated
against the schema" in `test/mcp/elicitation.test.ts`; restoring them passes.
No test drives `recordMcpElicitation` through a session prompt on either
branch (upstream adds none either); its wiring is covered by review and by the
MCP-level recorder tests above.

Local runs on this host are not exact-SHA CI; the CI result is recorded
below.

## Publication

Pending.
