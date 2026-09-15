import { $ } from "bun"
import { expect, test } from "bun:test"
import path from "node:path"
import { Deferred, Effect } from "effect"
import { Actor } from "../../src/actor/spawn"
import { ActorRegistry } from "../../src/actor/registry"
import { Bus } from "../../src/bus"
import { Config } from "../../src/config"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Global } from "../../src/global"
import { HookEvent, Plugin } from "../../src/plugin"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { Session } from "../../src/session"
import type { MessageV2 } from "../../src/session/message-v2"
import { progressPath } from "../../src/session/checkpoint-paths"
import { TaskRegistry } from "../../src/task/registry"
import { prepareConfigDependencies, tmpdir } from "./fixture"
import { startScriptedLLMServer, textStopResponse, toolCallResponse } from "../lib/scripted-llm-server"

const scenario = process.env.MIMOCODE_TEST_PROGRESS_CHAIN_CASE
if (scenario !== "disabled" && scenario !== "enabled" && scenario !== "read-only") {
  throw new Error("An explicit progress-chain scenario is required")
}

// This file is explicitly invoked by the parent test, not discovered as another
// suite. The normal package preload isolates Config/auth/data and initializes the
// real services; there are no Config, Plugin, Actor or Write replacements.
test(`progress-chain ${scenario}`, async () => {
  await using checkout = await tmpdir({ git: true })
  const directory = `${checkout.path}-worktree`
  await $`git worktree add --detach ${directory} HEAD`.cwd(checkout.path).quiet()
  await using worktree = {
    path: directory,
    [Symbol.asyncDispose]: async () => {
      await $`git worktree remove --force ${directory}`.cwd(checkout.path).quiet()
    },
  }

  const writeReply = { lines: [] as string[] }
  const server = startScriptedLLMServer(
    scenario === "enabled"
      ? [{ lines: textStopResponse("delivered") }, writeReply, { lines: textStopResponse("journal complete") }]
      : scenario === "disabled"
        ? [writeReply, { lines: textStopResponse("delivered") }]
        : [{ lines: textStopResponse("delivered") }],
  )
  await using _provider = { [Symbol.asyncDispose]: () => server.stop() }
  const disabled = scenario === "disabled"

  // Wrong cwd-based configuration, a global cached bit, removing Config.Service
  // injection, or replacing the built-in with a no-op must fail these cases.
  for (const [dir, disableWrite] of [
    [checkout.path, !disabled],
    [worktree.path, disabled],
  ] as const) {
    await prepareConfigDependencies(path.join(dir, ".mimocode"))
    await Bun.write(
      path.join(dir, "mimocode.json"),
      JSON.stringify({
        memory: { disable_write: disableWrite },
        compaction: { auto: false },
        formatter: false,
        lsp: false,
        enabled_providers: ["alibaba"],
        provider: { alibaba: { options: { apiKey: "test-key", baseURL: `${server.origin}/v1` } } },
        agent: {
          "progress-writable": {
            mode: "subagent",
            model: "alibaba/qwen-plus",
            prompt: "Complete the synthetic task and follow progress instructions.",
            permission: { "*": "deny", write: "allow" },
          },
          "progress-read-only": {
            mode: "subagent",
            model: "alibaba/qwen-plus",
            prompt: "Complete the synthetic read-only task.",
            permission: { "*": "deny" },
          },
        },
      }),
    )
  }
  await prepareConfigDependencies(Global.Path.config)

  const previousCwd = process.cwd()
  try {
    process.chdir(checkout.path)
    expect(path.relative(process.cwd(), worktree.path).startsWith("..")).toBe(true)
    expect(
      path.resolve(worktree.path, (await $`git rev-parse --git-common-dir`.cwd(worktree.path).text()).trim()),
    ).toBe(path.join(checkout.path, ".git"))

    // Establish the actual failure of the old HTTP config path, rather than
    // substituting a fake rejected request. The service path must still work.
    const response = await Server.Default().app.request(`/config?directory=${encodeURIComponent(worktree.path)}`)
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ code: "directory_not_allowed" })

    // Interleave both actual instances. This also proves that the built-in was
    // registered: enabled + missing journal must contribute its own decision.
    for (const [dir, disableWrite] of [
      [checkout.path, !disabled],
      [worktree.path, disabled],
      [checkout.path, !disabled],
      [worktree.path, disabled],
    ] as const) {
      await Instance.provide({
        directory: dir,
        fn: () =>
          AppRuntime.runPromise(
            Effect.gen(function* () {
              const config = yield* Config.Service
              expect((yield* config.get()).memory?.disable_write).toBe(disableWrite)
              const session = yield* (yield* Session.Service).create({ title: "instance progress decision" })
              const decision = yield* (yield* Plugin.Service).triggerActorPostStop({
                sessionID: session.id,
                actorID: "actor-example",
                agentType: "progress-writable",
                mode: "subagent",
                lifecycle: "ephemeral",
                task: "synthetic task",
                description: "instance isolation",
                task_id: "T1",
                finalText: "done",
                outcome: "success",
                iteration: 0,
                canWrite: true,
              })
              expect(decision.continue).toBe(!disableWrite)
              if (disableWrite) expect(decision.contributingPluginNames).toEqual([])
              if (!disableWrite) expect(decision.contributingPluginNames).toContain("SubagentProgressCheckerPlugin")
              expect(yield* Effect.promise(() => Bun.file(progressPath(session.id, "T1")).exists())).toBe(false)
            }),
          ),
      })
    }

    await Instance.provide({
      directory: worktree.path,
      fn: () =>
        AppRuntime.runPromise(
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const session = yield* sessions.create({ title: "built-in progress chain" })
            const task = yield* (yield* TaskRegistry.Service).create({
              session_id: session.id,
              summary: "synthetic task",
            })
            const journal = progressPath(session.id, task.id)
            const content = [
              "## §1 Task identity",
              `- task_id: ${task.id}`,
              "## §2 Subagent intent",
              "Record the synthetic task.",
              "## §3 Files and code sections",
              "- example.txt",
              "## §4 Verbatim commands",
              "No external commands were needed.",
              "## §5 Outcome and discoveries",
              "- Outcome: success",
            ].join("\n")
            writeReply.lines = toolCallResponse({
              id: "call-progress-write",
              name: "write",
              args: JSON.stringify({ file_path: journal, content }),
            })
            const executed: { actorID: string; outcome: string; continueRequested: boolean }[] = []
            const reentered: { actorID: string; iteration: number; triggeredByPlugins: string[] }[] = []
            const capped: string[] = []
            const terminalHook = Promise.withResolvers<void>()
            const bus = yield* Bus.Service
            const offExecuted = yield* bus.subscribeCallback(HookEvent.Executed, (event) => {
              if (
                event.properties.event === "actor.postStop" &&
                event.properties.pluginName === "SubagentProgressCheckerPlugin"
              ) {
                executed.push(event.properties)
                if (event.properties.outcome === "success" && !event.properties.continueRequested) {
                  terminalHook.resolve()
                }
              }
            })
            yield* Effect.addFinalizer(() => Effect.sync(offExecuted))
            const offReentered = yield* bus.subscribeCallback(HookEvent.ReActReentered, (event) => {
              if (event.properties.phase === "post") reentered.push(event.properties)
            })
            yield* Effect.addFinalizer(() => Effect.sync(offReentered))
            const offCapped = yield* bus.subscribeCallback(HookEvent.ReActMaxReached, (event) => {
              if (event.properties.phase === "post") capped.push(event.properties.actorID)
            })
            yield* Effect.addFinalizer(() => Effect.sync(offCapped))

            expect(yield* Effect.promise(() => Bun.file(journal).exists())).toBe(false)
            const result = yield* (yield* Actor.Service).spawn({
              mode: "subagent",
              sessionID: session.id,
              agentType: scenario === "read-only" ? "progress-read-only" : "progress-writable",
              task: "Complete the synthetic task.",
              context: "none",
              tools: ["write"],
              background: false,
              task_id: task.id,
            })
            const outcome = yield* Deferred.await(result.outcome)
            // Bus callbacks consume asynchronously; actor completion is not an
            // acknowledgement that the final hook event has reached this observer.
            yield* Effect.promise(() => terminalHook.promise).pipe(Effect.timeout("1 second"))
            expect(outcome.status).toBe("success")
            if (outcome.status === "success") expect(outcome.finalText).toBe("delivered")
            expect(capped).toEqual([])
            const actor = yield* (yield* ActorRegistry.Service).get(result.sessionID, result.actorID)
            expect(actor?.status).toBe("idle")
            expect(actor?.lastOutcome).toBe("success")
            const messages = yield* sessions.messages({ sessionID: result.sessionID, agentID: result.actorID })
            const writes = messages
              .flatMap((message) => message.parts)
              .filter((part): part is MessageV2.ToolPart => part.type === "tool" && part.tool === "write")
            const hookMessages = messages.filter(
              (message) =>
                message.info.role === "user" &&
                message.info.source === "hook" &&
                message.info.provenance?.hookPhase === "post",
            )
            const ownHooks = executed.filter((event) => event.actorID === result.actorID)

            if (scenario === "enabled") {
              expect(server.captures).toHaveLength(3)
              expect(writes).toHaveLength(1)
              expect(writes[0]?.state.status).toBe("completed")
              expect(hookMessages).toHaveLength(1)
              expect(reentered).toMatchObject([
                { actorID: result.actorID, iteration: 1, triggeredByPlugins: ["SubagentProgressCheckerPlugin"] },
              ])
              expect(ownHooks.map((event) => [event.outcome, event.continueRequested])).toEqual([
                ["success", true],
                ["success", false],
              ])
              const written = yield* Effect.promise(() => Bun.file(journal).text())
              expect(written).toMatch(/^---\nwritten-at: \d+\n---\n/)
              expect(written).toContain(content)
              expect(server.captures[1]?.tools?.some((tool) => tool.function.name === "write")).toBe(true)
            }
            if (scenario === "disabled") {
              expect(server.captures).toHaveLength(2)
              expect(writes).toHaveLength(1)
              expect(writes[0]?.state.status).toBe("error")
              if (writes[0]?.state.status === "error")
                expect(writes[0].state.error).toContain("Memory WRITING is disabled")
            }
            if (scenario === "read-only") {
              expect(server.captures).toHaveLength(1)
              expect(writes).toEqual([])
              expect(server.captures[0]?.tools?.some((tool) => tool.function.name === "write") ?? false).toBe(false)
            }
            if (scenario !== "enabled") {
              expect(hookMessages).toEqual([])
              expect(reentered).toEqual([])
              expect(ownHooks.map((event) => [event.outcome, event.continueRequested])).toEqual([["success", false]])
              expect(yield* Effect.promise(() => Bun.file(journal).exists())).toBe(false)
            }
          }).pipe(Effect.scoped),
        ),
    })
  } finally {
    try {
      await Instance.disposeAll()
    } finally {
      process.chdir(previousCwd)
    }
  }
  console.log(`progress-chain-complete:${scenario}`)
})
