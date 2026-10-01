import { expect, test } from "bun:test"
import { windowsZipExtractCommand } from "../../src/util/archive"

test("windows zip extractor uses a case-sensitive zip-slip guard", () => {
  const command = windowsZipExtractCommand("ripgrep.zip", "dest")
  expect(command).toContain("[System.StringComparison]::Ordinal")
  expect(command).not.toContain("OrdinalIgnoreCase")
})
