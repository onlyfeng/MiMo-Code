import z from "zod"
import { Effect, Layer, Context, Semaphore } from "effect"
import { Bus } from "../bus"
import { Snapshot } from "../snapshot"
import { Storage } from "@/storage"
import { SyncEvent } from "../sync"
import { Log } from "../util"
import * as Session from "./session"
import { MessageV2 } from "./message-v2"
import { SessionID, MessageID, PartID } from "./schema"
import { SessionRunState } from "./run-state"
import { SessionSummary } from "./summary"

const log = Log.create({ service: "session.revert" })

// FC-051: a revert and a prompt's admission exclude each other per session. A
// prompt admitted while a revert was still restoring files saw no revert to
// commit and started its turn; the revert then marked the session reverted to a
// point before that turn, so the TUI hid everything the turn did and the next
// prompt's cleanup deleted it. Admissions share the gate; a revert or unrevert
// takes all of it.
const WHOLE = 1 << 20
const gates = new Map<SessionID, Semaphore.Semaphore>()
const gate = (sessionID: SessionID) => {
  const hit = gates.get(sessionID)
  if (hit) return hit
  const next = Semaphore.makeUnsafe(WHOLE)
  gates.set(sessionID, next)
  return next
}

/** Runs a prompt admission: alongside other admissions, never during a revert or unrevert of the session. */
export const admission =
  (sessionID: SessionID) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    gate(sessionID).withPermits(1)(effect)

/** Runs `effect` with the session to itself: no admission, revert or unrevert alongside. */
export const exclusive =
  (sessionID: SessionID) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    gate(sessionID).withPermits(WHOLE)(effect)

export const RevertInput = z.object({
  sessionID: SessionID.zod,
  messageID: MessageID.zod,
  partID: PartID.zod.optional(),
})
export type RevertInput = z.infer<typeof RevertInput>

export interface Interface {
  readonly revert: (input: RevertInput) => Effect.Effect<Session.Info, Session.BusyError>
  readonly unrevert: (input: { sessionID: SessionID }) => Effect.Effect<Session.Info, Session.BusyError>
  readonly cleanup: (session: Session.Info) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SessionRevert") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const sessions = yield* Session.Service
    const snap = yield* Snapshot.Service
    const storage = yield* Storage.Service
    const bus = yield* Bus.Service
    const summary = yield* SessionSummary.Service
    const state = yield* SessionRunState.Service

    // FC-035: put back only the files a revert changed, so edits other processes
    // made since then in a shared worktree survive. A revert recorded before
    // `files` existed restores the whole snapshot.
    const restore = Effect.fnUntraced(function* (revert: NonNullable<Session.Info["revert"]>) {
      if (!revert.snapshot) return
      if (revert.files) return yield* snap.revert([{ hash: revert.snapshot, files: revert.files }])
      yield* snap.restore(revert.snapshot)
    })

    const revertUnlocked = Effect.fn("SessionRevert.revert")(function* (input: RevertInput) {
      yield* state.assertNotBusy(input.sessionID)
      const all = yield* sessions.messages({ sessionID: input.sessionID, agentID: "*" })
      let lastUser: MessageV2.User | undefined
      const session = yield* sessions.get(input.sessionID)

      let rev: Session.Info["revert"]
      const patches: Snapshot.Patch[] = []
      for (const msg of all) {
        if (msg.info.role === "user") lastUser = msg.info
        const remaining = []
        for (const part of msg.parts) {
          if (rev) {
            // FC-035: a patch lists every file that changed during its step; revert
            // the ones this session's write tools wrote. Older patches did not record them.
            if (part.type === "patch") patches.push({ hash: part.hash, files: part.written ?? part.files })
            continue
          }

          if (!rev) {
            if ((msg.info.id === input.messageID && !input.partID) || part.id === input.partID) {
              const partID = remaining.some((item) => ["text", "tool"].includes(item.type)) ? input.partID : undefined
              rev = {
                messageID: !partID && lastUser ? lastUser.id : msg.info.id,
                partID,
              }
            }
            remaining.push(part)
          }
        }
      }

      if (!rev) return session

      rev.snapshot = session.revert?.snapshot ?? (yield* snap.track())
      if (session.revert) yield* restore(session.revert)
      yield* snap.revert(patches)
      rev.files = [...new Set(patches.flatMap((patch) => patch.files))]
      if (rev.snapshot) rev.diff = yield* snap.diff(rev.snapshot as string)
      const rangeStart = all.findIndex((msg) => msg.info.id === rev!.messageID)
      const range = rangeStart < 0 ? [] : all.slice(rangeStart)
      const diffs = yield* summary.computeDiff({ messages: range })
      yield* storage.write(["session_diff", input.sessionID], diffs).pipe(Effect.ignore)
      yield* bus.publish(Session.Event.Diff, { sessionID: input.sessionID, diff: diffs })
      yield* sessions.setRevert({
        sessionID: input.sessionID,
        revert: rev,
        summary: {
          additions: diffs.reduce((sum, x) => sum + x.additions, 0),
          deletions: diffs.reduce((sum, x) => sum + x.deletions, 0),
          files: diffs.length,
        },
      })
      return yield* sessions.get(input.sessionID)
    })

    const revert = (input: RevertInput) => exclusive(input.sessionID)(revertUnlocked(input))

    const unrevertUnlocked = Effect.fn("SessionRevert.unrevert")(function* (input: { sessionID: SessionID }) {
      log.info("unreverting", input)
      yield* state.assertNotBusy(input.sessionID)
      const session = yield* sessions.get(input.sessionID)
      if (!session.revert) return session
      yield* restore(session.revert)
      yield* sessions.clearRevert(input.sessionID)
      return yield* sessions.get(input.sessionID)
    })

    const unrevert = (input: { sessionID: SessionID }) => exclusive(input.sessionID)(unrevertUnlocked(input))

    const cleanup = Effect.fn("SessionRevert.cleanup")(function* (session: Session.Info) {
      if (!session.revert) return
      const sessionID = session.id
      const msgs = yield* sessions.messages({ sessionID, agentID: "*" })
      const messageID = session.revert.messageID
      const targetIndex = msgs.findIndex((msg) => msg.info.id === messageID)
      if (targetIndex < 0) {
        yield* sessions.clearRevert(sessionID)
        return
      }
      const target = msgs[targetIndex]
      const remove = msgs.slice(targetIndex + (session.revert.partID ? 1 : 0))
      for (const msg of remove) {
        SyncEvent.run(MessageV2.Event.Removed, {
          sessionID,
          messageID: msg.info.id,
        })
      }
      if (session.revert.partID && target) {
        const partID = session.revert.partID
        const idx = target.parts.findIndex((part) => part.id === partID)
        if (idx >= 0) {
          const removeParts = target.parts.slice(idx)
          target.parts = target.parts.slice(0, idx)
          for (const part of removeParts) {
            SyncEvent.run(MessageV2.Event.PartRemoved, {
              sessionID,
              messageID: target.info.id,
              partID: part.id,
            })
          }
        }
      }
      yield* sessions.clearRevert(sessionID)
    })

    return Service.of({ revert, unrevert, cleanup })
  }),
)

export const defaultLayer = Layer.suspend(() =>
  layer.pipe(
    Layer.provide(SessionRunState.defaultLayer),
    Layer.provide(Session.defaultLayer),
    Layer.provide(Snapshot.defaultLayer),
    Layer.provide(Storage.defaultLayer),
    Layer.provide(Bus.layer),
    Layer.provide(SessionSummary.defaultLayer),
  ),
)

export * as SessionRevert from "./revert"
