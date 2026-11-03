import { Plugin } from "../plugin"
import { Format } from "../format"
import { LSP } from "../lsp"
import { File } from "../file"
import { Snapshot } from "../snapshot"
import * as Project from "./project"
import * as Vcs from "./vcs"
import { Bus } from "../bus"
import { Command } from "../command"
import { Instance } from "./instance"
import { Log } from "@/util"
import { FileWatcher } from "@/file/watcher"
import { ShareNext } from "@/share"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { Config } from "@/config"
import { Metrics } from "@/metrics"
import { Memory } from "@/memory"
import { WriterService } from "@/history"
import { sweepAbandonedZombies } from "@/actor/registry"
import { CronBridge } from "@/session/cron-bridge"

export const InstanceBootstrap = Effect.gen(function* () {
  Log.Default.info("bootstrapping", { directory: Instance.directory })
  // everything depends on config so eager load it for nice traces
  yield* Config.Service.use((svc) => svc.get())
  // Plugin can mutate config so it has to be initialized before anything else.
  yield* Plugin.Service.use((svc) => svc.init())
  // Keep startup independent of transcript size. Only actor metadata is
  // reclaimed here; orphan tools are handled when their session runs.
  // A throw inside Effect.sync is a defect that Effect.catch never sees, and a
  // busy database would then fail the whole boot. Settling stale actors can
  // wait for the next boot.
  yield* Effect.try({ try: () => sweepAbandonedZombies(), catch: (err) => err }).pipe(
    Effect.catch((err: unknown) =>
      Effect.sync(() => Log.Default.warn("abandoned actor sweep failed", { error: String(err) })),
    ),
  )
  yield* Effect.all(
    [
      LSP.Service,
      ShareNext.Service,
      Format.Service,
      File.Service,
      FileWatcher.Service,
      Vcs.Service,
      Snapshot.Service,
      WriterService,
    ].map((s) => Effect.forkDetach(s.use((i) => i.init()))),
  ).pipe(Effect.withSpan("InstanceBootstrap.init"))

  // Warm the FTS index off the boot path. Off-tool writes between
  // process invocations are picked up here without blocking startup;
  // a missing memory dir or partial sync must not fail boot.
  yield* Memory.Service.use((svc) => svc.reconcile()).pipe(
    Effect.catch((err: unknown) =>
      Effect.sync(() => Log.Default.warn("memory reconcile failed", { error: String(err) })),
    ),
    Effect.forkDetach,
  )

  yield* Bus.Service.use((svc) =>
    svc.subscribeCallback(Command.Event.Executed, async (payload) => {
      if (payload.properties.name === Command.Default.INIT) {
        Project.setInitialized(Instance.project.id)
      }
    }),
  )

  yield* Metrics.subscribe()

  // A recycled instance (e.g. after a models catalog reload) stopped this
  // process's cron bridge; remount it now rather than at the next prompt, so
  // session-only jobs keep firing while the session is idle (FC-026).
  // The worktree bootstrap runtime has no cron bridge; nothing was mounted there.
  const bridge = Option.getOrUndefined(yield* Effect.serviceOption(CronBridge))
  if (bridge)
    yield* bridge.resume().pipe(
      Effect.catchCause((cause) =>
        Effect.sync(() => Log.Default.warn("cron bridge resume failed", { error: String(cause) })),
      ),
    )
}).pipe(Effect.withSpan("InstanceBootstrap"))
