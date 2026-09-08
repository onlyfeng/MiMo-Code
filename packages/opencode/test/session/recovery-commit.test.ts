import { describe, expect } from "bun:test"
import { Cause, Deferred, Effect, Exit, Layer } from "effect"
import { Bus } from "../../src/bus"
import { GlobalBus, type GlobalEvent } from "../../src/bus/global"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { TaskRegistry } from "../../src/task/registry"
import { Updated as TaskUpdated } from "../../src/task/events"
import { TaskTable, TaskEventTable } from "../../src/task/task.sql"
import { MessageTable } from "../../src/session/session.sql"
import { Database, eq, sql, NotFoundError } from "../../src/storage"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(
  Layer.mergeAll(Session.defaultLayer, TaskRegistry.defaultLayer, Bus.defaultLayer, CrossSpawnSpawner.defaultLayer),
)
const seed = Effect.fn(function* (actorID = "main", taskID?: string) {
  const sessions = yield* Session.Service
  const session = yield* sessions.create({ title: "Atomic recovery" })
  const user: MessageV2.User = {
    id: MessageID.ascending(),
    sessionID: session.id,
    role: "user",
    agentID: actorID,
    agent: "plan",
    model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test"), variant: "preserve-me" },
    time: { created: 100 },
    task_id: taskID,
  }
  const assistant: MessageV2.Assistant = {
    id: MessageID.ascending(),
    sessionID: session.id,
    role: "assistant",
    agentID: actorID,
    parentID: user.id,
    agent: "plan",
    mode: "plan",
    path: { cwd: "/fixture", root: "/fixture" },
    providerID: user.model.providerID,
    modelID: user.model.modelID,
    time: { created: 200 },
    cost: 2,
    tokens: { input: 7, output: 3, reasoning: 1, cache: { read: 0, write: 0 } },
  }
  yield* sessions.updateMessage(user)
  yield* sessions.updateMessage(assistant)
  return {
    sessions,
    session,
    user,
    assistant,
    input: { sessionID: session.id, actorID, assistantMessageID: assistant.id, parentMessageID: user.id },
  }
})
const stored = (id: MessageID) =>
  Database.use((db) => db.select().from(MessageTable).where(eq(MessageTable.id, id)).get())
const taskRows = () =>
  Database.use((db) => ({ tasks: db.select().from(TaskTable).all(), events: db.select().from(TaskEventTable).all() }))

