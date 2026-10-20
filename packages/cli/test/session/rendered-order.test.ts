import { expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(Session.defaultLayer, CrossSpawnSpawner.defaultLayer))

it.live(
  "rendered delivery falls back to its checkpoint when the digest target was deleted",
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const sessions = yield* Session.Service
      const session = yield* sessions.create()
      const model = { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") }
      const user = (time: number) =>
        sessions.updateMessage({
          id: MessageID.ascending(),
          sessionID: session.id,
          role: "user",
          agent: "build",
          model,
          time: { created: time },
        })
      const input = yield* user(100)
      const marker = yield* user(150)
      const response = yield* sessions.updateMessage({
        id: MessageID.ascending(),
        sessionID: session.id,
        role: "assistant",
        parentID: input.id,
        agent: "build",
        mode: "build",
        modelID: model.modelID,
        providerID: model.providerID,
        path: { cwd: "/tmp/example", root: "/tmp/example" },
        time: { created: 200 },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      })
      const digest = yield* user(300)
      yield* sessions.updatePart({
        id: PartID.ascending(),
        messageID: marker.id,
        sessionID: session.id,
        type: "checkpoint",
        checkpointDir: "/tmp/example",
        checkpointNumber: 1,
        coveredUpTo: input.id,
        digestUpTo: digest.id,
      })
      yield* sessions.removeMessage({ sessionID: session.id, messageID: digest.id })
      const projected = yield* MessageV2.filterCompactedEffect(session.id)
      expect(projected.map((message) => message.info.id)).toEqual([marker.id, response.id])
      const load = (messageID: MessageID) => MessageV2.get({ sessionID: session.id, messageID })
      expect(
        MessageV2.renderedOrder(projected, [], session.id, new Set(), () => {
          throw new Error("No receipt needs loading")
        }),
      ).toEqual(projected)
      const receipts = [
        {
          id: "receipt-example",
          input_message_id: input.id,
          delivery_message_id: response.id,
          state: "settled" as const,
          consumed: true,
        },
      ]
      expect(
        MessageV2.renderedOrder(projected, receipts, session.id, new Set(), load).map((message) => message.info.id),
      ).toEqual([marker.id, input.id, response.id])
      expect(() =>
        MessageV2.renderedOrder(projected, receipts, session.id, new Set(), () => {
          throw new Error("Unexpected storage failure")
        }),
      ).toThrow("Unexpected storage failure")
    }),
  ),
)
