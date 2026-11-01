import path from "node:path"
import z from "zod"

const reportSchema = z.object({ instanceID: z.string(), pid: z.number() })

export type ProcessOwner = {
  readonly instanceID: string
  readonly pid: number
  /** SIGKILL: the kernel releases the lock without any cleanup by the child. */
  readonly kill: () => Promise<void>
  readonly [Symbol.asyncDispose]: () => Promise<void>
}

/** Start a separate process that holds a liveness lock in `directory`. */
export async function startProcessOwner(directory: string): Promise<ProcessOwner> {
  const ready = Promise.withResolvers<z.infer<typeof reportSchema>>()
  const child = Bun.spawn([process.execPath, "run", path.join(import.meta.dir, "../fixture/process-owner.ts"), directory], {
    env: { ...process.env },
    stdout: "ignore",
    stderr: "pipe",
    ipc(message) {
      const parsed = reportSchema.safeParse(message)
      if (parsed.success) ready.resolve(parsed.data)
      else ready.reject(parsed.error)
    },
  })
  const errors = new Response(child.stderr).text()
  void child.exited.then(async (code) => ready.reject(new Error(`process owner exited ${code}: ${await errors}`)))
  const report = await ready.promise
  const kill = async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL")
    await child.exited
  }
  return { ...report, kill, [Symbol.asyncDispose]: kill }
}
