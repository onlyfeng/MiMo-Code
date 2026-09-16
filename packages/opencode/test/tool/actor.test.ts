import { afterEach, beforeAll, describe, expect } from "bun:test"
import { Cause, Deferred, Effect, Exit, Layer } from "effect"
import z from "zod"
import { schema as transformSchema } from "../../src/provider/transform"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import { Config } from "../../src/config"
import { Provider } from "../../src/provider"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import type { SessionPrompt } from "../../src/session/prompt"
import { SessionCheckpoint } from "../../src/session/checkpoint"
import { MessageID, PartID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { ActorTool, type ActorPromptOps } from "../../src/tool/actor"
import { shellWrap } from "../../src/tool/shell-wrap"
import { ActorRegistry } from "../../src/actor/registry"
import { TaskRegistry } from "../../src/task/registry"
import { ActorWaiter } from "../../src/actor/waiter"
import { spawnRef } from "../../src/actor/spawn-ref"
import type { SpawnInput, AgentOutcome } from "../../src/actor/spawn"
import { prefixCaptureRef, type PrefixCaptureFn } from "../../src/session/prefix-capture-ref"
import { Team } from "../../src/team"
import { Inbox } from "../../src/inbox"
import { Truncate } from "../../src/tool"
import { ToolRegistry } from "../../src/tool"
import { RecoverableError } from "../../src/tool/recoverable"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

let prevSpawnRef: typeof spawnRef.current
let prevPrefixCaptureRef: typeof prefixCaptureRef.current
beforeAll(() => {
  prevSpawnRef = spawnRef.current
  prevPrefixCaptureRef = prefixCaptureRef.current
})

describe("Actor tool fromExec guard", () => {
  it.live("subagent calling spawn via exec receives RecoverableError", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        yield* installMockSpawn()
        const { chat, assistant } = yield* seed()
        const tool = yield* ActorTool
        const def = yield* tool.init()

        const exit = yield* Effect.exit(def.execute(
          {
            operation: {
              action: "spawn",
              description: "nested spawn attempt",
              prompt: "should be blocked",
              subagent_type: "general",
            },
          },
          {
            sessionID: chat.id,
            messageID: assistant.id,
            agent: "general",
            abort: new AbortController().signal,
            extra: { fromExec: true },
            messages: [],
            metadata: () => Effect.void,
            ask: () => Effect.void,
          },
        ))

        expect(exit._tag).toBe("Failure")
        if (exit._tag === "Failure") {
          const causeStr = String(exit.cause)
          expect(causeStr).toContain("Subagents can only use actor send")
        }
      }),
    ),
  )

  it.live("registered subagent calling send to its parent via exec is allowed", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const { chat, assistant } = yield* seed()
        const registry = yield* ActorRegistry.Service
        yield* registry.register({
          sessionID: chat.id, actorID: "general-1", mode: "subagent", agent: "general",
          description: "Registered sender", contextMode: "none", background: true, lifecycle: "ephemeral",
        })
        const tool = yield* ActorTool
        const def = yield* tool.init()

        const result = yield* def.execute(
          {
            operation: {
              action: "send",
              to_actor_id: "main",
              content: "hello",
            },
          },
          {
            sessionID: chat.id,
            messageID: assistant.id,
            agent: "general",
            actorID: "general-1",
            abort: new AbortController().signal,
            extra: { fromExec: true },
            messages: [],
            metadata: () => Effect.void,
            ask: () => Effect.void,
          },
        ).pipe(Effect.provide(Inbox.defaultLayer))

        expect(result.title).toBe("Sent to main")
        expect(result.metadata.inboxID).toBeTruthy()
        expect(result.metadata.receiver_actor_id).toBe("main")
      }),
    ),
  )

  it.live("primary agent calling spawn directly is not blocked", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        yield* installMockSpawn()
        const { chat, assistant } = yield* seed()
        const tool = yield* ActorTool
        const def = yield* tool.init()

        const result = yield* def.execute(
          {
            operation: {
              action: "spawn",
              description: "legitimate spawn",
              prompt: "go do something",
              subagent_type: "general",
            },
          },
          {
            sessionID: chat.id,
            messageID: assistant.id,
            agent: "build",
            abort: new AbortController().signal,
            extra: {},
            messages: [],
            metadata: () => Effect.void,
            ask: () => Effect.void,
          },
        )

        expect(result.metadata.sessionId).toBe(chat.id)
      }),
    ),
  )
})

afterEach(async () => {
  spawnRef.current = prevSpawnRef
  prefixCaptureRef.current = prevPrefixCaptureRef
  await Instance.disposeAll()
})

// Mock Actor.spawn that simulates the spawn lifecycle using ActorRegistry + Bus
// so tests can exercise the actor tool without the full Actor.layer graph.
function installMockSpawn(onSpawn?: (input: SpawnInput) => void) {
  return Effect.gen(function* () {
    const actorReg = yield* ActorRegistry.Service

    spawnRef.current = {
      spawn: (input: SpawnInput) =>
        Effect.gen(function* () {
          onSpawn?.(input)
          const actorID = yield* actorReg.allocateActorID(input.sessionID, input.agentType)
          yield* actorReg.register({
            sessionID: input.sessionID,
            actorID,
            mode: input.mode,
            parentActorID: input.parentActorID,
            agent: input.agentType,
            description: input.description ?? input.agentType,
            contextMode: input.context,
            background: input.background,
            lifecycle: "ephemeral",
            tools: input.tools,
          })
          yield* actorReg.updateStatus(input.sessionID, actorID, { status: "running" }).pipe(Effect.ignore)

          const outcome = yield* Deferred.make<AgentOutcome>()

          // Synchronously complete the actor so waiter.wait resolves immediately.
          yield* actorReg.updateStatus(input.sessionID, actorID, { status: "idle", lastOutcome: "success" }).pipe(Effect.ignore)
          yield* Deferred.succeed(outcome, { status: "success", finalText: "done" })

          return { actorID, sessionID: input.sessionID, outcome }
        }),
      cancel: () => Effect.void,
      getForkContext: () => Effect.succeed(undefined),
    }
  })
}

function checkpointStub(latest: string | undefined) {
  return SessionCheckpoint.Service.of({
    tryStartCheckpointWriter: () => Effect.succeed("skipped" as const),
    waitForWriter: () => Effect.succeed("no-writer" as const),
    waitForWriterSettlement: () => Effect.succeed({ outcome: "no-writer" as const }),
    drainWriters: () => Effect.succeed({ drained: 0, timedOut: 0 }),
    hasCheckpoint: () => Effect.succeed(latest !== undefined),
    hasMemoryOrTasks: () => Effect.succeed(latest !== undefined),
    loadLatest: () => Effect.succeed(latest),
    loadCheckpoints: () => Effect.succeed(latest ? [latest] : []),
    renderIndex: () => Effect.succeed(""),
    renderRebuildContext: () => Effect.succeed({ text: "", hasActivity: false }),
    lastBoundary: () => Effect.succeed(undefined),
    coverage: () => Effect.succeed([]),
    isWriterRunning: () => Effect.succeed(false),
    insertRebuildBoundary: () => Effect.succeed(false),
  })
}

