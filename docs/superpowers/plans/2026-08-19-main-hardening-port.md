# Main Hardening Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver four branch-independent context-safety fixes to fork `main`, then propagate each merged result to `dev/compat` without importing compatibility-only behavior.

**Architecture:** `main` owns the checkpoint-writer contract, byte-safe model-visible truncation, generated-text injection caps, and generic request preflight. `dev/compat` consumes those implementations through `main -> dev/compat` merges and retains only MaxMode-specific extensions. Request authorization, MCP schema loading, exec dispatch, model identity selection, and text-size policy stay separate boundaries.

**Tech Stack:** TypeScript, Bun 1.3.14, Effect 4 beta, Zod, AI SDK tool schemas, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-07-23-main-hardening-port-design.md`

## Global Constraints

- Publish only to `onlyfeng/MiMo-Code`; every feature PR targets fork `main`.
- Start every PR from the then-current `origin/main` in a fresh isolated worktree.
- Treat every command block as starting at that worktree's repository root;
  blocks that change directory return with `cd "$(git rev-parse --show-toplevel)"`
  before root-relative commands.
- Run tests and `bun typecheck` from `packages/opencode`; never run tests from the repository root.
- Install dependencies only with `bun ci`; never mutate `bun.lock` for these changes.
- Preserve `docs/upstream-deviations.md` FD-001 through FD-005.
- Preserve request authorization, MCP discovery/loading, `execMcp.current`, `ALL_TOOLS`, frozen fork membership, and attachment routing.
- Preserve `dev/compat` MaxMode, checkpoint, overflow, actor/status, and fork-prefix extensions during propagation.
- Do not change Web, App, or Desktop surfaces.
- Regenerate SDK/OpenAPI only if an API source changes; when run, generation must be idempotent and must not restore FD-004's `llmServer` or voice schemas.

---

### Task 1: PR 1 — Make the checkpoint-writer runtime contract canonical

**Files:**
- Modify: `packages/opencode/src/session/checkpoint.ts`
- Modify: `packages/opencode/src/agent/prompt/checkpoint-writer.txt`
- Modify: `packages/opencode/test/session/checkpoint-child-session.test.ts`
- Modify: `packages/opencode/test/tool/whitelist.test.ts`
- Test: `packages/opencode/test/agent/agent.test.ts`
- Test: `packages/opencode/test/tool/apply_patch.test.ts`

**Interfaces:**
- Consumes: `Actor.SpawnInput.tools`, `composeWriterPrompt(...)`, and the existing recording actor's `spawnLog.lastInput`.
- Produces: one internal `CHECKPOINT_WRITER_TOOLS` tuple and one rendered contract string used by both the prompt and `actor.spawn`.

- [ ] **Step 1: Add the RED runtime-contract assertions**

Extend the real checkpoint-child-session test so it asserts exactly:

```ts
expect(spawnLog.lastInput?.tools).toEqual([
  "read",
  "write",
  "edit",
  "apply_patch",
  "glob",
  "grep",
  "task",
])
const contracts = [
  ...(spawnLog.lastInput?.task.matchAll(
    /The ([^.]+) tools are available; do not invoke others\./g,
  ) ?? []),
]
expect(contracts).toHaveLength(1)
expect(contracts[0]?.[1]?.split(", ")).toEqual(spawnLog.lastInput?.tools)
expect(spawnLog.lastInput?.task).not.toContain("Available tools (runtime-enforced whitelist)")
```

Extend the recording actor's `spawnLog.lastInput` to capture `task` and a copied
`tools` array; otherwise the test is not observing the production
`Actor.SpawnInput`. Delete the source-regex assertion that searches from
`"checkpoint-writer"` into a later agent object. Keep the service assertion
that the checkpoint-writer agent has no `toolAllowlist`.

- [ ] **Step 2: Run the RED test**

Run:

```bash
cd packages/opencode
bun test test/session/checkpoint-child-session.test.ts test/tool/whitelist.test.ts --timeout 30000
```

Expected: the task contains contradictory/multiple tool contracts or omits `apply_patch` from the high-priority contract.

- [ ] **Step 3: Define the canonical tuple and render it once**

In `session/checkpoint.ts`, define and reuse:

```ts
const CHECKPOINT_WRITER_TOOLS = ["read", "write", "edit", "apply_patch", "glob", "grep", "task"] as const
const checkpointWriterToolContract = `The ${CHECKPOINT_WRITER_TOOLS.join(", ")} tools are available; do not invoke others.`
```

Use `checkpointWriterToolContract` in `composeWriterPrompt` and spread the tuple into `actor.spawn({ tools: [...] })`. Replace the static list in `checkpoint-writer.txt` with wording that points to the high-priority runtime contract without repeating tool names.

- [ ] **Step 4: Run focused verification**

Run:

```bash
cd packages/opencode
bun test test/session/checkpoint-child-session.test.ts test/tool/whitelist.test.ts test/agent/agent.test.ts test/tool/apply_patch.test.ts --timeout 30000
bun typecheck
```

Expected: all tests pass and the writer retains child-session, parent-session, prefix-capture, memory-path, and watermark behavior.

- [ ] **Step 5: Commit and propagate PR 1**

```bash
cd "$(git rev-parse --show-toplevel)"
git add packages/opencode/src/session/checkpoint.ts packages/opencode/src/agent/prompt/checkpoint-writer.txt packages/opencode/test/session/checkpoint-child-session.test.ts packages/opencode/test/tool/whitelist.test.ts
git commit -m "fix(checkpoint): make writer tool contract canonical"
```

After exact-head CI and approval, merge the fork PR, merge updated `main` into `dev/compat`, run the same tests plus checkpoint/fork regressions, and require exact-SHA CI before continuing.

---

### Task 2: PR 2 — Add safe serialization and absolute UTF-8 byte caps

**Files:**
- Create: `packages/opencode/src/util/text-truncate.ts`
- Create: `packages/opencode/src/util/safe-stringify.ts`
- Create: `packages/opencode/test/util/text-truncate.test.ts`
- Create: `packages/opencode/test/util/safe-stringify.test.ts`
- Modify: `packages/opencode/src/tool/truncate.ts`

**Interfaces:**
- Produces: `MODEL_VISIBLE_TEXT_CAP_BYTES`, `TruncateKeep`, `takeUtf8PrefixByBytes`, `takeUtf8SuffixByBytes`, `capUtf8TextByBytes(...)`, and non-throwing `safeStringify(input)` returning `{ serialized, transformed }`.
- Consumes: Node `Buffer.byteLength`; no Bun-only runtime API.

- [ ] **Step 1: Write RED table tests for the byte contract**

Cover ASCII, CJK, emoji, an isolated surrogate, `head`, `tail`, `head+tail`, and budgets `-1`, `0`, `1`, `8`, `32`, and `100`. Every returned string must satisfy:

```ts
expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(Math.max(0, budget))
expect(result).not.toContain("\uFFFD")
```

Also assert non-string legacy values pass through unchanged. In the serializer
suite, cover bigint, function, symbol, a true cycle, a repeated non-circular
reference, accessors, own enumerable/non-enumerable and inherited `toJSON`,
depths 63, 64, and 65, node counts 49,999, 50,000, and 50,001, and throwing
proxy ownKeys, descriptor, and prototype traps. Treat the root as depth 0:
depths through 63 and the first 50,000 nodes are inspectable; depth 64 and an
attempted 50,001st node produce markers. Use counters to prove getters and
`toJSON` are never invoked. Every hook/accessor/non-plain/budget marker sets
`transformed: true`; `transformed: false` is asserted only for recursively plain
JSON-equivalent data. Throwing meta traps must return
`JSON.stringify("[unserializable]")` with `transformed: true`.

- [ ] **Step 2: Run the RED helper test**

```bash
cd packages/opencode
bun test test/util/text-truncate.test.ts --timeout 30000
bun test test/util/safe-stringify.test.ts --timeout 30000
```

Expected: the module is missing.

- [ ] **Step 3: Implement the helper with marker accounting**

Use a conditional overload so normal string callers retain a truthful `string`
result while malformed legacy values retain their input type without claiming
that a string literal survives truncation unchanged:

```ts
export const MODEL_VISIBLE_TEXT_CAP_BYTES = 50 * 1024
export type TruncateKeep = "head" | "tail" | "head+tail"

