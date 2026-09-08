import { afterEach, expect, test } from "bun:test"
import { Deferred, Effect, Schedule } from "effect"
import { createOpencodeClient } from "@mimo-ai/sdk/v2"
import { eq } from "drizzle-orm"
import { Database } from "../../src/storage"
import { SessionTable } from "../../src/session/session.sql"
import { Actor } from "../../src/actor/spawn"
import { ActorRegistry } from "../../src/actor/registry"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instance } from "../../src/project/instance"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Server } from "../../src/server/server"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { MessageID } from "../../src/session/schema"
import { prefixCaptureRef } from "../../src/session/prefix-capture-ref"
import { TaskRegistry } from "../../src/task/registry"
import { Log } from "../../src/util"
import { ToolRegistry } from "../../src/tool"
import { shellWrap } from "../../src/tool/shell-wrap"
import { ToolScriptTool } from "../../src/tool/tool-script"
import type * as Tool from "../../src/tool/tool"
import { tmpdir } from "../fixture/fixture"
import { textStopResponse, type LLMCapture } from "../lib/scripted-llm-server"

void Log.init({ print: false })

afterEach(() => Instance.disposeAll())

const model = { providerID: ProviderID.make("alibaba"), modelID: ModelID.make("qwen-plus") }
const taskText = "Resume exactly this delegated HTTP recovery task."
const frozenTurnContext = "http-recovery-frozen-system: 冻结上下文 👩‍💻 cafe\u0301"
const liveTurnContext = "http-recovery-live-context-must-not-replace-frozen"

function prepareActor(
  options: {
    mode?: "peer"
    cwd?: string
    parentActorID?: string
    controller?: boolean
    bound?: boolean
    systemMode?: "append" | "replace-agent"
  } = {},
) {
  return AppRuntime.runPromise(
    Effect.gen(function* () {
      const actor = yield* Actor.Service
      const sessions = yield* Session.Service
      const registry = yield* ActorRegistry.Service
      const prompt = yield* SessionPrompt.Service
      const origin = yield* sessions.create({ title: "HTTP actor recovery" })
      const controller = options.controller
        ? yield* actor.spawn({
            mode: "peer",
            sessionID: origin.id,
            parentActorID: "main",
            agentType: "build",
            task: "Coordinate the registered child actor.",
            context: "none",
            lifecycle: "persistent",
            background: false,
            tools: [],
            model,
          })
        : undefined
      if (controller) expect((yield* Deferred.await(controller.outcome)).status).toBe("success")
      const parent = controller ? yield* sessions.get(controller.sessionID) : origin
      yield* prompt.prompt({
        sessionID: parent.id,
        agent: "build",
        model,
        noReply: true,
        system: frozenTurnContext,
        systemMode: options.systemMode ?? "replace-agent",
        parts: [{ type: "text", text: "Original parent history for HTTP recovery." }],
      })
      const capture = prefixCaptureRef.current
      if (!capture) return yield* Effect.die("Missing actual prefix captor")
      const messages = yield* sessions.messages({ sessionID: parent.id })
      const frozen = {
        ...(yield* capture({ sessionID: parent.id, agentName: "build", ...model, msgs: messages })),
        watermarkMsgID: messages.at(-1)!.info.id,
        model,
      }
      const tasks = yield* TaskRegistry.Service
      const task = yield* tasks.create({ session_id: parent.id, summary: taskText })
      const spawned = yield* actor.spawn({
        mode: options.mode ?? "subagent",
        cwd: options.cwd,
        sessionID: parent.id,
        parentActorID: controller?.actorID ?? options.parentActorID ?? "main",
        agentType: "explore",
        task: taskText,
        task_id: options.bound === false ? undefined : task.id,
        context: "full",
        lifecycle: "persistent",
        tools: [],
        background: false,
        model,
        forkContext: frozen,
      })
      expect((yield* Deferred.await(spawned.outcome)).status).toBe("failure")
      expect(yield* actor.getForkContext(spawned.sessionID, spawned.actorID)).toBe(frozen)
      const before = yield* sessions.messages({ sessionID: spawned.sessionID, agentID: spawned.actorID })
      const interrupted = before.findLast((message) => message.info.role === "assistant")!
      expect(interrupted.info.role === "assistant" && interrupted.info.time.completed).toBeUndefined()
      return { actor, sessions, registry, parent, spawned, frozen, task, tasks, before, interrupted, controller }
    }),
  )
}

