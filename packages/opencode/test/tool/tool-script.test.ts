import { describe, expect, test, afterAll } from "bun:test"
import { Effect, Layer, ManagedRuntime, Stream } from "effect"
import z from "zod"
import os from "os"
import fs from "fs/promises"
import path from "path"
import { evalScript } from "../../src/workflow/sandbox"
import { Agent } from "../../src/agent/agent"
import { Truncate, Tool } from "../../src/tool"
import { ToolScriptTool, renderToolScriptDeclarations, viewExecSubtools, type ExecSubPartSnapshot } from "../../src/tool/tool-script"
import { RecoverableError } from "../../src/tool/recoverable"
import { toolScriptRegistry, TOOL_SCRIPT_EXCLUDED } from "../../src/tool/tool-script-ref"
import { Instance } from "../../src/project/instance"
import { Plugin } from "../../src/plugin"
import { Bus } from "../../src/bus"
import { Metrics } from "../../src/metrics"
import { ModelID, ProviderID } from "../../src/provider/schema"

describe("sandbox non-deterministic mode", () => {
  test("deterministic:false keeps Date and Math.random", async () => {
    const result = (await evalScript(
      `return { hasDate: typeof Date === "function", rand: Math.random() }`,
      {},
      { deterministic: false },
    )) as { hasDate: boolean; rand: number }
    expect(result.hasDate).toBe(true)
    expect(result.rand).toBeGreaterThanOrEqual(0)
    expect(result.rand).toBeLessThan(1)
  })

  test("default mode still strips Date (workflow contract unchanged)", async () => {
    const result = await evalScript(`return typeof Date`, {})
    expect(result).toBe("undefined")
  })

  test("activeDeadlineMs kills runaway sync code", async () => {
    await expect(evalScript(`while (true) {}`, {}, { deterministic: false, activeDeadlineMs: 200 })).rejects.toThrow()
  })

  test("activeDeadlineMs does NOT charge time parked on a host hook", async () => {
    const hooks = {
      slow: async () => {
        await new Promise((r) => setTimeout(r, 300))
        return "ok"
      },
    }
    const result = await evalScript(`return await slow()`, hooks, {
      deterministic: false,
      activeDeadlineMs: 150,
    })
    expect(result).toBe("ok")
  })

  test("interrupt() stops the guest once it resumes after a host hook", async () => {
    // interrupt is polled during guest BYTECODE execution only. A pure sync spin
    // blocks the host event loop, so timer-driven aborts can't fire — the kill
    // for that case is activeDeadlineMs (Date-based, above). Here abort is set
    // while the guest is parked on a hook; the spin after resume is interrupted.
    let stop = false
    const hooks = {
      pause: async () => {
        await new Promise((r) => setTimeout(r, 50))
        stop = true
        return "ok"
      },
    }
    await expect(
      evalScript(`await pause(); while (true) {}`, hooks, { deterministic: false, interrupt: () => stop }),
    ).rejects.toThrow()
  })
})

let cancelledTool: string | undefined
const hookCalls = { before: [] as string[], after: [] as string[] }
const plugin = Layer.succeed(
  Plugin.Service,
  Plugin.Service.of({
    trigger: (name, input, output) =>
      Effect.sync(() => {
        const tool = (input as { tool?: string }).tool
        if (name === "tool.execute.before" && tool) {
          hookCalls.before.push(tool)
          if (tool === cancelledTool && output && typeof output === "object")
            Object.assign(output, { cancel: true, cancelReason: "blocked by test hook" })
        }
        if (name === "tool.execute.after" && tool) hookCalls.after.push(tool)
        return output
      }),
    list: () => Effect.succeed([]),
    init: () => Effect.void,
    reloadFileHooks: () => Effect.void,
    triggerActorPreStop: () =>
      Effect.succeed({ continue: false, contributingPluginNames: [], contributingHookIDs: [] }),
    triggerActorPostStop: () =>
      Effect.succeed({ continue: false, contributingPluginNames: [], contributingHookIDs: [] }),
  }),
)
const metricEvents: z.infer<typeof Metrics.ToolCall.properties>[] = []
const bus = Layer.succeed(
  Bus.Service,
  Bus.Service.of({
    publish: (def, properties) =>
      Effect.sync(() => {
        if (def.type === Metrics.ToolCall.type) metricEvents.push(Metrics.ToolCall.properties.parse(properties))
      }),
    subscribe: () => Stream.empty,
    subscribeAll: () => Stream.empty,
    subscribeCallback: () => Effect.succeed(() => {}),
    subscribeAllCallback: () => Effect.succeed(() => {}),
  }),
)
const runtime = ManagedRuntime.make(
  Layer.mergeAll(Truncate.defaultLayer, Agent.defaultLayer, plugin, bus),
)

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mimocode-test-toolscript-"))
afterAll(async () => {
  await Instance.disposeAll()
  await fs.rm(tmp, { recursive: true, force: true })
})

function fakeDef(id: string, execute: (args: any) => Promise<string>): Tool.Def {
  return {
    id,
    description: `fake ${id}`,
    parameters: z.object({ value: z.string().optional() }),
    execute: (args: any) =>
      Effect.promise(() => execute(args)).pipe(
        Effect.map((output) => ({ title: id, output, metadata: {} })),
      ),
  }
}

