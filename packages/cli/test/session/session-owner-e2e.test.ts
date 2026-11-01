import { afterEach, describe, expect } from "bun:test"
import path from "node:path"
import { Effect, Layer } from "effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import z from "zod"
import { Instance } from "../../src/project/instance"
import { Log } from "../../src/util"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { TestLLMServer } from "../lib/llm-server"
import { providerCfg } from "../workflow/lib"

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

const it = testEffect(Layer.mergeAll(TestLLMServer.layer, CrossSpawnSpawner.defaultLayer))

const report = z.object({
  kind: z.enum(["ready", "ran", "sent", "done", "error"]),
  pid: z.number().optional(),
  sessionID: z.string().optional(),
  busy: z.array(z.string()).optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  shown: z.array(z.string()).optional(),
  message: z.string().optional(),
})
type Report = z.infer<typeof report>

// A real `mimo` process over the shared database file; the test's own database is in memory.
function peer(mode: "receiver" | "sender", directory: string, target?: string) {
  const reports: Report[] = []
  const child = Bun.spawn([process.execPath, "run", path.join(import.meta.dir, "../fixture/session-owner-peer.ts"), mode, directory, ...(target ? [target] : [])], {
    env: { ...process.env, MIMOCODE_DB: path.join(directory, "shared.db") },
    stdout: "ignore",
    stderr: "pipe",
    ipc(message) { reports.push(report.parse(message)) },
  })
  const errors = new Response(child.stderr).text()
  const next = (kind: Report["kind"]) => Effect.promise(async () => {
    for (;;) {
      const failed = reports.find((item) => item.kind === "error")
      if (failed) throw new Error(failed.message)
      const found = reports.find((item) => item.kind === kind)
      if (found) return found
      if (child.exitCode !== null) throw new Error(`${mode} exited ${child.exitCode}: ${await errors}`)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  })
  const stop = Effect.promise(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL")
    await child.exited
  })
  return { next, stop, send: (message: string) => child.send(message) }
}

describe("cross-process session delivery", () => {
  it.live(
    "a message to a session open in another process runs there, never in the sender",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ dir, llm }) {
          const receiver = peer("receiver", dir)
          yield* Effect.addFinalizer(() => receiver.stop)
          const ready = yield* receiver.next("ready")

          // Both processes read this directory's config, so a model call from
          // either one reaches this test's model server.
          yield* llm.text("task done")
          const sender = peer("sender", dir, ready.sessionID)
          yield* Effect.addFinalizer(() => sender.stop)
          const sent = yield* sender.next("sent")
          expect(sent.output).toMatchObject({ delivery: "queued_for_owner", owner_pid: ready.pid })

          const ran = yield* receiver.next("ran")
          expect(ran.busy).toContain(ready.sessionID)
          // The receiver's window shows the delivered message, before the reply to it.
          const delivered = ran.shown?.indexOf("user:agent") ?? -1
          expect(delivered).toBeGreaterThanOrEqual(0)
          expect(ran.shown?.indexOf("assistant:local") ?? -1).toBeGreaterThan(delivered)
          sender.send("finish")
          const done = yield* sender.next("done")
          expect(done.busy).not.toContain(ready.sessionID)
          expect(yield* llm.calls).toBe(1)
        }),
        { git: true, config: providerCfg },
      ),
    90_000,
  )
})
