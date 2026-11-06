import { $ } from "bun"

/**
 * Which source a binary was built from. Embedded at build time as
 * `MIMOCODE_BUILD` and logged when a process starts, so a running process can
 * be tied to a commit even after the file on disk was rebuilt (FC-052).
 */
export type BuildProvenance = {
  /** Full commit SHA, `MIMOCODE_COMMIT_SHA` when git is unavailable, else null. */
  commit: string | null
  /**
   * Whether the build differs from `commit`: a tracked file is changed (staged
   * or not), or an untracked, non-ignored file exists under `packages/`. Null
   * when git could not tell.
   */
  dirty: boolean | null
  /** When the build started, as an ISO 8601 UTC string. */
  time: string
}

export async function readBuildProvenance(cwd: string, now = new Date()): Promise<BuildProvenance> {
  const head = await $`git rev-parse --verify HEAD`.cwd(cwd).nothrow().quiet()
  const time = now.toISOString()
  if (head.exitCode !== 0) {
    return { commit: process.env["MIMOCODE_COMMIT_SHA"] || null, dirty: null, time }
  }
  const tracked = await $`git status --porcelain=v1 --untracked-files=no`.cwd(cwd).nothrow().quiet()
  const untracked = await $`git status --porcelain=v1 --untracked-files=all -- packages`.cwd(cwd).nothrow().quiet()
  const dirty =
    tracked.exitCode !== 0 || untracked.exitCode !== 0
      ? null
      : tracked.text().trim() !== "" || untracked.text().split("\n").some((line) => line.startsWith("??"))
  return { commit: head.text().trim(), dirty, time }
}
