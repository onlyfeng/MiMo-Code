# Upstream Deviations

This is the authoritative registry for active shared behavior that fork `main`
intentionally keeps instead of the corresponding upstream behavior. It lives on
`main` and `dev/compat` inherits it unchanged. Compatibility-only differences
belong to the compat overlay, not to this file.

Read this registry together with [fork-capabilities.md](fork-capabilities.md)
before every upstream synchronization, including when listed surfaces merge
cleanly. Missing identifiers remain intentionally unused; active records are not
renumbered to close gaps.

## Review record

- Status: active
- Canonical owner: fork `main`; inherited unchanged by `dev/compat`
- Last reviewed: 2026-09-01
- Upstream: `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`
- Prior reviewed upstream: `35bb2636a99b457940f1c12f2c8f5ec554369c57`
- Main behavior: `e7f40fb3a5a81f5a9efd36aa494caac3849d7896`
- Prior fork `main` tip: `cce5b8383ce812d608254dc4deecf672e2795773`
- History: [fork-registry-history.md](fork-registry-history.md)

`Upstream` and `main behavior` name the source/test trees reviewed here. A pure
registry or history commit does not advance either behavior reference.

## Sync index

| ID | Watch surfaces | Upstream relationship | Required decision |
| --- | --- | --- | --- |
| FD-001 | yolo, permission, Bash delete | Rejects shared mutable delete approval | Preserve request/instance isolation |
| FD-002 | instruction loading, model requests, and retry | Rejects default-off delivery | Preserve UI-to-request parity across attempts |
| FD-004 | instance server, `/v1`, SDK/OpenAPI | Rejects implicit listener/capability surface | Keep ordinary instances opt-in only |
| FD-005 | model identity, prompt, discovery, tools, retry | Adapts inconsistent upstream classification | Preserve one resolved identity |
| FD-006 | direct tools, nested `exec`, timeout and normalization | Selectively adopts compatibility normalization | Preserve authority and size/unit boundaries |
| FD-009 | actor/checkpoint context capture, retry, resume | Rejects live-context fallback | Fail before child execution and reuse frozen membership |

## FD-001 — `--yolo` must not mutate delete approval state

- Status: active
- Canonical owner: fork `main` permission and Bash authorization boundary
- Observable contract: `run` and TUI skip-permission modes may auto-approve
  ordinary requests, but they do not set `MIMOCODE_AUTO_APPROVE_DELETE`, mutate
  the instance delete-approval switch, or install restoration callbacks for
  shared state. Explicit environment and instance API controls remain separate.
- Upstream relationship: rejects the shared-state helper introduced at
  `2bff8074b572aee6dd0d0bc5e86fe5db9bff8013` and merged by `c8048b7c`.
- Watch surfaces: `packages/opencode/src/cli/cmd/run.ts`,
  `packages/opencode/src/cli/cmd/tui/thread.ts`,
  `packages/opencode/src/permission/index.ts`,
  `packages/opencode/src/server/routes/instance/permission.ts`, and
  `packages/opencode/src/tool/bash.ts`.
- Tests/evidence: `packages/opencode/test/cli/yolo.test.ts`,
  `packages/opencode/test/permission/auto-approve-delete.test.ts`,
  `packages/opencode/test/permission/skip-all.test.ts`,
  `packages/opencode/test/tool/bash.test.ts`, and
  `packages/opencode/test/cli/tui/permission-bash-delete.test.tsx` exercise the
  split controls and deletion boundary.
- Review basis: upstream `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`;
  main behavior `e7f40fb3a5a81f5a9efd36aa494caac3849d7896`.
- Retirement condition: delete authorization becomes request- or
  session-scoped, ownership/restoration is linearizable, caller loss cannot
  leave it enabled, and Bash evaluates the same immutable authorization state.

## FD-002 — reported instruction content reaches the model by default

