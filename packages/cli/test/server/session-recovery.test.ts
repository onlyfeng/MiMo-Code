import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Fiber } from "effect"
import { createOpencodeClient } from "@mimo-ai/sdk/v2"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { HostModelTransport } from "../../src/provider/host-transport"
import { SessionStatus } from "../../src/session/status"
import { SessionRunState } from "../../src/session/run-state"
import { ActorRegistry } from "../../src/actor/registry"
import { Question } from "../../src/question"
import { Permission } from "../../src/permission"
import { ResumeTestHooks } from "../../src/session/resume-test-hooks"
import { MessageID, PartID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Log } from "../../src/util"
import { Bus } from "../../src/bus"
import { tmpdir } from "../fixture/fixture"
import { startScriptedLLMServer, textStopResponse } from "../lib/scripted-llm-server"

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

describe("session turn recovery routes", () => {
  test("does not expose or resume unregistered actor turns", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    const result = await Instance.provide({
      directory: tmp.path,
      fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "actor recovery boundary" })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          agentID: "peer-1",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
          time: { created: Date.now() },
        })
        const assistant = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          parentID: user.id,
          sessionID: session.id,
          mode: "build",
          agent: "build",
          agentID: "peer-1",
          path: { cwd: tmp.path, root: tmp.path },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          modelID: ModelID.make("test-model"),
          providerID: ProviderID.make("test"),
          time: { created: Date.now() },
        })
        const app = Server.Default().app
        const query = `?directory=${encodeURIComponent(tmp.path)}`
        const listed = yield* Effect.promise(() => Promise.resolve(app.request(`/session/${session.id}/recovery${query}`)))
        const candidates = yield* Effect.promise(() => listed.json())
        const resumed = yield* Effect.promise(() =>
          Promise.resolve(app.request(`/session/${session.id}/turn/${assistant.id}/resume${query}&agentID=peer-1`, { method: "POST" })),
        )
        const actorListed = yield* Effect.promise(() => Promise.resolve(app.request(`/session/${session.id}/recovery${query}&agentID=peer-1`)))
        return { listed: listed.status, candidates, resumed: resumed.status, actorListed: actorListed.status }
      })),
    })

    expect(result).toEqual({ listed: 200, candidates: [], resumed: 404, actorListed: 404 })
  })

  test("lists the latest incomplete assistant and accepts resume without a new prompt", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    const result = await Instance.provide({
      directory: tmp.path,
      fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "recovery route" })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
          time: { created: Date.now() },
        })
        const assistant = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          parentID: user.id,
          sessionID: session.id,
          mode: "build",
          agent: "build",
          path: { cwd: tmp.path, root: tmp.path },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          modelID: ModelID.make("test-model"),
          providerID: ProviderID.make("test"),
          time: { created: Date.now() },
        })
        const app = Server.Default().app
        const errors: unknown[] = []
        let resolveError!: () => void
        const errorSeen = new Promise<void>((resolve) => {
          resolveError = resolve
        })
        const unsubscribe = Bus.subscribe(Session.Event.Error, (event) => {
          if (event.properties.sessionID === session.id) {
            errors.push(event.properties.error)
            resolveError()
          }
        })
        const query = `?directory=${encodeURIComponent(tmp.path)}`
        const resumeQuery = `${query}&titleLocale=fr-FR`
        const before = yield* sessions.messages({ sessionID: session.id, agentID: "main" })
        for (const selector of ["", "&agentID=main"]) {
          const rejected = yield* Effect.promise(() =>
            Promise.all([
              app.request(`/session/${session.id}/recovery${query}${selector}&task_id=other`),
              app.request(`/session/${session.id}/turn/${assistant.id}/resume${query}${selector}&task_id=other`, {
                method: "POST",
              }),
            ]),
          )
          expect(rejected.map((response) => response.status)).toEqual([400, 400])
        }
        expect(yield* sessions.messages({ sessionID: session.id, agentID: "main" })).toEqual(before)
        const listed = yield* Effect.promise(() => Promise.resolve(app.request(`/session/${session.id}/recovery${query}`)))
        const candidates = yield* Effect.promise(() =>
          listed.json() as Promise<
            Array<{ kind: "assistant"; assistantMessageID: string; parentMessageID: string; created: number }>
          >,
        )
        const missing = yield* Effect.promise(() =>
          Promise.resolve(app.request(`/session/${session.id}/turn/${MessageID.ascending()}/resume${resumeQuery}`, { method: "POST" })),
        )
        const resumed = yield* Effect.promise(() => Promise.resolve(app.request(`/session/${session.id}/turn/${assistant.id}/resume${resumeQuery}`, { method: "POST" })))
        yield* Effect.promise(() =>
          Promise.race([errorSeen, new Promise((resolve) => setTimeout(resolve, 10_000))]),
        )
        // post-resume observable signals (not pre-resume candidates)
        yield* Effect.sleep("150 millis")
        const afterListed = yield* Effect.promise(() =>
          Promise.resolve(app.request(`/session/${session.id}/recovery${query}`)),
        )
        const afterCandidates = yield* Effect.promise(() =>
          afterListed.json() as Promise<Array<{ assistantMessageID: string }>>,
        )
        unsubscribe()
        const after = yield* sessions.messages({ sessionID: session.id, agentID: "main" })
        const abandoned = after.find((item) => item.info.id === assistant.id)?.info
        const abandonedAssistant = abandoned?.role === "assistant" ? abandoned : undefined
        return {
          listed: listed.status,
          candidates,
          resumed: resumed.status,
          missing: missing.status,
          userID: user.id,
          errors,
          abandoned: abandonedAssistant,
          shellRemoved: abandoned === undefined,
          afterNoLongerListsShell: !afterCandidates.some((c) => c.assistantMessageID === assistant.id),
          afterMessageCount: after.length,
          afterMessages: after.map((m) => ({ info: { role: m.info.role, id: m.info.id } })),
        }
      })),
    })

    expect(result.listed).toBe(200)
    expect(result.candidates).toEqual([
      {
        kind: "assistant",
        assistantMessageID: expect.any(String),
        parentMessageID: result.userID,
        created: expect.any(Number),
      },
    ])
    // [TP-SR-R21-16] HTTP resume admitted (202) and empty residue shell cleaned
    expect(result.resumed).toBe(202)
    expect(result.missing).toBe(404)
    expect(result.shellRemoved).toBe(true)
    // Both must hold for empty-tail resume; not an OR against pre-resume candidates.
    expect(result.afterNoLongerListsShell).toBe(true)
    // Work proof independent of shellRemoved: session error bus fired (runLoop without provider)
    // OR a new assistant message appeared after cleanup.
    const newAssistants = result.afterMessages.filter(
      (m: { info: { role: string; id: string } }) => m.info.role === "assistant",
    )
    expect(result.errors.length > 0 || newAssistants.length > 0).toBe(true)
    if (result.abandoned?.error) {
      const err = result.abandoned.error as { data?: { message?: string } }
      const abandonMsg = err.data?.message ?? ""
      expect(abandonMsg).not.toContain("Abandoned: resumed as a new assistant turn")
    }
  })

  test("atomically accepts only one of two concurrent resume requests", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    const statuses = await Instance.provide({
      directory: tmp.path,
      fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "concurrent recovery admission" })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
          time: { created: Date.now() },
        })
        const assistant = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          parentID: user.id,
          sessionID: session.id,
          mode: "build",
          agent: "build",
          path: { cwd: tmp.path, root: tmp.path },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          modelID: ModelID.make("test-model"),
          providerID: ProviderID.make("test"),
          time: { created: Date.now() },
        })
        const app = Server.Default().app
        const url = `/session/${session.id}/turn/${assistant.id}/resume?directory=${encodeURIComponent(tmp.path)}`
        const responses = yield* Effect.promise(() =>
          Promise.all([
            app.request(url, { method: "POST" }),
            app.request(url, { method: "POST" }),
          ]),
        )
        return responses.map((response) => response.status).sort((a, b) => a - b)
      })),
    })

    expect(statuses).toEqual([202, 409])
  })

  test("shares atomic admission with the ordinary prompt route", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    const statuses = await Instance.provide({
      directory: tmp.path,
      fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "prompt recovery admission" })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
          time: { created: Date.now() },
        })
        const assistant = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          parentID: user.id,
          sessionID: session.id,
          mode: "build",
          agent: "build",
          path: { cwd: tmp.path, root: tmp.path },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          modelID: ModelID.make("test-model"),
          providerID: ProviderID.make("test"),
          time: { created: Date.now() },
        })
        const app = Server.Default().app
        const query = `?directory=${encodeURIComponent(tmp.path)}`
        const responses = yield* Effect.promise(() =>
          Promise.all([
            app.request(`/session/${session.id}/message${query}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ parts: [{ type: "text", text: "new prompt" }] }),
            }),
            app.request(`/session/${session.id}/turn/${assistant.id}/resume${query}`, { method: "POST" }),
          ]),
        )
        return responses.map((response) => response.status).sort((a, b) => a - b)
      })),
    })

    expect(statuses).toContain(409)
    expect(statuses.filter((status) => status === 200 || status === 202)).toHaveLength(1)
  })
})

test("SDK serializes resume titleLocale in the query string", async () => {
  let captured: Request | undefined
  const fetchMock = Object.assign(
    async (request: RequestInfo | URL) => {
      captured = request instanceof Request ? request : new Request(request)
      return new Response(null, { status: 202 })
    },
    { preconnect: () => {} },
  )
  const client = createOpencodeClient({
    baseUrl: "http://example.test",
    fetch: fetchMock,
  })

  await client.session.resume({
    sessionID: "ses_test",
    assistantMessageID: "msg_test",
    titleLocale: "fr-FR",
  })

  expect(captured).toBeDefined()
  const url = new URL(captured!.url)
  expect(url.pathname).toBe("/session/ses_test/turn/msg_test/resume")
  expect(url.searchParams.get("titleLocale")).toBe("fr-FR")
  expect(captured!.body).toBeNull()
})

// [TP-SR-R21-26] [TP-SR-R21-30] [TP-SR-R21-31] [TP-R8-25] [TP-RUN-R4-08]
for (const mode of ["success", "host-reject", "commit-reject", "changed-during-host", "cancel-during-host", "cancel-during-work"] as const) {
  test(`resume host attempt lifecycle ${mode}`, async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    const stub = startScriptedLLMServer([{ lines: textStopResponse("host-bound recovery") }])
    const attempt = { requestId: "resume-request", attemptId: "resume-attempt" }
    const prepared: HostModelTransport.ExecutionAdmission[] = []
    const admitted: HostModelTransport.ExecutionAdmission[] = []
    const finished: HostModelTransport.ExecutionAttempt[] = []
    const scopes: HostModelTransport.ModelCallScope[] = []
    const entered = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    HostModelTransport.set({
      userMessage() {},
      async prepareExecution(input) {
        prepared.push(input)
        if (mode !== "cancel-during-work") entered.resolve()
        if (mode === "host-reject") throw new Error("host refused preparation")
        if (mode === "changed-during-host" || mode === "cancel-during-host") await release.promise
      },
      admitExecution(input) {
        if (mode === "commit-reject") throw new Error("host refused commit")
        admitted.push(input)
        return { beforeWork: async () => {
          if (mode === "cancel-during-work") { entered.resolve(); await release.promise }
        } }
      },
      finishExecution(input) { finished.push(input) },
      modelCall(input, call) { scopes.push(input); return call() },
    })
    try {
      await Bun.write(`${tmp.path}/mimocode.json`, JSON.stringify({
        enabled_providers: ["alibaba"],
        provider: { alibaba: { options: { apiKey: "test-key", baseURL: `${stub.origin}/v1` } } },
        agent: { build: { model: "alibaba/qwen-plus" } },
      }))
      await Instance.provide({ directory: tmp.path, fn: () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const prompt = yield* SessionPrompt.Service
        const session = yield* sessions.create({ title: "host attempt resume" })
        const user = yield* sessions.updateMessage({ id: MessageID.ascending(), role: "user", sessionID: session.id,
          agent: "build", model: { providerID: ProviderID.make("alibaba"), modelID: ModelID.make("qwen-plus") }, time: { created: Date.now() } })
        yield* sessions.updatePart({ id: PartID.ascending(), sessionID: session.id, messageID: user.id, type: "text", text: "Original host input" })
        const target = yield* sessions.updateMessage({ id: MessageID.ascending(), role: "assistant", sessionID: session.id,
          parentID: user.id, agent: "build", mode: "build", modelID: ModelID.make("qwen-plus"), providerID: ProviderID.make("alibaba"),
          path: { cwd: tmp.path, root: tmp.path }, time: { created: Date.now() }, cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        })
        yield* sessions.updatePart({ id: PartID.ascending(), sessionID: session.id, messageID: target.id, type: "text", text: "old half answer" })
        const before = yield* sessions.messages({ sessionID: session.id })
        const activity: string[] = []
        const offStatus = Bus.subscribe(SessionStatus.Event.Status, (event) => {
          if (event.properties.sessionID === session.id) activity.push(event.properties.status.type)
        })
        const app = Server.Default().app
        const request = Promise.resolve(app.request(`/session/${session.id}/resume?directory=${encodeURIComponent(tmp.path)}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assistantMessageID: target.id, attempt }),
        }))
        yield* Effect.promise(() => entered.promise).pipe(Effect.timeout("5 seconds"))
        expect(prepared).toEqual([{ attempt, directory: tmp.path, sessionID: session.id, userMessageID: user.id, target: { assistantMessageID: target.id } }])
        expect(finished).toEqual([])
        if (mode === "changed-during-host") {
          yield* sessions.updateMessage({ ...user, id: MessageID.ascending(), time: { created: Date.now() + 1 } })
          release.resolve()
        }
        if (mode === "cancel-during-work") {
          expect((yield* Effect.promise(() => request)).status).toBe(202)
          const snapshot = yield* Effect.promise(() => Promise.resolve(app.request(`/session/status?directory=${encodeURIComponent(tmp.path)}`)).then(response => response.json()))
          expect(snapshot[session.id]).toEqual({ type: "busy" })
          expect(activity).toEqual(["busy"])
          expect(scopes).toEqual([])
          expect(stub.captures).toHaveLength(0)
        }
        if (mode === "cancel-during-host" || mode === "cancel-during-work") {
          yield* prompt.cancel(session.id)
          release.resolve()
        }
        const response = yield* Effect.promise(() => request)
        for (let i = 0; i < 100 && finished.length === 0; i++) yield* Effect.sleep("20 millis")
        expect(finished).toEqual([attempt])
        offStatus()
        if (mode === "cancel-during-work") {
          expect(activity.at(-1)).toBe("idle")
          expect(yield* SessionStatus.Service.use(status => status.get(session.id))).toEqual({ type: "idle" })
        }
        const after = yield* sessions.messages({ sessionID: session.id })
        expect(admitted).toEqual(mode === "success" || mode === "cancel-during-work" ? prepared : [])
        if (mode === "success") {
          expect(response.status).toBe(202)
          expect(stub.captures).toHaveLength(1)
          expect(scopes).toEqual([expect.objectContaining({ executionAttempt: attempt, directory: tmp.path, sessionID: session.id, userMessageID: user.id, assistantMessageID: expect.any(String) })])
          expect(scopes[0].assistantMessageID).not.toBe(target.id)
          // FC-001: admission settles the reviewed assistant instead of trimming it.
          expect(after.find((message) => message.info.id === target.id)?.info).toMatchObject({ error: { name: "MessageAbortedError" } })
        } else {
          expect(response.status).toBe(mode === "cancel-during-work" ? 202 : 404)
          expect(scopes).toEqual([])
          expect(stub.captures).toHaveLength(0)
          const kept = after.filter((message) => before.some((old) => old.info.id === message.info.id))
          if (mode === "cancel-during-work") {
            // Cancellation after admission belongs to the accepted generation (FC-001).
            expect(kept.map((message) => message.info.id)).toEqual(before.map((message) => message.info.id))
            expect(kept.find((message) => message.info.id === target.id)?.info).toMatchObject({ error: { name: "MessageAbortedError" } })
          } else expect(kept).toEqual(before)
        }
      })) })
    } finally {
      release.resolve()
      await Instance.disposeAll()
      HostModelTransport.set(undefined)
      await stub.stop()
    }
  }, 30_000)
}

