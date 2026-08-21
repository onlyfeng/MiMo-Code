# Instance Generation Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`.
> Implement one task at a time. Each task must demonstrate RED before changing
> production code, then GREEN plus `bun typecheck` before commit.

**Goal:** Replace directory-only, timeout-bounded instance disposal with a
generation owner that cannot deadlock, overlap stale cleanup with a successor,
or let an old callback re-mint new-generation authority.

**Architecture:** One owner-map entry per canonical directory is either
`Open(g)`, `Closing(g)`, non-admitting `Terminal(g)`, or an Absent-origin
`Maintaining(m)` reservation. Every piece of instance work has a target-bound
owner receipt. Retirement closes
intake, settles boot, seals and drains retire-state admission, retires exact
Runner run IDs, closes channels, joins producers and leases, then seals and
drains normal state before a fresh disposer snapshot. Terminal CAS precedes one
failure-isolated disposed-event attempt; a queued successor starts only after
that attempt. No timeout releases the fence.

**Tech stack:** TypeScript, Bun 1.3.14, Effect 4 beta, Hono, Solid TUI, Bun test.

**Spec:**
`docs/superpowers/specs/2026-08-19-instance-generation-retirement-design.md`

## Global constraints

- Publish only to `onlyfeng/MiMo-Code`; implementation targets fork `main`.
- Preserve the dirty `fix/session-run-state-dispose` worktree. Port only its
  test intent; never overwrite or discard its files during this work.
- Commands start at the feature worktree root unless they explicitly `cd`.
- Run tests and `bun typecheck` only from `packages/opencode`.
- Install only with `bun ci`; never use `bun install` or mutate `bun.lock`.
- `Closing(g)`, `Terminal(g)`, `Open(g + 1)`, and `Maintaining(m)` never overlap
  for one canonical directory.
- A timeout may stop a caller waiting; it cannot clear a retirement or
  maintenance owner, open a successor, or authorize deletion.
- Preserve `cancelActorDetached`, graceful actor ownership, fork context,
  checkpoint semantics, and the main-only `SessionStatus` boundary.
- Keep `POST /instance/dispose` at `200 true` accepted. Terminal completion is
  one `server.instance.disposed` event after terminal CAS.
- A retirement or maintenance failure remains fail-closed until restart.
- Every production task through Task 8 updates and stages the checked-in
  producer inventory. Task 9 is test-only and first proves its two removed
  drains are already represented; it need not create a no-op inventory diff.
- Every production task runs its new RED command before implementation. RED
  output is evidence, not a commit. Every commit follows focused GREEN,
  `bun typecheck`, and `git diff --cached --check`.

## Dependency order

```text
inventory
-> disposer signatures
-> directory owner / boot / paired authority
-> InstanceState seal-drain-snapshot
-> Runner Settling(runID)
-> channels / producers / transferred leases
-> HTTP / event / TUI / OpenAPI / SDK
-> worktree maintenance
-> TUI + serve + ACP + web shutdown
-> workflow workaround removal
-> full verification / review / fork PR / compat propagation
```

---

### Task 0: Freeze and manually refresh the producer inventory

**Files**

- Create: `docs/compose/spec/instance-generation-producer-inventory.md`
- Inspect: all `packages/opencode/src` instance, prompt, processor, actor,
  workflow, plugin, Bus, PTY, watcher, server, config, history, memory, and
  bootstrap paths.

**Inventory row contract**

Each row contains a stable `file:symbol` anchor, mutation surface, cancellation
input, settlement receipt, canonical target source, selected owner kind,
ownership mode (`nested`, `transferred`, or directory-root), implementing task,
and deterministic test. A transferred row additionally records the exact
same-target handoff-lease anchor and proves that cross-target work first creates
a short lease in the child target. Owner kind is one of `boot`,
`lease`, `body`, `runner`, `producer`, `channel`, `state_scope`, `retirement`,
`disposer`, `maintenance`, or a proved process-owned mutation-free exemption.
`TBD`, `audit later`, and empty owner/test cells block inventory review.

- [ ] **Step 1: Collect search evidence and observe RED**

Run the seed searches in the inventory document for `Effect.fork*`,
`Effect.runFork`, naked `void` promises, timers, `Instance.bind`, raw instance
providers, lifecycle helpers, disposer calls, and global event publishers.
Independently enumerate and inspect the complete diff of every source file
changed from the PR base, then compare existing rows on native-callback,
stream, long-poll, and detached-promise surfaces. Classify every affected row
and record the reviewed source range. A zero-result seed query is not evidence
that a changed surface has no producer.

The inventory is review evidence, not a complete static proof of arbitrary
TypeScript semantics. API types and module boundaries prevent ordinary
authority or settlement leakage; runtime validation and focused deterministic
tests exercise forged and frozen legacy shapes. Source/import review checks
that no public exposure or unreviewed call site remains. Aliasing, control
flow, module scheduling, and container mutation are inspected in the changed
source rather than inferred by an inventory tool.

Expected RED: the inventory review exposes an unclassified candidate, an empty
ownership decision, or missing deterministic test evidence.

- [ ] **Step 2: Classify the complete starting universe**

The initial table explicitly includes:

- bootstrap service initialization and memory reconcile;
- config dependency install, history backfill, and prune continuation;
- streaming responses and `prompt_async` catch/finally;
- checkpoint outcome plus its full watermark/metrics/pending-queue watcher;
- actor/inbox/tool-session fibers;
- workflow timers and `Effect.runFork` sites, including DB/Bus mutations;
- instance/global SSE, PTY, file watcher, and `/tui/control/next` waiters;
- every direct InstanceRef substitution and every long-lived `Instance.bind`.

No later task may defer discovering ownership that is already visible here.

- [ ] **Step 3: Verify and commit**

```bash
cd packages/opencode
bun typecheck
cd "$(git rev-parse --show-toplevel)"
git diff -- docs/compose/spec/instance-generation-producer-inventory.md
git add -- docs/compose/spec/instance-generation-producer-inventory.md
git diff --cached --check
git commit -m "docs(instance): freeze generation producer ownership"
```

---

### Task 1: Migrate every disposer callback to generation targets and phases

**Files**

- Modify: `packages/opencode/src/effect/instance-registry.ts`
- Modify: `packages/opencode/src/effect/instance-state.ts`
- Modify: `packages/opencode/src/tool/read-state.ts`
- Modify: `packages/opencode/src/tool/session-cwd.ts`
- Modify: `packages/opencode/test/project/instance-dispose.test.ts`
- Create: `packages/opencode/test/effect/instance-registry.test.ts`
- Modify as required: read-state/session-cwd tests and producer inventory.

**Interfaces**

```ts
export interface InstanceTarget {
  directory: string
  generation: number
}

export type DisposerPhase = "retire" | "normal" | "late"

export function registerDisposer(
  fn: (target: InstanceTarget) => Promise<void>,
  opts?: { phase?: DisposerPhase },
): () => void

export interface DisposerSnapshot {
  readonly phases: ReadonlySet<DisposerPhase>
  // entries remain opaque outside instance-registry
}

export function snapshotDisposers(phases: readonly DisposerPhase[]): DisposerSnapshot
export function retireInstance(target: InstanceTarget, snapshot: DisposerSnapshot): Promise<void>
export function disposeInstance(target: InstanceTarget, snapshot: DisposerSnapshot): Promise<void>
```

- [ ] **Step 1: Add and run RED ordering/failure tests**

Use Deferred gates. Prove retire blocks normal/late; a normal disposer
registered after retire settlement appears in a newly captured normal/late
snapshot; all entries in one phase settle; rejection aggregates and prevents
later phases.

```bash
cd packages/opencode
bun test test/effect/instance-registry.test.ts --timeout 30000
```

Expected RED: `retire` is unsupported and current `allSettled` swallows errors.

- [ ] **Step 2: Implement phase snapshots and close the signature migration**

For this commit only, retain a deprecated `disposeInstance(directory: string)`
adapter that maps to generation zero so the existing owner compiles. Task 2
removes it. Every callback that receives the changed signature must migrate in
this task: `InstanceState`, read-state, session-cwd, registry tests, and project
dispose tests. Migrate every string call in those files too; before GREEN, run a
residual source search for `disposeInstance(` and review every result. The
temporary compatibility set is limited to
the deprecated overload plus all three current `project/instance.ts` symbol
anchors: `disposeCached`, `Instance.reload`, and `Instance.dispose`; line
numbers alone are not stable allowlist keys. Every
read-state/session-cwd/registry/test call already passes an `InstanceTarget`.
Task 2 removes the overload and all three string calls. Until Task 3,
directory-owned maps use `target.directory`.

- [ ] **Step 3: Verify and commit**

```bash
cd packages/opencode
bun test test/effect/instance-registry.test.ts test/tool/read-state.test.ts test/tool/session-cwd.test.ts test/project/instance-dispose.test.ts --timeout 30000
bun typecheck
cd "$(git rev-parse --show-toplevel)"
git add -- packages/opencode/src/effect/instance-registry.ts packages/opencode/src/effect/instance-state.ts packages/opencode/src/tool/read-state.ts packages/opencode/src/tool/session-cwd.ts packages/opencode/test/effect/instance-registry.test.ts packages/opencode/test/tool/read-state.test.ts packages/opencode/test/tool/session-cwd.test.ts packages/opencode/test/project/instance-dispose.test.ts docs/compose/spec/instance-generation-producer-inventory.md
git diff --cached --check
git commit -m "refactor(instance): make disposer phases generation aware"
```

---

### Task 2: Build the directory owner, deferred boot, and paired authority

**Files**

- Modify: `packages/opencode/src/project/instance.ts`
- Modify: `packages/opencode/src/project/bootstrap.ts`
- Modify: `packages/opencode/src/config/config.ts`
- Modify: `packages/opencode/src/bus/index.ts`
- Modify: `packages/opencode/src/bus/global.ts`
- Modify: `packages/opencode/src/effect/instance-ref.ts`
- Modify: `packages/opencode/src/effect/instance-registry.ts` (remove the Task 1
  generation-zero compatibility overload).
- Modify: `packages/opencode/src/effect/instance-state.ts`
- Modify: `packages/opencode/src/effect/bootstrap-runtime.ts`
- Modify: `packages/opencode/src/effect/run-service.ts`
- Modify: `packages/opencode/src/effect/bridge.ts`
- Modify: `packages/opencode/src/server/routes/instance/httpapi/server.ts`
- Modify: every raw Task 0 `InstanceRef` provider, including
  `packages/opencode/src/actor/spawn.ts`, `packages/opencode/src/inbox/inbox.ts`,
  `packages/opencode/src/workflow/runtime.ts`, and
  `packages/opencode/src/tool/session.ts`.
- Modify/create: owner, boot, runtime, Bus, HTTP API, actor, inbox, workflow,
  and tool-session admission tests.
- Update: producer inventory.

**Required package-internal types**

These are deep internal exports, not public barrel APIs. Their reviewed
package-internal import sites are recorded in PR evidence. Unique-symbol
constructors remain module-private; focused tests cover the approved callers.

