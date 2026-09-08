import { expect } from "bun:test"
import { Effect, Layer } from "effect"
import path from "node:path"
import os from "node:os"
import { rm } from "node:fs/promises"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { ActorRegistry } from "../../src/actor/registry"
import { Bus } from "../../src/bus"
import { Question } from "../../src/question"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { ProviderID, ModelID } from "../../src/provider/schema"
import type { Config } from "../../src/config"
import { provideTmpdirServer } from "../fixture/fixture"
import { TestLLMServer } from "../lib/llm-server"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer, TestLLMServer.layer))
const model = { providerID: ProviderID.make("interaction-test"), modelID: ModelID.make("gpt-5-interaction") }
function config(url: string): Partial<Config.Info> {
  return {
    checkpoint: { thresholds: [] },
    experimental: { predict_next_prompt: false },
    agent: { plan: { prompt: "PLAN_INTERACTION_FIXTURE" }, build: { prompt: "BUILD_INTERACTION_FIXTURE" } },
    permission: { "*": "allow" },
    provider: {
      [model.providerID]: {
        npm: "@ai-sdk/openai-compatible",
        options: { baseURL: url, apiKey: "fixture-key" },
        models: {
          [model.modelID]: { name: "Interaction fixture", tool_call: true, limit: { context: 256000, output: 10000 } },
        },
      },
    },
  }
}

for (const answer of ["Yes", "No"] as const) {
  it.live(
    `provider exec question and plan_exit ${answer} control the next real agent turn`,
    () =>
      provideTmpdirServer(
        ({ dir, llm }) =>
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const prompt = yield* SessionPrompt.Service
            const question = yield* Question.Service
            const session = yield* sessions.create({ title: "Plan interaction end to end" })
            const seen: Question.Request[] = []
            const off = yield* (yield* Bus.Service).subscribeCallback(Question.Event.Asked, (event) => {
              seen.push(event.properties)
              return Effect.runPromise(
                question.reply({
                  requestID: event.properties.id,
                  answers: [[event.properties.questions[0].key === "plan_exit" ? answer : "Red"]],
                }),
              )
            })
            yield* Effect.addFinalizer(() => Effect.sync(off))
            const marker = path.join(os.tmpdir(), `exec-after-plan-${crypto.randomUUID()}.txt`)
            yield* Effect.addFinalizer(() => Effect.promise(() => rm(marker, { force: true })))
            yield* llm.tool("exec", {
              code: `
await tools.question({ questions: [{ question: "Choose a color", header: "Color", options: [{ label: "Red", description: "Use red" }] }] });
try { await tools.plan_exit({}); await files.writeText(${JSON.stringify(marker)}, "after"); }
catch { await files.writeText(${JSON.stringify(marker)}, "catch"); }
finally { await files.writeText(${JSON.stringify(marker)}, "finally"); }`,
            })
            const patch = "*** Begin Patch\n*** Add File: implemented.txt\n+implemented\n*** End Patch"
            yield* llm.tool("exec", {
              code: `return await tools.apply_patch({ patch_text: ${JSON.stringify(patch)} })`,
            })
            yield* llm.text("interaction finished")
            yield* prompt
              .prompt({
                sessionID: session.id,
                agent: "plan",
                model,
                harness: "codex",
                parts: [{ type: "text", text: "Ask the color, request plan approval, then implement if approved" }],
              })
              .pipe(Effect.timeout("20 seconds"))
            expect(seen).toHaveLength(2)
            expect(seen.map((request) => request.sessionID)).toEqual([session.id, session.id])
            expect(seen[0].tool?.messageID).toBe(seen[1].tool?.messageID)
            expect(seen[0].tool?.callID).not.toBe(seen[1].tool?.callID)
            expect(yield* question.list()).toEqual([])
            expect(yield* Effect.promise(() => Bun.file(marker).exists())).toBe(answer === "No")
            expect(yield* Effect.promise(() => Bun.file(path.join(dir, "implemented.txt")).exists())).toBe(
              answer === "Yes",
            )
            const requests = yield* llm.inputs
            expect(requests).toHaveLength(3)
            const system = (request: Record<string, unknown>) =>
              JSON.stringify((request.messages as { role: string }[]).filter((message) => message.role === "system"))
            expect(system(requests[0])).toContain("PLAN_INTERACTION_FIXTURE")
            expect(system(requests[1])).toContain(
              answer === "Yes" ? "BUILD_INTERACTION_FIXTURE" : "PLAN_INTERACTION_FIXTURE",
            )
            const messages = yield* sessions.messages({ sessionID: session.id })
            expect(
              messages
                .filter((message) => message.info.role === "user")
                .map((message) => message.info.role === "user" && message.info.agent),
            ).toEqual(answer === "Yes" ? ["plan", "build"] : ["plan"])
            expect(yield* llm.misses).toEqual([])
          }),
        { git: true, config },
      ),
    30000,
  )
}

