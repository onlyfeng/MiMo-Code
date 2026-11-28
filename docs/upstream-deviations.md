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
- Last reviewed: 2026-11-28
- Upstream: `f8b87f631277fc99f956740f7c83122132f87d3e`
- Prior reviewed upstream: `4b029a9b4cf838f72ecb729345ddf10d8cef9ad0` (2026-11-27)
- Review completion: `main` keeps `itemId` on reasoning parts of stateless OpenAI and Azure Responses requests (C02), documents `dream.auto` and `distill.auto` as opt-in (C03), takes version 0.1.18 (C04) and isolates the inbox and sync suites (C05). #2873 and its revert cancel out (C01). FD-009 keeps the fork's retained-actor route test, so upstream's cancellation of its registry-only case (C06) has no counterpart. `dev/compat` inherits all of it through a clean merge. See [the synchronization record](upstream-sync-2026-11-28-f8b87f63.md).
- Main behavior (runtime/tests): `4bde16cd18bff0ddb5ac35cf2531e6459461e6e2` (synchronization merge)
- Inherited compat behavior: `5f6366209212dfefbfc7516a3430323281ac02e7` (propagation merge)
- Bundled guidance content: `4bde16cd18bff0ddb5ac35cf2531e6459461e6e2` (dream and distill auto-runs documented as off by default; fork guidance retained).
- Prior fork `main` tip: `ba999dda14cf214a3dab04ad719657e900d4c6fb`. Prior fork `dev/compat` tip: `ca28595bddfbbf3328edbd97776af8357cb2db78`.
- Complete code-difference audit: [2026-09-15 implementation closure](fork-difference-closure-2026-09-15.md), with fixed Git trees, per-file ownership, completed F01–F11 decisions and retained boundaries.
- Original audit baseline: [2026-09-15 findings](fork-difference-audit-2026-09-15.md); its 529 file pairs, source snapshots and pre-implementation findings remain historical.
- History: [fork-registry-history.md](fork-registry-history.md)

`Upstream` remains the overall upstream review baseline. `Main behavior` names
the runtime/test tree the last upstream review covered; bundled guidance has a
separate content snapshot. Pure registry/history commits advance neither
reference, and neither do fork pull requests merged between synchronizations
(FC-044 through FC-056 and later corrections to existing entries): each such
entry names its own evidence, and the next synchronization reviews it. The
selected released capability audit is recorded in
[the model API review](released-model-api-review-2026-09-08.md).

Latest reviewed synchronization is the [2026-11-28 grouped stateless Responses reasoning](upstream-sync-2026-11-28-f8b87f63.md), C01–C06 (N=6).

Path note: living registry entries use the `packages/cli/` and `packages/sdk/` layout from the 2026-10-02 synchronization, including inside older dated bullets; dated synchronization records keep the paths of their time.

