import { expect, test } from "bun:test"
import { Effect, ManagedRuntime } from "effect"
import { Actor } from "../../src/actor/spawn"
import { Instance } from "../../src/project/instance"
import { bindToolScriptRef, toolScriptMcp, toolScriptRegistry } from "../../src/tool/tool-script-ref"
import { tmpdir } from "../fixture/fixture"

test("late-bound refs restore the previous binding after owners dispose out of order", () => {
  const base = () => Effect.succeed("base")
  const first = () => Effect.succeed("first")
  const second = () => Effect.succeed("second")
  const ref: { current: typeof base | undefined } = { current: base }
  const releaseFirst = bindToolScriptRef(ref, first)
  const releaseSecond = bindToolScriptRef(ref, second)

  releaseFirst()
  expect(ref.current).toBe(second)
  releaseSecond()
  expect(ref.current).toBe(base)
})

test("late-bound refs do not overwrite a binding installed outside their ownership", () => {
  const owned = () => Effect.succeed("owned")
  const external = () => Effect.succeed("external")
  const ref = { current: undefined as typeof owned | undefined }
  const release = bindToolScriptRef(ref, owned)

  ref.current = external
  release()
  expect(ref.current).toBe(external)
})

test("a binding created after an external takeover restores that external owner", () => {
  const base = () => Effect.succeed("base")
  const first = () => Effect.succeed("first")
  const external = () => Effect.succeed("external")
  const second = () => Effect.succeed("second")
  const ref: { current: typeof base | undefined } = { current: base }
  const releaseFirst = bindToolScriptRef(ref, first)

  ref.current = external
  const releaseSecond = bindToolScriptRef(ref, second)
  releaseSecond()
  expect(ref.current).toBe(external)
  releaseFirst()
  expect(ref.current).toBe(external)

  const reverse: { current: typeof base | undefined } = { current: base }
  const releaseReverseFirst = bindToolScriptRef(reverse, first)
  reverse.current = external
  const releaseReverseSecond = bindToolScriptRef(reverse, second)
  releaseReverseFirst()
  expect(reverse.current).toBe(second)
  releaseReverseSecond()
  expect(reverse.current).toBe(external)
})

test("Actor layer releases its exec registry and MCP bindings", async () => {
  await using dir = await tmpdir()
  const previousRegistry = toolScriptRegistry.current
  const previousMcp = toolScriptMcp.current
  const runtime = ManagedRuntime.make(Actor.defaultLayer)

  try {
    await Instance.provide({
      directory: dir.path,
      fn: () =>
        runtime.runPromise(
          Effect.gen(function* () {
            return yield* Actor.Service
          }),
        ),
    })
    expect(toolScriptRegistry.current).not.toBe(previousRegistry)
    expect(toolScriptMcp.current).not.toBe(previousMcp)
  } finally {
    await runtime.dispose()
    await Instance.disposeAll()
  }

  expect(toolScriptRegistry.current).toBe(previousRegistry)
  expect(toolScriptMcp.current).toBe(previousMcp)
})
