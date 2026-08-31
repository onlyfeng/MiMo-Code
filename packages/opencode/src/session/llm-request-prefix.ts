import { Effect } from "effect"
import { asSchema, tool, jsonSchema, type Tool as AITool } from "ai"
import z from "zod"
import { MessageV2 } from "./message-v2"
import type { MessageID, SessionID } from "./schema"
import type { Agent } from "../agent/agent"
import type { Provider } from "../provider"
import { LLM } from "./llm"
import { ToolRegistry } from "../tool"
import { ProviderTransform } from "../provider"
import type { Permission } from "../permission"
import type { JSONObject } from "@ai-sdk/provider"
import {
  createMcpToolSearchCatalog,
  MCP_TOOL_SEARCH_ID,
  restoreMcpToolSearchMatches,
  type McpToolSearchEntry,
} from "../tool/mcp-tool-search"
import type { PromptConfig } from "./session"

/**
 * Build the LLM request prefix (system + tools + inheritedMessages) from the
 * given msgs array. Given identical inputs this returns deep-equal output
 * (modulo plugin trigger determinism, which is the only external non-determinism
 * source).
 *
 * Used by:
 *   - parent runLoop, to construct its own request
 *   - tryStartCheckpointWriter, to capture a frozen ForkContext at spawn time
 *
 * Both call sites must use this same function — the byte-equal invariant
 * across parent and fork is a structural consequence, not a separate assertion.
 * Exception: the parent runLoop sets `collapseCheckpointTail: true` so the model
 * sees a rebuild-tail activity log instead of hollow tool pairs; the checkpoint
 * writer leaves it off so it still writes from full-fidelity history. When a
 * prior checkpoint exists, parent/writer inheritedMessages therefore diverge by
 * design (checkpoint quality beats prefix-cache parity on the rebuild path).
 *
 * Prefix capture also consumes the returned schema-only tools to freeze a
 * ForkContext. Callers provide the current MCP tool set explicitly so this
 * helper stays outside the MCP layer cycle while applying the same provider
 * transform as the live path.
 *
 * Slicing (e.g. for fork capture at a watermark) is a caller concern; callers
 * pass the already-sliced msgs. ForkContext.watermarkMsgID is a boundary marker
 * on the fork context, not a parameter here.
 */
