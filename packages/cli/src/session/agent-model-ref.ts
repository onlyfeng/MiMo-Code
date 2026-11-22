// Late-bound resolver for the model an agent is configured to run on.
//
// SessionCheckpoint has neither Provider.Service nor Agent.Service, for the
// layer-cycle reason given in prefix-capture-ref.ts. SessionPrompt.layer holds
// both and registers this resolver on initialisation; tryStartCheckpointWriter
// reads it at call time to let a no-fork writer run on its own configured model
// (FC-047).
import type { Effect } from "effect"

export interface AgentModel {
  readonly providerID: string
  readonly modelID: string
  /** The model's usable window (`overflow.usable`) under the current config. */
  readonly usable: number
}

/**
 * The configured model of `agentName` — `agent.<name>.model` in config, a literal
 * `provider/model` or a model-group name — or undefined when the agent names no
 * model or it does not resolve.
 */
export type AgentModelResolveFn = (agentName: string) => Effect.Effect<AgentModel | undefined>

export const agentModelRef: { current: AgentModelResolveFn | undefined } = { current: undefined }
