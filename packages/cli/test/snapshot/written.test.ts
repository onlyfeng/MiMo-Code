import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { SnapshotWritten } from "../../src/snapshot/written"
import { tmpdir } from "../fixture/fixture"

const posix = (file: string) => file.replaceAll("\\", "/")

describe("SnapshotWritten", () => {
  test("a step's patch claims only the files its message's write tools wrote, once", async () => {
    await using tmp = await tmpdir()
    const mine = posix(path.join(tmp.path, "mine.txt"))
    const other = posix(path.join(tmp.path, "other.txt"))

    SnapshotWritten.record("msg_written_a", mine)
    SnapshotWritten.record("msg_written_b", other)
    expect(SnapshotWritten.take("msg_written_a", [mine, other])).toEqual([mine])
    // The next step of the same message starts with nothing recorded.
    expect(SnapshotWritten.take("msg_written_a", [mine, other])).toEqual([])
    expect(SnapshotWritten.take("msg_written_b", [mine, other])).toEqual([other])
  })

  // Creating symlinks on Windows needs a privilege CI does not have.
  ;(process.platform === "win32" ? test.skip : test)(
    "a new file written through a symlinked directory, in new directories too, matches the patch's real path",
    async () => {
      await using tmp = await tmpdir()
      const real = path.join(tmp.path, "real")
      const link = path.join(tmp.path, "link")
      await fs.mkdir(real)
      await fs.symlink(real, link)

      SnapshotWritten.record("msg_written_link", path.join(link, "new.txt"))
      // A directory the write creates as well.
      SnapshotWritten.record("msg_written_link", path.join(link, "made", "deeper", "new.txt"))
      const files = [
        posix(path.join(real, "new.txt")),
        posix(path.join(real, "made", "deeper", "new.txt")),
        posix(path.join(real, "other.txt")),
      ]
      expect(SnapshotWritten.take("msg_written_link", files)).toEqual([files[0], files[1]])
    },
  )
})
