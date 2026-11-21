import { describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { jsonSchema, tool } from "ai"
import { Instance } from "../../src/project/instance"
import { Session as SessionNs } from "../../src/session"
import { SessionPrefixSnapshot } from "../../src/session/prefix-snapshot"
import { MessageID } from "../../src/session/schema"
import { AppRuntime } from "../../src/effect/app-runtime"
import { SessionPrefixSnapshotTable } from "../../src/session/session.sql"
import { and, Database, eq } from "../../src/storage"
import { tmpdir } from "../fixture/fixture"

const STRUCTURED =
  "IMPORTANT: The user has requested structured output. You MUST use the StructuredOutput tool to provide your final response. Do NOT respond with plain text - you MUST call the StructuredOutput tool with your answer formatted according to the schema."
const CATALOG = "Skills available in this session:\nNo skills are currently available."

describe("session prefix snapshot", () => {
  test("retains hidden executable schemas separately from advertised membership", async () => {
    const tools = {
      exec: tool({ description: "gateway", inputSchema: jsonSchema({ type: "object", properties: {} }) }),
      hidden: tool({
        description: "hidden target",
        inputSchema: jsonSchema({
          type: "object",
          properties: { count: { type: "integer", minimum: 2 } },
          required: ["count"],
          additionalProperties: false,
        }),
      }),
    }
    const snapshot = JSON.parse(JSON.stringify(await SessionPrefixSnapshot.snapshotTools(tools, ["exec", "absent"])))
    expect(snapshot.map((item: { name: string }) => item.name)).toEqual(["exec", "hidden"])
    expect(snapshot[1].input_schema).toEqual({
      type: "object",
      properties: { count: { type: "integer", minimum: 2 } },
      required: ["count"],
      additionalProperties: false,
    })
    const restored = SessionPrefixSnapshot.restoreTools(snapshot)
    expect(Object.keys(restored)).toEqual(["exec", "hidden"])
    expect(restored.hidden.execute).toBeUndefined()
    expect(SessionPrefixSnapshot.restoreActiveTools(snapshot)).toEqual(["exec"])
    expect(SessionPrefixSnapshot.toolsHash(tools, ["exec"])).not.toBe(
      SessionPrefixSnapshot.toolsHash({ exec: tools.exec }, ["exec"]),
    )
    expect(
      SessionPrefixSnapshot.restoreActiveTools([{ name: "legacy", input_schema: { type: "object", properties: {} } }]),
    ).toEqual(["legacy"])
    expect(SessionPrefixSnapshot.restoreActiveTools(await SessionPrefixSnapshot.snapshotTools(tools, []))).toEqual([])
  })

  test("invalidates snapshots when only hidden membership, schema, or advertisement changes", () => {
    const exec = tool({ inputSchema: jsonSchema({ type: "object", properties: {} }) })
    const hidden = tool({ inputSchema: jsonSchema({ type: "object", properties: { count: { type: "number" } } }) })
    const before = SessionPrefixSnapshot.toolsHash({ exec, hidden }, ["exec"])
    expect(before).not.toBe(SessionPrefixSnapshot.toolsHash({ exec }, ["exec"]))
    expect(before).not.toBe(SessionPrefixSnapshot.toolsHash({ exec, hidden: exec }, ["exec"]))
    expect(before).not.toBe(SessionPrefixSnapshot.toolsHash({ exec, hidden }, ["exec", "hidden"]))
  })

  test("freezes native Actor schemas independently of identical shell wire schemas", async () => {
    const wire = tool({ inputSchema: jsonSchema({ type: "object", properties: { script: { type: "string" } } }) })
    const original = {
      ...wire,
      nativeInputSchema: { type: "object" as const, properties: { agent: { enum: ["general"] } } },
    }
    const changed = {
      ...wire,
      nativeInputSchema: { type: "object" as const, properties: { agent: { enum: ["general", "new-agent"] } } },
    }
    expect(SessionPrefixSnapshot.toolsHash({ actor: original }, ["actor"])).not.toBe(
      SessionPrefixSnapshot.toolsHash({ actor: changed }, ["actor"]),
    )
    const snapshot = JSON.parse(
      JSON.stringify(await SessionPrefixSnapshot.snapshotTools({ actor: original }, ["actor"])),
    )
    expect(snapshot[0].native_input_schema).toEqual(original.nativeInputSchema)
    expect(SessionPrefixSnapshot.restoreTools(snapshot).actor).toHaveProperty(
      "nativeInputSchema",
      original.nativeInputSchema,
    )
    expect(
      SessionPrefixSnapshot.restoreTools([{ name: "actor", input_schema: { type: "object" } }]).actor,
    ).not.toHaveProperty("nativeInputSchema")
  })

  test("pins, rotates, advances, and cascades with its session", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await AppRuntime.runPromise(SessionNs.Service.use((service) => service.create({})))
        const key = SessionPrefixSnapshot.profileKey({
          providerID: "test",
          modelID: "test-model",
          modelAPIID: "responses",
          modelFamily: "test-family",
          agent: "build",
          agentID: "main",
          harness: "auto",
          systemMode: "append",
          system: "",
          permission: [],
        })
        const firstWatermark = MessageID.ascending()
        const first = await AppRuntime.runPromise(
          SessionPrefixSnapshot.pin({
            sessionID: session.id,
            profileKey: key,
            system: ["first"],
            toolsHash: "tools-1",
            tools: [],
            loadedMcpTools: ["mcp_first"],
            watermarkMessageID: firstWatermark,
          }),
        )
        expect(first).toMatchObject({
          revision: 1,
          system: ["first"],
          tools_hash: "tools-1",
          loaded_mcp_tools: ["mcp_first"],
          skill_catalog: null,
          watermark_message_id: firstWatermark,
        })

        const pinned = await AppRuntime.runPromise(
          SessionPrefixSnapshot.pin({
            sessionID: session.id,
            profileKey: key,
            system: ["ignored"],
            toolsHash: "ignored",
            tools: [],
            loadedMcpTools: [],
            watermarkMessageID: MessageID.ascending(),
          }),
        )
        expect(pinned).toEqual(first)

        const rotated = await AppRuntime.runPromise(
          SessionPrefixSnapshot.rotate({
            sessionID: session.id,
            profileKey: key,
            system: ["second"],
            toolsHash: "tools-2",
            tools: [],
            loadedMcpTools: ["mcp_second"],
            watermarkMessageID: firstWatermark,
          }),
        )
        expect(rotated).toMatchObject({
          revision: 2,
          system: ["second"],
          tools_hash: "tools-2",
          loaded_mcp_tools: ["mcp_second"],
          skill_catalog: null,
        })

        const finalWatermark = MessageID.ascending()
        await AppRuntime.runPromise(
          SessionPrefixSnapshot.advance({
            sessionID: session.id,
            profileKey: key,
            revision: 1,
            watermarkMessageID: MessageID.ascending(),
          }),
        )
        await AppRuntime.runPromise(
          SessionPrefixSnapshot.advance({
            sessionID: session.id,
            profileKey: key,
            revision: 2,
            watermarkMessageID: finalWatermark,
          }),
        )
        expect(await AppRuntime.runPromise(SessionPrefixSnapshot.get(session.id, key))).toMatchObject({
          revision: 2,
          watermark_message_id: finalWatermark,
        })

        await AppRuntime.runPromise(SessionNs.Service.use((service) => service.remove(session.id)))
        expect(await AppRuntime.runPromise(SessionPrefixSnapshot.get(session.id, key))).toBeUndefined()
      },
    })
  })

  // FC-005: rows written by older fork engines are cleaned once on read. The
  // schema-3 column is no longer written, so each row is stored here the way
  // those engines left it.
  test("retires legacy catalogs and unbacked format instructions on read, keeping every other frozen byte", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await AppRuntime.runPromise(SessionNs.Service.use((service) => service.create({})))
        const native = { type: "object" as const, properties: { action: { enum: ["spawn", "resume"] } } }
        const actor = {
          ...tool({
            description: "Actor lifecycle",
            inputSchema: jsonSchema({ type: "object", properties: { script: { type: "string" } } }),
          }),
          nativeInputSchema: native,
        }
        const plainTools = await SessionPrefixSnapshot.snapshotTools({ actor }, ["actor"])
        const jsonTools = [
          ...plainTools,
          { name: "StructuredOutput", input_schema: { type: "object" as const }, active: true },
        ]
        const record = (text: string, formatPrefix?: string) => ({
          schema: 3 as const,
          text,
          version: createHash("sha256").update(text).digest("hex"),
          turnID: MessageID.ascending(),
          ...(formatPrefix === undefined ? {} : { formatPrefix }),
        })
        const watermarkMessageID = MessageID.ascending()
        const seed = async (input: {
          profileKey: string
          system: string[]
          tools: typeof plainTools
          skillCatalog?: ReturnType<typeof record>
        }) => {
          const pinned = await AppRuntime.runPromise(
            SessionPrefixSnapshot.pin({
              sessionID: session.id,
              profileKey: input.profileKey,
              system: ["placeholder"],
              toolsHash: "legacy-tools",
              tools: input.tools,
              loadedMcpTools: ["mcp_hidden"],
              watermarkMessageID,
            }),
          )
          Database.use((db) =>
            db
              .update(SessionPrefixSnapshotTable)
              .set({
                system: input.system,
                system_hash: SessionPrefixSnapshot.systemHash(input.system),
                skill_catalog: input.skillCatalog ?? null,
              })
              .where(
                and(
                  eq(SessionPrefixSnapshotTable.session_id, session.id),
                  eq(SessionPrefixSnapshotTable.profile_key, input.profileKey),
                ),
              )
              .run(),
          )
          return pinned
        }
        const read = (profileKey: string, hostSystem?: string) =>
          AppRuntime.runPromise(SessionPrefixSnapshot.getFrozen({ sessionID: session.id, profileKey, hostSystem }))

        // A cold capture in JSON mode froze the instruction without its tool;
        // the schema-3 range held instruction and catalog together.
        const captured = await seed({
          profileKey: "json-capture",
          system: [`BASE\n\nENV\n\n${STRUCTURED}\n\n${CATALOG}\n\nINSTRUCTIONS`],
          tools: plainTools,
          skillCatalog: record(CATALOG, `${STRUCTURED}\n\n`),
        })
        const retired = await read("json-capture")
        expect(retired?.system).toEqual(["BASE\n\nENV\n\nINSTRUCTIONS"])
        expect(retired?.system_hash).toBe(SessionPrefixSnapshot.systemHash(retired!.system))
        expect(retired?.skill_catalog).toBeNull()
        expect(retired?.tools).toEqual(plainTools)
        expect(SessionPrefixSnapshot.restoreTools(retired!.tools!).actor).toHaveProperty("nativeInputSchema", native)
        expect(retired?.loaded_mcp_tools).toEqual(["mcp_hidden"])
        expect(retired?.watermark_message_id).toBe(watermarkMessageID)
        expect(retired?.revision).toBe(captured.revision)
        // Idempotent: a second read neither rewrites nor re-strips.
        expect(await read("json-capture")).toEqual(retired)

        // A JSON-mode prefix froze its StructuredOutput tool too: the
        // instruction stays until a tools-hash rotation rebuilds the system.
        await seed({
          profileKey: "json-pinned",
          system: [`BASE\n\n${STRUCTURED}\n\n${CATALOG}\n\nINSTRUCTIONS`],
          tools: jsonTools,
          skillCatalog: record(CATALOG, `${STRUCTURED}\n\n`),
        })
        expect((await read("json-pinned"))?.system).toEqual([`BASE\n\n${STRUCTURED}\n\nINSTRUCTIONS`])

        // A catalog the retired code appended as its own message goes with
        // that message, and host-supplied copies of the instruction stay.
        const host = `Host rules.\n\n${STRUCTURED}`
        await seed({
          profileKey: "appended",
          system: [`${host}\n\nENV\n\n${STRUCTURED}`, `${STRUCTURED}\n\n${CATALOG}`, `${STRUCTURED}\n\n`],
          tools: plainTools,
        })
        expect((await read("appended", host))?.system).toEqual([`${host}\n\nENV`])

        // An empty catalog owned no text, but its record is still retired;
        // a JSON-mode instruction its tool backs stays.
        await seed({
          profileKey: "empty-catalog",
          system: [`BASE\n\n${STRUCTURED}\n\n\n\nINSTRUCTIONS`],
          tools: jsonTools,
          skillCatalog: record("", `${STRUCTURED}\n\n`),
        })
        const empty = await read("empty-catalog")
        expect(empty?.system).toEqual([`BASE\n\n${STRUCTURED}\n\n\n\nINSTRUCTIONS`])
        expect(empty?.skill_catalog).toBeNull()
        await seed({
          profileKey: "empty-catalog-text",
          system: [`BASE\n\n${STRUCTURED}\n\n\n\nINSTRUCTIONS`],
          tools: plainTools,
          skillCatalog: record("", `${STRUCTURED}\n\n`),
        })
        // The same bytes a text-mode prefix with an empty catalog had.
        expect((await read("empty-catalog-text"))?.system).toEqual(["BASE\n\n\n\nINSTRUCTIONS"])
      },
    })
  })

  test.each([
    {
      modelID: "claude-test",
      modelFamily: "claude",
      harness: "default",
      legacyKey: "9fe9bb2c6ae00b0a1b76781f03a20df5a847efabbae09ffb4960254af33bc6fd",
    },
    {
      modelID: "gpt-5-test",
      modelFamily: "gpt",
      harness: "codex",
      legacyKey: "65d148a287a9102d1b16475c9d094efe472cca941b046317a0371e0d991756a8",
    },
  ])("does not reuse a pre-policy $harness prefix when profile inputs are unchanged", async (entry) => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await AppRuntime.runPromise(SessionNs.Service.use((service) => service.create({})))
        const profile = {
          providerID: "test",
          modelID: entry.modelID,
          modelAPIID: "responses",
          modelFamily: entry.modelFamily,
          agent: "build",
          agentID: "main",
          harness: entry.harness,
          systemMode: "append",
          system: "",
          permission: [],
        }
        // Fixed keys produced by the unversioned profile hash before the policy change.
        const legacy = await AppRuntime.runPromise(
          SessionPrefixSnapshot.pin({
            sessionID: session.id,
            profileKey: entry.legacyKey,
            system: ["legacy model-specific prompt"],
            toolsHash: "legacy-tools",
            tools: [{ name: "exec", input_schema: { type: "object" } }],
            loadedMcpTools: ["mcp_legacy"],
            watermarkMessageID: MessageID.ascending(),
          }),
        )
        const key = SessionPrefixSnapshot.profileKey(profile)
        expect(key).not.toBe(entry.legacyKey)
        expect(await AppRuntime.runPromise(SessionPrefixSnapshot.get(session.id, key))).toBeUndefined()
        const current = await AppRuntime.runPromise(
          SessionPrefixSnapshot.pin({
            sessionID: session.id,
            profileKey: key,
            system: ["current unified harness prompt"],
            toolsHash: "current-tools",
            tools: [{ name: "read", input_schema: { type: "object" } }],
            loadedMcpTools: [],
            watermarkMessageID: MessageID.ascending(),
          }),
        )
        expect(current).toMatchObject({
          system: ["current unified harness prompt"],
          tools_hash: "current-tools",
          tools: [{ name: "read", input_schema: { type: "object" } }],
          loaded_mcp_tools: [],
          revision: 1,
        })
        expect(
          await AppRuntime.runPromise(
            SessionPrefixSnapshot.get(session.id, SessionPrefixSnapshot.profileKey({ ...profile })),
          ),
        ).toEqual(current)
        expect(await AppRuntime.runPromise(SessionPrefixSnapshot.get(session.id, entry.legacyKey))).toEqual(legacy)
      },
    })
  })

  test("keeps each profile identity isolated within the current policy", () => {
    const profile = {
      providerID: "test",
      modelID: "test-model",
      modelAPIID: "responses",
      modelFamily: "test-family",
      agent: "build",
      agentID: "main",
      harness: "default",
      systemMode: "append",
      system: "",
      permission: [],
    }
    const key = SessionPrefixSnapshot.profileKey(profile)
    const variants = [
      { providerID: "other" },
      { modelID: "other-model" },
      { modelAPIID: "chat" },
      { modelFamily: "other-family" },
      { harnessModel: "gpt-5" },
      { agent: "plan" },
      { agentID: "peer" },
      { harness: "codex" },
      { systemMode: "replace" },
      { system: "custom prompt" },
      { permission: [{ permission: "*", pattern: "*", action: "allow" as const }] },
    ].map((change) => SessionPrefixSnapshot.profileKey({ ...profile, ...change }))
    expect(new Set([key, ...variants]).size).toBe(variants.length + 1)
    expect(SessionPrefixSnapshot.profileKey({ ...profile, harnessModel: undefined })).toBe(key)
  })

  test("profile and tool hashes are stable across key order", () => {
    const permission = [{ permission: "*", pattern: "*", action: "allow" as const }]
    const key = SessionPrefixSnapshot.profileKey({
      providerID: "p",
      modelID: "m",
      modelAPIID: "responses",
      modelFamily: "family",
      agent: "build",
      agentID: "main",
      harness: "auto",
      systemMode: "append",
      system: "",
      permission,
    })
    expect(key).toBe(
      SessionPrefixSnapshot.profileKey({
        permission,
        systemMode: "append",
        system: "",
        harness: "auto",
        agentID: "main",
        agent: "build",
        modelID: "m",
        providerID: "p",
        modelAPIID: "responses",
        modelFamily: "family",
      }),
    )
    expect(key).not.toBe(
      SessionPrefixSnapshot.profileKey({
        providerID: "p",
        modelID: "other",
        modelAPIID: "responses",
        modelFamily: "family",
        agent: "build",
        agentID: "main",
        harness: "auto",
        systemMode: "append",
        system: "",
        permission,
      }),
    )
    expect(key).not.toBe(
      SessionPrefixSnapshot.profileKey({
        providerID: "p",
        modelID: "m",
        modelAPIID: "chat",
        modelFamily: "family",
        agent: "build",
        agentID: "main",
        harness: "auto",
        systemMode: "append",
        system: "",
        permission,
      }),
    )
    expect(key).not.toBe(
      SessionPrefixSnapshot.profileKey({
        providerID: "p",
        modelID: "m",
        modelAPIID: "responses",
        modelFamily: "other-family",
        agent: "build",
        agentID: "main",
        harness: "auto",
        systemMode: "append",
        system: "",
        permission,
      }),
    )
    const first = {
      beta: tool({ description: "b", inputSchema: jsonSchema({ type: "object", properties: {} }) }),
      alpha: tool({ description: "a", inputSchema: jsonSchema({ type: "object", properties: {} }) }),
    }
    const second = { alpha: first.alpha, beta: first.beta }
    expect(SessionPrefixSnapshot.toolsHash(first, ["beta", "alpha"])).toBe(
      SessionPrefixSnapshot.toolsHash(second, ["alpha", "beta"]),
    )
  })
})
