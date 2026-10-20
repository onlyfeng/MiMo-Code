import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Session } from "../../src/session"
import * as CancelEpoch from "../../src/session/cancel-epoch"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(Session.defaultLayer, CrossSpawnSpawner.defaultLayer))

describe("CancelEpoch lifetime", () => {
  it.live("Session.remove releases the removed session's cancel epoch", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const removed = yield* sessions.create({ title: "removed" })
        const kept = yield* sessions.create({ title: "kept" })
        CancelEpoch.advance(removed.id)
        CancelEpoch.advance(kept.id)

        yield* sessions.remove(removed.id)

        expect(CancelEpoch.current(removed.id)).toBe(0)
        expect(CancelEpoch.current(kept.id)).toBe(1)
      }),
    ),
  )
})
