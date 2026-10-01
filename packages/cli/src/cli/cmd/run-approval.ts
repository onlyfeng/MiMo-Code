import { randomUUID } from "node:crypto"

export function createRunApproval(yolo: boolean) {
  const runID = randomUUID()
  const controller = new AbortController()
  let active = false
  return {
    runID,
    signal: controller.signal,
    start() {
      if (!controller.signal.aborted) active = true
    },
    stop() {
      active = false
      controller.abort()
    },
    reply(request: { runID?: string }) {
      if (!active || controller.signal.aborted || request.runID !== runID) return
      return yolo ? ("once" as const) : ("reject" as const)
    },
  }
}
