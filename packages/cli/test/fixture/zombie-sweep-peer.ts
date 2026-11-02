// Run with `bun run`, never `bun test`. A MiMo process over a shared database
// file that seeds an actor abandoned by a dead process, then runs the boot-time
// sweep when the parent says so and reports what happened.
import { Effect, Layer, ManagedRuntime } from "effect"
import { ActorRegistryTable } from "../../src/actor/actor.sql"
import { sweepAbandonedZombies } from "../../src/actor/registry"
import { Instance } from "../../src/project/instance"
import { initProjectors } from "../../src/server/projectors"
import { Session } from "../../src/session"
import { and, Database, eq } from "../../src/storage"
import { Log } from "../../src/util"

const [directory] = process.argv.slice(2)
if (!directory || !process.send) throw new Error("zombie-sweep-peer requires its test parent and a directory")
await Log.init({ print: false })
initProjectors()

const sessionID = await Instance.provide({
  directory,
  fn: async () => {
    const rt = ManagedRuntime.make(Layer.mergeAll(Session.defaultLayer))
    try {
      return await rt.runPromise(Effect.gen(function* () {
        const session = yield* (yield* Session.Service).create()
        const stale = Date.now() - 11 * 60 * 1000
        Database.use((db) => db.insert(ActorRegistryTable).values({
          session_id: session.id, actor_id: "crashed-1", mode: "subagent", parent_actor_id: null, status: "running",
          last_outcome: null, result_message_id: null, lifecycle: "ephemeral", agent: "explore", description: "crashed child",
          context_mode: "none", context_watermark: null, background: true, tools: null, last_turn_time: stale, turn_count: 1,
          last_activity_time: stale, last_error: null, instance_id: "00000000-0000-4000-8000-000000000000",
          time_completed: null, time_created: stale, time_updated: stale,
        }).run())
        return session.id
      }))
    } finally {
      await rt.dispose()
    }
  },
})

process.on("message", (message) => {
  if (message !== "sweep") return
  const started = Date.now()
  try {
    sweepAbandonedZombies()
    const status = Database.use((db) => db.select({ status: ActorRegistryTable.status }).from(ActorRegistryTable)
      .where(and(eq(ActorRegistryTable.session_id, sessionID), eq(ActorRegistryTable.actor_id, "crashed-1"))).get())?.status
    process.send!({ kind: "swept", elapsed: Date.now() - started, status })
  } catch (error) {
    process.send!({ kind: "failed", elapsed: Date.now() - started, message: String(error) })
  }
})
process.send({ kind: "seeded" })
