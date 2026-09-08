import { expect } from "bun:test"
import { createHash } from "node:crypto"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { Effect, Fiber, Layer } from "effect"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionCompaction } from "../../src/session/compaction"
import { MessageV2 } from "../../src/session/message-v2"
import { PartID } from "../../src/session/schema"
import { prefixCaptureRef } from "../../src/session/prefix-capture-ref"
import { SessionPrefixSnapshot } from "../../src/session/prefix-snapshot"
import { SessionPrefixSnapshotTable } from "../../src/session/session.sql"
import { Database, eq } from "../../src/storage"
import { ToolRegistry } from "../../src/tool"
import { provideTmpdirServer } from "../fixture/fixture"
import { TestLLMServer, reply } from "../lib/llm-server"
import { testEffect } from "../lib/effect"
import { withEnv } from "../lib/env"

withEnv({
  MIMOCODE_DISABLE_BUILTIN_SKILLS: "true",
  MIMOCODE_DISABLE_COMPOSE_SKILLS: "true",
  MIMOCODE_DISABLE_INSTRUCTIONS: "true",
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
const CATALOG_MARKER = "Skills available in this session:"
const OLD = "OLD_CATALOG_DESCRIPTION_6a31 describes <skill_content> syntax"
const NEW = "NEW_CATALOG_DESCRIPTION_2f47"
const BODY = "SKILL_BODY_STAYS_IN_USER_MESSAGE_8d13"
const skillPath = (dir: string) => path.join(dir, ".mimocode/skill/catalog-probe/SKILL.md")
const writeSkill = (dir: string, description: string) =>
  Effect.promise(() =>
    Bun.write(skillPath(dir), `---\nname: catalog-probe\ndescription: ${description}\n---\n\n${BODY}\n`),
  )

// Historical literal, not the future catalog implementation/helper.
const oldCatalog = (dir: string) =>
  [
    CATALOG_MARKER,
    "<available_skills>",
    "  <skill>",
    "    <name>catalog-probe</name>",
    `    <description>${OLD}</description>`,
    `    <location>${pathToFileURL(skillPath(dir)).href}</location>`,
    "  </skill>",
    "</available_skills>",
  ].join("\n")
const oldV2Text = (catalog: string) =>
  [
    "<system-reminder>",
    "Authoritative skills catalog snapshot v2:",
    "When multiple snapshots exist, the last one is authoritative.",
    catalog,
    "</system-reminder>",
  ].join("\n")

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
  "legacy NULL prefix recovers its catalog pair then migrates only on a new direct user",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          yield* writeSkill(dir, OLD)
          const sessions = yield* Session.Service
          const prompt = yield* SessionPrompt.Service
          const session = yield* sessions.create({ title: "Legacy prefix pair" })
          // Prime only the live tool contract, then independently construct historical data.
          yield* llm.text("fixture schema warmup")
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            harness: "codex",
            parts: [{ type: "text", text: "Fixture schema warmup" }],
          })
          const live = (yield* rows(session.id))[0]
          if (!live?.tools) throw new Error("Missing actual runLoop tool contract")
          for (const message of yield* sessions.messages({ sessionID: session.id }))
            yield* sessions.removeMessage({ sessionID: session.id, messageID: message.info.id })
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            harness: "codex",
            noReply: true,
            parts: [{ type: "text", text: "Existing stored user before upgrade" }],
          })
          const messages = yield* sessions.messages({ sessionID: session.id })
          const user = messages.findLast((message) => message.info.role === "user")
          if (!user || user.info.role !== "user") throw new Error("Missing stored user")
          const originalPart: MessageV2.TextPart = {
            id: PartID.ascending(),
            sessionID: session.id,
            messageID: user.info.id,
            type: "text",
            synthetic: true,
            text: oldV2Text(oldCatalog(dir)),
            metadata: {
              skillCatalog: { schema: 2, version: createHash("sha256").update(oldCatalog(dir)).digest("hex") },
            },
          }
          yield* sessions.updatePart(originalPart)
          // Independently enumerate the OLD row columns. Never spread a current pin() record.
          // Use actual captured tool contracts to avoid an unrelated native-schema rotation.
          yield* Effect.sync(() =>
            Database.use((db) => {
              db.delete(SessionPrefixSnapshotTable).where(eq(SessionPrefixSnapshotTable.session_id, session.id)).run()
              db.insert(SessionPrefixSnapshotTable)
                .values({
                  session_id: session.id,
                  profile_key: live.profile_key,
                  system: ["LEGACY_FROZEN_SYSTEM_WITHOUT_CATALOG"],
                  system_hash: SessionPrefixSnapshot.systemHash(["LEGACY_FROZEN_SYSTEM_WITHOUT_CATALOG"]),
                  tools_hash: live.tools_hash,
                  tools: live.tools,
                  loaded_mcp_tools: live.loaded_mcp_tools,
                  watermark_message_id: user.info.id,
                  revision: 1,
                  created_at: 1,
                  updated_at: 1,
                  // Omitted nullable skill_catalog preserves the independently constructed old row.
                })
                .run()
            }),
          )
          yield* llm.error(400, { error: { message: "terminal provider failure for recovery fixture" } })
          yield* prompt.loop({ sessionID: session.id }).pipe(Effect.exit)
          const continued = (yield* llm.inputs)[1]
          expect(wire(continued, "system")).toContain("LEGACY_FROZEN_SYSTEM_WITHOUT_CATALOG")
          expect(wire(continued, "system")).not.toContain(OLD)
          expect(wire(continued, "conversation")).toContain(OLD)
          expect(wire(continued, "conversation").split(OLD)).toHaveLength(2)
          yield* writeSkill(dir, NEW)
          yield* (yield* ToolRegistry.Service).reload()
          const candidates = yield* prompt.recovery({ sessionID: session.id })
          expect(candidates).toHaveLength(1)
          expect(candidates[0].parentMessageID).toBe(user.info.id)
          yield* llm.text("resumed stored turn")
          yield* prompt.resume({ sessionID: session.id, assistantMessageID: candidates[0].assistantMessageID })
          const resumed = (yield* llm.inputs)[2]
          expect(wire(resumed, "system")).toContain("LEGACY_FROZEN_SYSTEM_WITHOUT_CATALOG")
          expect(wire(resumed, "conversation")).toContain(OLD)
          expect(wire(resumed, "conversation")).not.toContain(NEW)
          expect(
            (yield* sessions.messages({ sessionID: session.id })).filter((message) => message.info.role === "user"),
          ).toHaveLength(1)
          expect((yield* rows(session.id))[0].skill_catalog).toBeNull()
          yield* llm.text("new direct turn")
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            parts: [{ type: "text", text: "A genuinely new direct user query" }],
          })
          const next = (yield* llm.inputs)[3]
          expect(wire(next, "system")).toContain("LEGACY_FROZEN_SYSTEM_WITHOUT_CATALOG")
          expect(wire(next, "system")).toContain(NEW)
          expect(wire(next, "system").split(NEW)).toHaveLength(2)
          expect(wire(next, "conversation")).not.toContain(OLD)
          expect(wire(next, "conversation")).not.toContain(NEW)
          const persisted = (yield* sessions.messages({ sessionID: session.id })).flatMap((message) => message.parts)
          expect(persisted.find((part) => part.id === originalPart.id)).toEqual(originalPart)
          expect(persisted.filter((part) => part.type === "text" && part.metadata?.skillCatalog)).toHaveLength(1)
          const migrated = (yield* rows(session.id))[0]
          const nextUser = (yield* sessions.messages({ sessionID: session.id })).findLast(
            (message) => message.info.role === "user",
          )
          expect(migrated.skill_catalog).toMatchObject({ schema: 3, turnID: nextUser?.info.id })
          expect(migrated.skill_catalog?.text).toContain(NEW)
          expect(migrated.skill_catalog?.version).toMatch(/^[a-f0-9]{64}$/)
          expect(yield* llm.misses).toEqual([])
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "provider tool continuation freezes catalog within a real turn then updates next turn",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          yield* writeSkill(dir, OLD)
          const sessions = yield* Session.Service
          const prompt = yield* SessionPrompt.Service
          const registry = yield* ToolRegistry.Service
          const session = yield* sessions.create({ title: "Same turn catalog" })
          const gate = Promise.withResolvers<void>()
          // Pause the real SSE response after request admission, before the tool call completes.
          yield* llm.push(reply().tool("exec", { code: 'return "catalog step one"' }).wait(gate.promise))
          yield* llm.text("turn complete")
          const work = yield* prompt
            .prompt({
              sessionID: session.id,
              agent: "build",
              model,
              harness: "codex",
              parts: [{ type: "text", text: "Use /catalog-probe, then run the requested compute step" }],
            })
            .pipe(Effect.forkScoped)
          try {
            yield* llm.wait(1).pipe(Effect.timeout("10 seconds"))
            const frozen = (yield* rows(session.id))[0].skill_catalog
            expect(frozen).toMatchObject({ schema: 3 })
            yield* writeSkill(dir, NEW)
            yield* registry.reload()
            gate.resolve()
            yield* Fiber.join(work)
            const requests = yield* llm.inputs
            expect(requests).toHaveLength(2)
            for (const request of requests) {
              expect(wire(request, "system")).toContain(OLD)
              expect(wire(request, "system")).not.toContain(NEW)
              expect(wire(request, "conversation")).not.toContain(CATALOG_MARKER)
            }
            expect(wire(requests[1], "system")).toEqual(wire(requests[0], "system"))
            expect(wire(requests[1], "conversation")).toContain(BODY)
            expect((yield* rows(session.id))[0].skill_catalog).toEqual(frozen)
            yield* llm.text("new turn complete")
            yield* prompt.prompt({
              sessionID: session.id,
              agent: "build",
              model,
              parts: [{ type: "text", text: "New direct turn" }],
            })
            expect(wire((yield* llm.inputs)[2], "system")).toContain(NEW)
            expect(yield* llm.misses).toEqual([])
          } finally {
            gate.resolve()
            yield* Fiber.interrupt(work)
          }
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "cold capture includes catalog system tail and retains native Actor contract",
  () =>
    provideTmpdirServer(
      ({ dir }) =>
        Effect.gen(function* () {
          yield* writeSkill(dir, OLD)
          const sessions = yield* Session.Service
          const prompt = yield* SessionPrompt.Service
          const session = yield* sessions.create({ title: "Cold catalog capture" })
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            harness: "codex",
            noReply: true,
            parts: [{ type: "text", text: "Capture before any provider generation" }],
          })
          expect(yield* rows(session.id)).toEqual([])
          const prefix = yield* capture(session.id)
          expect(prefix.system.join("\n")).toContain(OLD)
          expect(prefix.system.join("\n").split(OLD)).toHaveLength(2)
          expect(JSON.stringify(prefix.inheritedMessages)).not.toContain(CATALOG_MARKER)
          const tools = yield* Effect.promise(() =>
            SessionPrefixSnapshot.snapshotTools(prefix.tools, [...(prefix.activeTools ?? Object.keys(prefix.tools))]),
          )
          expect(tools.find((item) => item.name === "actor")?.native_input_schema).toBeDefined()
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "compaction third profile consumer uses frozen catalog despite live directory changes",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          yield* writeSkill(dir, OLD)
          const sessions = yield* Session.Service
          const prompt = yield* SessionPrompt.Service
          const compaction = yield* SessionCompaction.Service
          const session = yield* sessions.create({ title: "Compaction catalog profile" })
          // Three real turns mirror the existing compaction transcript fixture, ensuring history.
          for (const text of ["first query", "second query", "third query"]) {
            yield* llm.text(`answer to ${text}`)
            yield* prompt.prompt({
              sessionID: session.id,
              agent: "build",
              model,
              harness: "codex",
              parts: [{ type: "text", text }],
            })
          }
          const before = (yield* llm.inputs)[2]
          const frozen = yield* rows(session.id)
          expect(frozen).toHaveLength(1)
          yield* writeSkill(dir, NEW)
          yield* (yield* ToolRegistry.Service).reload()
          yield* compaction.create({ sessionID: session.id, agent: "compaction", model, auto: false })
          const messages = yield* sessions.messages({ sessionID: session.id })
          const boundary = messages.at(-1)
          if (!boundary) throw new Error("Missing real compaction boundary")
          yield* llm.text("summary")
          expect(
            yield* compaction.process({ parentID: boundary.info.id, messages, sessionID: session.id, auto: false }),
          ).toBe("continue")
          const summary = (yield* llm.inputs)[3]
          expect(wire(summary, "system")).toEqual(wire(before, "system"))
          expect(wire(summary, "system")).toContain(OLD)
          expect(wire(summary, "system")).not.toContain(NEW)
          expect(wire(summary, "conversation")).not.toContain(CATALOG_MARKER)
          expect(summary.tools).toEqual(before.tools)
          expect(summary.tool_choice).toBe("none")
          expect(yield* llm.misses).toEqual([])
          expect((yield* rows(session.id))[0].skill_catalog).toEqual(frozen[0].skill_catalog)
        }),
      { git: true, config },
    ),
  30000,
)
