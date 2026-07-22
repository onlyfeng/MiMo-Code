# Actor State Truncation Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the centralized UTF-8 boundary logic for actor state-context prefix and suffix slicing without changing actor-visible truncation behavior.

**Architecture:** Export two low-level byte-slicing primitives from `text-truncate.ts`, backed by its existing private UTF-8 boundary functions. Keep actor-specific token estimation, marker construction, byte budgeting, and 60/40 allocation in `actor.ts`; only replace its duplicate code-point loops with the new primitives.

**Tech Stack:** TypeScript, Bun test, Node-compatible `Buffer`, existing MiMo-Code actor integration tests.

## Global Constraints

- Base and PR target are `onlyfeng/MiMo-Code:dev/compat`; do not target `XiaomiMiMo/MiMo-Code`.
- Keep this branch independent from the actor lifecycle PR; do not stack it on `main` or that feature branch.
- Do not modify `main`, SDK output, configuration schemas, `session/prompt.ts`, lifecycle coordinator files, or `bun.lock`.
- Preserve `estimateStateTokens`, the 11,000-token default, `checkpoint.push_caps.checkpoint`, the `maxTokens * 3` total byte budget, the exact actor marker, and the 60/40 content allocation.
- Preserve `capUtf8TextByBytes` marker text, omitted-byte accounting, non-string pass-through, and 65/35 `head+tail` policy.
- Run Bun tests and typecheck only from `packages/opencode`.
- Install dependencies only with `bun ci`; never use `bun install` or `npm install`.

---

### Task 1: Export UTF-8-safe byte-slicing primitives

**Files:**

- Create: `packages/opencode/test/util/text-truncate.test.ts`
- Modify: `packages/opencode/src/util/text-truncate.ts:10-24`

**Interfaces:**

- Consumes: private `utf8HeadBoundary(buf: Buffer, maxBytes: number)` and `utf8TailBoundary(buf: Buffer, start: number)`.
- Produces: `takeUtf8PrefixByBytes(text: string, maxBytes: number): string`.
- Produces: `takeUtf8SuffixByBytes(text: string, maxBytes: number): string`.
- Leaves `capUtf8TextByBytes` and `capTextByChars` signatures and behavior unchanged.

- [ ] **Step 1: Write the failing utility tests**

Create `packages/opencode/test/util/text-truncate.test.ts` with:

```typescript
import { describe, expect, test } from "bun:test"
import { takeUtf8PrefixByBytes, takeUtf8SuffixByBytes } from "../../src/util/text-truncate"

const text = "A界🙂Z"

describe("UTF-8 byte slices", () => {
  test("keeps the requested ASCII prefix or suffix", () => {
    expect(takeUtf8PrefixByBytes("abcdef", 3)).toBe("abc")
    expect(takeUtf8SuffixByBytes("abcdef", 3)).toBe("def")
  })

  test("stops at complete multibyte boundaries", () => {
    expect(takeUtf8PrefixByBytes(text, 1)).toBe("A")
    expect(takeUtf8PrefixByBytes(text, 2)).toBe("A")
    expect(takeUtf8PrefixByBytes(text, 4)).toBe("A界")
    expect(takeUtf8PrefixByBytes(text, 5)).toBe("A界")
    expect(takeUtf8PrefixByBytes(text, 8)).toBe("A界🙂")

    expect(takeUtf8SuffixByBytes(text, 1)).toBe("Z")
    expect(takeUtf8SuffixByBytes(text, 2)).toBe("Z")
    expect(takeUtf8SuffixByBytes(text, 5)).toBe("🙂Z")
    expect(takeUtf8SuffixByBytes(text, 6)).toBe("🙂Z")
    expect(takeUtf8SuffixByBytes(text, 8)).toBe("界🙂Z")
  })

  test("handles zero, negative, and oversized budgets", () => {
    expect(takeUtf8PrefixByBytes(text, 0)).toBe("")
    expect(takeUtf8SuffixByBytes(text, 0)).toBe("")
    expect(takeUtf8PrefixByBytes(text, -1)).toBe("")
    expect(takeUtf8SuffixByBytes(text, -1)).toBe("")
    expect(takeUtf8PrefixByBytes(text, Buffer.byteLength(text, "utf8"))).toBe(text)
    expect(takeUtf8SuffixByBytes(text, Buffer.byteLength(text, "utf8") + 1)).toBe(text)
  })

  test("never exceeds the byte budget or emits a replacement character", () => {
    Array.from({ length: Buffer.byteLength(text, "utf8") + 1 }, (_, budget) => budget).forEach((budget) => {
      const prefix = takeUtf8PrefixByBytes(text, budget)
      const suffix = takeUtf8SuffixByBytes(text, budget)

      expect(Buffer.byteLength(prefix, "utf8")).toBeLessThanOrEqual(budget)
      expect(Buffer.byteLength(suffix, "utf8")).toBeLessThanOrEqual(budget)
      expect(prefix).not.toContain("\uFFFD")
      expect(suffix).not.toContain("\uFFFD")
    })
  })
})
```

