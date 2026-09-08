import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { Hash } from "@mimo-ai/shared/util/hash"
import { Flock } from "@mimo-ai/shared/util/flock"
import { Global } from "../../src/global"
import { Filesystem } from "../../src/util"
import { LLMServerTokens as api } from "../../src/llm-server/tokens"
import { LLMServerScope } from "../../src/llm-server/scope"
import { tmpdir } from "../fixture/fixture"

const expiry = { idleMs: 3_600_000, maxAgeMs: 86_400_000 }
const bucket = (directory: string) =>
  path.join(Global.Path.state, "llm-server", Hash.fast(Filesystem.resolve(directory)))
const file = (directory: string) => path.join(bucket(directory), "tokens.json")
const token = "v".repeat(43)

// Deliberately independent of issue(): this is the actual old on-disk contract.
async function legacy(directory: string, model = "p/old") {
  const body = JSON.stringify({
    version: 1,
    tokens: [
      {
        id: "llmk_legacy",
        hash: createHash("sha256").update(token).digest("hex"),
        models: [model],
        created: Date.now() - 1000,
        idle_ms: expiry.idleMs,
        max_age_ms: expiry.maxAgeMs,
      },
    ],
  })
  await fs.mkdir(bucket(directory), { recursive: true, mode: 0o700 })
  await fs.writeFile(file(directory), body, { mode: 0o600 })
  return body
}

