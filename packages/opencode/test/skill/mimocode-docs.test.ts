import { describe, expect, test } from "bun:test"
import path from "path"

const root = path.resolve(import.meta.dir, "../../src/skill/builtin/.bundle/mimocode-docs")

describe("mimocode-docs provider guidance", () => {
  test("routes provider requests to the dedicated reference", async () => {
    const skill = await Bun.file(path.join(root, "SKILL.md")).text()

    expect(skill).toContain("@reference/providers.md")
    expect(skill).toContain("Never recursively search the user's home directory")
    expect(skill).toContain("Don't invent config keys, model limits")
    expect(skill).toContain("research-experiment")
    expect(skill).not.toContain("SQLite FTS5 across sessions")
  })

  test("documents the implemented OpenAI-compatible adapter and safe merge rules", async () => {
    const providers = await Bun.file(path.join(root, "reference/providers.md")).text()

    expect(providers).toContain('"npm": "@ai-sdk/openai-compatible"')
    expect(providers).toContain("Do not substitute `@ai-sdk/compatible-openai`")
    expect(providers).toContain("If the endpoint matches but the supplied credential differs, create a distinct provider ID")
    expect(providers).toContain("Do not guess `limit.context`, `limit.output`")
    expect(providers).toContain("mimo models PROVIDER_ID")
  })

  test("documents native Anthropic Messages API configuration", async () => {
    const providers = await Bun.file(path.join(root, "reference/providers.md")).text()

    expect(providers).toContain('"npm": "@ai-sdk/anthropic"')
    expect(providers).toContain("the adapter appends `/messages`")
    expect(providers).toContain("not the model name")
    expect(providers).toContain("even when the upstream model ID contains `claude`")
    expect(providers).toContain("`x-api-key`, and `anthropic-version`")
  })

  test("documents the effective global config precedence", async () => {
    const providers = await Bun.file(path.join(root, "reference/providers.md")).text()

    expect(providers).toContain("`config.json`, `mimocode.json`, then `mimocode.jsonc`; later files win")
    expect(providers).toContain("create `mimocode.jsonc` when none exists")
  })
})
