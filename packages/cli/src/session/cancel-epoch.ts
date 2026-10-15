import type { SessionID } from "./schema"

// Advanced synchronously by SessionRunState.cancel. An inbox wake records the
// value when it is scheduled and Runner admission refuses it once the value has
// moved, so a cancel issued after delivery but before the receiver's Runner
// admits the wake still stops it. Session IDs are unique per process, so one
// counter per cancelled session is the whole footprint.
const epochs = new Map<SessionID, number>()

export function current(sessionID: SessionID) {
  return epochs.get(sessionID) ?? 0
}

export function advance(sessionID: SessionID) {
  epochs.set(sessionID, current(sessionID) + 1)
}
