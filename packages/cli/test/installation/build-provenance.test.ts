import { describe, expect, test } from "bun:test"
import path from "node:path"
import { InstallationBuild, InstallationVersion, describeBuild } from "../../src/installation/version"
import { tmpdir } from "../fixture/fixture"

const commit = "0123456789abcdef0123456789abcdef01234567"
const time = "2026-01-02T03:04:05.000Z"

describe("describeBuild", () => {
  test("a clean build is its commit", () => {
    expect(describeBuild({ commit, dirty: false, time })).toBe(commit)
  })

  test("local changes and unknown state are marked on the commit", () => {
    expect(describeBuild({ commit, dirty: true, time })).toBe(`${commit}+dirty`)
    expect(describeBuild({ commit, dirty: null, time })).toBe(`${commit}+dirty-unknown`)
    expect(describeBuild({ commit: null, dirty: null, time })).toBe("unknown+dirty-unknown")
  })

  test("running from source has no build", () => {
    expect(InstallationBuild).toBeUndefined()
    expect(InstallationVersion).toBe("local")
    expect(describeBuild()).toBe("source")
  })
})

test("the compiled local version reaches --version, the user agent and persisted sessions", async () => {
  await using tmp = await tmpdir()
  const version = "local-20260102T030405Z"
  const run = async (args: string[], suppliedVersion = "local") => {
    const child = Bun.spawn({
      cmd: [
        process.execPath,
        "--conditions=browser",
        "--define",
        `MIMOCODE_VERSION:${JSON.stringify(suppliedVersion)}`,
        "--define",
        `MIMOCODE_BUILD:${JSON.stringify({ commit, dirty: false, time })}`,
        ...args,
      ],
      cwd: path.resolve(import.meta.dir, "../.."),
      env: { ...process.env, MIMOCODE_CLIENT: "example", VERSION_TEST_PROJECT: tmp.path },
      stdout: "pipe",
      stderr: "pipe",
    })
    const timer = setTimeout(() => child.kill("SIGKILL"), 30_000)
    try {
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect(code, stderr).toBe(0)
      return stdout.trim()
    } finally {
      clearTimeout(timer)
    }
  }
  expect(await run(["src/index.ts", "--version"])).toBe(version)
  const persisted = await run(["test/fixture/local-build-version.ts"])
  expect(JSON.parse(persisted)).toEqual({ userAgent: `mimocode/local/${version}/example`, version })
  const readVersion = 'import { InstallationVersion } from "./src/installation/version"; console.log(InstallationVersion)'
  expect(await run(["-e", readVersion], "1.2.3")).toBe("1.2.3")
}, 95_000)
