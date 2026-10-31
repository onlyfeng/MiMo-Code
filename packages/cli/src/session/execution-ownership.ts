import { Effect } from "effect"
import { InstanceState } from "@/effect"
import type { WorkspaceID } from "@/control-plane/schema"
import { Database, eq } from "@/storage"
import type { SessionID } from "./schema"
import { SessionTable } from "./session.sql"
import { SessionOwner } from "./session-owner"

export interface Identity {
  readonly directory: string
  readonly workspaceID?: WorkspaceID
}

export class OwnershipError extends Error {
  constructor(readonly sessionID: SessionID, readonly identity: Identity) {
    super(`Session execution is not owned by the current instance: ${sessionID}`)
    this.name = "OwnershipError"
  }
}

/** The session is running in another live process that shares this database. */
export class OwnedElsewhereError extends OwnershipError {
  constructor(sessionID: SessionID, identity: Identity, readonly pid: number) {
    super(sessionID, identity)
    this.name = "OwnedElsewhereError"
    this.message = `Session ${sessionID} is open in another MiMo process (pid ${pid}). Continue it in that window, or close that window first.`
  }
}

export const captureIdentity: Effect.Effect<Identity> = Effect.gen(function* () {
  const directory = yield* InstanceState.directory
  const workspaceID = yield* InstanceState.workspaceID
  return { directory, workspaceID }
})

export function isOwned(db: Database.TxOrDb, sessionID: SessionID, identity: Identity): boolean {
  const session = db.select({ directory: SessionTable.directory, workspaceID: SessionTable.workspace_id })
    .from(SessionTable).where(eq(SessionTable.id, sessionID)).get()
  if (!session) return false
  return session.workspaceID !== null
    ? session.workspaceID === identity.workspaceID
    : identity.workspaceID === undefined && session.directory === identity.directory
}

export function assertOwnership(db: Database.TxOrDb, sessionID: SessionID, identity: Identity): void {
  if (!isOwned(db, sessionID, identity)) throw new OwnershipError(sessionID, identity)
}

/** Fail unless this process may run the session; adopts it when no live process owns it. */
export function claimProcess(db: Database.TxOrDb, sessionID: SessionID, identity: Identity): void {
  const owner = SessionOwner.claim(db, sessionID)
  if (owner.kind === "other") throw new OwnedElsewhereError(sessionID, identity, owner.pid)
}

/** Instance ownership plus process ownership: everything a run needs before it may start. */
export function claimExecution(db: Database.TxOrDb, sessionID: SessionID, identity: Identity): void {
  assertOwnership(db, sessionID, identity)
  claimProcess(db, sessionID, identity)
}

/**
 * Claim a session a window opens, but only when that window's instance owns it
 * (directory and workspace), like a prompt from that window. Otherwise woken
 * input would run in the session's own directory, outside the one the window
 * was started and trusted in.
 */
export function claimOpened(db: Database.TxOrDb, sessionID: SessionID, identity: Identity): SessionOwner.Status | { readonly kind: "foreign" } {
  if (!isOwned(db, sessionID, identity)) return { kind: "foreign" }
  return SessionOwner.claim(db, sessionID)
}

export * as ExecutionOwnership from "./execution-ownership"