export function capUtf8TextByBytes<T>(
  text: T,
  maxBytes: number,
  label: string,
  suffix?: string,
  keep?: TruncateKeep,
): T extends string ? string : T
```

The implementation signature accepts and returns `unknown`; the conditional
overload is the exported contract. Add compile-time assertions for a string
literal, `"literal" | undefined`, a branded string, and a non-string union so
the type cannot regress to the original literal/brand after truncation. Export
this serializer shape:

```ts
export function safeStringify(input: unknown): {
  serialized: string
  transformed: boolean
}
```

Normalize property descriptors recursively without invoking getters or
`toJSON`. Use a path-local ancestor set (not one monotonic traversal-wide
`WeakSet`) so a shared DAG reference is serialized twice while a true ancestor
cycle becomes `"[circular]"`. Convert accessors/functions/symbols/bigints to
stable string markers. Explicitly inspect even a non-enumerable `toJSON` and
reject inherited/custom-prototype hooks from the unchanged-original fast path.
Only recursively plain JSON-equivalent data may return `transformed: false`.
Freeze `MAX_DEPTH = 64` and `MAX_NODES = 50_000`: with root depth 0, attempting
to inspect depth 64 emits a depth marker; after exactly 50,000 nodes have been
visited, attempting node 50,001 emits a node marker. Either sets
`transformed: true`. Wrap all proxy ownKeys, descriptor, and prototype
operations in one non-throwing boundary that returns
`{ serialized: JSON.stringify("[unserializable]"), transformed: true }`.

Return `""` for non-positive budgets when `text` is a string. When the full marker exceeds the budget, UTF-8-safely shorten the marker itself. Decode slices only at valid code-point boundaries and handle isolated UTF-16 surrogates without introducing replacement characters.

- [ ] **Step 4: Make tool truncation reuse the constant**

Replace the duplicate 50 KiB literal in `tool/truncate.ts` with `MODEL_VISIBLE_TEXT_CAP_BYTES`; do not change the file-backed truncation service or `read.ts` pagination.

- [ ] **Step 5: Verify and commit the primitive**

```bash
cd packages/opencode
bun test test/util/text-truncate.test.ts test/tool/truncation.test.ts --timeout 30000
bun test test/util/safe-stringify.test.ts --timeout 30000
bun typecheck
git add src/util/text-truncate.ts src/util/safe-stringify.ts test/util/text-truncate.test.ts test/util/safe-stringify.test.ts src/tool/truncate.ts
git commit -m "feat(session): add byte-safe model text caps"
```

---

### Task 3: PR 2 — Cap tool-history replay without mutating stored history

**Files:**
- Modify: `packages/opencode/src/session/message-v2.ts`
- Modify: `packages/opencode/test/session/message-v2.test.ts`

**Interfaces:**
- Consumes: `capUtf8TextByBytes`, `MODEL_VISIBLE_TEXT_CAP_BYTES`, and `safeStringify` from Task 2.
- Produces: bounded provider-facing tool input/output/error values from `MessageV2.toModelMessagesEffect`; persisted message rows remain unchanged.

- [ ] **Step 1: Add RED replay fixtures**

Add completed, interrupted, error, pending, running, compacted-placeholder, provider-metadata, and attachment cases. Assert completed/interrupted output keeps the head, errors keep head and terminal tail, and serialized input stays valid JSON at or below 50 KiB.

Add explicit `providerOutput` cases. A same-model provider output may bypass the
ordinary text/attachment branch only when canonical serialization reports
`transformed: false` and the serialized value is within the byte cap. Oversized,
circular, getter/`toJSON`-bearing, hostile-proxy, compacted, or cross-model
provider output must fall back to the bounded ordinary output path; it must
never bypass the cap. Assert hook invocation counters remain zero.

- [ ] **Step 2: Run the RED replay test**

```bash
cd packages/opencode
bun test test/session/message-v2.test.ts --timeout 30000
```

Expected: oversized replay fields exceed `MODEL_VISIBLE_TEXT_CAP_BYTES`.

- [ ] **Step 3: Add safe input serialization and per-state caps**

Use Task 2's serializer. If `transformed` is true and the normalized JSON fits,
return `JSON.parse(serialized)` rather than the unserializable original. If the
serialized input exceeds the cap, emit this bounded provider value:

```ts
{ truncated: capUtf8TextByBytes(serialized, payloadBudget, "tool input", "before model replay") }
```

Initialize `payloadBudget` by subtracting
`Buffer.byteLength(JSON.stringify({ truncated: "" }), "utf8")`. Rebuild the
wrapper while its serialized byte length exceeds the cap, monotonically
shrinking the payload budget (including a final zero-budget attempt). Assert the
loop terminates and the final serialized wrapper is within 50 KiB even when the
kept text contains quotes, backslashes, or control characters.

Keep `routeToolAttachment` and native/synthetic attachment selection outside the cap logic.

Before selecting `part.state.providerOutput`, serialize it once with the same
canonical helper. Reuse the original provider value only when the message uses
the same model, is not compacted, serialization is untransformed, and the
serialized bytes are within the cap. Otherwise use the already bounded
text/attachment output. Do not stringify provider output into a new provider
shape.

- [ ] **Step 4: Verify the complete PR 2 diff**

```bash
cd packages/opencode
bun test test/util/text-truncate.test.ts test/util/safe-stringify.test.ts test/session/message-v2.test.ts test/tool/truncation.test.ts --timeout 30000
bun typecheck
cd "$(git rev-parse --show-toplevel)"
bun run lint
git diff --check
```

Expected: 0 failures, 0 lint errors, and no API/SDK diff.

- [ ] **Step 5: Commit, open PR 2, and propagate after merge**

```bash
cd "$(git rev-parse --show-toplevel)"
git add packages/opencode/src/session/message-v2.ts packages/opencode/test/session/message-v2.test.ts
git commit -m "fix(session): bound provider tool-history replay"
```

After fork PR approval and exact-head CI, merge to `main`, then merge `main` into `dev/compat`. The compatibility merge must use the main byte helper as canonical and retain only `capTextByChars` and MaxMode-specific constants/extensions.

Resolve the existing compatibility serializer API in the same propagation
merge rather than carrying a second implementation:

- change `message-v2.ts` calls from `safeStringify(value, { bigint: true })`
  to `safeStringify(value)`;
- change `overflow.ts` from `safeStringifySimple(value)` to
  `safeStringify(value).serialized`;
- change the MaxMode replay call from `safeStringifyNoThrow(value, fallback)`
  to the canonical `safeStringify(value).serialized`, retaining any
  MaxMode-specific surrounding label outside the serializer if it is still
  required; and
- remove `safeStringifySimple`/`safeStringifyNoThrow` only after all source and
  test callers have migrated, then run the compatibility serializer,
  message-v2, overflow, and MaxMode suites plus `bun typecheck`.

---

### Task 4: PR 3 — Cap structured instruction, inbox, and skill blocks

**Files:**
- Modify: `packages/opencode/src/session/instruction.ts`
- Modify: `packages/opencode/src/inbox/render.ts`
- Modify: `packages/opencode/src/session/system.ts`
- Modify: `packages/opencode/src/skill/index.ts`
- Modify: `packages/opencode/test/session/instruction.test.ts`
- Create: `packages/opencode/test/inbox/render.test.ts`
- Modify: `packages/opencode/test/session/system.test.ts`
- Create: `packages/opencode/test/session/instructions-loaded-delivery.test.ts`

**Interfaces:**
- Consumes: Task 2's byte helper; `SystemPrompt.skills` remains the sole owner of skill guidance.
- Produces: wrapper-inclusive, structurally closed blocks at or below 50 KiB.

- [ ] **Step 1: Add RED wrapper-inclusive assertions**

For every generated block, assert `Buffer.byteLength(block, "utf8") <= MODEL_VISIBLE_TEXT_CAP_BYTES`. Include local/global/remote instructions, plain inbox, completed/failed actor notifications, one huge skill, many skills, CJK, emoji, and tiny remaining budgets.

- [ ] **Step 2: Add the FD-002 coupled instruction regression**

In one scenario, capture the `TuiEvent.InstructionsLoaded` file list and the downstream `streamText` system payload in `instructions-loaded-delivery.test.ts`. Assert every non-empty reported file contributes capped content to the same request.

- [ ] **Step 3: Implement reserved-wrapper caps**

Reserve fixed headers/opening tags/closing tags/markers before capping variable text. For skills, keep complete `<skill>` elements, shorten fields inside a single oversized element, insert a complete marker when it fits, and always emit `</available_skills>`.

- [ ] **Step 4: Lock model and permission guidance outside the cap**

Add a table covering load-only, search-only, both, and neither; include blacklisted GPT/Claude/Kimi/MiMo identities, a permitted DeepSeek identity, and a MiMo v2.5 alias conflict. Assert the cap changes listing bytes only and does not change `canLoadSkills`, `canSearchSkills`, prompt selection, MCP mode, or toolset selection.

- [ ] **Step 5: Run focused tests and commit this slice**

```bash
cd packages/opencode
bun test test/session/instruction.test.ts test/session/instructions-loaded-delivery.test.ts test/inbox/render.test.ts test/session/system.test.ts --timeout 60000
bun typecheck
git add src/session/instruction.ts src/inbox/render.ts src/session/system.ts src/skill/index.ts test/session/instruction.test.ts test/session/instructions-loaded-delivery.test.ts test/inbox/render.test.ts test/session/system.test.ts
git commit -m "fix(session): cap structured model-visible blocks"
```

---

### Task 5: PR 3 — Cap synthetic prompt text and actor state without changing authorization

**Files:**
- Modify: `packages/opencode/src/config/config.ts`
- Modify: `packages/opencode/src/session/prompt.ts`
- Modify: `packages/opencode/src/session/max-mode.ts`
- Modify: `packages/opencode/src/tool/actor.ts`
- Modify: `packages/opencode/test/session/prompt-effect.test.ts`
- Modify: `packages/opencode/test/session/max-mode.test.ts`
- Modify: `packages/opencode/test/tool/actor.test.ts`
- Test: `packages/opencode/test/tool/tool-script.test.ts`
- Test: `packages/opencode/test/tool/whitelist.test.ts`
- Test: `packages/opencode/test/util/child-process-env.test.ts`

**Interfaces:**
- Consumes: Task 2's byte helper and existing `Process.text`, `execMcp.current`, `loadedMcpTools`, frozen tool membership, and checkpoint push caps.
- Produces: bounded MCP resource text, data text, command expansion, skill text, actor-state excerpts, and MaxMode judge requests.

- [ ] **Step 1: Add RED per-source tests**

Cover MCP resource text, decoded `data:text/plain`, command shell expansion, free-text skill mention, skill command, skill subtask, `context="state"`, and MaxMode judge rendering. Assert generated segments are bounded while direct user `$ARGUMENTS` remain byte-for-byte unchanged. For actor state, assert `max(Token.estimate(result), Math.ceil(Buffer.byteLength(result, "utf8") / 3)) <= configuredTokens` across tiny, ASCII, CJK, and emoji fixtures. For MaxMode, include circular/proxy tool input, oversized reasoning/message text, and a configured count above 16; assert the effective count is clamped to 16, all 16 candidate headers remain, and the complete judge user message is at most `MODEL_VISIBLE_TEXT_CAP_BYTES`.

- [ ] **Step 2: Implement last-stable-boundary caps**

Cap each generated value once immediately before synthetic persistence. For command expansion, cap the `.text` returned by the existing `Process.text` call; do not pass `process.env` and do not execute twice. For actor state, preserve useful head and tail within the configured checkpoint excerpt budget while excluding the fixed `<session-state>` scaffold and following caller prompt. Define its estimate as `max(Token.estimate(text), ceil(utf8Bytes(text) / 3))`, reserve/shorten the marker, and monotonically shrink until the estimator postcondition holds.

In `session/max-mode.ts`, use the canonical serializer for tool inputs, 8 KiB
byte caps for each reasoning/message field, and 2 KiB for each serialized tool
input. Define `MAX_MODE_MAX_CANDIDATES = 16`, clamp the effective count before
candidate generation, log when configuration requests more, and update the
`experimental.maxMode.candidates` schema description to document the default
and runtime maximum. Reserve fixed judge scaffolding and all effective candidate
headers, distribute the remaining 50 KiB across candidate bodies, and verify
the final user message is within the absolute cap. Keep winner mapping, retry,
usage accounting, and final replay semantics unchanged for the effective
candidates.

- [ ] **Step 3: Prove MCP search and exec boundaries are unchanged**

Run and preserve assertions that a request-authorized MCP tool can be dispatched through `exec` without loading its outer schema, while an uncaptured/unauthorized tool is absent from `ALL_TOOLS` and cannot execute.

- [ ] **Step 4: Verify and commit PR 3**

```bash
cd packages/opencode
env -u MIMOCODE_EXPERIMENTAL -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH -u MIMOCODE_CODEX_MODE \
  bun test --timeout 60000 \
  test/session/instruction.test.ts test/inbox/render.test.ts test/session/system.test.ts \
  test/session/prompt-effect.test.ts test/session/max-mode.test.ts \
  test/tool/actor.test.ts test/tool/tool-script.test.ts \
  test/tool/whitelist.test.ts test/util/child-process-env.test.ts
