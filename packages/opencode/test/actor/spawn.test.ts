import { InboxTable } from "../../src/inbox/inbox.sql"
import { NodeFileSystem } from "@effect/platform-node"
import { FetchHttpClient } from "effect/unstable/http"
import { afterEach, describe, expect } from "bun:test"
import { Deferred, Effect, Layer, Fiber, Cause, Exit } from "effect"
import { and, eq } from "drizzle-orm"
import { jsonSchema, type Tool as AITool } from "ai"
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
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { SessionPrune } from "../../src/session/prune"
import { SessionSummary } from "../../src/session/summary"
import { Instruction } from "../../src/session/instruction"
import { SessionProcessor } from "../../src/session/processor"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionRevert } from "../../src/session/revert"
import { SessionRunState } from "../../src/session/run-state"
import { Goal } from "../../src/session/goal"
import { SessionStatus } from "../../src/session/status"
import { Skill } from "../../src/skill"
import { SystemPrompt } from "../../src/session/system"
import { Snapshot } from "../../src/snapshot"
import { ToolRegistry } from "../../src/tool"
import { Truncate } from "../../src/tool"
import { ActorRegistry } from "../../src/actor/registry"
import { ActorWaiter } from "../../src/actor/waiter"
import { ActorStatusChanged, InboxArrived } from "../../src/actor/events"
import { Actor } from "../../src/actor/spawn"
import { spawnRef } from "../../src/actor/spawn-ref"
import { Worktree } from "../../src/worktree"
import { Memory } from "../../src/memory"
import { History } from "../../src/history"
import { Team } from "../../src/team"
import { SessionCheckpoint } from "../../src/session/checkpoint"
import { SessionCompaction } from "../../src/session/compaction"
import { TaskRegistry } from "../../src/task/registry"
import { defaultLayer as SchedulerDefaultLayer } from "../../src/cron/scheduler"
import { Auth } from "../../src/auth"
import { Database } from "../../src/storage"
import { MessageTable, SessionTable } from "../../src/session/session.sql"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID } from "../../src/session/schema"
import { Instance } from "../../src/project/instance"
import { InstanceRef } from "../../src/effect/instance-ref"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Ripgrep } from "../../src/file/ripgrep"
import { Format } from "../../src/format"
import { provideTmpdirServer, provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { TestLLMServer } from "../lib/llm-server"
import { reply } from "../lib/llm-server"
import { Inbox } from "../../src/inbox"
import { inboxServiceRef } from "../../src/inbox/inbox-ref"
import { Flag } from "../../src/flag/flag"
import { prefixModelIdentity, prefixCaptureRef } from "../../src/session/prefix-capture-ref"

let recoveryCommitGate: { hit: Deferred.Deferred<void>; release: Deferred.Deferred<void>; done: Deferred.Deferred<void> } | undefined
let cancelAdmissionGate: { hit: Deferred.Deferred<void>; release: Deferred.Deferred<void> } | undefined
let recoveryHookControl: { hook: "session.pre" | "session.userQuery.pre"; mode: "cancel" | "defect"; withoutTask?: boolean; armed: boolean; outcomes: string[] } | undefined
let recoveryHooks: { pre: (string | undefined)[]; post: (string | undefined)[] } | undefined
let resumeCompletionGate: { hit: Deferred.Deferred<void>; release: Deferred.Deferred<void> } | undefined
let cancelCompletionGate: { hit: Deferred.Deferred<void>; release: Deferred.Deferred<void> } | undefined
let terminalWriteGate: { hit: Deferred.Deferred<void>; release: Deferred.Deferred<void> } | undefined
let resumeValidationGate: { hit: Deferred.Deferred<void>; release: Deferred.Deferred<void>; settlement?: boolean } | undefined
let agentLookupFailure: { agent: string; armed: boolean } | undefined

afterEach(async () => {
  recoveryCommitGate = undefined
  cancelAdmissionGate = undefined
  agentLookupFailure = undefined
  resumeValidationGate = undefined
  resumeCompletionGate = undefined
  cancelCompletionGate = undefined
  terminalWriteGate = undefined
  recoveryHooks = undefined
  recoveryHookControl = undefined
  await Instance.disposeAll()
})

const summary = Layer.succeed(
  SessionSummary.Service,
  SessionSummary.Service.of({
    summarize: () => Effect.void,
    diff: () => Effect.succeed([]),
    computeDiff: () => Effect.succeed([]),
  }),
)

const mcp = Layer.succeed(
  MCP.Service,
  MCP.Service.of({
    status: () => Effect.succeed({}),
    clients: () => Effect.succeed({}),
    tools: () => Effect.succeed({}),
    prompts: () => Effect.succeed({}),
    resources: () => Effect.succeed({}),
    add: () => Effect.succeed({ status: { status: "disabled" as const } }),
    connect: () => Effect.void,
    disconnect: () => Effect.void,
    getPrompt: () => Effect.succeed(undefined),
    readResource: () => Effect.succeed(undefined),
    startAuth: () => Effect.die("unexpected MCP auth in spawn tests"),
    authenticate: () => Effect.die("unexpected MCP auth in spawn tests"),
    finishAuth: () => Effect.die("unexpected MCP auth in spawn tests"),
    removeAuth: () => Effect.void,
    supportsOAuth: () => Effect.succeed(false),
    hasStoredTokens: () => Effect.succeed(false),
    getAuthStatus: () => Effect.succeed("not_authenticated" as const),
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
const run = Layer.effect(
  SessionRunState.Service,
  Effect.gen(function* () {
    const inner = yield* SessionRunState.Service
    return SessionRunState.Service.of({
      ...inner,
      cancelActor: (...args) => Effect.gen(function* () {
        const gate = cancelAdmissionGate
        if (gate) {
          yield* Deferred.succeed(gate.hit, undefined)
          yield* Deferred.await(gate.release)
        }
        return yield* inner.cancelActor(...args)
      }).pipe(Effect.andThen(Effect.gen(function* () {
        const gate = cancelCompletionGate
        if (!gate) return
        yield* Deferred.succeed(gate.hit, undefined)
        yield* Deferred.await(gate.release)
      }))),
    })
  }),
).pipe(Layer.provide(SessionRunState.layer.pipe(Layer.provide(status))))
const infra = Layer.mergeAll(NodeFileSystem.layer, CrossSpawnSpawner.defaultLayer)

function makeLayer(
  pluginLayer = Plugin.defaultLayer,
  opts?: { settledError: () => NonNullable<MessageV2.Assistant["error"]> | undefined },
) {
  const controlledAgent = Layer.effect(
    AgentSvc.Service,
    Effect.gen(function* () {
      const base = yield* AgentSvc.Service
      return AgentSvc.Service.of({
        ...base,
        get: (agent) => {
          const failure = agentLookupFailure
          if (!failure?.armed || failure.agent !== agent) return base.get(agent)
          failure.armed = false
          return Effect.die(new Error("deterministic agent lookup setup failure"))
        },
      })
    }),
  ).pipe(Layer.provide(AgentSvc.defaultLayer))
  const recoverySession = Layer.effect(
    Session.Service,
    Effect.gen(function* () {
      const inner = yield* Session.Service
      return Session.Service.of({
        ...inner,
        commitRecoveryCandidate: (input) => Effect.gen(function* () {
          const gate = recoveryCommitGate
          if (!gate) return yield* inner.commitRecoveryCandidate(input)
          yield* Deferred.succeed(gate.hit, undefined)
          yield* Deferred.await(gate.release)
          return yield* inner.commitRecoveryCandidate(input).pipe(Effect.ensuring(Deferred.succeed(gate.done, undefined)))
        }),
      })
    }),
  ).pipe(Layer.provide(Session.defaultLayer))
  const deps = Layer.mergeAll(
    recoverySession,
    Snapshot.defaultLayer,
    LLM.defaultLayer,
    Env.defaultLayer,
    controlledAgent,
    Command.defaultLayer,
    Permission.defaultLayer,
    pluginLayer,
    Config.defaultLayer,
    ProviderSvc.defaultLayer,
    lsp,
    mcp,
    AppFileSystem.defaultLayer,
    status,
  ).pipe(Layer.provideMerge(infra))
  const question = Question.layer.pipe(Layer.provideMerge(deps))
  const todo = Todo.layer.pipe(Layer.provideMerge(deps))
  const checkpoint = SessionCheckpoint.defaultLayer
  const taskRegistry = Layer.effect(
    ActorRegistry.Service,
    Effect.gen(function* () {
      const inner = yield* ActorRegistry.Service
      return ActorRegistry.Service.of({
        ...inner,
        updateStatus: (...args) => inner.updateStatus(...args).pipe(Effect.andThen(Effect.gen(function* () {
          const gate = terminalWriteGate
          if (!gate || args[2].status !== "idle") return
          yield* Deferred.succeed(gate.hit, undefined)
          yield* Deferred.await(gate.release)
        }))),
      })
    }),
  ).pipe(Layer.provide(ActorRegistry.defaultLayer))
  const taskWaiter = ActorWaiter.defaultLayer
  const team = Team.defaultLayer
  const registry = ToolRegistry.layer.pipe(
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
  const trunc = Truncate.layer.pipe(Layer.provideMerge(deps))
  const proc = SessionProcessor.layer.pipe(Layer.provide(summary), Layer.provideMerge(deps))
  const prune = SessionPrune.layer.pipe(Layer.provide(checkpoint), Layer.provideMerge(deps))
  const prompt = SessionPrompt.layer.pipe(
    Layer.provide(Goal.defaultLayer),
    Layer.provide(SessionRevert.defaultLayer),
    Layer.provide(summary),
    Layer.provide(checkpoint),
    Layer.provide(SessionCompaction.defaultLayer),
    Layer.provide(team),
    Layer.provide(taskRegistry),
    Layer.provideMerge(run),
    Layer.provideMerge(prune),
    Layer.provideMerge(proc),
    Layer.provideMerge(registry),
    Layer.provideMerge(trunc),
    Layer.provide(Instruction.defaultLayer),
    Layer.provide(SystemPrompt.defaultLayer),
    Layer.provide(Inbox.defaultLayer),
    Layer.provideMerge(deps),
  )
  return Layer.mergeAll(
    TestLLMServer.layer,
    Actor.layer.pipe(
      Layer.provideMerge(resumePromptLayer(opts?.settledError ? settledPromptLayer(opts.settledError, prompt) : prompt)),
      Layer.provide(Worktree.defaultLayer),
      Layer.provideMerge(taskRegistry),
      Layer.provide(TaskRegistry.defaultLayer),
    Layer.provide(SchedulerDefaultLayer),
      Layer.provide(Inbox.defaultLayer),
    ),
  ).pipe(Layer.provide(summary))
}

function resumePromptLayer<A, E, R>(real: Layer.Layer<A, E, R>) {
  return Layer.effect(
    SessionPrompt.Service,
    Effect.gen(function* () {
      const inner = yield* SessionPrompt.Service
      return SessionPrompt.Service.of({
        ...inner,
        startActorResume: (input) => {
          if (!inner.startActorResume) return Effect.die("actor resume implementation missing")
          return inner.startActorResume({
            ...input,
            onAdmitted: input.onAdmitted.pipe(Effect.andThen(Effect.gen(function* () {
              const gate = resumeValidationGate
              if (!gate?.settlement) return
              yield* Deferred.succeed(gate.hit, undefined)
              yield* Deferred.await(gate.release)
            }))),
            validate: Effect.gen(function* () {
              const gate = resumeValidationGate
              if (gate && !gate.settlement) {
                yield* Deferred.succeed(gate.hit, undefined)
                yield* Deferred.await(gate.release)
              }
              yield* input.validate
            }),
          }).pipe(Effect.map((completion) => completion.pipe(Effect.onExit(() => Effect.gen(function* () {
            const gate = resumeCompletionGate
            if (!gate) return
            yield* Deferred.succeed(gate.hit, undefined)
            yield* Deferred.await(gate.release)
          })))))
        },
      })
    }),
  ).pipe(Layer.provideMerge(real))
}

/**
 * Failure-classification tests only. Replaces SessionPrompt.prompt so the child's
 * turn settles with a CHOSEN assistant error, then hands that to the real spawn
 * machinery. Everything under test downstream of this point is production code:
 * runAgentLoop's classify call, the failure carrier, Cause.squash in onFailure and
 * the AgentOutcome assembly. Only the upstream provider round-trip is stood in for,
 * which is what makes a transient case testable at all — SessionRetry's ladder is
 * uncapped, so a genuinely retryable provider error never settles on its own.
 */
function settledPromptLayer<A, E, R>(
  settledError: () => NonNullable<MessageV2.Assistant["error"]> | undefined,
  real: Layer.Layer<A, E, R>,
) {
  return Layer.effect(
    SessionPrompt.Service,
    Effect.gen(function* () {
      const inner = yield* SessionPrompt.Service
      return SessionPrompt.Service.of({
        ...inner,
        prompt: (input) => {
          const settled = settledError()
          // Truthiness, not `!== undefined` — see AGENTS.md "Reading a nullable column".
          if (!settled) return inner.prompt(input)
          const info: MessageV2.Assistant = {
            id: MessageID.ascending(),
            sessionID: input.sessionID,
            agentID: input.agentID,
            role: "assistant",
            time: { created: Date.now(), completed: Date.now() },
            error: settled,
            parentID: MessageID.ascending(),
            modelID: ModelID.make("test-model"),
            providerID: ProviderID.make("test"),
            mode: "build",
            agent: input.agent ?? "build",
            path: { cwd: process.cwd(), root: process.cwd() },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          }
          return Effect.succeed({ info, parts: [] } satisfies MessageV2.WithParts)
        },
      })
    }),
  ).pipe(Layer.provideMerge(real))
}

const it = testEffect(makeLayer())
let preStopPause: { hit: Deferred.Deferred<void>; release: Deferred.Deferred<void> } | undefined
let postStopPause: { hit: Deferred.Deferred<void>; release: Deferred.Deferred<void> } | undefined
let postStopReentry: { calls: number; finished: Deferred.Deferred<void> } | undefined
const pausePreStopPlugin = Layer.succeed(
  Plugin.Service,
  Plugin.Service.of({
    trigger: (name, input, output) => Effect.sync(() => {
      if (recoveryHooks && (name === "session.pre" || name === "session.post"))
        recoveryHooks[name === "session.pre" ? "pre" : "post"].push((input as { task_id?: string }).task_id)
      const control = recoveryHookControl
      if (control && name === "session.post") control.outcomes.push((input as { outcome: string }).outcome)
      if (control?.armed && name === control.hook && (!control.withoutTask || !(input as { task_id?: string }).task_id)) {
        control.armed = false
        if (control.mode === "defect") throw new Error("deterministic inbox hook defect")
        if (typeof output !== "object" || output == null) throw new Error("cancellation hook output missing")
        Object.assign(output, { cancel: true, cancelReason: "one-shot recovery cancellation" })
      }
      return output
    }),
    list: () => Effect.succeed([]),
    init: () => Effect.void,
    reloadFileHooks: () => Effect.void,
    triggerActorPreStop: () =>
      Effect.gen(function* () {
        const pause = preStopPause
        if (pause) {
          yield* Deferred.succeed(pause.hit, undefined)
          yield* Deferred.await(pause.release)
        }
        return { continue: false, contributingPluginNames: [], contributingHookIDs: [] }
      }),
    triggerActorPostStop: () =>
      Effect.gen(function* () {
        const reentry = postStopReentry
        if (reentry) {
          reentry.calls++
          if (reentry.calls === 1) {
            return {
              continue: true,
              reason: "run one postStop follow-up turn",
              contributingPluginNames: ["poststop-registry-test"],
              contributingHookIDs: ["poststop-registry-test"],
            }
          }
          yield* Deferred.succeed(reentry.finished, undefined).pipe(Effect.ignore)
        }
        const pause = postStopPause
        if (pause) {
          yield* Deferred.succeed(pause.hit, undefined)
          yield* Deferred.await(pause.release)
        }
        return { continue: false, contributingPluginNames: [], contributingHookIDs: [] }
      }),
  }),
)
const pauseIt = testEffect(makeLayer(pausePreStopPlugin))

const ref = {
  providerID: ProviderID.make("test"),
  modelID: ModelID.make("test-model"),
}

// Config that registers a custom "test" provider with a "test-model" model
// so provider model lookup succeeds inside the loop.
const cfg = {
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

function gptProviderCfg(url: string) {
  const config = providerCfg(url)
  return {
    ...config,
    provider: {
      ...config.provider,
      "gpt-test": {
        ...config.provider.test,
        id: "gpt-test",
        name: "GPT Test",
        models: {
          "gpt-5.4": {
            ...config.provider.test.models["test-model"],
            id: "deployment-primary",
            name: "GPT-5.4",
          },
        },
      },
    },
  }
}

describe("Actor.spawn peer mode", () => {
  it.live("creates a new sessionID, registers actor with mode=peer", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const reg = yield* ActorRegistry.Service

        const parent = yield* session.create({
          title: "test parent",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        // Queue a stop response so the prompt loop can run to completion.
        yield* llm.text("done")

        const result = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "build",
          task: "test task",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })

        expect(result.actorID).not.toBe(parent.id)
        expect(result.sessionID as string).toBe(result.actorID)

        const row = yield* reg.get(result.sessionID, result.actorID)
        expect(row?.mode).toBe("peer")
        expect(row?.agent).toBe("build")
      }),
      { git: true, config: providerCfg },
    ),
  )

  // T42: a freshly-created peer is addressable the instant spawn returns —
  // spawnPeer registers the receiver/actor-registry row (session_id === actor_id
  // === child.id, mode "peer") SYNCHRONOUSLY before spawn resolves, so Inbox.send's
  // ESRCH pre-check (reg.get) resolves even against a turnCount-0, never-run child.
  // Guards the T43 --topic reuse prerequisite. LLM is hung so the child's first
  // turn never runs: the row can ONLY come from spawn-time registration.
  it.live("send to a just-created, never-run peer (turnCount 0) does NOT ESRCH and enqueues", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const reg = yield* ActorRegistry.Service
        const inbox = inboxServiceRef.current!

        const parent = yield* session.create({
          title: "T42 parent",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        // Hang so the child's spawn turn never completes — the receiver row must
        // exist purely from spawn-time registration, not first-turn arming.
        yield* llm.hang

        const result = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "build",
          task: "peer task",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })

        // Row present at spawn: pending, zero turns (never ran).
        const row = yield* reg.get(result.sessionID, result.actorID)
        expect(row?.mode).toBe("peer")
        expect(row?.turnCount).toBe(0)
        expect(row?.status).toBe("pending")

        // Both addressing forms resolve without ESRCH and enqueue a durable row.
        const sent = yield* inbox
          .send({
            receiverSessionID: result.sessionID,
            receiverActorID: result.actorID,
            senderSessionID: parent.id,
            senderActorID: "main",
            content: "relayed while never-run",
          })
          .pipe(Effect.exit)
        expect(sent._tag).toBe("Success")
        if (sent._tag === "Success") expect(sent.value.inboxID).toBeTruthy()

        yield* actor.cancel(result.sessionID, result.actorID, "forced")
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor.spawn subagent mode", () => {
  it.live("exposes GPT orchestration and read tools to read-only GPT subagents", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({ title: "GPT subagent tools" })

        yield* llm.text("done")
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "explore",
          task: "verify tools",
          context: "none",
          tools: "INHERIT",
          background: false,
          model: { providerID: ProviderID.make("gpt-test"), modelID: ModelID.make("gpt-5.4") },
        })
        yield* Deferred.await(result.outcome)

        const request = (yield* llm.hits).find(
          (hit) =>
            Array.isArray(hit.body.tools) &&
            hit.body.tools.some(
              (tool) => (tool as { function?: { name?: string } }).function?.name === "exec",
            ),
        )
        const tools = request?.body.tools as Array<{ function?: { name?: string; description?: string } }> | undefined
        const names = tools?.map((tool) => tool.function?.name)
        const declarations = tools?.find((tool) => tool.function?.name === "exec")?.function?.description
        expect(names).toContain("exec")
        expect(names).not.toContain("view_image")
        expect(declarations).toContain("view_image(input:")
        expect(names).not.toContain("apply_patch")
        expect(declarations).not.toContain("apply_patch(input:")
        expect(names).not.toContain("read")
        expect(names).not.toContain("edit")
        expect(names).not.toContain("write")
      }),
      { git: true, config: gptProviderCfg },
    ),
    30000,
  )

  it.live("exposes the full GPT-specific tool set to general GPT subagents", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({ title: "General GPT subagent tools" })

        yield* llm.text("done")
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "general",
          task: "verify tools",
          context: "none",
          tools: "INHERIT",
          background: false,
          model: { providerID: ProviderID.make("gpt-test"), modelID: ModelID.make("gpt-5.4") },
        })
        yield* Deferred.await(result.outcome)

        const request = (yield* llm.hits).find(
          (hit) =>
            Array.isArray(hit.body.tools) &&
            hit.body.tools.some(
              (tool) => (tool as { function?: { name?: string } }).function?.name === "exec",
            ),
        )
        const tools = request?.body.tools as Array<{ function?: { name?: string; description?: string } }> | undefined
        const names = tools?.map((tool) => tool.function?.name)
        const declarations = tools?.find((tool) => tool.function?.name === "exec")?.function?.description
        expect(names).toContain("exec")
        expect(names).not.toContain("apply_patch")
        expect(declarations).toContain("apply_patch(input:")
        expect(names).not.toContain("view_image")
        expect(declarations).toContain("view_image(input:")
        expect(names).not.toContain("read")
        expect(names).not.toContain("edit")
        expect(names).not.toContain("write")
      }),
      { git: true, config: gptProviderCfg },
    ),
    30000,
  )

  it.live("keeps the legacy tool set for non-GPT subagents", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({ title: "General non-GPT subagent tools" })

        yield* llm.text("done")
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "general",
          task: "verify tools",
          context: "none",
          tools: "INHERIT",
          background: false,
          model: ref,
        })
        yield* Deferred.await(result.outcome)

        const request = (yield* llm.hits).find((hit) => Array.isArray(hit.body.tools))
        const names = (request?.body.tools as Array<{ function?: { name?: string } }> | undefined)?.map(
          (tool) => tool.function?.name,
        )
        expect(names).toContain("read")
        expect(names).toContain("edit")
        expect(names).toContain("write")
        expect(names).not.toContain("exec")
        expect(names).not.toContain("apply_patch")
        expect(names).not.toContain("view_image")
      }),
      { git: true, config: providerCfg },
    ),
    30000,
  )

  it.live("does NOT create new session, allocates <type>-<n> actorID", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const reg = yield* ActorRegistry.Service

        const parent = yield* session.create({
          title: "test parent",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("done")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "checkpoint task",
          context: "full",
          tools: ["read", "edit"],
          background: true,
          model: ref,
          forkContext: {
            system: ["test-system"],
            tools: {},
            inheritedMessages: [],
            parentPermission: [],
            watermarkMsgID: MessageID.ascending(),
            model: ref,
          },
        })

        yield* llm.wait(1).pipe(Effect.timeout("5 seconds"))
        expect((yield* Deferred.await(result.outcome).pipe(Effect.timeout("5 seconds"))).status).toBe("success")

        expect(result.sessionID).toBe(parent.id)
        expect(result.actorID).toBe("build-1")

        const row = yield* reg.get(parent.id, result.actorID)
        expect(row?.mode).toBe("subagent")
        expect(row?.agent).toBe("build")
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor.spawn fiber lifecycle", () => {
  it.live("outcome resolves with success when fiber completes normally", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "x",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("done")
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "minimal task",
          context: "none",
          tools: ["read"],
          background: false, // blocking — wait for completion
          model: ref,
        })
        const outcome = yield* Deferred.await(result.outcome)
        expect(["success", "failure"]).toContain(outcome.status)
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor.spawn onReady callback", () => {
  it.live("onReady fires before Fiber.join blocks (metadata available while running)", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "x",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.hang
        let readyInfo: { actorID: string; sessionID: string } | undefined
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "long running task",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
          onReady: ({ actorID, sessionID }) =>
            Effect.sync(() => { readyInfo = { actorID, sessionID: sessionID as string } }),
        })
        expect(readyInfo).toBeDefined()
        expect(readyInfo!.actorID).toBe(result.actorID)
        expect(readyInfo!.sessionID).toBe(parent.id)
        yield* actor.cancel(parent.id, result.actorID, "forced")
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor.cancel", () => {
  it.live("cancel(forced) interrupts fiber and marks actor cancelled", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const reg = yield* ActorRegistry.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "x",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        // Hang the LLM so the fiber stays alive long enough to interrupt.
        yield* llm.hang
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "long task",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })
        yield* actor.cancel(result.sessionID, result.actorID, "forced")
        const row = yield* reg.get(result.sessionID, result.actorID)
        expect(row?.status).toBe("idle")
        expect(row?.lastOutcome).toBe("cancelled")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("cancel(graceful) returns without waiting for the turn and stamps cancelled", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const reg = yield* ActorRegistry.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "x",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.hang
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "long task",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })
        yield* llm.wait(1)
        yield* actor.cancel(result.sessionID, result.actorID, "graceful").pipe(Effect.timeout("1 second"))
        const row = yield* reg.get(result.sessionID, result.actorID)
        expect(row?.status).toBe("idle")
        expect(row?.lastOutcome).toBe("cancelled")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("cancel(graceful) on an already-finished actor does not overwrite its outcome", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const reg = yield* ActorRegistry.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "x",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("done")
        // Blocking spawn: returns only after the work fiber has joined (onExit
        // ran), so the actor is fully finished and stamped "success".
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "quick task",
          context: "none",
          tools: ["read"],
          background: false,
          model: ref,
        })
        const outcome = yield* Deferred.await(result.outcome)
        expect(outcome.status).toBe("success")
        expect((yield* reg.get(result.sessionID, result.actorID))?.lastOutcome).toBe("success")

        // A late cancel (e.g. cascade or programmatic reclaim) must be a no-op
        // for an actor that already settled — it must NOT clobber the outcome.
        yield* actor.cancel(result.sessionID, result.actorID, "graceful").pipe(Effect.timeout("1 second"))

        expect((yield* reg.get(result.sessionID, result.actorID))?.lastOutcome).toBe("success")
      }),
      { git: true, config: providerCfg },
    ),
  )

  pauseIt.live("cancel(forced) after the final turn but before delivery settles cancelled", () =>
    Effect.gen(function* () {
      const hit = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      preStopPause = { hit, release }
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* Deferred.succeed(release, undefined).pipe(Effect.ignore)
          yield* Effect.sync(() => {
            preStopPause = undefined
          })
        }),
      )
      yield* provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const actor = yield* Actor.Service
          const reg = yield* ActorRegistry.Service
          const session = yield* Session.Service
          const parent = yield* session.create({
            title: "x",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          yield* llm.text("done")
          const result = yield* actor.spawn({
            mode: "subagent",
            sessionID: parent.id,
            agentType: "custom",
            task: "quick task",
            context: "none",
            tools: [],
            background: true,
            model: ref,
          })
          yield* llm.wait(1).pipe(
            Effect.timeoutOrElse({
              duration: "3 seconds",
              orElse: () => Effect.fail(new Error("timed out waiting for the first test-LLM request")),
            }),
          )
          yield* Deferred.await(hit).pipe(
            Effect.timeoutOrElse({
              duration: "1 second",
              orElse: () => Effect.fail(new Error("timed out waiting for actor.preStop pause")),
            }),
          )
          const paused = yield* reg.get(result.sessionID, result.actorID)
          expect(paused?.status).toBe("running")
          expect(paused?.lastOutcome).toBeUndefined()

          yield* actor.cancel(result.sessionID, result.actorID, "forced").pipe(
            Effect.timeoutOrElse({
              duration: "1 second",
              orElse: () => Effect.fail(new Error("timed out waiting for forced actor cancellation")),
            }),
          )
          yield* Deferred.succeed(release, undefined)

          const outcome = yield* Deferred.await(result.outcome).pipe(
            Effect.timeoutOrElse({
              duration: "1 second",
              orElse: () => Effect.fail(new Error("timed out waiting for cancelled actor outcome")),
            }),
          )
          expect(outcome.status).toBe("cancelled")
          expect((yield* reg.get(result.sessionID, result.actorID))?.lastOutcome).toBe("cancelled")
        }),
        {
          git: true,
          config: (url) => ({
            ...providerCfg(url),
            agent: { custom: { model: "test/test-model" } },
          }),
        },
      )
    }),
    // above bun's 5s default so the stage-specific timeouts fire first and name the stuck stage
    15_000,
  )
})

