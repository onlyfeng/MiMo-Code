# Upstream Deviations

This is the authoritative registry of active upstream behavior that the fork
intentionally does not adopt. Read it before resolving an upstream merge that
touches any listed surface. A clean textual merge is not evidence that the fork
contract remains intact.

Each entry records the rejected behavior, the fork contract, and the evidence
required before the decision may change. Update the review record when a later
upstream synchronization re-evaluates an entry.

## Review record

- Status: active
- Scope: fork `main` and propagation from `main` to `dev/compat`
- Last reviewed: 2026-08-19
- Upstream review range: `59f25b6ee95c3463bbe5b886366822d2fb8e3c4b`..
  `fd1fd4966013288fff8a505675fb7b17f71a3922`
- Fork behavior head reviewed: `f8bad7b6a9ef3151909790b50735f305daa2c6dc`

## FD-001 — `--yolo` must not temporarily mutate delete approval state

- Status: active
- Upstream anchors: `2bff8074b572aee6dd0d0bc5e86fe5db9bff8013`, merged by
  `c8048b7c`
- Fork contract: the `run` and TUI `--dangerously-skip-permissions` entry
  points may auto-approve ordinary permission requests through their existing
  command-scoped mechanisms, but neither may implicitly enable delete
  approval. They must not set `MIMOCODE_AUTO_APPROVE_DELETE`, call
  `permission.setAutoApproveDelete(true)`, or install a callback that later
  restores a shared instance value. The explicit
  `MIMOCODE_AUTO_APPROVE_DELETE` setting and instance API remain supported;
  they are separate, deliberate controls and are not implicitly enabled by
  `--yolo`.
- Rationale: the upstream helper mutates capability state shared by sessions in
  the same instance. Concurrent runs can restore a value they do not own, an
  attached client can leave the server permissive after a crash or connection
  loss, and a state transition can race with an unrelated Bash authorization
  decision.
- Required sync check: inspect
  `packages/opencode/src/cli/cmd/run.ts`,
  `packages/opencode/src/cli/cmd/tui/thread.ts`,
  `packages/opencode/src/flag/flag.ts`,
  `packages/opencode/src/config/config.ts`,
  `packages/opencode/src/permission/index.ts`,
  `packages/opencode/src/server/routes/instance/permission.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/tool/bash.ts`, the related CLI/TUI yolo, permission,
  Bash, and HTTP route regression tests, and the generated SDK/API artifacts
  for the explicit instance control.
- 2026-08-19 review: #2151's independent ask timeout was adopted without
  making skip-all cover `bash_delete`. #2159's child-process environment
  isolation was adopted with an additional fail-closed rule: delete targets
  derived from shell environment expansion (`~`, PowerShell `$`, or cmd `%`)
  cannot earn the temporary-directory exemption, because authorization and the
  final child environment may otherwise differ.
- Reconsider only if: delete authorization becomes request- or session-scoped,
  ownership and restoration are linearizable, caller loss cannot leave a
  capability enabled, and the Bash decision is bound to the same immutable
  authorization snapshot.

## FD-002 — reported instruction content must reach the model by default

- Status: active
- Upstream anchor: `ada544a352337a1c0ce796234fc86e7438e2f7e9`, merged by
  `8fa7e8d4`
- Fork contract: do not add a default-off
  `MIMOCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT` gate around runtime environment or
  instruction-file additions. Runtime environment additions must be present in
  the corresponding model request, and every non-empty instruction file shown
  by the TUI's `TuiEvent.InstructionsLoaded` toast must contribute its loaded
  content to that request.
- Rationale: the upstream gate can publish an `InstructionsLoaded` UI event
  while omitting the same `AGENTS.md`, `CLAUDE.md`, or environment content from
  the model's system prompt. That is a false capability signal and silently
  removes constraints the user believes are active.
- Required sync check: inspect
  `packages/opencode/src/cli/cmd/tui/app.tsx`,
  `packages/opencode/src/flag/flag.ts`,
  `packages/opencode/src/session/instruction.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/session/llm.ts`,
  `packages/opencode/src/session/max-mode.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/session/processor.ts`,
  `packages/opencode/src/session/system.ts`,
  `packages/opencode/test/session/instruction.test.ts`,
  `packages/opencode/test/session/llm-request-prefix.test.ts`,
  `packages/opencode/test/session/llm-system-prompt.test.ts`,
  `packages/opencode/test/session/llm.test.ts`,
  `packages/opencode/test/session/max-mode.test.ts`,
  `packages/opencode/test/session/processor-effect.test.ts`,
  `packages/opencode/test/session/prompt-effect.test.ts`, and
  `packages/opencode/test/session/system.test.ts`. Verify both the published
  instruction paths and the actual model-request additions on normal and
  MaxMode paths.
