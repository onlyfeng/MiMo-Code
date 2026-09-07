import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { setTimeout as sleep } from "node:timers/promises"
import { Hash } from "@mimo-ai/shared/util/hash"
import { Flock } from "@mimo-ai/shared/util/flock"
import { Global } from "../../src/global"
import { Filesystem } from "../../src/util"
import { tmpdir } from "../fixture/fixture"
import { LLMServerTokens as api } from "../../src/llm-server/tokens"

const expiry = { idleMs: 3_600_000, maxAgeMs: 86_400_000 }
const bucket = (directory: string) =>
  path.join(Global.Path.state, "llm-server", Hash.fast(Filesystem.resolve(directory)))
const file = (directory: string) => path.join(bucket(directory), "tokens.json")

describe("temporary model tokens", () => {
  test("persists only hashes with private file permissions and returns one model scope", async () => {
    await using tmp = await tmpdir()
    const issued = await api.issue({ directory: tmp.path, models: ["provider/model"], expiry, label: "task" })
    expect(issued.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(issued.record).toMatchObject({ models: ["provider/model"], label: "task", idle_ms: expiry.idleMs })
    expect(issued.record).not.toHaveProperty("hash")
    const raw = await fs.readFile(file(tmp.path), "utf8")
    expect(raw).not.toContain(issued.token)
    expect(JSON.parse(raw).tokens[0].hash).toMatch(/^[a-f0-9]{64}$/)
    if (process.platform !== "win32") {
      expect((await fs.stat(file(tmp.path))).mode & 0o777).toBe(0o600)
      expect((await fs.stat(bucket(tmp.path))).mode & 0o777).toBe(0o700)
    }
    expect(await api.verify({ directory: tmp.path, token: issued.token })).toMatchObject({
      ok: true,
      id: issued.record.id,
      models: ["provider/model"],
    })
  })

  test("separates directories and canonicalizes symlink aliases", async () => {
    await using one = await tmpdir()
    await using two = await tmpdir()
    const alias = path.join(two.path, "alias")
    await fs.symlink(one.path, alias, process.platform === "win32" ? "junction" : "dir")
    const issued = await api.issue({ directory: alias, models: ["provider/model"], expiry })
    expect(await api.verify({ directory: one.path, token: issued.token })).toMatchObject({ ok: true })
    expect(await api.verify({ directory: two.path, token: issued.token })).toEqual({ ok: false, reason: "unknown" })
  })

  test("rejects unrestricted, multiple or malformed model scopes before writing", async () => {
    await using tmp = await tmpdir()
    for (const models of [
      [],
      ["one/a", "two/b"],
      ["no-provider"],
      ["provider/"],
      ["/model"],
      ["provider/model with spaces"],
    ]) {
      await expect(api.issue({ directory: tmp.path, models, expiry })).rejects.toThrow()
    }
    expect(await fs.stat(file(tmp.path)).catch(() => undefined)).toBeUndefined()
  })

  test("requires finite positive safe lifetimes without timestamp overflow", async () => {
    await using tmp = await tmpdir()
    for (const value of [0, -1, Infinity, NaN, 0.5, Number.MAX_SAFE_INTEGER]) {
      await expect(
        api.issue({ directory: tmp.path, models: ["p/m"], expiry: { ...expiry, idleMs: value } }),
      ).rejects.toThrow()
      await expect(
        api.issue({ directory: tmp.path, models: ["p/m"], expiry: { ...expiry, maxAgeMs: value } }),
      ).rejects.toThrow()
    }
  })

  test("expires at the exact idle or absolute boundary", async () => {
    const record = { id: "llmk_test", models: ["p/m"], created: 1000, last_used: 1500, idle_ms: 100, max_age_ms: 1000 }
    expect(api.expired(record, 1599)).toBe(false)
    expect(api.expired(record, 1600)).toBe(true)
    expect(api.expired({ ...record, last_used: 1999 }, 2000)).toBe(true)
    expect(api.expiresAt(record)).toBe(1600)
  })

  test("persists a successful idle slide and removes an expired token", async () => {
    await using tmp = await tmpdir()
    const issued = await api.issue({ directory: tmp.path, models: ["p/m"], expiry })
    await sleep(5)
    await api.verify({ directory: tmp.path, token: issued.token })
    const saved = JSON.parse(await fs.readFile(file(tmp.path), "utf8"))
    expect(saved.tokens[0].last_used).toBeGreaterThan(issued.record.created)
    saved.tokens[0].created = 1
    saved.tokens[0].last_used = 1
    await fs.writeFile(file(tmp.path), JSON.stringify(saved))
    expect(await api.verify({ directory: tmp.path, token: issued.token })).toEqual({ ok: false, reason: "expired" })
    expect(await api.list(tmp.path)).toEqual([])
  })

  test("unknown tokens do not create lock files or rewrite the token store", async () => {
    await using tmp = await tmpdir()
    await api.issue({ directory: tmp.path, models: ["p/m"], expiry })
    const before = await fs.readFile(file(tmp.path), "utf8")
    const timestamp = (await fs.stat(file(tmp.path))).mtimeMs
    await using lease = await Flock.acquire(`llm-server-tokens:${bucket(tmp.path)}`)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 100)
    try {
      expect(await api.verify({ directory: tmp.path, token: "x".repeat(43), signal: controller.signal })).toEqual({
        ok: false,
        reason: "unknown",
      })
    } finally {
      clearTimeout(timer)
    }
    expect(await fs.readFile(file(tmp.path), "utf8")).toBe(before)
    expect((await fs.stat(file(tmp.path))).mtimeMs).toBe(timestamp)
  })

  test("cancels known-token verification while its mutation lock is held", async () => {
    await using tmp = await tmpdir()
    const issued = await api.issue({ directory: tmp.path, models: ["p/m"], expiry })
    await using lease = await Flock.acquire(`llm-server-tokens:${bucket(tmp.path)}`)
    const controller = new AbortController()
    const pending = api.verify({ directory: tmp.path, token: issued.token, signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: "AbortError" })
  })

  test("revokes one token without reviving it during verification and revokes all remaining tokens", async () => {
    await using tmp = await tmpdir()
    const one = await api.issue({ directory: tmp.path, models: ["p/a"], expiry })
    const two = await api.issue({ directory: tmp.path, models: ["p/b"], expiry })
    await Promise.all([
      api.verify({ directory: tmp.path, token: one.token }),
      api.revoke({ directory: tmp.path, id: one.record.id }),
    ])
    expect(await api.verify({ directory: tmp.path, token: one.token })).toEqual({ ok: false, reason: "unknown" })
    expect(await api.verify({ directory: tmp.path, token: two.token })).toMatchObject({ ok: true })
    expect(await api.revoke({ directory: tmp.path, id: "absent" })).toBe(false)
    expect(await api.revokeAll({ directory: tmp.path })).toBe(1)
    expect(await api.list(tmp.path)).toEqual([])
  })

  test("serializes concurrent issuance without losing records", async () => {
    await using tmp = await tmpdir()
    const issued = await Promise.all(
      Array.from({ length: 8 }, () => api.issue({ directory: tmp.path, models: ["p/m"], expiry })),
    )
    expect(await api.list(tmp.path)).toHaveLength(8)
    expect(new Set(issued.map((item) => item.token)).size).toBe(8)
    expect((await fs.readdir(bucket(tmp.path))).filter((name) => name.endsWith(".tmp"))).toEqual([])
  })

  test("serializes token writes from independent processes", async () => {
    await using tmp = await tmpdir()
    const children = Array.from({ length: 4 }, () =>
      Bun.spawn({
        cmd: [process.execPath, path.join(import.meta.dir, "tokens-child.ts"), tmp.path],
        env: process.env,
        stdout: "pipe",
        stderr: "pipe",
      }),
    )
    try {
      const results = await Promise.all(
        children.map(async (child) => {
          const [code, stdout, stderr] = await Promise.all([
            child.exited,
            new Response(child.stdout).text(),
            new Response(child.stderr).text(),
          ])
          expect(code, stderr).toBe(0)
          return JSON.parse(stdout) as string[]
        }),
      )
      expect((await api.list(tmp.path)).map((record) => record.id).sort()).toEqual(results.flat().sort())
      expect(results.flat()).toHaveLength(8)
      expect((await fs.readdir(bucket(tmp.path))).filter((name) => name.endsWith(".tmp"))).toEqual([])
    } finally {
      children.forEach((child) => child.kill())
    }
  })

  test("fails closed on corrupt records instead of weakening scope or expiry", async () => {
    await using tmp = await tmpdir()
    const issued = await api.issue({ directory: tmp.path, models: ["p/m"], expiry })
    const saved = JSON.parse(await fs.readFile(file(tmp.path), "utf8"))
    for (const extra of [
      { idle_ms: "broken" },
      { models: [] },
      { models: [1] },
      { max_age_ms: null },
      { last_used: "yesterday" },
      { hash: "00" },
    ]) {
      const body = JSON.stringify({ ...saved, tokens: [{ ...saved.tokens[0], ...extra }] })
      await fs.writeFile(file(tmp.path), body)
      await expect(api.verify({ directory: tmp.path, token: issued.token })).rejects.toThrow("Invalid token store")
      await expect(api.issue({ directory: tmp.path, models: ["p/m"], expiry })).rejects.toThrow("Invalid token store")
      expect(await fs.readFile(file(tmp.path), "utf8")).toBe(body)
    }
  })

  test("rejects malformed or oversized files and a full live registry", async () => {
    await using tmp = await tmpdir()
    const issued = await api.issue({ directory: tmp.path, models: ["p/m"], expiry })
    const saved = JSON.parse(await fs.readFile(file(tmp.path), "utf8"))
    for (const body of ["{", " ".repeat(1024 * 1024 + 1)]) {
      await fs.writeFile(file(tmp.path), body)
      await expect(api.list(tmp.path)).rejects.toThrow()
    }
    await fs.writeFile(
      file(tmp.path),
      JSON.stringify({
        version: 1,
        tokens: Array.from({ length: 1024 }, (_, i) => ({ ...saved.tokens[0], id: `llmk_${i}` })),
      }),
    )
    await expect(api.issue({ directory: tmp.path, models: ["p/m"], expiry })).rejects.toThrow("limit")
    expect(await api.list(tmp.path)).toHaveLength(1024)
    expect(issued.token.length).toBe(43)
  })

  test("refuses an idle slide that would overflow persisted timestamp arithmetic", async () => {
    await using tmp = await tmpdir()
    const issued = await api.issue({ directory: tmp.path, models: ["p/m"], expiry })
    const saved = JSON.parse(await fs.readFile(file(tmp.path), "utf8"))
    const original = JSON.stringify({
      version: 1,
      tokens: [
        {
          ...saved.tokens[0],
          created: 1,
          last_used: 1,
          idle_ms: Number.MAX_SAFE_INTEGER - 1,
          max_age_ms: Number.MAX_SAFE_INTEGER - 1,
        },
      ],
    })
    await fs.writeFile(file(tmp.path), original)
    await expect(api.verify({ directory: tmp.path, token: issued.token })).rejects.toThrow("Invalid token store")
    expect(await fs.readFile(file(tmp.path), "utf8")).toBe(original)
  })
})

