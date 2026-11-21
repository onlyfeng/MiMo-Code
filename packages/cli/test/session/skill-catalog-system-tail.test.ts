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
  "legacy NULL prefix is reused verbatim and its v2 history copy is never replayed",
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
          // The stored v2 snapshot is suppressed rather than replayed.
          expect(wire(continued, "conversation")).not.toContain("Authoritative skills catalog snapshot v2:")
          yield* writeSkill(dir, NEW)
          yield* (yield* ToolRegistry.Service).reload()
          const candidates = yield* prompt.recovery({ sessionID: session.id })
          expect(candidates).toHaveLength(1)
              if (candidates[0].kind !== "assistant") throw new Error("Expected an interrupted assistant candidate")
          expect(candidates[0].parentMessageID).toBe(user.info.id)
          yield* llm.text("resumed stored turn")
          yield* prompt.resume({ sessionID: session.id, assistantMessageID: candidates[0].assistantMessageID })
          const resumed = (yield* llm.inputs)[2]
          expect(wire(resumed, "system")).toContain("LEGACY_FROZEN_SYSTEM_WITHOUT_CATALOG")
          // Resuming an interrupted turn re-reaches the user-turn boundary (the
          // failed assistant is no longer the tail), so a skill change pending
          // since the interruption is announced once as a delta. The frozen
          // system is still reused byte-for-byte.
          expect(wire(resumed, "conversation").split(NEW)).toHaveLength(2)
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
          // The frozen system is reused byte-for-byte. Announced reminders are
          // history: the window keeps its entry (OLD) and the delta (NEW) that
          // superseded it, and the change is not announced again. The v2 copy
          // stays suppressed.
          expect(wire(next, "system")).toContain("LEGACY_FROZEN_SYSTEM_WITHOUT_CATALOG")
          expect(wire(next, "system")).not.toContain(NEW)
          expect(wire(next, "conversation").split(NEW)).toHaveLength(2)
          expect(wire(next, "conversation")).not.toContain("Authoritative skills catalog snapshot v2:")
          const persisted = (yield* sessions.messages({ sessionID: session.id })).flatMap((message) => message.parts)
          expect(persisted.find((part) => part.id === originalPart.id)).toEqual(originalPart)
          expect(persisted.filter((part) => part.type === "text" && part.metadata?.skillCatalog)).toHaveLength(1)
          const migrated = (yield* rows(session.id))[0]
          expect(migrated.system).toEqual(["LEGACY_FROZEN_SYSTEM_WITHOUT_CATALOG"])
          expect(migrated.skill_catalog).toBeNull()
          expect(yield* llm.misses).toEqual([])
        }),
      { git: true, config },
    ),
  30000,
)

it.live(
  "a mid-turn skill change is not announced until the next user turn",
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
            const frozen = (yield* rows(session.id))[0]
            expect(frozen.skill_catalog).toBeNull()
            yield* writeSkill(dir, NEW)
            yield* registry.reload()
            gate.resolve()
            yield* Fiber.join(work)
            const requests = yield* llm.inputs
            expect(requests).toHaveLength(2)
            for (const request of requests) {
              expect(wire(request, "system")).not.toContain(OLD)
              expect(wire(request, "system")).not.toContain(NEW)
              expect(wire(request, "conversation")).toContain(OLD)
              expect(wire(request, "conversation")).not.toContain(NEW)
            }
            expect(wire(requests[1], "system")).toEqual(wire(requests[0], "system"))
            expect(wire(requests[1], "conversation")).toContain(BODY)
            expect((yield* rows(session.id))[0].system).toEqual(frozen.system)
            yield* llm.text("new turn complete")
            yield* prompt.prompt({
              sessionID: session.id,
              agent: "build",
              model,
              parts: [{ type: "text", text: "New direct turn" }],
            })
            expect(wire((yield* llm.inputs)[2], "conversation")).toContain(NEW)
            expect(wire((yield* llm.inputs)[2], "system")).not.toContain(NEW)
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
  "cold capture excludes the catalog and retains the native Actor contract",
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
          expect(prefix.system.join("\n")).not.toContain(OLD)
          expect(prefix.system.join("\n")).not.toContain(CATALOG_MARKER)
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
  "compaction reuses the frozen catalog-free prefix despite live directory changes",
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
          expect(wire(summary, "system")).not.toContain(OLD)
          expect(wire(summary, "system")).not.toContain(NEW)
          expect(wire(summary, "conversation")).not.toContain(NEW)
          expect(summary.tools).toEqual(before.tools)
          // Load-bearing literal, not a snapshot of current behavior: the
          // processor throws on any tool call from a summary message, which
          // rolls the compaction boundary back. Upstream sends "auto" here and
          // carries the same throw. See FD-011.
          expect(summary.tool_choice).toBe("none")
          expect(yield* llm.misses).toEqual([])
          expect((yield* rows(session.id))[0].system).toEqual(frozen[0].system)
          expect((yield* rows(session.id))[0].skill_catalog).toBeNull()
        }),
      { git: true, config },
    ),
  30000,
)
