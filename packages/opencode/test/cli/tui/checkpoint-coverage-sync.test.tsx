/** @jsxImportSource @opentui/solid */
import { describe, expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type {
  AssistantMessage,
  CheckpointCoverage,
  CheckpointPart,
  Event,
  GlobalEvent,
  Message,
  Session,
  UserMessage,
} from "@mimo-ai/sdk/v2"
import { onMount } from "solid-js"
import { ArgsProvider } from "../../../src/cli/cmd/tui/context/args"
import { ExitProvider } from "../../../src/cli/cmd/tui/context/exit"
import { ProjectProvider, useProject } from "../../../src/cli/cmd/tui/context/project"
import { SDKProvider, useSDK } from "../../../src/cli/cmd/tui/context/sdk"
import { SyncProvider, useSync } from "../../../src/cli/cmd/tui/context/sync"
import { computeContextUsage } from "../../../src/cli/cmd/tui/util/model"

const DIRECTORY = "/tmp/checkpoint-coverage"
const SESSION_ID = "ses_checkpoint_coverage"
const WINDOW = { hard: 1_000_000, effective: 980_000, usable: 960_000, source: "model" as const }

async function wait(fn: () => boolean, timeout = 5000) {
  const start = Date.now()
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error("timed out waiting for condition")
    await Bun.sleep(5)
  }
}

function session(): Session {
  return {
    id: SESSION_ID,
    slug: "checkpoint-coverage",
    projectID: "project",
    directory: DIRECTORY,
    title: "checkpoint coverage",
    version: "test",
    time: { created: 1, updated: 1 },
  }
}

function user(id: string, created: number): Message {
  return {
    id,
    sessionID: SESSION_ID,
    role: "user",
    time: { created },
  } as UserMessage
}

function assistant(id: string, created: number, input = 300_000): Message {
  return {
    id,
    sessionID: SESSION_ID,
    role: "assistant",
    providerID: "alibaba",
    modelID: "qwen-plus",
    cost: 1,
    time: { created, completed: created + 1 },
    tokens: { input, output: 100, reasoning: 0, cache: { read: 0, write: 0 } },
  } as AssistantMessage
}

function incompleteAssistant(id: string, created: number): Message {
  return {
    id,
    sessionID: SESSION_ID,
    role: "assistant",
    providerID: "alibaba",
    modelID: "qwen-plus",
    cost: 0,
    time: { created },
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  } as AssistantMessage
}

function history() {
  return Array.from({ length: 100 }, (_, index) =>
    index === 99
      ? assistant("msg_z_measured", 199)
      : user(`msg_z_history_${index.toString().padStart(3, "0")}`, 100 + index),
  )
}

function coverage(
  input: {
    markerID?: string
    markerCreated?: number
    watermark?: Message
    partID?: string
  } = {},
): CheckpointCoverage {
  const watermark = input.watermark ?? assistant("msg_z_measured", 199)
  return {
    partID: input.partID ?? "prt_checkpoint",
    marker: { id: input.markerID ?? "msg_z_marker", time: { created: input.markerCreated ?? 50 } },
    watermark: { id: watermark.id, status: "resolved", time: { created: watermark.time.created } },
  }
}

function checkpoint(input: { coveredUpTo: string; digestUpTo?: string; partID?: string }): CheckpointPart {
  return {
    id: input.partID ?? "prt_checkpoint",
    sessionID: SESSION_ID,
    messageID: "msg_z_marker",
    type: "checkpoint",
    checkpointDir: "",
    checkpointNumber: 0,
    coveredUpTo: input.coveredUpTo,
    ...(input.digestUpTo ? { digestUpTo: input.digestUpTo } : {}),
  }
}

type CoverageGate = {
  type: "held"
  data: CheckpointCoverage[]
  parked: boolean
  release: () => void
  resume: () => void
}

function holdCoverage(data: CheckpointCoverage[]): CoverageGate {
  return {
    type: "held",
    data,
    parked: false,
    release() {
      this.resume()
    },
    resume() {},
  }
}

