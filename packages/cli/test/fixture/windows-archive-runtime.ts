import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { TextReader, Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "@zip.js/zip.js"
import { extractZip } from "../../src/util/archive"
import * as Process from "../../src/util/process"

const unsafeCases = [
  { name: "parent-forward", entry: () => "../outside.txt" },
  { name: "parent-backslash", entry: () => "..\\outside.txt" },
  {
    name: "rooted-absolute",
    entry: (outside: string) => `/${path.relative(path.parse(outside).root, outside).replaceAll("\\", "/")}`,
  },
  { name: "drive-absolute", entry: (outside: string) => outside.replaceAll("\\", "/") },
  {
    name: "drive-relative",
    entry: (outside: string) => `${path.parse(outside).root.slice(0, 2)}${path.relative(process.cwd(), outside)}`,
  },
  { name: "prefix-sibling", entry: () => "../destination-sibling/outside.txt" },
]

export const archiveCaseNames = [
  "normal-nested",
  "overwrite-repeat",
  "spaces-and-apostrophes",
  ...unsafeCases.map((entry) => entry.name),
  "invalid-archive-handle-release",
  "destination-conflict-handle-release",
]

export async function writeZip(file: string, entries: Array<{ name: string; text?: string }>) {
  const writer = new ZipWriter(new Uint8ArrayWriter(), { level: 0 })
  for (const entry of entries) {
    await writer.add(entry.name, entry.name.endsWith("/") ? undefined : new TextReader(entry.text ?? ""), {
      useWebWorkers: false,
    })
  }
  const bytes = await writer.close()
  const reader = new ZipReader(new Uint8ArrayReader(bytes), { useWebWorkers: false })
  try {
    // Verify the fixture writer preserved malicious names instead of sanitizing
    // them before the production extractor ever sees the archive.
    assert.deepEqual(
      (await reader.getEntries()).map((entry) => entry.filename),
      entries.map((entry) => entry.name),
    )
  } finally {
    await reader.close()
  }
  await fs.writeFile(file, bytes)
}

async function assertReleased(archive: string, destination: string) {
  const movedArchive = `${archive}.renamed`
  const movedDestination = `${destination} renamed`
  await fs.rename(archive, movedArchive)
  await fs.rm(movedArchive)
  await fs.rename(destination, movedDestination)
  await fs.rm(movedDestination, { recursive: true })
  await assert.rejects(fs.stat(movedArchive), { code: "ENOENT" })
  await assert.rejects(fs.stat(movedDestination), { code: "ENOENT" })
}

export async function verifyWindowsArchive(reportPath: string) {
  assert.equal(process.platform, "win32", "Windows archive runtime verification requires an actual Windows host")
  const powershell = await Process.text([
    "powershell",
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "Add-Type -AssemblyName System.IO.Compression.FileSystem; [ordered]@{version=$PSVersionTable.PSVersion.ToString(); dotnet=[Environment]::Version.ToString(); zipAssembly=[System.IO.Compression.ZipFile].Assembly.GetName().Name; archiveModuleAvailable=[bool](Get-Module -ListAvailable Microsoft.PowerShell.Archive)} | ConvertTo-Json -Compress",
  ])
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mimocode-windows-archive-"))
  const previousDirectory = process.cwd()
  const results: Array<{ name: string; passed: boolean; error?: string }> = []
  const runCase = async (name: string, run: (directory: string) => Promise<void>) => {
    const directory = path.join(root, name)
    await fs.mkdir(directory)
    try {
      await run(directory)
      results.push({ name, passed: true })
    } catch (error) {
      results.push({ name, passed: false, error: error instanceof Error ? error.stack : String(error) })
    }
  }
  try {
    // Drive-relative malicious entries must resolve against this owned fixture
    // directory, so even a broken extractor cannot overwrite unrelated files.
    assert.match(path.parse(root).root, /^[A-Za-z]:[\\/]$/)
    process.chdir(root)

    await runCase("normal-nested", async (directory) => {
      const archive = path.join(directory, "input.zip")
      const destination = path.join(directory, "destination")
      await writeZip(archive, [
        { name: "root.txt", text: "root content" },
        { name: "nested/deeper/value.txt", text: "nested content" },
        { name: "empty/" },
      ])
      await extractZip(archive, destination)
      assert.equal(await fs.readFile(path.join(destination, "root.txt"), "utf8"), "root content")
      assert.equal(await fs.readFile(path.join(destination, "nested/deeper/value.txt"), "utf8"), "nested content")
      assert.equal((await fs.stat(path.join(destination, "empty"))).isDirectory(), true)
      await assertReleased(archive, destination)
    })

    await runCase("overwrite-repeat", async (directory) => {
      const archive = path.join(directory, "input.zip")
      const destination = path.join(directory, "destination")
      await fs.mkdir(destination)
      await fs.writeFile(path.join(destination, "replace.txt"), "old content")
      await fs.writeFile(path.join(destination, "unrelated.txt"), "keep existing neighbor")
      await writeZip(archive, [{ name: "replace.txt", text: "archive content" }])
      await extractZip(archive, destination)
      assert.equal(await fs.readFile(path.join(destination, "replace.txt"), "utf8"), "archive content")
      await fs.writeFile(path.join(destination, "replace.txt"), "changed after extraction")
      await extractZip(archive, destination)
      await extractZip(archive, destination)
      assert.equal(await fs.readFile(path.join(destination, "replace.txt"), "utf8"), "archive content")
      assert.equal(await fs.readFile(path.join(destination, "unrelated.txt"), "utf8"), "keep existing neighbor")
      await assertReleased(archive, destination)
    })

    await runCase("spaces-and-apostrophes", async (directory) => {
      const archive = path.join(directory, "source's zip name.zip")
      const destination = path.join(directory, "destination's files")
      await writeZip(archive, [{ name: "nested's directory/message's note.txt", text: "quoted path content" }])
      await extractZip(archive, destination)
      assert.equal(
        await fs.readFile(path.join(destination, "nested's directory/message's note.txt"), "utf8"),
        "quoted path content",
      )
      await assertReleased(archive, destination)
    })

    for (const scenario of unsafeCases) {
      await runCase(scenario.name, async (directory) => {
        const archive = path.join(directory, "input.zip")
        const destination = path.join(directory, "destination")
        const outside = path.join(
          directory,
          ...(scenario.name === "prefix-sibling" ? ["destination-sibling"] : []),
          "outside.txt",
        )
        await fs.mkdir(path.dirname(outside), { recursive: true })
        await fs.writeFile(outside, "protected outside content")
        await writeZip(archive, [
          { name: "before.txt", text: "valid entry before rejected entry" },
          { name: scenario.entry(outside), text: "must never overwrite outside content" },
        ])
        await assert.rejects(
          () => extractZip(archive, destination),
          (error) => error instanceof Process.RunFailedError && error.code !== 0,
        )
        // The successful first entry proves the archive was opened and real
        // extraction began. A missing PowerShell/assembly cannot pass this case.
        assert.equal(
          await fs.readFile(path.join(destination, "before.txt"), "utf8"),
          "valid entry before rejected entry",
        )
        assert.equal(await fs.readFile(outside, "utf8"), "protected outside content")
        await assertReleased(archive, destination)
      })
    }

    await runCase("invalid-archive-handle-release", async (directory) => {
      const archive = path.join(directory, "invalid.zip")
      const destination = path.join(directory, "destination")
      await fs.mkdir(destination)
      await fs.writeFile(archive, "not a ZIP archive")
      await assert.rejects(
        () => extractZip(archive, destination),
        (error) => error instanceof Process.RunFailedError && error.code !== 0,
      )
      assert.deepEqual(await fs.readdir(destination), [])
      await assertReleased(archive, destination)
    })

    await runCase("destination-conflict-handle-release", async (directory) => {
      const archive = path.join(directory, "input.zip")
      const destination = path.join(directory, "destination")
      await fs.mkdir(destination)
      await fs.writeFile(path.join(destination, "blocked"), "existing file")
      await writeZip(archive, [
        { name: "before.txt", text: "valid entry before conflict" },
        { name: "blocked/nested.txt", text: "cannot replace a file with a directory" },
      ])
      await assert.rejects(
        () => extractZip(archive, destination),
        (error) => error instanceof Process.RunFailedError && error.code !== 0,
      )
      assert.equal(await fs.readFile(path.join(destination, "before.txt"), "utf8"), "valid entry before conflict")
      assert.equal(await fs.readFile(path.join(destination, "blocked"), "utf8"), "existing file")
      await assertReleased(archive, destination)
    })
  } finally {
    process.chdir(previousDirectory)
    await fs.rm(root, { recursive: true, force: true })
  }
  assert.deepEqual(
    results.map((result) => result.name),
    archiveCaseNames,
  )
  const report = {
    platform: process.platform,
    arch: process.arch,
    bun: Bun.version,
    powershell: JSON.parse(powershell.text),
    cases: results,
    scope:
      "Actual Windows extraction on the available PowerShell/.NET installation; no restricted enterprise image claim",
  }
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report))
  assert.equal(results.filter((result) => !result.passed).length, 0, "Windows archive cases failed; see JSON evidence")
}

if (import.meta.main) {
  assert.ok(process.argv[2], "Pass an archive JSON report path")
  await verifyWindowsArchive(path.resolve(process.argv[2]))
}
