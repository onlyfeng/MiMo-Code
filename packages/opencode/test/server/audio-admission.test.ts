import { afterEach, expect, test } from "bun:test"
import { Server } from "../../src/server/server"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

afterEach(() => Instance.disposeAll())

test("audio rejects a missing credential before inspecting the requested directory", async () => {
  await using tmp = await tmpdir({ git: true })
  const server = await Server.listen({
    hostname: "127.0.0.1",
    port: 0,
    audio: { key: "test-audio-key-with-at-least-32-characters", directory: tmp.path },
  })
  try {
    const response = await fetch(new URL("/v1/audio/speech?directory=/etc", server.url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
    expect(response.status).toBe(401)
    expect(await Instance.peek(tmp.path)).toBeUndefined()
  } finally {
    await server.stop(true)
  }
})

test("audio refuses an oversized declared body before instance initialization", async () => {
  await using tmp = await tmpdir({ git: true })
  const key = "test-audio-key-with-at-least-32-characters"
  const server = await Server.listen({ hostname: "127.0.0.1", port: 0, audio: { key, directory: tmp.path } })
  try {
    const response = await fetch(new URL("/v1/audio/speech", server.url), {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ input: "x".repeat(25 * 1024 * 1024), model: "fake/tts" }),
    })
    expect(response.status).toBe(413)
    expect(await Instance.peek(tmp.path)).toBeUndefined()
  } finally {
    await server.stop(true)
  }
})
