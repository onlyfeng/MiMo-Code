import { expect } from "bun:test"
import { Effect, Layer, Schedule } from "effect"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { MessageID, PartID } from "../../src/session/schema"
import { MessageV2 } from "../../src/session/message-v2"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Server } from "../../src/server/server"
import { TaskRegistry } from "../../src/task/registry"
import { Database, eq } from "../../src/storage"
import { TaskTable } from "../../src/task/task.sql"
import type { Config } from "../../src/config"
import { provideTmpdirServer, tmpdirScoped } from "../fixture/fixture"
import { TestLLMServer } from "../lib/llm-server"
import { testEffect } from "../lib/effect"
import { withEnv } from "../lib/env"

withEnv({
  MIMOCODE_DISABLE_BUILTIN_SKILLS: "true",
  MIMOCODE_DISABLE_COMPOSE_SKILLS: "true",
  MIMOCODE_DISABLE_INSTRUCTIONS: "true",
})
const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer, TestLLMServer.layer))
const model = { providerID: ProviderID.make("recovery-task"), modelID: ModelID.make("gpt-5-recovery-task") }
const config = (url: string): Partial<Config.Info> => ({
  checkpoint: { thresholds: [] },
  experimental: { predict_next_prompt: false },
  permission: { "*": "allow" },
  agent: { build: { prompt: "RECOVERY_TASK_FIXTURE" } },
  provider: {
    [model.providerID]: {
      npm: "@ai-sdk/openai-compatible",
      options: { baseURL: url, apiKey: "fixture" },
      models: {
        [model.modelID]: { name: "Recovery task", tool_call: true, limit: { context: 256000, output: 10000 } },
      },
    },
  },
})
const resume = (dir: string, sessionID: string, assistantID: string, taskID: string) =>
  Effect.promise(() =>
    Promise.resolve(
      Server.Default().app.request(
        `/session/${sessionID}/turn/${assistantID}/resume?directory=${encodeURIComponent(dir)}&task_id=${encodeURIComponent(taskID)}`,
        { method: "POST" },
      ),
    ),
  )

it.live(
  "main HTTP recovery binds a real task before hooks and preserves it through actual length continuation",
  () =>
    Effect.gen(function* () {
      const key = `recovery-task-${crypto.randomUUID()}`
      const state = {
        pre: [] as (string | undefined)[],
        params: [] as (string | undefined)[],
        post: [] as (string | undefined)[],
        done: Promise.withResolvers<void>(),
      }
      Reflect.set(globalThis, key, state)
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          Reflect.deleteProperty(globalThis, key)
        }),
      )
      const plugin = path.join(yield* tmpdirScoped(), "recovery-witness.ts")
      yield* Effect.promise(() =>
        Bun.write(
          plugin,
          `export default async () => ({
    "session.pre": async (input) => { Reflect.get(globalThis, ${JSON.stringify(key)})?.pre.push(input.task_id) },
    "chat.params": async (input) => { Reflect.get(globalThis, ${JSON.stringify(key)})?.params.push(input.message.task_id) },
    "experimental.chat.messages.transform": async (_, output) => {
      const user = output.messages.findLast(message => message.info.role === "user")
      if (!user?.info.task_id) return
      user.parts.push({ type: "text", id: user.info.id + "-witness", sessionID: user.info.sessionID, messageID: user.info.id, synthetic: true, text: "RECOVERY_BOUND_TASK=" + user.info.task_id })
    },
    "session.post": async (input) => {
      const state = Reflect.get(globalThis, ${JSON.stringify(key)})
      state?.post.push(input.task_id)
      if (input.finalText === "RECOVERY_TASK_FINISHED") state?.done.resolve()
    },
  })`,
        ),
      )
      yield* provideTmpdirServer(
        ({ dir, llm }) =>
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const prompt = yield* SessionPrompt.Service
            const tasks = yield* TaskRegistry.Service
            const session = yield* sessions.create({ title: "Recovery task producer" })
            yield* llm.error(400, { error: { message: "Deliberate terminal provider rejection" } })
            yield* prompt
              .prompt({
                sessionID: session.id,
                agent: "build",
                model,
                harness: "codex",
                parts: [{ type: "text", text: "ORIGINAL_RECOVERY_TASK_SOURCE" }],
              })
              .pipe(Effect.exit)
            const candidates = yield* prompt.recovery({ sessionID: session.id })
            expect(candidates).toHaveLength(1)
            const before = yield* sessions.messages({ sessionID: session.id })
            const original = before.find((message) => message.info.id === candidates[0].parentMessageID)
            if (!original || original.info.role !== "user") throw new Error("Missing interrupted original user")
            const task = yield* tasks.create({ session_id: session.id, summary: "Bind the interrupted source" })
            state.pre.length = 0
            state.params.length = 0
            state.post.length = 0
            yield* llm.push({
              type: "sse",
              head: [],
              tail: [
                {
                  id: "chatcmpl-length",
                  object: "chat.completion.chunk",
                  choices: [
                    {
                      index: 0,
                      delta: { role: "assistant", content: "Partial recovery output" },
                      finish_reason: "length",
                    },
                  ],
                },
              ],
            })
            yield* llm.text("RECOVERY_TASK_FINISHED")
            const response = yield* resume(dir, session.id, candidates[0].assistantMessageID, task.id)
            expect(response.status).toBe(202)
            yield* Effect.promise(() => state.done.promise).pipe(Effect.timeout("20 seconds"))
            const messages = yield* sessions.messages({ sessionID: session.id })
            const user = messages.find((message) => message.info.id === original.info.id)
            expect(user?.info).toEqual({ ...original.info, task_id: task.id })
            expect(user?.parts).toEqual(original.parts)
            const continuation = messages.find(
              (message) => message.info.role === "user" && message.info.source === "hook",
            )
            expect(continuation?.info).toMatchObject({
              task_id: task.id,
              agent: original.info.agent,
              model: original.info.model,
            })
            expect(
              messages.find((message) => message.info.id === candidates[0].assistantMessageID)?.info.time,
            ).toHaveProperty("completed")
            expect(yield* tasks.get({ session_id: session.id, id: task.id })).toMatchObject({
              status: "in_progress",
              owner: "main",
            })
            expect(state.pre).toEqual([task.id])
            expect(state.params).toEqual([task.id, task.id])
            expect(state.post).toEqual([task.id])
            const requests = yield* llm.inputs
            expect(requests).toHaveLength(3)
            for (const request of requests.slice(1)) {
              expect(JSON.stringify(request.messages)).toContain("ORIGINAL_RECOVERY_TASK_SOURCE")
              expect(JSON.stringify(request.messages)).toContain(`RECOVERY_BOUND_TASK=${task.id}`)
            }
          }),
        { git: true, root: "cwd", config: (url) => ({ ...config(url), plugin: [pathToFileURL(plugin).href] }) },
      )
    }),
  30000,
)

