import type { SessionID } from "./schema"

export const CURRENT_SESSION_ID_PLACEHOLDER = "{current_session_id}"

export function resolveCurrentSessionPath(input: string, sessionID: SessionID) {
  return input.replaceAll(CURRENT_SESSION_ID_PLACEHOLDER, sessionID)
}
