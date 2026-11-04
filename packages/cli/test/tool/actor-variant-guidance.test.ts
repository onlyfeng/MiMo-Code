import { describe, expect, test } from "bun:test"
import ACTOR_DESCRIPTION from "../../src/tool/actor.txt"

describe("actor variant guidance", () => {
  test("JSON guidance shows the selector, its discovery, default, and lifetime", () => {
    expect(ACTOR_DESCRIPTION).toContain("## Choosing a model and variant")
    expect(ACTOR_DESCRIPTION).toContain('"model":"ultra","variant":"high"')
    expect(ACTOR_DESCRIPTION).toContain('{"operation":{"action":"models"}}')
    expect(ACTOR_DESCRIPTION).toContain("your current variant is inherited on the same model, or on a different model that lists it")
    expect(ACTOR_DESCRIPTION).toContain("It accepts no new prompt, model, or variant.")
  })

})
