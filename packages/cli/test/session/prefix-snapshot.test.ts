import { describe, expect, test } from "bun:test"
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

  test("persists skill catalog metadata with native schemas across pin, rotation, and watermark advance", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await AppRuntime.runPromise(SessionNs.Service.use((service) => service.create({})))
        const catalog = {
          schema: 3 as const,
          text: "<available_skills>\n<skill>部署与 review</skill>\n</available_skills>",
          version: "a".repeat(64),
          turnID: MessageID.ascending(),
        }
        const replacement = {
          ...catalog,
          text: "<available_skills />",
          version: "b".repeat(64),
          turnID: MessageID.ascending(),
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
        const input = {
          sessionID: session.id,
          profileKey: "catalog-roundtrip",
          system: ["stable prefix", catalog.text],
          toolsHash: "native-tools",
          tools,
          loadedMcpTools: ["mcp_hidden"],
          watermarkMessageID: MessageID.ascending(),
        }
        const first = await AppRuntime.runPromise(SessionPrefixSnapshot.pin({ ...input, skillCatalog: catalog }))
        expect(first.skill_catalog).toEqual(catalog)
        expect(first.tools?.[0].native_input_schema).toEqual(native)
        expect(await AppRuntime.runPromise(SessionPrefixSnapshot.pin({ ...input, skillCatalog: replacement }))).toEqual(
          first,
        )

        const rotated = await AppRuntime.runPromise(
          SessionPrefixSnapshot.rotate({ ...input, skillCatalog: replacement }),
        )
        expect(rotated.skill_catalog).toEqual(replacement)
        expect(rotated.revision).toBe(2)
        // Older callers rotate tools/system without knowing this new metadata.
        const legacyRotation = await AppRuntime.runPromise(SessionPrefixSnapshot.rotate(input))
        expect(legacyRotation.skill_catalog).toEqual(replacement)
        expect(legacyRotation.revision).toBe(3)
        expect(legacyRotation.created_at).toBe(first.created_at)
        const watermark = MessageID.ascending()
        await AppRuntime.runPromise(
          SessionPrefixSnapshot.advance({
            sessionID: session.id,
            profileKey: input.profileKey,
            revision: 2,
            watermarkMessageID: watermark,
          }),
        )
        expect(await AppRuntime.runPromise(SessionPrefixSnapshot.get(session.id, input.profileKey))).toEqual(
          legacyRotation,
        )
        await AppRuntime.runPromise(
          SessionPrefixSnapshot.advance({
            sessionID: session.id,
            profileKey: input.profileKey,
            revision: 3,
            watermarkMessageID: watermark,
          }),
        )
        const restored = await AppRuntime.runPromise(SessionPrefixSnapshot.get(session.id, input.profileKey))
        expect(restored).toMatchObject({
          skill_catalog: replacement,
          tools,
          loaded_mcp_tools: ["mcp_hidden"],
          revision: 3,
          watermark_message_id: watermark,
        })
        expect(SessionPrefixSnapshot.restoreTools(restored!.tools!).actor).toHaveProperty("nativeInputSchema", native)
        expect(
          (
            await AppRuntime.runPromise(
              SessionPrefixSnapshot.rotate({
                ...input,
                profileKey: "rotate-without-existing-row",
                skillCatalog: catalog,
              }),
            )
          ).skill_catalog,
        ).toEqual(catalog)
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
