import { afterEach, describe, expect, test } from "bun:test"
import { createConnection } from "node:net"
import path from "node:path"
import { Flag } from "../../src/flag/flag"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { tmpdir } from "../fixture/fixture"

const key = "test-audio-api-key-01234567890123456789"
const audio = Buffer.from("RIFF....WAVEtest-audio")
const password = Flag.MIMOCODE_SERVER_PASSWORD
const username = Flag.MIMOCODE_SERVER_USERNAME

type Seen = { path: string; auth: string | null; body: Record<string, unknown> }

afterEach(async () => {
  Flag.MIMOCODE_SERVER_PASSWORD = password
  Flag.MIMOCODE_SERVER_USERNAME = username
  await Instance.disposeAll()
})

async function harness(
  fn: (ctx: { url: URL; directory: string; seen: Seen[]; stop: () => Promise<void> }) => Promise<void>,
  input: { enabled?: boolean; vendor?: (request: Request) => Promise<Response> } = {},
) {
  const seen: Seen[] = []
  const vendor = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      const body = (await request.json()) as Record<string, unknown>
      seen.push({ path: new URL(request.url).pathname, auth: request.headers.get("authorization"), body })
      if (input.vendor) return input.vendor(request)
      const message =
        body.model === "tts"
          ? { role: "assistant", content: "", audio: { data: audio.toString("base64"), id: "audio-1" } }
          : { role: "assistant", content: "真实转写结果" }
      return Response.json({ choices: [{ index: 0, message, finish_reason: "stop" }] })
    },
  })
  try {
    await using tmp = await tmpdir({
      root: "cwd",
      config: {
        provider: {
          audiochat: {
            npm: "@ai-sdk/openai-compatible",
            options: { apiKey: "provider-only-secret", baseURL: `http://127.0.0.1:${vendor.port}/v1` },
            models: {
              tts: { name: "TTS", modalities: { input: ["text"], output: ["audio"] } },
              asr: { name: "ASR", modalities: { input: ["audio"], output: ["text"] } },
            },
          },
        },
      },
    })
    const options = {
      hostname: "127.0.0.1",
      port: 0,
      ...(input.enabled === false ? {} : { audio: { key, directory: tmp.path } }),
    }
    const server = await Server.listen(options)
    try {
      await fn({ url: server.url, directory: tmp.path, seen, stop: () => server.stop() })
    } finally {
      await server.stop(true)
      await Instance.disposeAll()
    }
  } finally {
    await vendor.stop(true)
  }
}

function speech(url: URL, body: Record<string, unknown> = {}, headers?: Record<string, string>, signal?: AbortSignal) {
  return fetch(new URL("/v1/audio/speech", url), {
    method: "POST",
    // Each listener fixture owns its sockets. Bun stop(false) can leave pooled
    // keep-alive sockets attached to the retired listener when port 4096 is reused.
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", connection: "close", ...headers },
    body: JSON.stringify({ model: "audiochat/tts", input: "hello", response_format: "wav", ...body }),
    signal,
  })
}

function transcription(url: URL, fields: Record<string, string | File> = {}) {
  const form = new FormData()
  form.set("model", "audiochat/asr")
  form.set("file", new File([audio], "recording.wav", { type: "audio/wav" }))
  Object.entries(fields).forEach(([name, value]) => form.set(name, value))
  return fetch(new URL("/v1/audio/transcriptions", url), {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, connection: "close" },
    body: form,
  })
}

function headersOnly(url: URL, authorization?: string) {
  return new Promise<number>((resolve, reject) => {
    const socket = createConnection({ host: url.hostname, port: Number(url.port) }, () => {
      // No body bytes or request terminator are sent after these headers.
      socket.write(
        [
          "POST /v1/audio/speech HTTP/1.1",
          `Host: ${url.host}`,
          "Content-Type: application/json",
          "Content-Length: 1024",
          ...(authorization ? [`Authorization: ${authorization}`] : []),
          "\r\n",
        ].join("\r\n"),
      )
    })
    const timeout = setTimeout(() => {
      reject(new Error("server waited for an unauthorized request body"))
      socket.destroy()
    }, 2000)
    socket.on("error", reject)
    socket.on("close", () => clearTimeout(timeout))
    socket.once("data", (bytes) => {
      resolve(Number(/^HTTP\/1\.1 (\d{3})/.exec(bytes.toString())?.[1] ?? 0))
      clearTimeout(timeout)
      socket.destroy()
    })
  })
}

