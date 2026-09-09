import { LLMServerScope } from "./scope"
import { Effect } from "effect"
import { AppRuntime } from "@/effect/app-runtime"
import { Provider } from "@/provider"

/** This instance's post-plugin, post-allowlist registry, never the global catalog. */
export async function all(abort?: AbortSignal): Promise<{ ref: string; model: Provider.Model }[]> {
  abort?.throwIfAborted()
  return AppRuntime.runPromise(
    Effect.gen(function* () {
      const providers = yield* (yield* Provider.Service).list()
      return Object.entries(providers).flatMap(([providerID, provider]) =>
        Object.entries(provider.models).map(([modelID, model]) => ({ ref: `${providerID}/${modelID}`, model })),
      )
    }),
    { signal: abort },
  )
}

/** Match upstream discovery: registry membership, not SDK reachability. */
export async function available(abort = new AbortController().signal, scope: LLMServerScope.Scope) {
  return (await all(abort))
    .filter((entry) => LLMServerScope.allows(scope, entry.ref))
    .sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0))
}

export * as LLMServerModels from "./models"