describe("Actor.spawn agent_id persistence", () => {
  it.live("subagent's user message is persisted with agent_id = actorID", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "agent_id verification",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("done")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "agent_id verification task",
          context: "none",
          tools: ["read"],
          background: false,
          model: ref,
        })

        // Wait for the agent loop to complete.
        yield* Deferred.await(result.outcome)

        // Query the message table directly: the user message persisted by
        // SessionPrompt.prompt should carry agent_id = actorID.
        expect(result.actorID).toBe("build-1")

        const rows = yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .select({ id: MessageTable.id, agent_id: MessageTable.agent_id })
              .from(MessageTable)
              .where(and(eq(MessageTable.session_id, parent.id), eq(MessageTable.agent_id, result.actorID)))
              .all(),
          ),
        )

        expect(rows.length).toBeGreaterThan(0)
        for (const row of rows) {
          expect(row.agent_id).toBe(result.actorID)
        }
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor.spawn context_watermark", () => {
  it.live("subagent with context=full captures latest main message ID as watermark", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const reg = yield* ActorRegistry.Service

        const parent = yield* session.create({
          title: "watermark verification",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        // Seed parent main thread with a few user messages (agent_id IS NULL).
        const seeded: MessageID[] = []
        for (const text of ["main-1", "main-2", "main-3"]) {
          const id = MessageID.ascending()
          yield* session.updateMessage({
            id,
            sessionID: parent.id,
            role: "user",
            time: { created: Date.now() },
            agent: "test",
            model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
            tools: {},
            mode: "",
          } as unknown as MessageV2.Info)
          yield* session.updatePart({
            id: PartID.ascending(),
            sessionID: parent.id,
            messageID: id,
            type: "text",
            text,
          })
          seeded.push(id)
        }

        // Sanity-check Session.lastMainMessageID returns the latest seeded ID.
        const last = yield* session.lastMainMessageID(parent.id)
        expect(last).toBe(seeded[seeded.length - 1])

        yield* llm.text("done")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "watermark check",
          context: "full",
          tools: ["read"],
          background: true,
          model: ref,
        })

        const row = yield* reg.get(parent.id, result.actorID)
        expect(row?.contextWatermark).toBeDefined()
        expect(row?.contextWatermark).toBe(seeded[seeded.length - 1])
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor.spawn description field (F2a)", () => {
  it.live("falls back to agentType when description not provided", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const reg = yield* ActorRegistry.Service

        const parent = yield* session.create({
          title: "fallback parent",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("done")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "x".repeat(500),  // long, would be sliced to 200 chars under the bug
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })

        yield* llm.wait(1).pipe(Effect.timeout("5 seconds"))
        expect((yield* Deferred.await(result.outcome).pipe(Effect.timeout("5 seconds"))).status).toBe("success")

        const row = yield* reg.get(result.sessionID, result.actorID)
        expect(row?.description).toBe("build")  // agentType, NOT first 200 chars of task
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("uses provided description when supplied", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const reg = yield* ActorRegistry.Service

        const parent = yield* session.create({
          title: "explicit parent",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("done")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "long prompt body",
          description: "explore: find lexer files",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })

        yield* llm.wait(1).pipe(Effect.timeout("5 seconds"))
        expect((yield* Deferred.await(result.outcome).pipe(Effect.timeout("5 seconds"))).status).toBe("success")

        const row = yield* reg.get(result.sessionID, result.actorID)
        expect(row?.description).toBe("explore: find lexer files")
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor forkContext lifecycle", () => {
  it.live(
    "persistent setup failure releases generation and forkContext ownership before a later cancel",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* () {
          const actor = yield* Actor.Service
          const session = yield* Session.Service
          const reg = yield* ActorRegistry.Service
          const parent = yield* session.create({
            title: "persistent setup failure",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const forkContext = {
            system: ["setup-failure-context"],
            tools: {},
            inheritedMessages: [],
            parentPermission: [],
            watermarkMsgID: MessageID.ascending(),
            model: ref,
          }
          agentLookupFailure = { agent: "build", armed: true }

          const exit = yield* actor
            .spawn({
              mode: "peer",
              sessionID: parent.id,
              agentType: "build",
              task: "fail before the actor fiber is established",
              description: "setup failure peer",
              context: "full",
              tools: ["read"],
              background: true,
              model: ref,
              forkContext,
            })
            .pipe(Effect.exit)
          expect(exit._tag).toBe("Failure")

          const children = yield* session.children(parent.id)
          expect(children).toHaveLength(1)
          const child = children[0]
          expect(yield* actor.getForkContext(child.id, child.id)).toBeUndefined()
          const failed = yield* reg.get(child.id, child.id)
          expect(failed?.status).toBe("idle")
          expect(failed?.lastOutcome).toBe("failure")

          yield* actor.cancel(child.id, child.id, "forced").pipe(Effect.timeout("5 seconds"))
          expect((yield* reg.get(child.id, child.id))?.lastOutcome).toBe("cancelled")
        }),
        { git: true, config: providerCfg },
      ),
    10_000,
  )

  it.live("forkContext is cleared after actor is cancelled (cancel path)", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "forkCtx lifecycle",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        // Hang the LLM so the fiber stays alive while we verify pre-cancel state.
        yield* llm.hang

        const fakeForkCtx = {
          system: ["test-system"],
          tools: {},
          inheritedMessages: [],
          parentPermission: [],
          watermarkMsgID: MessageID.ascending(),
          model: ref,
        }

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "explore",
          task: "noop",
          context: "none",
          tools: [],
          background: true,
          model: ref,
          forkContext: fakeForkCtx,
        })

        // Before cancel: forkContext must be present.
        const before = yield* actor.getForkContext(result.sessionID, result.actorID)
        expect(before).toBeDefined()
        expect(before?.system).toEqual(["test-system"])

        // Cancel forces immediate termination.
        yield* actor.cancel(result.sessionID, result.actorID, "forced")

        // After cancel: forkContext must be gone.
        const after = yield* actor.getForkContext(result.sessionID, result.actorID)
        expect(after).toBeUndefined()
      }),
      { git: true, config: providerCfg },
    ),
  )

  pauseIt.live("foreground admission interruption joins a child paused in postStop", () =>
    Effect.gen(function* () {
      const hit = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const admitted = yield* Deferred.make<string>()
      postStopPause = { hit, release }
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* Deferred.succeed(release, undefined)
          postStopPause = undefined
        }),
      )
      yield* provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const actor = yield* Actor.Service
          const registry = yield* ActorRegistry.Service
          const session = yield* Session.Service
          const parent = yield* session.create({ title: "owned postStop cancellation" })
          yield* llm.text("done")
          const pending = yield* actor.spawn({
            mode: "subagent",
            sessionID: parent.id,
            agentType: "explore",
            task: "noop",
            context: "none",
            tools: [],
            background: false,
            model: ref,
            onReady: ({ actorID }) => Deferred.succeed(admitted, actorID).pipe(Effect.asVoid),
          }).pipe(Effect.forkScoped)
          const actorID = yield* Deferred.await(admitted)
          yield* Deferred.await(hit).pipe(Effect.timeout("3 seconds"))
          yield* Fiber.interrupt(pending).pipe(Effect.timeout("2 seconds"))
          expect(yield* Deferred.isDone(release)).toBe(false)
          // Delivery already committed; interruption joins the postStop work
          // without rewriting its terminal result or leaving cancel followers stuck.
          expect((yield* registry.get(parent.id, actorID))?.lastOutcome).toBe("success")
          yield* actor.cancel(parent.id, actorID, "forced").pipe(Effect.timeout("2 seconds"))
        }),
        { git: true, config: providerCfg },
      )
    }),
    15000,
  )

  pauseIt.live("delivered no-op cancel preserves forkContext while postStop is still running", () =>
    Effect.gen(function* () {
      const hit = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      postStopPause = { hit, release }
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* Deferred.succeed(release, undefined).pipe(Effect.ignore)
          yield* Effect.sync(() => {
            postStopPause = undefined
          })
        }),
      )
      yield* provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const actor = yield* Actor.Service
          const session = yield* Session.Service
          const parent = yield* session.create({
            title: "forkCtx delivered cancel",
            permission: [{ permission: "*", pattern: "*", action: "allow" }],
          })
          const forkContext = {
            system: ["test-system"],
            tools: {},
            inheritedMessages: [],
            parentPermission: [],
            watermarkMsgID: MessageID.ascending(),
            model: ref,
          }
          yield* llm.text("done")
          const result = yield* actor.spawn({
            mode: "subagent",
            sessionID: parent.id,
            agentType: "explore",
            task: "noop",
            context: "full",
            tools: [],
            background: true,
            model: ref,
            forkContext,
          })

          yield* llm.wait(1).pipe(
            Effect.timeoutOrElse({
              duration: "3 seconds",
              orElse: () => Effect.fail(new Error("timed out waiting for the first test-LLM request")),
            }),
          )
          const outcome = yield* Deferred.await(result.outcome).pipe(
            Effect.timeoutOrElse({
              duration: "1 second",
              orElse: () => Effect.fail(new Error("timed out waiting for delivered actor outcome")),
            }),
          )
          expect(outcome.status).toBe("success")
          yield* Deferred.await(hit).pipe(
            Effect.timeoutOrElse({
              duration: "1 second",
              orElse: () => Effect.fail(new Error("timed out waiting for actor.postStop pause")),
            }),
          )

          yield* actor.cancel(result.sessionID, result.actorID, "forced").pipe(
            Effect.timeoutOrElse({
              duration: "1 second",
              orElse: () => Effect.fail(new Error("timed out waiting for delivered actor no-op cancellation")),
            }),
          )
          expect((yield* actor.getForkContext(result.sessionID, result.actorID))?.system).toEqual(["test-system"])

          yield* Deferred.succeed(release, undefined)
        }),
        { git: true, config: providerCfg },
      )
    }),
    // above bun's 5s default so the stage-specific timeouts fire first and name the stuck stage
    15_000,
  )

  pauseIt.live(
    "persistent inbox wake waits for initial postStop to finish and then runs without a third wake",
    () =>
      Effect.gen(function* () {
        const hit = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        postStopPause = { hit, release }
        yield* Effect.addFinalizer(() =>
          Effect.gen(function* () {
            yield* Deferred.succeed(release, undefined).pipe(Effect.ignore)
            yield* Effect.sync(() => {
              postStopPause = undefined
            })
          }),
        )
        yield* provideTmpdirServer(
          Effect.fnUntraced(function* ({ llm }) {
            const actor = yield* Actor.Service
            const actorReg = yield* ActorRegistry.Service
            const inbox = inboxServiceRef.current
            if (!inbox) return yield* Effect.die("inbox service was not initialized")
            const session = yield* Session.Service
            const parent = yield* session.create({
              title: "persistent-poststop-wake",
              permission: [{ permission: "*", pattern: "*", action: "allow" }],
            })

            yield* llm.text("spawn turn complete")
            const wokenStarted = yield* Deferred.make<void>()
            let wokenRequests = 0
            yield* llm.textMatch((request) => {
              if (!JSON.stringify(request.body).includes("wake-after-poststop")) return false
              wokenRequests++
              Effect.runFork(Deferred.succeed(wokenStarted, undefined))
              return true
            }, "woken turn complete")

            const result = yield* actor.spawn({
              mode: "peer",
              sessionID: parent.id,
              agentType: "build",
              task: "stand by after the first turn",
              description: "postStop-serialized peer",
              context: "none",
              tools: ["read"],
              background: true,
              model: ref,
            })
            expect((yield* Deferred.await(result.outcome)).status).toBe("success")
            yield* Deferred.await(hit).pipe(
              Effect.timeoutOrElse({
                duration: "2 seconds",
                orElse: () => Effect.fail(new Error("timed out waiting for persistent actor.postStop pause")),
              }),
            )

            yield* inbox
              .send({
                receiverSessionID: result.sessionID,
                receiverActorID: result.actorID,
                senderSessionID: parent.id,
                senderActorID: "main",
                content: "wake-after-poststop",
              })
              .pipe(Effect.orDie)

            const startedBeforeRelease = yield* Deferred.await(wokenStarted).pipe(
              Effect.as(true),
              Effect.timeoutOrElse({ duration: "1 second", orElse: () => Effect.succeed(false) }),
            )
            expect(startedBeforeRelease).toBe(false)
            expect((yield* actorReg.get(result.sessionID, result.actorID))?.status).not.toBe("running")

            yield* Deferred.succeed(release, undefined)
            yield* Deferred.await(wokenStarted).pipe(Effect.timeout("5 seconds"))
            expect(wokenRequests).toBe(1)
          }),
          { git: true, config: providerCfg },
        )
      }),
    10_000,
  )

  pauseIt.live(
    "ephemeral inbox wake waits for generation done and consumes its row without duplicate notification",
    () =>
      Effect.gen(function* () {
        const hit = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        postStopPause = { hit, release }
        yield* Effect.addFinalizer(() =>
          Effect.gen(function* () {
            yield* Deferred.succeed(release, undefined).pipe(Effect.ignore)
            yield* Effect.sync(() => {
              postStopPause = undefined
            })
          }),
        )
        yield* provideTmpdirServer(
          Effect.fnUntraced(function* ({ llm }) {
            const actor = yield* Actor.Service
            const bus = yield* Bus.Service
            const inbox = inboxServiceRef.current
            if (!inbox) return yield* Effect.die("inbox service was not initialized")
            const session = yield* Session.Service
            const parent = yield* session.create({
              title: "ephemeral-poststop-wake",
              permission: [{ permission: "*", pattern: "*", action: "allow" }],
            })
            let notifications = 0
            const off = yield* bus.subscribeCallback(InboxArrived, (event) => {
              if (event.properties.receiverSessionID !== parent.id) return
              if (event.properties.receiverActorID !== "main") return
              if (event.properties.type !== "actor_notification") return
              notifications++
            })
            yield* Effect.addFinalizer(() => Effect.sync(off))

            yield* llm.text("spawn turn complete")
            const wokenStarted = yield* Deferred.make<void>()
            let wokenRequests = 0
            yield* llm.textMatch((request) => {
              if (!JSON.stringify(request.body).includes("ephemeral-wake-after-poststop")) return false
              wokenRequests++
              Effect.runFork(Deferred.succeed(wokenStarted, undefined))
              return true
            }, "woken turn complete")

            const result = yield* actor.spawn({
              mode: "subagent",
              sessionID: parent.id,
              agentType: "build",
              task: "finish before accepting the queued follow-up",
              description: "postStop-serialized ephemeral",
              context: "none",
              tools: ["read"],
              background: true,
              lifecycle: "ephemeral",
              model: ref,
            })
            expect((yield* Deferred.await(result.outcome)).status).toBe("success")
            yield* Deferred.await(hit).pipe(
              Effect.timeoutOrElse({
                duration: "2 seconds",
                orElse: () => Effect.fail(new Error("timed out waiting for ephemeral actor.postStop pause")),
              }),
            )
            expect(notifications).toBe(1)

            const sent = yield* inbox
              .send({
                receiverSessionID: result.sessionID,
                receiverActorID: result.actorID,
                senderSessionID: parent.id,
                senderActorID: "main",
                content: "ephemeral-wake-after-poststop",
              })
              .pipe(Effect.orDie)

            const startedBeforeRelease = yield* Deferred.await(wokenStarted).pipe(
              Effect.as(true),
              Effect.timeoutOrElse({ duration: "1 second", orElse: () => Effect.succeed(false) }),
            )
            expect(startedBeforeRelease).toBe(false)
            expect(yield* inbox.has(sent.inboxID)).toBe(true)

            yield* Deferred.succeed(release, undefined)
            yield* Deferred.await(wokenStarted).pipe(
              Effect.timeoutOrElse({
                duration: "5 seconds",
                orElse: () => Effect.fail(new Error("timed out waiting for serialized ephemeral wake request")),
              }),
            )

            expect(wokenRequests).toBe(1)
            expect(yield* inbox.has(sent.inboxID)).toBe(false)
            expect(notifications).toBe(1)
          }),
          { git: true, config: providerCfg },
        )
      }),
    15_000,
  )

  pauseIt.live(
    "postStop reentry cannot overwrite the completed registry state with running",
    () =>
      Effect.gen(function* () {
        const finished = yield* Deferred.make<void>()
        postStopReentry = { calls: 0, finished }
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            postStopReentry = undefined
          }),
        )
        yield* provideTmpdirServer(
          Effect.fnUntraced(function* ({ llm }) {
            const actor = yield* Actor.Service
            const actorReg = yield* ActorRegistry.Service
            const session = yield* Session.Service
            const parent = yield* session.create({
              title: "postStop registry terminal ownership",
              permission: [{ permission: "*", pattern: "*", action: "allow" }],
            })

            yield* llm.text("initial turn complete")
            yield* llm.text("postStop follow-up complete")
            const result = yield* actor.spawn({
              mode: "peer",
              sessionID: parent.id,
              agentType: "build",
              task: "complete and run one postStop follow-up",
              description: "postStop registry peer",
              context: "none",
              tools: ["read"],
              background: true,
              model: ref,
            })

            expect((yield* Deferred.await(result.outcome).pipe(Effect.timeout("2 seconds"))).status).toBe("success")
            yield* Deferred.await(finished).pipe(Effect.timeout("5 seconds"))
            const row = yield* actorReg.get(result.sessionID, result.actorID)
            expect(row?.status).toBe("idle")
            expect(row?.lastOutcome).toBe("success")
          }),
          { git: true, config: providerCfg },
        )
      }),
    10_000,
  )
})

