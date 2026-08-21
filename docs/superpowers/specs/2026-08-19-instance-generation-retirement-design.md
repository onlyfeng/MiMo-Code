# Instance Generation Retirement Design

## Goal

Make per-directory instance disposal terminate without finalizer deadlock while
preventing cleanup from an old instance generation from mutating, deleting, or
publishing terminal state after a replacement generation starts.

This design replaces the current timeout-shaped soft barrier with one explicit
lifecycle contract:

```text
Absent -> Open(g) -> Closing(g, retirement) -> Terminal(g) -> Absent or Open(g + 1)
Absent -> Maintaining(m, operation) -> Absent
```

`Closing(g)`, `Terminal(g)`, `Open(g + 1)`, and `Maintaining(m)` may never
overlap for the same canonical directory. `Terminal(g)` is a short,
non-admitting reservation held across disposed-listener invocation.
`Maintaining(m)` is an atomic process-local
reservation for a destructive operation against a directory that has no open
instance in this process; it exists because worktree removal must also work
after process restart or after an earlier settled disposal.

## Verified Baseline

The design is pinned to:

- `onlyfeng/MiMo-Code:main`:
  `eafe3dd69c04789350703668037493bc78ca254b`;
- `onlyfeng/MiMo-Code:dev/compat`:
  `aa86045cd468dd3e5cbcb1eda98bf491687ec1c1`;
- `XiaomiMiMo/MiMo-Code:main`:
  `67c9cf1e26288d03c65fb844be71f39581ffc1de`.

The affected lifecycle files are unchanged between the parked experiment's
base (`b9c1038580421aec8b18ef81250e897779015b30`) and current fork `main`, so the
reproduction and risk remain applicable after the upstream synchronization.

## Problem

`InstanceState` uses an Effect `ScopedCache` keyed only by directory. Its cache
entry finalizers run while the instance registry concurrently closes other
normal-phase services. `SessionRunState` finalization calls `Runner.cancel`,
which waits for `run.done`; the interrupted processor cleanup can need session,
bus, status, or persistence services that are already closing. Because Effect
scope close is uninterruptible, an external timeout cannot break that wait.

The current workaround in `Instance.disposeDirectory` is also not a safety
barrier. It bounds only the caller's wait to two seconds, then clears
`directoryDisposals` even though the underlying disposal continues. A new
instance for the same directory can start while the old cleanup still owns
directory-keyed state.

The parked `fix/session-run-state-dispose` experiment changes the run-state
scope, starts detached cancellation/close work, clears the runner map, and lets
`Instance.dispose()` return. That avoids the immediate deadlock but loses the
cleanup completion receipt. A stale processor `onInterrupt` can still update
messages/session state after the same directory has opened a replacement. It
therefore converts a visible deadlock into an unobservable cross-generation
write and must not be merged as production code.

## Selected Contract

### Per-directory state

The instance owner stores one process-lifetime slot per canonical directory.
Removing an instance never removes its slot or rewinds its counter:

```ts
type InstanceTarget = {
  directory: string
  generation: number
}

type MaintenanceTarget = {
  directory: string
  maintenanceID: string
}

type OwnerTarget =
  | { kind: "generation"; target: InstanceTarget }
  | { kind: "maintenance"; target: MaintenanceTarget }

type BootInput = {
  directory: string
  init?: () => Promise<unknown>
  worktree?: string
  project?: Project.Info
}

type BootReceipt = {
  context: Promise<InstanceContext>
  settled: Promise<{ ok: true } | { ok: false; error: unknown }>
}

type OwnerKind =
  | "boot"
  | "lease"
  | "body"
  | "runner"
  | "producer"
  | "channel"
  | "state_scope"
  | "retirement"
  | "disposer"
  | "maintenance"

type OwnerReceipt = {
  id: string
  target: OwnerTarget
  kind: OwnerKind
  status: "live" | "settled"
  abort?: (reason: unknown) => void
  settled: Promise<{ ok: true } | { ok: false; error: unknown }>
}

type DirectoryPhase =
  | { state: "absent" }
  | OpenEntry
  | ClosingEntry
  | TerminalEntry
  | MaintainingEntry

type DirectorySlot = {
  lastGeneration: number
  phase: DirectoryPhase
}

type OwnerLedger = {
  sealedKinds: Set<OwnerKind>
  records: Map<string, OwnerReceipt>
}

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

type OpenEntry = {
  state: "open"
  target: InstanceTarget
  boot: BootReceipt
  owners: OwnerLedger
}

type ClosingEntry = {
  state: "closing"
  target: InstanceTarget
  boot: BootReceipt
  owners: OwnerLedger
  retirement: Promise<void>
  intent:
    | { kind: "dispose" }
    | { kind: "reload"; successor: BootInput }
    | { kind: "shutdown" }
    | { kind: "boot_failure"; error: unknown }
    | { kind: "maintenance"; id: string; run: () => Promise<void> }
  failure?: unknown
}

type TerminalEntry = {
  state: "terminal"
  target: InstanceTarget
  owners: OwnerLedger
  retirement: Promise<void>
  outcome:
    | { kind: "absent" }
    | { kind: "successor"; input: BootInput }
    | { kind: "shutdown" }
}

type MaintainingEntry = {
  state: "maintaining"
  target: MaintenanceTarget
  owner: OwnerReceipt
  retirement: Promise<void>
  operation: () => Promise<void>
  failure?: unknown
}
```

`InstanceContext` carries the same monotonic `generation`. `DirectorySlot`
survives `Absent`, maintenance, and every terminal transition for the lifetime
of one server incarnation. Opening from Absent or publishing a queued successor
increments `lastGeneration` under the slot lock and rejects unsafe-integer
overflow; maintenance does not increment it. No generation is reused within an
incarnation. A process restart may begin again only because it also generates a
new server incarnation. Every disposer, event, cache lookup, bound callback,
and compare-and-swap uses `(directory, generation)` rather than a bare directory
string.

Generation identity and admission authority travel together across both async
context systems. `InstanceRef` continues to carry only `InstanceContext`; a new
`InstanceAdmissionRef` carries an immutable `LifecycleOwnerStack`, empty only
for genuinely headless execution. For normal instance work, the innermost
generation token must match the paired `InstanceRef`, while every still-live
ancestor owner remains in the stack. An Absent-maintenance callback carries a
stack ending in its maintenance owner and no fabricated instance context. The
ALS side likewise stores instance context and the full owner stack in separate
local contexts. `Instance.bind`, the runtime attachment helper, and
`EffectBridge` capture and restore both values together behind opaque
`InstanceExecution`. The internal `restoreInstanceExecutionSync` helper
validates every captured token before invoking user code; its type signature
rejects statically visible PromiseLike callbacks, focused tests cover untyped
thenables, and a runtime thenable is adopted into the drain before misuse is
reported. The internal Effect entry helper registers its
complete lifetime in the owner drain. Any released or mismatched token rejects
before user code runs. No caller can read or reconstruct the context/owner
stack.
Providing an `InstanceRef` alone never fabricates admission authority and is
restricted to explicitly classified, bounded context-only reads. It cannot
acquire `InstanceState`, start a producer, or enter `Instance.provide`. A token
whose target does not exactly match the paired `InstanceRef`, or whose ID has
already been released, is rejected.

Releasing an owner synchronously changes its receipt status from `live` to
`settled` before resolving its promise. The ledger retains settled receipts
until retirement acknowledges their result, but liveness validation reads the
synchronous status field rather than `records.has(id)` or Promise state. A
captured callback therefore cannot reuse an already-released receipt merely
because retirement still needs its result.

The low-level API is frozen in
`packages/opencode/src/effect/instance-ref.ts`. These are package-internal
exports with a reviewed set of package-internal import sites, not public/barrel
APIs; the brand constructors remain module-private:

