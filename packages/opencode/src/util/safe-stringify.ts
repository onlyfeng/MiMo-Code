// Unified safe JSON serializer that handles circular references, functions,
// symbols, and optionally bigint. Used by overflow estimation, message replay,
// and max-mode judge to avoid duplicating replacer logic across modules.

export function safeStringify(input: unknown, opts?: { bigint?: boolean }) {
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

/** Returns just the serialized string (no transform tracking). */
export function safeStringifySimple(input: unknown) {
  return safeStringify(input).serialized
}

/** Non-throwing variant: returns a fallback string on serialization errors. */
export function safeStringifyNoThrow(input: unknown, fallback = "[unserializable]") {
  try {
    return safeStringify(input, { bigint: true }).serialized
  } catch {
    return fallback
  }
}
