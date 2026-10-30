import { describe, expect } from "bun:test"
import { Cause, Effect, Exit, Layer } from "effect"
import z from "zod"
import { Agent } from "../../src/agent/agent"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { SessionID, MessageID } from "../../src/session/schema"
import { Tool } from "../../src/tool"
import { Truncate } from "../../src/tool"
import { isRecoverableError } from "../../src/tool/recoverable"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

// Some models emit a nested object or array argument as its JSON text, e.g.
// {"operation":"{\"action\":\"list\"}"} for the cron/task/actor envelopes.

const it = testEffect(Layer.mergeAll(CrossSpawnSpawner.defaultLayer, Truncate.defaultLayer, Agent.defaultLayer))

const ctx = {
  sessionID: SessionID.make("ses_stringified_args"),
  messageID: MessageID.make(""),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

const envelope = z.strictObject({
  operation: z
    .discriminatedUnion("action", [
      z.strictObject({ action: z.literal("list") }),
      z.strictObject({ action: z.literal("get"), id: z.string().min(1) }),
    ])
    .meta({ type: "object" }),
})

const call = (parameters: z.ZodType, args: unknown) =>
  Effect.gen(function* () {
    const received: unknown[] = []
    const info = yield* Tool.define(
      "stringified-args",
      Effect.succeed({
        description: "test tool",
        parameters,
        execute(input: unknown) {
          received.push(input)
          return Effect.succeed({ title: "ok", output: "ok", metadata: {} })
        },
      }),
    )
    const def = yield* info.init()
    const exit = yield* Effect.exit(def.execute(args, ctx))
    return { received, error: Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined }
  })

describe("Tool.define: stringified object/array arguments", () => {
  it.live("decodes a stringified discriminated-union envelope before execute", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const args = { operation: JSON.stringify({ action: "get", id: "a1b2c3d4" }) }
        const { received, error } = yield* call(envelope, args)
        expect(error).toBeUndefined()
        expect(received).toEqual([{ operation: { action: "get", id: "a1b2c3d4" } }])
        // The caller's object (persisted as the tool part input) is not rewritten.
        expect(args.operation).toBe(JSON.stringify({ action: "get", id: "a1b2c3d4" }))
      }),
    ),
  )

  it.live("decodes a stringified array", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const { received, error } = yield* call(z.object({ items: z.array(z.string()) }), { items: '["a","b"]' })
        expect(error).toBeUndefined()
        expect(received).toEqual([{ items: ["a", "b"] }])
      }),
    ),
  )

  it.live("decodes a stringified record and tuple in the same input", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const parameters = z.object({ env: z.record(z.string(), z.string()), pair: z.tuple([z.string(), z.number()]) })
        const { received, error } = yield* call(parameters, { env: '{"A":"1"}', pair: '["x",2]' })
        expect(error).toBeUndefined()
        expect(received).toEqual([{ env: { A: "1" }, pair: ["x", 2] }])
      }),
    ),
  )

  it.live("decodes a whole input sent as one JSON string", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const { received, error } = yield* call(envelope, JSON.stringify({ operation: { action: "list" } }))
        expect(error).toBeUndefined()
        expect(received).toEqual([{ operation: { action: "list" } }])
      }),
    ),
  )

  it.live("leaves JSON-looking text alone where the schema wants a string", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const { received, error } = yield* call(z.object({ text: z.string() }), { text: '{"a":1}' })
        expect(error).toBeUndefined()
        expect(received).toEqual([{ text: '{"a":1}' }])
      }),
    ),
  )

  it.live("still rejects when the decoded value does not satisfy the schema", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const { received, error } = yield* call(envelope, { operation: JSON.stringify({ action: "nope" }) })
        expect(received).toEqual([])
        expect(isRecoverableError(error)).toBe(true)
        expect(error instanceof Error ? error.message : "").toContain("expected object, received string")
      }),
    ),
  )

  it.live("still rejects a string that is not JSON", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const { received, error } = yield* call(envelope, { operation: "list" })
        expect(received).toEqual([])
        expect(isRecoverableError(error)).toBe(true)
      }),
    ),
  )
})
