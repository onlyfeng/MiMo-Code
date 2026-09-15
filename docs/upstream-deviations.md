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
- Last reviewed: 2026-09-15
- Upstream: `b4cc11cd652195af9a80297ed543218f3172e6c4`
- Prior reviewed upstream: `5198ff540efb5ca9fff2baa64555324d43a721b9`
- Main behavior (runtime/tests): `874f198b5f25fdd1bc21f73bc58553ba82a2938d`
- Bundled guidance content: `3fa41ad98ac15668b2b3be899767c6498772ad4b`
- Prior fork `main` tip: `e4075dfc141df0b4141fdd817b309bb52b3bca91`
- Complete code-difference audit: [2026-09-15 report](fork-difference-audit-2026-09-15.md), with fixed Git trees, per-file ownership and open implementation gaps.
- History: [fork-registry-history.md](fork-registry-history.md)

`Upstream` remains the overall upstream review baseline. `Main behavior` names
the reviewed runtime/test tree; bundled guidance has a separate content snapshot.
Pure registry/history commits advance neither reference. The selected released
capability audit is recorded in [the model API review](released-model-api-review-2026-09-08.md).

Latest reviewed synchronization: gateway error aliases at `b4cc11cd`, with local validation and pending publication in the [follow-up record](audit-followups-2026-09-15.md). This classification affects error messages only; it grants no harness, tool or provider authorization.

Previous synchronization: 2026-09-15, the specified upstream range
`6fbb1732..5198ff54` (21 commits, 17 non-merge). The
[capability inventory](upstream-sync-2026-09-15-5198ff54.md) records six incoming
capabilities and the separately approved actor lifecycle follow-up. FC-003 is
retired by an explicit behavior decision. FD-009 retains the system frozen-context
contract; only compat exposes full-context model creation. History adopts uniform
content and one-time resumable migration, with a bounded SQLite NUL projection
correction. FD-004's previously accepted upstream behaviors remain unchanged.
This is alignment to the selected SHA, not to newer upstream commits.
Earlier per-owner behavior references remain historical where this range does
not change their implementation. The preceding review is retained in the
[shared history](fork-registry-history.md).

## Sync index

| ID     | Watch surfaces                                                                        | Upstream relationship                                                                                                                           | Required decision                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FD-001 | yolo, permission, Bash delete                                                         | Adopts startup delete approval; rejects run-driven shared switch mutation                                                                       | Preserve deny precedence and live invocation isolation                                                                                                                    |
| FD-002 | instruction disable parity, model requests, retry, and actor identity                 | Adopts default-on instruction delivery; retains residual parity and fail-closed identity boundaries                                             | Preserve disable UI/payload parity, immutable retry sets, and known-actor replacement                                                                                     |
| FD-004 | `/v1` capability route, `llm-server` CLI, listener advertisement, TUI worker listener | Adopts upstream's capability route whole; retired the fork model API with its admission, deadline and authentication-before-bootstrap hardening | Keep the operator-password bind guard, `advertiseDirectory` and the three corrections; do not restore retired hardening — recorded behaviours stay as upstream ships them |
| FD-005 | model identity, prompt, discovery, tools, retry                                       | Adapts inconsistent upstream classification                                                                                                     | Preserve one resolved identity                                                                                                                                            |
| FD-006 | compact Codex declarations and nested execution                                       | Adopts compact registration and full authorized nested Actor/interactive composition                                                            | Preserve request authority, frozen schemas, media and size/unit boundaries                                                                                                |
| FD-009 | actor/checkpoint context capture, retry, resume                                       | Rejects live-context fallback                                                                                                                   | Fail before child execution and reuse frozen membership                                                                                                                   |
| FD-010 | compaction summary acceptance                                                         | Extends upstream: recovers a think-only summary step instead of rolling the boundary back                                                       | Preserve rollback for every other failure shape and for a content-filtered step; empty steps are FD-012                                                                   |
| FD-011 | compaction request tool_choice                                                        | Rejects upstream's `"auto"`: it permits the one event the summary processor throws on                                                           | Keep tool calls disabled while summary messages cannot handle them                                                                                                        |
| FD-012 | compaction retry on an empty step                                                     | Extends upstream: retries a genuinely empty step, once by default                                                                               | Preserve the configurable non-negative limit (default 1, 0 disables) and empty-step scope                                                                                 |

## FD-001 — run approval must not toggle shared delete state

- Status: active
- Canonical owner: fork `main` permission and Bash authorization boundary
- Observable contract: dangerous TUI startup includes deletion approval,
  initialized independently from the runtime skip-all toggle. Explicit
  `bash_delete`, Bash, and external-directory denies still block execution.
  Automatic deletion approval preserves ordinary Bash/external-directory asks;
  only an actual reply or explicit forwarded one-shot approval of the full
  deletion command replaces them.
  `mimo run --yolo`, including `run --attach`, instead answers each approval
  belonging to its own live invocation with `once`; it never enables the
  server's shared delete switch, rewrites the environment, or installs a
  restoration callback. Non-yolo run rejects only its target request and ignores
  foreign asks, including other pending requests in the same session. A
  correlation UUID is not authorization and is not persisted as a
  grant. Admitted work and its current continuations/interactive children may
  carry a live scope; completion, cancellation, client loss, or selecting an
  unrelated queued user closes it and cancels its outstanding asks. Background
  routing remains independent, and MCP server-initiated sampling clears any
  scope captured by its long-lived connection before its own approval flow.
- Upstream relationship: adopts startup yolo's inclusion of delete approval
  while retaining the residual rejection of the shared-state helper introduced
  at `2bff8074b572aee6dd0d0bc5e86fe5db9bff8013` and merged by `c8048b7c`.
  Explicit environment and instance API delete controls remain supported;
  invoking `run --yolo` does not change those controls. See
  [Yolo and run approval](yolo-run-approval.md).
- Watch surfaces: `packages/opencode/src/cli/cmd/run.ts`,
  `packages/opencode/src/cli/cmd/tui/thread.ts`,
  `packages/opencode/src/cli/cmd/run-approval.ts`,
  `packages/opencode/src/session/run-approval.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/permission/index.ts`,
  `packages/opencode/src/mcp/sampling.ts`,
  `packages/opencode/src/server/routes/instance/session.ts`,
  `packages/opencode/src/server/routes/instance/permission.ts`, and
  `packages/opencode/src/tool/bash.ts`; related actor/tool bridges and generated
  SDK/OpenAPI run-correlation fields.
- Tests/evidence: `packages/opencode/test/cli/yolo.test.ts`,
  `packages/opencode/test/permission/auto-approve-delete.test.ts`,
  `packages/opencode/test/permission/skip-all.test.ts`,
  `packages/opencode/test/tool/bash.test.ts`, and
  `packages/opencode/test/cli/tui/permission-bash-delete.test.tsx` exercise the
  split controls and deletion boundary. Focused run-correlation carriers are
  `test/cli/run-approval.test.ts`, `test/session/run-approval.test.ts`,
  `test/session/prompt-effect.test.ts`, `test/tool/bash-delete-permission.test.ts`,
  `test/cli/run-yolo-attach.test.ts`, `test/server/permission-reply-scope.test.ts`,
  and `test/mcp/sampling-e2e.test.ts` under `packages/opencode`.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `c7014557445832a97248ed7b0af568e51bfd291d`.
