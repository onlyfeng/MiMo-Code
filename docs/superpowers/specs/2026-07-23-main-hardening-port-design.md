# Main Hardening Port Design

## Goal

Promote four branch-independent correctness and context-safety fixes to the fork's
`main` branch without importing `dev/compat`-only behavior:

1. make the checkpoint writer's real spawn tool contract canonical and replace a
   false-positive source-regex test;
2. add shared UTF-8 truncation primitives and cap tool-history replay;
3. cap the remaining model-visible instruction, inbox, skill, synthetic-content,
   and actor-state injection paths; and
4. reject or recover oversized requests before the provider call.

This document is the design-review gate. It does not authorize implementation,
branch publication, pull-request creation, or merging. Those actions begin only
after explicit user approval of this design.

## Verified Baseline

The design is pinned to the post-sync repository state on 2026-07-23:

- `XiaomiMiMo/MiMo-Code:main`:
  `29a107adfe76cfb67f73862115f56eebb007f569`;
- `onlyfeng/MiMo-Code:main`:
  `365d1012c08ff36ebea4c8dde2a008ca6c52de57`;
- `onlyfeng/MiMo-Code:dev/compat`:
  `2aa07ce3718fa3a878a495a999a748f0ee044429`.

The upstream SHA is an ancestor of fork `main`, and fork `main` is an ancestor of
`dev/compat`. Exact-SHA lint, typecheck, and four test shards are green on both
fork branches.

Before implementing any PR, fetch both remotes again and repeat the affected-file
audit. If `upstream/main` or fork `main` moved, the implementation must rebase its
assumptions on the new tip rather than treating these SHAs as a merge target.

## Current-State Audit

| Capability | `main` at `365d1012` | `dev/compat` at `2aa07ce` | Canonical disposition |
| --- | --- | --- | --- |
| Checkpoint-writer spawn tools | Runtime explicitly passes `read`, `write`, `edit`, `apply_patch`, `glob`, `grep`, and `task`; the high-priority preamble omits `apply_patch` while the embedded writer prompt includes it | Same contradictory prompt | Fix independently in PR 1; `session/checkpoint.ts` owns the contract |
| Checkpoint-writer regression | `tool/whitelist.test.ts` uses a cross-block regex that reaches the later `dream.toolAllowlist`, so it passes while asserting the opposite of the real agent definition | Same false positive | Replace with an assertion against `tryStartCheckpointWriter`'s captured `SpawnInput` |
| Shared UTF-8 cap helper | Absent | Present in `util/text-truncate.ts`, but its public cap exceeds tiny budgets and introduces U+FFFD when truncating ill-formed surrogate input | Promote and correct only branch-independent byte primitives in PR 2 |
| Tool-history replay cap | Absent; persisted tool input/output/error can be replayed without a local size bound | Present in `session/message-v2.ts`, with incomplete edge-case coverage | Promote and strengthen in PR 2 while preserving current attachment routing |
| Other model-visible caps | Absent on instruction, inbox, skill-list, synthetic data/resource/skill/command, and actor-state paths | Present, but inbox/skill wrappers can exceed 50 KiB and oversized skill XML loses its closing tag | Promote corrected wrapper-inclusive semantics in PR 3 |
| MaxMode judge caps | No equivalent shared-main requirement | Present and coupled to `dev/compat` MaxMode | Keep on `dev/compat`; do not port |
| Request preflight overflow | Provider-side overflow handling exists, but no aggregate request preflight | Present after the #35, #36, and #39 corrections | Promote the final generic behavior in PR 4, without MaxMode integration |
| MCP attachment routing | Already present on `main` | Present | No change; textual caps must not alter native/synthetic attachment routing |
| Model-aware skill guidance | Present on `main` after upstream sync | Present together with skill-list capping | PR 3 must preserve GPT/Claude versus MiMo routing while adding the cap |

The split follows two distinct safety layers:

- local source caps prevent one generated or externally supplied field from
  dominating the request; and
- request preflight handles the aggregate request after system text, history,
  and the actually enabled tool schemas have been assembled.

Neither layer substitutes for the other.

The live comparison also rejected a blind copy of the downstream helper:

- a requested cap of 0, 1, 8, or 32 bytes currently emits a 57-byte marker;
- truncating a long string containing an isolated surrogate introduces U+FFFD;
- a 50 KiB plain inbox renders as 51,266 bytes after its wrapper, and an actor
  notification renders as 51,243 bytes; and