```ts
/** Module-private; never imported or provided outside this module. */
const InstanceAdmissionRef = Context.Reference<LifecycleOwnerStack>(
  "~opencode/InstanceAdmissionRef",
  { defaultValue: createEmptyLifecycleOwnerStack },
)

declare const InstanceExecutionBrand: unique symbol
export type InstanceExecution = {
  readonly [InstanceExecutionBrand]: true
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

`InstanceExecution` is opaque: it exposes neither context nor owner stack.
Owner tokens/stacks carry module-private unique-symbol brands, and
`InstanceAdmissionRef` is module-private. `InstanceExecution` values are
created only by the two exact-allowlisted capture functions and backed by a
module-private `WeakMap` containing the paired context/owner stack; every
consumer rejects an object without that provenance. Supplying a truncated
stack, casting a fabricated execution, exporting/providing the ref, or
re-exporting a capture/root factory violates the contract and is covered by
focused negative tests plus import-site review.
`restoreInstanceExecutionSync` is the sync ALS/callback boundary and has the
same PromiseLike rejection/adoption rule as `runSync`.
`enterInstanceExecutionEffect` is the Effect boundary: it validates the same
paired context and complete owner stack, registers the invocation in the
owner's callback drain before running the Effect, and releases it only when the
Effect settles. Both helpers are package-internal with exact infrastructure
import/call-site allowlists; application, route, provider, and native callback
code cannot import them.

The allowlist is frozen by symbol: `project/instance.ts` uses sync capture and
restore for `Instance.bind`; `effect/bridge.ts` uses Effect capture and Effect
entry; `effect/run-service.ts` and `effect/bootstrap-runtime.ts` use sync
capture plus Effect entry. `project/instance.ts` and
`effect/instance-state.ts` are the only root-owner factory callers. No listed
module may re-export a raw helper or opaque value. The nested and transfer
primitives are likewise confined to `project/instance.ts`, which exposes only
the guarded lease/producer/channel/body wrappers described below.

`registerLifecycleOwner(input)` is for nesting. It reads the complete current
owner stack internally, atomically validates the exact entry and kind seal,
records the receipt, and returns a handle whose `runSync`/`enter` append the new
token. Nested `enter` registers the callback immediately and returns only that
callback's Promise; it never waits for owner settlement and is safe for its
parent to await. Every owner in the stack must still be live whenever execution
is restored. No handle exposes its token, execution, receipt, or a readiness
Promise. Only `registerDirectoryRootLifecycleOwner` may create an empty-root
owner, and its exact allowlist is the directory state machine plus the
state-scope registrar.

Work that must survive its requesting owner instead uses
`transferLifecycleOwner(input)`. The child target is derived from the private
provenance of `handoffFrom`; callers cannot supply a second target. Transfer
atomically records an independent receipt in that same target's
`PendingTransfer`, validates that the explicit `handoffFrom` handle is live and
is the innermost owner in the internally captured current stack, and attaches
the pending child to that private handoff receipt. A direct transfer from a
parent receipt in target A's ledger into target B's ledger is rejected before
publishing either receipt. Handoff
`release({ ok: true })` atomically seals new transfer registration, flips the
handoff to settled, and moves the complete ledger-owned set of its still-pending
children to `ArmedRoot`; `release({ ok: false, error })` closes that complete
set without starting them. Release synchronously rejects with
`LifecycleOwnerBusyError` before mutation if an admitted `enter` callback is
still unsettled; callers await/catch that callback before passing its exact
outcome. `transferLifecycleOwner`, handoff release, and the target generation's
owner-kind seal linearize in one no-yield critical section on the same target
ledger: a child registered before the seal belongs to that complete set, while
a registration that loses either race rejects before publishing a receipt. No
child can remain permanently pending. In that same synchronous
transition, every registered private
`onArmed` continuation is admitted into the child's callback drain before it is
scheduled. A child close that wins first prevents admission; a close after arm
must wait the admitted continuation, and continuation throw/rejection closes
the child while remaining in the drain. Callback execution then contains only
the independent root token. Other ancestors are retained only as self-wait
blockers, not readiness dependencies. This release-and-arm rule belongs to
every owner boundary—not only HTTP middleware—so workflow, watcher, producer,
body, and request owners cannot create an unarmable transfer. No separate
commit capability is exposed.

Calling `runSync`/`enter` from any captured live ancestor rejects before work.
Calling either operation while the handle is `pending` or `settled` throws
synchronously before a callback is registered. `enter` is deliberately not an
`async` function and never waits for readiness. Once armed, it registers the
callback synchronously and returns only that callback's Promise. Thus there is
no readiness/settlement Promise to fetch or smuggle across an admitted
callback. Close, cancellation, or handoff-owner failure before the handoff
settles the pending receipt without starting work. No
transferred callback may begin, and no requesting owner may await it, before
the handoff is armed.

Every high-level `GenerationLease` mirrors the same mandatory discriminated
release result. Sync throw and async rejection are released as `{ ok: false,
error }`; only a fully settled successful callback may use `{ ok: true }`.
Calling release before an admitted callback settles is a no-mutation error, not
an early arm. This rule applies equally to current- and child-generation leases.
Lease objects have module-private provenance that resolves their exact
`InstanceContext` and low-level owner handle. A forged, released, non-innermost,
or target-mismatched lease cannot be used as a handoff.

A transport that can signal before its explicit handoff releases must choose
at registration time between one bounded, private `onArmed` continuation and
immediate transport close. The continuation is stored inside the transferred
receipt, is scheduled only by the parent's atomic successful release, and
exposes no Promise or resolver to the request owner. Arbitrary application code
cannot enqueue work for post-handoff execution.

`runSync` uses the conditional rest guard `RejectPromiseLike<R>`, so a
PromiseLike result requires an impossible `never` argument. Focused call-site
review covers untyped or deliberately obscured callbacks. The implementation
still checks the returned value. If an untyped callback nevertheless returns a
thenable, the owner adopts
it into the private callback drain, closes with
`AsyncLifecycleCallbackError`, and throws synchronously; retirement may not
treat the callback as departed while its continuation can still mutate.
Intentional asynchronous work uses armed `enter`.

`complete()` is the normal-success terminal transition; `close(reason)` is the
cancel/failure transition and invokes abort at most once. Both synchronously
seal future entry, are idempotent, and the first terminal transition wins.
Settlement still waits admitted callbacks and any transport acknowledgement.
Only the retirement orchestrator reads receipts directly from the private
ledger. Tests observe settlement through terminal state/effects, never by
obtaining a handle-owned Promise. This prevents a Promise from being fetched in
clean context and later awaited inside an admitted callback.

Boot and retirement roots are created only by the directory owner state machine
after their entries are published; they never inherit an incidental request
lease. Body, channel, producer, state-scope, and other continuation wrappers
must explicitly choose synchronous nesting, explicit-handoff transfer, or a
directory-owned root. In particular, a successful `StateAdmissionTicket`
creates and immediately arms a directory-owned scope root at registration; it
never waits for an ambient retirement/state-scope owner. Nested `release` and
transferred `complete`/`close` flip synchronous liveness before receipt
completion.
Tests cover handoff release and callback execution for every wrapper, including
boot-failure and retirement cleanup.

`Instance.provide` validates ambient execution before reading or mutating the
directory owner. A headless caller with neither context nor owners may open a
directory. A live same-target caller uses `acquireGenerationLease()`; it cannot
silently mint a second owner. A stale,
released, context-only, or same-directory older-generation execution is
rejected even if a newer generation is currently Open. A cross-directory
transition must use `acquireChildGenerationLease(context)` at the explicit
paired target site selected in the producer inventory. It validates that
`context` names the current Open generation and appends the child owner to the
inherited stack instead of
replacing parent owners, so nested `A -> B -> settled-close(A)` is rejected
before A enters Closing. Only the directory-root factory, or a transferred
owner after its handoff release, may create a new root stack. Their immutable
inputs and independent receipts cannot retain an accidental dependency on the
requesting owner. These checks prevent both cross-target self-wait and
a callback captured in `g` from calling `Instance.provide(directory)` after
`g + 1` opens and thereby re-minting `g + 1` authority.

Cross-target work that intentionally outlives its caller must not transfer
directly from the long-lived A owner into B. It first acquires a short B lease,
registers the B transfer synchronously from that exact lease, and releases the
B handoff before A is allowed to await the B result:

```ts
const handoff = acquireChildGenerationLease(contextB)
try {
  const child = handoff.runSync(() =>
    registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }),
  )
  handoff.release({ ok: true })
  return child
} catch (error) {
  handoff.release({ ok: false, error })
  throw error
}
```

Same-target work uses `acquireGenerationLease()` in the same sequence. The
acquire/register/release setup is synchronous and contains no `await`, return
escape, or handle publication before the discriminated release. The transfer
therefore lives entirely in B's ledger, becomes an independent B root while A
may remain live, and retains A only as lineage for self-wait checks—not as a
readiness dependency. Actor/inbox/workflow/tool sites cannot import the
low-level transfer primitive or infer a handoff from the ambient long-lived
owner.

`BootReceipt.settled` is distinct from an ordinary active lease. It settles only
after the generation's AppRuntime/layers have either finished constructing or
failed and all partial instance-owned resources have registered their
disposers/producer receipts. Boot is deferred-start: allocate `g` and its
unstarted receipt, CAS `Absent -> Open(g)`, reserve the provider lease, and only
then start boot exactly once. A synchronous throw can therefore always locate
its published owner. Before exposing `boot.context` rejection, boot failure
CASes `Open(g) -> Closing(g, boot_failure)` or records the result on an existing
same-target Closing entry without replacing reload/shutdown/maintenance intent.
A queued successor boot also remains gated until terminal publication.

Open-to-Closing synchronously closes public,
runner, producer, and channel admission before any await, signals the boot abort
channel, awaits boot settlement, then captures an immutable `retire` disposer
snapshot. A disposer registered during held boot is therefore included.

Closing does **not** immediately fence every normal `InstanceState` lookup:
runner cleanup still needs `SessionStatus` and `Bus`. Instead, every boot,
finite active lease, transferred body/channel, producer, and retirement cleanup
owns a unique live token.
During Closing, normal state acquisition is allowed only while executing under
one of those exact-target live tokens. A stale `Instance.bind` callback carries
a released token and is rejected; the same is true for a stale Effect fiber or
bridge carrying `InstanceAdmissionRef`. Retire-phase states advance their own
waterline before enumeration. After retire, channels, producers, and leases all
settle, the owner executes the general fence in three explicit stages:
synchronously seal every existing and future normal/late `InstanceState`
participant; outside the critical section await `StateAdmissionTicket`s that
won before the seal; then, under one short critical section, seal
`state_scope`/`disposer` registration for that phase and capture a fresh
normal/late disposer snapshot. No lock is held while awaiting the drain. Each
pre-seal acquisition mints its ticket synchronously before cache access. Even
if its asynchronous initializer finishes after the participant seal, that
ticket alone may register the exact scope/disposer and decrements the drain only
after registration. A post-seal acquisition receives no ticket and cannot
initialize old state. This makes the participant fence, owner-kind seal, and
fresh snapshot one linearizable protocol rather than contradictory gates.

Boot rejection automatically transitions `Open(g)` to
`Closing(g, boot_failure)` even when no explicit close API was called. The
original provider receives the boot error and releases its lease; partial
resources retire under the same receipt before the directory becomes Absent.

The Open-to-Closing transition keeps the same `OwnerLedger`. It first registers
the retirement owner, then synchronously seals new lease/body, runner,
producer, and channel authority. Boot and previously admitted owners remain
tracked. State-scope/disposer registration stays open only for a pre-seal
`StateAdmissionTicket` until that ticket finishes. Once the ticket drain reaches
zero, the corresponding retire/general state seal closes those owner kinds and
captures the fresh snapshot in the same critical section. A `provide`
registers one lease receipt before awaiting boot and acknowledges that exact
owner in `finally`; the transition must not copy or clear the records. A record
remains until retirement acknowledges its settled result, so a producer defect
that settles immediately before sealing cannot disappear. Sealing the ledger
by kind atomically prevents later registration and snapshots all owner IDs that
retirement must close/join.

The retirement orchestrator's own owner record is never included in an internal
join of its child owners; it settles only after terminal CAS/event attempt. It
is nevertheless included in the transitive wait set used to reject a settled
lifecycle call made from retirement/disposer cleanup. Phase disposer receipts
are joined by their phase runner and acknowledged before the next phase.
`state_scope` records are likewise settled by their retire/normal/late disposer,
not by the earlier channel/producer/lease drain; waiting them before their phase
would self-deadlock. They still appear in self-wait preflight. Each
`InstanceState` initialization first runs as nested acquisition work. Before
the acquisition leaves, its ticket uses the private directory-owner authority
to register an immediately armed scope root; the finalizer runs under that
independent exact root even while the retirement owner is still live. It does
not use generic transfer or wait on ambient ancestors. A
scope-owned callback cannot wait for the phase that must close itself.

### Intake and active leases

`Instance.provide` is the intake gate:

1. resolve and validate the directory, then validate any ambient execution;
2. reject a stale/released same-directory execution before owner-map mutation;
3. reject immediately with `InstanceClosingError` if the entry is closing or
   `InstanceMaintenanceError` if it is reserved for absent maintenance;
4. create or join the current open context;
5. synchronously insert one unique lease receipt into that exact open
   generation's owner ledger and install the matching admission token in ALS before awaiting
   `boot.context`;
6. after boot, re-check that the same generation still owns the directory; if
   it is now closing, do not call the requested function; and
7. settle and acknowledge the captured lease receipt in `finally`, never by a
   bare directory lookup.

Reserving the lease before awaiting boot prevents retirement from passing its
normal-disposer barrier while an old-generation context is still initializing.
It does not authorize `retire` to enumerate before boot settles and the
post-boot retire snapshot is captured.

No operation is admitted after the open-to-closing transition. An operation
admitted before closing keeps its exact-generation lease while it unwinds; a
session runner may be interrupted by the retire phase, while unrelated admitted
work may finish normally. The last lease releases the between-phase drain
barrier; it does not finish retirement or open a successor itself.

Returning an HTTP `Response` does not necessarily finish its body. A streaming
route must, before returning the Response, synchronously acquire a short
same-target lease, register a transferred `GenerationBodyHandle` from that
exact lease, and immediately release the handoff with the setup outcome. It
owns an independent root execution after handoff, an AbortSignal/cancel
operation, transport/body completion acknowledgement, and a settlement receipt.
Natural body `finally` acknowledges success, but retirement can actively cancel
an unconsumed or backpressured body and await its terminal acknowledgement.
`prompt_async` and any detached route continuation use the same short handoff
before launch/return. The middleware's outer request lease remains only a finite
lease and lineage ancestor; it never arms the body or detached continuation.
Route code cannot rely on Hono's `next()` lifetime or a consumer pulling the
body as proof of settlement.
Natural completion calls the handle's idempotent `complete()`; retirement calls
`close(reason)`. Racing completion/cancellation has one terminal outcome and
never runs body cancellation twice.

Long-lived read channels need an additional quiesce owner. Instance Event SSE,
PTY WebSockets, and file watchers register a transferred target-bound
`closeAndSettle` callback from an explicit short same-target lease and release
that handoff immediately after durable registration, before their outer
request/upgrade lifetime leaves.
`/tui/control/next` is different: its queue wait is finite work awaited by the
same request, so it registers an immediately live nested channel before
`await request.next()`. The parent may await that channel callback because it
has no handoff dependency. Retirement closes the nested waiter in channel phase
before reaching the finite active-lease barrier, which lets the route unwind
and release its parent lease. The TUI control queues are keyed by
`(directory, generation)`; request/response pairs from one directory or
generation are never consumed by another.

Both channel forms return `runSync`, tracked async `enter`, `complete`, and
`close` operations without exposing raw token/execution or
readiness/settlement thenables. Nested registration uses the current complete
owner stack and is live immediately. Transferred registration uses the
pending-to-root protocol with an explicit short lease in the same target; that
lease's successful release commits its handoff synchronously. Native callbacks
use a transferred handle only after that release; a premature callback gets a
synchronous pending error and is never given a Promise to await. They never
capture the request token, infer the middleware lease as handoff, or run with
bare context. Closing before a transferred handoff prevents start and settles
its receipt. Closing either form seals data-callback `enter`, then aborts
transport I/O.

Transport terminal acknowledgement is separate from data-callback admission.
`closeTransport` returns a Promise that resolves only after the exact native
socket/stream/watcher close event, or registration supplies an equivalent
`transportSettled` receipt. The terminal acknowledgement cannot be rejected by
the already-sealed `enter` gate. Channel settlement joins both this transport
acknowledgement and every data callback that entered before the seal; a
fire-and-forget `ws.close()` return is never treated as settled.

Retirement signals and joins channels and transferred body handles before
waiting finite request leases.
Closing an SSE channel actively aborts/closes its stream controller and joins
the currently blocked `writeSSE`; pushing a queue sentinel is not settlement.
Event SSE ends because of this generation-closing signal, not a late local
`server.instance.disposed` event. PTY socket close is idempotent with the later
PTY state finalizer, and a file-watcher callback executes only under the
watcher's live channel/producer token. This breaks stream-lease/late-Bus cycles
while preventing heartbeat, queue, watcher, message, or socket callbacks from
surviving terminal settlement.

### Retirement ordering

Retirement is one receipt owned by the closing generation. It executes exactly:

```text
1. atomically close directory intake
2. signal boot closing; await boot settlement and capture the retire snapshot
3. retire SessionRunState while normal dependencies remain alive
   - synchronously seal retire-state admission
   - outside the lock await acquisitions that already won admission
   - capture a fresh retire snapshot, then cancel and settle every existing runner
