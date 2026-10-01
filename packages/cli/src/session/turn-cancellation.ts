import { Cause, Exit } from "effect"
import { NamedError } from "@mimo-ai/shared/util/error"
import type { MessageV2 } from "./message-v2"

// Keep the existing public UnknownError shape while retaining cancellation
// identity through internal Effect failures and defects.
export class PluginCancelledError extends NamedError.Unknown {}

export function isTurnCancelled(exit: Exit.Exit<MessageV2.WithParts, unknown>) {
  if (Exit.isFailure(exit))
    return (
      Cause.hasInterrupts(exit.cause) ||
      exit.cause.reasons.some(
        (reason) =>
          (Cause.isFailReason(reason) && reason.error instanceof PluginCancelledError) ||
          (Cause.isDieReason(reason) && reason.defect instanceof PluginCancelledError),
      )
    )
  return (
    exit.value.info.role === "assistant" &&
    (exit.value.info.finish === "cancelled" || exit.value.info.error?.name === "MessageAbortedError")
  )
}
