import { describe, expect, test } from "bun:test"
import type { AssistantMessage, Provider, UserMessage } from "@mimo-ai/sdk/v2"
import { displayMetadata, effectiveVariant, initial, latestMessageSelection } from "../../../src/cli/cmd/tui/util/model"

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
