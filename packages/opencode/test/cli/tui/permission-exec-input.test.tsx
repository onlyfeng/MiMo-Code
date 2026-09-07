/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { RGBA } from "@opentui/core"
import type { Part, PermissionRequest } from "@mimo-ai/sdk/v2"
import { BashCommandBody, permissionToolInput } from "../../../src/cli/cmd/tui/routes/session/permission"

const command = "printf approved > nested-result.txt"
const parentInput = { code: "await tools.exec_command({ cmd: 'different source text' })" }
const request: PermissionRequest = {
  id: "permission-nested",
  sessionID: "session-nested",
  permission: "bash",
  patterns: ["printf approved"],
  always: ["printf *"],
  tool: { messageID: "message-nested", callID: "call-parent" },
  metadata: {
    exec: {
      parentCallID: "call-parent",
      callID: "call-parent:1",
      input: { command, description: "Write the approved result" },
    },
  },
}
const parts: Part[] = [
  {
    id: "part-parent",
    sessionID: request.sessionID,
    messageID: request.tool!.messageID,
    type: "tool",
    callID: request.tool!.callID,
    tool: "exec",
    state: { status: "running", input: parentInput, time: { start: 1 } },
  },
]

test("nested exec approval uses the actual child input", () => {
  expect(permissionToolInput(request, parts)).toEqual({ command, description: "Write the approved result" })
})

test("nested exec command remains visible in the permission body", async () => {
  const input = permissionToolInput(request, parts)
  const app = await testRender(
    () => (
      <BashCommandBody
        command={typeof input.command === "string" ? input.command : ""}
        theme={{ text: RGBA.fromHex("#eeeeee") }}
      />
    ),
    { width: 100, height: 10 },
  )
  try {
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("$ " + command)
    expect(app.captureCharFrame()).not.toContain("different source text")
  } finally {
    app.renderer.destroy()
  }
})

test("unrelated or malformed receipts preserve the ordinary tool input", () => {
  const receipts = [
    undefined,
    null,
    [],
    { parentCallID: "another-parent", callID: "another-parent:1", input: { command } },
    { parentCallID: "call-parent", callID: "call-parent", input: { command } },
    { parentCallID: "call-parent", callID: "another:1", input: { command } },
    { parentCallID: "call-parent", callID: "call-parent:1", input: [] },
    { parentCallID: "call-parent", callID: "call-parent:1", input: null },
  ]
  for (const exec of receipts) {
    expect(permissionToolInput({ ...request, metadata: { exec } }, parts)).toEqual(parentInput)
  }
  expect(permissionToolInput({ ...request, metadata: {}, tool: undefined }, parts)).toEqual({})
})
