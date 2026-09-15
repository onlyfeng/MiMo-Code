import { expect, test } from "bun:test"
import path from "node:path"
import { mkdir } from "node:fs/promises"
import { tmpdir } from "../fixture/fixture"

test("real MCP HTTP transport completes isolated OAuth discovery, PKCE, refresh and cancellation", async () => {
  await using tmp = await tmpdir({ git: true })
  const home = path.join(tmp.path, "home")
  await mkdir(home)
  const stderr = Bun.file(path.join(tmp.path, "child.stderr"))
  const bind = process.env.MIMOCODE_TEST_MCP_LAB_BIND ?? "127.0.0.1"
  const child = Bun.spawn(
    [process.execPath, path.resolve(import.meta.dirname, "../fixture/mcp-real-transport-child.ts")],
    {
      cwd: path.resolve(import.meta.dirname, "../.."),
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        MIMOCODE_HOME: path.join(tmp.path, "application"),
        MIMOCODE_CONFIG: undefined,
        MIMOCODE_CONFIG_DIR: undefined,
        MIMOCODE_CONFIG_CONTENT: undefined,
        MIMOCODE_DB: path.join(tmp.path, "application.db"),
        MIMOCODE_SKIP_MIGRATIONS: undefined,
        MIMOCODE_DISABLE_DEFAULT_PLUGINS: "true",
        MIMOCODE_EXPERIMENTAL: undefined,
        MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH: undefined,
        MIMOCODE_CODEX_MODE: undefined,
        MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL: undefined,
        MIMOCODE_COMPACTION_MAX_CONTEXT: undefined,
        MIMOCODE_COMPACTION_TRIGGER_RATIO: undefined,
        MIMOCODE_DISABLE_CHECKPOINT: undefined,
        MIMOCODE_EXPERIMENTAL_WORKSPACES: undefined,
        MIMOCODE_TEST_MCP_LAB_DIRECTORY: tmp.path,
        MIMOCODE_TEST_MCP_LAB_RESULT: path.join(tmp.path, "result.json"),
      },
      stdin: "ignore",
      stdout: Bun.file(path.join(tmp.path, "child.stdout")),
      stderr,
    },
  )
  const timer = setTimeout(() => child.kill("SIGKILL"), 30_000)
  try {
    const exit = await child.exited
    expect({ exit, stderr: exit ? (await stderr.text()).replaceAll(bind, "<lab-bind>") : "" }).toEqual({
      exit: 0,
      stderr: "",
    })
    expect(await Bun.file(path.join(tmp.path, "result.json")).json()).toEqual({
      transport: bind === "127.0.0.1" ? "loopback" : "private-interface",
      resourceDiscovery: true,
      issuerDiscovery: true,
      dynamicRegistration: true,
      pkce: true,
      invalidStateRejected: true,
      callback: true,
      toolCalls: 2,
      refresh: true,
      cancelled: true,
      lateCallbackRejected: true,
      tokenGrants: ["authorization_code", "refresh_token"],
    })
  } finally {
    clearTimeout(timer)
    if (child.exitCode === null) {
      child.kill("SIGKILL")
      await child.exited
    }
  }
}, 40_000)
