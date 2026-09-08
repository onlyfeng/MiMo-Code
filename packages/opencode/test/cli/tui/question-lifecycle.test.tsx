/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import type { GlobalEvent } from "@mimo-ai/sdk/v2"
import { onMount } from "solid-js"
import { ArgsProvider } from "../../../src/cli/cmd/tui/context/args"
import { ExitProvider } from "../../../src/cli/cmd/tui/context/exit"
import { ProjectProvider } from "../../../src/cli/cmd/tui/context/project"
import { SDKProvider } from "../../../src/cli/cmd/tui/context/sdk"
import { SyncProvider, useSync } from "../../../src/cli/cmd/tui/context/sync"
import { GlobalBus } from "../../../src/bus/global"
import { Question } from "../../../src/question"
import { AppRuntime } from "../../../src/effect/app-runtime"
import { Instance } from "../../../src/project/instance"
import { SessionID } from "../../../src/session/schema"
import { tmpdir } from "../../fixture/fixture"

async function wait(predicate: () => boolean) {
  const deadline = Date.now() + 2000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Question TUI state did not settle")
    await Bun.sleep(5)
  }
}

for (const end of ["abort", "dispose"] as const) {
  test(`real question ${end} clears the TUI sync consumer pending list`, async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      async fn() {
        let sync: ReturnType<typeof useSync> | undefined
        function Probe() {
          const value = useSync()
          onMount(() => {
            sync = value
          })
          return <box />
        }
        const fetcher = (async (request: Request) => {
          const route = new URL(request.url).pathname
          const data =
            route === "/path"
              ? { home: tmp.path, state: tmp.path, config: tmp.path, worktree: tmp.path, directory: tmp.path }
              : route === "/project/current"
                ? { id: "question-project" }
                : route === "/config/providers"
                  ? { providers: [], default: {} }
                  : route === "/provider"
                    ? { all: [], default: {}, connected: [], authenticated: [] }
                    : [
                          "/session",
                          "/agent",
                          "/command",
                          "/experimental/workspace",
                          "/experimental/workspace/status",
                          "/lsp",
                          "/formatter",
                        ].includes(route)
                      ? []
                      : {}
          return Response.json(data)
        }) as typeof fetch
        const app = await testRender(() => (
          <SDKProvider
            url="http://question-fixture"
            directory={tmp.path}
            fetch={fetcher}
            events={{
              async subscribe(handler: (event: GlobalEvent) => void) {
                // Same JSON boundary as the live SSE transport; the events themselves
                // come from the real Question service and GlobalBus.
                const listener = (event: unknown) => handler(JSON.parse(JSON.stringify(event)))
                GlobalBus.on("event", listener)
                return () => {
                  GlobalBus.off("event", listener)
                }
              },
            }}
          >
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
        const controller = new AbortController()
        try {
          await wait(() => sync?.data.status === "complete")
          const sessionID = SessionID.make("ses_tui_question")
          const result = AppRuntime.runPromise(
            Question.Service.use((question) =>
              question.ask(
                { sessionID, questions: [{ question: "Continue?", header: "Continue", options: [] }] },
                controller.signal,
              ),
            ),
          ).catch((error) => error)
          await wait(() => sync?.data.question[sessionID]?.length === 1)
          expect((await AppRuntime.runPromise(Question.Service.use((question) => question.list())))[0].sessionID).toBe(
            sessionID,
          )
          if (end === "abort") controller.abort()
          else await Instance.dispose()
          expect(await result).toBeInstanceOf(Question.RejectedError)
          await wait(() => sync?.data.question[sessionID]?.length === 0)
          if (end === "abort")
            expect(await AppRuntime.runPromise(Question.Service.use((question) => question.list()))).toEqual([])
          else expect(await Instance.peek(tmp.path)).toBeUndefined()
        } finally {
          controller.abort()
          app.renderer.destroy()
          await Instance.dispose()
        }
      },
    })
  }, 15000)
}
