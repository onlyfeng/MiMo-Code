import { afterEach, expect } from "bun:test"
import { Deferred, Effect, Layer } from "effect"
import { $ } from "bun"
import { Actor } from "../../src/actor/spawn"
import { spawnRef } from "../../src/actor/spawn-ref"
import { ActorRegistry } from "../../src/actor/registry"
import { Bus } from "../../src/bus"
import { Plugin } from "../../src/plugin"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { WorkflowAgentFailed } from "../../src/workflow/events"
import { WorkflowRuntime } from "../../src/workflow/runtime"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { makeLayer, providerCfg, ref } from "./lib"

let cleanup: {
  started: Deferred.Deferred<void>
  entered: Deferred.Deferred<void>
  release: Deferred.Deferred<void>
  finished: Deferred.Deferred<void>
  actorID?: string
} | undefined

const plugin = Layer.effect(Plugin.Service, Effect.gen(function* () {
  const real = yield* Plugin.Service
  return Plugin.Service.of({
    ...real,
    triggerActorPostStop: (input) => Effect.gen(function* () {
      const gate = cleanup
      if (!gate) return yield* real.triggerActorPostStop(input)
      gate.actorID = input.actorID
      yield* Deferred.succeed(gate.started, undefined)
      // The actual actor execution owns this hook and its finalizer. Cancellation
      // reaches the finalizer, which stays blocked independently of the workflow.
      return yield* Effect.never.pipe(Effect.ensuring(
        Deferred.succeed(gate.entered, undefined).pipe(
          Effect.andThen(Deferred.await(gate.release)),
          Effect.ensuring(Deferred.succeed(gate.finished, undefined)),
        ),
      ))
    }),
  })
})).pipe(Layer.provide(Plugin.defaultLayer))

const it = testEffect(makeLayer(plugin))

afterEach(async () => {
  cleanup = undefined
  await Instance.disposeAll()
})

for (const isolation of ["shared", "worktree"] as const) {
  it.live(`agent timeout crosses parallel and pipeline barriers while ${isolation} cancellation cleanup is blocked`, () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ dir, llm }) {
        const runtime = yield* WorkflowRuntime.Service
        const actor = yield* Actor.Service
        const registry = yield* ActorRegistry.Service
        const sessions = yield* Session.Service
        const bus = yield* Bus.Service
        const parent = yield* sessions.create({
          title: "workflow cleanup timeout",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })
        const gate = {
          started: yield* Deferred.make<void>(),
          entered: yield* Deferred.make<void>(),
          release: yield* Deferred.make<void>(),
          finished: yield* Deferred.make<void>(),
          actorID: undefined as string | undefined,
        }
        cleanup = gate
        spawnRef.current = actor
        const reasons: string[] = []
        const off = yield* bus.subscribeCallback(WorkflowAgentFailed, (event) => {
          if (event.properties.sessionID === parent.id) reasons.push(event.properties.reason)
        })
        yield* llm.text("main result")
        if (isolation === "worktree")
          yield* Effect.promise(() => $`git add -A && git commit -q -m test-config`.cwd(dir).quiet())
        yield* Effect.gen(function* () {
          const { runID } = yield* runtime.start({
            sessionID: parent.id,
            parentActorID: "main",
            model: ref,
            agentTimeoutMs: 5000,
            scriptDeadlineMs: 60000,
            script: [
              `export const meta = { name: "cleanup-timeout", description: "d" }`,
              `const results = await parallel([() => agent("blocked cleanup", { agentType: "explore", tools: [], isolation: "${isolation}" })])`,
              `return await pipeline(results, (value) => value == null ? "timed-out" : "unexpected")`,
            ].join("\n"),
          })
          yield* Deferred.await(gate.started).pipe(Effect.timeout("4 seconds"))
          // First provider use may initialize the app graph; keep cancellation
          // on the same real Actor service that owns this test's hook execution.
          spawnRef.current = actor
          yield* Deferred.await(gate.entered).pipe(Effect.timeout("6 seconds"))
          expect(gate.actorID).toBeDefined()
          expect(yield* Deferred.isDone(gate.finished)).toBe(false)
          const outcome = yield* runtime.wait({ runID }).pipe(Effect.timeout("8 seconds"))
          expect(outcome).toEqual({ status: "completed", result: ["timed-out"] })
          expect(yield* Deferred.isDone(gate.finished)).toBe(false)
          const status = yield* runtime.status({ runID })
          expect(status).toMatchObject({ running: 0, succeeded: 0, failed: 1 })
          expect(reasons).toEqual(["timeout"])
        }).pipe(Effect.ensuring(Effect.gen(function* () {
          yield* Deferred.succeed(gate.release, undefined)
          if (gate.actorID) {
            yield* actor.cancel(parent.id, gate.actorID, "forced").pipe(Effect.timeout("5 seconds"))
            yield* Deferred.await(gate.finished).pipe(Effect.timeout("5 seconds"))
            if (isolation === "shared")
              expect((yield* registry.get(parent.id, gate.actorID))?.lastOutcome).toBe("cancelled")
          }
          off()
          cleanup = undefined
        }).pipe(Effect.orDie)))
      }),
      { git: true, config: providerCfg },
    ),
    30000,
  )
}
