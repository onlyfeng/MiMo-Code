import { GlobalBus } from "@/bus/global"
import { disposeInstance } from "@/effect/instance-registry"
import { makeRuntime } from "@/effect/run-service"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { iife } from "@/util/iife"
import { Log } from "@/util"
import { withTimeout } from "@/util/timeout"
import { LocalContext } from "../util"
import * as Project from "./project"
import { WorkspaceContext } from "@/control-plane/workspace-context"
import { parse as pathParse } from "path"

export interface InstanceContext {
  generation: number
  directory: string
  worktree: string
  project: Project.Info
  disposing: boolean
}

const context = LocalContext.create<InstanceContext>("instance")
const cache = new Map<string, Promise<InstanceContext>>()
const directoryDisposals = new Map<string, Promise<void>>()
const active = new Map<string, number>()
let nextGeneration = 0
const project = makeRuntime(Project.Service, Project.defaultLayer)
const DIRECTORY_DISPOSE_TIMEOUT = 2_000

const FORBIDDEN_EXACT_PATHS = [
  "/private",
  "/var",
  "/private/var",
] as const

const FORBIDDEN_PREFIXES = [
  "/etc",
  "/proc",
  "/sys",
  "/dev",
  "/boot",
  "/private/etc",
  "/var/log",
  "/private/var/log",
] as const

function assertSafeDirectory(directory: string): void {
  const resolved = AppFileSystem.resolve(directory)
  if (resolved === pathParse(resolved).root) {
    throw new Error("Access denied: filesystem root is not a valid project directory")
  }
  if (process.platform !== "win32") {
    if (FORBIDDEN_EXACT_PATHS.some((prefix) => resolved === prefix)) {
      throw new Error("Access denied: target is a protected system directory")
    }
    for (const prefix of FORBIDDEN_PREFIXES) {
      if (resolved === prefix || resolved.startsWith(`${prefix}/`)) {
        throw new Error("Access denied: target is a protected system directory")
      }
    }
  }
}

const disposal = {
  all: undefined as Promise<void> | undefined,
}

function boot(input: { directory: string; init?: () => Promise<any>; worktree?: string; project?: Project.Info }) {
  return iife(async () => {
    const ctx =
      input.project && input.worktree
        ? {
            generation: ++nextGeneration,
            directory: input.directory,
            worktree: input.worktree,
            project: input.project,
            disposing: false,
          }
        : await project
            .runPromise((svc) => svc.fromDirectory(input.directory))
            .then(({ project, sandbox }) => ({
              generation: ++nextGeneration,
              directory: input.directory,
              worktree: sandbox,
              project,
              disposing: false,
            }))
    await context.provide(ctx, async () => {
      await input.init?.()
    })
    return ctx
  })
}

function track(directory: string, next: Promise<InstanceContext>) {
  const task = next.catch((error) => {
    if (cache.get(directory) === task) cache.delete(directory)
    throw error
  })
  cache.set(directory, task)
  return task
}

function enter(directory: string) {
  active.set(directory, (active.get(directory) ?? 0) + 1)
}

function leave(directory: string) {
  const count = (active.get(directory) ?? 1) - 1
  if (count > 0) {
    active.set(directory, count)
    return
  }
  active.delete(directory)
}

async function serializeDirectory<R>(directory: string, fn: () => Promise<R>) {
  const previous = directoryDisposals.get(directory) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const queued = previous.then(() => gate)
  directoryDisposals.set(directory, queued)
  await previous
  try {
    return await fn()
  } finally {
    release()
    if (directoryDisposals.get(directory) === queued) directoryDisposals.delete(directory)
  }
}

async function disposeCached(directory: string, current: Promise<InstanceContext>) {
  const ctx = await current.catch(() => undefined)
  if (!ctx || cache.get(directory) !== current) return

  ctx.disposing = true
  cache.delete(directory)
  Log.Default.info("disposing instance", { directory })
  await context.provide(ctx, () => disposeInstance(directory, ctx))

  GlobalBus.emit("event", {
    directory,
    project: ctx.project.id,
    workspace: WorkspaceContext.workspaceID,
    payload: {
      type: "server.instance.disposed",
      properties: {
        directory,
      },
    },
  })
}