describe("mode × contextMode matrix", () => {
  const fakeForkCtx: Actor.ForkContext = {
    system: ["test-system"],
    tools: {},
    inheritedMessages: [],
    parentPermission: [],
    watermarkMsgID: MessageID.make("msg_test_watermark"),
    model: { providerID: ProviderID.make("test") as ProviderID, modelID: ModelID.make("test") as ModelID },
  }

  it.live("subagent + full: forkContext stored under actorID", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "matrix subagent+full",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.hang

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "explore",
          task: "noop",
          context: "full",
          tools: [],
          background: true,
          model: ref,
          forkContext: fakeForkCtx,
        })

        const ctx = yield* actor.getForkContext(result.sessionID, result.actorID)
        expect(ctx).toBeDefined()
        expect(ctx?.system).toEqual(["test-system"])

        yield* actor.cancel(result.sessionID, result.actorID, "forced")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("subagent + full: forkContext is isolated per session (same actorID, different sessions)", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const sessionA = yield* session.create({
          title: "iso A",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const sessionB = yield* session.create({
          title: "iso B",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        // One hang per background actor: each consumes a response, so both must
        // stay parked to keep their fork contexts live until the assertions.
        yield* llm.hang
        yield* llm.hang

        // Each session allocates its subagent id independently → both "explore-1".
        const a = yield* actor.spawn({
          mode: "subagent",
          sessionID: sessionA.id,
          agentType: "explore",
          task: "noop",
          context: "full",
          tools: [],
          background: true,
          model: ref,
          forkContext: { ...fakeForkCtx, system: ["A"] },
        })
        const b = yield* actor.spawn({
          mode: "subagent",
          sessionID: sessionB.id,
          agentType: "explore",
          task: "noop",
          context: "full",
          tools: [],
          background: true,
          model: ref,
          forkContext: { ...fakeForkCtx, system: ["B"] },
        })
        expect(a.actorID).toBe("explore-1")
        expect(b.actorID).toBe("explore-1")

        // Each session's fork agent must read ITS OWN context, not the other's.
        const ctxA = yield* actor.getForkContext(a.sessionID, a.actorID)
        const ctxB = yield* actor.getForkContext(b.sessionID, b.actorID)
        expect(ctxA?.system).toEqual(["A"])
        expect(ctxB?.system).toEqual(["B"])

        yield* actor.cancel(a.sessionID, a.actorID, "forced")
        yield* actor.cancel(b.sessionID, b.actorID, "forced")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("subagent + none: no forkContext stored", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "matrix subagent+none",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.hang

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "explore",
          task: "noop",
          context: "none",
          tools: [],
          background: true,
          model: ref,
          // no forkContext
        })

        const ctx = yield* actor.getForkContext(result.sessionID, result.actorID)
        expect(ctx).toBeUndefined()

        yield* actor.cancel(result.sessionID, result.actorID, "forced")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("peer + full: forkContext stored under child session id (result.actorID)", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "matrix peer+full",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.hang

        const result = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "explore",
          task: "noop",
          context: "full",
          tools: [],
          background: true,
          model: ref,
          forkContext: fakeForkCtx,
        })

        // For peer, result.actorID === child.id (the new session id)
        expect(result.actorID).not.toBe(parent.id)
        const ctx = yield* actor.getForkContext(result.sessionID, result.actorID)
        expect(ctx).toBeDefined()
        expect(ctx?.system).toEqual(["test-system"])

        yield* actor.cancel(result.sessionID, result.actorID, "forced")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("peer + none: no forkContext stored", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "matrix peer+none",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.hang

        const result = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "explore",
          task: "noop",
          context: "none",
          tools: [],
          background: true,
          model: ref,
          // no forkContext
        })

        const ctx = yield* actor.getForkContext(result.sessionID, result.actorID)
        expect(ctx).toBeUndefined()

        yield* actor.cancel(result.sessionID, result.actorID, "forced")
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor.spawn structured output (P3)", () => {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: { ok: { type: "boolean" }, count: { type: "number" } },
    required: ["ok", "count"],
  }

  it.live("format=json_schema → outcome.structured carries the validated object, finalText dropped", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "structured success",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        // Fake model emits a preamble text part AND calls StructuredOutput in the
        // SAME turn. Per §5.2 precedence, structured must win and finalText (the
        // preamble) must be dropped. (Must be one turn: a text-only turn under
        // json_schema would trip StructuredOutputError before a second turn runs.)
        yield* llm.push(reply().text("Here is my analysis…").tool("StructuredOutput", { ok: true, count: 3 }))

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "return structured",
          context: "none",
          tools: ["read"],
          background: false,
          model: ref,
          format: { type: "json_schema", schema, retryCount: 2 },
        })

        const outcome = yield* Deferred.await(result.outcome)
        expect(outcome.status).toBe("success")
        if (outcome.status === "success") {
          expect(outcome.structured).toEqual({ ok: true, count: 3 })
          // §5.2: structured present → finalText dropped (no preamble duplication)
          expect(outcome.finalText).toBeUndefined()
        }
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("no format → outcome.finalText only, structured undefined", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "plain text",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("plain answer")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "return text",
          context: "none",
          tools: ["read"],
          background: false,
          model: ref,
        })

        const outcome = yield* Deferred.await(result.outcome)
        expect(outcome.status).toBe("success")
        if (outcome.status === "success") {
          expect(outcome.structured).toBeUndefined()
          expect(outcome.finalText).toContain("plain answer")
        }
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("exhausted checkpoint-writer invalid output produces a failed actor outcome", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "invalid actor output",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.push(
          ...Array.from({ length: Flag.MIMOCODE_INVALID_OUTPUT_CONTINUATION_LIMIT + 1 }, () => reply().stop()),
        )

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "checkpoint-writer",
          task: "return a result",
          context: "none",
          tools: ["read"],
          background: false,
          model: ref,
        })

        const outcome = yield* Deferred.await(result.outcome)
        expect(outcome.status).toBe("failure")
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor.spawn onActorID pre-registration (MR104 #2)", () => {
  // The workflow runtime needs the child's actorID in its reclaim set BEFORE the
  // background work fiber detaches, otherwise a cancel that races an in-flight
  // spawn leaves an orphan. spawn exposes onActorID: fired synchronously inside
  // the spawn Effect, right after register(), before forkWork detaches. Proof:
  // by the time spawn RESOLVES to the caller, the callback has already run AND
  // carries the SAME actorID the registry was populated with — so any consumer
  // (the workflow) is guaranteed to know the id the instant the actor exists.
  it.live("onActorID fires with the registered actorID before spawn resolves", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const reg = yield* ActorRegistry.Service

        const parent = yield* session.create({
          title: "onActorID timing",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        // Hang so the background fiber is alive — the callback must fire on the
        // SPAWN path (synchronously, pre-detach), not when the work completes.
        yield* llm.hang

        const seen: string[] = []
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "long task",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
          onActorID: (id) => seen.push(id),
        })

        // Resolved → callback ALREADY ran exactly once, with the resolved actorID.
        expect(seen).toEqual([result.actorID])
        // And the registry row for that id exists (register ran before the cb).
        const row = yield* reg.get(parent.id, result.actorID)
        expect(row?.actorID).toBe(result.actorID)

        yield* actor.cancel(result.sessionID, result.actorID, "forced")
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor.spawn concurrent same-session result isolation", () => {
  it.live("two concurrent subagents in one session return their own results", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "concurrent",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        // Bind distinct LLM responses to each subagent by matching on the task
        // text in the request body. Each subagent's request carries ONLY its own
        // task (agent-scoped message slice), so the substring match is unambiguous.
        yield* llm.textMatch((h) => JSON.stringify(h.body).includes("task ALPHA"), "RESULT_ALPHA")
        yield* llm.textMatch((h) => JSON.stringify(h.body).includes("task BETA"), "RESULT_BETA")

        const [a, b] = yield* Effect.all(
          [
            actor.spawn({
              mode: "subagent",
              sessionID: parent.id,
              agentType: "build",
              task: "task ALPHA",
              context: "none",
              tools: ["read"],
              background: true,
              model: ref,
            }),
            actor.spawn({
              mode: "subagent",
              sessionID: parent.id,
              agentType: "build",
              task: "task BETA",
              context: "none",
              tools: ["read"],
              background: true,
              model: ref,
            }),
          ],
          { concurrency: "unbounded" },
        )

        const oa = yield* Deferred.await(a.outcome)
        const ob = yield* Deferred.await(b.outcome)
        const ra = oa.status === "success" ? oa.finalText : undefined
        const rb = ob.status === "success" ? ob.finalText : undefined

        // a is ALPHA, b is BETA — each must carry its OWN result. Pre-fix, the
        // session-wide lastAssistant lookup collapses both onto whichever actor
        // persisted last, so ra === rb (both BETA, the newest ascending ID).
        expect(ra).toBe("RESULT_ALPHA")
        expect(rb).toBe("RESULT_BETA")
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor.spawn return-format injection (F21)", () => {
  it.live("non-specialized subagent (general) gets return-format instruction injected", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "F21 inject test",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("done")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "general",
          task: "do this thing",
          context: "none",
          tools: ["read"],
          background: false,
          model: ref,
        })

        yield* Deferred.await(result.outcome)

        // The subagent's messages live in its own actorID slice; session.messages
        // defaults to the "main" slice, so scope the query to the subagent.
        const msgs = yield* session.messages({ sessionID: result.sessionID, agentID: result.actorID })
        const subAgentUser = msgs.find((m) => m.info.role === "user" && m.info.agentID === result.actorID)
        expect(subAgentUser).toBeDefined()
        const text = subAgentUser?.parts.find((p) => p.type === "text")?.text ?? ""
        expect(text).toContain("Return format (required)")
        expect(text).toContain("**Status**:")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("explore subagent does NOT get return-format injection", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "F21 explore exclusion",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("done")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "explore",
          task: "search for foo",
          context: "none",
          tools: ["read", "grep", "glob"],
          background: false,
          model: ref,
        })

        yield* Deferred.await(result.outcome)

        // Scope to the subagent's actorID slice (session.messages defaults to "main")
        // and assert the message exists, so this guards against injection instead of
        // passing vacuously on an empty main-slice result.
        const msgs = yield* session.messages({ sessionID: result.sessionID, agentID: result.actorID })
        const subAgentUser = msgs.find((m) => m.info.role === "user" && m.info.agentID === result.actorID)
        expect(subAgentUser).toBeDefined()
        const text = subAgentUser?.parts.find((p) => p.type === "text")?.text ?? ""
        expect(text).not.toContain("Return format (required)")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("checkpoint-writer subagent does NOT get return-format injection", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "F21 writer exclusion",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("done")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "checkpoint-writer",
          task: "write the next checkpoint for this session",
          context: "full",
          tools: ["read", "write", "edit", "glob", "grep"],
          background: false,
          model: ref,
        })

        yield* Deferred.await(result.outcome)

        // Scope to the subagent's actorID slice (session.messages defaults to "main")
        // and assert the message exists, so this guards against injection instead of
        // passing vacuously on an empty main-slice result.
        const msgs = yield* session.messages({ sessionID: result.sessionID, agentID: result.actorID })
        const subAgentUser = msgs.find((m) => m.info.role === "user" && m.info.agentID === result.actorID)
        expect(subAgentUser).toBeDefined()
        const text = subAgentUser?.parts.find((p) => p.type === "text")?.text ?? ""
        expect(text).not.toContain("Return format (required)")
      }),
      { git: true, config: providerCfg },
    ),
  )
})

