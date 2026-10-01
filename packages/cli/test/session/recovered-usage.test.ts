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

for (const input of [
  { name: "late old-ID watermark", covered: 50, digest: 150, marker: 51, expected: true },
  { name: "backdated marker covers measured turn", covered: 50, digest: 101, marker: 51, expected: true },
  { name: "new assistant after recovery", covered: 50, digest: 75, marker: 51, expected: false },
  { name: "missing covered endpoint", digest: 150, marker: 51, expected: false },
  { name: "missing digest endpoint", covered: 50, marker: 51, expected: false },
  { name: "reversed digest interval", covered: 150, digest: 75, marker: 151, expected: false },
  { name: "another actor's watermark", covered: 50, digest: 150, marker: 51, actor: "peer", expected: false },
]) {
  it.live(`usage recovery resolves ${input.name} by persisted chronology`, () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const id = (value: string) => MessageID.make(`${value}_${input.name.replaceAll(/[^a-z]/g, "_")}`)
        const sessions = yield* Session.Service
        const session = yield* sessions.create({})
        const assistant = yield* sessions.updateMessage({
          id: id("msg_measured"),
          sessionID: session.id,
          role: "assistant",
          parentID: id("msg_parent"),
          agent: "build",
          mode: "build",
          modelID: ModelID.make("model"),
          providerID: ProviderID.make("test"),
          path: { cwd: "/tmp/example", root: "/tmp/example" },
          cost: 0,
          tokens: { input: 1000, output: 100, reasoning: 0, cache: { read: 0, write: 0 } },
          time: { created: 100 },
        })
        for (const [value, created] of [
          ["msg_z_covered", input.covered],
          ["msg_a_digest", input.digest],
        ] as const) {
          if (created === undefined) continue
          yield* sessions.updateMessage({
            id: id(value),
            sessionID: session.id,
            agentID: input.actor,
            role: "user",
            agent: "build",
            model: { providerID: ProviderID.make("test"), modelID: ModelID.make("model") },
            time: { created },
          })
        }
        const marker = {
          info: {
            id: id("msg_b_marker"),
            sessionID: session.id,
            role: "user" as const,
            agent: "build",
            model: { providerID: ProviderID.make("test"), modelID: ModelID.make("model") },
            time: { created: input.marker },
          },
          parts: [
            {
              id: PartID.make("prt_checkpoint"),
              messageID: id("msg_b_marker"),
              sessionID: session.id,
              type: "checkpoint" as const,
              checkpointDir: "",
              checkpointNumber: 1,
              coveredUpTo: id("msg_z_covered"),
              digestUpTo: id("msg_a_digest"),
            },
          ],
        }
        expect(MessageV2.usageRecovered([marker], assistant)).toBe(input.expected)
        expect(
          MessageV2.usageRecovered(
            [
              {
                info: { ...marker.info, time: { created: 101 } },
                parts: [
                  {
                    id: PartID.make("prt_compaction"),
                    messageID: marker.info.id,
                    sessionID: session.id,
                    type: "compaction",
                    auto: true,
                  },
                ],
              },
            ],
            assistant,
          ),
        ).toBe(true)
      }),
    ),
  )
}
