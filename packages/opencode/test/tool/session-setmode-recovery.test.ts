import { expect } from "bun:test"
import { Deferred, Effect, Fiber, Layer } from "effect"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Session } from "../../src/session"
import { ActorRegistry } from "../../src/actor/registry"
import { TaskRegistry } from "../../src/task/registry"
import { MessageID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { SessionTool } from "../../src/tool/session"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer))
it.live(
  "real setmode preserves concurrent recovery task and settled assistant fields",
  () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const actors = yield* ActorRegistry.Service
        const tasks = yield* TaskRegistry.Service
        const parent = yield* sessions.create({ title: "Controller" })
        const child = yield* sessions.create({ parentID: parent.id, title: "Peer" })
        yield* actors.register({
          sessionID: child.id,
          actorID: child.id,
          parentActorID: "main",
          mode: "peer",
          agent: "plan",
          description: "Setmode fixture",
          contextMode: "full",
          background: true,
          lifecycle: "persistent",
        })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          sessionID: child.id,
          agentID: child.id,
          role: "user",
          agent: "plan",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test"), variant: "preserve" },
          time: { created: 100 },
        })
        const assistant = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          sessionID: child.id,
          agentID: child.id,
          role: "assistant",
          parentID: user.id,
          agent: "plan",
          mode: "plan",
          providerID: user.model.providerID,
          modelID: user.model.modelID,
          path: { cwd: "/fixture", root: "/fixture" },
          time: { created: 200 },
          cost: 1,
          tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } },
        })
        const task = yield* tasks.create({ session_id: parent.id, summary: "Peer task" })
        const hit = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined).pipe(Effect.ignore))
        const messages: Session.Interface["messages"] = (input) =>
          sessions
            .messages(input)
            .pipe(
              Effect.tap(() =>
                input.sessionID === child.id && input.agentID === child.id
                  ? Deferred.succeed(hit, undefined).pipe(Effect.andThen(Deferred.await(release)))
                  : Effect.void,
              ),
            )
        // Execute the actual tool. Only hold its real slice read before returning it;
        // all services and database writes otherwise use the production implementation.
        const pending = yield* Effect.gen(function* () {
          const tool = yield* (yield* SessionTool).init()
          return yield* tool.execute(
            { operation: { action: "setmode", sessionID: child.id, mode: "build" } },
            {
              sessionID: parent.id,
              messageID: MessageID.ascending(),
              agent: "build",
              actorID: "main",
              abort: new AbortController().signal,
              messages: [],
              metadata: () => Effect.void,
              ask: () => Effect.void,
            },
          )
        }).pipe(Effect.provideService(Session.Service, { ...sessions, messages }), Effect.forkScoped)
        yield* Deferred.await(hit).pipe(Effect.timeout("2 seconds"))
        yield* sessions.commitRecoveryCandidate({
          sessionID: child.id,
          actorID: child.id,
          assistantMessageID: assistant.id,
          parentMessageID: user.id,
          taskID: task.id,
          taskSessionID: parent.id,
        })
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(pending)
        const current = yield* sessions.messages({ sessionID: child.id, agentID: child.id })
        expect(current.find((message) => message.info.id === user.id)?.info).toEqual({
          ...user,
          task_id: task.id,
          agent: "build",
        })
        const settled = current.find((message) => message.info.id === assistant.id)?.info
        expect(settled).toMatchObject({
          agent: "build",
          mode: "plan",
          cost: 1,
          tokens: assistant.tokens,
          error: { name: "MessageAbortedError" },
        })
        expect(settled?.time).toHaveProperty("completed")
        expect(yield* actors.get(child.id, child.id)).toMatchObject({ agent: "build" })
      }),
    ),
  30000,
)
