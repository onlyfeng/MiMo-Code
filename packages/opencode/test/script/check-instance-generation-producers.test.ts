import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import {
  check,
  inspectCandidateSummaries,
  logicalOwnerGroupMembershipErrors,
  plannedHandoffClosureErrors,
  plannedOwnerParentClosureErrors,
  rendererOnlyExclusionErrors,
} from "../../script/check-instance-generation-producers"
import { tmpdir } from "../fixture/fixture"

const packageRoot = path.resolve(import.meta.dir, "../..")
const checker = path.join(packageRoot, "script/check-instance-generation-producers.ts")

async function runCLI(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawn(["bun", checker, ...args], {
    cwd: packageRoot,
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  return { exitCode, stdout, stderr }
}

async function run(args: string[], env: Record<string, string> = {}) {
  if (Object.keys(env).some((key) => key.startsWith("MIMOCODE_INSTANCE_GENERATION_"))) {
    const errors = check(args, { ...process.env, ...env })
    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: "",
      stderr: errors.map((error) => `instance generation producer check failed: ${error}`).join("\n"),
    }
  }
  return runCLI(args, env)
}

test("the planned Task 0 inventory mode accepts the frozen starting universe", async () => {
  const result = await run([
    "--check",
    "--allow-legacy-instance-settled-facades",
    "--allow-task2-legacy-instance-ref-providers",
  ])
  expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" })
})

test("the planned Task 0 disposer mode accepts only the Task 1 adapter", async () => {
  const result = await run(["--check-disposer-targets", "--allow-task1-adapter"])
  expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" })
})

test("unknown flags fail closed", async () => {
  const result = await run(["--check", "--future-flag"])
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("unknown flag: --future-flag")
})

test("exactly one CLI mode is mandatory", async () => {
  const missing = await run([])
  expect(missing.exitCode).toBe(1)
  expect(missing.stderr).toContain("exactly one checker mode is required")

  const both = await run(["--check", "--check-disposer-targets"])
  expect(both.exitCode).toBe(1)
  expect(both.stderr).toContain("exactly one checker mode is required")
})

test("temporary flags are valid only for their declared mode", async () => {
  const inventoryFlag = await run(["--check-disposer-targets", "--allow-task2-legacy-instance-ref-providers"])
  expect(inventoryFlag.exitCode).toBe(1)
  expect(inventoryFlag.stderr).toContain("is not valid with --check-disposer-targets")

  const disposerFlag = await run(["--check", "--allow-task1-adapter"])
  expect(disposerFlag.exitCode).toBe(1)
  expect(disposerFlag.stderr).toContain("is not valid with --check")
})

test("production CLI roots cannot be replaced by environment variables", async () => {
  const result = await runCLI(
    ["--check"],
    {
      MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT: "/nonexistent-retirement-src",
      MIMOCODE_INSTANCE_GENERATION_TEST_ROOT: "/nonexistent-retirement-test",
      MIMOCODE_INSTANCE_GENERATION_INVENTORY: "/dev/null",
    },
  )
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("production checker roots are fixed")
})

test("strict modes reject the frozen legacy compatibility surfaces", async () => {
  const inventory = await run(["--check"])
  expect(inventory.exitCode).toBe(1)
  expect(inventory.stderr).toContain("legacy settled facade requires --allow-legacy-instance-settled-facades")
  expect(inventory.stderr).toContain("raw InstanceRef provider requires --allow-task2-legacy-instance-ref-providers")

  const disposer = await run(["--check-disposer-targets"])
  expect(disposer.exitCode).toBe(1)
  expect(disposer.stderr).toContain("legacy disposeInstance target requires --allow-task1-adapter")
}, 30_000)

const inventoryHeader = [
  "# Instance Generation Producer Inventory",
  "",
  "| Anchor | Signals | Fingerprint | Mutation surface | Cancellation input | Settlement receipt | Canonical target source | Owner kind | Ownership mode | Task | Deterministic test |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
].join("\n")

async function fixture(input: { source?: Record<string, string>; tests?: Record<string, string>; inventory?: string }) {
  const tmp = await tmpdir()
  const sourceRoot = path.join(tmp.path, "src")
  const testRoot = path.join(tmp.path, "test")
  const inventory = path.join(tmp.path, "inventory.md")
  await mkdir(sourceRoot, { recursive: true })
  await mkdir(testRoot, { recursive: true })
  for (const [file, content] of Object.entries(input.source ?? {})) {
    const target = path.join(sourceRoot, file)
    await mkdir(path.dirname(target), { recursive: true })
    await Bun.write(target, content)
  }
  for (const [file, content] of Object.entries(input.tests ?? {})) {
    const target = path.join(testRoot, file)
    await mkdir(path.dirname(target), { recursive: true })
    await Bun.write(target, content)
  }
  await Bun.write(inventory, input.inventory ?? `${inventoryHeader}\n`)
  return {
    tmp,
    env: {
      MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT: sourceRoot,
      MIMOCODE_INSTANCE_GENERATION_TEST_ROOT: testRoot,
      MIMOCODE_INSTANCE_GENERATION_INVENTORY: inventory,
    },
  }
}

test("inventory rows reject placeholders, empty cells, and stale anchors", async () => {
  const placeholder = await fixture({
    source: { "project/example.ts": "export const Example = {}\n" },
    inventory: `${inventoryHeader}\n| \`src/project/example.ts:Example\` | none | none | TBD | none | none | process | maintenance | directory-root | Task 0 | checker test |\n`,
  })
  await using _placeholder = placeholder.tmp
  const placeholderResult = await run(["--check"], placeholder.env)
  expect(placeholderResult.stderr).toContain("placeholder inventory cell")

  const empty = await fixture({
    source: { "project/example.ts": "export const Example = {}\n" },
    inventory: `${inventoryHeader}\n| \`src/project/example.ts:Example\` | none | none |  | none | none | process | maintenance | directory-root | Task 0 | checker test |\n`,
  })
  await using _empty = empty.tmp
  const emptyResult = await run(["--check"], empty.env)
  expect(emptyResult.stderr).toContain("empty inventory cell")

  const stale = await fixture({
    source: { "project/example.ts": "export const Example = {}\n" },
    inventory: `${inventoryHeader}\n| \`src/project/example.ts:Missing\` | none | none | none | none | none | process | maintenance | directory-root | Task 0 | checker test |\n`,
  })
  await using _stale = stale.tmp
  const staleResult = await run(["--check"], stale.env)
  expect(staleResult.stderr).toContain("inventory anchor no longer resolves")
})

test("inventory row semantics fail closed", async () => {
  const input = await fixture({
    source: {
      "server/process.ts": "export function processOnly() { void task() }\n",
      "producer.ts": 'import { Effect } from "effect"\nexport function producer() { return Effect.forkDetach(work) }\n',
      "actor/spawn.ts":
        'import { Effect } from "effect"\nexport function unexpected(effect: Effect.Effect<void>) { return effect.pipe(Effect.provideService(InstanceRef, context)) }\n',
    },
  })
  await using _ = input.tmp
  const summaries = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  const rows = summaries.map((summary) => {
    const cells = summary.symbol === "processOnly"
      ? [
          "process-only:writes database",
          "cancel=process shutdown",
          "settle=process exit",
          "process lifetime",
          "process_exempt",
          "directory-root",
          "Task 0",
          "existing=test/missing.test.ts:missing case",
        ]
      : summary.symbol === "producer"
        ? [
            "instance: background producer",
            "cancel=AbortSignal",
            "settle=producer receipt",
            "target=Instance.current; lease=current",
            "producer",
            "transferred",
            "Task 5",
            "planned=test/project/instance-producer-retirement.test.ts:producer settles",
          ]
        : [
            "instance: raw context substitution",
            "cancel=owner close",
            "settle=lease receipt",
            "target=InstanceRef; replacement=none",
            "lease",
            "nested",
            "Task 2",
            "planned=test/server/shutdown-streams.test.ts:shutdown streams",
          ]
    return `| \`${summary.anchor}\` | ${summary.signals} | ${summary.fingerprint} | ${cells.join(" | ")} |`
  })
  await Bun.write(input.env.MIMOCODE_INSTANCE_GENERATION_INVENTORY, `${inventoryHeader}\n${rows.join("\n")}\n`)

  const result = await run(["--check", "--allow-task2-legacy-instance-ref-providers"], input.env)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("process exemption must be mutation-free")
  expect(result.stderr).toContain("transferred row requires an exact independent handoff lease anchor")
  expect(result.stderr).toContain("Task 2 raw provider row requires a replacement wrapper")
  expect(result.stderr).toContain("planned deterministic test does not belong to Task 2")
  expect(result.stderr).toContain("existing deterministic test anchor no longer resolves")
})

test("a transferred row names a frozen independent same-target handoff lease", async () => {
  const input = await fixture({
    source: {
      "project/producer.ts": 'import { Effect } from "effect"\nexport function producer() { return Effect.forkDetach(work) }\n',
    },
  })
  await using _ = input.tmp
  const summary = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)[0]!
  await Bun.write(
    input.env.MIMOCODE_INSTANCE_GENERATION_INVENTORY,
    [
      inventoryHeader,
      `| \`${summary.anchor}\` | ${summary.signals} | ${summary.fingerprint} | instance:background producer | cancel=GenerationOwnedHandle.close | settle=GenerationOwnedHandle receipt | target=Instance.current; lease=current; handoff=planned:src/file/watcher.ts:FileWatcher.state.channel-handoff; handoffTarget=Instance.current | producer | transferred | Task 5 | planned=test/project/instance-producer-retirement.test.ts:producer retirement |`,
      "",
    ].join("\n"),
  )
  expect(await run(["--check"], input.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })
})

