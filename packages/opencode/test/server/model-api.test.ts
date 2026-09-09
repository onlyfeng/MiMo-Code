import { afterEach, describe, expect, test } from "bun:test"
import { createConnection } from "node:net"
import fs from "node:fs/promises"
import path from "node:path"
import { Flag } from "../../src/flag/flag"
import { Instance } from "../../src/project/instance"
import { LLMServerTokens } from "../../src/llm-server/tokens"
import { Server } from "../../src/server/server"
import { tmpdir } from "../fixture/fixture"

const password = Flag.MIMOCODE_SERVER_PASSWORD
const username = Flag.MIMOCODE_SERVER_USERNAME
const legacyAudioKey = "test-audio-only-key-01234567890123456789"
const audio = Buffer.from("RIFF....WAVEtest-audio")

afterEach(async () => {
  Flag.MIMOCODE_SERVER_PASSWORD = password
  Flag.MIMOCODE_SERVER_USERNAME = username
  await Instance.disposeAll()
})

type Seen = { auth: string | null; body: Record<string, unknown> }

async function harness(
  fn: (ctx: {
    url: URL
    directory: string
    seen: Seen[]
    stop: () => Promise<void>
    token: string
    issue: (model: string) => Promise<string>
  }) => Promise<void>,
  input: {
    enabled?: boolean
    audio?: boolean
    vendor?: (request: Request, body: Record<string, unknown>) => Promise<Response>
  } = {},
) {
  const seen: Seen[] = []
  const vendor = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      const body = (await request.json()) as Record<string, unknown>
      seen.push({ auth: request.headers.get("authorization"), body })
      if (input.vendor) return input.vendor(request, body)
      const message =
        body.model === "tts"
          ? { role: "assistant", content: "", audio: { data: audio.toString("base64"), id: "audio-1" } }
          : { role: "assistant", content: "本地模型回复" }
      if (body.stream) {
        const base = { id: "chatcmpl-local", object: "chat.completion.chunk", created: 1, model: body.model }
        return new Response(
          [
            { ...base, choices: [{ index: 0, delta: { content: "本地模型回复" }, finish_reason: null }] },
            {
              ...base,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
              usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
            },
          ]
            .map((part) => `data: ${JSON.stringify(part)}\n\n`)
            .join("") + "data: [DONE]\n\n",
          { headers: { "content-type": "text/event-stream" } },
        )
      }
      return Response.json({
        id: "chatcmpl-local",
        object: "chat.completion",
        created: 1,
        model: body.model,
        choices: [{ index: 0, message, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      })
    },
  })
  try {
    await using tmp = await tmpdir({
      root: "cwd",
      config: {
        enabled_providers: ["local"],
        provider: {
          local: {
            npm: "@ai-sdk/openai-compatible",
            options: { apiKey: "provider-only-secret", baseURL: `http://127.0.0.1:${vendor.port}/v1` },
            models: {
              chat: {
                name: "Chat",
                modalities: { input: input.audio ? ["text", "audio"] : ["text"], output: ["text"] },
              },
              other: { name: "Other", modalities: { input: ["text"], output: ["text"] } },
              tts: { name: "TTS", modalities: { input: ["text"], output: ["audio"] } },
              asr: { name: "ASR", modalities: { input: ["audio"], output: ["text"] } },
            },
          },
        },
      },
    })
    const issue = async (model: string) =>
      (
        await LLMServerTokens.issue({
          directory: tmp.path,
          models: [model],
          expiry: { idleMs: 3_600_000, maxAgeMs: 86_400_000 },
        })
      ).token
    const token = await issue("local/chat")
    const server = await Server.listen({
      hostname: "127.0.0.1",
      port: 0,
      ...(input.enabled === false ? {} : { llm: { directory: tmp.path } }),
    })
    try {
      await fn({ url: server.url, directory: tmp.path, seen, token, issue, stop: () => server.stop(true) })
    } finally {
      await server.stop(true)
      await Instance.disposeAll()
    }
  } finally {
    await vendor.stop(true)
  }
}

