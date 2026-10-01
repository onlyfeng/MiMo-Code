import { describe, expect, test } from "bun:test"
import { CURRENT_SESSION_ID_PLACEHOLDER, resolveCurrentSessionPath } from "../../src/session/memory-path-template"
import { SessionID } from "../../src/session/schema"

describe("memory path template", () => {
  test("resolves every current-session placeholder at the tool boundary", () => {
    const sid = SessionID.make("ses_cache_stable")
    const template = `/data/memory/sessions/${CURRENT_SESSION_ID_PLACEHOLDER}/tasks/T1/${CURRENT_SESSION_ID_PLACEHOLDER}.md`
    expect(resolveCurrentSessionPath(template, sid)).toBe(
      "/data/memory/sessions/ses_cache_stable/tasks/T1/ses_cache_stable.md",
    )
  })

  test("leaves ordinary paths byte-identical", () => {
    expect(resolveCurrentSessionPath("/workspace/report.md", SessionID.make("ses_x"))).toBe("/workspace/report.md")
  })
})
