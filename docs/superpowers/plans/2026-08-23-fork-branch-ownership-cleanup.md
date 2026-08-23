# Fork Branch Ownership Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make fork `main` contain only shared fixes and accurately registered deviations, while preserving enterprise intranet and project compatibility behavior as an explicit `dev/compat` overlay.

**Architecture:** Keep the fork's manual WebFetch redirect seam. On `main`, call upstream's `assertSafeUrl()` before every permission decision and request; on `dev/compat`, remove only those calls. Keep MCP production source shared and move only the RFC1918 guarantee/test to compat. Keep shared FD/FC registries byte-identical across branches and place all compat-only ownership in DC records.

**Tech Stack:** TypeScript, Bun, Effect, Bun test, Git worktrees, GitHub CLI

**Spec:** `docs/superpowers/specs/2026-08-23-fork-branch-ownership-cleanup-design.md`

## Global Constraints

- `upstream` is read-only. Push, open PRs, and merge only in `onlyfeng/MiMo-Code`.
- Fetch both remotes without tags before changing behavior; the SHAs in the spec are evidence, not a frozen baseline.
- Preserve the dirty root checkout, `.mimocode`, and all unrelated/user worktrees.
- Use `bun ci` only. Never run `bun install`, `npm install`, or mutate `bun.lock`.
- Run tests and `bun typecheck` from `packages/opencode`; never run tests from the repository root.
- Keep `ripgrep/archive` compatibility changes only on `dev/compat`.
- Do not change the already-upstream-equivalent Xiaomi WebSearch condition.
- Do not replace the fork's WebFetch implementation with upstream `safeFetch()`; use only `assertSafeUrl()` at the existing manual redirect seam.
- Keep compatibility tests intentionally narrow: one WebFetch RFC1918 sentinel and one mocked MCP RFC1918 sentinel.
- Merge both PRs with real merge commits. Do not squash or rebase-merge because registry entries name pre-documentation behavior SHAs and `main` must remain an ancestor of `dev/compat`.
- Do not regenerate the SDK/OpenAPI; no schema or generated interface changes are planned.
- Every `gh` command must include `-R onlyfeng/MiMo-Code`.

## File Map

### Shared `main` runtime and tests

- Create: `packages/opencode/src/util/ssrf.ts`
- Create: `packages/opencode/test/util/ssrf.test.ts`
- Modify: `packages/opencode/src/tool/webfetch.ts`
- Modify: `packages/opencode/test/tool/webfetch.test.ts`
- Modify: `packages/opencode/test/mcp/lifecycle.test.ts`

### Shared `main` registries and policy

- Modify: `AGENTS.md`
- Modify: `docs/upstream-deviations.md`
- Create: `docs/fork-capabilities.md`
- Create: `docs/fork-registry-history.md`

### Behavior-neutral alignment

- Modify the 12 paths enumerated in Task 4.
- Modify: `packages/opencode/src/plugin/codex.ts`

### `dev/compat` overlay and registry

- Modify: `packages/opencode/src/tool/webfetch.ts`
- Modify: `packages/opencode/test/tool/webfetch.test.ts`
- Modify: `packages/opencode/test/mcp/lifecycle.test.ts`
- Create: `docs/dev-compat-overrides.md`
- Create: `docs/dev-compat-registry-history.md`

---

## Task 1: Refresh refs and prove the implementation baseline

**Files:**

- Inspect: `docs/superpowers/specs/2026-08-23-fork-branch-ownership-cleanup-design.md`
- Inspect: `docs/upstream-deviations.md`
- Inspect: `docs/fork-capabilities.md` if it exists on the fetched branch

- [ ] **Step 1: Confirm checkout isolation and preserve user state**

From the design worktree:

```bash
pwd
git branch --show-current
git status --short
git -C /Users/a4399/Documents/ai/onlyfeng/MiMo-Code status --short
git worktree list --porcelain
```

Expected: the active checkout is `.worktrees/docs-fork-branch-ownership-design`; only the committed spec/plan history belongs to this operation; the root checkout's existing edits and untracked `.mimocode` content remain untouched.

- [ ] **Step 2: Fetch live fork and upstream refs without tags**

```bash
old_upstream_sha="$(git rev-parse upstream/main)"
old_origin_main_sha="$(git rev-parse origin/main)"
old_origin_compat_sha="$(git rev-parse origin/dev/compat)"
git fetch --no-tags origin main dev/compat
git fetch --no-tags upstream main
echo "$old_upstream_sha"
echo "$old_origin_main_sha"
echo "$old_origin_compat_sha"
git rev-parse upstream/main origin/main origin/dev/compat HEAD
git diff --name-status "$old_upstream_sha" upstream/main
if ! git merge-base --is-ancestor upstream/main origin/main; then
  echo "fresh upstream/main is not contained in origin/main; revise the plan or synchronize upstream before cleanup"
  exit 1
fi
if ! git merge-base --is-ancestor origin/main origin/dev/compat; then
  echo "origin/main is not contained in origin/dev/compat; re-audit branch propagation before cleanup"
  exit 1
fi
```

Expected: both guarded ancestry checks pass. Record the old and fresh refs. If upstream advanced, inspect `old_upstream_sha..upstream/main` against every FD/FC/DC watch surface; stop and revise this plan before behavior work if any controlled surface changed. If fresh upstream is not yet in fork `main`, stop even when its paths look unrelated because the final required ancestry chain cannot otherwise pass.

- [ ] **Step 3: Rebase the documentation branch if fork `main` moved**

```bash
git merge-base --is-ancestor origin/main HEAD
```

If this exits non-zero, run:

```bash
git rebase origin/main
```