- Status: active
- Canonical owner: fork `main` instruction and request-construction pipeline
- Observable contract: runtime-environment additions and every non-empty
  instruction file reported by `TuiEvent.InstructionsLoaded` are included in
  the corresponding normal and MaxMode model requests. A default-off dynamic
  system-prompt flag cannot make the UI report content that the request omits.
  Request, live-step, and MaxMode retries reuse the same resolved instruction
  set; retry configuration cannot suppress or replace it between attempts. A
  deliberate instruction-disable flag suppresses both model-visible instruction
  content and the corresponding `InstructionsLoaded` event, while the dynamic
  environment block remains independently opt-in. A
  session-level `replace-agent` base applies only to main and positively
  identified peer actors. Subagents, system-spawned actors, ephemeral requests,
  and unknown actor identities retain their own agent prompt; identity override
  fails closed even though checkpoint responsibility separately fails open.
- Upstream relationship: rejects the default-off gate anchored at
  `ada544a352337a1c0ce796234fc86e7438e2f7e9` and merged by `8fa7e8d4` while
  retaining compatible request-prefix improvements and adapting upstream's
  actor-scoped `replace-agent` correction to fail closed for unknown identity.
- Watch surfaces: `packages/opencode/src/cli/cmd/tui/app.tsx`,
  `packages/opencode/src/session/instruction.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/session/llm.ts`,
  `packages/opencode/src/session/max-mode.ts`,
  `packages/opencode/src/session/prompt.ts`, and
  `packages/opencode/src/session/system.ts`.
- Tests/evidence: `packages/opencode/test/session/instruction.test.ts`,
  `packages/opencode/test/session/llm-request-prefix.test.ts`,
  `packages/opencode/test/session/llm-system-prompt.test.ts`,
  `packages/opencode/test/session/replace-agent-subagent.test.ts`,
  `packages/opencode/test/session/max-mode.test.ts`, and
  `packages/opencode/test/session/prompt-effect.test.ts` bind the reported file
  set to normal and MaxMode request payloads.
- Review basis: upstream `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`;
  main behavior `e7f40fb3a5a81f5a9efd36aa494caac3849d7896`.
- 2026-08-27 follow-up: adopted the main/peer scope but separated identity
  replacement from checkpoint responsibility. The former requires positive
  main/registered-peer evidence; the latter retains its deliberate fail-open.
- Retirement condition: one immutable per-request decision controls both the UI
  signal and model payload, with regressions proving identical instruction sets
  and positive main/peer evidence before a session base replaces actor identity.

## FD-004 — ordinary instances expose no implicit OpenAI-compatible listener

- Status: active
- Canonical owner: fork `main` instance-server and generated API boundary
- Observable contract: ordinary TUI, `serve`, ACP, and embedded instances do
  not mount an implicit `/v1` capability surface or bind an additional listener
  merely because provider credentials exist. Fork SDK/OpenAPI artifacts are
  generated from that source behavior.
- Upstream relationship: rejects the listener and capability surface anchored
  at `b4bbe81c67f215d32bdbf1b7984928dea80b7c92`; compatible upstream APIs remain
  independently adoptable.
- Watch surfaces: `packages/opencode/src/cli/cmd/tui/thread.ts`,
  `packages/opencode/src/cli/cmd/tui/worker.ts`,
  `packages/opencode/src/cli/cmd/llm-server.ts`,
  `packages/opencode/src/llm-server/`,
  `packages/opencode/src/server/middleware.ts`,
  `packages/opencode/src/server/routes/instance/`, `packages/sdk/openapi.json`,
  `packages/sdk/js/src/v2/gen/`, and `script/generate.ts`.
- Tests/evidence: instance-server, capability/token, middleware, shutdown, and
  generated-artifact checks at the reviewed main behavior; the JavaScript SDK
  is regenerated with `./packages/sdk/js/script/build.ts` rather than copied
  from upstream. `packages/opencode/test/server/openapi-refs.test.ts` checks both
  runtime and published OpenAPI recovery/resume operations remain main-only and
  omit their upstream agent/task selectors.
- Review basis: upstream `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`;
  main behavior `e7f40fb3a5a81f5a9efd36aa494caac3849d7896`.
- Retirement condition: the listener is explicit opt-in, authentication
  completes before directory bootstrap or other side effects, resource bounds
  are defined, and shutdown closes intake before draining and retiring instances.

## FD-005 — one resolved MiMo identity selects prompt, discovery, and tools

