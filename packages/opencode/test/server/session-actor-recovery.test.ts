import { afterEach, expect, test } from "bun:test"
import { Deferred, Effect, Schedule } from "effect"
import { eq } from "drizzle-orm"
import { Database } from "../../src/storage"
import { SessionTable } from "../../src/session/session.sql"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instance } from "../../src/project/instance"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { MessageID } from "../../src/session/schema"
import { Log } from "../../src/util"
import { ToolRegistry } from "../../src/tool"
import { shellWrap } from "../../src/tool/shell-wrap"
import { ToolScriptTool } from "../../src/tool/tool-script"
import type * as Tool from "../../src/tool/tool"
import { tmpdir } from "../fixture/fixture"

void Log.init({ print: false })

afterEach(() => Instance.disposeAll())

const model = { providerID: ProviderID.make("alibaba"), modelID: ModelID.make("qwen-plus") }

import { withActor } from "../fixture/retained-recovery-actor"

for (const mode of ["subagent", "peer", "isolated peer"] as const) {
  test(`HTTP actor recovery lists and atomically resumes the exact retained ${mode} candidate`, async () => {
    await withActor(
      async (fixture) => {
        const base = `/session/${fixture.parent.id}`
        const selector = `agentID=${encodeURIComponent(fixture.spawned.actorID)}`
        const original = structuredClone(fixture.before)
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
          expect(admitted.find((message) => message.info.id === fixture.interrupted.info.id)).toBeUndefined()
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
          expect(JSON.stringify(fixture.requests[1])).toContain("http-recovery-frozen-system")
          expect(
            await AppRuntime.runPromise(
              fixture.actor.getForkContext(fixture.spawned.sessionID, fixture.spawned.actorID),
            ),
          ).toBe(fixture.frozen)
        } finally {
          fixture.release()
        }
      },
      mode === "subagent" ? {} : { mode: "peer", isolated: mode === "isolated peer" },
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
