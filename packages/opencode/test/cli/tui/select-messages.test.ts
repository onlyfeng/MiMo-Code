import { describe, test, expect } from "bun:test"
import {
  bucketMessages,
  compareMessageOrder,
  loadMessagesThroughRevertBoundary,
  messageIndex,
  messageInsertIndex,
  messagesAfter,
  messagesBefore,
  messagesFrom,
  removeMessageByID,
  revertRedoAction,
  revertView,
  selectMessages,
  upsertChronologicalMessage,
} from "../../../src/cli/cmd/tui/context/sync"

const msg = (
  id: string,
  agentID?: string,
  created = Number(id.replace(/\D/g, "")),
  role: "user" | "assistant" = "user",
) =>
  ({
    id,
    agentID,
    time: { created },
    role,
  }) as any

const page = <M>(data: M[], cursor?: string) => ({
  data,
  response: new Response(undefined, {
    headers: cursor ? { "X-Next-Cursor": cursor } : undefined,
  }),
})

describe("selectMessages", () => {
  test("renders the main bucket for a normal session", () => {
    const buckets = bucketMessages([msg("m1"), msg("m2", "explore-1")])
    expect(selectMessages(buckets, "main", "ses_root")).toEqual([msg("m1")])
  })

  test("renders the requested subagent bucket when the route carries an agentID", () => {
    const buckets = bucketMessages([msg("m1"), msg("m2", "explore-1")])
    expect(selectMessages(buckets, "explore-1", "ses_root")).toEqual([msg("m2", "explore-1")])
  })

  test("falls back to the self-id bucket for a peer child (spawn.ts)", () => {
    const buckets = bucketMessages([msg("m1", "ses_peer"), msg("m2", "ses_peer")])
    expect(selectMessages(buckets, "main", "ses_peer")).toEqual([msg("m1", "ses_peer"), msg("m2", "ses_peer")])
  })

  // REWRITTEN TWICE — read the history before touching these, they have flipped
  // once already.
  //
  // Originally they asserted that an actor-bucketed session renders (the
  // blank-transcript fix). A later commit on this same branch INVERTED them to
  // `toEqual([])` and deleted the fallback, on the reasoning that arm 4's only
  // population was internal machinery which the new render prohibition made
  // unreachable anyway.
  //
  // That reasoning has been narrowed and these are back to asserting rendering.
  // The prohibition no longer keys on "not a peer child" but on the session
  // hosting a RUNTIME-spawned agent (session/visibility.ts →
  // SYSTEM_SPAWNED_AGENT_TYPES). Measured on the live DB, the 1313 sessions this
  // arm serves are 1302 checkpoint-writer hosts — still refused, upstream at the
  // route, before the selector ever runs — plus 11 `session ask` fork-query hosts
  // (buckets build-1 ×7, compose-1 ×3, general-1 ×1) which are model-spawned
  // read-only transcripts the product does display. Those 11 are precisely the
  // blank pane #1964 was opened to fix, so the arm is load-bearing again.
  //
  // The inversion that makes it safe: machinery is refused BEFORE bucket
  // selection, so this fallback can no longer be what renders a checkpoint-writer
  // transcript.
  test("renders an actor-hosted session whose only bucket is its actor id", () => {
    const buckets = bucketMessages([msg("m1", "build-1"), msg("m2", "build-1"), msg("m3", "build-1")])
    expect(selectMessages(buckets, "main", "ses_askfork")).toEqual([
      msg("m1", "build-1"),
      msg("m2", "build-1"),
      msg("m3", "build-1"),
    ])
  })

  test("picks the newest bucket when an empty-main session has several actor buckets", () => {
    const buckets = bucketMessages([msg("m1", "general-1"), msg("m9", "general-2")])
    expect(selectMessages(buckets, "main", "ses_actorhost")).toEqual([msg("m9", "general-2")])
  })

  test("picks the newest bucket by chronological order when its last ID is older", () => {
    const buckets = bucketMessages([msg("m9", "general-1", 1), msg("m1", "general-2", 2)])
    expect(selectMessages(buckets, "main", "ses_actorhost")).toEqual([msg("m1", "general-2", 2)])
  })

  // The self-id bucket must still win over a newer actor bucket: a peer child that
  // spawned subagents has both, and its own conversation is what to show.
  test("prefers the peer self-id bucket over a newer actor bucket", () => {
    const buckets = bucketMessages([msg("m1", "ses_peer"), msg("m9", "explore-1")])
    expect(selectMessages(buckets, "main", "ses_peer")).toEqual([msg("m1", "ses_peer")])
  })

  test("an explicit agentID still reaches an actor bucket (subagent dialog is unaffected)", () => {
    const buckets = bucketMessages([msg("m1", "checkpoint-writer-1")])
    expect(selectMessages(buckets, "checkpoint-writer-1", "ses_actorhost")).toEqual([msg("m1", "checkpoint-writer-1")])
  })

  test("stays empty when the session genuinely has no messages", () => {
    expect(selectMessages(undefined, "main", "ses_new")).toEqual([])
    expect(selectMessages({}, "main", "ses_new")).toEqual([])
  })
})

