import { Effect } from "effect"
import z from "zod"
import type { Agent } from "@/agent/agent"
import type { Provider } from "@/provider"
import { ModelID, ProviderID } from "@/provider/schema"

const Model = z.object({ providerID: ProviderID.zod, modelID: ModelID.zod })

export const PreviewInput = z.object({
  agent: z.string().optional(),
  model: Model,
  variant: z.string().optional(),
})

export const Selection = Model.extend({ variant: z.string().optional() }).meta({ ref: "ResolvedModelSelection" })

// Both prompt admission and read-only previews use this resolver. In particular,
// agent model groups keep prompt's no-context-provider resolution semantics.
export const resolve = Effect.fn("SessionModelSelection.resolve")(function* (
  provider: Provider.Interface,
  input: {
    agent: Pick<Agent.Info, "model" | "modelRef" | "variant">
    model?: z.infer<typeof Model>
    modelRef?: string
    variant?: string
  },
  fallback: Effect.Effect<z.infer<typeof Model>>,
) {
  const inputModel = input.modelRef
    ? yield* provider
        .resolveModelRef(input.modelRef)
        .pipe(Effect.map((m) => ({ providerID: m.providerID, modelID: m.id })))
    : input.model
  const agentModel = input.agent.modelRef
    ? yield* provider
        .resolveModelRef(input.agent.modelRef)
        .pipe(Effect.map((m) => ({ providerID: m.providerID, modelID: m.id })))
    : input.agent.model
  const model = inputModel ?? agentModel ?? (yield* fallback)
  const same = agentModel && model.providerID === agentModel.providerID && model.modelID === agentModel.modelID
  const full =
    !input.variant && input.agent.variant && same
      ? yield* provider.getModel(model.providerID, model.modelID).pipe(Effect.catchDefect(() => Effect.void))
      : undefined
  return {
    providerID: model.providerID,
    modelID: model.modelID,
    variant:
      input.variant ?? (input.agent.variant && full?.variants?.[input.agent.variant] ? input.agent.variant : undefined),
  }
})

export * as SessionModelSelection from "./model-selection"
