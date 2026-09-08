import { afterEach, expect, test } from "bun:test"
import { createConnection } from "node:net"
import { Flag } from "../../../src/flag/flag"
import { Instance } from "../../../src/project/instance"
import { Server } from "../../../src/server/server"
import { LLMServerTokens } from "../../../src/llm-server/tokens"
import { serverAuthHeaders } from "../../../src/server/auth"
import { createWorkerListener } from "../../../src/cli/cmd/tui/worker-listener"
import { tmpdir } from "../../fixture/fixture"

const operator = Flag.MIMOCODE_SERVER_PASSWORD
const username = Flag.MIMOCODE_SERVER_USERNAME

afterEach(async () => {
  Flag.MIMOCODE_SERVER_PASSWORD = operator
  Flag.MIMOCODE_SERVER_USERNAME = username
  await Instance.disposeAll()
})

async function status(url: string, endpoint: string, headers?: HeadersInit) {
  const response = await fetch(new URL(endpoint, url), { headers, signal: AbortSignal.timeout(5000) })
  await response.arrayBuffer()
  return response.status
}

function closed(url: string) {
  const target = new URL(url)
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: target.hostname, port: Number(target.port) })
    socket.once("connect", () => {
      socket.destroy()
      resolve(false)
    })
    socket.once("error", () => resolve(true))
    socket.setTimeout(2000, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

test("worker listener authenticates automatically without changing operator directory or bind authority", async () => {
  Flag.MIMOCODE_SERVER_PASSWORD = undefined
  const env = process.env.MIMOCODE_SERVER_PASSWORD
  await using local = await tmpdir({ root: "cwd", config: {} })
  await using outside = await tmpdir({ config: {} })
  const listener = createWorkerListener({ directory: local.path })
  try {
    const result = await listener.start()
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect("headers" in result).toBe(false)
    expect(Boolean(Flag.MIMOCODE_SERVER_PASSWORD)).toBe(true)
    expect(Flag.MIMOCODE_SERVER_OPERATOR_PASSWORD).toBeUndefined()
    expect(process.env.MIMOCODE_SERVER_PASSWORD === env).toBe(true)
    expect(await status(result.url, `/config?directory=${encodeURIComponent(local.path)}`)).toBe(401)
    expect(await status(result.url, `/config?directory=${encodeURIComponent(local.path)}`, serverAuthHeaders())).toBe(
      200,
    )
    for (const endpoint of ["/config", "/session"]) {
      expect(
        await status(result.url, `${endpoint}?directory=${encodeURIComponent(outside.path)}`, serverAuthHeaders()),
      ).toBe(403)
    }
    expect(await status(result.url, "/v1/models", serverAuthHeaders())).toBe(401)
    await expect(Server.listen({ hostname: "0.0.0.0", port: 0 })).rejects.toThrow("Refusing to bind")
    expect(await LLMServerTokens.addresses(local.path)).toHaveLength(1)
    await listener.stop()
    expect(await closed(result.url)).toBe(true)
    expect(await LLMServerTokens.addresses(local.path)).toEqual([])
  } finally {
    await listener.stop()
    listener.clearAuthentication()
  }
  expect(Flag.MIMOCODE_SERVER_PASSWORD).toBeUndefined()
}, 30000)

test("worker listener preserves operator authentication and explicit network permission", async () => {
  Flag.MIMOCODE_SERVER_PASSWORD = "operator-fixture-password"
  Flag.MIMOCODE_SERVER_USERNAME = "operator"
  await using local = await tmpdir({ root: "cwd", config: {} })
  await using outside = await tmpdir({ config: {} })
  const listener = createWorkerListener({ directory: local.path })
  try {
    const result = await listener.start({ http: true })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.headers?.Authorization === serverAuthHeaders()?.Authorization).toBe(true)
    for (const endpoint of ["/config", "/session"]) {
      expect(
        await status(result.url, `${endpoint}?directory=${encodeURIComponent(outside.path)}`, result.headers),
      ).toBe(200)
    }
    const external = await Server.listen({ hostname: "0.0.0.0", port: 0 })
    await external.stop(true)
  } finally {
    await listener.stop()
    listener.clearAuthentication()
  }
  expect(Flag.MIMOCODE_SERVER_OPERATOR_PASSWORD === "operator-fixture-password").toBe(true)
  expect(Flag.MIMOCODE_SERVER_PASSWORD === "operator-fixture-password").toBe(true)
}, 30000)

