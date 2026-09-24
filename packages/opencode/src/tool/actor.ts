import * as Tool from "./tool"
import { RecoverableError } from "./recoverable"
import { NotFoundError } from "@/storage"
import DESCRIPTION from "./actor.txt"
import DESCRIPTION_CHECKPOINT from "./actor.checkpoint.txt"
import { withCheckpointDescription, withCheckpointClause } from "./checkpoint-description"
import z from "zod"
import { Session } from "../session"
import { SessionID, MessageID, PartID } from "../session/schema"
import { MessageV2 } from "../session/message-v2"
import { Agent } from "../agent/agent"
import { Provider } from "../provider"
import { sortVisionModels } from "../provider/provider"
import type { SessionPrompt } from "../session/prompt"
import { Config } from "../config"
import { ActorRegistry } from "@/actor/registry"
import { ActorRecoveryTarget } from "@/actor/recovery-target"
import { ActorWaiter } from "@/actor/waiter"
import { spawnRef } from "@/actor/spawn-ref"
import type { ForkContext, SpawnResult } from "@/actor/spawn"
import { TaskRegistry } from "@/task/registry"
import { TaskID } from "@/task/schema"
import { SessionCheckpoint } from "@/session/checkpoint"
import { prefixCaptureRef } from "@/session/prefix-capture-ref"
import { inboxServiceRef } from "@/inbox/inbox-ref"
import { takeUtf8PrefixByBytes, takeUtf8SuffixByBytes } from "@/util/text-truncate"
import { Effect, Deferred } from "effect"
import { Token } from "../util"

export interface ActorPromptOps {
  cancel(sessionID: SessionID): void
  resolvePromptParts(template: string): Effect.Effect<SessionPrompt.PromptInput["parts"]>
  prompt(input: SessionPrompt.PromptInput): Effect.Effect<MessageV2.WithParts>
}

const id = "actor"

const actorIdRequiredField = z
  .string()
  .min(1)
  .describe(
    "Actor session id to operate on. Distinct from the user-task IDs (T1, T2, ...) used by the `task` tool.",
  )
const statusSchema = z.strictObject({
  action: z.literal("status"),
  actor_id: actorIdRequiredField,
})
const sendSchema = z.strictObject({
  action: z.literal("send"),
  to_session_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      "(optional) Target session ID. Defaults to the current session — useful for sending to subagents in this session.",
    ),
  to_actor_id: z
    .string()
    .min(1)
    .describe(
      "Target actor ID. Use 'main' to send to a session's main agent, or a subagent ID like 'explore-1'.",
    ),
  content: z.string().min(1).describe("Message content (plain text). Wrapped in <inbox> for the receiver."),
  type: z
    .string()
    .optional()
    .describe(
      "(optional) Message type. Default 'text' is wrapped in <inbox>...</inbox>. 'actor_notification' is passed through verbatim (sender pre-renders).",
    ),
})

const MODEL_PARAM_DESCRIPTION =
  "(optional) Model for this subagent: a model group name (e.g. ultra/standard/lite) or a literal provider/model (e.g. mimo-v2.5-pro). Overrides the agent's configured model; defaults to the agent's model, else the parent's. If no model_groups are configured, the tier names resolve to the default model. To discover valid provider/model values (e.g. a vision-capable model for image tasks), run `actor models` (or `actor models --vision`)."

const VARIANT_PARAM_DESCRIPTION =
  "(optional) Named variant of this subagent's model, usually a reasoning-effort level (e.g. low/high/max). It must be one the resolved model lists — run `actor models` to see each model's variants; an unknown name fails before the subagent starts and lists the valid ones. Omit it for the default: the agent's configured variant when the subagent uses the agent's configured model, otherwise none. Your own current variant is not inherited, and the variant stays fixed for the actor's lifetime."

// Default token budget for checkpoint context injected into subagent prompts.
// ~11K tokens ≈ 44KB UTF-8, enough for a concise progress summary without
// overwhelming the subagent's context window.
const DEFAULT_STATE_CONTEXT_TOKENS = 11_000

function estimateStateTokens(text: string) {
  return Math.max(Token.estimate(text), Math.round(Buffer.byteLength(text, "utf8") / 3))
}

function capStateContext(text: string, maxTokens: number) {
  if (estimateStateTokens(text) <= maxTokens) return text
  const marker = `\n\n[... checkpoint truncated to ${maxTokens} tokens for actor context=state ...]\n\n`
  if (Buffer.byteLength(marker, "utf8") >= maxTokens * 3) return takeUtf8PrefixByBytes(marker.trim(), maxTokens * 3)
  const budget = Math.max(0, maxTokens * 3 - Buffer.byteLength(marker, "utf8"))
  const head = Math.floor(budget * 0.65)
  const tail = budget - head
  return takeUtf8PrefixByBytes(text, head) + marker + (tail > 0 ? takeUtf8SuffixByBytes(text, tail) : "")
}

