import { createHash } from "node:crypto"
import { describe, expect, test } from "bun:test"
import * as Catalog from "../../src/session/skill-catalog"
import { MessageID } from "../../src/session/schema"
import {
  catalogState,
  diffSkillCatalog,
  isLegacySkillCatalogPart,
  readSkillReminderMeta,
  skillReminderRev,
  stripLegacySkillCatalog,
} from "../../src/session/skill-catalog"
import { renderSkillCatalogReminder } from "../../src/session/skill-reminder"

const skill = (name: string, description = `${name} description`) => ({
  name,
  description,
  location: `/tmp/example/skills/${name}/SKILL.md`,
})

describe("skill catalog diff", () => {
  test("first catalog is a full entry; an empty catalog announces nothing", () => {
    expect(diffSkillCatalog({ announced: undefined, current: [] })).toBeUndefined()
    const change = diffSkillCatalog({ announced: undefined, current: [skill("zeta"), skill("alpha")] })
    expect(change?.kind).toBe("entry")
    if (change?.kind !== "entry") throw new Error("expected entry")
    expect(change.skills.map((item) => item.name)).toEqual(["alpha", "zeta"])
    expect(Object.keys(change.meta.skills)).toEqual(["alpha", "zeta"])
    const text = renderSkillCatalogReminder(change)
    expect(text.startsWith("<system-reminder>\n")).toBe(true)
    expect(text.endsWith("\n</system-reminder>")).toBe(true)
    expect(text.indexOf("<name>alpha</name>")).toBeLessThan(text.indexOf("<name>zeta</name>"))
  })

  test("unchanged catalog announces nothing", () => {
    const current = [skill("alpha"), skill("beta")]
    expect(diffSkillCatalog({ announced: catalogState(current), current })).toBeUndefined()
  })

  test("delta carries added and changed skills in full and removed skills by name", () => {
    const announced = catalogState([skill("alpha"), skill("beta"), skill("gone")])
    const change = diffSkillCatalog({
      announced,
      current: [skill("alpha"), skill("beta", "edited"), skill("new")],
    })
    expect(change?.kind).toBe("delta")
    if (change?.kind !== "delta") throw new Error("expected delta")
    expect(change.changed.map((item) => item.name)).toEqual(["beta", "new"])
    expect(change.removed).toEqual(["gone"])
    expect(Object.keys(change.meta.skills)).toEqual(["alpha", "beta", "new"])
    const text = renderSkillCatalogReminder(change)
    expect(text).toContain("<name>beta</name>")
    expect(text).toContain("<description>edited</description>")
    expect(text).not.toContain("<name>alpha</name>")
    expect(text).toContain("Removed skills (no longer available; do not load or follow them): gone")
  })

  test("removing every skill retracts the whole announced catalog", () => {
    const change = diffSkillCatalog({ announced: catalogState([skill("alpha")]), current: [] })
    expect(change).toMatchObject({ kind: "delta", changed: [], removed: ["alpha"], meta: { skills: {} } })
  })

  test("a moved skill counts as changed", () => {
    const moved = { ...skill("alpha"), location: "/tmp/example/other/alpha/SKILL.md" }
    const change = diffSkillCatalog({ announced: catalogState([skill("alpha")]), current: [moved] })
    expect(change?.kind).toBe("delta")
  })

  test("rev identifies the resulting catalog state", () => {
    const state = catalogState([skill("alpha")])
    expect(skillReminderRev({ kind: "entry", skills: state })).toMatch(/^skills:entry:[0-9a-f]{64}$/)
    expect(skillReminderRev({ kind: "entry", skills: state })).toBe(skillReminderRev({ kind: "entry", skills: { ...state } }))
    expect(skillReminderRev({ kind: "delta", skills: state })).not.toBe(skillReminderRev({ kind: "entry", skills: state }))
  })
})

describe("skill reminder metadata", () => {
  test("reads well-formed metadata and rejects anything else", () => {
    expect(readSkillReminderMeta({ kind: "delta", skills: { a: "x" } })).toEqual({ kind: "delta", skills: { a: "x" } })
    expect(readSkillReminderMeta(undefined)).toBeUndefined()
    expect(readSkillReminderMeta({ kind: "other", skills: {} })).toBeUndefined()
    expect(readSkillReminderMeta({ kind: "entry", skills: { a: 1 } })).toBeUndefined()
  })

  test("legacy user-side catalogs are untagged synthetic generated catalogs", () => {
    const text = "<system-reminder>\nSkills available in this session:\nNo skills are currently available.\n</system-reminder>"
    expect(isLegacySkillCatalogPart({ synthetic: true, text })).toBe(true)
    expect(isLegacySkillCatalogPart({ synthetic: false, text })).toBe(false)
    expect(isLegacySkillCatalogPart({ synthetic: true, text, metadata: { skillReminder: { kind: "entry", skills: {} } } })).toBe(false)
    // FC-005: the marker alone does not prove generated catalog content.
    expect(isLegacySkillCatalogPart({ synthetic: true, text: "<system-reminder>\nSkills available in this session:\n</system-reminder>" })).toBe(false)
  })
})

