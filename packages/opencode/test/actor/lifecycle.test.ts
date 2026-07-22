import { describe, expect, test } from "bun:test"
import { Deferred, Effect, Exit } from "effect"
import { SessionID } from "../../src/session/schema"
import { createActorLifecycle } from "../../src/actor/lifecycle"

const run = Effect.runPromise

describe("actor lifecycle coordinator", () => {
  test("keys include both the session and actor identity", () => {
    const lifecycle = createActorLifecycle<string, string>()
    const first = lifecycle.key(SessionID.make("session-a"), "actor")
    const second = lifecycle.key(SessionID.make("session-b"), "actor")

    expect(first).toBe("session-a:actor")
    expect(second).toBe("session-b:actor")
    expect(first).not.toBe(second)
  })

  test("publishes a wake result before releasing generation followers", async () => {
    const lifecycle = createActorLifecycle<string, string>()
    const key = lifecycle.key(SessionID.make("session"), "actor")
    await run(lifecycle.retainPersistent(key))

    const ownership = await run(lifecycle.acquireWake(key))
    expect(ownership._tag).toBe("owner")
    if (ownership._tag !== "owner") throw new Error("expected wake owner")

    const follower = await run(lifecycle.acquireWake(key))
    expect(follower._tag).toBe("follower")
    if (follower._tag !== "follower") throw new Error("expected wake follower")

    await run(lifecycle.finishGeneration(key, ownership.owner, Exit.succeed("done")))

    expect(await run(Deferred.isDone(follower.active.result))).toBe(true)
    expect(await run(Deferred.isDone(follower.active.done))).toBe(true)
    const result = await run(Deferred.await(follower.active.result))
    expect(Exit.isSuccess(result) ? result.value : undefined).toBe("done")
  })

  test("allows exactly one terminal claimant and clears cancellation with its generation", async () => {
    const lifecycle = createActorLifecycle<string, string>()
    const key = lifecycle.key(SessionID.make("session"), "actor")
    const owner = await run(lifecycle.startFork(key))

    expect(await run(lifecycle.claimTerminal(key, owner, "cancelled", "cancel"))).toBe(true)
    expect(await run(lifecycle.claimTerminal(key, owner, "completed", "turn"))).toBe(false)
    expect(await run(lifecycle.isCancelled(key))).toBe(true)

    await run(lifecycle.settleTerminal(owner))
    expect(await run(Deferred.isDone(owner.terminalDone))).toBe(true)
    await run(lifecycle.finishGeneration(key, owner))
    expect(await run(lifecycle.isCancelled(key))).toBe(false)
  })

  test("retains persistent context and numbering but releases ephemeral ownership", async () => {
    const lifecycle = createActorLifecycle<string, string>()
    const persistent = lifecycle.key(SessionID.make("session"), "persistent")
    await run(lifecycle.retainPersistent(persistent))
    await run(lifecycle.setForkContext(persistent, "persistent-context"))
    const first = await run(lifecycle.startFork(persistent))
    await run(lifecycle.finishForkWork(persistent, first, "persistent"))

    expect(await run(lifecycle.getForkContext(persistent))).toBe("persistent-context")
    const wake = await run(lifecycle.acquireWake(persistent))
    expect(wake._tag).toBe("owner")
    if (wake._tag !== "owner") throw new Error("expected persistent wake owner")
    expect(wake.owner.generation).toBe(2)
    await run(lifecycle.finishGeneration(persistent, wake.owner, Exit.succeed("done")))
    await run(lifecycle.retire(persistent))
    expect(await run(lifecycle.getForkContext(persistent))).toBeUndefined()
    expect((await run(lifecycle.startFork(persistent))).generation).toBe(1)

    const ephemeral = lifecycle.key(SessionID.make("session"), "ephemeral")
    await run(lifecycle.setForkContext(ephemeral, "ephemeral-context"))
    const ephemeralOwner = await run(lifecycle.startFork(ephemeral))
    await run(lifecycle.finishForkWork(ephemeral, ephemeralOwner, "ephemeral"))
    expect(await run(lifecycle.getForkContext(ephemeral))).toBeUndefined()
    expect((await run(lifecycle.startFork(ephemeral))).generation).toBe(1)
  })

  test("serializes cancel owners and followers and preserves delivered no-op behavior", async () => {
    const lifecycle = createActorLifecycle<string, string>()
    const key = lifecycle.key(SessionID.make("session"), "persistent")
    await run(lifecycle.retainPersistent(key))
    const generation = await run(lifecycle.startFork(key))

    const owner = await run(lifecycle.acquireCancel(key))
    expect(owner._tag).toBe("owner")
    if (owner._tag !== "owner") throw new Error("expected cancel owner")
    expect(owner.claimed).toBe(true)

    const follower = await run(lifecycle.acquireCancel(key))
    expect(follower._tag).toBe("follower")
    if (follower._tag !== "follower") throw new Error("expected cancel follower")
    expect(follower.episode).toBe(owner.episode)

    await run(lifecycle.releaseCancel(key, owner.episode))
    expect(await run(Deferred.isDone(follower.episode.done))).toBe(true)
    await run(lifecycle.settleTerminal(generation))
    await run(lifecycle.finishGeneration(key, generation))

    const deliveredKey = lifecycle.key(SessionID.make("session"), "ephemeral")
    const delivered = await run(lifecycle.startFork(deliveredKey))
    await run(lifecycle.markDelivered(deliveredKey, delivered))
    expect((await run(lifecycle.acquireCancel(deliveredKey)))._tag).toBe("noop")
  })
})
