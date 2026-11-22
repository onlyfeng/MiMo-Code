import { compareUtf8Bytes } from "@mimo-ai/shared/util/encode"

type MessagePosition = { id: string; time: { created: number } }

/** Match the database's (creation time, BINARY id) chronology, including caller-supplied ids. */
export function compareMessageOrder(left: MessagePosition, right: MessagePosition) {
  if (left.time.created !== right.time.created) return left.time.created - right.time.created
  return compareUtf8Bytes(left.id, right.id)
}
