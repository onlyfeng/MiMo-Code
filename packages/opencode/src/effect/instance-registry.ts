import type { InstanceContext } from "@/project/instance"

interface Disposer {
  fn: (directory: string, instance?: InstanceContext) => Promise<void>
  phase: "normal" | "late"
}

const disposers = new Set<Disposer>()

export function registerDisposer(
  fn: (directory: string, instance?: InstanceContext) => Promise<void>,
  opts?: { phase?: "normal" | "late" },
) {
  const entry: Disposer = { fn, phase: opts?.phase ?? "normal" }
  disposers.add(entry)
  return () => {
    disposers.delete(entry)
  }
}

export async function disposeInstance(directory: string, instance?: InstanceContext) {
  const normal: Disposer[] = []
  const late: Disposer[] = []
  for (const d of disposers) {
    if (d.phase === "late") late.push(d)
    else normal.push(d)
  }
  const results = [
    ...(await Promise.allSettled(normal.map((d) => d.fn(directory, instance)))),
    ...(await Promise.allSettled(late.map((d) => d.fn(directory, instance)))),
  ]
  const errors = results.filter((result): result is PromiseRejectedResult => result.status === "rejected")
  if (errors.length) throw new AggregateError(errors.map((result) => result.reason), `Instance disposal failed: ${directory}`)
}