Then repeat the changed-surface audit from the approved spec. Stop and revise the spec/plan before behavior work if upstream or fork changes affect WebFetch, SSRF, MCP, any FD/FC surface, or any of the 13 noise paths.

- [ ] **Step 4: Rebuild the scoped diff evidence**

```bash
git diff --stat upstream/main origin/main
git diff --stat origin/main origin/dev/compat
git diff --check upstream/main origin/main
git diff --check origin/main origin/dev/compat
git diff upstream/main origin/main -- packages/opencode/src/tool/webfetch.ts packages/opencode/src/util/ssrf.ts packages/opencode/src/mcp/index.ts packages/opencode/test/tool/webfetch.test.ts packages/opencode/test/util/ssrf.test.ts packages/opencode/test/mcp/lifecycle.test.ts
git diff origin/main origin/dev/compat -- packages/opencode/src/tool/webfetch.ts packages/opencode/src/mcp/index.ts packages/opencode/test/tool/webfetch.test.ts packages/opencode/test/mcp/lifecycle.test.ts
```

Expected: the semantic ownership still matches the approved spec; formatting-only claims are re-proved separately in Task 4.

- [ ] **Step 5: Install the exact lockfile and run the shared baseline**

```bash
bun ci
cd packages/opencode
bun test test/tool/webfetch.test.ts test/mcp/lifecycle.test.ts
bun typecheck
```

Expected: baseline checks pass before edits. If they fail, invoke `superpowers:systematic-debugging`, record the pre-existing failure, and do not conflate it with this cleanup.

---

## Task 2: Restore the shared WebFetch SSRF contract on `main`

**Files:**

- Create: `packages/opencode/src/util/ssrf.ts`
- Create: `packages/opencode/test/util/ssrf.test.ts`
- Modify: `packages/opencode/src/tool/webfetch.ts`
- Modify: `packages/opencode/test/tool/webfetch.test.ts`

- [ ] **Step 1: Replace the two private-address success tests with failing shared-policy tests**

In `test/tool/webfetch.test.ts`, replace the current positive private-initial and public-to-private cases with focused tests equivalent to:

```ts
test("rejects a private initial target before permission or request", async () => {
  const events: string[] = []
  const context = {
    ...ctx,
    ask: (input: { patterns: ReadonlyArray<string> }) =>
      Effect.sync(() => {
        events.push(`ask:${input.patterns[0]}`)
      }),
  }
  const http = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.sync(() => {
        events.push(`request:${request.url}`)
        return HttpClientResponse.fromWeb(
          request,
          new Response("must not fetch", { headers: { "content-type": "text/plain" } }),
        )
      }),
    ),
  )

  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      await expect(exec({ url: "http://192.168.1.1/wiki", format: "text" }, http, context)).rejects.toThrow(
        "SSRF protection",
      )
    },
  })
  expect(events).toEqual([])
})

test("rejects a private redirect before its permission or request", async () => {
  const start = "https://93.184.216.34/start"
  const internal = "http://192.168.1.1/wiki"
  const events: string[] = []
  const context = {
    ...ctx,
    ask: (input: { patterns: ReadonlyArray<string> }) =>
      Effect.sync(() => {
        events.push(`ask:${input.patterns[0]}`)
      }),
  }
  const http = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.sync(() => {
        events.push(`request:${request.url}`)
        if (request.url === start) {
          return HttpClientResponse.fromWeb(
            request,
            new Response(null, { status: 302, headers: { location: internal } }),
          )
        }
        return HttpClientResponse.fromWeb(
          request,
          new Response("must not fetch", { headers: { "content-type": "text/plain" } }),
        )
      }),
    ),
  )

  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      await expect(exec({ url: start, format: "text" }, http, context)).rejects.toThrow("SSRF protection")
    },
  })
  expect(events).toEqual([
    `ask:${start}`,
    `request:${start}`,
  ])
})
```

This code uses the file's existing `ctx`, `exec`, `projectRoot`, and imports; do not add real network access.

- [ ] **Step 2: Run the focused tests and confirm the intended red state**

```bash
cd packages/opencode
bun test test/tool/webfetch.test.ts
```

Expected: the new private-address tests fail because the current fork permits the private target. Any unrelated failure must be diagnosed before continuing.

- [ ] **Step 3: Restore the exact upstream SSRF primitive and its tests**

Inspect the selected live upstream blobs:

```bash
git show upstream/main:packages/opencode/src/util/ssrf.ts
git show upstream/main:packages/opencode/test/util/ssrf.test.ts
```

Use `apply_patch` to add both files byte-for-byte from the selected `upstream/main`. Do not copy `safeFetch()` into WebFetch and do not weaken the primitive. The restored test file must cover private IPv4/IPv6 ranges, metadata hostnames, and fail-closed hostname resolution as upstream does.

- [ ] **Step 4: Integrate `assertSafeUrl()` at the existing manual redirect seam**

Add the import to `src/tool/webfetch.ts`:

```ts
import { assertSafeUrl } from "@/util/ssrf"
```

Before the initial `ctx.ask(...)`, add:

```ts
yield* Effect.promise(() => assertSafeUrl(params.url))
```

Inside the redirect branch, after resolving/validating the next HTTP(S) URL and before the redirect target's `ctx.ask(...)`, add:

```ts
yield* Effect.promise(() => assertSafeUrl(redirectUrl))
```

Do not change the injectable `HttpClient`, per-hop permission calls, 10-hop limit, timeout, or 5 MB limit.

- [ ] **Step 5: Run focused green tests**

```bash
cd packages/opencode
bun test test/tool/webfetch.test.ts test/util/ssrf.test.ts
```

Expected: both suites pass; the existing public redirect test still proves re-authorization.

- [ ] **Step 6: Commit the shared behavior change**