async function withActor(
  run: (
    fixture: Awaited<ReturnType<typeof prepareActor>> & {
      directory: string
      receiver: string
      client: ReturnType<typeof createOpencodeClient>
      requests: LLMCapture[]
      resumeURLs: URL[]
      release: () => void
      request: (path: string, init?: RequestInit) => Promise<Response>
    },
  ) => Promise<void>,
  options: {
    mode?: "peer"
    isolated?: boolean
    parentActorID?: string
    controller?: boolean
    bound?: boolean
    systemMode?: "append" | "replace-agent"
  } = {},
) {
  const requests: LLMCapture[] = []
  const gate = Promise.withResolvers<void>()
  const provider = Bun.serve({
    port: 0,
    async fetch(request) {
      const body = (await request.json()) as LLMCapture
      const child = body.messages.some(
        (message) => message.role === "user" && JSON.stringify(message.content).includes(taskText),
      )
      if (child) {
        requests.push(body)
        if (requests.length === 1)
          return Response.json({ error: { message: "interrupted HTTP actor fixture" } }, { status: 400 })
        await gate.promise
      }
      return new Response(
        textStopResponse(child ? "Recovered HTTP actor result." : "Parent notification acknowledged.").join(""),
        {
          headers: { "content-type": "text/event-stream" },
        },
      )
    },
  })
  const config = {
    enabled_providers: ["alibaba"],
    model: "alibaba/qwen-plus",
    dream: { auto: false },
    distill: { auto: false },
    provider: { alibaba: { options: { apiKey: "test-only", baseURL: `${provider.url}v1` } } },
  }
  await using directory = await tmpdir({ git: true, root: "cwd", config })
  await using receiver = options.isolated ? await tmpdir({ git: true, root: "cwd", config }) : undefined
  const resumeURLs: URL[] = []
  const app = Server.Default().app
  const http = Bun.serve({
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      if (request.method === "POST" && url.pathname.endsWith("/resume")) resumeURLs.push(url)
      return app.fetch(request)
    },
  })
  try {
    await Instance.provide({
      directory: directory.path,
      fn: async () => {
        const fixture = await prepareActor({ ...options, cwd: receiver?.path })
        try {
          await run({
            ...fixture,
            directory: directory.path,
            receiver: receiver?.path ?? directory.path,
            client: createOpencodeClient({ baseUrl: http.url.toString(), directory: directory.path }),
            requests,
            resumeURLs,
            release: () => gate.resolve(),
            request: (path, init) => {
              const url = new URL(path, http.url)
              if (!url.searchParams.has("directory")) url.searchParams.set("directory", directory.path)
              return fetch(url, init)
            },
          })
        } finally {
          gate.resolve()
          await AppRuntime.runPromise(
            fixture.actor.cancel(fixture.spawned.sessionID, fixture.spawned.actorID, "forced"),
          )
          if (fixture.controller)
            await AppRuntime.runPromise(
              fixture.actor.cancel(fixture.controller.sessionID, fixture.controller.actorID, "forced"),
            )
        }
      },
    })
  } finally {
    gate.resolve()
    await http.stop(true)
    await provider.stop(true)
  }
}

