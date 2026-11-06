import { afterAll, describe, expect, test } from "bun:test"
import { $ } from "bun"
import path from "path"
import { rmSync } from "node:fs"
import { mkdtemp as mkdtempAsync, mkdir as mkdirAsync } from "node:fs/promises"
import { tmpdir } from "node:os"
import { readBuildProvenance } from "./build-provenance"

const dirs: string[] = []
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

const git = (cwd: string) => new $.Shell().cwd(cwd)

async function repo() {
  const dir = await mkdtempAsync(path.join(tmpdir(), "build-provenance-"))
  dirs.push(dir)
  await mkdirAsync(path.join(dir, "packages", "cli"), { recursive: true })
  await Bun.write(path.join(dir, "packages", "cli", "index.ts"), "export {}\n")
  await Bun.write(path.join(dir, "README.md"), "fixture\n")
  await Bun.write(path.join(dir, ".gitignore"), "packages/cli/dist/\n")
  await git(dir)`git init -q -b main`
  await git(dir)`git add -A`
  await git(dir)`git -c user.name=test -c user.email=test@example.com commit -q -m base`
  const head = (await git(dir)`git rev-parse HEAD`.text()).trim()
  return { dir, head }
}

describe("readBuildProvenance", () => {
  test("a clean checkout reports its full commit and is not dirty", async () => {
    const { dir, head } = await repo()
    const now = new Date("2026-01-02T03:04:05.000Z")
    expect(await readBuildProvenance(dir, now)).toEqual({ commit: head, dirty: false, time: "2026-01-02T03:04:05.000Z" })
    expect(head).toMatch(/^[0-9a-f]{40}$/)
  })

  test("a changed tracked file anywhere makes the build dirty, staged or not", async () => {
    const { dir } = await repo()
    await Bun.write(path.join(dir, "README.md"), "changed\n")
    expect((await readBuildProvenance(dir)).dirty).toBe(true)
    await git(dir)`git add README.md`
    expect((await readBuildProvenance(dir)).dirty).toBe(true)
  })

  test("an untracked file under packages/ makes the build dirty; one elsewhere or ignored does not", async () => {
    const { dir } = await repo()
    await mkdirAsync(path.join(dir, ".scratch"), { recursive: true })
    await Bun.write(path.join(dir, ".scratch", "notes.md"), "local\n")
    await mkdirAsync(path.join(dir, "packages", "cli", "dist"), { recursive: true })
    await Bun.write(path.join(dir, "packages", "cli", "dist", "mimo"), "binary\n")
    expect((await readBuildProvenance(dir)).dirty).toBe(false)
    await mkdirAsync(path.join(dir, "packages", "cli", "src", "new"), { recursive: true })
    await Bun.write(path.join(dir, "packages", "cli", "src", "new", "module.ts"), "export {}\n")
    expect((await readBuildProvenance(dir)).dirty).toBe(true)
  })

  test("outside git, the commit falls back to MIMOCODE_COMMIT_SHA and dirtiness is unknown", async () => {
    const dir = await mkdtempAsync(path.join(tmpdir(), "build-provenance-nogit-"))
    dirs.push(dir)
    const saved = process.env["MIMOCODE_COMMIT_SHA"]
    const ceiling = process.env["GIT_CEILING_DIRECTORIES"]
    try {
      // Keep git from finding a repository above the temp directory.
      process.env["GIT_CEILING_DIRECTORIES"] = path.dirname(dir)
      delete process.env["MIMOCODE_COMMIT_SHA"]
      expect(await readBuildProvenance(dir)).toMatchObject({ commit: null, dirty: null })
      process.env["MIMOCODE_COMMIT_SHA"] = "0123456789abcdef0123456789abcdef01234567"
      expect(await readBuildProvenance(dir)).toMatchObject({
        commit: "0123456789abcdef0123456789abcdef01234567",
        dirty: null,
      })
    } finally {
      if (saved === undefined) delete process.env["MIMOCODE_COMMIT_SHA"]
      else process.env["MIMOCODE_COMMIT_SHA"] = saved
      if (ceiling === undefined) delete process.env["GIT_CEILING_DIRECTORIES"]
      else process.env["GIT_CEILING_DIRECTORIES"] = ceiling
    }
  })
})
