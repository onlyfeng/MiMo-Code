import { createHash } from "node:crypto"
import type { MessageID } from "./schema"

// Legacy catalog text: the system-tail block and older user-side snapshots both
// start with this marker. New catalogs are user-turn reminders identified by
// metadata, never by text.
export const SKILL_CATALOG_REMINDER_MARKER = "Skills available in this session:"
/** Marker of the retired v2 user-side snapshot; still recognized in history. */
export const SKILL_CATALOG_SNAPSHOT_MARKER = "Authoritative skills catalog snapshot v2:"
/** Metadata key of the retired v2 snapshot parts. */
export const SKILL_CATALOG_METADATA_KEY = "skillCatalog"

export const SKILL_REMINDER_KEY = "skills"
export const SKILL_REMINDER_METADATA_KEY = "skillReminder"

export function canonicalSkillCatalog(text: string) {
  // Normalize only transport-level whitespace so a stored content hash still
  // matches across platforms.
  return text.replace(/\r\n?/g, "\n").trim()
}

export function skillCatalogSnapshotVersion(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.[SKILL_CATALOG_METADATA_KEY]
  if (!value || typeof value !== "object" || !("version" in value) || typeof value.version !== "string") return
  return /^[a-f0-9]{64}$/.test(value.version) ? value.version : undefined
}

/** Latest announced catalog after this reminder: skill name -> fingerprint. */
export type SkillReminderMeta = {
  kind: "entry" | "delta"
  skills: Record<string, string>
}

export type CatalogSkill = { name: string; description: string; location: string }

export function isSkillCatalogReminder(text: string) {
  return text.includes(SKILL_CATALOG_REMINDER_MARKER)
}

/**
 * A user-side catalog persisted by an older engine (no reminder metadata).
 *
 * FC-005: recognition is by proven historical format, not by substring. A
 * metadata-tagged reminder is current content and always delivered; a user
 * quotation of the marker and a loaded `<skill_content>` body are not catalogs
 * and must keep reaching the model.
 */
export function isLegacySkillCatalogPart(part: {
  type?: string
  synthetic?: boolean
  text: string
  metadata?: Record<string, unknown>
}) {
  if (readSkillReminderMeta(part.metadata?.[SKILL_REMINDER_METADATA_KEY])) return false
  return isGeneratedSkillCatalog({ ...part, type: part.type ?? "text" })
}

function sha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

// Only what the model sees in a catalog entry. Body edits are read at load
// time, so they do not need a reminder.
export function skillFingerprint(skill: CatalogSkill) {
  return sha256([skill.name, skill.description, skill.location]).slice(0, 16)
}

export function catalogState(skills: readonly CatalogSkill[]): Record<string, string> {
  return Object.fromEntries(
    skills.map((skill) => [skill.name, skillFingerprint(skill)]).toSorted(([a], [b]) => a.localeCompare(b)),
  )
}

export function skillReminderRev(meta: SkillReminderMeta) {
  return `skills:${meta.kind}:${sha256(Object.entries(meta.skills).toSorted(([a], [b]) => a.localeCompare(b)))}`
}

export function readSkillReminderMeta(value: unknown): SkillReminderMeta | undefined {
  if (!value || typeof value !== "object") return undefined
  if (!("kind" in value) || (value.kind !== "entry" && value.kind !== "delta")) return undefined
  if (!("skills" in value) || !value.skills || typeof value.skills !== "object") return undefined
  const skills: Record<string, string> = {}
  for (const [name, fingerprint] of Object.entries(value.skills)) {
    if (typeof fingerprint !== "string") return undefined
    skills[name] = fingerprint
  }
  return { kind: value.kind, skills }
}

/**
 * Latest catalog state the model has actually been shown in this window.
 *
 * A delta's metadata records the whole resulting state, but its text carries
 * only the changed and removed skills, so it is trustworthy only on top of a
 * full entry earlier in the same window. A delta without one (for example a
 * user turn that overflow compaction replayed past the boundary, leaving its
 * entry behind) is ignored, and the caller announces a full entry again
 * instead of treating unchanged skills as already visible.
 */
export function announcedSkillCatalog(
  messages: readonly {
    info: { role: string }
    parts: readonly { type: string; synthetic?: boolean; ignored?: boolean; metadata?: Record<string, unknown> }[]
  }[],
): Record<string, string> | undefined {
  let announced: Record<string, string> | undefined
  for (const message of messages) {
    if (message.info.role !== "user") continue
    for (const part of message.parts) {
      if (part.type !== "text" || !part.synthetic || part.ignored) continue
      const meta = readSkillReminderMeta(part.metadata?.[SKILL_REMINDER_METADATA_KEY])
      if (!meta) continue
      if (meta.kind === "entry" || announced) announced = meta.skills
    }
  }
  return announced
}

export type SkillCatalogChange =
  | { kind: "entry"; skills: CatalogSkill[]; meta: SkillReminderMeta }
  | { kind: "delta"; changed: CatalogSkill[]; removed: string[]; meta: SkillReminderMeta }

/**
 * Compare the current catalog with the latest announced state. Without an
 * announced state, a non-empty catalog needs an entry; with one, any added,
 * changed, or removed skill needs a delta. Undefined means nothing to inject.
 */
