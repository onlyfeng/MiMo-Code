import { isTurnCancelled } from "../session/turn-cancellation"
import * as RunApproval from "@/session/run-approval"
import { Effect, Deferred, Context, Fiber, Layer, Scope, Cause, Exit, Schedule } from "effect"
import type { SessionID, MessageID } from "@/session/schema"
import type { ProviderID, ModelID } from "@/provider/schema"
import type { Tool as AITool, ModelMessage } from "ai"
import { Session } from "@/session"
import { SessionPrompt } from "@/session/prompt"
import { SessionRunState } from "@/session/run-state"
import { isRunDisposing, RunDisposal, type RunDisposalState } from "@/session/run-disposal"
import { ActorRegistry } from "@/actor/registry"
import { createActorLifecycle, type ForkGenerationOwner, type WakeGenerationOwner, type TerminalStatus } from "@/actor/lifecycle"
import { TaskRegistry } from "@/task/registry"
import type { TaskID } from "@/task/schema"
import { TaskGate, MAX_TASK_GATE_SUBAGENT_REACT } from "@/task/gate"
import { Agent } from "@/agent/agent"
import { Permission } from "@/permission"
import type { Actor, SpawnMode, ContextMode, ToolWhitelist, Lifecycle } from "@/actor/schema"
import { deriveLiveness } from "@/actor/schema"
import * as ActorEvents from "@/actor/events"
import { runTurn } from "@/actor/turn"
import { spawnRef } from "@/actor/spawn-ref"
import { SYSTEM_SPAWNED_AGENT_TYPES } from "@/agent/config"
import { Bus } from "@/bus"
import { TuiEvent } from "@/cli/cmd/tui/event"
import { MessageV2 } from "@/session/message-v2"
import { SessionRetry } from "@/session/retry"
import { Inbox } from "@/inbox"
import { renderActorNotification } from "@/inbox/render"
import { Plugin, HookEvent } from "@/plugin"
import { parseReturnHeader, type ReturnStatus } from "./return-header"
import { assistantFinalText, sessionErrorText } from "@/session/trajectory"
import { Log } from "@/util"
import { NotFoundError } from "@/storage"
import { Instance, type InstanceContext } from "@/project/instance"
import { InstanceState } from "@/effect"
import { InstanceRef } from "@/effect/instance-ref"
import { WakeSourceDisposal } from "@/inbox/wake-source"

const log = Log.create({ service: "actor.spawn" })

/**
 * Cap on preStop ReAct re-entries per spawn — prevents infinite loops.
 * TODO: lift to mimocode.json config (e.g. actor.maxPreReact) and add per-hook
 * `maxContinue` clamp at registration. Plan: platform cap = hard ceiling, hook
 * cap may only narrow, never widen. See spec Future work.
 */
export const MAX_PRE_REACT = 3
/** Cap on postStop ReAct re-entries per spawn. See MAX_PRE_REACT TODO. */
export const MAX_POST_REACT = 3
/**
 * T40 stall watchdog scan cadence. Well inside the DEFAULT_LIVENESS_STALL_MS (6m)
 * window and just under the registry's own 60s stuck-scan, so a genuinely stalled
 * child is caught within one scan of flipping to `stalled` without hammering the
 * DB.
 */
export const WATCHDOG_SCAN_INTERVAL_MS = 45_000
const RETURN_FORMAT_INSTRUCTION = `

---

## Return format (required)

Your FINAL assistant message — what the spawning agent will receive — MUST start with this header block:

  **Status**: success | partial | failed | blocked
  **Summary**: <one sentence describing what happened>

After the header, include the actual deliverable (whatever the task asked for in its prompt).

If applicable, also include below the deliverable:

  **Files touched**: <comma-separated paths or "(none)">
  **Findings worth promoting**: <bullet list of cross-task transferable facts; "(none)" if just routine work>

This format lets the spawning agent and the checkpoint writer extract your progress without parsing free-form prose. Do NOT precede the header with an introduction — your final message must start with "**Status**:".
`

export interface ForkContext {
  /** Produced by the same resolved model that captured system/tools. */
  readonly modelIdentity?: string
  readonly system: string[]
  /** Parent turn context frozen at capture time and replayed instead of child live context. */
  readonly turnContext: string | undefined
  /**
   * Ordered parent-captured builtin and MCP schema pool at the watermark.
   * With MCP Tool Search this includes the parent's then-searchable MCP pool;
   * `loadedMcpTools` records which members were active. The fork runLoop uses
   * this as its immutable allowset and schema source, while exposing only the
   * active intersection and rebinding matching live tools for execution.
   * Missing live implementations fail closed. Request-local StructuredOutput
   * is appended separately when the fork asks for JSON.
   */
  readonly tools: Record<string, AITool>
  /** Frozen wire membership, separate from the executable pool; legacy captures omit it. */
  readonly activeTools?: readonly string[]
  /**
   * MCP members that were search-loaded in the parent request. Kept separate
   * from `tools` so the fork can restore discovery state without treating every
   * frozen MCP schema as implicitly loaded.
   */
  readonly loadedMcpTools?: readonly string[]
  /**
   * Parent agent's permission ruleset, captured at spawn. The fork evaluates
   * permissions and filters its LLM-visible tool list against THIS (the parent's)
   * ruleset rather than the checkpoint-writer agent's own — restoring prompt-cache
   * tool-visibility parity with the parent and keeping permission semantics
   * consistent with the captor. Memory-tree writes are still governed by
   * memory-path-guard (see askEditUnlessMemory), so an inherited `edit:deny`
   * does not block the writer's own checkpoint files.
   */
  readonly parentPermission: Permission.Ruleset
  readonly inheritedMessages: ModelMessage[]
  /**
   * Boundary marker — the last main-slice message id at spawn. This is a
   * documentary anchor for the frozen parent snapshot; fork messages live in a
   * separate child session and are selected by agent_id, never by comparing
   * their caller-supplied IDs to this parent ID. NEVER use this for slicing
   * inheritedMessages — inheritedMessages is captured as a complete snapshot
   * at spawn time.
   * See docs/superpowers/specs/2026-05-26-fork-agent-prefix-cache-design.md
   */
  readonly watermarkMsgID: MessageID
  readonly model: { providerID: ProviderID; modelID: ModelID }
}

type NotificationTarget = {
  readonly instance: InstanceContext
  readonly disposal: RunDisposalState
}

const withNotificationTarget = <A, E, R>(
  target: NotificationTarget,
  effect: Effect.Effect<A, E, R>,
  source?: RunDisposalState,
): Effect.Effect<A | undefined, E, R> =>
  Effect.suspend(() =>
    isRunDisposing(target.disposal) || (source && isRunDisposing(source))
      ? Effect.succeed(undefined)
      : effect.pipe(
          Effect.provideService(InstanceRef, target.instance),
          Effect.provideService(RunDisposal, target.disposal),
        ),
  )

export type AgentOutcome =
  | {
      status: "success"
      finalText?: string
      // Structured-output (json_schema) result — when the spawn requested a
      // format, the validated object is surfaced here and takes precedence over
      // finalText (DW spec P3).
      structured?: unknown
      // Subagent's self-reported header status (parsed from finalText), possibly
      // overridden by the completion gate (DB truth wins — see onSuccess).
      reportedStatus?: ReturnStatus
      reportedSummary?: string
      // Task IDs the subagent left non-terminal after the gate's cap. Present
      // only when reportedStatus was downgraded to "partial"/"blocked".
      incompleteTasks?: string[]
      // Non-fatal hook/gate failures surfaced to the caller instead of being
      // swallowed (upstream: "surface hook warnings").
      warnings?: string[]
    }
  | { status: "failure"; error: string; failure?: FailureInfo; finalText?: string; structured?: unknown }
  | { status: "cancelled" }

/**
 * Coarse, provider-agnostic category of a settled failure. Deliberately small:
 * a consumer needs to answer "will this recur identically?", not to know which
 * provider spelled which body which way. The provider-specific taxonomy has
 * already been collapsed upstream by MessageV2.fromError, which runs
 * ProviderError.parseAPICallError / isOverflow / isOpenAiErrorRetryable.
 */
export type FailureKind = "transient" | "overflow" | "auth" | "aborted" | "other"

/**
 * Classification carried on a `failure` outcome so a consumer can branch without
 * string-matching `error`.
 *
 * PRESENT only when the failure came from a settled assistant error — i.e. the
 * child's turn ran and persisted a normalized named error. ABSENT when the work
 * fiber failed some other way (a defect during teardown, or a hand-built outcome
 * such as checkpoint's "timeout"): there is no provider taxonomy to report and
 * asserting one would be a lie. Read it with truthiness / `== null`, never
 * `=== undefined` (AGENTS.md, "Reading a nullable column").
 *
 * `retryable` means "belonged to the retryable class", NOT "please retry". The
 * child's LLM calls already run through SessionRetry's ladder (session/retry.ts,
 * consumed by session/llm.ts and session/processor.ts), so any failure reaching
 * a consumer is ALREADY post-retry.
 */
export interface FailureInfo {
  readonly kind: FailureKind
  readonly retryable: boolean
  /** The persisted NamedError name, e.g. "APIError" / "ContextOverflowError". */
  readonly name: string
}

/**
 * Classify a settled assistant error where the typed error still exists.
 *
 * Reuses SessionRetry.retryable as the retryability oracle rather than adding a
 * taxonomy: its input type IS this data shape (`Err` === `NamedError.toObject()`)
 * and it already folds in isRetryableTransientError plus every 429 / 5xx / quota
 * special case. `kind` is then read off the named-error identity, which is what
 * MessageV2.fromError derived from ProviderError.parseAPICallError.
 */
function classifyAssistantError(err: SessionRetry.Err): FailureInfo {
  // Truthiness, not `!== undefined`: retryable() returns a status *message*, and
  // an empty one is not a usable retry signal.
  const retryable = !!SessionRetry.retryable(err)
  // 401/403 read off the statusCode ProviderError.parseAPICallError already
  // extracted — not a new taxonomy and not a re-parse of prose. MessageV2.AuthError
  // ("ProviderAuthError") only covers a MISSING key (LoadAPIKeyError); a rejected
  // one arrives as an APIError, and both are the same thing to a consumer.
  const status = MessageV2.APIError.isInstance(err) ? err.data.statusCode : undefined
  const kind: FailureKind = MessageV2.ContextOverflowError.isInstance(err)
    ? "overflow"
    : MessageV2.AuthError.isInstance(err) || status === 401 || status === 403
      ? "auth"
      : MessageV2.AbortedError.isInstance(err)
        ? "aborted"
        : retryable
          ? "transient"
          : "other"
  return { kind, retryable, name: err.name }
}

/**
 * Raised by runAgentLoop when the child's turn settled with an assistant error.
 * Exists solely to carry the classification across the Effect failure channel to
 * forkWork's onFailure — that is the only place AgentOutcome is built, and the
 * typed error is not reachable from there. Deliberately a plain Error subclass:
 * Cause.pretty renders it byte-identically to `new Error(message)`, so the human
 * `error` string is unchanged.
 */
