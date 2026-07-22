# Actor State Truncation Helper Design

## Goal

Remove the actor tool's duplicate UTF-8 prefix and suffix byte-slicing loops by sharing the boundary-safe primitives in text-truncate, while preserving every actor state-context token, byte-budget, marker, and head/tail allocation rule.

## Branch and Delivery Strategy

This change branches from `onlyfeng/MiMo-Code:dev/compat` and opens a pull request back to the fork's `dev/compat` branch. It is not stacked on the actor lifecycle pull request and is not an upstream pull request.

The implementation branch is `refactor/actor-state-truncation-helper`. It does not modify `main`, SDK output, configuration schemas, documentation outside the design and plan, or `bun.lock`.

## Problem

`packages/opencode/src/util/text-truncate.ts` already owns UTF-8 boundary logic based on encoded bytes. The `context=state` path in `packages/opencode/src/tool/actor.ts` independently walks JavaScript code points to implement `takeUtf8Prefix` and `takeUtf8Suffix`.

Both implementations currently avoid replacement characters, but maintaining two algorithms creates drift risk. Directly replacing the actor path with `capUtf8TextByBytes(..., "head+tail")` is not valid because the generic helper has a different marker and a 65/35 allocation, while actor state context intentionally uses its token-derived byte budget, actor-specific marker, and 60/40 allocation.

## Architecture

Export two low-level string primitives from `packages/opencode/src/util/text-truncate.ts`:

- `takeUtf8PrefixByBytes(text, maxBytes)`
- `takeUtf8SuffixByBytes(text, maxBytes)`

Each primitive converts the input to UTF-8 bytes, delegates boundary selection to the existing `utf8HeadBoundary` or `utf8TailBoundary`, and returns a valid UTF-8 string whose encoded length does not exceed the non-negative integer byte budget. A budget at or below zero returns an empty string; a budget large enough for the input returns the original string.

`capUtf8TextByBytes` continues to own its generic marker and 65/35 head+tail policy. It and the new exports share the same private boundary functions, so there is one UTF-8 boundary implementation without forcing high-level callers onto one marker or allocation policy.

`packages/opencode/src/tool/actor.ts` imports the two primitives and deletes its local code-point loops. `estimateStateTokens` and `capStateContext` stay in the actor tool because they encode actor-specific semantics rather than generic truncation behavior.

## Actor State Contract

The actor path must preserve these values exactly:

1. Truncation is triggered only when `max(Token.estimate(text), round(utf8Bytes / 3))` exceeds the configured maximum.
2. The default maximum remains 11,000 tokens, with `checkpoint.push_caps.checkpoint` as the existing override.
3. The available output budget remains `maxTokens * 3` UTF-8 bytes including the actor marker.
4. The marker remains `\n\n[... checkpoint truncated to ${maxTokens} tokens for actor context=state ...]\n\n`.
5. The content budget remains 60 percent prefix and 40 percent suffix, with the prefix using `floor` and the suffix receiving the remainder.
6. Prefix and suffix slicing do not split a UTF-8 sequence and never introduce U+FFFD.
7. The injected `<session-state>` wrapper and no-checkpoint fallback are unchanged.

## Generic Truncation Contract

The existing `capUtf8TextByBytes` behavior remains unchanged:

- `head`, `tail`, and `head+tail` keep modes retain their current marker text and omitted-byte accounting.
- `head+tail` retains the existing 65/35 policy.
- Non-string runtime values continue to pass through unchanged.
- Existing model-visible byte-cap constants and max-mode character truncation are untouched.

## Testing Strategy

Use test-driven development:

1. Add `packages/opencode/test/util/text-truncate.test.ts` and import the wished-for exports before implementation.
2. Observe RED because the exports do not exist.
3. Cover ASCII and multibyte prefix/suffix boundaries, zero and oversized budgets, encoded-length limits, and absence of replacement characters.
4. Add the minimal exported primitives and observe the new utility tests pass.
5. Replace the actor-local loops with imports and run the existing actor tool integration tests to prove the actor marker, cap, and multibyte behavior remain intact.

Focused verification from `packages/opencode`:

```bash
bun test test/util/text-truncate.test.ts test/tool/actor.test.ts --timeout 30000
bun typecheck
```

Repository verification also includes Prettier for all changed files and `git diff --check origin/dev/compat...HEAD`. The pull request is published only after focused tests, typecheck, formatting, scope checks, and independent branch review pass.

## Files

- Modify `packages/opencode/src/util/text-truncate.ts`: export UTF-8-safe prefix and suffix byte-slicing primitives backed by the existing boundary logic.
- Modify `packages/opencode/src/tool/actor.ts`: import the shared primitives and remove the duplicate loops.
- Create `packages/opencode/test/util/text-truncate.test.ts`: deterministic primitive coverage.
- Add this design and its implementation plan under `docs/superpowers/`.

## Non-Goals

- Calling the generic `capUtf8TextByBytes` directly for actor state context.
- Changing actor token estimation, marker text, byte budget, 60/40 allocation, defaults, or configuration.
- Changing the generic truncation helper's marker, 65/35 allocation, omitted-byte calculation, or callers.
- Moving `estimateStateTokens` or `capStateContext` out of the actor tool.
- Editing `session/prompt.ts`, SDK output, `bun.lock`, or lifecycle coordinator files.
- Opening or updating a pull request against `XiaomiMiMo/MiMo-Code`.
