import { afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Instance } from "../../src/project/instance"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session as SessionNs } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID } from "../../src/session/schema"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { Log } from "../../src/util"

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

const it = testEffect(Layer.mergeAll(SessionNs.defaultLayer, CrossSpawnSpawner.defaultLayer))

const ref = { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") }

// Envelope shape persisted before upstream #2867: spliced ahead of the user
// body in memory, but stored under a larger part ID.
const LEGACY_ENVELOPE = [
  "# Files mentioned by the user",
  "",
  "- team.png (image/png)",
  '  Local path: "/tmp/example/team.png"',
  "",
  "The user's request is the message text that accompanies these attachments.",
  "",
  "## My request:",
].join("\n")

// Current shape: appended after the user body, so stored order is the prompt order.
const REMINDER = [
  "<system-reminder>",
  "The user attached these images to this message, in order:",
  "- team.png (image/png): /tmp/example/team.png",
  "</system-reminder>",
].join("\n")

describe("user image attachment envelope read-back order", () => {
  it.live(
    "restores only a legacy envelope ahead of the user body; the closed reminder keeps its stored order",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* SessionNs.Service
        const info = yield* sessions.create({})

        const seed = (envelopeText: string) =>
          Effect.gen(function* () {
            const userID = MessageID.ascending()
            yield* sessions.updateMessage({
              id: userID,
              role: "user",
              sessionID: info.id,
              agent: "build",
              model: ref,
              time: { created: Date.now() },
            })
            const bodyID = PartID.ascending()
            yield* sessions.updatePart({
              id: bodyID,
              messageID: userID,
              sessionID: info.id,
              type: "text",
              text: "这些才是我们团队成员名单",
            })
            const envelopeID = PartID.ascending()
            yield* sessions.updatePart({
              id: envelopeID,
              messageID: userID,
              sessionID: info.id,
              type: "text",
              synthetic: true,
              text: envelopeText,
              metadata: { userImageAttachment: true },
            })
            return { userID, bodyID, envelopeID }
          })

        const legacy = yield* seed(LEGACY_ENVELOPE)
        const current = yield* seed(REMINDER)

        expect(MessageV2.parts(legacy.userID).map((p) => p.id)).toEqual([legacy.envelopeID, legacy.bodyID])
        expect(MessageV2.parts(current.userID).map((p) => p.id)).toEqual([current.bodyID, current.envelopeID])

        const listed = yield* sessions.messages({ sessionID: info.id })
        expect(listed.map((message) => message.parts.map((p) => p.id))).toEqual([
          [legacy.envelopeID, legacy.bodyID],
          [current.bodyID, current.envelopeID],
        ])
      }),
    ),
  )
})
