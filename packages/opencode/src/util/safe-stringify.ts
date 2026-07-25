// Unified safe JSON serializer that handles circular references, functions,
// symbols, and optionally bigint. Used by overflow estimation, message replay,
// and max-mode judge to avoid duplicating replacer logic across modules.

interface SafeStringifyOptions {
  /** Convert bigint values to string instead of throwing. Default: false. */
  bigint?: boolean
}

export function safeStringify(
  input: unknown,
  opts?: SafeStringifyOptions,
): { serialized: string; transformed: boolean } {
  const seen = new WeakSet<object>()
  let transformed = false
  const serialized =
    JSON.stringify(input, (_key, value) => {
      if (opts?.bigint && typeof value === "bigint") {
        transformed = true
        return value.toString()
      }
      if (typeof value === "function") {
        transformed = true
        return "[function]"
      }
      if (typeof value === "symbol") {
        transformed = true
        return value.toString()
      }
      if (value && typeof value === "object") {
        if (seen.has(value)) {
          transformed = true
          return "[circular]"
        }
        seen.add(value)
      }
      return value
    }) ?? String(input)
  return { serialized, transformed }
}

/** Simple safe stringify that returns just the string (no transform tracking). */
export function safeStringifySimple(input: unknown): string {
  return safeStringify(input).serialized
}