```bash
git add packages/opencode/src/util/ssrf.ts packages/opencode/test/util/ssrf.test.ts packages/opencode/src/tool/webfetch.ts packages/opencode/test/tool/webfetch.test.ts
git diff --cached --check
git commit -m "fix(webfetch): restore shared SSRF classification"
```

---

## Task 3: Scope the private MCP guarantee to `dev/compat`

**Files:**

- Modify: `packages/opencode/test/mcp/lifecycle.test.ts`
- Verify unchanged: `packages/opencode/src/mcp/index.ts`

- [ ] **Step 1: Remove only the private-network ownership test from `main`**

Delete the test named:

```text
remote MCP private network URL connects as configured
```

Keep the malformed/non-HTTP(S) validation tests, Claude-import pending behavior, and all production code unchanged.

- [ ] **Step 2: Verify the surviving MCP contracts**

```bash
cd packages/opencode
bun test test/mcp/lifecycle.test.ts -t "remote MCP rejects invalid URLs before creating a client"
bun test test/mcp/lifecycle.test.ts -t "Claude Code local MCP server is pending until explicitly connected"
cd ../..
git diff --quiet HEAD -- packages/opencode/src/mcp/index.ts
```

Expected: both tests pass and the production-source diff is empty.

- [ ] **Step 3: Commit the ownership-only test change**

```bash
git add packages/opencode/test/mcp/lifecycle.test.ts
git diff --cached --check
git commit -m "test(mcp): scope private network guarantee to compat"
```

---

## Task 4: Remove proven behavior-neutral drift from `main`

**Files:**

- Modify: `packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-dashboard/SKILL.md`
- Modify: `packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-dashboard/specifications/html-dashboard.md`
- Modify: `packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-report/SKILL.md`
- Modify: `packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/index/SKILL.md`
- Modify: `packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/visualize-data/SKILL.md`
- Modify: `packages/opencode/src/skill/builtin/.bundle/product-design/workflows/image-to-code/SKILL.md`
- Modify: `packages/opencode/src/skill/builtin/.bundle/product-design/workflows/url-to-code/SKILL.md`
- Modify: `packages/opencode/src/skill/builtin/.bundle/research-paper-writing/references/examples/method/example-of-the-three-elements.md`
- Modify: `packages/opencode/src/skill/builtin/.bundle/research-paper-writing/references/examples/method/module-design-instant-ngp.md`
- Modify: `packages/opencode/src/skill/builtin/.bundle/xlsx-official/LICENSE`
- Modify: `packages/opencode/src/skill/compose/extract.ts`
- Modify: `packages/opencode/src/tool/view-image.txt`
- Modify: `packages/opencode/src/plugin/codex.ts`

- [ ] **Step 1: Re-prove each of the 12 paths is whitespace/blank-line-only**

Use a non-special zsh variable name; do not use `path`, which would overwrite zsh's command search array.

```bash
for changed_file in \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-dashboard/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-dashboard/specifications/html-dashboard.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-report/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/index/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/visualize-data/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/product-design/workflows/image-to-code/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/product-design/workflows/url-to-code/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/research-paper-writing/references/examples/method/example-of-the-three-elements.md \
  packages/opencode/src/skill/builtin/.bundle/research-paper-writing/references/examples/method/module-design-instant-ngp.md \
  packages/opencode/src/skill/builtin/.bundle/xlsx-official/LICENSE \
  packages/opencode/src/skill/compose/extract.ts \
  packages/opencode/src/tool/view-image.txt
do
  git diff --quiet -w --ignore-blank-lines upstream/main HEAD -- "$changed_file" || {
    echo "semantic drift: $changed_file"
    exit 1
  }
done
```

Expected: no path reports semantic drift. If one does, exclude it and revise the design before proceeding.

- [ ] **Step 2: Align the 12 exact paths to upstream with `apply_patch`**

For each path in the Step 1 list, inspect its exact endpoint diff inside that loop with `git diff upstream/main HEAD -- "$changed_file"` and use `apply_patch` to remove only the whitespace/blank-line drift until:

```bash
git diff --quiet upstream/main HEAD -- \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-dashboard/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-dashboard/specifications/html-dashboard.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-report/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/index/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/visualize-data/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/product-design/workflows/image-to-code/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/product-design/workflows/url-to-code/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/research-paper-writing/references/examples/method/example-of-the-three-elements.md \
  packages/opencode/src/skill/builtin/.bundle/research-paper-writing/references/examples/method/module-design-instant-ngp.md \
  packages/opencode/src/skill/builtin/.bundle/xlsx-official/LICENSE \
  packages/opencode/src/skill/compose/extract.ts \
  packages/opencode/src/tool/view-image.txt
```

Expected: exit 0.

- [ ] **Step 3: Align the neutral Codex provider loop**

In `packages/opencode/src/plugin/codex.ts`, restore upstream's entry iteration form:

```ts
for (const [modelID, model] of Object.entries(provider.models)) {
```

Keep the upstream-equivalent body exactly; do not add behavior for the otherwise-unused `modelID`.

Verify:

```bash
git diff --quiet upstream/main HEAD -- packages/opencode/src/plugin/codex.ts
```

Expected: exit 0.

- [ ] **Step 4: Stage exactly the 13 neutral paths and commit**

