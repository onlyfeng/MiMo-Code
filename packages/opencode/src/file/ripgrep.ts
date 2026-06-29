import nodeFs from "fs"
import ignore from "ignore"
import path from "path"
import z from "zod"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { Glob } from "@mimo-ai/shared/util/glob"
import { Cause, Context, Effect, Fiber, Layer, Queue, Stream } from "effect"
import type { PlatformError } from "effect/PlatformError"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http"
import { ChildProcess } from "effect/unstable/process"
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"

import * as CrossSpawnSpawner from "@/effect/cross-spawn-spawner"
import { Global } from "@/global"
import { Log } from "@/util"
import { windowsZipExtractCommand } from "@/util/archive"
import { sanitizedProcessEnv } from "@/util/mimo-process"
import { which } from "@/util/which"

const log = Log.create({ service: "ripgrep" })
const VERSION = "15.1.0"
type IgnoreContext = { root: string; matcher: ReturnType<typeof ignore>; kind: "git" | "generic" }
type GitInfo = { root: string; dir: string; global: string[] }
const PLATFORM = {
  "arm64-darwin": { platform: "aarch64-apple-darwin", extension: "tar.gz" },
  "arm64-linux": { platform: "aarch64-unknown-linux-gnu", extension: "tar.gz" },
  "x64-darwin": { platform: "x86_64-apple-darwin", extension: "tar.gz" },
  "x64-linux": { platform: "x86_64-unknown-linux-musl", extension: "tar.gz" },
  "arm64-win32": { platform: "aarch64-pc-windows-msvc", extension: "zip" },
  "ia32-win32": { platform: "i686-pc-windows-msvc", extension: "zip" },
  "x64-win32": { platform: "x86_64-pc-windows-msvc", extension: "zip" },
} as const

const Stats = z.object({
  elapsed: z.object({
    secs: z.number(),
    nanos: z.number(),
    human: z.string(),
  }),
  searches: z.number(),
  searches_with_match: z.number(),
  bytes_searched: z.number(),
  bytes_printed: z.number(),
  matched_lines: z.number(),
  matches: z.number(),
})

const Begin = z.object({
  type: z.literal("begin"),
  data: z.object({
    path: z.object({
      text: z.string(),
    }),
  }),
})

export const Match = z.object({
  type: z.literal("match"),
  data: z.object({
    path: z.object({
      text: z.string(),
    }),
    lines: z.object({
      text: z.string(),
    }),
    line_number: z.number(),
    absolute_offset: z.number(),
    submatches: z.array(
      z.object({
        match: z.object({
          text: z.string(),
        }),
        start: z.number(),
        end: z.number(),
      }),
    ),
  }),
})

const End = z.object({
  type: z.literal("end"),
  data: z.object({
    path: z.object({
      text: z.string(),
    }),
    binary_offset: z.number().nullable(),
    stats: Stats,
  }),
})

const Summary = z.object({
  type: z.literal("summary"),
  data: z.object({
    elapsed_total: z.object({
      human: z.string(),
      nanos: z.number(),
      secs: z.number(),
    }),
    stats: Stats,
  }),
})

const Result = z.union([Begin, Match, End, Summary])

export type Result = z.infer<typeof Result>
export type Match = z.infer<typeof Match>
export type Item = Match["data"]
export type Begin = z.infer<typeof Begin>
export type End = z.infer<typeof End>
export type Summary = z.infer<typeof Summary>
export type Row = Match["data"]

export interface SearchResult {
  items: Item[]
  partial: boolean
}

export interface FilesInput {
  cwd: string
  glob?: string[]
  hidden?: boolean
  follow?: boolean
  maxDepth?: number
  signal?: AbortSignal
}

export interface SearchInput {
  cwd: string
  pattern: string
  glob?: string[]
  limit?: number
  follow?: boolean
  file?: string[]
  signal?: AbortSignal
}

export interface TreeInput {
  cwd: string
  limit?: number
  signal?: AbortSignal
}

