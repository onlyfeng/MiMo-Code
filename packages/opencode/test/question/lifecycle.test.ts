import { expect } from "bun:test"
import { getEventListeners } from "node:events"
import { Effect, Fiber, Layer, Deferred } from "effect"
import { Bus } from "../../src/bus"
import { Question } from "../../src/question"
import { SessionID } from "../../src/session/schema"
import { provideTmpdirInstance } from "../fixture/fixture"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { testEffect } from "../lib/effect"

const input = {
  sessionID: SessionID.make("ses_lifecycle"),
  questions: [{ question: "Continue?", header: "Choice", options: [{ label: "Yes", description: "Continue" }] }],
}
const it = testEffect(Layer.mergeAll(Question.defaultLayer, Bus.defaultLayer, CrossSpawnSpawner.defaultLayer))

for (const end of ["reply", "reject", "interrupt", "abort"] as const) {
  it.live(
    `question lifecycle ${end} emits exactly one terminal event and clears pending`,
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const question = yield* Question.Service
          const bus = yield* Bus.Service
          const events: string[] = []
          const asked = yield* Deferred.make<Question.Request>()
          const terminal = yield* Deferred.make<void>()
          const off = yield* bus.subscribeAllCallback((event) => {
            if (!event.type.startsWith("question.")) return
            events.push(event.type)
            if (event.type === "question.asked") Effect.runSync(Deferred.succeed(asked, event.properties))
            else Effect.runSync(Deferred.succeed(terminal, undefined))
          })
          yield* Effect.addFinalizer(() => Effect.sync(off))
          const controller = new AbortController()
          const fiber = yield* question.ask(input, controller.signal).pipe(Effect.forkScoped)
          const item = yield* Deferred.await(asked)
          expect(yield* question.list()).toHaveLength(1)
          if (end === "reply") yield* question.reply({ requestID: item.id, answers: [["Yes"]] })
          if (end === "reject") yield* question.reject(item.id)
          if (end === "abort") controller.abort()
          if (end === "interrupt") yield* Fiber.interrupt(fiber)
          const result = yield* Fiber.await(fiber)
          expect(getEventListeners(controller.signal, "abort")).toHaveLength(0)
          expect(result._tag).toBe(end === "reply" ? "Success" : "Failure")
          yield* Deferred.await(terminal)
          yield* question.reject(item.id)
          yield* question.reply({ requestID: item.id, answers: [["Late"]] })
          expect(yield* question.list()).toEqual([])
          expect(events).toEqual(["question.asked", end === "reply" ? "question.replied" : "question.rejected"])
        }),
      ),
    2000,
  )
}

for (const end of ["interrupt", "abort", "defect"] as const) {
  it.live(
    `question lifecycle ${end} during Asked publication releases registration`,
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const bus = yield* Bus.Service
          const controller = new AbortController()
          const published = yield* Deferred.make<void>()
          const events: string[] = []
          const terminal = yield* Deferred.make<void>()
          const off = yield* bus.subscribeAllCallback((event) => {
            if (!event.type.startsWith("question.")) return
            events.push(event.type)
            if (event.type === "question.rejected") Effect.runSync(Deferred.succeed(terminal, undefined))
          })
          yield* Effect.addFinalizer(() => Effect.sync(off))
          // Preserve actual event delivery and pause only the publisher's return.
          const delayed = {
            ...bus,
            publish: ((def, properties) =>
              bus
                .publish(def, properties)
                .pipe(
                  Effect.andThen(
                    def.type === "question.asked"
                      ? Deferred.succeed(published, undefined).pipe(
                          Effect.andThen(end === "defect" ? Effect.die("publisher failed") : Effect.never),
                        )
                      : Effect.void,
                  ),
                )) satisfies Bus.Interface["publish"],
          }
          yield* Effect.gen(function* () {
            const question = yield* Question.Service
            const fiber = yield* question.ask(input, controller.signal).pipe(Effect.forkScoped)
            yield* Deferred.await(published)
            if (end === "interrupt") yield* Fiber.interrupt(fiber)
            if (end === "abort") controller.abort()
            expect((yield* Fiber.await(fiber))._tag).toBe("Failure")
            expect(yield* question.list()).toEqual([])
            yield* Deferred.await(terminal)
            expect(events).toEqual(["question.asked", "question.rejected"])
          }).pipe(Effect.provide(Layer.fresh(Question.layer).pipe(Layer.provide(Layer.succeed(Bus.Service, delayed)))))
        }),
      ),
    2000,
  )
}

it.live("already aborted questions never publish or register", () =>
  provideTmpdirInstance(() =>
    Effect.gen(function* () {
      const question = yield* Question.Service
      const bus = yield* Bus.Service
      const events: string[] = []
      const off = yield* bus.subscribeAllCallback((event) => {
        events.push(event.type)
      })
      yield* Effect.addFinalizer(() => Effect.sync(off))
      const result = yield* question.ask(input, AbortSignal.abort()).pipe(Effect.exit)
      expect(result._tag).toBe("Failure")
      expect(yield* question.list()).toEqual([])
      yield* Effect.yieldNow
      expect(events).toEqual([])
    }),
  ),
)