describe("message chronology helpers", () => {
  test("inserts an older caller ID after an earlier timestamp and still finds it by equality", () => {
    const messages = [msg("m9", undefined, 1)]
    const late = msg("m1", undefined, 2)
    expect(messageInsertIndex(messages, late)).toBe(1)
    messages.splice(messageInsertIndex(messages, late), 0, late)
    expect(messageIndex(messages, "m1")).toBe(1)
  })

  test("slices undo and redo ranges by boundary position instead of ID magnitude", () => {
    const earlier = msg("m9", undefined, 1)
    const boundary = msg("m1", undefined, 2)
    const later = msg("m8", undefined, 3)
    const messages = [earlier, boundary, later]
    expect(messagesBefore(messages, boundary.id)).toEqual([earlier])
    expect(messagesFrom(messages, boundary.id)).toEqual([boundary, later])
    expect(messagesAfter(messages, boundary.id)).toEqual([later])
  })

  test("keeps the newest low-ID update, evicts the chronological oldest, and removes only the requested ID", () => {
    const history = Array.from({ length: 100 }, (_, index) =>
      msg(`msg_${String(9000 + index).padStart(4, "0")}`, undefined, index + 1),
    )
    const newest = msg("msg_0001", undefined, 101)
    const upserted = upsertChronologicalMessage(history, newest)

    expect(upserted.messages).toHaveLength(100)
    expect(upserted.messages.at(-1)).toEqual(newest)
    expect(upserted.removed?.id).toBe("msg_9000")

    const removed = removeMessageByID(upserted.messages, "msg_9050")
    expect(removed.removed?.id).toBe("msg_9050")
    expect(removed.messages.some((message) => message.id === "msg_9050")).toBe(false)
    expect(removed.messages.some((message) => message.id === newest.id)).toBe(true)
    expect(removed.messages).toHaveLength(99)
  })

  test("orders equal-time Unicode IDs like SQLite UTF-8 BINARY", () => {
    const earlier = msg("msg_\uE000", undefined, 1)
    const later = msg("msg_\u{10000}", undefined, 1)

    expect(compareMessageOrder(earlier, later)).toBeLessThan(0)
    expect(upsertChronologicalMessage([later], earlier).messages).toEqual([earlier, later])
  })
})

