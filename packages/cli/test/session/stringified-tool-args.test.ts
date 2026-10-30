import { describe, expect } from "bun:test"
import path from "node:path"
import { Effect, Layer } from "effect"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Global } from "../../src/global"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { Skill } from "../../src/skill"
import { prepareConfigDependencies, provideTmpdirServer } from "../fixture/fixture"
import { TestLLMServer } from "../lib/llm-server"
import { testEffect } from "../lib/effect"

// Some models send a nested object argument, or a whole tool input, as JSON
// text. The prompt loop decodes it where the AI SDK parses the tool call
// (FC-020), so the persisted part, the post-execution checks and the tool
// itself all see the decoded input.

const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer, TestLLMServer.layer))
const config = (url: string) => ({
  enabled_providers: ["alibaba"],
  provider: { alibaba: { options: { apiKey: "test-key", baseURL: url } } },
  agent: { build: { model: "alibaba/qwen-plus" } },
  permission: { "*": "allow" as const },
})
const NAME = "stringified-probe"
const skillFile = `---\nname: ${NAME}\ndescription: Probe skill written through a tool call\n---\n\nProbe body\n`

const runToolCall = (tool: string, input: unknown) =>
  Effect.gen(function* () {
    const sessions = yield* Session.Service
    const prompt = yield* SessionPrompt.Service
    const session = yield* sessions.create({ title: "Stringified tool input" })
    yield* Effect.addFinalizer(() => prompt.cancel(session.id))
    const llm = yield* TestLLMServer
    yield* llm.tool(tool, input)
    yield* llm.text("done")
    yield* prompt.prompt({ sessionID: session.id, agent: "build", parts: [{ type: "text", text: "Run the tool" }] })
    const part = (yield* sessions.messages({ sessionID: session.id }))
      .flatMap((message) => message.parts)
      .find((item) => item.type === "tool" && item.tool === tool)
    if (part?.type !== "tool") throw new Error(`missing ${tool} part`)
    return part.state
  })

const writeSkillThroughModel = (encode: (input: Record<string, unknown>) => unknown) =>
  provideTmpdirServer(
    ({ dir }) =>
      Effect.gen(function* () {
        yield* Effect.promise(() =>
          Promise.all([Global.Path.config, path.join(dir, ".mimocode")].map(prepareConfigDependencies)),
        )
        const skills = yield* Skill.Service
        // Load the skill cache first, so only a reload can surface the new skill.
        expect((yield* skills.all()).map((skill) => skill.name)).not.toContain(NAME)
        const target = path.join(dir, ".mimocode", "skill", NAME, "SKILL.md")
        const input = { file_path: target, content: skillFile }

        const state = yield* runToolCall("write", encode(input))
        expect(state.status).toBe("completed")
        expect(state.input).toEqual(input)
        expect(yield* Effect.promise(() => Bun.file(target).text())).toBe(skillFile)
        expect((yield* skills.all()).map((skill) => skill.name)).toContain(NAME)
      }),
    { git: true, config },
  )

describe("prompt loop: stringified tool input", () => {
  it.live("an object write into .mimocode/skill reloads skills", () => writeSkillThroughModel((input) => input), 30_000)

  it.live(
    "a write sent as one JSON string runs, persists decoded and reloads skills",
    () => writeSkillThroughModel((input) => JSON.stringify(input)),
    30_000,
  )

  it.live(
    "a cron operation sent as JSON text runs and persists as an object",
    () =>
      provideTmpdirServer(
        () =>
          Effect.gen(function* () {
            const state = yield* runToolCall("cron", { operation: JSON.stringify({ action: "list" }) })
            expect(state.status).toBe("completed")
            expect(state.input).toEqual({ operation: { action: "list" } })
            expect(state.status === "completed" ? state.output : undefined).toBe("No scheduled jobs.")
          }),
        { git: true, config },
      ),
    30_000,
  )
})
