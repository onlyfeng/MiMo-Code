import { NodeFileSystem } from "@effect/platform-node"
import { FetchHttpClient } from "effect/unstable/http"
import { afterEach, describe, expect } from "bun:test"
import { Deferred, Effect, Fiber, Layer } from "effect"
import { eq, and } from "drizzle-orm"
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
import { MessageID, SessionID } from "../../src/session/schema"
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
import { Actor } from "../../src/actor/spawn"
import { InboxArrived } from "../../src/actor/events"
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
import { Instance } from "../../src/project/instance"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Ripgrep } from "../../src/file/ripgrep"
import { Format } from "../../src/format"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { reply, TestLLMServer } from "../lib/llm-server"
import { Inbox } from "../../src/inbox"
import { InboxTable } from "../../src/inbox/inbox.sql"

let promptFailureGate:
  | {
      entered: Deferred.Deferred<void>
      release: Deferred.Deferred<void>
    }
  | undefined

let failureWriteGate:
  | {
      sessionID: SessionID
      actorID: string
      entered: Deferred.Deferred<void>
      release: Deferred.Deferred<void>
    }
  | undefined

let cancelActorGate:
  | {
      sessionID: SessionID
      actorID: string
      entered: Deferred.Deferred<void>
      release: Deferred.Deferred<void>
    }
  | undefined

let cancelListGate:
  | {
      sessionID: SessionID
      actorID: string
      expected: number
      count: number
      entered: Deferred.Deferred<void>
      release: Deferred.Deferred<void>
    }
  | undefined

afterEach(async () => {
  promptFailureGate = undefined
  failureWriteGate = undefined
  cancelActorGate = undefined
  cancelListGate = undefined
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
    startAuth: () => Effect.die("unexpected MCP auth in cancel-notification tests"),
    authenticate: () => Effect.die("unexpected MCP auth in cancel-notification tests"),
    finishAuth: () => Effect.die("unexpected MCP auth in cancel-notification tests"),
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
const run = SessionRunState.layer.pipe(Layer.provide(status))
const infra = Layer.mergeAll(NodeFileSystem.layer, CrossSpawnSpawner.defaultLayer)

function makeLayer() {
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
    mcp,
    AppFileSystem.defaultLayer,
    status,
  ).pipe(Layer.provideMerge(infra))
  const question = Question.layer.pipe(Layer.provideMerge(deps))
  const todo = Todo.layer.pipe(Layer.provideMerge(deps))
  const checkpoint = SessionCheckpoint.defaultLayer
  const controlledRegistry = Layer.effect(
    ActorRegistry.Service,
    Effect.gen(function* () {
      const registry = yield* ActorRegistry.Service
      return ActorRegistry.Service.of({
        ...registry,
        listByParent: (sessionID, parentActorID) => {
          const gate = cancelListGate
          if (!gate || gate.sessionID !== sessionID || gate.actorID !== parentActorID) {
            return registry.listByParent(sessionID, parentActorID)
          }
          return Effect.gen(function* () {
            gate.count++
            if (gate.count === gate.expected) yield* Deferred.succeed(gate.entered, undefined)
            yield* Deferred.await(gate.release)
            return yield* registry.listByParent(sessionID, parentActorID)
          })
        },
        updateStatus: (sessionID, actorID, patch) => {
          const gate = failureWriteGate
          if (
            !gate ||
            gate.sessionID !== sessionID ||
            gate.actorID !== actorID ||
            patch.lastOutcome !== "failure"
          ) {
            return registry.updateStatus(sessionID, actorID, patch)
          }
          return Effect.gen(function* () {
            yield* Deferred.succeed(gate.entered, undefined)
            yield* Deferred.await(gate.release)
            return yield* registry.updateStatus(sessionID, actorID, patch)
          })
        },
      })
    }),
  ).pipe(Layer.provide(ActorRegistry.defaultLayer))
  const controlledRun = Layer.effect(
    SessionRunState.Service,
    Effect.gen(function* () {
      const base = yield* SessionRunState.Service
      return SessionRunState.Service.of({
        ...base,
        cancelActor: (sessionID, actorID) => {
          const gate = cancelActorGate
          if (!gate || gate.sessionID !== sessionID || gate.actorID !== actorID) {
            return base.cancelActor(sessionID, actorID)
          }
          return Effect.gen(function* () {
            yield* Deferred.succeed(gate.entered, undefined)
            yield* Deferred.await(gate.release)
            yield* base.cancelActor(sessionID, actorID)
          })
        },
      })
    }),
  ).pipe(Layer.provideMerge(run))
  const taskRegistry = controlledRegistry
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
    Layer.provideMerge(controlledRun),
    Layer.provideMerge(prune),
    Layer.provideMerge(proc),
    Layer.provideMerge(registry),
    Layer.provideMerge(trunc),
    Layer.provide(Instruction.defaultLayer),
    Layer.provide(SystemPrompt.defaultLayer),
    Layer.provide(Inbox.defaultLayer),
    Layer.provideMerge(deps),
  )
  const actorPrompt = Layer.effect(
    SessionPrompt.Service,
    Effect.gen(function* () {
      const base = yield* SessionPrompt.Service
      return SessionPrompt.Service.of({
        ...base,
        prompt: (input) => {
          const gate = promptFailureGate
          if (!gate) return base.prompt(input)
          return Effect.gen(function* () {
            yield* Deferred.succeed(gate.entered, undefined)
            yield* Deferred.await(gate.release)
            return yield* Effect.die(new Error("deterministic actor prompt failure"))
          })
        },
      })
    }),
  ).pipe(Layer.provideMerge(prompt))
  const inboxLayer = Inbox.defaultLayer
  return Layer.mergeAll(
    TestLLMServer.layer,
    Actor.layer.pipe(
      Layer.provideMerge(actorPrompt),
      Layer.provide(Worktree.defaultLayer),
      Layer.provideMerge(taskRegistry),
      Layer.provide(TaskRegistry.defaultLayer),
      Layer.provide(SchedulerDefaultLayer),
      Layer.provideMerge(inboxLayer),
    ),
  ).pipe(Layer.provide(summary))
}