const ref = {
  providerID: ProviderID.make("test"),
  modelID: ModelID.make("test-model"),
}

const it = testEffect(
  Layer.mergeAll(
    Agent.defaultLayer,
    Bus.defaultLayer,
    Config.defaultLayer,
    Provider.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Session.defaultLayer,
    Truncate.defaultLayer,
    ToolRegistry.defaultLayer,
    ActorRegistry.defaultLayer,
    ActorWaiter.layer.pipe(Layer.provide(Bus.defaultLayer), Layer.provide(ActorRegistry.defaultLayer), Layer.provide(Session.defaultLayer)),
    Team.defaultLayer,
    SessionCheckpoint.defaultLayer,
    TaskRegistry.defaultLayer,
  ),
)

const seed = Effect.fn("ActorToolTest.seed")(function* (title = "Pinned") {
  const session = yield* Session.Service
  const chat = yield* session.create({ title })
  const user = yield* session.updateMessage({
    id: MessageID.ascending(),
    role: "user",
    sessionID: chat.id,
    agent: "build",
    model: ref,
    time: { created: Date.now() },
  })
  const assistant: MessageV2.Assistant = {
    id: MessageID.ascending(),
    role: "assistant",
    parentID: user.id,
    sessionID: chat.id,
    mode: "build",
    agent: "build",
    cost: 0,
    path: { cwd: "/tmp", root: "/tmp" },
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    modelID: ref.modelID,
    providerID: ref.providerID,
    time: { created: Date.now() },
  }
  yield* session.updateMessage(assistant)
  return { chat, assistant }
})

function stubOps(opts?: { onPrompt?: (input: SessionPrompt.PromptInput) => void; text?: string }): ActorPromptOps {
  return {
    cancel() {},
    resolvePromptParts: (template) => Effect.succeed([{ type: "text" as const, text: template }]),
    prompt: (input) =>
      Effect.sync(() => {
        opts?.onPrompt?.(input)
        return reply(input, opts?.text ?? "done")
      }),
  }
}

function reply(input: SessionPrompt.PromptInput, text: string): MessageV2.WithParts {
  const id = MessageID.ascending()
  return {
    info: {
      id,
      role: "assistant",
      parentID: input.messageID ?? MessageID.ascending(),
      sessionID: input.sessionID,
      mode: input.agent ?? "general",
      agent: input.agent ?? "general",
      cost: 0,
      path: { cwd: "/tmp", root: "/tmp" },
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      modelID: input.model?.modelID ?? ref.modelID,
      providerID: input.model?.providerID ?? ref.providerID,
      time: { created: Date.now() },
      finish: "stop",
    },
    parts: [
      {
        id: PartID.ascending(),
        messageID: id,
        sessionID: input.sessionID,
        type: "text",
        text,
      },
    ],
  }
}