class AssistantSettledError extends Error {
  constructor(
    message: string,
    readonly failure: FailureInfo,
  ) {
    super(message)
  }
}

export interface SpawnInput {
  runApproval?: RunApproval.Scope
  mode: SpawnMode
  sessionID: SessionID
  /**
   * Parent session id when the actor runs in a child session (Axis A: checkpoint
   * writer spawns under a child session keyed on parent_id but writes to the
   * parent's checkpoint.md / memory.md). Hooks (actor.preStop / actor.postStop)
   * receive this so plugins re-deriving paths from sessionID can fall back to
   * `parentSessionID ?? sessionID` and reach the parent's artifacts.
   *
   * Defaults to `sessionID` inside spawnSubagent when omitted, so existing
   * callers (peer / dream / distill / regular subagents where parent ===
   * session) need no change.
   */
  parentSessionID?: SessionID
  agentType: string
  task: string
  description?: string
  context: ContextMode
  tools: ToolWhitelist
  model?: { providerID: ProviderID; modelID: ModelID }
  background: boolean
  // ActorTool owns foreground waiting and cancellation after admission. Other
  // callers retain the existing foreground join unless they explicitly opt out.
  awaitCompletion?: boolean
  // Synchronous ownership transfer before admission can return successfully.
  // Carries the exact generation's cleanup across the caller's yield boundary.
  onAdmitted?: (result: SpawnResult) => void
  parentActorID?: string
  task_id?: string // Spec ②: bound user-task ID for postStop progress.md validation
  // Peer-only: directory the child session runs in. When set, the child's work
  // fiber is bound to that directory's Instance (via InstanceRef) so all its
  // file tools / write boundary resolve against it — i.e. real isolation. A
  // worktree is just such a directory; whether to CREATE one is the caller's
  // policy (the session tool creates a worktree and passes its dir here). When
  // unset, the child shares the spawner's directory.
  cwd?: string
  // Peer-only deletion provenance. SessionTool supplies this only when it
  // created the cwd via `session create --isolate`; spawnPeer persists it before
  // publishing/registering the child so cancellation never infers ownership.
  worktreeOwnership?: { directory: string; branch: string }
  forkContext?: ForkContext // NEW
  lifecycle?: Lifecycle
  /**
   * Optional structured-output format. When set to a json_schema format, the
   * child's SessionPrompt.prompt requests structured output: the runLoop injects
   * the StructuredOutput tool, forces toolChoice=required, and the validated
   * object flows back via message.structured (see runAgentLoop). The validated
   * object is surfaced on AgentOutcome.structured.
   */
  format?: MessageV2.OutputFormat
  /**
   * Fired SYNCHRONOUSLY with the freshly-allocated actorID inside the spawn
   * Effect. Peers fire immediately after their child session is created so the
   * caller can roll it back if later setup fails; subagents fire after registry
   * registration and before their work fiber detaches. Best-effort: a throw is
   * swallowed so a buggy callback can't fail the spawn.
   */
  onActorID?: (actorID: string) => void
  /**
   * Fired as an Effect BEFORE Fiber.join (for non-background spawns). Lets the
   * caller emit metadata (sessionId/actorId) to the tool part state while the
   * tool is still "running" — critical for the TUI to navigate into a running
   * subagent. The callback receives the allocated actorID and sessionID.
   * Swallowed on failure (best-effort, same as onActorID).
   */
  onReady?: (info: { actorID: string; sessionID: SessionID }) => Effect.Effect<void>
}

export interface SpawnResult {
  actorID: string
  sessionID: SessionID
  outcome: Deferred.Deferred<AgentOutcome>
  // Internal admission ownership: cancel only this generation and join its
  // complete work fiber, including hooks outside the session runner.
  cancel?: Effect.Effect<void>
}

export interface Interface {
  readonly spawn: (input: SpawnInput) => Effect.Effect<SpawnResult>
  readonly recovery?: (input: {
    sessionID: SessionID
    actorID: string
  }) => Effect.Effect<SessionPrompt.RecoveryCandidate[], InstanceType<typeof NotFoundError>>
  readonly resume?: (input: {
    sessionID: SessionID
    actorID: string
    assistantMessageID?: MessageID
    task_id?: TaskID
    signal?: AbortSignal
  }) => Effect.Effect<Effect.Effect<MessageV2.WithParts>, InstanceType<typeof NotFoundError> | Session.BusyError | Session.RecoveryConflictError>
  readonly cancel: (sessionID: SessionID, actorID: string, mode: "graceful" | "forced") => Effect.Effect<void>
  readonly getForkContext: (sessionID: SessionID, actorID: string) => Effect.Effect<ForkContext | undefined>
  readonly runPersistentTurn?: (input: {
    sessionID: SessionID
    actorID: string
    work: Effect.Effect<MessageV2.WithParts>
    onInterrupt: Effect.Effect<MessageV2.WithParts>
    notifyParentOnComplete: boolean
    inboxID?: string
  }) => Effect.Effect<MessageV2.WithParts>
  /**
   * Run ONE stall-watchdog scan pass synchronously (the same body the background
   * fiber repeats every WATCHDOG_SCAN_INTERVAL_MS). Exposed for deterministic
   * tests that can't wait a real scan interval — it shares the same `notified`
   * debounce set as the fiber, so driving it repeatedly exercises the real
   * one-shot / re-arm semantics without touching wall-clock scheduling.
   * Optional so lightweight test mocks of this Service need not implement it.
   */
  readonly scanStalledOnce?: () => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Actor") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const session = yield* Session.Service
    const actorReg = yield* ActorRegistry.Service
    const agents = yield* Agent.Service
    const sessionPrompt = yield* SessionPrompt.Service
    const inbox = yield* Inbox.Service
    const state = yield* SessionRunState.Service
    const plugin = yield* Plugin.Service
    const bus = yield* Bus.Service
    const taskRegistry = yield* TaskRegistry.Service
    const scope = yield* Scope.Scope

    const layerNotificationTargets = new Map<string, NotificationTarget>()
    const rememberNotificationTarget = (target: NotificationTarget) => {
      if (isRunDisposing(target.disposal)) return false
      const existing = layerNotificationTargets.get(target.instance.directory)
      if (existing && !isRunDisposing(existing.disposal) && existing.instance !== target.instance) return false
      layerNotificationTargets.set(target.instance.directory, target)
      return true
    }
    yield* state
      .withRunDisposal(
        Effect.gen(function* () {
          const disposal = yield* RunDisposal
          if (!disposal.instance) return
          rememberNotificationTarget({ instance: disposal.instance, disposal })
        }),
      )
      .pipe(Effect.ignoreCause)

    const captureNotificationTarget = (instance: InstanceContext) =>
      state
        .withRunDisposal(
          Effect.gen(function* () {
            const disposal = yield* RunDisposal
            const target = { instance, disposal }
            if (rememberNotificationTarget(target)) return target
            const existing = layerNotificationTargets.get(instance.directory)
            if (existing && !isRunDisposing(existing.disposal)) return existing
            return undefined
          }),
        )
        .pipe(
          Effect.provideService(InstanceRef, instance),
          Effect.provideService(RunDisposal, { disposing: false }),
          Effect.exit,
          Effect.map((exit) => (Exit.isSuccess(exit) ? exit.value : undefined)),
        )

    type FrozenContext = {
      context: ForkContext
      instance: InstanceContext
      disposal: RunDisposalState
      taskSessionID: SessionID
    }
    const lifecycleState = createActorLifecycle<MessageV2.WithParts, FrozenContext, NotificationTarget>()
    const retainForkContext = (
      key: string,
      context: ForkContext,
      taskSessionID: SessionID,
      receiver?: InstanceContext,
    ) => {
      const capture = state.withRunDisposal(
        Effect.gen(function* () {
          const instance = yield* InstanceState.context
          const disposal = yield* RunDisposal
          yield* lifecycleState.setForkContext(key, { context, instance, disposal, taskSessionID })
        }),
      )
      return receiver ? capture.pipe(Effect.provideService(InstanceRef, receiver)) : capture
    }
    const actorKey = lifecycleState.key
    const isCancelled = (sessionID: SessionID, actorID: string) =>
      lifecycleState.isCancelled(actorKey(sessionID, actorID))

    // Real agent loop: marks the actor running, then drives a SessionPrompt.prompt
    // turn. The user message persisted by SessionPrompt carries the actor's
    // agentID, which the projector writes to MessageTable.agent_id — that is the
    // load-bearing piece this primitive exists for.
    //
    // Returns the assistant's final text (if any) so forkWork's onSuccess can
    // pass it to inbox.send (notification body) and into the success Deferred.
    const runAgentLoop = Effect.fn("Actor.runAgentLoop")(function* (input: {
      sessionID: SessionID
      actorID: string
      agentType: string
      task: string
      task_id?: string
      model?: { providerID: ProviderID; modelID: ModelID }
      source: "spawn" | "hook"
      provenance?: MessageV2.Provenance
      format?: MessageV2.OutputFormat
    }) {
      const result = yield* sessionPrompt.prompt({
        sessionID: input.sessionID,
        agent: input.agentType,
        agentID: input.actorID,
        source: input.source,
        provenance: input.provenance,
        model: input.model,
        task_id: input.task_id,
        parts: [{ type: "text", text: input.task }],
        ...(input.format ? { format: input.format } : {}),
      })
      // structured output (json_schema) takes precedence over finalText: when the
      // child produced a validated object it IS the authoritative result and the
      // last text part (often a pre-tool-call preamble) is dropped to avoid
      // duplicating the result downstream. See spec §5.2.
      const info = (result as MessageV2.WithParts | undefined)?.info
      if (info?.role === "assistant" && info.error) {
        // Classify HERE: `info.error` is the persisted, already-normalized named
        // error. Downstream (forkWork's onFailure) only has Cause.pretty's string,
        // so re-deriving the class there would mean re-parsing prose.
        return yield* Effect.fail(
          new AssistantSettledError(
            `Actor assistant failed: ${info.error.name}: ${sessionErrorText(info.error) ?? "actor session failed"}`,
            classifyAssistantError(info.error),
          ),
        )
      }
      const structured = info?.role === "assistant" ? info.structured : undefined
      const finalText =
        structured !== undefined
          ? undefined
          : (result as MessageV2.WithParts | undefined)?.parts.findLast(
              (p): p is Extract<MessageV2.Part, { type: "text" }> => p.type === "text",
            )?.text
      return { finalText, structured, message: result as MessageV2.WithParts | undefined }
    })

