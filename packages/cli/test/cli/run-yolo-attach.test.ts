import { expect, test } from "bun:test"
import path from "node:path"
import { Effect } from "effect"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Bus } from "../../src/bus"
import { Permission } from "../../src/permission"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { tmpdir } from "../fixture/fixture"

async function run(url: URL, directory: string, yolo: boolean) {
  const env = { ...process.env }
  delete env.MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS
  delete env.MIMOCODE_AUTO_APPROVE_DELETE
  const child = Bun.spawn({
    cmd: [
      process.execPath,
      "--conditions=browser",
      path.resolve("src/index.ts"),
      "--pure",
      "run",
      "--attach",
      url.origin,
      "--dir",
      directory,
      "--model",
      "local/delete-fixture",
      "--title",
      yolo ? "yolo deletion fixture" : "strict deletion fixture",
      ...(yolo ? ["--yolo"] : []),
      "Remove victim.txt with Bash, then stop.",
    ],
    cwd: process.cwd(),
    env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const done = Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
  const deadline = Promise.withResolvers<never>()
  const timer = setTimeout(() => deadline.reject(new Error("Attached CLI exceeded 20 seconds")), 20_000)
  try {
    const [code, stdout, stderr] = await Promise.race([done, deadline.promise])
    return { code, stdout, stderr }
  } finally {
    clearTimeout(timer)
    child.kill("SIGKILL")
    const cleanup = Promise.withResolvers<never>()
    const guard = setTimeout(() => cleanup.reject(new Error("Attached CLI cleanup exceeded 2 seconds")), 2000)
    try {
      await Promise.race([done, cleanup.promise])
    } finally {
      clearTimeout(guard)
    }
  }
}

test("real attached CLI yolo approves one delete without granting a later strict run", async () => {
  let toolCalls = 0
  const vendor = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const body = (await request.json()) as {
        tools?: { function: { name: string } }[]
        messages: { role: string }[]
      }
      const deleting =
        body.tools?.some((tool) => tool.function.name === "bash") &&
        !body.messages.some((message) => message.role === "tool")
      if (deleting) toolCalls++
      const delta = deleting
        ? {
            tool_calls: [
              {
                index: 0,
                id: `delete-${toolCalls}`,
                type: "function",
                function: {
                  name: "bash",
                  arguments: JSON.stringify({ command: "rm victim.txt", description: "Remove only the test victim" }),
                },
              },
            ],
          }
        : { content: "Finished." }
      const chunks = [
        { choices: [{ index: 0, delta, finish_reason: null }] },
        {
          choices: [{ index: 0, delta: {}, finish_reason: deleting ? "tool_calls" : "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        },
      ].map((chunk) => ({
        id: "chatcmpl-delete-fixture",
        object: "chat.completion.chunk",
        created: 1,
        model: "delete-fixture",
        ...chunk,
      }))
      return new Response(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n", {
        headers: { "content-type": "text/event-stream" },
      })
    },
  })
  try {
    await using tmp = await tmpdir({
      root: "cwd",
      git: true,
      config: {
        model: "local/delete-fixture",
        small_model: "local/delete-fixture",
        checkpoint: { thresholds: [] },
        permission: { "*": "allow" },
        provider: {
          local: {
            npm: "@ai-sdk/openai-compatible",
            options: { apiKey: "test-key", baseURL: `http://127.0.0.1:${vendor.port}/v1` },
            models: {
              "delete-fixture": {
                name: "Delete fixture",
                tool_call: true,
                limit: { context: 100_000, output: 10_000 },
              },
            },
          },
        },
      },
    })
    await Instance.provide({
      directory: tmp.path,
      async fn() {
        const asks: Permission.Request[] = []
        const replies: { requestID: Permission.Request["id"]; reply: string }[] = []
        const cleanup = await AppRuntime.runPromise(
          Effect.gen(function* () {
            const permission = yield* Permission.Service
            yield* permission.setAutoApproveDelete(false)
            const bus = yield* Bus.Service
            const asked = yield* bus.subscribeCallback(Permission.Event.Asked, (event) => {
              asks.push(event.properties)
            })
            const replied = yield* bus.subscribeCallback(Permission.Event.Replied, (event) => {
              replies.push(event.properties)
            })
            return () => {
              asked()
              replied()
            }
          }),
        )
        const state = () =>
          AppRuntime.runPromise(
            Effect.gen(function* () {
              const permission = yield* Permission.Service
              return { automatic: yield* permission.autoApproveDelete(), pending: yield* permission.list() }
            }),
          )
        const server = await Server.listen({ hostname: "127.0.0.1", port: 0 })
        try {
          expect(await state()).toEqual({ automatic: false, pending: [] })
          await Bun.write(path.join(tmp.path, "victim.txt"), "yolo victim")
          const yolo = await run(server.url, tmp.path, true)
          expect(yolo.code, yolo.stdout + yolo.stderr).toBe(0)
          expect(await Bun.file(path.join(tmp.path, "victim.txt")).exists()).toBe(false)
          expect(asks.map((ask) => ask.permission)).toEqual(["bash_delete"])
          expect(asks[0].runID).toMatch(/^[0-9a-f-]{36}$/)
          expect(replies).toMatchObject([{ requestID: asks[0].id, reply: "once" }])
          expect(await state()).toEqual({ automatic: false, pending: [] })

          await Bun.write(path.join(tmp.path, "victim.txt"), "strict victim")
          const strict = await run(server.url, tmp.path, false)
          expect(strict.code, strict.stdout + strict.stderr).toBe(0)
          expect(await Bun.file(path.join(tmp.path, "victim.txt")).text()).toBe("strict victim")
          expect(asks.map((ask) => ask.permission)).toEqual(["bash_delete", "bash_delete"])
          expect(asks[1].runID).toMatch(/^[0-9a-f-]{36}$/)
          expect(asks[1].runID).not.toBe(asks[0].runID)
          expect(replies).toMatchObject([
            { requestID: asks[0].id, reply: "once" },
            { requestID: asks[1].id, reply: "reject" },
          ])
          expect(await state()).toEqual({ automatic: false, pending: [] })
          expect(toolCalls).toBe(2)
        } finally {
          await server.stop(true)
          cleanup()
        }
      },
    })
    await Instance.disposeAll()
  } finally {
    await vendor.stop(true)
    await Instance.disposeAll()
  }
}, 60_000)