- [ ] **Step 2: Run the new test and verify RED**

Run from `packages/opencode`:

```bash
bun test test/util/text-truncate.test.ts
```

Expected: non-zero exit because `../../src/util/text-truncate` does not export `takeUtf8PrefixByBytes` or `takeUtf8SuffixByBytes`. A syntax error, missing dependency, or unrelated test failure is not an acceptable RED result.

- [ ] **Step 3: Add the minimal exported primitives**

In `packages/opencode/src/util/text-truncate.ts`, immediately after `utf8TailBoundary`, add:

```typescript
export function takeUtf8PrefixByBytes(text: string, maxBytes: number) {
  const buf = Buffer.from(text, "utf8")
  if (buf.length <= maxBytes) return text
  return buf.subarray(0, utf8HeadBoundary(buf, Math.max(0, maxBytes))).toString("utf8")
}

export function takeUtf8SuffixByBytes(text: string, maxBytes: number) {
  const buf = Buffer.from(text, "utf8")
  if (buf.length <= maxBytes) return text
  return buf.subarray(utf8TailBoundary(buf, buf.length - Math.max(0, maxBytes))).toString("utf8")
}
```

Do not rewrite `capUtf8TextByBytes` to call these exports. Sharing the private boundary functions is sufficient and avoids changing its marker/budget behavior.

- [ ] **Step 4: Run the utility tests and verify GREEN**

Run from `packages/opencode`:

```bash
bun test test/util/text-truncate.test.ts
```

Expected: `4 pass`, `0 fail`, and no unhandled errors.

- [ ] **Step 5: Verify the generic helper stayed untouched**

Run from the repository root:

```bash
git diff -- packages/opencode/src/util/text-truncate.ts
```

Expected: only the two new exported functions appear after the existing private boundary helpers; `capUtf8TextByBytes`, `capTextByChars`, and constants have no changed lines.

- [ ] **Step 6: Format the utility primitive and tests**

Run from the repository root:

```bash
bunx prettier --write packages/opencode/src/util/text-truncate.ts packages/opencode/test/util/text-truncate.test.ts
bunx prettier --check packages/opencode/src/util/text-truncate.ts packages/opencode/test/util/text-truncate.test.ts
git diff --check
```

Expected: Prettier and the working-tree diff check report no errors.

- [ ] **Step 7: Commit the utility primitive and tests**

```bash
git add packages/opencode/src/util/text-truncate.ts packages/opencode/test/util/text-truncate.test.ts
git commit -m "refactor(util): add UTF-8 byte slicing helpers"
```

### Task 2: Route actor state truncation through the shared primitives

**Files:**

- Modify: `packages/opencode/src/tool/actor.ts:1-75`
- Verify: `packages/opencode/test/tool/actor.test.ts:454-546`

**Interfaces:**

- Consumes: `takeUtf8PrefixByBytes(text: string, maxBytes: number): string`.
- Consumes: `takeUtf8SuffixByBytes(text: string, maxBytes: number): string`.
- Produces: unchanged actor tool output and unchanged `capStateContext(text: string, maxTokens: number)` behavior.

- [ ] **Step 1: Establish the actor integration baseline**

Run from `packages/opencode` before editing `actor.ts`:

```bash
bun test test/tool/actor.test.ts --timeout 30000
```

Expected at this branch base: `20 pass`, `0 fail`. In particular, both `context state caps checkpoint injection before spawning` cases pass.

- [ ] **Step 2: Import the shared primitives**

Add this import alongside the existing `@/` imports in `packages/opencode/src/tool/actor.ts`:

```typescript
import { takeUtf8PrefixByBytes, takeUtf8SuffixByBytes } from "@/util/text-truncate"
```

- [ ] **Step 3: Remove the duplicate actor-local loops**

Delete these functions entirely:

