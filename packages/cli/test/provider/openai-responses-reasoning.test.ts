import { expect, test } from "bun:test"
import { createOpenAI } from "@ai-sdk/openai"
import { Provider, ProviderTransform } from "../../src/provider"

function model(id: string, reasoning: boolean) {
  return Provider.fromModelsDevProvider({
    id: "example",
    name: "Example",
    env: [],
    npm: "@ai-sdk/openai",
    models: {
      [id]: {
        id,
        name: id,
        release_date: "2026-01-01",
        attachment: false,
        reasoning,
        temperature: false,
        tool_call: true,
        voice_design: false,
        voice_clone: false,
        limit: { context: 8192, output: 2048 },
      },
    },
  }).models[id]
}

test.each([
  ["grok-4.7", true, "xhigh"],
  ["grok-4.6", true, "xhigh"],
  ["grok-4.5", true, "high"],
  ["grok-4.3", true, undefined],
  ["grok-build-0.1", true, undefined],
  ["grok-4.20-0309-non-reasoning", false, undefined],
] as const)("OpenAI Responses honors reasoning capability for %s", async (id, reasoning, effort) => {
  const mdl = model(id, reasoning)
  const requests: { url: string; body: Record<string, unknown> }[] = []
  const sdk = createOpenAI({
    apiKey: "test-key",
    baseURL: "https://example.test/v1",
    fetch: Object.assign(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(url), body: JSON.parse(String(init?.body)) })
        return Response.json({
          id: "resp_test",
          object: "response",
          model: id,
          status: "completed",
          created_at: 1,
          output: [],
          usage: { input_tokens: 1, output_tokens: 0, total_tokens: 1 },
          incomplete_details: null,
        })
      },
      { preconnect: fetch.preconnect },
    ),
  })
  const options = {
    ...ProviderTransform.options({ model: mdl, sessionID: "test-session", providerOptions: { setCacheKey: true } }),
    ...(reasoning ? { reasoningSummary: "auto", ...(effort ? { reasoningEffort: effort } : {}) } : {}),
  }
  for (const settings of [options, ProviderTransform.smallOptions(mdl)]) {
    const result = await sdk.languageModel(id).doGenerate({
      prompt: [
        { role: "system", content: "Be concise." },
        { role: "user", content: [{ type: "text", text: "hi" }] },
      ],
      providerOptions: ProviderTransform.providerOptions(mdl, settings),
    })
    expect(result.warnings).not.toContainEqual(expect.objectContaining({ feature: "reasoningEffort" }))
  }
  expect(requests.map((request) => request.url)).toEqual([
    "https://example.test/v1/responses",
    "https://example.test/v1/responses",
  ])
  expect(requests[0].body).toMatchObject({ store: false, prompt_cache_key: "test-session" })
  if (reasoning) {
    expect(requests[0].body.reasoning).toEqual({ summary: "auto", ...(effort ? { effort } : {}) })
    for (const request of requests) expect(request.body.include).toContain("reasoning.encrypted_content")
    return
  }
  for (const request of requests) {
    expect(request.body).not.toHaveProperty("reasoning")
    expect(request.body).not.toHaveProperty("include")
    expect(request.body.input).toContainEqual({ role: "system", content: "Be concise." })
  }
})

test("explicit forceReasoning overrides the capability default", () => {
  expect(ProviderTransform.providerOptions(model("test-model", true), { forceReasoning: false })).toEqual({
    openai: { forceReasoning: false },
  })
})

test("reasoning override is scoped to the OpenAI SDK", () => {
  const mdl = model("test-model", true)
  expect(ProviderTransform.providerOptions({ ...mdl, api: { ...mdl.api, npm: "@ai-sdk/xai" } }, {})).toEqual({
    xai: {},
  })
})
