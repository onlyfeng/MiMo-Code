# Compat Native Web Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `dev/compat`, use provider-native in-turn web search for configured models, fall back within the same turn on any search-specific failure, and give the `websearch` tool a configurable Codex (Responses) search layer ahead of the existing Xiaomi/Exa routes.

**Architecture:** A new `src/tool/websearch/native.ts` owns config resolution, per-session×model failure state, failure classification, provider-tool injection, replay downgrade and result display. `LLM.stream` consults it on every attempt, so the existing request ladder and processor retries pick up fallback automatically; a one-shot retry (modelled on the prefill-rejection backstop) handles pre-output failures. `src/tool/websearch/codex.ts` performs standalone Responses search for the client tool.

**Tech Stack:** TypeScript, Effect, AI SDK `ai@6.0.168`, `@ai-sdk/openai@3.0.113` (`openai.tools.webSearch`), `@ai-sdk/anthropic@3.0.82` (`anthropic.tools.webSearch_20250305`), bun test.

**Spec:** `docs/superpowers/specs/2026-10-18-compat-native-websearch-design.md`

## Global Constraints

- Target `dev/compat` only; branch `feat/example` from `9b9747259d0bff9a4407ea3ba5b3e1a5d17c22a0`. No change to `main`, upstream, FD/FC registries, or bundled `mimocode-docs`.
- Without a `websearch` config block every request payload, tool list and websearch result is unchanged.
- Native only for `@ai-sdk/openai` (Responses) and `@ai-sdk/anthropic`; provider-tool key is `web_search`.
- Native requires: not `ephemeral`, not `small`, `websearch` present in the resolved tool set, `Permission.evaluate("websearch", "*", ruleset).action === "allow"`, no `search` mark for the session×model.
- Failure state is in-process, keyed by `sessionID` + `providerID` + `model.id` + `model.api.id`, bounded.
- 401/402/429, quota and auth errors never count as search failures.
- Codex fallback sources come only from `url_citation` annotations and `web_search_call` sources, never from URLs in answer text.
- Tests and docs use synthetic values (`test/model`, `/tmp/example`); default-path tests run with `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE` unset.
- Run tests from `packages/cli`; typecheck with `bun run typecheck` there.

## Review Focus

- A session that searched natively, then switches model or loses native (marked/permission/config), must not send an orphan `server_tool_use` — expect text replay. (Task 3 + Task 4 tests)
- Abort by the user during a native request must not mark the model failed. (Task 2 test `abort is not a search failure`)
- MaxMode candidate requests (`retryScope` set) still get the one-shot native fallback. (Task 4 test)
- A `fallback` entry naming a non-Responses model or unknown variant is skipped, not fatal. (Task 6 test)
- A provider web_search result larger than the 50 KB replay cap downgrades to text instead of dropping the result block. (Task 3 test)

---

### Task 1: `websearch` config schema and resolution

**Files:**
- Modify: `packages/cli/src/config/config.ts` (top-level `Info`, beside `experimental`)
- Create: `packages/cli/src/tool/websearch/native.ts` (resolution part)
- Test: `packages/cli/test/tool/websearch-native.test.ts`
- Regenerate: `packages/sdk/src/v2/gen/*` via `./packages/sdk/script/build.ts`

**Interfaces:**
- Produces (config): `websearch?: { native?: Record<string, boolean | { replay?: "native" | "text" }>; fallback?: Array<string | { model: string; variant?: string }> }` with `annotate({ description })` on each field.
- Produces (`native.ts`):
  - `export const TOOL_NAME = "web_search"`
  - `export type Route = { replay: "native" | "text" }`
  - `export function route(config: Config.Info["websearch"], model: Provider.Model): Route | undefined` — `provider/model` key beats `provider`; `false` → undefined; unsupported SDK → undefined.
  - `export type FallbackEntry = { providerID: string; modelID: string; variant?: string }`
  - `export function fallbackEntries(config: Config.Info["websearch"]): FallbackEntry[]` — malformed refs dropped.
  - `export function exposed(config: Config.Info["websearch"]): boolean` — any enabled native entry or non-empty fallback.

