/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { SDKProvider, useSDK } from "../../../src/cli/cmd/tui/context/sdk"
import { createWorkerListener } from "../../../src/cli/cmd/tui/worker-listener"
import { AppRuntime } from "../../../src/effect/app-runtime"
import { Instance } from "../../../src/project/instance"
import * as BashInteractive from "../../../src/tool/bash-interactive"
import { tmpdir } from "../../fixture/fixture"

test("SDK raw HTTP fetch authenticates interactive replies and workspace adaptor requests", async () => {
  await using tmp = await tmpdir({ git: true, root: "cwd" })
  await Instance.provide({ directory: tmp.path, async fn() {
    const listener = createWorkerListener({ directory: tmp.path })
    const started = await listener.start({ http: true })
    if (!started.ok) throw new Error(started.error)
    let sdk: ReturnType<typeof useSDK> | undefined
    function Probe() { sdk = useSDK(); return <box /> }
    const app = await testRender(() => (
      <SDKProvider url={started.url} directory={tmp.path} headers={started.headers}
        events={{ subscribe: async () => () => {} }}><Probe /></SDKProvider>
    ))
    const result = AppRuntime.runPromise(BashInteractive.Service.use(service => service.request({
      command: "true", cwd: tmp.path, description: "HTTP TUI interactive reply fixture",
    }))).catch(error => error)
    try {
      await app.renderOnce()
      if (!sdk) throw new Error("SDK context not mounted")
      const pending = await AppRuntime.runPromise(BashInteractive.Service.use(service => service.list()))
      expect(pending).toHaveLength(1)
      const reply = new URL(`/bash-interactive/${pending[0].id}/reply`, started.url)
      reply.searchParams.set("directory", tmp.path)
      const body = JSON.stringify({ output: "interactive result", exitCode: 0 })
      expect((await fetch(reply, { method: "POST", headers: { "Content-Type": "application/json" }, body })).status).toBe(401)
      const response = await sdk.fetch(reply, {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
      })
      expect(response.status).toBe(200)
      expect(await result).toEqual({ output: "interactive result", exitCode: 0 })
      expect(await AppRuntime.runPromise(BashInteractive.Service.use(service => service.list()))).toEqual([])
      const adaptor = new URL("/experimental/workspace/adaptor", started.url)
      adaptor.searchParams.set("directory", tmp.path)
      expect((await sdk.fetch(adaptor)).status).toBe(200)
    } finally {
      app.renderer.destroy()
      await listener.stop()
      await Instance.dispose()
      listener.clearAuthentication()
      await result
    }
  } })
}, 20000)

test("SDK raw fetch preserves Request and init headers without sending context credentials to another origin", async () => {
  const received: { headers: Headers; body: string }[] = []
  const server = Bun.serve({ port: 0, async fetch(request) { received.push({ headers: new Headers(request.headers), body: await request.text() }); return new Response("ok") } })
  const foreign = Bun.serve({ port: 0, async fetch(request) { received.push({ headers: new Headers(request.headers), body: await request.text() }); return new Response("ok") } })
  let sdk: ReturnType<typeof useSDK> | undefined
  function Probe() { sdk = useSDK(); return <box /> }
  const app = await testRender(() => (
    <SDKProvider url={server.url.toString()} headers={{ Authorization: "Basic context", "x-default": "default" }}
      events={{ subscribe: async () => () => {} }}><Probe /></SDKProvider>
  ))
  try {
    await app.renderOnce()
    if (!sdk) throw new Error("SDK context not mounted")
    const controller = new AbortController()
    await sdk.fetch(new Request(server.url, { method: "POST", body: "request-body", headers: { "content-type": "text/plain" }, signal: controller.signal }))
    expect(received[0].headers.get("authorization")).toBe("Basic context")
    expect(received[0].headers.get("content-type")).toBe("text/plain")
    expect(received[0].body).toBe("request-body")
    await sdk.fetch(server.url, { headers: { "x-default": "caller", "Authorization": "Basic caller" } })
    expect(received[1].headers.get("x-default")).toBe("caller")
    expect(received[1].headers.get("authorization")).toBe("Basic caller")
    await sdk.fetch(foreign.url)
    expect(received[2].headers.get("authorization")).toBeNull()
    controller.abort()
    await expect(sdk.fetch(server.url, { signal: controller.signal })).rejects.toBeDefined()
  } finally {
    app.renderer.destroy()
    await server.stop(true)
    await foreign.stop(true)
  }
})
