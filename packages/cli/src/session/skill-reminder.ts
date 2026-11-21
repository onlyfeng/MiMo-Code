import { Skill } from "@/skill"
import { capUtf8TextByBytes, MODEL_VISIBLE_TEXT_CAP_BYTES } from "@/util/text-truncate"
import type { SkillCatalogChange } from "./skill-catalog"

// DC-CONTEXT-001: compat caps the model-visible catalog bytes. The reminder
// metadata still records the whole announced state.
function capAvailableSkills(text: string) {
  return capUtf8TextByBytes(text, MODEL_VISIBLE_TEXT_CAP_BYTES, "available skills")
}

export function renderSkillCatalogReminder(change: SkillCatalogChange) {
  if (change.kind === "entry") {
    return [
      "<system-reminder>",
      "Skill catalog for this conversation. Later reminders may add, change, or remove skills; the most recent catalog state wins.",
      capAvailableSkills(Skill.fmt(change.skills, { verbose: true })),
      "Entries are summaries; a skill's instructions apply only after it is loaded.",
      "</system-reminder>",
    ].join("\n")
  }
  return [
    "<system-reminder>",
    "Skill catalog update. This replaces earlier catalog entries for the skills listed below.",
    ...(change.changed.length > 0
      ? ["Added or changed skills:", capAvailableSkills(Skill.fmt(change.changed, { verbose: true }))]
      : []),
    ...(change.removed.length > 0
      ? [`Removed skills (no longer available; do not load or follow them): ${change.removed.join(", ")}`]
      : []),
    "</system-reminder>",
  ].join("\n")
}