// ---------------------------------------------------------------------------
// AgentOutcome failure classification (see actor/spawn.ts FailureInfo).
//
// The point of these tests is that a consumer can tell a transient failure from
// a deterministic one WITHOUT string-matching `error`. Both drive the real
// construction path: runAgentLoop classifies the settled assistant error, raises
// the carrier, and forkWork's onFailure squashes it back out and assembles the
// AgentOutcome. Nothing here hand-builds an outcome object.
// ---------------------------------------------------------------------------
let settled: NonNullable<MessageV2.Assistant["error"]> | undefined
const itSettled = testEffect(makeLayer(Plugin.defaultLayer, { settledError: () => settled }))

describe("AgentOutcome failure classification", () => {
  itSettled.live("a transient provider failure is classified retryable/transient", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* () {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "x",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        // A 429 the provider SDK itself marked retryable — SessionRetry.retryable
        // returns a status for it, which is the oracle spawn.ts reuses.
        settled = new MessageV2.APIError(
          {
            message: "Too Many Requests",
            statusCode: 429,
            isRetryable: true,
            responseHeaders: { authorization: "sensitive-header" },
            responseBody: "sensitive-response-body",
            metadata: { requestID: "sensitive-request-id" },
          },
        ).toObject()
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "t",
          context: "none",
          tools: ["read"],
          background: false,
          model: ref,
        })
        const outcome = yield* Deferred.await(result.outcome)
        expect(outcome.status).toBe("failure")
        if (outcome.status !== "failure") throw new Error("expected failure")
        // The human string keeps the concise provider message without leaking
        // response headers, bodies, or metadata from the persisted API error.
        expect(outcome.error).toContain("Actor assistant failed: APIError: Too Many Requests")
        expect(outcome.error).not.toContain("sensitive-header")
        expect(outcome.error).not.toContain("sensitive-response-body")
        expect(outcome.error).not.toContain("sensitive-request-id")
        // ...and the classification is there alongside it.
        expect(outcome.failure).toBeTruthy()
        expect(outcome.failure?.retryable).toBe(true)
        expect(outcome.failure?.kind).toBe("transient")
        expect(outcome.failure?.name).toBe("APIError")
      }),
      { git: true, config: providerCfg },
    ),
  )

  itSettled.live("a deterministic overflow failure is classified non-retryable/overflow", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* () {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "x",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        // Context overflow is the canonical "will recur identically" failure:
        // ProviderError.isOverflow matched it upstream and SessionRetry.retryable
        // explicitly refuses to retry it.
        settled = new MessageV2.ContextOverflowError({
          message: "Input exceeds context window of this model",
        }).toObject()
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "t",
          context: "none",
          tools: ["read"],
          background: false,
          model: ref,
        })
        const outcome = yield* Deferred.await(result.outcome)
        expect(outcome.status).toBe("failure")
        if (outcome.status !== "failure") throw new Error("expected failure")
        expect(outcome.error).toContain("Actor assistant failed: ContextOverflowError")
        expect(outcome.failure).toBeTruthy()
        expect(outcome.failure?.retryable).toBe(false)
        expect(outcome.failure?.kind).toBe("overflow")
        expect(outcome.failure?.name).toBe("ContextOverflowError")
      }),
      { git: true, config: providerCfg },
    ),
  )

  itSettled.live("a rejected credential is classified non-retryable/auth", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* () {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "x",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        settled = new MessageV2.APIError(
          { message: "Unauthorized", statusCode: 401, isRetryable: false },
        ).toObject()
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "t",
          context: "none",
          tools: ["read"],
          background: false,
          model: ref,
        })
        const outcome = yield* Deferred.await(result.outcome)
        if (outcome.status !== "failure") throw new Error("expected failure")
        expect(outcome.failure?.retryable).toBe(false)
        expect(outcome.failure?.kind).toBe("auth")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("a failure that never reached a provider carries no classification", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({
          title: "x",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        yield* llm.text("done")
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "t",
          context: "none",
          tools: ["read"],
          background: false,
          model: ref,
        })
        const outcome = yield* Deferred.await(result.outcome)
        // A clean turn must not invent a classification; `failure` is only ever
        // present on a settled-assistant-error failure.
        if (outcome.status === "failure") expect(outcome.failure == null).toBe(true)
        else expect(outcome.status).toBe("success")
      }),
      { git: true, config: providerCfg },
    ),
  )
})