function createFetch(messages: Message[], coverageReplies: (CheckpointCoverage[] | CoverageGate)[]) {
  const replies = [...coverageReplies]
  let coverageRequests = 0

  function body(path: string, directory?: string): unknown {
    if (path === "/path")
      return { home: "/home", state: "/state", config: "/config", worktree: "", directory: directory ?? DIRECTORY }
    if (path === "/project/current") return { id: "project" }
    if (path === "/config/providers") return { providers: [], default: {} }
    if (path === "/provider") return { all: [], default: {}, connected: [], authenticated: [] }
    if (path === "/session") return [session()]
    if (path === `/session/${SESSION_ID}`) return session()
    if (path === `/session/${SESSION_ID}/message`) return messages.map((info) => ({ info, parts: [] }))
    if (path.startsWith(`/session/${SESSION_ID}/`)) return []
    if (path === "/experimental/console") return {}
    if (path === "/vcs") return { branch: "main" }
    if (path === "/agent" || path === "/command" || path === "/experimental/workspace") return []
    if (path === "/lsp" || path === "/formatter") return []
    if (path === "/mcp" || path === "/session/status" || path === "/provider/auth") return {}
    if (path === "/experimental/resource" || path === "/experimental/workspace/status") return []
    if (path === "/config") return {}
    return {}
  }

  const fetcher = (async (request: Request) => {
    const url = new URL(request.url)
    const path = url.pathname
    const rawDirectory = url.searchParams.get("directory")
    const directory = rawDirectory ? decodeURIComponent(rawDirectory) : undefined
    if (path === `/session/${SESSION_ID}/checkpoint-coverage`) {
      coverageRequests += 1
      const reply = replies.shift() ?? []
      if (!Array.isArray(reply)) {
        reply.parked = true
        await new Promise<void>((resolve) => {
          reply.resume = resolve
        })
      }
      return new Response(JSON.stringify(Array.isArray(reply) ? reply : reply.data), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }
    return new Response(JSON.stringify(body(path, directory)), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }) as unknown as typeof fetch

  return {
    fetch: fetcher,
    coverageRequests: () => coverageRequests,
  }
}

function createEvents() {
  let handler: ((event: GlobalEvent) => void) | undefined
  return {
    source: {
      subscribe: async (fn: (event: GlobalEvent) => void) => {
        handler = fn
        return () => {
          if (handler === fn) handler = undefined
        }
      },
    },
    ready: () => handler !== undefined,
    emit(payload: Event) {
      if (!handler) throw new Error("event source not ready")
      handler({ directory: DIRECTORY, payload })
    },
  }
}

async function mount(
  input: {
    messages?: Message[]
    coverageReplies?: (CheckpointCoverage[] | CoverageGate)[]
  } = {},
) {
  const events = createEvents()
  const http = createFetch(input.messages ?? history(), input.coverageReplies ?? [[]])
  let context!: {
    project: ReturnType<typeof useProject>
    sdk: ReturnType<typeof useSDK>
    sync: ReturnType<typeof useSync>
  }
  let resolve!: () => void
  const ready = new Promise<void>((done) => {
    resolve = done
  })

  function Probe() {
    const project = useProject()
    const sdk = useSDK()
    const sync = useSync()
    onMount(() => {
      context = { project, sdk, sync }
      resolve()
    })
    return <box />
  }

  const app = await testRender(() => (
    <SDKProvider url="http://test" directory={DIRECTORY} fetch={http.fetch} events={events.source}>
      <ProjectProvider>
        <ArgsProvider>
          <ExitProvider>
            <SyncProvider>
              <Probe />
            </SyncProvider>
          </ExitProvider>
        </ArgsProvider>
      </ProjectProvider>
    </SDKProvider>
  ))

  await ready
  await wait(() => events.ready() && context.project.instance.directory() === DIRECTORY)
  return { app, ...context, emit: events.emit, http }
}

function usage(sync: ReturnType<typeof useSync>) {
  return computeContextUsage({
    messages: sync.data.message[SESSION_ID]?.main ?? [],
    window: WINDOW,
    checkpointCoverage: sync.data.checkpoint_coverage[SESSION_ID] ?? [],
  })
}

function updated(info: Message): Event {
  return { type: "message.updated", properties: { sessionID: SESSION_ID, info } }
}

function partUpdated(part: CheckpointPart): Event {
  return {
    type: "message.part.updated",
    properties: { sessionID: SESSION_ID, part, time: Date.now() },
  }
}

function partRemoved(part: CheckpointPart): Event {
  return {
    type: "message.part.removed",
    properties: { sessionID: SESSION_ID, messageID: part.messageID, partID: part.id },
  }
}

describe("tui checkpoint coverage sync", () => {
  test("cold sync keeps checkpoint coverage when latest-100 omits the marker", async () => {
    const measured = history().at(-1)!
    const coldCoverage = coverage({ watermark: measured })
    const { app, sync, emit } = await mount({ coverageReplies: [[coldCoverage]] })

    try {
      await sync.session.sync(SESSION_ID)

      expect(sync.data.message[SESSION_ID].main).toHaveLength(100)
      expect(sync.data.message[SESSION_ID].main.some((message) => message.id === coldCoverage.marker.id)).toBe(false)
      expect(sync.data.checkpoint_coverage[SESSION_ID]).toEqual([coldCoverage])
      expect(usage(sync)?.pending).toBe(true)

      emit(updated(assistant("msg_000_fresh", 300, 190_000)))
      await wait(() => sync.data.message[SESSION_ID].main.some((message) => message.id === "msg_000_fresh"))

      expect(sync.data.message[SESSION_ID].main).toHaveLength(100)
      expect(usage(sync)?.pending).toBe(false)
      expect(usage(sync)?.context).toBe("190.1K/960K (20%)")
    } finally {
      app.renderer.destroy()
    }
  })

  test("backdated MessageUpdated plus checkpoint PartUpdated preserves live coverage after self-eviction", async () => {
    const refresh = holdCoverage([coverage()])
    const { app, sync, emit } = await mount({ coverageReplies: [[], refresh] })

    try {
      await sync.session.sync(SESSION_ID)
      emit(updated(user("msg_z_marker", 50)))
      await wait(() => sync.data.message[SESSION_ID].main.length === 100)

      expect(sync.data.message[SESSION_ID].main.some((message) => message.id === "msg_z_marker")).toBe(false)

      emit(partUpdated(checkpoint({ coveredUpTo: "msg_z_measured" })))
      await wait(() => refresh.parked)

      expect(sync.data.part.msg_z_marker?.[0]?.type).toBe("checkpoint")
      expect(sync.data.message[SESSION_ID].main.some((message) => message.id === "msg_z_marker")).toBe(false)
      expect(sync.data.checkpoint_coverage[SESSION_ID]?.[0]?.marker.id).toBe("msg_z_marker")
      expect(sync.data.checkpoint_coverage[SESSION_ID]?.[0]?.watermark.status).toBe("resolved")
      expect(usage(sync)?.pending).toBe(true)

      refresh.release()
      await wait(() => sync.data.checkpoint_coverage[SESSION_ID]?.length === 1)
      emit(updated(incompleteAssistant("msg_000_fresh", 300)))
      await wait(() => sync.data.message[SESSION_ID].main.some((message) => message.id === "msg_000_fresh"))

      expect(usage(sync)?.pending).toBe(true)

      emit(updated(assistant("msg_000_fresh", 300, 190_000)))
      await wait(() => usage(sync)?.pending === false)

      expect(sync.data.message[SESSION_ID].main).toHaveLength(100)
      expect(usage(sync)?.context).toBe("190.1K/960K (20%)")
    } finally {
      app.renderer.destroy()
    }
  })

  test("an older coverage response cannot overwrite a newer PartUpdated refresh", async () => {
    const oldWatermark = history()[20]
    const newWatermark = history()[80]
    const oldCoverage = coverage({ watermark: oldWatermark })
    const newCoverage = coverage({ watermark: newWatermark })
    const stale = holdCoverage([oldCoverage])
    const { app, sync, emit } = await mount({ coverageReplies: [[], stale, [newCoverage]] })

    try {
      await sync.session.sync(SESSION_ID)
      emit(updated(user("msg_z_marker", 50)))
      emit(partUpdated(checkpoint({ coveredUpTo: oldWatermark.id })))
      await wait(() => stale.parked)

      emit(partUpdated(checkpoint({ coveredUpTo: oldWatermark.id, digestUpTo: newWatermark.id })))
      await wait(() => sync.data.checkpoint_coverage[SESSION_ID]?.[0]?.watermark.id === newWatermark.id)

      stale.release()
      await Bun.sleep(30)

      expect(sync.data.checkpoint_coverage[SESSION_ID]?.[0]?.watermark.id).toBe(newWatermark.id)
      expect(sync.data.checkpoint_coverage[SESSION_ID]).toEqual([newCoverage])
    } finally {
      app.renderer.destroy()
    }
  })

  test("session deletion invalidates an in-flight refresh and clears coverage", async () => {
    const initial = coverage()
    const stale = holdCoverage([initial])
    const { app, sync, emit } = await mount({ coverageReplies: [[initial], stale] })

    try {
      await sync.session.sync(SESSION_ID)
      emit(partUpdated(checkpoint({ coveredUpTo: "msg_z_measured" })))
      await wait(() => stale.parked)

      emit({
        type: "session.deleted",
        properties: { sessionID: SESSION_ID, info: session() },
      })
      await wait(() => sync.data.checkpoint_coverage[SESSION_ID] === undefined)

      stale.release()
      await Bun.sleep(30)

      expect(sync.data.checkpoint_coverage[SESSION_ID]).toBeUndefined()
      expect(sync.data.message[SESSION_ID]).toBeUndefined()
    } finally {
      app.renderer.destroy()
    }
  })

  test("PartRemoved refreshes when the part store identifies a checkpoint before coverage is cached", async () => {
    const markerPart = checkpoint({ coveredUpTo: "msg_z_measured" })
    const { app, sync, emit, http } = await mount({ coverageReplies: [[], [], []] })

    try {
      await sync.session.sync(SESSION_ID)
      emit(updated(user("msg_z_marker", 50)))
      emit(partUpdated(markerPart))
      await wait(() => http.coverageRequests() === 2 && sync.data.checkpoint_coverage[SESSION_ID]?.length === 0)

      expect(sync.data.part.msg_z_marker?.[0]?.type).toBe("checkpoint")

      emit(partRemoved(markerPart))
      await wait(() => http.coverageRequests() === 3)

      expect(sync.data.part.msg_z_marker).toEqual([])
    } finally {
      app.renderer.destroy()
    }
  })

  test("directory switching invalidates an old-directory refresh and clears coverage", async () => {
    const initial = coverage()
    const stale = holdCoverage([initial])
    const { app, sdk, sync, emit } = await mount({ coverageReplies: [[initial], stale] })

    try {
      await sync.session.sync(SESSION_ID)
      emit(partUpdated(checkpoint({ coveredUpTo: "msg_z_measured" })))
      await wait(() => stale.parked)

      sdk.switchDirectory("/tmp/checkpoint-coverage-next")
      await sync.bootstrap({ fatal: false })

      expect(sync.data.checkpoint_coverage[SESSION_ID]).toBeUndefined()

      stale.release()
      await Bun.sleep(30)

      expect(sync.data.checkpoint_coverage[SESSION_ID]).toBeUndefined()
    } finally {
      app.renderer.destroy()
    }
  })
})
