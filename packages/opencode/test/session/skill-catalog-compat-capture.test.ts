import { expect } from "bun:test"
import { createHash, randomUUID } from "node:crypto"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { Effect, Fiber, Layer } from "effect"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { PartID } from "../../src/session/schema"
import { prefixCaptureRef } from "../../src/session/prefix-capture-ref"
import { SessionPrefixSnapshot } from "../../src/session/prefix-snapshot"
import { SessionPrefixSnapshotTable } from "../../src/session/session.sql"
import { Database, eq } from "../../src/storage"
import { ToolRegistry } from "../../src/tool"
import { provideTmpdirServer, tmpdirScoped } from "../fixture/fixture"
import { TestLLMServer, reply } from "../lib/llm-server"
import { testEffect } from "../lib/effect"
import { withEnv } from "../lib/env"

withEnv({
  MIMOCODE_DISABLE_BUILTIN_SKILLS: "true",
  MIMOCODE_DISABLE_COMPOSE_SKILLS: "true",
  MIMOCODE_DISABLE_INSTRUCTIONS: "true",
})
const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer, TestLLMServer.layer))
const model = { providerID: ProviderID.make("capture-test"), modelID: ModelID.make("gpt-5-capture") }
const config = (url: string) => ({
  checkpoint: { thresholds: [] },
  agent: { build: { prompt: "Cold catalog capture fixture." } },
  experimental: { predict_next_prompt: false },
  permission: { "*": "allow" as const },
  provider: {
    [model.providerID]: {
      npm: "@ai-sdk/openai-compatible",
      options: { baseURL: url, apiKey: "fixture" },
      models: {
        [model.modelID]: { name: "Capture fixture", tool_call: true, limit: { context: 256000, output: 10000 } },
      },
    },
  },
})
const OLD = "OLD_COLD_CAPTURE_DESCRIPTION_6a31"
const NEW = "NEW_COLD_CAPTURE_DESCRIPTION_2f47"
const skillPath = (dir: string) => path.join(dir, ".mimocode/skill/capture-probe/SKILL.md")
const writeSkill = (dir: string, description: string) =>
  Effect.promise(() =>
    Bun.write(skillPath(dir), `---\nname: capture-probe\ndescription: ${description}\n---\n\nRead this skill body.\n`),
  )
const rows = (sessionID: Session.Info["id"]) =>
  Effect.sync(() =>
    Database.use((db) =>
      db.select().from(SessionPrefixSnapshotTable).where(eq(SessionPrefixSnapshotTable.session_id, sessionID)).all(),
    ),
  )
const capture = (sessionID: Session.Info["id"]) =>
  Effect.gen(function* () {
    const sessions = yield* Session.Service
    const fn = prefixCaptureRef.current
    if (!fn) throw new Error("Real SessionPrompt prefix capture not initialized")
    return yield* fn({
      sessionID,
      agentName: "build",
      providerID: model.providerID,
      modelID: model.modelID,
      msgs: yield* sessions.messages({ sessionID }),
    })
  })

