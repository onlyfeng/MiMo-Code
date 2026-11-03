import { test, expect, beforeEach } from "bun:test"
import { Effect } from "effect"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import {
  Scheduler,
  layer as schedulerLayer,
  type LoopEndedEvent,
  type StartOpts,
} from "@/cron/scheduler"
import { clearAllLoopStates } from "@/cron/loop-state"
import {
  removeSessionCronTasks,
  getSessionCronTasks,
  addSessionCronTask,
  readCronTasks,
  writeCronTasks,
  type CronTask,
} from "@/cron/cron-task"
import { DEFAULT_JITTER } from "@/cron/cron-jitter"

const provided = <A, E>(eff: Effect.Effect<A, E, Scheduler>) =>
  Effect.runPromise(eff.pipe(Effect.provide(schedulerLayer)) as Effect.Effect<A, E, never>)

const freshDir = () => mkdtempSync(join(tmpdir(), "sched-"))

const baseStartOpts = (dir: string, overrides: Partial<StartOpts> = {}): StartOpts => ({
  workspaceRoot: dir,
  sessionID: "ses_test",
  isLoading: () => true, // keep ticks no-op for unit tests; we drive operations directly
  isKilled: () => false,
  onFire: () => {},
  onLoopEnded: () => {},
  dir,
  ...overrides,
})

beforeEach(() => {
  clearAllLoopStates()
  // Drain any session tasks left from prior tests
  removeSessionCronTasks(getSessionCronTasks().map((t) => t.id))
})