4. signal and join generation Event SSE / PTY / file-watcher /
   TUI-control channels and transferred streaming bodies, actively aborting
   blocked writes, backpressure, sockets, and long-polls
5. close, cancel where supported, and join the generation producer ledger
   - seal and settle the complete checkpoint watcher/pending queue, not only actor outcome
   - settle owned workflow timers/fibers and every producer-inventory row
6. wait for the remaining admitted, finite active leases of g to leave
7. synchronously seal every existing/future general InstanceState participant
8. outside the lock await pre-seal acquisitions; then capture a fresh
   normal/late disposer snapshot
9. run normal instance disposers
10. run late Bus disposers
11. for maintenance intent, run its exclusive Git/filesystem callback while
    the entry remains Closing
12. atomically replace Closing(g) with a non-admitting Terminal(g) reservation
    that retains the same OwnerLedger and records Absent, successor, or shutdown
13. best-effort emit server.instance.disposed exactly once for g, isolating
    synchronous throws and asynchronous listener rejections
14. under the DirectorySlot lock re-read Terminal outcome and the process drain
    gate, synchronously settle/acknowledge the retirement owner, then replace
    Terminal(g) with Absent or a newly allocated unstarted Open(nextGeneration)
    and release its boot gate only after the emission attempt
```

Waiting for active leases before runner retirement would deadlock on a streaming
or background prompt whose lease/work is released only after runner
interruption. The registry therefore exposes a retire-only snapshot/runner and
a separately captured normal/late snapshot/runner; the owner places channels,
producers, leases, and the general fence between them. Disposers within one
phase all get a chance to settle; if any rejects, the registry rejects that
phase and does not start a later phase. A rejection in any phase or maintenance
operation rejects the retirement receipt and keeps the directory in `Closing`
with the failure recorded. The process must restart or a future explicit
recovery design must be approved; automatic reopening after a failed retirement
is unsafe.

The Terminal reservation is required for both dispose-to-Absent and reload.
While listeners are being invoked, a re-entrant or concurrent `provide` sees a
non-admitting owner and receives the same typed closing result for g; it cannot
allocate `g + 1`. Global drain and settled callers join the same retirement
receipt rather than treating Terminal as Absent. This prevents a new generation
from publishing work between two listeners that are still receiving
`disposed(g)`. A deterministic listener test invokes `provide(sameDirectory)`
from the first listener and proves it is rejected until every listener has been
attempted and Terminal is released.

`TerminalEntry` retains the exact `OwnerLedger`; the retirement token remains
live and verifiable through every listener attempt and the final slot CAS. The
ledger is never copied. `disposeAll` may atomically change a Terminal successor
outcome to `shutdown`, and final publication always re-reads both that current
outcome and the global drain gate. If either says shutdown, no successor entry
is published and its init count remains zero. The safe emitter clears ambient
instance authority before invoking external listeners, so a listener may
synchronously request process shutdown without inheriting the retirement
owner. This closes the listener-time gate race rather than relying on a later
rescan to catch an already-started successor.

Boot settlement must precede retire enumeration because `InstanceState.make`
registers disposers while a layer is constructed. A held-boot test must prove a
late retire disposer is included in the post-boot retire snapshot and is then
run. Normal/late registration may continue only under live cleanup/admission
tokens until the general fence; the fresh snapshot after that fence includes
such registrations.

`SessionRunState` registers its exact generation cache entry in the `retire`
phase. Before enumerating its runners it marks that state retiring, so an
already-admitted old-generation callback cannot create a new runner behind the
enumeration. It retains the current blocking `Runner.cancel`/scope settlement
semantics. Runner state adds `Starting(runID, startGate, settled)` and
`Settling(runID, done)`. Under the short outer lock, start performs a truly
synchronous `Idle -> Starting` CAS and publishes the exact runner/runID in the
map. Outside the lock it creates the work fiber, then conditionally advances
that same entry to Running; retirement can seal a held Starting gate and settle
it before any work begins. A work fiber never
publishes `Idle` until `onIdle`, the main-only status write, and the conditional
outer-map removal for that same runner and `runID` have settled. A start that
finds `Settling` waits its receipt and retries through `SessionRunState`; it
cannot reuse the runner. Retirement marks the outer state retiring and snapshots
Starting, Running, and Settling entries under one short outer lock. A start
either publishes Starting under that lock before the snapshot or is rejected.
Old `onIdle` may remove only when the current map entry has both the same runner
identity and the exact captured `runID`; it can never delete a newer run or
runner.

The retire path does not use an untracked `forkDetach`. If a producer fiber is
detached from the initiating request, its `Fiber.join`/Deferred receipt belongs
to and is awaited by the retirement.

Every `InstanceState` cache records a per-directory retired-generation
high-water mark before invalidation. A small `instance-state-registry` owns the
global phase seal and every cache participant. A participant registered after a
target is sealed starts sealed. Acquisition uses a synchronous admission
record, not an asynchronous semaphore: in one non-yielding step `get`/`has`
checks its phase waterline plus the owner's lifecycle/token decision and
increments the generation's in-flight acquisition count, then runs the existing
`ScopedCache` effect and decrements in `ensuring`.

Retire-state sealing occurs only after boot settles. It synchronously advances
the retire waterline for all current/future participants, waits pre-seal
acquisitions outside the registry lock, then captures the fresh retire disposer
snapshot. Normal state remains available during Closing only to live
boot/lease/producer/channel/retirement tokens. Once those owners settle, the
general seal rejects every token, waits pre-seal acquisitions outside the lock,
then captures the fresh normal/late snapshot and invalidates exact-generation
entries. A later acquisition interrupts before `ScopedCache.get`; an earlier
one is invalidated after it settles. No snapshot is taken before its admission
drain, and no lock is held during that drain. This preserves the existing
synchronous cache-hit contract used by `Bus.subscribe`/`subscribeAll` and adds
no semaphore suspension to `runSync`. Manual runtime `invalidate()` waits
current acquisitions under a temporary exact-key admission gate, invalidates,
then reopens without advancing a retirement waterline; this prevents a new
acquisition from entering between a zero-count observation and invalidation. A
successor uses a strictly larger key and is unaffected.

### Settlement definition

A successful retirement receipt means generation `g` can no longer perform an
asynchronous filesystem, database, message, status, or event mutation. Every
instance-owned producer reachable from the affected paths must therefore be in
at least one tracked class: boot receipt, exact-generation active or
finite request lease, retirement-closed body/channel, `SessionRunState` runner,
fiber/promise owned by an `InstanceState` scope, generation producer-ledger
receipt, or explicit disposer receipt joined by retirement. A checkpoint
receipt covers its entire settlement watcher through watermark DB update,
writer deletion, metrics event, and sealed pending-queue disposition; actor
outcome alone is not settlement. A naked `forkDetach`, untracked `void` promise,
timer, or bound callback that can mutate after those classes settle is a release
blocker, not an allowed eventual cleanup.

Producer ownership has two non-interchangeable APIs. A nested producer starts
immediately, registers its Promise in the current owner drain, and may be
awaited by that owner because it has no handoff dependency. A producer that
must outlive its caller registers a transferred handle whose private run
continuation is admitted and scheduled by release of an explicit short lease in
the producer's own target ledger; registration returns no result/readiness
Promise to that handoff owner. Treating one API as the other, or inferring the
handoff from an ambient long-lived ancestor, violates the contract and is
covered by focused owner/handoff tests.

The implementation begins with a checked-in, manually refreshed producer
inventory, not an end-of-PR search. At minimum it classifies
`project/bootstrap.ts` service init and
memory reconcile, `config/config.ts` dependency install,
`history/backfill.ts`, `session/prune.ts` detached settlement,
`prompt_async`, instance/global event streams, checkpoint writers, actor and
workflow fibers/timers, PTY callbacks, file watchers, and TUI control long-polls.
Boot init/reconcile is owned by `BootReceipt`; response streams and
`prompt_async` continuations transfer leases; background file/DB work moves to
the generation producer ledger with an abort signal and joined receipt;
checkpoint writer work registers before enqueue/launch and its existing drain
is extended past actor outcome through the settlement watcher and sealed pending
queue; an operation proven process-owned and mutation-free may be documented as
exempt. No listed producer may remain “audit later.”

Captured callbacks may still be invoked after terminal settlement, but their
generation compare-and-swap and InstanceState retirement waterline must turn
them into a no-op or interruption before any mutation.

### Public method semantics

The selected API avoids a breaking SDK change while separating acceptance from
terminal settlement:

Every internal settled join computes the transitive owner IDs in the receipt it
would await, validates ambient execution, and rejects when that set intersects
any live owner ID in the complete ambient stack. It never checks only the
innermost/current token. This happens before installing a global gate, changing
a directory entry, or starting a maintenance callback. The rule applies
uniformly to boot, lease/body, runner, producer/checkpoint, channel,
state-scope, retirement/disposer, and maintenance owners. An accepted
non-waiting request may be initiated from a live owner, but stale execution
still rejects. Public request handles are opaque IDs with no thenable or wait
method; completion is delivered by terminal event or a process-owned
continuation registered at request creation. Private receipt joins have an
exact structural allowlist: the directory owner state machine, the shared
shutdown coordinator, the headless-bootstrap and workflow process-owned
cleanup sites, and one test-only lifecycle fixture. Worktree deletion uses
`maintainDirectory` instead of importing a join. Manual inventory and import-
site review must identify every other import/call site, while focused tests
cover the runtime self-wait rejection. This prevents settlement Promises from
being fetched in clean context and later smuggled into an admitted callback.

The implementation branch temporarily retains the existing Promise-returning
`Instance.disposeDirectory` and `Instance.disposeAll` facades only so each TDD
commit remains runnable while their frozen callers are migrated. Each task
records the two remaining declarations and pre-migration call anchors in the
inventory and source-search evidence; a third facade or new caller blocks
review. Config invalidation moves to
non-waiting request/event semantics with the directory owner, the global route
becomes accepted/event-based with the HTTP surface, worktree and workflow move
with maintenance, the TUI worker moves to shared shutdown, and tests move to
the single test-only fixture. The final shutdown task deletes both legacy
facades; final manual inventory and source review confirm their absence, while
focused tests exercise the frozen legacy call shapes. No commit that still
retains either facade is eligible to merge independently.

- `Instance.dispose()` runs inside the current instance request. It atomically
  marks the current generation closing, starts retirement, and returns quickly.
  Existing `POST /instance/dispose` remains `200 true`; that response means
  accepted, not terminal. The terminal signal is `server.instance.disposed`.
- `Instance.reload(input)` atomically closes the current generation and records
  exactly one successor boot input. It returns after the successor is accepted,
  not after boot. A second reload while closing fails with
  `InstanceClosingError`; it cannot replace the queued successor.
- A rejecting `BootReceipt` automatically owns a `boot_failure` retirement.
  Callers observe the original boot error, while retries observe Closing until
  partial resources settle; only then may a later provide allocate `g + 1`.
- The module-private `disposeDirectorySettled(directory)` join is used only by
  the directory owner plus the exact headless-bootstrap, workflow-cleanup, and
  test-fixture allowlist above. It is not exported on the public `Instance`
  facade and returns no receipt to generation-owned callbacks. It starts a
  close-to-absent retirement, or joins
  an existing close-to-absent retirement, and resolves only after terminal
  settlement. If the existing closing entry owns a queued successor, it rejects
  instead of joining; destructive deletion must not race a previously accepted
  reload. A caller-side response timeout may stop waiting, but it must not clear
  the barrier, reopen the directory, or delete the worktree.
  Calling the private join from any same-target live owner—boot, lease,
  producer, channel, retirement/disposer—is rejected with
  `InstanceRetirementSelfWaitError`; headless callers must leave that owner
  before awaiting settlement. `Instance.provide` installs an exact
  `(directory, generation, kind, ownerID)` token in ALS while the lease is held;
  runtime attachment mirrors it into `InstanceAdmissionRef`, and every settled
  API preflights that token before installing a gate, changing an entry, or
  waiting. This is an explicit all-owner self-wait check, not an inference from
  aggregate active counts. An accepted request-then-leave helper is used where
  an owner must initiate its own later settlement.
- The module-private `maintainDirectory(directory, id, operation)` combinator is
  the only primitive for a destructive follow-up such as worktree removal. It
  exposes no child-generation receipt and installs a unique
  maintenance intent synchronously. From Open it retires the old generation and
  invokes the owner callback after late disposal while the directory remains
  Closing. From Absent it atomically allocates a `Maintaining(m)` reservation
  with no boot/lease/disposer work and runs the same callback while intake stays
  closed. A global drain gate rejects a new reservation; `disposeAll` joins any
  reservation already installed. Only after the Git/filesystem operation
  settles does terminal CAS expose Absent; a disposed event is emitted only
  when an actual Open generation was retired. A timeout cannot cancel the
  callback or release the fence. A callback failure records terminal failure
  and remains fail-closed; a duplicate maintenance request or queued reload
  conflicts rather than replacing it.

  Worktree removal is two-phase. Stage A runs under the caller/parent instance,
  captures parent repository/project identity plus the canonical child path,
  and never opens an Absent child merely to delete it. Stage B calls
  `maintainDirectory(child)` after leaving every child owner. Inside the
  reservation callback it re-reads the Git worktree list and performs fsmonitor
  handling, Git removal, filesystem removal, branch deletion, and sandbox DB
  removal. A control-plane `Workspace.remove` resolves the adaptor target before
  any mutation and passes its finalize callback into this same reservation;
  `stopSync`, Session row deletion, and Workspace row deletion happen only after
  successful physical removal and before reservation release. Adaptor or
  finalize failure propagates, preserves the fence and remaining rows, and is
  never caught merely to continue deletion. It uses only captured process-owned
  Git/filesystem/project services and never reacquires retired child
  `InstanceState`. Calling removal from a same-child owner rejects before Git,
  filesystem, or DB side effects.
- `requestDisposeAll()` is the public non-waiting request. The module-private
  `disposeAllSettled()` join is reusable only by shared shutdown and test
  cleanup; those exact import/call sites are recorded during inventory review.
  While it is running, a process-local drain gate rejects every new
  `provide`/`reload`; it atomically converts queued successors to
  `shutdown`, changes any Terminal successor outcome to `shutdown`, closes every
  open entry, and waits for all retirement
  receipts, including `Maintaining` reservations. Before installing that gate or
  changing any entry, it preflights the current exact owner token against every
  target it would wait for; a same-target boot/lease/producer/channel/retirement
  call rejects with `InstanceRetirementSelfWaitError` and has no side effect.
  Terminal final publication re-checks this gate under the slot lock, so a
  successor cannot start between a listener's shutdown request and a later
  drain scan. The drain gate is released only after all receipts settle so later tests may
  open fresh instances. A failed directory remains individually `Closing`;
  releasing the global gate does not reopen it.

`shutdown` is the only intent allowed to supersede an accepted reload. It joins
an in-flight maintenance or boot-failure receipt and never replaces its
callback/failure policy. The terminal compare-and-swap reads the
Closing/Terminal entry's current intent and the process drain gate instead of a
successor captured when retirement began. `disposeAll` records that
supersession in logs. If the successor committed immediately before the global
gate, the synchronous drain scan closes that new generation too; if the gate
won first, the terminal compare-and-swap observes `shutdown` and suppresses the
boot. On successful return there is no open entry or queued successor.

A stale generation calling `dispose`, completing a disposer, or emitting an
event performs an identity compare-and-swap. If the directory owner no longer
matches its target, it is a no-op or typed stale result and can never affect the
new entry.

### HTTP and TUI behavior

During `Closing` or its short `Terminal` emission reservation, instance-scoped
requests for that directory return:

```http
HTTP/1.1 503 Service Unavailable
Retry-After: 1
X-MiMo-Server-Incarnation: 01K...
X-MiMo-Instance-Directory: /canonical/project/path
X-MiMo-Instance-Generation: 42
Content-Type: application/json

