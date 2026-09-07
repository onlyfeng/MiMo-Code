import { beforeAll, describe, expect, test } from "bun:test"
import path from "node:path"
import { Global } from "../../src/global"
import { prepareConfigDependencies, tmpdir } from "../fixture/fixture"
import { duration } from "../../src/cli/cmd/llm-server"

beforeAll(() => prepareConfigDependencies(Global.Path.config))

async function run(args: string[], noInstance?: string) {
  const child = Bun.spawn({
    cmd: [process.execPath, path.join(import.meta.dir, "../fixture/llm-server-cli-child.ts"), "llm-server", ...args],
    env: { ...process.env, ...(noInstance ? { MIMOCODE_TEST_NO_INSTANCE: noInstance } : {}) },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { code, stdout, stderr }
}

async function execute(argv: string[], cwd: string) {
  const child = Bun.spawn({ cmd: argv, cwd, env: process.env, stdout: "pipe", stderr: "pipe" })
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { code, stdout, stderr }
}

const config = {
  model: "cli/preferred",
  enabled_providers: ["cli"],
  provider: {
    cli: {
      npm: "@ai-sdk/openai-compatible",
      options: { apiKey: "fixture-provider-key", baseURL: "http://127.0.0.1:1/v1" },
      models: {
        preferred: { name: "Preferred", modalities: { input: ["text" as const], output: ["text" as const] } },
        alternative: { name: "Alternative", modalities: { input: ["text" as const], output: ["text" as const] } },
      },
    },
  },
}

describe("llm-server CLI", () => {
  for (const runtime of [
    ["--cwd=.", "--preload", "./node_modules/@opentui/solid/scripts/preload.ts", "--conditions=browser"],
    ["--cwd", ".", "--conditions=browser"],
  ]) {
    test(`renews the actual source entry from another cwd with ${runtime.includes("--preload") ? "explicit" : "bunfig"} preload`, async () => {
      await using tmp = await tmpdir({ config })
      const issued = await execute(
        [
          process.execPath,
          ...runtime,
          path.resolve("src/index.ts"),
          "--pure",
          "llm-server",
          "issue",
          "--directory",
          tmp.path,
          "--model",
          "cli/preferred",
          "--json",
        ],
        process.cwd(),
      )
      expect(issued.code, issued.stderr).toBe(0)
      const original = JSON.parse(issued.stdout)
      const renewed = await execute(original.renew_argv, tmp.path)
      expect(renewed.code, renewed.stderr).toBe(0)
      const output = JSON.parse(renewed.stdout)
      expect(output.models).toEqual(["cli/preferred"])
      expect(output.api_key).not.toBe(original.api_key)
      expect(output.renew_argv).toEqual(original.renew_argv)
    }, 60_000)
  }

  test("parses finite positive durations and rejects unlimited or overflowing values", async () => {
    expect(duration(undefined, "1h")).toBe(3_600_000)
    expect(duration("24h", "1h")).toBe(86_400_000)
    expect(duration("0.5s", "1h")).toBe(500)
    for (const value of ["none", "never", "0", "0ms", "-1s", "0.1ms", "9".repeat(400) + "d", "1w"]) {
      expect(() => duration(value, "1h")).toThrow()
    }
  })

  test("issues one explicit model without starting a listener and pins renewal arguments", async () => {
    await using tmp = await tmpdir({ config })
    const result = await run(["issue", "--directory", tmp.path, "--model", "cli/preferred", "--json"])
    expect(result.code, result.stderr).toBe(0)
    const output = JSON.parse(result.stdout)
    expect(output.base_url).toBeNull()
    expect(output.models).toEqual(["cli/preferred"])
    expect(output.model).toBe("cli/preferred")
    expect(output.api_key).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(output.expires_at).toBeGreaterThan(Date.now())
    expect(output.renew_argv.slice(-9)).toEqual([
      "--directory",
      tmp.path,
      "--model",
      "cli/preferred",
      "--ttl",
      "3600000ms",
      "--max-age",
      "86400000ms",
      "--json",
    ])
  })

  test("resolves a capability once and renews the selected concrete model", async () => {
    await using tmp = await tmpdir({ config })
    const result = await run([
      "issue",
      "--directory",
      tmp.path,
      "--capability",
      "chat",
      "--ttl",
      "30m",
      "--max-age",
      "2h",
      "--json",
    ])
    expect(result.code, result.stderr).toBe(0)
    const output = JSON.parse(result.stdout)
    expect(output.model).toBe("cli/preferred")
    expect(output.models).toEqual(["cli/preferred"])
    expect(output.capability).toBe("chat")
    expect(output.fallback).toBe(false)
    expect(output.renew_argv).not.toContain("--capability")
    expect(output.renew_argv.slice(-9)).toEqual([
      "--directory",
      tmp.path,
      "--model",
      "cli/preferred",
      "--ttl",
      "1800000ms",
      "--max-age",
      "7200000ms",
      "--json",
    ])
  })

  test("refuses missing, conflicting or repeated selectors and unavailable models", async () => {
    await using tmp = await tmpdir({ config })
    for (const args of [
      [],
      ["--model", "cli/preferred", "--capability", "chat"],
      ["--model", "cli/preferred", "--model", "cli/alternative"],
      ["--model", "cli/missing"],
    ]) {
      const result = await run(["issue", "--directory", tmp.path, ...args, "--json"])
      expect(result.code).toBe(1)
      expect(result.stdout).toBe("")
    }
  })

  test("lists and revokes without creating a project instance", async () => {
    await using tmp = await tmpdir({ config })
    const issued = await run(["issue", "--directory", tmp.path, "--model", "cli/preferred", "--json"])
    expect(issued.code, issued.stderr).toBe(0)
    const listed = await run(["list", "--directory", tmp.path, "--json"], tmp.path)
    expect(listed.code, listed.stderr).toBe(0)
    expect(JSON.parse(listed.stdout).tokens).toHaveLength(1)
    expect(JSON.parse(listed.stdout).tokens[0]).not.toHaveProperty("hash")
    const revoked = await run(["revoke", JSON.parse(issued.stdout).id, "--directory", tmp.path], tmp.path)
    expect(revoked.code, revoked.stderr).toBe(0)
    const empty = await run(["list", "--directory", tmp.path, "--json"], tmp.path)
    expect(empty.code, empty.stderr).toBe(0)
    expect(JSON.parse(empty.stdout).tokens).toEqual([])
  })
})