- Retirement condition: upstream supplies equivalent deny-first startup
  semantics and live invocation correlation without toggling shared approval
  state; queued users, child lifetimes, disconnects, and long-lived MCP bridges
  cannot retain or borrow an earlier invocation's approval.

## FD-002 — reported instruction content reaches the model by default

- Status: active
- Canonical owner: fork `main` instruction and request-construction pipeline
- Observable contract: a deliberate instruction-disable flag suppresses both
  model-visible instruction content and the corresponding
  `TuiEvent.InstructionsLoaded` event. Once a normal or MaxMode request resolves
  its instruction set, request, live-step, and MaxMode retries reuse that same
  immutable set; retry configuration cannot suppress, replace, or reload it
  between attempts. A session-level `replace-agent` base applies only to main
  and positively identified peer actors. Subagents, system-spawned actors,
  ephemeral requests, and unknown actor identities retain their own agent
  prompt; identity override fails closed even though checkpoint responsibility
  separately fails open.
- Upstream relationship: `03fcb66a7ae9e2ec944214ccda3b17fc2a83139a`,
  merged by `6a2cb49cb682881843df48ed4220943bb0d7a1fb`, aligns the default:
  instruction files reach model requests without requiring
  `MIMOCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT`, while the runtime-environment block
  remains independently opt-in. The fork retains the residual disable
  event/payload parity, immutable retry-set, and unknown-identity fail-closed
  boundaries; upstream's actor-scoped `replace-agent` correction is adapted
  rather than copied because checkpoint ownership intentionally fails open.
- Provider/payload parity correction: GitLab workflow transport and
  `session.llm.request` telemetry consume the final `providerSystem`, including
  the per-turn `user.system` append/replace-agent tail, rather than the frozen
  `system` portion alone. The final provider payload and telemetry must agree;
  `test/session/llm-gitlab-workflow-system.test.ts` covers this separate FD-002
  carrier. This existing code delta was made explicit by the 2026-09-15 audit.
