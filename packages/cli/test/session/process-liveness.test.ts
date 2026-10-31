import { describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { ProcessLiveness } from "../../src/session/process-liveness"
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
