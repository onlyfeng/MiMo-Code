import { expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { GlobalBus, type GlobalEvent } from "../../src/bus/global"
import type { Config } from "../../src/config"
import { registerAdaptor } from "../../src/control-plane/adaptors"
import { Workspace } from "../../src/control-plane/workspace"
import { InstanceState } from "../../src/effect"
import { AppLayer } from "../../src/effect/app-runtime"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Flag } from "../../src/flag/flag"
import { Server } from "../../src/server/server"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageTable, SessionTable } from "../../src/session/session.sql"
import { Database } from "../../src/storage"
import { provideTmpdirInstance, provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { TestLLMServer } from "../lib/llm-server"

const it = testEffect(Layer.mergeAll(AppLayer, CrossSpawnSpawner.defaultLayer, TestLLMServer.layer))
const model = { providerID: "test", modelID: "model" }
const other = { providerID: "other", modelID: "model" }

test("model selection OpenAPI requires the body and selected model", async () => {
  const doc = await Server.openapi()
  expect(doc.paths?.["/experimental/model-selection"]?.post?.requestBody).toMatchObject({
    required: true,
    content: { "application/json": { schema: { required: ["model"] } } },
  })
})

function config(url: string, agent: NonNullable<Config.Info["agent"]>[string]): Partial<Config.Info> {
  return {
    model: "test/model",
    enabled_providers: ["test", "other"],
    agent: { build: agent },
    model_groups: { example: { default: "test/model", models: ["test/model", "other/model"] } },
    provider: Object.fromEntries(
      ["test", "other"].map((id) => [
        id,
        {
          npm: "@ai-sdk/openai-compatible",
          env: [],
          options: { baseURL: url, apiKey: "test-key" },
          models: {
            model: {
              name: "Test model",
              tool_call: true,
              limit: { context: 32000, output: 4000 },
              variants: { low: { reasoningEffort: "low" }, high: { reasoningEffort: "high" } },
            },
          },
        },
      ]),
    ),
  }
}

function request(directory: string, pathname: string, body: unknown, workspace?: string) {
  const query = new URLSearchParams({ directory, ...(workspace ? { workspace } : {}) })
  return Effect.promise(() =>
    Promise.resolve(
      Server.Default().app.request(`${pathname}?${query}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  )
}

for (const scenario of [
  { name: "unconfigured built-in tier", agent: { model: "standard", variant: "high" }, selected: model, want: "high" },
  { name: "configured group default", agent: { model: "example", variant: "high" }, selected: model, want: "high" },
  {
    name: "group member on another provider",
    agent: { model: "example", variant: "high" },
    selected: other,
    want: undefined,
  },
  {
    name: "explicit variant",
    agent: { model: "test/model", variant: "high" },
    selected: model,
    variant: "low",
    want: "low",
  },
  {
    name: "unsupported agent variant",
    agent: { model: "test/model", variant: "missing" },
    selected: model,
    want: undefined,
  },
  {
    name: "explicit empty variant",
    agent: { model: "test/model", variant: "high" },
    selected: model,
    variant: "",
    want: "",
  },
]) {
  it.live(`model selection preview agrees with persisted prompt for ${scenario.name}`, () =>
    provideTmpdirServer(
      ({ dir, llm }) =>
        Effect.gen(function* () {
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "Model selection test" })
          const input = { agent: "build", model: scenario.selected, variant: scenario.variant }
          const response = yield* request(dir, "/experimental/model-selection", input)
          expect(response.status).toBe(200)
          const selection = yield* Effect.promise(() => response.json())
          expect(selection).toEqual({
            ...scenario.selected,
            ...(scenario.want === undefined ? {} : { variant: scenario.want }),
          })
          expect(yield* sessions.messages({ sessionID: session.id })).toEqual([])
          expect(yield* llm.calls).toBe(0)

          const submitted = yield* request(dir, `/session/${session.id}/message`, {
            ...input,
            noReply: true,
            parts: [{ type: "text", text: "Check the selected model." }],
          })
          expect(submitted.status).toBe(200)
          const result = yield* Effect.promise(() => submitted.json())
          const user = MessageV2.User.parse(result.info)
          expect(user.model.variant).toBe(scenario.want)
          expect(JSON.parse(JSON.stringify(user.model))).toEqual(selection)
          const persisted = yield* sessions.messages({ sessionID: session.id })
          expect(persisted).toHaveLength(1)
          expect(persisted[0].info).toMatchObject({ role: "user", model: user.model })
        }),
      { git: true, root: "cwd", config: (url) => config(url, scenario.agent) },
    ),
  )
}

it.live("model selection preview defaults its agent and never admits a session or publishes session events", () =>
  provideTmpdirServer(
    ({ dir, llm }) =>
      Effect.gen(function* () {
        const before = Database.use((db) => ({
          sessions: db.select({ id: SessionTable.id }).from(SessionTable).all(),
          messages: db.select({ id: MessageTable.id }).from(MessageTable).all(),
        }))
        const events: string[] = []
        const listener = (event: GlobalEvent) => {
          if (event.directory === dir && event.payload.type.startsWith("session.")) events.push(event.payload.type)
        }
        GlobalBus.on("event", listener)
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            GlobalBus.off("event", listener)
          }),
        )

        const valid = yield* request(dir, "/experimental/model-selection", { model })
        expect(valid.status).toBe(200)
        expect(yield* Effect.promise(() => valid.json())).toEqual({ ...model, variant: "high" })
        const unknown = yield* request(dir, "/experimental/model-selection", { agent: "missing", model })
        expect(unknown.status).toBe(404)
        for (const body of [{}, { model: {} }, { model, variant: 4 }, { model, agent: null }]) {
          const invalid = yield* request(dir, "/experimental/model-selection", body)
          expect(invalid.status).toBe(400)
        }
        expect(
          Database.use((db) => ({
            sessions: db.select({ id: SessionTable.id }).from(SessionTable).all(),
            messages: db.select({ id: MessageTable.id }).from(MessageTable).all(),
          })),
        ).toEqual(before)
        expect(events).toEqual([])
        expect(yield* llm.calls).toBe(0)
      }),
    { git: true, root: "cwd", config: (url) => config(url, { model: "standard", variant: "high" }) },
  ),
)

it.live("model selection preview resolves identical selectors in the requested directory", () =>
  provideTmpdirServer(
    ({ dir, llm }) =>
      provideTmpdirInstance(
        (otherDir) =>
          Effect.gen(function* () {
            for (const [directory, variant] of [
              [dir, "high"],
              [otherDir, "low"],
              [dir, "high"],
            ]) {
              const response = yield* request(directory, "/experimental/model-selection", { agent: "build", model })
              expect(response.status).toBe(200)
              expect(yield* Effect.promise(() => response.json())).toEqual({ ...model, variant })
            }
            expect(yield* llm.calls).toBe(0)
          }),
        { git: true, root: "cwd", config: config(llm.url, { model: "standard", variant: "low" }) },
      ),
    { git: true, root: "cwd", config: (url) => config(url, { model: "standard", variant: "high" }) },
  ),
)

it.live("model selection preview follows the workspace used by the submitted session", () =>
  provideTmpdirServer(
    ({ dir, llm }) =>
      Effect.gen(function* () {
        const projectID = (yield* InstanceState.context).project.id
        const experimental = Flag.MIMOCODE_EXPERIMENTAL_WORKSPACES
        Flag.MIMOCODE_EXPERIMENTAL_WORKSPACES = true
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            Flag.MIMOCODE_EXPERIMENTAL_WORKSPACES = experimental
          }),
        )
        yield* provideTmpdirInstance(
          (workspaceDir) =>
            Effect.gen(function* () {
              registerAdaptor(projectID, "model-preview", {
                name: "Model preview workspace",
                description: "Local workspace for model selection routing",
                configure: (info) => ({ ...info, directory: workspaceDir }),
                async create() {},
                async remove() {},
                target: () => ({ type: "local", directory: workspaceDir }),
              })
              const workspace = yield* Effect.promise(() =>
                Workspace.create({ type: "model-preview", branch: null, extra: null, projectID }),
              )
              yield* Effect.addFinalizer(() => Effect.promise(() => Workspace.remove(workspace.id)))

              const input = { agent: "build", model }
              const base = yield* request(dir, "/experimental/model-selection", input)
              expect(base.status).toBe(200)
              expect(yield* Effect.promise(() => base.json())).toEqual({ ...model, variant: "high" })
              const preview = yield* request(dir, "/experimental/model-selection", input, workspace.id)
              expect(preview.status).toBe(200)
              const selection = yield* Effect.promise(() => preview.json())
              expect(selection).toEqual({ ...model, variant: "low" })

              const created = yield* request(dir, "/session", { title: "Workspace model selection" }, workspace.id)
              expect(created.status).toBe(200)
              const session = Session.Info.parse(yield* Effect.promise(() => created.json()))
              expect(session.workspaceID).toBe(workspace.id)
              expect(session.directory).toBe(workspaceDir)
              // The session route discovers its workspace from persisted session
              // ownership; the preview route must receive it explicitly above.
              const submitted = yield* request(dir, `/session/${session.id}/message`, {
                ...input,
                noReply: true,
                parts: [{ type: "text", text: "Check workspace model selection." }],
              })
              expect(submitted.status).toBe(200)
              const result = yield* Effect.promise(() => submitted.json())
              const user = MessageV2.User.parse(result.info)
              expect(JSON.parse(JSON.stringify(user.model))).toEqual(selection)
              const persisted = yield* (yield* Session.Service).messages({ sessionID: session.id })
              expect(persisted).toHaveLength(1)
              expect(persisted[0].info).toMatchObject({ role: "user", model: selection })
              expect(yield* llm.calls).toBe(0)
            }),
          { git: true, root: "cwd", config: config(llm.url, { model: "standard", variant: "low" }) },
        )
      }),
    { git: true, root: "cwd", config: (url) => config(url, { model: "standard", variant: "high" }) },
  ),
)