for (const mode of ["background", "system", "peer", "unknown"] as const) {
  it.live(
    `provider exec ${mode} interaction follows the real actor routing`,
    () =>
      provideTmpdirServer(
        ({ llm }) =>
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const prompt = yield* SessionPrompt.Service
            const question = yield* Question.Service
            const registry = yield* ActorRegistry.Service
            const parent = yield* sessions.create({ title: "Interactive parent" })
            const session =
              mode === "peer" ? yield* sessions.create({ title: "Interactive peer", parentID: parent.id }) : parent
            const actorID = `interaction-${mode}`
            if (mode !== "unknown") {
              yield* registry.register({
                sessionID: session.id,
                actorID,
                mode: mode === "peer" ? "peer" : "subagent",
                parentActorID: "main",
                agent: mode === "system" ? "checkpoint-writer" : "plan",
                description: "Interaction routing fixture",
                contextMode: "none",
                background: mode !== "system",
                lifecycle: "ephemeral",
              })
              yield* registry.updateStatus(session.id, actorID, { status: "running" })
            }
            const seen: Question.Request[] = []
            const off = yield* (yield* Bus.Service).subscribeCallback(Question.Event.Asked, (event) => {
              seen.push(event.properties)
              return Effect.runPromise(question.reply({ requestID: event.properties.id, answers: [["Red"]] }))
            })
            yield* Effect.addFinalizer(() => Effect.sync(off))
            yield* llm.tool("exec", {
              code: `const question = await tools.question({ questions: [{ question: "Choose", header: "Color", options: [{ label: "Red", description: "Red" }] }] });
const plan = await tools.plan_exit({}); return { question, plan };`,
            })
            yield* llm.text("routing finished")
            yield* prompt
              .prompt({
                sessionID: session.id,
                agentID: actorID,
                agent: "plan",
                model,
                harness: "codex",
                parts: [{ type: "text", text: "Exercise interactive tools from this actor" }],
              })
              .pipe(Effect.timeout("15 seconds"))
            expect(yield* llm.inputs).toHaveLength(2)
            expect(seen).toHaveLength(mode === "peer" ? 1 : 0)
            if (mode === "peer") {
              expect(seen[0].sessionID).toBe(parent.id)
              const original = yield* sessions.messages({ sessionID: session.id, agentID: actorID })
              expect(original.some((message) => message.info.id === seen[0].tool?.messageID)).toBe(true)
              expect(seen[0].tool?.callID).toContain(":")
            }
            expect(yield* question.list()).toEqual([])
            const messages = yield* sessions.messages({ sessionID: session.id, agentID: actorID })
            const execution = messages
              .flatMap((message) => message.parts)
              .find((part) => part.type === "tool" && part.tool === "exec")
            expect(execution?.type === "tool" && execution.state.status).toBe("completed")
            if (execution?.type === "tool" && execution.state.status === "completed") {
              expect(execution.state.output).toContain(mode === "peer" ? "Red" : "[Never-Ask]")
              expect(execution.state.output).toContain("Plan approval unavailable")
            }
            expect(
              messages
                .filter((message) => message.info.role === "user")
                .map((message) => message.info.role === "user" && message.info.agent),
            ).toEqual(["plan"])
            expect(yield* llm.misses).toEqual([])
          }),
        { git: true, config },
      ),
    25000,
  )
}