    const forkWork = (input: {
      runApproval?: RunApproval.Scope
      sessionID: SessionID
      parentSessionID: SessionID
      parentActorID?: string
      actorID: string
      agentType: string
      task: string
      description?: string
      background: boolean
      model?: { providerID: ProviderID; modelID: ModelID }
      lifecycle: "ephemeral" | "persistent"
      generation: ForkGenerationOwner
      task_id?: string
      // True for non-specialized subagents (those that received
      // RETURN_FORMAT_INSTRUCTION). Only these are subject to the completion
      // gate; specialized/system agents and peers create no user tasks.
      gateEligible?: boolean
      format?: MessageV2.OutputFormat
      // When set, the child's work fiber runs under this InstanceContext (via
      // InstanceRef) instead of inheriting the spawner's. Used by peers placed
      // in their own git worktree so their tools resolve paths/write-boundary
      // against the worktree, not the orchestrator's directory.
      instanceRef?: InstanceContext
    }) =>
      Effect.gen(function* () {
        const parentDisposal = yield* RunDisposal
        const key = actorKey(input.sessionID, input.actorID)
        const outcome = yield* Deferred.make<AgentOutcome>()
        const description = input.description ?? input.agentType
        const parentInstance = parentDisposal.instance ?? (yield* InstanceState.context)
        const notificationTarget = { instance: parentInstance, disposal: parentDisposal }
        if (rememberNotificationTarget(notificationTarget))
          yield* lifecycleState.setNotificationTarget(key, notificationTarget)
        // Auto-start the bound task: spawning an actor for a task IS that task
        // beginning work. Status transition is a structural side-effect of spawn,
        // not a model action (the model maintains task status unreliably).
        // `done` stays gate/model-driven. Uses parentSessionID because the task
        // lives in the parent/main session, not a peer's child session.
        // ignoreCause (not ignore): TaskRegistry.start raises a missing task_id as
        // a *defect* (Effect.die), which Effect.ignore does NOT swallow — only
        // ignoreCause does. A stale/missing task_id must never block the spawn,
        // but log on swallow so a genuine bug in start() leaves a breadcrumb.
        if (input.task_id) {
          yield* taskRegistry
            .start({ session_id: input.parentSessionID, id: input.task_id, owner: input.actorID })
            .pipe(Effect.ignoreCause({ log: "Warn", message: `auto-start of task ${input.task_id} failed` }))
        }
        const notify = (
          status: TerminalStatus,
          extra: { result?: string; error?: string; reportedStatus?: ReturnStatus; reportedSummary?: string },
        ) =>
          Effect.gen(function* () {
            const source = yield* RunDisposal
            if (isRunDisposing(source)) return
            if (!input.background || input.agentType === "checkpoint-writer") return
            yield* withNotificationTarget(
              notificationTarget,
              Effect.all(
                [
                  inbox
                    .send({
                      receiverSessionID: input.parentSessionID,
                      receiverActorID: input.parentActorID ?? "main",
                      senderSessionID: input.sessionID,
                      senderActorID: input.actorID,
                      type: "actor_notification",
                      content: renderActorNotification({
                        actorID: input.actorID,
                        description,
                        status,
                        ...extra,
                      }),
                    })
                    .pipe(
                      (effect) => withNotificationTarget(notificationTarget, effect, source),
                      Effect.ignoreCause({ log: "Warn", message: "actor inbox notification failed" }),
                    ),
                  bus
                    .publish(TuiEvent.ToastShow, {
                      message: `Child "${description}" ${status}`,
                      variant: status === "completed" ? "success" : status === "cancelled" ? "info" : "error",
                    })
                    .pipe(
                      (effect) => withNotificationTarget(notificationTarget, effect, source),
                      Effect.ignoreCause({ log: "Warn", message: "actor toast notification failed" }),
                    ),
                ],
                { concurrency: "unbounded", discard: true },
              ),
            )
          })
        // Delivery carriers, shared by the success and failure terminal writes.
        // A failed turn still publishes whatever it produced, so a later wait can
        // resolve it through result_message_id.
        let lastMessage: MessageV2.WithParts | undefined
        let lastResult: { finalText?: string; structured?: unknown } = {}
        const warnings: string[] = []
        // Persist the delivery on the final assistant message and return its id.
        // registry.updateStatus clears result_message_id on the running
        // transition, so a terminal write must supply a fresh one.
        const persistDelivery = (extra: {
          finalText?: string
          structured?: unknown
          reportedStatus?: ReturnStatus
          reportedSummary?: string
        }) =>
          Effect.gen(function* () {
            const final = lastMessage
            if (!final || final.info.role !== "assistant") return undefined
            if (extra.finalText === undefined && extra.structured === undefined) return undefined
            yield* session.updateMessage({
              ...final.info,
              actorResult: {
                ...(extra.finalText !== undefined ? { finalText: extra.finalText } : {}),
                ...(extra.structured !== undefined ? { structured: extra.structured } : {}),
                ...(extra.reportedStatus ? { reportedStatus: extra.reportedStatus } : {}),
                ...(extra.reportedSummary ? { reportedSummary: extra.reportedSummary } : {}),
                ...(warnings.length ? { warnings } : {}),
              },
            })
            return final.info.id
          }).pipe(
            Effect.catchCause((cause) =>
              Effect.logError(`actor delivery persistence failed: ${Cause.pretty(cause)}`).pipe(
                Effect.as(undefined),
              ),
            ),
          )

        const settleFailure = (cause: Cause.Cause<unknown>) =>
          Effect.gen(function* () {
            const cancelled = Cause.hasInterruptsOnly(cause)
            const error = Cause.pretty(cause)
            const status = cancelled ? ("cancelled" as const) : ("failed" as const)
            // Recover the classification runAgentLoop attached. Squash is the
            // established idiom here (see session/prompt.ts, tool/shell-wrap.ts).
            // A failure raised anywhere else carries none, and the field stays
            // absent rather than being guessed from `error`.
            const squashed = Cause.squash(cause)
            const failure = squashed instanceof AssistantSettledError ? squashed.failure : undefined
            const claimed = yield* lifecycleState.claimTerminal(
              key,
              input.generation,
              status,
              "turn",
              cancelled ? undefined : error,
            )
            if (!claimed) {
              yield* Deferred.await(input.generation.terminalDone)
              const terminal = input.generation.terminal
              yield* Deferred.succeed(
                outcome,
                terminal?.status === "cancelled"
                  ? { status: "cancelled" as const }
                  : { status: "failure" as const, error: terminal?.error ?? error },
              )
              return
            }
            yield* Effect.gen(function* () {
              const resultMessageID = cancelled ? undefined : yield* persistDelivery(lastResult)
              yield* actorReg
                .updateStatus(input.sessionID, input.actorID, {
                  status: "idle",
                  lastOutcome: cancelled ? "cancelled" : "failure",
                  lastError: cancelled ? undefined : error,
                  ...(resultMessageID ? { resultMessageID } : {}),
                })
                .pipe(Effect.ignoreCause)
              yield* notify(cancelled ? "cancelled" : "failed", cancelled ? {} : { error })
              yield* Deferred.succeed(
                outcome,
                cancelled
                  ? { status: "cancelled" as const }
                  : { status: "failure" as const, error, ...(failure ? { failure } : {}), ...lastResult },
              )
            }).pipe(Effect.ensuring(lifecycleState.settleTerminal(input.generation)))
          })

        // Derive actor mode from spawn shape: peer creates a new session, subagent shares parent's
        const actorMode: "peer" | "subagent" = input.parentSessionID === input.sessionID ? "subagent" : "peer"

        // Writability of THIS agent, derived from the same predicate the runtime uses to
        // strip the Write tool (llm.ts resolveTools → Permission.disabled). Read-only agents
        // (e.g. explore: "*":deny) → canWrite=false → postStop progress check is skipped for
        // them (they cannot satisfy a "write the journal" nudge; their findings return via
        // finalText). Agent-static: uses agentInfo.permission ONLY, not the session-merged
        // ruleset resolveTools builds (merge(agent, session)). So canWrite diverges from
        // runtime tool-stripping only under a session-level override — e.g. session "*":allow
        // un-stripping a read-only agent's write (we skip though runtime allows), or session
        // "*":deny on a writable agent (we nudge though runtime strips). Both are deliberately
        // ignored: not reachable in normal usage (mimo run sets no such rule, spawn doesn't
        // rewrite session.permission). See spec §Decision. Unknown agent → fail-open (true).
        const forkAgentInfo = yield* agents.get(input.agentType)
        const canWrite = forkAgentInfo ? !Permission.disabled(["write"], forkAgentInfo.permission).has("write") : true
        const runManagedTurn = <A, E>(turn: Effect.Effect<A, E>, markRunning = true) =>
          runTurn(input.sessionID, input.actorID, turn, {
            isCancelled: isCancelled(input.sessionID, input.actorID),
            finalize: false,
            markRunning,
          })

        const work = Effect.gen(function* () {
          let finalText: string | undefined
          let structured: unknown | undefined
          let iteration = 0
          let lastDecision:
            | { reason: string; contributingPluginNames: string[]; contributingHookIDs: string[] }
            | undefined

          while (true) {
            const reentryDecision = iteration > 0 ? lastDecision : undefined
            const turn = yield* runManagedTurn(
              runAgentLoop({
                ...input,
                task: reentryDecision ? reentryDecision.reason : input.task,
                source: reentryDecision ? "hook" : "spawn",
                provenance: reentryDecision
                  ? {
                      hookPhase: "pre",
                      hookIteration: iteration,
                      pluginNames: reentryDecision.contributingPluginNames,
                      hookIDs: reentryDecision.contributingHookIDs,
                    }
                  : undefined,
              }),
            )
            finalText = turn.finalText
            structured = turn.structured
            if (turn.message) lastMessage = turn.message
            lastResult = { finalText: turn.finalText, structured: turn.structured }

            iteration++
            if (iteration > MAX_PRE_REACT) {
              yield* bus.publish(HookEvent.ReActMaxReached, {
                phase: "pre",
                actorID: input.actorID,
                agentType: input.agentType,
              })
              log.warn("actor.preStop hit MAX_PRE_REACT cap; skipping further hook checks", {
                actorID: input.actorID,
                totalTurns: iteration,
              })
              break
            }

            const decision = yield* plugin.triggerActorPreStop({
              sessionID: input.sessionID,
              parentSessionID: input.parentSessionID,
              actorID: input.actorID,
              parentActorID: input.parentActorID,
              agentType: input.agentType,
              mode: actorMode,
              lifecycle: input.lifecycle,
              finalText,
              task: input.task,
              description: input.description,
              task_id: input.task_id,
              iteration: iteration - 1,
            })
            if (!decision.continue) break
            if (!decision.reason) break // defense-in-depth — T4 invariant guarantees this won't fire

            yield* bus.publish(HookEvent.ReActReentered, {
              phase: "pre",
              actorID: input.actorID,
              agentType: input.agentType,
              iteration,
              triggeredByPlugins: decision.contributingPluginNames,
              reasonPreview: decision.reason.slice(0, 200),
            })

            lastDecision = {
              reason: decision.reason,
              contributingPluginNames: decision.contributingPluginNames,
              contributingHookIDs: decision.contributingHookIDs,
            }
          }

          return { finalText, structured }
        }).pipe(
          Effect.provideService(ActorRegistry.Service, actorReg),
          Effect.matchCauseEffect({
            onSuccess: ({ finalText, structured }) =>
              Effect.gen(function* () {
                // Set when a completion-gate re-entry turn failed; the gate then
                // cannot vouch for a clean finish.
                let gateFailed = false
                // === COMPLETION GATE (B) + structured parse (A) ===
                // Delegates the list/decide step to TaskGate.decide.
                // We retain the runTurn re-entry + delivered-text update here
                // because that is gate-policy, not list-policy.
                let deliveredText = finalText
                if (input.gateEligible) {
                  let gateIter = 0
                  while (true) {
                    const decision = yield* TaskGate.decide({
                      session_id: input.parentSessionID,
                      owner: input.actorID,
                      reactCount: gateIter,
                      maxReact: MAX_TASK_GATE_SUBAGENT_REACT,
                    }).pipe(Effect.provideService(TaskRegistry.Service, taskRegistry))
                    if (!decision.needReentry) break
                    gateIter++
                    const gateTurn = yield* runManagedTurn(
                      runAgentLoop({
                        ...input,
                        task: decision.reentryText,
                        source: "hook",
                        provenance: { hookPhase: "post", hookIteration: gateIter, pluginNames: [], hookIDs: [] },
                      }),
                    ).pipe(
                      Effect.catch(() =>
                        Effect.gen(function* () {
                          log.error("actor.gate runTurn failed", { actorID: input.actorID })
                          warnings.push("completion gate: re-entry turn failed")
                          gateFailed = true
                          return {
                            finalText: undefined as string | undefined,
                            structured: undefined as unknown,
                            message: undefined as MessageV2.WithParts | undefined,
                          }
                        }),
                      ),
                      Effect.provideService(ActorRegistry.Service, actorReg),
                    )
                    // The gate re-run's re-emitted text updates the delivered body
                    // (and structured, if it produced one) so the reconciliation +
                    // delivery below see the latest turn.
                    if (gateTurn.finalText !== undefined) deliveredText = gateTurn.finalText
                    if (gateTurn.structured !== undefined) structured = gateTurn.structured
                  }
                }

                // Reconcile: DB truth wins over the model's self-reported header.
                // A gate that could not complete cannot confirm a clean finish, so
                // the turn may not stand as "success". It never overrides a more
                // severe status the child reported itself.
                const remaining = input.gateEligible
                  ? yield* taskRegistry
                      .list({ session_id: input.parentSessionID, owner: input.actorID, include_terminal: false })
                      .pipe(Effect.orElseSucceed(() => []))
                  : []
                const stillActionable = remaining.filter((t) => t.status === "open" || t.status === "in_progress")
                const downgrade: ReturnStatus | undefined =
                  stillActionable.length > 0 ? "partial" : remaining.length > 0 ? "blocked" : undefined
                const parsed = parseReturnHeader(deliveredText)
                const severity = { failed: 3, blocked: 2, partial: 1, success: 0 } as const
                const rank = (status: ReturnStatus | undefined) => (status ? severity[status] : -1)
                const gateFloor: ReturnStatus | undefined = gateFailed ? "partial" : undefined
                const reportedStatus = [downgrade ?? parsed.status, gateFloor].reduce<ReturnStatus | undefined>(
                  (worst, candidate) => (rank(candidate) > rank(worst) ? candidate : worst),
                  undefined,
                )
                const incompleteTasks = remaining.map((t) => t.id)
                const reconciledText =
                  downgrade && incompleteTasks.length > 0
                    ? `${deliveredText ?? ""}\n\n**Incomplete tasks**: ${incompleteTasks.join(", ")}`
                    : deliveredText

                // === DELIVERY ===
                // structured (json_schema result) takes precedence over text for the
                // notification body (DW spec P3 §5.2); otherwise deliver the gate's
                // reconciled text. The success outcome carries both the reconciled
                // text + completion-gate fields AND structured when present.
                const deliveryText =
                  structured !== undefined ? JSON.stringify(structured) : (reconciledText ?? "(no output)")
                const claimed = yield* lifecycleState.claimTerminal(key, input.generation, "completed", "turn")
                if (!claimed) {
                  yield* Deferred.await(input.generation.terminalDone)
                  const terminal = input.generation.terminal
                  yield* Deferred.succeed(
                    outcome,
                    terminal?.status === "cancelled"
                      ? { status: "cancelled" as const }
                      : terminal?.status === "failed"
                        ? { status: "failure" as const, error: terminal.error ?? "unknown" }
                        : {
                            status: "success" as const,
                            ...(reconciledText !== undefined ? { finalText: reconciledText } : {}),
                            ...(structured !== undefined ? { structured } : {}),
                            ...(warnings.length ? { warnings } : {}),
                          },
                  )
                  return
                }
                yield* Effect.gen(function* () {
                  const resultMessageID = yield* persistDelivery({
                    finalText: reconciledText,
                    structured,
                    reportedStatus,
                    reportedSummary: parsed.summary,
                  })
                  yield* actorReg
                    .updateStatus(input.sessionID, input.actorID, {
                      status: "idle",
                      lastOutcome: "success",
                      lastError: undefined,
                      ...(resultMessageID ? { resultMessageID } : {}),
                    })
                    .pipe(Effect.ignoreCause)
                  yield* lifecycleState.markDelivered(key, input.generation)
                  yield* notify("completed", {
                    result: deliveryText,
                    ...(reportedStatus ? { reportedStatus } : {}),
                    ...(parsed.summary ? { reportedSummary: parsed.summary } : {}),
                  })
                  yield* lifecycleState.settleTerminal(input.generation)
                  yield* Deferred.succeed(outcome, {
                    status: "success" as const,
                    ...(reconciledText !== undefined ? { finalText: reconciledText } : {}),
                    ...(structured !== undefined ? { structured } : {}),
                    ...(reportedStatus ? { reportedStatus } : {}),
                    ...(parsed.summary ? { reportedSummary: parsed.summary } : {}),
                    ...(incompleteTasks.length > 0 ? { incompleteTasks } : {}),
                    ...(warnings.length ? { warnings } : {}),
                  })
                }).pipe(Effect.ensuring(lifecycleState.settleTerminal(input.generation)))

                // === postStop ReAct loop ===
                // Caller has already resolved; new finalTexts are not propagated.
                // NOTE: parallel structure to preStop loop above — pre runs turn THEN checks,
                // post checks THEN runs turn. Both give 1 (delivery) + MAX_POST_REACT re-entries.
                let postIter = 0
                let lastFinalText = finalText
                let postReentry:
                  | { reason: string; contributingPluginNames: string[]; contributingHookIDs: string[] }
                  | undefined

                while (true) {
                  const decision = yield* plugin.triggerActorPostStop({
                    sessionID: input.sessionID,
                    parentSessionID: input.parentSessionID,
                    actorID: input.actorID,
                    parentActorID: input.parentActorID,
                    agentType: input.agentType,
                    mode: actorMode,
                    lifecycle: input.lifecycle,
                    finalText: lastFinalText,
                    task: input.task,
                    description: input.description,
                    task_id: input.task_id,
                    outcome: "success",
                    iteration: postIter,
                    canWrite,
                  })

                  if (!decision.continue) break
                  if (!decision.reason) break // defense-in-depth
                  if (postIter >= MAX_POST_REACT) {
                    yield* bus.publish(HookEvent.ReActMaxReached, {
                      phase: "post",
                      actorID: input.actorID,
                      agentType: input.agentType,
                    })
                    log.warn("actor.postStop hit MAX_POST_REACT cap; skipping further hook checks", {
                      actorID: input.actorID,
                      totalTurns: postIter + 1,
                    })
                    break
                  }
                  postIter++

                  yield* bus.publish(HookEvent.ReActReentered, {
                    phase: "post",
                    actorID: input.actorID,
                    agentType: input.agentType,
                    iteration: postIter,
                    triggeredByPlugins: decision.contributingPluginNames,
                    reasonPreview: decision.reason.slice(0, 200),
                  })

                  postReentry = {
                    reason: decision.reason,
                    contributingPluginNames: decision.contributingPluginNames,
                    contributingHookIDs: decision.contributingHookIDs,
                  }

                  // Run another turn (new finalText is not written back to outcome)
                  const newTurn = yield* runManagedTurn(
                    runAgentLoop({
                      ...input,
                      task: postReentry.reason,
                      source: "hook",
                      provenance: {
                        hookPhase: "post",
                        hookIteration: postIter,
                        pluginNames: postReentry.contributingPluginNames,
                        hookIDs: postReentry.contributingHookIDs,
                      },
                    }),
                    false,
                  ).pipe(
                    // postStop LLM failure: log + break loop, do NOT propagate
                    Effect.catch(() =>
                      Effect.gen(function* () {
                        log.error("actor.postStop runTurn failed", {
                          actorID: input.actorID,
                        })
                        warnings.push("postStop: re-entry turn failed")
                        return {
                          finalText: undefined as string | undefined,
                          structured: undefined as unknown,
                          message: undefined as MessageV2.WithParts | undefined,
                        }
                      }),
                    ),
                    Effect.provideService(ActorRegistry.Service, actorReg),
                  )

                  if (newTurn.finalText === undefined) break
                  lastFinalText = newTurn.finalText
                }
              }),
            onFailure: settleFailure,
          }),
          Effect.onExit((exit) => {
            if (Exit.isSuccess(exit)) return Effect.void
            return settleFailure(exit.cause)
          }),
          Effect.ensuring(lifecycleState.finishForkWork(key, input.generation, input.lifecycle)),
        )
        const correlatedWork = work.pipe(RunApproval.provide(input.runApproval))
        const boundWork = input.instanceRef ? correlatedWork.pipe(Effect.provideService(InstanceRef, input.instanceRef)) : correlatedWork
        // The child inherits this receiver-generation marker when forked, so a
        // terminal continuation that outlives disposal cannot re-arm the instance.
        const fork = Effect.gen(function* () {
          // No spawn-side ActorExecution claim: holding one across the whole
          // spawn (postStop included) can block a nested ActorTool spawn that
          // shares the key, and the only case that wanted that ordering is
          // quarantined. Continuations still serialize on their own claim.
          const fiber = yield* boundWork.pipe(Effect.interruptible, Effect.forkIn(scope))
          return { fiber, outcome }
        }).pipe(state.withRunDisposal)
        return yield* (input.instanceRef ? fork.pipe(Effect.provideService(InstanceRef, input.instanceRef)) : fork)
      })

