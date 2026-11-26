import { expect, test } from "bun:test"
import { Effect } from "effect"
import { Server } from "../../src/server/server"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { AppRuntime } from "../../src/effect/app-runtime"
import { MessageID, PartID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Log } from "../../src/util"
import { tmpdir } from "../fixture/fixture"
import { TestLLMServer } from "../lib/llm-server"

void Log.init({ print: false })

const model = { providerID: ProviderID.make("alibaba"), modelID: ModelID.make("qwen-plus") }

// Upstream's summarize-route-main-slice test covers `resolveCurrentAgent`, a
// helper this fork's route does not call: `/summarize` goes through
// `SessionPrompt.startSummarize`, which repeats the main-slice lookup inline
// because it also needs that user's id and task. This drives the real route so
// the fork's own lookup is the one under test.
test("summarize boundary takes the main slice's agent, not a trailing subagent user's", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const llm = yield* TestLLMServer
      yield* Effect.promise(async () => {
        await using tmp = await tmpdir({
          git: true,
          root: "cwd",
          config: {
            enabled_providers: ["alibaba"],
            provider: { alibaba: { options: { apiKey: "test-key", baseURL: llm.url } } },
            model: "alibaba/qwen-plus",
            small_model: "alibaba/qwen-plus",
            agent: { build: { model: "alibaba/qwen-plus" } },
          },
        })
        try {
          const sessionID = await Instance.provide({
            directory: tmp.path,
            fn: () =>
              AppRuntime.runPromise(
                Effect.gen(function* () {
                  const sessions = yield* Session.Service
                  const session = yield* sessions.create({ title: "summarize agent lookup" })
                  const user = (input: { agent: string; agentID?: string; text: string; created: number }) =>
                    Effect.gen(function* () {
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
                  // Newest row in the session, on a subagent lane. A lookup over
                  // every lane would pick "checkpoint-writer" from it.
                  yield* user({
                    agent: "checkpoint-writer",
                    agentID: "checkpoint-writer-1",
                    text: "checkpoint task body",
                    created: now + 1,
                  })
                  return session.id
                }),
              ),
          })

          await Effect.runPromise(llm.text("summary of the main conversation"))
          const app = Server.Default().app
          const response = await app.request(
            `/session/${sessionID}/summarize?directory=${encodeURIComponent(tmp.path)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...model, auto: false }),
            },
          )
          expect(response.status).toBe(200)

          const messages = await Instance.provide({
            directory: tmp.path,
            fn: () =>
              AppRuntime.runPromise(
                Effect.gen(function* () {
                  const sessions = yield* Session.Service
                  return yield* sessions.messages({ sessionID, agentID: "*" })
                }),
              ),
          })
          const boundaries = messages.filter(
            (message) => message.info.role === "user" && message.parts.some((part) => part.type === "compaction"),
          )
          expect(boundaries).toHaveLength(1)
          expect(boundaries[0].info.role === "user" ? boundaries[0].info.agent : undefined).toBe("build")
          expect(boundaries[0].info.agentID ?? "main").toBe("main")
        } finally {
          await Instance.disposeAll()
        }
      })
    }).pipe(Effect.provide(TestLLMServer.layer), Effect.scoped),
  )
}, 30_000)

