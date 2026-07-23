import { afterEach, expect } from "bun:test"
import { Effect } from "effect"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { Session } from "../../src/session"
import { Log } from "../../src/util"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { makeLayer, ref, providerCfg } from "../workflow/lib"

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

const it = testEffect(makeLayer())

// The turn blocks inside the `question` tool on an un-timed Deferred. With a
// short heartbeat interval the route must emit keep-alive whitespace on the
// open POST /:sessionID/message stream BEFORE the turn finishes — otherwise a
// client with its own request timeout aborts mid-question with
// "error sending request for url". After we reply, the trailing JSON must
// still parse as the whole body despite the leading whitespace.
it.live(
  "writes keep-alive whitespace while the question tool blocks, then a parseable JSON tail",
  () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ dir, llm }) {
        const prev = process.env["MIMOCODE_PROMPT_HEARTBEAT_INTERVAL_MS"]
        process.env["MIMOCODE_PROMPT_HEARTBEAT_INTERVAL_MS"] = "50"
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            if (prev === undefined) delete process.env["MIMOCODE_PROMPT_HEARTBEAT_INTERVAL_MS"]
            else process.env["MIMOCODE_PROMPT_HEARTBEAT_INTERVAL_MS"] = prev
          }),
        )

        // Model emits a single `question` tool call → the turn blocks in
        // Question.ask waiting for a human reply, holding the stream open.
        yield* llm.toolMatch(
          (hit) => JSON.stringify(hit.body).includes("HEARTBEAT_QUESTION_TEST"),
          "question",
          {
            questions: [{ question: "proceed?", header: "confirm", options: [{ label: "yes", description: "go" }] }],
          },
        )

        const sessions = yield* Session.Service
        const session = yield* sessions.create({
          title: "heartbeat test",
          permission: [{ permission: "*", pattern: "*", action: "allow" }],
        })

        const app = Server.Default().app
        const dirQuery = `?directory=${encodeURIComponent(dir)}`

        const res = yield* Effect.promise(async () =>
          app.request(`/session/${session.id}/message${dirQuery}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: { providerID: ref.providerID, modelID: ref.modelID },
              parts: [{ type: "text", text: "HEARTBEAT_QUESTION_TEST" }],
            }),
          }),
        )

        expect(res.status).toBe(200)
        expect(res.body).not.toBeNull()
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()

        let pendingRead = reader.read()
        const readChunk = () =>
          Effect.promise(() =>
            Promise.race([
              pendingRead.then((r) => ({ timeout: false as const, ...r })),
              new Promise<{ timeout: true }>((r) => setTimeout(() => r({ timeout: true as const }), 100)),
            ]).then((result) => {
              if (!result.timeout) pendingRead = reader.read()
              return result
            }),
          )

        const listPending = () =>
          Effect.promise(async () => {
            const r = await app.request(`/question${dirQuery}`, { method: "GET" })
            return (await r.json()) as Array<{ id: string }>
          })

        // Read until the pending question shows up over the same app instance
        // and at least one heartbeat space has been written — proof bytes flow
        // before the turn completes.
        let buffer = ""
        let sawHeartbeat = false
        let pendingID: string | undefined
        const pendingDeadline = Date.now() + 15_000
        while (Date.now() < pendingDeadline && !(sawHeartbeat && pendingID)) {
          if (!pendingID) {
            const pending = yield* listPending()
            if (pending.length > 0) pendingID = pending[0]!.id
          }
          const read = yield* readChunk()
          if (!read.timeout && !read.done && read.value) buffer += decoder.decode(read.value, { stream: true })
          if (buffer.length > 0 && /^\s+$/.test(buffer)) sawHeartbeat = true
          yield* Effect.sleep("20 millis")
        }

        expect(sawHeartbeat).toBe(true)
        expect(pendingID).toBeDefined()

        // Reply over the same app instance so the turn finishes.
        const replyRes = yield* Effect.promise(async () =>
          app.request(`/question/${pendingID}/reply${dirQuery}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: [["yes"]] }),
          }),
        )
        expect(replyRes.status).toBe(200)

        // Drain the rest of the stream.
        let done = false
        const drainDeadline = Date.now() + 5_000
        while (Date.now() < drainDeadline && !done) {
          const read = yield* readChunk()
          if (read.timeout) continue
          if (read.done) done = true
          else buffer += decoder.decode(read.value, { stream: true })
        }

        // Leading whitespace + trailing JSON still parses as the whole body.
        expect(done).toBe(true)
        const parsed = JSON.parse(buffer)
        expect(parsed).toBeDefined()
        expect(parsed.info).toBeDefined()
      }),
      // root: "cwd" keeps the fixture inside cwd so the server security middleware
      // (which rejects directories outside cwd on unauthenticated servers) serves it;
      // git: true gives it its own .git so VCS detection stays scoped to the fixture.
      {
        git: true,
        config: (url) => ({
          ...providerCfg(url),
          dream: { auto: false },
          distill: { auto: false },
        }),
        root: "cwd",
      },
    ),
  30_000,
)
