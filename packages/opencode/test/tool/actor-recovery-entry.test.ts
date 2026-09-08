import { expect } from "bun:test"
import { Effect, Layer } from "effect"
import { ActorRegistry } from "../../src/actor/registry"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Inbox } from "../../src/inbox"
import { Plugin } from "../../src/plugin"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { ToolRegistry, Truncate } from "../../src/tool"
import { shellWrap } from "../../src/tool/shell-wrap"
import { ToolScriptTool, renderToolScriptDeclarations } from "../../src/tool/tool-script"
import type * as Tool from "../../src/tool/tool"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(
  Layer.mergeAll(
    ToolRegistry.defaultLayer,
    Agent.defaultLayer,
    Plugin.defaultLayer,
    Truncate.defaultLayer,
    Session.defaultLayer,
    ActorRegistry.defaultLayer,
    Inbox.defaultLayer,
    Bus.layer,
    CrossSpawnSpawner.defaultLayer,
  ),
)

for (const style of ["json", "shell"] as const) {
  it.live(`actor recovery task schema and nested intake retain the native contract in ${style} mode`, () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "Actor recovery entry" })
        const registry = yield* ActorRegistry.Service
        yield* registry.register({
          sessionID: session.id,
          actorID: "general-1",
          mode: "subagent",
          parentActorID: "main",
          agent: "general",
          description: "Ordinary subagent retains send-only authority",
          contextMode: "none",
          background: true,
          lifecycle: "ephemeral",
        })
        const native = (yield* (yield* ToolRegistry.Service).named()).actor
        const actor = style === "shell" ? { ...shellWrap(native), nativeParameters: native.parameters } : native
        for (const task_id of [undefined, "T2.1"])
          expect(
            native.parameters.safeParse({ operation: { action: "resume", actor_id: "missing", task_id } }).success,
          ).toBe(true)
        for (const task_id of ["", "other", "../T1", 1, null])
          expect(
            native.parameters.safeParse({ operation: { action: "resume", actor_id: "missing", task_id } }).success,
          ).toBe(false)
        const declaration = renderToolScriptDeclarations([actor])
        expect(declaration).toMatch(/action: "resume"; actor_id: string; task_id\?: string/)
        expect(declaration).not.toContain("script: string")
        const exec = yield* (yield* ToolScriptTool).init()
        const context: Tool.Context = {
          sessionID: session.id,
          messageID: MessageID.ascending(),
          agent: "build",
          actorID: "main",
          abort: new AbortController().signal,
          callID: `actor-recovery-${style}`,
          extra: { execTools: { current: [actor] } },
          messages: [],
          metadata: () => Effect.void,
          ask: () => Effect.void,
        }
        const result = yield* exec.execute(
          {
            code: 'return JSON.parse((await tools.actor({ operation: { action: "resume", actor_id: "missing", task_id: "T2.1" } })).output)',
          },
          context,
        )
        expect(result.metadata.status).toBe("completed")
        expect(result.output).toMatch(/"status":\s*"unknown"/)
        const invalid = yield* exec.execute(
          {
            code: 'return await tools.actor({ operation: { action: "resume", actor_id: "missing", task_id: "other" } })',
          },
          context,
        )
        expect(invalid.metadata.status).toBe("code_error")
        expect(invalid.output).toContain("task_id")
        const blocked = yield* exec.execute(
          {
            code: 'return await tools.actor({ operation: { action: "resume", actor_id: "general-1", task_id: "T2.1" } })',
          },
          { ...context, agent: "general", actorID: "general-1" },
        )
        expect(blocked.metadata.status).toBe(style === "shell" ? "completed" : "code_error")
        expect(blocked.output).toContain("Subagents can only use actor send")
        expect((yield* registry.get(session.id, "general-1"))?.status).toBe("pending")
      }),
    ),
  )
}
