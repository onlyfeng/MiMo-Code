import { afterEach, expect, test } from "bun:test"
import { Cause, Effect, Exit, Fiber } from "effect"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Permission } from "../../src/permission"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import * as RunApproval from "../../src/session/run-approval"
import { SessionID } from "../../src/session/schema"
import { tmpdir } from "../fixture/fixture"

afterEach(() => Instance.disposeAll())

for (const scenario of [
  { reply: "reject", scope: "request", remaining: true },
  { reply: "reject", scope: undefined, remaining: false },
  { reply: "once", scope: "request", remaining: true },
  { reply: "always", scope: "request", remaining: false },
] as const) {
  test(`permission HTTP reply ${scenario.reply} with scope ${scenario.scope ?? "default"}`, async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    await Instance.provide({
      directory: tmp.path,
      fn: () =>
        AppRuntime.runPromise(
          Effect.gen(function* () {
            const permission = yield* Permission.Service
            const runs = [crypto.randomUUID(), crypto.randomUUID()]
            const fibers = []
            for (const runID of runs) {
              fibers.push(
                yield* permission
                  .ask({
                    sessionID: SessionID.make("ses_independent_runs"),
                    permission: "bash",
                    patterns: ["echo marker"],
                    metadata: {},
                    always: ["echo marker"],
                    ruleset: [],
                  })
                  .pipe(RunApproval.own(runID), Effect.exit, Effect.forkScoped),
              )
            }
            for (let attempt = 0; attempt < 100 && (yield* permission.list()).length !== 2; attempt++) {
              yield* Effect.sleep("10 millis")
            }
            const pending = yield* permission.list()
            expect(pending.map((request) => request.runID).toSorted()).toEqual(runs.toSorted())
            const selected = pending.find((request) => request.runID === runs[0])!
            const response = yield* Effect.promise(async () =>
              Server.Default().app.request(
                `/permission/${selected.id}/reply?directory=${encodeURIComponent(tmp.path)}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reply: scenario.reply, scope: scenario.scope, message: "Declined this call" }),
                },
              ),
            )
            expect(response.status).toBe(200)
            expect(yield* Effect.promise(() => response.json())).toBe(true)
            const remaining = yield* permission.list()
            expect(remaining.map((request) => request.runID)).toEqual(scenario.remaining ? [runs[1]] : [])
            const first = yield* Fiber.join(fibers[0]!)
            expect(first._tag).toBe(scenario.reply === "reject" ? "Failure" : "Success")
            if (Exit.isFailure(first)) expect(Cause.squash(first.cause)).toBeInstanceOf(Permission.CorrectedError)
            if (scenario.remaining) yield* permission.reply({ requestID: remaining[0]!.id, reply: "once" })
            const second = yield* Fiber.join(fibers[1]!)
            expect(second._tag).toBe(scenario.reply === "reject" && !scenario.remaining ? "Failure" : "Success")
            expect(yield* permission.list()).toEqual([])
          }).pipe(Effect.scoped),
        ),
    })
  }, 30000)
}

test("permission HTTP reply rejects unknown reply scopes", async () => {
  await using tmp = await tmpdir({ git: true, root: "cwd" })
  const response = await Server.Default().app.request(
    `/permission/per_invalid/reply?directory=${encodeURIComponent(tmp.path)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: "reject", scope: "session" }),
    },
  )
  expect(response.status).toBe(400)
})
