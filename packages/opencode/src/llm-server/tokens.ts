import path from "node:path"
import fs from "node:fs/promises"
import { Buffer } from "node:buffer"
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"
import z from "zod"
import { Hash } from "@mimo-ai/shared/util/hash"
import { Flock } from "@mimo-ai/shared/util/flock"
import { Global } from "@/global"
import { Filesystem } from "@/util"
import { LLMServerScope } from "./scope"

const MAX_FILE = 1024 * 1024
const MAX_TOKENS = 1024
const positive = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const timestamp = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const fields = {
  id: z.string().min(1).max(128),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  label: z.string().max(256).optional(),
  created: timestamp,
  last_used: timestamp.optional(),
  idle_ms: positive,
  max_age_ms: positive,
}
const lifetimes = (value: z.infer<z.ZodObject<typeof fields>>) =>
  (value.last_used === undefined || value.last_used >= value.created) &&
  Number.isSafeInteger(value.created + value.max_age_ms) &&
  Number.isSafeInteger((value.last_used ?? value.created) + value.idle_ms)
const legacyRecord = z.strictObject({ ...fields, models: z.array(LLMServerScope.ModelRef).length(1) }).refine(lifetimes)
const legacySchema = z.strictObject({ version: z.literal(1), tokens: z.array(legacyRecord).max(MAX_TOKENS) })
const record = z.strictObject({ ...fields, scope: LLMServerScope.Schema }).refine(lifetimes)
const schema = z.strictObject({ version: z.literal(2), tokens: z.array(record).max(MAX_TOKENS) })
type StoredRecord = z.infer<typeof record>
type Store = z.infer<typeof schema>
type PublicScope =
  | { scope: Extract<LLMServerScope.Scope, { type: "models" }>; models: string[] }
  | { scope: Extract<LLMServerScope.Scope, { type: "all" }>; models?: never }
export type PublicRecord = Omit<StoredRecord, "hash" | "scope"> & PublicScope
type FiniteRecord = Omit<StoredRecord, "hash" | "scope"> & Extract<PublicScope, { models: string[] }>
export type Expiry = { idleMs: number; maxAgeMs: number }
type Lifetime = Pick<StoredRecord, "created" | "last_used" | "idle_ms" | "max_age_ms">

function bucket(directory: string) {
  return path.join(Global.Path.state, "llm-server", Hash.fast(Filesystem.resolve(directory)))
}

function file(directory: string) {
  return path.join(bucket(directory), "tokens.json")
}

async function readSmall(target: string, limit: number) {
  const handle = await fs.open(target, "r").catch((error: unknown) => {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return undefined
    throw error
  })
  if (!handle) return undefined
  try {
    const bytes = Buffer.alloc(limit + 1)
    let size = 0
    while (size <= limit) {
      const next = await handle.read(bytes, size, bytes.length - size, null)
      if (!next.bytesRead) return bytes.subarray(0, size).toString("utf8")
      size += next.bytesRead
    }
    throw new Error("Token registry file exceeds its size limit")
  } finally {
    await handle.close()
  }
}

async function read(directory: string): Promise<Store> {
  const text = await readSmall(file(directory), MAX_FILE)
  if (text === undefined) return { version: 2, tokens: [] }
  const raw: unknown = await Promise.resolve()
    .then(() => JSON.parse(text))
    .catch(() => undefined)
  const parsed = z.union([schema, legacySchema]).safeParse(raw)
  if (!parsed.success) throw new Error("Invalid token store")
  if (parsed.data.version === 2) return parsed.data
  return {
    version: 2,
    tokens: parsed.data.tokens.map(({ models, ...value }) => ({ ...value, scope: { type: "models", models } })),
  }
}

async function atomic(target: string, text: string) {
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(temporary, text, { mode: 0o600, flag: "wx" })
    await fs.rename(temporary, target)
  } finally {
    await fs.rm(temporary, { force: true })
  }
}

function mutate<T>(directory: string, signal: AbortSignal | undefined, fn: (store: Store) => T) {
  return Flock.withLock(
    `llm-server-tokens:${bucket(directory)}`,
    async () => {
      signal?.throwIfAborted()
      const store = await read(directory)
      const before = JSON.stringify(store)
      const result = fn(store)
      if (!schema.safeParse(store).success) throw new Error("Invalid token store")
      const after = JSON.stringify(store)
      if (after !== before) {
        if (Buffer.byteLength(after) > MAX_FILE) throw new Error("Token registry exceeds its size limit")
        signal?.throwIfAborted()
        await atomic(file(directory), after)
      }
      return result
    },
    { signal, timeoutMs: 1000, baseDelayMs: 10, maxDelayMs: 50 },
  )
}