{
  "code": "instance_closing",
  "error": "The instance is closing; retry after retirement completes.",
  "directory": "/canonical/project/path",
  "generation": 42
}
```

Global routes and other directories remain available. The first dispose request
keeps `200 true` accepted semantics. `project.initGit` returns the completed
project result after queueing its successor; requests arriving in the closing
window receive the transient 503 and recover after successor boot.
An Absent-origin `Maintaining(m)` reservation returns a pre-admission 503 body
with `code: "instance_maintenance"`, canonical directory, and `Retry-After: 1`,
but no instance lifecycle triple because no instance generation was selected. An
Open-origin maintenance uses the ordinary `instance_closing` generation
contract.
Every response produced after an instance generation has been selected carries
one lifecycle triple: process-random `X-MiMo-Server-Incarnation`,
`X-MiMo-Instance-Directory`, and `X-MiMo-Instance-Generation` for the canonical
target that actually produced it. The three are all present or all absent for
an instance result. Directory is URI-encoded for non-ASCII/space-safe header
transport and decoded before comparison. CORS exposes all three headers plus
`Retry-After`.

Response provenance is explicit and three-state: `unset`, authoritative
instance triple, or `authoritative-none`. A local inner
`WorkspaceRouterMiddleware` sets the instance triple. The outer instance
middleware fills its own target only while provenance is still `unset`; it
never overwrites either authoritative state. A remote proxy validates and
forwards a complete upstream triple, marks a genuinely headerless upstream
response `authoritative-none`, and rejects a partial triple as a protocol error.
It never relabels a remote/pre-admission error with the outer base generation.
Pre-admission authorization, directory-policy, path-validation, and
Absent-maintenance failures have no instance triple and retain their existing
response contract.

If the closing entry records a retirement failure, the response is instead a
non-transient `500` body with `code: "instance_retirement_failed"`, no
`Retry-After`, the canonical directory and generation, and operator guidance to
restart the process. The TUI must surface that error and stop retrying; a
permanent failure must not look like an endless loading state.

`GlobalEvent` is a discriminated union:

```ts
type EventProvenance = { project?: string; workspace?: string }
type GlobalEvent = EventProvenance & (
  | { incarnation: string; directory: "global"; generation?: never; payload: unknown }
  | { incarnation: string; directory: string; generation: number; payload: unknown }
)
```

Every instance-originated envelope uses the second branch. Process-global
events preserve the existing `directory: "global"` discriminator and omit
generation. The incarnation is generated once per server process and changes
after restart. Remote workspace relay preserves source incarnation and
generation and only rebinds optional workspace provenance; it does not replace
the source lifecycle triple. `server.instance.disposed` has one owner: terminal
retirement on `GlobalBus`. Its envelope and payload both identify the complete
incarnation/directory/generation target. The instance `Bus` late finalizer only closes its local PubSubs and
no longer publishes a duplicate. After all phases settle, terminal CAS commits
without an intermediate `Absent` race. A queued successor is installed with a
closed start gate. The safe emitter then invokes each GlobalBus listener
independently from one `rawListeners("event")` snapshot, invoking Node's raw
`once` wrappers so removal/once semantics are preserved. Synchronous throws are
caught; a returned promise receives an immediate rejection handler but is not
awaited by retirement. Listener failure cannot block the CAS, remaining
listeners, receipt, or successor. Only after the disposed emission attempt does
the owner release the successor start gate, so a new generation cannot publish
before the terminal event attempt for the old one.

All TUI bootstrap/sync requests—including project/workspace helpers and their
dialog/session-list callers—go through one response wrapper that keeps the raw
`Response` and explicitly decodes SDK `{ error, response }` results before
stores are written. `throwOnError` is not used here because the generated client
can discard the raw response and `Retry-After`. Helpers return checked data;
only the wrapper commits mutations. One coordinator per TUI selection
`{sdkDirectory, workspaceID}` handles `instance_closing`; multiple bootstrap
calls for that selection join it rather than creating per-directory retry loops.

App-level session-fork continuations use the same checked-response selection
epoch: a completed server fork is not rolled back, but an old response cannot
navigate or show a stale error after selection replacement. Orchestrator entry
uses a two-phase epoch handoff only when its resolved target differs from the
source selection. The same-target direct-entry path performs no disposal,
directory switch, successor creation, or handoff; root resolution, local ID, and
navigation stay on the source receipt. For a cross-target entry, the source epoch
owns target resolution and old-directory disposal and is revalidated immediately
before the synchronous `switchDirectory`. That switch registers the exact target-
selection phase before the source receipt releases; the target epoch then owns
bootstrap, root resolution, local orchestrator ID, and navigation. An external
switch invalidates whichever phase is current. The source receipt never waits on
its successor, so the operation's own switch cannot create an epoch self-wait.

The App's `bash.interactive.asked` event, spawned child process, retry timer, and
reply form one nested child channel of the initiating selection epoch. The
channel captures the source client and directory before its first await; it
never constructs a late raw reply from the current selection. Selection
replacement aborts and joins the child, clears a pending retry delay, prevents
an unadmitted retry or reply through a later selection, settles or cancels
captured-source transport, rejects stale toast admission, and restores a
still-live renderer exactly once. Host exit closes and joins the same
selection coordinator before renderer destruction and `tui()` resolution;
`thread.ts` requests worker RPC shutdown only afterward. Host exit suppresses
late renderer work and transitively joins this receipt; SharedShutdown does not
register a second owner or make the worker own a host-process child.

Within each selection/epoch, the client assigns a source slot to the outer SDK
transport and to each workspace relay identity, then keys clocks by
`(sourceSlot, serverIncarnation, canonicalDirectory)` and maintains
`retiredThrough`, `highestObservedGeneration`, and `committedGeneration`. A
non-bootstrap response may mutate stores only if its
canonical target and incarnation match the intended live source, its local
epoch is current, its generation is above `retiredThrough`, and it is not below
`highestObservedGeneration`, and its generation exactly equals
`committedGeneration`. A higher, not-yet-bootstrapped generation advances
`highestObserved` and coalesces a fresh cohort but is dropped rather than
applied to the old store. A new `server.connected` incarnation for an already-known
source slot atomically advances the selection epoch, aborts old requests/event
consumption, clears that slot's old-incarnation clocks, and requires a fresh
bootstrap. Initial discovery of another source slot does not conflict with the
outer source. A delayed old-incarnation response or event is rejected. Reconnect
to the same source/incarnation does not reset clocks.

A blocking bootstrap cohort collects all responses without mutation, groups
them by canonical directory, requires exactly one `(incarnation, generation)`
per directory and one local epoch for the whole cohort, then revalidates the
epoch and all clocks immediately before commit. It advances every affected
`highestObserved` and `committedGeneration` synchronously first and performs the
whole store batch with no intervening await. Different canonical directories in one workspace bootstrap
are valid; mixed g/g+1 or mixed incarnation for the same directory is not. A
503, invalid target, mixed generation/incarnation, or epoch change discards the
whole cohort and retries. An instance operation missing any member of the
lifecycle triple is invalid. Only an operation statically classified as
process-global may omit directory/generation, and it does not participate in
generation grouping. Partial cross-generation bootstrap writes are forbidden.

The TUI event path preserves the full GlobalEvent envelope. Disposed events use
a dedicated branch before ordinary high-water filtering: they monotonically
advance `retiredThrough`, invalidate `committedGeneration` when the committed
store is at or below the disposed generation, and coalesce one fresh bootstrap.
An ordinary event below the observed/retired waterlines is dropped. An ordinary
event exactly at `committedGeneration` may mutate; one above it is recorded as
observed and triggers/coalesces bootstrap but cannot touch the current store.
This remains correct when a g+1 response/event arrives before a delayed
disposed(g): no g+1 delta is applied to the g store, and disposed(g) is not
discarded merely because a higher generation was observed. Directory switch
or shutdown cancels the coordinator. An event from a newly observed incarnation
first invalidates the old selection epoch and triggers a fresh bootstrap; a
delayed event from the old incarnation cannot mutate the new source.
`instance_retirement_failed` and unrelated errors retain visible non-retry
handling.

`session.sync` cannot bypass these rules through `fullSyncedSessions`. Its cache
key includes selection epoch, source slot, incarnation, canonical directory,
committed generation, and session ID. Advancing a generation, accepting a
disposed event, or changing incarnation invalidates the affected entries before
any fast return. A cached g session therefore performs a fresh cohort after
g+1 or server restart.

### Shutdown intake

Shutdown order is:

```text
install a synchronous process intake gate
-> close tracked process-owned global SSE streams
-> collect private disposeAllSettled() failure without skipping finalization
   (each generation retires runners, Event SSE / PTY/body channels, and checkpoint watchers)
