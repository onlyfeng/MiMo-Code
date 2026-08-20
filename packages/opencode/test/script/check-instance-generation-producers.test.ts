import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import {
  check,
  createParsedSourceReaderForTest,
  inspectCandidateSummaries,
  inspectDefaultAnalysisBuildCountsForTest,
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

function run(args: string[], env: Record<string, string> = {}) {
  const errors = check(args, { ...process.env, ...env })
  return {
    exitCode: errors.length > 0 ? 1 : 0,
    stdout: "",
    stderr: errors.map((error) => `instance generation producer check failed: ${error}`).join("\n"),
  }
}

test("default production analysis is built once per process", () => {
  expect(inspectDefaultAnalysisBuildCountsForTest()).toEqual({ production: 0, inventory: 0 })
  expect(check(["--check-disposer-targets", "--allow-task1-adapter"])).toEqual([])
  expect(check(["--check-disposer-targets", "--allow-task1-adapter"])).toEqual([])
  expect(inspectCandidateSummaries().length).toBeGreaterThan(0)
  expect(inspectDefaultAnalysisBuildCountsForTest()).toEqual({ production: 1, inventory: 0 })
})

test("candidate summary snapshots cannot mutate the cached analysis", () => {
  const snapshot = inspectCandidateSummaries()
  const expected = {
    length: snapshot.length,
    anchor: snapshot[0]!.anchor,
    signature: snapshot[0]!.candidates[0]!.signature,
  }
  snapshot[0]!.anchor = "polluted-summary"
  snapshot[0]!.candidates[0]!.signature = "polluted-candidate"
  snapshot.length = 0

  const next = inspectCandidateSummaries()
  expect(next).toHaveLength(expected.length)
  expect(next[0]!.anchor).toBe(expected.anchor)
  expect(next[0]!.candidates[0]!.signature).toBe(expected.signature)
})

test("default inventory analysis is built once without caching inventory errors", async () => {
  const args = [
    "--check",
    "--allow-legacy-instance-settled-facades",
    "--allow-task2-legacy-instance-ref-providers",
  ]
  const before = inspectDefaultAnalysisBuildCountsForTest()
  expect(check(args)).toEqual([])
  const built = inspectDefaultAnalysisBuildCountsForTest()
  expect(built).toEqual({
    production: before.production + (before.production === 0 ? 1 : 0),
    inventory: before.inventory + (before.inventory === 0 ? 1 : 0),
  })
  const tmp = await tmpdir()
  await using _ = tmp
  const original = await Bun.file(
    path.resolve(packageRoot, "../../docs/compose/spec/instance-generation-producer-inventory.md"),
  ).text()
  const invalidRemote = path.join(tmp.path, "invalid-remote.md")
  const invalidBody = path.join(tmp.path, "invalid-body.md")
  await Promise.all([
    Bun.write(
      invalidRemote,
      original.replace("{workspaceID,sourceSlot,serverIncarnation}", "{workspaceID,generation}"),
    ),
    Bun.write(
      invalidBody,
      original.replace(
        "replacement=registerGenerationBody | body | transferred",
        "replacement=forgedBody | body | transferred",
      ),
    ),
  ])
  const remoteErrors = check(args, { ...process.env, MIMOCODE_INSTANCE_GENERATION_INVENTORY: invalidRemote })
  expect(remoteErrors).toContain("planned RemoteRelayOwner contract is missing or changed")
  expect(remoteErrors.join("\n")).not.toContain("transferred owner replacement wrapper does not match")
  const bodyErrors = check(args, { ...process.env, MIMOCODE_INSTANCE_GENERATION_INVENTORY: invalidBody })
  expect(bodyErrors.join("\n")).toContain("transferred owner replacement wrapper does not match")
  expect(bodyErrors.join("\n")).not.toContain("planned RemoteRelayOwner contract is missing or changed")
  expect(check(args)).toEqual([])
  expect(inspectDefaultAnalysisBuildCountsForTest()).toEqual(built)
}, 45_000)

test("the planned Task 0 inventory mode accepts the frozen starting universe", async () => {
  const result = await run([
    "--check",
    "--allow-legacy-instance-settled-facades",
    "--allow-task2-legacy-instance-ref-providers",
  ])
  expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" })
})

test("the CLI forwards both modes without shifting argv", async () => {
  const result = await runCLI(["--check", "--check-disposer-targets"])
  expect(result).toEqual({
    exitCode: 1,
    stdout: "",
    stderr: "instance generation producer check failed: exactly one checker mode is required\n",
  })
})

test("unknown flags fail closed", async () => {
  const result = await runCLI(["--check", "--future-flag"])
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

const localPromiseDeclarations = [
  "interface PromiseLike<T> { then(resolve: (value: T) => void): void }",
  "declare function fetch(value: unknown): PromiseLike<unknown>",
  "declare const url: unknown",
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

test("custom roots are reanalyzed after every source change", async () => {
  const input = await fixture({ source: { "project/instance.ts": "export const stable = true\n" } })
  await using _ = input.tmp
  const file = path.join(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT, "project/instance.ts")
  const args = ["--check-disposer-targets"]
  const before = inspectDefaultAnalysisBuildCountsForTest()

  expect(await run(args, input.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })
  await Bun.write(file, 'export function invalidA() { disposeInstance("/tmp/a") }\n')
  expect((await run(args, input.env)).stderr).toContain("legacy disposeInstance target requires --allow-task1-adapter")
  await Bun.write(
    file,
    "declare const options: { path: string }\nexport function invalidB() { disposeInstance(options.path) }\n",
  )
  expect((await run(args, input.env)).stderr).toContain("legacy disposeInstance target requires --allow-task1-adapter")
  await Bun.write(file, "export const stable = true\n")
  expect(await run(args, input.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })
  expect(inspectDefaultAnalysisBuildCountsForTest()).toEqual(before)
})

test("cross-role default roots are reanalyzed after source changes", async () => {
  const input = await fixture({
    source: { "probe.ts": 'export const version = "source-v1"\n' },
    tests: { "probe.ts": 'export const version = "test-v1"\n' },
  })
  await using _ = input.tmp
  const read = createParsedSourceReaderForTest({
    src: input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT,
    test: input.env.MIMOCODE_INSTANCE_GENERATION_TEST_ROOT,
  })

  expect(read(input.env.MIMOCODE_INSTANCE_GENERATION_TEST_ROOT, "src").join("\n")).toContain("test-v1")
  await Bun.write(
    path.join(input.env.MIMOCODE_INSTANCE_GENERATION_TEST_ROOT, "probe.ts"),
    'export const version = "test-v2"\n',
  )
  expect(read(input.env.MIMOCODE_INSTANCE_GENERATION_TEST_ROOT, "src").join("\n")).toContain("test-v2")

  expect(read(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT, "test").join("\n")).toContain("source-v1")
  await Bun.write(
    path.join(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT, "probe.ts"),
    'export const version = "source-v2"\n',
  )
  expect(read(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT, "test").join("\n")).toContain("source-v2")
})

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
      `| \`${summary.anchor}\` | ${summary.signals} | ${summary.fingerprint} | instance:background producer | cancel=GenerationOwnedHandle.close | settle=GenerationOwnedHandle receipt | target=Instance.current; lease=current; handoff=planned:src/file/watcher.ts:FileWatcher.state.channel-handoff; handoffTarget=Instance.current; replacement=registerTransferredGenerationProducer | producer | transferred | Task 5 | planned=test/project/instance-producer-retirement.test.ts:producer retirement |`,
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

test("qualified and aliased global timers cannot bypass discovery", async () => {
  const input = await fixture({
    source: {
      "server/timer-direct.ts": "setTimeout(work, 0)\nexport {}",
      "server/timer-qualified.ts": "globalThis.setTimeout(work, 0)\nexport {}",
      "server/timer-alias.ts": "const repeat = setInterval\nrepeat(work, 1000)\nexport {}",
      "server/timer-qualified-alias.ts": "const delay = globalThis.setTimeout\ndelay(work, 0)\nexport {}",
      "server/timer-indexed.ts": "globalThis['setImmediate'](work)\nexport {}",
      "server/timer-destructured.ts": "const { setTimeout: delay } = globalThis\ndelay(work, 0)\nexport {}",
      "server/timer-assigned.ts": [
        "declare const pick: boolean",
        "let delay = ordinary",
        "if (pick) delay = globalThis.setTimeout",
        "delay(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-overwritten-positive.ts": [
        "let delay = ordinary",
        "delay = globalThis.setTimeout",
        "delay(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-comma-positive.ts": "(ordinary, globalThis.setTimeout)(work, 0)\nexport {}",
      "server/timer-and-positive.ts": "(ordinary && globalThis.setTimeout)(work, 0)\nexport {}",
      "server/timer-destructured-assignment.ts": [
        "let delay = ordinary",
        ";({ setTimeout: delay } = globalThis)",
        "delay(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-destructured-conditional.ts": [
        "declare const pick: boolean",
        "let delay = ordinary",
        "if (pick) ({ setTimeout: delay } = globalThis)",
        "delay(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-destructured-shorthand.ts": [
        "let setTimeout = ordinary",
        ";({ setTimeout } = globalThis)",
        "setTimeout(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-destructured-computed.ts": [
        "let delay = ordinary",
        ';({ ["setTimeout"]: delay } = globalThis)',
        "delay(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-root-assigned.ts": [
        "const local = { setTimeout() {} }",
        "let clock = local",
        "clock = globalThis",
        "clock.setTimeout(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-root-conditional.ts": [
        "declare const pick: boolean",
        "const local = { setTimeout() {} }",
        "const clock = pick ? globalThis : local",
        "clock.setTimeout(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-redeclared.ts": [
        "var delay: typeof globalThis.setTimeout = globalThis.setTimeout",
        "var delay: typeof globalThis.setTimeout",
        "delay(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-root-redeclared.ts": [
        "var clock: typeof globalThis = globalThis",
        "var clock: typeof globalThis",
        "clock.setTimeout(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-bound.ts": "const delay = globalThis.setTimeout.bind(globalThis)\ndelay(work, 0)\nexport {}",
      "server/timer-call.ts": "globalThis.setTimeout.call(globalThis, work, 0)\nexport {}",
      "server/timer-conditional.ts": "const delay = pick ? globalThis.setTimeout : ordinary\ndelay(work, 0)\nexport {}",
      "server/timer-import.ts": 'import { setTimeout as delay } from "node:timers"\ndelay(work, 0)',
      "server/timer-namespace.ts": 'import * as timers from "node:timers"\ntimers.setInterval(work, 1000)',
      "server/local-function.ts": "function setTimeout() {}\nsetTimeout()\nexport {}",
      "server/local-parameter.ts": [
        "export function ordinary(setTimeout: (callback: unknown, delay: number) => void) {",
        "  setTimeout(work, 0)",
        "}",
      ].join("\n"),
      "server/local-object.ts": "const clock = { setTimeout() {} }\nclock.setTimeout()\nexport {}",
      "server/shadowed-global.ts": "const globalThis = { setTimeout() {} }\nglobalThis.setTimeout()\nexport {}",
      "server/ordinary-destructured.ts": [
        "const clock = { setTimeout() {} }",
        "const { setTimeout: delay } = clock",
        "delay()",
        "export {}",
      ].join("\n"),
      "server/ordinary.ts": "export function setTimeout() {}",
      "server/ordinary-import.ts": 'import { setTimeout } from "./ordinary"\nsetTimeout()',
      "server/promise-timer.ts": 'import { setTimeout as sleep } from "node:timers/promises"\nsleep(0)',
      "server/timer-overwritten-negative.ts": [
        "let delay = globalThis.setTimeout",
        "delay = ordinary",
        "delay(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-comma-negative.ts": "(globalThis.setTimeout, ordinary)(work, 0)\nexport {}",
      "server/timer-and-negative.ts": "(globalThis.setTimeout && ordinary)(work, 0)\nexport {}",
      "server/timer-future-declaration.ts": "delay(work, 0)\nvar delay = globalThis.setTimeout\nexport {}",
      "server/timer-destructured-overwrite.ts": [
        "const clock = { setTimeout() {} }",
        "let delay = globalThis.setTimeout",
        ";({ setTimeout: delay } = clock)",
        "delay(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-destructured-shorthand-clean.ts": [
        "const clock = { setTimeout() {} }",
        "let setTimeout = globalThis.setTimeout",
        ";({ setTimeout } = clock)",
        "setTimeout(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-destructured-computed-clean.ts": [
        "const clock = { setTimeout() {} }",
        "let delay = globalThis.setTimeout",
        ';({ ["setTimeout"]: delay } = clock)',
        "delay(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-root-overwrite.ts": [
        "const local = { setTimeout() {} }",
        "let clock = globalThis",
        "clock = local",
        "clock.setTimeout(work, 0)",
        "export {}",
      ].join("\n"),
      "server/timer-root-future.ts": "clock.setTimeout(work, 0)\nvar clock = globalThis\nexport {}",
    },
  })
  await using _ = input.tmp
  const candidates = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).flatMap(
    (summary) => summary.candidates,
  )
  for (const [file, kind] of [
    ["src/server/timer-direct.ts", "timer-timeout"],
    ["src/server/timer-qualified.ts", "timer-timeout"],
    ["src/server/timer-alias.ts", "timer-interval"],
    ["src/server/timer-qualified-alias.ts", "timer-timeout"],
    ["src/server/timer-indexed.ts", "timer-immediate"],
    ["src/server/timer-destructured.ts", "timer-timeout"],
    ["src/server/timer-assigned.ts", "timer-timeout"],
    ["src/server/timer-overwritten-positive.ts", "timer-timeout"],
    ["src/server/timer-comma-positive.ts", "timer-timeout"],
    ["src/server/timer-and-positive.ts", "timer-timeout"],
    ["src/server/timer-destructured-assignment.ts", "timer-timeout"],
    ["src/server/timer-destructured-conditional.ts", "timer-timeout"],
    ["src/server/timer-destructured-shorthand.ts", "timer-timeout"],
    ["src/server/timer-destructured-computed.ts", "timer-timeout"],
    ["src/server/timer-root-assigned.ts", "timer-timeout"],
    ["src/server/timer-root-conditional.ts", "timer-timeout"],
    ["src/server/timer-redeclared.ts", "timer-timeout"],
    ["src/server/timer-root-redeclared.ts", "timer-timeout"],
    ["src/server/timer-bound.ts", "timer-timeout"],
    ["src/server/timer-call.ts", "timer-timeout"],
    ["src/server/timer-conditional.ts", "timer-timeout"],
    ["src/server/timer-import.ts", "timer-timeout"],
    ["src/server/timer-namespace.ts", "timer-interval"],
  ] as const) {
    expect(candidates.filter((candidate) => candidate.file === file && candidate.kind === kind), file).toHaveLength(1)
  }
  for (const file of [
    "src/server/local-function.ts",
    "src/server/local-parameter.ts",
    "src/server/local-object.ts",
    "src/server/shadowed-global.ts",
    "src/server/ordinary-destructured.ts",
    "src/server/ordinary-import.ts",
    "src/server/promise-timer.ts",
    "src/server/timer-overwritten-negative.ts",
    "src/server/timer-comma-negative.ts",
    "src/server/timer-and-negative.ts",
    "src/server/timer-future-declaration.ts",
    "src/server/timer-destructured-overwrite.ts",
    "src/server/timer-destructured-shorthand-clean.ts",
    "src/server/timer-destructured-computed-clean.ts",
    "src/server/timer-root-overwrite.ts",
    "src/server/timer-root-future.ts",
  ]) {
    expect(candidates.some((candidate) => candidate.file === file), file).toBe(false)
  }
})

test("qualified and aliased global microtasks cannot bypass discovery", async () => {
  const input = await fixture({
    source: {
      "server/microtask-direct.ts": "queueMicrotask(work)\nexport {}",
      "server/microtask-qualified.ts": "globalThis.queueMicrotask(work)\nexport {}",
      "server/microtask-indexed.ts": "globalThis['queueMicrotask'](work)\nexport {}",
      "server/microtask-alias.ts": "const schedule = queueMicrotask\nschedule(work)\nexport {}",
      "server/microtask-qualified-alias.ts": "const schedule = globalThis.queueMicrotask\nschedule(work)\nexport {}",
      "server/microtask-destructured.ts": "const { queueMicrotask: schedule } = globalThis\nschedule(work)\nexport {}",
      "server/microtask-local-function.ts": "function queueMicrotask() {}\nqueueMicrotask()\nexport {}",
      "server/microtask-local-variable.ts": "const queueMicrotask = ordinary\nqueueMicrotask(work)\nexport {}",
      "server/microtask-local-parameter.ts": [
        "export function ordinary(queueMicrotask: (callback: unknown) => void) {",
        "  queueMicrotask(work)",
        "}",
      ].join("\n"),
      "server/microtask-local-object.ts": "const scheduler = { queueMicrotask() {} }\nscheduler.queueMicrotask(work)\nexport {}",
      "server/microtask-shadowed-global.ts": "const globalThis = { queueMicrotask() {} }\nglobalThis.queueMicrotask(work)\nexport {}",
      "server/microtask-ordinary.ts": "export function queueMicrotask() {}",
      "server/microtask-ordinary-import.ts": 'import { queueMicrotask } from "./microtask-ordinary"\nqueueMicrotask(work)',
      "server/microtask-ordinary-import-alias.ts": 'import { queueMicrotask as schedule } from "./microtask-ordinary"\nschedule(work)',
      "server/microtask-timers-namespace.ts": 'import * as timers from "node:timers"\ntimers.queueMicrotask(work)',
    },
  })
  await using _ = input.tmp
  const candidates = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).flatMap(
    (summary) => summary.candidates,
  )
  for (const file of [
    "src/server/microtask-direct.ts",
    "src/server/microtask-qualified.ts",
    "src/server/microtask-indexed.ts",
    "src/server/microtask-alias.ts",
    "src/server/microtask-qualified-alias.ts",
    "src/server/microtask-destructured.ts",
  ]) {
    expect(candidates.filter((candidate) => candidate.file === file && candidate.kind === "microtask"), file).toHaveLength(1)
  }
  for (const file of [
    "src/server/microtask-local-function.ts",
    "src/server/microtask-local-variable.ts",
    "src/server/microtask-local-parameter.ts",
    "src/server/microtask-local-object.ts",
    "src/server/microtask-shadowed-global.ts",
    "src/server/microtask-ordinary-import.ts",
    "src/server/microtask-ordinary-import-alias.ts",
    "src/server/microtask-timers-namespace.ts",
  ]) {
    expect(candidates.some((candidate) => candidate.file === file), file).toBe(false)
  }
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
  expect(row("src/bus/index.ts:subscribe#native-callback-return-0fd4a0a017")).toContain(
    `ownerID=bus.subscription-channel; parent=${leader}`,
  )
  expect(row("src/bus/index.ts:subscribe#native-callback-return-0fd4a0a017")).toContain(
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

test("lifecycle boundaries stop at deferred closures but retain synchronous consumers", async () => {
  const input = await fixture({
    source: {
      "server/lifecycle-boundary.ts": [
        "export const directArrow = handoff.runSync(() => Effect.runFork(directArrowWork))",
        "export const directFunction = handoff.runSync(function () { Effect.runFork(directFunctionWork) })",
        "export const directMethod = handoff.runSync(({ callback() { Effect.runFork(directMethodWork) } }).callback)",
        "export const directPropertyArrow = handoff.runSync(({ callback: () => Effect.runFork(directPropertyArrowWork) }).callback)",
        "export const directPropertyFunction = handoff.runSync(({ callback: function () { Effect.runFork(directPropertyFunctionWork) } }).callback)",
        "export const callWrapped = handoff.runSync.call(handoff, () => Effect.runFork(callWrappedWork))",
        "export const applyWrapped = handoff.runSync.apply(handoff, [() => Effect.runFork(applyWrappedWork)])",
        "const boundRunSync = handoff.runSync.bind(handoff)",
        "export const boundRun = boundRunSync(() => Effect.runFork(boundRunWork))",
        "const boundCallback = handoff.runSync.bind(handoff, () => Effect.runFork(boundCallbackWork))",
        "export const invokedBoundCallback = boundCallback()",
        "let assignedRun = ordinary",
        "assignedRun = handoff.runSync",
        "export const assignedRunResult = assignedRun(() => Effect.runFork(assignedRunWork))",
        "let overwrittenRun = handoff.runSync",
        "overwrittenRun = ordinary",
        "export const overwrittenRunResult = overwrittenRun(() => Effect.runFork(overwrittenRunWork))",
        "const { runSync: destructuredRun } = handoff",
        "export const destructuredRunResult = destructuredRun(() => Effect.runFork(destructuredRunWork))",
        "export const returnedArrow = handoff.runSync(() => () => Effect.runFork(returnedArrowWork))",
        "export const returnedFunction = handoff.runSync(function () { return function () { Effect.runFork(returnedFunctionWork) } })",
        "export const returnedMethod = handoff.runSync(() => ({ callback() { Effect.runFork(returnedMethodWork) } }))",
        "export const storedClosure = handoff.runSync(() => { const later = () => Effect.runFork(storedClosureWork); sink(later) })",
        "export const arrowIife = handoff.runSync(() => { (() => Effect.runFork(arrowIifeWork))() })",
        "export const functionIife = handoff.runSync(() => { (function () { Effect.runFork(functionIifeWork) })() })",
        "export const methodIife = handoff.runSync(() => ({ callback() { Effect.runFork(methodIifeWork) } }).callback())",
        "export const generatorIife = handoff.runSync(() => { (function* () { Effect.runFork(generatorIifeWork) })() })",
        "export const nested = outer.runSync(() => inner.runSync(() => Effect.runFork(nestedWork)))",
        "export const returnedBranch = handoff.runSync(() => () => { if (pick) Effect.runFork(returnedBranchWork) })",
        "export const commaRight = handoff.runSync((() => Effect.runFork(commaLeftWork), ordinary))",
        "export const andRight = handoff.runSync((() => Effect.runFork(andLeftWork)) && ordinary)",
        "export const selectedNestedMethod = handoff.runSync(({ callback() { Effect.runFork(unselectedMethodWork) }, nested: { callback: ordinary } }).nested.callback)",
        "export const promiseExecutor = Instance.bind(() => new Promise((resolve) => { Effect.runFork(promiseExecutorWork); resolve(undefined) }))",
        "export function shadowedPromise(Promise: new (executor: unknown) => unknown) { return Instance.bind(() => new Promise(() => Effect.runFork(shadowPromiseWork))) }",
        "export const ordinaryBind = ordinary.bind(() => Effect.runFork(ordinaryBindWork))",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const candidates = inspectCandidateSummaries(input.env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT).flatMap(
    (summary) => summary.candidates,
  )
  const boundary = (label: string) =>
    candidates.find((candidate) => candidate.kind === "effect-run-fork" && candidate.signature.includes(label))!.boundary
  for (const label of ["directArrowWork", "directFunctionWork", "directMethodWork", "directPropertyArrowWork", "directPropertyFunctionWork", "callWrappedWork", "applyWrappedWork", "boundRunWork", "boundCallbackWork", "assignedRunWork", "destructuredRunWork", "arrowIifeWork", "functionIifeWork", "methodIifeWork"]) {
    expect(boundary(label), label).toContain("handoff.runSync")
  }
  for (const label of ["returnedArrowWork", "returnedFunctionWork", "returnedMethodWork", "storedClosureWork", "generatorIifeWork", "returnedBranchWork"]) {
    expect(boundary(label), label).not.toContain("handoff.runSync")
  }
  expect(boundary("nestedWork")).toContain("outer.runSync>inner.runSync")
  expect(boundary("returnedBranchWork")).toStartWith("if:")
  for (const label of ["commaLeftWork", "andLeftWork", "unselectedMethodWork", "shadowPromiseWork", "ordinaryBindWork", "overwrittenRunWork"]) {
    expect(boundary(label), label).not.toContain("runSync")
    expect(boundary(label), label).not.toContain("Instance.bind")
  }
  expect(boundary("promiseExecutorWork")).toContain("Instance.bind")
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
      "type-only reexported admission ref",
      'export type { InstanceAdmissionRef } from "./effect/instance-ref"',
      "InstanceAdmissionRef must remain module-private",
    ],
    [
      "inline type-only reexported admission ref",
      'export { type InstanceAdmissionRef } from "./effect/instance-ref"',
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

  const invalidConst = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const captured = new WeakMap()",
        "const restored = new WeakMap()",
        "export const captureInstanceExecution = () => { captured.set(handle, execution); return handle }",
        "export const restoreInstanceExecutionSync = () => restored.get(handle)",
      ].join("\n"),
    },
  })
  await using _invalidConst = invalidConst.tmp
  expect((await run(["--check"], invalidConst.env)).stderr).toContain(
    "InstanceExecution capture requires module-private WeakMap provenance",
  )

  const validConst = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const provenance = new WeakMap()",
        "export const captureInstanceExecution = () => { provenance.set(handle, execution); return handle }",
        "export const restoreInstanceExecutionSync = () => provenance.get(handle)",
      ].join("\n"),
    },
  })
  await using _validConst = validConst.tmp
  expect(await run(["--check"], validConst.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })

  const mixed = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const captured = new WeakMap()",
        "const restored = new WeakMap()",
        "export const captureInstanceExecution = () => { captured.set(handle, execution); return handle }",
        "export function restoreInstanceExecutionSync() { return restored.get(handle) }",
      ].join("\n"),
    },
  })
  await using _mixed = mixed.tmp
  expect((await run(["--check"], mixed.env)).stderr).toContain(
    "InstanceExecution capture requires module-private WeakMap provenance",
  )

  const exportAlias = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const captured = new WeakMap()",
        "const restored = new WeakMap()",
        "const capture = () => { captured.set(handle, execution); return handle }",
        "export { capture as captureInstanceExecution }",
        "export const restoreInstanceExecutionSync = () => restored.get(handle)",
      ].join("\n"),
    },
  })
  await using _exportAlias = exportAlias.tmp
  expect((await run(["--check"], exportAlias.env)).stderr).toContain(
    "InstanceExecution capture requires module-private WeakMap provenance",
  )

  const restoreAlias = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const provenance = new WeakMap()",
        "export const captureInstanceExecution = () => { provenance.set(handle, execution); return handle }",
        "const restore = () => provenance.get(handle)",
        "export { restore as restoreInstanceExecutionSync }",
      ].join("\n"),
    },
  })
  await using _restoreAlias = restoreAlias.tmp
  expect(await run(["--check"], restoreAlias.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })

  const nestedDecoy = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const captured = new WeakMap()",
        "const restored = new WeakMap()",
        "export const captureInstanceExecution = () => { captured.set(handle, execution); return handle }",
        "export const restoreInstanceExecutionSync = () => restored.get(handle)",
        "function decoy() {",
        "  function restoreInstanceExecutionSync() { return captured.get(handle) }",
        "  return restoreInstanceExecutionSync",
        "}",
      ].join("\n"),
    },
  })
  await using _nestedDecoy = nestedDecoy.tmp
  expect((await run(["--check"], nestedDecoy.env)).stderr).toContain(
    "InstanceExecution capture requires module-private WeakMap provenance",
  )

  const privateRestore = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const provenance = new WeakMap()",
        "export const captureInstanceExecution = () => { provenance.set(handle, execution); return handle }",
        "const restoreInstanceExecutionSync = () => provenance.get(handle)",
      ].join("\n"),
    },
  })
  await using _privateRestore = privateRestore.tmp
  expect((await run(["--check"], privateRestore.env)).stderr).toContain(
    "InstanceExecution capture requires module-private WeakMap provenance",
  )

  const nonCallableCapture = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const provenance = new WeakMap()",
        "export const captureInstanceExecution = handle",
        "export const captureInstanceExecutionEffect = () => { provenance.set(handle, execution); return handle }",
        "export const restoreInstanceExecutionSync = () => provenance.get(handle)",
      ].join("\n"),
    },
  })
  await using _nonCallableCapture = nonCallableCapture.tmp
  expect((await run(["--check"], nonCallableCapture.env)).stderr).toContain(
    "InstanceExecution capture requires module-private WeakMap provenance",
  )

  const splitCapture = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const first = new WeakMap()",
        "const second = new WeakMap()",
        "export const captureInstanceExecution = () => { first.set(handle, execution); return handle }",
        "export const captureInstanceExecutionEffect = () => { second.set(handle, execution); return handle }",
        "export const restoreInstanceExecutionSync = () => first.get(handle)",
      ].join("\n"),
    },
  })
  await using _splitCapture = splitCapture.tmp
  expect((await run(["--check"], splitCapture.env)).stderr).toContain(
    "InstanceExecution capture requires module-private WeakMap provenance",
  )

  const nonCallableRestore = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const provenance = new WeakMap()",
        "export const captureInstanceExecution = () => { provenance.set(handle, execution); return handle }",
        "export const restoreInstanceExecutionSync = handle",
        "export const enterInstanceExecutionEffect = () => provenance.get(handle)",
      ].join("\n"),
    },
  })
  await using _nonCallableRestore = nonCallableRestore.tmp
  expect((await run(["--check"], nonCallableRestore.env)).stderr).toContain(
    "InstanceExecution capture requires module-private WeakMap provenance",
  )

  const allCanonical = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const provenance = new WeakMap()",
        "export const captureInstanceExecution = () => { provenance.set(handle, execution); return handle }",
        "export const captureInstanceExecutionEffect = () => { provenance.set(effectHandle, execution); return effectHandle }",
        "export const restoreInstanceExecutionSync = () => provenance.get(handle)",
        "export const enterInstanceExecutionEffect = () => provenance.get(effectHandle)",
      ].join("\n"),
    },
  })
  await using _allCanonical = allCanonical.tmp
  expect(await run(["--check"], allCanonical.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })

  const localOnly = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "const provenance = new WeakMap()",
        "const captureInstanceExecution = () => { provenance.set(handle, execution); return handle }",
        "export const restoreInstanceExecutionSync = () => provenance.get(handle)",
      ].join("\n"),
    },
  })
  await using _localOnly = localOnly.tmp
  expect(await run(["--check"], localOnly.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })
})