describe("tool.actor", () => {
  it.live("description sorts subagents by name and is stable across calls", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const agent = yield* Agent.Service
          const build = yield* agent.get("build")
          const registry = yield* ToolRegistry.Service
          const get = Effect.fnUntraced(function* () {
            const tools = yield* registry.tools({ ...ref, agent: build })
            return tools.find((tool) => tool.id === ActorTool.id)?.description ?? ""
          })
          const first = yield* get()
          const second = yield* get()

          expect(first).toBe(second)

          const alpha = first.indexOf("- alpha: Alpha agent")
          const explore = first.indexOf("- explore:")
          const general = first.indexOf("- general:")
          const zebra = first.indexOf("- zebra: Zebra agent")

          expect(alpha).toBeGreaterThan(-1)
          expect(explore).toBeGreaterThan(alpha)
          expect(general).toBeGreaterThan(explore)
          expect(zebra).toBeGreaterThan(general)
        }),
      {
        config: {
          agent: {
            zebra: {
              description: "Zebra agent",
              mode: "subagent",
            },
            alpha: {
              description: "Alpha agent",
              mode: "subagent",
            },
          },
        },
      },
    ),
  )

  it.live("description hides denied subagents for the caller", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const agent = yield* Agent.Service
          const build = yield* agent.get("build")
          const registry = yield* ToolRegistry.Service
          const description =
            (yield* registry.tools({ ...ref, agent: build })).find((tool) => tool.id === ActorTool.id)?.description ?? ""

          expect(description).toContain("- alpha: Alpha agent")
          expect(description).not.toContain("- zebra: Zebra agent")
        }),
      {
        config: {
          permission: {
            task: {
              "*": "allow",
              zebra: "deny",
            },
          },
          agent: {
            zebra: {
              description: "Zebra agent",
              mode: "subagent",
            },
            alpha: {
              description: "Alpha agent",
              mode: "subagent",
            },
          },
        },
      },
    ),
  )

  it.live("execute asks by default and skips checks when bypassed", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        yield* installMockSpawn()
        const { chat, assistant } = yield* seed()
        const tool = yield* ActorTool
        const def = yield* tool.init()
        const calls: unknown[] = []

        const exec = (extra?: Record<string, unknown>) =>
          def.execute(
            {
              operation: {
                action: "run",
                description: "inspect bug",
                prompt: "look into the cache key path",
                subagent_type: "general",
              },
            },
            {
              sessionID: chat.id,
              messageID: assistant.id,
              agent: "build",
              abort: new AbortController().signal,
              extra: { ...extra },
              messages: [],
              metadata: () => Effect.void,
              ask: (input) =>
                Effect.sync(() => {
                  calls.push(input)
                }),
            },
          )

        yield* exec()
        yield* exec({ bypassAgentCheck: true })

        expect(calls).toHaveLength(1)
        expect(calls[0]).toEqual({
          permission: "actor",
          patterns: ["general"],
          always: ["*"],
          metadata: {
            description: "inspect bug",
            subagent_type: "general",
          },
        })
      }),
    ),
  )

  it.live("execute fails closed before asking or spawning when the caller cannot be resolved", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const spawns: SpawnInput[] = []
        const asks: unknown[] = []
        yield* installMockSpawn((input) => {
          spawns.push(input)
        })
        const { chat, assistant } = yield* seed()
        const tool = yield* ActorTool
        const def = yield* tool.init()

        const exit = yield* def
          .execute(
            {
              operation: {
                action: "run",
                description: "inspect bug",
                prompt: "look into the cache key path",
                subagent_type: "general",
              },
            },
            {
              sessionID: chat.id,
              messageID: assistant.id,
              agent: "removed-helper",
              abort: new AbortController().signal,
              extra: {},
              messages: [],
              metadata: () => Effect.void,
              ask: (input) =>
                Effect.sync(() => {
                  asks.push(input)
                }),
            },
          )
          .pipe(Effect.exit)

        expect(exit._tag).toBe("Failure")
        expect(exit._tag === "Failure" ? Cause.pretty(exit.cause) : "").toContain("removed-helper")
        expect(asks).toHaveLength(0)
        expect(spawns).toHaveLength(0)
      }),
    ),
  )

  it.live("execute resolves a uniquely renamed caller before applying the nesting gate", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawns: SpawnInput[] = []
          const asks: unknown[] = []
          yield* installMockSpawn((input) => {
            spawns.push(input)
          })
          const { chat, assistant } = yield* seed()
          const tool = yield* ActorTool
          const def = yield* tool.init()

          const result = yield* def.execute(
            {
              operation: {
                action: "run",
                description: "inspect bug",
                prompt: "look into the cache key path",
                subagent_type: "general",
              },
            },
            {
              sessionID: chat.id,
              messageID: assistant.id,
              agent: "Builder",
              abort: new AbortController().signal,
              extra: {},
              messages: [],
              metadata: () => Effect.void,
              ask: (input) =>
                Effect.sync(() => {
                  asks.push(input)
                }),
            },
          )

          expect(result.metadata.sessionId).toBe(chat.id)
          expect(asks).toHaveLength(1)
          expect(spawns).toHaveLength(1)
        }),
      { config: { agent: { build: { name: "Builder" } } } },
    ),
  )

  it.live("execute fails closed when the caller display name is ambiguous", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawns: SpawnInput[] = []
          const asks: unknown[] = []
          yield* installMockSpawn((input) => {
            spawns.push(input)
          })
          const { chat, assistant } = yield* seed()
          const tool = yield* ActorTool
          const def = yield* tool.init()

          const exit = yield* def
            .execute(
              {
                operation: {
                  action: "run",
                  description: "inspect bug",
                  prompt: "look into the cache key path",
                  subagent_type: "general",
                },
              },
              {
                sessionID: chat.id,
                messageID: assistant.id,
                agent: "Shared",
                abort: new AbortController().signal,
                extra: {},
                messages: [],
                metadata: () => Effect.void,
                ask: (input) =>
                  Effect.sync(() => {
                    asks.push(input)
                  }),
              },
            )
            .pipe(Effect.exit)

          expect(exit._tag).toBe("Failure")
          expect(exit._tag === "Failure" ? Cause.pretty(exit.cause) : "").toContain("Shared")
          expect(asks).toHaveLength(0)
          expect(spawns).toHaveLength(0)
        }),
      {
        config: {
          agent: {
            build: { name: "Shared" },
            explore: { name: "Shared" },
          },
        },
      },
    ),
  )

  it.live("execute rejects system and renamed subagents at the final nesting gate", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawns: SpawnInput[] = []
          const asks: unknown[] = []
          yield* installMockSpawn((input) => {
            spawns.push(input)
          })
          const { chat, assistant } = yield* seed()
          const tool = yield* ActorTool
          const def = yield* tool.init()

          const execute = (caller: string) =>
            def.execute(
              {
                operation: {
                  action: "run",
                  description: "inspect bug",
                  prompt: "look into the cache key path",
                  subagent_type: "general",
                },
              },
              {
                sessionID: chat.id,
                messageID: assistant.id,
                agent: caller,
                abort: new AbortController().signal,
                extra: {},
                messages: [],
                metadata: () => Effect.void,
                ask: (input) =>
                  Effect.sync(() => {
                    asks.push(input)
                  }),
              },
            )
            .pipe(Effect.exit)

          const renamed = yield* execute("dream")
          const system = yield* execute("checkpoint-writer")

          expect(renamed._tag).toBe("Failure")
          expect(renamed._tag === "Failure" ? Cause.pretty(renamed.cause) : "").toContain(
            "Subagents cannot spawn other subagents",
          )
          expect(system._tag).toBe("Failure")
          expect(system._tag === "Failure" ? Cause.pretty(system.cause) : "").toContain(
            "Subagents cannot spawn other subagents",
          )
          expect(asks).toHaveLength(0)
          expect(spawns).toHaveLength(0)
        }),
      {
        config: {
          agent: {
            dream: { name: "Dream Worker" },
            explore: { name: "dream" },
          },
        },
      },
    ),
  )

  it.live("execute creates a fresh actor under the parent session and reports its id", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        yield* installMockSpawn()
        const { chat, assistant } = yield* seed()
        const tool = yield* ActorTool
        const def = yield* tool.init()

        const result = yield* def.execute(
          {
            operation: {
              action: "run",
              description: "inspect bug",
              prompt: "look into the cache key path",
              subagent_type: "general",
            },
          },
          {
            sessionID: chat.id,
            messageID: assistant.id,
            agent: "build",
            abort: new AbortController().signal,
            extra: {},
            messages: [],
            metadata: () => Effect.void,
            ask: () => Effect.void,
          },
        )

        expect(result.metadata.sessionId).toBe(chat.id)
        expect(result.metadata.actorId).toBeDefined()
        expect(result.output).toContain(`actor_id: ${result.metadata.actorId}`)
        // The id is offered for follow-up, never as a spawn/run resume argument.
        expect(result.output).toContain("send")
      }),
    ),
  )

  it.live("execute shapes child permissions for task, todowrite, and primary tools", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          yield* installMockSpawn()
          const { chat, assistant } = yield* seed()
          const tool = yield* ActorTool
          const def = yield* tool.init()

          const result = yield* def.execute(
            {
              operation: {
                action: "run",
                description: "inspect bug",
                prompt: "look into the cache key path",
                subagent_type: "reviewer",
              },
            },
            {
              sessionID: chat.id,
              messageID: assistant.id,
              agent: "build",
              abort: new AbortController().signal,
              extra: {},
              messages: [],
              metadata: () => Effect.void,
              ask: () => Effect.void,
            },
          )

          // v9: run registers actor in registry with tools whitelist
          const actorReg = yield* ActorRegistry.Service
          const actor = yield* actorReg.get(chat.id, result.metadata.actorId)
          expect(actor).toBeDefined()
          expect(actor!.agent).toBe("reviewer")
          expect(result.metadata.sessionId).toBe(chat.id)
        }),
      {
        config: {
          agent: {
            reviewer: {
              mode: "subagent",
              permission: {
                actor: "allow",
              },
            },
          },
          experimental: {
            primary_tools: ["bash", "read"],
          },
        },
      },
    ),
  )

  it.live("context state caps checkpoint injection before spawning", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          let capturedTask = ""
          yield* installMockSpawn((input) => {
            capturedTask = input.task
          })
          const { chat, assistant } = yield* seed()
          const tool = yield* ActorTool
          const def = yield* tool.init()

          yield* def.execute(
            {
              operation: {
                action: "run",
                description: "inspect state",
                prompt: "continue from state",
                subagent_type: "general",
                context: "state",
              },
            },
            {
              sessionID: chat.id,
              messageID: assistant.id,
              agent: "build",
              abort: new AbortController().signal,
              extra: {},
              messages: [],
              metadata: () => Effect.void,
              ask: () => Effect.void,
            },
          )

          expect(capturedTask).toBe(`<session-state>
Here is a summary of the parent session's progress:

HHHHHHHHHHHH

[... checkpoint truncated to 30 tokens for actor context=state ...]

TTTTTTT
</session-state>
continue from state`)
        }).pipe(Effect.provideService(SessionCheckpoint.Service, checkpointStub("H".repeat(60) + "T".repeat(60)))),
      {
        config: {
          checkpoint: { push_caps: { checkpoint: 30 } },
        },
      },
    ),
  )

  for (const maxTokens of [1, 20, 24, 25, 30]) {
    it.live(`context state includes the omission marker within a ${maxTokens} token budget`, () =>
      provideTmpdirInstance(
        () =>
          Effect.gen(function* () {
            let capturedTask = ""
            yield* installMockSpawn((input) => {
              capturedTask = input.task
            })
            const { chat, assistant } = yield* seed()
            const tool = yield* ActorTool
            const def = yield* tool.init()
            yield* def.execute(
              {
                operation: {
                  action: "run",
                  description: "inspect state",
                  prompt: "continue",
                  subagent_type: "general",
                  context: "state",
                },
              },
              {
                sessionID: chat.id,
                messageID: assistant.id,
                agent: "build",
                abort: new AbortController().signal,
                extra: {},
                messages: [],
                metadata: () => Effect.void,
                ask: () => Effect.void,
              },
            )
            const prefix = "<session-state>\nHere is a summary of the parent session's progress:\n\n"
            const suffix = "\n</session-state>\ncontinue"
            expect(capturedTask.startsWith(prefix)).toBe(true)
            expect(capturedTask.endsWith(suffix)).toBe(true)
            const state = capturedTask.slice(prefix.length, -suffix.length)
            expect(Buffer.byteLength(state, "utf8")).toBeLessThanOrEqual(maxTokens * 3)
            expect(state.length).toBeGreaterThan(0)
            expect(state).not.toContain("\uFFFD")
          }).pipe(Effect.provideService(SessionCheckpoint.Service, checkpointStub("界🙂".repeat(200)))),
        { config: { checkpoint: { push_caps: { checkpoint: maxTokens } } } },
      ),
    )
  }

  it.live("context state caps multibyte checkpoint injection before spawning", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          let capturedTask = ""
          yield* installMockSpawn((input) => {
            capturedTask = input.task
          })
          const { chat, assistant } = yield* seed()
          const tool = yield* ActorTool
          const def = yield* tool.init()
          const checkpoint = "界".repeat(400)

          yield* def.execute(
            {
              operation: {
                action: "run",
                description: "inspect multibyte state",
                prompt: "continue from state",
                subagent_type: "general",
                context: "state",
              },
            },
            {
              sessionID: chat.id,
              messageID: assistant.id,
              agent: "build",
              abort: new AbortController().signal,
              extra: {},
              messages: [],
              metadata: () => Effect.void,
              ask: () => Effect.void,
            },
          )

          expect(capturedTask).toContain("[... checkpoint truncated")
          expect(capturedTask).not.toContain("\uFFFD")
          expect(capturedTask).not.toContain(checkpoint)
          expect(capturedTask).not.toContain("界".repeat(100))
        }).pipe(Effect.provideService(SessionCheckpoint.Service, checkpointStub("界".repeat(400)))),
      {
        config: {
          checkpoint: { push_caps: { checkpoint: 20 } },
        },
      },
    ),
  )
})

