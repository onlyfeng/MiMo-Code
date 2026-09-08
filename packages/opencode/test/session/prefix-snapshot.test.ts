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

  test("retains loaded MCP membership in the full-pool snapshot identity", () => {
    const tools = { exec: tool({ inputSchema: jsonSchema({ type: "object", properties: {} }) }) }
    expect(SessionPrefixSnapshot.toolsHash(tools, ["exec"], ["first"])).not.toBe(
      SessionPrefixSnapshot.toolsHash(tools, ["exec"], ["second"]),
    )
    expect(SessionPrefixSnapshot.toolsHash(tools, ["exec"], ["first", "second"])).toBe(
      SessionPrefixSnapshot.toolsHash(tools, ["exec"], ["second", "first"]),
    )
  })

  test("freezes native Actor schemas independently of identical shell wire schemas", async () => {
    const wire = tool({ inputSchema: jsonSchema({ type: "object", properties: { script: { type: "string" } } }) })
    const original = { ...wire, nativeInputSchema: { type: "object" as const, properties: { agent: { enum: ["general"] } } } }
    const changed = { ...wire, nativeInputSchema: { type: "object" as const, properties: { agent: { enum: ["general", "new-agent"] } } } }
    expect(SessionPrefixSnapshot.toolsHash({ actor: original }, ["actor"])).not.toBe(
      SessionPrefixSnapshot.toolsHash({ actor: changed }, ["actor"]),
    )
    const snapshot = JSON.parse(JSON.stringify(await SessionPrefixSnapshot.snapshotTools({ actor: original }, ["actor"])))
    expect(snapshot[0].native_input_schema).toEqual(original.nativeInputSchema)
    expect(SessionPrefixSnapshot.restoreTools(snapshot).actor).toHaveProperty("nativeInputSchema", original.nativeInputSchema)
    expect(SessionPrefixSnapshot.restoreTools([{ name: "actor", input_schema: { type: "object" } }]).actor)
      .not.toHaveProperty("nativeInputSchema")
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
            activeTools: ["local_first", "mcp_first"],
            loadedMcpTools: ["mcp_first"],
            watermarkMessageID: firstWatermark,
          }),
        )
        expect(first).toMatchObject({
          revision: 1,
          system: ["first"],
          tools_hash: "tools-1",
          active_tools: ["local_first", "mcp_first"],
          loaded_mcp_tools: ["mcp_first"],
          watermark_message_id: firstWatermark,
        })

        const pinned = await AppRuntime.runPromise(
          SessionPrefixSnapshot.pin({
            sessionID: session.id,
            profileKey: key,
            system: ["ignored"],
            toolsHash: "ignored",
            tools: [],
            activeTools: [],
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
            activeTools: ["local_second", "mcp_second"],
            loadedMcpTools: ["mcp_second"],
            watermarkMessageID: firstWatermark,
          }),
        )
        expect(rotated).toMatchObject({
          revision: 2,
          system: ["second"],
          tools_hash: "tools-2",
          active_tools: ["local_second", "mcp_second"],
          loaded_mcp_tools: ["mcp_second"],
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

  test("restores only the separately recorded wire-active subset", async () => {
    const tools = {
      local: tool({ description: "local", inputSchema: jsonSchema({ type: "object", properties: {} }) }),
      mcp_loaded: tool({ description: "loaded", inputSchema: jsonSchema({ type: "object", properties: {} }) }),
      mcp_searchable: tool({
        description: "searchable",
        inputSchema: jsonSchema({ type: "object", properties: {} }),
      }),
    }
    const snapshot = await SessionPrefixSnapshot.snapshotTools(tools, Object.keys(tools))

    expect(Object.keys(SessionPrefixSnapshot.restoreTools(snapshot))).toEqual(["local", "mcp_loaded", "mcp_searchable"])
    expect(Object.keys(SessionPrefixSnapshot.restoreTools(snapshot, ["local", "mcp_loaded"]))).toEqual([
      "local",
      "mcp_loaded",
    ])
  })
})
