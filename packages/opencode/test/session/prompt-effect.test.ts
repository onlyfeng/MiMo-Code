import { Worktree } from "../../src/worktree"
import { NodeFileSystem } from "@effect/platform-node"
import { FetchHttpClient } from "effect/unstable/http"
import { afterEach, expect } from "bun:test"
import { dynamicTool, jsonSchema, type Tool as AITool } from "ai"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect"
import * as Stream from "effect/Stream"
import path from "path"
import { mkdir } from "fs/promises"
import { Agent as AgentSvc } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import { TuiEvent } from "../../src/cli/cmd/tui/event"
import { Command } from "../../src/command"
import { Config } from "../../src/config"
import { LSP } from "../../src/lsp"
import { MCP } from "../../src/mcp"
import { Permission } from "../../src/permission"
import { Plugin } from "../../src/plugin"
import { Provider as ProviderSvc } from "../../src/provider"
import { Env } from "../../src/env"
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
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Ripgrep } from "../../src/file/ripgrep"
import { Format } from "../../src/format"
import { Instance } from "../../src/project/instance"
import { provideTmpdirInstance, provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { reply, TestLLMServer } from "../lib/llm-server"
import { Inbox } from "../../src/inbox"
import { inboxServiceRef } from "../../src/inbox/inbox-ref"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { Metrics } from "../../src/metrics"
import { Database, eq } from "../../src/storage"
import { SessionPrefixSnapshotTable, SessionTable } from "../../src/session/session.sql"
import { prefixCaptureRef } from "../../src/session/prefix-capture-ref"
import { checkpointPath } from "../../src/session/checkpoint-paths"

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

function defer<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
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
const run = Layer.effect(
  SessionRunState.Service,
  Effect.gen(function* () {
    const state = yield* SessionRunState.Service
    return SessionRunState.Service.of({
      ...state,
      startRunning: (sessionID, actorID, onInterrupt, work) => {
        const gate = droppedStartGate
        if (!gate?.armed || gate.sessionID !== sessionID || gate.actorID !== actorID)
          return state.startRunning(sessionID, actorID, onInterrupt, work)
        gate.armed = false
        return Effect.succeed(onInterrupt)
      },
      ensureRunning: (sessionID, actorID, onInterrupt, work) => {
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
          return state.ensureRunning(sessionID, actorID, onInterrupt, work)
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
            const fiber = yield* Effect.forkChild(state.ensureRunning(sessionID, actorID, onInterrupt, work), {
              startImmediately: true,
            })
            yield* Deferred.succeed(gate.followerAttached, undefined)
            return yield* Fiber.join(fiber)
          })
        }
        return state.ensureRunning(sessionID, actorID, onInterrupt, work)
      },
    })
  }),
).pipe(Layer.provide(baseRun))
afterEach(() => {
  lateRunGate = undefined
  disposalRetryGate = undefined
  droppedStartGate = undefined
})
const infra = Layer.mergeAll(NodeFileSystem.layer, CrossSpawnSpawner.defaultLayer)
function makeHttp(mcpService = mcp, input?: { actor?: boolean }) {
  const taskRegistry = ActorRegistry.defaultLayer
  const deps = Layer.mergeAll(
    Session.defaultLayer,
    Snapshot.defaultLayer,
    LLM.defaultLayer,
    Env.defaultLayer,
    AgentSvc.defaultLayer,
    Command.defaultLayer,
    Permission.defaultLayer,
    Plugin.defaultLayer,
    Config.defaultLayer,
    ProviderSvc.defaultLayer,
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
    Layer.provide(Plugin.defaultLayer),
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

const it = testEffect(makeHttp())
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
            return { contents: [{ text: "admitted resource", uri: "mcp://admission", mimeType: "text/plain" }] } as any
          }),
      },
    ),
  ),
)
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
            limit: { context: 20_000, output: 1_000 },
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
      expect(toolNames).toEqual(expect.arrayContaining(["exec", "apply_patch", "bash"]))
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

