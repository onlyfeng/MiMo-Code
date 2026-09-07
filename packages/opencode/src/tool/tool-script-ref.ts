// Late-bound reference to the tool set executable from inside exec.
//
// exec needs the ToolRegistry def list to dispatch guest RPC calls, but the
// registry itself constructs exec (registry → exec →
// registry would be a module cycle). Mirroring workflowRef (workflow/runtime-ref.ts):
// the registry layer populates this module-local reference on initialisation and
// the tool reads it at call time.
import type { Effect } from "effect"
import type { Agent } from "../agent/agent"
import type { ModelID, ProviderID } from "../provider/schema"
import type * as Tool from "./tool"
import type { HarnessMode } from "./gpt"

type LateBoundRef<T> = { current: T | undefined }
type Binding = { value: unknown }
const bindings = new WeakMap<object, { base: unknown; entries: Binding[] }>()

// Managed runtimes can overlap and dispose out of order. Track active owners
// so a finalizer restores the newest live binding, never a closed runtime.
export function bindToolScriptRef<T>(ref: LateBoundRef<T>, value: T) {
  const current = bindings.get(ref)
  const state = current && ref.current === current.entries.at(-1)?.value ? current : { base: ref.current, entries: [] }
  if (state !== current) bindings.set(ref, state)
  const binding = { value }
  state.entries.push(binding)
  ref.current = value

  return () => {
    const index = state.entries.indexOf(binding)
    if (index === -1) return
    state.entries.splice(index, 1)
    if (bindings.get(ref) !== state) return
    if (ref.current === value) ref.current = (state.entries.at(-1)?.value ?? state.base) as T | undefined
    if (state.entries.length === 0) bindings.delete(ref)
  }
}

export const toolScriptRegistry: {
  current:
    | ((input?: {
        providerID: ProviderID
        modelID: ModelID
        modelAPIID?: string
        modelFamily?: string
        harnessModel?: string
        agent: Agent.Info
        harness?: HarnessMode
      }) => Effect.Effect<Tool.Def[]>)
    | undefined
} = { current: undefined }

// Compact Codex requests advertise exec plus the fork's direct actor and
// interactive/lifecycle controls. wait is reserved for upstream compatibility;
// it is not a separately registered tool. StructuredOutput is request-owned.
export const GPT_TOP_LEVEL_TOOLS = new Set(["exec", "wait", "actor", "question", "plan_exit", "session", "workflow"])

// These controls retain their direct conversation/actor entry points. Nested
// data, shell, task and skill calls use the same request authority as direct calls.
export const TOOL_SCRIPT_EXCLUDED = new Set([
  "exec",
  "mcp_tool_search",
  "invalid",
  "question",
  "actor",
  "plan_exit",
  "session",
  "workflow",
  "change_directory",
])

// Reserved aliases share the target definition and therefore its permission,
// execution, timeout, and truncation behavior. An excluded target remains
// unavailable under every alias.
export const TOOL_SCRIPT_ALIASES = {
  exec_command: "bash",
} as const
