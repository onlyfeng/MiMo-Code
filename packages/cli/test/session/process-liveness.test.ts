import { describe, expect, test } from "bun:test"
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { ProcessLiveness } from "../../src/session/process-liveness"
import { init } from "../../src/storage/db.bun"
import { startProcessOwner } from "../lib/process-owner"

function lockDirectory() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "mimo-liveness-"))
  return { directory, [Symbol.dispose]: () => rmSync(directory, { recursive: true, force: true }) }
}

describe("process liveness", () => {
  test("another process is alive while it holds its lock and dead once the kernel releases it", async () => {
    using locks = lockDirectory()
    await using owner = await startProcessOwner(locks.directory)
    expect(owner.instanceID).not.toBe(ProcessLiveness.INSTANCE_ID)
    expect(ProcessLiveness.isAlive(owner.instanceID, locks.directory)).toBe(true)
    // Probing must not take the lock away from a live owner.
    expect(ProcessLiveness.isAlive(owner.instanceID, locks.directory)).toBe(true)

    await owner.kill()
    expect(ProcessLiveness.isAlive(owner.instanceID, locks.directory)).toBe(false)
    expect(existsSync(path.join(locks.directory, `${owner.instanceID}.lock`))).toBe(false)
  }, 30_000)

  test("a process that releases its lock is dead to others while it keeps running, and leaves no lock file", async () => {
    using locks = lockDirectory()
    await using owner = await startProcessOwner(locks.directory)
    expect(ProcessLiveness.isAlive(owner.instanceID, locks.directory)).toBe(true)

    await owner.release()
    // Closed before deleted: Windows refuses to delete a file that is still open.
    expect(existsSync(path.join(locks.directory, `${owner.instanceID}.lock`))).toBe(false)
    expect(ProcessLiveness.isAlive(owner.instanceID, locks.directory)).toBe(false)
    expect(() => process.kill(owner.pid, 0)).not.toThrow()
  }, 30_000)

  // Root deletes inside a read-only directory, so POSIX has no deletion blocker for it.
  const posixRoot = process.platform !== "win32" && process.getuid?.() === 0
  test.skipIf(posixRoot)("a dead instance whose lock file cannot be deleted yet is still dead, and a later probe deletes it", () => {
    using locks = lockDirectory()
    const stale = "00000000-0000-4000-8000-000000000001"
    const file = path.join(locks.directory, `${stale}.lock`)
    writeFileSync(file, "")
    ProcessLiveness.withCoordination(locks.directory, () => undefined)
    // Deletion fails on Windows while another handle has the file open, as a
    // concurrent probe does. POSIX deletes open files, so there the directory
    // is made read-only instead; on Windows that attribute would also fail
    // the coordination lock's mkdir.
    const open = init(file).$client
    const readOnly = process.platform !== "win32"
    if (readOnly) chmodSync(locks.directory, 0o555)
    try {
      expect(ProcessLiveness.isAlive(stale, locks.directory)).toBe(false)
      expect(existsSync(file)).toBe(true)
    } finally {
      if (readOnly) chmodSync(locks.directory, 0o755)
      open.close()
    }
    expect(ProcessLiveness.isAlive(stale, locks.directory)).toBe(false)
    expect(existsSync(file)).toBe(false)
  })

  test("a lock file published but not yet locked is not swept away from its starting process", async () => {
    using locks = lockDirectory()
    const marker = path.join(locks.directory, "initializing")
    const child = Bun.spawn([process.execPath, "run", path.join(import.meta.dir, "../fixture/process-liveness-initializer.ts"), locks.directory, marker], {
      env: { ...process.env }, stdout: "ignore", stderr: "inherit",
    })
    try {
      for (let waited = 0; !existsSync(marker) && waited < 10_000; waited += 20) await Bun.sleep(20)
      const instanceID = readFileSync(marker, "utf8")
      // The file is there but unlocked; the probe must wait for the starter, not delete its file.
      expect(ProcessLiveness.isAlive(instanceID, locks.directory)).toBe(true)
      expect(existsSync(path.join(locks.directory, `${instanceID}.lock`))).toBe(true)
      expect(ProcessLiveness.isAlive(instanceID, locks.directory)).toBe(true)
    } finally {
      child.kill("SIGKILL")
      await child.exited
    }
  }, 30_000)

  test("an instance without a lock file, a malformed id, or an unlocked file is not alive", () => {
    using locks = lockDirectory()
    const stale = "00000000-0000-4000-8000-000000000000"
    expect(ProcessLiveness.isAlive(stale, locks.directory)).toBe(false)
    expect(ProcessLiveness.isAlive("../escape", locks.directory)).toBe(false)
    writeFileSync(path.join(locks.directory, `${stale}.lock`), "")
    expect(ProcessLiveness.isAlive(stale, locks.directory)).toBe(false)
    expect(existsSync(path.join(locks.directory, `${stale}.lock`))).toBe(false)
  })

  test("the current process counts as alive", () => {
    expect(ProcessLiveness.isAlive(ProcessLiveness.INSTANCE_ID)).toBe(true)
  })
})
