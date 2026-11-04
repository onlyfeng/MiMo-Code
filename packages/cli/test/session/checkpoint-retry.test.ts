import { describe, expect, test } from "bun:test"
import * as fs from "fs/promises"
import * as path from "path"
import {
  quarantineCheckpoint,
  buildReflectionMessage,
  buildExtractionReflection,
  runValidatorsForCkpt,
  runTaskProgressValidators,
  loadPriorDiscoveredTitles,
  renderCurrentFile,
  CURRENT_FILE_CHAR_LIMIT,
  EXTRACTION_TARGET_RATIO,
} from "../../src/session/checkpoint-retry"
import { checkpointPath, memoryPath, metaDir } from "../../src/session/checkpoint-paths"
import type { SessionID } from "../../src/session/schema"
import { validateBudget, validateBudgetSections } from "../../src/session/checkpoint-validator"
import { ProjectID } from "../../src/project/schema"

// Fixture: pre-seed the memory dirs for a synthetic sessionID under the
// test's isolated data path (set by test/preload.ts via XDG_DATA_HOME).
function tmpSessionID(): SessionID {
  return ("s_" + Math.random().toString(36).slice(2, 10)) as SessionID
}

async function setupSession(sessionID: SessionID): Promise<void> {
  await fs.mkdir(metaDir(sessionID), { recursive: true })
}

describe("quarantineCheckpoint", () => {
  test("renames checkpoint.md to checkpoint.invalid.md", async () => {
    const sessionID = tmpSessionID()
    await setupSession(sessionID)
    await fs.writeFile(checkpointPath(sessionID), "Topic: bad\n")
    await quarantineCheckpoint(sessionID)
    const files = (await fs.readdir(metaDir(sessionID))).sort()
    expect(files).toContain("checkpoint.invalid.md")
    expect(files).not.toContain("checkpoint.md")
  })

  test("missing files are tolerated (no throw)", async () => {
    const sessionID = tmpSessionID()
    await setupSession(sessionID)
    await expect(quarantineCheckpoint(sessionID)).resolves.toBeUndefined()
  })
})

describe("buildReflectionMessage", () => {
  test("groups violations by file and includes paths", () => {
    const msg = buildReflectionMessage(
      [
        { file: "checkpoint.md", rule: "topic-too-long", severity: "error", detail: "Topic > 80" },
        { file: "checkpoint.md", rule: "subsection-missing", severity: "error", detail: "Missing Live resources" },
        { file: "memory.md", rule: "directive-not-revised", severity: "error", detail: "Directive D1 not updated" },
      ],
      { checkpoint: "/abs/checkpoint.md", memory: "/abs/memory.md" },
    )
    expect(msg).toContain("checkpoint.md:")
    expect(msg).toContain("- Topic > 80")
    expect(msg).toContain("- Missing Live resources")
    expect(msg).toContain("memory.md:")
    expect(msg).toContain("- Directive D1 not updated")
    expect(msg).toContain("CHECKPOINT_PATH = /abs/checkpoint.md")
    expect(msg).toContain("MEMORY_PATH     = /abs/memory.md")
  })
})

describe("runValidatorsForCkpt", () => {
  test("aggregates violations across checkpoint and memory files", async () => {
    const sessionID = tmpSessionID()
    await setupSession(sessionID)
    // bad checkpoint — missing all sub-sections
    await fs.writeFile(checkpointPath(sessionID), `Topic: only topic, no sections\n`)
    // memory.md exists at project scope, no expected revisions
    await fs.mkdir(path.dirname(memoryPath(ProjectID.global)), { recursive: true })
    await fs.writeFile(memoryPath(ProjectID.global), `# Memory\n\n## Directives\n- D1: stub\n`)

    const violations = await runValidatorsForCkpt(sessionID, {
      priorTitles: new Set(),
      expectedRevisions: [],
      projectID: ProjectID.global,
    })
    const rules = new Set(violations.map((v) => v.rule))
    expect(rules.has("subsection-missing")).toBe(true)
  })
})

describe("runTaskProgressValidators", () => {
  test("flags filler Next: lines from any task progress.md on disk", async () => {
    // Seed a task progress.md with filler "Next: continue" under the
    // session's per-sid tasks dir.
    const sessionID = tmpSessionID()
    await setupSession(sessionID)
    const taskDir = path.join(metaDir(sessionID), "tasks", "T_filler_test")
    await fs.mkdir(taskDir, { recursive: true })
    await fs.writeFile(path.join(taskDir, "progress.md"), `## ckpt #1\n- Next: continue\n`)
    const violations = await runTaskProgressValidators(sessionID)
    const rules = new Set(violations.map((v) => v.rule))
    expect(rules.has("next-filler")).toBe(true)
    await fs.rm(taskDir, { recursive: true, force: true })
  })
})