test("allowlisted wrappers may consume capture internally but cannot export the captured value", async () => {
  const valid = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "export function bootstrap() {",
        "  const execution = captureInstanceExecution()",
        "  function internalOnly() { return execution }",
        "  return makeOpaqueBootstrapHandle(execution)",
        "}",
      ].join("\n"),
    },
  })
  await using _valid = valid.tmp
  expect(await run(["--check"], valid.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })

  const validArrow = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "export const bootstrap = () => {",
        "  const execution = captureInstanceExecution()",
        "  return () => { return makeOpaqueBootstrapHandle(execution) }",
        "}",
      ].join("\n"),
    },
  })
  await using _validArrow = validArrow.tmp
  expect(await run(["--check"], validArrow.env)).toEqual({ exitCode: 0, stdout: "", stderr: "" })

  const escaped = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": "export function bootstrap() { return captureInstanceExecution() }\n",
    },
  })
  await using _escaped = escaped.tmp
  const result = await run(["--check"], escaped.env)
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain("captured InstanceExecution cannot be re-exported")

  for (const [name, body] of [
    ["direct", "captureInstanceExecution()"],
    ["nested", "() => captureInstanceExecution()"],
  ] as const) {
    const expressionBody = await fixture({
      source: {
        "effect/bootstrap-runtime.ts": `export const bootstrap = () => ${body}\n`,
      },
    })
    await using _ = expressionBody.tmp
    expect((await run(["--check"], expressionBody.env)).stderr, name).toContain(
      "captured InstanceExecution cannot be re-exported",
    )
  }

  const nested = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "export const bootstrap = (expose: boolean) => {",
        "  const execution = captureInstanceExecution()",
        "  if (expose) return execution",
        "  return makeOpaqueBootstrapHandle(execution)",
        "}",
      ].join("\n"),
    },
  })
  await using _nested = nested.tmp
  expect((await run(["--check"], nested.env)).stderr).toContain("captured InstanceExecution cannot be re-exported")

  const containerCases = [
    ["object", "return { execution }"],
    ["array", "const container = [execution]; return container"],
  ] as const
  await Promise.all(
    containerCases.map(async ([name, escapedReturn]) => {
      const input = await fixture({
        source: {
          "effect/bootstrap-runtime.ts": [
            "export function bootstrap() {",
            "  const execution = captureInstanceExecution()",
            `  ${escapedReturn}`,
            "}",
          ].join("\n"),
        },
      })
      await using _ = input.tmp
      expect((await run(["--check"], input.env)).stderr, name).toContain(
        "captured InstanceExecution cannot be re-exported",
      )
    }),
  )
})

