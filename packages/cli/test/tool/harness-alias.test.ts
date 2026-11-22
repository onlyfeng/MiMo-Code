import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { ConfigProvider } from "../../src/config/provider"
import { Provider } from "../../src/provider"
import { Plugin } from "../../src/plugin"
import { Global } from "../../src/global"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { SystemPrompt } from "../../src/session/system"
import { SessionPrefixSnapshot } from "../../src/session/prefix-snapshot"
import { Agent } from "../../src/agent/agent"
import { ToolRegistry } from "../../src/tool"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { ProviderTest } from "../fake/provider"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const saved = process.env.MIMOCODE_CODEX_MODE
beforeEach(() => {
  delete process.env.MIMOCODE_CODEX_MODE
})
afterEach(() => {
  if (saved === undefined) delete process.env.MIMOCODE_CODEX_MODE
  else process.env.MIMOCODE_CODEX_MODE = saved
})

const it = testEffect(
  Layer.mergeAll(
    Provider.defaultLayer,
    Plugin.defaultLayer,
    ToolRegistry.defaultLayer,
    Agent.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
  ),
)

describe("legacy GPT harness aliases with explicit harness selection", () => {
  test("retains only a canonical modern GPT target in configuration", () => {
    for (const harness_model of ["gpt-5", "gpt-5.6-sol", "gpt-6-astra", "gpt-10.1-codex"]) {
      expect(ConfigProvider.Model.zod.parse({ harness_model })).toEqual({ harness_model })
    }
    expect(ConfigProvider.Model.zod.parse({})).toEqual({})
    for (const harness_model of [
      "",
      "gpt",
      "GPT-5",
      " gpt-5",
      "gpt-5 ",
      "vendor/gpt-5",
      "gpt-5*",
      "gpt-4o",
      "gpt-4.1",
      "gpt-oss-120b",
      "gpt-5-oss",
      "gpt-5-mimo",
      "mimo-v2.6",
    ]) {
      expect(ConfigProvider.Model.zod.safeParse({ harness_model }).success).toBe(false)
    }
  })

  test("keeps legacy aliases on the default prompt until the session opts in", () => {
    const model = ProviderTest.model({
      id: ModelID.make("deployment"),
      api: { ...ProviderTest.model().api, id: "vendor-slot-17" },
      family: "opaque",
      harness_model: "gpt-5.6-sol",
    })
    expect(SystemPrompt.provider(model)[0]).not.toContain("You are Codex")
    expect(SystemPrompt.provider(model, "codex")[0]).toContain("You are Codex")
    expect(SystemPrompt.provider(model)).toEqual(SystemPrompt.provider({ ...model, harness_model: undefined }))
    expect(SystemPrompt.provider({ ...model, harness_model: undefined })[0]).not.toContain("You are Codex")
    expect(SystemPrompt.provider({ ...model, harness_model: undefined, name: "GPT-5.6 Sol" })[0]).not.toContain(
      "You are Codex",
    )
  })

  test("model identity cannot enable or veto the session harness", () => {
    for (const id of ["gpt-5.6-sol", "mimo-v2.6", "gpt-oss-120b"]) {
      const model = ProviderTest.model({ id: ModelID.make(id), family: id })
      expect(SystemPrompt.provider(model)[0]).not.toContain("You are Codex")
      expect(SystemPrompt.provider(model, "codex")[0]).toContain("You are Codex")
    }
  })

  test("cache profiles distinguish trusted targets without changing the unconfigured profile", () => {
    const profile = {
      providerID: "p",
      modelID: "opaque",
      modelAPIID: "slot",
      modelFamily: "family",
      agent: "build",
      agentID: "main",
      harness: "auto",
      systemMode: "append",
      system: "",
      permission: [],
    }
    expect(SessionPrefixSnapshot.profileKey(profile)).toBe(
      SessionPrefixSnapshot.profileKey({ ...profile, harnessModel: undefined }),
    )
    expect(SessionPrefixSnapshot.profileKey(profile)).not.toBe(
      SessionPrefixSnapshot.profileKey({ ...profile, harnessModel: "gpt-5.6-sol" }),
    )
    expect(SessionPrefixSnapshot.profileKey({ ...profile, harnessModel: "gpt-5.6-sol" })).not.toBe(
      SessionPrefixSnapshot.profileKey({ ...profile, harnessModel: "gpt-6-astra" }),
    )
  })

  it.live(
    "retains configured identity while the actual tool registry requires explicit Codex selection",
    () =>
      provideTmpdirInstance(
        () =>
          Effect.gen(function* () {
            const providers = yield* Provider.Service
            const model = yield* providers.getModel(ProviderID.make("local"), ModelID.make("opaque"))
            expect(model.harness_model).toBe("gpt-5.6-sol")
            expect(model.api.id).toBe("vendor-slot-17")
            expect(model.name).toBe("Local deployment")
            expect(model.options).not.toHaveProperty("harness_model")
            expect(SystemPrompt.provider(model)[0]).not.toContain("You are Codex")
            expect(SystemPrompt.provider(model, "codex")[0]).toContain("You are Codex")
            const registry = yield* ToolRegistry.Service
            const agent = yield* (yield* Agent.Service).get("general")
            const input = {
              providerID: model.providerID,
              modelID: model.id,
              agent,
            }
            const tools = (yield* registry.tools(input)).map((tool) => tool.id)
            expect(tools).toContain("edit")
            expect(tools).toContain("read")
            expect(tools).not.toContain("apply_patch")
            process.env.MIMOCODE_CODEX_MODE = "true"
            const fromProcess = (yield* registry.tools(input)).map((tool) => tool.id)
            expect(fromProcess).toContain("exec")
            expect(fromProcess).not.toContain("edit")
            const defaults = (yield* registry.tools({ ...input, harness: "default" })).map((tool) => tool.id)
            expect(defaults).toEqual(tools)
            process.env.MIMOCODE_CODEX_MODE = "false"
            const codex = { ...input, harness: "codex" as const }
            const compact = (yield* registry.tools(codex)).map((tool) => tool.id)
            expect(compact).toContain("exec")
            expect(compact).not.toContain("apply_patch")
            expect(compact).not.toContain("edit")
            expect((yield* registry.registered(codex)).map((tool) => tool.id)).toContain("apply_patch")
          }),
        {
          config: {
            provider: {
              local: {
                npm: "@ai-sdk/openai-compatible",
                options: { baseURL: "http://127.0.0.1:1/v1" },
                models: { opaque: { id: "vendor-slot-17", name: "Local deployment", harness_model: "gpt-5.6-sol" } },
              },
            },
          },
        },
      ),
  )

  it.live("keeps explicit trust after plugin replacement and strips unconfigured plugin claims", () =>
    provideTmpdirInstance((directory) =>
      Effect.gen(function* () {
        yield* Effect.promise(async () => {
          const plugin = path.join(directory, "models.ts")
          await Bun.write(
            plugin,
            `export default async () => ({ config(config) {
          config.provider.local.models.trusted.harness_model = "gpt-6-astra"
          config.provider.local.models.opaque.harness_model = "gpt-6-astra"
        }, provider: { id: "local", models(provider) {
          return Object.fromEntries(Object.entries(provider.models).map(([id, model]) => [id, { ...model, name: "replaced by plugin", harness_model: "gpt-6-astra" }]))
        } } })`,
          )
          await Bun.write(
            path.join(directory, "mimocode.json"),
            JSON.stringify({
              plugin: [pathToFileURL(plugin).href],
              provider: {
                local: {
                  npm: "@ai-sdk/openai-compatible",
                  models: { trusted: { harness_model: "gpt-5.6-sol" }, opaque: {} },
                },
              },
            }),
          )
        })
        const plugins = yield* Plugin.Service
        yield* plugins.list()
        const providers = yield* Provider.Service
        const trusted = yield* providers.getModel(ProviderID.make("local"), ModelID.make("trusted"))
        const opaque = yield* providers.getModel(ProviderID.make("local"), ModelID.make("opaque"))
        expect(trusted.name).toBe("replaced by plugin")
        expect(trusted.harness_model).toBe("gpt-5.6-sol")
        expect(opaque.harness_model).toBeUndefined()
      }),
    ),
  )

  it.live(
    "does not grant a second instance trust from plugin mutations of cached global config",
    () =>
      provideTmpdirInstance((directory) =>
        Effect.gen(function* () {
          const file = path.join(Global.Path.config, "mimocode.json")
          yield* Effect.acquireRelease(
            Effect.promise(async () => {
              const previous = (await Bun.file(file).exists()) ? await Bun.file(file).text() : undefined
              const plugin = path.join(directory, "global-models.ts")
              await Bun.write(
                plugin,
                `export default async () => ({ config(config) {
                config.provider.local.models.trusted.harness_model = "gpt-6-astra"
                config.provider.local.models.opaque.harness_model = "gpt-6-astra"
              } })`,
              )
              await Bun.write(
                file,
                JSON.stringify({
                  plugin: [pathToFileURL(plugin).href],
                  provider: {
                    local: {
                      npm: "@ai-sdk/openai-compatible",
                      models: { trusted: { harness_model: "gpt-5.6-sol" }, opaque: {} },
                    },
                  },
                }),
              )
              return previous
            }),
            (previous) =>
              Effect.promise(() =>
                previous === undefined ? fs.rm(file, { force: true }) : fs.writeFile(file, previous),
              ),
          )
          const inspect = () =>
            provideTmpdirInstance(() =>
              Effect.gen(function* () {
                yield* (yield* Plugin.Service).list()
                const providers = yield* Provider.Service
                const trusted = yield* providers.getModel(ProviderID.make("local"), ModelID.make("trusted"))
                const opaque = yield* providers.getModel(ProviderID.make("local"), ModelID.make("opaque"))
                return { trusted: trusted.harness_model, opaque: opaque.harness_model }
              }),
            )
          expect(yield* inspect()).toEqual({ trusted: "gpt-5.6-sol", opaque: undefined })
          expect(yield* inspect()).toEqual({ trusted: "gpt-5.6-sol", opaque: undefined })
        }),
      ),
    30000,
  )
})