- [ ] **Step 1: Write failing tests** in `websearch-native.test.ts` (`describe("websearch.native.route")`):
  - `provider key enables every model of that provider` → `route({ native: { "test": true } }, model(providerID "test", npm "@ai-sdk/openai"))` equals `{ replay: "native" }`.
  - `provider/model key overrides provider key` → `{ native: { test: true, "test/model": false } }` → `undefined`; `{ "test/model": { replay: "text" } }` → `{ replay: "text" }`.
  - `unsupported sdk is ignored` → npm `@ai-sdk/openai-compatible` → `undefined`.
  - `no config means no route` → `route(undefined, …)` → `undefined`.
  - `fallbackEntries parses strings and objects` → `["test/model", { model: "test/other", variant: "low" }, "bad"]` → `[{providerID:"test",modelID:"model"},{providerID:"test",modelID:"other",variant:"low"}]`.
  - `exposed` → false for `undefined` and `{ native: { test: false } }`; true for `{ fallback: ["test/model"] }`.
- [ ] **Step 2: Run** `bun test test/tool/websearch-native.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** the schema in `config.ts` and the four exports above in `native.ts`.
- [ ] **Step 4: Run** the test → PASS; `bun run typecheck` → exit 0.
- [ ] **Step 5: Regenerate SDK** `./packages/sdk/script/build.ts` (from repo root); `git diff --stat packages/sdk` shows only the `websearch` config type additions.
- [ ] **Step 6: Commit** `feat(compat): add websearch native/fallback config`.

### Task 2: Failure state, classification and tool injection

**Files:**
- Modify: `packages/cli/src/tool/websearch/native.ts`
- Test: `packages/cli/test/tool/websearch-native.test.ts`

**Interfaces:**
- Consumes: `route`, `TOOL_NAME` (Task 1).
- Produces:
  - `export type FailureKind = "search" | "replay"`
  - `export function mark(sessionID: string, model: Provider.Model, kind: FailureKind, reason: string): boolean` — true only when newly marked; logs `log.warn("native web search fallback", { kind, reason, providerID, modelID })`.
  - `export function failures(sessionID: string, model: Provider.Model): { search?: string; replay?: string }`
  - `export function classifyError(error: unknown, input: { beforeOutput: boolean; nativeActive: boolean }): { kind: FailureKind; reason: string } | undefined`
  - `export function classifyEvent(event: { type: string; toolName?: string; providerExecuted?: boolean; output?: unknown; error?: unknown }): string | undefined`
  - `export function apply(input: { config: Config.Info["websearch"]; model: Provider.Model; sessionID: string; ruleset: Permission.Ruleset; ephemeral?: boolean; small?: boolean; tools: Record<string, Tool>; activeTools: string[] }): { tools: Record<string, Tool>; activeTools: string[]; route: Route | undefined }` — when injecting: `tools[TOOL_NAME] = openai.tools.webSearch({})` or `anthropic.tools.webSearch_20250305({})`, push `TOOL_NAME` to `activeTools`, drop `"websearch"` from `activeTools`; returns `route` (with `replay: "text"` forced when a `replay` mark exists). Inputs are never mutated.

Classification rules (`classifyError`, only when `nativeActive`):
- `replay`: status 400 and message/body matches `/encrypted_content|search_result/i`.
- `search`: 4xx (not 401/402/429) and message/body matches `/web_search|server[_ ]tool|tool[_ ]?type|unsupported tool/i`; or an AI SDK type-validation error whose text matches `/tool_result|server_tool_use|web_search/`; or `beforeOutput` and a timeout (`ETIMEDOUT`, `/timed? ?out/i`, `TimeoutError`).
- Never: `AbortError` from the caller, 401/402/429, `/quota|billing|insufficient|invalid[_ ]?api[_ ]?key|unauthorized/i`.

`classifyEvent`: returns a reason for `tool-error` with `toolName === TOOL_NAME`; for `tool-result` with `providerExecuted` and output whose `type` is `web_search_tool_result_error` (or `errorCode` present) or `status === "failed"`.

- [ ] **Step 1: Write failing tests** (`describe("websearch.native.runtime")`):
  - `marks once per session and model` → first `mark` true, second false; `failures` returns the reason; another sessionID returns `{}`.
  - `replay rejection` → `APICallError` 400 body `Invalid \`encrypted_content\` in \`search_result\` block` → `{ kind: "replay" }`.
  - `tool rejection` → 400 `unsupported tool type: web_search_20250305` → `{ kind: "search" }`.
  - `nonstandard stream block` → `TypeValidationError` with value containing `"type":"tool_result"` → `{ kind: "search" }`.
  - `hang before output` → `new Error("Request timed out")`, `beforeOutput: true` → `search`; `beforeOutput: false` → `undefined`.
  - `abort is not a search failure` → `DOMException("Aborted","AbortError")` → `undefined`.
  - `auth and rate limits are not search failures` → 401, 429, 400 `insufficient_quota web_search` → `undefined`.
  - `inactive native never classifies` → any of the above with `nativeActive: false` → `undefined`.
  - `classifyEvent` → anthropic error output `{ type: "web_search_tool_result_error", errorCode: "unavailable" }` → reason string; a normal results array → `undefined`.
  - `apply injects provider tool and hides websearch` → openai model, config enabled, allow ruleset, tools `{ websearch, read }`, active `["websearch","read"]` → active `["read","web_search"]`, `tools.web_search.type === "provider"`, `tools.websearch` still present.
  - `apply skips` for each: `ephemeral`, `small`, no `websearch` in tools, ruleset `websearch: ask`, after `mark(..., "search")` → input returned unchanged, `route` undefined.
  - `apply keeps native after replay mark` → after `mark(..., "replay")` → injected, `route.replay === "text"`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** state (a `Map<string, Map<string, {search?: string; replay?: string}>>` capped at 500 sessions, oldest evicted), `classifyError`, `classifyEvent`, `apply`.
