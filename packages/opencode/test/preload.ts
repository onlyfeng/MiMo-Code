// IMPORTANT: Set env vars BEFORE any imports from src/ directory
// xdg-basedir reads env vars at import time, so we must set these first
import os from "os"
import path from "path"
import { createHash } from "crypto"
import { constants as fsConstants, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs"
import fs from "fs/promises"
import { setTimeout as sleep } from "node:timers/promises"
import { afterAll } from "bun:test"

// Mirrors assertSafeDirectory in src/project/instance.ts: a fixture base it
// rejects could never become a project instance.
const protectedExactPaths = ["/private", "/var", "/private/var"]
const protectedPathPrefixes = ["/etc", "/proc", "/sys", "/dev", "/boot", "/private/etc", "/var/log", "/private/var/log"]

function containsPath(parent: string, child: string) {
  const relative = path.relative(path.resolve(parent), path.resolve(child))
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative))
}

async function findGitRoot(directory: string): Promise<string | undefined> {
  const current = path.resolve(directory)
  const hasGitDir = await fs
    .stat(path.join(current, ".git"))
    .then(() => true)
    .catch(() => false)
  if (hasGitDir) return current
  const parent = path.dirname(current)
  if (parent === current) return undefined
  return findGitRoot(parent)
}

async function gitFreeParent(directory: string): Promise<string> {
  const root = await findGitRoot(directory)
  if (!root) return path.resolve(directory)
  const parent = path.dirname(root)
  if (parent === root) return parent
  return gitFreeParent(parent)
}

async function isWritableDirectory(directory: string) {
  const isDirectory = await fs
    .stat(directory)
    .then((stat) => stat.isDirectory())
    .catch(() => false)
  if (!isDirectory) return false
  return fs
    .access(directory, fsConstants.W_OK)
    .then(() => true)
    .catch(() => false)
}

async function isFixtureBaseBlocked(candidate: string) {
  const resolved = path.resolve(candidate)
  if (resolved === path.parse(resolved).root) return true
  if (await findGitRoot(resolved)) return true
  if (process.platform !== "win32" && protectedExactPaths.includes(resolved)) return true
  if (process.platform !== "win32" && protectedPathPrefixes.some((prefix) => containsPath(prefix, resolved))) return true
  return !(await isWritableDirectory(resolved))
}

// A non-git fixture's worktree is "/", so config, command and skill discovery
// walk every ancestor of the fixture. Under the home directory that pulls in a
// developer's own ~/.mimocode and ~/.claude skills; inside the checkout, the
// repository's .mimocode. /var/tmp has no such ancestors, is not a temp root that
// Bash exempts from delete confirmation, and is writable on POSIX systems.
async function fixtureBase() {
  const candidates = await Promise.all(
    [
      ...(process.platform === "win32" ? [] : [await fs.realpath("/var/tmp").catch(() => "/var/tmp")]),
      os.homedir(),
      await gitFreeParent(process.cwd()),
      os.tmpdir(),
    ].map(async (candidate) => ({
      candidate,
      blocked: await isFixtureBaseBlocked(candidate),
    })),
  )
  const selected = candidates.find((candidate) => !candidate.blocked)
  return selected?.candidate ?? os.tmpdir()
}

function processGone(pid: number) {
  try {
    process.kill(pid, 0)
    return false
  } catch (error) {
    return !(typeof error === "object" && error !== null && "code" in error && error.code === "EPERM")
  }
}

// Every per-run root is `<prefix><pid>` and belongs to exactly one test process.
// A killed or timed-out run never reaches afterAll, so first reclaim, best
// effort, the roots whose process no longer exists. Another live PID, including
// another user's (EPERM), is never touched.
async function claimRoot(parent: string, prefix: string) {
  const names = await fs.readdir(parent).catch(() => [] as string[])
  await Promise.all(
    names
      .filter((name) => name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length)))
      .filter((name) => processGone(Number(name.slice(prefix.length))))
      .map((name) => fs.rm(path.join(parent, name), { recursive: true, force: true }).catch(() => undefined)),
  )
  // A root already named for this process was left by an earlier run whose PID
  // this one reuses. Its removal is not best effort: if it still fails after
  // retries, the run must stop rather than start on inherited state.
  const root = path.join(parent, prefix + process.pid)
  await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  return root
}

// Set XDG env vars FIRST, before any src/ imports. The process-wide data root
// lives under the OS temp directory, as upstream's does. Worktree bootstrap
// creates real project instances under Global.Path.data, which Instance accepts
// there: it rejects only the exact /var and /private/var roots and their log
// directories, not macOS's /private/var/folders temp tree. Resolve the temp
// directory first: on macOS it sits behind the /var symlink, and runtime events
// report canonical paths that tests compare with paths built from Global.Path.
const dir = await claimRoot(await fs.realpath(os.tmpdir()), "mimocode-test-data-")
await fs.mkdir(dir, { recursive: true })

