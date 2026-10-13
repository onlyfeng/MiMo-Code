import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { isGPTModel, mcpToolSearchMode, resolveHarnessMode, usesGPTToolset } from "../../src/tool/gpt"

const codexMode = process.env.MIMOCODE_CODEX_MODE

beforeEach(() => {
  delete process.env.MIMOCODE_CODEX_MODE
})

afterEach(() => {
  if (codexMode === undefined) delete process.env.MIMOCODE_CODEX_MODE
  else process.env.MIMOCODE_CODEX_MODE = codexMode
})

describe("isGPTModel", () => {
  test("recognizes GPT versions and API aliases", () => {
    expect(isGPTModel("gpt-4o")).toBe(true)
    expect(isGPTModel("chatgpt-4o-latest")).toBe(true)
    expect(isGPTModel("gpt-5.3-codex")).toBe(true)
    expect(isGPTModel("company-alias", "gpt-5.4", "gpt-5")).toBe(true)
  })

  test("excludes non-GPT and GPT-OSS models", () => {
    expect(isGPTModel("claude-opus-4-6")).toBe(false)
    expect(isGPTModel("gpt-oss-120b")).toBe(false)
    expect(isGPTModel("company-gpt-production", "gpt-oss-120b", "gpt-oss")).toBe(false)
  })
})

describe("mcpToolSearchMode", () => {
  const auto = { type: "auto", percent: 10 } as const
  const never = { type: "never" } as const
  const always = { type: "always" } as const

  test("keeps the configured mode for non-GPT models and always defers for GPT models", () => {
    expect(mcpToolSearchMode(auto, undefined, "claude-opus-4-6")).toEqual(auto)
    expect(mcpToolSearchMode(auto, undefined, "mimo-v2.5")).toEqual(auto)
    expect(mcpToolSearchMode(never, undefined, "mimo-v2.5-pro")).toEqual(never)
    expect(mcpToolSearchMode(never, undefined, "mimo-v2.5-pro-ultraspeed")).toEqual(never)
    expect(mcpToolSearchMode(auto, undefined, "mimo-v2.6")).toEqual(auto)
    expect(mcpToolSearchMode(auto, undefined, "mimo-v2.6-ptc")).toEqual(auto)
    expect(mcpToolSearchMode(auto, undefined, "gpt-oss-120b")).toEqual(auto)
    expect(mcpToolSearchMode(never, undefined, "claude-opus-4-6")).toEqual(never)
    expect(mcpToolSearchMode(always, undefined, "claude-opus-4-6")).toEqual(always)
    expect(mcpToolSearchMode(never, undefined, "gpt-5.2")).toEqual(always)
  })

  test("keeps MiMo identities on the configured mode unless the harness is Codex", () => {
    expect(mcpToolSearchMode(never, undefined, "mimo", "vendor_mimo-v2.5")).toEqual(never)
    expect(mcpToolSearchMode(never, undefined, "mimo-v2.6", "vendor-mimo-v2.5-pro")).toEqual(never)
    expect(mcpToolSearchMode(never, undefined, "deployment-primary", "mimo-v2.6-ptc", "mimo")).toEqual(never)
    expect(mcpToolSearchMode(always, undefined, "mimo-v2.5")).toEqual(always)
  })

  test("always defers for every model when process Codex mode is enabled", () => {
    process.env.MIMOCODE_CODEX_MODE = "true"
    expect(mcpToolSearchMode(never, undefined, "claude-opus-4-6")).toEqual(always)
    expect(mcpToolSearchMode(auto, undefined, "mimo-v2.6")).toEqual(always)
    expect(mcpToolSearchMode(never, undefined, "mimo-v2.6-ptc")).toEqual(always)
  })

  test("allows the resolved session mode to override the process mode", () => {
    expect(mcpToolSearchMode(never, "codex", "claude-opus-4-6")).toEqual(always)
    expect(mcpToolSearchMode(never, "codex", "mimo-v2.6")).toEqual(always)
    expect(mcpToolSearchMode(never, "codex", "mimo-v2.6-ptc")).toEqual(always)
    expect(mcpToolSearchMode(auto, "auto", "gpt-5.2")).toEqual(always)
    expect(mcpToolSearchMode(auto, "auto", "claude-opus-4-6")).toEqual(auto)
    expect(mcpToolSearchMode(auto, "auto", "mimo-v2.6")).toEqual(auto)
    process.env.MIMOCODE_CODEX_MODE = "true"
    expect(mcpToolSearchMode(auto, "auto", "claude-opus-4-6")).toEqual(always)
    expect(mcpToolSearchMode(auto, "default", "claude-opus-4-6")).toEqual(auto)
    expect(mcpToolSearchMode(auto, "default", "mimo-v2.6")).toEqual(auto)
    expect(mcpToolSearchMode(never, "default", "gpt-5.2")).toEqual(never)
    expect(mcpToolSearchMode(always, "default", "mimo-v2.6")).toEqual(always)
  })

  test("honors an explicit process disable before automatic GPT inference", () => {
    process.env.MIMOCODE_CODEX_MODE = "false"
    expect(mcpToolSearchMode(auto, "auto", "gpt-5.2")).toEqual(auto)
    expect(mcpToolSearchMode(never, undefined, "deployment-primary", "gpt-5.2", "gpt")).toEqual(never)
    expect(mcpToolSearchMode(always, "auto", "gpt-5.2")).toEqual(always)
    expect(mcpToolSearchMode(auto, "codex", "claude-opus-4-6")).toEqual(always)
  })
})