const finalDeliveries = [
  { structured: { answer: 4 } },
  { structured: false },
  { structured: 0 },
  { structured: "" },
  { structured: null },
  { summary: true },
]

// [TP-SR-R21-07]
describe("recovery candidate predicate", () => {
  async function setupAssistant(overrides: Partial<{
    finish: string; completed: boolean; error: boolean; text: string; structured: unknown; summary: boolean
  }>) {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    // Await so `await using` disposal (rm -rf tmpdir) cannot race provide's setup writes.
    return await Instance.provide({
      directory: tmp.path,
      fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "predicate" })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
          time: { created: Date.now() },
        })
        const assistant = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          parentID: user.id,
          sessionID: session.id,
          mode: "build",
          agent: "build",
          path: { cwd: tmp.path, root: tmp.path },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          modelID: ModelID.make("test-model"),
          providerID: ProviderID.make("test"),
          time: overrides.completed
            ? { created: Date.now(), completed: Date.now() }
            : { created: Date.now() },
          ...(overrides.finish ? { finish: overrides.finish as "stop" | "length" | "tool-calls" | "other" } : {}),
          ...(overrides.error ? { error: { name: "APIError", data: { message: "model unavailable", statusCode: 503, isRetryable: true } } } : {}),
          ...(overrides.structured !== undefined ? { structured: overrides.structured } : {}),
          ...(overrides.summary ? { summary: overrides.summary } : {}),
        } as Parameters<typeof sessions.updateMessage>[0])
        if (overrides.text) yield* sessions.updatePart({
          id: PartID.ascending(), sessionID: session.id, messageID: assistant.id,
          type: "text", text: overrides.text,
        })
        const candidates = yield* SessionPrompt.Service.use((svc) =>
          svc.recovery({ sessionID: session.id, agentID: "main" }),
        )
        const rejected = candidates.length === 0
          ? yield* Effect.promise(() => Promise.resolve(Server.Default().app.request(
              `/session/${session.id}/resume?directory=${encodeURIComponent(tmp.path)}`,
              { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
            )))
          : undefined
        return { candidates, assistantId: assistant.id, resumeStatus: rejected?.status }
      })),
    })
  }

  test("completed + tool-calls → candidate", async () => {
    const result = await setupAssistant({ completed: true, finish: "tool-calls" })
    expect(result.candidates.length).toBe(1)
    const c0 = result.candidates[0]!;
    expect(c0.kind).toBe("assistant");
    if (c0.kind === "assistant") expect(c0.assistantMessageID).toBe(result.assistantId)
  })

  test("completed + length → candidate", async () => {
    const result = await setupAssistant({ completed: true, finish: "length" })
    expect(result.candidates.length).toBe(1)
  })

  test("no completed → candidate", async () => {
    const result = await setupAssistant({ completed: false })
    expect(result.candidates.length).toBe(1)
  })

  test("completed + stop with final text → NOT candidate", async () => {
    const result = await setupAssistant({ completed: true, finish: "stop", text: "final answer" })
    expect(result.candidates.length).toBe(0)
  })

  for (const completed of [false, true]) {
    for (const delivery of finalDeliveries) {
      test(`stop + ${JSON.stringify(delivery)} completed=${completed} is not resumed`, async () => {
        const result = await setupAssistant({ finish: "stop", completed, ...delivery })
        expect(result.candidates).toEqual([])
        expect(result.resumeStatus).toBe(404)
      })
    }
  }

  test("completed + content-filter with no output → NOT candidate", async () => {
    const result = await setupAssistant({ completed: true, finish: "content-filter" })
    expect(result.candidates).toEqual([])
    expect(result.resumeStatus).toBe(404)
  })

  test("completed + other → NOT candidate", async () => {
    const result = await setupAssistant({ completed: true, finish: "other" })
    expect(result.candidates.length).toBe(0)
  })

  // [Finding #1 regression] finish=stop but error set: processor does not write completed on error => recoverable.
  test("finish=stop + error → candidate (error means not completed)", async () => {
    const result = await setupAssistant({ completed: false, finish: "stop", error: true })
    expect(result.candidates.length).toBe(1)
  })

  // error + no completed: any finish is a candidate (error means not finished).
  test("error + no completed → candidate", async () => {
    const result = await setupAssistant({ completed: false, error: true })
    expect(result.candidates.length).toBe(1)
  })
})