describe("Actor tool subagent_type enum (F36)", () => {
  // The actor tool's `subagent_type` schema is built dynamically from the
  // agent registry, filtered to mode==="subagent" && !hidden. Spawnable
  // agents (general, explore, user-config-defined) appear in the enum;
  // hidden internals (title, summary, checkpoint-writer per F24) do not.
  // We probe via the resolved tool's parameters schema since that's the
  // contract surface the LLM hits — Actor.Service.spawn bypasses zod.
  it.live("subagent_type enum includes spawnable agents and rejects hidden ones", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const tool = yield* ActorTool
        const def = yield* tool.init()

        // Probe the subagent_type field directly. Validate the rest of the
        // payload has known-good shape so the only failing field is the enum.
        const accept = (subagentType: string) =>
          def.parameters.safeParse({
            operation: {
              action: "spawn",
              description: "test",
              prompt: "test",
              subagent_type: subagentType,
            },
          })

        // general and explore are mode="subagent" + !hidden → in the enum.
        expect(accept("general").success).toBe(true)
        expect(accept("explore").success).toBe(true)

        // title, summary, checkpoint-writer are hidden=true → not in the enum.
        expect(accept("title").success).toBe(false)
        expect(accept("summary").success).toBe(false)
        expect(accept("checkpoint-writer").success).toBe(false)

        // Made-up name → not in the enum.
        expect(accept("does-not-exist").success).toBe(false)
      }),
    ),
  )

  it.live("user-config-defined subagents appear in the enum", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const tool = yield* ActorTool
          const def = yield* tool.init()

          const accept = (subagentType: string) =>
            def.parameters.safeParse({
              operation: {
                action: "spawn",
                description: "test",
                prompt: "test",
                subagent_type: subagentType,
              },
            })

          // User-config-defined "alpha" is mode="subagent" → in the enum.
          expect(accept("alpha").success).toBe(true)
        }),
      {
        config: {
          agent: {
            alpha: {
              description: "Alpha agent",
              mode: "subagent",
            },
          },
        },
      },
    ),
  )

  // Mirror of the task tool's schema regression test (commit 334cf6708).
  // The pre-discriminated-union schema let the model fill every "optional" string
  // with "", which slipped past the runtime guards in some paths and produced
  // confusing tool errors elsewhere.
  it.live("schema rejects empty strings, unknown fields, and per-action missing required fields", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const tool = yield* ActorTool
        const def = yield* tool.init()
        const params = def.parameters
        const wrap = (op: Record<string, unknown>) => params.safeParse(op)

        // run (sync) and spawn (async): operation envelope required; action/description/prompt/subagent_type required.
        expect(wrap({ operation: { action: "run", description: "x", prompt: "y", subagent_type: "general" } }).success).toBe(true)
        expect(wrap({ operation: { action: "spawn", description: "x", prompt: "y", subagent_type: "general" } }).success).toBe(true)
        expect(wrap({ operation: { action: "run", description: "x", prompt: "y", subagent_type: "general", context: "full", lifecycle: "persistent" } }).success).toBe(false)
        expect(wrap({ operation: { action: "spawn", description: "x", prompt: "y", subagent_type: "general", context: "full", lifecycle: "ephemeral" } }).success).toBe(false)

        expect(wrap({ operation: { action: "run", description: "", prompt: "y", subagent_type: "general" } }).success).toBe(false)
        expect(wrap({ operation: { action: "run", description: "x", prompt: "", subagent_type: "general" } }).success).toBe(false)
        expect(wrap({ operation: { action: "run", description: "x", prompt: "y", subagent_type: "general", junk: "z" } }).success).toBe(false)
        // spawn/run never resume — actor_id is not part of their schema, so a model
        // reaching for it gets a validation error instead of a silently fresh actor.
        expect(wrap({ operation: { action: "run", description: "x", prompt: "y", subagent_type: "general", actor_id: "general-1" } }).success).toBe(false)
        expect(wrap({ operation: { action: "spawn", description: "x", prompt: "y", subagent_type: "general", actor_id: "general-1" } }).success).toBe(false)
        expect(wrap({ operation: { action: "run", description: "x", prompt: "y" } }).success).toBe(false) // missing subagent_type
        expect(wrap({ operation: { action: "run", prompt: "y", subagent_type: "general" } }).success).toBe(false) // missing description
        expect(wrap({ description: "x", prompt: "y", subagent_type: "general" }).success).toBe(false) // missing operation envelope

        // status / wait / cancel: actor_id required and non-empty.
        expect(wrap({ operation: { action: "status", actor_id: "abc" } }).success).toBe(true)
        expect(wrap({ operation: { action: "status" } }).success).toBe(false)
        expect(wrap({ operation: { action: "status", actor_id: "" } }).success).toBe(false)
        expect(wrap({ operation: { action: "wait" } }).success).toBe(false)
        expect(wrap({ operation: { action: "cancel" } }).success).toBe(false)
        // kill is no longer a valid action
        expect(wrap({ operation: { action: "kill", actor_id: "abc" } }).success).toBe(false)

        // Flat shape (old format) is rejected — the discriminator must live inside the envelope.
        expect(
          params.safeParse({ operation: "run", description: "x", prompt: "y", subagent_type: "general" }).success,
        ).toBe(false)
      }),
    ),
  )

  it.live("flattened schema keeps operation as the sole root key (mimo can't drop the discriminator)", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const tool = yield* ActorTool
        const def = yield* tool.init()
        const fakeModel = {
          providerID: "mimo",
          api: { id: "mimo-v2.5-pro", npm: "@ai-sdk/openai-compatible" },
          id: "mimo-v2.5-pro",
          capabilities: { input: {} },
        } as any
        const flat = transformSchema(fakeModel, z.toJSONSchema(def.parameters)) as any
        // Root must expose ONLY `operation`. A flat bag (the bug) lets mimo omit
        // the discriminator entirely; a nested envelope makes it unmissable.
        expect(Object.keys(flat.properties)).toEqual(["operation"])
        expect(flat.required).toEqual(["operation"])
        // The operation node must carry type:"object" (the .meta fix) so models
        // don't stringify the envelope, and must retain its inner 8-way union.
        expect(flat.properties.operation.type).toBe("object")
        expect((flat.properties.operation.oneOf ?? flat.properties.operation.anyOf).length).toBe(8)
      }),
    ),
  )

  // The union order is behaviour-neutral for PARSING but it is the one part of
  // "spawn is the default" that reaches the model as structure rather than
  // prose: the branch order in the JSON schema handed to the provider. The
  // actor.txt wording tests assert a file on disk; this asserts the wire format.
  it.live("flattened schema offers spawn ahead of run in the operation union", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const tool = yield* ActorTool
        const def = yield* tool.init()
        const fakeModel = {
          providerID: "mimo",
          api: { id: "mimo-v2.5", npm: "@ai-sdk/openai-compatible" },
          id: "mimo-v2.5",
          capabilities: { input: {} },
        } as any
        const flat = transformSchema(fakeModel, z.toJSONSchema(def.parameters)) as any
        const branches = (flat.properties.operation.oneOf ?? flat.properties.operation.anyOf) as any[]
        const actions = branches.map((b) => b.properties?.action?.const ?? b.properties?.action?.enum?.[0])
        expect(actions).toContain("spawn")
        expect(actions).toContain("run")
        expect(actions[0]).toBe("spawn")
        expect(actions.indexOf("spawn")).toBeLessThan(actions.indexOf("run"))
      }),
    ),
  )

  it.live("schema accepts an arbitrary task_id string (validation moved to execute)", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const tool = yield* ActorTool
        const def = yield* tool.init()
        const probe = (task_id: string) =>
          def.parameters.safeParse({
            operation: {
              action: "run",
              description: "test",
              prompt: "test",
              subagent_type: "general",
              task_id,
            },
          })

        // Well-formed TID: accepted (as before).
        expect(probe("T4").success).toBe(true)
        // Malformed TID: previously rejected by the regex and hard-failed the
        // whole call; now accepted at the schema layer so execute can degrade it.
        expect(probe("not-a-task").success).toBe(true)
        expect(probe("banana").success).toBe(true)
      }),
    ),
  )
})

