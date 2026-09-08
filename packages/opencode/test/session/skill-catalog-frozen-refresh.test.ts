import { expect } from "bun:test"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { Effect, Layer } from "effect"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionPrefixSnapshotTable } from "../../src/session/session.sql"
import { Database, eq } from "../../src/storage"
import { ToolRegistry } from "../../src/tool"
import { provideTmpdirServer, tmpdirScoped } from "../fixture/fixture"
import { TestLLMServer } from "../lib/llm-server"
import { testEffect } from "../lib/effect"
import { withEnv } from "../lib/env"

withEnv({
  MIMOCODE_DISABLE_BUILTIN_SKILLS: "true",
  MIMOCODE_DISABLE_COMPOSE_SKILLS: "true",
  MIMOCODE_DISABLE_INSTRUCTIONS: "false",
})
const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer, TestLLMServer.layer))
const model = { providerID: ProviderID.make("catalog-test"), modelID: ModelID.make("gpt-5-catalog") }
const config = (url: string) => ({
  checkpoint: { thresholds: [] },
  agent: { build: { prompt: "Catalog transport fixture." } },
  experimental: { predict_next_prompt: false },
  permission: { "*": "allow" as const },
  provider: {
    [model.providerID]: {
      npm: "@ai-sdk/openai-compatible",
      options: { baseURL: url, apiKey: "fixture" },
      models: {
        [model.modelID]: { name: "Catalog fixture", tool_call: true, limit: { context: 256000, output: 10000 } },
      },
    },
  },
})
const OLD = "OLD_CATALOG_DESCRIPTION_6a31"
const NEW = "NEW_CATALOG_DESCRIPTION_2f47"
const BODY = "SKILL_BODY_STAYS_IN_USER_MESSAGE_8d13"
const skillPath = (dir: string) => path.join(dir, ".mimocode/skill/catalog-probe/SKILL.md")
const writeSkill = (dir: string, description: string) =>
  Effect.promise(() =>
    Bun.write(skillPath(dir), `---\nname: catalog-probe\ndescription: ${description}\n---\n\n${BODY}\n`),
  )

// Inspect provider roles, not text anywhere in request/tool descriptions.
function wire(request: Record<string, unknown>, role: "system" | "conversation") {
  if (!Array.isArray(request.messages)) throw new Error("Expected chat-compatible provider messages")
  return JSON.stringify(
    request.messages.filter(
      (entry: unknown) =>
        typeof entry === "object" &&
        entry !== null &&
        "role" in entry &&
        (role === "system" ? entry.role === "system" : entry.role !== "system"),
    ),
  )
}
const rows = (sessionID: Session.Info["id"]) =>
  Effect.sync(() =>
    Database.use((db) =>
      db.select().from(SessionPrefixSnapshotTable).where(eq(SessionPrefixSnapshotTable.session_id, sessionID)).all(),
    ),
  )
it.live("catalog refresh and tool rotation preserve every non-catalog frozen byte", () =>
  Effect.gen(function* () {
    const key = "catalog-frozen-plugin-generation"
    Reflect.set(globalThis, key, "PLUGIN_OLD")
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        Reflect.deleteProperty(globalThis, key)
      }),
    )
    const plugin = path.join(yield* tmpdirScoped(), "frozen-plugin.ts")
    yield* Effect.promise(() =>
      Bun.write(
        plugin,
        `export default async () => ({ "experimental.chat.system.transform": async (_input, output) => { output.system.push(Reflect.get(globalThis, "${key}")) } })`,
      ),
    )
    return yield* provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          yield* writeSkill(dir, OLD)
          yield* Effect.promise(() => Bun.write(path.join(dir, "AGENTS.md"), "FROZEN_AGENTS_OLD"))
          const sessions = yield* Session.Service
          const prompt = yield* SessionPrompt.Service
          const registry = yield* ToolRegistry.Service
          const session = yield* sessions.create({ title: "Frozen non-catalog prefix" })
          yield* llm.text("first complete")
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            parts: [{ type: "text", text: "First direct query" }],
          })
          const before = (yield* rows(session.id))[0]
          expect(before.system.join("\n")).toContain("FROZEN_AGENTS_OLD")
          expect(before.system.join("\n")).toContain("PLUGIN_OLD")
          if (!before.skill_catalog) throw new Error("Missing catalog")
          expect(before.skill_catalog.systemSlot).toBeDefined()
          // Real persisted schema3 rows from PR87 have no slot. Recover one only
          // from the unique complete catalog text, preserving their frozen tail.
          const legacyCatalog = {
            schema: 3 as const,
            text: before.skill_catalog.text,
            version: before.skill_catalog.version,
            turnID: before.skill_catalog.turnID,
          }
          yield* Effect.sync(() =>
            Database.use((db) =>
              db
                .update(SessionPrefixSnapshotTable)
                .set({ skill_catalog: legacyCatalog })
                .where(eq(SessionPrefixSnapshotTable.session_id, session.id))
                .run(),
            ),
          )
          yield* writeSkill(dir, NEW)
          yield* Effect.promise(() => Bun.write(path.join(dir, "AGENTS.md"), "MUTATED_AGENTS_NEW"))
          Reflect.set(globalThis, key, "PLUGIN_NEW")
          yield* registry.reload()
          yield* llm.text("second complete")
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            parts: [{ type: "text", text: "Second direct query" }],
          })
          const after = (yield* rows(session.id))[0]
          if (!after.skill_catalog) throw new Error("Missing refreshed catalog")
          expect(after.skill_catalog.text).toContain(NEW)
          expect(after.skill_catalog.systemSlot).toBeDefined()
          expect(after.system).toEqual(
            before.system.map((text) => text.replace(before.skill_catalog!.text, after.skill_catalog!.text)),
          )
          expect(wire((yield* llm.inputs)[1], "system")).not.toContain("PLUGIN_NEW")
          yield* Effect.sync(() =>
            Database.use((db) =>
              db
                .update(SessionPrefixSnapshotTable)
                .set({ tools_hash: "stale-fixture" })
                .where(eq(SessionPrefixSnapshotTable.session_id, session.id))
                .run(),
            ),
          )
          yield* llm.text("third complete")
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            parts: [{ type: "text", text: "Third direct query" }],
          })
          const rotated = (yield* rows(session.id))[0]
          expect(rotated.tools_hash).not.toBe("stale-fixture")
          expect(rotated.system).toEqual(after.system)
          expect(wire((yield* llm.inputs)[2], "system")).not.toContain("MUTATED_AGENTS_NEW")
        }),
      { git: true, config: (url) => ({ ...config(url), plugin: [pathToFileURL(plugin).href] }) },
    )
  }),
)
