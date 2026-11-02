import { Cause, Context, Deferred, Effect, Layer } from "effect"
import { ulid } from "ulid"
import { and, Database, desc, eq, inArray, ne, or, sql } from "@/storage"
import { NotFoundError } from "@/storage"
import { SessionTable } from "@/session/session.sql"
import { MessageTable } from "@/session/session.sql"
import { Session } from "@/session"
import { ActorRegistryTable } from "@/actor/actor.sql"
import { compareUtf8Bytes } from "@mimo-ai/shared/util/encode"
import { Bus } from "@/bus"
import type { MessageID, SessionID } from "@/session/schema"
import { Log } from "@/util"
import { ReceiptUpdated } from "./events"
import {
  MAX_CLAIM_PER_STEP,
  type AcceptInput,
  type Lane,
  type Receipt,
  type ReceiptOutcome,
  type ReceiptState,
} from "./schema"
import { InboxLaneStateTable, InboxSessionEpochTable, InboxTable } from "./inbox.sql"
import { inboxControllerRef } from "./controller-ref"
import { schedulerRef } from "./scheduler"
import * as InboxSync from "./sync"
import { ExecutionOwnership } from "@/session/execution-ownership"
import { EffectBridge } from "@/effect"
import { bindScopedRef } from "@/effect/scoped-ref"
import { Instance } from "@/project/instance"
import * as InstanceState from "@/effect/instance-state"
import { InstanceRef, WorkspaceRef } from "@/effect/instance-ref"
import { WorkspaceContext } from "@/control-plane/workspace-context"
import { SessionOwner } from "@/session/session-owner"
import { MessageV2 } from "@/session/message-v2"
import { SyncEvent } from "@/sync"

const log = Log.create({ service: "inbox" })

/** How often a process looks for input that other processes accepted for sessions it runs. */
const WAKE_POLL_MS = 1_000
const WAKE_POLL_JITTER_MS = 500
// Wakes belong to this process (its instance id), not to one controller, so
// every controller in the process shares which woken lanes are running.
const wakingLanes = new Set<string>()
// Lanes whose last run ended without claiming input that was already waiting,
// with how often that happened in a row and when the poller may kick them again.
const unclaimedRetries = new Map<string, { attempts: number; next: number }>()
const UNCLAIMED_RETRY_MS = 1_500
const UNCLAIMED_RETRY_MAX_MS = 60_000
const UNCLAIMED_RETRY_LIMIT = 8
// Input messages whose events this process has published: its own accepts, and
// input from other processes it announced. Bounded; a re-announce only repeats
// an idempotent upsert.
const shownInputs = new Set<string>()
const SHOWN_INPUTS_LIMIT = 10_000
function markShown(messageID: string) {
  shownInputs.add(messageID)
  if (shownInputs.size <= SHOWN_INPUTS_LIMIT) return
  for (const oldest of shownInputs) {
    shownInputs.delete(oldest)
    if (shownInputs.size <= SHOWN_INPUTS_LIMIT * 0.8) break
  }
}

export class ReceiptNotFound extends Error {
  constructor(readonly receiptId: string) {
    super(`Receipt not found: ${receiptId}`)
  }
}

export interface AdmissionGuard {
  deferKick?: boolean
  isCancelled?: () => boolean
  expectedEpoch?: number
}