test("logical owner groups require one exact same-target parent leader", async () => {
  const input = await fixture({
    source: {
      "project/owner-groups.ts": [
        'import { Effect } from "effect"',
        "export function freeLeader() { return Effect.forkDetach(first) }",
        "export function freeChild() { return Effect.forkDetach(second) }",
        "export function targetLeader() { return Effect.forkDetach(third) }",
        "export function targetChild() { return Effect.forkDetach(fourth) }",
        "export function ownerLeader() { return Effect.forkDetach(fifth) }",
        "export function ownerChild() { return Effect.forkDetach(sixth) }",
        "export function duplicateLeaderA() { return Effect.forkDetach(seventh) }",
        "export function duplicateLeaderB() { return Effect.forkDetach(eighth) }",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const summaries = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  const bySymbol = new Map(summaries.map((summary) => [summary.symbol.split("#", 1)[0]!, summary]))
  const row = (
    symbol: string,
    fields: string,
    mode: "transferred" | "nested",
    ownerID: string,
  ) => {
    const summary = bySymbol.get(symbol)!
    const handoff = mode === "transferred"
      ? "; handoff=planned:src/history/backfill.ts:History.Backfill.init#effect-fork-expressionstatement-a46b619cda.handoff; handoffTarget=Instance.current"
      : ""
    return `| \`${summary.anchor}\` | ${summary.signals} | ${summary.fingerprint} | instance:logical owner work | cancel=owner close | settle=owner receipt | ${fields}; ownerID=${ownerID}${handoff} | producer | ${mode} | Task 5 | planned=test/project/instance-producer-retirement.test.ts:producer retirement |`
  }
  await Bun.write(
    input.env.MIMOCODE_INSTANCE_GENERATION_INVENTORY,
    [
      inventoryHeader,
      row("freeLeader", "target=Instance.current; lease=current", "transferred", "free-text"),
      row("freeChild", "target=Instance.current; lease=current; parent=descriptive owner", "nested", "free-text"),
      row("targetLeader", "target=Instance.current; lease=current", "transferred", "target-mismatch"),
      row(
        "targetChild",
        `target=Other.target; lease=current; parent=${bySymbol.get("targetLeader")!.anchor}`,
        "nested",
        "target-mismatch",
      ),
      row("ownerLeader", "target=Instance.current; lease=current", "transferred", "owner-mismatch"),
      row(
        "ownerChild",
        `target=Instance.current; lease=current; parent=${bySymbol.get("ownerLeader")!.anchor}`,
        "nested",
        "different-owner",
      ),
      row("duplicateLeaderA", "target=Instance.current; lease=current", "transferred", "duplicate-leader"),
      row("duplicateLeaderB", "target=Instance.current; lease=current", "transferred", "duplicate-leader"),
      "",
    ].join("\n"),
  )

  const result = await run(["--check"], input.env)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("nested owner parent is not frozen or resolvable")
  expect(result.stderr).toContain("nested owner parent target does not match")
  expect(result.stderr).toContain("nested owner parent ownerID does not match")
  expect(result.stderr).toContain("logical owner group requires exactly one leader")
})

test("planned handoff anchors are a bidirectionally closed set", () => {
  const planned = new Map([
    ["planned:used", { task: "Task 5", lease: "current", target: "Instance.current" }],
    ["planned:stale", { task: "Task 5", lease: "current", target: "Instance.current" }],
  ])
  expect(plannedHandoffClosureErrors(new Set(["planned:used", "planned:missing"]), planned)).toEqual([
    "unfrozen planned handoff anchor: planned:missing",
    "planned handoff anchor is stale or unreferenced: planned:stale",
  ])
})

test("planned owner parent anchors are a bidirectionally closed set", () => {
  const planned = new Map([
    ["planned:used", { ownerID: "used", task: "Task 5", target: "Instance.current" }],
    ["planned:stale", { ownerID: "stale", task: "Task 5", target: "Instance.current" }],
  ])
  expect(plannedOwnerParentClosureErrors(new Set(["planned:used", "planned:missing"]), planned)).toEqual([
    "unfrozen planned owner parent anchor: planned:missing",
    "planned owner parent anchor is stale or unreferenced: planned:stale",
  ])
})

test("logical owner group membership is an exact frozen set", () => {
  const frozen = new Map<string, readonly string[]>([
    ["stable", ["src/example.ts:leader#one", "src/example.ts:child#two"]],
    ["stale", ["src/example.ts:old#three", "src/example.ts:old-child#four"]],
  ])
  const actual = new Map<string, ReadonlySet<string>>([
    ["stable", new Set(["src/example.ts:leader#one", "src/example.ts:replacement#five"])],
    ["unfrozen", new Set(["src/example.ts:new#six", "src/example.ts:new-child#seven"])],
  ])
  expect(logicalOwnerGroupMembershipErrors(actual, frozen)).toEqual([
    "logical owner group is not frozen: unfrozen",
    "frozen logical owner group membership changed: stable",
    "frozen logical owner group membership changed: stale",
  ])
})

test("an unrepresented producer candidate fails the inventory check", async () => {
  const input = await fixture({
    source: { "project/example.ts": 'import { Effect } from "effect"\nexport const Example = Effect.forkDetach(work)\n' },
  })
  await using _ = input.tmp
  const result = await run(["--check"], input.env)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("unrepresented producer candidates")
  expect(result.stderr).toContain("src/project/example.ts")
  expect(result.stderr).toContain("effect-fork")
})

test("native and stream continuations are part of the frozen universe", async () => {
  const input = await fixture({
    source: {
      "server/continuations.ts": [
        'emitter.once("close", callback)',
        "effect.subscribeCallback(callback)",
        "setImmediate(callback)",
        "queueMicrotask(callback)",
        "new WritableStream(sink)",
        "new TransformStream(transformer)",
        "new WebSocket(url)",
        "response.body.getReader()",
        "response.body.pipeThrough(transform)",
        "promise.then(callback)",
        "async function consume() { for await (const part of stream) consumePart(part) }",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const result = await run(["--check"], input.env)
  expect(result.exitCode).toBe(1)
  for (const signal of [
    "microtask",
    "detached-promise",
    "async-iterator",
    "native-callback",
    "stream-continuation",
    "timer-immediate",
    "transform-body",
    "websocket-client",
    "writable-body",
  ]) {
    expect(result.stderr).toContain(signal)
  }
})

test("void-discarded promise chains freeze every catch and finally continuation", async () => {
  const input = await fixture({
    source: {
      "server/prompt-async.ts": [
        "export function promptAsync() {",
        "  void runRequest().catch(onError).finally(onSettled)",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const summaries = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  expect(summaries).toHaveLength(1)
  expect(summaries[0]!.signals).toBe("detached-promise=2;naked-void=1")
  expect(
    new Set(
      summaries[0]!.candidates
        .filter((candidate) => candidate.kind === "detached-promise")
        .map((candidate) => candidate.candidateRole),
    ),
  ).toEqual(new Set(["catch", "finally"]))
})

test("a timer lifecycle leader owns the callback work in one cluster", async () => {
  const input = await fixture({
    source: {
      "server/timer.ts":
        'import { Effect } from "effect"\nexport function start() { setTimeout(() => Effect.runFork(work), 0) }\n',
    },
  })
  await using _ = input.tmp
  const summaries = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  expect(summaries).toHaveLength(1)
  expect(summaries[0]!.signals).toBe("effect-run-fork=1;timer-timeout=1")
  expect(summaries[0]!.anchor).toContain("#timer-timeout-")
})

test("all AsyncQueue waiters in the TUI control surface are frozen", async () => {
  const input = await fixture({
    source: {
      "server/routes/instance/tui.ts": [
        "const request = new AsyncQueue<Request>()",
        "const response = new AsyncQueue<Response>()",
        "export async function callTui() { return response.next() }",
        "export async function nextRequest() { return request.next() }",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const waiters = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).filter((summary) =>
    summary.candidates.some((candidate) => candidate.kind === "tui-long-poll"),
  )
  expect(waiters).toHaveLength(2)
  expect(new Set(waiters.map((summary) => summary.candidates[0]!.candidateRole))).toEqual(new Set(["next"]))
  expect(new Set(waiters.map((summary) => summary.symbol))).toEqual(new Set(["callTui", "nextRequest"]))
})

test("body, PTY, EffectBridge, and proxy callback owners are explicit candidates", async () => {
  const input = await fixture({
    source: {
      "server/routes/instance/session.ts": "export function body(c) { return stream(c, async (transport) => transport.write('ok')) }\n",
      "pty/index.ts": [
        "export function connect() {",
        "  return { onMessage: (message) => write(message), onClose: () => cleanup() }",
        "}",
      ].join("\n"),
      "session/prompt.ts": [
        "export function ops() { return { cancel: () => run.fork(cancel()) } }",
        "export function finish() { bridge.fork(publish()) }",
      ].join("\n"),
      "server/proxy.ts": [
        "export function http(res: Response) { return new Response(res.body, { status: res.status }) }",
        "export const app = (upgrade: UpgradeWebSocket) => upgrade(() => ({",
        "  onOpen() {},",
        "  onMessage() {},",
        "  onClose() {},",
        "}))",
        "export function remote(socket) { socket.onmessage = () => forward() }",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const summaries = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  const signals = (file: string) => summaries.filter((summary) => summary.file === file).flatMap((summary) => summary.candidates.map((item) => item.kind))
  expect(signals("src/server/routes/instance/session.ts")).toContain("readable-body")
  expect(signals("src/pty/index.ts").filter((kind) => kind === "native-callback")).toHaveLength(2)
  expect(signals("src/session/prompt.ts").filter((kind) => kind === "effect-fork")).toHaveLength(2)
  expect(signals("src/server/proxy.ts")).toContain("websocket-upgrade")
  expect(signals("src/server/proxy.ts")).toContain("readable-body")
  expect(signals("src/server/proxy.ts").filter((kind) => kind === "native-callback")).toHaveLength(4)
})

test("known callback APIs accept arbitrary identifier names", async () => {
  const input = await fixture({
    source: {
      "server/callbacks.ts": [
        'server.once("error", fail)',
        'server.once("listening", ready)',
        'signal.addEventListener("abort", abort)',
        "handle.onExit(cancelHandler)",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const callbacks = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).flatMap((summary) =>
    summary.candidates.filter((candidate) => candidate.kind === "native-callback"),
  )
  expect(callbacks).toHaveLength(4)
})

test("the Node listener terminal close acknowledgement is a shutdown candidate", async () => {
  const input = await fixture({
    source: {
      "server/adapter.node.ts": [
        'server.once("error", fail)',
        'server.once("listening", ready)',
        "server.close((error) => settle(error))",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const summaries = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  expect(summaries.flatMap((summary) => summary.candidates).filter((candidate) => candidate.kind === "native-callback"))
    .toHaveLength(3)
  expect(summaries.some((summary) => summary.anchor.includes("#native-callback-close-"))).toBe(true)
})

test("template event literals and indexed authority calls cannot bypass discovery", async () => {
  const input = await fixture({
    source: {
      "bus/indexed.ts": [
        "GlobalBus.emit(`event`, payload)",
        "GlobalBus['emit'](`event`, payload)",
        "Instance['bind'](callback)",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const candidates = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).flatMap(
    (summary) => summary.candidates,
  )
  expect(candidates.filter((candidate) => candidate.kind === "global-event-publisher")).toHaveLength(2)
  expect(candidates.filter((candidate) => candidate.kind === "instance-bind")).toHaveLength(1)
})

test("low-confidence continuations are limited to the frozen generation surfaces", async () => {
  const input = await fixture({
    source: {
      "server/routes/instance/session.ts": "export function promptAsync() { void run(); setInterval(heartbeat, 1000) }\n",
      "file/watcher.ts": 'emitter.once("change", callback)\n',
      "provider/provider.ts": "const reader = response.body.getReader(); new ReadableStream({ cancel })\n",
      "pty/index.ts": "new ReadableStream(source)\n",
      "cli/cmd/tui/context/sdk.tsx": "queueMicrotask(reconnect)\n",
      "cli/cmd/tui/component/starry-background.tsx": "setInterval(animate, 16)\n",
      "cli/cmd/tui/ui/dialog-select.tsx": "setTimeout(focus, 0)\n",
    },
  })
  await using _ = input.tmp
  const files = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).map((item) => item.file)
  expect(files).toContain("src/server/routes/instance/session.ts")
  expect(files).toContain("src/file/watcher.ts")
  expect(files).toContain("src/provider/provider.ts")
  expect(files).toContain("src/pty/index.ts")
  expect(files).toContain("src/cli/cmd/tui/context/sdk.tsx")
  expect(files).not.toContain("src/cli/cmd/tui/component/starry-background.tsx")
  expect(files).not.toContain("src/cli/cmd/tui/ui/dialog-select.tsx")
})

test("every frozen generation surface admits low-confidence continuation discovery", async () => {
  const files = [
    "actor/example.ts",
    "bus/example.ts",
    "config/example.ts",
    "control-plane/example.ts",
    "cron/example.ts",
    "effect/example.ts",
    "history/example.ts",
    "inbox/example.ts",
    "memory/example.ts",
    "plugin/example.ts",
    "project/example.ts",
    "provider/provider.ts",
    "pty/example.ts",
    "server/example.ts",
    "session/example.ts",
    "sync/example.ts",
    "workflow/example.ts",
    "worktree/example.ts",
    "file/watcher.ts",
    "tool/actor.ts",
    "tool/session.ts",
    "tool/workflow.ts",
    "cli/bootstrap.ts",
    "cli/cmd/acp.ts",
    "cli/cmd/serve.ts",
    "cli/cmd/web.ts",
    "cli/cmd/tui/context/example.tsx",
    "cli/cmd/tui/thread.ts",
    "cli/cmd/tui/worker.ts",
    "cli/cmd/tui/component/dialog-workspace-create.tsx",
    "cli/cmd/tui/component/dialog-session-list.tsx",
  ]
  const input = await fixture({ source: Object.fromEntries(files.map((file) => [file, "setTimeout(callback, 0)\n"])) })
  await using _ = input.tmp
  expect(new Set(inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).map((item) => item.file))).toEqual(
    new Set(files.map((file) => `src/${file}`)),
  )
})

test("Bun.spawn is low-confidence and only enters the frozen generation surfaces", async () => {
  const input = await fixture({
    source: {
      "project/native.ts": "Bun.spawn(command, { onExit })\n",
      "cli/cmd/tui/component/starry-background.tsx": "Bun.spawn(command, { onExit })\n",
    },
  })
  await using _ = input.tmp
  const native = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).filter((summary) =>
    summary.candidates.some((candidate) => candidate.kind === "native-process"),
  )
  expect(native).toHaveLength(1)
  expect(native[0]!.file).toBe("src/project/native.ts")
})

test("renderer-only exclusions are exact and fail on replacement or deletion", async () => {
  const source = await Bun.file(path.join(packageRoot, "src/cli/cmd/tui/context/keybind.tsx")).text()
  const replaced = await fixture({
    source: {
      "cli/cmd/tui/context/keybind.tsx": source.replace("focus.focus()\n        }, 2000)", "focus.blur()\n        }, 2000)"),
    },
  })
  await using _replaced = replaced.tmp
  const replacedResult = await run(["--check"], replaced.env)
  expect(replacedResult.stderr).toContain("renderer-only exclusion is missing or changed")
  expect(replacedResult.stderr).toContain("unrepresented producer candidates")

  const deleted = await fixture({
    source: {
      "cli/cmd/tui/context/keybind.tsx": source.replace("setTimeout(() =>", "ignoredTimeout(() =>"),
    },
  })
  await using _deleted = deleted.tmp
  const deletedResult = await run(["--check"], deleted.env)
  expect(deletedResult.stderr).toContain("renderer-only exclusion is missing or changed")
})

test("production-frozen renderer exclusions fail when the whole source file disappears", async () => {
  const tmp = await tmpdir()
  await using _ = tmp
  expect(rendererOnlyExclusionErrors(tmp.path, [], true)).toContain(
    "renderer-only exclusion source file is missing: src/cli/cmd/tui/config/tui.ts",
  )
})

test("the planned RemoteRelayOwner contract is exact and mechanically required", async () => {
  const tmp = await tmpdir()
  await using _ = tmp
  const inventory = path.join(tmp.path, "inventory.md")
  await Bun.write(
    inventory,
    (await Bun.file(path.resolve(packageRoot, "../../docs/compose/spec/instance-generation-producer-inventory.md")).text())
      .replace("{workspaceID,sourceSlot,serverIncarnation}", "{workspaceID,generation}"),
  )
  const result = await run(
    ["--check", "--allow-legacy-instance-settled-facades", "--allow-task2-legacy-instance-ref-providers"],
    { MIMOCODE_INSTANCE_GENERATION_INVENTORY: inventory },
  )
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("planned RemoteRelayOwner contract is missing or changed")
})

test("source-specific finite providers, proxy transports, and remote relays keep their exact ownership", async () => {
  const inventory = await Bun.file(
    path.resolve(packageRoot, "../../docs/compose/spec/instance-generation-producer-inventory.md"),
  ).text()
  const row = (anchor: string) => inventory.split("\n").find((line) => line.includes(`\`${anchor}\``)) ?? ""

  expect(row("src/actor/registry.ts:layer#effect-fork-expressionstatement-015bebb1f3")).toContain(
    "target=SharedShutdown.current; lease=process-root; ownerID=actor-registry.process-scan",
  )
  expect(row("src/actor/spawn.ts:notify#instance-ref-provider-expressionstatement-0c1396d50f")).toContain(
    "target=parentInstance; lease=child; ownerID=actor.parent-notify; parent=planned:src/actor/spawn.ts:notify.parent-target-lease",
  )
  expect(row("src/actor/spawn.ts:notify#instance-ref-provider-expressionstatement-0c1396d50f")).toContain(
    "| lease | nested | Task 2 |",
  )
  expect(row("src/actor/spawn.ts:notifyTerminal#instance-ref-provider-expressionstatement-77472bca03")).toContain(
    "target=parentInstance; lease=child; ownerID=actor.parent-terminal-notify; parent=planned:src/actor/spawn.ts:notifyTerminal.parent-target-lease",
  )
  expect(row("src/actor/spawn.ts:forkWork.boundWork#instance-ref-provider-boundWork-91987c3ae1")).toContain(
    "target=input.instanceRef ?? Instance.current; lease=current-or-child-by-target-equality; same-target=current-first; cross-target=short-child-first",
  )
  expect(row("src/effect/bridge.ts:fork#effect-run-fork-return-312d93e5a1")).toContain(
    "target=EffectBridge.capturedExecution.target; lease=captured-execution; replacement=enterInstanceExecutionEffect",
  )
  expect(row("src/tool/session.ts:SessionTool.execute.wtDir#instance-ref-provider-wtDir-8368a1cdb2")).toContain(
    "target=ctxResult.value; lease=child; ownerID=tool-session.create-worktree",
  )
  expect(row("src/tool/session.ts:SessionTool.execute.remExit#instance-ref-provider-remExit-eb0cfe5ff3")).toContain(
    "target=ctxExit.value; lease=child; ownerID=tool-session.remove-child-worktree",
  )
  expect(row("src/workflow/runtime.ts:spawnIsolated.wtBridge#instance-ref-provider-wtBridge-5d6e008362")).toContain(
    "target=wtCtx; lease=child; ownerID=workflow.isolated-call",
  )

  const remoteTarget = "RemoteRelayOwner.fromProvenance(workspaceID,sourceSlot,serverIncarnation)"
  expect(row("src/control-plane/workspace.ts:startWorkspaceSyncing#naked-void-startSync-ef678fa9a4")).toContain(
    `target=${remoteTarget}`,
  )
  expect(row("src/control-plane/workspace.ts:startWorkspaceSyncing#naked-void-startSync-ef678fa9a4")).toContain(
    "| Task 6 |",
  )

  const requestTarget = "InstanceMiddleware.requestLease.target"
  for (const anchor of [
    "src/server/proxy.ts:app#websocket-upgrade-app-dabac3c046",
    "src/server/proxy.ts:http#readable-body-return-c333849276",
  ]) {
    expect(row(anchor)).toContain(`target=${requestTarget}; lease=current`)
    expect(row(anchor)).toContain("same-target=current-first")
    expect(row(anchor)).toContain("| transferred | Task 5 |")
    expect(row(anchor)).not.toContain("RemoteRelayOwner")
  }
  expect(row("src/server/routes/global.ts:GlobalRoutes.post_dispose#global-event-publisher-emit-1b62939f15")).toContain(
    "| retirement | directory-root | Task 6 |",
  )
  expect(row("src/server/routes/global.ts:GlobalRoutes.post_upgrade#global-event-publisher-emit-fa9ce18537")).toContain(
    "target=ServerIncarnation.current; lease=process-request; ownerID=global-upgrade.request-event; parent=planned:src/server/routes/global.ts:GlobalRoutes.post_upgrade.request-owner",
  )
  expect(row("src/server/routes/global.ts:GlobalRoutes.post_upgrade#global-event-publisher-emit-fa9ce18537")).toContain(
    "| lease | nested | Task 6 |",
  )
  const globalDisposalLeader = "src/config/config.ts:Config.invalidate#naked-void-expressionstatement-9de8ef398e"
  expect(row(globalDisposalLeader)).toContain(
    "target=GlobalDisposalCoordinator.current; lease=process-root; ownerID=global-disposal.request",
  )
  expect(row(globalDisposalLeader)).toContain("| retirement | directory-root | Task 2 |")
  expect(row(globalDisposalLeader)).toContain(
    "| planned=test/project/instance-dispose.test.ts:global retirement |",
  )
  for (const anchor of [
    "src/config/config.ts:Config.invalidate.task#legacy-settled-facade-task-8a291143d4",
    "src/config/config.ts:Config.invalidate.task#global-event-publisher-task-5d53733bdc",
  ]) {
    expect(row(anchor)).toContain(
      `target=GlobalDisposalCoordinator.current; lease=process-root; ownerID=global-disposal.request; parent=${globalDisposalLeader}`,
    )
    expect(row(anchor)).toContain("| retirement | nested | Task 2 |")
    expect(row(anchor)).toContain("| planned=test/project/instance-dispose.test.ts:global retirement |")
  }
})

test("config history processor and prompt jobs keep their exact receipts", async () => {
  const inventory = await Bun.file(
    path.resolve(packageRoot, "../../docs/compose/spec/instance-generation-producer-inventory.md"),
  ).text()
  const row = (anchor: string) => inventory.split("\n").find((line) => line.includes(`\`${anchor}\``)) ?? ""

  expect(row("src/config/config.ts:Config.loadInstanceState.dep#effect-fork-dep-7c7406f0b7")).toContain(
    "target=Config.state(ctx).generation",
  )
  expect(row("src/config/config.ts:Config.loadInstanceState.dep#effect-fork-dep-7c7406f0b7")).toContain(
    "settle=dependency receipt joins every fiber stored in deps[]",
  )
  expect(row("src/history/backfill.ts:History.Backfill.init#effect-fork-expressionstatement-a46b619cda")).toContain(
    "target=InstanceBootstrap.capturedGeneration",
  )
  expect(row("src/history/backfill.ts:History.Backfill.init#effect-fork-expressionstatement-a46b619cda")).toContain(
    "settle=backfill receipt observes backfillAll terminal success, failure, or interrupt",
  )
  expect(row("src/session/processor.ts:SessionProcessor.create.handleEvent#effect-fork-expressionstatement-b159b6757b")).toContain(
    "target=SessionProcessor.capturedGeneration",
  )
  expect(row("src/session/processor.ts:SessionProcessor.create.handleEvent#effect-fork-expressionstatement-b159b6757b")).toContain(
    "settle=processor summary receipt joins the per-handleEvent summary fiber",
  )
  expect(row("src/session/prompt.ts:SessionPrompt.shellImpl.exit#naked-void-fork-4ab185c336")).toContain(
    "target=SessionRunState.currentGeneration; lease=runner; ownerID=session.shell-output; parent=planned:src/session/prompt.ts:SessionRunState.shell-owner",
  )
  expect(row("src/session/prompt.ts:SessionPrompt.shellImpl.exit#naked-void-fork-4ab185c336")).toContain(
    "| producer | nested | Task 5 |",
  )
  expect(row("src/session/prompt.ts:cancel#effect-fork-return-510c4f1c57")).toContain(
    "target=EffectBridge.capturedTarget; lease=current",
  )
  expect(row("src/session/prompt.ts:cancel#effect-fork-return-510c4f1c57")).toContain("ownerID=session.prompt-cancel")
  const dream = row("src/session/prompt.ts:SessionPrompt.run#detached-promise-catch-9edfca8886")
  const distill = row("src/session/prompt.ts:SessionPrompt.run#detached-promise-catch-0b682b0736")
  expect(dream).toContain("handoff=planned:src/session/prompt.ts:SessionPrompt.run.auto-memory-handoff")
  expect(distill).toContain("handoff=planned:src/session/prompt.ts:SessionPrompt.run.auto-memory-handoff")
  expect(dream).toContain("ownerID=session.prompt-auto-dream")
  expect(distill).toContain("ownerID=session.prompt-auto-distill")
})

test("Bus callback subscription rows share one exact generation channel owner", async () => {
  const inventory = await Bun.file(
    path.resolve(packageRoot, "../../docs/compose/spec/instance-generation-producer-inventory.md"),
  ).text()
  const row = (anchor: string) => inventory.split("\n").find((line) => line.includes(`\`${anchor}\``)) ?? ""
  const source = await Bun.file(path.resolve(packageRoot, "src/bus/index.ts")).text()
  expect(source).toMatch(/subscribeCallback[\s\S]*return yield\* on\(ps, def\.type, callback\)/)
  const leader = "src/bus/index.ts:on.subscription#native-callback-subscription-9adb6135c1"
  expect(row(leader)).toContain(
    "target=Instance.current; lease=current; handoff=planned:src/bus/index.ts:on.subscription-channel-handoff; handoffTarget=Instance.current; ownerID=bus.subscription-channel",
  )
  expect(row(leader)).toContain("| channel | transferred | Task 5 |")
  for (const anchor of [
    "src/bus/index.ts:on#effect-fork-expressionstatement-249ad7320b",
    "src/bus/index.ts:on#effect-fork-fork-1898f6edbf",
  ]) {
    expect(row(anchor)).toContain(`ownerID=bus.subscription-channel; parent=${leader}`)
    expect(row(anchor)).toContain("| channel | nested | Task 5 |")
  }
  expect(row("src/bus/index.ts:subscribe#native-callback-return-c66f66fa00")).toContain(
    `ownerID=bus.subscription-channel; parent=${leader}`,
  )
  expect(row("src/bus/index.ts:subscribe#native-callback-return-c66f66fa00")).toContain(
    "| lease | nested | Task 5 |",
  )
})

test("different logical producers in one enclosing function get distinct anchors", async () => {
  const input = await fixture({
    source: {
      "server/mixed.ts": [
        'import { Effect } from "effect"',
        "export function start() {",
        "  const producer = Effect.forkDetach(work)",
        "  const heartbeat = setInterval(tick, 1000)",
        "  return { producer, heartbeat }",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const summaries = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  expect(summaries).toHaveLength(2)
  expect(summaries[0]!.anchor).toStartWith("src/server/mixed.ts:start.producer#effect-fork-producer-")
  expect(summaries[1]!.anchor).toStartWith("src/server/mixed.ts:start.heartbeat#timer-interval-heartbeat-")
  expect(summaries[0]!.fingerprint).not.toBe(summaries[1]!.fingerprint)
})

test("semantic callback changes fail closed with a new anchor and fingerprint", async () => {
  const input = await fixture({
    source: { "stable.ts": 'import { Effect } from "effect"\nexport function start() { return Effect.forkDetach(() => first()) }\n' },
  })
  await using _ = input.tmp
  const before = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)[0]!
  await Bun.write(
    path.join(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT, "stable.ts"),
    'import { Effect } from "effect"\nexport function start() { return Effect.forkDetach(() => second()) }\n',
  )
  const after = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)[0]!
  expect(after.anchor).not.toBe(before.anchor)
  expect(after.fingerprint).not.toBe(before.fingerprint)
})

test("anchor and fingerprint ignore comments, optional semicolons, and whitespace", async () => {
  const input = await fixture({
    source: {
      "stable-trivia.ts":
        'import { Effect } from "effect"\nexport function start() { getHandoff().runSync(() => Effect.forkDetach(work)) }\n',
    },
  })
  await using _ = input.tmp
  const before = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)[0]!
  await Bun.write(
    path.join(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT, "stable-trivia.ts"),
    'import { Effect } from "effect";\nexport function start( ) { /* ownership unchanged */ getHandoff( ).runSync( () => Effect.forkDetach( work ) ); }\n',
  )
  const after = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)[0]!
  expect(after.anchor).toBe(before.anchor)
  expect(after.fingerprint).toBe(before.fingerprint)
})

test("destructured binding formatting does not leak into anchor identity", async () => {
  const input = await fixture({
    source: {
      "binding.ts":
        'import { Effect } from "effect"\nexport function start() { const { use: useLocal, provider: LocalProvider } = Effect.forkDetach(work) }\n',
    },
  })
  await using _ = input.tmp
  const before = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)[0]!
  await Bun.write(
    path.join(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT, "binding.ts"),
    'import { Effect } from "effect"\nexport function start() { const {use:useLocal,provider:LocalProvider}=Effect.forkDetach(work) }\n',
  )
  const after = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)[0]!
  expect(after.anchor).toBe(before.anchor)
  expect(after.fingerprint).toBe(before.fingerprint)
})

test("the same call inside and outside a lifecycle boundary has different anchors", async () => {
  const input = await fixture({
    source: {
      "boundary.ts": [
        'import { Effect } from "effect"',
        "export function start() {",
        "  Effect.runFork(direct)",
        "  handoff.runSync(() => Effect.runFork(nested))",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const summaries = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  expect(summaries).toHaveLength(2)
  expect(new Set(summaries.map((item) => item.anchor)).size).toBe(2)
  expect(summaries.some((item) => item.candidates[0]!.boundary.includes("handoff.runSync"))).toBe(true)
  expect(summaries.some((item) => item.candidates[0]!.boundary.startsWith("direct@"))).toBe(true)
})

test("block-bodied lifecycle callbacks retain their outer boundary", async () => {
  const input = await fixture({
    source: {
      "block-boundary.ts": [
        'import { Effect } from "effect"',
        "export function start() {",
        "  handoff.runSync(() => { Effect.runFork(work) })",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const summary = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)[0]!
  expect(summary.candidates[0]!.boundary).toContain("handoff.runSync")
})

test("identical statements in different branches have distinct context anchors", async () => {
  const input = await fixture({
    source: {
      "branch.ts": [
        'import { Effect } from "effect"',
        "export function start(condition: boolean) {",
        "  if (condition) Effect.runFork(work)",
        "  else Effect.runFork(work)",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const summaries = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  expect(summaries).toHaveLength(2)
  expect(new Set(summaries.map((item) => item.anchor)).size).toBe(2)
})

test("an async iterator anchor ignores unrelated route edits", async () => {
  const input = await fixture({
    source: {
      "server/routes/instance/event.ts":
        "export async function consume(stream: AsyncIterable<unknown>) { for await (const event of stream) send(event) }\n",
    },
  })
  await using _ = input.tmp
  const before = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).find((item) =>
    item.candidates.some((candidate) => candidate.kind === "async-iterator"),
  )!
  await Bun.write(
    path.join(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT, "server/routes/instance/event.ts"),
    [
      "export const unrelated = () => 'changed'",
      "export async function consume(stream: AsyncIterable<unknown>) { for await (const event of stream) send(event) }",
    ].join("\n"),
  )
  const after = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).find((item) =>
    item.candidates.some((candidate) => candidate.kind === "async-iterator"),
  )!
  expect(after.anchor).toBe(before.anchor)
  expect(after.fingerprint).toBe(before.fingerprint)
})

test("inserting an indistinguishable site grows one multiset row without renumbering its anchor", async () => {
  const input = await fixture({
    source: { "multiset.ts": 'import { Effect } from "effect"\nexport function start() { Effect.runFork(first) }\n' },
  })
  await using _ = input.tmp
  const before = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)[0]!
  await Bun.write(
    path.join(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT, "multiset.ts"),
    'import { Effect } from "effect"\nexport function start() { Effect.runFork(first); Effect.runFork(first) }\n',
  )
  const after = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)[0]!
  expect(after.anchor).toBe(before.anchor)
  expect(after.signals).toBe("effect-run-fork=2")
  expect(after.fingerprint).not.toBe(before.fingerprint)
})

test("different calls in one owning statement do not collapse into one multiset row", async () => {
  const input = await fixture({
    source: {
      "structural-sites.ts":
        'import { Effect } from "effect"\nexport function start() { return combine(Effect.runFork(first), Effect.runFork(second)) }\n',
    },
  })
  await using _ = input.tmp
  const distinct = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  expect(distinct).toHaveLength(2)
  expect(new Set(distinct.map((summary) => summary.anchor)).size).toBe(2)

  await Bun.write(
    path.join(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT, "structural-sites.ts"),
    'import { Effect } from "effect"\nexport function start() { return combine(Effect.runFork(first), Effect.runFork(first)) }\n',
  )
  const identical = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT)
  expect(identical).toHaveLength(1)
  expect(identical[0]!.signals).toBe("effect-run-fork=2")
})

test("disposer target mode scans production only", async () => {
  const input = await fixture({
    tests: {
      "tool/read-state.test.ts": [
        'const text = "disposeInstance(\\\"not a call\\\")"',
        'await disposeInstance("/tmp/a")',
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const result = await run(["--check-disposer-targets"], input.env)
  expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" })
})

test("Task 1 adapter flag does not allow a new production disposeInstance call", async () => {
  const input = await fixture({
    source: { "project/instance.ts": 'export async function unexpected() { await disposeInstance("/tmp/a") }\n' },
  })
  await using _ = input.tmp
  const result = await run(["--check-disposer-targets", "--allow-task1-adapter"], input.env)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("unauthorized disposeInstance target")
  expect(result.stderr).toContain("src/project/instance.ts:unexpected")
})

test("disposer target mode catches composed string arguments", async () => {
  const input = await fixture({
    source: {
      "other.ts": [
        "export function resolved(root: string) { disposeInstance(path.resolve(root, 'child')) }",
        "export function templated(root: string) { disposeInstance(`${root}/child`) }",
        "export function concatenated(root: string) { disposeInstance(root + '/child') }",
        "export function conditional(root: string, pick: boolean) { disposeInstance(pick ? root : '/tmp') }",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const result = await run(["--check-disposer-targets", "--allow-task1-adapter"], input.env)
  expect(result.exitCode).toBe(1)
  for (const symbol of ["resolved", "templated", "concatenated", "conditional"]) {
    expect(result.stderr).toContain(`src/other.ts:${symbol}`)
  }
})

test("disposer string inference respects lexical shadowing", async () => {
  const input = await fixture({
    source: {
      "project/instance.ts": [
        "export function outer(input: string) {",
        "  function disposeCached(input: InstanceTarget) { disposeInstance(input, snapshot) }",
        "  return disposeCached",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const result = await run(["--check-disposer-targets"], input.env)
  expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" })
})

test("legacy facade flag rejects a new declaration or production caller", async () => {
  const input = await fixture({
    source: {
      "project/instance.ts": "export async function unexpected() { await Instance.disposeAll() }\n",
    },
  })
  await using _ = input.tmp
  const result = await run(["--check", "--allow-legacy-instance-settled-facades"], input.env)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("unauthorized legacy settled facade caller")
  expect(result.stderr).toContain("src/project/instance.ts:unexpected")
})

test("Task 2 provider flag rejects a new raw InstanceRef provider", async () => {
  const input = await fixture({
    source: {
      "actor/spawn.ts": [
        'import { Effect } from "effect"',
        "export function unexpected(effect: Effect.Effect<void>) {",
        "  return effect.pipe(Effect.provideService(InstanceRef, context))",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const result = await run(["--check", "--allow-task2-legacy-instance-ref-providers"], input.env)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("unauthorized raw InstanceRef provider")
  expect(result.stderr).toContain("src/actor/spawn.ts:unexpected")
})

test("temporary flags reject equal-count replacements inside frozen symbols", async () => {
  const disposer = await fixture({
    source: {
      "project/instance.ts": (await Bun.file(path.join(packageRoot, "src/project/instance.ts")).text()).replace(
        "disposeInstance(directory)",
        'disposeInstance("/tmp/forged")',
      ),
    },
  })
  await using _disposer = disposer.tmp
  const disposerResult = await run(["--check-disposer-targets", "--allow-task1-adapter"], disposer.env)
  expect(disposerResult.stderr).toContain("unauthorized disposeInstance target")

  const provider = await fixture({
    source: {
      "actor/spawn.ts": (await Bun.file(path.join(packageRoot, "src/actor/spawn.ts")).text()).replace(
        "Effect.provideService(InstanceRef, parentInstance)",
        "Effect.provideService(InstanceRef, forged)",
      ),
    },
  })
  await using _provider = provider.tmp
  const providerResult = await run(["--check", "--allow-task2-legacy-instance-ref-providers"], provider.env)
  expect(providerResult.stderr).toContain("unauthorized raw InstanceRef provider")

  const facade = await fixture({
    source: {
      "config/config.ts": (await Bun.file(path.join(packageRoot, "src/config/config.ts")).text()).replace(
        "Instance.disposeAll()",
        "Instance.disposeAll(undefined)",
      ),
    },
  })
  await using _facade = facade.tmp
  const facadeResult = await run(["--check", "--allow-legacy-instance-settled-facades"], facade.env)
  expect(facadeResult.stderr).toContain("unauthorized legacy settled facade caller")
})

test("authority checker rejects raw lifecycle capability escape forms", async () => {
  const cases = [
    ["exported admission ref", "export const InstanceAdmissionRef = Context.Reference(\"x\")", "InstanceAdmissionRef must remain module-private"],
    ["provided admission ref", "Effect.provideService(InstanceAdmissionRef, stack)", "InstanceAdmissionRef cannot be provided outside its module"],
    ["fabricated execution", "const forged = value as InstanceExecution", "InstanceExecution cannot be cast or reconstructed"],
    ["exposed token", "export interface GenerationLease { readonly token: LifecycleOwnerToken }", "public lifecycle capability field"],
    ["raw transfer", "transferLifecycleOwner({ kind: \"producer\", handoffFrom })", "raw lifecycle helper is not allowlisted"],
    [
      "aliased raw capture",
      'import { captureInstanceExecution as capture } from "./effect/instance-ref"; capture()',
      "raw lifecycle helper is not allowlisted",
    ],
    [
      "reexported raw capture",
      'export { captureInstanceExecution } from "./effect/instance-ref"',
      "raw lifecycle helper cannot be re-exported",
    ],
    [
      "reexported admission ref",
      'export { InstanceAdmissionRef } from "./effect/instance-ref"',
      "InstanceAdmissionRef must remain module-private",
    ],
    [
      "star reexported lifecycle module",
      'export * from "./effect/instance-ref"',
      "lifecycle authority module cannot be star re-exported",
    ],
    ["indexed token access", "lease['token']", "raw lifecycle capability access is forbidden"],
    [
      "returned fabricated execution",
      "function forge(): InstanceExecution { return { target, token, stack } }",
      "InstanceExecution cannot be cast or reconstructed",
    ],
    ["missing release result", "lease.release()", "release requires a discriminated result"],
    ["ambiguous release result", "lease.release({ ok: true, error })", "release result must be exactly one discriminated shape"],
    ["async runSync", "lease.runSync(async () => await work())", "runSync cannot accept async or PromiseLike callbacks"],
    ["thenable runSync", "lease.runSync(() => Promise.resolve())", "runSync cannot accept async or PromiseLike callbacks"],
    [
      "captured promise runSync",
      "const pending = Promise.resolve(); lease.runSync(() => pending)",
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    ["async enter binding", "const enter = async () => await ready", "enter must be non-async and contain no readiness await"],
    ["ambient transfer", "registerTransferredGenerationProducer({ context, label, run })", "transferred producer requires explicit handoffFrom"],
    [
      "forged transfer handoff",
      "forged.runSync(() => registerTransferredGenerationProducer({ handoffFrom: forged, label, run }))",
      "transferred producer requires an acquired generation handoff lease",
    ],
    [
      "mismatched runSync handoff",
      "const handoff = acquireGenerationLease(); other.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })); handoff.release({ ok: true })",
      "transferred producer registration must use the exact handoffFrom.runSync",
    ],
    [
      "explicit transfer target",
      "const handoff = acquireGenerationLease(); handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, target, label, run })); handoff.release({ ok: true })",
      "transferred producer target must derive from handoffFrom",
    ],
    [
      "await in transfer setup",
      "async function setup() { const handoff = acquireGenerationLease(); const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })); await gate; handoff.release({ ok: true }); return child }",
      "transferred producer setup must not await before release",
    ],
    [
      "early transfer return",
      "function setup() { const handoff = acquireGenerationLease(); const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })); return child; handoff.release({ ok: true }) }",
      "transferred producer setup must not return before release",
    ],
    [
      "throw in transfer setup",
      "function setup() { const handoff = acquireGenerationLease(); handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })); throw error; handoff.release({ ok: false, error }) }",
      "transferred producer setup must not throw before release",
    ],
    [
      "published transfer handoff",
      "let published; function setup() { const handoff = acquireGenerationLease(); published = handoff; handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })); handoff.release({ ok: true }) }",
      "generation handoff lease must not escape before release",
    ],
    [
      "missing failure release",
      "function setup() { const handoff = acquireGenerationLease(); handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })); handoff.release({ ok: true }) }",
      "transferred producer setup requires one success and one failure release path",
    ],
    [
      "nonexclusive release paths",
      "function setup() { const handoff = acquireGenerationLease(); handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })); handoff.release({ ok: true }); handoff.release({ ok: false, error }) }",
      "transferred producer success and failure release paths must be structurally exclusive",
    ],
    [
      "deferred registration",
      "function setup() { const handoff = acquireGenerationLease(); queueMicrotask(() => handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))); try { handoff.release({ ok: true }) } catch (error) { handoff.release({ ok: false, error }) } }",
      "transferred producer registration must stay in the acquisition function",
    ],
    [
      "zero registrations",
      "function setup() { const handoff = acquireGenerationLease(); try { handoff.runSync(() => setupOnly()); handoff.release({ ok: true }) } catch (error) { handoff.release({ ok: false, error }) } }",
      "generation handoff lease must register at least one transferred owner",
    ],
    [
      "split registration regions",
      "function setup() { const handoff = acquireGenerationLease(); try { handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })); handoff.runSync(() => registerTransferredGenerationChannel({ handoffFrom: handoff, label, closeTransport })); handoff.release({ ok: true }) } catch (error) { handoff.release({ ok: false, error }) } }",
      "generation handoff transfers must share one exact runSync setup",
    ],
    [
      "late registration",
      "function setup() { const handoff = acquireGenerationLease(); try { handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })); handoff.release({ ok: true }); handoff.runSync(() => registerTransferredGenerationChannel({ handoffFrom: handoff, label, closeTransport })) } catch (error) { handoff.release({ ok: false, error }) } }",
      "transferred producer release must follow registration",
    ],
    ["public receipt", "export interface GenerationHandle { settled: Promise<void> }", "public lifecycle readiness or settlement thenable"],
    ["public readiness method", "export interface GenerationChannel { awaitReady(): PromiseLike<void> }", "public lifecycle readiness or settlement thenable"],
    [
      "transferred public receipt",
      "export interface TransferredLifecycleOwnerHandle { settled: Promise<void> }",
      "public lifecycle readiness or settlement thenable",
    ],
  ] as const

  const input = await fixture({
    source: Object.fromEntries(cases.map(([name, source]) => [`illegal-${name.replaceAll(" ", "-")}.ts`, source])),
  })
  await using _ = input.tmp
  const result = await run(["--check"], input.env)
  expect(result.exitCode).toBe(1)
  for (const [, , message] of cases) {
    expect(result.stderr).toContain(message)
  }
}, 15_000)

test("canonical target-local transfer setup passes the authority gate", async () => {
  const input = await fixture({
    source: {
      "valid-transfer.ts": [
        "export function setup() {",
        "  const handoff = acquireChildGenerationLease(context)",
        "  try {",
        "    const child = handoff.runSync(() => {",
        "      const producer = registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })",
        "      const channel = registerTransferredGenerationChannel({ handoffFrom: handoff, label, closeTransport })",
        "      return { producer, channel }",
        "    })",
        "    handoff.release({ ok: true })",
        "    return child",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const result = await run(["--check"], input.env)
  expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" })
})

test("capture provenance binds capture and restore to the same private WeakMap", async () => {
  const invalid = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const captured = new WeakMap()",
        "const restored = new WeakMap()",
        "export function captureInstanceExecution() { captured.set(handle, execution); return handle }",
        "export function restoreInstanceExecutionSync() { return restored.get(handle) }",
      ].join("\n"),
    },
  })
  await using _invalid = invalid.tmp
  const invalidResult = await run(["--check"], invalid.env)
  expect(invalidResult.exitCode).toBe(1)
  expect(invalidResult.stderr).toContain("InstanceExecution capture requires module-private WeakMap provenance")

  const valid = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const provenance = new WeakMap()",
        "export function captureInstanceExecution() { provenance.set(handle, execution); return handle }",
        "export function restoreInstanceExecutionSync() { return provenance.get(handle) }",
      ].join("\n"),
    },
  })
  await using _valid = valid.tmp
  expect(await run(["--check"], valid.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })
})

test("allowlisted wrappers may consume capture internally but cannot export the captured value", async () => {
  const valid = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "export function bootstrap() {",
        "  const execution = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(execution)",
        "}",
      ].join("\n"),
    },
  })
  await using _valid = valid.tmp
  expect(await run(["--check"], valid.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })

  const escaped = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": "export function bootstrap() { return captureInstanceExecution() }\n",
    },
  })
  await using _escaped = escaped.tmp
  const result = await run(["--check"], escaped.env)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("captured InstanceExecution cannot be re-exported")
})

test("private lifecycle capability fields remain implementation details", async () => {
  const input = await fixture({
    source: {
      "private-handle.ts": [
        "export class GenerationHandle {",
        "  private token: LifecycleOwnerToken",
        "  protected execution: InstanceExecution",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  expect(await run(["--check"], input.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })
})
