import { describe, expect } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Effect, Layer } from "effect"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session as SessionNs } from "../../src/session"
import { GitStatusPrompt } from "../../src/session/git-status"
import { SessionPrefixSnapshot } from "../../src/session/prefix-snapshot"
import { MessageID, type SessionID } from "../../src/session/schema"
import { SessionPrefixSnapshotTable } from "../../src/session/session.sql"
import { Database } from "../../src/storage"
import { SystemPrompt } from "../../src/session/system"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { ProviderTest } from "../fake/provider"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(SystemPrompt.defaultLayer, SessionNs.defaultLayer, CrossSpawnSpawner.defaultLayer))

const claude = ProviderTest.model({
  id: ModelID.make("claude-sonnet-4-6"),
  providerID: ProviderID.make("anthropic"),
})

// The text between "Status:" and "Recent commits:" in the Claude environment.
const statusSection = (system: string[]) => {
  const text = system.join("\n")
  const start = text.indexOf("\nStatus:\n") + "\nStatus:\n".length
  return text.slice(start, text.indexOf("\n\nRecent commits:", start))
}

const environment = (now: number) =>
  Effect.gen(function* () {
    return yield* (yield* SystemPrompt.Service).environment(claude, now)
  })

const writeFiles = (dir: string, names: string[]) =>
  Effect.promise(async () => {
    for (const name of names) {
      await fs.mkdir(path.dirname(path.join(dir, name)), { recursive: true })
      await fs.writeFile(path.join(dir, name), "x\n")
    }
  })

describe("Claude environment git status", () => {
  it.live(
    "an untracked directory is listed once, not file by file",
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* writeFiles(
            dir,
            Array.from({ length: 300 }, (_, i) => `scratch/run-${i}/out.txt`),
          )
          const section = statusSection(yield* environment(Date.UTC(2026, 10, 6, 1)))
          expect(section).toContain("?? scratch/")
          expect(section).not.toContain("scratch/run-0/out.txt")
          expect(section.split("\n")).toHaveLength(1)
        }),
      { git: true },
    ),
  )

  it.live(
    "a long status is capped and says how much it left out",
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          const count = GitStatusPrompt.MAX_LINES + 50
          yield* writeFiles(
            dir,
            Array.from({ length: count }, (_, i) => `untracked-${i.toString().padStart(4, "0")}.txt`),
          )
          const section = statusSection(yield* environment(Date.UTC(2026, 10, 6, 2)))
          const lines = section.split("\n")
          expect(lines.length).toBeLessThanOrEqual(GitStatusPrompt.MAX_LINES + 1)
          expect(section.length).toBeLessThanOrEqual(GitStatusPrompt.MAX_CHARS)
          expect(lines.at(-1)).toBe(
            `... ${count - (lines.length - 1)} more entries omitted; run \`git status\` for the full list.`,
          )
          expect(GitStatusPrompt.oversized([`gitStatus: x\nStatus:\n${section}\n\nRecent commits:\nabc`])).toBe(false)
        }),
      { git: true },
    ),
  )
})

describe("frozen prefix with an oversized git status", () => {
  const huge = (lines: number) =>
    [
      "# Environment",
      "gitStatus: This is the git status at the start of the conversation.",
      "",
      "Status:",
      ...Array.from({ length: lines }, (_, i) => `?? .tmp/file-${i}.txt`),
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
        yield* legacy(session.id, "stale", ["base prompt", huge(2_000)])

        expect(yield* SessionPrefixSnapshot.get(session.id, "stale")).toBeUndefined()
        const fresh = yield* pin(session.id, "stale", ["base prompt", huge(10)])
        expect(fresh.system[1]).toBe(huge(10))
        expect((yield* SessionPrefixSnapshot.get(session.id, "stale"))?.system).toEqual(["base prompt", huge(10)])

        // A prefix without an environment block is never touched.
        yield* legacy(session.id, "plain", ["base prompt", "x".repeat(GitStatusPrompt.MAX_CHARS * 3)])
        expect(yield* SessionPrefixSnapshot.get(session.id, "plain")).toBeDefined()
      }),
    ),
  )
})