test("add + get + remove session-only task", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(baseStartOpts(dir))
      const created = yield* sched.add({
        session_id: "ses_test",
        cron: "*/5 * * * *",
        prompt: "hello",
        recurring: true,
        durable: false,
      })
      expect(created.prompt).toBe("hello")
      expect(created.recurring).toBe(true)

      const got = yield* sched.get(created.id)
      expect(got).not.toBe(null)
      expect(got?.id).toBe(created.id)

      const removed = yield* sched.remove(created.id)
      expect(removed).toBe(true)

      const afterGet = yield* sched.get(created.id)
      expect(afterGet).toBe(null)

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("armLoop creates a loop task and returns scheduledFor", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(baseStartOpts(dir))

      const result = yield* sched.armLoop({
        prompt: "tick",
        delay_seconds: 120,
        reason_length: 0,
      })

      expect(result).not.toBe(null)
      expect(result!.scheduledFor).toBeGreaterThan(Date.now())
      expect(result!.clampedDelaySeconds).toBe(120)
      expect(result!.wasClamped).toBe(false)
      expect(result!.supersededCount).toBe(0)

      const tasks = yield* sched.list({ kind: "loop" })
      expect(tasks.length).toBe(1)
      expect(tasks[0]!.kind).toBe("loop")
      expect(tasks[0]!.prompt).toBe("tick")

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("armLoop clamps delay_seconds to [60, 3600]", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(baseStartOpts(dir))

      const low = yield* sched.armLoop({ prompt: "low", delay_seconds: 10, reason_length: 0 })
      expect(low!.clampedDelaySeconds).toBe(60)
      expect(low!.wasClamped).toBe(true)

      const high = yield* sched.armLoop({ prompt: "high", delay_seconds: 9999, reason_length: 0 })
      expect(high!.clampedDelaySeconds).toBe(3600)
      expect(high!.wasClamped).toBe(true)

      const fine = yield* sched.armLoop({ prompt: "fine", delay_seconds: 300, reason_length: 0 })
      expect(fine!.wasClamped).toBe(false)

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("armLoop supersedes prior loop task for same prompt", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(baseStartOpts(dir))

      const first = yield* sched.armLoop({ prompt: "same", delay_seconds: 120, reason_length: 0 })
      expect(first!.supersededCount).toBe(0)

      const second = yield* sched.armLoop({ prompt: "same", delay_seconds: 180, reason_length: 0 })
      expect(second!.supersededCount).toBe(1)

      const loops = yield* sched.list({ kind: "loop" })
      expect(loops.length).toBe(1)
      expect(loops[0]!.prompt).toBe("same")

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

// Regression for PR #1479 finding #5: an aged-out armLoop must clear the
// prior session task and the LoopState entry before returning null.
// Otherwise the prior task fires once more, the model calls armLoop again,
// and a fresh LoopState{startedAt:now} defeats the max-age cap.
test("aged-out armLoop clears prior task + LoopState (does not rebirth)", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      const endedEvents: Array<{ reason: string; prompt: string }> = []
      yield* sched.start({
        ...baseStartOpts(dir),
        onLoopEnded: (e) => endedEvents.push({ reason: e.reason, prompt: e.prompt }),
        jitterConfig: { ...DEFAULT_JITTER, recurringMaxAgeMs: 50 },
      })

      yield* sched.armLoop({ prompt: "agedme", delay_seconds: 600, reason_length: 0 })
      const before = yield* sched.list({ kind: "loop" })
      expect(before.length).toBe(1)

      // Wait past the (very short) max-age window so the next armLoop trips it.
      yield* Effect.promise(() => new Promise((r) => setTimeout(r, 80)))

      const aged = yield* sched.armLoop({ prompt: "agedme", delay_seconds: 600, reason_length: 0 })
      expect(aged).toBeNull()

      // Prior session task must be gone — otherwise it would fire once more
      // and the model could re-arm with a fresh LoopState.
      const after = yield* sched.list({ kind: "loop" })
      expect(after.length).toBe(0)

      // loop_ended emitted with reason: "aged_out".
      expect(endedEvents.find((e) => e.reason === "aged_out")?.prompt).toBe("agedme")

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("rename updates task prompt", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(baseStartOpts(dir))

      const created = yield* sched.add({
        session_id: "ses_test",
        cron: "*/10 * * * *",
        prompt: "before",
        recurring: true,
        durable: false,
      })

      const ok = yield* sched.rename(created.id, "after")
      expect(ok).toBe(true)

      const got = yield* sched.get(created.id)
      expect(got?.prompt).toBe("after")

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("endLoop cancels pending and emits loop_ended", async () => {
  const dir = freshDir()
  const events: LoopEndedEvent[] = []
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(
        baseStartOpts(dir, {
          onLoopEnded: (e) => events.push(e),
        }),
      )

      yield* sched.armLoop({ prompt: "endme", delay_seconds: 600, reason_length: 0 })
      const before = yield* sched.list({ kind: "loop" })
      expect(before.length).toBe(1)

      yield* sched.endLoop("endme", "user_abort")

      const after = yield* sched.list({ kind: "loop" })
      expect(after.length).toBe(0)
      expect(events.length).toBe(1)
      expect(events[0]!.reason).toBe("user_abort")
      expect(events[0]!.prompt).toBe("endme")

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

// Regression for PR #1479 finding #8 residual (re-review round). The original
// fix added `if (rt.opts.isLoading()) break` between fires, but isLoading()
// reads a bridge-owned flag that flips inside an async bus callback — the
// synchronous for-loop can't observe that transition. The tick-local
// `firedThisTick` latch is what actually blocks same-tick double-fire.
test("same-tick double-fire: only the first due task fires per tick", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      const fires: string[] = []
      yield* sched.start({
        ...baseStartOpts(dir),
        isLoading: () => false,
        onFire: (t) => fires.push(t.id),
        jitterConfig: { ...DEFAULT_JITTER, recurringFrac: 0 },
      })

      const past = Date.now() - 61_000
      addSessionCronTask({
        id: "taskA",
        cron: "* * * * *",
        prompt: "A",
        createdAt: past,
        recurring: true,
      })
      addSessionCronTask({
        id: "taskB",
        cron: "* * * * *",
        prompt: "B",
        createdAt: past,
        recurring: true,
      })

      yield* sched.tickOnce()
      expect(fires.length).toBe(1)
      expect(["taskA", "taskB"]).toContain(fires[0])

      yield* sched.tickOnce()
      expect(fires.length).toBe(2)
      expect(new Set(fires)).toEqual(new Set(["taskA", "taskB"]))

      yield* sched.stop()
    }),
  )
  removeSessionCronTasks(["taskA", "taskB"])
  rmSync(dir, { recursive: true, force: true })
})

test("armLoop stamps createdBySessionId when session_id is provided", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(baseStartOpts(dir))

      const result = yield* sched.armLoop({
        prompt: "owned-loop",
        delay_seconds: 120,
        reason_length: 0,
        session_id: "ses_owner",
      })
      expect(result).not.toBe(null)

      const tasks = yield* sched.list({ kind: "loop", session_id: "ses_owner" })
      expect(tasks.length).toBe(1)
      expect(tasks[0]!.createdBySessionId).toBe("ses_owner")

      // Other sessions cannot see or cancel it.
      const otherList = yield* sched.list({ kind: "loop", session_id: "ses_other" })
      expect(otherList.length).toBe(0)
      const stolen = yield* sched.remove(tasks[0]!.id, { session_id: "ses_other" })
      expect(stolen).toBe(false)

      const own = yield* sched.remove(tasks[0]!.id, { session_id: "ses_owner" })
      expect(own).toBe(true)

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("get/delete/rename honor session ownership; unmarked tasks stay accessible", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(baseStartOpts(dir))

      const mine = yield* sched.add({
        session_id: "ses_a",
        cron: "*/5 * * * *",
        prompt: "mine",
        recurring: true,
        durable: false,
      })
      // Pre-affinity disk/session rows have no createdBySessionId.
      addSessionCronTask({
        id: "legacy1",
        cron: "*/5 * * * *",
        prompt: "legacy",
        createdAt: Date.now(),
        recurring: true,
        durable: false,
      })

      expect(yield* sched.get(mine.id, { session_id: "ses_b" })).toBe(null)
      expect(yield* sched.get(mine.id, { session_id: "ses_a" })).not.toBe(null)
      expect(yield* sched.rename(mine.id, "nope", { session_id: "ses_b" })).toBe(false)
      expect(yield* sched.remove(mine.id, { session_id: "ses_b" })).toBe(false)

      // Legacy unmarked: visible to any session filter (fire-time fallback parity).
      expect(yield* sched.get("legacy1", { session_id: "ses_b" })).not.toBe(null)
      const listed = yield* sched.list({ session_id: "ses_b" })
      expect(listed.map((t) => t.id)).toContain("legacy1")
      expect(yield* sched.remove("legacy1", { session_id: "ses_b" })).toBe(true)

      expect(yield* sched.remove(mine.id, { session_id: "ses_a" })).toBe(true)

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("armLoop without session_id inherits the superseded task's owner", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(baseStartOpts(dir))

      // Model-driven first arm stamps the owner.
      yield* sched.armLoop({
        prompt: "keepalive-loop",
        delay_seconds: 120,
        reason_length: 0,
        session_id: "ses_b",
      })
      const first = yield* sched.list({ kind: "loop", session_id: "ses_b" })
      expect(first.length).toBe(1)

      // Keepalive re-arm omits session_id — must not drop the stamp.
      yield* sched.armLoop({
        prompt: "keepalive-loop",
        delay_seconds: 120,
        reason_length: 0,
        viaKeepalive: true,
      })
      const after = yield* sched.list({ kind: "loop" })
      expect(after.length).toBe(1)
      expect(after[0]!.createdBySessionId).toBe("ses_b")
      // Still not visible to a different session filter.
      expect(yield* sched.list({ kind: "loop", session_id: "ses_a" })).toEqual([])

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("keepalive armLoop after fire retains owner via LoopState", async () => {
  const dir = freshDir()
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(baseStartOpts(dir))

      // Model-driven first arm stamps the owner.
      yield* sched.armLoop({
        prompt: "postfire-loop",
        delay_seconds: 120,
        reason_length: 0,
        session_id: "ses_b",
      })
      const armed = getSessionCronTasks().filter((t) => t.prompt === "postfire-loop")
      expect(armed.length).toBe(1)
      expect(armed[0]!.createdBySessionId).toBe("ses_b")

      // Simulate the tick's post-fire path: one-shot loop tasks are removed
      // after fire, leaving only LoopState behind.
      removeSessionCronTasks(armed.map((t) => t.id))
      expect(getSessionCronTasks().filter((t) => t.prompt === "postfire-loop")).toEqual([])

      // Keepalive re-arm has no session_id and no prior row to inherit from.
      yield* sched.armLoop({
        prompt: "postfire-loop",
        delay_seconds: 120,
        reason_length: 0,
        viaKeepalive: true,
      })
      const after = getSessionCronTasks().filter((t) => t.prompt === "postfire-loop")
      expect(after.length).toBe(1)
      expect(after[0]!.createdBySessionId).toBe("ses_b")
      expect(yield* sched.list({ kind: "loop", session_id: "ses_a" })).toEqual([])

      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

// FC-034: a scheduler that started while another process held the lock keeps
// trying for it, so durable tasks fire after that process's scheduler stops.
const lockPath = (dir: string) => join(dir, ".mimocode", ".cron-lock")

// pid 1 is always alive; on Linux the lock must also carry its real start time.
const plantForeignLock = (dir: string) => {
  mkdirSync(join(dir, ".mimocode"), { recursive: true })
  const startedAt = process.platform === "linux" ? Math.floor(pidStartMs(1)) : Date.now()
  writeFileSync(lockPath(dir), JSON.stringify({ pid: 1, startedAt }))
}

const pidStartMs = (pid: number): number => {
  const rest = (stat: string) => stat.slice(stat.lastIndexOf(")") + 2).split(/\s+/)
  const other = parseInt(rest(readFileSync(`/proc/${pid}/stat`, "utf-8"))[19] ?? "0", 10)
  const self = parseInt(rest(readFileSync(`/proc/${process.pid}/stat`, "utf-8"))[19] ?? "0", 10)
  const boot = Date.now() - Math.floor(parseFloat(readFileSync("/proc/uptime", "utf-8").split(/\s+/)[0] ?? "0") * 1000)
  const started = Date.now() - Math.floor(process.uptime() * 1000)
  return boot + other * ((started - boot) / Math.max(1, self))
}

const durableTask = (overrides: Partial<CronTask>): CronTask => ({
  id: "durable1",
  cron: "* * * * *",
  prompt: "durable job",
  createdAt: Date.now() - 3 * 60_000,
  recurring: true,
  durable: true,
  createdBySessionId: "ses_other",
  ...overrides,
})

test("a scheduler without the lock takes it over once the holder lets go, then fires durable tasks", async () => {
  const dir = freshDir()
  plantForeignLock(dir)
  await provided(writeCronTasks([durableTask({})], dir))
  const fired: string[] = []
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(
        baseStartOpts(dir, { isLoading: () => false, onFire: (task) => fired.push(task.id), lockRetryMs: 0 }),
      )
      // Held by a live process: no takeover, and durable tasks are not read.
      yield* sched.tickOnce()
      expect(fired).toEqual([])

      rmSync(lockPath(dir))
      yield* sched.tickOnce()
      expect(fired).toEqual(["durable1"])
      expect(JSON.parse(readFileSync(lockPath(dir), "utf-8")).pid).toBe(process.pid)

      yield* sched.stop()
      expect(existsSync(lockPath(dir))).toBe(false)
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("a durable one-shot missed while nobody held the lock fires once after the lock is taken over", async () => {
  const dir = freshDir()
  plantForeignLock(dir)
  // Due five minutes ago, so its next run after creation has already passed.
  const due = new Date(Date.now() - 5 * 60_000)
  const missed = durableTask({
    id: "missed1",
    cron: `${due.getUTCMinutes()} ${due.getUTCHours()} * * *`,
    createdAt: due.getTime() - 5 * 60_000,
    recurring: false,
  })
  await provided(writeCronTasks([missed], dir))
  const fired: string[] = []
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(
        baseStartOpts(dir, { isLoading: () => false, onFire: (task) => fired.push(task.id), lockRetryMs: 0 }),
      )
      rmSync(lockPath(dir))
      yield* sched.tickOnce()
      yield* sched.tickOnce()
      expect(fired).toEqual(["missed1"])
      expect(yield* readCronTasks(dir)).toEqual([])
      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("a takeover racing a stop and a restart leaves the restarted scheduler holding the lock", async () => {
  const dir = freshDir()
  plantForeignLock(dir)
  await provided(writeCronTasks([durableTask({})], dir))
  const fired: string[] = []
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      const opts = baseStartOpts(dir, { isLoading: () => false, onFire: (task) => fired.push(task.id), lockRetryMs: 0 })
      // The interleaving varies from run to run, so race it repeatedly.
      for (let round = 0; round < 20; round++) {
        plantForeignLock(dir)
        yield* sched.start(opts)
        rmSync(lockPath(dir))
        yield* Effect.all([sched.tickOnce(), sched.stop().pipe(Effect.andThen(sched.start(opts)))], {
          concurrency: "unbounded",
        })
        expect(JSON.parse(readFileSync(lockPath(dir), "utf-8")).pid).toBe(process.pid)
        yield* sched.stop()
        expect(existsSync(lockPath(dir))).toBe(false)
      }
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("a scheduler without the lock waits out its retry interval before trying again", async () => {
  const dir = freshDir()
  plantForeignLock(dir)
  await provided(writeCronTasks([durableTask({})], dir))
  const fired: string[] = []
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(
        baseStartOpts(dir, { isLoading: () => false, onFire: (task) => fired.push(task.id), lockRetryMs: 60_000 }),
      )
      rmSync(lockPath(dir))
      yield* sched.tickOnce()
      expect(fired).toEqual([])
      expect(existsSync(lockPath(dir))).toBe(false)
      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})

test("a permanent durable task outlives the recurring age limit; others age out", async () => {
  const dir = freshDir()
  const fired: string[] = []
  await provided(
    Effect.gen(function* () {
      const sched = yield* Scheduler
      yield* sched.start(
        baseStartOpts(dir, {
          isLoading: () => false,
          onFire: (task) => fired.push(task.id),
          jitterConfig: { ...DEFAULT_JITTER, recurringMaxAgeMs: 60_000 },
        }),
      )
      const keep = yield* sched.add({
        session_id: "ses_test",
        cron: "* * * * *",
        prompt: "keep",
        recurring: true,
        durable: true,
        permanent: true,
      })
      const expire = yield* sched.add({ session_id: "ses_test", cron: "* * * * *", prompt: "expire", recurring: true, durable: true })
      const sessionOnly = yield* sched.add({
        session_id: "ses_test",
        cron: "* * * * *",
        prompt: "session only",
        recurring: true,
        durable: false,
        permanent: true,
      })
      expect(keep.permanent).toBe(true)
      expect(expire.permanent).toBeUndefined()
      // permanent only applies to a durable task.
      expect(sessionOnly.permanent).toBeUndefined()
      yield* sched.remove(sessionOnly.id)

      // Age both past the limit and make them due.
      const old = Date.now() - 3 * 60_000
      yield* writeCronTasks((yield* readCronTasks(dir)).map((task) => ({ ...task, createdAt: old })), dir)
      for (let i = 0; i < 3; i++) yield* sched.tickOnce()
      expect(fired.sort()).toEqual([expire.id, keep.id].sort())
      expect((yield* readCronTasks(dir)).map((task) => task.id)).toEqual([keep.id])
      yield* sched.stop()
    }),
  )
  rmSync(dir, { recursive: true, force: true })
})
