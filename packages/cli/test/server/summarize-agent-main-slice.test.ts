import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Bus } from "../../src/bus"
import { Config } from "../../src/config"
import { Plugin } from "../../src/plugin"
import { Agent } from "../../src/agent/agent"
import { Session } from "../../src/session"
import { Server } from "../../src/server/server"
import { MessageID, PartID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { ProviderTest } from "../fake/provider"
import { Log } from "../../src/util"
import { testEffect } from "../lib/effect"
import { TestLLMServer } from "../lib/llm-server"
import { provideTmpdirServer } from "../fixture/fixture"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"

void Log.init({ print: false })

const model = { providerID: ProviderID.make("alibaba"), modelID: ModelID.make("qwen-plus") }

const it = testEffect(
  Layer.mergeAll(
    Session.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    TestLLMServer.layer,
    ProviderTest.fake().layer,
    Agent.defaultLayer,
    Plugin.defaultLayer,
    Bus.layer,
    Config.defaultLayer,
  ),
)

const config = (url: string) => ({
  enabled_providers: ["alibaba"],
  provider: { alibaba: { options: { apiKey: "test-key", baseURL: url } } },
  model: "alibaba/qwen-plus",
  small_model: "alibaba/qwen-plus",
  agent: { build: { model: "alibaba/qwen-plus" } },
})

// Upstream's summarize-route-main-slice test covers `resolveCurrentAgent`, a
// helper this fork's route does not call: `/summarize` goes through
// `SessionPrompt.startSummarize`, which repeats the main-slice lookup inline
// because it also needs that user's id and task. The seed and read-back use
// this test's layer; the route itself runs on the production AppRuntime, so the
// fork's own lookup is the one under test.
describe("POST /session/:id/summarize agent selection", () => {
  it.live(
    "takes the main slice's agent, not a newer subagent-lane user's",
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ dir, llm }) {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "summarize agent lookup" })
        const user = Effect.fnUntraced(function* (input: {
          agent: string
          agentID?: string
          text: string
          created: number
        }) {
          const id = MessageID.ascending()
          yield* sessions.updateMessage({
            id,
            role: "user" as const,
            sessionID: session.id,
            ...(input.agentID ? { agentID: input.agentID } : {}),
            agent: input.agent,
            model,
            time: { created: input.created },
          })
          yield* sessions.updatePart({
            id: PartID.ascending(),
            messageID: id,
            sessionID: session.id,
            type: "text",
            text: input.text,
          })
        })
        const now = Date.now()
        yield* user({ agent: "build", text: "main user prompt", created: now })
        // Newest user row in the session, on a subagent lane. A lookup over
        // every lane would pick "checkpoint-writer" from it.
        yield* user({
          agent: "checkpoint-writer",
          agentID: "checkpoint-writer-1",
          text: "checkpoint task body",
          created: now + 1,
        })

        yield* llm.text("summary of the main conversation")
        const status = yield* Effect.promise(async () => {
          const response = await Server.Default().app.request(
            `/session/${session.id}/summarize?directory=${encodeURIComponent(dir)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...model, auto: false }),
            },
          )
          await response.arrayBuffer()
          return response.status
        })
        expect(status).toBe(200)

        const boundaries = (yield* sessions.messages({ sessionID: session.id, agentID: "*" })).filter(
          (message) => message.info.role === "user" && message.parts.some((part) => part.type === "compaction"),
        )
        expect(boundaries).toHaveLength(1)
        expect(boundaries[0].info.role === "user" ? boundaries[0].info.agent : undefined).toBe("build")
        expect(boundaries[0].info.agentID ?? "main").toBe("main")
      }),
      { git: true, root: "cwd", config },
    ),
    30_000,
  )
})
