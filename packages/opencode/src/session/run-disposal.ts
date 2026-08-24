import { Context } from "effect"

export const RunDisposal = Context.Reference<{ readonly disposing: boolean }>("@opencode/SessionRunDisposal", {
  defaultValue: () => ({ disposing: false }),
})