it.live("uses the frozen system and appends the compaction prompt to the existing conversation", () =>
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
        harness: "codex",
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
      expect(compactionRequest.messages).toBeArray()
      expect(beforeRequest.messages).toBeArray()
      if (!Array.isArray(compactionRequest.messages) || !Array.isArray(beforeRequest.messages)) return
      expect(compactionRequest.messages.slice(0, beforeRequest.messages.length)).toEqual(beforeRequest.messages)
      expect((compactionRequest.tools as Array<Record<string, unknown>>).map(wireToolName)).toEqual(
        (beforeRequest.tools as Array<Record<string, unknown>>).map(wireToolName),
      )
      expect(compactionRequest.tools).toEqual(beforeRequest.tools)
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
      expect(toolNames).toEqual(expect.arrayContaining(["exec", "apply_patch", "bash"]))
      expect(toolNames.length).toBeGreaterThan(1)
      expect((yield* sessions.get(chat.id)).prompt).toEqual({
        system: marker,
        systemMode: "replace-agent",
        harness: "codex",
      })
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
  "auto-compaction does not leave a stale continuation while a direct MCP resource request is admitted",
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
                source: { type: "resource", clientName: "test-client", uri: "mcp://admission" },
              } as any,
            ],
          })
          .pipe(Effect.forkChild)
        yield* Effect.promise(() => admissionResourceStarted.promise).pipe(Effect.timeout("10 seconds"))
        expect(
          (yield* sessions.messages({ sessionID: chat.id })).some((message) => message.info.id === directMessageID),
        ).toBe(false)

        releaseSummary.resolve()
        yield* Fiber.join(compacting).pipe(Effect.timeout("10 seconds"))
        const whileResourceHeld = yield* sessions.messages({ sessionID: chat.id })
        expect(
          whileResourceHeld.filter(
            (message) =>
              message.info.role === "user" &&
              message.info.source === "hook" &&
              !message.parts.some((part) => part.type === "compaction"),
          ),
        ).toHaveLength(0)

        admissionResourceRelease.resolve()
        yield* Fiber.join(direct).pipe(Effect.timeout("10 seconds"))
        const messages = yield* sessions.messages({ sessionID: chat.id })
        const users = messages.filter(
          (message): message is MessageV2.WithParts & { info: MessageV2.User } => message.info.role === "user",
        )
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

it.live("persists the process-time compaction projection from the real snapshot and arrived tail", () =>
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
        auto: false,
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
          auto: false,
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

      const modelMessages = JSON.stringify(
        yield* MessageV2.toModelMessagesEffect(MessageV2.filterCompacted([...messages].reverse()), model),
      )
      expect(modelMessages.match(/PROCESS_SUMMARY/g)).toHaveLength(1)
      expect(modelMessages).toContain("arrived during compaction")
      expect(modelMessages).toContain("Tool result omitted during compaction: 10000 tokens")
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
        { assistantMessageID: seeded.assistant.id, parentMessageID: seeded.user.id, created: expect.any(Number) },
      ])
      const result = yield* prompt.resume({
        sessionID: chat.id,
        assistantMessageID: seeded.assistant.id,
        titleLocale: "fr-FR",
      })
      yield* llm.wait(2)
      const titleRequest = (yield* llm.inputs).find((input) =>
        JSON.stringify(input).includes("Generate a title for this conversation"),
      )
      expect(titleRequest).toBeDefined()
      expect(JSON.stringify(titleRequest)).toContain("Write the title using locale")
      expect(JSON.stringify(titleRequest)).toContain("fr-FR")

      const after = yield* sessions.messages({ sessionID: chat.id })
      expect(after.filter((message) => message.info.role === "user")).toHaveLength(1)
      expect(after.length).toBe(before.length + 1)
      expect(after.find((message) => message.info.id === seeded.assistant.id)?.info).toMatchObject(seeded.assistant)
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

it.live("a non-retryable processor error remains an explicit recovery candidate", () =>
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
        (message): message is MessageV2.WithParts & { info: MessageV2.Assistant } => message.info.role === "assistant",
      )
      expect(assistant).toBeDefined()
      if (!assistant) return
      expect(assistant.info.error?.name).toBe("APIError")
      expect(assistant.info.time.completed).toBeUndefined()
      expect(yield* prompt.recovery({ sessionID: chat.id })).toEqual([
        {
          assistantMessageID: assistant.info.id,
          parentMessageID: assistant.info.parentID,
          created: assistant.info.time.created,
        },
      ])
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
      droppedStartGate = { sessionID: chat.id, actorID: "main", armed: true }

      const exit = yield* prompt
        .startResume({ sessionID: chat.id, assistantMessageID: seeded.assistant.id })
        .pipe(Effect.timeout("1 second"), Effect.exit)

      expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true)
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
          expect(system).not.toContain("Skills available in this session:")
          expect(serialized).toContain("Authoritative skills catalog snapshot v2:")
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
          expect(snapshots[0]).toMatchObject({
            revision: 1,
            watermark_message_id: lastAssistant?.info.id,
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

          expect(Object.keys(captured.tools)).toEqual(["frozen_only"])
          expect(captured.tools.frozen_only?.description).toBe("captured before reload")
          expect(captured.loadedMcpTools).toEqual(["frozen_only"])
        }),
        { git: true, config: providerCfg },
      ),
    ),
  30_000,
)

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
            source: { type: "resource", clientName: "test-client", uri: "mcp://large" },
          } as any,
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
  ),
)

