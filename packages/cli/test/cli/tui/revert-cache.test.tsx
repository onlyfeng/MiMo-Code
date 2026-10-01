/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { Message, Part, Session } from "@mimo-ai/sdk/v2"
import { ArgsProvider } from "../../../src/cli/cmd/tui/context/args"
import { ExitProvider } from "../../../src/cli/cmd/tui/context/exit"
import { ProjectProvider } from "../../../src/cli/cmd/tui/context/project"
import { SDKProvider, useSDK } from "../../../src/cli/cmd/tui/context/sdk"
import { compareMessageOrder, SyncProvider, useSync } from "../../../src/cli/cmd/tui/context/sync"

const directory = "/tmp/revert-cache"

async function waitFor(ready: () => boolean) {
  const start = Date.now()
  while (!ready()) {
    if (Date.now() - start > 2000) throw new Error("TUI cache condition was not reached")
    await Bun.sleep(5)
  }
}

function history(sessionID: string, agentID: string, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const info: Message = {
      id: `msg_${sessionID}_${agentID}_${index}`,
      sessionID,
      agentID,
      role: "user",
      agent: "build",
      model: { providerID: "test", modelID: "model" },
      time: { created: index },
    }
    const parts: Part[] = [
      {
        id: `part_${info.id}`,
        messageID: info.id,
        sessionID,
        type: "text",
        text: `message ${index}`,
      },
    ]
    return { info, parts }
  })
}

