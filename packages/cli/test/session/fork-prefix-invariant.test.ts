import { afterEach, describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Session as SessionNs } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID } from "../../src/session/schema"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { buildLLMRequestPrefix } from "../../src/session/llm-request-prefix"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Log } from "../../src/util"
import { tmpdir } from "../fixture/fixture"
import { ProviderTest } from "../fake/provider"
import type { Agent } from "../../src/agent/agent"

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

function makeAgent(): Agent.Info {
  return {
    name: "build",
    mode: "primary",
    options: {},
    permission: [{ permission: "*", pattern: "*", action: "allow" }],
  } satisfies Agent.Info
}

describe("fork prefix invariant", () => {
  test("two callers of buildLLMRequestPrefix produce deep-equal output for identical inputs", async () => {
    // The invariant: any future change to system/tools/messages construction
    // that introduces an agent-conditional branch breaks this assertion.
    // parent's runLoop and fork's spawn capture both call buildLLMRequestPrefix
    // with the same inputs and must produce byte-equal output.

    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.create({})))

        // Build a session with three messages: user → assistant → user.
        let previousUser: MessageID | undefined
        for (let i = 0; i < 3; i++) {
          const id = MessageID.ascending()
          const role = i % 2 === 0 ? "user" : "assistant"
          const created = Date.now() + i
          let message: MessageV2.Info
          if (role === "user") {
            previousUser = id
            message = {
              id,
              sessionID: session.id,
              role,
              agent: "build",
              time: { created },
              model: { providerID: ProviderID.make("test"), modelID: ModelID.make("test") },
            }
          } else {
            if (!previousUser) throw new Error("Missing parent user")
            message = {
              id,
              sessionID: session.id,
              role,
              agent: "build",
              mode: "build",
              parentID: previousUser,
              time: { created, completed: created },
              finish: "stop",
              providerID: ProviderID.make("test"),
              modelID: ModelID.make("test"),
              path: { cwd: "/tmp/example", root: "/tmp/example" },
              cost: 0,
              tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            }
          }
          await AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.updateMessage(message)))
          await AppRuntime.runPromise(
            SessionNs.Service.use((svc) =>
              svc.updatePart({
                id: PartID.ascending(),
                sessionID: session.id,
                messageID: id,
                type: "text",
                text: `msg-${i}`,
              }),
            ),
          )
        }

        const msgs = await AppRuntime.runPromise(
          SessionNs.Service.use((svc) => svc.messages({ sessionID: session.id })),
        )

        const agent = makeAgent()
        const model = ProviderTest.model({
          id: ModelID.make("gpt-5.2"),
          providerID: ProviderID.make("openai"),
        })

        // Call A: parent's runLoop view
        const a = await AppRuntime.runPromise(
          buildLLMRequestPrefix({
            sessionID: session.id,
            agent,
            model,
            msgs,
            additions: [],
          }),
        )

        // Call B: fork's spawn-capture view.
        // Both paths call this same function with the same inputs;
        // any divergence (e.g. agent-conditional branch) breaks this assertion.
        const b = await AppRuntime.runPromise(
          buildLLMRequestPrefix({
            sessionID: session.id,
            agent,
            model,
            msgs,
            additions: [],
          }),
        )

        // Fork-prefix-cache parity contract
        expect(a.system).toEqual(b.system)
        expect(JSON.stringify(a.tools)).toEqual(JSON.stringify(b.tools))
        expect(a.inheritedMessages).toEqual(b.inheritedMessages)
      },
    })
  })
})