```bash
git add -- \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-dashboard/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-dashboard/specifications/html-dashboard.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/build-report/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/index/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/data-analytics/workflows/visualize-data/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/product-design/workflows/image-to-code/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/product-design/workflows/url-to-code/SKILL.md \
  packages/opencode/src/skill/builtin/.bundle/research-paper-writing/references/examples/method/example-of-the-three-elements.md \
  packages/opencode/src/skill/builtin/.bundle/research-paper-writing/references/examples/method/module-design-instant-ngp.md \
  packages/opencode/src/skill/builtin/.bundle/xlsx-official/LICENSE \
  packages/opencode/src/skill/compose/extract.ts \
  packages/opencode/src/tool/view-image.txt \
  packages/opencode/src/plugin/codex.ts
git diff --cached --name-only
git diff --cached --check
git commit -m "chore: align behavior-neutral upstream drift"
```

Expected: the staged list contains exactly those 13 paths.

---

## Task 5: Publish the shared FD/FC registries on `main`

**Files:**

- Modify: `AGENTS.md`
- Modify: `docs/upstream-deviations.md`
- Create: `docs/fork-capabilities.md`
- Create: `docs/fork-registry-history.md`

- [ ] **Step 1: Freeze the audited `main behavior` SHA before documentation**

```bash
git rev-parse HEAD
```

Record this exact SHA as `main behavior`. It is the source/test tree after Tasks 2–4 and before registry-only changes. Do not substitute the later docs commit SHA.

- [ ] **Step 2: Update the branch-aware review gate in `AGENTS.md`**

Replace the current one-registry rule with these two rules:

```md
- Before every upstream sync, review active entries in [docs/upstream-deviations.md](docs/upstream-deviations.md) and [docs/fork-capabilities.md](docs/fork-capabilities.md) for incoming changes to their listed surfaces, including changes that merge cleanly.
- When work targets or propagates into `dev/compat`, additionally review active entries in [docs/dev-compat-overrides.md](docs/dev-compat-overrides.md) against the inherited `main` behavior.
```

Do not change unrelated repository instructions.

- [ ] **Step 3: Normalize `docs/upstream-deviations.md` to shared ownership**

Use `apply_patch` to ensure:

- the file states that `dev/compat` inherits it unchanged;
- the sync index has exactly six rows: FD-001, FD-002, FD-004, FD-005, FD-006, FD-009;
- every entry has status, owner, observable contract, upstream relationship, surfaces, tests/evidence, non-self-referential review basis, and retirement condition;
- FD-009 is incorporated from the root checkout's uncommitted draft as read-only evidence;
- FD-008 and private-WebFetch ownership wording are absent;
- missing identifiers remain unused rather than renumbered.

The active set must be:

```text
FD-001 FD-002 FD-004 FD-005 FD-006 FD-009
```

- [ ] **Step 4: Create the shared capability inventory**

Read the root checkout's untracked `docs/fork-capabilities.md` only as evidence, then create the isolated-worktree file with `apply_patch`. Publish exactly FC-001 through FC-013, without duplicating any FD as a second authority.

Before first publication, define FC-010 as the shared WebFetch redirect-authorization/resource-bound contract:

```text
FC-010: HTTP(S) scheme validation, per-hop permission, manual redirects capped at 10, request timeout, and 5 MB response limit.
```

It must not claim private-address permission. The index must contain exactly 13 rows and every entry must include the same ownership/evidence/retirement fields used by the FD registry.

- [ ] **Step 5: Create the shared append-only history ledger**

Create `docs/fork-registry-history.md` with an initial upstream-to-main audit row containing:

- the freshly fetched `upstream/main` SHA from Task 1;
- the exact `main behavior` SHA from Step 1;
- counts of active FD and FC records;
- changed-path totals computed while excluding all five tracking files;
- a short decision summary for retained shared behavior and removed neutral noise.

The five excluded tracking paths are:

```text
docs/upstream-deviations.md
docs/fork-capabilities.md
docs/dev-compat-overrides.md
docs/fork-registry-history.md
docs/dev-compat-registry-history.md
```

- [ ] **Step 6: Validate registry structure and semantics**

```bash
test "$(rg -c '^## FD-' docs/upstream-deviations.md)" -eq 6
test "$(rg -c '^\| FD-' docs/upstream-deviations.md)" -eq 6
test "$(rg -c '^## FC-' docs/fork-capabilities.md)" -eq 13
test "$(rg -c '^\| FC-' docs/fork-capabilities.md)" -eq 13
! rg -n 'FD-008|approved internal-network WebFetch' docs/upstream-deviations.md
rg -n 'FC-010|10|5 MB|permission' docs/fork-capabilities.md
rg -n 'upstream|main behavior|Review basis|Retirement|Exit' docs/upstream-deviations.md docs/fork-capabilities.md docs/fork-registry-history.md
git diff --check
```

Manually verify that no entry cites its own uncommitted documentation text as evidence and that `dev/compat`-only features are absent from shared registries.

- [ ] **Step 7: Commit the shared registries**

```bash
git add AGENTS.md docs/upstream-deviations.md docs/fork-capabilities.md docs/fork-registry-history.md
git diff --cached --check
git commit -m "docs: publish shared fork capability registry"
```

---

## Task 6: Validate, review, publish, and merge the `main` cleanup

**Files:**

- Verify all files changed in Tasks 2–5.

- [ ] **Step 1: Run the full risk-based local validation**

```bash
cd packages/opencode
bun test test/tool/webfetch.test.ts test/util/ssrf.test.ts test/mcp/lifecycle.test.ts
bun typecheck
cd ../..
bun lint
git diff --check origin/main...HEAD
git status --short
```

Expected: all commands pass and the isolated worktree is clean. Do not claim a binary build; none was requested.

- [ ] **Step 2: Re-fetch and protect against a moved base**

```bash
git fetch --no-tags origin main
git fetch --no-tags upstream main
git merge-base --is-ancestor origin/main HEAD
git merge-base --is-ancestor upstream/main HEAD
```

If either required ancestry check fails, rebase onto the current `origin/main`, repeat the scoped upstream review, refresh any behavior/history SHAs changed by the rebase, and rerun Step 1.

