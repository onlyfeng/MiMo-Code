import type { JSONSchema7 } from "@ai-sdk/provider"
import { createHash } from "node:crypto"
import { jsonSchema, tool, type Tool as AITool } from "ai"
import { asSchema } from "@ai-sdk/provider-utils"
import { Effect } from "effect"
import { and, Database, eq } from "@/storage"
import type { Permission } from "@/permission"
import type { MessageID, SessionID } from "./schema"
import { SessionPrefixSnapshotTable, type SessionPrefixToolSnapshot } from "./session.sql"

export type NativeTool = AITool & { nativeInputSchema?: JSONSchema7 }

export const nativeSchema = (tool: AITool) => (tool as NativeTool).nativeInputSchema

export type Info = typeof SessionPrefixSnapshotTable.$inferSelect

type Profile = {
  providerID: string
  modelID: string
  modelAPIID: string
  modelFamily: string
  harnessModel?: string
  agent: string
  agentID: string
  harness: string
  systemMode: string
  system: string
  permission: Permission.Ruleset
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value)
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null"
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (typeof value !== "object") return "null"
  return `{${Object.keys(value)
    .toSorted()
    .flatMap((key) => {
      const item = (value as Record<string, unknown>)[key]
      if (item === undefined || typeof item === "function" || typeof item === "symbol") return []
      return [`${JSON.stringify(key)}:${stableStringify(item)}`]
    })
    .join(",")}}`
}

function hash(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex")
}

export function profileKey(input: Profile) {
  return hash(input)
}

export function systemHash(system: string[]) {
  return hash(system)
}

export function toolsHash(tools: Record<string, AITool>, activeTools: string[], loadedMcpTools: string[] = []) {
  // Identity includes hidden schemas as well as the wire membership: hidden MCP
  // changes must invalidate the immutable executable pool captured by a fork.
  return hash({
    tools: Object.keys(tools)
      .toSorted()
      .map((name) => {
        const item = tools[name]
        return {
          name,
          description: item.description,
          inputSchema: item.inputSchema,
          nativeInputSchema: nativeSchema(item),
          active: activeTools.includes(name),
        }
      }),
    loaded_mcp_tools: loadedMcpTools.toSorted(),
  })
}

export async function snapshotTools(tools: Record<string, AITool>, activeTools: string[]) {
  return Promise.all(
    Object.entries(tools).map(([name, item]) =>
      Promise.resolve(asSchema(item.inputSchema).jsonSchema).then(
        (input_schema): SessionPrefixToolSnapshot => ({
          name,
          description: item.description,
          input_schema,
          ...(nativeSchema(item) ? { native_input_schema: nativeSchema(item) } : {}),
          active: activeTools.includes(name),
        }),
      ),
    ),
  )
}

export function restoreActiveTools(items: SessionPrefixToolSnapshot[], legacyActiveTools?: readonly string[] | null) {
  // A shared-main writer updates the JSON but cannot update compat's extra
  // column. Complete new-format flags therefore outrank a stale legacy mask.
  if (items.every((item) => typeof item.active === "boolean")) {
    return items.filter((item) => item.active).map((item) => item.name)
  }
  if (legacyActiveTools) return items.filter((item) => legacyActiveTools.includes(item.name)).map((item) => item.name)
  return items.map((item) => item.name)
}

export function restoreTools(items: SessionPrefixToolSnapshot[], activeTools?: string[]) {
  const active = activeTools ? new Set(activeTools) : undefined
  return Object.fromEntries(
    items.flatMap((item) =>
      active && !active.has(item.name)
        ? []
        : [
            [
              item.name,
              {
                ...tool({ description: item.description, inputSchema: jsonSchema(item.input_schema) }),
                ...(item.native_input_schema ? { nativeInputSchema: item.native_input_schema } : {}),
              },
            ],
          ],
    ),
  )
}

export const get = Effect.fn("SessionPrefixSnapshot.get")(function* (sessionID: SessionID, key: string) {
  return yield* Effect.sync(() =>
    Database.use((db) =>
      db
        .select()
        .from(SessionPrefixSnapshotTable)
        .where(
          and(eq(SessionPrefixSnapshotTable.session_id, sessionID), eq(SessionPrefixSnapshotTable.profile_key, key)),
        )
        .get(),
    ),
  )
})

export const pin = Effect.fn("SessionPrefixSnapshot.pin")(function* (input: {
  sessionID: SessionID
  profileKey: string
  system: string[]
  toolsHash: string
  tools: SessionPrefixToolSnapshot[]
  activeTools: string[]
  loadedMcpTools: string[]
  watermarkMessageID: MessageID
}) {
  const now = Date.now()
  yield* Effect.sync(() =>
    Database.use((db) =>
      db
        .insert(SessionPrefixSnapshotTable)
        .values({
          session_id: input.sessionID,
          profile_key: input.profileKey,
          system: input.system,
          system_hash: systemHash(input.system),
          tools_hash: input.toolsHash,
          tools: input.tools,
          active_tools: input.activeTools,
          loaded_mcp_tools: input.loadedMcpTools,
          watermark_message_id: input.watermarkMessageID,
          revision: 1,
          created_at: now,
          updated_at: now,
        })
        .onConflictDoNothing()
        .run(),
    ),
  )
  const snapshot = yield* get(input.sessionID, input.profileKey)
  if (!snapshot) return yield* Effect.die(new Error("Failed to read pinned session prefix snapshot"))
  return snapshot
})

export const rotate = Effect.fn("SessionPrefixSnapshot.rotate")(function* (input: {
  sessionID: SessionID
  profileKey: string
  system: string[]
  toolsHash: string
  tools: SessionPrefixToolSnapshot[]
  activeTools: string[]
  loadedMcpTools: string[]
  watermarkMessageID: MessageID
}) {
  const current = yield* get(input.sessionID, input.profileKey)
  if (!current) return yield* pin(input)
  yield* Effect.sync(() =>
    Database.use((db) =>
      db
        .update(SessionPrefixSnapshotTable)
        .set({
          system: input.system,
          system_hash: systemHash(input.system),
          tools_hash: input.toolsHash,
          tools: input.tools,
          active_tools: input.activeTools,
          loaded_mcp_tools: input.loadedMcpTools,
          watermark_message_id: input.watermarkMessageID,
          revision: current.revision + 1,
          updated_at: Date.now(),
        })
        .where(
          and(
            eq(SessionPrefixSnapshotTable.session_id, input.sessionID),
            eq(SessionPrefixSnapshotTable.profile_key, input.profileKey),
          ),
        )
        .run(),
    ),
  )
  const snapshot = yield* get(input.sessionID, input.profileKey)
  if (!snapshot) return yield* Effect.die(new Error("Failed to read rotated session prefix snapshot"))
  return snapshot
})

export const advance = Effect.fn("SessionPrefixSnapshot.advance")(function* (input: {
  sessionID: SessionID
  profileKey: string
  revision: number
  watermarkMessageID: MessageID
}) {
  yield* Effect.sync(() =>
    Database.use((db) =>
      db
        .update(SessionPrefixSnapshotTable)
        .set({ watermark_message_id: input.watermarkMessageID, updated_at: Date.now() })
        .where(
          and(
            eq(SessionPrefixSnapshotTable.session_id, input.sessionID),
            eq(SessionPrefixSnapshotTable.profile_key, input.profileKey),
            eq(SessionPrefixSnapshotTable.revision, input.revision),
          ),
        )
        .run(),
    ),
  )
})

export * as SessionPrefixSnapshot from "./prefix-snapshot"