- POLICY-04 carrier review: the authorized skill catalog now occupies the
  frozen system tail after environment/format and before instruction files.
  FC-005 owns its schema-3 snapshot and legacy-pair migration; this placement
  does not change instruction enablement, disable event/payload parity, or
  actor identity. The separate instruction-delivery policy is not advanced by
  this selection. See [skill catalog layout](skill-catalog-system-tail.md).
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
  `packages/opencode/test/session/prompt-effect.test.ts` prove default-on normal
  and MaxMode delivery, disable event/payload parity, unchanged resolved
  instruction bytes across request/live-step/MaxMode retries, and positive
  main/known-peer versus unknown/subagent/system/ephemeral replace-agent scope.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0b665c7e681e44cac6f1a6acf18732015fb2bf86`.
- 2026-08-27 follow-up: adopted the main/peer scope but separated identity
  replacement from checkpoint responsibility. The former requires positive
  main/registered-peer evidence; the latter retains its deliberate fail-open.
- 2026-09-01 registry narrowing: default-on instruction delivery is now an
  adopted shared capability. FD-002 remains active only for disable UI/payload
  parity, immutable retry sets, and fail-closed replacement of unknown actors.
- Retirement condition: upstream proves all three residuals together: one
  immutable per-request instruction decision controls the disable UI signal and
  model payload, every request/live-step/MaxMode retry reuses that same resolved
  set, and a session base replaces actor identity only with positive main or
  registered-peer evidence.

- 2026-09-09 POLICY-02 review: registered/live-context recovery target selection,
  task consistency and missing-binding admission are integrated at `6ff976a97026610335dc367d8875a87d1d91d1a7`.
  The retained spawn task namespace, synchronous commit/ownership boundary and
  metadata-only background updates preserve existing task and message sources.
  HTTP/SDK/tool publication and actual provider/transaction regressions are
  recorded in the shared history; no cross-restart recovery is introduced.

<a id="fd-004--ordinary-instances-expose-no-implicit-openai-compatible-listener"></a>

## FD-004 — upstream's capability route, adopted whole

- Status: active (reduced to near-nothing 2026-09-14)
- Canonical owner: fork `main` instance-server boundary
- 2026-09-14 structural retirement: the fork's parallel model API is gone.
  `server/model-api.ts`, `server/api-request.ts` and
  `src/llm-server/{images,input-audio,provider-options,sdk,scope,models,error}.ts`
  are removed. Upstream mounts `CapabilityRoutes` inside `InstanceRoutes` at
  `/v1` with the same two routes, the same mandatory scoped bearer token, and a
  `protocol.ts` that already accepts `image_url` and `input_audio`. Checked
  rather than assumed: those modules were a second implementation of what
  upstream ships.
- Observable contract: aligned to upstream with the three corrections and the
  retained listener/shared boundaries listed below. Byte-for-byte upstream: `src/llm-server/{protocol,tokens}.ts`,
  `routes/instance/{capability,middleware,index}.ts`,
  `routes/instance/httpapi/server.ts`, `cli/cmd/{serve,acp,web}.ts`,
  `config/llm-server.ts`, `util/self.ts`, `node.ts`.
  Three files carry a correction rather than a fork boundary:
  `llm-server/completions.ts` one added line (the `model.options` merge),
  `server/server.ts` one changed line (the IPv6 bracket), and
  `cli/cmd/llm-server.ts` a guard on `revoke` — `--all` was answered before the
  id, so naming a token and passing `--all` deleted every one of them in
  silence. The guard tests presence rather than truthiness and also consults
  `args["--"]`, because `index.ts` sets `parserConfiguration({ "populate--": true })`
  and an id after the option terminator never reaches the positional.
  Two further deltas **predate this change**:
  - `server/server.ts` (+10/-2): the non-loopback bind guard reads
    `MIMOCODE_SERVER_OPERATOR_PASSWORD` rather than upstream's
    `MIMOCODE_SERVER_PASSWORD`, so a credential this process generated for a
    listener nobody asked for cannot authorize a non-loopback bind; and
    `Server.listen` takes `advertiseDirectory`, because upstream keys the
    advertisement on `process.cwd()` while this fork's TUI worker serves a
    directory chosen at startup, and an advertisement in the wrong bucket is
    invisible to `mimo llm-server issue` in the project it actually serves.
    This is now the ONLY use of `MIMOCODE_SERVER_OPERATOR_PASSWORD` in `src`.
  - `server/middleware.ts` (+1/-1) and `util/ssrf.ts` (+1/-1):
    `RecoveryConflictError`, and FC-010's complete `fe80::/10` range.
- Two containment call sites were aligned rather than kept. Both
  `routes/instance/middleware.ts` and `routes/instance/httpapi/server.ts` read
  `MIMOCODE_SERVER_OPERATOR_PASSWORD` where upstream reads
  `MIMOCODE_SERVER_PASSWORD_SUPPLIED`. Checked rather than assumed: in
  `flag/flag.ts` both getters read the same `operatorServerPassword` variable,
  one returning the string and the other `Boolean()` of it, so the two guards
  are the same test. The fork's spelling bought nothing and cost upstream's
  comment, which is the only place the "who supplied the credential" rule is
  written down — including its reasoning about `/v1` bypassing basic auth.
  `routes/instance/index.ts` differed only in where the capability import and
  route sat in their lists; that is pure future conflict, so it is aligned too.
- Adopted from upstream, including where it relaxes the fork: an empty `models`
  array now means "all configured models"; `function.strict` passthrough is
  dropped; the `--directory`, `--all-models`, `--capability` and `--audio-api`
  CLI flags go with upstream's CLI, so a token is issued for the process's cwd
  and callers `cd` into the project first.
- Every `Server.listen` call site now matches upstream. `acp.ts` and `web.ts`
  pass `advertise: false` and `serve.ts` carries no `--llm-server` flag, all
  three byte-identical to upstream. This was not cosmetic: adopting upstream's
  `advertise` default without upstream's opt-out call sites silently made
  `mimo acp` and `mimo web` discoverable through `llm-server issue`, because the
  fork's previous `listen` published only when the retired `llm` option was
  passed and neither command passes it. Half of upstream's design is not
  alignment. The fork-only `tui/worker-listener.ts` still advertises on purpose,
  which is what `advertiseDirectory` exists for.
- Breaking change for existing fork users: `mimo serve --llm-server` is gone.
  The flag gated only the address advertisement of a route that is always
  mounted and always demands a minted token, and it was a remnant of the
  retired fork model API. `mimo serve` now advertises like upstream, which is
  also what the bundled `capability-api.md` this fork ships already told users.
- Breaking change for existing fork users: tokens already issued stop working.
  The fork wrote `version: 2` records at the same path upstream reads as
  `version: 1`, and upstream's reader treats an unknown version as an empty
  store. Tokens are short-lived by design (default 1d sliding lifetime);
  `mimo llm-server issue` is the remedy.
- Known upstream behaviours, recorded rather than corrected. Each was measured
  during the 2026-09-14 review and left alone: upstream ships it this way, and
  the trigger is uncommon or the impact small. Revisit only with evidence that
  one of them actually fired.
  - An unbounded `c.req.json()` body read, and no server-owned concurrency cap
    or request deadline on the route. Non-streaming collection likewise
    accumulates every text and reasoning delta with no output ceiling, and
    `InstanceMiddleware` awaits a pending `InstanceBootstrap` without racing it
    against the request signal, so a disconnected client cannot settle early.
  - Provider and plugin exception text reaches the caller verbatim.
  - `provider_options` is merged as an unrestricted provider-native map, after
    the configured defaults and the selected variant, so a token holder can
    override either.
  - A remote `image_url` is handed to the SDK unvalidated, so the process can be
    made to fetch loopback, RFC1918 or metadata addresses. Preflight validation
    does not close this — the SDK fetches again later — and closing it properly
    needs a proxy download with per-hop checks.
  - The request schema is non-strict, so a field it does not declare is stripped
    before anything can refuse it, and the caller's explicit constraint is
    silently dropped: `parallel_tool_calls: false` from a client whose executor
    handles one call per turn, `modalities`/`audio` asking for audio output, and
    a message `name` distinguishing participants (declared, then discarded by
    `toModelMessages` for every role). Media sent to a model that cannot accept
    it is ignored rather than refused; `tool_choice: "required"` with no tools,
    and `image_url.detail`, are accepted and discarded; bare `input_audio`
    without `format` surfaces as a 502. Declaring and rejecting each is the
    retired validator rebuilt, which is the direction this entry exists to
    avoid; a caller who needs certainty can read the response back.
  - A completed `tool-call` the SDK marked `invalid` (malformed JSON arguments
    from the model) is appended like any other, so the response is a 200 with
    `finish_reason: "tool_calls"` and arguments the caller cannot execute. The
    caller's own `JSON.parse` is where this surfaces.
  - `llm-server issue --model` writes the requested scope without checking it
    against configured models, so a typo mints a credential that authorizes
    nothing and `token issued` still prints. Self-correcting: the next request
    returns `model_not_found`, naming the scope.
  - `test/fixture/skills/llm-endpoint-demo/SKILL.md` instructs a reader to run
    `llm-server status` and a bare `llm-server &`, neither of which exists —
    the command registers only `issue`, `list` and `revoke` behind
    `demandCommand(1)` — and offers a `--port` that belongs to `serve`. Inert:
    the fixture is not listed in `test/fixture/skills/index.json`, so discovery
    never surfaces it, and nothing else references it.
  - Inherited content collides with this fork's synthetic-value rule in two
    places, and both are left as upstream wrote them. `test/util/self.test.ts`
    asserts on install-shaped paths (`/opt`, `/Applications/My App`,
    `/home/o'brien`) rather than `/tmp/example` forms; they are generic rather
    than machine-specific, which is what the rule guards against, and they are
    chosen to exercise quoting. Bundled docs name real models — `capability-api.md`
    once, `config.md` seven times, all predating this work — so correcting the
    one this surface owns would leave it inconsistent with the corpus around it,
    and correcting all of them is a documentation-convention change rather than
    a sync.
  - `renew_argv`/`renew_command` serialize only what was passed on the command
    line, so a lifetime that came from `mimocode.json` is not pinned; if the
    config changes before expiry, the advertised renewal mints a token with
    different expiry semantics than the one it replaces. `renew_command` is also
    POSIX-only: `Self.quote` sends anything outside `[A-Za-z0-9_@%+=:,./-]`
    through single-quote escaping, so a Windows path — backslashes, usually a
    space — comes back as `'C:\Program Files\...'`, which `cmd.exe` reads as
    literal characters rather than delimiters. Bounded on purpose: upstream
    emits `renew_argv` beside it as the unquoted array a consumer should use,
    and `self.ts` says so. DC-PLATFORM-001 was checked and does not extend here;
    its scope is the ripgrep and archive fallbacks.
  - A bearer is checked for presence, not validity, before the request reaches
    the route: `AuthMiddleware` waves any non-empty `Authorization`, `x-api-key`
    or `api-key` through for `/v1`, and `CapabilityRoutes` sits inside
    `InstanceRoutes`, so `InstanceMiddleware` bootstraps the instance before the
    route's token check returns 401. On an implicit listener containment pins
    that to the served project, so the cost is one bootstrap that would happen
    anyway. On an operator-password server containment is off by upstream's
    stated choice, and a bogus bearer can aim `?directory=` at another project
    and make it bootstrap before being refused.
  - A failed address advertisement is logged, not raised: `Server.listen` wraps
    `LLMServerTokens.publish` in `.catch(log.warn)`, so the listener keeps
    serving while `llm-server issue` resolves no `base_url` for it. The miss
    surfaces there, at issue time.
  - An object-form `tool_choice` naming a tool is passed through without
    checking the name is among the declared `tools`: `toToolChoice` maps
    `{ function: { name } }` straight to `{ type: "tool", toolName }`. Whether
    the provider then errors — surfacing as the route's generic provider
    failure — or ignores the choice is the provider's decision.
  - Token verification takes no abort signal and can wait on the per-directory
    store lock (`Flock.withLock` in `tokens.ts`), so a client that disconnects
    mid-verification does not release its wait early.
  - The plugin hooks receive `message: undefined` where the contract declares it
    required; a non-finite `--ttl` becomes `null` and expires the token at once;
    non-expiring tokens accumulate without a ceiling; the address registry trusts
    pid liveness rather than probing the endpoint; a non-terminal finish reason
    is reported as `stop`.
    The initial pass took two one-line corrections, each with a mutation-checked
    test, rather than merely recording them. The subsequent CLI `revoke` guard
    listed above is the third retained correction and is not a one-line change:
  - `model.options` is merged at upstream's own precedence point, so a model
    configured in `mimocode.json` no longer behaves differently over `/v1` than
    in a session.
  - `Server.listen` brackets an IPv6 literal before assigning it to
    `URL.hostname`, which the WHATWG parser otherwise discards — verified in
    Bun: `::1` and `fe80::1` both left `"localhost"`, `[::1]` assigns. `::` was
    never affected; it is mapped to `127.0.0.1` first.

  Exception redaction was considered for the same pass and dropped: the
  recipient already holds an operator-issued token for this model, the leak
  needs a provider that echoes credential material into an error body, and
  redacting costs every legitimate caller the reason their request failed.
  Everything else above stays as recorded.