```ts
export type BootInput = {
  directory: string
  init?: () => Promise<unknown>
  worktree?: string
  project?: Project.Info
}

export type OwnerKind =
  | "boot" | "lease" | "body" | "runner" | "producer" | "channel"
  | "state_scope" | "retirement" | "disposer" | "maintenance"

export type MaintenanceTarget = {
  directory: string
  maintenanceID: string
}

export type OwnerTarget =
  | { kind: "generation"; target: InstanceTarget }
  | { kind: "maintenance"; target: MaintenanceTarget }

declare const LifecycleOwnerTokenBrand: unique symbol
type LifecycleOwnerToken = {
  readonly [LifecycleOwnerTokenBrand]: true
  target: OwnerTarget
  kind: OwnerKind
  ownerID: string
}

type GenerationAdmissionToken = LifecycleOwnerToken & {
  target: { kind: "generation"; target: InstanceTarget }
}

declare const LifecycleOwnerStackBrand: unique symbol
type LifecycleOwnerStack = readonly LifecycleOwnerToken[] & {
  readonly [LifecycleOwnerStackBrand]: true
}

type OwnerReceipt = {
  id: string
  target: OwnerTarget
  kind: OwnerKind
  status: "live" | "settled"
  abort?: (reason: unknown) => void
  settled: Promise<{ ok: true } | { ok: false; error: unknown }>
}

export type RejectPromiseLike<R> = R extends PromiseLike<unknown> ? [never] : []
export type OwnerReleaseResult = { ok: true } | { ok: false; error: unknown }

export interface LifecycleOwnerHandle {
  runSync<R>(fn: () => R, ...rejectPromiseLike: RejectPromiseLike<R>): R
  enter<R>(fn: () => Promise<R>): Promise<R>
  release(result: OwnerReleaseResult): void
}

export function registerLifecycleOwner(input: {
  target: OwnerTarget
  kind: OwnerKind
  abort?: (reason: unknown) => void
}): LifecycleOwnerHandle

/** @internal; exact directory-owner/state-scope allowlist. */
export function registerDirectoryRootLifecycleOwner(input: {
  target: OwnerTarget
  kind: OwnerKind
  abort?: (reason: unknown) => void
}): LifecycleOwnerHandle

export interface TransferredLifecycleOwnerHandle {
  readonly state: "pending" | "armed" | "settled"
  runSync<R>(fn: () => R, ...rejectPromiseLike: RejectPromiseLike<R>): R
  enter<R>(fn: () => Promise<R>): Promise<R>
  complete(): void
  close(reason: unknown): void
}

export function transferLifecycleOwner(input: {
  kind: OwnerKind
  handoffFrom: LifecycleOwnerHandle
  abort?: (reason: unknown) => void
  /** @internal; admitted into the child drain by handoff release. */
  onArmed?: () => Promise<void>
}): TransferredLifecycleOwnerHandle

declare const InstanceExecutionBrand: unique symbol
export type InstanceExecution = {
  readonly [InstanceExecutionBrand]: true
}

/** Module-private; never imported or provided outside this module. */
const InstanceAdmissionRef =
  Context.Reference<LifecycleOwnerStack>("~opencode/InstanceAdmissionRef", {
    defaultValue: createEmptyLifecycleOwnerStack,
  })

/** @internal; exact ALS infrastructure capture allowlist. */
export function captureInstanceExecution(): InstanceExecution

/** @internal; exact Effect infrastructure capture allowlist. */
export function captureInstanceExecutionEffect(): Effect.Effect<InstanceExecution>

/** @internal; exact infrastructure import allowlist. */
export function restoreInstanceExecutionSync<R>(
  execution: InstanceExecution,
  fn: () => R,
  ...rejectPromiseLike: RejectPromiseLike<R>
): R

/** @internal; registers the Effect in the owner's callback drain. */
export function enterInstanceExecutionEffect<A, E, R>(
  execution: InstanceExecution,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R>

export interface GenerationLease {
  readonly target: InstanceTarget
  runSync<R>(fn: () => R, ...rejectPromiseLike: RejectPromiseLike<R>): R
  enter<R>(fn: () => Promise<R>): Promise<R>
  release(result: OwnerReleaseResult): void
}

export function acquireGenerationLease(): GenerationLease
export function acquireChildGenerationLease(context: InstanceContext): GenerationLease

export interface GenerationOwnedHandle {
  readonly label: string
  runSync<R>(fn: () => R, ...rejectPromiseLike: RejectPromiseLike<R>): R
  enter<R>(fn: () => Promise<R>): Promise<R>
  complete(): void
  close(reason: unknown): void
}

export interface TransferredGenerationHandle extends GenerationOwnedHandle {
  readonly state: "pending" | "armed" | "settled"
}

export function registerTransferredGenerationProducer(input: {
  handoffFrom: GenerationLease
  label: string
  run: (signal: AbortSignal) => Promise<void>
}): TransferredGenerationHandle
```

One process-lifetime `DirectorySlot { lastGeneration, phase }` is retained for
every canonical directory. Absent-to-Open and successor publication increment
the safe-integer counter under the slot lock; maintenance does not increment,
and only a new server incarnation may reset counters. Directory phases
implement `Open(g)`, `Closing(g, intent)`, non-admitting
`Terminal(g, outcome)`, and Absent-origin `Maintaining(m)`. The latter uses
`MaintenanceTarget`, not a fake `InstanceTarget` generation, and emits disposed
only when an actual Open target was retired. An `OwnerLedger` keeps receipts
until retirement acknowledges them; every receipt also has a synchronous
`live | settled` status. Release flips status before resolving the promise, so
immediate failure cannot disappear before sealing and retained records cannot
authorize stale callbacks.
`Terminal(g)` retains the same OwnerLedger, closing generation, and retirement receipt for typed
503/join behavior; it is never treated as Absent by provide, maintenance, or
global drain. Its outcome is `absent | successor | shutdown` and may be changed
from successor to shutdown by the global drain before final publication.

- [ ] **Step 1: Add and run RED owner/boot races**

Add deterministic tests for:

- deferred boot publication: owner CAS and provider lease precede boot start;
- close during held boot; disposer registered before boot settlement is seen;
- synchronous and asynchronous boot failure automatically become one
  `Closing(boot_failure)` without replacing reload/shutdown/maintenance intent;
- no replacement opens while cleanup is held; exactly one queued successor
  becomes `g + 1` after terminal settlement;
- dispose to Absent and reopen repeatedly never reuses a generation within one
  incarnation; Absent maintenance preserves the counter, while a simulated
  process restart may restart numbering only with a new incarnation;
- a different directory remains available;
- Absent maintenance reservation wins/loses atomically against provide and is
  included in a concurrent global drain; its callback carries a maintenance
  owner and rejects a settled wait on that reservation before mutation;
- retirement/maintenance failure remains fail-closed;
- a throwing listener and an async rejecting listener cannot block terminal
  CAS, other listeners, or successor release; a `once` listener still runs only
  once and removal retains Node EventEmitter semantics;
- listener one re-enters `Instance.provide(sameDirectory)` while listener two
  has not yet been attempted; the Terminal reservation rejects it and no new
  generation starts until all listener invocation attempts finish;
- a disposed listener synchronously installs `requestDisposeAll`, and an
  external drain wins the same Terminal window; both change successor outcome
  to shutdown before final publication and successor init remains zero;
- the retirement owner remains live and exact-ledger-valid through Terminal
  listener attempts, then settles before the final slot CAS removes the ledger.

```bash
cd packages/opencode
bun test test/project/instance-dispose.test.ts test/project/instance-bootstrap-retirement.test.ts test/bus/bus.test.ts --timeout 60000
```

- [ ] **Step 2: Add and run RED authority/remint tests**

Capture opaque ALS and Effect executions under `g` through the exact
infrastructure wrappers; internal assertions see the same target and complete
owner stack, but business callers cannot read either field. After release or
after `g + 1` opens, replay them through those wrappers and prove callback
bodies do not execute. Direct `Instance.provide`,
`reload`, producer/channel registration, and settled APIs reject before
owner-map/gate mutation. A bare InstanceRef and a mismatched token cannot
authorize state or a target switch. Deterministically nest a lease for B under
a live lease for A, then call settled close for A from B: the ambient stack
contains both owner IDs and the call fails before A enters Closing. Repeat with
three levels and with an Effect bridge so no transport may retain only the
innermost token.
For every transferred owner, register under a live parent handle, verify that
`runSync`/`enter` from any captured live ancestor reject before work, release
that exact parent successfully, then prove the root
callback executes with only the transferred token even if another unrelated
ancestor remains live.
Assert at type and runtime level that nested/transferred handles expose no
readiness/settlement thenable. Attempt both former smuggling shapes: obtain
every public field in clean context, and call `enter` while pending before
moving any result into an admitted callback. The latter must throw
synchronously and produce no Promise. After the parent's atomic
release-and-arm, `enter` may return only the admitted callback's own Promise; it
must not await readiness. Prove no public operation can create
`callback -> readiness/settlement -> callback`.
Typecheck rejects `runSync(async () => ...)`. Bypass the type with an untyped
thenable-returning callback and prove runtime adopts the thenable into the
private callback drain, closes with `AsyncLifecycleCallbackError`, throws
synchronously, and blocks retirement until that continuation settles.
Assert that public handles expose no token/execution/owner-stack field and no
generic restore method. Attempt the former raw bypass with every exported
surface: API types must prevent ordinary construction, focused tests exercise
the frozen bypass shapes, and private provenance plus runtime validation must
reject forged opaque values. Internal sync restore has the same PromiseLike
containment, while internal Effect entry remains in the owner drain until
settlement.
Create roots only through the exact-allowlisted directory-root factory, and
capture ALS/Effect execution only through the two allowlisted capture
functions. Prove each captured value has private WeakMap provenance, a forged
or re-exported value is rejected, and neither capture function reveals context
or stack. Acquire an explicit child lease for another live InstanceContext;
prove it appends to rather than replaces the ambient owner stack and rejects a
stale or non-open child before callback execution.
Gate a private early-signal `onArmed` continuation: successful handoff release
must count it in the child drain before scheduling it. Close-before-release
prevents it, close-after-release waits it, and throw/rejection closes the child
without allowing work after terminal settlement.
For both current and child GenerationLeases, register transferred children and
exercise sync throw, async rejection, and an attempted successful release while
`enter` is still held. The first two pass `{ ok: false, error }`, close the
complete child set, and never run `onArmed`; the early release throws before
mutation. Only a settled success may pass `{ ok: true }` and arm the set.
API/runtime validation and focused tests reject a missing or structurally
ambiguous release result.
Register two transfers under one target-local handoff, then race a gated third
registration against successful and failed handoff release. A registration that
linearizes
before the seal must be included in the complete arm/close set; one that loses
must reject before publishing a receipt. Assert that no child remains pending
and repeat the release-and-arm path with a workflow/watcher owner that has no
HTTP middleware boundary.
Close a pending transfer before handoff and prove its body never starts and
its receipt settles. Cover transfer for body/channel/producer; separately prove
boot, retirement, boot-failure, and a successful StateAdmissionTicket create
directory-owned roots rather than inheriting a later-released parent.
Exercise `BootstrapRuntime`, because it is a direct `ManagedRuntime` used by
worktree boot and does not pass through the ordinary run-service helper.
Classify every raw actor/inbox/workflow/tool-session provider before replacing
it. Finite nested work uses the current/child lease. For the existing
`forkIn(scope)` actor work, actor watchdog, inbox wake fiber, and any equivalent
work that survives its caller, first acquire a short lease in the producer's
exact target, register with `handoffFrom` inside that lease's `runSync`, and
release that lease with the setup outcome. Hold a long-lived A producer while
it creates a B actor/inbox wake and waits for B's outcome/ack: B must arm and
reply before A releases. Prove A retirement does not wait for the independent B
producer, while B retirement cancels and joins it. Direct A-ledger to B-ledger
transfer, a forged/settled/mismatched handoff, or B retirement sealing before
registration must reject before receipt publication; registration that wins
must be visible to B retirement. Race `A -> B` and `B -> A` setup to prove the
short target-local handoffs introduce neither a dual-lock cycle nor an orphan
pending receipt. A failed B setup closes the complete B child set and never
runs `onArmed` or the producer body.
At this task boundary, directly register and seal `runner`, `producer`, and
`channel` owners through the nested or transferred primitive selected by their
lifetime; Task 5 builds higher-level producer/channel conveniences on these
same ledger primitives rather than inventing a second ledger.

