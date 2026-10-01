import { expect, test } from "bun:test"
import { Effect } from "effect"
import { awaitWithHardTimeout } from "../../src/effect/hard-timeout"

test("hard timeout returns while uninterruptible cleanup remains in flight", async () => {
  let release!: () => void
  let complete!: () => void
  let completed = false
  const blocked = new Promise<void>((resolve) => (release = resolve))
  const completion = new Promise<void>((resolve) => (complete = resolve))
  const result = await Promise.race([
    Effect.runPromise(
      awaitWithHardTimeout(
        Effect.uninterruptible(
          Effect.promise(() => blocked).pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                completed = true
                complete()
              }),
            ),
          ),
        ),
        25,
      ),
    ).then(
      () => ({ type: "completed" as const }),
      (error) => ({ type: "failed" as const, error }),
    ),
    Bun.sleep(1_000).then(() => ({ type: "watchdog" as const })),
  ])
  const completedBeforeRelease = completed

  release()
  const cleanupFinished = await Promise.race([
    completion.then(() => true),
    Bun.sleep(1_000).then(() => false),
  ])

  expect(result.type).toBe("failed")
  if (result.type === "failed") expect(result.error).toHaveProperty("_tag", "TimeoutError")
  expect(completedBeforeRelease).toBe(false)
  expect(cleanupFinished).toBe(true)
})

test("hard timeout preserves a cleanup failure", async () => {
  const result = await Effect.runPromise(
    awaitWithHardTimeout(Effect.fail(new Error("cleanup failed")), 100),
  ).then(
    () => ({ type: "completed" as const }),
    (error) => ({ type: "failed" as const, error }),
  )

  expect(result.type).toBe("failed")
  if (result.type !== "failed") return
  expect(result.error).toBeInstanceOf(Error)
  if (result.error instanceof Error) expect(result.error.message).toContain("cleanup failed")
  expect(result.error).not.toHaveProperty("_tag", "TimeoutError")
})

test("hard timeout preserves a cleanup success value", async () => {
  expect(await Effect.runPromise(awaitWithHardTimeout(Effect.succeed(42), 100))).toBe(42)
})