function oversizedChunkedBody(url: URL) {
  return new Promise<number>((resolve, reject) => {
    const socket = createConnection({ host: url.hostname, port: Number(url.port) }, () => {
      socket.write(
        [
          "POST /v1/audio/speech HTTP/1.1",
          `Host: ${url.host}`,
          `Authorization: Bearer ${key}`,
          "Content-Type: application/json",
          "Transfer-Encoding: chunked",
          "\r\n",
        ].join("\r\n"),
      )
      const chunk = Buffer.concat([Buffer.from("100000\r\n"), Buffer.alloc(1024 * 1024, "x"), Buffer.from("\r\n")])
      Array.from({ length: 26 }).forEach(() => socket.write(chunk))
      socket.write("0\r\n\r\n")
    })
    const timeout = setTimeout(() => {
      reject(new Error("chunked upload did not receive a response"))
      socket.destroy()
    }, 5000)
    socket.on("error", reject)
    socket.on("close", () => clearTimeout(timeout))
    socket.once("data", (bytes) => {
      resolve(Number(/^HTTP\/1\.1 (\d{3})/.exec(bytes.toString())?.[1] ?? 0))
      clearTimeout(timeout)
      socket.destroy()
    })
  })
}

function deadline<T>(promise: Promise<T>, message: string) {
  const controller = new AbortController()
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), 5000)
      controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true })
    }),
  ]).finally(() => controller.abort())
}

