import { expect } from "bun:test"
import { Deferred, Effect, Fiber, Layer } from "effect"
import path from "node:path"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { ActorRegistry } from "../../src/actor/registry"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Git } from "../../src/git"
import { Permission } from "../../src/permission"
import { forwardRef } from "../../src/permission/permission-forward-ref"
import { Plugin } from "../../src/plugin"
import { Provider } from "../../src/provider"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { BashTool } from "../../src/tool/bash"
import { SessionTool } from "../../src/tool/session"
import { Truncate } from "../../src/tool"
import { Worktree } from "../../src/worktree"
import { provideTmpdirInstance, tmpdirScoped } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(
  Permission.defaultLayer, Bus.layer, CrossSpawnSpawner.defaultLayer, AppFileSystem.defaultLayer,
  Plugin.defaultLayer, Truncate.defaultLayer, Git.defaultLayer, Agent.defaultLayer,
  Session.defaultLayer, ActorRegistry.defaultLayer, Provider.defaultLayer, Worktree.defaultLayer,
))

for (const decision of ["approve", "deny", "pregrant"] as const) {
  it.live(`forwarded mixed deletion through SessionTool ${decision} preserves complete-command approval`, () =>
    provideTmpdirInstance((dir) => Effect.gen(function* () {
      const sessions = yield* Session.Service
      const parent = yield* sessions.create({ title: "Approving parent" })
      const child = yield* sessions.create({ title: "Forwarded child", parentID: parent.id })
      yield* Effect.addFinalizer(() => Effect.sync(() => forwardRef.clearGrantsForParent(parent.id)))
      const service = yield* Permission.Service
      const sessionTool = yield* (yield* SessionTool).init()
      const parentContext = {
        sessionID: parent.id, messageID: MessageID.ascending(), agent: "orchestrator", actorID: "main",
        abort: new AbortController().signal, messages: [], metadata: () => Effect.void, ask: () => Effect.void,
      }
      if (decision === "pregrant")
        yield* sessionTool.execute({ operation: { action: "grant-approval", target: child.id } }, parentContext)
      const outside = yield* tmpdirScoped()
      const external = path.join(outside, "outside.txt")
      yield* Effect.promise(() => Bun.write(external, "outside marker"))
      yield* Effect.promise(() => Bun.write(path.join(dir, "victim.txt"), "keep"))
      const checks: string[] = []
      const ruleset: Permission.Ruleset = [
        { permission: "*", pattern: "*", action: "ask" },
      ]
      const bash = yield* (yield* BashTool).init()
      const work = yield* bash.execute({ command: `rm victim.txt && cat '${external}' > marker.txt`, description: "One complete mixed command" }, {
        sessionID: child.id, messageID: MessageID.ascending(), agent: "build", actorID: "main",
        abort: new AbortController().signal, messages: [], permission: ruleset, metadata: () => Effect.void,
        ask: (request) => {
          checks.push(request.permission)
          // Fail immediately if the single manual approval is incorrectly followed
          // by an ordinary second ask, instead of hanging awaiting another reply.
          if (decision === "approve" && request.permission !== "bash_delete")
            return Effect.die(new Error(`duplicate ordinary approval: ${request.permission}`))
          return service.ask({ ...request, sessionID: child.id, ruleset, forward: { parentSessionID: parent.id } }).pipe(Effect.orDie)
        },
      }).pipe(Effect.forkScoped)
      if (decision !== "pregrant") {
        while (!forwardRef.findPendingByChild(child.id)) yield* Effect.yieldNow
        expect(yield* Effect.promise(() => Bun.file(path.join(dir, "victim.txt")).text())).toBe("keep")
        expect(yield* Effect.promise(() => Bun.file(path.join(dir, "marker.txt")).exists())).toBe(false)
        if (decision === "approve") {
          const result = yield* sessionTool.execute({ operation: { action: "approve", sessionID: child.id } }, parentContext)
          expect(result.output).toContain("Approved child")
        } else expect(forwardRef.resolve(child.id, "deny")).toBe(true)
      }
      const exit = yield* Fiber.await(work)
      expect(exit._tag).toBe(decision !== "deny" ? "Success" : "Failure")
      expect(yield* Effect.promise(() => Bun.file(path.join(dir, "victim.txt")).exists())).toBe(decision === "deny")
      expect(yield* Effect.promise(() => Bun.file(path.join(dir, "marker.txt")).exists())).toBe(decision !== "deny")
      if (decision !== "deny") expect(yield* Effect.promise(() => Bun.file(path.join(dir, "marker.txt")).text())).toBe("outside marker")
      expect(checks).toEqual(decision === "pregrant" ? ["bash_delete", "external_directory", "bash"] : ["bash_delete"])
      expect(yield* service.list()).toEqual([])
      expect(forwardRef.findPendingByChild(child.id)).toBeUndefined()
    })), 15000,
  )
}

it.live("late forwarded one-shot cannot relabel an already automatic completion", () =>
  provideTmpdirInstance(() => Effect.gen(function* () {
    const sessions = yield* Session.Service
    const parent = yield* sessions.create({ title: "Late parent" })
    const child = yield* sessions.create({ title: "Late child", parentID: parent.id })
    const service = yield* Permission.Service
    const completed = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const work = yield* Permission.withReplyReceipt("bash", service.ask({
      sessionID: child.id, permission: "bash", patterns: ["echo"], always: [], metadata: {},
      ruleset: [{ permission: "bash", pattern: "*", action: "ask" }],
      forward: { parentSessionID: parent.id },
    }).pipe(
      Effect.andThen(Deferred.succeed(completed, undefined)),
      Effect.andThen(Deferred.await(release)),
    )).pipe(Effect.forkScoped)
    while (!forwardRef.findPendingByChild(child.id)) yield* Effect.yieldNow
    const old = forwardRef.findPendingByChild(child.id)!
    yield* service.setSkipAll(true)
    yield* Deferred.await(completed)
    old.rec.resolve("allow")
    // The saved resolver forks a pure child-instance completion effect. Let that
    // queued fiber execute while the receipt owner is still parked before reading.
    yield* Effect.sleep("10 millis")
    yield* Deferred.succeed(release, undefined)
    expect(yield* Fiber.join(work)).toBe(false)
    expect(yield* service.list()).toEqual([])
    expect(forwardRef.findPendingByChild(child.id)).toBeUndefined()
  })), 15000,
)