export interface Interface {
  readonly accept: (
    input: AcceptInput,
    guard?: AdmissionGuard,
  ) => Effect.Effect<Receipt>
  readonly getReceipt: (receiptId: string) => Effect.Effect<Receipt, ReceiptNotFound>
  readonly listAccepted: (lane: Lane) => Effect.Effect<Receipt[]>
  readonly claimNext: (
    lane: Lane,
    runId: number,
    expectedEpoch?: number,
  ) => Effect.Effect<{ receipts: Receipt[]; claimFrontier: MessageID | undefined } | undefined>
  readonly ack: (
    lane: Lane,
    claimFrontier: MessageID | undefined,
    settled: Array<{ receiptId: string; outcome: ReceiptOutcome; error?: string }>,
    expectedRunId?: number,
  ) => Effect.Effect<void>
  readonly extendClaim: (
    lane: Lane,
    runId: number,
    expectedEpoch?: number,
    limit?: number,
  ) => Effect.Effect<{ receipts: Receipt[]; claimFrontier: MessageID | undefined } | undefined>
  readonly observeInput: (
    lane: Lane,
    afterRevision: number,
    options?: { ignoreActorNotification: { sessionID: SessionID; actorID: string } },
  ) => Effect.Effect<number>
  readonly withStop: <A, E, R>(sessionID: SessionID, work: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  readonly abortSession: (sessionID: SessionID) => Effect.Effect<number>
  readonly cancelLane: (lane: Lane) => Effect.Effect<number>
  readonly getEpoch: (sessionID: SessionID) => Effect.Effect<number>
  readonly reconcileOnBoot: (sessionID: SessionID) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/InboxController") {}

function toReceipt(row: typeof InboxTable.$inferSelect): Receipt {
  return {
    id: row.id,
    lane: { sessionID: row.receiver_session_id, agentID: row.receiver_actor_id },
    state: row.state,
    type: row.type,
    ...(row.sender_session_id ? { senderSessionID: row.sender_session_id } : {}),
    ...(row.sender_actor_id ? { senderActorID: row.sender_actor_id } : {}),
    epoch: row.epoch,
    runId: row.run_id ?? undefined,
    claimFrontier: row.claim_frontier ?? undefined,
    consumed: row.consumed,
    outcome: row.outcome ?? undefined,
    inputMessageID: row.input_message_id!,
    deliveryMessageID: row.delivery_message_id ?? undefined,
    error: row.error ?? undefined,
    idempotencyKey: row.idempotency_key ? row.idempotency_key : undefined,
    time: { created: row.created_at, updated: row.time_updated },
  }
}

// 仅认领已经完成消息写入的输入。
const promptOnly = sql`${InboxTable.input_message_id} is not null`

function laterMessage(db: Database.TxOrDb, left: MessageID | undefined, right: MessageID | undefined) {
  if (!left) return right
  if (!right) return left
  const messages = db.select({ id: MessageTable.id, created: MessageTable.time_created }).from(MessageTable)
    .where(inArray(MessageTable.id, [left, right])).all()
  const a = messages.find((message) => message.id === left)
  const b = messages.find((message) => message.id === right)
  if (!a) return right
  if (!b) return left
  return a.created < b.created || (a.created === b.created && compareUtf8Bytes(left, right) < 0) ? right : left
}

export const layer: Layer.Layer<Service, never, Bus.Service> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const bus = yield* Bus.Service
    const sessions = yield* Session.Service

    /** Per-lane waiters for observeInput (in-process). */
    const inputWaiters = new Map<string, Set<Deferred.Deferred<number>>>()
    const reconciled = new Set<SessionID>()
    const stopping = new Map<SessionID, number>()
    const cancelInputs = (db: Database.TxOrDb, sessionID: SessionID, now: number) =>
      db.update(InboxTable).set({
        state: "cancelled",
        outcome: sql`CASE WHEN ${InboxTable.consumed} THEN 'interrupted' ELSE 'never_ran' END`,
        time_updated: now,
      }).where(and(eq(InboxTable.receiver_session_id, sessionID),
        inArray(InboxTable.state, ["accepted", "claimed"]))).returning().all()
    const withStop = <A, E, R>(sessionID: SessionID, work: Effect.Effect<A, E, R>) =>
      Effect.acquireUseRelease(
        Effect.sync(() => stopping.set(sessionID, (stopping.get(sessionID) ?? 0) + 1)),
        () => work,
        () => Effect.gen(function* () {
          const remaining = stopping.get(sessionID)! - 1
          if (remaining > 0) return
          const identity = yield* ExecutionOwnership.captureIdentity
          const rows = yield* Effect.sync(() => Database.transaction((db) => {
            ExecutionOwnership.assertOwnership(db, sessionID, identity)
            const rows = cancelInputs(db, sessionID, Date.now())
            InboxSync.record({ sessionID, receipts: rows })
            return rows
          }, { behavior: "immediate" }))
          for (const row of rows) yield* publish(toReceipt(row))
        }).pipe(Effect.ensuring(Effect.sync(() => {
          const remaining = (stopping.get(sessionID) ?? 1) - 1
          if (remaining > 0) stopping.set(sessionID, remaining)
          else stopping.delete(sessionID)
        }))),
      )
    const waiterKey = (lane: Lane) => `${lane.sessionID}:${lane.agentID}`

    const acceptedInputs = (lane: Lane) => Database.use((db) => db.select({ id: InboxTable.id }).from(InboxTable).where(and(
      eq(InboxTable.receiver_session_id, lane.sessionID), eq(InboxTable.receiver_actor_id, lane.agentID),
      eq(InboxTable.state, "accepted"), promptOnly,
    )).all().map((row) => row.id))

    // A run can end without claiming input that was waiting when it started: it
    // failed before its claim, or found nothing it could claim. That input stays
    // accepted with nothing left to start it, so ring the lane again; the wake
    // poller retries it, backing off, and gives up loudly after a bounded number
    // of attempts. A later input or run resets the count.
    const retryUnclaimed = (lane: Lane, waiting: ReadonlySet<string>) => {
      const key = waiterKey(lane)
      try {
        const stuck = waiting.size === 0 ? [] : acceptedInputs(lane).filter((id) => waiting.has(id))
        if (stuck.length === 0) {
          unclaimedRetries.delete(key)
          return
        }
        const current = unclaimedRetries.get(key)
        // Runs that end together (a first wake also reconciles, which kicks the
        // lane too) make one retry round, not several.
        if (current && Date.now() < current.next) {
          Database.use((db) => SessionOwner.ringWake(db, lane))
          return
        }
        const attempts = (current?.attempts ?? 0) + 1
        if (attempts > UNCLAIMED_RETRY_LIMIT) {
          unclaimedRetries.delete(key)
          log.error("inbox input still unclaimed after retries", { sessionID: lane.sessionID, agentID: lane.agentID, inputs: stuck.length, attempts: attempts - 1 })
          return
        }
        const delay = Math.min(UNCLAIMED_RETRY_MS * 2 ** (attempts - 1), UNCLAIMED_RETRY_MAX_MS)
        unclaimedRetries.set(key, { attempts, next: Date.now() + delay })
        if (attempts === 1) log.warn("inbox input left unclaimed by a lane run; retrying", { sessionID: lane.sessionID, agentID: lane.agentID, inputs: stuck.length })
        Database.use((db) => SessionOwner.ringWake(db, lane))
      } catch (error) {
        log.warn("inbox unclaimed input retry failed", { sessionID: lane.sessionID, agentID: lane.agentID, error: String(error) })
      }
    }

    const getEpoch = Effect.fn("Inbox.getEpoch")(function* (sessionID: SessionID) {
      const row = yield* Effect.sync(() =>
        Database.use((db) => db.select().from(InboxSessionEpochTable).where(eq(InboxSessionEpochTable.session_id, sessionID)).get()),
      )
      return row?.epoch ?? 0
    })

    const publish = (receipt: Receipt) =>
      bus
        .publish(ReceiptUpdated, {
          sessionID: receipt.lane.sessionID,
          receiptId: receipt.id,
          agentID: receipt.lane.agentID,
          state: receipt.state,
          ...(receipt.outcome ? { outcome: receipt.outcome } : {}),
          inputMessageID: String(receipt.inputMessageID),
          ...(receipt.deliveryMessageID ? { deliveryMessageID: String(receipt.deliveryMessageID) } : {}),
          epoch: receipt.epoch,
        })
        .pipe(Effect.ignore)

    /**
     * One transaction: persist the user message + parts, write the inbox
     * record, bump input_revision. Returns undefined when the admission
     * guard rejects the write.
     */
    // `runsHere`: whether this process may start the inserted input's lane. When
    // it may not, the accept transaction itself records the owner's wake.
    type AcceptedWrite = { row: typeof InboxTable.$inferSelect; kind: "existing" | "inserted"; revision?: number; runsHere?: boolean }
    const writeAccept = (input: AcceptInput, identity: ExecutionOwnership.Identity, guard?: AdmissionGuard) =>
      Effect.suspend(() => {
      let prepared: AcceptedWrite | undefined
      let committed: AcceptedWrite | undefined
      return Effect.sync(() => Database.transaction((db) => {
        // Register the commit witness before any publisher can throw after commit.
        Database.effect(() => { committed = prepared })
        ExecutionOwnership.assertOwnership(db, input.lane.sessionID, identity)
        if (guard?.isCancelled?.()) return undefined
        const epoch = db.select().from(InboxSessionEpochTable)
          .where(eq(InboxSessionEpochTable.session_id, input.lane.sessionID)).get()?.epoch ?? 0
        if (guard?.expectedEpoch !== undefined && epoch !== guard.expectedEpoch) return undefined
        if (input.message.role !== "user" || input.message.sessionID !== input.lane.sessionID ||
          (input.message.agentID ?? "main") !== input.lane.agentID)
          throw new Error("Inbox.accept message must belong to its lane")
        const reuse = (row: typeof InboxTable.$inferSelect) => {
          if (row.receiver_actor_id !== input.lane.agentID) throw new Error("Inbox idempotency key belongs to another lane")
          if (row.input_message_id === input.message.id)
            sessions.commitUserMessageSync(input.message, input.parts, input.generatedPartIDs ? { generatedPartIDs: input.generatedPartIDs } : undefined)
          return prepared = { row, kind: "existing" as const }
        }
        const receiver = db.select().from(ActorRegistryTable).where(and(
          eq(ActorRegistryTable.session_id, input.lane.sessionID),
          eq(ActorRegistryTable.actor_id, input.lane.agentID),
        )).get()
        if (receiver?.lifecycle === "persistent" && receiver.status === "idle" && receiver.last_outcome === "cancelled")
          return undefined
        const legacy = input.legacyInboxID
          ? db.select().from(InboxTable).where(eq(InboxTable.id, input.legacyInboxID)).get()
          : undefined
        if (input.legacyInboxID && !legacy) throw new Error("Legacy inbox record missing")
        if (legacy?.input_message_id) return reuse(legacy)
        const idempotencyKey = input.idempotencyKey ?? ""
        if (idempotencyKey) {
          const row = db.select().from(InboxTable).where(and(
            eq(InboxTable.receiver_session_id, input.lane.sessionID),
            eq(InboxTable.idempotency_key, idempotencyKey),
            promptOnly,
          )).get()
          if (row) return reuse(row)
        }
        // Same-message live receipt: a second accept for one message returns it.
        const duplicate = db.select().from(InboxTable).where(and(
          eq(InboxTable.receiver_session_id, input.lane.sessionID),
          eq(InboxTable.receiver_actor_id, input.lane.agentID),
          eq(InboxTable.input_message_id, input.message.id),
          promptOnly,
          or(
            and(eq(InboxTable.state, "settled"), eq(InboxTable.consumed, true)),
            and(
              inArray(InboxTable.state, ["accepted", "claimed"]),
              eq(InboxTable.epoch, epoch),
            ),
          ),
        )).orderBy(sql`${InboxTable.consumed} desc`).get()
        if (duplicate) return reuse(duplicate)

        const latest = db.select({ created: InboxTable.created_at }).from(InboxTable).where(and(
          eq(InboxTable.receiver_session_id, input.lane.sessionID), eq(InboxTable.receiver_actor_id, input.lane.agentID),
        )).orderBy(desc(InboxTable.created_at)).get()
        const now = Math.max(Date.now(), (latest?.created ?? -1) + 1)
        // Persist the accepted user message + parts in the same transaction.
        if (input.message.role !== "user") throw new Error("Inbox.accept requires a user message")
        if (input.message.sessionID !== input.lane.sessionID || (input.message.agentID ?? "main") !== input.lane.agentID)
          throw new Error("Inbox.accept message must belong to its lane")
        if (input.parts.some((part) => part.sessionID !== input.message.sessionID || part.messageID !== input.message.id))
          throw new Error("Inbox.accept parts must belong to the saved message")
        if (!db.select({ id: SessionTable.id }).from(SessionTable).where(eq(SessionTable.id, input.message.sessionID)).get())
          throw new NotFoundError({ message: `Session not found: ${input.message.sessionID}` })
        sessions.commitUserMessageSync(input.message, input.parts, input.generatedPartIDs ? { generatedPartIDs: input.generatedPartIDs } : undefined)

        const id = input.legacyInboxID ?? ulid(now)
        const row = db.insert(InboxTable)
          .values({
            id,
            receiver_session_id: input.lane.sessionID,
            receiver_actor_id: input.lane.agentID,
            sender_session_id: input.senderSessionID ?? null,
            sender_actor_id: input.senderActorID ?? null,
            type: input.type,
            content: null,
            input_message_id: input.message.id,
            state: "accepted",
            epoch,
            idempotency_key: idempotencyKey,
            created_at: now,
            time_updated: now,
          })
          .onConflictDoUpdate({
            target: InboxTable.id,
            set: { content: null, input_message_id: input.message.id, time_updated: now },
          })
          .returning().get()!
        const laneRow = db.insert(InboxLaneStateTable)
          .values({
            session_id: input.lane.sessionID,
            agent_id: input.lane.agentID,
            input_revision: 1,
            time_updated: now,
          })
          .onConflictDoUpdate({
            target: [InboxLaneStateTable.session_id, InboxLaneStateTable.agent_id],
            set: {
              input_revision: sql`${InboxLaneStateTable.input_revision} + 1`,
              time_updated: now,
            },
          })
          .returning().get()!
        InboxSync.record({ sessionID: input.lane.sessionID, receipts: [row], lanes: [laneRow] })
        // Decide in this transaction whether the lane can start here, and record
        // the owner's wake with the input, so an interruption after the commit
        // cannot leave accepted input that no process will start.
        let runsHere: boolean | undefined
        if (!guard?.deferKick && !input.legacyInboxID) {
          const owner = SessionOwner.status(db, input.lane.sessionID)
          const adopt = input.adoptReceiver ?? true
          runsHere = owner.kind === "self" || (owner.kind === "unowned" && adopt && schedulerRef.current !== undefined)
          // Same rule as maybeKick: wake only when ownership keeps the lane from running here.
          if (owner.kind === "other" || (owner.kind === "unowned" && !adopt)) SessionOwner.ringWake(db, input.lane)
        }
        return prepared = { row, kind: "inserted" as const, revision: laneRow.input_revision, runsHere }
      }, { behavior: "immediate" })).pipe(Effect.catchCause((cause) => {
        if (!committed || Cause.hasInterrupts(cause)) return Effect.failCause(cause)
        log.warn("inbox postcommit publisher failed", { cause: Cause.pretty(cause) })
        return Effect.succeed(committed)
      }))
    })

    const loadReceipt = (id: string) =>
      Effect.sync(() => Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.id, id)).get()))

    const getReceipt = Effect.fn("Inbox.getReceipt")(function* (receiptId: string) {
      const row = yield* loadReceipt(receiptId)
      if (!row) return yield* Effect.fail(new ReceiptNotFound(receiptId))
      return toReceipt(row)
    })

    /**
     * Publish the message events for input another process wrote, once per
     * process. The accepting process announced them only to its own bus, so
     * this process's TUI would otherwise answer input it never shows.
     */
    const showInputs = (sessionID: SessionID, messageIDs: readonly (MessageID | undefined)[]) => Effect.sync(() => {
      for (const messageID of messageIDs) {
        if (!messageID || shownInputs.has(messageID)) continue
        const message = MessageV2.get({ sessionID, messageID })
        SyncEvent.announce(MessageV2.Event.Updated, { sessionID, info: message.info })
        for (const part of message.parts) SyncEvent.announce(MessageV2.Event.PartUpdated, { sessionID, part, time: Date.now() })
        markShown(messageID)
      }
    })

    /** Release this process's observeInput waiters on a lane; each re-reads the durable revision. */
    const wakeInputWaiters = (lane: Lane) => Effect.gen(function* () {
      const waiters = inputWaiters.get(waiterKey(lane))
      if (!waiters) return
      const rev = Database.use((db) =>
        db.select().from(InboxLaneStateTable)
          .where(and(eq(InboxLaneStateTable.session_id, lane.sessionID), eq(InboxLaneStateTable.agent_id, lane.agentID)))
          .get(),
      )?.input_revision ?? 0
      for (const d of [...waiters]) {
        waiters.delete(d)
        const done = yield* Deferred.isDone(d)
        if (done) continue
        Deferred.doneUnsafe(d, Effect.succeed(rev))
      }
      if (waiters.size === 0) inputWaiters.delete(waiterKey(lane))
    })

    /**
     * Fire-and-forget schedule: Controller owns receipts; kick only starts a lease when idle.
     * Only the process that owns the receiver session runs it. Any other process
     * leaves a wake for the owner; `adopt` lets this process take an unowned session.
     */
    const maybeKick = (lane: Lane, adopt = true, onSettled?: () => void) =>
      Effect.gen(function* () {
        const sched = schedulerRef.current
        if (sched && stopping.has(lane.sessionID)) return false
        const runsHere = yield* Effect.sync(() => Database.use((db) => {
          const owner = adopt && sched ? SessionOwner.claim(db, lane.sessionID) : SessionOwner.status(db, lane.sessionID)
          if (owner.kind === "self") return true
          // Wake only when ownership keeps the lane from running here. Without a
          // scheduler an adoptable lane waits for its next run, as before.
          if (owner.kind === "other" || !adopt) SessionOwner.ringWake(db, lane)
          return false
        }))
        if (!runsHere || !sched) return false
        const bridge = yield* EffectBridge.make()
        const directory = yield* InstanceState.directory
        const guard = sched.guard ? yield* sched.guard(lane) : undefined
        yield* Effect.acquireUseRelease(
          Effect.sync(() => ({ release: Instance.claim(directory), transferred: false })),
          (owner) => Effect.sync(() => {
            const waiting = new Set(acceptedInputs(lane))
            const work = bridge.promise(sched.kick(lane, guard))
            owner.transferred = true
            const settle = () => {
              owner.release()
              retryUnclaimed(lane, waiting)
              onSettled?.()
            }
            void work.then(settle, (error: unknown) => {
              // A lane that fails before claiming leaves its input accepted; say so.
              log.warn("inbox lane run failed", { sessionID: lane.sessionID, agentID: lane.agentID, error: String(error) })
              settle()
            })
          }),
          (owner) => owner.transferred ? Effect.void : Effect.sync(owner.release),
        ).pipe(Effect.uninterruptible)
        return true
      })

    const accept = Effect.fn("Inbox.accept")(function* (input: AcceptInput, guard?: AdmissionGuard) {
      const identity = yield* ExecutionOwnership.captureIdentity
      const isCancelled = guard ? () => {
        if (guard.isCancelled?.()) return true
        if (guard.expectedEpoch === undefined) return false
        const current = Database.use((db) => db.select().from(InboxSessionEpochTable)
          .where(eq(InboxSessionEpochTable.session_id, input.lane.sessionID)).get())
        return (current?.epoch ?? 0) !== guard.expectedEpoch
      } : undefined
      if (isCancelled?.()) return yield* Effect.interrupt

      const written = yield* writeAccept(input, identity, guard)
      if (written === undefined) return yield* Effect.interrupt
      const receipt = toReceipt(written.row)
      if (written.kind === "inserted") {
        // commitUserMessageSync announced this message to this process's bus.
        markShown(input.message.id)
        // Wake observeInput waiters — any accept advances input_revision.
        yield* wakeInputWaiters(input.lane)
        yield* publish(receipt)
        if (!guard?.deferKick && !input.legacyInboxID && written.runsHere) yield* maybeKick(input.lane, input.adoptReceiver)
      } else if (!guard && !input.legacyInboxID && (receipt.state === "accepted" || receipt.state === "claimed")) {
        yield* maybeKick(input.lane, input.adoptReceiver)
      }
      return receipt
    })

    const listAccepted = Effect.fn("Inbox.listAccepted")(function* (lane: Lane) {
      const rows = yield* Effect.sync(() =>
        Database.use((db) =>
          db
            .select()
            .from(InboxTable)
            .where(
              and(
                eq(InboxTable.receiver_session_id, lane.sessionID),
                eq(InboxTable.receiver_actor_id, lane.agentID),
                eq(InboxTable.state, "accepted"),
                promptOnly,
              ),
            )
            .all(),
        ),
      )
      return rows.map(toReceipt).sort((a, b) => compareUtf8Bytes(a.id, b.id))
    })

    const claim = (lane: Lane, runId: number, expectedEpoch: number | undefined, requireOwner: boolean, limit = MAX_CLAIM_PER_STEP) =>
      Effect.gen(function* () {
        if (limit === 0) return undefined
        const identity = yield* ExecutionOwnership.captureIdentity
        const batch = yield* Effect.sync(() => Database.transaction((db) => {
          ExecutionOwnership.assertOwnership(db, lane.sessionID, identity)
          if (stopping.has(lane.sessionID)) return undefined
          const epoch = db.select().from(InboxSessionEpochTable)
            .where(eq(InboxSessionEpochTable.session_id, lane.sessionID)).get()?.epoch ?? 0
          if (expectedEpoch !== undefined && epoch !== expectedEpoch) return undefined
          const receiver = db.select().from(ActorRegistryTable).where(and(
            eq(ActorRegistryTable.session_id, lane.sessionID), eq(ActorRegistryTable.actor_id, lane.agentID),
          )).get()
          if (receiver?.lifecycle === "persistent" && receiver.status === "idle" && receiver.last_outcome === "cancelled")
            return undefined
          const owned = db.select().from(InboxTable).where(and(
            eq(InboxTable.receiver_session_id, lane.sessionID),
            eq(InboxTable.receiver_actor_id, lane.agentID),
            eq(InboxTable.run_id, runId),
            eq(InboxTable.epoch, epoch),
            eq(InboxTable.state, "claimed"),
            promptOnly,
          )).all()
          if (requireOwner && owned.length === 0) return undefined
          const frontier = db.select().from(InboxLaneStateTable).where(and(
            eq(InboxLaneStateTable.session_id, lane.sessionID),
            eq(InboxLaneStateTable.agent_id, lane.agentID),
          )).get()?.consumed_frontier ?? undefined
          const eligible = db.select().from(InboxTable).where(and(
            eq(InboxTable.receiver_session_id, lane.sessionID),
            eq(InboxTable.receiver_actor_id, lane.agentID),
            eq(InboxTable.state, "accepted"),
            promptOnly,
            eq(InboxTable.epoch, epoch),
          )).orderBy(InboxTable.id).limit(limit).all().map(toReceipt)
          if (eligible.length === 0) return undefined
          let claimFrontier = frontier
          for (const row of owned) {
            claimFrontier = laterMessage(db, claimFrontier, row.claim_frontier ?? undefined)
          }
          for (const r of eligible) {
            claimFrontier = laterMessage(db, claimFrontier, r.inputMessageID)
          }
          const rows = db.update(InboxTable).set({
            state: "claimed",
            run_id: runId,
            claim_frontier: claimFrontier ?? null,
            time_updated: Date.now(),
          }).where(and(
            inArray(InboxTable.id, eligible.map((r) => r.id)),
            eq(InboxTable.state, "accepted"),
            promptOnly,
            eq(InboxTable.epoch, epoch),
          )).returning().all()
          if (rows.length === 0) return undefined
          InboxSync.record({ sessionID: lane.sessionID, receipts: rows })
          return {
            receipts: rows.map(toReceipt).sort((a, b) => compareUtf8Bytes(a.id, b.id)),
            claimFrontier,
          }
        // Ownership is read before the claim writes; start with the write lock
        // so another process's commit makes this wait instead of fail.
        }, { behavior: "immediate" }))
        if (!batch) return undefined
        // A running turn may take input another process wrote before any wake poll.
        yield* showInputs(lane.sessionID, batch.receipts.map((receipt) => receipt.inputMessageID)).pipe(Effect.catchCause((cause) =>
          Effect.sync(() => log.warn("inbox input announce failed", { sessionID: lane.sessionID, cause: Cause.pretty(cause) }))))
        for (const receipt of batch.receipts) yield* publish(receipt)
        return batch
      })

    const claimNext = Effect.fn("Inbox.claimNext")(function* (lane: Lane, runId: number, expectedEpoch?: number) {
      return yield* claim(lane, runId, expectedEpoch, false)
    })

    const ack = Effect.fn("Inbox.ack")(function* (
      lane: Lane,
      claimFrontier: MessageID | undefined,
      settled: Array<{ receiptId: string; outcome: ReceiptOutcome; error?: string }>,
      expectedRunId?: number,
    ) {
      const identity = yield* ExecutionOwnership.captureIdentity
      const rows = yield* Effect.sync(() =>
        Database.transaction((db) => {
          ExecutionOwnership.assertOwnership(db, lane.sessionID, identity)
          const now = Date.now()
          const epoch = db
            .select()
            .from(InboxSessionEpochTable)
            .where(eq(InboxSessionEpochTable.session_id, lane.sessionID))
            .get()?.epoch ?? 0
          const rows = settled.flatMap((s) => {
            const state: ReceiptState = s.outcome === "success" || s.outcome === "assistant_error" ? "settled" : "cancelled"
            return db
              .update(InboxTable)
              .set({
                state,
                outcome: s.outcome,
                error: s.error ?? null,
                consumed: s.outcome !== "never_ran",
                time_updated: now,
              })
              .where(
                and(
                  eq(InboxTable.id, s.receiptId),
                  eq(InboxTable.receiver_session_id, lane.sessionID),
                  eq(InboxTable.receiver_actor_id, lane.agentID),
                  eq(InboxTable.epoch, epoch),
                  eq(InboxTable.state, "claimed"),
                  expectedRunId == null ? undefined : eq(InboxTable.run_id, expectedRunId),
                ),
              )
              .returning()
              .all()
          })
          const lanes: Array<typeof InboxLaneStateTable.$inferSelect> = []
          if (claimFrontier && rows.some((row) => row.consumed && row.claim_frontier === claimFrontier)) {
            const previous = db.select({ frontier: InboxLaneStateTable.consumed_frontier }).from(InboxLaneStateTable)
              .where(and(eq(InboxLaneStateTable.session_id, lane.sessionID), eq(InboxLaneStateTable.agent_id, lane.agentID))).get()
            const consumedFrontier = laterMessage(db, previous?.frontier ?? undefined, claimFrontier)
            const updatedLane = db.insert(InboxLaneStateTable)
              .values({
                session_id: lane.sessionID,
                agent_id: lane.agentID,
                consumed_frontier: consumedFrontier,
                input_revision: 0,
                time_updated: now,
              })
              .onConflictDoUpdate({
                target: [InboxLaneStateTable.session_id, InboxLaneStateTable.agent_id],
                set: {
                  consumed_frontier: consumedFrontier,
                  time_updated: now,
                },
              })
              .returning().get()!
            lanes.push(updatedLane)
          }
          InboxSync.record({ sessionID: lane.sessionID, receipts: rows, lanes })
          return rows
        }, { behavior: "immediate" }),
      )
      for (const row of rows) yield* publish(toReceipt(row))
    })

    const extendClaim = Effect.fn("Inbox.extendClaim")(function* (lane: Lane, runId: number, expectedEpoch?: number, limit?: number) {
      return yield* claim(lane, runId, expectedEpoch, true, limit)
    })

    const observeInput = Effect.fn("Inbox.observeInput")(function* (
      lane: Lane,
      afterRevision: number,
      options?: { ignoreActorNotification: { sessionID: SessionID; actorID: string } },
    ) {
      const key = waiterKey(lane)
      const read = () => Effect.sync(() => Database.transaction((db) => {
        const revision = db.select().from(InboxLaneStateTable).where(and(
          eq(InboxLaneStateTable.session_id, lane.sessionID), eq(InboxLaneStateTable.agent_id, lane.agentID),
        )).get()?.input_revision ?? 0
        if (!options || afterRevision < 0 || revision <= afterRevision) return { revision, relevant: true }
        const admitted = and(
          eq(InboxTable.receiver_session_id, lane.sessionID), eq(InboxTable.receiver_actor_id, lane.agentID),
          promptOnly, sql`${InboxTable.idempotency_key} not like 'import-history:%'`,
        )
        const count = db.select({ count: sql<number>`count(*)` }).from(InboxTable).where(admitted).get()!.count
        if (count !== revision) return { revision, relevant: true }
        // rowid 保留受理顺序；revision 与 receipt 在同一事务写入，状态变化不影响输入边界。
        const rows = db.select().from(InboxTable).where(admitted)
          .orderBy(sql`${InboxTable}.rowid desc`).limit(revision - afterRevision).all()
        const source = options.ignoreActorNotification
        return { revision, relevant: rows.length < revision - afterRevision || rows.some((row) =>
          row.type !== "actor_notification" || row.sender_session_id !== source.sessionID || row.sender_actor_id !== source.actorID,
        ) }
      }))
      for (;;) {
        const current = yield* read()
        if (current.revision > afterRevision) {
          if (current.relevant) return current.revision
          afterRevision = current.revision
        }
        const deferred = yield* Deferred.make<number>()
        let set = inputWaiters.get(key)
        if (!set) {
          set = new Set()
          inputWaiters.set(key, set)
        }
        // 订阅前后读取 revision，避免遗漏并发受理。
        set.add(deferred)
        const next = yield* read()
        if (next.revision > afterRevision) {
          set.delete(deferred)
          if (next.relevant) return next.revision
          afterRevision = next.revision
          continue
        }
        yield* Deferred.await(deferred).pipe(
          Effect.ensuring(Effect.sync(() => set.delete(deferred))),
        )
      }
    })

    const abortSession = Effect.fn("Inbox.abortSession")(function* (sessionID: SessionID) {
      const identity = yield* ExecutionOwnership.captureIdentity
      const now = Date.now()
      const stopped = yield* Effect.sync(() =>
        Database.transaction((db) => {
          ExecutionOwnership.assertOwnership(db, sessionID, identity)
          const epochRow = db.insert(InboxSessionEpochTable)
            .values({ session_id: sessionID, epoch: 1, time_updated: now })
            .onConflictDoUpdate({
              target: InboxSessionEpochTable.session_id,
              set: { epoch: sql`${InboxSessionEpochTable.epoch} + 1`, time_updated: now },
            })
            .returning().get()!
          const nextEpoch = epochRow.epoch
          const receipts = cancelInputs(db, sessionID, now)
          InboxSync.record({ sessionID, receipts, epoch: epochRow })
          return { epoch: nextEpoch, receipts }
        }, { behavior: "immediate" }),
      )
      for (const row of stopped.receipts) yield* publish(toReceipt(row))
      log.info("inbox abort", { sessionID, epoch: stopped.epoch })
      return stopped.epoch
    })

    const reconcileOnBoot = Effect.fn("Inbox.reconcileOnBoot")(function* (sessionID: SessionID) {
      const identity = yield* ExecutionOwnership.captureIdentity
      const lanes = yield* Effect.sync(() => {
        Database.use((db) => ExecutionOwnership.assertOwnership(db, sessionID, identity))
        // No yield between checking recovery and committing it: another prompt may claim immediately afterwards.
        if (reconciled.has(sessionID)) return []
        const lanes = Database.transaction((db) => {
          ExecutionOwnership.assertOwnership(db, sessionID, identity)
          const receipts: Array<typeof InboxTable.$inferSelect> = []
          const laneRows: Array<typeof InboxLaneStateTable.$inferSelect> = []
          const epoch = db
            .select()
            .from(InboxSessionEpochTable)
            .where(eq(InboxSessionEpochTable.session_id, sessionID))
            .get()?.epoch ?? 0
          const now = Date.now()
          // Process restart mid-claim or stop fence: stale-epoch and crashed
          // claims settle as cancelled/never_ran. Messages stay visible.
          const stale = db.update(InboxTable)
            .set({ state: "cancelled", outcome: "never_ran", time_updated: now })
            .where(
              and(
                eq(InboxTable.receiver_session_id, sessionID),
                promptOnly,
                inArray(InboxTable.state, ["accepted", "claimed"]),
                ne(InboxTable.epoch, epoch),
              ),
            )
            .returning().all()
          receipts.push(...stale)
          const crashed = db.update(InboxTable)
            .set({ state: "cancelled", outcome: "never_ran", time_updated: now })
            .where(and(
              eq(InboxTable.receiver_session_id, sessionID),
              promptOnly,
              eq(InboxTable.state, "claimed"),
            ))
            .returning().all()
          receipts.push(...crashed)
          InboxSync.record({ sessionID, receipts, lanes: laneRows })
          return db
            .select({
              session_id: InboxTable.receiver_session_id,
              agent_id: InboxTable.receiver_actor_id,
            })
            .from(InboxTable)
            .where(
              and(
                eq(InboxTable.receiver_session_id, sessionID),
                eq(InboxTable.state, "accepted"),
                promptOnly,
              ),
            )
            .all()
        }, { behavior: "immediate" })
        reconciled.add(sessionID)
        return lanes
      })
      // Recovered and surviving accepted work still needs a lease.
      const seen = new Set<string>()
      for (const row of lanes) {
        const key = `${row.session_id}:${row.agent_id}`
        if (seen.has(key)) continue
        seen.add(key)
        yield* maybeKick({ sessionID: row.session_id, agentID: row.agent_id })
      }
    })

    const cancelLane = (lane: Lane) => Effect.gen(function* () {
      const identity = yield* ExecutionOwnership.captureIdentity
      const rows = yield* Effect.sync(() => Database.transaction((db) => {
        ExecutionOwnership.assertOwnership(db, lane.sessionID, identity)
        const rows = db.update(InboxTable).set({
          state: "cancelled", outcome: sql`CASE WHEN ${InboxTable.consumed} THEN 'interrupted' ELSE 'never_ran' END`,
          time_updated: Date.now(),
        }).where(and(eq(InboxTable.receiver_session_id, lane.sessionID), eq(InboxTable.receiver_actor_id, lane.agentID),
          inArray(InboxTable.state, ["accepted", "claimed"]))).returning().all()
        InboxSync.record({ sessionID: lane.sessionID, receipts: rows })
        return rows
      }, { behavior: "immediate" }))
      for (const row of rows) yield* publish(toReceipt(row))
      return rows.length
    })

    const impl: Interface = {
      accept,
      getReceipt,
      listAccepted,
      claimNext,
      ack,
      extendClaim,
      observeInput,
      withStop,
      abortSession,
      cancelLane,
      getEpoch,
      reconcileOnBoot,
    }
    // Start lanes that other processes woke for sessions this process owns.
    // The lane runs in its session's own instance, as an accept there would.
    const inSessionInstance = <A>(sessionID: SessionID, effect: Effect.Effect<A>) => Effect.gen(function* () {
      // Carry this fiber's services and references, the application logger
      // among them: a bare runtime logs to the console, under the TUI.
      const context = yield* Effect.context<never>()
      const row = yield* Effect.sync(() => Database.use((db) => db.select({ directory: SessionTable.directory, workspaceID: SessionTable.workspace_id })
        .from(SessionTable).where(eq(SessionTable.id, sessionID)).get()))
      if (!row) return undefined
      const workspace = row.workspaceID ?? undefined
      const instance = yield* Effect.promise(async () => await WorkspaceContext.provide({ workspaceID: workspace, fn: () =>
        Instance.provide({ directory: row.directory, fn: () => Instance.current }),
      }))
      return yield* Effect.promise(async () => await WorkspaceContext.provide({ workspaceID: workspace, fn: () =>
        Instance.restore(instance, () => Effect.runPromise(effect.pipe(
          Effect.provideService(InstanceRef, instance), Effect.provideService(WorkspaceRef, workspace),
          Effect.provide(context),
        ))),
      }))
    })
    // Input written by another process was announced only there. Tell this
    // process's subscribers, so the window that runs the session shows it.
    const announceRemoteInput = (lane: Lane) => Effect.gen(function* () {
      const rows = yield* Effect.sync(() => Database.use((db) => db.select({ messageID: InboxTable.input_message_id })
        .from(InboxTable).where(and(
          eq(InboxTable.receiver_session_id, lane.sessionID), eq(InboxTable.receiver_actor_id, lane.agentID),
          eq(InboxTable.state, "accepted"),
        )).orderBy(sql`${InboxTable}.rowid`).all()))
      const fresh = rows.flatMap((row) => row.messageID && !shownInputs.has(row.messageID) ? [row.messageID] : [])
      if (fresh.length === 0) return
      yield* inSessionInstance(lane.sessionID, showInputs(lane.sessionID, fresh))
    })
    // A wake stays until its lane's run settles, so an owner that exits first
    // leaves it for the next owner of the session. A run that leaves waiting
    // input unclaimed rings it again (retryUnclaimed); the lane then waits out
    // its backoff here before the next kick.
    const startWoken = Effect.gen(function* () {
      // Like the lane scheduler, wakes go to the process's current controller only.
      if (!schedulerRef.current || inboxControllerRef.current !== impl) return
      const wakes = yield* Effect.sync(() => Database.use((db) => SessionOwner.listWakes(db)))
      for (const wake of wakes) {
        // Remote input must reach a turn already waiting on this lane, as local input would.
        yield* wakeInputWaiters(wake)
        yield* announceRemoteInput(wake).pipe(Effect.catchCause((cause) =>
          Effect.sync(() => log.warn("inbox wake announce failed", { sessionID: wake.sessionID, agentID: wake.agentID, cause: Cause.pretty(cause) }))))
        const key = waiterKey(wake)
        if (wakingLanes.has(key)) continue
        const retry = unclaimedRetries.get(key)
        if (retry && Date.now() < retry.next) continue
        wakingLanes.add(key)
        const settled = () => {
          wakingLanes.delete(key)
          try {
            Database.use((db) => SessionOwner.clearWake(db, wake))
          } catch (error) {
            log.warn("inbox wake clear failed", { sessionID: wake.sessionID, agentID: wake.agentID, error: String(error) })
          }
        }
        // Reconcile a session this process has not run yet before its first
        // woken lane claims input; a later first prompt then leaves that run alone.
        const run = reconcileOnBoot(wake.sessionID).pipe(Effect.andThen(maybeKick(wake, true, settled)))
        const kicked = yield* inSessionInstance(wake.sessionID, run).pipe(Effect.catchCause((cause) =>
          Effect.sync(() => {
            log.warn("inbox wake failed", { sessionID: wake.sessionID, agentID: wake.agentID, cause: Cause.pretty(cause) })
            return false
          })))
        if (!kicked) wakingLanes.delete(key)
      }
    })
    yield* Effect.gen(function* () {
      while (true) {
        yield* Effect.sleep(WAKE_POLL_MS + Math.floor(Math.random() * WAKE_POLL_JITTER_MS))
        yield* startWoken.pipe(Effect.catchCause((cause) => Effect.sync(() => log.warn("inbox wake poll failed", { cause: Cause.pretty(cause) }))))
      }
    }).pipe(Effect.forkScoped)
    yield* bindScopedRef(inboxControllerRef, impl)
    return Service.of(impl)
  }),
).pipe(Layer.provide(Session.defaultLayer))

export const defaultLayer = layer.pipe(Layer.provide(Bus.defaultLayer))