    const abortSetup = (
      key: string,
      owner: ForkGenerationOwner,
      sessionID: SessionID,
      actorID: string,
      cause: Cause.Cause<unknown>,
    ) =>
      Effect.uninterruptible(
        Effect.gen(function* () {
          const error = Cause.pretty(cause)
          if (yield* lifecycleState.claimTerminal(key, owner, "failed", "turn", error)) {
            yield* actorReg
              .updateStatus(sessionID, actorID, {
                status: "idle",
                lastOutcome: "failure",
                lastError: error,
              })
              .pipe(Effect.ignoreCause)
          }
          yield* lifecycleState.settleTerminal(owner)
          yield* lifecycleState.finishFork(key, owner)
          yield* lifecycleState.retire(key)
        }),
      )

    const admit = (
      input: SpawnInput,
      sessionID: SessionID,
      actorID: string,
      lifecycle: Lifecycle,
      setup: (generation: ForkGenerationOwner) => Effect.Effect<{
        fiber: Fiber.Fiber<unknown, unknown>
        outcome: Deferred.Deferred<AgentOutcome>
      }>,
    ) => {
      const acquire = Effect.gen(function* () {
        const key = actorKey(sessionID, actorID)
        // Create lifecycle ownership inside the same masked admission that
        // registers the actor; interruption cannot strand a pre-acquire token.
        if (lifecycle === "persistent") yield* lifecycleState.retainPersistent(key)
        const generation = yield* lifecycleState.startFork(key)
        const work = yield* setup(generation).pipe(
          Effect.catchCause((cause) =>
            abortSetup(key, generation, sessionID, actorID, cause).pipe(Effect.andThen(Effect.failCause(cause))),
          ),
        )
        return { generation, ...work }
      })
      const cleanup = ({ generation, fiber, outcome }: Effect.Success<typeof acquire>) =>
        Effect.uninterruptible(
          // The fork may be interrupted before its first instruction installs
          // finishForkWork. Always settle this exact admission's generation
          // and outcome; an existing delivered result remains authoritative.
          Effect.all([cancel(sessionID, actorID, "forced", generation), Fiber.interrupt(fiber)], {
            concurrency: "unbounded",
            discard: true,
          }).pipe(
            Effect.ensuring(lifecycleState.finishFork(actorKey(sessionID, actorID), generation)),
            Effect.ensuring(Deferred.succeed(outcome, { status: "cancelled" }).pipe(Effect.asVoid)),
          ),
        )
      return Effect.acquireUseRelease(
        acquire,
        (resource) =>
          Effect.gen(function* () {
            if (input.mode === "subagent" && input.onReady) yield* Effect.ignore(input.onReady({ actorID, sessionID }))
            if (!input.background && input.awaitCompletion !== false) yield* Fiber.join(resource.fiber).pipe(Effect.ignore)
            const result = { actorID, sessionID, outcome: resource.outcome, cancel: cleanup(resource) }
            input.onAdmitted?.(result)
            return result
          }),
        (resource, exit) => (Exit.isFailure(exit) ? cleanup(resource) : Effect.void),
      )
    }

