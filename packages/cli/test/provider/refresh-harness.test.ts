// FD-005 boundary for docs/compose/spec/provider-local-refresh.md: a model refresh
// keeps harness alias trust bound to the freshly parsed configuration.
import { afterEach, expect, test } from "bun:test"
import path from "node:path"
import { tmpdir } from "../fixture/fixture"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instance } from "../../src/project/instance"
import { Config } from "../../src/config"
import { Provider } from "../../src/provider"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { refreshProviders } from "../../src/provider/refresh"

const id = ProviderID.make("refresh-test")
const modelId = ModelID.make("example")
const config = (key: string, harness_model?: string) => ({
  provider: {
    [id]: {
      npm: "@ai-sdk/openai-compatible",
      options: { apiKey: key, baseURL: "http://127.0.0.1:1/v1" },
      models: { [modelId]: { name: "Example", harness_model, limit: { context: 1000, output: 100 } } },
    },
  },
})
const model = () =>
  AppRuntime.runPromise(Provider.Service.use((provider) => provider.getModel(id, modelId)))
afterEach(async () => {
  await Instance.disposeAll()
})

test("refresh keeps a declared harness alias and adopts its removal", async () => {
  await using tmp = await tmpdir({ config: config("before", "gpt-5.6-sol") })
  expect((await Instance.provide({ directory: tmp.path, fn: model })).harness_model).toBe("gpt-5.6-sol")
  await Bun.write(path.join(tmp.path, "mimocode.json"), JSON.stringify(config("after", "gpt-5.6-sol")))
  expect(await refreshProviders()).toEqual({ state: "applied" })
  const refreshed = await Instance.provide({ directory: tmp.path, fn: model })
  expect(refreshed.harness_model).toBe("gpt-5.6-sol")
  await Bun.write(path.join(tmp.path, "mimocode.json"), JSON.stringify(config("removed")))
  expect(await refreshProviders()).toEqual({ state: "applied" })
  expect((await Instance.provide({ directory: tmp.path, fn: model })).harness_model).toBeUndefined()
})

test("a Provider first read after a Config-only refresh keeps the declared alias", async () => {
  await using tmp = await tmpdir({ config: config("before") })
  await Instance.provide({ directory: tmp.path, fn: () => AppRuntime.runPromise(Config.Service.use((s) => s.get())) })
  await Bun.write(path.join(tmp.path, "mimocode.json"), JSON.stringify(config("after", "gpt-5.6-sol")))
  expect(await refreshProviders()).toEqual({ state: "applied" })
  expect((await Instance.provide({ directory: tmp.path, fn: model })).harness_model).toBe("gpt-5.6-sol")
})