```bash
cd packages/opencode
bun test test/effect/app-runtime-logger.test.ts test/effect/run-service.test.ts test/effect/instance-state.test.ts test/project/instance-dispose.test.ts test/server/httpapi-instance-admission.test.ts test/actor/spawn.test.ts test/inbox/fork-agent-compat.test.ts test/workflow/runtime-worktree.test.ts test/tool/session-tool.test.ts --timeout 60000
```

Expected RED: source/import review identifies every frozen raw provider and the
Task 1 adapter. Both classes disappear in this task, and focused negative tests
cover their former call shapes before GREEN.

- [ ] **Step 3: Implement central execution transport and ambient validation**

Provide only these package-internal central mechanisms from
`effect/instance-ref.ts`:

- `captureInstanceExecution()` and `captureInstanceExecutionEffect()` create an
  opaque, WeakMap-backed paired execution from the current ALS or Effect
  context; exact allowlists cover `project/instance.ts`, EffectBridge,
  run-service, and BootstrapRuntime, and no caller can construct or inspect the
  stored context/owner stack;
- `restoreInstanceExecutionSync(execution, fn)` handles synchronous
  ALS/callback restoration with the `runSync` PromiseLike rule, while
  `enterInstanceExecutionEffect(execution, effect)` registers the full Effect
  invocation in the callback drain; both restore paired context and the
  complete immutable owner stack after validating target and liveness of every
  token;
- a narrowly named context-only helper clears admission and is allowed only at
  inventoried non-mutating call sites.

`Instance.bind`, `EffectBridge`, run-service, and BootstrapRuntime are the exact
capture/restore import/call allowlist and use opaque `InstanceExecution`; no
handle exposes token/execution/stack fields. `Instance.bind` is synchronous-only;
async work uses the tracked Effect/producer/channel wrapper. An explicitly
present but stale token is never treated as token absence.
The inventory records symbol-level ownership: `project/instance.ts` uses sync
capture/restore; `effect/bridge.ts` uses Effect capture/entry;
`effect/run-service.ts` and `effect/bootstrap-runtime.ts` use sync capture plus
Effect entry; only `project/instance.ts` and `effect/instance-state.ts` call
the directory-root factory. Re-exporting any raw helper or opaque value fails.
Boot, retirement, maintenance, and StateAdmissionTicket scope roots use the
exact-allowlisted `registerDirectoryRootLifecycleOwner`; it is the only API
that can create an empty root stack. Absent maintenance installs
`context: undefined`. `registerLifecycleOwner` is the nested low-level
admission point: it reads the current stack internally, atomically checks the
exact entry and kind seal, records the receipt, appends its token for
`runSync`/`enter`, and flips synchronous liveness before receipt completion on
`release`. Nested `enter` registers its callback immediately and has no
readiness dependency. No public owner handle exposes the ledger Promise.
`transferLifecycleOwner` derives the target from the explicit opaque
`handoffFrom` handle, records an independent pending receipt before that
handoff leaves, and attaches the child to the same-target handoff receipt. A
direct cross-ledger transfer is rejected before publication. Every owner
boundary uses the same rule:
handoff `release({ ok: true })` atomically settles the handoff and arms all
pending children after sealing transfer registration;
`release({ ok: false, error })` closes the complete ledger-owned set. A racing
late transfer is rejected rather than
omitted because registration, release, and that target's producer seal
linearize in one no-yield critical section on the same ledger; there is no
externally selected child subset and no permanently pending receipt. This works
for request,
workflow, watcher, producer, and body owners without a middleware-only commit
API. In the same release transition, any private `onArmed` continuation is
admitted into the child drain before scheduling; close races and rejection are
first-wins and cannot escape that drain. Other ancestors are self-wait
blockers, not readiness dependencies. `runSync` and
`enter` synchronously reject while pending/settled and from any captured live
ancestor. `enter` is a non-async function: after armed it registers the
callback before returning only that callback's Promise, and it never waits
readiness. `runSync` excludes PromiseLike at the type level; a runtime thenable
is adopted into the callback drain before an `AsyncLifecycleCallbackError` is
thrown, so it cannot escape retirement. No public readiness/settlement
thenable exists. `complete()`
is normal success; `close(reason)` is cancellation/failure; the first
idempotent terminal transition wins and flips liveness before its private
receipt resolves. Close/failure before handoff settles without starting.
Directory-owner boot/retirement roots are published directly by the state
machine rather than inheriting a request lease.
Both low-level owners and high-level GenerationLeases require the discriminated
release result. Releasing while an admitted `enter` callback is unsettled
throws `LifecycleOwnerBusyError` before mutation. Wrappers await/catch the
callback, pass `{ ok: true }` only on success, and pass the exact error on sync
throw or async rejection; failure closes every pending transfer instead of
arming it.
`Instance.provide` preflights ambient execution before inspecting or creating
an entry. InstanceState narrows the innermost generation owner to the current
target and requires it to match InstanceRef, without discarding ancestor
owners. An Absent-maintenance callback appends its maintenance owner and carries
no fabricated InstanceContext, so self-wait detection still works. Same-
directory stale context cannot mint g+1; finite cross-directory work uses
`acquireChildGenerationLease(context)`, which validates the child is the
current Open generation and appends a new child owner to the inherited stack.
It must not replace the parent stack. Same-target code uses
`acquireGenerationLease()`. Only the exact-allowlisted directory-root factory,
or a transferred owner after successful handoff release, may start with a new
root stack. Migrate every Task 0 raw `InstanceRef` provider in this
task: finite same/cross-target code uses the paired lease wrapper, while
actor/inbox/workflow/tool-session work that outlives its caller first acquires a
short same-target or child-target `GenerationLease`, then calls
`registerTransferredGenerationProducer({ handoffFrom, ... })` inside that
lease's `runSync` and immediately releases the handoff with the exact setup
outcome. The producer target/context is derived from private lease provenance;
the outer long-lived owner remains lineage only and is never the handoff for a
different target. The synchronous acquire/register/release region contains no
`await`, early return, naked throw, or pre-release handle escape. Its wrapper is
implemented here on the low-level transfer primitive and is reused—not
reinvented—by Task 5. Refresh the inventory and review every listed raw
provider and authority call site before GREEN; source/import review must find
no remaining listed legacy site. Focused tests exercise the frozen raw-provider,
AdmissionRef, token/stack/execution, and restore bypass shapes, while runtime
provenance rejects forged values. Remove the Task 1 generation-zero overload
and migrate all three `project/instance.ts` string arguments; focused tests
cover both the deprecated overload and string-call migration.

- [ ] **Step 4: Implement owner state and all-owner self-wait**

Retain one `DirectorySlot` per canonical path for the process lifetime. Opening
from Absent and publishing a successor increment `lastGeneration` under the
slot lock, reject unsafe-integer overflow, and never delete/reset the counter;
maintenance leaves it unchanged. Boot is `allocate unstarted receipt -> CAS
Open -> reserve provider lease -> start once`. The owner ledger uses
`sealedKinds`, not one boolean. Open-to-
Closing first registers its retirement owner, then synchronously seals new
lease/body, runner, producer, and channel registration while retaining the same
ledger. State-scope/disposer registration by already-live cleanup owners remains
available only through the pre-seal `StateAdmissionTicket` introduced in Task 3;
Task 2 keeps the owner kinds open until that later task installs the linearized
seal. Owner release synchronously
marks its receipt settled before completing the receipt promise; validation
never treats mere ledger membership as liveness.
Internal child-owner joins exclude the orchestrator's own retirement record;
Terminal retains the same ledger and that record settles immediately before
final slot publication. It still belongs to the transitive
self-wait set, so a disposer/retirement callback cannot wait on its own close.

Before a settled API installs a gate, mutates an entry, or awaits anything, it
computes the transitive owner IDs in the receipt and rejects any intersection
with the complete ambient owner stack, including live ancestors hidden beneath
a nested child target. This is not limited to the innermost token or request
leases. Accepted `dispose`, `reload`, and
`requestDisposeAll()` may be initiated by a live owner; stale owners still
reject. `requestDisposeAll()` returns an opaque non-thenable request ID with no
readiness/settlement method. Public completion is an event or a process-owned
continuation registered at request creation, never a Promise that can be moved
into an admitted callback. Private joins are structurally limited to the
directory owner, shared shutdown coordinator, headless-bootstrap and workflow
process-owned cleanup, and one test-only fixture; worktree deletion must use
`maintainDirectory`. The inventory review accounts for every other import/call
site, and focused tests cover the approved boundaries.

The module-private `disposeAllSettled()` synchronously installs its global intake gate before its first
await, converts Closing reload intents and Terminal successor outcomes to
shutdown, joins existing maintenance/failure receipts, and is reusable after
success. Terminal final publication re-checks the gate and current outcome
under the slot lock; if shutdown won, it never publishes or starts a successor.
It never supersedes maintenance or boot-failure policy. The public
`requestDisposeAll()` exposes only an opaque request ID and terminal event/
process-owned continuation; no receipt Promise crosses into generation code.

Keep the old `disposeDirectory()`/`disposeAll()` Promise facades as deprecated
compatibility wrappers during Tasks 2-7, under the exact Task 0 legacy flag.
New code may not call them. In this task migrate `Config.invalidate` to
`requestDisposeAll()` plus terminal event/process-owned continuation semantics;
a generation-owned caller may request and leave but may not await global
settlement. Later tasks migrate the other frozen anchors. The legacy flag must
fail if a new declaration or caller appears.

- [ ] **Step 5: Make boot work receipt-owned and terminal events single-owner**

Move bootstrap initialization and memory reconcile into `BootReceipt.settled`;
partial resource registration is complete before that receipt settles on
failure. Remove the duplicate local Bus disposed publication. Terminal CAS
installs a non-admitting `Terminal(g)` reservation holding either Absent or
successor outcome. Safe GlobalBus emission catches sync throws and immediately
attaches rejection handlers to returned promises without awaiting them. It
invokes one `rawListeners("event")` snapshot so Node's raw `once` wrappers
preserve their semantics. Terminal retains the same OwnerLedger through every
listener attempt, while the safe emitter clears ambient instance owners for
external listeners. Only after all attempts does a second slot-locked CAS
re-read the drain gate/current outcome, synchronously settle and acknowledge
the retirement record, and publish Absent or the next monotonically allocated
unstarted successor. A listener-installed drain may convert the outcome to
shutdown; successor init then remains zero.

- [ ] **Step 6: Verify and commit**

