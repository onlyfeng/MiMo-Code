/**
 * Shared setup for tests that need the real auto-compaction path to fire.
 *
 * Getting there takes three things that are easy to get subtly wrong, so they
 * live here once rather than in each test: a budget the resolver actually
 * adopts, a completed turn whose reported usage is above the resulting trigger,
 * and checkpointing out of the way so overflow degrades to compaction instead
 * of rebuilding.
 */
import { Effect } from "effect"
import { Session } from "../../src/session"
import type { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID, type SessionID } from "../../src/session/schema"
import { ref } from "../workflow/lib"

/**
 * `test-model` caps context at 100_000 with a 10_000 output limit, so the
 * reserve floor is 100 + 10_000. A 40_000 budget clears it, stays under the
 * cap, and puts the compaction trigger at floor(40_000 * 0.9) = 36_000.
 *
 * `checkpoint.thresholds: []` is declared rather than left to inference:
 * SessionPrune only consults the default ladder when `thresholds` is absent, so
 * passing an empty list keeps checkpoint firing out of the measurement.
 */
export const COMPACTION_TRIGGER = 36_000

export const compactionCfg = {
  compaction: { reserved: 100, max_context: 40_000 },
  checkpoint: { thresholds: [], reserved: 100 },
}

/**
 * Overflow prefers rebuilding from a checkpoint and only degrades to compaction
 * when no checkpoint is available. Tests here are about compaction, so take
 * checkpointing off the table for the duration of the scope.
 */
export const disableCheckpoint = Effect.gen(function* () {
  const previous = process.env["MIMOCODE_DISABLE_CHECKPOINT"]
  process.env["MIMOCODE_DISABLE_CHECKPOINT"] = "true"
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      if (previous === undefined) delete process.env["MIMOCODE_DISABLE_CHECKPOINT"]
      else process.env["MIMOCODE_DISABLE_CHECKPOINT"] = previous
    }),
  )
})

/**
 * A user turn plus a COMPLETED assistant turn reporting `totalTokens`. The
 * runLoop reads exactly this message as `lastFinished` and feeds its tokens to
 * the overflow check, so this is what makes the next prompt overflow.
 *
 * Defaults to 47_000 — 117% of the 36_000 trigger, mirroring the field report
 * this fixture was built from.
 */
export const seedOverflowingTurn = Effect.fn("test.seedOverflowingTurn")(function* (
  sessionID: SessionID,
  options?: { totalTokens?: number; userText?: string },
) {
  const sessions = yield* Session.Service
  const user = yield* sessions.updateMessage({
    id: MessageID.ascending(),
    role: "user",
    sessionID,
    agentID: "main",
    agent: "build",
    model: ref,
    time: { created: Date.now() },
  })
  yield* sessions.updatePart({
    id: PartID.ascending(),
    messageID: user.id,
    sessionID,
    type: "text",
    text: options?.userText ?? "context that must survive",
  })

  const totalTokens = options?.totalTokens ?? 47_000
  const assistant: MessageV2.Assistant = {
    id: MessageID.ascending(),
    role: "assistant",
    parentID: user.id,
    sessionID,
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
  }
  yield* sessions.updateMessage(assistant)
  yield* sessions.updatePart({
    id: PartID.ascending(),
    messageID: assistant.id,
    sessionID,
    type: "text",
    text: "an earlier answer",
  })
  return { user, assistant }
})

/** Assistant-message errors on the session, joined for substring assertions. */
export const sessionErrors = Effect.fn("test.sessionErrors")(function* (sessionID: SessionID) {
  const sessions = yield* Session.Service
  const messages = yield* sessions.messages({ sessionID, agentID: "main" })
  return messages
    .map((message) => (message.info.role === "assistant" ? message.info.error : undefined))
    .filter((error): error is NonNullable<typeof error> => !!error)
    .map((error) => `${error.name}: ${JSON.stringify(error.data)}`)
    .join("\n")
})

/** The compaction boundary part, if it survived. A rollback removes it. */
export const compactionBoundary = Effect.fn("test.compactionBoundary")(function* (sessionID: SessionID) {
  const sessions = yield* Session.Service
  const messages = yield* sessions.messages({ sessionID, agentID: "main" })
  return messages.flatMap((message) => message.parts).find((part) => part.type === "compaction")
})