mcpIt.live(
  "MCP structuredContent is persisted and reaches the model alongside text",
  () =>
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
        expect(snapshot?.active_tools).toContain("mcp_success")
        expect(snapshot?.loaded_mcp_tools).toEqual(["mcp_success"])

        const followup = JSON.stringify(requests[2])
        expect(followup).toContain("Window updated")
        expect(followup).toContain('{\\"changed\\":true,\\"windowID\\":42}')
        expect(followup).not.toContain("success-meta-is-client-only")
      }),
      { git: true, config: providerCfg },
    ),
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
        expect(snapshot?.active_tools).toContain("mcp_tool_search")
        expect(snapshot?.active_tools).not.toContain("mcp_result")
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
    ),
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
    ),
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
      expect(tools.map(wireToolName)).toContain("mcp_tool_search")
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
  ),
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
  ),
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
  ),
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
  ),
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
  ),
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
    ),
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
        noReply: true,
        parts: [{ type: "text", text: `inspect available MCP tools ${"x".repeat(230_000)}` }],
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
  ),
)

mcpIt.live(
  "keeps the Codex prompt and tool schema for GPT models with the default harness",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const prompt = yield* SessionPrompt.Service
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "GPT Codex tools" })

        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.openai, modelID: ModelID.make("gpt-5.2") },
          harness: "default",
          noReply: true,
          parts: [{ type: "text", text: "inspect the Codex tools" }],
        })
        yield* llm.text("done")
        yield* prompt.loop({ sessionID: session.id })

        const request = (yield* llm.inputs)[0]
        const toolNames = (request.tools as Array<Record<string, unknown>>).map(wireToolName)
        expect(toolNames).toEqual(expect.arrayContaining(["exec", "apply_patch", "bash"]))
        expect(toolNames.length).toBeGreaterThan(1)
        expect(JSON.stringify(request)).toContain("You are Codex")
        expect(JSON.stringify(request)).toContain("tools.apply_patch")
      }),
      { git: true, config: gptProviderCfg },
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
  "cancel finalizes subtask tool state",
  () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const ready = defer<void>()
          const aborted = defer<void>()
          const registry = yield* ToolRegistry.Service
          const { actor } = yield* registry.named()
          const original = actor.execute
          actor.execute = (_args, ctx) =>
            Effect.callback<never>((_resume) => {
              ready.resolve()
              ctx.abort.addEventListener("abort", () => aborted.resolve(), { once: true })
              return Effect.sync(() => aborted.resolve())
            })
          yield* Effect.addFinalizer(() => Effect.sync(() => void (actor.execute = original)))

          const { prompt, chat } = yield* boot()
          const msg = yield* user(chat.id, "hello")
          yield* addSubtask(chat.id, msg.id)

          const fiber = yield* prompt.loop({ sessionID: chat.id }).pipe(Effect.forkChild)
          yield* Effect.promise(() => ready.promise)
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

        yield* prompt.cancel(chat.id)
        const [exitA, exitB] = yield* Effect.all([Fiber.await(a), Fiber.await(b)])
        expect(Exit.isSuccess(exitA)).toBe(true)
        expect(Exit.isSuccess(exitB)).toBe(true)
        if (Exit.isSuccess(exitA) && Exit.isSuccess(exitB)) {
          expect(exitA.value.info.id).toBe(exitB.value.info.id)
        }
      }),
      { git: true, config: providerCfg },
    ),
  3_000,
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
  3_000,
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
          expect(tool.state.output).toMatch(/\.\.\.output truncated\.\.\./)
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
