import { describe, expect, test } from "bun:test"
import { filterCompacted } from "../../src/session/message-v2"
import type { MessageV2 } from "../../src/session/message-v2"
import type { MessageID, PartID, SessionID } from "../../src/session/schema"

const SID = "s_test" as SessionID

function userMsg(
  id: string,
  time: number,
  opts?: { isCheckpoint?: boolean; coveredUpTo?: string },
): MessageV2.WithParts {
  const parts = opts?.isCheckpoint
    ? [
        {
          id: ("p_" + id) as PartID,
          messageID: id as MessageID,
          sessionID: SID,
          type: "checkpoint",
          checkpointDir: "",
          checkpointNumber: 0,
          coveredUpTo: ((opts.coveredUpTo ?? "u0") as MessageID),
        } as unknown as MessageV2.Part,
      ]
    : []
  return {
    info: {
      id: id as MessageID,
      sessionID: SID,
      role: "user",
      time: { created: time },
      agent: "build",
      model: { providerID: "anthropic" as never, modelID: "claude" as never },
    } as MessageV2.User,
    parts,
  } as unknown as MessageV2.WithParts
}

function asstMsg(id: string, time: number, finish: string): MessageV2.WithParts {
  return {
    info: {
      id: id as MessageID,
      sessionID: SID,
      role: "assistant",
      time: { created: time },
      agent: "build",
      providerID: "anthropic" as never,
      modelID: "claude" as never,
      mode: "build",
      variant: "default" as never,
      path: { cwd: "/", root: "/" },
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      finish,
    } as unknown as MessageV2.Assistant,
    parts: [],
  } as unknown as MessageV2.WithParts
}

describe("filterCompacted with marker positioned at boundary.time + 1", () => {
  test("legacy marker without source preserves a same-time live tail", () => {
    // Markers persisted before the source discriminator still carry the exact
    // coveredUpTo seam. The marker ID sorts after a1 at the same timestamp, so
    // a physical stop-at-marker would silently lose a1.
    const msgs = [
      userMsg("u0", 0),
      asstMsg("a1", 11, "stop"),
      userMsg("syn", 11, { isCheckpoint: true, coveredUpTo: "u0" }),
      asstMsg("a2", 20, "tool-calls"),
    ]
    const result = filterCompacted([...msgs].reverse())
    expect(result.map((m) => m.info.id as string)).toEqual(["syn", "a1", "a2"])
  })

  test("missing or reversed checkpoint coverage fails closed without trimming history", () => {
    const missing = [
      userMsg("u0", 0),
      userMsg("syn", 11, { isCheckpoint: true, coveredUpTo: "absent" }),
      asstMsg("a2", 20, "tool-calls"),
    ]
    expect(filterCompacted([...missing].reverse()).map((m) => m.info.id as string)).toEqual(["u0", "syn", "a2"])

    const reversed = [
      userMsg("u0", 0),
      userMsg("syn", 11, { isCheckpoint: true, coveredUpTo: "a2" }),
      asstMsg("a2", 20, "tool-calls"),
    ]
    expect(filterCompacted([...reversed].reverse()).map((m) => m.info.id as string)).toEqual([
      "u0",
      "syn",
      "a2",
    ])
  })

  test("preserves post-boundary tail when marker time = boundary.time + 1", () => {
    // Conversation: u0 (T=0) → a1 (T=10, finish=stop) → a2 (T=20, finish=tool-calls)
    // Boundary policy (Task 1): boundary = msg before lastAsst = a1
    // Synthetic marker (Task 2 placement): time = a1.time + 1 = 11
    // Stream yields newest first: a2, syn, a1, u0.
    // coveredUpTo=a1 is found immediately behind the marker, so the logical
    // window remains [syn, a2].
    const msgs = [
      userMsg("u0", 0),
      asstMsg("a1", 10, "stop"),
      userMsg("syn", 11, { isCheckpoint: true, coveredUpTo: "a1" }),
      asstMsg("a2", 20, "tool-calls"),
    ]
    // filterCompacted iterates the iterable in input order; we need to feed it
    // newest-first to mimic stream(). Reverse the input array.
    const newestFirst = [...msgs].reverse()
    const result = filterCompacted(newestFirst)
    expect(result.map((m) => m.info.id as string)).toEqual(["syn", "a2"])
  })

  test("session continue: new user prompt after marker preserved", () => {
    // After rebuild, user sends a new prompt at T=100.
    // Stream: u_new (T=100), a2 (T=20), syn (T=11), a1 (T=10), u0 (T=0).
    // Reconstructing from coveredUpTo=a1 keeps both later messages:
    // [syn, a2, u_new].
    const msgs = [
      userMsg("u0", 0),
      asstMsg("a1", 10, "stop"),
      userMsg("syn", 11, { isCheckpoint: true, coveredUpTo: "a1" }),
      asstMsg("a2", 20, "tool-calls"),
      userMsg("u_new", 100),
    ]
    const newestFirst = [...msgs].reverse()
    const result = filterCompacted(newestFirst)
    expect(result.map((m) => m.info.id as string)).toEqual(["syn", "a2", "u_new"])
  })

  test("multiple ckpts: filterCompacted picks the most recent marker", () => {
    // Two rebuilds happened. syn1 at T=11 (covers u0), syn2 at T=21 (covers a2).
    const msgs = [
      userMsg("u0", 0),
      asstMsg("a1", 10, "stop"),
      userMsg("syn1", 11, { isCheckpoint: true }),
      asstMsg("a2", 20, "stop"),
      userMsg("syn2", 21, { isCheckpoint: true, coveredUpTo: "a2" }),
      asstMsg("a3", 30, "tool-calls"),
    ]
    const newestFirst = [...msgs].reverse()
    const result = filterCompacted(newestFirst)
    // syn2 resolves coveredUpTo=a2 and supersedes the older syn1 boundary.
    expect(result.map((m) => m.info.id as string)).toEqual(["syn2", "a3"])
  })

  test("a repeated rebuild at the same watermark removes the superseded marker only", () => {
    const msgs = [
      userMsg("u0", 0),
      asstMsg("a1", 10, "stop"),
      userMsg("syn1", 11, { isCheckpoint: true, coveredUpTo: "u0" }),
      asstMsg("a2", 20, "stop"),
      userMsg("syn2", 21, { isCheckpoint: true, coveredUpTo: "u0" }),
      asstMsg("a3", 30, "tool-calls"),
    ]
    expect(filterCompacted([...msgs].reverse()).map((m) => m.info.id as string)).toEqual([
      "syn2",
      "a1",
      "a2",
      "a3",
    ])
  })
})
