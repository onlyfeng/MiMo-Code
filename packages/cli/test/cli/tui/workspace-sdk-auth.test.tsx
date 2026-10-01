/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { SDKProvider, useSDK } from "../../../src/cli/cmd/tui/context/sdk"
import { openWorkspaceSession } from "../../../src/cli/cmd/tui/component/dialog-workspace-create"

test.each(["http", "rpc"] as const)(
  "workspace scoped SDK retains parent authentication and scope over %s",
  async (transport) => {
    const requests: Request[] = []
    const statuses: number[] = []
    const authorization = "Basic workspace-fixture-credential"
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(request) {
        requests.push(request)
        const status = request.headers.get("authorization") === authorization ? 200 : 401
        statuses.push(status)
        return Response.json(status === 200 ? { id: "workspace-created-session" } : { error: "Unauthorized" }, {
          status,
        })
      },
    })
    const url = `http://127.0.0.1:${server.port}`
    const rpcFetch: typeof fetch = Object.assign(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init)
        const headers = new Headers(request.headers)
        headers.set("Authorization", authorization)
        return fetch(
          new Request(url + new URL(request.url).pathname + new URL(request.url).search, {
            method: request.method,
            headers,
            body: request.body,
          }),
        )
      },
      { preconnect: fetch.preconnect },
    )
    let sdk: ReturnType<typeof useSDK> | undefined
    function Probe() {
      sdk = useSDK()
      return <box />
    }
    const app = await testRender(() => (
      <SDKProvider
        url={transport === "http" ? url : "http://opencode.internal"}
        directory="/parent-directory"
        headers={transport === "http" ? { Authorization: authorization } : undefined}
        fetch={transport === "rpc" ? rpcFetch : undefined}
        events={{ subscribe: async () => () => {} }}
      >
        <Probe />
      </SDKProvider>
    ))
    const navigated: unknown[] = []
    const warnings: unknown[] = []
    let cleared = 0
    try {
      await app.renderOnce()
      if (!sdk) throw new Error("Real SDK context not mounted")
      type Input = Parameters<typeof openWorkspaceSession>[0]
      await openWorkspaceSession({
        sdk,
        workspaceID: "workspace-fixture",
        sync: { path: { directory: "/workspace-directory" } } as Input["sync"],
        dialog: {
          clear: () => {
            cleared++
          },
        } as Input["dialog"],
        route: {
          navigate: (route) => {
            navigated.push(route)
          },
        } as Input["route"],
        toast: {
          show: (message) => {
            warnings.push(message)
          },
        } as Input["toast"],
      })
      expect(statuses).toEqual([200])
      expect(requests[0].headers.get("authorization")).toBe(authorization)
      expect(decodeURIComponent(requests[0].headers.get("x-mimocode-directory") ?? "")).toBe("/workspace-directory")
      expect(requests[0].headers.get("x-mimocode-workspace")).toBe("workspace-fixture")
      expect(navigated).toEqual([{ type: "session", sessionID: "workspace-created-session" }])
      expect(warnings).toEqual([])
      expect(cleared).toBe(1)
    } finally {
      app.renderer.destroy()
      server.stop(true)
    }
  },
)