for (const mode of ["subagent", "peer", "isolated peer", "peer with appended turn context"] as const) {
  test(`HTTP actor recovery lists and atomically resumes the exact retained ${mode} candidate`, async () => {
    await withActor(
      async (fixture) => {
        const base = `/session/${fixture.parent.id}`
        const selector = `agentID=${encodeURIComponent(fixture.spawned.actorID)}`
        const original = structuredClone(fixture.before)
        expect(fixture.frozen.turnContext).toBe(frozenTurnContext)
        // Change the persisted live context after capture and interruption. The
        // HTTP path must reuse the actor's frozen turn, including for a peer
        // with a separate session, without borrowing either live session value.
        for (const sessionID of new Set([fixture.parent.id, fixture.spawned.sessionID])) {
          const prompt = await AppRuntime.runPromise(fixture.sessions.resolvePrompt({ sessionID }))
          Database.use((db) =>
            db
              .update(SessionTable)
              .set({ prompt: { ...prompt, system: `${liveTurnContext}:${sessionID}` } })
              .where(eq(SessionTable.id, sessionID))
              .run(),
          )
          expect((await AppRuntime.runPromise(fixture.sessions.resolvePrompt({ sessionID }))).system).toBe(
            `${liveTurnContext}:${sessionID}`,
          )
        }
        const listed = await fixture.client.session.recovery({
          sessionID: fixture.parent.id,
          agentID: fixture.spawned.actorID,
        })
        expect(listed.response.status).toBe(200)
        expect(listed.data).toEqual([
          {
            assistantMessageID: fixture.interrupted.info.id,
            parentMessageID: fixture.before.find((message) => message.info.role === "user")!.info.id,
            created: fixture.interrupted.info.time.created,
          },
        ])
        const withoutSelector = await fixture.request(`${base}/recovery`)
        expect(await withoutSelector.json()).toEqual([])
        const missing = await fixture.request(`${base}/turn/${MessageID.ascending()}/resume?${selector}`, {
          method: "POST",
        })
        expect(missing.status).toBe(404)
        expect(
          await AppRuntime.runPromise(
            fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
          ),
        ).toEqual(original)
        if (mode !== "subagent") {
          const stranger = await AppRuntime.runPromise(fixture.sessions.create({ title: "Unrelated HTTP controller" }))
          const listed = await fixture.request(`/session/${stranger.id}/recovery?${selector}`)
          expect(listed.status).toBe(404)
          const resumed = await fixture.request(
            `/session/${stranger.id}/turn/${fixture.interrupted.info.id}/resume?${selector}`,
            { method: "POST" },
          )
          expect(resumed.status).toBe(404)
          if (mode === "isolated peer") {
            const wrongDirectory = await fixture.request(`/session/${fixture.spawned.sessionID}/recovery?${selector}`)
            expect(wrongDirectory.status).toBe(404)
          }
          const self = await fixture.request(
            `/session/${fixture.spawned.sessionID}/recovery?${selector}&directory=${encodeURIComponent(fixture.receiver)}`,
          )
          expect(self.status).toBe(200)
          expect(await self.json()).toEqual([
            {
              assistantMessageID: fixture.interrupted.info.id,
              parentMessageID: original[0].info.id,
              created: fixture.interrupted.info.time.created,
            },
          ])
        }
        try {
          const url = `${base}/turn/${fixture.interrupted.info.id}/resume?${selector}`
          const results = await Promise.all([
            fixture.client.session
              .resume({
                sessionID: fixture.parent.id,
                assistantMessageID: fixture.interrupted.info.id,
                agentID: fixture.spawned.actorID,
              })
              .then((result) => result.response),
            fixture.request(
              mode === "subagent"
                ? url
                : `/session/${fixture.spawned.sessionID}/turn/${fixture.interrupted.info.id}/resume?${selector}&directory=${encodeURIComponent(fixture.receiver)}`,
              { method: "POST" },
            ),
          ])
          expect(results.map((response) => response.status).sort()).toEqual([202, 409])
          const admitted = await AppRuntime.runPromise(
            fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
          )
          const settled = admitted.find((message) => message.info.id === fixture.interrupted.info.id)!.info
          expect(settled.role === "assistant" && settled.time.completed).toBeNumber()
          const busy = await fixture.request(`${base}/recovery?${selector}`)
          expect(await busy.json()).toEqual([])
          fixture.release()
          await AppRuntime.runPromise(
            fixture.registry.get(fixture.spawned.sessionID, fixture.spawned.actorID).pipe(
              Effect.repeat({
                until: (actor) => actor?.status === "idle" && actor.lastOutcome === "success",
                schedule: Schedule.spaced("20 millis"),
              }),
              Effect.timeout("10 seconds"),
            ),
          )
          const after = await AppRuntime.runPromise(
            fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
          )
          expect(after.filter((message) => message.info.role === "user")).toEqual(
            original.filter((message) => message.info.role === "user"),
          )
          expect(after.at(-1)?.info).toMatchObject({
            role: "assistant",
            parentID: original[0].info.id,
            path: { cwd: fixture.receiver },
          })
          expect(
            after.at(-1)?.parts.some((part) => part.type === "text" && part.text === "Recovered HTTP actor result."),
          ).toBe(true)
          expect(original[0].info).toMatchObject({ task_id: fixture.task.id })
          expect(fixture.requests).toHaveLength(2)
          expect(fixture.requests[1].messages.filter((message) => message.role === "system")).toEqual(
            fixture.requests[0].messages.filter((message) => message.role === "system"),
          )
          for (const request of fixture.requests) {
            expect(JSON.stringify(request.messages).split(frozenTurnContext)).toHaveLength(2)
            expect(JSON.stringify(request.messages)).not.toContain(liveTurnContext)
            // Append mode keeps the original bytes in one user reminder;
            // replace-agent mode keeps them in the frozen system only.
            expect(
              JSON.stringify(request.messages.filter((message) => message.role === "user")).split(frozenTurnContext),
            ).toHaveLength(mode === "peer with appended turn context" ? 2 : 1)
          }
          expect(fixture.frozen.turnContext).toBe(frozenTurnContext)
          expect(
            await AppRuntime.runPromise(
              fixture.actor.getForkContext(fixture.spawned.sessionID, fixture.spawned.actorID),
            ),
          ).toBe(fixture.frozen)
        } finally {
          fixture.release()
        }
      },
      mode === "subagent"
        ? {}
        : {
            mode: "peer",
            isolated: mode === "isolated peer",
            systemMode: mode === "peer with appended turn context" ? "append" : "replace-agent",
          },
    )
  }, 30_000)
}

