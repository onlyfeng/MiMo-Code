import { Context } from "effect"
import type { InstanceContext } from "@/project/instance"

export interface RunDisposalState {
  readonly disposing: boolean
  readonly instance?: InstanceContext
}

export const isRunDisposing = (state: RunDisposalState) => state.disposing || state.instance?.disposing === true

export const RunDisposal = Context.Reference<RunDisposalState>("@opencode/SessionRunDisposal", {
  defaultValue: () => ({ disposing: false }),
})
