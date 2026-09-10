/**
 * The compaction request must not invite tool calls.
 *
 * `SessionProcessor.handleEvent` throws unconditionally on `tool-input-start`
 * and `tool-call` when the assistant message carries `summary: true`.
 * `process()` turns that throw into `"stop"`, and compaction answers `"stop"`
 * by rolling its boundary back — so a tool call during the summary step does
 * not degrade the summary, it destroys the compaction. Compaction is the only
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
import { afterEach, expect } from "bun:test"
import { Effect } from "effect"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { Log } from "../../src/util"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { makeLayer, providerCfg } from "../workflow/lib"
import { compactionCfg, disableCheckpoint, seedOverflowingTurn, sessionErrors } from "./compaction-overflow-fixture"

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

const it = testEffect(makeLayer())

it.live(
  "a tool call during the summary step is rejected, not handled",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        yield* disableCheckpoint
        const sessions = yield* Session.Service
        const prompt = yield* SessionPrompt.Service
        const session = yield* sessions.create({ title: "compaction tool choice" })
        yield* seedOverflowingTurn(session.id)

        // The boundary is inserted before any conversation turn runs, so the
        // first scripted reply is the one the compaction request receives.
        yield* llm.tool("read", { filePath: "/tmp/example" })
        yield* llm.text("a real summary")

        yield* prompt.prompt({
          sessionID: session.id,
          parts: [{ type: "text", text: "a follow-up turn that trips the compaction trigger" }],
          agent: "build",
        })

        // If this ever stops throwing, summary messages have gained real tool
        // support and the `"none"` guard can be revisited.
        expect(yield* sessionErrors(session.id)).toContain("Tool call not allowed while generating summary")
      }),
      { git: true, config: (url) => ({ ...providerCfg(url), ...compactionCfg }) },
    ),
  60_000,
)
