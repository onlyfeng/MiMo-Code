import { Context } from "effect"
import type { RunDisposalState } from "@/session/run-disposal"

/** Sender generation carried separately from the receiver's own run lifetime. */
export const WakeSourceDisposal = Context.Reference<RunDisposalState | undefined>("@opencode/InboxWakeSourceDisposal", {
  defaultValue: () => undefined,
})
