/** @jsxImportSource @opentui/solid */
import { describe, expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { GlobalEvent } from "@mimo-ai/sdk/v2"
import { onMount } from "solid-js"
import { ArgsProvider } from "../../../src/cli/cmd/tui/context/args"
import { ExitProvider } from "../../../src/cli/cmd/tui/context/exit"
import { ProjectProvider, useProject } from "../../../src/cli/cmd/tui/context/project"
import { SDKProvider } from "../../../src/cli/cmd/tui/context/sdk"
import { SyncProvider, useSync } from "../../../src/cli/cmd/tui/context/sync"

const DIR = "/tmp/example"

async function wait(fn: () => boolean, timeout = 10_000) {
  const start = Date.now()
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error("timed out waiting for condition")
    await Bun.sleep(5)
  }
}

// HTTP double for the bootstrap routes. `failNext` makes the next config read
// fail, as a server whose freshly booted instance cannot open its state does.
function createFetch() {
  let failures = 0
  let configReads = 0
  let branch = "before"
  const body = (path: string, directory?: string): unknown => {
    if (path === "/path") return { home: "/home", state: "/state", config: "/config", worktree: "", directory: directory ?? "" }
    if (path === "/project/current") return { id: "p" }
    if (path === "/config/providers") return { providers: [], default: {} }
    if (path === "/provider") return { all: [], default: {}, connected: [], authenticated: [] }
    if (path === "/vcs") return { branch }
    if (path === "/session") return []
    if (path === "/agent" || path === "/command" || path === "/experimental/workspace") return []
    if (path === "/experimental/workspace/status" || path === "/lsp" || path === "/formatter") return []
    return {}
  }
  const fetcher = (async (request: Request) => {
    const url = new URL(request.url)
    const raw = url.searchParams.get("directory")
    if (url.pathname === "/config/providers") {
      configReads += 1
      if (failures > 0) {
        failures -= 1
        return new Response(JSON.stringify({ name: "UnknownError", data: { message: "database is locked" } }), {
          status: 500,
          headers: { "content-type": "application/json" },
        })
      }
    }
    return new Response(JSON.stringify(body(url.pathname, raw ? decodeURIComponent(raw) : undefined)), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as unknown as typeof fetch
  return {
    fetch: fetcher,
    failNext: (count: number) => { failures = count },
    setBranch: (value: string) => { branch = value },
    configReads: () => configReads,
  }
}

function createEvents() {
  let fn: ((event: GlobalEvent) => void) | undefined
  return {
    subscribe: async (handler: (event: GlobalEvent) => void) => {
      fn = handler
      return () => { if (fn === handler) fn = undefined }
    },
    emit: (event: GlobalEvent) => fn?.(event),
  }
}

describe("tui refresh after instance disposal", () => {
  test("a refresh that fails while the server reboots its instance retries instead of exiting", async () => {
    const http = createFetch()
    const events = createEvents()
    let exited = 0
    let ctx!: { sync: ReturnType<typeof useSync>; project: ReturnType<typeof useProject> }
    let done!: () => void
    const ready = new Promise<void>((resolve) => { done = resolve })
    function Probe() {
      const sync = useSync()
      const project = useProject()
      onMount(() => {
        ctx = { sync, project }
        done()
      })
      return <box />
    }
    const app = await testRender(() => (
      <SDKProvider url="http://test" directory={DIR} fetch={http.fetch} events={events}>
        <ProjectProvider>
          <ArgsProvider>
            <ExitProvider onExit={async () => { exited += 1 }}>
              <SyncProvider>
                <Probe />
              </SyncProvider>
            </ExitProvider>
          </ArgsProvider>
        </ProjectProvider>
      </SDKProvider>
    ))
    try {
      await ready
      await wait(() => ctx.sync.data.vcs?.branch === "before" && ctx.project.instance.directory() === DIR)
      const reads = http.configReads()

      http.failNext(1)
      http.setBranch("after")
      events.emit({ directory: DIR, payload: { type: "server.instance.disposed", properties: { directory: DIR } } } as GlobalEvent)

      // The failed attempt is followed by a retry that reaches the fresh instance.
      await wait(() => ctx.sync.data.vcs?.branch === "after")
      expect(http.configReads()).toBeGreaterThanOrEqual(reads + 2)
      expect(exited).toBe(0)
    } finally {
      app.renderer.destroy()
    }
  }, 30_000)
})
