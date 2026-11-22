import { Effect } from "effect"
import type { Agent } from "@/agent/agent"
import type { Provider } from "@/provider"
import type { ModelID, ProviderID } from "@/provider/schema"

type Model = { providerID: ProviderID; modelID: ModelID; variant?: string }

export const resolve = Effect.fn("SessionModelSelection.resolve")(function* (
  provider: Provider.Interface,
  input: {
    agent: Pick<Agent.Info, "model" | "modelRef" | "variant">
    model?: Pick<Model, "providerID" | "modelID">
    modelRef?: string
    variant?: string
  },
  fallback: Effect.Effect<Model>,
) {
  const byRef = (ref: string) =>
    provider.resolveModelRef(ref).pipe(Effect.map((model) => ({ providerID: model.providerID, modelID: model.id })))
  const inputModel = input.modelRef ? yield* byRef(input.modelRef) : input.model
  const agentModel = input.agent.modelRef ? yield* byRef(input.agent.modelRef) : input.agent.model
  const model: Model = inputModel ?? agentModel ?? (yield* fallback)
  const { providerID, modelID } = model
  if (input.variant != null) return { providerID, modelID, variant: input.variant }

  // An explicitly named model uses its default. Only the agent's own model
  // or a model continued from the previous turn can supply an implicit variant.
  const sameAgentModel = agentModel?.providerID === providerID && agentModel.modelID === modelID
  const continued = !inputModel && !agentModel ? model.variant : undefined
  const candidate = sameAgentModel ? input.agent.variant : continued
  const full = candidate
    ? yield* provider.getModel(providerID, modelID).pipe(Effect.catchDefect(() => Effect.void))
    : undefined
  return { providerID, modelID, variant: candidate && full?.variants?.[candidate] ? candidate : undefined }
})

export * as SessionModelSelection from "./model-selection"
