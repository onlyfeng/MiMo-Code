import { expect } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { Effect, Layer } from "effect"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Plugin } from "../../src/plugin"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { ToolRegistry, Truncate } from "../../src/tool"
import { ToolScriptTool } from "../../src/tool/tool-script"
import type * as Tool from "../../src/tool/tool"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

// FC-044: the checkpoint writer returns only `.output` from exec tool calls. The
// patch itself must apply (or fail) the same way whatever the script returns.
const it = testEffect(
  Layer.mergeAll(
    ToolRegistry.defaultLayer,
    Agent.defaultLayer,
    Plugin.defaultLayer,
    Truncate.defaultLayer,
    Session.defaultLayer,
    Bus.layer,
    CrossSpawnSpawner.defaultLayer,
  ),
)

const patch = (file: string, from: string, to: string) =>
  `*** Begin Patch\n*** Update File: ${file}\n@@\n-${from}\n+${to}\n*** End Patch`

const setup = Effect.gen(function* () {
  const session = yield* (yield* Session.Service).create({ title: "exec apply_patch output" })
  const applyPatch = (yield* (yield* ToolRegistry.Service).all()).find((tool) => tool.id === "apply_patch")
  if (!applyPatch) throw new Error("apply_patch is not registered")
  const exec = yield* (yield* ToolScriptTool).init()
  const context: Tool.Context = {
    sessionID: session.id,
    messageID: MessageID.ascending(),
    agent: "build",
    abort: new AbortController().signal,
    callID: "exec-apply-patch",
    extra: { execTools: { current: [applyPatch] } },
    messages: [],
    metadata: () => Effect.void,
    ask: () => Effect.void,
  }
  const run = (code: string) => exec.execute({ code }, context)
  return { run }
})

it.live("a patch returned as .output lands and returns its summary without the diff", () =>
  provideTmpdirInstance((dir) =>
    Effect.gen(function* () {
      const { run } = yield* setup
      const file = path.join(dir, "notes.md")
      yield* Effect.promise(() => fs.writeFile(file, "line one\nold line\nline three\n"))
      const output = yield* run(`return (await tools.apply_patch({ patch_text: ${JSON.stringify(patch(file, "old line", "new line"))} })).output`)
      expect(output.metadata.status).toBe("completed")
      expect(output.output).toContain("Success. Updated the following files")
      expect(output.output).not.toContain("@@")
      // The whole result, which the writer used to return, carries the diff.
      const full = yield* run(`return await tools.apply_patch({ patch_text: ${JSON.stringify(patch(file, "new line", "newer line"))} })`)
      expect(full.metadata.status).toBe("completed")
      expect(full.output).toContain("@@")
      expect(yield* Effect.promise(() => fs.readFile(file, "utf8"))).toBe("line one\nnewer line\nline three\n")
    }),
  ),
)

it.live("a patch that does not apply still fails the exec and leaves the file", () =>
  provideTmpdirInstance((dir) =>
    Effect.gen(function* () {
      const { run } = yield* setup
      const file = path.join(dir, "notes.md")
      yield* Effect.promise(() => fs.writeFile(file, "unchanged\n"))
      const result = yield* run(`return (await tools.apply_patch({ patch_text: ${JSON.stringify(patch(file, "missing line", "x"))} })).output`)
      expect(result.metadata.status).toBe("code_error")
      expect(result.output).toContain("apply_patch")
      expect(yield* Effect.promise(() => fs.readFile(file, "utf8"))).toBe("unchanged\n")
    }),
  ),
)