export const Instance = {
  async provide<R>(input: { directory: string; init?: () => Promise<any>; fn: () => R }): Promise<R> {
    const directory = AppFileSystem.resolve(input.directory)
    assertSafeDirectory(directory)
    await directoryDisposals.get(directory)
    let existing = cache.get(directory)
    if (!existing) {
      Log.Default.info("creating instance", { directory })
      existing = track(
        directory,
        boot({
          directory,
          init: input.init,
        }),
      )
    }
    const ctx = await existing
    enter(directory)
    try {
      return await context.provide(ctx, async () => input.fn())
    } finally {
      leave(directory)
    }
  },
  get current() {
    return context.use()
  },
  get directory() {
    return context.use().directory
  },
  // Like `directory`, but undefined outside an instance context instead of
  // throwing — for module state that wants to scope itself by directory but
  // may also be touched (e.g. in tests) before an instance is provided.
  get directoryOrUndefined() {
    return context.tryUse()?.directory
  },
  get worktree() {
    return context.use().worktree
  },
  get project() {
    return context.use().project
  },
  async peek(input: string): Promise<InstanceContext | undefined> {
    const directory = AppFileSystem.resolve(input)
    const current = cache.get(directory)
    if (!current) return undefined
    const ctx = await current.catch(() => undefined)
    if (!ctx || cache.get(directory) !== current || ctx.disposing) return undefined
    return ctx
  },

  /**
   * Check if a path is within the project boundary.
   * Returns true if path is inside Instance.directory OR Instance.worktree.
   * Paths within the worktree but outside the working directory should not trigger external_directory permission.
   */
  containsPath(filepath: string, ctx?: InstanceContext) {
    const instance = ctx ?? Instance
    if (AppFileSystem.contains(instance.directory, filepath)) return true
    // Non-git projects set worktree to "/" which would match ANY absolute path.
    // Skip worktree check in this case to preserve external_directory permissions.
    if (instance.worktree === "/") return false
    return AppFileSystem.contains(instance.worktree, filepath)
  },
  /**
   * Captures the current instance ALS context and returns a wrapper that
   * restores it when called. Use this for callbacks that fire outside the
   * instance async context (native addons, event emitters, timers, etc.).
   */
  bind<F extends (...args: any[]) => any>(fn: F): F {
    const ctx = context.use()
    return ((...args: any[]) => context.provide(ctx, () => fn(...args))) as F
  },
  /**
   * Run a synchronous function within the given instance context ALS.
   * Use this to bridge from Effect (where InstanceRef carries context)
   * back to sync code that reads Instance.directory from ALS.
   */
  restore<R>(ctx: InstanceContext, fn: () => R): R {
    return context.provide(ctx, fn)
  },
  async reload(input: { directory: string; init?: () => Promise<any>; project?: Project.Info; worktree?: string }) {
    const directory = AppFileSystem.resolve(input.directory)
    return serializeDirectory(directory, async () => {
      Log.Default.info("reloading instance", { directory })
      const current = cache.get(directory)
      const ctx = await current?.catch(() => undefined)
      if (ctx && cache.get(directory) === current) ctx.disposing = true
      await disposeInstance(directory, ctx)
      if (cache.get(directory) === current) cache.delete(directory)
      const next = track(directory, boot({ ...input, directory }))

      GlobalBus.emit("event", {
        directory,
        project: input.project?.id,
        workspace: WorkspaceContext.workspaceID,
        payload: {
          type: "server.instance.disposed",
          properties: {
            directory,
          },
        },
      })

      return await next
    })
  },
  async disposeDirectory(input: string) {
    const directory = AppFileSystem.resolve(input)
    assertSafeDirectory(directory)
    return serializeDirectory(directory, async () => {
      const current = cache.get(directory)
      if (!current) return

      // NOTE: withTimeout only bounds the *wait*, not the underlying promise —
      // a slow disposer may still complete after the timeout fires. The
      // directory guard is therefore a soft happens-before, not a true barrier.
      await withTimeout(disposeCached(directory, current), DIRECTORY_DISPOSE_TIMEOUT).catch((error) => {
        Log.Default.warn("instance dispose did not complete", { directory, error })
      })
    })
  },
  async dispose() {
    const current = Instance.current
    const directory = current.directory
    return serializeDirectory(directory, async () => {
      const cached = cache.get(directory)
      const cachedContext = await cached?.catch(() => undefined)
      if (!cached || cachedContext !== current || cache.get(directory) !== cached) {
        current.disposing = true
        return
      }
      await disposeCached(directory, cached)
    })
  },
  async disposeAll() {
    if (disposal.all) return disposal.all

    disposal.all = iife(async () => {
      Log.Default.info("disposing all instances")
      const entries = [...cache.entries()]
      for (const [key, value] of entries) {
        if (cache.get(key) !== value) continue

        const ctx = await value.catch((error) => {
          Log.Default.warn("instance dispose failed", { key, error })
          return undefined
        })

        if (!ctx) {
          if (cache.get(key) === value) cache.delete(key)
          continue
        }

        if (cache.get(key) !== value) continue

        if (active.has(key)) continue
        if (cache.get(key) !== value) continue

        await context.provide(ctx, async () => {
          await Instance.dispose()
        })
      }
    }).finally(() => {
      disposal.all = undefined
    })

    return disposal.all
  },
}