async function runToolScript(
  code: string,
  defs: Tool.Def[],
  abort?: AbortSignal,
  opts?: {
    ask?: () => Effect.Effect<void>
    maxToolCalls?: number
    timeoutSeconds?: number
    toolWhitelist?: Set<string> | string[]
    mcp?: Record<string, unknown>
    model?: {
      id: ModelID
      providerID: ProviderID
      api: { id: string }
      family?: string
    }
    onRegistryInput?: (input: Parameters<NonNullable<typeof toolScriptRegistry.current>>[0]) => void
    onMetadata?: (metadata: Record<string, unknown>) => void
  },
) {
  const prev = toolScriptRegistry.current
  toolScriptRegistry.current = (input) => {
    opts?.onRegistryInput?.(input)
    return Effect.succeed(defs)
  }
  try {
    return await Instance.provide({
      directory: tmp,
      fn: async () => {
        const info = await runtime.runPromise(ToolScriptTool)
        const def = await Effect.runPromise(Tool.init(info))
        return runtime.runPromise(
          def.execute(
            {
              code,
              ...(opts?.maxToolCalls !== undefined && { max_tool_calls: opts.maxToolCalls }),
              ...(opts?.timeoutSeconds !== undefined && { timeout_seconds: opts.timeoutSeconds }),
            },
            {
              sessionID: "ses_test" as any,
              messageID: "msg_test" as any,
              agent: "build",
              abort: abort ?? new AbortController().signal,
              callID: "call_test",
              extra: {
                ...(opts?.model ? { model: opts.model } : {}),
                ...(opts?.toolWhitelist ? { toolWhitelist: opts.toolWhitelist } : {}),
                ...(opts?.mcp ? { execMcp: { current: opts.mcp } } : {}),
              },
              messages: [],
              metadata: (value) =>
                Effect.sync(() => opts?.onMetadata?.((value.metadata ?? {}) as Record<string, unknown>)),
              ask: opts?.ask ?? (() => Effect.void),
            },
          ),
        )
      },
    })
  } finally {
    toolScriptRegistry.current = prev
  }
}