- [ ] **Step 3: Perform an independent exact-diff review**

Invoke `superpowers:requesting-code-review` against:

```bash
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
git log --oneline --decorate origin/main..HEAD
```

Require the reviewer to check the approved ownership boundary, SSRF ordering, MCP non-change, registry count/ownership, root-worktree preservation, and absence of additional formatting cleanup. Resolve all concrete findings and rerun Step 1.

- [ ] **Step 4: Push and open the fork-only PR**

```bash
git push -u origin docs-fork-branch-ownership-design
gh pr create -R onlyfeng/MiMo-Code --base main --head docs-fork-branch-ownership-design --title "Clean up fork main ownership boundaries" --body-file docs/superpowers/specs/2026-08-23-fork-branch-ownership-cleanup-design.md
```

Immediately verify the returned PR:

```bash
gh pr view -R onlyfeng/MiMo-Code --json number,url,headRefOid,baseRefOid,mergeable,reviewDecision,statusCheckRollup,baseRepository
```

Expected: `baseRepository.nameWithOwner` is `onlyfeng/MiMo-Code`, base is `main`, and `headRefOid` equals local `HEAD`.

- [ ] **Step 5: Verify exact-head CI and mergeability**

Record `git rev-parse HEAD`, then use:

```bash
gh pr checks -R onlyfeng/MiMo-Code --watch
gh pr view -R onlyfeng/MiMo-Code --json headRefOid,mergeable,reviewDecision,statusCheckRollup,reviews,comments
```

Every required successful check must belong to the exact recorded head SHA. Address actionable review/comments before merging and rerun local validation after any code change.

- [ ] **Step 6: Merge with a real merge commit and verify the remote tip**

```bash
gh pr merge -R onlyfeng/MiMo-Code --merge --delete-branch=false --match-head-commit "$(git rev-parse HEAD)"
git fetch --no-tags origin main
git rev-parse origin/main
git merge-base --is-ancestor upstream/main origin/main
```

If merge commits are unavailable, stop and ask for direction; do not squash or rebase-merge.

---

## Task 7: Merge accepted `main` into an isolated `dev/compat` integration branch

**Files:**

- Inherit from `origin/main`: `AGENTS.md`
- Inherit from `origin/main`: `docs/upstream-deviations.md`
- Inherit from `origin/main`: `docs/fork-capabilities.md`
- Inherit from `origin/main`: `docs/fork-registry-history.md`

- [ ] **Step 1: Create the compat worktree from the current remote branch**

From `/Users/a4399/Documents/ai/onlyfeng/MiMo-Code`:

```bash
git fetch --no-tags origin main dev/compat
git worktree add -b cleanup/dev-compat-ownership .worktrees/cleanup-dev-compat-ownership origin/dev/compat
cd .worktrees/cleanup-dev-compat-ownership
git status --short
git rev-parse origin/main origin/dev/compat HEAD
bun ci
```

Expected: the new worktree is clean and starts exactly at `origin/dev/compat`.

- [ ] **Step 2: Merge accepted fork `main` without publishing an intermediate tip**

```bash
git merge --no-ff origin/main -m "Merge main ownership cleanup into dev/compat"
```

If shared-registry conflicts occur, inspect the exact `origin/main` blobs and use `apply_patch` to make these files byte-identical to `origin/main`:

```text
AGENTS.md
docs/upstream-deviations.md
docs/fork-capabilities.md
docs/fork-registry-history.md
```

Remove compat-only FD-007 text from the inherited shared registry; it will become DC-TUI-001 in Task 9. Resolve only files involved in this merge, stage them explicitly, and complete the merge commit with `git commit`.

- [ ] **Step 3: Prove shared inheritance and ancestry before overlay work**

```bash
git merge-base --is-ancestor origin/main HEAD
git diff --quiet origin/main -- AGENTS.md docs/upstream-deviations.md docs/fork-capabilities.md docs/fork-registry-history.md
git diff --check origin/dev/compat...HEAD
git status --short
```

Expected: both comparison commands exit 0 and the worktree is clean. Do not push this intermediate state; the compat overlay must land in the same PR branch.

---

## Task 8: Preserve approved intranet access on `dev/compat`

**Files:**

- Modify: `packages/opencode/src/tool/webfetch.ts`
- Modify: `packages/opencode/test/tool/webfetch.test.ts`
- Modify: `packages/opencode/test/mcp/lifecycle.test.ts`
- Verify inherited: `packages/opencode/src/util/ssrf.ts`
- Verify unchanged: `packages/opencode/src/mcp/index.ts`

- [ ] **Step 1: Replace the inherited negative WebFetch cases with one positive RFC1918 sentinel**

In `test/tool/webfetch.test.ts`, replace only the two tests added in Task 2 with a concise test equivalent to:

```ts
test("allows an approved RFC1918 fetch target", async () => {
  const url = "http://192.168.1.1/wiki"
  const events: string[] = []
  const context = {
    ...ctx,
    ask: (input: { patterns: ReadonlyArray<string> }) =>
      Effect.sync(() => {
        events.push(`ask:${input.patterns[0]}`)
      }),
  }
  const http = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.sync(() => {
        events.push(`request:${request.url}`)
        return HttpClientResponse.fromWeb(
          request,
          new Response("intranet", { headers: { "content-type": "text/plain" } }),
        )
      }),
  )

  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      const result = await exec({ url, format: "text" }, http, context)
      expect(result.output).toBe("intranet")
    },
  })
  expect(events).toEqual([
    `ask:${url}`,
    `request:${url}`,
  ])
})
```

This code uses the already-existing helper shape. Preserve all public redirect, scheme, timeout, response-size, and redirect-limit behavior.

