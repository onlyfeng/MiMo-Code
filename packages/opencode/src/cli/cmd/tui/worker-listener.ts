import { randomBytes } from "node:crypto"
import { Flag, installAutomaticServerPassword } from "@/flag/flag"
import { Server } from "@/server/server"
import { serverAuthHeaders } from "@/server/auth"

export type WorkerListenerInput = Partial<Omit<Parameters<typeof Server.listen>[0], "llm" | "audio" | "childEnv">> & {
  http?: boolean
}

export type WorkerListenerResult =
  | { ok: true; url: string; headers?: { Authorization: string } }
  | { ok: false; error: string }

export function createWorkerListener(input: { directory: string; listen?: typeof Server.listen }) {
  let active: Server.Listener | undefined
  let pending: Promise<Server.Listener | undefined> | undefined
  let closing = false
  let stopping: Promise<void> | undefined
  let release: (() => void) | undefined

  const clearAuthentication = () => {
    release?.()
    release = undefined
  }

  return {
    async start(options: WorkerListenerInput = {}): Promise<WorkerListenerResult> {
      if (closing) return { ok: false, error: "The model API listener is shutting down." }
      if (!active && !pending) {
        if (!Flag.MIMOCODE_SERVER_PASSWORD)
          release = installAutomaticServerPassword(randomBytes(32).toString("base64url"))
        const { http, ...network } = options
        pending = Promise.resolve()
          .then(() =>
            (input.listen ?? Server.listen)({
              ...network,
              port: options.port ?? 0,
              hostname: options.hostname ?? "127.0.0.1",
              llm: { directory: input.directory },
            }),
          )
          .then(async (listener) => {
            if (closing) {
              await listener.stop(true)
              return undefined
            }
            active = listener
            return listener
          })
          .catch(() => {
            clearAuthentication()
            return undefined
          })
          .finally(() => {
            pending = undefined
          })
      }
      const listener = active ?? (await pending)
      if (!listener || closing) {
        // RPC has no rejection envelope. Return only a bounded, non-secret error.
        return {
          ok: false,
          error: "Model API listener startup failed; check its address, port and operator authentication settings.",
        }
      }
      return {
        ok: true,
        url: listener.url.toString(),
        ...(options.http ? { headers: serverAuthHeaders() } : {}),
      }
    },
    stop() {
      // Close admission synchronously, including while listen() is still pending.
      closing = true
      stopping ??= (async () => {
        const listener = active ?? (await pending)
        if (listener) await listener.stop(true)
        active = undefined
      })()
      return stopping
    },
    // Keep authentication alive during checkpoint/Instance disposal. Only the
    // worker's finalizer releases it, after terminal Bus events have been sent.
    clearAuthentication,
  }
}
