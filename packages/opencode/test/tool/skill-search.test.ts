import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Effect, Layer } from "effect"
import { afterEach, describe, expect } from "bun:test"
import path from "path"
import type { Permission } from "../../src/permission"
import type { Tool } from "../../src/tool"
import { Instance } from "../../src/project/instance"
import { SkillSearchTool } from "../../src/tool/skill-search"
import { ToolRegistry } from "../../src/tool"
import { provideTmpdirInstance } from "../fixture/fixture"
import { SessionID, MessageID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { testEffect } from "../lib/effect"
import { MessageV2 } from "../../src/session/message-v2"

afterEach(async () => {
  await Instance.disposeAll()
})

const it = testEffect(Layer.mergeAll(ToolRegistry.defaultLayer, CrossSpawnSpawner.defaultLayer))

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

describe("tool.skill_search", () => {
  it.live("loads the highest-confidence exact match", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          const skill = path.join(dir, ".mimocode", "skill", "business-review")
          yield* Effect.promise(() =>
            Bun.write(
              path.join(skill, "SKILL.md"),
              `---
name: business-review
description: Generate executive business review presentations from sales spreadsheets.
aliases:
  - quarterly-review
---

# Business Review

Build the management presentation.
`,
            ),
          )
          yield* Effect.promise(() => Bun.write(path.join(skill, "scripts", "build.ts"), "export {}"))

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
            providerID: ProviderID.make("opencode"),
            modelID: ModelID.make("gpt-5"),
            agent,
          })).find((item) => item.id === SkillSearchTool.id)
          if (!tool) throw new Error("Skill search tool not found")

          const requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">> = []
          const ctx: Tool.Context = {
            sessionID: SessionID.make("ses_test"),
            messageID: MessageID.make("msg_test"),
            agent: "build",
            abort: AbortSignal.any([]),
            messages: [],
            metadata: () => Effect.void,
            ask: (request) => Effect.sync(() => requests.push(request)),
          }
          const result = yield* tool.execute({ query: "quarterly-review" }, ctx)
          const [payload] = result.output.split("\n\n<skill_content")

          const parsed = JSON.parse(payload)
          expect(parsed).toMatchObject({
            status: "matched",
            loaded_skill_id: "business-review",
          })
          expect(parsed.results[0]).toMatchObject({ skill_id: "business-review", name: "business-review", score: 1 })
          expect(result.output).toContain('<skill_content name="business-review">')
          expect(result.output).toContain("Build the management presentation.")
          expect(result.output).toContain("<skill_files>")
          expect(result.output).toContain(`<file>${path.join(skill, "scripts", "build.ts")}</file>`)
          expect(requests[0].permission).toBe("skill")
          expect(requests[0].patterns).toEqual(["business-review"])
        }),
      { git: true },
    ),
  )

  it.live("returns no_match when no skill is relevant", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const registry = yield* ToolRegistry.Service
          const agent = { name: "build", mode: "primary" as const, permission: [], options: {} }
          const tool = (yield* registry.tools({
            providerID: ProviderID.make("opencode"),
            modelID: ModelID.make("gpt-5"),
            agent,
          })).find((item) => item.id === SkillSearchTool.id)
          if (!tool) throw new Error("Skill search tool not found")

          const requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">> = []
          const result = yield* tool.execute(
            { query: "zyxwvutsrqponmlkjihgfedcba" },
            {
              sessionID: SessionID.make("ses_test"),
              messageID: MessageID.make("msg_test"),
              agent: "build",
              abort: AbortSignal.any([]),
              messages: [],
              metadata: () => Effect.void,
              ask: (request) => Effect.sync(() => requests.push(request)),
            },
          )

          expect(JSON.parse(result.output)).toEqual({
            status: "no_match",
            results: [],
            loaded_skill_id: null,
          })
          expect(requests).toEqual([])
        }),
      { git: true },
    ),
  )

  it.live("returns uncertain BM25 matches without loading a skill", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() =>
            Bun.write(
              path.join(dir, ".mimocode", "skill", "quasar-analysis", "SKILL.md"),
              `---
name: quasar-analysis
description: Analyze quasar telemetry and operational metrics.
---

# Quasar Analysis
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
            providerID: ProviderID.make("opencode"),
            modelID: ModelID.make("gpt-5"),
            agent,
          })).find((item) => item.id === SkillSearchTool.id)
          if (!tool) throw new Error("Skill search tool not found")

          const requests: Array<Omit<Permission.Request, "id" | "sessionID" | "tool">> = []
          const result = yield* tool.execute(
            { query: "analyze quasar operational telemetry into executive deck for management" },
            {
              sessionID: SessionID.make("ses_test"),
              messageID: MessageID.make("msg_test"),
              agent: "build",
              abort: AbortSignal.any([]),
              messages: [],
              metadata: () => Effect.void,
              ask: (request) => Effect.sync(() => requests.push(request)),
            },
          )
          const payload = JSON.parse(result.output)

          expect(payload).toMatchObject({ status: "matched", loaded_skill_id: null })
          expect(payload.results[0].skill_id).toBe("quasar-analysis")
          expect(payload.results.length).toBeLessThanOrEqual(3)
          expect(requests).toEqual([])
        }),
      { git: true },
    ),
  )

  it.live("excludes skills denied by the effective session permission", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() =>
            Bun.write(
              path.join(dir, ".mimocode", "skill", "restricted-quasar", "SKILL.md"),
              `---
name: restricted-quasar
description: Inspect restricted quasar telemetry.
---

# Restricted Quasar
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
          const permission: Permission.Ruleset = [
            { permission: "skill", pattern: "restricted-quasar", action: "deny" },
          ]
          const tools = yield* registry.tools({
            providerID: ProviderID.make("opencode"),
            modelID: ModelID.make("gpt-5"),
            agent,
            permission,
          })
          const skillDef = tools.find((item) => item.id === "skill")
          expect(skillDef?.description).not.toContain("restricted-quasar")

          const tool = tools.find((item) => item.id === SkillSearchTool.id)
          if (!tool) throw new Error("Skill search tool not found")

          const result = yield* tool.execute(
            { query: "restricted-quasar" },
            {
              sessionID: SessionID.make("ses_test"),
              messageID: MessageID.make("msg_test"),
              agent: "build",
              permission,
              abort: AbortSignal.any([]),
              messages: [],
              metadata: () => Effect.void,
              ask: () => Effect.void,
            },
          )

          expect(JSON.parse(result.output)).toEqual({
            status: "no_match",
            results: [],
            loaded_skill_id: null,
          })
        }),
      { git: true },
    ),
  )

  it.live("direct execution fails when skill_search is hidden", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() =>
            Bun.write(
              path.join(dir, ".mimocode", "skill", "direct-search", "SKILL.md"),
              `---
name: direct-search
description: Exact skill for direct execution boundary tests.
---

# Direct Search
`,
            ),
          )
          const registry = yield* ToolRegistry.Service
          const tool = (yield* registry.all()).find((item) => item.id === SkillSearchTool.id)
          if (!tool) throw new Error("Skill search tool not found")
          const base = {
            sessionID: SessionID.make("ses_test"),
            messageID: MessageID.make("msg_test"),
            abort: AbortSignal.any([]),
            metadata: () => Effect.void,
            ask: () => Effect.void,
          }

          const denied = yield* Effect.exit(
            tool.execute(
              { query: "direct-search" },
              {
                ...base,
                agent: "build",
                permission: [{ permission: "skill_search", pattern: "*", action: "deny" }],
                messages: [],
              },
            ),
          )
          const messageDisabled = yield* Effect.exit(
            tool.execute(
              { query: "direct-search" },
              { ...base, agent: "build", permission: [], messages: messages({ skill_search: false }) },
            ),
          )
          const allowlistHidden = yield* Effect.exit(
            tool.execute(
              { query: "direct-search" },
              { ...base, agent: "title", permission: [], messages: [] },
            ),
          )

          expect([denied, messageDisabled, allowlistHidden].map((exit) => exit._tag)).toEqual([
            "Failure",
            "Failure",
            "Failure",
          ])
        }),
      { git: true },
    ),
  )
})
