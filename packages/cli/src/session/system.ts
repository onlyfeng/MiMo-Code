import { Context, Effect, Layer } from "effect"

import { InstanceState } from "@/effect"

import PROMPT_DEFAULT from "./prompt/default.txt"
import PROMPT_GPT from "./prompt/gpt.txt"
import { Provider } from "@/provider"
import { sortVisionModels } from "@/provider/provider"
import type { Agent } from "@/agent/agent"
import { Permission } from "@/permission"
import { Skill } from "@/skill"
import { canLoadSkills, canSearchSkills } from "@/skill/search-access"
import { Flag } from "@/flag/flag"
import { type HarnessMode, usesCodexMode } from "@/tool/gpt"

export function provider(_model: Provider.Model, harness?: HarnessMode) {
  return [usesCodexMode(harness) ? PROMPT_GPT : PROMPT_DEFAULT]
}

export function agent(agent: Agent.Info, model: Provider.Model, harness?: HarnessMode) {
  return agent.prompt ? [agent.prompt] : provider(model, harness)
}

export interface Interface {
  readonly environment: (model: Provider.Model) => Effect.Effect<string[]>
  /**
   * Model-visible skills for the catalog reminder. Empty unless the effective
   * permission, agent allowlist and user tool toggles allow loading or
   * searching skills (FC-005).
   */
  readonly skillCatalog: (
    agent: Agent.Info,
    input?: {
      permission?: Permission.Ruleset
      tools?: Record<string, boolean>
    },
  ) => Effect.Effect<Skill.Info[]>
  /** Rescan skill roots for the current directory. */
  readonly refreshSkills: () => Effect.Effect<void>
  readonly available: (agent?: Agent.Info) => Effect.Effect<Skill.Info[]>
  readonly all: () => Effect.Effect<Skill.Info[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/SystemPrompt") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const skill = yield* Skill.Service
    const providerService = yield* Provider.Service

    return Service.of({
      environment: Effect.fn("SystemPrompt.environment")(function* (model: Provider.Model) {
        if (!Flag.MIMOCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT) return []
        const instance = yield* InstanceState.context
        const project = instance.project
        const base = [
          [
            `You are MiMo Code Agent, built by Xiaomi MiMo Team. You are an interactive agent that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.`,
            `You are powered by the model named ${model.api.id}. The exact model ID is ${model.providerID}/${model.api.id}`,
            `Here is some useful information about the environment you are running in:`,
            `<env>`,
            `  Working directory: ${instance.directory}`,
            `  Workspace root folder: ${instance.worktree}`,
            `  Is directory a git repo: ${project.vcs === "git" ? "yes" : "no"}`,
            `  Platform: ${process.platform}`,
            `</env>`,
          ].join("\n"),
          `IMPORTANT: Your response must ALWAYS strictly follow the same major language as the user.`,
        ]
        if (!model.capabilities.input.image) {
          // NOTE: vision models are resolved per-call (lazy). If provider list changes
          // mid-session, this block may differ between turns and break cached system prefix.
          // In practice provider config is stable within a session.
          const preferred = yield* providerService.getVisionModel().pipe(Effect.orElseSucceed(() => undefined))
          const visionModels = yield* providerService
            .list()
            .pipe(
              Effect.map((providers) =>
                sortVisionModels(
                  Object.values(providers)
                    .flatMap((info) => Object.values(info.models))
                    .filter((m) => m.capabilities.input.image === true),
                )
                  .map((m) => `${m.providerID}/${m.id}`)
                  .slice(0, 3),
              ),
            )
            .pipe(Effect.orElseSucceed(() => [] as string[]))
          const preferredRef = preferred ? `${preferred.providerID}/${preferred.id}` : visionModels[0]
          base.push(
            [
              `<vision-capability>`,
              `You CANNOT see or interpret image content — this model has no vision support.`,
              `Never attempt to analyze an image's visual content yourself. If a task needs image understanding, dispatch a vision-capable subagent via the actor tool, passing the image file path so the subagent can \`read_image\` it.`,
              visionModels.length
                ? `Vision-capable models you can pass to --model: ${visionModels.join(", ")}. Run \`actor models --vision\` to see all of them. Example: actor run <type> "<desc>" "analyze the image at <path>" --model ${preferredRef}.`
                : `No vision-capable model is currently configured. Ask the user to configure a vision model, or use an OCR tool to extract text.`,
              `If instead you need a file's raw binary structure (not its visual content), use a shell tool such as \`hexdump -C <path>\`, NOT the read tool.`,
            ].join("\n"),
          )
        }
        return base
      }),

      // The catalog reminder is model-facing, so it uses the same gates as the
      // skill and skill_search tools: an agent that can neither load nor search
      // skills is announced nothing (FC-005).
      skillCatalog: Effect.fn("SystemPrompt.skillCatalog")(function* (
        agent: Agent.Info,
        input?: {
          permission?: Permission.Ruleset
          tools?: Record<string, boolean>
        },
      ) {
        const permission = input?.permission ?? agent.permission
        const access = { permission, toolAllowlist: agent.toolAllowlist, tools: input?.tools }
        if (!canLoadSkills(access) && !canSearchSkills(access)) return []
        return yield* skill.modelInvocable({ ...agent, permission })
      }),

      refreshSkills: Effect.fn("SystemPrompt.refreshSkills")(function* () {
        yield* skill.refresh()
      }),

      // The user surface: authorization-filtered but NOT model-reachability
      // filtered, because it backs the mention scan that loads a skill the user
      // invoked explicitly. Do not switch this to modelInvocable.
      available: Effect.fn("SystemPrompt.available")(function* (agent?: Agent.Info) {
        return yield* skill.available(agent)
      }),

      all: Effect.fn("SystemPrompt.all")(function* () {
        return yield* skill.all()
      }),
    })
  }),
)

export const defaultLayer = layer.pipe(
  Layer.provide(Skill.defaultLayer),
  Layer.provide(Provider.defaultLayer),
)

export * as SystemPrompt from "./system"