test("concurrent worker starts share one real socket and shutdown blocks further admission", async () => {
  Flag.MIMOCODE_SERVER_PASSWORD = undefined
  await using tmp = await tmpdir({ root: "cwd", config: {} })
  const listener = createWorkerListener({ directory: tmp.path })
  try {
    const [first, second] = await Promise.all([listener.start(), listener.start({ http: true })])
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) throw new Error("Listener did not start")
    expect(first.url).toBe(second.url)
    expect("headers" in first).toBe(false)
    expect(Boolean(second.headers?.Authorization)).toBe(true)
    expect(await LLMServerTokens.addresses(tmp.path)).toHaveLength(1)
    await Promise.all([listener.stop(), listener.stop()])
    expect(await closed(first.url)).toBe(true)
    expect((await listener.start()).ok).toBe(false)
    expect(await LLMServerTokens.addresses(tmp.path)).toEqual([])
  } finally {
    await listener.stop()
    listener.clearAuthentication()
  }
}, 15000)

for (const bindFirst of [false, true]) {
  test(`worker shutdown joins a pending start with real bind ${bindFirst ? "before" : "after"} the gate`, async () => {
    Flag.MIMOCODE_SERVER_PASSWORD = undefined
    await using tmp = await tmpdir({ root: "cwd", config: {} })
    const entered = Promise.withResolvers<void>()
    const gate = Promise.withResolvers<void>()
    const sockets: Server.Listener[] = []
    const listener = createWorkerListener({
      directory: tmp.path,
      async listen(input) {
        if (bindFirst) sockets.push(await Server.listen(input))
        entered.resolve()
        await gate.promise
        if (!bindFirst) sockets.push(await Server.listen(input))
        return sockets[0]
      },
    })
    const starting = listener.start()
    try {
      await entered.promise
      const stopping = listener.stop()
      expect((await listener.start()).ok).toBe(false)
      gate.resolve()
      expect((await starting).ok).toBe(false)
      await stopping
      expect(sockets).toHaveLength(1)
      expect(await closed(sockets[0].url.toString())).toBe(true)
      expect(await LLMServerTokens.addresses(tmp.path)).toEqual([])
    } finally {
      gate.resolve()
      await listener.stop()
      listener.clearAuthentication()
      // Only failure cleanup; successful close assertions above precede this.
      await Promise.all(sockets.map((socket) => socket.stop(true)))
    }
  }, 15000)
}

test("real occupied port gives a bounded safe result and a later worker start can retry", async () => {
  Flag.MIMOCODE_SERVER_PASSWORD = undefined
  await using tmp = await tmpdir({ root: "cwd", config: {} })
  const occupied = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("occupied") })
  const listener = createWorkerListener({ directory: tmp.path })
  try {
    const failed = await listener.start({ port: occupied.port })
    expect(failed.ok).toBe(false)
    if (failed.ok) throw new Error("Occupied port unexpectedly started")
    expect(failed.error).toContain("listener")
    expect(Flag.MIMOCODE_SERVER_PASSWORD).toBeUndefined()
    expect(await LLMServerTokens.addresses(tmp.path)).toEqual([])
    await occupied.stop(true)
    const retry = await listener.start({ port: occupied.port })
    expect(retry.ok).toBe(true)
    if (!retry.ok) throw new Error(retry.error)
    expect(await status(retry.url, "/global/health", serverAuthHeaders())).toBe(200)
  } finally {
    await occupied.stop(true)
    await listener.stop()
    listener.clearAuthentication()
  }
}, 15000)

test("automatic authentication permits external binding only with the existing explicit noAuth option", async () => {
  Flag.MIMOCODE_SERVER_PASSWORD = undefined
  await using tmp = await tmpdir({ root: "cwd", config: {} })
  const listener = createWorkerListener({ directory: tmp.path })
  try {
    const result = await listener.start({ hostname: "0.0.0.0", noAuth: true, http: true })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(Flag.MIMOCODE_SERVER_OPERATOR_PASSWORD).toBeUndefined()
    expect(Boolean(result.headers?.Authorization)).toBe(true)
    // Explicit network permission does not disable the authentication itself.
    const url = new URL(result.url)
    url.hostname = "127.0.0.1"
    expect(await status(url.toString(), "/config")).toBe(401)
    expect(await status(url.toString(), "/config", result.headers)).toBe(200)
  } finally {
    await listener.stop()
    listener.clearAuthentication()
  }
}, 15000)

test("operator changes override a live automatic credential and survive worker cleanup", async () => {
  Flag.MIMOCODE_SERVER_PASSWORD = undefined
  await using tmp = await tmpdir({ root: "cwd", config: {} })
  const listener = createWorkerListener({ directory: tmp.path })
  try {
    const result = await listener.start({ http: true })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(await status(result.url, "/config", result.headers)).toBe(200)
    Flag.MIMOCODE_SERVER_PASSWORD = "later-operator-fixture"
    expect(await status(result.url, "/config", result.headers)).toBe(401)
    expect(await status(result.url, "/config", serverAuthHeaders())).toBe(200)
    await listener.stop()
    listener.clearAuthentication()
    expect(Flag.MIMOCODE_SERVER_PASSWORD === "later-operator-fixture").toBe(true)
  } finally {
    await listener.stop()
    listener.clearAuthentication()
  }
}, 15000)
