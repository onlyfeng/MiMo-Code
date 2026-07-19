import { Worktree } from "../../src/worktree"
import { NodeFileSystem } from "@effect/platform-node"
import { FetchHttpClient } from "effect/unstable/http"
import { afterEach, expect } from "bun:test"
import { dynamicTool, jsonSchema, type Tool as AITool } from "ai"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect"
import path from "path"
import { mkdir } from "fs/promises"
import { Agent as AgentSvc } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
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
import { provideTmpdirInstance, provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { reply, TestLLMServer } from "../lib/llm-server"
import { Inbox } from "../../src/inbox"
import { inboxServiceRef } from "../../src/inbox/inbox-ref"
import { InboxTable } from "../../src/inbox/inbox.sql"
import { Metrics } from "../../src/metrics"
import { Database } from "../../src/storage"

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

function mcpLayer(tools: () => Record<string, AITool> = () => ({}), input?: { resourceText?: string }) {
  return Layer.succeed(
    MCP.Service,
    MCP.Service.of({
      status: () => Effect.succeed({}),
      clients: () => Effect.succeed({}),
      tools: () => Effect.sync(tools),
      prompts: () => Effect.succeed({}),
      resources: () => Effect.succeed({}),
      add: () => Effect.succeed({ status: { status: "disabled" as const } }),
      connect: () => Effect.void,
      disconnect: () => Effect.void,
      getPrompt: () => Effect.succeed(undefined),
      readResource: () =>
        Effect.succeed(
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
const run = Layer.effect(
  SessionRunState.Service,
  Effect.gen(function* () {
    const state = yield* SessionRunState.Service
    return SessionRunState.Service.of({
      ...state,
      ensureRunning: (sessionID, actorID, onInterrupt, work) => {
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
                Deferred.succeed(gate.ownerExit, undefined).pipe(
                  Effect.andThen(Deferred.await(gate.releaseOwner)),
                ),
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
const itMcp = testEffect(makeHttp(mcpLayer(() => ({}), { resourceText: longMcpResourceText })))
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
      mcp_result: dynamicTool({
        description: "Return a standard MCP tool execution error",
        inputSchema: jsonSchema({ type: "object", properties: {}, additionalProperties: false }),
        execute: async () => mcpErrorResult,
      }),
      mcp_success: dynamicTool({
        description: "Return a standard structured MCP success result",
        inputSchema: jsonSchema({ type: "object", properties: {}, additionalProperties: false }),
        execute: async () => mcpSuccessResult,
      }),
    })),
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
        },
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

it.live("request preflight overflow finalizes its placeholder assistant", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const chat = yield* sessions.create({ title: "Preflight overflow" })
      // The oversized message (not the static prefix) trips preflight, so this is a
      // recoverable overflow: it finalizes a cancelled placeholder and routes to recovery.
      yield* user(chat.id, "hello " + "x".repeat(400 * 1024))

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
        expect(assistant.info.finish).toBe("cancelled")
        expect(assistant.info.error?.name).toBe("MessageAbortedError")
      }
      expect(assistant.parts).toEqual([])
    }),
    { git: true, config: recoverableOverflowCfg },
  ),
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
      const decoded = textParts.find((part) => part.type === "text" && part.text.includes("data text truncated before model injection"))

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
        command: "huge-shell",
        arguments: "",
      })

      const messages = yield* sessions.messages({ sessionID: chat.id })
      const textParts = messages.flatMap((message) => message.parts.filter((part) => part.type === "text"))
      const expanded = textParts.find(
        (part) => part.type === "text" && part.text.includes("command shell expansion truncated before model injection"),
      )

      expect(expanded).toBeDefined()
    }),
    {
      git: true,
      config: (url) => ({
        ...providerCfg(url),
        command: {
          "huge-shell": {
            template: 'Shell output:\n!`bun -e "process.stdout.write(\'x\'.repeat(60 * 1024))"`',
          },
        },
      }),
    },
  ),
)