function request(
  url: URL,
  endpoint: string,
  token?: string,
  body?: Record<string, unknown>,
  extra?: { headers?: Record<string, string>; signal?: AbortSignal },
) {
  return fetch(new URL(endpoint, url), {
    method: body ? "POST" : "GET",
    headers: {
      connection: "close",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...extra?.headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: extra?.signal,
  })
}

function chat(url: URL, token: string, body: Record<string, unknown> = {}, signal?: AbortSignal) {
  return request(
    url,
    "/v1/chat/completions",
    token,
    { model: "local/chat", messages: [{ role: "user", content: "hello" }], ...body },
    { signal },
  )
}

function headersOnly(url: URL, authorization?: string, length = 1024, endpoint = "/v1/chat/completions") {
  return new Promise<number>((resolve, reject) => {
    const socket = createConnection({ host: url.hostname, port: Number(url.port) }, () => {
      socket.write(
        [
          `POST ${endpoint} HTTP/1.1`,
          `Host: ${url.host}`,
          "Content-Type: application/json",
          `Content-Length: ${length}`,
          ...(authorization ? [`Authorization: ${authorization}`] : []),
          "\r\n",
        ].join("\r\n"),
      )
    })
    const timer = setTimeout(() => {
      reject(new Error("authentication waited for request body"))
      socket.destroy()
    }, 2000)
    socket.on("error", reject)
    socket.on("close", () => clearTimeout(timer))
    socket.once("data", (bytes) => {
      resolve(Number(/^HTTP\/1\.1 (\d{3})/.exec(bytes.toString())?.[1] ?? 0))
      clearTimeout(timer)
      socket.destroy()
    })
  })
}

function within<T>(promise: Promise<T>) {
  const timeout = Promise.withResolvers<never>()
  const timer = setTimeout(() => timeout.reject(new Error("operation failed to settle")), 3000)
  return Promise.race([promise, timeout.promise]).finally(() => clearTimeout(timer))
}

function deadline<T>(promise: Promise<T>, message: string) {
  const controller = new AbortController()
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), 20_000)
      controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true })
    }),
  ]).finally(() => controller.abort())
}

