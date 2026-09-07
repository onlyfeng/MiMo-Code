import { AppRuntime } from "@/effect/app-runtime"
import { Instance } from "@/project/instance"
import { InstanceBootstrap } from "@/project/bootstrap"
import { RequestError } from "@/audio/service"

const MAX_BODY = 25 * 1024 * 1024

export async function readBody(req: Request, signal: AbortSignal) {
  if (Number(req.headers.get("content-length")) > MAX_BODY) {
    await req.body?.cancel().catch(() => {})
    throw new RequestError(413, "Request body exceeds 25 MiB", "invalid_request_error")
  }
  const reader = req.body?.getReader()
  if (!reader) throw new RequestError(400, "Request body is required", "invalid_request_error")
  const chunks: Uint8Array[] = []
  let length = 0
  const cancel = () => void reader.cancel().catch(() => {})
  signal.addEventListener("abort", cancel, { once: true })
  try {
    while (true) {
      signal.throwIfAborted()
      const next = await reader.read()
      signal.throwIfAborted()
      if (next.done) return Buffer.concat(chunks, length)
      length += next.value.byteLength
      if (length > MAX_BODY) {
        await reader.cancel()
        throw new RequestError(413, "Request body exceeds 25 MiB", "invalid_request_error")
      }
      chunks.push(next.value)
    }
  } finally {
    signal.removeEventListener("abort", cancel)
    reader.releaseLock()
  }
}

// A generic API may already own this directory's bootstrap. Cancelling an API
// waiter must not wait for or cancel that shared producer. Once entered, retain
// the instance lease until the provider call actually observes cancellation.
export function inInstance(directory: string, signal: AbortSignal, fn: () => Promise<Response>) {
  const state: { run?: () => Promise<Response>; entered: boolean } = { run: fn, entered: false }
  return new Promise<Response>((resolve, reject) => {
    const abort = () => {
      if (state.entered) return
      // Release parsed text/uploads held by the callback even if the shared
      // bootstrap remains pending. Its eventual callback must never call a model.
      state.run = undefined
      signal.removeEventListener("abort", abort)
      reject(signal.reason)
    }
    if (signal.aborted) return abort()
    signal.addEventListener("abort", abort, { once: true })
    Instance.provide({
      directory,
      init: () => AppRuntime.runPromise(InstanceBootstrap, { signal }),
      fn() {
        signal.throwIfAborted()
        state.entered = true
        const run = state.run
        state.run = undefined
        if (!run) throw new Error("API request is no longer active")
        return run()
      },
    })
      .then(resolve, reject)
      .finally(() => {
        state.run = undefined
        signal.removeEventListener("abort", abort)
      })
  })
}
