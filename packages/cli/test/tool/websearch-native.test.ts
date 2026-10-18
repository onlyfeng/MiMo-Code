import { describe, expect, test } from "bun:test"
import * as NativeWebSearch from "../../src/tool/websearch/native"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { ProviderTest } from "../fake/provider"

function model(npm = "@ai-sdk/openai", providerID = "test", id = "model") {
  return ProviderTest.model({
    id: ModelID.make(id),
    providerID: ProviderID.make(providerID),
    api: { id, url: "https://example.com", npm },
  })
}

describe("websearch.native.route", () => {
  test("provider key enables every model of that provider", () => {
    expect(NativeWebSearch.route({ native: { test: true } }, model())).toEqual({ replay: "native" })
    expect(NativeWebSearch.route({ native: { test: true } }, model("@ai-sdk/anthropic", "test", "other"))).toEqual({
      replay: "native",
    })
  })

  test("provider/model key overrides provider key", () => {
    expect(NativeWebSearch.route({ native: { test: true, "test/model": false } }, model())).toBeUndefined()
    expect(NativeWebSearch.route({ native: { "test/model": { replay: "text" } } }, model())).toEqual({
      replay: "text",
    })
    expect(NativeWebSearch.route({ native: { test: false, "test/model": true } }, model())).toEqual({
      replay: "native",
    })
  })

  test("unsupported sdk is ignored", () => {
    expect(NativeWebSearch.route({ native: { test: true } }, model("@ai-sdk/openai-compatible"))).toBeUndefined()
  })

  test("no config means no route", () => {
    expect(NativeWebSearch.route(undefined, model())).toBeUndefined()
    expect(NativeWebSearch.route({}, model())).toBeUndefined()
    expect(NativeWebSearch.route({ native: { other: true } }, model())).toBeUndefined()
  })

  test("fallbackEntries parses strings and objects", () => {
    expect(
      NativeWebSearch.fallbackEntries({ fallback: ["test/model", { model: "test/other", variant: "low" }, "bad"] }),
    ).toEqual([
      { providerID: "test", modelID: "model" },
      { providerID: "test", modelID: "other", variant: "low" },
    ])
    expect(NativeWebSearch.fallbackEntries(undefined)).toEqual([])
  })

  test("model ids may contain slashes after the provider", () => {
    expect(NativeWebSearch.fallbackEntries({ fallback: ["test/org/model"] })).toEqual([
      { providerID: "test", modelID: "org/model" },
    ])
  })

  test("exposed", () => {
    expect(NativeWebSearch.exposed(undefined)).toBe(false)
    expect(NativeWebSearch.exposed({ native: { test: false } })).toBe(false)
    expect(NativeWebSearch.exposed({ fallback: [] })).toBe(false)
    expect(NativeWebSearch.exposed({ fallback: ["test/model"] })).toBe(true)
    expect(NativeWebSearch.exposed({ native: { "test/model": { replay: "text" } } })).toBe(true)
  })
})

describe("websearch.config", () => {
  test("config accepts the websearch block", async () => {
    const { Config } = await import("../../src/config")
    const parsed = Config.Info.safeParse({
      websearch: {
        native: { test: true, "test/model": { replay: "text" }, "test/other": false },
        fallback: ["test/model", { model: "test/other", variant: "low" }],
      },
    })
    expect(parsed.success).toBe(true)
    expect(Config.Info.safeParse({ websearch: { native: { test: "yes" } } }).success).toBe(false)
  })
})
