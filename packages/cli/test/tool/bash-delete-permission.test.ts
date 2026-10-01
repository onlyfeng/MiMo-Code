import { describe, expect } from "bun:test"
import { Deferred, Effect, Fiber, Layer } from "effect"
import path from "node:path"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Git } from "../../src/git"
import { Permission } from "../../src/permission"
import { Plugin } from "../../src/plugin"
import { MessageID, SessionID } from "../../src/session/schema"
import { BashTool } from "../../src/tool/bash"
import { Truncate } from "../../src/tool"
import { provideTmpdirInstance, tmpdirScoped } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(
  Layer.mergeAll(
    Permission.defaultLayer,
    Bus.layer,
    CrossSpawnSpawner.defaultLayer,
    AppFileSystem.defaultLayer,
    Plugin.defaultLayer,
    Truncate.defaultLayer,
    Agent.defaultLayer,
    Git.defaultLayer,
  ),
)

describe("Bash deletion authorization", () => {
  for (const scenario of [
    { name: "delete deny", permission: "bash_delete", pattern: "*", command: "rm victim.txt" },
    { name: "Bash deny", permission: "bash", pattern: "*", command: "rm victim.txt" },
    { name: "later command deny", permission: "bash", pattern: "echo *", command: "rm victim.txt && echo forbidden" },
    { name: "external directory deny", permission: "external_directory", pattern: "*", command: "" },
    { name: "allowed delete", permission: "", pattern: "*", command: "rm victim.txt" },
  ]) {
    for (const automatic of [false, true]) {
      it.live(
        `${scenario.name} with automatic approval ${automatic}`,
        provideTmpdirInstance((dir) =>
          Effect.gen(function* () {
            const filename = path.join(dir, "victim.txt")
            const outside = yield* tmpdirScoped()
            const external = path.join(outside, "outside.txt")
            yield* Effect.promise(() => Bun.write(filename, "keep"))
            yield* Effect.promise(() => Bun.write(external, "outside"))
            const service = yield* Permission.Service
            yield* service.setAutoApproveDelete(automatic)
            const bus = yield* Bus.Service
            const asks: string[] = []
            const unsubscribe = yield* bus.subscribeCallback(Permission.Event.Asked, (event) => {
              asks.push(event.properties.permission)
              return Effect.runPromise(service.reply({ requestID: event.properties.id, reply: "once" }))
            })
            yield* Effect.addFinalizer(() => Effect.sync(unsubscribe))
            const tool = yield* BashTool.pipe(Effect.flatMap((info) => info.init()))
            const ruleset: Permission.Ruleset = [
              { permission: "*", pattern: "*", action: "allow" },
              ...(scenario.permission
                ? [{ permission: scenario.permission, pattern: scenario.pattern, action: "deny" as const }]
                : []),
            ]
            const result = yield* tool
              .execute(
                {
                  command: scenario.command || `rm victim.txt && cat '${external}'`,
                  description: "Remove the fixture",
                },
                {
                  sessionID: SessionID.make("ses_delete"),
                  messageID: MessageID.make("msg_delete"),
                  agent: "build",
                  abort: new AbortController().signal,
                  messages: [],
                  permission: ruleset,
                  metadata: () => Effect.void,
                  ask: (request) =>
                    service
                      .ask({
                        ...request,
                        sessionID: SessionID.make("ses_delete"),
                        ruleset,
                      })
                      .pipe(Effect.orDie),
                },
              )
              .pipe(Effect.exit)
            expect(result._tag).toBe(scenario.permission ? "Failure" : "Success")
            expect(yield* Effect.promise(() => Bun.file(filename).exists())).toBe(!!scenario.permission)
            if (scenario.permission) expect(yield* Effect.promise(() => Bun.file(filename).text())).toBe("keep")
            expect(asks).toEqual(!scenario.permission && !automatic ? ["bash_delete"] : [])
            expect(yield* service.list()).toEqual([])
          }),
        ),
      )
    }
  }
})

