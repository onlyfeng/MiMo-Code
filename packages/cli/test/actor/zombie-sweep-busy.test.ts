import { describe, expect, test } from "bun:test"
import path from "node:path"
import z from "zod"
import { tmpdir } from "../fixture/fixture"

const report = z.object({
  kind: z.enum(["seeded", "swept", "failed"]),
  elapsed: z.number().optional(),
  status: z.string().optional(),
  message: z.string().optional(),
})

function child(script: string, args: string[], env: Record<string, string>) {
  const messages: unknown[] = []
  const proc = Bun.spawn([process.execPath, "run", path.join(import.meta.dir, "../fixture", script), ...args], {
    env: { ...process.env, ...env },
    stdout: "ignore",
    stderr: "pipe",
    ipc(message) { messages.push(message) },
  })
  const errors = new Response(proc.stderr).text()
  const next = async <T,>(match: (message: unknown) => T | undefined, timeout = 20_000) => {
    const start = Date.now()
    for (;;) {
      for (const message of messages) {
        const found = match(message)
        if (found !== undefined) return found
      }
      if (proc.exitCode !== null) throw new Error(`${script} exited ${proc.exitCode}: ${await errors}`)
      if (Date.now() - start > timeout) throw new Error(`${script} timed out`)
      await Bun.sleep(20)
    }
  }
  return {
    next,
    send: (message: string) => proc.send(message),
    [Symbol.asyncDispose]: async () => {
      if (proc.exitCode === null && proc.signalCode === null) proc.kill("SIGKILL")
      await proc.exited
    },
  }
}

const parsed = (kind: z.infer<typeof report>["kind"]) => (message: unknown) => {
  const value = report.safeParse(message)
  return value.success && value.data.kind === kind ? value.data : undefined
}

describe("boot-time zombie sweep under another process's write", () => {
  test("waits for another process's write lock instead of failing at once", async () => {
    await using tmp = await tmpdir({ git: true })
    const file = path.join(tmp.path, "shared.db")
    await using peer = child("zombie-sweep-peer.ts", [tmp.path], { MIMOCODE_DB: file })
    await peer.next(parsed("seeded"))

    await using holder = child("sqlite-write-holder.ts", [file], {})
    await holder.next((message) => (message === "locked" ? true : undefined))
    peer.send("sweep")
    // Keep the lock well past a deferred transaction's immediate failure.
    await Bun.sleep(1_000)
    holder.send("commit")
    await holder.next((message) => (message === "committed" ? true : undefined))

    const result = await peer.next((message) => parsed("swept")(message) ?? parsed("failed")(message))
    expect(result).toMatchObject({ kind: "swept", status: "idle" })
    expect(result.elapsed).toBeGreaterThanOrEqual(900)
  }, 60_000)
})
