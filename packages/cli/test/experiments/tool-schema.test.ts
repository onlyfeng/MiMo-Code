import { describe, expect, test } from "bun:test"
import z from "zod"
import {
  allowedPattern,
  compactDescriptor,
  constraints,
  grade,
  classifyProviderError,
  wireTools,
  type Descriptor,
} from "../../script/experiments/tool-schema-helper"

test("provider classification emits only fixed categories and numeric HTTP status", () => {
  const secret = "DO_NOT_CAPTURE_PROVIDER_EXCEPTION"
  for (const [error, expected] of [
    [
      { name: "TimeoutError", message: secret },
      { errorCategory: "timeout", statusCode: null },
    ],
    [
      { name: "AI_APICallError", statusCode: 401, url: secret, responseBody: secret },
      { errorCategory: "http", statusCode: 401 },
    ],
    [{ cause: { code: "ECONNREFUSED", message: secret } }, { errorCategory: "network", statusCode: null }],
    [
      { name: "AI_JSONParseError", text: secret },
      { errorCategory: "response_parse", statusCode: null },
    ],
    [
      { name: secret, message: secret, statusCode: secret },
      { errorCategory: "unknown", statusCode: null },
    ],
  ] as const) {
    const result = classifyProviderError(error)
    expect(result).toEqual(expected)
    expect(JSON.stringify(result)).not.toContain(secret)
  }
})

test("wire extraction keeps only serialized tool declarations and reports absent data", () => {
  const tools = [{ type: "function", function: { name: "read", parameters: { type: "object" } } }]
  const body = { tools, messages: [{ content: "PRIVATE_PROMPT" }], api_key: "SECRET" }
  expect(wireTools(JSON.stringify(body))).toEqual({ tools })
  expect(wireTools(body)).toEqual({ tools })
  expect(wireTools(undefined)).toBeUndefined()
  expect(wireTools("invalid JSON")).toBeUndefined()
  expect(wireTools({ input: "PRIVATE_PROMPT" })).toBeUndefined()
})

const descriptor = (name = "read"): Descriptor => ({
  name,
  description: "A deliberately long original description for a data tool.",
  parameters: {
    type: "object",
    properties: {
      file_path: { type: "string", description: "Path to the file or directory", minLength: 1 },
      description: { type: "string", description: "A business field named description", enum: ["keep"] },
      title: { const: "business title" },
      examples: { type: "array", items: { type: "integer", minimum: 1 } },
    },
    required: ["file_path", "description"],
    additionalProperties: false,
    anyOf: [{ properties: { mode: { const: "a" } }, required: ["mode"] }],
  },
})

describe("tool schema experiment invariants", () => {
  test("filename patterns cannot name absolute paths or escape the fixture", () => {
    for (const pattern of ["../*", "src/../../*", "/tmp/*", "C:\\private\\*", "{../,src/}*.ts", "!/private/*"])
      expect(allowedPattern(pattern)).toBe(false)
    for (const pattern of ["**/*.ts", "case1/**/target.txt", "*.{ts,tsx}"]) expect(allowedPattern(pattern)).toBe(true)
  })
  test("compacts only annotations while retaining constraints and business field names", () => {
    const before = descriptor()
    const after = compactDescriptor(before)
    expect(after.description).not.toBe(before.description)
    expect(constraints(after.parameters)).toEqual(constraints(before.parameters))
    expect(after.parameters.properties).toHaveProperty("description")
    expect(after.parameters.properties).toHaveProperty("title")
    expect(after.parameters.properties).toHaveProperty("examples")
  })

  test("control and unknown tools remain byte identical", () => {
    for (const name of ["bash", "exec", "actor", "task", "question", "plan_exit", "apply_patch", "mcp_custom"]) {
      const before = descriptor(name)
      expect(JSON.stringify(compactDescriptor(before))).toBe(JSON.stringify(before))
    }
  })

  test("does not mutate the source schema or its Zod validator", () => {
    const validator = z.object({ file_path: z.string().min(1).describe("Path to the file or directory") }).strict()
    const before = { name: "read", description: "Read a file", parameters: z.toJSONSchema(validator) }
    const snapshot = JSON.stringify(before)
    const after = compactDescriptor(before)
    expect(after.parameters).not.toBe(before.parameters)
    expect(JSON.stringify(before)).toBe(snapshot)
    expect(validator.safeParse({ file_path: "" }).success).toBe(false)
    expect(validator.safeParse({ file_path: "a", unexpected: true }).success).toBe(false)
    expect(validator.safeParse({ file_path: "a" }).success).toBe(true)
  })

  test("matching answer without required file access does not pass the oracle", () => {
    expect(grade({ answer: "secret", requiredReads: ["data.txt"] }, '{"answer":"secret"}', [], "stop")).toBe(false)
    expect(grade({ answer: "secret", requiredReads: ["data.txt"] }, '{"answer":"secret"}', ["data.txt"], "stop")).toBe(
      true,
    )
  })

  test("budget exhaustion cannot be reported as a completed task", () => {
    expect(
      grade({ answer: "secret", requiredReads: ["data.txt"] }, '{"answer":"secret"}', ["data.txt"], "budget_exhausted"),
    ).toBe(false)
    expect(grade({ answer: null, requiredReads: [] }, '{"answer":null}', [], "provider_error")).toBe(false)
  })
})
