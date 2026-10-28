import z from "zod"
import { Effect, Exit } from "effect"
import { HttpClient } from "effect/unstable/http"
import { mergeDeep, pipe } from "remeda"
import * as Tool from "../tool"
import * as McpExa from "../mcp-exa"
import * as MimoWebsearch from "./mimo"
import * as NativeWebSearch from "./native"
import * as WebSearchCodex from "./codex"
import { Auth } from "@/auth"
import { Config } from "@/config"
import { Provider, ProviderTransform } from "@/provider"
import { ModelID, ProviderID } from "@/provider/schema"
import { isXiaomiFamilyProvider } from "@/provider/xiaomi-family"
import { Log } from "@/util"
import DESCRIPTION from "./websearch.txt"

const log = Log.create({ service: "websearch" })

const WEBFETCH_FALLBACK =
  "Web search unavailable. Use `webfetch` with a relevant URL instead, or enable the Web Search plugin at https://platform.xiaomimimo.com/console/plugin."
const MAX_TIMEOUT = 120 * 1000 // 2 minutes
const FALLBACK_TIMEOUT = 60 * 1000

/**
 * Delay for a fallback search's AbortSignal.timeout: Node requires a non-negative
 * integer, and a non-positive model-supplied timeout means "use the default".
 */
export function fallbackTimeout(ms: number | undefined) {
  return ms !== undefined && ms > 0 ? Math.ceil(ms) : FALLBACK_TIMEOUT
}

const Parameters = z.object({
  query: z.string().describe("Websearch query"),
  numResults: z.number().optional().describe("Number of search results to return (default: 8)"),
  timeout: z.number().describe("Optional timeout in seconds (max 120)").optional(),
  livecrawl: z
    .enum(["fallback", "preferred"])
    .optional()
    .describe(
      "Live crawl mode - 'fallback': use live crawling as backup if cached content unavailable, 'preferred': prioritize live crawling (default: 'fallback')",
    ),
  type: z
    .enum(["auto", "fast", "deep"])
    .optional()
    .describe("Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search"),
  contextMaxCharacters: z
    .number()
    .optional()
    .describe("Maximum characters for context string optimized for LLMs (default: 10000)"),
})

export const WebSearchTool = Tool.define(
  "websearch",
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    const auth = yield* Auth.Service
    const config = yield* Config.Service
    const provider = yield* Provider.Service

    // One configured `websearch.fallback` model (DC-WEBSEARCH-001). Any entry that
    // does not resolve to a Responses model or a declared variant is skipped.
    const fallbackSearch = Effect.fn("WebSearchTool.fallbackSearch")(function* (
      entry: NativeWebSearch.FallbackEntry,
      query: string,
      ctx: Tool.Context,
      timeout: number,
    ) {
      const ref = `${entry.providerID}/${entry.modelID}`
      const resolved = yield* Effect.exit(
        Effect.gen(function* () {
          const model = yield* provider.getModel(ProviderID.make(entry.providerID), ModelID.make(entry.modelID))
          const variant = entry.variant ? model.variants?.[entry.variant] : {}
          if (model.api.npm !== "@ai-sdk/openai" || !variant) return undefined
          const info = yield* provider.getProvider(model.providerID)
          const language = yield* provider.getLanguage(model)
          const options = pipe(
            ProviderTransform.options({ model, sessionID: ctx.sessionID, providerOptions: info.options }),
            mergeDeep(model.options),
            mergeDeep(variant),
          )
          return { model, language, providerOptions: ProviderTransform.providerOptions(model, options) }
        }),
      )
      if (Exit.isFailure(resolved) || !resolved.value) {
        log.warn("skipping websearch fallback entry", { ref, variant: entry.variant })
        return undefined
      }
      const { model, language, providerOptions } = resolved.value
      return yield* WebSearchCodex.search({
        language,
        providerOptions,
        headers: model.headers,
        query,
        abort: AbortSignal.any([ctx.abort, AbortSignal.timeout(timeout)]),
      })
    })

    return {
      get description() {
        return DESCRIPTION.replace("{{year}}", new Date().getFullYear().toString())
      },
      parameters: Parameters,
      execute: (params: z.infer<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "websearch",
            patterns: [params.query],
            always: ["*"],
            metadata: {
              query: params.query,
              numResults: params.numResults,
              livecrawl: params.livecrawl,
              type: params.type,
              contextMaxCharacters: params.contextMaxCharacters,
              timeout: params.timeout,
            },
          })

          const model = (ctx.extra as { model?: Provider.Model })?.model
          const timeout = params.timeout === undefined ? undefined : Math.min(params.timeout * 1000, MAX_TIMEOUT)

          // API and token-plan credentials are stored separately, so the key must
          // come from the model's own provider rather than a hardcoded `xiaomi`.
          const gatewayModel = model && isXiaomiFamilyProvider(model.providerID) ? model : undefined
          let served: { output: string; by: string } | undefined
          if (gatewayModel) {
            const output = yield* Effect.catchCause(
              Effect.gen(function* () {
                const info = yield* auth.get(gatewayModel.providerID)
                if (!info || info.type !== "api") return undefined
                return yield* MimoWebsearch.call(
                  http,
                  gatewayModel.api.url,
                  info.key,
                  params.query,
                  gatewayModel.api.id,
                  timeout ?? "30 seconds",
                )
              }),
              () => Effect.succeed(undefined),
            )
            if (output) served = { output, by: "xiaomi" }
          }
          for (const entry of served ? [] : NativeWebSearch.fallbackEntries((yield* config.get()).websearch)) {
            const output = yield* fallbackSearch(entry, params.query, ctx, fallbackTimeout(timeout))
            if (output) {
              served = { output, by: `${entry.providerID}/${entry.modelID}` }
              break
            }
          }
          if (!served && !gatewayModel) {
            const output = yield* McpExa.call(
              http,
              "web_search_exa",
              McpExa.SearchArgs,
              {
                query: params.query,
                type: params.type || "auto",
                numResults: params.numResults || 8,
                livecrawl: params.livecrawl || "fallback",
                contextMaxCharacters: params.contextMaxCharacters,
              },
              timeout ?? "25 seconds",
            )
            if (output) served = { output, by: "exa" }
          }

          return {
            output: served?.output ?? WEBFETCH_FALLBACK,
            title: `Web search: ${params.query}`,
            metadata: served ? { servedBy: served.by } : {},
          }
        }).pipe(Effect.orDie),
    }
  }),
)