test("HTTP actor recovery rejects task overrides and released context without changing the candidate", async () => {
  await withActor(async (fixture) => {
    const base = `/session/${fixture.parent.id}`
    const selector = `agentID=${encodeURIComponent(fixture.spawned.actorID)}`
    for (const path of [
      `${base}/recovery?${selector}&task_id=${fixture.task.id}`,
      `${base}/recovery?${selector}&task_id=other`,
      `${base}/turn/${fixture.interrupted.info.id}/resume?${selector}&task_id=other`,
    ]) {
      const response = await fixture.request(path, path.includes("/resume?") ? { method: "POST" } : undefined)
      expect(response.status).toBe(400)
    }
    expect(
      await AppRuntime.runPromise(
        fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
      ),
    ).toEqual(fixture.before)
    await AppRuntime.runPromise(fixture.actor.cancel(fixture.spawned.sessionID, fixture.spawned.actorID, "forced"))
    const cancelled = await AppRuntime.runPromise(
      fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
    )
    const listed = await fixture.request(`${base}/recovery?${selector}`)
    expect({ status: listed.status, body: await listed.text() }).toMatchObject({ status: 404 })
    const resumed = await fixture.request(`${base}/turn/${fixture.interrupted.info.id}/resume?${selector}`, {
      method: "POST",
    })
    expect(resumed.status).toBe(404)
    expect(
      await AppRuntime.runPromise(
        fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
      ),
    ).toEqual(cancelled)
    expect(fixture.requests).toHaveLength(1)
  })
}, 30_000)

