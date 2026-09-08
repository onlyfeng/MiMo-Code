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
import { bindSkillCatalog, captureSkillCatalog, newSkillCatalogSlot } from "../../src/session/skill-catalog"
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
  "cold capture pins catalog and native tools across repeated captures of the same noReply user",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          yield* writeSkill(dir, OLD)
          const sessions = yield* Session.Service
          const prompt = yield* SessionPrompt.Service
          const registry = yield* ToolRegistry.Service
          const session = yield* sessions.create({ title: "Repeated cold capture" })
          const user = yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            harness: "codex",
            noReply: true,
            parts: [{ type: "text", text: "Capture this same direct user twice" }],
          })
          expect(yield* rows(session.id)).toEqual([])
          const first = yield* capture(session.id)
          expect(first.system.join("\n")).toContain(OLD)
          const pinned = (yield* rows(session.id))[0]
          if (!pinned?.skill_catalog || !pinned.tools || !first.tools.actor)
            throw new Error("Missing pinned catalog or actual Actor tool")
          expect(pinned.skill_catalog.schema).toBe(3)
          expect(pinned.skill_catalog.turnID).toBe(user.info.id)
          expect(pinned.skill_catalog.text).toContain(OLD)
          expect(pinned.skill_catalog.version).toBe(
            createHash("sha256").update(pinned.skill_catalog.text).digest("hex"),
          )
          expect(pinned.system).toEqual(first.system)
          const native = SessionPrefixSnapshot.nativeSchema(first.tools.actor)
          expect(native).toBeDefined()
          expect(pinned.tools?.find((tool) => tool.name === "actor")?.native_input_schema).toEqual(native)

          yield* writeSkill(dir, NEW)
          yield* registry.reload()
          const second = yield* capture(session.id)
          expect(second.system).toEqual(first.system)
          expect(second.system.join("\n")).not.toContain(NEW)
          expect(second.inheritedMessages).toEqual(first.inheritedMessages)
          expect(
            yield* Effect.promise(() =>
              SessionPrefixSnapshot.snapshotTools(second.tools, [...(second.activeTools ?? [])]),
            ),
          ).toEqual(pinned.tools)
          expect(SessionPrefixSnapshot.nativeSchema(second.tools.actor)).toEqual(native)
          expect(second.activeTools).toEqual(first.activeTools)
          expect(second.loadedMcpTools).toEqual(first.loadedMcpTools)
          expect(second.modelIdentity).toBe(first.modelIdentity)
          expect(yield* rows(session.id)).toEqual([pinned])
          expect(yield* llm.inputs).toHaveLength(0)
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "cold capture returns the pin winner catalog layout and complete native tool pair after a real hook race",
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
              toolsHash: SessionPrefixSnapshot.toolsHash(SessionPrefixSnapshot.restoreTools(tools), ["actor"], ["mcp_pin_winner"]),
              tools,
              activeTools: ["actor"],
              loadedMcpTools: ["mcp_pin_winner"],
              watermarkMessageID: user.info.id,
            })
            gate.release.resolve()
            const captured = yield* Fiber.join(pending)
            expect(winner.skill_catalog).toBeNull()
            expect(captured.system).toEqual(winner.system)
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