describe("loadPriorDiscoveredTitles", () => {
  test("extracts titles from checkpoint.md Discovered section", async () => {
    const sessionID = tmpSessionID()
    await setupSession(sessionID)
    await fs.writeFile(
      checkpointPath(sessionID),
      `Topic: test\n\n### Discovered\n- alpha title\n  Why: reason\n  How to apply: approach\n- beta title\n  Why: reason\n  How to apply: approach\n\n### Dead ends\n(none)\n`,
    )
    const titles = await loadPriorDiscoveredTitles(sessionID)
    expect(titles.has("alpha title")).toBe(true)
    expect(titles.has("beta title")).toBe(true)
  })

  test("returns empty set when checkpoint.md does not exist", async () => {
    const sessionID = tmpSessionID()
    await setupSession(sessionID)
    const titles = await loadPriorDiscoveredTitles(sessionID)
    expect(titles.size).toBe(0)
  })
})

describe("runValidatorsForCkpt budget", () => {
  test("over-budget checkpoint.md triggers extract-required violation", async () => {
    const sessionID = tmpSessionID()
    await setupSession(sessionID)
    // Write a large checkpoint file (with valid v5 sections) that exceeds the budget
    const bigContent =
      "Topic: big\n\n### Execution context\n(none)\n\n### Live resources\n(none)\n\n### Session metadata\n(none)\n\n### Discovered\n" +
      "- long entry about stuff\n".repeat(3000) +
      "\n### Dead ends\n(none)\n"
    await Bun.write(checkpointPath(sessionID), bigContent)
    const violations = await runValidatorsForCkpt(sessionID, {
      priorTitles: new Set(),
      expectedRevisions: [],
      projectID: ProjectID.global,
      budgets: { checkpoint: 2000, memory: 8000, progress_per_task: 6000 },
    })
    expect(violations.some((v) => v.severity === "extract-required" && v.file === "checkpoint.md")).toBe(true)
  })
})

describe("buildExtractionReflection", () => {
  test("produces prompt mentioning over-budget files", () => {
    const msg = buildExtractionReflection([
      { file: "checkpoint.md", rule: "budget-exceeded", severity: "extract-required", detail: "12000 tokens > 8000 budget" },
    ])
    expect(msg).toContain("EXTRACTION REQUIRED")
    expect(msg).toContain("checkpoint.md (12000 tokens > 8000 budget)")
    expect(msg).toContain("spillover")
  })
})

describe("buildExtractionReflection targets (FC-045)", () => {
  test("asks for one pass to a target below each budget, with the amount to move", () => {
    const msg = buildExtractionReflection([
      ...validateBudget("x".repeat(12_094 * 4), 11_000, "checkpoint.md"),
      ...validateBudgetSections(`## §5 Current work\n${"y".repeat(2_645 * 4)}`, { "§5 Current work": 2_000 }, "checkpoint.md"),
    ])
    expect(msg).toContain("in this single pass")
    expect(msg).toContain(`checkpoint.md: 12094 → at most ${Math.floor(11_000 * EXTRACTION_TARGET_RATIO)} tokens (move at least ${12_094 - Math.floor(11_000 * EXTRACTION_TARGET_RATIO)} tokens`)
    expect(msg).toContain(`checkpoint.md section "§5 Current work": 2650 → at most ${Math.floor(2_000 * EXTRACTION_TARGET_RATIO)} tokens`)
    expect(EXTRACTION_TARGET_RATIO).toBeLessThan(1)
  })

  test("a violation without measured sizes keeps the plain prompt", () => {
    const msg = buildExtractionReflection([
      { file: "checkpoint.md", rule: "budget-exceeded", severity: "extract-required", detail: "12000 tokens > 8000 budget" },
    ])
    expect(msg).not.toContain("at most")
  })
})

describe("renderCurrentFile", () => {
  const file = "/tmp/example/checkpoint.md"

  test("shows a file within the limit whole between the tags", () => {
    expect(renderCurrentFile("CHECKPOINT_PATH", file, "## §1 Active intent\n> \"example\"\n")).toBe(
      `<current-file name="CHECKPOINT_PATH" path="${file}">\n## §1 Active intent\n> "example"\n</current-file>`,
    )
  })

  test("cuts a longer file after its last whole line and says how much is shown", () => {
    const line = "- 🔵 T1 example line\n"
    const text = line.repeat(Math.ceil(CURRENT_FILE_CHAR_LIMIT / line.length) + 10)
    const shown = line.repeat(Math.floor(CURRENT_FILE_CHAR_LIMIT / line.length))
    expect(renderCurrentFile("CHECKPOINT_PATH", file, text)).toBe(
      `<current-file name="CHECKPOINT_PATH" path="${file}">\n${shown}</current-file>\n` +
        `Only the first ${shown.length} of this file's ${text.length} characters are shown.`,
    )
  })

  test("cuts a single over-long line without splitting a surrogate pair", () => {
    const text = "x".repeat(CURRENT_FILE_CHAR_LIMIT - 1) + "🔵 tail"
    const shown = "x".repeat(CURRENT_FILE_CHAR_LIMIT - 1)
    expect(renderCurrentFile("CHECKPOINT_PATH", file, text)).toBe(
      `<current-file name="CHECKPOINT_PATH" path="${file}">\n${shown}\n</current-file>\n` +
        `Only the first ${shown.length} of this file's ${text.length} characters are shown.`,
    )
  })
})
