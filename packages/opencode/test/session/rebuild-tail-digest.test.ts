import { afterEach, describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { Effect, Layer } from "effect"
import { ActorRegistry } from "../../src/actor/registry"
import { Bus } from "../../src/bus"
import { Config } from "../../src/config"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Memory } from "../../src/memory"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { SessionCheckpoint } from "../../src/session/checkpoint"
import { checkpointPath } from "../../src/session/checkpoint-paths"
import { MessageV2 } from "../../src/session/message-v2"
import { collapseCheckpointTail, renderTailDigest } from "../../src/session/tail-digest"
import { MODEL_VISIBLE_TEXT_CAP_BYTES } from "../../src/util/text-truncate"
import type { Provider } from "../../src/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { SessionID, MessageID, PartID } from "../../src/session/schema"
import { TaskRegistry } from "../../src/task/registry"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const sessionID = SessionID.make("session")
const providerID = ProviderID.make("test")

const itEffect = testEffect(
  Layer.mergeAll(
    CrossSpawnSpawner.defaultLayer,
    Bus.defaultLayer,
    Config.defaultLayer,
    Memory.defaultLayer,
    Session.defaultLayer,
    TaskRegistry.defaultLayer,
    ActorRegistry.defaultLayer,
    SessionCheckpoint.defaultLayer,
  ),
)

const model: Provider.Model = {
  id: ModelID.make("test-model"),
  providerID,
  api: { id: "test-model", url: "https://example.com", npm: "@ai-sdk/openai" },
  name: "Test Model",
  capabilities: {
    temperature: true,
    reasoning: false,
    attachment: false,
    toolcall: true,
    input: { text: true, audio: false, image: false, video: false, pdf: false },
    output: { text: true, audio: false, image: false, video: false, pdf: false },
    interleaved: false,
  },
  cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
  limit: { context: 0, input: 0, output: 0 },
  status: "active",
  options: {},
  headers: {},
  release_date: "2026-01-01",
}

function userInfo(id: string, created = 0): MessageV2.User {
  return {
    id,
    sessionID,
    role: "user",
    time: { created },
    agent: "user",
    model: { providerID, modelID: ModelID.make("test") },
    tools: {},
    mode: "",
  } as unknown as MessageV2.User
}

function assistantInfo(id: string, parentID: string, created = 0): MessageV2.Assistant {
  return {
    id,
    sessionID,
    role: "assistant",
    time: { created },
    parentID,
    modelID: model.api.id,
    providerID: model.providerID,
    mode: "build",
    agent: "build",
    path: { cwd: "/", root: "/" },
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  } as unknown as MessageV2.Assistant
}

function basePart(messageID: string, id: string) {
  return {
    id: PartID.make(id),
    sessionID,
    messageID: MessageID.make(messageID),
  }
}

function textPart(messageID: string, id: string, text: string, extra?: Record<string, unknown>) {
  return { ...basePart(messageID, id), type: "text" as const, text, ...extra } as MessageV2.Part
}

function toolPart(
  messageID: string,
  id: string,
  tool: string,
  input: Record<string, unknown>,
  state: MessageV2.ToolPart["state"],
) {
  return {
    ...basePart(messageID, id),
    type: "tool" as const,
    callID: `call-${id}`,
    tool,
    state,
  } as MessageV2.Part
}

function completedTool(messageID: string, id: string, tool: string, input: Record<string, unknown>, output = "BODY") {
  return toolPart(messageID, id, tool, input, {
    status: "completed",
    input,
    output,
    title: tool,
    metadata: {},
    time: { start: 0, end: 1 },
  })
}

function pendingTool(messageID: string, id: string, tool: string, input: Record<string, unknown>) {
  return toolPart(messageID, id, tool, input, {
    status: "pending",
    input,
    raw: "",
  })
}

/**
 * Boundary as insertRebuildBoundary writes it: checkpoint part + rebuild
 * context (incl. Recent activity). IDs must be lexically ordered like real
 * MessageIDs: covered < digestUpTo < boundary id.
 */
function boundaryUser(
  id: string,
  digestUpTo?: string,
  activityLines?: string[],
  coveredUpTo = "msg_01",
): MessageV2.WithParts {
  const activity = activityLines?.length
    ? `\n# Recent activity\n\n${activityLines.join("\n")}\n`
    : ""
  return {
    info: userInfo(id),
    parts: [
      {
        ...basePart(id, `${id}-cp`),
        type: "checkpoint",
        checkpointDir: "",
        checkpointNumber: 0,
        coveredUpTo: MessageID.make(coveredUpTo),
        ...(digestUpTo ? { digestUpTo: MessageID.make(digestUpTo) } : {}),
      } as MessageV2.Part,
      textPart(
        id,
        `${id}-text`,
        `# Session checkpoint\n\nprior summary${activity}\nThis session is continued from a checkpoint.`,
        { synthetic: true },
      ),
    ],
  }
}

