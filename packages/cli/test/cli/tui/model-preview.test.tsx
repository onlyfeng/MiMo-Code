/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { createSignal } from "solid-js"
import { createOpencodeClient } from "@mimo-ai/sdk/v2/client"
import { createModelPreview } from "../../../src/cli/cmd/tui/util/model-preview"

const model = { providerID: "test", modelID: "model" }

test("generated preview SDK sends workspace as query and preserves cancellation", async () => {
  const controller = new AbortController()
  let request: Request | undefined
  const client = createOpencodeClient({
    baseUrl: "http://localhost",
    directory: "/tmp/example",
    fetch: Object.assign(
      async (input: RequestInfo | URL) => {
        if (!(input instanceof Request)) throw new Error("SDK must send a Request")
        request = input
        return Response.json({ ...model, variant: "high" })
      },
      { preconnect: fetch.preconnect },
    ),
  })
  const result = await client.experimental.resolveModelSelection(
    { agent: "build", model, workspace: "wrk_example" },
    { signal: controller.signal, throwOnError: true },
  )
  expect(new URL(request!.url).searchParams.get("workspace")).toBe("wrk_example")
  expect(request!.method).toBe("POST")
  expect(await request!.json()).toEqual({ agent: "build", model })
  expect(result.data).toEqual({ ...model, variant: "high" })
  controller.abort()
  expect(request!.signal.aborted).toBe(true)
})

async function wait(check: () => boolean) {
  const deadline = Date.now() + 3000
  while (!check()) {
    if (Date.now() > deadline) throw new Error("model preview did not settle")
    await Bun.sleep(5)
  }
}

test("model preview discards old responses across agent switches including a repeated selection", async () => {
  const pending: {
    agent: string | undefined
    signal: AbortSignal
    resolve: (value: typeof model & { variant?: string }) => void
  }[] = []
  const [agent, setAgent] = createSignal("first")
  let state: ReturnType<typeof createModelPreview>
  const app = await testRender(
    () => {
      state = createModelPreview(
        () => ({ agent: agent(), model }),
        (input, signal) => new Promise((resolve) => pending.push({ agent: input.agent, signal, resolve })),
      )
      return <text>{state().status === "ready" ? state().selection?.variant : state().status}</text>
    },
    { width: 40, height: 2 },
  )
  try {
    await wait(() => pending.length === 1)
    expect(state!().status).toBe("pending")
    setAgent("second")
    await wait(() => pending.length === 2)
    pending[1].resolve({ ...model, variant: "low" })
    await wait(() => state!().status === "ready")
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("low")

    setAgent("first")
    await wait(() => pending.length === 3)
    expect(state!().status).toBe("pending")
    pending[2].resolve({ ...model, variant: "high" })
    await wait(() => state!().status === "ready")
    pending[0].resolve({ ...model, variant: "stale" })
    await Bun.sleep(0)
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("high")
    expect(app.captureCharFrame()).not.toContain("stale")
    expect(pending[0].signal.aborted).toBe(true)
    expect(pending[1].signal.aborted).toBe(true)
  } finally {
    app.renderer.destroy()
  }
})

test("model preview distinguishes unavailable results from a resolved default and refreshes its scope", async () => {
  const [scope, setScope] = createSignal("first-session")
  const input = { agent: "test", model, variant: "high", workspace: "wrk_example" }
  const pending: { input: typeof input; resolve: (value: typeof model) => void; reject: (error: Error) => void }[] = []
  let state: ReturnType<typeof createModelPreview>
  const app = await testRender(
    () => {
      state = createModelPreview(
        () => ({ input, scope: scope() }).input,
        (request) =>
          new Promise((resolve, reject) => pending.push({ input: request as typeof input, resolve, reject })),
      )
      return <text>{state().status}</text>
    },
    { width: 40, height: 2 },
  )
  try {
    await wait(() => pending.length === 1)
    expect(pending[0].input).toEqual(input)
    pending[0].resolve(model)
    await wait(() => state!().status === "ready")
    expect(state!().selection).toEqual(model)
    setScope("second-session")
    await wait(() => pending.length === 2)
    expect(state!().status).toBe("pending")
    expect(state!().selection).toBeUndefined()
    pending[1].reject(new Error("offline"))
    await wait(() => state!().status === "unavailable")
    expect(state!().selection).toBeUndefined()
    expect(input.variant).toBe("high")
  } finally {
    app.renderer.destroy()
  }
})

test("model preview cancels on unmount without accepting a late result", async () => {
  let signal: AbortSignal | undefined
  let finish: (value: typeof model & { variant: string }) => void = () => {}
  let state: ReturnType<typeof createModelPreview>
  const app = await testRender(
    () => {
      state = createModelPreview(
        () => ({ model }),
        (_, abort) => {
          signal = abort
          return new Promise((resolve) => {
            finish = resolve
          })
        },
      )
      return <text>{state().status}</text>
    },
    { width: 40, height: 2 },
  )
  await wait(() => !!signal)
  app.renderer.destroy()
  expect(signal?.aborted).toBe(true)
  finish({ ...model, variant: "late" })
  await Bun.sleep(0)
  expect(state!().status).toBe("pending")
})
