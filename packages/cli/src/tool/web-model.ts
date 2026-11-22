import { Effect } from "effect"
import { mergeDeep, pipe } from "remeda"
import type { Provider } from "@/provider"
import { ModelID, ProviderID } from "@/provider/schema"
import * as ProviderTransform from "@/provider/transform"

export type WebModelEntry = { providerID: string; modelID: string; variant?: string }

export function parseWebModelRef(ref: string): WebModelEntry | undefined {
  const index = ref.indexOf("/")
  if (index <= 0 || index === ref.length - 1) return undefined
  return { providerID: ref.slice(0, index), modelID: ref.slice(index + 1) }
}

export const prepareWebModel = Effect.fn("WebModel.prepare")(function* (
  provider: Provider.Interface,
  entry: WebModelEntry,
  sessionID: string,
  supports: (npm: string) => boolean,
) {
  const model = yield* provider.getModel(ProviderID.make(entry.providerID), ModelID.make(entry.modelID))
  const variant = entry.variant ? model.variants?.[entry.variant] : {}
  if (!variant || !supports(model.api.npm)) return undefined
  const info = yield* provider.getProvider(model.providerID)
  const language = yield* provider.getLanguage(model)
  const options = pipe(
    ProviderTransform.options({ model, sessionID, providerOptions: info.options }),
    mergeDeep(model.options),
    mergeDeep(variant),
  )
  return { model, language, providerOptions: ProviderTransform.providerOptions(model, options) }
})