export interface Interface {
  readonly files: (input: FilesInput) => Stream.Stream<string, PlatformError | Error>
  readonly tree: (input: TreeInput) => Effect.Effect<string, PlatformError | Error>
  readonly search: (input: SearchInput) => Effect.Effect<SearchResult, PlatformError | Error>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Ripgrep") {}

function env() {
  const env = sanitizedProcessEnv()
  delete env.RIPGREP_CONFIG_PATH
  return env
}

function aborted(signal?: AbortSignal) {
  const err = signal?.reason
  if (err instanceof Error) return err
  const out = new Error("Aborted")
  out.name = "AbortError"
  return out
}

function waitForAbort(signal?: AbortSignal) {
  if (!signal) return Effect.never
  if (signal.aborted) return Effect.fail(aborted(signal))
  return Effect.callback<never, Error>((resume) => {
    const onabort = () => resume(Effect.fail(aborted(signal)))
    signal.addEventListener("abort", onabort, { once: true })
    return Effect.sync(() => signal.removeEventListener("abort", onabort))
  })
}

function error(stderr: string, code: number) {
  const err = new Error(stderr.trim() || `ripgrep failed with code ${code}`)
  err.name = "RipgrepError"
  return err
}

function clean(file: string) {
  return path.normalize(file.replace(/^\.[\\/]/, ""))
}

// Approximate `rg --glob` for the no-rg fallback, following .gitignore glob rules:
// a leading "!" excludes, later patterns win (last match decides), and any positive
// pattern flips matching to allowlist mode. A pattern without a slash matches at any
// depth (against the basename, so `*.ts` still hits `src/a.ts`); a pattern with a slash
// matches the full cwd-relative path. Rooted patterns are anchored to the search cwd.
function globRule(glob: string) {
  const negated = glob.startsWith("!")
  const raw = negated ? glob.slice(1) : glob
  const pattern = raw.startsWith("/") ? raw.slice(1) : raw
  return { negated, pattern }
}

function globTarget(posix: string, base: string, pattern: string, directory: boolean) {
  if (directory && pattern.endsWith("/")) return `${posix}/`
  return pattern.includes("/") ? posix : base
}

function matchesGlobs(rel: string, globs: string[]) {
  const posix = rel.split(path.sep).join("/")
  const base = posix.slice(posix.lastIndexOf("/") + 1)
  return globs.reduce(
    (included, glob) => {
      const rule = globRule(glob)
      return Glob.match(rule.pattern, globTarget(posix, base, rule.pattern, false)) ? !rule.negated : included
    },
    !globs.some((g) => !g.startsWith("!")),
  )
}

function matchesDirectoryGlobs(rel: string, globs: string[]) {
  const posix = rel.split(path.sep).join("/")
  const base = posix.slice(posix.lastIndexOf("/") + 1)
  return globs.reduce((included, glob) => {
    const rule = globRule(glob)
    return Glob.match(rule.pattern, globTarget(posix, base, rule.pattern, true)) ? !rule.negated : included
  }, false)
}

function excludedByGlobs(rel: string, globs: string[]) {
  const posix = rel.split(path.sep).join("/")
  const base = posix.slice(posix.lastIndexOf("/") + 1)
  return globs.reduce((excluded, glob) => {
    const rule = globRule(glob)
    return Glob.match(rule.pattern, globTarget(posix, base, rule.pattern, true)) ? rule.negated : excluded
  }, false)
}

function ignorePath(file: string, directory: boolean) {
  const normalized = file.split(path.sep).join("/").replace(/\/+$/, "")
  return directory ? `${normalized}/` : normalized
}

function isInside(root: string, file: string) {
  const rel = path.relative(root, file)
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
}

function allowExplicitDirectory(dir: string, contexts: IgnoreContext[]) {
  return contexts.map((context) => {
    if (!isInside(context.root, dir)) return context
    const rel = path.relative(context.root, dir)
    if (!rel) return context
    const target = ignorePath(rel, true)
    if (context.matcher.test(target).ignored) context.matcher.add(`!${target}`)
    return context
  })
}

function isIgnored(file: string, directory: boolean, contexts: IgnoreContext[]) {
  return contexts.reduce((ignored, context) => {
    if (!isInside(context.root, file)) return ignored
    const rel = path.relative(context.root, file)
    const result = context.matcher.test(ignorePath(rel, directory))
    if (result.unignored) return false
    if (result.ignored) return true
    return ignored
  }, false)
}

async function gitDir(root: string) {
  const dotGit = path.join(root, ".git")
  const stat = await nodeFs.promises.stat(dotGit).catch(() => undefined)
  if (!stat) return
  if (stat.isDirectory()) return dotGit
  if (!stat.isFile()) return
  const match = /^gitdir:\s*(.+)\s*$/i.exec(await nodeFs.promises.readFile(dotGit, "utf8").catch(() => ""))
  return match ? path.resolve(root, match[1]!) : undefined
}

function expandGitPath(file: string) {
  if (file === "~") return Global.Path.home
  if (file.startsWith("~/")) return path.join(Global.Path.home, file.slice(2))
  return file
}

function coreExcludesFiles(text: string) {
  return text
    .split(/\r?\n/)
    .reduce(
      (state, line) => {
        const section = /^\s*\[([^\]]+)\]\s*$/.exec(line)
        if (section) return { core: section[1]?.trim().toLowerCase() === "core", files: state.files }
        if (!state.core) return state
        const match = /^\s*excludesfile\s*=\s*(.+?)\s*$/i.exec(line)
        return match ? { ...state, files: [...state.files, expandGitPath(match[1]!)] } : state
      },
      { core: false, files: [] as string[] },
    )
    .files
}

