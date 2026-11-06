declare global {
  const MIMOCODE_VERSION: string
  const MIMOCODE_CHANNEL: string
  const MIMOCODE_BUILD: InstallationBuild
}

/** The source a built binary came from (FC-052); see `script/build-provenance.ts`. */
export type InstallationBuild = {
  commit: string | null
  dirty: boolean | null
  time: string
}

export const InstallationVersion = typeof MIMOCODE_VERSION === "string" ? MIMOCODE_VERSION : "local"
export const InstallationChannel = typeof MIMOCODE_CHANNEL === "string" ? MIMOCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
/** Undefined when running from source, where no build defined it. */
export const InstallationBuild: InstallationBuild | undefined =
  typeof MIMOCODE_BUILD === "object" && MIMOCODE_BUILD !== null ? MIMOCODE_BUILD : undefined

/**
 * One log token for the build: the commit, `+dirty` when the build had local
 * changes, `+dirty-unknown` when git could not tell; `source` when unbuilt.
 */
export function describeBuild(build: InstallationBuild | undefined = InstallationBuild): string {
  if (!build) return "source"
  const commit = build.commit ?? "unknown"
  if (build.dirty === true) return `${commit}+dirty`
  if (build.dirty === null) return `${commit}+dirty-unknown`
  return commit
}