    const spawnPeer = Effect.fn("Actor.spawnPeer")(function* (input: SpawnInput) {
      // When the caller gives the child its own directory (e.g. a worktree the
      // session tool created), bind the child's work fiber to that directory's
      // Instance so its file tools / write boundary are isolated there. A
      // worktree is just a directory — spawn neither knows nor cares how it was
      // made. Best-effort: a bad/unresolvable dir falls back to the shared dir.
      const instanceRef = input.cwd
        ? yield* Effect.promise(() => Instance.provide({ directory: input.cwd!, fn: () => Instance.current })).pipe(
            Effect.catch(() => Effect.succeed(undefined)),
          )
        : undefined

      const child = yield* session.create({
        parentID: input.sessionID,
        contextFrom: input.context === "full" ? input.sessionID : undefined,
        title: `${input.agentType}: ${input.task.slice(0, 40)}`,
        ...(input.cwd ? { directory: input.cwd } : {}),
        ...(input.worktreeOwnership ? { worktreeOwnership: input.worktreeOwnership } : {}),
      })
      if (input.onActorID) yield* Effect.sync(() => input.onActorID!(child.id)).pipe(Effect.ignore)
      const key = actorKey(child.id, child.id)
      const lifecycle = input.lifecycle ?? "persistent"
      // T42: register the peer's receiver/actor-registry row (session_id ===
      // actor_id === child.id, mode "peer") SYNCHRONOUSLY here — before spawn
      // resolves and before the child's first turn. This is the single
      // spawn-time registration that makes a child addressable the instant
      // `session create` returns: Inbox.send's ESRCH pre-check (reg.get) and
      // `session send` both resolve against this row without waiting for the
      // child to arm anything on its first turn. turn_count/status start at 0/
      // "pending"; the per-step turn heartbeat (registry.updateTurn) advances
      // them later. No double-registration: nothing on the first-turn path
      // (prompt.ts) re-registers a peer — it only reads (reg.get) and updates
      // (updateTurn/updateStatus). Prerequisite for T43 (--topic reuse).
      return yield* admit(input, child.id, child.id, lifecycle, (generation) =>
        Effect.gen(function* () {
          yield* actorReg.register({
            sessionID: child.id,
            actorID: child.id,
            mode: "peer",
            parentActorID: input.parentActorID,
            agent: input.agentType,
            description: input.description ?? input.agentType,
            contextMode: input.context,
            contextWatermark: undefined,
            background: input.background,
            lifecycle,
            tools: input.tools,
          })
          if (input.forkContext) yield* retainForkContext(key, input.forkContext, input.sessionID, instanceRef)
          return yield* forkWork({
            runApproval: input.runApproval,
            sessionID: child.id,
            parentSessionID: input.sessionID,
            parentActorID: input.parentActorID,
            actorID: child.id,
            agentType: input.agentType,
            task: input.task,
            description: input.description,
            background: input.background,
            model: input.model,
            lifecycle,
            generation,
            task_id: input.task_id,
            format: input.format,
            ...(instanceRef ? { instanceRef } : {}),
          })
        }),
      )
    })

    const spawnSubagent = Effect.fn("Actor.spawnSubagent")(function* (input: SpawnInput) {
      const actorID = yield* actorReg.allocateActorID(input.sessionID, input.agentType)
      const key = actorKey(input.sessionID, actorID)
      const lifecycle = input.lifecycle ?? "ephemeral"

      return yield* admit(input, input.sessionID, actorID, lifecycle, (generation) =>
        Effect.gen(function* () {
          const watermark = input.context === "full" ? yield* session.lastMainMessageID(input.sessionID) : undefined
          yield* actorReg.register({
            sessionID: input.sessionID,
            actorID,
            mode: "subagent",
            parentActorID: input.parentActorID,
            agent: input.agentType,
            description: input.description ?? input.agentType,
            contextMode: input.context,
            contextWatermark: watermark,
            background: input.background,
            lifecycle,
            tools: input.tools,
          })

          // The actor now EXISTS in the registry. Hand the caller its id before the
          // work fiber detaches below, so a concurrent reclaim can see it (MR104 #2).
          // Synchronous + best-effort: a throwing callback must not fail the spawn.
          if (input.onActorID) yield* Effect.sync(() => input.onActorID!(actorID)).pipe(Effect.ignore)
          if (input.forkContext) yield* retainForkContext(key, input.forkContext, input.parentSessionID ?? input.sessionID)

          // Auto-inject return-format instruction for lifecycle-managed subagents.
          // Agents with an explicit completionGate keep this behavior even when
          // they also provide a dedicated system prompt.
          const agentInfo = yield* agents.get(input.agentType)
          const gateEligible =
            agentInfo?.mode === "subagent" &&
            (agentInfo.completionGate === true || (!agentInfo.prompt && input.agentType !== "checkpoint-writer"))
          return yield* forkWork({
            runApproval: input.runApproval,
            sessionID: input.sessionID,
            parentSessionID: input.parentSessionID ?? input.sessionID,
            parentActorID: input.parentActorID,
            actorID,
            agentType: input.agentType,
            task: gateEligible ? input.task + RETURN_FORMAT_INSTRUCTION : input.task,
            description: input.description,
            background: input.background,
            model: input.model,
            lifecycle,
            generation,
            task_id: input.task_id,
            gateEligible,
            format: input.format,
          })
        }),
      )
    })

    const spawnImpl = Effect.fn("Actor.spawn.impl")(function* (input: SpawnInput) {
      if (input.mode === "peer") return yield* spawnPeer(input)
      return yield* spawnSubagent(input)
    })

    const spawn = Effect.fn("Actor.spawn")(function* (input: SpawnInput) {
      const inherited = yield* RunDisposal
      if (isRunDisposing(inherited)) return yield* Effect.interrupt
      if (inherited.instance) {
        const parent = yield* session.get(input.sessionID)
        if (isRunDisposing(inherited)) return yield* Effect.interrupt
        if (inherited.instance.directory !== parent.directory) return yield* Effect.interrupt
        return yield* spawnImpl(input)
      }
      return yield* state.withRunDisposal(
        Effect.gen(function* () {
          const current = yield* RunDisposal
          const parent = yield* session.get(input.sessionID)
          if (isRunDisposing(current) || current.instance?.directory !== parent.directory)
            return yield* Effect.interrupt
          return yield* spawnImpl(input)
        }),
      )
    })

    const resolveNotificationTarget = Effect.fn("Actor.resolveNotificationTarget")(function* (
      key: string,
      parentSessionID: SessionID,
      allowRemembered = false,
    ) {
      const parent = yield* session.get(parentSessionID)
      const stored = yield* lifecycleState.getNotificationTarget(key)
      if (stored && !isRunDisposing(stored.disposal) && stored.instance.directory === parent.directory) return stored
      const disposal = yield* RunDisposal
      const current = disposal.instance?.directory === parent.directory
        ? ({ instance: disposal.instance, disposal } satisfies NotificationTarget)
        : allowRemembered
          ? layerNotificationTargets.get(parent.directory)
          : undefined
      if (!current || isRunDisposing(current.disposal) || current.instance.directory !== parent.directory) return undefined
      yield* lifecycleState.setNotificationTarget(key, current)
      return current
    })

    // Unified parent notification used by woken persistent turns and by the
    // explicit cancel owner. Spawn-turn delivery remains in forkWork because it
    // also resolves AgentOutcome and runs completion-gate reconciliation.
    const notifyTerminal = (
      sessionID: SessionID,
      actorID: string,
      actor: Actor | undefined,
      status: TerminalStatus,
      extra: { result?: string; error?: string; reportedStatus?: ReturnStatus; reportedSummary?: string } = {},
      source?: RunDisposalState,
    ) =>
      Effect.gen(function* () {
        const origin = source ?? (yield* RunDisposal)
        if (isRunDisposing(origin)) return
        if (!actor) return
        if (!actor.background) return
        if (actor.mode !== "peer" && actor.mode !== "subagent") return
        if (SYSTEM_SPAWNED_AGENT_TYPES.has(actor.agent)) return
        // Resolve the parent session: a peer runs in its own child session (notify
        // its parentID); a subagent shares the parent's session.
        const parentSessionID = actor.mode === "peer" ? (yield* session.get(sessionID)).parentID : sessionID
        if (!parentSessionID || isRunDisposing(origin)) return
        const notificationTarget = yield* resolveNotificationTarget(actorKey(sessionID, actorID), parentSessionID)
        if (!notificationTarget) return
        yield* withNotificationTarget(
          notificationTarget,
          inbox.send({
            receiverSessionID: parentSessionID,
            receiverActorID: actor.parentActorID ?? "main",
            senderSessionID: sessionID,
            senderActorID: actorID,
            type: "actor_notification",
            content: renderActorNotification({
              actorID,
              description: actor.description,
              status,
              ...extra,
            }),
          }),
          origin,
        )
        yield* withNotificationTarget(
          notificationTarget,
          bus.publish(TuiEvent.ToastShow, {
            message: `Child "${actor.description}" ${status}`,
            variant: status === "completed" ? "success" : status === "cancelled" ? "info" : "error",
          }),
          origin,
        ).pipe(Effect.ignoreCause)
      }).pipe(Effect.catchCause((cause) => Effect.logError(`actor terminal notification failed: ${Cause.pretty(cause)}`)))

