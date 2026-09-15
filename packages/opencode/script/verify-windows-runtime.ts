import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import z from "zod"
import { archiveCaseNames } from "../test/fixture/windows-archive-runtime"

assert.equal(process.platform, "win32", "This verifier must run on actual Windows; a non-Windows skip is not evidence")

const directory = fileURLToPath(new URL("..", import.meta.url))
const artifacts = path.join(directory, ".artifacts", "windows-runtime")
await fs.mkdir(artifacts, { recursive: true })
const selectors = [
  "MIMOCODE_EXPERIMENTAL",
  "MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH",
  "MIMOCODE_CODEX_MODE",
  "MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL",
  "MIMOCODE_COMPACTION_MAX_CONTEXT",
  "MIMOCODE_COMPACTION_TRIGGER_RATIO",
  "MIMOCODE_DISABLE_CHECKPOINT",
  "MIMOCODE_EXPERIMENTAL_WORKSPACES",
]
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !selectors.includes(name.toUpperCase())))
env.NO_COLOR = "1"
env.FORCE_COLOR = "0"

const run = async (name: string, args: string[]) => {
  const stdout = path.join(artifacts, `${name}.stdout.log`)
  const stderr = path.join(artifacts, `${name}.stderr.log`)
  const child = Bun.spawn([process.execPath, ...args], {
    cwd: directory,
    env,
    stdin: "ignore",
    stdout: Bun.file(stdout),
    stderr: Bun.file(stderr),
  })
  const code = await child.exited
  console.log(`${name}: exit ${code}`)
  process.stdout.write(await fs.readFile(stdout))
  process.stderr.write(await fs.readFile(stderr))
  return code
}

const archiveReport = path.join(artifacts, "archive.json")
const archiveExit = await run("archive", ["test/fixture/windows-archive-runtime.ts", archiveReport])
const noRgTests = [
  "fallback files handles only simple listings",
  "fallback files requires ripgrep for advanced listing options",
  "fallback files requires ripgrep when ignore semantics are present",
  "fallback files allows gitignore outside source control",
  "fallback files fails before yielding nested marker results",
  "fallback files fails on caller abort",
  "fallback search requires ripgrep",
  "fallback files works for deep trees without markers",
]
const posixOnly = [
  "fallback files resolves cwd before marker scanning",
  "fallback files ignores lexical-only markers for symlinked cwd",
  "fallback files preserves directory read errors",
]
const junit = path.join(artifacts, "no-rg.junit.xml")
const noRgExit = await run("no-rg", [
  "test",
  "test/file/ripgrep.test.ts",
  "-t",
  `(?:${noRgTests.join("|")})$`,
  "--reporter=junit",
  `--reporter-outfile=${junit}`,
])
console.log(`POSIX-only cases not executed or counted: ${posixOnly.join("; ")}`)

const files = ["src/util/archive.ts", "src/util/process.ts", "src/file/ripgrep.ts"]
await fs.writeFile(
  path.join(artifacts, "runtime.json"),
  `${JSON.stringify(
    {
      platform: process.platform,
      arch: process.arch,
      bun: Bun.version,
      github_sha: process.env.GITHUB_SHA ?? null,
      archiveExit,
      noRgExit,
      selectedArchiveCases: archiveCaseNames,
      selectedNoRgTests: noRgTests,
      removedSelectors: selectors,
      packageTestPreload: ["@opentui/solid/preload", "test/preload.ts (ORCHESTRATOR=true)"],
      posixOnlyNotCovered: posixOnly,
      sourceSha256: Object.fromEntries(
        await Promise.all(
          files.map(async (file) => [
            file,
            createHash("sha256")
              .update(await fs.readFile(path.join(directory, file)))
              .digest("hex"),
          ]),
        ),
      ),
    },
    null,
    2,
  )}\n`,
)
assert.equal(archiveExit, 0, "Actual Windows archive verification failed")
assert.equal(noRgExit, 0, "Actual Windows no-rg verification failed")
const archive = z
  .object({
    platform: z.literal("win32"),
    cases: z.array(z.object({ name: z.string(), passed: z.literal(true) })),
  })
  .parse(JSON.parse(await fs.readFile(archiveReport, "utf8")))
assert.deepEqual(
  archive.cases.map((entry) => entry.name),
  archiveCaseNames,
)
const cases = [...(await fs.readFile(junit, "utf8")).matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)]
  .map((entry) => ({
    name: /\bname="([^"]*)"/.exec(entry[1])?.[1] ?? "",
    assertions: Number(/\bassertions="(\d+)"/.exec(entry[1])?.[1] ?? 0),
    body: entry[2] ?? "",
  }))
  .filter((entry) => noRgTests.includes(entry.name))
assert.deepEqual(
  cases.map((entry) => entry.name).sort((a, b) => a.localeCompare(b)),
  [...noRgTests].sort((a, b) => a.localeCompare(b)),
  "Every selected no-rg test must execute",
)
assert.ok(
  cases.every((entry) => !/<(?:failure|error|skipped)\b/.test(entry.body)),
  "No selected no-rg case may fail or skip",
)
assert.ok(
  cases.every((entry) => entry.assertions > 0),
  "A platform-guard return without assertions is not a pass",
)
console.log(
  `Windows runtime verification passed: ${archive.cases.length} archive cases and ${cases.length} no-rg tests`,
)