describe("legacy system catalog strip", () => {
  test("removes the verbose catalog block and its separator", () => {
    const system = [
      [
        "base prompt",
        "Skills available in this session:\n<available_skills>\n  <skill>\n    <name>a</name>\n  </skill>\n</available_skills>",
        "instructions",
      ].join("\n\n"),
    ]
    expect(stripLegacySkillCatalog(system)).toEqual(["base prompt\n\ninstructions"])
  })

  test("removes the empty-catalog sentence", () => {
    expect(stripLegacySkillCatalog(["base\n\nSkills available in this session:\nNo skills are currently available."]))
      .toEqual(["base"])
  })

  test("keeps a block the host system contains and still strips the engine block", () => {
    const block = "Skills available in this session:\nNo skills are currently available."
    const host = `host prompt\n\n${block}`
    expect(stripLegacySkillCatalog([`${host}\n\nmiddle\n\n${block}`], host)).toEqual([`${host}\n\nmiddle`])
  })

  test("leaves systems without a catalog unchanged", () => {
    const system = ["base prompt\n\ninstructions"]
    expect(stripLegacySkillCatalog(system)).toEqual(system)
  })
})

// FC-005: history written by older engines stays recognizable after the
// catalog moved to user-turn reminders, so it is dropped from model input
// without dropping quotations or loaded skill bodies.
const body = "<available_skills>\n  <skill>\n    <name>workflow</name>\n    <description>A useful workflow</description>\n    <location>file:///tmp/example/skills/workflow/SKILL.md</location>\n  </skill>\n</available_skills>"
const catalog = `Skills available in this session:\n${body}`
const wrap = (text: string) => `<system-reminder>\n${text}\n</system-reminder>`
const intro = "Skills provide specialized instructions and workflows for specific tasks."
const load = "Use the skill tool to load a skill when a task matches its description."
const search = [
  intro,
  "On the first user query in a session, when the task might benefit from a specialized workflow, call skill_search to find the best matching skill.",
  "Rewrite the user's request into a concise Skill Query with these dimensions when available: action, input, output, audience.",
  "Preserve an explicitly mentioned skill ID, name, or alias verbatim in the Skill Query so exact matching can take priority over BM25.",
  "If skill_search returns a loaded_skill_id, follow the loaded instructions. If it returns uncertain candidates, choose the best fit or continue without a skill. If it returns no_match, continue normally.",
  load,
].join("\n")
const v2 = wrap(`Authoritative skills catalog snapshot v2:\nWhen multiple snapshots exist, the last one is authoritative.\n${catalog}`)
const metadata = { skillCatalog: { schema: 2, version: createHash("sha256").update(catalog).digest("hex") } }

