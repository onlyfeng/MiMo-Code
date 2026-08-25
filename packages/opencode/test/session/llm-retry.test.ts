import { describe, test, expect } from "bun:test"
import { Effect, Stream } from "effect"
import { isTransientCapacityError, protectRequestReplayBoundary, type Event } from "../../src/session/llm"

describe("protectRequestReplayBoundary", () => {
  test("keeps a raw cause after provider output out of request retry", async () => {
    const reset = Object.assign(new Error("socket connection closed unexpectedly"), { code: "ECONNRESET" })
    let attempts = 0
    const attempt = () => {
      attempts++
      if (attempts > 1)
        return Stream.succeed({ type: "text-delta", id: "replayed", text: "REPLAYED" } as Event)
      return protectRequestReplayBoundary(
        Stream.concat(
          Stream.succeed({ type: "text-delta", id: "committed", text: "COMMITTED" } as Event),
          Stream.fail(reset),
        ),
      )
    }

    const events = await Effect.runPromise(
      attempt().pipe(
        Stream.catchCause(() => attempt()),
        Stream.runCollect,
      ),
    )

    expect(attempts).toBe(1)
    expect(Array.from(events).map((event) => event.type)).toEqual(["text-delta", "error"])
  })

  test("leaves a raw cause before provider output eligible for request retry", async () => {
    const reset = Object.assign(new Error("socket connection closed unexpectedly"), { code: "ECONNRESET" })
    let attempts = 0
    const attempt = () => {
      attempts++
      if (attempts > 1)
        return Stream.succeed({ type: "text-delta", id: "retried", text: "RETRIED" } as Event)
      return protectRequestReplayBoundary(Stream.fail(reset))
    }

    const events = await Effect.runPromise(
      attempt().pipe(
        Stream.catchCause(() => attempt()),
        Stream.runCollect,
      ),
    )

    expect(attempts).toBe(2)
    expect(Array.from(events).map((event) => event.type)).toEqual(["text-delta"])
  })
})

describe("isTransientCapacityError", () => {
  test("returns false for plain Error", () => {
    expect(isTransientCapacityError(new Error("boom"))).toBe(false)
  })

  test("returns false for non-Error inputs", () => {
    expect(isTransientCapacityError(undefined)).toBe(false)
    expect(isTransientCapacityError(null)).toBe(false)
    expect(isTransientCapacityError("oops")).toBe(false)
    expect(isTransientCapacityError({ status: 503 })).toBe(false)
  })

  test("returns true for retryable HTTP statuses on a top-level Error", () => {
    for (const status of [429, 500, 502, 503, 504, 529]) {
      const err = Object.assign(new Error("server"), { status })
      expect(isTransientCapacityError(err)).toBe(true)
    }
  })

  test("returns true for retryable HTTP status nested under .response", () => {
    const err = Object.assign(new Error("nested"), { response: { status: 502 } })
    expect(isTransientCapacityError(err)).toBe(true)
  })

  test("returns false for non-retryable HTTP statuses", () => {
    for (const status of [400, 401, 403, 404, 422, 501, 505]) {
      const err = Object.assign(new Error("client"), { status })
      expect(isTransientCapacityError(err)).toBe(false)
    }
  })

  test("returns true for network error codes", () => {
    for (const code of ["ECONNRESET", "EPIPE", "ETIMEDOUT"]) {
      const err = Object.assign(new Error("net"), { code })
      expect(isTransientCapacityError(err)).toBe(true)
    }
  })

  test("returns false for unrelated error codes", () => {
    const err = Object.assign(new Error("fs"), { code: "ENOENT" })
    expect(isTransientCapacityError(err)).toBe(false)
  })

  test("returns true for SSE read timeout (provider.ts wrapSSE)", () => {
    expect(isTransientCapacityError(new Error("SSE read timed out"))).toBe(true)
  })

  test("returns false for an unrelated 'timed out' message", () => {
    expect(isTransientCapacityError(new Error("connection timed out after 30s"))).toBe(false)
  })

  test("returns false for a user-initiated AbortError", () => {
    const err = new DOMException("user aborted", "AbortError")
    expect(isTransientCapacityError(err)).toBe(false)
  })
})
