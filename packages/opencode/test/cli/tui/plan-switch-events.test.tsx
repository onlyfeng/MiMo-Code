/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { Effect } from "effect"
import os from "node:os"
import path from "node:path"
import fs from "node:fs/promises"
import { randomUUID } from "node:crypto"
import type { GlobalEvent } from "@mimo-ai/sdk/v2"
import { SDKProvider } from "../../../src/cli/cmd/tui/context/sdk"
import { ProjectProvider } from "../../../src/cli/cmd/tui/context/project"
import { useEvent } from "../../../src/cli/cmd/tui/context/event"
import { bindPlanSwitch } from "../../../src/cli/cmd/tui/routes/session/plan-switch"
import { GlobalBus } from "../../../src/bus/global"
import { AppRuntime } from "../../../src/effect/app-runtime"
import { Instance } from "../../../src/project/instance"
import { Question } from "../../../src/question"
import { ProviderID, ModelID } from "../../../src/provider/schema"
import { Session } from "../../../src/session"
import { MessageV2 } from "../../../src/session/message-v2"
import { MessageID, PartID } from "../../../src/session/schema"
import { PlanExitTool } from "../../../src/tool/plan"
import { ToolScriptTool } from "../../../src/tool/tool-script"
import { tmpdir } from "../../fixture/fixture"

async function wait(predicate: () => boolean) {
  const deadline = Date.now() + 5000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Plan transition did not settle")
    await Bun.sleep(5)
  }
}

for (const answer of ["Yes", "No"]) {
  test(`real nested plan ${answer} crosses the persisted event and TUI consumer boundary`, async () => {
    await using tmp = await tmpdir({ git: true })
    const guestFile = path.join(os.tmpdir(), `mimocode-plan-${randomUUID()}.txt`)
    await Instance.provide({ directory: tmp.path, async fn() {
      const f = await AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service
        const session = yield* sessions.create({ title: "Nested plan UI" })
        const user = yield* sessions.updateMessage({
          id: MessageID.ascending(), sessionID: session.id, role: "user", agent: "plan",
          model: { providerID: ProviderID.make("test"), modelID: ModelID.make("original") },
          time: { created: Date.now() }, task_id: "plan-ui-task",
        })
        const assistant = yield* sessions.updateMessage({
          id: MessageID.ascending(), sessionID: session.id, role: "assistant", parentID: user.id,
          agent: "plan", mode: "plan", path: { cwd: tmp.path, root: tmp.path },
          providerID: user.model.providerID, modelID: user.model.modelID, cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, time: { created: Date.now() },
        })
        const part = yield* sessions.updatePart({
          id: PartID.ascending(), sessionID: session.id, messageID: assistant.id, type: "tool", tool: "exec", callID: "call_ui",
          state: { status: "running", input: {}, time: { start: Date.now() } },
        })
        return { sessions, session, user, assistant, part,
          plan: { ...(yield* (yield* PlanExitTool).init()), id: "plan_exit" }, exec: yield* (yield* ToolScriptTool).init() }
      }))
      const switched: string[] = []
      const events: GlobalEvent[] = []
      let mounted = false
      function Probe() {
        bindPlanSwitch(useEvent(), () => f.session.id, agent => switched.push(agent))
        mounted = true
        return <box />
      }
      const app = await testRender(() => (
        <SDKProvider url="http://plan-fixture" directory={tmp.path} events={{
          async subscribe(handler: (event: GlobalEvent) => void) {
            const listener = (event: unknown) => {
              const copied: GlobalEvent = JSON.parse(JSON.stringify(event))
              events.push(copied)
              handler(copied)
            }
            GlobalBus.on("event", listener)
            return () => { GlobalBus.off("event", listener) }
          },
        }}>
          <ProjectProvider><Probe /></ProjectProvider>
        </SDKProvider>
      ))
      const controller = new AbortController()
      try {
        await wait(() => mounted)
        const result = AppRuntime.runPromise(f.exec.execute({
          code: `try { await tools.plan_exit({}); } finally { await files.writeText(${JSON.stringify(guestFile)}, "continued"); }`,
        }, {
          sessionID: f.session.id, messageID: f.assistant.id, agent: "plan", actorID: "main", callID: f.part.callID,
          taskId: "plan-ui-task", interaction: { sessionID: f.session.id, planExit: true },
          messages: [], abort: controller.signal, extra: { execTools: { current: [f.plan] } },
          ask: () => Effect.void,
          metadata: value => f.sessions.updatePart({ ...f.part, state: {
            status: "running", input: {}, time: { start: 0 }, metadata: value.metadata,
          } }).pipe(Effect.asVoid),
        }))
        const question = await Promise.race([AppRuntime.runPromise(Effect.gen(function* () {
          const service = yield* Question.Service
          for (;;) {
            const item = (yield* service.list())[0]
            if (item) return item
            yield* Effect.sleep("5 millis")
          }
        }).pipe(Effect.timeout("5 seconds"))), result.then(value => { throw new Error(`Exec ended before asking: ${value.output}`) })])
        await AppRuntime.runPromise(Question.Service.use(service => service.reply({ requestID: question.id, answers: [[answer]] })))
        const completed = await result
        if (answer === "Yes") await wait(() => switched.length === 1)
        else await Bun.sleep(50)
        expect(switched).toEqual(answer === "Yes" ? ["build"] : [])
        expect(await Bun.file(guestFile).exists()).toBe(answer === "No")
        expect(completed.metadata.plan_exit !== undefined).toBe(answer === "Yes")
        const users = (await AppRuntime.runPromise(f.sessions.messages({ sessionID: f.session.id }))).filter(x => x.info.role === "user")
        expect(users).toHaveLength(answer === "Yes" ? 2 : 1)
        if (answer === "Yes") {
          const committed = users.find(x => x.info.id !== f.user.id)!
          expect(committed.info).toMatchObject({ agent: "build", task_id: "plan-ui-task", model: f.user.model })
          expect(committed.parts).toHaveLength(1)
          const event = events.find(event => event.payload.type === "message.part.updated" &&
            event.payload.properties.part.type === "tool" &&
            "metadata" in event.payload.properties.part.state && event.payload.properties.part.state.metadata?.plan_exit)
          expect(event).toBeDefined()
          // Replaying the committed event cannot switch the UI a second time.
          GlobalBus.emit("event", event!)
          await Bun.sleep(50)
          expect(switched).toEqual(["build"])
          expect(MessageV2.get({ sessionID: f.session.id, messageID: committed.info.id }).parts).toHaveLength(1)
        }
      } finally {
        controller.abort()
        app.renderer.destroy()
        await Instance.dispose()
        await fs.rm(guestFile, { force: true })
      }
    } })
  }, 20000)
}
