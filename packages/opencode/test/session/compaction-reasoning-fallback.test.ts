/**
 * Compaction survives a think-only summary step.
 *
 * A reasoning model asked to write a summary can finish the step having emitted
 * only reasoning and no text. The conversation path already recognises that
 * shape and retries it (SessionPrompt.autoContinueInvalidOutput, reason
 * "think-only"); compaction had no equivalent and rolled the boundary back on
 * the first miss.
 *
 * That asymmetry is what kills sessions. Compaction is the only way back down
 * once usage passes the trigger, so one rolled-back boundary leaves the session
 * pinned above it: /compact reports "no usable summary" and changes nothing,
 * and every turn after it fails the same way.
 *
 * The three tests below are the same fixture under the three response shapes a
 * provider can return, so what they pin is the response shape and nothing else.
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
    id: "chatcmpl-fallback",
    object: "chat.completion.chunk",
    choices: [{ delta, ...(finish ? { finish_reason: finish } : {}) }],
  })}\n\n`
}

/** Text and nothing else — the healthy shape. */
function textStep(text: string) {
  return [sse({ role: "assistant" }), sse({ content: text }), sse({}, "stop"), "data: [DONE]\n\n"].join("")
}

/** Reasoning and nothing else — what a reasoning model degrades to. */
function thinkOnlyStep(reasoning: string) {
  return [sse({ role: "assistant" }), sse({ reasoning_content: reasoning }), sse({}, "stop"), "data: [DONE]\n\n"].join(
    "",
  )
}

/** finish_reason stop with no content at all — nothing to recover. */
function emptyStep() {
  return [sse({ role: "assistant" }), sse({}, "stop"), "data: [DONE]\n\n"].join("")
}

function startLLM(payload: string) {
  const server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url)
      if (!url.pathname.endsWith("/chat/completions")) return new Response("not found", { status: 404 })
      return new Response(payload, { status: 200, headers: { "Content-Type": "text/event-stream" } })
    },
  })
  return { origin: server.url.origin, stop: () => server.stop(true) }
}

/**
 * 40_000 budget → trigger at floor(40_000 * 0.9) = 36_000. The seeded turn
 * reports 47_000, so compaction fires on the first prompt.
 */
function mimocodeConfig(baseURL: string) {
  return JSON.stringify({
    $schema: "https://opencode.ai/config.json",
    enabled_providers: ["alibaba"],
    provider: { alibaba: { options: { apiKey: "test-key", baseURL: `${baseURL}/v1` } } },
    agent: {
      build: {
        model: "alibaba/qwen-plus",
        prompt: "Compaction reasoning-fallback fixture.",
        tool_allowlist: [],
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
      s.updatePart({
        id: PartID.ascending(),
        messageID: msg.id,
        sessionID,
        type: "text",
        text: "an earlier answer",
      }),
    ).pipe(Effect.provide(Session.defaultLayer)),
  )
  return msg
}

async function driveCompaction(payload: string) {
  const previous = process.env.MIMOCODE_DISABLE_CHECKPOINT
  process.env.MIMOCODE_DISABLE_CHECKPOINT = "true"
  const llm = startLLM(payload)
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
            const info = yield* sessions.create({ title: "compaction-reasoning-fallback" })
            const first = yield* Effect.promise(() => seedUserMessage(info.id, "context that must survive"))
            yield* Effect.promise(() => seedFinishedAssistant(info.id, first.id, 47_000))

            yield* prompt.prompt({
              sessionID: info.id,
              parts: [{ type: "text", text: "a follow-up turn that trips the compaction trigger" }],
              agent: "build",
            })

            const after = yield* sessions.messages({ sessionID: info.id, agentID: "main" })
            const compaction = after.flatMap((m) => m.parts).find((p) => p.type === "compaction")
            return {
              // A surviving boundary means the summary was accepted; a rolled
              // back one means the turn was discarded.
              boundarySurvived: !!compaction,
              summary: compaction?.projection?.summary ?? "",
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

describe("compaction reasoning fallback", () => {
  test(
    "a think-only summary step is adopted instead of discarded",
    async () => {
      const result = await driveCompaction(thinkOnlyStep("The user asked about X; we changed Y and Z remains open."))
      expect(result.errors).not.toContain("Compaction produced no usable summary")
      expect(result.boundarySurvived).toBe(true)
      // The reasoning is what ends up in the projection the next turn replays.
      expect(result.summary).toContain("we changed Y and Z remains open")
    },
    { timeout: 60_000 },
  )

  test(
    "a step with no content at all still rolls back",
    async () => {
      // Nothing to recover, so the existing behaviour must be untouched — the
      // fallback must not be a blanket "accept any finished step".
      const result = await driveCompaction(emptyStep())
      expect(result.errors).toContain("Compaction produced no usable summary")
      expect(result.boundarySurvived).toBe(false)
    },
    { timeout: 60_000 },
  )

  test(
    "a normal text summary is unaffected",
    async () => {
      const result = await driveCompaction(textStep("a real summary of the conversation so far"))
      expect(result.errors).toBe("")
      expect(result.boundarySurvived).toBe(true)
      expect(result.summary).toContain("a real summary of the conversation so far")
    },
    { timeout: 60_000 },
  )
})
