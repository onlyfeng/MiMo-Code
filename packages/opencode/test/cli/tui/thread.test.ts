import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { tmpdir } from "../../fixture/fixture"
import * as App from "../../../src/cli/cmd/tui/app"
import { Rpc } from "../../../src/util"
import { UI } from "../../../src/cli/ui"
import * as Timeout from "../../../src/util/timeout"
import * as Network from "../../../src/cli/network"
import * as Win32 from "../../../src/cli/cmd/tui/win32"
import { TuiConfig } from "../../../src/cli/cmd/tui/config/tui"

const stop = new Error("stop")
const seen = {
  tui: [] as string[],
}

function setup() {
  // Intentionally avoid mock.module() here: Bun keeps module overrides in cache
  // and mock.restore() does not reset mock.module values. If this switches back
  // to module mocks, later suites can see mocked @/config/tui and fail (e.g.
  // plugin-loader tests expecting real TuiConfig.waitForDependencies). See:
  // https://github.com/oven-sh/bun/issues/7823 and #12823.
  spyOn(App, "tui").mockImplementation(async (input) => {
    if (input.directory) seen.tui.push(input.directory)
    throw stop
  })
  spyOn(Rpc, "client").mockImplementation(() => ({
    call: async () => ({ ok: true, url: "http://127.0.0.1" }) as never,
    on: () => () => {},
  }))
  spyOn(UI, "error").mockImplementation(() => {})
  spyOn(Timeout, "withTimeout").mockImplementation((input) => input)
  spyOn(Network, "resolveNetworkOptions").mockResolvedValue({
    mdns: false,
    port: 0,
    hostname: "127.0.0.1",
    mdnsDomain: "opencode.local",
    cors: [],
    noAuth: false,
  })
  spyOn(Win32, "win32DisableProcessedInput").mockImplementation(() => {})
  spyOn(Win32, "win32InstallCtrlCGuard").mockReturnValue(undefined)
}