describe("revertView", () => {
  test("projects a same-bucket boundary by global chronology", () => {
    const current = [
      msg("u9", undefined, 1),
      msg("a8", undefined, 2, "assistant"),
      msg("u1", undefined, 3),
      msg("a7", undefined, 4, "assistant"),
      msg("u6", undefined, 5),
    ]
    const view = revertView(bucketMessages(current), current, "u1")

    expect(view.found).toBe(true)
    expect(view.before.map((message) => message.id)).toEqual(["u9", "a8"])
    expect(view.from.map((message) => message.id)).toEqual(["u1", "a7", "u6"])
    expect(view.after.map((message) => message.id)).toEqual(["a7", "u6"])
    expect(view.globalAfter.map((message) => message.id)).toEqual(["a7", "u6"])
    expect(view.before.findLast((message) => message.role === "assistant")?.id).toBe("a8")
    expect(view.from.filter((message) => message.role === "user").map((message) => message.id)).toEqual(["u1", "u6"])
    expect(revertRedoAction(view)).toEqual({ type: "revert", messageID: "u6" })
  })

  test("locates a main boundary globally before projecting onto an actor bucket", () => {
    const all = [
      msg("u9", undefined, 1),
      msg("a8", "build-1", 2, "assistant"),
      msg("u1", undefined, 3),
      msg("a7", "build-1", 4, "assistant"),
      msg("u6", undefined, 5),
    ]
    const buckets = bucketMessages(all)
    const view = revertView(buckets, buckets["build-1"], "u1")

    expect(view.found).toBe(true)
    expect(view.before.map((message) => message.id)).toEqual(["a8"])
    expect(view.from.map((message) => message.id)).toEqual(["a7"])
    expect(view.after.map((message) => message.id)).toEqual(["a7"])
    expect(view.globalAfter.map((message) => message.id)).toEqual(["a7", "u6"])
    expect(revertRedoAction(view)).toEqual({ type: "revert", messageID: "u6" })
  })

  test("fails closed when the global boundary is absent", () => {
    const current = [msg("u9", undefined, 1), msg("a8", undefined, 2, "assistant")]
    const view = revertView(bucketMessages(current), current, "u1")

    expect(view.found).toBe(false)
    expect(view.before).toEqual([])
    expect(view.from).toEqual(current)
    expect(view.after).toEqual([])
    expect(revertRedoAction(view)).toEqual({ type: "blocked" })
  })
})

describe("revert boundary pagination", () => {
  test("follows X-Next-Cursor until the boundary page is loaded", async () => {
    const cursors: string[] = []
    const loaded = await loadMessagesThroughRevertBoundary(
      page([msg("u9", undefined, 9)], "cursor-1"),
      "u1",
      async (cursor) => {
        cursors.push(cursor)
        if (cursor === "cursor-1") return page([msg("u8", undefined, 8)], "cursor-2")
        return page([msg("u1", undefined, 1)], "unused-cursor")
      },
    )

    expect(cursors).toEqual(["cursor-1", "cursor-2"])
    expect(loaded.found).toBe(true)
    expect(loaded.messages.map((message) => message.id)).toEqual(["u1", "u8", "u9"])
  })

  test("reports a missing boundary after the older pages are exhausted", async () => {
    const loaded = await loadMessagesThroughRevertBoundary(
      page([msg("u9", undefined, 9)], "cursor-1"),
      "missing",
      async () => page([msg("u8", undefined, 8)]),
    )

    expect(loaded.found).toBe(false)
    expect(loaded.messages.map((message) => message.id)).toEqual(["u8", "u9"])
    expect(revertRedoAction(revertView(bucketMessages(loaded.messages), loaded.messages, "missing"))).toEqual({
      type: "blocked",
    })
  })

  test("stops when a server repeats the same cursor", async () => {
    let calls = 0
    const loaded = await loadMessagesThroughRevertBoundary(
      page([msg("u9", undefined, 9)], "cursor-1"),
      "missing",
      async () => {
        calls++
        if (calls > 1) throw new Error("repeated cursor was requested twice")
        return page([msg("u8", undefined, 8)], "cursor-1")
      },
    )

    expect(calls).toBe(1)
    expect(loaded.found).toBe(false)
    expect(loaded.messages.map((message) => message.id)).toEqual(["u8", "u9"])
  })
})
