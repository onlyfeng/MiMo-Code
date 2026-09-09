import { afterEach, describe, expect, test } from "bun:test"
import path from "node:path"
import { pathToFileURL } from "node:url"
import type { Config } from "../../src/config"
import { Instance } from "../../src/project/instance"
import { LLMServerModels } from "../../src/llm-server/models"
import { tmpdir } from "../fixture/fixture"

afterEach(() => Instance.disposeAll())

type Modalities = { input: ("text" | "audio")[]; output: ("text" | "audio")[] }
const chat: Modalities = { input: ["text"], output: ["text"] }
const speech: Modalities = { input: ["text"], output: ["audio"] }
const asr: Modalities = { input: ["audio"], output: ["text"] }
const multimodal: Modalities = { input: ["text", "audio"], output: ["text"] }

function config(
  models: Record<string, Modalities>,
  options: { npm?: string; baseURL?: string | null; model?: string; key?: string } = {},
): Partial<Config.Info> {
  return {
    model: options.model,
    enabled_providers: ["p"],
    provider: {
      p: {
        npm: options.npm ?? "@ai-sdk/openai-compatible",
        options: {
          ...(options.baseURL === null ? {} : { baseURL: options.baseURL ?? "http://127.0.0.1:1/v1" }),
          ...(options.key ? { apiKey: options.key } : {}),
        },
        only_configured_models: true,
        models: Object.fromEntries(Object.entries(models).map(([id, modalities]) => [id, { name: id, modalities }])),
      },
    },
  }
}

async function fixture<T>(cfg: Partial<Config.Info>, fn: () => Promise<T>) {
  await using tmp = await tmpdir({ config: cfg })
  return await Instance.provide({ directory: tmp.path, fn })
}

describe("instance model discovery", () => {
  test("lists registry models in stable order without classifying modalities or preferring a default", () =>
    fixture(config({ z: speech, b: asr, a: chat, A: chat, m: multimodal }, { model: "p/b" }), async () => {
      expect((await LLMServerModels.available(undefined, { type: "all" })).map((entry) => entry.ref)).toEqual([
        "p/A",
        "p/a",
        "p/b",
        "p/m",
        "p/z",
      ])
    }))

  test("registry discovery never initializes an SDK factory and an empty scope grants nothing", async () => {
    await using sdk = await tmpdir({
      init: (directory) =>
        Bun.write(
          path.join(directory, "scoped.ts"),
          `
        import { writeFileSync } from "node:fs"
        export function createScoped() {
          writeFileSync(${JSON.stringify(path.join(directory, "initialized"))}, "yes")
          return { speechModel(id) { return {
            specificationVersion: "v3", provider: "scoped", modelId: id,
            async doGenerate() { throw new Error("discovery must not generate audio") }
          } } }
        }
      `,
        ),
    })
    const cfg = config({ visible: chat })
    cfg.enabled_providers = ["p", "secret"]
    cfg.provider!.secret = config(
      { hidden: speech },
      { npm: pathToFileURL(path.join(sdk.path, "scoped.ts")).href },
    ).provider!.p
    await fixture(cfg, async () => {
      const listed = await LLMServerModels.available(undefined, { type: "models", models: ["p/visible"] })
      expect(await Bun.file(path.join(sdk.path, "initialized")).exists()).toBe(false)
      expect(listed.map((entry) => entry.ref)).toEqual(["p/visible"])
      expect(await LLMServerModels.available(undefined, { type: "models", models: [] })).toEqual([])
      expect(await LLMServerModels.available(undefined, { type: "models", models: ["p/unknown"] })).toEqual([])
      expect(await Bun.file(path.join(sdk.path, "initialized")).exists()).toBe(false)
      expect(
        (await LLMServerModels.available(undefined, { type: "models", models: ["secret/hidden"] })).map(
          (entry) => entry.ref,
        ),
      ).toEqual(["secret/hidden"])
      expect(await Bun.file(path.join(sdk.path, "initialized")).exists()).toBe(false)
    })
  })

  test("discovery observes the current instance provider filters and isolation", async () => {
    const cfg = config({ visible: speech, hidden: speech })
    cfg.provider!.p!.blacklist = ["hidden"]
    await fixture(cfg, async () => {
      expect((await LLMServerModels.all()).map((entry) => entry.ref)).toEqual(["p/visible"])
      expect((await LLMServerModels.available(undefined, { type: "all" })).map((entry) => entry.ref)).toEqual([
        "p/visible",
      ])
    })
    await fixture(config({ different: speech }), async () => {
      expect((await LLMServerModels.all()).map((entry) => entry.ref)).toEqual(["p/different"])
    })
    await fixture({ ...config({ hidden: speech }), disabled_providers: ["p"] }, async () => {
      expect(await LLMServerModels.all()).toEqual([])
      expect(await LLMServerModels.available(undefined, { type: "all" })).toEqual([])
    })
  })

  test("cancellation propagates instead of becoming an empty result", () =>
    fixture(config({ chat }), async () => {
      const controller = new AbortController()
      controller.abort(new Error("discovery cancelled"))
      await expect(LLMServerModels.available(controller.signal, { type: "all" })).rejects.toThrow("discovery cancelled")
    }))
})