- Watch surfaces: `packages/opencode/src/server/routes/instance/capability.ts`,
  `packages/opencode/src/server/middleware.ts`,
  `packages/opencode/src/server/routes/instance/middleware.ts`,
  `packages/opencode/src/server/server.ts`,
  `packages/opencode/src/cli/cmd/llm-server.ts`,
  `packages/opencode/src/cli/cmd/tui/worker-listener.ts`,
  `packages/opencode/src/flag/flag.ts`, `packages/opencode/src/llm-server/`,
  `packages/opencode/src/config/llm-server.ts`, `packages/opencode/src/util/self.ts`.
- Fixture convention: this fork roots test fixtures outside `process.cwd()` and
  asks cases that depend on the InstanceMiddleware containment check to opt in
  with `root: "cwd"`, where upstream's preload roots every fixture under cwd.
  `implicit-listener.test.ts` carries that opt-in with a comment saying why.
- Tests/evidence: upstream's capability tests are inherited with explicit fork
  additions/adaptations: `test/llm-server/streaming.test.ts` checks model.options
  precedence, `test/cli/cmd/serve-advertise.test.ts` checks IPv6 advertisement,
  and `test/llm-server/implicit-listener.test.ts` opts into the cwd-root fixture.
  The directory and these files are not byte-identical to upstream.
  `test/util/self.test.ts` and `test/flag/dynamic-system-prompt-flag.test.ts`
  remain inherited verbatim. The fork keeps `test/cli/tui/worker-listener.test.ts` and
  `test/fixture/tui-worker-default-child.ts` for the advertise-directory delta.
- Upstream relationship: the fork tracks upstream on this surface.

## FD-005 — one resolved MiMo identity selects prompt, discovery, and tools

- 2026-09-10 config integration: host defaults merge underneath explicit user
  values before the effective parsed configuration's trusted harness declarations
  are captured. The small_model compatibility alias applies only when lite is
  absent; mutable plugin hooks still cannot grant or replace harness authority.

- Status: active
- Canonical owner: fork `main` model-mode resolution boundary
- Observable contract: prompt selection, MCP discovery, registry filtering,
  frozen prefix capture, agent generation, and `exec` dispatch classify MiMo
  from the complete resolved `(model.id, model.api.id, model.family)` identity
  with the same harness precedence. An explicit session `codex` or `default`
  selection wins first. For `auto`, an explicit process true/false forces Codex
  or the resolved default harness respectively; an unset process value preserves
  model inference. The default harness selects the model's native non-Codex
  prompt/toolset, which is not necessarily one literal prompt family.
  `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH=true` remains an independent discovery
  opt-in and may enable MCP Tool Search regardless of the resolved harness.
  Process environment selectors are startup configuration; mutating them during
  an active session is outside this contract.
  An explicitly configured `provider.<id>.models.<id>.harness_model` may name
  a canonical lower-case GPT-5-or-newer target for an opaque deployment alias.
  The parsed configuration snapshot is the sole source of this trust; catalog
  metadata, plugin model replacement, and mutable plugin config hooks cannot
  grant or replace it. Automatic inference first excludes MiMo, GPT-4, and OSS
  in any resolved identity, including tagged and namespaced identities.
  The declaration changes neither API model identity nor transport. Capture,
  run-loop, and compaction cache profiles include the optional declaration;
  an absent declaration preserves the original profile key.
  Exact MiMo v2.5 identities win over generic aliases. Transport is no longer a
  fork concern: upstream pins every MiMo id to `@ai-sdk/openai-compatible`, and
  the fork adopts that rather than routing a resolved PTC identity to the
  Responses API. Transport never selects the Codex harness/toolset. Unrelated GPT-4 families do not gain Codex tools through
  API/family aliases. Request, live-step, and MaxMode retry policy reuse that
  same resolved identity instead of independently reclassifying the model
  between attempts. Xiaomi WebSearch sidecar requests use that resolved
  model's `model.api.id`; they do not substitute a hard-coded MiMo identity.
- 2026-09-13 transport retirement: upstream `294328d7`/`b6a1008c`/`cfa07fe8`
  remove the `xiaomi` custom loader and pin any MiMo or `mimo-auto` id to
  `@ai-sdk/openai-compatible`. The fork had extended `usesMimoResponsesApi` into
  a multi-value resolver and routed PTC identities to `sdk.responses`. Adopted
  upstream's shape and retired that routing with `isMimoModel`,
  `usesMimoResponsesApi`, their tests, and the `xiaomi transport selection uses
the complete resolved model identity` case. FD-005 keeps only identity
  resolution for prompt, discovery, toolset and retry policy; it no longer owns
  API transport. Verified: `test/provider/` + `test/tool/gpt.test.ts` 581 pass.
- Upstream relationship: adapts the classification introduced at
  `866a5b8a2eff3970a0becb0d27f8f055e4624e19` and merged by
  `b15b0971846861a4b25576d340ce1a4207f87712`; upstream's separate fallbacks are
  not authoritative for fork request behavior.
- Watch surfaces: `packages/opencode/src/flag/flag.ts`,
  `packages/opencode/src/config/config.ts`,
  `packages/opencode/src/config/provider.ts`,
  `packages/opencode/src/tool/gpt.ts`,
  `packages/opencode/src/provider/provider.ts`,
  `packages/opencode/src/session/system.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/session/compaction.ts`,
  `packages/opencode/src/session/prefix-snapshot.ts`,
  `packages/opencode/src/tool/registry.ts`,
  `packages/opencode/src/tool/tool-script-ref.ts`,
  `packages/opencode/src/tool/tool-script.ts`,
  `packages/opencode/src/tool/websearch/index.ts`,
  `packages/opencode/src/agent/agent.ts`, and
  `packages/opencode/src/server/routes/instance/experimental.ts`.
- Tests/evidence: `packages/opencode/test/flag/codex-mode-flag.test.ts`,
  `packages/opencode/test/tool/harness-alias.test.ts`,
  system-prompt, GPT helper, request-prefix, tool-registry, agent-generation,
  `packages/opencode/test/provider/provider.test.ts`, and
  `packages/opencode/test/tool/tool-script.test.ts` regressions cover explicit
  unset/true/false behavior, direct GPT IDs, API/family aliases, MiMo conflicts,
  explicit session precedence, and retry reuse. The local-SSE
  `packages/opencode/test/tool/websearch.test.ts` regression binds the Xiaomi
  sidecar request to the resolved API model ID.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.
