import type { AssistantMessage, CheckpointCoverage, Config, Message, Model, Provider } from "@mimo-ai/sdk/v2"
import { compareUtf8Bytes } from "@mimo-ai/shared/util/encode"
import { contextWindow as overflowWindow } from "@/session/overflow"
import { Locale, Token } from "@/util"

type Selection = {
  providerID: string
  modelID: string
}

export function index(list: Provider[] | undefined) {
  return new Map((list ?? []).map((item) => [item.id, item] as const))
}

export function get(list: Provider[] | ReadonlyMap<string, Provider> | undefined, providerID: string, modelID: string) {
  const provider =
    list instanceof Map
      ? list.get(providerID)
      : Array.isArray(list)
        ? list.find((item) => item.id === providerID)
        : undefined
  return provider?.models[modelID]
}

export function name(
  list: Provider[] | ReadonlyMap<string, Provider> | undefined,
  providerID: string,
  modelID: string,
) {
  return get(list, providerID, modelID)?.name ?? modelID
}

/**
 * The `provider/model` the agent itself targets, resolved the way
 * `Provider.resolveModelRef` resolves it when called with no context provider:
 * a literal ref parses directly, a group ref takes the group default.
 *
 * A ref with no `model_groups` entry yields undefined, which callers must read
 * as "unknown", never as "match". That deliberately stops short of the server's
 * last branch, where an unconfigured built-in tier (`ultra`/`standard`/`lite`)
 * falls through to `Provider.defaultModel()`. Electing that default is not a
 * pure function of anything the TUI holds — it walks the recent list, the
 * configured provider set and a server-side priority table — so mirroring it
 * here would add a THIRD copy of default-model election (the server's, the
 * fallback in context/local.tsx, and this one) whose branches already disagree
 * on precedence. A stale copy would assert a variant the request never carries,
 * which is worse than the understatement it replaces.
 *
 * The residual gap: an agent on an unconfigured built-in tier reads
 * `variant: none` while the server applies the agent's variant. It closes when
 * prompt/index.tsx seeds the variant store from the last user message's
 * server-resolved value — but that seeding is keyed on a CHANGED session id,
 * not on each turn, so it covers opening or re-entering a session and NOT an
 * agent switch inside a live one (context/local.tsx only re-selects the model
 * for a literal agent `model`, never for a tier `modelRef`). Closing the rest
 * means electing the default here; the first three branches of `defaultModel()`
 * are exact reads of state the TUI already holds, so a partial mirror is
 * possible — it is declined as a design call, not because it cannot be written.
 */
function agentSelection(groups: Config["model_groups"], agent: { model?: Selection; modelRef?: string }) {
  if (!agent.modelRef) return agent.model
  if (agent.modelRef.includes("/")) return parse(agent.modelRef)
  const group = groups?.[agent.modelRef]
  if (!group) return undefined
  return parse(typeof group === "string" ? group : group.default)
}

/**
 * The variant the NEXT request will actually carry, mirroring the server's
 * fallback in session/prompt.ts `createUserMessage`. An explicit selection always
 * wins; otherwise the agent's configured variant applies, but only when the
 * request targets the agent's own model and that model really defines the
 * variant. Without this the prompt row reads `variant: none` while the server
 * sends and persists the agent's variant.
 */
export function effectiveVariant(
  list: Provider[] | ReadonlyMap<string, Provider> | undefined,
  input: {
    agent: { variant?: string; model?: Selection; modelRef?: string } | undefined
    groups: Config["model_groups"]
    selection: Selection
    selected?: string
  },
) {
  if (input.selected) return input.selected
  if (!input.agent?.variant) return undefined
  const agent = agentSelection(input.groups, input.agent)
  if (!agent) return undefined
  if (agent.providerID !== input.selection.providerID || agent.modelID !== input.selection.modelID) return undefined
  return get(list, input.selection.providerID, input.selection.modelID)?.variants?.[input.agent.variant]
    ? input.agent.variant
    : undefined
}

export function displayMetadata(
  list: Provider[] | ReadonlyMap<string, Provider> | undefined,
  input: Selection & { variant?: string },
  alias?: string,
) {
  return {
    alias: alias ?? name(list, input.providerID, input.modelID),
    detail: `${input.providerID}/${input.modelID} · variant: ${input.variant ?? "none"}`,
  }
}

export function latestMessageSelection(messages: Message[]) {
  const message = messages.at(-1)
  if (!message) return undefined
  if (message.role === "user") return message.model
  return {
    providerID: message.providerID,
    modelID: message.modelID,
    variant: message.variant,
  }
}

export function parse(value: string) {
  const [providerID, ...modelID] = value.split("/")
  return { providerID, modelID: modelID.join("/") }
}

export function initial(
  list: Provider[] | undefined,
  input: {
    argument?: string
    ready: boolean
    recent: Selection[]
    configured?: string
  },
) {
  // An explicit CLI choice is available immediately. Wait for persisted state
  // before choosing between the last TUI choice and the configured default.
  return [
    ...(input.argument ? [parse(input.argument)] : []),
    ...(input.ready ? input.recent : []),
    ...(input.ready && input.configured ? [parse(input.configured)] : []),
  ].find((item) => get(list, item.providerID, item.modelID))
}

