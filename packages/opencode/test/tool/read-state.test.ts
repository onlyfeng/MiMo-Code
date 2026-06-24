import { afterAll, afterEach, describe, expect, test } from "bun:test"
import path from "path"
import { Effect, Layer, ManagedRuntime } from "effect"
import { Agent } from "../../src/agent/agent"
import { Bus } from "../../src/bus"
import { Format } from "../../src/format"
import { LSP } from "../../src/lsp"
import { Instance } from "../../src/project/instance"
import { Instruction } from "../../src/session/instruction"
import { MessageID, SessionID } from "../../src/session/schema"
import { EditTool } from "../../src/tool/edit"
import { ReadTool } from "../../src/tool/read"
import { assertFileRead, clearReadState, markFileRead } from "../../src/tool/read-state"
import { disposeInstance } from "../../src/effect/instance-registry"
import { Truncate } from "../../src/tool"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { tmpdir } from "../fixture/fixture"

const ctx = {
  sessionID: SessionID.make("ses_test-read-state-session"),
  messageID: MessageID.make(""),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

const runtime = ManagedRuntime.make(
  Layer.mergeAll(
    Agent.defaultLayer,
    AppFileSystem.defaultLayer,
    Bus.layer,
    Format.defaultLayer,
    Instruction.defaultLayer,
    LSP.defaultLayer,
    Truncate.defaultLayer,
  ),
)

afterEach(async () => {
  clearReadState()
  await Instance.disposeAll()
})

afterAll(async () => {
  await runtime.dispose()
})

const read = (filePath: string) =>
  runtime.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const info = yield* ReadTool
        const tool = yield* info.init()
        return yield* tool.execute({ filePath }, ctx)
      }),
    ),
  )

const edit = (filePath: string) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const info = yield* EditTool
      const tool = yield* info.init()
      return yield* tool.execute({ filePath, oldString: "old", newString: "new" }, ctx)
    }),
  )

describe("tool.read-state", () => {
  test("allows edit after the read tool marked the file in the same session", async () => {
    await using tmp = await tmpdir()
    const filePath = path.join(tmp.path, "file.txt")
    await Bun.write(filePath, "old")

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        await read("file.txt")
        await edit(filePath)
        expect(await Bun.file(filePath).text()).toBe("new")
      },
    })
  })

  test("keeps runtime read state scoped to the session", async () => {
    await using tmp = await tmpdir()
    const filePath = path.join(tmp.path, "file.txt")
    await Bun.write(filePath, "old")

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        markFileRead(ctx, filePath)
        expect(() =>
          assertFileRead(
            {
              ...ctx,
              sessionID: SessionID.make("ses_test-read-state-other-session"),
            },
            filePath,
            "edit",
          ),
        ).toThrow("has not been read")
      },
    })
  })

  test("keeps runtime read state scoped to the actor", async () => {
    await using tmp = await tmpdir()
    const filePath = path.join(tmp.path, "file.txt")
    await Bun.write(filePath, "old")

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const readerCtx = { ...ctx, actorID: "explore-1" }
        markFileRead(readerCtx, filePath)

        expect(() => assertFileRead(readerCtx, filePath, "edit")).not.toThrow()
        expect(() => assertFileRead({ ...ctx, actorID: "writer-1" }, filePath, "edit")).toThrow("has not been read")
        expect(() => assertFileRead(ctx, filePath, "edit")).toThrow("has not been read")
      },
    })
  })

  test("disposing one instance leaves another instance's read marks intact", async () => {
    await using tmpA = await tmpdir()
    await using tmpB = await tmpdir()
    const fileB = path.join(tmpB.path, "file.txt")
    await Bun.write(fileB, "old")

    const ctxB = { ...ctx, sessionID: SessionID.make("ses_test-read-state-dir-b") }

    await Instance.provide({
      directory: tmpB.path,
      fn: async () => markFileRead(ctxB, fileB),
    })

    // Tearing down a different project (A) must not wipe B's marks. Absolute
    // paths mean assertFileRead needs no instance context here.
    await disposeInstance(AppFileSystem.resolve(tmpA.path))
    expect(() => assertFileRead(ctxB, fileB, "edit")).not.toThrow()

    // Tearing down B's own directory does clear B.
    await disposeInstance(AppFileSystem.resolve(tmpB.path))
    expect(() => assertFileRead(ctxB, fileB, "edit")).toThrow("has not been read")
  })
})
