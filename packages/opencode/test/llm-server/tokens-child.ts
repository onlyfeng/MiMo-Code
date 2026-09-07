import { LLMServerTokens } from "../../src/llm-server/tokens"

const records = await Promise.all(
  Array.from({ length: 2 }, () =>
    LLMServerTokens.issue({
      directory: process.argv[2]!,
      models: ["p/m"],
      expiry: { idleMs: 3_600_000, maxAgeMs: 86_400_000 },
    }),
  ),
)
process.stdout.write(JSON.stringify(records.map((issued) => issued.record.id)))