Earlier synchronization summaries (35, from the 2026-09-15 specified range through the 2026-11-04 `10b03cf0` sync) moved verbatim to [the shared history](fork-registry-history.md#2026-11-07-registry-normalization); the linked synchronization records remain authoritative.

The dated notes that entries carried through 2026-11-26 (68 notes and one superseded FD-004 paragraph) moved verbatim to [the shared history](fork-registry-history.md#2026-11-26-registry-consolidation-fd-dated-notes). Rules from them that are still in force were folded into each entry's fields in the same commit. Later reviews add new dated notes at the top of an entry; a later consolidation folds them the same way.

## Sync index

| ID     | Watch surfaces                                                                        | Upstream relationship                                                                                                                           | Required decision                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FD-001 | yolo, permission, Bash delete                                                         | Adopts startup delete approval; rejects run-driven shared switch mutation                                                                       | Preserve deny precedence and live invocation isolation                                                                                                                    |
| FD-002 | instruction disable parity, model requests, retry, and actor identity                 | Adopts default-on instruction delivery; retains residual parity and fail-closed identity boundaries                                             | Preserve disable UI/payload parity, immutable retry sets, and known-actor replacement                                                                                     |
| FD-004 | `/v1` capability route, `llm-server` CLI, listener advertisement, TUI worker listener | Adopts upstream's capability route whole; retired the fork model API with its admission, deadline and authentication-before-bootstrap hardening | Keep the operator-password bind guard, `advertiseDirectory` and the three corrections; do not restore retired hardening — recorded behaviours stay as upstream ships them |
| FD-005 | explicit harness selection, prompt, discovery, tools, retry and frozen profiles | Adopts model-independent opt-in; retains session precedence | Preserve one resolved harness across consumers; explicit session selection wins |
| FD-006 | compact Codex declarations and nested execution                                       | Adopts compact registration and full authorized nested Actor/interactive composition                                                            | Preserve request authority, frozen schemas, media and size/unit boundaries                                                                                                |
| FD-009 | actor/checkpoint context capture, retry, resume                                       | Rejects live-context fallback                                                                                                                   | Fail before child execution and reuse frozen membership                                                                                                                   |
| FD-010 | compaction summary acceptance                                                         | Extends upstream: recovers a think-only summary step instead of rolling the boundary back                                                       | Preserve rollback for every other failure shape and for a content-filtered step; empty steps are FD-012                                                                   |
| FD-011 | compaction request tool_choice                                                        | Rejects upstream's `"auto"`: it permits the one event the summary processor throws on                                                           | Keep tool calls disabled while summary messages cannot handle them                                                                                                        |
| FD-012 | compaction retry on an empty step                                                     | Extends upstream: retries a genuinely empty step, once by default                                                                               | Preserve the configurable non-negative limit (default 1, 0 disables) and empty-step scope                                                                                 |
| FD-013 | Fresh legacy model configuration and literal-preserving updates | Retains the source-level semantics reverted by upstream bfd5a2f4 | Read legacy values afresh; never persist expanded runtime configuration |

FD-010, FD-011 and FD-012 are grouped under [Compaction summary acceptance](#compaction-summary-acceptance).

## FD-001 — run approval must not toggle shared delete state

- Status: active
- Canonical owner: fork `main` permission and Bash authorization boundary
- Observable contract: dangerous TUI startup includes deletion approval,
  initialized independently from the runtime skip-all toggle. Explicit
  `bash_delete`, Bash, and external-directory denies still block execution.
  Automatic deletion approval preserves ordinary Bash/external-directory asks;
  only an actual reply to the full deletion command replaces them.
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
  scope captured by its long-lived connection before its own approval flow:
  the whole execution-claimed sampling request (upstream `6babeb0b`) runs
  inside `RunApproval.provide(undefined)`.
  Durable queue acceptance grants no run approval. Queued input becomes a
  request source only when its own lane owns and consumes it, and neither
  queue scheduling nor a long-lived MCP bridge can lend a former caller's
  scope. Superseding a failing retry never executes accepted input directly:
  the next loop's lane claim, owned task selection and RunApproval handoff
  select its authority, and recovery does not enable that watcher. Checkpoint,
  compaction and bounded continuations keep authority only through their owned
  atomic commit path.
- Upstream relationship: adopts startup yolo's inclusion of delete approval
  while retaining the residual rejection of the shared-state helper introduced
  at `2bff8074b572aee6dd0d0bc5e86fe5db9bff8013` and merged by `c8048b7c`.
  Explicit environment and instance API delete controls remain supported;
  invoking `run --yolo` does not change those controls. See
  [Yolo and run approval](yolo-run-approval.md).
- Watch surfaces: `packages/cli/src/cli/cmd/run.ts`,
  `packages/cli/src/cli/cmd/tui/thread.ts`,
  `packages/cli/src/cli/cmd/run-approval.ts`,
  `packages/cli/src/session/run-approval.ts`,
  `packages/cli/src/session/prompt.ts`,
  `packages/cli/src/permission/index.ts`,
  `packages/cli/src/mcp/sampling.ts`,
  `packages/cli/src/server/routes/instance/session.ts`,
  `packages/cli/src/server/routes/instance/permission.ts`, and
  `packages/cli/src/tool/bash.ts`; related actor/tool bridges and generated
  SDK/OpenAPI run-correlation fields.
- Tests/evidence: `packages/cli/test/cli/yolo.test.ts`,
  `packages/cli/test/permission/auto-approve-delete.test.ts`,
  `packages/cli/test/permission/skip-all.test.ts`,
  `packages/cli/test/tool/bash.test.ts`, and
  `packages/cli/test/cli/tui/permission-bash-delete.test.tsx` exercise the
  split controls and deletion boundary. Focused run-correlation carriers are
  `test/cli/run-approval.test.ts`, `test/session/run-approval.test.ts`,
  `test/session/prompt-effect.test.ts`, `test/tool/bash-delete-permission.test.ts`,
  `test/cli/run-yolo-attach.test.ts`, `test/server/permission-reply-scope.test.ts`,
  `test/mcp/sampling.test.ts` and `test/mcp/sampling-e2e.test.ts` under
  `packages/cli`. The checkpoint and compaction real-tool permission cases in
  `prompt-effect.test.ts` keep both correlation assertions and distinct
  continuation parents.
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
  separately fails open. Instruction bytes stay frozen in the request prefix
  until a tools-hash rotation rebuilds it, which is upstream's rule; retries of
  one request never rotate, so the immutable retry set holds. The skill catalog
  no longer rides in the frozen system tail (FC-005).
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
- Watch surfaces: `packages/cli/src/cli/cmd/tui/app.tsx`,
  `packages/cli/src/session/instruction.ts`,
  `packages/cli/src/session/llm-request-prefix.ts`,
  `packages/cli/src/session/llm.ts`,
  `packages/cli/src/session/max-mode.ts`,
  `packages/cli/src/session/prompt.ts`, and
  `packages/cli/src/session/system.ts`.
- Tests/evidence: `packages/cli/test/session/instruction.test.ts`,
  `packages/cli/test/session/llm-request-prefix.test.ts`,
  `packages/cli/test/session/llm-system-prompt.test.ts`,
  `packages/cli/test/session/replace-agent-subagent.test.ts`,
  `packages/cli/test/session/max-mode.test.ts`, and
  `packages/cli/test/session/prompt-effect.test.ts` prove default-on normal
  and MaxMode delivery, disable event/payload parity, unchanged resolved
  instruction bytes across request/live-step/MaxMode retries, and positive
  main/known-peer versus unknown/subagent/system/ephemeral replace-agent scope.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `0b665c7e681e44cac6f1a6acf18732015fb2bf86`.
- Retirement condition: upstream proves all three residuals together: one
  immutable per-request instruction decision controls the disable UI signal and
  model payload, every request/live-step/MaxMode retry reuses that same resolved
  set, and a session base replaces actor identity only with positive main or
  registered-peer evidence.

<a id="fd-004--ordinary-instances-expose-no-implicit-openai-compatible-listener"></a>

## FD-004 — upstream's capability route, adopted whole

- Status: active (reduced to near-nothing 2026-09-14)
- Canonical owner: fork `main` instance-server boundary
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
  The code comments of these corrections only point at this entry, which
  carries the reasoning.
  Three further deltas **predate this change**:
  - `server/server.ts` (+10/-2): the non-loopback bind guard reads
    `MIMOCODE_SERVER_PASSWORD_SUPPLIED` rather than upstream's
    `MIMOCODE_SERVER_PASSWORD`, so a credential this process generated for a
    listener nobody asked for cannot authorize a non-loopback bind; and
    `Server.listen` takes `advertiseDirectory`, because upstream keys the
    advertisement on `process.cwd()` while this fork's TUI worker serves a
    directory chosen at startup, and an advertisement in the wrong bucket is
    invisible to `mimo llm-server issue` in the project it actually serves.
    The guard reads upstream's own getter; no fork-only password flag remains
    (2026-11-26).
  - `server/middleware.ts` (+1/-1) and `util/ssrf.ts` (+1/-1):
    `RecoveryConflictError`, and FC-010's complete `fe80::/10` range.
  - `cli/cmd/generate.ts` (`codeSample`): OpenAPI `x-codeSamples` import the
    v2 client (`@mimo-ai/sdk/v2`) and call the camelCase method
    (`session.prompt_async` becomes `promptAsync`). Upstream's sample imports
    the root `@mimo-ai/sdk`, the legacy v1 client that
    `packages/sdk/script/build.ts` does not regenerate, and calls the raw
    operation id, which is not a callable method on either client.
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

- Watch surfaces: `packages/cli/src/server/routes/instance/capability.ts`,
  `packages/cli/src/server/middleware.ts`,
  `packages/cli/src/server/routes/instance/middleware.ts`,
  `packages/cli/src/server/server.ts`,
  `packages/cli/src/cli/cmd/llm-server.ts`,
  `packages/cli/src/cli/cmd/tui/worker-listener.ts`,
  `packages/cli/src/flag/flag.ts`, `packages/cli/src/llm-server/`,
  `packages/cli/src/config/llm-server.ts`, `packages/cli/src/util/self.ts`.
- Fixture convention: this fork roots test fixtures outside `process.cwd()`
  (under `/var/tmp` on POSIX; FC-008 owns the location and its evidence) and
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
  `test/fixture/tui-worker-default-child.ts` for the advertise-directory delta
  and the bind guard; the test sets the operator password in the environment,
  as an operator does, and asserts `MIMOCODE_SERVER_PASSWORD_SUPPLIED`.
  `test/cli/llm-server-revoke.test.ts` covers the `revoke` guard and
  `test/server/openapi-code-samples.test.ts` the `codeSample` correction.
- Upstream relationship: the fork tracks upstream on this surface. Its parallel
  model API (`server/model-api.ts`, `server/api-request.ts` and seven
  `llm-server` modules) retired on 2026-09-14 in favour of upstream's
  `CapabilityRoutes`, which already provided the same routes, scoped tokens and
  media inputs; do not restore it.

<a id="fd-005--one-resolved-mimo-identity-selects-prompt-discovery-and-tools"></a>

## FD-005 — one resolved harness selects prompt, discovery, and tools

- Prompt selection and tool registration share the upstream model-independent `usesCodexMode(harness)` interface. Explicit session choices still take precedence over the process selector. Historical model metadata remains part of the frozen-prefix identity.

- Status: active
- Canonical owner: fork `main` harness resolution boundary
- Observable contract: prompt selection, MCP discovery, registry filtering,
  frozen prefix capture, agent generation, and `exec` dispatch use the same
  model-independent harness resolver. An explicit session `codex` or `default`
  selection wins first, including session `codex` with process false. For
  `auto`, process true selects Codex; false or unset selects default. All
  models share the unified default prompt unless Codex is explicitly selected.
  `MIMOCODE_MCP_TOOL_SEARCH` (`true` default, `auto`, `auto:N`, `false`) is the
  configured MCP deferral mode for the default harness; the resolved Codex
  harness always defers, and that decision uses this same resolved harness.
  Ordinary deferred calls use the fixed `mcp_tool_use` entry; searched schemas
  never expand the active tool list. Auto deferral remains sticky while its
  conversation evidence survives, and an empty catalog initially defers.
  Live resolution and prefix capture (`buildLLMRequestPrefix`, given the same
  resolved mode) apply the same deferral threshold and read the same
  reminder, search and use evidence, including legacy `metadata.mcpReminder`
  announcements. Without that evidence a silent `auto` may re-evaluate; no
  auxiliary user-history marker preserves a cache choice. Readiness is a
  non-blocking connection snapshot, not an authorization catalog: the entry
  announcement and the latest per-server outcomes share one budget and list
  only request-visible tools.
  Catalog deltas are appended only at a user-turn boundary, not to earlier
  user content after assistant execution has begun.
  MCP text output is escaped with `neutralizeHarnessTags` inside the MCP tool
  wrapper's `normalizeResult`, so a server cannot forge `<system-reminder>`-style
  harness tags through a tool result; upstream `002cb4c9` dropped that call.
  Process environment selectors are startup configuration; mutating them during
  an active session is outside this contract.
  The legacy `provider.<id>.models.<id>.harness_model` field remains readable
  for configuration compatibility and does not select a prompt or toolset.
  Its trusted declarations come from the effective parsed configuration, after
  host defaults merge beneath explicit user values; a models-only refresh
  (`Config.prepareModelRefresh`) carries the fresh parse's declarations to both
  refreshed configuration objects, and plugin `config` hooks cannot grant them.
  They remain part of the frozen-prefix model identity.
  Harness resolution reads model identity, never the credential provider:
  Xiaomi family providers, family output defaults and vision ordering select no
  harness. The live skill set never rebuilds agent permissions or changes
  profile-key inputs.
  Models retain their resolved API identity and declared capabilities.
  Capture, run-loop and compaction profiles share the new policy generation;
  frozen actor membership and mismatch rejection remain unchanged.
  Transport is separate: the fork adopts upstream's transport, which since `0fe2cbbc`
  uses the declared model/provider npm (defaulting to
  `@ai-sdk/openai-compatible`), rather than routing a resolved PTC identity to
  the Responses API. Transport never selects the Codex harness/toolset.
  Request, live-step and MaxMode retries reuse their resolved request identity
  and harness instead of independently selecting them between attempts.
  The Xiaomi WebSearch sidecar clause retired on 2026-10-30
  with upstream `d0684a3d`; harness identity and tool authorization remain active.
- Upstream relationship: adopts model-independent opt-in and the unified
  default prompt from `e3592f0e`; rejects its process-false override of an
  explicit session Codex selection. The earlier model-inference deviation
  and alias/veto selection rules retire.
- Watch surfaces: `packages/cli/src/flag/flag.ts`,
  `packages/cli/src/config/config.ts`,
  `packages/cli/src/config/provider.ts`,
  `packages/cli/src/tool/gpt.ts`,
  `packages/cli/src/provider/provider.ts`,
  `packages/cli/src/session/system.ts`,
  `packages/cli/src/session/prompt.ts`,
  `packages/cli/src/session/llm-request-prefix.ts`,
  `packages/cli/src/session/compaction.ts`,
  `packages/cli/src/session/prefix-snapshot.ts`,
  `packages/cli/src/tool/registry.ts`,
  `packages/cli/src/tool/tool-script-ref.ts`,
  `packages/cli/src/tool/tool-script.ts`,
  `packages/cli/src/agent/agent.ts`, and
  `packages/cli/src/server/routes/instance/experimental.ts`.
- Tests/evidence: `packages/cli/test/flag/codex-mode-flag.test.ts`,
  `packages/cli/test/tool/harness-alias.test.ts`,
  system-prompt, GPT helper, request-prefix, tool-registry, agent-generation,
  `packages/cli/test/provider/provider.test.ts`, and
  `packages/cli/test/tool/tool-script.test.ts` regressions cover explicit
  unset/true/false behavior, model-independent defaults, legacy aliases,
  explicit session precedence, frozen profile invalidation, and retry reuse.
  `test/provider/refresh-harness.test.ts` covers declarations across a refresh;
  `test/session/llm-request-prefix.test.ts`, the MCP cases of
  `test/session/prompt-effect.test.ts`, `test/session/codex-compact.test.ts`
  and `test/tool/mcp-tool-search.test.ts` cover deferral, evidence and output
  escaping.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `d5798519cd1227ab4061bd69ef9efc5f483b74d8`.

- Retirement condition: upstream preserves explicit session precedence and one
  immutable harness selection across prompt, discovery, registry, capture and
  dispatch, including persistence across a policy upgrade. The MCP output
  escaping difference retires on its own when upstream restores the
  `neutralizeHarnessTags` call.

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
  load; non-Codex deferred calls use the fixed dispatcher. Schema search is
  guidance, not a load-before-call authorization gate.
  The fixed `mcp_tool_use` dispatcher runs the underlying MCP tool's
  permission, hook, settlement, truncation and metrics pipeline from a
  request-local dispatch map. Argument checks run after the before-hook; the
  processor gate and part stay `mcp_tool_use`, while permission and metrics
  name the actual MCP tool. Frozen captures record the dispatcher explicitly
  (it is built outside the registry), and it cannot widen a full-context
  actor's frozen implementation pool or schemas; snapshots that predate it keep
  their captured active/loaded intersection. Codex keeps its authorized hidden
  direct calls and the `exec` path; a deferred direct call is rejected only for
  non-Codex harnesses, apart from legacy frozen exceptions and config-declared
  always-direct MCP tools. Always-direct tools join the top-level active set,
  stay available through `exec` and are excluded from deferred search and
  dispatch. Exec's MCP entries (`execMcpTools`) use the same `executeMcp`
  wrapper in `session/prompt.ts` as direct and `mcp_tool_use` calls; it
  supplies the assistant `messageID` and the session's elicitation recorder,
  which grants no tool or execution authority.
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
  script VM, including guest-only pending promises and outer Effect interruption.
  Exec settles through upstream's `ToolSettlement` and records a `cancelled`
  result for the processor; the fork's nested lifecycle stays authoritative, and
  a nested guest that had already settled when Stop interrupted it reports its
  real result through its own settlement reference. `workflow/sandbox.ts` is
  upstream's. Frozen
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
  The public compute budget accepts `timeout_seconds` (integer 1–600 seconds)
  or upstream-compatible `timeout` (integer 1–600000 milliseconds), never both;
  omitting both retains the 60-second default. Conversion occurs once at execution.
  The strict `exec_command` adapter uses `yield_time_ms` as a command timeout in milliseconds,
  with no background terminal resume semantics or automatic argument repair.
  Unknown fields fail before Bash admission; a unique field-name suggestion
  helps the caller rewrite the request without changing or executing it.
  Code is bounded at 128 KiB before and after normalization, serialized script
  return values and replayable nested records at 256 KiB each. Logs, traces and
  warnings have their separate existing bounds. The host relays at most eight
  authorized attachments totaling 10 MiB encoded data and reports omissions;
  images reach ordinary persisted FileParts and the next model request.
  Upstream's per-attachment `MIMOCODE_MAX_ATTACHMENT_SIZE` gate (50 MB default)
  sits above this relay bound and does not change it.
  Expanded TUI output remains bounded and ANSI-free. Retained validated nested
  records feed file manifests and repeated-failure detection.
  Snapshot compaction keeps at most 8 KiB of selected facts per child and 32
  entries per retained array; oversized fields or whole records may be omitted
  within the overall bound. Missing paths never imply a cwd mutation.
  The retired 2026-09-07 read/glob/grep experiment established no Codex
  production savings; see [current usage](codex-compact-tools.md)
  and [historical evaluation](experiments/tool-schema-2026-09-07.md).
- Upstream relationship: adapts released v0.1.14 compact registration from
  `1a0ffba7842af3f11edcb456688bbdf067407c08`, as present in the selected
  `6203ea2e` baseline. It adopts hidden tools, compact declarations and the
  nested shell adapter. POLICY-01 adopts broader nested Actor and interactive
  composition while retaining direct entries and the fork's pinned authority,
  native-schema freezing, owned cancellation and atomic plan transitions.
  Earlier direct-only and narrowed-Actor decisions (now in the history) are
  superseded only for this selected scope.
  Existing normalization, fixed cwd, deletion approval and code/unit limits
  remain; broader upstream source and selectors are not restored.
- POLICY-01 watch additions: `packages/cli/src/actor/spawn.ts`,
  `packages/cli/src/actor/lifecycle.ts`, `packages/cli/src/tool/actor.ts`,
  `packages/cli/src/tool/tool.ts`, `packages/cli/src/tool/plan.ts`,
  `packages/cli/src/tool/question.ts`, and
  `packages/cli/src/cli/cmd/tui/routes/session/plan-switch.ts`.
- Watch surfaces: `packages/cli/src/agent/prompt/generate-gpt.txt`,
  `packages/cli/src/session/prompt.ts`,
  `packages/cli/src/tool/registry.ts`,
  `packages/cli/src/tool/tool-script-ref.ts`,
  `packages/cli/src/tool/tool-script.ts`,
  `packages/cli/src/tool/tool-script.txt`,
  `packages/cli/src/workflow/sandbox.ts`,
  `packages/cli/src/session/llm-request-prefix.ts`,
  `packages/cli/src/session/prefix-snapshot.ts`,
  `packages/cli/src/session/observed-tool-parts.ts`,
  `packages/cli/src/cli/cmd/tui/routes/session/permission.tsx`,
  `packages/cli/src/cli/cmd/tui/routes/session/index.tsx`, and
  `packages/cli/src/cli/cmd/tui/routes/session/exec-expanded.tsx`.
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
  POLICY-01 boundaries: `test/tool/actor-owned-lifecycle.test.ts`,
  `test/tool/actor-exec-lifecycle.test.ts`, `test/tool/control-origin.test.ts`,
  `test/tool/plan-approval.test.ts`, the real
  `test/session/exec-interaction.test.ts` and the TUI plan-switch event tests.
  The exec cases of `test/session/tool-gate-cancel.test.ts` cover settlement
  under Stop; `test/tool/mcp-tool-search.test.ts` and the MCP cases of
  `prompt-effect.test.ts` cover the dispatcher with new and legacy snapshots,
  matching and changed schemas.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
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
  On `main`, actor `spawn` and `run` expose neither `context` nor the
  persistent creation that depends on it (upstream `799bc409`); dev/compat owns
  that model-facing extension. Checkpoint writers, session-ask fork queries and
  qualifying existing-actor recovery still use this contract.
  Automatic subagent resume uses the same retained current-instance
  full-context admission as explicit recovery; upstream's registry-only
  ephemeral recovery is not adopted, and missing context stays unavailable. A
  completed ephemeral full-context actor has released its context: a later
  `send` fails closed and a fresh spawn is required.
  The HTTP resume route refuses a model override for a non-main `agentID`, and
  the run loop's `resumeIdentity` comparison still fails closed behind that
  refusal; main resume, which has no frozen identity, accepts the override.
  A session-environment reminder is added only to the receiving session's own
  unsent user message and never recaptures or changes the frozen system,
  tools, permissions, model identity or parent history. A non-bounded
  full-context child may carry the parent's reminder and its own; native hidden
  bounded agents receive none. Cold and warm capture drop historical skill
  catalogs through `getFrozen` (FC-005) without weakening admission.
- Upstream relationship: rejects the log-and-spawn fallback anchored at
  `8e5cc8a84b91af38eefde2d2bf054216d880d82f`; fork behavior is anchored at
  `3a4a244c8af1cd455518e0226c4df12d50b9b5e9` and refined through
  `aed2e8c73478f3a22d8cbaa49a9fe107766c14d0`. Upstream's session- and
  actor-scoped fork context (`forkContextKey`) duplicates the isolation; the
  fork keeps its generation, cancellation and frozen-membership implementation
  instead of a second context map.
- Watch surfaces: `packages/cli/src/actor/spawn.ts`,
  `packages/cli/src/session/checkpoint.ts`,
  `packages/cli/src/session/compaction.ts`,
  `packages/cli/src/session/llm-request-prefix.ts`,
  `packages/cli/src/session/prefix-capture-ref.ts`,
  `packages/cli/src/session/prefix-snapshot.ts`,
  `packages/cli/src/session/prompt.ts`,
  `packages/cli/src/tool/actor.ts`, and
  `packages/cli/src/tool/session.ts`.
- POLICY-01 watch additions: `packages/cli/src/tool/tool.ts`,
  `packages/cli/src/tool/registry.ts`, `packages/cli/src/tool/tool-script.ts`,
  and `packages/cli/src/session/session.sql.ts` (optional internal snapshot
  JSON metadata, not a new public API or database-column migration).
- Tests/evidence: `packages/cli/test/actor/spawn.test.ts`, checkpoint
  child-session/fork-mode/main-slice/prefix-capture/watermark tests, and
  `packages/cli/test/session/prompt-effect.test.ts` cover failure before
  execution and preservation of frozen membership.
  The actor spawn suite also exercises owned compaction and invalid-output
  continuations, a same-source foreign hook user, and a lost compaction write.
  Real cold capture, JSON roundtrip, full-context Actor and SDK execution cover
  matching native schemas, changed agent enums, legacy shell rejection and exact
  legacy JSON compatibility; the request wire excludes `nativeInputSchema`.
- Review basis: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`;
  main behavior `aa2dbe494fb5903f918d8d7cd8b6d04404acb031`.
- Retirement condition: upstream provides an atomic capture-and-spawn protocol
  with equivalent mode-specific validation, frozen authority/membership,
  deterministic failure settlement, and proof that live-context fallback is
  impossible.

## Compaction summary acceptance

FD-010, FD-011 and FD-012 govern one boundary: the compaction summary request
and whether its step is accepted, recovered or retried. Each keeps its own
retirement condition, and an upstream change that retires one does not retire
the others. Review all three together whenever `session/compaction.ts`,
`session/processor.ts` or the summary classification changes.

### FD-010 — a think-only compaction step is recovered, not discarded

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
  them merges cleanly; only the final no-text branch differs. Upstream
  `2491aae5`'s cleanup around the whole compaction effect is adopted: an
  unprojected boundary is removed and an interrupted summary is marked aborted.
  Pure-empty retries of conversation steps belong to `SessionRetry.policy`;
  summary assistants stay with FD-010–FD-012.
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

### FD-011 — the compaction request keeps tool calls disabled

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

### FD-012 — a compaction step that produced nothing is retried once by default

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
  independent of the conversation unknown-error budget, because a compaction retry re-sends
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
  Upstream's HTTP rollback fixture, `test/server/summarize-route-outcome.test.ts`,
  queues two empty responses, so it exercises the exhausted rollback rather
  than the successful retry.
- Retirement condition: upstream retries a compaction step that produced no
  content, under a comparable bound. Upstream recovering reasoning-only
  summaries satisfies FD-010, NOT this entry.

## FD-013 — model configuration retains its stored source semantics

- Status: active
- Canonical owner: fork `main` configuration persistence and legacy model refresh
- Observable contract: legacy TOML is parsed from disk on every load. Models-only
  refresh includes freshly edited legacy model settings without writing a migration
  or deleting the source. Ordinary loading may migrate the file. `Config.update`
  reads, normalizes and validates the stored JSONC before merging an update; it
  preserves literal `{env:...}` / `{file:...}` references and unresolved plugin
  paths, and invalid stored data fails before any write.
- Upstream relationship: deliberately retain these two independent behaviors
  from `7bc7dc3a` when adopting `bfd5a2f4`'s reversal of execution-source filtering.
  The source filter itself is removed; plugin host restrictions remain plugin-only.
  FC-004 owns MCP import and startup-control precedence, not this persistence rule.
- Watch surfaces: `packages/cli/src/config/config.ts` — `loadGlobal`,
  `prepareModelRefresh`, `update`, `normalizeLoadedConfig`; `config/variable.ts`
  is intentionally outside the stored-file update path.
- Tests/evidence: `packages/cli/test/config/config.test.ts` configuration persistence
  and legacy refresh cases prove literal retention, invalid-file non-mutation,
  ordinary migration/reload, and two successive edited legacy model refreshes
  without writes. The final configuration run passes 95 tests, 229 assertions.
- Review basis: upstream `6b66e8ce4aa89962b95a4dcb4119ee399cc9262f`;
  main `fd04de73ced82599baac249e9cf96dfb55b9d778`.
- Retirement condition: upstream provides equivalent fresh legacy model reads and
  updates that preserve the stored configuration rather than serializing an
  expanded runtime view.
