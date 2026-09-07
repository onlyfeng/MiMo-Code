import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { parseArgs } from "node:util"

function within(root: string, file: string) {
  const relative = path.relative(root, file)
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
}

/** Run before importing Global/Config/Provider. The launcher owns isolation. */
export async function checkIsolation() {
  const configured = process.env.MIMOCODE_SCHEMA_ISOLATION_ROOT
  if (!configured)
    throw new Error("MIMOCODE_SCHEMA_ISOLATION_ROOT must identify an existing isolated experiment directory")
  const root = await fs.realpath(configured)
  for (const flag of [
    "MIMOCODE_DISABLE_PROJECT_CONFIG",
    "MIMOCODE_DISABLE_DEFAULT_PLUGINS",
    "MIMOCODE_DISABLE_EXTERNAL_SKILLS",
    "MIMOCODE_DISABLE_CLAUDE_CODE",
  ])
    if (process.env[flag] !== "true") throw new Error(`Isolation requires ${flag}=true`)
  if (process.env.MIMOCODE_CONFIG_CONTENT) throw new Error("Inline config is not accepted by this experiment launcher")
  for (const name of ["MIMOCODE_CONFIG", "MIMOCODE_HOME", "MIMOCODE_TEST_MANAGED_CONFIG_DIR"]) {
    const configured = process.env[name]
    if (!configured || !within(root, await fs.realpath(configured)))
      throw new Error(`Isolation requires ${name} inside the experiment directory`)
  }
  for (const name of ["XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_STATE_HOME", "XDG_CACHE_HOME", "MIMOCODE_CONFIG_DIR"]) {
    const configured = process.env[name]
    if (configured && !within(root, path.resolve(configured)))
      throw new Error(`${name} points outside the experiment directory`)
  }
  const config = await fs.stat(process.env.MIMOCODE_CONFIG!)
  if ((config.mode & 0o077) !== 0) throw new Error("The isolated config must have mode 0600")
  for (const directory of [
    path.join(os.homedir(), ".mimocode"),
    path.join(os.homedir(), ".claude"),
    path.join(os.homedir(), ".config", "mimocode"),
    "/Library/Managed Preferences",
  ]) {
    const readable = await fs.readdir(directory).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (["ENOENT", "EACCES", "EPERM"].includes(error.code ?? "")) return false
        throw error
      },
    )
    if (readable)
      throw new Error("Real user or managed configuration remains readable; use the documented isolated launcher")
  }
  return root
}

export async function main(argv: string[]) {
  const args = parseArgs({
    args: argv,
    options: {
      mode: { type: "string", default: "offline" },
      model: { type: "string" },
      out: { type: "string" },
      cases: { type: "string", default: "6" },
      repeats: { type: "string", default: "2" },
      "max-steps": { type: "string", default: "3" },
      "max-output-tokens": { type: "string", default: "1024" },
      seed: { type: "string" },
    },
  }).values
  if (args.mode !== "offline" && args.mode !== "live") throw new Error("mode must be offline or live")
  if (!args.out) throw new Error("--out is required for a reviewable experiment report")
  const root = await checkIsolation()
  const { runExperiment, disposeExperimentRuntime } = await import("./tool-schema-runtime")
  try {
    const report = await runExperiment({
      mode: args.mode,
      model: args.model,
      root,
      cases: Number(args.cases),
      repeats: Number(args.repeats),
      maxSteps: Number(args["max-steps"]),
      maxOutputTokens: Number(args["max-output-tokens"]),
      seed: args.seed,
    })
    await fs.writeFile(args.out, JSON.stringify(report, null, 2), { mode: 0o600 })
    console.log(
      JSON.stringify({
        mode: report.mode,
        model: report.model,
        runs: report.runs.length,
        completed: report.runs.filter((run) => run.liveTaskCompleted ?? run.replayCompleted).length,
        output: path.resolve(args.out),
      }),
    )
  } finally {
    await disposeExperimentRuntime()
  }
}

if (import.meta.main) {
  await main(process.argv.slice(2)).catch(() => {
    // Do not print provider/config exceptions: those can include credentials.
    console.error(
      "Schema experiment failed. Check isolation, bounds, and configured model availability; no provider exception body was printed.",
    )
    process.exitCode = 1
  })
}