async function globalGitIgnoreFiles() {
  const config = process.env.XDG_CONFIG_HOME ?? path.join(Global.Path.home, ".config")
  const configured = (
    await Promise.all(
      [path.join(Global.Path.home, ".gitconfig"), path.join(config, "git", "config")].map((file) =>
        nodeFs.promises.readFile(file, "utf8").catch(() => ""),
      ),
    )
  ).flatMap(coreExcludesFiles)
  return configured.length > 0 ? configured : [path.join(config, "git", "ignore")]
}

async function findGitInfo(cwd: string): Promise<GitInfo | undefined> {
  let dir = path.resolve(cwd)
  while (true) {
    const found = await gitDir(dir)
    if (found) return { root: dir, dir: found, global: await globalGitIgnoreFiles() }
    const parent = path.dirname(dir)
    if (parent === dir) return
    dir = parent
  }
}

async function gitInfoAt(dir: string): Promise<GitInfo | undefined> {
  const found = await gitDir(dir)
  return found ? { root: dir, dir: found, global: await globalGitIgnoreFiles() } : undefined
}

async function gitInfoForDir(dir: string, git?: GitInfo) {
  return (await gitInfoAt(dir)) ?? (git && isInside(git.root, dir) ? git : undefined)
}

function parentDirs(cwd: string) {
  const dirs: string[] = []
  const resolved = path.resolve(cwd)
  let dir = path.dirname(resolved)
  while (dir !== resolved) {
    dirs.push(dir)
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return dirs.reverse()
}

async function addIgnoreMatcher(
  dir: string,
  contexts: IgnoreContext[],
  files: string[],
  kind: IgnoreContext["kind"],
) {
  const texts = await Promise.all(files.map((file) => nodeFs.promises.readFile(file, "utf8").catch(() => "")))
  if (!texts.some(Boolean)) return contexts
  const matcher = ignore()
  for (const text of texts) {
    if (text) matcher.add(text)
  }
  return [...contexts, { root: dir, matcher, kind }]
}

async function addIgnoreContext(dir: string, contexts: IgnoreContext[], git?: GitInfo) {
  const withGit = await addIgnoreMatcher(
    dir,
    contexts,
    [
      ...(git?.root === dir ? git.global : []),
      ...(git?.root === dir ? [path.join(git.dir, "info", "exclude")] : []),
      ...(git && isInside(git.root, dir) ? [path.join(dir, ".gitignore")] : []),
    ],
    "git",
  )
  return addIgnoreMatcher(dir, withGit, [path.join(dir, ".ignore"), path.join(dir, ".rgignore")], "generic")
}

async function parentIgnoreContexts(cwd: string) {
  const git = await findGitInfo(cwd)
  let contexts: IgnoreContext[] = []
  for (const dir of parentDirs(cwd)) {
    contexts = await addIgnoreContext(dir, contexts, git)
  }
  return { contexts, git }
}

function row(data: Row): Row {
  return {
    ...data,
    path: {
      ...data.path,
      text: clean(data.path.text),
    },
  }
}

function parse(line: string) {
  return Effect.try({
    try: () => Result.parse(JSON.parse(line)),
    catch: (cause) => new Error("invalid ripgrep output", { cause }),
  })
}

function fail(queue: Queue.Queue<string, PlatformError | Error | Cause.Done>, err: PlatformError | Error) {
  Queue.failCauseUnsafe(queue, Cause.fail(err))
}

function filesArgs(input: FilesInput) {
  const args = ["--no-config", "--files", "--glob=!.git/*"]
  if (input.follow) args.push("--follow")
  if (input.hidden !== false) args.push("--hidden")
  if (input.hidden === false) args.push("--glob=!.*")
  if (input.maxDepth !== undefined) args.push(`--max-depth=${input.maxDepth}`)
  if (input.glob) {
    for (const glob of input.glob) args.push(`--glob=${glob}`)
  }
  args.push(".")
  return args
}

function searchArgs(input: SearchInput) {
  const args = ["--no-config", "--json", "--hidden", "--glob=!.git/*", "--no-messages"]
  if (input.follow) args.push("--follow")
  if (input.glob) {
    for (const glob of input.glob) args.push(`--glob=${glob}`)
  }
  if (input.limit) args.push(`--max-count=${input.limit}`)
  args.push("--", input.pattern, ...(input.file ?? ["."]))
  return args
}

function raceAbort<A, E, R>(effect: Effect.Effect<A, E, R>, signal?: AbortSignal) {
  return signal ? effect.pipe(Effect.raceFirst(waitForAbort(signal))) : effect
}

export const layer: Layer.Layer<Service, never, AppFileSystem.Service | ChildProcessSpawner | HttpClient.HttpClient> =
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const fs = yield* AppFileSystem.Service
      const http = HttpClient.filterStatusOk(yield* HttpClient.HttpClient)
      const spawner = yield* ChildProcessSpawner

      const run = Effect.fnUntraced(function* (command: string, args: string[], opts?: { cwd?: string }) {
        const handle = yield* spawner.spawn(
          ChildProcess.make(command, args, { cwd: opts?.cwd, extendEnv: true, stdin: "ignore" }),
        )
        const [stdout, stderr, code] = yield* Effect.all(
          [
            Stream.mkString(Stream.decodeText(handle.stdout)),
            Stream.mkString(Stream.decodeText(handle.stderr)),
            handle.exitCode,
          ],
          { concurrency: "unbounded" },
        )
        return { stdout, stderr, code }
      }, Effect.scoped)

      const extract = Effect.fnUntraced(function* (
        archive: string,
        config: (typeof PLATFORM)[keyof typeof PLATFORM],
        target: string,
      ) {
        const dir = yield* fs.makeTempDirectoryScoped({ directory: Global.Path.bin, prefix: "ripgrep-" })

        if (config.extension === "zip") {
          const shell = (yield* Effect.sync(() => which("powershell.exe") ?? which("pwsh.exe"))) ?? "powershell.exe"
          const result = yield* run(shell, [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            windowsZipExtractCommand(archive, dir),
          ])
          if (result.code !== 0) {
            return yield* Effect.fail(error(result.stderr || result.stdout, result.code))
          }
        }

        if (config.extension === "tar.gz") {
          const result = yield* run("tar", ["-xzf", archive, "-C", dir])
          if (result.code !== 0) {
            return yield* Effect.fail(error(result.stderr || result.stdout, result.code))
          }
        }

        const extracted = path.join(
          dir,
          `ripgrep-${VERSION}-${config.platform}`,
          process.platform === "win32" ? "rg.exe" : "rg",
        )
        if (!(yield* fs.isFile(extracted))) {
          return yield* Effect.fail(new Error(`ripgrep archive did not contain executable: ${extracted}`))
        }

        yield* fs.copyFile(extracted, target)
        if (process.platform === "win32") return
        yield* fs.chmod(target, 0o755)
      }, Effect.scoped)

      const filepath = yield* Effect.cached(
        Effect.gen(function* () {
          const system = yield* Effect.sync(() => which(process.platform === "win32" ? "rg.exe" : "rg"))
          if (system && (yield* fs.isFile(system).pipe(Effect.orDie))) return system

          const target = path.join(Global.Path.bin, `rg${process.platform === "win32" ? ".exe" : ""}`)
          if (yield* fs.isFile(target).pipe(Effect.orDie)) return target

          const platformKey = `${process.arch}-${process.platform}` as keyof typeof PLATFORM
          const config = PLATFORM[platformKey]
          if (!config) {
            return yield* Effect.fail(new Error(`unsupported platform for ripgrep: ${platformKey}`))
          }

          const filename = `ripgrep-${VERSION}-${config.platform}.${config.extension}`
          const url = `https://github.com/BurntSushi/ripgrep/releases/download/${VERSION}/${filename}`
          const archive = path.join(Global.Path.bin, filename)

          log.info("downloading ripgrep", { url })
          yield* fs.ensureDir(Global.Path.bin).pipe(Effect.orDie)

          const bytes = yield* HttpClientRequest.get(url).pipe(
            http.execute,
            Effect.flatMap((response) => response.arrayBuffer),
            Effect.mapError((cause) => {
              const msg = cause instanceof Error ? cause.message : String(cause)
              if (msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED") || msg.includes("fetch")) {
                return new Error(
                  `Cannot download ripgrep: network unavailable (${msg}). ` +
                    `Please install ripgrep manually: https://github.com/BurntSushi/ripgrep#installation`,
                )
              }
              return cause instanceof Error ? cause : new Error(String(cause))
            }),
          )
          if (bytes.byteLength === 0) {
            return yield* Effect.fail(
              new Error(
                `Failed to download ripgrep from ${url}. ` +
                  `If you are in a restricted network, please install ripgrep manually.`,
              ),
            )
          }

          yield* fs.writeWithDirs(archive, new Uint8Array(bytes))
          yield* extract(archive, config, target)
          yield* fs.remove(archive, { force: true }).pipe(Effect.ignore)
          return target
        }),
      )

      const check = Effect.fnUntraced(function* (cwd: string) {
        if (yield* fs.isDir(cwd).pipe(Effect.orDie)) return
        return yield* Effect.fail(
          Object.assign(new Error(`No such file or directory: '${cwd}'`), {
            code: "ENOENT",
            errno: -2,
            path: cwd,
          }),
        )
      })

      const command = Effect.fnUntraced(function* (cwd: string, args: string[]) {
        const binary = yield* filepath
        return ChildProcess.make(binary, args, {
          cwd,
          env: env(),
          extendEnv: true,
          stdin: "ignore",
        })
      })

      async function* walkDir(
        dir: string,
        options: {
          follow?: boolean
          glob?: string[]
          git?: GitInfo
          cwd: string
          hidden: boolean
          ignore: IgnoreContext[]
          maxDepth?: number
          seen?: Set<string>
        },
        currentDepth = 0,
      ): AsyncGenerator<string> {
        if (options.maxDepth !== undefined && currentDepth >= options.maxDepth) return

        const git = await gitInfoForDir(dir, options.git)
        const inherited =
          git && options.git && git.root !== options.git.root
            ? options.ignore.filter((context) => context.kind !== "git")
            : options.ignore
        const contexts = await addIgnoreContext(dir, inherited, git)
        const entries = await nodeFs.promises.readdir(dir, { withFileTypes: true }).catch(() => [] as nodeFs.Dirent[])
        for (const entry of entries) {
          const name = entry.name
          if (!options.hidden && name.startsWith(".")) continue
          if (name === ".git") continue

          const fullPath = path.join(dir, name)
          const stat = options.follow && entry.isSymbolicLink() ? await nodeFs.promises.stat(fullPath).catch(() => undefined) : undefined
          const directory = entry.isDirectory() || stat?.isDirectory() === true
          const file = entry.isFile() || stat?.isFile() === true
          const rel = path.relative(options.cwd, fullPath)
          const ignored = isIgnored(fullPath, directory, contexts)
          if (directory) {
            if (ignored && !(options.glob && matchesDirectoryGlobs(rel, options.glob))) continue
            if (options.glob && excludedByGlobs(rel, options.glob)) continue
            const seen = options.follow && options.seen ? new Set(options.seen) : options.seen
            if (options.follow && seen) {
              const real = await nodeFs.promises.realpath(fullPath).catch(() => fullPath)
              if (seen.has(real)) continue
              seen.add(real)
            }
            yield* walkDir(fullPath, { ...options, git, ignore: contexts, seen }, currentDepth + 1)
          } else if (file) {
            if (ignored && !(options.glob && matchesGlobs(rel, options.glob))) continue
            yield fullPath
          }
        }
      }

      const files: Interface["files"] = (input) =>
        Stream.callback<string, PlatformError | Error>((queue) =>
          Effect.gen(function* () {
            yield* Effect.forkScoped(
              Effect.gen(function* () {
                yield* check(input.cwd)
                const binary = yield* filepath.pipe(Effect.catch(() => Effect.succeed(undefined)))
                if (!binary) {
                  log.info("ripgrep not available, using fallback for file listing")
                  yield* Effect.tryPromise({
                    // `signal` aborts when the Stream scope closes (e.g. a consumer using
                    // Stream.take stops early), so the walk doesn't keep scanning the whole
                    // tree after the reader is done.
                    try: async (signal) => {
                      if (input.signal?.aborted) throw aborted(input.signal)
                      const ignore = await parentIgnoreContexts(input.cwd)
                      const contexts = allowExplicitDirectory(input.cwd, ignore.contexts)
                      if (input.signal?.aborted) throw aborted(input.signal)
                      for await (const file of walkDir(input.cwd, {
                        cwd: input.cwd,
                        follow: input.follow,
                        glob: input.glob,
                        git: ignore.git,
                        hidden: input.hidden !== false,
                        ignore: contexts,
                        maxDepth: input.maxDepth,
                        seen: input.follow
                          ? new Set([await nodeFs.promises.realpath(input.cwd).catch(() => path.resolve(input.cwd))])
                          : undefined,
                      })) {
                        if (input.signal?.aborted) throw aborted(input.signal)
                        if (signal.aborted) break
                        // walkDir yields absolute paths; emit cwd-relative ones so the output
                        // matches `rg --files` (consumers like tree() split on path.sep).
                        const rel = path.relative(input.cwd, file)
                        if (input.glob && !matchesGlobs(rel, input.glob)) continue
                        Queue.offerUnsafe(queue, clean(rel))
                      }
                      if (input.signal?.aborted) throw aborted(input.signal)
                    },
                    catch: (err) => (err instanceof Error ? err : new Error(String(err))),
                  })
                  Queue.endUnsafe(queue)
                  return
                }
                const handle = yield* spawner.spawn(yield* command(input.cwd, filesArgs(input)))
                const stderr = yield* Stream.mkString(Stream.decodeText(handle.stderr)).pipe(Effect.forkScoped)
                const stdout = yield* Stream.decodeText(handle.stdout).pipe(
                  Stream.splitLines,
                  Stream.filter((line) => line.length > 0),
                  Stream.runForEach((line) => Effect.sync(() => Queue.offerUnsafe(queue, clean(line)))),
                  Effect.forkScoped,
                )
                const code = yield* raceAbort(handle.exitCode, input.signal)
                yield* Fiber.join(stdout)
                if (code === 0 || code === 1) {
                  Queue.endUnsafe(queue)
                  return
                }
                fail(queue, error(yield* Fiber.join(stderr), code))
              }).pipe(
                Effect.catch((err) =>
                  Effect.sync(() => {
                    fail(queue, err)
                  }),
                ),
              ),
            )
          }),
        )

      const search: Interface["search"] = Effect.fn("Ripgrep.search")(function* (input: SearchInput) {
        yield* check(input.cwd)

        const program = Effect.scoped(
          Effect.gen(function* () {
            // Unlike files(), search has no JS fallback; surface a clear, actionable error
            // instead of a raw spawn/download failure when ripgrep can't be obtained.
            // Resolve inside the raced program so input.signal can abort a slow download.
            const binary = yield* filepath.pipe(Effect.catch(() => Effect.succeed(undefined)))
            if (!binary)
              return yield* Effect.fail(
                new Error(
                  "Search requires ripgrep, which is unavailable and could not be downloaded. " +
                    "If you are in a restricted network, install ripgrep manually: " +
                    "https://github.com/BurntSushi/ripgrep#installation",
                ),
              )
            const handle = yield* spawner.spawn(yield* command(input.cwd, searchArgs(input)))

            const [items, stderr, code] = yield* Effect.all(
              [
                Stream.decodeText(handle.stdout).pipe(
                  Stream.splitLines,
                  Stream.filter((line) => line.length > 0),
                  Stream.mapEffect(parse),
                  Stream.filter((item): item is Match => item.type === "match"),
                  Stream.map((item) => row(item.data)),
                  Stream.runCollect,
                  Effect.map((chunk) => [...chunk]),
                ),
                Stream.mkString(Stream.decodeText(handle.stderr)),
                handle.exitCode,
              ],
              { concurrency: "unbounded" },
            )

            if (code !== 0 && code !== 1 && code !== 2) {
              return yield* Effect.fail(error(stderr, code))
            }

            return {
              items: code === 1 ? [] : items,
              partial: code === 2,
            }
          }),
        )

        return yield* raceAbort(program, input.signal)
      })

      const tree: Interface["tree"] = Effect.fn("Ripgrep.tree")(function* (input: TreeInput) {
        log.info("tree", input)
        const list = Array.from(yield* files({ cwd: input.cwd, signal: input.signal }).pipe(Stream.runCollect))

        interface Node {
          name: string
          children: Map<string, Node>
        }

        function child(node: Node, name: string) {
          const item = node.children.get(name)
          if (item) return item
          const next = { name, children: new Map() }
          node.children.set(name, next)
          return next
        }

        function count(node: Node): number {
          return Array.from(node.children.values()).reduce((sum, child) => sum + 1 + count(child), 0)
        }

        const root: Node = { name: "", children: new Map() }
        for (const file of list) {
          if (file.includes(".mimocode")) continue
          const parts = file.split(path.sep)
          if (parts.length < 2) continue
          let node = root
          for (const part of parts.slice(0, -1)) {
            node = child(node, part)
          }
        }

        const total = count(root)
        const limit = input.limit ?? total
        const lines: string[] = []
        const queue: Array<{ node: Node; path: string }> = Array.from(root.children.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((node) => ({ node, path: node.name }))

        let used = 0
        for (let i = 0; i < queue.length && used < limit; i++) {
          const item = queue[i]
          lines.push(item.path)
          used++
          queue.push(
            ...Array.from(item.node.children.values())
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((node) => ({ node, path: `${item.path}/${node.name}` })),
          )
        }

        if (total > used) lines.push(`[${total - used} truncated]`)
        return lines.join("\n")
      })

      return Service.of({ files, tree, search })
    }),
  )

export const defaultLayer = layer.pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(AppFileSystem.defaultLayer),
  Layer.provide(CrossSpawnSpawner.defaultLayer),
)

export * as Ripgrep from "./ripgrep"
