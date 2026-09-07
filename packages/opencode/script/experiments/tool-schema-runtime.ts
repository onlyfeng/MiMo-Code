import fs from "node:fs/promises"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { isDeepStrictEqual } from "node:util"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { generateText, jsonSchema, tool, type LanguageModel, type ModelMessage, type LanguageModelUsage } from "ai"
import { Effect } from "effect"
import { mergeDeep } from "remeda"
import z from "zod"
import { cases, type Case } from "./tool-schema-cases"
import {
  allowedPattern,
  candidates,
  compactDescriptor,
  constraints,
  fingerprint,
  grade,
  measure,
  classifyProviderError,
  wireTools,
  type Descriptor,
  type ProviderFailure,
} from "./tool-schema-helper"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instance } from "../../src/project/instance"
import { ToolRegistry, type Tool } from "../../src/tool"
import { Provider, ProviderTransform } from "../../src/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { Permission } from "../../src/permission"
import { Agent } from "../../src/agent/agent"
import { Log } from "../../src/util"
import { Flag } from "../../src/flag/flag"
import { Database } from "../../src/storage"

type Input = {
  mode: "offline" | "live"
  model?: string
  cases?: number
  repeats?: number
  maxSteps?: number
  maxOutputTokens?: number
  seed?: string
  root?: string
  /** Local transport fault injection; unavailable from the live CLI. */
  offlineFault?: "malformed_tool" | "unknown_tool" | "http" | "response_parse"
}
type Wire = { arm: string; case: string; repeat: number; body: Record<string, unknown> }
type Run = {
  arm: "baseline" | "compact"
  case: string
  repeat: number
  termination: string
  requests: number
  toolCalls: number
  validationErrors: number
  deniedCalls: number
  executionErrors: number
  reads: string[]
  answer: string
  replayCompleted: boolean | null
  liveTaskCompleted: boolean | null
  providerUsage: LanguageModelUsage[] | null
  stubUsage: LanguageModelUsage[] | null
  errorCategory: ProviderFailure["errorCategory"] | null
  statusCode: number | null
}

/** The standalone CLI owns the global runtime; reusable test runs do not. */
export async function disposeExperimentRuntime() {
  await AppRuntime.dispose()
  Database.close()
}

export function experimentProviderOptions(input: {
  model: Provider.Model
  sessionID: string
  providerOptions?: Record<string, unknown>
}) {
  return ProviderTransform.providerOptions(
    input.model,
    mergeDeep(ProviderTransform.options(input), input.model.options),
  )
}

const system =
  'You are testing data lookup tools against a synthetic project. Only read, glob and grep may execute. Other directly visible tools are unchanged control declarations and are unavailable for these tasks. Do not use them. Use tools to obtain the answer; never guess. Return only JSON {"answer":string|null}. Use relative paths.'

function bounded(value: number | undefined, fallback: number, max: number) {
  const result = value ?? fallback
  if (!Number.isInteger(result) || result < 1 || result > max)
    throw new Error(`Experiment bound must be an integer from 1 to ${max}`)
  return result
}

function inside(root: string, file: string) {
  const relative = path.relative(root, file)
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
}

export async function allowedPath(root: string, target: string, files: string[], read: boolean) {
  const file = path.resolve(root, target)
  if (!inside(root, file)) return false
  const real = await fs.realpath(file).catch(() => undefined)
  const relative = path.relative(root, file).split(path.sep).join("/")
  if (!real) {
    // A missing synthetic path is a normal tool error, not a permission denial.
    // Existing undeclared files and dangling links still cannot be inspected.
    if (relative.split("/").some((part) => part.startsWith("."))) return false
    if (
      await fs.lstat(file).then(
        () => true,
        () => false,
      )
    )
      return false
    const parent = await fs.realpath(path.dirname(file)).catch(() => undefined)
    return parent !== undefined && inside(root, parent)
  }
  if (!inside(root, real)) return false
  if (read) return files.includes(relative)
  return relative === "" || files.some((item) => item === relative || item.startsWith(`${relative}/`))
}

function offlineModel(): Provider.Model {
  return {
    id: ModelID.make("schema-offline"),
    providerID: ProviderID.make("schema"),
    name: "Local scripted schema transport",
    api: { id: "schema-offline", url: "http://127.0.0.1", npm: "@ai-sdk/openai-compatible" },
    capabilities: {
      toolcall: true,
      attachment: false,
      reasoning: false,
      temperature: true,
      interleaved: false,
      input: { text: true, image: false, audio: false, video: false, pdf: false },
      output: { text: true, image: false, audio: false, video: false, pdf: false },
    },
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context: 200000, output: 1024 },
    status: "active",
    options: {},
    headers: {},
    release_date: "2026-09-07",
  }
}