-> collect remaining process-owned/global HTTP drain failures
-> finally invoke the raw Bun server's force-close exactly once and close logs
-> report clean completion or the aggregated unclean failure
```

Refactor the server lifecycle into `stopAccepting`, `closeLongLivedStreams`,
`awaitDrained`, and final `forceClose`. `stopAccepting` is an application-level
gate if the runtime cannot pause accept independently; newly accepted sockets
must not reach instance work. Do not call the current memoized
`server.stop(false)`, because that permanently fixes the first close mode and a
global SSE can keep its promise pending forever. The raw Bun `stop(true)` call
happens once only after `disposeAll` has quiesced instance runners/producers and
the remaining non-instance receipts have drained; it is a transport cleanup,
not a substitute for retirement. Never wait for all active instance requests
before starting `disposeAll`: a request may be waiting for the runner that
retirement must interrupt, creating the original cycle again. The TUI host
waits for an explicit worker `shutdown-complete` handshake instead of
terminating on the current five-second timer; an explicit
second-signal/emergency path is reported as unclean rather than as settled.
The same shared shutdown coordinator is mandatory for TUI, `serve`, ACP, and
the compiled `web` entrypoint; none may own a private listener close sequence or
wait forever after losing the only reachable stop path. `serve` and `web`
install signal-driven shutdown instead of an unreachable `server.stop()` after
`new Promise(() => {})`. ACP closes its listener when the protocol/stdin
lifetime ends or fails. Deterministic real-connection tests cover all four
frontends, including a blocked global SSE write that must be actively aborted
before force-close. This is lifecycle parity only; it does not expand Web
product support.

Retirement/drain failure changes the reported outcome, not the transport
finally. The coordinator aggregates disposal and request-drain errors, marks
shutdown unclean, and in one `finally` invokes raw `forceClose` and log cleanup
exactly once before rejecting/reporting the aggregate. A failed generation may
remain fail-closed in memory, but no frontend is left indefinitely listening
after intake has stopped. Real-entry tests inject a rejecting disposer for TUI,
serve, ACP, and web and prove force-close/log finalization still occur once.

The TUI worker's `rpc.server` listener creation is single-shot for one worker
lifetime. A second call rejects before stopping, rebinding, or mutating the
existing listener, even when a connection is active. It must not use raw
`stop(true)` as an untracked non-terminal replacement and must not reuse the
terminal shutdown coordinator to reopen intake after its permanent gate.

## Preserved Boundaries

- `SessionRunState.Interface.cancelActorDetached` remains unchanged. It is a
  user-level graceful actor cancellation primitive, not an instance lifecycle
  receipt.
- `Actor.cancel(... graceful)` ownership, terminal outcomes, fork context, and
  notifications remain unchanged.
- Only the main runner writes `SessionStatus`; subagent retirement removes its
  tuple-key runner without writing session-level busy/idle state.
- Checkpoint drain behavior remains separate from generic runner retirement.
- FD-004 remains active: this design does not enable the rejected implicit LLM
  server or listener.

## File Ownership

- `packages/opencode/src/project/instance.ts`: state machine, generation,
  intake, boot seal, active/response leases, producer ledger, close-intent
  arbitration, reusable global drain, retirement receipts, successor boot, and
  public method semantics.
- `packages/opencode/src/effect/instance-ref.ts`,
  `packages/opencode/src/effect/bootstrap-runtime.ts`,
  `packages/opencode/src/effect/run-service.ts`, and
  `packages/opencode/src/effect/bridge.ts`: carry the complete immutable owner
  stack next to `InstanceRef` across ALS/Effect boundaries; a context-only
  reference never grants cleanup admission.
- `packages/opencode/src/actor/spawn.ts`,
  `packages/opencode/src/inbox/inbox.ts`,
  `packages/opencode/src/tool/session.ts`,
  `packages/opencode/src/workflow/runtime.ts`, and
  `packages/opencode/src/server/routes/instance/httpapi/server.ts`: replace bare
  cross-instance `InstanceRef` substitution with a live paired execution/owner
  handle whose receipt is joined by its target generation.
- `packages/opencode/src/effect/instance-registry.ts`: `retire -> normal -> late`
  phase runners, separately timed retire and normal/late snapshots, and
  target-aware disposer receipts.
- `packages/opencode/src/effect/instance-state.ts`: generation-scoped cache keys
  plus synchronously admitted retired-generation waterlines and exact-target
  invalidation without breaking synchronous Bus cache hits.
- `packages/opencode/src/effect/instance-state-registry.ts`: global
  current/future participant seals, pre-seal acquisition drains, and the
  seal-then-drain-then-snapshot boundary shared by every `InstanceState`.
- `packages/opencode/src/session/run-state.ts`: retire-phase registration while
  retaining tracked, blocking cancellation settlement; `effect/runner.ts`
  exposes a short start-admission operation so outer retirement cannot snapshot
  Idle and then allow a late start.
- `packages/opencode/src/project/bootstrap.ts`,
  `packages/opencode/src/config/config.ts`,
  `packages/opencode/src/history/backfill.ts`, and
  `packages/opencode/src/session/prune.ts`,
  `packages/opencode/src/workflow/runtime.ts`: move detached instance mutations,
  timers, and forked effects to boot or producer-ledger ownership.
- `packages/opencode/src/pty/index.ts` and
  `packages/opencode/src/file/watcher.ts`: replace captured request/boot tokens
  with long-lived channel/producer owners and joined callback settlement.
- `packages/opencode/src/session/checkpoint.ts`: seal exact-generation writer
  queues and track full settlement watchers, not only actor outcomes.
- `packages/opencode/src/server/routes/instance/session.ts`: transfer a
  cancelable body/channel owner to streaming Response bodies and `prompt_async`
  continuations.
- `packages/opencode/src/server/routes/instance/event.ts` and
  `packages/opencode/src/server/routes/instance/pty.ts`: register Event SSE and
  PTY WebSocket close receipts with the generation channel owner.
- `packages/opencode/src/server/routes/instance/tui.ts`: key control queues by
  target generation and register each awaited long-poll as a nested closeable
  channel before reading the queue.
- `packages/opencode/src/bus/index.ts` and
  `packages/opencode/src/bus/global.ts`: remove the local duplicate disposed
  event and isolate GlobalBus listener failures after terminal CAS.
- `packages/opencode/src/server/routes/instance/access.ts`: stable closing error
  schema and guard.
- `packages/opencode/src/server/routes/instance/middleware.ts`: map
  `InstanceClosingError` to 503 plus the lifecycle header triple and
  `Retry-After` before bootstrap.
- `packages/opencode/src/server/workspace.ts`,
  `packages/opencode/src/server/proxy.ts`,
  `packages/opencode/src/server/server.ts`, and the server-incarnation helper:
  preserve three-state response provenance, ensure the innermost canonical
  workspace target owns the lifecycle triple, and inject common lifecycle
  OpenAPI responses only into instance operations.
- `packages/opencode/src/cli/cmd/tui/app.tsx`,
  `packages/opencode/src/cli/cmd/tui/context/sdk.tsx`,
  `packages/opencode/src/cli/cmd/tui/context/project.tsx`,
  `packages/opencode/src/cli/cmd/tui/context/sync.tsx`,
  `packages/opencode/src/cli/cmd/tui/context/event.ts`, and project/workspace
  sync callers: checked cohort responses, canonical-target generation
  high-water filtering, full event envelopes, and transient closing retry.
- `packages/opencode/src/server/server.ts` and
  `packages/opencode/src/server/adapter.ts`,
  `packages/opencode/src/server/adapter.bun.ts`,
  `packages/opencode/src/server/adapter.node.ts`, and
  `packages/opencode/src/server/routes/global.ts`: intake gate, tracked
  long-lived streams, request drain, and one final transport force-close.
- `packages/opencode/src/cli/cmd/tui/worker.ts` and
  `packages/opencode/src/cli/cmd/tui/thread.ts`: settled shutdown handshake
  without the current five-second premature termination.
- `packages/opencode/src/cli/cmd/serve.ts`,
  `packages/opencode/src/cli/cmd/acp.ts`, and the compiled web entrypoint: use
  the same shared intake/drain/force-close coordinator as TUI.
- `packages/opencode/src/cli/bootstrap.ts`: leave the active `provide` lease
  before awaiting settled directory retirement.
- `packages/opencode/src/worktree/index.ts`,
  `packages/opencode/src/control-plane/workspace.ts`, adaptor types and the
  worktree adaptor, plus
  `packages/opencode/src/server/routes/instance/experimental.ts`: capture parent
  metadata without opening an Absent child, then keep Git/filesystem/branch,
  Session/Workspace rows, and sandbox DB deletion inside one child maintenance
  reservation.
- `packages/opencode/src/plugin/index.ts`: explicitly adapt the unchanged public
  plugin `remove(info)` contract to internal success-before-finalize semantics;
  do not use a cast that bypasses sequencing.
- `packages/opencode/src/server/routes/instance/project.ts`: queue reload
  successor without waiting inside the old active lease.
- `packages/sdk/openapi.json` and `packages/sdk/js/src/v2/gen/`: regenerated
  500/503 lifecycle bodies, lifecycle header triple, and disposed-event
  incarnation/generation; FD-004 rejected schemas remain absent.

## Acceptance Matrix

### Registry ordering

- A gated retire disposer prevents normal and late phases from starting.
- A gated active lease does not prevent retire from starting, but prevents
  normal and late phases after retire settles, once boot has settled and the
  retire snapshot is captured.
- A retire disposer that registers while boot is held is observed after boot
  settles, is included in the snapshot, and runs before any normal disposer; a
  normal service registered by valid cleanup afterward is included in the fresh
  normal/late snapshot; registration after the general seal starts sealed and
  cannot acquire old-generation state. Both retire and general ordering are
  synchronously seal, wait pre-seal acquisitions outside the lock, then capture
  a fresh snapshot; snapshot-before-drain is forbidden.
- A pre-seal `StateAdmissionTicket` may finish asynchronous initialization and
  register its exact scope/disposer after participant seal; post-seal work gets
  no ticket. Drain-zero, owner-kind seal, and fresh snapshot are one critical
  section.
- Releasing the retire and lease gates produces retire, then normal, then late
  observations.
- A retire rejection keeps the directory closing and prevents successor boot.
- A normal rejection prevents late disposal and keeps the directory closing.
- Real default-layer runner cleanup may acquire SessionStatus/Bus under its
  retirement token; stale callbacks cannot, and the general fence blocks both
  after cleanup settles.

### Generation isolation

- Closing rejects same-directory `provide` and a second reload before init runs.
- A provide whose boot promise is held counts as an active lease; retirement
  cannot enumerate retire disposers until boot settles and captures the retire snapshot,
  and cannot run normal/late disposal until the captured lease is released.
- Boot rejection without an explicit close automatically retires partial
  resources; retries remain Closing until that receipt settles, then g + 1 may
  open.
- The private `disposeDirectorySettled` rejects a closing entry with a queued
  successor and does not authorize worktree deletion.
- `maintainDirectory` holds Closing across the complete destructive callback;
  no provide can open in the former retirement-to-delete window.
- From Absent, `maintainDirectory` atomically installs a reservation before any
  callback. Concurrent provide or `disposeAll` can only observe and reject/join
  that reservation; removal after process restart remains supported.
- A different directory remains usable.
- After terminal settlement, exactly one successor initializes as generation
  `g + 1`.
- Dispose to Absent and reopen, and Absent maintenance then reopen, allocate a
  strictly greater generation from the retained DirectorySlot. No same-
  incarnation ABA is possible.
- A bound callback and disposer from generation `g` cannot invalidate or evict
  generation `g + 1`.
- A released g callback cannot call `Instance.provide`/`reload`/lifecycle APIs
  to mint authority for g + 1; its body is rejected before owner-map mutation.
- An Effect bridge created under a live `g` lease can acquire normal state while
  that token is live during Closing; the same bridge and an ALS-bound callback
  both fail closed after release. Supplying only `InstanceRef`, or pairing it
  with another target's token, never passes Closing admission.
- `InstanceState` lookup/invalidation for `g` never returns or closes state for
  `g + 1`.
- Under acquisition contention, a pre-waterline synchronous admission settles
  and is then invalidated, while a post-waterline admission never enters
  `ScopedCache`; synchronous `Bus.subscribe` cache hits remain synchronous.
- Every async producer found by the lifecycle audit is owned by a lease, runner,
  scoped state, or joined disposer receipt; no untracked producer survives the
  successful terminal receipt.
- Nested owners retain and validate every ancestor. A transferred body/channel/
  producer is dormant while its explicit handoff owner is live, rejects entry
  from any captured live ancestor, exposes no readiness/settlement waitable
  capability, and becomes an independent root only after its parent's
  synchronous release-and-arm transition, and
  settles without starting if closed before that handoff. Pending entry throws
  synchronously and produces no Promise; armed entry returns only the tracked
  callback Promise. `runSync(async ...)` fails typecheck; an untyped thenable is
  adopted into the private drain before the misuse error, so no continuation
  escapes settlement. Normal completion and cancellation are idempotent
  first-wins transitions.
- A private `onArmed` continuation is counted in the child drain in the same
  transition that arms it. Close-before-arm prevents it; close-after-arm joins
  it; throw/rejection closes the child and cannot run after terminal settlement.
- Opaque owner handles expose no token, execution, context, stack, receipt, or
  general restore capability. Only the exact capture functions can create a
  WeakMap-provenanced execution, only the directory owner/state registrar can
  create a root, and current/cross-target leases append the complete ambient
  stack. Module-private provenance, reviewed import searches, and focused
  negative tests cover AdmissionRef export/provision, execution
  reconstruction/casts, and raw capture/restore/root imports outside the exact
  infrastructure sites; the internal sync and Effect entries cannot create an
  untracked async continuation.
- The explicit same-target handoff release seals transfer registration and
  atomically arms or closes the complete ledger-owned child set. A transfer
  racing that seal or the target producer seal is either in the set or rejected
  before publication; request and non-HTTP handoff owners obey the same rule and
  no child remains pending.
- Current and child GenerationLeases require an explicit discriminated release
  outcome. Sync throw or async rejection closes every pending child without
  running it; an attempted successful release while `enter` is unsettled fails
  before mutation, and settled success alone arms children.
- Existing actor/inbox/workflow/tool fibers that outlive their raw-provider
  caller use the Task 2 transferred producer wrapper with an explicit short
  same-target handoff lease. Cross-target A-to-B work arms from a B lease while
  A remains live, does not retain A as a readiness dependency, and is
  canceled/joined only by B generation retirement.
- A state cache first initialized under the retirement owner registers an
  immediately armed directory-owned scope root; its finalizer settles before
  the retirement owner and cannot inherit that owner as a readiness barrier.
- Every settled lifecycle API rejects before side effects when invoked from any
  owner in its transitive wait set, including boot, body, runner, producer,
  channel, state scope, disposer, or maintenance—not only an active request.
- The final manual inventory refresh and source review find no legacy
  Promise-returning
  `Instance.disposeAll`/`disposeDirectory` facade or caller. Only the exact
  test-only lifecycle fixture may import test cleanup joins.

### Run-state settlement

- Dispose acceptance does not wait for an intentionally held interrupt cleanup.
- A real streaming Response registers and arms its transferred body handle from
  a short same-target handoff before middleware returns; the middleware request
  lease may still be live and does not arm it. Retirement actively cancels an
  unconsumed/backpressured body and joins terminal acknowledgement before
  normal/late disposal. A held `prompt_async` catch/finally receipt has the same
  rule.
- A detached async runner with no active HTTP lease still blocks normal disposal
  through its retire receipt.
- A start admitted before the retirement lock is observably Starting or Running
  in the snapshot; retirement can close a held Starting gate before fiber
  creation. A start attempted after the lock is rejected. No Idle snapshot can
  be followed by old-generation work.
- Hold run 1 in `Settling(runID)` and attempt run 2 before old `onIdle` returns.
  Run 2 waits/retries, old cleanup cannot delete its map entry, and retirement
  snapshots/cancels whichever exact run wins admission.
- Same-directory intake stays closed while that cleanup is held.
- Releasing cleanup completes the retirement, then allows replacement boot.
- Main retirement may publish idle; subagent retirement cannot write
  session-level status.
- A checkpoint actor outcome does not release its generation receipt until the
  watermark/metrics/pending-queue watcher has fully settled.

### HTTP/events

- Dispose returns `200 true` accepted.
- While retirement is held, same-directory `/path` returns 503 with
  `instance_closing`, canonical incarnation/directory/generation headers plus
  generation body, and `Retry-After: 1`.
- Other directories and global routes still return normally.
- One disposed event containing `(incarnation, directory, generation)` appears
  only after release and never before.
- A late-phase gate suppresses the event; after terminal CAS, a throwing
  GlobalBus listener is logged but cannot block successor boot, other listeners,
  or the single event attempt. The local instance Bus emits no duplicate.
- TUI sync coalesces closing retries per selection, decodes SDK
  `{error,response}` before project/workspace store mutation, groups a bootstrap
  cohort by canonical directory, and requires one incarnation/generation per
  directory plus one epoch before atomic commit. It maintains selection- and
  incarnation-scoped committed, highest-observed, and retired waterlines and treats
  `instance_retirement_failed` as terminal. Workspace responses use the inner
  target. An unseen higher-generation ordinary event cannot mutate the current
  store; a delayed disposed(g) still retires the committed g and triggers one
  cohort. `fullSyncedSessions` is keyed/invalidated by epoch and exact lifecycle
  target. All instance event envelopes carry incarnation/generation; delayed g
  or old-incarnation events/responses cannot overwrite accepted new data.
- Delayed app-level `--continue --fork` and `--session --fork` responses cannot
  navigate or toast after a selection switch. Orchestrator entry cannot resume
  an old source phase to replace a newer selection, and after its own switch its
  target phase cannot write the root ID or navigate after another switch. Direct
  entry from the orchestrator selection creates no successor or self-wait.
- A held interactive Bash child is aborted and joined on selection replacement;
  its retry/reply stays bound to the captured source and cannot reach the new
  selection. TUI host exit waits the same receipt before renderer destruction
  and worker shutdown handoff, and admits no late renderer or toast work.
- A pending `/tui/control/next` is actively closed by retire/shutdown and cannot
  hold the active-lease barrier; another directory or generation cannot consume
  its queue item. A blocked SSE write is actively aborted and joined.

### Worktree/shutdown

- Worktree removal does not delete files while retirement is held.
- After retirement phases but before Git/filesystem deletion, maintenance still
  rejects provide and suppresses the terminal event; failure remains fail-closed.
- A caller timeout returns an error but leaves the barrier and worktree intact.
- `disposeAll` revokes queued successors, blocks new intake only for the drain,
  and remains reusable after successful settlement.
- Concurrent `disposeAll` calls share one receipt. Whether shutdown wins before
  successor commit or observes the committed next generation, it returns only
  after no open entry or queued successor remains.
- If shutdown wins while Terminal listeners are running, it changes the
  successor outcome before final slot CAS and successor init remains zero.
- `disposeAll` invoked from any target owner in its wait set rejects before
  installing its global gate or changing any entry.
- TUI, `serve`, ACP, and compiled Web shutdown close intake and real
  global/instance SSE/WebSocket/long-poll streams,
  retires instance and body channels before waiting finite leases, awaits remaining
  request/instance settlement, then force-closes transport once. The
  TUI host waits for `shutdown-complete`; a long-lived or blocked-write global
  SSE cannot hang any frontend.
- A rejecting disposer marks shutdown unclean and is reported only after the
  shared coordinator's `finally` force-closes transport and closes logs once.
- A second TUI `rpc.server` request is rejected without replacing or force-
  closing the live listener. Public plugin adaptor failure cannot run internal
  finalize; success orders external remove before finalize.
- Removing the two workflow-test drain workarounds does not reintroduce the
  60-second cancel-cascade hang across three consecutive focused runs.

## Parked Experiment Disposition

The current dirty worktree is evidence, not an implementation branch:

- preserve the untracked test's Deferred gate and “dispose acceptance is fast”
  intent when writing RED tests;
- restore/rewrite the `run-state.ts` production diff rather than carrying its
  naked detached close and early `runners.clear()`;
- keep the two explicit workflow drains until generation retirement passes its
  full matrix; and
- remove those drains and repair the stale comments in a final separate commit.

No file in the parked worktree is overwritten or discarded while this design is
under review.

## Non-Goals

- Automatically retrying a failed disposer and reopening the directory.
- Allowing overlapping generations because a response deadline elapsed.
- Reusing actor-level detached cancellation as an instance retirement receipt.
- Changing checkpoint, MaxMode, overflow, permission, or fork-context semantics.
- Enabling any upstream LLM-server capability rejected by FD-004.