```bash
cd packages/opencode
bun test test/project/instance-dispose.test.ts test/project/instance-bootstrap-retirement.test.ts test/bus/bus.test.ts test/effect/instance-registry.test.ts test/effect/app-runtime-logger.test.ts test/effect/run-service.test.ts test/effect/instance-state.test.ts test/server/httpapi-instance-admission.test.ts test/actor/spawn.test.ts test/inbox/fork-agent-compat.test.ts test/workflow/runtime-worktree.test.ts test/tool/session-tool.test.ts --timeout 60000
bun typecheck
cd "$(git rev-parse --show-toplevel)"
git add -- packages/opencode/src/project/instance.ts packages/opencode/src/project/bootstrap.ts packages/opencode/src/config/config.ts packages/opencode/src/bus/index.ts packages/opencode/src/bus/global.ts packages/opencode/src/effect/instance-ref.ts packages/opencode/src/effect/instance-registry.ts packages/opencode/src/effect/instance-state.ts packages/opencode/src/effect/bootstrap-runtime.ts packages/opencode/src/effect/run-service.ts packages/opencode/src/effect/bridge.ts packages/opencode/src/server/routes/instance/httpapi/server.ts packages/opencode/src/actor/spawn.ts packages/opencode/src/inbox/inbox.ts packages/opencode/src/workflow/runtime.ts packages/opencode/src/tool/session.ts packages/opencode/test/project/instance-dispose.test.ts packages/opencode/test/project/instance-bootstrap-retirement.test.ts packages/opencode/test/bus/bus.test.ts packages/opencode/test/effect/instance-registry.test.ts packages/opencode/test/effect/app-runtime-logger.test.ts packages/opencode/test/effect/run-service.test.ts packages/opencode/test/effect/instance-state.test.ts packages/opencode/test/server/httpapi-instance-admission.test.ts packages/opencode/test/actor/spawn.test.ts packages/opencode/test/inbox/fork-agent-compat.test.ts packages/opencode/test/workflow/runtime-worktree.test.ts packages/opencode/test/tool/session-tool.test.ts docs/compose/spec/instance-generation-producer-inventory.md
git diff --cached --check
git commit -m "feat(instance): add generation owner and paired authority"
```

---

### Task 3: Seal `InstanceState` by exact generation

**Files**

- Create: `packages/opencode/src/effect/instance-state-registry.ts`
- Create: `packages/opencode/test/effect/instance-state-registry.test.ts`
- Modify: `packages/opencode/src/effect/instance-state.ts`
- Modify: `packages/opencode/src/project/instance.ts`
- Modify: `packages/opencode/test/effect/instance-state.test.ts`
- Modify: Bus and project disposal tests; update inventory.

**Interfaces**

```ts
export type SealPhase = "retire" | "general"

export type SealReceipt = {
  target: InstanceTarget
  phase: SealPhase
  drained: Promise<void>
}

export type StateAdmissionTicket = {
  target: InstanceTarget
  phase: SealPhase
  registerScope(dispose: () => Promise<void>): void
  release(): void
}

export function sealGenerationState(
  target: InstanceTarget,
  phase: SealPhase,
): SealReceipt // synchronous seal; awaiting drained happens later
```

Every InstanceState participant registers with this small registry. A
participant created after a target was sealed starts sealed. `InstanceState`
keys are collision-free `(generation, directory)` values; `make` accepts
`retire | normal | late`.

- [ ] **Step 1: Add and run RED generation/fence tests**

Test exact g/g+1 isolation, captured ALS/Effect stale access, warm synchronous
Bus `runSync`, and both acquisition linearizations. For each retire/general
phase:

```text
admission wins -> seal -> seal waits -> acquisition settles -> fresh snapshot
seal wins -> acquisition interrupts before ScopedCache.get
```

Add participant registration while the pre-seal drain is held and after the
seal; the former appears in the fresh snapshot, the latter starts sealed and
cannot initialize g. Add the same two orders for manual invalidate.
Gate one asynchronous initializer after it wins admission: seal the participant,
let initialization finish and register its scope/disposer with the minted
ticket, then prove the drain reaches zero and the fresh snapshot includes it.

```bash
cd packages/opencode
bun test test/effect/instance-state-registry.test.ts test/effect/instance-state.test.ts test/bus/bus.test.ts test/project/instance-dispose.test.ts --timeout 30000
```

- [ ] **Step 2: Implement seal, drain, then fresh snapshot**

The sequence is exact and must not be collapsed:

```text
synchronously advance waterline, seal current/future participants, and stop
minting StateAdmissionTickets
-> release registry lock
-> await pre-seal tickets (each releases only after scope/disposer registration)
-> under one lock seal state_scope/disposer owner kinds and capture a fresh snapshot
-> invalidate exact generation entries and run that snapshot
```

Never snapshot before the drain and never hold a lock while awaiting. A warm
`get`/`has` performs only synchronous waterline/token validation and count
increment before `ScopedCache`; no Semaphore makes Bus cache hits asynchronous.
Manual invalidate uses a temporary exact-key gate, waits current acquisitions,
invalidates, then reopens without advancing `retiredThrough`.

Each pre-seal admission synchronously mints a `StateAdmissionTicket` before
cache access. After participant seal, only those tickets may register a
`state_scope` owner/disposer; post-seal callers cannot initialize. Ticket
release occurs after registration, and drain-zero linearizes the owner-kind
seal plus fresh snapshot. Each successful `InstanceState` initialization
registers a `state_scope` owner for that exact cache scope. Its receipt remains live until the disposer for its
declared retire/normal/late phase closes the scope and its finalizer settles.
The earlier channel/producer/lease drain must not await state-scope or disposer
owners, because the corresponding phase runner is what settles them. They do
remain in transitive self-wait preflight. Initialization and finalizer callbacks
do not share one stale parent stack: initialization is nested under the
acquisition, while its ticket uses private directory-owner authority to register
an immediately armed scope root before release. The finalizer runs under that
independent root even if the retirement owner is still live; generic transfer
and ambient-ancestor readiness are not involved. A scope callback
cannot synchronously await the phase that must close itself.

Task 4 adds a real cache-miss test during runner retirement: SessionStatus/Bus
initializes under the retirement token, the scope finalizer completes before
the retirement owner settles, and no readiness cycle occurs.

Task 2's owner performs the retire seal after boot settlement and the general
seal only after runner/channel/producer/lease settlement. The real Runner
default-layer cleanup test belongs to Task 4; Task 3 uses synthetic retire state
so every task remains independently GREEN.

- [ ] **Step 3: Verify and commit**

```bash
cd packages/opencode
bun test test/effect/instance-state-registry.test.ts test/effect/instance-state.test.ts test/bus/bus.test.ts test/project/instance-dispose.test.ts --timeout 30000
bun typecheck
cd "$(git rev-parse --show-toplevel)"
git add -- packages/opencode/src/effect/instance-state-registry.ts packages/opencode/src/effect/instance-state.ts packages/opencode/src/project/instance.ts packages/opencode/test/effect/instance-state-registry.test.ts packages/opencode/test/effect/instance-state.test.ts packages/opencode/test/bus/bus.test.ts packages/opencode/test/project/instance-dispose.test.ts docs/compose/spec/instance-generation-producer-inventory.md
git diff --cached --check
git commit -m "fix(instance): seal state by exact generation"
```

---

### Task 4: Retire exact Runner run IDs before dependent services

**Files**

- Modify: `packages/opencode/src/effect/runner.ts`
- Modify: `packages/opencode/src/session/run-state.ts`
- Modify: `packages/opencode/test/effect/runner.test.ts`
- Create: `packages/opencode/test/session/run-state-dispose.test.ts`
- Modify: `packages/opencode/test/session/run-state-tuple-key.test.ts`
- Update: producer inventory.

**Interfaces**

```ts
export type StartAdmission<A, E> =
  | { _tag: "starting"; runID: number; startGate: Deferred.Deferred<void>; settled: Effect.Effect<void> }
  | { _tag: "accepted"; runID: number; completion: Effect.Effect<A, E> }
  | { _tag: "settling"; settled: Effect.Effect<void> }

export interface Runner<A, E = never> {
  readonly admitRunning: (work: Effect.Effect<A, E>) => Effect.Effect<StartAdmission<A, E>>
  readonly admitShell: (work: Effect.Effect<A, E>) => Effect.Effect<StartAdmission<A, E>>
  readonly cancelRun: (runID: number) => Effect.Effect<void>
  // existing flattening wrappers remain for non-SessionRunState callers
}
```

Runner state adds `Starting(runID, startGate, settled)` and
`Settling(runID, settled)`. `SessionRunState` stores
`{ runner, runID, settled }` per key plus one `retiring` flag.

- [ ] **Step 1: Port and run the parked Deferred-gate RED tests**

Preserve the parked test's `started`, `cleanupStarted`, and `releaseCleanup`
intent. Add deterministic races for:

- start published before retirement lock;
- retirement lock before start;
- outer-map creation before inner Running publication;
- retirement while the exact `Starting` entry is held before fiber creation;
- run 1 held in Settling/onIdle while run 2 attempts to start;
- cancel while Settling;
- main vs subagent status ownership using real default layers;
- a retirement-token cache miss initializes real SessionStatus/Bus state,
  whose directory-owned scope finalizer settles before the retirement owner.

```bash
cd packages/opencode
bun test test/effect/runner.test.ts test/session/run-state-dispose.test.ts test/session/run-state-tuple-key.test.ts test/effect/instance-state.test.ts --timeout 30000
```

- [ ] **Step 2: Implement Settling and outer/inner lock order**

Start holds the short outer run-state lock only while a non-yielding
`tryAdmitNow` CAS publishes `Starting` and the same `runID`/receipt in the map;
completion is awaited after releasing the outer lock. Outside the lock it
creates the fiber and conditionally advances that exact Starting entry to
Running/Shell. Retirement snapshots Starting and closes its start gate so held
work settles without starting. If the current Runner implementation cannot
expose a genuinely synchronous CAS, co-locate the admission state in the outer
Ref rather than acquiring an inner async lock while holding outer. Work
completion or cancel transitions inner
state to Settling before processor interruption, `onIdle`, main-only status, or
map cleanup. A start that sees Settling waits and retries; it cannot reuse that
Runner.

Map deletion is conditional on runner identity and exact completed runID. Old
cleanup cannot delete a newer map entry. Only after processor cleanup,
`onIdle`, main-only status, and conditional map cleanup settle may the inner
state publish Idle and complete the settling receipt. `cancelRun(runID)` waits
that exact run and never cancels a later reuse. Retirement holds the outer lock only to
set `retiring=true` and snapshot exact `{runner, runID, settled}` records; it
then releases the lock before `cancelRun`/join. It snapshots Starting, Running,
and Settling. Never hold outer while awaiting/acquiring inner, or inner while
acquiring outer; the synchronous CAS above is the only outer-to-runner
interaction.

Register SessionRunState with `{ phase: "retire" }`. Its real onIdle runs under
the retirement owner before the general seal and may acquire SessionStatus/Bus;
after the seal the same token is denied. Preserve `cancelActorDetached` and the
main-only status rule.

- [ ] **Step 3: Verify and commit**

```bash
cd packages/opencode
bun test test/effect/runner.test.ts test/session/run-state-dispose.test.ts test/session/run-state-tuple-key.test.ts test/effect/instance-state.test.ts --timeout 30000
bun typecheck
cd "$(git rev-parse --show-toplevel)"
git add -- packages/opencode/src/effect/runner.ts packages/opencode/src/session/run-state.ts packages/opencode/test/effect/runner.test.ts packages/opencode/test/session/run-state-dispose.test.ts packages/opencode/test/session/run-state-tuple-key.test.ts packages/opencode/test/effect/instance-state.test.ts docs/compose/spec/instance-generation-producer-inventory.md
git diff --cached --check
git commit -m "fix(session): settle exact runners before instance dependencies"
```

