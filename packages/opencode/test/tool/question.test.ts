import { describe, expect } from "bun:test"
import { Effect, Fiber, Layer } from "effect"
import { QuestionTool } from "../../src/tool/question"
import { Question } from "../../src/question"
import { SessionID, MessageID } from "../../src/session/schema"
import { Agent } from "../../src/agent/agent"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Truncate } from "../../src/tool"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const ctx = {
  sessionID: SessionID.make("ses_test-session"),
  interaction: { sessionID: SessionID.make("ses_test-session"), planExit: false },
  messageID: MessageID.make("test-message"),
  callID: "test-call",
  agent: "test-agent",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

const it = testEffect(
  Layer.mergeAll(Question.defaultLayer, CrossSpawnSpawner.defaultLayer, Truncate.defaultLayer, Agent.defaultLayer),
)

const pending = Effect.fn("QuestionToolTest.pending")(function* (question: Question.Interface) {
  for (;;) {
    const items = yield* question.list()
    const item = items[0]
    if (item) return item
    yield* Effect.sleep("10 millis")
  }
})

describe("tool.question", () => {
  it.live("should successfully execute with valid question parameters", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const question = yield* Question.Service
        const toolInfo = yield* QuestionTool
        const tool = yield* toolInfo.init()
        const questions = [
          {
            question: "What is your favorite color?",
            header: "Color",
            options: [
              { label: "Red", description: "The color of passion" },
              { label: "Blue", description: "The color of sky" },
            ],
            multiple: false,
          },
        ]

        const fiber = yield* tool.execute({ questions }, ctx).pipe(Effect.forkScoped)
        const item = yield* pending(question)
        yield* question.reply({ requestID: item.id, answers: [["Red"]] })

        const result = yield* Fiber.join(fiber)
        expect(result.title).toBe("Asked 1 question")
      }),
    ),
  )

  it.live("should now pass with a header longer than 12 but less than 30 chars", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const question = yield* Question.Service
        const toolInfo = yield* QuestionTool
        const tool = yield* toolInfo.init()
        const questions = [
          {
            question: "What is your favorite animal?",
            header: "This Header is Over 12",
            options: [{ label: "Dog", description: "Man's best friend" }],
          },
        ]

        const fiber = yield* tool.execute({ questions }, ctx).pipe(Effect.forkScoped)
        const item = yield* pending(question)
        yield* question.reply({ requestID: item.id, answers: [["Dog"]] })

        const result = yield* Fiber.join(fiber)
        expect(result.output).toContain(`"What is your favorite animal?"="Dog"`)
      }),
    ),
  )

  it.live("should auto-resolve to a [Never-Ask] directive when never-ask is on", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const question = yield* Question.Service
        yield* question.setNeverAsk(true)
        const toolInfo = yield* QuestionTool
        const tool = yield* toolInfo.init()
        const questions = [
          {
            question: "Which approach should I take?",
            header: "Approach",
            options: [
              { label: "A", description: "First" },
              { label: "B", description: "Second" },
            ],
          },
          {
            question: "And the second one?",
            header: "Second",
            options: [{ label: "X", description: "Only" }],
          },
        ]

        // No reply is provided: with never-ask on, execute must return without
        // ever creating a pending question (i.e. it does not block on ask()).
        const result = yield* tool.execute({ questions }, ctx)

        expect(yield* question.list()).toHaveLength(0)
        expect(result.title).toBe("Auto-resolved 2 questions")
        expect(result.output).toContain("[Never-Ask]")
        expect(result.output).toContain("explicitly state which option you chose")
        // One auto-answer per question so the UI shows it instead of "(no answer)".
        expect(result.metadata.answers).toHaveLength(2)
        expect(result.metadata.answers[0]).toEqual(["[Never-Ask] The model will decide autonomously"])
      }),
    ),
  )

  it.live(
    "returns autonomous guidance without an interaction target",
    () =>
      provideTmpdirInstance(() =>
        Effect.gen(function* () {
          const question = yield* Question.Service
          const tool = yield* (yield* QuestionTool).init()
          const result = yield* tool.execute(
            { questions: [{ question: "Choose?", header: "Choice", options: [] }] },
            { ...ctx, interaction: undefined },
          )
          expect(result.output).toContain("[Never-Ask]")
          expect(yield* question.list()).toEqual([])
        }),
      ),
    2000,
  )

  it.live("routes interactive peer questions to the parent while preserving the original tool reference", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const question = yield* Question.Service
        const tool = yield* (yield* QuestionTool).init()
        const fiber = yield* tool
          .execute(
            { questions: [{ question: "Choose?", header: "Choice", options: [] }] },
            { ...ctx, callID: "exec:2", interaction: { sessionID: SessionID.make("ses_parent"), planExit: false } },
          )
          .pipe(Effect.forkScoped)
        const item = yield* pending(question)
        expect(item.sessionID).toBe(SessionID.make("ses_parent"))
        expect(item.tool).toEqual({ messageID: ctx.messageID, callID: "exec:2" })
        yield* question.reply({ requestID: item.id, answers: [["Choice"]] })
        expect((yield* Fiber.join(fiber)).metadata.answers).toEqual([["Choice"]])
      }),
    ),
  )

  it.live("cancels an interactive question through the tool AbortSignal", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const question = yield* Question.Service
        const tool = yield* (yield* QuestionTool).init()
        const controller = new AbortController()
        const fiber = yield* tool
          .execute(
            { questions: [{ question: "Choose?", header: "Choice", options: [] }] },
            { ...ctx, abort: controller.signal },
          )
          .pipe(Effect.forkScoped)
        yield* pending(question)
        controller.abort()
        expect((yield* Fiber.await(fiber))._tag).toBe("Failure")
        expect(yield* question.list()).toEqual([])
      }),
    ),
  )

  // intentionally removed the zod validation due to tool call errors, hoping prompting is gonna be good enough
  //   test("should throw an Error for header exceeding 30 characters", async () => {
  //     const tool = await QuestionTool.init()
  //     const questions = [
  //       {
  //         question: "What is your favorite animal?",
  //         header: "This Header is Definitely More Than Thirty Characters Long",
  //         options: [{ label: "Dog", description: "Man's best friend" }],
  //       },
  //     ]
  //     try {
  //       await tool.execute({ questions }, ctx)
  //       // If it reaches here, the test should fail
  //       expect(true).toBe(false)
  //     } catch (e: any) {
  //       expect(e).toBeInstanceOf(Error)
  //       expect(e.cause).toBeInstanceOf(z.ZodError)
  //     }
  //   })

  //   test("should throw an Error for label exceeding 30 characters", async () => {
  //     const tool = await QuestionTool.init()
  //     const questions = [
  //       {
  //         question: "A question with a very long label",
  //         header: "Long Label",
  //         options: [
  //           { label: "This is a very, very, very long label that will exceed the limit", description: "A description" },
  //         ],
  //       },
  //     ]
  //     try {
  //       await tool.execute({ questions }, ctx)
  //       // If it reaches here, the test should fail
  //       expect(true).toBe(false)
  //     } catch (e: any) {
  //       expect(e).toBeInstanceOf(Error)
  //       expect(e.cause).toBeInstanceOf(z.ZodError)
  //     }
  //   })
})