test("HTTP actor recovery validates the original task and rejects a different binding before admission", async () => {
  await withActor(async (fixture) => {
    const tasks = fixture.tasks
    const other = await AppRuntime.runPromise(
      tasks.create({ session_id: fixture.parent.id, summary: "Different task" }),
    )
    const beforeTasks = await AppRuntime.runPromise(tasks.list({ session_id: fixture.parent.id }))
    const url = `/session/${fixture.parent.id}/turn/${fixture.interrupted.info.id}/resume?agentID=${encodeURIComponent(fixture.spawned.actorID)}`
    for (const task_id of [other.id, "T999"]) {
      const response = await fixture.request(`${url}&task_id=${task_id}`, { method: "POST" })
      expect(response.status).toBe(409)
      expect(await response.json()).toMatchObject({
        data: { message: "Recovery task conflicts with the original user task" },
      })
      expect(
        await AppRuntime.runPromise(
          fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
        ),
      ).toEqual(fixture.before)
      expect(await AppRuntime.runPromise(tasks.list({ session_id: fixture.parent.id }))).toEqual(beforeTasks)
      expect(fixture.requests).toHaveLength(1)
    }
    const response = await fixture.client.session.resume({
      sessionID: fixture.parent.id,
      assistantMessageID: fixture.interrupted.info.id,
      agentID: fixture.spawned.actorID,
      task_id: fixture.task.id,
      directory: fixture.directory,
      titleLocale: "zh-CN",
    })
    expect(response.response.status).toBe(202)
    const acceptedURL = fixture.resumeURLs.at(-1)!
    expect(acceptedURL.pathname).toBe(`/session/${fixture.parent.id}/turn/${fixture.interrupted.info.id}/resume`)
    for (const [key, value] of Object.entries({
      task_id: fixture.task.id,
      agentID: fixture.spawned.actorID,
      directory: fixture.directory,
      titleLocale: "zh-CN",
    }))
      expect(acceptedURL.searchParams.getAll(key)).toEqual([value])
    fixture.release()
    await AppRuntime.runPromise(
      fixture.registry.get(fixture.spawned.sessionID, fixture.spawned.actorID).pipe(
        Effect.repeat({
          until: (actor) => actor?.status === "idle" && actor.lastOutcome === "success",
          schedule: Schedule.spaced("20 millis"),
        }),
        Effect.timeout("10 seconds"),
      ),
    )
    const after = await AppRuntime.runPromise(
      fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
    )
    expect(after.filter((message) => message.info.role === "user")).toEqual(
      fixture.before.filter((message) => message.info.role === "user"),
    )
    expect(fixture.requests).toHaveLength(2)
  })
}, 30_000)

for (const style of ["json", "shell", "nested shell"] as const) {
  test(`actor recovery binds an unbound retained user through the real ${style} tool entry`, async () => {
    await withActor(
      async (fixture) => {
        const original = fixture.before.find((message) => message.info.role === "user")!
        if (original.info.role !== "user") throw new Error("Expected original actor user")
        expect(original.info).not.toHaveProperty("task_id")
        const result = await AppRuntime.runPromise(
          Effect.gen(function* () {
            const native = (yield* (yield* ToolRegistry.Service).named()).actor
            const context: Tool.Context = {
              sessionID: fixture.parent.id,
              messageID: MessageID.ascending(),
              agent: "build",
              actorID: "main",
              abort: new AbortController().signal,
              callID: `recovery-task-${style}`,
              messages: [],
              metadata: () => Effect.void,
              ask: () => Effect.void,
            }
            if (style === "json")
              return yield* native.execute(
                { operation: { action: "resume", actor_id: fixture.spawned.actorID, task_id: fixture.task.id } },
                context,
              )
            const actor = shellWrap(native)
            if (style === "shell")
              return yield* actor.execute(
                { script: `actor resume ${fixture.spawned.actorID} --task ${fixture.task.id}` },
                context,
              )
            const exec = yield* (yield* ToolScriptTool).init()
            return yield* exec.execute(
              {
                code: `return await tools.actor(${JSON.stringify({ operation: { action: "resume", actor_id: fixture.spawned.actorID, task_id: fixture.task.id } })})`,
              },
              {
                ...context,
                extra: { execTools: { current: [actor] } },
              },
            )
          }),
        )
        expect(result.output).toContain("running")
        const admitted = await AppRuntime.runPromise(
          fixture.sessions
            .messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID })
            .pipe(Effect.map((messages) => messages.find((message) => message.info.id === original.info.id)!)),
        )
        if (admitted.info.role !== "user") throw new Error("Expected admitted actor user")
        expect(admitted.info).toEqual({ ...original.info, task_id: fixture.task.id })
        fixture.release()
        await AppRuntime.runPromise(
          fixture.registry.get(fixture.spawned.sessionID, fixture.spawned.actorID).pipe(
            Effect.repeat({
              until: (actor) => actor?.status === "idle" && actor.lastOutcome === "success",
              schedule: Schedule.spaced("20 millis"),
            }),
            Effect.timeout("10 seconds"),
          ),
        )
        const after = await AppRuntime.runPromise(
          fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
        )
        expect(after.filter((message) => message.info.role === "user").map((message) => message.info.id)).toEqual([
          original.info.id,
        ])
        expect(
          after.at(-1)?.parts.some((part) => part.type === "text" && part.text === "Recovered HTTP actor result."),
        ).toBe(true)
        expect(fixture.requests).toHaveLength(2)
        expect(fixture.requests[1].messages.filter((message) => message.role === "system")).toEqual(
          fixture.requests[0].messages.filter((message) => message.role === "system"),
        )
      },
      { bound: false },
    )
  }, 30_000)
}