---

### Task 5: Bind channels, producers, callbacks, and body streams to generations

**Files**

- Modify: config, history, prune, checkpoint, actor, inbox, tool-session, and
  workflow runtime sources named by the inventory.
- Modify: `packages/opencode/src/pty/index.ts`
- Modify: `packages/opencode/src/file/watcher.ts`
- Modify: instance middleware plus event, PTY, session, and TUI control routes.
- Modify: `packages/opencode/src/server/proxy.ts` and
  `packages/opencode/src/server/workspace.ts` for proxied/relayed body transfer.
- Create/modify: producer, stream, checkpoint, actor/inbox/tool/workflow,
  watcher, PTY, and TUI-control tests.
- Update: producer inventory; every row must now name a concrete API and test.

**Interfaces**

Task 2's `GenerationLease`, `acquireGenerationLease()`, and
`acquireChildGenerationLease(context)`, `GenerationOwnedHandle`,
`TransferredGenerationHandle`, and `registerTransferredGenerationProducer`
remain the canonical finite/transferred surfaces.
Task 5 adds:

```ts
export function runNestedGenerationProducer<A>(input: {
  label: string
  run: (signal: AbortSignal) => Promise<A>
}): Promise<A>

export type GenerationChannelHandle = GenerationOwnedHandle

export type GenerationBodyHandle = TransferredGenerationHandle

export function registerNestedGenerationChannel(input: {
  label: string
  closeTransport(reason: unknown): Promise<void>
}): GenerationChannelHandle

export function registerTransferredGenerationChannel(input: {
  handoffFrom: GenerationLease
  label: string
  closeTransport(reason: unknown): Promise<void>
}): TransferredGenerationHandle

export function registerGenerationBody(input: {
  handoffFrom: GenerationLease
  label: string
  cancelBody(reason: unknown): Promise<void>
}): GenerationBodyHandle
```

Nested channel registration uses `registerLifecycleOwner`, is immediately
live, and may be awaited by its parent because it has no readiness dependency.
Transferred channel/body/producer registration requires an explicit short
same-target `handoffFrom` lease and uses `transferLifecycleOwner` before that
handoff leaves. The handoff handle's successful
`release({ ok: true })` atomically arms every registered transfer in request,
workflow, watcher, producer, and body paths. A transferred handle is
dormant before that release: pending `runSync`/`enter` throws
synchronously and returns no Promise. Late native/SSE/PTY/watcher/body
callbacks use only the armed root execution, never the expired request lease.
Armed `enter` returns only its tracked callback Promise; no raw
readiness/settlement Promise is exposed. `runSync` rejects PromiseLike by type
and safely adopts any untyped runtime thenable into the drain before reporting
misuse.
If a transport can signal before handoff release, its registration wrapper
either closes it immediately or stores one bounded internal `onArmed`
continuation in the transferred receipt. The release transition admits that
continuation into the child drain before scheduling it; no resolver/Promise or general enqueue
method is exposed to application code. Close-before-release prevents it,
close-after-release joins it, and throw/rejection closes the child without an
escape from the drain.
Closing before handoff prevents work from starting. Closing after handoff seals
new data callbacks and actively
interrupts pending I/O. `closeTransport`/`cancelBody` resolve only on the exact
transport/body terminal acknowledgement (for PTY, the native `onClose`, not the
return from `ws.close()`) and are not routed through the sealed data-callback
gate. `complete()` records natural success; `close(reason)` records cancel/
failure; the first idempotent transition wins. The private ledger receipt joins
that acknowledgement plus every callback admitted before the seal and is read
only by retirement.

- [ ] **Step 1: Add and run the complete producer RED matrix**

Use Deferred gates, not sleeps. Cover dependency install, history, reconcile,
prune, actor/inbox/tool callbacks, all inventoried workflow timers/forks, and a
producer defect. Prove runner retirement happens first, then channel/body
close, producer seal/join, finite active drain, and only then general
seal/disposers.

For checkpoint, gate after actor outcome but before watermark DB update. The
receipt remains through writer deletion, metrics publication, and sealed pending
queue disposition. No pending writer starts after seal.

For HTTP, obtain a real streaming Response without consuming it, begin
retirement/shutdown, and prove its transferred body handle actively cancels the
body and settles without transport force-close. Repeat for backpressure and
`prompt_async` catch/finally. Under a live outer request lease, have the route or
body wrapper acquire a short same-target handoff, register inside its `runSync`,
and release it before returning the Response or launching detached work. Prove
the root callback runs while the middleware lease is still live and that only
the short lease arms it. Pre-handoff entry throws synchronously without yielding
a Promise; the handoff owner cannot await a clean/native pre-handoff result
because no such result exists. Bypass the `runSync` type with an async callback
and prove its continuation remains in the private drain until settlement.
Also fully consume a body and complete a transferred producer successfully:
both call `complete()`, report success without invoking abort, and race
idempotently with a concurrent retirement close.
Prove a nested producer starts immediately and its owner may await its tracked
Promise. Prove transferred producer registration returns no Promise/result,
starts only after its explicit target-local handoff release, and is already
counted in the child drain when its private run callback is scheduled. Keep an
outer A owner live while a short B handoff arms a B producer and returns an
outcome to A; this must complete before A releases. Reject the former
context-only/ambient-parent shape and a forged, settled, or target-mismatched
handoff.
For SSE, block a real `writeSSE`; close must abort the writer, heartbeat,
subscription, and queue rather than only pushing a sentinel. For PTY, gate
upgrade vs `onOpen`; a late socket closes immediately and no post-close message
callback runs. Delay native `onClose` after `ws.close()` and prove settlement
waits it even though data-callback admission is sealed.

For `/tui/control/next`, remove global queues. Pending request/response pairs
carry `(directory, generation, requestID)`. Register an immediately live nested
channel before `await request.next()`, run the wait through its tracked
`enter`, and complete it in `finally`. Normal delivery resolves under the same
parent lease; retirement closes/removes the waiter before the finite lease
barrier so the route unwinds. It rejects on Closing and cannot cross directory
or generation. File watcher and PTY native callbacks use their own long-lived
transferred channel/producer owner, not an expired request/boot token.

```bash
cd packages/opencode
bun test test/project/instance-producer-retirement.test.ts test/server/instance-stream-retirement.test.ts test/server/tui-control-retirement.test.ts test/session/checkpoint-drain.test.ts test/actor/spawn-notification.test.ts test/actor/stall-watchdog.test.ts test/inbox/wake-matrix.test.ts test/tool/session-tool.test.ts test/workflow/runtime-worktree.test.ts test/workflow/runtime-retirement.test.ts test/file/watcher-retirement.test.ts test/pty/retirement.test.ts --timeout 60000
```

- [ ] **Step 2: Migrate every inventoried producer**

`runNestedGenerationProducer` registers a nested receipt before invoking
`run`; it starts immediately, returns only that running callback's Promise, and
is safe for the current owner to await. It never waits for a handoff.
Task 2's `registerTransferredGenerationProducer` remains the non-waitable
outliving path: its private `run` is the `onArmed` continuation admitted by
successful release of the explicit short target-local handoff, and no result
Promise is exposed to that handoff. Task 5 applies it to every remaining
producer-inventory row and adds the nested helper; its channel/body wrappers
also require that exact handoff lease and never infer the ambient long-lived
owner. No second transfer implementation is created. Tests cover handoff
release, pending close, target mismatch, outer-owner-held progress, and root
callback execution for both paths. All
supported work receives the generation abort signal and every receipt settles
on success, failure, or cancellation. Workflow's existing naked timers and
`Effect.runFork` DB/Bus paths become scoped producer records. Long-lived bound
callbacks capture their channel/producer execution and fail before callback body
after owner settlement. No raw parent token authorizes child/worktree work.

The retirement order after Task 4 is fixed:

```text
boot settled
-> retire seal/drain/fresh snapshot and exact Runner settlement
-> Event SSE / PTY / watcher / TUI-control / streaming-body close and join
-> producer/checkpoint seal, abort, and join
-> finite active lease drain
-> general seal/drain/fresh snapshot
```

- [ ] **Step 3: Verify, audit, and commit**

```bash
cd packages/opencode
bun test test/project/instance-producer-retirement.test.ts test/server/instance-stream-retirement.test.ts test/server/tui-control-retirement.test.ts test/session/checkpoint-drain.test.ts test/actor/spawn-notification.test.ts test/actor/stall-watchdog.test.ts test/inbox/wake-matrix.test.ts test/tool/session-tool.test.ts test/workflow/runtime-worktree.test.ts test/workflow/runtime-retirement.test.ts test/file/watcher-retirement.test.ts test/pty/retirement.test.ts --timeout 60000
bun typecheck
cd "$(git rev-parse --show-toplevel)"
git add -- packages/opencode/src/project/instance.ts packages/opencode/src/config/config.ts packages/opencode/src/history/backfill.ts packages/opencode/src/session/prune.ts packages/opencode/src/session/checkpoint.ts packages/opencode/src/actor/spawn.ts packages/opencode/src/inbox/inbox.ts packages/opencode/src/tool/session.ts packages/opencode/src/workflow/runtime.ts packages/opencode/src/pty/index.ts packages/opencode/src/file/watcher.ts packages/opencode/src/server/proxy.ts packages/opencode/src/server/workspace.ts packages/opencode/src/server/routes/instance/middleware.ts packages/opencode/src/server/routes/instance/event.ts packages/opencode/src/server/routes/instance/pty.ts packages/opencode/src/server/routes/instance/session.ts packages/opencode/src/server/routes/instance/tui.ts packages/opencode/test/project/instance-producer-retirement.test.ts packages/opencode/test/server/instance-stream-retirement.test.ts packages/opencode/test/server/tui-control-retirement.test.ts packages/opencode/test/session/checkpoint-drain.test.ts packages/opencode/test/actor/spawn-notification.test.ts packages/opencode/test/actor/stall-watchdog.test.ts packages/opencode/test/inbox/wake-matrix.test.ts packages/opencode/test/tool/session-tool.test.ts packages/opencode/test/workflow/runtime-worktree.test.ts packages/opencode/test/workflow/runtime-retirement.test.ts packages/opencode/test/file/watcher-retirement.test.ts packages/opencode/test/pty/retirement.test.ts docs/compose/spec/instance-generation-producer-inventory.md
git diff --cached --check
# If the frozen inventory names another path, add that exact path explicitly;
# never stage an entire src/test directory. Inspect `git diff --cached --name-status`.
git commit -m "fix(instance): join generation channels and producers"
```

---

### Task 6: Expose generation lifecycle through HTTP, events, TUI, and SDK

**Files**

- Modify: instance access, middleware, index, and relevant schemas.
- Create: `packages/opencode/src/server/routes/instance/openapi-lifecycle.ts`
- Create: `packages/opencode/src/server/incarnation.ts`
- Modify: `packages/opencode/src/server/server.ts`
- Modify: `packages/opencode/src/server/workspace.ts`
- Modify: `packages/opencode/src/server/proxy.ts`
- Modify: `packages/opencode/src/server/middleware.ts` (CORS exposed headers).
- Modify: `packages/opencode/src/server/routes/global.ts` (event schema and
  connected/heartbeat incarnation).
- Modify: `packages/opencode/src/server/routes/control/workspace.ts` and remote
  relay/proxy code that forwards authoritative target headers/events.