// [TP-SR-R21-07]
describe("empty stop recovery matrix", () => {
  for (const output of ["empty", "placeholders", "text"] as const) {
    const content = output === "text"
    for (const completed of [false, true]) {
      for (const error of [false, true]) {
        const label = `content=${content} completed=${completed} error=${error}${output === "placeholders" ? " placeholders" : ""}`
        test(label, async () => {
          await using tmp = await tmpdir({ git: true, root: "cwd" })
          const stub = startScriptedLLMServer([{ lines: textStopResponse("recovered answer") }])
          try {
            await Bun.write(`${tmp.path}/mimocode.json`, JSON.stringify({
              enabled_providers: ["alibaba"],
              provider: { alibaba: { options: { apiKey: "test-key", baseURL: `${stub.origin}/v1` } } },
              agent: { build: { model: "alibaba/qwen-plus" } },
            }))
            const result = await Instance.provide({
              directory: tmp.path,
              fn: () => AppRuntime.runPromise(Effect.gen(function* () {
                const sessions = yield* Session.Service
                const session = yield* sessions.create({ title: "empty-stop-matrix" })
                const user = yield* sessions.updateMessage({
                  id: MessageID.ascending(), role: "user", sessionID: session.id, agent: "build",
                  model: { providerID: ProviderID.make("alibaba"), modelID: ModelID.make("qwen-plus") },
                  time: { created: Date.now() },
                })
                yield* sessions.updatePart({
                  id: PartID.ascending(), sessionID: session.id, messageID: user.id,
                  type: "text", text: "Answer my question.",
                })
                const assistantInfo = {
                  role: "assistant" as const, parentID: user.id, sessionID: session.id,
                  mode: "build", agent: "build", path: { cwd: tmp.path, root: tmp.path }, cost: 0,
                  tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
                  modelID: ModelID.make("qwen-plus"), providerID: ProviderID.make("alibaba"),
                  time: { created: Date.now(), ...(completed ? { completed: Date.now() } : {}) },
                  finish: "stop",
                  ...(error ? { error: { name: "APIError" as const, data: { message: "model unavailable", statusCode: 503, isRetryable: true } } } : {}),
                }
                for (const delivery of finalDeliveries) yield* sessions.updateMessage({
                  ...assistantInfo, id: MessageID.ascending(), error: undefined,
                  time: { created: Date.now(), completed: Date.now() }, ...delivery,
                })
                const reasoning = yield* sessions.updateMessage({
                  ...assistantInfo, id: MessageID.ascending(), error: undefined,
                  modelID: ModelID.make("gpt-5.5"), time: { created: Date.now(), completed: Date.now() },
                })
                yield* sessions.updatePart({
                  id: PartID.ascending(), sessionID: session.id, messageID: reasoning.id,
                  type: "reasoning", text: "reasoned answer", time: { start: Date.now(), end: Date.now() },
                })
                const beforeDeliveries = (yield* sessions.messages({ sessionID: session.id, agentID: "main" }))
                  .filter((message) => message.info.role === "assistant")
                const currentUser = yield* sessions.updateMessage({ ...user, id: MessageID.ascending(), time: { created: Date.now() } })
                yield* sessions.updatePart({ id: PartID.ascending(), sessionID: session.id, messageID: currentUser.id,
                  type: "text", text: "Answer the next question." })
                const created = Date.now() + 1
                const assistant = yield* sessions.updateMessage({
                  ...assistantInfo, id: MessageID.ascending(), parentID: currentUser.id,
                  time: { created, ...(completed ? { completed: created } : {}) },
                })
                if (content) yield* sessions.updatePart({
                  id: PartID.ascending(), sessionID: session.id, messageID: assistant.id,
                  type: "text", text: "ordinary answer",
                })
                if (output === "placeholders") {
                  for (const placeholder of [
                    { text: " \n\t" },
                    { text: "synthetic placeholder", synthetic: true },
                    { text: "ignored placeholder", ignored: true },
                  ]) yield* sessions.updatePart({
                    id: PartID.ascending(), sessionID: session.id, messageID: assistant.id,
                    type: "text", ...placeholder,
                  })
                }
                let plan: { action: string; assistantMessageID?: string; parentMessageID?: string } | undefined
                ResumeTestHooks.onPlanResolved = (value) => { plan = value }
                const app = Server.Default().app
                const query = `?directory=${encodeURIComponent(tmp.path)}`
                const listed = yield* Effect.promise(() => Promise.resolve(app.request(`/session/${session.id}/recovery${query}`)))
                const candidates = yield* Effect.promise(() => listed.json())
                const resumed = yield* Effect.promise(() => Promise.resolve(app.request(`/session/${session.id}/resume${query}`, {
                  method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
                })))
                for (let attempt = 0; resumed.status === 202 && attempt < 100; attempt++) {
                  const messages = yield* sessions.messages({ sessionID: session.id, agentID: "main" })
                  if (messages.some((message) => message.info.role === "assistant" && message.info.time.completed && !message.info.error && message.parts.some((part) => part.type === "text" && part.text === "recovered answer"))) break
                  yield* Effect.sleep("50 millis")
                }
                const after = yield* sessions.messages({ sessionID: session.id, agentID: "main" })
                return {
                  recoveryStatus: listed.status, candidates, resumeStatus: resumed.status,
                  plan, providerCalls: stub.captures.length,
                  shellRemoved: !after.some((message) => message.info.id === assistant.id),
                  recovered: after.find((message) => message.info.role === "assistant" && message.info.time.completed && !message.info.error && message.parts.some((part) => part.type === "text" && part.text === "recovered answer")),
                  beforeDeliveries,
                  afterDeliveries: after.filter((message) => beforeDeliveries.some((before) => before.info.id === message.info.id)),
                  users: after.filter((message) => message.info.role === "user").map((message) => message.info.id),
                  userID: currentUser.id,
                  previousUserID: user.id,
                }
              })),
            })
            // FC-001: completion plus an error is settlement for delivered output, so
            // only an empty stop stays recoverable after completion.
            const shouldRecover = !content || (error && !completed)
            expect(result.users).toEqual([result.previousUserID, result.userID])
            expect(result.afterDeliveries).toEqual(result.beforeDeliveries)
            expect(result.recoveryStatus).toBe(200)
            expect(result.candidates.length).toBe(shouldRecover ? 1 : 0)
            expect(result.resumeStatus).toBe(shouldRecover ? 202 : 404)
            if (shouldRecover) {
              expect(result.plan?.action).toBe(content ? "tool-resume" : "user-resume")
              expect(result.recovered?.info).toMatchObject({ role: "assistant", parentID: result.userID })
              expect(result.providerCalls).toBe(1)
              // User-resume removes residue shells in its admission transaction; a
              // tool-resume target is settled and kept.
              expect(result.shellRemoved).toBe(!content)
            } else {
              expect(result.shellRemoved).toBe(false)
              expect(result.providerCalls).toBe(0)
            }
          } finally {
            ResumeTestHooks.onPlanResolved = undefined
            await Instance.disposeAll()
            await stub.stop()
          }
        }, 30_000)
      }
    }
  }
})

