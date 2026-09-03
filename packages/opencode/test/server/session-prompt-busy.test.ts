import { afterEach, describe, expect, test } from "bun:test"
import { Deferred, Effect, Schedule } from "effect"
import { Hono } from "hono"
import { ErrorMiddleware } from "../../src/server/middleware"
import { Server } from "../../src/server/server"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { SessionRunState } from "../../src/session/run-state"
import { SessionCompaction } from "../../src/session/compaction"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Bus } from "../../src/bus"
import { Log } from "../../src/util"
import { tmpdir } from "../fixture/fixture"

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

describe("ErrorMiddleware → BusyError mapping", () => {
  test("BusyError maps to HTTP 409 Conflict", async () => {
    const app = new Hono()
    app.get("/throw-busy", () => {
      throw new Session.BusyError("ses_test_busy")
    })
    app.onError(ErrorMiddleware)

    const res = await app.request("/throw-busy")
    expect(res.status).toBe(409)
    const body = (await res.json()) as { name: string; data: { message: string } }
    expect(body.data.message).toContain("ses_test_busy")
  })
})

describe("POST /session/:sessionID/message busy-runner behavior", () => {
  test("returns 409 when session main runner is already busy", async () => {
    // root: "cwd" + git keep the fixture inside cwd with its own .git so the server
    // security middleware serves it (it rejects out-of-cwd dirs on unauthenticated
    // servers) while VCS detection stays scoped to the fixture, not this repo.
    await using tmp = await tmpdir({ git: true, root: "cwd" })

    const status = await Instance.provide({
      directory: tmp.path,
      fn: async () =>
        AppRuntime.runPromise(
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const sess = yield* sessions.create({ title: "busy-runner test" })
            const state = yield* SessionRunState.Service

            // Occupy the main runner with an Effect that never resolves.
            // Forked so we can continue and issue the conflicting POST.
            yield* state
              .startShell(
                sess.id,
                Effect.succeed({ info: {}, parts: [] } as never),
                Effect.never as never,
              )
              .pipe(Effect.forkChild)

            // Give the scheduler a tick so the occupant marks the runner busy.
            yield* Effect.sleep("50 millis")

            // Pass ?directory= so InstanceMiddleware resolves to the same instance
            // the test created. Without this, the route handler would land in a
            // different Instance (process.cwd()) whose SessionRunState has no busy
            // runner, defeating the test.
            const app = Server.Default().app
            const res = yield* Effect.promise(async () =>
              app.request(`/session/${sess.id}/message?directory=${encodeURIComponent(tmp.path)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  parts: [{ type: "text", text: "should be rejected" }],
                }),
              }),
            )

            // Best-effort: stop the occupant so afterEach disposal is clean.
            yield* state.cancel(sess.id)

            return res.status
          }),
        ),
    })

    expect(status).toBe(409)
  })

  test("POST /:sessionID/abort frees runner; subsequent POST is no longer rejected with 409", async () => {
    // root: "cwd" + git keep the fixture inside cwd with its own .git so the server
    // security middleware serves it (it rejects out-of-cwd dirs on unauthenticated
    // servers) while VCS detection stays scoped to the fixture, not this repo.
    await using tmp = await tmpdir({ git: true, root: "cwd" })

    const result = await Instance.provide({
      directory: tmp.path,
      fn: async () =>
        AppRuntime.runPromise(
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const sess = yield* sessions.create({ title: "busy-recover test" })
            const state = yield* SessionRunState.Service

            yield* state
              .startShell(
                sess.id,
                Effect.succeed({ info: {}, parts: [] } as never),
                Effect.never as never,
              )
              .pipe(Effect.forkChild)
            yield* Effect.sleep("50 millis")

            const app = Server.Default().app
            const dirQuery = `?directory=${encodeURIComponent(tmp.path)}`

            // 1. confirm busy → 409
            const first = yield* Effect.promise(async () =>
              app.request(`/session/${sess.id}/message${dirQuery}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parts: [{ type: "text", text: "first" }] }),
              }),
            )

            // 2. abort frees the runner
            const abort = yield* Effect.promise(async () =>
              app.request(`/session/${sess.id}/abort${dirQuery}`, { method: "POST" }),
            )

            // Wait for runner.cancel to take effect.
            yield* Effect.sleep("100 millis")

            // 3. subsequent POST is no longer 409 — assert just status != 409.
            //    (full success requires a real LLM; we only verify the contention
            //    is gone, not the prompt outcome.)
            const second = yield* Effect.promise(async () =>
              app.request(`/session/${sess.id}/message${dirQuery}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parts: [{ type: "text", text: "second" }] }),
              }),
            )
            return { firstStatus: first.status, abortStatus: abort.status, secondStatus: second.status }
          }),
        ),
    })

    expect(result.firstStatus).toBe(409)
    expect(result.abortStatus).toBe(200)
    expect(result.secondStatus).not.toBe(409)
  })
})

describe("POST /session/:sessionID/summarize busy-runner behavior", () => {
  test("returns 409 before writing a compaction boundary", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })

    const result = await Instance.provide({
      directory: tmp.path,
      fn: async () =>
        AppRuntime.runPromise(
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const session = yield* sessions.create({ title: "summarize admission test" })
            const state = yield* SessionRunState.Service
            const bus = yield* Bus.Service
            const started = yield* Deferred.make<void>()
            const owner = yield* state.startRunning(
              session.id,
              "main",
              Effect.interrupt,
              Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)),
            )
            yield* Deferred.await(started)
            let resolveCompacted!: () => void
            const compacted = new Promise<void>((resolve) => {
              resolveCompacted = resolve
            })
            const unsubscribe = yield* bus.subscribeCallback(SessionCompaction.Event.Compacted, (event) => {
              if (event.properties.sessionID === session.id) resolveCompacted()
            })
            const request = Promise.resolve(
              Server.Default().app.request(
                `/session/${session.id}/summarize?directory=${encodeURIComponent(tmp.path)}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ providerID: "test", modelID: "test-model", auto: false }),
                },
              ),
            )
            const first = yield* Effect.promise(() =>
              Promise.race([
                request.then((response) => ({ type: "response" as const, response })),
                compacted.then(() => ({ type: "compacted" as const })),
              ]),
            )

            yield* state.cancel(session.id)
            yield* owner.pipe(Effect.exit)
            const response = first.type === "response" ? first.response : yield* Effect.promise(() => request)
            unsubscribe()
            const messages = yield* sessions.messages({ sessionID: session.id, agentID: "main" })

            return {
              first: first.type,
              status: response.status,
              hasCompaction: messages.some((message) => message.parts.some((part) => part.type === "compaction")),
            }
          }),
        ),
    })

    expect(result).toEqual({ first: "response", status: 409, hasCompaction: false })
  })
})

