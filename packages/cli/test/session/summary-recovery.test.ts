import { expect } from "bun:test"
import { Deferred, Effect, Fiber, Layer } from "effect"
import { Bus } from "../../src/bus"
import { Session } from "../../src/session"
import { SessionSummary } from "../../src/session/summary"
import { MessageID } from "../../src/session/schema"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { TaskRegistry } from "../../src/task/registry"
import { Snapshot } from "../../src/snapshot"
import { Storage } from "../../src/storage"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(
  Layer.mergeAll(
    Session.defaultLayer,
    TaskRegistry.defaultLayer,
    Snapshot.defaultLayer,
    Storage.defaultLayer,
    Bus.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
  ),
)

for (const change of ["task binding", "user removal"] as const)
  it.live(`real delayed summary preserves a concurrent ${change}`, () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const tasks = yield* TaskRegistry.Service
        const storage = yield* Storage.Service
        const session = yield* sessions.create({ title: "Delayed summary" })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          sessionID: session.id,
          role: "user",
          agent: "plan",
          agentID: "main",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test"), variant: "preserved" },
          time: { created: 100 },
          system: "Keep this user configuration",
          summary: { title: "Original title", body: "Original body", diffs: [] },
        })
        const assistant = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          sessionID: session.id,
          role: "assistant",
          agentID: "main",
          parentID: user.id,
          agent: "plan",
          mode: "plan",
          modelID: user.model.modelID,
          providerID: user.model.providerID,
          path: { cwd: "/fixture", root: "/fixture" },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          time: { created: 200 },
        })
        const task = yield* tasks.create({ session_id: session.id, summary: "Concurrent recovery" })
        const hit = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        yield* Effect.addFinalizer(() => Deferred.succeed(release, undefined).pipe(Effect.ignore))
        // The actual summary producer reads the old User, then performs its real
        // storage write. Only hold that existing asynchronous boundary before return.
        const write: Storage.Interface["write"] = (key, content) =>
          storage
            .write(key, content)
            .pipe(
              Effect.tap(() =>
                key[0] === "session_diff" && key[1] === session.id
                  ? Deferred.succeed(hit, undefined).pipe(Effect.andThen(Deferred.await(release)))
                  : Effect.void,
              ),
            )
        const pending = yield* SessionSummary.Service.use((summary) =>
          summary.summarize({ sessionID: session.id, messageID: user.id }),
        ).pipe(
          Effect.provide(
            SessionSummary.layer.pipe(Layer.provide(Layer.succeed(Storage.Service, { ...storage, write }))),
          ),
          Effect.forkScoped,
        )
        yield* Deferred.await(hit).pipe(Effect.timeout("2 seconds"))
        if (change === "task binding")
          yield* sessions.commitRecoveryCandidate({
            sessionID: session.id,
            actorID: "main",
            assistantMessageID: assistant.id,
            parentMessageID: user.id,
            taskID: task.id,
            taskSessionID: session.id,
          })
        else yield* sessions.removeMessage({ sessionID: session.id, messageID: user.id })
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(pending)
        const current = (yield* sessions.messages({ sessionID: session.id })).find(
          (message) => message.info.id === user.id,
        )
        if (change === "user removal") {
          expect(current).toBeUndefined()
          return
        }
        expect(current?.info).toEqual({ ...user, task_id: task.id, summary: { ...user.summary, diffs: [] } })
        expect(yield* tasks.get({ session_id: session.id, id: task.id })).toMatchObject({
          owner: "main",
          status: "in_progress",
        })
      }),
    ),
  )