// [TP-SR-R21-08] model 参数校验:modelProviderID / modelID 必须同时提供。
// root: "cwd" — InstanceMiddleware only admits directories inside the server's
// working directory, so HTTP route fixtures opt into the cwd fixture root.
test("resume with only modelProviderID returns 400", async () => {
  await using tmp = await tmpdir({ git: true, root: "cwd" })
  const result = await Instance.provide({
    directory: tmp.path,
    fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "model-param" })
      const app = Server.Default().app
      const res = yield* Effect.promise(() =>
        Promise.resolve(app.request(`/session/${session.id}/turn/msg_test/resume?directory=${encodeURIComponent(tmp.path)}&modelProviderID=test`, { method: "POST" })),
      )
      return res.status
    })),
  })
  expect(result).toBe(400)
})

// An actor resumes on its frozen model identity, so the override is refused
// rather than silently ignored (FD-009).
test("resume with a model override for a non-main agent returns 400", async () => {
  await using tmp = await tmpdir({ git: true, root: "cwd" })
  const result = await Instance.provide({
    directory: tmp.path,
    fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "actor-model-override" })
      const app = Server.Default().app
      const query = `?directory=${encodeURIComponent(tmp.path)}&agentID=peer-1&modelProviderID=test&modelID=test-model`
      const res = yield* Effect.promise(() =>
        Promise.resolve(app.request(`/session/${session.id}/turn/${MessageID.ascending()}/resume${query}`, { method: "POST" })),
      )
      return { status: res.status, body: yield* Effect.promise(() => res.json()) }
    })),
  })
  expect(result.status).toBe(400)
  expect(JSON.stringify(result.body)).toContain("main-agent resume only")
})