test("HTTP peer self recovery binds a task in its retained parent namespace rather than its own same-named task", async () => {
  await withActor(
    async (fixture) => {
      const tasks = fixture.tasks
      const local = await AppRuntime.runPromise(
        tasks.create({
          session_id: fixture.spawned.sessionID,
          summary: "Unrelated same-named peer task",
          owner: "foreign-owner",
        }),
      )
      expect(local.id).toBe(fixture.task.id)
      const original = fixture.before.find((message) => message.info.role === "user")!
      if (original.info.role !== "user") throw new Error("Expected original actor user")
      expect(original.info).not.toHaveProperty("task_id")
      const response = await fixture.request(
        `/session/${fixture.spawned.sessionID}/turn/${fixture.interrupted.info.id}/resume?agentID=${encodeURIComponent(fixture.spawned.actorID)}&task_id=${fixture.task.id}&directory=${encodeURIComponent(fixture.receiver)}`,
        { method: "POST" },
      )
      expect(response.status).toBe(202)
      expect(
        await AppRuntime.runPromise(tasks.get({ session_id: fixture.parent.id, id: fixture.task.id })),
      ).toMatchObject({ status: "in_progress", owner: fixture.spawned.actorID })
      expect(await AppRuntime.runPromise(tasks.get({ session_id: fixture.spawned.sessionID, id: local.id }))).toEqual(
        local,
      )
      const admitted = await AppRuntime.runPromise(
        fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
      )
      const admittedUser = admitted.find((message) => message.info.id === original.info.id)!
      if (admittedUser.info.role !== "user") throw new Error("Expected admitted peer user")
      expect(admittedUser.info).toEqual({ ...original.info, task_id: fixture.task.id })
      fixture.release()
      await AppRuntime.runPromise(
        fixture.registry.get(fixture.spawned.sessionID, fixture.spawned.actorID).pipe(
          Effect.repeat({
            until: (actor) => actor?.status === "idle" && actor.lastOutcome === "success",
            schedule: Schedule.spaced("20 millis"),
          }),
          Effect.timeout("10 seconds"),
        ),
      )
      const after = await AppRuntime.runPromise(
        fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
      )
      expect(after.filter((message) => message.info.role === "user").map((message) => message.info.id)).toEqual([
        original.info.id,
      ])
      expect(
        after.at(-1)?.parts.some((part) => part.type === "text" && part.text === "Recovered HTTP actor result."),
      ).toBe(true)
      expect(fixture.requests).toHaveLength(2)
      expect(await AppRuntime.runPromise(tasks.get({ session_id: fixture.spawned.sessionID, id: local.id }))).toEqual(
        local,
      )
    },
    { mode: "peer", isolated: true, bound: false },
  )
}, 30_000)

test("HTTP actor recovery cannot borrow a retained actor from another directory instance", async () => {
  await withActor(async (fixture) => {
    await using other = await tmpdir({ git: true, root: "cwd" })
    const base = `/session/${fixture.parent.id}`
    const selector = `agentID=${encodeURIComponent(fixture.spawned.actorID)}&directory=${encodeURIComponent(other.path)}`
    const listed = await fixture.request(`${base}/recovery?${selector}`)
    expect(listed.status).toBe(404)
    const resumed = await fixture.request(`${base}/turn/${fixture.interrupted.info.id}/resume?${selector}`, {
      method: "POST",
    })
    expect(resumed.status).toBe(404)
    expect(
      await AppRuntime.runPromise(
        fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
      ),
    ).toEqual(fixture.before)
    expect(fixture.requests).toHaveLength(1)
  })
}, 30_000)