- [ ] **Step 4: Run** → PASS; typecheck exit 0.
- [ ] **Step 5: Commit** `feat(compat): classify native web search failures and inject provider tool`.

### Task 3: Replay downgrade and readable result display

**Files:**
- Modify: `packages/cli/src/tool/websearch/native.ts`
- Test: `packages/cli/test/tool/websearch-native.test.ts`

**Interfaces:**
- Produces:
  - `export function downgradeReplay(prompt: LanguageModelV3Prompt, keepNative: boolean): LanguageModelV3Prompt` — in assistant messages, each `tool-call` with `providerExecuted` and `toolName === TOOL_NAME` plus its matching `tool-result` becomes one `{ type: "text", text }` part at the call's position, unless `keepNative` and the result output is `{ type: "json" }`. A `tool-result` without a call is also converted. Other parts are untouched; returns the same array reference when nothing changed.
  - `export function display(output: unknown): string | undefined` — readable text for an SDK web_search result (Anthropic results array, OpenAI `{ action: { query, sources } }`, or error output); `undefined` for anything else.
- Text format (both functions):

```text
[web_search] "<query or (unknown query)>"
1. <title or url> — <url>
```

Error output renders `[web_search] failed: <errorCode>`. No `encryptedContent` ever appears.

- [ ] **Step 1: Write failing tests** (`describe("websearch.native.replay")`):
  - `keeps native replay when allowed` → anthropic pair with json output, `keepNative: true` → returned prompt `===` input.
  - `downgrades when native is off` → same pair, `keepNative: false` → assistant content has one text part starting `[web_search] "bun latest"` containing `https://example.com/a` and not containing the encrypted string `ENC`.
  - `downgrades text output even when native is allowed` → output `{ type: "text", value: "…" }` (cross-model / over-cap shape), `keepNative: true` → text part.
  - `openai action shape` → output json `{ action: { type: "search", query: "q", sources: [{ type: "url", url: "https://example.com/b" }] } }`, `keepNative: false` → text contains `"q"` and the URL.
  - `display` → anthropic results → two numbered lines; error output → `[web_search] failed: unavailable`; plain string → `undefined`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** both functions.
- [ ] **Step 4: Run** → PASS; typecheck exit 0.
- [ ] **Step 5: Commit** `feat(compat): downgrade native web search replay to text`.

### Task 4: Wire native search into `LLM.stream` and preflight

**Files:**
- Modify: `packages/cli/src/session/llm.ts` (`run` after `activeTools` is computed; `transformParams`; `attempt` event map; `stream` `retryRequest` before the `input.retryScope` early return)
- Modify: `packages/cli/src/session/prompt.ts` (preflight `wireTools` in `runStep`)
- Test: `packages/cli/test/session/llm-native-websearch.test.ts` (own `Bun.serve` queue, same pattern as `test/session/llm.test.ts`)

**Interfaces:**
- Consumes: `apply`, `mark`, `failures`, `classifyError`, `classifyEvent`, `downgradeReplay` (Tasks 2–3).
- Behavior:
  - `run`: `const native = NativeWebSearch.apply({ config: cfg.websearch, model: input.model, sessionID: input.sessionID, ruleset: Agent.runtimePermission(input.agent, input.permission), ephemeral: input.ephemeral, small: input.small, tools, activeTools })`; use its `tools`/`activeTools` for `streamText`; expose `nativeActive = native.route !== undefined` to the caller of `run` (add to the returned object).
  - `transformParams`: after `ProviderTransform.message`, `prompt = downgradeReplay(prompt, native.route?.replay === "native")`.
  - `attempt`: for each event, `classifyEvent` → `mark(..., "search", reason)`; for `error` events, `classifyError(event.error, { beforeOutput: !hasProviderOutput, nativeActive })` → `mark(kind)`.
  - `retryRequest`: on primary failure, `classifyError(primaryError, { beforeOutput: true, nativeActive })`; if it returns a kind and `mark` returns true → `retryRequest(attempt(false, true), retryCount, startedAt, prefillRepaired)` immediately (no backoff, does not consume budget); publish `onRetryStatus`/`RetryAttempt` with message `Native web search unavailable (<reason>); retrying with fallback search` under the same main-session conditions as the existing ladder.
  - Preflight: apply the same `NativeWebSearch.apply` to `LLM.resolveTools(processArgs)` / `processArgs.activeTools` before `filterActiveTools`.