// A model override that cannot be resolved must fail before the candidate is
// settled, otherwise the turn is abandoned with no successor and the user can
// no longer recover it.
test("an unresolvable model override leaves the turn recoverable", async () => {
  await using tmp = await tmpdir({ git: true, root: "cwd" })
  const result = await Instance.provide({
    directory: tmp.path,
    fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ title: "bad-model-override" })
      const user = yield* sessions.updateMessage({
        id: MessageID.ascending(),
        role: "user",
        sessionID: session.id,
        agent: "build",
        model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
        time: { created: Date.now() },
      })
      const assistant = yield* sessions.updateMessage({
        id: MessageID.ascending(),
        role: "assistant",
        parentID: user.id,
        sessionID: session.id,
        mode: "build",
        agent: "build",
        path: { cwd: tmp.path, root: tmp.path },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        modelID: ModelID.make("test-model"),
        providerID: ProviderID.make("test"),
        time: { created: Date.now() },
      })
      const app = Server.Default().app
      const query = `?directory=${encodeURIComponent(tmp.path)}`
      const resumed = yield* Effect.promise(() =>
        Promise.resolve(
          app.request(
            `/session/${session.id}/turn/${assistant.id}/resume${query}&modelProviderID=nope&modelID=nope`,
            { method: "POST" },
          ),
        ),
      )
      const listed = yield* Effect.promise(() => Promise.resolve(app.request(`/session/${session.id}/recovery${query}`)))
      const after = (yield* sessions.messages({ sessionID: session.id, agentID: "main" })).find(
        (item) => item.info.id === assistant.id,
      )?.info
      return {
        resumed: resumed.status,
        candidates: yield* Effect.promise(() => listed.json()),
        settled: !!after && ("completed" in after.time || (after.role === "assistant" && !!after.error)),
      }
    })),
  })
  expect(result.resumed).not.toBe(202)
  expect(result.candidates.length).toBe(1)
  // The decisive assertion: nothing was settled. The broadened predicate would
  // still list an abandoned turn, so candidate count alone proves nothing.
  expect(result.settled).toBe(false)
})

