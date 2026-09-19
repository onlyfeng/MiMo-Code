import { expect } from "bun:test"
import { Deferred, Effect } from "effect"
import { createOpencodeClient } from "@mimo-ai/sdk/v2"
import { Actor } from "../../src/actor/spawn"
import { ActorRegistry } from "../../src/actor/registry"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instance } from "../../src/project/instance"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Server } from "../../src/server/server"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { prefixCaptureRef } from "../../src/session/prefix-capture-ref"
import { TaskRegistry } from "../../src/task/registry"
import { Log } from "../../src/util"
import { tmpdir } from "./fixture"
import { textStopResponse, type LLMCapture } from "../lib/scripted-llm-server"

void Log.init({ print: false })



const model = { providerID: ProviderID.make("alibaba"), modelID: ModelID.make("qwen-plus") }
const taskText = "Resume exactly this delegated HTTP recovery task."

function prepareActor(
  options: { mode?: "peer"; cwd?: string; parentActorID?: string; controller?: boolean; bound?: boolean } = {},
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
        system: "http-recovery-frozen-system",
        systemMode: "replace-agent",
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

export async function withActor(
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
  options: { mode?: "peer"; isolated?: boolean; parentActorID?: string; controller?: boolean; bound?: boolean } = {},
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
