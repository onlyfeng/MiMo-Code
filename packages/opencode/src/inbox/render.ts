import type { InboxRow } from "./inbox.sql"

export function renderInboxRow(row: InboxRow): string {
  if (row.type === "actor_notification") {
    // Pre-rendered notification text — sender produced the full
    // <actor-notification>...</actor-notification> wrapper.
    const content = row.content as { text?: string }
    return content.text ?? "(no notification body)"
  }
  // Default: type === "text" or unknown — wrap as <inbox> element so
  // the LLM can route by sender; the wrapper format mirrors the
  // <actor-notification> convention from the legacy completion.ts.
  const content = row.content as { text?: string }
  const sender = row.sender_session_id
    ? `${row.sender_session_id}:${row.sender_actor_id ?? "?"}`
    : "system"
  const sentAt = new Date(row.created_at).toISOString()
  return `<inbox from="${sender}" sent_at="${sentAt}">\n${content.text ?? "(empty)"}\n</inbox>`
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

export type ParsedActorNotification = {
  status: "completed" | "failed" | "cancelled" | "stalled"
  description: string
  summary?: string
}

// Inverse of renderActorNotification: recover the structured fields from the
// pre-rendered <actor-notification> text so the TUI can show a card instead of
// the raw wrapper. Pure + exported so it's unit-testable without the renderer.
// Returns null for any text that isn't an actor notification.
export function parseActorNotification(text: string): ParsedActorNotification | null {
  if (!text.trimStart().startsWith("<actor-notification>")) return null
  const header = text.match(/Background actor "(.*?)" \(actor_id: [^)]*\)\s+(completed|failed|was cancelled|stalled)\b/)
  if (!header) return null
  const description = header[1]
  const verb = header[2]
  const status: ParsedActorNotification["status"] =
    verb === "completed" ? "completed" : verb === "failed" ? "failed" : verb === "stalled" ? "stalled" : "cancelled"
  // Prefer the most human-relevant one-liner: Summary > Result > Error.
  const line = (label: string) => text.match(new RegExp(`^${label}:\\s*(.+)$`, "m"))?.[1]?.trim()
  const summary = line("Summary") ?? line("Result") ?? line("Error")
  return summary ? { status, description, summary } : { status, description }
}
