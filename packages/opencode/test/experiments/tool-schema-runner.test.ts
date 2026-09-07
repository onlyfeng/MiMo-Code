import { expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { tmpdir } from "../fixture/fixture"
import { allowedPath, runExperiment, experimentProviderOptions } from "../../script/experiments/tool-schema-runtime"
import { type Provider } from "../../src/provider"
import { ModelID, ProviderID } from "../../src/provider/schema"

test("experiment model defaults reach real SDK wire without copying transport options", async () => {
  const bodies: Record<string, unknown>[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      bodies.push((await request.json()) as Record<string, unknown>)
      return Response.json({
        id: "resp_schema",
        object: "response",
        created_at: 1,
        model: "gpt-5.1",
        status: "completed",
        output: [
          {
            id: "msg_schema",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [{ type: "output_text", text: "synthetic result", annotations: [] }],
          },
        ],
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
      })
    },
  })
  const model: Provider.Model = {
    id: ModelID.make("synthetic-alias"),
    providerID: ProviderID.make("schema"),
    name: "Synthetic options fixture",
    api: { id: "gpt-5.1", npm: "@ai-sdk/openai", url: "http://127.0.0.1" },
    capabilities: {
      toolcall: true,
      attachment: false,
      reasoning: true,
      temperature: false,
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
  try {
    for (const override of [false, true]) {
      const options = experimentProviderOptions({
        model: { ...model, options: override ? { reasoningEffort: "low" } : {} },
        sessionID: "synthetic-session",
        providerOptions: {
          setCacheKey: true,
          apiKey: "TRANSPORT_SECRET",
          baseURL: "TRANSPORT_URL",
          timeout: 30000,
          headers: { authorization: "TRANSPORT_HEADER" },
        },
      })
      await generateText({
        model: createOpenAI({ apiKey: "local-stub-only", baseURL: `http://127.0.0.1:${server.port}/v1` }).responses(
          model.api.id,
        ),
        prompt: "Synthetic options check",
        providerOptions: options,
        maxRetries: 0,
        maxOutputTokens: 1024,
      })
      expect(bodies.at(-1)?.store).toBe(false)
      expect(bodies.at(-1)?.reasoning).toEqual({ effort: override ? "low" : "medium", summary: "auto" })
      expect(bodies.at(-1)?.include).toContain("reasoning.encrypted_content")
      expect(bodies.at(-1)?.prompt_cache_key).toBe("synthetic-session")
      expect(bodies.at(-1)?.max_output_tokens).toBe(1024)
      expect(JSON.stringify(options)).not.toContain("TRANSPORT_")
      expect(JSON.stringify(bodies.at(-1))).not.toContain("TRANSPORT_")
    }
    expect(bodies).toHaveLength(2)
  } finally {
    await server.stop(true)
  }
}, 30000)

test("offline runner uses actual registry tools and SDK wire without claiming model effectiveness", async () => {
  const report = await runExperiment({ mode: "offline", cases: 1, repeats: 1 })
  expect(report.runs).toHaveLength(2)
  expect(report.runs.every((run) => run.replayCompleted)).toBe(true)
  expect(report.runs.every((run) => run.liveTaskCompleted === null && run.providerUsage === null)).toBe(true)
  expect(report.runs.every((run) => run.reads.length > 0)).toBe(true)
  expect(report.catalog.baseline.map((tool) => tool.name)).toContain("bash")
  expect(report.catalog.baseline.map((tool) => tool.name)).toContain("actor")
  expect(report.catalog.baseline.map((tool) => tool.name)).toContain("task")
  expect(report.catalog.constraintsEqual).toBe(true)
  expect(report.catalog.nonCandidatesEqual).toBe(true)
  expect(report.wire.length).toBeGreaterThan(0)
  expect(report.wire.every((request) => Array.isArray(request.body.tools))).toBe(true)
}, 60000)

test("the experiment path boundary rejects traversal, symlinks and undeclared files", async () => {
  await using root = await tmpdir()
  await using outside = await tmpdir()
  await fs.writeFile(path.join(root.path, "allowed.txt"), "allowed")
  await fs.writeFile(path.join(root.path, "private.txt"), "not part of a task")
  await fs.writeFile(path.join(outside.path, "outside.txt"), "outside")
  await fs.symlink(path.join(outside.path, "outside.txt"), path.join(root.path, "link.txt"))
  expect(await allowedPath(root.path, "allowed.txt", ["allowed.txt"], true)).toBe(true)
  expect(await allowedPath(root.path, "missing.txt", ["allowed.txt"], true)).toBe(true)
  expect(await allowedPath(root.path, "private.txt", ["allowed.txt"], true)).toBe(false)
  expect(await allowedPath(root.path, path.join(outside.path, "outside.txt"), ["outside.txt"], true)).toBe(false)
  expect(await allowedPath(root.path, "../outside.txt", ["../outside.txt"], true)).toBe(false)
  expect(await allowedPath(root.path, "link.txt", ["link.txt"], true)).toBe(false)
})

test("six scripted lookup tasks produce reproducible local replay evidence", async () => {
  const report = await runExperiment({ mode: "offline", cases: 6, repeats: 2 })
  expect(report.runs).toHaveLength(24)
  expect(report.runs.every((run) => run.replayCompleted)).toBe(true)
  expect(report.runs.every((run) => !run.validationErrors && !run.executionErrors && !run.deniedCalls)).toBe(true)
  if (process.env.MIMOCODE_SCHEMA_REPORT)
    await fs.writeFile(process.env.MIMOCODE_SCHEMA_REPORT, JSON.stringify(report, null, 2), { mode: 0o600 })
}, 60000)

test("offline step budget remains a failed replay even with a scripted provider", async () => {
  const report = await runExperiment({ mode: "offline", cases: 1, repeats: 1, maxSteps: 1 })
  expect(report.runs).toHaveLength(2)
  expect(report.runs.every((run) => run.termination === "budget_exhausted")).toBe(true)
  expect(report.runs.every((run) => !run.replayCompleted && run.liveTaskCompleted === null)).toBe(true)
}, 60000)

for (const fault of ["malformed_tool", "unknown_tool"] as const)
  test(`SDK ${fault} gets one error result and can recover on the next request`, async () => {
    const report = await runExperiment({ mode: "offline", cases: 1, repeats: 1, offlineFault: fault })
    expect(report.runs.every((run) => run.validationErrors === 1)).toBe(true)
    expect(report.runs.every((run) => run.replayCompleted && !run.deniedCalls)).toBe(true)
    for (const request of report.wire.filter((entry) => Array.isArray(entry.body.messages))) {
      const messages = request.body.messages as Array<{ role: string; tool_call_id?: string }>
      const replies = messages.filter((message) => message.role === "tool").map((message) => message.tool_call_id)
      expect(new Set(replies).size).toBe(replies.length)
    }
  }, 60000)

test("provider HTTP failure is classified without storing response secrets", async () => {
  const report = await runExperiment({ mode: "offline", cases: 1, repeats: 1, offlineFault: "http" })
  expect(report.runs.every((run) => run.termination === "provider_error")).toBe(true)
  expect(report.runs.every((run) => run.errorCategory === "http" && run.statusCode === 429)).toBe(true)
  expect(report.runs.every((run) => !run.replayCompleted && run.requests === 1)).toBe(true)
  expect(JSON.stringify(report)).not.toContain("SYNTHETIC_PROVIDER_SECRET")
}, 60000)

test("malformed provider response is a parse failure rather than a tool or HTTP error", async () => {
  const report = await runExperiment({ mode: "offline", cases: 1, repeats: 1, offlineFault: "response_parse" })
  expect(report.runs.every((run) => run.errorCategory === "response_parse")).toBe(true)
  expect(report.runs.every((run) => !run.validationErrors && !run.replayCompleted)).toBe(true)
  expect(JSON.stringify(report)).not.toContain("SYNTHETIC_PROVIDER_SECRET")
}, 60000)

test("report identifies the catalog model and honest serialized wire coverage", async () => {
  const report = await runExperiment({ mode: "offline", cases: 1, repeats: 1, seed: "identity-seed" })
  expect(report.seed).toBe("identity-seed")
  expect(report.modelIdentity).toEqual({
    providerID: "schema",
    modelID: "schema-offline",
    apiID: "schema-offline",
    npm: "@ai-sdk/openai-compatible",
    family: null,
    harnessModel: null,
    harness: "default",
  })
  expect(report.wireEvidence.status).toBe("complete")
  expect(report.wireEvidence.capturedRequests).toBe(report.runs.reduce((sum, run) => sum + run.requests, 0))
}, 60000)

test("standalone experiment cleanup releases the global runtime and exits naturally", async () => {
  const source = `
    const experiment = await import(${JSON.stringify(path.resolve("script/experiments/tool-schema-runtime.ts"))});
    await experiment.runExperiment({ mode: "offline", cases: 1, repeats: 1 });
    await experiment.disposeExperimentRuntime?.();
    console.log("experiment-cleanup-finished");
  `
  const child = Bun.spawn([process.execPath, "--eval", source], {
    cwd: process.cwd(),
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  })
  const timeout = setTimeout(() => child.kill(), 15000)
  try {
    const [code, output] = await Promise.all([child.exited, new Response(child.stdout).text()])
    expect(output).toContain("experiment-cleanup-finished")
    expect(code).toBe(0)
  } finally {
    clearTimeout(timeout)
    child.kill()
  }
}, 30000)
