/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import { ExecExpandedBody } from "../../../src/cli/cmd/tui/routes/session/exec-expanded"

const colors = {
  muted: RGBA.fromHex("#808080"),
  text: RGBA.fromHex("#eeeeee"),
  error: RGBA.fromHex("#ff0000"),
}

test("expanded exec keeps ANSI-free outer output when there are no subtools", async () => {
  const app = await testRender(
    () => (
      <ExecExpandedBody
        code="return 42"
        output={"\u001b[31mouter-only result\u001b[0m"}
        columns={80}
        failed={false}
        colors={colors}
      />
    ),
    { width: 100, height: 24 },
  )
  await app.renderOnce()

  const frame = app.captureCharFrame()
  expect(frame).toContain("outer-only result")
  expect(frame).not.toContain("[31m")
})

test("expanded exec keeps bounded outer output alongside subtools", async () => {
  const output = Array.from({ length: 14 }, (_, index) => `outer-${index}`).join("\n")
  const app = await testRender(
    () => (
      <ExecExpandedBody code="return tools" output={output} columns={80} failed={false} colors={colors}>
        <text>nested-subtool</text>
      </ExecExpandedBody>
    ),
    { width: 100, height: 32 },
  )
  await app.renderOnce()

  const frame = app.captureCharFrame()
  expect(frame).toContain("nested-subtool")
  expect(frame).toContain("outer-0")
  expect(frame).toContain("outer-9")
  expect(frame).toContain("…")
  expect(frame).not.toContain("outer-10")
})