describe("POST /session/:sessionID/prompt_async busy-runner behavior", () => {
  // prompt_async is fire-and-forget: the route answers 204 before the turn runs,
  // so no HTTP client can hang behind a zombie runner and the busy pre-check the
  // synchronous /message route needs does not apply here. Its contract is the
  // TUI's queue instead — the user message must land in storage even while a
  // turn is in flight, so an eligible loop boundary can consume it and the
  // transcript can render it as QUEUED. Admitting it through startRunning made
  // the whole promptWork (createUserMessage included) conditional on an idle
  // runner, which dropped the message with no trace.
  test("queues exactly one message instead of rejecting it while a turn is in flight", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })

    const result = await Instance.provide({
      directory: tmp.path,
      fn: () =>
        AppRuntime.runPromise(
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const session = yield* sessions.create({ title: "prompt_async queue test" })
            const state = yield* SessionRunState.Service
            const started = yield* Deferred.make<void>()
            const owner = yield* state.startRunning(
              session.id,
              "main",
              Effect.interrupt,
              Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)),
            )
            yield* Deferred.await(started)

            return yield* Effect.gen(function* () {
              const response = yield* Effect.promise(async () =>
                Server.Default().app.request(
                  `/session/${session.id}/prompt_async?directory=${encodeURIComponent(tmp.path)}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ parts: [{ type: "text", text: "queued while busy" }] }),
                  },
                ),
              )

              // The route returns before promptWork persists, so poll rather than
              // sleep a fixed budget.
              const texts = yield* Effect.gen(function* () {
                const messages = yield* sessions.messages({ sessionID: session.id, agentID: "*" })
                return messages
                  .filter((message) => message.info.role === "user")
                  .flatMap((message) =>
                    message.parts.filter((part) => part.type === "text").map((part) => part.text),
                  )
              }).pipe(
                Effect.repeat({ until: (users) => users.length > 0, schedule: Schedule.spaced("20 millis") }),
                Effect.timeout("3 seconds"),
                Effect.orElseSucceed(() => [] as string[]),
              )

              return { status: response.status, texts }
            }).pipe(
              Effect.ensuring(state.cancel(session.id).pipe(Effect.andThen(owner.pipe(Effect.exit)))),
            )
          }),
        ),
    })

    expect(result).toEqual({ status: 204, texts: ["queued while busy"] })
  })
})
