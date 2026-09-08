import z from "zod"

// Persisted v1 refs may contain '*'. It remains a literal character, never a wildcard.
export const ModelRef = z
  .string()
  .max(512)
  .regex(/^[^/\s]+\/\S+$/)
export const Models = z
  .array(ModelRef)
  .min(1)
  .max(64)
  .refine((models) => new Set(models).size === models.length)
export const Schema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("models"), models: Models }),
  z.strictObject({ type: z.literal("all") }),
])
export type Scope = z.infer<typeof Schema>

export function allows(scope: Scope, ref: string) {
  return scope.type === "all" ? ModelRef.safeParse(ref).success : scope.models.includes(ref)
}

export * as LLMServerScope from "./scope"
