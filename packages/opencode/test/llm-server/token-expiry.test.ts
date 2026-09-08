import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { Hash } from "@mimo-ai/shared/util/hash"
import { Global } from "../../src/global"
import { Filesystem } from "../../src/util"
import { LLMServerTokens as api } from "../../src/llm-server/tokens"
import { tmpdir } from "../fixture/fixture"

const bucket = (directory: string) =>
  path.join(Global.Path.state, "llm-server", Hash.fast(Filesystem.resolve(directory)))
const file = (directory: string) => path.join(bucket(directory), "tokens.json")
const token = "e".repeat(43)
const stored = {
  id: "llmk_expiry_fixture",
  hash: createHash("sha256").update(token).digest("hex"),
  created: 1000,
  last_used: 1500,
}

describe("explicit token expiry", () => {
  for (const entry of [
    { idle_ms: 100, max_age_ms: 1000, end: 1600 },
    { idle_ms: null, max_age_ms: 1000, end: 2000 },
    { idle_ms: 100, max_age_ms: null, end: 1600 },
    { idle_ms: null, max_age_ms: null, end: null },
  ]) {
    test(`computes exact boundaries with idle ${entry.idle_ms} and absolute ${entry.max_age_ms}`, () => {
      const value = { ...stored, idle_ms: entry.idle_ms, max_age_ms: entry.max_age_ms }
      expect(api.expiresAt(value)).toBe(entry.end)
      expect(api.expired(value, entry.end === null ? Number.MAX_SAFE_INTEGER : entry.end - 1)).toBe(false)
      if (entry.end !== null) expect(api.expired(value, entry.end)).toBe(true)
      const untouched = { created: 1000, idle_ms: entry.idle_ms, max_age_ms: entry.max_age_ms }
      expect(api.expiresAt(untouched)).toBe(entry.idle_ms === 100 ? 1100 : entry.end)
    })
  }

  test("persists all four combinations and exposes each explicit limit before JSON serialization", async () => {
    await using tmp = await tmpdir()
    for (const limits of [
      { idleMs: 3_600_000, maxAgeMs: 86_400_000 },
      { idleMs: null, maxAgeMs: 86_400_000 },
      { idleMs: 3_600_000, maxAgeMs: null },
      { idleMs: null, maxAgeMs: null },
    ]) {
      const issued = await api.issue({ directory: tmp.path, allModels: true, expiry: limits })
      expect(issued.record).toMatchObject({ idle_ms: limits.idleMs, max_age_ms: limits.maxAgeMs })
      const result = await api.verify({ directory: tmp.path, token: issued.token })
      expect(result).toMatchObject({ ok: true, idle_ms: limits.idleMs, max_age_ms: limits.maxAgeMs })
      if (!result.ok) throw new Error("fixture token was rejected")
      const listed = (await api.list(tmp.path)).find((entry) => entry.id === issued.record.id)!
      if (limits.idleMs === null && limits.maxAgeMs === null) {
        expect(result.expiresAt).toBeNull()
        expect(listed.expires_at).toBeNull()
      } else {
        expect(Number.isSafeInteger(result.expiresAt)).toBe(true)
        expect(Number.isSafeInteger(listed.expires_at)).toBe(true)
        expect(result.expiresAt).toBeGreaterThan(Date.now())
      }
      expect(listed.expired).toBe(false)
      expect(JSON.parse(JSON.stringify(listed))).toMatchObject({ idle_ms: limits.idleMs, max_age_ms: limits.maxAgeMs })
    }
    const text = await fs.readFile(file(tmp.path), "utf8")
    if (process.platform !== "win32") expect((await fs.stat(file(tmp.path))).mode & 0o777).toBe(0o600)
    expect(JSON.parse(text).version).toBe(2)
  })

  test("requires explicit null or a finite positive safe number in library requests and expiry helpers", async () => {
    await using tmp = await tmpdir()
    for (const value of [undefined, "none", "", false, 0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
      for (const key of ["idleMs", "maxAgeMs"]) {
        await expect(
          Reflect.apply(api.issue, undefined, [
            { directory: tmp.path, allModels: true, expiry: { idleMs: null, maxAgeMs: null, [key]: value } },
          ]),
        ).rejects.toThrow()
      }
      for (const key of ["idle_ms", "max_age_ms"]) {
        expect(() =>
          Reflect.apply(api.expiresAt, undefined, [{ ...stored, idle_ms: null, max_age_ms: null, [key]: value }]),
        ).toThrow()
      }
    }
    expect(await fs.stat(file(tmp.path)).catch(() => undefined)).toBeUndefined()
  })

  test("keeps v1 finite-only and fails closed on missing v2 limits", async () => {
    await using tmp = await tmpdir()
    await fs.mkdir(bucket(tmp.path), { recursive: true })
    for (const version of [1, 2]) {
      const scope = version === 1 ? { models: ["p/m"] } : { scope: { type: "all" } }
      for (const value of [undefined, ...(version === 1 ? [null] : [])]) {
        for (const key of ["idle_ms", "max_age_ms"]) {
          const text = JSON.stringify({
            version,
            tokens: [{ ...stored, ...scope, idle_ms: 3_600_000, max_age_ms: 86_400_000, [key]: value }],
          })
          await fs.writeFile(file(tmp.path), text)
          await expect(api.list(tmp.path)).rejects.toThrow("Invalid token store")
          await expect(api.verify({ directory: tmp.path, token })).rejects.toThrow("Invalid token store")
          expect(await fs.readFile(file(tmp.path), "utf8")).toBe(text)
        }
      }
    }
    for (const extra of [
      { created: -1 },
      { last_used: 999 },
      { last_used: null },
      { created: Number.MAX_SAFE_INTEGER + 1 },
    ]) {
      await fs.writeFile(
        file(tmp.path),
        JSON.stringify({
          version: 2,
          tokens: [{ ...stored, scope: { type: "all" }, idle_ms: null, max_age_ms: null, ...extra }],
        }),
      )
      await expect(api.list(tmp.path)).rejects.toThrow("Invalid token store")
    }
  })

  test("each remaining finite limit still expires while permanent tokens survive usage and remain revocable", async () => {
    await using tmp = await tmpdir()
    for (const limits of [
      { idle_ms: null, max_age_ms: 100 },
      { idle_ms: 100, max_age_ms: null },
      { idle_ms: null, max_age_ms: null },
    ]) {
      await fs.mkdir(bucket(tmp.path), { recursive: true })
      await fs.writeFile(
        file(tmp.path),
        JSON.stringify({ version: 2, tokens: [{ ...stored, scope: { type: "models", models: ["p/m"] }, ...limits }] }),
      )
      if (limits.idle_ms !== null || limits.max_age_ms !== null) {
        expect(await api.verify({ directory: tmp.path, token })).toEqual({ ok: false, reason: "expired" })
        expect(await api.list(tmp.path)).toEqual([])
        continue
      }
      expect(await api.verify({ directory: tmp.path, token })).toMatchObject({ ok: true, expiresAt: null })
      const listed = (await api.list(tmp.path))[0]
      expect(listed).toMatchObject({ idle_ms: null, max_age_ms: null, expires_at: null, expired: false })
      expect(listed.last_used).toBeGreaterThan(1500)
      await api.issue({ directory: tmp.path, allModels: true, expiry: { idleMs: 3_600_000, maxAgeMs: 86_400_000 } })
      expect(await api.verify({ directory: tmp.path, token })).toMatchObject({ ok: true, expiresAt: null })
      expect(await api.revoke({ directory: tmp.path, id: stored.id })).toBe(true)
      expect(await api.verify({ directory: tmp.path, token })).toEqual({ ok: false, reason: "unknown" })
      expect(await api.revokeAll({ directory: tmp.path })).toBe(1)
    }
  })

  test("permanent revocation and concurrent verification stay consistent across processes", async () => {
    await using tmp = await tmpdir()
    const issued = await api.issue({ directory: tmp.path, allModels: true, expiry: { idleMs: null, maxAgeMs: null } })
    const children = [
      ["verify", issued.token],
      ["revoke", issued.record.id],
    ].map((args) =>
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
    const timer = setTimeout(() => deadline.reject(new Error("token children exceeded 20s")), 20_000)
    try {
      const [, revoked] = await Promise.race([done, deadline.promise])
      expect(revoked).toBe(true)
      expect(await api.verify({ directory: tmp.path, token: issued.token })).toEqual({ ok: false, reason: "unknown" })
      expect(await api.list(tmp.path)).toEqual([])
      expect((await fs.readdir(bucket(tmp.path))).filter((name) => name.endsWith(".tmp"))).toEqual([])
    } finally {
      clearTimeout(timer)
      children.forEach((child) => child.kill("SIGKILL"))
      const cleanup = Promise.withResolvers<never>()
      const guard = setTimeout(() => cleanup.reject(new Error("token children cleanup exceeded 2s")), 2000)
      try {
        await Promise.race([Promise.all(children.map((child) => child.exited)), cleanup.promise])
      } finally {
        clearTimeout(guard)
      }
    }
  }, 30_000)
})
