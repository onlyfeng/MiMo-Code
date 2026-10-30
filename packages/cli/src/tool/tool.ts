import type * as RunApproval from "@/session/run-approval"
import z from "zod"
import { Effect } from "effect"
import type { MessageV2 } from "../session/message-v2"
import type { Permission } from "../permission"
import type { SessionID, MessageID } from "../session/schema"
import * as Truncate from "./truncate"
import { RecoverableError } from "./recoverable"
import { Agent } from "@/agent/agent"
import { isRecord } from "@/util/record"

export interface Metadata {
  [key: string]: any
}

// Internal builtin identities survive invocation wrappers. A custom tool with
// the same name must not acquire lifecycle or plan-commit authority.
export const ActorControl = Symbol("ActorTool")
export const PlanExitControl = Symbol("PlanExitTool")

// TODO: remove this hack
export type DynamicDescription = (agent: Agent.Info) => Effect.Effect<string>

export type Context<M extends Metadata = Metadata> = {
  runApproval?: RunApproval.Scope
  // Resolved by the current Actor's request producer. Missing means no human
  // interaction target; a forwarded question cannot switch its parent's agent.
  interaction?: { sessionID: SessionID; planExit: boolean }
  // Installed only by the exec host on plan_exit. Called after the build user
  // is committed, inside that commit's uninterruptible completion boundary.
  planExitCommitted?(messageID: MessageID): Effect.Effect<void>
  sessionID: SessionID
  permission?: Permission.Ruleset
  messageID: MessageID
  agent: string
  actorID?: string
  taskId?: string
  abort: AbortSignal
  callID?: string
  extra?: { [key: string]: unknown }
  messages: MessageV2.WithParts[]
  metadata(input: { title?: string; metadata?: M }): Effect.Effect<void>
  ask(
    input: Omit<Permission.Request, "id" | "sessionID" | "tool">,
    invocation?: { callID: string; abort: AbortSignal; input: unknown },
  ): Effect.Effect<void>
}

export interface ExecuteResult<M extends Metadata = Metadata> {
  title: string
  metadata: M
  output: string
  attachments?: Omit<MessageV2.FilePart, "id" | "sessionID" | "messageID">[]
}

export interface Def<Parameters extends z.ZodType = z.ZodType, M extends Metadata = Metadata> {
  id: string
  description: string
  parameters: Parameters
  /** Internal native invocation schema, retained separately from shell wire parameters. */
  nativeParameters?: z.ZodType
  control?: symbol
  execute(args: z.infer<Parameters>, ctx: Context): Effect.Effect<ExecuteResult<M>>
  formatValidationError?(error: z.ZodError): string
}
export type DefWithoutID<Parameters extends z.ZodType = z.ZodType, M extends Metadata = Metadata> = Omit<
  Def<Parameters, M>,
  "id"
>

export interface Info<Parameters extends z.ZodType = z.ZodType, M extends Metadata = Metadata> {
  id: string
  init: () => Effect.Effect<DefWithoutID<Parameters, M>>
}

type Init<Parameters extends z.ZodType, M extends Metadata> =
  | DefWithoutID<Parameters, M>
  | (() => Effect.Effect<DefWithoutID<Parameters, M>>)

export type InferParameters<T> =
  T extends Info<infer P, any> ? z.infer<P> : T extends Effect.Effect<Info<infer P, any>, any, any> ? z.infer<P> : never
export type InferMetadata<T> =
  T extends Info<any, infer M> ? M : T extends Effect.Effect<Info<any, infer M>, any, any> ? M : never

export type InferDef<T> =
  T extends Info<infer P, infer M>
    ? Def<P, M>
    : T extends Effect.Effect<Info<infer P, infer M>, any, any>
      ? Def<P, M>
      : never

// Builds the agent-facing message for an argument-validation failure. zod v4's
// prettifyError gives a precise, path-annotated breakdown (which field, what was
// expected vs received) — far more actionable than dumping the raw issue JSON —
// so we surface that directly for ZodErrors and keep a generic fallback for
// anything else.
export function validationErrorMessage(id: string, error: unknown): string {
  if (error instanceof z.ZodError) {
    return `Invalid arguments for the ${id} tool:\n${z.prettifyError(error)}`
  }
  return `The ${id} tool was called with invalid arguments: ${error}.\nPlease rewrite the input so it satisfies the expected schema.`
}

function valueAt(root: unknown, path: readonly PropertyKey[]): unknown {
  let node = root
  for (const key of path) {
    if (typeof key === "symbol") return undefined
    if (Array.isArray(node)) node = node[Number(key)]
    else if (isRecord(node)) node = node[key]
    else return undefined
  }
  return node
}