- a capped oversized skill listing keeps `<available_skills>` but drops
  `</available_skills>`.

PRs 2 and 3 therefore promote the intended invariant, not the current
downstream implementation byte-for-byte.

## Options Considered

### Selected: four narrow fork PRs

Each PR has one reviewable invariant and a bounded test matrix. Shared code moves
to `main`; `dev/compat` retains only its compatibility-specific extensions.

### Rejected: cherry-pick `dev/compat` PR #35 and its follow-ups

Those commits combine generic caps with MaxMode, structured-output, status, and
compatibility-branch control-flow changes. Cherry-picking them would import
branch-specific behavior and create a much larger semantic merge surface.

### Rejected: one combined hardening PR

One PR would mix a checkpoint contract correction, serialization policy,
multiple injection boundaries, and request-loop control flow. A green aggregate
suite would not isolate which invariant failed, and review or rollback would be
unnecessarily broad.

### Rejected: leave the protections only on `dev/compat`

The affected request-building and checkpoint paths also run on `main`; they are
not compatibility features. Keeping them downstream would preserve duplicate
implementations and make every future upstream sync re-evaluate the same drift.

## Delivery Graph

```text
PR 1: checkpoint writer contract       (independent)

PR 2: UTF-8 helper + replay cap
  ├── PR 3: remaining injection caps   (fresh branch after PR 2 merges)
  └── PR 4: request preflight guard    (fresh branch after PR 2 merges)
```

PR 1 and PR 2 may be implemented independently after design approval. PR 3 and
PR 4 do not stack on one another; each branches from the updated fork `main`
after PR 2 is merged. Every PR targets `onlyfeng/MiMo-Code:main`, never
`XiaomiMiMo/MiMo-Code`.

## PR 1: Canonical Checkpoint-Writer Spawn Contract

### Problem

`tryStartCheckpointWriter` passes this real runtime whitelist to `actor.spawn`:

```text
read, write, edit, apply_patch, glob, grep, task
```

The high-priority writer preamble says only `read`, `write`, `edit`, `glob`,
`grep`, and `task` are available. The embedded `checkpoint-writer.txt` later
lists the correct seven tools, so one request contains contradictory contracts.
More importantly, the test named
`checkpoint-writer config has toolAllowlist ...` searches the source with:

```text
"checkpoint-writer": { ... toolAllowlist: [...]
```

The non-greedy match crosses the end of the checkpoint-writer object and stops at
`dream.toolAllowlist`. It therefore passes even though the checkpoint-writer
intentionally has no `Agent.Info.toolAllowlist`.

Adding `toolAllowlist` to the agent definition would be incorrect. Full-context
forks retain the parent's frozen tool schema for prefix-cache alignment; the
per-spawn `tools` list is the runtime restriction, and the unified memory write
gate remains the hard write boundary.

### Design

Define one internal checkpoint-writer tool list in
`packages/opencode/src/session/checkpoint.ts`. Use it to:

- render one authoritative runtime-contract sentence into the writer task; and
- populate the `tools` field passed to `actor.spawn`.

Replace the static list in
`packages/opencode/src/agent/prompt/checkpoint-writer.txt` with a render token,
and make the high-priority preamble refer to the authoritative contract instead
of repeating a second list. The final task contains one seven-tool contract
rather than two separately maintained lists.

The canonical list includes `apply_patch`. GPT-family registry substitution can
replace edit/write-style tools with `apply_patch`, and the existing memory-only
write gate already validates its add, update, delete, and move targets.

Extend the existing recording actor in
`packages/opencode/test/session/checkpoint-child-session.test.ts` so the test
invokes the real `tryStartCheckpointWriter`, captures its `SpawnInput`, and
asserts:

- the exact runtime tool list;
- the writer task contains one authoritative contract naming the same tools,
  including `apply_patch`;
- the child-session and `parentSessionID` wiring remains unchanged; and
- `Agent.Service` and the checkpoint-writer agent definition still expose no
  checkpoint-writer `toolAllowlist`.

Delete the obsolete source-regex assertion from
`packages/opencode/test/tool/whitelist.test.ts`. Keep the existing service-level
test in `packages/opencode/test/agent/agent.test.ts` that requires
`toolAllowlist === undefined`.

### Acceptance

- The new spawn-contract test is RED before the prompt/contract unification and
  GREEN afterward.
- No checkpoint-writer permission, prefix capture, memory guard, child-session,
  or watermark behavior changes.
