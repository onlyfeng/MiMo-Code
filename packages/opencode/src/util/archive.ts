import path from "path"
import * as Process from "./process"

export async function extractZip(zipPath: string, destDir: string) {
  if (process.platform === "win32") {
    const winZipPath = path.resolve(zipPath).replaceAll("'", "''")
    const winDestDir = path.resolve(destDir).replaceAll("'", "''")
    const cmd = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${winZipPath}', '${winDestDir}')`
    await Process.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", cmd])
    return
  }

  await Process.run(["unzip", "-o", "-q", zipPath, "-d", destDir])
}
