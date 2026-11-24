import { describe, expect, test } from "bun:test"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { ProviderTransform } from "../../src/provider"

/**
 * Wire-level check of the `xhigh` thinking level for Gemini 4 Neon and Hydrogen.
 *
 * The pinned @ai-sdk/google 3.0.73 validates `thinkingConfig.thinkingLevel` against an
 * enum before it builds a request; the repo patch adds `xhigh` to that enum, as the SDK
 * itself does from 3.0.146. This drives the real adapter with the provider options
 * ProviderTransform produces and reads the serialized request body, so losing the patch
 * (or an SDK upgrade that changes the enum) fails here.
 */

const GOOGLE_REPLY = {
  candidates: [{ content: { parts: [{ text: "ok" }], role: "model" }, finishReason: "STOP" }],
  usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
}

const model = (id: string, efforts: string[]): any => ({
  id,
  providerID: "test-gemini",
  api: { id, url: "https://example.invalid/v1beta", npm: "@ai-sdk/google" },
  name: id,
  capabilities: {
    temperature: false,
    reasoning: true,
    attachment: false,
    toolcall: true,
    input: { text: true, audio: false, image: false, video: false, pdf: false },
    output: { text: true, audio: false, image: false, video: false, pdf: false },
    interleaved: false,
    efforts,
    reasoningBudget: false,
  },
  cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
  limit: { context: 1_048_576, output: 65_536 },
  status: "active",
  options: {},
  headers: {},
  release_date: "2026-11-18",
})

/** Sends one request with the given provider options; returns the body's thinkingConfig or the thrown error. */
async function send(id: string, providerOptions: Record<string, any>) {
  let captured: any
  const provider = createGoogleGenerativeAI({
    apiKey: "test-key",
    baseURL: "https://example.invalid/v1beta",
    fetch: (async (_url: unknown, init: { body: string }) => {
      captured = JSON.parse(init.body)
      return new Response(JSON.stringify(GOOGLE_REPLY), { headers: { "content-type": "application/json" } })
    }) as never,
  })
  try {
    await provider(id).doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      providerOptions,
    } as never)
    return { thinkingConfig: captured.generationConfig?.thinkingConfig }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

describe("@ai-sdk/google sends the xhigh thinking level", () => {
  test("a declared xhigh variant reaches the request body", async () => {
    const neon = model("gemini-4-neon", ["low", "medium", "high", "xhigh"])
    const variant = ProviderTransform.variants(neon).xhigh
    expect(variant).toEqual({ thinkingConfig: { includeThoughts: true, thinkingLevel: "xhigh" } })
    const outcome = await send(neon.api.id, ProviderTransform.providerOptions(neon, variant))
    expect(outcome).toEqual({ thinkingConfig: { includeThoughts: true, thinkingLevel: "xhigh" } })
  })

  test("a configured xhigh (provider options written in config) is accepted", async () => {
    const hydrogen = model("gemini-4-hydrogen", ["low", "medium", "high", "xhigh"])
    const configured = ProviderTransform.configuredVariants(hydrogen, {
      xhigh: { thinkingConfig: { includeThoughts: true, thinkingLevel: "xhigh" } },
    }).xhigh
    const outcome = await send(hydrogen.api.id, ProviderTransform.providerOptions(hydrogen, configured))
    expect(outcome).toEqual({ thinkingConfig: { includeThoughts: true, thinkingLevel: "xhigh" } })
  })

  test("the patch widens the enum only by xhigh", async () => {
    const outcome = await send("gemini-4-neon", { google: { thinkingConfig: { includeThoughts: true, thinkingLevel: "max" } } })
    expect(outcome).toHaveProperty("error")
  })
})