- [ ] **Step 1: Write failing integration tests** (config via `tmpdir` `mimocode.json` with `websearch.native`, provider `test` on `@ai-sdk/openai` or `@ai-sdk/anthropic` pointing at the local server; agent allow-all; tools `{ websearch: tool(...) }`):
  - `responses request carries web_search and hides websearch` → captured body `tools` contains `{ type: "web_search" }`, no function named `websearch`; with `ephemeral: true` → no `web_search`.
  - `no websearch config leaves payload unchanged` → body `tools` has function `websearch`, no `web_search`.
  - `tool rejection retries once without native` → first response 400 `unsupported tool type web_search`, second 200 → two requests; second has function `websearch` and no `web_search`; drain succeeds.
  - `replay rejection retries with text replay` → anthropic messages containing a provider-executed web_search pair; first response 400 `Invalid \`encrypted_content\` in \`search_result\` block`; second request body still declares `web_search_20250305`, and its assistant content has a `text` block starting `[web_search]` and no `web_search_tool_result`.
  - `nonstandard stream block marks native failed` → anthropic SSE with text delta then `content_block_start` of `{ type: "tool_result" }`; drain fails/ends with error; a second `drain` sends no `web_search_20250305` and declares `websearch`.
  - `max-candidate scope still falls back` → `retryScope: "max-candidate"`, 400 tool rejection then 200 → two requests.
  - `fallback after model switch replays as text` → history pair produced by another model id with text output, native enabled → assistant content text `[web_search]`, no `server_tool_use`.
- [ ] **Step 2: Run** `bun test test/session/llm-native-websearch.test.ts` → FAIL.
- [ ] **Step 3: Implement** the four wiring points and the preflight change.
- [ ] **Step 4: Run** → PASS. Mutation check: revert the `retryRequest` branch only → `tool rejection retries once without native` fails on its request-count assertion; restore.
- [ ] **Step 5: Run** existing `test/session/llm.test.ts test/session/llm-retry.test.ts test/session/llm-request-prefix.test.ts test/session/retry.test.ts` → no new failures (baseline: `retry.test.ts` "eight HTTP timeouts" times out locally, passes in CI on `9b974725`).
- [ ] **Step 6: Commit** `feat(compat): use provider-native web search in LLM.stream with in-turn fallback`.

### Task 5: Display native results in processor and TUI

**Files:**
- Modify: `packages/cli/src/session/processor.ts` (`completeToolCall`: when `structured` and `NativeWebSearch.display(output)` is defined, use it as `output`; keep `providerOutput`)
- Modify: `packages/cli/src/cli/cmd/tui/routes/session/index.tsx` (new `Match` for `NativeWebSearch.TOOL_NAME` → `InlineTool` icon `◈`, pending `Searching web...`, text `Native Web Search "<input.query>"`, result count from output line count when available)
- Test: `packages/cli/test/session/processor-effect.test.ts` (one case)

- [ ] **Step 1: Write failing test** `provider-executed web_search stores readable output and raw providerOutput` → feed a provider-executed `tool-call` + `tool-result` (anthropic results array with `encryptedContent: "ENC"`) through the processor harness used in that file; stored part `state.output` starts with `[web_search]`, does not contain `ENC`; `state.providerOutput` deep-equals the raw array.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; typecheck exit 0.
- [ ] **Step 5: Commit** `feat(compat): show native web search results readably`.

### Task 6: Codex fallback layer, chain order and tool exposure

**Files:**
- Create: `packages/cli/src/tool/websearch/codex.ts`
- Modify: `packages/cli/src/tool/websearch/index.ts`, `packages/cli/src/tool/registry.ts`
- Test: `packages/cli/test/tool/websearch.test.ts`, `packages/cli/test/tool/registry.test.ts`

