# Fork Branch Ownership Cleanup Design

**Status:** approved in conversation; implementation pending written-spec review
**Date:** 2026-08-23
**Repository:** `onlyfeng/MiMo-Code`

## Purpose

Keep the fork's two long-lived branches semantically small and easy to audit:

- `main` contains freshly synchronized upstream code plus fork-wide CI fixes,
  correctness fixes, security fixes, and other defects with a concrete contract.
- `dev/compat` contains all of `main` plus adaptations required by the current
  development environment, especially enterprise intranet access, per-agent
  model behavior, bounded model-visible content, and platform compatibility.

The cleanup is capability-based. It does not rewrite history or move commits as
indivisible units. A historical commit may contain both shared fixes and
compatibility policy; only the surviving semantic hunks are reassigned.

## Baseline and Safety

The design was prepared against:

- `upstream/main = f57520c08d4d10e64ac035e90ba561e889119c98`
- `origin/main = f63e6d4ee2eb26d7c43de32c69f61ae754b6eff0`
- `origin/dev/compat = 18d520a82eb214f90b4c093926b6222608a6f7bf`

These SHAs are evidence, not a frozen implementation baseline. Before mutation,
fetch `origin` and `upstream` without tags, rebuild the affected diffs, and stop
or rebase the plan if any relevant surface changed.

All publication targets `onlyfeng/MiMo-Code`; `upstream` remains read-only. The
dirty root checkout, user-owned `.mimocode` files, and unrelated worktrees are
out of scope.

## Ownership Rules

| Concern | Canonical owner | Rule |
| --- | --- | --- |
| Upstream integration and shared bug fixes | `main` | Must have a concrete failure, invariant, CI need, or security boundary. |
| Enterprise network reachability | `dev/compat` | Operator-configured private HTTP(S) endpoints must not be rejected merely because their address is non-public; local stdio MCP remains unaffected. |
| Provider/project defaults | `dev/compat` | Defaults tied to the current development environment do not remain in shared `main`. |
| Cross-platform fallback needed only under restricted enterprise conditions | `dev/compat` | `ripgrep/archive` remains compat-only and is not promoted to `main`. |
| Formatting or behavior-neutral drift | neither | Align to upstream when the hunk is mechanically proven behavior-neutral. |
| Historical plans and specifications | history | Preserve them; they are not active contracts and are not deleted in this cleanup. |

## Runtime Changes

### 1. WebFetch destination policy

`main` keeps the fork's general redirect correctness:

- retain the current HTTP(S) scheme check;
- ask the `webfetch` permission for the initial target and every redirect;
- follow redirects manually with a maximum of 10 hops;
- retain the request timeout and 5 MB response limit.

`main` restores upstream's `assertSafeUrl()` primitive and adapts it to the
fork's manual redirect loop: call it for the initial target and each redirect
before that target's permission ask and HTTP request. This is a stricter
per-hop integration than the current upstream WebFetch call site, not an
entire-file copy from upstream. Do not use upstream's `safeFetch()`, because it
would bypass the injectable `HttpClient`, use a different redirect limit, and
omit the per-hop permission decision.

The shared contract is deliberately bounded: `assertSafeUrl()` performs a
fail-closed pre-request hostname/address classification, including one DNS
resolution. It does not pin the resolved address to the eventual connection and
must not be described as complete DNS-rebinding prevention.

`dev/compat` overlays only the destination decision. It retains the scheme,
permission, redirect, timeout, and size controls but does not call the
private-address/DNS/metadata guard. An approved URL such as
`http://192.168.1.1/wiki` remains fetchable.

Canonical surfaces:

- `packages/opencode/src/tool/webfetch.ts`
- `packages/opencode/src/util/ssrf.ts`
- `packages/opencode/test/tool/webfetch.test.ts`
- `packages/opencode/test/util/ssrf.test.ts`

### 2. MCP intranet compatibility

The current `main` MCP implementation validates only that a remote URL parses
and uses HTTP(S). It also keeps Claude-imported MCP configurations pending until
an explicit connect. Both are shared correctness behavior and remain in
`main`.

