import { MessageV2 } from "./message-v2"
import { isRecord } from "@/util/record"

/** Read-only transcript evidence for reminders, pruning and summaries. These
 * views reuse the persisted parent's ID; they are never persisted or used for
 * tool admission. Only terminal children of the versioned exec record qualify.
 */
export function observedToolParts<T extends MessageV2.Part>(part: T): (T | MessageV2.ToolPart)[] {
  if (part.type !== "tool" || part.tool !== "exec" || !["completed", "error"].includes(part.state.status)) return [part]
  const metadata = part.state.status === "completed" || part.state.status === "error" ? part.state.metadata : undefined
  if (metadata?.exec_schema !== 1 || !Array.isArray(metadata.sub_parts)) return [part]
  const seen = new Set<string>()
  return [
    part,
    ...metadata.sub_parts.slice(0, 500).flatMap((item) => {
      if (
        !isRecord(item) ||
        item.type !== "tool" ||
        item.tool === "exec" ||
        !Number.isSafeInteger(item.seq) ||
        Number(item.seq) < 1 ||
        item.callID !== `${part.callID}:${item.seq}` ||
        !isRecord(item.state) ||
        !["completed", "error"].includes(String(item.state.status)) ||
        (isRecord(item.state.metadata) &&
          (item.state.metadata.cancelled === true || item.state.metadata.rejected === true)) ||
        seen.has(item.callID)
      )
        return []
      // Nested media travel through the real outer FileParts, not this analytics view.
      const parsed = MessageV2.ToolPart.safeParse({
        ...part,
        callID: item.callID,
        tool: item.tool === "exec_command" ? "bash" : item.tool,
        state: { ...item.state, attachments: undefined },
      })
      if (!parsed.success) return []
      seen.add(item.callID)
      return [parsed.data]
    }),
  ]
}
