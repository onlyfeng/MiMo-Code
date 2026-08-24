import { afterEach, expect, test } from "bun:test"
import { registerDisposer } from "@/effect/instance-registry"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

afterEach(() => Instance.disposeAll())

test("global disposal skips instances that are still in use", async () => {
  await using tmp = await tmpdir()
  let entered!: () => void
  let finish!: () => void
  const active = new Promise<void>((resolve) => (entered = resolve))
  const blocked = new Promise<void>((resolve) => (finish = resolve))
  let disposals = 0
  const unregister = registerDisposer(async (directory) => {
    if (directory === tmp.path) disposals++
  })

  try {
    const running = Instance.provide({
      directory: tmp.path,
      fn: async () => {
        entered()
        await blocked
      },
    })
    await active
    await Instance.disposeAll()
    expect(disposals).toBe(0)

    finish()
    await running
    await Instance.disposeDirectory(tmp.path)
    expect(disposals).toBe(1)
  } finally {
    finish()
    unregister()
    await Instance.disposeDirectory(tmp.path)
  }
})

test("targeted disposal is bounded and cannot evict a replacement", async () => {
  await using tmp = await tmpdir()
  let started!: () => void
  let finish!: () => void
  const disposing = new Promise<void>((resolve) => (started = resolve))
  const blocked = new Promise<void>((resolve) => (finish = resolve))
  const unregister = registerDisposer(async (directory) => {
    if (directory !== tmp.path) return
    started()
    await blocked
  })

  try {
    await Instance.provide({ directory: tmp.path, fn: () => undefined })
    const before = Date.now()
    const dispose = Instance.disposeDirectory(tmp.path)
    await disposing

    let initialized = 0
    const replacement = Instance.provide({
      directory: tmp.path,
      init: () => {
        initialized++
        return Promise.resolve()
      },
      fn: () => undefined,
    })

    await dispose
    expect(Date.now() - before).toBeLessThan(3_000)
    await replacement
    expect(initialized).toBe(1)

    finish()
    await Bun.sleep(10)
    await Instance.provide({
      directory: tmp.path,
      init: () => {
        initialized++
        return Promise.resolve()
      },
      fn: () => undefined,
    })
    expect(initialized).toBe(1)
  } finally {
    finish()
    unregister()
    await Instance.disposeDirectory(tmp.path)
  }
}, 5_000)

test("a stale instance continuation cannot dispose its replacement", async () => {
  await using tmp = await tmpdir()
  const original = await Instance.provide({ directory: tmp.path, fn: () => Instance.current })
  const replacement = await Instance.reload({ directory: tmp.path })

  await Instance.restore(original, () => Instance.dispose())
  const current = await Instance.provide({ directory: tmp.path, fn: () => Instance.current })

  expect(original.disposing).toBe(true)
  expect(current).toBe(replacement)
})

test("peek observes only an existing live generation and never boots one", async () => {
  await using tmp = await tmpdir()
  let initialized = 0
  const original = await Instance.provide({
    directory: tmp.path,
    init: () => {
      initialized++
      return Promise.resolve()
    },
    fn: () => Instance.current,
  })

  expect(await Instance.peek(tmp.path)).toBe(original)
  await Instance.restore(original, () => Instance.dispose())
  expect(await Instance.peek(tmp.path)).toBeUndefined()
  expect(initialized).toBe(1)
})

test("concurrent reloads serialize and mark the superseded generation", async () => {
  await using tmp = await tmpdir()
  await Instance.provide({ directory: tmp.path, fn: () => undefined })

  const [first, second] = await Promise.all([
    Instance.reload({ directory: tmp.path }),
    Instance.reload({ directory: tmp.path }),
  ])
  const current = await Instance.provide({ directory: tmp.path, fn: () => Instance.current })

  expect(first).not.toBe(second)
  expect(first.disposing).toBe(true)
  expect(second.disposing).toBe(false)
  expect(current).toBe(second)
})