function publicRecord(value: StoredRecord): PublicRecord {
  return {
    id: value.id,
    ...publicScope(value.scope),
    label: value.label,
    created: value.created,
    last_used: value.last_used,
    idle_ms: value.idle_ms,
    max_age_ms: value.max_age_ms,
  }
}

function publicScope(scope: LLMServerScope.Scope): PublicScope {
  return scope.type === "models" ? { scope, models: scope.models } : { scope }
}

export function expiresAt(value: Lifetime) {
  return Math.min(value.created + value.max_age_ms, (value.last_used ?? value.created) + value.idle_ms)
}

export function expired(value: Lifetime, now = Date.now()) {
  return now >= expiresAt(value)
}

type IssueOptions = {
  directory: string
  expiry: Expiry
  label?: string
  signal?: AbortSignal
}
type IssueScope = { models: readonly string[]; allModels?: never } | { allModels: true; models?: never }
export function issue(
  input: IssueOptions & { models: readonly string[]; allModels?: never },
): Promise<{ token: string; record: FiniteRecord }>
export function issue(
  input: IssueOptions & { allModels: true; models?: never },
): Promise<{ token: string; record: PublicRecord }>
export function issue(input: IssueOptions & IssueScope): Promise<{ token: string; record: PublicRecord }>
export async function issue(input: IssueOptions & IssueScope) {
  input.signal?.throwIfAborted()
  const selection = z
    .union([
      z.strictObject({
        models: LLMServerScope.Models.refine((models) => models.every((model) => !model.includes("*"))),
        allModels: z.never().optional(),
      }),
      z.strictObject({ allModels: z.literal(true), models: z.never().optional() }),
    ])
    .safeParse({ models: input.models, allModels: input.allModels })
  if (!selection.success) throw new Error("Invalid token scope: specify 1–64 unique models or allModels: true")
  const token = randomBytes(32).toString("base64url")
  const parsed = record.safeParse({
    id: `llmk_${randomUUID().replaceAll("-", "")}`,
    hash: createHash("sha256").update(token).digest("hex"),
    scope: selection.data.models ? { type: "models", models: selection.data.models } : { type: "all" },
    label: input.label,
    created: Date.now(),
    idle_ms: input.expiry.idleMs,
    max_age_ms: input.expiry.maxAgeMs,
  })
  if (!parsed.success)
    throw new Error("Invalid token request: specify a valid scope and finite positive safe lifetimes")
  await mutate(input.directory, input.signal, (store) => {
    const live = store.tokens.filter((value) => !expired(value))
    if (live.length >= MAX_TOKENS) throw new Error("Token registry reached its record limit")
    store.tokens = live.concat(parsed.data)
  })
  return { token, record: publicRecord(parsed.data) }
}

export type Verdict =
  | ({ ok: true; id: string; expiresAt: number } & PublicScope)
  | { ok: false; reason: "unknown" | "expired" }

export async function verify(input: { directory: string; token: string; signal?: AbortSignal }): Promise<Verdict> {
  input.signal?.throwIfAborted()
  if (!/^[A-Za-z0-9_-]{43}$/.test(input.token)) return { ok: false, reason: "unknown" }
  const digest = createHash("sha256").update(input.token).digest()
  const matches = (value: StoredRecord) => timingSafeEqual(Buffer.from(value.hash, "hex"), digest)
  // Unknown credentials do not acquire a disk lock or generate lock files.
  if (!(await read(input.directory)).tokens.some(matches)) return { ok: false, reason: "unknown" }
  return mutate(input.directory, input.signal, (store): Verdict => {
    // Re-read under the same lock as revoke so verification cannot resurrect a key.
    const found = store.tokens.find(matches)
    if (!found) return { ok: false, reason: "unknown" }
    if (expired(found)) {
      store.tokens = store.tokens.filter((value) => value.id !== found.id)
      return { ok: false, reason: "expired" }
    }
    found.last_used = Math.max(Date.now(), found.last_used ?? found.created)
    return { ok: true, id: found.id, ...publicScope(found.scope), expiresAt: expiresAt(found) }
  })
}