describe("explicit audio HTTP API", () => {
  test("missing, short, or whitespace keys fail before creating an HTTP listener", async () => {
    await using tmp = await tmpdir({ root: "cwd" })
    for (const invalid of ["", "x".repeat(31), " ".repeat(32), "x".repeat(32) + "\n", "密".repeat(32)]) {
      await expect(
        Server.listen({ hostname: "127.0.0.1", port: 0, audio: { key: invalid, directory: tmp.path } }),
      ).rejects.toThrow("32")
    }
    expect(await Instance.peek(tmp.path)).toBeUndefined()
  })

  test("enabled speech returns provider bytes through a real HTTP listener", async () => {
    await harness(async ({ url, seen }) => {
      const response = await speech(url)
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toBe("audio/wav")
      expect(Buffer.from(await response.arrayBuffer())).toEqual(audio)
      expect(seen).toHaveLength(1)
      expect(seen[0]?.path).toBe("/v1/chat/completions")
      expect(seen[0]?.auth).toBe("Bearer provider-only-secret")
      expect(seen[0]?.body.messages).toEqual([{ role: "assistant", content: "hello" }])
    })
  })

  test("enabled transcription returns JSON and text from the real provider", async () => {
    await harness(async ({ url, seen }) => {
      const json = await transcription(url)
      expect(json.status).toBe(200)
      expect(await json.json()).toEqual({ text: "真实转写结果" })
      const text = await transcription(url, { response_format: "text" })
      expect(text.status).toBe(200)
      expect(text.headers.get("content-type")).toContain("text/plain")
      expect(await text.text()).toBe("真实转写结果")
      expect(seen).toHaveLength(2)
      expect(seen.every((entry) => entry.auth === "Bearer provider-only-secret")).toBe(true)
      expect(seen[0]?.body.messages).toEqual([
        {
          role: "user",
          content: [
            { type: "input_audio", input_audio: { data: `data:audio/wav;base64,${audio.toString("base64")}` } },
          ],
        },
      ])
    })
  })

  test("missing and invalid Bearer credentials are rejected before instance creation", async () => {
    await harness(async ({ url, directory, seen }) => {
      await using foreign = await tmpdir({ root: "cwd" })
      await Bun.write(path.join(foreign.path, "mimocode.json"), "{invalid config: must never load}")
      const target = new URL("/v1/audio/speech", url)
      target.searchParams.set("directory", foreign.path)
      for (const authorization of ["", "Bearer wrong", `Basic ${Buffer.from(`mimocode:${key}`).toString("base64")}`]) {
        const response = await fetch(target, {
          method: "POST",
          headers: { authorization, "content-type": "application/json" },
          body: "{malformed JSON: must not parse}",
        })
        expect(response.status).toBe(401)
      }
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(await Instance.peek(foreign.path)).toBeUndefined()
      expect(seen).toHaveLength(0)
    })
  })

  test("unauthorized admission does not wait for the advertised request body", async () => {
    await harness(async ({ url, directory, seen }) => {
      expect(await headersOnly(url)).toBe(401)
      expect(await headersOnly(url, "Bearer invalid")).toBe(401)
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(seen).toHaveLength(0)
    })
  })

  test("directory and workspace redirection is refused before any instance is initialized", async () => {
    await harness(async ({ url, directory, seen }) => {
      await using foreign = await tmpdir({ root: "cwd" })
      const variants: { query?: Record<string, string>; headers?: Record<string, string> }[] = [
        { query: { directory: foreign.path } },
        { headers: { "x-mimocode-directory": foreign.path } },
        { query: { workspace: "foreign-workspace" } },
        { headers: { "x-mimocode-workspace": "foreign-workspace" } },
        { query: { directory }, headers: { "x-mimocode-directory": foreign.path } },
        { query: { workspace: "" } },
        { headers: { "x-mimocode-workspace": "" } },
      ]
      for (const variant of variants) {
        const target = new URL("/v1/audio/speech", url)
        Object.entries(variant.query ?? {}).forEach(([name, value]) => target.searchParams.set(name, value))
        const response = await fetch(target, {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json", ...variant.headers },
          body: JSON.stringify({ model: "audiochat/tts", input: "hello" }),
        })
        expect(response.status).toBe(403)
      }
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(await Instance.peek(foreign.path)).toBeUndefined()
      expect(seen).toHaveLength(0)
    })
  })

  test("an explicit matching directory stays bound to the configured provider", async () => {
    await harness(async ({ url, directory, seen }) => {
      const target = new URL("/v1/audio/speech", url)
      target.searchParams.set("directory", directory)
      const response = await fetch(target, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
          "x-mimocode-directory": directory,
        },
        body: JSON.stringify({ model: "audiochat/tts", input: "hello", response_format: "wav" }),
      })
      expect(response.status).toBe(200)
      expect(Buffer.from(await response.arrayBuffer())).toEqual(audio)
      expect(seen).toHaveLength(1)
      expect((await Instance.peek(directory))?.directory).toBe(directory)
    })
  })

  test("unsupported streaming, speed, and overlong text never reach the provider", async () => {
    await harness(async ({ url, seen }) => {
      for (const body of [{ stream: true }, { stream_format: "sse" }, { speed: 1.5 }, { input: "x".repeat(4097) }]) {
        const response = await speech(url, body)
        expect(response.status).toBe(400)
        expect(await response.text()).not.toContain("provider-only-secret")
      }
      expect(seen).toHaveLength(0)
      const valid = await speech(url, { input: "x".repeat(4096) })
      expect(valid.status).toBe(200)
      expect(seen).toHaveLength(1)
    })
  })

  test("unsupported transcription options are rejected without calling the provider", async () => {
    await harness(async ({ url, seen }) => {
      const invalid: Record<string, string>[] = [
        { stream: "true" },
        { prompt: "hotwords" },
        { temperature: "0.5" },
        { response_format: "srt" },
      ]
      for (const fields of invalid) {
        expect((await transcription(url, fields)).status).toBe(400)
      }
      expect(seen).toHaveLength(0)
    })
  })

  test("a chunked body without Content-Length is limited by its actual bytes", async () => {
    await harness(async ({ url, directory, seen }) => {
      expect(await deadline(oversizedChunkedBody(url), "chunked upload did not finish")).toBe(413)
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(seen).toHaveLength(0)
      expect((await speech(url)).status).toBe(200)
      expect(seen).toHaveLength(1)
    })
  }, 15_000)

  test("audio Bearer does not grant Basic-protected generic API access", async () => {
    Flag.MIMOCODE_SERVER_PASSWORD = "generic-only-password"
    Flag.MIMOCODE_SERVER_USERNAME = "owner"
    await harness(async ({ url, seen }) => {
      const basic = `Basic ${Buffer.from("owner:generic-only-password").toString("base64")}`
      const health = new URL("/global/health", url)
      expect((await fetch(health, { headers: { authorization: `Bearer ${key}` } })).status).toBe(401)
      expect((await fetch(health, { headers: { authorization: basic } })).status).toBe(200)
      expect((await speech(url, {}, { authorization: basic })).status).toBe(401)
      expect((await speech(url)).status).toBe(200)
      expect(seen).toHaveLength(1)
      expect(
        (
          await fetch(new URL("/v1/chat/completions", url), {
            method: "POST",
            headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
            body: "{}",
          })
        ).status,
      ).toBe(404)
    })
  })

  test("only the two POST audio endpoints are exposed", async () => {
    await harness(async ({ url, directory, seen }) => {
      for (const [method, pathname, status] of [
        ["GET", "/v1/audio/speech", 405],
        ["POST", "/v1/audio/voices", 404],
        ["POST", "/v1/audio/translations", 404],
      ] as const) {
        const response = await fetch(new URL(pathname, url), { method, headers: { authorization: `Bearer ${key}` } })
        expect(response.status).toBe(status)
      }
      expect(await Instance.peek(directory)).toBeUndefined()
      expect(seen).toHaveLength(0)
    })
  })

  test("a third concurrent request is refused and capacity returns after completion", async () => {
    const started = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    let calls = 0
    await harness(
      async ({ url, seen }) => {
        const pending = [speech(url), speech(url)]
        try {
          await deadline(
            Promise.race([
              started.promise,
              Promise.all(pending).then((responses) => {
                throw new Error(
                  `requests ended before provider admission: ${responses.map((response) => response.status)}`,
                )
              }),
            ]),
            "provider did not receive two concurrent requests",
          )
          expect((await speech(url)).status).toBe(429)
          expect(seen).toHaveLength(2)
        } finally {
          release.resolve()
          await Promise.allSettled(pending)
        }
        expect((await speech(url)).status).toBe(200)
        expect(seen).toHaveLength(3)
      },
      {
        vendor: async () => {
          if (++calls === 2) started.resolve()
          await release.promise
          return Response.json({ choices: [{ message: { audio: { data: audio.toString("base64") } } }] })
        },
      },
    )
  }, 15_000)

  test("stop aborts in-flight provider work before waiting for the listener to close", async () => {
    const started = Promise.withResolvers<void>()
    const aborted = Promise.withResolvers<void>()
    await harness(
      async ({ url, stop, seen }) => {
        const pending = speech(url).then(
          (response) => response.status,
          () => 0,
        )
        await deadline(
          Promise.race([
            started.promise,
            pending.then((status) => {
              throw new Error(`request ended before provider admission: ${status}`)
            }),
          ]),
          "provider did not receive the request",
        )
        const closing = stop()
        await deadline(aborted.promise, "stop did not abort the upstream HTTP request")
        expect([0, 503]).toContain(await pending)
        await deadline(closing, "stop waited indefinitely for an in-flight audio request")
        const late = await speech(url).then(
          (response) => response.status,
          () => 0,
        )
        expect([0, 503]).toContain(late)
        expect(seen).toHaveLength(1)
      },
      {
        vendor: async (request) => {
          started.resolve()
          await new Promise<void>((resolve) => {
            const abort = () => {
              aborted.resolve()
              resolve()
            }
            if (request.signal.aborted) return abort()
            request.signal.addEventListener("abort", abort, { once: true })
          })
          return new Response(null, { status: 499 })
        },
      },
    )
  }, 15_000)

  test("client cancellation aborts provider work and releases its concurrency slot", async () => {
    const admitted = Promise.withResolvers<void>()
    const replacement = Promise.withResolvers<void>()
    const aborted = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const controller = new AbortController()
    let calls = 0
    await harness(
      async ({ url, seen }) => {
        const first = speech(url, {}, undefined, controller.signal).then(
          (response) => response.status,
          () => 0,
        )
        const second = speech(url).then((response) => response.status)
        try {
          await deadline(
            Promise.race([
              admitted.promise,
              Promise.all([first, second]).then((statuses) => {
                throw new Error(`requests finished before admission: ${statuses}`)
              }),
            ]),
            "two requests were not admitted",
          )
          expect((await speech(url)).status).toBe(429)
          controller.abort()
          expect(await first).toBe(0)
          await deadline(aborted.promise, "client cancellation did not abort provider HTTP")
          const next = speech(url)
          await deadline(
            Promise.race([
              replacement.promise,
              next.then((response) => {
                throw new Error(`replacement request was not admitted: ${response.status}`)
              }),
            ]),
            "cancellation did not release the admission slot",
          )
          expect(seen).toHaveLength(3)
          release.resolve()
          expect((await next).status).toBe(200)
          expect(await second).toBe(200)
        } finally {
          controller.abort()
          release.resolve()
          await Promise.allSettled([first, second])
        }
      },
      {
        vendor: async (request) => {
          if (++calls === 2) admitted.resolve()
          if (calls === 3) replacement.resolve()
          await Promise.race([
            release.promise,
            new Promise<void>((resolve) => {
              const cancel = () => {
                aborted.resolve()
                resolve()
              }
              if (request.signal.aborted) return cancel()
              request.signal.addEventListener("abort", cancel, { once: true })
            }),
          ])
          return Response.json({ choices: [{ message: { audio: { data: audio.toString("base64") } } }] })
        },
      },
    )
  }, 15_000)

  test("a non-test child keeps audio and models off even when an API key exists in the environment", async () => {
    await using tmp = await tmpdir({ root: "cwd" })
    const env: NodeJS.ProcessEnv = { ...process.env, MIMOCODE_AUDIO_API_KEY: key }
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
      cmd: [process.execPath, path.join(import.meta.dir, "../fixture/audio-api-default-child.ts")],
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
  }, 15_000)
})
