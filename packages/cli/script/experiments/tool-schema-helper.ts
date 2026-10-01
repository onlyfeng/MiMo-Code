import { createHash } from "node:crypto"
import { isDeepStrictEqual } from "node:util"

export type Descriptor = { name: string; description: string; parameters: Record<string, unknown> }

export type ProviderFailure = {
  errorCategory: "timeout" | "http" | "network" | "response_parse" | "unknown"
  statusCode: number | null
}

/** Inspect fixed discriminators only; never retain exception text or transport metadata. */
export function classifyProviderError(error: unknown): ProviderFailure {
  const chain: Record<string, unknown>[] = []
  for (let current = error; typeof current === "object" && current !== null && chain.length < 8; ) {
    const entry = current as Record<string, unknown>
    if (chain.includes(entry)) break
    chain.push(entry)
    current = entry.cause
  }
  const status = chain.find(
    (entry) =>
      typeof entry.statusCode === "number" &&
      Number.isInteger(entry.statusCode) &&
      entry.statusCode >= 100 &&
      entry.statusCode <= 599,
  )?.statusCode
  const statusCode = typeof status === "number" ? status : null
  if (
    chain.some(
      (entry) =>
        ["TimeoutError", "AbortError"].includes(String(entry.name)) ||
        ["ETIMEDOUT", "ABORT_ERR"].includes(String(entry.code)),
    )
  )
    return { errorCategory: "timeout", statusCode }
  if (statusCode !== null && statusCode >= 400) return { errorCategory: "http", statusCode }
  if (
    chain.some((entry) =>
      ["AI_JSONParseError", "AI_TypeValidationError", "AI_InvalidResponseDataError"].includes(String(entry.name)),
    )
  )
    return { errorCategory: "response_parse", statusCode }
  if (statusCode !== null) return { errorCategory: "http", statusCode }
  if (
    chain.some(
      (entry) =>
        entry.name === "AI_APICallError" ||
        ["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN", "ENETUNREACH", "EPIPE"].includes(String(entry.code)),
    )
  )
    return { errorCategory: "network", statusCode }
  return { errorCategory: "unknown", statusCode }
}

/** SDK request metadata is a wire body, not a safe report object. */
export function wireTools(body: unknown): { tools: unknown[] } | undefined {
  if (typeof body === "string") {
    try {
      return wireTools(JSON.parse(body))
    } catch {
      return undefined
    }
  }
  if (typeof body !== "object" || body === null || !("tools" in body) || !Array.isArray(body.tools)) return undefined
  return { tools: structuredClone(body.tools) }
}

export const candidates = new Set(["read", "glob", "grep"])

export function allowedPattern(pattern: string) {
  return (
    !pattern.includes("\0") &&
    !/^[!\s]*(?:[/\\]|[a-zA-Z]:)/.test(pattern) &&
    !/(?:^|[/\\,{])\.\.(?:$|[/\\,}])/.test(pattern)
  )
}

const descriptions: Record<string, string> = {
  read: "Read a local file or directory; missing paths error. Files have numbered lines: offset is 1-based, limit defaults to 2000, and lines over 2000 characters are truncated. Directories list entries, with / for subdirectories. Images/PDFs may return attachments. Use glob to find paths and grep to locate content. Batch independent reads; prefer useful windows over tiny repeated slices.",
  glob: "Find files by glob pattern (e.g. **/*.ts); return paths sorted by modification time. Omit path to search the current project. Batch independent searches; use actor for open-ended exploration.",
  grep: "Search file contents with regex; include filters filenames by glob. Return matching paths and line numbers sorted by modification time. For counts use direct bash with rg, not grep. Use actor for open-ended exploration.",
}

const annotations: Record<string, Record<string, string>> = {
  read: {
    file_path: "File or directory path.",
    offset: "Starting line, 1-based.",
    limit: "Maximum lines; default 2000.",
  },
  glob: {
    pattern: "Filename glob.",
    path: 'Search directory; omit for current project. Do not pass literal "undefined" or "null".',
  },
  grep: {
    pattern: "Content regex.",
    path: "Search path; default current project.",
    include: "Filename glob, e.g. *.{ts,tsx}.",
  },
}

export function compactDescriptor(input: Descriptor): Descriptor {
  if (!candidates.has(input.name)) return structuredClone(input)
  const parameters = structuredClone(input.parameters)
  const properties = object(parameters.properties)
  if (properties) {
    for (const [key, description] of Object.entries(annotations[input.name])) {
      const property = object(properties[key])
      if (property && typeof property.description === "string") property.description = description
    }
  }
  return { ...input, description: descriptions[input.name], parameters }
}

function object(input: unknown): Record<string, unknown> | undefined {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : undefined
}

// Walk schema syntax, never user property names or data inside enum/default.
export function constraints(input: unknown): unknown {
  const schema = object(input)
  if (!schema) return input
  return Object.fromEntries(
    Object.entries(schema).flatMap(([key, value]) => {
      if (["description", "title", "examples", "$comment"].includes(key)) return []
      if (["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"].includes(key))
        return [
          [
            key,
            Object.fromEntries(Object.entries(object(value) ?? {}).map(([name, node]) => [name, constraints(node)])),
          ],
        ]
      if (["allOf", "anyOf", "oneOf", "prefixItems"].includes(key) && Array.isArray(value))
        return [[key, value.map(constraints)]]
      if (
        [
          "items",
          "additionalProperties",
          "unevaluatedProperties",
          "contains",
          "not",
          "if",
          "then",
          "else",
          "propertyNames",
        ].includes(key)
      )
        return [[key, Array.isArray(value) ? value.map(constraints) : constraints(value)]]
      return [[key, value]]
    }),
  )
}

export function grade(
  expected: { answer: string | null; requiredReads: string[] },
  answer: string,
  reads: string[],
  termination: string,
): boolean {
  if (termination !== "stop" || !expected.requiredReads.every((file) => reads.includes(file))) return false
  const parsed = (() => {
    try {
      return JSON.parse(answer)
    } catch {
      return undefined
    }
  })()
  return isDeepStrictEqual(parsed, { answer: expected.answer })
}

export function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export function measure(value: unknown) {
  const serialized = JSON.stringify(value)
  return {
    sha256: fingerprint(value),
    utf8Bytes: Buffer.byteLength(serialized),
    characters: serialized.length,
    estimatedTokens: Math.round(serialized.length / 4),
    exactTokens: null,
  }
}
