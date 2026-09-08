import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { AssistantMessage, Config, Model, Provider, UserMessage } from "@mimo-ai/sdk/v2"
import { displayMetadata, effectiveVariant, initial, latestMessageSelection } from "../../../src/cli/cmd/tui/util/model"
import * as Models from "../../../src/cli/cmd/tui/util/model"

const providers = [
  {
    id: "openai",
    name: "OpenAI",
    models: {
      "gpt-5.6-sol": { name: "GPT-5.6", variants: { high: {}, xhigh: {} } },
    },
  },
  {
    id: "ppio",
    name: "PPIO",
    models: {
      "deepseek-v3": { name: "DeepSeek V3" },
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

describe("model display metadata", () => {
  test("shows the raw provider/model and the persisted named variant", () => {
    expect(
      displayMetadata(providers, { providerID: "openai", modelID: "gpt-5.6-sol", variant: "high" }, "GPT-5.6 alias"),
    ).toEqual({
      alias: "GPT-5.6 alias",
      detail: "openai/gpt-5.6-sol · variant: high",
    })
  })

  test("shows none when no named variant was persisted instead of inferring a default", () => {
    expect(displayMetadata(providers, { providerID: "ppio", modelID: "deepseek-v3" })).toEqual({
      alias: "DeepSeek V3",
      detail: "ppio/deepseek-v3 · variant: none",
    })
  })
})

describe("latest message model selection", () => {
  test("reads provider, model, and variant from a user message", () => {
    const message = {
      id: "message-user",
      sessionID: "session",
      role: "user",
      time: { created: 1 },
      agent: "explore",
      model: { providerID: "openai", modelID: "gpt-5.6-sol", variant: "high" },
    } satisfies UserMessage

    expect(latestMessageSelection([message])).toEqual({
      providerID: "openai",
      modelID: "gpt-5.6-sol",
      variant: "high",
    })
  })

  test("reads provider, model, and variant from an assistant message", () => {
    const older = {
      id: "message-user",
      sessionID: "session",
      role: "user",
      time: { created: 1 },
      agent: "explore",
      model: { providerID: "openai", modelID: "gpt-5.6-sol", variant: "high" },
    } satisfies UserMessage
    const message = {
      id: "message-assistant",
      sessionID: "session",
      role: "assistant",
      time: { created: 2 },
      parentID: "message-user",
      providerID: "ppio",
      modelID: "deepseek-v3",
      mode: "explore",
      agent: "explore",
      path: { cwd: "/repo", root: "/repo" },
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      variant: "thinking",
    } satisfies AssistantMessage

    expect(latestMessageSelection([older, message])).toEqual({
      providerID: "ppio",
      modelID: "deepseek-v3",
      variant: "thinking",
    })
  })

  test("does not invent model metadata when no actor message is loaded", () => {
    expect(latestMessageSelection([])).toBeUndefined()
  })
})

describe("effective variant", () => {
  const selection = { providerID: "openai", modelID: "gpt-5.6-sol" }

  test("an explicit selection always wins over the agent default", () => {
    expect(
      effectiveVariant(providers, {
        agent: { variant: "xhigh", model: selection },
        groups: undefined,
        selection,
        selected: "high",
      }),
    ).toBe("high")
  })

  test("falls back to the agent variant the server will apply to its own model", () => {
    expect(
      effectiveVariant(providers, {
        agent: { variant: "xhigh", model: selection },
        groups: undefined,
        selection,
      }),
    ).toBe("xhigh")
  })

  test("resolves the agent model from a literal modelRef", () => {
    expect(
      effectiveVariant(providers, {
        agent: { variant: "xhigh", modelRef: "openai/gpt-5.6-sol" },
        groups: undefined,
        selection,
      }),
    ).toBe("xhigh")
  })

  test("resolves a group modelRef through the group default", () => {
    expect(
      effectiveVariant(providers, {
        agent: { variant: "xhigh", modelRef: "smart" },
        groups: { smart: { default: "openai/gpt-5.6-sol", models: ["ppio/deepseek-v3"] } },
        selection,
      }),
    ).toBe("xhigh")
  })

  test("ignores the agent variant when the request targets another model", () => {
    expect(
      effectiveVariant(providers, {
        agent: { variant: "xhigh", model: { providerID: "ppio", modelID: "deepseek-v3" } },
        groups: undefined,
        selection,
      }),
    ).toBeUndefined()
  })

  test("ignores the agent variant when the model does not define it", () => {
    expect(
      effectiveVariant(providers, {
        agent: { variant: "medium", model: selection },
        groups: undefined,
        selection,
      }),
    ).toBeUndefined()
  })

  test("treats an unconfigured built-in tier as unknown rather than a match", () => {
    expect(
      effectiveVariant(providers, {
        agent: { variant: "xhigh", modelRef: "lite" },
        groups: undefined,
        selection,
      }),
    ).toBeUndefined()
  })

  test("resolves a built-in tier name once it has a model_groups entry", () => {
    expect(
      effectiveVariant(providers, {
        agent: { variant: "xhigh", modelRef: "lite" },
        groups: { lite: "openai/gpt-5.6-sol" },
        selection,
      }),
    ).toBe("xhigh")
  })

  test("reports no variant when neither the user nor the agent chose one", () => {
    expect(effectiveVariant(providers, { agent: { model: selection }, groups: undefined, selection })).toBeUndefined()
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
