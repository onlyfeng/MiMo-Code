import { describe, expect, test } from "bun:test"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { Effect, Layer } from "effect"
import * as Stream from "effect/Stream"
import { HttpClient, HttpClientResponse } from "effect/unstable/http"
import fs from "fs/promises"
import path from "path"
import { tmpdir, withTmpdirOutsideGit } from "../fixture/fixture"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Ripgrep } from "../../src/file/ripgrep"
import { Global } from "../../src/global"

const run = <A>(effect: Effect.Effect<A, unknown, Ripgrep.Service>) =>
  effect.pipe(Effect.provide(Ripgrep.defaultLayer), Effect.runPromise)

const noRipgrepLayer = Ripgrep.layer.pipe(
  Layer.provide(
    Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.succeed(HttpClientResponse.fromWeb(request, new Response("offline", { status: 503 }))),
      ),
    ),
  ),
  Layer.provide(AppFileSystem.defaultLayer),
  Layer.provide(CrossSpawnSpawner.defaultLayer),
)

const runWithoutRipgrep = <A>(effect: Effect.Effect<A, unknown, Ripgrep.Service>) =>
  effect.pipe(Effect.provide(noRipgrepLayer), Effect.runPromise)

const fallbackFiles = (cwd: string) =>
  runWithoutRipgrep(
    Ripgrep.Service.use((rg) =>
      rg.files({ cwd }).pipe(
        Stream.runCollect,
        Effect.map((c) => [...c]),
      ),
    ),
  )

async function withNoRipgrep(dir: string, fn: () => Promise<void>) {
  const prevPath = process.env.PATH
  await fs.rm(path.join(Global.Path.bin, process.platform === "win32" ? "rg.exe" : "rg"), { force: true })
  await fs.mkdir(path.join(dir, "empty-bin"), { recursive: true })
  process.env.PATH = path.join(dir, "empty-bin")
  try {
    await fn()
  } finally {
    if (prevPath === undefined) delete process.env.PATH
    else process.env.PATH = prevPath
  }
}

// Ripgrep respects parent .gitignore. When tmpdirs are under the repo,
// patterns like `.mimocode/` in root .gitignore affect test results.

