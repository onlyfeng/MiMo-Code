import { createHash } from "node:crypto"
import type { MessageID } from "./schema"

export const SKILL_CATALOG_REMINDER_MARKER = "Skills available in this session:"
export const SKILL_CATALOG_SNAPSHOT_MARKER = "Authoritative skills catalog snapshot v2:"
export const SKILL_CATALOG_METADATA_KEY = "skillCatalog"

export function isSkillCatalogReminder(text: string) {
  return text.includes(SKILL_CATALOG_REMINDER_MARKER)
}

export function canonicalSkillCatalog(text: string) {
  // Skill.fmt already sorts entries and emits stable <name>, <description>, and <location> fields.
  // Normalize only transport-level whitespace so the content hash does not drift across platforms.
  return text.replace(/\r\n?/g, "\n").trim()
}

export function isSkillCatalogSnapshot(text: string) {
  return text.includes(SKILL_CATALOG_SNAPSHOT_MARKER)
}

export function skillCatalogSnapshotVersion(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.[SKILL_CATALOG_METADATA_KEY]
  if (!value || typeof value !== "object" || !("version" in value) || typeof value.version !== "string") return
  return /^[a-f0-9]{64}$/.test(value.version) ? value.version : undefined
}

export function isLegacySkillCatalogReminder(text: string) {
  return isSkillCatalogReminder(text) && !isSkillCatalogSnapshot(text)
}

export type SkillCatalogSnapshot = { schema: 3; text: string; version: string; turnID: MessageID }

export function captureSkillCatalog(text: string | undefined, turnID: MessageID): SkillCatalogSnapshot {
  const canonical = canonicalSkillCatalog(text ?? "")
  return { schema: 3, text: canonical, version: createHash("sha256").update(canonical).digest("hex"), turnID }
}

const legacyLoadIntro = [
  "Skills provide specialized instructions and workflows for specific tasks.",
  "Use the skill tool to load a skill when a task matches its description.",
].join("\n")
const legacySearchIntro = [
  "Skills provide specialized instructions and workflows for specific tasks.",
  "On the first user query in a session, when the task might benefit from a specialized workflow, call skill_search to find the best matching skill.",
  "Rewrite the user's request into a concise Skill Query with these dimensions when available: action, input, output, audience.",
  "Preserve an explicitly mentioned skill ID, name, or alias verbatim in the Skill Query so exact matching can take priority over BM25.",
  "If skill_search returns a loaded_skill_id, follow the loaded instructions. If it returns uncertain candidates, choose the best fit or continue without a skill. If it returns no_match, continue normally.",
  "Use the skill tool to load a skill when a task matches its description.",
].join("\n")

function isCatalogBody(text: string) {
  if (text === "No skills are currently available.") return true
  return /^<available_skills>\n(?:  <skill>\n    <name>[^\n]*<\/name>\n    <description>[\s\S]*?<\/description>\n    <location>file:[^\n]*<\/location>\n  <\/skill>\n)+<\/available_skills>$/.test(text)
}

// This is a historical-format recognizer, not a substring detector. Only the
// system-tail projection may remove these parts; loaded instructions stay put.
export function isGeneratedSkillCatalog(part: {
  type: string
  synthetic?: boolean
  text?: string
  metadata?: Record<string, unknown>
}) {
  if (part.type !== "text" || part.synthetic !== true || typeof part.text !== "string") return false
  const text = part.text.replace(/\r\n?/g, "\n")
  if (/<skill_content\b/.test(text)) return false
  if (!text.startsWith("<system-reminder>\n") || !text.endsWith("\n</system-reminder>")) return false
  const content = text.slice("<system-reminder>\n".length, -"\n</system-reminder>".length)
  const v2 = `${SKILL_CATALOG_SNAPSHOT_MARKER}\nWhen multiple snapshots exist, the last one is authoritative.\n`
  if (content.startsWith(v2)) {
    const metadata = part.metadata?.[SKILL_CATALOG_METADATA_KEY]
    if (!metadata || typeof metadata !== "object" || !("schema" in metadata) || metadata.schema !== 2) return false
    const catalog = content.slice(v2.length)
    if (!catalog.startsWith(`${SKILL_CATALOG_REMINDER_MARKER}\n`)) return false
    if (!isCatalogBody(catalog.slice(SKILL_CATALOG_REMINDER_MARKER.length + 1))) return false
    return skillCatalogSnapshotVersion(part.metadata) === createHash("sha256").update(canonicalSkillCatalog(catalog)).digest("hex")
  }
  // Malformed v2 metadata must not fall back to the metadata-free legacy form.
  if (part.metadata?.[SKILL_CATALOG_METADATA_KEY] !== undefined) return false
  if (!content.startsWith(`${SKILL_CATALOG_REMINDER_MARKER}\n`)) return false
  const catalog = content.slice(SKILL_CATALOG_REMINDER_MARKER.length + 1)
  if (isCatalogBody(catalog)) return true
  return [SKILL_CATALOG_REMINDER_MARKER, legacyLoadIntro, legacySearchIntro].some(
    (intro) => catalog.startsWith(`${intro}\n`) && isCatalogBody(catalog.slice(intro.length + 1)),
  )
}
