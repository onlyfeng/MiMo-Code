import { describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { jsonSchema, tool } from "ai"
import { Instance } from "../../src/project/instance"
import { Session as SessionNs } from "../../src/session"
import { SessionPrefixSnapshot } from "../../src/session/prefix-snapshot"
import { MessageID } from "../../src/session/schema"
import { AppRuntime } from "../../src/effect/app-runtime"
import { tmpdir } from "../fixture/fixture"

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

  // FC-005: the schema-3 column is retired for writing. An existing row must
  // still parse, and reading the prefix must retire it exactly once while every
  // non-catalog byte, the native tool pair and the watermark stay as pinned.
  test("retires a stored schema-3 catalog on read without touching other frozen bytes", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await AppRuntime.runPromise(SessionNs.Service.use((service) => service.create({})))
        const text = "Skills available in this session:\nNo skills are currently available."
        const catalog = {
          schema: 3 as const,
          text,
          version: createHash("sha256").update(text).digest("hex"),
          turnID: MessageID.ascending(),
          // The slot marks the start of the managed range (format prefix + catalog).
          systemSlot: { message: 1, offset: 0 },
          formatPrefix: "JSON FORMAT\n\n",
        }
        const native = { type: "object" as const, properties: { action: { enum: ["spawn", "resume"] } } }
        const actor = {
          ...tool({
            description: "Actor lifecycle",
            inputSchema: jsonSchema({ type: "object", properties: { script: { type: "string" } } }),
          }),
          nativeInputSchema: native,
        }
        const tools = await SessionPrefixSnapshot.snapshotTools({ actor }, ["actor"])
        const watermarkMessageID = MessageID.ascending()
        const profileKey = "catalog-retirement"
        const pinned = await AppRuntime.runPromise(
          SessionPrefixSnapshot.pin({
            sessionID: session.id,
            profileKey,
            system: ["ENV", `JSON FORMAT\n\n${text}`, "INSTRUCTIONS"],
            toolsHash: "native-tools",
            tools,
            loadedMcpTools: ["mcp_hidden"],
            skillCatalog: catalog,
            watermarkMessageID,
          }),
        )
        expect(pinned.skill_catalog).toEqual(catalog)

        const retired = await AppRuntime.runPromise(
          SessionPrefixSnapshot.getFrozen({ sessionID: session.id, profileKey }),
        )
        // The whole managed range goes, format prefix included; a system
        // message left empty is dropped rather than sent blank.
        expect(retired?.system).toEqual(["ENV", "INSTRUCTIONS"])
        expect(retired?.system_hash).toBe(SessionPrefixSnapshot.systemHash(retired!.system))
        expect(retired?.skill_catalog).toBeNull()
        expect(retired?.tools).toEqual(tools)
        expect(retired?.loaded_mcp_tools).toEqual(["mcp_hidden"])
        expect(retired?.watermark_message_id).toBe(watermarkMessageID)
        expect(retired?.revision).toBe(pinned.revision)

        // Idempotent: a second read neither rewrites nor re-strips.
        const again = await AppRuntime.runPromise(
          SessionPrefixSnapshot.getFrozen({ sessionID: session.id, profileKey }),
        )
        expect(again).toEqual(retired)
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