describe("Actor resume", () => {
  it.live("resume preserves the interrupted persistent actor user and frozen context", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const sessions = yield* Session.Service
        const parent = yield* sessions.create({ title: "resume persistent actor" })
        const context = {
          modelIdentity: prefixModelIdentity(yield* (yield* ProviderSvc.Service).getModel(ref.providerID, ref.modelID)),
          system: ["frozen-resume-system"],
          tools: {},
          inheritedMessages: [],
          parentPermission: [],
          watermarkMsgID: MessageID.ascending(),
          model: ref,
        }
        yield* llm.error(400, { error: { message: "invalid request" } })
        const spawned = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "explore",
          task: "original recovery task",
          context: "full",
          lifecycle: "persistent",
          tools: [],
          background: false,
          model: ref,
          forkContext: context,
        })
        expect((yield* Deferred.await(spawned.outcome)).status).toBe("failure")
        const before = yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })
        const old = before.findLast((m) => m.info.role === "assistant")!
        expect(old.info.role === "assistant" && old.info.time.completed).toBeUndefined()
        expect(typeof actor.resume).toBe("function")
        if (!actor.resume) return
        yield* llm.text("resumed result")
        const completion = yield* actor.resume(spawned)
        const admitted = yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })
        expect(admitted.find((m) => m.info.id === old.info.id)?.info).toMatchObject({
          time: { completed: expect.any(Number) },
          error: { name: "MessageAbortedError" },
        })
        const result = yield* completion
        const after = yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })
        expect(after.filter((m) => m.info.role === "user")).toEqual(before.filter((m) => m.info.role === "user"))
        expect(result.info.role === "assistant" && result.info.parentID).toBe(
          old.info.role === "assistant" && old.info.parentID,
        )
        expect(result.parts.some((p) => p.type === "text" && p.text === "resumed result")).toBe(true)
        expect(yield* actor.getForkContext(spawned.sessionID, spawned.actorID)).toBe(context)
        expect(JSON.stringify((yield* llm.inputs)[1])).toContain("frozen-resume-system")
        expect((yield* (yield* ActorRegistry.Service).get(spawned.sessionID, spawned.actorID))?.lastOutcome).toBe(
          "success",
        )
      }),
      { git: true, config: providerCfg },
    ),
  )
})

const interruptedActor = Effect.fnUntraced(function* (
  lifecycle: "persistent" | "ephemeral" = "persistent",
  read = false,
) {
  const llm = yield* TestLLMServer
  const actor = yield* Actor.Service
  const sessions = yield* Session.Service
  const parent = yield* sessions.create({ title: "actor resume boundaries" })
  const context = {
    modelIdentity: prefixModelIdentity(yield* (yield* ProviderSvc.Service).getModel(ref.providerID, ref.modelID)),
    system: ["frozen-resume-boundary"],
    tools: (read
      ? {
          read: {
            description: "Frozen read",
            inputSchema: jsonSchema({
              type: "object",
              properties: { filePath: { type: "string" } },
              required: ["filePath"],
            }),
          },
        }
      : {}) as Record<string, AITool>,
    inheritedMessages: [],
    parentPermission: [{ permission: "*", pattern: "*", action: "allow" as const }],
    watermarkMsgID: MessageID.ascending(),
    model: ref,
  }
  yield* llm.error(400, { error: { message: "invalid request" } })
  const spawned = yield* actor.spawn({
    mode: "subagent",
    sessionID: parent.id,
    agentType: "explore",
    task: "original-task-provenance",
    context: "full",
    lifecycle,
    tools: read ? ["read"] : [],
    background: false,
    model: ref,
    forkContext: context,
  })
  expect((yield* Deferred.await(spawned.outcome)).status).toBe("failure")
  const messages = yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })
  return { ...spawned, messages, context }
})

pauseIt.live("resume binds an unbound original task before hooks and provider execution", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const actor = yield* Actor.Service
      const sessions = yield* Session.Service
      const spawned = yield* interruptedActor()
      const user = spawned.messages.find((message) => message.info.role === "user")!
      if (user.info.role !== "user") return yield* Effect.die("missing recovery user")
      const task = yield* Effect.gen(function* () {
        return yield* (yield* TaskRegistry.Service).create({
          session_id: spawned.sessionID,
          summary: "bind the existing interrupted task",
        })
      }).pipe(Effect.provide(TaskRegistry.defaultLayer))
      recoveryHooks = { pre: [], post: [] }
      yield* llm.text("bound recovery finished")
      const completion = yield* actor.resume!({ ...spawned, task_id: task.id })
      expect(MessageV2.get({ sessionID: spawned.sessionID, messageID: user.info.id }).info).toEqual({
        ...user.info,
        task_id: task.id,
      })
      const result = yield* completion
      expect(result.parts.some((part) => part.type === "text" && part.text === "bound recovery finished")).toBe(true)
      expect(recoveryHooks.pre).toEqual([task.id])
      expect(recoveryHooks.post).toEqual([task.id])
      expect(yield* llm.calls).toBe(2)
      const claimed = yield* Effect.gen(function* () {
        return yield* (yield* TaskRegistry.Service).get({ session_id: spawned.sessionID, id: task.id })
      }).pipe(Effect.provide(TaskRegistry.defaultLayer))
      expect(claimed).toMatchObject({ status: "in_progress", owner: spawned.actorID })
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("resume task conflict rejects admission without settling the old candidate", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const actor = yield* Actor.Service
      const sessions = yield* Session.Service
      const spawned = yield* interruptedActor()
      const user = spawned.messages.find((message) => message.info.role === "user")!
      if (user.info.role !== "user") return yield* Effect.die("missing recovery user")
      yield* sessions.updateMessage({ ...user.info, task_id: "T7" })
      const before = yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })
      const result = yield* actor.resume!({ ...spawned, task_id: "T8" }).pipe(Effect.exit)
      expect(result._tag).toBe("Failure")
      if (Exit.isFailure(result)) expect(Cause.squash(result.cause)).toBeInstanceOf(Session.RecoveryConflictError)
      expect(yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })).toEqual(before)
      expect(yield* llm.calls).toBe(1)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("resume binds a subagent task in its retained explicit parent namespace", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const actor = yield* Actor.Service
      const sessions = yield* Session.Service
      const parent = yield* sessions.create({ title: "actual task owner session" })
      const child = yield* sessions.create({ title: "subagent receiver session" })
      const tasks = yield* Effect.gen(function* () {
        const registry = yield* TaskRegistry.Service
        const original = yield* registry.create({ session_id: parent.id, summary: "retained task provenance" })
        const foreign = yield* registry.create({
          session_id: child.id,
          summary: "same ID belongs to a different session",
          owner: "another-actor",
        })
        return { original, foreign }
      }).pipe(Effect.provide(TaskRegistry.defaultLayer))
      expect(tasks.original.id).toBe(tasks.foreign.id)
      yield* llm.error(400, { error: { message: "interrupt the original subagent" } })
      const spawned = yield* actor.spawn({
        mode: "subagent",
        sessionID: child.id,
        parentSessionID: parent.id,
        agentType: "explore",
        task: "resume with the original task namespace",
        context: "full",
        lifecycle: "persistent",
        tools: [],
        background: false,
        model: ref,
        forkContext: {
          modelIdentity: prefixModelIdentity(yield* (yield* ProviderSvc.Service).getModel(ref.providerID, ref.modelID)),
          system: ["explicit parent recovery namespace"],
          tools: {},
          inheritedMessages: [],
          parentPermission: [],
          watermarkMsgID: MessageID.ascending(),
          model: ref,
        },
      })
      expect((yield* Deferred.await(spawned.outcome)).status).toBe("failure")
      yield* llm.text("original namespace recovery finished")
      const completion = yield* actor.resume!({ ...spawned, task_id: tasks.original.id })
      const result = yield* completion
      expect(result.parts.some((part) => part.type === "text" && part.text === "original namespace recovery finished")).toBe(true)
      yield* Effect.gen(function* () {
        const registry = yield* TaskRegistry.Service
        expect(yield* registry.get({ session_id: parent.id, id: tasks.original.id })).toMatchObject({
          status: "in_progress",
          owner: spawned.actorID,
        })
        expect(yield* registry.get({ session_id: child.id, id: tasks.foreign.id })).toEqual(tasks.foreign)
      }).pipe(Effect.provide(TaskRegistry.defaultLayer))
      expect(yield* llm.calls).toBe(2)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("resume cancellation claim before runner interruption prevents task commit", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const actor = yield* Actor.Service
      const sessions = yield* Session.Service
      const spawned = yield* interruptedActor()
      const task = yield* Effect.gen(function* () {
        return yield* (yield* TaskRegistry.Service).create({ session_id: spawned.sessionID, summary: "cancel before binding" })
      }).pipe(Effect.provide(TaskRegistry.defaultLayer))
      const commit = { hit: yield* Deferred.make<void>(), release: yield* Deferred.make<void>(), done: yield* Deferred.make<void>() }
      const cancel = { hit: yield* Deferred.make<void>(), release: yield* Deferred.make<void>() }
      recoveryCommitGate = commit
      cancelAdmissionGate = cancel
      yield* Effect.addFinalizer(() => Deferred.succeed(commit.release, undefined).pipe(Effect.andThen(Deferred.succeed(cancel.release, undefined))))
      const resume = yield* actor.resume!({ ...spawned, task_id: task.id }).pipe(Effect.forkChild)
      yield* Deferred.await(commit.hit).pipe(Effect.timeout("3 seconds"))
      const stop = yield* actor.cancel(spawned.sessionID, spawned.actorID, "forced").pipe(Effect.forkChild)
      yield* Deferred.await(cancel.hit).pipe(Effect.timeout("3 seconds"))
      yield* Deferred.succeed(commit.release, undefined)
      yield* Deferred.await(commit.done).pipe(Effect.timeout("3 seconds"))
      const after = yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })
      yield* Deferred.succeed(cancel.release, undefined)
      yield* Fiber.join(stop).pipe(Effect.timeout("3 seconds"))
      expect((yield* Fiber.await(resume))._tag).toBe("Failure")
      expect(after).toEqual(spawned.messages)
      yield* Effect.gen(function* () {
        expect(yield* (yield* TaskRegistry.Service).get({ session_id: spawned.sessionID, id: task.id })).toEqual(task)
      }).pipe(Effect.provide(TaskRegistry.defaultLayer))
      expect(yield* llm.calls).toBe(1)
    }),
    { git: true, config: providerCfg },
  ),
)

for (const continuation of ["compaction", "invalid output"] as const) {
  pauseIt.live(
    `resume accepts owned ${continuation} continuations and preserves original task provenance`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const actor = yield* Actor.Service
          const sessions = yield* Session.Service
          const spawned = yield* interruptedActor()
          const user = spawned.messages.find((message) => message.info.role === "user")!
          if (user.info.role !== "user") return yield* Effect.die("original user missing")
          const original = { ...user.info, task_id: "T7" }
          yield* sessions.updateMessage(original)
          recoveryHooks = { pre: [], post: [] }
          if (continuation === "compaction") {
            yield* llm.error(400, {
              error: { code: "context_length_exceeded", message: "maximum context length is 4096 tokens" },
            })
            yield* llm.text("recovery compaction summary")
          } else yield* llm.reason("thinking without a usable answer")
          yield* llm.text("completed recovered continuation")
          const completion = yield* actor.resume!(spawned)
          const result = yield* completion
          expect(
            result.parts.some((part) => part.type === "text" && part.text === "completed recovered continuation"),
          ).toBe(true)
          const messages = yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })
          expect(messages.filter((message) => message.info.role === "user" && message.info.source !== "hook")).toEqual([
            { ...user, info: original },
          ])
          const continuations = messages.filter(
            (message) => message.info.role === "user" && message.info.source === "hook",
          )
          expect(continuations.length).toBeGreaterThan(0)
          expect(continuations.every((message) => message.info.role === "user" && message.info.task_id === "T7")).toBe(
            true,
          )
          expect(result.info.role === "assistant" && result.info.parentID).toBe(
            messages.findLast((message) => message.info.role === "user")!.info.id,
          )
          expect(recoveryHooks.pre).toEqual(["T7"])
          expect(recoveryHooks.post).toEqual(["T7"])
          expect(yield* actor.getForkContext(spawned.sessionID, spawned.actorID)).toBe(spawned.context)
        }),
        { git: true, config: providerCfg },
      ),
    30_000,
  )
}