This cleanup does not invent a private-IP MCP restriction in `main`, because the
current upstream branch has no such restriction. Instead, `main` stops claiming
that private MCP reachability is a fork-wide contract by removing the dedicated
private-network regression from its test ownership.

`dev/compat` records and minimally tests the stronger compatibility contract:
an HTTP MCP endpoint such as `http://192.168.1.1/mcp` must reach client creation
and may not fail because the host is RFC1918. The test remains mocked and checks
only this sentinel policy boundary; source review additionally confirms that
the compat path has no private-address classifier. It does not claim real
network, proxy, DNS, redirect, or authentication coverage and does not duplicate
the full lifecycle suite.

If a future upstream synchronization adds MCP private-address filtering,
`main` may adopt it after normal review, while the `dev/compat` contract and
test require a compat-only override.

Canonical surfaces:

- `packages/opencode/src/mcp/index.ts`
- `packages/opencode/test/mcp/lifecycle.test.ts`

## Behavior That Stays in `main`

The cleanup does not move the following shared fixes merely because they are
fork-owned:

- `--yolo` and delete-authorization isolation;
- reported instruction content reaching model requests;
- rejection of an implicit OpenAI-compatible listener on ordinary instances;
- one resolved MiMo identity driving prompt, tool, and discovery selection;
- direct tool authority and the seconds-based `exec` timeout contract;
- fail-closed frozen-context capture before actor/checkpoint execution;
- actor lifecycle linearization and cancellation settlement;
- actor/instance-scoped read-before-edit state;
- protected project roots and Bash deletion boundaries;
- bounded workflow cleanup and CI coverage for `main`, `dev`, and
  `dev/compat`;
- stable skill discovery, synthetic-message provenance, checkpoint watermark
  safety, and MaxMode final-step enforcement;
- instance-local memory-write configuration for the existing progress checker;
- fork publication, contribution, security routing, branding, public bundled
  skills, and repository-facing CI guidance.

The MiMo v2.5 identity rules remain in `main` because upstream already contains
the product policy and the fork delta fixes inconsistent alias resolution
between prompt, tool, and MCP-search surfaces. This cleanup does not introduce a
new policy-injection subsystem.

The Xiaomi-provider WebSearch default also remains untouched: fresh source
comparison shows the `providerID === "xiaomi"` condition is already identical in
`upstream/main` and `origin/main`. Removing it would create a new fork
deviation, not clean one up.

## `dev/compat` Capabilities

The following existing current-tree capabilities remain compat-only and must be
recorded without rewriting their history:

- per-agent `maxMode` configuration and generated SDK/OpenAPI output;
- model-visible UTF-8 content caps, request preflight, replay/instruction/inbox
  truncation, and safe serialization;
- full-context actor extensions and static-prefix overflow handling beyond the
  shared fail-closed capture invariant;
- request-level provider/model/variant display;
- restricted-network/Windows `ripgrep` and archive fallback.

The cleanup then creates two planned compat-owned records:

- the WebFetch private-destination overlay introduced after `main` restores
  `assertSafeUrl()`;
- the MCP private-address guarantee, which is initially a compat-owned test and
  future synchronization trigger rather than a source overlay because current
  `main` has no MCP private-address filter.

The provider/model/variant display entry must state its current known limits:
an unconfigured built-in tier and an in-session agent switch can still display
`variant: none` while the server resolves an agent variant. This cleanup records
the limitation; it does not expand the feature implementation.

## Registry Structure

The active registries are split by ownership so a normal `main -> dev/compat`
propagation does not require editing the same shared section on both branches:

1. `docs/upstream-deviations.md` lives on `main` and is inherited unchanged by
   `dev/compat`. It contains only active shared deviations that reject upstream
   behavior. The uncommitted root-worktree draft FD-008 for private WebFetch is
   not published on `main`; that policy is represented by a compat entry
   instead. FD-009 is added as the sixth shared deviation. The resulting active
   shared set is FD-001, FD-002, FD-004, FD-005, FD-006, and FD-009; missing
   numbers remain intentionally unused rather than forcing a noisy renumber.