describe("Actor tool full context", () => {
  it.live("captures the caller-visible prefix at the context watermark", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        let capturedInput: SpawnInput | undefined
        let capturedPrefixInput: Parameters<PrefixCaptureFn>[0] | undefined
        yield* installMockSpawn((input) => {
          capturedInput = input
        })

        const { chat, assistant } = yield* seed()
        const session = yield* Session.Service
        const watermark = yield* session.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: chat.id,
          agent: "build",
          model: ref,
          time: { created: Date.now() + 1 },
        })
        yield* session.updatePart({
          id: PartID.ascending(),
          messageID: watermark.id,
          sessionID: chat.id,
          type: "text",
          text: "visible after the tool-call message",
        })
        const messages = yield* session.messages({ sessionID: chat.id })
        const inheritedMessages = [{ role: "user" as const, content: "captured parent prefix" } as never]
        const turnContext = "captured parent turn context"
        prefixCaptureRef.current = (input) =>
          Effect.sync(() => {
            capturedPrefixInput = input
            return {
              system: ["captured system"],
              tools: {},
              loadedMcpTools: [],
              inheritedMessages,
              turnContext,
              parentPermission: [],
            }
          })

        const tool = yield* ActorTool
        const def = yield* tool.init()
        yield* def.execute(
          {
            operation: {
              action: "run",
              description: "inspect with context",
              prompt: "continue from the visible transcript",
              subagent_type: "general",
              context: "full",
            },
          },
          {
            sessionID: chat.id,
            messageID: assistant.id,
            agent: "build",
            abort: new AbortController().signal,
            extra: {},
            messages,
            metadata: () => Effect.void,
            ask: () => Effect.void,
          },
        )

        expect(capturedPrefixInput).toEqual({
          sessionID: chat.id,
          agentName: "build",
          providerID: ref.providerID,
          modelID: ref.modelID,
          msgs: messages,
        })
        expect(capturedInput?.forkContext).toEqual({
          system: ["captured system"],
          tools: {},
          loadedMcpTools: [],
          inheritedMessages,
          turnContext,
          parentPermission: [],
          watermarkMsgID: watermark.id,
          model: ref,
        })
      }),
    ),
  )

  for (const scenario of ["missing capture ref", "empty inherited messages"] as const) {
    it.live(`${scenario} fails before spawning`, () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          let spawnCount = 0
          yield* installMockSpawn(() => {
            spawnCount += 1
          })
          const { chat, assistant } = yield* seed()
          const session = yield* Session.Service
          const messages = yield* session.messages({ sessionID: chat.id })
          prefixCaptureRef.current =
            scenario === "missing capture ref"
              ? undefined
              : () =>
                  Effect.succeed({
                    system: ["captured system"],
                    turnContext: undefined,
                    tools: {},
                    inheritedMessages: [],
                    parentPermission: [],
                  })

          const tool = yield* ActorTool
          const def = yield* tool.init()
          const exit = yield* def
            .execute(
              {
                operation: {
                  action: "run",
                  description: "inspect with context",
                  prompt: "continue from the visible transcript",
                  subagent_type: "general",
                  context: "full",
                },
              },
              {
                sessionID: chat.id,
                messageID: assistant.id,
                agent: "build",
                abort: new AbortController().signal,
                extra: {},
                messages,
                metadata: () => Effect.void,
                ask: () => Effect.void,
              },
            )
            .pipe(Effect.exit)

          expect(Exit.isFailure(exit)).toBe(true)
          expect(spawnCount).toBe(0)
        }),
      ),
    )
  }
})

