import z from "zod"
import type { LanguageModel } from "ai"
import { mergeDeep } from "remeda"
import { ProviderTransform, type Provider } from "../provider"

export class ProviderOptionsError extends Error {
  readonly status = 400
}

const effort = z.enum(["none", "minimal", "low", "medium", "high", "xhigh"])
const verbosity = z.enum(["low", "medium", "high"])
const toggle = z.strictObject({ type: z.enum(["enabled", "disabled"]) })
const thinking = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("enabled"), budgetTokens: z.number().int().min(1024).max(31999) }),
  z.strictObject({ type: z.literal("disabled") }),
  z.strictObject({ type: z.literal("adaptive"), display: z.enum(["omitted", "summarized"]).optional() }),
])
const google = z.strictObject({
  thinkingConfig: z
    .strictObject({
      thinkingBudget: z.number().int().min(-1).optional(),
      includeThoughts: z.boolean().optional(),
      thinkingLevel: z.enum(["minimal", "low", "medium", "high"]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0)
    .optional(),
})

function fail(message: string): never {
  throw new ProviderOptionsError(`provider_options: ${message}`)
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function parse(schema: z.ZodType, value: Record<string, unknown>) {
  const result = schema.safeParse(value)
  if (!result.success) fail("unsupported field or value for this model transport")
  return object(result.data)
}

function family(model: Provider.Model, language: LanguageModel) {
  if (typeof language === "string") return fail("unsupported model transport")
  const npm = model.api.npm
  if (["@ai-sdk/openai", "@ai-sdk/azure"].includes(npm) && /\.(chat|responses)$/.test(language.provider))
    return "openai"
  if (npm === "@ai-sdk/anthropic" && ["anthropic.messages", model.providerID].includes(language.provider))
    return "anthropic"
  if (
    (npm === "@ai-sdk/google" && ["google.generative-ai", model.providerID].includes(language.provider)) ||
    (npm === "@ai-sdk/google-vertex" && language.provider === "google.vertex.chat")
  )
    return "google"
  if (npm === "@ai-sdk/openai-compatible" && language.provider === `${model.providerID}.chat`) {
    if (model.providerID === "xiaomi" && /^mimo-v2\.5(?:-pro)?$/.test(model.api.id)) return "mimo"
    if (model.providerID === "deepseek" && /^deepseek-v4-(pro|flash)$/.test(model.api.id)) return "deepseek"
  }
  return fail("unsupported provider, model or transport")
}

// These are the installed Anthropic serializer's caps, which it otherwise
// silently applies after adding thinkingBudget to maxOutputTokens.
function anthropicCap(model: Provider.Model) {
  const id = model.api.id
  const sdk = /claude-(opus|sonnet)-4-[678](?:-|$)/.test(id)
    ? 128000
    : /claude-(opus|sonnet|haiku)-4-5(?:-|$)/.test(id) || /claude-sonnet-4(?:-|$)/.test(id)
      ? 64000
      : /claude-opus-4(?:-|$)/.test(id)
        ? 32000
        : undefined
  const configured = Number.isSafeInteger(model.limit.output) && model.limit.output > 0 ? model.limit.output : undefined
  return sdk !== undefined && configured !== undefined ? Math.min(sdk, configured) : (sdk ?? configured ?? 4096)
}

/** Recheck the combined wire limit after trusted hooks have changed parameters. */
export function outputLimit(model: Provider.Model, options: Record<string, unknown>, max: number, explicit: boolean) {
  if (model.api.npm !== "@ai-sdk/anthropic") return max
  const mode = object(options.thinking)
  const budget = mode.type === "enabled" ? mode.budgetTokens : 0
  if (
    typeof budget !== "number" ||
    !Number.isSafeInteger(budget) ||
    (mode.type === "enabled" && (budget < 1024 || budget > 31999))
  )
    fail("invalid effective thinking budget")
  const remaining = anthropicCap(model) - budget
  if (!Number.isSafeInteger(remaining) || remaining <= 0 || !Number.isSafeInteger(max) || max <= 0)
    fail("invalid model output capacity")
  if (explicit && max > remaining) fail("output and thinking budget exceed the model capacity")
  return Math.min(max, remaining)
}

function validateGoogle(model: Provider.Model, options: Record<string, unknown>) {
  const config = object(options.thinkingConfig)
  const id = model.api.id
  const v25 = /^gemini-2\.5-(pro|flash-lite|flash)(?:-preview(?:-[\d-]+)?)?$/.exec(id)?.[1]
  const v3 = /^gemini-(3|3\.1)-(pro|flash)(?:-preview)?$/.exec(id)
  if (!v25 && (!v3 || (v3[1] === "3.1" && v3[2] !== "pro"))) fail("thinkingConfig is not supported for this model")
  if (config.thinkingBudget != null && config.thinkingLevel != null)
    fail("thinkingBudget and thinkingLevel are mutually exclusive")
  if (config.thinkingBudget != null) {
    if (!v25) fail("this model requires thinkingLevel")
    const budget = config.thinkingBudget
    const max = v25 === "pro" ? 32768 : 24576
    const min = v25 === "pro" ? 128 : v25 === "flash-lite" ? 512 : 0
    if (
      typeof budget !== "number" ||
      !Number.isSafeInteger(budget) ||
      (budget !== -1 && !(budget === 0 && v25 !== "pro") && (budget < min || budget > max))
    )
      fail("thinkingBudget is outside this model's range")
  }
  if (config.thinkingLevel != null) {
    const levels =
      v3?.[2] === "flash" && v3[1] === "3"
        ? ["minimal", "low", "medium", "high"]
        : v3?.[1] === "3.1" && v3[2] === "pro"
          ? ["low", "medium", "high"]
          : v3?.[1] === "3" && v3[2] === "pro"
            ? ["low", "high"]
            : []
    if (!levels.includes(String(config.thinkingLevel))) fail("thinkingLevel is not supported for this model")
  }
}

/** Applies only to nonempty client options. Old requests retain their exact merge path. */
export function prepare(input: {
  model: Provider.Model
  language: LanguageModel
  defaults: Record<string, unknown>
  client: Record<string, unknown>
  variant?: Record<string, unknown>
  maxOutputTokens: number
  explicitOutput: boolean
}) {
  const model = input.model
  const kind = family(model, input.language)
  const client =
    kind === "openai"
      ? parse(
          z.strictObject({
            reasoningEffort: effort.optional(),
            reasoningSummary: z.enum(["auto", "detailed"]).optional(),
            textVerbosity: verbosity.optional(),
          }),
          input.client,
        )
      : kind === "anthropic"
        ? parse(
            z.strictObject({
              thinking: thinking.optional(),
              effort: z.enum(["low", "medium", "high", "xhigh", "max"]).optional(),
            }),
            input.client,
          )
        : kind === "google"
          ? parse(google, input.client)
          : kind === "mimo"
            ? parse(z.strictObject({ thinking: toggle.optional() }), input.client)
            : parse(
                z.strictObject({
                  thinking: toggle.optional(),
                  reasoningEffort: z.enum(["low", "high", "max"]).optional(),
                }),
                input.client,
              )
  if (!model.capabilities.reasoning && Object.keys(client).some((key) => key !== "textVerbosity"))
    fail("this model does not support reasoning")

  // A mode change replaces the entire subtree: disabled/adaptive must not retain
  // a prior enabled budget, and a Gemini level must not retain a prior budget.
  function overlay(base: Record<string, unknown>, next: Record<string, unknown>) {
    const merged = mergeDeep(base, next)
    if (Object.hasOwn(next, "thinking")) merged.thinking = structuredClone(next.thinking)
    if (Object.hasOwn(next, "thinkingConfig")) {
      const config = { ...object(base.thinkingConfig), ...object(next.thinkingConfig) }
      if (Object.hasOwn(object(next.thinkingConfig), "thinkingBudget")) delete config.thinkingLevel
      if (Object.hasOwn(object(next.thinkingConfig), "thinkingLevel")) delete config.thinkingBudget
      merged.thinkingConfig = config
    }
    return merged
  }
  const options = overlay(overlay(structuredClone(input.defaults), client), structuredClone(input.variant ?? {}))
  if (kind === "openai") {
    if (typeof input.language === "string") return fail("unsupported model transport")
    if (input.language.provider.endsWith(".chat") && client.reasoningSummary != null)
      fail("reasoningSummary requires Responses")
    const recognized =
      /^(o1|o3|o4-mini)/.test(model.api.id) ||
      (model.api.id.startsWith("gpt-5") && !model.api.id.startsWith("gpt-5-chat"))
    if ((client.reasoningEffort != null || client.reasoningSummary != null) && !(options.forceReasoning ?? recognized))
      fail("the SDK cannot apply reasoning options to this model")
    if (client.textVerbosity != null && !model.api.id.startsWith("gpt-5") && options.forceReasoning !== true)
      fail("textVerbosity is not supported for this model")
  }
  if (kind === "google") {
    validateGoogle(model, client)
    validateGoogle(model, options)
  }
  if (kind === "mimo" || kind === "deepseek") {
    if (input.variant?.reasoningEffort != null) {
      const valid = kind === "mimo" ? ["low", "medium", "high"] : ["low", "high", "max"]
      if (!valid.includes(String(input.variant.reasoningEffort))) fail("variant effort is not supported for this model")
      options.thinking = { type: "enabled" }
    }
    if (kind === "mimo") delete options.reasoningEffort
    if (kind === "deepseek" && object(options.thinking).type === "disabled" && options.reasoningEffort != null) {
      if (client.reasoningEffort != null) fail("reasoningEffort conflicts with disabled thinking")
      delete options.reasoningEffort
    }
  }
  if (kind !== "anthropic") return { options, maxOutputTokens: input.maxOutputTokens }
  if (!/^claude-(?:3-7-sonnet|sonnet-4(?:-[56])?|opus-4(?:-[15678])?|haiku-4-5)(?:-\d{8}|-latest)?$/.test(model.api.id))
    fail("thinking is not supported for this model")
  const adaptive = Object.values(ProviderTransform.variants(model)).filter(
    (value) => object(value.thinking).type === "adaptive",
  )
  const validate = (value: Record<string, unknown>) => {
    const mode = object(value.thinking)
    if (mode.type === "adaptive" && !adaptive.length) fail("adaptive thinking is not supported for this model")
    if (mode.type === "enabled" && /claude-opus-4-[678](?:-|$)/.test(model.api.id))
      fail("this model requires adaptive thinking")
    if (value.effort != null && !adaptive.some((variant) => variant.effort === value.effort))
      fail("effort is not supported for this model")
    if (
      mode.type === "enabled" &&
      (typeof mode.budgetTokens !== "number" ||
        !Number.isSafeInteger(mode.budgetTokens) ||
        mode.budgetTokens < 1024 ||
        mode.budgetTokens > Math.min(31999, anthropicCap(model) - 1))
    )
      fail("thinking budget exceeds this model's output capacity")
  }
  validate(client)
  validate(options)
  return { options, maxOutputTokens: outputLimit(model, options, input.maxOutputTokens, input.explicitOutput) }
}
