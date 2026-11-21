/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { ArgsProvider } from "../../../src/cli/cmd/tui/context/args"
import { ExitProvider } from "../../../src/cli/cmd/tui/context/exit"
import { ProjectProvider } from "../../../src/cli/cmd/tui/context/project"
import { SDKProvider, useSDK } from "../../../src/cli/cmd/tui/context/sdk"
import { SyncProvider, useSync } from "../../../src/cli/cmd/tui/context/sync"

const directory = "/tmp/example"

async function waitFor(ready: () => boolean) {
  const start = Date.now()
  while (!ready()) {
    if (Date.now() - start > 2000) throw new Error("TUI command condition was not reached")
    await Bun.sleep(5)
  }
}

// FC-005: command listing no longer waits for MCP servers, so slash completion
// must pick up MCP prompt commands that settle after the bootstrap listing.
test("refetches the command list when commands are updated", async () => {
  let commands: { name: string; source: string; hints: string[] }[] = []
  let listed = 0
  const fetcher: typeof fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      if (url.pathname === "/command") {
        listed++
        return Response.json(commands)
      }
      if (url.pathname === "/path") return Response.json({ directory, home: "", state: "", config: "", worktree: "" })
      if (url.pathname === "/project/current") return Response.json({ id: "project_example" })
      if (url.pathname === "/config/providers") return Response.json({ providers: [], default: {} })
      if (url.pathname === "/provider") return Response.json({ all: [], default: {}, connected: [], authenticated: [] })
      if (
        url.pathname.startsWith("/session") ||
        ["/agent", "/lsp", "/formatter", "/experimental/workspace", "/experimental/workspace/status"].includes(
          url.pathname,
        )
      )
        return Response.json([])
      return Response.json({})
    },
    { preconnect: fetch.preconnect },
  )
  const context = {} as { sdk: ReturnType<typeof useSDK>; sync: ReturnType<typeof useSync> }
  function Probe() {
    context.sdk = useSDK()
    context.sync = useSync()
    return <box />
  }
  const app = await testRender(() => (
    <SDKProvider url="http://test" directory={directory} fetch={fetcher} events={{ subscribe: async () => () => {} }}>
      <ProjectProvider>
        <ArgsProvider>
          <ExitProvider>
            <SyncProvider>
              <Probe />
            </SyncProvider>
          </ExitProvider>
        </ArgsProvider>
      </ProjectProvider>
    </SDKProvider>
  ))
  try {
    await waitFor(() => context.sync?.data.status === "complete" && listed === 1)
    expect(context.sync.data.command).toEqual([])

    commands = [{ name: "late:late-prompt", source: "mcp", hints: [] }]
    context.sdk.event.emit("event", { directory, payload: { type: "command.updated", properties: {} } })
    await waitFor(() => context.sync.data.command.length === 1)
    expect(context.sync.data.command.map((item) => item.name)).toEqual(["late:late-prompt"])
    expect(listed).toBe(2)
  } finally {
    app.renderer.destroy()
  }
})
