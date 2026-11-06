import { describe, expect } from "bun:test"
import { Deferred, Effect, Fiber, Layer } from "effect"
import { Bus } from "../../src/bus"
import { Storage } from "../../src/storage"
import { Snapshot } from "../../src/snapshot"
import { Session as SessionNs } from "../../src/session"
import { SessionSummary } from "../../src/session/summary"
import { MessageID, PartID, type SessionID } from "../../src/session/schema"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { Log } from "../../src/util"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"

void Log.init({ print: false })

const ref = { providerID: ProviderID.make("test"), modelID: ModelID.make("test-model") }
const zero = { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }

// The stub answers each diffFull with one row naming the range it was asked
// for, so a stored summary shows which anchors produced it. A test may hold
// diffFull open on a gate to watch how summaries overlap.
const calls: Array<{ from: string; to: string }> = []
let active = 0
let peak = 0
let gate: Deferred.Deferred<void> | undefined
let entered: Deferred.Deferred<void> | undefined

const snapshotStub = Layer.succeed(
  Snapshot.Service,
  Snapshot.Service.of({
    init: () => Effect.void,
    cleanup: () => Effect.void,
    track: () => Effect.succeed(undefined),
    patch: () => Effect.succeed({ hash: "", files: [] }),
    restore: () => Effect.void,
    revert: () => Effect.void,
    diff: () => Effect.succeed(""),
    diffFull: (from, to) =>
      Effect.gen(function* () {
        calls.push({ from, to })
        active++
        peak = Math.max(peak, active)
        if (entered) yield* Deferred.succeed(entered, undefined)
        if (gate) yield* Deferred.await(gate)
        active--
        return [{ file: `${from}..${to}`, patch: "", additions: 1, deletions: 0 }]
      }),
  }),
)

const env = Layer.mergeAll(
  SessionNs.defaultLayer,
  CrossSpawnSpawner.defaultLayer,
  SessionSummary.layer.pipe(
    Layer.provide(SessionNs.defaultLayer),
    Layer.provide(snapshotStub),
    Layer.provide(Storage.defaultLayer),
    Layer.provide(Bus.layer),
  ),
)

const it = testEffect(env)

const reset = () => {
  calls.length = 0
  active = 0
  peak = 0
  gate = undefined
  entered = undefined
}

// A turn: one user message answered by assistants whose steps carry the given
// snapshots. `undefined` is a step recorded with snapshots disabled.
const seedTurn = Effect.fnUntraced(function* (
  sessionID: SessionID,
  clock: { now: number },
  steps: Array<Array<{ start?: string; finish?: string }>>,
  agentID = "main",
) {
  const ssn = yield* SessionNs.Service
  const userID = MessageID.ascending()
  yield* ssn.updateMessage({
    id: userID,
    role: "user" as const,
    sessionID,
    agentID,
    agent: "build",
    model: ref,
    time: { created: clock.now++ },
  })
  yield* ssn.updatePart({ id: PartID.ascending(), messageID: userID, sessionID, type: "text", text: "go" })
  for (const assistant of steps) {
    const id = MessageID.ascending()
    yield* ssn.updateMessage({
      id,
      role: "assistant" as const,
      sessionID,
      agentID,
      agent: "build",
      mode: "primary",
      modelID: ref.modelID,
      providerID: ref.providerID,
      parentID: userID,
      time: { created: clock.now++, completed: clock.now++ },
      finish: "end_turn",
      tokens: zero,
      path: { cwd: "/", root: "/" },
      cost: 0,
    })
    for (const step of assistant) {
      yield* ssn.updatePart({ id: PartID.ascending(), messageID: id, sessionID, type: "step-start", snapshot: step.start })
      yield* ssn.updatePart({
        id: PartID.ascending(),
        messageID: id,
        sessionID,
        type: "step-finish",
        reason: "stop",
        cost: 0,
        tokens: zero,
        snapshot: step.finish,
      })
    }
  }
  return userID
})

const turnDiffs = Effect.fnUntraced(function* (sessionID: SessionID, userID: MessageID) {
  const ssn = yield* SessionNs.Service
  const all = yield* ssn.messages({ sessionID, agentID: "main" })
  const user = all.find((item) => item.info.id === userID)?.info
  return user?.role === "user" ? user.summary?.diffs?.map((item) => item.file) : undefined
})