describe("Actor tool default context", () => {
  for (const action of ["run", "spawn"] as const) {
    it.live(`${action} uses only the supplied prompt without prefix capture`, () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          prefixCaptureRef.current = () => Effect.die("Model-facing spawn must not capture parent context")
          const { chat, assistant } = yield* seed()
          const def = yield* (yield* ActorTool).init()
          const ctx = {
            sessionID: chat.id,
            messageID: assistant.id,
            agent: "build",
            abort: new AbortController().signal,
            extra: {},
            messages: yield* (yield* Session.Service).messages({ sessionID: chat.id }),
            metadata: () => Effect.void,
            ask: () => Effect.void,
          }
          yield* def.execute({ operation: { action, subagent_type: "general", description: "Brief task", prompt: "Only this briefing" } }, ctx)
          yield* shellWrap({ ...def, id: "actor" }).execute({ script: `actor ${action} general "Brief task" "Only this briefing"` }, ctx)
          expect(spawned).toHaveLength(2)
          for (const input of spawned) {
            expect(input.context).toBe("none")
            expect(input.forkContext).toBeUndefined()
            expect(input.lifecycle).toBeUndefined()
            expect(input.task).toBe("Only this briefing")
          }
        }),
      ),
    )

  }
})

describe("Actor tool recovered context", () => {
  it.live("valid recovered modes and persistent full context reach the spawn implementation", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const spawned: SpawnInput[] = []
        yield* installMockSpawn((input) => spawned.push(input))
        const { chat, assistant } = yield* seed()
        const messages = yield* (yield* Session.Service).messages({ sessionID: chat.id })
        const inheritedMessages = [{ role: "user" as const, content: "frozen parent history" }]
        prefixCaptureRef.current = () => Effect.succeed({
          system: ["frozen system"], turnContext: "frozen turn context", tools: {},
          activeTools: [], loadedMcpTools: [], inheritedMessages, parentPermission: [],
        })
        const def = yield* (yield* ActorTool).init()
        const wrapped = shellWrap({ ...def, id: "actor" })
        const ctx = {
          sessionID: chat.id, messageID: assistant.id, agent: "build",
          abort: new AbortController().signal, extra: {}, messages,
          metadata: () => Effect.void, ask: () => Effect.void,
        }
        for (const mode of [
          { context: "none" }, { context: "state" }, { context: "full" },
          { context: "full", lifecycle: "persistent" },
        ] as const) {
          const base = { action: "spawn", subagent_type: "general", description: "Recovered briefing", prompt: "Brief task" }
          const operation = { ...base, ...mode }
          for (const raw of [
            operation, { operation }, { operation: JSON.stringify(operation) },
            { operation: base, ...mode }, { operation: JSON.stringify(base), ...mode },
          ]) {
            const result = yield* wrapped.execute(raw as never, ctx)
            expect(result.metadata.success).toBe(1)
            const input = spawned.at(-1)!
            expect(input.context).toBe(mode.context)
            expect(input.lifecycle).toBe("lifecycle" in mode ? mode.lifecycle : undefined)
            if (mode.context === "full") {
              expect(input.forkContext?.inheritedMessages).toEqual(inheritedMessages)
              expect(input.forkContext?.system).toEqual(["frozen system"])
              expect(input.forkContext?.turnContext).toBe("frozen turn context")
              expect(input.forkContext?.watermarkMsgID).toBe(messages.at(-1)!.info.id)
            } else expect(input.forkContext).toBeUndefined()
          }
        }
        expect(spawned).toHaveLength(20)
      }),
    ),
  )

  it.live("malformed recovered context or lifecycle fails before capture or spawn", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        let spawnCount = 0
        let captureCount = 0
        yield* installMockSpawn(() => { spawnCount += 1 })
        prefixCaptureRef.current = () => Effect.sync(() => {
          captureCount += 1
          return { system: ["frozen"], turnContext: undefined, tools: {}, inheritedMessages: [], parentPermission: [] }
        })
        const { chat, assistant } = yield* seed()
        const def = yield* (yield* ActorTool).init()
        const wrapped = shellWrap({ ...def, id: "actor" })
        const ctx = {
          sessionID: chat.id, messageID: assistant.id, agent: "build",
          abort: new AbortController().signal, extra: {}, messages: [],
          metadata: () => Effect.void, ask: () => Effect.void,
        }
        const base = { action: "spawn", subagent_type: "general", description: "Recovered briefing", prompt: "Brief task" }
        for (const extra of [
          { context: null }, { context: false }, { context: 1 }, { context: {} }, { context: "invalid" },
          { lifecycle: null }, { lifecycle: false }, { lifecycle: "ephemeral" },
          { lifecycle: "persistent" }, { context: "none", lifecycle: "persistent" },
          { context: "state", lifecycle: "persistent" },
        ]) {
          const operation = { ...base, ...extra }
          for (const raw of [
            operation, { operation }, { operation: JSON.stringify(operation) },
            { operation: base, ...extra }, { operation: JSON.stringify(base), ...extra },
          ]) {
            const result = yield* wrapped.execute(raw as never, ctx)
            expect(result.metadata.success).toBe(0)
            expect(result.output).toMatch(/context|lifecycle|Persistent/)
          }
        }
        for (const raw of [
          { operation: { ...base, context: "full" }, context: "none" },
          { operation: JSON.stringify({ ...base, context: "full" }), context: "none" },
          { operation: { ...base, context: "full", lifecycle: "persistent" }, lifecycle: "ephemeral" },
        ]) {
          const result = yield* wrapped.execute(raw as never, ctx)
          expect(result.metadata.success).toBe(0)
          expect(result.output).toMatch(/context|lifecycle/)
        }
        expect(spawnCount).toBe(0)
        expect(captureCount).toBe(0)
      }),
    ),
  )
})