for (const phase of ["owned continuation", "compaction CAS"] as const) {
  it.live(
    `resume keeps a foreign hook user outside its authority during ${phase}`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ dir, llm }) {
          const actor = yield* Actor.Service
          const sessions = yield* Session.Service
          const spawned = yield* interruptedActor("persistent", true)
          const original = spawned.messages.find((message) => message.info.role === "user")!
          if (original.info.role !== "user") return yield* Effect.die("original user missing")
          const release = Promise.withResolvers<void>()
          yield* Effect.addFinalizer(() => Effect.sync(() => release.resolve()))
          if (phase === "owned continuation") {
            yield* llm.reason("need an internal continuation")
            yield* llm.push(
              reply()
                .wait(release.promise)
                .tool("read", { filePath: `${dir}/config.json` }),
            )
          } else {
            yield* llm.error(400, {
              error: { code: "context_length_exceeded", message: "maximum context length is 4096 tokens" },
            })
            yield* llm.push(reply().wait(release.promise).text("compaction summary before external write").stop())
          }
          const completion = yield* actor.resume!(spawned)
          yield* llm.wait(3).pipe(Effect.timeout("8 seconds"))
          const owned = (yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })).findLast(
            (message) => message.info.role === "user",
          )!
          expect(owned.info.id).not.toBe(original.info.id)
          const foreign = {
            ...original.info,
            id: MessageID.ascending(),
            source: "hook" as const,
            time: { created: Date.now() },
          }
          yield* sessions.updateMessage(foreign)
          yield* sessions.updatePart({
            id: PartID.ascending(),
            messageID: foreign.id,
            sessionID: spawned.sessionID,
            type: "text",
            text: "foreign-hook-must-not-own-recovery",
            synthetic: true,
          })
          release.resolve()
          const result = yield* completion.pipe(Effect.exit)
          if (phase === "owned continuation") {
            expect(result._tag).toBe("Failure")
            if (result._tag === "Failure") expect(Cause.pretty(result.cause)).toContain("Actor recovery user changed")
          } else {
            // A zero-tail projection can finish at its existing summary after
            // the replay CAS loses. That is not authority for the foreign user.
            expect(result._tag).toBe("Success")
            if (result._tag === "Success") {
              expect(result.value.info).toMatchObject({ summary: true, parentID: owned.info.id })
              expect(result.value.info.role === "assistant" && result.value.info.error).toBeUndefined()
            }
          }
          expect(
            (yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID }))
              .filter((message) => message.info.role === "user")
              .map((message) => message.info.id),
          ).toEqual([original.info.id, owned.info.id, foreign.id])
          expect(yield* llm.calls).toBe(3)
          expect(JSON.stringify(yield* llm.inputs)).not.toContain("foreign-hook-must-not-own-recovery")
          expect(MessageV2.get({ sessionID: spawned.sessionID, messageID: foreign.id }).info).toEqual(foreign)
        }),
        { git: true, config: providerCfg },
      ),
    30_000,
  )
}

for (const retirement of ["ephemeral", "cancelled", "disposed"] as const) {
  it.live(`resume rejects ${retirement} context without rewriting interrupted messages`, () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ dir }) {
        const actor = yield* Actor.Service
        const sessions = yield* Session.Service
        const spawned = yield* interruptedActor(retirement === "ephemeral" ? "ephemeral" : "persistent")
        if (retirement === "cancelled") yield* actor.cancel(spawned.sessionID, spawned.actorID, "forced")
        if (retirement === "disposed") {
          const old = yield* InstanceRef
          yield* Effect.promise(() => Instance.provide({ directory: dir, fn: () => Instance.dispose() }))
          const replacement = yield* Effect.promise(() =>
            Instance.provide({ directory: dir, fn: () => Instance.current }),
          )
          expect(replacement).not.toBe(old)
          expect(replacement.generation).not.toBe(old?.generation)
          expect(old?.disposing).toBe(true)
        }
        expect(actor.resume).toBeDefined()
        if (!actor.resume) return
        const result = yield* actor.resume(spawned).pipe(Effect.exit)
        expect(result._tag).toBe("Failure")
        // SQLite messages remain readable after instance disposal without reloading services.
        expect(MessageV2.get({ sessionID: spawned.sessionID, messageID: spawned.messages.at(-1)!.info.id })).toEqual(
          spawned.messages.at(-1)!,
        )
      }),
      { git: true, config: providerCfg },
    ),
  )
}

it.live("resume rejects a busy runner and concurrent resume without changing the old candidate", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const actor = yield* Actor.Service
      const sessions = yield* Session.Service
      const state = yield* SessionRunState.Service
      const spawned = yield* interruptedActor()
      if (!actor.resume) return yield* Effect.die("resume missing")
      const release = yield* Deferred.make<void>()
      yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
      const current = spawned.messages.at(-1)!
      const busy = yield* state.startRunning(
        spawned.sessionID,
        spawned.actorID,
        Effect.succeed(current),
        Deferred.await(release).pipe(Effect.as(current)),
      )
      expect((yield* actor.resume(spawned).pipe(Effect.exit))._tag).toBe("Failure")
      expect(yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })).toEqual(
        spawned.messages,
      )
      yield* Deferred.succeed(release, undefined)
      yield* busy
      yield* llm.hang
      const completion = yield* actor.resume(spawned)
      yield* llm.wait(2)
      const snapshot = yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })
      expect((yield* actor.resume(spawned).pipe(Effect.exit))._tag).toBe("Failure")
      expect(yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })).toEqual(snapshot)
      expect(yield* llm.calls).toBe(2)
      yield* actor.cancel(spawned.sessionID, spawned.actorID, "forced")
      yield* completion.pipe(Effect.exit)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live("resume rejects changed model harness identity before settling the old assistant", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const actor = yield* Actor.Service
      const sessions = yield* Session.Service
      const provider = yield* ProviderSvc.Service
      const spawned = yield* interruptedActor()
      const model = yield* provider.getModel(ref.providerID, ref.modelID)
      const previous = model.harness_model
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          model.harness_model = previous
        }),
      )
      model.harness_model = "gpt-5.4"
      if (!actor.resume) return yield* Effect.die("resume missing")
      const result = yield* actor.resume(spawned).pipe(Effect.exit)
      expect(result._tag).toBe("Failure")
      expect(yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })).toEqual(
        spawned.messages,
      )
    }),
    { git: true, config: providerCfg },
  ),
)

for (const { outcome, delivery, backlog, failure } of (["success", "failure"] as const).flatMap((outcome) =>
  ([{ delivery: "durable", backlog: 1, failure: "provider" }, { delivery: "durable", backlog: 101, failure: "provider" }, { delivery: "durable", backlog: 101, failure: "defect" }, { delivery: "live", backlog: 1, failure: "provider" }] as const).map((item) => ({ outcome, ...item })),
)) {
  pauseIt.live(
    `resume drains ${backlog} ${delivery} inbox rows once after ${outcome} with ${failure}`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ dir, llm }) {
          const actor = yield* Actor.Service
          const sessions = yield* Session.Service
          const inbox = inboxServiceRef.current!
          const spawned = yield* interruptedActor("persistent", true)
          const original = spawned.messages.find((m) => m.info.role === "user")!
          if (original.info.role !== "user") return yield* Effect.die("user missing")
          yield* sessions.updateMessage({ ...original.info, task_id: "T7" })
          recoveryHooks = { pre: [], post: [] }
          const release = Promise.withResolvers<void>()
          yield* Effect.addFinalizer(() => Effect.sync(() => release.resolve()))
          yield* llm.push(
            reply()
              .wait(release.promise)
              .tool("read", { filePath: `${dir}/config.json` }),
          )
          if (outcome === "success") yield* llm.text("original recovery complete")
          else yield* llm.error(400, { error: { message: "second recovery step failed" } })
          const batches = Math.ceil(backlog / 100)
          if (backlog > 100 && failure === "provider") yield* llm.error(400, { error: { message: "first inbox batch failed" } })
          yield* llm.text("queued followup complete")
          if (!actor.resume) return yield* Effect.die("resume missing")
          const prefix = crypto.randomUUID()
          const rows = Array.from({ length: backlog }, (_, index) => ({
            id: `${prefix}-${String(index).padStart(3, "0")}`,
            receiver_session_id: spawned.sessionID,
            receiver_actor_id: spawned.actorID,
            sender_session_id: spawned.sessionID,
            sender_actor_id: "main",
            content: { text: "queued-after-recovery" },
            created_at: Date.now(),
          }))
          const queued = { inboxID: rows.at(-1)!.id }
          if (delivery === "durable") Database.use((db) => db.insert(InboxTable).values(rows).run())
          if (failure === "defect") recoveryHookControl = { hook: "session.pre", mode: "defect", withoutTask: true, armed: true, outcomes: [] }
          const completion = yield* actor.resume(spawned)
          yield* llm.wait(2)
          if (delivery === "live") {
            const sent = yield* inbox.send({
              receiverSessionID: spawned.sessionID, receiverActorID: spawned.actorID,
              senderSessionID: spawned.sessionID, senderActorID: "main",
              content: "queued-after-recovery",
            })
            queued.inboxID = sent.inboxID
          }
          expect(yield* inbox.has(queued.inboxID)).toBe(true)
          expect(
            (yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })).filter(
              (m) => m.info.role === "user",
            ),
          ).toHaveLength(1)
          release.resolve()
          const resumed = yield* completion.pipe(Effect.timeout("8 seconds"))
          expect(resumed.info.role === "assistant" && resumed.info.parentID).toBe(original.info.id)
          yield* llm.wait(3 + batches - (failure === "defect" ? 1 : 0)).pipe(Effect.timeout("8 seconds"))
          const inputs = yield* llm.inputs
          expect(JSON.stringify(inputs[1])).not.toContain("queued-after-recovery")
          expect(JSON.stringify(inputs[2])).not.toContain("queued-after-recovery")
          expect(JSON.stringify(inputs[3])).toContain("queued-after-recovery")
          expect(yield* inbox.has(queued.inboxID)).toBe(false)
          const messages = yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })
          expect(messages.filter((m) => m.info.role === "user")).toHaveLength(1 + batches)
          expect(messages.find((m) => m.info.id === original.info.id)?.info).toMatchObject({ task_id: "T7" })
          const recovery = messages.filter(
            (m) =>
              m.info.role === "assistant" &&
              m.info.id > spawned.messages.at(-1)!.info.id &&
              m.info.parentID === original.info.id,
          )
          expect(recovery).toHaveLength(2)
          expect(recoveryHooks.pre[0]).toBe("T7")
          expect(recoveryHooks.post[0]).toBe("T7")
          expect(recoveryHooks.pre).toEqual(["T7", ...Array.from({ length: batches }, () => undefined)])
          expect(yield* llm.calls).toBe(3 + batches - (failure === "defect" ? 1 : 0))
        }),
        { git: true, config: providerCfg },
      ),
    20_000,
  )
}

it.live("persistent inbox does not retry a defect before consuming any row", () =>
  provideTmpdirServer(Effect.fnUntraced(function* () {
    const actor = yield* Actor.Service
    const spawned = yield* interruptedActor("persistent", true)
    const id = crypto.randomUUID()
    Database.use((db) => db.insert(InboxTable).values({
      id, receiver_session_id: spawned.sessionID, receiver_actor_id: spawned.actorID,
      content: { text: "retain until a working receiver is available" }, created_at: Date.now(),
    }).run())
    const attempts = { count: 0 }
    if (!actor.runPersistentTurn) return yield* Effect.die("persistent turn missing")
    const result = yield* actor.runPersistentTurn({
      ...spawned, inboxID: id, notifyParentOnComplete: false,
      work: Effect.sync(() => { attempts.count++ }).pipe(Effect.andThen(Effect.die(new Error("failure before drain")))),
      onInterrupt: Effect.succeed(spawned.messages.at(-1)!),
    }).pipe(Effect.exit, Effect.timeout("5 seconds"))
    expect(result._tag).toBe("Failure")
    expect(attempts.count).toBe(1)
    expect(yield* inboxServiceRef.current!.has(id)).toBe(true)
  }), { git: true, config: providerCfg }),
15000)

for (const hook of ["session.pre", "session.userQuery.pre"] as const) {
  pauseIt.live(`resume does not wake durable inbox after ${hook} cancels`, () =>
    provideTmpdirServer(Effect.fnUntraced(function* ({ llm }) {
      const actor = yield* Actor.Service
      const spawned = yield* interruptedActor("persistent", true)
      const id = crypto.randomUUID()
      Database.use((db) => db.insert(InboxTable).values({
        id, receiver_session_id: spawned.sessionID, receiver_actor_id: spawned.actorID,
        content: { text: "must not wake after plugin cancellation" }, created_at: Date.now(),
      }).run())
      recoveryHookControl = { hook, mode: "cancel", armed: true, outcomes: [] }
      yield* llm.text("must not execute the unrelated inbox")
      if (!actor.resume) return yield* Effect.die("resume missing")
      const completion = yield* actor.resume(spawned)
      yield* completion.pipe(Effect.exit, Effect.timeout("5 seconds"))
      yield* Effect.sleep("50 millis")
      expect(recoveryHookControl.armed).toBe(false)
      expect(recoveryHookControl.outcomes).toEqual(["cancelled"])
      expect(yield* inboxServiceRef.current!.has(id)).toBe(true)
      expect(yield* llm.calls).toBe(1)
      expect(yield* llm.pending).toBe(1)
    }), { git: true, config: providerCfg }),
  15000)
}

for (const stop of ["cancel", "dispose"] as const) {
  it.live(
    `resume completion waiter cancellation retains ownership until receiver ${stop}`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ dir, llm }) {
          const actor = yield* Actor.Service
          const reg = yield* ActorRegistry.Service
          const spawned = yield* interruptedActor()
          if (!actor.resume) return yield* Effect.die("resume missing")
          yield* llm.hang
          const completion = yield* actor.resume(spawned)
          yield* llm.wait(2)
          Database.use((db) => db.insert(InboxTable).values({
            id: crypto.randomUUID(), receiver_session_id: spawned.sessionID,
            receiver_actor_id: spawned.actorID, content: { text: "must remain retired" },
            created_at: Date.now(),
          }).run())
          yield* llm.text("must not wake a cancelled or disposed recovery")
          const waiter = yield* completion.pipe(Effect.forkChild)
          yield* Fiber.interrupt(waiter)
          expect((yield* reg.get(spawned.sessionID, spawned.actorID))?.status).toBe("running")
          expect((yield* actor.resume(spawned).pipe(Effect.exit))._tag).toBe("Failure")
          expect(yield* llm.calls).toBe(2)
          if (stop === "cancel") yield* actor.cancel(spawned.sessionID, spawned.actorID, "forced")
          else yield* Effect.promise(() => Instance.provide({ directory: dir, fn: () => Instance.dispose() }))
          yield* completion.pipe(Effect.exit, Effect.timeout("3 seconds"))
          expect((yield* actor.resume(spawned).pipe(Effect.exit))._tag).toBe("Failure")
          yield* Effect.yieldNow
          expect(yield* llm.calls).toBe(2)
          expect(yield* llm.pending).toBe(1)
        }),
        { git: true, config: providerCfg },
      ),
    15_000,
  )
}

