import { afterEach, expect, test } from "bun:test"
import { Effect, Schedule } from "effect"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instance } from "../../src/project/instance"
import { SessionPrompt } from "../../src/session/prompt"
import { MessageID } from "../../src/session/schema"
import { withActor } from "../fixture/retained-recovery-actor"

afterEach(() => Instance.disposeAll())

test("POST main resume cascades a retained actor with its original task and frozen context", async () => {
  await withActor(async (fixture) => {
    const parent = await AppRuntime.runPromise(fixture.sessions.messages({ sessionID: fixture.parent.id }))
    const originalUser = parent.findLast((message) => message.info.role === "user")!.info
    if (originalUser.role !== "user") throw new Error("Missing parent user")
    const shell = await AppRuntime.runPromise(fixture.sessions.updateMessage({
      id: MessageID.ascending(), sessionID: fixture.parent.id, parentID: originalUser.id,
      role: "assistant", mode: "build", agent: "build",
      path: { cwd: fixture.directory, root: fixture.directory }, cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      providerID: originalUser.model.providerID, modelID: originalUser.model.modelID,
      time: { created: Date.now() },
    }))
    const response = await fixture.request(`/session/${fixture.parent.id}/turn/${shell.id}/resume`, { method: "POST" })
    expect(response.status).toBe(202)
    await AppRuntime.runPromise(Effect.sync(() => fixture.requests.length).pipe(
      Effect.repeat({ until: (count) => count === 2, schedule: Schedule.spaced("20 millis") }),
      Effect.timeout("10 seconds"),
    ))
    fixture.release()
    await AppRuntime.runPromise(fixture.registry.get(fixture.spawned.sessionID, fixture.spawned.actorID).pipe(
      Effect.repeat({ until: (row) => row?.status === "idle" && row.lastOutcome === "success", schedule: Schedule.spaced("20 millis") }),
      Effect.timeout("10 seconds"),
    ))
    const after = await AppRuntime.runPromise(fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }))
    expect(after.filter((message) => message.info.role === "user")).toEqual(fixture.before.filter((message) => message.info.role === "user"))
    expect(after.at(-1)?.parts.some((part) => part.type === "text" && part.text === "Recovered HTTP actor result.")).toBe(true)
    expect(fixture.requests[1].messages.filter((message) => message.role === "system")).toEqual(fixture.requests[0].messages.filter((message) => message.role === "system"))
    expect(await AppRuntime.runPromise(fixture.actor.getForkContext(fixture.spawned.sessionID, fixture.spawned.actorID))).toBe(fixture.frozen)
    const again = await AppRuntime.runPromise(SessionPrompt.Service.use((prompt) => prompt.cascadeSubagentResume(fixture.parent.id)))
    expect(again.find((item) => item.actorID === fixture.spawned.actorID)?.status).toBe("skipped")
  })
}, 30_000)