function digestTextOf(msg: MessageV2.WithParts): string {
  return msg.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n")
}

describe("renderTailDigest", () => {
  test("caps a multibyte activity digest while retaining its oldest and newest evidence", () => {
    const text = renderTailDigest(
      Array.from({ length: 200 }, (_, index) => {
        const id = "a-cap-" + index.toString().padStart(3, "0")
        return {
          info: assistantInfo(id, "u1"),
          parts: [
            textPart(
              id,
              "p-cap-" + index,
              (index === 0 ? "DIGEST_HEAD_" : index === 199 ? "DIGEST_TAIL_" : "") + "界".repeat(300),
            ),
          ],
        }
      }),
    )

    expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(MODEL_VISIBLE_TEXT_CAP_BYTES)
    expect(text).toContain("# Recent activity")
    expect(text).toContain("DIGEST_HEAD")
    expect(text).toContain("DIGEST_TAIL")
    expect(text).toContain("checkpoint tail digest truncated before model injection")
    expect(text).not.toContain("\uFFFD")
  })

  test("lists tool name+args only", () => {
    const text = renderTailDigest([
      {
        info: assistantInfo("a1", "u1"),
        parts: [
          completedTool("a1", "p1", "read", { path: "src/session/prompt.ts" }, "HUGE_FILE_BODY"),
          textPart("a1", "p2", "looks fine"),
          textPart("a1", "p3", "Skills available in this session", { synthetic: true }),
        ],
      },
    ])
    expect(text).toContain("# Recent activity")
    expect(text).toContain('- read(path="src/session/prompt.ts")')
    expect(text).not.toContain("result omitted")
    expect(text).not.toContain("HUGE_FILE_BODY")
    expect(text).not.toContain("Skills available")
    expect(text).toContain("- assistant: looks fine")
  })

  test("flags an interrupted tool loop", () => {
    const text = renderTailDigest([
      {
        info: assistantInfo("a1", "u1"),
        parts: [pendingTool("a1", "p1", "bash", { command: "bun test" })],
      },
    ])
    expect(text).toContain("interrupted")
    expect(text).not.toContain("Do not invent")
  })

  test("skips prior checkpoint/compaction boundaries so a second rebuild cannot echo itself", () => {
    const text = renderTailDigest([
      boundaryUser("m-cp", "a1", ['- read(path="old.ts")']),
      {
        info: assistantInfo("a1", "u1"),
        parts: [completedTool("a1", "p1", "read", { path: "new.ts" }, "BODY")],
      },
    ])
    expect(text).toContain('read(path="new.ts")')
    expect(text).not.toContain("prior summary")
    expect(text).not.toContain("read(path=\"old.ts\")")
  })
})

