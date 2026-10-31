import { describe, expect } from "bun:test"
import { Deferred, Effect, Layer } from "effect"
import fs from "node:fs/promises"
import path from "node:path"
import { CHECKPOINT_WRITER_STEPS } from "../../src/agent/agent"
import { Actor } from "../../src/actor/spawn"
import { Command } from "../../src/command"
import { Config } from "../../src/config"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Permission } from "../../src/permission"
import { Provider } from "../../src/provider"
import { Session } from "../../src/session"
import { SessionCheckpoint } from "../../src/session/checkpoint"
import { checkpointPath } from "../../src/session/checkpoint-paths"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionPrompt } from "../../src/session/prompt"
import type { MessageID, SessionID } from "../../src/session/schema"
import { SessionTable } from "../../src/session/session.sql"
import { Database, eq } from "../../src/storage"
import { Log } from "../../src/util"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { textStopResponse, toolCallResponse, toolCallsResponse } from "../lib/scripted-llm-server"

void Log.init({ print: false })

// A fresh SessionPrompt and Actor layer per test installs the process-global
// prefixCaptureRef and spawnRef the writer needs; other test files reset both.
const it = testEffect(
  Layer.mergeAll(
    SessionPrompt.defaultLayer,
    Actor.defaultLayer,
    Session.defaultLayer,
    Config.defaultLayer,
    Provider.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Permission.defaultLayer,
    SessionCheckpoint.defaultLayer,
  ),
)

const WRITER_MARKER = "checkpoint-writer mode"
const BOUNDARY_LABEL = "Summary of previous conversation from checkpoint files:"
const HIGH_USAGE = 260_000

type Body = { messages: Array<{ role: string; content: unknown }>; tool_choice?: unknown }

const isWriter = (body: Body) => JSON.stringify(body.messages).includes(WRITER_MARKER)

/**
 * Routes by request content instead of call order: the writer runs in the
 * background, concurrently with the foreground turn, so a positional script
 * cannot tell which reply reaches which caller.
 */
function startRoutedLLM(input: { main: (call: number) => string[]; writer: (body: Body) => Response }) {
  let mainCalls = 0
  const writers: Body[] = []
  const encoder = new TextEncoder()
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      if (!new URL(req.url).pathname.endsWith("/chat/completions")) return new Response("not found", { status: 404 })
      const body = (await req.json()) as Body
      if (isWriter(body)) {
        writers.push(body)
        return input.writer(body)
      }
      const lines = input.main(mainCalls++)
      return new Response(
        new ReadableStream<Uint8Array>({
          start(ctrl) {
            for (const line of lines) ctrl.enqueue(encoder.encode(line))
            ctrl.close()
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      )
    },
  })
  return {
    origin: server.url.origin,
    writers,
    get writerCalls() {
      return writers.length
    },
    stop: () => server.stop(true),
  }
}

function config(origin: string, context = 400_000): Partial<Config.Info> {
  return {
    enabled_providers: ["test"],
    model: "test/model",
    provider: {
      test: {
        npm: "@ai-sdk/openai-compatible",
        env: [],
        options: { apiKey: "test-key", baseURL: `${origin}/v1` },
        models: {
          model: {
            name: "Test",
            tool_call: true,
            limit: { context, output: 10_000 },
            modalities: { input: ["text"], output: ["text"] },
          },
        },
      },
    },
    agent: { build: { model: "test/model" } },
    permission: { read: "allow" },
    checkpoint: { thresholds: ["50%"] },
    lsp: false,
    formatter: false,
  }
}

const overflow = () =>
  Response.json(
    {
      error: {
        message: "This model's maximum context length is 400000 tokens; the prompt has 401234 tokens",
        type: "invalid_request_error",
      },
    },
    { status: 400 },
  )

