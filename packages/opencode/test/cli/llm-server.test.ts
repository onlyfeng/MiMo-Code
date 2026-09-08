import { beforeAll, describe, expect, test } from "bun:test"
import path from "node:path"
import fs from "node:fs/promises"
import { Global } from "../../src/global"
import { prepareConfigDependencies, tmpdir } from "../fixture/fixture"
import { duration } from "../../src/cli/cmd/llm-server"

beforeAll(() => prepareConfigDependencies(Global.Path.config))

async function run(args: string[], noInstance?: string) {
  return execute(
    [process.execPath, path.join(import.meta.dir, "../fixture/llm-server-cli-child.ts"), "llm-server", ...args],
    process.cwd(),
    { ...process.env, ...(noInstance ? { MIMOCODE_TEST_NO_INSTANCE: noInstance } : {}) },
  )
}

async function execute(argv: string[], cwd: string, env = process.env) {
  const child = Bun.spawn({ cmd: argv, cwd, env, stdout: "pipe", stderr: "pipe" })
  const deadline = Promise.withResolvers<never>()
  const timer = setTimeout(() => deadline.reject(new Error("CLI child exceeded 20s")), 20_000)
  const done = Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
  try {
    const [code, stdout, stderr] = await Promise.race([done, deadline.promise])
    return { code, stdout, stderr }
  } finally {
    clearTimeout(timer)
    child.kill("SIGKILL")
    const cleanup = Promise.withResolvers<never>()
    const guard = setTimeout(() => cleanup.reject(new Error("CLI child cleanup exceeded 2s")), 2000)
    try {
      await Promise.race([done, cleanup.promise])
    } finally {
      clearTimeout(guard)
    }
  }
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
  for (const entry of [
    {
      name: "single with explicit preload",
      runtime: ["--cwd=.", "--preload", "./node_modules/@opentui/solid/scripts/preload.ts", "--conditions=browser"],
      models: ["cli/preferred"],
    },
    { name: "single with bunfig preload", runtime: ["--cwd", ".", "--conditions=browser"], models: ["cli/preferred"] },
    {
      name: "multiple models",
      runtime: ["--cwd", ".", "--conditions=browser"],
      models: ["cli/preferred", "cli/alternative"],
    },
    { name: "all models", runtime: ["--cwd", ".", "--conditions=browser"], models: undefined },
  ]) {
    test(`renews the actual source entry from another cwd with ${entry.name}`, async () => {
      await using tmp = await tmpdir({ config })
      const issued = await execute(
        [
          process.execPath,
          ...entry.runtime,
          path.resolve("src/index.ts"),
          "--pure",
          "llm-server",
          "issue",
          "--directory",
          tmp.path,
          ...(entry.models ? entry.models.flatMap((model) => ["--model", model]) : ["--all-models"]),
          "--json",
        ],
        process.cwd(),
      )
      expect(issued.code, issued.stderr).toBe(0)
      const original = JSON.parse(issued.stdout)
      const renewed = await execute(original.renew_argv, tmp.path)
      expect(renewed.code, renewed.stderr).toBe(0)
      const output = JSON.parse(renewed.stdout)
      expect(output.scope).toEqual(entry.models ? { type: "models", models: entry.models } : { type: "all" })
      expect(output.models).toEqual(entry.models)
      expect(output.model).toBe(entry.models?.length === 1 ? entry.models[0] : undefined)
      if (!entry.models) expect(output).not.toHaveProperty("models")
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
    await fs.writeFile(path.join(tmp.path, "mimocode.json"), JSON.stringify({ ...config, model: "cli/alternative" }))
    const renewed = await execute(output.renew_argv, tmp.path)
    expect(renewed.code, renewed.stderr).toBe(0)
    expect(JSON.parse(renewed.stdout).models).toEqual(["cli/preferred"])
    expect(JSON.parse(renewed.stdout).scope).toEqual({ type: "models", models: ["cli/preferred"] })
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
  }, 60_000)

  test("refuses missing conflicting duplicate and unavailable model selectors", async () => {
    await using tmp = await tmpdir({
      config: {
        ...config,
        provider: {
          cli: {
            ...config.provider.cli,
            models: {
              ...config.provider.cli.models,
              asr: { name: "ASR", modalities: { input: ["audio"], output: ["text"] } },
            },
          },
        },
      },
    })
    for (const args of [
      [],
      ["--model", "cli/preferred", "--capability", "chat"],
      ["--model", "cli/preferred", "--model", "cli/preferred"],
      ["--all-models", "--model", "cli/preferred"],
      ["--all-models", "--capability", "chat"],
      ["--capability", "chat", "--capability", "speech"],
      ["--capability", "chat", "--capability", "chat"],
      ["--model", "cli/missing"],
    ]) {
      const result = await run(["issue", "--directory", tmp.path, ...args, "--json"])
      expect(result.code).toBe(1)
      expect(result.stdout).toBe("")
    }
  }, 60_000)

  test("issues all against an empty registry without bootstrapping an instance", async () => {
    await using tmp = await tmpdir({ config: { enabled_providers: [] } })
    const result = await run(["issue", "--directory", tmp.path, "--all-models", "--json"], tmp.path)
    expect(result.code, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout).scope).toEqual({ type: "all" })
    expect(JSON.parse(result.stdout)).not.toHaveProperty("models")
  }, 30_000)

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
  }, 60_000)
})