export function diffSkillCatalog(input: {
  announced: Record<string, string> | undefined
  current: readonly CatalogSkill[]
}): SkillCatalogChange | undefined {
  const skills = input.current.toSorted((a, b) => a.name.localeCompare(b.name))
  const state = catalogState(skills)
  if (!input.announced) {
    if (skills.length === 0) return undefined
    return { kind: "entry", skills, meta: { kind: "entry", skills: state } }
  }
  const announced = input.announced
  const changed = skills.filter((skill) => announced[skill.name] !== state[skill.name])
  const removed = Object.keys(announced)
    .filter((name) => !(name in state))
    .toSorted()
  if (changed.length === 0 && removed.length === 0) return undefined
  return { kind: "delta", changed, removed, meta: { kind: "delta", skills: state } }
}

// The legacy system tail held one block: the marker line, then either the
// verbose catalog or the empty-catalog sentence. buildSystemArray joins parts
// with a blank line, so the separator goes with the block.
// DC-CONTEXT-001: compat capped that catalog at 50 KiB, so a large block ends
// at the cap's truncation marker instead of its closing tag. The block stops at
// whichever terminator comes first.
const LEGACY_CATALOG_END =
  "<\\/available_skills>|\\n\\n\\.\\.\\. \\d+ bytes of available skills truncated before model injection \\.\\.\\."
const LEGACY_SYSTEM_CATALOG = new RegExp(
  `(?:\\n\\n)?Skills available in this session:\\n(?:<available_skills>(?:(?!${LEGACY_CATALOG_END})[\\s\\S])*(?:${LEGACY_CATALOG_END})|No skills are currently available\\.)`,
  "g",
)

/**
 * Remove legacy catalog blocks from a frozen system prompt. Blocks that the
 * host-supplied system itself contains are host content: as many leading
 * occurrences as the host has stay, and the engine's tail copies go.
 */
export function stripLegacySkillCatalog(system: readonly string[], hostSystem = ""): string[] {
  const hostBlocks = new Map<string, number>()
  for (const match of hostSystem.matchAll(LEGACY_SYSTEM_CATALOG)) {
    const block = match[0].trimStart()
    hostBlocks.set(block, (hostBlocks.get(block) ?? 0) + 1)
  }
  return system.map((part) =>
    part.replace(LEGACY_SYSTEM_CATALOG, (match) => {
      const block = match.trimStart()
      const keep = hostBlocks.get(block) ?? 0
      if (keep === 0) return ""
      hostBlocks.set(block, keep - 1)
      return match
    }),
  )
}

/**
 * Internal metadata of a prefix frozen while the catalog lived in the system
 * tail. Nothing writes it any more; the type stays so the shipped column still
 * parses, and `SessionPrefixSnapshot.getFrozen` clears it on first read. The
 * recorded range is not needed for that: its catalog text is the generated
 * block above, and its format prefix is the engine's structured-output
 * instruction, which the frozen prefix's own tools decide.
 */
export type SkillCatalogSnapshot = {
  schema: 3
  text: string
  version: string
  turnID: MessageID
  // Position in the frozen system, independent of the catalog content hash.
  systemSlot?: { message: number; offset: number }
  // Engine structured-output instruction stored inside the managed range.
  formatPrefix?: string
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
  if (!text.startsWith("<system-reminder>\n") || !text.endsWith("\n</system-reminder>")) return false
  const content = text.slice("<system-reminder>\n".length, -"\n</system-reminder>".length)
  const v2 = `${SKILL_CATALOG_SNAPSHOT_MARKER}\nWhen multiple snapshots exist, the last one is authoritative.\n`
  if (content.startsWith(v2)) {
    // The two-line preamble is engine-generated and the part is synthetic, so
    // this is a v2 snapshot. Its schema/hash authenticated the catalog while
    // the frozen system was rewritten in place; suppression no longer needs
    // that proof, and requiring it would leave an old session with both this
    // catalog and the new entry reminder. A loaded body still wins.
    const catalog = content.slice(v2.length)
    if (/<skill_content\b/.test(catalog)) {
      const metadata = part.metadata?.[SKILL_CATALOG_METADATA_KEY]
      if (!metadata || typeof metadata !== "object" || !("schema" in metadata) || metadata.schema !== 2) return false
      return (
        skillCatalogSnapshotVersion(part.metadata) ===
        createHash("sha256").update(canonicalSkillCatalog(catalog)).digest("hex")
      )
    }
    return true
  }
  // Only unproven legacy candidates need the loaded-content safeguard.
  if (/<skill_content\b/.test(text)) return false
  // Malformed v2 metadata must not fall back to the metadata-free legacy form.
  if (part.metadata?.[SKILL_CATALOG_METADATA_KEY] !== undefined) return false
  if (!content.startsWith(`${SKILL_CATALOG_REMINDER_MARKER}\n`)) return false
  const catalog = content.slice(SKILL_CATALOG_REMINDER_MARKER.length + 1)
  if (isCatalogBody(catalog)) return true
  return [SKILL_CATALOG_REMINDER_MARKER, legacyLoadIntro, legacySearchIntro].some(
    (intro) => catalog.startsWith(`${intro}\n`) && isCatalogBody(catalog.slice(intro.length + 1)),
  )
}