describe("collapseCheckpointTail", () => {
  test("drops the pre-insert tail; boundary already carries the activity section", () => {
    const collapsed = collapseCheckpointTail([
      boundaryUser("msg_cp", "msg_02", ['- read(path="x.ts")']),
      {
        info: assistantInfo("msg_02", "msg_u1", 10),
        parts: [completedTool("msg_02", "p1", "grep", { pattern: "rebuild" }, "MATCHES")],
      },
    ])

    expect(collapsed).toHaveLength(1)
    expect(String(collapsed[0]!.info.id)).toBe("msg_cp")
    const text = digestTextOf(collapsed[0]!)
    expect(text).toContain("# Recent activity")
    expect(text).not.toContain("MATCHES")
  })

  test("keeps post-insert messages live", () => {
    const collapsed = collapseCheckpointTail([
      boundaryUser("msg_cp", "msg_02", ['- read(path="a.ts")']),
      {
        info: assistantInfo("msg_02", "msg_u1", 10),
        parts: [completedTool("msg_02", "p1", "read", { path: "a.ts" }, "PRE_REBUILD_BODY")],
      },
      {
        info: assistantInfo("msg_03", "msg_u1", 20),
        parts: [completedTool("msg_03", "p2", "read", { path: "b.ts" }, "POST_REBUILD_BODY")],
      },
    ])

    expect(collapsed).toHaveLength(2)
    expect(String(collapsed[0]!.info.id)).toBe("msg_cp")
    expect(String(collapsed[1]!.info.id)).toBe("msg_03")
    expect(collapsed[1]!.parts.some((p) => p.type === "tool" && p.state.status === "completed")).toBe(true)
  })

  test("collapses a same-ms tail message that sorts before the boundary's synthetic time", () => {
    // Production stamps the boundary at watermark+1ms, so a tail message
    // sharing the watermark's millisecond sorts BEFORE the boundary. A full
    // history still carries the exact covered row, which anchors the range.
    const collapsed = collapseCheckpointTail([
      { info: userInfo("msg_01", 9), parts: [textPart("msg_01", "u1", "covered")] },
      {
        info: assistantInfo("msg_02", "msg_u1", 10),
        parts: [completedTool("msg_02", "p1", "read", { path: "same-ms.ts" }, "SAME_MS_BODY")],
      },
      boundaryUser("msg_cp", "msg_02", ['- read(path="same-ms.ts")']),
    ])
    expect(collapsed).toHaveLength(2)
    expect(collapsed.map((message) => String(message.info.id))).toEqual(["msg_01", "msg_cp"])
    expect(collapsed.map(digestTextOf).join("\n")).not.toContain("SAME_MS_BODY")
  })

  test("collapses an assistant before a late old-ID digest user by position", () => {
    const collapsed = collapseCheckpointTail([
      boundaryUser("msg_cp", "msg_old_user", ["- assistant: compact me"]),
      {
        info: assistantInfo("msg_zz_tail", "msg_u1", 10),
        parts: [textPart("msg_zz_tail", "p1", "COMPACTED_ASSISTANT")],
      },
      { info: userInfo("msg_old_user", 20), parts: [textPart("msg_old_user", "u1", "late caller request")] },
      {
        info: assistantInfo("msg_post", "msg_old_user", 30),
        parts: [textPart("msg_post", "p2", "POST_DIGEST_ASSISTANT")],
      },
    ])

    expect(collapsed.map((message) => String(message.info.id))).toEqual(["msg_cp", "msg_old_user", "msg_post"])
    expect(collapsed.map(digestTextOf).join("\n")).not.toContain("COMPACTED_ASSISTANT")
    expect(collapsed.map(digestTextOf).join("\n")).toContain("POST_DIGEST_ASSISTANT")
  })

  test("fails closed when the digest endpoint is absent", () => {
    const msgs: MessageV2.WithParts[] = [
      boundaryUser("msg_cp", "msg_missing"),
      {
        info: assistantInfo("msg_live", "msg_u1", 10),
        parts: [textPart("msg_live", "p1", "LIVE_BODY")],
      },
    ]

    expect(collapseCheckpointTail(msgs)).toBe(msgs)
  })

  test("never drops a user-role message, even without real prose", () => {
    // insertReminders persists skill-catalog / auto-worktree gates on the
    // last user message. A file-only or synthetic-only user turn must stay
    // live or the gate says "already sent" while the provider never sees it.
    const collapsed = collapseCheckpointTail([
      boundaryUser("msg_cp", "msg_03", ['- read(path="a.ts")']),
      {
        info: userInfo("msg_03", 10),
        parts: [
          {
            ...basePart("msg_03", "u-file-f"),
            type: "file" as const,
            mime: "image/png",
            filename: "shot.png",
            url: "data:image/png;base64,x",
          } as MessageV2.Part,
          textPart("msg_03", "u-file-gate", "Authoritative skills catalog snapshot v2:", {
            synthetic: true,
          }),
        ],
      },
    ])

    expect(collapsed).toHaveLength(2)
    expect(String(collapsed[1]!.info.id)).toBe("msg_03")
    expect(collapsed[1]!.parts.some((p) => p.type === "text" && p.synthetic)).toBe(true)
  })

  test("legacy boundary without digestUpTo is left verbatim", () => {
    const msgs: MessageV2.WithParts[] = [
      boundaryUser("m-cp"),
      {
        info: assistantInfo("a1", "u0", 10),
        parts: [completedTool("a1", "p1", "read", { path: "a.ts" }, "BODY")],
      },
    ]
    expect(collapseCheckpointTail(msgs)).toBe(msgs)
  })

  test("returns input unchanged when there is no checkpoint boundary", () => {
    const msgs: MessageV2.WithParts[] = [
      {
        info: userInfo("u1"),
        parts: [textPart("u1", "p1", "hello")],
      },
    ]
    expect(collapseCheckpointTail(msgs)).toBe(msgs)
  })
})