test("HTTP actor recovery resumes a retained child managed by a real registered controller", async () => {
  await withActor(
    async (fixture) => {
      if (!fixture.controller) throw new Error("Missing actual controller producer")
      expect(
        await AppRuntime.runPromise(fixture.registry.get(fixture.controller.sessionID, fixture.controller.actorID)),
      ).toMatchObject({ mode: "peer", actorID: fixture.controller.actorID })
      expect(
        await AppRuntime.runPromise(fixture.registry.get(fixture.spawned.sessionID, fixture.spawned.actorID)),
      ).toMatchObject({ parentActorID: fixture.controller.actorID })
      const base = `/session/${fixture.parent.id}`
      const selector = `agentID=${encodeURIComponent(fixture.spawned.actorID)}`
      const listed = await fixture.request(`${base}/recovery?${selector}`)
      expect(listed.status).toBe(200)
      expect(await listed.json()).toEqual([
        {
          assistantMessageID: fixture.interrupted.info.id,
          parentMessageID: fixture.before[0].info.id,
          created: fixture.interrupted.info.time.created,
        },
      ])
      const resumed = await fixture.request(`${base}/turn/${fixture.interrupted.info.id}/resume?${selector}`, {
        method: "POST",
      })
      expect(resumed.status).toBe(202)
      fixture.release()
      await AppRuntime.runPromise(
        fixture.registry.get(fixture.spawned.sessionID, fixture.spawned.actorID).pipe(
          Effect.repeat({
            until: (actor) => actor?.status === "idle" && actor.lastOutcome === "success",
            schedule: Schedule.spaced("20 millis"),
          }),
          Effect.timeout("10 seconds"),
        ),
      )
      const after = await AppRuntime.runPromise(
        fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
      )
      expect(after.filter((message) => message.info.role === "user")).toEqual(
        fixture.before.filter((message) => message.info.role === "user"),
      )
      expect(
        after.at(-1)?.parts.some((part) => part.type === "text" && part.text === "Recovered HTTP actor result."),
      ).toBe(true)
      expect(fixture.requests).toHaveLength(2)
      expect(fixture.requests[1].messages.filter((message) => message.role === "system")).toEqual(
        fixture.requests[0].messages.filter((message) => message.role === "system"),
      )
    },
    { controller: true },
  )
}, 30_000)

test("HTTP actor recovery rejects changed harness identity before listing or settlement", async () => {
  await withActor(async (fixture) => {
    Database.use((db) =>
      db
        .update(SessionTable)
        .set({ prompt: { harness: "codex", systemMode: "append" } })
        .where(eq(SessionTable.id, fixture.spawned.sessionID))
        .run(),
    )
    const base = `/session/${fixture.parent.id}`
    const selector = `agentID=${encodeURIComponent(fixture.spawned.actorID)}`
    const listed = await fixture.request(`${base}/recovery?${selector}`)
    expect(listed.status).toBe(404)
    const resumed = await fixture.request(`${base}/turn/${fixture.interrupted.info.id}/resume?${selector}`, {
      method: "POST",
    })
    expect(resumed.status).toBe(404)
    expect(
      await AppRuntime.runPromise(
        fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
      ),
    ).toEqual(fixture.before)
    expect(fixture.requests).toHaveLength(1)
  })
}, 30_000)

test("HTTP actor recovery rejects a released receiver after the same directory is reinitialized", async () => {
  await withActor(
    async (fixture) => {
      await Instance.provide({ directory: fixture.receiver, fn: () => Instance.dispose() })
      await Instance.provide({ directory: fixture.receiver, fn: () => Instance.current })
      const before = await AppRuntime.runPromise(
        fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
      )
      const base = `/session/${fixture.parent.id}`
      const selector = `agentID=${encodeURIComponent(fixture.spawned.actorID)}`
      const listed = await fixture.request(`${base}/recovery?${selector}`)
      expect(listed.status).toBe(404)
      const resumed = await fixture.request(`${base}/turn/${fixture.interrupted.info.id}/resume?${selector}`, {
        method: "POST",
      })
      expect(resumed.status).toBe(404)
      expect(
        await AppRuntime.runPromise(
          fixture.sessions.messages({ sessionID: fixture.spawned.sessionID, agentID: fixture.spawned.actorID }),
        ),
      ).toEqual(before)
      expect(fixture.requests).toHaveLength(1)
    },
    { mode: "peer", isolated: true },
  )
}, 30_000)
