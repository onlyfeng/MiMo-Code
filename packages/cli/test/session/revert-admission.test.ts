import { describe, expect } from "bun:test"
import { Deferred, Effect, Fiber, Layer } from "effect"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionRevert } from "../../src/session/revert"
import type { SessionID } from "../../src/session/schema"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

// FC-051: a revert and a prompt's admission exclude each other per session.
const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer))

const config = {
  config: {
    model: "gate-test/test-model",
    provider: {
      "gate-test": {
        npm: "@ai-sdk/openai-compatible",
        options: { baseURL: "http://127.0.0.1:9/v1", apiKey: "test" },
        models: { "test-model": { name: "Test", tool_call: true, limit: { context: 100_000, output: 4_000 } } },
      },
    },
  },
}

const send = (sessionID: SessionID, text: string) =>
  SessionPrompt.Service.use((prompt) =>
    prompt.prompt({ sessionID, agent: "build", noReply: true, parts: [{ type: "text", text }] }),
  )

const texts = (sessionID: SessionID) =>
  Session.Service.use((sessions) => sessions.messages({ sessionID })).pipe(
    Effect.map((messages) =>
      messages.flatMap((message) => message.parts.flatMap((part) => (part.type === "text" ? [part.text] : []))),
    ),
  )

// Holds `lock` on the session until the returned release runs.
const hold = (lock: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const entered = yield* Deferred.make<void>()
    const released = yield* Deferred.make<void>()
    const fiber = yield* lock(Deferred.succeed(entered, undefined).pipe(Effect.andThen(Deferred.await(released)))).pipe(
      Effect.forkChild,
    )
    yield* Deferred.await(entered)
    return Deferred.succeed(released, undefined).pipe(Effect.andThen(Fiber.join(fiber)))
  })

describe("revert and prompt admission", () => {
  it.live(
    "a prompt sent while the session is held for a revert waits, then lands",
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const session = yield* Session.Service.use((sessions) => sessions.create({}))
          // A first prompt pays the session's one-time setup, so the timing below
          // measures only the wait for the held session.
          yield* send(session.id, "before")
          const release = yield* hold(SessionRevert.exclusive(session.id))

          const sent = yield* send(session.id, "after undo").pipe(Effect.forkChild)
          yield* Effect.sleep("1 second")
          // The admission is waiting: its user message does not exist yet.
          expect(yield* texts(session.id)).toEqual(["before"])

          yield* release
          yield* Fiber.join(sent)
          expect(yield* texts(session.id)).toEqual(["before", "after undo"])
        }),
      config,
    ),
  )

  it.live(
    "a revert waits for a prompt admission in progress, then applies",
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const session = yield* Session.Service.use((sessions) => sessions.create({}))
          yield* send(session.id, "first")
          const second = yield* send(session.id, "second")
          const release = yield* hold(SessionRevert.admission(session.id))

          const reverting = yield* SessionRevert.Service.use((revert) =>
            revert.revert({ sessionID: session.id, messageID: second.info.id }),
          ).pipe(Effect.forkChild)
          yield* Effect.sleep("200 millis")
          expect((yield* Session.Service.use((sessions) => sessions.get(session.id))).revert).toBeUndefined()

          yield* release
          yield* Fiber.join(reverting)
          expect((yield* Session.Service.use((sessions) => sessions.get(session.id))).revert?.messageID).toBe(
            second.info.id,
          )

          // The next prompt commits the revert before its own message exists.
          yield* send(session.id, "replacement")
          expect(yield* texts(session.id)).toEqual(["first", "replacement"])
          expect((yield* Session.Service.use((sessions) => sessions.get(session.id))).revert).toBeUndefined()
        }),
      config,
    ),
  )
})
