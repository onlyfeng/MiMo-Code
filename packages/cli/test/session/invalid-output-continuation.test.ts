/**
 * Integration tests for T01: a `finish=stop` step with no usable output
 * (think-only = reasoning only, or empty = nothing at all) must not silently
 * break into an empty assistant. process() drops the empty turn and raises
 * InvalidOutputError so SessionRetry.policy (decide → retryable unknown) owns
 * the retry budget; on exhaustion the terminal InvalidOutputError is written.
 * No reminder message is injected.
 *
 * Driven through a real Session.prompt(...) against the scripted HTTP LLM stub.
 */

import path from "path"
import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { Effect, Fiber, Layer } from "effect"
import { Bus } from "../../src/bus"
import { SessionPrefixSnapshot } from "../../src/session/prefix-snapshot"
import { Server } from "../../src/server/server"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionStatus } from "../../src/session/status"
import { Log } from "../../src/util"
import { tmpdir } from "../fixture/fixture"
import {
  startScriptedLLMServer,
  textStopResponse,
  emptyStopResponse,
  reasoningLengthResponse,
  reasoningStopResponse,
} from "../lib/scripted-llm-server"

void Log.init({ print: false })

function assistantOnly(
  msgs: MessageV2.WithParts[],
): (MessageV2.WithParts & { info: MessageV2.Assistant })[] {
  return msgs.filter((m): m is MessageV2.WithParts & { info: MessageV2.Assistant } => m.info.role === "assistant")
}

afterEach(async () => {
  await Instance.disposeAll()
})

function run<A, E>(fx: Effect.Effect<A, E, SessionPrompt.Service | Session.Service | Bus.Service>) {
  return Effect.runPromise(
    fx.pipe(Effect.scoped, Effect.provide(Layer.mergeAll(SessionPrompt.defaultLayer, Session.defaultLayer, Bus.defaultLayer))),
  )
}

function writeConfig(dir: string, origin: string) {
  return Bun.write(
    path.join(dir, "mimocode.json"),
    JSON.stringify({
      $schema: "https://opencode.ai/config.json",
      enabled_providers: ["alibaba"],
      provider: {
        alibaba: { options: { apiKey: "test-key", baseURL: `${origin}/v1` } },
      },
      agent: {
        build: { model: "alibaba/qwen-plus" },
        "checkpoint-writer": { model: "alibaba/qwen-plus" },
      },
      // Pure empty output uses the unknown retry budget; reasoning-only keeps bounded continuation.
      retry: {
        unknown: { maxRetries: 1, initialDelayMs: 1, maxDelayMs: 1, deadlineMs: 2000 },
      },
    }),
  )
}

function writeGPTConfig(dir: string, origin: string) {
  return Bun.write(
    path.join(dir, "mimocode.json"),
    JSON.stringify({
      $schema: "https://opencode.ai/config.json",
      enabled_providers: ["test"],
      provider: {
        test: {
          name: "Test",
          id: "test",
          env: [],
          npm: "@ai-sdk/openai-compatible",
          models: {
            "gpt-5.5": {
              id: "gpt-5.5",
              name: "GPT-5.5",
              attachment: false,
              reasoning: true,
              temperature: false,
              tool_call: true,
              release_date: "2026-01-01",
              // Match the real GPT large-window shape. Declaring a 100K context
              // beside GPT's provider-default 128K max output makes the fixture
              // internally impossible and turns these continuation tests into
              // accidental request-overflow tests once the full tool set is active.
              limit: { context: 400_000, input: 272_000, output: 128_000 },
              cost: { input: 0, output: 0 },
              options: {},
            },
          },
          options: { apiKey: "test-key", baseURL: `${origin}/v1` },
        },
      },
      agent: { build: { model: "test/gpt-5.5" } },
    }),
  )
}

