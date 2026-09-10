/**
 * Compaction survives a think-only summary step (FD-010).
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
 * The three tests are the same fixture under the three response shapes a
 * provider can return, so what they pin is the response shape and nothing else.
 */
import { afterEach, expect } from "bun:test"
import { Effect } from "effect"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { Log } from "../../src/util"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { raw, reply } from "../lib/llm-server"
import { makeLayer, providerCfg } from "../workflow/lib"
import {
  compactionBoundary,
  compactionCfg,
  disableCheckpoint,
  seedOverflowingTurn,
  sessionErrors,
} from "./compaction-overflow-fixture"

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

const it = testEffect(makeLayer())

/** Runs one prompt against an already-overflowing session and reports the outcome. */
const driveCompaction = Effect.fn("test.driveCompaction")(function* (title: string) {
  const sessions = yield* Session.Service
  const prompt = yield* SessionPrompt.Service
  const session = yield* sessions.create({ title })
  yield* seedOverflowingTurn(session.id)

  yield* prompt.prompt({
    sessionID: session.id,
    parts: [{ type: "text", text: "a follow-up turn that trips the compaction trigger" }],
    agent: "build",
  })

  const boundary = yield* compactionBoundary(session.id)
  return {
    // A surviving boundary means the summary was accepted; a rolled back one
    // means the turn was discarded.
    boundarySurvived: !!boundary,
    summary: boundary?.type === "compaction" ? (boundary.projection?.summary ?? "") : "",
    errors: yield* sessionErrors(session.id),
  }
})

const cfg = { git: true as const, config: (url: string) => ({ ...providerCfg(url), ...compactionCfg }) }

it.live(
  "a think-only summary step is adopted instead of discarded",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        yield* disableCheckpoint
        yield* llm.reason("The user asked about X; we changed Y and Z remains open.")
        yield* llm.text("final answer")

        const result = yield* driveCompaction("think-only compaction")
        expect(result.errors).not.toContain("Compaction produced no usable summary")
        expect(result.boundarySurvived).toBe(true)
        // The reasoning is what ends up in the projection the next turn replays.
        expect(result.summary).toContain("we changed Y and Z remains open")
      }),
      cfg,
    ),
  60_000,
)

it.live(
  "a step with no content at all still rolls back",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        yield* disableCheckpoint
        // Nothing to recover, so the existing behaviour must be untouched — the
        // fallback must not become a blanket "accept any finished step".
        yield* llm.push(reply().stop().item())
        yield* llm.text("final answer")

        const result = yield* driveCompaction("empty compaction")
        expect(result.errors).toContain("Compaction produced no usable summary")
        expect(result.boundarySurvived).toBe(false)
      }),
      cfg,
    ),
  60_000,
)

it.live(
  "a normal text summary is unaffected",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        yield* disableCheckpoint
        yield* llm.text("a real summary of the conversation so far")
        yield* llm.text("final answer")

        const result = yield* driveCompaction("text compaction")
        expect(result.errors).toBe("")
        expect(result.boundarySurvived).toBe(true)
        expect(result.summary).toContain("a real summary of the conversation so far")
      }),
      cfg,
    ),
  60_000,
)

it.live(
  "reasoning withheld by the content filter is never promoted",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        yield* disableCheckpoint
        // `process()` does not treat a content-filter finish as terminal — the
        // conversation path does that in its own classification step, which
        // compaction never runs. So without an explicit guard this reaches the
        // fallback with reasoning in hand and promotes content the provider
        // deliberately withheld, while discarding the history it replaced.
        yield* llm.push(
          raw({
            head: [
              { id: "chatcmpl-filtered", object: "chat.completion.chunk", choices: [{ delta: { role: "assistant" } }] },
              {
                id: "chatcmpl-filtered",
                object: "chat.completion.chunk",
                choices: [{ delta: { reasoning_content: "WITHHELD_BY_FILTER" } }],
              },
              {
                id: "chatcmpl-filtered",
                object: "chat.completion.chunk",
                choices: [{ delta: {}, finish_reason: "content_filter" }],
              },
            ],
          }),
        )
        yield* llm.text("final answer")

        const result = yield* driveCompaction("filtered compaction")
        expect(result.summary).not.toContain("WITHHELD_BY_FILTER")
        expect(result.boundarySurvived).toBe(false)
        expect(result.errors).toContain("withheld by the content filter")
      }),
      cfg,
    ),
  60_000,
)

it.live(
  "reasoning truncated by the output limit is still adopted",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        yield* disableCheckpoint
        // `length` is the deliberate counterpart to the content-filter case: the
        // recap is truncated, not suppressed. A partial summary still beats
        // losing the session, so this must NOT be swept up by that guard.
        yield* llm.push(
          raw({
            head: [
              { id: "chatcmpl-length", object: "chat.completion.chunk", choices: [{ delta: { role: "assistant" } }] },
              {
                id: "chatcmpl-length",
                object: "chat.completion.chunk",
                choices: [{ delta: { reasoning_content: "We changed Y and Z rem" } }],
              },
              {
                id: "chatcmpl-length",
                object: "chat.completion.chunk",
                choices: [{ delta: {}, finish_reason: "length" }],
              },
            ],
          }),
        )
        yield* llm.text("final answer")

        const result = yield* driveCompaction("truncated compaction")
        expect(result.boundarySurvived).toBe(true)
        expect(result.summary).toContain("We changed Y and Z rem")
      }),
      cfg,
    ),
  60_000,
)