export async function runExperiment(input: Input) {
  if (input.offlineFault && input.mode !== "offline") throw new Error("Fault injection is offline only")
  const limits = {
    cases: bounded(input.cases, 6, 6),
    repeats: bounded(input.repeats, 2, 2),
    maxSteps: bounded(input.maxSteps, 3, 3),
    maxOutputTokens: bounded(input.maxOutputTokens, 1024, 1024),
  }
  const base = input.root ?? process.env.MIMOCODE_TEST_TMPDIR_ROOT ?? process.env.MIMOCODE_SCHEMA_ISOLATION_ROOT
  if (!base) throw new Error("An isolated experiment fixture root is required")
  await Log.init({ print: false })
  const directory = await fs.realpath(await fs.mkdtemp(path.join(base, "schema-fixture-")))
  execFileSync("git", ["init", "--quiet", directory])
  const wire: Wire[] = []
  const current: { task?: Case; arm: string; repeat: number; index: number } = { arm: "baseline", repeat: 0, index: 0 }
  const server =
    input.mode === "offline"
      ? Bun.serve({
          hostname: "127.0.0.1",
          port: 0,
          async fetch(request) {
            const body = (await request.json()) as Record<string, unknown>
            const task = current.task!
            wire.push({ arm: current.arm, case: task.id, repeat: current.repeat, body })
            if (input.offlineFault === "http")
              return Response.json({ error: { message: "SYNTHETIC_PROVIDER_SECRET" } }, { status: 429 })
            if (input.offlineFault === "response_parse")
              return new Response("SYNTHETIC_PROVIDER_SECRET", { headers: { "content-type": "application/json" } })
            const index = current.index++
            const call = input.offlineFault
              ? index === 0
                ? { name: input.offlineFault === "unknown_tool" ? "missing_tool" : "read", input: {} }
                : index === 1
                  ? task.calls.at(-1)
                  : undefined
              : task.calls[index]
            return Response.json({
              id: "schema-scripted",
              object: "chat.completion",
              created: 1,
              model: "schema-offline",
              choices: [
                {
                  index: 0,
                  finish_reason: call ? "tool_calls" : "stop",
                  message: call
                    ? {
                        role: "assistant",
                        content: null,
                        tool_calls: [
                          {
                            id: `call_${current.index}`,
                            type: "function",
                            function: {
                              name: call.name,
                              arguments:
                                input.offlineFault === "malformed_tool" && index === 0
                                  ? "{"
                                  : JSON.stringify(call.input),
                            },
                          },
                        ],
                      }
                    : { role: "assistant", content: JSON.stringify({ answer: task.expected.answer }) },
                },
              ],
              // Synthetic usage never populates providerUsage.
              usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
            })
          },
        })
      : undefined
  try {
    return await Instance.provide({
      directory,
      fn: async () => {
        const selected =
          input.mode === "live"
            ? await AppRuntime.runPromise(
                Effect.gen(function* () {
                  const provider = yield* Provider.Service
                  const ref = input.model ? Provider.parseModel(input.model) : yield* provider.defaultModel()
                  const model = yield* provider.getModel(ref.providerID, ref.modelID)
                  if (!model.capabilities.toolcall) throw new Error("Selected model does not advertise tool calls")
                  return {
                    model,
                    language: yield* provider.getLanguage(model),
                    provider: yield* provider.getProvider(model.providerID),
                  }
                }),
              )
            : undefined
        const model = selected?.model ?? offlineModel()
        const language: LanguageModel =
          selected?.language ??
          createOpenAICompatible({
            name: "schema",
            apiKey: "local-stub-only",
            baseURL: `http://127.0.0.1:${server!.port}/v1`,
          })("schema-offline")
        const agent = await AppRuntime.runPromise(Agent.Service.use((svc) => svc.get("build")))
        if (!agent) throw new Error("Builtin build agent is unavailable")
        const registryInput = {
          modelID: model.id,
          modelAPIID: model.api.id,
          modelFamily: model.family,
          harnessModel: model.harness_model,
          providerID: model.providerID,
          agent,
        }
        const defs = await AppRuntime.runPromise(
          ToolRegistry.Service.use((svc) => svc.tools({ ...registryInput, harness: "default" })),
        )
        const membership = await Promise.all(
          (["auto", "codex", "default"] as const).map(async (harness) => ({
            harness,
            tools: (
              await AppRuntime.runPromise(ToolRegistry.Service.use((svc) => svc.tools({ ...registryInput, harness })))
            ).map((entry) => entry.id),
          })),
        )
        const baseline: Descriptor[] = defs.map((def) => ({
          name: def.id,
          description: def.description,
          parameters: ProviderTransform.schema(model, z.toJSONSchema(def.parameters)) as Record<string, unknown>,
        }))
        const compact = baseline.map(compactDescriptor)
        const constraintsEqual = baseline.every((entry, i) =>
          isDeepStrictEqual(constraints(entry.parameters), constraints(compact[i].parameters)),
        )
        const nonCandidatesEqual = baseline.every(
          (entry, i) => candidates.has(entry.name) || isDeepStrictEqual(entry, compact[i]),
        )
        if (
          !constraintsEqual ||
          !nonCandidatesEqual ||
          [...candidates].some((id) => !defs.some((def) => def.id === id))
        )
          throw new Error("Experiment declaration invariant failed")
        const permission: Permission.Ruleset = [
          { permission: "*", pattern: "*", action: "deny" },
          ...[...candidates].map((name) => ({ permission: name, pattern: "*", action: "allow" as const })),
        ]
        const session = await AppRuntime.runPromise(
          Session.Service.use((svc) => svc.create({ title: "Synthetic schema experiment", permission })),
        )
        const permissions = await AppRuntime.runPromise(Permission.Service.use((svc) => Effect.succeed(svc)))
        const runs: Run[] = []
        for (let repeat = 0; repeat < limits.repeats; repeat++) {
          const tasks = cases(`${input.seed ?? "schema-20260907"}:${repeat}`).slice(0, limits.cases)
          const files = Object.assign({}, ...tasks.map((task) => task.files)) as Record<string, string>
          await Promise.all(
            Object.entries(files).map(async ([file, text]) => {
              await fs.mkdir(path.dirname(path.join(directory, file)), { recursive: true })
              await fs.writeFile(path.join(directory, file), text)
            }),
          )
          for (const [index, task] of tasks.entries())
            for (const arm of ((repeat + index) % 2 ? ["compact", "baseline"] : ["baseline", "compact"]) as Array<
              "baseline" | "compact"
            >) {
              Object.assign(current, { task, arm, repeat, index: 0 })
              const run: Run = {
                arm,
                case: task.id,
                repeat,
                termination: "budget_exhausted",
                requests: 0,
                toolCalls: 0,
                validationErrors: 0,
                deniedCalls: 0,
                executionErrors: 0,
                reads: [],
                answer: "",
                replayCompleted: null,
                liveTaskCompleted: null,
                providerUsage: input.mode === "live" ? [] : null,
                stubUsage: input.mode === "offline" ? [] : null,
                errorCategory: null,
                statusCode: null,
              }
              const tools = ProviderTransform.tools(
                Object.fromEntries(
                  (arm === "baseline" ? baseline : compact).map((def) => [
                    def.name,
                    tool({ description: def.description, inputSchema: jsonSchema(def.parameters) }),
                  ]),
                ),
                model,
              )
              const messages: ModelMessage[] = [{ role: "user", content: task.prompt }]
              for (let step = 0; step < limits.maxSteps; step++) {
                run.requests++
                const result = await generateText({
                  model: language,
                  system,
                  messages,
                  tools,
                  maxRetries: 0,
                  maxOutputTokens: limits.maxOutputTokens,
                  abortSignal: AbortSignal.timeout(30000),
                  providerOptions: experimentProviderOptions({
                    model,
                    sessionID: session.id,
                    providerOptions: selected?.provider.options,
                  }),
                  ...(input.mode === "live" ? { headers: model.headers } : {}),
                }).catch((error: unknown) => {
                  Object.assign(run, classifyProviderError(error))
                  return undefined
                })
                if (!result) {
                  run.termination = "provider_error"
                  break
                }
                ;(run.providerUsage ?? run.stubUsage)!.push(result.usage)
                if (input.mode === "live") {
                  const body = wireTools(result.request.body)
                  if (body) wire.push({ arm, case: task.id, repeat, body })
                }
                messages.push(...result.response.messages)
                const replied = new Set(
                  result.response.messages.flatMap((message) =>
                    message.role === "tool"
                      ? message.content.flatMap((part) => (part.type === "tool-result" ? [part.toolCallId] : []))
                      : [],
                  ),
                )
                if (result.toolCalls.length === 0) {
                  run.answer = result.text
                  run.termination = result.finishReason === "stop" ? "stop" : "budget_exhausted"
                  break
                }
                for (const call of result.toolCalls) {
                  run.toolCalls++
                  const def = defs.find((entry) => entry.id === call.toolName)
                  const args =
                    typeof call.input === "object" && call.input !== null ? (call.input as Record<string, unknown>) : {}
                  const target = call.toolName === "read" ? args.file_path : (args.path ?? ".")
                  const patternAllowed =
                    call.toolName === "glob"
                      ? typeof args.pattern === "string" && allowedPattern(args.pattern)
                      : call.toolName !== "grep" ||
                        args.include === undefined ||
                        (typeof args.include === "string" && allowedPattern(args.include))
                  const allowed =
                    candidates.has(call.toolName) &&
                    def &&
                    patternAllowed &&
                    typeof target === "string" &&
                    (await allowedPath(directory, target, Object.keys(files), call.toolName === "read"))
                  const accepted = def?.parameters.safeParse(call.input).success ?? false
                  if (!accepted) run.validationErrors++
                  // The SDK has already converted invalid/unknown calls into tool errors.
                  // One call ID must have exactly one result in the next provider request.
                  if (replied.has(call.toolCallId)) continue
                  if (accepted && !allowed) run.deniedCalls++
                  const ctx: Tool.Context = {
                    sessionID: session.id,
                    messageID: MessageID.ascending(),
                    callID: call.toolCallId,
                    agent: "build",
                    abort: AbortSignal.timeout(30000),
                    permission,
                    messages: [],
                    extra: { model },
                    metadata: () => Effect.void,
                    ask: (request) =>
                      permissions
                        .ask({ ...request, sessionID: session.id, ruleset: permission, interactive: false })
                        .pipe(Effect.orDie),
                  }
                  const output =
                    allowed && accepted
                      ? await AppRuntime.runPromise(def.execute(call.input, ctx)).catch(() => undefined)
                      : undefined
                  if (allowed && accepted && !output) run.executionErrors++
                  if (output && call.toolName === "read")
                    run.reads.push(
                      path
                        .relative(directory, path.resolve(directory, target as string))
                        .split(path.sep)
                        .join("/"),
                    )
                  messages.push({
                    role: "tool",
                    content: [
                      {
                        type: "tool-result",
                        toolCallId: call.toolCallId,
                        toolName: call.toolName,
                        output: {
                          type: "json",
                          value: output
                            ? { output: output.output }
                            : {
                                error: allowed
                                  ? "Tool input or execution failed"
                                  : "Tool or path is outside the synthetic experiment boundary",
                              },
                        },
                      },
                    ],
                  })
                }
              }
              const completed = grade(task.expected, run.answer, run.reads, run.termination)
              if (input.mode === "live") run.liveTaskCompleted = completed
              if (input.mode === "offline") run.replayCompleted = completed
              runs.push(run)
            }
        }
        return {
          version: 2,
          mode: input.mode,
          seed: input.seed ?? "schema-20260907",
          model: `${model.providerID}/${model.id}`,
          modelIdentity: {
            providerID: String(model.providerID),
            modelID: String(model.id),
            apiID: model.api.id,
            npm: model.api.npm,
            family: model.family ?? null,
            harnessModel: model.harness_model ?? null,
            harness: "default",
          },
          harness: "default",
          defaultBehaviorChanged: false,
          limits,
          maxProviderRequests: limits.cases * limits.repeats * 2 * limits.maxSteps,
          environment: {
            packageTestPreload: !!process.env.MIMOCODE_TEST_TMPDIR_ROOT,
            orchestrator: Flag.MIMOCODE_EXPERIMENTAL_ORCHESTRATOR,
            isolationRootProvided: !!process.env.MIMOCODE_SCHEMA_ISOLATION_ROOT,
          },
          catalog: {
            baseline,
            compact,
            membership,
            constraintsEqual,
            nonCandidatesEqual,
            baselineMeasure: measure(baseline),
            compactMeasure: measure(compact),
            nonCandidateHash: fingerprint(baseline.filter((item) => !candidates.has(item.name))),
          },
          wire,
          wireEvidence: {
            source: input.mode === "offline" ? "local_http_request" : "sdk_request_metadata",
            scope: input.mode === "offline" ? "synthetic_request_body" : "tools_only",
            status:
              wire.length === runs.reduce((sum, run) => sum + run.requests, 0)
                ? "complete"
                : wire.length
                  ? "partial"
                  : "missing",
            capturedRequests: wire.length,
            missingRequests: runs.reduce((sum, run) => sum + run.requests, 0) - wire.length,
          },
          offlineFault: input.offlineFault ?? null,
          runs,
          evidence:
            input.mode === "offline"
              ? "Scripted responses over real local HTTP and SDK transport; not LLM task completion or provider token usage."
              : "Live bounded synthetic tasks; not evidence about default Codex harness or general coding effectiveness.",
        }
      },
    })
  } finally {
    await server?.stop(true)
    await Instance.disposeAll()
    await fs.rm(directory, { recursive: true, force: true })
  }
}
