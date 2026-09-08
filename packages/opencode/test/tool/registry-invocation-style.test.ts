import { describe, expect } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Effect, Layer } from "effect"
import { ToolRegistry } from "../../src/tool"
import { Agent } from "../../src/agent/agent"
import { ProviderID, ModelID } from "../../src/provider/schema"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { testEffect } from "../lib/effect"
import { provideTmpdirInstance } from "../fixture/fixture"

const it = testEffect(Layer.mergeAll(ToolRegistry.defaultLayer, Agent.defaultLayer, CrossSpawnSpawner.defaultLayer))

describe("ToolRegistry.tools: invocation style resolution", () => {
  it.live("compacts Codex declarations while retaining registered implementations", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const reg = yield* ToolRegistry.Service
        const agents = yield* Agent.Service
        const input = {
          providerID: ProviderID.opencode,
          modelID: ModelID.make("gpt-5.4"),
          agent: yield* agents.get("build"),
        }
        const advertised = yield* reg.tools(input)
        expect(advertised.map((tool) => tool.id)).not.toContain("bash")
        expect(advertised.map((tool) => tool.id)).not.toContain("apply_patch")
        expect(advertised.map((tool) => tool.id)).toContain("actor")
        const registered = yield* reg.registered(input)
        expect(registered.map((tool) => tool.id)).toEqual(
          expect.arrayContaining(["bash", "apply_patch", "skill", "skill_search", "task", "exec"]),
        )
        const exec = advertised.find((tool) => tool.id === "exec")
        expect(exec?.description).toContain("exec_command(input:")
        expect(exec?.description).toContain("apply_patch(input:")
        expect(exec?.description).toContain("task(input:")
        const actorDeclaration = exec?.description
          .split("\n")
          .find((line) => line.trimStart().startsWith("actor(input:"))
        expect(actorDeclaration).toBeDefined()
        expect([...actorDeclaration!.matchAll(/action: "([^"]+)"/g)].map((match) => match[1])).toEqual([
          "send",
          "status",
        ])
        const actor = advertised.find((tool) => tool.id === "actor")
        for (const operation of [
          { action: "spawn", subagent_type: "general", description: "delegate", prompt: "inspect" },
          { action: "run", subagent_type: "general", description: "delegate", prompt: "inspect" },
          { action: "send", to_actor_id: "general-1", content: "progress" },
          { action: "status", actor_id: "general-1" },
          { action: "wait", actor_id: "general-1" },
          { action: "cancel", actor_id: "general-1" },
          { action: "resume", actor_id: "general-1" },
          { action: "models" },
        ])
          expect(actor?.parameters.safeParse({ operation }).success).toBe(true)
        const normal = yield* reg.tools({ ...input, harness: "default" })
        expect(normal.map((tool) => tool.id)).toContain("bash")
        expect(normal.map((tool) => tool.id)).not.toContain("exec")
      }),
    ),
  )

  it.live(
    "exposes exec by default only to GPT models",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const reg = yield* ToolRegistry.Service
          const agents = yield* Agent.Service
          const general = yield* agents.get("general")
          if (!general) throw new Error("no general agent")
          const ids = (modelID: string) =>
            reg
              .tools({
                providerID: ProviderID.opencode,
                modelID: ModelID.make(modelID),
                agent: general,
              })
              .pipe(Effect.map((tools) => tools.map((tool) => tool.id)))

          const gpt = yield* reg.tools({
            providerID: ProviderID.opencode,
            modelID: ModelID.make("openai/gpt-5.4"),
            agent: general,
          })
          const exec = gpt.find((tool) => tool.id === "exec")
          expect(exec).toBeDefined()
          expect(exec?.description).toContain("Run independent calls with `Promise.all` or `Promise.allSettled`")
          expect(exec?.description).toContain("keep dependent operations sequential")
          expect(exec?.description).toContain(
            "Return an intermediate result whenever the next action needs model judgment",
          )
          expect(exec?.description).toContain("apply_patch(input:")
          expect(exec?.description).toContain("bash(input:")
          expect(exec?.description).toContain("exec_command(input:")
          expect(exec?.description).not.toContain("read(input:")
          expect(exec?.description).not.toContain("write(input:")
          expect(exec?.description).not.toContain("edit(input:")
          expect(gpt.map((tool) => tool.id)).toContain("exec")
          for (const hidden of ["bash", "apply_patch", "skill_search", "skill", "task"])
            expect(gpt.map((tool) => tool.id)).not.toContain(hidden)
          expect(yield* ids("anthropic/claude-sonnet-4-6")).not.toContain("exec")
          expect(yield* ids("mimo-v2")).not.toContain("exec")
        }),
      ),
    30000,
  )

  it.live("compact declarations omit denied and user-disabled capabilities", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const reg = yield* ToolRegistry.Service
        const agents = yield* Agent.Service
        const input = {
          providerID: ProviderID.opencode,
          modelID: ModelID.make("gpt-5.4"),
          agent: yield* agents.get("build"),
          permission: [{ permission: "task", pattern: "*", action: "deny" as const }],
          tools: { bash: false },
        }
        const registered = yield* reg.registered(input)
        expect(registered.map((tool) => tool.id)).not.toContain("task")
        expect(registered.map((tool) => tool.id)).not.toContain("bash")
        const exec = registered.find((tool) => tool.id === "exec")
        expect(exec?.description).not.toContain("task(input:")
        expect(exec?.description).not.toContain("exec_command(input:")
      }),
    ),
  )

  it.live("keeps exec available to an agent restricted to an authorized MCP tool", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const reg = yield* ToolRegistry.Service
        const agents = yield* Agent.Service
        const input = {
          providerID: ProviderID.opencode,
          modelID: ModelID.make("gpt-5.4"),
          agent: { ...(yield* agents.get("general")), toolAllowlist: ["remote_lookup"] },
          additionalTools: ["remote_lookup"],
        }
        expect((yield* reg.tools(input)).map((tool) => tool.id)).toEqual(["exec"])
        expect((yield* reg.tools({ ...input, tools: { remote_lookup: false } })).map((tool) => tool.id)).not.toContain(
          "exec",
        )
      }),
    ),
  )

  it.live(
    "keeps the compact gateway for permitted nested GPT tools",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const reg = yield* ToolRegistry.Service
          const agents = yield* Agent.Service
          const general = yield* agents.get("general")
          if (!general) throw new Error("no general agent")
          const ids = (toolAllowlist: string[]) =>
            reg
              .tools({
                providerID: ProviderID.opencode,
                modelID: ModelID.make("openai/gpt-5.4"),
                agent: { ...general, toolAllowlist },
              })
              .pipe(Effect.map((tools) => tools.map((tool) => tool.id)))

          expect(yield* ids(["apply_patch"])).toEqual(["exec"])
          expect(yield* ids(["bash"])).not.toContain("bash")
          expect(yield* ids(["bash"])).toContain("exec")
          expect(yield* ids(["missing_tool"])).not.toContain("exec")
        }),
      ),
    30000,
  )

  it.live(
    "keeps MiMo transport separate from the explicit harness toolset",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const reg = yield* ToolRegistry.Service
          const agents = yield* Agent.Service
          const general = yield* agents.get("general")
          if (!general) throw new Error("no general agent")
          const normal = yield* reg.tools({
            providerID: ProviderID.opencode,
            modelID: ModelID.make("mimo"),
            modelAPIID: "mimo-v2.6-ptc",
            modelFamily: "mimo-v2.6",
            agent: general,
          })
          const codex = yield* reg.tools({
            providerID: ProviderID.opencode,
            modelID: ModelID.make("mimo"),
            modelAPIID: "mimo-v2.6-ptc",
            modelFamily: "mimo-v2.6",
            agent: general,
            harness: "codex",
          })
          const ids = normal.map((tool) => tool.id)
          const codexIDs = codex.map((tool) => tool.id)

          expect(ids).not.toContain("exec")
          expect(ids).not.toContain("apply_patch")
          expect(ids).toContain("edit")
          expect(ids).toContain("write")
          expect(ids).toContain("read")
          expect(codexIDs).toContain("exec")
          expect(codexIDs).not.toContain("apply_patch")
          expect(codex.find((tool) => tool.id === "exec")?.description).toContain("apply_patch(input:")
          expect(codexIDs).not.toContain("edit")
          expect(codexIDs).not.toContain("write")
          expect(codexIDs).not.toContain("read")
        }),
      ),
    30000,
  )

  it.live("registers skill_search for GPT and Claude models", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const reg = yield* ToolRegistry.Service
        const agents = yield* Agent.Service
        const general = yield* agents.get("general")
        if (!general) throw new Error("no general agent")
        const ids = (modelID: string) =>
          reg
            .registered({
              providerID: ProviderID.opencode,
              modelID: ModelID.make(modelID),
              agent: general,
            })
            .pipe(Effect.map((tools) => tools.map((tool) => tool.id)))

        expect(yield* ids("openai/gpt-5.4")).toContain("skill_search")
        expect(yield* ids("anthropic/claude-sonnet-4-6")).toContain("skill_search")
        expect(yield* ids("mimo-v2")).toContain("skill_search")
      }),
    ),
  )

  it.live("uses the filesystem-capable bash description for GPT models", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const reg = yield* ToolRegistry.Service
        const agents = yield* Agent.Service
        const general = yield* agents.get("general")
        if (!general) throw new Error("no general agent")
        const tools = yield* reg.registered({
          providerID: ProviderID.make("openai"),
          modelID: ModelID.make("gpt-5"),
          agent: general,
        })
        const bash = tools.find((tool) => tool.id === "bash")
        expect(bash?.description).toContain("the dedicated `read`, `write`, and `edit` tools are unavailable")
        expect(bash?.description).toContain("Use `apply_patch`")
        expect(bash?.description).not.toContain("DO NOT use it for file operations")
        expect(tools.some((tool) => tool.id === "notebook_edit")).toBeFalse()
        expect(tools.some((tool) => tool.id === "grep")).toBeFalse()
        expect(tools.some((tool) => tool.id === "glob")).toBeFalse()
      }),
    ),
  )

  it.live("keeps the specialized-tool bash description for non-GPT models", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const reg = yield* ToolRegistry.Service
        const agents = yield* Agent.Service
        const general = yield* agents.get("general")
        if (!general) throw new Error("no general agent")
        const tools = yield* reg.tools({
          providerID: ProviderID.opencode,
          modelID: ModelID.make("opencode/claude-sonnet-4-6"),
          agent: general,
        })
        const bash = tools.find((tool) => tool.id === "bash")
        expect(bash?.description).toContain("DO NOT use it for file operations")
        expect(bash?.description).not.toContain("the dedicated `read`, `write`, and `edit` tools are unavailable")
        expect(tools.find((tool) => tool.id === "skill_search")?.description).not.toContain("first query")
        expect(tools.some((tool) => tool.id === "notebook_edit")).toBeTrue()
        expect(tools.some((tool) => tool.id === "grep")).toBeTrue()
        expect(tools.some((tool) => tool.id === "glob")).toBeTrue()
      }),
    ),
  )

  it.live(
    "masks multiedit for GPT models",
    () =>
      provideTmpdirInstance((dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() => fs.mkdir(path.join(dir, ".mimocode/tool"), { recursive: true }))
          yield* Effect.promise(() =>
            Bun.write(
              path.join(dir, ".mimocode/tool/multiedit.ts"),
              [
                "export default {",
                "  description: 'multi-edit files',",
                "  args: {},",
                "  execute: async () => 'done',",
                "}",
              ].join("\n"),
            ),
          )
          const reg = yield* ToolRegistry.Service
          const agents = yield* Agent.Service
          const general = yield* agents.get("general")
          if (!general) throw new Error("no general agent")
          const ids = (modelID: string) =>
            reg
              .tools({
                providerID: ProviderID.opencode,
                modelID: ModelID.make(modelID),
                agent: general,
              })
              .pipe(Effect.map((tools) => tools.map((tool) => tool.id)))

          expect(yield* ids("openai/gpt-5.4")).not.toContain("multiedit")
          expect(yield* ids("anthropic/claude-sonnet-4-6")).toContain("multiedit")
        }),
      ),
    30000,
  )

  it.live("default config keeps task in JSON mode", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const reg = yield* ToolRegistry.Service
        const agents = yield* Agent.Service
        const general = yield* agents.get("general")
        if (!general) throw new Error("no general agent")
        const tools = yield* reg.tools({
          providerID: ProviderID.opencode,
          modelID: ModelID.make("opencode/claude-sonnet-4-6"),
          agent: general,
        })
        const task = tools.find((t) => t.id === "task")
        expect(task).toBeDefined()
        // JSON mode → parameters is an object wrapping an `operation` discriminated
        // union (discriminator "action"). Confirm `operation` is present and `script`
        // (the shell-mode shape) is not.
        const schema = task!.parameters as any
        expect(schema.shape?.operation ?? schema._def?.shape?.operation).toBeDefined()
        expect(schema.shape?.script ?? schema._def?.shape?.script).toBeUndefined()
      }),
    ),
  )

  it.live("invocationStyleByTool.task='shell' replaces parameters with { script } once shell field exists", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const reg = yield* ToolRegistry.Service
          const agents = yield* Agent.Service
          const general = yield* agents.get("general")
          if (!general) throw new Error("no general agent")
          const tools = yield* reg.tools({
            providerID: ProviderID.opencode,
            modelID: ModelID.make("opencode/claude-sonnet-4-6"),
            agent: general,
          })
          const task = tools.find((t) => t.id === "task")
          expect(task).toBeDefined()
          // Task has shell field (Task 13 added it). Shell mode is active: parameters has `script`.
          const schema = task!.parameters as any
          expect(schema.shape?.script ?? schema._def?.shape?.script).toBeDefined()
          expect(schema.shape?.action ?? schema._def?.shape?.action).toBeUndefined()
        }),
      { config: { tool: { invocation_style_by_tool: { task: "shell" } } } },
    ),
  )

  it.live("invocationStyleByTool.read='shell' falls back to JSON (read has no shell field)", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const reg = yield* ToolRegistry.Service
          const agents = yield* Agent.Service
          const general = yield* agents.get("general")
          if (!general) throw new Error("no general agent")
          const tools = yield* reg.tools({
            providerID: ProviderID.opencode,
            modelID: ModelID.make("opencode/claude-sonnet-4-6"),
            agent: general,
          })
          const read = tools.find((t) => t.id === "read")
          expect(read).toBeDefined()
          const schema = read!.parameters as any
          // Original `read` parameters has file_path; shell wrap would expose `script`
          expect(schema.shape?.file_path ?? schema._def?.shape?.file_path).toBeDefined()
          expect(schema.shape?.script ?? schema._def?.shape?.script).toBeUndefined()
        }),
      { config: { tool: { invocation_style_by_tool: { read: "shell" } } } },
    ),
  )
})

describe("ToolRegistry.tools: shell mode end-to-end on task", () => {
  it.live("task shell-mode resolves to shellInputSchema parameters and shell description", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const reg = yield* ToolRegistry.Service
          const agents = yield* Agent.Service
          const general = yield* agents.get("general")
          if (!general) throw new Error("no general agent")
          const tools = yield* reg.tools({
            providerID: ProviderID.opencode,
            modelID: ModelID.make("opencode/claude-sonnet-4-6"),
            agent: general,
          })
          const task = tools.find((t) => t.id === "task")!
          // Sanity: parameters is shellInputSchema (just `script`)
          const parsed = task.parameters.parse({ script: "task list" })
          expect(parsed).toEqual({ script: "task list" })
          // Description starts with the task.shell.txt header
          expect(task.description).toContain("Persistent work-item tool (shell form)")
          // Description is NOT the JSON-mode task.txt
          expect(task.description).not.toContain('"action": "create"')
        }),
      { config: { tool: { invocation_style_by_tool: { task: "shell" } } } },
    ),
  )
})