const variantModels = {
  provider: {
    test: {
      name: "Test",
      id: "test",
      env: [],
      npm: "@ai-sdk/openai-compatible",
      options: { apiKey: "test-key", baseURL: "http://localhost:1/v1" },
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
        reasoner: {
          id: "reasoner",
          name: "Reasoner",
          attachment: false,
          reasoning: false,
          temperature: false,
          tool_call: true,
          release_date: "2025-01-01",
          limit: { context: 100000, output: 10000 },
          cost: { input: 0, output: 0 },
          options: {},
          variants: {
            low: { reasoningEffort: "low" },
            high: { reasoningEffort: "high" },
            max: { disabled: true },
          },
        },
      },
    },
  },
}

describe("Actor tool variant selection", () => {
  const execute = (selection: { model?: string; variant?: string }) =>
    Effect.gen(function* () {
      const { chat, assistant } = yield* seed()
      const def = yield* (yield* ActorTool).init()
      return yield* def.execute(
        {
          operation: {
            action: "run",
            description: "review",
            prompt: "review the change",
            subagent_type: "general",
            ...selection,
          },
        },
        {
          sessionID: chat.id,
          messageID: assistant.id,
          agent: "build",
          abort: new AbortController().signal,
          extra: {},
          messages: [],
          metadata: () => Effect.void,
          ask: () => Effect.void,
        },
      )
    })

  it.live("schema accepts a non-empty variant on run and spawn only", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const def = yield* (yield* ActorTool).init()
        const wrap = (operation: Record<string, unknown>) => def.parameters.safeParse({ operation })
        const launch = { description: "x", prompt: "y", subagent_type: "general" }

        expect(wrap({ action: "run", ...launch, variant: "high" }).success).toBe(true)
        expect(wrap({ action: "spawn", ...launch, model: "lite", variant: "high" }).success).toBe(true)
        expect(wrap({ action: "spawn", ...launch, variant: "" }).success).toBe(false)
        expect(wrap({ action: "spawn", ...launch, variant: 3 }).success).toBe(false)
        expect(wrap({ action: "resume", actor_id: "general-1", variant: "high" }).success).toBe(false)
        expect(wrap({ action: "models", variant: "high" }).success).toBe(false)
      }),
    ),
  )

  it.live("forwards a variant the resolved model defines", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          const result = yield* execute({ model: "test/reasoner", variant: "high" })

          expect(spawned.map((input) => [input.model, input.variant])).toEqual([
            [{ providerID: ProviderID.make("test"), modelID: ModelID.make("reasoner") }, "high"],
          ])
          expect(result.metadata.variant).toBe("high")
        }),
      { config: variantModels },
    ),
  )

  for (const variant of ["ultra", "max"]) {
    it.live(`rejects variant ${variant} before spawning and lists the valid ones`, () =>
      provideTmpdirInstance(
        () =>
          Effect.gen(function* () {
            const spawned: SpawnInput[] = []
            yield* installMockSpawn((input) => spawned.push(input))
            const exit = yield* Effect.exit(execute({ model: "test/reasoner", variant }))

            expect(Exit.isFailure(exit)).toBe(true)
            expect(String(Exit.isFailure(exit) ? exit.cause : "")).toContain(
              `Model "test/reasoner" has no variant "${variant}". Valid variants: low, high.`,
            )
            expect(spawned).toEqual([])
          }),
        { config: variantModels },
      ),
    )
  }

  it.live("rejects a variant when the parent's model defines none", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          const exit = yield* Effect.exit(execute({ variant: "high" }))

          expect(Exit.isFailure(exit)).toBe(true)
          expect(String(Exit.isFailure(exit) ? exit.cause : "")).toContain(
            `Model "test/test-model" defines no variants, so variant "high" cannot apply.`,
          )
          expect(spawned).toEqual([])
        }),
      { config: variantModels },
    ),
  )

  it.live("omitting variant leaves the spawn input and metadata without one", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          const result = yield* execute({ model: "test/reasoner" })

          expect(spawned.map((input) => Object.hasOwn(input, "variant"))).toEqual([false])
          expect(Object.hasOwn(result.metadata, "variant")).toBe(false)
        }),
      { config: variantModels },
    ),
  )
})

// `squad` spans two providers: its default lives on `alt`, and `test/reasoner` is the
// member on the provider the parent session uses. That is the shape where the
// prompt-side fallback resolves the group without provider context and drops the
// agent's variant.
const agentVariantModels = {
  ...variantModels,
  provider: {
    ...variantModels.provider,
    alt: {
      name: "Alt",
      id: "alt",
      env: [],
      npm: "@ai-sdk/openai-compatible",
      options: { apiKey: "alt-key", baseURL: "http://localhost:1/v1" },
      models: {
        other: {
          id: "other",
          name: "Other",
          attachment: false,
          reasoning: false,
          temperature: false,
          tool_call: true,
          release_date: "2025-01-01",
          limit: { context: 100000, output: 10000 },
          cost: { input: 0, output: 0 },
          options: {},
          variants: { high: { reasoningEffort: "high" } },
        },
      },
    },
  },
  model_groups: { squad: { default: "alt/other", models: ["test/reasoner", "alt/other"] } },
  agent: {
    "group-probe": { description: "Group probe", mode: "subagent", model: "squad", variant: "high" },
    "plain-probe": { description: "Plain probe", mode: "subagent", model: "test/test-model", variant: "high" },
  },
}

