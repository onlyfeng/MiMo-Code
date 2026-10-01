import { expect, test } from "bun:test"

test("actor tool loads without reading tool controls before initialization", async () => {
  expect(await import("../../src/tool/actor")).toHaveProperty("ActorTool")
})