// Route default fixture tmpdirs outside the repository checkout, protected
// system paths, and preferably outside temp roots (see fixtureBase): Bash
// exempts temp-only deletions from confirmation, so a fixture project under temp
// would let the "target outside temp" deletion cases pass for a different
// reason. HTTP route tests that must pass the InstanceMiddleware cwd containment
// check opt into root: "cwd" in the fixture helper.
const fixtureRoot = await claimRoot(await fixtureBase(), ".mimocode-test-fixtures-")
await fs.mkdir(fixtureRoot, { recursive: true })
process.env["MIMOCODE_TEST_TMPDIR_ROOT"] = fixtureRoot

// outsideGit fixtures need a directory no checkout can contain; /tmp is that on
// POSIX. Group them per process so a killed run's leftovers are reclaimable too.
const outsideGitRoot = await claimRoot(
  process.platform === "win32" ? os.tmpdir() : "/tmp",
  "mimocode-test-outside-git-",
)
process.env["MIMOCODE_TEST_OUTSIDE_GIT_ROOT"] = outsideGitRoot

// A session boot starts the cron scheduler (on by default), whose lock and task
// file live in process.cwd()/.mimocode: this package directory inside the checkout.
// Tests keep that production path, so the harness owns and removes that directory
// when it had to create it. Ownership is the created directory's identity (device,
// inode and birth time), recorded in a marker outside the checkout: a directory
// deleted and recreated by someone else never matches. Release also waits while
// any other test process or a live foreign lock owner may still use the directory,
// and hands over a directory holding anything beyond runtime artifacts. Startup
// applies it to what a killed run left; afterAll to this run.
const tmpRoot = await fs.realpath(os.tmpdir())
const cwdMimocode = path.join(process.cwd(), ".mimocode")
const cwdMimocodeMarker = path.join(
  tmpRoot,
  "mimocode-test-cwd-" + createHash("sha256").update(cwdMimocode).digest("hex").slice(0, 16),
)
const runtimeArtifacts = [".cron-lock", ".gitignore", "package.json", "package-lock.json", "bun.lock", "node_modules"]
const identity = (target: string) => {
  const stat = statSync(target)
  return `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`
}
const releaseCwdMimocode = () => {
  const read = <T>(fn: () => T, fallback: T) => {
    try {
      return fn()
    } catch {
      return fallback
    }
  }
  if (!existsSync(cwdMimocodeMarker)) return
  if (read(() => readFileSync(cwdMimocodeMarker, "utf8") !== identity(cwdMimocode), true)) {
    rmSync(cwdMimocodeMarker, { force: true })
    return
  }
  const otherTestRun = read(() => readdirSync(tmpRoot), [] as string[])
    .map((name) => /^mimocode-test-data-(\d+)$/.exec(name)?.[1])
    .some((pid) => pid && Number(pid) !== process.pid && !processGone(Number(pid)))
  if (otherTestRun) return
  const lockPath = path.join(cwdMimocode, ".cron-lock")
  const lock = read(() => {
    const ageMs = Date.now() - statSync(lockPath).mtimeMs
    const parsed: unknown = read(() => JSON.parse(readFileSync(lockPath, "utf8")), undefined)
    const pid = typeof parsed === "object" && parsed !== null && "pid" in parsed ? Number(parsed.pid) : undefined
    return { pid, ageMs }
  }, undefined)
  // A lock nobody can parse yet may be one another process has just opened and is
  // still writing; only a minute without changes makes it a killed run's debris.
  if (lock && !lock.pid && lock.ageMs < 60_000) return
  if (lock?.pid && lock.pid !== process.pid && !processGone(lock.pid)) return
  if (read(() => readdirSync(cwdMimocode), [] as string[]).every((name) => runtimeArtifacts.includes(name)))
    rmSync(cwdMimocode, { recursive: true, force: true })
  rmSync(cwdMimocodeMarker, { force: true })
}
releaseCwdMimocode()
// A non-recursive mkdir fails on an existing directory, so ownership is recorded
// only when this call is what created it, never for one that appeared meanwhile.
const createdCwdMimocode = (() => {
  try {
    mkdirSync(cwdMimocode)
    return true
  } catch {
    return false
  }
})()
if (createdCwdMimocode) writeFileSync(cwdMimocodeMarker, identity(cwdMimocode))

