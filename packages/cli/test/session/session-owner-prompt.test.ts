import { afterEach, describe, expect } from "bun:test"
import { Cause, Effect, Exit } from "effect"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { ProcessLiveness } from "../../src/session/process-liveness"
import { SessionPrompt } from "../../src/session/prompt"
import { SessionOwnerTable } from "../../src/session/session-owner.sql"
import { Database, eq } from "../../src/storage"
import { Log } from "../../src/util"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { startProcessOwner } from "../lib/process-owner"
import { makeLayer, providerCfg, ref } from "../workflow/lib"

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

const it = testEffect(makeLayer())

describe("session.prompt process ownership", () => {
  it.live(
    "a prompt into a session another live process runs is refused before anything is written",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* () {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "owned elsewhere" })
          const owner = yield* Effect.promise(() => startProcessOwner(ProcessLiveness.directory()))
          yield* Effect.addFinalizer(() => Effect.promise(owner.kill))
          Database.use((db) => db.insert(SessionOwnerTable)
            .values({ session_id: session.id, instance_id: owner.instanceID, pid: owner.pid, time_claimed: Date.now() }).run())
          const input = { sessionID: session.id, agent: "build", model: ref, noReply: true, parts: [{ type: "text" as const, text: "hello" }] }

          const denied = yield* prompt.prompt(input).pipe(Effect.exit)
          expect(Exit.isFailure(denied)).toBe(true)
          expect(String(Exit.isFailure(denied) ? Cause.squash(denied.cause) : "")).toContain(`pid ${owner.pid}`)
          expect(yield* sessions.messages({ sessionID: session.id })).toHaveLength(0)

          yield* Effect.promise(owner.kill)
          yield* prompt.prompt(input)
          expect(yield* sessions.messages({ sessionID: session.id })).toHaveLength(1)
          expect(Database.use((db) => db.select().from(SessionOwnerTable).where(eq(SessionOwnerTable.session_id, session.id)).get())?.instance_id)
            .toBe(ProcessLiveness.INSTANCE_ID)
        }),
        { git: true, config: providerCfg },
      ),
    30_000,
  )
})