describe("Session.commitRecoveryCandidate", () => {
  it.live("hands off the committed recovery before a synchronous postcommit publisher throws", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        const tasks = yield* TaskRegistry.Service
        const task = yield* tasks.create({ session_id: f.session.id, summary: "Postcommit ownership" })
        let committed = false
        const listener = (event: GlobalEvent) => {
          if (event.payload.type === "sync" && event.payload.syncEvent.aggregateID === f.session.id)
            throw new Error("postcommit publisher fixture failure")
        }
        GlobalBus.on("event", listener)
        const result = yield* f.sessions
          .commitRecoveryCandidate({
            ...f.input,
            taskID: task.id,
            taskSessionID: f.session.id,
            onCommitted: () => {
              committed = true
            },
          })
          .pipe(
            Effect.exit,
            Effect.ensuring(
              Effect.sync(() => {
                GlobalBus.off("event", listener)
              }),
            ),
          )
        expect(Exit.isFailure(result)).toBe(true)
        expect(stored(f.user.id)?.data).toMatchObject({ task_id: task.id })
        expect(stored(f.assistant.id)?.data.time).toHaveProperty("completed")
        expect(yield* tasks.get({ session_id: f.session.id, id: task.id })).toMatchObject({
          status: "in_progress",
          owner: "main",
        })
        expect(committed).toBe(true)
      }),
    ),
  )

  it.live("checks cancellation after effect setup before any transactional writes", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        const tasks = yield* TaskRegistry.Service
        const task = yield* tasks.create({ session_id: f.session.id, summary: "Withdrawn recovery" })
        const before = { user: stored(f.user.id), assistant: stored(f.assistant.id), ...taskRows() }
        let committed = false
        const result = yield* f.sessions
          .commitRecoveryCandidate({
            ...f.input,
            taskID: task.id,
            taskSessionID: f.session.id,
            shouldCommit: () => false,
            onCommitted: () => {
              committed = true
            },
          })
          .pipe(Effect.exit)
        expect(Exit.isFailure(result)).toBe(true)
        if (Exit.isFailure(result)) expect(Cause.hasInterrupts(result.cause)).toBe(true)
        expect(committed).toBe(false)
        expect({ user: stored(f.user.id), assistant: stored(f.assistant.id), ...taskRows() }).toEqual(before)
      }),
    ),
  )

  it.live("commits task claim, original user binding and assistant settlement before handing off", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed("actor-a")
        const tasks = yield* TaskRegistry.Service
        const namespace = yield* f.sessions.create()
        const task = yield* tasks.create({ session_id: namespace.id, summary: "Trusted parent task" })
        const unrelated = yield* f.sessions.updateMessage({
          ...f.user,
          id: MessageID.ascending(),
          agentID: "actor-b",
          time: { created: 999 },
        })
        const bus = yield* Bus.Service
        const events: string[] = []
        const published = yield* Deferred.make<void>()
        yield* bus.subscribeCallback(TaskUpdated, (event) => {
          if (event.properties.sessionID !== namespace.id) return
          events.push(event.properties.kind)
          Deferred.doneUnsafe(published, Exit.void)
        })
        const result = yield* f.sessions.commitRecoveryCandidate({
          ...f.input,
          taskID: task.id,
          taskSessionID: namespace.id,
          onCommitted: () => {
            expect(stored(f.user.id)?.data).toMatchObject({ task_id: task.id, model: { variant: "preserve-me" } })
            expect(stored(f.assistant.id)?.data.time).toHaveProperty("completed")
            expect(taskRows().tasks.find((item) => item.session_id === namespace.id)?.owner).toBe("actor-a")
          },
        })
        expect(result).toEqual({ ...f.user, task_id: task.id })
        expect(stored(unrelated.id)?.data.time.created).toBe(999)
        expect(
          (yield* tasks.events({ session_id: namespace.id, task_id: task.id })).map((event) => event.kind),
        ).toEqual(["created", "started"])
        yield* Deferred.await(published).pipe(Effect.timeout("2 seconds"))
        expect(events).toEqual(["started"])
      }),
    ),
  )

  for (const requested of [undefined, "T9"])
    it.live(`preserves an existing historical task when request is ${requested ?? "omitted"}`, () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const f = yield* seed("main", "T9")
          const before = stored(f.user.id)
          const beforeTasks = taskRows()
          const result = yield* f.sessions.commitRecoveryCandidate({ ...f.input, taskID: requested })
          expect(result.task_id).toBe("T9")
          expect(stored(f.user.id)).toEqual(before)
          expect(taskRows()).toEqual(beforeTasks)
        }),
      ),
    )

  for (const scenario of [
    "mismatch",
    "missing-namespace",
    "wrong-namespace",
    "owner",
    "blocked",
    "done",
    "abandoned",
  ] as const) {
    it.live(`rejects ${scenario} without any recovery writes or ownership callback`, () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const f = yield* seed("actor-a", scenario === "mismatch" ? "T8" : undefined)
          const tasks = yield* TaskRegistry.Service
          const task = yield* tasks.create({
            session_id: f.session.id,
            summary: "Original task",
            owner: scenario === "owner" ? "actor-b" : undefined,
          })
          if (scenario === "blocked" || scenario === "done" || scenario === "abandoned")
            Database.use((db) =>
              db.update(TaskTable).set({ status: scenario }).where(eq(TaskTable.session_id, f.session.id)).run(),
            )
          const foreign = yield* f.sessions.create()
          const before = { user: stored(f.user.id), assistant: stored(f.assistant.id), ...taskRows() }
          let committed = false
          const result = yield* f.sessions
            .commitRecoveryCandidate({
              ...f.input,
              taskID: task.id,
              taskSessionID:
                scenario === "missing-namespace"
                  ? undefined
                  : scenario === "wrong-namespace"
                    ? foreign.id
                    : f.session.id,
              onCommitted: () => {
                committed = true
              },
            })
            .pipe(Effect.flip)
          expect(result).toBeInstanceOf(scenario.includes("namespace") ? NotFoundError : Session.RecoveryConflictError)
          expect(committed).toBe(false)
          expect({ user: stored(f.user.id), assistant: stored(f.assistant.id), ...taskRows() }).toEqual(before)
        }),
      ),
    )
  }

  for (const taskID of ["T99", "not-a-task"])
    it.live(`does not persist unavailable task binding ${taskID}`, () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const f = yield* seed()
          const before = { user: stored(f.user.id), assistant: stored(f.assistant.id), ...taskRows() }
          expect(
            yield* f.sessions
              .commitRecoveryCandidate({ ...f.input, taskID, taskSessionID: f.session.id })
              .pipe(Effect.flip),
          ).toBeInstanceOf(NotFoundError)
          expect({ user: stored(f.user.id), assistant: stored(f.assistant.id), ...taskRows() }).toEqual(before)
        }),
      ),
    )

  it.live("rejects a stale same-actor candidate and a second competing commit", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        yield* f.sessions.updateMessage({ ...f.user, id: MessageID.ascending(), time: { created: 300 } })
        expect(yield* f.sessions.commitRecoveryCandidate(f.input).pipe(Effect.flip)).toBeInstanceOf(NotFoundError)
        expect(stored(f.assistant.id)?.data.time).not.toHaveProperty("completed")
        const fresh = yield* seed("actor-a")
        const results = yield* Effect.all(
          [
            fresh.sessions.commitRecoveryCandidate(fresh.input).pipe(Effect.exit),
            fresh.sessions.commitRecoveryCandidate(fresh.input).pipe(Effect.exit),
          ],
          { concurrency: "unbounded" },
        )
        expect(results.filter(Exit.isSuccess)).toHaveLength(1)
        expect(results.filter(Exit.isFailure)).toHaveLength(1)
      }),
    ),
  )

  it.live("omission leaves missing binding untouched and an already owned task emits no second start", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        const before = stored(f.user.id)
        const result = yield* f.sessions.commitRecoveryCandidate(f.input)
        expect(result.task_id).toBeUndefined()
        expect(stored(f.user.id)).toEqual(before)
        const owned = yield* seed("actor-a")
        const tasks = yield* TaskRegistry.Service
        const task = yield* tasks.create({ session_id: owned.session.id, summary: "Owned" })
        yield* tasks.start({ session_id: owned.session.id, id: task.id, owner: "actor-a" })
        const beforeTasks = taskRows()
        yield* owned.sessions.commitRecoveryCandidate({
          ...owned.input,
          taskID: task.id,
          taskSessionID: owned.session.id,
        })
        expect(stored(owned.user.id)?.data).toMatchObject({ task_id: task.id })
        expect(taskRows()).toEqual(beforeTasks)
      }),
    ),
  )

  it.live("concurrent actors cannot claim the same task from one trusted namespace", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const a = yield* seed("actor-a")
        const b = yield* seed("actor-b")
        const tasks = yield* TaskRegistry.Service
        const task = yield* tasks.create({ session_id: a.session.id, summary: "Contended" })
        const results = yield* Effect.all(
          [a, b].map((f) =>
            f.sessions
              .commitRecoveryCandidate({ ...f.input, taskID: task.id, taskSessionID: a.session.id })
              .pipe(Effect.exit),
          ),
          { concurrency: "unbounded" },
        )
        expect(results.filter(Exit.isSuccess)).toHaveLength(1)
        expect(results.filter(Exit.isFailure)).toHaveLength(1)
        const loser = Exit.isFailure(results[0]) ? a : b
        expect(stored(loser.user.id)?.data).not.toHaveProperty("task_id")
        expect(stored(loser.assistant.id)?.data.time).not.toHaveProperty("completed")
        expect(
          (yield* tasks.events({ session_id: a.session.id, task_id: task.id })).filter(
            (event) => event.kind === "started",
          ),
        ).toHaveLength(1)
      }),
    ),
  )

  it.live("rolls back task rows and events when the message write fails and keeps DB errors as defects", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const f = yield* seed()
        const tasks = yield* TaskRegistry.Service
        const task = yield* tasks.create({ session_id: f.session.id, summary: "Rollback claim" })
        const before = { user: stored(f.user.id), assistant: stored(f.assistant.id), ...taskRows() }
        let committed = false
        Database.use((db) =>
          db.run(
            sql`CREATE TEMP TRIGGER reject_recovery_binding BEFORE UPDATE ON message WHEN json_extract(new.data, '$.role') = 'assistant' AND json_extract(new.data, '$.time.completed') IS NOT NULL BEGIN SELECT RAISE(ABORT, 'recovery fixture write failure'); END`,
          ),
        )
        const result = yield* f.sessions
          .commitRecoveryCandidate({
            ...f.input,
            taskID: task.id,
            taskSessionID: f.session.id,
            onCommitted: () => {
              committed = true
            },
          })
          .pipe(
            Effect.exit,
            Effect.ensuring(Effect.sync(() => Database.use((db) => db.run(sql`DROP TRIGGER reject_recovery_binding`)))),
          )
        expect(Exit.isFailure(result)).toBe(true)
        if (Exit.isFailure(result)) {
          expect(result.cause.reasons.every(Cause.isDieReason)).toBe(true)
          expect(result.cause.toString()).toContain("recovery fixture write failure")
        }
        expect(committed).toBe(false)
        expect({ user: stored(f.user.id), assistant: stored(f.assistant.id), ...taskRows() }).toEqual(before)
      }),
    ),
  )
})
