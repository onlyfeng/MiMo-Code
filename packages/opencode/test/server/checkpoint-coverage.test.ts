import { afterEach, describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { Session as SessionNs } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID, type SessionID } from "../../src/session/schema"
import { MessageTable } from "../../src/session/session.sql"
import { Database, eq } from "../../src/storage"
import { Log } from "../../src/util"
import { tmpdir } from "../fixture/fixture"

void Log.init({ print: false })

function run<A, E>(fx: Effect.Effect<A, E, SessionNs.Service>) {
  return Effect.runPromise(fx.pipe(Effect.provide(SessionNs.defaultLayer)))
}

const svc = {
  create(input?: SessionNs.CreateInput) {
    return run(SessionNs.Service.use((svc) => svc.create(input)))
  },
  remove(id: SessionID) {
    return run(SessionNs.Service.use((svc) => svc.remove(id)))
  },
  updateMessage<T extends MessageV2.Info>(msg: T) {
    return run(SessionNs.Service.use((svc) => svc.updateMessage(msg)))
  },
  updatePart<T extends MessageV2.Part>(part: T) {
    return run(SessionNs.Service.use((svc) => svc.updatePart(part)))
  },
}

type Coverage = {
  partID: string
  marker: { id: string; time: { created: number } }
  watermark: { id: string; status: "resolved"; time: { created: number } } | { id: string; status: "unresolved" }
}

afterEach(async () => {
  await Instance.disposeAll()
})

async function message(sessionID: SessionID, id: string, created: number, agentID = "main") {
  await svc.updateMessage({
    id: MessageID.ascending(id),
    sessionID,
    agentID,
    role: "user",
    time: { created },
    agent: "test",
    model: { providerID: "test", modelID: "test" },
  } as unknown as MessageV2.User)
}

async function checkpoint(
  sessionID: SessionID,
  messageID: string,
  partID: string,
  coveredUpTo: string,
  digestUpTo?: string,
) {
  await svc.updatePart({
    id: PartID.ascending(partID),
    sessionID,
    messageID: MessageID.ascending(messageID),
    type: "checkpoint",
    checkpointDir: "",
    checkpointNumber: 0,
    coveredUpTo: MessageID.ascending(coveredUpTo),
    ...(digestUpTo ? { digestUpTo: MessageID.ascending(digestUpTo) } : {}),
  })
}

describe("session checkpoint coverage endpoint", () => {
  test("returns every main marker with canonical order and exact effective watermark resolution", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await svc.create({})
        const resolvedWatermark = "msg_旧-watermark"
        const coveredButShadowed = "msg_covered-watermark"
        const missingDigest = "msg_missing-digest"
        const upperMarker = "msg_A-marker"
        const lowerMarker = "msg_a-marker"
        const bmpMarker = "msg_\uE000-marker"
        const supplementaryMarker = "msg_\u{10000}-marker"

        await message(session.id, resolvedWatermark, 5)
        await message(session.id, coveredButShadowed, 6)
        await message(session.id, upperMarker, 10)
        await checkpoint(session.id, upperMarker, "prt_upper-marker", resolvedWatermark)
        await message(session.id, lowerMarker, 10)
        await checkpoint(session.id, lowerMarker, "prt_lower-marker", coveredButShadowed, missingDigest)
        await message(session.id, supplementaryMarker, 10)
        await checkpoint(session.id, supplementaryMarker, "prt_supplementary-marker", resolvedWatermark)
        await message(session.id, bmpMarker, 10)
        await checkpoint(session.id, bmpMarker, "prt_bmp-marker", resolvedWatermark)

        // A checkpoint-looking part on another actor slice must never leak
        // into the authoritative main projection.
        await message(session.id, "msg_subagent-marker", 11, "checkpoint-writer-1")
        await checkpoint(session.id, "msg_subagent-marker", "prt_subagent-marker", resolvedWatermark)

        // Push both main markers outside the newest-100 message window. An API
        // backed by the initial TUI page would silently return no coverage.
        for (let i = 0; i < 101; i++) {
          await message(session.id, MessageID.ascending(), 20 + i)
        }

        // The SQL column is the ordering authority. A legacy/corrupt JSON
        // payload must not override the canonical marker or watermark time.
        Database.use((db) => {
          for (const [id, created] of [
            [upperMarker, 10_000],
            [resolvedWatermark, 5_000],
          ] as const) {
            const messageID = MessageID.ascending(id)
            const row = db
              .select({ data: MessageTable.data })
              .from(MessageTable)
              .where(eq(MessageTable.id, messageID))
              .get()
            if (!row) throw new Error(`missing fixture row: ${id}`)
            db.update(MessageTable)
              .set({ data: { ...row.data, time: { ...row.data.time, created } } })
              .where(eq(MessageTable.id, messageID))
              .run()
          }
        })

        const response = await Server.Default().app.request(`/session/${session.id}/checkpoint-coverage`)
        expect(response.status).toBe(200)
        expect((await response.json()) as Coverage[]).toEqual([
          {
            partID: "prt_upper-marker",
            marker: { id: upperMarker, time: { created: 10 } },
            watermark: {
              id: resolvedWatermark,
              status: "resolved",
              time: { created: 5 },
            },
          },
          {
            partID: "prt_lower-marker",
            marker: { id: lowerMarker, time: { created: 10 } },
            watermark: {
              id: missingDigest,
              status: "unresolved",
            },
          },
          {
            partID: "prt_bmp-marker",
            marker: { id: bmpMarker, time: { created: 10 } },
            watermark: {
              id: resolvedWatermark,
              status: "resolved",
              time: { created: 5 },
            },
          },
          {
            partID: "prt_supplementary-marker",
            marker: { id: supplementaryMarker, time: { created: 10 } },
            watermark: {
              id: resolvedWatermark,
              status: "resolved",
              time: { created: 5 },
            },
          },
        ])

        await svc.remove(session.id)
      },
    })
  })

  test("returns 404 for a missing session", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const response = await Server.Default().app.request("/session/ses_missing/checkpoint-coverage")
        expect(response.status).toBe(404)
      },
    })
  })
})