- Modify: `packages/opencode/src/bus/global.ts` and instance Bus emission.
- Modify: direct event publishers in `packages/opencode/src/sync/index.ts`,
  `packages/opencode/src/worktree/index.ts`,
  `packages/opencode/src/project/project.ts`,
  `packages/opencode/src/config/config.ts`, and
  `packages/opencode/src/control-plane/workspace.ts`; classify every
  process-global publisher explicitly.
- Create: `packages/opencode/src/cli/cmd/tui/context/instance-generation.tsx`
- Modify: TUI SDK, project, sync, and event contexts.
- Modify: workspace-create dialog and session-list callers that rely on
  `project.workspace.sync()` mutating internally.
- Create/modify: HTTP, workspace, OpenAPI, event, and TUI tests, including
  existing `bootstrap-race.test.tsx` and `use-event.test.tsx` fixtures.
- Verify: `packages/opencode/src/cli/cmd/generate.ts` and
  `packages/sdk/js/script/build.ts` generation behavior.
- Regenerate: `packages/sdk/openapi.json` and `packages/sdk/js/src/v2/gen/`.

- [ ] **Step 1: Add and run RED server/event tests**

Hold retirement and assert:

- dispose returns `200 true` accepted;
- same target returns typed 503 `instance_closing`, `Retry-After: 1`, canonical
  incarnation/directory/generation headers plus generation body; another
  directory and global route work;
- successful instance responses and typed non-retry 500 failures carry the same
  incarnation/directory/generation triple; pre-admission auth/path-policy
  failures carry no instance triple;
- URI encoding/decoding works for paths with spaces and non-ASCII characters;
- Absent maintenance returns `instance_maintenance` with directory but no
  instance lifecycle triple;
- local workspace routing reports the inner workspace target, never the outer
  base generation; a remote response with a complete triple is preserved, a
  headerless response is marked authoritative-none, and a partial triple is a
  protocol error rather than being relabeled;
- every instance-originated GlobalEvent envelope carries source incarnation,
  directory, and generation; process-global events retain
  `directory: "global"`, carry incarnation, and omit generation;
- disposed occurs once after CAS, before queued successor produces events.

Update legacy TUI fixtures too: `bootstrap-race.test.tsx` must return complete
lifecycle triples, and `use-event.test.tsx` must construct the new discriminated
envelope with source incarnation/provenance.

OpenAPI tests inspect `/path`, a session route, and `/tui/control/next`; every
instance operation has common 500/503/header metadata, while a global route does
not.

```bash
cd packages/opencode
bun test test/server/instance-closing.test.ts test/server/project-init-git.test.ts test/server/workspace-instance-generation.test.ts test/server/instance-openapi-lifecycle.test.ts test/server/global-event-generation.test.ts test/bus/bus.test.ts --timeout 60000
```

- [ ] **Step 2: Implement canonical response/event generation**

All post-admission instance responses carry the complete lifecycle triple or
none:

```text
X-MiMo-Server-Incarnation: <process-random ID stable for this server lifetime>
X-MiMo-Instance-Directory: <URI-encoded canonical actual target>
X-MiMo-Instance-Generation: <g>
```

Store response provenance as `unset | authoritative-instance |
authoritative-none`. The innermost local WorkspaceRouter admission sets the
triple; outer middleware fills only `unset`. A remote proxy validates and
forwards a full upstream triple, marks a headerless upstream response
authoritative-none, and rejects partial triples; the outer layer never fills
either authoritative state. Pre-admission policy/auth/path errors carry no
instance triple. CORS exposes all three headers and `Retry-After`; tests include
spaces and non-ASCII paths. GlobalEvent retains incarnation and the full
envelope through TUI `useEvent`, and remote relay preserves source incarnation
and generation while rebinding only workspace identity.

`Server.openapi()` generates provenance specs separately from both
`InstanceRoutes` and middleware-covered `WorkspaceRoutes`, generates the full spec, then
`openapi-lifecycle.ts` post-processes only those exact `(path, method)` pairs.
This is the single injection point; it never relies on an operation-name prefix
and never touches global/control-only operations. Existing 500/503 definitions
are merged (using the schema composition selected by the current generator),
not overwritten.

Migrate the global dispose route off the legacy `Instance.disposeAll()` join.
It calls `requestDisposeAll()`, returns the existing `200 true` payload as
accepted, and documents terminal completion through the global disposed event;
it must not hold an HTTP callback waiting on the private receipt. Config's
accepted/event migration from Task 2 remains the only invalidation path.

- [ ] **Step 3: Add and run RED TUI freshness tests**

All SDK calls retain raw `Response` and decode `{error, response}` before
mutation; do not use `throwOnError`, which can discard `Retry-After`. A blocking
bootstrap cohort collects responses without writing stores, groups them by
canonical directory, requires exactly one incarnation/generation pair per
group plus one local epoch, and then commits atomically. Different outer/inner
directories in a
workspace cohort are valid; mixed g/g+1 for one directory is not. Test that
case, an inner-workspace target, and dialog/session-list refresh callers. An
instance operation missing any lifecycle-triple header invalidates the cohort;
only an explicitly classified process-global operation may omit
directory/generation and remain outside generation grouping.
Apply the same checked-response coordinator to `session.refresh` and
`session.sync`; neither may bypass clocks by mutating stores directly.
`session.sync` is a real cohort: after all seven responses resolve, revalidate
selection epoch plus every lifecycle triple immediately before mutation,
synchronously advance all affected highest-observed clocks, then commit the
entire store batch with no await. A missing header, a g response collected
before a later g+1 response, or any mixed incarnation discards the whole batch.
Replace the bare `fullSyncedSessions: Set<sessionID>` with a cache bound to
selection epoch, source slot, incarnation, canonical directory, committed
generation, and session ID. A disposed event, committed-generation advance, or
incarnation change invalidates affected entries before the fast-return check.
Test a cached g session after g+1 and after server incarnation replacement.

Use one coordinator per TUI selection `{sdkDirectory, workspaceID}`. Within its
epoch maintain source slots for the outer SDK transport and each workspace
relay, with clocks per `(sourceSlot, serverIncarnation, canonicalDirectory)`. A
new incarnation for an existing source slot aborts the previous epoch and
requests, resets that slot's clocks, and requires a fresh cohort; initial
discovery of another slot and reconnect with the same incarnation do not reset.
Gate a g
response/event behind a g+1 response/event while the disposed(g) event is also
delayed. Also use two server incarnations that both start at generation 1 and
delay the old response/event. Prove the coordinator advances every cohort clock
before mutation and drops every later-arriving older source. Directory
switch/shutdown cancels one coalesced retry coordinator; retirement failure
remains visible and non-retry.

Each clock also stores `committedGeneration`. Ordinary instance events may
mutate only at that generation. A higher ordinary event records observation and
coalesces bootstrap but cannot touch the old store. Handle disposed before the
ordinary high-water drop: advance retiredThrough and invalidate/bootstrap when
the committed store is at or below g. The g+1-before-disposed(g) test must prove
no mixed store and one cohort commit.

```bash
cd packages/opencode
bun test test/cli/tui/instance-closing.test.tsx test/cli/tui/instance-generation-order.test.tsx test/cli/tui/directory-switch.test.tsx test/cli/tui/bootstrap-directory-denied.test.tsx test/cli/tui/workspace-sync-generation.test.tsx test/cli/tui/bootstrap-race.test.tsx test/cli/tui/use-event.test.tsx --timeout 60000
```

- [ ] **Step 4: Regenerate tracked OpenAPI and JS SDK twice**

The JS build script does not update tracked `packages/sdk/openapi.json`; run both
generators from the correct directories:

```bash
cd packages/opencode
bun dev generate > ../sdk/openapi.json
cd ../..
./packages/sdk/js/script/build.ts
git add -- packages/sdk/openapi.json packages/sdk/js/src/v2/gen
cd packages/opencode
bun dev generate > ../sdk/openapi.json
cd ../..
./packages/sdk/js/script/build.ts
git diff --exit-code -- packages/sdk/openapi.json packages/sdk/js/src/v2/gen
```

- [ ] **Step 5: Verify and commit**

Run both RED matrices again, then:

```bash
cd packages/opencode
bun typecheck
cd "$(git rev-parse --show-toplevel)"
git add -- packages/opencode/src/server/routes/instance/access.ts packages/opencode/src/server/routes/instance/middleware.ts packages/opencode/src/server/routes/instance/index.ts packages/opencode/src/server/routes/instance/openapi-lifecycle.ts packages/opencode/src/server/incarnation.ts packages/opencode/src/server/server.ts packages/opencode/src/server/workspace.ts packages/opencode/src/server/proxy.ts packages/opencode/src/server/middleware.ts packages/opencode/src/server/routes/global.ts packages/opencode/src/server/routes/control/workspace.ts packages/opencode/src/control-plane/workspace.ts packages/opencode/src/project/instance.ts packages/opencode/src/project/project.ts packages/opencode/src/config/config.ts packages/opencode/src/sync/index.ts packages/opencode/src/worktree/index.ts packages/opencode/src/bus/global.ts packages/opencode/src/bus/index.ts packages/opencode/src/cli/cmd/tui/context/instance-generation.tsx packages/opencode/src/cli/cmd/tui/context/sdk.tsx packages/opencode/src/cli/cmd/tui/context/project.tsx packages/opencode/src/cli/cmd/tui/context/sync.tsx packages/opencode/src/cli/cmd/tui/context/event.ts packages/opencode/src/cli/cmd/tui/component/dialog-workspace-create.tsx packages/opencode/src/cli/cmd/tui/component/dialog-session-list.tsx packages/opencode/test/server/instance-closing.test.ts packages/opencode/test/server/project-init-git.test.ts packages/opencode/test/server/workspace-instance-generation.test.ts packages/opencode/test/server/instance-openapi-lifecycle.test.ts packages/opencode/test/server/global-event-generation.test.ts packages/opencode/test/bus/bus.test.ts packages/opencode/test/cli/tui/instance-closing.test.tsx packages/opencode/test/cli/tui/instance-generation-order.test.tsx packages/opencode/test/cli/tui/workspace-sync-generation.test.tsx packages/opencode/test/cli/tui/directory-switch.test.tsx packages/opencode/test/cli/tui/bootstrap-directory-denied.test.tsx packages/opencode/test/cli/tui/bootstrap-race.test.tsx packages/opencode/test/cli/tui/use-event.test.tsx packages/sdk/openapi.json packages/sdk/js/src/v2/gen docs/compose/spec/instance-generation-producer-inventory.md
git diff --cached --check
# Inspect staged paths and remove unrelated server/TUI tests before commit.
git commit -m "feat(instance): expose generation retirement over HTTP"
```

---

### Task 7: Keep the maintenance fence through worktree deletion

**Files**

- Modify: `packages/opencode/src/worktree/index.ts`
- Modify: `packages/opencode/src/cli/bootstrap.ts`
- Modify: `packages/opencode/src/server/routes/instance/project.ts`
- Modify: `packages/opencode/src/server/routes/instance/experimental.ts`
- Modify: `packages/opencode/src/control-plane/workspace.ts`
- Modify: `packages/opencode/src/control-plane/types.ts`
- Modify: `packages/opencode/src/control-plane/adaptors/worktree.ts` and every
  other `WorkspaceAdaptor.remove` implementation forced by the type change.
- Modify: `packages/opencode/src/plugin/index.ts` to explicitly adapt the stable
  public plugin remove contract to the internal finalize contract.
- Inspect/verify unchanged public API and example:
  `packages/plugin/src/index.ts` and `packages/plugin/src/example-workspace.ts`.
