import { expect } from "bun:test"
import { Effect, Fiber, Layer } from "effect"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Question } from "../../src/question"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID } from "../../src/session/schema"
import { PlanExitTool } from "../../src/tool/plan"
import type * as Tool from "../../src/tool/tool"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer))
const setup = (dir: string) => Effect.gen(function* () {
  const sessions = yield* Session.Service
  const question = yield* Question.Service
  const session = yield* sessions.create({ title: "Plan approval" })
  const user = yield* sessions.updateMessage({
    id: MessageID.ascending(), sessionID: session.id, role: "user", agent: "plan",
    model: { providerID: ProviderID.make("test"), modelID: ModelID.make("original"), variant: "high" },
    time: { created: Date.now() }, task_id: "task-plan", source: "user",
    tools: { bash: false }, harness: "codex",
  })
  const assistant = yield* sessions.updateMessage({
    id: MessageID.ascending(), sessionID: session.id, role: "assistant", parentID: user.id,
    agent: "plan", mode: "plan", path: { cwd: dir, root: dir },
    providerID: user.model.providerID, modelID: user.model.modelID, cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, time: { created: Date.now() },
  })
  const controller = new AbortController()
  const receipts: MessageID[] = []
  const context: Tool.Context = {
    sessionID: session.id, messageID: assistant.id, agent: "plan", actorID: "main",
    interaction: { sessionID: session.id, planExit: true }, callID: "outer:1", taskId: user.task_id,
    abort: controller.signal, messages: [], metadata: () => Effect.void, ask: () => Effect.void,
    planExitCommitted: (id) => Effect.sync(() => {
      const committed = MessageV2.get({ sessionID: session.id, messageID: id })
      expect(committed.info.role === "user" && committed.info.agent).toBe("build")
      expect(committed.parts).toHaveLength(1)
      receipts.push(id)
    }),
  }
  return { sessions, question, session, user, assistant, controller, context, receipts,
    tool: yield* (yield* PlanExitTool).init() }
})
const pending = (question: Question.Interface) => Effect.gen(function* () {
  for (;;) {
    const item = (yield* question.list())[0]
    if (item) return item
    yield* Effect.sleep("5 millis")
  }
})

for (const answer of ["Yes", "No", "Revise the design"]) {
  it.live(`plan exit ${answer} commits only an approved complete continuation`, () =>
    provideTmpdirInstance((dir) => Effect.gen(function* () {
      const f = yield* setup(dir)
      const fiber = yield* f.tool.execute({}, f.context).pipe(Effect.forkScoped)
      const item = yield* pending(f.question)
      yield* f.question.reply({ requestID: item.id, answers: [[answer]] })
      const result = yield* Fiber.join(fiber)
      expect(result.metadata.switched).toBe(answer === "Yes")
      const users = (yield* f.sessions.messages({ sessionID: f.session.id })).filter(x => x.info.role === "user")
      expect(users).toHaveLength(answer === "Yes" ? 2 : 1)
      expect(f.receipts).toHaveLength(answer === "Yes" ? 1 : 0)
      if (answer !== "Yes") return
      const committed = users.find(x => x.info.id !== f.user.id)!
      expect(committed.info).toMatchObject({
        agent: "build", model: f.user.model, task_id: "task-plan", source: "hook", tools: { bash: false }, harness: "codex",
      })
      expect(committed.parts[0]).toMatchObject({ type: "text", synthetic: true, messageID: committed.info.id })
    })), 10000)
}

it.live("plan exit cannot replace a newer user turn while approval is pending", () =>
  provideTmpdirInstance((dir) => Effect.gen(function* () {
    const f = yield* setup(dir)
    const fiber = yield* f.tool.execute({}, f.context).pipe(Effect.forkScoped)
    const item = yield* pending(f.question)
    yield* f.sessions.updateMessage({ ...f.user, id: MessageID.ascending(), time: { created: Date.now() + 1 } })
    yield* f.question.reply({ requestID: item.id, answers: [["Yes"]] })
    expect((yield* Fiber.join(fiber)).metadata.switched).toBe(false)
    expect(f.receipts).toEqual([])
    expect((yield* f.sessions.messages({ sessionID: f.session.id })).filter(x => x.info.role === "user")).toHaveLength(2)
  })), 10000)

for (const mode of ["missing", "forwarded", "never-ask", "actor"] as const) {
  it.live(`plan exit ${mode} has no authority to switch the foreground agent`, () =>
    provideTmpdirInstance((dir) => Effect.gen(function* () {
      const f = yield* setup(dir)
      if (mode === "never-ask") yield* f.question.setNeverAsk(true)
      const ctx = { ...f.context,
        ...(mode === "missing" ? { interaction: undefined } : {}),
        ...(mode === "forwarded" ? { interaction: { sessionID: f.session.id, planExit: false } } : {}),
        ...(mode === "actor" ? { actorID: "child" } : {}),
      }
      const result = yield* f.tool.execute({}, ctx).pipe(Effect.timeout("2 seconds"), Effect.exit)
      expect(result._tag).toBe("Success")
      if (result._tag === "Success") expect(result.value.metadata.switched).toBe(false)
      expect(yield* f.question.list()).toEqual([])
      expect(f.receipts).toEqual([])
    })), 10000)
}

it.live("plan exit abort removes the question and leaves no continuation", () =>
  provideTmpdirInstance((dir) => Effect.gen(function* () {
    const f = yield* setup(dir)
    const fiber = yield* f.tool.execute({}, f.context).pipe(Effect.forkScoped)
    yield* pending(f.question)
    f.controller.abort()
    const result = yield* Fiber.await(fiber).pipe(Effect.timeout("200 millis"), Effect.exit)
    expect(result._tag).toBe("Success")
    expect(yield* f.question.list()).toEqual([])
    expect(f.receipts).toEqual([])
    expect((yield* f.sessions.messages({ sessionID: f.session.id })).filter(x => x.info.role === "user")).toHaveLength(1)
  })), 10000)

it.live("direct plan approval publishes its committed receipt before a concurrent abort", () =>
  provideTmpdirInstance((dir) => Effect.gen(function* () {
    const f = yield* setup(dir)
    const seen: Record<string, unknown>[] = []
    const fiber = yield* f.tool.execute({}, { ...f.context, planExitCommitted: undefined,
      metadata: value => Effect.sync(() => {
        if (value.metadata) seen.push(value.metadata)
        f.controller.abort()
      }),
    }).pipe(Effect.forkScoped)
    const item = yield* pending(f.question)
    yield* f.question.reply({ requestID: item.id, answers: [["Yes"]] })
    yield* Fiber.await(fiber)
    const users = (yield* f.sessions.messages({ sessionID: f.session.id })).filter(x => x.info.role === "user")
    expect(users).toHaveLength(2)
    const committed = users.find(x => x.info.id !== f.user.id)!
    expect(committed.parts).toHaveLength(1)
    expect(seen).toEqual([{ switched: true, feedback: "", plan_exit: {
      version: 1, sessionID: f.session.id, callID: f.context.callID, messageID: committed.info.id, agent: "build",
    } }])
  })), 10000)
