import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Session as SessionNs } from "../../src/session"
import { SessionPrefixSnapshot } from "../../src/session/prefix-snapshot"
import { MessageID, type SessionID } from "../../src/session/schema"
import { SessionPrefixSnapshotTable } from "../../src/session/session.sql"
import { Database } from "../../src/storage"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(SessionNs.defaultLayer, CrossSpawnSpawner.defaultLayer))

describe("frozen prefix with an oversized git status", () => {
  const environment = (status: string) =>
    [
      "# Environment",
      "gitStatus: This is the git status at the start of the conversation.",
      "",
      "Status:",
      status,
      "",
      "Recent commits:",
      "abc1234 init",
    ].join("\n")

  // A row as an older binary pinned it, before the status was capped.
  const legacy = (sessionID: SessionID, key: string, system: string[]) =>
    Effect.sync(() =>
      Database.use((db) =>
        db
          .insert(SessionPrefixSnapshotTable)
          .values({
            session_id: sessionID,
            profile_key: key,
            system,
            system_hash: SessionPrefixSnapshot.systemHash(system),
            tools_hash: "tools",
            tools: [],
            loaded_mcp_tools: [],
            watermark_message_id: MessageID.ascending(),
            revision: 1,
            created_at: Date.now(),
            updated_at: Date.now(),
          })
          .run(),
      ),
    )

  const pin = (sessionID: SessionID, key: string, system: string[]) =>
    SessionPrefixSnapshot.pin({
      sessionID,
      profileKey: key,
      system,
      toolsHash: "tools",
      tools: [],
      loadedMcpTools: [],
      watermarkMessageID: MessageID.ascending(),
    })

  it.live(
    "is dropped on read so the caller pins a fresh one, and a capped one is kept",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const session = yield* (yield* SessionNs.Service).create({})
        yield* legacy(session.id, "stale", ["base prompt", environment("x".repeat(10_001))])

        expect(yield* SessionPrefixSnapshot.get(session.id, "stale")).toBeUndefined()
        const fresh = yield* pin(session.id, "stale", ["unified environment"])
        expect((yield* SessionPrefixSnapshot.get(session.id, "stale"))?.system).toEqual(fresh.system)

        const capped = environment("?? scratch/\n... 20 more entries omitted; run `git status` for the full list.")
        yield* legacy(session.id, "capped", [capped])
        expect((yield* SessionPrefixSnapshot.get(session.id, "capped"))?.system).toEqual([capped])

        const limit = environment("x".repeat(10_000))
        yield* legacy(session.id, "limit", [limit])
        expect((yield* SessionPrefixSnapshot.get(session.id, "limit"))?.system).toEqual([limit])

        // A prefix without an environment block is never touched.
        yield* legacy(session.id, "plain", ["base prompt", "x".repeat(30_000)])
        expect(yield* SessionPrefixSnapshot.get(session.id, "plain")).toBeDefined()
      }),
    ),
  )
})