- Modify: `packages/opencode/src/tool/session.ts`
- Modify: `packages/opencode/src/workflow/runtime.ts`
- Modify/create: worktree, bootstrap, project reload, tool-session, and workflow
  worktree tests; update inventory.

- [ ] **Step 1: Add and run RED maintenance races**

Cover both Open-origin Closing maintenance and Absent-origin reservation. From a
process that never provided the existing worktree, race remove against provide;
only reservation or Open may win. Race a new reservation against the synchronous
`disposeAll` gate/scan; global drain cannot return while a reservation exists.

Hold retirement and the post-late maintenance callback separately. Git/path
deletion and disposed event must wait. Callback failure keeps the owner
fail-closed. A queued reload conflicts without changing successor input. A
caller timeout preserves owner and files. Calling remove from any same-target
owner rejects before side effects. Exercise the real control-plane
`Workspace.remove`: no Session/Workspace row is deleted before reservation;
an injected pre-delete/adaptor failure propagates and preserves rows plus path;
an injected finalize failure propagates, keeps the fence and any remaining rows,
and reports that physical rollback is unavailable; success deletes each exactly
once while the reservation remains held.
Register a public plugin workspace adaptor through the real plugin bridge. Its
successful `remove` is awaited before internal finalize, a rejection prevents
finalize, and no `as WorkspaceAdaptor` cast can bypass the sequencing contract.

```bash
cd packages/opencode
bun test test/project/worktree.test.ts test/project/instance-dispose.test.ts test/server/project-init-git.test.ts test/cli/bootstrap-retirement.test.ts test/control-plane/workspace-remove.test.ts test/plugin/workspace-adaptor-remove.test.ts test/tool/session-tool.test.ts test/workflow/runtime-worktree.test.ts --timeout 60000
```

- [ ] **Step 2: Implement two-phase removal**

Under the caller/parent lease, capture parent repository/project identity and
canonical child path without opening an Absent child. Then call settled
`maintainDirectory(child)` from a context with no child owner. Inside the
reservation callback re-read the Git worktree list and perform fsmonitor, Git
worktree removal, recursive path deletion, branch deletion, and sandbox DB
removal. The callback uses only captured process-owned Git/filesystem/project
services and never reacquires child InstanceState after the general seal. Do not
call `disposeDirectory` and delete in a separate window; do not leave
`project.removeSandbox` outside the reservation.

`maintainDirectory` is module-private and never returns a child lifecycle
receipt to plugin/route/generation code. The high-level remove operation owns
its process/parent continuation; terminal child settlement is consumed inside
the combinator before that continuation receives success/failure.

`Workspace.remove` first reads the row, resolves the adaptor target, and
captures its finalize callback without mutating sync/session/workspace state.
For a local worktree, the adaptor passes that callback into the same
`Worktree.remove` maintenance reservation: physical Git/filesystem removal,
`stopSync`, Session deletion, and WorkspaceTable deletion all finish before the
reservation releases. Change the adaptor contract so only successful removal
invokes finalize; remote/process-owned adaptors follow the same success-before-
DB-delete rule even though they do not use a local directory reservation.
Keep the external `packages/plugin` API as `remove(info): Promise<void>`.
Replace the current cast in `src/plugin/index.ts` with an explicit internal
adapter that awaits the external removal and invokes the internally supplied
finalize only on fulfillment. This preserves third-party compatibility while
making the internal type enforce sequencing.
Remove the catch-and-continue path: adaptor or finalize failure propagates and
retains the fence and remaining rows. Do not nest a second
`maintainDirectory` inside the Worktree adaptor.

Headless bootstrap awaits `Instance.provide` first, then waits settled retirement
in an outer `finally`. `project.initGit` records an accepted reload successor and
returns without awaiting old-generation retirement inside its lease. Migrate
tool/workflow callers to parent/headless ownership rather than raw context
substitution. This task removes the frozen `Instance.disposeDirectory()` calls
from `Worktree.remove` and workflow isolated cleanup: Worktree uses the
maintenance combinator, while the inventoried workflow process-owned cleanup
may use only the exact private `disposeDirectorySettled` allowlist after leaving
all target owners. No destructive path imports that join.

- [ ] **Step 3: Verify and commit**

```bash
cd packages/opencode
bun test test/project/worktree.test.ts test/project/instance-dispose.test.ts test/server/project-init-git.test.ts test/cli/bootstrap-retirement.test.ts test/control-plane/workspace-remove.test.ts test/plugin/workspace-adaptor-remove.test.ts test/tool/session-tool.test.ts test/workflow/runtime-worktree.test.ts --timeout 60000
bun typecheck
cd "$(git rev-parse --show-toplevel)"
git add -- packages/opencode/src/worktree/index.ts packages/opencode/src/cli/bootstrap.ts packages/opencode/src/server/routes/instance/project.ts packages/opencode/src/server/routes/instance/experimental.ts packages/opencode/src/control-plane/workspace.ts packages/opencode/src/control-plane/types.ts packages/opencode/src/control-plane/adaptors/worktree.ts packages/opencode/src/control-plane/dev/debug-workspace-plugin.ts packages/opencode/src/plugin/index.ts packages/opencode/src/tool/session.ts packages/opencode/src/workflow/runtime.ts packages/opencode/test/project/worktree.test.ts packages/opencode/test/project/instance-dispose.test.ts packages/opencode/test/server/project-init-git.test.ts packages/opencode/test/cli/bootstrap-retirement.test.ts packages/opencode/test/control-plane/workspace-remove.test.ts packages/opencode/test/plugin/workspace-adaptor-remove.test.ts packages/opencode/test/tool/session-tool.test.ts packages/opencode/test/workflow/runtime-worktree.test.ts docs/compose/spec/instance-generation-producer-inventory.md
git diff --cached --check
git commit -m "fix(instance): fence worktree maintenance through deletion"
```

---

### Task 8: Use one settled shutdown coordinator for every server entrypoint

**Files**

- Modify: `packages/opencode/src/project/instance.ts` (delete the two legacy
  settled facades).
- Create: `packages/opencode/test/fixture/instance-lifecycle.ts` as the sole
  test-only private-join adapter.
- Modify: every test file found during the inventory refresh as still calling
  `Instance.disposeAll()` or `Instance.disposeDirectory()`; no awaited opaque
  request ID may remain.
- Create: `packages/opencode/src/server/shutdown.ts`
- Modify: `packages/opencode/src/server/server.ts`
- Modify: `packages/opencode/src/server/adapter.ts`
- Modify: `packages/opencode/src/server/adapter.bun.ts`
- Modify: `packages/opencode/src/server/adapter.node.ts`
- Modify: `packages/opencode/src/server/routes/global.ts`
- Modify: TUI worker/thread.
- Modify: `packages/opencode/src/cli/cmd/serve.ts`
- Modify: `packages/opencode/src/cli/cmd/acp.ts`
- Modify: compiled `packages/opencode/src/cli/cmd/web.ts` listener lifecycle
  without expanding Web product behavior.
- Create/modify: real stream, TUI thread, and CLI entrypoint shutdown tests.
- Create: `docs/compose/spec/fd-004-rejected-surfaces.json`
- Create: `packages/opencode/script/check-fd004-boundary.ts`
- Create/modify: focused FD-004 checker tests.
- Update: inventory and FD-004 review evidence.

**Listener contract**

```ts
export interface Listener {
  readonly hostname: string
  readonly port: number
  readonly url: URL
  stopAccepting(): void
  closeLongLivedStreams(): Promise<void>
  awaitDrained(): Promise<void>
  forceClose(): Promise<void>
}
```

`forceClose` is the only raw Bun `stop(true)` owner and runs once. The obsolete
memoized `stop(false)` path is removed.

- [ ] **Step 1: Add and run RED real-lifecycle tests**

Use real listeners, not only call-order mocks:

- block a global SSE `writeSSE`, then prove active abort closes it;
- hold an instance runner-backed request whose lease releases only after runner
  retirement; shutdown must start instance retirement before request drain;
- include instance Event SSE, PTY, TUI long-poll, and queued reload;
- send SIGTERM to serve and compiled web, EOF to ACP, and TUI RPC shutdown; each
  reaches the same settled coordinator and force-closes once;
- call TUI `rpc.server` a second time while the first listener has an active
  connection; it rejects before side effects, leaves the original listener
  intact, and never invokes raw `stop(true)`;
- ACP calls non-waiting shutdown begin while inside bootstrap ownership, leaves
  that owner, then waits finish outside it;
- inject a rejecting instance disposer through TUI, serve, ACP, and web; each
  reports unclean failure only after raw force-close and log finalization run
  exactly once;
- `disposeAll` remains reusable after shutdown tests.
- the legacy `Instance.disposeAll`/`disposeDirectory` exports are absent;
  production callers cannot import a private join, every migrated test cleanup
  awaits the single test fixture, and focused call-site review confirms no code
  silently awaits the opaque result of `requestDisposeAll()`.

```bash
cd packages/opencode
bun test test/server/shutdown-streams.test.ts test/cli/tui/thread.test.ts test/cli/server-shutdown-entrypoints.test.ts test/project/instance-dispose.test.ts --timeout 60000
```

- [ ] **Step 2: Implement shared ordering**

```text
synchronously install process intake gate
-> actively close/join global long-lived streams and long-polls
-> collect private disposeAllSettled() and remaining global-request drain failures
-> finally raw forceClose once and close logs
-> emit clean shutdown-complete or report the aggregated unclean failure
```

Do not wait instance requests before retirement. TUI waits an explicit
`shutdown-complete`; emergency second-signal termination is logged as unclean.
Retirement/drain rejection never skips the transport/log `finally`; the failed
generation remains fail-closed in memory, but the listener cannot remain
half-shut. Report/rethrow only after finalization.
Serve and compiled web install a reachable signal lifetime rather than an
unreachable stop after `new Promise(() => {})`. ACP closes on protocol/stdin
completion or error. Web coverage is lifecycle-only and does not add a new
product feature.
TUI `rpc.server` is single-shot per worker lifetime. A second call rejects
before stop/rebind/mutation; non-terminal replacement never uses raw
`stop(true)` and terminal shutdown never reopens its intake gate.

Move TUI worker shutdown to the shared coordinator, then delete the deprecated
`Instance.disposeAll()` and `Instance.disposeDirectory()` wrappers. Migrate all
remaining tests to `test/fixture/instance-lifecycle.ts`, which is the only
non-production importer of the private joins and is documented as such in the
final review evidence. Before final review, inventory and source searches must
find zero legacy declarations or callers. Focused negative tests exercise the
frozen legacy forms; do not rely on TypeScript alone, because `await` on an
opaque ID is otherwise legal JavaScript.

- [ ] **Step 3: Run the full FD-004 sync check**

Because server/thread/worker surfaces change, freeze the exact rejected surface
set in `fd-004-rejected-surfaces.json`: absent source paths
`src/cli/cmd/llm-server.ts`, `src/config/llm-server.ts`,
`src/llm-server/`, and `src/server/routes/instance/capability.ts`; forbidden
server path prefix `/v1`; rejected schema/property/enum names
`LLMServerConfig`, `llmServer`,
`voice_design`, and `voice_clone`; the upstream token-registry, implicit-listener,
whole-server password, and address/token persistence symbols
`LLMServerTokens`, `LLMServerCapability`, `CapabilityRoutes`,
`CAPABILITY_PREFIX`, `ConfigLLMServer`, `generatedServerPassword`,
`generateServerPassword`, `clearGeneratedServerPassword`,
`MIMOCODE_SERVER_PASSWORD_SUPPLIED`, `addressFile`, `publish`, and `unpublish`;
and the required `script/format.ts` generator call. The manifest scopes generic
names such as `publish` to the rejected LLM-server paths/symbol graph rather
than banning them repository-wide.