afterAll(async () => {
  const { Database } = await import("../src/storage")
  Database.close()
  const roots = [dir, fixtureRoot, outsideGitRoot]
  const removeSync = (target: string) => {
    try {
      rmSync(target, { recursive: true, force: true })
      return true
    } catch {
      return false
    }
  }

  // Remove synchronously before anything awaits a timer. When a test file fails
  // to load, bun test stops waiting for this hook at its first timer, and
  // detached background work such as Config's dependency install recreates
  // removed paths whenever the hook yields. bun test runs no exit listeners, so
  // there is no later chance.
  const left = roots.filter((target) => !removeSync(target))
  releaseCwdMimocode()
  if (left.length === 0) return

  const busy = (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "EBUSY"
  const rm = async (target: string, left: number): Promise<void> => {
    Bun.gc(true)
    await sleep(100)
    return fs.rm(target, { recursive: true, force: true }).catch((error) => {
      if (!busy(error)) throw error
      if (left <= 1) throw error
      return rm(target, left - 1)
    })
  }

  // Windows can keep SQLite WAL handles alive until GC finalizers run, so we
  // force GC and retry teardown to avoid flaky EBUSY in test cleanup.
  for (const target of left) await rm(target, 30)
  // Those awaits yielded to background writers; a path they recreated is left
  // for the next run to reclaim if this last pass cannot remove it.
  roots.forEach(removeSync)
})

process.env["XDG_DATA_HOME"] = path.join(dir, "share")
process.env["XDG_CACHE_HOME"] = path.join(dir, "cache")
process.env["XDG_CONFIG_HOME"] = path.join(dir, "config")
process.env["XDG_STATE_HOME"] = path.join(dir, "state")
process.env["MIMOCODE_MODELS_PATH"] = path.join(import.meta.dir, "tool", "fixtures", "models-api.json")

// Set test home directory to isolate tests from user's actual home directory.
// This prevents tests from picking up real user configs/skills from ~/.claude/skills.
// Production code reads HOME/USERPROFILE directly (not os.homedir()) because Bun
// caches os.homedir() at process start, so mutating it here would be a no-op.
const testHome = path.join(dir, "home")
await fs.mkdir(testHome, { recursive: true })
process.env["HOME"] = testHome
process.env["USERPROFILE"] = testHome

// Set test managed config directory to isolate tests from system managed settings
const testManagedConfigDir = path.join(dir, "managed")
process.env["MIMOCODE_TEST_MANAGED_CONFIG_DIR"] = testManagedConfigDir
process.env["MIMOCODE_DISABLE_DEFAULT_PLUGINS"] = "true"

// Write the cache version file to prevent global/index.ts from clearing the cache
const cacheDir = path.join(dir, "cache", "mimocode")
await fs.mkdir(cacheDir, { recursive: true })
await fs.writeFile(path.join(cacheDir, "version"), "14")

// Clear provider and server auth env vars to ensure clean test state
delete process.env["ANTHROPIC_API_KEY"]
delete process.env["OPENAI_API_KEY"]
delete process.env["GOOGLE_API_KEY"]
delete process.env["GOOGLE_GENERATIVE_AI_API_KEY"]
delete process.env["AZURE_OPENAI_API_KEY"]
delete process.env["AWS_ACCESS_KEY_ID"]
delete process.env["AWS_PROFILE"]
delete process.env["AWS_REGION"]
delete process.env["AWS_BEARER_TOKEN_BEDROCK"]
delete process.env["OPENROUTER_API_KEY"]
delete process.env["LLM_GATEWAY_API_KEY"]
delete process.env["GROQ_API_KEY"]
delete process.env["MISTRAL_API_KEY"]
delete process.env["PERPLEXITY_API_KEY"]
delete process.env["TOGETHER_API_KEY"]
delete process.env["XAI_API_KEY"]
delete process.env["DEEPSEEK_API_KEY"]
delete process.env["FIREWORKS_API_KEY"]
delete process.env["CEREBRAS_API_KEY"]
delete process.env["SAMBANOVA_API_KEY"]
delete process.env["MIMOCODE_SERVER_PASSWORD"]
delete process.env["MIMOCODE_SERVER_USERNAME"]
delete process.env["MIMOCODE_HOME"]

// Use in-memory sqlite
process.env["MIMOCODE_DB"] = ":memory:"

// Enable the experimental Orchestrator feature in tests (default OFF in prod).
// The Orchestrator agent, `session` tool, and approval routing are gated behind
// MIMOCODE_EXPERIMENTAL_ORCHESTRATOR; the orchestrator test suites exercise the
// feature, so enable it here (Flag is read once at import — must be set first).
process.env["MIMOCODE_EXPERIMENTAL_ORCHESTRATOR"] = "true"

// Now safe to import from src/
const { Log } = await import("../src/util")
const { initProjectors } = await import("../src/server/projectors")

void Log.init({
  print: false,
  dev: true,
  level: "DEBUG",
})

initProjectors()
