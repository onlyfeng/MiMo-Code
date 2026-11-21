import { expect } from "bun:test"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { Effect, Layer } from "effect"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Global } from "../../src/global"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionPrefixSnapshotTable } from "../../src/session/session.sql"
import { Database, eq } from "../../src/storage"
import { ToolRegistry } from "../../src/tool"
import { prepareConfigDependencies, provideTmpdirServer, tmpdirScoped } from "../fixture/fixture"
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
const STRUCTURED = "The user has requested structured output"
const count = (text: string, needle: string) => text.split(needle).length - 1
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
// Five real provider turns include plugin loading and Git snapshot work.
// Skill changes never touch the frozen prefix. A tools-hash rotation rebuilds
// it from current additions, as upstream does: with the catalog out of the
// system, nothing frozen depends on keeping the old bytes across rotation.
it.live("skill changes keep the frozen prefix and a tools rotation rebuilds it", () =>
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
          yield* Effect.promise(() =>
            Promise.all([Global.Path.config, path.join(dir, ".mimocode")].map(prepareConfigDependencies)),
          )
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
          // The catalog is no longer part of the frozen system.
          expect(before.skill_catalog).toBeNull()
          expect(before.system.join("\n")).not.toContain(OLD)
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
          // A changed skill set leaves the frozen prefix untouched; it is
          // announced as a user-turn delta instead.
          expect(after.system).toEqual(before.system)
          expect(after.revision).toBe(before.revision)
          expect(wire((yield* llm.inputs)[1], "system")).not.toContain("PLUGIN_NEW")
          expect(wire((yield* llm.inputs)[1], "system")).not.toContain(NEW)
          expect(wire((yield* llm.inputs)[1], "conversation")).toContain(NEW)
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
          expect(rotated.revision).toBe(after.revision + 1)
          expect(rotated.system.join("\n")).toContain("MUTATED_AGENTS_NEW")
          expect(rotated.system.join("\n")).toContain("PLUGIN_NEW")
          expect(rotated.system.join("\n")).not.toContain(NEW)
          expect(wire((yield* llm.inputs)[2], "system")).toContain("MUTATED_AGENTS_NEW")
          yield* llm.tool("StructuredOutput", { ok: true })
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            format: {
              type: "json_schema",
              retryCount: 0,
              schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
            },
            parts: [{ type: "text", text: "Switch to structured output" }],
          })
          // StructuredOutput changes the tools hash, so the switch rotates and
          // the instruction is frozen together with its tool.
          expect(count(wire((yield* llm.inputs)[3], "system"), STRUCTURED)).toBe(1)
          const structured = (yield* rows(session.id))[0]
          expect(structured.system.join("\n")).toContain(STRUCTURED)
          expect(structured.tools?.some((item) => item.name === "StructuredOutput")).toBe(true)
          yield* llm.text("back to text")
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            format: { type: "text" },
            parts: [{ type: "text", text: "Switch back to ordinary text" }],
          })
          // Switching back rotates again: neither the instruction nor its tool stays.
          expect(wire((yield* llm.inputs)[4], "system")).not.toContain(STRUCTURED)
          const text = (yield* rows(session.id))[0]
          expect(text.system).toEqual(rotated.system)
          expect(text.tools?.some((item) => item.name === "StructuredOutput")).toBe(false)
        }),
      { git: true, config: (url) => ({ ...config(url), plugin: [pathToFileURL(plugin).href] }) },
    )
  }),
  15_000,
)

// The first request of a session is already structured: the prefix it pins
// carries the instruction once, with its tool, and the next plain-text
// request rotates both out instead of demanding an unregistered tool.
it.live("a prefix pinned in structured mode rotates its format instruction out for text", () =>
  provideTmpdirServer(
    ({ dir, llm }) =>
      Effect.gen(function* () {
        yield* Effect.promise(() =>
          Promise.all([Global.Path.config, path.join(dir, ".mimocode")].map(prepareConfigDependencies)),
        )
        const sessions = yield* Session.Service
        const prompt = yield* SessionPrompt.Service
        const session = yield* sessions.create({ title: "Cold structured pin" })
        yield* llm.tool("StructuredOutput", { ok: true })
        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model,
          format: {
            type: "json_schema",
            retryCount: 0,
            schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
          },
          parts: [{ type: "text", text: "First query is already structured" }],
        })
        const pinned = (yield* rows(session.id))[0]
        expect(count(pinned.system.join("\n"), STRUCTURED)).toBe(1)
        expect(pinned.tools?.some((item) => item.name === "StructuredOutput")).toBe(true)
        expect(count(wire((yield* llm.inputs)[0], "system"), STRUCTURED)).toBe(1)
        yield* llm.text("plain answer")
        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model,
          format: { type: "text" },
          parts: [{ type: "text", text: "Now answer as ordinary text" }],
        })
        expect(wire((yield* llm.inputs)[1], "system")).not.toContain(STRUCTURED)
        const text = (yield* rows(session.id))[0]
        expect(text.revision).toBe(pinned.revision + 1)
        expect(text.system.join("\n")).not.toContain(STRUCTURED)
        expect(text.tools?.some((item) => item.name === "StructuredOutput")).toBe(false)
      }),
    { git: true, config },
  ),
  15_000,
)
