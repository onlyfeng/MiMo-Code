import z from "zod"
import { Effect, Layer, Context } from "effect"
import { Bus } from "@/bus"
import { Snapshot } from "@/snapshot"
import { Database, Storage, and, asc, desc, eq, gte, sql } from "@/storage"
import * as Session from "./session"
import { MessageV2 } from "./message-v2"
import { MessageTable, PartTable } from "./session.sql"
import { SessionID, MessageID } from "./schema"

function unquoteGitPath(input: string) {
  if (!input.startsWith('"')) return input
  if (!input.endsWith('"')) return input
  const body = input.slice(1, -1)
  const bytes: number[] = []

  for (let i = 0; i < body.length; i++) {
    const char = body[i]!
    if (char !== "\\") {
      bytes.push(char.charCodeAt(0))
      continue
    }

    const next = body[i + 1]
    if (!next) {
      bytes.push("\\".charCodeAt(0))
      continue
    }

    if (next >= "0" && next <= "7") {
      const chunk = body.slice(i + 1, i + 4)
      const match = chunk.match(/^[0-7]{1,3}/)
      if (!match) {
        bytes.push(next.charCodeAt(0))
        i++
        continue
      }
      bytes.push(parseInt(match[0], 8))
      i += match[0].length
      continue
    }

    const escaped =
      next === "n"
        ? "\n"
        : next === "r"
          ? "\r"
          : next === "t"
            ? "\t"
            : next === "b"
              ? "\b"
              : next === "f"
                ? "\f"
                : next === "v"
                  ? "\v"
                  : next === "\\" || next === '"'
                    ? next
                    : undefined

    bytes.push((escaped ?? next).charCodeAt(0))
    i++
  }

  return Buffer.from(bytes).toString()
}

