import { expect } from "bun:test"
import { Cause, Effect, Layer } from "effect"
import { ActorRecoveryTarget } from "../../src/actor/recovery-target"
import { ActorRegistry } from "../../src/actor/registry"
import { Bus } from "../../src/bus"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Session } from "../../src/session"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(
  Layer.mergeAll(Session.defaultLayer, ActorRegistry.defaultLayer, Bus.layer, CrossSpawnSpawner.defaultLayer),
)

it.live(
  "recovery addressing accepts registered local targets and canonical peer relations without exposing main or strangers",
  () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const registry = yield* ActorRegistry.Service
        const parent = yield* sessions.create({ title: "Parent" })
        const peer = yield* sessions.create({ title: "Peer", parentID: parent.id })
        const stranger = yield* sessions.create({ title: "Stranger" })
        const nested = yield* sessions.create({ title: "Nested peer", parentID: peer.id })
        for (const target of [
          { sessionID: parent.id, actorID: "main-alias", mode: "main" as const },
          { sessionID: parent.id, actorID: "worker-1", mode: "subagent" as const, parentActorID: "controller-1" },
          { sessionID: peer.id, actorID: peer.id, mode: "peer" as const, parentActorID: "main" },
          { sessionID: nested.id, actorID: nested.id, mode: "peer" as const, parentActorID: peer.id },
        ])
          yield* registry.register({
            ...target,
            agent: "build",
            description: "Addressing does not grant lifecycle eligibility",
            contextMode: "none",
            background: true,
            lifecycle: "ephemeral",
          })
        const before = yield* registry.listBySession(parent.id)
        for (const target of [
          { sessionID: parent.id, actorID: "worker-1", resolvedSessionID: parent.id },
          { sessionID: parent.id, actorID: peer.id, resolvedSessionID: peer.id },
          { sessionID: peer.id, actorID: peer.id, resolvedSessionID: peer.id },
          { sessionID: peer.id, actorID: nested.id, resolvedSessionID: nested.id },
        ])
          expect(yield* ActorRecoveryTarget.resolve(target)).toEqual({
            sessionID: target.resolvedSessionID,
            actorID: target.actorID,
          })
        for (const target of [
          { sessionID: parent.id, actorID: "main" },
          { sessionID: parent.id, actorID: "main-alias" },
          { sessionID: parent.id, actorID: nested.id },
          { sessionID: stranger.id, actorID: peer.id },
          { sessionID: peer.id, actorID: "worker-1" },
          { sessionID: stranger.id, actorID: "missing" },
        ]) {
          const exit = yield* Effect.exit(ActorRecoveryTarget.resolve(target))
          expect(exit._tag).toBe("Failure")
          if (exit._tag === "Failure")
            expect(Cause.squash(exit.cause)).toMatchObject({
              name: "NotFoundError",
              data: { message: "Actor recovery target is unavailable" },
            })
        }
        expect(yield* registry.listBySession(parent.id)).toEqual(before)
      }),
    ),
)
