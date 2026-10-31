import { and, Database, eq, lte } from "@/storage"
import { InboxWakeTable } from "@/inbox/inbox.sql"
import type { Lane } from "@/inbox/schema"
import { ProcessLiveness } from "./process-liveness"
import type { SessionID } from "./schema"
import { SessionOwnerTable } from "./session-owner.sql"

/**
 * Which process runs a session.
 *
 * Several processes may share one database, but only one may drive a session:
 * two drivers interleave turns and write the same history. Ownership is a row
 * naming a process instance, and it counts only while that process is alive
 * (see ProcessLiveness). A process adopts a session when it is about to run it
 * and nobody alive owns it, and keeps it until it exits.
 */
export type Status =
  | { readonly kind: "self" }
  | { readonly kind: "other"; readonly pid: number }
  | { readonly kind: "unowned" }

const SELF: Status = { kind: "self" }
const UNOWNED: Status = { kind: "unowned" }

const read = (db: Database.TxOrDb, sessionID: SessionID) =>
  db.select().from(SessionOwnerTable).where(eq(SessionOwnerTable.session_id, sessionID)).get()

function evaluate(row: ReturnType<typeof read>): Status {
  if (!row) return UNOWNED
  if (row.instance_id === ProcessLiveness.INSTANCE_ID) return SELF
  if (ProcessLiveness.isAlive(row.instance_id)) return { kind: "other", pid: row.pid }
  return UNOWNED
}

/** The session's owner as seen from this process. Never writes. */
export function status(db: Database.TxOrDb, sessionID: SessionID): Status {
  return evaluate(read(db, sessionID))
}

/** Adopt the session unless another live process owns it. The session row must exist. */
export function claim(db: Database.TxOrDb, sessionID: SessionID): Status {
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = read(db, sessionID)
    const current = evaluate(row)
    if (current.kind !== "unowned") return current
    ProcessLiveness.ensureHeld()
    const owner = { instance_id: ProcessLiveness.INSTANCE_ID, pid: process.pid, time_claimed: Date.now() }
    // Compare-and-set against the row just read, so two adopters cannot both win.
    const won = row
      ? db.update(SessionOwnerTable).set(owner)
        .where(and(eq(SessionOwnerTable.session_id, sessionID), eq(SessionOwnerTable.instance_id, row.instance_id)))
        .returning({ id: SessionOwnerTable.session_id }).all()
      : db.insert(SessionOwnerTable).values({ session_id: sessionID, ...owner }).onConflictDoNothing()
        .returning({ id: SessionOwnerTable.session_id }).all()
    if (won.length > 0) return SELF
  }
  return status(db, sessionID)
}

/** Record that `lane` has input this process accepted but will not run. */
export function ringWake(db: Database.TxOrDb, lane: Lane): void {
  const now = Date.now()
  db.insert(InboxWakeTable).values({ session_id: lane.sessionID, agent_id: lane.agentID, time_created: now })
    .onConflictDoUpdate({ target: [InboxWakeTable.session_id, InboxWakeTable.agent_id], set: { time_created: now } }).run()
}

export type Wake = Lane & { readonly time: number }

/** The wakes for sessions this process owns. They stay until `clearWake`. */
export function listWakes(db: Database.TxOrDb): Wake[] {
  return db.select({ sessionID: InboxWakeTable.session_id, agentID: InboxWakeTable.agent_id, time: InboxWakeTable.time_created })
    .from(InboxWakeTable)
    .innerJoin(SessionOwnerTable, eq(SessionOwnerTable.session_id, InboxWakeTable.session_id))
    .where(eq(SessionOwnerTable.instance_id, ProcessLiveness.INSTANCE_ID)).all()
}

/** Remove a handled wake unless another process rang it again since. */
export function clearWake(db: Database.TxOrDb, wake: Wake): void {
  db.delete(InboxWakeTable).where(and(
    eq(InboxWakeTable.session_id, wake.sessionID), eq(InboxWakeTable.agent_id, wake.agentID),
    lte(InboxWakeTable.time_created, wake.time),
  )).run()
}

export * as SessionOwner from "./session-owner"
