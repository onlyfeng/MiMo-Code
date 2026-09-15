import { describe, expect, test } from "bun:test"
import ACTOR_DESCRIPTION from "../../src/tool/actor.txt"
import ACTOR_SHELL_DESCRIPTION from "../../src/tool/actor.shell.txt"

describe("actor variant guidance", () => {
  test("JSON guidance shows the selector, its discovery, default, and lifetime", () => {
    expect(ACTOR_DESCRIPTION).toContain("## Choosing a model and variant")
    expect(ACTOR_DESCRIPTION).toContain('"model":"ultra","variant":"high"')
    expect(ACTOR_DESCRIPTION).toContain('{"operation":{"action":"models"}}')
    expect(ACTOR_DESCRIPTION).toContain("Your own current variant is not inherited")
    expect(ACTOR_DESCRIPTION).toContain("It accepts no new prompt, model, or variant.")
  })

  test("shell guidance advertises --variant for both launch forms and resume", () => {
    expect(ACTOR_SHELL_DESCRIPTION).toMatch(/^\s*actor spawn <subagent_type>[^\n]*\[--model <ref>\] \[--variant <name>\]/m)
    expect(ACTOR_SHELL_DESCRIPTION).toMatch(/^\s*actor run <subagent_type>[^\n]*\[--model <ref>\] \[--variant <name>\]/m)
    expect(ACTOR_SHELL_DESCRIPTION).toMatch(/^\s*actor spawn [^\n]*--variant high$/m)
    expect(ACTOR_SHELL_DESCRIPTION).toContain("No model/variant/prompt overrides.")
  })
})