describe("tui thread", () => {
  afterEach(() => {
    mock.restore()
  })

  async function call(project?: string, override?: { port?: number; "no-auth"?: boolean }) {
    const { TuiThreadCommand } = await import("../../../src/cli/cmd/tui/thread")
    const args: Parameters<NonNullable<typeof TuiThreadCommand.handler>>[0] = {
      _: [],
      $0: "opencode",
      project,
      prompt: "hi",
      model: undefined,
      agent: undefined,
      session: undefined,
      continue: false,
      fork: false,
      "never-ask": false,
      neverAsk: false,
      trust: true,
      "dangerously-skip-permissions": false,
      dangerouslySkipPermissions: false,
      port: 0,
      hostname: "127.0.0.1",
      mdns: false,
      "mdns-domain": "opencode.local",
      mdnsDomain: "opencode.local",
      cors: [],
      "no-auth": false,
      noAuth: false,
    }
    return TuiThreadCommand.handler({ ...args, ...override })
  }

  async function check(project?: string) {
    setup()
    await using tmp = await tmpdir({ git: true })
    const cwd = process.cwd()
    const pwd = process.env.PWD
    const worker = globalThis.Worker
    const tty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
    const link = path.join(path.dirname(tmp.path), path.basename(tmp.path) + "-link")
    const type = process.platform === "win32" ? "junction" : "dir"
    seen.tui.length = 0
    await fs.symlink(tmp.path, link, type)

    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    })
    globalThis.Worker = class extends EventTarget {
      onerror = null
      onmessage = null
      onmessageerror = null
      postMessage() {}
      terminate() {}
    } as unknown as typeof Worker

    try {
      process.chdir(tmp.path)
      process.env.PWD = link
      await expect(call(project)).rejects.toBe(stop)
      expect(seen.tui[0]).toBe(tmp.path)
    } finally {
      process.chdir(cwd)
      if (pwd === undefined) delete process.env.PWD
      else process.env.PWD = pwd
      if (tty) Object.defineProperty(process.stdin, "isTTY", tty)
      else delete (process.stdin as { isTTY?: boolean }).isTTY
      globalThis.Worker = worker
      await fs.rm(link, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  test("uses the real cwd when PWD points at a symlink", async () => {
    await check()
  })

  test("uses the real cwd after resolving a relative project from PWD", async () => {
    await check(".")
  })

  async function wiring(
    input: {
      external?: boolean
      noAuth?: boolean
      argument?: string
      serverFailure?: boolean
      configFailure?: boolean
      inputFailure?: boolean
      rejectServer?: boolean
      tuiFailure?: boolean
    } = {},
  ) {
    setup()
    await using tmp = await tmpdir({ git: true })
    const cwd = process.cwd()
    const worker = globalThis.Worker
    const tty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
    const argv = process.argv
    if (input.argument) process.argv = [...argv, input.argument]
    const calls: { method: string; input: unknown }[] = []
    const rendered: Parameters<typeof App.tui>[0][] = []
    const errors = spyOn(UI, "error").mockImplementation(() => {})
    let terminated = 0
    globalThis.Worker = class extends EventTarget {
      onerror = null
      onmessage = null
      onmessageerror = null
      postMessage() {}
      terminate() {
        terminated++
      }
    } as unknown as typeof Worker
    Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: !input.inputFailure })
    spyOn(Rpc, "client").mockImplementation(
      () =>
        ({
          call: async (method: string, payload: unknown) => {
            calls.push({ method, input: payload })
            if (method === "server") {
              if (input.rejectServer) throw new Error("RPC startup failed")
              return input.serverFailure
                ? { ok: false, error: "bind failed" }
                : { ok: true, url: "http://127.0.0.1:43210", headers: { Authorization: "Basic fixture-only" } }
            }
          },
          on: () => () => {},
        }) as never,
    )
    spyOn(TuiConfig, "get").mockImplementation(async () => {
      if (input.configFailure) throw new Error("config failed")
      return {} as Awaited<ReturnType<typeof TuiConfig.get>>
    })
    if (input.inputFailure) spyOn(Bun.stdin, "text").mockRejectedValue(new Error("input failed"))
    spyOn(App, "tui").mockImplementation(async (value) => {
      rendered.push(value)
      if (input.tuiFailure) throw stop
    })
    try {
      process.chdir(tmp.path)
      const result = await call(undefined, {
        ...(input.external ? { port: 43210 } : {}),
        "no-auth": input.noAuth ?? false,
      }).then(
        () => undefined,
        (error: unknown) => error,
      )
      // Wait past the actual upgrade delay: a stopped thread must not send a
      // delayed call to a worker it already terminated.
      await new Promise((resolve) => setTimeout(resolve, 1100))
      return { result, calls, rendered, terminated, errors: errors.mock.calls.length }
    } finally {
      process.chdir(cwd)
      globalThis.Worker = worker
      process.argv = argv
      if (tty) Object.defineProperty(process.stdin, "isTTY", tty)
      else delete (process.stdin as { isTTY?: boolean }).isTTY
    }
  }

  test("default startup requests a model listener but keeps RPC transport and clears upgrade work on exit", async () => {
    const result = await wiring()
    expect(result.result).toBeUndefined()
    expect(result.calls).toEqual([
      { method: "server", input: undefined },
      { method: "shutdown", input: undefined },
    ])
    expect(result.terminated).toBe(1)
    expect(result.rendered[0].url).toBe("http://opencode.internal")
    expect(result.rendered[0].fetch).toBeFunction()
    expect(result.rendered[0].events).toBeDefined()
    expect(result.rendered[0].headers).toBeUndefined()
  })

  test("explicit network transport requests credentials and passes only the returned headers to TUI", async () => {
    const result = await wiring({ external: true, noAuth: true })
    expect(result.calls[0]).toMatchObject({ method: "server", input: { port: 43210, http: true, noAuth: true } })
    expect(result.rendered[0]).toMatchObject({
      url: "http://127.0.0.1:43210",
      headers: { Authorization: "Basic fixture-only" },
    })
    expect(result.rendered[0].fetch).toBeUndefined()
    expect(result.rendered[0].events).toBeUndefined()
    expect(result.terminated).toBe(1)
    expect(result.calls.map((call) => call.method)).toEqual(["server", "shutdown"])
  })

  test.each(["--port=0", "--hostname=127.0.0.1"])(
    "explicit default-valued %s still selects authenticated HTTP",
    async (argument) => {
      const result = await wiring({ argument })
      expect(result.calls[0]).toMatchObject({
        method: "server",
        input: { port: 0, hostname: "127.0.0.1", noAuth: false, http: true },
      })
      expect(result.rendered[0].url).toBe("http://127.0.0.1:43210")
      expect(result.rendered[0].headers).toEqual({ Authorization: "Basic fixture-only" })
      expect(result.rendered[0].fetch).toBeUndefined()
    },
  )

  test.each([false, true])(
    "default listener failure falls back to RPC and cleans up, rejected=%s",
    async (rejectServer) => {
      const result = await wiring({ serverFailure: true, rejectServer })
      expect(result.result).toBeUndefined()
      expect(result.rendered[0].url).toBe("http://opencode.internal")
      expect(result.errors).toBe(1)
      expect(result.terminated).toBe(1)
      expect(result.calls.map((call) => call.method)).toEqual(["server", "shutdown"])
    },
  )

  test("explicit listener failure aborts before TUI initialization and still shuts down", async () => {
    const result = await wiring({ external: true, serverFailure: true })
    expect(result.result).toBeInstanceOf(Error)
    expect(result.rendered).toEqual([])
    expect(result.calls.map((call) => call.method)).toEqual(["server", "shutdown"])
    expect(result.terminated).toBe(1)
  })

  test.each(["configFailure", "inputFailure", "tuiFailure"] as const)(
    "cleans up the worker after %s",
    async (failure) => {
      const result = await wiring({ [failure]: true })
      expect(result.result).toBeInstanceOf(Error)
      expect(result.terminated).toBe(1)
      expect(result.calls.filter((call) => call.method === "shutdown")).toHaveLength(1)
      expect(result.calls.some((call) => call.method === "checkUpgrade")).toBe(false)
    },
  )
})