- `apply_patch` remains runtime-visible where the model-specific registry
  exposes it, but cannot escape the existing checkpoint memory sandbox.

### Focused Verification

From `packages/opencode`:

```bash
bun test test/session/checkpoint-child-session.test.ts test/tool/whitelist.test.ts test/agent/agent.test.ts test/tool/apply_patch.test.ts --timeout 30000
bun typecheck
```

## PR 2: Shared UTF-8 Helper and Tool-History Replay Cap

### Problem

`MessageV2.toModelMessagesEffect` rebuilds persisted tool calls for provider
history. On `main`, completed output, interrupted output, error text, and tool
input can be replayed without a per-field bound. One pathological tool result can
therefore dominate every later request.

Naive string slicing is not sufficient: it can split UTF-8 data, emit U+FFFD,
lose the diagnostic tail of an error, or produce a marker/wrapper whose final
serialized form exceeds the intended budget.

### Design

Create `packages/opencode/src/util/text-truncate.ts` with a corrected
branch-independent subset of the `dev/compat` helper:

- `MODEL_VISIBLE_TEXT_CAP_BYTES = 50 * 1024`;
- UTF-8-safe prefix and suffix byte slicing;
- a byte-bounded cap supporting `head`, `tail`, and `head+tail`;
- an absolute byte contract: zero or negative budgets return an empty string,
  and a marker too large for the budget is itself UTF-8-safely shortened;
- marker accounting so the final returned text is at most the requested bytes;
- character-aware fallback for ill-formed isolated UTF-16 surrogates so
  truncation does not introduce U+FFFD; and
- pass-through for runtime non-string values on legacy replay records.

Do not port MaxMode character budgets, judge constants, or
`capTextByChars`.

Make `packages/opencode/src/tool/truncate.ts` derive its exported `MAX_BYTES`
from `MODEL_VISIBLE_TEXT_CAP_BYTES`. This removes a duplicate constant for
model-visible tool output without changing the public value or the file-backed
tool truncation service. Keep `read.ts`'s 50 KiB pagination limit independent;
it is a read-window contract, not the generic model-injection owner.

In `packages/opencode/src/session/message-v2.ts`, cap model replay at conversion
time, not by mutating stored history:

- completed tool output: keep the head;
- interrupted output: keep the head;
- tool errors: keep head and tail so the terminal traceback survives;
- tool inputs in every completed/error/pending replay state: safely serialize
  bigint, function, symbol, and circular values, then replace oversized input
  with a `{ truncated: string }` value whose serialized JSON is also within
  50 KiB.

The existing `routeToolAttachment` and provider-native versus synthetic
attachment behavior remain byte-for-byte outside the textual fields.

### Acceptance

- Every capped text result, including its marker, is at most its requested
  budget for head, tail, and head+tail, including zero, negative, and
  smaller-than-marker budgets.
- Every capped replay input remains valid JSON and its serialized form is at
  most 50 KiB.
- ASCII, CJK, emoji, and isolated-surrogate cases do not introduce U+FFFD or
  split a logical boundary.
- Full markers report the correct omitted byte count when the budget can hold
  the marker; tiny budgets prioritize the absolute cap over marker completeness.
- Error-tail assertions prove a final traceback survives.
- Small inputs preserve value and object identity where no normalization is
  required.
- Completed, interrupted, error, pending, running, compacted-placeholder, and
  provider-metadata replay paths are covered.
- Existing native/synthetic attachment tests remain unchanged and green.

### Focused Verification

From `packages/opencode`:

```bash
bun test test/util/text-truncate.test.ts test/session/message-v2.test.ts --timeout 30000
bun typecheck
```

## PR 3: Remaining Model-Visible Injection Caps

### Dependency

Branch from fork `main` only after PR 2 merges. Reuse its helper; do not add a
second truncation utility or local byte-slicing implementation.

### Design

For a purely generated block, one 50 KiB budget includes its fixed header,
opening tag, closing tag, and truncation marker. Callers must reserve those
bytes before capping the variable body. This applies to instruction blocks,
inbox rows, skill listings, MCP/data text parts, and normal synthetic skill
wrappers.

Mixed command and subtask prompts are different: cap only each generated shell
expansion or skill body together with that generated segment's fixed scaffold.
Do not count or truncate `$ARGUMENTS`, appended arguments, or any other direct
user-authored segment. Multiple generated segments and their combination with
user text are handled by PR 4's aggregate request guard, not by silently
rewriting the user text.

Apply caps at the last stable boundary before model injection:

- `session/instruction.ts`: cap each local or remote instruction block,
  including its source header, independently;
- `inbox/render.ts`: cap the complete rendered inbox block while keeping
  `<inbox>` and `<actor-notification>` envelopes structurally intact;
- `session/system.ts`: render the verbose `<available_skills>` listing within a
  reserved wrapper/marker budget while retaining model-aware guidance outside
  the listing;
- `session/prompt.ts`: cap MCP resource text, decoded `data:text/plain`
  content, command shell expansion, free-text skill mentions, and
  skill-command content before synthetic persistence;
- `tool/actor.ts`: cap `context="state"` checkpoint excerpts using the existing
  configured checkpoint token budget and the shared UTF-8 prefix/suffix
  primitives.

Source-specific markers identify what was omitted. Direct user-authored text is
not silently rewritten by this PR; aggregate request pressure belongs to PR 4.

Do not raw-slice serialized skill XML. Reserve the
`<available_skills>...</available_skills>` envelope, keep complete `<skill>`
elements, and truncate only field text inside a complete element when one entry
is individually oversized. Insert a structurally valid marker and always emit
the closing tag.

For actor state, the configured checkpoint limit owns the excerpt, including its
truncation marker, but excludes the fixed `<session-state>` scaffold and the
caller's following prompt. The excerpt must stay within the conservative byte
equivalent even when the configured positive token value is smaller than the
full marker; in that case the marker is shortened instead of exceeding the
budget.

### Branch-Unification Rules

- Preserve `main`'s current model-aware skill-search policy: GPT and Claude do
  not receive `call skill_search` guidance; MiMo still does.
- Do not change MCP file/blob attachment preservation or provider routing.
- Do not port `dev/compat` MaxMode candidate/judge caps, per-agent MaxMode
  configuration, or session-status behavior.
- The shared byte helper on `main` becomes canonical. `dev/compat` may retain
  its character-budget MaxMode extensions as a strict downstream addition.

### Acceptance

- Each injection test observes RED before its production cap.
- Every purely generated block, including its wrapper/header, is within 50 KiB.
  In mixed command/subtask prompts, each generated segment including its local
  scaffold is within 50 KiB while user arguments remain byte-for-byte
  unchanged. A complete source-specific marker is required whenever it fits.
- Multibyte fixtures contain no U+FFFD.
- Local, global, remote, and directory-resolved instruction paths share the same
  exact block contract.
- Plain `<inbox>` blocks retain a complete envelope and stay within 50 KiB;
  completed and failed `<actor-notification>` blocks remain parseable by
  `parseActorNotification`.
- The combined oversized-skill test proves both the cap and the GPT/MiMo
  guidance split, complete opening/closing tags, and no partial `<skill>` entry.
- Data text, MCP text, shell expansion, free-text skill mention, normal skill
  command, and skill subtask paths have wrapper-inclusive byte assertions.
- Actor `context="state"` keeps useful head and tail state and keeps only the
  checkpoint excerpt plus marker within `checkpoint.push_caps.checkpoint`,
  including CJK, emoji, and tiny budgets. The fixed `<session-state>` scaffold
  and following caller prompt are excluded; `context="none"` and
  `context="full"` remain unchanged.

### Focused Verification

From `packages/opencode`:

```bash
bun test test/session/instruction.test.ts test/inbox/render.test.ts test/session/system.test.ts test/session/prompt-effect.test.ts test/tool/actor.test.ts --timeout 30000
bun typecheck
```

## PR 4: Request Preflight Overflow Guard

### Dependency

Branch from fork `main` only after PR 2 merges. It may be implemented in parallel
with PR 3 because it depends only on the shared helper, not on the remaining
source caps.

### Problem

Provider-side context-overflow errors arrive only after request construction and
network dispatch. They also cannot distinguish a recoverable history overflow
from a fixed system/tool prefix that compaction can never shrink.

The guard must conservatively approximate the request using the tools that
survive permission and per-message filtering. Counting every registered tool
would false-trigger on schemas that cannot reach this request.

### Design

In `session/overflow.ts`, add pure request estimation and classification:

- safely serialize system text, model messages, filtered tool schemas, and tool
  choice, including bigint, function, symbol, and circular values;
- cap the fully serialized tool-schema representation at 80 KiB before adding
  its heuristic token contribution; this does not bound the initial schema
  traversal or allocation work;
- use the larger of the existing character estimator and UTF-8 bytes divided by
  three;