describe("resolveHarnessMode", () => {
  test("uses one complete identity with MiMo precedence", () => {
    expect(resolveHarnessMode({ modelID: "mimo", modelAPIID: "vendor-mimo-v2.5" })).toBe("default")
    expect(resolveHarnessMode({ modelID: "mimo-v2.6", modelFamily: "vendor_mimo-v2.5-pro" })).toBe("default")
    expect(resolveHarnessMode({ modelID: "deployment-primary", modelAPIID: "mimo-v2.6-ptc" })).toBe("default")
    expect(resolveHarnessMode({ modelID: "mimo-v2.5", modelAPIID: "mimo", harness: "codex" })).toBe("codex")
    expect(resolveHarnessMode({ modelID: "mimo-v2.6-ptc", harness: "codex" })).toBe("codex")
  })

  test("resolves session, process, and automatic inference in precedence order", () => {
    process.env.MIMOCODE_CODEX_MODE = "true"
    expect(resolveHarnessMode({ modelID: "claude-opus-4-6", harness: "default" })).toBe("default")
    expect(resolveHarnessMode({ modelID: "claude-opus-4-6", harness: "auto" })).toBe("codex")
    expect(resolveHarnessMode({ modelID: "gpt-5.2", harness: "default" })).toBe("default")
    expect(resolveHarnessMode({ modelID: "gpt-4o-mini", harness: "default" })).toBe("default")

    process.env.MIMOCODE_CODEX_MODE = "false"
    expect(resolveHarnessMode({ modelID: "gpt-5.2", harness: "auto" })).toBe("default")
    expect(resolveHarnessMode({ modelID: "claude-opus-4-6", harness: "codex" })).toBe("codex")
    expect(resolveHarnessMode({ modelID: "mimo-v2.6-ptc", harness: "codex" })).toBe("codex")

    delete process.env.MIMOCODE_CODEX_MODE
    expect(resolveHarnessMode({ modelID: "gpt-5.2", harness: "auto" })).toBe("codex")
    expect(resolveHarnessMode({ modelID: "gpt-4o-mini", harness: "auto" })).toBe("default")
    expect(resolveHarnessMode({ modelID: "gpt-oss-120b", harness: "auto" })).toBe("default")
    expect(
      resolveHarnessMode({ modelID: "deployment-primary", modelAPIID: "gpt-5.2", modelFamily: "gpt" }),
    ).toBe("default")
  })
})

describe("usesGPTToolset", () => {
  test("uses the normal toolset for MiMo models regardless of API transport", () => {
    expect(usesGPTToolset("mimo-v2.5")).toBe(false)
    expect(usesGPTToolset("mimo-v2.5-pro")).toBe(false)
    expect(usesGPTToolset("vendor_mimo-v2.5")).toBe(false)
    expect(usesGPTToolset("vendor-mimo-v2.5-pro")).toBe(false)
    expect(usesGPTToolset("VENDOR/MIMO-V2.5")).toBe(false)
    expect(usesGPTToolset("mimo", undefined, "mimo-v2.5")).toBe(false)
    expect(usesGPTToolset("mimo-v2.5-preview")).toBe(false)
    expect(usesGPTToolset("mimo-v2.6")).toBe(false)
    expect(usesGPTToolset("mimo-v2.6-ptc")).toBe(false)
  })

  test("keeps GPT toolset detection bound to the catalog model ID", () => {
    expect(usesGPTToolset("gpt-4o-mini", undefined, "gpt-4o-mini", "gpt-mini")).toBe(false)
    expect(usesGPTToolset("custom-model", undefined, "gpt-5", "gpt")).toBe(false)
  })

  test("uses the GPT toolset for every model in Codex mode", () => {
    expect(usesGPTToolset("claude-opus-4-6")).toBe(false)
    process.env.MIMOCODE_CODEX_MODE = "true"
    expect(usesGPTToolset("claude-opus-4-6")).toBe(true)
    expect(usesGPTToolset("mimo-v2.5")).toBe(true)
    expect(mcpToolSearchMode({ type: "never" }, undefined, "mimo-v2.5")).toEqual({ type: "always" })
  })

  test("allows the resolved session mode to override the process mode", () => {
    expect(usesGPTToolset("claude-opus-4-6", "codex")).toBe(true)
    expect(usesGPTToolset("mimo-v2.6", "codex")).toBe(true)
    expect(usesGPTToolset("mimo-v2.6-ptc", "codex")).toBe(true)
    expect(usesGPTToolset("gpt-5.2", "auto")).toBe(true)
    expect(usesGPTToolset("mimo-v2.6", "auto")).toBe(false)
    expect(usesGPTToolset("mimo-v2.6-ptc", "auto")).toBe(false)
    expect(usesGPTToolset("claude-opus-4-6", "auto")).toBe(false)
    process.env.MIMOCODE_CODEX_MODE = "true"
    expect(usesGPTToolset("claude-opus-4-6", "auto")).toBe(true)
    expect(usesGPTToolset("mimo-v2.6", "auto")).toBe(true)
    expect(usesGPTToolset("mimo-v2.6-ptc", "auto")).toBe(true)
    expect(usesGPTToolset("claude-opus-4-6", "default")).toBe(false)
    expect(usesGPTToolset("mimo-v2.6", "default")).toBe(false)
    expect(usesGPTToolset("gpt-5.2", "default")).toBe(false)
    expect(usesGPTToolset("gpt-4o-mini", "default")).toBe(false)
    expect(mcpToolSearchMode({ type: "never" }, "default", "gpt-4o-mini")).toEqual({ type: "never" })
  })

  test("honors an explicit process disable for GPT and alias identities", () => {
    process.env.MIMOCODE_CODEX_MODE = "false"
    expect(usesGPTToolset("gpt-5.2", "auto")).toBe(false)
    expect(usesGPTToolset("deployment-primary", undefined, "gpt-5.2", "gpt")).toBe(false)
    expect(usesGPTToolset("claude-opus-4-6", "codex")).toBe(true)
  })
})
