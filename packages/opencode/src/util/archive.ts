import path from "path"
import * as Process from "./process"

// Build a PowerShell command that extracts a zip via the .NET ZipFile API. We avoid
// Expand-Archive because the Microsoft.PowerShell.Archive module can be absent on
// locked-down/enterprise Windows. Unlike ZipFile.ExtractToDirectory (which throws when
// the destination already exists or a file would be overwritten), this walks the entries
// and extracts each with overwrite=$true, so re-installs and pre-existing destinations
// (e.g. a shared bin dir) work. Includes a zip-slip guard.
export function windowsZipExtractCommand(zipPath: string, destDir: string) {
  const src = path.resolve(zipPath).replaceAll("'", "''")
  const dest = path.resolve(destDir).replaceAll("'", "''")
  return [
    "Add-Type -AssemblyName System.IO.Compression.FileSystem;",
    `$dest=[System.IO.Path]::GetFullPath('${dest}');`,
    "$s=[System.IO.Path]::DirectorySeparatorChar;",
    "if(-not $dest.EndsWith($s)){$dest+=$s};",
    `$zip=[System.IO.Compression.ZipFile]::OpenRead('${src}');`,
    "try{foreach($e in $zip.Entries){",
    "$t=[System.IO.Path]::GetFullPath([System.IO.Path]::Combine($dest,$e.FullName));",
    "if(-not $t.StartsWith($dest,[System.StringComparison]::OrdinalIgnoreCase)){throw 'unsafe zip entry'};",
    "if([string]::IsNullOrEmpty($e.Name)){[System.IO.Directory]::CreateDirectory($t)|Out-Null;continue};",
    "[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($t))|Out-Null;",
    "[System.IO.Compression.ZipFileExtensions]::ExtractToFile($e,$t,$true)",
    "}}finally{$zip.Dispose()}",
  ].join("")
}

export async function extractZip(zipPath: string, destDir: string) {
  if (process.platform === "win32") {
    const cmd = windowsZipExtractCommand(zipPath, destDir)
    await Process.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", cmd])
    return
  }

  await Process.run(["unzip", "-o", "-q", zipPath, "-d", destDir])
}