export const buildLLMRequestPrefix = Effect.fn("Session.buildLLMRequestPrefix")(function* (input: {
  sessionID: SessionID
  agent: Agent.Info
  model: Provider.Model
  msgs: MessageV2.WithParts[]
  /** Exact source user boundary for the active model-visible turn. */
  currentUserID?: MessageID
  permission?: Permission.Ruleset
  mcpTools?: Record<string, AITool>
  useMcpToolSearch?: boolean
  /**
   * Caller-built system-tail parts. Currently environment/format, then instruction
   * files. Caller is responsible for the ordering and content.
   */
  additions: string[]
  /** Frozen Session/Fork system; bypasses all system regeneration when present. */
  prebuiltSystem?: string[]
  prompt?: PromptConfig
  /**
   * Collapse post-checkpoint rebuild tails into an activity log. Enable for the
   * main-agent runLoop; leave off for checkpoint-writer fork capture so the
   * writer still sees full-fidelity recent history.
   */
  collapseCheckpointTail?: boolean
}) {
  const llm = yield* LLM.Service
  const toolRegistry = yield* ToolRegistry.Service

  // Find the last user message; required for system "user.system" pass-through
  const lastUserMsg = input.msgs.findLast((m) => m.info.role === "user")
  if (!lastUserMsg) return yield* Effect.die(new Error("buildLLMRequestPrefix: no user message in msgs"))
  // Always use full msgs — slicing is a fork-capture concern that lives at the
  // caller (ForkContext.watermarkMsgID is a boundary marker, not a slice arg).
  // Convert once through the source-ID-aware boundary helper so preflight can
  // retain the complete active turn while omitting only proven older history.
  const converted = yield* MessageV2.toModelMessagesWithCurrentTurnEffect(
    input.msgs,
    input.model,
    input.currentUserID ?? lastUserMsg.info.id,
    { collapseCheckpointTail: input.collapseCheckpointTail },
  )
  const inheritedMessages = converted.messages
  const lastUser = input.prompt
    ? {
        ...(lastUserMsg.info as MessageV2.User),
        system: input.prompt.system,
        systemMode: input.prompt.systemMode,
        harness: input.prompt.harness,
      }
    : (lastUserMsg.info as MessageV2.User)

  // Build system using LLM.buildSystemArray (single source of truth shared with stream())
  const system =
    input.prebuiltSystem ??
    (yield* llm.buildSystemArray({
      agent: input.agent,
      model: input.model,
      system: input.additions,
      user: lastUser,
      sessionID: input.sessionID as string,
      agentID: lastUser.agentID,
    }))

  // Resolve tools using parent agent's permission and toolAllowlist
  const toolDefs = yield* toolRegistry.tools({
    modelID: input.model.id,
    modelAPIID: input.model.api.id,
    modelFamily: input.model.family,
    providerID: input.model.providerID,
    agent: input.agent,
    permission: input.permission,
    harness: lastUser.harness,
  })
  const rawTools: Record<string, AITool> = {}
  for (const item of toolDefs) {
    const schema = ProviderTransform.schema(input.model, z.toJSONSchema(item.parameters))
    rawTools[item.id] = tool({
      description: item.description,
      inputSchema: jsonSchema(schema),
    })
  }
  const localToolNames = new Set(Object.keys(rawTools))
  const mcpSearchEntries: McpToolSearchEntry[] = []
  const agentToolAllowlist = input.agent.toolAllowlist ? new Set(input.agent.toolAllowlist) : undefined
  for (const [id, item] of Object.entries(input.mcpTools ?? {})) {
    if (!item.execute || localToolNames.has(id) || (agentToolAllowlist && !agentToolAllowlist.has(id))) continue
    const schema = yield* Effect.promise(() => Promise.resolve(asSchema(item.inputSchema).jsonSchema))
    const transformed = ProviderTransform.schema(input.model, schema)
    rawTools[id] = tool({
      description: item.description,
      inputSchema: jsonSchema(transformed),
    })
    mcpSearchEntries.push({
      name: id,
      description: item.description ?? "",
      parameters: transformed as JSONObject,
    })
  }
  const resolved = LLM.resolveTools({
    tools: rawTools,
    activeTools: input.useMcpToolSearch ? [MCP_TOOL_SEARCH_ID] : undefined,
    agent: input.agent,
    permission: input.permission,
    user: lastUser,
  })
  if (!input.useMcpToolSearch) {
    return {
      system,
      tools: resolved,
      inheritedMessages,
      currentTurnMessages: converted.currentTurnMessages,
      loadedMcpTools: [],
    }
  }

  const catalog = createMcpToolSearchCatalog(
    mcpSearchEntries.filter((entry) => resolved[entry.name]).toSorted((a, b) => a.name.localeCompare(b.name)),
  )
  const loadedMcpTools = restoreMcpToolSearchMatches(
    catalog,
    input.msgs.flatMap((message) => {
      if (message.info.role !== "assistant" || message.info.parentID !== lastUser.id) return []
      return message.parts.flatMap((part) =>
        part.type === "tool" && part.tool === MCP_TOOL_SEARCH_ID && part.state.status === "completed"
          ? [part.state.metadata]
          : [],
      )
    }),
  )
  const searchActive =
    input.model.capabilities.toolcall && catalog.entries.length > 0 && resolved[MCP_TOOL_SEARCH_ID] !== undefined
  const tools = Object.fromEntries(Object.entries(resolved).filter(([id]) => id !== MCP_TOOL_SEARCH_ID || searchActive))

  return {
    system,
    tools,
    inheritedMessages,
    currentTurnMessages: converted.currentTurnMessages,
    loadedMcpTools: [...loadedMcpTools],
  }
})