- Status: active
- Canonical owner: fork `main` model-mode resolution boundary
- Observable contract: prompt selection, MCP discovery, registry filtering,
  frozen prefix capture, agent generation, and `exec` dispatch classify MiMo
  from the complete resolved `(model.id, model.api.id, model.family)` identity
  with the same harness precedence. Exact MiMo v2.5 identities win over generic
  aliases. MiMo Responses transport is selected only by a resolved PTC identity;
  transport never selects the Codex harness/toolset, and an explicit session or
  process harness remains authoritative. Unrelated GPT-4 families do not gain
  Codex tools through API/family aliases. Request, live-step, and MaxMode retry
  policy reuse that same resolved identity instead of independently
  reclassifying the model between attempts.
- Upstream relationship: adapts the classification introduced at
  `866a5b8a2eff3970a0becb0d27f8f055e4624e19` and merged by
  `b15b0971846861a4b25576d340ce1a4207f87712`; upstream's separate fallbacks are
  not authoritative for fork request behavior.
- Watch surfaces: `packages/opencode/src/tool/gpt.ts`,
  `packages/opencode/src/provider/provider.ts`,
  `packages/opencode/src/session/system.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/tool/registry.ts`,
  `packages/opencode/src/tool/tool-script.ts`,
  `packages/opencode/src/agent/agent.ts`, and
  `packages/opencode/src/server/routes/instance/experimental.ts`.
- Tests/evidence: system-prompt, GPT helper, request-prefix, tool-registry,
  agent-generation, `packages/opencode/test/provider/provider.test.ts`, and
  `packages/opencode/test/tool/tool-script.test.ts` regressions cover alias
  conflicts, complete resolved identity, and explicit harness overrides.
- Review basis: upstream `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`;
  main behavior `e7f40fb3a5a81f5a9efd36aa494caac3849d7896`.
- 2026-08-27 review: adopted upstream PTC transport detection through the
  complete resolved identity while keeping transport and harness/toolset as
  separate decisions. MiMo v2.5 precedence remains authoritative even when an
  alias looks PTC-like.
- Retirement condition: the provider layer exposes one immutable model-mode
  value consumed unchanged by every prompt, discovery, registry, capture, and
  dispatch surface, with alias-conflict and GPT-4 regressions.

## FD-006 — `exec` is a composition tool, not an authority gateway

- Status: active
- Canonical owner: fork `main` direct-tool and nested-execution authority boundary
- Observable contract: GPT/Codex models retain direct permission-visible tools.
  Nested `exec` excludes `actor`, shell/control capabilities including `bash`
  and the `exec_command` alias, respects request-scoped allowlists, and keeps the
  public compute budget as `timeout_seconds` in seconds. Custom outer code
  wrappers may be normalized, but the 128 KiB raw-code limit is enforced both
  before and after normalization. Replayable nested parts are capped at 256 KiB,
  and the expanded TUI retains bounded ANSI-free outer output alongside live
  children.
- Upstream relationship: selectively adopts safe custom-exec input
  normalization from upstream while rejecting its compact single-exec authority
  model, nested shell bridge, and nested actor send-only exposure. The
  `fromExec` actor guard is retained as defense in depth, not as authority to
  expose `actor` inside `exec`.
