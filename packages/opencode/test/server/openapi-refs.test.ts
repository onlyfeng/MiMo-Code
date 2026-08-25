import { test, expect } from "bun:test"
import { Server } from "../../src/server/server"

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

// zod-openapi rewrites every local `#/$defs/<name>` reference to
// `#/components/schemas/<name>` but only hoists the definitions it knows by
// name, so a recursive zod schema — `z.json()`, `z.lazy()`, any self-reference —
// emits a $ref to a component that was never written. Nothing in the running
// server notices; the failure surfaces only when someone regenerates the SDK,
// where openapi-ts dies with `Missing $ref pointer`. That is how the spec stayed
// broken for four days after `fc74c539` shipped `providerOutput: z.json()`.
// Resolving every pointer here turns that into a test failure instead.
test("every $ref in the generated OpenAPI document resolves", async () => {
  const doc = await Server.openapi()

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
    await Server.openapi(),
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
