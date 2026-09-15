import { expect, test } from "bun:test"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "../fixture/fixture"

test.each([
  { name: "trusted agent model", trusted: true, agentModel: true, codex: true },
  { name: "trusted default model", trusted: true, codex: true },
  { name: "untrusted API alias", api: "gpt-5", codex: false },
  { name: "GPT4 API veto", trusted: true, api: "gpt-4o", codex: false },
  { name: "OSS family veto", trusted: true, family: "gpt-oss", codex: false },
  { name: "MiMo API veto", trusted: true, api: "mimo-v2.6", codex: false },
  { name: "explicit default", trusted: true, mode: "false", codex: false },
  { name: "explicit codex", api: "mimo-v2.6", mode: "true", codex: true },
])(
  "debug agent discovers the toolset for $name",
  async (input) => {
    await using tmp = await tmpdir({
      config: {
        model: input.agentModel ? "local/untrusted" : "local/opaque",
        enabled_providers: ["local"],
        agent: { example: input.agentModel ? { model: "local/opaque" } : {} },
        provider: {
          local: {
            npm: "@ai-sdk/openai-compatible",
            options: { baseURL: "http://127.0.0.1:1/v1" },
            models: {
              untrusted: { id: "vendor-slot-18" },
              opaque: {
                id: input.api ?? "vendor-slot-17",
                name: "GPT-5 display name is not trusted",
                ...(input.family && { family: input.family }),
                ...(input.trusted && { harness_model: "gpt-5" }),
              },
            },
          },
        },
      },
    })
    const env = { ...process.env }
    delete env.MIMOCODE_EXPERIMENTAL
    delete env.MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH
    delete env.MIMOCODE_CODEX_MODE
    delete env.MIMOCODE_CONFIG
    delete env.MIMOCODE_CONFIG_CONTENT
    delete env.MIMOCODE_CONFIG_DIR
    if (input.mode) env.MIMOCODE_CODEX_MODE = input.mode
    const child = Bun.spawn({
      cmd: [
        process.execPath,
        "--conditions=browser",
        "--preload",
        fileURLToPath(import.meta.resolve("@opentui/solid/preload")),
        path.resolve("src/index.ts"),
        "--pure",
        "debug",
        "agent",
        "example",
      ],
      cwd: tmp.path,
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    })
    const timer = setTimeout(() => child.kill("SIGKILL"), 30_000)
    try {
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect(code, stderr).toBe(0)
      const result = JSON.parse(stdout)
      expect(result.name).toBe("example")
      expect(result.tools.exec).toBe(input.codex ? true : undefined)
      expect(result.tools.edit).toBe(input.codex ? undefined : true)
      expect(result.tools.read).toBe(input.codex ? undefined : true)
    } finally {
      clearTimeout(timer)
      child.kill("SIGKILL")
    }
  },
  45_000,
)