it.live(
  "compat pin winner updates both inherited and preflight current-turn catalog projections",
  () =>
    Effect.gen(function* () {
      const key = `cold-capture-gate-${randomUUID()}`
      const gate = { armed: false, hit: Promise.withResolvers<void>(), release: Promise.withResolvers<void>() }
      Reflect.set(globalThis, key, gate)
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          gate.release.resolve()
          Reflect.deleteProperty(globalThis, key)
        }),
      )
      const plugin = path.join(yield* tmpdirScoped(), "capture-gate.ts")
      yield* Effect.promise(() =>
        Bun.write(
          plugin,
          [
            "export default async () => ({",
            '  "experimental.chat.system.transform": async () => {',
            `    const gate = Reflect.get(globalThis, ${JSON.stringify(key)})`,
            "    if (!gate?.armed) return",
            "    gate.hit.resolve()",
            "    await gate.release.promise",
            "  },",
            "})",
          ].join("\n"),
        ),
      )
      return yield* provideTmpdirServer(
        ({ dir, llm }) =>
          Effect.gen(function* () {
            yield* writeSkill(dir, OLD)
            const sessions = yield* Session.Service
            const prompt = yield* SessionPrompt.Service
            const registry = yield* ToolRegistry.Service
            const session = yield* sessions.create({ title: "Cold capture pin race" })
            const user = yield* prompt.prompt({
              sessionID: session.id,
              agent: "build",
              model,
              harness: "codex",
              noReply: true,
              parts: [{ type: "text", text: "Capture a historical user without a provider call" }],
            })
            // Obtain real canonical Actor wire/native schemas without provider generation.
            yield* capture(session.id)
            const baseline = (yield* rows(session.id))[0]
            const actor = baseline?.tools?.find((tool) => tool.name === "actor")
            if (!actor?.native_input_schema) throw new Error("Missing actual captured Actor schemas")
            yield* Effect.sync(() =>
              Database.use((db) =>
                db
                  .delete(SessionPrefixSnapshotTable)
                  .where(eq(SessionPrefixSnapshotTable.session_id, session.id))
                  .run(),
              ),
            )
            // Historical v2 literal and hash, independent of the new projection helper.
            const legacy = [
              "Skills available in this session:",
              "<available_skills>",
              "  <skill>",
              "    <name>capture-probe</name>",
              `    <description>${OLD}</description>`,
              `    <location>${pathToFileURL(skillPath(dir)).href}</location>`,
              "  </skill>",
              "</available_skills>",
            ].join("\n")
            yield* sessions.updatePart({
              id: PartID.ascending(),
              sessionID: session.id,
              messageID: user.info.id,
              type: "text",
              synthetic: true,
              text: [
                "<system-reminder>",
                "Authoritative skills catalog snapshot v2:",
                "When multiple snapshots exist, the last one is authoritative.",
                legacy,
                "</system-reminder>",
              ].join("\n"),
              metadata: { skillCatalog: { schema: 2, version: createHash("sha256").update(legacy).digest("hex") } },
            })
            yield* writeSkill(dir, NEW)
            yield* registry.reload()
            gate.armed = true
            const pending = yield* capture(session.id).pipe(Effect.forkScoped)
            yield* Effect.promise(() => gate.hit.promise).pipe(Effect.timeout("10 seconds"))
            expect(yield* rows(session.id)).toEqual([])
            // A real competing pin wins while the cold producer is inside a real plugin hook.
            const tools = [{ ...actor, active: true }]
            const winner = yield* SessionPrefixSnapshot.pin({
              sessionID: session.id,
              profileKey: baseline.profile_key,
              system: ["LEGACY_PIN_WINNER_SYSTEM"],
              toolsHash: SessionPrefixSnapshot.toolsHash(
                SessionPrefixSnapshot.restoreTools(tools),
                ["actor"],
                ["mcp_pin_winner"],
              ),
              tools,
              activeTools: ["actor"],
              loadedMcpTools: ["mcp_pin_winner"],
              watermarkMessageID: user.info.id,
            })
            gate.release.resolve()
            const captured = yield* Fiber.join(pending)
            expect(winner.skill_catalog).toBeNull()
            expect(captured.system).toEqual(winner.system)
            expect(captured).toHaveProperty("currentTurnMessages", captured.inheritedMessages)
            expect(captured.system.join("\n")).not.toContain(NEW)
            expect(
              captured.inheritedMessages.some(
                (message) => message.role === "user" && JSON.stringify(message.content).includes(OLD),
              ),
            ).toBe(true)
            expect(Object.keys(captured.tools)).toEqual(["actor"])
            expect(
              yield* Effect.promise(() =>
                SessionPrefixSnapshot.snapshotTools(captured.tools, [...(captured.activeTools ?? [])]),
              ),
            ).toEqual(tools)
            expect(SessionPrefixSnapshot.nativeSchema(captured.tools.actor)).toEqual(actor.native_input_schema)
            expect(captured.activeTools).toEqual(["actor"])
            expect(captured.loadedMcpTools).toEqual(["mcp_pin_winner"])
            expect(captured.modelIdentity).toBeDefined()
            expect(yield* rows(session.id)).toEqual([winner])
            expect(yield* llm.inputs).toHaveLength(0)
          }),
        { git: true, config: (url) => ({ ...config(url), plugin: [pathToFileURL(plugin).href] }) },
      )
    }),
  30000,
)