it.live("caps skill command content before storing synthetic skill text", () =>
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
          [
            "---",
            "name: huge-skill",
            "description: Huge local skill",
            "---",
            longSkillBody,
          ].join("\n"),
        )
      })

      yield* llm.text("done")
      yield* prompt.command({
        sessionID: chat.id,
        agent: "build",
        command: "huge-skill",
        arguments: "",
      })

      const messages = yield* sessions.messages({ sessionID: chat.id })
      const textParts = messages.flatMap((message) => message.parts.filter((part) => part.type === "text"))
      const skillContent = textParts.find(
        (part) => part.type === "text" && part.text.includes("skill command content truncated before model injection"),
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
          [
            "---",
            "name: huge-mention",
            "description: Huge mentioned skill",
            "---",
            longSkillBody,
          ].join("\n"),
        )
      })

      yield* prompt.prompt({
        sessionID: chat.id,
        agent: "build",
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
        noReply: true,
        parts: [{ type: "text", text: "send the message" }],
      })
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
      const followup = JSON.stringify(requests[1])
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
      expect(requests[1]).toMatchObject({
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
        noReply: true,
        parts: [{ type: "text", text: "inspect the window" }],
      })
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

      expect(tool.state.output).toBe(
        'Window updated\n\nStructured content:\n{"changed":true,"windowID":42}',
      )
      expect(tool.state.metadata.mcp).toEqual({
        structuredContent: mcpSuccessResult.structuredContent,
        isError: false,
        _meta: mcpSuccessResult._meta,
      })
      expect(statuses).toEqual(["success"])

      const requests = yield* llm.inputs
      const followup = JSON.stringify(requests[1])
      expect(followup).toContain("Window updated")
      expect(followup).toContain('{\\"changed\\":true,\\"windowID\\":42}')
      expect(followup).not.toContain("success-meta-is-client-only")
    }),
    { git: true, config: providerCfg },
  ),
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
  3_000,
)

it.live("subagent maxMode does not write session status", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const prompt = yield* SessionPrompt.Service
      const sessions = yield* Session.Service
      const status = yield* SessionStatus.Service

      const chat = yield* sessions.create({
        title: "Subagent maxMode status",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* llm.text("candidate zero")
      yield* llm.text("candidate one")
      yield* llm.text("1")

      const result = yield* prompt.prompt({
        sessionID: chat.id,
        agent: "general",
        agentID: "general-1",
        model: ref,
        parts: [{ type: "text", text: "hello" }],
      })

      expect(result.info.role).toBe("assistant")
      expect(result.parts.some((part) => part.type === "text" && part.text === "candidate one")).toBe(true)
      expect(yield* llm.calls).toBe(3)
      expect(yield* status.get(chat.id)).toEqual({ type: "idle" })
    }),
    { git: true, config: maxModeProviderCfg },
  ),
  20_000,
)

it.live("context full subagent uses maxMode candidate judge replay path", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const actorRegistry = yield* ActorRegistry.Service
      const sessions = yield* Session.Service

      const chat = yield* sessions.create({
        title: "Fork maxMode",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      const parentMsg = yield* user(chat.id, "parent context")
      const forkCtx: Actor.ForkContext = {
        system: ["fork-system"],
        tools: {},
        inheritedMessages: [{ role: "user", content: "inherited parent context" }],
        parentPermission: [],
        watermarkMsgID: parentMsg.id,
        model: ref,
      }
      const prev = spawnRef.current
      spawnRef.current = {
        spawn: () => Effect.die("unexpected spawn in fork maxMode test"),
        cancel: () => Effect.void,
        getForkContext: (_sessionID, actorID) => Effect.succeed(actorID === "general-1" ? forkCtx : undefined),
      }
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          spawnRef.current = prev
        }),
      )
      yield* actorRegistry.register({
        sessionID: chat.id,
        actorID: "general-1",
        mode: "subagent",
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
        sessionID: chat.id,
        agent: "general",
        agentID: "general-1",
        model: ref,
        parts: [{ type: "text", text: "handle fork task" }],
      })

      expect(result.info.role).toBe("assistant")
      expect(result.parts.some((part) => part.type === "text" && part.text === "candidate one")).toBe(true)
      expect(yield* llm.calls).toBe(3)
    }),
    { git: true, config: maxModeProviderCfg },
  ),
  20_000,
)

it.live("last-step maxMode bypasses candidate path", () =>
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

it.live("maxMode skips candidates for json_schema output", () =>
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
  3_000,
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
  3_000,
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
        const reachedSecond = yield* llm.wait(2).pipe(
          Effect.as(true),
          Effect.timeoutOrElse({ duration: "5 seconds", orElse: () => Effect.succeed(false) }),
        )
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
  3_000,
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
  3_000,
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
  3_000,
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
          .shell({ sessionID: chat.id, agent: "build", command: "sleep 0.2" })
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
  3_000,
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
          .shell({ sessionID: chat.id, agent: "build", command: "sleep 0.2" })
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
  3_000,
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
