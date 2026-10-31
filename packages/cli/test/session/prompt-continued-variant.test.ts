import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionPrompt } from "../../src/session/prompt"
import type { SessionID } from "../../src/session/schema"
import { Log } from "../../src/util"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { makeLayer, providerCfg, ref } from "../workflow/lib"

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

const it = testEffect(makeLayer())

// FC-023: a prompt that names no model continues the session's last model, and
// with it the variant that turn ran at. Cron fires, inbox deliveries and actor
// notifications all reach the session this way.
function config(url: string) {
  const base = providerCfg(url)
  return {
    ...base,
    command: { example: { template: "Reply with ok." } },
    provider: {
      ...base.provider,
      test: {
        ...base.provider.test,
        models: {
          "test-model": {
            ...base.provider.test.models["test-model"],
            variants: { max: { reasoningEffort: "max" }, low: { reasoningEffort: "low" } },
          },
        },
      },
    },
  }
}

const userModel = (message: MessageV2.WithParts) => {
  if (message.info.role !== "user") throw new Error(`expected a user message, got ${message.info.role}`)
  return message.info.model
}

const seed = (sessionID: SessionID, variant: string) =>
  Effect.gen(function* () {
    const prompt = yield* SessionPrompt.Service
    const first = yield* prompt.prompt({
      sessionID,
      agent: "build",
      model: ref,
      variant,
      noReply: true,
      parts: [{ type: "text", text: "start" }],
    })
    expect(userModel(first)).toEqual({ ...ref, variant })
  })

describe("session.prompt continued variant", () => {
  it.live(
    "a prompt that names no model keeps the last turn's variant",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* () {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "continued variant" })
          yield* seed(session.id, "max")

          // The shape injectScheduledPrompt sends for a cron fire.
          const fire = yield* prompt.prompt({
            sessionID: session.id,
            source: "hook",
            noReply: true,
            parts: [{ type: "text", text: "[cron fire @ 2026-01-01T00:00:00Z] tick", synthetic: true }],
          })
          expect(userModel(fire)).toEqual({ ...ref, variant: "max" })

          // Naming the model without a variant is an explicit choice of its default.
          const explicit = yield* prompt.prompt({
            sessionID: session.id,
            agent: "build",
            model: ref,
            noReply: true,
            parts: [{ type: "text", text: "default effort" }],
          })
          expect(userModel(explicit)).toEqual({ ...ref, variant: undefined })

          const after = yield* prompt.prompt({
            sessionID: session.id,
            source: "hook",
            noReply: true,
            parts: [{ type: "text", text: "next fire", synthetic: true }],
          })
          expect(userModel(after).variant).toBeUndefined()
        }),
        { git: true, config },
      ),
  )

  it.live(
    "a variant the model no longer offers is not continued",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* () {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "retired variant" })
          yield* seed(session.id, "retired")

          const fire = yield* prompt.prompt({
            sessionID: session.id,
            source: "hook",
            noReply: true,
            parts: [{ type: "text", text: "tick", synthetic: true }],
          })
          expect(userModel(fire)).toEqual({ ...ref, variant: undefined })
        }),
        { git: true, config },
      ),
  )

  it.live(
    "a shell run on the same model keeps the variant for later turns",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* () {
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "shell variant" })
          yield* seed(session.id, "max")

          // The TUI names its selected model but has no variant field for shell runs.
          const result = yield* prompt.shell({ sessionID: session.id, agent: "build", model: ref, command: "printf ok" })
          if (result.info.role !== "assistant") throw new Error("expected the shell's assistant message")
          const parentID = result.info.parentID
          const messages = yield* sessions.messages({ sessionID: session.id })
          const shellUser = messages.find((message) => message.info.id === parentID)
          if (!shellUser) throw new Error("shell user message missing")
          expect(userModel(shellUser)).toEqual({ ...ref, variant: "max" })

          const fire = yield* prompt.prompt({
            sessionID: session.id,
            source: "hook",
            noReply: true,
            parts: [{ type: "text", text: "tick", synthetic: true }],
          })
          expect(userModel(fire).variant).toBe("max")
        }),
        { git: true, config },
      ),
  )

  it.live(
    "a command that names no model keeps the last turn's variant",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ llm }) {
          yield* llm.text("ok")
          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "command variant" })
          yield* seed(session.id, "max")

          yield* prompt.command({ sessionID: session.id, command: "example", arguments: "" })

          const users = (yield* sessions.messages({ sessionID: session.id })).filter(
            (message) => message.info.role === "user",
          )
          expect(users).toHaveLength(2)
          expect(userModel(users[1])).toEqual({ ...ref, variant: "max" })
        }),
        { git: true, config },
      ),
  )
})