describe("exec", () => {
  test("passes the complete model identity to its late-bound registry", async () => {
    let received: Parameters<NonNullable<typeof toolScriptRegistry.current>>[0] | undefined
    const result = await runToolScript(`return ALL_TOOLS.length`, [], undefined, {
      model: {
        id: ModelID.make("mimo"),
        providerID: ProviderID.make("xiaomi"),
        api: { id: "mimo-v2.5-pro" },
        family: "mimo-v2.6",
      },
      onRegistryInput: (input) => {
        received = input
      },
    })

    expect(result.metadata.status).toBe("completed")
    expect(received).toMatchObject({
      providerID: "xiaomi",
      modelID: "mimo",
      modelAPIID: "mimo-v2.5-pro",
      modelFamily: "mimo-v2.6",
    })
  })

  test("cannot call tools outside the actor runtime whitelist", async () => {
    const result = await runToolScript(
      `return await tools.echo({ value: "blocked" })`,
      [fakeDef("echo", async () => "unexpected")],
      undefined,
      { toolWhitelist: ["exec"] },
    )

    expect(result.metadata.status).toBe("code_error")
    expect(result.output).toContain("echo")
    expect(result.output).not.toContain("unexpected")
  })

  test("executes code, calls tools, returns aggregated result", async () => {
    const seen: string[] = []
    const defs = [
      fakeDef("echo", async (args) => {
        seen.push(args.value)
        return `echo:${args.value}`
      }),
    ]
    const result = await runToolScript(
      `
      const items = ["a", "b", "c"]
      const outs = await Promise.all(items.map(v => tools.echo({ value: v })))
      return outs.map(o => o.output)
      `,
      defs,
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("echo:a")
    expect(result.output).toContain("echo:c")
    expect(seen.toSorted()).toEqual(["a", "b", "c"])
    expect(result.metadata.toolCalls).toBe(3)
  })

  test("terminal metadata keeps the per-tool counts breakdown", async () => {
    const defs = [
      fakeDef("echo", async (args) => `echo:${args.value}`),
      fakeDef("boom", async () => {
        throw new Error("kapow")
      }),
    ]
    const result = await runToolScript(
      `
      await tools.echo({ value: "a" })
      await tools.echo({ value: "b" })
      try { await tools.boom({}) } catch {}
      return "done"
      `,
      defs,
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.metadata.counts).toEqual({
      echo: { n: 2, errors: 0 },
      boom: { n: 1, errors: 1 },
    })
  })

  test("retains actor reference metadata from an allowed nested tool", async () => {
    const parameters = z.object({ operation: z.object({ action: z.string() }) })
    const probe: Tool.Def<typeof parameters> = {
      id: "probe",
      description: "fake metadata probe",
      parameters,
      execute: (args, ctx) =>
        Effect.gen(function* () {
          yield* ctx.metadata({
            title: "Starting child",
            metadata: { sessionId: "ses_child", actorId: "general-1", model: "test/model" },
          })
          return {
            title: "Child task",
            output: `action:${args.operation.action}`,
            metadata: { sessionId: "ses_child", actorId: "general-1", model: "test/model" },
          }
        }),
    }
    const result = await runToolScript(
      `return await tools.probe({ operation: { action: "spawn" } })`,
      [probe],
    )
    const records = result.metadata.sub_parts as ExecSubPartSnapshot[]

    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      seq: 1,
      callID: "call_test:1",
      tool: "probe",
      state: {
        status: "completed",
        title: "Child task",
        input: { operation: { action: "spawn" } },
        output: "action:spawn",
        metadata: { sessionId: "ses_child", actorId: "general-1", model: "test/model" },
      },
    })
    expect(viewExecSubtools(result.metadata)).toEqual(records)
  })

  test("views partial exec snapshots without evaluating or filling missing calls", () => {
    const metadata = {
      exec_schema: 1,
      sub_parts: [
        {
          seq: 2,
          type: "tool",
          callID: "outer:2",
          tool: "read",
          state: { status: "running", input: { file_path: "b.txt" }, time: { start: 20 } },
        },
        {
          seq: 1,
          type: "tool",
          callID: "outer:1",
          tool: "bash",
          state: {
            status: "completed",
            input: { command: "echo a" },
            title: "Run command",
            output: "a",
            metadata: { exit: 0 },
            time: { start: 10, end: 11 },
          },
        },
        {
          seq: 1,
          type: "tool",
          callID: "outer:duplicate",
          tool: "bash",
          state: {
            status: "completed",
            input: { command: "echo duplicate" },
            title: "Duplicate",
            output: "duplicate",
            time: { start: 12, end: 13 },
          },
        },
        { seq: "bad", type: "tool" },
      ],
    }

    expect(viewExecSubtools(metadata).map((part) => part.callID)).toEqual(["outer:1", "outer:2"])
    expect(viewExecSubtools({ exec_schema: 2, sub_parts: metadata.sub_parts })).toEqual([])
  })

  test("preserves scalar nested input and filters malformed persisted attachments", () => {
    const metadata = {
      exec_schema: 1,
      sub_parts: [{
        seq: 1,
        type: "tool",
        callID: "outer:1",
        tool: "scalar_mcp",
        state: {
          status: "completed",
          input: "literal",
          title: "Scalar",
          output: "ok",
          time: { start: 1, end: 2 },
          attachments: [{ bad: true }, { type: "file", mime: "text/plain", url: "data:text/plain;base64, b2s=" }],
        },
      }],
    }
    const part = viewExecSubtools(metadata)[0]
    expect(part?.state.input).toBe("literal")
    expect(part?.state.attachments).toEqual([{ type: "file", mime: "text/plain", url: "data:text/plain;base64, b2s=" }])
  })

  test("publishes a running nested part before the nested tool settles", async () => {
    const parameters = z.object({ value: z.string() })
    const slow: Tool.Def<typeof parameters> = {
      id: "slow",
      description: "fake slow tool",
      parameters,
      execute: (_args, ctx) =>
        Effect.gen(function* () {
          yield* ctx.metadata({ metadata: { phase: "started" } })
          yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 30)))
          return { title: "Slow", output: "done", metadata: { phase: "done" } }
        }),
    }
    const live: ExecSubPartSnapshot[] = []
    const result = await runToolScript(`return await tools.slow({ value: "x" })`, [slow], undefined, {
      onMetadata: (metadata) => {
        const part = viewExecSubtools(metadata)[0]
        if (part) live.push(part)
      },
    })

    expect(live.some((part) => part.state.status === "running")).toBe(true)
    expect(viewExecSubtools(result.metadata)[0]?.state.status).toBe("completed")
  })

  test("coalesces live metadata and flushes the latest snapshot at exec terminal", async () => {
    const parameters = z.object({ value: z.string() })
    const noisy: Tool.Def<typeof parameters> = {
      id: "noisy",
      description: "fake noisy tool",
      parameters,
      execute: (_args, ctx) =>
        Effect.gen(function* () {
          yield* ctx.metadata({ metadata: { phase: "one" } })
          yield* ctx.metadata({ metadata: { phase: "two" } })
          yield* ctx.metadata({ metadata: { phase: "three" } })
          return { title: "Noisy", output: "done", metadata: { phase: "done" } }
        }),
    }
    const live: ExecSubPartSnapshot[] = []
    const result = await runToolScript(`return await tools.noisy({ value: "x" })`, [noisy], undefined, {
      onMetadata: (metadata) => {
        const part = viewExecSubtools(metadata)[0]
        if (part) live.push(part)
      },
    })

    expect(live).toHaveLength(2)
    expect(live[0]?.state.status).toBe("running")
    expect(live[1]?.state.status).toBe("completed")
    expect(live[1]?.state.metadata).toEqual({ phase: "done" })
    expect(viewExecSubtools(result.metadata)[0]?.state.status).toBe("completed")
  })

  test("does not persist a running nested part when exec terminates early", async () => {
    const slow = fakeDef("slow", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return "late"
    })
    const boom = fakeDef("boom", async () => {
      throw new Error("kapow")
    })
    const result = await runToolScript(
      `await Promise.all([tools.slow({}), tools.boom({})]); return "unreachable"`,
      [slow, boom],
    )
    const parts = viewExecSubtools(result.metadata)
    expect(result.metadata.status).toBe("code_error")
    expect(parts).toHaveLength(2)
    expect(parts.every((part) => part.state.status !== "running")).toBe(true)
  })

  test("cancels running calls, rejects queued calls, and joins before an early terminal", async () => {
    const started: string[] = []
    const cancelled: string[] = []
    const sideEffects: string[] = []
    const parameters = z.object({ value: z.string() })
    const slow: Tool.Def<typeof parameters> = {
      id: "slow",
      description: "fake cancellable slow tool",
      parameters,
      execute: (args, ctx) =>
        Effect.promise(
          () =>
            new Promise<{ title: string; output: string; metadata: Record<string, unknown> }>((resolve, reject) => {
              started.push(args.value)
              const timer = setTimeout(() => {
                sideEffects.push(args.value)
                resolve({ title: "Slow", output: args.value, metadata: {} })
              }, 100)
              const onAbort = () => {
                clearTimeout(timer)
                cancelled.push(args.value)
                reject(new Error("nested exec aborted"))
              }
              if (ctx.abort.aborted) return onAbort()
              ctx.abort.addEventListener("abort", onAbort, { once: true })
            }),
        ),
    }
    const result = await runToolScript(
      `
      const calls = []
      for (let i = 0; i < 8; i++) calls.push(tools.slow({ value: String(i) }))
      calls.push(tools.slow({ value: "queued" }))
      throw new Error("kapow")
      `,
      [slow],
      undefined,
      { maxToolCalls: 9 },
    )

    expect(result.metadata.status).toBe("code_error")
    expect(started.toSorted()).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"])
    expect(cancelled.toSorted()).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"])
    expect(sideEffects).toEqual([])
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(started).not.toContain("queued")
    expect(sideEffects).toEqual([])
  })

  test("caps the final serialized sub_parts snapshot at 256 KiB", async () => {
    const payload = "x".repeat(4096)
    const result = await runToolScript(
      `
      await Promise.all(Array.from({ length: 500 }, (_, i) => tools.large({ value: String(i) })))
      return "done"
      `,
      [fakeDef("large", async (args) => `${args.value}:${payload}`)],
      undefined,
      { maxToolCalls: 500 },
    )
    const subParts = result.metadata.sub_parts as ExecSubPartSnapshot[]

    expect(result.metadata.status).toBe("completed")
    expect(Buffer.byteLength(JSON.stringify(subParts), "utf8")).toBeLessThanOrEqual(256 * 1024)
    expect(result.metadata.sub_parts_truncated).toBe(true)
    expect(result.metadata.sub_parts_omitted).toBe(0)
    expect(subParts).toHaveLength(500)
    expect(viewExecSubtools(result.metadata)).toHaveLength(500)
  }, 15_000)

  test("accepts TypeScript syntax (types stripped by transpiler)", async () => {
    const result = await runToolScript(
      `
      const double = (n: number): number => n * 2
      const xs: number[] = [1, 2, 3]
      return xs.map(double)
      `,
      [],
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("[\n  2,\n  4,\n  6\n]")
  })

  test("console.log is captured into Logs block", async () => {
    const result = await runToolScript(`console.log("hello", { a: 1 }); return 1`, [])
    expect(result.output).toContain("<logs>")
    expect(result.output).toContain('hello {"a":1}')
  })

  test("unknown tool rejects catchably; trace records the error", async () => {
    const result = await runToolScript(
      `
      try { await tools.nope({}) } catch (e) { return "caught: " + e.message }
      `,
      [],
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("caught:")
    expect(result.output).toContain("unknown tool: nope")
  })

  test("actor whitelist blocks nested builtin tools", async () => {
    let called = false
    const result = await runToolScript(
      `try { await tools.secret({}) } catch (error) { return error.message }`,
      [
        fakeDef("secret", async () => {
          called = true
          return "should never run"
        }),
      ],
      undefined,
      { toolWhitelist: new Set(["exec"]) },
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.metadata.toolCalls).toBe(0)
    expect(result.output).toContain("unknown tool: secret")
    expect(called).toBe(false)
  })

  test("plugin cancellation prevents nested tool execution", async () => {
    let called = false
    cancelledTool = "secret"
    hookCalls.before.length = 0
    hookCalls.after.length = 0
    try {
      const result = await runToolScript(
        `return (await tools.secret({})).output`,
        [
          fakeDef("secret", async () => {
            called = true
            return "should never run"
          }),
        ],
      )
      expect(result.metadata.status).toBe("completed")
      expect(result.output).toContain("blocked by test hook")
      expect(called).toBe(false)
      expect(hookCalls.before).toEqual(["secret"])
      expect(hookCalls.after).toEqual([])
    } finally {
      cancelledTool = undefined
      hookCalls.before.length = 0
      hookCalls.after.length = 0
    }
  })

  test("plugin after hook observes nested tool success", async () => {
    hookCalls.before.length = 0
    hookCalls.after.length = 0
    try {
      const result = await runToolScript(
        `return (await tools.echo({ value: "ok" })).output`,
        [fakeDef("echo", async (args) => args.value)],
      )
      expect(result.output).toContain("ok")
      expect(hookCalls.before).toEqual(["echo"])
      expect(hookCalls.after).toEqual(["echo"])
    } finally {
      hookCalls.before.length = 0
      hookCalls.after.length = 0
    }
  })

  test("tool failure rejects the guest promise with tool name prefix", async () => {
    const defs = [
      fakeDef("boom", async () => {
        throw new Error("kapow")
      }),
    ]
    const result = await runToolScript(
      `try { await tools.boom({}) } catch (e) { return e.message }`,
      defs,
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("boom: kapow")
    expect(result.output).toContain("→ error")
  })

  test("nested recoverable failures retain the live title and muted marker", async () => {
    const def: Tool.Def = {
      id: "recoverable",
      description: "fake recoverable tool",
      parameters: z.object({}),
      execute: (_args, ctx) =>
        Effect.gen(function* () {
          yield* ctx.metadata({ title: "Checking target" })
          return yield* Effect.die(new RecoverableError("target missing"))
        }),
    }
    const result = await runToolScript(`try { await tools.recoverable({}) } catch {}`, [def])
    expect(viewExecSubtools(result.metadata)[0]).toMatchObject({
      state: {
        status: "error",
        title: "Checking target",
        metadata: { recoverable: true },
      },
    })
  })

  test("call budget exceeded → budget_exceeded status", async () => {
    const defs = [fakeDef("ping", async () => "pong")]
    const result = await runToolScript(
      `
      for (let i = 0; i < 60; i++) await tools.ping({})
      return "done"
      `,
      defs,
    )
    expect(result.metadata.status).toBe("budget_exceeded")
  })

  test("max_tool_calls raises the call budget", async () => {
    const defs = [fakeDef("ping", async () => "pong")]
    const result = await runToolScript(
      `
      for (let i = 0; i < 60; i++) await tools.ping({})
      return "done"
      `,
      defs,
      undefined,
      { maxToolCalls: 80 },
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.metadata.toolCalls).toBe(60)
    expect((result.metadata.sub_parts as ExecSubPartSnapshot[]).length).toBe(60)
  })

  test("max_tool_calls lowers the call budget and the error names the limit", async () => {
    const defs = [fakeDef("ping", async () => "pong")]
    const result = await runToolScript(
      `
      for (let i = 0; i < 10; i++) await tools.ping({})
      return "done"
      `,
      defs,
      undefined,
      { maxToolCalls: 5 },
    )
    expect(result.metadata.status).toBe("budget_exceeded")
    expect(result.output).toContain("tool call budget exceeded (5 per execution)")
  })

  test("timeout_seconds bounds compute time and the error names the budget", async () => {
    const result = await runToolScript(`while (true) {}`, [], undefined, { timeoutSeconds: 1 })
    expect(result.metadata.status).toBe("timeout")
    expect(result.output).toContain("1s of active compute")
    expect(result.output).toContain("timeout_seconds")
  }, 15_000)

  test("syntax error → code_error", async () => {
    const result = await runToolScript(`const = broken (`, [])
    expect(result.metadata.status).toBe("code_error")
  })

  test("strips leaked parameter wrappers from custom exec source", async () => {
    const wrapped = await runToolScript(`<parameter name="code">\nreturn { repaired: true }\n</parameter> ###`, [])
    const trailing = await runToolScript(`return "trailing repaired"</paramter>`, [])
    const repeated = await runToolScript(
      `const results = [{ output: "first" }, { output: "second" }];
return results.map((r, i) => \`RESULT \${i + 1}\\n\${r.output}\`).join("\\n---\\n");
</parameter></parameter>`,
      [],
    )

    expect(wrapped.metadata.status).toBe("completed")
    expect(wrapped.output).toContain('"repaired": true')
    expect(trailing.metadata.status).toBe("completed")
    expect(trailing.output).toContain("trailing repaired")
    expect(repeated.metadata.status).toBe("completed")
    expect(repeated.output).toContain("RESULT 2\nsecond")
  })

  test("rejects oversized raw code before stripping leaked wrappers", async () => {
    const result = await runToolScript(`return 1${"</parameter>".repeat(11_000)}`, [])

    expect(result.metadata.status).toBe("code_error")
    expect(result.metadata.exec_schema).toBe(1)
    expect(result.metadata.sub_parts).toEqual([])
    expect(result.output).toContain("code exceeds 131072 bytes")
  })

  test("does not strip parameter-like text inside JavaScript strings", async () => {
    const result = await runToolScript(`return "</parameter> ###"`, [])

    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("</parameter> ###")
  })

  test("strips a leaked opening angle bracket before a variable declaration", async () => {
    const result = await runToolScript(
      `<const r = { output: "found data-quality-platform" };
return r.output;`,
      [],
    )

    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("found data-quality-platform")
  })

  test("preserves a leading TypeScript const assertion", async () => {
    const result = await runToolScript(`<const>[1, 2]; return "assertion preserved"`, [])

    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("assertion preserved")
  })

  test("preserves a leading TypeScript const generic arrow", async () => {
    const result = await runToolScript(`<const T>(x: T) => x; return "generic preserved"`, [])

    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("generic preserved")
  })

  test("preserves a leading TypeScript const generic arrow with a default", async () => {
    const result = await runToolScript(`<const T = string>(x: T) => x; return "default generic preserved"`, [])

    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("default generic preserved")
  })

  test("pre-aborted signal cancels the execution", async () => {
    // A sync spin blocks the host event loop, so a timer-armed abort can never
    // fire mid-spin (the 60s active budget covers that in production). An
    // already-aborted signal exercises the interrupt path deterministically.
    const abort = new AbortController()
    abort.abort()
    const result = await runToolScript(`while (true) {}`, [], abort.signal)
    expect(result.metadata.status).toBe("cancelled")
  }, 15_000)

  test("excluded tools are not dispatchable", async () => {
    const defs = [
      fakeDef("task", async () => "should never run"),
      fakeDef("mcp_tool_search", async () => "should never run"),
    ]
    const result = await runToolScript(
      `const listed = ALL_TOOLS.some((tool) => tool.name === "mcp_tool_search");
       try { await tools.mcp_tool_search({ query: "docs" }) } catch (e) { return { listed, error: e.message } }`,
      defs,
    )
    expect(result.output).toContain('"listed": false')
    expect(result.output).toContain("unknown tool: mcp_tool_search")
  })

  test("skill_search is not dispatchable through the sandbox", async () => {
    let called = false
    const defs = [
      fakeDef("skill_search", async () => {
        called = true
        return "should never run"
      }),
    ]
    const result = await runToolScript(
      `try { await tools.skill_search({ value: "restricted" }) } catch (e) { return e.message }`,
      defs,
    )
    expect(result.output).toContain("unknown tool: skill_search")
    expect(called).toBe(false)
  })

  test("mcp_tool_search is not dispatchable through the sandbox", async () => {
    let called = false
    const result = await runToolScript(
      `try { await tools.mcp_tool_search({ query: "secret" }) } catch (e) { return e.message }`,
      [
        fakeDef("mcp_tool_search", async () => {
          called = true
          return "should never run"
        }),
      ],
    )
    expect(result.output).toContain("unknown tool: mcp_tool_search")
    expect(called).toBe(false)
  })

  test("bash and exec_command stay outside the aggregate sandbox", async () => {
    let called = false
    const defs = [
      fakeDef("bash", async () => {
        called = true
        return "should never run"
      }),
    ]
    const result = await runToolScript(
      `
      const errors = []
      try { await tools.bash({ value: "direct" }) } catch (error) { errors.push(error.message) }
      try { await tools.exec_command({ value: "alias" }) } catch (error) { errors.push(error.message) }
      return errors
      `,
      defs,
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.metadata.toolCalls).toBe(0)
    expect(result.output).toContain("unknown tool: bash")
    expect(result.output).toContain("unknown tool: exec_command")
    expect(called).toBe(false)
  })

  test("concurrency is capped at 8", async () => {
    let active = 0
    let peak = 0
    const defs = [
      fakeDef("work", async () => {
        active++
        peak = Math.max(peak, active)
        await new Promise((r) => setTimeout(r, 20))
        active--
        return "ok"
      }),
    ]
    const result = await runToolScript(
      `
      await Promise.all(Array.from({ length: 20 }, () => tools.work({})))
      return "done"
      `,
      defs,
    )
    expect(result.metadata.status).toBe("completed")
    expect(peak).toBeLessThanOrEqual(8)
    expect(peak).toBeGreaterThan(1)
  })

  test("Date works inside exec guest", async () => {
    const result = await runToolScript(`return typeof Date.now()`, [])
    expect(result.output).toContain("number")
  })

  test("files.writeText → files.readText round-trips raw bytes via tmp", async () => {
    const marker = `ts-${Date.now()}`
    const write = await runToolScript(
      `
      await files.writeText("${path.join(os.tmpdir(), marker)}.json", JSON.stringify({ a: [1, 2], s: "x: 1" }))
      return "written"
      `,
      [],
    )
    expect(write.metadata.status).toBe("completed")
    const read = await runToolScript(
      `
      const data = JSON.parse(await files.readText("${path.join(os.tmpdir(), marker)}.json"))
      return data.a.length + ":" + data.s
      `,
      [],
    )
    expect(read.metadata.status).toBe("completed")
    expect(read.output).toContain("2:x: 1")
    await fs.rm(path.join(os.tmpdir(), `${marker}.json`), { force: true })
  })

  test("files.readText returns null for missing file", async () => {
    const result = await runToolScript(
      `return (await files.readText("${path.join(os.tmpdir(), "definitely-missing-xyz.json")}")) === null`,
      [],
    )
    expect(result.output).toContain("true")
  })

  test("files.readText rejects paths outside jail (catchable)", async () => {
    const result = await runToolScript(
      `try { await files.readText("/etc/passwd") } catch (e) { return e.message }`,
      [],
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("outside allowed roots")
  })

  test("files.writeText rejects paths outside the OS tmp dir (write is tmp-only)", async () => {
    // NOTE: the test worktree lives INSIDE os.tmpdir() (mkdtemp), so a worktree
    // path can't exercise the rejection here — use a clearly-outside path.
    const result = await runToolScript(
      `try { await files.writeText("/etc/tool-script-test.json", "data") } catch (e) { return e.message }`,
      [],
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("tools.apply_patch")
  })

  test("files.readText reads worktree files raw (no line numbers)", async () => {
    await fs.writeFile(path.join(tmp, "raw-check.json"), `{"k": "1: not a line number"}`)
    const result = await runToolScript(
      `
      const data = JSON.parse(await files.readText("raw-check.json"))
      return data.k
      `,
      [],
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("1: not a line number")
  })

  test("circular reference in return value fails loud with the offending path", async () => {
    const result = await runToolScript(`const a = { items: [{}] }; a.items[0].self = a; return a`, [])
    expect(result.metadata.status).toBe("code_error")
    expect(result.output).toContain("circular reference at $.items[0].self")
  })

  test("BigInt fails loud with path and conversion hint (top-level and nested)", async () => {
    const top = await runToolScript(`return 123n`, [])
    expect(top.metadata.status).toBe("code_error")
    expect(top.output).toContain("BigInt at $")
    const nested = await runToolScript(`return { x: { y: 123n } }`, [])
    expect(nested.metadata.status).toBe("code_error")
    expect(nested.output).toContain("BigInt at $.x.y")
  })

  test("throwing getter fails loud with path", async () => {
    const result = await runToolScript(`return { get x() { throw new Error("boom") } }`, [])
    expect(result.metadata.status).toBe("code_error")
    expect(result.output).toContain("getter at $.x threw: boom")
  })

  test("lossy conversions succeed with warnings: NaN, Map, Set, Error, RegExp", async () => {
    const result = await runToolScript(
      `return { n: NaN, m: new Map([["k", 1]]), s: new Set([2]), e: new Error("msg"), r: /x/g }`,
      [],
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("<warnings>")
    expect(result.output).toContain("NaN at $.n serialized as null")
    expect(result.output).toContain('"m": [')
    expect(result.output).toContain('"message": "msg"')
    expect(result.output).toContain('"r": "/x/g"')
  })

  test("clean JSON return has no warnings block", async () => {
    const result = await runToolScript(`return { a: 1, b: "x", c: [true, null] }`, [])
    expect(result.metadata.status).toBe("completed")
    expect(result.output).not.toContain("<warnings>")
  })

  test("console.log renders circular objects and Errors usefully", async () => {
    const result = await runToolScript(
      `const a = {}; a.self = a; console.log(a); console.log(new Error("oops")); return "done"`,
      [],
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain('{"self":"[Circular]"}')
    expect(result.output).toContain("oops")
  })

  test("string return passes through verbatim (no JSON escaping)", async () => {
    const result = await runToolScript(`return "line1\\nline2 with \\"quotes\\""`, [])
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain('line1\nline2 with "quotes"')
  })

  test("syntax error reports line, column, and source line", async () => {
    const result = await runToolScript(`const ok = 1\nconst = broken (`, [])
    expect(result.metadata.status).toBe("code_error")
    expect(result.output).toContain("line 2, column 7")
    expect(result.output).toContain("const = broken (")
  })

  test("top-level import gets an explicit not-supported note", async () => {
    const result = await runToolScript(`import * as x from "node:fs"\nreturn 1`, [])
    expect(result.metadata.status).toBe("code_error")
    expect(result.output).toContain("import/export are NOT supported")
  })

  test("files: literal /tmp paths work (macOS symlink jail)", async () => {
    const marker = path.join("/tmp", `ts-jail-${Date.now()}.json`)
    const result = await runToolScript(
      `
      await files.writeText("${marker}", "via-tmp")
      return await files.readText("${marker}")
      `,
      [],
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("via-tmp")
    await fs.rm(marker, { force: true })
  })

  test("files.readText rejects binary (non-UTF-8) files instead of returning empty", async () => {
    const bin = path.join(os.tmpdir(), `ts-bin-${Date.now()}.dat`)
    await fs.writeFile(bin, new Uint8Array([0x00, 0xff, 0xfe, 0x41, 0x80]))
    const result = await runToolScript(
      `try { await files.readText("${bin}"); return "no-error" } catch (e) { return "caught: " + e.message }`,
      [],
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("caught:")
    expect(result.output).toContain("not valid UTF-8")
    await fs.rm(bin, { force: true })
  })

  test("strings containing NUL survive the host→guest marshal boundary", async () => {
    const nulFile = path.join(os.tmpdir(), `ts-nul-${Date.now()}.txt`)
    // Valid UTF-8 containing a NUL byte — legal text, previously truncated at \0.
    await fs.writeFile(nulFile, "before\0after")
    const result = await runToolScript(
      `const v = await files.readText("${nulFile}"); return { len: v.length, tail: v.slice(7) }`,
      [],
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain('"len": 12')
    expect(result.output).toContain('"tail": "after"')
    await fs.rm(nulFile, { force: true })
  })

  test("discovers an MCP tool through ALL_TOOLS and dispatches its exact name", async () => {
    const result = await runToolScript(
      `const match = ALL_TOOLS.find((tool) => tool.name.includes("browser") && tool.name.includes("navigate"));
       if (!match) return "not found";
       const navigation = await tools[match.name]({ url: "https://example.com" });
       return navigation.output`,
      [],
      undefined,
      {
        mcp: {
          "chrome-devtools_browser-navigate": {
            description: "Navigate a browser page to a URL",
            inputSchema: z.object({ url: z.string() }),
            execute: async (args: { url: string }) => ({
              output: `navigated: ${args.url}`,
              metadata: { mcp: { isError: false } },
              attachments: [],
            }),
          },
        },
      },
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("navigated: https://example.com")
  })

  test("sets fromExec flag in subCtx so downstream tools can detect exec origin", async () => {
    let capturedExtra: Record<string, unknown> | undefined
    const probeDef: Tool.Def = {
      id: "probe",
      description: "fake probe",
      parameters: z.object({}),
      execute: (_args: any, ctx: any) => {
        capturedExtra = ctx.extra
        return Effect.succeed({ title: "probe", output: "ok", metadata: {} })
      },
    }
    const result = await runToolScript(
      `return await tools.probe({})`,
      [probeDef],
    )
    expect(result.metadata.status).toBe("completed")
    expect(capturedExtra).toBeDefined()
    expect(capturedExtra!.fromExec).toBe(true)
  })
})

describe("renderToolScriptDeclarations", () => {
  test("renders TS signatures and skips excluded tools", () => {
    const defs = [
      fakeDef("read", async () => "x"),
      fakeDef("mcp_tool_search", async () => "x"),
      fakeDef("task", async () => "x"),
      fakeDef("question", async () => "x"),
      fakeDef("skill_search", async () => "x"),
    ]
    const text = renderToolScriptDeclarations(defs)
    expect(text).toContain("read(input:")
    expect(text).not.toContain("mcp_tool_search(input:")
    expect(text).toContain("name: string; description: string")
    expect(text).toContain("declare const ALL_TOOLS")
    expect(text).not.toContain("task(input:")
    expect(text).not.toContain("question(input:")
    expect(text).not.toContain("skill_search(input:")
    expect(text).toContain("declare const tools")
  })

  test("exclusion list covers agent control-flow tools, MCP search, and bash", () => {
    for (const id of [
      "task",
      "question",
      "actor",
      "skill",
      "skill_search",
      "plan_exit",
      "exec",
      "mcp_tool_search",
      "bash",
    ]) {
      expect(TOOL_SCRIPT_EXCLUDED.has(id)).toBe(true)
    }
  })

  test("does not render bash or exec_command inside exec", () => {
    const text = renderToolScriptDeclarations([fakeDef("bash", async () => "x")])
    expect(text).not.toContain("bash(input:")
    expect(text).not.toContain("exec_command(input:")
  })

})

describe("exec MCP dispatch", () => {
  // Mimics the SessionPrompt-wrapped MCP execute: resolves with the normalized
  // {output, metadata, attachments} shape (permission/hooks/truncation already
  // applied by the wrapper), rejects on tool failure.
  function fakeMcpTool(execute: (args: any) => Promise<any>) {
    return {
      description: "fake mcp tool",
      inputSchema: z.object({}),
      execute,
    }
  }

  test("MCP tool is callable and returns output text", async () => {
    const mcp = {
      srv_search: fakeMcpTool(async (args) => ({
        output: `found: ${args.query}`,
        metadata: { mcp: { isError: false } },
        attachments: [],
      })),
    }
    const result = await runToolScript(
      `const r = await tools.srv_search({ query: "hello" }); return r.output`,
      [],
      undefined,
      { mcp },
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("found: hello")
  })

  test("MCP aliases dispatch to the registered catalog tool", async () => {
    const seen: string[] = []
    const mcp = {
      "feishu-mcp-pro_doc_read": fakeMcpTool(async (args) => {
        seen.push(args.document_id)
        return { output: "read: " + args.document_id, metadata: {}, attachments: [] }
      }),
    }
    const result = await runToolScript(
      `const dashed = await tools["mcp__feishu-mcp-pro__doc_read"]({ document_id: "dash" });
       const underscored = await tools["mcp__feishu_mcp_pro__doc_read"]({ document_id: "underscore" });
       return [dashed.output, underscored.output]`,
      [],
      undefined,
      { mcp },
    )

    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("read: dash")
    expect(result.output).toContain("read: underscore")
    expect(seen).toEqual(["dash", "underscore"])
  }, 15_000)

  test("structuredContent crosses into the guest as parsed `structured`", async () => {
    const mcp = {
      srv_data: fakeMcpTool(async () => ({
        output: "3 items",
        metadata: { mcp: { isError: false, structuredContent: { items: [1, 2, 3], total: 3 } } },
        attachments: [],
      })),
    }
    const result = await runToolScript(
      `const r = await tools.srv_data({});
       return { total: r.structured.total, doubled: r.structured.items.map((x) => x * 2) }`,
      [],
      undefined,
      { mcp },
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain('"total": 3')
    expect(result.output).toContain("4")
    expect(result.output).toContain("6")
  })

  test("MCP failure rejects catchably inside the guest", async () => {
    const mcp = {
      srv_fail: fakeMcpTool(async () => {
        throw new Error("server exploded")
      }),
    }
    const result = await runToolScript(
      `try { await tools.srv_fail({}) } catch (e) { return "caught: " + e.message }`,
      [],
      undefined,
      { mcp },
    )
    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("caught: srv_fail: server exploded")
  })

  test("builtin id wins on collision with an MCP tool", async () => {
    const mcp = {
      echo: fakeMcpTool(async () => ({ output: "mcp version", metadata: {}, attachments: [] })),
    }
    const result = await runToolScript(
      `const r = await tools.echo({ value: "x" }); return r.output`,
      [fakeDef("echo", async () => "builtin version")],
      undefined,
      { mcp },
    )
    expect(result.output).toContain("builtin version")
  })

  test("attachments are dropped with a note", async () => {
    const mcp = {
      srv_img: fakeMcpTool(async () => ({
        output: "here is your chart",
        metadata: { mcp: { isError: false } },
        attachments: [{ type: "file", mime: "image/png", url: "data:image/png;base64,xxxx" }],
      })),
    }
    const result = await runToolScript(
      `const r = await tools.srv_img({}); return r.output`,
      [],
      undefined,
      { mcp },
    )
    expect(result.output).toContain("here is your chart")
    expect(result.output).toContain("non-text attachment(s) dropped")
    expect(viewExecSubtools(result.metadata)[0]?.state.attachments).toEqual([
      { type: "file", mime: "image/png", url: "data:image/png;base64,xxxx" },
    ])
  })

  test("MCP calls count against the tool call budget", async () => {
    const mcp = {
      srv_a: fakeMcpTool(async () => ({ output: "a", metadata: {}, attachments: [] })),
    }
    const result = await runToolScript(
      `for (let i = 0; i < 3; i++) await tools.srv_a({}); return "done"`,
      [],
      undefined,
      { mcp, maxToolCalls: 2 },
    )
    expect(result.metadata.status).not.toBe("completed")
    expect(result.output).toContain("budget exceeded")
  })

  test("whitelist filters MCP tools too", async () => {
    const mcp = {
      srv_blocked: fakeMcpTool(async () => ({ output: "should not run", metadata: {}, attachments: [] })),
    }
    const result = await runToolScript(
      `try { await tools.srv_blocked({}) } catch (e) { return "denied: " + e.message }`,
      [],
      undefined,
      { mcp, toolWhitelist: new Set(["exec"]) },
    )
    expect(result.output).toContain("denied:")
    expect(result.output).toContain("unknown tool")
  })

  test("reserved exec_command alias cannot fall through to an MCP tool", async () => {
    let called = false
    const result = await runToolScript(
      `try { await tools.exec_command({}) } catch (error) { return error.message }`,
      [],
      undefined,
      {
        mcp: {
          exec_command: fakeMcpTool(async () => {
            called = true
            return { output: "reserved alias bypassed", metadata: {}, attachments: [] }
          }),
        },
      },
    )

    expect(result.metadata.status).toBe("completed")
    expect(result.output).toContain("unknown tool: exec_command")
    expect(result.output).not.toContain("reserved alias bypassed")
    expect(called).toBe(false)
  })
})
