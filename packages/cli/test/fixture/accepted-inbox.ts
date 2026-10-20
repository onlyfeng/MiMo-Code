import { Bus } from "../../src/bus"
import type { GlobalEvent } from "../../src/bus/global"
import { ReceiptUpdated } from "../../src/inbox/events"
import { InboxTable, type InboxRow } from "../../src/inbox/inbox.sql"
import { MessageV2 } from "../../src/session/message-v2"
import { Database, eq } from "../../src/storage"

export function receiptText(row: Pick<InboxRow, "receiver_session_id" | "input_message_id"> | undefined) {
  if (!row?.input_message_id) return ""
  return MessageV2.get({ sessionID: row.receiver_session_id, messageID: row.input_message_id }).parts
    .flatMap((part) => part.type === "text" ? [part.text] : []).join("\n")
}

function properties(receiptId: string) {
  const row = Database.use((db) => db.select().from(InboxTable).where(eq(InboxTable.id, receiptId)).get())
  if (!row) return undefined
  return {
    type: row.type, inboxID: row.id, receiverSessionID: row.receiver_session_id, receiverActorID: row.receiver_actor_id,
    senderSessionID: row.sender_session_id ?? undefined, senderActorID: row.sender_actor_id ?? undefined,
  }
}

type Arrival = { properties: NonNullable<ReturnType<typeof properties>> }

export function observeAcceptedInbox(bus: Bus.Interface, callback: (event: Arrival) => void) {
  return bus.subscribeCallback(ReceiptUpdated, (event) => {
    if (event.properties.state !== "accepted") return
    const value = properties(event.properties.receiptId)
    if (value) callback({ properties: value })
  })
}

export function acceptedInboxEvent(event: GlobalEvent) {
  if (event.payload.type !== ReceiptUpdated.type || event.payload.properties.state !== "accepted") return undefined
  return properties(event.payload.properties.receiptId)
}
