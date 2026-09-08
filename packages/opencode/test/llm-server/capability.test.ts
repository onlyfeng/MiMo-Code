import { afterEach, describe, expect, test } from "bun:test"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { Effect } from "effect"
import { Auth } from "../../src/auth"
import type { Config } from "../../src/config"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instance } from "../../src/project/instance"
import { Provider } from "../../src/provider"
import { LLMServerCapability } from "../../src/llm-server/capability"
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

function view(candidates: LLMServerCapability.Candidate[]) {
  return candidates.map(({ ref, dedicated }) => ({ ref, dedicated }))
}

describe("instance capability discovery", () => {
  test("finds speech by resolved modalities without requiring an API key", () =>
    fixture(config({ misleading_chat_name: speech, tts_named_chat: chat }), async () => {
      expect(view(await LLMServerCapability.resolve("speech"))).toEqual([
        { ref: "p/misleading_chat_name", dedicated: true },
      ])
      expect(view(await LLMServerCapability.resolve("chat"))).toEqual([{ ref: "p/tts_named_chat", dedicated: true }])
    }))

  test("dedicated ASR ranks ahead of a preferred multimodal fallback", () =>
    fixture(config({ z_asr: asr, a_fallback: multimodal }, { model: "p/a_fallback" }), async () => {
      expect(view(await LLMServerCapability.resolve("transcription"))).toEqual([
        { ref: "p/z_asr", dedicated: true },
        { ref: "p/a_fallback", dedicated: false },
      ])
    }))

  test("the configured default wins among equals and remaining refs sort reproducibly", () =>
    fixture(config({ z: chat, b: chat, a: chat }, { model: "p/b" }), async () => {
      expect((await LLMServerCapability.resolve("chat")).map((entry) => entry.ref)).toEqual(["p/b", "p/a", "p/z"])
      expect((await LLMServerCapability.resolve("chat")).map((entry) => entry.ref)).toEqual(["p/b", "p/a", "p/z"])
    }))

  test.each(["speech-only", "unsupported-model"])(
    "chat discovery excludes an unusable SDK factory: %s",
    async (mode) => {
      await using sdk = await tmpdir({
        init: (directory) =>
          Bun.write(
            path.join(directory, "unusable.ts"),
            mode === "speech-only"
              ? `export function createSDK() { return { speechModel() { throw new Error("not a chat factory") } } }`
              : `export function createSDK() { return { languageModel() { throw new Error("UnsupportedModel") } } }`,
          ),
      })
      await fixture(config({ chat }, { npm: pathToFileURL(path.join(sdk.path, "unusable.ts")).href }), async () => {
        const listed = await LLMServerCapability.all()
        expect(listed.map((entry) => entry.ref)).toEqual(["p/chat"])
        await expect(
          AppRuntime.runPromise(
            Effect.gen(function* () {
              return yield* (yield* Provider.Service).getLanguage(listed[0].model)
            }),
          ),
        ).rejects.toThrow(mode === "speech-only" ? "languageModel" : "UnsupportedModel")
        expect(await LLMServerCapability.resolve("chat")).toEqual([])
        expect(await LLMServerCapability.available(undefined, { type: "models", models: ["p/chat"] })).toEqual([])
        expect(LLMServerCapability.explain("chat", listed)).toContain("language factory")
      })
    },
  )

  test("chat discovery preserves raw transcription when the configured language loader is unavailable", async () => {
    // The actual openai provider loader calls sdk.responses; this configured
    // OpenAI-compatible SDK exposes languageModel instead. Raw ASR is separate.
    const cfg = config({ chat, multimodal })
    cfg.enabled_providers = ["openai"]
    cfg.provider = { openai: cfg.provider!.p }
    Auth.inject(JSON.stringify({ openai: { type: "api", key: "local-fixture-key" } }))
    try {
      await fixture(cfg, async () => {
        const listed = await LLMServerCapability.all()
        await expect(
          AppRuntime.runPromise(
            Effect.gen(function* () {
              return yield* (yield* Provider.Service).getLanguage(listed[0].model)
            }),
          ),
        ).rejects.toThrow("responses")
        expect(await LLMServerCapability.resolve("chat")).toEqual([])
        expect(view(await LLMServerCapability.resolve("transcription"))).toEqual([
          { ref: "openai/multimodal", dedicated: false },
        ])
        expect((await LLMServerCapability.available(undefined, { type: "all" })).map((entry) => entry.ref)).toEqual([
          "openai/multimodal",
        ])
      })
    } finally {
      Auth.inject(undefined)
    }
  })

  test("chat discovery resolves the real factory without invoking generation", async () => {
    await using sdk = await tmpdir({
      init: (directory) =>
        Bun.write(
          path.join(directory, "language.ts"),
          `
        import { writeFileSync } from "node:fs"
        export function createSDK() { return { languageModel(id) {
          writeFileSync(${JSON.stringify(path.join(directory, "initialized"))}, "yes")
          return { specificationVersion: "v3", provider: "local", modelId: id, supportedUrls: {},
            doGenerate() { writeFileSync(${JSON.stringify(path.join(directory, "generated"))}, "yes"); throw new Error("generation forbidden") },
            doStream() { writeFileSync(${JSON.stringify(path.join(directory, "generated"))}, "yes"); throw new Error("generation forbidden") }
          }
        } } }
      `,
        ),
    })
    await fixture(config({ chat }, { npm: pathToFileURL(path.join(sdk.path, "language.ts")).href }), async () => {
      expect(view(await LLMServerCapability.resolve("chat"))).toEqual([{ ref: "p/chat", dedicated: true }])
      expect(await Bun.file(path.join(sdk.path, "initialized")).exists()).toBe(true)
      expect(await Bun.file(path.join(sdk.path, "generated")).exists()).toBe(false)
    })
  })

  test("cancellation during chat factory resolution cannot become an empty candidate result", async () => {
    await using sdk = await tmpdir({
      init: (directory) =>
        Bun.write(
          path.join(directory, "pending.ts"),
          `
        import { writeFileSync } from "node:fs"
        export function createSDK() { return { async languageModel() {
          writeFileSync(${JSON.stringify(path.join(directory, "initialized"))}, "yes")
          await new Promise(resolve => setTimeout(resolve, 100))
          throw new Error("UnsupportedModel after cancellation")
        } } }
      `,
        ),
    })
    await fixture(config({ chat }, { npm: pathToFileURL(path.join(sdk.path, "pending.ts")).href }), async () => {
      const controller = new AbortController()
      const pending = LLMServerCapability.resolve("chat", controller.signal)
      const caught = pending.catch((error: unknown) => error)
      const deadline = Date.now() + 2000
      while (!(await Bun.file(path.join(sdk.path, "initialized")).exists()) && Date.now() < deadline) await Bun.sleep(5)
      expect(await Bun.file(path.join(sdk.path, "initialized")).exists()).toBe(true)
      controller.abort(new Error("chat discovery cancelled"))
      expect(await caught).toMatchObject({ message: "chat discovery cancelled" })
    })
  })

  test("Google offers its multimodal SDK fallback but not plain chat or dedicated ASR", () =>
    fixture(config({ chat, asr, multimodal }, { npm: "@ai-sdk/google" }), async () => {
      expect((await LLMServerCapability.resolve("transcription")).map((item) => item.ref)).toEqual(["p/multimodal"])
      expect(
        (await LLMServerCapability.available(undefined, { type: "all" })).map((entry) => entry.ref).sort(),
      ).toEqual(["p/chat", "p/multimodal"])
    }))

  test("raw audio without an explicit valid HTTP base URL is unavailable", async () => {
    for (const baseURL of [null, "not-a-url", "ftp://localhost/audio", "http://localhost/v1?wrong=path"]) {
      await fixture(config({ tts: speech, asr, multimodal }, { baseURL }), async () => {
        expect(await LLMServerCapability.resolve("speech")).toEqual([])
        expect(await LLMServerCapability.resolve("transcription")).toEqual([])
        expect((await LLMServerCapability.available(undefined, { type: "all" })).map((entry) => entry.ref)).toEqual([
          "p/multimodal",
        ])
      })
    }
  })

  test("a real native speech factory remains offerable beyond the raw package list", async () => {
    await using sdk = await tmpdir({
      init: (directory) =>
        Bun.write(
          path.join(directory, "native.ts"),
          `
        export function createNative() {
          return { speechModel(id) { return {
            specificationVersion: "v3", provider: "native", modelId: id,
            async doGenerate() { throw new Error("discovery must not generate audio") }
          } } }
        }
      `,
        ),
    })
    await fixture(
      config({ tts: speech }, { npm: pathToFileURL(path.join(sdk.path, "native.ts")).href, baseURL: null }),
      async () => {
        expect(view(await LLMServerCapability.resolve("speech"))).toEqual([{ ref: "p/tts", dedicated: true }])
      },
    )
  })

  test("model scope filters before initializing a hidden audio factory and an empty scope grants nothing", async () => {
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
      const listed = await LLMServerCapability.available(undefined, { type: "models", models: ["p/visible"] })
      expect(await Bun.file(path.join(sdk.path, "initialized")).exists()).toBe(false)
      expect(listed.map((entry) => entry.ref)).toEqual(["p/visible"])
      expect(await LLMServerCapability.available(undefined, { type: "models", models: [] })).toEqual([])
      expect(await LLMServerCapability.available(undefined, { type: "models", models: ["p/unknown"] })).toEqual([])
      expect(await Bun.file(path.join(sdk.path, "initialized")).exists()).toBe(false)
      expect(
        (await LLMServerCapability.available(undefined, { type: "models", models: ["secret/hidden"] })).map(
          (entry) => entry.ref,
        ),
      ).toEqual(["secret/hidden"])
      expect(await Bun.file(path.join(sdk.path, "initialized")).exists()).toBe(true)
    })
  })

  test("discovery observes the current instance provider filters and isolation", async () => {
    const cfg = config({ visible: speech, hidden: speech })
    cfg.provider!.p!.blacklist = ["hidden"]
    await fixture(cfg, async () => {
      expect((await LLMServerCapability.all()).map((entry) => entry.ref)).toEqual(["p/visible"])
      expect((await LLMServerCapability.available(undefined, { type: "all" })).map((entry) => entry.ref)).toEqual([
        "p/visible",
      ])
    })
    await fixture(config({ different: speech }), async () => {
      expect((await LLMServerCapability.all()).map((entry) => entry.ref)).toEqual(["p/different"])
    })
    await fixture({ ...config({ hidden: speech }), disabled_providers: ["p"] }, async () => {
      expect(await LLMServerCapability.all()).toEqual([])
      expect(await LLMServerCapability.available(undefined, { type: "all" })).toEqual([])
    })
  })

  test("explains missing declarations separately from unsupported transport", async () => {
    await fixture(config({ chat }), async () => {
      expect(LLMServerCapability.explain("speech", await LLMServerCapability.all())).toContain("no speech model")
      expect(LLMServerCapability.explain("speech", await LLMServerCapability.all())).toContain("modalities")
    })
    await fixture(config({ tts: speech }, { npm: "@ai-sdk/google", key: "must-not-appear" }), async () => {
      const message = LLMServerCapability.explain("speech", await LLMServerCapability.all())
      expect(message).toContain("none is reachable")
      expect(message).toContain("@ai-sdk/google")
      expect(message).not.toContain("must-not-appear")
    })
  })

  test("cancellation propagates instead of becoming an empty capability result", () =>
    fixture(config({ tts: speech }), async () => {
      const controller = new AbortController()
      controller.abort(new Error("discovery cancelled"))
      await expect(LLMServerCapability.resolve("speech", controller.signal)).rejects.toThrow("discovery cancelled")
    }))
})