bun typecheck
cd "$(git rev-parse --show-toplevel)"
bun run lint
git diff --check
git add packages/opencode/src/config/config.ts packages/opencode/src/session/prompt.ts packages/opencode/src/session/max-mode.ts packages/opencode/src/tool/actor.ts packages/opencode/test/session/prompt-effect.test.ts packages/opencode/test/session/max-mode.test.ts packages/opencode/test/tool/actor.test.ts
git commit -m "fix(session): cap remaining generated model context"
```

After exact-head CI and approval, merge to `main`, then propagate `main -> dev/compat`. Remove duplicate compatibility implementations of generic caps, including the old character-based judge capping, while retaining only per-agent MaxMode selection/retry/status extensions.

---

### Task 6: PR 4 — Add pure request estimation and shared wire-tool filtering

**Files:**
- Modify: `packages/opencode/src/session/overflow.ts`
- Modify: `packages/opencode/src/session/llm.ts`
- Modify: `packages/opencode/test/session/overflow.test.ts`
- Modify: `packages/opencode/test/session/llm.test.ts`

**Interfaces:**
- Consumes: `contextWindow`, `usable`, Task 2's byte helper and `safeStringify`, and current `LLM.resolveTools` output.
- Produces: `LLM.filterActiveTools(tools, activeTools)`, a trusted-boundary `LLM.materializeWireToolDescriptors(...)`, `estimateRequestTokens`, and `classifyRequestOverflow` returning `ok | overflow | overflow-static` with token measurements.

- [ ] **Step 1: Extract the exact wire-tool filter with parity tests**

Add and use:

```ts
import type { Tool } from "ai"

