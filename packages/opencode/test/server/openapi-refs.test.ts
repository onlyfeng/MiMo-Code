import { test, expect } from "bun:test"
import { createOpencodeClient } from "@mimo-ai/sdk/v2"
import { codeSample } from "../../src/cli/cmd/generate"
import { Server } from "../../src/server/server"

const generatedOpenapi = Server.openapi()

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

function operation(doc: unknown, route: string, method: string) {
  if (!isRecord(doc) || !isRecord(doc.paths) || !isRecord(doc.paths[route])) return undefined
  const value = doc.paths[route][method]
  return isRecord(value) ? value : undefined
}

function parameterNames(value: Record<string, unknown> | undefined) {
  if (!Array.isArray(value?.parameters)) return []
  return value.parameters.flatMap((parameter) =>
    isRecord(parameter) && typeof parameter.name === "string" ? [parameter.name] : [],
  )
}

function schema(doc: unknown, name: string) {
  if (!isRecord(doc) || !isRecord(doc.components) || !isRecord(doc.components.schemas)) return undefined
  const value = doc.components.schemas[name]
  return isRecord(value) ? value : undefined
}

function property(value: Record<string, unknown> | undefined, name: string) {
  if (!isRecord(value?.properties)) return undefined
  const result = value.properties[name]
  return isRecord(result) ? result : undefined
}

function documentOperations(doc: unknown) {
  if (!isRecord(doc) || !isRecord(doc.paths)) return []
  return Object.values(doc.paths).flatMap((path) => {
    if (!isRecord(path)) return []
    return ["get", "post", "put", "delete", "patch"].flatMap((method) => {
      const value = path[method]
      if (!isRecord(value) || typeof value.operationId !== "string") return []
      return [{ id: value.operationId, value }]
    })
  })
}

function member(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), value)
}

// zod-openapi rewrites every local `#/$defs/<name>` reference to
// `#/components/schemas/<name>` but only hoists the definitions it knows by
// name, so a recursive zod schema — `z.json()`, `z.lazy()`, any self-reference —
// emits a $ref to a component that was never written. Nothing in the running
// server notices; the failure surfaces only when someone regenerates the SDK,
// where openapi-ts dies with `Missing $ref pointer`. That is how the spec stayed
// broken for four days after `fc74c539` shipped `providerOutput: z.json()`.
// Resolving every pointer here turns that into a test failure instead.
test("every $ref in the generated OpenAPI document resolves", async () => {
  const doc = await generatedOpenapi

  const refs = new Set<string>()
  const collect = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(collect)
    if (!isRecord(node)) return
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") refs.add(value)
      collect(value)
    }
  }
  collect(doc)
  expect(refs.size).toBeGreaterThan(0)

  // JSON Pointer walk, with RFC 6901 token unescaping.
  const resolve = (node: unknown, tokens: string[]): unknown => {
    if (tokens.length === 0) return node
    if (!isRecord(node)) return undefined
    return resolve(node[tokens[0].replaceAll("~1", "/").replaceAll("~0", "~")], tokens.slice(1))
  }

  const dangling = [...refs].filter(
    (ref) => !ref.startsWith("#/") || resolve(doc, ref.slice(2).split("/")) === undefined,
  )
  expect(dangling).toEqual([])
})

test("published OpenAPI keeps recovery and resume main-only", async () => {
  const docs = [
    await generatedOpenapi,
    await Bun.file(new URL("../../../sdk/openapi.json", import.meta.url)).json(),
  ]

  for (const doc of docs) {
    const recovery = operation(doc, "/session/{sessionID}/recovery", "get")
    const resume = operation(doc, "/session/{sessionID}/turn/{assistantMessageID}/resume", "post")
    expect(recovery).toBeDefined()
    expect(resume).toBeDefined()
    expect(parameterNames(recovery)).not.toContain("agentID")
    expect(parameterNames(resume)).not.toContain("agentID")
    expect(parameterNames(resume)).not.toContain("task_id")
    expect(recovery?.description).toContain("main-agent")
    expect(resume?.description).toContain("main-agent")
  }
})

test("published OpenAPI includes the checkpoint coverage contract", async () => {
  const published = new URL("../../../sdk/openapi.json", import.meta.url)
  const docs = [
    await generatedOpenapi,
    await Bun.file(published).json(),
  ]

  for (const doc of docs) {
    const coverage = operation(doc, "/session/{sessionID}/checkpoint-coverage", "get")
    expect(coverage?.operationId).toBe("session.checkpointCoverage")
    expect(parameterNames(coverage)).toContain("sessionID")
    expect(schema(doc, "CheckpointCoverage")).toBeDefined()
    expect(property(schema(doc, "CompactionPart"), "projection")).toBeDefined()
  }
})

test("published OpenAPI code samples target callable v2 SDK methods", async () => {
  const generated = documentOperations(await generatedOpenapi)
  const published = documentOperations(
    await Bun.file(new URL("../../../sdk/openapi.json", import.meta.url)).json(),
  )
  expect(published.map((item) => item.id).sort()).toEqual(generated.map((item) => item.id).sort())

  const client = createOpencodeClient({ baseUrl: "http://127.0.0.1:1" })
  const invalid = published.flatMap((item) => {
    const samples = item.value["x-codeSamples"]
    const sample = Array.isArray(samples) ? samples[0] : undefined
    const source = isRecord(sample) && typeof sample.source === "string" ? sample.source : undefined
    if (source !== codeSample(item.id)) return [`${item.id}: stale or missing sample`]
    const target = source.match(/await client\.([^({]+)\(\{/u)?.[1]
    if (!target || typeof member(client, target) !== "function") return [`${item.id}: ${target ?? "missing target"}`]
    return []
  })
  expect(published.length).toBeGreaterThan(0)
  expect(invalid).toEqual([])
})

test("published OpenAPI keeps the runtime compaction projection contract", async () => {
  const runtime = await Server.openapi()
  const published = await Bun.file(new URL("../../../sdk/openapi.json", import.meta.url)).json()
  const projection = schema(published, "CompactionPart")?.properties

  expect(schema(published, "CompactionPart")).toEqual(schema(runtime, "CompactionPart"))
  expect(isRecord(projection) && projection.projection).toMatchObject({
    type: "object",
    properties: {
      version: { type: "number", const: 1 },
      summary_message_id: { type: "string" },
      summary: { type: "string" },
      trigger: { type: "string", enum: ["manual", "automatic", "provider-overflow"] },
      compacted_tool_calls: { type: "array" },
    },
    required: ["version", "summary_message_id", "summary", "trigger"],
  })
})