- 2026-08-27 review: adopted upstream PTC transport detection through the
  complete resolved identity while keeping transport and harness/toolset as
  separate decisions. MiMo v2.5 precedence remains authoritative even when an
  alias looks PTC-like.
- 2026-09-01 tri-state follow-up: adapted `MIMOCODE_CODEX_MODE` from a Boolean
  force-on switch to a tri-state resolved mode: unset preserves model inference,
  explicit true forces the Codex prompt/toolset, and explicit false forces the
  default harness and native non-Codex prompt/toolset even for GPT identities.
  Session-explicit mode remains authoritative. Transport selection and the
  independent MCP-search opt-in do not infer or override the harness/toolset.
  Main behavior: `0899a4802dd65c1ca98e68722a7ee0c017e5cb7c`.
- 2026-09-01 upstream convergence review: upstream `cce933568906ae670decf9a081618ebf25aa8afe`,
  merged by `d17e176ba179ea2568cdf5020bb65011aaf86493`, now recognizes an explicit
  process-level false for automatic GPT selection. Its helper still gives that
  process value and generic GPT aliases precedence over explicit session modes
  and omits the fork's complete-identity and MiMo precedence. The merge therefore
  retains `resolveHarnessMode`, the fork schema descriptions, and the stronger
  positive/negative tests as the canonical partial-duplicate resolution.
- 2026-09-02 default-model review: adopted upstream's live-registry validation,
  recent-first selection, stable usable-chat fallback, and one-time stale-config
  warning from `4f723f9988c15e31ec31f92fb23c478eb4f66218`. This selects a viable
  starting model without changing FD-005's later resolved-identity, harness,
  prompt, discovery, toolset, retry, or transport decision.
- 2026-09-02 generated-description review: upstream's regenerated harness text
  still omits explicit session precedence. The merge therefore regenerated from
  fork source and retained the FD-005 description in published OpenAPI and the
  JavaScript SDK instead of accepting the conflicting generated text.
- 2026-09-02 WebSearch convergence review: adopted upstream's use of the
  current request's `model.api.id` for Xiaomi sidecar requests instead of a
  hard-coded MiMo identifier. This preserves FD-005's resolved model identity
  through the sidecar without changing harness precedence, prompt/tool
  selection, transport classification, or alias-conflict handling.
- 2026-09-10 Xiaomi SDK-split review: adopted upstream `fc25fed05ee63e74ad157196afbdffcf0d61efe3`,
  merged by `cb00c2808043bb0c4f0a4cfc5855912d82c9abe8`. The bundled Copilot fork
  now serves `responses()` only, while chat comes from the stock
  `@ai-sdk/openai-compatible` model, so Xiaomi `reasoning_content` reaches the
  stream as reasoning parts instead of being dropped by a parser that only knows
  Copilot's `reasoning_text`. This narrows upstream toward FD-005's position and
  changes no selection authority: the fork's custom xiaomi loader still chooses
  `responses()` versus `languageModel()` from the complete resolved identity,
  and both members exist on the composed SDK object.

- Retirement condition: the provider layer exposes one immutable model-mode
  value consumed unchanged by every prompt, discovery, registry, capture, and
  dispatch surface, with alias-conflict and GPT-4 regressions.

- 2026-09-15 audit gaps and cleanup candidates: `cli/cmd/debug/agent.ts`
  passes model ID, API ID and family to the registry but omits `harnessModel`,
  unlike actual requests and the experimental tool-list route. An opaque trusted
  alias can therefore produce a different diagnostic tool list. This is an open
  carrier defect, not an exception granting a new harness policy. The unused
  fourth `CustomModelLoader` model argument also remains after the MiMo transport
  retirement; removing it is a cleanup candidate, not an unadopted feature.

## FD-006 — `exec` is a composition tool, not an authority gateway

- Status: active
- Canonical owner: fork `main` direct-tool and nested-execution authority boundary
- Observable contract: the final FD-005 Codex harness automatically advertises
  compact TypeScript tool declarations through `exec`, while the complete
  authorized implementation pool remains registered. `actor`, `question`,
  `plan_exit`, `session`, and `workflow` retain direct entries when available;
  `StructuredOutput` remains request-owned. Nested Bash/`exec_command`, task,
  skill/search, enabled cron, data and MCP calls use the pinned request pool,
  effective permissions, user toggles and agent/actor/frozen allowlists. Hidden
  direct calls retain the same gates. Codex MCP calls need no redundant search
  load; non-Codex explicit search retains its load-before-direct contract.
  Nested execution may compose all currently authorized canonical Actor
  operations, question and plan_exit; their direct entries remain available.
  JSON and shell declarations, entry validation and post-hook validation use
  the initialized native Actor schema, including its actual agent choices.
  Registered caller identity, target ownership and ordinary subagent send-only
  restrictions still apply. Internal definition identity carries canonical
  Actor and plan-exit authority: same-named custom or MCP tools cannot inherit
  it or obtain the host plan-commit callback.
  Each nested built-in permission receipt identifies the actual post-hook input and
  inherits the parent permission routing, while using the child abort signal.
  Termination closes intake, aborts and joins nested effects/finalizers and the
  script VM, including guest-only pending promises and outer Effect interruption. Frozen
  captures preserve the full pool and active subset separately; changed hidden
  or native Actor schemas fail closed before execution. Actor admission hands
  off its generation-bound cancellation handle before releasing service
  ownership. Cancellation before handoff reclaims and joins the child; a
  successful background handoff or foreground timeout preserves supervised
  work and its discoverable actor ID. Observer cancellation only stops waiting.
  Prompt-owned interactive routing sends eligible peer questions to the parent
  while preserving the original tool/message reference. Missing interaction
  authority and Never-Ask create no pending question. Plan approval is limited
  to the foreground root main plan turn: Yes atomically commits a complete
  build continuation only while its actual parent user is still latest. No,
  rejection and a superseding user do not switch agents. A committed nested
  transition records a trusted host receipt, closes tool/file admission and
  terminates the old guest before delivering its result; guest catch/finally
  code cannot continue. Pending raw-file and tool calls share this exclusion
  boundary. Question terminal cleanup is owned by FC-008; durable plan and
  Actor lifecycle settlement by FC-001. The existing resolver precedence,
  actor task source and recovery admission remain unchanged.
  The public compute budget remains `timeout_seconds` in seconds. The strict
  `exec_command` adapter uses `yield_time_ms` as a command timeout in milliseconds,
  with no background terminal resume semantics or fuzzy argument repair.
  Code is bounded at 128 KiB before and after normalization, serialized script
  return values and replayable nested records at 256 KiB each. Logs, traces and
  warnings have their separate existing bounds. The host relays at most eight
  authorized attachments totaling 10 MiB encoded data and reports omissions;
  images reach ordinary persisted FileParts and the next model request.
  Expanded TUI output remains bounded and ANSI-free. Retained validated nested
  records feed file manifests, worktree hints and repeated-failure detection.
  Snapshot compaction keeps at most 8 KiB of selected facts per child and 32
  entries per retained array; oversized fields or whole records may be omitted
  within the overall bound. Missing paths never imply a cwd mutation.
  The standalone read/glob/grep experiment remains separate and its token
  estimates establish no Codex production savings; see [current usage](codex-compact-tools.md)
  and [historical evaluation](experiments/tool-schema-2026-09-07.md).