2. `docs/fork-capabilities.md` lives on `main` and is inherited unchanged. It
   inventories active shared-main fixes and process contracts not already owned
   by an FD. This is a design target: the file is not present in `origin/main`
   yet. It must not duplicate an FD as a second authoritative contract. The
   uncommitted draft FC-010 ID is assigned before first publication to the
   shared WebFetch redirect-authorization and resource-bound contract; its draft
   private-network wording is discarded rather than published.
3. `docs/dev-compat-overrides.md` is maintained only on `dev/compat`. It records
   every active delta from the inherited `main`, including the capabilities
   listed above.
4. `docs/fork-registry-history.md` is the shared append-only audit ledger for
   upstream-to-main reviews. `docs/dev-compat-registry-history.md` is the
   compat-only ledger for main-to-compat reviews. Separating them prevents a
   compat audit from modifying a file inherited unchanged from `main`.

This is a five-file structure: three active registries and two branch-owned
history ledgers.

Existing published shared identifiers remain stable (`FD-*` and `FC-*`) to
avoid link and review noise. An ID in an uncommitted draft has no stability
guarantee. Compatibility overlays use the distinct `DC-*` namespace, so their
numbering can never collide with an inherited shared entry. A migrated compat
entry such as the current `dev/compat`-only FD-007 records that former ID in a
`Legacy ID` field.

Every active entry contains:

- status and canonical owner;
- observable contract;
- relationship to upstream or inherited `main`;
- `Base` and `Overrides` fields for every DC entry, naming the inherited main
  SHA and the FD/FC/upstream behavior it changes;
- source and test surfaces;
- a non-self-referential `Review basis` and evidence;
- reconsideration or retirement condition.

`Review basis` has fixed semantics:

- `upstream`: reviewed upstream behavior SHA;
- `main behavior`: source/test SHA before a registry/history-only commit;
- `inherited main`: main behavior SHA used by a DC entry;
- `compat behavior`: compat source/test SHA before a registry/history-only
  commit.

Pure registry/history commits do not advance a behavior SHA. Behavior changes
are committed before their registry evidence so the following documentation
commit can name an existing SHA. History may separately record its own document
commit for traceability, but that SHA is never presented as the audited runtime
tree. Changed-path totals exclude these five tracking files so adding the
registry cannot invalidate its own audit count.

The initial compat overlay uses these semantic IDs:

- `DC-NET-001`: approved private-network WebFetch;
- `DC-NET-002`: RFC1918 remote HTTP(S) MCP reachability;
- `DC-PLATFORM-001`: restricted-network and Windows `ripgrep/archive` fallback;
- `DC-MODEL-001`: per-agent MaxMode;
- `DC-CONTEXT-001`: model-visible content caps and request preflight;
- `DC-ACTOR-001`: compat full-context/static-overflow extensions;
- `DC-TUI-001`: request metadata display, with `Legacy ID: FD-007` and the
  documented known limits.

Each active registry begins with a compact sync index containing only ID, watch
surfaces, relationship, and required decision. The index carries no SHA or
history; it lets a changed-path scan route reviewers to the detailed entries.

As a target change, `AGENTS.md` requires FD/FC review for work on `main` and
additionally requires the DC overlay when operating on or propagating into
`dev/compat`. The currently committed file requires only the deviation registry,
so the implementation must update this gate explicitly.

## Noise Cleanup

The following 12 current path differences are whitespace/blank-line-only under
`git diff -w --ignore-blank-lines` and align exactly to upstream in `main`:

- `packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-dashboard/SKILL.md`;
- `packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-dashboard/specifications/html-dashboard.md`;
- `packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-report/SKILL.md`;
- `packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/index/SKILL.md`;
- `packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/visualize-data/SKILL.md`;
- `packages/opencode/src/skill/builtin/.bundle/product-design/workflows/image-to-code/SKILL.md`;
- `packages/opencode/src/skill/builtin/.bundle/product-design/workflows/url-to-code/SKILL.md`;
- `packages/opencode/src/skill/builtin/.bundle/research-paper-writing/references/examples/method/example-of-the-three-elements.md`;
- `packages/opencode/src/skill/builtin/.bundle/research-paper-writing/references/examples/method/module-design-instant-ngp.md`;
- `packages/opencode/src/skill/builtin/.bundle/xlsx-official/LICENSE`;
- `packages/opencode/src/skill/compose/extract.ts`;
- `packages/opencode/src/tool/view-image.txt`.