describe("historical skill catalog recognition", () => {
  test.each([
    ["v2", v2, metadata],
    ["single marker", wrap(catalog), undefined],
    ["double marker", wrap(`Skills available in this session:\n${catalog}`), undefined],
    ["historical load intro", wrap(`Skills available in this session:\n${intro}\n${load}\n${body}`), undefined],
    ["historical search intro", wrap(`Skills available in this session:\n${search}\n${body}`), undefined],
    ["empty catalog", wrap("Skills available in this session:\nNo skills are currently available."), undefined],
  ])("drops actual generated %s", (_name, text, metadata) => {
    expect(Catalog.isLegacySkillCatalogPart({ type: "text", text, synthetic: true, metadata })).toBe(true)
  })

  test.each([
    ["v2 without metadata", v2, undefined],
    ["v2 with a stale hash", v2, { skillCatalog: { schema: 2, version: "0".repeat(64) } }],
  ])("drops an engine-generated %s", (_name, text, metadata) => {
    expect(Catalog.isLegacySkillCatalogPart({ type: "text", text, synthetic: true, metadata })).toBe(true)
  })

  test.each([
    ["malformed catalog metadata", wrap(catalog), { skillCatalog: {} }],
    ["ordinary reference", `Quoted: ${wrap(catalog)}`, undefined],
    ["synthetic narrative", wrap("Skills available in this session:\nKeep this human-authored note"), undefined],
    ["loaded skill", `<skill_content name="workflow">${wrap(catalog)}</skill_content>`, undefined],
    ["loaded body nested in wrapper", wrap(`Skills available in this session:\n<skill_content>${body}</skill_content>`), undefined],
    ["changed search intro", wrap(`Skills available in this session:\n${search.replace("BM25", "other")}\n${body}`), undefined],
    ["trailing narrative", `${wrap(catalog)}\nUser note`, undefined],
  ])("keeps unproven %s", (_name, text, metadata) => {
    expect(Catalog.isLegacySkillCatalogPart({ type: "text", text, synthetic: true, metadata })).toBe(false)
  })

  test("authenticated v2 catalogs may describe skill_content syntax", () => {
    const text = catalog.replace("A useful workflow", "Explains <skill_content> tags and loaded instructions")
    const part = {
      type: "text", synthetic: true,
      text: wrap(`Authoritative skills catalog snapshot v2:\nWhen multiple snapshots exist, the last one is authoritative.\n${text}`),
      metadata: { skillCatalog: { schema: 2, version: createHash("sha256").update(text).digest("hex") } },
    }
    expect(Catalog.isLegacySkillCatalogPart(part)).toBe(true)
    // Without the authenticating metadata a described <skill_content> could be
    // a loaded body, so it is kept.
    expect(Catalog.isLegacySkillCatalogPart({ ...part, metadata: undefined })).toBe(false)
    expect(Catalog.isLegacySkillCatalogPart({ ...part, text: wrap(text), metadata: undefined })).toBe(false)
  })

  test("never identifies ordinary user text or tool output as a generated catalog", () => {
    // Not synthetic: a user may quote anything.
    expect(Catalog.isLegacySkillCatalogPart({ type: "text", text: v2, metadata })).toBe(false)
    expect(Catalog.isLegacySkillCatalogPart({ type: "tool", text: v2, synthetic: true, metadata })).toBe(false)
  })

  test("a tagged reminder is delivered even when it matches a historical shape", () => {
    const tagged = { skillReminder: { kind: "entry", skills: { workflow: "0123456789abcdef" } } }
    expect(Catalog.isLegacySkillCatalogPart({ type: "text", text: wrap(catalog), synthetic: true, metadata: tagged })).toBe(false)
  })
})

describe("schema-3 frozen catalog strip", () => {
  const turnID = MessageID.make("schema3-turn")
  const record = (text: string, extra: Partial<Catalog.SkillCatalogSnapshot> = {}): Catalog.SkillCatalogSnapshot => ({
    schema: 3,
    text,
    version: createHash("sha256").update(text).digest("hex"),
    turnID,
    ...extra,
  })

  test("removes exactly the recorded range and keeps the caller-owned format instruction", () => {
    const system = ["ENV\nJSON FORMAT\n\ndirectory\nINSTRUCTIONS"]
    const snapshot = record("directory", { formatPrefix: "JSON FORMAT\n\n", systemSlot: { message: 0, offset: 4 } })
    expect(Catalog.stripLegacySkillCatalog(system, "", snapshot)).toEqual(["ENV\nJSON FORMAT\n\n\nINSTRUCTIONS"])
  })

  test("drops a catalog-only system message instead of leaving it empty", () => {
    const snapshot = record("directory", { systemSlot: { message: 1, offset: 0 } })
    expect(Catalog.stripLegacySkillCatalog(["ENV", "directory", "PLUGIN"], "", snapshot)).toEqual(["ENV", "PLUGIN"])
  })

  test("infers a unique position for an older row without one", () => {
    expect(Catalog.stripLegacySkillCatalog(["ENV directory PLUGIN"], "", record("directory"))).toEqual(["ENV  PLUGIN"])
  })

  test("an ambiguous or stale position falls back to the generated block pattern", () => {
    const block = "Skills available in this session:\n<available_skills>\n  <skill>\n    <name>test</name>\n    <description>description</description>\n    <location>file:/tmp/example</location>\n  </skill>\n</available_skills>"
    const system = [`base\n\n${block}\n\nplugin`, `another\n\n${block}`]
    const expected = ["base\n\nplugin", "another"]
    expect(Catalog.stripLegacySkillCatalog(system, "", record(block))).toEqual(expected)
    const stale = record(block, { systemSlot: { message: 0, offset: 1 } })
    expect(Catalog.stripLegacySkillCatalog(system, "", stale)).toEqual(expected)
  })

  test("a record whose content version does not match falls back to the block pattern", () => {
    const block = "Skills available in this session:\nNo skills are currently available."
    const forged = { ...record("other"), version: "0".repeat(64) }
    expect(Catalog.stripLegacySkillCatalog([`base\n\n${block}`], "", forged)).toEqual(["base"])
  })
})
