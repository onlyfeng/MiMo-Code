import z from "zod"

const LegacyRetryPart = z.object({
  type: z.literal("retry"),
  message: z.null().optional(),
  attempt: z.number().optional(),
  error: z.object({ data: z.object({ message: z.string(), responseBody: z.string().nullish() }) }),
  time: z.object({ created: z.number() }).optional(),
}).passthrough()

/** Normalize historical storage/import rows without weakening the public schema. */
export function normalizeRetryPart(value: unknown): unknown {
  if (value === null || typeof value !== "object" || !("type" in value) || value.type !== "retry") return value
  if ("message" in value && typeof value.message === "string") return value
  const legacy = LegacyRetryPart.safeParse(value)
  if (!legacy.success) return value
  const { error, ...part } = legacy.data
  const created = part.time?.created ?? 0
  return {
    ...part,
    attempt: part.attempt ?? 0,
    phase: "stream",
    scope: "live-step",
    kind: "unknown",
    message: [error.data.message, error.data.responseBody].filter((text) => text != null && text !== "").join(" "),
    next: created,
    time: { created, updated: created },
  }
}