The behavior-neutral `Object.values(provider.models)` loop in
`packages/opencode/src/plugin/codex.ts` also aligns to upstream's
`Object.entries` form.

No other path is declared formatting-only without a fresh per-path proof. In
particular, `.gitignore`, generated SDK/OpenAPI files, registries, and historical
plans/specifications are excluded from mechanical cleanup.

## Integration Sequence

1. Fetch current `origin` and `upstream` refs without tags and repeat the scoped
   ownership/diff checks.
2. Continue the isolated `main` cleanup branch with shared-main tests, runtime
   changes, registries, and mechanical noise cleanup. Open a fork-only PR to
   `main`.
3. Verify the exact PR head, focused local checks, and fork CI before merging
   the `main` PR.
4. Create a compat integration branch from current `origin/dev/compat`, merge
   the accepted `origin/main` with a real merge commit, and apply the compat
   overlay and registry in the same branch.
5. Validate the combined compat tree before publication, then open a fork-only
   PR to `dev/compat` and merge it with history preserved so `main` remains an
   ancestor.
6. Re-fetch and prove `upstream/main -> origin/main -> origin/dev/compat`, exact
   remote equality, exact-SHA CI success, registry completeness, and lockfile
   equality when manifests remain identical.

This sequence avoids a published `dev/compat` tip that temporarily loses
intranet access between the shared-main cleanup and the compat overlay.

## Verification

### `main`

- Replace the two current positive private-WebFetch tests with focused negative
  cases. A private initial target fails before permission ask and HTTP request.
  A public-to-private redirect may ask for and request the public start, then
  fails before asking for or requesting the private target.
- Restore the focused `util/ssrf` tests for private ranges, metadata hosts, and
  fail-closed resolution behavior.
- Keep the public-redirect test proving the next public target is re-authorized.
  Source/diff review confirms the unchanged 10-hop, timeout, and response-size
  bounds; this cleanup does not claim new exhaustive tests for those constants.
- MCP rejects malformed and non-HTTP(S) URLs and keeps Claude imports pending;
  no main-only private-network promise remains.
- Run focused tests from `packages/opencode`, then `bun typecheck`, relevant
  lint, and `git diff --check`.

### `dev/compat`

- One concise mocked MCP test proves `http://192.168.1.1/mcp` reaches client
  creation.
- One concise WebFetch test records the permission ask, then proves the mocked
  RFC1918 request occurs and succeeds after that ask.
- Existing `ripgrep/archive`, MaxMode, context-budget, actor-context, and TUI
  metadata regressions continue to pass.
- Run `bun typecheck`, relevant lint, `git diff --check`, and compare
  `bun.lock` with `main` when manifests are unchanged.

Every GitHub conclusion must match the exact current branch SHA. Green source
checks do not imply a distributable binary; this cleanup does not request a
local binary build.

## Non-Goals

- no upstream PR or upstream push;
- no branch-history rewrite or deletion of historical commits;
- no promotion of `ripgrep/archive` to `main`;
- no new MCP private-address restriction in `main`;
- no redesign of MiMo identity selection, checkpoint architecture, or TUI
  metadata resolution;
- no deletion of historical plans/specifications or unrelated worktrees;
- no mutation of user-owned `.mimocode` files.

## Completion Criteria

The cleanup is complete only when:

- all active `main` differences are either concrete shared fixes/process
  contracts or accurately documented deviations;
- every substantive `dev/compat - main` capability has one compat owner and an
  active registry entry;
- private WebFetch and MCP reachability remain available on `dev/compat`;
- the selected behavior-neutral noise is gone;
- both remote tips pass exact-SHA CI and satisfy the required ancestry chain;
- unrelated worktrees and root-checkout changes remain untouched.