export async function list(directory: string) {
  return (await read(directory)).tokens.map((value) => ({
    ...publicRecord(value),
    expired: expired(value),
    expires_at: expiresAt(value),
  }))
}

export function revoke(input: { directory: string; id: string; signal?: AbortSignal }) {
  return mutate(input.directory, input.signal, (store) => {
    const before = store.tokens.length
    store.tokens = store.tokens.filter((value) => value.id !== input.id)
    return store.tokens.length < before
  })
}

export function revokeAll(input: { directory: string; signal?: AbortSignal }) {
  return mutate(input.directory, input.signal, (store) => {
    const count = store.tokens.length
    store.tokens = []
    return count
  })
}

const listenerID = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/)
const addressSchema = z.strictObject({
  listenerID,
  pid: positive.max(0x7fffffff),
  hostname: z.enum(["127.0.0.1", "localhost", "::1"]),
  port: positive.max(65535),
  url: z.string(),
  started: timestamp,
})
export type Address = z.infer<typeof addressSchema>

export async function publish(input: {
  directory: string
  listenerID: string
  pid?: number
  hostname: string
  port: number
  started?: number
}) {
  const hostname = input.hostname === "0.0.0.0" || input.hostname === "::" ? "127.0.0.1" : input.hostname
  if (!["127.0.0.1", "localhost", "::1"].includes(hostname)) return
  const url = new URL("http://localhost")
  url.hostname = hostname === "::1" ? "[::1]" : hostname
  url.port = String(input.port)
  const address = addressSchema.parse({
    listenerID: input.listenerID,
    pid: input.pid ?? process.pid,
    hostname,
    port: input.port,
    url: url.origin,
    started: input.started ?? Date.now(),
  })
  await atomic(path.join(bucket(input.directory), `server-${address.listenerID}.json`), JSON.stringify(address))
}

export async function unpublish(input: { directory: string; listenerID: string }) {
  const id = listenerID.parse(input.listenerID)
  await fs.rm(path.join(bucket(input.directory), `server-${id}.json`), { force: true })
}

async function identity(address: Address) {
  const expected = new URL("http://localhost")
  expected.hostname = address.hostname === "::1" ? "[::1]" : address.hostname
  expected.port = String(address.port)
  if (address.url !== expected.origin) return false
  const response = await fetch(new URL("/v1/_mimocode", expected), {
    redirect: "error",
    signal: AbortSignal.timeout(500),
    headers: { connection: "close" },
  })
  if (!response.ok || !response.body) {
    await response.body?.cancel()
    return false
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.byteLength
      if (size > 4096) {
        await reader.cancel()
        return false
      }
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }
  const body: unknown = await Promise.resolve()
    .then(() => JSON.parse(Buffer.concat(chunks).toString("utf8")))
    .catch(() => undefined)
  return typeof body === "object" && body !== null && "id" in body && body.id === address.listenerID
}

export async function addresses(directory: string): Promise<Address[]> {
  const names: string[] = []
  let scanned = 0
  try {
    for await (const entry of await fs.opendir(bucket(directory))) {
      if (entry.isFile() && /^server-[A-Za-z0-9_-]+\.json$/.test(entry.name)) names.push(entry.name)
      // Bound directory traversal and metadata reads separately from network probes.
      if (++scanned >= 1024 || names.length >= 256) break
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return []
    throw error
  }
  const registered = await Promise.all(
    names.map(async (name) => {
      const text = await readSmall(path.join(bucket(directory), name), 4096).catch(() => undefined)
      const raw: unknown = await Promise.resolve()
        .then(() => (text ? JSON.parse(text) : undefined))
        .catch(() => undefined)
      const parsed = addressSchema.safeParse(raw)
      if (!parsed.success || name !== `server-${parsed.data.listenerID}.json`) return undefined
      return parsed.data
    }),
  )
  const candidates = registered
    .filter((value): value is Address => value !== undefined)
    .sort((a, b) => b.started - a.started)
    .slice(0, 64)
  const found = await Promise.all(
    candidates.map(async (address) => {
      const live = await Promise.resolve()
        .then(() => process.kill(address.pid, 0))
        .then(() => true)
        .catch(() => false)
      if (!live) {
        await unpublish({ directory, listenerID: address.listenerID })
        return undefined
      }
      return (await identity(address).catch(() => false)) ? address : undefined
    }),
  )
  return found.filter((value): value is Address => value !== undefined)
}

export * as LLMServerTokens from "./tokens"
