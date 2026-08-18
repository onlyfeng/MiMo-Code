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
- Last reviewed: 2026-08-18
- Upstream review range: `2a369301d49d8af80f09b05258575b42423f4329`..
  `59f25b6ee95c3463bbe5b886366822d2fb8e3c4b`
- Fork behavior head reviewed: `815dcbd20230450fb51b0c8ea7b3df3447e01922`

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
- Reconsider only if: one immutable per-request decision gates both the UI
  signal and model payload, and tests prove that both surfaces contain the same
  instruction set.