    const finishPersistentTurn = (
      input: { sessionID: SessionID; actorID: string; notifyParentOnComplete: boolean },
      actor: Actor,
      owner: WakeGenerationOwner<MessageV2.WithParts>,
      result: Exit.Exit<MessageV2.WithParts>,
    ) =>
      Effect.gen(function* () {
        const key = actorKey(input.sessionID, input.actorID)
        const source = yield* RunDisposal
        const terminalResult = yield* Effect.gen(function* () {
          const value = Exit.isSuccess(result) ? result.value : undefined
          const assistant = value?.info.role === "assistant" ? value.info : undefined
          const effectFailure = Exit.isFailure(result) && !Cause.hasInterruptsOnly(result.cause)
          const assistantFailure = assistant?.error !== undefined
          const cancelled =
            !effectFailure &&
            !assistantFailure &&
            ((yield* lifecycleState.isCancelled(key)) ||
              (Exit.isFailure(result) && Cause.hasInterruptsOnly(result.cause)))
          const status =
            effectFailure || assistantFailure
              ? ("failed" as const)
              : cancelled
                ? ("cancelled" as const)
                : ("completed" as const)
          const error = effectFailure
            ? Cause.pretty(result.cause)
            : assistantFailure
              ? (sessionErrorText(assistant.error) ?? "unknown")
              : undefined
          const claimed = yield* lifecycleState.claimTerminal(key, owner, status, "turn", error)
          if (claimed) {
            yield* Effect.gen(function* () {
              // Settle the old receiver's receipts without writing through a
              // disposed instance or notifying a parent that is still alive.
              if (isRunDisposing(source)) return
              // Persist this turn's delivery before publishing its reference:
              // updateStatus cleared result_message_id on the running transition,
              // so a terminal write must supply a fresh one.
              const resultMessageID =
                status === "cancelled"
                  ? undefined
                  : yield* Effect.gen(function* () {
                      if (!assistant || !value) return undefined
                      const text = assistantFinalText(assistant, value.parts)
                      const structured = assistant.structured
                      if (text === undefined && structured === undefined) return undefined
                      const parsedDelivery = parseReturnHeader(text)
                      yield* session.updateMessage({
                        ...assistant,
                        actorResult: {
                          ...(text !== undefined ? { finalText: text } : {}),
                          ...(structured !== undefined ? { structured } : {}),
                          ...(parsedDelivery.status ? { reportedStatus: parsedDelivery.status } : {}),
                          ...(parsedDelivery.summary ? { reportedSummary: parsedDelivery.summary } : {}),
                        },
                      })
                      return assistant.id
                    }).pipe(
                      Effect.catchCause((cause) =>
                        Effect.logError(`actor delivery persistence failed: ${Cause.pretty(cause)}`).pipe(
                          Effect.as(undefined),
                        ),
                      ),
                    )
              yield* actorReg
                .updateStatus(input.sessionID, input.actorID, {
                  status: "idle",
                  lastOutcome: status === "completed" ? "success" : status === "failed" ? "failure" : "cancelled",
                  lastError: status === "failed" ? error : undefined,
                  ...(resultMessageID ? { resultMessageID } : {}),
                })
                .pipe(Effect.ignoreCause)
              if (input.notifyParentOnComplete) {
                const finalText = assistant && value ? assistantFinalText(assistant, value.parts) : undefined
                const parsed = parseReturnHeader(finalText)
                yield* notifyTerminal(
                  input.sessionID,
                  input.actorID,
                  actor,
                  status,
                  status === "completed"
                    ? {
                        result: finalText ?? "(no output)",
                        ...(parsed.status ? { reportedStatus: parsed.status } : {}),
                        ...(parsed.summary ? { reportedSummary: parsed.summary } : {}),
                      }
                    : status === "failed"
                      ? { error }
                      : {},
                  source,
                )
              }
            }).pipe(Effect.ensuring(lifecycleState.settleTerminal(owner)))
          } else {
            yield* Deferred.await(owner.terminalDone)
          }
          if (Exit.isFailure(result)) return yield* Effect.failCause(result.cause)
          return result.value
        }).pipe(Effect.exit)
        yield* lifecycleState.finishWake(key, owner, terminalResult)
        if (Exit.isFailure(terminalResult)) return yield* Effect.failCause(terminalResult.cause)
        return terminalResult.value
      })