describe("checkpoint writer context overflow", () => {
  it.live(
    "settles as a failure after one rejected request instead of re-sending it",
    () =>
      Effect.gen(function* () {
        const server = startRoutedLLM({
          // The second foreground step reports usage past the 50% threshold, so
          // the turn after it starts the writer.
          main: (call) => textStopResponse(`reply ${call}`, call === 1 ? { promptTokens: HIGH_USAGE } : undefined),
          writer: overflow,
        })
        yield* Effect.addFinalizer(() => Effect.promise(() => server.stop()))
        yield* provideTmpdirInstance(
          () =>
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const checkpoint = yield* SessionCheckpoint.Service
              const session = yield* sessions.create({ title: "writer overflow" })
              const say = (value: string) =>
                prompt.prompt({ sessionID: session.id, agent: "build", parts: [{ type: "text", text: value }] })

              yield* say("start the task")
              yield* say("produce the large step")
              yield* say("next")

              const settled = yield* checkpoint
                .waitForWriterSettlement(session.id)
                .pipe(Effect.timeout("20 seconds"), Effect.option)
              // A loop would keep re-sending the identical rejected request.
              yield* Effect.sleep("1 second")
              const writerCalls = server.writerCalls
              if (settled._tag === "None") {
                // Stop a runaway writer so teardown can dispose the instance and
                // the assertion below is what reports the failure.
                const actor = yield* Actor.Service
                for (const child of yield* sessions.children(session.id))
                  yield* actor.cancel(child.id, "checkpoint-writer-1", "forced")
              }
              expect({ settled: settled._tag, writerCalls }).toEqual({ settled: "Some", writerCalls: 1 })
              if (settled._tag !== "Some") return
              expect(settled.value.outcome).toBe("failure")
              expect(settled.value.failure).toMatchObject({ kind: "overflow", retryable: false })
            }),
          { git: true, config: config(server.origin) },
        )
      }),
    60_000,
  )

  it.live(
    "stops a bounded agent without a fork context after one rejected request",
    () =>
      Effect.gen(function* () {
        let calls = 0
        const server = Bun.serve({
          port: 0,
          fetch(req) {
            if (!new URL(req.url).pathname.endsWith("/chat/completions")) return new Response("not found", { status: 404 })
            calls++
            return overflow()
          },
        })
        yield* Effect.addFinalizer(() => Effect.promise(() => server.stop(true)))
        yield* provideTmpdirInstance(
          () =>
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const session = yield* sessions.create({ title: "bounded overflow" })
              const done = yield* Deferred.make<MessageV2.WithParts>()
              yield* prompt
                .prompt({ sessionID: session.id, agent: "checkpoint-writer", parts: [{ type: "text", text: "write" }] })
                .pipe(
                  Effect.flatMap((message) => Deferred.succeed(done, message)),
                  Effect.forkChild,
                )
              const result = yield* Deferred.await(done).pipe(Effect.timeout("20 seconds"), Effect.option)
              const sent = calls
              // Stop a runaway loop so teardown can dispose the instance and the
              // assertion below is what reports the failure.
              if (result._tag === "None") yield* prompt.cancel(session.id)
              expect({ settled: result._tag, sent }).toEqual({ settled: "Some", sent: 1 })
              if (result._tag !== "Some") return
              expect(result.value.info.role === "assistant" && result.value.info.error?.name).toBe("ContextOverflowError")
            }),
          { git: true, config: config(server.url.origin) },
        )
      }),
    60_000,
  )
})

// Four files per segment, each just under the read tool's 50 KB output cap: one
// segment fits the window (including request preflight, where it runs), the two
// segments a stale checkpoint leaves behind do not.
const SEGMENTS = [
  ["a1.txt", "a2.txt", "a3.txt", "a4.txt"],
  ["b1.txt", "b2.txt", "b3.txt", "b4.txt"],
]
const segmentBody = (name: string) =>
  Array.from({ length: 1_100 }, (_, i) => `${name} segment body line ${i} padding-padding`).join("\n")

function seedCheckpoint(sessionID: SessionID, watermark: MessageID) {
  return Effect.promise(async () => {
    await fs.mkdir(path.dirname(checkpointPath(sessionID)), { recursive: true })
    await Bun.write(checkpointPath(sessionID), "# Session checkpoint\n\n## §1 Active intent\nRead the segments.\n")
    Database.use((db) =>
      db.update(SessionTable).set({ last_checkpoint_message_id: watermark }).where(eq(SessionTable.id, sessionID)).run(),
    )
  })
}

