import { describe, expect, test } from "bun:test"
import {
  skillSearchReminder,
  skillSearchReminderForMessages,
  skillSearchReminderForSession,
} from "../../src/session/skill-search-reminder"
import { Flag } from "../../src/flag/flag"

const model = { id: "mimo-v2", name: "MiMo V2", api: { id: "mimo-v2" } }

function withReminderFlag<T>(enabled: boolean, run: () => T) {
  const previous = Flag.MIMOCODE_ENABLE_SKILL_SEARCH_REMINDER
  Flag.MIMOCODE_ENABLE_SKILL_SEARCH_REMINDER = enabled
  try {
    return run()
  } finally {
    Flag.MIMOCODE_ENABLE_SKILL_SEARCH_REMINDER = previous
  }
}

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

  test("does not prompt skill search before twelve hours", () => {
    expect(skillSearchReminder({ previousUserAt: 1_000, currentUserAt: 43_200_999 })).toBeUndefined()
  })

  test("defaults to search at twelve hours unless the current work is explicitly referenced", () => {
    const reminder = skillSearchReminder({ previousUserAt: 1_000, currentUserAt: 43_201_000 })

    expect(reminder).toContain("at least 12 hours")
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

  test("injects into eligible direct primary sessions only", () =>
    withReminderFlag(true, () => {
      const messages = [
        {
          info: { role: "user", id: "user-1", time: { created: 1_000 } },
          parts: [{ type: "text", text: "Analyze a CSV" }],
        },
      ]

      expect(
        skillSearchReminderForSession({
          session: {},
          agent: { name: "build", mode: "primary" },
          model,
          messages,
        }),
      ).toContain("first user query")
      expect(
        skillSearchReminderForSession({
          session: {},
          agent: { name: "compose", mode: "primary" },
          model,
          messages,
        }),
      ).toBeUndefined()
      expect(
        skillSearchReminderForSession({
          session: {},
          agent: { name: "explore", mode: "subagent" },
          model,
          messages,
        }),
      ).toBeUndefined()
      expect(
        skillSearchReminderForSession({
          session: { parentID: "parent" },
          agent: { name: "build", mode: "primary" },
          model,
          messages,
        }),
      ).toBeUndefined()
      expect(
        skillSearchReminderForSession({
          session: {},
          agent: { name: "build", mode: "primary" },
          model,
          messages: [
            {
              info: { role: "user", id: "user-actor", agentID: "actor-1", time: { created: 1_000 } },
              parts: [{ type: "text", text: "Analyze a CSV" }],
            },
          ],
        }),
      ).toBeUndefined()
    }))

  test("treats a persisted main-slice user row as a direct user query", () =>
    withReminderFlag(true, () => {
      expect(
        skillSearchReminderForSession({
          session: {},
          agent: { name: "build", mode: "primary" },
          model,
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
    }))

  test("does not treat a legacy synthetic cron row without source as a direct user query", () =>
    withReminderFlag(true, () => {
      expect(
        skillSearchReminderForSession({
          session: {},
          agent: { name: "build", mode: "primary" },
          model,
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
    }))

  test("does not treat legacy compaction or checkpoint boundaries as direct user queries", () =>
    withReminderFlag(true, () => {
      for (const type of ["compaction", "checkpoint"]) {
        expect(
          skillSearchReminderForSession({
            session: {},
            agent: { name: "build", mode: "primary" },
            model,
            messages: [
              {
                info: { role: "user", id: `legacy-${type}`, agentID: "main", time: { created: 1_000 } },
                parts: [{ type }],
              },
            ],
          }),
        ).toBeUndefined()
      }
    }))

  test("hook provenance wins over an inconsistent explicit user source", () =>
    withReminderFlag(true, () => {
      expect(
        skillSearchReminderForSession({
          session: {},
          agent: { name: "build", mode: "primary" },
          model,
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
    }))

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

  test("does not inject when skill search is disabled by permission, allowlist, or message tools", () =>
    withReminderFlag(true, () => {
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
          model,
          messages,
          permission: [{ permission: "skill", pattern: "*", action: "deny" }],
        }),
      ).toBeUndefined()
      expect(
        skillSearchReminderForSession({
          session,
          agent: { ...agent, toolAllowlist: ["read"] },
          model,
          messages,
          permission: [],
        }),
      ).toBeUndefined()
      expect(
        skillSearchReminderForSession({
          session,
          agent,
          model,
          messages,
          permission: [],
          tools: { skill_search: false },
        }),
      ).toBeUndefined()
    }))

  test("does not inject when the reminder flag is disabled", () =>
    withReminderFlag(false, () => {
      expect(
        skillSearchReminderForSession({
          session: {},
          agent: { name: "build", mode: "primary" },
          model,
          messages: [
            {
              info: { role: "user", id: "user-1", time: { created: 1_000 } },
              parts: [{ type: "text", text: "Analyze a CSV" }],
            },
          ],
        }),
      ).toBeUndefined()
    }))

  test("does not inject for Claude or GPT models", () =>
    withReminderFlag(true, () => {
      const input = {
        session: {},
        agent: { name: "build", mode: "primary" as const },
        messages: [
          {
            info: { role: "user", id: "user-1", time: { created: 1_000 } },
            parts: [{ type: "text", text: "Analyze a CSV" }],
          },
        ],
      }

      expect(
        skillSearchReminderForSession({
          ...input,
          model: { id: "claude-sonnet-4", api: { id: "claude-sonnet-4" } },
        }),
      ).toBeUndefined()
      expect(
        skillSearchReminderForSession({
          ...input,
          model: { id: "custom-openai-model", api: { id: "gpt-5.4" } },
        }),
      ).toBeUndefined()
    }))
})
