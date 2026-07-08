import { describe, expect, test } from "bun:test"
import { toSchemaOnlyTools, parseJudgeIndex, renderCandidate, shouldRunMaxModeStep } from "../../src/session/max-mode"

describe("max-mode toSchemaOnlyTools", () => {
  test("strips execute closures but keeps schema fields", () => {
    const tools = {
      read: { description: "Read a file", inputSchema: { type: "object" }, execute: async () => ({}) },
      bash: { description: "Run a command", inputSchema: { type: "object" }, execute: async () => ({}) },
    } as any

    const out = toSchemaOnlyTools(tools)

    expect(Object.keys(out).sort()).toEqual(["bash", "read"])
    for (const key of Object.keys(out)) {
      expect((out[key] as any).execute).toBeUndefined()
      expect((out[key] as any).description).toBe((tools[key] as any).description)
      expect((out[key] as any).inputSchema).toBe((tools[key] as any).inputSchema)
    }
  })

  test("does not mutate the input tools", () => {
    const tools = {
      read: { description: "Read", inputSchema: {}, execute: async () => ({}) },
    } as any
    toSchemaOnlyTools(tools)
    expect(typeof (tools.read as any).execute).toBe("function")
  })
})

describe("max-mode parseJudgeIndex", () => {
  test("parses a bare integer", () => {
    expect(parseJudgeIndex("2", 5)).toBe(2)
  })

  test("extracts the first integer from prose", () => {
    expect(parseJudgeIndex("I pick candidate 3 because it is best.", 5)).toBe(3)
  })

  test("defaults to 0 when no integer present", () => {
    expect(parseJudgeIndex("none of them", 5)).toBe(0)
  })

  test("defaults to 0 when index out of range", () => {
    expect(parseJudgeIndex("9", 5)).toBe(0)
  })

  test("accepts boundary index 0", () => {
    expect(parseJudgeIndex("0", 5)).toBe(0)
  })

  test("accepts last valid index", () => {
    expect(parseJudgeIndex("4", 5)).toBe(4)
  })
})

describe("max-mode renderCandidate", () => {
  test("caps candidate fields before judge injection", () => {
    const large = "x".repeat(20_000)
    const rendered = renderCandidate(
      {
        index: 0,
        reasoning: large,
        text: large,
        toolCalls: [{ toolCallId: "call-1", toolName: "bash", input: { command: large } } as any],
        finishReason: "tool-calls",
      },
      0,
    )

    expect(rendered.length).toBeLessThan(25_000)
    expect(rendered).toContain("candidate reasoning truncated before max-mode judge injection")
    expect(rendered).toContain("candidate message truncated before max-mode judge injection")
    expect(rendered).toContain("tool input truncated before max-mode judge injection")
  })
})

describe("max-mode shouldRunMaxModeStep", () => {
  test("enables max mode for the built-in max agent when experimental config exists", () => {
    expect(
      shouldRunMaxModeStep({
        agent: { name: "max" },
        maxMode: { candidates: 2 },
        format: { type: "text" },
        isLastStep: false,
      }),
    ).toBe(true)
  })

  test("enables max mode for any agent with maxMode true when experimental config exists", () => {
    expect(
      shouldRunMaxModeStep({
        agent: { name: "general", maxMode: true },
        maxMode: { candidates: 2 },
        format: { type: "text" },
        isLastStep: false,
      }),
    ).toBe(true)
  })

  test("skips max mode for an ordinary agent even with config present", () => {
    expect(
      shouldRunMaxModeStep({
        agent: { name: "general" },
        maxMode: { candidates: 2 },
        format: { type: "text" },
        isLastStep: false,
      }),
    ).toBe(false)
  })

  test("skips max mode without experimental maxMode config", () => {
    expect(
      shouldRunMaxModeStep({
        agent: { name: "max" },
        format: { type: "text" },
        isLastStep: false,
      }),
    ).toBe(false)
  })

  test("skips max mode for json schema output", () => {
    expect(
      shouldRunMaxModeStep({
        agent: { name: "general", maxMode: true },
        maxMode: { candidates: 2 },
        format: { type: "json_schema" },
        isLastStep: false,
      }),
    ).toBe(false)
  })

  test("skips max mode on the final step", () => {
    expect(
      shouldRunMaxModeStep({
        agent: { name: "general", maxMode: true },
        maxMode: { candidates: 2 },
        format: { type: "text" },
        isLastStep: true,
      }),
    ).toBe(false)
  })
})
