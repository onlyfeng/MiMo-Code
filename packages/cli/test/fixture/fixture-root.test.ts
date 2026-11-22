import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "./fixture"

// Everything project discovery looks for between a directory and its worktree:
// config and command directories, external skill roots, and instruction files.
const discoverable = [".mimocode", ".claude", ".agents", ".codex", ".opencode", "AGENTS.md", "CLAUDE.md"]

describe("default fixture root", () => {
  // A non-git fixture's worktree is "/", so discovery walks every ancestor. A root
  // under the home directory exposes the developer's own ~/.mimocode and ~/.claude
  // skills to the tests; a root inside the checkout exposes the repository's
  // .mimocode. The preload picks a root with neither.
  test.skipIf(process.platform === "win32")("leaves nothing discoverable above a non-git fixture", async () => {
    await using tmp = await tmpdir()
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        expect(Instance.worktree).toBe("/")
        const found = await Effect.runPromise(
          Effect.gen(function* () {
            const fs = yield* AppFileSystem.Service
            return yield* fs.up({ targets: discoverable, start: Instance.directory, stop: Instance.worktree })
          }).pipe(Effect.provide(AppFileSystem.defaultLayer)),
        )
        expect(found).toEqual([])
      },
    })
  })
})

describe("isolated home", () => {
  // Bun caches os.homedir() when the process starts, so the HOME the preload sets
  // never reached it: production code calling os.homedir() read the developer's
  // real home, e.g. ~/.claude/CLAUDE.md into every test system prompt.
  test("os.homedir() follows the preload's isolated HOME", () => {
    const os = require("os") as typeof import("os")
    expect(process.env["HOME"]).toBeTruthy()
    expect(os.homedir()).toBe(process.env["HOME"]!)
  })
})
