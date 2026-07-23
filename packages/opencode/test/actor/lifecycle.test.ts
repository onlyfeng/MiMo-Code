import { describe, expect, test } from "bun:test"
import { Deferred, Effect, Exit, Layer } from "effect"
import { SessionID } from "../../src/session/schema"
import { createActorLifecycle } from "../../src/actor/lifecycle"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.empty)

describe("actor lifecycle coordinator", () => {
  test("keys include both the session and actor identity", () => {
    const lifecycle = createActorLifecycle<string, string>()
    const first = lifecycle.key(SessionID.make("session-a"), "actor")
    const second = lifecycle.key(SessionID.make("session-b"), "actor")

    expect(first).not.toBe(second)
  })

  test("keys cannot collide when either identity component contains a separator", () => {
    const lifecycle = createActorLifecycle<string, string>()

    expect(lifecycle.key(SessionID.make("ses:a"), "b")).not.toBe(lifecycle.key(SessionID.make("ses"), "a:b"))
  })

  it.effect(
    "publishes a wake result before releasing generation followers",
    Effect.gen(function* () {
      const lifecycle = createActorLifecycle<string, string>()
      const key = lifecycle.key(SessionID.make("session"), "actor")
      yield* lifecycle.retainPersistent(key)

      const ownership = yield* lifecycle.acquireWake(key)
      expect(ownership._tag).toBe("owner")
      if (ownership._tag !== "owner") throw new Error("expected wake owner")

      const follower = yield* lifecycle.acquireWake(key)
      expect(follower._tag).toBe("follower")
      if (follower._tag !== "follower") throw new Error("expected wake follower")

      // @ts-expect-error wake completion must publish its shared terminal Exit
      lifecycle.finishWake(key, ownership.owner)
      yield* lifecycle.finishWake(key, ownership.owner, Exit.succeed("done"))

      expect(yield* Deferred.isDone(follower.active.result)).toBe(true)
      expect(yield* Deferred.isDone(follower.active.done)).toBe(true)
      const result = yield* Deferred.await(follower.active.result)
      expect(Exit.isSuccess(result) ? result.value : undefined).toBe("done")
    }),
  )

  it.effect(
    "allows exactly one terminal claimant and clears cancellation with its generation",
    Effect.gen(function* () {
      const lifecycle = createActorLifecycle<string, string>()
      const key = lifecycle.key(SessionID.make("session"), "actor")
      const owner = yield* lifecycle.startFork(key)

      expect(yield* lifecycle.claimTerminal(key, owner, "cancelled", "cancel")).toBe(true)
      expect(yield* lifecycle.claimTerminal(key, owner, "completed", "turn")).toBe(false)
      expect(yield* lifecycle.isCancelled(key)).toBe(true)

      yield* lifecycle.settleTerminal(owner)
      expect(yield* Deferred.isDone(owner.terminalDone)).toBe(true)
      yield* lifecycle.finishFork(key, owner)
      expect(yield* lifecycle.isCancelled(key)).toBe(false)
    }),
  )

  it.effect(
    "retains persistent context and numbering but releases ephemeral ownership",
    Effect.gen(function* () {
      const lifecycle = createActorLifecycle<string, string>()
      const persistent = lifecycle.key(SessionID.make("session"), "persistent")
      yield* lifecycle.retainPersistent(persistent)
      yield* lifecycle.setForkContext(persistent, "persistent-context")
      const first = yield* lifecycle.startFork(persistent)
      yield* lifecycle.finishForkWork(persistent, first, "persistent")

      expect(yield* lifecycle.getForkContext(persistent)).toBe("persistent-context")
      const wake = yield* lifecycle.acquireWake(persistent)
      expect(wake._tag).toBe("owner")
      if (wake._tag !== "owner") throw new Error("expected persistent wake owner")
      expect(wake.owner.generation).toBe(2)
      yield* lifecycle.finishWake(persistent, wake.owner, Exit.succeed("done"))
      yield* lifecycle.retire(persistent)
      expect(yield* lifecycle.getForkContext(persistent)).toBeUndefined()
      expect((yield* lifecycle.startFork(persistent)).generation).toBe(1)

      const ephemeral = lifecycle.key(SessionID.make("session"), "ephemeral")
      yield* lifecycle.setForkContext(ephemeral, "ephemeral-context")
      const ephemeralOwner = yield* lifecycle.startFork(ephemeral)
      yield* lifecycle.finishForkWork(ephemeral, ephemeralOwner, "ephemeral")
      expect(yield* lifecycle.getForkContext(ephemeral)).toBeUndefined()
      expect((yield* lifecycle.startFork(ephemeral)).generation).toBe(1)
    }),
  )

  it.effect(
    "serializes cancel owners and followers and preserves delivered no-op behavior",
    Effect.gen(function* () {
      const lifecycle = createActorLifecycle<string, string>()
      const key = lifecycle.key(SessionID.make("session"), "persistent")
      yield* lifecycle.retainPersistent(key)
      const generation = yield* lifecycle.startFork(key)

      const owner = yield* lifecycle.acquireCancel(key)
      expect(owner._tag).toBe("owner")
      if (owner._tag !== "owner") throw new Error("expected cancel owner")
      expect(owner.claimed).toBe(true)

      const follower = yield* lifecycle.acquireCancel(key)
      expect(follower._tag).toBe("follower")
      if (follower._tag !== "follower") throw new Error("expected cancel follower")
      expect(follower.episode).toBe(owner.episode)

      yield* lifecycle.releaseCancel(key, owner.episode)
      expect(yield* Deferred.isDone(follower.episode.done)).toBe(true)
      yield* lifecycle.settleTerminal(generation)
      yield* lifecycle.finishFork(key, generation)

      const deliveredKey = lifecycle.key(SessionID.make("session"), "ephemeral")
      const delivered = yield* lifecycle.startFork(deliveredKey)
      yield* lifecycle.markDelivered(deliveredKey, delivered)
      expect((yield* lifecycle.acquireCancel(deliveredKey))._tag).toBe("noop")
    }),
  )
})
