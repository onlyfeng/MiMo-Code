import { Effect } from "effect"
import { AppRuntime } from "@/effect/app-runtime"
import { Provider } from "@/provider"
import { resolveTransport } from "@/audio/service"

export type Capability = "chat" | "speech" | "transcription"
export type Candidate = { ref: string; model: Provider.Model; dedicated: boolean }

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

function declared(capability: Capability, model: Provider.Model) {
  const kind = Provider.modelKind(model)
  if (capability === "chat") return kind === "language"
  if (capability === "speech") return kind === "speech"
  return kind === "transcription" || (kind === "language" && model.capabilities.input.audio)
}

async function candidate(
  capability: Capability,
  entry: { ref: string; model: Provider.Model },
  abort: AbortSignal,
): Promise<Candidate | undefined> {
  abort.throwIfAborted()
  if (!declared(capability, entry.model)) return undefined
  const transport = await (
    capability === "chat"
      ? AppRuntime.runPromise(
          Effect.gen(function* () {
            return yield* (yield* Provider.Service).getLanguage(entry.model)
          }),
          { signal: abort },
        )
      : resolveTransport(entry.model, capability, abort)
  ).catch(() => {
    // Cancellation must remain cancellation, not a misleading empty result.
    abort.throwIfAborted()
    return undefined
  })
  if (!transport) return undefined
  return { ...entry, dedicated: capability === "chat" || Provider.modelKind(entry.model) !== "language" }
}

/** Dedicated model, configured default, then stable ref order, as upstream. */
export async function resolve(capability: Capability, abort = new AbortController().signal): Promise<Candidate[]> {
  const listed = await all(abort)
  const preferred = await AppRuntime.runPromise(
    Effect.gen(function* () {
      const model = yield* (yield* Provider.Service).defaultModel()
      return `${model.providerID}/${model.modelID}`
    }),
    { signal: abort },
  ).catch(() => {
    abort.throwIfAborted()
    return undefined
  })
  const found = await Promise.all(listed.map((entry) => candidate(capability, entry, abort)))
  return found
    .filter((entry): entry is Candidate => entry !== undefined)
    .sort((a, b) => {
      if (a.dedicated !== b.dedicated) return a.dedicated ? -1 : 1
      if (a.ref === b.ref) return 0
      if (a.ref === preferred) return -1
      if (b.ref === preferred) return 1
      return a.ref.localeCompare(b.ref)
    })
}

/** Internal records only: scope precedes factories, HTTP callers must project refs. */
export async function available(
  abort = new AbortController().signal,
  models?: readonly string[],
): Promise<{ ref: string; model: Provider.Model }[]> {
  const found = await Promise.all(
    (await all(abort))
      .filter((entry) => !models || models.includes(entry.ref))
      .map(async (entry) => {
        const kind = Provider.modelKind(entry.model)
        if (kind === "language") {
          return (await candidate("chat", entry, abort)) || (await candidate("transcription", entry, abort))
            ? entry
            : undefined
        }
        return (await candidate(kind, entry, abort)) ? entry : undefined
      }),
  )
  return found
    .filter((entry): entry is { ref: string; model: Provider.Model } => entry !== undefined)
    .sort((a, b) => a.ref.localeCompare(b.ref))
}

export function explain(capability: Capability, models: { ref: string; model: Provider.Model }[]) {
  const found = models.filter((entry) => declared(capability, entry.model))
  if (!found.length) {
    return capability === "chat"
      ? "no chat model is configured"
      : `no ${capability} model is configured; declare one with modalities, e.g. ` +
          (capability === "speech"
            ? '"modalities": { "input": ["text"], "output": ["audio"] }'
            : '"modalities": { "input": ["audio"], "output": ["text"] }')
  }
  return (
    `${found.length} ${capability} model(s) are configured but none is reachable through this server: ` +
    `${found.map((entry) => `${entry.ref} (${entry.model.api.npm})`).join(", ")}. ` +
    (capability === "chat"
      ? "Check that the configured SDK and language factory support this model"
      : "Check the supported provider transport and explicit HTTP(S) baseURL; native speech requires an available speech factory")
  )
}

export * as LLMServerCapability from "./capability"
