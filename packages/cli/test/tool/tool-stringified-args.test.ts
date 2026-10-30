import { describe, test, expect } from "bun:test"
import { Cause, Effect, Exit, Layer, ManagedRuntime } from "effect"
import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import z from "zod"
import { Agent } from "../../src/agent/agent"
import { Tool } from "../../src/tool"
import { Truncate } from "../../src/tool"
import { isRecoverableError } from "../../src/tool/recoverable"
import { provideInstance } from "../fixture/fixture"

// Some models emit a nested object or array argument as its JSON text, e.g.
// {"operation":"{\"action\":\"list\"}"} for the cron/task/actor envelopes.

const runtime = ManagedRuntime.make(Layer.mergeAll(Truncate.defaultLayer, Agent.defaultLayer))

const envelope = z.strictObject({
  operation: z
    .discriminatedUnion("action", [
      z.strictObject({ action: z.literal("list") }),
      z.strictObject({ action: z.literal("get"), id: z.string().min(1) }),
    ])
    .meta({ type: "object" }),
})

async function call(parameters: z.ZodType, args: unknown) {
  const received: unknown[] = []
  const info = await runtime.runPromise(
    Tool.define(
      "stringified-args",
      Effect.succeed({
        description: "test tool",
        parameters,
        execute(input: unknown) {
          received.push(input)
          return Effect.succeed({ title: "ok", output: "ok", metadata: {} })
        },
      }),
    ),
  )
  const def = await runtime.runPromise(info.init())
  const instanceDir = mkdtempSync(join(tmpdir(), "tool-stringified-args-"))
  try {
    const eff = def.execute(args, {
      sessionID: "ses_stringified_args" as never,
      messageID: "msg_stringified_args" as never,
      agent: "build",
      abort: new AbortController().signal,
      extra: {},
      messages: [],
      metadata: () => Effect.void,
      ask: () => Effect.void,
    })
    const exit = await runtime.runPromise(Effect.exit(provideInstance(instanceDir)(eff)))
    return { received, error: Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined }
  } finally {
    rmSync(instanceDir, { recursive: true, force: true })
  }
}

describe("Tool.define: stringified object/array arguments", () => {
  test("decodes a stringified discriminated-union envelope before execute", async () => {
    const args = { operation: JSON.stringify({ action: "get", id: "a1b2c3d4" }) }
    const { received, error } = await call(envelope, args)
    expect(error).toBeUndefined()
    expect(received).toEqual([{ operation: { action: "get", id: "a1b2c3d4" } }])
    // The caller's object (persisted as the tool part input) is not rewritten.
    expect(args.operation).toBe(JSON.stringify({ action: "get", id: "a1b2c3d4" }))
  })

  test("decodes a stringified array", async () => {
    const { received, error } = await call(z.object({ items: z.array(z.string()) }), { items: '["a","b"]' })
    expect(error).toBeUndefined()
    expect(received).toEqual([{ items: ["a", "b"] }])
  })

  test("decodes a stringified record and tuple in the same input", async () => {
    const parameters = z.object({ env: z.record(z.string(), z.string()), pair: z.tuple([z.string(), z.number()]) })
    const { received, error } = await call(parameters, { env: '{"A":"1"}', pair: '["x",2]' })
    expect(error).toBeUndefined()
    expect(received).toEqual([{ env: { A: "1" }, pair: ["x", 2] }])
  })

  test("decodes a whole input sent as one JSON string", async () => {
    const { received, error } = await call(envelope, JSON.stringify({ operation: { action: "list" } }))
    expect(error).toBeUndefined()
    expect(received).toEqual([{ operation: { action: "list" } }])
  })

  test("leaves JSON-looking text alone where the schema wants a string", async () => {
    const { received, error } = await call(z.object({ text: z.string() }), { text: '{"a":1}' })
    expect(error).toBeUndefined()
    expect(received).toEqual([{ text: '{"a":1}' }])
  })

  test("still rejects when the decoded value does not satisfy the schema", async () => {
    const { received, error } = await call(envelope, { operation: JSON.stringify({ action: "nope" }) })
    expect(received).toEqual([])
    expect(isRecoverableError(error)).toBe(true)
    expect(error instanceof Error ? error.message : "").toContain("expected object, received string")
  })

  test("still rejects a string that is not JSON", async () => {
    const { received, error } = await call(envelope, { operation: "list" })
    expect(received).toEqual([])
    expect(isRecoverableError(error)).toBe(true)
  })
})