**Interfaces:**
- Consumes: `fallbackEntries`, `exposed` (Task 1).
- Produces: `export const search: (input: { model: Provider.Model; language: LanguageModelV3; providerOptions: Record<string, unknown>; query: string; abort: AbortSignal }) => Effect.Effect<string | undefined>` — `generateText` with `tools: { web_search: openai.tools.webSearch({}) }`, `toolChoice: "required"`, prompt `Search the web and answer concisely with citations. Query: <query>`; returns `<answer>\n\nSources:\n1. <title> — <url>` or `undefined` when no `web_search_call` or no sources; errors become `undefined` with a warn log.
- Chain in `index.ts` (first non-undefined wins, `metadata.servedBy` set): xiaomi sidecar (unchanged condition) → each `fallbackEntries` entry whose model resolves via `Provider.Service.getModel` with `api.npm === "@ai-sdk/openai"` and, if given, an existing variant (providerOptions built as in `LLM.run`: `ProviderTransform.options` → model options → variant, then `ProviderTransform.providerOptions`) → Exa (unchanged) → `WEBFETCH_FALLBACK`.
- Registry: `websearch` also available when `NativeWebSearch.exposed(cfg.websearch)`.

- [ ] **Step 1: Write failing tests**
  - `websearch.test.ts` › `codex fallback returns answer and search sources` → local Responses server returning a `web_search_call` with sources `https://example.com/a` and a message with a `url_citation` to it plus text mentioning `https://invented.example/x`; config `websearch.fallback: ["test/model"]`; output contains `https://example.com/a`, not `https://invented.example/x`; `metadata.servedBy === "test/model"`; request body has `tools[0].type === "web_search"`, `store: false`.
  - `codex fallback without a search falls through` → server returns only a message; second fallback entry `test/second` served → output from it.
  - `invalid fallback entries are skipped` → `["test/missing", { model: "test/model", variant: "nope" }, "test/second"]` → served by `test/second`.
  - `xiaomi keeps its sidecar first` → existing test still passes with fallback configured (sidecar served, Codex server receives no request).
  - `codex failure falls through to exa` → HttpClient layer answering `mcp.exa.ai` with an SSE text frame; Codex server returns 500 → output equals the Exa frame text.
  - `registry.test.ts` › `websearch exposed when websearch config is set` → non-opencode provider, `websearch.fallback` configured, flags unset → `websearch` in available ids; without config → absent.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS (existing websearch/registry tests updated only to provide `Config`/`Provider` layers); typecheck exit 0.
- [ ] **Step 5: Commit** `feat(compat): add configurable Codex search layer to websearch`.

### Task 7: Registry entry, end-to-end check, full validation

**Files:**
- Modify: `docs/dev-compat-overrides.md` (new `DC-WEBSEARCH-001` section and table row, matching `DC-PROVIDER-001` layout; review header counts)
- Modify (user config, not repo): `~/.config/mimocode/mimocode.jsonc` gets the `websearch` block from the spec's example, with a dated `.bak` first.

- [ ] **Step 1:** Write `DC-WEBSEARCH-001`: owner, contract (spec "行为"), surfaces (spec "注册与同步"), tests (Tasks 1–6 files), delta vs main (main has no native search, no `websearch` config), evidence from Step 3.
- [ ] **Step 2:** Back up and update the user config; `bun run --cwd packages/cli dev -- debug config` (or equivalent) parses without error.
- [ ] **Step 3: E2E** with `mimo run … < /dev/null` from a `/tmp/example`-style scratch dir, prompt requiring a search then a follow-up step (e.g. search Bun's latest version, then write it to a file): relay-codex/gpt-6-luna and relay-grok/grok-4.7 (native, `web_search` part present), relay-claude/claude-fable-5-1 (native), relay-claude/claude-opus-5-5 (native, second step succeeds via text replay), relay-glm/glm-5.3 and relay-kimi/kimi-k3 (not configured → `websearch` via Codex fallback, `servedBy` relay-codex/gpt-6-luna). Record each outcome.
- [ ] **Step 4: Validate** `bun run typecheck` (packages/cli) exit 0; root lint no new errors; targeted suites from Tasks 1–6 plus `test/tool/registry-toolset.test.ts test/session/message-v2.test.ts test/provider/transform.test.ts` pass except the documented baseline; default-off proof: with no `websearch` config, Task 4's `no websearch config leaves payload unchanged` passes.
- [ ] **Step 5: Commit** `docs(compat): register DC-WEBSEARCH-001`; push branch; open PR to `dev/compat` on `onlyfeng/MiMo-Code`; dispatch `test.yml` on the branch; report CI per exact SHA.