describe("explicit listener addresses", () => {
  test("prioritizes recent registrations before its bounded identity probes", async () => {
    await using tmp = await tmpdir()
    const current = { id: "" }
    const probes: string[] = []
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(req) {
        probes.push(req.url)
        return Response.json({ id: current.id })
      },
    })
    try {
      await Promise.all(
        Array.from({ length: 65 }, (_, index) =>
          api.publish({
            directory: tmp.path,
            listenerID: `listener-${index}`,
            hostname: "127.0.0.1",
            port: server.port!,
            started: 1,
          }),
        ),
      )
      const last = path.join(bucket(tmp.path), (await fs.readdir(bucket(tmp.path)))[64]!)
      const saved = JSON.parse(await fs.readFile(last, "utf8"))
      current.id = saved.listenerID
      await fs.writeFile(last, JSON.stringify({ ...saved, started: 2 }))
      expect((await api.addresses(tmp.path)).map((entry) => entry.listenerID)).toEqual([current.id])
      expect(probes.length).toBeLessThanOrEqual(64)
    } finally {
      await server.stop(true)
    }
  })

  test("only returns a live matching identity and never sends a credential to the probe", async () => {
    await using tmp = await tmpdir()
    const id = randomUUID()
    const seen: { url: string; headers: Headers }[] = []
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(req) {
        seen.push({ url: req.url, headers: new Headers(req.headers) })
        return Response.json({ id })
      },
    })
    try {
      await api.publish({ directory: tmp.path, listenerID: id, hostname: "127.0.0.1", port: server.port! })
      expect(await api.addresses(tmp.path)).toMatchObject([{ listenerID: id, port: server.port }])
      expect(new URL(seen[0]!.url).pathname).toBe("/v1/_mimocode")
      expect(seen[0]!.headers.get("authorization")).toBeNull()
      expect(seen[0]!.headers.get("x-api-key")).toBeNull()
      await api.unpublish({ directory: tmp.path, listenerID: id })
      expect(await api.addresses(tmp.path)).toEqual([])
    } finally {
      await server.stop(true)
    }
  })

  test("keeps same-process listeners separate and withdraws only the specified identity", async () => {
    await using tmp = await tmpdir()
    const ids = [randomUUID(), randomUUID()]
    const servers = ids.map((id) => Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => Response.json({ id }) }))
    try {
      for (const [i, server] of servers.entries())
        await api.publish({
          directory: tmp.path,
          listenerID: ids[i]!,
          hostname: "127.0.0.1",
          port: server.port!,
          started: 100 + i,
        })
      expect((await api.addresses(tmp.path)).map((entry) => entry.listenerID)).toEqual(ids.toReversed())
      await api.unpublish({ directory: tmp.path, listenerID: ids[0]! })
      expect((await api.addresses(tmp.path)).map((entry) => entry.listenerID)).toEqual([ids[1]!])
    } finally {
      await Promise.all(servers.map((server) => server.stop(true)))
    }
  })

  test("rejects stale ports and mismatched listener identities even while the PID lives", async () => {
    await using tmp = await tmpdir()
    const id = randomUUID()
    const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => Response.json({ id: "another-listener" }) })
    await api.publish({ directory: tmp.path, listenerID: id, hostname: "127.0.0.1", port: server.port! })
    try {
      expect(await api.addresses(tmp.path)).toEqual([])
    } finally {
      await server.stop(true)
    }
    expect(await api.addresses(tmp.path)).toEqual([])
  })

  test("does not advertise non-loopback endpoints or follow identity redirects", async () => {
    await using tmp = await tmpdir()
    await api.publish({ directory: tmp.path, listenerID: randomUUID(), hostname: "example.test", port: 443 })
    expect(await api.addresses(tmp.path)).toEqual([])
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: () => Response.redirect("https://example.test/"),
    })
    try {
      await api.publish({ directory: tmp.path, listenerID: randomUUID(), hostname: "127.0.0.1", port: server.port! })
      expect(await api.addresses(tmp.path)).toEqual([])
    } finally {
      await server.stop(true)
    }
  })
})
