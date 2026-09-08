import { createHash, randomUUID } from "node:crypto"
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

export type SkillCatalogSnapshot = {
  schema: 3
  text: string
  version: string
  turnID: MessageID
  // Position in the frozen system, independent of the catalog content hash.
  systemSlot?: { message: number; offset: number }
}

export function captureSkillCatalog(text: string | undefined, turnID: MessageID): SkillCatalogSnapshot {
  const canonical = canonicalSkillCatalog(text ?? "")
  return { schema: 3, text: canonical, version: createHash("sha256").update(canonical).digest("hex"), turnID }
}

export function newSkillCatalogSlot() {
  return `<mimocode-catalog-slot-${randomUUID()}>`
}

function occurrences(system: string[], text: string) {
  return system.flatMap((part, message) => {
    const offsets: { message: number; offset: number }[] = []
    for (let offset = part.indexOf(text); offset !== -1; offset = part.indexOf(text, offset + 1))
      offsets.push({ message, offset })
    return offsets
  })
}

function withoutSystemSlot(catalog: SkillCatalogSnapshot) {
  const { systemSlot: _slot, ...snapshot } = catalog
  return snapshot
}

// The marker is transient: validate and materialize before persistence or dispatch.
export function bindSkillCatalog(system: string[], catalog: SkillCatalogSnapshot, token: string) {
  if (!/^<mimocode-catalog-slot-[0-9a-f-]{36}>$/.test(token)) throw new Error("Invalid skill catalog slot token")
  const slots = occurrences(system, token)
  if (slots.length !== 1) throw new Error("Skill catalog slot must occur exactly once")
  const slot = slots[0]
  if (!catalog.text && system[slot.message] === token)
    return { system: system.filter((_, index) => index !== slot.message), catalog: withoutSystemSlot(catalog) }
  return {
    system: system.map((text, index) =>
      index === slot.message
        ? text.slice(0, slot.offset) + catalog.text + text.slice(slot.offset + token.length)
        : text,
    ),
    catalog: { ...catalog, systemSlot: slot },
  }
}

export function refreshFrozenSkillCatalog(
  system: string[],
  previous: SkillCatalogSnapshot | undefined,
  next: SkillCatalogSnapshot | undefined,
): { system: string[]; catalog: SkillCatalogSnapshot | undefined; reason?: string } {
  if (!next || previous === next) return { system, catalog: previous }
  // Old empty/legacy prefixes have no catalog bytes to remove. Append without
  // normalizing or rebuilding their frozen environment, instructions or plugin text.
  if (!previous?.text && !previous?.systemSlot) {
    // An old empty catalog has no insertion anchor. Keep it that way until
    // actual catalog text is available, rather than sending an empty message.
    if (!next.text) return { system, catalog: withoutSystemSlot(next) }
    return { system: [...system, next.text], catalog: { ...next, systemSlot: { message: system.length, offset: 0 } } }
  }
  const slots = previous.systemSlot ? [previous.systemSlot] : occurrences(system, previous.text)
  const slot = slots[0]
  if (
    slots.length !== 1 ||
    !slot ||
    !Number.isInteger(slot.message) ||
    !Number.isInteger(slot.offset) ||
    slot.message < 0 ||
    slot.offset < 0 ||
    typeof system[slot.message] !== "string" ||
    slot.offset > system[slot.message].length ||
    system[slot.message].slice(slot.offset, slot.offset + previous.text.length) !== previous.text
  )
    return {
      system,
      catalog: previous,
      reason: "Frozen catalog position is missing, invalid or ambiguous; preserving its original system/catalog pair",
    }
  // Legacy migrations may have appended a standalone catalog message. Drop
  // that message when clearing it, but never trim surrounding frozen content.
  if (!next.text && slot.offset === 0 && system[slot.message] === previous.text)
    return { system: system.filter((_, index) => index !== slot.message), catalog: withoutSystemSlot(next) }
  return {
    system: system.map((text, index) =>
      index === slot.message
        ? text.slice(0, slot.offset) + next.text + text.slice(slot.offset + previous.text.length)
        : text,
    ),
    catalog: { ...next, systemSlot: slot },
  }
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
  return /^<available_skills>\n(?:  <skill>\n    <name>[^\n]*<\/name>\n    <description>[\s\S]*?<\/description>\n    <location>file:[^\n]*<\/location>\n  <\/skill>\n)+<\/available_skills>$/.test(
    text,
  )
}

function isTruncatedCompatCatalog(text: string) {
  // Historical compat v2 snapshots hashed the output of the 50 KiB head
  // cap, which can end inside an XML field. Require that producer's exact
  // marker and UTF-8 byte budget in addition to the outer v2 hash below.
  const match =
    /^(<available_skills>\n  <skill>\n    <name>[\s\S]*)\n\n\.\.\. ([1-9]\d*) bytes of available skills truncated before model injection \.\.\.$/.exec(
      text,
    )
  if (!match) return false
  const headBytes = Buffer.byteLength(match[1], "utf8")
  const omitted = Number(match[2])
  const originalBytes = headBytes + omitted
  if (!Number.isSafeInteger(originalBytes) || originalBytes <= 50 * 1024) return false
  const reserve = Buffer.byteLength(
    `\n\n... ${originalBytes} bytes of available skills truncated before model injection ...`,
    "utf8",
  )
  const budget = 50 * 1024 - reserve
  return headBytes <= budget && headBytes >= budget - 3
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
    const body = catalog.slice(SKILL_CATALOG_REMINDER_MARKER.length + 1)
    if (!isCatalogBody(body) && !isTruncatedCompatCatalog(body)) return false
    return (
      skillCatalogSnapshotVersion(part.metadata) ===
      createHash("sha256").update(canonicalSkillCatalog(catalog)).digest("hex")
    )
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
