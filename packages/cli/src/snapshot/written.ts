import { existsSync } from "fs"
import path from "path"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"

// FC-035: the files an assistant message's own write tools wrote. A step's
// snapshot patch lists every file that changed in the worktree during the step,
// including edits by other processes sharing the directory; undo reverts only
// the files recorded here.
const pending = new Map<string, Set<string>>()

function keys(file: string) {
  const out = new Set<string>()
  for (const item of [path.resolve(file), real(file)]) {
    const normalized = item.replaceAll("\\", "/")
    out.add(process.platform === "win32" ? normalized.toLowerCase() : normalized)
  }
  return out
}

// A patch names a file under the snapshot worktree, which may be the real path
// of a directory the tool reached through a symlink. A new file, and any new
// directories above it, do not exist yet: resolve the nearest existing ancestor.
function real(file: string) {
  const missing: string[] = []
  let current = path.resolve(file)
  while (!existsSync(current)) {
    const parent = path.dirname(current)
    if (parent === current) return path.resolve(file)
    missing.unshift(path.basename(current))
    current = parent
  }
  try {
    return path.join(AppFileSystem.resolve(current), ...missing)
  } catch {
    return path.resolve(file)
  }
}

/** Called by the write gate before a write tool changes `file`. */
export function record(messageID: string, file: string) {
  const files = pending.get(messageID) ?? new Set<string>()
  for (const key of keys(file)) files.add(key)
  pending.set(messageID, files)
}

/** The files of a step's patch that `messageID`'s write tools wrote. Clears the record. */
export function take(messageID: string, files: readonly string[]) {
  const written = pending.get(messageID)
  pending.delete(messageID)
  if (!written) return []
  return files.filter((file) => [...keys(file)].some((key) => written.has(key)))
}

export function clear(messageID: string) {
  pending.delete(messageID)
}

export * as SnapshotWritten from "./written"
