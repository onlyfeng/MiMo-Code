import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import {
  isGPTModel,
  isMcpToolSearchEnabled,
  resolveHarnessMode,
  usesGPTToolset,
  usesMimoResponsesApi,
} from "../../src/tool/gpt"

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

describe("isMcpToolSearchEnabled", () => {
  test("defaults to GPT models and allows explicit non-GPT opt-in", () => {
    expect(isMcpToolSearchEnabled(false, undefined, "claude-opus-4-6")).toBe(false)
    expect(isMcpToolSearchEnabled(false, undefined, "mimo-v2.5")).toBe(false)
    expect(isMcpToolSearchEnabled(false, undefined, "mimo-v2.5-pro")).toBe(false)
    expect(isMcpToolSearchEnabled(false, undefined, "mimo-v2.5-pro-ultraspeed")).toBe(false)
    expect(isMcpToolSearchEnabled(false, undefined, "mimo-v2.6")).toBe(false)
    expect(isMcpToolSearchEnabled(false, undefined, "mimo-v2.6-ptc")).toBe(false)
    expect(isMcpToolSearchEnabled(false, undefined, "gpt-5.2")).toBe(true)
    expect(isMcpToolSearchEnabled(false, undefined, "gpt-oss-120b")).toBe(false)
    expect(isMcpToolSearchEnabled(true, undefined, "claude-opus-4-6")).toBe(true)
  })

  test("keeps MiMo identities in normal mode unless the harness opts in", () => {
    expect(isMcpToolSearchEnabled(false, undefined, "mimo", "vendor_mimo-v2.5")).toBe(false)
    expect(isMcpToolSearchEnabled(false, undefined, "mimo-v2.6", "vendor-mimo-v2.5-pro")).toBe(false)
    expect(isMcpToolSearchEnabled(false, undefined, "deployment-primary", "mimo-v2.6-ptc", "mimo")).toBe(false)
    expect(isMcpToolSearchEnabled(true, undefined, "mimo-v2.5")).toBe(true)
  })

  test("is enabled for non-GPT models in Codex mode", () => {
    process.env.MIMOCODE_CODEX_MODE = "true"
    expect(isMcpToolSearchEnabled(false, undefined, "claude-opus-4-6")).toBe(true)
    expect(isMcpToolSearchEnabled(false, undefined, "mimo-v2.6")).toBe(true)
    expect(isMcpToolSearchEnabled(false, undefined, "mimo-v2.6-ptc")).toBe(true)
  })

  test("allows the resolved session mode to override the process mode", () => {
    expect(isMcpToolSearchEnabled(false, "codex", "claude-opus-4-6")).toBe(true)
    expect(isMcpToolSearchEnabled(false, "codex", "mimo-v2.6")).toBe(true)
    expect(isMcpToolSearchEnabled(false, "codex", "mimo-v2.6-ptc")).toBe(true)
    expect(isMcpToolSearchEnabled(false, "auto", "gpt-5.2")).toBe(true)
    expect(isMcpToolSearchEnabled(false, "auto", "claude-opus-4-6")).toBe(false)
    expect(isMcpToolSearchEnabled(false, "auto", "mimo-v2.6")).toBe(false)
    process.env.MIMOCODE_CODEX_MODE = "true"
    expect(isMcpToolSearchEnabled(false, "auto", "claude-opus-4-6")).toBe(true)
    expect(isMcpToolSearchEnabled(false, "default", "claude-opus-4-6")).toBe(false)
    expect(isMcpToolSearchEnabled(false, "default", "mimo-v2.6")).toBe(false)
    expect(isMcpToolSearchEnabled(false, "default", "gpt-5.2")).toBe(true)
    expect(isMcpToolSearchEnabled(true, "default", "mimo-v2.6")).toBe(true)
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

  test("keeps explicit session selection separate from process inference", () => {
    process.env.MIMOCODE_CODEX_MODE = "true"
    expect(resolveHarnessMode({ modelID: "claude-opus-4-6", harness: "default" })).toBe("default")
    expect(resolveHarnessMode({ modelID: "claude-opus-4-6", harness: "auto" })).toBe("codex")
    expect(resolveHarnessMode({ modelID: "gpt-5.2", harness: "default" })).toBe("codex")
    expect(resolveHarnessMode({ modelID: "gpt-4o-mini", harness: "default" })).toBe("default")
  })
})

describe("usesMimoResponsesApi", () => {
  test("keeps API transport separate from harness selection", () => {
    expect(usesMimoResponsesApi("mimo-v2.6")).toBe(false)
    expect(usesMimoResponsesApi("mimo-v2.6-ptc")).toBe(true)
    expect(usesMimoResponsesApi("deployment-primary", "mimo-v2.6-ptc", "mimo")).toBe(true)
    expect(usesMimoResponsesApi("mimo-v2.5", "mimo-v2.6-ptc", "mimo")).toBe(false)
    expect(usesMimoResponsesApi("gpt-5.2-ptc")).toBe(false)
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
    expect(isMcpToolSearchEnabled(false, undefined, "mimo-v2.5")).toBe(true)
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
    expect(usesGPTToolset("gpt-5.2", "default")).toBe(true)
    expect(usesGPTToolset("gpt-4o-mini", "default")).toBe(false)
    expect(isMcpToolSearchEnabled(false, "default", "gpt-4o-mini")).toBe(false)
  })
})
