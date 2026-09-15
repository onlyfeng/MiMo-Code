import { expect, test } from "bun:test"
import path from "node:path"

type Document = {
  paths: Record<string, Record<string, { operationId?: string; "x-codeSamples"?: { lang: string; source: string }[] }>>
}

test("generated and published code samples use callable v2 SDK methods", async () => {
  const env = { ...process.env }
  delete env.MIMOCODE_EXPERIMENTAL
  delete env.MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH
  delete env.MIMOCODE_CODEX_MODE
  const child = Bun.spawn({
    cmd: [process.execPath, "--conditions=browser", path.resolve("test/fixture/generate-child.ts")],
    env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const timer = setTimeout(() => child.kill("SIGKILL"), 30_000)
  const generated = await (async () => {
    try {
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect(code, stderr).toBe(0)
      return JSON.parse(stdout) as Document
    } finally {
      clearTimeout(timer)
      child.kill("SIGKILL")
    }
  })()
  const requests: { method: string; path: string; body: unknown }[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      requests.push({ method: request.method, path: new URL(request.url).pathname, body: await request.json() })
      return new Response(null, { status: 204 })
    },
  })
  try {
    const published: Document = await Bun.file(new URL("../../../sdk/openapi.json", import.meta.url)).json()
    for (const doc of [generated, published]) {
      const operations = Object.values(doc.paths).flatMap((item) =>
        Object.values(item).filter((operation) => operation.operationId),
      )
      expect(operations.length).toBeGreaterThan(0)
      for (const operation of operations) {
        const sample = operation["x-codeSamples"]?.find((item) => item.lang === "js")?.source
        expect(sample, operation.operationId).toBeDefined()
        const specifier = sample!.match(/from "([^"]+)"/)?.[1]
        expect(specifier, operation.operationId).toBe("@mimo-ai/sdk/v2")
        const { createOpencodeClient } = await import(specifier!)
        const client = createOpencodeClient({ baseUrl: server.url.origin })
        const method = sample!.match(/await client\.([\w.]+)\(/)?.[1]
        expect(method, operation.operationId).toBeDefined()
        const callable = method!.split(".").reduce<unknown>((value, key) => {
          if (typeof value !== "object" || value === null) return undefined
          return Reflect.get(value, key)
        }, client)
        expect(typeof callable, operation.operationId).toBe("function")
        if (operation.operationId !== "session.prompt_async") continue
        const execute = new Function(
          "createOpencodeClient",
          `return (async () => {${sample!
            .replace(/^import[^\n]+\n/, "")
            .replace("  ...", '  sessionID: "ses_example", parts: [{ type: "text", text: "hello" }]')}})()`,
        )
        await execute(() => client)
      }
    }
    expect(requests).toEqual([
      { method: "POST", path: "/session/ses_example/prompt_async", body: { parts: [{ type: "text", text: "hello" }] } },
      { method: "POST", path: "/session/ses_example/prompt_async", body: { parts: [{ type: "text", text: "hello" }] } },
    ])
  } finally {
    await server.stop(true)
  }
}, 45_000)
