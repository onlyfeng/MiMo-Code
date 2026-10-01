import { expect } from "bun:test"
import { Deferred, Effect, Exit, Fiber, Layer } from "effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { SessionRunState } from "../../src/session/run-state"
import { SessionID } from "../../src/session/schema"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(SessionRunState.defaultLayer, CrossSpawnSpawner.defaultLayer))

it.live("session cancel reaches all runners and isolates colon-containing session and actor IDs", () =>
  provideTmpdirInstance(() => Effect.gen(function* () {
    const run = yield* SessionRunState.Service
    const sessionID = SessionID.make("ses_example")
    const otherID = SessionID.make("ses_example:child")
    const start = (sid: SessionID, agentID: string) => Effect.gen(function* () {
      const ready = yield* Deferred.make<void>()
      const fiber = yield* run.ensureRunning(sid, agentID, Effect.interrupt,
        Deferred.succeed(ready, undefined).pipe(Effect.andThen(Effect.never)),
      ).pipe(Effect.forkChild)
      yield* Deferred.await(ready)
      return fiber
    })
    const main = yield* start(sessionID, "main")
    const child = yield* start(sessionID, "child:main")
    const other = yield* start(otherID, "main")
    yield* run.cancel(sessionID)
    expect(Exit.isFailure(yield* Fiber.await(main))).toBe(true)
    expect(Exit.isFailure(yield* Fiber.await(child))).toBe(true)
    expect(Exit.isSuccess(yield* run.assertNotBusy(sessionID).pipe(Effect.exit))).toBe(true)
    expect(Exit.isSuccess(yield* run.assertNotBusy(sessionID, "child:main").pipe(Effect.exit))).toBe(true)
    expect(Exit.isFailure(yield* run.assertNotBusy(otherID).pipe(Effect.exit))).toBe(true)
    const replacement = yield* start(sessionID, "main")
    expect(Exit.isFailure(yield* run.assertNotBusy(sessionID).pipe(Effect.exit))).toBe(true)
    yield* run.cancel(otherID)
    expect(Exit.isFailure(yield* Fiber.await(other))).toBe(true)
    expect(Exit.isFailure(yield* run.assertNotBusy(sessionID).pipe(Effect.exit))).toBe(true)
    yield* run.cancel(sessionID)
    expect(Exit.isFailure(yield* Fiber.await(replacement))).toBe(true)
  })),
)