describe("explicit model API", () => {
  test("explicit permanent credentials serve requests and revocation rejects later admission before bootstrap", async () => {
    await harness(async ({ url, directory, seen }) => {
      const issued = await LLMServerTokens.issue({
        directory,
        models: ["local/chat"],
        expiry: { idleMs: null, maxAgeMs: null },
      })
      const response = await chat(url, issued.token)
      expect(response.status).toBe(200)
      await response.arrayBuffer()
      expect(await LLMServerTokens.revoke({ directory, id: issued.record.id })).toBe(true)
      await Instance.disposeAll()
      expect((await chat(url, issued.token)).status).toBe(401)
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(seen).toHaveLength(1)
    })
  })

  test("multi-model scope admits each exact member and rejects all other endpoints before bootstrap", async () => {
    await harness(async ({ url, directory, seen }) => {
      const issued = await LLMServerTokens.issue({
        directory,
        models: ["local/chat", "local/other"],
        expiry: { idleMs: 60_000, maxAgeMs: 120_000 },
      })
      expect(
        (await request(url, "/v1/audio/speech", issued.token, { model: "local/tts", input: "hello" })).status,
      ).toBe(404)
      const form = new FormData()
      form.set("model", "local/asr")
      form.set("file", new File([audio], "test.wav", { type: "audio/wav" }))
      expect(
        (
          await fetch(new URL("/v1/audio/transcriptions", url), {
            method: "POST",
            headers: { authorization: `Bearer ${issued.token}` },
            body: form,
          })
        ).status,
      ).toBe(404)
      expect((await chat(url, issued.token, { model: "secret/hidden" })).status).toBe(403)
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(seen).toEqual([])
      const listed = await request(url, "/v1/models", issued.token)
      expect((await listed.json()).data.map((entry: { id: string }) => entry.id)).toEqual(["local/chat", "local/other"])
      for (const model of ["local/chat", "local/other"]) {
        const response = await chat(url, issued.token, { model })
        expect(response.status).toBe(200)
        await response.arrayBuffer()
      }
      expect(seen).toHaveLength(2)
    })
  })

  test("explicit all scope serves chat and rejects removed audio endpoints without escaping its directory", async () => {
    await harness(async ({ url, directory, seen }) => {
      const issued = await LLMServerTokens.issue({
        directory,
        allModels: true,
        expiry: { idleMs: null, maxAgeMs: null },
      })
      expect((await request(url, "/v1/models?directory=/", issued.token)).status).toBe(403)
      await using other = await tmpdir()
      const foreign = await LLMServerTokens.issue({
        directory: other.path,
        allModels: true,
        expiry: { idleMs: 60_000, maxAgeMs: 120_000 },
      })
      expect((await request(url, "/v1/models", foreign.token)).status).toBe(401)
      expect(await Instance.peek(directory)).toBeUndefined()
      const listed = await request(url, "/v1/models", issued.token)
      expect(listed.status).toBe(200)
      expect((await listed.json()).data.map((entry: { id: string }) => entry.id)).toEqual([
        "local/asr",
        "local/chat",
        "local/other",
        "local/tts",
      ])
      const response = await chat(url, issued.token)
      expect(response.status).toBe(200)
      await response.arrayBuffer()
      const speech = await request(url, "/v1/audio/speech", issued.token, { model: "local/tts", input: "hello" })
      expect(speech.status).toBe(404)
      await speech.arrayBuffer()
      const form = new FormData()
      form.set("model", "local/asr")
      form.set("file", new File([audio], "test.wav", { type: "audio/wav" }))
      const transcription = await fetch(new URL("/v1/audio/transcriptions", url), {
        method: "POST",
        headers: { authorization: `Bearer ${issued.token}` },
        body: form,
      })
      expect(transcription.status).toBe(404)
      await transcription.arrayBuffer()
      expect((await chat(url, issued.token, { model: "local/missing" })).status).toBe(404)
      expect(seen).toHaveLength(1)
    })
  })

  test("all issued against an empty registry follows later configured additions and removals", async () => {
    await harness(async ({ url, directory }) => {
      const target = path.join(directory, "mimocode.json")
      const configured = JSON.parse(await fs.readFile(target, "utf8"))
      await fs.writeFile(target, JSON.stringify({ ...configured, enabled_providers: [] }))
      const issued = await LLMServerTokens.issue({
        directory,
        allModels: true,
        expiry: { idleMs: 60_000, maxAgeMs: 120_000 },
      })
      const refs = async () => {
        const response = await request(url, "/v1/models", issued.token)
        expect(response.status).toBe(200)
        return (await response.json()).data.map((entry: { id: string }) => entry.id)
      }
      expect(await refs()).toEqual([])
      await Instance.disposeAll()
      await fs.writeFile(
        target,
        JSON.stringify({
          ...configured,
          enabled_providers: ["local"],
          provider: {
            local: {
              ...configured.provider.local,
              models: { fresh: { name: "Fresh", modalities: { input: ["text"], output: ["text"] } } },
              whitelist: ["fresh"],
            },
          },
        }),
      )
      expect(await refs()).toEqual(["local/fresh"])
      const response = await chat(url, issued.token, { model: "local/fresh" })
      expect(response.status).toBe(200)
      await response.arrayBuffer()
      await Instance.disposeAll()
      await fs.writeFile(target, JSON.stringify({ ...configured, enabled_providers: [] }))
      expect(await refs()).toEqual([])
      expect((await chat(url, issued.token, { model: "local/fresh" })).status).toBe(404)
    })
  })

  test("explicit listener identity is available without initializing a project", async () => {
    await harness(async ({ url, directory }) => {
      const response = await request(url, "/v1/_mimocode")
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ id: expect.any(String) })
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(await LLMServerTokens.addresses(directory)).toHaveLength(1)
    })
  })

  test("credentials alone leave all capability endpoints disabled before instance bootstrap", async () => {
    await harness(
      async ({ url, directory, token }) => {
        for (const endpoint of ["/v1/models", "/v1/chat/completions", "/v1/audio/speech", "/v1/_mimocode"]) {
          const response = await request(url, endpoint, token)
          expect(response.status).toBe(404)
          await response.arrayBuffer()
        }
        expect(await Instance.peek(directory)).toBeUndefined()
        expect(await LLMServerTokens.addresses(directory)).toEqual([])
      },
      { enabled: false },
    )
  })

  test("missing and unknown tokens are rejected before any body bytes or bootstrap", async () => {
    await harness(async ({ url, directory, seen }) => {
      expect(await headersOnly(url)).toBe(401)
      expect(await headersOnly(url, "Bearer unknown-token")).toBe(401)
      expect(await headersOnly(url, `Bearer ${legacyAudioKey}`)).toBe(401)
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(seen).toEqual([])
    })
  })

  test("an authenticated oversized body is refused before reading bytes or bootstrapping", async () => {
    await harness(async ({ url, token, directory, seen }) => {
      expect(await headersOnly(url, `Bearer ${token}`, 25 * 1024 * 1024 + 1)).toBe(413)
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(seen).toEqual([])
    })
  })

  test("tokens cannot select another directory or workspace", async () => {
    await harness(async ({ url, token, directory, seen }) => {
      for (const endpoint of ["/v1/models?directory=/", "/v1/models?workspace=x", "/v1/models?workspaceID=x"]) {
        expect((await request(url, endpoint, token)).status).toBe(403)
      }
      for (const name of ["x-mimocode-directory", "x-mimocode-workspace"]) {
        const headers = { [name]: "/" }
        expect((await request(url, "/v1/models", token, undefined, { headers })).status).toBe(403)
      }
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(seen).toEqual([])
    })
  })

  test("model list contains only token models and completion keeps provider credentials private", async () => {
    await harness(async ({ url, token, seen }) => {
      const listed = await request(url, "/v1/models", token)
      expect(listed.status).toBe(200)
      expect(await listed.json()).toEqual({
        object: "list",
        data: [{ id: "local/chat", object: "model", created: 0, owned_by: "local" }],
      })
      expect(seen).toEqual([])
      const response = await chat(url, token)
      expect(response.status).toBe(200)
      expect(response.headers.get("cache-control")).toBe("no-store")
      expect(await response.json()).toMatchObject({
        choices: [{ message: { content: "本地模型回复" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      })
      expect(seen[0]?.auth).toBe("Bearer provider-only-secret")
      expect(JSON.stringify(seen)).not.toContain(token)
    })
  })

  test("model scope and unsupported requests fail before project initialization", async () => {
    await harness(async ({ url, token, directory, seen }) => {
      const outside = await chat(url, token, { model: "local/other" })
      expect(outside.status).toBe(403)
      expect(await Instance.peek(directory)).toBeUndefined()
      const remoteImage = await chat(url, token, {
        messages: [
          { role: "user", content: [{ type: "image_url", image_url: { url: "ftp://images.example/private" } }] },
        ],
      })
      expect(remoteImage.status).toBe(400)
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(seen).toEqual([])
    })
  })

  test("revocation and directory scope block subsequent admission", async () => {
    await harness(async ({ url, token, directory, seen }) => {
      await using other = await tmpdir()
      const foreign = await LLMServerTokens.issue({
        directory: other.path,
        models: ["local/chat"],
        expiry: { idleMs: 10000, maxAgeMs: 20000 },
      })
      expect((await chat(url, foreign.token)).status).toBe(401)
      await LLMServerTokens.revokeAll({ directory })
      expect((await chat(url, token)).status).toBe(401)
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(seen).toEqual([])
    })
  })

  test("temporary tokens do not replace generic Basic auth and Basic does not authorize models", async () => {
    Flag.MIMOCODE_SERVER_PASSWORD = "generic-only-password"
    Flag.MIMOCODE_SERVER_USERNAME = "mimocode"
    await harness(async ({ url, token }) => {
      expect((await request(url, "/global/health", token)).status).toBe(401)
      const basic = `Basic ${Buffer.from("mimocode:generic-only-password").toString("base64")}`
      expect(
        (await request(url, "/global/health", undefined, undefined, { headers: { authorization: basic } })).status,
      ).toBe(200)
      expect(
        (await request(url, "/v1/models", undefined, undefined, { headers: { authorization: basic } })).status,
      ).toBe(401)
      expect((await request(url, "/v1/models", token)).status).toBe(200)
    })
  })

  test("removed audio endpoints reject matching model tokens before bootstrap", async () => {
    await harness(async ({ url, token, issue, seen, directory }) => {
      for (const credential of [token, await issue("local/tts"), await issue("local/asr")]) {
        for (const endpoint of ["speech", "transcriptions"]) {
          const response = await request(url, `/v1/audio/${endpoint}`, credential, { model: "local/tts" })
          expect(response.status).toBe(404)
        }
      }
      for (const endpoint of ["speech", "transcriptions"]) {
        expect(await headersOnly(url, `Bearer ${token}`, 1024, `/v1/audio/${endpoint}`)).toBe(404)
      }
      expect(seen).toHaveLength(0)
      expect(await Instance.peek(directory)).toBeUndefined()
    })
  })

  test("unknown endpoints and wrong methods cannot reach generic API routing", async () => {
    await harness(async ({ url, token, directory }) => {
      expect((await request(url, "/v1/embeddings", token)).status).toBe(404)
      expect((await request(url, "/v1/chat/completions", token)).status).toBe(405)
      expect((await request(url, "/v1/models", token, {})).status).toBe(405)
      expect(await Instance.peek(directory)).toBeUndefined()
    })
  })

  test("streaming requests retain concurrent admission until cancel and stop withdraws the owned address", async () => {
    const cancelled = new Set<number>()
    let next = 0
    await harness(
      async ({ url, token, stop, directory }) => {
        const first = new AbortController()
        const second = new AbortController()
        const one = await chat(url, token, { stream: true }, first.signal)
        const two = await chat(url, token, { stream: true }, second.signal)
        expect(one.status).toBe(200)
        expect(two.status).toBe(200)
        const r1 = one.body!.getReader()
        const r2 = two.body!.getReader()
        await r1.read()
        await r2.read()
        const drain = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
          while (!(await reader.read()).done) {}
        }
        const drained = Promise.allSettled([drain(r1), drain(r2)])
        expect((await request(url, "/v1/models", token)).status).toBe(429)
        first.abort()
        await within(
          (async () => {
            while (!cancelled.has(1)) await Bun.sleep(10)
          })(),
        )
        // Provider acknowledgement can precede lease cleanup by one microtask.
        await within(
          (async () => {
            while ((await request(url, "/v1/models", token)).status === 429) await Bun.sleep(10)
          })(),
        )
        await within(stop())
        expect(await LLMServerTokens.addresses(directory)).toEqual([])
        await within(
          (async () => {
            while (!cancelled.has(2)) await Bun.sleep(10)
          })(),
        )
        second.abort()
        await Promise.allSettled([r1.cancel(), r2.cancel()])
        await drained
      },
      {
        vendor: async (request, body) => {
          if (!body.stream) return Response.json({})
          const id = ++next
          return new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ id: `chatcmpl-${id}`, object: "chat.completion.chunk", created: 1, model: "chat", choices: [{ index: 0, delta: { content: "hello" }, finish_reason: null }] })}\n\n`,
                  ),
                )
                request.signal.addEventListener(
                  "abort",
                  () => {
                    cancelled.add(id)
                    controller.close()
                  },
                  { once: true },
                )
              },
              cancel() {
                cancelled.add(id)
              },
            }),
            { headers: { "content-type": "text/event-stream" } },
          )
        },
      },
    )
  })
  test("a non-test child keeps audio and models off even when an API key exists in the environment", async () => {
    await using tmp = await tmpdir({ root: "cwd" })
    const env: NodeJS.ProcessEnv = { ...process.env, MIMOCODE_AUDIO_API_KEY: legacyAudioKey }
    for (const name of [
      "MIMOCODE_EXPERIMENTAL",
      "MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH",
      "MIMOCODE_CODEX_MODE",
      "MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL",
      "MIMOCODE_EXPERIMENTAL_ORCHESTRATOR",
      "MIMOCODE_COMPACTION_MAX_CONTEXT",
      "MIMOCODE_COMPACTION_TRIGGER_RATIO",
      "MIMOCODE_DISABLE_CHECKPOINT",
      "MIMOCODE_WORKSPACE_ID",
      "MIMOCODE_SERVER_PASSWORD",
      "MIMOCODE_SERVER_USERNAME",
    ])
      delete env[name]
    const child = Bun.spawn({
      cmd: [process.execPath, path.join(import.meta.dir, "../fixture/model-api-default-child.ts")],
      cwd: tmp.path,
      env,
      stdout: "pipe",
      stderr: "pipe",
    })
    try {
      const [code, stdout, stderr] = await deadline(
        Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]),
        "non-test default-path child did not exit",
      )
      expect(code, stderr).toBe(0)
      expect(JSON.parse(stdout)).toEqual({
        orchestrator: false,
        apiKeyPresent: true,
        statuses: [404, 404, 404, 404],
        initialized: false,
      })
    } finally {
      child.kill()
      await child.exited
    }
  }, 30_000)
})

test("input audio is authenticated and scoped before chat generation", () =>
  harness(
    async ({ url, token, issue, seen }) => {
      const messages = [
        {
          role: "user",
          content: [{ type: "input_audio", input_audio: { data: "data:audio/x-wav;base64,AQID", format: "wav" } }],
        },
      ]
      expect((await chat(url, "invalid-token", { messages })).status).toBe(401)
      expect((await chat(url, await issue("local/other"), { messages })).status).toBe(403)
      const invalid = await chat(url, token, {
        messages: [{ role: "user", content: [{ type: "input_audio", input_audio: { data: "AQI", format: "wav" } }] }],
      })
      expect(invalid.status).toBe(400)
      expect(seen).toHaveLength(0)
      const response = await chat(url, token, { messages })
      expect(response.status).toBe(200)
      expect(await response.text()).toContain("本地模型回复")
      expect(seen).toHaveLength(1)
      expect(seen[0].body.messages).toEqual([
        { role: "user", content: [{ type: "input_audio", input_audio: { data: "AQID", format: "wav" } }] },
      ])
    },
    { audio: true },
  ))