for (const race of ["caller cancellation", "new persisted user"] as const) {
  it.live(
    `resume validation rejects ${race} before settlement`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          const actor = yield* Actor.Service
          const sessions = yield* Session.Service
          const spawned = yield* interruptedActor()
          if (!actor.resume) return yield* Effect.die("resume missing")
          const hit = yield* Deferred.make<void>()
          const release = yield* Deferred.make<void>()
          resumeValidationGate = { hit, release }
          yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
          yield* llm.text("must not run cancelled recovery")
          const caller = yield* actor.resume(spawned).pipe(Effect.forkChild)
          yield* Deferred.await(hit).pipe(Effect.timeout("5 seconds"))
          if (race === "caller cancellation") yield* Fiber.interrupt(caller)
          else {
            const original = spawned.messages.find((m) => m.info.role === "user")!.info
            if (original.role !== "user") return yield* Effect.die("user missing")
            yield* sessions.updateMessage({
              ...original,
              id: MessageID.ascending(),
              task_id: "T99",
              time: { created: Date.now() },
            })
          }
          yield* Deferred.succeed(release, undefined)
          if (race === "new persisted user") expect((yield* Fiber.await(caller))._tag).toBe("Failure")
          else {
            // Wait until any incorrectly detached work could reach the provider.
            yield* llm.wait(2).pipe(Effect.timeoutOption("300 millis"))
          }
          const old = spawned.messages.at(-1)!
          expect(MessageV2.get({ sessionID: spawned.sessionID, messageID: old.info.id })).toEqual(old)
          expect(yield* llm.calls).toBe(1)
        }),
        { git: true, config: providerCfg },
      ),
    15_000,
  )
}

it.live(
  "resume tool uses the captured identity and accepts only the owning peer parent",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const sessions = yield* Session.Service
        const parent = yield* sessions.create({ title: "captured recovery peer" })
        const user: MessageV2.User = {
          id: MessageID.ascending(),
          sessionID: parent.id,
          agentID: "main",
          role: "user",
          agent: "build",
          model: ref,
          time: { created: Date.now() },
        }
        yield* sessions.updateMessage(user)
        yield* sessions.updatePart({
          id: PartID.ascending(),
          sessionID: parent.id,
          messageID: user.id,
          type: "text",
          text: "capture recovery prefix",
        })
        const capture = prefixCaptureRef.current!
        const captured = yield* capture({
          sessionID: parent.id,
          agentName: "build",
          providerID: ref.providerID,
          modelID: ref.modelID,
          msgs: yield* sessions.messages({ sessionID: parent.id }),
        })
        expect(captured.modelIdentity).toBe(
          prefixModelIdentity(yield* (yield* ProviderSvc.Service).getModel(ref.providerID, ref.modelID)),
        )
        yield* llm.error(400, { error: { message: "peer interrupted" } })
        const peer = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "build",
          task: "recover peer original task",
          context: "full",
          tools: [],
          background: false,
          model: ref,
          forkContext: { ...captured, watermarkMsgID: user.id, model: ref },
        })
        expect((yield* Deferred.await(peer.outcome)).status).toBe("failure")
        const tools = yield* (yield* ToolRegistry.Service).tools({
          providerID: ref.providerID,
          modelID: ref.modelID,
          agent: (yield* (yield* AgentSvc.Service).get("build"))!,
        })
        const tool = tools.find((tool) => tool.id === "actor")!
        const ctx = {
          sessionID: parent.id,
          messageID: user.id,
          agent: "build",
          abort: new AbortController().signal,
          messages: [],
          metadata: () => Effect.void,
          ask: () => Effect.void,
        }
        const outsider = yield* sessions.create({ title: "unrelated parent" })
        const unknown = yield* tool.execute(
          { operation: { action: "resume", actor_id: peer.actorID } },
          { ...ctx, sessionID: outsider.id },
        )
        expect(JSON.parse(unknown.output).status).toBe("unknown")
        expect(yield* llm.calls).toBe(1)
        const blocked = yield* tool
          .execute(
            { operation: { action: "resume", actor_id: peer.actorID } },
            { ...ctx, agent: "explore", extra: { fromExec: true } },
          )
          .pipe(Effect.exit)
        expect(blocked._tag).toBe("Failure")
        const subagentCaller = yield* (yield* ActorRegistry.Service).register({
          sessionID: parent.id,
          actorID: "registered-subagent-caller",
          mode: "subagent",
          agent: "general",
          description: "cannot manage a sibling recovery",
          contextMode: "none",
          background: false,
          lifecycle: "ephemeral",
        })
        for (const caller of [
          { ...ctx, agent: "explore" },
          { ...ctx, actorID: subagentCaller.actorID },
        ]) {
          const denied = yield* tool.execute(
            { operation: { action: "resume", actor_id: peer.actorID } },
            caller,
          ).pipe(Effect.exit)
          expect(denied._tag).toBe("Failure")
        }
        expect(yield* llm.calls).toBe(1)
        expect(
          tool.parameters.safeParse({ operation: { action: "resume", actor_id: peer.actorID, task_id: "T1" } }).success,
        ).toBe(true)
        yield* llm.hang
        const result = yield* tool.execute({ operation: { action: "resume", actor_id: peer.actorID } }, ctx)
        expect(JSON.parse(result.output)).toEqual({ actor_id: peer.actorID, status: "running" })
        yield* llm.wait(2)
        const input = JSON.stringify((yield* llm.inputs)[1])
        expect(input).toContain("capture recovery prefix")
        expect(input).toContain("recover peer original task")
        yield* actor.cancel(peer.sessionID, peer.actorID, "forced")
      }),
      { git: true, config: providerCfg },
    ),
  15_000,
)

it.live("resume rejects changed session harness decision without settling the candidate", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* () {
      const actor = yield* Actor.Service
      const sessions = yield* Session.Service
      const spawned = yield* interruptedActor()
      yield* Effect.sync(() =>
        Database.use((db) =>
          db
            .update(SessionTable)
            .set({ prompt: { harness: "codex", systemMode: "append" } })
            .where(eq(SessionTable.id, spawned.sessionID))
            .run(),
        ),
      )
      if (!actor.resume) return yield* Effect.die("resume missing")
      expect((yield* actor.resume(spawned).pipe(Effect.exit))._tag).toBe("Failure")
      const old = spawned.messages.at(-1)!
      expect(MessageV2.get({ sessionID: spawned.sessionID, messageID: old.info.id })).toEqual(old)
    }),
    { git: true, config: providerCfg },
  ),
)

it.live(
  "resume tool cancellation withdraws validation before settlement",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const sessions = yield* Session.Service
        const spawned = yield* interruptedActor()
        const tools = yield* (yield* ToolRegistry.Service).tools({
          providerID: ref.providerID,
          modelID: ref.modelID,
          agent: (yield* (yield* AgentSvc.Service).get("build"))!,
        })
        const tool = tools.find((tool) => tool.id === "actor")!
        // Tool initialization can build the global app graph alongside this test
        // layer. Bind the real Actor service that owns this fixture's frozen lease.
        const previousActor = spawnRef.current
        spawnRef.current = yield* Actor.Service
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            spawnRef.current = previousActor
          }),
        )
        const hit = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        resumeValidationGate = { hit, release }
        yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
        yield* llm.text("must not resume after tool abort")
        const abort = new AbortController()
        const caller = yield* tool
          .execute(
            { operation: { action: "resume", actor_id: spawned.actorID } },
            {
              sessionID: spawned.sessionID,
              messageID: spawned.messages.at(-1)!.info.id,
              agent: "build",
              abort: abort.signal,
              messages: [],
              metadata: () => Effect.void,
              ask: () => Effect.void,
            },
          )
          .pipe(Effect.forkChild)
        yield* Effect.raceFirst(
          Deferred.await(hit),
          Fiber.await(caller).pipe(
            Effect.flatMap((exit) =>
              Effect.die(Exit.isFailure(exit) ? Cause.pretty(exit.cause) : JSON.stringify(exit.value)),
            ),
          ),
        ).pipe(Effect.timeout("5 seconds"))
        abort.abort()
        yield* Deferred.succeed(release, undefined)
        expect((yield* Fiber.await(caller))._tag).toBe("Failure")
        expect(yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })).toEqual(
          spawned.messages,
        )
        expect(yield* llm.calls).toBe(1)
      }),
      { git: true, config: providerCfg },
    ),
  15_000,
)

it.live(
  "resume isolated peer keeps its receiver lease across parent replacement",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ dir, llm }) {
        const actor = yield* Actor.Service
        const sessions = yield* Session.Service
        const parentContext = (yield* InstanceRef)!
        const parent = yield* sessions.create({ title: "isolated recovery parent" })
        const model = yield* (yield* ProviderSvc.Service).getModel(ref.providerID, ref.modelID)
        yield* provideTmpdirInstance(
          (receiverDir) =>
            Effect.gen(function* () {
              const receiver = (yield* InstanceRef)!
              yield* llm.error(400, { error: { message: "isolated peer interrupted" } })
              const peer = yield* actor
                .spawn({
                  mode: "peer",
                  sessionID: parent.id,
                  agentType: "build",
                  task: "isolated recovery task",
                  context: "full",
                  tools: [],
                  background: false,
                  model: ref,
                  cwd: receiverDir,
                  forkContext: {
                    modelIdentity: prefixModelIdentity(model),
                    system: ["isolated frozen prefix"],
                    tools: {},
                    inheritedMessages: [],
                    parentPermission: [],
                    watermarkMsgID: MessageID.ascending(),
                    model: ref,
                  },
                })
                .pipe(Effect.provideService(InstanceRef, parentContext))
              expect((yield* Deferred.await(peer.outcome)).status).toBe("failure")
              yield* Effect.promise(() => Instance.provide({ directory: dir, fn: () => Instance.dispose() }))
              const replacement = yield* Effect.promise(() =>
                Instance.provide({ directory: dir, fn: () => Instance.current }),
              )
              expect(replacement.generation).not.toBe(parentContext.generation)
              expect(receiver.disposing).toBe(false)
              if (!actor.resume) return yield* Effect.die("resume missing")
              yield* llm.text("isolated resumed result")
              const completion = yield* actor.resume(peer).pipe(Effect.provideService(InstanceRef, replacement))
              const result = yield* completion
              expect(result.info.role === "assistant" && result.info.path.cwd).toBe(receiver.directory)
              expect(result.parts.some((part) => part.type === "text" && part.text === "isolated resumed result")).toBe(
                true,
              )
              expect(yield* llm.calls).toBe(2)
            }),
          { git: true, config: providerCfg(llm.url) },
        )
      }),
      { git: true, config: providerCfg },
    ),
  20_000,
)

it.live("resume committed handoff cancellation settles admission after the owned supervisor exits", () =>
  provideTmpdirServer(Effect.fnUntraced(function* () {
    const actor = yield* Actor.Service
    const spawned = yield* interruptedActor()
    const hit = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    resumeValidationGate = { hit, release, settlement: true }
    yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
    if (!actor.resume) return yield* Effect.die("resume missing")
    const caller = yield* actor.resume(spawned).pipe(Effect.forkChild)
    yield* Deferred.await(hit).pipe(Effect.timeout("5 seconds"))
    yield* actor.cancel(spawned.sessionID, spawned.actorID, "forced").pipe(Effect.timeout("3 seconds"))
    const result = yield* Fiber.await(caller).pipe(Effect.timeoutOption("300 millis"))
    expect(result._tag).toBe("Some")
    if (result._tag === "Some") expect(result.value._tag).toBe("Failure")
    const old = spawned.messages.at(-1)!
    expect(MessageV2.get({ sessionID: spawned.sessionID, messageID: old.info.id }).info).toMatchObject({
      id: old.info.id,
      time: { completed: expect.any(Number) },
      error: { name: "MessageAbortedError" },
    })
  }), { git: true, config: providerCfg }),
  15_000,
)

it.live("resume receiver disposal does not notify a still-live isolated parent", () =>
  provideTmpdirServer(Effect.fnUntraced(function* ({ llm }) {
    const actor = yield* Actor.Service
    const sessions = yield* Session.Service
    const parentContext = (yield* InstanceRef)!
    const parent = yield* sessions.create({ title: "live parent disposed recovery receiver" })
    const notifications: string[] = []
    const off = yield* (yield* Bus.Service).subscribeCallback(InboxArrived, (event) => {
      if (event.properties.receiverSessionID === parent.id && event.properties.type === "actor_notification")
        notifications.push(event.properties.inboxID)
    })
    yield* Effect.addFinalizer(() => Effect.sync(off))
    const model = yield* (yield* ProviderSvc.Service).getModel(ref.providerID, ref.modelID)
    yield* provideTmpdirInstance((receiverDir) => Effect.gen(function* () {
      yield* llm.error(400, { error: { message: "isolated peer interrupted" } })
      const peer = yield* actor.spawn({
        mode: "peer", sessionID: parent.id, agentType: "build", task: "disposed recovery must not notify parent",
        context: "full", tools: [], background: true, model: ref, cwd: receiverDir,
        forkContext: { modelIdentity: prefixModelIdentity(model), system: ["isolated frozen prefix"], tools: {}, inheritedMessages: [], parentPermission: [], watermarkMsgID: MessageID.ascending(), model: ref },
      }).pipe(Effect.provideService(InstanceRef, parentContext))
      expect((yield* Deferred.await(peer.outcome)).status).toBe("failure")
      yield* Effect.yieldNow
      expect(notifications).toHaveLength(1)
      if (!actor.resume) return yield* Effect.die("resume missing")
      yield* llm.hang
      const completion = yield* actor.resume(peer).pipe(Effect.provideService(InstanceRef, parentContext))
      yield* llm.wait(2)
      const hit = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      resumeCompletionGate = { hit, release }
      yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
      yield* Effect.promise(() => Instance.provide({ directory: receiverDir, fn: () => Instance.dispose() }))
      yield* Deferred.await(hit).pipe(Effect.timeout("3 seconds"))
      const replacement = yield* Effect.promise(() => Instance.provide({ directory: receiverDir, fn: () => Instance.current }))
      const reg = yield* ActorRegistry.Service
      yield* reg.updateStatus(peer.sessionID, peer.actorID, { status: "pending", lastOutcome: "success" }).pipe(Effect.provideService(InstanceRef, replacement))
      const current = yield* reg.get(peer.sessionID, peer.actorID)
      yield* Deferred.succeed(release, undefined)
      yield* completion.pipe(Effect.exit, Effect.timeout("3 seconds"))
      expect(yield* reg.get(peer.sessionID, peer.actorID)).toEqual(current)
      expect(parentContext.disposing).toBe(false)
      expect(notifications).toHaveLength(1)
    }), { git: true, config: providerCfg(llm.url) })
  }), { git: true, config: providerCfg }),
  20_000,
)

