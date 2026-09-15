import { expect, test } from "bun:test"
import path from "node:path"

// Run the real application in its own test process: changing cwd must not affect
// neighboring suites, and their mock.module registrations must not replace it.
for (const scenario of ["disabled", "enabled", "read-only"] as const) {
  test(`built-in progress checker follows the alternate-cwd actor and Write chain: ${scenario}`, async () => {
    const env: NodeJS.ProcessEnv = { ...process.env, MIMOCODE_TEST_PROGRESS_CHAIN_CASE: scenario }
    for (const selector of [
      "MIMOCODE_EXPERIMENTAL",
      "MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH",
      "MIMOCODE_CODEX_MODE",
      "MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL",
      "MIMOCODE_EXPERIMENTAL_WORKSPACES",
      "MIMOCODE_COMPACTION_MAX_CONTEXT",
      "MIMOCODE_COMPACTION_TRIGGER_RATIO",
      "MIMOCODE_DISABLE_CHECKPOINT",
      "MIMOCODE_CONFIG",
      "MIMOCODE_CONFIG_CONTENT",
      "MIMOCODE_CONFIG_DIR",
    ])
      delete env[selector]

    const child = Bun.spawn({
      // The nested runner has its own budget; leave time for imports and cleanup
      // before the process watchdog and outer test deadlines.
      cmd: [process.execPath, "test", "./test/fixture/subagent-progress-chain-child.ts", "--timeout", "15000"],
      cwd: path.resolve(import.meta.dir, "../.."),
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    })
    const timer = setTimeout(() => child.kill("SIGKILL"), 25_000)
    try {
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect(code, `${stdout}\n${stderr}`).toBe(0)
      expect(stdout).toContain(`progress-chain-complete:${scenario}`)
    } finally {
      clearTimeout(timer)
      child.kill("SIGKILL")
      await child.exited
    }
  }, 30_000)
}
