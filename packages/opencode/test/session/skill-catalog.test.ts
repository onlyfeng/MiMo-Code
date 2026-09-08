import { createHash } from "node:crypto"
import { describe, expect, test } from "bun:test"
import * as Catalog from "../../src/session/skill-catalog"
import { MessageID } from "../../src/session/schema"

const body = "<available_skills>\n  <skill>\n    <name>workflow</name>\n    <description>A useful workflow</description>\n    <location>file:///skills/workflow/SKILL.md</location>\n  </skill>\n</available_skills>"
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

describe("system tail skill catalog", () => {
  test("captures canonical text and an explicit empty catalog with stable content versions", () => {
    const turnID = MessageID.make("turn")
    expect(Catalog.captureSkillCatalog(`  ${catalog.replaceAll("\n", "\r\n")}  `, turnID)).toEqual({
      schema: 3, text: catalog, version: metadata.skillCatalog.version, turnID,
    })
    expect(Catalog.captureSkillCatalog(undefined, turnID)).toEqual({
      schema: 3, text: "", version: createHash("sha256").update("").digest("hex"), turnID,
    })
    expect(Catalog.captureSkillCatalog("", turnID)).toEqual(Catalog.captureSkillCatalog(undefined, turnID))
    expect(Catalog.captureSkillCatalog(catalog, MessageID.make("next")).version).toBe(metadata.skillCatalog.version)
  })

  test.each([
    ["v2", v2, metadata],
    ["single marker", wrap(catalog), undefined],
    ["double marker", wrap(`Skills available in this session:\n${catalog}`), undefined],
    ["historical load intro", wrap(`Skills available in this session:\n${intro}\n${load}\n${body}`), undefined],
    ["historical search intro", wrap(`Skills available in this session:\n${search}\n${body}`), undefined],
    ["empty catalog", wrap("Skills available in this session:\nNo skills are currently available."), undefined],
  ])("recognizes actual generated %s", (_name, text, metadata) => {
    expect(Catalog.isGeneratedSkillCatalog({ type: "text", text, synthetic: true, metadata })).toBe(true)
  })

  test.each([
    ["missing metadata", v2, undefined],
    ["wrong hash", v2, { skillCatalog: { schema: 2, version: "0".repeat(64) } }],
    ["wrong schema", v2, { skillCatalog: { ...metadata.skillCatalog, schema: 3 } }],
    ["malformed catalog metadata", wrap(catalog), { skillCatalog: {} }],
    ["ordinary reference", `Quoted: ${wrap(catalog)}`, undefined],
    ["synthetic narrative", wrap("Skills available in this session:\nKeep this human-authored note"), undefined],
    ["loaded skill", `<skill_content name="workflow">${wrap(catalog)}</skill_content>`, undefined],
    ["loaded body nested in wrapper", wrap(`Skills available in this session:\n<skill_content>${body}</skill_content>`), undefined],
    ["changed search intro", wrap(`Skills available in this session:\n${search.replace("BM25", "other")}\n${body}`), undefined],
    ["trailing narrative", `${wrap(catalog)}\nUser note`, undefined],
  ])("retains unproven %s", (_name, text, metadata) => {
    expect(Catalog.isGeneratedSkillCatalog({ type: "text", text, synthetic: true, metadata })).toBe(false)
  })

  test("never identifies ordinary user text or tool output as a generated directory", () => {
    expect(Catalog.isGeneratedSkillCatalog({ type: "text", text: v2, metadata })).toBe(false)
    expect(Catalog.isGeneratedSkillCatalog({ type: "tool", text: v2, synthetic: true, metadata })).toBe(false)
  })
})