describe("invalid-output continuation — integration", () => {
  // [TP-SR-R21-07]
  test("empty stop is dropped and retried inside process; cancel after settle is clean", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    // First sample is empty (dropped + retried inside process via SessionRetry);
    // second sample is the recovered answer. advance() hangs after the successful
    // step completes so cancel runs against a durable finished turn.
    const stub = startScriptedLLMServer([{ lines: emptyStopResponse() }, { lines: textStopResponse("recovered answer") }])
    const entered = Promise.withResolvers<void>()
    const advance = spyOn(SessionPrefixSnapshot, "advance").mockImplementation(() =>
      Effect.sync(entered.resolve).pipe(Effect.andThen(Effect.never)),
    )
    try {
      await writeConfig(tmp.path, stub.origin)
      const result = await Instance.provide({
        directory: tmp.path,
        fn: () => run(Effect.gen(function* () {
          const sessions = yield* Session.Service
          const prompt = yield* SessionPrompt.Service
          const session = yield* sessions.create({ title: "empty-stop-cancel-window" })
          const fiber = yield* prompt.prompt({
            sessionID: session.id, agent: "build", parts: [{ type: "text", text: "Answer my question." }],
          }).pipe(Effect.exit, Effect.forkChild)
          yield* Effect.promise(() => entered.promise).pipe(Effect.timeout("10 seconds"))
          expect(advance).toHaveBeenCalledTimes(1)
          const atBarrier = yield* sessions.messages({ sessionID: session.id, agentID: "main" })
          yield* prompt.cancel(session.id)
          yield* Fiber.join(fiber)
          advance.mockRestore()
          const afterCancel = yield* sessions.messages({ sessionID: session.id, agentID: "main" })
          return { atBarrier, afterCancel, providerCalls: stub.captures.length }
        })),
      })
      expect(result.afterCancel).toEqual(result.atBarrier)
      const assistants = assistantOnly(result.afterCancel)
      expect(assistants.length).toBe(1)
      const assistant = assistants[0]!
      expect(assistant.info.finish).toBe("stop")
      expect(assistant.info.time.completed).toBeDefined()
      expect(assistant.info.error).toBeUndefined()
      // Empty attempt was dropped inside process; only the recovered turn remains.
      expect(assistant.parts.some((part) => part.type === "text" && part.text === "recovered answer")).toBe(true)
      expect(result.providerCalls).toBe(2)
    } finally {
      advance.mockRestore()
      await Instance.disposeAll()
      await stub.stop()
    }
  }, 30_000)

  test("main empty stop retries with global notifications and retains only the final assistant", async () => {
    await using tmp = await tmpdir({ git: true })
    const stub = startScriptedLLMServer([{ lines: emptyStopResponse() }, { lines: textStopResponse("final answer") }])
    try {
      await writeConfig(tmp.path, stub.origin)
      await Instance.provide({
        directory: tmp.path,
        fn: () =>
          run(
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const session = yield* sessions.create({ title: "invalid-empty" })
              const bus = yield* Bus.Service
              const statuses: number[] = []
              const attempts: number[] = []
              const offStatus = yield* bus.subscribeCallback(SessionStatus.Event.Status, (event) => {
                if (event.properties.sessionID !== session.id || event.properties.status.type !== "retry") return
                statuses.push(event.properties.status.attempt)
              })
              const offAttempt = yield* bus.subscribeCallback(Session.Event.RetryAttempt, (event) => {
                if (event.properties.sessionID !== session.id) return
                attempts.push(event.properties.attempt)
              })
              const result = yield* prompt.prompt({
                sessionID: session.id,
                agent: "build",
                parts: [{ type: "text", text: "Answer my question." }],
              }).pipe(Effect.ensuring(Effect.sync(() => {
                offStatus()
                offAttempt()
              })))
              // First empty stop => delete + retry; second call => final text.
              expect(stub.captures.length).toBe(2)
              expect(result.info.role).toBe("assistant")
              if (result.info.role === "assistant") expect(result.info.error).toBeUndefined()
              expect(result.parts.some((p) => p.type === "text" && p.text === "final answer")).toBe(true)
              const msgs = yield* sessions.messages({ sessionID: session.id, agentID: "main" })
              const assistants = assistantOnly(msgs)
              expect(assistants.length).toBe(1)
              expect(assistants[0]?.info.id).toBe(result.info.id)
              const retry = stub.captures[1].messages as { role: string; content: unknown }[]
              const nonSystem = retry.filter((m) => m.role !== "system")
              expect(nonSystem.length).toBe(1)
              expect(nonSystem.some((m) => JSON.stringify(m.content).includes("no usable"))).toBe(false)
              expect(nonSystem.some((m) => JSON.stringify(m.content).includes("system-reminder"))).toBe(false)
              expect({ statuses, attempts }).toEqual({ statuses: [1], attempts: [1] })
            }),
          ),
      })
    } finally {
      await stub.stop()
    }
  })

  test("think-only (reasoning only) stop step is nudged, second call produces a final assistant", async () => {
    await using tmp = await tmpdir({ git: true })
    const stub = startScriptedLLMServer([
      { lines: reasoningStopResponse("let me think about this...") },
      { lines: textStopResponse("final answer") },
    ])
    try {
      await writeConfig(tmp.path, stub.origin)
      await Instance.provide({
        directory: tmp.path,
        fn: () =>
          run(
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const session = yield* sessions.create({ title: "invalid-think-only" })
              const result = yield* prompt.prompt({
                sessionID: session.id,
                agent: "build",
                parts: [{ type: "text", text: "Answer my question." }],
              })
              expect(stub.captures.length).toBe(2)
              expect(result.info.role).toBe("assistant")
              if (result.info.role === "assistant") expect(result.info.error).toBeUndefined()
              expect(result.parts.some((p) => p.type === "text" && p.text === "final answer")).toBe(true)
            }),
          ),
      })
    } finally {
      await stub.stop()
    }
  })

  test("ordinary actor retries empty output without global notifications or a reminder", async () => {
    await using tmp = await tmpdir({ git: true })
    const stub = startScriptedLLMServer([{ lines: emptyStopResponse() }, { lines: textStopResponse("actor result") }])
    try {
      await writeConfig(tmp.path, stub.origin)
      await Instance.provide({
        directory: tmp.path,
        fn: () =>
          run(
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const session = yield* sessions.create({ title: "invalid-actor" })
              const bus = yield* Bus.Service
              const statuses: number[] = []
              const attempts: number[] = []
              const offStatus = yield* bus.subscribeCallback(SessionStatus.Event.Status, (event) => {
                if (event.properties.sessionID !== session.id || event.properties.status.type !== "retry") return
                statuses.push(event.properties.status.attempt)
              })
              const offAttempt = yield* bus.subscribeCallback(Session.Event.RetryAttempt, (event) => {
                if (event.properties.sessionID !== session.id) return
                attempts.push(event.properties.attempt)
              })
              const result = yield* prompt.prompt({
                sessionID: session.id,
                agent: "build",
                agentID: "general-1",
                parts: [{ type: "text", text: "Do delegated work." }],
              }).pipe(Effect.ensuring(Effect.sync(() => {
                offStatus()
                offAttempt()
              })))
              expect(stub.captures.length).toBe(2)
              expect(result.parts.some((part) => part.type === "text" && part.text === "actor result")).toBe(true)
              const retry = stub.captures[1].messages as { role: string; content: unknown }[]
              const nonSystem = retry.filter((m) => m.role !== "system")
              expect(nonSystem.length).toBe(1)
              expect(nonSystem.some((m) => JSON.stringify(m.content).includes("no usable"))).toBe(false)
              expect(nonSystem.some((m) => JSON.stringify(m.content).includes("system-reminder"))).toBe(false)
              const msgs = yield* sessions.messages({ sessionID: session.id, agentID: "general-1" })
              const assistants = assistantOnly(msgs)
              expect(assistants.length).toBe(1)
              expect(assistants[0]?.info.id).toBe(result.info.id)
              expect(assistants.some((m) => m.info.error)).toBe(false)
              expect({ statuses, attempts }).toEqual({ statuses: [], attempts: [] })
            }),
          ),
      })
    } finally {
      await stub.stop()
    }
  })

  test("checkpoint-writer retry deletes the empty turn and converges on CHECKPOINT_COMPLETE", async () => {
    await using tmp = await tmpdir({ git: true })
    const stub = startScriptedLLMServer([
      { lines: emptyStopResponse() },
      { lines: textStopResponse("CHECKPOINT_COMPLETE") },
    ])
    try {
      await writeConfig(tmp.path, stub.origin)
      await Instance.provide({
        directory: tmp.path,
        fn: () =>
          run(
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const session = yield* sessions.create({ title: "invalid-checkpoint-writer" })
              const result = yield* prompt.prompt({
                sessionID: session.id,
                agent: "checkpoint-writer",
                parts: [{ type: "text", text: "Update the checkpoint." }],
              })
              const retry = stub.captures[1].messages as { role: string; content: unknown }[]
              const nonSystem = retry.filter((m) => m.role !== "system")
              expect(nonSystem.length).toBe(1)
              expect(nonSystem.some((m) => JSON.stringify(m.content).includes("checkpoint writer turn ended"))).toBe(false)
              expect(nonSystem.some((m) => JSON.stringify(m.content).includes("CHECKPOINT_COMPLETE"))).toBe(false)
              expect(nonSystem.some((m) => JSON.stringify(m.content).includes("system-reminder"))).toBe(false)
              expect(result.parts.some((part) => part.type === "text" && part.text === "CHECKPOINT_COMPLETE")).toBe(true)
            }),
          ),
      })
    } finally {
      await stub.stop()
    }
  })

  test("ordinary actor reasoning-only gets a parent-facing invalid-output reminder", async () => {
    await using tmp = await tmpdir({ git: true })
    const stub = startScriptedLLMServer([{ lines: reasoningStopResponse("reasoning without an answer") }, { lines: textStopResponse("actor result") }])
    try {
      await writeConfig(tmp.path, stub.origin)
      await Instance.provide({
        directory: tmp.path,
        fn: () =>
          run(
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const session = yield* sessions.create({ title: "invalid-actor" })
              yield* prompt.prompt({
                sessionID: session.id,
                agent: "build",
                agentID: "general-1",
                parts: [{ type: "text", text: "Do delegated work." }],
              })
              const retry = JSON.stringify(stub.captures[1].messages)
              expect(retry).toContain("parent agent")
              expect(retry).not.toContain("final answer to the user")
            }),
          ),
      })
    } finally {
      await stub.stop()
    }
  })

  test("checkpoint-writer reasoning-only gets a scoped retry and converges on CHECKPOINT_COMPLETE", async () => {
    await using tmp = await tmpdir({ git: true })
    const stub = startScriptedLLMServer([
      { lines: reasoningStopResponse("reasoning without an answer") },
      { lines: textStopResponse("CHECKPOINT_COMPLETE") },
    ])
    try {
      await writeConfig(tmp.path, stub.origin)
      await Instance.provide({
        directory: tmp.path,
        fn: () =>
          run(
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const session = yield* sessions.create({ title: "invalid-checkpoint-writer" })
              const result = yield* prompt.prompt({
                sessionID: session.id,
                agent: "checkpoint-writer",
                parts: [{ type: "text", text: "Update the checkpoint." }],
              })
              const retry = JSON.stringify(stub.captures[1].messages)
              expect(retry).toContain("checkpoint writer")
              expect(retry).toContain("CHECKPOINT_COMPLETE")
              expect(retry).not.toContain("final answer to the user")
              expect(result.parts.some((part) => part.type === "text" && part.text === "CHECKPOINT_COMPLETE")).toBe(
                true,
              )
            }),
          ),
      })
    } finally {
      await stub.stop()
    }
  })

  // [TP-SR-R21-07]
  test("retry exhaustion writes a terminal InvalidOutputError", async () => {
    await using tmp = await tmpdir({ git: true })
    // writeConfig sets retry.unknown.maxRetries=1: initial attempt + 1 retry,
    // then the empty stop is terminal under SessionRetry.policy.
    const stub = startScriptedLLMServer([{ lines: emptyStopResponse() }, { lines: emptyStopResponse() }])
    try {
      await writeConfig(tmp.path, stub.origin)
      await Instance.provide({
        directory: tmp.path,
        fn: () =>
          run(
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const session = yield* sessions.create({ title: "invalid-exhaust" })
              const result = yield* prompt.prompt({
                sessionID: session.id,
                agent: "build",
                parts: [{ type: "text", text: "Answer my question." }],
              })
              expect(stub.captures.length).toBe(2)
              expect(result.info.role).toBe("assistant")
              if (result.info.role === "assistant") expect(result.info.error?.name).toBe("InvalidOutputError")
              const msgs = yield* sessions.messages({ sessionID: session.id, agentID: "main" })
              const assistants = assistantOnly(msgs)
              // Empty attempts were dropped; only the terminal assistant remains.
              expect(assistants.length).toBe(1)
              expect(assistants[0]?.info.error?.name).toBe("InvalidOutputError")
            }),
          ),
      })
    } finally {
      await stub.stop()
    }
  })

  // [TP-SR-R21-07]
  test("GPT reasoning-only stop step is terminal and is not retried", async () => {
    await using tmp = await tmpdir({ git: true, root: "cwd" })
    const stub = startScriptedLLMServer([
      { lines: reasoningStopResponse("let me think about this...") },
      { lines: textStopResponse("unexpected retry") },
    ])
    try {
      await writeGPTConfig(tmp.path, stub.origin)
      await Instance.provide({
        directory: tmp.path,
        fn: () =>
          run(
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const session = yield* sessions.create({ title: "gpt-reasoning-only" })
              const result = yield* prompt.prompt({
                sessionID: session.id,
                agent: "build",
                parts: [{ type: "text", text: "Answer my question." }],
              })
              expect(stub.captures.length).toBe(1)
              expect(result.info.role).toBe("assistant")
              if (result.info.role === "assistant") expect(result.info.error).toBeUndefined()
              expect(result.parts.some((p) => p.type === "reasoning" && p.text.includes("let me think"))).toBe(true)
              expect(result.parts.some((p) => p.type === "text")).toBe(false)
              expect(yield* prompt.recovery({ sessionID: session.id, agentID: "main" })).toEqual([])
              const resumed = yield* Effect.promise(() => Promise.resolve(Server.Default().app.request(
                `/session/${session.id}/resume?directory=${encodeURIComponent(tmp.path)}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
              )))
              expect(resumed.status).toBe(404)
              expect(stub.captures.length).toBe(1)
              expect((yield* sessions.messages({ sessionID: session.id, agentID: "main" })).find((message) => message.info.id === result.info.id)).toEqual(result)
            }),
          ),
      })
    } finally {
      await stub.stop()
    }
  })

  test("GPT reasoning-only length step still auto-continues", async () => {
    await using tmp = await tmpdir({ git: true })
    const stub = startScriptedLLMServer([
      { lines: reasoningLengthResponse("token budget exhausted while thinking...") },
      { lines: textStopResponse("final answer") },
    ])
    try {
      await writeGPTConfig(tmp.path, stub.origin)
      await Instance.provide({
        directory: tmp.path,
        fn: () =>
          run(
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const session = yield* sessions.create({ title: "gpt-reasoning-length" })
              const result = yield* prompt.prompt({
                sessionID: session.id,
                agent: "build",
                parts: [{ type: "text", text: "Answer my question." }],
              })
              expect(stub.captures.length).toBe(2)
              expect(JSON.stringify(stub.captures[1].messages)).toContain("output token limit")
              expect(result.parts.some((p) => p.type === "text" && p.text === "final answer")).toBe(true)
            }),
          ),
      })
    } finally {
      await stub.stop()
    }
  })
})
