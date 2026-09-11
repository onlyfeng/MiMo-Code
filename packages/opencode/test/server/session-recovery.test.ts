import { afterEach, describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { createOpencodeClient } from "@mimo-ai/sdk/v2"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { MessageID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Log } from "../../src/util"
import { Bus } from "../../src/bus"
import { tmpdir } from "../fixture/fixture"

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
        const candidates: unknown = yield* Effect.promise(() => listed.json())
        const missing = yield* Effect.promise(() =>
          Promise.resolve(app.request(`/session/${session.id}/turn/${MessageID.ascending()}/resume${resumeQuery}`, { method: "POST" })),
        )
        const resumed = yield* Effect.promise(() => Promise.resolve(app.request(`/session/${session.id}/turn/${assistant.id}/resume${resumeQuery}`, { method: "POST" })))
        yield* Effect.promise(() =>
          Promise.race([errorSeen, new Promise((resolve) => setTimeout(resolve, 10_000))]),
        )
        unsubscribe()
        const after = yield* sessions.messages({ sessionID: session.id, agentID: "main" })
        const abandoned = after.find((item) => item.info.id === assistant.id)?.info
        const abandonedAssistant = abandoned?.role === "assistant" ? abandoned : undefined
        return { listed: listed.status, candidates, resumed: resumed.status, missing: missing.status, userID: user.id, errors, abandoned: abandonedAssistant }
      })),
    })

    expect(result.listed).toBe(200)
    expect(result.candidates).toEqual([{ assistantMessageID: expect.any(String), parentMessageID: result.userID, created: expect.any(Number) }])
    expect(result.resumed).toBe(202)
    expect(result.missing).toBe(404)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.abandoned?.time.completed).toEqual(expect.any(Number))
    expect(result.abandoned?.error?.data.message).toContain("Abandoned")
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

// [TP-SR-R21-07] 恢复判据:completed+tool-calls / completed+length / 无 completed 均为候选;
// completed+stop / completed+other 不进候选。
describe("recovery candidate predicate", () => {
  async function setupAssistant(overrides: Partial<{ finish: string; completed: boolean; error: boolean }>) {
    await using tmp = await tmpdir({ git: true })
    return Instance.provide({
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
        } as Parameters<typeof sessions.updateMessage>[0])
        const candidates = yield* SessionPrompt.Service.use((svc) =>
          svc.recovery({ sessionID: session.id, agentID: "main" }),
        )
        return { candidates, assistantId: assistant.id }
      })),
    })
  }

  test("completed + tool-calls → candidate", async () => {
    const result = await setupAssistant({ completed: true, finish: "tool-calls" })
    expect(result.candidates.length).toBe(1)
    expect(result.candidates[0]!.assistantMessageID).toBe(result.assistantId)
  })

  test("completed + length → candidate", async () => {
    const result = await setupAssistant({ completed: true, finish: "length" })
    expect(result.candidates.length).toBe(1)
  })

  test("no completed → candidate", async () => {
    const result = await setupAssistant({ completed: false })
    expect(result.candidates.length).toBe(1)
  })

  test("completed + stop → NOT candidate", async () => {
    const result = await setupAssistant({ completed: true, finish: "stop" })
    expect(result.candidates.length).toBe(0)
  })

  test("completed + other → NOT candidate", async () => {
    const result = await setupAssistant({ completed: true, finish: "other" })
    expect(result.candidates.length).toBe(0)
  })

  // [Finding #1 回归] finish=stop 但有 error:processor 因 error 不写 completed → 可恢复。
  test("finish=stop + error → candidate (error means not completed)", async () => {
    const result = await setupAssistant({ completed: false, finish: "stop", error: true })
    expect(result.candidates.length).toBe(1)
  })

  // error + 无 completed:任何 finish 都是候选(有 error = 没完成)。
  test("error + no completed → candidate", async () => {
    const result = await setupAssistant({ completed: false, error: true })
    expect(result.candidates.length).toBe(1)
  })
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
