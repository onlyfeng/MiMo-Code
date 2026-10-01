import { expect, test } from "bun:test"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { buildFileManifest } from "../../src/session/compaction"
import { TryBestMonitor } from "../../src/session/try-best-detector"
import { sessionMutatedMainWorktrees } from "../../src/tool/auto-worktree-hint"
import { observedToolParts } from "../../src/session/observed-tool-parts"

function nested(tool: string, input: Record<string, unknown>, metadata: Record<string, unknown>) {
  const sessionID = SessionID.make("ses_exec_carriers")
  const messageID = MessageID.make("msg_exec_carriers")
  const part = MessageV2.ToolPart.parse({
    id: PartID.ascending(),
    sessionID,
    messageID,
    type: "tool",
    tool: "exec",
    callID: "outer",
    state: {
      status: "completed",
      input: { code: "await tools.example({})" },
      output: "done",
      title: "exec",
      time: { start: 1, end: 3 },
      metadata: {
        exec_schema: 1,
        sub_parts: [
          {
            seq: 1,
            type: "tool",
            tool,
            callID: "outer:1",
            state: {
              status: "completed",
              input,
              output: "failed test",
              title: tool,
              metadata,
              time: { start: 1, end: 2 },
            },
          },
        ],
      },
    },
  })
  const message: MessageV2.WithParts = {
    info: {
      id: messageID,
      sessionID,
      role: "assistant",
      parentID: MessageID.make("msg_parent"),
      time: { created: 1 },
      modelID: ModelID.make("test"),
      providerID: ProviderID.make("test"),
      mode: "build",
      agent: "build",
      path: { cwd: "/repo", root: "/repo" },
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    },
    parts: [part],
  }
  return { part, message }
}

test("compact nested edits remain in the compaction file manifest", () => {
  const { message } = nested("apply_patch", {}, { files: [{ filePath: "/repo/new.ts", type: "add" }] })
  expect(buildFileManifest([message], { worktree: "/repo" })).toContain("new.ts (written)")
})

test("compact nested shell retains successful main-worktree mutation evidence", () => {
  expect(
    sessionMutatedMainWorktrees([
      nested(
        "exec_command",
        { cmd: "touch file" },
        {
          exit: 0,
          mainWorktreeHits: ["/repo"],
        },
      ).message,
    ]),
  ).toEqual(["/repo"])
  expect(
    sessionMutatedMainWorktrees([
      nested(
        "exec_command",
        { cmd: "touch file" },
        {
          exit: 1,
          mainWorktreeHits: ["/repo"],
        },
      ).message,
    ]),
  ).toEqual([])
})

test("compact nested shell retries still reach the repeated-failure detector", () => {
  const monitor = new TryBestMonitor()
  const { part } = nested("exec_command", { cmd: "bun test" }, { exit: 1 })
  expect(monitor.consume(part)).toBeUndefined()
  expect(monitor.consume(part)).toBeUndefined()
  expect(monitor.consume(part)?.reason).toBe("bash_retry")
})

test("nested evidence rejects foreign children and never recursively expands metadata", () => {
  const { part } = nested("bash", { command: "bun test" }, { exit: 0 })
  if (part.state.status !== "completed") throw new Error("fixture must be completed")
  const child = part.state.metadata.sub_parts[0]
  part.state.metadata.sub_parts.push(
    child,
    { ...child, callID: "another:1" },
    { ...child, tool: "exec", seq: 2, callID: "outer:2" },
  )
  expect(observedToolParts(part).map((item) => item.callID)).toEqual(["outer", "outer:1"])
  part.state.metadata.exec_schema = 999
  expect(observedToolParts(part)).toEqual([part])
})

test("cancelled and rejected nested calls never become mutation or retry evidence", () => {
  for (const flag of ["cancelled", "rejected"]) {
    const patch = nested("apply_patch", {}, { [flag]: true })
    expect(observedToolParts(patch.part)).toEqual([patch.part])
    expect(sessionMutatedMainWorktrees([patch.message])).toEqual([])
    expect(buildFileManifest([patch.message], { worktree: "/repo" })).toBeUndefined()
    const shell = nested("bash", { command: "bun test" }, { [flag]: true, exit: 1 })
    const monitor = new TryBestMonitor()
    for (let index = 0; index < 3; index++) expect(monitor.consume(shell.part)).toBeUndefined()
  }
})
