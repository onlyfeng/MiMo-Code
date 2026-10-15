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

  it.live("a removed session keeps its epoch until every held wake releases it", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "held" })
        // A wake scheduled before the first cancel records epoch 0.
        const first = CancelEpoch.hold(session.id)
        const second = CancelEpoch.hold(session.id)
        CancelEpoch.advance(session.id)

        yield* sessions.remove(session.id)
        expect(CancelEpoch.current(session.id)).toBe(1)
        first()
        first()
        expect(CancelEpoch.current(session.id)).toBe(1)
        second()
        expect(CancelEpoch.current(session.id)).toBe(0)
      }),
    ),
  )
})
