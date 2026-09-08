// Run with `bun <file>`, never `bun test`. The parent supplies an isolated home
// and removes experimental/test selectors before either real worker starts.
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import { createConnection } from "node:net"
import { Flag } from "../../src/flag/flag"
import { Global } from "../../src/global"
import { LLMServerTokens } from "../../src/llm-server/tokens"
import { Rpc } from "../../src/util"
import type { rpc } from "../../src/cli/cmd/tui/worker"

async function bounded<T>(work: PromiseLike<T>, label: string, ms = 15_000): Promise<T> {
  const deadline = Promise.withResolvers<never>()
  const timer = setTimeout(() => deadline.reject(new Error(`${label} exceeded ${ms}ms`)), ms)
  try {
    return await Promise.race([work, deadline.promise])
  } finally {
    clearTimeout(timer)
  }
}

const selectors = [
  "MIMOCODE_EXPERIMENTAL",
  "MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH",
  "MIMOCODE_CODEX_MODE",
  "MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL",
  "MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS",
  "MIMOCODE_AUTO_APPROVE_DELETE",
  "MIMOCODE_EXPERIMENTAL_ORCHESTRATOR",
]
assert(selectors.every((key) => process.env[key] === undefined))
assert.equal(Flag.MIMOCODE_EXPERIMENTAL_ORCHESTRATOR, false)
assert.equal(process.env.MIMOCODE_SERVER_PASSWORD, undefined)
assert.equal(process.env.MIMOCODE_DB, undefined)
assert.equal(path.resolve(process.env.MIMOCODE_HOME ?? ""), path.join(process.cwd(), "runtime"))
assert.equal(path.resolve(process.env.HOME ?? ""), path.join(process.cwd(), "home"))

const vendorCalls: string[] = []
const vendor = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    const body = await request.json()
    assert(
      request.headers.get("authorization") === "Bearer fixture-provider-only",
      "Provider must receive only its fixture credential",
    )
    assert.equal(body.model, "chat")
    assert.equal(body.stream, true)
    vendorCalls.push(body.model)
    return new Response(
      [
        { choices: [{ index: 0, delta: { content: "WORKER_REAL_CHAT_91c3" }, finish_reason: null }] },
        {
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        },
      ]
        .map(
          (part) =>
            `data: ${JSON.stringify({ id: "chatcmpl-worker", object: "chat.completion.chunk", model: "chat", ...part })}\n\n`,
        )
        .join("") + "data: [DONE]\n\n",
      { headers: { "content-type": "text/event-stream" } },
    )
  },
})

function spawn() {
  const worker = new Worker(new URL("../../src/cli/cmd/tui/worker.ts", import.meta.url).href, {
    env: Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
    ),
  })
  const failure = Promise.withResolvers<never>()
  // Observe worker errors without emitting RPC data or generated credentials.
  worker.onerror = (event) => {
    event.preventDefault()
    failure.reject(new Error("Real TUI worker failed"))
  }
  void failure.promise.catch(() => {})
  const client = Rpc.client<typeof rpc>(worker)
  return { worker, client, failure, stopped: false }
}
const workers: ReturnType<typeof spawn>[] = []
async function call<T>(item: ReturnType<typeof spawn>, work: PromiseLike<T>, label: string) {
  return bounded(Promise.race([work, item.failure.promise]), label)
}
async function metadataCount() {
  const names = await fs
    .readdir(path.join(Global.Path.state, "llm-server"), { recursive: true })
    .catch((error: unknown) => {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return []
      throw error
    })
  return names.filter((name) => /^server-[A-Za-z0-9_-]+\.json$/.test(path.basename(name))).length
}
async function status(url: string, endpoint: string, headers?: Record<string, string>) {
  const response = await fetch(new URL(endpoint, url), {
    headers: { connection: "close", ...headers },
    signal: AbortSignal.timeout(5000),
  })
  await response.arrayBuffer()
  return response.status
}
async function chat(url: string, token: string) {
  const response = await fetch(new URL("/v1/chat/completions", url), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", connection: "close" },
    body: JSON.stringify({ model: "local/chat", messages: [{ role: "user", content: "Worker API fixture" }] }),
    signal: AbortSignal.timeout(10_000),
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.choices[0].message.content, "WORKER_REAL_CHAT_91c3")
  return response.status
}
async function refused(url: string) {
  return new Promise<boolean>((resolve, reject) => {
    const endpoint = new URL(url)
    const socket = createConnection({ host: endpoint.hostname, port: Number(endpoint.port) })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error("Socket close observation exceeded 2s"))
    }, 2000)
    socket.once("connect", () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(false)
    })
    socket.once("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      socket.destroy()
      if (error.code === "ECONNREFUSED") resolve(true)
      else reject(new Error("Unexpected socket close observation"))
    })
  })
}

