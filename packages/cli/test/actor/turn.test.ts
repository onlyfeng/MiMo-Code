import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Fiber, Layer, ManagedRuntime } from "effect"
import { Instance } from "../../src/project/instance"
import { ActorRegistry } from "../../src/actor/registry"
import { Bus } from "../../src/bus"
import { Session } from "../../src/session"
import { runTurn } from "../../src/actor/turn"
import { tmpdir } from "../fixture/fixture"

const testLayer = Layer.mergeAll(ActorRegistry.defaultLayer, Bus.defaultLayer, Session.defaultLayer)

afterEach(async () => {
  await Instance.disposeAll()
})

async function withTurn(
  directory: string,
  fn: (
    rt: ManagedRuntime.ManagedRuntime<ActorRegistry.Service | Bus.Service | Session.Service, never>,
  ) => Promise<void>,
) {
  return Instance.provide({
    directory,
    fn: async () => {
      const rt = ManagedRuntime.make(testLayer)
      try {
        await fn(rt)
      } finally {
        await rt.dispose()
      }
    },
  })
}

describe("runTurn (Plan 1 / Task 3)", () => {
  test("running → idle / success when work succeeds", async () => {
    await using tmp = await tmpdir({ git: true })
    await withTurn(tmp.path, async (rt) => {
      const parent = await rt.runPromise(Session.Service.use((s) => s.create()))
      const sid = parent.id
      await rt.runPromise(
        ActorRegistry.Service.use((reg) =>
          reg.register({
            sessionID: sid,
            actorID: "turn-actor-a",
            mode: "subagent",
            parentActorID: undefined,
            agent: "main",
            description: "main",
            contextMode: "full",
            contextWatermark: undefined,
            background: false,
            lifecycle: "persistent",
          }),
        ),
      )
      const result = await rt.runPromise(runTurn(sid, "turn-actor-a", Effect.succeed("hello")))
      expect(result).toBe("hello")
      const entry = await rt.runPromise(ActorRegistry.Service.use((reg) => reg.get(sid, "turn-actor-a")))
      expect(entry?.status).toBe("idle")
      expect(entry?.lastOutcome).toBe("success")
      expect(entry?.lastError).toBeUndefined()
    })
  })

  test("finalize false leaves the generation owner responsible for the terminal registry write", async () => {
    await using tmp = await tmpdir({ git: true })
    await withTurn(tmp.path, async (rt) => {
      const parent = await rt.runPromise(Session.Service.use((s) => s.create()))
      const sid = parent.id
      await rt.runPromise(
        ActorRegistry.Service.use((reg) =>
          reg.register({
            sessionID: sid,
            actorID: "turn-generation-owned",
            mode: "subagent",
            parentActorID: undefined,
            agent: "main",
            description: "main",
            contextMode: "full",
            contextWatermark: undefined,
            background: false,
            lifecycle: "persistent",
          }),
        ),
      )
      await rt.runPromise(
        ActorRegistry.Service.use((reg) =>
          reg.updateStatus(sid, "turn-generation-owned", {
            status: "idle",
            lastOutcome: "failure",
            lastError: "previous generation",
          }),
        ),
      )

      const result = await rt.runPromise(
        runTurn(sid, "turn-generation-owned", Effect.succeed("hello"), { finalize: false }),
      )
      expect(result).toBe("hello")
      const entry = await rt.runPromise(ActorRegistry.Service.use((reg) => reg.get(sid, "turn-generation-owned")))
      expect(entry?.status).toBe("running")
      expect(entry?.lastOutcome).toBe("failure")
      expect(entry?.lastError).toBe("previous generation")
    })
  })

  test("running → idle / failure with last_error on Effect.fail", async () => {
    await using tmp = await tmpdir({ git: true })
    await withTurn(tmp.path, async (rt) => {
      const parent = await rt.runPromise(Session.Service.use((s) => s.create()))
      const sid = parent.id
      await rt.runPromise(
        ActorRegistry.Service.use((reg) =>
          reg.register({
            sessionID: sid,
            actorID: "turn-actor-b",
            mode: "subagent",
            parentActorID: undefined,
            agent: "main",
            description: "main",
            contextMode: "full",
            contextWatermark: undefined,
            background: false,
            lifecycle: "ephemeral",
          }),
        ),
      )
      const exit = await rt.runPromise(runTurn(sid, "turn-actor-b", Effect.fail(new Error("boom"))).pipe(Effect.exit))
      expect(exit._tag).toBe("Failure")
      const entry = await rt.runPromise(ActorRegistry.Service.use((reg) => reg.get(sid, "turn-actor-b")))
      expect(entry?.status).toBe("idle")
      expect(entry?.lastOutcome).toBe("failure")
      expect(entry?.lastError).toContain("boom")
    })
  })

  test("running → idle / cancelled on Fiber.interrupt", async () => {
    await using tmp = await tmpdir({ git: true })
    await withTurn(tmp.path, async (rt) => {
      const parent = await rt.runPromise(Session.Service.use((s) => s.create()))
      const sid = parent.id
      await rt.runPromise(
        ActorRegistry.Service.use((reg) =>
          reg.register({
            sessionID: sid,
            actorID: "turn-actor-c",
            mode: "subagent",
            parentActorID: undefined,
            agent: "main",
            description: "main",
            contextMode: "full",
            contextWatermark: undefined,
            background: false,
            lifecycle: "ephemeral",
          }),
        ),
      )
      const fiber = rt.runFork(runTurn(sid, "turn-actor-c", Effect.never))
      await new Promise((res) => setTimeout(res, 50))
      await rt.runPromise(Fiber.interrupt(fiber).pipe(Effect.ignore))
      await new Promise((res) => setTimeout(res, 100))
      const entry = await rt.runPromise(ActorRegistry.Service.use((reg) => reg.get(sid, "turn-actor-c")))
      expect(entry?.status).toBe("idle")
      expect(entry?.lastOutcome).toBe("cancelled")
      expect(entry?.lastError).toBeUndefined()
    })
  })

  test("external cancellation remains final when work completes late", async () => {
    await using tmp = await tmpdir({ git: true })
    await withTurn(tmp.path, async (rt) => {
      const parent = await rt.runPromise(Session.Service.use((s) => s.create()))
      const sid = parent.id
      await rt.runPromise(
        ActorRegistry.Service.use((reg) =>
          reg.register({
            sessionID: sid,
            actorID: "turn-actor-d",
            mode: "subagent",
            parentActorID: undefined,
            agent: "main",
            description: "main",
            contextMode: "full",
            contextWatermark: undefined,
            background: false,
            lifecycle: "ephemeral",
          }),
        ),
      )
      const cancelled = { current: false }
      const release = { current: undefined as undefined | (() => void) }
      const lateWork = new Promise<string>((resolve) => {
        release.current = () => resolve("late success")
      })
      const fiber = rt.runFork(
        runTurn(
          sid,
          "turn-actor-d",
          Effect.promise(() => lateWork),
          {
            isCancelled: Effect.sync(() => cancelled.current),
          },
        ),
      )
      await new Promise((res) => setTimeout(res, 50))
      cancelled.current = true
      await rt.runPromise(
        ActorRegistry.Service.use((reg) =>
          reg.updateStatus(sid, "turn-actor-d", {
            status: "idle",
            lastOutcome: "cancelled",
            lastError: undefined,
          }),
        ),
      )
      release.current?.()
      await rt.runPromise(Fiber.await(fiber))
      const entry = await rt.runPromise(ActorRegistry.Service.use((reg) => reg.get(sid, "turn-actor-d")))
      expect(entry?.status).toBe("idle")
      expect(entry?.lastOutcome).toBe("cancelled")
      expect(entry?.lastError).toBeUndefined()
    })
  })
})
