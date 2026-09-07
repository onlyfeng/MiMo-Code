import { expect } from "bun:test"
import { dynamicTool, jsonSchema } from "ai"
import { Deferred, Effect, Fiber, Layer } from "effect"
import path from "path"
import { Bus } from "../../src/bus"
import { permissionToolInput } from "../../src/cli/cmd/tui/routes/session/permission"
import type { Config } from "../../src/config"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { MCP } from "../../src/mcp"
import { Permission } from "../../src/permission"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionPrefixSnapshotTable } from "../../src/session/session.sql"
import { Database, eq } from "../../src/storage"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { TestLLMServer } from "../lib/llm-server"

const calls: string[] = []
const mcp = Layer.succeed(
  MCP.Service,
  MCP.Service.of({
    status: () => Effect.succeed({}),
    clients: () => Effect.succeed({}),
    tools: () =>
      Effect.succeed({
        compact_probe: dynamicTool({
          description: "A request-authorized compact probe",
          inputSchema: jsonSchema({
            type: "object",
            properties: { label: { type: "string", enum: ["allowed", "denied"] } },
            required: ["label"],
          }),
          execute: async (input) => {
            const label = (input as { label: string }).label
            calls.push(label)
            return { content: [{ type: "text" as const, text: `probe:${label}` }] }
          },
        }),
      }),
    prompts: () => Effect.succeed({}),
    resources: () => Effect.succeed({}),
    add: () => Effect.succeed({ status: { status: "disabled" as const } }),
    connect: () => Effect.void,
    disconnect: () => Effect.void,
    getPrompt: () => Effect.succeed(undefined),
    readResource: () => Effect.succeed(undefined),
    startAuth: () => Effect.die("unexpected MCP auth"),
    authenticate: () => Effect.die("unexpected MCP auth"),
    finishAuth: () => Effect.die("unexpected MCP auth"),
    removeAuth: () => Effect.void,
    supportsOAuth: () => Effect.succeed(false),
    hasStoredTokens: () => Effect.succeed(false),
    getAuthStatus: () => Effect.succeed("not_authenticated" as const),
  }),
)
const it = testEffect(
  Layer.mergeAll(
    SessionPrompt.appLayer.pipe(Layer.provide(mcp)),
    Session.defaultLayer,
    Permission.defaultLayer,
    Bus.layer,
    CrossSpawnSpawner.defaultLayer,
    TestLLMServer.layer,
  ),
)
const model = { providerID: ProviderID.make("compact-test"), modelID: ModelID.make("gpt-5-compact") }

function config(url: string): Partial<Config.Info> {
  return {
    checkpoint: { thresholds: [] },
    experimental: { predict_next_prompt: false },
    provider: {
      [model.providerID]: {
        npm: "@ai-sdk/openai-compatible",
        options: { baseURL: url, apiKey: "synthetic-compact-test-key" },
        models: {
          [model.modelID]: {
            name: "Compact test",
            tool_call: true,
            attachment: true,
            modalities: { input: ["text", "image"], output: ["text"] },
            limit: { context: 100000, output: 10000 },
          },
        },
      },
    },
  }
}

function wireTools(input: Record<string, unknown>) {
  return (input.tools as Array<{ type: string; function: { name: string; description: string } }>).map(
    (tool) => tool.function,
  )
}