export function filterActiveTools(tools: Record<string, Tool>, activeTools?: string[]) {
  const requested = new Set(activeTools ?? Object.keys(tools))
  return Record.filter(tools, (_, name) => name !== "invalid" && requested.has(name))
}
```

Replace the inline filter in `LLM.stream` and prove the emitted tool keys are unchanged. Add one helper in the LLM boundary that materializes each selected AI SDK tool into a pure provider-facing descriptor: name, description, the resolved `asSchema(tool.inputSchema).jsonSchema`, and serializable wire metadata after the existing provider transform. Never pass the raw `Tool` wrapper or its `execute` function to `safeStringify`.

- [ ] **Step 2: Add RED pure-estimator tests**

Cover ASCII/multibyte requests, circular/bigint/function/symbol data, the 80 KiB schema contribution cap, filtered tools, recoverable history overflow, static-prefix overflow, `compaction.max_context`, disabled auto compaction, unknown context, and a provider model already clamped to 372K. Build at least one real AI SDK `tool({ inputSchema: jsonSchema(hugeSchema) })`. Capture the selected descriptor immediately before the real provider/`streamText` request and compare its name, description, and JSON schema to the estimator's materialized descriptor byte-for-byte; assert the large schema is counted and `execute` is absent.

- [ ] **Step 3: Implement the estimator and classifier**

Use the larger of the existing character estimate and UTF-8 bytes divided by three. Compare against `usable({ cfg, model })` with a guard of `Math.min(5_000, usableTokens * 0.1)`. Re-estimate with `messages: []` to distinguish `overflow-static`; do not independently classify the model. The estimator consumes only the materialized pure descriptors; descriptor materialization is the explicit trusted getter boundary and must happen once for the same selected tool set used by dispatch.

- [ ] **Step 4: Verify and commit the pure layer**

```bash
cd packages/opencode
bun test test/session/overflow.test.ts test/session/llm.test.ts --timeout 60000
bun typecheck
git add src/session/overflow.ts src/session/llm.ts test/session/overflow.test.ts test/session/llm.test.ts
git commit -m "feat(session): classify request overflow before dispatch"
```

---

### Task 7: PR 4 — Integrate preflight into normal and frozen-fork requests

**Files:**
- Modify: `packages/opencode/src/session/prompt.ts`
- Modify: `packages/opencode/test/session/prompt-effect.test.ts`
- Modify: `packages/opencode/test/session/fork-prefix-invariant.test.ts`
- Modify: `packages/opencode/test/cli/tui/context-usage.test.ts`

**Interfaces:**
- Consumes: Task 6's classifier and `LLM.filterActiveTools`; `processArgs.tools` plus `processArgs.activeTools` define the outer wire schemas.
- Produces: provider-free recovery for `overflow`, terminal error for `overflow-static`, and unchanged provider-signalled overflow fallback.

- [ ] **Step 1: Add RED live preflight tests**

Assert a recoverable oversized request finalizes its placeholder as cancelled, makes zero provider calls on that step, and enters observable recovery. Assert a static-only overflow finalizes one `ModelError`, emits the existing session error event, makes zero provider calls, and stops without compaction looping.

- [ ] **Step 2: Add MCP wire-membership regressions**

Prove an unloaded but request-authorized MCP schema is not counted in the outer request while request-scoped `exec` can dispatch it. After search-load, prove that schema is in `activeTools` and contributes to the estimate. Never count `ALL_TOOLS` catalog descriptions as wire schemas.

- [ ] **Step 3: Add identity/fork/MaxMode guard regressions**

Cover a MiMo v2.5 alias conflict, another MiMo model, normal main, frozen fork, final-step `toolChoice: "none"`, structured output, and a native hidden bounded computation. Assert preflight consumes the already-selected prompt/tools and does not run for the hidden bounded computation.

- [ ] **Step 4: Integrate one preflight function at the process boundary**

After each `processArgs` object is complete and before `handle.process`, derive the
selected tools and materialize their provider-facing descriptors through the
shared LLM helper. Conceptually:

```ts
const wireTools = LLM.filterActiveTools(LLM.resolveTools(processArgs), processArgs.activeTools)
const wireToolDescriptors = await LLM.materializeWireToolDescriptors(wireTools, processArgs.model)
```

Classify the exact `prebuiltSystem`, messages, `wireToolDescriptors`, and
`toolChoice`. The provider call must consume the same selected tool set and
provider transform; do not materialize a second independently selected set.
Handle only results created by this preflight; leave provider-signalled
overflow, classifier behavior, MaxMode selection, and status ownership
unchanged.

- [ ] **Step 5: Verify, commit, and propagate PR 4**

```bash
cd packages/opencode
env -u MIMOCODE_EXPERIMENTAL -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH -u MIMOCODE_CODEX_MODE \
  bun test --timeout 60000 \
  test/session/overflow.test.ts test/session/prompt-effect.test.ts \
  test/session/fork-prefix-invariant.test.ts test/session/llm.test.ts \
  test/cli/tui/context-usage.test.ts
