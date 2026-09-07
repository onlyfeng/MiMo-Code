import { describe, expect, test } from "bun:test"
import { setImmediate } from "node:timers/promises"
import { createAudio } from "../../src/server/audio"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

function within<T>(pending: Promise<T>) {
  const deadline = Promise.withResolvers<undefined>()
  const timer = setTimeout(() => deadline.resolve(undefined), 200)
  return Promise.race([pending, deadline.promise]).finally(() => clearTimeout(timer))
}

describe("audio waiting for shared instance bootstrap", () => {
  for (const trigger of ["client cancellation", "listener close"] as const) {
    test(`${trigger} settles before an existing bootstrap is released`, async () => {
      await using tmp = await tmpdir()
      const started = Promise.withResolvers<void>()
      const release = Promise.withResolvers<void>()
      const existing = Instance.provide({
        directory: tmp.path,
        async init() {
          started.resolve()
          await release.promise
        },
        fn() {},
      })
      await started.promise

      const key = "test-audio-key-with-at-least-32-characters"
      const api = createAudio({ key, directory: tmp.path })
      const controller = new AbortController()
      const request = api.app.fetch(
        new Request("http://localhost/v1/audio/speech", {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({ model: "unused/tts", input: "hello" }),
          signal: controller.signal,
        }),
      )
      try {
        // Let the complete local body parse and reach the existing instance gate.
        await setImmediate()
        if (trigger === "client cancellation") controller.abort()
        const closing = trigger === "listener close" ? api.close() : undefined
        const completed = await within(Promise.all([request, closing]))
        expect(completed).toBeDefined()
        expect(completed?.[0].status).toBe(503)
        expect(await completed?.[0].json()).toMatchObject({ error: { message: "Audio request cancelled" } })
        expect(await within(api.close().then(() => true))).toBe(true)
      } finally {
        controller.abort()
        release.resolve()
        await Promise.allSettled([existing, request, api.close()])
        await Instance.disposeAll()
      }
    })
  }
})
