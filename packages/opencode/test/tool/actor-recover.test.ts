import { describe, test, expect } from "bun:test"
import { recoverActorArgs } from "../../src/tool/actor"

describe("recoverActorArgs", () => {
  test("bare Task-prior fields → run operation", () => {
    expect(recoverActorArgs({ subagent_type: "explore", description: "d", prompt: "p" })).toEqual({
      operation: { action: "run", subagent_type: "explore", description: "d", prompt: "p" },
    })
  })

  test("explicit action:spawn is honored", () => {
    expect(recoverActorArgs({ action: "spawn", subagent_type: "general", description: "d", prompt: "p" })).toEqual({
      operation: { action: "spawn", subagent_type: "general", description: "d", prompt: "p" },
    })
  })

  test("background:true infers spawn", () => {
    const r = recoverActorArgs({ subagent_type: "general", description: "d", prompt: "p", background: true }) as any
    expect(r.operation.action).toBe("spawn")
  })

  test("optional model/task_id carried; junk dropped", () => {
    expect(
      recoverActorArgs({ subagent_type: "explore", description: "d", prompt: "p", model: "lite", task_id: "T4", junk: 1 }),
    ).toEqual({ operation: { action: "run", subagent_type: "explore", description: "d", prompt: "p", model: "lite", task_id: "T4" } })
  })

  // spawn/run have no resume argument. Recovery must NOT quietly drop a top-level
  // actor_id: that would lift the call into a valid spawn and hand back a fresh,
  // empty subagent — the silent failure removing the argument exists to end.
  // Carrying it through means the strict schema rejects the call instead.
  test("top-level actor_id is carried through so the schema can reject it", () => {
    const recovered = recoverActorArgs({
      subagent_type: "explore",
      description: "d",
      prompt: "p",
      actor_id: "explore-1",
    }) as { operation: Record<string, unknown> }
    expect(recovered.operation.actor_id).toBe("explore-1")
  })

  test("explicit context and lifecycle survive recovery for schema validation", () => {
    const base = { action: "spawn" as const, subagent_type: "general", description: "d", prompt: "p" }
    for (const extra of [{ context: "full" }, { context: null }, { context: false }, { lifecycle: "persistent" }, { lifecycle: null }]) {
      for (const raw of [base, { operation: base }, { operation: JSON.stringify(base) }]) {
        expect(recoverActorArgs({ ...raw, ...extra }) as unknown).toEqual({ operation: { ...base, ...extra } })
      }
    }
  })

  test("conflicting recovered envelope fields stay visible for strict rejection", () => {
    const operation = { action: "spawn", subagent_type: "general", description: "d", prompt: "p", context: "full" }
    for (const raw of [{ operation, context: "none" }, { operation: JSON.stringify(operation), context: "none" }]) {
      expect(recoverActorArgs(raw) as unknown).toEqual({ operation, context: "none" })
    }
  })

  test("stringified operation envelope → parsed nested object", () => {
    expect(recoverActorArgs({ operation: '{"action":"run","subagent_type":"explore","description":"d","prompt":"p"}' })).toEqual({
      operation: { action: "run", subagent_type: "explore", description: "d", prompt: "p" },
    })
  })

  test("already-nested operation → passthrough", () => {
    const op = { operation: { action: "run", subagent_type: "explore", description: "d", prompt: "p" } } as const
    expect(recoverActorArgs(op)).toEqual(op)
  })

  test("garbage / incomplete / non-object → undefined", () => {
    expect(recoverActorArgs({ foo: 1 })).toBeUndefined()
    expect(recoverActorArgs({ description: "d" })).toBeUndefined() // missing prompt+subagent_type
    expect(recoverActorArgs(null)).toBeUndefined()
    expect(recoverActorArgs("nope")).toBeUndefined()
  })

  test("array operation (object/string) is not mistaken for an envelope → undefined", () => {
    expect(recoverActorArgs({ operation: [1, 2, 3] })).toBeUndefined()
    expect(recoverActorArgs({ operation: "[1,2,3]" })).toBeUndefined()
  })
})