export interface Interface {
  readonly summarize: (input: { sessionID: SessionID; messageID: MessageID }) => Effect.Effect<void>
  readonly diff: (input: { sessionID: SessionID; messageID?: MessageID }) => Effect.Effect<Snapshot.FileDiff[]>
  readonly computeDiff: (input: { messages: MessageV2.WithParts[] }) => Effect.Effect<Snapshot.FileDiff[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SessionSummary") {}

/**
 * A snapshot that bounds a summary diff, read from the part table: the first
 * step-start or the last step-finish carrying a snapshot in the main slice,
 * optionally narrowed to the assistants answering one user message. Rows are
 * ordered as `Session.messages` orders them — (time_created, id), then part id —
 * so this picks the same snapshot `computeDiff` picks from the hydrated slice,
 * without hydrating it.
 */
function anchor(input: {
  sessionID: SessionID
  type: "step-start" | "step-finish"
  order: "first" | "last"
  turn?: { userID: MessageID; created: number }
}): string | undefined {
  const dir = input.order === "first" ? asc : desc
  const row = Database.use((db) =>
    db
      .select({ snapshot: sql<string | null>`json_extract(${PartTable.data}, '$.snapshot')` })
      .from(PartTable)
      .innerJoin(MessageTable, eq(MessageTable.id, PartTable.message_id))
      .where(
        and(
          eq(MessageTable.session_id, input.sessionID),
          eq(MessageTable.agent_id, "main"),
          // An answer is created after the message it answers; the bound keeps
          // the scan on the turn instead of the session's whole history.
          input.turn ? gte(MessageTable.time_created, input.turn.created) : undefined,
          input.turn ? sql`json_extract(${MessageTable.data}, '$.parentID') = ${input.turn.userID}` : undefined,
          sql`json_extract(${PartTable.data}, '$.type') = ${input.type}`,
          sql`coalesce(json_extract(${PartTable.data}, '$.snapshot'), '') <> ''`,
        ),
      )
      .orderBy(dir(MessageTable.time_created), dir(MessageTable.id), dir(PartTable.id))
      .limit(1)
      .get(),
  )
  const snapshot: string | undefined = row?.snapshot ?? undefined
  return snapshot
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const sessions = yield* Session.Service
    const snapshot = yield* Snapshot.Service
    const storage = yield* Storage.Service
    const bus = yield* Bus.Service

    const computeDiff = Effect.fn("SessionSummary.computeDiff")(function* (input: { messages: MessageV2.WithParts[] }) {
      let from: string | undefined
      let to: string | undefined
      for (const item of input.messages) {
        if (!from) {
          for (const part of item.parts) {
            if (part.type === "step-start" && part.snapshot) {
              from = part.snapshot
              break
            }
          }
        }
        for (const part of item.parts) {
          if (part.type === "step-finish" && part.snapshot) to = part.snapshot
        }
      }
      if (from && to) return yield* snapshot.diffFull(from, to)
      return []
    })

    const rangeDiff = (from: string | undefined, to: string | undefined) =>
      from && to ? snapshot.diffFull(from, to) : Effect.succeed<Snapshot.FileDiff[]>([])

    // Every step finish summarizes, and used to hydrate the session's whole main
    // slice to find two snapshot hashes. On a long-lived session that was ~0.5 GB
    // of messages per step; the anchors now come from the part table.
    const summarizeSession = Effect.fnUntraced(function* (sessionID: SessionID) {
      const any = yield* Effect.sync(() =>
        Database.use((db) =>
          db
            .select({ id: MessageTable.id })
            .from(MessageTable)
            .where(and(eq(MessageTable.session_id, sessionID), eq(MessageTable.agent_id, "main")))
            .limit(1)
            .get(),
        ),
      )
      if (!any) return false

      const diffs = yield* rangeDiff(
        anchor({ sessionID, type: "step-start", order: "first" }),
        anchor({ sessionID, type: "step-finish", order: "last" }),
      )
      yield* sessions.setSummary({
        sessionID,
        summary: {
          additions: diffs.reduce((sum, x) => sum + x.additions, 0),
          deletions: diffs.reduce((sum, x) => sum + x.deletions, 0),
          files: diffs.length,
        },
      })
      yield* storage.write(["session_diff", sessionID], diffs).pipe(Effect.ignore)
      yield* bus.publish(Session.Event.Diff, { sessionID, diff: diffs })
      return true
    })

    const summarizeTurn = Effect.fnUntraced(function* (sessionID: SessionID, messageID: MessageID) {
      const target = yield* Effect.sync(() =>
        Database.use((db) =>
          db
            .select({
              created: MessageTable.time_created,
              role: sql<string>`json_extract(${MessageTable.data}, '$.role')`,
            })
            .from(MessageTable)
            .where(
              and(
                eq(MessageTable.id, messageID),
                eq(MessageTable.session_id, sessionID),
                eq(MessageTable.agent_id, "main"),
              ),
            )
            .get(),
        ),
      )
      if (!target || target.role !== "user") return
      const turn = { userID: messageID, created: target.created }
      const msgDiffs = yield* rangeDiff(
        anchor({ sessionID, type: "step-start", order: "first", turn }),
        anchor({ sessionID, type: "step-finish", order: "last", turn }),
      )
      yield* sessions.patchMessageMetadata({
        sessionID,
        messageID,
        summaryDiffs: msgDiffs,
      })
    })

    // One summary per session at a time. A step finish forks a summary while the
    // previous one may still be diffing under the snapshot lock, which the next
    // step's snapshot waits on. A request that arrives meanwhile joins one more
    // pass after the running one instead of running beside it.
    const queued = new Map<SessionID, Set<MessageID>>()

    const summarize = Effect.fn("SessionSummary.summarize")(function* (input: {
      sessionID: SessionID
      messageID: MessageID
    }) {
      const waiting = queued.get(input.sessionID)
      if (waiting) {
        waiting.add(input.messageID)
        return
      }
      const pending = new Set([input.messageID])
      queued.set(input.sessionID, pending)
      yield* Effect.gen(function* () {
        while (pending.size > 0) {
          const messageIDs = [...pending]
          pending.clear()
          if (!(yield* summarizeSession(input.sessionID))) return
          for (const messageID of messageIDs) yield* summarizeTurn(input.sessionID, messageID)
        }
      }).pipe(Effect.ensuring(Effect.sync(() => queued.delete(input.sessionID))))
    })

    const diff = Effect.fn("SessionSummary.diff")(function* (input: { sessionID: SessionID; messageID?: MessageID }) {
      if (input.messageID) {
        const all = yield* sessions.messages({ sessionID: input.sessionID, agentID: "*" })
        const target = all.find((item) => item.info.id === input.messageID)
        if (!target || target.info.role !== "user") return []
        const diffs =
          target.info.summary?.diffs ??
          (yield* computeDiff({
            messages: all.filter(
              (item) =>
                item.info.id === input.messageID ||
                (item.info.role === "assistant" && item.info.parentID === input.messageID),
            ),
          }))
        return diffs.map((item) => ({ ...item, file: unquoteGitPath(item.file) }))
      }
      const diffs = yield* storage
        .read<Snapshot.FileDiff[]>(["session_diff", input.sessionID])
        .pipe(Effect.catch(() => Effect.succeed([] as Snapshot.FileDiff[])))
      const next = diffs.map((item) => {
        const file = unquoteGitPath(item.file)
        if (file === item.file) return item
        return { ...item, file }
      })
      const changed = next.some((item, i) => item.file !== diffs[i]?.file)
      if (changed) yield* storage.write(["session_diff", input.sessionID], next).pipe(Effect.ignore)
      return next
    })

    return Service.of({ summarize, diff, computeDiff })
  }),
)

export const defaultLayer = Layer.suspend(() =>
  layer.pipe(
    Layer.provide(Session.defaultLayer),
    Layer.provide(Snapshot.defaultLayer),
    Layer.provide(Storage.defaultLayer),
    Layer.provide(Bus.layer),
  ),
)

export const DiffInput = z.object({
  sessionID: SessionID.zod,
  messageID: MessageID.zod.optional(),
})

export * as SessionSummary from "./summary"
