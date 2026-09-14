import { afterEach, expect, test } from "bun:test"
import yargs from "yargs"
import { LlmServerCommand } from "../../src/cli/cmd/llm-server"
import { LLMServerTokens } from "../../src/llm-server/tokens"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

afterEach(async () => {
  await Instance.disposeAll()
})

/**
 * Drive the real command through yargs, the way `mimo` does.
 *
 * `revoke`'s handler resolves its store from `process.cwd()`, so the only honest way
 * to aim it at a throwaway project is to be in that directory while it runs. Restored
 * in `finally` so a failing assertion cannot leave the suite somewhere else.
 */
async function revoke(directory: string, ...argv: string[]) {
  const cwd = process.cwd()
  const before = process.exitCode
  process.chdir(directory)
  // `0`, not `undefined`: in Bun, assigning `undefined` to `process.exitCode` leaves
  // the previous value in place. Clearing with `undefined` let a `1` from one case
  // leak into the next and read as a failure there, with the command having plainly
  // succeeded in its own output.
  process.exitCode = 0
  try {
    await yargs(["llm-server", "revoke", ...argv])
      .command(LlmServerCommand)
      .exitProcess(false)
      .fail(() => {})
      .parseAsync()
    return process.exitCode
  } finally {
    process.exitCode = typeof before === "number" ? before : 0
    process.chdir(cwd)
  }
}

test("revoke refuses an id and --all together instead of revoking everything", async () => {
  // `--all` is answered before the id, so the missing guard did not merely ignore the
  // id — it deleted every token in the directory while the caller had named exactly
  // one. Revocation has no undo, which is why the ambiguous form has to fail rather
  // than pick a side.
  await using tmp = await tmpdir({ git: true })
  const kept = await LLMServerTokens.issue({ directory: tmp.path, expiry: {} })
  const other = await LLMServerTokens.issue({ directory: tmp.path, expiry: {} })

  expect(await revoke(tmp.path, kept.record.id, "--all")).toBe(1)

  // The assertion that matters is the store, not the exit code: a guard that reports
  // an error after calling `revokeAll` would satisfy the code check alone.
  const survivors = (await LLMServerTokens.list(tmp.path)).map((t) => t.id).sort()
  expect(survivors).toEqual([kept.record.id, other.record.id].sort())
})

test("each form still works on its own", async () => {
  await using tmp = await tmpdir({ git: true })
  const one = await LLMServerTokens.issue({ directory: tmp.path, expiry: {} })
  const two = await LLMServerTokens.issue({ directory: tmp.path, expiry: {} })

  expect(await revoke(tmp.path, one.record.id)).toBe(0)
  expect((await LLMServerTokens.list(tmp.path)).map((t) => t.id)).toEqual([two.record.id])

  expect(await revoke(tmp.path, "--all")).toBe(0)
  expect(await LLMServerTokens.list(tmp.path)).toEqual([])
})
