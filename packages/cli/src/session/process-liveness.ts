import { randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs"
import path from "node:path"
import { init } from "#db"
import { Global } from "@/global"
import { Database } from "@/storage"

/**
 * Process liveness for processes that share one database.
 *
 * Each process holds an exclusive SQLite lock on its own small file for as long
 * as it lives. The operating system releases that lock when the process exits
 * for any reason, so a lock that can be taken proves its holder is gone. There is
 * no heartbeat and no expiry: a paused, sleeping or overloaded process stays
 * alive, and a killed one is dead at once.
 */

export const INSTANCE_ID = randomUUID()

type Client = ReturnType<typeof init>["$client"]

// The connection must stay strongly referenced: Bun closes an unreachable
// database when it is collected, and closing it releases the lock.
let held: { readonly directory: string; readonly client: Client } | undefined

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function directory() {
  const database = Database.Path
  return path.join(database === ":memory:" ? Global.Path.data : path.dirname(database), "instances")
}

const lockFile = (dir: string, instanceID: string) => path.join(dir, `${instanceID}.lock`)

// Best effort. Windows refuses to delete a file that another handle has open,
// such as a concurrent probe; a file left behind is deleted by a later probe.
function remove(file: string) {
  for (const target of [file, `${file}-journal`]) {
    try {
      rmSync(target, { force: true })
    } catch {}
  }
}

function busy(error: unknown) {
  if (!(error instanceof Error)) return false
  // bun:sqlite reports `code`/`errno`, node:sqlite reports `errcode`.
  const { code, errno, errcode } = error as Error & Partial<Record<"code" | "errno" | "errcode", unknown>>
  return code === "SQLITE_BUSY" || code === "SQLITE_LOCKED" ||
    errno === 5 || errno === 6 || errcode === 5 || errcode === 6 ||
    /database (table )?is locked/i.test(error.message)
}

const COORDINATION = "coordination.db"

/**
 * Run `fn` holding the directory's coordination lock. Publishing and locking a
 * new lock file happens under it, and so does deleting one that looked
 * unlocked, so a starting process's file is never mistaken for a dead one.
 */
export function withCoordination<T>(dir: string, fn: () => T): T {
  mkdirSync(dir, { recursive: true })
  const client = init(path.join(dir, COORDINATION)).$client
  try {
    client.exec("PRAGMA busy_timeout = 5000")
    client.exec("CREATE TABLE IF NOT EXISTS coordination (id INTEGER PRIMARY KEY)")
    client.exec("BEGIN EXCLUSIVE")
    try {
      return fn()
    } finally {
      client.exec("ROLLBACK")
    }
  } finally {
    client.close()
  }
}

/** Take this process's liveness lock. Idempotent; call before writing INSTANCE_ID anywhere others read it. */
export function ensureHeld(dir = directory()): void {
  if (held) return
  const client = withCoordination(dir, () => {
    const client = init(lockFile(dir, INSTANCE_ID)).$client
    try {
      // A first probe from another process may hold the new file for an instant.
      client.exec("PRAGMA busy_timeout = 2000")
      client.exec("PRAGMA journal_mode = DELETE")
      // After its first write the connection keeps the exclusive lock until it closes.
      client.exec("PRAGMA locking_mode = EXCLUSIVE")
      client.exec("CREATE TABLE IF NOT EXISTS instance (pid INTEGER NOT NULL)")
      client.exec("DELETE FROM instance")
      client.exec(`INSERT INTO instance (pid) VALUES (${process.pid})`)
    } catch (error) {
      client.close()
      throw error
    }
    return client
  })
  held = { directory: dir, client }
  sweep(dir)
}

/**
 * Give up this process's liveness lock and delete its file, for a test harness
 * about to delete the directory: Windows cannot delete a file that is still
 * open. Other processes then see this one as gone and may adopt its sessions,
 * so call it only once this process will run nothing more.
 */
export function release(): void {
  if (!held) return
  const { directory: dir, client } = held
  held = undefined
  client.close()
  remove(lockFile(dir, INSTANCE_ID))
}

/** Whether the process that took `instanceID`'s lock is still running. */
export function isAlive(instanceID: string, dir = directory()): boolean {
  if (instanceID === INSTANCE_ID) return true
  if (!ID.test(instanceID)) return false
  const file = lockFile(dir, instanceID)
  const first = probe(file)
  if (first !== "free") return first === "held"
  // Free outside the coordination lock may mean "still starting": look again
  // under it, after any starter has locked its file.
  try {
    return withCoordination(dir, () => {
      const again = probe(file)
      // The id is random per process and never reused, so no live process can
      // still want this file once its lock is free here.
      if (again === "free") remove(file)
      return again === "held"
    })
  } catch (error) {
    // Never declare a process dead on doubt.
    if (busy(error)) return true
    throw error
  }
}

function probe(file: string): "held" | "free" | "missing" {
  if (!existsSync(file)) return "missing"
  let client: Client | undefined
  try {
    client = init(file).$client
    client.exec("PRAGMA busy_timeout = 0")
    client.exec("BEGIN EXCLUSIVE")
    client.exec("ROLLBACK")
  } catch (error) {
    if (busy(error)) return "held"
  } finally {
    client?.close()
  }
  return "free"
}

/** Remove lock files left by processes that are gone. */
function sweep(dir: string) {
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".lock")) continue
    const instanceID = name.slice(0, -".lock".length)
    if (instanceID !== INSTANCE_ID) isAlive(instanceID, dir)
  }
}

export * as ProcessLiveness from "./process-liveness"