// Copy-on-write: the original args are persisted as the tool part's input.
function replaceAt(root: unknown, path: readonly PropertyKey[], value: unknown): unknown {
  if (path.length === 0) return value
  const [key, ...rest] = path
  if (typeof key === "symbol") return root
  if (Array.isArray(root)) {
    const copy = [...root]
    copy[Number(key)] = replaceAt(root[Number(key)], rest, value)
    return copy
  }
  if (!isRecord(root)) return root
  return { ...root, [key]: replaceAt(root[key], rest, value) }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// zod's `expected` for schemas whose JSON form is an object or an array.
const JSON_CONTAINERS = new Map<string, (value: unknown) => boolean>([
  ["object", isRecord],
  ["record", isRecord],
  ["array", Array.isArray],
  ["tuple", Array.isArray],
])

// Some models emit a nested object or array argument as its JSON text, e.g.
// {"operation":"{\"action\":\"list\"}"} for the discriminated-union envelopes
// of cron/task/actor, and then repeat the call unchanged after the validation
// error. Decode each string zod reports where it expected an object or array.
function decodeStringifiedArgs(args: unknown, error: z.ZodError): unknown {
  let decoded = args
  for (const issue of error.issues) {
    if (issue.code !== "invalid_type") continue
    const isContainer = JSON_CONTAINERS.get(issue.expected)
    if (!isContainer) continue
    const value = valueAt(decoded, issue.path)
    if (typeof value !== "string") continue
    const parsed = parseJson(value)
    if (!isContainer(parsed)) continue
    decoded = replaceAt(decoded, issue.path, parsed)
  }
  return decoded
}

function validates<P extends z.ZodType>(parameters: P, value: unknown): value is z.infer<P> {
  return parameters.safeParse(value).success
}

// Validates like `parameters.safeParse`, but `data` is the raw args (not zod's
// output), decoded where decodeStringifiedArgs could repair them. Decoded args
// are accepted only when the whole input then validates; otherwise the
// original error stands.
export function safeParseArgs<P extends z.ZodType>(
  parameters: P,
  args: z.infer<P>,
): { success: true; data: z.infer<P> } | { success: false; error: z.ZodError } {
  const result = parameters.safeParse(args)
  if (result.success) return { success: true, data: args }
  const decoded = decodeStringifiedArgs(args, result.error)
  if (decoded !== args && validates(parameters, decoded)) return { success: true, data: decoded }
  return { success: false, error: result.error }
}

function parseArgs<P extends z.ZodType>(parameters: P, args: z.infer<P>): z.infer<P> {
  const parsed = safeParseArgs(parameters, args)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

function wrap<Parameters extends z.ZodType, Result extends Metadata>(
  id: string,
  init: Init<Parameters, Result>,
  truncate: Truncate.Interface,
  agents: Agent.Interface,
) {
  return () =>
    Effect.gen(function* () {
      const toolInfo = typeof init === "function" ? { ...(yield* init()) } : { ...init }
      const execute = toolInfo.execute
      toolInfo.execute = (args, ctx) => {
        const attrs = {
          "tool.name": id,
          "session.id": ctx.sessionID,
          "message.id": ctx.messageID,
          ...(ctx.callID ? { "tool.call_id": ctx.callID } : {}),
        }
        return Effect.gen(function* () {
          const input = yield* Effect.try({
            try: () => parseArgs(toolInfo.parameters, args),
            catch: (error) => {
              // Bad arguments are always agent-recoverable: the model sees the
              // message and rewrites the call next turn. Mark it so the TUI
              // renders it muted instead of alarming the user with a red block.
              if (error instanceof z.ZodError && toolInfo.formatValidationError) {
                return new RecoverableError(toolInfo.formatValidationError(error), { cause: error })
              }
              return new RecoverableError(validationErrorMessage(id, error), { cause: error })
            },
          })
          const result = yield* execute(input, ctx)
          if (result.metadata.truncated !== undefined) {
            return result
          }
          const agent = yield* agents.get(ctx.agent)
          const truncated = yield* truncate.output(result.output, {}, agent)
          return {
            ...result,
            output: truncated.content,
            metadata: {
              ...result.metadata,
              truncated: truncated.truncated,
              ...(truncated.truncated && { outputPath: truncated.outputPath }),
            },
          }
        }).pipe(Effect.orDie, Effect.withSpan("Tool.execute", { attributes: attrs }))
      }
      return toolInfo
    })
}

export function define<Parameters extends z.ZodType, Result extends Metadata, R, ID extends string = string>(
  id: ID,
  init: Effect.Effect<Init<Parameters, Result>, never, R>,
): Effect.Effect<Info<Parameters, Result>, never, R | Truncate.Service | Agent.Service> & { id: ID } {
  return Object.assign(
    Effect.gen(function* () {
      const resolved = yield* init
      const truncate = yield* Truncate.Service
      const agents = yield* Agent.Service
      return { id, init: wrap(id, resolved, truncate, agents) }
    }),
    { id },
  )
}

export function init<P extends z.ZodType, M extends Metadata>(info: Info<P, M>): Effect.Effect<Def<P, M>> {
  return Effect.gen(function* () {
    const init = yield* info.init()
    return {
      ...init,
      id: info.id,
    }
  })
}