- Upstream relationship: adapts released v0.1.14 compact registration from
  `1a0ffba7842af3f11edcb456688bbdf067407c08`, as present in the selected
  `6203ea2e` baseline. It adopts hidden tools, compact declarations and the
  nested shell adapter. POLICY-01 adopts broader nested Actor and interactive
  composition while retaining direct entries and the fork's pinned authority,
  native-schema freezing, owned cancellation and atomic plan transitions.
  Earlier dated direct-only/narrowed-Actor decisions below are superseded only
  for this selected scope.
  Existing normalization, fixed cwd, deletion approval and code/unit limits
  remain; broader upstream source and selectors are not restored.
- POLICY-01 watch additions: `packages/opencode/src/actor/spawn.ts`,
  `packages/opencode/src/actor/lifecycle.ts`, `packages/opencode/src/tool/actor.ts`,
  `packages/opencode/src/tool/tool.ts`, `packages/opencode/src/tool/plan.ts`,
  `packages/opencode/src/tool/question.ts`, and
  `packages/opencode/src/cli/cmd/tui/routes/session/plan-switch.ts`.
- Watch surfaces: `packages/opencode/src/agent/prompt/generate-gpt.txt`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/tool/registry.ts`,
  `packages/opencode/src/tool/tool-script-ref.ts`,
  `packages/opencode/src/tool/tool-script.ts`,
  `packages/opencode/src/tool/tool-script.txt`,
  `packages/opencode/src/workflow/sandbox.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/session/prefix-snapshot.ts`,
  `packages/opencode/src/session/observed-tool-parts.ts`,
  `packages/opencode/src/cli/cmd/tui/routes/session/permission.tsx`,
  `packages/opencode/script/experiments/tool-schema*.ts`,
  `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`, and
  `packages/opencode/src/cli/cmd/tui/routes/session/exec-expanded.tsx`.
- Tests/evidence: `test/tool/tool-script.test.ts` covers request-pool pinning,
  strict alias validation, canonical Bash policy hooks, child ask receipts,
  permission/allowlist exclusions, media bounds and close-abort-join.
  `test/tool/actor-exec.test.ts` covers renamed registered callers, hook narrowing,
  parent-only subagent sends, and outer interruption through VM disposal;
  `test/workflow/sandbox.test.ts` verifies active cancellation and timer/listener
  cleanup even when guest code awaits an unresolved promise. The real
  HTTP/SDK `test/session/codex-compact.test.ts` checks wire visibility, hidden
  MCP execution/denial, shell approval with no rejected write, and image delivery.
  `test/session/prompt-effect.test.ts` covers frozen hidden-schema positive and
  negative execution; registry, prefix, checkpoint, skill, TUI permission and
  `test/session/exec-effect-carriers.test.ts` cover the other carriers.
  Experiment-only tests retain their independent evidence attribution.
- 2026-09-08 POLICY-01: the selected single capability (N=1) aligns nested
  Actor/question/plan composition with source
  `0abfeba186191c1a361cf3f27b802e9d29bf0fdc` and released v0.1.14
  `2a0eb706e95a77cba34a319e9f11f33f26d4450c`, without advancing the overall
  upstream baseline. Runtime/tests and guidance: `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
  `test/tool/actor-owned-lifecycle.test.ts`, `actor-exec-lifecycle.test.ts`,
  `control-origin.test.ts`, `plan-approval.test.ts`, real
  `test/session/exec-interaction.test.ts`, and TUI plan-switch event tests
  cover the new boundaries. Local evidence and pending publication gates are
  recorded in [the history](fork-registry-history.md#2026-09-08-policy-01-full-authorized-exec-composition).
- 2026-09-08 actor composition (earlier narrowed policy): `test/tool/actor-exec.test.ts` exercises
  real inbox/status calls in JSON and shell invocation modes, trusted sender
  identity, subagent parent routing, post-hook action rejection, MCP-name
  fallback rejection and cancellation without a late send. The live Codex
  tests prove direct actor plus narrowed nested declarations, a committed
  InboxArrived event and no send when actor is disabled in the request.
- 2026-09-08 selected integration: the explicit user decision supersedes the
  earlier blanket production compact/shell rejection in the dated notes below.
  FD-006 remains active for the residual authority, control-entry, schema,
  cancellation, media and budget differences.
- 2026-09-11 attachment-bound review: upstream now bounds every inline
  attachment where it is produced — the read tool, user prompt attachments and
  MCP result normalization — at `MIMOCODE_MAX_ATTACHMENT_SIZE` (50 MB default).
  That gate sits above this entry's relay boundary and does not change it: the
  host still relays at most eight authorized attachments totaling 10 MiB
  encoded data and still reports omissions, so the stricter relay bound remains
  the one nested execution observes. `src/tool/tool-script.ts` is unchanged.

- 2026-09-05 Bash-output review: adopted the shared default of 30,000
  approximate output tokens and the unified head/tail preview with an archived
  output path. This changes direct Bash output only; nested shell exclusions,
  permission attribution, code-size gates, and timeout units remain intact.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
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
- Retirement condition: upstream preserves equivalent request-pinned authority,
  full-pool/native/active-schema freezing, direct and nested Actor/interactive
  functionality,
  child permission attribution, close-abort-join, media delivery and budget/unit
  compatibility. Fork implementation of these conditions alone does not retire
  the residual upstream difference.

## FD-009 — frozen-context capture fails closed before actor execution

- Status: active
- Canonical owner: fork `main` frozen-context runtime authority boundary
- Observable contract: internal `context: "full"` actors (including session-ask
  fork queries) and every checkpoint-writer mode validate the required captor, non-empty inherited messages, and
  mode-specific agent metadata before child creation or watermark advancement.
  The captured system, tools, MCP membership, permissions, watermark, and model
  identity remain frozen; a qualifying child cannot fall back to live context.
  Retry, detached continuation, recovery, and resume reuse that admitted frozen
  membership and cannot recapture a later live context.
  The complete authorized tool pool is frozen separately from its advertised
  names, so compact tools remain executable without gaining newly registered
  or parent-disabled members. Rebinding a hidden tool requires its frozen input
  schema to match; changed schemas fail closed. Canonical Actor definitions
  retain the complete native input contract separately from provider wire
  schemas. Warm and cold capture serialize and hash it; rebinding requires
  equality. A legacy JSON snapshot may prove this contract only through an
  exact match between saved wire and current canonical native schemas. A
  legacy shell script wrapper cannot prove it and fails closed; existing
  full-context actors/resume do not repair it from a live registry. Internal
  native metadata is not appended to provider request schemas. Warm capture
  and cold checkpoint writers carry the model identity produced by their
  corresponding prefix capture.
  Explicit `actor resume <actor-id>` requires a controllable registered
  persistent actor retaining its full context in the original receiver Instance
  and undisposed run scope. A changed API/family/harness identity, released
  context, explicit cancellation, or process restart rejects recovery. It does
  not rebuild released context. The public recovery/resume API accepts `agentID`
  only through this same constrained actor admission. It accepts registered
  same-session targets beyond direct main children and peers through their own
  session or original parent. POST/tool task_id validates the persisted binding
  or atomically fills a missing value using retained spawn task provenance;
  another binding is never overwritten. Task validation, claim, user binding
  and old assistant settlement commit together before supervisor handoff.
  Only an explicit full-context persistent spawn selects retained context;
  the existing ephemeral release policy remains unchanged.
  Successful internal retry/compaction writes can continue the admitted task
  without recapturing its frozen context. Their exact conditional-write receipt
  advances only this runner's current parent; another hook user or a failed
  conditional write cannot grant recovery authority.
- 2026-09-15 model-entry alignment: main adopts upstream `799bc409` and
  exposes neither `context` nor dependent persistent creation on actor spawn/run.
  The earlier upstream model-entry failure (missing `ForkContext`) was already
  corrected here; the removal follows the approved branch ownership policy.
  Dev/compat owns the explicit model-facing extension. Checkpoint writers,
  session-ask fork queries and qualifying existing actor recovery continue to
  use this shared frozen-context contract; removing the model parameter does
  not retire their admission or native-schema checks.
- Upstream relationship: rejects the log-and-spawn fallback anchored at
  `8e5cc8a84b91af38eefde2d2bf054216d880d82f`; fork behavior is anchored at
  `3a4a244c8af1cd455518e0226c4df12d50b9b5e9` and refined through
  `aed2e8c73478f3a22d8cbaa49a9fe107766c14d0`.
- Watch surfaces: `packages/opencode/src/actor/spawn.ts`,
  `packages/opencode/src/session/checkpoint.ts`,
  `packages/opencode/src/session/compaction.ts`,
  `packages/opencode/src/session/llm-request-prefix.ts`,
  `packages/opencode/src/session/prefix-capture-ref.ts`,
  `packages/opencode/src/session/prefix-snapshot.ts`,
  `packages/opencode/src/session/prompt.ts`,
  `packages/opencode/src/tool/actor.ts`, and
  `packages/opencode/src/tool/session.ts`.
- POLICY-01 watch additions: `packages/opencode/src/tool/tool.ts`,
  `packages/opencode/src/tool/registry.ts`, `packages/opencode/src/tool/tool-script.ts`,
  and `packages/opencode/src/session/session.sql.ts` (optional internal snapshot
  JSON metadata, not a new public API or database-column migration).
- Tests/evidence: `packages/opencode/test/actor/spawn.test.ts`, checkpoint
  child-session/fork-mode/main-slice/prefix-capture/watermark tests, and
  `packages/opencode/test/session/prompt-effect.test.ts` cover failure before
  execution and preservation of frozen membership.
  The actor spawn suite also exercises owned compaction and invalid-output
  continuations, a same-source foreign hook user, and a lost compaction write.
- 2026-09-08 POLICY-01: real cold capture, JSON roundtrip, full-context Actor
  and SDK execution cover matching native schemas, changed agent enums,
  legacy shell rejection and exact legacy JSON compatibility. The request
  wire excludes nativeInputSchema. Existing full/active membership and model
  identity checks remain independent of the new native contract.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
- 2026-08-28 review: adopted removal of the unimplemented `actor_id` resume
  argument from actor `spawn` and `run`. Follow-up work uses `send` only while
  the actor remains reusable. A completed ephemeral `context: "full"` actor has
  released its frozen context, so a later send fails closed and a fresh spawn
  is required; no live-context fallback is introduced.
- 2026-08-27 review: upstream session/actor-scoped fork context is an
  equivalent duplicate. The fork retains its stronger generation, cancellation,
  frozen-membership, and lifecycle implementation rather than adding a second
  context map or weakening fail-closed admission.
- 2026-09-12 wake-routing note: FC-001 retired its continuation wake-generation
  routing in favour of upstream's `ActorExecution` claim. Frozen-context capture
  and the resolved-model/harness identity checks are unaffected: actor recovery
  and resume still validate the frozen identity before admission, and the
  retirement changes only which primitive serializes a woken turn.
- 2026-09-11 resume model-override review: upstream's new resume model override
  would replace the model a recovered turn runs on. A frozen actor keeps its
  original resolved identity, so the HTTP route refuses an override for a
  non-main `agentID` rather than applying it, and the run loop's existing
  `resumeIdentity` comparison still fails closed behind that refusal. Main
  resume, which has no frozen identity, accepts the override.
- Retirement condition: upstream provides an atomic capture-and-spawn protocol
  with equivalent mode-specific validation, frozen authority/membership,
  deterministic failure settlement, and proof that live-context fallback is
  impossible.

- 2026-09-09 POLICY-02 review: registered/live-context recovery target selection,
  task consistency and missing-binding admission are integrated at `6ff976a97026610335dc367d8875a87d1d91d1a7`.
  The retained spawn task namespace, synchronous commit/ownership boundary and
  metadata-only background updates preserve existing task and message sources.
  HTTP/SDK/tool publication and actual provider/transaction regressions are
  recorded in the shared history; no cross-restart recovery is introduced.

## FD-010 — a think-only compaction step is recovered, not discarded

- Status: active
- Canonical owner: fork `main` compaction summary acceptance boundary
- Observable contract: when the compaction step finishes with no text part but
  carries reasoning, that reasoning is adopted as the summary and persisted as a
  synthetic text part, so the boundary stands and the session drops below the
  trigger — EXCEPT when the step finished with `content-filter`, which is
  rejected before any of the step's content is inspected, with or without text.
  Every other failure shape keeps upstream's rollback exactly: provider
  overflow, repeated text, and a blocked or errored step. A step that produced
  nothing at all is NOT decided here — it is retried first under
  [FD-012](#fd-012--a-compaction-step-that-produced-nothing-is-retried-once-by-default) and
  reaches this rollback only once that retry is exhausted. The fallback never
  fabricates a summary — it only promotes content the model actually produced.
- Finish-reason boundary (a rejection list, so each entry is a recorded
  judgement rather than an accident): `content-filter` REJECTS, with or without
  text — the provider withheld the answer, so whatever leaked out before the
  filter fired is withheld content too, and adopting any of it would replay
  suppressed content back to the model as trusted summary and drop the real
  history it replaced; that branch persists and publishes `ContentFilterError`,
  matching the discriminant the conversation path uses, and still rolls the
  boundary back. The check runs BEFORE any content inspection, mirroring the
  ordering `classify.ts` uses and documents for the conversation path: a step
  whose status already disqualifies it must not be re-judged as usable because
  it also carried content.

  `error` REJECTS on the same terms, writing `ModelError` — the discriminant the
  conversation path uses for `failed`. `LanguageModelV2FinishReason` defines it
  as "model stopped because of an error", and a provider can report it IN BAND
  without throwing, in which case nothing marks the message errored and
  `process()` returns `"continue"`. No adapter in tree maps a wire value onto it
  today (openai-compatible sends unknown reasons to `"other"`), so the guard is
  defensive and cannot be reached end-to-end; it is unit-tested through the
  exported `isTerminalCompactionFinish` instead. **Do not remove it as dead code
  on that basis** — `classify.ts` guards the same value for the same reason.

  `tool-calls` is genuinely unreachable: a tool call from a summary message
  throws in the processor and arrives as `"stop"`. `stop`, `length` and `other`
  are adopted: truncated or abnormally-finished is not suppressed, and a partial
  summary beats losing the session.

- Why nothing upstream catches this: `classify.ts` short-circuits on
  `assistant.summary` before it inspects the finish reason, so every safety
  branch the conversation path relies on is skipped for a compaction message by
  construction. A future finish reason must be judged here explicitly.
- Rationale: upstream's conversation path already classifies this response shape
  and retries it (`SessionPrompt.autoContinueInvalidOutput`, reason
  "think-only"), but compaction has no retry and rolls back on the first miss.
  Because compaction is the only way back down once usage passes the trigger,
  that single miss pins the session above it: `/compact` reports "Compaction
  produced no usable summary" and changes nothing, and every subsequent turn
  fails identically. Reasoning models are most likely to produce this shape on
  precisely this task, since a summary prompt invites the model to spend the
  step recapping. The reasoning IS the requested recap, so adopting it is
  strictly better than discarding a turn that cannot be retried.
- Upstream relationship: extends upstream `compaction.ts`. The three rollback
  branches above the fallback are unchanged, so an upstream change to any of
  them merges cleanly; only the final no-text branch differs.
- Verification: `test/session/compaction-reasoning-fallback.test.ts` drives the
  real overflow path against a scripted provider under six response shapes —
  think-only (boundary survives, reasoning reaches the projection), empty
  (rolled back, but only once FD-012's retry is exhausted), normal text
  (unchanged), content-filtered with reasoning
  only (never reaches the projection, boundary rolls back, `ContentFilterError`
  rather than the generic rollback error), content-filtered with partial text
  (same rejection — the guard is not confined to the no-text branch), and
  output-limited (`length` stays adopted, so the filter guard cannot quietly
  widen to cover truncation). The
  The empty-step cases belong to [FD-012](#fd-012--a-compaction-step-that-produced-nothing-is-retried-once-by-default).
- Retirement condition: upstream gives compaction its own retry or an equivalent
  recovery for a summary step that carries reasoning but no text.

## FD-011 — the compaction request keeps tool calls disabled

- Status: active
- Canonical owner: fork `main` compaction request construction
- Observable contract: the compaction request is sent with
  `toolChoice: "none"` while still carrying the frozen tool list, so the prefix
  stays cache-identical to the conversation request without inviting a tool call
  the summary path cannot service.
- Rationale: `SessionProcessor.handleEvent` throws unconditionally on
  `tool-input-start` and `tool-call` when the assistant message carries
  `summary: true`. `process()` converts that throw to `"stop"`, and compaction
  answers `"stop"` by rolling its boundary back. A tool call during the summary
  step therefore does not degrade the summary — it destroys the compaction, and
  compaction is the only way back down once usage passes the trigger, so the
  session is stranded above it. Interacts with [FD-010](#fd-010--a-think-only-compaction-step-is-recovered-not-discarded):
  that entry recovers a summary step that produced no text, and this one keeps
  the model from spending the step on a tool call instead.
- Upstream relationship: upstream `6080a114` set this to `"auto"` ("so the
  summary model can call tools when needed") but did not add the tool handling
  that would require: the same unconditional throw is still present in upstream
  `processor.ts`. Upstream is therefore internally inconsistent here, and the
  fork keeps `"none"` until the summary path can actually service a tool call.
  Adopting `"auto"` on a later sync would import that inconsistency.
- Verification: `test/session/compaction-tool-choice.test.ts` drives the real
  overflow path and shows a tool call during the summary step surfacing as
  `Tool call not allowed while generating summary`. The guard is the literal
  `tool_choice` assertion in `test/session/skill-catalog-system-tail.test.ts`,
  which exercises a compaction request built from a real frozen prefix snapshot.
- Retirement condition: summary messages gain real tool-call handling (upstream
  or fork), at which point `"auto"` can be adopted and the guard assertion
  relaxed to inherit the conversation's `tool_choice`.

## FD-012 — a compaction step that produced nothing is retried once by default

- Status: active
- Canonical owner: fork `main` compaction retry bound
- Observable contract: when the compaction step produces NOTHING — no text and
  no reasoning — it is retried, carrying a one-sentence instruction inside the
  existing summary turn rather than as a second user message, so the request
  shape the provider sees is unchanged. Bounded by
  `MIMOCODE_COMPACTION_RETRY_LIMIT` (default 1; `0` disables the retry
  entirely). No other failure shape is retried.
- Rationale: an empty step is the only compaction failure that may be a one-off.
  Every other shape is either already recoverable — think-only, handled by
  [FD-010](#fd-010--a-think-only-compaction-step-is-recovered-not-discarded) —
  or deterministic: a content filter refilters, an over-cap request is still
  over, a blocked or errored step stays blocked. The default bound is deliberately
  tighter than the conversation path's two, because a compaction retry re-sends
  the ENTIRE transcript: one attempt separates a one-off from a systematic
  cause, and a second only buys the same answer at another full-transcript cost.
- Relationship to FD-010: adjacent but independent. FD-010 decides what counts
  as an acceptable summary; this decides whether to ask again when there was no
  summary at all. Upstream adopting either one does not retire the other —
  which is exactly why this is a separate entry.
- Recovery invariant: the completion marker is cleared before each retry.
  `process()`'s cleanup stamps `time.completed` when an attempt finishes, and
  re-entering does not clear it, so without this the assistant would look
  finished for the whole of a full-transcript retry — and a crash or interrupt
  there would leave the boundary behind an apparently-completed assistant that
  orphan sweeping and `recoveryCandidates` both skip (`"completed" in time`),
  stranding the session with no recovery path. Cleared with `delete`, not
  `= undefined`: that check tests for the KEY.
- Usage accounting: `tokens` is NOT accumulated across attempts, even though
  `cost` is. The two fields answer different questions — `cost` is what was
  spent, `tokens` is the CONTEXT FOOTPRINT of the latest request. The TUI
  context readout (`cli/cmd/tui/util/model.ts`), the context sidebar and
  `acp/agent.ts` all read it as current usage, and none of them exclude summary
  messages, so summing two full-transcript attempts would report roughly twice
  the transcript and can read above 100% — the exact display failure this work
  began from. A discarded attempt is not lost: its cost is accumulated, and its
  usage stays on that attempt's own `step-finish` part.
- Flag note: the limit reads through `nonNegativeNumber`, not `number`.
  `number()` rejects `"0"` and would silently fall back to `1`, making the off
  switch a no-op.
- Verification: `test/session/compaction-reasoning-fallback.test.ts` covers a
  one-off empty step (retried once, retry accepted) and an exhausted retry
  (bounded at one, then rolled back), plus negative cases proving think-only and
  content-filtered steps are never retried. The assertions count requests
  carrying the retry instruction rather than compaction requests overall: a
  FAILED compaction is followed by a second, independent compaction round, so
  counting requests would let a retry-disabled build pass. Mutation-checked at
  `MIMOCODE_COMPACTION_RETRY_LIMIT=0`, where exactly the two retry tests fail.
- Retirement condition: upstream retries a compaction step that produced no
  content, under a comparable bound. Upstream recovering reasoning-only
  summaries satisfies FD-010, NOT this entry.