describe("file.ripgrep", () => {
  test("defaults to include hidden", () =>
    withTmpdirOutsideGit(async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(path.join(dir, "visible.txt"), "hello")
          await fs.mkdir(path.join(dir, ".mimocode"), { recursive: true })
          await Bun.write(path.join(dir, ".mimocode", "thing.json"), "{}")
        },
      })

      const files = await run(
        Ripgrep.Service.use((rg) =>
          rg.files({ cwd: tmp.path }).pipe(
            Stream.runCollect,
            Effect.map((c) => [...c]),
          ),
        ),
      )
      expect(files.includes("visible.txt")).toBe(true)
      expect(files.includes(path.join(".mimocode", "thing.json"))).toBe(true)
    }))

  test("hidden false excludes hidden", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "visible.txt"), "hello")
        await fs.mkdir(path.join(dir, ".mimocode"), { recursive: true })
        await Bun.write(path.join(dir, ".mimocode", "thing.json"), "{}")
      },
    })

    const files = await run(
      Ripgrep.Service.use((rg) =>
        rg.files({ cwd: tmp.path, hidden: false }).pipe(
          Stream.runCollect,
          Effect.map((c) => [...c]),
        ),
      ),
    )
    expect(files.includes("visible.txt")).toBe(true)
    expect(files.includes(path.join(".mimocode", "thing.json"))).toBe(false)
  })

  test("search returns empty when nothing matches", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "match.ts"), "const value = 'other'\n")
      },
    })

    const result = await run(Ripgrep.Service.use((rg) => rg.search({ cwd: tmp.path, pattern: "needle" })))
    expect(result.partial).toBe(false)
    expect(result.items).toEqual([])
  })

  test("search returns match metadata with normalized path", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await fs.mkdir(path.join(dir, "src"), { recursive: true })
        await Bun.write(path.join(dir, "src", "match.ts"), "const needle = 1\n")
      },
    })

    const result = await run(Ripgrep.Service.use((rg) => rg.search({ cwd: tmp.path, pattern: "needle" })))
    expect(result.partial).toBe(false)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.path.text).toBe(path.join("src", "match.ts"))
    expect(result.items[0]?.line_number).toBe(1)
    expect(result.items[0]?.lines.text).toContain("needle")
  })

  test("search returns matched rows with glob filter", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "match.ts"), "const value = 'needle'\n")
        await Bun.write(path.join(dir, "skip.txt"), "const value = 'other'\n")
      },
    })

    const result = await run(
      Ripgrep.Service.use((rg) => rg.search({ cwd: tmp.path, pattern: "needle", glob: ["*.ts"] })),
    )
    expect(result.partial).toBe(false)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.path.text).toContain("match.ts")
    expect(result.items[0]?.lines.text).toContain("needle")
  })

  test("search supports explicit file targets", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "match.ts"), "const value = 'needle'\n")
        await Bun.write(path.join(dir, "skip.ts"), "const value = 'needle'\n")
      },
    })

    const file = path.join(tmp.path, "match.ts")
    const result = await run(Ripgrep.Service.use((rg) => rg.search({ cwd: tmp.path, pattern: "needle", file: [file] })))
    expect(result.partial).toBe(false)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.path.text).toBe(file)
  })

  test("files returns empty when glob matches no files", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await fs.mkdir(path.join(dir, "packages", "console"), { recursive: true })
        await Bun.write(path.join(dir, "packages", "console", "package.json"), "{}")
      },
    })

    const files = await run(
      Ripgrep.Service.use((rg) =>
        rg.files({ cwd: tmp.path, glob: ["packages/*"] }).pipe(
          Stream.runCollect,
          Effect.map((c) => [...c]),
        ),
      ),
    )
    expect(files).toEqual([])
  })

  test("files returns stream of filenames", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "a.txt"), "hello")
        await Bun.write(path.join(dir, "b.txt"), "world")
      },
    })

    const files = await run(
      Ripgrep.Service.use((rg) =>
        rg.files({ cwd: tmp.path }).pipe(
          Stream.runCollect,
          Effect.map((c) => [...c].sort()),
        ),
      ),
    )
    expect(files).toEqual(["a.txt", "b.txt"])
  })

  test("files respects glob filter", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "keep.ts"), "yes")
        await Bun.write(path.join(dir, "skip.txt"), "no")
      },
    })

    const files = await run(
      Ripgrep.Service.use((rg) =>
        rg.files({ cwd: tmp.path, glob: ["*.ts"] }).pipe(
          Stream.runCollect,
          Effect.map((c) => [...c]),
        ),
      ),
    )
    expect(files).toEqual(["keep.ts"])
  })

  test("fallback files honors ignore files", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await fs.mkdir(path.join(dir, ".git", "info"), { recursive: true })
        await Bun.write(path.join(dir, ".git", "info", "exclude"), "exclude-only/\n")
        await Bun.write(path.join(dir, ".gitignore"), "node_modules/\ndist/\n*.tmp\n")
        await Bun.write(path.join(dir, ".ignore"), "build/\n")
        await Bun.write(path.join(dir, ".rgignore"), "rg-only/\n")
        await fs.mkdir(path.join(dir, "src"), { recursive: true })
        await Bun.write(path.join(dir, "src", ".gitignore"), "!keep.tmp\nlocal.log\n")
        await Bun.write(path.join(dir, "src", "app.ts"), "export {}\n")
        await Bun.write(path.join(dir, "src", "skip.tmp"), "skip")
        await Bun.write(path.join(dir, "src", "keep.tmp"), "keep")
        await Bun.write(path.join(dir, "src", "local.log"), "local")
        await fs.mkdir(path.join(dir, "node_modules", "pkg"), { recursive: true })
        await Bun.write(path.join(dir, "node_modules", "pkg", "index.js"), "module.exports = {}\n")
        await fs.mkdir(path.join(dir, "dist"), { recursive: true })
        await Bun.write(path.join(dir, "dist", "output.js"), "dist")
        await fs.mkdir(path.join(dir, "build"), { recursive: true })
        await Bun.write(path.join(dir, "build", "cache.js"), "build")
        await fs.mkdir(path.join(dir, "rg-only"), { recursive: true })
        await Bun.write(path.join(dir, "rg-only", "cache.js"), "rg")
        await fs.mkdir(path.join(dir, "exclude-only"), { recursive: true })
        await Bun.write(path.join(dir, "exclude-only", "cache.js"), "exclude")
      },
    })

    await withNoRipgrep(tmp.path, async () => {
      const files = await fallbackFiles(tmp.path)
      expect(files).toContain(path.join("src", "app.ts"))
      expect(files).toContain(path.join("src", "keep.tmp"))
      expect(files).not.toContain(path.join("src", "skip.tmp"))
      expect(files).not.toContain(path.join("src", "local.log"))
      expect(files).not.toContain(path.join("node_modules", "pkg", "index.js"))
      expect(files).not.toContain(path.join("dist", "output.js"))
      expect(files).not.toContain(path.join("build", "cache.js"))
      expect(files).not.toContain(path.join("rg-only", "cache.js"))
      expect(files).not.toContain(path.join("exclude-only", "cache.js"))
    })
  })

  test("fallback files seeds parent ignore rules", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await fs.mkdir(path.join(dir, ".git", "info"), { recursive: true })
        await Bun.write(path.join(dir, ".git", "info", "exclude"), "src/ignored-by-exclude.txt\n")
        await Bun.write(path.join(dir, ".gitignore"), "src/ignored-by-gitignore.txt\n")
        await Bun.write(path.join(dir, ".ignore"), "src/ignored-by-ignore.txt\n")
        await Bun.write(path.join(dir, ".rgignore"), "src/ignored-by-rgignore.txt\n")
        await fs.mkdir(path.join(dir, "src"), { recursive: true })
        await Bun.write(path.join(dir, "src", "kept.ts"), "export {}\n")
        await Bun.write(path.join(dir, "src", "ignored-by-exclude.txt"), "exclude")
        await Bun.write(path.join(dir, "src", "ignored-by-gitignore.txt"), "gitignore")
        await Bun.write(path.join(dir, "src", "ignored-by-ignore.txt"), "ignore")
        await Bun.write(path.join(dir, "src", "ignored-by-rgignore.txt"), "rgignore")
      },
    })

    await withNoRipgrep(tmp.path, async () => {
      const files = await fallbackFiles(path.join(tmp.path, "src"))
      expect(files).toContain("kept.ts")
      expect(files).not.toContain("ignored-by-exclude.txt")
      expect(files).not.toContain("ignored-by-gitignore.txt")
      expect(files).not.toContain("ignored-by-ignore.txt")
      expect(files).not.toContain("ignored-by-rgignore.txt")
    })
  })

  test("files dies on nonexistent directory", async () => {
    const exit = await Ripgrep.Service.use((rg) =>
      rg.files({ cwd: "/tmp/nonexistent-dir-12345" }).pipe(Stream.runCollect),
    ).pipe(Effect.provide(Ripgrep.defaultLayer), Effect.runPromiseExit)
    expect(exit._tag).toBe("Failure")
  })

  test("ignores RIPGREP_CONFIG_PATH in direct mode", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "match.ts"), "const needle = 1\n")
      },
    })

    const prev = process.env["RIPGREP_CONFIG_PATH"]
    process.env["RIPGREP_CONFIG_PATH"] = path.join(tmp.path, "missing-ripgreprc")
    try {
      const result = await run(Ripgrep.Service.use((rg) => rg.search({ cwd: tmp.path, pattern: "needle" })))
      expect(result.items).toHaveLength(1)
    } finally {
      if (prev === undefined) delete process.env["RIPGREP_CONFIG_PATH"]
      else process.env["RIPGREP_CONFIG_PATH"] = prev
    }
  })

  test("ignores RIPGREP_CONFIG_PATH in worker mode", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "match.ts"), "const needle = 1\n")
      },
    })

    const prev = process.env["RIPGREP_CONFIG_PATH"]
    process.env["RIPGREP_CONFIG_PATH"] = path.join(tmp.path, "missing-ripgreprc")
    try {
      const result = await run(Ripgrep.Service.use((rg) => rg.search({ cwd: tmp.path, pattern: "needle" })))
      expect(result.items).toHaveLength(1)
    } finally {
      if (prev === undefined) delete process.env["RIPGREP_CONFIG_PATH"]
      else process.env["RIPGREP_CONFIG_PATH"] = prev
    }
  })
})
