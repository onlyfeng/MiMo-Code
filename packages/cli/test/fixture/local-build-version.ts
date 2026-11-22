import { Effect } from "effect"
import { AppRuntime } from "../../src/effect/app-runtime"
import { USER_AGENT } from "../../src/installation"
import { Instance } from "../../src/project/instance"
import { initProjectors } from "../../src/server/projectors"
import { Session } from "../../src/session"
import { Database } from "../../src/storage"

const directory = process.env.VERSION_TEST_PROJECT
if (!directory) throw new Error("VERSION_TEST_PROJECT is required")
initProjectors()
try {
  const stored = await Instance.provide({
    directory,
    fn: () => AppRuntime.runPromise(Session.Service.use((sessions) =>
      sessions.create().pipe(Effect.flatMap((created) => sessions.get(created.id))),
    )),
  })
  console.log(JSON.stringify({ userAgent: USER_AGENT, version: stored.version }))
} finally {
  await Instance.disposeAll()
  await AppRuntime.dispose()
  Database.close()
}
