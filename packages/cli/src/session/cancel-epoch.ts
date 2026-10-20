import type { SessionID } from "./schema"

// Advanced synchronously by SessionRunState.cancel before its first suspension,
// so captured execution snapshots observe cancellation before Runner lookup.
// Session.remove releases the removed session's entry.
const epochs = new Map<SessionID, number>()

export function current(sessionID: SessionID) {
  return epochs.get(sessionID) ?? 0
}

export function advance(sessionID: SessionID) {
  epochs.set(sessionID, current(sessionID) + 1)
}

export function release(sessionID: SessionID) {
  epochs.delete(sessionID)
}
