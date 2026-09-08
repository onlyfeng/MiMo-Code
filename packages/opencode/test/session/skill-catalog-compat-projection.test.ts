import { createHash } from "node:crypto"
import { expect, test } from "bun:test"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { isGeneratedSkillCatalog } from "../../src/session/skill-catalog"
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

test("compat actual capped v2 catalog migrates out of both full and preflight current-turn messages", async () => {
  expect(catalog).not.toContain("</available_skills>")
  expect(catalog).toContain("bytes of available skills truncated before model injection")
  expect(isGeneratedSkillCatalog(generated)).toBe(true)
  const converted = await MessageV2.toModelMessagesWithCurrentTurn(messages, model, userID, {
    skillCatalogInSystem: true,
  })
  expect(converted.currentTurnMessages).toEqual(converted.messages)
  expect(JSON.stringify(converted.messages)).not.toContain("Skills available in this session:")
  expect(JSON.stringify(converted.currentTurnMessages)).toContain("CURRENT_DIRECT_INPUT")
  const legacy = await MessageV2.toModelMessagesWithCurrentTurn(messages, model, userID)
  expect(JSON.stringify(legacy.messages)).toContain("Skills available in this session:")
  expect(legacy.currentTurnMessages).toEqual(legacy.messages)
})

function withCatalog(text: string): MessageV2.TextPart {
  return {
    ...generated,
    text: `<system-reminder>\nAuthoritative skills catalog snapshot v2:\nWhen multiple snapshots exist, the last one is authoritative.\n${text}\n</system-reminder>`,
    metadata: { skillCatalog: { schema: 2, version: createHash("sha256").update(text).digest("hex") } },
  }
}

test.each(["目录😀", "😀", "目录"])("compat recognizes the real UTF8 bounded producer for %s", (word) => {
  const unicode = body.replace("Large description. ".repeat(5000), word.repeat(30000))
  const capped = capUtf8TextByBytes(unicode, MODEL_VISIBLE_TEXT_CAP_BYTES, "available skills")
  expect(Buffer.byteLength(capped)).toBeLessThanOrEqual(MODEL_VISIBLE_TEXT_CAP_BYTES)
  expect(isGeneratedSkillCatalog(withCatalog(`Skills available in this session:\n${capped}`))).toBe(true)
})

test.each([
  ["unrecognized marker", catalog.replace("before model injection", "after some other operation")],
  ["impossible omitted budget", catalog.replace(/\d+ bytes of available skills/, "1 bytes of available skills")],
  [
    "short forged directory",
    "Skills available in this session:\n<available_skills>\n  <skill>\n    <name>tiny</name>\n    <description>tiny\n\n... 90000 bytes of available skills truncated before model injection ...",
  ],
  ["wrong producer prefix length", catalog.replace("Large description.", "x")],
  ["loaded skill marker", catalog.replace("Large description.", '<skill_content name="loaded">')],
])("compat does not remove %s even with a matching v2 hash", (_name, text) => {
  expect(isGeneratedSkillCatalog(withCatalog(text))).toBe(false)
})

test("compat truncated layout still requires a generated part and original verified metadata", () => {
  expect(isGeneratedSkillCatalog({ ...generated, synthetic: false })).toBe(false)
  expect(isGeneratedSkillCatalog({ ...generated, metadata: undefined })).toBe(false)
  expect(
    isGeneratedSkillCatalog({ ...generated, metadata: { skillCatalog: { schema: 2, version: "0".repeat(64) } } }),
  ).toBe(false)
})
