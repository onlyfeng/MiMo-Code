import { createHash } from "node:crypto"
import { expect, test } from "bun:test"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { diffSkillCatalog, isGeneratedSkillCatalog, stripLegacySkillCatalog } from "../../src/session/skill-catalog"
import { renderSkillCatalogReminder } from "../../src/session/skill-reminder"
import { capUtf8TextByBytes, MODEL_VISIBLE_TEXT_CAP_BYTES } from "../../src/util/text-truncate"
import { ProviderTest } from "../fake/provider"

const model = ProviderTest.model()
const sessionID = SessionID.make("compat-catalog-projection")
const userID = MessageID.ascending()
const body = `<available_skills>\n  <skill>\n    <name>large-skill</name>\n    <description>${"Large description. ".repeat(5000)}</description>\n    <location>file:///skills/large/SKILL.md</location>\n  </skill>\n</available_skills>`
// The real pre-migration compat producer capped Skill.fmt before hashing and
// wrapping its v2 user part. A cut XML closing tag is historical generated data.
const catalog = `Skills available in this session:\n${capUtf8TextByBytes(body, MODEL_VISIBLE_TEXT_CAP_BYTES, "available skills")}`
const generated: MessageV2.TextPart = {
  id: PartID.ascending(),
  sessionID,
  messageID: userID,
  type: "text",
  synthetic: true,
  text: `<system-reminder>\nAuthoritative skills catalog snapshot v2:\nWhen multiple snapshots exist, the last one is authoritative.\n${catalog}\n</system-reminder>`,
  metadata: { skillCatalog: { schema: 2, version: createHash("sha256").update(catalog).digest("hex") } },
}
const messages: MessageV2.WithParts[] = [
  {
    info: {
      id: userID,
      sessionID,
      role: "user",
      time: { created: 1 },
      agent: "build",
      model: { providerID: model.providerID, modelID: model.id },
    },
    parts: [
      generated,
      { id: PartID.ascending(), sessionID, messageID: userID, type: "text", text: "CURRENT_DIRECT_INPUT" },
    ],
  },
]

test("compat capped v2 catalog leaves both the full and the preflight current-turn projections", async () => {
  expect(catalog).not.toContain("</available_skills>")
  expect(catalog).toContain("bytes of available skills truncated before model injection")
  expect(isGeneratedSkillCatalog(generated)).toBe(true)
  const converted = await MessageV2.toModelMessagesWithCurrentTurn(messages, model, userID)
  expect(converted.currentTurnMessages).toEqual(converted.messages)
  expect(JSON.stringify(converted.messages)).not.toContain("Skills available in this session:")
  expect(JSON.stringify(converted.currentTurnMessages)).toContain("CURRENT_DIRECT_INPUT")
})

function withCatalog(text: string): MessageV2.TextPart {
  return {
    ...generated,
    text: `<system-reminder>\nAuthoritative skills catalog snapshot v2:\nWhen multiple snapshots exist, the last one is authoritative.\n${text}\n</system-reminder>`,
    metadata: { skillCatalog: { schema: 2, version: createHash("sha256").update(text).digest("hex") } },
  }
}

test.each(["目录😀", "😀", "目录", "<skill_content>"])("compat recognizes the real UTF8 bounded producer for %s", (word) => {
  const unicode = body.replace("Large description. ".repeat(5000), word.repeat(30000))
  const capped = capUtf8TextByBytes(unicode, MODEL_VISIBLE_TEXT_CAP_BYTES, "available skills")
  expect(Buffer.byteLength(capped)).toBeLessThanOrEqual(MODEL_VISIBLE_TEXT_CAP_BYTES)
  expect(isGeneratedSkillCatalog(withCatalog(`Skills available in this session:\n${capped}`))).toBe(true)
})

// The pre-reminder compat producer froze `capAvailableSkills(Skill.fmt(list))`
// in the system tail, so a large catalog ends at the truncation marker instead
// of `</available_skills>`.
const cappedSystemBlock = `Skills available in this session:\n${capUtf8TextByBytes(body, MODEL_VISIBLE_TEXT_CAP_BYTES, "available skills")}`

test("compat strips its capped system-tail catalog from a frozen system", () => {
  expect(cappedSystemBlock).not.toContain("</available_skills>")
  expect(stripLegacySkillCatalog([`BASE\n\nENV\n\n${cappedSystemBlock}\n\nINSTRUCTIONS`])).toEqual([
    "BASE\n\nENV\n\nINSTRUCTIONS",
  ])
  // The strip stops at the producer's own marker: later text that merely
  // mentions the closing tag is instruction content and stays.
  const later = "INSTRUCTIONS quoting </available_skills> verbatim"
  expect(stripLegacySkillCatalog([`BASE\n\n${cappedSystemBlock}\n\n${later}`])).toEqual([`BASE\n\n${later}`])
  // A host-supplied copy is host content and stays; the engine's tail copy goes.
  const host = `HOST\n\n${cappedSystemBlock}`
  expect(stripLegacySkillCatalog([`${host}\n\nMIDDLE\n\n${cappedSystemBlock}`], host)).toEqual([`${host}\n\nMIDDLE`])
})

const large = (name: string, words: number) => ({
  name,
  description: `${name} ${"目录😀 description ".repeat(words)}`,
  location: `/tmp/example/skills/${name}/SKILL.md`,
})

test("compat caps the catalog entry and update reminders at the model-visible budget", () => {
  const skills = Array.from({ length: 8 }, (_, index) => large(`skill-${index}`, 1000))
  const entry = diffSkillCatalog({ announced: undefined, current: skills })
  if (entry?.kind !== "entry") throw new Error("Expected a catalog entry")
  const entryText = renderSkillCatalogReminder(entry)
  expect(entryText.startsWith("<system-reminder>\nSkill catalog for this conversation.")).toBe(true)
  expect(entryText.endsWith("\n</system-reminder>")).toBe(true)
  expect(entryText).toContain("bytes of available skills truncated before model injection")
  expect(entryText).toContain("Entries are summaries; a skill's instructions apply only after it is loaded.")
  expect(Buffer.byteLength(entryText)).toBeLessThanOrEqual(MODEL_VISIBLE_TEXT_CAP_BYTES + 512)
  // The announced state still covers every skill, as the frozen catalog did.
  expect(Object.keys(entry.meta.skills)).toHaveLength(8)

  const changed = skills.map((skill) => ({ ...skill, description: `${skill.description} changed` }))
  const delta = diffSkillCatalog({ announced: entry.meta.skills, current: changed.slice(1) })
  if (delta?.kind !== "delta") throw new Error("Expected a catalog update")
  const deltaText = renderSkillCatalogReminder(delta)
  expect(deltaText).toContain("bytes of available skills truncated before model injection")
  expect(deltaText).toContain("Removed skills (no longer available; do not load or follow them): skill-0")
  expect(deltaText.endsWith("\n</system-reminder>")).toBe(true)
  expect(Buffer.byteLength(deltaText)).toBeLessThanOrEqual(MODEL_VISIBLE_TEXT_CAP_BYTES + 512)

  const small = renderSkillCatalogReminder({ ...entry, skills: [large("small", 1)] })
  expect(small).not.toContain("truncated before model injection")
  expect(small).toContain("</available_skills>")
})
