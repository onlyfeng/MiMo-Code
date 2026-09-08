import { LLMServerTokens } from "../../src/llm-server/tokens"

async function run() {
  const directory = process.argv[2]!
  if (process.argv[3] === "revoke") return LLMServerTokens.revoke({ directory, id: process.argv[4]! })
  if (process.argv[3] === "verify")
    return Promise.all(Array.from({ length: 3 }, () => LLMServerTokens.verify({ directory, token: process.argv[4]! })))
  const records = await Promise.all(
    Array.from({ length: 2 }, () =>
      LLMServerTokens.issue({
        directory,
        models: ["p/m"],
        expiry: { idleMs: 3_600_000, maxAgeMs: 86_400_000 },
      }),
    ),
  )
  return records.map((issued) => issued.record.id)
}
process.stdout.write(JSON.stringify(await run()))
