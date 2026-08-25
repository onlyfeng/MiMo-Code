import { describe, expect, test } from "bun:test"
import type { LanguageModelV3StreamPart } from "@ai-sdk/provider"
import { Effect, Layer, ManagedRuntime, Stream } from "effect"
import { GitLabWorkflowLanguageModel } from "gitlab-ai-provider"
import z from "zod"
import { ActorRegistry } from "../../src/actor/registry"
import { Auth } from "../../src/auth"
import { Config } from "../../src/config"
import { LLM } from "../../src/session/llm"
import { Memory } from "../../src/memory"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionStatus } from "../../src/session/status"
import { Plugin } from "../../src/plugin"
import { Instance } from "../../src/project/instance"
import { MessageID, SessionID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import type { Agent } from "../../src/agent/agent"
import { tmpdir } from "../fixture/fixture"
import { ProviderTest } from "../fake/provider"

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
}

const agent = {
  name: "workflow-test",
  mode: "primary",
  prompt: "AGENT_SYSTEM",
  options: {},
  permission: [{ permission: "*", pattern: "*", action: "allow" }],
} satisfies Agent.Info

function user(sessionID: SessionID, systemMode: "append" | "replace-agent"): MessageV2.User {
  return {
    id: MessageID.ascending(),
    sessionID,
    role: "user",
    time: { created: Date.now() },
    agent: agent.name,
    model: { providerID: ProviderID.make("gitlab"), modelID: ModelID.make("duo-workflow-sonnet-4-6") },
    system: "TURN_SYSTEM",
    systemMode,
  }
}

describe("session.llm GitLab workflow system prompt", () => {
  test("preserves per-turn system context in workflow and telemetry for append and replace-agent", async () => {
    await using tmp = await tmpdir({ git: true })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const model = ProviderTest.model({
          providerID: ProviderID.make("gitlab"),
          id: ModelID.make("duo-workflow-sonnet-4-6"),
          api: {
            id: "duo-workflow-sonnet-4-6",
            url: "https://gitlab.com",
            npm: "gitlab-ai-provider",
          },
        })
        const workflow = new GitLabWorkflowLanguageModel(
          model.id,
          {
            provider: "gitlab.workflow",
            instanceUrl: "https://gitlab.com",
            getHeaders: () => ({ Authorization: "Bearer test" }),
          },
          { workingDirectory: tmp.path },
        )
        workflow.doStream = async () => ({
          stream: new ReadableStream<LanguageModelV3StreamPart>({
            start(controller) {
              controller.enqueue({ type: "stream-start", warnings: [] })
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "stop", raw: "stop" },
                usage,
              })
              controller.close()
            },
          }),
        })

        const requests: Array<{ systemPrompt: string[] }> = []
        const plugin = Layer.succeed(
          Plugin.Service,
          Plugin.Service.of({
            trigger: (name, input, output) =>
              Effect.sync(() => {
                const parsed = z.object({ systemPrompt: z.array(z.string()) }).safeParse(input)
                if (name === "session.llm.request" && parsed.success) requests.push(parsed.data)
                return output
              }),
            list: () => Effect.succeed([]),
            init: () => Effect.void,
            reloadFileHooks: () => Effect.void,
            triggerActorPreStop: () =>
              Effect.succeed({ continue: false, contributingPluginNames: [], contributingHookIDs: [] }),
            triggerActorPostStop: () =>
              Effect.succeed({ continue: false, contributingPluginNames: [], contributingHookIDs: [] }),
          }),
        )
        const provider = ProviderTest.fake({
          model,
          getLanguage: () => Effect.succeed(workflow),
        })
        const runtime = ManagedRuntime.make(
          LLM.layer.pipe(
            Layer.provide(
              Layer.mergeAll(
                Auth.defaultLayer,
                Config.defaultLayer,
                provider.layer,
                plugin,
                ActorRegistry.defaultLayer,
                Memory.defaultLayer,
                SessionStatus.defaultLayer,
              ),
            ),
          ),
        )

        try {
          const run = async (systemMode: "append" | "replace-agent") => {
            await runtime.runPromise(
              LLM.Service.use((service) =>
                service
                  .stream({
                    user: user(SessionID.make("session-workflow-system"), systemMode),
                    sessionID: SessionID.make("session-workflow-system"),
                    model,
                    agent,
                    system: ["CALL_SYSTEM"],
                    messages: [{ role: "user", content: "Hello" }],
                    tools: {},
                  })
                  .pipe(Stream.runDrain),
              ),
            )
            return {
              prompt: workflow.systemPrompt ?? "",
              telemetry: requests.at(-1)?.systemPrompt.join("\n") ?? "",
            }
          }

          const append = await run("append")
          expect(append.prompt).toContain("AGENT_SYSTEM")
          expect(append.prompt).toContain("CALL_SYSTEM")
          expect(append.prompt).toContain("TURN_SYSTEM")
          expect(append.telemetry).toBe(append.prompt)

          const replace = await run("replace-agent")
          expect(replace.prompt).not.toContain("AGENT_SYSTEM")
          expect(replace.prompt).toContain("CALL_SYSTEM")
          expect(replace.prompt).toContain("TURN_SYSTEM")
          expect(replace.telemetry).toBe(replace.prompt)
        } finally {
          await runtime.dispose()
        }
      },
    })
  })
})