test("allowlisted wrappers cannot publish captured execution through external state", async () => {
  const input = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "export const published: { execution?: unknown } = {}",
        "export function bootstrap() {",
        "  published.execution = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(published.execution)",
        "}",
      ].join("\n"),
      "effect/run-service.ts": [
        "export function attachWith(target: { execution?: unknown }) {",
        "  target.execution = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(target.execution)",
        "}",
      ].join("\n"),
      "project/instance.ts": [
        "declare const globalThis: { published: { execution?: unknown } }",
        "export function bind() {",
        "  globalThis.published.execution = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(globalThis.published.execution)",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const stderr = (await run(["--check"], input.env)).stderr
  for (const file of [
    "src/effect/bootstrap-runtime.ts",
    "src/effect/run-service.ts",
    "src/project/instance.ts",
  ]) {
    expect(stderr).toContain(`captured InstanceExecution cannot be published through external state: ${file}`)
  }

  const escapedCases = [
    [
      "module alias",
      [
        "const published: unknown[] = []",
        "export function bootstrap() {",
        "  const alias = published",
        "  alias.push(captureInstanceExecution())",
        "  return makeOpaqueBootstrapHandle(alias)",
        "}",
      ].join("\n"),
    ],
    [
      "logical assignment",
      [
        "const published: { execution?: unknown } = {}",
        "export function bootstrap() {",
        "  published.execution ||= captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(published.execution)",
        "}",
      ].join("\n"),
    ],
    [
      "Object.assign",
      [
        "const published: { execution?: unknown } = {}",
        "export function bootstrap() {",
        "  Object.assign(published, { execution: captureInstanceExecution() })",
        "  return makeOpaqueBootstrapHandle(published.execution)",
        "}",
      ].join("\n"),
    ],
    [
      "local helper invocation",
      [
        "const published: { execution?: unknown } = {}",
        "function publish() { published.execution = captureInstanceExecution() }",
        "export function bootstrap() {",
        "  publish()",
        "  return makeOpaqueBootstrapHandle(published.execution)",
        "}",
      ].join("\n"),
    ],
    [
      "exported object shorthand",
      [
        "const published: { execution?: unknown } = {}",
        "const bootstrap = () => { published.execution = captureInstanceExecution() }",
        "export const api = { bootstrap }",
      ].join("\n"),
    ],
    [
      "object destructuring assignment",
      [
        "let published: unknown",
        "export function bootstrap() {",
        "  ;({ execution: published } = { execution: captureInstanceExecution() })",
        "  return makeOpaqueBootstrapHandle(published)",
        "}",
      ].join("\n"),
    ],
    [
      "array destructuring parameter",
      [
        "export function bootstrap(target: unknown[]) {",
        "  ;[target[0]] = [captureInstanceExecution()]",
        "  return makeOpaqueBootstrapHandle(target[0])",
        "}",
      ].join("\n"),
    ],
    [
      "concise mutation",
      [
        "const published: unknown[] = []",
        "export const bootstrap = () => published.push(captureInstanceExecution())",
      ].join("\n"),
    ],
    [
      "concise Object.assign",
      [
        "const published: { execution?: unknown } = {}",
        "export const bootstrap = () => Object.assign(published, { execution: captureInstanceExecution() })",
      ].join("\n"),
    ],
    [
      "exported callable array",
      [
        "const published: { execution?: unknown } = {}",
        "const bootstrap = () => { published.execution = captureInstanceExecution() }",
        "export const api = [bootstrap]",
      ].join("\n"),
    ],
    [
      "default IIFE object",
      [
        "const published: { execution?: unknown } = {}",
        "export default (() => ({",
        "  bootstrap() { published.execution = captureInstanceExecution() },",
        "}))()",
      ].join("\n"),
    ],
    [
      "exported class method",
      [
        "const published: { execution?: unknown } = {}",
        "export class API {",
        "  bootstrap() { published.execution = captureInstanceExecution() }",
        "}",
      ].join("\n"),
    ],
    [
      "IIFE module target",
      [
        "const published: unknown[] = []",
        "export const bootstrap = () =>",
        "  ((target: unknown[]) => target.push(captureInstanceExecution()))(published)",
      ].join("\n"),
    ],
    [
      "conditional IIFE module target",
      [
        "declare const pick: boolean",
        "const published: unknown[] = []",
        "export const bootstrap = () =>",
        "  ((target: unknown[]) => target.push(captureInstanceExecution()))(pick ? [] : published)",
      ].join("\n"),
    ],
    [
      "IIFE property target",
      [
        "const published: unknown[] = []",
        "export const api = ((options: { target: unknown[] }) => ({",
        "  bootstrap() {",
        "    options.target.push(captureInstanceExecution())",
        "    return makeOpaqueBootstrapHandle(options.target)",
        "  },",
        "}))({ target: published })",
      ].join("\n"),
    ],
    [
      "apply module tuple target",
      [
        "const args: [unknown[]] = [[]]",
        "export const bootstrap = () =>",
        "  ((target: unknown[]) => target.push(captureInstanceExecution())).apply(null, args)",
      ].join("\n"),
    ],
    [
      "spread module tuple target",
      [
        "const args: [unknown[]] = [[]]",
        "export const bootstrap = () =>",
        "  ((target: unknown[]) => target.push(captureInstanceExecution()))(...args)",
      ].join("\n"),
    ],
    [
      "call module this target",
      [
        "const published: unknown[] = []",
        "function bootstrap(this: unknown[]) {",
        "  this.push(captureInstanceExecution())",
        "  return makeOpaqueBootstrapHandle(this)",
        "}",
        "export const api = bootstrap.call(published)",
      ].join("\n"),
    ],
    [
      "object default module target",
      [
        "const published: unknown[] = []",
        "export const bootstrap = () =>",
        "  (({ target = published }: { target?: unknown[] }) =>",
        "    target.push(captureInstanceExecution()))({ target: undefined })",
      ].join("\n"),
    ],
    [
      "call target after this parameter",
      [
        "const published: unknown[] = []",
        "function bootstrap(this: unknown[], target: unknown[]) {",
        "  return target.push(captureInstanceExecution())",
        "}",
        "export const api = bootstrap.call([], published)",
      ].join("\n"),
    ],
    [
      "arrow lexical this target",
      [
        "export function bootstrap(this: unknown[]) {",
        "  return (() => this.push(captureInstanceExecution())).call([])",
        "}",
      ].join("\n"),
    ],
    [
      "arrow lexical this apply target",
      [
        "export function bootstrap(this: unknown[]) {",
        "  return (() => this.push(captureInstanceExecution())).apply([], [])",
        "}",
      ].join("\n"),
    ],
    [
      "arrow lexical this bound target",
      [
        "export function bootstrap(this: unknown[]) {",
        "  return (() => this.push(captureInstanceExecution())).bind([])()",
        "}",
      ].join("\n"),
    ],
    [
      "object rest module target",
      [
        "const published: unknown[] = []",
        "export const bootstrap = () =>",
        "  (({ ...rest }: { target: unknown[] }) =>",
        "    rest.target.push(captureInstanceExecution()))({ target: published })",
      ].join("\n"),
    ],
    [
      "rest element module target",
      [
        "const published: unknown[] = []",
        "export const bootstrap = () =>",
        "  ((...targets: unknown[][]) => targets[0]?.push(captureInstanceExecution()))(published)",
      ].join("\n"),
    ],
    [
      "module lvalue replacement",
      [
        "let published: unknown[] = []",
        "export function bootstrap() {",
        "  published = []",
        "  published.push(captureInstanceExecution())",
        "}",
      ].join("\n"),
    ],
    [
      "module assignment argument",
      [
        "let published: unknown[] = []",
        "export const bootstrap = () =>",
        "  ((target: unknown[]) => target.push(captureInstanceExecution()))(published = [])",
      ].join("\n"),
    ],
    [
      "module property assignment argument",
      [
        "const state: { target?: unknown[] } = {}",
        "export const bootstrap = () =>",
        "  ((target: unknown[]) => target.push(captureInstanceExecution()))(state.target = [])",
      ].join("\n"),
    ],
    [
      "rest binding module element",
      [
        "const published: unknown[] = []",
        "export const bootstrap = () =>",
        "  ((...[target]: [unknown[]]) => target.push(captureInstanceExecution()))(published)",
      ].join("\n"),
    ],
    [
      "property external overwrite",
      [
        "const published: unknown[] = []",
        "export const bootstrap = () => ((options: { target: unknown[] }) => {",
        "  options.target = published",
        "  options.target.push(captureInstanceExecution())",
        "})({ target: [] })",
      ].join("\n"),
    ],
    [
      "nested this property target",
      [
        "const published: { execution?: unknown } = {}",
        "function bootstrap(this: { target: { execution?: unknown } }) {",
        "  this.target.execution = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(this.target)",
        "}",
        "export const api = bootstrap.call({ target: published })",
      ].join("\n"),
    ],
    [
      "capture call invocation",
      [
        "const published: { execution?: unknown } = {}",
        "export function bootstrap() {",
        "  published.execution = captureInstanceExecution.call(undefined)",
        "}",
      ].join("\n"),
    ],
    [
      "capture apply invocation",
      [
        "const published: { execution?: unknown } = {}",
        "export function bootstrap() {",
        "  published.execution = captureInstanceExecution.apply(undefined, [])",
        "}",
      ].join("\n"),
    ],
    [
      "capture bind invocation",
      [
        "const published: { execution?: unknown } = {}",
        "export function bootstrap() {",
        "  published.execution = captureInstanceExecution.bind(undefined)()",
        "}",
      ].join("\n"),
    ],
    [
      "capture comma invocation",
      [
        "const published: { execution?: unknown } = {}",
        "export function bootstrap() {",
        "  published.execution = (ordinary, captureInstanceExecution)()",
        "}",
      ].join("\n"),
    ],
  ] as const
  const escaped = await fixture({
    source: Object.fromEntries(
      escapedCases.map(([, source], index) => [`effect/publication-escaped-${index}.ts`, source]),
    ),
  })
  await using _escaped = escaped.tmp
  const escapedStderr = (await run(["--check"], escaped.env)).stderr
  for (const [index, [name]] of escapedCases.entries()) {
    expect(escapedStderr, name).toContain(
      `captured InstanceExecution cannot be published through external state: src/effect/publication-escaped-${index}.ts`,
    )
  }

  const local = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "export const bootstrap = ((target: unknown[]) => ({",
        "  start() {",
        "    target.push(captureInstanceExecution())",
        "    return makeOpaqueBootstrapHandle(target)",
        "  },",
        "}))([])",
      ].join("\n"),
      "effect/run-service.ts": [
        "export function attachWith(target: { execution?: unknown }) {",
        "  target = {}",
        "  target.execution = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(target.execution)",
        "}",
      ].join("\n"),
      "project/instance.ts": [
        "export function bind() {",
        "  let internal: { execution?: unknown }",
        "  internal = {}",
        "  const alias = internal",
        "  alias.execution = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(alias.execution)",
        "}",
      ].join("\n"),
      "effect/bridge.ts": [
        "export function make() {",
        "  let internal: unknown",
        "  ;({ execution: internal } = { execution: captureInstanceExecutionEffect() })",
        "  return makeOpaqueBootstrapHandle(internal)",
        "}",
        "export const local = () =>",
        "  ((target: unknown[]) => target.push(captureInstanceExecutionEffect()))([])",
      ].join("\n"),
    },
  })
  await using _local = local.tmp
  expect((await run(["--check"], local.env)).stderr).not.toContain(
    "captured InstanceExecution cannot be published through external state",
  )

  const safeCases = [
    [
      "conditional local IIFE",
      [
        "declare const pick: boolean",
        "export const bootstrap = () =>",
        "  ((target: unknown[]) => target.push(captureInstanceExecution()))(pick ? [] : [])",
      ].join("\n"),
    ],
    [
      "local IIFE property",
      [
        "export const bootstrap = ((options: { target: unknown[] }) => ({",
        "  start() {",
        "    options.target.push(captureInstanceExecution())",
        "    return makeOpaqueBootstrapHandle(options.target)",
        "  },",
        "}))({ target: [] })",
      ].join("\n"),
    ],
    [
      "inline apply tuple",
      [
        "export const bootstrap = () =>",
        "  ((target: unknown[]) => target.push(captureInstanceExecution())).apply(null, [[]])",
      ].join("\n"),
    ],
    [
      "inline spread tuple",
      [
        "export const bootstrap = () =>",
        "  ((target: unknown[]) => target.push(captureInstanceExecution()))(...[[]] as [unknown[]])",
      ].join("\n"),
    ],
    [
      "local call this",
      [
        "function bootstrap(this: unknown[]) {",
        "  this.push(captureInstanceExecution())",
        "  return makeOpaqueBootstrapHandle(this)",
        "}",
        "export const api = bootstrap.call([])",
      ].join("\n"),
    ],
    [
      "local apply this",
      [
        "function bootstrap(this: unknown[]) {",
        "  this.push(captureInstanceExecution())",
        "  return makeOpaqueBootstrapHandle(this)",
        "}",
        "export const api = bootstrap.apply([], [])",
      ].join("\n"),
    ],
    [
      "local bound this",
      [
        "function bootstrap(this: unknown[]) {",
        "  this.push(captureInstanceExecution())",
        "  return makeOpaqueBootstrapHandle(this)",
        "}",
        "export const api = bootstrap.bind([])",
      ].join("\n"),
    ],
    [
      "object default local target",
      [
        "export const bootstrap = () =>",
        "  (({ target = [] }: { target?: unknown[] }) =>",
        "    target.push(captureInstanceExecution()))({ target: undefined })",
      ].join("\n"),
    ],
    [
      "local target after this parameter",
      [
        "function bootstrap(this: unknown[], target: unknown[]) {",
        "  return target.push(captureInstanceExecution())",
        "}",
        "export const api = bootstrap.call([], [])",
      ].join("\n"),
    ],
    [
      "fresh rest container",
      [
        "const published: unknown[] = []",
        "export const bootstrap = () =>",
        "  ((...targets: unknown[]) => targets.push(captureInstanceExecution()))(published)",
      ].join("\n"),
    ],
    [
      "fresh rest element",
      [
        "export const bootstrap = () =>",
        "  ((...targets: unknown[][]) => targets[0]?.push(captureInstanceExecution()))([])",
      ].join("\n"),
    ],
    [
      "object rest local target",
      [
        "export const bootstrap = () =>",
        "  (({ ...rest }: { target: unknown[] }) =>",
        "    rest.target.push(captureInstanceExecution()))({ target: [] })",
      ].join("\n"),
    ],
    [
      "exported rest container",
      [
        "export function bootstrap(...targets: unknown[]) {",
        "  return targets.push(captureInstanceExecution())",
        "}",
      ].join("\n"),
    ],
    [
      "local binding assignment",
      [
        "const published: unknown = {}",
        "export function bootstrap() {",
        "  let local = published",
        "  local = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(local)",
        "}",
      ].join("\n"),
    ],
    [
      "parameter assignment",
      [
        "export function bootstrap(target: unknown) {",
        "  target = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(target)",
        "}",
      ].join("\n"),
    ],
    [
      "fresh object property assignment",
      [
        "const published: unknown = {}",
        "export const bootstrap = () => ((options: { target: unknown }) => {",
        "  options.target = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(options.target)",
        "})({ target: published })",
      ].join("\n"),
    ],
    [
      "fresh rest slots",
      [
        "const published: unknown = {}",
        "export const bootstrap = () => ((...targets: unknown[]) => {",
        "  targets[0] = captureInstanceExecution()",
        "  ;(targets as unknown as { extra?: unknown }).extra = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(targets)",
        "})(published)",
      ].join("\n"),
    ],
    [
      "fresh object rest property assignment",
      [
        "const published: unknown = {}",
        "export const bootstrap = () => (({ ...rest }: { target: unknown }) => {",
        "  rest.target = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(rest)",
        "})({ target: published })",
      ].join("\n"),
    ],
    [
      "local property overwrite",
      [
        "const published: unknown[] = []",
        "export const bootstrap = () => ((options: { target: unknown[] }) => {",
        "  options.target = []",
        "  options.target.push(captureInstanceExecution())",
        "})({ target: published })",
      ].join("\n"),
    ],
    [
      "nested this local target",
      [
        "function bootstrap(this: { target: { execution?: unknown } }) {",
        "  this.target.execution = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(this.target)",
        "}",
        "export const api = bootstrap.call({ target: {} })",
      ].join("\n"),
    ],
  ] as const
  const safe = await fixture({
    source: Object.fromEntries(
      safeCases.map(([, source], index) => [`effect/publication-safe-${index}.ts`, source]),
    ),
  })
  await using _safe = safe.tmp
  const safeStderr = (await run(["--check"], safe.env)).stderr
  for (const [index, [name]] of safeCases.entries()) {
    expect(safeStderr, name).not.toContain(
      `captured InstanceExecution cannot be published through external state: src/effect/publication-safe-${index}.ts`,
    )
  }
}, 15_000)