describe("frozen catalog slot", () => {
  const turn = MessageID.make("slot-turn")
  test("materializes one token and refreshes only the recorded range including empty catalogs", () => {
    const old = Catalog.captureSkillCatalog("old catalog", turn)
    const token = Catalog.newSkillCatalogSlot()
    const bound = Catalog.bindSkillCatalog([`ENV\n${token}\nFORMAT\nINSTRUCTIONS\nPLUGIN`], old, token)
    expect(bound.system).toEqual(["ENV\nold catalog\nFORMAT\nINSTRUCTIONS\nPLUGIN"])
    expect(bound.catalog.version).toBe(old.version)
    const empty = Catalog.refreshFrozenSkillCatalog(bound.system, bound.catalog, Catalog.captureSkillCatalog("", turn))
    expect(empty.system).toEqual(["ENV\n\nFORMAT\nINSTRUCTIONS\nPLUGIN"])
    const next = Catalog.refreshFrozenSkillCatalog(
      empty.system,
      empty.catalog,
      Catalog.captureSkillCatalog("new", turn),
    )
    expect(next.system).toEqual(["ENV\nnew\nFORMAT\nINSTRUCTIONS\nPLUGIN"])
  })
  test("rejects removed or duplicated producer tokens before materializing metadata", () => {
    const token = Catalog.newSkillCatalogSlot()
    const value = Catalog.captureSkillCatalog("catalog", turn)
    expect(() => Catalog.bindSkillCatalog(["removed"], value, token)).toThrow()
    expect(() => Catalog.bindSkillCatalog([token, token], value, token)).toThrow()
  })
  test("migrates unique old schema3 text and legacy empty slots without touching other bytes", () => {
    const old = Catalog.captureSkillCatalog("old", turn)
    const next = Catalog.captureSkillCatalog("new", turn)
    expect(Catalog.refreshFrozenSkillCatalog(["ENV old PLUGIN"], old, next).system).toEqual(["ENV new PLUGIN"])
    expect(Catalog.refreshFrozenSkillCatalog(["LEGACY ENV"], undefined, next).system).toEqual(["LEGACY ENV", "new"])
    expect(
      Catalog.refreshFrozenSkillCatalog(["EMPTY ENV"], Catalog.captureSkillCatalog("", turn), next).system,
    ).toEqual(["EMPTY ENV", "new"])
  })
  test("empty legacy migration never introduces an empty system message", () => {
    const next = Catalog.captureSkillCatalog("", MessageID.make("empty-next"))
    for (const system of [[], ["FROZEN ENV"]]) {
      for (const old of [undefined, Catalog.captureSkillCatalog("", turn)]) {
        const result = Catalog.refreshFrozenSkillCatalog(system, old, next)
        expect(result.system).toEqual(system)
        expect(result.catalog).toEqual(next)
      }
    }
  })
  test("removes only a catalog-only message when its catalog becomes empty", () => {
    const old = Catalog.captureSkillCatalog("old", turn)
    const next = Catalog.captureSkillCatalog("", MessageID.make("empty-next"))
    const standalone = Catalog.refreshFrozenSkillCatalog(
      ["ENV", "old", "PLUGIN"],
      { ...old, systemSlot: { message: 1, offset: 0 } },
      next,
    )
    expect(standalone.system).toEqual(["ENV", "PLUGIN"])
    expect(standalone.catalog).toEqual(next)
    const restored = Catalog.refreshFrozenSkillCatalog(
      standalone.system,
      standalone.catalog,
      Catalog.captureSkillCatalog("new", turn),
    )
    expect(restored.system).toEqual(["ENV", "PLUGIN", "new"])
    const embedded = Catalog.refreshFrozenSkillCatalog(
      ["ENV old PLUGIN"],
      { ...old, systemSlot: { message: 0, offset: 4 } },
      next,
    )
    expect(embedded.system).toEqual(["ENV  PLUGIN"])
    const token = Catalog.newSkillCatalogSlot()
    const cold = Catalog.bindSkillCatalog(["ENV", token, "PLUGIN"], next, token)
    expect(cold.system).toEqual(["ENV", "PLUGIN"])
    expect(cold.catalog).toEqual(next)
  })
  test("ambiguous legacy matches and invalid persisted slots preserve the old pair", () => {
    const old = Catalog.captureSkillCatalog("old", turn)
    const next = Catalog.captureSkillCatalog("new", MessageID.make("next-turn"))
    const ambiguous = Catalog.refreshFrozenSkillCatalog(["old old"], old, next)
    expect(ambiguous.system).toEqual(["old old"])
    expect(ambiguous.catalog).toEqual(old)
    expect(ambiguous.reason).toBeDefined()
    const invalid = { ...old, systemSlot: { message: 0, offset: 1 } }
    const result = Catalog.refreshFrozenSkillCatalog(["old"], invalid, next)
    expect(result.catalog).toEqual(invalid)
    expect(result.system).toEqual(["old"])
    expect(result.reason).toBeDefined()
  })
})
