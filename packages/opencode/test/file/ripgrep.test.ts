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

const fallbackFiles = (
  cwd: string,
  input: { follow?: boolean; glob?: string[]; hidden?: boolean; maxDepth?: number; signal?: AbortSignal } = {},
) =>
  runWithoutRipgrep(
    Ripgrep.Service.use((rg) =>
      rg.files({ cwd, ...input }).pipe(
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

  test("fallback files handles only simple listings", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "visible.txt"), "visible")
        await fs.mkdir(path.join(dir, "src"), { recursive: true })
        await Bun.write(path.join(dir, "src", "nested.ts"), "nested")
        await fs.mkdir(path.join(dir, ".hidden"), { recursive: true })
        await Bun.write(path.join(dir, ".hidden", "file.txt"), "hidden")
      },
    })

    await withNoRipgrep(tmp.path, async () => {
      const files = await fallbackFiles(tmp.path)
      expect(files).toContain("visible.txt")
      expect(files).toContain(path.join("src", "nested.ts"))
      expect(files).toContain(path.join(".hidden", "file.txt"))

      const visibleOnly = await fallbackFiles(tmp.path, { hidden: false })
      expect(visibleOnly).toContain("visible.txt")
      expect(visibleOnly).not.toContain(path.join(".hidden", "file.txt"))
    })
  })

  test("fallback files requires ripgrep for advanced listing options", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "file.txt"), "file")
      },
    })

    await withNoRipgrep(tmp.path, async () => {
      await expect(fallbackFiles(tmp.path, { glob: ["*.txt"] })).rejects.toThrow(/Install ripgrep/)
      await expect(fallbackFiles(tmp.path, { follow: true })).rejects.toThrow(/Install ripgrep/)
      await expect(fallbackFiles(tmp.path, { maxDepth: 1 })).rejects.toThrow(/Install ripgrep/)
    })
  })

  test("fallback files requires ripgrep when ignore semantics are present", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await fs.mkdir(path.join(dir, "repo", ".git"), { recursive: true })
        await Bun.write(path.join(dir, "repo", ".gitignore"), "dist/\n")
        await Bun.write(path.join(dir, "repo", "file.txt"), "file")
      },
    })

    await withNoRipgrep(tmp.path, async () => {
      await expect(fallbackFiles(path.join(tmp.path, "repo"))).rejects.toThrow(/Install ripgrep/)
    })
  })

  test("fallback files fails on caller abort", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "file.txt"), "file")
      },
    })

    const controller = new AbortController()
    controller.abort()
    await withNoRipgrep(tmp.path, async () => {
      await expect(fallbackFiles(tmp.path, { signal: controller.signal })).rejects.toThrow(/abort/i)
    })
  })

  test("fallback search requires ripgrep", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "file.txt"), "needle")
      },
    })

    await withNoRipgrep(tmp.path, async () => {
      await expect(
        runWithoutRipgrep(Ripgrep.Service.use((rg) => rg.search({ cwd: tmp.path, pattern: "needle" }))),
      ).rejects.toThrow(/Search requires ripgrep/)
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