export const ActorTool = Tool.define(
  id,
  Effect.gen(function* () {
    const agent = yield* Agent.Service
    const config = yield* Config.Service
    const provider = yield* Provider.Service
    const sessions = yield* Session.Service
    const actorRegistry = yield* ActorRegistry.Service
    const checkpoint = yield* SessionCheckpoint.Service
    const waiter = yield* ActorWaiter.Service
    const tasks = yield* TaskRegistry.Service

    // Resolve the Actor service through the late-bound spawnRef rather than as
    // a Layer dependency: pulling Actor.Service in here would create a layer
    // cycle (Actor → SessionPrompt → ToolRegistry → tool/actor → Actor) that
    // Effect cannot satisfy. The ref is populated by Actor.layer's initialiser
    // (see actor/spawn-ref.ts).
    const requireActor = () => {
      const a = spawnRef.current
      if (!a) {
        return Effect.fail(
          new Error(
            "Actor service unavailable — Actor.appLayer must be running for the actor tool to spawn or cancel actors",
          ),
        )
      }
      return Effect.succeed(a)
    }

    // Tool def is built lazily (function form of Init) because the dynamic
    // `subagent_type` enum below calls agent.list(), which queries
    // InstanceState — Instance is only available at tool-init time
    // (per-invocation), not at service-resolution time when ActorTool is
    // wired into ToolRegistry's layer.
    return Effect.fn("ActorTool.init")(function* () {
      // F36a: build subagent_type as a dynamic z.enum from the agent registry,
      // filtered to spawnable agents (mode === "subagent" && !hidden). Excludes
      // hidden internals (title, summary, checkpoint-writer per F24) and
      // includes both native registry agents (general/explore) and
      // user-config-defined subagents. This gives the LLM a discoverable,
      // validated list of agent types — replaces the prior bare z.string()
      // that the model couldn't introspect (root cause of three harness runs
      // with zero subagent spawns).
      const allAgents = yield* agent.list()
      const spawnable = allAgents.filter((a) => a.mode === "subagent" && !a.hidden)
      const spawnableNames = spawnable.map((a) => a.name)
      if (spawnableNames.length === 0) {
        return yield* Effect.die(new Error("No spawnable subagent types"))
      }
      const subagentTypeEnum = z.enum(spawnableNames as [string, ...string[]])

      const timeoutField = z
        .number()
        .int()
        .positive()
        .optional()
        .describe("(optional) Milliseconds to wait before returning { status: 'timeout' }. Default 600000 (10 min).")

      const contextField = z
        .enum(["none", "state", "full"])
        .optional()
        .describe(
          withCheckpointClause(
            "(optional) Context inheritance. 'none' (default): child sees only prompt. 'full': child sees parent conversation (prefix cache sharing).",
            "'state': child gets checkpoint summary.",
          ),
        )

      const runSchema = z.strictObject({
        action: z
          .literal("run")
          .describe(
            "RARE EXCEPTION — launches a subagent and BLOCKS the whole conversation until it completes; the result is returned inline. Use it only when you cannot make your very next decision without the result in THIS turn and the work is a tiny, fast lookup. For ordinary analysis, review, or implementation work use `spawn` instead.",
          ),
        description: z.string().min(1).describe("A short (3-5 words) description of the task."),
        prompt: z.string().min(1).describe("The task for the agent to perform."),
        subagent_type: subagentTypeEnum.describe("The type of specialized agent to use for this task."),
        model: z
          .string()
          .min(1)
          .optional()
          .describe(MODEL_PARAM_DESCRIPTION),
        variant: z
          .string()
          .min(1)
          .optional()
          .describe(VARIANT_PARAM_DESCRIPTION),
        timeout_ms: timeoutField,
        command: z.string().min(1).optional().describe("(optional) The command that triggered this task."),
        context: contextField,
        task_id: z
          .string()
          .min(1)
          .optional()
          .describe(
            "(optional) If this subagent is doing work for a specific task in the `task` tool, pass that task's ID (e.g. T4, T2.1) here — only an ID the `task` tool returned this session. After completion, the actor.postStop hook validates that tasks/<task_id>/progress.md exists with the required sections. If the ID is malformed or names no existing task, the binding is silently dropped and the subagent's findings are NOT captured to that task. Leave omitted only for work that isn't tied to a task.",
          ),
        output_schema: z
          .record(z.string(), z.any())
          .optional()
          .describe(
            "(optional) A JSON Schema. When set, the subagent is forced to return a single structured object matching this schema (via the StructuredOutput tool) instead of free text; the validated object is returned in <actor_result>.",
          ),
      })

      const spawnSchema = z.strictObject({
        action: z
          .literal("spawn")
          .describe(
            "THE DEFAULT — launches a subagent in the BACKGROUND and returns its actor_id immediately, so subagents run in PARALLEL and you keep responding to the user. The result arrives as a notification, or collect it with `wait`/`status`.",
          ),
        description: z.string().min(1).describe("A short (3-5 words) description of the task."),
        prompt: z.string().min(1).describe("The task for the agent to perform."),
        subagent_type: subagentTypeEnum.describe("The type of specialized agent to use for this task."),
        model: z
          .string()
          .min(1)
          .optional()
          .describe(MODEL_PARAM_DESCRIPTION),
        variant: z
          .string()
          .min(1)
          .optional()
          .describe(VARIANT_PARAM_DESCRIPTION),
        command: z.string().min(1).optional().describe("(optional) The command that triggered this task."),
        context: contextField,
        lifecycle: z
          .literal("persistent")
          .optional()
          .describe(
            'Only when interrupted-work recovery is needed: requires context="full" and retains frozen context until cancelled. Omit for the normal ephemeral lifecycle.',
          ),
        task_id: z
          .string()
          .min(1)
          .optional()
          .describe(
            "(optional) If this subagent is doing work for a specific task in the `task` tool, pass that task's ID (e.g. T4, T2.1) here — only an ID the `task` tool returned this session. After completion, the actor.postStop hook validates that tasks/<task_id>/progress.md exists with the required sections. If the ID is malformed or names no existing task, the binding is silently dropped and the subagent's findings are NOT captured to that task. Leave omitted only for work that isn't tied to a task.",
          ),
        output_schema: z
          .record(z.string(), z.any())
          .optional()
          .describe(
            "(optional) A JSON Schema. When set, the subagent is forced to return a single structured object matching this schema (via the StructuredOutput tool) instead of free text.",
          ),
      })

      const waitSchema = z.strictObject({
        action: z.literal("wait"),
        actor_id: actorIdRequiredField,
        timeout_ms: timeoutField,
      })

      const resumeSchema = z.strictObject({
        action: z.literal("resume"),
        actor_id: actorIdRequiredField,
        task_id: TaskID.optional().describe(
          "(optional) Validate the original task, or bind an unbound interrupted user to an eligible task in the actor's original task session. An existing task binding cannot be replaced.",
        ),
      })

      const cancelSchema = z.strictObject({
        action: z.literal("cancel"),
        actor_id: actorIdRequiredField,
      })

      const modelsSchema = z.strictObject({
        action: z.literal("models"),
        vision: z.boolean().optional().describe("(optional) If true, list only vision-capable models (models that accept image input)."),
        limit: z.number().int().positive().optional().describe("(optional) Max number of models to return. Default 50."),
      })

      const parameters = z.strictObject({
        // .meta({ type: "object" }) is REQUIRED — without it the emitted JSON
        // schema's `operation` node has only `anyOf`, no `type`, and some models
        // (notably mimo-v2.5-pro) stringify the whole envelope
        // ({"operation":"{\"action\":\"run\",...}"}) which fails zod validation.
        // The root strictObject also means flattenDiscriminatedUnion finds no
        // root-level union and passes through unchanged — root keeps exactly one
        // key (`operation`), so models can't drop the discriminator.
        operation: z
          .discriminatedUnion("action", [
            // spawn first: it is the default action, and the model reads this
            // union in order. run stays available but is listed as the exception.
            spawnSchema,
            runSchema,
            statusSchema,
            waitSchema,
            cancelSchema,
            resumeSchema,
            sendSchema,
            modelsSchema,
          ])
          .meta({ type: "object" }),
      })

      const run = Effect.fn("ActorTool.execute")(function* (input: z.infer<typeof parameters>, ctx: Tool.Context) {
        const op = input.operation
        const cfg = yield* config.get()
        const aborted = Effect.callback<never>((resume) => {
          const abort = () => resume(Effect.interrupt)
          if (ctx.abort.aborted) {
            abort()
            return
          }
          ctx.abort.addEventListener("abort", abort, { once: true })
          return Effect.sync(() => ctx.abort.removeEventListener("abort", abort))
        })

        // Resolve the trusted caller independently
        // of script arguments; a stale agent name cannot become a primary caller.
        if (ctx.extra?.fromExec) {
          const callers = (yield* agent.list()).filter((item) => item.name === ctx.agent)
          const callerActor = ctx.actorID && ctx.actorID !== "main"
            ? yield* actorRegistry.get(ctx.sessionID, ctx.actorID)
            : undefined
          // Registry rows persist the agent config key; Tool.Context carries
          // its display name, which the user may rename independently.
          const registeredCaller = callerActor ? yield* agent.get(callerActor.agent) : undefined
          if (
            callers.length !== 1 ||
            (ctx.actorID && ctx.actorID !== "main" && (!callerActor || registeredCaller !== callers[0]))
          )
            return yield* Effect.fail(new RecoverableError("Nested actor caller identity is unavailable"))
          const subagent = callers[0].mode === "subagent" || callerActor?.mode === "subagent"
          if (subagent && op.action !== "send") {
            return yield* Effect.fail(
              new RecoverableError(
                `Subagents can only use actor send to communicate with the parent agent. You are running as "${ctx.agent}"; use actor send with to_actor_id=${JSON.stringify(callerActor?.parentActorID ?? "main")} to report progress or findings.`,
              ),
            )
          }
          if (
            subagent &&
            (!callerActor ||
              op.action !== "send" ||
              op.to_actor_id !== (callerActor.parentActorID ?? "main") ||
              (op.to_session_id !== undefined && op.to_session_id !== ctx.sessionID))
          )
            return yield* Effect.fail(
              new RecoverableError("Nested subagent sends require its registered parent target"),
            )
        }

        // Helper: "actor belongs to another session OR doesn't exist" response.
        // Same response for both cases — don't leak the difference (POSIX: you can
        // only reap your own children).
        const unknownResponse = (label: string, actorID: string) => {
          const snapshot = { status: "unknown" as const, actor_id: actorID }
          return {
            title: `Actor ${label}: unknown`,
            output: JSON.stringify(snapshot),
            metadata: { actor_id: actorID, status: "unknown" } as Record<string, any>,
          }
        }

        // Look up an actor in the registry. Subagent actors live under
        // ctx.sessionID; peer actors live under their own sessionID (== actorID).
        // Try the subagent location first, then fall back to the peer location.
        const findActor = Effect.fn("ActorTool.findActor")(function* (actorID: string) {
          const sub = yield* actorRegistry.get(ctx.sessionID, actorID)
          if (sub) return { entry: sub, sessionID: ctx.sessionID }
          const sid = SessionID.make(actorID)
          const peer = yield* actorRegistry.get(sid, actorID)
          if (peer) return { entry: peer, sessionID: sid }
          return undefined
        })

        if (op.action === "resume") {
          const callers = (yield* agent.list()).filter((item) => item.name === ctx.agent)
          const caller =
            ctx.actorID && ctx.actorID !== "main"
              ? yield* actorRegistry.get(ctx.sessionID, ctx.actorID)
              : undefined
          if (
            callers.length !== 1 ||
            callers[0].mode === "subagent" ||
            (ctx.actorID && ctx.actorID !== "main" && caller?.mode !== "peer")
          )
            return yield* Effect.fail(new RecoverableError("Only a primary agent or registered peer can resume actors"))
          const target = yield* ActorRecoveryTarget.resolve({ sessionID: ctx.sessionID, actorID: op.actor_id }).pipe(
            Effect.provideService(Session.Service, sessions),
            Effect.provideService(ActorRegistry.Service, actorRegistry),
            Effect.catch((error) =>
              NotFoundError.isInstance(error) ? Effect.succeed(undefined) : Effect.fail(error),
            ),
          )
          if (!target) return unknownResponse("resume", op.actor_id)
          const actor = yield* requireActor()
          if (!actor.resume) return yield* Effect.fail(new RecoverableError("Actor recovery is unavailable"))
          yield* actor
            .resume({ ...target, task_id: op.task_id, signal: ctx.abort })
            .pipe(
              Effect.catch((error) =>
                Effect.fail(
                  new RecoverableError(
                    NotFoundError.isInstance(error)
                      ? error.data.message
                      : error instanceof Error
                        ? error.message
                        : String(error),
                  ),
                ),
              ),
            )
          return {
            title: "Actor resume: running",
            output: JSON.stringify({ status: "running", actor_id: target.actorID }),
            metadata: { actor_id: target.actorID, status: "running" },
          }
        }

        if (op.action ==="send") {
          const inboxSvc = inboxServiceRef.current
          if (!inboxSvc) {
            return yield* Effect.fail(
              new Error("Inbox service unavailable — Inbox.layer must be running for the actor tool to send messages"),
            )
          }
          const targetSid = op.to_session_id !== undefined ? SessionID.make(op.to_session_id) : ctx.sessionID
          const sendResult = yield* inboxSvc
            .send({
              receiverSessionID: targetSid,
              receiverActorID: op.to_actor_id,
              senderSessionID: ctx.sessionID,
              senderActorID: ctx.extra?.fromExec ? ctx.actorID ?? "main" : ctx.agent ?? "main",
              content: op.content,
              ...(op.type !== undefined ? { type: op.type } : {}),
            })
            .pipe(
              Effect.catchTag("InboxReceiverNotFound", () =>
                Effect.succeed({ inboxID: null as string | null, error: "receiver not found" }),
              ),
            )
          if ("error" in sendResult) {
            return {
              title: `Send failed: receiver not found`,
              output: JSON.stringify(sendResult),
              metadata: {
                receiver_actor_id: op.to_actor_id,
                receiver_session_id: targetSid,
                error: sendResult.error,
              } as Record<string, any>,
            }
          }
          return {
            title: `Sent to ${op.to_actor_id}`,
            output: JSON.stringify({ inboxID: sendResult.inboxID }),
            metadata: {
              inboxID: sendResult.inboxID,
              receiver_actor_id: op.to_actor_id,
              receiver_session_id: targetSid,
            } as Record<string, any>,
          }
        }

        if (op.action ==="status") {
          const found = yield* findActor(op.actor_id)
          if (!found) return unknownResponse("status", op.actor_id)
          const entry = yield* waiter.status(found.entry)
          const snapshot = {
            status: entry.status,
            executionActive: entry.executionActive,
            executionState: entry.executionState,
            actor_id: entry.actorID,
            description: entry.description,
            agent: entry.agent,
            background: entry.background,
            turnCount: entry.turnCount,
            lastTurnTime: entry.lastTurnTime,
            lastOutcome: entry.lastOutcome,
            ...(entry.lastError !== undefined ? { error: entry.lastError } : {}),
            time: entry.time,
          }
          return {
            title: `Actor status: ${entry.executionState}`,
            output: JSON.stringify(snapshot),
            metadata: { actor_id: entry.actorID, status: entry.status } as Record<string, any>,
          }
        }

        if (op.action ==="wait") {
          const found = yield* findActor(op.actor_id)
          if (!found) return unknownResponse("wait", op.actor_id)
          const snap = yield* waiter
            .wait({
              sessionID: found.sessionID,
              actor_id: op.actor_id,
              timeout_ms: op.timeout_ms,
            })
            .pipe(Effect.raceFirst(aborted))
          return {
            title: `Actor wait: ${snap.status}${snap.lastOutcome ? "/" + snap.lastOutcome : ""}`,
            output: JSON.stringify(snap),
            metadata: {
              actor_id: snap.actor_id,
              status: snap.status,
              ...(snap.lastOutcome ? { lastOutcome: snap.lastOutcome } : {}),
            } as Record<string, any>,
          }
        }

        if (op.action ==="cancel") {
          const found = yield* findActor(op.actor_id)
          if (!found) return unknownResponse("cancel", op.actor_id)
          const entry = found.entry

          // Persistent full-context actors retain recovery state while idle.
          // They still need cancellation to release it; other idle actors stay no-op.
          if (entry.status === "idle" && !(entry.lifecycle === "persistent" && entry.contextMode === "full")) {
            const snapshot = {
              status: entry.status,
              actor_id: entry.actorID,
              description: entry.description,
              agent: entry.agent,
              background: entry.background,
            }
            return {
              title: `Actor cancel: ${entry.status}`,
              output: JSON.stringify(snapshot),
              metadata: { actor_id: entry.actorID, status: entry.status } as Record<string, any>,
            }
          }

          // Signal the actor through Actor.cancel — marks status "cancelled" in the registry.
          const actorForCancel = yield* requireActor()
          yield* actorForCancel.cancel(found.sessionID, entry.actorID, "graceful")

          const snapshot = {
            status: "cancelled" as const,
            actor_id: entry.actorID,
            description: entry.description,
            agent: entry.agent,
            background: entry.background,
          }
          return {
            title: `Actor cancel: cancelled`,
            output: JSON.stringify(snapshot),
            metadata: { actor_id: entry.actorID, status: "cancelled" } as Record<string, any>,
          }
        }

        if (op.action === "models") {
          const providers = yield* provider.list()
          const allModels = Object.values(providers).flatMap((info) => Object.values(info.models))
          const filtered = op.vision ? allModels.filter((m) => m.capabilities.input.image === true) : allModels
          const ordered = op.vision
            ? sortVisionModels(filtered)
            : [...filtered].sort((a, b) => `${a.providerID}/${a.id}`.localeCompare(`${b.providerID}/${b.id}`))
          const limit = op.limit ?? 50
          const shown = ordered.slice(0, limit)
          const lines = shown.map((m) => {
            const variants = Object.keys(m.variants ?? {})
            return `${m.providerID}/${m.id}${m.capabilities.input.image ? " (vision)" : ""}${variants.length > 0 ? ` [variants: ${variants.join(", ")}]` : ""}`
          })
          const header = op.vision ? `Vision-capable models` : `Available models`
          const more = ordered.length > shown.length ? `\n… and ${ordered.length - shown.length} more (raise --limit)` : ""
          const output = shown.length === 0
            ? (op.vision ? "No vision-capable models are configured. Configure a vision model or use an OCR tool." : "No models are configured.")
            : `${header} (${shown.length} of ${ordered.length}):\n${lines.join("\n")}${more}\nPass a listed model and, optionally, one of its variants in actor run/spawn JSON arguments.`
          return { title: header, output, metadata: { count: shown.length, total: ordered.length, vision: !!op.vision } as Record<string, any> }
        }

        if (op.action === "spawn" && op.lifecycle && op.context !== "full")
          return yield* Effect.fail(new RecoverableError('Persistent actor spawn requires context="full"'))

        // op.action ==="run" or "spawn" — schema guarantees
        // description / prompt / subagent_type are present and non-empty.
        //
        // Final defence line for the no-nested-delegation invariant that
        // ToolRegistry.available already enforces by masking `actor` out of every
        // subagent's schema: refuse a spawn whose caller is itself a subagent, so
        // a stale prompt-cached schema or a hand-rolled call site cannot recurse.
        // bypassAgentCheck marks a dispatch that did NOT originate from a model
        // deciding to delegate — handleSubtask (where ctx.agent is the CHILD being
        // spawned, not the caller) and explicit user @agent mentions — so those
        // legitimately pass through.
        if (!ctx.extra?.bypassAgentCheck) {
          // Tool.Context carries the configured display name, not the config key.
          // Require a unique match so renamed agents work without letting duplicate
          // names weaken the final no-nested-delegation check.
          const callers = (yield* agent.list()).filter((item) => item.name === ctx.agent)
          const caller = callers.length === 1 ? callers[0] : undefined
          if (!caller) {
            return yield* Effect.fail(
              new RecoverableError(
                `Cannot delegate because the calling agent "${ctx.agent}" cannot be resolved uniquely. Choose an available agent and try again.`,
              ),
            )
          }
          if (caller.mode === "subagent") {
            return yield* Effect.fail(
              new RecoverableError(
                `Subagents cannot spawn other subagents. You are running as "${caller.name}"; complete this task yourself with the tools available to you.`,
              ),
            )
          }
          yield* ctx.ask({
            permission: "actor",
            patterns: [op.subagent_type],
            always: ["*"],
            metadata: {
              description: op.description,
              subagent_type: op.subagent_type,
            },
          })
        }

        const next = yield* agent.get(op.subagent_type)
        if (!next) {
          return yield* Effect.fail(
            new RecoverableError(
              `Unknown agent type "${op.subagent_type}". Valid subagent_type values are listed in the actor tool description — pass one of those.`,
            ),
          )
        }

        let prompt = op.prompt
        const background = op.action ==="spawn"

        // Inject checkpoint summaries for context="state" mode
        if (op.context === "state") {
          const latest = yield* checkpoint
            .loadLatest(ctx.sessionID)
            .pipe(Effect.catch(() => Effect.succeed(undefined)))
          if (latest) {
            const state = capStateContext(latest, cfg.checkpoint?.push_caps?.checkpoint ?? DEFAULT_STATE_CONTEXT_TOKENS)
            prompt =
              [
                "<session-state>",
                "Here is a summary of the parent session's progress:",
                "",
                state,
                "</session-state>",
                "",
              ].join("\n") + prompt
          }
          // If no checkpoint, fall through — child gets just the prompt (same as "none")
        }

        const msg = yield* Effect.sync(() => MessageV2.get({ sessionID: ctx.sessionID, messageID: ctx.messageID }))
        if (msg.info.role !== "assistant") return yield* Effect.fail(new Error("Not an assistant message"))

        const modelRef = op.model ?? next.modelRef
        const resolved = modelRef ? yield* provider.resolveModelRef(modelRef, msg.info.providerID) : undefined
        const model = resolved
          ? { modelID: resolved.id, providerID: resolved.providerID }
          : (next.model ?? {
              modelID: msg.info.modelID,
              providerID: msg.info.providerID,
            })
        // The agent's configured variant applies when the child ends up on the agent's own
        // configured model. `createUserMessage` decides that by resolving the agent's model
        // ref WITHOUT provider context, so a group member picked for the caller's provider
        // looks like a different model there and silently loses the variant. Decide it here
        // by comparing provider-aware resolved identities, which also holds when the call
        // names that same model itself — as the agent's own group ref, or as a literal.
        const agentModel =
          op.variant || !next.variant
            ? undefined
            : next.modelRef
              ? yield* provider
                  .resolveModelRef(next.modelRef, msg.info.providerID)
                  .pipe(Effect.map((m) => ({ modelID: m.id, providerID: m.providerID })))
              : next.model
        const inherited =
          agentModel && agentModel.providerID === model.providerID && agentModel.modelID === model.modelID
            ? next.variant
            : undefined
        // Validate before admission so a wrong variant never starts a child at a
        // different cost or quality than the caller asked for. Own keys only: the
        // provider has already merged configured variants and removed disabled ones.
        const variants =
          op.variant || inherited
            ? Object.keys((resolved ?? (yield* provider.getModel(model.providerID, model.modelID))).variants ?? {})
            : []
        if (op.variant && !variants.includes(op.variant))
          return yield* Effect.fail(
            new RecoverableError(
              variants.length > 0
                ? `Model "${model.providerID}/${model.modelID}" has no variant "${op.variant}". Valid variants: ${variants.join(", ")}. Pass one of these, or omit variant to use the default.`
                : `Model "${model.providerID}/${model.modelID}" defines no variants, so variant "${op.variant}" cannot apply. Omit variant, or choose a model that lists variants in \`actor models\`.`,
            ),
          )
        // An unsupported configured variant is dropped rather than failing the call: the
        // agent's config is not this call's request, and the prompt-side fallback ignores
        // an undefined variant the same way.
        const variant = op.variant ?? (inherited && variants.includes(inherited) ? inherited : undefined)
        const selection = variant ? { model, variant } : { model }

        const forkContext: ForkContext | undefined = yield* (op.context === "full"
          ? Effect.gen(function* () {
              const buildPrefix = prefixCaptureRef.current
              if (!buildPrefix) {
                return yield* Effect.fail(
                  new RecoverableError("Full context is unavailable because the session prefix captor is not ready."),
                )
              }
              const watermarkMsgID = ctx.messages.at(-1)?.info.id
              if (!watermarkMsgID) {
                return yield* Effect.fail(
                  new RecoverableError("Full context requires a non-empty caller-visible message history."),
                )
              }
              const prefix = yield* buildPrefix({
                sessionID: ctx.sessionID,
                agentName: ctx.agent,
                providerID: model.providerID,
                modelID: model.modelID,
                msgs: ctx.messages,
              })
              if (prefix.inheritedMessages.length === 0) {
                return yield* Effect.fail(
                  new RecoverableError("Full context capture produced no inherited messages."),
                )
              }
              return {
                modelIdentity: prefix.modelIdentity,
                system: prefix.system,
                turnContext: prefix.turnContext,
                tools: prefix.tools,
                activeTools: prefix.activeTools,
                loadedMcpTools: prefix.loadedMcpTools,
                inheritedMessages: prefix.inheritedMessages,
                parentPermission: prefix.parentPermission,
                watermarkMsgID,
                model,
              }
            })
          : Effect.succeed(undefined))

        // Validate task_id by reference at execute time (NOT in the schema, so a
        // bad value degrades instead of hard-failing the call). A malformed shape
        // or an ID that names no task in this session ⇒ run ad-hoc (task_id
        // dropped) and tell the model why, so a fabricated ID becomes harmless
        // instead of triggering phantom postStop progress nagging.
        let effectiveTaskId = op.task_id
        let taskNotice = ""
        if (op.task_id) {
          if (!TaskID.safeParse(op.task_id).success) {
            effectiveTaskId = undefined
            taskNotice = `note: task_id "${op.task_id}" is not a valid task ID (expected Tn or Tn.m); ran ad-hoc. Task IDs come from the \`task\` tool.`
          } else {
            const existing = yield* tasks.get({ session_id: ctx.sessionID, id: op.task_id })
            if (!existing) {
              effectiveTaskId = undefined
              taskNotice = `note: task_id "${op.task_id}" does not exist in this session; ran ad-hoc. Create it with the \`task\` tool first, or omit task_id.`
            }
          }
        }

        // v6: subagents share the parent's sessionID and run as registered actors
        // under the parent. Actor.spawn handles registry registration, forking
        // the agent loop, and sending inbox notifications on terminal — replacing
        // the legacy session.create + manual fork path that lived here pre-Task-29.
        const actor = yield* requireActor()
        const ownership: { result?: SpawnResult; handedOff: boolean } = { handedOff: false }
        return yield* Effect.acquireUseRelease(
          Effect.void,
          () =>
            Effect.gen(function* () {
              if (ctx.abort.aborted) return yield* Effect.interrupt
              const spawnResult = yield* actor.spawn({
                runApproval: ctx.runApproval,
                mode: "subagent",
                sessionID: ctx.sessionID,
                parentActorID: ctx.actorID ?? "main",
                agentType: next.name,
                description: op.description,
                task: prompt,
                context: op.context ?? "none",
                tools: next.toolAllowlist ? [...next.toolAllowlist] : "INHERIT",
                ...selection,
                background,
                awaitCompletion: false,
                onAdmitted: (result) => {
                  ownership.result = result
                },
                ...(op.action === "spawn" && op.lifecycle ? { lifecycle: op.lifecycle } : {}),
                ...(forkContext ? { forkContext } : {}),
                task_id: effectiveTaskId,
                onReady: ({ actorID, sessionID }) =>
                  ctx.metadata({
                    title: op.description,
                    metadata: { sessionId: sessionID, actorId: actorID, ...selection },
                  }),
                ...(op.output_schema
                  ? { format: { type: "json_schema" as const, schema: op.output_schema, retryCount: 2 } }
                  : {}),
              })
              ownership.result = spawnResult
              if (ctx.abort.aborted) return yield* Effect.interrupt

              if (op.action === "spawn") {
                ownership.handedOff = true
                return {
                  title: op.description,
                  metadata: { sessionId: spawnResult.sessionID, actorId: spawnResult.actorID, ...selection },
                  output:
                    (taskNotice ? taskNotice + "\n" : "") +
                    `Background sub-session started. actor_id: ${spawnResult.actorID}\nThe result will be delivered as a notification when complete.`,
                }
              }

              // Blocking run awaits the authoritative outcome after preStop,
              // the completion gate, and postStop have settled. It preserves the
              // main delivery while surfacing any postStop failures as warnings.
              const outcome = yield* Deferred.await(spawnResult.outcome).pipe(
                Effect.timeout(op.timeout_ms ?? 600_000),
                Effect.catchTag("TimeoutError", () => Effect.succeed({ status: "timeout" as const })),
              )

              // Blocking run preserves the pre-unification contract: tool call fails
              // when the child fails. The LLM sees a tool error, not a "success with
              // error in output." (The explicit action="wait" returns the structured
              // snapshot as a regular tool result — that's a different contract.)
              if (outcome.status === "failure") {
                // Keep any partial result on the error so a failed child still
                // reports what it produced.
                const partial = outcome.structured !== undefined ? JSON.stringify(outcome.structured) : outcome.finalText
                return yield* Effect.fail(
                  new Error(
                    `Tool execution failed: ${outcome.error ?? "unknown"}${partial === undefined ? "" : `\nPartial result: ${partial}`}`,
                  ),
                )
              }

              const resultText =
                outcome.status === "success"
                  ? outcome.structured !== undefined
                    ? JSON.stringify(outcome.structured)
                    : (outcome.finalText ?? "(no output)")
                  : outcome.status === "timeout"
                    ? "<timeout>task did not complete within timeout</timeout>"
                    : "<cancelled>task was cancelled</cancelled>"
              const statusAttr = outcome.status === "success" ? (outcome.reportedStatus ?? "unknown") : outcome.status
              const summaryAttr =
                outcome.status === "success" && outcome.reportedSummary
                  ? ` summary="${outcome.reportedSummary.replace(/\s+/g, " ").replace(/"/g, "'").trim()}"`
                  : ""
              if (ctx.abort.aborted) return yield* Effect.interrupt
              ownership.handedOff = true
              return {
                title: op.description,
                metadata: { sessionId: spawnResult.sessionID, actorId: spawnResult.actorID, ...selection } as Record<
                  string,
                  any
                >,
                output: [
                  ...(taskNotice ? [taskNotice, ""] : []),
                  `actor_id: ${spawnResult.actorID} (use \`send\` for follow-up while reusable; a completed ephemeral \`context: "full"\` actor needs a fresh spawn)`,
                  "",
                  `<actor_result status="${statusAttr}"${summaryAttr}>`,
                  resultText,
                  "</actor_result>",
                  ...(outcome.status === "success" ? (outcome.warnings ?? []).map((warning) => `Warning: ${warning}`) : []),
                ].join("\n"),
              }
            }).pipe(Effect.raceFirst(aborted)),
          () => {
            if (ownership.handedOff || !ownership.result) return Effect.void
            return (
              ownership.result.cancel ?? actor.cancel(ownership.result.sessionID, ownership.result.actorID, "forced")
            )
          },
        )
      })

      return {
        control: Tool.ActorControl,
        description: withCheckpointDescription(DESCRIPTION, DESCRIPTION_CHECKPOINT),
        parameters,
        execute: (input: z.infer<typeof parameters>, ctx: Tool.Context) => run(input, ctx).pipe(Effect.orDie),
      }
    })
  }),
)