/**
 * Provider cap, configured budget and compaction trigger for a model. Shares the
 * server's arithmetic so what the UI shows is the value that actually fires
 * compaction. The SDK mirrors of Config/Model carry every field the calculation
 * reads, so the cast is a structural narrowing, not a lie.
 */
export function contextWindow(config: Config | undefined, model: Model | undefined) {
  if (!model || !config) return undefined
  const result = overflowWindow({ cfg: config as never, model: model as never })
  // usable can legitimately reach 0 (window smaller than the reserves, or a large
  // compaction.reserved). Callers divide by it, so treat that as "unknown window".
  return result.hard === 0 || result.usable === 0 ? undefined : result
}

/** Window shape from `contextWindow` / the server's overflow arithmetic. */
export type ContextWindow = ReturnType<typeof overflowWindow>

export type CheckpointCoverageProjection = CheckpointCoverage

function compareMessageOrder(left: Pick<Message, "id" | "time">, right: Pick<Message, "id" | "time">) {
  if (left.time.created !== right.time.created) return left.time.created - right.time.created
  return compareUtf8Bytes(left.id, right.id)
}

/**
 * Compute the footer's context-fill readout and cumulative cost from the main
 * message list. Pure and render-free so it can be unit-tested below the SolidJS
 * memo in prompt/index.tsx (which has no render harness).
 *
 * The context number reads the LAST completed assistant turn's usage record —
 * the same source the server's overflow/compaction TRIGGER uses
 * (session/overflow.ts `isOverflow` over `MessageV2.Assistant["tokens"]`, fed by
 * prompt.ts `lastFinished.tokens`). There is deliberately no second estimator:
 * a manual /rebuild inserts only a checkpoint-boundary message and produces no
 * new usage record, so re-tokenizing the trimmed transcript here would show a
 * number that disagrees with the trigger and then jumps to a different measured
 * value on the next turn. Instead, when the last measured assistant turn falls
 * inside a region a rebuild collapsed, the measured figure is stale, so
 * `pending` is true and `context` blanks only the unmeasured numerator while
 * keeping the window frame (`—/960K`), since the window is still known and a
 * percentage of an unknown numerator is meaningless. The number refreshes for
 * real on the next assistant turn (which is created after the boundary). Cost is
 * a cumulative sum over all assistant turns and is unaffected by the boundary —
 * the whole point of /rebuild is to drop context, not cost.
 *
 * Staleness is decided from the server's independent checkpoint-coverage
 * projection, not from checkpoint markers in the bounded transcript cache. The
 * projection carries the effective tail watermark (digestUpTo when Recent
 * activity was folded, otherwise coveredUpTo) with its canonical committed time,
 * so marker and watermark messages may both be outside the latest 100 without
 * reviving a stale figure. IDs can be allocated before admission and committed
 * later, so resolved watermarks and the measured turn are compared by
 * `(time.created, id BINARY)`. An unresolved watermark fails closed until a
 * future authoritative refresh can resolve it.
 *
 * `context` is the final display string in every case: the pure function is the
 * sole owner of the pending placeholder (it is where the "figure is stale"
 * decision is made and where the tests live), so the renderer shows `context`
 * unconditionally and never has to reinterpret `pending`.
 */
export function computeContextUsage(input: {
  messages: Message[]
  window: ContextWindow | undefined
  /**
   * Authoritative checkpoint coverage for the session. This is deliberately
   * independent of `messages`, whose latest-100 cap can omit backdated markers.
   */
  checkpointCoverage: readonly CheckpointCoverageProjection[]
}): { context: string; cost: number; pending: boolean } | undefined {
  const { messages, window: win, checkpointCoverage } = input
  const last = messages
    .filter((m): m is AssistantMessage => m.role === "assistant" && m.tokens.output > 0)
    .toSorted(compareMessageOrder)
    .at(-1)
  if (!last) return undefined

  const tokens =
    last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
  if (tokens <= 0) return undefined

  const cost = messages.reduce((sum, m) => sum + (m.role === "assistant" ? m.cost : 0), 0)

  // The window frame is `<usable>` plus the `↓` config-budget marker. Denominator
  // is the compaction trigger, not the raw window — otherwise the percentage never
  // reaches 100% and a configured budget looks ignored.
  const frame = win ? `${Token.format(win.usable)}${win.source === "config" ? "↓" : ""}` : undefined

  // The measured turn is stale if ANY rebuild collapsed a region reaching it or
  // past it. The endpoint already resolved the exact watermark message and its
  // committed time, so this remains correct even when the bounded transcript
  // contains neither the marker nor the watermark. Missing resolution is not
  // evidence of freshness: fail closed instead of leaking a stale measurement.
  const pending = checkpointCoverage.some(
    (coverage) => coverage.watermark.status === "unresolved" || compareMessageOrder(coverage.watermark, last) >= 0,
  )
  if (pending) {
    // Blank only the unmeasured numerator; keep the frame when we have one so the
    // footer reads as deliberately-unknown (`—/960K`) rather than broken. With no
    // window there is no frame to keep, so a bare placeholder is correct. No
    // percentage either way — a percentage of an unknown numerator is meaningless.
    return { context: frame ? `—/${frame}` : "—", cost, pending: true }
  }

  const context = frame
    ? `${Locale.number(tokens)}/${frame} (${Math.round((tokens / win!.usable) * 100)}%)`
    : Locale.number(tokens)
  return { context, cost, pending: false }
}
