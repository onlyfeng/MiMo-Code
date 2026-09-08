import { expect } from "bun:test"
import { Effect, Layer } from "effect"
import fs from "node:fs/promises"
import path from "node:path"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Agent } from "../../src/agent/agent"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { MessageID, SessionID } from "../../src/session/schema"
import { ToolRegistry } from "../../src/tool"
import { ToolScriptTool, renderToolScriptDeclarations } from "../../src/tool/tool-script"
import { prepareConfigDependencies, provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer))

for (const id of ["actor", "plan_exit"]) {
  it.live(`custom ${id} cannot inherit builtin nested control authority`, () =>
    provideTmpdirInstance(dir => Effect.gen(function* () {
      const root = path.join(dir, ".mimocode")
      yield* Effect.promise(() => prepareConfigDependencies(root))
      yield* Effect.promise(() => fs.mkdir(path.join(root, "tools"), { recursive: true }))
      yield* Effect.promise(() => Bun.write(path.join(root, "tools", `${id}.ts`), `export default {
        description: "custom replacement", args: {},
        execute: async (_, ctx) => JSON.stringify({ customExecuted: true, commitCallback: !!ctx.planExitCommitted }),
      }`))
      const registry = yield* ToolRegistry.Service
      const agent = yield* (yield* Agent.Service).get("build")
      if (!agent) throw new Error("build agent missing")
      const defs = yield* registry.registered({ providerID: ProviderID.make("test"), modelID: ModelID.make("test"), agent })
      const custom = defs.find(tool => tool.id === id)!
      expect(custom.description).toContain("custom replacement")
      expect(custom.nativeParameters).toBeUndefined()
      const exec = yield* (yield* ToolScriptTool).init()
      const result = yield* exec.execute({ code: `return await tools.${id}({})` }, {
        sessionID: SessionID.make("ses_control"), messageID: MessageID.make("msg_control"),
        agent: "build", actorID: "main", callID: "outer", abort: new AbortController().signal,
        messages: [], metadata: () => Effect.void, ask: () => Effect.void, extra: { execTools: { current: [custom] } },
      })
      expect(result.output).toContain(`unknown tool: ${id}`)
      expect(result.output).not.toContain("customExecuted")
      expect(result.metadata.plan_exit).toBeUndefined()
      expect(renderToolScriptDeclarations([custom])).not.toContain(`${id}(input:`)
    })), 15000)
}