- [ ] **Step 2: Confirm the inherited main guard makes the compat sentinel fail**

```bash
cd packages/opencode
bun test test/tool/webfetch.test.ts -t "allows an approved RFC1918 fetch target"
```

Expected: failure occurs before permission/request because inherited `assertSafeUrl()` rejects `192.168.1.1`; `events` remains empty.

- [ ] **Step 3: Remove only the destination-classification overlay points**

From `src/tool/webfetch.ts`, remove exactly:

```ts
import { assertSafeUrl } from "@/util/ssrf"
```

and the two calls added on `main`:

```ts
yield* Effect.promise(() => assertSafeUrl(params.url))
yield* Effect.promise(() => assertSafeUrl(redirectUrl))
```

Keep `src/util/ssrf.ts` and its tests inherited unchanged so compat differs only at the WebFetch policy seam. Preserve scheme validation, permission checks, manual redirects, 10-hop limit, timeout, 5 MB limit, and injected `HttpClient`.

- [ ] **Step 4: Run the positive WebFetch sentinel**

```bash
cd packages/opencode
bun test test/tool/webfetch.test.ts -t "allows an approved RFC1918 fetch target"
```

Expected: pass, with permission recorded before the mocked request.

- [ ] **Step 5: Add the concise MCP synchronization sentinel**

In `test/mcp/lifecycle.test.ts`, restore/adapt the removed test under the new name:

```ts
test(
  "compat permits an RFC1918 remote MCP endpoint",
  withInstance({}, (mcp) =>
    Effect.gen(function* () {
      lastCreatedClientName = "compat-private-remote"
      getOrCreateClientState("compat-private-remote")

      const addResult = yield* mcp.add("compat-private-remote", {
        type: "remote",
        url: "http://192.168.1.1/mcp",
        oauth: false,
      })

      const serverStatus = (addResult.status as any)["compat-private-remote"] ?? addResult.status
      expect(serverStatus.status).toBe("connected")
      expect(clientCreateCount).toBe(1)
    }),
  ),
)
```

Use the existing lifecycle fixture and client mock; do not duplicate the full lifecycle suite and do not make a real network call. This characterization test is expected to pass immediately because current `main` production source has no private-address MCP filter.

- [ ] **Step 6: Verify both compat network contracts and source boundaries**

```bash
cd packages/opencode
bun test test/tool/webfetch.test.ts test/mcp/lifecycle.test.ts
cd ../..
git diff --quiet origin/main -- packages/opencode/src/util/ssrf.ts packages/opencode/test/util/ssrf.test.ts packages/opencode/src/mcp/index.ts
git diff origin/main -- packages/opencode/src/tool/webfetch.ts packages/opencode/test/tool/webfetch.test.ts packages/opencode/test/mcp/lifecycle.test.ts
```

Expected: the SSRF primitive/tests and MCP source are inherited unchanged; only the explicit WebFetch seam and two compatibility tests differ.

- [ ] **Step 7: Commit the compat network overlay**

```bash
git add packages/opencode/src/tool/webfetch.ts packages/opencode/test/tool/webfetch.test.ts packages/opencode/test/mcp/lifecycle.test.ts
git diff --cached --check
git commit -m "feat(compat): preserve intranet network access"
```

---

## Task 9: Publish the `dev/compat` ownership registry

**Files:**

- Create: `docs/dev-compat-overrides.md`
- Create: `docs/dev-compat-registry-history.md`
- Verify inherited unchanged: `AGENTS.md`
- Verify inherited unchanged: `docs/upstream-deviations.md`
- Verify inherited unchanged: `docs/fork-capabilities.md`
- Verify inherited unchanged: `docs/fork-registry-history.md`

- [ ] **Step 1: Freeze inherited-main and compat behavior SHAs**

```bash
git rev-parse origin/main
git rev-parse HEAD
```

Record the first as the accepted inherited `main` tip and the second as `compat behavior`. For each DC entry, use the shared history ledger's `main behavior` SHA as `Base` and the current pre-doc SHA as `compat behavior`; do not use the forthcoming registry commit as runtime evidence.

- [ ] **Step 2: Create the seven-entry compat overlay registry**

Create `docs/dev-compat-overrides.md` with a seven-row sync index and exactly these entries:

```text
DC-NET-001       approved private-network WebFetch
DC-NET-002       RFC1918 remote HTTP(S) MCP reachability
DC-PLATFORM-001  restricted-network and Windows ripgrep/archive fallback
DC-MODEL-001     per-agent MaxMode
DC-CONTEXT-001   model-visible content caps and request preflight
DC-ACTOR-001     full-context actor and static-prefix overflow extensions
DC-TUI-001       request provider/model/variant display; Legacy ID: FD-007
```

Every entry must contain `Status`, canonical owner, `Base`, `Overrides`, observable `Delta`, source/test surfaces, non-self-referential `Review basis`, evidence, and an exit/reconsideration condition.

Record these boundaries explicitly:

- DC-NET-001 removes only `assertSafeUrl()` calls and retains all other WebFetch controls.
- DC-NET-002 is currently a test/guarantee owner, not a production-source fork; it triggers review if future `main` adds private-address MCP filtering.
- DC-PLATFORM-001 stays compat-only and is not proposed for `main`.
- DC-TUI-001 documents both known limits: an unconfigured built-in tier and an in-session agent switch can display `variant: none` while the server resolves an agent variant.

- [ ] **Step 3: Create the compat append-only history ledger**

Create `docs/dev-compat-registry-history.md` with an initial main-to-compat audit row naming:

