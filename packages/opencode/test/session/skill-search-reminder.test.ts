import { describe, expect, test } from "bun:test"
import {
  skillSearchReminder,
  skillSearchReminderForMessages,
  skillSearchReminderForSession,
} from "../../src/session/skill-search-reminder"

describe("skillSearchReminder", () => {
  test("prompts skill search on the first user query", () => {
    const reminder = skillSearchReminder({ currentUserAt: 1_000 })

    expect(reminder).toContain("<system-reminder>")
    expect(reminder).toContain("first user query")
    expect(reminder).toContain("should call skill_search")
    expect(reminder).toContain("CSV as inputs")
    expect(reminder).toContain("Office examples")
    expect(reminder).toContain("Excel/CSV")
    expect(reminder).toContain("PowerPoint/PPT")
    expect(reminder).toContain("Word/DOCX")
    expect(reminder).toContain("PDF")
    expect(reminder).toContain("Code examples")
    expect(reminder).toContain("code review")
    expect(reminder).toContain("debugging")
    expect(reminder).not.toContain("MUST")
  })

  test("describes semantic-change triggers for later queries", () => {
    const reminder = skillSearchReminder({ previousUserAt: 1_000, currentUserAt: 2_000 })

    expect(reminder).toContain("do not call skill_search")
    expect(reminder).toContain("continuation, modification, or retry")
    expect(reminder).toContain("output type")
    expect(reminder).toContain("primary action")
    expect(reminder).toContain("business object")
    expect(reminder).toContain("required capability")
  })

  test("defaults to search after two hours unless the current work is explicitly referenced", () => {
    const reminder = skillSearchReminder({ previousUserAt: 1_000, currentUserAt: 7_201_001 })

    expect(reminder).toContain("more than 2 hours")
    expect(reminder).toContain("default: call skill_search")
    expect(reminder).not.toContain("MUST")
    expect(reminder).toContain("unless the user explicitly references the current task or current artifact")
  })

  test("injects only before the current user query has an assistant response", () => {
    const user = {
      info: { role: "user", id: "user-1", time: { created: 1_000 } },
      parts: [{ type: "text", text: "Build a report" }],
    }

    expect(skillSearchReminderForMessages([user])).toContain("first user query")
    expect(
      skillSearchReminderForMessages([
        user,
        {
          info: { role: "assistant", id: "assistant-1", parentID: "user-1", time: { created: 2_000 } },
          parts: [],
        },
      ]),
    ).toBeUndefined()
  })

  test("injects into direct primary sessions but not Compose, subagent, or child sessions", () => {
    const messages = [
      {
        info: { role: "user", id: "user-1", time: { created: 1_000 } },
        parts: [{ type: "text", text: "Analyze a CSV" }],
      },
    ]

    expect(
      skillSearchReminderForSession({ session: {}, agent: { name: "build", mode: "primary" }, messages }),
    ).toContain("first user query")
    expect(
      skillSearchReminderForSession({ session: {}, agent: { name: "compose", mode: "primary" }, messages }),
    ).toBeUndefined()
    expect(
      skillSearchReminderForSession({ session: {}, agent: { name: "explore", mode: "subagent" }, messages }),
    ).toBeUndefined()
    expect(
      skillSearchReminderForSession({
        session: { parentID: "parent" },
        agent: { name: "build", mode: "primary" },
        messages,
      }),
    ).toBeUndefined()
    expect(
      skillSearchReminderForSession({
        session: {},
        agent: { name: "build", mode: "primary" },
        messages: [
          {
            info: { role: "user", id: "user-actor", agentID: "actor-1", time: { created: 1_000 } },
            parts: [{ type: "text", text: "Analyze a CSV" }],
          },
        ],
      }),
    ).toBeUndefined()
  })

  test("treats a persisted main-slice user row as a direct user query", () => {
    expect(
      skillSearchReminderForSession({
        session: {},
        agent: { name: "build", mode: "primary" },
        messages: [
          {
            info: {
              role: "user",
              id: "persisted-user",
              agentID: "main",
              source: "user",
              time: { created: 1_000 },
            },
            parts: [{ type: "text", text: "Analyze a CSV" }],
          },
        ],
      }),
    ).toContain("first user query")
  })

  test("does not treat a legacy synthetic cron row without source as a direct user query", () => {
    expect(
      skillSearchReminderForSession({
        session: {},
        agent: { name: "build", mode: "primary" },
        messages: [
          {
            info: { role: "user", id: "legacy-cron", agentID: "main", time: { created: 1_000 } },
            parts: [
              {
                type: "text",
                text: "Run /restricted-skill",
                synthetic: true,
                metadata: { origin: { kind: "cron", taskId: "task-1", kindOfTask: "cron" } },
              },
            ],
          },
        ],
      }),
    ).toBeUndefined()
  })

  test("does not treat legacy compaction or checkpoint boundaries as direct user queries", () => {
    for (const type of ["compaction", "checkpoint"]) {
      expect(
        skillSearchReminderForSession({
          session: {},
          agent: { name: "build", mode: "primary" },
          messages: [
            {
              info: { role: "user", id: `legacy-${type}`, agentID: "main", time: { created: 1_000 } },
              parts: [{ type }],
            },
          ],
        }),
      ).toBeUndefined()
    }
  })

  test("hook provenance wins over an inconsistent explicit user source", () => {
    expect(
      skillSearchReminderForSession({
        session: {},
        agent: { name: "build", mode: "primary" },
        messages: [
          {
            info: {
              role: "user",
              id: "inconsistent-hook",
              agentID: "main",
              source: "user",
              provenance: { hookPhase: "pre" },
              time: { created: 1_000 },
            },
            parts: [{ type: "text", text: "Run /restricted-skill" }],
          },
        ],
      }),
    ).toBeUndefined()
  })

  test("ignores hook rows when locating the previous direct user query", () => {
    expect(
      skillSearchReminderForMessages([
        {
          info: { role: "user", id: "hook", source: "hook", time: { created: 1_000 } },
          parts: [{ type: "text", text: "Automated hook" }],
        },
        {
          info: { role: "user", id: "user", agentID: "main", source: "user", time: { created: 2_000 } },
          parts: [{ type: "text", text: "Analyze a CSV" }],
        },
      ]),
    ).toContain("first user query")
  })

  test("does not inject when skill search is disabled by permission, allowlist, or message tools", () => {
    const messages = [
      {
        info: { role: "user", id: "user-1", time: { created: 1_000 } },
        parts: [{ type: "text", text: "Analyze a CSV" }],
      },
    ]
    const session = {}
    const agent = { name: "build", mode: "primary" as const }

    expect(
      skillSearchReminderForSession({
        session,
        agent,
        messages,
        permission: [{ permission: "skill", pattern: "*", action: "deny" }],
      }),
    ).toBeUndefined()
    expect(
      skillSearchReminderForSession({
        session,
        agent: { ...agent, toolAllowlist: ["read"] },
        messages,
        permission: [],
      }),
    ).toBeUndefined()
    expect(
      skillSearchReminderForSession({
        session,
        agent,
        messages,
        permission: [],
        tools: { skill_search: false },
      }),
    ).toBeUndefined()
  })
})
