import type { InboxRow } from "./inbox.sql"
import { capUtf8TextByBytes, MODEL_VISIBLE_TEXT_CAP_BYTES } from "../util/text-truncate"

const ACTOR_NOTIFICATION_OPEN = "<actor-notification>\n"
const ACTOR_NOTIFICATION_CLOSE = "\n</actor-notification>"

function capInboxText(text: string) {
  return capUtf8TextByBytes(text, MODEL_VISIBLE_TEXT_CAP_BYTES, "inbox content")
}

function capActorNotificationText(text: string) {
  if (text.startsWith(ACTOR_NOTIFICATION_OPEN) && text.endsWith(ACTOR_NOTIFICATION_CLOSE)) {
    const body = text.slice(ACTOR_NOTIFICATION_OPEN.length, -ACTOR_NOTIFICATION_CLOSE.length)
    return `${ACTOR_NOTIFICATION_OPEN}${capInboxText(body)}${ACTOR_NOTIFICATION_CLOSE}`
  }
  return capInboxText(text)
}

export function renderInboxRow(row: InboxRow): string {
  if (row.type === "actor_notification") {
    // Pre-rendered notification text — sender produced the full
    // <actor-notification>...</actor-notification> wrapper.
    const content = row.content as { text?: string }
    return capActorNotificationText(content.text ?? "(no notification body)")
  }
  // Default: type === "text" or unknown — wrap as <inbox> element so
  // the LLM can route by sender; the wrapper format mirrors the
  // <actor-notification> convention from the legacy completion.ts.
  const content = row.content as { text?: string }
  const sender = row.sender_session_id
    ? `${row.sender_session_id}:${row.sender_actor_id ?? "?"}`
    : "system"
  const sentAt = new Date(row.created_at).toISOString()
  return `<inbox from="${sender}" sent_at="${sentAt}">\n${capInboxText(content.text ?? "(empty)")}\n</inbox>`
}

export function renderActorNotification(event: {
  actorID: string
  description: string
  status: "completed" | "failed" | "cancelled"
  result?: string
  error?: string
  reportedStatus?: string
  reportedSummary?: string
}): string {
  const header = `Background actor "${event.description}" (actor_id: ${event.actorID})`
  if (event.status === "completed") {
    const statusLine = `Status: ${event.reportedStatus ?? "unknown"}`
    const summaryLine = event.reportedSummary ? `\nSummary: ${event.reportedSummary}` : ""
    return `<actor-notification>\n${header} completed.\n${statusLine}${summaryLine}\nResult: ${event.result ?? "(no output)"}\n</actor-notification>`
  }
  if (event.status === "failed") {
    return `<actor-notification>\n${header} failed.\nError: ${event.error ?? "unknown"}\n</actor-notification>`
  }
  return `<actor-notification>\n${header} was cancelled.\n</actor-notification>`
}