// [TP-SR-R21-17][D16f] Trailing user is a recovery target when it is the slice tail.
describe("trailing user recovery target", () => {
  test("last message is user → parent-user candidate", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const prompt = yield* SessionPrompt.Service
        const session = yield* sessions.create({ title: "trailing user" })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
          time: { created: Date.now() },
        })
        const candidates = yield* prompt.recovery({ sessionID: session.id, agentID: "main" })
        expect(candidates).toEqual([
          { kind: "parent-user", userMessageID: user.id, created: user.time.created },
        ])
      })),
    })
  })

  test("tool-calls assistant then trailing user → only parent-user (assistant disqualified)", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const prompt = yield* SessionPrompt.Service
        const session = yield* sessions.create({ title: "notify after tool-calls" })
        const user1 = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
          time: { created: Date.now() },
        })
        yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "assistant",
          parentID: user1.id,
          sessionID: session.id,
          mode: "build",
          agent: "build",
          path: { cwd: tmp.path, root: tmp.path },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          modelID: ModelID.make("test-model"),
          providerID: ProviderID.make("test"),
          time: { created: Date.now(), completed: Date.now() },
          finish: "tool-calls",
        } as Parameters<typeof sessions.updateMessage>[0])
        const user2 = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
          time: { created: Date.now() + 1 },
        })
        const candidates = yield* prompt.recovery({ sessionID: session.id, agentID: "main" })
        expect(candidates).toEqual([
          { kind: "parent-user", userMessageID: user2.id, created: user2.time.created },
        ])
      })),
    })
  })

  // [TP-SR-R21-02][closed-loop][R004] Clients may pass only sessionID; engine picks latest recovery candidate.
  // Asserts the *actual plan target* (via ResumeTestHooks.onPlanResolved) matches the recovery tail —
  // not just HTTP 202, and not a pre-route independent recovery() read.
  test("POST /resume with empty body resumes latest recovery candidate", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    const result = await Instance.provide({
      directory: tmp.path,
      fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const prompt = yield* SessionPrompt.Service
        // trailing user only → latest is parent-user
        const session = yield* sessions.create({ title: "empty-body user" })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
          time: { created: Date.now() },
        })
        // Capture the plan that /resume actually resolves (R004)
        let resolvedPlan: { action: string; assistantMessageID?: string; parentMessageID?: string } | undefined
        ResumeTestHooks.onPlanResolved = (plan) => { resolvedPlan = plan }
        // no recovery candidates → 404
        const empty = yield* sessions.create({ title: "empty-body none" })
        const app = Server.Default().app
        const query = `?directory=${encodeURIComponent(tmp.path)}`
        const ok = yield* Effect.promise(() =>
          Promise.resolve(app.request(`/session/${session.id}/resume${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })),
        )
        const none = yield* Effect.promise(() =>
          Promise.resolve(app.request(`/session/${empty.id}/resume${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })),
        )
        // also accept no body at all
        const noBody = yield* Effect.promise(() =>
          Promise.resolve(app.request(`/session/${session.id}/resume${query}`, {
            method: "POST",
          })),
        )
        return {
          ok: ok.status,
          none: none.status,
          noBody: noBody.status,
          planAction: resolvedPlan?.action,
          planParent: resolvedPlan?.parentMessageID,
          userParentId: user.id,
        }
      })),
    })
    // R004: the plan /resume actually resolved must target the trailing user (parent-user resume)
    expect(result.planAction).toBe("user-resume")
    expect(result.planParent).toBe(result.userParentId)
    expect(result.ok).toBe(202)
    expect(result.none).toBe(404)
    // second resume on already-busy session after first 202 → 409
    expect(result.noBody === 202 || result.noBody === 409).toBe(true)
  })

  // [TP-SR-R21-10] resumeUser 202=完成准入；缺失目标 404（非 false 202）。
  test("POST /resume with userMessageID validates trailing user", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    const result = await Instance.provide({
      directory: tmp.path,
      fn: async () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "resume user route" })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agent: "build",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
          time: { created: Date.now() },
        })
        const session2 = yield* sessions.create({ title: "resume user missing" })
        const app = Server.Default().app
        const query = `?directory=${encodeURIComponent(tmp.path)}`
        const ok = yield* Effect.promise(() =>
          Promise.resolve(app.request(`/session/${session.id}/resume${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userMessageID: user.id }),
          })),
        )
        // fresh session with no trailing user → 404 (not busy)
        const missing = yield* Effect.promise(() =>
          Promise.resolve(app.request(`/session/${session2.id}/resume${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userMessageID: MessageID.ascending() }),
          })),
        )
        return { ok: ok.status, missing: missing.status }
      })),
    })
    expect(result.ok).toBe(202)
    expect(result.missing).toBe(404)
  })

  // [TP-SR-R21-10][C001] admission 失败必须 404，不得 false 202（resumeUser 准入契约）。
  test("POST /resume returns 404 when admission re-check sees a later user (not false 202)", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    const result = await Instance.provide({
      directory: tmp.path,
      fn: async () =>
        AppRuntime.runPromise(
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const session = yield* sessions.create({ title: "c001-http-admission" })
            const user = yield* sessions.updateMessage({
              id: MessageID.ascending(),
              role: "user",
              sessionID: session.id,
              agent: "build",
              model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
              time: { created: Date.now() },
            })
            yield* sessions.updatePart({
              id: PartID.ascending(),
              messageID: user.id,
              sessionID: session.id,
              type: "text",
              text: "trailing",
            })
            let markReached!: () => void
            const reached = new Promise<void>((done) => {
              markReached = done
            })
            let release!: () => void
            const released = new Promise<void>((done) => {
              release = done
            })
            ResumeTestHooks.beforeAdmissionRecheck = () =>
              Effect.sync(() => markReached()).pipe(Effect.flatMap(() => Effect.promise(() => released)))
            const app = Server.Default().app
            const query = `?directory=${encodeURIComponent(tmp.path)}`
            const fiber = yield* Effect.promise(() =>
              Promise.resolve(
                app.request(`/session/${session.id}/resume${query}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userMessageID: user.id }),
                }),
              ),
            ).pipe(Effect.forkChild)
            yield* Effect.promise(() => reached)
            yield* sessions.updateMessage({
              id: MessageID.ascending(),
              role: "user",
              sessionID: session.id,
              agent: "build",
              model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") },
              time: { created: Date.now() + 5 },
            })
            release()
            const response = yield* Fiber.join(fiber)
            const body = (yield* Effect.promise(() => response.json())) as {
              data?: { name?: string; data?: { message?: string } }
            }
            ResumeTestHooks.reset()
            return { status: response.status, name: body?.data?.name, message: body?.data?.data?.message ?? "" }
          }),
        ),
    })
    expect(result.status).toBe(404)
    expect(result.name).toBe("NotFoundError")
    expect(result.message).toContain("Recovery candidate changed before settlement")
  })
})

// [R002] SDK contract: recovery union + resumeUser serialization
test("SDK recovery response is union and resumeUser posts body userMessageID", async () => {
  const calls: Array<{ url: string; method: string; body: unknown }> = []
  const fetchMock = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      const method = init?.method ?? (input instanceof Request ? input.method : "GET")
      let body: unknown = undefined
      const raw = init?.body ?? (input instanceof Request ? undefined : undefined)
      if (typeof raw === "string") body = JSON.parse(raw)
      else if (input instanceof Request && input.method !== "GET") {
        try { body = await input.clone().json() } catch { body = undefined }
      }
      calls.push({ url, method, body })
      if (url.includes("/recovery")) {
        return new Response(
          JSON.stringify([
            { kind: "assistant", assistantMessageID: "msg_a", parentMessageID: "msg_u", created: 1 },
            { kind: "parent-user", userMessageID: "msg_u2", created: 2 },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }
      return new Response(null, { status: 202 })
    },
    { preconnect: () => {} },
  )
  const client = createOpencodeClient({ baseUrl: "http://example.test", fetch: fetchMock })
  const listed = await client.session.recovery({ sessionID: "ses_test" })
  expect(listed.data).toEqual([
    { kind: "assistant", assistantMessageID: "msg_a", parentMessageID: "msg_u", created: 1 },
    { kind: "parent-user", userMessageID: "msg_u2", created: 2 },
  ])
  await client.session.resumeUser({ sessionID: "ses_test", userMessageID: "msg_u2", titleLocale: "fr-FR" })
  const resumeCall = calls.find((c) => c.url.includes("/session/ses_test/resume") && !c.url.includes("/recovery"))
  expect(resumeCall).toBeDefined()
  expect(resumeCall!.method).toBe("POST")
  expect(resumeCall!.body).toEqual({ userMessageID: "msg_u2" })
  expect(resumeCall!.url).toContain("titleLocale=fr-FR")
  // [TP-SR-R21-26]
  await client.session.resumeUser({ sessionID: "ses_test", assistantMessageID: "msg_a" })
  expect(calls.at(-1)?.body).toEqual({ assistantMessageID: "msg_a" })
  // [TP-SR-R21-30] Generated SDK must retain the host execution identity.
  const attempt = { requestId: "reviewed-resume", attemptId: "attempt-one" }
  await client.session.resumeUser({ sessionID: "ses_test", assistantMessageID: "msg_a", attempt })
  expect(calls.at(-1)?.body).toEqual({ assistantMessageID: "msg_a", attempt })
  await client.session.resumeUser({ sessionID: "ses_test", userMessageID: "msg_u2", attempt })
  expect(calls.at(-1)?.body).toEqual({ userMessageID: "msg_u2", attempt })
})

test("resumeUser rejects explicit actor trailing-user targeting without writing messages", async () => {
  await using tmp = await tmpdir({ git: true, root: "cwd" })
  await Instance.provide({ directory: tmp.path, fn: () => AppRuntime.runPromise(Effect.gen(function* () {
    const sessions = yield* Session.Service
    const session = yield* sessions.create({ title: "Actor trailing user boundary" })
    const user = yield* sessions.updateMessage({
      id: MessageID.ascending(), sessionID: session.id, agentID: "actor-example", role: "user", agent: "build",
      model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") }, time: { created: Date.now() },
    })
    const before = yield* sessions.messages({ sessionID: session.id, agentID: "*" })
    const response = yield* Effect.promise(() => Promise.resolve(Server.Default().app.request(
      `/session/${session.id}/resume?directory=${encodeURIComponent(tmp.path)}&agentID=actor-example`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userMessageID: user.id }) },
    )))
    expect(response.status).toBe(400)
    expect(yield* sessions.messages({ sessionID: session.id, agentID: "*" })).toEqual(before)
  })) })
})

// [TP-SR-R21-26] FC-001 admits HTTP resume through Runner ownership: the
// HTTP path has no pre-occupy seam and the session status map is not an
// admission authority, so the before-occupy, busy and occupied cases do not apply.
for (const shape of ["parent-user", "empty-assistant", "tool-assistant"] as const) {
  for (const window of ["before-http", "after-occupy"] as const) {
    for (const change of ["user", "assistant", "busy-idle"] as const) {
      test(`exact resume rejects ${shape} ${window} ${change} without history or cascade effects [TP-SR-R21-26]`, () =>
        exactResumeCase(shape, window, change), 15000)
    }
  }
  test(`exact resume admits unchanged ${shape} only after final check [TP-SR-R21-26]`, () =>
    exactResumeCase(shape, "after-occupy", "unchanged"), 15000)
  test(`exact resume cancellation preserves unadmitted ${shape} [TP-SR-R21-26]`, () =>
    exactResumeCase(shape, "after-occupy", "cancel"), 15000)
  test(`exact resume rejects both target fields for ${shape} [TP-SR-R21-26]`, () =>
    exactResumeCase(shape, "before-http", "both"), 15000)
  for (const window of ["before-http", "after-occupy"] as const) {
    for (const change of ["question", "permission"] as const) {
      test(`exact resume preserves pending ${change} for ${shape} ${window} [TP-SR-R21-26]`, () =>
        exactResumeCase(shape, window, change), 15000)
    }
  }
  if (shape !== "parent-user") {
    for (const change of ["qualified", "parent"] as const) {
      test(`exact resume rejects changed ${change} for ${shape} at admission [TP-SR-R21-26]`, () =>
        exactResumeCase(shape, "after-occupy", change), 15000)
    }
  }
}

async function exactResumeCase(
  shape: "parent-user" | "empty-assistant" | "tool-assistant",
  window: "before-http" | "before-occupy" | "after-occupy",
  change: "user" | "assistant" | "busy-idle" | "unchanged" | "cancel" | "busy" | "both" | "question" | "permission" | "qualified" | "parent" | "occupied",
) {
  await using tmp = await tmpdir({ git: true, root: "cwd" })
  const stub = startScriptedLLMServer([{ lines: textStopResponse("EXACT_A_RESUMED") }])
  const reached = Promise.withResolvers<void>()
  const released = Promise.withResolvers<void>()
  try {
    await Bun.write(`${tmp.path}/mimocode.json`, JSON.stringify({
      enabled_providers: ["alibaba"],
      provider: { alibaba: { options: { apiKey: "test-key", baseURL: `${stub.origin}/v1` } } },
      agent: { build: { model: "alibaba/qwen-plus" } },
    }))
    await Instance.provide({
      directory: tmp.path,
      fn: () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const prompt = yield* SessionPrompt.Service
        const status = yield* SessionStatus.Service
        const runs = yield* SessionRunState.Service
        const actors = yield* ActorRegistry.Service
        const questions = yield* Question.Service
        const permissions = yield* Permission.Service
        const session = yield* sessions.create({ title: "exact resume" })
        const model = { providerID: ProviderID.make("alibaba"), modelID: ModelID.make("qwen-plus") }
        const created = Date.now() - 100
        const user = (text: string, time: number, agentID = "main") => Effect.gen(function* () {
          const info = yield* sessions.updateMessage({
            id: MessageID.ascending(), role: "user", sessionID: session.id, agent: "build", agentID,
            model, time: { created: time },
          })
          yield* sessions.updatePart({ id: PartID.ascending(), sessionID: session.id, messageID: info.id, type: "text", text })
          return info
        })
        const assistant = (parentID: MessageID, time: number, agentID = "main") => sessions.updateMessage({
          id: MessageID.ascending(), role: "assistant", parentID, sessionID: session.id, agentID,
          mode: "build", agent: "build", path: { cwd: tmp.path, root: tmp.path }, cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          ...model, time: { created: time }, finish: "tool-calls",
        })
        const oldUser = yield* user("older task", created)
        const orphan = yield* assistant(oldUser.id, created + 1)
        yield* sessions.updatePart({
          id: PartID.ascending(), sessionID: session.id, messageID: orphan.id,
          type: "tool", tool: "bash", callID: "untouched-orphan",
          state: { status: "running", input: { command: "true" }, time: { start: created } },
        })
        const a = yield* user("APPROVED_A", created + 2)
        const target = shape === "parent-user" ? undefined : yield* assistant(a.id, created + 3)
        if (target && shape === "tool-assistant") yield* sessions.updatePart({
          id: PartID.ascending(), sessionID: session.id, messageID: target.id,
          type: "tool", tool: "bash", callID: "completed-once",
          state: { status: "completed", input: { command: "true" }, output: "COMPLETED_OBSERVATION_A",
            title: "completed", metadata: {}, time: { start: created, end: created + 1 } },
        })
        if (change !== "unchanged") {
          yield* actors.register({
            sessionID: session.id, actorID: "child-1", mode: "subagent", agent: "build",
            description: "untouched child", contextMode: "none", background: true, lifecycle: "ephemeral",
          })
          yield* actors.updateStatus(session.id, "child-1", { status: "idle", lastOutcome: "failure", lastError: "interrupted" })
          const child = yield* user("CHILD_MUST_NOT_RESUME", created + 4, "child-1")
          yield* assistant(child.id, created + 5, "child-1")
        }
        const beforeChild = yield* actors.get(session.id, "child-1")
        const mutate = Effect.gen(function* () {
          if (change === "occupied") yield* runs.startOwned(session.id, "main", Effect.interrupt, Effect.never)
          if (change === "busy-idle" && window !== "after-occupy") {
            yield* runs.ensureExclusive(session.id, "main", Effect.interrupt,
              user("UNAPPROVED_B", created + 10).pipe(Effect.as({ info: orphan, parts: [] })))
            expect((yield* status.get(session.id)).type).toBe("idle")
            return
          }
          if (change === "busy" || change === "busy-idle") yield* status.set(session.id, { type: "busy" })
          if (change === "user" || change === "busy-idle") yield* user("UNAPPROVED_B", created + 10)
          if (change === "assistant") {
            const b = yield* assistant(a.id, created + 10)
            yield* sessions.updatePart({
              id: PartID.ascending(), sessionID: session.id, messageID: b.id,
              type: "tool", tool: "bash", callID: "unapproved-b-tool",
              state: { status: "running", input: { command: "true" }, time: { start: created } },
            })
          }
          if (change === "busy-idle") yield* status.set(session.id, { type: "idle" })
          if (target && change === "parent") yield* sessions.updateMessage({ ...target, parentID: oldUser.id })
          if (target && change === "qualified") yield* sessions.updateMessage({
            ...target, finish: "stop", structured: { answer: "delivered" }, time: { ...target.time, completed: Date.now() },
          })
          if (change === "question") {
            yield* questions.ask({ sessionID: session.id, questions: [{ question: "Pending?", header: "Pending", options: [] }] }).pipe(Effect.forkChild)
            while ((yield* questions.list()).length === 0) yield* Effect.sleep("1 millis")
          }
          if (change === "permission") {
            yield* permissions.ask({ sessionID: session.id, permission: "bash", patterns: ["*"], always: [], metadata: {}, ruleset: [] }).pipe(Effect.forkChild)
            while ((yield* permissions.list()).length === 0) yield* Effect.sleep("1 millis")
          }
        })
        if (window === "before-http") yield* mutate
        if (window !== "before-http") {
          const hook = () => Effect.sync(() => reached.resolve()).pipe(Effect.andThen(Effect.promise(() => released.promise)))
          if (window === "before-occupy") ResumeTestHooks.beforeExclusiveOccupy = hook
          if (window === "after-occupy") ResumeTestHooks.beforeAdmissionRecheck = hook
        }
        const payload = change === "both"
          ? { userMessageID: a.id, assistantMessageID: target?.id ?? MessageID.ascending() }
          : target ? { assistantMessageID: target.id } : { userMessageID: a.id }
        const app = Server.Default().app
        const request = Promise.resolve(app.request(`/session/${session.id}/resume?directory=${encodeURIComponent(tmp.path)}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        }))
        if (window !== "before-http") {
          const first = yield* Effect.promise(() => Promise.race([
            reached.promise.then(() => "barrier" as const), request.then(() => "response" as const),
          ]))
          expect(first).toBe("barrier")
          yield* mutate
        }
        const before = yield* sessions.messages({ sessionID: session.id, agentID: "*" })
        if (change === "cancel") yield* prompt.cancel(session.id)
        released.resolve()
        const response = yield* Effect.promise(() => request)
        expect(response.status).toBe(change === "unchanged" ? 202 : change === "busy" || change === "occupied" || change === "question" || change === "permission" ? 409 : change === "both" ? 400 : 404)
        if (change === "unchanged") {
          for (let attempt = 0; attempt < 100; attempt++) {
            const messages = yield* sessions.messages({ sessionID: session.id })
            if (messages.some((message) => message.parts.some((part) => part.type === "text" && part.text === "EXACT_A_RESUMED"))) break
            yield* Effect.sleep("25 millis")
          }
          const after = yield* sessions.messages({ sessionID: session.id })
          const answer = after.find((message) => message.parts.some((part) => part.type === "text" && part.text === "EXACT_A_RESUMED"))
          expect(answer?.info).toMatchObject({ parentID: a.id })
          expect(after.filter((message) => message.info.role === "user").map((message) => message.info.id)).toEqual([oldUser.id, a.id])
          expect(stub.captures).toHaveLength(1)
          if (shape === "tool-assistant") {
            expect(JSON.stringify(stub.captures[0].messages)).toContain("COMPLETED_OBSERVATION_A")
            expect(after.flatMap((message) => message.parts).find((part) => part.type === "tool" && part.callID === "completed-once"))
              .toEqual(before.flatMap((message) => message.parts).find((part) => part.type === "tool" && part.callID === "completed-once"))
          }
        } else {
          expect(yield* sessions.messages({ sessionID: session.id, agentID: "*" })).toEqual(before)
          expect(yield* actors.get(session.id, "child-1")).toEqual(beforeChild)
          expect(stub.captures).toHaveLength(0)
          if (change === "question") expect(yield* questions.list()).toHaveLength(1)
          if (change === "permission") expect(yield* permissions.list()).toHaveLength(1)
        }
        yield* prompt.cancel(session.id)
      }).pipe(Effect.timeout("12 seconds"))),
    })
  } finally {
    released.resolve()
    ResumeTestHooks.reset()
    await stub.stop()
  }
}