for (const layout of ["legacy", "managed format"] as const) it.live(
  `runLoop uses a competing pin winner system and ${layout} layout while retaining executable tools`,
  () =>
    Effect.gen(function* () {
      const key = `runloop-capture-gate-${randomUUID()}`
      const gate = { armed: false, hit: Promise.withResolvers<void>(), release: Promise.withResolvers<void>() }
      Reflect.set(globalThis, key, gate)
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          gate.release.resolve()
          Reflect.deleteProperty(globalThis, key)
        }),
      )
      const plugin = path.join(yield* tmpdirScoped(), "runloop-gate.ts")
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
            yield* writeSkill(dir, NEW)
            const sessions = yield* Session.Service
            const prompt = yield* SessionPrompt.Service
            const session = yield* sessions.create({ title: "RunLoop pin race" })
            const user = yield* prompt.prompt({
              sessionID: session.id,
              agent: "build",
              model,
              harness: "codex",
              noReply: true,
              parts: [{ type: "text", text: "Execute the requested script, then finish" }],
            })
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
            yield* llm.push(reply().tool("exec", { code: 'return "WINNER_EXECUTED_1e9d"' }))
            yield* llm.text("Completed the winner's request")
            gate.armed = true
            const pending = yield* prompt.loop({ sessionID: session.id }).pipe(Effect.forkScoped)
            yield* Effect.promise(() => gate.hit.promise).pipe(Effect.timeout("10 seconds"))
            expect(yield* rows(session.id)).toEqual([])
            expect(yield* llm.inputs).toHaveLength(0)
            // A competing legacy pin has different advertised tools. The live loop may
            // rotate that pool, but must retain the winning system/catalog and execute closures.
            const tools = [{ ...actor, active: true }]
            const token = newSkillCatalogSlot()
            const bound = layout === "managed format"
              ? bindSkillCatalog([`RUNLOOP_PIN_WINNER_SYSTEM\n\n${token}`], captureSkillCatalog(legacy, user.info.id), token, "STALE_JSON_MODE\n\n")
              : undefined
            const expectedSystem = bound ? [`RUNLOOP_PIN_WINNER_SYSTEM\n\n${legacy}`] : ["RUNLOOP_PIN_WINNER_SYSTEM"]
            const winner = yield* SessionPrefixSnapshot.pin({
              sessionID: session.id,
              profileKey: baseline.profile_key,
              system: bound?.system ?? expectedSystem,
              skillCatalog: bound?.catalog,
              toolsHash: SessionPrefixSnapshot.toolsHash(SessionPrefixSnapshot.restoreTools(tools), ["actor"]),
              tools,
              activeTools: ["actor"],
              loadedMcpTools: [],
              watermarkMessageID: user.info.id,
            })
            gate.release.resolve()
            yield* Fiber.join(pending)
            const requests = yield* llm.inputs
            expect(requests).toHaveLength(2)
            for (const request of requests) {
              if (!Array.isArray(request.messages)) throw new Error("Expected real chat-compatible wire")
              const system = request.messages.filter((message) => message.role === "system")
              const conversation = request.messages.filter((message) => message.role !== "system")
              expect(system).toEqual([{ role: "system", content: expectedSystem.join("\n\n") }])
              expect(JSON.stringify(conversation).includes(OLD)).toBe(layout === "legacy")
              expect(JSON.stringify(conversation)).not.toContain(NEW)
            }
            if (!Array.isArray(requests[1].messages)) throw new Error("Expected actual tool-result messages")
            expect(requests[1].messages.filter((message) => message.role === "tool")).toEqual([
              expect.objectContaining({ content: expect.stringContaining("WINNER_EXECUTED_1e9d") }),
            ])
            const stored = (yield* rows(session.id))[0]
            expect(stored.system).toEqual(expectedSystem)
            if (layout === "legacy") expect(stored.skill_catalog).toBeNull()
            else {
              expect(stored.skill_catalog?.text).toBe(legacy)
              expect(stored.skill_catalog?.formatPrefix).toBeUndefined()
              expect(stored.skill_catalog?.version).toBe(winner.skill_catalog?.version)
            }
            expect(stored.tools?.some((tool) => tool.name === "exec" && tool.active !== false)).toBe(true)
            expect(stored.tools?.find((tool) => tool.name === "actor")?.native_input_schema).toEqual(
              actor.native_input_schema,
            )
            expect(yield* llm.misses).toEqual([])
          }),
        { git: true, config: (url) => ({ ...config(url), plugin: [pathToFileURL(plugin).href] }) },
      )
    }),
  30000,
)