describe("token scope v2", () => {
  test("scope comparison is exact and all only admits explicit model refs", () => {
    const scope = { type: "models" as const, models: ["p/*", "*/m", "p/exact"] }
    expect(LLMServerScope.allows(scope, "p/*")).toBe(true)
    expect(LLMServerScope.allows(scope, "*/m")).toBe(true)
    expect(LLMServerScope.allows(scope, "p/exact")).toBe(true)
    expect(LLMServerScope.allows(scope, "p/other")).toBe(false)
    expect(LLMServerScope.allows(scope, "other/m")).toBe(false)
    for (const ref of ["", "*", "missing", "/m", "p/", "p/a b"]) {
      expect(LLMServerScope.allows({ type: "all" }, ref)).toBe(false)
    }
    expect(LLMServerScope.allows({ type: "all" }, "p/new")).toBe(true)
  })
  test("issues one through 64 exact models with compatible public projections", async () => {
    await using tmp = await tmpdir()
    for (const models of [["p/one"], ["p/a", "p/b"], Array.from({ length: 64 }, (_, i) => `p/m${i}`)]) {
      const issued = await api.issue({ directory: tmp.path, models, expiry })
      const compatible: string[] = issued.record.models
      expect(compatible).toEqual(models)
      expect(issued.record).toMatchObject({ scope: { type: "models", models } })
      expect(await api.verify({ directory: tmp.path, token: issued.token })).toMatchObject({
        ok: true,
        scope: { type: "models", models },
        models,
      })
    }
    const saved = JSON.parse(await fs.readFile(file(tmp.path), "utf8"))
    expect(saved.version).toBe(2)
    expect(saved.tokens.every((record: object) => !Object.hasOwn(record, "models"))).toBe(true)
  })

  test("issues explicit all without pretending it is an empty finite scope", async () => {
    await using tmp = await tmpdir()
    const issued = await api.issue({ directory: tmp.path, allModels: true, expiry })
    expect(issued.record).toMatchObject({ scope: { type: "all" } })
    expect(issued.record).not.toHaveProperty("models")
    const verdict = await api.verify({ directory: tmp.path, token: issued.token })
    expect(verdict).toMatchObject({ ok: true, scope: { type: "all" } })
    expect(verdict).not.toHaveProperty("models")
    expect((await api.list(tmp.path))[0]).not.toHaveProperty("models")
  })

  test("rejects ambiguous empty duplicate oversized wildcard and malformed new scopes before writing", async () => {
    await using tmp = await tmpdir()
    for (const scope of [
      {},
      { allModels: false },
      { allModels: null },
      { allModels: true, models: ["p/m"] },
      { allModels: true, models: [] },
      { models: [] },
      { models: ["p/a", "p/a"] },
      { models: Array.from({ length: 65 }, (_, i) => `p/m${i}`) },
      { models: ["*"] },
      { models: ["p/*"] },
      { models: ["*/m"] },
      { models: ["p/m*"] },
      { models: ["invalid"] },
      { models: ["p/"] },
      { models: ["p/a b"] },
    ]) {
      await expect(Reflect.apply(api.issue, undefined, [{ directory: tmp.path, expiry, ...scope }])).rejects.toThrow()
    }
    expect(await fs.stat(file(tmp.path)).catch(() => undefined)).toBeUndefined()
  })

  test("reads v1 and no-op revocation without rewriting or upgrading", async () => {
    await using tmp = await tmpdir()
    const before = await legacy(tmp.path)
    const stamp = (await fs.stat(file(tmp.path))).mtimeMs
    expect((await api.list(tmp.path))[0]).toMatchObject({
      scope: { type: "models", models: ["p/old"] },
      models: ["p/old"],
    })
    expect(await api.revoke({ directory: tmp.path, id: "absent" })).toBe(false)
    await using lock = await Flock.acquire(`llm-server-tokens:${bucket(tmp.path)}`)
    expect(await api.verify({ directory: tmp.path, token: "x".repeat(43), signal: AbortSignal.timeout(100) })).toEqual({
      ok: false,
      reason: "unknown",
    })
    expect(await fs.readFile(file(tmp.path), "utf8")).toBe(before)
    expect((await fs.stat(file(tmp.path))).mtimeMs).toBe(stamp)
  })

  test("upgrades only a real mutation and preserves old literal wildcard model names", async () => {
    await using tmp = await tmpdir()
    await legacy(tmp.path, "p/*")
    expect(await api.verify({ directory: tmp.path, token })).toMatchObject({
      ok: true,
      scope: { type: "models", models: ["p/*"] },
      models: ["p/*"],
    })
    const saved = JSON.parse(await fs.readFile(file(tmp.path), "utf8"))
    expect(saved.version).toBe(2)
    expect(saved.tokens[0]).not.toHaveProperty("models")
    expect(saved.tokens[0].scope).toEqual({ type: "models", models: ["p/*"] })
    expect((await fs.stat(file(tmp.path))).mode & 0o777).toBe(0o600)
    expect((await fs.readdir(bucket(tmp.path))).filter((name) => name.endsWith(".tmp"))).toEqual([])
  })

  test("a successful verification with unchanged usage leaves v1 bytes intact", async () => {
    await using tmp = await tmpdir()
    const body = JSON.parse(await legacy(tmp.path))
    body.tokens[0].last_used = Date.now() + 60_000
    const original = JSON.stringify(body)
    await fs.writeFile(file(tmp.path), original)
    const stamp = (await fs.stat(file(tmp.path))).mtimeMs
    expect(await api.verify({ directory: tmp.path, token })).toMatchObject({
      ok: true,
      scope: { type: "models", models: ["p/old"] },
    })
    expect(await fs.readFile(file(tmp.path), "utf8")).toBe(original)
    expect((await fs.stat(file(tmp.path))).mtimeMs).toBe(stamp)
  })

  test("independent processes upgrade v1 while issuing revoking and verifying without resurrection", async () => {
    await using tmp = await tmpdir()
    await legacy(tmp.path)
    const children = [["issue"], ["revoke", "llmk_legacy"], ["verify", token]].map((args) =>
      Bun.spawn({
        cmd: [process.execPath, path.join(import.meta.dir, "tokens-child.ts"), tmp.path, ...args],
        env: process.env,
        stdout: "pipe",
        stderr: "pipe",
      }),
    )
    const done = Promise.all(
      children.map(async (child) => {
        const [code, stdout, stderr] = await Promise.all([
          child.exited,
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
        ])
        expect(code, stderr).toBe(0)
        return JSON.parse(stdout)
      }),
    )
    const deadline = Promise.withResolvers<never>()
    const timer = setTimeout(() => deadline.reject(new Error("token child processes exceeded 20s")), 20_000)
    try {
      const [issued, revoked] = await Promise.race([done, deadline.promise])
      expect(revoked).toBe(true)
      expect((await api.list(tmp.path)).map((record) => record.id).sort()).toEqual(issued.sort())
      expect(await api.verify({ directory: tmp.path, token })).toEqual({ ok: false, reason: "unknown" })
      expect(JSON.parse(await fs.readFile(file(tmp.path), "utf8")).version).toBe(2)
      expect((await fs.readdir(bucket(tmp.path))).filter((name) => name.endsWith(".tmp"))).toEqual([])
    } finally {
      clearTimeout(timer)
      children.forEach((child) => child.kill("SIGKILL"))
      const cleanup = Promise.withResolvers<never>()
      const guard = setTimeout(() => cleanup.reject(new Error("token child cleanup exceeded 2s")), 2000)
      try {
        await Promise.race([Promise.all(children.map((child) => child.exited)), cleanup.promise])
      } finally {
        clearTimeout(guard)
      }
    }
  }, 60_000)

  test("fails closed for invalid v1 scopes and strict v2 unions", async () => {
    await using tmp = await tmpdir()
    const old = JSON.parse(await legacy(tmp.path))
    for (const body of [
      { ...old, version: 3 },
      { ...old, tokens: [{ ...old.tokens[0], models: ["p/a", "p/b"] }] },
      { ...old, tokens: [{ ...old.tokens[0], scope: { type: "all" } }] },
      ...[
        { type: "all", models: [] },
        { type: "models", models: [] },
        { type: "models", models: ["p/a", "p/a"] },
        {},
        null,
      ].map((scope) => ({
        version: 2,
        tokens: [
          {
            id: old.tokens[0].id,
            hash: old.tokens[0].hash,
            created: old.tokens[0].created,
            idle_ms: expiry.idleMs,
            max_age_ms: expiry.maxAgeMs,
            scope,
          },
        ],
      })),
    ]) {
      await fs.writeFile(file(tmp.path), JSON.stringify(body))
      await expect(api.list(tmp.path)).rejects.toThrow("Invalid token store")
    }
  })
})
