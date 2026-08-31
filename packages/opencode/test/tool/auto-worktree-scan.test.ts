import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { MessageV2 } from "../../src/session/message-v2"
import {
  findGitMainWorktree,
  sessionMutatedMainWorktrees,
  sessionHasAutoWorktreeNotice,
} from "../../src/tool/auto-worktree-hint"

function toolPart(tool: string, metadata: Record<string, unknown>, status = "completed"): MessageV2.Part {
  return {
    id: "prt_test",
    sessionID: "ses_test" as any,
    messageID: "msg_test" as any,
    type: "tool",
    tool,
    callID: "call_test",
    state: {
      status: status as "completed",
      input: {},
      output: "",
      title: tool,
      metadata,
      time: { start: 0, end: 1 },
    },
  } as unknown as MessageV2.Part
}

function withParts(parts: MessageV2.Part[], role: "user" | "assistant" = "assistant"): MessageV2.WithParts {
  return {
    info: {
      id: "msg_test" as any,
      sessionID: "ses_test" as any,
      role,
      parentID: undefined,
      agentID: undefined,
      time: { created: 0 },
      error: undefined,
      mode: "build",
      agent: "build",
      path: { cwd: "/tmp", root: "/tmp" },
      modelID: "m",
      providerID: "p",
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    } as any,
    parts,
  }
}

describe("sessionMutatedMainWorktrees bash exit gate", () => {
  test("failed bash (non-zero exit) does not count", () => {
    const msgs = [withParts([toolPart("bash", { mainWorktreeHits: ["/repo"], exit: 1 })])]
    expect(sessionMutatedMainWorktrees(msgs)).toEqual([])
  })

  test("successful bash (exit 0) is eligible", () => {
    const failed = [withParts([toolPart("bash", { mainWorktreeHits: ["/repo"], exit: 1 })])]
    const ok = [withParts([toolPart("bash", { mainWorktreeHits: ["/repo"], exit: 0 })])]
    expect(sessionMutatedMainWorktrees(failed)).toEqual([])
    expect(sessionMutatedMainWorktrees(ok)).toEqual(["/repo"])
  })
})

describe("main-worktree mutation path resolution", () => {
  test("a prior non-git lookup does not hide a later git init", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mimocode-auto-worktree-cache-"))
    const nested = path.join(root, "nested")
    fs.mkdirSync(nested)
    try {
      expect(findGitMainWorktree(nested)).toBeNull()
      fs.mkdirSync(path.join(root, ".git"))
      expect(findGitMainWorktree(nested)).toBe(root)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  test("apply_patch uses completed absolute file metadata outside the session directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mimocode-auto-worktree-patch-"))
    fs.mkdirSync(path.join(root, ".git"))
    try {
      const msgs = [
        withParts([
          toolPart("apply_patch", {
            files: [
              {
                type: "update",
                filePath: path.join(root, "src", "outside.ts"),
                relativePath: "../outside/src/outside.ts",
              },
            ],
          }),
        ]),
      ]
      expect(sessionMutatedMainWorktrees(msgs)).toEqual([root])
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("sessionHasAutoWorktreeNotice", () => {
  test("finds a notice on any user message, not only the last", () => {
    const notice = {
      id: "prt_n" as any,
      sessionID: "ses_test" as any,
      messageID: "msg_a" as any,
      type: "text" as const,
      text: "<system-reminder>\nAuto-Worktree Notice\n</system-reminder>",
      synthetic: true,
    }
    const msgs = [
      withParts([notice], "user"),
      withParts([], "assistant"),
      withParts([], "user"),
    ]
    expect(sessionHasAutoWorktreeNotice(msgs)).toBe(true)
  })

  test("false when no notice exists", () => {
    const msgs = [withParts([], "user")]
    expect(sessionHasAutoWorktreeNotice(msgs)).toBe(false)
  })
})