test("block-bodied closures cannot export captured execution", async () => {
  const input = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "export function bootstrap() {",
        "  const execution = captureInstanceExecution()",
        "  return () => { return execution }",
        "}",
      ].join("\n"),
      "effect/run-service.ts": [
        "export function attachWith() {",
        "  const execution = captureInstanceExecution()",
        "  const alias = execution",
        "  return function (condition: boolean) { if (condition) return alias; return undefined }",
        "}",
      ].join("\n"),
      "project/instance.ts": [
        "export function bind() {",
        "  const execution = captureInstanceExecution()",
        "  return { leak() { return execution } }",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const stderr = (await run(["--check"], input.env)).stderr
  for (const file of ["src/effect/bootstrap-runtime.ts", "src/effect/run-service.ts", "src/project/instance.ts"]) {
    expect(stderr).toContain(`captured InstanceExecution cannot be re-exported: ${file}`)
  }

  const localFunction = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "export function BootstrapRuntime() {",
        "  const execution = captureInstanceExecution()",
        "  function expose() { return execution }",
        "  return expose",
        "}",
      ].join("\n"),
    },
  })
  await using _localFunction = localFunction.tmp
  expect((await run(["--check"], localFunction.env)).stderr).toContain(
    "captured InstanceExecution cannot be re-exported: src/effect/bootstrap-runtime.ts",
  )
})

test("named and default exports cannot relay captured execution", async () => {
  const input = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "function bootstrap() {",
        "  const execution = captureInstanceExecution()",
        "  return () => { return execution }",
        "}",
        "export { bootstrap }",
      ].join("\n"),
      "effect/run-service.ts": [
        "const attachWith = () => {",
        "  const execution = captureInstanceExecution()",
        "  return () => { return execution }",
        "}",
        "export { attachWith }",
      ].join("\n"),
      "project/instance.ts": [
        "function bind() {",
        "  const execution = captureInstanceExecution()",
        "  return () => { return execution }",
        "}",
        "export default bind",
      ].join("\n"),
      "effect/bridge.ts": [
        "export default (() => {",
        "  const execution = captureInstanceExecutionEffect()",
        "  return () => { return execution }",
        "})",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const stderr = (await run(["--check"], input.env)).stderr
  for (const file of [
    "src/effect/bootstrap-runtime.ts",
    "src/effect/run-service.ts",
    "src/project/instance.ts",
    "src/effect/bridge.ts",
  ]) {
    expect(stderr).toContain(`captured InstanceExecution cannot be re-exported: ${file}`)
  }

  const opaque = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "function bootstrap() {",
        "  const execution = captureInstanceExecution()",
        "  return () => { return makeOpaqueBootstrapHandle(execution) }",
        "}",
        "export { bootstrap }",
      ].join("\n"),
      "project/instance.ts": [
        "function bind() {",
        "  const execution = captureInstanceExecution()",
        "  return () => { return makeOpaqueBootstrapHandle(execution) }",
        "}",
        "export default bind",
      ].join("\n"),
    },
  })
  await using _opaque = opaque.tmp
  expect((await run(["--check"], opaque.env)).stderr).not.toContain(
    "captured InstanceExecution cannot be re-exported",
  )

  const typeOnly = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "function bootstrap() {",
        "  const execution = captureInstanceExecution()",
        "  return () => { return execution }",
        "}",
        "export type { bootstrap }",
      ].join("\n"),
      "effect/run-service.ts": [
        "function attachWith() {",
        "  const execution = captureInstanceExecution()",
        "  return () => { return execution }",
        "}",
        "export { type attachWith }",
      ].join("\n"),
    },
  })
  await using _typeOnly = typeOnly.tmp
  const typeOnlyStderr = (await run(["--check"], typeOnly.env)).stderr
  expect(typeOnlyStderr).not.toContain("captured InstanceExecution cannot be re-exported")
  expect(typeOnlyStderr).not.toContain("raw lifecycle helper cannot be re-exported")
})

test("captured execution cannot escape through value-selection expressions", async () => {
  const input = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "export async function bootstrap() {",
        "  const execution = captureInstanceExecution()",
        "  return await execution",
        "}",
      ].join("\n"),
      "effect/run-service.ts": [
        "const execution = captureInstanceExecution()",
        "const box = { execution }",
        "export const attachWith = box.execution",
      ].join("\n"),
      "project/instance.ts": [
        "const execution = captureInstanceExecution()",
        "const box = { execution }",
        'export const bind = box["execution"]',
      ].join("\n"),
      "effect/bridge.ts": [
        "const execution = captureInstanceExecutionEffect()",
        "export const make = (ordinary, execution)",
      ].join("\n"),
      "effect/iife.ts": "export const leak = (() => captureInstanceExecution())()",
      "effect/iife-block.ts": "export const leak = (function () { return captureInstanceExecution() })()",
      "effect/post-write.ts": [
        "const execution = captureInstanceExecution()",
        "const box: { execution?: unknown } = {}",
        "box.execution = execution",
        "export const leak = box.execution",
      ].join("\n"),
      "effect/post-write-indexed.ts": [
        "const execution = captureInstanceExecution()",
        "const box: { execution?: unknown } = {}",
        'box["execution"] = execution',
        'export default box["execution"]',
      ].join("\n"),
      "effect/getter.ts": [
        "const execution = captureInstanceExecution()",
        "const box = { get execution() { return execution } }",
        "export const leak = box.execution",
      ].join("\n"),
      "effect/iife-alias.ts": [
        "const bootstrap = () => captureInstanceExecution()",
        "const alias = bootstrap",
        "export const leak = alias()",
      ].join("\n"),
      "effect/iife-function-alias.ts": [
        "function bootstrap() { return captureInstanceExecution() }",
        "const alias = bootstrap",
        "export const leak = alias()",
      ].join("\n"),
      "effect/iife-property.ts": [
        "const fn = () => captureInstanceExecution()",
        "const box = { fn }",
        "export const leak = box.fn()",
      ].join("\n"),
      "effect/iife-method.ts": [
        "const box = { leak() { return captureInstanceExecution() } }",
        "export const leak = box.leak()",
      ].join("\n"),
      "effect/iife-call.ts": "export const leak = (() => captureInstanceExecution()).call(null)",
      "effect/iife-comma.ts": [
        "const leak = () => captureInstanceExecution()",
        "export const escaped = (ordinary, leak)()",
      ].join("\n"),
      "effect/iife-conditional.ts": [
        "declare const pick: boolean",
        "const leak = () => captureInstanceExecution()",
        "export const escaped = (pick ? leak : ordinary)()",
      ].join("\n"),
      "effect/iife-identity.ts":
        "export const escaped = ((value) => value)(captureInstanceExecution())",
      "effect/iife-default.ts":
        "export const escaped = ((value = captureInstanceExecution()) => value)(undefined)",
      "effect/iife-rest.ts":
        "export const escaped = ((...values) => values[0])(captureInstanceExecution())",
      "effect/iife-destructured-parameter.ts":
        "export const escaped = (({ value }) => value)({ value: captureInstanceExecution() })",
      "effect/iife-destructured-alias.ts": [
        "const payload = { value: captureInstanceExecution() }",
        "export const escaped = (({ value }) => value)(payload)",
      ].join("\n"),
      "effect/iife-destructured-getter.ts": [
        "const payload = { get value() { return captureInstanceExecution() } }",
        "export const escaped = (({ value }) => value)(payload)",
      ].join("\n"),
      "effect/iife-spread-alias.ts": [
        "const args = [captureInstanceExecution()]",
        "export const escaped = ((value) => value)(...args)",
      ].join("\n"),
      "effect/iife-nested-spread-alias.ts": [
        "const base = [captureInstanceExecution()]",
        "const args = [...base]",
        "export const escaped = ((value) => value)(...args)",
      ].join("\n"),
      "effect/iife-object-spread-alias.ts": [
        "const base = { value: captureInstanceExecution() }",
        "const payload = { ...base }",
        "export const escaped = (({ value }) => value)(payload)",
      ].join("\n"),
      "effect/iife-default-alias.ts": [
        "const absent = undefined",
        "export const escaped = ((value = captureInstanceExecution()) => value)(absent)",
      ].join("\n"),
      "effect/iife-apply-alias.ts": [
        "const identity = (value) => value",
        "const args = [captureInstanceExecution()]",
        "export const escaped = identity.apply(null, args)",
      ].join("\n"),
      "effect/iife-apply-parameter.ts":
        "export const escaped = ((args) => ((value) => value).apply(null, args))([captureInstanceExecution()])",
      "effect/iife-array-projection-spread.ts": [
        "const base = [captureInstanceExecution()]",
        "const values = [...base]",
        "export const escaped = ((array) => array[0])(values)",
      ].join("\n"),
      "effect/iife-hole-second.ts": [
        "const args = [, captureInstanceExecution()]",
        "export const escaped = ((first, second) => second)(...args)",
      ].join("\n"),
      "effect/iife-array-rest.ts":
        "export const escaped = (([first, ...rest]) => rest[0])([ordinary, captureInstanceExecution()])",
      "effect/iife-tuple-branch.ts": [
        "declare const pick: boolean",
        "const args = pick ? [ordinary] : [ordinary, captureInstanceExecution()]",
        "export const escaped = ((first, second) => second)(...args)",
      ].join("\n"),
      "effect/iife-apply-tuple-branch.ts": [
        "declare const pick: boolean",
        "const args = pick ? [ordinary] : [ordinary, captureInstanceExecution()]",
        "export const escaped = ((first, second) => second).apply(null, args)",
      ].join("\n"),
      "effect/iife-bound-parameter.ts": [
        "const identity = (value) => value",
        "export const escaped = identity.bind(null, captureInstanceExecution())()",
      ].join("\n"),
      "effect/iife-conditional-parameter-overwrite.ts": [
        "declare const pick: boolean",
        "export const escaped = ((value) => {",
        "  if (pick) value = ordinary",
        "  return value",
        "})(captureInstanceExecution())",
      ].join("\n"),
      "effect/post-write-alias.ts": [
        "export function bootstrap() {",
        "  const execution = captureInstanceExecution()",
        "  const box: { execution?: unknown } = {}",
        "  const alias = box",
        "  box.execution = execution",
        "  return alias.execution",
        "}",
      ].join("\n"),
      "effect/post-write-module.ts": [
        "const box = { execution: ordinary }",
        "export function bootstrap() {",
        "  const execution = captureInstanceExecution()",
        "  box.execution = execution",
        "  return box.execution",
        "}",
      ].join("\n"),
      "effect/post-write-module-alias.ts": [
        "const box = { execution: ordinary }",
        "export function bootstrap() {",
        "  const execution = captureInstanceExecution()",
        "  const alias = box",
        "  box.execution = execution",
        "  return alias.execution",
        "}",
      ].join("\n"),
      "effect/post-write-outer-closure.ts": [
        "export function bootstrap() {",
        "  const box = { execution: ordinary }",
        "  box.execution = captureInstanceExecution()",
        "  return () => box.execution",
        "}",
      ].join("\n"),
      "effect/post-write-nested.ts": [
        "const root = { box: { execution: ordinary } }",
        "root.box.execution = captureInstanceExecution()",
        "export const escaped = root.box.execution",
      ].join("\n"),
      "effect/post-write-nested-read-alias.ts": [
        "const root = { box: { execution: ordinary } }",
        "root.box.execution = captureInstanceExecution()",
        "const box = root.box",
        "export const escaped = box.execution",
      ].join("\n"),
      "effect/post-write-nested-write-alias.ts": [
        "const root = { box: { execution: ordinary } }",
        "const box = root.box",
        "box.execution = captureInstanceExecution()",
        "export const escaped = root.box.execution",
      ].join("\n"),
      "effect/post-write-nested-parent.ts": [
        "const root = { box: { execution: ordinary } }",
        "root.box = { execution: captureInstanceExecution() }",
        "export const escaped = root.box.execution",
      ].join("\n"),
      "effect/post-write-nested-parent-alias.ts": [
        "const replacement = { execution: captureInstanceExecution() }",
        "const root = { box: { execution: ordinary } }",
        "root.box = replacement",
        "export const escaped = root.box.execution",
      ].join("\n"),
      "effect/post-write-nested-parent-conditional.ts": [
        "declare const pick: boolean",
        "const root = { box: { execution: ordinary } }",
        "if (pick) root.box = { execution: captureInstanceExecution() }",
        "export const escaped = root.box.execution",
      ].join("\n"),
      "effect/post-write-nested-parent-conditional-alias.ts": [
        "declare const pick: boolean",
        "const root = { box: { execution: ordinary } }",
        "if (pick) root.box = { execution: captureInstanceExecution() }",
        "const box = root.box",
        "export const escaped = box.execution",
      ].join("\n"),
      "effect/post-write-assigned-alias.ts": [
        "const root = { box: { execution: ordinary } }",
        "root.box = { execution: captureInstanceExecution() }",
        "let alias",
        "alias = root.box",
        "root.box = { execution: ordinary }",
        "export const escaped = alias.execution",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const stderr = (await run(["--check"], input.env)).stderr
  for (const file of [
    "src/effect/bootstrap-runtime.ts",
    "src/effect/run-service.ts",
    "src/project/instance.ts",
    "src/effect/bridge.ts",
    "src/effect/iife.ts",
    "src/effect/iife-block.ts",
    "src/effect/post-write.ts",
    "src/effect/post-write-indexed.ts",
    "src/effect/getter.ts",
    "src/effect/iife-alias.ts",
    "src/effect/iife-function-alias.ts",
    "src/effect/iife-property.ts",
    "src/effect/iife-method.ts",
    "src/effect/iife-call.ts",
    "src/effect/iife-comma.ts",
    "src/effect/iife-conditional.ts",
    "src/effect/iife-identity.ts",
    "src/effect/iife-default.ts",
    "src/effect/iife-rest.ts",
    "src/effect/iife-destructured-parameter.ts",
    "src/effect/iife-destructured-alias.ts",
    "src/effect/iife-destructured-getter.ts",
    "src/effect/iife-spread-alias.ts",
    "src/effect/iife-nested-spread-alias.ts",
    "src/effect/iife-object-spread-alias.ts",
    "src/effect/iife-default-alias.ts",
    "src/effect/iife-apply-alias.ts",
    "src/effect/iife-apply-parameter.ts",
    "src/effect/iife-array-projection-spread.ts",
    "src/effect/iife-hole-second.ts",
    "src/effect/iife-array-rest.ts",
    "src/effect/iife-tuple-branch.ts",
    "src/effect/iife-apply-tuple-branch.ts",
    "src/effect/iife-bound-parameter.ts",
    "src/effect/iife-conditional-parameter-overwrite.ts",
    "src/effect/post-write-alias.ts",
    "src/effect/post-write-module.ts",
    "src/effect/post-write-module-alias.ts",
    "src/effect/post-write-outer-closure.ts",
    "src/effect/post-write-nested.ts",
    "src/effect/post-write-nested-read-alias.ts",
    "src/effect/post-write-nested-write-alias.ts",
    "src/effect/post-write-nested-parent.ts",
    "src/effect/post-write-nested-parent-alias.ts",
    "src/effect/post-write-nested-parent-conditional.ts",
    "src/effect/post-write-nested-parent-conditional-alias.ts",
    "src/effect/post-write-assigned-alias.ts",
  ]) {
    expect(stderr).toContain(`captured InstanceExecution cannot be re-exported: ${file}`)
  }

  const ordinary = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "const box = { execution: ordinary }",
        "export const bootstrap = box.execution",
        "export const indexed = box['execution']",
        "export const selected = (captureInstanceExecution, ordinary)",
        "export const iife = (() => makeOpaqueBootstrapHandle(captureInstanceExecution()))()",
        "const box2: { secret?: unknown; ordinary?: unknown } = {}",
        "box2.secret = captureInstanceExecution()",
        "box2.ordinary = ordinary",
        "export const sibling = box2.ordinary",
        "const box3 = { get execution() { return makeOpaqueBootstrapHandle(captureInstanceExecution()) } }",
        "export const getter = box3.execution",
        "function unsafeBeforeOverwrite() { return captureInstanceExecution() }",
        "unsafeBeforeOverwrite = ordinary",
        "export const overwritten = unsafeBeforeOverwrite()",
        "const safeBootstrap = () => makeOpaqueBootstrapHandle(captureInstanceExecution())",
        "const safeAlias = safeBootstrap",
        "export const safeAliasResult = safeAlias()",
        "const unsafeLeft = () => captureInstanceExecution()",
        "export const commaRight = (unsafeLeft, ordinary)()",
        "export const opaqueIdentity = ((value) => makeOpaqueBootstrapHandle(value))(captureInstanceExecution())",
        "export const overwrittenParameter = ((value) => { value = ordinary; return value })(captureInstanceExecution())",
        "export const opaqueDefault = ((value = captureInstanceExecution()) => makeOpaqueBootstrapHandle(value))(undefined)",
        "export const opaqueRest = ((...values) => makeOpaqueBootstrapHandle(values[0]))(captureInstanceExecution())",
        "export const opaqueDestructured = (({ value }) => makeOpaqueBootstrapHandle(value))({ value: captureInstanceExecution() })",
        "const opaquePayload = { value: makeOpaqueBootstrapHandle(captureInstanceExecution()) }",
        "export const opaqueDestructuredAlias = (({ value }) => value)(opaquePayload)",
        "const opaqueArgs = [makeOpaqueBootstrapHandle(captureInstanceExecution())]",
        "export const opaqueSpreadAlias = ((value) => value)(...opaqueArgs)",
        "export const opaqueApplyParameter = ((args) => ((value) => value).apply(null, args))([makeOpaqueBootstrapHandle(captureInstanceExecution())])",
        "const opaqueBase = [makeOpaqueBootstrapHandle(captureInstanceExecution())]",
        "const opaqueNestedArgs = [...opaqueBase]",
        "export const opaqueNestedSpreadAlias = ((value) => value)(...opaqueNestedArgs)",
        "export const opaqueArrayProjection = ((array) => array[0])(opaqueNestedArgs)",
        "export const ignoredSparseTail = ((first) => first)(...[, captureInstanceExecution()])",
        "const safeTupleArgs = pick ? [ordinary] : [captureInstanceExecution()]",
        "export const ignoredTupleTail = ((first, second) => second)(...safeTupleArgs)",
        "const opaqueBound = (value) => makeOpaqueBootstrapHandle(value)",
        "export const opaqueBoundResult = opaqueBound.bind(null, captureInstanceExecution())()",
        "const original: { execution?: unknown } = {}",
        "const other: { execution?: unknown } = {}",
        "original.execution = captureInstanceExecution()",
        "let receiver = original",
        "receiver = other",
        "export const reassignedReceiver = receiver.execution",
        "const shared = { execution: ordinary }",
        "function unrelatedWrite() { shared.execution = captureInstanceExecution() }",
        "export function unrelatedRead() { return shared.execution }",
        "export function overwrittenProperty() {",
        "  const holder = { execution: ordinary }",
        "  holder.execution = captureInstanceExecution()",
        "  holder.execution = makeOpaqueBootstrapHandle(captureInstanceExecution())",
        "  return holder.execution",
        "}",
        "const nestedSibling = { box: { execution: ordinary }, other: { execution: ordinary } }",
        "nestedSibling.other.execution = captureInstanceExecution()",
        "export const safeNestedSibling = nestedSibling.box.execution",
        "const nestedOverwrite = { box: { execution: ordinary } }",
        "nestedOverwrite.box.execution = captureInstanceExecution()",
        "nestedOverwrite.box.execution = makeOpaqueBootstrapHandle(captureInstanceExecution())",
        "export const safeNestedOverwrite = nestedOverwrite.box.execution",
        "const nestedParentOverwrite = { box: { execution: ordinary } }",
        "nestedParentOverwrite.box.execution = captureInstanceExecution()",
        "nestedParentOverwrite.box = { execution: ordinary }",
        "export const safeNestedParentOverwrite = nestedParentOverwrite.box.execution",
        "const replacedRoot = { box: { execution: ordinary } }",
        "const oldBox = replacedRoot.box",
        "replacedRoot.box = { execution: captureInstanceExecution() }",
        "export const safeOldBox = oldBox.execution",
        "const detachedRoot = { box: { execution: ordinary } }",
        "const detachedBox = detachedRoot.box",
        "detachedRoot.box = { execution: ordinary }",
        "detachedBox.execution = captureInstanceExecution()",
        "export const safeCurrentBox = detachedRoot.box.execution",
        "const copiedRoot = { box: { execution: ordinary } }",
        "const copiedOld = copiedRoot.box",
        "copiedRoot.box = { execution: captureInstanceExecution() }",
        "const copiedOldAgain = copiedOld",
        "export const safeCopiedOld = copiedOldAgain.execution",
        "const conditionalRoot = { box: { execution: ordinary } }",
        "const conditionalOld = conditionalRoot.box",
        "if (pick) conditionalRoot.box = { execution: captureInstanceExecution() }",
        "export const safeConditionalOld = conditionalOld.execution",
        "const conditionalOpaqueRoot = { box: { execution: ordinary } }",
        "if (pick) conditionalOpaqueRoot.box = { execution: makeOpaqueBootstrapHandle(captureInstanceExecution()) }",
        "const conditionalOpaqueBox = conditionalOpaqueRoot.box",
        "export const safeConditionalOpaque = conditionalOpaqueBox.execution",
      ].join("\n"),
    },
  })
  await using _ordinary = ordinary.tmp
  expect((await run(["--check"], ordinary.env)).stderr).not.toContain(
    "captured InstanceExecution cannot be re-exported",
  )
})