- accepted `origin/main` tip;
- inherited `main behavior` SHA;
- exact `compat behavior` SHA;
- seven active DC entries;
- changed-path totals excluding the same five tracking files;
- the decision that private WebFetch/MCP reachability and existing project adaptations remain compat-owned.

- [ ] **Step 4: Validate registry ownership and shared-file identity**

```bash
test "$(rg -c '^## DC-' docs/dev-compat-overrides.md)" -eq 7
test "$(rg -c '^\| DC-' docs/dev-compat-overrides.md)" -eq 7
rg -n 'Legacy ID: FD-007|variant: none|192\.168\.1\.1|ripgrep|archive|Base|Overrides|compat behavior' docs/dev-compat-overrides.md docs/dev-compat-registry-history.md
! rg -n 'FD-007' docs/upstream-deviations.md docs/fork-capabilities.md
git diff --quiet origin/main -- AGENTS.md docs/upstream-deviations.md docs/fork-capabilities.md docs/fork-registry-history.md
git diff --check
```

Manually map every substantive `origin/main...HEAD` path to one of the seven DC entries or to the merge history; do not classify formatting noise as a compatibility capability.

- [ ] **Step 5: Commit the compat registries**

```bash
git add docs/dev-compat-overrides.md docs/dev-compat-registry-history.md
git diff --cached --check
git commit -m "docs(compat): publish branch override registry"
```

---

## Task 10: Validate, review, publish, and merge the `dev/compat` cleanup

**Files:**

- Verify all files changed in Tasks 7–9.

- [ ] **Step 1: Run the focused compatibility matrix**

From `packages/opencode` in the compat worktree:

```bash
bun test \
  test/tool/webfetch.test.ts \
  test/mcp/lifecycle.test.ts \
  test/file/ripgrep.test.ts \
  test/util/archive.test.ts \
  test/session/max-mode.test.ts \
  test/session/max-mode-econnreset.test.ts \
  test/session/overflow.test.ts \
  test/session/instruction.test.ts \
  test/session/message-v2.test.ts \
  test/tool/actor.test.ts \
  test/cli/tui/model-metadata.test.tsx \
  test/cli/tui/model.test.ts \
  test/util/safe-stringify.test.ts \
  test/util/text-truncate.test.ts
bun typecheck
cd ../..
bun lint
git diff --check origin/dev/compat...HEAD
git diff --quiet origin/main HEAD -- bun.lock
git status --short
```

Expected: all checks pass, `bun.lock` is byte-identical to `origin/main`, and the worktree is clean.

- [ ] **Step 2: Re-fetch both fork bases and reconcile movement**

```bash
git fetch --no-tags origin main dev/compat
git merge-base --is-ancestor origin/main HEAD
git merge-base --is-ancestor origin/dev/compat HEAD
```

If `origin/main` moved, merge the new `origin/main`, repeat the FD/FC/DC surface review, and reapply only the approved compat overlay if needed. If `origin/dev/compat` moved, merge the new remote tip without rewriting history. In either case, refresh the recorded inherited-main/compat behavior SHAs and registry history, then rerun Step 1.

- [ ] **Step 3: Perform an independent exact-diff review**

Invoke `superpowers:requesting-code-review` against:

```bash
git diff --stat origin/dev/compat...HEAD
git diff origin/dev/compat...HEAD
git diff --stat origin/main...HEAD
git log --oneline --decorate --graph origin/dev/compat..HEAD
```

Require review of the preserved RFC1918 contracts, absence of extra WebFetch weakening, unchanged MCP source, continued `ripgrep/archive` ownership, all seven DC mappings, shared-registry byte identity, and `main` ancestry. Resolve concrete findings and rerun Step 1.

- [ ] **Step 4: Push and open the fork-only compat PR**

```bash
git push -u origin cleanup/dev-compat-ownership
gh pr create -R onlyfeng/MiMo-Code --base dev/compat --head cleanup/dev-compat-ownership --title "Clean up dev/compat ownership boundaries" --body-file docs/superpowers/specs/2026-08-23-fork-branch-ownership-cleanup-design.md
gh pr view -R onlyfeng/MiMo-Code --json number,url,headRefOid,baseRefOid,mergeable,reviewDecision,statusCheckRollup,baseRepository
```

Expected: `baseRepository.nameWithOwner` is `onlyfeng/MiMo-Code`, base is `dev/compat`, and `headRefOid` equals local `HEAD`.

- [ ] **Step 5: Verify exact-head CI, review state, and mergeability**

Record `git rev-parse HEAD`, then run:

```bash
gh pr checks -R onlyfeng/MiMo-Code --watch
gh pr view -R onlyfeng/MiMo-Code --json headRefOid,mergeable,reviewDecision,statusCheckRollup,reviews,comments
```

Every required successful check must belong to that exact head SHA. Address actionable review/comments and repeat local verification after any change.

- [ ] **Step 6: Merge with history preserved**

```bash
gh pr merge -R onlyfeng/MiMo-Code --merge --delete-branch=false --match-head-commit "$(git rev-parse HEAD)"
git fetch --no-tags origin main dev/compat
git merge-base --is-ancestor origin/main origin/dev/compat
```

If merge commits are unavailable, stop and ask for direction; do not squash or rebase-merge.

---

## Task 11: Prove remote completion and clean up only this operation

**Files:**

- Verify: all shared and compat registries
- Preserve: root checkout and all unrelated worktrees

- [ ] **Step 1: Record exact remote tips and ancestry**

From the root checkout:

```bash
git fetch --no-tags origin main dev/compat
git fetch --no-tags upstream main
upstream_sha="$(git rev-parse upstream/main)"
main_sha="$(git rev-parse origin/main)"
compat_sha="$(git rev-parse origin/dev/compat)"
echo "$upstream_sha"
echo "$main_sha"
echo "$compat_sha"
git merge-base --is-ancestor "$upstream_sha" "$main_sha"
git merge-base --is-ancestor "$main_sha" "$compat_sha"
git diff --check "$upstream_sha...$main_sha"
git diff --check "$main_sha...$compat_sha"
```

