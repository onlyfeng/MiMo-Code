/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import { ModelMetadata } from "../../../src/cli/cmd/tui/component/model-metadata"

const metadata = {
  alias: "GPT-5.6",
  detail: "openai/gpt-5.6-sol · variant: high",
}

const text = RGBA.fromHex("#eeeeee")
const muted = RGBA.fromHex("#808080")

function FooterRow() {
  return (
    <box flexDirection="row" justifyContent="space-between" gap={1}>
      <box flexDirection="row" gap={1} flexShrink={1}>
        <text fg={text} flexShrink={0}>
          Explore (1 of 2)
        </text>
        <ModelMetadata metadata={metadata} aliasColor={text} detailColor={muted} />
        <text fg={muted} flexShrink={0} wrapMode="none">
          42K/128K
        </text>
      </box>
      <text fg={text} flexShrink={0} wrapMode="none">
        Main Prev Next
      </text>
    </box>
  )
}

test("model metadata renders the unified full label when space is available", async () => {
  const app = await testRender(() => <FooterRow />, { width: 100, height: 3 })
  await app.renderOnce()

  expect(app.captureCharFrame()).toContain("Explore (1 of 2) · GPT-5.6 · openai/gpt-5.6-sol · variant: high 42K/128K")
})

test("model metadata shrinks before established footer usage and navigation", async () => {
  const app = await testRender(() => <FooterRow />, { width: 54, height: 3 })
  await app.renderOnce()

  const frame = app.captureCharFrame()
  expect(frame).toContain("Explore (1 of 2)")
  expect(frame).toContain("42K/128K")
  expect(frame).toContain("Main Prev Next")
  expect(frame.split("\n").filter((line) => line.trim()).length).toBe(1)
})