- Follow-up verification gap: no current regression binds the user-visible
  `InstructionsLoaded` file list to the downstream `streamText` system request
  in one scenario. Before adopting an upstream change to these surfaces, add
  that coupled regression and prove the MaxMode candidate forwards the same
  system content.
- 2026-08-19 review: #2157's `MIMOCODE_CODEX_MODE` and MiMo/GPT prompt
  selection were adopted while retaining unconditional runtime environment and
  instruction additions plus the fork's skill permission/tool visibility
  filtering.
- Reconsider only if: one immutable per-request decision gates both the UI
  signal and model payload, and tests prove that both surfaces contain the same
  instruction set.

## FD-003 — Codex OAuth models retain the served 372K capacity clamp

- Status: active
- Upstream anchor: `39353dd2a39ab48f0e92c34a6f67d73ac40f136a`, merged by
  `9d54ad3c`
- Fork contract: for Codex OAuth, clamp positive `gpt-*` context limits to
  372,000 tokens without raising smaller windows. Clamp an existing
  `limit.input` as well, but do not create one; preserve `limit.context === 0`
  as the sentinel that disables overflow handling. The documented 272K value
  remains an optional cost-control budget, not a hard provider capacity.
- Rationale: removing the clamp trusts a generic catalog value that may exceed
  the ChatGPT Codex serving boundary. That can defer compaction until a request
  the backend rejects. Conversely, treating 272K as capacity confuses a pricing
  boundary with a serving limit and needlessly reduces usable context.
- Required sync check: inspect
  `packages/opencode/src/plugin/codex.ts`,
  `packages/opencode/test/plugin/codex.test.ts`,
  `packages/web/src/content/docs/config.mdx`, and the context-budget design.
  Verify that 1M-class GPT models clamp to 372K, smaller/non-GPT models are not
  raised, zero remains zero, and documentation distinguishes capacity from the
  272K billing tier.
- Reconsider only if: current Codex backend/catalog evidence proves a different
  hard serving limit and the implementation, overflow tests, and user-facing
  budget documentation are updated together.

## FD-004 — no implicit OpenAI-compatible listener on ordinary instances

- Status: active
- Upstream anchor: `b4bbe81c67f215d32bdbf1b7984928dea80b7c92`
- Fork contract: ordinary TUI, `serve`, ACP, and embedded server instances do
  not implicitly expose an OpenAI-compatible `/v1` capability surface or bind
  an extra listener merely because the process can access provider credentials.
  This fork does not adopt the upstream token registry, capability routes,
  implicit TUI listener, or related CLI/docs in this synchronization.
- Rationale: upstream mounts `/v1` on every instance server and lets the mere
  presence of an auth header bypass outer Basic auth. Token validation then
  occurs only after `InstanceMiddleware` has selected a directory and run
  `InstanceBootstrap`, so an invalid bearer can trigger configuration, plugin,
  LSP, and watcher side effects before receiving 401. The ordinary TUI also
  binds a loopback listener without opt-in, and its shutdown disposes instances
  before closing intake, conflicting with the required retirement ordering.
- Required sync check: inspect
  `packages/opencode/src/cli/cmd/tui/thread.ts`,
  `packages/opencode/src/cli/cmd/tui/worker.ts`,
  `packages/opencode/src/cli/cmd/llm-server.ts`,
  `packages/opencode/src/llm-server/`,
  `packages/opencode/src/server/middleware.ts`,
  `packages/opencode/src/server/routes/instance/`, and all capability/token
  tests and bundled documentation. Confirm that no capability route, implicit
  listener, generated whole-server password, or address/token persistence has
  re-entered through an automatic merge.
- Reconsider only if: the feature is explicitly enabled, token validation
  completes before directory bootstrap and all side effects, request/body/
  concurrency/cost bounds are defined, and shutdown first closes intake, then
  drains or cancels active work, and only then retires the instance.