describe("toModelMessages with collapseCheckpointTail", () => {
  test("one user turn holds checkpoint + activity; no hollow tool pairs from the tail", async () => {
    const messages = await MessageV2.toModelMessages(
      [
        boundaryUser("msg_cp", "msg_02", ['- read(path="src/session/prompt.ts")']),
        {
          info: assistantInfo("msg_02", "msg_u0", 10),
          parts: [completedTool("msg_02", "p1", "read", { path: "src/session/prompt.ts" }, "HUGE_FILE_BODY")],
        },
      ],
      model,
      { collapseCheckpointTail: true },
    )

    expect(messages).toHaveLength(1)
    expect(messages[0]!.role).toBe("user")
    const rendered = JSON.stringify(messages)
    expect(rendered).toContain("Summary of previous conversation from checkpoint files:")
    expect(rendered).toContain("# Recent activity")
    expect(rendered).not.toContain("HUGE_FILE_BODY")
    expect(rendered).not.toContain("tool-call")
  })

  test("post-insert tools stay live next to the collapsed boundary", async () => {
    const messages = await MessageV2.toModelMessages(
      [
        boundaryUser("msg_cp", "msg_02", ['- read(path="pre.ts")']),
        {
          info: assistantInfo("msg_02", "msg_u0", 10),
          parts: [completedTool("msg_02", "p1", "read", { path: "pre.ts" }, "PRE_BODY")],
        },
        {
          info: assistantInfo("msg_03", "msg_u0", 20),
          parts: [completedTool("msg_03", "p2", "read", { path: "post.ts" }, "POST_BODY")],
        },
      ],
      model,
      { collapseCheckpointTail: true },
    )

    const rendered = JSON.stringify(messages)
    expect(rendered).toContain("# Recent activity")
    expect(rendered).not.toContain("PRE_BODY")
    expect(rendered).toContain("POST_BODY")
    expect(rendered).toContain("tool-call")
  })

  test("leaves the tail verbatim when the option is off (writers / compaction)", async () => {
    const input: MessageV2.WithParts[] = [
      {
        info: assistantInfo("msg_02", "msg_u0", 10),
        parts: [completedTool("msg_02", "p1", "read", { path: "src/session/prompt.ts" }, "HUGE_FILE_BODY")],
      },
      boundaryUser("msg_cp", "msg_02"),
    ]
    const messages = await MessageV2.toModelMessages(input, model)
    const rendered = JSON.stringify(messages)
    expect(rendered).toContain("tool-call")
    expect(rendered).toContain("HUGE_FILE_BODY")
  })
})

describe("SessionCheckpoint.renderRebuildContext", () => {
  afterEach(async () => {
    await Instance.disposeAll()
  })

  itEffect.live(
    "slices recent activity by chronological positions when the boundary ID is older than prior history",
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const session = yield* Session.Service
          const checkpoint = yield* SessionCheckpoint.Service
          const info = yield* session.create({ title: "chronological recent activity" })

          yield* Effect.promise(async () => {
            await fs.mkdir(path.dirname(checkpointPath(info.id)), { recursive: true })
            await Bun.write(checkpointPath(info.id), "# Session checkpoint\n\nChronological range fixture.\n")
          })

          const boundaryID = MessageID.make("msg_000_boundary")
          yield* Effect.forEach(
            Array.from({ length: 201 }, (_, index) => index),
            (index) =>
              Effect.gen(function* () {
                const id = MessageID.make(`msg_z_prior_${index.toString().padStart(3, "0")}`)
                yield* session.updateMessage({ ...assistantInfo(id, "msg_parent", index + 1), sessionID: info.id })
                yield* session.updatePart({
                  ...textPart(id, PartID.ascending(), `PRIOR_SHOULD_NOT_APPEAR_${index.toString().padStart(3, "0")}`),
                  sessionID: info.id,
                })
              }),
            { concurrency: 1 },
          )

          yield* session.updateMessage({ ...userInfo(boundaryID, 1_000), sessionID: info.id })

          const tailID = MessageID.make("msg_zz_tail_sentinel")
          yield* session.updateMessage({ ...assistantInfo(tailID, boundaryID, 1_001), sessionID: info.id })
          yield* session.updatePart({
            ...textPart(tailID, PartID.ascending(), "TAIL_SENTINEL"),
            sessionID: info.id,
          })

          const all = yield* session.messages({ sessionID: info.id })
          expect(all).toHaveLength(203)
          expect(all.at(-2)?.info.id).toBe(boundaryID)
          expect(all.at(-1)?.info.id).toBe(tailID)

          const rendered = yield* checkpoint.renderRebuildContext(info.id, {
            boundary: boundaryID,
            digestUpTo: tailID,
          })

          expect(rendered.hasActivity).toBe(true)
          expect(rendered.text).toContain("TAIL_SENTINEL")
          expect(rendered.text).not.toContain("PRIOR_SHOULD_NOT_APPEAR")
        }),
      { outsideGit: true, config: { checkpoint: { push_caps: { recent_user: 0 } } } },
    ),
  )
})
