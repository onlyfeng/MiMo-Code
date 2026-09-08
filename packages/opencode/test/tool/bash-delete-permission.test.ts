import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
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
