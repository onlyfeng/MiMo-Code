import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { Config, Model, Provider } from "@mimo-ai/sdk/v2"
import { initial } from "../../../src/cli/cmd/tui/util/model"
import * as Models from "../../../src/cli/cmd/tui/util/model"

const providers = [
  {
    id: "openai",
    models: {
      "gpt-5.6-sol": {},
    },
  },
  {
    id: "ppio",
    models: {
      "deepseek-v3": {},
    },
  },
] as unknown as Provider[]

describe("initial model", () => {
  test("restores the most recent model before the configured default", () => {
    expect(
      initial(providers, {
        ready: true,
        recent: [{ providerID: "openai", modelID: "gpt-5.6-sol" }],
        configured: "ppio/deepseek-v3",
      }),
    ).toEqual({ providerID: "openai", modelID: "gpt-5.6-sol" })
  })

  test("keeps an explicit model argument highest priority", () => {
    expect(
      initial(providers, {
        argument: "ppio/deepseek-v3",
        ready: false,
        recent: [{ providerID: "openai", modelID: "gpt-5.6-sol" }],
        configured: "openai/gpt-5.6-sol",
      }),
    ).toEqual({ providerID: "ppio", modelID: "deepseek-v3" })
  })

  test("skips unavailable recent models", () => {
    expect(
      initial(providers, {
        ready: true,
        recent: [{ providerID: "openai", modelID: "removed-model" }],
        configured: "ppio/deepseek-v3",
      }),
    ).toEqual({ providerID: "ppio", modelID: "deepseek-v3" })
  })

  test("waits for recent state before using the configured default", () => {
    expect(
      initial(providers, {
        ready: false,
        recent: [],
        configured: "ppio/deepseek-v3",
      }),
    ).toBeUndefined()
  })
})

describe("context budget preview", () => {
  const original = process.env.MIMOCODE_COMPACTION_TRIGGER_RATIO
  beforeEach(() => {
    delete process.env.MIMOCODE_COMPACTION_TRIGGER_RATIO
  })
  afterEach(() => {
    if (original === undefined) delete process.env.MIMOCODE_COMPACTION_TRIGGER_RATIO
    else process.env.MIMOCODE_COMPACTION_TRIGGER_RATIO = original
  })
  const model = {
    id: "test",
    providerID: "test",
    api: { id: "test" },
    limit: { context: 200_000, output: 32_000 },
  } as Model

  test("rejects a budget below the real reserve even when the ratio gap is smaller", () => {
    expect(Models.contextBudget({}, model, 40_000)).toBeUndefined()
    expect(Models.contextBudget({}, model, 52_000)).toBeUndefined()
  })

  test("previews the actual trigger for an accepted budget", () => {
    expect(Models.contextBudget({}, model, 80_000)).toMatchObject({
      hard: 200_000,
      effective: 80_000,
      usable: 72_000,
      source: "config",
    })
  })

  test("replaces the existing model budget and respects a configured ratio", () => {
    process.env.MIMOCODE_COMPACTION_TRIGGER_RATIO = "0.8"
    const config: Config = { compaction: { max_context: { "test/test": 150_000 } } }
    expect(Models.contextBudget(config, model, 80_000)?.usable).toBe(64_000)
    expect(config.compaction?.max_context).toEqual({ "test/test": 150_000 })
    expect(
      Models.contextBudget(config, { ...model, limit: { context: 100_000, output: 16_000 } }, 40_000),
    ).toMatchObject({
      effective: 40_000,
      usable: 32_000,
    })
  })

  test("filters tier candidates using configured reserve validity and the real window", () => {
    const large = { ...model, limit: { context: 1_000_000, output: 32_000 } }
    const config: Config = { compaction: { reserved: 250_000, max_context: 600_000 } }
    const previews = [200_000, 300_000, 500_000, 1_000_000].flatMap((value) => {
      const result = Models.contextBudget(config, large, value)
      return result ? [{ value, trigger: result.usable }] : []
    })
    expect(previews).toEqual([
      { value: 300_000, trigger: 270_000 },
      { value: 500_000, trigger: 450_000 },
    ])
  })

  test("rejects reset values, no-op caps and unknown models as custom budgets", () => {
    for (const value of [0, -1, 200_000, 300_000, Number.NaN]) {
      expect(Models.contextBudget({}, model, value)).toBeUndefined()
    }
    expect(Models.contextBudget(undefined, model, 80_000)).toBeUndefined()
    expect(Models.contextBudget({}, undefined, 80_000)).toBeUndefined()
  })
})