test("capture containers cannot escape after later writes", async () => {
  for (const [name, write] of [
    ["assigned object", "const box: Record<string, unknown> = {}; box.execution = execution"],
    ["pushed array", "const box: unknown[] = []; box.push(execution)"],
  ] as const) {
    const input = await fixture({
      source: {
        "effect/bootstrap-runtime.ts": [
          "export function bootstrap() {",
          "  const execution = captureInstanceExecution()",
          `  ${write}`,
          "  return box",
          "}",
        ].join("\n"),
      },
    })
    await using _ = input.tmp
    expect((await run(["--check"], input.env)).stderr, name).toContain(
      "captured InstanceExecution cannot be re-exported",
    )
  }
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

test("MCP and LSP lifecycle callbacks are part of the actual-source universe", () => {
  const summaries = inspectCandidateSummaries()
  const byFile = new Map<string, typeof summaries>()
  for (const summary of summaries) byFile.set(summary.file, [...(byFile.get(summary.file) ?? []), summary])

  expect(
    [...byFile.keys()].filter((file) => file.startsWith("src/mcp/") || file.startsWith("src/lsp/")).sort(),
  ).toEqual(["src/lsp/client.ts", "src/lsp/lsp.ts", "src/mcp/index.ts", "src/mcp/sampling.ts"])
  expect(byFile.get("src/mcp/index.ts")?.some((summary) => summary.symbol.startsWith("startTurnLifecycleNotification"))).toBe(true)
  expect(byFile.get("src/mcp/index.ts")?.some((summary) => summary.symbol.startsWith("watch"))).toBe(true)
  expect(byFile.get("src/mcp/sampling.ts")?.some((summary) => summary.symbol.startsWith("serve"))).toBe(true)
  expect(byFile.get("src/lsp/client.ts")?.some((summary) => summary.symbol.startsWith("create"))).toBe(true)
  expect(byFile.get("src/lsp/lsp.ts")?.some((summary) => summary.symbol.includes("getClients"))).toBe(true)
})

test("transfer release paths dominate exits and child handles cannot escape before arming", async () => {
  const cases = [
    [
      "conditional-success",
      [
        "export function setup(condition: boolean) {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "    if (condition) handoff.release({ ok: true })",
        "    return child",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
      "success release must dominate every normal exit",
    ],
    [
      "failure-before-release",
      [
        "export function setup(condition: boolean) {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "    handoff.release({ ok: true })",
        "    return child",
        "  } catch (error) {",
        "    if (condition) throw new Error('wrapped')",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
      "failure release must dominate every exceptional exit and rethrow the original error",
    ],
    [
      "failure-wraps-error",
      [
        "export function setup() {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "    handoff.release({ ok: true })",
        "    return child",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw new Error('wrapped')",
        "  }",
        "}",
      ].join("\n"),
      "failure release must dominate every exceptional exit and rethrow the original error",
    ],
    [
      "throwing-after-success-release",
      [
        "export function setup() {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "    handoff.release({ ok: true })",
        "    return publish(child)",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
      "successful release must be the last potentially throwing action protected by catch",
    ],
    [
      "published-child",
      [
        "let published",
        "export function setup() {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "    published = child",
        "    handoff.release({ ok: true })",
        "    return child",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
      "transferred child handle must not escape before successful release",
    ],
    [
      "passed-child",
      [
        "export function setup() {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "    publish(child)",
        "    handoff.release({ ok: true })",
        "    return child",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
      "transferred child handle must not escape before successful release",
    ],
    [
      "returned-child",
      [
        "export function setup() {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "    return child",
        "    handoff.release({ ok: true })",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
      "transferred child handle must not escape before successful release",
    ],
    [
      "captured-child",
      [
        "export function setup() {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "    const expose = () => child",
        "    handoff.release({ ok: true })",
        "    return { child, expose }",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
      "transferred child handle must not escape before successful release",
    ],
    [
      "property-child",
      [
        "export function setup() {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "    published.child = child",
        "    handoff.release({ ok: true })",
        "    return child",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
      "transferred child handle must not escape before successful release",
    ],
    [
      "callback-child",
      [
        "export function setup() {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => {",
        "      const producer = registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })",
        "      publish(producer)",
        "      return producer",
        "    })",
        "    handoff.release({ ok: true })",
        "    return child",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
      "transferred child handle must not escape before successful release",
    ],
    [
      "direct-runSync-result",
      [
        "export function setup() {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    publish(handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })))",
        "    handoff.release({ ok: true })",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  }",
        "}",
      ].join("\n"),
      "transferred child handle must not escape before successful release",
    ],
    [
      "continue-before-release",
      [
        "export function setup(items: unknown[], skip: boolean) {",
        "  for (const item of items) {",
        "    const handoff = acquireGenerationLease()",
        "    try {",
        "      const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "      if (skip) continue",
        "      handoff.release({ ok: true })",
        "      return child",
        "    } catch (error) {",
        "      handoff.release({ ok: false, error })",
        "      throw error",
        "    }",
        "  }",
        "}",
      ].join("\n"),
      "success release must dominate every normal exit",
    ],
    [
      "finally-replaces-error",
      [
        "export function setup(condition: boolean) {",
        "  const handoff = acquireGenerationLease()",
        "  try {",
        "    const child = handoff.runSync(() => registerTransferredGenerationProducer({ handoffFrom: handoff, label, run }))",
        "    handoff.release({ ok: true })",
        "    return child",
        "  } catch (error) {",
        "    handoff.release({ ok: false, error })",
        "    throw error",
        "  } finally {",
        "    if (condition) return undefined",
        "  }",
        "}",
      ].join("\n"),
      "failure release must dominate every exceptional exit and rethrow the original error",
    ],
  ] as const
  const input = await fixture({
    source: Object.fromEntries(cases.map(([name, source]) => [`project/${name}.ts`, source])),
  })
  await using _ = input.tmp
  const stderr = (await run(["--check"], input.env)).stderr
  for (const [name, , message] of cases) {
    expect(stderr, name).toContain(`${message}: src/project/${name}.ts:handoff`)
  }
})

test("lifecycle authority checks structural callsites, escapes, types, and PromiseLike results", async () => {
  const input = await fixture({
    source: {
      "local-promise.d.ts": localPromiseDeclarations,
      "workflow/runtime.ts": "export function spawnIsolated() { return disposeDirectorySettled('/tmp/forged') }\n",
      "effect/run-service.ts": [
        "export function attachWith() {",
        "  const execution = captureInstanceExecution()",
        "  const alias = execution",
        "  return alias",
        "}",
      ].join("\n"),
      "namespace-export.ts": 'export * as lifecycle from "./effect/instance-ref"\n',
      "assertion.ts": "const execution = <InstanceExecution>{}\n",
      "as-assertion.ts": "const execution = {} as InstanceExecution\n",
      "typed-lease.ts": "declare const x: GenerationLease; x.release()\n",
      "fetch-sync.ts": "declare const lease: GenerationLease; lease.runSync(() => fetch(url))\n",
      "thenable-sync.ts": [
        "declare const lease: GenerationLease",
        "declare function later(): PromiseLike<void>",
        "lease.runSync(() => later())",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const result = await run(["--check"], input.env)
  for (const message of [
    "private lifecycle join call is not exact-allowlisted",
    "captured InstanceExecution cannot be re-exported",
    "lifecycle authority module cannot be namespace re-exported",
    "InstanceExecution cannot be cast or reconstructed",
    "release requires a discriminated result",
    "runSync cannot accept async or PromiseLike callbacks",
  ]) {
    expect(result.stderr).toContain(message)
  }
})

test("custom fixtures classify only locally declared thenables", async () => {
  const ambient = await fixture({
    source: {
      "effect/ambient-callback.ts": "declare const lease: GenerationLease; lease.runSync(() => fetch(url))\n",
    },
  })
  await using _ambient = ambient.tmp
  expect((await run(["--check"], ambient.env)).stderr).not.toContain(
    "runSync cannot accept async or PromiseLike callbacks",
  )

  const local = await fixture({
    source: {
      "effect/local-callback.ts": [
        "interface LocalThenable { then(resolve: () => void): void }",
        "declare function localFetch(value: unknown): LocalThenable",
        "declare const lease: GenerationLease",
        "lease.runSync(() => localFetch(value))",
      ].join("\n"),
    },
  })
  await using _local = local.tmp
  expect((await run(["--check"], local.env)).stderr).toContain(
    "runSync cannot accept async or PromiseLike callbacks",
  )
})

test("typed PromiseLike callback references cannot enter runSync", async () => {
  const input = await fixture({
    source: {
      "local-promise.d.ts": localPromiseDeclarations,
      "effect/callback.ts": [
        "declare const lease: GenerationLease",
        "declare const callback: () => PromiseLike<number>",
        "lease.runSync(callback)",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  expect((await run(["--check"], input.env)).stderr).toContain("runSync cannot accept async or PromiseLike callbacks")
})

test("PromiseLike fallback ignores returns inside nested callables", async () => {
  const input = await fixture({
    source: {
      "local-promise.d.ts": localPromiseDeclarations,
      "effect/safe-function.ts": [
        "declare const lease: GenerationLease",
        "lease.runSync(() => {",
        "  function later() { return Promise.resolve() }",
        "  return later",
        "})",
      ].join("\n"),
      "effect/safe-function-expression.ts": [
        "declare const lease: GenerationLease",
        "lease.runSync(() => {",
        "  return function () { return Promise.resolve() }",
        "})",
      ].join("\n"),
      "effect/safe-arrow.ts": [
        "declare const lease: GenerationLease",
        "lease.runSync(() => {",
        "  const later = () => { return Promise.resolve() }",
        "  return later",
        "})",
      ].join("\n"),
      "effect/safe-method.ts": [
        "declare const lease: GenerationLease",
        "lease.runSync(() => {",
        "  const holder = { later() { return Promise.resolve() } }",
        "  return holder.later",
        "})",
      ].join("\n"),
      "effect/safe-getter.ts": [
        "declare const lease: GenerationLease",
        "lease.runSync(() => {",
        "  return { get later() { return Promise.resolve() } }",
        "})",
      ].join("\n"),
      "effect/safe-array.ts": [
        "declare const lease: GenerationLease",
        "lease.runSync(() => {",
        "  return [() => Promise.resolve()]",
        "})",
      ].join("\n"),
      "effect/safe-class.ts": [
        "declare const lease: GenerationLease",
        "lease.runSync(() => {",
        "  class Later { run() { return Promise.resolve() } }",
        "  return Later",
        "})",
      ].join("\n"),
      "effect/unsafe-outer.ts": [
        "declare const lease: GenerationLease",
        "lease.runSync(() => {",
        "  function later() { return ordinary }",
        "  return Promise.resolve()",
        "})",
      ].join("\n"),
      "effect/unsafe-branch.ts": [
        "declare const lease: GenerationLease",
        "declare const pick: boolean",
        "lease.runSync(() => {",
        "  if (pick) return Promise.resolve()",
        "  return ordinary",
        "})",
      ].join("\n"),
      "effect/unsafe-thenable.ts": [
        "declare const lease: GenerationLease",
        "lease.runSync(() => {",
        "  return { then(resolve) { resolve() } }",
        "})",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const stderr = (await run(["--check"], input.env)).stderr
  for (const file of [
    "safe-function",
    "safe-function-expression",
    "safe-arrow",
    "safe-method",
    "safe-getter",
    "safe-array",
    "safe-class",
  ]) {
    expect(stderr).not.toContain(`runSync cannot accept async or PromiseLike callbacks: src/effect/${file}.ts`)
  }
  for (const file of ["unsafe-outer", "unsafe-branch", "unsafe-thenable"]) {
    expect(stderr).toContain(`runSync cannot accept async or PromiseLike callbacks: src/effect/${file}.ts`)
  }
})

test("runSync method aliases cannot accept PromiseLike callbacks", async () => {
  const input = await fixture({
    source: {
      "local-promise.d.ts": localPromiseDeclarations,
      "effect/callback.ts": [
        "declare const lease: GenerationLease",
        "const run = lease.runSync",
        "run(() => fetch(url))",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  expect((await run(["--check"], input.env)).stderr).toContain("runSync cannot accept async or PromiseLike callbacks")
})

test("authority aliases resolve only through enclosing lexical scopes", async () => {
  const cases = [
    [
      "value alias",
      [
        "declare const lease: GenerationLease",
        "declare function benign(callback?: unknown): unknown",
        "declare function work(): unknown",
        "const run = lease.runSync",
        "{ const run = benign }",
        "run(async () => work())",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "function-scoped var",
      [
        "export function start(lease: GenerationLease) {",
        "  { var run = lease.runSync }",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "repeated var declarations",
      [
        "export function start(lease: GenerationLease, benign: (callback?: unknown) => unknown) {",
        "  var run = benign",
        "  var run = lease.runSync",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "repeated var without overwrite",
      [
        "export function start(lease: GenerationLease) {",
        "  var run = lease.runSync",
        "  var run",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "conditional var overwrite",
      [
        "export function start(lease: GenerationLease, benign: (callback?: unknown) => unknown, pick: boolean) {",
        "  var run = lease.runSync",
        "  if (pick) { var run = benign }",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "conditional assignment",
      [
        "export function start(lease: GenerationLease, benign: (callback?: unknown) => unknown, pick: boolean) {",
        "  let run = benign",
        "  if (pick) run = lease.runSync",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "short-circuit assignment",
      [
        "export function start(lease: GenerationLease, benign: (callback?: unknown) => unknown, pick: boolean) {",
        "  let run = lease.runSync",
        "  pick && (run = benign)",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "conditional expression assignment",
      [
        "export function start(lease: GenerationLease, benign: (callback?: unknown) => unknown, pick: boolean) {",
        "  let run = lease.runSync",
        "  pick ? (run = benign) : undefined",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "conditional initializer",
      [
        "export function start(lease: GenerationLease, benign: (callback?: unknown) => unknown, pick: boolean) {",
        "  const run = pick ? lease.runSync : benign",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "loop increment assignment",
      [
        "export function start(lease: GenerationLease, benign: (callback?: unknown) => unknown, pick: boolean) {",
        "  let run = lease.runSync",
        "  for (; pick; run = benign) break",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "catch parameter",
      [
        "export function start(lease: GenerationLease, benign: (callback?: unknown) => unknown) {",
        "  const run = lease.runSync",
        "  try {} catch (run) {}",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "for initializer",
      [
        "export function start(lease: GenerationLease, benign: (callback?: unknown) => unknown) {",
        "  const run = lease.runSync",
        "  for (const run = benign; false;) {}",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "switch case",
      [
        "export function start(lease: GenerationLease, benign: (callback?: unknown) => unknown) {",
        "  const run = lease.runSync",
        "  switch (0) { case 0: const run = benign; break }",
        "  run(async () => undefined)",
        "}",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "destructured alias",
      [
        "declare const lease: GenerationLease",
        "declare const safe: { benign(callback?: unknown): unknown }",
        "declare function work(): unknown",
        "const { runSync: run } = lease",
        "{ const { benign: run } = safe }",
        "run(async () => work())",
      ].join("\n"),
      "runSync cannot accept async or PromiseLike callbacks",
    ],
    [
      "raw helper alias",
      [
        "declare function benign(): unknown",
        "export function bootstrap() {",
        "  const capture = captureInstanceExecution",
        "  { const capture = benign }",
        "  return makeOpaqueBootstrapHandle(capture())",
        "}",
      ].join("\n"),
      "raw lifecycle helper call is not exact-allowlisted",
    ],
    [
      "repeated raw helper alias",
      [
        "declare function benign(): unknown",
        "var capture = benign",
        "var capture = captureInstanceExecution",
        "export function bootstrap() {",
        "  return makeOpaqueBootstrapHandle(capture())",
        "}",
      ].join("\n"),
      "raw lifecycle helper call is not exact-allowlisted",
    ],
    [
      "repeated raw helper alias without overwrite",
      [
        "var capture = captureInstanceExecution",
        "var capture",
        "export function bootstrap() {",
        "  return makeOpaqueBootstrapHandle(capture())",
        "}",
      ].join("\n"),
      "raw lifecycle helper call is not exact-allowlisted",
    ],
    [
      "conditional raw helper alias overwrite",
      [
        "declare const pick: boolean",
        "declare function benign(): unknown",
        "var capture = captureInstanceExecution",
        "if (pick) { var capture = benign }",
        "export function bootstrap() {",
        "  return makeOpaqueBootstrapHandle(capture())",
        "}",
      ].join("\n"),
      "raw lifecycle helper call is not exact-allowlisted",
    ],
    [
      "conditional raw helper alias assignment",
      [
        "declare const pick: boolean",
        "declare function benign(): unknown",
        "let capture = benign",
        "if (pick) capture = captureInstanceExecution",
        "export function bootstrap() {",
        "  return makeOpaqueBootstrapHandle(capture())",
        "}",
      ].join("\n"),
      "raw lifecycle helper call is not exact-allowlisted",
    ],
    [
      "conditional raw helper initializer",
      [
        "declare const pick: boolean",
        "declare function benign(): unknown",
        "const capture = pick ? captureInstanceExecution : benign",
        "export function bootstrap() {",
        "  return makeOpaqueBootstrapHandle(capture())",
        "}",
      ].join("\n"),
      "raw lifecycle helper call is not exact-allowlisted",
    ],
    [
      "short-circuit raw helper assignment",
      [
        "declare const pick: boolean",
        "declare function benign(): unknown",
        "let capture = captureInstanceExecution",
        "pick && (capture = benign)",
        "export function bootstrap() {",
        "  return makeOpaqueBootstrapHandle(capture())",
        "}",
      ].join("\n"),
      "raw lifecycle helper call is not exact-allowlisted",
    ],
  ] as const
  const methodCases = cases.filter(([name]) => !name.includes("raw helper"))
  const rawCases = cases.filter(([name]) => name.includes("raw helper"))
  const methodFile = (name: (typeof cases)[number][0]) => `effect/lexical-${name.replaceAll(" ", "-")}.ts`
  const rawSymbol = (index: number) => (index === 0 ? "bootstrap" : `bootstrap${index}`)
  const input = await fixture({
    source: {
      ...Object.fromEntries(methodCases.map(([name, source]) => [methodFile(name), `${source}\nexport {}`])),
      "effect/bootstrap-runtime.ts": rawCases
        .map(([, source], index) => {
          if (index === 0) return source
          return source
            .replace(/\bbootstrap\b/g, rawSymbol(index))
            .replace(/\bcapture\b/g, `capture${index}`)
            .replace(/\bbenign\b/g, `benign${index}`)
            .replace(/\bpick\b/g, `pick${index}`)
        })
        .join("\n"),
    },
  })
  await using _ = input.tmp
  const stderr = (await run(["--check"], input.env)).stderr
  for (const [name, , message] of methodCases) {
    expect(stderr, name).toContain(`${message}: src/${methodFile(name)}:`)
  }
  for (const [[name, , message], index] of rawCases.map((entry, index) => [entry, index] as const)) {
    const expected = index === 0 ? message : "raw lifecycle helper is not allowlisted"
    expect(stderr, name).toContain(`${expected}: src/effect/bootstrap-runtime.ts:${rawSymbol(index)}:`)
  }
})

test("authority aliases resolve through custom-root imports", async () => {
  const input = await fixture({
    source: {
      "effect/provider.ts": [
        "declare const lease: GenerationLease",
        "export const run = lease.runSync",
        "export const capture = captureInstanceExecution",
      ].join("\n"),
      "effect/callback.ts": [
        'import { run } from "./provider"',
        "run(async () => undefined)",
      ].join("\n"),
      "effect/bootstrap-runtime.ts": [
        'import { capture } from "./provider"',
        "export function bootstrap() {",
        "  return makeOpaqueBootstrapHandle(capture())",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const result = await run(["--check"], input.env)
  expect(result.stderr).toContain("runSync cannot accept async or PromiseLike callbacks")
  expect(result.stderr).toContain("raw lifecycle helper call is not exact-allowlisted")
})

test("default imports preserve lifecycle authority provenance", async () => {
  const method = await fixture({
    source: {
      "effect/provider.ts": [
        "declare const lease: GenerationLease",
        "export default lease.runSync",
      ].join("\n"),
      "effect/callback.ts": [
        'import run from "./provider"',
        "run(async () => undefined)",
      ].join("\n"),
      "effect/js-callback.ts": [
        'import run from "./provider.js"',
        "run(async () => undefined)",
      ].join("\n"),
      "effect/named-default-callback.ts": [
        'import { default as run } from "./provider"',
        "run(async () => undefined)",
      ].join("\n"),
      "effect/local-barrel.ts": [
        'import run from "./provider"',
        "declare function benign(callback?: unknown): unknown",
        "let forwarded = benign",
        "forwarded = run",
        "export { forwarded as default }",
      ].join("\n"),
      "effect/local-barrel-callback.ts": [
        'import run from "./local-barrel"',
        "run(async () => undefined)",
      ].join("\n"),
      "effect/clean-local-barrel.ts": [
        'import run from "./provider"',
        "declare function benign(callback?: unknown): unknown",
        "let forwarded = run",
        "forwarded = benign",
        "export { forwarded as default }",
      ].join("\n"),
      "effect/clean-local-barrel-callback.ts": [
        'import run from "./clean-local-barrel"',
        "run(async () => undefined)",
      ].join("\n"),
      "effect/conditional-local-barrel.ts": [
        'import run from "./provider"',
        "declare const pick: boolean",
        "declare function benign(callback?: unknown): unknown",
        "let forwarded = benign",
        "if (pick) forwarded = run",
        "export { forwarded as default }",
      ].join("\n"),
      "effect/conditional-local-barrel-callback.ts": [
        'import run from "./conditional-local-barrel"',
        "run(async () => undefined)",
      ].join("\n"),
      "effect/named-local-barrel.ts": [
        'import run from "./provider"',
        "declare function benign(callback?: unknown): unknown",
        "let forwarded = benign",
        "forwarded = run",
        "export { forwarded }",
      ].join("\n"),
      "effect/named-local-barrel-callback.ts": [
        'import { forwarded as run } from "./named-local-barrel"',
        "run(async () => undefined)",
      ].join("\n"),
      "effect/nested-local-barrel.ts": [
        'import run from "./provider"',
        "declare function benign(callback?: unknown): unknown",
        "let inner = benign",
        "inner = run",
        "export const forwarded = inner",
      ].join("\n"),
      "effect/nested-local-barrel-callback.ts": [
        'import { forwarded as invoke } from "@/effect/nested-local-barrel"',
        "invoke(async () => undefined)",
      ].join("\n"),
      "effect/clean-nested-local-barrel.ts": [
        'import run from "./provider"',
        "declare function benign(callback?: unknown): unknown",
        "let inner = run",
        "inner = benign",
        "export const forwarded = inner",
      ].join("\n"),
      "effect/clean-nested-local-barrel-callback.ts": [
        'import { forwarded as invoke } from "./clean-nested-local-barrel"',
        "invoke(async () => undefined)",
      ].join("\n"),
      "effect/conditional-nested-local-barrel.ts": [
        'import run from "./provider"',
        "declare const pick: boolean",
        "declare function benign(callback?: unknown): unknown",
        "let inner = benign",
        "if (pick) inner = run",
        "export const forwarded = inner",
      ].join("\n"),
      "effect/conditional-nested-local-barrel-callback.ts": [
        'import { forwarded as invoke } from "./conditional-nested-local-barrel"',
        "invoke(async () => undefined)",
      ].join("\n"),
    },
  })
  await using _method = method.tmp
  const methodErrors = (await run(["--check"], method.env)).stderr
  expect(methodErrors).not.toContain("src/effect/clean-local-barrel-callback.ts")
  expect(methodErrors).not.toContain("src/effect/clean-nested-local-barrel-callback.ts")
  expect(methodErrors.match(/runSync cannot accept async or PromiseLike callbacks/g)).toHaveLength(8)

  const helper = await fixture({
    source: {
      "effect/instance-ref.ts": [
        "export default function captureInstanceExecution() { return handle }",
      ].join("\n"),
      "effect/bootstrap-runtime.ts": [
        'import capture from "./instance-ref"',
        "export function bootstrap() { return capture() }",
      ].join("\n"),
      "effect/barrel.ts": 'export { default } from "./instance-ref"\n',
      "effect/barrel-consumer.ts": [
        'import capture from "./barrel"',
        "export function bootstrapFromBarrel() { return capture() }",
      ].join("\n"),
      "effect/alias-consumer.ts": [
        'import capture from "@/effect/barrel"',
        "export function bootstrapFromAlias() { return capture() }",
      ].join("\n"),
      "effect/named-default-consumer.ts": [
        'import { default as capture } from "./instance-ref"',
        "export function bootstrapFromNamedDefault() { return capture() }",
      ].join("\n"),
      "effect/named-barrel.ts": 'export { default as capture } from "./instance-ref"\n',
      "effect/named-barrel-consumer.ts": [
        'import { capture } from "./named-barrel"',
        "export function bootstrapFromNamedBarrel() { return capture() }",
      ].join("\n"),
      "effect/namespace-consumer.ts": [
        'import * as lifecycle from "./named-barrel"',
        "export function bootstrapFromNamespace() { return lifecycle.capture() }",
      ].join("\n"),
      "effect/unused-barrel.ts": 'export { default } from "./instance-ref"\n',
      "effect/local-import-barrel.ts": [
        'import capture from "./instance-ref"',
        "export { capture as default }",
      ].join("\n"),
      "effect/local-import-consumer.ts": [
        'import capture from "./local-import-barrel"',
        "export function bootstrapFromLocalImport() { return capture() }",
      ].join("\n"),
      "effect/unused-local-import.ts": [
        'import capture from "./instance-ref"',
        "export default capture",
      ].join("\n"),
    },
  })
  await using _helper = helper.tmp
  const helperErrors = (await run(["--check"], helper.env)).stderr
  expect(helperErrors).toContain("raw lifecycle helper call is not exact-allowlisted: src/effect/bootstrap-runtime.ts")
  for (const file of [
    "barrel-consumer.ts",
    "alias-consumer.ts",
    "named-default-consumer.ts",
    "named-barrel-consumer.ts",
    "namespace-consumer.ts",
    "local-import-consumer.ts",
  ]) {
    expect(helperErrors).toContain(`raw lifecycle helper is not allowlisted: src/effect/${file}`)
  }
  expect(helperErrors).toContain("raw lifecycle helper cannot be re-exported: src/effect/unused-barrel.ts")
  expect(helperErrors).toContain("raw lifecycle helper cannot be re-exported: src/effect/unused-local-import.ts")
  expect(helperErrors.match(/captured InstanceExecution cannot be re-exported/g)).toHaveLength(7)

  const ordinary = await fixture({
    source: {
      "ordinary/helper.ts": [
        "function captureInstanceExecution() { return undefined }",
        "export default captureInstanceExecution",
      ].join("\n"),
      "effect/callback.ts": [
        'import { default as capture } from "../ordinary/helper"',
        "export function ordinary() { return capture() }",
      ].join("\n"),
      "ordinary/barrel.ts": 'export { default as capture } from "./helper"\n',
      "ordinary/local-barrel.ts": [
        'import capture from "./helper"',
        "export { capture as default }",
      ].join("\n"),
      "effect/barrel-callback.ts": [
        'import { capture } from "../ordinary/barrel"',
        "export function ordinaryBarrel() { return capture() }",
      ].join("\n"),
      "effect/namespace-callback.ts": [
        'import * as ordinary from "../ordinary/barrel"',
        "export function ordinaryNamespace() { return ordinary.capture() }",
      ].join("\n"),
      "effect/local-barrel-callback.ts": [
        'import capture from "../ordinary/local-barrel"',
        "export function ordinaryLocalBarrel() { return capture() }",
      ].join("\n"),
    },
  })
  await using _ordinary = ordinary.tmp
  const ordinaryErrors = (await run(["--check"], ordinary.env)).stderr
  expect(ordinaryErrors).not.toContain("raw lifecycle helper")
  expect(ordinaryErrors).not.toContain("captured InstanceExecution cannot be re-exported")
})

test("authority alias reaching definitions preserve unconditional overwrites", async () => {
  const input = await fixture({
    source: {
      "effect/callback.ts": [
        "declare const lease: GenerationLease",
        "declare function benign(callback?: unknown): unknown",
        "var run = lease.runSync",
        "var run = benign",
        "run(async () => undefined)",
        "let assignedRun = lease.runSync",
        "assignedRun = benign",
        "assignedRun(async () => undefined)",
        "let blockRun = lease.runSync",
        "{ blockRun = benign }",
        "blockRun(async () => undefined)",
        "const captureInstanceExecution = () => undefined",
        "export function ordinary() { return captureInstanceExecution() }",
      ].join("\n"),
      "effect/function-shadow.ts": [
        "function captureInstanceExecution() { return undefined }",
        "export function ordinaryFunctionShadow() { return captureInstanceExecution() }",
      ].join("\n"),
      "ordinary/helper.ts": "export function captureInstanceExecution() { return undefined }\n",
      "effect/import-shadow.ts": [
        'import { captureInstanceExecution } from "../ordinary/helper"',
        "export function ordinaryImportShadow() { return captureInstanceExecution() }",
      ].join("\n"),
      "effect/reexport-shadow.ts": 'export { captureInstanceExecution } from "../ordinary/helper"\n',
      "effect/bootstrap-runtime.ts": [
        "declare function benign(): unknown",
        "var capture = captureInstanceExecution",
        "var capture = benign",
        "export function bootstrap() {",
        "  let assignedCapture = captureInstanceExecution",
        "  assignedCapture = benign",
        "  assignedCapture()",
        "  var value = captureInstanceExecution()",
        "  var value = makeOpaqueBootstrapHandle(value)",
        "  return value",
        "}",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const stderr = (await run(["--check"], input.env)).stderr
  expect(stderr).not.toContain("runSync cannot accept async or PromiseLike callbacks")
  expect(stderr).not.toContain("raw lifecycle helper")
  expect(stderr).not.toContain("captured InstanceExecution cannot be re-exported")
})

test("runSync resolves all possible callback definitions", async () => {
  const input = await fixture({
    source: {
      "local-promise.d.ts": localPromiseDeclarations,
      "effect/callback.ts": [
        "declare const lease: GenerationLease",
        "declare const pick: boolean",
        "let callback: () => unknown = () => Promise.resolve()",
        "if (pick) callback = () => 0",
        "lease.runSync(callback)",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  expect((await run(["--check"], input.env)).stderr).toContain(
    "runSync cannot accept async or PromiseLike callbacks",
  )
})

test("runSync PromiseLike aliases preserve conditional reaching definitions", async () => {
  const input = await fixture({
    source: {
      "local-promise.d.ts": localPromiseDeclarations,
      "effect/callback.ts": [
        "declare const lease: GenerationLease",
        "declare const pick: boolean",
        "let pending: unknown = Promise.resolve()",
        "if (pick) pending = 0",
        "lease.runSync(() => pending)",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  expect((await run(["--check"], input.env)).stderr).toContain(
    "runSync cannot accept async or PromiseLike callbacks",
  )
})

test("authority aliases follow shorthand property values", async () => {
  const input = await fixture({
    source: {
      "effect/callback.ts": [
        "declare const lease: GenerationLease",
        "const run = lease.runSync",
        "const api = { run }",
        "api.run(async () => undefined)",
      ].join("\n"),
      "effect/bootstrap-runtime.ts": [
        "const capture = captureInstanceExecution",
        "const api = { capture }",
        "export const bootstrap = () => api.capture()",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const stderr = (await run(["--check"], input.env)).stderr
  expect(stderr).toContain("runSync cannot accept async or PromiseLike callbacks")
  expect(stderr).toContain("captured InstanceExecution cannot be re-exported")
})

test("non-null wrappers preserve lifecycle authority provenance", async () => {
  const input = await fixture({
    source: {
      "local-promise.d.ts": localPromiseDeclarations,
      "effect/callback.ts": [
        "declare const lease: GenerationLease",
        "lease.runSync!(() => Promise.resolve())",
      ].join("\n"),
      "effect/bootstrap-runtime.ts": "export const bootstrap = () => captureInstanceExecution!()\n",
    },
  })
  await using _ = input.tmp
  const stderr = (await run(["--check"], input.env)).stderr
  expect(stderr).toContain("runSync cannot accept async or PromiseLike callbacks")
  expect(stderr).toContain("captured InstanceExecution cannot be re-exported")
})

test("indexed helper access uses canonical symbol provenance", async () => {
  const canonical = await fixture({
    source: {
      "effect/instance-ref.ts": "export function captureInstanceExecution() { return handle }\n",
      "effect/callback.ts": [
        'import * as lifecycle from "./instance-ref"',
        "export function indexed() { return lifecycle['captureInstanceExecution']() }",
      ].join("\n"),
    },
  })
  await using _canonical = canonical.tmp
  expect((await run(["--check"], canonical.env)).stderr).toContain(
    "raw lifecycle helper is not allowlisted: src/effect/callback.ts",
  )

  const ordinary = await fixture({
    source: {
      "ordinary/helper.ts": "export function captureInstanceExecution() { return undefined }\n",
      "effect/callback.ts": [
        'import * as ordinary from "../ordinary/helper"',
        "export function indexed() { return ordinary['captureInstanceExecution']() }",
      ].join("\n"),
    },
  })
  await using _ordinary = ordinary.tmp
  const stderr = (await run(["--check"], ordinary.env)).stderr
  expect(stderr).not.toContain("raw lifecycle helper")
  expect(stderr).not.toContain("captured InstanceExecution cannot be re-exported")
})

test("namespace imports cannot relay canonical raw lifecycle helpers", async () => {
  const canonical = await fixture({
    source: {
      "effect/instance-ref.ts": "export function captureInstanceExecution() { return handle }\n",
      "effect/instance-barrel.ts": 'export * from "./instance-ref"\n',
      "effect/namespace-export.ts": [
        'import * as lifecycle from "./instance-ref"',
        "export { lifecycle }",
      ].join("\n"),
      "effect/namespace-alias.ts": [
        'import * as lifecycle from "./instance-ref"',
        "export { lifecycle as exposed }",
      ].join("\n"),
      "effect/namespace-const.ts": [
        'import * as lifecycle from "./instance-ref"',
        "export const exposed = lifecycle",
      ].join("\n"),
      "effect/namespace-barrel.ts": [
        'import * as lifecycle from "./instance-barrel"',
        "export default lifecycle",
      ].join("\n"),
    },
  })
  await using _canonical = canonical.tmp
  const canonicalStderr = (await run(["--check"], canonical.env)).stderr
  for (const file of [
    "src/effect/namespace-export.ts",
    "src/effect/namespace-alias.ts",
    "src/effect/namespace-const.ts",
    "src/effect/namespace-barrel.ts",
  ]) {
    expect(canonicalStderr).toContain(`raw lifecycle helper cannot be re-exported: ${file}`)
  }

  const canonicalDefault = await fixture({
    source: {
      "effect/instance-ref.ts": "export default function captureInstanceExecution() { return handle }\n",
      "effect/default-barrel.ts": 'export { default as exposed } from "./instance-ref"\n',
      "effect/namespace-default.ts": [
        'import * as lifecycle from "./instance-ref"',
        "export const exposed = lifecycle",
      ].join("\n"),
      "effect/namespace-default-barrel.ts": [
        'import * as lifecycle from "./default-barrel"',
        "export default lifecycle",
      ].join("\n"),
    },
  })
  await using _canonicalDefault = canonicalDefault.tmp
  const defaultStderr = (await run(["--check"], canonicalDefault.env)).stderr
  for (const file of ["src/effect/namespace-default.ts", "src/effect/namespace-default-barrel.ts"]) {
    expect(defaultStderr).toContain(`raw lifecycle helper cannot be re-exported: ${file}`)
  }

  const ordinary = await fixture({
    source: {
      "ordinary/helper.ts": "export function captureInstanceExecution() { return undefined }\n",
      "ordinary/default-helper.ts": "export default function captureInstanceExecution() { return undefined }\n",
      "effect/ordinary-namespace.ts": [
        'import * as lifecycle from "../ordinary/helper"',
        "export { lifecycle }",
        "export const exposed = lifecycle",
      ].join("\n"),
      "effect/unused-namespace.ts": 'import * as lifecycle from "./instance-ref"\nexport const stable = true',
      "effect/ordinary-default-namespace.ts": [
        'import * as lifecycle from "../ordinary/default-helper"',
        "export const exposed = lifecycle",
      ].join("\n"),
      "effect/type-namespace.ts": [
        'import type * as lifecycle from "./instance-ref"',
        "export type { lifecycle }",
      ].join("\n"),
      "effect/instance-ref.ts": "export function captureInstanceExecution() { return handle }\n",
    },
  })
  await using _ordinary = ordinary.tmp
  expect((await run(["--check"], ordinary.env)).stderr).not.toContain(
    "raw lifecycle helper cannot be re-exported",
  )
})

test("exported raw helper bindings use canonical symbol provenance", async () => {
  const canonical = await fixture({
    source: {
      "effect/instance-ref.ts": "export function captureInstanceExecution() { return handle }\n",
      "effect/bootstrap-runtime.ts": [
        'import { captureInstanceExecution } from "./instance-ref"',
        "export const leaked = captureInstanceExecution",
        "export const leakedObject = { captureInstanceExecution }",
        "export const leakedArrow = () => captureInstanceExecution",
        "export function leakedFunction() { return captureInstanceExecution }",
      ].join("\n"),
    },
  })
  await using _canonical = canonical.tmp
  expect((await run(["--check"], canonical.env)).stderr).toContain(
    "raw lifecycle helper cannot be re-exported: src/effect/bootstrap-runtime.ts:captureInstanceExecution",
  )

  const ordinary = await fixture({
    source: {
      "ordinary/helper.ts": "export function captureInstanceExecution() { return undefined }\n",
      "effect/bootstrap-runtime.ts": [
        'import { captureInstanceExecution } from "../ordinary/helper"',
        "export const leaked = captureInstanceExecution",
        "export const leakedObject = { captureInstanceExecution }",
        "export const leakedArrow = () => captureInstanceExecution",
        "export function leakedFunction() { return captureInstanceExecution }",
      ].join("\n"),
    },
  })
  await using _ordinary = ordinary.tmp
  expect((await run(["--check"], ordinary.env)).stderr).not.toContain("raw lifecycle helper")
})

test("for-of aliases preserve lifecycle authority provenance", async () => {
  const callback = await fixture({
    source: {
      "effect/callback.ts": [
        "declare const lease: GenerationLease",
        "for (const run of [lease.runSync]) run(async () => undefined)",
      ].join("\n"),
    },
  })
  await using _callback = callback.tmp
  expect((await run(["--check"], callback.env)).stderr).toContain(
    "runSync cannot accept async or PromiseLike callbacks",
  )

  const handoff = await fixture({
    source: {
      "project/forged.ts": [
        "export function setup(forged: GenerationLease) {",
        "  let handoff = acquireChildGenerationLease(context)",
        "  for (handoff of [forged]) {}",
        "  try {",
        "    const child = handoff.runSync(() =>",
        "      registerTransferredGenerationProducer({ handoffFrom: handoff, label, run })",
        "    )",
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
  await using _handoff = handoff.tmp
  expect((await run(["--check"], handoff.env)).stderr).toContain(
    "transferred producer requires an acquired generation handoff lease",
  )
})

test("transferred handoff aliases require one possible acquired definition", async () => {
  for (const [name, overwrite] of [
    ["declaration", "var handoff = forged"],
    ["assignment", "handoff = forged"],
  ] as const) {
    const input = await fixture({
      source: {
        "project/forged.ts": [
          "export function setup(forged: GenerationLease) {",
          "  var handoff = acquireChildGenerationLease(context)",
          `  ${overwrite}`,
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
    expect((await run(["--check"], input.env)).stderr, name).toContain(
      "transferred producer requires an acquired generation handoff lease",
    )
  }
})

test("destructured and bound runSync aliases cannot accept PromiseLike callbacks", async () => {
  for (const [name, alias] of [
    ["destructured", "const { runSync: run } = lease"],
    ["bound", "const run = lease.runSync.bind(lease)"],
  ] as const) {
    const input = await fixture({
      source: {
        "local-promise.d.ts": localPromiseDeclarations,
        "effect/callback.ts": ["declare const lease: GenerationLease", alias, "run(() => fetch(url))"].join("\n"),
      },
    })
    await using _ = input.tmp
    expect((await run(["--check"], input.env)).stderr, name).toContain(
      "runSync cannot accept async or PromiseLike callbacks",
    )
  }
})

test("raw helpers and private joins accept only their frozen symbol structure", async () => {
  const valid = await fixture({
    source: {
      "workflow/runtime.ts": "export function spawnIsolated() { return disposeDirectorySettled(info.directory) }\n",
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

  const extra = await fixture({
    source: {
      "effect/bootstrap-runtime.ts": [
        "export function bootstrap() {",
        "  const first = captureInstanceExecution()",
        "  const second = captureInstanceExecution()",
        "  return makeOpaqueBootstrapHandle(first, second)",
        "}",
      ].join("\n"),
    },
  })
  await using _extra = extra.tmp
  expect((await run(["--check"], extra.env)).stderr).toContain("raw lifecycle helper call is not exact-allowlisted")

  const aliases = await fixture({
    source: {
      "workflow/runtime.ts": [
        "const join = disposeDirectorySettled",
        "export function spawnIsolated() { return join(info.directory) }",
      ].join("\n"),
      "effect/bootstrap-runtime.ts": [
        "const capture = captureInstanceExecution",
        "export function bootstrap() {",
        "  const execution = capture()",
        "  return makeOpaqueBootstrapHandle(execution)",
        "}",
      ].join("\n"),
    },
  })
  await using _aliases = aliases.tmp
  const aliasResult = await run(["--check"], aliases.env)
  expect(aliasResult.stderr).toContain("raw lifecycle helper call is not exact-allowlisted")
  expect(aliasResult.stderr).toContain("private lifecycle join call is not exact-allowlisted")

  const duplicateJoin = await fixture({
    source: {
      "workflow/runtime.ts": [
        "export function spawnIsolated() {",
        "  disposeDirectorySettled(info.directory)",
        "  return disposeDirectorySettled(info.directory)",
        "}",
      ].join("\n"),
    },
  })
  await using _duplicateJoin = duplicateJoin.tmp
  expect((await run(["--check"], duplicateJoin.env)).stderr).toContain(
    "private lifecycle join call is not exact-allowlisted",
  )

})

test("raw helper call and apply forms cannot bypass exact contracts", async () => {
  for (const [name, invocation] of [
    ["call", "captureInstanceExecution.call(undefined)"],
    ["apply", "captureInstanceExecution.apply(undefined, [])"],
    ["alias call", "capture.call(undefined)"],
  ] as const) {
    const input = await fixture({
      source: {
        "effect/bootstrap-runtime.ts": [
          ...(name === "alias call" ? ["const capture = captureInstanceExecution"] : []),
          "export function bootstrap() {",
          `  const execution = ${invocation}`,
          "  return makeOpaqueBootstrapHandle(execution)",
          "}",
        ].join("\n"),
      },
    })
    await using _ = input.tmp
    expect((await run(["--check"], input.env)).stderr, name).toContain(
      "raw lifecycle helper call is not exact-allowlisted",
    )
  }

  const unauthorized = await fixture({
    source: {
      "effect/callback.ts": [
        "export function direct() { return captureInstanceExecution.call(undefined) }",
        "export function applied() { return captureInstanceExecution.apply(undefined, []) }",
      ].join("\n"),
    },
  })
  await using _unauthorized = unauthorized.tmp
  expect((await run(["--check"], unauthorized.env)).stderr).toContain(
    "raw lifecycle helper is not allowlisted: src/effect/callback.ts",
  )

  const ordinary = await fixture({
    source: {
      "effect/callback.ts": [
        "function captureInstanceExecution() { return ordinary }",
        "export const called = captureInstanceExecution.call(undefined)",
        "export const applied = captureInstanceExecution.apply(undefined, [])",
      ].join("\n"),
    },
  })
  await using _ordinary = ordinary.tmp
  expect((await run(["--check"], ordinary.env)).stderr).not.toContain("raw lifecycle helper")
})

test("equivalent private joins obey exact fingerprints and cardinality", async () => {
  for (const [name, exactCall, forgedCall] of [
    [
      "call",
      "disposeDirectorySettled.call(undefined, info.directory)",
      "disposeDirectorySettled.call(undefined, forged.directory)",
    ],
    [
      "apply",
      "disposeDirectorySettled.apply(undefined, [info.directory])",
      "disposeDirectorySettled.apply(undefined, [forged.directory])",
    ],
  ] as const) {
    const equivalent = await fixture({
      source: { "workflow/runtime.ts": `export function spawnIsolated() { return ${exactCall} }\n` },
    })
    await using _equivalent = equivalent.tmp
    expect(await run(["--check"], equivalent.env), name).toEqual({ exitCode: 0, stdout: "", stderr: "" })

    const forgedEquivalent = await fixture({
      source: { "workflow/runtime.ts": `export function spawnIsolated() { return ${forgedCall} }\n` },
    })
    await using _forgedEquivalent = forgedEquivalent.tmp
    expect((await run(["--check"], forgedEquivalent.env)).stderr, name).toContain(
      "private lifecycle join call is not exact-allowlisted",
    )
  }

  const duplicate = await fixture({
    source: {
      "workflow/runtime.ts": [
        "export function spawnIsolated() {",
        "  disposeDirectorySettled(info.directory)",
        "  return disposeDirectorySettled.call(undefined, info.directory)",
        "}",
      ].join("\n"),
    },
  })
  await using _duplicate = duplicate.tmp
  expect((await run(["--check"], duplicate.env)).stderr).toContain(
    "private lifecycle join call is not exact-allowlisted",
  )
})

test("resolved aliases and typed string disposer arguments cannot bypass frozen gates", async () => {
  const provider = await fixture({
    source: {
      "actor/spawn.ts": [
        "const Ref = InstanceRef",
        "export function unexpected() { return Effect.provideService(Ref, context) }",
      ].join("\n"),
    },
  })
  await using _provider = provider.tmp
  expect((await run(["--check", "--allow-task2-legacy-instance-ref-providers"], provider.env)).stderr).toContain(
    "unauthorized raw InstanceRef provider: src/actor/spawn.ts:unexpected",
  )

  const facade = await fixture({
    source: {
      "config/config.ts": [
        "const dispose = Instance.disposeAll",
        "export function unexpected() { return dispose() }",
      ].join("\n"),
    },
  })
  await using _facade = facade.tmp
  expect((await run(["--check", "--allow-legacy-instance-settled-facades"], facade.env)).stderr).toContain(
    "unauthorized legacy settled facade caller: src/config/config.ts:unexpected",
  )

  const disposer = await fixture({
    source: {
      "project/instance.ts": [
        "function directoryFor(): string { return '/tmp/forged' }",
        "export function unexpected() { disposeInstance(directoryFor()) }",
      ].join("\n"),
    },
  })
  await using _disposer = disposer.tmp
  expect((await run(["--check-disposer-targets", "--allow-task1-adapter"], disposer.env)).stderr).toContain(
    "unauthorized disposeInstance target: src/project/instance.ts:unexpected",
  )

  const importedProvider = await fixture({
    source: {
      "effect/instance-ref.ts": "export const InstanceRef = {}\n",
      "actor/spawn.ts": [
        'import { InstanceRef as Ref } from "../effect/instance-ref"',
        "export function unexpected() { return Effect.provideService(Ref, context) }",
      ].join("\n"),
    },
  })
  await using _importedProvider = importedProvider.tmp
  expect((await run(["--check", "--allow-task2-legacy-instance-ref-providers"], importedProvider.env)).stderr).toContain(
    "unauthorized raw InstanceRef provider: src/actor/spawn.ts:unexpected",
  )

  const importedFacade = await fixture({
    source: {
      "project/instance.ts": "export const Instance = { disposeAll() {} }\n",
      "config/config.ts": [
        'import { Instance as RuntimeInstance } from "../project/instance"',
        "const dispose = RuntimeInstance.disposeAll",
        "export function unexpected() { return dispose() }",
      ].join("\n"),
    },
  })
  await using _importedFacade = importedFacade.tmp
  expect((await run(["--check", "--allow-legacy-instance-settled-facades"], importedFacade.env)).stderr).toContain(
    "unauthorized legacy settled facade caller: src/config/config.ts:unexpected",
  )

  const importedDisposer = await fixture({
    source: {
      "effect/instance-registry.ts": "export function disposeInstance(_target: unknown) {}\n",
      "project/instance.ts": [
        'import { disposeInstance as dispose } from "../effect/instance-registry"',
        "function directoryFor(): string { return '/tmp/forged' }",
        "export function unexpected() { dispose(directoryFor()) }",
      ].join("\n"),
    },
  })
  await using _importedDisposer = importedDisposer.tmp
  expect((await run(["--check-disposer-targets", "--allow-task1-adapter"], importedDisposer.env)).stderr).toContain(
    "unauthorized disposeInstance target: src/project/instance.ts:unexpected",
  )
})

test("every StringLike disposer expression is rejected by its resolved type", async () => {
  const input = await fixture({
    source: {
      "project/property-target.ts": [
        "declare const options: { path: string }",
        "export function propertyTarget() { disposeInstance(options.path) }",
      ].join("\n"),
      "project/index-target.ts": [
        "declare const options: { [key: string]: string }",
        'export function indexTarget() { disposeInstance(options["path"]) }',
      ].join("\n"),
      "project/alias-target.ts": [
        "declare const options: { path: string }",
        "export function aliasTarget() { const target = options.path; disposeInstance(target) }",
      ].join("\n"),
      "project/union-target.ts": [
        "interface GenerationHandle { close(): void }",
        "declare const target: GenerationHandle | string",
        "export function unionTarget() { disposeInstance(target) }",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const result = await run(["--check-disposer-targets", "--allow-task1-adapter"], input.env)
  for (const [file, symbol] of [
    ["property-target.ts", "propertyTarget"],
    ["index-target.ts", "indexTarget"],
    ["alias-target.ts", "aliasTarget"],
    ["union-target.ts", "unionTarget"],
  ]) {
    expect(result.stderr).toContain(`unauthorized disposeInstance target: src/project/${file}:${symbol}`)
  }
})

test("StringLike base constraints cannot bypass disposer target gates", async () => {
  const input = await fixture({
    source: {
      "project/generic-target.ts":
        "export function genericTarget<T extends string>(target: T) { disposeInstance(target) }\n",
      "project/base-constraint-target.ts": [
        "type PathTarget = string",
        "export function baseConstraintTarget<T extends PathTarget>(target: T) { disposeInstance(target) }",
      ].join("\n"),
    },
  })
  await using _ = input.tmp
  const result = await run(["--check-disposer-targets", "--allow-task1-adapter"], input.env)
  for (const [file, symbol] of [
    ["generic-target.ts", "genericTarget"],
    ["base-constraint-target.ts", "baseConstraintTarget"],
  ]) {
    expect(result.stderr).toContain(`unauthorized disposeInstance target: src/project/${file}:${symbol}`)
  }
})

test("frozen producer consumers reject swapped handoff and parent relations", async () => {
  const tmp = await tmpdir()
  await using _ = tmp
  const original = await Bun.file(path.resolve(packageRoot, "../../docs/compose/spec/instance-generation-producer-inventory.md")).text()
  const handoffs = original
    .replaceAll("planned:src/bus/index.ts:on.subscription-channel-handoff", "planned:swap:bus")
    .replaceAll("planned:src/file/watcher.ts:FileWatcher.state.channel-handoff", "planned:src/bus/index.ts:on.subscription-channel-handoff")
    .replaceAll("planned:swap:bus", "planned:src/file/watcher.ts:FileWatcher.state.channel-handoff")
  const handoffInventory = path.join(tmp.path, "handoff.md")
  await Bun.write(handoffInventory, handoffs)
  const parents = original
    .replaceAll(
      "ownerID=actor.parent-notify; parent=planned:src/actor/spawn.ts:notify.parent-target-lease",
      "ownerID=swap.actor.parent; parent=planned:swap.actor.parent",
    )
    .replaceAll(
      "ownerID=actor.parent-terminal-notify; parent=planned:src/actor/spawn.ts:notifyTerminal.parent-target-lease",
      "ownerID=actor.parent-notify; parent=planned:src/actor/spawn.ts:notify.parent-target-lease",
    )
    .replaceAll(
      "ownerID=swap.actor.parent; parent=planned:swap.actor.parent",
      "ownerID=actor.parent-terminal-notify; parent=planned:src/actor/spawn.ts:notifyTerminal.parent-target-lease",
    )
  const parentInventory = path.join(tmp.path, "parent.md")
  await Bun.write(parentInventory, parents)
  const results = await Promise.all(
    [handoffInventory, parentInventory].map((inventory) =>
      run(["--check", "--allow-legacy-instance-settled-facades", "--allow-task2-legacy-instance-ref-providers"], {
        MIMOCODE_INSTANCE_GENERATION_INVENTORY: inventory,
      }),
    ),
  )
  for (const result of results) expect(result.stderr).toContain("frozen producer consumer relation changed")
}, 30_000)

test("body wrappers and workflow cleanup stay bound to their implementing APIs and tasks", async () => {
  const tmp = await tmpdir()
  await using _ = tmp
  const original = await Bun.file(path.resolve(packageRoot, "../../docs/compose/spec/instance-generation-producer-inventory.md")).text()
  const body = original.replaceAll(
    "replacement=registerGenerationBody | body | transferred",
    "replacement=registerTransferredGenerationBody | body | transferred",
  )
  const workflow = original.replace(
    "| Task 7 | planned=test/workflow/runtime-worktree.test.ts:target-local workflow |",
    "| Task 9 | planned=test/workflow/runtime.test.ts:workflow shutdown |",
  )
  const bodyInventory = path.join(tmp.path, "body.md")
  const workflowInventory = path.join(tmp.path, "workflow.md")
  await Promise.all([Bun.write(bodyInventory, body), Bun.write(workflowInventory, workflow)])
  const [bodyResult, workflowResult] = await Promise.all([
    run(["--check", "--allow-legacy-instance-settled-facades", "--allow-task2-legacy-instance-ref-providers"], {
      MIMOCODE_INSTANCE_GENERATION_INVENTORY: bodyInventory,
    }),
    run(["--check", "--allow-legacy-instance-settled-facades", "--allow-task2-legacy-instance-ref-providers"], {
      MIMOCODE_INSTANCE_GENERATION_INVENTORY: workflowInventory,
    }),
  ])
  expect(bodyResult.stderr).toContain("transferred owner replacement wrapper does not match")
  expect(workflowResult.stderr).toContain("planned deterministic test path is not frozen")
}, 30_000)