- compare against `usable()` with a guard of the smaller of 5,000 tokens or 10%
  of the usable window; and
- classify as `ok`, recoverable `overflow`, or unrecoverable
  `overflow-static` after re-estimating with conversation messages removed.

In `session/prompt.ts`, run the preflight immediately before both normal and
frozen-fork provider paths. Reuse `LLM.resolveTools` to align the estimated tool
membership with permission and per-message filtering. The schema representation
is deliberately capped, and provider/transport code can still add a small
compatibility tool such as `_noop`, so this remains a guarded heuristic rather
than an exact wire-payload calculation. Wrap the provider step already selected
by current `main`; do not copy `dev/compat`'s wrapper that also selects per-agent
MaxMode behavior.

For recoverable overflow:

- finalize an otherwise-empty placeholder assistant as `cancelled` with
  `MessageAbortedError`;
- branch to overflow recovery before generic empty-output/failure
  classification sees that placeholder; and
- enter the existing actor-compaction or main checkpoint-rebuild/compaction
  path without calling the provider.

For static-prefix overflow:

- finalize the assistant as `error` with a clear `ModelError`;
- publish the existing session error event;
- stop instead of entering an unrecoverable compaction loop; and
- do not call the provider.

Cancelled/error placeholder finalization applies only to a classification
produced by this new preflight. A provider or current-main MaxMode step that
actually returns `"overflow"` must not call the new finalizers; it keeps the
existing `main` persistence and recovery path unchanged.

Keep that provider-signalled overflow handling as a fallback. Skip preflight for
native hidden bounded-computation agents, and preserve the existing
`compaction.auto === false` and unknown-context (`limit.context === 0`)
semantics.

The implementation must integrate with current `main` control flow directly. It
must not port the `dev/compat` MaxMode wrapper, per-agent MaxMode selection,
structured-output refactor, bounded provider-overflow placeholder recovery,
classifier changes, or subagent session-status changes. Pure preflight results
are handled before the classifier, so `session/classify.ts` does not change.

### Acceptance

- Pure tests cover ASCII and multibyte estimation, small windows, disabled
  compaction, filtered tools, bigint/function/symbol/circular schemas,
  recoverable message overflow, static-prefix overflow, and the heuristic
  80 KiB schema contribution cap.
- A live recoverable-overflow test proves the placeholder is finalized, the
  first oversized step reaches no provider call, and an observable
  compaction/rebuild boundary owns the next transition.
- A live static-prefix test proves one clear terminal error and zero provider
  calls, with no compaction loop.
- A bounded hidden-agent test proves preflight is skipped.
- Normal-main and frozen-fork request paths are both covered.
- Existing provider-overflow, fork, structured-output, checkpoint rebuild, and
  subagent compaction tests remain green; provider-overflow message persistence
  is explicitly unchanged.

### Focused Verification

From `packages/opencode`:

```bash
bun test test/session/overflow.test.ts test/session/prompt-effect.test.ts --timeout 30000
bun typecheck
```

## Common TDD and Review Contract

For each PR:

1. create a fresh isolated worktree from the required fork `main` tip;
2. add the focused regression and record the expected RED failure;
3. implement only that PR's design;
4. run its focused suite, then the affected broader session/actor matrix;
5. run `bun typecheck` from `packages/opencode`;
6. run repository lint and `git diff --check`;
7. obtain an independent read-only review;
8. push only to `onlyfeng/MiMo-Code`;
9. open a fork PR targeting `main`; and
10. require exact-head-SHA CI before requesting merge approval.

After a shared-main PR merges, do not create a second feature port to
`dev/compat`. Instead, merge the updated `main` into `dev/compat`, treat `main`
as owner of the shared behavior, retain only documented compatibility
extensions, run combination regressions, and verify exact-SHA CI.

## Non-Goals

- Opening or updating any PR against `XiaomiMiMo/MiMo-Code`.
- Porting MaxMode, per-agent MaxMode, MaxMode judge truncation, compatibility
  LSP changes, ripgrep/archive hardening, or any other `dev/compat` feature.
- Changing checkpoint memory paths, write authorization, watermark settlement,
  child-session isolation, or prefix-cache architecture.
- Removing `apply_patch` as a substitute for the checkpoint memory write gate.
- Changing tool-attachment routing, native attachment support, or image payload
  policy.
- Applying one aggregate truncation limit to direct user text.
- Replacing provider-side overflow detection or exact tokenizer accounting.
- Creating implementation branches or PRs before this design is approved.