const it = testEffect(makeLayer())

const ref = {
  providerID: ProviderID.make("test"),
  modelID: ModelID.make("test-model"),
}

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

const parentInboxRows = (parentID: SessionID) =>
  Effect.sync(() =>
    Database.use((db) =>
      db
        .select()
        .from(InboxTable)
        .where(and(eq(InboxTable.receiver_session_id, parentID), eq(InboxTable.receiver_actor_id, "main")))
        .all(),
    ),
  )

describe("Actor cancel notification (T41 unified terminal-status bridge)", () => {
  // Regression guard: successful completion still notifies exactly once (no
  // double-notify introduced by the bridge). Read immediately after the outcome
  // resolves — forkWork sends the notification BEFORE resolving the Deferred, so
  // the row is present without an added sleep (a post-terminal sleep lets the
  // ephemeral actor's Instance tear down and the row disappears).
  it.live("successful background subagent still notifies parent exactly once (completed)", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "cancel-notify-success",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("**Status**: success\n**Summary**: done")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "quick task",
          description: "successful task",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })

        yield* Deferred.await(result.outcome)

        const rows = yield* parentInboxRows(parent.id)
        expect(rows.length).toBe(1)
        const content = rows[0].content as { text?: string }
        expect(content.text).toContain("completed")
      }),
      { git: true, config: providerCfg },
    ),
  )

  // Regression guard: a background subagent whose turn reports a failure status
  // still notifies the parent EXACTLY once (no double-notify introduced by the
  // unified terminal path). An LLM-level error is absorbed by the prompt (the
  // turn still completes), so the faithful, deterministic "non-success" signal
  // the actor surfaces is a reported `Status: failed` on an otherwise completed
  // turn — assert that carries through as a single actor_notification.
  it.live("background subagent reporting failure still notifies parent exactly once", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "cancel-notify-fail",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("**Status**: failed\n**Summary**: could not complete")

        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "build",
          task: "will report failure",
          description: "failing task",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })

        yield* Deferred.await(result.outcome)

        const rows = yield* parentInboxRows(parent.id)
        expect(rows.length).toBe(1)
        expect(rows[0].type).toBe("actor_notification")
        const content = rows[0].content as { text?: string }
        expect(content.text).toContain("failed")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("two concurrent forced cancels send one cancelled terminal notification", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const bus = yield* Bus.Service
        const actorReg = yield* ActorRegistry.Service
        const parent = yield* session.create({
          title: "concurrent-cancel-owner",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.hang
        const result = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "build",
          task: "concurrent cancel target",
          description: "concurrent cancel target",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })
        yield* llm.wait(1)

        let notifications = 0
        const off = yield* bus.subscribeCallback(InboxArrived, (event) => {
          if (event.properties.receiverSessionID !== parent.id) return
          if (event.properties.receiverActorID !== "main") return
          if (event.properties.senderSessionID !== result.sessionID) return
          if (event.properties.senderActorID !== result.actorID) return
          notifications++
        })
        yield* Effect.addFinalizer(() => Effect.sync(off))

        const start = yield* Deferred.make<void>()
        const cancelEntered = yield* Deferred.make<void>()
        const releaseCancel = yield* Deferred.make<void>()
        cancelListGate = {
          sessionID: result.sessionID,
          actorID: result.actorID,
          expected: 2,
          count: 0,
          entered: cancelEntered,
          release: releaseCancel,
        }
        yield* Effect.addFinalizer(() => Deferred.succeed(releaseCancel, undefined).pipe(Effect.ignore))
        const cancels = yield* Effect.all(
          [
            Deferred.await(start).pipe(
              Effect.andThen(actor.cancel(result.sessionID, result.actorID, "forced")),
            ),
            Deferred.await(start).pipe(
              Effect.andThen(actor.cancel(result.sessionID, result.actorID, "forced")),
            ),
          ],
          { concurrency: "unbounded", discard: true },
        ).pipe(Effect.forkChild)
        yield* Deferred.succeed(start, undefined)
        yield* Deferred.await(cancelEntered)
        yield* Deferred.succeed(releaseCancel, undefined)
        yield* Fiber.join(cancels)

        const outcome = yield* Deferred.await(result.outcome)
        expect(outcome.status).toBe("cancelled")

        expect((yield* actorReg.get(result.sessionID, result.actorID))?.lastOutcome).toBe("cancelled")
        expect(notifications).toBe(1)
        const rows = yield* parentInboxRows(parent.id)
        expect(rows.length).toBeLessThanOrEqual(1)
        const content = rows[0].content as { text?: string }
        expect(content.text).toContain("cancelled")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("real failure winning a cancel race sends one failed terminal notification", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* () {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const actorReg = yield* ActorRegistry.Service
        const parent = yield* session.create({
          title: "failure-cancel-race",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        const promptEntered = yield* Deferred.make<void>()
        const releasePrompt = yield* Deferred.make<void>()
        promptFailureGate = { entered: promptEntered, release: releasePrompt }
        yield* Effect.addFinalizer(() => Deferred.succeed(releasePrompt, undefined).pipe(Effect.ignore))

        const result = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "build",
          task: "fail while cancel is arming",
          description: "failure wins cancellation race",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })
        yield* Deferred.await(promptEntered)

        const failureWriteEntered = yield* Deferred.make<void>()
        const releaseFailureWrite = yield* Deferred.make<void>()
        failureWriteGate = {
          sessionID: result.sessionID,
          actorID: result.actorID,
          entered: failureWriteEntered,
          release: releaseFailureWrite,
        }
        yield* Effect.addFinalizer(() => Deferred.succeed(releaseFailureWrite, undefined).pipe(Effect.ignore))
        yield* Deferred.succeed(releasePrompt, undefined)
        yield* Deferred.await(failureWriteEntered)

        const cancelEntered = yield* Deferred.make<void>()
        const releaseCancel = yield* Deferred.make<void>()
        cancelActorGate = {
          sessionID: result.sessionID,
          actorID: result.actorID,
          entered: cancelEntered,
          release: releaseCancel,
        }
        yield* Effect.addFinalizer(() => Deferred.succeed(releaseCancel, undefined).pipe(Effect.ignore))

        const cancelling = yield* actor.cancel(result.sessionID, result.actorID, "forced").pipe(Effect.forkChild)
        yield* Deferred.await(cancelEntered)
        yield* Deferred.succeed(releaseFailureWrite, undefined)

        const outcome = yield* Deferred.await(result.outcome)
        expect(outcome.status).toBe("failure")

        yield* Deferred.succeed(releaseCancel, undefined)
        yield* Fiber.join(cancelling)

        expect((yield* actorReg.get(result.sessionID, result.actorID))?.lastOutcome).toBe("failure")
        const rows = yield* parentInboxRows(parent.id)
        expect(rows).toHaveLength(1)
        const content = rows[0].content as { text?: string }
        expect(content.text).toContain("failed")
        expect(content.text).not.toContain("cancelled")

        // The first cancel lost to the real failure. A second explicit retire
        // must still acquire ownership; a leaked `cancelling` key would make it
        // return early and leave the standing failure forever.
        yield* actor.cancel(result.sessionID, result.actorID, "forced")
        expect((yield* actorReg.get(result.sessionID, result.actorID))?.lastOutcome).toBe("cancelled")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("forced cancel interrupts a running woken persistent peer", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const inbox = yield* Inbox.Service
        const actorReg = yield* ActorRegistry.Service
        const parent = yield* session.create({
          title: "woken-peer-cancel",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("spawn turn complete")
        const result = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "build",
          task: "standing peer",
          description: "woken cancellable peer",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })
        yield* Deferred.await(result.outcome)
        yield* Effect.sync(() =>
          Database.use((db) => db.delete(InboxTable).where(eq(InboxTable.receiver_session_id, parent.id)).run()),
        )

        const requestStarted = yield* Deferred.make<void>()
        yield* llm.pushMatch((hit) => {
          if (!JSON.stringify(hit.body).includes("woken-cancel-token")) return false
          Effect.runFork(Deferred.succeed(requestStarted, undefined))
          return true
        }, reply().hang())

        yield* inbox
          .send({
            receiverSessionID: result.sessionID,
            receiverActorID: result.actorID,
            senderSessionID: parent.id,
            senderActorID: "main",
            content: "woken-cancel-token",
          })
          .pipe(Effect.orDie)
        yield* Deferred.await(requestStarted)

        expect((yield* actorReg.get(result.sessionID, result.actorID))?.status).toBe("running")
        yield* actor.cancel(result.sessionID, result.actorID, "forced")

        const terminal = yield* actorReg.get(result.sessionID, result.actorID)
        expect(terminal?.status).toBe("idle")
        expect(terminal?.lastOutcome).toBe("cancelled")
        const rows = yield* parentInboxRows(parent.id)
        expect(rows).toHaveLength(1)
        const content = rows[0].content as { text?: string }
        expect(content.text).toContain("cancelled")

        const rejected = yield* inbox
          .send({
            receiverSessionID: result.sessionID,
            receiverActorID: result.actorID,
            senderSessionID: parent.id,
            senderActorID: "main",
            content: "must not resurrect a retired peer",
          })
          .pipe(
            Effect.as("accepted" as const),
            Effect.catchTag("InboxReceiverNotFound", () => Effect.succeed("retired" as const)),
          )
        expect(rejected).toBe("retired")
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("forced cancel retires an idle persistent peer after success", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const actorReg = yield* ActorRegistry.Service
        const parent = yield* session.create({
          title: "idle-persistent-retire",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        yield* llm.text("standing success")
        const succeeded = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "build",
          task: "finish and stand by",
          description: "successful standing peer",
          context: "full",
          tools: ["read"],
          background: true,
          model: ref,
          forkContext: {
            system: ["success-context"],
            tools: {},
            inheritedMessages: [],
            parentPermission: [],
            watermarkMsgID: MessageID.ascending(),
            model: ref,
          },
        })
        expect((yield* Deferred.await(succeeded.outcome)).status).toBe("success")
        expect((yield* actor.getForkContext(succeeded.sessionID, succeeded.actorID))?.system).toEqual([
          "success-context",
        ])
        yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .insert(InboxTable)
              .values({
                id: "queued-before-retire",
                receiver_session_id: succeeded.sessionID,
                receiver_actor_id: succeeded.actorID,
                sender_session_id: parent.id,
                sender_actor_id: "main",
                type: "text",
                content: { text: "queued before retire" },
                created_at: Date.now(),
              })
              .run(),
          ),
        )
        yield* actor.cancel(succeeded.sessionID, succeeded.actorID, "forced")
        expect((yield* actorReg.get(succeeded.sessionID, succeeded.actorID))?.lastOutcome).toBe("cancelled")
        expect(yield* actor.getForkContext(succeeded.sessionID, succeeded.actorID)).toBeUndefined()
        const childInboxRows = () =>
          Effect.sync(() =>
            Database.use((db) =>
              db
                .select()
                .from(InboxTable)
                .where(
                  and(
                    eq(InboxTable.receiver_session_id, succeeded.sessionID),
                    eq(InboxTable.receiver_actor_id, succeeded.actorID),
                  ),
                )
                .all(),
            ),
          )
        expect(yield* childInboxRows()).toHaveLength(0)

        // Simulate a durable row left by an older process. Turn-start sees the
        // tombstone, discards it, and never evaluates the supplied work.
        yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .insert(InboxTable)
              .values({
                id: "legacy-cancelled-row",
                receiver_session_id: succeeded.sessionID,
                receiver_actor_id: succeeded.actorID,
                sender_session_id: parent.id,
                sender_actor_id: "main",
                type: "text",
                content: { text: "must be discarded" },
                created_at: Date.now(),
              })
              .run(),
          ),
        )
        let ran = false
        yield* actor.runPersistentTurn!({
          sessionID: succeeded.sessionID,
          actorID: succeeded.actorID,
          notifyParentOnComplete: true,
          work: Effect.sync(() => {
            ran = true
            throw new Error("retired work must not run")
          }),
        }).pipe(Effect.exit)
        expect(ran).toBe(false)
        expect(yield* childInboxRows()).toHaveLength(0)
      }),
      { git: true, config: providerCfg },
    ),
  )

  it.live("forced cancel retires an idle persistent peer after failure", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* () {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const actorReg = yield* ActorRegistry.Service
        const parent = yield* session.create({
          title: "idle-failed-persistent-retire",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        const promptEntered = yield* Deferred.make<void>()
        const releasePrompt = yield* Deferred.make<void>()
        promptFailureGate = { entered: promptEntered, release: releasePrompt }
        yield* Effect.addFinalizer(() => Deferred.succeed(releasePrompt, undefined).pipe(Effect.ignore))
        const failed = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "build",
          task: "fail and stand by",
          description: "failed standing peer",
          context: "full",
          tools: ["read"],
          background: true,
          model: ref,
          forkContext: {
            system: ["failure-context"],
            tools: {},
            inheritedMessages: [],
            parentPermission: [],
            watermarkMsgID: MessageID.ascending(),
            model: ref,
          },
        })
        yield* Deferred.await(promptEntered)
        yield* Deferred.succeed(releasePrompt, undefined)
        expect((yield* Deferred.await(failed.outcome)).status).toBe("failure")
        expect((yield* actor.getForkContext(failed.sessionID, failed.actorID))?.system).toEqual([
          "failure-context",
        ])
        yield* actor.cancel(failed.sessionID, failed.actorID, "forced")
        expect((yield* actorReg.get(failed.sessionID, failed.actorID))?.lastOutcome).toBe("cancelled")
        expect(yield* actor.getForkContext(failed.sessionID, failed.actorID)).toBeUndefined()
      }),
      { git: true, config: providerCfg },
    ),
  )

  // Core T41 assertion: cancelling a running background peer produces EXACTLY
  // ONE actor_notification{cancelled} to its parent's main inbox.
  it.live("cancelling a running background peer notifies parent exactly once (cancelled)", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service

        const parent = yield* session.create({
          title: "cancel-notify-peer",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        // Make the spawn turn hang so the actor stays running until we cancel.
        yield* llm.hang

        const result = yield* actor.spawn({
          mode: "peer",
          sessionID: parent.id,
          agentType: "build",
          task: "long running peer",
          description: "cancellable peer task",
          context: "none",
          tools: ["read"],
          background: true,
          model: ref,
        })

        // Wait until the actor is actually running (LLM request in flight).
        yield* Effect.gen(function* () {
          for (let i = 0; i < 400; i++) {
            const calls = yield* llm.calls
            if (calls > 0) return
            yield* Effect.sleep("25 millis")
          }
        })

        yield* actor.cancel(result.sessionID, result.actorID, "forced")

        // The cancelled outcome resolves after the terminal bridge/notify path.
        yield* Deferred.await(result.outcome)

        const rows = yield* parentInboxRows(parent.id)
        expect(rows.length).toBe(1)
        expect(rows[0].type).toBe("actor_notification")
        const content = rows[0].content as { text?: string }
        expect(content.text).toContain("<actor-notification>")
        expect(content.text).toContain("cancellable peer task")
        expect(content.text).toContain("cancelled")
      }),
      { git: true, config: providerCfg },
    ),
  )
})
