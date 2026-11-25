import { describe, expect } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Cause, Effect, Exit, Layer } from "effect"
import * as Stream from "effect/Stream"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { Config } from "../../src/config"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Ripgrep } from "../../src/file/ripgrep"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

// DC-RESOURCE-001: the optional `ripgrep` config block bounds each rg process.
const it = testEffect(
  Layer.mergeAll(CrossSpawnSpawner.defaultLayer, AppFileSystem.defaultLayer, Ripgrep.defaultLayer, Config.defaultLayer),
)

const seed = (dir: string) =>
  Effect.promise(async () => {
    await fs.mkdir(path.join(dir, "src", "nested"), { recursive: true })
    for (let i = 0; i < 50; i++) await Bun.write(path.join(dir, "src", `file-${i}.txt`), `needle ${i}\n`)
    await Bun.write(path.join(dir, "src", "nested", "deep.txt"), "needle deep\n")
  })

const failure = <A, E>(exit: Exit.Exit<A, E>) => {
  if (Exit.isSuccess(exit)) throw new Error("expected the ripgrep call to fail")
  const err = Cause.squash(exit.cause)
  if (!(err instanceof Error)) throw new Error(`expected an Error, got ${String(err)}`)
  return err
}

const withLimits = <A, E>(
  ripgrep: Config.Info["ripgrep"],
  body: (dir: string) => Effect.Effect<A, E, Ripgrep.Service>,
) => provideTmpdirInstance((dir) => seed(dir).pipe(Effect.andThen(body(dir))), { git: true, config: { ripgrep } })

describe("ripgrep config limits", () => {
  it.live("a configured timeout stops a search with an actionable error", () =>
    withLimits({ timeout: 1 }, (dir) =>
      Effect.gen(function* () {
        const rg = yield* Ripgrep.Service
        const err = failure(yield* Effect.exit(rg.search({ cwd: dir, pattern: "needle" })))
        expect(err.name).toBe("RipgrepTimeoutError")
        expect(err.message).toContain("ripgrep.timeout")
      }),
    ),
  )

  it.live("a configured timeout stops a file listing", () =>
    withLimits({ timeout: 1 }, (dir) =>
      Effect.gen(function* () {
        const rg = yield* Ripgrep.Service
        const err = failure(yield* Effect.exit(rg.files({ cwd: dir }).pipe(Stream.runCollect)))
        expect(err.name).toBe("RipgrepTimeoutError")
      }),
    ),
  )

  it.live("configured threads and a generous timeout leave results unchanged", () =>
    withLimits({ threads: 1, timeout: 60_000 }, (dir) =>
      Effect.gen(function* () {
        const rg = yield* Ripgrep.Service
        const found = yield* rg.search({ cwd: dir, pattern: "needle" })
        expect(found.items).toHaveLength(51)
        const listed = yield* rg.files({ cwd: dir }).pipe(Stream.runCollect)
        expect([...listed].filter((file) => file.endsWith(".txt"))).toHaveLength(51)
      }),
    ),
  )

  it.live("without a ripgrep block a search has no time limit", () =>
    withLimits(undefined, (dir) =>
      Effect.gen(function* () {
        const rg = yield* Ripgrep.Service
        const found = yield* rg.search({ cwd: dir, pattern: "needle deep" })
        expect(found.items).toHaveLength(1)
      }),
    ),
  )
})
