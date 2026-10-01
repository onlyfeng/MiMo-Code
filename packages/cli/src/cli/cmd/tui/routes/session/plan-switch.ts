import type { ToolPart } from "@mimo-ai/sdk/v2"
import type { useEvent } from "../../context/event"

export function planSwitchTarget(
  part: Pick<ToolPart, "tool" | "state"> & Partial<Pick<ToolPart, "sessionID" | "callID">>,
): "build" | undefined {
  if (part.tool === "plan_exit" && part.state.status === "completed" && part.state.metadata.switched === true)
    return "build"
  if ((part.tool !== "exec" && part.tool !== "plan_exit") || part.state.status === "pending") return undefined
  const receipt: unknown = part.state.metadata?.plan_exit
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return undefined
  if (!("version" in receipt) || receipt.version !== 1) return undefined
  if (!("agent" in receipt) || receipt.agent !== "build") return undefined
  if (!("sessionID" in receipt) || !part.sessionID || receipt.sessionID !== part.sessionID) return undefined
  if (!("callID" in receipt) || typeof receipt.callID !== "string" || !part.callID) return undefined
  if (part.tool === "plan_exit" && receipt.callID !== part.callID) return undefined
  if (part.tool === "exec" && (
    !receipt.callID.startsWith(`${part.callID}:`) || !/^[1-9]\d*$/.test(receipt.callID.slice(part.callID.length + 1))
  )) return undefined
  if (!("messageID" in receipt) || typeof receipt.messageID !== "string" || !receipt.messageID.startsWith("msg"))
    return undefined
  return "build"
}

export function bindPlanSwitch(
  event: Pick<ReturnType<typeof useEvent>, "on">,
  sessionID: () => string,
  switchAgent: (agent: "build") => void,
) {
  const seen = new Set<string>()
  let current: string | undefined
  return event.on("message.part.updated", (evt) => {
    if (current !== sessionID()) {
      current = sessionID()
      seen.clear()
    }
    const part = evt.properties.part
    if (part.type !== "tool" || part.sessionID !== current || seen.has(part.id)) return
    const agent = planSwitchTarget(part)
    if (!agent) return
    seen.add(part.id)
    switchAgent(agent)
  })
}
