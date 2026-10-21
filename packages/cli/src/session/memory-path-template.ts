import type { SessionID } from "./schema"

// Legacy placeholder: new memory instructions name `<session_id>` and deliver
// the real path through the memory paths reminder, but system prompts frozen in
// a session's prefix snapshot before that change still tell the model to keep
// this segment verbatim, so file tools keep resolving it.
export const CURRENT_SESSION_ID_PLACEHOLDER = "{current_session_id}"

export function resolveCurrentSessionPath(input: string, sessionID: SessionID) {
  return input.replaceAll(CURRENT_SESSION_ID_PLACEHOLDER, sessionID)
}