describe("SessionSummary.summarize anchors and overlap", () => {
  it.live(
    "the session diff spans the main slice and the turn diff spans that turn's answers",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        reset()
        const ssn = yield* SessionNs.Service
        const summary = yield* SessionSummary.Service
        const info = yield* ssn.create({})
        const clock = { now: Date.now() }

        yield* seedTurn(info.id, clock, [[{ start: "t1-s1", finish: "t1-f1" }]])
        const second = yield* seedTurn(info.id, clock, [
          [{ start: undefined, finish: undefined }, { start: "t2-s1", finish: "t2-f1" }],
          [{ start: "t2-s2", finish: "t2-f2" }, { start: "t2-s3", finish: undefined }],
        ])
        // A later turn bounds the session diff but not the second turn's.
        yield* seedTurn(info.id, clock, [[{ start: "t3-s1", finish: "t3-f1" }]])
        // A lane on the same session answers last; it bounds neither diff.
        yield* seedTurn(info.id, clock, [[{ start: "lane-s", finish: "lane-f" }]], "explore-1")

        yield* summary.summarize({ sessionID: info.id, messageID: second })

        expect(calls).toEqual([
          { from: "t1-s1", to: "t3-f1" },
          { from: "t2-s1", to: "t2-f2" },
        ])
        expect(yield* turnDiffs(info.id, second)).toEqual(["t2-s1..t2-f2"])
        expect((yield* ssn.get(info.id)).summary?.files).toBe(1)
      }),
    ),
  )

  it.live(
    "a turn without a snapshot on both ends gets an empty diff",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        reset()
        const ssn = yield* SessionNs.Service
        const summary = yield* SessionSummary.Service
        const info = yield* ssn.create({})
        const clock = { now: Date.now() }

        yield* seedTurn(info.id, clock, [[{ start: "t1-s1", finish: "t1-f1" }]])
        const second = yield* seedTurn(info.id, clock, [[{ start: "t2-s1", finish: undefined }]])

        yield* summary.summarize({ sessionID: info.id, messageID: second })

        expect(calls).toEqual([{ from: "t1-s1", to: "t1-f1" }])
        expect(yield* turnDiffs(info.id, second)).toEqual([])
      }),
    ),
  )

  it.live(
    "summaries of one session run one at a time and a request made meanwhile still lands",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        reset()
        const ssn = yield* SessionNs.Service
        const summary = yield* SessionSummary.Service
        const info = yield* ssn.create({})
        const clock = { now: Date.now() }

        const first = yield* seedTurn(info.id, clock, [[{ start: "t1-s1", finish: "t1-f1" }]])
        const second = yield* seedTurn(info.id, clock, [[{ start: "t2-s1", finish: "t2-f1" }]])

        gate = yield* Deferred.make<void>()
        entered = yield* Deferred.make<void>()
        const running = yield* summary.summarize({ sessionID: info.id, messageID: first }).pipe(Effect.forkChild)
        yield* Deferred.await(entered)

        // Two more step finishes while the first summary is still diffing. They
        // are forked as the processor forks them; neither may start a diff.
        const later = yield* Effect.all(
          [
            summary.summarize({ sessionID: info.id, messageID: second }).pipe(Effect.forkChild),
            summary.summarize({ sessionID: info.id, messageID: second }).pipe(Effect.forkChild),
          ],
        )
        // Room for a request that does start a diff to reach the stub.
        yield* Effect.sleep("100 millis")
        expect(calls).toHaveLength(1)

        yield* Deferred.succeed(gate, undefined)
        yield* Fiber.join(running)
        yield* Effect.forEach(later, Fiber.join)

        expect(peak).toBe(1)
        // First pass: session + first turn. One more pass for both requests.
        expect(calls).toEqual([
          { from: "t1-s1", to: "t2-f1" },
          { from: "t1-s1", to: "t1-f1" },
          { from: "t1-s1", to: "t2-f1" },
          { from: "t2-s1", to: "t2-f1" },
        ])
        expect(yield* turnDiffs(info.id, first)).toEqual(["t1-s1..t1-f1"])
        expect(yield* turnDiffs(info.id, second)).toEqual(["t2-s1..t2-f1"])

        // The slot is free again: a later summary runs on its own.
        gate = undefined
        calls.length = 0
        yield* summary.summarize({ sessionID: info.id, messageID: second })
        expect(calls).toHaveLength(2)
      }),
    ),
  )
})
