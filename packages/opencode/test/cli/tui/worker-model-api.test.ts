import { expect, test } from "bun:test"
import path from "node:path"
import fs from "node:fs/promises"
import { tmpdir } from "../../fixture/fixture"

test("real non-test TUI workers default model API keeps authentication and same-cwd shutdown independent", async () => {
  await using tmp = await tmpdir({ git: true })
  await fs.mkdir(path.join(tmp.path, "home"), { recursive: true })
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !key.startsWith("MIMOCODE_") &&
        ![
          "NODE_OPTIONS",
          "BUN_OPTIONS",
          "XDG_DATA_HOME",
          "XDG_CONFIG_HOME",
          "XDG_CACHE_HOME",
          "XDG_STATE_HOME",
        ].includes(key),
    ),
  )
  Object.assign(env, {
    HOME: path.join(tmp.path, "home"),
    USERPROFILE: path.join(tmp.path, "home"),
    MIMOCODE_HOME: path.join(tmp.path, "runtime"),
    XDG_DATA_HOME: path.join(tmp.path, "xdg-data"),
    XDG_CONFIG_HOME: path.join(tmp.path, "xdg-config"),
    XDG_CACHE_HOME: path.join(tmp.path, "xdg-cache"),
    XDG_STATE_HOME: path.join(tmp.path, "xdg-state"),
    MIMOCODE_MIMO_ONLY: "true",
    MIMOCODE_DISABLE_MODELS_FETCH: "true",
    MIMOCODE_MODELS_PATH: path.resolve("test/tool/fixtures/models-api.json"),
    MIMOCODE_DISABLE_DEFAULT_PLUGINS: "true",
    MIMOCODE_DISABLE_BUILTIN_SKILLS: "true",
    MIMOCODE_DISABLE_COMPOSE_SKILLS: "true",
    MIMOCODE_DISABLE_EXTERNAL_SKILLS: "true",
    MIMOCODE_DISABLE_INSTRUCTIONS: "true",
    MIMOCODE_DISABLE_AUTOUPDATE: "true",
    MIMOCODE_ENABLE_ANALYSIS: "false",
  })
  const child = Bun.spawn({
    cmd: [process.execPath, path.resolve("test/fixture/tui-worker-default-child.ts")],
    cwd: tmp.path,
    env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const done = Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
  const deadline = Promise.withResolvers<never>()
  const timer = setTimeout(() => deadline.reject(new Error("Real worker child exceeded 50s")), 50_000)
  try {
    const [code, stdout, stderr] = await Promise.race([done, deadline.promise])
    expect(code, stderr).toBe(0)
    const result = JSON.parse(stdout)
    expect(result).toEqual({
      runtime: Bun.version,
      childTestPreload: false,
      orchestrator: false,
      selectorsAbsent: true,
      workers: 2,
      samePid: true,
      defaultConcurrentStartReused: true,
      httpUnauthorized: 401,
      rpcFetch: 200,
      basicModel: 401,
      bearerChats: [200, 200, 200],
      separateCredentials: true,
      rawRegistrationCounts: [0, 1, 2, 1, 0],
      socketsClosedBeforeTermination: [true, true],
      restartRejected: true,
      stoppedRpcFetch: 503,
      tokenStillValid: true,
    })
    expect(stdout).not.toContain("Basic ")
    expect(stdout).not.toContain("Bearer ")
    expect(stdout).not.toContain("Authorization")
    expect(stdout).not.toContain("fixture-provider-only")
    expect(stderr).not.toContain("Basic ")
  } finally {
    clearTimeout(timer)
    child.kill("SIGKILL")
    const cleanup = Promise.withResolvers<never>()
    const guard = setTimeout(() => cleanup.reject(new Error("Worker child cleanup exceeded 2s")), 2000)
    try {
      await Promise.race([done, cleanup.promise])
    } finally {
      clearTimeout(guard)
    }
  }
}, 60_000)