for (const permission of ["bash", "external_directory"] as const) {
  for (const reply of ["once", "reject"] as const) {
    it.live(
      `automatic deletion preserves ${permission} ${reply} for the whole mixed command`,
      provideTmpdirInstance((dir) =>
        Effect.gen(function* () {
          const filename = path.join(dir, "victim.txt")
          const marker = path.join(dir, "marker.txt")
          const outside = yield* tmpdirScoped()
          const external = path.join(outside, "outside.txt")
          yield* Effect.promise(() => Bun.write(filename, "keep"))
          yield* Effect.promise(() => Bun.write(external, "external content"))
          let requests = 0
          const server = Bun.serve({
            hostname: "127.0.0.1",
            port: 0,
            fetch() {
              requests++
              return new Response("network content")
            },
          })
          yield* Effect.addFinalizer(() => Effect.promise(() => server.stop(true)))
          const command =
            permission === "bash"
              ? `rm victim.txt && curl -s http://127.0.0.1:${server.port}/fixture > marker.txt`
              : `rm victim.txt && cat '${external}' > marker.txt`
          const service = yield* Permission.Service
          yield* service.setAutoApproveDelete(true)
          const asked = yield* Deferred.make<Permission.Request>()
          const asks: string[] = []
          const unsubscribe = yield* (yield* Bus.Service).subscribeCallback(Permission.Event.Asked, (event) => {
            asks.push(event.properties.permission)
            Effect.runSync(Deferred.succeed(asked, event.properties))
          })
          yield* Effect.addFinalizer(() => Effect.sync(unsubscribe))
          const ruleset: Permission.Ruleset = [
            { permission: "*", pattern: "*", action: "allow" },
            { permission, pattern: "*", action: "ask" },
          ]
          const tool = yield* BashTool.pipe(Effect.flatMap((info) => info.init()))
          const fiber = yield* tool
            .execute(
              { command, description: "Mixed deletion fixture" },
              {
                sessionID: SessionID.make("ses_mixed"),
                messageID: MessageID.make("msg_mixed"),
                agent: "build",
                abort: new AbortController().signal,
                messages: [],
                permission: ruleset,
                metadata: () => Effect.void,
                ask: (request) =>
                  service.ask({ ...request, sessionID: SessionID.make("ses_mixed"), ruleset }).pipe(Effect.orDie),
              },
            )
            .pipe(Effect.forkScoped)
          const reached = yield* Effect.raceFirst(
            Deferred.await(asked).pipe(Effect.as("asked")),
            Fiber.await(fiber).pipe(Effect.as("executed")),
          )
          expect(reached).toBe("asked")
          expect(yield* Effect.promise(() => Bun.file(filename).text())).toBe("keep")
          expect(yield* Effect.promise(() => Bun.file(marker).exists())).toBe(false)
          expect(requests).toBe(0)
          const request = yield* Deferred.await(asked)
          expect(request.permission).toBe(permission)
          yield* service.reply({ requestID: request.id, reply })
          const result = yield* Fiber.await(fiber)
          expect(result._tag).toBe(reply === "once" ? "Success" : "Failure")
          expect(yield* Effect.promise(() => Bun.file(filename).exists())).toBe(reply === "reject")
          expect(yield* Effect.promise(() => Bun.file(marker).exists())).toBe(reply === "once")
          expect(requests).toBe(reply === "once" && permission === "bash" ? 1 : 0)
          expect(asks).toEqual([permission])
          expect(yield* service.list()).toEqual([])
        }),
      ),
      15000,
    )
  }
}

for (const mode of ["manual", "forwarded", "automatic-flipped", "skip-all"] as const) {
  it.live(
    `${mode} mixed deletion uses the actual reply rather than a shared flag snapshot`,
    provideTmpdirInstance((dir) =>
      Effect.gen(function* () {
        const filename = path.join(dir, "victim.txt")
        const outside = yield* tmpdirScoped()
        const external = path.join(outside, "outside.txt")
        yield* Effect.promise(() => Bun.write(filename, "keep"))
        yield* Effect.promise(() => Bun.write(external, "external content"))
        const service = yield* Permission.Service
        const automatic = mode === "automatic-flipped" || mode === "skip-all"
        yield* service.setAutoApproveDelete(automatic)
        yield* service.setSkipAll(mode === "skip-all")
        const asks: Permission.Request[] = []
        const answered: boolean[] = []
        const command = `rm victim.txt && cat '${external}' > marker.txt`
        const unsubscribe = yield* (yield* Bus.Service).subscribeCallback(Permission.Event.Asked, (event) => {
          asks.push(event.properties)
          return Effect.runPromise(
            Effect.gen(function* () {
              expect(yield* Effect.promise(() => Bun.file(filename).text())).toBe("keep")
              expect(yield* Effect.promise(() => Bun.file(path.join(dir, "marker.txt")).exists())).toBe(false)
              // A different caller's receipt cannot steal the pending ask's result.
              answered.push(
                yield* Permission.withReplyReceipt(
                  "bash_delete",
                  service.reply({ requestID: event.properties.id, reply: "once" }),
                ),
              )
            }),
          )
        })
        yield* Effect.addFinalizer(() => Effect.sync(unsubscribe))
        const ruleset: Permission.Ruleset = [{ permission: "*", pattern: "*", action: "ask" }]
        const tool = yield* BashTool.pipe(Effect.flatMap((info) => info.init()))
        yield* tool.execute(
          { command, description: "Approve the complete mixed command" },
          {
            sessionID: SessionID.make("ses_reply_owner"),
            messageID: MessageID.make("msg_reply_owner"),
            agent: "build",
            abort: new AbortController().signal,
            messages: [],
            permission: ruleset,
            metadata: () => Effect.void,
            ask: (request) =>
              service
                .ask({
                  ...request,
                  sessionID: SessionID.make("ses_reply_owner"),
                  ruleset,
                  ...(mode === "forwarded" ? { forward: { parentSessionID: "ses_approving_parent" } } : {}),
                })
                .pipe(
                  Effect.andThen(() =>
                    request.permission === "bash_delete" && mode !== "skip-all"
                      ? service.setAutoApproveDelete(!automatic)
                      : Effect.void,
                  ),
                  Effect.orDie,
                ),
          },
        )
        expect(yield* Effect.promise(() => Bun.file(filename).exists())).toBe(false)
        expect(yield* Effect.promise(() => Bun.file(path.join(dir, "marker.txt")).text())).toBe("external content")
        expect(asks.map((request) => request.permission)).toEqual(
          mode === "skip-all" ? [] : mode === "automatic-flipped" ? ["external_directory", "bash"] : ["bash_delete"],
        )
        if (!automatic) expect(asks[0].metadata.command).toBe(command)
        expect(answered).toEqual(asks.map(() => false))
        expect(yield* service.list()).toEqual([])
      }),
    ),
    15000,
  )
}