try {
  await Bun.write(
    path.join(process.cwd(), "mimocode.json"),
    JSON.stringify({
      enabled_providers: ["local"],
      checkpoint: { thresholds: [] },
      experimental: { predict_next_prompt: false },
      provider: {
        local: {
          npm: "@ai-sdk/openai-compatible",
          options: { apiKey: "fixture-provider-only", baseURL: `http://127.0.0.1:${vendor.port}/v1` },
          models: { chat: { name: "Worker Chat", modalities: { input: ["text"], output: ["text"] } } },
        },
      },
    }),
  )
  const issued = await LLMServerTokens.issue({
    directory: process.cwd(),
    models: ["local/chat"],
    expiry: { idleMs: 3_600_000, maxAgeMs: 86_400_000 },
  })
  assert.deepEqual(await LLMServerTokens.addresses(process.cwd()), [])
  assert.equal(await metadataCount(), 0)

  const first = spawn()
  workers.push(first)
  // Real RPC, with omitted network options: no test-only listener constructor.
  const started = await call(
    first,
    Promise.all([first.client.call("server", undefined), first.client.call("server", undefined)]),
    "default concurrent server RPC",
  )
  assert(started[0].ok && started[1].ok, "Default worker listener must start")
  assert.equal(started[0].url, started[1].url)
  assert.equal(started[0].headers, undefined)
  const firstURL = started[0].url
  assert.equal(new URL(firstURL).hostname, "127.0.0.1")
  const firstAddresses = await LLMServerTokens.addresses(process.cwd())
  assert.equal(firstAddresses.length, 1)
  assert.equal(await metadataCount(), 1)
  const unauthorized = await status(firstURL, "/config")
  assert.equal(unauthorized, 401)
  const rpcFetch = await call(
    first,
    first.client.call("fetch", {
      url: "http://opencode.internal/config",
      method: "GET",
      headers: {},
    }),
    "authenticated RPC fetch",
  )
  assert.equal(rpcFetch.status, 200)
  assert.deepEqual(JSON.parse(rpcFetch.body).enabled_providers, ["local"])
  const firstHTTP = await call(first, first.client.call("server", { http: true }), "HTTP transport credentials")
  assert(firstHTTP.ok && firstHTTP.headers?.Authorization, "HTTP transport must receive internal Basic credentials")
  assert.equal(firstHTTP.url, firstURL)
  assert.equal(await status(firstURL, "/config", firstHTTP.headers), 200)
  const basicModel = await status(firstURL, "/v1/models", firstHTTP.headers)
  assert.equal(basicModel, 401)
  const firstChat = await chat(firstURL, issued.token)

  const second = spawn()
  workers.push(second)
  const secondHTTP = await call(second, second.client.call("server", { http: true }), "second worker default listener")
  assert(secondHTTP.ok && secondHTTP.headers?.Authorization, "Second worker listener must start")
  assert.notEqual(secondHTTP.url, firstURL)
  assert(secondHTTP.headers.Authorization !== firstHTTP.headers.Authorization, "Workers must own distinct credentials")
  const addresses = await LLMServerTokens.addresses(process.cwd())
  assert.equal(addresses.length, 2)
  assert.equal(new Set(addresses.map((entry) => entry.listenerID)).size, 2)
  assert.equal(new Set(addresses.map((entry) => entry.pid)).size, 1)
  assert.equal(addresses[0].pid, process.pid)
  assert.equal(await metadataCount(), 2)
  assert.equal(await status(secondHTTP.url, "/config"), 401)
  assert.equal(await status(secondHTTP.url, "/config", firstHTTP.headers), 401)
  assert.equal(await status(firstURL, "/config", secondHTTP.headers), 401)
  assert.equal(await status(secondHTTP.url, "/config", secondHTTP.headers), 200)
  const secondChat = await chat(secondHTTP.url, issued.token)

  await call(first, first.client.call("shutdown", undefined), "first worker shutdown")
  first.stopped = true
  // Check the real socket and raw registration before terminate() can hide a leak.
  const firstSocketClosed = await refused(firstURL)
  assert(firstSocketClosed)
  const survivors = await LLMServerTokens.addresses(process.cwd())
  assert.deepEqual(
    survivors.map((entry) => entry.listenerID),
    addresses.filter((entry) => entry.url === new URL(secondHTTP.url).origin).map((entry) => entry.listenerID),
  )
  assert.equal(survivors.length, 1)
  assert.equal(await metadataCount(), 1)
  const deniedRestart = await call(first, first.client.call("server", undefined), "closed worker restart")
  assert.equal(deniedRestart.ok, false)
  assert.equal(await metadataCount(), 1)
  const stoppedFetch = await call(
    first,
    first.client.call("fetch", {
      url: "http://opencode.internal/config",
      method: "GET",
      headers: {},
    }),
    "closed worker RPC fetch",
  )
  assert.equal(stoppedFetch.status, 503)
  const survivingChat = await chat(secondHTTP.url, issued.token)

  await call(second, second.client.call("shutdown", undefined), "second worker shutdown")
  second.stopped = true
  const secondSocketClosed = await refused(secondHTTP.url)
  assert(secondSocketClosed)
  assert.deepEqual(await LLMServerTokens.addresses(process.cwd()), [])
  assert.equal(await metadataCount(), 0)
  assert.equal((await LLMServerTokens.verify({ directory: process.cwd(), token: issued.token })).ok, true)
  assert.equal(process.env.MIMOCODE_SERVER_PASSWORD, undefined)
  assert.deepEqual(vendorCalls, ["chat", "chat", "chat"])
  process.stdout.write(
    JSON.stringify({
      runtime: Bun.version,
      childTestPreload: false,
      orchestrator: Flag.MIMOCODE_EXPERIMENTAL_ORCHESTRATOR,
      selectorsAbsent: selectors.every((key) => process.env[key] === undefined),
      workers: 2,
      samePid: true,
      defaultConcurrentStartReused: true,
      httpUnauthorized: unauthorized,
      rpcFetch: rpcFetch.status,
      basicModel,
      bearerChats: [firstChat, secondChat, survivingChat],
      separateCredentials: true,
      rawRegistrationCounts: [0, 1, 2, 1, 0],
      socketsClosedBeforeTermination: [firstSocketClosed, secondSocketClosed],
      restartRejected: !deniedRestart.ok,
      stoppedRpcFetch: stoppedFetch.status,
      tokenStillValid: true,
    }) + "\n",
  )
} finally {
  for (const item of workers) {
    if (!item.stopped)
      await bounded(item.client.call("shutdown", undefined), "failure cleanup shutdown", 2000).catch(() => {})
    item.worker.terminate()
  }
  await vendor.stop(true)
}
