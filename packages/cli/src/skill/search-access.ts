import { Permission } from "../permission"

type SkillAccess = {
  permission?: Permission.Ruleset
  toolAllowlist?: string[]
  tools?: Record<string, boolean>
}

export function canLoadSkills(input: SkillAccess) {
  if (Permission.disabled(["skill"], input.permission ?? []).has("skill")) return false
  if (input.toolAllowlist && !input.toolAllowlist.includes("skill")) return false
  return input.tools?.skill !== false
}

export function canSearchSkills(input: SkillAccess) {
  const disabled = Permission.disabled(["skill", "skill_search"], input.permission ?? [])
  if (disabled.has("skill") || disabled.has("skill_search")) return false
  if (input.toolAllowlist && !input.toolAllowlist.includes("skill_search")) return false
  return input.tools?.skill_search !== false
}
