import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { ActorRegistry } from "../../src/actor/registry"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { resolveDrainSeed } from "../../src/inbox/inbox"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(Session.defaultLayer, ActorRegistry.defaultLayer, CrossSpawnSpawner.defaultLayer))

describe("inbox drain seed", () => {
  it.live("keeps the receiver's persisted variant for a woken turn", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const actors = yield* ActorRegistry.Service
        const session = yield* sessions.create({ title: "Drain seed variant" })
        yield* actors.register({
          sessionID: session.id,
          actorID: "general-1",
          mode: "subagent",
          parentActorID: "main",
          agent: "general",
          description: "Variant receiver",
          contextMode: "none",
          background: true,
          lifecycle: "ephemeral",
        })
        const model = { providerID: ProviderID.make("test"), modelID: ModelID.make("model"), variant: "high" }
        yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agentID: "general-1",
          agent: "general",
          model,
          time: { created: Date.now() },
        })

        expect(yield* resolveDrainSeed(sessions, actors, session.id, "general-1")).toEqual({ agent: "general", model })
      }),
    ),
  )
})