    // Terminal settlement for a continuation turn of a NON-persistent actor.
    // Mirrors the persistent path's finishPersistentTurn: persist the delivery,
    // publish its id on the registry row, and notify the parent once.
    const continueTurn = (
      sessionID: SessionID,
      actorID: string,
      actor: Actor,
      onInterrupt: Effect.Effect<MessageV2.WithParts>,
      work: Effect.Effect<MessageV2.WithParts>,
    ) =>
      Effect.gen(function* () {
        let lastFinal: MessageV2.WithParts | undefined
        const continued = Effect.gen(function* () {
          const final = yield* state.ensureRunning(sessionID, actorID, onInterrupt, work)
          lastFinal = final
          if (final.info.role === "assistant" && final.info.error)
            return yield* Effect.die(new Error(sessionErrorText(final.info.error) ?? "actor session failed"))
          return final
        })
        const delivery = (exit: Exit.Exit<MessageV2.WithParts>) =>
          Effect.gen(function* () {
            if (Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)) return undefined
            const final = Exit.isSuccess(exit) ? exit.value : lastFinal
            if (!final || final.info.role !== "assistant") return undefined
            const text = assistantFinalText(final.info, final.parts)
            const structured = final.info.structured
            if (text === undefined && structured === undefined) return undefined
            const parsed = parseReturnHeader(text)
            yield* session.updateMessage({
              ...final.info,
              actorResult: {
                ...(text !== undefined ? { finalText: text } : {}),
                ...(structured !== undefined ? { structured } : {}),
                ...(parsed.status ? { reportedStatus: parsed.status } : {}),
                ...(parsed.summary ? { reportedSummary: parsed.summary } : {}),
              },
            })
            return final.info.id
          })
        return yield* runTurn(sessionID, actorID, continued, { settle: delivery }).pipe(
          Effect.provideService(ActorRegistry.Service, actorReg),
          Effect.onExit((exit) =>
            Effect.gen(function* () {
              const final = Exit.isSuccess(exit) ? exit.value : lastFinal
              const text = final?.info.role === "assistant" ? assistantFinalText(final.info, final.parts) : undefined
              const parsed = parseReturnHeader(text)
              const failureCause = Exit.isFailure(exit) ? exit.cause : undefined
              const status = !failureCause
                ? ("completed" as const)
                : Cause.hasInterruptsOnly(failureCause)
                  ? ("cancelled" as const)
                  : ("failed" as const)
              yield* notifyTerminal(
                sessionID,
                actorID,
                actor,
                status,
                status === "completed"
                  ? {
                      result: text ?? "(no output)",
                      ...(parsed.status ? { reportedStatus: parsed.status } : {}),
                      ...(parsed.summary ? { reportedSummary: parsed.summary } : {}),
                    }
                  : status === "failed"
                    ? { error: Cause.pretty(failureCause!), ...(text !== undefined ? { result: text } : {}) }
                    : {},
              )
            }),
          ),
        )
      })

    const runPersistentTurnImpl = Effect.fn("Actor.runPersistentTurn.impl")(function* (
      input: {
        sessionID: SessionID
        actorID: string
        work: Effect.Effect<MessageV2.WithParts>
        onInterrupt: Effect.Effect<MessageV2.WithParts>
        notifyParentOnComplete: boolean
        inboxID?: string
      },
      wakeSource: RunDisposalState | undefined,
    ) {
      const actor = yield* actorReg.get(input.sessionID, input.actorID)
      const key = actorKey(input.sessionID, input.actorID)
      if (!actor || actor.lifecycle !== "persistent" || (actor.mode !== "peer" && actor.mode !== "subagent")) {
        while (true) {
          const active = yield* lifecycleState.currentGeneration(key)
          if (active?.kind === "fork") yield* Deferred.await(active.done)
          if (input.inboxID && !(yield* inbox.has(input.inboxID))) return yield* input.onInterrupt
          // A continuation of a non-persistent actor still settles: it writes the
          // turn's delivery, publishes its id and notifies the parent exactly
          // once. Only the persistent path below owns a wake generation, so this
          // branch drives the terminal write through runTurn directly.
          const settleTurn = !actor || !input.notifyParentOnComplete
          const result = settleTurn
            ? yield* state.ensureRunning(input.sessionID, input.actorID, input.onInterrupt, input.work)
            : yield* continueTurn(input.sessionID, input.actorID, actor, input.onInterrupt, input.work)
          if (!input.inboxID || !(yield* inbox.has(input.inboxID))) return result
        }
      }
      if (wakeSource?.instance && !isRunDisposing(wakeSource)) {
        const parentSessionID = actor.mode === "peer" ? (yield* session.get(input.sessionID)).parentID : input.sessionID
        if (parentSessionID) {
          const parent = yield* session.get(parentSessionID)
          if (parent.directory === wakeSource.instance.directory) {
            const target = {
              instance: wakeSource.instance,
              disposal: wakeSource,
            }
            if (rememberNotificationTarget(target)) yield* lifecycleState.setNotificationTarget(key, target)
          }
        }
      }
      if (actor.status === "idle" && actor.lastOutcome === "cancelled") {
        yield* inbox.drain(input.sessionID, input.actorID).pipe(Effect.ignore)
        yield* lifecycleState.releasePersistent(key)
        return yield* Effect.interrupt
      }
      yield* lifecycleState.retainPersistent(key)

      return yield* Effect.uninterruptible(
        Effect.gen(function* () {
          while (true) {
            const head = input.inboxID ? yield* inbox.head(input.sessionID, input.actorID) : undefined
            const ownership = yield* lifecycleState.acquireWake(key)

            if (ownership._tag === "blocked") return yield* Effect.interrupt
            if (ownership._tag === "episode") {
              yield* Deferred.await(ownership.episode.done)
              if (input.inboxID && (yield* inbox.has(input.inboxID))) continue
              return yield* Effect.interrupt
            }
            if (ownership._tag === "fork") {
              yield* Deferred.await(ownership.active.done)
              continue
            }
            if (ownership._tag === "follower") {
              const result = yield* Deferred.await(ownership.active.result)
              const stalled = Exit.isFailure(result) && (!head || (yield* inbox.has(head)))
              if (input.inboxID && !isTurnCancelled(result) && !stalled && (yield* inbox.has(input.inboxID))) continue
              if (Exit.isFailure(result)) return yield* Effect.failCause(result.cause)
              return result.value
            }

            const owner = ownership.owner
            const guardedWork = Effect.gen(function* () {
              if (!(yield* lifecycleState.isCurrentOpen(key, owner))) return yield* Effect.interrupt
              yield* actorReg
                .updateStatus(input.sessionID, input.actorID, { status: "running" })
                .pipe(Effect.ignoreCause)
              return yield* input.work
            })
            const result = yield* state
              .ensureRunning(input.sessionID, input.actorID, input.onInterrupt, guardedWork)
              .pipe(Effect.interruptible, Effect.exit)
            const finished = yield* finishPersistentTurn(input, actor, owner, result).pipe(Effect.exit)
            // Retry an unconsumed tail after progress, including a failed finish;
            // cancellation and failures before any drain must not restart work.
            const stalled = Exit.isFailure(finished) && (!head || (yield* inbox.has(head)))
            if (
              input.inboxID &&
              !isTurnCancelled(result) &&
              !isTurnCancelled(finished) &&
              !stalled &&
              (yield* inbox.has(input.inboxID))
            ) continue
            if (Exit.isFailure(finished)) return yield* Effect.failCause(finished.cause)
            return finished.value
          }
        }),
      )
    })

    const runPersistentTurn = Effect.fn("Actor.runPersistentTurn")(function* (
      input: Parameters<typeof runPersistentTurnImpl>[0],
    ) {
      const wakeSource = yield* WakeSourceDisposal
      return yield* runPersistentTurnImpl(input, wakeSource).pipe(state.withRunDisposal, RunApproval.provide(undefined))
    })

    const recoveryUnavailable = () =>
      new NotFoundError({ message: "Actor has no resumable turn with retained current-instance context" })
    const recoveryActor = Effect.fn("Actor.recoveryActor")(function* (input: {
      sessionID: SessionID
      actorID: string
    }) {
      const key = actorKey(input.sessionID, input.actorID)
      const frozen = yield* lifecycleState.getForkContext(key)
      const actor = yield* actorReg.get(input.sessionID, input.actorID)
      if (
        !actor ||
        actor.lifecycle !== "persistent" ||
        actor.contextMode !== "full" ||
        (actor.mode !== "peer" && actor.mode !== "subagent") ||
        actor.lastOutcome === "cancelled" ||
        !frozen ||
        isRunDisposing(frozen.disposal) ||
        frozen.instance.disposing ||
        !sessionPrompt.startActorResume
      )
        return yield* Effect.fail(recoveryUnavailable())
      const validate = Effect.gen(function* () {
        const current = yield* lifecycleState.getForkContext(key)
        const instance = yield* InstanceState.context
        const disposal = yield* RunDisposal
        if (
          current !== frozen ||
          instance !== frozen.instance ||
          disposal !== frozen.disposal ||
          isRunDisposing(frozen.disposal)
        )
          return yield* Effect.fail(recoveryUnavailable())
      })
      return { key, actor, frozen, validate }
    })

    const recovery: NonNullable<Interface["recovery"]> = Effect.fn("Actor.recovery")(function* (input) {
      const target = yield* recoveryActor(input)
      return yield* Effect.gen(function* () {
        yield* target.validate
        const candidates = yield* sessionPrompt.recovery({
          sessionID: input.sessionID,
          agentID: input.actorID,
          modelIdentity: target.frozen.context.modelIdentity,
        })
        yield* target.validate
        return candidates
      }).pipe(
        state.withRunDisposal,
        Effect.provideService(InstanceRef, target.frozen.instance),
        Effect.provideService(RunDisposal, target.frozen.disposal),
      )
    })

    const resume: NonNullable<Interface["resume"]> = Effect.fn("Actor.resume")(function* (input) {
      if (input.signal?.aborted || isRunDisposing(yield* RunDisposal)) return yield* Effect.interrupt
      const { key, actor, frozen, validate } = yield* recoveryActor(input)
      const startActorResume = sessionPrompt.startActorResume!
      return yield* Effect.uninterruptibleMask((restore) =>
        Effect.gen(function* () {
          yield* validate
          const ownership = yield* lifecycleState.acquireWake(key)
          if (ownership._tag === "blocked") return yield* Effect.fail(recoveryUnavailable())
          if (ownership._tag !== "owner") return yield* Effect.fail(new Session.BusyError(input.sessionID))
          const owner = ownership.owner
          const admitted = yield* Deferred.make<void, InstanceType<typeof NotFoundError> | Session.BusyError | Session.RecoveryConflictError>()
          const accepted = { value: false, withdrawn: false }
          // This supervisor owns the actor generation until the actual Runner has
          // settled. Interrupting the admission caller/completion waiter cannot
          // release it or let a queued inbox turn join an unfinished recovery.
          const work = Effect.gen(function* () {
            const completion = yield* startActorResume({
              ...input,
              modelIdentity: frozen.context.modelIdentity,
              taskSessionID: frozen.taskSessionID,
              validate: validate.pipe(
                Effect.andThen(
                  Effect.gen(function* () {
                    if (
                      input.signal?.aborted ||
                      accepted.withdrawn ||
                      !(yield* lifecycleState.isCurrentOpen(key, owner))
                    )
                      return yield* Effect.interrupt
                  }),
                ),
              ),
              // The synchronous transaction transfers ownership only after the
              // task binding and old assistant settlement have actually committed.
              onCommitted: () => {
                accepted.value = true
              },
              shouldCommit: () =>
                !input.signal?.aborted &&
                !accepted.withdrawn &&
                !owner.terminal &&
                !frozen.instance.disposing &&
                !isRunDisposing(frozen.disposal),
              onAdmitted: Effect.gen(function* () {
                if (!(yield* lifecycleState.isCurrentOpen(key, owner))) return yield* Effect.interrupt
                yield* validate.pipe(Effect.catch(() => Effect.interrupt))
                yield* actorReg
                  .updateStatus(input.sessionID, input.actorID, { status: "running" })
                  .pipe(Effect.ignoreCause)
              }),
            })
            yield* Deferred.succeed(admitted, undefined)
            return yield* completion
          }).pipe(
            Effect.interruptible,
            Effect.exit,
            Effect.flatMap((result) =>
              Effect.uninterruptible(
                Effect.gen(function* () {
                  const settled = yield* (
                    Exit.isFailure(result) ? Effect.failCause(result.cause) : Effect.succeed(result.value)
                  ).pipe(Effect.orDie, Effect.exit)
                  if (accepted.value)
                    return yield* finishPersistentTurn(
                      { ...input, notifyParentOnComplete: true },
                      actor,
                      owner,
                      settled,
                    )
                  yield* lifecycleState.finishWake(key, owner, settled)
                  if (Exit.isFailure(result)) return yield* Effect.failCause(result.cause)
                  return result.value
                }),
              ),
            ),
            // A cancel between ownership transfer and settlement must also
            // release the caller. Publish failure only after generation cleanup.
            Effect.onExit((exit) =>
              Exit.isFailure(exit) ? Deferred.done(admitted, exit).pipe(Effect.ignore) : Effect.void,
            ),
          )
          const fiber = yield* work.pipe(Effect.forkIn(scope))
          const admission = input.signal
            ? Effect.raceFirst(
                Deferred.await(admitted),
                Effect.callback<never>((resume) => {
                  const abort = () => resume(Effect.interrupt)
                  if (input.signal!.aborted) abort()
                  else input.signal!.addEventListener("abort", abort, { once: true })
                  return Effect.sync(() => input.signal!.removeEventListener("abort", abort))
                }),
              )
            : Deferred.await(admitted)
          yield* restore(admission).pipe(
            Effect.onInterrupt(() =>
              Effect.gen(function* () {
                if (accepted.value) return
                accepted.withdrawn = true
                yield* state.cancelActor(input.sessionID, input.actorID)
                yield* Deferred.await(owner.done)
              }),
            ),
          )
          return Fiber.join(fiber).pipe(Effect.orDie)
        }),
      ).pipe(
        state.withRunDisposal,
        Effect.provideService(InstanceRef, frozen.instance),
        Effect.provideService(RunDisposal, frozen.disposal),
        RunApproval.provide(undefined),
      )
    })

    const cancel: (
      sessionID: SessionID,
      actorID: string,
      mode: "graceful" | "forced",
      expected?: ForkGenerationOwner,
    ) => Effect.Effect<void> = Effect.fn("Actor.cancel")(function* (
      sessionID: SessionID,
      actorID: string,
      mode: "graceful" | "forced",
      expected?: ForkGenerationOwner,
    ) {
      const key = actorKey(sessionID, actorID)
      const receiver = yield* lifecycleState.getForkContext(key)
      const inReceiver = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        receiver ? withNotificationTarget(receiver, effect) : effect
      const ownership = yield* lifecycleState.acquireCancel(key, expected)
      if (ownership._tag === "noop") return
      if (ownership._tag === "follower") {
        yield* Deferred.await(ownership.episode.done)
        return
      }

        const releaseEpisode = lifecycleState.releaseCancel(key, ownership.episode)
        const retire = lifecycleState.retire(key)
        const settleClaim =
          ownership.claimed && ownership.generation ? lifecycleState.settleTerminal(ownership.generation) : Effect.void

      yield* Effect.uninterruptible(
        Effect.gen(function* () {
          const children = yield* actorReg.listByParent(sessionID, actorID).pipe(
            Effect.catchCause((cause) =>
              Effect.sync(() =>
                log.warn("actor child lookup failed during cancel; continuing parent cleanup", {
                  sessionID,
                  actorID,
                  cause: Cause.pretty(cause),
                }),
              ).pipe(Effect.as([] as Actor[])),
            ),
          )
          yield* Effect.forEach(
            children,
            (child) =>
              cancel(sessionID, child.actorID, mode).pipe(
                Effect.catchCause((cause) =>
                  Effect.sync(() =>
                    log.warn("actor child cancellation failed; continuing parent cleanup", {
                      sessionID,
                      actorID,
                      childActorID: child.actorID,
                      cause: Cause.pretty(cause),
                    }),
                  ),
                ),
              ),
            {
              concurrency: "unbounded",
              discard: true,
            },
          )
          if (ownership.generation?.terminal && !ownership.claimed) {
            yield* Deferred.await(ownership.generation.done)
            return
          }
          const stop =
            mode === "graceful" ? state.cancelActorDetached(sessionID, actorID) : state.cancelActor(sessionID, actorID)
          yield* (
            receiver
              ? stop.pipe(
                  Effect.provideService(InstanceRef, receiver.instance),
                  Effect.provideService(RunDisposal, receiver.disposal),
                )
              : stop
          ).pipe(Effect.ignoreCause({ log: "Warn", message: "actor runner interrupt failed during cancel" }))
          if (receiver && isRunDisposing(receiver.disposal)) {
            yield* retire
            return
          }
          const actor = yield* actorReg.get(sessionID, actorID).pipe(
            Effect.catchCause((cause) => {
              log.warn("actor lookup failed during cancel; retrying before cleanup", {
                sessionID,
                actorID,
                cause: Cause.pretty(cause),
              })
              return actorReg.get(sessionID, actorID).pipe(
                Effect.catchCause((retryCause) =>
                  Effect.sync(() =>
                    log.error("actor lookup retry failed during cancel; continuing without notification", {
                      sessionID,
                      actorID,
                      cause: Cause.pretty(retryCause),
                    }),
                  ).pipe(Effect.as(undefined)),
                ),
              )
            }),
          )
          if (receiver && isRunDisposing(receiver.disposal)) {
            yield* retire
            return
          }
          if (!actor) {
            if (actorID === "main") return
            yield* actorReg
              .updateStatus(sessionID, actorID, {
                status: "idle",
                lastOutcome: "cancelled",
                lastError: undefined,
              })
              .pipe(inReceiver, Effect.ignoreCause)
            yield* inbox.drain(sessionID, actorID).pipe(inReceiver, Effect.ignoreCause)
            yield* retire
            return
          }

          // Main-session cancellation is an execution concern, never a
          // persistent-actor retirement. It must not leave a durable tombstone.
          if (actor.mode === "main") return

          if (ownership.claimed && ownership.generation) {
            yield* Effect.gen(function* () {
              yield* actorReg
                .updateStatus(sessionID, actorID, {
                  status: "idle",
                  lastOutcome: "cancelled",
                  lastError: undefined,
                })
                .pipe(inReceiver, Effect.ignoreCause)
              yield* inbox.drain(sessionID, actorID).pipe(inReceiver, Effect.ignoreCause)
              yield* notifyTerminal(sessionID, actorID, actor, "cancelled", {}, receiver?.disposal)
              yield* retire
            })
            return
          }

          const live = yield* lifecycleState.hasGeneration(key)
          if (actor.lifecycle !== "persistent" && actor.status === "idle" && actor.lastOutcome != null && !live) return
          if (actor.lifecycle === "persistent" && actor.status === "idle" && actor.lastOutcome === "cancelled") {
            yield* inbox.drain(sessionID, actorID).pipe(inReceiver, Effect.ignoreCause)
            yield* retire
            return
          }
          yield* actorReg
            .updateStatus(sessionID, actorID, {
              status: "idle",
              lastOutcome: "cancelled",
              lastError: undefined,
            })
            .pipe(inReceiver, Effect.ignoreCause)
          yield* inbox.drain(sessionID, actorID).pipe(inReceiver, Effect.ignoreCause)
          yield* notifyTerminal(sessionID, actorID, actor, "cancelled", {}, receiver?.disposal)
          yield* retire
        }).pipe(Effect.ensuring(settleClaim), Effect.ensuring(releaseEpisode)),
      )
    })

    const getForkContext = Effect.fn("Actor.getForkContext")(function* (sessionID: SessionID, actorID: string) {
      return (yield* lifecycleState.getForkContext(actorKey(sessionID, actorID)))?.context
    })

    // === T40 stall watchdog ===
    // Event-driven stall detection: a background fiber periodically scans active
    // background actors (ActorRegistry.listActive → pending/running + background),
    // computes deriveLiveness for each, and when a PEER/subagent flips to
    // `stalled` (running/pending but nothing has landed for the actor's slice for
    // longer than DEFAULT_LIVENESS_STALL_MS — deriveLiveness encodes exactly that)
    // pushes ONE actor_notification{stalled} to its parent. Reuses the
    // notifyTerminal shape (inbox.send actor_notification + renderActorNotification
    // + a TUI toast) so stalled joins completed/failed/cancelled on one contract.
    //
    // Debounce — the crux: `notified` holds the "sessionID:actorID" of actors we
    // have ALREADY warned about for their CURRENT stall episode. We emit only on
    // the not-yet-notified → stalled edge; while it STAYS stalled across ticks it
    // is in `notified` and we skip. We re-arm (delete the key) the moment the
    // actor is no longer stalled — it resumed (activity landed again, so
    // deriveLiveness reads `progressing`), went terminal, or vanished — so a
    // later re-stall notifies again. One notification per stall episode.
    const notified = new Set<string>()

    // Emit the single stalled notification for one actor. Same gating +
    // parent-resolution as notifyTerminal: background only, peer/subagent only,
    // exclude SYSTEM_SPAWNED_AGENT_TYPES, address the parent's main inbox.
    const notifyStalled = (actor: Actor, stalledForMs: number) =>
      Effect.gen(function* () {
        if (!actor.background) return false
        if (actor.mode !== "peer" && actor.mode !== "subagent") return false
        if (SYSTEM_SPAWNED_AGENT_TYPES.has(actor.agent)) return false
        const parentSessionID = actor.mode === "peer" ? (yield* session.get(actor.sessionID)).parentID : actor.sessionID
        if (!parentSessionID) return false
        const notificationTarget = yield* resolveNotificationTarget(
          actorKey(actor.sessionID, actor.actorID),
          parentSessionID,
          true,
        )
        if (!notificationTarget) return false
        const delivered = yield* withNotificationTarget(
          notificationTarget,
          inbox
            .send({
              receiverSessionID: parentSessionID,
              receiverActorID: actor.parentActorID ?? "main",
              senderSessionID: actor.sessionID,
              senderActorID: actor.actorID,
              type: "actor_notification",
              content: renderActorNotification({
                actorID: actor.actorID,
                description: actor.description,
                status: "stalled",
                stalledForMs,
              }),
            })
            .pipe(Effect.as(true)),
        ).pipe(Effect.catchCause(() => Effect.succeed(false)))
        if (delivered !== true) return false
        yield* withNotificationTarget(
          notificationTarget,
          bus.publish(ActorEvents.ActorStalled, {
            sessionID: actor.sessionID,
            actorID: actor.actorID,
            description: actor.description,
            // Same reference the classification used, for the same reason the
            // notification carries it: an observability payload that reports the
            // step clock while the predicate read the activity clock is a trap.
            lastActivityTime: actor.lastActivityTime ?? actor.time.created,
            stalledDuration: stalledForMs,
          }),
        ).pipe(Effect.ignoreCause)
        yield* withNotificationTarget(
          notificationTarget,
          Effect.promise(() =>
            Bus.publish(TuiEvent.ToastShow, {
              message: `Child "${actor.description}" appears stalled (no activity for ${Math.floor(stalledForMs / 1000)}s)`,
              variant: "info",
            }),
          ),
        ).pipe(Effect.ignoreCause)
        return true
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logError(`stall notify failed: ${Cause.pretty(cause)}`).pipe(Effect.as(false)),
        ),
      )

    const scanStalled = Effect.gen(function* () {
      const now = Date.now()
      const active = yield* actorReg.listActive().pipe(Effect.orElseSucceed(() => [] as Actor[]))
      const seen = new Set<string>()
      for (const actor of active) {
        const key = `${actor.sessionID}:${actor.actorID}`
        seen.add(key)
        const live = deriveLiveness(actor, now)
        if (live === "stalled") {
          if (notified.has(key)) continue // already warned this episode — debounce
          // Report the quantity the classification actually used — silence since
          // the last part write, or since spawn when nothing has landed — not
          // time since the last completed step, which deriveLiveness no longer
          // reads. A number that disagrees with its own predicate is a bug.
          if (yield* notifyStalled(actor, now - (actor.lastActivityTime ?? actor.time.created))) notified.add(key)
          continue
        }
        // Not stalled (progressing/terminal) → re-arm so a future re-stall notifies.
        notified.delete(key)
      }
      return seen
    }).pipe(Effect.catchCause((cause) => Effect.logError(`stall watchdog scan failed: ${Cause.pretty(cause)}`)))

    // The layer can serve multiple instance generations. Each tick scans only
    // directories with a live, explicitly captured generation target; disposing
    // one directory therefore neither re-arms it nor terminates the scheduler for
    // the others.
    const scanRememberedTargets = Effect.suspend(() =>
      Effect.gen(function* () {
        const scans = yield* Effect.forEach(
          [...layerNotificationTargets.values()],
          (target) =>
            Effect.gen(function* () {
              const current = isRunDisposing(target.disposal)
                ? yield* Effect.promise(() => Instance.peek(target.instance.directory)).pipe(
                    Effect.flatMap((instance) =>
                      instance ? captureNotificationTarget(instance) : Effect.succeed(undefined),
                    ),
                  )
                : target
              if (!current || isRunDisposing(current.disposal)) return undefined
              return yield* withNotificationTarget(current, scanStalled)
            }),
          { concurrency: 1 },
        )
        if (!scans.some((seen) => seen !== undefined)) return
        const seen = new Set<string>(scans.flatMap((keys) => keys ? [...keys] : []))
        // Cleanup is tick-wide, not per directory: an empty worktree registry
        // must not re-arm an actor observed by another live generation.
        for (const key of notified) if (!seen.has(key)) notified.delete(key)
      }),
    )
    yield* scanRememberedTargets.pipe(
      Effect.repeat(Schedule.spaced(WATCHDOG_SCAN_INTERVAL_MS)),
      Effect.ignore,
      Effect.forkIn(scope),
    )

    const scanStalledOnce = () =>
      Effect.gen(function* () {
        const instance = yield* InstanceState.context
        if (!instance.disposing) yield* captureNotificationTarget(instance)
        yield* scanRememberedTargets
      })
    const impl = Service.of({ spawn, recovery, resume, cancel, getForkContext, runPersistentTurn, scanStalledOnce })
    const restorePromptActor = sessionPrompt.bindActor?.(impl)
    const restoreInboxPrompt = inbox.bindPrompt?.({ loop: sessionPrompt.loop })
    // Late-bind the impl so SessionCheckpoint.tryStartCheckpointWriter can resolve it
    // without forming a layer cycle. See spawn-ref.ts for rationale.
    // Save the previous binding so the finalizer can restore it: when the same
    // process initialises Actor.layer more than once (memo'd ManagedRuntimes,
    // overlapping test runtimes, etc.) the inner scope's dispose must hand
    // control back to the outer scope's impl instead of wiping the ref to
    // `undefined` and breaking every subsequent tryStartCheckpointWriter call.
    const prevSpawnRef = spawnRef.current
    spawnRef.current = impl
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        restoreInboxPrompt?.()
        restorePromptActor?.()
        if (spawnRef.current === impl) spawnRef.current = prevSpawnRef
      }),
    )
    return impl
  }),
)

// Wrapped in Layer.suspend so the cross-module `.defaultLayer` reads defer to
// first use instead of running at module load. Without this, the
// spawn → prompt → app-runtime import cycle hits a load order where
// AppLayer's mergeAll runs while SessionPrompt is mid-init and throws
// "Cannot access 'defaultLayer' before initialization", breaking every
// it.live test harness. Same pattern session/prompt, session/checkpoint,
// tool/registry, provider, etc. already use.
/** App composition variant with SessionPrompt supplied by the root graph. */
export const appLayer = Layer.suspend(() =>
  layer.pipe(
    Layer.provide(Session.defaultLayer),
    Layer.provide(ActorRegistry.defaultLayer),
    Layer.provide(Agent.defaultLayer),
    Layer.provide(SessionRunState.defaultLayer),
    Layer.provide(Inbox.defaultLayer),
    Layer.provide(Plugin.defaultLayer),
    Layer.provide(Bus.layer),
    Layer.provide(TaskRegistry.defaultLayer),
  ),
)

export const defaultLayer = appLayer.pipe(Layer.provide(SessionPrompt.defaultLayer))

export * as Actor from "./spawn"
