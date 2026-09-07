// Executed with `bun <file>`, never `bun test`: the caller removes selectors
// before this process starts, so test/preload.ts cannot enable a dormant feature.
import { Flag } from "../../src/flag/flag"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { Database } from "../../src/storage"
import { Log } from "../../src/util"

await Log.init({ print: false })
const server = await Server.listen({ hostname: "127.0.0.1", port: 0 })
try {
  const statuses = await Promise.all(
    ["/v1/audio/speech", "/v1/audio/transcriptions", "/v1/models", "/v1/chat/completions"].map(async (endpoint) => {
      const response = await fetch(new URL(endpoint, server.url), {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.MIMOCODE_AUDIO_API_KEY}` },
        body: "malformed body must remain unread",
      })
      await response.arrayBuffer()
      return response.status
    }),
  )
  process.stdout.write(
    JSON.stringify({
      orchestrator: Flag.MIMOCODE_EXPERIMENTAL_ORCHESTRATOR,
      apiKeyPresent: !!process.env.MIMOCODE_AUDIO_API_KEY,
      statuses,
      initialized: !!(await Instance.peek(process.cwd())),
    }),
  )
} finally {
  await server.stop(true)
  await Instance.disposeAll()
  Database.close()
}