```typescript
function takeUtf8Prefix(text: string, maxBytes: number) {
  let usedBytes = 0
  let result = ""
  for (const char of text) {
    const bytes = Buffer.byteLength(char, "utf8")
    if (usedBytes + bytes > maxBytes) break
    result += char
    usedBytes += bytes
  }
  return result
}

function takeUtf8Suffix(text: string, maxBytes: number) {
  let usedBytes = 0
  let result = ""
  for (const char of Array.from(text).reverse()) {
    const bytes = Buffer.byteLength(char, "utf8")
    if (usedBytes + bytes > maxBytes) break
    result = char + result
    usedBytes += bytes
  }
  return result
}
```

Do not move or otherwise edit `estimateStateTokens`.

- [ ] **Step 4: Replace only the actor slicing calls**

Keep the existing marker and budget calculations, changing only the return expression so `capStateContext` is:

```typescript
function capStateContext(text: string, maxTokens: number) {
  if (estimateStateTokens(text) <= maxTokens) return text
  const marker = `\n\n[... checkpoint truncated to ${maxTokens} tokens for actor context=state ...]\n\n`
  const budget = Math.max(0, maxTokens * 3 - Buffer.byteLength(marker, "utf8"))
  const head = Math.floor(budget * 0.6)
  const tail = budget - head
  return takeUtf8PrefixByBytes(text, head) + marker + (tail > 0 ? takeUtf8SuffixByBytes(text, tail) : "")
}
```

- [ ] **Step 5: Run focused behavior verification**

Run from `packages/opencode`:

```bash
bun test test/util/text-truncate.test.ts test/tool/actor.test.ts --timeout 30000
```

Expected: `24 pass`, `0 fail`; actor state injection still truncates ASCII and multibyte checkpoints, contains the actor marker, and contains no U+FFFD.

- [ ] **Step 6: Run package typecheck**

Run from `packages/opencode`:

```bash
bun typecheck
```

Expected: exit code 0.

- [ ] **Step 7: Verify removal and behavior-preserving scope**

Run from the repository root:

```bash
if rg -n 'function takeUtf8(Prefix|Suffix)' packages/opencode/src/tool/actor.ts; then exit 1; fi
git diff --check
git diff --check origin/dev/compat...HEAD
{ git diff --name-only origin/dev/compat...HEAD; git diff --name-only; } | sort -u
```

Expected: no actor-local slicing functions; no whitespace errors; changed paths are exactly the design, this plan, `packages/opencode/src/util/text-truncate.ts`, `packages/opencode/src/tool/actor.ts`, and `packages/opencode/test/util/text-truncate.test.ts`.

- [ ] **Step 8: Format and re-run final verification**

Run from the repository root:

```bash
bunx prettier --write packages/opencode/src/tool/actor.ts
```

Then rerun from `packages/opencode`:

```bash
bun test test/util/text-truncate.test.ts test/tool/actor.test.ts --timeout 30000
bun typecheck
```

Finally rerun from the repository root:

```bash
bunx prettier --check docs/superpowers/specs/2026-07-22-actor-state-truncation-helper-design.md docs/superpowers/plans/2026-07-22-actor-state-truncation-helper.md packages/opencode/src/util/text-truncate.ts packages/opencode/src/tool/actor.ts packages/opencode/test/util/text-truncate.test.ts
git diff --check
git diff --check origin/dev/compat...HEAD
```

Expected: focused tests and typecheck pass, and Prettier and diff checks report no errors.

- [ ] **Step 9: Commit the actor refactor**

```bash
git add packages/opencode/src/tool/actor.ts
git commit -m "refactor(actor): reuse UTF-8 byte slicing helpers"
```

- [ ] **Step 10: Independent review and fork PR handoff**

First verify the committed worktree from the repository root:

```bash
test -z "$(git status --short)"
git diff --check origin/dev/compat...HEAD
git diff --name-only origin/dev/compat...HEAD
```

Expected: the worktree is clean, the complete branch diff has no whitespace errors, and only the five planned paths are present.

Review the complete `origin/dev/compat...HEAD` diff for these invariants before publishing:

- `capStateContext` keeps the exact marker and 60/40 budget calculation.
- `estimateStateTokens`, the default and config override, `<session-state>` injection, and no-checkpoint fallback are unchanged.
- `capUtf8TextByBytes` and all existing generic callers are unchanged.
- No SDK, configuration, lockfile, lifecycle coordinator, workflow, or upstream repository changes are included.

After review approval, push `refactor/actor-state-truncation-helper` to `origin` and open a draft PR in `onlyfeng/MiMo-Code` with base `dev/compat`. Verify the PR base repository, base ref, head ref, and head SHA explicitly before reporting completion.