it.live(
  "Codex compact warm snapshots follow structured schema and text format changes",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const sessions = yield* Session.Service
        const prompt = yield* SessionPrompt.Service
        const session = yield* sessions.create({ title: "Request-owned structured format" })
        yield* llm.tool("StructuredOutput", { ok: true })
        const first = yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model,
          format: {
            type: "json_schema",
            retryCount: 0,
            schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
          },
          parts: [{ type: "text", text: "Return the first structured answer" }],
        })
        yield* llm.tool("StructuredOutput", { count: 2 })
        const second = yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model,
          format: {
            type: "json_schema",
            retryCount: 0,
            schema: { type: "object", properties: { count: { type: "number" } }, required: ["count"] },
          },
          parts: [{ type: "text", text: "Return a different structured answer" }],
        })
        yield* llm.text("ordinary text answer")
        const third = yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model,
          format: { type: "text" },
          parts: [{ type: "text", text: "Return an ordinary text answer" }],
        })
        expect(first.info.role === "assistant" ? first.info.structured : undefined).toEqual({ ok: true })
        expect(second.info.role === "assistant" ? second.info.structured : undefined).toEqual({ count: 2 })
        expect(third.parts.some((part) => part.type === "text" && part.text === "ordinary text answer")).toBe(true)
        const requests = yield* llm.inputs
        expect(requests).toHaveLength(3)
        expect(wireTools(requests[0]).map((tool) => tool.name)).toContain("StructuredOutput")
        expect(wireTools(requests[1]).map((tool) => tool.name)).toContain("StructuredOutput")
        expect(wireTools(requests[2]).map((tool) => tool.name)).not.toContain("StructuredOutput")
        const systems = requests.map((request) =>
          JSON.stringify((request.messages as Array<{ role: string }>).filter((message) => message.role === "system")),
        )
        expect(systems[0]).toContain("The user has requested structured output")
        expect(systems[1]).toContain("The user has requested structured output")
        expect(systems[2]).not.toContain("The user has requested structured output")
        const snapshot = yield* Effect.sync(() =>
          Database.use((db) =>
            db
              .select()
              .from(SessionPrefixSnapshotTable)
              .where(eq(SessionPrefixSnapshotTable.session_id, session.id))
              .get(),
          ),
        )
        expect(snapshot?.revision).toBe(3)
        expect(snapshot?.tools?.some((item) => item.name === "StructuredOutput")).toBe(false)
      }),
      { git: true, config },
    ),
  30_000,
)

it.live("Codex compact production wire retains control tools and nests ordinary declarations", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const sessions = yield* Session.Service
      const prompt = yield* SessionPrompt.Service
      const session = yield* sessions.create({
        title: "Compact wire",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* llm.text("done")
      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model,
        parts: [{ type: "text", text: "Inspect compact tool visibility" }],
      })
      const tools = wireTools((yield* llm.inputs)[0])
      const allowed = new Set(["exec", "wait", "actor", "question", "plan_exit", "session", "workflow"])
      expect(tools.map((tool) => tool.name).filter((name) => !allowed.has(name))).toEqual([])
      expect(tools.map((tool) => tool.name)).toContain("exec")
      expect(tools.map((tool) => tool.name)).toContain("actor")
      expect(tools.map((tool) => tool.name)).toContain("question")
      const exec = tools.find((tool) => tool.name === "exec")!
      expect(exec.description).toContain("exec_command(input:")
      expect(exec.description).toContain("task(input:")
      expect(exec.description).toContain("skill(input:")
      expect(exec.description).not.toContain("actor(input:")
    }),
    { git: true, config },
  ),
)

it.live("Codex compact preserves native declarations for an explicit default harness", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ llm }) {
      const sessions = yield* Session.Service
      const prompt = yield* SessionPrompt.Service
      const session = yield* sessions.create({ title: "Native wire" })
      yield* llm.text("done")
      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model,
        harness: "default",
        parts: [{ type: "text", text: "Keep native declarations" }],
      })
      const names = wireTools((yield* llm.inputs)[0]).map((tool) => tool.name)
      expect(names).toContain("bash")
      expect(names).toContain("read")
      expect(names).toContain("skill")
      expect(names).not.toContain("exec")
    }),
    { git: true, config },
  ),
)

for (const deny of [false, true]) {
  it.live(
    `Codex compact hidden direct MCP ${deny ? "rejects denied requests" : "executes without a search round"}`,
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          calls.length = 0
          const sessions = yield* Session.Service
          const prompt = yield* SessionPrompt.Service
          const session = yield* sessions.create({
            title: "Hidden direct MCP",
            permission: [
              { permission: "*", pattern: "*", action: "allow" },
              ...(deny ? [{ permission: "compact_probe", pattern: "*", action: "deny" as const }] : []),
            ],
          })
          yield* llm.tool("compact_probe", { label: deny ? "denied" : "allowed" })
          yield* llm.text("done")
          yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model,
            parts: [{ type: "text", text: "Call the known compact probe" }],
          })
          const names = wireTools((yield* llm.inputs)[0]).map((tool) => tool.name)
          expect(names).not.toContain("compact_probe")
          expect(names).not.toContain("mcp_tool_search")
          expect(calls).toEqual(deny ? [] : ["allowed"])
          const part = (yield* sessions.messages({ sessionID: session.id }))
            .flatMap((message) => message.parts)
            .find((part) => part.type === "tool" && part.tool === "compact_probe")
          if (deny) expect(part?.type === "tool" && part.state.status === "completed").toBe(false)
          if (!deny) expect(part?.type === "tool" ? part.state.status : undefined).toBe("completed")
        }),
        { git: true, config },
      ),
  )
}

