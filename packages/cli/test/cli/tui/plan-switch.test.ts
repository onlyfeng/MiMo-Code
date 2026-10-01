import { describe, expect, test } from "bun:test"
import type { ToolPart } from "../../../src/session/message-v2"
import { planSwitchTarget } from "../../../src/cli/cmd/tui/routes/session/plan-switch"

function completed(tool: string, switched?: boolean) {
  return {
    tool,
    state: {
      status: "completed",
      input: {},
      output: "",
      title: "",
      metadata: switched === undefined ? {} : { switched },
      time: { start: 0, end: 1 },
    },
  } satisfies Pick<ToolPart, "tool" | "state">
}

describe("planSwitchTarget", () => {
  test("direct committed approval survives interruption before completion", () => {
    expect(planSwitchTarget({
      tool: "plan_exit", sessionID: "ses_plan", callID: "call_plan",
      state: { status: "error", input: {}, error: "interrupted", time: { start: 0, end: 1 }, metadata: {
        plan_exit: { version: 1, sessionID: "ses_plan", callID: "call_plan", messageID: "msg_build", agent: "build" },
      } },
    })).toBe("build")
  })
  for (const status of ["running", "completed", "error"] as const) {
    test(`recognizes a committed nested receipt in ${status} state without subparts`, () => {
      const part = {
        ...completed("exec"), sessionID: "ses_plan", callID: "call_exec",
        state: { ...completed("exec").state, status, error: "post-commit hook failed", metadata: {
          sub_parts: [], sub_parts_truncated: true,
          plan_exit: { version: 1, sessionID: "ses_plan", callID: "call_exec:1", messageID: "msg_build", agent: "build" },
        } },
      }
      expect(planSwitchTarget(part)).toBe("build")
    })
  }
  test("rejects malformed, foreign, and uncommitted nested receipts", () => {
    const receipt = { version: 1, sessionID: "ses_plan", callID: "call_exec:1", messageID: "msg_build", agent: "build" }
    for (const invalid of [undefined, true, {}, { ...receipt, version: 2 }, { ...receipt, agent: "plan" },
      { ...receipt, sessionID: "ses_other" }, { ...receipt, callID: "other:1" },
      { ...receipt, callID: "call_exec:0" }, { ...receipt, messageID: "" }]) {
      expect(planSwitchTarget({ ...completed("exec"), sessionID: "ses_plan", callID: "call_exec",
        state: { ...completed("exec").state, metadata: { switched: true, plan_exit: invalid } },
      })).toBeUndefined()
    }
  })
  test("switches only when plan_exit reports success", () => {
    expect(planSwitchTarget(completed("plan_exit", true))).toBe("build")
  })

  test("does not switch when plan exit is declined", () => {
    expect(planSwitchTarget(completed("plan_exit", false))).toBeUndefined()
  })

  test("does not switch without explicit switched metadata", () => {
    expect(planSwitchTarget(completed("plan_exit"))).toBeUndefined()
  })

  test("ignores unfinished and unrelated tools", () => {
    expect(
      planSwitchTarget({
        tool: "plan_exit",
        state: { status: "running", input: {}, metadata: { switched: true }, time: { start: 0 } },
      }),
    ).toBeUndefined()
    expect(planSwitchTarget(completed("plan_enter", true))).toBeUndefined()
    expect(planSwitchTarget(completed("question", true))).toBeUndefined()
  })
})
