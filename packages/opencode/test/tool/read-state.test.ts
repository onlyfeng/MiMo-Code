import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import path from "path"
import { PNG } from "pngjs"
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
import { ProviderTest } from "../fake/provider"

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
    ProviderTest.fake().layer,
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

const read = (filePath: string, context: typeof ctx & { extra?: { [key: string]: unknown } } = ctx) =>
  runtime.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const info = yield* ReadTool
        const tool = yield* info.init()
        return yield* tool.execute({ file_path: filePath }, context)
      }),
    ),
  )

const edit = (filePath: string) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const info = yield* EditTool
      const tool = yield* info.init()
      return yield* tool.execute({ file_path: filePath, old_string: "old", new_string: "new" }, ctx)
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

  test("scopes disposal per actor when one session spans multiple directories", async () => {
    await using parent = await tmpdir()
    await using worktree = await tmpdir()
    const parentFile = path.join(parent.path, "p.txt")
    const worktreeFile = path.join(worktree.path, "w.txt")
    await Bun.write(parentFile, "old")
    await Bun.write(worktreeFile, "old")

    // Same session, two actors: the parent reads in the main tree while an
    // isolated subagent reads in its worktree (workflow/runtime.ts).
    const mainCtx = { ...ctx, actorID: "main" }
    const subCtx = { ...ctx, actorID: "explore-1" }

    await Instance.provide({ directory: parent.path, fn: async () => markFileRead(mainCtx, parentFile) })
    await Instance.provide({ directory: worktree.path, fn: async () => markFileRead(subCtx, worktreeFile) })

    // Disposing the worktree clears only the subagent's marks; the parent's survive.
    await disposeInstance(AppFileSystem.resolve(worktree.path))
    expect(() => assertFileRead(subCtx, worktreeFile, "edit")).toThrow("has not been read")
    expect(() => assertFileRead(mainCtx, parentFile, "edit")).not.toThrow()

    // Disposing the parent then clears the parent actor's marks.
    await disposeInstance(AppFileSystem.resolve(parent.path))
    expect(() => assertFileRead(mainCtx, parentFile, "edit")).toThrow("has not been read")
  })

  test("scopes disposal per directory when one actor spans multiple directories", async () => {
    await using parent = await tmpdir()
    await using worktree = await tmpdir()
    const parentFile = path.join(parent.path, "p.txt")
    const worktreeFile = path.join(worktree.path, "w.txt")
    await Bun.write(parentFile, "old")
    await Bun.write(worktreeFile, "old")

    const sharedCtx = { ...ctx, actorID: "shared-actor" }

    await Instance.provide({ directory: parent.path, fn: async () => markFileRead(sharedCtx, parentFile) })
    await Instance.provide({ directory: worktree.path, fn: async () => markFileRead(sharedCtx, worktreeFile) })

    await disposeInstance(AppFileSystem.resolve(worktree.path))
    expect(() => assertFileRead(sharedCtx, worktreeFile, "edit")).toThrow("has not been read")
    expect(() => assertFileRead(sharedCtx, parentFile, "edit")).not.toThrow()

    await disposeInstance(AppFileSystem.resolve(parent.path))
    expect(() => assertFileRead(sharedCtx, parentFile, "edit")).toThrow("has not been read")
  })
})

// The attachment size gate can read an image's bytes and still refuse to
// deliver them. Read state must follow what the model actually received, the
// same way the no-vision branch returns a warning without marking the file.
describe("tool.read-state attachment gate", () => {
  const LIMIT = 4096
  const CEILING = 32 * 1024
  // The size gate lives behind the vision check, so these reads need a model
  // that accepts images; the shared fake model does not.
  const visionCtx = {
    ...ctx,
    extra: {
      model: ProviderTest.model({
        capabilities: {
          toolcall: true,
          attachment: true,
          reasoning: false,
          temperature: true,
          interleaved: false,
          input: { text: true, image: true, audio: false, video: false, pdf: true },
          output: { text: true, image: false, audio: false, video: false, pdf: false },
        },
      }),
    },
  }

  // Random noise defeats PNG's own compression, so a small canvas still lands
  // over the tiny limit these tests run under.
  const noisyPng = (size: number) => {
    let seed = 4242
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed % 256
    }
    const png = new PNG({ width: size, height: size })
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = rand()
      png.data[i + 1] = rand()
      png.data[i + 2] = rand()
      png.data[i + 3] = 255
    }
    return PNG.sync.write(png)
  }

  beforeAll(() => {
    process.env["MIMOCODE_MAX_ATTACHMENT_SIZE"] = String(LIMIT)
    process.env["MIMOCODE_MAX_ATTACHMENT_SOURCE_SIZE"] = String(CEILING)
  })

  afterAll(() => {
    delete process.env["MIMOCODE_MAX_ATTACHMENT_SIZE"]
    delete process.env["MIMOCODE_MAX_ATTACHMENT_SOURCE_SIZE"]
  })

  test("an oversized image that could not be attached does not authorize an edit", async () => {
    await using tmp = await tmpdir()
    const filePath = path.join(tmp.path, "broken.png")
    // Valid PNG signature, garbage body: over the limit and undecodable, so the
    // bytes are read but the shrink fails and nothing reaches the model.
    const bytes = Buffer.alloc(LIMIT + 1)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes)
    await Bun.write(filePath, bytes)

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const result = await read("broken.png", visionCtx)
        expect(result.attachments).toBeUndefined()
        expect(result.output).toContain("could not be compressed")
        expect(() => assertFileRead(ctx, filePath, "edit")).toThrow("has not been read")
      },
    })
  })

  test("an oversized image recompressed under the limit still authorizes an edit", async () => {
    await using tmp = await tmpdir()
    const filePath = path.join(tmp.path, "huge.png")
    const bytes = noisyPng(120)
    expect(bytes.byteLength).toBeGreaterThan(LIMIT)
    expect(bytes.byteLength).toBeLessThanOrEqual(CEILING)
    await Bun.write(filePath, bytes)

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const result = await read("huge.png", visionCtx)
        expect(result.attachments?.length).toBe(1)
        expect(() => assertFileRead(ctx, filePath, "edit")).not.toThrow()
      },
    })
  })
})