Expected: both ancestry checks and both diff checks exit 0.

- [ ] **Step 2: Prove exact-SHA CI on both remote tips**

```bash
main_sha="$(git rev-parse origin/main)"
compat_sha="$(git rev-parse origin/dev/compat)"
gh run list -R onlyfeng/MiMo-Code --branch main --commit "$main_sha" --json databaseId,headSha,status,conclusion,workflowName,url
gh run list -R onlyfeng/MiMo-Code --branch dev/compat --commit "$compat_sha" --json databaseId,headSha,status,conclusion,workflowName,url
```

Confirm every required run is completed successfully and has `headSha` exactly equal to the corresponding remote tip. Record workflow names, run IDs, conclusions, and URLs; do not infer tip health from older green runs.

- [ ] **Step 3: Re-audit registry counts, shared identity, and compat ownership**

Use the two remote trees directly:

```bash
test "$(git show origin/main:docs/upstream-deviations.md | rg -c '^## FD-')" -eq 6
test "$(git show origin/main:docs/fork-capabilities.md | rg -c '^## FC-')" -eq 13
test "$(git show origin/dev/compat:docs/dev-compat-overrides.md | rg -c '^## DC-')" -eq 7
git diff --quiet origin/main origin/dev/compat -- AGENTS.md docs/upstream-deviations.md docs/fork-capabilities.md docs/fork-registry-history.md
git diff --quiet origin/main origin/dev/compat -- bun.lock
git diff --name-status origin/main...origin/dev/compat
```

Expected: counts are 6/13/7, shared policy/registry files and lockfile are identical, and every substantive compat-only path maps to a DC entry. Confirm `ripgrep/archive` remains compat-only and Xiaomi WebSearch remains unchanged from upstream.

- [ ] **Step 4: Prove remote equality with the merged PR commits**

```bash
main_pr="$(gh pr list -R onlyfeng/MiMo-Code --state merged --base main --head docs-fork-branch-ownership-design --limit 1 --json number --jq '.[0].number')"
compat_pr="$(gh pr list -R onlyfeng/MiMo-Code --state merged --base dev/compat --head cleanup/dev-compat-ownership --limit 1 --json number --jq '.[0].number')"
test -n "$main_pr"
test -n "$compat_pr"
gh pr view "$main_pr" -R onlyfeng/MiMo-Code --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName
gh pr view "$compat_pr" -R onlyfeng/MiMo-Code --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName
test "$(gh pr view "$main_pr" -R onlyfeng/MiMo-Code --json mergeCommit --jq '.mergeCommit.oid')" = "$(git rev-parse origin/main)"
test "$(gh pr view "$compat_pr" -R onlyfeng/MiMo-Code --json mergeCommit --jq '.mergeCommit.oid')" = "$(git rev-parse origin/dev/compat)"
```

Confirm the `main` PR merge commit equals `origin/main`, the compat PR merge commit equals `origin/dev/compat`, and both PR states are `MERGED`.

- [ ] **Step 5: Verify operation worktrees are clean and root user state is unchanged**

```bash
git -C /Users/a4399/Documents/ai/onlyfeng/MiMo-Code/.worktrees/docs-fork-branch-ownership-design status --short
git -C /Users/a4399/Documents/ai/onlyfeng/MiMo-Code/.worktrees/cleanup-dev-compat-ownership status --short
git -C /Users/a4399/Documents/ai/onlyfeng/MiMo-Code status --short
git -C /Users/a4399/Documents/ai/onlyfeng/MiMo-Code worktree list --porcelain
```

Expected: both operation worktrees are clean; root status exactly matches the Task 1 snapshot; `.mimocode` and the pre-existing `fix-session-run-state-dispose` and `hardening-task1-checkpoint-contract` worktrees are unchanged.

- [ ] **Step 6: Remove only the two worktrees and local branches created by this operation**

After all prior checks succeed, from the root checkout:

```bash
design_worktree=/Users/a4399/Documents/ai/onlyfeng/MiMo-Code/.worktrees/docs-fork-branch-ownership-design
compat_worktree=/Users/a4399/Documents/ai/onlyfeng/MiMo-Code/.worktrees/cleanup-dev-compat-ownership
git -C "$design_worktree" switch --detach origin/main
git -C "$design_worktree" branch -d docs-fork-branch-ownership-design
git -C "$compat_worktree" switch --detach origin/dev/compat
git -C "$compat_worktree" branch -d cleanup/dev-compat-ownership
git worktree remove "$design_worktree"
git worktree remove "$compat_worktree"
git worktree list --porcelain
git status --short
```

Do not remove either pre-existing user worktree or any unrelated branch. Do not force-remove a dirty worktree or force-delete an unmerged branch.

- [ ] **Step 7: Report exact completion evidence**

Report in Chinese:

- selected upstream, fork `main`, and fork `dev/compat` SHAs;
- both PR numbers/URLs and merge commit SHAs;
- exact-SHA CI run IDs and conclusions;
- local test/typecheck/lint commands and outcomes;
- active FD/FC/DC counts;
- confirmed contracts: `main` blocks private WebFetch per hop, `dev/compat` permits approved RFC1918 WebFetch and MCP, and `ripgrep/archive` remains compat-only;
- preserved root/worktree state and the exact temporary cleanup performed.

Do not describe the result as a full upstream synchronization unless `upstream/main` was actually advanced into fork `main` during this operation; describe the precise selected upstream baseline instead.
