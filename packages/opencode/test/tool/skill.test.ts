import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Cause, Effect, Layer } from "effect"
import { afterEach, describe, expect } from "bun:test"
import path from "path"
import { pathToFileURL } from "url"
import type { Permission } from "../../src/permission"
import type { Tool } from "../../src/tool"
import { Instance } from "../../src/project/instance"
import { SkillTool } from "../../src/tool/skill"
import { ToolRegistry } from "../../src/tool"
import { provideTmpdirInstance } from "../fixture/fixture"
import { SessionID, MessageID } from "../../src/session/schema"
import { testEffect } from "../lib/effect"
import { MessageV2 } from "../../src/session/message-v2"
import { ModelID, ProviderID } from "../../src/provider/schema"

const baseCtx: Omit<Tool.Context, "ask"> = {
  sessionID: SessionID.make("ses_test"),
  messageID: MessageID.make(""),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
}

afterEach(async () => {
  await Instance.disposeAll()
})

const node = CrossSpawnSpawner.defaultLayer

const it = testEffect(Layer.mergeAll(ToolRegistry.defaultLayer, node))

function messages(tools: Record<string, boolean>): MessageV2.WithParts[] {
  return [
    {
      info: {
        id: MessageID.make("msg_user"),
        sessionID: SessionID.make("ses_test"),
        role: "user",
        time: { created: Date.now() },
        agent: "build",
        model: { providerID: ProviderID.make("opencode"), modelID: ModelID.make("gpt-5") },
        tools,
      },
      parts: [],
    },
  ]
}

describe("tool.skill", () => {
  it.live("execute returns skill content block with files", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          const skill = path.join(dir, ".mimocode", "skill", "tool-skill")
          yield* Effect.promise(() =>
            Bun.write(
              path.join(skill, "SKILL.md"),
              `---
name: tool-skill
description: Skill for tool tests.
---

# Tool Skill

Use this skill.
`,
            ),
          )
          yield* Effect.promise(() => Bun.write(path.join(skill, "scripts", "demo.txt"), "demo"))

          const home = process.env.HOME
          const userProfile = process.env.USERPROFILE
          process.env.HOME = dir
          process.env.USERPROFILE = dir
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              process.env.HOME = home
              process.env.USERPROFILE = userProfile
            }),
          )

          const registry = yield* ToolRegistry.Service
          const agent = { name: "build", mode: "primary" as const, permission: [], options: {} }
          const tool = (yield* registry.tools({
            providerID: "opencode" as any,
            modelID: "gpt-5" as any,
            agent,
          })).find((tool) => tool.id === SkillTool.id)
          if (!tool) throw new Error("Skill tool not found")

          const requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">> = []
          const ctx: Tool.Context = {
            ...baseCtx,
            ask: (req) =>
              Effect.sync(() => {
                requests.push(req)
              }),
          }

          const result = yield* tool.execute({ name: "tool-skill" }, ctx)
          const file = path.resolve(skill, "scripts", "demo.txt")

          expect(requests.length).toBe(1)
          expect(requests[0].permission).toBe("skill")
          expect(requests[0].patterns).toContain("tool-skill")
          expect(requests[0].always).toContain("tool-skill")
          expect(result.metadata.dir).toBe(skill)
          expect(result.output).toContain(`<skill_content name="tool-skill">`)
          expect(result.output).toContain(`Base directory for this skill: ${pathToFileURL(skill).href}`)
          expect(result.output).toContain(`<file>${file}</file>`)
        }),
      { git: true },
    ),
  )

  it.live("a built-in workflow name redirects to the workflow tool, not a dead-end error", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const registry = yield* ToolRegistry.Service
          const agent = { name: "build", mode: "primary" as const, permission: [], options: {} }
          const tool = (yield* registry.tools({
            providerID: "opencode" as any,
            modelID: "gpt-5" as any,
            agent,
          })).find((tool) => tool.id === SkillTool.id)
          if (!tool) throw new Error("Skill tool not found")
          const ctx: Tool.Context = { ...baseCtx, ask: () => Effect.void }
          const exit = yield* Effect.exit(tool.execute({ name: "fact-check" }, ctx))
          expect(exit._tag).toBe("Failure")
          const msg = exit._tag === "Failure" ? Cause.pretty(exit.cause) : ""
          expect(msg).toContain("built-in WORKFLOW")
          expect(msg).toContain("workflow tool")
          expect(msg).toContain('name: "fact-check"')
        }),
      { git: true },
    ),
  )

  it.live("a denied skill cannot be loaded or enumerated by the skill tool", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() =>
            Bun.write(
              path.join(dir, ".mimocode", "skill", "restricted-tool-skill", "SKILL.md"),
              `---
name: restricted-tool-skill
description: Secret skill that must not be enumerated.
---

# Restricted Tool Skill
`,
            ),
          )
          const home = process.env.HOME
          const userProfile = process.env.USERPROFILE
          process.env.HOME = dir
          process.env.USERPROFILE = dir
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              process.env.HOME = home
              process.env.USERPROFILE = userProfile
            }),
          )

          const registry = yield* ToolRegistry.Service
          const agent = { name: "build", mode: "primary" as const, permission: [], options: {} }
          const tool = (yield* registry.tools({
            providerID: "opencode" as any,
            modelID: "gpt-5" as any,
            agent,
          })).find((item) => item.id === SkillTool.id)
          if (!tool) throw new Error("Skill tool not found")
          const ctx: Tool.Context = {
            ...baseCtx,
            permission: [{ permission: "skill", pattern: "restricted-tool-skill", action: "deny" }],
            ask: () => Effect.void,
          }

          const denied = yield* Effect.exit(tool.execute({ name: "restricted-tool-skill" }, ctx))
          expect(denied._tag).toBe("Failure")
          const deniedMessage = denied._tag === "Failure" ? Cause.pretty(denied.cause) : ""
          expect(deniedMessage).not.toContain("Secret skill")

          const missing = yield* Effect.exit(tool.execute({ name: "does-not-exist" }, ctx))
          const missingMessage = missing._tag === "Failure" ? Cause.pretty(missing.cause) : ""
          expect(missingMessage).not.toContain("restricted-tool-skill")
        }),
      { git: true },
    ),
  )

  it.live("direct execution fails when the skill tool is hidden", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() =>
            Bun.write(
              path.join(dir, ".mimocode", "skill", "direct-load", "SKILL.md"),
              `---
name: direct-load
description: Exact skill for direct load boundary tests.
---

# Direct Load
`,
            ),
          )
          const registry = yield* ToolRegistry.Service
          const tool = (yield* registry.all()).find((item) => item.id === SkillTool.id)
          if (!tool) throw new Error("Skill tool not found")
          const base = {
            ...baseCtx,
            permission: [],
            ask: () => Effect.void,
          }

          const messageDisabled = yield* Effect.exit(
            tool.execute({ name: "direct-load" }, { ...base, agent: "build", messages: messages({ skill: false }) }),
          )
          const allowlistHidden = yield* Effect.exit(
            tool.execute({ name: "direct-load" }, { ...base, agent: "title", messages: [] }),
          )

          expect([messageDisabled, allowlistHidden].map((exit) => exit._tag)).toEqual([
            "Failure",
            "Failure",
          ])
        }),
      { git: true },
    ),
  )
})
