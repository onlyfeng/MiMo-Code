import { viewExecSubtools } from "../../src/tool/tool-script"
import { SessionPrefixSnapshot } from "../../src/session/prefix-snapshot"
import * as RunApproval from "../../src/session/run-approval"
import { Worktree } from "../../src/worktree"
import { NodeFileSystem } from "@effect/platform-node"
import { FetchHttpClient } from "effect/unstable/http"
import { asSchema, dynamicTool, jsonSchema, type Tool as AITool } from "ai"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect"
import * as Stream from "effect/Stream"
import { afterEach, describe, expect } from "bun:test"
import { ResumeTestHooks } from "../../src/session/resume-test-hooks"
import path from "path"
import { mkdir } from "fs/promises"
import { Agent as AgentSvc } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import { TuiEvent } from "../../src/cli/cmd/tui/event"
import { Command } from "../../src/command"
import { Config } from "../../src/config"
import { LSP } from "../../src/lsp"
import { MCP } from "../../src/mcp"
import { toolPresentationProgress } from "../../src/mcp/tool-progress"
import { Permission } from "../../src/permission"
import { Plugin } from "../../src/plugin"
import { Provider as ProviderSvc } from "../../src/provider"
import { Env } from "../../src/env"
import { Flag } from "../../src/flag/flag"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Question } from "../../src/question"
import { Todo } from "../../src/session/todo"
import { Session } from "../../src/session"
import { LLM } from "../../src/session/llm"
import { MessageV2 } from "../../src/session/message-v2"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { SessionPrune } from "../../src/session/prune"
import { SessionSummary } from "../../src/session/summary"
import { Instruction } from "../../src/session/instruction"
import { SessionProcessor } from "../../src/session/processor"
import { SessionCompaction } from "../../src/session/compaction"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionRevert } from "../../src/session/revert"
import { SessionRunState } from "../../src/session/run-state"
import { Goal } from "../../src/session/goal"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { SessionStatus } from "../../src/session/status"
import { Skill } from "../../src/skill"
import { SystemPrompt } from "../../src/session/system"
import { Shell } from "../../src/shell/shell"
import { Snapshot } from "../../src/snapshot"
import { ToolRegistry } from "../../src/tool"
import { Truncate } from "../../src/tool"
import { Actor } from "../../src/actor/spawn"
import { ActorRegistry } from "../../src/actor/registry"
import { ActorWaiter } from "../../src/actor/waiter"
import { spawnRef } from "../../src/actor/spawn-ref"
import { Memory } from "../../src/memory"
import { History } from "../../src/history"
import { Team } from "../../src/team"
import { SessionCheckpoint } from "../../src/session/checkpoint"
import { TaskRegistry } from "../../src/task/registry"
import { defaultLayer as SchedulerDefaultLayer } from "../../src/cron/scheduler"
import { Auth } from "../../src/auth"
import { Log } from "../../src/util"
import { Global } from "../../src/global"
import { EffectLogger } from "../../src/effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Ripgrep } from "../../src/file/ripgrep"
import { Format } from "../../src/format"
import { Instance } from "../../src/project/instance"
import { bunEval, provideTmpdirInstance, provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { reply, TestLLMServer } from "../lib/llm-server"
import { Inbox } from "../../src/inbox"
import { inboxServiceRef } from "../../src/inbox/inbox-ref"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { Metrics } from "../../src/metrics"
import { SessionPrefixSnapshotTable, SessionTable } from "../../src/session/session.sql"
import { Database, eq, NotFoundError } from "../../src/storage"
import { prefixCaptureRef } from "../../src/session/prefix-capture-ref"
import { checkpointPath } from "../../src/session/checkpoint-paths"
import { SyncEvent } from "../../src/sync"
import {
  currentMainHintToken,
  hintClaimBarrier,
  hintFirePostBarrier,
  hintGitProbeBarrier,
} from "../../src/session/prompt/uncommitted-hint"

void Log.init({ print: false })

const summary = Layer.succeed(
  SessionSummary.Service,
  SessionSummary.Service.of({
    summarize: () => Effect.void,
    diff: () => Effect.succeed([]),
    computeDiff: () => Effect.succeed([]),
  }),
)

const ref = {
  providerID: ProviderID.make("test"),
  modelID: ModelID.make("test-model"),
}
const mcpRef = {
  providerID: ProviderID.make("test"),
  modelID: ModelID.make("gpt-5-test"),
}

function namedErrorMessage(err: unknown): string {
  const data = (err as { data?: { message?: string } }).data
  return String(data?.message ?? (err as { message?: string }).message ?? err)
}

function defer<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/** [C001/C004] Barrier: work hits ResumeTestHooks seam, test injects, then releases. */
function resumeRaceBarrier() {
  let markReached!: () => void
  const reached = new Promise<void>((done) => {
    markReached = done
  })
  let release!: () => void
  const released = new Promise<void>((done) => {
    release = done
  })
  return {
    reached,
    release,
    hook: () =>
      Effect.sync(() => markReached()).pipe(Effect.flatMap(() => Effect.promise(() => released))),
  }
}

/**
 * Full persisted WithParts fingerprint (structuredClone) for zero-side-effect
 * assertions — includes parentID/time/error/finish/tokens and full tool.state.
 */
function messagePartSnapshot(msgs: Array<unknown>) {
  return structuredClone(msgs)
}

function withSh<A, E, R>(fx: () => Effect.Effect<A, E, R>) {
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const prev = process.env.SHELL
      process.env.SHELL = "/bin/sh"
      Shell.preferred.reset()
      return prev
    }),
    () => fx(),
    (prev) =>
      Effect.sync(() => {
        if (prev === undefined) delete process.env.SHELL
        else process.env.SHELL = prev
        Shell.preferred.reset()
      }),
  )
}

function dynamicSystemPrompt<A, E, R>(value: string | undefined, fx: () => Effect.Effect<A, E, R>) {
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const previous = process.env.MIMOCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT
      if (value === undefined) delete process.env.MIMOCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT
      else process.env.MIMOCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT = value
      return previous
    }),
    () => fx(),
    (previous) =>
      Effect.sync(() => {
        if (previous === undefined) delete process.env.MIMOCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT
        else process.env.MIMOCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT = previous
      }),
  )
}

const withoutDynamicSystemPrompt = <A, E, R>(fx: () => Effect.Effect<A, E, R>) => dynamicSystemPrompt(undefined, fx)
const withDynamicSystemPrompt = <A, E, R>(fx: () => Effect.Effect<A, E, R>) => dynamicSystemPrompt("true", fx)

function withCodexMode<A, E, R>(value: string, fx: () => Effect.Effect<A, E, R>) {
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const previous = process.env.MIMOCODE_CODEX_MODE
      process.env.MIMOCODE_CODEX_MODE = value
      return previous
    }),
    () => fx(),
    (previous) =>
      Effect.sync(() => {
        if (previous === undefined) delete process.env.MIMOCODE_CODEX_MODE
        else process.env.MIMOCODE_CODEX_MODE = previous
      }),
  )
}

function withInstructionsDisabled<A, E, R>(fx: () => Effect.Effect<A, E, R>) {
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const previous = process.env.MIMOCODE_DISABLE_INSTRUCTIONS
      process.env.MIMOCODE_DISABLE_INSTRUCTIONS = "true"
      return previous
    }),
    () => fx(),
    (previous) =>
      Effect.sync(() => {
        if (previous === undefined) delete process.env.MIMOCODE_DISABLE_INSTRUCTIONS
        else process.env.MIMOCODE_DISABLE_INSTRUCTIONS = previous
      }),
  )
}

function withMcpToolSearch<A, E, R>(fx: Effect.Effect<A, E, R>) {
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const previous = Flag.MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH
      Flag.MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH = true
      return previous
    }),
    () => fx,
    (previous) =>
      Effect.sync(() => {
        Flag.MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH = previous
      }),
  )
}

function toolPart(parts: MessageV2.Part[]) {
  return parts.find((part): part is MessageV2.ToolPart => part.type === "tool")
}

type CompletedToolPart = MessageV2.ToolPart & { state: MessageV2.ToolStateCompleted }
type ErrorToolPart = MessageV2.ToolPart & { state: MessageV2.ToolStateError }

function completedTool(parts: MessageV2.Part[]) {
  const part = toolPart(parts)
  expect(part?.state.status).toBe("completed")
  return part?.state.status === "completed" ? (part as CompletedToolPart) : undefined
}

function errorTool(parts: MessageV2.Part[]) {
  const part = toolPart(parts)
  expect(part?.state.status).toBe("error")
  return part?.state.status === "error" ? (part as ErrorToolPart) : undefined
}

function wireToolName(tool: Record<string, unknown>) {
  if (typeof tool.name === "string") return tool.name
  if (!tool.function || typeof tool.function !== "object" || !("name" in tool.function)) return
  return typeof tool.function.name === "string" ? tool.function.name : undefined
}

function wireToolDescription(tool: Record<string, unknown>) {
  if (typeof tool.description === "string") return tool.description
  if (!tool.function || typeof tool.function !== "object" || !("description" in tool.function)) return
  return typeof tool.function.description === "string" ? tool.function.description : undefined
}

function wireTool(tools: Array<Record<string, unknown>>, name: string) {
  return tools.find((item) => wireToolName(item) === name)
}

function mcpLayer(
  tools: (context?: MCP.TurnContext) => Record<string, AITool> = () => ({}),
  clients: () => Record<string, any> = () => ({}),
  input?: { resourceText?: string; readResource?: MCP.Interface["readResource"] },
) {
  return Layer.succeed(
    MCP.Service,
    MCP.Service.of({
      status: () => Effect.succeed({}),
      clients: () => Effect.sync(clients),
      tools: (context) => Effect.sync(() => tools(context)),
      prompts: () => Effect.succeed({}),
      resources: () => Effect.succeed({}),
      add: () => Effect.succeed({ status: { status: "disabled" as const } }),
      connect: () => Effect.void,
      disconnect: () => Effect.void,
      getPrompt: () => Effect.succeed(undefined),
      readResource: (clientName, resourceUri) =>
        input?.readResource
          ? input.readResource(clientName, resourceUri)
          : Effect.succeed(
              input?.resourceText
                ? ({ contents: [{ text: input.resourceText, uri: "mcp://large", mimeType: "text/plain" }] } as any)
                : undefined,
            ),
      startAuth: () => Effect.die("unexpected MCP auth in prompt-effect tests"),
      authenticate: () => Effect.die("unexpected MCP auth in prompt-effect tests"),
      finishAuth: () => Effect.die("unexpected MCP auth in prompt-effect tests"),
      removeAuth: () => Effect.void,
      supportsOAuth: () => Effect.succeed(false),
      hasStoredTokens: () => Effect.succeed(false),
      getAuthStatus: () => Effect.succeed("not_authenticated" as const),
    }),
  )
}
const mcp = mcpLayer()
const sessionTaskIDs = {
  pre: [] as Array<string | undefined>,
  post: [] as Array<string | undefined>,
}
let sessionPreGate:
  | {
      armed: boolean
      fail: boolean
      entered: Deferred.Deferred<void>
      release: Deferred.Deferred<void>
    }
  | undefined
let userQueryPostGate:
  | {
      armed: boolean
      entered: Deferred.Deferred<void>
      release: Deferred.Deferred<void>
    }
  | undefined
let compactionAutoContinueGate:
  | {
      armed: boolean
      entered: Deferred.Deferred<void>
      release: Deferred.Deferred<void>
    }
  | undefined
let userMessageCommitGate:
  | {
      arrivals: number
      entered: Deferred.Deferred<void>
      release: Deferred.Deferred<void>
    }
  | undefined
const taskMetadataPlugin = Layer.succeed(
  Plugin.Service,
  Plugin.Service.of({
    trigger: (name, input, output) =>
      Effect.gen(function* () {
        if (name === "session.pre" || name === "session.post") {
          sessionTaskIDs[name === "session.pre" ? "pre" : "post"].push((input as { task_id?: string }).task_id)
        }
        const gate = sessionPreGate
        if (name === "session.pre" && gate?.armed) {
          gate.armed = false
          yield* Deferred.succeed(gate.entered, undefined)
          yield* Deferred.await(gate.release)
          if (gate.fail) return yield* Effect.die(new Error("session.pre failed after a queued prompt joined"))
        }
        const queryGate = userQueryPostGate
        if (name === "session.userQuery.post" && queryGate?.armed) {
          queryGate.armed = false
          yield* Deferred.succeed(queryGate.entered, undefined)
          yield* Deferred.await(queryGate.release)
        }
        const compactionGate = compactionAutoContinueGate
        if (name === "experimental.compaction.autocontinue" && compactionGate?.armed) {
          compactionGate.armed = false
          yield* Deferred.succeed(compactionGate.entered, undefined)
          yield* Deferred.await(compactionGate.release)
        }
        const commitGate = userMessageCommitGate
        if (name === "chat.message" && commitGate) {
          commitGate.arrivals++
          if (commitGate.arrivals === 2) yield* Deferred.succeed(commitGate.entered, undefined)
          yield* Deferred.await(commitGate.release)
        }
        return output
      }),
    list: () => Effect.succeed([]),
    init: () => Effect.void,
    reloadFileHooks: () => Effect.void,
    triggerActorPreStop: () =>
      Effect.succeed({ continue: false, contributingPluginNames: [], contributingHookIDs: [] }),
    triggerActorPostStop: () =>
      Effect.succeed({ continue: false, contributingPluginNames: [], contributingHookIDs: [] }),
  }),
)

const lsp = Layer.succeed(
  LSP.Service,
  LSP.Service.of({
    init: () => Effect.void,
    status: () => Effect.succeed([]),
    hasClients: () => Effect.succeed(false),
    touchFile: () => Effect.void,
    diagnostics: () => Effect.succeed({}),
    hover: () => Effect.succeed(undefined),
    definition: () => Effect.succeed([]),
    references: () => Effect.succeed([]),
    implementation: () => Effect.succeed([]),
    documentSymbol: () => Effect.succeed([]),
    workspaceSymbol: () => Effect.succeed([]),
    prepareCallHierarchy: () => Effect.succeed([]),
    incomingCalls: () => Effect.succeed([]),
    outgoingCalls: () => Effect.succeed([]),
  }),
)

const status = SessionStatus.layer.pipe(Layer.provideMerge(Bus.layer))
const baseRun = SessionRunState.layer.pipe(Layer.provide(status))
let lateRunGate:
  | {
      sessionID: SessionID
      actorID: string
      ownerArmed: boolean
      followerArmed: boolean
      ownerExit: Deferred.Deferred<void>
      releaseOwner: Deferred.Deferred<void>
      followerAttached: Deferred.Deferred<void>
    }
  | undefined
let disposalRetryGate:
  | {
      sessionID: SessionID
      actorID: string
      started: Deferred.Deferred<void>
      entered: Deferred.Deferred<void>
      release: Deferred.Deferred<void>
      armed: boolean
    }
  | undefined
let droppedStartGate:
  | {
      sessionID: SessionID
      actorID: string
      armed: boolean
    }
  | undefined

const holdNextRunAtExit = Effect.fnUntraced(function* (sessionID: SessionID, actorID = "main") {
  const gate = {
    sessionID,
    actorID,
    ownerArmed: true,
    followerArmed: true,
    ownerExit: yield* Deferred.make<void>(),
    releaseOwner: yield* Deferred.make<void>(),
    followerAttached: yield* Deferred.make<void>(),
  }
  lateRunGate = gate
  yield* Effect.addFinalizer(() => Deferred.succeed(gate.releaseOwner, undefined).pipe(Effect.ignore))
  return gate
})

const armNextRunFollower = Effect.fnUntraced(function* (sessionID: SessionID, actorID = "main") {
  const followerAttached = yield* Deferred.make<void>()
  lateRunGate = {
    sessionID,
    actorID,
    ownerArmed: false,
    followerArmed: true,
    ownerExit: yield* Deferred.make<void>(),
    releaseOwner: yield* Deferred.make<void>(),
    followerAttached,
  }
  return followerAttached
})

const holdNextSessionPre = Effect.fnUntraced(function* (fail = false) {
  const gate = {
    armed: true,
    fail,
    entered: yield* Deferred.make<void>(),
    release: yield* Deferred.make<void>(),
  }
  sessionPreGate = gate
  yield* Effect.addFinalizer(() => Deferred.succeed(gate.release, undefined).pipe(Effect.ignore))
  return gate
})

const holdNextUserQueryPost = Effect.fnUntraced(function* () {
  const gate = {
    armed: true,
    entered: yield* Deferred.make<void>(),
    release: yield* Deferred.make<void>(),
  }
  userQueryPostGate = gate
  yield* Effect.addFinalizer(() => Deferred.succeed(gate.release, undefined).pipe(Effect.ignore))
  return gate
})

const run = Layer.effect(
  SessionRunState.Service,
  Effect.gen(function* () {
    const state = yield* SessionRunState.Service
    return SessionRunState.Service.of({
      ...state,
      startOwned: (sessionID, actorID, onInterrupt, work) => {
        const gate = droppedStartGate
        if (!gate?.armed || gate.sessionID !== sessionID || gate.actorID !== actorID)
          return state.startOwned(sessionID, actorID, onInterrupt, work)
        gate.armed = false
        return Effect.succeed({ runId: 0, interruptOwned: Effect.void, completion: onInterrupt })
      },
      ensureRunning: (sessionID, actorID, onInterrupt, work, joinRunning) => {
        const disposal = disposalRetryGate
        if (disposal?.armed && disposal.sessionID === sessionID && disposal.actorID === actorID) {
          disposal.armed = false
          return state.ensureRunning(
            sessionID,
            actorID,
            onInterrupt.pipe(
              Effect.tap(() => Deferred.succeed(disposal.entered, undefined)),
              Effect.tap(() => Deferred.await(disposal.release)),
            ),
            Deferred.succeed(disposal.started, undefined).pipe(Effect.andThen(Effect.never)),
          )
        }
        const gate = lateRunGate
        if (!gate || gate.sessionID !== sessionID || gate.actorID !== actorID) {
          return state.ensureRunning(sessionID, actorID, onInterrupt, work, joinRunning)
        }
        if (gate.ownerArmed) {
          gate.ownerArmed = false
          return state.ensureRunning(
            sessionID,
            actorID,
            onInterrupt,
            work.pipe(
              Effect.ensuring(
                Deferred.succeed(gate.ownerExit, undefined).pipe(Effect.andThen(Deferred.await(gate.releaseOwner))),
              ),
            ),
          )
        }
        if (gate.followerArmed) {
          gate.followerArmed = false
          return Effect.gen(function* () {
            const fiber = yield* Effect.forkChild(state.ensureRunning(sessionID, actorID, onInterrupt, work, joinRunning), {
              startImmediately: true,
            })
            yield* Deferred.succeed(gate.followerAttached, undefined)
            return yield* Fiber.join(fiber)
          })
        }
        return state.ensureRunning(sessionID, actorID, onInterrupt, work, joinRunning)
      },
    })
  }),
).pipe(Layer.provide(baseRun))
afterEach(() => {
  lateRunGate = undefined
  disposalRetryGate = undefined
  droppedStartGate = undefined
  sessionPreGate = undefined
  userQueryPostGate = undefined
  compactionAutoContinueGate = undefined
  userMessageCommitGate = undefined
  sessionTaskIDs.pre.length = 0
  sessionTaskIDs.post.length = 0
})
const infra = Layer.mergeAll(NodeFileSystem.layer, CrossSpawnSpawner.defaultLayer)
function makeHttp(
  mcpService = mcp,
  input?: { actor?: boolean; plugin?: Layer.Layer<Plugin.Service>; provider?: typeof ProviderSvc.defaultLayer },
) {
  const plugin = input?.plugin ?? Plugin.defaultLayer
  const providerLayer = input?.provider ?? ProviderSvc.defaultLayer
  const taskRegistry = ActorRegistry.defaultLayer
  const deps = Layer.mergeAll(
    Session.defaultLayer,
    Snapshot.defaultLayer,
    LLM.defaultLayer,
    Env.defaultLayer,
    AgentSvc.defaultLayer,
    Command.defaultLayer,
    Permission.defaultLayer,
    plugin,
    Config.defaultLayer,
    providerLayer,
    lsp,
    mcpService,
    AppFileSystem.defaultLayer,
    status,
    taskRegistry,
  ).pipe(Layer.provideMerge(infra))
  const question = Question.layer.pipe(Layer.provideMerge(deps))
  const todo = Todo.layer.pipe(Layer.provideMerge(deps))
  const checkpoint = SessionCheckpoint.layer.pipe(
    Layer.provide(Session.defaultLayer),
    Layer.provide(Bus.layer),
    Layer.provide(Config.defaultLayer),
    Layer.provide(Memory.defaultLayer),
    Layer.provide(History.defaultLayer),
    Layer.provide(TaskRegistry.defaultLayer),
    Layer.provide(SchedulerDefaultLayer),
    Layer.provide(taskRegistry),
  )
  const taskWaiter = ActorWaiter.layer.pipe(Layer.provide(Bus.layer), Layer.provide(taskRegistry))
  const team = Team.defaultLayer
  const registry = ToolRegistry.layer.pipe(
    Layer.provide(Worktree.defaultLayer),
    Layer.provide(Skill.defaultLayer),
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(CrossSpawnSpawner.defaultLayer),
    Layer.provide(Ripgrep.defaultLayer),
    Layer.provide(Format.defaultLayer),
    Layer.provide(taskRegistry),
    Layer.provide(taskWaiter),
    Layer.provide(team),
    Layer.provide(checkpoint),
    Layer.provide(Memory.defaultLayer),
    Layer.provide(History.defaultLayer),
    Layer.provide(TaskRegistry.defaultLayer),
    Layer.provide(SchedulerDefaultLayer),
    Layer.provide(Auth.defaultLayer),
    Layer.provideMerge(todo),
    Layer.provideMerge(question),
    Layer.provideMerge(deps),
  )
  const prune = SessionPrune.layer.pipe(
    Layer.provide(checkpoint),
    Layer.provide(taskRegistry),
    Layer.provideMerge(deps),
  )
  const proc = SessionProcessor.layer.pipe(Layer.provide(summary), Layer.provideMerge(deps))
  const compaction = SessionCompaction.layer.pipe(
    Layer.provideMerge(proc),
    Layer.provide(AgentSvc.defaultLayer),
    Layer.provide(plugin),
    Layer.provideMerge(deps),
  )
  const trunc = Truncate.layer.pipe(Layer.provideMerge(deps))
  const prompt = SessionPrompt.layer.pipe(
    Layer.provide(Goal.defaultLayer),
    Layer.provide(TaskRegistry.defaultLayer),
    Layer.provide(SchedulerDefaultLayer),
    Layer.provide(SessionRevert.defaultLayer),
    Layer.provide(summary),
    Layer.provide(checkpoint),
    Layer.provide(team),
    Layer.provide(taskRegistry),
    Layer.provideMerge(run),
    Layer.provideMerge(prune),
    Layer.provideMerge(compaction),
    Layer.provideMerge(proc),
    Layer.provideMerge(registry),
    Layer.provideMerge(trunc),
    Layer.provide(Instruction.defaultLayer),
    Layer.provide(SystemPrompt.defaultLayer),
    Layer.provide(Inbox.defaultLayer),
    Layer.provideMerge(deps),
  )
  const actor = Actor.layer.pipe(
    Layer.provideMerge(prompt),
    Layer.provideMerge(taskRegistry),
    Layer.provide(TaskRegistry.defaultLayer),
    Layer.provideMerge(Inbox.defaultLayer),
  )
  if (input?.actor) return Layer.mergeAll(TestLLMServer.layer, prompt, actor).pipe(Layer.provide(summary))
  return Layer.mergeAll(TestLLMServer.layer, prompt).pipe(Layer.provide(summary))
}

const it = testEffect(Layer.provideMerge(makeHttp(), EffectLogger.layer))
const itActor = testEffect(makeHttp(mcp, { actor: true }))
const longMcpResourceText = "x".repeat(60 * 1024)
const itMcp = testEffect(
  makeHttp(
    mcpLayer(
      () => ({}),
      () => ({}),
      { resourceText: longMcpResourceText },
    ),
  ),
)
const admissionResourceStarted = defer<void>()
const admissionResourceRelease = defer<void>()
const admissionMcpIt = testEffect(
  makeHttp(
    mcpLayer(
      () => ({}),
      () => ({}),
      {
        readResource: () =>
          Effect.promise(async () => {
            admissionResourceStarted.resolve()
            await admissionResourceRelease.promise
            return { contents: [{ text: "admitted resource", uri: "mcp://admission", mimeType: "text/plain" }] }
          }),
      },
    ),
  ),
)
const failedAdmissionResourceStarted = defer<void>()
const failedAdmissionResourceRelease = defer<void>()
const failedAdmissionMcpIt = testEffect(
  makeHttp(
    mcpLayer(
      () => ({}),
      () => ({}),
      {
        readResource: () =>
          Effect.promise(async () => {
            failedAdmissionResourceStarted.resolve()
            await failedAdmissionResourceRelease.promise
            return undefined
          }),
      },
    ),
  ),
)
function controlledAdmission(result: "success" | "failure") {
  return { result, started: defer<void>(), release: defer<void>() }
}
const concurrentAdmissionControls = {
  "mcp://same-actor-success": controlledAdmission("success"),
  "mcp://same-actor-failure": controlledAdmission("failure"),
  "mcp://peer-admission": controlledAdmission("success"),
  "mcp://post-insert": controlledAdmission("success"),
  "mcp://cancelled-admission": controlledAdmission("success"),
}
const concurrentAdmissionMcp = mcpLayer(
  () => ({}),
  () => ({}),
  {
    readResource: (_, uri) => {
      const control = concurrentAdmissionControls[uri as keyof typeof concurrentAdmissionControls]
      if (!control) return Effect.die(`Unexpected controlled admission URI: ${uri}`)
      return Effect.promise(async () => {
        control.started.resolve()
        await control.release.promise
        if (control.result === "failure") return undefined
        return { contents: [{ text: `admitted ${uri}`, uri, mimeType: "text/plain" }] }
      })
    },
  },
)
const concurrentAdmissionMcpIt = testEffect(makeHttp(concurrentAdmissionMcp))
const postInsertAdmissionMcpIt = testEffect(makeHttp(concurrentAdmissionMcp, { plugin: taskMetadataPlugin }))

const taskMetadataIt = testEffect(makeHttp(mcp, { plugin: taskMetadataPlugin }))
const mcpLegacyMetadata = { interrupted: true, output: "must not become a successful result" }
const mcpErrorImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
const mcpErrorAudio = "UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA"
const mcpErrorBinary = "AQIDBAUGBwgJ"
const mcpErrorImageURL = `data:image/png;base64,${mcpErrorImage}`
const mcpErrorResult: CallToolResult = {
  content: [
    { type: "text", text: "Message was not sent" },
    { type: "image", data: mcpErrorImage, mimeType: "image/png" },
    {
      type: "resource",
      resource: {
        uri: "mcp://diagnostic.txt",
        text: "Resource diagnostic",
        mimeType: "text/plain",
      },
    },
    { type: "audio", data: mcpErrorAudio, mimeType: "audio/wav" },
    {
      type: "resource",
      resource: {
        uri: "mcp://diagnostic.bin",
        blob: mcpErrorBinary,
      },
    },
  ],
  structuredContent: { sent: false, reason: "composer rejected the request" },
  isError: true,
  _meta: { privateToken: "do-not-send-to-model" },
  metadata: mcpLegacyMetadata,
}
const mcpSuccessResult: CallToolResult = {
  content: [{ type: "text", text: "Window updated" }],
  structuredContent: { changed: true, windowID: 42 },
  _meta: { privateToken: "success-meta-is-client-only" },
}
const mcpIt = testEffect(
  makeHttp(
    mcpLayer(() => ({
      mcp_success: dynamicTool({
        description: "Return a standard structured MCP success result",
        inputSchema: jsonSchema({
          type: "object",
          properties: {
            private_window_id: { type: "number", description: "Secret nested MCP window selector" },
          },
          additionalProperties: false,
        }),
        execute: async () => mcpSuccessResult,
      }),
      mcp_result: dynamicTool({
        description: "Return a standard MCP tool execution error",
        inputSchema: jsonSchema({
          type: "object",
          properties: {
            private_error_code: { type: "string", description: "Secret nested MCP error selector" },
          },
          additionalProperties: false,
        }),
        execute: async () => mcpErrorResult,
      }),
    })),
  ),
)
const largeSchemaMcpIt = testEffect(
  makeHttp(
    mcpLayer(() => ({
      mcp_large: dynamicTool({
        description: "Example large schema",
        inputSchema: jsonSchema({
          type: "object",
          properties: { value: { type: "string", description: "x".repeat(1024 * 1024) } },
        }),
        execute: async () => ({ content: [{ type: "text", text: "ok" }] }),
      }),
    })),
  ),
)
const mcpProgressIt = testEffect(
  makeHttp(
    mcpLayer(() => ({
      mcp_progress: dynamicTool({
        description: "Report presentation progress",
        inputSchema: jsonSchema({ type: "object", properties: {} }),
        execute: async (_args, options) => {
          const progress = toolPresentationProgress(options.experimental_context)
          progress.update({ _meta: { "mimo/toolSurface": { kind: "browserUse", browserId: "private-browser" } } })
          await progress.drain()
          return { content: [{ type: "text", text: "finished" }], _meta: { final: "private-final" } }
        },
      }),
    })),
  ),
)
const unserializablePreflightIt = testEffect(
  makeHttp(mcp, {
    plugin: Layer.effect(
      Plugin.Service,
      Effect.gen(function* () {
        const plugin = yield* Plugin.Service
        return Plugin.Service.of({
          ...plugin,
          trigger: (name, input, output) => {
            if (name === "experimental.chat.messages.transform") {
              const messages = (output as { messages: MessageV2.WithParts[] }).messages
              for (const message of messages) {
                if (message.info.role !== "assistant") continue
                for (const part of message.parts) {
                  if (part.type === "text") part.metadata = { test: { value: 1n } }
                }
              }
            }
            return plugin.trigger(name, input, output)
          },
        })
      }),
    ).pipe(Layer.provide(taskMetadataPlugin)),
  }),
)

const lifecycleContexts: MCP.TurnContext[] = []
const lifecycleNotifications: Array<Record<string, any>> = []
let lifecycleNotificationHangs = false
let lifecycleToolStarted: Deferred.Deferred<void> | undefined
let lifecycleToolGate: Deferred.Deferred<void> | undefined
const lifecycleClient = {
  getServerCapabilities: () => ({
    experimental: { "com.xiaomi.mimo/turn-lifecycle": { version: 1 } },
  }),
  notification: async (notification: Record<string, any>) => {
    if (lifecycleNotificationHangs) return new Promise<void>(() => {})
    lifecycleNotifications.push(notification)
  },
}
const lifecycleMcpIt = testEffect(
  makeHttp(
    mcpLayer(
      (context) => ({
        mcp_lifecycle: dynamicTool({
          description: "Record lifecycle context",
          inputSchema: jsonSchema({
            type: "object",
            properties: { index: { type: "number" } },
            required: ["index"],
          }),
          execute: async () => {
            if (context) lifecycleContexts.push(context)
            if (lifecycleToolStarted) Effect.runSync(Deferred.succeed(lifecycleToolStarted, undefined))
            if (lifecycleToolGate) await Effect.runPromise(Deferred.await(lifecycleToolGate))
            return { content: [{ type: "text", text: "ok" }] }
          },
        }),
      }),
      () => ({ lifecycle: lifecycleClient }),
    ),
  ),
)
const unix = process.platform !== "win32" ? it.live : it.live.skip

// Config that registers a custom "test" provider with a "test-model" model
// so provider model lookup succeeds inside the loop.
const cfg = {
  checkpoint: { thresholds: [] as string[] },
  provider: {
    test: {
      name: "Test",
      id: "test",
      env: [],
      npm: "@ai-sdk/openai-compatible",
      models: {
        "test-model": {
          id: "test-model",
          name: "Test Model",
          attachment: false,
          reasoning: false,
          temperature: false,
          tool_call: true,
          release_date: "2025-01-01",
          limit: { context: 100000, output: 10000 },
          cost: { input: 0, output: 0 },
          options: {},
        },
        "gpt-5-test": {
          id: "gpt-5-test",
          name: "GPT 5 Test",
          attachment: false,
          reasoning: false,
          temperature: false,
          tool_call: true,
          release_date: "2025-01-01",
          // GPT-family defaults reserve up to 53K; MCP tests need room for the GPT tool prefix.
          limit: { context: 200_000, output: 128_000 },
          cost: { input: 0, output: 0 },
          options: {},
        },
      },
      options: {
        apiKey: "test-key",
        baseURL: "http://localhost:1/v1",
      },
    },
  },
}

function providerCfg(url: string) {
  return {
    ...cfg,
    provider: {
      ...cfg.provider,
      test: {
        ...cfg.provider.test,
        options: {
          ...cfg.provider.test.options,
          baseURL: url,
        },
      },
    },
  }
}

function catalogPressureProviderCfg(url: string) {
  return {
    ...providerCfg(url),
    // Keep the request on the wire and pin the pressure budget so this test observes catalog degradation.
    // contextPressureLevel remains policy-independent while compat preflight
    // intentionally skips recovery when automatic compaction is disabled.
    compaction: { auto: false, max_context: 100_000 },
  }
}

function preflightOverflowCfg(url: string) {
  const base = providerCfg(url)
  return {
    ...base,
    provider: {
      ...base.provider,
      test: {
        ...base.provider.test,
        models: {
          ...base.provider.test.models,
          "test-model": {
            ...base.provider.test.models["test-model"],
            limit: { context: 1000, output: 100 },
          },
        },
      },
    },
  }
}

function staticPreflightOverflowCfg(url: string) {
  const base = providerCfg(url)
  return {
    ...base,
    provider: {
      ...base.provider,
      test: {
        ...base.provider.test,
        models: {
          ...base.provider.test.models,
          "test-model": {
            ...base.provider.test.models["test-model"],
            limit: { context: 16_000, output: 1_000 },
          },
        },
      },
    },
  }
}

function recoverableOverflowCfg(url: string) {
  const base = providerCfg(url)
  return {
    ...base,
    // Keep recovery deterministic in preflight tests: without a writable
    // checkpoint, the main path uses its single compaction fallback directly.
    memory: { disable_write: true },
    provider: {
      ...base.provider,
      test: {
        ...base.provider.test,
        models: {
          ...base.provider.test.models,
          "test-model": {
            ...base.provider.test.models["test-model"],
            // Large enough that the static prefix (system + tool schemas) fits well
            // under the usable window, so only an oversized message trips preflight —
            // a recoverable overflow that routes to compaction, not an unrecoverable
            // static-prefix overflow.
            limit: { context: 120_000, output: 1_000 },
          },
        },
      },
    },
  }
}

function checkpointRecoveryOverflowCfg(url: string) {
  return {
    ...recoverableOverflowCfg(url),
    memory: { disable_write: false },
  }
}

function stalledForkRecoveryCfg(url: string) {
  const base = providerCfg(url)
  return {
    ...base,
    provider: {
      ...base.provider,
      test: {
        ...base.provider.test,
        models: {
          ...base.provider.test.models,
          "test-model": {
            ...base.provider.test.models["test-model"],
            // Summary replay is capped at 50 KiB (about 17K estimated tokens).
            // Keep it above the 16.2K ratio threshold so repeated summaries
            // still exercise recovery without progress after that cap applies.
            limit: { context: 18_000, output: 1_000 },
          },
        },
      },
    },
  }
}

function maxModeProviderCfg(url: string) {
  return {
    ...providerCfg(url),
    experimental: {
      maxMode: { candidates: 2 },
    },
    agent: {
      general: {
        maxMode: true,
        model: "test/test-model",
      },
    },
  }
}

function maxModeLastStepProviderCfg(url: string) {
  return {
    ...maxModeProviderCfg(url),
    agent: {
      general: {
        maxMode: true,
        steps: 1,
        model: "test/test-model",
      },
    },
  }
}

function builtInMaxModeLastStepProviderCfg(url: string) {
  return {
    ...providerCfg(url),
    experimental: {
      maxMode: { candidates: 2 },
    },
    agent: {
      max: {
        steps: 1,
      },
    },
  }
}

function noToolProviderCfg(url: string) {
  const config = providerCfg(url)
  return {
    ...config,
    provider: {
      ...config.provider,
      test: {
        ...config.provider.test,
        models: {
          ...config.provider.test.models,
          "test-model": { ...config.provider.test.models["test-model"], tool_call: false },
          "gpt-5-test": { ...config.provider.test.models["gpt-5-test"], tool_call: false },
        },
      },
    },
  }
}

function restrictedAgentProviderCfg(url: string) {
  return {
    ...providerCfg(url),
    agent: {
      restricted: {
        mode: "primary" as const,
        tool_allowlist: ["mcp_success"],
      },
    },
  }
}

function mediaProviderCfg(url: string) {
  const config = providerCfg(url)
  return {
    ...config,
    provider: {
      ...config.provider,
      test: {
        ...config.provider.test,
        models: {
          ...config.provider.test.models,
          "test-model": {
            ...config.provider.test.models["test-model"],
            attachment: true,
            modalities: {
              input: ["text", "image", "audio"] as ("text" | "image" | "audio")[],
              output: ["text"] as "text"[],
            },
          },
          "gpt-5-test": {
            ...config.provider.test.models["gpt-5-test"],
            attachment: true,
            modalities: {
              input: ["text", "image", "audio"] as ("text" | "image" | "audio")[],
              output: ["text"] as "text"[],
            },
          },
        },
      },
    },
  }
}

function gptProviderCfg(url: string) {
  return {
    checkpoint: { thresholds: [] as string[] },
    provider: {
      openai: {
        name: "OpenAI",
        env: [],
        npm: "@ai-sdk/openai",
        models: {
          "gpt-5.2": {
            id: "gpt-5.2",
            name: "GPT 5.2",
            attachment: false,
            reasoning: true,
            temperature: false,
            tool_call: true,
            release_date: "2025-01-01",
            limit: { context: 100000, output: 10000 },
            cost: { input: 0, output: 0 },
            options: {},
          },
        },
        options: { apiKey: "test-key", baseURL: url },
      },
    },
  }
}

const user = Effect.fn("test.user")(function* (sessionID: SessionID, text: string, agent = "build") {
  const session = yield* Session.Service
  const msg = yield* session.updateMessage({
    id: MessageID.ascending(),
    role: "user",
    sessionID,
    agent,
    model: ref,
    time: { created: Date.now() },
  })
  yield* session.updatePart({
    id: PartID.ascending(),
    messageID: msg.id,
    sessionID,
    type: "text",
    text,
  })
  return msg
})

const seed = Effect.fn("test.seed")(function* (sessionID: SessionID, opts?: { finish?: string }) {
  const session = yield* Session.Service
  const msg = yield* user(sessionID, "hello")
  const assistant: MessageV2.Assistant = {
    id: MessageID.ascending(),
    role: "assistant",
    parentID: msg.id,
    sessionID,
    mode: "build",
    agent: "build",
    cost: 0,
    path: { cwd: "/tmp", root: "/tmp" },
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    modelID: ref.modelID,
    providerID: ref.providerID,
    time: { created: Date.now() },
    ...(opts?.finish ? { finish: opts.finish } : {}),
  }
  yield* session.updateMessage(assistant)
  yield* session.updatePart({
    id: PartID.ascending(),
    messageID: assistant.id,
    sessionID,
    type: "text",
    text: "hi there",
  })
  return { user: msg, assistant }
})

const addSubtask = (sessionID: SessionID, messageID: MessageID, model = ref) =>
  Effect.gen(function* () {
    const session = yield* Session.Service
    yield* session.updatePart({
      id: PartID.ascending(),
      messageID,
      sessionID,
      type: "subtask",
      prompt: "look into the cache key path",
      description: "inspect bug",
      agent: "general",
      model,
    })
  })

const boot = Effect.fn("test.boot")(function* (input?: { title?: string }) {
  const prompt = yield* SessionPrompt.Service
  const run = yield* SessionRunState.Service
  const sessions = yield* Session.Service
  const chat = yield* sessions.create(input ?? { title: "Pinned" })
  return { prompt, run, sessions, chat }
})

// Loop semantics

it.live("loop exits immediately when last assistant has stop finish", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Pinned" })
      yield* seed(chat.id, { finish: "stop" })

      const result = yield* prompt.loop({ sessionID: chat.id })
      expect(result.info.role).toBe("assistant")
      if (result.info.role === "assistant") expect(result.info.finish).toBe("stop")
      expect(yield* llm.calls).toBe(0)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("loop calls LLM and returns assistant message", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({
        title: "Pinned",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "hello" }],
      })
      yield* llm.text("world")

      const result = yield* prompt.loop({ sessionID: chat.id })
      expect(result.info.role).toBe("assistant")
      const parts = result.parts.filter((p) => p.type === "text")
      expect(parts.some((p) => p.type === "text" && p.text === "world")).toBe(true)
      expect(yield* llm.hits).toHaveLength(1)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live(
  "a stale length result does not continue for a newer reverse-ID user",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Length handoff" })
        const seeded = yield* seed(chat.id, { finish: "length" })
        yield* sessions.updateMessage({
          ...seeded.assistant,
          time: { ...seeded.assistant.time, completed: Date.now() },
        })
        yield* Effect.sleep("2 millis")
        const nextID = MessageID.ascending("msg_00000000000000000000000010")
        yield* prompt.prompt({
          sessionID: chat.id,
          messageID: nextID,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "new task" }],
        })
        yield* llm.text("new answer")

        const result = yield* prompt.loop({ sessionID: chat.id })

        expect(yield* llm.calls).toBe(1)
        expect(result.info.role === "assistant" ? result.info.parentID : undefined).toBe(nextID)
        expect(JSON.stringify((yield* llm.inputs)[0]?.messages)).not.toContain("output token limit")
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live(
  "does not append an output-length continuation after a newer user commits at the write boundary",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Atomic length continuation" })
        const seeded = yield* seed(chat.id, { finish: "length" })
        yield* sessions.updateMessage({
          ...seeded.assistant,
          time: { ...seeded.assistant.time, completed: Date.now() },
        })

        const next: MessageV2.User = {
          id: MessageID.ascending(),
          sessionID: chat.id,
          role: "user",
          time: { created: Date.now() },
          agent: "build",
          model: ref,
          source: "user",
        }
        const nextPart: MessageV2.TextPart = {
          id: PartID.ascending(),
          sessionID: chat.id,
          messageID: next.id,
          type: "text",
          text: "new prompt at the continuation boundary",
        }
        const ascendingDescriptor = Object.getOwnPropertyDescriptor(MessageID, "ascending")!
        const ascending = MessageID.ascending
        let armed = false
        Object.defineProperty(MessageID, "ascending", {
          ...ascendingDescriptor,
          value: (id?: string) => {
            const messageID = ascending(id)
            armed = true
            return messageID
          },
        })
        const db = Database.Client()
        const descriptor = Object.getOwnPropertyDescriptor(db, "transaction")
        const transaction = db.transaction.bind(db)
        let injected = false
        const intercepted: typeof db.transaction = (callback, config) => {
          if (armed && !injected) {
            injected = true
            SyncEvent.run(MessageV2.Event.Updated, { sessionID: chat.id, info: next })
            SyncEvent.run(MessageV2.Event.PartUpdated, {
              sessionID: chat.id,
              part: nextPart,
              time: Date.now(),
            })
          }
          return transaction(callback, config)
        }
        db.transaction = intercepted
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            Object.defineProperty(MessageID, "ascending", ascendingDescriptor)
            descriptor
              ? Object.defineProperty(db, "transaction", descriptor)
              : Reflect.deleteProperty(db, "transaction")
          }),
        )

        yield* llm.text("old turn completed")
        yield* prompt.loop({ sessionID: chat.id })

        const messages = yield* sessions.messages({ sessionID: chat.id })
        expect(injected).toBe(true)
        expect(messages.findLast((message) => message.info.role === "user")?.info.id).toBe(next.id)
        expect(
          messages.some((message) =>
            message.parts.some(
              (part) => part.type === "text" && part.synthetic && part.text.includes("output token limit"),
            ),
          ),
        ).toBe(false)
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

// [TP-R1-01][TP-R4-01][TP-R4-02][TP-R3-01][TP-R7-01] uncommitted-hint integration.
it.live("[TP-R1-01][TP-R4-02][TP-R7-01] uncommitted-hint dirty USER turn produces a synthetic hint", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: true } },
      })
      try {
        const chat = yield* sessions.create({
          title: "uh-on",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        // Queue user-turn reply AND hook follow-up reply before prompt so inject path has LLM.
        yield* llm.text("done without commit")
        yield* llm.text("will commit next")
        const original = yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          source: "user",
          variant: "high",
          parts: [{ type: "text", text: "please edit dirty work" }],
        })
        expect(original.parts.some((part) => part.type === "text" && part.text === "done without commit")).toBe(true)
        // A hint starts its own busy turn after the original caller settles.
        // Observe that turn's completion rather than treating a fixed delay as idle.
        yield* Effect.gen(function* () {
          const status = yield* SessionStatus.Service
          while (true) {
            const messages = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
            if (messages.some((message) => message.info.role === "assistant" && message.parts.some(
              (part) => part.type === "text" && part.text === "will commit next",
            )) && (yield* status.get(chat.id)).type === "idle") return
            yield* Effect.sleep("20 millis")
          }
        }).pipe(Effect.timeout("10 seconds"))
        const msgs = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const hintUsers = msgs.filter(
          (m) =>
            m.info.role === "user" &&
            m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
        )
        expect(hintUsers.length).toBe(1)
        const hintInfo = hintUsers[0]!.info
        if (hintInfo.role !== "user") throw new Error("expected user hint message")
        // R002: variant lives on model.variant, matching MessageV2.User DTO.
        expect(hintInfo.model.variant).toBe("high")
        expect(hintInfo).not.toHaveProperty("variant")
        const hintParts = hintUsers[0]!.parts.filter((p) => p.type === "text")
        expect(hintParts.some((p) => p.type === "text" && String(p.text).includes(" M dirty.txt") || String((p as { text?: string }).text ?? "").includes("dirty.txt"))).toBe(true)
        // Settlement of the original user turn is not blocked by hint inject.
        const statusSvc = yield* SessionStatus.Service
        const settled = yield* statusSvc.get(chat.id)
        expect(settled.type).toBe("idle")
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
      }
    }),
    { git: true, config: providerCfg },
  ),
  20_000,
)

// [TP-R4-02] Re-hint while dirty: cancel during hook follow-up does not late-inject;
// a later dirty USER turn may inject again (no session-once hard cap).
it.live("[TP-R4-02] uncommitted-hint cancel hook turn then dirty USER turn re-hints", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: true } },
      })
      const countHints = Effect.fn("test.countUhHints")(function* (sessionID: SessionID) {
        const msgs = yield* sessions.messages({ sessionID, agentID: "main" })
        return msgs.filter((m) =>
          m.parts.some(
            (p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes"),
          ),
        ).length
      })
      try {
        const chat = yield* sessions.create({
          title: "uh-rehint-cancel",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        // User turn completes; the NEXT queued reply (hook follow-up) hangs until cancel.
        yield* llm.text("done without commit")
        yield* llm.hang
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          source: "user",
          parts: [{ type: "text", text: "dirty work first" }],
        })
        // Hint injects then hook runLoop requests LLM → hang reply (not empty-queue auto-ok).
        yield* Effect.sleep("1500 millis")
        expect(yield* countHints(chat.id)).toBe(1)
        yield* llm.wait(2)
        const status = yield* SessionStatus.Service
        const during = yield* status.get(chat.id)
        expect(during.type).toBe("busy")
        yield* prompt.cancel(chat.id)
        yield* Effect.sleep("300 millis")
        // Second USER turn while workspace still dirty — re-hint is allowed.
        yield* llm.text("second turn done")
        yield* llm.hang
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          source: "user",
          parts: [{ type: "text", text: "still dirty" }],
        })
        yield* Effect.sleep("2000 millis")
        // 1 (first inject) + 1 (second dirty user turn) = 2
        expect(yield* countHints(chat.id)).toBe(2)
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
      }
    }),
    { git: true, config: providerCfg },
  ),
  20_000,
)

it.live("[TP-R3-01][TP-R4-01][TP-R7-01] uncommitted-hint disabled USER turn does not inject", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: false } },
      })
      try {
        const chat = yield* sessions.create({
          title: "uh-off",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("ok")
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          source: "user",
          parts: [{ type: "text", text: "dirty work" }],
        })
        yield* Effect.sleep("1200 millis")
        const msgs = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const hints = msgs.filter((m) =>
          m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
        )
        expect(hints).toHaveLength(0)
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
      }
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("[TP-R4-01][TP-R7-01] uncommitted-hint enabled + hook-source turn does not inject", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: true } },
      })
      try {
        const chat = yield* sessions.create({
          title: "uh-hook",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("hook reply")
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          source: "hook",
          parts: [{ type: "text", text: "machine task", synthetic: true }],
        })
        yield* Effect.sleep("1200 millis")
        const msgs = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const hints = msgs.filter((m) =>
          m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
        )
        expect(hints).toHaveLength(0)
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
      }
    }),
    { git: true, config: providerCfg },
  ),
)

// R003: root-session machine contract — hook + provenance accepts machine payloads.
const machineProvenance = { machine: "desktop-automation" } as const

it.live("[TP-R4-01] machine hook text-only with provenance is accepted and not force-synthetic", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({
        title: "machine-text",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* llm.text("machine ok")
      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        source: "hook",
        provenance: machineProvenance,
        parts: [{ type: "text", text: "scheduled automation body" }],
      })
      const msgs = yield* sessions.messages({ sessionID: chat.id })
      const user = msgs.find((m) => m.info.role === "user" && (m.info as { provenance?: unknown }).provenance)
      expect(user).toBeDefined()
      if (!user || user.info.role !== "user") throw new Error("expected provenance user message")
      expect(user.info.provenance).toEqual(machineProvenance)
      const textPart = user.parts.find((p) => p.type === "text" && String((p as { text?: string }).text).includes("scheduled automation body"))
      expect(textPart).toBeDefined()
      if (textPart && textPart.type === "text") {
        // With provenance, engine must not force synthetic on machine text.
        expect(textPart.synthetic).not.toBe(true)
      }
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("[TP-R4-01] machine hook prompt with file attachment + provenance is accepted", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const filePath = `${dir}/.mimo-automation-execution-context.txt`
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        writeFileSync(filePath, "automation execution protocol")
        return true
      })
      const chat = yield* sessions.create({
        title: "machine-file",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* llm.text("got attachment")
      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        source: "hook",
        provenance: machineProvenance,
        parts: [
          { type: "text", text: "run automation with protocol file" },
          {
            type: "file",
            filename: ".mimo-automation-execution-context.txt",
            mime: "text/plain",
            url: `file://${filePath}`,
          },
        ],
      })
      const msgs = yield* sessions.messages({ sessionID: chat.id })
      const user = msgs.find((m) => m.info.role === "user" && (m.info as { provenance?: unknown }).provenance)
      expect(user).toBeDefined()
      expect(user!.parts.some((p) => p.type === "file")).toBe(true)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("[TP-R4-01] machine command with protocol file part + provenance is accepted", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { mkdirSync, writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        const cmdDir = join(dir, ".mimocode", "command")
        mkdirSync(cmdDir, { recursive: true })
        writeFileSync(
          join(cmdDir, "auto-cmd.md"),
          "---\ndescription: automation execution\n---\n\nExecute the saved automation now.\n",
        )
        return true
      })
      const chat = yield* sessions.create({
        title: "machine-command",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* llm.text("command executed")
      const protocolPart = {
        type: "file" as const,
        mime: "text/plain",
        filename: ".mimo-automation-execution-context.txt",
        url: `data:text/plain;charset=utf-8,${encodeURIComponent("automation protocol body")}`,
      }
      yield* prompt.command({
        sessionID: chat.id,
        agent: "build",
        model: `${ref.providerID}/${ref.modelID}`,
        command: "auto-cmd",
        arguments: "",
        source: "hook",
        provenance: machineProvenance,
        parts: [protocolPart],
      })
      const msgs = yield* sessions.messages({ sessionID: chat.id })
      const user = msgs.find((m) => m.info.role === "user" && (m.info as { provenance?: unknown }).provenance)
      expect(user).toBeDefined()
      if (!user || user.info.role !== "user") throw new Error("expected provenance user message")
      expect(user.info.provenance).toEqual(machineProvenance)
      expect(user.parts.some((p) => p.type === "file")).toBe(true)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("[TP-R4-01] uncommitted-hint cancel during first git probe produces no late hint", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: true } },
      })
      let reached: (() => void) | undefined
      const reachedP = new Promise<void>((resolve) => {
        reached = resolve
      })
      let releaseGit: (() => void) | undefined
      const gitParked = new Promise<void>((resolve) => {
        releaseGit = resolve
      })
      hintGitProbeBarrier.onReached = () => reached?.()
      hintGitProbeBarrier.wait = () => gitParked
      try {
        const chat = yield* sessions.create({
          title: "uh-git-cancel",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("turn-a done")
        yield* llm.text("UNEXPECTED_HINT_FOLLOWUP")
        // firePostSession runs in onExit and may await the git barrier — fork prompt.
        const aFiber = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            source: "user",
            parts: [{ type: "text", text: "turn a dirty" }],
          })
          .pipe(Effect.forkChild)
        // Pending is registered before git probe; park on the probe itself.
        yield* Effect.promise(() => reachedP)
        const inputsAtProbe = (yield* llm.inputs).length
        yield* prompt.cancel(chat.id)
        releaseGit?.()
        yield* Fiber.join(aFiber).pipe(Effect.catch(() => Effect.void))
        yield* Effect.sleep("500 millis")
        const msgs = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const hints = msgs.filter((m) =>
          m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
        )
        expect(hints).toHaveLength(0)
        expect((yield* llm.inputs).length).toBe(inputsAtProbe)
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
        hintGitProbeBarrier.onReached = undefined
        hintGitProbeBarrier.wait = undefined
        releaseGit?.()
      }
    }),
    { git: true, config: providerCfg },
  ),
  15_000,
)

it.live("[TP-R4-01] uncommitted-hint main cancel after child runLoop still kills main pending", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: true } },
      })
      let reached: (() => void) | undefined
      const reachedP = new Promise<void>((resolve) => {
        reached = resolve
      })
      let releaseA: (() => void) | undefined
      const parked = new Promise<void>((resolve) => {
        releaseA = resolve
      })
      hintClaimBarrier.onReached = () => reached?.()
      hintClaimBarrier.wait = () => parked
      try {
        const chat = yield* sessions.create({
          title: "uh-main-child",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("turn-a done")
        yield* llm.text("child runloop done")
        yield* llm.text("UNEXPECTED_HINT_FOLLOWUP")
        const aFiber = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            source: "user",
            parts: [{ type: "text", text: "turn a dirty" }],
          })
          .pipe(Effect.forkChild)
        yield* Effect.promise(() => reachedP)
        const mainTokBeforeChild = currentMainHintToken(chat.id)
        expect(mainTokBeforeChild).toBeDefined()
        const inputsBeforeChild = (yield* llm.inputs).length
        // REAL child runLoop (not noReply): non-main agentID + spawn is legal on root.
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          agentID: "build-child",
          model: ref,
          source: "spawn",
          parts: [{ type: "text", text: "child task executes runLoop" }],
        })
        const inputsAfterChild = (yield* llm.inputs).length
        // Child produced a model request — proof it entered runLoop.
        expect(inputsAfterChild).toBeGreaterThan(inputsBeforeChild)
        // Child runLoop must not open/overwrite the MAIN hint token.
        expect(currentMainHintToken(chat.id)).toBe(mainTokBeforeChild)
        yield* prompt.cancel(chat.id)
        releaseA?.()
        yield* Fiber.join(aFiber).pipe(Effect.catch(() => Effect.void))
        yield* Effect.sleep("800 millis")
        const msgs = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const hints = msgs.filter((m) =>
          m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
        )
        expect(hints).toHaveLength(0)
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
        hintClaimBarrier.onReached = undefined
        hintClaimBarrier.wait = undefined
        hintFirePostBarrier.onReached = undefined
        hintFirePostBarrier.wait = undefined
        hintGitProbeBarrier.onReached = undefined
        hintGitProbeBarrier.wait = undefined
        releaseA?.()
      }
    }),
    { git: true, config: providerCfg },
  ),
  15_000,
)

it.live("[TP-R4-01][TP-R7-01] uncommitted-hint busy claim does not inject and does not stall settlement", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const status = yield* SessionStatus.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: true } },
      })
      try {
        const chat = yield* sessions.create({
          title: "uh-busy",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("turn-a done")
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          source: "user",
          parts: [{ type: "text", text: "turn a dirty" }],
        })
        const inputsAfterA = (yield* llm.inputs).length
        // Immediately occupy the runner so A's delayed claim fails (state.start busy).
        yield* llm.hang
        const bFiber = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            source: "user",
            parts: [{ type: "text", text: "turn b hangs" }],
          })
          .pipe(Effect.forkChild)
        yield* Effect.sleep("2000 millis")
        const msgs = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const hints = msgs.filter((m) =>
          m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
        )
        expect(hints).toHaveLength(0)
        const inputsDuring = (yield* llm.inputs).length
        expect(inputsDuring).toBe(inputsAfterA + 1)
        yield* prompt.cancel(chat.id)
        yield* Fiber.join(bFiber).pipe(Effect.catch(() => Effect.void))
        const settled = yield* status.get(chat.id)
        expect(settled.type).toBe("idle")
        const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        expect(
          after.filter((m) =>
            m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
          ),
        ).toHaveLength(0)
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
        hintClaimBarrier.onReached = undefined
        hintClaimBarrier.wait = undefined
      }
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("[TP-R4-01] uncommitted-hint cancel-only invalidates pending follow-up before claim", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: true } },
      })
      let reached: (() => void) | undefined
      const reachedP = new Promise<void>((resolve) => {
        reached = resolve
      })
      let releaseA: (() => void) | undefined
      const parked = new Promise<void>((resolve) => {
        releaseA = resolve
      })
      hintClaimBarrier.onReached = () => reached?.()
      hintClaimBarrier.wait = () => parked
      try {
        const chat = yield* sessions.create({
          title: "uh-cancel-only",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("turn-a done")
        // Pre-queue an unexpected follow-up so a wrong inject cannot pass via fixture starvation.
        yield* llm.text("UNEXPECTED_HINT_FOLLOWUP")
        const aFiber = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            source: "user",
            parts: [{ type: "text", text: "turn a dirty" }],
          })
          .pipe(Effect.forkChild)
        // Handshake: delayed path has finished gates and is parked before claim.
        yield* Effect.promise(() => reachedP)
        const inputsAtBarrier = (yield* llm.inputs).length
        const msgsAtBarrier = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        expect(
          msgsAtBarrier.filter((m) =>
            m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
          ),
        ).toHaveLength(0)
        // Cancel-only: keep the session. Pending hint must be invalidated.
        yield* prompt.cancel(chat.id)
        releaseA?.()
        yield* Fiber.join(aFiber).pipe(Effect.catch(() => Effect.void))
        yield* Effect.sleep("500 millis")
        const msgs = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const hints = msgs.filter((m) =>
          m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
        )
        expect(hints).toHaveLength(0)
        const inputsAfter = (yield* llm.inputs).length
        expect(inputsAfter).toBe(inputsAtBarrier)
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
        hintClaimBarrier.onReached = undefined
        hintClaimBarrier.wait = undefined
        releaseA?.()
      }
    }),
    { git: true, config: providerCfg },
  ),
  15_000,
)

it.live("[TP-R4-01] uncommitted-hint supersession after barrier drops stale A by model.variant identity", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: true } },
      })
      let reached: (() => void) | undefined
      const reachedP = new Promise<void>((resolve) => {
        reached = resolve
      })
      let releaseA: (() => void) | undefined
      const parked = new Promise<void>((resolve) => {
        releaseA = resolve
      })
      hintClaimBarrier.onReached = () => reached?.()
      hintClaimBarrier.wait = () => parked
      try {
        const chat = yield* sessions.create({
          title: "uh-stale-variant",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("turn-a done")
        const aFiber = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            source: "user",
            variant: "low",
            parts: [{ type: "text", text: "turn a dirty" }],
          })
          .pipe(Effect.forkChild)
        yield* Effect.promise(() => reachedP)
        // A is parked after gates, before claim. B supersedes to idle.
        hintClaimBarrier.onReached = undefined
        hintClaimBarrier.wait = undefined
        yield* llm.text("turn-b done")
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          source: "user",
          variant: "high",
          parts: [{ type: "text", text: "turn b supersedes" }],
        })
        releaseA?.()
        yield* Fiber.join(aFiber).pipe(Effect.catch(() => Effect.void))
        yield* Effect.sleep("500 millis")
        const msgs = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const hints = msgs.filter(
          (m) =>
            m.info.role === "user" &&
            m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
        )
        // Stale A (variant low) must never inject. Any hint present must be B's (high).
        const staleA = hints.filter((m) => m.info.role === "user" && m.info.model.variant === "low")
        expect(staleA).toHaveLength(0)
        for (const hint of hints) {
          if (hint.info.role !== "user") continue
          expect(hint.info.model.variant).toBe("high")
        }
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
        hintClaimBarrier.onReached = undefined
        hintClaimBarrier.wait = undefined
        releaseA?.()
      }
    }),
    { git: true, config: providerCfg },
  ),
  15_000,
)

it.live("[TP-R4-01] uncommitted-hint delete during wait produces no late hint message", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: true } },
      })
      let reached: (() => void) | undefined
      const reachedP = new Promise<void>((resolve) => {
        reached = resolve
      })
      let releaseA: (() => void) | undefined
      const parked = new Promise<void>((resolve) => {
        releaseA = resolve
      })
      hintClaimBarrier.onReached = () => reached?.()
      hintClaimBarrier.wait = () => parked
      try {
        const chat = yield* sessions.create({
          title: "uh-delete",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("turn-a done")
        const aFiber = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            source: "user",
            parts: [{ type: "text", text: "turn a dirty" }],
          })
          .pipe(Effect.forkChild)
        yield* Effect.promise(() => reachedP)
        const msgsBefore = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        expect(
          msgsBefore.filter((m) =>
            m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
          ),
        ).toHaveLength(0)
        yield* prompt.cancel(chat.id)
        yield* sessions.remove(chat.id)
        releaseA?.()
        yield* Fiber.join(aFiber).pipe(Effect.catch(() => Effect.void))
        yield* Effect.sleep("500 millis")
        const msgExit = yield* sessions.messages({ sessionID: chat.id, agentID: "main" }).pipe(Effect.exit)
        if (Exit.isSuccess(msgExit)) {
          expect(
            msgExit.value.filter((m) =>
              m.parts.some((p) => p.type === "text" && p.synthetic === true && String(p.text).includes("uncommitted git changes")),
            ),
          ).toHaveLength(0)
        } else {
          // Deleted session: NotFound defect is the expected "no late delivery" outcome.
          expect(String(msgExit.cause)).toContain("NotFoundError")
        }
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
        hintClaimBarrier.onReached = undefined
        hintClaimBarrier.wait = undefined
        releaseA?.()
      }
    }),
    { git: true, config: providerCfg },
  ),
  15_000,
)

it.live("[TP-R7-01] uncommitted-hint decision logs land in Desktop WARN-level sink", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm, dir }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      yield* Effect.promise(async () => {
        const { writeFileSync } = await import("node:fs")
        const { join } = await import("node:path")
        writeFileSync(join(dir, "dirty.txt"), "x")
        return true
      })
      const prev = process.env.MIMOCODE_CONFIG_CONTENT
      process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
        experimental: { uncommitted_hint: { enabled: true } },
      })
      const prevLogPath = Global.Path.log
      let warnLogDir = ""
      try {
        // Mirror Desktop engine bootstrap: Log.init({ print: false, level: "WARN" }).
        yield* Effect.promise(async () => {
          const { mkdtempSync } = await import("node:fs")
          const { tmpdir } = await import("node:os")
          const { join } = await import("node:path")
          warnLogDir = mkdtempSync(join(tmpdir(), "uh-warn-log-"))
          Global.Path.log = warnLogDir
          await Log.init({ print: false, level: "WARN" })
          return true
        })
        const chat = yield* sessions.create({
          title: "uh-warn-log",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("dirty work done")
        yield* llm.text("will commit")
        // firePostSession may await barriers; keep this path unblocked (no test barriers set).
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          source: "user",
          parts: [{ type: "text", text: "please edit dirty work" }],
        })
        yield* Effect.sleep("2500 millis")
        const logged = yield* Effect.promise(async () => {
          await Log.flush()
          return await Bun.file(Log.file()).text()
        })
        expect(logged).toContain("uncommitted-hint")
        expect(logged).toContain("decision")
        expect(logged).toMatch(/dirty|inject|skip/)
        // Isolation check (R017): path still points at the WARN dir until finally restores it.
        expect(Global.Path.log).toBe(warnLogDir)
      } finally {
        if (prev === undefined) delete process.env.MIMOCODE_CONFIG_CONTENT
        else process.env.MIMOCODE_CONFIG_CONTENT = prev
        // Restore shared test-process log sink including LEVEL (R017: omit ≠ reset).
        yield* Effect.promise(async () => {
          const { rm } = await import("node:fs/promises")
          await Log.shutdown().catch(() => undefined)
          Global.Path.log = prevLogPath
          await Log.init({ print: false, level: "INFO" })
          if (warnLogDir) await rm(warnLogDir, { recursive: true, force: true }).catch(() => undefined)
          Log.Default.info("uh-log-restore-marker")
          await Log.flush()
          const restored = await Bun.file(Log.file()).text()
          expect(restored).toContain("uh-log-restore-marker")
          return true
        })
      }
    }),
    { git: true, config: providerCfg },
  ),
  15_000,
)

it.live("locks system and harness to the first user query", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Pinned" })

      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        noReply: true,
        system: "first system prompt",
        systemMode: "replace-agent",
        harness: "codex",
        parts: [{ type: "text", text: "first query" }],
      })

      const synthetic = yield* sessions.updateMessage({
        id: MessageID.ascending(),
        sessionID: chat.id,
        role: "user",
        time: { created: Date.now() },
        agent: "build",
        model: ref,
      })
      yield* sessions.updatePart({
        id: PartID.ascending(),
        messageID: synthetic.id,
        sessionID: chat.id,
        type: "text",
        text: "synthetic recovery",
        synthetic: true,
      })
      yield* llm.text("recovered")
      yield* prompt.loop({ sessionID: chat.id })

      const input = (yield* llm.inputs)[0]
      const request = JSON.stringify(input)
      const toolNames = (input.tools as Array<Record<string, unknown>>).map(wireToolName)
      expect(request).not.toContain("You are Codex")
      expect(request).toContain("first system prompt")
      expect(
        (input.messages as Array<{ role: string; content: unknown }>)
          .filter((message) => JSON.stringify(message.content).includes("first system prompt"))
          .map((message) => message.role),
      ).toEqual(["system"])
      expect(toolNames).toContain("exec")
      expect(toolNames).not.toContain("apply_patch")
      expect(toolNames).not.toContain("bash")
      const declarations = JSON.stringify(wireTool(input.tools as Array<Record<string, unknown>>, "exec"))
      expect(declarations).toContain("apply_patch(input:")
      expect(declarations).toContain("bash(input:")
      expect(declarations).not.toContain("read(input:")
      expect(toolNames.length).toBeGreaterThan(1)

      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        noReply: true,
        system: "second system prompt",
        systemMode: "append",
        harness: "default",
        parts: [{ type: "text", text: "second query" }],
      })

      const users = (yield* sessions.messages({ sessionID: chat.id }))
        .map((message) => message.info)
        .filter((message): message is MessageV2.User => message.role === "user")
      expect(users.map((message) => message.harness)).toEqual(["codex", undefined, "codex"])
      expect(users.map((message) => message.system)).toEqual(["first system prompt", undefined, "first system prompt"])
      expect(users.map((message) => message.systemMode)).toEqual(["replace-agent", undefined, "replace-agent"])
      expect((yield* sessions.get(chat.id)).prompt).toEqual({
        system: "first system prompt",
        systemMode: "replace-agent",
        harness: "codex",
      })
      expect((yield* sessions.create({ parentID: chat.id })).prompt).toEqual({
        system: "first system prompt",
        systemMode: "replace-agent",
        harness: "codex",
      })

      const legacy = yield* sessions.create({ title: "Legacy" })
      const legacyFirst = yield* sessions.updateMessage({
        id: MessageID.ascending(),
        sessionID: legacy.id,
        role: "user",
        time: { created: Date.now() },
        agent: "build",
        model: ref,
        system: "legacy first system",
        harness: "default",
      })
      yield* sessions.updatePart({
        id: PartID.ascending(),
        messageID: legacyFirst.id,
        sessionID: legacy.id,
        type: "text",
        text: "legacy real query",
      })
      const legacySynthetic = yield* sessions.updateMessage({
        id: MessageID.ascending(),
        sessionID: legacy.id,
        role: "user",
        time: { created: Date.now() },
        agent: "build",
        model: ref,
      })
      yield* sessions.updatePart({
        id: PartID.ascending(),
        messageID: legacySynthetic.id,
        sessionID: legacy.id,
        type: "text",
        text: "legacy synthetic recovery",
        synthetic: true,
      })
      expect(yield* sessions.resolvePrompt({ sessionID: legacy.id })).toEqual({
        system: "legacy first system",
        systemMode: "append",
        harness: "default",
      })
      expect((yield* sessions.get(legacy.id)).prompt).toBeUndefined()
      expect(
        yield* sessions.resolvePrompt({
          sessionID: legacy.id,
          fallback: { system: "wrong fallback", harness: "codex" },
        }),
      ).toEqual({
        system: "legacy first system",
        systemMode: "append",
        harness: "default",
      })
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("does not pin an empty parent while creating a child", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const parent = yield* sessions.create({ title: "Empty parent" })
      const child = yield* sessions.create({ parentID: parent.id, title: "Early child" })
      const fork = yield* sessions.fork({ sessionID: parent.id })

      expect((yield* sessions.get(parent.id)).prompt).toBeUndefined()
      expect(child.prompt).toBeUndefined()
      expect(fork.prompt).toBeUndefined()

      const empty = yield* prompt.prompt({
        sessionID: parent.id,
        agent: "build",
        model: ref,
        noReply: true,
        system: "empty system",
        harness: "codex",
        parts: [{ type: "text", text: "   " }],
      })
      expect(empty.parts).toEqual([])
      expect((yield* sessions.get(parent.id)).prompt).toBeUndefined()

      yield* prompt.prompt({
        sessionID: parent.id,
        agent: "build",
        model: ref,
        noReply: true,
        system: "synthetic system",
        harness: "codex",
        parts: [{ type: "text", text: "synthetic cron", synthetic: true }],
      })
      expect((yield* sessions.get(parent.id)).prompt).toBeUndefined()

      yield* prompt.shell({
        sessionID: parent.id,
        agent: "build",
        model: ref,
        command: "echo before-query",
      })
      expect((yield* sessions.get(parent.id)).prompt).toBeUndefined()

      yield* prompt.prompt({
        sessionID: parent.id,
        agent: "build",
        model: ref,
        noReply: true,
        system: "parent system",
        harness: "default",
        parts: [{ type: "text", text: "parent first query" }],
      })
      yield* prompt.prompt({
        sessionID: child.id,
        agent: "build",
        model: ref,
        noReply: true,
        system: "child system",
        harness: "codex",
        parts: [{ type: "text", text: "child first query" }],
      })

      expect((yield* sessions.get(parent.id)).prompt).toEqual({
        system: "parent system",
        systemMode: "append",
        harness: "default",
      })
      expect((yield* sessions.get(child.id)).prompt).toEqual({
        system: "child system",
        systemMode: "append",
        harness: "codex",
      })
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("fork uses chronological position when the boundary has an older caller ID", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const sessions = yield* Session.Service
      const parent = yield* sessions.create({ title: "Old-ID fork parent" })
      const boundaryID = MessageID.ascending()
      const before = yield* seed(parent.id, { finish: "stop" })
      expect(boundaryID < before.user.id).toBe(true)
      yield* sessions.commitUserMessage(
        {
          id: boundaryID,
          sessionID: parent.id,
          role: "user",
          agent: "build",
          model: ref,
          source: "user",
          time: { created: 0 },
        },
        [
          {
            id: PartID.ascending(),
            messageID: boundaryID,
            sessionID: parent.id,
            type: "text",
            text: "fork boundary",
          },
        ],
      )
      expect(yield* sessions.lastMainMessageID(parent.id)).toBe(boundaryID)

      const fork = yield* sessions.fork({ sessionID: parent.id, messageID: boundaryID })
      const forked = yield* sessions.messages({ sessionID: fork.id, agentID: "*" })
      expect(forked).toHaveLength(2)
      expect(forked.map((message) => message.info.role)).toEqual(["user", "assistant"])
      expect(JSON.stringify(forked)).toContain("hello")
      expect(JSON.stringify(forked)).toContain("hi there")
      expect(JSON.stringify(forked)).not.toContain("fork boundary")
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("persists auto as its own harness mode", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const explicit = yield* sessions.create({ title: "Explicit auto" })
      const omitted = yield* sessions.create({ title: "Omitted harness" })

      yield* prompt.prompt({
        sessionID: explicit.id,
        agent: "build",
        model: ref,
        noReply: true,
        harness: "auto",
        parts: [{ type: "text", text: "first explicit auto query" }],
      })
      yield* prompt.prompt({
        sessionID: explicit.id,
        agent: "build",
        model: ref,
        noReply: true,
        harness: "codex",
        parts: [{ type: "text", text: "later override" }],
      })
      yield* prompt.prompt({
        sessionID: omitted.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "first omitted query" }],
      })

      expect((yield* sessions.get(explicit.id)).prompt?.harness).toBe("auto")
      expect((yield* sessions.get(omitted.id)).prompt?.harness).toBe("auto")
      const users = (yield* sessions.messages({ sessionID: explicit.id }))
        .map((message) => message.info)
        .filter((message): message is MessageV2.User => message.role === "user")
      expect(users.map((message) => message.harness)).toEqual(["auto", "auto"])
    }),
    { git: true, config: providerCfg },
  ),
)

for (const harness of ["codex", "auto"] as const) {
  it.live(`uses the frozen system and appends the compaction prompt to the existing conversation with ${harness}`, () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const compaction = yield* SessionCompaction.Service
        const chat = yield* sessions.create({ title: "Compaction prompt" })
        const marker = "SESSION_SYSTEM_MUST_SKIP_COMPACTION"

        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          noReply: true,
          system: marker,
          systemMode: "replace-agent",
          harness,
          parts: [{ type: "text", text: "first query" }],
        })

        yield* llm.text("before compaction")
        yield* prompt.loop({ sessionID: chat.id })
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "second query kept verbatim" }],
        })
        yield* llm.text("second answer kept verbatim")
        yield* prompt.loop({ sessionID: chat.id })
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "third query kept verbatim" }],
        })
        yield* llm.text("third answer kept verbatim")
        yield* prompt.loop({ sessionID: chat.id })
        const beforeRequest = (yield* llm.inputs)[2]
        const frozenTools = yield* Effect.sync(() =>
          Database.use(
            (db) =>
              db
                .select()
                .from(SessionPrefixSnapshotTable)
                .where(eq(SessionPrefixSnapshotTable.session_id, chat.id))
                .get()?.tools ?? [],
          ),
        )
        expect(frozenTools.find((item) => item.name === "bash")?.active).toBe(false)
        expect(frozenTools.find((item) => item.name === "exec")?.active).toBe(true)

        yield* compaction.create({
          sessionID: chat.id,
          agent: "compaction",
          model: ref,
          auto: false,
        })
        const snapshot = yield* sessions.messages({ sessionID: chat.id })
        const boundary = snapshot.at(-1)!
        yield* llm.text("summary")
        expect(
          yield* compaction.process({
            parentID: boundary.info.id,
            messages: snapshot,
            sessionID: chat.id,
            auto: false,
          }),
        ).toBe("continue")
        const compactionRequest = (yield* llm.inputs)[3]
        expect(compactionRequest.model).toBe(ref.modelID)
        expect(compactionRequest.tools).toEqual(beforeRequest.tools)
        expect(compactionRequest.messages).toBeArray()
        expect(beforeRequest.messages).toBeArray()
        if (!Array.isArray(compactionRequest.messages) || !Array.isArray(beforeRequest.messages)) return
        expect(compactionRequest.messages.slice(0, beforeRequest.messages.length)).toEqual(beforeRequest.messages)
        expect(compactionRequest.tool_choice).toBe("none")
        expect(JSON.stringify(compactionRequest)).toContain(marker)
        expect(JSON.stringify(compactionRequest)).toContain("third answer kept verbatim")
        expect(JSON.stringify(compactionRequest)).toContain("1. Task Overview")
        expect(JSON.stringify(compactionRequest)).not.toContain("When constructing the summary")

        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "after compaction" }],
        })
        yield* llm.text("continued")
        yield* prompt.loop({ sessionID: chat.id })

        const request = (yield* llm.inputs)[4]
        const serialized = JSON.stringify(request)
        expect(serialized).toContain(marker)
        expect(serialized).toContain("summary")
        expect(serialized).not.toContain("first query")
        expect(serialized).not.toContain("second query kept verbatim")
        expect(serialized).not.toContain("third query kept verbatim")
        const toolNames = (request.tools as Array<Record<string, unknown>>).map(wireToolName)
        expect(toolNames).toContain("exec")
        expect(toolNames).not.toContain("apply_patch")
        expect(toolNames).not.toContain("bash")
        expect(toolNames.length).toBeGreaterThan(1)
        expect((yield* sessions.get(chat.id)).prompt).toEqual({
          system: marker,
          systemMode: "replace-agent",
          harness,
        })
      }),
      {
        git: true,
        config: (url) => {
          const config = providerCfg(url)
          return {
            ...config,
            provider: {
              ...config.provider,
              test: {
                ...config.provider.test,
                models: {
                  ...config.provider.test.models,
                  "test-model": {
                    ...config.provider.test.models["test-model"],
                    ...(harness === "auto" ? { harness_model: "gpt-5.6-sol" } : {}),
                  },
                },
              },
            },
            agent: { compaction: { model: "test/gpt-5-test" } },
          }
        },
      },
    ),
  )
}

it.live("provider-overflow compaction uses its configured model and strips media", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const compaction = yield* SessionCompaction.Service
      const chat = yield* sessions.create({ title: "Overflow compaction" })
      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [
          { type: "text", text: "inspect this image" },
          { type: "file", mime: "image/png", url: "data:image/png;base64,QUFBQQ==", filename: "large.png" },
        ],
      })
      yield* compaction.create({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        auto: true,
        overflow: true,
      })
      const snapshot = yield* sessions.messages({ sessionID: chat.id })
      yield* llm.text("overflow summary")
      expect(
        yield* compaction.process({
          parentID: snapshot.at(-1)!.info.id,
          messages: snapshot,
          sessionID: chat.id,
          auto: true,
          overflow: true,
        }),
      ).toBe("continue")

      const request = (yield* llm.inputs)[0]
      expect(request.model).toBe(mcpRef.modelID)
      expect(request.messages).toBeArray()
      if (!Array.isArray(request.messages)) return
      expect(JSON.stringify(request.messages[0])).not.toContain("You have been working on the task described above")
      expect(JSON.stringify(request.messages.at(-1))).toContain("1. Task Overview")
      expect(JSON.stringify(request)).toContain("[Attached image/png: large.png]")
      expect(JSON.stringify(request)).not.toContain("QUFBQQ==")
    }),
    {
      git: true,
      config: (url) => ({
        ...providerCfg(url),
        agent: { compaction: { model: "test/gpt-5-test" } },
      }),
    },
  ),
)

admissionMcpIt.live(
  "auto-compaction waits for a successful direct MCP resource admission and handles it without a stale continuation",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const compaction = yield* SessionCompaction.Service
        const chat = yield* sessions.create({ title: "Compaction admission race" })
        yield* seed(chat.id, { finish: "stop" })
        yield* compaction.create({ sessionID: chat.id, agent: "build", model: ref, auto: true })

        const releaseSummary = defer<void>()
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            releaseSummary.resolve()
            admissionResourceRelease.resolve()
          }),
        )
        yield* llm.hold("admission race summary", releaseSummary.promise)
        const compacting = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1).pipe(Effect.timeout("10 seconds"))

        const directMessageID = MessageID.ascending()
        const direct = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: directMessageID,
            agent: "build",
            model: ref,
            noReply: true,
            parts: [
              {
                type: "file",
                url: "mcp://admission",
                filename: "admission.txt",
                mime: "text/plain",
                source: {
                  type: "resource",
                  clientName: "test-client",
                  uri: "mcp://admission",
                  text: { value: "admission.txt", start: 0, end: 13 },
                },
              },
            ],
          })
          .pipe(Effect.forkChild)
        yield* Effect.promise(() => admissionResourceStarted.promise).pipe(Effect.timeout("10 seconds"))
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).some((message) => message.info.id === directMessageID),
        ).toBe(false)

        yield* llm.text("admitted request handled")
        releaseSummary.resolve()
        admissionResourceRelease.resolve()
        yield* Fiber.join(direct).pipe(Effect.timeout("10 seconds"))
        const result = yield* Fiber.join(compacting).pipe(Effect.timeout("10 seconds"))
        const messages = yield* sessions.messages({ sessionID: chat.id })
        const users = messages.filter(
          (message): message is MessageV2.WithParts & { info: MessageV2.User } => message.info.role === "user",
        )
        expect(result.parts.some((part) => part.type === "text" && part.text === "admitted request handled")).toBe(true)
        expect(users.at(-1)?.info.id).toBe(directMessageID)
        expect(users.at(-1)?.info.source).toBe("user")
        expect(
          users.filter(
            (message) => message.info.source === "hook" && !message.parts.some((part) => part.type === "compaction"),
          ),
        ).toHaveLength(0)
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

failedAdmissionMcpIt.live(
  "overflow compaction replays the active request when a direct MCP resource admission fails",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const compaction = yield* SessionCompaction.Service
        const chat = yield* sessions.create({ title: "Failed compaction admission race" })
        yield* seed(chat.id, { finish: "stop" })
        const active = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: chat.id,
          agent: "build",
          model: ref,
          time: { created: Date.now() + 60_000 },
        })
        yield* sessions.updatePart({
          id: PartID.ascending(),
          messageID: active.id,
          sessionID: chat.id,
          type: "text",
          text: "ACTIVE_REQUEST_MUST_BE_REPLAYED",
        })
        yield* compaction.create({ sessionID: chat.id, agent: "build", model: ref, auto: true, overflow: true })
        const boundary = (yield* sessions.messages({ sessionID: chat.id })).find((message) =>
          message.parts.some((part) => part.type === "compaction"),
        )
        expect(boundary?.info.time.created).toBe(active.time.created + 1)

        const releaseSummary = defer<void>()
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            releaseSummary.resolve()
            failedAdmissionResourceRelease.resolve()
          }),
        )
        yield* llm.hold("failed admission race summary", releaseSummary.promise)
        const compacting = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1).pipe(Effect.timeout("10 seconds"))

        const directMessageID = MessageID.ascending()
        const direct = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: directMessageID,
            agent: "build",
            model: ref,
            noReply: true,
            parts: [
              {
                type: "file",
                url: "mcp://failed-admission",
                filename: "failed-admission.txt",
                mime: "text/plain",
                source: {
                  type: "resource",
                  clientName: "test-client",
                  uri: "mcp://failed-admission",
                  text: { value: "failed-admission.txt", start: 0, end: 20 },
                },
              },
            ],
          })
          .pipe(Effect.exit, Effect.forkChild)
        yield* Effect.promise(() => failedAdmissionResourceStarted.promise).pipe(Effect.timeout("10 seconds"))
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).some((message) => message.info.id === directMessageID),
        ).toBe(false)

        yield* llm.text("continued after failed admission")
        releaseSummary.resolve()
        yield* Effect.gen(function* () {
          while (true) {
            const boundary = (yield* sessions.messages({ sessionID: chat.id })).find((message) =>
              message.parts.some((part) => part.type === "compaction"),
            )
            if (boundary?.parts.some((part) => part.type === "compaction" && part.projection)) return
            yield* Effect.sleep(10)
          }
        }).pipe(Effect.timeout("10 seconds"))
        yield* Effect.sleep(10)
        expect(compacting.pollUnsafe()).toBeUndefined()
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).filter(
            (message) =>
              message.info.role === "user" &&
              message.info.source === "hook" &&
              !message.parts.some((part) => part.type === "compaction"),
          ),
        ).toHaveLength(0)

        failedAdmissionResourceRelease.resolve()
        expect(Exit.isFailure(yield* Fiber.join(direct).pipe(Effect.timeout("10 seconds")))).toBe(true)
        const result = yield* Fiber.join(compacting).pipe(Effect.timeout("10 seconds"))
        const messages = yield* sessions.messages({ sessionID: chat.id })
        expect(
          result.parts.some((part) => part.type === "text" && part.text === "continued after failed admission"),
        ).toBe(true)
        expect(messages.some((message) => message.info.id === directMessageID)).toBe(false)
        const replay = messages.filter(
          (message) =>
            message.info.role === "user" &&
            message.info.source === "hook" &&
            !message.parts.some((part) => part.type === "compaction"),
        )
        expect(replay).toHaveLength(1)
        expect(
          replay[0].parts.some((part) => part.type === "text" && part.text === "ACTIVE_REQUEST_MUST_BE_REPLAYED"),
        ).toBe(true)
        const compactionSummary = messages.find(
          (message) => message.info.role === "assistant" && message.info.summary === true,
        )
        expect(compactionSummary).toBeDefined()
        if (boundary && compactionSummary) {
          expect(MessageV2.compareOrder(boundary.info, compactionSummary.info)).toBeLessThan(0)
          expect(MessageV2.compareOrder(compactionSummary.info, replay[0].info)).toBeLessThan(0)
          expect(compactionSummary.info.role).toBe("assistant")
          if (compactionSummary.info.role === "assistant")
            expect(compactionSummary.info.parentID).toBe(boundary.info.id)
        }
        expect(result.info.role).toBe("assistant")
        if (result.info.role === "assistant") {
          expect(result.info.parentID).toBe(replay[0].info.id)
          expect(MessageV2.compareOrder(replay[0].info, result.info)).toBeLessThan(0)
        }
        expect(JSON.stringify((yield* llm.inputs).at(-1)?.messages)).toContain("ACTIVE_REQUEST_MUST_BE_REPLAYED")
      }),
      {
        git: true,
        config: (url) => ({
          ...providerCfg(url),
          agent: { build: { tool_allowlist: [] } },
        }),
      },
    ),
  30_000,
)

concurrentAdmissionMcpIt.live(
  "auto-compaction waits for every same-actor admission when one succeeds and one fails",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const compaction = yield* SessionCompaction.Service
        const chat = yield* sessions.create({ title: "Concurrent compaction admissions" })
        yield* seed(chat.id, { finish: "stop" })
        yield* compaction.create({ sessionID: chat.id, agent: "build", model: ref, auto: true })

        const releaseSummary = defer<void>()
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            releaseSummary.resolve()
            concurrentAdmissionControls["mcp://same-actor-success"].release.resolve()
            concurrentAdmissionControls["mcp://same-actor-failure"].release.resolve()
          }),
        )
        yield* llm.hold("concurrent admission summary", releaseSummary.promise)
        const compacting = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1).pipe(Effect.timeout("10 seconds"))

        const failedMessageID = MessageID.ascending()
        const failed = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: failedMessageID,
            agent: "build",
            model: ref,
            noReply: true,
            parts: [
              {
                type: "file",
                url: "mcp://same-actor-failure",
                filename: "same-actor-failure.txt",
                mime: "text/plain",
                source: {
                  type: "resource",
                  clientName: "test-client",
                  uri: "mcp://same-actor-failure",
                  text: { value: "same-actor-failure.txt", start: 0, end: 22 },
                },
              },
            ],
          })
          .pipe(Effect.exit, Effect.forkChild)
        const successfulMessageID = MessageID.ascending()
        const successful = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: successfulMessageID,
            agent: "build",
            model: ref,
            noReply: true,
            parts: [
              {
                type: "file",
                url: "mcp://same-actor-success",
                filename: "same-actor-success.txt",
                mime: "text/plain",
                source: {
                  type: "resource",
                  clientName: "test-client",
                  uri: "mcp://same-actor-success",
                  text: { value: "same-actor-success.txt", start: 0, end: 22 },
                },
              },
            ],
          })
          .pipe(Effect.exit, Effect.forkChild)
        yield* Effect.all(
          [
            Effect.promise(() => concurrentAdmissionControls["mcp://same-actor-failure"].started.promise),
            Effect.promise(() => concurrentAdmissionControls["mcp://same-actor-success"].started.promise),
          ],
          { concurrency: 2 },
        ).pipe(Effect.timeout("10 seconds"))

        yield* llm.text("handled successful admission")
        releaseSummary.resolve()
        yield* Effect.gen(function* () {
          while (true) {
            const boundary = (yield* sessions.messages({ sessionID: chat.id })).find((message) =>
              message.parts.some((part) => part.type === "compaction"),
            )
            if (boundary?.parts.some((part) => part.type === "compaction" && part.projection)) return
            yield* Effect.sleep(10)
          }
        }).pipe(Effect.timeout("10 seconds"))

        concurrentAdmissionControls["mcp://same-actor-failure"].release.resolve()
        expect(Exit.isFailure(yield* Fiber.join(failed).pipe(Effect.timeout("10 seconds")))).toBe(true)
        yield* Effect.yieldNow
        expect(compacting.pollUnsafe()).toBeUndefined()
        const whileSuccessHeld = yield* sessions.messages({ sessionID: chat.id })
        expect(whileSuccessHeld.some((message) => message.info.id === successfulMessageID)).toBe(false)
        expect(
          whileSuccessHeld.filter(
            (message) =>
              message.info.role === "user" &&
              message.info.source === "hook" &&
              !message.parts.some((part) => part.type === "compaction"),
          ),
        ).toHaveLength(0)

        concurrentAdmissionControls["mcp://same-actor-success"].release.resolve()
        expect(Exit.isSuccess(yield* Fiber.join(successful).pipe(Effect.timeout("10 seconds")))).toBe(true)
        const result = yield* Fiber.join(compacting).pipe(Effect.timeout("10 seconds"))
        const messages = yield* sessions.messages({ sessionID: chat.id })
        expect(result.parts.some((part) => part.type === "text" && part.text === "handled successful admission")).toBe(
          true,
        )
        expect(messages.some((message) => message.info.id === successfulMessageID)).toBe(true)
        expect(messages.some((message) => message.info.id === failedMessageID)).toBe(false)
        expect(
          messages.filter(
            (message) =>
              message.info.role === "user" &&
              message.info.source === "hook" &&
              !message.parts.some((part) => part.type === "compaction"),
          ),
        ).toHaveLength(0)
      }),
      {
        git: true,
        config: (url) => ({
          ...providerCfg(url),
          agent: { build: { tool_allowlist: [] } },
        }),
      },
    ),
  30_000,
)

concurrentAdmissionMcpIt.live(
  "a pending admission for another actor does not block main compaction",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const compaction = yield* SessionCompaction.Service
        const chat = yield* sessions.create({ title: "Actor-isolated compaction admission" })
        yield* seed(chat.id, { finish: "stop" })
        yield* compaction.create({ sessionID: chat.id, agent: "build", model: ref, auto: true })

        const releaseSummary = defer<void>()
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            releaseSummary.resolve()
            concurrentAdmissionControls["mcp://peer-admission"].release.resolve()
          }),
        )
        yield* llm.hold("actor-isolated admission summary", releaseSummary.promise)
        const compacting = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1).pipe(Effect.timeout("10 seconds"))

        const peerMessageID = MessageID.ascending()
        const peer = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: peerMessageID,
            agentID: "peer-admission",
            agent: "build",
            model: ref,
            noReply: true,
            parts: [
              {
                type: "file",
                url: "mcp://peer-admission",
                filename: "peer-admission.txt",
                mime: "text/plain",
                source: {
                  type: "resource",
                  clientName: "test-client",
                  uri: "mcp://peer-admission",
                  text: { value: "peer-admission.txt", start: 0, end: 18 },
                },
              },
            ],
          })
          .pipe(Effect.exit, Effect.forkChild)
        yield* Effect.promise(() => concurrentAdmissionControls["mcp://peer-admission"].started.promise).pipe(
          Effect.timeout("10 seconds"),
        )

        yield* llm.text("main continued while peer pending")
        releaseSummary.resolve()
        const result = yield* Fiber.join(compacting).pipe(Effect.timeout("10 seconds"))
        expect(
          result.parts.some((part) => part.type === "text" && part.text === "main continued while peer pending"),
        ).toBe(true)
        expect(peer.pollUnsafe()).toBeUndefined()
        expect(
          (yield* sessions.messages({ sessionID: chat.id, agentID: "peer-admission" })).some(
            (message) => message.info.id === peerMessageID,
          ),
        ).toBe(false)
        const mainBeforePeerCommit = yield* sessions.messages({ sessionID: chat.id })
        expect(
          mainBeforePeerCommit.filter(
            (message) =>
              message.info.role === "user" &&
              message.info.source === "hook" &&
              !message.parts.some((part) => part.type === "compaction"),
          ),
        ).toHaveLength(1)

        concurrentAdmissionControls["mcp://peer-admission"].release.resolve()
        expect(Exit.isSuccess(yield* Fiber.join(peer).pipe(Effect.timeout("10 seconds")))).toBe(true)
        expect(
          (yield* sessions.messages({ sessionID: chat.id, agentID: "peer-admission" })).some(
            (message) => message.info.id === peerMessageID,
          ),
        ).toBe(true)
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).some((message) => message.info.id === peerMessageID),
        ).toBe(false)
      }),
      {
        git: true,
        config: (url) => ({
          ...providerCfg(url),
          agent: { build: { tool_allowlist: [] } },
        }),
      },
    ),
  30_000,
)

it.live(
  "direct admission commits after the latest actor timestamp even with an older message ID",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Monotonic direct admission" })
        const directMessageID = MessageID.ascending()
        const hook = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          sessionID: chat.id,
          role: "user",
          agent: "build",
          model: ref,
          source: "hook",
          time: { created: Date.now() + 60_000 },
        })
        const peerHook = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          sessionID: chat.id,
          agentID: "peer",
          role: "user",
          agent: "build",
          model: ref,
          source: "hook",
          time: { created: hook.time.created + 60_000 },
        })

        const direct = yield* prompt.prompt({
          sessionID: chat.id,
          messageID: directMessageID,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "newer direct request" }],
        })

        expect(direct.info.role).toBe("user")
        if (direct.info.role !== "user") return
        expect(direct.info.time.created).toBe(hook.time.created + 1)
        expect(direct.info.time.created).toBeLessThan(peerHook.time.created)
        expect((yield* sessions.messages({ sessionID: chat.id })).at(-1)?.info.id).toBe(directMessageID)
        expect(
          (yield* sessions.commitUserMessage({ ...direct.info, time: { created: 0 } }, direct.parts)).time.created,
        ).toBe(direct.info.time.created)
        const conflict = yield* sessions
          .commitUserMessage(
            { ...direct.info, time: { created: 0 } },
            direct.parts.map((part) => (part.type === "text" ? { ...part, text: "conflicting retry" } : part)),
          )
          .pipe(Effect.exit)
        expect(Exit.isFailure(conflict)).toBe(true)
        expect(
          (yield* sessions.messages({ sessionID: chat.id }))
            .find((message) => message.info.id === directMessageID)
            ?.parts.some((part) => part.type === "text" && part.text === "newer direct request"),
        ).toBe(true)

        yield* llm.text("future-timestamp request handled")
        const result = yield* prompt.loop({ sessionID: chat.id })
        expect(result.info.role).toBe("assistant")
        if (result.info.role === "assistant") {
          expect(result.info.parentID).toBe(directMessageID)
          expect(result.info.time.created).toBe(direct.info.time.created + 1)
          expect(result.info.time.completed).toBeGreaterThanOrEqual(result.info.time.created)
        }
        expect((yield* sessions.messages({ sessionID: chat.id })).at(-1)?.info.id).toBe(result.info.id)
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

it.live(
  "run loop handles a committed direct request whose client ID predates a finished assistant",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Late committed direct request" })
        const directMessageID = MessageID.ascending()
        const previous = yield* seed(chat.id, { finish: "stop" })
        expect(directMessageID < previous.assistant.id).toBe(true)

        yield* prompt.prompt({
          sessionID: chat.id,
          messageID: directMessageID,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "must reach the model despite my older ID" }],
        })
        yield* llm.text("late direct handled")
        const result = yield* prompt.loop({ sessionID: chat.id })

        expect(result.parts.some((part) => part.type === "text" && part.text === "late direct handled")).toBe(true)
        expect(yield* llm.hits).toHaveLength(1)
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

it.live("user message and parts roll back together when atomic admission fails", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Atomic user admission" })
      const messageID = MessageID.ascending()

      const exit = yield* sessions
        .commitUserMessage(
          {
            id: messageID,
            sessionID: chat.id,
            role: "user",
            agent: "build",
            model: ref,
            source: "user",
            time: { created: Date.now() },
          },
          [
            {
              id: PartID.ascending(),
              messageID,
              sessionID: chat.id,
              type: "text",
              text: "must roll back",
              metadata: { invalid_json_value: 1n as any },
            },
          ],
        )
        .pipe(Effect.exit)

      expect(Exit.isFailure(exit)).toBe(true)
      expect((yield* sessions.messages({ sessionID: chat.id })).some((message) => message.info.id === messageID)).toBe(
        false,
      )
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("createMessage rejects duplicate IDs and updateMessage preserves the committed timestamp", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Monotonic message API" })
      const created = yield* sessions.createMessage({
        id: MessageID.ascending(),
        sessionID: chat.id,
        role: "user" as const,
        agent: "build",
        model: ref,
        source: "hook" as const,
        time: { created: 0 },
      })
      const duplicate = yield* sessions.createMessage({ ...created, system: "must not overwrite" }).pipe(Effect.exit)
      expect(Exit.isFailure(duplicate)).toBe(true)

      const updated = yield* sessions.updateMessage({ ...created, system: "preserved update", time: { created: 0 } })
      expect(updated.time.created).toBe(created.time.created)
      const stored = (yield* sessions.messages({ sessionID: chat.id })).find(
        (message) => message.info.id === created.id,
      )
      expect(stored?.info.time.created).toBe(created.time.created)
      expect(stored?.info.role === "user" && stored.info.system).toBe("preserved update")
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("atomic user admission rejects reused and duplicate part IDs without changing their owner", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Atomic part ownership" })
      const originalMessageID = MessageID.ascending()
      const partID = PartID.ascending()
      yield* sessions.commitUserMessage(
        {
          id: originalMessageID,
          sessionID: chat.id,
          role: "user",
          agent: "build",
          model: ref,
          source: "user",
          time: { created: Date.now() },
        },
        [{ id: partID, messageID: originalMessageID, sessionID: chat.id, type: "text", text: "original part" }],
      )

      const collisionMessageID = MessageID.ascending()
      const collision = yield* sessions
        .commitUserMessage(
          {
            id: collisionMessageID,
            sessionID: chat.id,
            role: "user",
            agent: "build",
            model: ref,
            source: "user",
            time: { created: Date.now() },
          },
          [{ id: partID, messageID: collisionMessageID, sessionID: chat.id, type: "text", text: "collision" }],
        )
        .pipe(Effect.exit)
      const duplicateMessageID = MessageID.ascending()
      const duplicatePartID = PartID.ascending()
      const duplicate = yield* sessions
        .commitUserMessage(
          {
            id: duplicateMessageID,
            sessionID: chat.id,
            role: "user",
            agent: "build",
            model: ref,
            source: "user",
            time: { created: Date.now() },
          },
          [
            {
              id: duplicatePartID,
              messageID: duplicateMessageID,
              sessionID: chat.id,
              type: "text",
              text: "first duplicate",
            },
            {
              id: duplicatePartID,
              messageID: duplicateMessageID,
              sessionID: chat.id,
              type: "text",
              text: "second duplicate",
            },
          ],
        )
        .pipe(Effect.exit)

      expect(Exit.isFailure(collision)).toBe(true)
      expect(Exit.isFailure(duplicate)).toBe(true)
      const messages = yield* sessions.messages({ sessionID: chat.id })
      expect(messages.some((message) => message.info.id === collisionMessageID)).toBe(false)
      expect(messages.some((message) => message.info.id === duplicateMessageID)).toBe(false)
      expect(
        messages
          .find((message) => message.info.id === originalMessageID)
          ?.parts.some((part) => part.id === partID && part.type === "text" && part.text === "original part"),
      ).toBe(true)

      const retryMessageID = MessageID.ascending()
      const retryMessage: MessageV2.User = {
        id: retryMessageID,
        sessionID: chat.id,
        role: "user",
        agent: "build",
        model: ref,
        source: "user",
        time: { created: Date.now() },
      }
      const retryParts: MessageV2.Part[] = [
        {
          id: PartID.make("prt_\u{10000}"),
          messageID: retryMessageID,
          sessionID: chat.id,
          type: "text",
          text: "supplementary-plane part",
        },
        {
          id: PartID.make("prt_\uE000"),
          messageID: retryMessageID,
          sessionID: chat.id,
          type: "text",
          text: "private-use part",
        },
      ]
      const committed = yield* sessions.commitUserMessage(retryMessage, retryParts)
      expect(
        (yield* sessions.commitUserMessage({ ...retryMessage, time: { created: 0 } }, [...retryParts].reverse())).time
          .created,
      ).toBe(committed.time.created)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("empty compaction removes its boundary without calling the model", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const sessions = yield* Session.Service
      const compaction = yield* SessionCompaction.Service
      const chat = yield* sessions.create({ title: "Empty compaction" })
      yield* compaction.create({ sessionID: chat.id, agent: "build", model: ref, auto: false })
      const snapshot = yield* sessions.messages({ sessionID: chat.id })

      expect(
        yield* compaction.process({
          parentID: snapshot.at(-1)!.info.id,
          messages: snapshot,
          sessionID: chat.id,
          auto: false,
        }),
      ).toBe("stop")
      expect(yield* sessions.messages({ sessionID: chat.id })).toEqual([])
      expect(yield* llm.calls).toBe(0)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("compaction preserves the parent's appended turn context", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const compaction = yield* SessionCompaction.Service
      const chat = yield* sessions.create({ title: "Compaction turn context" })
      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        noReply: true,
        system: "APPENDED_TURN_CONTEXT",
        systemMode: "append",
        parts: [{ type: "text", text: "first query" }],
      })
      yield* llm.text("first answer")
      yield* prompt.loop({ sessionID: chat.id })
      const before = (yield* llm.inputs)[0]
      yield* compaction.create({ sessionID: chat.id, agent: "build", model: ref, auto: false })
      const snapshot = yield* sessions.messages({ sessionID: chat.id })
      yield* llm.text("summary")
      expect(
        yield* compaction.process({
          parentID: snapshot.at(-1)!.info.id,
          messages: snapshot,
          sessionID: chat.id,
          auto: false,
        }),
      ).toBe("continue")

      const compacting = (yield* llm.inputs)[1]
      expect(compacting.messages).toBeArray()
      expect(before.messages).toBeArray()
      if (!Array.isArray(compacting.messages) || !Array.isArray(before.messages)) return
      expect(compacting.messages.slice(0, before.messages.length)).toEqual(before.messages)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live(
  "persists the process-time compaction projection from the real snapshot and arrived tail",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ dir, llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const compaction = yield* SessionCompaction.Service
        const providers = yield* ProviderSvc.Service
        const model = yield* providers.getModel(ref.providerID, ref.modelID)
        const chat = yield* sessions.create({ title: "Compaction projection" })
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "inspect and edit auth" }],
        })
        yield* llm.text("prepared")
        const history = yield* prompt.loop({ sessionID: chat.id })
        const authPath = path.join(dir, "src/auth.ts")
        for (const [tool, input, output, metadata] of [
          [
            "read",
            { file_path: authPath, offset: 10, limit: 11 },
            "10: before\n20: after\n\n(Showing lines 10-20 of 100)",
            { truncated: true },
          ],
          ["edit", { file_path: authPath, old_string: "before", new_string: "after" }, "ok", {}],
        ] as const) {
          yield* sessions.updatePart({
            id: PartID.ascending(),
            sessionID: chat.id,
            messageID: history.info.id,
            type: "tool",
            tool,
            callID: `call-${tool}`,
            state: {
              status: "completed",
              input,
              output,
              title: tool,
              metadata,
              time: { start: Date.now(), end: Date.now() },
            },
          })
        }

        yield* compaction.create({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          auto: true,
          agentID: "main",
        })
        const snapshot = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const boundary = snapshot.at(-1)!
        const release = defer<void>()
        yield* llm.hold("PROCESS_SUMMARY", release.promise)
        const processing = yield* compaction
          .process({
            parentID: boundary.info.id,
            messages: snapshot,
            sessionID: chat.id,
            auto: true,
            agentID: "main",
          })
          .pipe(Effect.forkChild)
        yield* llm.wait(1)

        const tailUser = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          sessionID: chat.id,
          agentID: "main",
          role: "user" as const,
          time: { created: Date.now() },
          agent: "build",
          model: ref,
        })
        yield* sessions.updatePart({
          id: PartID.ascending(),
          sessionID: chat.id,
          messageID: tailUser.id,
          type: "text",
          text: "arrived during compaction",
        })
        const tailAssistant = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          sessionID: chat.id,
          agentID: "main",
          role: "assistant" as const,
          parentID: tailUser.id,
          time: { created: Date.now(), completed: Date.now() },
          modelID: ref.modelID,
          providerID: ref.providerID,
          mode: "build",
          agent: "build",
          path: { cwd: dir, root: dir },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          finish: "stop",
        })
        yield* sessions.updatePart({
          id: PartID.ascending(),
          sessionID: chat.id,
          messageID: tailAssistant.id,
          type: "tool",
          tool: "read",
          callID: "call-large-tail",
          state: {
            status: "completed",
            input: { file_path: path.join(dir, "large.log") },
            output: "x".repeat(40_000),
            title: "read",
            metadata: {},
            time: { start: Date.now(), end: Date.now() },
          },
        })

        release.resolve(undefined)
        expect(yield* Fiber.join(processing)).toBe("continue")

        const messages = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const part = messages
          .flatMap((message) => message.parts)
          .find((part): part is MessageV2.CompactionPart => part.type === "compaction")!
        expect(part.projection?.tail_start_id).toBe(tailUser.id)
        expect(part.projection?.tail_end_id).toBe(tailAssistant.id)
        expect(part.projection?.compacted_tool_calls).toEqual([{ call_id: "call-large-tail", tokens: 10_000 }])
        expect(part.projection?.manifest).toContain("src/auth.ts (read: lines 10-20, then edited)")
        expect(part.projection?.summary).toContain("PROCESS_SUMMARY")
        expect(
          messages.some(
            (message) =>
              message.info.role === "user" &&
              message.parts.some((part) => part.type === "text" && part.metadata?.compaction_continue === true),
          ),
        ).toBe(false)

        const modelMessages = JSON.stringify(
          yield* MessageV2.toModelMessagesEffect(MessageV2.filterCompacted([...messages].reverse()), model),
        )
        expect(modelMessages.match(/PROCESS_SUMMARY/g)).toHaveLength(1)
        expect(modelMessages).toContain("arrived during compaction")
        expect(modelMessages).toContain("Tool result omitted during compaction: 10000 tokens")
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

it.live("does not create an automatic compaction boundary from a stale user snapshot", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const compaction = yield* SessionCompaction.Service
      const chat = yield* sessions.create({ title: "Stale compaction boundary" })
      const first = yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "old prompt" }],
      })
      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "new prompt" }],
      })

      const created = yield* compaction.createIfLatest({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        auto: true,
        expectedUserID: first.info.id,
      })

      expect(created).toBe(false)
      expect(
        (yield* sessions.messages({ sessionID: chat.id })).some((message) =>
          message.parts.some((part) => part.type === "compaction"),
        ),
      ).toBe(false)

      const initiallyEmpty = yield* sessions.create({ title: "Empty stale compaction boundary" })
      yield* prompt.prompt({
        sessionID: initiallyEmpty.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "arrived after empty snapshot" }],
      })
      expect(
        yield* compaction.createIfLatest({
          sessionID: initiallyEmpty.id,
          agent: "build",
          model: ref,
          auto: true,
          expectedUserID: undefined,
        }),
      ).toBe(false)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live(
  "checks the latest user and creates the compaction boundary atomically",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* () {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const compaction = yield* SessionCompaction.Service
        const chat = yield* sessions.create({ title: "Atomic compaction boundary" })
        const first = yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "old prompt" }],
        })
        const nextID = MessageID.ascending()
        const now = Date.now()
        const next: MessageV2.User = {
          id: nextID,
          sessionID: chat.id,
          role: "user",
          time: { created: now },
          agent: "build",
          model: ref,
          source: "user",
        }
        const db = Database.Client()
        const descriptor = Object.getOwnPropertyDescriptor(db, "transaction")
        const transaction = db.transaction.bind(db)
        let inject = true
        // Commit T2 immediately before the next transaction starts. A check
        // outside that transaction has already gone stale; a check inside sees T2.
        const intercepted: typeof db.transaction = (callback, config) => {
          if (inject) {
            inject = false
            SyncEvent.run(MessageV2.Event.Updated, { sessionID: chat.id, info: next })
          }
          return transaction(callback, config)
        }
        db.transaction = intercepted
        yield* Effect.addFinalizer(() =>
          Effect.sync(() =>
            descriptor
              ? Object.defineProperty(db, "transaction", descriptor)
              : Reflect.deleteProperty(db, "transaction"),
          ),
        )

        const created = yield* compaction.createIfLatest({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          auto: true,
          expectedUserID: first.info.id,
        })

        expect(inject).toBe(false)
        expect(created).toBe(false)
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).some((message) =>
            message.parts.some((part) => part.type === "compaction"),
          ),
        ).toBe(false)
      }),
      { git: true, config: providerCfg },
    ),
  10_000,
)

it.live("rejects rebuilding an empty session without fabricating a result", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Empty rebuild" })
      const exit = yield* prompt
        .command({
          sessionID: chat.id,
          command: Command.Default.REBUILD,
          arguments: "",
          agent: "build",
        })
        .pipe(Effect.exit)

      expect(Exit.isFailure(exit)).toBe(true)
      expect(yield* sessions.messages({ sessionID: chat.id })).toHaveLength(0)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("serializes concurrent first-query pinning", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "Concurrent pin" })

      yield* Effect.all(
        [
          prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model: ref,
            noReply: true,
            system: "system a",
            harness: "codex",
            parts: [{ type: "text", text: "query a" }],
          }),
          prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model: ref,
            noReply: true,
            system: "system b",
            harness: "default",
            parts: [{ type: "text", text: "query b" }],
          }),
        ],
        { concurrency: "unbounded" },
      )

      const pinned = (yield* sessions.get(session.id)).prompt
      const users = (yield* sessions.messages({ sessionID: session.id }))
        .map((message) => message.info)
        .filter((message): message is MessageV2.User => message.role === "user")
      expect(pinned).toBeDefined()
      expect(users).toHaveLength(2)
      expect(users.every((message) => message.system === pinned?.system)).toBe(true)
      expect(users.every((message) => message.systemMode === pinned?.systemMode)).toBe(true)
      expect(users.every((message) => message.harness === pinned?.harness)).toBe(true)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("resume continues an incomplete assistant without creating or rewriting a user message", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      const seeded = yield* seed(chat.id)
      const before = yield* sessions.messages({ sessionID: chat.id })
      yield* llm.text("world")

      const candidate = yield* prompt.recovery({ sessionID: chat.id })
      expect(candidate).toEqual([
        { kind: "assistant", assistantMessageID: seeded.assistant.id, parentMessageID: seeded.user.id, created: expect.any(Number) },
      ])
      const result = yield* prompt.resume({
        sessionID: chat.id,
        assistantMessageID: seeded.assistant.id,
        titleLocale: "fr-FR",
      })
      const requests = yield* llm.inputs
      expect(requests).toHaveLength(1)
      expect(JSON.stringify(requests)).not.toContain("Generate a single-line title")

      const after = yield* sessions.messages({ sessionID: chat.id })
      expect(after.filter((message) => message.info.role === "user")).toHaveLength(1)
      expect(after.length).toBe(before.length + 1)
      expect(after.find((message) => message.info.id === seeded.assistant.id)?.info).toMatchObject(seeded.assistant)
      // tool-resume must stamp Abandoned-as-resumed on the continued assistant
      const seededAfter = after.find((message) => message.info.id === seeded.assistant.id)?.info
      const abandonMsg =
        seededAfter && seededAfter.role === "assistant" && seededAfter.error
          ? ((seededAfter.error as { data?: { message?: string }; message?: string }).data?.message ??
            (seededAfter.error as { message?: string }).message ??
            "")
          : ""
      expect(abandonMsg).toContain("Abandoned: resumed as a new assistant turn")
      expect(result.info.role).toBe("assistant")
      expect(result.info.id).not.toBe(seeded.assistant.id)
      expect(result.parts.some((part) => part.type === "text" && part.text === "world")).toBe(true)
    }),
    {
      git: true,
      config: (url) => ({ ...providerCfg(url), model_groups: { lite: "test/test-model" } }),
    },
  ),
)

taskMetadataIt.live("resume settles the old assistant before returning admission and entering the new loop", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Recovery settlement timing" })
      const seeded = yield* seed(chat.id)
      const before = yield* sessions.messages({ sessionID: chat.id })
      const gate = yield* holdNextSessionPre()
      yield* llm.text("resumed answer")

      const completion = yield* prompt.startResume({
        sessionID: chat.id,
        assistantMessageID: seeded.assistant.id,
      })
      const admitted = yield* sessions.messages({ sessionID: chat.id })
      const abandoned = admitted.find((message) => message.info.id === seeded.assistant.id)?.info
      expect(abandoned?.role === "assistant" && abandoned.time.completed).toEqual(expect.any(Number))
      expect(abandoned?.role === "assistant" && abandoned.error?.name).toBe("MessageAbortedError")
      expect(admitted.map((message) => message.info.id)).toEqual(before.map((message) => message.info.id))
      yield* Deferred.await(gate.entered).pipe(Effect.timeout("10 seconds"))
      expect(yield* llm.calls).toBe(0)
      expect(
        (yield* sessions.messages({ sessionID: chat.id })).find((message) => message.info.id === seeded.assistant.id)
          ?.info,
      ).toEqual(abandoned)

      yield* Deferred.succeed(gate.release, undefined)
      const result = yield* completion.pipe(Effect.timeout("10 seconds"))
      const after = yield* sessions.messages({ sessionID: chat.id })
      expect(after.find((message) => message.info.id === seeded.assistant.id)?.info).toEqual(abandoned)
      expect(after.filter((message) => message.info.role === "user").map((message) => message.info)).toEqual(
        before.filter((message) => message.info.role === "user").map((message) => message.info),
      )
      expect(after.find((message) => message.info.id === seeded.user.id)?.parts).toEqual(
        expect.arrayContaining(before.find((message) => message.info.id === seeded.user.id)!.parts),
      )
      expect(result.info.id).not.toBe(seeded.assistant.id)
      expect(result.info.role === "assistant" && result.info.parentID).toBe(seeded.user.id)
      expect(result.parts.findLast((part) => part.type === "text")?.text).toBe("resumed answer")
      expect(JSON.stringify((yield* llm.inputs)[0].messages)).toContain("hi there")
    }),
    { git: true, config: providerCfg },
  ),
)

taskMetadataIt.live(
  "a non-retryable empty error remains a recovery candidate and is removed only after admission",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Errored recovery candidate" })
        yield* user(chat.id, "fail without retry")
        yield* llm.error(400, { error: { message: "terminal provider failure" } })

        yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.exit)

        const messages = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const assistant = messages.findLast(
          (message): message is MessageV2.WithParts & { info: MessageV2.Assistant } =>
            message.info.role === "assistant",
        )
        expect(assistant).toBeDefined()
        if (!assistant) return
        expect(assistant.info.error?.name).toBe("APIError")
        expect(assistant.info.time.completed).toBeUndefined()
        expect(yield* prompt.recovery({ sessionID: chat.id })).toEqual([
          {
            kind: "assistant",
            assistantMessageID: assistant.info.id,
            parentMessageID: assistant.info.parentID,
            created: assistant.info.time.created,
          },
        ])
        const gate = yield* holdNextSessionPre()
        yield* llm.text("recovered after provider error")
        const completion = yield* prompt.startResume({ sessionID: chat.id, assistantMessageID: assistant.info.id })
        const abandoned = (yield* sessions.messages({ sessionID: chat.id })).find(
          (message) => message.info.id === assistant.info.id,
        )?.info
        expect(abandoned).toBeUndefined()
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).filter((message) => message.info.role === "user"),
        ).toHaveLength(1)
        yield* Deferred.await(gate.entered).pipe(Effect.timeout("10 seconds"))
        expect(yield* llm.calls).toBe(1)
        yield* Deferred.succeed(gate.release, undefined)
        const result = yield* completion.pipe(Effect.timeout("10 seconds"))
        expect(result.info.id).not.toBe(assistant.info.id)
        expect(result.parts.findLast((part) => part.type === "text")?.text).toBe("recovered after provider error")
      }),
      { git: true, config: providerCfg },
    ),
)

it.live("resume rejected by a busy runner leaves the incomplete assistant unchanged", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const state = yield* SessionRunState.Service
      const chat = yield* sessions.create({ title: "Busy recovery admission" })
      const seeded = yield* seed(chat.id)
      const before = yield* sessions.messages({ sessionID: chat.id })
      yield* state.startRunning(chat.id, "main", Effect.succeed(before[1]), Effect.never)
      yield* Effect.addFinalizer(() => state.cancel(chat.id))

      const exit = yield* prompt
        .startResume({ sessionID: chat.id, assistantMessageID: seeded.assistant.id })
        .pipe(Effect.exit)

      expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toBeInstanceOf(Session.BusyError)
      expect(yield* sessions.messages({ sessionID: chat.id })).toEqual(before)
      expect(yield* llm.calls).toBe(0)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("resume of a superseded recovery candidate leaves its assistant unchanged", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Stale recovery admission" })
      const seeded = yield* seed(chat.id)
      yield* user(chat.id, "a later request supersedes the interrupted turn")
      const before = yield* sessions.messages({ sessionID: chat.id })

      const exit = yield* prompt
        .startResume({ sessionID: chat.id, assistantMessageID: seeded.assistant.id })
        .pipe(Effect.timeout("10 seconds"), Effect.exit)

      expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toMatchObject({ name: "NotFoundError" })
      expect(yield* sessions.messages({ sessionID: chat.id })).toEqual(before)
      expect(yield* llm.calls).toBe(0)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("resume admission terminates when its claimed runner is cancelled before work enters", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Dropped recovery admission" })
      const seeded = yield* seed(chat.id)
      const before = yield* sessions.messages({ sessionID: chat.id })
      droppedStartGate = { sessionID: chat.id, actorID: "main", armed: true }

      const exit = yield* prompt
        .startResume({ sessionID: chat.id, assistantMessageID: seeded.assistant.id })
        .pipe(Effect.timeout("1 second"), Effect.exit)

      expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true)
      expect(yield* sessions.messages({ sessionID: chat.id })).toEqual(before)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("reported instruction files reach the normal model request", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ dir, llm }) {
      const instruction = "instruction-delivery-normal: preserve this exact runtime constraint"
      yield* Effect.promise(() => Bun.write(path.join(dir, "AGENTS.md"), instruction))

      const bus = yield* Bus.Service
      const loaded = defer<string[]>()
      const off = yield* bus.subscribeCallback(TuiEvent.InstructionsLoaded, (event) =>
        loaded.resolve(event.properties.files),
      )
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Instruction delivery",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "follow the project instructions" }],
      })
      yield* llm.text("done")
      yield* prompt.loop({ sessionID: session.id })

      expect(yield* Effect.promise(() => loaded.promise)).toContain("AGENTS.md")
      off()
      expect(JSON.stringify((yield* llm.inputs)[0].messages)).toContain(instruction)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("disabled instruction files are neither reported nor sent to the model", () =>
  withInstructionsDisabled(() =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ dir, llm }) {
        const instruction = "disabled-instruction-must-stay-hidden"
        yield* Effect.promise(() => Bun.write(path.join(dir, "AGENTS.md"), instruction))

        const bus = yield* Bus.Service
        const loaded: string[][] = []
        const off = yield* bus.subscribeCallback(TuiEvent.InstructionsLoaded, (event) =>
          loaded.push(event.properties.files),
        )
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "Disabled instruction delivery" })
        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "do not load project instructions" }],
        })
        yield* llm.text("done")
        yield* prompt.loop({ sessionID: session.id })

        off()
        expect(loaded).toEqual([])
        expect(JSON.stringify((yield* llm.inputs)[0].messages)).not.toContain(instruction)
      }),
      { git: true, config: providerCfg },
    ),
  ),
)

it.live("reported instruction files reach every MaxMode candidate request", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ dir, llm }) {
      const instruction = "instruction-delivery-max-mode: preserve this exact runtime constraint"
      yield* Effect.promise(() => Bun.write(path.join(dir, "AGENTS.md"), instruction))

      const bus = yield* Bus.Service
      const loaded = defer<string[]>()
      const off = yield* bus.subscribeCallback(TuiEvent.InstructionsLoaded, (event) =>
        loaded.resolve(event.properties.files),
      )
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "MaxMode instruction delivery",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* prompt.prompt({
        sessionID: session.id,
        agent: "max",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "follow the project instructions" }],
      })
      yield* llm.text("candidate zero")
      yield* llm.text("candidate one")
      yield* llm.text("0")
      yield* prompt.loop({ sessionID: session.id })

      expect(yield* Effect.promise(() => loaded.promise)).toContain("AGENTS.md")
      off()
      const inputs = yield* llm.inputs
      expect(inputs).toHaveLength(3)
      expect(JSON.stringify(inputs[0].messages)).toContain(instruction)
      expect(JSON.stringify(inputs[1].messages)).toContain(instruction)
    }),
    {
      git: true,
      config: (url) => ({ ...maxModeProviderCfg(url), agent: { max: { steps: 2 } } }),
    },
  ),
)

it.live("title generation retries do not publish durable session retry state", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const bus = yield* Bus.Service
      const runtimeLlm = yield* LLM.Service
      const provider = yield* ProviderSvc.Service
      const agents = yield* AgentSvc.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Title retry isolation" })
      const agent = yield* agents.get("build")
      if (!agent) return yield* Effect.die("missing build agent")
      const model = yield* provider.getModel(ref.providerID, ref.modelID)
      const user: MessageV2.User = {
        id: MessageID.ascending(),
        sessionID: chat.id,
        role: "user",
        time: { created: Date.now() },
        agent: agent.name,
        model: ref,
      }
      const statuses: number[] = []
      const attempts: number[] = []
      const offStatus = yield* bus.subscribeCallback(SessionStatus.Event.Status, (event) => {
        if (event.properties.sessionID !== chat.id || event.properties.status.type !== "retry") return
        statuses.push(event.properties.status.attempt)
      })
      const offAttempt = yield* bus.subscribeCallback(Session.Event.RetryAttempt, (event) => {
        if (event.properties.sessionID !== chat.id) return
        attempts.push(event.properties.attempt)
      })

      yield* llm.error(503, { error: "title unavailable one" })
      yield* llm.text("recovered ephemeral request")
      yield* runtimeLlm
        .stream({
          user,
          sessionID: chat.id,
          model,
          agent,
          system: [],
          messages: [{ role: "user", content: "retry ephemeral request" }],
          tools: {},
          retries: 0,
          ephemeral: true,
        })
        .pipe(Stream.runDrain)
      offStatus()
      offAttempt()

      expect(yield* llm.calls).toBe(2)
      expect({ statuses, attempts }).toEqual({ statuses: [], attempts: [] })
    }),
    {
      git: true,
      config: (url) => ({
        ...providerCfg(url),
        retry: {
          request: { maxRetries: 1, initialDelayMs: 1, maxDelayMs: 1 },
          jitterRatio: 0,
        },
      }),
    },
  ),
)

it.live("MaxMode candidate retries publish global attempts and retry status", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const bus = yield* Bus.Service
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({
        title: "MaxMode retry observability",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      const statuses: Array<{ attempt: number; phaseAttempt?: number; scope?: string }> = []
      const attempts: Array<{ attempt: number; phaseAttempt: number; scope: string }> = []
      const offStatus = yield* bus.subscribeCallback(SessionStatus.Event.Status, (event) => {
        if (event.properties.sessionID !== chat.id || event.properties.status.type !== "retry") return
        statuses.push({
          attempt: event.properties.status.attempt,
          phaseAttempt: event.properties.status.phaseAttempt,
          scope: event.properties.status.scope,
        })
      })
      const offAttempt = yield* bus.subscribeCallback(Session.Event.RetryAttempt, (event) => {
        if (event.properties.sessionID !== chat.id || event.properties.scope !== "max-candidate") return
        attempts.push({
          attempt: event.properties.attempt,
          phaseAttempt: event.properties.phaseAttempt,
          scope: event.properties.scope,
        })
      })

      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "max",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "retry both candidates once" }],
      })
      yield* llm.error(503, { error: "candidate zero unavailable" })
      yield* llm.error(503, { error: "candidate one unavailable" })
      yield* llm.text("candidate zero recovered")
      yield* llm.text("candidate one recovered")
      yield* llm.text("0")

      yield* prompt.loop({ sessionID: chat.id })
      offStatus()
      offAttempt()

      expect({ statuses, attempts }).toStrictEqual({
        statuses: [
          { attempt: 1, phaseAttempt: 1, scope: "max-candidate" },
          { attempt: 2, phaseAttempt: 1, scope: "max-candidate" },
        ],
        attempts: [
          { attempt: 1, phaseAttempt: 1, scope: "max-candidate" },
          { attempt: 2, phaseAttempt: 1, scope: "max-candidate" },
        ],
      })
    }),
    {
      git: true,
      config: (url) => ({
        ...maxModeProviderCfg(url),
        agent: { max: { steps: 2 } },
        retry: {
          request: { maxRetries: 0 },
          maxCandidate: { maxRetries: 1, initialDelayMs: 1, maxDelayMs: 1 },
          jitterRatio: 0,
        },
      }),
    },
  ),
)

it.live(
  "office attachment reminder respects effective skill permission",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({
          title: "Denied office skill",
          permission: [{ permission: "skill", pattern: "xlsx-official", action: "deny" }],
        })

        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [
            { type: "text", text: "summarize the attachment" },
            {
              type: "file",
              mime: "text/plain",
              filename: "denied.csv",
              url: "data:text/plain;base64,YQ==",
            },
          ],
        })
        yield* llm.text("done")
        yield* prompt.loop({ sessionID: session.id })

        const requests = yield* llm.inputs
        expect(JSON.stringify(requests[0].messages)).not.toContain("Skill search trigger:")
        expect(JSON.stringify(requests[0].messages)).not.toContain(
          "The user's message attaches office document file(s).",
        )
        expect(JSON.stringify(requests[0].messages)).not.toContain("xlsx-official/SKILL.md")
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live(
  "loop injects instruction files but not the dynamic environment block",
  () =>
    withoutDynamicSystemPrompt(() =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const marker = "dynamic-instruction-marker"
          yield* Effect.promise(() => Bun.write(path.join(Instance.directory, "AGENTS.md"), marker))
          const chat = yield* sessions.create({
            title: "No cwd",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          yield* prompt.prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            noReply: true,
            parts: [{ type: "text", text: "hello" }],
          })
          yield* llm.text("world")

          yield* prompt.loop({ sessionID: chat.id })

          const inputs = yield* llm.inputs
          const serialized = JSON.stringify(inputs)
          const system = ((inputs[0].messages ?? []) as { role: string; content: unknown }[])
            .flatMap((message) =>
              message.role === "system" && typeof message.content === "string" ? [message.content] : [],
            )
            .join("\n")
          expect(serialized).not.toContain("Working directory:")
          expect(system).toContain(marker)
          expect(system).toContain("Skills available in this session:")
          expect(system.indexOf("Skills available in this session:")).toBeLessThan(system.indexOf(marker))
          const conversation = ((inputs[0].messages ?? []) as { role: string; content: unknown }[]).filter(
            (message) => message.role !== "system",
          )
          expect(JSON.stringify(conversation)).not.toContain("Skills available in this session:")
          expect(serialized).not.toContain("Authoritative skills catalog snapshot v2:")
        }),
        { git: true, config: providerCfg },
      ),
    ),
  30_000,
)

it.live(
  "reuses the frozen system prefix for later queries in the same session",
  () =>
    withoutDynamicSystemPrompt(() =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const file = path.join(Instance.directory, "AGENTS.md")
          yield* Effect.promise(() => Bun.write(file, "PREFIX_INSTRUCTION_V1"))
          const chat = yield* sessions.create({
            title: "Frozen prefix",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })

          yield* llm.text("first")
          yield* prompt.prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "first query" }],
          })
          const firstSnapshot = yield* Effect.sync(() =>
            Database.use((db) =>
              db
                .select()
                .from(SessionPrefixSnapshotTable)
                .where(eq(SessionPrefixSnapshotTable.session_id, chat.id))
                .get(),
            ),
          )
          yield* Effect.promise(() => Bun.write(file, "PREFIX_INSTRUCTION_V2"))
          yield* llm.text("second")
          yield* prompt.prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "second query" }],
          })

          const inputs = yield* llm.inputs
          const systems = inputs
            .slice(0, 2)
            .map((input) =>
              ((input.messages ?? []) as { role: string; content: unknown }[])
                .flatMap((message) =>
                  message.role === "system" && typeof message.content === "string" ? [message.content] : [],
                )
                .join("\n"),
            )
          expect(systems).toHaveLength(2)
          expect(systems[0]).toContain("PREFIX_INSTRUCTION_V1")
          expect(systems[1]).toBe(systems[0])
          expect(systems[1]).not.toContain("PREFIX_INSTRUCTION_V2")

          const snapshots = yield* Effect.sync(() =>
            Database.use((db) =>
              db
                .select()
                .from(SessionPrefixSnapshotTable)
                .where(eq(SessionPrefixSnapshotTable.session_id, chat.id))
                .all(),
            ),
          )
          const messages = yield* sessions.messages({ sessionID: chat.id })
          const lastAssistant = messages.findLast((message) => message.info.role === "assistant")
          expect(snapshots).toHaveLength(1)
          expect(firstSnapshot?.revision).toBe(1)
          expect(snapshots[0].skill_catalog?.turnID).not.toBe(firstSnapshot?.skill_catalog?.turnID)
          expect(snapshots[0]).toMatchObject({
            revision: 2,
            watermark_message_id: lastAssistant?.info.id,
            skill_catalog: {
              schema: 3,
              turnID: messages.findLast((message) => message.info.role === "user")?.info.id,
              text: firstSnapshot?.skill_catalog?.text,
              version: firstSnapshot?.skill_catalog?.version,
            },
          })
        }),
        { git: true, config: providerCfg },
      ),
    ),
  30_000,
)

it.live(
  "checkpoint capture keeps the frozen tool membership before a live prefix rotation",
  () =>
    withoutDynamicSystemPrompt(() =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "Frozen checkpoint tools",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })

          yield* llm.text("first")
          yield* prompt.prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "first query" }],
          })
          yield* Effect.sync(() =>
            Database.use((db) =>
              db
                .update(SessionPrefixSnapshotTable)
                .set({
                  tools_hash: "frozen-before-live-reload",
                  tools: [
                    {
                      name: "frozen_only",
                      description: "captured before reload",
                      input_schema: { type: "object", properties: {} },
                      active: true,
                    },
                    {
                      name: "frozen_hidden",
                      description: "registered before reload",
                      input_schema: { type: "object", properties: { old: { type: "boolean" } } },
                      active: false,
                    },
                  ],
                  loaded_mcp_tools: ["frozen_only"],
                })
                .where(eq(SessionPrefixSnapshotTable.session_id, chat.id))
                .run(),
            ),
          )

          const capture = prefixCaptureRef.current
          expect(capture).toBeDefined()
          if (!capture) return
          const captured = yield* capture({
            sessionID: chat.id,
            agentName: "build",
            providerID: ref.providerID,
            modelID: ref.modelID,
            msgs: yield* sessions.messages({ sessionID: chat.id }),
          })

          expect(Object.keys(captured.tools)).toEqual(["frozen_only", "frozen_hidden"])
          expect(captured.tools.frozen_only?.description).toBe("captured before reload")
          expect(captured.activeTools).toEqual(["frozen_only"])
          expect(captured.loadedMcpTools).toEqual(["frozen_only"])
        }),
        { git: true, config: providerCfg },
      ),
    ),
  30_000,
)

mcpIt.live(
  "warm capture restores new JSON activity before stale legacy database columns",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const model = { providerID: ref.providerID, modelID: ModelID.make("gpt-5-test") }
        const parent = yield* sessions.create({ title: "Snapshot format compatibility" })
        yield* llm.text("parent completed")
        yield* prompt.prompt({
          sessionID: parent.id,
          model,
          parts: [{ type: "text", text: "Create the persisted prefix before format migration" }],
        })
        const capture = prefixCaptureRef.current
        if (!capture) throw new Error("real prefix capture was not bound")
        const messages = yield* sessions.messages({ sessionID: parent.id })
        const tools = ["exec", "hidden"].map((name) => ({
          name,
          description: `captured ${name}`,
          input_schema: { type: "object" as const, properties: {} },
        }))
        const cases = [
          { tools, active: ["exec"], expected: ["exec"] },
          { tools, active: [], expected: [] },
          { tools, active: null, expected: ["exec", "hidden"] },
          { tools: [{ ...tools[0], active: true }, tools[1]], active: ["hidden"], expected: ["hidden"] },
          {
            tools: tools.map((item) => ({ ...item, active: item.name === "exec" })),
            active: ["hidden"],
            expected: ["exec"],
          },
          { tools: tools.map((item) => ({ ...item, active: false })), active: ["exec"], expected: [] },
        ]
        for (const item of cases) {
          yield* Effect.sync(() =>
            Database.use((db) =>
              db
                .update(SessionPrefixSnapshotTable)
                .set({ tools: item.tools, active_tools: item.active, loaded_mcp_tools: ["hidden"] })
                .where(eq(SessionPrefixSnapshotTable.session_id, parent.id))
                .run(),
            ),
          )
          const prefix = yield* capture({
            sessionID: parent.id,
            agentName: "build",
            providerID: model.providerID,
            modelID: model.modelID,
            msgs: messages,
          })
          expect(Object.keys(prefix.tools)).toEqual(["exec", "hidden"])
          expect(prefix.activeTools).toEqual(item.expected)
          expect(prefix.loadedMcpTools).toEqual(["hidden"])
        }
        expect(yield* llm.inputs).toHaveLength(1)
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

for (const disabled of [false, true]) {
  mcpIt.live(`warm MCP capture ${disabled ? "excludes parent-disabled" : "retains authorized hidden"} tools`, () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const model = { providerID: ref.providerID, modelID: ModelID.make("gpt-5-test") }
        const parent = yield* sessions.create({
          title: "Warm MCP membership",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("parent completed")
        yield* prompt.prompt({
          sessionID: parent.id,
          model,
          tools: { mcp_success: !disabled },
          parts: [{ type: "text", text: "complete the parent request before capture" }],
        })
        const requests = yield* llm.inputs
        expect(requests).toHaveLength(1)
        expect((requests[0].tools as Array<Record<string, unknown>>).map(wireToolName)).not.toContain("mcp_success")
        const snapshot = yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .select()
              .from(SessionPrefixSnapshotTable)
              .where(eq(SessionPrefixSnapshotTable.session_id, parent.id))
              .get(),
          ),
        )
        expect(snapshot).toBeDefined()
        const capture = prefixCaptureRef.current
        if (!capture) throw new Error("real prefix capture was not bound")
        const prefix = yield* capture({
          sessionID: parent.id,
          agentName: "build",
          providerID: model.providerID,
          modelID: model.modelID,
          msgs: yield* sessions.messages({ sessionID: parent.id }),
        })
        expect(prefix.activeTools).not.toContain("mcp_success")
        expect(Object.hasOwn(prefix.tools, "mcp_success")).toBe(!disabled)
      }),
      { git: true, config: providerCfg },
    ),
  )
}

itActor.live("full-context structured output remains advertised outside the captured parent tool subset", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const actors = yield* Effect.serviceOption(Actor.Service)
      if (actors._tag === "None") throw new Error("real Actor service was not provided")
      const model = { providerID: ref.providerID, modelID: ModelID.make("gpt-5-test") }
      const parent = yield* sessions.create({ title: "Text parent with structured child" })
      yield* prompt.prompt({
        sessionID: parent.id,
        model,
        noReply: true,
        parts: [{ type: "text", text: "capture an ordinary text request" }],
      })
      const capture = prefixCaptureRef.current
      if (!capture) throw new Error("real prefix capture was not bound")
      const messages = yield* sessions.messages({ sessionID: parent.id })
      const prefix = yield* capture({
        sessionID: parent.id,
        agentName: "build",
        providerID: model.providerID,
        modelID: model.modelID,
        msgs: messages,
      })
      expect(prefix.activeTools).toBeDefined()
      expect(prefix.activeTools).not.toContain("StructuredOutput")
      expect(prefix.tools.StructuredOutput).toBeUndefined()
      yield* llm.tool("StructuredOutput", { ok: true })
      const spawned = yield* actors.value.spawn({
        mode: "subagent",
        sessionID: parent.id,
        agentType: "build",
        task: "return the structured result",
        context: "full",
        tools: [],
        background: false,
        model,
        format: {
          type: "json_schema",
          schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
          retryCount: 0,
        },
        forkContext: { ...prefix, model, watermarkMsgID: messages.at(-1)!.info.id },
      })
      const outcome = yield* Deferred.await(spawned.outcome)
      expect(outcome.status).toBe("success")
      if (outcome.status === "success") expect(outcome.structured).toEqual({ ok: true })
      const requests = yield* llm.inputs
      expect(requests).toHaveLength(1)
      expect((requests[0].tools as Array<Record<string, unknown>>).map(wireToolName)).toContain("StructuredOutput")
      expect(requests[0].tool_choice).toBe("required")
    }),
    { git: true, config: providerCfg },
  ),
)

for (const changed of [false, true]) {
  itActor.live(
    `frozen hidden tools ${changed ? "reject changed" : "execute matching"} schemas through exec and direct dispatch`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          // makeHttp conditionally exposes Actor, so its inferred shared layer
          // type omits this service. This fixture explicitly enables it above.
          const actors = yield* Effect.serviceOption(Actor.Service)
          if (actors._tag === "None") throw new Error("real Actor service was not provided")
          const actor = actors.value
          const model = { providerID: ref.providerID, modelID: ModelID.make("gpt-5-test") }
          const parent = yield* sessions.create({
            title: "Frozen hidden schema",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          yield* prompt.prompt({
            sessionID: parent.id,
            model,
            noReply: true,
            parts: [{ type: "text", text: "capture the original tool contract" }],
          })
          const capture = prefixCaptureRef.current
          if (!capture) throw new Error("real prefix capture was not bound")
          const messages = yield* sessions.messages({ sessionID: parent.id })
          const prefix = yield* capture({
            sessionID: parent.id,
            agentName: "build",
            providerID: model.providerID,
            modelID: model.modelID,
            msgs: messages,
          })
          expect(prefix.activeTools).toContain("exec")
          expect(prefix.activeTools).not.toContain("bash")
          expect(prefix.tools.bash).toBeDefined()
          const schema = yield* Effect.promise(() =>
            Promise.resolve(asSchema(prefix.tools.bash.inputSchema).jsonSchema),
          )
          const original = bunEval("require(`node:fs`).writeFileSync(`compact-original.txt`, ``)")
          const nested = bunEval("require(`node:fs`).writeFileSync(`compact-nested.txt`, ``)")
          const direct = bunEval("require(`node:fs`).writeFileSync(`compact-direct.txt`, ``)")
          // The older captured contract allowed a single command. The current
          // registry contract is wider; neither entry point may silently adopt it.
          const tools = changed
            ? {
                ...prefix.tools,
                bash: {
                  ...prefix.tools.bash,
                  inputSchema: jsonSchema({
                    ...schema,
                    properties: { ...schema.properties, command: { type: "string", enum: [original] } },
                  }),
                },
              }
            : prefix.tools
          yield* llm.tool("exec", {
            code: `return await tools.bash(${JSON.stringify({ command: nested, description: "Write nested fixture" })})`,
          })
          yield* llm.tool("bash", {
            command: direct,
            description: "Write direct fixture",
          })
          yield* llm.text("done")
          const spawned = yield* actor.spawn({
            mode: "subagent",
            sessionID: parent.id,
            agentType: "build",
            task: "exercise the captured shell tool",
            context: "full",
            tools: ["bash"],
            background: false,
            model,
            forkContext: { ...prefix, tools, model, watermarkMsgID: messages.at(-1)!.info.id },
          })
          expect((yield* Deferred.await(spawned.outcome)).status).toBe("success")
          expect(
            yield* Effect.promise(() => Bun.file(path.join(Instance.directory, "compact-nested.txt")).exists()),
          ).toBe(!changed)
          expect(
            yield* Effect.promise(() => Bun.file(path.join(Instance.directory, "compact-direct.txt")).exists()),
          ).toBe(!changed)
          const requests = yield* llm.inputs
          expect(requests).toHaveLength(3)
          expect((requests[0].tools as Array<Record<string, unknown>>).map(wireToolName)).not.toContain("bash")
          const parts = (yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })).flatMap(
            (message) => message.parts,
          )
          expect(parts.some((part) => part.type === "tool" && part.tool === "exec")).toBe(true)
          expect(parts.some((part) => part.type === "tool" && part.tool === "bash")).toBe(true)
        }),
        { git: true, config: providerCfg },
      ),
  )
}

it.live(
  "loop injects the dynamic environment block only when the flag is set",
  () =>
    withDynamicSystemPrompt(() =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const marker = "dynamic-instruction-marker"
          yield* Effect.promise(() => Bun.write(path.join(Instance.directory, "AGENTS.md"), marker))
          const chat = yield* sessions.create({
            title: "With cwd",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          yield* prompt.prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            noReply: true,
            parts: [{ type: "text", text: "hello" }],
          })
          yield* llm.text("world")
          yield* prompt.loop({ sessionID: chat.id })

          const inputs = JSON.stringify(yield* llm.inputs)
          expect(inputs).toContain("Working directory:")
          expect(inputs).toContain(marker)
        }),
        { git: true, config: providerCfg },
      ),
    ),
  20_000,
)

it.live("loop-streak recovery crops repeated finished assistants at the request boundary", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Loop streak request crop" })
      const parent = yield* user(chat.id, "recover this looping turn")
      const markers = ["LOOP_BLOCK_ONE", "LOOP_BLOCK_TWO", "LOOP_BLOCK_THREE"]
      for (const marker of markers) {
        const assistant = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          parentID: parent.id,
          sessionID: chat.id,
          mode: "build",
          agent: "build",
          cost: 0,
          path: { cwd: Instance.directory, root: Instance.worktree },
          tokens: { input: 1, output: 1, reasoning: 1, cache: { read: 0, write: 0 } },
          modelID: ref.modelID,
          providerID: ref.providerID,
          time: { created: Date.now(), completed: Date.now() },
          finish: "tool-calls",
        })
        yield* sessions.updatePart({
          id: PartID.ascending(),
          messageID: assistant.id,
          sessionID: chat.id,
          type: "reasoning",
          text: "repeat the same failing plan",
          time: { start: Date.now(), end: Date.now() },
        })
        yield* sessions.updatePart({
          id: PartID.ascending(),
          messageID: assistant.id,
          sessionID: chat.id,
          type: "text",
          text: marker,
        })
      }
      yield* llm.text("recovered")

      yield* prompt.loop({ sessionID: chat.id })

      const request = JSON.stringify((yield* llm.inputs)[0])
      expect(request).toContain("recover this looping turn")
      markers.forEach((marker) => expect(request).not.toContain(marker))
      expect(request).not.toContain("repeat the same failing plan")
      const messages = yield* sessions.messages({ sessionID: chat.id })
      expect(messages.filter((message) => message.info.role === "user")).toHaveLength(1)
      expect(JSON.stringify(messages.find((message) => message.info.id === parent.id)?.parts)).toContain(
        "loop_streak_crop",
      )
    }),
    {
      git: true,
      config: (url) => ({
        ...providerCfg(url),
        experimental: { loop_streak_recovery: { enabled: true, trigger_count: 3 } },
      }),
    },
  ),
)

it.live(
  "hook messages do not trigger autonomous skill injection",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ dir, llm }) {
        yield* Effect.promise(() =>
          Bun.write(
            path.join(dir, ".mimocode", "skill", "restricted-hook", "SKILL.md"),
            `---
name: restricted-hook
description: Instructions that scheduled hooks must not auto-load.
---

# Restricted Hook
`,
          ),
        )
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({
          title: "Hook skill boundary",
          permission: [{ permission: "skill", pattern: "restricted-hook", action: "deny" }],
        })

        const created = yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          source: "hook",
          provenance: {
            hookPhase: "pre",
            hookIteration: 1,
            pluginNames: ["legacy-hook"],
            hookIDs: ["legacy-hook-1"],
          },
          model: ref,
          noReply: true,
          parts: [
            { type: "text", text: "Run /restricted-hook on this file." },
            {
              type: "file",
              mime: "text/plain",
              filename: "hook.csv",
              url: "data:text/plain;base64,YQ==",
            },
          ],
        })
        expect((created.info as unknown as { source?: string }).source).toBe("hook")
        if (created.info.role !== "user") throw new Error("expected hook user message")
        yield* sessions.updateMessage({ ...created.info, source: undefined })

        yield* llm.text("done")
        yield* prompt.loop({ sessionID: session.id })

        const request = JSON.stringify((yield* llm.inputs)[0].messages)
        expect(request).not.toContain("# Restricted Hook")
        expect(request).not.toContain("The user's message attaches office document file(s).")
        expect(request).not.toContain("Skill search trigger:")
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live("MaxMode final step bypasses runMaxStep and sends toolChoice none to the processor", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({
        title: "MaxMode final step",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "max",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "finish without another tool call" }],
      })
      yield* llm.text("final answer")

      const result = yield* prompt.loop({ sessionID: chat.id })
      expect(result.info.role).toBe("assistant")

      const inputs = yield* llm.inputs
      expect(inputs).toHaveLength(1)
      expect(inputs[0].tool_choice).toBe("none")
    }),
    { git: true, config: builtInMaxModeLastStepProviderCfg },
  ),
)

it.live(
  "request preflight sends a request inside the former guard band without compaction",
  () =>
    withoutDynamicSystemPrompt(() =>
      withInstructionsDisabled(() =>
        provideTmpdirServer(
          Effect.fnUntraced(function* ({ llm }) {
            const prompt = yield* SessionPrompt.Service
            const sessions = yield* Session.Service
            const chat = yield* sessions.create({ title: "Preflight threshold boundary" })
            const text = "BOUNDARY_REQUEST " + "x".repeat(255_000)
            yield* prompt.prompt({
              sessionID: chat.id,
              agent: "boundary",
              model: ref,
              noReply: true,
              parts: [{ type: "text", text }],
            })
            yield* llm.text("within the compaction threshold")

            const result = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.timeout("20 seconds"))
            expect(
              result.parts.some((part) => part.type === "text" && part.text === "within the compaction threshold"),
            ).toBe(true)
            const inputs = yield* llm.inputs
            expect(inputs).toHaveLength(1)
            expect(JSON.stringify(inputs[0].messages)).toContain(text)
            const messages = yield* sessions.messages({ sessionID: chat.id })
            expect(messages.flatMap((message) => message.parts).filter((part) => part.type === "compaction")).toEqual(
              [],
            )
          }),
          {
            git: true,
            config: (url) => {
              const base = providerCfg(url)
              return {
                ...base,
                memory: { disable_write: true },
                compaction: { reserved: 0 },
                agent: { boundary: { mode: "primary", prompt: "Respond briefly.", tool_allowlist: [] } },
                provider: {
                  ...base.provider,
                  test: {
                    ...base.provider.test,
                    models: {
                      "test-model": {
                        ...base.provider.test.models["test-model"],
                        limit: { context: 100_000, input: 100_000, output: 1_000 },
                      },
                    },
                  },
                },
              }
            },
          },
        ),
      ),
    ),
  30_000,
)

it.live(
  "request preflight recovers old history once and preserves the active turn",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Recoverable preflight overflow" })
        const history = yield* seed(chat.id, { finish: "stop" })
        const historyMessage = (yield* sessions.messages({ sessionID: chat.id })).find(
          (message) => message.info.id === history.user.id,
        )
        const historyText = historyMessage?.parts.find((part): part is MessageV2.TextPart => part.type === "text")
        if (!historyText) throw new Error("missing seeded history text")
        yield* sessions.updatePart({ ...historyText, text: "old history " + "x".repeat(400 * 1024) })
        yield* user(chat.id, "ACTIVE_TURN_MUST_SURVIVE")
        yield* llm.text("overflow summary")
        yield* llm.text("final answer")

        const result = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.timeout("20 seconds"))
        expect(result.parts.some((part) => part.type === "text" && part.text === "final answer")).toBe(true)

        const messages = yield* sessions.messages({ sessionID: chat.id })
        const cancelled = messages.filter(
          (message) => message.info.role === "assistant" && message.info.error?.name === "MessageAbortedError",
        )
        expect(cancelled).toHaveLength(1)
        expect(cancelled[0].info.role === "assistant" && cancelled[0].info.finish).toBe("cancelled")
        expect(messages.flatMap((message) => message.parts).filter((part) => part.type === "compaction")).toHaveLength(
          1,
        )
        const inputs = yield* llm.inputs
        expect(inputs).toHaveLength(2)
        expect(JSON.stringify(inputs[1].messages)).toContain("ACTIVE_TURN_MUST_SURVIVE")
      }),
      { git: true, config: recoverableOverflowCfg },
    ),
  30_000,
)

it.live(
  "an oversized external request arriving during compaction stays in the recovery floor",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Arrived request recovery floor" })
        const history = yield* seed(chat.id, { finish: "stop" })
        const historyMessage = (yield* sessions.messages({ sessionID: chat.id })).find(
          (message) => message.info.id === history.user.id,
        )
        const historyText = historyMessage?.parts.find((part): part is MessageV2.TextPart => part.type === "text")
        if (!historyText) throw new Error("missing arrived-request history text")
        yield* sessions.updatePart({ ...historyText, text: "old history " + "x".repeat(400 * 1024) })
        yield* user(chat.id, "ACTIVE_TURN_BEFORE_ARRIVAL")

        const releaseSummary = defer<void>()
        yield* Effect.addFinalizer(() => Effect.sync(() => releaseSummary.resolve()))
        yield* llm.hold("overflow summary", releaseSummary.promise)
        const running = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1).pipe(Effect.timeout("10 seconds"))

        const marker = "OVERSIZED_EXTERNAL_BEGIN " + "x".repeat(400 * 1024) + " OVERSIZED_EXTERNAL_END"
        const external = yield* prompt.prompt({
          sessionID: chat.id,
          messageID: MessageID.ascending(),
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: marker }],
        })
        releaseSummary.resolve()

        const result = yield* Fiber.join(running).pipe(Effect.timeout("20 seconds"))
        expect(result.info.role).toBe("assistant")
        if (result.info.role === "assistant") {
          expect(result.info.finish).toBe("error")
          expect(result.info.error?.name).toBe("ModelError")
          expect(result.info.error?.data.message).toContain("fixed request prefix and active turn still do not fit")
        }
        const messages = yield* sessions.messages({ sessionID: chat.id })
        const stored = messages.find((message) => message.info.id === external.info.id)
        expect(JSON.stringify(stored)).toContain("OVERSIZED_EXTERNAL_BEGIN")
        expect(JSON.stringify(stored)).toContain("OVERSIZED_EXTERNAL_END")
        expect(
          messages.filter(
            (message) => message.info.role === "assistant" && message.info.error?.name === "MessageAbortedError",
          ),
        ).toHaveLength(1)
        expect(messages.flatMap((message) => message.parts).filter((part) => part.type === "compaction")).toHaveLength(
          1,
        )
        expect(yield* llm.hits).toHaveLength(1)
      }),
      { git: true, config: recoverableOverflowCfg },
    ),
  30_000,
)

it.live(
  "request preflight stops when recovery makes no progress",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Stalled preflight recovery" })
        const checkpoint = yield* seed(chat.id, { finish: "stop" })
        yield* Effect.promise(() => mkdir(path.dirname(checkpointPath(chat.id)), { recursive: true }))
        yield* Effect.promise(() =>
          Bun.write(
            checkpointPath(chat.id),
            "# Session checkpoint\n\n## §1 Active intent\nKeep diagnosing the stalled overflow recovery.\n",
          ),
        )
        yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .update(SessionTable)
              .set({ last_checkpoint_message_id: checkpoint.assistant.id })
              .where(eq(SessionTable.id, chat.id))
              .run(),
          ),
        )
        const history = yield* seed(chat.id, { finish: "stop" })
        const historyMessage = (yield* sessions.messages({ sessionID: chat.id })).find(
          (message) => message.info.id === history.user.id,
        )
        const historyText = historyMessage?.parts.find((part): part is MessageV2.TextPart => part.type === "text")
        if (!historyText) throw new Error("missing post-checkpoint history text")
        yield* sessions.updatePart({ ...historyText, text: "post-checkpoint history " + "x".repeat(400 * 1024) })
        yield* user(chat.id, "ACTIVE_TURN_AFTER_CHECKPOINT")

        const result = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.timeout("20 seconds"))

        expect(result.info.role).toBe("assistant")
        if (result.info.role === "assistant") {
          expect(result.info.finish).toBe("error")
          expect(result.info.error?.name).toBe("ModelError")
          expect(result.info.error?.data.message).toContain("no sufficient progress")
        }
        const messages = yield* sessions.messages({ sessionID: chat.id })
        expect(
          messages.filter(
            (message) => message.info.role === "assistant" && message.info.error?.name === "MessageAbortedError",
          ),
        ).toHaveLength(1)
        expect(
          messages.filter((message) => message.info.role === "assistant" && message.info.error?.name === "ModelError"),
        ).toHaveLength(1)
        expect(messages.flatMap((message) => message.parts).filter((part) => part.type === "checkpoint")).toHaveLength(
          1,
        )
        expect(yield* llm.hits).toHaveLength(0)
      }),
      { git: true, config: checkpointRecoveryOverflowCfg },
    ),
  30_000,
)

it.live(
  "request preflight treats oversized current user text as unrecoverable",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Current-turn preflight overflow" })
        yield* user(chat.id, "ACTIVE_TURN_TOO_LARGE " + "x".repeat(400 * 1024))

        const result = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.timeout("10 seconds"))

        expect(result.info.role).toBe("assistant")
        if (result.info.role === "assistant") {
          expect(result.info.finish).toBe("error")
          expect(result.info.error?.name).toBe("ModelError")
          expect(result.info.error?.data.message).toContain("active turn")
        }
        const messages = yield* sessions.messages({ sessionID: chat.id })
        expect(messages.flatMap((message) => message.parts).some((part) => part.type === "compaction")).toBe(false)
        expect(yield* llm.hits).toHaveLength(0)
      }),
      { git: true, config: recoverableOverflowCfg },
    ),
  20_000,
)

it.live(
  "request preflight keeps oversized current-turn attachments in the recovery floor",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Current attachment preflight overflow" })
        const current = yield* user(chat.id, "inspect the attached image")
        yield* sessions.updatePart({
          id: PartID.ascending(),
          messageID: current.id,
          sessionID: chat.id,
          type: "file",
          mime: "image/png",
          filename: "oversized.png",
          url: `data:image/png;base64,${"A".repeat(400 * 1024)}`,
        })

        const result = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.timeout("10 seconds"))

        expect(result.info.role).toBe("assistant")
        if (result.info.role === "assistant") {
          expect(result.info.finish).toBe("error")
          expect(result.info.error?.name).toBe("ModelError")
        }
        const messages = yield* sessions.messages({ sessionID: chat.id })
        expect(messages.flatMap((message) => message.parts).some((part) => part.type === "compaction")).toBe(false)
        expect(yield* llm.hits).toHaveLength(0)
      }),
      { git: true, config: recoverableOverflowCfg },
    ),
  20_000,
)

it.live("request preflight overflow terminates on unrecoverable static prefix", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ dir, llm }) {
      yield* Effect.promise(() => Bun.write(path.join(dir, "AGENTS.md"), "x".repeat(60 * 1024)))
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Static preflight overflow" })
      yield* user(chat.id, "hello")

      const fiber = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* prompt.cancel(chat.id).pipe(Effect.ignore)
          yield* Fiber.interrupt(fiber).pipe(Effect.ignore)
        }),
      )

      const assistant = yield* Effect.gen(function* () {
        while (true) {
          const messages = yield* sessions.messages({ sessionID: chat.id })
          const match = messages.find((msg) => msg.info.role === "assistant")
          if (match?.info.role === "assistant" && (match.info.finish || match.info.error || match.parts.length > 0)) {
            return match
          }
          yield* Effect.sleep(10)
        }
      }).pipe(Effect.timeout("10 seconds"))

      expect(assistant.info.role).toBe("assistant")
      if (assistant.info.role === "assistant") {
        // The static prefix (60KB AGENTS.md) alone overflows the 16K window; compaction
        // can't shrink it, so the turn terminates with a clear error instead of looping
        // through recovery.
        expect(assistant.info.finish).toBe("error")
        expect(assistant.info.error?.name).toBe("ModelError")
      }
      expect(assistant.parts).toEqual([])
      expect(yield* llm.hits).toHaveLength(0)
    }),
    { git: true, config: staticPreflightOverflowCfg },
  ),
)

for (const mode of ["active", "inactive", "auto-disabled"] as const) {
  largeSchemaMcpIt.live(`request preflight handles a large ${mode} MCP schema`, () => {
    const run = provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Large MCP schema" })
        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          harness: "default",
          noReply: true,
          parts: [{ type: "text", text: "hello" }],
        })
        yield* llm.text("request accepted")
        const result = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.timeout("20 seconds"))
        expect(result.info.role).toBe("assistant")
        if (result.info.role !== "assistant") return
        if (mode === "active") {
          expect(result.info.finish).toBe("error")
          expect(result.info.error?.name).toBe("ModelError")
          expect(yield* llm.hits).toHaveLength(0)
          const messages = yield* sessions.messages({ sessionID: chat.id })
          expect(messages.flatMap((message) => message.parts).some((part) => part.type === "compaction")).toBe(false)
          return
        }
        expect(result.info.error).toBeUndefined()
        expect(result.parts.some((part) => part.type === "text" && part.text === "request accepted")).toBe(true)
        const requests = yield* llm.inputs
        expect(requests).toHaveLength(1)
        const schema = JSON.stringify(requests[0].tools)
        if (mode === "inactive") {
          expect(schema).not.toContain("x".repeat(1024))
          const compaction = yield* SessionCompaction.Service
          for (const text of ["second turn", "third turn"]) {
            yield* llm.text("request accepted")
            yield* prompt.prompt({ sessionID: chat.id, agent: "build", model: ref, parts: [{ type: "text", text }] })
          }
          yield* compaction.create({ sessionID: chat.id, agent: "compaction", model: ref, auto: false })
          const messages = yield* sessions.messages({ sessionID: chat.id })
          const boundary = messages.at(-1)
          if (!boundary) return yield* Effect.die("Missing compaction boundary")
          yield* llm.text("summary")
          expect(
            yield* compaction.process({ parentID: boundary.info.id, messages, sessionID: chat.id, auto: false }),
          ).toBe("continue")
          const summary = (yield* llm.inputs).at(-1)
          expect(summary?.tool_choice).toBe("none")
          expect(JSON.stringify(summary?.tools)).not.toContain("x".repeat(1024))
          return
        }
        expect(schema).toContain("x".repeat(1024 * 1024))
      }),
      {
        git: true,
        config: (url) => ({
          ...providerCfg(url),
          ...(mode === "auto-disabled" ? { compaction: { auto: false } } : {}),
        }),
      },
    )
    return mode === "inactive" ? run.pipe(withMcpToolSearch) : run
  }, 30_000)
}

unserializablePreflightIt.live("request preflight rejects unserializable plugin metadata before dispatch", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Unserializable request" })
      yield* seed(chat.id, { finish: "stop" })
      yield* user(chat.id, "continue")
      yield* llm.text("provider must not be called")
      const result = yield* prompt.loop({ sessionID: chat.id })
      expect(result.info.role).toBe("assistant")
      if (result.info.role !== "assistant") return
      expect(result.info.finish).toBe("error")
      expect(result.info.error?.name).toBe("ModelError")
      if (result.info.error?.name === "ModelError") expect(result.info.error.data.message).toContain("serialized")
      expect(yield* llm.hits).toHaveLength(0)
      const messages = yield* sessions.messages({ sessionID: chat.id })
      expect(messages.flatMap((message) => message.parts).some((part) => part.type === "compaction")).toBe(false)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("request preflight treats current turn context as unrecoverable", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Turn context preflight overflow" })
      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        noReply: true,
        system: "CURRENT_TURN_CONTEXT_MUST_BE_COUNTED\n" + "x".repeat(400 * 1024),
        parts: [{ type: "text", text: "hello" }],
      })
      yield* llm.text("provider must not be called")

      const result = yield* prompt.loop({ sessionID: chat.id })

      expect(result.info.role).toBe("assistant")
      if (result.info.role === "assistant") {
        expect(result.info.finish).toBe("error")
        expect(result.info.error?.name).toBe("ModelError")
      }
      expect(result.parts).toEqual([])
      expect(yield* llm.hits).toHaveLength(0)
    }),
    { git: true, config: recoverableOverflowCfg },
  ),
)

it.live("bounded native hidden agents skip request preflight overflow", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Bounded preflight skip" })
      yield* user(chat.id, "hello " + "x".repeat(6_000), "dream")
      yield* llm.text("bounded-ok")

      const result = yield* prompt.loop({ sessionID: chat.id })
      const parts = result.parts.filter((part) => part.type === "text")

      expect(result.info.role).toBe("assistant")
      if (result.info.role === "assistant") {
        expect(result.info.finish).toBe("stop")
        expect(result.info.error).toBeUndefined()
      }
      expect(parts.some((part) => part.type === "text" && part.text === "bounded-ok")).toBe(true)
      expect(yield* llm.hits).toHaveLength(1)
    }),
    { git: true, config: preflightOverflowCfg },
  ),
)

it.live("caps data text file parts before storing synthetic user text", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Data file cap" })
      const longText = "x".repeat(60 * 1024)

      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        noReply: true,
        parts: [
          {
            type: "file",
            url: `data:text/plain;base64,${Buffer.from(longText).toString("base64")}`,
            filename: "large.txt",
            mime: "text/plain",
          },
        ],
      })

      const messages = yield* sessions.messages({ sessionID: chat.id })
      const textParts = messages.flatMap((message) => message.parts.filter((part) => part.type === "text"))
      const decoded = textParts.find(
        (part) => part.type === "text" && part.text.includes("data text truncated before model injection"),
      )

      expect(decoded).toBeDefined()
      if (decoded?.type === "text") expect(decoded.text.length).toBeLessThan(longText.length)
    }),
    { git: true, config: providerCfg },
  ),
)

itMcp.live("caps MCP resource text before storing synthetic user text", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "MCP resource cap" })

      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        noReply: true,
        parts: [
          {
            type: "file",
            url: "mcp://large",
            filename: "large-resource.txt",
            mime: "text/plain",
            source: {
              type: "resource",
              clientName: "test-client",
              uri: "mcp://large",
              text: { value: "large-resource.txt", start: 0, end: 18 },
            },
          },
        ],
      })

      const messages = yield* sessions.messages({ sessionID: chat.id })
      const textParts = messages.flatMap((message) => message.parts.filter((part) => part.type === "text"))
      const resourceText = textParts.find(
        (part) => part.type === "text" && part.text.includes("MCP resource text truncated before model injection"),
      )

      expect(resourceText).toBeDefined()
      if (resourceText?.type === "text") expect(resourceText.text.length).toBeLessThan(longMcpResourceText.length)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("caps command shell expansion before storing command prompt", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Command shell cap" })

      yield* llm.text("done")
      yield* prompt.command({
        sessionID: chat.id,
        agent: "build",
        model: "test/test-model",
        command: "huge-shell",
        arguments: "",
      })

      const messages = yield* sessions.messages({ sessionID: chat.id })
      const textParts = messages.flatMap((message) => message.parts.filter((part) => part.type === "text"))
      const expanded = textParts.find(
        (part) =>
          part.type === "text" && part.text.includes("command shell expansion truncated before model injection"),
      )

      expect(expanded).toBeDefined()
    }),
    {
      git: true,
      config: (url) => ({
        ...providerCfg(url),
        command: {
          "huge-shell": {
            template: "Shell output:\n!`bun -e \"process.stdout.write('x'.repeat(60 * 1024))\"`",
          },
        },
      }),
    },
  ),
)

it.live("caps slash-command skill content through the mention injector", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ dir, llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Skill command cap" })
      const skillDir = path.join(dir, "local-skills", "huge-skill")
      const longSkillBody = "x".repeat(60 * 1024)

      yield* Effect.promise(async () => {
        await mkdir(skillDir, { recursive: true })
        await Bun.write(
          path.join(skillDir, "SKILL.md"),
          ["---", "name: huge-skill", "description: Huge local skill", "---", longSkillBody].join("\n"),
        )
      })

      yield* llm.text("done")
      yield* prompt.command({
        sessionID: chat.id,
        agent: "build",
        model: "test/test-model",
        command: "huge-skill",
        arguments: "",
      })

      const messages = yield* sessions.messages({ sessionID: chat.id })
      const textParts = messages.flatMap((message) => message.parts.filter((part) => part.type === "text"))
      const skillContent = textParts.find(
        (part) => part.type === "text" && part.text.includes("skill mention content truncated before model injection"),
      )

      expect(skillContent).toBeDefined()
      if (skillContent?.type === "text") expect(skillContent.text.length).toBeLessThan(longSkillBody.length)
    }),
    {
      git: true,
      config: (url) => ({
        ...providerCfg(url),
        skills: { paths: ["local-skills"] },
      }),
    },
  ),
)

it.live("caps free-text skill mention content before storing synthetic skill text", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ dir, llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Skill mention cap" })
      const skillDir = path.join(dir, "local-skills", "huge-mention")
      const longSkillBody = "x".repeat(60 * 1024)

      yield* Effect.promise(async () => {
        await mkdir(skillDir, { recursive: true })
        await Bun.write(
          path.join(skillDir, "SKILL.md"),
          ["---", "name: huge-mention", "description: Huge mentioned skill", "---", longSkillBody].join("\n"),
        )
      })

      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "Please use /huge-mention for this task." }],
      })
      yield* llm.text("done")
      yield* prompt.loop({ sessionID: chat.id })

      const messages = yield* sessions.messages({ sessionID: chat.id })
      const textParts = messages.flatMap((message) => message.parts.filter((part) => part.type === "text"))
      const skillContent = textParts.find(
        (part) => part.type === "text" && part.text.includes("skill mention content truncated before model injection"),
      )

      expect(skillContent).toBeDefined()
      if (skillContent?.type === "text") expect(skillContent.text.length).toBeLessThan(longSkillBody.length)
    }),
    {
      git: true,
      config: (url) => ({
        ...providerCfg(url),
        skills: { paths: ["local-skills"] },
      }),
    },
  ),
)

it.live("static loop returns assistant text through local provider", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Prompt provider",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "hello" }],
      })

      yield* llm.text("world")

      const result = yield* prompt.loop({ sessionID: session.id })
      expect(result.info.role).toBe("assistant")
      expect(result.parts.some((part) => part.type === "text" && part.text === "world")).toBe(true)
      expect(yield* llm.hits).toHaveLength(1)
      expect(yield* llm.pending).toBe(0)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("injects orchestrator system prompt for agent 'orchestrator'", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Orchestrator",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "orchestrator",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "kick things off" }],
      })

      yield* llm.text("ok")
      yield* prompt.loop({ sessionID: session.id })

      const inputs = yield* llm.inputs
      expect(JSON.stringify(inputs)).toContain("MiMoCode Orchestrator")
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("static loop consumes queued replies across turns", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Prompt provider turns",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "hello one" }],
      })

      yield* llm.text("world one")

      const first = yield* prompt.loop({ sessionID: session.id })
      expect(first.info.role).toBe("assistant")
      expect(first.parts.some((part) => part.type === "text" && part.text === "world one")).toBe(true)

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "hello two" }],
      })

      yield* llm.text("world two")

      const second = yield* prompt.loop({ sessionID: session.id })
      expect(second.info.role).toBe("assistant")
      expect(second.parts.some((part) => part.type === "text" && part.text === "world two")).toBe(true)

      expect(yield* llm.hits).toHaveLength(2)
      expect(yield* llm.pending).toBe(0)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("loop continues when finish is tool-calls", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Pinned",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "hello" }],
      })
      yield* llm.tool("first", { value: "first" })
      yield* llm.text("second")

      const result = yield* prompt.loop({ sessionID: session.id })
      expect(yield* llm.calls).toBe(2)
      expect(result.info.role).toBe("assistant")
      if (result.info.role === "assistant") {
        expect(result.parts.some((part) => part.type === "text" && part.text === "second")).toBe(true)
        expect(result.info.finish).toBe("stop")
      }
    }),
    { git: true, config: providerCfg },
  ),
)

for (const isError of [false, true]) {
  const screenshots = Array.from({ length: 51 }, () => ({
    type: "image" as const,
    data: mcpErrorImage,
    mimeType: "image/png",
  }))
  const screenshotsIt = testEffect(
    makeHttp(
      mcpLayer(() => ({
        mcp_screenshots: dynamicTool({
          description: "Capture screenshots",
          inputSchema: jsonSchema({ type: "object", properties: {} }),
          execute: async () => ({
            content: [{ type: "text", text: isError ? "Capture failed" : "Captured" }, ...screenshots],
            isError,
          }),
        }),
      })),
    ),
  )

  screenshotsIt.live(`Responses preserves 51 MCP screenshots through followup and resume (error=${isError})`, () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({
          title: "Pinned",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: mcpRef,
          noReply: true,
          parts: [{ type: "text", text: "Capture screenshots" }],
        })
        yield* llm.tool("mcp_tool_search", { query: "screenshots" })
        yield* llm.tool("mcp_screenshots", {})
        yield* llm.text("Screenshots received")
        yield* prompt.loop({ sessionID: session.id })

        const part = (yield* MessageV2.filterCompactedEffect(session.id))
          .flatMap((message) => message.parts)
          .find((part) => part.type === "tool" && part.tool === "mcp_screenshots")
        if (part?.type !== "tool") throw new Error("Expected screenshot tool result")
        expect(part.state.status).toBe(isError ? "error" : "completed")
        const assertImages = (request: Record<string, unknown>) => {
          expect(request.input).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                type: "function_call_output",
                call_id: part.callID,
                output: [
                  { type: "input_text", text: isError ? "Tool failed: Capture failed" : "Captured" },
                  ...screenshots.map(() => ({ type: "input_image", image_url: mcpErrorImageURL })),
                ],
              }),
            ]),
          )
          expect(JSON.stringify(request)).not.toContain(MessageV2.SYNTHETIC_ATTACHMENT_PROMPT)
        }
        assertImages((yield* llm.inputs).at(-1)!)
        yield* llm.text("History received")
        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: mcpRef,
          parts: [{ type: "text", text: "Inspect the previous screenshots again" }],
        })
        assertImages((yield* llm.inputs).at(-1)!)
      }),
      {
        git: true,
        config: (url) => {
          const config = mediaProviderCfg(url)
          return {
            ...config,
            provider: { ...config.provider, test: { ...config.provider.test, npm: "@ai-sdk/openai" } },
          }
        },
      },
    ),
  )
}

// [TP-RUN-R12-36] Desktop turn-execution: exercise the engine execution boundary,
// persistence and model continuation, not a renderer-injected error string.
for (const mode of ["throw", "reject", "short"] as const) {
  const text = mode === "short" ? "short MCP exception" : "MCP exception\n" + "诊断😀 line\n".repeat(30_000)
  const exceptionIt = testEffect(makeHttp(mcpLayer(() => ({
    diagnostic: dynamicTool({
      description: "Diagnostic exception probe",
      inputSchema: jsonSchema({ type: "object", properties: {} }),
      execute: () => {
        if (mode === "throw") throw new Error(text)
        return Promise.reject(mode === "short" ? new Error(text) : text)
      },
    }),
  }))))
  for (const nested of [false, true]) {
    exceptionIt.live(`MCP exception ${mode} ${nested ? "exec" : "direct"} is bounded [TP-RUN-R12-36]`, () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const session = yield* sessions.create({
            title: "Exception boundary",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          yield* prompt.prompt({ sessionID: session.id, agent: "build", model: nested ? mcpRef : ref, noReply: true,
            parts: [{ type: "text", text: "run diagnostic" }] })
          yield* llm.tool(nested ? "exec" : "diagnostic", nested ? { code: "await tools.diagnostic({})" } : {})
          yield* llm.text("exception handled")
          yield* prompt.loop({ sessionID: session.id })
          const parts = (yield* MessageV2.filterCompactedEffect(session.id)).flatMap(message => message.parts)
          const tool = parts.find((part): part is MessageV2.ToolPart => part.type === "tool" && part.tool === (nested ? "exec" : "diagnostic"))
          expect(tool).toBeDefined()
          if (!tool || tool.state.status === "pending") throw new Error("missing tool state")
          const subparts = tool.state.metadata?.sub_parts as Array<{ tool: string; state: { status: string; error: string; metadata?: Record<string, unknown> } }> | undefined
          const state = nested ? subparts?.find(part => part.tool === "diagnostic")?.state : tool.state
          expect(state?.status).toBe("error")
          if (!state || !("error" in state)) throw new Error("missing error state")
          if (mode === "short") {
            expect(state.error).toBe(text)
          } else {
            expect(Buffer.byteLength(state.error)).toBeLessThan(55 * 1024)
            expect(state.metadata?.truncated).toBe(true)
            expect(typeof state.metadata?.outputPath).toBe("string")
            const saved = yield* Effect.promise(() => Bun.file(String(state.metadata?.outputPath)).text())
            expect(saved === text).toBe(true)
            expect(state.error).toContain("tool call failed")
            const followup = JSON.stringify((yield* llm.inputs).at(-1))
            expect(followup.includes(text)).toBe(false)
            expect(Buffer.byteLength(followup)).toBeLessThan(256 * 1024)
          }
          expect(parts.some(part => part.type === "text" && part.text === "exception handled")).toBe(true)
        }),
        { git: true, config: providerCfg },
      ), 30_000)
  }
}

mcpIt.live("MCP isError becomes a tool error without losing standard result fields", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const bus = yield* Bus.Service
      const metricSeen = defer<void>()
      const statuses: string[] = []
      const session = yield* sessions.create({
        title: "Pinned",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      const off = yield* bus.subscribeCallback(Metrics.ToolCall, (event) => {
        if (event.properties.sessionID !== session.id || event.properties.tool_name !== "mcp_result") return
        statuses.push(event.properties.tool_call_status)
        metricSeen.resolve()
      })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: mcpRef,
        harness: "default",
        noReply: true,
        parts: [{ type: "text", text: "send the message" }],
      })
      yield* llm.tool("mcp_tool_search", { query: "execution error" })
      yield* llm.tool("mcp_result", {})
      yield* llm.text("I saw that sending failed")

      const result = yield* prompt.loop({ sessionID: session.id })
      yield* Effect.promise(() => metricSeen.promise)
      off()

      const tool = (yield* MessageV2.filterCompactedEffect(session.id))
        .flatMap((message) => message.parts)
        .find(
          (part): part is ErrorToolPart =>
            part.type === "tool" && part.tool === "mcp_result" && part.state.status === "error",
        )
      expect(tool).toBeDefined()
      if (!tool) return

      expect(tool.state.error).toBe(
        'Message was not sent\n\nResource diagnostic\n\nStructured content:\n{"sent":false,"reason":"composer rejected the request"}',
      )
      expect(tool.state.metadata?.mcp).toEqual({
        structuredContent: mcpErrorResult.structuredContent,
        isError: true,
        _meta: mcpErrorResult._meta,
        legacyMetadata: mcpLegacyMetadata,
      })
      expect(tool.state.attachments).toHaveLength(3)
      expect(tool.state.attachments?.[0]).toMatchObject({
        type: "file",
        mime: "image/png",
        url: mcpErrorImageURL,
        sessionID: session.id,
        messageID: tool.messageID,
      })
      expect(tool.state.attachments?.[1]).toMatchObject({
        type: "file",
        mime: "audio/wav",
        url: `data:audio/wav;base64,${mcpErrorAudio}`,
        sessionID: session.id,
        messageID: tool.messageID,
      })
      expect(tool.state.attachments?.[2]).toMatchObject({
        type: "file",
        mime: "application/octet-stream",
        url: `data:application/octet-stream;base64,${mcpErrorBinary}`,
        filename: "mcp://diagnostic.bin",
        sessionID: session.id,
        messageID: tool.messageID,
      })
      expect(statuses).toEqual(["error"])
      expect(result.parts.some((part) => part.type === "text" && part.text === "I saw that sending failed")).toBe(true)

      const requests = yield* llm.inputs
      const followup = JSON.stringify(requests[2])
      expect(followup).toContain("Message was not sent")
      expect(followup).toContain("Resource diagnostic")
      expect(followup).toContain("composer rejected the request")
      expect(followup).toContain('Tool \\"mcp_result\\" call')
      expect(followup).toContain("failed:")
      expect(followup).toContain("diagnostic.bin")
      expect(followup).not.toContain("mcp://diagnostic.bin")
      expect(followup).toContain("application/octet-stream")
      expect(followup).not.toContain(mcpErrorBinary)
      expect(followup).not.toContain("must not become a successful result")
      expect(followup).not.toContain("do-not-send-to-model")
      expect(requests[2]).toMatchObject({
        messages: expect.arrayContaining([
          {
            role: "user",
            content: expect.arrayContaining([
              { type: "text", text: MessageV2.SYNTHETIC_ATTACHMENT_PROMPT },
              { type: "image_url", image_url: { url: mcpErrorImageURL } },
              { type: "input_audio", input_audio: { data: mcpErrorAudio, format: "wav" } },
            ]),
          },
        ]),
      })
    }),
    { git: true, config: mediaProviderCfg },
  ).pipe(withMcpToolSearch),
)

for (const mode of ["direct", "exec"] as const) {
  mcpProgressIt.live(`MCP presentation survives ${mode} completion and remains client-only`, () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({
          title: "MCP presentation",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: mcpRef,
          harness: mode === "direct" ? "default" : "codex",
          noReply: true,
          parts: [{ type: "text", text: "Run the presentation tool" }],
        })
        yield* llm.tool(mode === "direct" ? "mcp_progress" : "exec", mode === "direct" ? {} : {
          code: "const result = await tools.mcp_progress({}); return result.output",
        })
        yield* llm.text("done")
        yield* prompt.loop({ sessionID: session.id })
        const completed = (yield* MessageV2.filterCompactedEffect(session.id))
          .flatMap((message) => message.parts)
          .find((part): part is CompletedToolPart =>
            part.type === "tool" && part.tool === (mode === "direct" ? "mcp_progress" : "exec") && part.state.status === "completed",
          )
        expect(completed).toBeDefined()
        if (!completed) return
        const metadata = mode === "direct"
          ? completed.state.metadata
          : (completed.state.metadata.sub_parts as Array<{ state: { metadata: unknown } }>)[0].state.metadata
        expect(metadata).toMatchObject({
          mcp: {
            isError: false,
            _meta: {
              "mimo/toolSurface": { kind: "browserUse", browserId: "private-browser" },
              final: "private-final",
            },
          },
        })
        const followup = JSON.stringify((yield* llm.inputs).at(-1))
        expect(followup).toContain("finished")
        expect(followup).not.toContain("private-browser")
        expect(followup).not.toContain("private-final")
      }),
      { git: true, config: providerCfg },
    ),
  )
}

mcpIt.live("MCP structuredContent is persisted and reaches the model alongside text", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const bus = yield* Bus.Service
      const metricSeen = defer<void>()
      const statuses: string[] = []
      const session = yield* sessions.create({
        title: "Pinned",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      const off = yield* bus.subscribeCallback(Metrics.ToolCall, (event) => {
        if (event.properties.sessionID !== session.id || event.properties.tool_name !== "mcp_success") return
        statuses.push(event.properties.tool_call_status)
        metricSeen.resolve()
      })

        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: mcpRef,
          harness: "default",
          noReply: true,
          parts: [{ type: "text", text: "inspect the window" }],
        })
        yield* llm.tool("mcp_tool_search", { query: "structured success" })
        yield* llm.tool("mcp_success", {})
        yield* llm.text("The window changed")

        yield* prompt.loop({ sessionID: session.id })
        yield* Effect.promise(() => metricSeen.promise)
        off()

        const tool = (yield* MessageV2.filterCompactedEffect(session.id))
          .flatMap((message) => message.parts)
          .find(
            (part): part is CompletedToolPart =>
              part.type === "tool" && part.tool === "mcp_success" && part.state.status === "completed",
          )
        expect(tool).toBeDefined()
        if (!tool) return

        expect(tool.state.output).toBe('Window updated\n\nStructured content:\n{"changed":true,"windowID":42}')
        expect(tool.state.metadata.mcp).toEqual({
          structuredContent: mcpSuccessResult.structuredContent,
          isError: false,
          _meta: mcpSuccessResult._meta,
        })
        expect(statuses).toEqual(["success"])

        const requests = yield* llm.inputs
        const initialTools = requests[0].tools as Array<Record<string, unknown>>
        const loadedTools = requests[1].tools as Array<Record<string, unknown>>
        expect(initialTools.map(wireToolName)).toContain("mcp_tool_search")
        expect(initialTools.map(wireToolName)).not.toContain("mcp_success")
        expect(initialTools.map(wireToolName)).not.toContain("mcp_result")
        const catalog = wireToolDescription(wireTool(initialTools, "mcp_tool_search") ?? {})
        expect(catalog).toContain("mcp_result — Return a standard MCP tool execution error")
        expect(catalog).toContain("mcp_success — Return a standard structured MCP success result")
        expect(catalog).not.toContain("private_error_code")
        expect(catalog).not.toContain("Secret nested MCP window selector")
        expect(loadedTools.map(wireToolName)).toContain("mcp_success")
        expect(loadedTools.map(wireToolName)).not.toContain("mcp_result")

        const snapshot = yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .select()
              .from(SessionPrefixSnapshotTable)
              .where(eq(SessionPrefixSnapshotTable.session_id, session.id))
              .get(),
          ),
        )
        expect(snapshot?.revision).toBe(2)
        expect(snapshot?.active_tools).toBeNull()
        expect(snapshot?.tools?.find((item) => item.name === "mcp_success")?.active).toBe(true)
        expect(snapshot?.loaded_mcp_tools).toEqual(["mcp_success"])

        const followup = JSON.stringify(requests[2])
        expect(followup).toContain("Window updated")
        expect(followup).toContain('{\\"changed\\":true,\\"windowID\\":42}')
        expect(followup).not.toContain("success-meta-is-client-only")
      }),
      { git: true, config: providerCfg },
    ).pipe(withMcpToolSearch),
  20_000,
)

mcpIt.live(
  "a pinned full-context fork can search an MCP tool that the parent had not loaded",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const actorRegistry = yield* ActorRegistry.Service
        const parent = yield* sessions.create({
          title: "Pinned MCP parent",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* prompt.prompt({
          sessionID: parent.id,
          agent: "build",
          model: mcpRef,
          harness: "default",
          noReply: true,
          parts: [{ type: "text", text: "pin the searchable MCP catalog" }],
        })
        yield* llm.text("parent done")
        yield* prompt.loop({ sessionID: parent.id })

        const snapshot = yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .select()
              .from(SessionPrefixSnapshotTable)
              .where(eq(SessionPrefixSnapshotTable.session_id, parent.id))
              .get(),
          ),
        )
        expect(snapshot?.tools?.map((item) => item.name)).toEqual(
          expect.arrayContaining(["mcp_tool_search", "mcp_result", "mcp_success"]),
        )
        expect(snapshot?.active_tools).toBeNull()
        expect(snapshot?.tools?.find((item) => item.name === "mcp_tool_search")?.active).toBe(true)
        expect(snapshot?.tools?.find((item) => item.name === "mcp_result")?.active).toBe(false)
        expect(snapshot?.loaded_mcp_tools).toEqual([])

        const capture = prefixCaptureRef.current
        expect(capture).toBeDefined()
        if (!capture) return
        const parentMessages = yield* sessions.messages({ sessionID: parent.id })
        const parentUser = parentMessages.findLast((message) => message.info.role === "user")
        if (!parentUser) return yield* Effect.die("missing parent user message")
        const captured = yield* capture({
          sessionID: parent.id,
          agentName: "build",
          providerID: mcpRef.providerID,
          modelID: mcpRef.modelID,
          msgs: parentMessages,
        })
        expect(Object.keys(captured.tools)).toEqual(
          expect.arrayContaining(["mcp_tool_search", "mcp_result", "mcp_success"]),
        )
        expect(captured.loadedMcpTools).toEqual([])

        const child = yield* sessions.create({
          parentID: parent.id,
          title: "Pinned MCP child",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const forkCtx: Actor.ForkContext = {
          ...captured,
          watermarkMsgID: parentUser.info.id,
          model: mcpRef,
        }
        const previous = spawnRef.current
        const bound = {
          spawn: () => Effect.die("unexpected spawn in frozen MCP search test"),
          cancel: () => Effect.void,
          getForkContext: (sessionID: SessionID, actorID: string) =>
            Effect.succeed(sessionID === child.id && actorID === child.id ? forkCtx : undefined),
        }
        spawnRef.current = bound
        const release = prompt.bindActor?.(bound)
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            release?.()
            spawnRef.current = previous
          }),
        )
        yield* actorRegistry.register({
          sessionID: child.id,
          actorID: child.id,
          mode: "peer",
          agent: "general",
          description: "frozen MCP search child",
          contextMode: "full",
          contextWatermark: parentUser.info.id,
          background: false,
          lifecycle: "ephemeral",
          tools: "INHERIT",
        })

        const parentCalls = (yield* llm.inputs).length
        yield* llm.tool("mcp_tool_search", { query: "execution error" })
        yield* llm.text("child done")
        const result = yield* prompt.prompt({
          sessionID: child.id,
          agent: "general",
          agentID: child.id,
          model: mcpRef,
          harness: "default",
          parts: [{ type: "text", text: "find the error-reporting MCP tool" }],
        })

        const requests = (yield* llm.inputs).slice(parentCalls)
        const initial = requests[0].tools as Array<Record<string, unknown>>
        const afterSearch = requests[1].tools as Array<Record<string, unknown>>
        expect(initial.map(wireToolName)).toContain("mcp_tool_search")
        expect(initial.map(wireToolName)).not.toContain("mcp_result")
        expect(wireToolDescription(wireTool(initial, "mcp_tool_search") ?? {})).toContain(
          "mcp_result — Return a standard MCP tool execution error",
        )
        expect(afterSearch.map(wireToolName)).toContain("mcp_result")
        expect(result.parts.some((part) => part.type === "text" && part.text === "child done")).toBe(true)
      }),
      { git: true, config: providerCfg },
    ).pipe(withMcpToolSearch),
  30_000,
)

mcpIt.live(
  "compaction reuses only the pinned wire-active MCP subset",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const compaction = yield* SessionCompaction.Service
        const chat = yield* sessions.create({
          title: "Pinned MCP compaction",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: mcpRef,
          harness: "default",
          noReply: true,
          parts: [{ type: "text", text: "compact without loading an MCP schema" }],
        })
        yield* llm.text("before compaction")
        yield* prompt.loop({ sessionID: chat.id })
        yield* compaction.create({
          sessionID: chat.id,
          agent: "compaction",
          model: mcpRef,
          auto: false,
        })
        const messages = yield* sessions.messages({ sessionID: chat.id })
        const boundary = messages.at(-1)
        if (!boundary) return yield* Effect.die("missing compaction boundary")
        yield* llm.text("summary")
        expect(
          yield* compaction.process({
            parentID: boundary.info.id,
            messages,
            sessionID: chat.id,
            auto: false,
          }),
        ).toBe("continue")

        const request = (yield* llm.inputs)[1]
        const names = (request.tools as Array<Record<string, unknown>>).map(wireToolName)
        expect(names).toContain("mcp_tool_search")
        expect(names).not.toContain("mcp_result")
        expect(names).not.toContain("mcp_success")
        expect(request.tool_choice).toBe("none")
      }),
      { git: true, config: providerCfg },
    ).pipe(withMcpToolSearch),
  20_000,
)

mcpIt.live("exec can call a catalogued MCP tool without loading its outer schema", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Exec MCP",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: mcpRef,
        noReply: true,
        parts: [{ type: "text", text: "inspect the window through exec" }],
      })
      yield* llm.tool("exec", {
        code: "const result = await tools.mcp_success({}); return result.structured",
      })
      yield* llm.text("done")

      yield* prompt.loop({ sessionID: session.id })

      const tool = (yield* MessageV2.filterCompactedEffect(session.id))
        .flatMap((message) => message.parts)
        .find(
          (part): part is CompletedToolPart =>
            part.type === "tool" && part.tool === "exec" && part.state.status === "completed",
        )
      expect(tool?.state.output).toContain('"changed": true')
      expect(tool?.state.output).toContain('"windowID": 42')

      const tools = (yield* llm.inputs)[0].tools as Array<Record<string, unknown>>
      expect(tools.map(wireToolName)).toContain("exec")
      expect(tools.map(wireToolName)).not.toContain("mcp_tool_search")
      expect(tools.map(wireToolName)).not.toContain("mcp_success")
    }),
    { git: true, config: providerCfg },
  ),
)

mcpIt.live("rejects an MCP call that was not loaded by search", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Inactive MCP",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: mcpRef,
        harness: "default",
        noReply: true,
        parts: [{ type: "text", text: "call the MCP tool directly" }],
      })
      yield* llm.tool("mcp_success", {})
      yield* llm.text("I will search first")
      yield* prompt.loop({ sessionID: session.id })

      const part = (yield* MessageV2.filterCompactedEffect(session.id))
        .flatMap((message) => message.parts)
        .find(
          (item): item is ErrorToolPart =>
            item.type === "tool" && item.tool === "mcp_success" && item.state.status === "error",
        )
      expect(part?.state.error).toContain("mcp_tool_search")
      expect(part?.state.metadata?.recoverable).toBe(true)
      const tools = (yield* llm.inputs)[0].tools as Array<Record<string, unknown>>
      expect(tools.map(wireToolName)).not.toContain("mcp_success")
    }),
    { git: true, config: providerCfg },
  ).pipe(withMcpToolSearch),
)

mcpIt.live("resets loaded MCP tools for a new user request", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Request scoped MCP",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: mcpRef,
        harness: "default",
        noReply: true,
        parts: [{ type: "text", text: "inspect the window" }],
      })
      yield* llm.tool("mcp_tool_search", { query: "structured success" })
      yield* llm.tool("mcp_success", {})
      yield* llm.text("done")
      yield* prompt.loop({ sessionID: session.id })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: mcpRef,
        harness: "default",
        noReply: true,
        parts: [{ type: "text", text: "new request" }],
      })
      yield* llm.text("done again")
      yield* prompt.loop({ sessionID: session.id })

      const requests = yield* llm.inputs
      expect((requests[1].tools as Array<Record<string, unknown>>).map(wireToolName)).toContain("mcp_success")
      expect((requests[3].tools as Array<Record<string, unknown>>).map(wireToolName)).not.toContain("mcp_success")
      expect((requests[3].tools as Array<Record<string, unknown>>).map(wireToolName)).toContain("mcp_tool_search")
    }),
    { git: true, config: providerCfg },
  ).pipe(withMcpToolSearch),
)

mcpIt.live("accumulates MCP matches across searches in one user request", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "Accumulated MCP" })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: mcpRef,
        harness: "default",
        noReply: true,
        parts: [{ type: "text", text: "use two MCP capabilities" }],
      })
      yield* llm.tool("mcp_tool_search", { query: "execution error" })
      yield* llm.tool("mcp_tool_search", { query: "structured success" })
      yield* llm.text("ready")
      yield* prompt.loop({ sessionID: session.id })

      const requests = yield* llm.inputs
      expect((requests[1].tools as Array<Record<string, unknown>>).map(wireToolName)).toContain("mcp_result")
      expect((requests[1].tools as Array<Record<string, unknown>>).map(wireToolName)).not.toContain("mcp_success")
      expect((requests[2].tools as Array<Record<string, unknown>>).map(wireToolName)).toContain("mcp_result")
      expect((requests[2].tools as Array<Record<string, unknown>>).map(wireToolName)).toContain("mcp_success")
    }),
    { git: true, config: providerCfg },
  ).pipe(withMcpToolSearch),
)

mcpIt.live("keeps discovery reachable when permissions allow only an MCP tool", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Least privilege MCP",
        permission: [
          { permission: "*", pattern: "*", action: "deny" },
          { permission: "mcp_success", pattern: "*", action: "allow" },
        ],
      })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: mcpRef,
        harness: "default",
        noReply: true,
        parts: [{ type: "text", text: "use the permitted MCP capability" }],
      })
      yield* llm.tool("mcp_tool_search", { query: "structured success" })
      yield* llm.text("ready")
      yield* prompt.loop({ sessionID: session.id })

      const requests = yield* llm.inputs
      const initialTools = requests[0].tools as Array<Record<string, unknown>>
      const catalog = wireToolDescription(wireTool(initialTools, "mcp_tool_search") ?? {})
      expect(initialTools.map(wireToolName)).toContain("mcp_tool_search")
      expect(catalog).toContain("mcp_success — Return a standard structured MCP success result")
      expect(catalog).not.toContain("mcp_result")
      expect(catalog).not.toContain("standard MCP tool execution error")
      expect((requests[1].tools as Array<Record<string, unknown>>).map(wireToolName)).toContain("mcp_success")
      expect((requests[1].tools as Array<Record<string, unknown>>).map(wireToolName)).not.toContain("mcp_result")
    }),
    { git: true, config: providerCfg },
  ).pipe(withMcpToolSearch),
)

mcpIt.live("an explicit search disable keeps the permitted MCP tool unloaded", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Disabled discovery with a permitted MCP tool",
        permission: [
          { permission: "*", pattern: "*", action: "deny" },
          { permission: "mcp_success", pattern: "*", action: "allow" },
        ],
      })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: mcpRef,
        harness: "default",
        tools: { mcp_tool_search: false },
        noReply: true,
        parts: [{ type: "text", text: "discovery is disabled for this request" }],
      })
      yield* llm.tool("mcp_tool_search", { query: "structured success" })
      yield* llm.tool("mcp_success", {})
      yield* llm.text("done")
      yield* prompt.loop({ sessionID: session.id })

      const requests = yield* llm.inputs
      expect(requests).toHaveLength(3)
      for (const request of requests) {
        const names = ((request.tools ?? []) as Array<Record<string, unknown>>).map(wireToolName)
        expect(names).not.toContain("mcp_tool_search")
        expect(names).not.toContain("mcp_success")
      }
      expect(
        (yield* MessageV2.filterCompactedEffect(session.id))
          .flatMap((message) => message.parts)
          .some((part) => part.type === "tool" && part.tool === "mcp_success" && part.state.status === "completed"),
      ).toBe(false)
      expect(JSON.stringify(requests[2])).not.toContain("Window updated")
    }),
    { git: true, config: providerCfg },
  ).pipe(withMcpToolSearch),
)

mcpIt.live("searches only MCP tools allowed by the configured agent", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "Agent allowlist MCP" })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "restricted",
        model: mcpRef,
        harness: "default",
        noReply: true,
        parts: [{ type: "text", text: "use the allowed MCP tool" }],
      })
      yield* llm.tool("mcp_tool_search", { query: "structured success execution error" })
      yield* llm.text("ready")
      yield* prompt.loop({ sessionID: session.id })

      const requests = yield* llm.inputs
      const initialTools = requests[0].tools as Array<Record<string, unknown>>
      const catalog = wireToolDescription(wireTool(initialTools, "mcp_tool_search") ?? {})
      expect(initialTools.map(wireToolName)).toEqual(["mcp_tool_search"])
      expect(catalog).toContain("mcp_success — Return a standard structured MCP success result")
      expect(catalog).not.toContain("mcp_result")
      expect((requests[1].tools as Array<Record<string, unknown>>).map(wireToolName)).toEqual([
        "mcp_tool_search",
        "mcp_success",
      ])
    }),
    { git: true, config: restrictedAgentProviderCfg },
  ).pipe(withMcpToolSearch),
)

mcpIt.live(
  "uses ordinary MCP Tool Search for GPT models without exposing MCP schemas",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "GPT MCP Search" })

        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.openai, modelID: ModelID.make("gpt-5.2") },
          harness: "default",
          noReply: true,
          parts: [{ type: "text", text: "inspect the window" }],
        })
        yield* llm.text("done")
        yield* prompt.loop({ sessionID: session.id })

        const tools = (yield* llm.inputs)[0].tools as Array<Record<string, unknown>>
        const catalog = wireToolDescription(wireTool(tools, "mcp_tool_search") ?? {})
        expect(tools.map(wireToolName)).toContain("mcp_tool_search")
        expect(tools.map(wireToolName)).not.toContain("mcp_success")
        expect(tools.map(wireToolName)).not.toContain("mcp_result")
        expect(catalog).toContain("mcp_success — Return a standard structured MCP success result")
        expect(catalog).toContain("mcp_result — Return a standard MCP tool execution error")
        expect(JSON.stringify(tools)).not.toContain("private_window_id")
        expect(JSON.stringify(tools)).not.toContain("Secret nested MCP error selector")
      }),
      { git: true, config: gptProviderCfg },
    ).pipe(withMcpToolSearch),
  30_000,
)

mcpIt.live("degrades the MCP catalog to names at high context pressure", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "High pressure MCP catalog" })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: mcpRef,
        harness: "default",
        noReply: true,
        // The catalog degrades at 70% of the 90K trigger, or 63K estimated tokens.
        parts: [{ type: "text", text: `inspect available MCP tools ${"x".repeat(255_000)}` }],
      })
      yield* llm.text("done")
      yield* prompt.loop({ sessionID: session.id })

      const tools = (yield* llm.inputs)[0].tools as Array<Record<string, unknown>>
      const catalog = wireToolDescription(wireTool(tools, "mcp_tool_search") ?? {})
      expect(catalog).toContain("Available MCP tool names: mcp_result, mcp_success")
      expect(catalog).not.toContain("Return a standard MCP tool execution error")
      expect(catalog).not.toContain("Return a standard structured MCP success result")
    }),
    { git: true, config: catalogPressureProviderCfg },
  ).pipe(withMcpToolSearch),
)

mcpIt.live(
  "keeps the default prompt and native tool schema for GPT models with the default harness",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "GPT native tools" })

        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.openai, modelID: ModelID.make("gpt-5.2") },
          harness: "default",
          noReply: true,
          parts: [{ type: "text", text: "inspect the native tools" }],
        })
        yield* llm.text("done")
        yield* prompt.loop({ sessionID: session.id })

        const request = (yield* llm.inputs)[0]
        const toolNames = (request.tools as Array<Record<string, unknown>>).map(wireToolName)
        expect(toolNames).toEqual(expect.arrayContaining(["edit", "write", "read", "bash"]))
        expect(toolNames).not.toEqual(expect.arrayContaining(["exec", "apply_patch", "view_image"]))
        expect(toolNames).not.toContain("mcp_tool_search")
        expect(toolNames.length).toBeGreaterThan(1)
        expect(JSON.stringify(request)).not.toContain("You are Codex")
        expect(JSON.stringify(request)).not.toContain("tools.apply_patch")
      }),
      { git: true, config: gptProviderCfg },
    ),
  30_000,
)

mcpIt.live(
  "keeps process-disabled auto GPT requests on the native prompt and native tool schema",
  () =>
    withCodexMode("false", () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "Process-disabled GPT native tools" })

          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model: { providerID: ProviderID.openai, modelID: ModelID.make("gpt-5.2") },
            harness: "auto",
            noReply: true,
            parts: [{ type: "text", text: "inspect the native tools" }],
          })
          yield* llm.text("done")
          yield* prompt.loop({ sessionID: session.id })

          const request = (yield* llm.inputs)[0]
          const toolNames = (request.tools as Array<Record<string, unknown>>).map(wireToolName)
          expect(toolNames).toEqual(expect.arrayContaining(["edit", "write", "read", "bash"]))
          expect(toolNames).not.toEqual(expect.arrayContaining(["exec", "apply_patch", "view_image"]))
          expect(toolNames).not.toContain("mcp_tool_search")
          expect(JSON.stringify(request)).not.toContain("You are Codex")
          expect(JSON.stringify(request)).not.toContain("tools.apply_patch")
        }),
        { git: true, config: gptProviderCfg },
      ),
    ),
  30_000,
)

mcpIt.live(
  "exposes MCP tools directly for non-GPT models by default",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "Direct non-GPT MCP tools" })

        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "inspect available MCP tools" }],
        })
        yield* llm.tool("mcp_success", {})
        yield* llm.text("done")
        yield* prompt.loop({ sessionID: session.id })

        const tools = (yield* llm.inputs)[0].tools as Array<Record<string, unknown>>
        const names = tools.map(wireToolName).filter((name): name is string => name !== undefined)
        const firstMcp = names.findIndex((name) => name.startsWith("mcp_"))
        expect(firstMcp).toBeGreaterThan(0)
        expect(names.slice(firstMcp)).toEqual(["mcp_result", "mcp_success"])
        expect(tools.map(wireToolName)).not.toContain("mcp_tool_search")
        expect(tools.map(wireToolName)).toContain("mcp_result")
        expect(tools.map(wireToolName)).toContain("mcp_success")
        expect(
          (yield* MessageV2.filterCompactedEffect(session.id))
            .flatMap((message) => message.parts)
            .some((part) => part.type === "tool" && part.tool === "mcp_success" && part.state.status === "completed"),
        ).toBe(true)
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

mcpIt.live("rejects direct MCP calls disabled for the request", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "Request-disabled direct MCP tool" })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: ref,
        tools: { mcp_success: false },
        noReply: true,
        parts: [{ type: "text", text: "call the disabled MCP tool" }],
      })
      yield* llm.tool("mcp_success", {})
      yield* llm.text("done")
      yield* prompt.loop({ sessionID: session.id })

      const tools = ((yield* llm.inputs)[0].tools ?? []) as Array<Record<string, unknown>>
      expect(tools.map(wireToolName)).not.toContain("mcp_tool_search")
      expect(tools.map(wireToolName)).toContain("mcp_result")
      expect(tools.map(wireToolName)).not.toContain("mcp_success")
      expect(
        (yield* MessageV2.filterCompactedEffect(session.id))
          .flatMap((message) => message.parts)
          .some((part) => part.type === "tool" && part.tool === "mcp_success" && part.state.status === "completed"),
      ).toBe(false)
    }),
    { git: true, config: providerCfg },
  ),
)

mcpIt.live("rejects direct MCP calls hidden by the agent allowlist", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "Agent-hidden direct MCP tool" })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "restricted",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "call the hidden MCP tool" }],
      })
      yield* llm.tool("mcp_result", {})
      yield* llm.text("done")
      yield* prompt.loop({ sessionID: session.id })

      const tools = (yield* llm.inputs)[0].tools as Array<Record<string, unknown>>
      expect(tools.map(wireToolName)).not.toContain("mcp_tool_search")
      expect(tools.map(wireToolName)).not.toContain("mcp_result")
      expect(tools.map(wireToolName)).toContain("mcp_success")
      expect(
        (yield* MessageV2.filterCompactedEffect(session.id))
          .flatMap((message) => message.parts)
          .some((part) => part.type === "tool" && part.tool === "mcp_result" && part.state.status === "error"),
      ).toBe(true)
    }),
    { git: true, config: restrictedAgentProviderCfg },
  ),
)

mcpIt.live("omits MCP discovery for models without tool calling", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "No tool calls" })

      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: mcpRef,
        noReply: true,
        parts: [{ type: "text", text: "hello" }],
      })
      yield* llm.text("done")
      yield* prompt.loop({ sessionID: session.id })

      const tools = (yield* llm.inputs)[0].tools as Array<Record<string, unknown>>
      expect(tools.map(wireToolName)).not.toContain("mcp_tool_search")
      expect(tools.map(wireToolName)).not.toContain("mcp_success")
      expect(tools.map(wireToolName)).not.toContain("mcp_result")
    }),
    { git: true, config: noToolProviderCfg },
  ),
)

it.live(
  "omits MCP Tool Search when no MCP tools are available",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "No MCP" })

        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "hello" }],
        })
        yield* llm.text("done")
        yield* prompt.loop({ sessionID: session.id })

        const tools = (yield* llm.inputs)[0].tools as Array<Record<string, unknown>>
        expect(tools.map(wireToolName)).not.toContain("mcp_tool_search")
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

lifecycleMcpIt.live("MCP calls in one outer run share one turn and emit one terminal notification", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      lifecycleContexts.length = 0
      lifecycleNotifications.length = 0
      lifecycleNotificationHangs = false
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Lifecycle",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "call the lifecycle tool twice" }],
      })
      yield* llm.tool("mcp_lifecycle", { index: 1 })
      yield* llm.tool("mcp_lifecycle", { index: 2 })
      yield* llm.text("done")

      yield* prompt.loop({ sessionID: session.id })

      expect(lifecycleContexts).toHaveLength(2)
      expect(lifecycleContexts[0]?.sessionId).toBe(session.id)
      expect(lifecycleContexts[0]?.actorId).toBe("main")
      expect(lifecycleContexts[0]?.turnId).toBeTruthy()
      expect(lifecycleContexts[1]).toEqual(lifecycleContexts[0])
      expect(lifecycleNotifications).toEqual([
        {
          method: "notifications/com.xiaomi.mimo/turn-lifecycle",
          params: { ...lifecycleContexts[0], status: "completed" },
        },
      ])
    }),
    { git: true, config: providerCfg },
  ),
)

lifecycleMcpIt.live("MCP lifecycle waits for an in-flight tool call before notifying", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      lifecycleContexts.length = 0
      lifecycleNotifications.length = 0
      lifecycleNotificationHangs = false
      const started = yield* Deferred.make<void>()
      const gate = yield* Deferred.make<void>()
      lifecycleToolStarted = started
      lifecycleToolGate = gate
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* Deferred.succeed(gate, undefined)
          lifecycleToolStarted = undefined
          lifecycleToolGate = undefined
        }),
      )

      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Lifecycle settling",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "call the lifecycle tool" }],
      })
      yield* llm.tool("mcp_lifecycle", { index: 1 })
      yield* llm.text("done")

      const run = yield* prompt.loop({ sessionID: session.id }).pipe(Effect.forkChild)
      yield* Deferred.await(started)
      expect(lifecycleNotifications).toEqual([])

      yield* Deferred.succeed(gate, undefined)
      yield* Fiber.join(run)
      expect(lifecycleNotifications).toHaveLength(1)
      expect(lifecycleNotifications[0]?.params).toMatchObject({
        sessionId: session.id,
        turnId: lifecycleContexts[0]?.turnId,
        status: "completed",
      })
    }),
    { git: true, config: providerCfg },
  ),
)

lifecycleMcpIt.live(
  "MCP lifecycle emits one cancelled notification when the outer run is interrupted",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        lifecycleContexts.length = 0
        lifecycleNotifications.length = 0
        lifecycleNotificationHangs = false
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "Lifecycle cancellation" })
        yield* user(session.id, "wait")
        yield* llm.hang

        const fiber = yield* prompt.loop({ sessionID: session.id }).pipe(Effect.forkChild)
        yield* llm.wait(1)
        yield* prompt.cancel(session.id)
        yield* Fiber.await(fiber)

        expect(lifecycleNotifications).toHaveLength(1)
        expect(lifecycleNotifications[0]).toMatchObject({
          method: "notifications/com.xiaomi.mimo/turn-lifecycle",
          params: { sessionId: session.id, actorId: "main", status: "cancelled" },
        })
        expect(lifecycleNotifications[0]?.params?.turnId).toBeTruthy()
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

lifecycleMcpIt.live("MCP lifecycle emits one error notification when the outer run fails", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      lifecycleContexts.length = 0
      lifecycleNotifications.length = 0
      lifecycleNotificationHangs = false
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "Lifecycle error" })
      yield* user(session.id, "fail")
      yield* llm.error(400, { error: { message: "test failure" } })

      yield* prompt.loop({ sessionID: session.id }).pipe(Effect.exit)

      expect(lifecycleNotifications).toHaveLength(1)
      expect(lifecycleNotifications[0]).toMatchObject({
        method: "notifications/com.xiaomi.mimo/turn-lifecycle",
        params: { sessionId: session.id, actorId: "main", status: "error" },
      })
      expect(lifecycleNotifications[0]?.params?.turnId).toBeTruthy()
    }),
    { git: true, config: providerCfg },
  ),
)

lifecycleMcpIt.live(
  "MCP lifecycle timeout lets the outer run finalizer complete when a notification hangs",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        lifecycleContexts.length = 0
        lifecycleNotifications.length = 0
        lifecycleNotificationHangs = true
        yield* Effect.addFinalizer(() => Effect.sync(() => void (lifecycleNotificationHangs = false)))
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "Lifecycle timeout" })
        yield* user(session.id, "finish despite a hanging notification")
        yield* llm.text("done")

        const result = yield* prompt.loop({ sessionID: session.id })

        expect(result.info.role).toBe("assistant")
        expect(lifecycleNotifications).toEqual([])
      }),
      { git: true, config: providerCfg },
    ),
  10_000,
)

it.live("glob tool keeps instance context during prompt runs", () =>
  provideTmpdirServer(
    ({ dir, llm }) =>
      Effect.gen(function* () {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({
          title: "Glob context",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const file = path.join(dir, "probe.txt")
        yield* Effect.promise(() => Bun.write(file, "probe"))

        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          noReply: true,
          parts: [{ type: "text", text: "find text files" }],
        })
        yield* llm.tool("glob", { pattern: "**/*.txt" })
        yield* llm.text("done")

        const result = yield* prompt.loop({ sessionID: session.id })
        expect(result.info.role).toBe("assistant")

        const msgs = yield* MessageV2.filterCompactedEffect(session.id)
        const tool = msgs
          .flatMap((msg) => msg.parts)
          .find(
            (part): part is CompletedToolPart =>
              part.type === "tool" && part.tool === "glob" && part.state.status === "completed",
          )
        if (!tool) return

        expect(tool.state.output).toContain(file)
        expect(tool.state.output).not.toContain("No context found for instance")
        expect(result.parts.some((part) => part.type === "text" && part.text === "done")).toBe(true)
      }),
    { git: true, config: providerCfg },
  ),
)

it.live("loop continues when finish is stop but assistant has tool parts", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Pinned",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text", text: "hello" }],
      })
      yield* llm.push(reply().tool("first", { value: "first" }).stop())
      yield* llm.text("second")

      const result = yield* prompt.loop({ sessionID: session.id })
      expect(yield* llm.calls).toBe(2)
      expect(result.info.role).toBe("assistant")
      if (result.info.role === "assistant") {
        expect(result.parts.some((part) => part.type === "text" && part.text === "second")).toBe(true)
        expect(result.info.finish).toBe("stop")
      }
    }),
    { git: true, config: providerCfg },
  ),
)

itActor.live("failed subtask preserves metadata on error tool state", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Pinned" })
      yield* llm.tool("actor", {
        description: "inspect bug",
        prompt: "look into the cache key path",
        subagent_type: "general",
      })
      yield* llm.text("done")
      const msg = yield* user(chat.id, "hello")
      yield* addSubtask(chat.id, msg.id)

      const result = yield* prompt.loop({ sessionID: chat.id })
      expect(result.info.role).toBe("assistant")
      expect(yield* llm.calls).toBe(2)

      const msgs = yield* MessageV2.filterCompactedEffect(chat.id)
      const taskMsg = msgs.find((item) => item.info.role === "assistant" && item.info.agent === "general")
      expect(taskMsg?.info.role).toBe("assistant")
      if (!taskMsg || taskMsg.info.role !== "assistant") return

      const tool = errorTool(taskMsg.parts)
      if (!tool) return

      expect(tool.state.error).toContain("Tool execution failed")
      expect(tool.state.metadata).toBeDefined()
      expect(tool.state.metadata?.sessionId).toBeDefined()
      expect(tool.state.metadata?.model).toEqual({
        providerID: ProviderID.make("test"),
        modelID: ModelID.make("missing-model"),
      })
    }),
    {
      git: true,
      config: (url) => ({
        ...providerCfg(url),
        agent: {
          general: {
            model: "test/missing-model",
          },
        },
      }),
    },
  ),
)

it.live("recoverable tool failure flags the error tool state for muted display", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const session = yield* sessions.create({
        title: "Recoverable",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })

      // `task start` on a nonexistent id is valid args that fail at execution
      // with a RecoverableError. This drives failToolCall, which must flag the
      // error part recoverable so the TUI mutes it instead of showing a red block.
      yield* llm.tool("task", { operation: { action: "start", id: "T99" } })
      yield* llm.text("done")
      yield* user(session.id, "start task T99")

      const result = yield* prompt.loop({ sessionID: session.id })
      expect(result.info.role).toBe("assistant")

      const tool = (yield* MessageV2.filterCompactedEffect(session.id))
        .flatMap((msg) => msg.parts)
        .find(
          (part): part is ErrorToolPart =>
            part.type === "tool" && part.tool === "task" && part.state.status === "error",
        )
      expect(tool).toBeDefined()
      if (!tool) return
      expect(tool.state.metadata?.recoverable).toBe(true)
      expect(tool.state.error).toContain("task list")
    }),
    { git: true, config: providerCfg },
  ),
)

it.live(
  "loop sets status to busy then idle",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const status = yield* SessionStatus.Service

        yield* llm.hang

        const chat = yield* sessions.create({})
        yield* user(chat.id, "hi")

        const fiber = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1)
        expect((yield* status.get(chat.id)).type).toBe("busy")
        yield* prompt.cancel(chat.id)
        yield* Fiber.await(fiber)
        expect((yield* status.get(chat.id)).type).toBe("idle")
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live(
  "subagent maxMode retries do not write session status or publish retry attempts",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const bus = yield* Bus.Service
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const status = yield* SessionStatus.Service

        const chat = yield* sessions.create({
          title: "Subagent maxMode status",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const statuses: Array<{ attempt: number; scope?: string }> = []
        const attempts: Array<{ attempt: number; scope: string }> = []
        const offStatus = yield* bus.subscribeCallback(SessionStatus.Event.Status, (event) => {
          if (event.properties.sessionID !== chat.id || event.properties.status.type !== "retry") return
          statuses.push({
            attempt: event.properties.status.attempt,
            scope: event.properties.status.scope,
          })
        })
        const offAttempt = yield* bus.subscribeCallback(Session.Event.RetryAttempt, (event) => {
          if (event.properties.sessionID !== chat.id || event.properties.scope !== "max-candidate") return
          attempts.push({
            attempt: event.properties.attempt,
            scope: event.properties.scope,
          })
        })

        yield* llm.error(503, { error: "candidate zero unavailable" })
        yield* llm.error(503, { error: "candidate one unavailable" })
        yield* llm.text("candidate zero recovered")
        yield* llm.text("candidate one recovered")
        yield* llm.text("1")

        const result = yield* prompt.prompt({
          sessionID: chat.id,
          agent: "general",
          agentID: "general-1",
          model: ref,
          parts: [{ type: "text", text: "hello" }],
        })
        offStatus()
        offAttempt()

        expect(result.info.role).toBe("assistant")
        expect(result.parts.some((part) => part.type === "text" && part.text === "candidate one recovered")).toBe(true)
        expect(yield* llm.calls).toBe(5)
        expect({ statuses, attempts }).toStrictEqual({ statuses: [], attempts: [] })
        expect(yield* status.get(chat.id)).toEqual({ type: "idle" })
      }),
      {
        git: true,
        config: (url) => ({
          ...maxModeProviderCfg(url),
          retry: {
            request: { maxRetries: 0 },
            maxCandidate: { maxRetries: 1, initialDelayMs: 1, maxDelayMs: 1 },
            jitterRatio: 0,
          },
        }),
      },
    ),
  20_000,
)

it.live(
  "full-context fork includes a newly committed request whose caller ID predates the parent watermark",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const actorRegistry = yield* ActorRegistry.Service
        const sessions = yield* Session.Service
        const childMessageID = MessageID.ascending()
        const parent = yield* sessions.create({ title: "Fork old-ID parent" })
        const parentMsg = yield* user(parent.id, "FROZEN_PARENT_MARKER")
        expect(childMessageID < parentMsg.id).toBe(true)
        const child = yield* sessions.create({ parentID: parent.id, title: "Fork old-ID child" })
        const forkCtx: Actor.ForkContext = {
          system: ["fork-system"],
          tools: {},
          inheritedMessages: [{ role: "user", content: "FROZEN_PARENT_MARKER" }],
          turnContext: "frozen turn context",
          parentPermission: [],
          watermarkMsgID: parentMsg.id,
          model: ref,
        }
        const previous = spawnRef.current
        const bound = {
          spawn: () => Effect.die("unexpected spawn in fork old-ID test"),
          cancel: () => Effect.void,
          getForkContext: (sessionID: SessionID, actorID: string) =>
            Effect.succeed(sessionID === child.id && actorID === child.id ? forkCtx : undefined),
        }
        spawnRef.current = bound
        const release = prompt.bindActor?.(bound)
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            release?.()
            spawnRef.current = previous
          }),
        )
        yield* actorRegistry.register({
          sessionID: child.id,
          actorID: child.id,
          mode: "peer",
          agent: "general",
          description: "fork old-ID request",
          contextMode: "full",
          contextWatermark: parentMsg.id,
          background: false,
          lifecycle: "ephemeral",
          tools: [],
        })

        yield* llm.text("child handled old ID")
        const result = yield* prompt.prompt({
          sessionID: child.id,
          messageID: childMessageID,
          agent: "general",
          agentID: child.id,
          model: ref,
          parts: [{ type: "text", text: "ACTIVE_CHILD_OLD_ID_MARKER" }],
        })

        expect(result.parts.some((part) => part.type === "text" && part.text === "child handled old ID")).toBe(true)
        const request = JSON.stringify((yield* llm.inputs)[0].messages)
        expect(request).toContain("FROZEN_PARENT_MARKER")
        expect(request).toContain("ACTIVE_CHILD_OLD_ID_MARKER")
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

it.live(
  "frozen fork preflight fails closed when inherited context alone is oversized",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const actorRegistry = yield* ActorRegistry.Service
        const sessions = yield* Session.Service
        const parent = yield* sessions.create({ title: "Fork overflow parent" })
        const parentMsg = yield* user(parent.id, "parent context")
        const child = yield* sessions.create({ parentID: parent.id, title: "Fork overflow child" })
        const forkCtx: Actor.ForkContext = {
          system: ["fork-system"],
          tools: {},
          inheritedMessages: [{ role: "user", content: "FROZEN_INHERITED_TOO_LARGE " + "x".repeat(400 * 1024) }],
          turnContext: "frozen turn context",
          parentPermission: [],
          watermarkMsgID: parentMsg.id,
          model: ref,
        }
        const previous = spawnRef.current
        const bound = {
          spawn: () => Effect.die("unexpected spawn in fork inherited overflow test"),
          cancel: () => Effect.void,
          getForkContext: (sessionID: SessionID, actorID: string) =>
            Effect.succeed(sessionID === child.id && actorID === child.id ? forkCtx : undefined),
        }
        spawnRef.current = bound
        const release = prompt.bindActor?.(bound)
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            release?.()
            spawnRef.current = previous
          }),
        )
        yield* actorRegistry.register({
          sessionID: child.id,
          actorID: child.id,
          mode: "peer",
          agent: "general",
          description: "fork inherited overflow",
          contextMode: "full",
          contextWatermark: parentMsg.id,
          background: false,
          lifecycle: "ephemeral",
          tools: [],
        })

        const result = yield* prompt.prompt({
          sessionID: child.id,
          agent: "general",
          agentID: child.id,
          model: ref,
          parts: [{ type: "text", text: "small active child turn" }],
        })

        expect(result.info.role).toBe("assistant")
        if (result.info.role === "assistant") {
          expect(result.info.finish).toBe("error")
          expect(result.info.error?.name).toBe("ModelError")
        }
        expect(result.parts).toEqual([])
        expect(
          (yield* sessions.messages({ sessionID: child.id, agentID: child.id })).flatMap((message) =>
            message.parts.filter((part) => part.type === "compaction"),
          ),
        ).toHaveLength(0)
        expect(yield* llm.hits).toHaveLength(0)
      }),
      { git: true, config: recoverableOverflowCfg },
    ),
  20_000,
)

it.live(
  "frozen fork preflight compacts old child history and preserves the active turn",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const actorRegistry = yield* ActorRegistry.Service
        const sessions = yield* Session.Service
        const parent = yield* sessions.create({ title: "Fork recoverable overflow parent" })
        const parentMsg = yield* user(parent.id, "parent context")
        const child = yield* sessions.create({ parentID: parent.id, title: "Fork recoverable overflow child" })
        const forkCtx: Actor.ForkContext = {
          system: ["fork-system"],
          tools: {},
          inheritedMessages: [{ role: "user", content: "FROZEN_INHERITED_CONTEXT" }],
          turnContext: "frozen turn context",
          parentPermission: [],
          watermarkMsgID: parentMsg.id,
          model: ref,
        }
        const previous = spawnRef.current
        const bound = {
          spawn: () => Effect.die("unexpected spawn in fork recoverable overflow test"),
          cancel: () => Effect.void,
          getForkContext: (sessionID: SessionID, actorID: string) =>
            Effect.succeed(sessionID === child.id && actorID === child.id ? forkCtx : undefined),
        }
        spawnRef.current = bound
        const release = prompt.bindActor?.(bound)
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            release?.()
            spawnRef.current = previous
          }),
        )
        yield* actorRegistry.register({
          sessionID: child.id,
          actorID: child.id,
          mode: "peer",
          agent: "general",
          description: "fork recoverable overflow",
          contextMode: "full",
          contextWatermark: parentMsg.id,
          background: false,
          lifecycle: "ephemeral",
          tools: [],
        })

        yield* llm.text("old child answer")
        yield* prompt.prompt({
          sessionID: child.id,
          agent: "general",
          agentID: child.id,
          model: ref,
          parts: [{ type: "text", text: "old child request" }],
        })
        const oldUser = (yield* sessions.messages({ sessionID: child.id, agentID: child.id })).find(
          (message) => message.info.role === "user" && message.parts.some((part) => part.type === "text"),
        )
        const oldText = oldUser?.parts.find((part): part is MessageV2.TextPart => part.type === "text")
        if (!oldText) throw new Error("missing old child history text")
        yield* sessions.updatePart({ ...oldText, text: "OLD_CHILD_HISTORY_TOO_LARGE " + "x".repeat(400 * 1024) })

        const callsBeforeOverflow = yield* llm.calls
        yield* llm.text("fork overflow summary")
        yield* llm.text("fork final answer")
        const result = yield* prompt.prompt({
          sessionID: child.id,
          agent: "general",
          agentID: child.id,
          model: ref,
          parts: [{ type: "text", text: "ACTIVE_CHILD_TURN_MUST_SURVIVE" }],
        })

        expect(result.parts.some((part) => part.type === "text" && part.text === "fork final answer")).toBe(true)
        const messages = yield* sessions.messages({ sessionID: child.id, agentID: child.id })
        expect(
          messages.filter(
            (message) => message.info.role === "assistant" && message.info.error?.name === "MessageAbortedError",
          ),
        ).toHaveLength(1)
        expect(messages.flatMap((message) => message.parts).filter((part) => part.type === "compaction")).toHaveLength(
          1,
        )
        const inputs = (yield* llm.inputs).slice(callsBeforeOverflow)
        expect(inputs).toHaveLength(2)
        expect(JSON.stringify(inputs[0].messages)).toContain("OLD_CHILD_HISTORY_TOO_LARGE")
        const finalRequest = JSON.stringify(inputs[1].messages)
        expect(finalRequest).toContain("FROZEN_INHERITED_CONTEXT")
        expect(finalRequest).toContain("fork overflow summary")
        expect(finalRequest).toContain("ACTIVE_CHILD_TURN_MUST_SURVIVE")
        expect(finalRequest).not.toContain("OLD_CHILD_HISTORY_TOO_LARGE")
      }),
      { git: true, config: recoverableOverflowCfg },
    ),
  30_000,
)

it.live(
  "frozen fork preflight bounds repeated compaction without progress",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const actorRegistry = yield* ActorRegistry.Service
        const sessions = yield* Session.Service
        const parent = yield* sessions.create({ title: "Fork stalled recovery parent" })
        const parentMsg = yield* user(parent.id, "parent context")
        const child = yield* sessions.create({ parentID: parent.id, title: "Fork stalled recovery child" })
        const forkCtx: Actor.ForkContext = {
          system: ["fork-system"],
          tools: {},
          inheritedMessages: [{ role: "user", content: "frozen inherited context" }],
          turnContext: "frozen turn context",
          parentPermission: [],
          watermarkMsgID: parentMsg.id,
          model: ref,
        }
        const previous = spawnRef.current
        const bound = {
          spawn: () => Effect.die("unexpected spawn in fork stalled recovery test"),
          cancel: () => Effect.void,
          getForkContext: (sessionID: SessionID, actorID: string) =>
            Effect.succeed(sessionID === child.id && actorID === child.id ? forkCtx : undefined),
        }
        spawnRef.current = bound
        const release = prompt.bindActor?.(bound)
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            release?.()
            spawnRef.current = previous
          }),
        )
        yield* actorRegistry.register({
          sessionID: child.id,
          actorID: child.id,
          mode: "peer",
          agent: "general",
          description: "fork stalled recovery",
          contextMode: "full",
          contextWatermark: parentMsg.id,
          background: false,
          lifecycle: "ephemeral",
          tools: [],
        })

        yield* llm.text("old child answer")
        yield* prompt.prompt({
          sessionID: child.id,
          agent: "general",
          agentID: child.id,
          model: ref,
          parts: [{ type: "text", text: "old child request" }],
        })
        const oldUser = (yield* sessions.messages({ sessionID: child.id, agentID: child.id })).find(
          (message) => message.info.role === "user" && message.parts.some((part) => part.type === "text"),
        )
        const oldText = oldUser?.parts.find((part): part is MessageV2.TextPart => part.type === "text")
        if (!oldText) throw new Error("missing stalled child history text")
        yield* sessions.updatePart({ ...oldText, text: "OLD_CHILD_HISTORY_TOO_LARGE " + "x".repeat(400 * 1024) })

        const callsBeforeOverflow = yield* llm.calls
        const repeatedSummary = "S".repeat(100 * 1024)
        yield* llm.text(repeatedSummary)
        yield* llm.text(repeatedSummary)
        const result = yield* prompt
          .prompt({
            sessionID: child.id,
            agent: "general",
            agentID: child.id,
            model: ref,
            parts: [{ type: "text", text: "ACTIVE_CHILD_TURN_DURING_STALLED_RECOVERY" }],
          })
          .pipe(Effect.timeout("20 seconds"))

        expect(result.info.role).toBe("assistant")
        if (result.info.role === "assistant") {
          expect(result.info.finish).toBe("error")
          expect(result.info.error?.name).toBe("ModelError")
          expect(result.info.error?.data.message).toContain("no sufficient progress")
        }
        const messages = yield* sessions.messages({ sessionID: child.id, agentID: child.id })
        expect(
          messages.filter(
            (message) => message.info.role === "assistant" && message.info.error?.name === "MessageAbortedError",
          ),
        ).toHaveLength(2)
        expect(
          messages.filter((message) => message.info.role === "assistant" && message.info.error?.name === "ModelError"),
        ).toHaveLength(1)
        expect(messages.flatMap((message) => message.parts).filter((part) => part.type === "compaction")).toHaveLength(
          2,
        )
        expect((yield* llm.hits).slice(callsBeforeOverflow)).toHaveLength(2)
      }),
      { git: true, config: stalledForkRecoveryCfg },
    ),
  30_000,
)

for (const arrival of ["direct", "inbox"] as const) {
  it.live(
    `a new ${arrival} request gets a fresh preflight recovery budget`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const prompt = yield* SessionPrompt.Service
          const actorRegistry = yield* ActorRegistry.Service
          const sessions = yield* Session.Service
          const parent = yield* sessions.create({ title: `Fork recovery ${arrival} parent` })
          const parentMsg = yield* user(parent.id, "parent context")
          const child = yield* sessions.create({ parentID: parent.id, title: `Fork recovery ${arrival} child` })
          const forkCtx: Actor.ForkContext = {
            system: ["fork-system"],
            tools: {},
            inheritedMessages: [{ role: "user", content: "frozen inherited context" }],
            turnContext: "frozen turn context",
            parentPermission: [],
            watermarkMsgID: parentMsg.id,
            model: ref,
          }
          const previous = spawnRef.current
          const bound = {
            spawn: () => Effect.die(`unexpected spawn in fork recovery ${arrival} test`),
            cancel: () => Effect.void,
            getForkContext: (sessionID: SessionID, actorID: string) =>
              Effect.succeed(sessionID === child.id && actorID === child.id ? forkCtx : undefined),
          }
          spawnRef.current = bound
          const release = prompt.bindActor?.(bound)
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              release?.()
              spawnRef.current = previous
            }),
          )
          yield* actorRegistry.register({
            sessionID: child.id,
            actorID: child.id,
            mode: "peer",
            agent: "general",
            description: `fork recovery ${arrival}`,
            contextMode: "full",
            contextWatermark: parentMsg.id,
            background: false,
            lifecycle: "ephemeral",
            tools: [],
          })

          yield* llm.text("old child answer")
          yield* prompt.prompt({
            sessionID: child.id,
            agent: "general",
            agentID: child.id,
            model: ref,
            parts: [{ type: "text", text: "old child request" }],
          })
          const oldUser = (yield* sessions.messages({ sessionID: child.id, agentID: child.id })).find(
            (message) => message.info.role === "user" && message.parts.some((part) => part.type === "text"),
          )
          const oldText = oldUser?.parts.find((part): part is MessageV2.TextPart => part.type === "text")
          if (!oldText) throw new Error(`missing recovery ${arrival} history text`)
          yield* sessions.updatePart({ ...oldText, text: "OLD_CHILD_HISTORY_TOO_LARGE " + "x".repeat(400 * 1024) })

          const callsBeforeOverflow = yield* llm.calls
          const repeatedSummary = "S".repeat(100 * 1024)
          const releaseSecondSummary = defer<void>()
          yield* Effect.addFinalizer(() => Effect.sync(() => releaseSecondSummary.resolve()))
          yield* llm.text(repeatedSummary)
          yield* llm.hold(repeatedSummary, releaseSecondSummary.promise)
          yield* llm.text(`compact summary after ${arrival} request`)
          yield* llm.text(`answer after ${arrival} request`)
          const running = yield* prompt
            .prompt({
              sessionID: child.id,
              agent: "general",
              agentID: child.id,
              model: ref,
              parts: [{ type: "text", text: `active child request before ${arrival}` }],
            })
            .pipe(Effect.forkChild)
          yield* llm.wait(callsBeforeOverflow + 2).pipe(Effect.timeout("15 seconds"))
          const marker = `${arrival.toUpperCase()}_REQUEST_MUST_GET_FRESH_RECOVERY_BUDGET`
          if (arrival === "direct") {
            yield* prompt.prompt({
              sessionID: child.id,
              messageID: MessageID.ascending(),
              agent: "general",
              agentID: child.id,
              model: ref,
              noReply: true,
              parts: [{ type: "text", text: marker }],
            })
          }
          if (arrival === "inbox") {
            yield* Effect.sync(() =>
              Database.use((db) =>
                db
                  .insert(InboxTable)
                  .values({
                    id: "recovery-budget-inbox-row",
                    receiver_session_id: child.id,
                    receiver_actor_id: child.id,
                    sender_session_id: null,
                    sender_actor_id: null,
                    type: "text",
                    content: { text: marker },
                    created_at: Date.now(),
                  })
                  .run(),
              ),
            )
          }
          releaseSecondSummary.resolve()

          const result = yield* Fiber.join(running).pipe(Effect.timeout("20 seconds"))
          expect(result.info.role).toBe("assistant")
          if (result.info.role === "assistant") {
            expect(result.info.finish).toBe("stop")
            expect(result.info.error).toBeUndefined()
          }
          expect(
            result.parts.some((part) => part.type === "text" && part.text === `answer after ${arrival} request`),
          ).toBe(true)
          const inputs = (yield* llm.inputs).slice(callsBeforeOverflow)
          expect(inputs).toHaveLength(4)
          expect(JSON.stringify(inputs[3].messages)).toContain(marker)
          const messages = yield* sessions.messages({ sessionID: child.id, agentID: child.id })
          expect(
            messages.filter(
              (message) => message.info.role === "assistant" && message.info.error?.name === "MessageAbortedError",
            ),
          ).toHaveLength(3)
          expect(
            messages.flatMap((message) => message.parts).filter((part) => part.type === "compaction"),
          ).toHaveLength(3)
        }),
        { git: true, config: stalledForkRecoveryCfg },
      ),
    40_000,
  )
}

it.live(
  "context full subagent uses maxMode candidate judge replay path",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actorRegistry = yield* ActorRegistry.Service
        const sessions = yield* Session.Service

        const chat = yield* sessions.create({
          title: "Fork maxMode",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const parentMsg = yield* user(chat.id, "parent context")
        const child = yield* sessions.create({
          parentID: chat.id,
          title: "Fork maxMode child",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const frozenTurnContext = "FROZEN_PARENT_TURN_CONTEXT"
        const childLiveContext = "CHILD_LIVE_CONTEXT_MUST_NOT_OVERRIDE"
        const forkCtx: Actor.ForkContext = {
          system: ["fork-system"],
          tools: {},
          inheritedMessages: [{ role: "user", content: "inherited parent context" }],
          turnContext: frozenTurnContext,
          parentPermission: [],
          watermarkMsgID: parentMsg.id,
          model: ref,
        }
        const prev = spawnRef.current
        const actor = {
          spawn: () => Effect.die("unexpected spawn in fork maxMode test"),
          cancel: () => Effect.void,
          getForkContext: (sessionID: SessionID, actorID: string) =>
            Effect.succeed(sessionID === child.id && actorID === child.id ? forkCtx : undefined),
        }
        spawnRef.current = actor
        const releaseActor = (yield* SessionPrompt.Service).bindActor?.(actor)
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            releaseActor?.()
            spawnRef.current = prev
          }),
        )
        yield* actorRegistry.register({
          sessionID: child.id,
          actorID: child.id,
          mode: "peer",
          agent: "general",
          description: "fork maxMode",
          contextMode: "full",
          contextWatermark: parentMsg.id,
          background: false,
          lifecycle: "ephemeral",
          tools: [],
        })
        yield* llm.text("candidate zero")
        yield* llm.text("candidate one")
        yield* llm.text("1")

        const result = yield* (yield* SessionPrompt.Service).prompt({
          sessionID: child.id,
          agent: "general",
          agentID: child.id,
          model: ref,
          system: childLiveContext,
          parts: [{ type: "text", text: "handle fork task" }],
        })

        expect(result.info.role).toBe("assistant")
        expect(yield* llm.calls).toBe(3)
        expect(result.parts.some((part) => part.type === "text" && part.text === "candidate one")).toBe(true)
        for (const input of yield* llm.inputs) {
          const messages = JSON.stringify(input.messages)
          expect(messages.split(frozenTurnContext)).toHaveLength(2)
          expect(messages).not.toContain(childLiveContext)
        }
      }),
      { git: true, config: maxModeProviderCfg },
    ),
  20_000,
)

it.live(
  "last-step maxMode bypasses candidate path",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service

        const chat = yield* sessions.create({
          title: "Last step maxMode",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("final answer")

        const result = yield* prompt.prompt({
          sessionID: chat.id,
          agent: "general",
          agentID: "general-1",
          model: ref,
          parts: [{ type: "text", text: "hello" }],
        })

        expect(result.info.role).toBe("assistant")
        expect(result.parts.some((part) => part.type === "text" && part.text === "final answer")).toBe(true)
        // steps: 1 makes the only step the last step → runStep bypasses maxMode and
        // issues a single handle.process call honoring toolChoice "none", instead of
        // the candidates(2)+judge(1) = 3 calls the max-mode path would make. This guards
        // the fork/main step cap from maxMode ignoring toolChoice.
        expect(yield* llm.calls).toBe(1)
      }),
      { git: true, config: maxModeLastStepProviderCfg },
    ),
  20_000,
)

it.live(
  "maxMode skips candidates for json_schema output",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service

        const chat = yield* sessions.create({
          title: "maxMode json_schema",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.tool("StructuredOutput", { answer: 4 })

        const result = yield* prompt.prompt({
          sessionID: chat.id,
          agent: "general",
          agentID: "general-1",
          model: ref,
          parts: [{ type: "text", text: "what is 2 + 2?" }],
          format: {
            type: "json_schema",
            schema: { type: "object", properties: { answer: { type: "number" } }, required: ["answer"] },
            retryCount: 0,
          },
        })

        expect(result.info.role).toBe("assistant")
        if (result.info.role === "assistant") {
          expect((result.info.structured as { answer: number }).answer).toBe(4)
          expect(result.info.error).toBeUndefined()
        }
        // json_schema output forces toolChoice "required" plus the StructuredOutput tool,
        // which maxMode's propose-only candidates cannot honor. So even with maxMode enabled
        // (general.maxMode) the step runs as a single handle.process call — not the
        // candidates(2)+judge(1) = 3 calls of the max-mode path. Guards the
        // `format.type !== "json_schema"` gate in useMaxMode.
        expect(yield* llm.calls).toBe(1)
      }),
      { git: true, config: maxModeProviderCfg },
    ),
  20_000,
)

// Cancel semantics

it.live(
  "cancel interrupts loop and resolves with an assistant message",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Pinned" })
        yield* seed(chat.id)

        yield* llm.hang

        yield* user(chat.id, "more")

        const fiber = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1)
        yield* prompt.cancel(chat.id)
        const exit = yield* Fiber.await(fiber)
        expect(Exit.isSuccess(exit)).toBe(true)
        if (Exit.isSuccess(exit)) {
          expect(exit.value.info.role).toBe("assistant")
        }
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live(
  "cancel records MessageAbortedError on interrupted process",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Pinned" })
        yield* llm.hang
        yield* user(chat.id, "hello")

        const fiber = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1)
        yield* prompt.cancel(chat.id)
        const exit = yield* Fiber.await(fiber)
        expect(Exit.isSuccess(exit)).toBe(true)
        if (Exit.isSuccess(exit)) {
          const info = exit.value.info
          if (info.role === "assistant") {
            expect(info.error?.name).toBe("MessageAbortedError")
          }
        }
      }),
      { git: true, config: providerCfg },
    ),
  5_000,
)

it.live(
  "cancel finalizes subtask tool state and ignores late metadata",
  () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const aborted = defer<void>()
          const registry = yield* ToolRegistry.Service
          const { actor } = yield* registry.named()
          const ready = defer<Parameters<typeof actor.execute>[1]>()
          const original = actor.execute
          actor.execute = (_args, ctx) =>
            Effect.callback<never>((_resume) => {
              ready.resolve(ctx)
              ctx.abort.addEventListener("abort", () => aborted.resolve(), { once: true })
              return Effect.sync(() => aborted.resolve())
            })
          yield* Effect.addFinalizer(() => Effect.sync(() => void (actor.execute = original)))

          const { prompt, chat } = yield* boot()
          const msg = yield* user(chat.id, "hello")
          yield* addSubtask(chat.id, msg.id)

          const fiber = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
          const ctx = yield* Effect.promise(() => ready.promise)
          yield* prompt.cancel(chat.id)
          yield* Effect.promise(() => aborted.promise)

          const exit = yield* Fiber.await(fiber)
          expect(Exit.isSuccess(exit)).toBe(true)

          const msgs = yield* MessageV2.filterCompactedEffect(chat.id)
          const taskMsg = msgs.find((item) => item.info.role === "assistant" && item.info.agent === "general")
          expect(taskMsg?.info.role).toBe("assistant")
          if (!taskMsg || taskMsg.info.role !== "assistant") return

          const tool = toolPart(taskMsg.parts)
          expect(tool?.type).toBe("tool")
          if (!tool) return

          expect(tool.state.status).not.toBe("running")
          expect(taskMsg.info.time.completed).toBeDefined()
          expect(taskMsg.info.finish).toBeDefined()

          yield* ctx.metadata({ title: "late metadata", metadata: { late: true } })
          expect(MessageV2.parts(taskMsg.info.id).find((part) => part.id === tool.id)).toEqual(tool)
        }),
      { git: true, config: cfg },
    ),
  30_000,
)

it.live(
  "cancel with queued callers resolves all cleanly",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Pinned" })
        yield* llm.hang
        yield* user(chat.id, "hello")

        const a = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1)
        const b = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* Effect.sleep(50)

        // Bound cancellation independently of fixture and first-request setup.
        const [exitA, exitB] = yield* prompt
          .cancel(chat.id)
          .pipe(Effect.andThen(Effect.all([Fiber.await(a), Fiber.await(b)])), Effect.timeout("3 seconds"))
        expect(Exit.isSuccess(exitA)).toBe(true)
        expect(Exit.isSuccess(exitB)).toBe(true)
        if (Exit.isSuccess(exitA) && Exit.isSuccess(exitB)) {
          expect(exitA.value.info.id).toBe(exitB.value.info.id)
        }
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

itActor.live(
  "cancelling main only stops the active run and the same session remains runnable and inbox-addressable",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const inbox = inboxServiceRef.current
        expect(inbox).toBeDefined()
        if (!inbox) return
        const chat = yield* sessions.create({ title: "main-cancel-rerun" })

        yield* llm.hang
        const first = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "first request hangs" }],
          })
          .pipe(Effect.forkChild)
        yield* llm.wait(1)

        yield* prompt.cancel(chat.id)
        yield* Fiber.join(first)

        yield* llm.text("second request completed")
        const second = yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          parts: [{ type: "text", text: "second request must run" }],
        })
        expect(second.parts.findLast((part) => part.type === "text")?.text).toBe("second request completed")

        const wakeStarted = yield* Deferred.make<void>()
        yield* llm.textMatch((hit) => {
          if (!JSON.stringify(hit.body).includes("main-inbox-after-cancel")) return false
          Effect.runFork(Deferred.succeed(wakeStarted, undefined))
          return true
        }, "main inbox wake completed")
        const sent = yield* inbox
          .send({
            receiverSessionID: chat.id,
            receiverActorID: "main",
            content: "main-inbox-after-cancel",
          })
          .pipe(
            Effect.as("accepted" as const),
            Effect.catchTag("InboxReceiverNotFound", () => Effect.succeed("retired" as const)),
          )
        expect(sent).toBe("accepted")
        yield* Deferred.await(wakeStarted).pipe(Effect.timeout("5 seconds"))
      }),
      { git: true, config: providerCfg },
    ),
  10_000,
)

itActor.live(
  "a main inbox wake retries its own late row after joining an active run",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const inbox = inboxServiceRef.current
        if (!inbox) return yield* Effect.die("inbox service ref was not initialized")
        const chat = yield* sessions.create({ title: "main-inbox-late-row" })
        yield* user(chat.id, "seed main model")
        const ownerExit = yield* Deferred.make<void>()
        const releaseOwner = yield* Deferred.make<void>()
        const followerAttached = yield* Deferred.make<void>()
        lateRunGate = {
          sessionID: chat.id,
          actorID: "main",
          ownerArmed: true,
          followerArmed: true,
          ownerExit,
          releaseOwner,
          followerAttached,
        }
        yield* Effect.addFinalizer(() => Deferred.succeed(releaseOwner, undefined).pipe(Effect.ignore))

        yield* llm.text("first wake complete")
        const insert = (id: string, text: string) =>
          Effect.sync(() =>
            Database.use((db) =>
              db
                .insert(InboxTable)
                .values({
                  id,
                  receiver_session_id: chat.id,
                  receiver_actor_id: "main",
                  sender_session_id: null,
                  sender_actor_id: null,
                  type: "text",
                  content: { text },
                  created_at: Date.now(),
                })
                .run(),
            ),
          )
        yield* insert("first-main-row", "first-main-row")
        const owner = yield* prompt
          .loop({ sessionID: chat.id, agentID: "main", inboxID: "first-main-row" })
          .pipe(Effect.forkChild)
        yield* llm.wait(1).pipe(Effect.timeout("5 seconds"))
        yield* Deferred.await(ownerExit).pipe(Effect.timeout("5 seconds"))

        yield* llm.text("second wake complete")
        yield* insert("late-main-row", "late-main-row")
        const follower = yield* prompt
          .loop({ sessionID: chat.id, agentID: "main", inboxID: "late-main-row" })
          .pipe(Effect.forkChild)
        yield* Deferred.await(followerAttached).pipe(Effect.timeout("5 seconds"))
        expect(yield* inbox.has("late-main-row")).toBe(true)

        yield* Deferred.succeed(releaseOwner, undefined)
        const reachedSecond = yield* llm
          .wait(2)
          .pipe(Effect.as(true), Effect.timeoutOrElse({ duration: "5 seconds", orElse: () => Effect.succeed(false) }))
        yield* Fiber.join(owner).pipe(Effect.timeout("5 seconds"))
        yield* Fiber.join(follower).pipe(Effect.timeout("5 seconds"))

        expect({ reachedSecond, calls: yield* llm.calls, lateExists: yield* inbox.has("late-main-row") }).toEqual({
          reachedSecond: true,
          calls: 2,
          lateExists: false,
        })
        expect(yield* inbox.has("first-main-row")).toBe(false)
      }),
      { git: true, config: providerCfg },
    ),
  15_000,
)

itActor.live(
  "a main inbox wake does not recreate its runner after instance disposal",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const inbox = inboxServiceRef.current ?? (yield* Effect.die("inbox service ref was not initialized"))
        const chat = yield* sessions.create({ title: "main-inbox-dispose-retry" })
        yield* seed(chat.id)
        const started = yield* Deferred.make<void>()
        const entered = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        disposalRetryGate = {
          sessionID: chat.id,
          actorID: "main",
          started,
          entered,
          release,
          armed: true,
        }
        yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined).pipe(Effect.ignore))

        const inboxID = "main-inbox-dispose-row"
        yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .insert(InboxTable)
              .values({
                id: inboxID,
                receiver_session_id: chat.id,
                receiver_actor_id: "main",
                sender_session_id: null,
                sender_actor_id: null,
                type: "text",
                content: { text: "must remain queued during disposal" },
                created_at: Date.now(),
              })
              .run(),
          ),
        )
        yield* llm.text("unexpected retry")
        const loop = yield* prompt.loop({ sessionID: chat.id, agentID: "main", inboxID }).pipe(Effect.forkChild)

        yield* Deferred.await(started).pipe(Effect.timeout("5 seconds"))
        const disposing = yield* Effect.promise(() => Instance.dispose()).pipe(Effect.forkChild)
        yield* Deferred.await(entered).pipe(Effect.timeout("5 seconds"))
        yield* Fiber.join(disposing).pipe(Effect.timeout("5 seconds"))
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.await(loop).pipe(Effect.timeout("5 seconds"))

        expect(yield* llm.calls).toBe(0)
        expect(yield* inbox.has(inboxID)).toBe(true)
      }),
      { git: true, config: providerCfg },
    ),
  15_000,
)

itActor.live(
  "a main inbox follower does not retry a joined failure without progress",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const state = yield* SessionRunState.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "joined inbox failure" })
        yield* seed(chat.id)
        const inboxID = crypto.randomUUID()
        Database.use((db) =>
          db
            .insert(InboxTable)
            .values({
              id: inboxID,
              receiver_session_id: chat.id,
              receiver_actor_id: "main",
              content: { text: "must remain queued" },
              created_at: Date.now(),
            })
            .run(),
        )
        const release = yield* Deferred.make<void>()
        const attached = yield* Deferred.make<void>()
        yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined).pipe(Effect.ignore))
        lateRunGate = {
          sessionID: chat.id,
          actorID: "main",
          ownerArmed: false,
          followerArmed: true,
          ownerExit: yield* Deferred.make<void>(),
          releaseOwner: release,
          followerAttached: attached,
        }
        const owner = yield* state.startRunning(
          chat.id,
          "main",
          Effect.die("unexpected interrupt"),
          Deferred.await(release).pipe(Effect.andThen(Effect.die(new Error("failure before drain")))),
        )
        yield* llm.text("unexpected follower retry")
        const follower = yield* prompt.loop({ sessionID: chat.id, inboxID }).pipe(Effect.forkChild)
        yield* Deferred.await(attached)
        yield* Deferred.succeed(release, undefined)
        const result = yield* Fiber.await(follower).pipe(Effect.timeout("5 seconds"))
        yield* owner.pipe(Effect.exit)
        expect(result._tag).toBe("Failure")
        expect(yield* llm.calls).toBe(0)
        expect(yield* inboxServiceRef.current!.has(inboxID)).toBe(true)
      }),
      { git: true, config: providerCfg },
    ),
  15_000,
)

// Queue semantics

it.live("concurrent loop callers get same result", () =>
  provideTmpdirInstance(
    (_dir) =>
      Effect.gen(function* () {
        const { prompt, run, chat } = yield* boot()
        yield* seed(chat.id, { finish: "stop" })

        const [a, b] = yield* Effect.all([prompt.loop({ sessionID: chat.id }), prompt.loop({ sessionID: chat.id })], {
          concurrency: "unbounded",
        })

        expect(a.info.id).toBe(b.info.id)
        expect(a.info.role).toBe("assistant")
        yield* run.assertNotBusy(chat.id)
      }),
    { git: true },
  ),
)

it.live(
  "concurrent loop callers all receive same error result",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Pinned" })

        yield* llm.fail("boom")
        yield* user(chat.id, "hello")

        const [a, b] = yield* Effect.all([prompt.loop({ sessionID: chat.id }), prompt.loop({ sessionID: chat.id })], {
          concurrency: "unbounded",
        })
        expect(a.info.id).toBe(b.info.id)
        expect(a.info.role).toBe("assistant")
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live(
  "prompt submitted during an active run is included in the next LLM input",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const gate = defer<void>()
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Pinned" })

        yield* llm.hold("first", gate.promise)
        yield* llm.text("second")

        const a = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "first" }],
          })
          .pipe(Effect.forkChild)

        yield* llm.wait(1)

        const id = MessageID.ascending()
        const b = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: id,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "second" }],
          })
          .pipe(Effect.forkChild)

        yield* Effect.promise(async () => {
          const end = Date.now() + 5000
          while (Date.now() < end) {
            const msgs = await Effect.runPromise(sessions.messages({ sessionID: chat.id }))
            if (msgs.some((msg) => msg.info.role === "user" && msg.info.id === id)) return
            await new Promise((done) => setTimeout(done, 20))
          }
          throw new Error("timed out waiting for second prompt to save")
        })

        gate.resolve()

        const [ea, eb] = yield* Effect.all([Fiber.await(a), Fiber.await(b)])
        expect(Exit.isSuccess(ea)).toBe(true)
        expect(Exit.isSuccess(eb)).toBe(true)
        expect(yield* llm.calls).toBe(2)

        const msgs = yield* sessions.messages({ sessionID: chat.id })
        const assistants = msgs.filter((msg) => msg.info.role === "assistant")
        expect(assistants).toHaveLength(2)
        const last = assistants.at(-1)
        if (!last || last.info.role !== "assistant") throw new Error("expected second assistant")
        expect(last.info.parentID).toBe(id)
        expect(last.parts.some((part) => part.type === "text" && part.text === "second")).toBe(true)

        const inputs = yield* llm.inputs
        expect(inputs).toHaveLength(2)
        expect(JSON.stringify(inputs.at(-1)?.messages)).toContain("second")
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live(
  "a prompt persisted after runLoop exits starts a fresh run instead of joining the closing run",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Prompt handoff" })
        const gate = yield* holdNextRunAtExit(chat.id)

        yield* llm.text("first answer")
        const first = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "first" }],
          })
          .pipe(Effect.forkChild)
        yield* llm.wait(1).pipe(Effect.timeout("10 seconds"))
        yield* Deferred.await(gate.ownerExit).pipe(Effect.timeout("10 seconds"))

        yield* llm.text("late answer")
        const lateID = MessageID.ascending("msg_00000000000000000000000000")
        const late = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: lateID,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "late while closing" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(gate.followerAttached).pipe(Effect.timeout("10 seconds"))

        expect((yield* sessions.messages({ sessionID: chat.id })).some((item) => item.info.id === lateID)).toBe(true)
        yield* Deferred.succeed(gate.releaseOwner, undefined)
        yield* Fiber.join(first).pipe(Effect.timeout("10 seconds"))
        const result = yield* Fiber.join(late).pipe(Effect.timeout("10 seconds"))

        expect(yield* llm.calls).toBe(2)
        expect(result.info.role).toBe("assistant")
        if (result.info.role !== "assistant") return
        expect(result.info.parentID).toBe(lateID)
        expect(result.parts.findLast((part) => part.type === "text")?.text).toBe("late answer")
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live(
  "a queued prompt starts a fresh run when the joined runner returns a user message",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const state = yield* SessionRunState.Service
        const chat = yield* sessions.create({ title: "User-result handoff" })
        const first = yield* prompt.prompt({
          sessionID: chat.id,
          agent: "build",
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "maintenance owner" }],
        })
        const entered = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        const completion = yield* state.startRunning(
          chat.id,
          "main",
          Effect.succeed(first),
          Deferred.succeed(entered, undefined).pipe(Effect.andThen(Deferred.await(release)), Effect.as(first)),
        )
        const owner = yield* completion.pipe(Effect.forkChild)
        yield* Deferred.await(entered).pipe(Effect.timeout("10 seconds"))

        yield* llm.text("queued answer")
        const followerAttached = yield* armNextRunFollower(chat.id)
        const queuedID = MessageID.ascending()
        const queued = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: queuedID,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "queued behind maintenance" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(followerAttached).pipe(Effect.timeout("10 seconds"))
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(owner).pipe(Effect.timeout("10 seconds"))
        const result = yield* Fiber.join(queued).pipe(Effect.timeout("10 seconds"))

        expect(yield* llm.calls).toBe(1)
        expect(result.info.role === "assistant" ? result.info.parentID : undefined).toBe(queuedID)
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

taskMetadataIt.live(
  "a queued prompt retries after the joined runner fails before covering it",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const sessionStatus = yield* SessionStatus.Service
        const chat = yield* sessions.create({ title: "Failed prompt handoff" })
        const gate = yield* holdNextSessionPre(true)

        yield* llm.text("recovered answer")
        const first = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            task_id: "T1",
            parts: [{ type: "text", text: "first prompt" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(gate.entered).pipe(Effect.timeout("10 seconds"))

        const followerAttached = yield* armNextRunFollower(chat.id)
        const lateID = MessageID.ascending()
        const late = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: lateID,
            agent: "build",
            task_id: "T2",
            parts: [{ type: "text", text: "queued before failure" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(followerAttached).pipe(Effect.timeout("10 seconds"))
        expect((yield* sessions.messages({ sessionID: chat.id })).some((item) => item.info.id === lateID)).toBe(true)

        yield* Deferred.succeed(gate.release, undefined)
        const exits = yield* Effect.all([Fiber.await(first), Fiber.await(late)], { concurrency: "unbounded" }).pipe(
          Effect.timeout("10 seconds"),
        )

        expect(Exit.isFailure(exits[0])).toBe(true)
        expect(Exit.isSuccess(exits[1])).toBe(true)
        if (Exit.isFailure(exits[0]))
          expect(Cause.pretty(exits[0].cause)).toContain("session.pre failed after a queued prompt joined")
        const result = Exit.isSuccess(exits[1]) ? exits[1].value : undefined
        expect(yield* llm.calls).toBe(1)
        expect(result?.info.role === "assistant" ? result.info.parentID : undefined).toBe(lateID)
        expect(sessionTaskIDs.pre).toEqual(["T1", "T2"])
        expect(sessionTaskIDs.post).toEqual(["T1", "T2"])
        expect((yield* sessionStatus.get(chat.id)).type).toBe("idle")
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

taskMetadataIt.live(
  "a queued task supersedes an older output-length continuation",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Length prompt handoff" })
        const seeded = yield* seed(chat.id, { finish: "length" })
        yield* sessions.updateMessage({ ...seeded.user, task_id: "T1" })
        yield* sessions.updateMessage({
          ...seeded.assistant,
          time: { ...seeded.assistant.time, completed: Date.now() },
        })
        const gate = yield* holdNextSessionPre()

        yield* llm.text("new task answer")
        const owner = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* Deferred.await(gate.entered).pipe(Effect.timeout("10 seconds"))

        const followerAttached = yield* armNextRunFollower(chat.id)
        const lateID = MessageID.ascending()
        const late = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: lateID,
            agent: "build",
            task_id: "T2",
            parts: [{ type: "text", text: "new task while length closes" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(followerAttached).pipe(Effect.timeout("10 seconds"))
        yield* Deferred.succeed(gate.release, undefined)
        yield* Fiber.join(owner).pipe(Effect.timeout("10 seconds"))
        const result = yield* Fiber.join(late).pipe(Effect.timeout("10 seconds"))

        expect(yield* llm.calls).toBe(1)
        expect(result.info.role === "assistant" ? result.info.parentID : undefined).toBe(lateID)
        const input = JSON.stringify((yield* llm.inputs)[0]?.messages)
        expect(input).toContain("new task while length closes")
        expect(input).not.toContain("output token limit")
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

taskMetadataIt.live(
  "a queued prompt preserves structured output from the superseded step",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Structured prompt handoff" })
        const gate = yield* holdNextUserQueryPost()
        const firstID = MessageID.ascending()

        yield* llm.tool("StructuredOutput", { answer: 4 })
        yield* llm.text("latest answer")
        const first = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: firstID,
            agent: "build",
            task_id: "T1",
            format: {
              type: "json_schema",
              retryCount: 0,
              schema: {
                type: "object",
                properties: { answer: { type: "number" } },
                required: ["answer"],
              },
            },
            parts: [{ type: "text", text: "return structured output" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(gate.entered).pipe(Effect.timeout("10 seconds"))

        const followerAttached = yield* armNextRunFollower(chat.id)
        const lateID = MessageID.ascending()
        const late = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: lateID,
            agent: "build",
            task_id: "T2",
            parts: [{ type: "text", text: "new task after structured output" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(followerAttached).pipe(Effect.timeout("10 seconds"))
        yield* Deferred.succeed(gate.release, undefined)
        const results = yield* Effect.all([Fiber.join(first), Fiber.join(late)], { concurrency: "unbounded" }).pipe(
          Effect.timeout("10 seconds"),
        )
        const messages = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const firstAssistant = messages.find((item) => item.info.role === "assistant" && item.info.parentID === firstID)
        const lateAssistant = messages.find((item) => item.info.role === "assistant" && item.info.parentID === lateID)

        expect(yield* llm.calls).toBe(2)
        expect(firstAssistant?.info.role === "assistant" ? firstAssistant.info.structured : undefined).toEqual({
          answer: 4,
        })
        expect(lateAssistant?.info.role === "assistant" ? lateAssistant.info.structured : undefined).toBeUndefined()
        expect(results[0].info.role === "assistant" ? results[0].info.parentID : undefined).toBe(firstID)
        expect(results[1].info.role === "assistant" ? results[1].info.parentID : undefined).toBe(lateID)
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

taskMetadataIt.live(
  "closing handoff binds task metadata to the latest persisted prompt",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const registry = yield* ToolRegistry.Service
        const chat = yield* sessions.create({ title: "Prompt metadata handoff" })
        const gate = yield* holdNextRunAtExit(chat.id)
        const planExit = (yield* registry.all()).find((item) => item.id === "plan_exit")
        if (!planExit) throw new Error("plan_exit tool not found")
        const original = planExit.execute
        const toolTaskIDs: Array<string | undefined> = []
        planExit.execute = (_args, ctx) =>
          Effect.sync(() => {
            toolTaskIDs.push(ctx.taskId)
            return { title: "plan_exit", output: "ok", metadata: {} }
          })
        yield* Effect.addFinalizer(() => Effect.sync(() => void (planExit.execute = original)))

        yield* llm.text("first answer")
        const first = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            task_id: "T0",
            parts: [{ type: "text", text: "first" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(gate.ownerExit).pipe(Effect.timeout("10 seconds"))

        yield* llm.tool("plan_exit", {})
        yield* llm.text("latest answer")
        const queued = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            task_id: "T1",
            parts: [{ type: "text", text: "queued while closing" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(gate.followerAttached).pipe(Effect.timeout("10 seconds"))

        const latestID = MessageID.ascending()
        yield* prompt.prompt({
          sessionID: chat.id,
          messageID: latestID,
          agent: "build",
          task_id: "T2",
          noReply: true,
          parts: [{ type: "text", text: "latest persisted prompt" }],
        })

        yield* Deferred.succeed(gate.releaseOwner, undefined)
        yield* Fiber.join(first).pipe(Effect.timeout("10 seconds"))
        const result = yield* Fiber.join(queued).pipe(Effect.timeout("10 seconds"))

        expect(yield* llm.calls).toBe(3)
        const successorInput = (yield* llm.inputs)[1]
        expect(JSON.stringify(successorInput?.messages)).toContain("queued while closing")
        expect(JSON.stringify(successorInput?.messages)).toContain("latest persisted prompt")
        expect(result.info.role === "assistant" ? result.info.parentID : undefined).toBe(latestID)
        expect(toolTaskIDs).toEqual(["T2"])
        expect(sessionTaskIDs.pre).toEqual(["T0", "T2"])
        expect(sessionTaskIDs.post).toEqual(["T0", "T2"])
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live(
  "a prompt superseding a closing errored run preserves the error and completes the old assistant",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Errored prompt handoff" })
        const gate = yield* holdNextRunAtExit(chat.id)

        yield* llm.error(400, { error: { message: "first turn failed" } })
        const firstID = MessageID.ascending()
        const first = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: firstID,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "first fails" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(gate.ownerExit).pipe(Effect.timeout("10 seconds"))

        yield* llm.text("late answer after error")
        const lateID = MessageID.ascending()
        const late = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: lateID,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "late after error" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(gate.followerAttached).pipe(Effect.timeout("10 seconds"))
        yield* Deferred.succeed(gate.releaseOwner, undefined)
        yield* Fiber.join(first).pipe(Effect.timeout("10 seconds"))
        const result = yield* Fiber.join(late).pipe(Effect.timeout("10 seconds"))

        expect(yield* llm.calls).toBe(2)
        expect(result.info.role === "assistant" ? result.info.parentID : undefined).toBe(lateID)
        const after = (yield* sessions.messages({ sessionID: chat.id })).find(
          (item) => item.info.role === "assistant" && item.info.parentID === firstID,
        )
        if (!after || after.info.role !== "assistant") {
          yield* Effect.die("expected preserved errored assistant")
          return
        }
        expect(after.info.error?.name).toBe("APIError")
        expect(JSON.stringify(after.info.error)).toContain("first turn failed")
        expect(after.info.time.completed).toBeNumber()
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live(
  "a shared MessageAbortedError does not restart handoff for a queued prompt",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Cancelled prompt handoff" })

        yield* llm.hang
        const first = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "first hangs" }],
          })
          .pipe(Effect.forkChild)
        yield* llm.wait(1).pipe(Effect.timeout("10 seconds"))

        const followerAttached = yield* armNextRunFollower(chat.id)
        yield* llm.text("must not restart")
        const lateID = MessageID.ascending()
        const late = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: lateID,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "queued before cancel" }],
          })
          .pipe(Effect.forkChild)
        yield* Deferred.await(followerAttached).pipe(Effect.timeout("10 seconds"))

        yield* prompt.cancel(chat.id)
        yield* Fiber.join(first).pipe(Effect.timeout("10 seconds"))
        const result = yield* Fiber.join(late).pipe(Effect.timeout("10 seconds"))

        expect(yield* llm.calls).toBe(1)
        expect(result.info.role === "assistant" ? result.info.error?.name : undefined).toBe("MessageAbortedError")
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).some(
            (item) => item.info.role === "assistant" && item.info.parentID === lateID,
          ),
        ).toBe(false)
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live(
  "assertNotBusy throws BusyError when loop running",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const run = yield* SessionRunState.Service
        const sessions = yield* Session.Service
        yield* llm.hang

        const chat = yield* sessions.create({})
        yield* user(chat.id, "hi")

        const fiber = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1)

        const exit = yield* run.assertNotBusy(chat.id).pipe(Effect.exit)
        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          expect(Cause.squash(exit.cause)).toBeInstanceOf(Session.BusyError)
        }

        yield* prompt.cancel(chat.id)
        yield* Fiber.await(fiber)
      }),
      { git: true, config: providerCfg },
    ),
  // Include real fixture setup and scoped cancellation/disposal in the budget.
  20_000,
)

it.live("assertNotBusy succeeds when idle", () =>
  provideTmpdirInstance(
    (_dir) =>
      Effect.gen(function* () {
        const run = yield* SessionRunState.Service
        const sessions = yield* Session.Service

        const chat = yield* sessions.create({})
        const exit = yield* run.assertNotBusy(chat.id).pipe(Effect.exit)
        expect(Exit.isSuccess(exit)).toBe(true)
      }),
    { git: true },
  ),
)

// Shell semantics

it.live(
  "shell rejects with BusyError when loop running",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "Pinned" })
        yield* llm.hang
        yield* user(chat.id, "hi")

        const fiber = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1)

        const exit = yield* prompt.shell({ sessionID: chat.id, agent: "build", command: "echo hi" }).pipe(Effect.exit)
        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          expect(Cause.squash(exit.cause)).toBeInstanceOf(Session.BusyError)
        }

        yield* prompt.cancel(chat.id)
        yield* Fiber.await(fiber)
      }),
      { git: true, config: providerCfg },
    ),
  5_000,
)

unix("shell captures stdout and stderr in completed tool output", () =>
  provideTmpdirInstance(
    (_dir) =>
      Effect.gen(function* () {
        const { prompt, run, chat } = yield* boot()
        const result = yield* prompt.shell({
          sessionID: chat.id,
          agent: "build",
          command: "printf out && printf err >&2",
        })

        expect(result.info.role).toBe("assistant")
        const tool = completedTool(result.parts)
        if (!tool) return

        expect(tool.state.output).toContain("out")
        expect(tool.state.output).toContain("err")
        expect(tool.state.metadata.output).toContain("out")
        expect(tool.state.metadata.output).toContain("err")
        yield* run.assertNotBusy(chat.id)
      }),
    { git: true, config: cfg },
  ),
)

unix("shell completes a fast command on the preferred shell", () =>
  provideTmpdirInstance(
    (dir) =>
      Effect.gen(function* () {
        const { prompt, run, chat } = yield* boot()
        const result = yield* prompt.shell({
          sessionID: chat.id,
          agent: "build",
          command: "pwd",
        })

        expect(result.info.role).toBe("assistant")
        const tool = completedTool(result.parts)
        if (!tool) return

        expect(tool.state.input.command).toBe("pwd")
        expect(tool.state.output).toContain(dir)
        expect(tool.state.metadata.output).toContain(dir)
        yield* run.assertNotBusy(chat.id)
      }),
    { git: true, config: cfg },
  ),
)

unix("shell lists files from the project directory", () =>
  provideTmpdirInstance(
    (dir) =>
      Effect.gen(function* () {
        const { prompt, run, chat } = yield* boot()
        yield* Effect.promise(() => Bun.write(path.join(dir, "README.md"), "# e2e\n"))

        const result = yield* prompt.shell({
          sessionID: chat.id,
          agent: "build",
          command: "command ls",
        })

        expect(result.info.role).toBe("assistant")
        const tool = completedTool(result.parts)
        if (!tool) return

        expect(tool.state.input.command).toBe("command ls")
        expect(tool.state.output).toContain("README.md")
        expect(tool.state.metadata.output).toContain("README.md")
        yield* run.assertNotBusy(chat.id)
      }),
    { git: true, config: cfg },
  ),
)

unix("shell captures stderr from a failing command", () =>
  provideTmpdirInstance(
    (_dir) =>
      Effect.gen(function* () {
        const { prompt, run, chat } = yield* boot()
        const result = yield* prompt.shell({
          sessionID: chat.id,
          agent: "build",
          command: "command -v __nonexistent_cmd_e2e__ || echo 'not found' >&2; exit 1",
        })

        expect(result.info.role).toBe("assistant")
        const tool = completedTool(result.parts)
        if (!tool) return

        expect(tool.state.output).toContain("not found")
        expect(tool.state.metadata.output).toContain("not found")
        yield* run.assertNotBusy(chat.id)
      }),
    { git: true, config: cfg },
  ),
)

unix(
  "shell updates running metadata before process exit",
  () =>
    withSh(() =>
      provideTmpdirInstance(
        (_dir) =>
          Effect.gen(function* () {
            const { prompt, chat } = yield* boot()

            const fiber = yield* prompt
              .shell({ sessionID: chat.id, agent: "build", command: "printf first && sleep 0.2 && printf second" })
              .pipe(Effect.forkChild)

            yield* Effect.promise(async () => {
              const start = Date.now()
              while (Date.now() - start < 5000) {
                const msgs = await MessageV2.filterCompacted(MessageV2.stream(chat.id))
                const taskMsg = msgs.find((item) => item.info.role === "assistant")
                const tool = taskMsg ? toolPart(taskMsg.parts) : undefined
                if (tool?.state.status === "running" && tool.state.metadata?.output.includes("first")) return
                await new Promise((done) => setTimeout(done, 20))
              }
              throw new Error("timed out waiting for running shell metadata")
            })

            const exit = yield* Fiber.await(fiber)
            expect(Exit.isSuccess(exit)).toBe(true)
          }),
        { git: true, config: cfg },
      ),
    ),
  30_000,
)

it.live(
  "loop waits while shell runs and starts after shell exits",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({
          title: "Pinned",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("after-shell")

        const sh = yield* prompt
          .shell({ sessionID: chat.id, agent: "build", model: ref, command: "sleep 0.2" })
          .pipe(Effect.forkChild)
        yield* Effect.sleep(50)

        const loop = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* Effect.sleep(50)

        expect(yield* llm.calls).toBe(0)

        yield* Fiber.await(sh)
        const exit = yield* Fiber.await(loop)

        expect(Exit.isSuccess(exit)).toBe(true)
        if (Exit.isSuccess(exit)) {
          expect(exit.value.info.role).toBe("assistant")
          expect(exit.value.parts.some((part) => part.type === "text" && part.text === "after-shell")).toBe(true)
        }
        expect(yield* llm.calls).toBe(1)
      }),
      { git: true, config: providerCfg },
    ),
  10_000,
)

it.live(
  "shell completion resumes queued loop callers",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({
          title: "Pinned",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("done")

        const sh = yield* prompt
          .shell({ sessionID: chat.id, agent: "build", model: ref, command: "sleep 0.2" })
          .pipe(Effect.forkChild)
        yield* Effect.sleep(50)

        const a = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        const b = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* Effect.sleep(50)

        expect(yield* llm.calls).toBe(0)

        yield* Fiber.await(sh)
        const [ea, eb] = yield* Effect.all([Fiber.await(a), Fiber.await(b)])

        expect(Exit.isSuccess(ea)).toBe(true)
        expect(Exit.isSuccess(eb)).toBe(true)
        if (Exit.isSuccess(ea) && Exit.isSuccess(eb)) {
          expect(ea.value.info.id).toBe(eb.value.info.id)
          expect(ea.value.info.role).toBe("assistant")
        }
        expect(yield* llm.calls).toBe(1)
      }),
      { git: true, config: providerCfg },
    ),
  10_000,
)

unix(
  "cancel interrupts shell and resolves cleanly",
  () =>
    withSh(() =>
      provideTmpdirInstance(
        (_dir) =>
          Effect.gen(function* () {
            const { prompt, run, sessions, chat } = yield* boot()

            const sh = yield* prompt
              .shell({ sessionID: chat.id, agent: "build", command: "sleep 30" })
              .pipe(Effect.forkChild)
            yield* Effect.gen(function* () {
              while (true) {
                const msgs = yield* sessions.messages({ sessionID: chat.id })
                if (msgs.some((m) => m.info.role === "assistant")) return
                yield* Effect.sleep(10)
              }
            }).pipe(Effect.timeout(5000))

            yield* prompt.cancel(chat.id)

            const status = yield* SessionStatus.Service
            expect((yield* status.get(chat.id)).type).toBe("idle")
            const busy = yield* run.assertNotBusy(chat.id).pipe(Effect.exit)
            expect(Exit.isSuccess(busy)).toBe(true)

            const exit = yield* Fiber.await(sh)
            expect(Exit.isSuccess(exit)).toBe(true)
            if (Exit.isSuccess(exit)) {
              expect(exit.value.info.role).toBe("assistant")
              const tool = completedTool(exit.value.parts)
              if (tool) {
                expect(tool.state.output).toContain("User aborted the command")
              }
            }
          }),
        { git: true, config: cfg },
      ),
    ),
  30_000,
)

unix(
  "cancel persists aborted shell result when shell ignores TERM",
  () =>
    withSh(() =>
      provideTmpdirInstance(
        (_dir) =>
          Effect.gen(function* () {
            const { prompt, sessions, chat } = yield* boot()

            const sh = yield* prompt
              .shell({ sessionID: chat.id, agent: "build", command: "trap '' TERM; sleep 30" })
              .pipe(Effect.forkChild)
            yield* Effect.gen(function* () {
              while (true) {
                const msgs = yield* sessions.messages({ sessionID: chat.id })
                if (msgs.some((m) => m.info.role === "assistant")) return
                yield* Effect.sleep(10)
              }
            }).pipe(Effect.timeout(5000))

            yield* prompt.cancel(chat.id)

            const exit = yield* Fiber.await(sh)
            expect(Exit.isSuccess(exit)).toBe(true)
            if (Exit.isSuccess(exit)) {
              expect(exit.value.info.role).toBe("assistant")
              const tool = completedTool(exit.value.parts)
              if (tool) {
                expect(tool.state.output).toContain("User aborted the command")
              }
            }
          }),
        { git: true, config: cfg },
      ),
    ),
  30_000,
)

// skip (was unix-only): flaky timing race — 150ms sleep insufficient on slow CI runners
it.live.skip(
  "cancel finalizes interrupted bash tool output through normal truncation",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "Interrupted bash truncation",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const ready = "bash-output-ready"

          yield* prompt.prompt({
            sessionID: chat.id,
            agent: "build",
            noReply: true,
            parts: [{ type: "text", text: "run bash" }],
          })

          yield* llm.tool("bash", {
            command: `head -c 200000 /dev/zero | tr '\\0' x; touch ${ready}; sleep 30`,
            description: "Print large output",
            timeout: 30_000,
            workdir: path.resolve(dir),
          })

          const run = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
          yield* llm.wait(1)
          yield* Effect.gen(function* () {
            while (!(yield* Effect.promise(() => Bun.file(path.join(dir, ready)).exists()))) yield* Effect.sleep(10)
          }).pipe(Effect.timeout(5000))
          yield* prompt.cancel(chat.id)

          const exit = yield* Fiber.await(run)
          expect(Exit.isSuccess(exit)).toBe(true)
          if (Exit.isFailure(exit)) return

          const tool = completedTool(exit.value.parts)
          if (!tool) return

          expect(tool.state.metadata.truncated).toBe(true)
          expect(typeof tool.state.metadata.outputPath).toBe("string")
          expect(tool.state.output).toContain("Warning: truncated output")
          expect(tool.state.output).toMatch(/Full output saved to:\s+\S+/)
          expect(tool.state.output).not.toContain("Tool execution aborted")
        }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

// skip: flaky timing race — sleep(50) insufficient for shell to acquire run-state lock on slow CI
it.live.skip(
  "cancel interrupts loop queued behind shell",
  () =>
    provideTmpdirInstance(
      (_dir) =>
        Effect.gen(function* () {
          const { prompt, chat } = yield* boot()

          const sh = yield* prompt
            .shell({ sessionID: chat.id, agent: "build", command: "sleep 30" })
            .pipe(Effect.forkChild)
          yield* Effect.sleep(50)

          const loop = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
          yield* Effect.sleep(50)

          yield* prompt.cancel(chat.id)

          const exit = yield* Fiber.await(loop)
          expect(Exit.isSuccess(exit)).toBe(true)

          yield* Fiber.await(sh)
        }),
      { git: true, config: cfg },
    ),
  30_000,
)

unix(
  "shell rejects when another shell is already running",
  () =>
    withSh(() =>
      provideTmpdirInstance(
        (_dir) =>
          Effect.gen(function* () {
            const { prompt, chat } = yield* boot()

            const a = yield* prompt
              .shell({ sessionID: chat.id, agent: "build", command: "sleep 30" })
              .pipe(Effect.forkChild)
            yield* Effect.sleep(50)

            const exit = yield* prompt
              .shell({ sessionID: chat.id, agent: "build", command: "echo hi" })
              .pipe(Effect.exit)
            expect(Exit.isFailure(exit)).toBe(true)
            if (Exit.isFailure(exit)) {
              expect(Cause.squash(exit.cause)).toBeInstanceOf(Session.BusyError)
            }

            yield* prompt.cancel(chat.id)
            yield* Fiber.await(a)
          }),
        { git: true, config: cfg },
      ),
    ),
  30_000,
)

// Abort signal propagation tests for inline tool execution

/** Override a tool's execute to hang until aborted. Returns ready/aborted defers and a finalizer. */
function hangUntilAborted(tool: { execute: (...args: any[]) => any }) {
  const ready = defer<void>()
  const aborted = defer<void>()
  const original = tool.execute
  tool.execute = (_args: any, ctx: any) => {
    ready.resolve()
    ctx.abort.addEventListener("abort", () => aborted.resolve(), { once: true })
    return Effect.callback<never>(() => {})
  }
  const restore = Effect.addFinalizer(() => Effect.sync(() => void (tool.execute = original)))
  return { ready, aborted, restore }
}

it.live(
  "interrupt propagates abort signal to read tool via file part (text/plain)",
  () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          const registry = yield* ToolRegistry.Service
          const { read } = yield* registry.named()
          const { ready, aborted, restore } = hangUntilAborted(read)
          yield* restore

          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({ title: "Abort Test" })

          const testFile = path.join(dir, "test.txt")
          yield* Effect.promise(() => Bun.write(testFile, "hello world"))

          const fiber = yield* prompt
            .prompt({
              sessionID: chat.id,
              agent: "build",
              parts: [
                { type: "text", text: "read this" },
                { type: "file", url: `file://${testFile}`, filename: "test.txt", mime: "text/plain" },
              ],
            })
            .pipe(Effect.forkChild)

          yield* Effect.promise(() => ready.promise)
          yield* Fiber.interrupt(fiber)

          yield* Effect.promise(() =>
            Promise.race([
              aborted.promise,
              new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error("abort signal not propagated within 2s")), 2_000),
              ),
            ]),
          )
        }),
      { git: true, config: cfg },
    ),
  30_000,
)

it.live(
  "interrupt propagates abort signal to read tool via file part (directory)",
  () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          const registry = yield* ToolRegistry.Service
          const { read } = yield* registry.named()
          const { ready, aborted, restore } = hangUntilAborted(read)
          yield* restore

          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({ title: "Abort Test" })

          const fiber = yield* prompt
            .prompt({
              sessionID: chat.id,
              agent: "build",
              parts: [
                { type: "text", text: "read this" },
                { type: "file", url: `file://${dir}`, filename: "dir", mime: "application/x-directory" },
              ],
            })
            .pipe(Effect.forkChild)

          yield* Effect.promise(() => ready.promise)
          yield* Fiber.interrupt(fiber)

          yield* Effect.promise(() =>
            Promise.race([
              aborted.promise,
              new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error("abort signal not propagated within 2s")), 2_000),
              ),
            ]),
          )
        }),
      { git: true, config: cfg },
    ),
  30_000,
)

it.live("run approval survives real SDK tool bridge and does not leak into the next same-session run", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const permission = yield* Permission.Service
      const bus = yield* Bus.Service
      const chat = yield* sessions.create({
        title: "Run approval",
        permission: [{ permission: "bash", pattern: "*", action: "ask" }],
      })
      const seen: Array<string | undefined> = []
      const off = yield* bus.subscribeCallback(Permission.Event.Asked, (event) => {
        seen.push(event.properties.runID)
        Effect.runFork(permission.reply({ requestID: event.properties.id, reply: "once" }))
      })
      try {
        for (const runID of ["6dfb4578-326e-4af8-9db9-a8c2310ab1da", undefined]) {
          yield* llm.tool("bash", { command: "echo scoped", description: "Print a marker" })
          yield* llm.text("done")
          const completion = yield* prompt.startPrompt({
            sessionID: chat.id,
            model: ref,
            parts: [{ type: "text", text: "print" }],
            runID,
          })
          yield* completion
        }
        expect(seen).toEqual(["6dfb4578-326e-4af8-9db9-a8c2310ab1da", undefined])
      } finally {
        off()
      }
    }),
    { git: true, config: providerCfg },
  ),
)

for (const agentID of ["main", "worker"])
  it.live(
    `run approval keeps its tag across automatic ${agentID === "main" ? "checkpoint rebuild" : "compaction"} and synthetic continuation`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const permission = yield* Permission.Service
          const bus = yield* Bus.Service
          const chat = yield* sessions.create({
            title: "Run compaction",
            permission: [{ permission: "bash", pattern: "*", action: "ask" }],
          })
          const seen: Permission.Request[] = []
          const off = yield* bus.subscribeCallback(Permission.Event.Asked, (event) => {
            seen.push(event.properties)
            Effect.runFork(
              Effect.gen(function* () {
                if (agentID === "main" && seen.length === 1) {
                  // Seed a completed checkpoint before overflow, so this test
                  // exercises rebuild rather than starting a separate writer.
                  const boundary = (yield* sessions.messages({ sessionID: chat.id })).findLast(
                    (message) => message.info.role === "user",
                  )!
                  yield* Effect.promise(() => Bun.write(checkpointPath(chat.id), "Topic: Continue the second marker\n"))
                  yield* Effect.sync(() =>
                    Database.use((db) =>
                      db
                        .update(SessionTable)
                        .set({ last_checkpoint_message_id: boundary.info.id })
                        .where(eq(SessionTable.id, chat.id))
                        .run(),
                    ),
                  )
                }
                yield* permission.reply({ requestID: event.properties.id, reply: "once" })
              }),
            )
          })
          try {
            yield* llm.push(
              reply()
                .tool("bash", { command: "echo before", description: "Before compaction" })
                .usage({ input: 95000, output: 10 }),
            )
            if (agentID !== "main") yield* llm.text("The first command succeeded. Continue the requested work.")
            yield* llm.tool("bash", { command: "echo after", description: "After compaction" })
            yield* llm.text("done")
            yield* yield* prompt.startPrompt({
              sessionID: chat.id,
              agentID,
              model: ref,
              runID: "6dfb4578-326e-4af8-9db9-a8c2310ab1da",
              parts: [{ type: "text", text: "run two markers" }],
            })
            expect(seen.map((request) => request.runID)).toEqual([
              "6dfb4578-326e-4af8-9db9-a8c2310ab1da",
              "6dfb4578-326e-4af8-9db9-a8c2310ab1da",
            ])
            const messages = yield* sessions.messages({ sessionID: chat.id, agentID })
            expect(
              messages.some((message) =>
                message.parts.some((part) => part.type === (agentID === "main" ? "checkpoint" : "compaction")),
              ),
            ).toBe(true)
            const parents = seen
              .map((request) => messages.find((message) => message.info.id === request.tool?.messageID)?.info)
              .map((info) => (info?.role === "assistant" ? info.parentID : undefined))
            expect(parents[0]).toBeDefined()
            expect(parents[1]).toBeDefined()
            expect(parents[0]).not.toBe(parents[1])
          } finally {
            off()
          }
        }),
        { git: true, config: providerCfg },
      ),
  )

itActor.live("run approval command subtask gives its foreground child the creator tag", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const permission = yield* Permission.Service
      const bus = yield* Bus.Service
      const chat = yield* sessions.create({
        title: "Command child",
        permission: [{ permission: "bash", pattern: "*", action: "ask" }],
      })
      const seen: Permission.Request[] = []
      const off = yield* bus.subscribeCallback(Permission.Event.Asked, (event) => {
        seen.push(event.properties)
        Effect.runFork(permission.reply({ requestID: event.properties.id, reply: "once" }))
      })
      try {
        yield* llm.tool("bash", { command: "echo child", description: "Child marker" })
        yield* llm.text("child complete")
        yield* llm.text("command complete")
        yield* yield* prompt.startCommand({
          sessionID: chat.id,
          runID: "6dfb4578-326e-4af8-9db9-a8c2310ab1da",
          command: "scoped",
          arguments: "",
        })
        expect(seen.map((request) => request.runID)).toEqual(["6dfb4578-326e-4af8-9db9-a8c2310ab1da"])
        const messages = yield* sessions.messages({ sessionID: chat.id, agentID: "*" })
        const actor = messages.find((message) => message.info.id === seen[0]?.tool?.messageID)
        expect(actor?.info.agentID).toBeDefined()
        expect(actor?.info.agentID).not.toBe("main")
      } finally {
        off()
      }
    }),
    {
      git: true,
      config: (url) => ({
        ...providerCfg(url),
        command: {
          scoped: { template: "print a marker", description: "Run scoped child", agent: "general", subtask: true },
        },
        agent: {
          general: { model: "test/test-model", prompt: "Run the requested command then stop.", completionGate: false },
        },
      }),
    },
  ),
)

it.live("run approval disconnect retracts an already pending command permission without executing it", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ dir, llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const permission = yield* Permission.Service
      const bus = yield* Bus.Service
      const chat = yield* sessions.create({
        title: "Disconnected command",
        permission: [{ permission: "bash", pattern: "*", action: "ask" }],
      })
      const asked = yield* Deferred.make<Permission.Request>()
      const controller = new AbortController()
      const off = yield* bus.subscribeCallback(Permission.Event.Asked, (event) => {
        Effect.runFork(Deferred.succeed(asked, event.properties))
      })
      try {
        yield* llm.tool("bash", { command: "echo bad > should-not-exist.txt", description: "Must never execute" })
        yield* llm.text("cancelled")
        const completion = yield* prompt
          .startCommand({
            sessionID: chat.id,
            runID: "6dfb4578-326e-4af8-9db9-a8c2310ab1da",
            command: "scoped",
            arguments: "",
          })
          .pipe(Effect.provideService(RunApproval.RequestSignal, controller.signal))
        const request = yield* Deferred.await(asked)
        expect(request.runID).toBe("6dfb4578-326e-4af8-9db9-a8c2310ab1da")
        expect((yield* permission.list()).some((pending) => pending.id === request.id)).toBe(true)
        controller.abort()
        yield* completion
        expect((yield* permission.list()).some((pending) => pending.id === request.id)).toBe(false)
        expect(yield* Effect.promise(() => Bun.file(path.join(dir, "should-not-exist.txt")).exists())).toBe(false)
      } finally {
        off()
        controller.abort()
      }
    }),
    {
      git: true,
      config: (url) => ({
        ...providerCfg(url),
        model: "test/test-model",
        command: { scoped: { template: "print a marker", agent: "build" } },
      }),
    },
  ),
)

// Four serialized Actors exercise real tools and provider turns.
itActor.live(
  "run approval explicitly follows new peers and subagents but never infers ownership from a parent session",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actors = yield* Effect.serviceOption(Actor.Service)
        if (actors._tag === "None") throw new Error("real Actor service was not provided")
        const actor = actors.value
        const sessions = yield* Session.Service
        const permission = yield* Permission.Service
        const bus = yield* Bus.Service
        const parent = yield* sessions.create({
          title: "Run children",
          permission: [{ permission: "bash", pattern: "*", action: "ask" }],
        })
        const seen: Permission.Request[] = []
        const off = yield* bus.subscribeCallback(Permission.Event.Asked, (event) => {
          seen.push(event.properties)
          Effect.runFork(permission.reply({ requestID: event.properties.id, reply: "once" }))
        })
        try {
          yield* Effect.gen(function* () {
            for (const mode of ["subagent", "peer"] as const) {
              for (const inherit of [true, false]) {
                yield* llm.tool("bash", { command: "echo child", description: "Child marker" })
                yield* llm.text("complete")
                const child = yield* actor.spawn({
                  mode,
                  sessionID: parent.id,
                  agentType: "build",
                  task: "print a marker",
                  context: "none",
                  tools: ["bash"],
                  model: ref,
                  background: false,
                  runApproval: inherit ? yield* RunApproval.current : undefined,
                })
                const result = yield* Deferred.await(child.outcome)
                expect(result.status).toBe("success")
                expect(seen.at(-1)?.runID).toBe(inherit ? "6dfb4578-326e-4af8-9db9-a8c2310ab1da" : undefined)
                expect(seen.at(-1)?.sessionID).toBe(child.sessionID)
                expect(child.sessionID === parent.id).toBe(mode === "subagent")
              }
            }
          }).pipe(RunApproval.own("6dfb4578-326e-4af8-9db9-a8c2310ab1da"))
          expect(seen).toHaveLength(4)
        } finally {
          off()
        }
      }),
      { git: true, config: (url) => ({ ...providerCfg(url), permission: { bash: "ask" } }) },
    ),
  15_000,
)

it.live("run approval does not authorize an unrelated user queued into its admitted runner", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ dir, llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const permission = yield* Permission.Service
      const bus = yield* Bus.Service
      const chat = yield* sessions.create({
        title: "Unrelated queued input",
        permission: [{ permission: "bash", pattern: "*", action: "ask" }],
      })
      const asked = yield* Deferred.make<Permission.Request>()
      const off = yield* bus.subscribeCallback(Permission.Event.Asked, (event) => {
        Effect.runFork(Deferred.succeed(asked, event.properties))
      })
      const release = defer<void>()
      try {
        yield* llm.hold("first run complete", release.promise)
        yield* llm.tool("bash", {
          command: bunEval("require(`node:fs`).writeFileSync(`queued-result.txt`, `queued\\n`)"),
          description: "Unrelated queued work",
        })
        yield* llm.text("queued work complete")
        const completion = yield* prompt.startPrompt({
          sessionID: chat.id,
          runID: "6dfb4578-326e-4af8-9db9-a8c2310ab1da",
          model: ref,
          parts: [{ type: "text", text: "first user" }],
        })
        yield* llm.wait(1)
        yield* prompt.prompt({
          sessionID: chat.id,
          model: ref,
          noReply: true,
          parts: [{ type: "text", text: "different client queued user" }],
        })
        release.resolve()
        const request = yield* Deferred.await(asked)
        expect(request.runID).toBeUndefined()
        yield* Effect.sleep("20 millis")
        expect((yield* permission.list()).some((pending) => pending.id === request.id)).toBe(true)
        expect(yield* Effect.promise(() => Bun.file(path.join(dir, "queued-result.txt")).exists())).toBe(false)
        yield* permission.reply({ requestID: request.id, reply: "once" })
        yield* completion
        expect(yield* Effect.promise(() => Bun.file(path.join(dir, "queued-result.txt")).text())).toBe("queued\n")
      } finally {
        release.resolve()
        off()
      }
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("run approval reaches processor doom-loop asks without tool ownership metadata", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const permission = yield* Permission.Service
      const bus = yield* Bus.Service
      const chat = yield* sessions.create({ title: "Doom loop ownership" })
      const seen: Permission.Request[] = []
      const off = yield* bus.subscribeCallback(Permission.Event.Asked, (event) => {
        seen.push(event.properties)
        Effect.runFork(permission.reply({ requestID: event.properties.id, reply: "once" }))
      })
      try {
        const input = { command: "echo repeated", description: "Repeated tool" }
        yield* llm.push({
          type: "sse",
          head: [
            {
              choices: [
                {
                  delta: {
                    role: "assistant",
                    tool_calls: [0, 1, 2].map((index) => ({
                      index,
                      id: `repeat_${index}`,
                      type: "function",
                      function: { name: "bash", arguments: JSON.stringify(input) },
                    })),
                  },
                },
              ],
            },
          ],
          tail: [{ choices: [{ delta: {}, finish_reason: "tool_calls" }] }],
        })
        yield* llm.text("done")
        yield* yield* prompt.startPrompt({
          sessionID: chat.id,
          model: ref,
          runID: "6dfb4578-326e-4af8-9db9-a8c2310ab1da",
          parts: [{ type: "text", text: "three repeated tools" }],
        })
        const request = seen.find((request) => request.permission === "doom_loop")
        expect(request).toBeDefined()
        expect(request?.tool).toBeUndefined()
        expect(request?.runID).toBe("6dfb4578-326e-4af8-9db9-a8c2310ab1da")
      } finally {
        off()
      }
    }),
    { git: true, config: (url) => ({ ...providerCfg(url), permission: { bash: "allow", doom_loop: "ask" } }) },
  ),
)

for (const mode of ["matching", "changed", "legacy", "legacy-json"] as const) {
  itActor.live(
    `frozen native Actor shell contract ${mode} cannot borrow a live enum`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const actors = yield* Effect.serviceOption(Actor.Service)
          if (actors._tag === "None") throw new Error("real Actor service was not provided")
          const model = { providerID: ref.providerID, modelID: ModelID.make("gpt-5-test") }
          const parent = yield* sessions.create({
            title: "Frozen native Actor",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          yield* prompt.prompt({
            sessionID: parent.id,
            model,
            noReply: true,
            parts: [{ type: "text", text: "capture Actor native contract" }],
          })
          const capture = prefixCaptureRef.current
          if (!capture) throw new Error("prefix capture unavailable")
          const messages = yield* sessions.messages({ sessionID: parent.id })
          const prefix = yield* capture({
            sessionID: parent.id,
            agentName: "build",
            providerID: model.providerID,
            modelID: model.modelID,
            msgs: messages,
          })
          const snapshot = yield* Effect.promise(() =>
            SessionPrefixSnapshot.snapshotTools(prefix.tools, [...(prefix.activeTools ?? Object.keys(prefix.tools))]),
          )
          const actorSnapshot = snapshot.find((item) => item.name === "actor")
          if (!actorSnapshot?.native_input_schema) throw new Error("missing captured native Actor schema")
          expect(actorSnapshot.input_schema.properties).toHaveProperty(mode === "legacy-json" ? "operation" : "script")
          expect(JSON.stringify(actorSnapshot.native_input_schema)).toContain('"general"')
          if (mode === "changed")
            actorSnapshot.native_input_schema = JSON.parse(
              JSON.stringify(actorSnapshot.native_input_schema).replaceAll('"general"', '"retired-agent"'),
            )
          if (mode.startsWith("legacy")) delete actorSnapshot.native_input_schema
          const tools = SessionPrefixSnapshot.restoreTools(JSON.parse(JSON.stringify(snapshot)))
          const marker = `native-frozen-${mode}`
          yield* llm.tool("exec", {
            code: `return await tools.actor({operation:{action:"send",to_actor_id:"main",content:${JSON.stringify(marker)}}})`,
          })
          yield* llm.text("done")
          const spawned = yield* actors.value.spawn({
            mode: "subagent",
            sessionID: parent.id,
            agentType: "build",
            task: "send parent update",
            context: "full",
            tools: ["actor"],
            background: false,
            model,
            forkContext: { ...prefix, tools, model, watermarkMsgID: messages.at(-1)!.info.id },
          })
          expect((yield* Deferred.await(spawned.outcome)).status).toBe("success")
          const turns = yield* llm.inputs
          expect(turns.length).toBeGreaterThanOrEqual(2)
          expect(JSON.stringify(turns[0].tools)).not.toContain("nativeInputSchema")
          const parts = (yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })).flatMap(
            (message) => message.parts,
          )
          const exec = parts.find((part) => part.type === "tool" && part.tool === "exec")
          if (exec?.type !== "tool" || exec.state.status !== "completed") throw new Error("missing settled exec")
          if (mode === "matching" || mode === "legacy-json") {
            expect(exec.state.metadata.status).toBe("completed")
            expect(exec.state.output).toContain("inboxID")
            const nested = viewExecSubtools(exec.state.metadata)
            expect(nested).toHaveLength(1)
            expect(nested[0].state.status).toBe("completed")
            expect(nested[0].state.input).toEqual({
              operation: { action: "send", to_actor_id: "main", content: marker },
            })
            expect(nested[0].state.metadata).toMatchObject({ receiver_actor_id: "main" })
          } else expect(exec.state.metadata).toMatchObject({ rejected: true, reason: "tool-whitelist" })
        }),
        {
          git: true,
          config: (url) => ({
            ...providerCfg(url),
            tool: { invocation_style_by_tool: { actor: mode === "legacy-json" ? "json" : "shell" } },
          }),
        },
      ),
    15000,
  )
}

postInsertAdmissionMcpIt.live(
  "auto-compaction deletes an inserted continuation after a later MCP admission commits",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const compaction = yield* SessionCompaction.Service
        const chat = yield* sessions.create({ title: "Post-insert compaction admission" })
        yield* seed(chat.id, { finish: "stop" })
        yield* compaction.create({ sessionID: chat.id, agent: "build", model: ref, auto: true })

        const gate = {
          armed: true,
          entered: yield* Deferred.make<void>(),
          release: yield* Deferred.make<void>(),
        }
        compactionAutoContinueGate = gate
        const resource = concurrentAdmissionControls["mcp://post-insert"]
        yield* Effect.addFinalizer(() =>
          Deferred.succeed(gate.release, undefined).pipe(Effect.andThen(Effect.sync(() => resource.release.resolve()))),
        )
        yield* llm.text("post-insert summary")
        const compacting = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* Deferred.await(gate.entered).pipe(Effect.timeout("10 seconds"))

        const directMessageID = MessageID.ascending()
        const direct = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: directMessageID,
            agent: "build",
            model: ref,
            noReply: true,
            parts: [
              {
                type: "file",
                url: "mcp://post-insert",
                filename: "post-insert.txt",
                mime: "text/plain",
                source: {
                  type: "resource",
                  clientName: "test-client",
                  uri: "mcp://post-insert",
                  text: { value: "post-insert.txt", start: 0, end: 15 },
                },
              },
            ],
          })
          .pipe(Effect.forkChild)
        yield* Effect.promise(() => resource.started.promise).pipe(Effect.timeout("10 seconds"))
        yield* llm.text("post-insert request handled")
        yield* Deferred.succeed(gate.release, undefined)

        const continuation = yield* Effect.gen(function* () {
          while (true) {
            const hooks = (yield* sessions.messages({ sessionID: chat.id })).filter(
              (message) =>
                message.info.role === "user" &&
                message.info.source === "hook" &&
                !message.parts.some((part) => part.type === "compaction"),
            )
            if (hooks.length > 0) {
              expect(hooks).toHaveLength(1)
              return hooks[0]
            }
            yield* Effect.sleep(10)
          }
        }).pipe(Effect.timeout("10 seconds"))
        expect(continuation.parts.some((part) => part.type === "text" && part.metadata?.compaction_continue)).toBe(true)
        expect(MessageV2.parts(continuation.info.id)).toHaveLength(1)
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).some((message) => message.info.id === directMessageID),
        ).toBe(false)
        expect(compacting.pollUnsafe()).toBeUndefined()
        expect(yield* llm.calls).toBe(1)

        resource.release.resolve()
        yield* Fiber.join(direct).pipe(Effect.timeout("10 seconds"))
        const result = yield* Fiber.join(compacting).pipe(Effect.timeout("10 seconds"))
        const messages = yield* sessions.messages({ sessionID: chat.id })
        expect(messages.some((message) => message.info.id === continuation.info.id)).toBe(false)
        expect(MessageV2.parts(continuation.info.id)).toHaveLength(0)
        expect(messages.filter((message) => message.info.role === "user").at(-1)?.info.id).toBe(directMessageID)
        expect(result.parts.some((part) => part.type === "text" && part.text === "post-insert request handled")).toBe(
          true,
        )
        expect(yield* llm.calls).toBe(2)
        const input = JSON.stringify((yield* llm.inputs).at(-1)?.messages)
        expect(input).toContain("admitted mcp://post-insert")
        expect(input).not.toContain("Continue if you have next steps, or stop and ask for clarification")
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

concurrentAdmissionMcpIt.live(
  "interrupting a pending MCP admission releases compaction and the next compaction",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const compaction = yield* SessionCompaction.Service
        const chat = yield* sessions.create({ title: "Cancelled compaction admission" })
        yield* seed(chat.id, { finish: "stop" })
        yield* compaction.create({ sessionID: chat.id, agent: "build", model: ref, auto: true })

        const releaseSummary = defer<void>()
        const resource = concurrentAdmissionControls["mcp://cancelled-admission"]
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            releaseSummary.resolve()
            resource.release.resolve()
          }),
        )
        yield* llm.hold("cancelled admission summary", releaseSummary.promise)
        const compacting = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
        yield* llm.wait(1).pipe(Effect.timeout("10 seconds"))

        const directMessageID = MessageID.ascending()
        const direct = yield* prompt
          .prompt({
            sessionID: chat.id,
            messageID: directMessageID,
            agent: "build",
            model: ref,
            noReply: true,
            parts: [
              {
                type: "file",
                url: "mcp://cancelled-admission",
                filename: "cancelled-admission.txt",
                mime: "text/plain",
                source: {
                  type: "resource",
                  clientName: "test-client",
                  uri: "mcp://cancelled-admission",
                  text: { value: "cancelled-admission.txt", start: 0, end: 23 },
                },
              },
            ],
          })
          .pipe(Effect.forkChild)
        yield* Effect.promise(() => resource.started.promise).pipe(Effect.timeout("10 seconds"))
        yield* llm.text("continued after cancelled admission")
        releaseSummary.resolve()
        yield* Effect.gen(function* () {
          while (true) {
            const boundary = (yield* sessions.messages({ sessionID: chat.id })).find((message) =>
              message.parts.some((part) => part.type === "compaction" && part.projection),
            )
            if (boundary) return
            yield* Effect.sleep(10)
          }
        }).pipe(Effect.timeout("10 seconds"))
        expect(compacting.pollUnsafe()).toBeUndefined()
        expect(yield* llm.calls).toBe(1)
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).filter(
            (message) =>
              message.info.role === "user" &&
              message.info.source === "hook" &&
              !message.parts.some((part) => part.type === "compaction"),
          ),
        ).toHaveLength(0)

        yield* Fiber.interrupt(direct).pipe(Effect.timeout("10 seconds"))
        const interrupted = yield* Fiber.await(direct)
        expect(Exit.isFailure(interrupted) && Cause.hasInterruptsOnly(interrupted.cause)).toBe(true)
        const result = yield* Fiber.join(compacting).pipe(Effect.timeout("10 seconds"))
        expect(
          result.parts.some((part) => part.type === "text" && part.text === "continued after cancelled admission"),
        ).toBe(true)
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).some((message) => message.info.id === directMessageID),
        ).toBe(false)
        expect(MessageV2.parts(directMessageID)).toHaveLength(0)

        // Keep the cancelled resource unresolved through another compaction;
        // only the fixture finalizer releases it after both runs complete.
        yield* compaction.create({ sessionID: chat.id, agent: "build", model: ref, auto: true })
        yield* llm.text("second cancelled admission summary")
        yield* llm.text("second compaction continued")
        const next = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.timeout("10 seconds"))
        expect(next.parts.some((part) => part.type === "text" && part.text === "second compaction continued")).toBe(
          true,
        )
        expect(yield* llm.calls).toBe(4)
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).some((message) => message.info.id === directMessageID),
        ).toBe(false)
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)

it.live("prompt retries without part IDs preserve the receipt and reject changed content or order", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Anonymous prompt retry" })
      const input = {
        sessionID: chat.id,
        messageID: MessageID.ascending(),
        agent: "build",
        model: ref,
        noReply: true,
        parts: [
          { type: "text" as const, text: "first" },
          { type: "text" as const, text: "second" },
        ],
      }
      const first = yield* prompt.prompt(input)
      const retry = yield* prompt.prompt(input)
      expect(retry).toEqual(first)
      expect(yield* sessions.messages({ sessionID: chat.id })).toHaveLength(1)
      expect(MessageV2.parts(first.info.id)).toEqual(first.parts)
      if (first.info.role !== "user") throw new Error("Expected committed user receipt")
      const strict = yield* sessions
        .commitUserMessage(
          first.info,
          first.parts.map((part) => ({ ...part, id: PartID.ascending() })),
        )
        .pipe(Effect.exit)
      expect(Exit.isFailure(strict) && Cause.pretty(strict.cause)).toContain("different content")
      for (const parts of [
        [{ type: "text" as const, text: "changed" }, input.parts[1]],
        [...input.parts].reverse(),
        [{ ...input.parts[0], metadata: { changed: true } }, input.parts[1]],
      ]) {
        const result = yield* prompt.prompt({ ...input, parts }).pipe(Effect.exit)
        expect(Exit.isFailure(result) && Cause.pretty(result.cause)).toContain("different content")
        expect(MessageV2.parts(first.info.id)).toEqual(first.parts)
      }
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("prompt retries preserve mixed explicit part identities and reject cross-message ownership", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Mixed prompt identities" })
      const input = {
        sessionID: chat.id,
        messageID: MessageID.ascending(),
        agent: "build",
        model: ref,
        noReply: true,
        parts: [
          { type: "text" as const, id: PartID.make("prt_zz-explicit"), text: "explicit high" },
          { type: "text" as const, text: "anonymous first" },
          { type: "text" as const, id: PartID.make("prt_00-explicit"), text: "explicit low" },
          { type: "text" as const, text: "anonymous second" },
        ],
      }
      const first = yield* prompt.prompt(input)
      const retry = yield* prompt.prompt(input)
      expect(retry).toEqual(first)
      expect(retry.parts.filter((part) => part.id === "prt_zz-explicit" || part.id === "prt_00-explicit")).toHaveLength(
        2,
      )
      const changedID = yield* prompt
        .prompt({
          ...input,
          parts: [{ ...input.parts[0], id: PartID.ascending() }, ...input.parts.slice(1)],
        })
        .pipe(Effect.exit)
      expect(Exit.isFailure(changedID) && Cause.pretty(changedID.cause)).toContain("different content")
      const stolen = yield* prompt.prompt({ ...input, messageID: MessageID.ascending() }).pipe(Effect.exit)
      expect(Exit.isFailure(stolen) && Cause.pretty(stolen.cause)).toContain(
        "Part ID already belongs to another message",
      )
      const otherActor = yield* prompt.prompt({ ...input, agentID: "other-actor" }).pipe(Effect.exit)
      expect(Exit.isFailure(otherActor) && Cause.pretty(otherActor.cause)).toContain("another actor")
      expect(yield* sessions.messages({ sessionID: chat.id, agentID: "*" })).toHaveLength(1)
      expect(MessageV2.parts(first.info.id)).toEqual(first.parts)
    }),
    { git: true, config: providerCfg },
  ),
)

taskMetadataIt.live("concurrent prompt retries without part IDs share one atomic receipt", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create()
      yield* llm.tool("StructuredOutput", { title: "One committed title" })
      const gate = {
        arrivals: 0,
        entered: yield* Deferred.make<void>(),
        release: yield* Deferred.make<void>(),
      }
      userMessageCommitGate = gate
      yield* Effect.addFinalizer(() => Deferred.succeed(gate.release, undefined))
      const input = {
        sessionID: chat.id,
        messageID: MessageID.ascending(),
        agent: "build",
        model: ref,
        noReply: true,
        parts: [
          { type: "text" as const, text: "same first" },
          { type: "text" as const, text: "same second" },
        ],
      }
      const attempts = yield* Effect.all([prompt.prompt(input), prompt.prompt(input)], { concurrency: 2 }).pipe(
        Effect.forkChild,
      )
      yield* Deferred.await(gate.entered).pipe(Effect.timeout("5 seconds"))
      expect(gate.arrivals).toBe(2)
      expect(yield* sessions.messages({ sessionID: chat.id })).toHaveLength(0)
      yield* Deferred.succeed(gate.release, undefined)
      const receipts = yield* Fiber.join(attempts).pipe(Effect.timeout("5 seconds"))
      expect(receipts[1]).toEqual(receipts[0])
      expect(yield* sessions.messages({ sessionID: chat.id })).toHaveLength(1)
      expect(MessageV2.parts(input.messageID)).toEqual(receipts[0].parts)
      expect(receipts[0].parts).toHaveLength(2)
      const titled = yield* Effect.gen(function* () {
        while (true) {
          const current = yield* sessions.get(chat.id)
          if (current.titleSource === "generated") return current
          yield* Effect.sleep(10)
        }
      }).pipe(Effect.timeout("5 seconds"))
      expect(titled.title).toBe("One committed title")
      expect(titled.titleRevision).toBe(2)
      expect(yield* llm.calls).toBe(1)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("prompt retries keep rejecting stored runtime additions", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Runtime-mutated prompt" })
      const input = {
        sessionID: chat.id,
        messageID: MessageID.ascending(),
        agent: "build",
        model: ref,
        noReply: true,
        parts: [{ type: "text" as const, text: "original user request" }],
      }
      const first = yield* prompt.prompt(input)
      // Loop-streak recovery appends an ignored synthetic part to the original
      // user. Anonymous ID reuse must not silently erase that persisted state.
      const added = yield* sessions.updatePart({
        id: PartID.ascending(),
        messageID: input.messageID,
        sessionID: chat.id,
        type: "text",
        text: "",
        ignored: true,
        synthetic: true,
        metadata: {
          origin: { kind: "loop_streak_crop", fromId: "msg_from", toId: "msg_to", key: "tool", truncated: false },
        },
      })
      const retry = yield* prompt.prompt(input).pipe(Effect.exit)
      expect(Exit.isFailure(retry) && Cause.pretty(retry.cause)).toContain("different content")
      expect(MessageV2.parts(input.messageID)).toEqual([...first.parts, added])
      expect(yield* sessions.messages({ sessionID: chat.id })).toHaveLength(1)
    }),
    { git: true, config: providerCfg },
  ),
)

// [TP-SR-R21-16] user-resume: empty residue assistant → re-dispatch parent user without assistant prefill.
it.live("resume empty residue re-dispatches parent user without assistant prefill", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      const parent = yield* user(chat.id, "look for new resumes")
      const shell = yield* sessions.updateMessage({
        id: MessageID.ascending(),
        role: "assistant",
        parentID: parent.id,
        sessionID: chat.id,
        mode: "build",
        agent: "build",
        path: { cwd: "/tmp", root: "/tmp" },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        modelID: ref.modelID,
        providerID: ref.providerID,
        time: { created: Date.now() },
      })
      yield* llm.text("found 2 resumes")

      const candidates = yield* prompt.recovery({ sessionID: chat.id })
      expect(candidates.some((c) => c.kind === "assistant" && c.assistantMessageID === shell.id)).toBe(true)
      expect(
        candidates.every((c) => Object.keys(c).sort().join(",") === "assistantMessageID,created,kind,parentMessageID"),
      ).toBe(true)

      const result = yield* prompt.resume({
        sessionID: chat.id,
        assistantMessageID: shell.id,
        model: ref,
      })
      const requests = yield* llm.inputs
      expect(requests.length).toBeGreaterThan(0)
      const messages = ((requests[0]?.messages ?? []) as { role: string; content?: unknown }[]).filter(
        (m) => m.role === "user" || m.role === "assistant",
      )
      expect(messages.length).toBeGreaterThan(0)
      expect(messages[messages.length - 1]?.role).toBe("user")
      expect(JSON.stringify(requests[0]?.messages ?? [])).toContain("look for new resumes")
      expect(JSON.stringify(requests[0]?.messages ?? [])).not.toContain("Abandoned: resumed as a new assistant turn")

      const after = yield* sessions.messages({ sessionID: chat.id })
      expect(after.find((m) => m.info.id === shell.id)).toBeUndefined()
      expect(after.filter((m) => m.info.role === "user")).toHaveLength(1)
      const assistants = after.filter((m) => m.info.role === "assistant")
      expect(assistants.length).toBeGreaterThan(0)
      // success path: no stacked empty residue under parent
      expect(
        assistants.every(
          (m) =>
            m.info.role !== "assistant" ||
            m.parts.some(
              (part) =>
                (part.type === "text" && part.text.trim().length > 0) ||
                part.type === "tool" ||
                (part.type === "reasoning" && part.text.trim().length > 0),
            ) ||
            Boolean(m.info.role === "assistant" && m.info.error),
        ),
      ).toBe(true)
      expect(result.info.role).toBe("assistant")
      expect(result.parts.some((part) => part.type === "text" && part.text === "found 2 resumes")).toBe(true)
    }),
    {
      git: true,
      config: providerCfg,
    },
  ),
)

for (const failure of ["throw", "rejection", "interruption"] as const) {
  let resolutions = 0
  const failingProvider = Layer.effect(
    ProviderSvc.Service,
    Effect.gen(function* () {
      const provider = yield* ProviderSvc.Service
      return ProviderSvc.Service.of({
        ...provider,
        getLanguage: () => {
          resolutions++
          if (failure === "interruption") return Effect.interrupt
          return failure === "throw"
            ? Effect.sync(() => {
                throw new Error("test adapter unavailable")
              })
            : Effect.promise(() => Promise.reject(new Error("test adapter unavailable")))
        },
      })
    }),
  ).pipe(Layer.provide(ProviderSvc.defaultLayer))

  testEffect(makeHttp(mcp, { provider: failingProvider })).live(
    `checkpoint prefix capture soft-fails adapter ${failure}`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* () {
          yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({ title: "Pinned" })
          yield* user(chat.id, "inspect")
          const before = resolutions
          const capture = prefixCaptureRef.current!
          expect(capture).toBeDefined()
          const result = yield* Effect.exit(
            capture({
              sessionID: chat.id,
              agentName: "build",
              ...ref,
              msgs: yield* sessions.messages({ sessionID: chat.id }),
            }),
          )
          expect(resolutions).toBe(before + 1)
          if (failure === "interruption") {
            expect(Exit.isFailure(result) && Cause.hasInterrupts(result.cause)).toBe(true)
          } else {
            expect(Exit.isSuccess(result)).toBe(true)
            const empty = {
              system: [],
              tools: {},
              inheritedMessages: [],
              parentPermission: [],
              activeTools: [],
              turnContext: undefined,
              currentTurnMessages: [],
              loadedMcpTools: [],
            }
            if (Exit.isSuccess(result)) expect(result.value).toEqual(empty)
          }
          expect(yield* sessions.messages({ sessionID: chat.id })).toHaveLength(1)
        }),
        { git: true, config: providerCfg },
      ),
  )
}

// [TP-SR-R21-17][D16f] Trailing-user resume golden path against the real SessionPrompt/LLM boundary.
describe("trailing-user resume integration", () => {
  const waitIdle = Effect.fn("waitIdle")(function* (sessionID: SessionID) {
    const run = yield* SessionRunState.Service
    yield* Effect.gen(function* () {
      while (true) {
        const exit = yield* run.assertNotBusy(sessionID, "main").pipe(Effect.exit)
        if (Exit.isSuccess(exit)) return
        expect(Cause.squash(exit.cause)).toBeInstanceOf(Session.BusyError)
        yield* Effect.sleep("10 millis")
      }
    }).pipe(Effect.timeout("10 seconds"))
  })

  const seedTail = Effect.fn("seedTail")(function* (
    sessionID: SessionID,
    root: string,
    opts: { noReply?: boolean; synthetic?: boolean; withCompletedTool?: boolean; text?: string },
  ) {
    const sessions = yield* Session.Service
    const user1 = yield* sessions.updateMessage({
      id: MessageID.ascending(),
      role: "user",
      sessionID,
      agent: "build",
      model: ref,
      time: { created: Date.now() },
    })
    yield* sessions.updatePart({
      id: PartID.ascending(),
      messageID: user1.id,
      sessionID,
      type: "text",
      text: "run a tool",
    })
    if (opts.withCompletedTool !== false) {
      const assistant = yield* sessions.updateMessage({
        id: MessageID.ascending(),
        role: "assistant",
        parentID: user1.id,
        sessionID,
        mode: "build",
        agent: "build",
        path: { cwd: root, root },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        modelID: ref.modelID,
        providerID: ref.providerID,
        time: { created: Date.now(), completed: Date.now() },
        finish: "tool-calls",
      } as Parameters<typeof sessions.updateMessage>[0])
      yield* sessions.updatePart({
        id: PartID.ascending(),
        messageID: assistant.id,
        sessionID,
        type: "tool",
        callID: "call_done",
        tool: "bash",
        state: {
          status: "completed",
          input: { command: "echo ok" },
          output: "ok",
          title: "echo ok",
          metadata: {},
          time: { start: Date.now(), end: Date.now() },
        },
      })
    }
    const user2 = yield* sessions.updateMessage({
      id: MessageID.ascending(),
      role: "user",
      sessionID,
      agent: "build",
      model: ref,
      time: { created: Date.now() + 1 },
      ...(opts.noReply ? { noReply: true } : {}),
    })
    yield* sessions.updatePart({
      id: PartID.ascending(),
      messageID: user2.id,
      sessionID,
      type: "text",
      text: opts.text ?? (opts.synthetic ? "<actor-notification>subagent failed</actor-notification>" : "continue please"),
      ...(opts.synthetic ? { synthetic: true } : {}),
    })
    return { user1, user2 }
  })

  it.live("resume from trailing user produces new assistant parented to that user; no new user; tools not re-run", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm, dir }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({
          title: "trailing-user",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const { user1, user2 } = yield* seedTail(chat.id, dir, { synthetic: true })
        const before = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const usersBefore = before.filter((m) => m.info.role === "user").map((m) => m.info.id)
        const candidates = yield* prompt.recovery({ sessionID: chat.id, agentID: "main" })
        expect(candidates).toEqual([
          { kind: "parent-user", userMessageID: user2.id, created: user2.time.created },
        ])
        yield* llm.text("RESUMED_FROM_TRAILING_USER")
        yield* prompt.resumeBackground({
          sessionID: chat.id,
          userMessageID: user2.id,
          agentID: "main",
          model: ref,
        })
        yield* llm.wait(1)
        yield* waitIdle(chat.id)
        const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const usersAfter = after.filter((m) => m.info.role === "user").map((m) => m.info.id)
        expect(usersAfter).toEqual(usersBefore)
        expect(usersAfter).toEqual([user1.id, user2.id])
        const newAssistants = after.filter(
          (m) => m.info.role === "assistant" && m.info.parentID === user2.id,
        )
        expect(newAssistants.length).toBe(1)
        const textParts = newAssistants[0]!.parts.filter((p) => p.type === "text")
        expect(textParts.some((p) => p.type === "text" && p.text.includes("RESUMED_FROM_TRAILING_USER"))).toBe(true)
        // one model call for the resumed turn only
        expect(yield* llm.calls).toBe(1)
        // completed tool callID must not be re-executed (no new tool parts)
        const toolParts = after.flatMap((m) => m.parts).filter((p) => p.type === "tool")
        expect(toolParts.filter((p) => p.type === "tool" && p.callID === "call_done")).toHaveLength(1)
      }),
      { git: true, config: providerCfg },
    ),
    15_000,
  )

  for (const opts of [
    { name: "manual", synthetic: false, text: "MANUAL_ORIGINAL_USER" },
    { name: "synthetic", synthetic: true, text: "SYNTHETIC_ORIGINAL_USER" },
    { name: "notification", synthetic: true, text: "<actor-notification>NOTIFICATION_ORIGINAL_USER</actor-notification>" },
    { name: "noReply", noReply: true, synthetic: false, text: "NO_REPLY_ORIGINAL_USER" },
  ]) {
    // [TP-SR-R21-17] Execute each source, not just its candidate-list projection.
    it.live(`${opts.name} trailing user executes from the original context without replaying tools`, () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: `tail-${opts.name}`,
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user1, user2 } = yield* seedTail(chat.id, dir, opts)
          const before = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          expect(yield* prompt.recovery({ sessionID: chat.id, agentID: "main" })).toEqual([
            { kind: "parent-user", userMessageID: user2.id, created: user2.time.created },
          ])
          expect(yield* llm.calls).toBe(0)
          yield* llm.text(`RESUMED_${opts.name}`)
          const result = yield* prompt.resume({ sessionID: chat.id, userMessageID: user2.id, agentID: "main", model: ref })
          expect(result.info).toMatchObject({ role: "assistant", parentID: user2.id, finish: "stop" })
          expect(result.parts.some((p) => p.type === "text" && p.text === `RESUMED_${opts.name}`)).toBe(true)
          const inputs = yield* llm.inputs
          expect(inputs).toHaveLength(1)
          const messages = inputs[0]?.messages
          if (!Array.isArray(messages)) throw new Error("model request must contain messages")
          expect(messages.at(-1)?.role).toBe("user")
          expect(JSON.stringify(messages.at(-1)?.content)).toContain(opts.text)
          const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          expect(after.filter((m) => m.info.role === "user").map((m) => m.info.id)).toEqual([user1.id, user2.id])
          expect(after.filter((m) => m.info.role === "user")).toEqual(before.filter((m) => m.info.role === "user"))
          expect(after.flatMap((m) => m.parts).filter((p) => p.type === "tool")).toEqual(
            before.flatMap((m) => m.parts).filter((p) => p.type === "tool"),
          )
          expect(yield* prompt.recovery({ sessionID: chat.id, agentID: "main" })).toEqual([])
          yield* waitIdle(chat.id)
        }),
        { git: true, config: providerCfg },
      ),
    )
  }

  // [TP-SR-R21-10] busy 时拒绝 resume 且不写旧消息；idle 后 trailing-user resume 仍可完成（并发/互斥）。
  it.live("busy session rejects resume; after idle trailing-user resume works", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm, dir }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({
          title: "busy-resume",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* seedTail(chat.id, dir, {})
        // hang the first LLM response so the runner stays busy
        yield* llm.hang
        const hanging = yield* prompt
          .prompt({
            sessionID: chat.id,
            agent: "build",
            model: ref,
            parts: [{ type: "text", text: "hang" }],
          })
          .pipe(Effect.forkChild)
        yield* llm.wait(1)
        // A real notification can arrive while the model is held. Keep a valid
        // trailing target so BusyError cannot accidentally pass as NotFoundError.
        const { user2 } = yield* seedTail(chat.id, dir, { withCompletedTool: false })
        const before = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const busyRecovery = yield* prompt.recovery({ sessionID: chat.id, agentID: "main" })
        expect(busyRecovery).toEqual([])
        const busyResume = yield* Effect.exit(
          prompt.resumeBackground({
            sessionID: chat.id,
            userMessageID: user2.id,
            agentID: "main",
            model: ref,
          }),
        )
        expect(Exit.isFailure(busyResume)).toBe(true)
        if (Exit.isFailure(busyResume)) expect(Cause.squash(busyResume.cause)).toBeInstanceOf(Session.BusyError)
        expect(yield* llm.calls).toBe(1)
        expect(yield* sessions.messages({ sessionID: chat.id, agentID: "main" })).toEqual(before)
        yield* prompt.cancel(chat.id)
        yield* Fiber.await(hanging)
        yield* waitIdle(chat.id)
        yield* llm.text("RESUMED_AFTER_BUSY")
        const result = yield* prompt.resume({ sessionID: chat.id, userMessageID: user2.id, agentID: "main", model: ref })
        expect(result.info).toMatchObject({ role: "assistant", parentID: user2.id, finish: "stop" })
        expect(result.parts.some((p) => p.type === "text" && p.text === "RESUMED_AFTER_BUSY")).toBe(true)
        expect(yield* llm.calls).toBe(2)
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("resume after a newer trailing user: old target is no longer recoverable", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm, dir }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({
          title: "stale-target",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const { user2 } = yield* seedTail(chat.id, dir, {})
        const user3 = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: chat.id,
          agent: "build",
          model: ref,
          time: { created: Date.now() + 2 },
        })
        yield* sessions.updatePart({
          id: PartID.ascending(),
          messageID: user3.id,
          sessionID: chat.id,
          type: "text",
          text: "newer question",
        })
        const candidates = yield* prompt.recovery({ sessionID: chat.id, agentID: "main" })
        expect(candidates).toEqual([
          { kind: "parent-user", userMessageID: user3.id, created: user3.time.created },
        ])
        const stale = yield* Effect.exit(
          prompt.resumeBackground({
            sessionID: chat.id,
            userMessageID: user2.id,
            agentID: "main",
            model: ref,
          }),
        )
        expect(Exit.isFailure(stale)).toBe(true)
        if (Exit.isFailure(stale)) {
          const error = Cause.squash(stale.cause)
          expect(error).toBeInstanceOf(NotFoundError)
          expect(error).toMatchObject({ data: { message: "No resumable trailing user found for message " + user2.id } })
        }
        expect(yield* llm.calls).toBe(0)
      }),
      { git: true, config: providerCfg },
    ),
  )

  /**
   * Synthetic scene (C005: no production session/message IDs):
   * - main assistant finish=tool-calls + completed + tool(actor,completed)
   * - +1ms trailing user actor-notification (synthetic quota-failure text)
   * - /recovery then returned [] → Resume 404 / button hidden; only a new user send could start.
   * [TP-SR-R21-17] Post-fix: trailing notification user is a parent-user target; resume runs from it.
   */
  it.live("synthetic scene: tool-calls+completed then actor-notification user → parent-user resume", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm, dir }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({
          title: "synthetic-trailing-notice",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const u1 = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: chat.id,
          agent: "build",
          model: ref,
          time: { created: Date.now() },
        })
        yield* sessions.updatePart({
          id: PartID.ascending(),
          messageID: u1.id,
          sessionID: chat.id,
          type: "text",
          text: "授权修改 sendCellRevision",
        })
        const a1 = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          parentID: u1.id,
          sessionID: chat.id,
          mode: "build",
          agent: "build",
          path: { cwd: dir, root: dir },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          modelID: ref.modelID,
          providerID: ref.providerID,
          time: { created: Date.now(), completed: Date.now() },
          finish: "tool-calls",
        } as Parameters<typeof sessions.updateMessage>[0])
        yield* sessions.updatePart({
          id: PartID.ascending(),
          messageID: a1.id,
          sessionID: chat.id,
          type: "tool",
          callID: "call_actor_send",
          tool: "actor",
          state: {
            status: "completed",
            input: { operation: { action: "send", to_actor_id: "general-15", content: "授权修改" } },
            output: "ok",
            title: "send general-15",
            metadata: {},
            time: { start: Date.now(), end: Date.now() },
          },
        })
        const notice = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: chat.id,
          agent: "build",
          model: ref,
          time: { created: Date.now() + 1 },
        })
        yield* sessions.updatePart({
          id: PartID.ascending(),
          messageID: notice.id,
          sessionID: chat.id,
          type: "text",
          text: "<actor-notification>Background sub-session failed. token quota is not enough</actor-notification>",
          synthetic: true,
        })

        // Pre-fix: "no later user/assistant" disqualified a1; last is user → recovery [].
        // Post-fix: notice is the only target.
        const candidates = yield* prompt.recovery({ sessionID: chat.id, agentID: "main" })
        expect(candidates).toEqual([
          { kind: "parent-user", userMessageID: notice.id, created: notice.time.created },
        ])
        expect(candidates.some((c) => c.kind === "assistant")).toBe(false)

        yield* llm.text("RESUMED_AFTER_PROD_NOTICE")
        yield* prompt.resumeBackground({
          sessionID: chat.id,
          userMessageID: notice.id,
          agentID: "main",
          model: ref,
        })
        yield* llm.wait(1)
        yield* waitIdle(chat.id)
        const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const users = after.filter((m) => m.info.role === "user").map((m) => m.info.id)
        expect(users).toEqual([u1.id, notice.id])
        const resumed = after.filter((m) => m.info.role === "assistant" && m.info.parentID === notice.id)
        expect(resumed).toHaveLength(1)
        expect(
          resumed[0]!.parts.some((p) => p.type === "text" && p.text.includes("RESUMED_AFTER_PROD_NOTICE")),
        ).toBe(true)
        // actor tool from the interrupted tool-loop is not re-invoked
        const actorTools = after
          .flatMap((m) => m.parts)
          .filter((p) => p.type === "tool" && p.tool === "actor")
        expect(actorTools).toHaveLength(1)
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live(
    "[R003] plan-then-admission race: newer user before work re-check → fail with zero side effects",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "r003-admission-race",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user2 } = yield* seedTail(chat.id, dir, {})
          const before = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          const toolsBefore = before.flatMap((m) => m.parts).filter((p) => p.type === "tool")
          // [C004] Deterministic plan→occupy→recheck window via shared seam.
          const barrier = resumeRaceBarrier()
          ResumeTestHooks.beforeAdmissionRecheck = barrier.hook
          yield* Effect.addFinalizer(() => Effect.sync(() => ResumeTestHooks.reset()))
          const fiber = yield* prompt
            .resumeBackground({
              sessionID: chat.id,
              userMessageID: user2.id,
              agentID: "main",
              model: ref,
            })
            .pipe(Effect.forkChild)
          yield* Effect.promise(() => barrier.reached)
          const newer = yield* sessions.updateMessage({
            id: MessageID.ascending(),
            role: "user",
            sessionID: chat.id,
            agent: "build",
            model: ref,
            time: { created: Date.now() + 9 },
          })
          yield* sessions.updatePart({
            id: PartID.ascending(),
            messageID: newer.id,
            sessionID: chat.id,
            type: "text",
            text: "newer in admission window",
          })
          barrier.release()
          const resumeExit = yield* Effect.exit(Fiber.join(fiber).pipe(Effect.timeout("5 seconds")))
          yield* Effect.sleep("200 millis")
          const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          const toolsAfter = after.flatMap((m) => m.parts).filter((p) => p.type === "tool")
          const assistantsFromUser2 = after.filter(
            (m) => m.info.role === "assistant" && "parentID" in m.info && m.info.parentID === user2.id,
          )
          const assistantsFromNewer = after.filter(
            (m) => m.info.role === "assistant" && "parentID" in m.info && m.info.parentID === newer.id,
          )
          expect(assistantsFromNewer).toHaveLength(0)
          expect(Exit.isFailure(resumeExit)).toBe(true)
          if (Exit.isFailure(resumeExit)) {
            const err = Cause.squash(resumeExit.cause)
            expect(namedErrorMessage(err)).toContain("Recovery candidate changed before settlement")
            expect(assistantsFromUser2.filter((m) => m.parts.some((p) => p.type === "text"))).toHaveLength(0)
          }
          // [C004] Full message+parts comparison, not just IDs/callIDs.
          expect(messagePartSnapshot(after.filter((m) => m.info.id !== newer.id))).toEqual(
            messagePartSnapshot(before),
          )
          expect(toolsAfter.map((p) => (p as { callID?: string }).callID)).toEqual(
            toolsBefore.map((p) => (p as { callID?: string }).callID),
          )
          expect(yield* llm.calls).toBe(0)
        }),
        { git: true, config: providerCfg },
      ),
    20_000,
  )

  it.live(
    "[R003] assistant after trailing user invalidates target (strict tail)",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "r003-later-assistant",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user2 } = yield* seedTail(chat.id, dir, {})
          const before = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          // [C004] Inject later assistant AFTER occupy so admission re-check's
          // assistant-after-parent branch is the one that rejects (not outer recovery).
          const barrier = resumeRaceBarrier()
          ResumeTestHooks.beforeAdmissionRecheck = barrier.hook
          yield* Effect.addFinalizer(() => Effect.sync(() => ResumeTestHooks.reset()))
          const fiber = yield* prompt
            .resumeBackground({
              sessionID: chat.id,
              userMessageID: user2.id,
              agentID: "main",
              model: ref,
            })
            .pipe(Effect.forkChild)
          yield* Effect.promise(() => barrier.reached)
          const laterId = MessageID.ascending()
          yield* sessions.updateMessage({
            id: laterId,
            role: "assistant",
            parentID: user2.id,
            sessionID: chat.id,
            mode: "build",
            agent: "build",
            path: { cwd: dir, root: dir },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            modelID: ref.modelID,
            providerID: ref.providerID,
            time: { created: Date.now() + 20, completed: Date.now() + 20 },
            finish: "stop",
          } as Parameters<typeof sessions.updateMessage>[0])
          barrier.release()
          const exit = yield* Effect.exit(Fiber.join(fiber).pipe(Effect.timeout("5 seconds")))
          expect(Exit.isFailure(exit)).toBe(true)
          if (Exit.isFailure(exit)) {
            expect(namedErrorMessage(Cause.squash(exit.cause))).toContain("Recovery candidate changed before settlement")
          }
          const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          expect(messagePartSnapshot(after.filter((m) => m.info.id !== laterId))).toEqual(
            messagePartSnapshot(before),
          )
          expect(yield* llm.calls).toBe(0)
        }),
        { git: true, config: providerCfg },
      ),
    15_000,
  )

  it.live(
    "[R003] admission reject does not delete later empty assistant (finalizer off reject path)",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "r003-reject-zero-side-effect",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user2 } = yield* seedTail(chat.id, dir, {})
          const before = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          // [C004] Inject empty assistant at admission window so the reject is the
          // assistant-after-parent admission branch, not outer recovery preflight.
          const barrier = resumeRaceBarrier()
          ResumeTestHooks.beforeAdmissionRecheck = barrier.hook
          yield* Effect.addFinalizer(() => Effect.sync(() => ResumeTestHooks.reset()))
          const fiber = yield* prompt
            .resumeBackground({
              sessionID: chat.id,
              userMessageID: user2.id,
              agentID: "main",
              model: ref,
            })
            .pipe(Effect.forkChild)
          yield* Effect.promise(() => barrier.reached)
          const emptyId = MessageID.ascending()
          yield* sessions.updateMessage({
            id: emptyId,
            role: "assistant",
            parentID: user2.id,
            sessionID: chat.id,
            mode: "build",
            agent: "build",
            path: { cwd: dir, root: dir },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            modelID: ref.modelID,
            providerID: ref.providerID,
            time: { created: Date.now() + 20, completed: Date.now() + 20 },
            finish: "stop",
          } as Parameters<typeof sessions.updateMessage>[0])
          barrier.release()
          const exit = yield* Effect.exit(Fiber.join(fiber).pipe(Effect.timeout("5 seconds")))
          expect(Exit.isFailure(exit)).toBe(true)
          if (Exit.isFailure(exit)) {
            expect(namedErrorMessage(Cause.squash(exit.cause))).toContain("Recovery candidate changed before settlement")
          }
          const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          // Full persisted WithParts: originals untouched; empty assistant not force-deleted.
          expect(messagePartSnapshot(after.filter((m) => m.info.id !== emptyId))).toEqual(
            messagePartSnapshot(before),
          )
          expect(after.some((m) => m.info.id === emptyId)).toBe(true)
          expect(yield* llm.calls).toBe(0)
        }),
        { git: true, config: providerCfg },
      ),
    15_000,
  )

  // [TP-SR-R21-10] 同 session 并发 resume 只有一个获得 Runner；拒绝方 BusyError 不 join。
  it.live(
    "[R003] ensure-mode resume is exclusive: concurrent call gets BusyError, does not join",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "r003-exclusive",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user2 } = yield* seedTail(chat.id, dir, {})
          yield* llm.text("EXCLUSIVE_OK")
          // [C004] Race AFTER all busy preflights (incl. planResume): first pauses
          // before exclusive occupy; second occupies; first's ensureExclusive must
          // get BusyError (not planResume preflight), and the winner must succeed.
          const beforeOccupy = resumeRaceBarrier()
          ResumeTestHooks.beforeExclusiveOccupy = beforeOccupy.hook
          const occupyHold = resumeRaceBarrier()
          ResumeTestHooks.beforeAdmissionRecheck = occupyHold.hook
          yield* Effect.addFinalizer(() => Effect.sync(() => ResumeTestHooks.reset()))
          const first = yield* prompt
            .resume({ sessionID: chat.id, userMessageID: user2.id, agentID: "main", model: ref })
            .pipe(Effect.exit, Effect.forkChild)
          yield* Effect.promise(() => beforeOccupy.reached)
          // Second start-mode resume occupies the runner while first is still pre-occupy.
          const second = yield* prompt
            .resumeBackground({ sessionID: chat.id, userMessageID: user2.id, agentID: "main", model: ref })
            .pipe(Effect.forkChild)
          yield* Effect.promise(() => occupyHold.reached)
          // First resumes into ensureExclusive against an occupied runner.
          beforeOccupy.release()
          const firstExit = yield* Fiber.join(first).pipe(Effect.timeout("5 seconds"))
          expect(Exit.isFailure(firstExit)).toBe(true)
          if (Exit.isFailure(firstExit)) {
            expect(Cause.squash(firstExit.cause)).toBeInstanceOf(Session.BusyError)
          }
          occupyHold.release()
          // resumeBackground only awaits admission; wait for the winning runLoop to finish.
          const secondExit = yield* Effect.exit(
            Fiber.join(second).pipe(Effect.timeout("5 seconds")),
          )
          expect(Exit.isSuccess(secondExit)).toBe(true)
          yield* llm.wait(1)
          yield* Effect.sleep("300 millis")
          const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          const fromUser2 = after.filter(
            (m) => m.info.role === "assistant" && "parentID" in m.info && m.info.parentID === user2.id,
          )
          // Winner actually ran once — not zero-exec, not join-duplicated.
          expect(
            fromUser2.filter((m) =>
              m.parts.some((p) => p.type === "text" && (p as { text?: string }).text?.includes("EXCLUSIVE_OK")),
            ),
          ).toHaveLength(1)
          expect(yield* llm.calls).toBe(1)
        }),
        { git: true, config: providerCfg },
      ),
    20_000,
  )

  it.live(
    "[C002] resume rejects wildcard agentID=\"*\" (read selector ≠ execution identity)",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "c002-wildcard-agent",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user2 } = yield* seedTail(chat.id, dir, {})
          const exit = yield* Effect.exit(
            prompt.resumeBackground({
              sessionID: chat.id,
              userMessageID: user2.id,
              agentID: "*",
              model: ref,
            }),
          )
          expect(Exit.isFailure(exit)).toBe(true)
          if (Exit.isFailure(exit)) {
            expect(Cause.squash(exit.cause)).toBeInstanceOf(NotFoundError)
          }
          expect(yield* llm.calls).toBe(0)
        }),
        { git: true, config: providerCfg },
      ),
    15_000,
  )

  it.live(
    "[C003] step-0 strict reject after admission does not force-delete later empty assistant",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "c003-step0-reject",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user2 } = yield* seedTail(chat.id, dir, {})
          const before = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          // [C003/C004] Deterministic stop after inbox.drain, before step-0 parent-tail lock.
          const barrier = resumeRaceBarrier()
          ResumeTestHooks.beforeStep0ParentCheck = barrier.hook
          yield* Effect.addFinalizer(() => Effect.sync(() => ResumeTestHooks.reset()))
          // ensure mode waits for full work so the step-0 reject surfaces on the caller.
          const fiber = yield* prompt
            .resume({
              sessionID: chat.id,
              userMessageID: user2.id,
              agentID: "main",
              model: ref,
            })
            .pipe(Effect.forkChild)
          yield* Effect.promise(() => barrier.reached)
          const emptyId = MessageID.ascending()
          yield* sessions.updateMessage({
            id: emptyId,
            role: "assistant",
            parentID: user2.id,
            sessionID: chat.id,
            mode: "build",
            agent: "build",
            path: { cwd: dir, root: dir },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            modelID: ref.modelID,
            providerID: ref.providerID,
            time: { created: Date.now() + 30, completed: Date.now() + 30 },
            finish: "stop",
          } as Parameters<typeof sessions.updateMessage>[0])
          const emptyPartId = PartID.ascending()
          yield* sessions.updatePart({
            id: emptyPartId,
            messageID: emptyId,
            sessionID: chat.id,
            type: "text",
            text: "",
          })
          barrier.release()
          const exit = yield* Effect.exit(Fiber.join(fiber).pipe(Effect.timeout("5 seconds")))
          // C003: target reject is the step-0 strict-tail throw, and it surfaces.
          expect(Exit.isFailure(exit)).toBe(true)
          if (Exit.isFailure(exit)) {
            expect(String(Cause.squash(exit.cause))).toContain("no longer the slice tail")
          }
          const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          // C003 contract: step-0 strict reject must not force-delete the later empty assistant.
          expect(after.some((m) => m.info.id === emptyId)).toBe(true)
          // Full message+parts snapshot: originals untouched.
          expect(messagePartSnapshot(after.filter((m) => m.info.id !== emptyId))).toEqual(
            messagePartSnapshot(before),
          )
          const empty = after.find((m) => m.info.id === emptyId)
          expect(empty?.parts.map((p) => p.id)).toEqual([emptyPartId])
          expect(empty?.parts.map((p) => (p as { text?: string }).text)).toEqual([""])
          // No model call on the step-0 reject path.
          expect(yield* llm.calls).toBe(0)
        }),
        { git: true, config: providerCfg },
      ),
    20_000,
  )

  it.live(
    "[C001] resumeBackground surfaces admission re-check failure (no false success)",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "c001-admission-handshake",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user2 } = yield* seedTail(chat.id, dir, {})
          const before = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          // [C001/C004] Deterministic stop after runner occupy, before admission re-check.
          const barrier = resumeRaceBarrier()
          ResumeTestHooks.beforeAdmissionRecheck = barrier.hook
          yield* Effect.addFinalizer(() => Effect.sync(() => ResumeTestHooks.reset()))
          const fiber = yield* prompt
            .resumeBackground({
              sessionID: chat.id,
              userMessageID: user2.id,
              agentID: "main",
              model: ref,
            })
            .pipe(Effect.forkChild)
          yield* Effect.promise(() => barrier.reached)
          const newer = yield* sessions.updateMessage({
            id: MessageID.ascending(),
            role: "user",
            sessionID: chat.id,
            agent: "build",
            model: ref,
            time: { created: Date.now() + 9 },
          })
          const newerPartId = PartID.ascending()
          yield* sessions.updatePart({
            id: newerPartId,
            messageID: newer.id,
            sessionID: chat.id,
            type: "text",
            text: "newer in C001 window",
          })
          barrier.release()
          const exit = yield* Effect.exit(Fiber.join(fiber).pipe(Effect.timeout("5 seconds")))
          // C001 contract: admission rejection is a typed failure on the caller, not void success.
          expect(Exit.isFailure(exit)).toBe(true)
          if (Exit.isFailure(exit)) {
            const err = Cause.squash(exit.cause)
            expect(err).toBeInstanceOf(NotFoundError)
            // Must be the INNER admission re-check, not outer recovery/plan NotFound.
            expect(namedErrorMessage(err)).toContain("Recovery candidate changed before settlement")
          }
          yield* Effect.sleep("200 millis")
          const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          // Zero side effects: originals fully preserved; injected user stays.
          expect(messagePartSnapshot(after.filter((m) => m.info.id !== newer.id))).toEqual(
            messagePartSnapshot(before),
          )
          expect(after.some((m) => m.info.id === newer.id)).toBe(true)
          expect(after.filter((m) => m.info.role === "assistant")).toHaveLength(
            before.filter((m) => m.info.role === "assistant").length,
          )
          expect(yield* llm.calls).toBe(0)
        }),
        { git: true, config: providerCfg },
      ),
    15_000,
  )

  // [C001] Handshake timeout must withdraw THIS execution — no late model call after failure return.
  it.live(
    "[C001] admission timeout interrupts owned work: release after failure must not LATE_EXEC",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "c001-timeout-no-late-exec",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user2 } = yield* seedTail(chat.id, dir, { withCompletedTool: false })
          const barrier = resumeRaceBarrier()
          ResumeTestHooks.beforeAdmissionRecheck = barrier.hook
          yield* Effect.addFinalizer(() => Effect.sync(() => ResumeTestHooks.reset()))
          // Hang longer than the 5s handshake bound so the waiter times out first.
          const exit = yield* Effect.exit(
            prompt.resumeBackground({
              sessionID: chat.id,
              userMessageID: user2.id,
              agentID: "main",
              model: ref,
            }),
          )
          // resumeBackground returns via timeout BEFORE we can release the barrier.
          expect(Exit.isFailure(exit)).toBe(true)
          if (Exit.isFailure(exit)) {
            const err = Cause.squash(exit.cause)
            expect(err).toBeInstanceOf(NotFoundError)
            expect(namedErrorMessage(err)).toContain("Resume admission did not complete")
          }
          // Now release the stuck admission work — it must NOT proceed to LLM.
          barrier.release()
          yield* Effect.sleep("400 millis")
          expect(yield* llm.calls).toBe(0)
          const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          // No late execution artifact after the failed handshake return.
          expect(
            after.some((m) =>
              m.parts.some((p) => p.type === "text" && (p.text ?? "").includes("LATE_EXEC")),
            ),
          ).toBe(false)
          expect(after.filter((m) => m.info.role === "assistant")).toHaveLength(0)
        }),
        { git: true, config: providerCfg },
      ),
    20_000,
  )

  // [C003] Later empty assistant after admission must not be deleted by pre-cleanup (strict path has none).
  it.live(
    "[C003] after-admission later empty assistant is preserved (no pre-clean manufacture tail)",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "c003-after-admission-window",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user2 } = yield* seedTail(chat.id, dir, {})
          const barrier = resumeRaceBarrier()
          ResumeTestHooks.afterAdmissionBeforeCleanup = barrier.hook
          yield* Effect.addFinalizer(() => Effect.sync(() => ResumeTestHooks.reset()))
          const fiber = yield* prompt
            .resumeBackground({
              sessionID: chat.id,
              userMessageID: user2.id,
              agentID: "main",
              model: ref,
            })
            .pipe(Effect.forkChild)
          yield* Effect.promise(() => barrier.reached)
          // Inject later empty completed assistant in the admission→cleanup window.
          const later = yield* sessions.updateMessage({
            id: MessageID.ascending(),
            role: "assistant",
            parentID: user2.id,
            sessionID: chat.id,
            mode: "build",
            agent: "build",
            path: { cwd: dir, root: dir },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            modelID: ref.modelID,
            providerID: ref.providerID,
            time: { created: Date.now(), completed: Date.now() },
            finish: "stop",
          } as Parameters<typeof sessions.updateMessage>[0])
          const laterId = later.id
          barrier.release()
          yield* Fiber.join(fiber).pipe(Effect.timeout("5 seconds"), Effect.exit)
          yield* Effect.sleep("200 millis")
          const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          // Later assistant must survive — strict tail then rejects or step0 refuses; never silent delete+exec.
          expect(after.some((m) => m.info.id === laterId)).toBe(true)
        }),
        { git: true, config: providerCfg },
      ),
    15_000,
  )

  it.live(
    "[R003] first assistant parents to planned user even if a newer user is written mid-turn",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm, dir }) {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const chat = yield* sessions.create({
            title: "r003-parent-lock",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const { user2 } = yield* seedTail(chat.id, dir, {})
          const gate = defer<void>()
          yield* llm.hold("LOCKED_PARENT_OK", gate.promise)
          const fiber = yield* prompt
            .resumeBackground({
              sessionID: chat.id,
              userMessageID: user2.id,
              agentID: "main",
              model: ref,
            })
            .pipe(Effect.forkChild)
          yield* llm.wait(1)
          const newer = yield* sessions.updateMessage({
            id: MessageID.ascending(),
            role: "user",
            sessionID: chat.id,
            agent: "build",
            model: ref,
            time: { created: Date.now() + 9 },
          })
          yield* sessions.updatePart({
            id: PartID.ascending(),
            messageID: newer.id,
            sessionID: chat.id,
            type: "text",
            text: "newer after plan",
          })
          gate.resolve(undefined)
          yield* Fiber.join(fiber).pipe(Effect.timeout("5 seconds"), Effect.exit)
          // wait until assistant text lands (runLoop work is forked by start)
          yield* Effect.gen(function* () {
            for (let i = 0; i < 20; i++) {
              const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
              if (after.some((m) => m.info.role === "assistant" && m.parts.some((p) => p.type === "text" && p.text.includes("LOCKED_PARENT_OK")))) {
                return
              }
              yield* Effect.sleep("100 millis")
            }
          })
          const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
          const parents = after
            .filter(
              (m) =>
                m.info.role === "assistant" &&
                "parentID" in m.info &&
                m.parts.some((p) => p.type === "text" && p.text.includes("LOCKED_PARENT_OK")),
            )
            .map((m) => (m.info as { parentID: string }).parentID)
          expect(parents).toEqual([user2.id])
          expect(parents).not.toContain(newer.id)
        }),
        { git: true, config: providerCfg },
      ),
    20_000,
  )

  it.live("concurrent double resume: BusyError or consumed-target NotFoundError; only one execution", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm, dir }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({
          title: "double-resume",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const { user2 } = yield* seedTail(chat.id, dir, {})
        const before = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const release = defer<void>()
        yield* Effect.addFinalizer(() => Effect.sync(() => release.resolve()))
        yield* llm.hold("RESUMED_ONCE", release.promise)
        yield* prompt.resumeBackground({ sessionID: chat.id, userMessageID: user2.id, agentID: "main", model: ref })
        yield* llm.wait(1)
        // Synchronous entry checks the busy runner before candidate freshness.
        const busy = yield* prompt.resume({ sessionID: chat.id, userMessageID: user2.id, agentID: "main", model: ref }).pipe(Effect.exit)
        expect(Exit.isFailure(busy)).toBe(true)
        if (Exit.isFailure(busy)) expect(Cause.squash(busy.cause)).toBeInstanceOf(Session.BusyError)
        const second = yield* Effect.exit(
          prompt.resumeBackground({
            sessionID: chat.id,
            userMessageID: user2.id,
            agentID: "main",
            model: ref,
          }),
        )
        expect(Exit.isFailure(second)).toBe(true)
        // Both entry points use the fork's exclusive runner admission before storage validation.
        if (Exit.isFailure(second)) expect(Cause.squash(second.cause)).toBeInstanceOf(Session.BusyError)
        expect(yield* llm.calls).toBe(1)
        release.resolve()
        yield* waitIdle(chat.id)
        const after = yield* sessions.messages({ sessionID: chat.id, agentID: "main" })
        const resumed = after.filter((m) => m.info.role === "assistant" && m.info.parentID === user2.id)
        expect(resumed).toHaveLength(1)
        expect(resumed[0]!.parts.some((p) => p.type === "text" && p.text === "RESUMED_ONCE")).toBe(true)
        expect(after.filter((m) => m.info.role === "user")).toEqual(before.filter((m) => m.info.role === "user"))
        expect(after.flatMap((m) => m.parts).filter((p) => p.type === "tool")).toEqual(
          before.flatMap((m) => m.parts).filter((p) => p.type === "tool"),
        )
        expect(yield* llm.calls).toBe(1)
      }),
      { git: true, config: providerCfg },
    ),
  )
})
