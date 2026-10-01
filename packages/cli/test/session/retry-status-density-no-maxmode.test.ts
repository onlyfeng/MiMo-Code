import { describe, expect, test } from "bun:test"
import { SessionRetry } from "../../src/session/retry"

// FC-013 keeps scope budgets. Actual status density is verified by the
// real unreachable-provider tests in retry-density-invalid-baseurl.test.ts.
describe("retry scope budgets without maxMode", () => {
  test("keeps request network retries bounded and live network retries persistent", () => {
    const resolved = SessionRetry.resolve(undefined, "test")
    expect(SessionRetry.budgetFor(resolved, {
      retryable: true, phase: "request", scope: "request", kind: "network", message: "network",
    })).toMatchObject({ mode: "bounded", maxRetries: 4, initialDelayMs: 200 })
    expect(SessionRetry.budgetFor(resolved, {
      retryable: true, phase: "stream", scope: "live-step", kind: "network", message: "network",
    })).toMatchObject({ mode: "persistent", maxElapsedMs: 0, initialDelayMs: 5000 })
  })

  test("request scope honors explicit budget overrides for every recoverable kind", () => {
    const resolved = SessionRetry.resolve({ retry: { request: { maxRetries: 2, initialDelayMs: 250 } } })
    for (const kind of ["network", "server", "rate_limit", "stream", "unknown"] as const) {
      expect(SessionRetry.budgetFor(resolved, {
        retryable: true, phase: "request", scope: "request", kind, message: "retry",
      })).toMatchObject({ mode: "bounded", maxRetries: 2, initialDelayMs: 250 })
    }
  })
})