bun typecheck
cd "$(git rev-parse --show-toplevel)"
bun run lint
git diff --check
git add packages/opencode/src/session/prompt.ts packages/opencode/test/session/prompt-effect.test.ts packages/opencode/test/session/fork-prefix-invariant.test.ts packages/opencode/test/cli/tui/context-usage.test.ts
git commit -m "fix(session): preflight oversized provider requests"
```

After exact-head CI and approval, merge to `main`, then propagate `main -> dev/compat`. The compatibility wrapper must delegate generic preflight to main and retain only MaxMode selection/handling.

---

### Task 8: Final cross-branch acceptance

**Files:**
- Verify: `docs/upstream-deviations.md`
- Verify: `.github/workflows/lint.yml`
- Verify: `.github/workflows/typecheck.yml`
- Verify: `.github/workflows/test.yml`
- Verify: `packages/sdk/openapi.json`
- Verify: `packages/sdk/js/src/v2/gen/`

**Interfaces:**
- Consumes: the four merged fork PRs and four corresponding `main -> dev/compat` merges.
- Produces: exact remote ancestry, clean worktrees, and exact-SHA CI evidence for both target branches.

- [ ] **Step 1: Verify ancestry and remote equality**

```bash
git fetch --no-tags --prune origin main dev/compat
git merge-base --is-ancestor origin/main origin/dev/compat
git rev-parse origin/main origin/dev/compat
```

In each branch worktree before running its matrix, require:

```bash
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" # main worktree
test -z "$(git status --porcelain=v1 --untracked-files=all)" # ignored artifacts are outside Git worktree cleanliness
```

Use the analogous `origin/dev/compat` comparison in the compatibility
worktree. Record those exact SHAs and query GitHub Actions by the same SHA; a
branch name or a merely checked-out-looking tip is insufficient evidence.

- [ ] **Step 2: Run the aggregate engine-core matrix on both branch tips**

From each checked-out branch tip, run:

```bash
cd packages/opencode
bun test --timeout 60000 \
  test/session/checkpoint-child-session.test.ts test/tool/whitelist.test.ts \
  test/agent/agent.test.ts test/tool/apply_patch.test.ts \
  test/util/text-truncate.test.ts test/util/safe-stringify.test.ts \
  test/session/message-v2.test.ts test/tool/truncation.test.ts \
  test/session/instruction.test.ts test/session/instructions-loaded-delivery.test.ts \
  test/inbox/render.test.ts test/session/system.test.ts test/session/prompt-effect.test.ts \
  test/session/max-mode.test.ts test/tool/actor.test.ts test/tool/tool-script.test.ts test/util/child-process-env.test.ts \
  test/session/overflow.test.ts test/session/llm.test.ts \
  test/session/fork-prefix-invariant.test.ts test/cli/tui/context-usage.test.ts
bun typecheck
cd "$(git rev-parse --show-toplevel)"
bun run lint
git diff --check
```

If an API source changed, run `./packages/sdk/js/script/build.ts` twice and
require the second run to leave no diff; otherwise require no generated-file
changes.

- [ ] **Step 3: Verify exact-SHA GitHub Actions**

For each exact tip, require successful `lint`, `typecheck`, and all four test shards. A rerun is permitted at most once and only after logs prove a known same-SHA flake unrelated to the changed files.

- [ ] **Step 4: Clean only proven disposable worktrees**

Remove a feature/sync worktree only after its branch is merged, its remote contains the exact head, the worktree is clean, and no unique commit remains. Preserve unrelated user files and parked experiments.