test.each(["event", "bootstrap"] as const)(
  "%s clears the revert cache without waiting for another message",
  async (clear) => {
    const main = history("ses_main", "main", 150)
    const actor = history("ses_main", "actor_example", 120)
    const small = history("ses_main", "actor_small", 3)
    const other = history("ses_other", "main", 103)
    const rows: Record<string, ReturnType<typeof history>> = {
      ses_main: [...main, ...actor, ...small].toSorted((a, b) => compareMessageOrder(a.info, b.info)),
      ses_other: other,
    }
    const sessions: Record<string, Session> = Object.fromEntries(
      Object.entries(rows).map(([id, messages]) => [
        id,
        {
          id,
          slug: id,
          projectID: "project_example",
          directory,
          title: id,
          titleSource: "user",
          titleRevision: 0,
          version: "test",
          time: { created: 0, updated: 0 },
          revert: { messageID: messages[0].info.id },
        },
      ]),
    )
    const pages: string[] = []
    const fetcher: typeof fetch = Object.assign(
      async (input: RequestInfo | URL) => {
        const url = new URL(input instanceof Request ? input.url : String(input))
        const route = url.pathname.split("/")
        if (route[1] === "session" && route[3] === "message") {
          pages.push(route[2])
          const end = Number(url.searchParams.get("before") ?? rows[route[2]].length)
          const start = Math.max(0, end - 100)
          return Response.json(rows[route[2]].slice(start, end), {
            headers: start ? { "x-next-cursor": String(start) } : undefined,
          })
        }
        if (route[1] === "session" && route.length === 3 && sessions[route[2]]) return Response.json(sessions[route[2]])
        if (url.pathname === "/session") return Response.json(Object.values(sessions))
        if (url.pathname === "/path") return Response.json({ directory, home: "", state: "", config: "", worktree: "" })
        if (url.pathname === "/project/current") return Response.json({ id: "project_example" })
        if (url.pathname === "/config/providers") return Response.json({ providers: [], default: {} })
        if (url.pathname === "/provider")
          return Response.json({ all: [], default: {}, connected: [], authenticated: [] })
        if (
          route[1] === "session" ||
          [
            "/agent",
            "/command",
            "/lsp",
            "/formatter",
            "/experimental/workspace",
            "/experimental/workspace/status",
          ].includes(url.pathname)
        )
          return Response.json([])
        return Response.json({})
      },
      { preconnect: fetch.preconnect },
    )
    const context = {} as { sdk: ReturnType<typeof useSDK>; sync: ReturnType<typeof useSync> }
    function Probe() {
      context.sdk = useSDK()
      context.sync = useSync()
      return <box />
    }
    const app = await testRender(() => (
      <SDKProvider url="http://test" directory={directory} fetch={fetcher} events={{ subscribe: async () => () => {} }}>
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
    try {
      await waitFor(() => context.sync?.data.status === "complete")
      await context.sync.session.sync("ses_main")
      await context.sync.session.sync("ses_other")
      expect(pages.filter((id) => id === "ses_main")).toHaveLength(3)
      expect(pages.filter((id) => id === "ses_other")).toHaveLength(2)
      expect(context.sync.data.message.ses_main.main).toHaveLength(150)
      expect(context.sync.data.message.ses_main.actor_example).toHaveLength(120)

      // The real event consumer must preserve all hydrated boundaries during undo.
      context.sdk.event.emit("event", {
        directory,
        payload: {
          type: "session.updated",
          properties: { sessionID: "ses_main", info: { ...sessions.ses_main } },
        },
      })
      const updated = { ...main[149].info, agent: "updated" }
      context.sdk.event.emit("event", {
        directory,
        payload: { type: "message.updated", properties: { sessionID: updated.sessionID, info: updated } },
      })
      const arrived = { ...main[149].info, id: "msg_000_new", time: { created: 1000 } }
      context.sdk.event.emit("event", {
        directory,
        payload: { type: "message.updated", properties: { sessionID: arrived.sessionID, info: arrived } },
      })
      expect(context.sync.data.message.ses_main.main).toHaveLength(151)
      expect(context.sync.data.message.ses_main.actor_example).toHaveLength(120)
      expect(context.sync.data.part[main[0].info.id]).toEqual(main[0].parts)
      expect(context.sync.data.part[actor[0].info.id]).toEqual(actor[0].parts)

      delete sessions.ses_main.revert
      if (clear === "event") {
        context.sdk.event.emit("event", {
          directory,
          payload: {
            type: "session.updated",
            properties: { sessionID: "ses_main", info: sessions.ses_main },
          },
        })
      } else {
        await context.sync.bootstrap({ fatal: false })
      }
      await waitFor(() => !context.sync.session.get("ses_main")?.revert)
      expect(context.sync.data.message.ses_main.main).toHaveLength(100)
      expect(context.sync.data.message.ses_main.actor_example).toHaveLength(100)
      expect(context.sync.data.message.ses_main.main[0].id).toBe(main[51].info.id)
      expect(context.sync.data.message.ses_main.actor_example[0].id).toBe(actor[20].info.id)
      for (const item of [...main.slice(0, 51), ...actor.slice(0, 20)])
        expect(context.sync.data.part[item.info.id]).toBeUndefined()
      expect(context.sync.data.part[main[51].info.id]).toEqual(main[51].parts)
      expect(context.sync.data.part[actor[20].info.id]).toEqual(actor[20].parts)
      expect(context.sync.data.message.ses_main.actor_small).toEqual(small.map((item) => item.info))
      expect(context.sync.data.part[small[0].info.id]).toEqual(small[0].parts)
      expect(context.sync.data.message.ses_other.main).toEqual(other.map((item) => item.info))
      expect(context.sync.data.part[other[0].info.id]).toEqual(other[0].parts)

      context.sdk.event.emit("event", {
        directory,
        payload: {
          type: "message.updated",
          properties: { sessionID: arrived.sessionID, info: { ...arrived, agent: "updated again" } },
        },
      })
      expect(context.sync.data.message.ses_main.main).toHaveLength(100)
      context.sdk.event.emit("event", {
        directory,
        payload: {
          type: "message.updated",
          properties: {
            sessionID: arrived.sessionID,
            info: { ...arrived, id: "msg_001_new", time: { created: 1001 } },
          },
        },
      })
      expect(context.sync.data.message.ses_main.main).toHaveLength(100)
      expect(context.sync.data.part[main[51].info.id]).toBeUndefined()
      expect(context.sync.data.message.ses_main.actor_example).toHaveLength(100)
      expect(context.sync.data.message.ses_other.main).toHaveLength(103)
    } finally {
      app.renderer.destroy()
    }
  },
)