- Watch surfaces: `packages/opencode/src/agent/prompt/generate-gpt.txt`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/tool/registry.ts`,
  `packages/opencode/src/tool/tool-script-ref.ts`,
  `packages/opencode/src/tool/tool-script.ts`,
  `packages/opencode/src/tool/tool-script.txt`,
  `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`, and
  `packages/opencode/src/cli/cmd/tui/routes/session/exec-expanded.tsx`.
- Tests/evidence: `packages/opencode/test/tool/tool-script.test.ts` covers direct
  visibility, exclusions, wrapper normalization, request allowlists,
  `timeout_seconds`, pre/post-normalization byte checks, replay schema, the
  256 KiB terminal snapshot, and close-abort-join settlement. Registry, skill,
  actor, and TUI visibility tests cover the outer authority surface;
  `packages/opencode/test/cli/tui/exec-expanded.test.tsx` covers bounded
  ANSI-free outer output with and without nested parts.
- Review basis: upstream `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`;
  main behavior `e7f40fb3a5a81f5a9efd36aa494caac3849d7896`.
- 2026-08-27 review: the incoming MiMo toolset gate was routed through FD-005's
  resolved identity. The compact single-exec authority model remains rejected;
  direct permission-visible tools and nested actor/shell/control exclusions are
  unchanged.
- 2026-08-25 fixed-cwd review: adopted removal of mutable session cwd and the
  `change_directory` tool. Relative file paths resolve against immutable
  `Instance.directory`; cross-directory work uses absolute paths or an explicit
  `workdir`. This does not broaden nested actor, shell,
  `exec_command`, or control-tool authority. FC-007 owns the positive fixed
  instance-cwd contract. The inert `SessionCwd.Event.Changed` declaration is
  retained only for SDK compatibility; no setter, clear path, or event
  publisher restores mutable cwd authority.
- 2026-08-25 review: adopted replayable nested parts and live child lifecycle
  updates while retaining the nested actor/shell/control exclusions. Early
  termination now closes admission, aborts running calls, rejects queued calls,
  joins cleanup, and persists only a bounded terminal snapshot.
- 2026-08-23 review: adopted the new upstream custom-exec wrapper
  normalization. Rejected the nested `bash`/`exec_command` bridge and its typo
  repair because they cross the authority boundary. The raw code size gate is
  retained before and after normalization.
- Retirement condition: nested execution receives an immutable request-scoped
  capability set, every nested operation remains individually permission- and
  lifecycle-attributable, shell/control tools cannot bypass direct boundaries,
  and timeout compatibility is preserved.

## FD-009 — frozen-context capture fails closed before actor execution

- Status: active
- Canonical owner: fork `main` actor/checkpoint capture authority boundary
- Observable contract: a `context: "full"` actor and every checkpoint-writer
  mode validate the required captor, non-empty inherited messages, and
  mode-specific agent metadata before child creation or watermark advancement.
  The captured system, tools, MCP membership, permissions, watermark, and model
  identity remain frozen; a qualifying child cannot fall back to live context.
  Retry, detached continuation, recovery, and resume reuse that admitted frozen
  membership and cannot recapture a later live context.
- Upstream relationship: rejects the log-and-spawn fallback anchored at
  `8e5cc8a84b91af38eefde2d2bf054216d880d82f`; fork behavior is anchored at
  `3a4a244c8af1cd455518e0226c4df12d50b9b5e9` and refined through
  `aed2e8c73478f3a22d8cbaa49a9fe107766c14d0`.
- Watch surfaces: `packages/opencode/src/actor/spawn.ts`,
  `packages/opencode/src/session/checkpoint.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/session/prefix-capture-ref.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/tool/actor.ts`, and
  `packages/opencode/src/tool/session.ts`.
- Tests/evidence: `packages/opencode/test/actor/spawn.test.ts`, checkpoint
  child-session/fork-mode/main-slice/prefix-capture/watermark tests, and
  `packages/opencode/test/session/prompt-effect.test.ts` cover failure before
  execution and preservation of frozen membership.
- Review basis: upstream `2c5cd4972c3f3cb8947a5117c7910d485e6f6179`;
  main behavior `e7f40fb3a5a81f5a9efd36aa494caac3849d7896`.
- 2026-08-28 review: adopted removal of the unimplemented `actor_id` resume
  argument from actor `spawn` and `run`. Follow-up work uses `send` only while
  the actor remains reusable. A completed ephemeral `context: "full"` actor has
  released its frozen context, so a later send fails closed and a fresh spawn
  is required; no live-context fallback is introduced.
- 2026-08-27 review: upstream session/actor-scoped fork context is an
  equivalent duplicate. The fork retains its stronger generation, cancellation,
  frozen-membership, and lifecycle implementation rather than adding a second
  context map or weakening fail-closed admission.
- Retirement condition: upstream provides an atomic capture-and-spawn protocol
  with equivalent mode-specific validation, frozen authority/membership,
  deterministic failure settlement, and proof that live-context fallback is
  impossible.
