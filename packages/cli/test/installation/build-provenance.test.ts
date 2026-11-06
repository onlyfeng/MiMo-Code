import { describe, expect, test } from "bun:test"
import { InstallationBuild, describeBuild } from "../../src/installation/version"

const commit = "0123456789abcdef0123456789abcdef01234567"
const time = "2026-01-02T03:04:05.000Z"

describe("describeBuild", () => {
  test("a clean build is its commit", () => {
    expect(describeBuild({ commit, dirty: false, time })).toBe(commit)
  })

  test("local changes and unknown state are marked on the commit", () => {
    expect(describeBuild({ commit, dirty: true, time })).toBe(`${commit}+dirty`)
    expect(describeBuild({ commit, dirty: null, time })).toBe(`${commit}+dirty-unknown`)
    expect(describeBuild({ commit: null, dirty: null, time })).toBe("unknown+dirty-unknown")
  })

  test("running from source has no build", () => {
    expect(InstallationBuild).toBeUndefined()
    expect(describeBuild()).toBe("source")
  })
})
