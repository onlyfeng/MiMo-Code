import { Effect, Fiber, ScopedCache, Scope, Context } from "effect"
import * as EffectLogger from "./logger"
import { Instance, type InstanceContext } from "@/project/instance"
import { LocalContext } from "@/util"
import { InstanceRef, WorkspaceRef } from "./instance-ref"
import { registerDisposer } from "./instance-registry"
import { WorkspaceContext } from "@/control-plane/workspace-context"

const TypeId = "~opencode/InstanceState"

export interface InstanceState<A, E = never, R = never> {
  readonly [TypeId]: typeof TypeId
  readonly cache: ScopedCache.ScopedCache<number, A, E, R>
  readonly contexts: Map<string, Set<InstanceContext>>
  readonly generations: Map<number, InstanceContext>
  readonly disposed: WeakSet<InstanceContext>
}

export const bind = <F extends (...args: any[]) => any>(fn: F): F => {
  try {
    return Instance.bind(fn)
  } catch (err) {
    if (!(err instanceof LocalContext.NotFound)) throw err
  }
  const fiber = Fiber.getCurrent()
  const ctx = fiber ? Context.getReferenceUnsafe(fiber.context, InstanceRef) : undefined
  if (!ctx) return fn
  return ((...args: any[]) => Instance.restore(ctx, () => fn(...args))) as F
}

export const context = Effect.gen(function* () {
  return (yield* InstanceRef) ?? Instance.current
})

export const workspaceID = Effect.gen(function* () {
  return (yield* WorkspaceRef) ?? WorkspaceContext.workspaceID
})

export const directory = Effect.map(context, (ctx) => ctx.directory)

export const make = <A, E = never, R = never>(
  init: (ctx: InstanceContext) => Effect.Effect<A, E, R | Scope.Scope>,
  opts?: { phase?: "normal" | "late" },
): Effect.Effect<InstanceState<A, E, Exclude<R, Scope.Scope>>, never, R | Scope.Scope> =>
  Effect.gen(function* () {
    const generations = new Map<number, InstanceContext>()
    const cache = yield* ScopedCache.make<number, A, E, R>({
      capacity: Number.POSITIVE_INFINITY,
      lookup: (generation) => init(generations.get(generation)!),
    })
    const contexts = new Map<string, Set<InstanceContext>>()
    const disposed = new WeakSet<InstanceContext>()

    const off = registerDisposer(
      async (directory, instance) => {
        const targets = instance ? [instance] : [...(contexts.get(directory) ?? [])]
        targets.forEach((target) => disposed.add(target))
        await Promise.all(
          targets.map((target) =>
            Effect.runPromise(
              ScopedCache.invalidate(cache, target.generation).pipe(Effect.provide(EffectLogger.layer)),
            ),
          ),
        )
        targets.forEach((target) => generations.delete(target.generation))
        if (!instance) {
          contexts.delete(directory)
          return
        }
        const directoryContexts = contexts.get(directory)
        directoryContexts?.delete(instance)
        if (directoryContexts?.size === 0) contexts.delete(directory)
      },
      { phase: opts?.phase },
    )
    yield* Effect.addFinalizer(() => Effect.sync(off))

    return {
      [TypeId]: TypeId,
      cache,
      contexts,
      generations,
      disposed,
    }
  })

export const get = <A, E, R>(self: InstanceState<A, E, R>) =>
  Effect.gen(function* () {
    const instance = yield* context
    if (instance.disposing || self.disposed.has(instance)) return yield* Effect.interrupt
    const existing = self.contexts.get(instance.directory)
    if (existing) existing.add(instance)
    else self.contexts.set(instance.directory, new Set([instance]))
    self.generations.set(instance.generation, instance)
    const value = yield* ScopedCache.get(self.cache, instance.generation)
    if (!instance.disposing && !self.disposed.has(instance)) return value
    yield* ScopedCache.invalidate(self.cache, instance.generation)
    return yield* Effect.interrupt
  })

export const use = <A, E, R, B>(self: InstanceState<A, E, R>, select: (value: A) => B) => Effect.map(get(self), select)

export const useEffect = <A, E, R, B, E2, R2>(
  self: InstanceState<A, E, R>,
  select: (value: A) => Effect.Effect<B, E2, R2>,
) => Effect.flatMap(get(self), select)

export const has = <A, E, R>(self: InstanceState<A, E, R>) =>
  Effect.gen(function* () {
    return yield* ScopedCache.has(self.cache, (yield* context).generation)
  })

export const invalidate = <A, E, R>(self: InstanceState<A, E, R>) =>
  Effect.gen(function* () {
    const instance = yield* context
    const result = yield* ScopedCache.invalidate(self.cache, instance.generation)
    const directoryContexts = self.contexts.get(instance.directory)
    directoryContexts?.delete(instance)
    if (directoryContexts?.size === 0) self.contexts.delete(instance.directory)
    self.generations.delete(instance.generation)
    return result
  })
