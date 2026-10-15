import type { SessionID } from "./schema"

// Advanced synchronously by SessionRunState.cancel. An inbox wake records the
// value when it is scheduled and Runner admission refuses it once the value has
// moved, so a cancel issued after delivery but before the receiver's Runner
// admits the wake still stops it. Session.remove releases a session's entry,
// deferred while a scheduled wake still holds it: dropping it earlier would
// read as the initial epoch again and admit a wake recorded before a cancel.
const epochs = new Map<SessionID, number>()
const holds = new Map<SessionID, number>()
const removed = new Set<SessionID>()

export function current(sessionID: SessionID) {
  return epochs.get(sessionID) ?? 0
}

export function advance(sessionID: SessionID) {
  epochs.set(sessionID, current(sessionID) + 1)
}

export function hold(sessionID: SessionID) {
  holds.set(sessionID, (holds.get(sessionID) ?? 0) + 1)
  let held = true
  return () => {
    if (!held) return
    held = false
    const left = (holds.get(sessionID) ?? 1) - 1
    if (left > 0) {
      holds.set(sessionID, left)
      return
    }
    holds.delete(sessionID)
    if (removed.delete(sessionID)) epochs.delete(sessionID)
  }
}

export function release(sessionID: SessionID) {
  if (holds.has(sessionID)) removed.add(sessionID)
  else epochs.delete(sessionID)
}
