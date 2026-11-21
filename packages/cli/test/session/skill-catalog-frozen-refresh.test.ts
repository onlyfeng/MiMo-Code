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
it.live("skill changes and tool rotation preserve every frozen byte", () =>
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
          expect(rotated.system).toEqual(after.system)
          expect(wire((yield* llm.inputs)[2], "system")).not.toContain("MUTATED_AGENTS_NEW")
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
            parts: [{ type: "text", text: "Switch to structured output with the frozen instructions" }],
          })
          expect(wire((yield* llm.inputs)[3], "system")).toContain("The user has requested structured output")
          expect(wire((yield* llm.inputs)[3], "system")).toContain("FROZEN_AGENTS_OLD")
          expect(wire((yield* llm.inputs)[3], "system")).not.toContain("PLUGIN_NEW")
          yield* llm.text("back to text")
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            format: { type: "text" },
            parts: [{ type: "text", text: "Switch back to ordinary text" }],
          })
          expect((yield* rows(session.id))[0].system).toEqual(rotated.system)
          expect(wire((yield* llm.inputs)[4], "system")).not.toContain("The user has requested structured output")
          // The instruction is request-owned, so it never reaches the stored row.
          expect((yield* rows(session.id))[0].system.join("\n")).not.toContain(
            "The user has requested structured output",
          )
        }),
      { git: true, config: (url) => ({ ...config(url), plugin: [pathToFileURL(plugin).href] }) },
    )
  }),
  15_000,
)

// The opposite direction of the case above: the prefix is captured cold while
// the request is already in json_schema mode. The instruction must stay out of
// the pinned row, or every later plain-text request on that prefix would keep
// demanding the then-unregistered StructuredOutput tool.
it.live("a cold capture in structured mode does not freeze the format instruction", () =>
  provideTmpdirServer(
    ({ dir, llm }) =>
      Effect.gen(function* () {
        yield* Effect.promise(() =>
          Promise.all([Global.Path.config, path.join(dir, ".mimocode")].map(prepareConfigDependencies)),
        )
        const sessions = yield* Session.Service
        const prompt = yield* SessionPrompt.Service
        const session = yield* sessions.create({ title: "Cold structured capture" })
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
        expect(pinned.system.join("\n")).not.toContain("The user has requested structured output")
        // Exactly one copy on the wire: the request-local append, not a second
        // one from a frozen duplicate.
        const first = wire((yield* llm.inputs)[0], "system")
        expect(first.split("The user has requested structured output").length - 1).toBe(1)
        yield* llm.text("plain answer")
        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model,
          format: { type: "text" },
          parts: [{ type: "text", text: "Now answer as ordinary text" }],
        })
        expect(wire((yield* llm.inputs)[1], "system")).not.toContain("The user has requested structured output")
        expect((yield* rows(session.id))[0].system).toEqual(pinned.system)
      }),
    { git: true, config },
  ),
  15_000,
)
