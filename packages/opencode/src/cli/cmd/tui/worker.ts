import { Installation } from "@/installation"
import { Server } from "@/server/server"
import { Log } from "@/util"
import { Instance } from "@/project/instance"
import { InstanceBootstrap } from "@/project/bootstrap"
import { Rpc } from "@/util"
import { upgrade } from "@/cli/upgrade"
import { Config } from "@/config"
import { GlobalBus } from "@/bus/global"
import { writeHeapSnapshot } from "node:v8"
import { Heap } from "@/cli/heap"
import { AppRuntime } from "@/effect/app-runtime"
import { SessionCheckpoint } from "@/session/checkpoint"
import { ensureProcessMetadata } from "@/util/mimo-process"
import { serverAuthHeader } from "@/server/auth"
import { createWorkerListener, type WorkerListenerInput } from "./worker-listener"

ensureProcessMetadata("worker")

await Log.init({
  print: process.argv.includes("--print-logs"),
  dev: Installation.isLocal(),
  level: (() => {
    if (Installation.isLocal()) return "DEBUG"
    return "INFO"
  })(),
})

Heap.start()

process.on("unhandledRejection", (e) => {
  Log.Default.error("rejection", {
    e: e instanceof Error ? e.message : e,
  })
})

process.on("uncaughtException", (e) => {
  Log.Default.error("exception", {
    e: e instanceof Error ? e.message : e,
  })
})

// Subscribe to global events and forward them via RPC
GlobalBus.on("event", (event) => {
  Rpc.emit("global.event", event)
})

const listener = createWorkerListener({ directory: process.cwd() })
let shutdown: Promise<void> | undefined

export const rpc = {
  async fetch(input: { url: string; method: string; headers: Record<string, string>; body?: string }) {
    if (shutdown) return { status: 503, headers: {}, body: "Worker is shutting down" }
    const headers = { ...input.headers }
    const auth = serverAuthHeader()
    if (auth && !headers["authorization"] && !headers["Authorization"]) {
      headers["Authorization"] = auth
    }
    const request = new Request(input.url, {
      method: input.method,
      headers,
      body: input.body,
    })
    const response = await Server.Default().app.fetch(request)
    const body = await response.text()
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    }
  },
  snapshot() {
    const result = writeHeapSnapshot("server.heapsnapshot")
    return result
  },
  async server(input?: WorkerListenerInput) {
    return listener.start(input).catch(() => ({ ok: false as const, error: "Model API listener startup failed." }))
  },
  async checkUpgrade(input: { directory: string }) {
    await Instance.provide({
      directory: input.directory,
      init: () => AppRuntime.runPromise(InstanceBootstrap),
      fn: async () => {
        await upgrade().catch(() => {})
      },
    })
  },
  async reload() {
    await AppRuntime.runPromise(Config.Service.use((cfg) => cfg.invalidate(true)))
  },
  shutdown() {
    shutdown ??= (async () => {
      Log.Default.info("worker shutting down")
      // Revoke API admission and join even a late listener before any writer or
      // instance teardown. Keep the GlobalBus bridge alive for terminal events.
      await listener.stop().catch(() => Log.Default.warn("listener cleanup failed during shutdown"))
      await Log.flush().catch(() => {})

      // Preserve the existing bounded opportunity for checkpoint writers to
      // finish before Instance disposal interrupts their in-flight work.
      await AppRuntime.runPromise(
        SessionCheckpoint.Service.use((svc) => svc.drainWriters({ timeoutMs: 30_000 })),
      ).catch((error) => Log.Default.warn("checkpoint drain failed during shutdown", { error: String(error) }))
      await Instance.disposeAll().catch(() => Log.Default.warn("instance cleanup failed during shutdown"))
    })().finally(async () => {
      listener.clearAuthentication()
      await Log.shutdown().catch(() => {})
    })
    return shutdown
  },
}

Rpc.listen(rpc)
