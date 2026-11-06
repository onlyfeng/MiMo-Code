import { describe, expect } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Effect, Layer } from "effect"
import { Snapshot } from "../../src/snapshot"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(Snapshot.defaultLayer, CrossSpawnSpawner.defaultLayer))

const write = (dir: string, file: string, text: string) =>
  Effect.promise(() => fs.writeFile(path.join(dir, file), text))

// Tracks the worktree, lets `change` edit it, tracks again, and diffs the two.
const diffAround = Effect.fnUntraced(function* (dir: string, change: Effect.Effect<void>) {
  const snapshot = yield* Snapshot.Service
  const before = yield* snapshot.track()
  expect(before).toBeTruthy()
  yield* change
  const after = yield* snapshot.track()
  expect(after).toBeTruthy()
  return yield* snapshot.diffFull(before!, after!)
})

describe("Snapshot.diffFull patch budgets", () => {
  it.live(
    "a file past the per-file budget keeps its counts without a patch",
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          const line = "x".repeat(99) + "\n"
          const lines = Math.ceil(Snapshot.PATCH_FILE_BYTES / line.length) + 1
          const diffs = yield* diffAround(
            dir,
            Effect.all([write(dir, "big.txt", line.repeat(lines)), write(dir, "small.txt", "small content")]).pipe(
              Effect.asVoid,
            ),
          )
          expect(diffs.find((item) => item.file === "big.txt")).toEqual({
            file: "big.txt",
            patch: "",
            additions: lines,
            deletions: 0,
            status: "added",
          })
          expect(diffs.find((item) => item.file === "small.txt")?.patch).toContain("+small content")
        }),
      { git: true },
    ),
  )

  it.live(
    "patching stops once the total budget is spent and every row is kept",
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          // Each file fits the per-file budget; together they overrun the total.
          const size = Math.floor(Snapshot.PATCH_FILE_BYTES * 0.9)
          const count = Math.ceil(Snapshot.PATCH_TOTAL_BYTES / size) + 2
          const names = Array.from({ length: count }, (_, i) => `part-${i.toString().padStart(2, "0")}.txt`)
          const diffs = yield* diffAround(
            dir,
            Effect.forEach(names, (name) => write(dir, name, "y".repeat(size - 1) + "\n"), { discard: true }),
          )
          expect(diffs.map((item) => item.file).toSorted()).toEqual(names)
          expect(diffs.filter((item) => item.patch !== "")).toHaveLength(Math.floor(Snapshot.PATCH_TOTAL_BYTES / size))
          expect(diffs.every((item) => item.additions === 1 && item.status === "added")).toBe(true)
        }),
      { git: true },
    ),
  )

  it.live(
    "a modified file whose blobs fit the budget is still patched",
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* write(dir, "a.txt", "before")
          const diffs = yield* diffAround(dir, write(dir, "a.txt", "changed"))
          expect(diffs).toHaveLength(1)
          expect(diffs[0]?.patch).toContain("+changed")
          expect(diffs[0]?.status).toBe("modified")
        }),
      { git: true },
    ),
  )
})