it.live(
  "Codex compact nested bash approval carries the real command and denial prevents execution",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ dir, llm }) {
        const sessions = yield* Session.Service
        const prompt = yield* SessionPrompt.Service
        const permission = yield* Permission.Service
        const bus = yield* Bus.Service
        const session = yield* sessions.create({
          title: "Nested bash approval",
          permission: [
            { permission: "*", pattern: "*", action: "allow" },
            { permission: "bash", pattern: "*", action: "ask" },
          ],
        })
        const asked = yield* Deferred.make<Permission.Request | undefined>()
        const unsubscribe = yield* bus.subscribeCallback(Permission.Event.Asked, (event) => {
          if (event.properties.sessionID === session.id) Effect.runSync(Deferred.succeed(asked, event.properties))
        })
        yield* Effect.addFinalizer(() => Effect.sync(unsubscribe))
        const command = "printf compact-denied > compact-denied.txt"
        yield* llm.tool("exec", {
          code: `return await tools.exec_command(${JSON.stringify({ cmd: command, description: "Write a denied fixture", workdir: dir })})`,
        })
        yield* llm.text("denied")
        yield* prompt.prompt({
          sessionID: session.id,
          agent: "build",
          model,
          noReply: true,
          parts: [{ type: "text", text: "Request approval before writing" }],
        })
        const running = yield* prompt.loop({ sessionID: session.id }).pipe(
          Effect.onExit(() => Deferred.succeed(asked, undefined)),
          Effect.forkChild,
        )
        const request = yield* Deferred.await(asked).pipe(Effect.timeout("10 seconds"))
        expect(request).toBeDefined()
        if (!request) return
        expect(request.permission).toBe("bash")
        const receipt = request.metadata.exec as { parentCallID: string; callID: string; input: unknown }
        expect(receipt).toMatchObject({ parentCallID: request.tool?.callID, input: { command } })
        expect(receipt.callID.startsWith(`${request.tool!.callID}:`)).toBe(true)
        const parts = MessageV2.parts(request.tool!.messageID)
        expect(
          parts.some((part) => part.type === "tool" && part.tool === "exec" && part.callID === request.tool!.callID),
        ).toBe(true)
        expect(permissionToolInput(request, parts).command).toBe(command)
        expect(yield* Effect.promise(() => Bun.file(path.join(dir, "compact-denied.txt")).exists())).toBe(false)
        yield* permission.reply({ requestID: request.id, reply: "reject" })
        yield* Fiber.join(running)
        expect(yield* Effect.promise(() => Bun.file(path.join(dir, "compact-denied.txt")).exists())).toBe(false)
      }),
      { git: true, config },
    ),
  30_000,
)

it.live("Codex compact nested view_image reaches the next model request as an image", () =>
  provideTmpdirServer(
    Effect.fnUntraced(function* ({ dir, llm }) {
      const image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      yield* Effect.promise(() => Bun.write(path.join(dir, "pixel.png"), Buffer.from(image, "base64")))
      const sessions = yield* Session.Service
      const prompt = yield* SessionPrompt.Service
      const session = yield* sessions.create({
        title: "Nested image",
        permission: [{ permission: "*", pattern: "*", action: "allow" }],
      })
      yield* llm.tool("exec", {
        code: 'const result = await tools.view_image({ path: "pixel.png" }); return result.output',
      })
      yield* llm.text("image received")
      yield* prompt.prompt({
        sessionID: session.id,
        agent: "build",
        model,
        parts: [{ type: "text", text: "Inspect the pixel image" }],
      })
      const requests = yield* llm.inputs
      expect(wireTools(requests[0]).map((tool) => tool.name)).not.toContain("view_image")
      const part = (yield* sessions.messages({ sessionID: session.id }))
        .flatMap((message) => message.parts)
        .find((part) => part.type === "tool" && part.tool === "exec")
      expect(part?.type === "tool" && part.state.status === "completed" ? part.state.output : "").toContain(
        "Image viewed successfully",
      )
      expect(requests[1]).toMatchObject({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "image_url",
                image_url: expect.objectContaining({ url: `data:image/png;base64,${image}` }),
              }),
            ]),
          }),
        ]),
      })
    }),
    { git: true, config },
  ),
)
