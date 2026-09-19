import { afterEach, expect, test } from "bun:test"
import { Deferred, Effect, Fiber, Schedule } from "effect"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instance } from "../../src/project/instance"
import { SessionPrompt } from "../../src/session/prompt"
import { withActor } from "../fixture/retained-recovery-actor"

afterEach(() => Instance.disposeAll())

for (const state of ["running", "pending", "cancelled", "old-epoch"] as const) {
  test(`cascade does not reclaim ${state} actors`, async () => {
    await withActor(async (fixture) => {
      const prompt = await AppRuntime.runPromise(SessionPrompt.Service.use(Effect.succeed))
      if (state === "cancelled") await AppRuntime.runPromise(fixture.actor.cancel(fixture.spawned.sessionID, fixture.spawned.actorID, "forced"))
      if (state === "old-epoch") await AppRuntime.runPromise(prompt.cancel(fixture.parent.id))
      if (state === "running" || state === "pending") await AppRuntime.runPromise(fixture.registry.updateStatus(fixture.spawned.sessionID, fixture.spawned.actorID, { status: state }))
      const before = await AppRuntime.runPromise(fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }))
      const outcomes = await AppRuntime.runPromise(prompt.cascadeSubagentResume(fixture.parent.id, 0))
      expect(outcomes.find((item) => item.actorID === fixture.spawned.actorID)).toMatchObject({ status: "skipped", reason: state === "old-epoch" ? "cascade-cancelled" : state === "cancelled" ? "no-recovery-candidate" : "live" })
      expect(fixture.requests).toHaveLength(1)
      expect(await AppRuntime.runPromise(fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }))).toEqual(before)
    })
  }, 30_000)
}

test("cascade skips peers", async () => {
  await withActor(async (fixture) => {
    const outcomes = await AppRuntime.runPromise(SessionPrompt.Service.use((prompt) => prompt.cascadeSubagentResume(fixture.spawned.sessionID)))
    expect(outcomes).toEqual([])
    expect(fixture.requests).toHaveLength(1)
  }, { mode: "peer" })
}, 30_000)

for (const action of ["stop", "timeout"] as const) {
  test(`cascade ${action} withdraws pending admission without late model calls`, async () => {
    await withActor(async (fixture) => {
      await AppRuntime.runPromise(Effect.gen(function* () {
        const prompt = yield* SessionPrompt.Service
        const entered = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        const restore = prompt.bindActor!({
          ...fixture.actor,
          resume: (input) => Deferred.succeed(entered, undefined).pipe(
            Effect.andThen(Deferred.await(release)),
            Effect.andThen(Effect.suspend(() => fixture.actor.resume!(input))),
          ),
        })
        yield* Effect.addFinalizer(() => Effect.sync(restore).pipe(Effect.andThen(Deferred.succeed(release, undefined))))
        const cascade = yield* prompt.cascadeSubagentResume(fixture.parent.id).pipe(Effect.forkChild)
        yield* Deferred.await(entered).pipe(Effect.timeout("5 seconds"))
        if (action === "stop") yield* prompt.cancel(fixture.parent.id)
        const result = yield* Fiber.join(cascade).pipe(Effect.timeout("12 seconds"))
        expect(result.find((item) => item.actorID === fixture.spawned.actorID)?.status).toBe("failed")
        yield* Deferred.succeed(release, undefined)
        yield* Effect.sleep("50 millis")
        expect(fixture.requests).toHaveLength(1)
        expect(yield* fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID })).toEqual(fixture.before)
      }).pipe(Effect.scoped))
    })
  }, 30_000)
}

test("cascade admits multiple retained subagents through independent lifecycle owners", async () => {
  await withActor(async (fixture) => {
    const second = await AppRuntime.runPromise(fixture.actor.spawn({
      mode: "subagent", sessionID: fixture.parent.id, parentActorID: "main", agentType: "explore",
      task: "Second retained actor", context: "full", lifecycle: "persistent", background: false,
      model: fixture.frozen.model, tools: [], forkContext: fixture.frozen,
    }))
    expect((await AppRuntime.runPromise(Deferred.await(second.outcome))).status).toBe("success")
    const messages = await AppRuntime.runPromise(fixture.sessions.messages({ sessionID: second.sessionID, agentID: second.actorID }))
    const last = messages.at(-1)!.info
    if (last.role !== "assistant") throw new Error("Missing second assistant")
    await AppRuntime.runPromise(fixture.sessions.updateMessage({ ...last, finish: undefined, time: { created: last.time.created } }))
    const outcomes = await AppRuntime.runPromise(SessionPrompt.Service.use((prompt) => prompt.cascadeSubagentResume(fixture.parent.id)))
    expect(outcomes.filter((item) => item.status === "resumed").map((item) => item.actorID).sort()).toEqual([fixture.spawned.actorID, second.actorID].sort())
    fixture.release()
    await AppRuntime.runPromise(fixture.registry.get(second.sessionID, second.actorID).pipe(
      Effect.repeat({ until: (row) => row?.status === "idle" && row.lastOutcome === "success", schedule: Schedule.spaced("20 millis") }), Effect.timeout("10 seconds"),
    ))
    await AppRuntime.runPromise(fixture.actor.cancel(second.sessionID, second.actorID, "forced"))
  })
}, 30_000)