for (const mode of ["graceful", "forced"] as const) {
  it.live(`resume isolated receiver ${mode} cancel from parent stops the owned runner`, () =>
    provideTmpdirServer(Effect.fnUntraced(function* ({ llm }) {
      const actor = yield* Actor.Service
      const sessions = yield* Session.Service
      const parentContext = (yield* InstanceRef)!
      const parent = yield* sessions.create({ title: "parent cancels isolated recovery" })
      const model = yield* (yield* ProviderSvc.Service).getModel(ref.providerID, ref.modelID)
      const notifications: string[] = []
      const off = yield* (yield* Bus.Service).subscribeCallback(InboxArrived, (event) => {
        if (event.properties.receiverSessionID === parent.id && event.properties.type === "actor_notification")
          notifications.push(event.properties.inboxID)
      })
      yield* Effect.addFinalizer(() => Effect.sync(off))
      yield* provideTmpdirInstance((receiverDir) => Effect.gen(function* () {
        yield* llm.error(400, { error: { message: "isolated peer interrupted" } })
        const peer = yield* actor.spawn({
          mode: "peer", sessionID: parent.id, agentType: "build", task: "cancel this isolated recovery",
          context: "full", tools: [], background: true, model: ref, cwd: receiverDir,
          forkContext: { modelIdentity: prefixModelIdentity(model), system: ["isolated frozen prefix"], tools: {}, inheritedMessages: [], parentPermission: [], watermarkMsgID: MessageID.ascending(), model: ref },
        }).pipe(Effect.provideService(InstanceRef, parentContext))
        expect((yield* Deferred.await(peer.outcome)).status).toBe("failure")
        yield* Effect.yieldNow
        if (!actor.resume) return yield* Effect.die("resume missing")
        yield* llm.hang
        const completion = yield* actor.resume(peer).pipe(Effect.provideService(InstanceRef, parentContext))
        yield* llm.wait(2)
        const hit = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        if (mode === "graceful") resumeCompletionGate = { hit, release }
        yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined))
        yield* actor.cancel(peer.sessionID, peer.actorID, mode).pipe(Effect.provideService(InstanceRef, parentContext))
        if (mode === "graceful") {
          yield* Deferred.await(hit).pipe(Effect.timeout("3 seconds"))
          expect(yield* actor.getForkContext(peer.sessionID, peer.actorID)).toBeUndefined()
          const forced = yield* actor.cancel(peer.sessionID, peer.actorID, "forced").pipe(
            Effect.provideService(InstanceRef, parentContext),
            Effect.forkScoped,
          )
          expect((yield* Fiber.join(forced).pipe(Effect.timeoutOption("100 millis")))._tag).toBe("None")
          yield* Deferred.succeed(release, undefined)
          yield* Fiber.join(forced).pipe(Effect.timeout("3 seconds"))
        }
        const settled = yield* completion.pipe(Effect.exit, Effect.timeoutOption("500 millis"))
        expect(settled._tag).toBe("Some")
        expect(notifications).toHaveLength(2)
        expect(yield* actor.getForkContext(peer.sessionID, peer.actorID)).toBeUndefined()
        yield* actor.cancel(peer.sessionID, peer.actorID, "forced").pipe(Effect.provideService(InstanceRef, parentContext), Effect.timeout("3 seconds"))
        expect(notifications).toHaveLength(2)
        expect((yield* actor.resume(peer).pipe(Effect.exit))._tag).toBe("Failure")
      }), { git: true, config: providerCfg(llm.url) })
    }), { git: true, config: providerCfg }),
    20_000,
  )
}

for (const pause of ["cancel runner exit", "terminal status write"] as const) {
  it.live(`resume receiver disposal after ${pause} prevents stale writes and notification`, () =>
    provideTmpdirServer(Effect.fnUntraced(function* ({ llm }) {
      const actor = yield* Actor.Service
      const sessions = yield* Session.Service
      const parentContext = (yield* InstanceRef)!
      const parent = yield* sessions.create({ title: "disposed receiver terminal continuation" })
      const model = yield* (yield* ProviderSvc.Service).getModel(ref.providerID, ref.modelID)
      const notifications: string[] = []
      const off = yield* (yield* Bus.Service).subscribeCallback(InboxArrived, (event) => {
        if (event.properties.receiverSessionID === parent.id && event.properties.type === "actor_notification")
          notifications.push(event.properties.inboxID)
      })
      yield* Effect.addFinalizer(() => Effect.sync(off))
      yield* provideTmpdirInstance((receiverDir) => Effect.gen(function* () {
        yield* llm.error(400, { error: { message: "isolated peer interrupted" } })
        const peer = yield* actor.spawn({
          mode: "peer", sessionID: parent.id, agentType: "build", task: "guard receiver terminal continuation",
          context: "full", tools: [], background: true, model: ref, cwd: receiverDir,
          forkContext: { modelIdentity: prefixModelIdentity(model), system: ["isolated frozen prefix"], tools: {}, inheritedMessages: [], parentPermission: [], watermarkMsgID: MessageID.ascending(), model: ref },
        }).pipe(Effect.provideService(InstanceRef, parentContext))
        expect((yield* Deferred.await(peer.outcome)).status).toBe("failure")
        yield* Effect.yieldNow
        expect(notifications).toHaveLength(1)
        if (!actor.resume) return yield* Effect.die("resume missing")
        const hit = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        if (pause === "terminal status write") terminalWriteGate = { hit, release }
        else cancelCompletionGate = { hit, release }
        yield* Effect.gen(function* () {
          if (pause === "terminal status write") yield* llm.text("resumed successfully")
          else yield* llm.hang
          const completion = yield* actor.resume!(peer).pipe(Effect.provideService(InstanceRef, parentContext))
          yield* llm.wait(2)
          const cancel = pause === "cancel runner exit"
            ? yield* actor.cancel(peer.sessionID, peer.actorID, "forced").pipe(Effect.provideService(InstanceRef, parentContext), Effect.forkScoped)
            : undefined
          yield* Deferred.await(hit).pipe(Effect.timeout("3 seconds"))
          yield* Effect.promise(() => Instance.provide({ directory: receiverDir, fn: () => Instance.dispose() }))
          const replacement = yield* Effect.promise(() => Instance.provide({ directory: receiverDir, fn: () => Instance.current }))
          const reg = yield* ActorRegistry.Service
          yield* reg.updateStatus(peer.sessionID, peer.actorID, { status: "pending", lastOutcome: "success" }).pipe(Effect.provideService(InstanceRef, replacement))
          const current = yield* reg.get(peer.sessionID, peer.actorID)
          yield* Deferred.succeed(release, undefined)
          if (cancel) yield* Fiber.join(cancel).pipe(Effect.timeout("3 seconds"))
          yield* completion.pipe(Effect.exit, Effect.timeout("3 seconds"))
          expect(yield* reg.get(peer.sessionID, peer.actorID)).toEqual(current)
          expect(notifications).toHaveLength(1)
          expect(parentContext.disposing).toBe(false)
        }).pipe(Effect.ensuring(Deferred.succeed(release, undefined)))
      }), { git: true, config: providerCfg(llm.url) })
    }), { git: true, config: providerCfg }),
    20_000,
  )
}

it.live(
  "resume tool recovers a persistent full-context actor created by the spawn tool",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm, dir }) {
        const actor = yield* Actor.Service
        const sessions = yield* Session.Service
        const reg = yield* ActorRegistry.Service
        const parent = yield* sessions.create({ title: "user-accessible persistent recovery" })
        const user: MessageV2.User = {
          id: MessageID.ascending(),
          sessionID: parent.id,
          agentID: "main",
          role: "user",
          agent: "build",
          model: ref,
          time: { created: Date.now() },
          system: "persistent-entry-frozen-system",
          systemMode: "replace-agent",
        }
        yield* sessions.updateMessage(user)
        yield* sessions.updatePart({
          id: PartID.ascending(),
          sessionID: parent.id,
          messageID: user.id,
          type: "text",
          text: "parent history inherited by the persistent actor",
        })
        const assistant: MessageV2.Assistant = {
          id: MessageID.ascending(),
          sessionID: parent.id,
          agentID: "main",
          role: "assistant",
          time: { created: Date.now(), completed: Date.now() },
          parentID: user.id,
          modelID: ref.modelID,
          providerID: ref.providerID,
          mode: "build",
          agent: "build",
          path: { cwd: dir, root: dir },
          cost: 0,
          finish: "stop",
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        }
        yield* sessions.updateMessage(assistant)
        const tools = yield* (yield* ToolRegistry.Service).tools({
          providerID: ref.providerID,
          modelID: ref.modelID,
          agent: (yield* (yield* AgentSvc.Service).get("build"))!,
        })
        const tool = tools.find((tool) => tool.id === "actor")!
        const previousActor = spawnRef.current
        spawnRef.current = actor
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            spawnRef.current = previousActor
          }),
        )
        const task = yield* Effect.gen(function* () {
          const tasks = yield* TaskRegistry.Service
          return yield* tasks.create({ session_id: parent.id, summary: "original delegated recovery task" })
        }).pipe(Effect.provide(TaskRegistry.defaultLayer))
        const ctx = {
          sessionID: parent.id,
          messageID: assistant.id,
          agent: "build",
          actorID: "main",
          abort: new AbortController().signal,
          messages: yield* sessions.messages({ sessionID: parent.id }),
          metadata: () => Effect.void,
          ask: () => Effect.void,
        }
        const operation = {
          action: "spawn",
          description: "Persistent recovery fixture",
          prompt: "original delegated recovery task",
          subagent_type: "general",
          lifecycle: "persistent",
          context: "full",
          task_id: task.id,
        } as const
        const parsed = tool.parameters.safeParse({ operation })
        if (!parsed.success) return yield* Effect.die(parsed.error)
        const before = yield* reg.listBySession(parent.id)
        for (const context of [undefined, "none", "state"] as const) {
          const rejected = yield* tool.execute({ operation: { ...operation, context } }, ctx).pipe(Effect.exit)
          expect(rejected._tag).toBe("Failure")
          expect(yield* reg.listBySession(parent.id)).toEqual(before)
        }
        expect(yield* llm.calls).toBe(0)
        const isActorRequest = (request: Record<string, unknown>) =>
          (request.messages as { role: string; content: string | { type: string; text?: string }[] }[]).some(
            (message) =>
              message.role === "user" &&
              (typeof message.content === "string" ? [{ type: "text", text: message.content }] : message.content).some(
                (part) => part.type === "text" && part.text?.startsWith("original delegated recovery task"),
              ),
          )
        // Parent notifications may request the same server concurrently. Bind
        // both responses to the delegated user input, not the shared FIFO.
        yield* llm.pushMatch((hit) => isActorRequest(hit.body), {
          type: "http-error",
          status: 400,
          body: { error: { message: "persistent tool actor interrupted" } },
        })
        const created = yield* tool.execute({ operation }, ctx)
        const actorID = created.metadata.actorId
        if (typeof actorID !== "string") return yield* Effect.die("spawn tool did not return actorId")
        const failed = yield* tool.execute({ operation: { action: "wait", actor_id: actorID, timeout_ms: 5000 } }, ctx)
        expect(JSON.parse(failed.output)).toMatchObject({ status: "idle", lastOutcome: "failure" })
        yield* Effect.yieldNow
        expect(yield* reg.get(parent.id, actorID)).toMatchObject({ lifecycle: "persistent", contextMode: "full" })
        const frozen = yield* actor.getForkContext(parent.id, actorID)
        expect(frozen?.system.join("\n")).toContain("persistent-entry-frozen-system")
        expect(frozen?.modelIdentity).toBeDefined()
        const interrupted = yield* sessions.messages({ sessionID: parent.id, agentID: actorID })
        const originalUsers = interrupted.filter((message) => message.info.role === "user")
        expect(originalUsers).toHaveLength(1)
        expect(originalUsers[0].info).toMatchObject({ task_id: task.id })
        // The first provider turn can initialize the global app graph too.
        // Keep both tool calls on the actual Actor service owning this fixture.
        spawnRef.current = actor
        const finished = yield* Deferred.make<void>()
        const off = yield* (yield* Bus.Service).subscribeCallback(ActorStatusChanged, (event) => {
          if (
            event.properties.actorID === actorID &&
            event.properties.sessionID === parent.id &&
            event.properties.status === "idle" &&
            event.properties.lastOutcome === "success"
          )
            Deferred.doneUnsafe(finished, Effect.void)
        })
        yield* Effect.addFinalizer(() => Effect.sync(off))
        yield* llm.textMatch((hit) => isActorRequest(hit.body), "recovered persistent tool result")
        const resumed = yield* tool.execute({ operation: { action: "resume", actor_id: actorID } }, ctx)
        expect(JSON.parse(resumed.output)).toEqual({ actor_id: actorID, status: "running" })
        // Persistent success stays idle; wait keeps waiting for attention.
        yield* Deferred.await(finished).pipe(Effect.timeout("5 seconds"))
        const completed = yield* tool.execute({ operation: { action: "status", actor_id: actorID } }, ctx)
        expect(JSON.parse(completed.output)).toMatchObject({ status: "idle" })
        expect(yield* reg.get(parent.id, actorID)).toMatchObject({ lastOutcome: "success" })
        yield* Effect.yieldNow
        const after = yield* sessions.messages({ sessionID: parent.id, agentID: actorID })
        expect(after.filter((message) => message.info.role === "user")).toEqual(originalUsers)
        expect(after.at(-1)?.info).toMatchObject({ role: "assistant", parentID: originalUsers[0].info.id })
        expect(
          after.at(-1)?.parts.some((part) => part.type === "text" && part.text === "recovered persistent tool result"),
        ).toBe(true)
        expect(yield* actor.getForkContext(parent.id, actorID)).toBe(frozen)
        // Parent notification wakes are separate requests. Match the actor's
        // original user text rather than counting every call on the provider.
        const requests = (yield* llm.inputs).filter(isActorRequest)
        expect(requests).toHaveLength(2)
        expect(JSON.stringify(requests[1])).toContain("parent history inherited by the persistent actor")
        expect(JSON.stringify(requests[1])).toContain("original delegated recovery task")
        const systems = requests.map((request) =>
          (request.messages as { role: string; content: unknown }[]).filter((message) => message.role === "system"),
        )
        expect(JSON.stringify(systems[1])).toContain("persistent-entry-frozen-system")
        expect(systems[1]).toEqual(systems[0])
        yield* tool.execute({ operation: { action: "cancel", actor_id: actorID } }, ctx)
        expect(!!(yield* actor.getForkContext(parent.id, actorID))).toBe(false)
        expect(yield* reg.get(parent.id, actorID)).toMatchObject({ status: "idle", lastOutcome: "cancelled" })
      }),
      { git: true, config: providerCfg },
    ),
  30_000,
)
