// Run with `bun run`, never `bun test`. One of two real processes that share a
// database file, each like a TUI window:
// - receiver: opens a new session and runs whatever other processes deliver to it;
// - sender: messages that session from its own session with `actor send`.
import { Effect, Layer, ManagedRuntime } from "effect"
import { Bus } from "../../src/bus"
import { GlobalBus } from "../../src/bus/global"
import { Instance } from "../../src/project/instance"
import { initProjectors } from "../../src/server/projectors"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { MessageID, SessionID } from "../../src/session/schema"
import { SessionStatus } from "../../src/session/status"
import { ActorTool } from "../../src/tool/actor"
import { Log } from "../../src/util"
import { makeLayer, ref } from "../workflow/lib"
// After the prompt stack: importing the waiter first trips a circular-import initialization order.
import { ActorWaiter } from "../../src/actor/waiter"
import { TaskRegistry } from "../../src/task/registry"
import { Team } from "../../src/team"
import { SessionCheckpoint } from "../../src/session/checkpoint"

const [mode, directory, target] = process.argv.slice(2)
if ((mode !== "receiver" && mode !== "sender") || !directory || !process.send) throw new Error("session-owner-peer requires its test parent")
await Log.init({ print: false })
initProjectors()
const send = (value: unknown) => new Promise<void>((resolve, reject) => {
  process.send!(value, (error?: Error | null) => (error ? reject(error) : resolve()))
})
const finish = Promise.withResolvers<void>()
process.on("message", (message) => { if (message === "finish") finish.resolve() })
// The actor tool needs services the prompt stack keeps internal; add them for the sender.
const runtime = ManagedRuntime.make(Layer.mergeAll(makeLayer(), ActorWaiter.defaultLayer, TaskRegistry.defaultLayer, Team.defaultLayer, SessionCheckpoint.defaultLayer))

try {
  await Instance.provide({ directory, fn: () => runtime.runPromise(Effect.gen(function* () {
    const bus = yield* Bus.Service
    const sessions = yield* Session.Service
    const busy = new Set<string>()
    // What this process's TUI would be told about messages, in order.
    const shown: string[] = []
    GlobalBus.on("event", (event: { payload: { type: string; properties?: { info?: { role?: string; provenance?: { source?: string } } } } }) => {
      const info = event.payload.type === "message.updated" ? event.payload.properties?.info : undefined
      if (info) shown.push(`${info.role}:${info.provenance?.source ?? "local"}`)
    })
    yield* bus.subscribeCallback(SessionStatus.Event.Status, (event) => {
      if (event.properties.status.type === "busy") busy.add(event.properties.sessionID)
    })
    if (mode === "receiver") {
      const session = yield* sessions.create({ title: "worker" })
      // Opening the session: a first turn gives its lane a model and claims it here.
      yield* (yield* SessionPrompt.Service).prompt({
        sessionID: session.id, agent: "build", model: ref, noReply: true, parts: [{ type: "text", text: "ready for work" }],
      })
      yield* Effect.promise(() => send({ kind: "ready", pid: process.pid, sessionID: session.id }))
      for (;;) {
        const messages = yield* sessions.messages({ sessionID: session.id })
        if (busy.has(session.id) && messages.some((message) => message.info.role === "assistant" &&
          message.parts.some((part) => part.type === "text" && part.text === "task done"))) break
        yield* Effect.sleep(100)
      }
      yield* Effect.promise(() => send({ kind: "ran", pid: process.pid, busy: [...busy], shown }))
    } else {
      const coordinator = yield* sessions.create({ title: "coordinator" })
      const def = yield* (yield* ActorTool).init()
      const result = yield* def.execute(
        { operation: { action: "send", to_session_id: SessionID.make(target), to_actor_id: "main", content: "please take task 2" } },
        {
          sessionID: coordinator.id, messageID: MessageID.ascending(), agent: "build", abort: new AbortController().signal,
          extra: {}, messages: [], metadata: () => Effect.void, ask: () => Effect.void,
        },
      )
      yield* Effect.promise(() => send({ kind: "sent", pid: process.pid, output: JSON.parse(result.output) }))
      yield* Effect.promise(() => finish.promise)
      yield* Effect.promise(() => send({ kind: "done", pid: process.pid, busy: [...busy] }))
    }
  })) })
} catch (error) {
  await send({ kind: "error", message: error instanceof Error ? error.stack ?? error.message : String(error) })
} finally {
  await runtime.dispose().catch(() => undefined)
  process.exit(0)
}