describe("checkpoint writer fork size", () => {
  for (const fork of [true, false])
    it.live(
      `falls back to the parent's view when the full rebuild tail exceeds the usable window (fork: ${fork})`,
      () =>
        Effect.gen(function* () {
          const script = [
            textStopResponse("starting"),
            ...SEGMENTS.flatMap((files, segment) => [
              toolCallsResponse(
                files.map((file, index) => ({
                  id: `call-${segment}-${index}`,
                  name: "read",
                  args: JSON.stringify({ file_path: file }),
                })),
              ),
              textStopResponse(`segment ${segment} done`),
            ]),
            textStopResponse("live reply"),
            // Past the 50% threshold (90K of the 180K usable window), below the window itself.
            textStopResponse("large step", { promptTokens: 100_000 }),
            textStopResponse("ok"),
          ]
          const server = startRoutedLLM({
            main: (call) => script[Math.min(call, script.length - 1)],
            // Every writer fails, as in production: the checkpoint stays stale, so
            // each rebuild reuses it and the newest boundary's tail keeps growing.
            writer: overflow,
          })
          yield* Effect.addFinalizer(() => Effect.promise(() => server.stop()))
          yield* provideTmpdirInstance(
            (dir) =>
              Effect.gen(function* () {
                for (const file of SEGMENTS.flat())
                  yield* Effect.promise(() => Bun.write(path.join(dir, file), segmentBody(file)))
                const sessions = yield* Session.Service
                const prompt = yield* SessionPrompt.Service
                const checkpoint = yield* SessionCheckpoint.Service
                const session = yield* sessions.create({ title: "stale checkpoint tail" })
                const say = (value: string) =>
                  prompt.prompt({ sessionID: session.id, agent: "build", parts: [{ type: "text", text: value }] })
                const rebuild = () =>
                  prompt.command({ sessionID: session.id, command: Command.Default.REBUILD, arguments: "", agent: "build" })

                yield* say("start the task")
                const watermark = (yield* sessions.messages({ sessionID: session.id })).at(-1)!
                yield* seedCheckpoint(session.id, watermark.info.id)
                // Both rebuilds reuse the seeded checkpoint, so the second boundary's
                // tail spans both segments.
                yield* say("read segment one")
                yield* rebuild()
                yield* say("read segment two")
                yield* rebuild()
                yield* say("after the second rebuild")
                yield* say("produce the large step")
                const before = server.writerCalls
                // The large step reported usage past the threshold, so this turn starts the writer.
                yield* say("next")

                for (let attempt = 0; attempt < 200 && server.writerCalls === before; attempt++)
                  yield* Effect.sleep("50 millis")
                yield* checkpoint.waitForWriter(session.id)
                expect(server.writerCalls).toBeGreaterThan(before)
                const writer = JSON.stringify(server.writers[before].messages)
                expect(writer).toContain(WRITER_MARKER)
                expect(writer).toContain(BOUNDARY_LABEL)
                expect(writer).not.toContain("segment body line")
              }),
            { git: true, config: { ...config(server.origin, 200_000), checkpoint: { thresholds: ["50%"], fork } } },
          )
        }),
      120_000,
    )
})

const VALID_CHECKPOINT = [
  "Topic: step budget fixture",
  "",
  ...["Execution context", "Live resources", "Session metadata", "Discovered", "Dead ends"].flatMap((name) => [
    `### ${name}`,
    "(none)",
    "",
  ]),
].join("\n")

const sse = (lines: string[]) => new Response(lines.join(""), { headers: { "Content-Type": "text/event-stream" } })

describe("checkpoint writer step budget", () => {
  it.live(
    "ends a writer whose model never stops calling tools",
    () =>
      Effect.gen(function* () {
        const server = startRoutedLLM({
          main: (call) => textStopResponse(`reply ${call}`, call === 1 ? { promptTokens: HIGH_USAGE } : undefined),
          // The model keeps calling a tool on every step it is allowed one, as a
          // writer did in production; it only answers in text when tools are off.
          writer: (body) =>
            sse(
              body.tool_choice === "none"
                ? textStopResponse("done")
                : toolCallResponse({
                    id: `call-${Math.random().toString(36).slice(2)}`,
                    name: "task",
                    args: JSON.stringify({ operation: { action: "list" } }),
                  }),
            ),
        })
        yield* Effect.addFinalizer(() => Effect.promise(() => server.stop()))
        yield* provideTmpdirInstance(
          () =>
            Effect.gen(function* () {
              const sessions = yield* Session.Service
              const prompt = yield* SessionPrompt.Service
              const checkpoint = yield* SessionCheckpoint.Service
              const session = yield* sessions.create({ title: "writer step budget" })
              const say = (value: string) =>
                prompt.prompt({ sessionID: session.id, agent: "build", parts: [{ type: "text", text: value }] })

              // A checkpoint that already passes validation, so the writer is not
              // re-prompted to fix it and only the step budget can end the run.
              yield* Effect.promise(async () => {
                await fs.mkdir(path.dirname(checkpointPath(session.id)), { recursive: true })
                await Bun.write(checkpointPath(session.id), VALID_CHECKPOINT)
              })
              yield* say("start the task")
              yield* say("produce the large step")
              yield* say("next")

              const settled = yield* checkpoint
                .waitForWriterSettlement(session.id)
                .pipe(Effect.timeout("90 seconds"), Effect.option)
              const writerCalls = server.writerCalls
              if (settled._tag === "None") {
                // Stop a runaway writer so teardown can dispose the instance and
                // the assertion below is what reports the failure.
                const actor = yield* Actor.Service
                for (const child of yield* sessions.children(session.id))
                  yield* actor.cancel(child.id, "checkpoint-writer-1", "forced")
              }
              expect({ settled: settled._tag, lastToolChoice: server.writers.at(-1)?.tool_choice, writerCalls }).toEqual({
                settled: "Some",
                lastToolChoice: "none",
                writerCalls: CHECKPOINT_WRITER_STEPS,
              })
              expect(writerCalls).toBe(CHECKPOINT_WRITER_STEPS)
            }),
          { git: true, config: config(server.origin) },
        )
      }),
    150_000,
  )
})