it.live(
  "main HTTP task rejects conflicts and missing namespace tasks before provider or settlement",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const sessions = yield* Session.Service
          const tasks = yield* TaskRegistry.Service
          for (const scenario of ["mismatch", "missing", "foreign", "owner", "blocked", "done", "abandoned"] as const) {
            const session = yield* sessions.create({ title: scenario })
            const user: MessageV2.User = {
              id: MessageID.ascending(),
              sessionID: session.id,
              role: "user",
              agent: "build",
              model,
              time: { created: 100 },
              task_id: scenario === "mismatch" ? "T9" : undefined,
            }
            const assistant: MessageV2.Assistant = {
              id: MessageID.ascending(),
              sessionID: session.id,
              role: "assistant",
              parentID: user.id,
              agent: "build",
              mode: "build",
              providerID: model.providerID,
              modelID: model.modelID,
              path: { cwd: dir, root: dir },
              cost: 0,
              tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
              time: { created: 200 },
            }
            yield* sessions.updateMessage(user)
            yield* sessions.updateMessage(assistant)
            const foreign = scenario === "foreign" ? yield* sessions.create() : session
            const task =
              scenario === "missing"
                ? undefined
                : yield* tasks.create({
                    session_id: foreign.id,
                    summary: scenario,
                    owner: scenario === "owner" ? "other-actor" : undefined,
                  })
            if (scenario === "blocked" || scenario === "done" || scenario === "abandoned")
              Database.use((db) =>
                db.update(TaskTable).set({ status: scenario }).where(eq(TaskTable.session_id, session.id)).run(),
              )
            const before = yield* sessions.messages({ sessionID: session.id })
            const beforeTask = task ? yield* tasks.get({ session_id: foreign.id, id: task.id }) : undefined
            const response = yield* resume(dir, session.id, assistant.id, task?.id ?? "T99")
            expect(response.status).toBe(scenario === "missing" || scenario === "foreign" ? 404 : 409)
            expect(yield* sessions.messages({ sessionID: session.id })).toEqual(before)
            if (task) expect(yield* tasks.get({ session_id: foreign.id, id: task.id })).toEqual(beforeTask)
            expect(yield* llm.calls).toBe(0)
          }
        }),
      { git: true, root: "cwd", config },
    ),
  30000,
)

it.live(
  "main HTTP accepts the same historical task without rewriting the original user or claiming a task row",
  () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "Historical task" })
          const user: MessageV2.User = {
            id: MessageID.ascending(),
            sessionID: session.id,
            role: "user",
            agent: "build",
            model,
            time: { created: 100 },
            task_id: "T404",
            summary: { diffs: [] },
          }
          yield* sessions.updateMessage(user)
          yield* sessions.updatePart({
            id: PartID.ascending(),
            sessionID: session.id,
            messageID: user.id,
            type: "text",
            text: "Recover the historical task",
          })
          const assistant = yield* sessions.updateMessage({
            id: MessageID.ascending(),
            sessionID: session.id,
            role: "assistant",
            parentID: user.id,
            agent: "build",
            mode: "build",
            providerID: model.providerID,
            modelID: model.modelID,
            path: { cwd: dir, root: dir },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            time: { created: 200 },
          })
          const before = (yield* sessions.messages({ sessionID: session.id })).find(
            (message) => message.info.id === user.id,
          )
          yield* llm.text("HISTORICAL_TASK_RECOVERED")
          expect((yield* resume(dir, session.id, assistant.id, "T404")).status).toBe(202)
          const messages = yield* sessions.messages({ sessionID: session.id }).pipe(
            Effect.repeat({
              until: (messages) =>
                messages.some(
                  (message) =>
                    message.info.role === "assistant" &&
                    message.info.id !== assistant.id &&
                    message.info.time.completed !== undefined,
                ),
              schedule: Schedule.spaced("20 millis"),
            }),
            Effect.timeout("10 seconds"),
          )
          expect(yield* llm.calls).toBe(1)
          expect(messages.find((message) => message.info.id === user.id)).toEqual(before)
          expect(
            messages
              .flatMap((message) => message.parts)
              .some((part) => part.type === "text" && part.text === "HISTORICAL_TASK_RECOVERED"),
          ).toBe(true)
          expect(yield* (yield* TaskRegistry.Service).get({ session_id: session.id, id: "T404" })).toBeUndefined()
        }),
      { git: true, root: "cwd", config },
    ),
  30000,
)