`check-fd004-boundary.ts --check` parses the source route mounts, config schemas,
tracked OpenAPI, and generated JS types against that manifest; it also asserts
the absent paths and formatter call. It emits a review table naming every
checked surface and the exact upstream review range. Focused tests inject one
forbidden path/schema/persistence symbol at a time and prove the checker fails.
This replaces an ambiguous broad grep that would confuse legitimate PTY tokens
or provider voice configuration with the rejected server feature.

```bash
cd packages/opencode
bun test test/script/check-fd004-boundary.test.ts --timeout 30000
bun script/check-fd004-boundary.ts --check
```

Add a separate active fork-deviation entry for generation retirement before
publication. Its required sync surfaces include the directory owner,
InstanceState/registry, Runner/run-state, producer/channel routes, GlobalEvent
envelope, TUI generation coordinator, worktree maintenance, shared shutdown,
OpenAPI/SDK artifacts, and deterministic lifecycle tests. Record the exact
upstream review range at implementation time; this prevents a later clean
upstream merge from silently removing one part of the protocol.

- [ ] **Step 4: Verify and commit**

```bash
cd packages/opencode
bun test test/server/shutdown-streams.test.ts test/cli/tui/thread.test.ts test/cli/server-shutdown-entrypoints.test.ts test/project/instance-dispose.test.ts --timeout 60000
bun script/check-fd004-boundary.ts --check
bun typecheck
cd "$(git rev-parse --show-toplevel)"
git add -- packages/opencode/src/project/instance.ts packages/opencode/src/server/shutdown.ts packages/opencode/src/server/server.ts packages/opencode/src/server/adapter.ts packages/opencode/src/server/adapter.bun.ts packages/opencode/src/server/adapter.node.ts packages/opencode/src/server/routes/global.ts packages/opencode/src/cli/cmd/tui/worker.ts packages/opencode/src/cli/cmd/tui/thread.ts packages/opencode/src/cli/cmd/serve.ts packages/opencode/src/cli/cmd/acp.ts packages/opencode/src/cli/cmd/web.ts packages/opencode/script/check-fd004-boundary.ts packages/opencode/test/fixture/instance-lifecycle.ts packages/opencode/test/script/check-fd004-boundary.test.ts packages/opencode/test/server/shutdown-streams.test.ts packages/opencode/test/cli/tui/thread.test.ts packages/opencode/test/cli/server-shutdown-entrypoints.test.ts packages/opencode/test/project/instance-dispose.test.ts docs/compose/spec/fd-004-rejected-surfaces.json docs/compose/spec/instance-generation-producer-inventory.md docs/upstream-deviations.md
# Inspect the remaining test-only diff and require every path to be one of the
# frozen Task 0 legacy cleanup callers before staging exactly that path list.
git diff --name-status -- packages/opencode/test
retirement_test_pathspec="$(mktemp)"
git diff --name-only -z -- packages/opencode/test > "$retirement_test_pathspec"
git add --pathspec-from-file="$retirement_test_pathspec" --pathspec-file-nul
rm -f -- "$retirement_test_pathspec"
git diff --cached --check
git commit -m "fix(server): drain instances before transport shutdown"
```

---

### Task 9: Remove workflow drain workarounds only after lifecycle proof

**Files**

- Modify: `packages/opencode/test/workflow/runtime.test.ts`
- Test: run-state disposal and workflow producer retirement.

- [ ] **Step 1: Establish the workaround baseline**

```bash
cd packages/opencode
bun test test/workflow/runtime.test.ts --test-name-pattern "WorkflowRuntime cancel cascade" --timeout 60000
```

Expected GREEN with both explicit parent `SessionRunState.cancel` drains still
present.

- [ ] **Step 2: Remove only the two drains and stale comments**

Do not change production workflow cancellation in this task.

- [ ] **Step 3: Prove the fix three times and commit**

```bash
cd packages/opencode
for run in 1 2 3; do
  bun test test/workflow/runtime.test.ts --test-name-pattern "WorkflowRuntime cancel cascade" --timeout 60000 || exit 1
done
bun test test/session/run-state-dispose.test.ts test/workflow/runtime-retirement.test.ts --timeout 60000
bun typecheck
cd "$(git rev-parse --show-toplevel)"
git add -- packages/opencode/test/workflow/runtime.test.ts
git diff --cached --check
git commit -m "test(workflow): remove instance-retirement drain workaround"
```

---

### Task 10: Full verification, independent review, fork PR, and propagation

- [ ] **Step 1: Run the complete focused lifecycle matrix**

```bash
cd packages/opencode
bun test --timeout 60000 \
  test/effect/instance-registry.test.ts test/effect/instance-state-registry.test.ts \
  test/effect/instance-state.test.ts test/effect/runner.test.ts test/effect/run-service.test.ts \
  test/tool/read-state.test.ts test/tool/session-cwd.test.ts \
  test/effect/app-runtime-logger.test.ts test/project/instance-dispose.test.ts \
  test/project/instance-bootstrap-retirement.test.ts test/session/run-state-dispose.test.ts \
  test/session/run-state-tuple-key.test.ts test/session/checkpoint-drain.test.ts \
  test/project/instance-producer-retirement.test.ts test/server/instance-stream-retirement.test.ts \
  test/server/tui-control-retirement.test.ts test/file/watcher-retirement.test.ts \
  test/pty/retirement.test.ts test/actor/spawn-notification.test.ts \
  test/actor/stall-watchdog.test.ts test/inbox/wake-matrix.test.ts \
  test/tool/session-tool.test.ts test/workflow/runtime-worktree.test.ts \
  test/workflow/runtime-retirement.test.ts test/workflow/runtime.test.ts \
  test/server/httpapi-instance-admission.test.ts \
  test/server/instance-closing.test.ts test/server/project-init-git.test.ts \
  test/server/workspace-instance-generation.test.ts test/server/instance-openapi-lifecycle.test.ts \
  test/server/global-event-generation.test.ts test/control-plane/workspace-remove.test.ts \
  test/plugin/workspace-adaptor-remove.test.ts \
  test/cli/tui/instance-closing.test.tsx test/cli/tui/instance-generation-order.test.tsx \
  test/cli/tui/workspace-sync-generation.test.tsx test/cli/tui/directory-switch.test.tsx \
  test/cli/tui/bootstrap-directory-denied.test.tsx test/cli/tui/bootstrap-race.test.tsx \
  test/cli/tui/use-event.test.tsx test/project/worktree.test.ts \
  test/cli/bootstrap-retirement.test.ts test/server/shutdown-streams.test.ts \
  test/cli/tui/thread.test.ts test/cli/server-shutdown-entrypoints.test.ts \
  test/script/check-fd004-boundary.test.ts test/bus/bus.test.ts
bun script/check-fd004-boundary.ts --check
bun typecheck
```

- [ ] **Step 2: Run the real four-shard suite and repository checks**

```bash
cd packages/opencode
test ! -e .artifacts
retirement_artifacts="$(pwd)/.artifacts"
cleanup_retirement_artifacts() {
  rm -f -- "$retirement_artifacts/unit/junit.xml"
  rmdir -- "$retirement_artifacts/unit" "$retirement_artifacts" 2>/dev/null || true
}
trap cleanup_retirement_artifacts EXIT
for shard in 1/4 2/4 3/4 4/4; do
  bun run test:ci --shard "$shard" || exit 1
done
cleanup_retirement_artifacts
trap - EXIT
cd ../..
bun run lint
git diff --check
```

- [ ] **Step 3: Regenerate both SDK surfaces and prove idempotency**

```bash
cd packages/opencode
bun dev generate > ../sdk/openapi.json
cd ../..
./packages/sdk/js/script/build.ts
cd packages/opencode
bun dev generate > ../sdk/openapi.json
cd ../..
./packages/sdk/js/script/build.ts
git diff --exit-code -- packages/sdk/openapi.json packages/sdk/js/src/v2/gen
```

Repeat the complete FD-004 required-surface audit from
`docs/upstream-deviations.md`, including source mounts, config/env/token state,
listener lifecycle, docs/tests, tracked OpenAPI, and JS generated artifacts.
Run `cd packages/opencode && bun script/check-fd004-boundary.ts --check` and
include its exact review table in the PR evidence.

- [ ] **Step 4: Prove inventory, authority, and clean worktree**

```bash
cd packages/opencode
cd ../..
rg -n 'provideService\((InstanceRef|InstanceAdmissionRef)' packages/opencode/src
rg -n 'registerLifecycleOwner|transferLifecycleOwner|captureInstanceExecution|captureInstanceExecutionEffect|restoreInstanceExecutionSync|enterInstanceExecutionEffect|registerDirectoryRootLifecycleOwner' packages/opencode/src
git diff --check
test -z "$(git ls-files -u)"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test ! -e packages/sdk/js/openapi.json
```

The two searches may contain only the exact internal infrastructure allowlist
and explicit negative fixtures; focused negative tests and inventory review
cover exposed token, stack, or execution fields/casts. Step 2 refuses a pre-existing `.artifacts` path and removes
only its exact generated JUnit file plus now-empty parent directories; do not
use a broad `git clean`. The feature worktree contains no user `.mimocode` files, so
any other untracked result blocks publication. Re-run the Task 0 horizontal
search and require every row to name its implemented owner and deterministic
test.

- [ ] **Step 5: Independent read-only review**

The reviewer must inspect:

- process-lifetime generation allocation, boot publication/failure, and
  owner-ledger failure retention through Terminal;
- all-owner self-wait and stale g -> g+1 remint prevention;
- nested-vs-transferred ownership handoff and parent-release behavior;
- synchronous pending-entry rejection, armed callback-only Promises,
  `runSync` PromiseLike containment, and absence of public receipt/readiness
  thenables;
- retire/general seal -> drain -> fresh snapshot ordering;
- Runner Starting/Settling/runID/map cleanup races;
- channel/body transport acknowledgement, active abort, checkpoint watcher, and
  workflow timers;
- Absent/Open maintenance and worktree two-phase deletion;
- workspace canonical headers, committed/cohort/high-water response and event
  filtering, and generation-bound session-sync cache;
- OpenAPI operation injection and tracked SDK idempotency;
- TUI/serve/ACP/web real shutdown; and
- reviewed removal of the two legacy settled facades plus focused private-join
  import/call-site evidence; and
- full FD-004 and fork-specific actor/checkpoint/status invariants.

Resolve every Critical/Important finding before publication.

- [ ] **Step 6: Publish only to the fork and require exact-head CI**

Push the feature branch to `onlyfeng/MiMo-Code`, open a PR targeting fork
`main`, and verify through API that
`.base.repo.full_name === "onlyfeng/MiMo-Code"` and
`headRefOid === git rev-parse HEAD`. Require lint, typecheck, and all four test
shards for that exact head. Do not merge without explicit authorization.

- [ ] **Step 7: Propagate once after main merge**

After merge, update fork `main`, then merge `main -> dev/compat` once in an
isolated worktree. Do not create a second compat port. Re-run this entire task
on the merge result, including SDK, inventory, FD-004, clean gate, and exact-SHA
CI. Review explicitly preserves MaxMode, overflow, checkpoint, actor/status,
fork-prefix, and Node-runtime invariants.
