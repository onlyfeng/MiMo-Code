import { describe, test, expect } from "bun:test"
import { Effect, Layer, ManagedRuntime } from "effect"
import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { Agent } from "../../src/agent/agent"
import { Truncate } from "../../src/tool"
import { CronTool } from "../../src/tool/cron"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { defaultLayer as SchedulerDefaultLayer } from "../../src/cron/scheduler"
import { SessionID, MessageID } from "../../src/session/schema"
import { provideInstance, provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import z from "zod"
import type { JSONSchema7, JSONSchema7Definition } from "@ai-sdk/provider"
import { schema as transformSchema } from "../../src/provider/transform"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { ProviderTest } from "../fake/provider"

const runtime = ManagedRuntime.make(
  Layer.mergeAll(Truncate.defaultLayer, Agent.defaultLayer, SchedulerDefaultLayer),
)
const it = testEffect(
  Layer.mergeAll(CrossSpawnSpawner.defaultLayer, Truncate.defaultLayer, Agent.defaultLayer, SchedulerDefaultLayer),
)

describe("cron.execute: schedule sanity warnings", () => {
  const runSchedule = async (input: {
    cron: string
    prompt: string
    one_shot?: boolean
    durable?: boolean
    permanent?: boolean
  }) => {
    const info = await runtime.runPromise(CronTool)
    const def = await runtime.runPromise(info.init())
    const instanceDir = mkdtempSync(join(tmpdir(), "cron-warn-"))
    try {
      const eff = def.execute(
        { operation: { action: "schedule", ...input } },
        {
          sessionID: "ses_warn_test" as any,
          messageID: "msg_warn_test" as any,
          agent: "build",
          abort: new AbortController().signal,
          extra: {},
          messages: [],
          metadata: () => Effect.void,
          ask: () => Effect.void,
        },
      )
      return await runtime.runPromise(provideInstance(instanceDir)(eff as Effect.Effect<any>))
    } finally {
      rmSync(instanceDir, { recursive: true, force: true })
    }
  }

  // FC-034: permanent lifts the age limit of a durable recurring job only.
  test.each([
    { name: "session-only", input: { permanent: true } },
    { name: "one-shot", input: { permanent: true, durable: true, one_shot: true } },
  ])("permanent on a $name job is refused", async ({ input }) => {
    const refused = await runSchedule({ cron: "*/5 * * * *", prompt: "x", ...input }).then(
      () => undefined,
      (error: unknown) => (error instanceof Error ? error.message : String(error)),
    )
    expect(refused).toContain("permanent applies only to a durable recurring job")
  })

  test("Feb 30 (never matches) emits a warning even for recurring", async () => {
    const out = await runSchedule({ cron: "0 0 30 2 *", prompt: "impossible" })
    expect(out.output).toMatch(/never matches within a year/)
    expect(out.output).toContain("Feb 30")
  })

  test("one-shot with a next fire > 30 days away emits the rolled-forward warning", async () => {
    // A one-shot 300 days out will trip the > 30d guard regardless of the
    // current wall-clock date. Use a leap-day-of-week combo that pins it.
    // Simpler: a specific date roughly a year out (`0 0 1 1 *` one-shot).
    // On any day of any year, the next Jan 1 midnight is ≤ 1 year away; on
    // Jan 2..Dec 31 it's > 30 days.
    // Skip only if today is Dec 3..Dec 31 (next Jan 1 is < 30 days).
    const today = new Date()
    const nextJan1 = new Date(Date.UTC(today.getUTCFullYear() + (today.getUTCMonth() === 0 && today.getUTCDate() === 1 ? 0 : 1), 0, 1))
    const daysUntil = (nextJan1.getTime() - today.getTime()) / 86_400_000
    if (daysUntil <= 30) return // skip on late December

    const out = await runSchedule({ cron: "0 0 1 1 *", prompt: "ny resolution", one_shot: true })
    expect(out.output).toMatch(/rolled this one-shot to the next matching window/)
  })

  test("recurring yearly (0 0 1 1 *) does NOT trip the warning", async () => {
    // Same expression as above but WITHOUT --one-shot. The user genuinely
    // wants "every Jan 1 at midnight" and next-fire being far away is
    // exactly the point.
    const out = await runSchedule({ cron: "0 0 1 1 *", prompt: "yearly review" })
    expect(out.output).not.toMatch(/rolled this one-shot/)
    expect(out.output).not.toMatch(/never matches/)
  })

  test("recurring 5-minute cron does not warn", async () => {
    const out = await runSchedule({ cron: "*/5 * * * *", prompt: "poll" })
    expect(out.output).not.toMatch(/rolled|never matches/)
  })
})

describe("cron schema: nested operation union for grok (FC-025)", () => {
  const node = (schema: JSONSchema7Definition | undefined): JSONSchema7 => {
    if (typeof schema !== "object") throw new Error("expected an object schema")
    return schema
  }
  const operation = (id: string) =>
    Effect.gen(function* () {
      const info = yield* CronTool
      const def = yield* info.init()
      const model = ProviderTest.model({ id: ModelID.make(id), providerID: ProviderID.make("test") })
      const wire = transformSchema(model, z.toJSONSchema(def.parameters) as JSONSchema7)
      return { def, op: node(wire.properties?.operation) }
    })

  it.live("grok gets operation as one flat object with an action enum", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const { def, op } = yield* operation("grok-4.7")
        expect(op.anyOf ?? op.oneOf).toBeUndefined()
        expect(op.type).toBe("object")
        expect(op.required).toEqual(["action"])
        expect(node(op.properties?.action).enum).toEqual(["schedule", "loop", "list", "get", "delete", "rename"])
        expect(node(op.properties?.cron).description).toContain('only when action="schedule"')
        // What grok sends against the flat schema is still the nested shape zod parses.
        expect(def.parameters.safeParse({ operation: { action: "list" } }).success).toBe(true)
        expect(def.parameters.safeParse({ operation: {} }).success).toBe(false)
      }),
    ),
  )

  it.live("other models keep the nested union", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const { op } = yield* operation("test-model")
        expect((op.anyOf ?? op.oneOf)?.length).toBe(6)
      }),
    ),
  )
})

describe("cron.execute: stringified operation envelope", () => {
  // Some models send `operation` as its JSON text instead of a nested object.
  const runStringified = (operation: Record<string, unknown>) =>
    Effect.gen(function* () {
      const info = yield* CronTool
      const def = yield* info.init()
      return yield* def.execute({ operation: JSON.stringify(operation) } as unknown as Parameters<typeof def.execute>[0], {
        sessionID: SessionID.make("ses_stringified_test"),
        messageID: MessageID.make(""),
        callID: "",
        agent: "build",
        abort: AbortSignal.any([]),
        messages: [],
        metadata: () => Effect.void,
        ask: () => Effect.void,
      })
    })

  it.live("list runs instead of failing validation", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const out = yield* runStringified({ action: "list" })
        expect(out.output).toBe("No scheduled jobs.")
      }),
    ),
  )

  it.live("schedule registers the job", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const out = yield* runStringified({ action: "schedule", cron: "8-59/20 * * * *", prompt: "patrol" })
        expect(out.output).toMatch(/^Scheduled \S+ \(8-59\/20 \* \* \* \*, recurring\): patrol/)
      }),
    ),
  )
})
