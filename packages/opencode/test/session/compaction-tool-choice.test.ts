/**
 * The compaction request must not invite tool calls.
 *
 * `SessionProcessor.handleEvent` throws unconditionally on `tool-input-start`
 * and `tool-call` when the assistant message carries `summary: true`
 * (processor.ts). `process()` turns that throw into `"stop"`, and compaction
 * answers `"stop"` by rolling its boundary back — so a summary step that calls a
 * tool does not degrade, it destroys the compaction. And compaction is the only
 * way back down once usage passes the trigger, so destroying it strands the
 * session above the trigger with no way down.
 *
 * That makes `toolChoice: "none"` load-bearing rather than incidental. Upstream
 * sends `"auto"` here (6080a114) while carrying the same throw, so the fork
 * deliberately diverges — see FD-011 in docs/upstream-deviations.md.
 *
 * This test pins the damage. The guard that prevents it lives in
 * skill-catalog-system-tail.test.ts, which asserts the literal `"none"` on a
 * compaction request built from a real frozen prefix snapshot — that literal is
 * only defensible because of what is measured here.
 */
import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { tmpdir } from "../fixture/fixture"
import { Log } from "../../src/util"

void Log.init({ print: false })

const ref = {
  providerID: ProviderID.make("alibaba"),
  modelID: ModelID.make("qwen-plus"),
}

afterEach(async () => {
  await Instance.disposeAll()
})

function run<A, E>(fx: Effect.Effect<A, E, SessionPrompt.Service | Session.Service>) {
  return Effect.runPromise(
    fx.pipe(Effect.scoped, Effect.provide(Layer.mergeAll(SessionPrompt.defaultLayer, Session.defaultLayer))),
  )
}

function sse(delta: Record<string, unknown>, finish?: string) {
  return `data: ${JSON.stringify({
    id: "chatcmpl-toolchoice",
    object: "chat.completion.chunk",
    choices: [{ delta, ...(finish ? { finish_reason: finish } : {}) }],
  })}\n\n`
}

/** A model that answers the summary prompt by calling a tool first. */
function toolCallStep() {
  return [
    sse({ role: "assistant" }),
    sse({
      tool_calls: [{ index: 0, id: "call-1", type: "function", function: { name: "read", arguments: "" } }],
    }),
    sse({ tool_calls: [{ index: 0, function: { arguments: '{"filePath":"/tmp/example"}' } }] }),
    sse({}, "tool_calls"),
    "data: [DONE]\n\n",
  ].join("")
}

function textStep(text: string) {
  return [sse({ role: "assistant" }), sse({ content: text }), sse({}, "stop"), "data: [DONE]\n\n"].join("")
}

/**
 * First call is the compaction request (the boundary is inserted before any
 * conversation turn runs), so the tool-calling step lands exactly there.
 */
function startLLM(payloads: string[]) {
  let calls = 0
  const server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url)
      if (!url.pathname.endsWith("/chat/completions")) return new Response("not found", { status: 404 })
      const payload = payloads[Math.min(calls, payloads.length - 1)]!
      calls++
      return new Response(payload, { status: 200, headers: { "Content-Type": "text/event-stream" } })
    },
  })
  return { origin: server.url.origin, stop: () => server.stop(true) }
}

function mimocodeConfig(baseURL: string) {
  return JSON.stringify({
    $schema: "https://opencode.ai/config.json",
    enabled_providers: ["alibaba"],
    provider: { alibaba: { options: { apiKey: "test-key", baseURL: `${baseURL}/v1` } } },
    agent: {
      build: {
        model: "alibaba/qwen-plus",
        prompt: "Compaction tool-choice fixture.",
        tool_allowlist: ["read"],
      },
    },
    compaction: { reserved: 100, max_context: 40_000 },
    checkpoint: { thresholds: [], reserved: 100 },
  })
}

async function seedUserMessage(sessionID: SessionID, text: string) {
  const msg = await Effect.runPromise(
    Session.Service.use((s) =>
      s.updateMessage({
        id: MessageID.ascending(),
        role: "user",
        sessionID,
        agentID: "main",
        agent: "build",
        model: ref,
        time: { created: Date.now() },
      }),
    ).pipe(Effect.provide(Session.defaultLayer)),
  )
  await Effect.runPromise(
    Session.Service.use((s) =>
      s.updatePart({ id: PartID.ascending(), messageID: msg.id, sessionID, type: "text", text }),
    ).pipe(Effect.provide(Session.defaultLayer)),
  )
  return msg
}

async function seedFinishedAssistant(sessionID: SessionID, parentID: MessageID, totalTokens: number) {
  const msg = await Effect.runPromise(
    Session.Service.use((s) =>
      s.updateMessage({
        id: MessageID.ascending(),
        role: "assistant",
        sessionID,
        parentID,
        agentID: "main",
        agent: "build",
        mode: "build",
        modelID: ref.modelID,
        providerID: ref.providerID,
        path: { cwd: "/tmp", root: "/tmp" },
        cost: 0,
        finish: "stop",
        tokens: { total: totalTokens, input: totalTokens, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        time: { created: Date.now(), completed: Date.now() },
      }),
    ).pipe(Effect.provide(Session.defaultLayer)),
  )
  await Effect.runPromise(
    Session.Service.use((s) =>
      s.updatePart({ id: PartID.ascending(), messageID: msg.id, sessionID, type: "text", text: "an earlier answer" }),
    ).pipe(Effect.provide(Session.defaultLayer)),
  )
  return msg
}

async function driveCompaction(payloads: string[]) {
  const previous = process.env.MIMOCODE_DISABLE_CHECKPOINT
  process.env.MIMOCODE_DISABLE_CHECKPOINT = "true"
  const llm = startLLM(payloads)
  try {
    await using tmp = await tmpdir({
      git: true,
      init: (dir) => Bun.write(path.join(dir, "mimocode.json"), mimocodeConfig(llm.origin)),
    })
    return await Instance.provide({
      directory: tmp.path,
      fn: () =>
        run(
          Effect.gen(function* () {
            const prompt = yield* SessionPrompt.Service
            const sessions = yield* Session.Service
            const info = yield* sessions.create({ title: "compaction-tool-choice" })
            const first = yield* Effect.promise(() => seedUserMessage(info.id, "context that must survive"))
            yield* Effect.promise(() => seedFinishedAssistant(info.id, first.id, 47_000))

            yield* prompt.prompt({
              sessionID: info.id,
              parts: [{ type: "text", text: "a follow-up turn that trips the compaction trigger" }],
              agent: "build",
            })

            const after = yield* sessions.messages({ sessionID: info.id, agentID: "main" })
            return {
              errors: after
                .map((m) => (m.info.role === "assistant" ? m.info.error : undefined))
                .filter((e): e is NonNullable<typeof e> => !!e)
                .map((e) => `${e.name}: ${JSON.stringify(e.data)}`)
                .join("\n"),
            }
          }),
        ),
    })
  } finally {
    if (previous === undefined) delete process.env.MIMOCODE_DISABLE_CHECKPOINT
    else process.env.MIMOCODE_DISABLE_CHECKPOINT = previous
    await llm.stop()
  }
}

describe("compaction tool choice", () => {
  test(
    "a tool call during the summary step is rejected, not handled",
    async () => {
      // If this ever stops throwing, summary messages have gained real tool
      // support and the `"none"` guard can be revisited.
      const result = await driveCompaction([toolCallStep(), textStep("a real summary")])
      expect(result.errors).toContain("Tool call not allowed while generating summary")
    },
    { timeout: 60_000 },
  )
})