describe("Actor tool agent variant inheritance", () => {
  const spawn = (subagent_type: string, selection: { model?: string; variant?: string } = {}) =>
    Effect.gen(function* () {
      const { chat, assistant } = yield* seed()
      const def = yield* (yield* ActorTool).init()
      return yield* def.execute(
        {
          operation: {
            action: "run",
            description: "probe",
            prompt: "probe the change",
            subagent_type,
            ...selection,
          },
        },
        {
          sessionID: chat.id,
          messageID: assistant.id,
          agent: "build",
          abort: new AbortController().signal,
          extra: {},
          messages: [],
          metadata: () => Effect.void,
          ask: () => Effect.void,
        },
      )
    })

  it.live("adopts the agent's variant for the group member on the caller's provider", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          const result = yield* spawn("group-probe")

          expect(spawned.map((input) => [input.model, input.variant])).toEqual([
            [{ providerID: ProviderID.make("test"), modelID: ModelID.make("reasoner") }, "high"],
          ])
          expect(result.metadata.variant).toBe("high")
        }),
      { config: agentVariantModels },
    ),
  )

  it.live("drops a configured variant the resolved model does not define", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          const result = yield* spawn("plain-probe")

          expect(spawned.map((input) => [input.model, Object.hasOwn(input, "variant")])).toEqual([
            [{ providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") }, false],
          ])
          expect(Object.hasOwn(result.metadata, "variant")).toBe(false)
        }),
      { config: agentVariantModels },
    ),
  )

  it.live("an explicit variant outranks the agent's configured one", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          yield* spawn("group-probe", { variant: "low" })

          expect(spawned.map((input) => input.variant)).toEqual(["low"])
        }),
      { config: agentVariantModels },
    ),
  )

  // Naming the agent's own model — as its group ref or as the resolved member — is still
  // "the agent's model", so the configured variant survives an explicit `model`.
  it.live("adopts it when the call names the agent's own model itself", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          yield* spawn("group-probe", { model: "squad" })
          yield* spawn("group-probe", { model: "test/reasoner" })

          expect(spawned.map((input) => [input.model, input.variant])).toEqual([
            [{ providerID: ProviderID.make("test"), modelID: ModelID.make("reasoner") }, "high"],
            [{ providerID: ProviderID.make("test"), modelID: ModelID.make("reasoner") }, "high"],
          ])
        }),
      { config: agentVariantModels },
    ),
  )

  it.live("leaves the variant behind when the call picks a different model", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          yield* spawn("group-probe", { model: "test/test-model" })

          expect(spawned.map((input) => [input.model, Object.hasOwn(input, "variant")])).toEqual([
            [{ providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") }, false],
          ])
        }),
      { config: agentVariantModels },
    ),
  )
})

describe("Actor tool task_id degradation", () => {
  it.live("malformed task_id degrades to ad-hoc with a notice", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        yield* installMockSpawn()
        const { chat, assistant } = yield* seed()
        const tool = yield* ActorTool
        const def = yield* tool.init()

        const result = yield* def.execute(
          {
            operation: {
              action: "run",
              description: "inspect bug",
              prompt: "look into it",
              subagent_type: "general",
              task_id: "not-a-task",
            },
          },
          {
            sessionID: chat.id,
            messageID: assistant.id,
            agent: "build",
            abort: new AbortController().signal,
            extra: {},
            messages: [],
            metadata: () => Effect.void,
            ask: () => Effect.void,
          },
        )

        expect(result.output).toContain("task_id")
        expect(result.output).toContain("not-a-task")
        expect(result.output.toLowerCase()).toContain("ad-hoc")
      }),
    ),
  )

  it.live("well-formed but nonexistent task_id degrades to ad-hoc with a notice", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        yield* installMockSpawn()
        const { chat, assistant } = yield* seed()
        const tool = yield* ActorTool
        const def = yield* tool.init()

        const result = yield* def.execute(
          {
            operation: {
              action: "run",
              description: "inspect bug",
              prompt: "look into it",
              subagent_type: "general",
              task_id: "T999",
            },
          },
          {
            sessionID: chat.id,
            messageID: assistant.id,
            agent: "build",
            abort: new AbortController().signal,
            extra: {},
            messages: [],
            metadata: () => Effect.void,
            ask: () => Effect.void,
          },
        )

        expect(result.output).toContain("T999")
        expect(result.output.toLowerCase()).toContain("ad-hoc")
      }),
    ),
  )

  it.live("existing task_id is preserved with no degradation notice", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        let capturedTaskId: string | undefined = "UNSET"
        yield* installMockSpawn((input) => {
          capturedTaskId = input.task_id
        })
        const { chat, assistant } = yield* seed()
        const tasks = yield* TaskRegistry.Service
        const task = yield* tasks.create({ session_id: chat.id, summary: "real task" })

        const tool = yield* ActorTool
        const def = yield* tool.init()

        const result = yield* def.execute(
          {
            operation: {
              action: "run",
              description: "inspect bug",
              prompt: "look into it",
              subagent_type: "general",
              task_id: task.id,
            },
          },
          {
            sessionID: chat.id,
            messageID: assistant.id,
            agent: "build",
            abort: new AbortController().signal,
            extra: {},
            messages: [],
            metadata: () => Effect.void,
            ask: () => Effect.void,
          },
        )

        // No degradation notice when the task genuinely exists.
        expect(result.output.toLowerCase()).not.toContain("ran ad-hoc")
        // And the valid id is actually threaded through to spawn.
        expect(capturedTaskId).toBe(task.id)
      }),
    ),
  )

  it.live("background spawn with malformed task_id includes the notice in its output", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        yield* installMockSpawn()
        const { chat, assistant } = yield* seed()
        const tool = yield* ActorTool
        const def = yield* tool.init()

        const result = yield* def.execute(
          {
            operation: {
              action: "spawn",
              description: "bg task",
              prompt: "do it in the background",
              subagent_type: "general",
              task_id: "not-a-task",
            },
          },
          {
            sessionID: chat.id,
            messageID: assistant.id,
            agent: "build",
            abort: new AbortController().signal,
            extra: {},
            messages: [],
            metadata: () => Effect.void,
            ask: () => Effect.void,
          },
        )

        expect(result.output).toContain("not-a-task")
        expect(result.output.toLowerCase()).toContain("ad-hoc")
        expect(result.output).toContain("Background sub-session started")
      }),
    ),
  )
})
