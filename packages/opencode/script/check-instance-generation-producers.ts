import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import ts from "typescript"

const canonicalPrinter = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true })

const packageRoot = path.resolve(import.meta.dir, "..")
const defaultSourceRoot = path.join(packageRoot, "src")
const defaultTestRoot = path.join(packageRoot, "test")
const defaultInventory = path.resolve(packageRoot, "../../docs/compose/spec/instance-generation-producer-inventory.md")
const projectCompilerOptions = (() => {
  const configPath = path.join(packageRoot, "tsconfig.json")
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"))
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, packageRoot, undefined, configPath)
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"))
  }
  return parsed.options
})()

const modes = ["--check", "--check-disposer-targets"] as const
const flags = [
  "--allow-task1-adapter",
  "--allow-legacy-instance-settled-facades",
  "--allow-task2-legacy-instance-ref-providers",
] as const

type Mode = (typeof modes)[number]
type Flag = (typeof flags)[number]
type CandidateKind =
  | "admission-ref-provider"
  | "async-iterator"
  | "detached-promise"
  | "dispose-target"
  | "effect-fork"
  | "effect-run-fork"
  | "global-event-publisher"
  | "instance-bind"
  | "instance-ref-provider"
  | "legacy-settled-facade"
  | "microtask"
  | "naked-void"
  | "native-callback"
  | "native-process"
  | "readable-body"
  | "sse-body"
  | "stream-continuation"
  | "timer-interval"
  | "timer-immediate"
  | "timer-timeout"
  | "transform-body"
  | "tui-long-poll"
  | "websocket-client"
  | "websocket-upgrade"
  | "writable-body"

type ParsedSource = {
  file: string
  relative: string
  text: string
  source: ts.SourceFile
  checker: ts.TypeChecker
}

type ParsedSourceRoots = Record<"src" | "test", string>
type ParsedSourceContext = {
  roots: ParsedSourceRoots
  cache: Map<string, ParsedSource[]>
}

const parsedSourceCache = new Map<string, ParsedSource[]>()
const defaultParsedSourceContext = {
  roots: { src: defaultSourceRoot, test: defaultTestRoot },
  cache: parsedSourceCache,
}
const defaultAnalysisBuildCounts = {
  production: 0,
  inventory: 0,
}

export function inspectDefaultAnalysisBuildCountsForTest() {
  return { ...defaultAnalysisBuildCounts }
}

type Candidate = {
  file: string
  symbol: string
  kind: CandidateKind
  form: "call" | "declaration" | "reference"
  line: number
  start: number
  end: number
  signature: string
  ownerKey: string
  ownerRole: string
  ownerSignature: string
  boundary: string
  candidateRole: string
}

type Summary = {
  anchor: string
  file: string
  symbol: string
  signals: string
  fingerprint: string
  candidates: Candidate[]
}

type ProductionAnalysis = {
  sources: ParsedSource[]
  rawSummaries: Summary[]
  summaries: Summary[]
}

type InventoryAnalysis = {
  tests: ParsedSource[]
  testFacades: Candidate[]
  authorityErrorMessages: string[]
}

const defaultProductionAnalysisCache: { value?: ProductionAnalysis } = {}
const defaultInventoryAnalysisCache: { value?: InventoryAnalysis } = {}

type InventoryRow = {
  anchor: string
  file: string
  symbol: string
  signals: string
  fingerprint: string
  cells: string[]
  line: number
}

const ownerKinds = new Set([
  "boot",
  "lease",
  "body",
  "runner",
  "producer",
  "channel",
  "state_scope",
  "retirement",
  "disposer",
  "maintenance",
  "process_exempt",
])
const ownershipModes = new Set(["nested", "transferred", "directory-root"])
const transferredAuthorityWrappers = new Map([
  ["body", new Set(["registerGenerationBody"])],
  ["channel", new Set(["registerTransferredGenerationChannel"])],
  ["producer", new Set(["registerTransferredGenerationProducer", "registerRemoteRelayProducer"])],
])
const placeholders = /\b(?:TBD|TODO|audit later|INCOMPLETE)\b/i

const generationProducerSurfaces = [
  "src/actor/",
  "src/bus/",
  "src/config/",
  "src/control-plane/",
  "src/cron/",
  "src/effect/",
  "src/history/",
  "src/inbox/",
  "src/memory/",
  "src/lsp/client.ts",
  "src/lsp/lsp.ts",
  "src/mcp/index.ts",
  "src/mcp/sampling.ts",
  "src/plugin/",
  "src/project/",
  "src/provider/provider.ts",
  "src/pty/",
  "src/server/",
  "src/session/",
  "src/sync/",
  "src/workflow/",
  "src/worktree/",
  "src/file/watcher.ts",
  "src/tool/actor.ts",
  "src/tool/session.ts",
  "src/tool/workflow.ts",
  "src/cli/bootstrap.ts",
  "src/cli/cmd/acp.ts",
  "src/cli/cmd/serve.ts",
  "src/cli/cmd/web.ts",
  "src/cli/cmd/tui/context/",
  "src/cli/cmd/tui/thread.ts",
  "src/cli/cmd/tui/worker.ts",
  "src/cli/cmd/tui/component/dialog-workspace-create.tsx",
  "src/cli/cmd/tui/component/dialog-session-list.tsx",
] as const

function isGenerationProducerSurface(file: string) {
  return generationProducerSurfaces.some((surface) =>
    surface.endsWith("/") ? file.startsWith(surface) : file === surface,
  )
}

const task1DisposerTargets = new Map([
  ["src/effect/instance-registry.ts:disposeInstance#dispose-target-functiondeclaration-b82b835a7f", "edd26719bb03a704"],
  ["src/project/instance.ts:disposeCached#dispose-target-provide-52611b0295", "ec74b3cb5837504d"],
  ["src/project/instance.ts:reload#dispose-target-disposeInstance-5f042f73be", "c3f5dba4a71c77b3"],
  ["src/project/instance.ts:dispose#dispose-target-disposeInstance-6a5e8a6a06", "287fc750acc431c4"],
])

const legacyFacadeProduction = new Map([
  ["src/project/instance.ts:disposeDirectory#legacy-settled-facade-methoddeclaration-f0ed09ff3c", "6cf535033717e9e7"],
  ["src/project/instance.ts:disposeAll#legacy-settled-facade-methoddeclaration-ed06010d4b", "9583dc2c43f7d042"],
  ["src/config/config.ts:Config.invalidate.task#legacy-settled-facade-task-8a291143d4", "6ca88ffac0340732"],
  ["src/server/routes/global.ts:GlobalRoutes.post_dispose#legacy-settled-facade-disposeAll-e005c27335", "417ef20eba2e80d4"],
  ["src/cli/cmd/tui/worker.ts:shutdown#legacy-settled-facade-disposeAll-60a523d355", "f42786ae9d63e44f"],
  ["src/worktree/index.ts:Worktree.remove#legacy-settled-facade-expressionstatement-fcb95181c7", "b8da15ead9b3a4df"],
  ["src/workflow/runtime.ts:spawnIsolated#legacy-settled-facade-disposeDirectory-43e7432475", "bbd7c49b8b4e2ff7"],
])

const task2InstanceRefProviders = new Map([
  ["src/actor/spawn.ts:notify#instance-ref-provider-expressionstatement-0c1396d50f", "8a43d3f5f208209a"],
  ["src/actor/spawn.ts:forkWork.boundWork#instance-ref-provider-boundWork-91987c3ae1", "8cca6fff32fb4394"],
  ["src/actor/spawn.ts:notifyTerminal#instance-ref-provider-expressionstatement-77472bca03", "06481de34c955775"],
  ["src/actor/spawn.ts:layer#instance-ref-provider-expressionstatement-0dd4508a1c", "db9aae0eae5ca6a2"],
  ["src/effect/run-service.ts:attachWith#instance-ref-provider-return-ac284861a8", "3aaa957ff10ba494"],
  ["src/effect/run-service.ts:attachWith#instance-ref-provider-return-18c80d984d", "11ef11f6a2170465"],
  ["src/inbox/inbox.ts:Inbox.send.bridge#instance-ref-provider-bridge-07829a1a13", "01f52b1beee8d5ef"],
  ["src/server/routes/instance/httpapi/server.ts:instance#instance-ref-provider-return-e68bfde34a", "cc361e3e28e3b573"],
  ["src/tool/session.ts:SessionTool.execute.wtDir#instance-ref-provider-wtDir-8368a1cdb2", "5f78f2a4f3d400f8"],
  ["src/tool/session.ts:SessionTool.execute.remExit#instance-ref-provider-remExit-eb0cfe5ff3", "66e346374a79d734"],
  ["src/workflow/runtime.ts:spawnIsolated.wtBridge#instance-ref-provider-wtBridge-5d6e008362", "091cd59b0daf7283"],
])

const frozenProducerConsumerRelations = new Map([
  ["src/actor/registry.ts:layer#effect-fork-expressionstatement-015bebb1f3", "eca455d563d0acb7"],
  ["src/actor/spawn.ts:notify#instance-ref-provider-expressionstatement-0c1396d50f", "d2b1de4fe80dc2e9"],
  ["src/actor/spawn.ts:forkWork.boundWork#instance-ref-provider-boundWork-91987c3ae1", "b29a3b5c5cf9eb76"],
  ["src/actor/spawn.ts:forkWork.fiber#effect-fork-fiber-72362dbd72", "205a0b5926c2e518"],
  ["src/actor/spawn.ts:notifyTerminal#instance-ref-provider-expressionstatement-77472bca03", "1b9165cf8f9f44b5"],
  ["src/actor/spawn.ts:layer#instance-ref-provider-expressionstatement-0dd4508a1c", "226787555b359b35"],
  ["src/actor/spawn.ts:layer#effect-fork-expressionstatement-e9131ea116", "8dadb65f955fad76"],
  ["src/bus/index.ts:on.subscription#native-callback-subscription-9adb6135c1", "6410163a898de9b3"],
  ["src/bus/index.ts:on#effect-fork-expressionstatement-249ad7320b", "5cbf2a38870086e1"],
  ["src/bus/index.ts:on#effect-fork-fork-1898f6edbf", "5cbf2a38870086e1"],
  ["src/bus/index.ts:subscribe#native-callback-return-0fd4a0a017", "5cbf2a38870086e1"],
  ["src/config/config.ts:Config.loadInstanceState.dep#effect-fork-dep-7c7406f0b7", "685c4952b08d1911"],
  ["src/config/config.ts:Config.invalidate.task#legacy-settled-facade-task-8a291143d4", "0aa5e6e3bfe97cf8"],
  ["src/config/config.ts:Config.invalidate.task#global-event-publisher-task-5d53733bdc", "0aa5e6e3bfe97cf8"],
  ["src/config/config.ts:Config.invalidate#naked-void-expressionstatement-9de8ef398e", "03251ecb55a06334"],
  ["src/control-plane/sse.ts:parseSSE.reader#stream-continuation-reader-712d7f2d65", "50dcf5e3a4be9820"],
  ["src/control-plane/sse.ts:abort#naked-void-catch-f99b8d0fb4", "50dcf5e3a4be9820"],
  ["src/control-plane/sse.ts:parseSSE#native-callback-addEventListener-c40848e419", "50dcf5e3a4be9820"],
  ["src/control-plane/util.ts:waitEvent.timeout#timer-timeout-timeout-7339f9de0b", "8b936764f006f8be"],
  ["src/control-plane/util.ts:waitEvent#native-callback-on-a19a305026", "8b936764f006f8be"],
  ["src/control-plane/util.ts:waitEvent#native-callback-addEventListener-17047fab75", "8b936764f006f8be"],
  ["src/control-plane/workspace.ts:sessionRestore#global-event-publisher-emit-f570feb277", "50dcf5e3a4be9820"],
  ["src/control-plane/workspace.ts:sessionRestore#global-event-publisher-emit-825ffab3ee", "50dcf5e3a4be9820"],
  ["src/control-plane/workspace.ts:setStatus#global-event-publisher-emit-5e022324a1", "50dcf5e3a4be9820"],
  ["src/control-plane/workspace.ts:syncWorkspaceLoop#global-event-publisher-emit-6aa087d931", "50dcf5e3a4be9820"],
  ["src/control-plane/workspace.ts:startSync#naked-void-then-19828efd14", "50dcf5e3a4be9820"],
  ["src/control-plane/workspace.ts:startSync#naked-void-catch-319d15c208", "50dcf5e3a4be9820"],
  ["src/control-plane/workspace.ts:startWorkspaceSyncing#naked-void-startSync-ef678fa9a4", "d25f8f981cba71b5"],
  ["src/cron/scheduler.ts:runTick#detached-promise-catch-a301fcd8ec", "0f186c2fa243f4c6"],
  ["src/cron/scheduler.ts:start#timer-interval-expressionstatement-7a683d4167", "0f186c2fa243f4c6"],
  ["src/effect/cross-spawn-spawner.ts:onError#native-callback-expressionstatement-8dcf6f655f", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:make.setupFds#effect-fork-expressionstatement-321b04e5a8", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:make.setupFds#native-callback-on-af909c1872", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:onError#native-callback-expressionstatement-7db88db1a6", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:onError#native-callback-expressionstatement-9d0bab237b", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:setupStdin#effect-fork-return-18be294933", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:onError#native-callback-stdout-fa90d9ed0c", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:onError#native-callback-stderr-1cf76f42d3", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:spawn#native-callback-on-72dc98f1c6", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:spawn#native-callback-on-c9f301f971", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:spawn#native-callback-on-1a2ef9ae04", "47f8c620a29989b4"],
  ["src/effect/cross-spawn-spawner.ts:spawn#native-callback-on-0993bcbc2e", "47f8c620a29989b4"],
  ["src/effect/hard-timeout.ts:awaitWithHardTimeout.fiber#effect-fork-fiber-3d0e3a6112", "f99073b69380e1f6"],
  ["src/file/index.ts:File.init#effect-fork-expressionstatement-84545f1cb3", "f94fb7d1d7a2ac50"],
  ["src/file/ripgrep.ts:files#effect-fork-expressionstatement-3aa3277eae", "62f75fbd7c118cfe"],
  ["src/file/ripgrep.ts:files.stderr#effect-fork-stderr-fb47f21849", "62f75fbd7c118cfe"],
  ["src/file/ripgrep.ts:files.stdout#effect-fork-stdout-0b721f882b", "62f75fbd7c118cfe"],
  ["src/file/watcher.ts:FileWatcher.state.cb#instance-bind-cb-29693a8651", "354349824b968c32"],
  ["src/file/watcher.ts:subscribe.pending#native-callback-pending-8f439884c1", "7e6a0b6be1937d5a"],
  ["src/file/watcher.ts:subscribe#detached-promise-catch-462dc4d3d3", "7e6a0b6be1937d5a"],
  ["src/history/backfill.ts:History.Backfill.init#effect-fork-expressionstatement-a46b619cda", "3a9bf1c69acfa3f3"],
  ["src/history/writer.ts:History.Writer.state#effect-fork-expressionstatement-a3e27f2360", "6ea029da067c94e1"],
  ["src/inbox/inbox.ts:Inbox.send.bridge#instance-ref-provider-bridge-07829a1a13", "66dd5d66326046fd"],
  ["src/inbox/inbox.ts:Inbox.send#effect-fork-expressionstatement-241ecb89fb", "a0540f5ad225e0da"],
  ["src/inbox/inbox.ts:Inbox.send#effect-fork-expressionstatement-866cd9a18d", "a0540f5ad225e0da"],
  ["src/lsp/client.ts:create#native-callback-onNotification-39adcaeef4", "34664d0542a1e34b"],
  ["src/lsp/client.ts:create#native-callback-onRequest-aee6898cb0", "81b951628b01371a"],
  ["src/lsp/client.ts:create#native-callback-onRequest-b7157e539a", "81b951628b01371a"],
  ["src/lsp/client.ts:create#native-callback-onRequest-6fb95ebfed", "81b951628b01371a"],
  ["src/lsp/client.ts:create#native-callback-onRequest-602616340a", "81b951628b01371a"],
  ["src/lsp/client.ts:create#native-callback-onRequest-76984b6045", "81b951628b01371a"],
  ["src/lsp/client.ts:waitForDiagnostics#timer-timeout-expressionstatement-38e7fa7908", "531b98ee4cedee28"],
  ["src/lsp/lsp.ts:layer.getClients#detached-promise-finally-84a8b203f0", "cceeeb34000ed329"],
  ["src/mcp/index.ts:startTurnLifecycleNotification#naked-void-then-ec9254654b", "ac3f8e38f76712de"],
  ["src/mcp/index.ts:try#native-callback-addEventListener-7e8ecd9ae4", "b6bc1da403a58c6e"],
  ["src/mcp/index.ts:MCP.connectLocal#native-callback-on-ef3490cebc", "262d54c0f5a8fdf3"],
  ["src/mcp/index.ts:watch#native-callback-setNotificationHandler-d09f7bc44c", "1c636534fe9fdf37"],
  ["src/mcp/index.ts:MCP.authenticate.timer#timer-timeout-timer-f32a6263b8", "3fa57ea07b889432"],
  ["src/mcp/index.ts:MCP.authenticate#native-callback-on-884ee2b240", "3fa57ea07b889432"],
  ["src/mcp/index.ts:MCP.authenticate#native-callback-on-81b4a8093f", "3fa57ea07b889432"],
  ["src/mcp/sampling.ts:onError#native-callback-stream-3b77d2b99f", "ec119204a21edd2c"],
  ["src/mcp/sampling.ts:try#async-iterator-forofstatement-dd2b65698a", "ec119204a21edd2c"],
  ["src/mcp/sampling.ts:serve#native-callback-setRequestHandler-a203d903a9", "66ac29ac1bb40a22"],
  ["src/plugin/codex.ts:startOAuthServer#detached-promise-catch-8d1e6b295a", "20e75ebded6603ba"],
  ["src/plugin/codex.ts:startOAuthServer#native-callback-on-a5896fc140", "5a3f194df480c241"],
  ["src/plugin/codex.ts:waitForOAuthCallback.timeout#timer-timeout-timeout-936a6407b2", "20e75ebded6603ba"],
  ["src/plugin/index.ts:publishPluginError#effect-fork-fork-f8a9806590", "9a519e3da060dd94"],
  ["src/plugin/index.ts:Plugin.state#effect-fork-expressionstatement-de31462f92", "6bb5768f4395f94d"],
  ["src/plugin/index.ts:Plugin.state#naked-void-event-782f4b84e7", "9a519e3da060dd94"],
  ["src/plugin/index.ts:try#detached-promise-catch-3764a1f3af", "d120da90ceda499b"],
  ["src/plugin/index.ts:Plugin.fileHooks#effect-fork-expressionstatement-88d2945d2c", "286b0544fa8a3cc0"],
  ["src/plugin/index.ts:Plugin.fileHooks#naked-void-catch-ca8beacfa5", "d120da90ceda499b"],
  ["src/plugin/index.ts:try#timer-timeout-race-1119c3c96c", "441dc9859ff38d4a"],
  ["src/plugin/mimo.ts:authorize#native-callback-on-3bcf3b5d5c", "bdf86c60dbe17380"],
  ["src/plugin/mimo.ts:MimoAuthPlugin.timeout#timer-timeout-timeout-ee1fcb318a", "204355f053f4dc5f"],
  ["src/plugin/mimo.ts:MimoAuthPlugin.serverCallbackPromise#native-callback-on-9731869816", "204355f053f4dc5f"],
  ["src/plugin/mimo.ts:authorize#detached-promise-catch-b4aed84031", "204355f053f4dc5f"],
  ["src/plugin/mimo.ts:fetch.reader#stream-continuation-reader-28880f9783", "204355f053f4dc5f"],
  ["src/plugin/mimo.ts:fetch.body#readable-body-body-b58bde8ce2", "204355f053f4dc5f"],
  ["src/plugin/xai.ts:defaultSleep#timer-timeout-expressionstatement-6f39b10892", "453750398082f5e6"],
  ["src/plugin/xai.ts:startOAuthServer.server#detached-promise-catch-d36690348f", "453750398082f5e6"],
  ["src/plugin/xai.ts:startOAuthServer#native-callback-once-2bbfb8b2ac", "3960cdc162c3a373"],
  ["src/plugin/xai.ts:waitForOAuthCallback.timeout#timer-timeout-timeout-936a6407b2", "453750398082f5e6"],
  ["src/project/instance.ts:disposeCached#global-event-publisher-emit-14f079bf3d", "1907b00d6d58973d"],
  ["src/project/instance.ts:reload#global-event-publisher-emit-ba3c72d878", "f17b8c989aba874a"],
  ["src/project/instance.ts:dispose#global-event-publisher-emit-c36b5ee5c8", "d67d1baba18c69fa"],
  ["src/project/project.ts:emitUpdated#global-event-publisher-emitUpdated-de9b7db25a", "cf345447b4bfc4a1"],
  ["src/project/project.ts:Project.fromDirectory#effect-fork-expressionstatement-d0d7f5f540", "a3e133caa394d1fb"],
  ["src/project/vcs.ts:Vcs.state#effect-fork-expressionstatement-da21d24ce4", "d57d3993840ea92b"],
  ["src/project/vcs.ts:Vcs.init#effect-fork-expressionstatement-f024daa36a", "3ad978737f8246ef"],
  ["src/provider/provider.ts:wrapSSE.reader#stream-continuation-reader-83f0924347", "7239b5b20e0bb1b7"],
  ["src/provider/provider.ts:wrapSSE.body#readable-body-body-31192cce4e", "7239b5b20e0bb1b7"],
  ["src/provider/provider.ts:timeoutController.id#timer-timeout-id-4372e83eae", "47e1b421bf6a4624"],
  ["src/provider/provider.ts:trackAbortSource.listeners#native-callback-addEventListener-f80c722c7d", "e9688bcd8549530a"],
  ["src/provider/provider.ts:wrapRequestTimeout.reader#stream-continuation-reader-98675be4aa", "8a9521dc4eee3a41"],
  ["src/provider/provider.ts:wrapRequestTimeout#readable-body-return-6a686053e4", "8a9521dc4eee3a41"],
  ["src/pty/index.ts:Pty.create#instance-bind-onData-44c2daf13c", "40334b921d5321dd"],
  ["src/pty/index.ts:Pty.create#instance-bind-onExit-c40a9b9901", "4387df1a9a1e47d1"],
  ["src/pty/index.ts:onMessage#native-callback-return-dacddfeb51", "4387df1a9a1e47d1"],
  ["src/pty/index.ts:onClose#native-callback-return-8ebdfdbceb", "4387df1a9a1e47d1"],
  ["src/pty/pty.bun.ts:onData#native-callback-methoddeclaration-610616a83a", "4387df1a9a1e47d1"],
  ["src/pty/pty.bun.ts:onExit#native-callback-methoddeclaration-a53eaa8b50", "4387df1a9a1e47d1"],
  ["src/pty/pty.node.ts:onData#native-callback-methoddeclaration-52df5d7a98", "4387df1a9a1e47d1"],
  ["src/pty/pty.node.ts:onExit#native-callback-methoddeclaration-754b5fc4d8", "4387df1a9a1e47d1"],
  ["src/server/adapter.node.ts:start#native-callback-once-6a359a2f1d", "6f20b0d3b70ab171"],
  ["src/server/adapter.node.ts:start#native-callback-once-7466106a21", "6f20b0d3b70ab171"],
  ["src/server/adapter.node.ts:stop#native-callback-close-c8647d89aa", "baaa20a6911284fb"],
  ["src/server/proxy.ts:app#websocket-upgrade-app-dabac3c046", "9ccf3dc5ef724785"],
  ["src/server/proxy.ts:http#readable-body-return-c333849276", "fac2b4cbf8153633"],
  ["src/server/routes/global.ts:streamEvents#sse-body-return-2c770ca200", "784a135c348bb243"],
  ["src/server/routes/global.ts:GlobalRoutes.get_event#native-callback-on-feb36597e3", "736901e5a43af31f"],
  ["src/server/routes/global.ts:GlobalRoutes.post_upgrade#global-event-publisher-emit-fa9ce18537", "bd20f67a8d6eb20f"],
  ["src/server/routes/instance/event.ts:EventRoutes.get_event#sse-body-return-d742c01420", "ae36d39aeb7f71d7"],
  ["src/server/routes/instance/pty.ts:PtyRoutes#websocket-upgrade-return-79830239ad", "d60665efba8e2a5c"],
  ["src/server/routes/instance/session.ts:SessionRoutes.post_sessionID_message#readable-body-return-653bd9237c", "f00596312f5316cc"],
  ["src/server/routes/instance/session.ts:SessionRoutes.post_sessionID_prompt_async#naked-void-catch-8ebb72d644", "30b4f48a412c0595"],
  ["src/session/checkpoint.ts:SessionCheckpoint.tryStartCheckpointWriter#effect-fork-expressionstatement-484a6f57a6", "7cee05e24af265c4"],
  ["src/session/cron-bridge.ts:start.unsubscribe#detached-promise-catch-8f0ff25a97", "0f186c2fa243f4c6"],
  ["src/session/cron-bridge.ts:onFire#detached-promise-catch-c980203175", "0f186c2fa243f4c6"],
  ["src/session/processor.ts:SessionProcessor.create.handleEvent#effect-fork-expressionstatement-b159b6757b", "a6febc06099a5826"],
  ["src/session/prompt.ts:cancel#effect-fork-return-510c4f1c57", "0aa9baa509afe937"],
  ["src/session/prompt.ts:SessionPrompt.shellImpl.exit#naked-void-fork-4ab185c336", "319ec9f92546e8f2"],
  ["src/session/prompt.ts:SessionPrompt.run#effect-fork-expressionstatement-a7a948c1a6", "ee4c522405a3adf1"],
  ["src/session/prompt.ts:SessionPrompt.run#detached-promise-catch-9edfca8886", "3b8f2b833f07323f"],
  ["src/session/prompt.ts:SessionPrompt.run#detached-promise-catch-0b682b0736", "965b27a8698f64a8"],
  ["src/session/prompt.ts:SessionPrompt.run#detached-promise-catch-c06fed76ea", "74986da2ef7d61a3"],
  ["src/session/prompt.ts:SessionPrompt.run.outcome#effect-fork-expressionstatement-ce5565d12e", "b0a32883900d4d5e"],
  ["src/session/prompt.ts:SessionPrompt.run#effect-fork-expressionstatement-72394b905d", "4501dd1b19523471"],
  ["src/session/prune.ts:SessionPrune.fireCheckpoints#effect-fork-expressionstatement-a9a9d900ba", "ba66656f07200796"],
  ["src/share/session.ts:SessionShare.create#effect-fork-expressionstatement-3496ffe539", "362448179eb201a6"],
  ["src/share/share-next.ts:sync#effect-fork-expressionstatement-8a266d47f0", "5ce2816385044a32"],
  ["src/share/share-next.ts:watch#effect-fork-watch-d5c35f98f8", "fdde9184ac328d71"],
  ["src/share/share-next.ts:ShareNext.create#effect-fork-expressionstatement-746247d3cf", "5ce2816385044a32"],
  ["src/skill/index.ts:layer.fiber#effect-fork-fiber-319745fe04", "7846dd4ff72a8ff4"],
  ["src/snapshot/index.ts:Snapshot.state#effect-fork-expressionstatement-b4b075f05d", "a2d647bdf9810389"],
  ["src/sync/index.ts:process#naked-void-then-cf03261542", "6b925e3aec6017a7"],
  ["src/sync/index.ts:process#naked-void-publish-552d6bb3bb", "6b925e3aec6017a7"],
  ["src/sync/index.ts:process#global-event-publisher-emit-2c9d8254d0", "6b925e3aec6017a7"],
  ["src/tool/read.ts:ReadTool.warm#effect-fork-expressionstatement-80d2a47de2", "25a958c00170d3bb"],
  ["src/tool/session.ts:SessionTool.execute.wtDir#instance-ref-provider-wtDir-8368a1cdb2", "e197e98dff9f2c38"],
  ["src/tool/session.ts:SessionTool.execute.remExit#instance-ref-provider-remExit-eb0cfe5ff3", "2fd9793b20fc74c0"],
  ["src/workflow/runtime.ts:attempt#detached-promise-then-14214eb77b", "d1d41f2b8f46d336"],
  ["src/workflow/runtime.ts:scheduleFlush#timer-timeout-set-b0b4859fdf", "d1d41f2b8f46d336"],
  ["src/workflow/runtime.ts:publishAgentFailed#effect-run-fork-runFork-0e51d0e461", "d1d41f2b8f46d336"],
  ["src/workflow/runtime.ts:spawnIsolated.wtBridge#instance-ref-provider-wtBridge-5d6e008362", "c0218cbf0f2cc1c4"],
  ["src/workflow/runtime.ts:agentImpl.result#timer-timeout-expressionstatement-137de411be", "d1d41f2b8f46d336"],
  ["src/workflow/runtime.ts:agentImpl#timer-timeout-expressionstatement-684a926831", "d1d41f2b8f46d336"],
  ["src/workflow/runtime.ts:phase#effect-run-fork-runFork-9ca2810870", "d1d41f2b8f46d336"],
  ["src/workflow/runtime.ts:phase#effect-run-fork-runFork-423d2058e6", "d1d41f2b8f46d336"],
  ["src/workflow/runtime.ts:phase#effect-run-fork-runFork-32f39a0904", "d1d41f2b8f46d336"],
  ["src/workflow/runtime.ts:logHook#effect-run-fork-runFork-c7dccdc06e", "d1d41f2b8f46d336"],
  ["src/workflow/runtime.ts:logHook#effect-run-fork-runFork-1a3e7fb27f", "d1d41f2b8f46d336"],
  ["src/workflow/runtime.ts:WorkflowRuntime.launch#effect-fork-expressionstatement-ef2290a98d", "f6c62e992648d233"],
  ["src/worktree/index.ts:layer.booted#global-event-publisher-emit-33b264a3e2", "bd604f85146744a1"],
  ["src/worktree/index.ts:layer.boot#global-event-publisher-emit-e2bcde59e7", "bd604f85146744a1"],
])

const processExemptions = new Map<string, string>()

const remoteRelayContract = [
  "<!-- REMOTE_RELAY_CONTRACT_BEGIN -->",
  "- canonical-key=`{workspaceID,sourceSlot,serverIncarnation}`",
  "- provenance=`the control-plane workspace sync handshake supplies authoritative workspaceID, sourceSlot, and serverIncarnation before registration`",
  "- cardinality=`exactly one owner and receipt per canonical triple; reconnects, parsers, and event callbacks are nested members`",
  "- APIs=`registerRemoteRelayProducer; registerRemoteRelayChannel; registerRemoteRelayBody`",
  "- close-settle=`remote disconnect or SharedShutdown first closes intake, then joins reconnect, callback, body, and transport receipts`",
  "- prohibition=`RemoteRelayOwner never mints or relabels a local Instance generation`",
  "- scope=`only the control-plane workspace reconnect and event loop uses RemoteRelayOwner; server/proxy transports stay on the outer InstanceMiddleware request generation`",
  "- replacement=`Task 6 adds the owner registry and adopts the control-plane workspace loop; Task 5 registers proxy body and channel receipts with generic same-target primitives`",
  "- tests=`test/server/workspace-instance-generation.test.ts:workspace generation; test/server/shutdown-streams.test.ts:shutdown streams`",
  "<!-- REMOTE_RELAY_CONTRACT_END -->",
].join("\n")

const rendererOnlyExclusions = new Map([
  ["src/cli/cmd/tui/config/tui.ts:layer.deps#effect-fork-deps-04915b6700", "a4c0ef287e9243e2"],
  ["src/cli/cmd/tui/context/keybind.tsx:init#timer-immediate-setImmediate-61a6cbde16", "2a7af13c7fc6121b"],
  ["src/cli/cmd/tui/context/keybind.tsx:leader#timer-timeout-expressionstatement-b85e47165e", "6f4a689686d70685"],
  ["src/cli/cmd/tui/context/kv.tsx:init#detached-promise-finally-ba88aa7c31", "fccc6e093a7e7078"],
  ["src/cli/cmd/tui/context/local.tsx:save#naked-void-writeJson-0f9cd62a7e", "43bfc70fedc2de92"],
  ["src/cli/cmd/tui/context/local.tsx:set#naked-void-catch-00c9a83dce", "2974df60378bbb3e"],
  ["src/cli/cmd/tui/context/local.tsx:set#naked-void-catch-a00468ad6c", "5a23c1864266c271"],
  ["src/cli/cmd/tui/context/local.tsx:set#naked-void-catch-fb530dfcce", "78104c40a6d84071"],
  ["src/cli/cmd/tui/context/local.tsx:useLocal+LocalProvider.model#detached-promise-finally-c38885df92", "2e7a2bd5d70bb897"],
  ["src/cli/cmd/tui/context/local.tsx:useLocal+LocalProvider.permissionAskTimeout#naked-void-then-d9cbdf9ab9", "f773b27e3b79ccbd"],
  ["src/cli/cmd/tui/context/theme.tsx:apply#naked-void-resolveSystemTheme-945f5ae7f3", "6dda15d6e999079d"],
  ["src/cli/cmd/tui/context/theme.tsx:init#naked-void-finally-eafe25b1ee", "de3ea7d5b95b71f8"],
  ["src/cli/cmd/tui/context/theme.tsx:init#native-callback-on-21f9caeb7e", "b09a1c8fee0f3ad5"],
  ["src/cli/cmd/tui/context/theme.tsx:init#native-callback-on-6137e39c24", "5f3b34d94ff1e63b"],
])

const plannedHandoffAnchors = new Map([
  [
    "planned:src/actor/spawn.ts:forkWork.target-local-handoff",
    {
      task: "Task 2",
      lease: "current-or-child-by-target-equality",
      target: "input.instanceRef ?? Instance.current",
    },
  ],
  [
    "planned:src/bus/index.ts:on.subscription-channel-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/config/config.ts:Config.loadInstanceState.dep#effect-fork-dep-7c7406f0b7.handoff",
    { task: "Task 5", lease: "current", target: "Config.state(ctx).generation" },
  ],
  [
    "planned:src/control-plane/workspace.ts:startWorkspaceSyncing.remote-relay-handoff",
    { task: "Task 6", lease: "child", target: "RemoteRelayOwner.fromProvenance(workspaceID,sourceSlot,serverIncarnation)" },
  ],
  [
    "planned:src/effect/hard-timeout.ts:workflow-reclaim-handoff",
    { task: "Task 5", lease: "current", target: "WorkflowRun.current" },
  ],
  [
    "planned:src/file/watcher.ts:FileWatcher.state.channel-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/history/backfill.ts:History.Backfill.init#effect-fork-expressionstatement-a46b619cda.handoff",
    { task: "Task 5", lease: "current", target: "InstanceBootstrap.capturedGeneration" },
  ],
  [
    "planned:src/inbox/inbox.ts:Inbox.send.target-local-handoff",
    { task: "Task 2", lease: "child", target: "Inbox target context" },
  ],
  [
    "planned:src/lsp/client.ts:create.client-channel-handoff",
    { task: "Task 5", lease: "current", target: "LSP.getClients ctx" },
  ],
  [
    "planned:src/lsp/lsp.ts:getClients.spawn-handoff",
    { task: "Task 5", lease: "current", target: "ctx" },
  ],
  [
    "planned:src/mcp/index.ts:connectLocal.client-channel-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/mcp/index.ts:startTurnLifecycleNotification.handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/mcp/index.ts:watch.client-channel-handoff",
    { task: "Task 5", lease: "current", target: "EffectBridge.capturedTarget" },
  ],
  [
    "planned:src/plugin/codex.ts:oauth-attempt-channel-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/plugin/index.ts:Plugin.fileHooks.channel-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/plugin/index.ts:Plugin.state.channel-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/plugin/mimo.ts:oauth-attempt-channel-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/plugin/xai.ts:oauth-attempt-channel-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/pty/index.ts:Pty.create.channel-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/server/proxy.ts:http.request-generation-handoff",
    { task: "Task 5", lease: "current", target: "InstanceMiddleware.requestLease.target" },
  ],
  [
    "planned:src/server/proxy.ts:websocket.request-generation-handoff",
    { task: "Task 5", lease: "current", target: "InstanceMiddleware.requestLease.target" },
  ],
  [
    "planned:src/server/routes/instance/event.ts:EventRoutes.get_event.sse-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/server/routes/instance/pty.ts:PtyRoutes.connection-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/server/routes/instance/session.ts:SessionRoutes.post_sessionID_message.body-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/server/routes/instance/session.ts:SessionRoutes.post_sessionID_prompt_async.producer-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/session/checkpoint.ts:checkpoint-producer-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/session/processor.ts:SessionProcessor.create.handleEvent#effect-fork-expressionstatement-b159b6757b.handoff",
    { task: "Task 5", lease: "current", target: "SessionProcessor.capturedGeneration" },
  ],
  [
    "planned:src/session/prompt.ts:cancel#effect-fork-return-510c4f1c57.handoff",
    { task: "Task 5", lease: "current", target: "EffectBridge.capturedTarget" },
  ],
  [
    "planned:src/session/prompt.ts:SessionPrompt.run.cron-channel-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/session/prompt.ts:SessionPrompt.run.outcome#effect-fork-expressionstatement-ce5565d12e.handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/session/prompt.ts:SessionPrompt.run.auto-memory-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/session/prompt.ts:SessionPrompt.run#effect-fork-expressionstatement-72394b905d.handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/session/prompt.ts:SessionPrompt.run#effect-fork-expressionstatement-a7a948c1a6.handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/share/session.ts:SessionShare.create#effect-fork-expressionstatement-3496ffe539.handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/tool/read.ts:ReadTool.warm.lsp-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
  [
    "planned:src/workflow/runtime.ts:WorkflowRuntime.launch.workflow-run-handoff",
    { task: "Task 5", lease: "current", target: "Instance.current" },
  ],
])

type PlannedHandoff = { task: string; lease: string; target: string }

type PlannedOwnerParent = { ownerID: string; task: string; target: string }

const plannedOwnerParentAnchors = new Map<string, PlannedOwnerParent>([
  [
    "planned:src/actor/spawn.ts:notify.parent-target-lease",
    { ownerID: "actor.parent-notify", task: "Task 2", target: "parentInstance" },
  ],
  [
    "planned:src/actor/spawn.ts:notifyTerminal.parent-target-lease",
    { ownerID: "actor.parent-terminal-notify", task: "Task 2", target: "parentInstance" },
  ],
  [
    "planned:src/actor/spawn.ts:layer.watchdog-process-owner",
    { ownerID: "actor.watchdog-provider-migration", task: "Task 2", target: "SharedShutdown.current" },
  ],
  [
    "planned:src/control-plane/util.ts:waitEvent.caller-lease",
    { ownerID: "workspace-wait.finite", task: "Task 6", target: "caller GenerationLease.target" },
  ],
  [
    "planned:src/effect/cross-spawn-spawner.ts:make.caller-scope",
    { ownerID: "cross-spawn.caller-scope", task: "Task 5", target: "CallerEffectScope.current" },
  ],
  [
    "planned:src/file/ripgrep.ts:files.caller-stream-scope",
    { ownerID: "ripgrep.caller-stream", task: "Task 5", target: "CallerEffectScope.current" },
  ],
  [
    "planned:src/lsp/client.ts:waitForDiagnostics.caller-lease",
    { ownerID: "lsp.wait-diagnostics", task: "Task 5", target: "Instance.current" },
  ],
  [
    "planned:src/mcp/index.ts:MCP.authenticate.browser-open-lease",
    { ownerID: "mcp.authenticate-browser-open", task: "Task 5", target: "Instance.current" },
  ],
  [
    "planned:src/plugin/index.ts:trigger.caller-lease",
    { ownerID: "plugin.trigger.finite", task: "Task 5", target: "Instance.current" },
  ],
  [
    "planned:src/project/project.ts:Project.fromDirectory.boot-receipt",
    { ownerID: "project.icon-boot", task: "Task 2", target: "BootTarget.fromDirectory(input.directory)" },
  ],
  [
    "planned:src/project/vcs.ts:Vcs.init.boot-receipt",
    { ownerID: "vcs.init-boot", task: "Task 2", target: "BootReceipt.currentTarget" },
  ],
  [
    "planned:src/provider/provider.ts:wrapSSE.active-response-owner",
    { ownerID: "provider.sse-body", task: "Task 5", target: "Instance.current" },
  ],
  [
    "planned:src/provider/provider.ts:timeoutController.active-provider-owner",
    { ownerID: "provider.timeout-controller", task: "Task 5", target: "Instance.current" },
  ],
  [
    "planned:src/provider/provider.ts:trackAbortSource.active-provider-owner",
    { ownerID: "provider.abort-source", task: "Task 5", target: "Instance.current" },
  ],
  [
    "planned:src/provider/provider.ts:wrapRequestTimeout.active-response-owner",
    { ownerID: "provider.request-timeout-body", task: "Task 5", target: "Instance.current" },
  ],
  [
    "planned:src/server/adapter.node.ts:start.startup-attempt",
    { ownerID: "node-listener.start", task: "Task 8", target: "SharedShutdown.startAttempt" },
  ],
  [
    "planned:src/server/routes/global.ts:GlobalRoutes.post_upgrade.request-owner",
    { ownerID: "global-upgrade.request-event", task: "Task 6", target: "ServerIncarnation.current" },
  ],
  [
    "planned:src/session/prompt.ts:SessionRunState.shell-owner",
    { ownerID: "session.shell-output", task: "Task 5", target: "SessionRunState.currentGeneration" },
  ],
  [
    "planned:src/sync/index.ts:SyncEvent.run.captured-execution",
    { ownerID: "sync.local-event", task: "Task 6", target: "Instance.current" },
  ],
  [
    "planned:src/tool/session.ts:SessionTool.execute.wtDir.target-lease",
    { ownerID: "tool-session.create-worktree", task: "Task 2", target: "ctxResult.value" },
  ],
  [
    "planned:src/tool/session.ts:SessionTool.execute.remExit.target-lease",
    { ownerID: "tool-session.remove-child-worktree", task: "Task 2", target: "ctxExit.value" },
  ],
  [
    "planned:src/workflow/runtime.ts:spawnIsolated.wtBridge.target-lease",
    { ownerID: "workflow.isolated-call", task: "Task 2", target: "wtCtx" },
  ],
  [
    "planned:src/worktree/index.ts:layer.child-boot-receipt",
    {
      ownerID: "worktree.child-boot-event",
      task: "Task 6",
      target: "ChildBootOutcome.target(info.directory,generation,incarnation)",
    },
  ],
])

const frozenLogicalOwnerGroups = new Map<string, readonly string[]>([
  [
    "lsp.client-channel",
    [
      "src/lsp/client.ts:create#native-callback-onNotification-39adcaeef4",
      "src/lsp/client.ts:create#native-callback-onRequest-aee6898cb0",
      "src/lsp/client.ts:create#native-callback-onRequest-b7157e539a",
      "src/lsp/client.ts:create#native-callback-onRequest-6fb95ebfed",
      "src/lsp/client.ts:create#native-callback-onRequest-602616340a",
      "src/lsp/client.ts:create#native-callback-onRequest-76984b6045",
    ],
  ],
  [
    "mcp.authenticate-browser-open",
    [
      "src/mcp/index.ts:MCP.authenticate.timer#timer-timeout-timer-f32a6263b8",
      "src/mcp/index.ts:MCP.authenticate#native-callback-on-884ee2b240",
      "src/mcp/index.ts:MCP.authenticate#native-callback-on-81b4a8093f",
    ],
  ],
  [
    "mcp.sampling-request-channel",
    [
      "src/mcp/sampling.ts:onError#native-callback-stream-3b77d2b99f",
      "src/mcp/sampling.ts:try#async-iterator-forofstatement-dd2b65698a",
      "src/mcp/sampling.ts:serve#native-callback-setRequestHandler-a203d903a9",
    ],
  ],
  [
    "mcp.turn-notification",
    [
      "src/mcp/index.ts:startTurnLifecycleNotification#naked-void-then-ec9254654b",
      "src/mcp/index.ts:try#native-callback-addEventListener-7e8ecd9ae4",
    ],
  ],
  [
    "actor.fork-work",
    [
      "src/actor/spawn.ts:forkWork.boundWork#instance-ref-provider-boundWork-91987c3ae1",
      "src/actor/spawn.ts:forkWork.fiber#effect-fork-fiber-72362dbd72",
    ],
  ],
  [
    "bus.subscription-channel",
    [
      "src/bus/index.ts:on.subscription#native-callback-subscription-9adb6135c1",
      "src/bus/index.ts:on#effect-fork-expressionstatement-249ad7320b",
      "src/bus/index.ts:on#effect-fork-fork-1898f6edbf",
      "src/bus/index.ts:subscribe#native-callback-return-0fd4a0a017",
    ],
  ],
  [
    "cron.mounted-channel",
    [
      "src/cron/scheduler.ts:runTick#detached-promise-catch-a301fcd8ec",
      "src/cron/scheduler.ts:start#timer-interval-expressionstatement-7a683d4167",
      "src/session/cron-bridge.ts:start.unsubscribe#detached-promise-catch-8f0ff25a97",
      "src/session/cron-bridge.ts:onFire#detached-promise-catch-c980203175",
      "src/session/prompt.ts:SessionPrompt.run#detached-promise-catch-c06fed76ea",
    ],
  ],
  [
    "global-disposal.request",
    [
      "src/config/config.ts:Config.invalidate.task#legacy-settled-facade-task-8a291143d4",
      "src/config/config.ts:Config.invalidate.task#global-event-publisher-task-5d53733bdc",
      "src/config/config.ts:Config.invalidate#naked-void-expressionstatement-9de8ef398e",
    ],
  ],
  [
    "cross-spawn.caller-scope",
    [
      "src/effect/cross-spawn-spawner.ts:onError#native-callback-expressionstatement-8dcf6f655f",
      "src/effect/cross-spawn-spawner.ts:make.setupFds#effect-fork-expressionstatement-321b04e5a8",
      "src/effect/cross-spawn-spawner.ts:make.setupFds#native-callback-on-af909c1872",
      "src/effect/cross-spawn-spawner.ts:onError#native-callback-expressionstatement-7db88db1a6",
      "src/effect/cross-spawn-spawner.ts:onError#native-callback-expressionstatement-9d0bab237b",
      "src/effect/cross-spawn-spawner.ts:setupStdin#effect-fork-return-18be294933",
      "src/effect/cross-spawn-spawner.ts:onError#native-callback-stdout-fa90d9ed0c",
      "src/effect/cross-spawn-spawner.ts:onError#native-callback-stderr-1cf76f42d3",
      "src/effect/cross-spawn-spawner.ts:spawn#native-callback-on-72dc98f1c6",
      "src/effect/cross-spawn-spawner.ts:spawn#native-callback-on-c9f301f971",
      "src/effect/cross-spawn-spawner.ts:spawn#native-callback-on-1a2ef9ae04",
      "src/effect/cross-spawn-spawner.ts:spawn#native-callback-on-0993bcbc2e",
    ],
  ],
  [
    "file-watcher.channel",
    [
      "src/file/watcher.ts:FileWatcher.state.cb#instance-bind-cb-29693a8651",
      "src/file/watcher.ts:subscribe.pending#native-callback-pending-8f439884c1",
      "src/file/watcher.ts:subscribe#detached-promise-catch-462dc4d3d3",
    ],
  ],
  [
    "global-event.sse",
    [
      "src/server/routes/global.ts:streamEvents#sse-body-return-2c770ca200",
      "src/server/routes/global.ts:GlobalRoutes.get_event#native-callback-on-feb36597e3",
    ],
  ],
  [
    "inbox.send-wake",
    [
      "src/inbox/inbox.ts:Inbox.send.bridge#instance-ref-provider-bridge-07829a1a13",
      "src/inbox/inbox.ts:Inbox.send#effect-fork-expressionstatement-241ecb89fb",
      "src/inbox/inbox.ts:Inbox.send#effect-fork-expressionstatement-866cd9a18d",
    ],
  ],
  [
    "node-listener.start",
    [
      "src/server/adapter.node.ts:start#native-callback-once-6a359a2f1d",
      "src/server/adapter.node.ts:start#native-callback-once-7466106a21",
    ],
  ],
  [
    "plugin.file-hooks-channel",
    [
      "src/plugin/index.ts:try#detached-promise-catch-3764a1f3af",
      "src/plugin/index.ts:Plugin.fileHooks#effect-fork-expressionstatement-88d2945d2c",
      "src/plugin/index.ts:Plugin.fileHooks#naked-void-catch-ca8beacfa5",
    ],
  ],
  [
    "plugin.oauth-codex",
    [
      "src/plugin/codex.ts:startOAuthServer#detached-promise-catch-8d1e6b295a",
      "src/plugin/codex.ts:startOAuthServer#native-callback-on-a5896fc140",
      "src/plugin/codex.ts:waitForOAuthCallback.timeout#timer-timeout-timeout-936a6407b2",
    ],
  ],
  [
    "plugin.oauth-mimo",
    [
      "src/plugin/mimo.ts:authorize#native-callback-on-3bcf3b5d5c",
      "src/plugin/mimo.ts:MimoAuthPlugin.timeout#timer-timeout-timeout-ee1fcb318a",
      "src/plugin/mimo.ts:MimoAuthPlugin.serverCallbackPromise#native-callback-on-9731869816",
      "src/plugin/mimo.ts:authorize#detached-promise-catch-b4aed84031",
      "src/plugin/mimo.ts:fetch.reader#stream-continuation-reader-28880f9783",
      "src/plugin/mimo.ts:fetch.body#readable-body-body-b58bde8ce2",
    ],
  ],
  [
    "plugin.oauth-xai",
    [
      "src/plugin/xai.ts:defaultSleep#timer-timeout-expressionstatement-6f39b10892",
      "src/plugin/xai.ts:startOAuthServer.server#detached-promise-catch-d36690348f",
      "src/plugin/xai.ts:startOAuthServer#native-callback-once-2bbfb8b2ac",
      "src/plugin/xai.ts:waitForOAuthCallback.timeout#timer-timeout-timeout-936a6407b2",
    ],
  ],
  [
    "plugin.state-channel",
    [
      "src/plugin/index.ts:publishPluginError#effect-fork-fork-f8a9806590",
      "src/plugin/index.ts:Plugin.state#effect-fork-expressionstatement-de31462f92",
      "src/plugin/index.ts:Plugin.state#naked-void-event-782f4b84e7",
    ],
  ],
  [
    "provider.request-timeout-body",
    [
      "src/provider/provider.ts:wrapRequestTimeout.reader#stream-continuation-reader-98675be4aa",
      "src/provider/provider.ts:wrapRequestTimeout#readable-body-return-6a686053e4",
    ],
  ],
  [
    "provider.sse-body",
    [
      "src/provider/provider.ts:wrapSSE.reader#stream-continuation-reader-83f0924347",
      "src/provider/provider.ts:wrapSSE.body#readable-body-body-31192cce4e",
    ],
  ],
  [
    "pty.session.channel",
    [
      "src/pty/index.ts:Pty.create#instance-bind-onData-44c2daf13c",
      "src/pty/index.ts:Pty.create#instance-bind-onExit-c40a9b9901",
      "src/pty/index.ts:onMessage#native-callback-return-dacddfeb51",
      "src/pty/index.ts:onClose#native-callback-return-8ebdfdbceb",
      "src/pty/pty.bun.ts:onData#native-callback-methoddeclaration-610616a83a",
      "src/pty/pty.bun.ts:onExit#native-callback-methoddeclaration-a53eaa8b50",
      "src/pty/pty.node.ts:onData#native-callback-methoddeclaration-52df5d7a98",
      "src/pty/pty.node.ts:onExit#native-callback-methoddeclaration-754b5fc4d8",
    ],
  ],
  [
    "remote-relay.workspace-sync",
    [
      "src/control-plane/sse.ts:parseSSE.reader#stream-continuation-reader-712d7f2d65",
      "src/control-plane/sse.ts:abort#naked-void-catch-f99b8d0fb4",
      "src/control-plane/sse.ts:parseSSE#native-callback-addEventListener-c40848e419",
      "src/control-plane/workspace.ts:sessionRestore#global-event-publisher-emit-f570feb277",
      "src/control-plane/workspace.ts:sessionRestore#global-event-publisher-emit-825ffab3ee",
      "src/control-plane/workspace.ts:setStatus#global-event-publisher-emit-5e022324a1",
      "src/control-plane/workspace.ts:syncWorkspaceLoop#global-event-publisher-emit-6aa087d931",
      "src/control-plane/workspace.ts:startSync#naked-void-then-19828efd14",
      "src/control-plane/workspace.ts:startSync#naked-void-catch-319d15c208",
      "src/control-plane/workspace.ts:startWorkspaceSyncing#naked-void-startSync-ef678fa9a4",
    ],
  ],
  [
    "ripgrep.caller-stream",
    [
      "src/file/ripgrep.ts:files#effect-fork-expressionstatement-3aa3277eae",
      "src/file/ripgrep.ts:files.stderr#effect-fork-stderr-fb47f21849",
      "src/file/ripgrep.ts:files.stdout#effect-fork-stdout-0b721f882b",
    ],
  ],
  [
    "session.checkpoint-producer",
    [
      "src/session/checkpoint.ts:SessionCheckpoint.tryStartCheckpointWriter#effect-fork-expressionstatement-484a6f57a6",
      "src/session/prune.ts:SessionPrune.fireCheckpoints#effect-fork-expressionstatement-a9a9d900ba",
    ],
  ],
  [
    "share-next.state",
    [
      "src/share/share-next.ts:sync#effect-fork-expressionstatement-8a266d47f0",
      "src/share/share-next.ts:watch#effect-fork-watch-d5c35f98f8",
      "src/share/share-next.ts:ShareNext.create#effect-fork-expressionstatement-746247d3cf",
    ],
  ],
  [
    "sync.local-event",
    [
      "src/sync/index.ts:process#naked-void-then-cf03261542",
      "src/sync/index.ts:process#naked-void-publish-552d6bb3bb",
      "src/sync/index.ts:process#global-event-publisher-emit-2c9d8254d0",
    ],
  ],
  [
    "workflow.run",
    [
      "src/workflow/runtime.ts:attempt#detached-promise-then-14214eb77b",
      "src/workflow/runtime.ts:scheduleFlush#timer-timeout-set-b0b4859fdf",
      "src/workflow/runtime.ts:publishAgentFailed#effect-run-fork-runFork-0e51d0e461",
      "src/workflow/runtime.ts:agentImpl.result#timer-timeout-expressionstatement-137de411be",
      "src/workflow/runtime.ts:agentImpl#timer-timeout-expressionstatement-684a926831",
      "src/workflow/runtime.ts:phase#effect-run-fork-runFork-9ca2810870",
      "src/workflow/runtime.ts:phase#effect-run-fork-runFork-423d2058e6",
      "src/workflow/runtime.ts:phase#effect-run-fork-runFork-32f39a0904",
      "src/workflow/runtime.ts:logHook#effect-run-fork-runFork-c7dccdc06e",
      "src/workflow/runtime.ts:logHook#effect-run-fork-runFork-1a3e7fb27f",
      "src/workflow/runtime.ts:WorkflowRuntime.launch#effect-fork-expressionstatement-ef2290a98d",
    ],
  ],
  [
    "workspace-wait.finite",
    [
      "src/control-plane/util.ts:waitEvent.timeout#timer-timeout-timeout-7339f9de0b",
      "src/control-plane/util.ts:waitEvent#native-callback-on-a19a305026",
      "src/control-plane/util.ts:waitEvent#native-callback-addEventListener-17047fab75",
    ],
  ],
  [
    "worktree.child-boot-event",
    [
      "src/worktree/index.ts:layer.booted#global-event-publisher-emit-33b264a3e2",
      "src/worktree/index.ts:layer.boot#global-event-publisher-emit-e2bcde59e7",
    ],
  ],
])

export function logicalOwnerGroupMembershipErrors(
  actual: ReadonlyMap<string, ReadonlySet<string>>,
  frozen: ReadonlyMap<string, readonly string[]> = frozenLogicalOwnerGroups,
) {
  const errors = [...actual]
    .filter(([ownerID, anchors]) => anchors.size > 1 && !frozen.has(ownerID))
    .map(([ownerID]) => `logical owner group is not frozen: ${ownerID}`)
  for (const [ownerID, expected] of frozen) {
    const found = actual.get(ownerID)
    if (
      found &&
      found.size === expected.length &&
      expected.every((anchor) => found.has(anchor))
    ) {
      continue
    }
    errors.push(`frozen logical owner group membership changed: ${ownerID}`)
  }
  return errors
}

export function plannedOwnerParentClosureErrors(
  referenced: ReadonlySet<string>,
  planned: ReadonlyMap<string, PlannedOwnerParent> = plannedOwnerParentAnchors,
) {
  return [
    ...[...referenced]
      .filter((parent) => !planned.has(parent))
      .map((parent) => `unfrozen planned owner parent anchor: ${parent}`),
    ...[...planned.keys()]
      .filter((parent) => !referenced.has(parent))
      .map((parent) => `planned owner parent anchor is stale or unreferenced: ${parent}`),
  ]
}

export function plannedHandoffClosureErrors(
  referenced: ReadonlySet<string>,
  planned: ReadonlyMap<string, PlannedHandoff> = plannedHandoffAnchors,
) {
  return [
    ...[...referenced].filter((handoff) => !planned.has(handoff)).map((handoff) => `unfrozen planned handoff anchor: ${handoff}`),
    ...[...planned.keys()]
      .filter((handoff) => !referenced.has(handoff))
      .map((handoff) => `planned handoff anchor is stale or unreferenced: ${handoff}`),
  ]
}

const task2ProviderMigrations = new Map([
  [
    "src/actor/spawn.ts:notify#instance-ref-provider-expressionstatement-0c1396d50f",
    {
      replacement: "acquireChildGenerationLease",
      test: "planned=test/actor/spawn-notification.test.ts:notification generation",
    },
  ],
  [
    "src/actor/spawn.ts:forkWork.boundWork#instance-ref-provider-boundWork-91987c3ae1",
    { replacement: "registerTransferredGenerationProducer", test: "planned=test/actor/spawn.test.ts:actor generation" },
  ],
  [
    "src/actor/spawn.ts:notifyTerminal#instance-ref-provider-expressionstatement-77472bca03",
    {
      replacement: "acquireChildGenerationLease",
      test: "planned=test/actor/cancel-notification.test.ts:terminal notification",
    },
  ],
  [
    "src/actor/spawn.ts:layer#instance-ref-provider-expressionstatement-0dd4508a1c",
    { replacement: "removeProcessWatchdogInstanceRefProvider", test: "planned=test/actor/spawn.test.ts:actor generation" },
  ],
  [
    "src/effect/run-service.ts:attachWith#instance-ref-provider-return-ac284861a8",
    { replacement: "enterInstanceExecutionEffect", test: "planned=test/effect/run-service.test.ts:paired execution" },
  ],
  [
    "src/effect/run-service.ts:attachWith#instance-ref-provider-return-18c80d984d",
    { replacement: "enterInstanceExecutionEffect", test: "planned=test/effect/run-service.test.ts:paired execution" },
  ],
  [
    "src/inbox/inbox.ts:Inbox.send.bridge#instance-ref-provider-bridge-07829a1a13",
    { replacement: "registerTransferredGenerationProducer", test: "planned=test/inbox/fork-agent-compat.test.ts:target-local wake" },
  ],
  [
    "src/server/routes/instance/httpapi/server.ts:instance#instance-ref-provider-return-e68bfde34a",
    { replacement: "acquireGenerationLease", test: "planned=test/server/httpapi-instance-admission.test.ts:HTTP admission" },
  ],
  [
    "src/tool/session.ts:SessionTool.execute.wtDir#instance-ref-provider-wtDir-8368a1cdb2",
    { replacement: "acquireChildGenerationLease", test: "planned=test/tool/session-tool.test.ts:target-local tool" },
  ],
  [
    "src/tool/session.ts:SessionTool.execute.remExit#instance-ref-provider-remExit-eb0cfe5ff3",
    { replacement: "acquireChildGenerationLease", test: "planned=test/tool/session-tool.test.ts:target-local tool" },
  ],
  [
    "src/workflow/runtime.ts:spawnIsolated.wtBridge#instance-ref-provider-wtBridge-5d6e008362",
    { replacement: "acquireChildGenerationLease", test: "planned=test/workflow/runtime-worktree.test.ts:target-local workflow" },
  ],
])

const plannedDeterministicTests = new Map<string, { tasks: ReadonlySet<string>; scenario: string | ReadonlySet<string> }>([
  ["test/effect/instance-registry.test.ts", { tasks: new Set(["Task 1"]), scenario: "disposer phases" }],
  [
    "test/project/instance-dispose.test.ts",
    { tasks: new Set(["Task 1", "Task 2"]), scenario: new Set(["directory retirement", "global retirement"]) },
  ],
  ["test/effect/run-service.test.ts", { tasks: new Set(["Task 2"]), scenario: "paired execution" }],
  ["test/effect/instance-state.test.ts", { tasks: new Set(["Task 2", "Task 3"]), scenario: "generation state" }],
  ["test/project/instance-bootstrap-retirement.test.ts", { tasks: new Set(["Task 2"]), scenario: "directory owner" }],
  ["test/server/httpapi-instance-admission.test.ts", { tasks: new Set(["Task 2"]), scenario: "HTTP admission" }],
  ["test/actor/spawn.test.ts", { tasks: new Set(["Task 2", "Task 5"]), scenario: "actor generation" }],
  ["test/actor/spawn-notification.test.ts", { tasks: new Set(["Task 2"]), scenario: "notification generation" }],
  ["test/actor/cancel-notification.test.ts", { tasks: new Set(["Task 2"]), scenario: "terminal notification" }],
  ["test/inbox/fork-agent-compat.test.ts", { tasks: new Set(["Task 2"]), scenario: "target-local wake" }],
  ["test/workflow/runtime-worktree.test.ts", { tasks: new Set(["Task 2", "Task 5", "Task 7"]), scenario: "target-local workflow" }],
  ["test/tool/session-tool.test.ts", { tasks: new Set(["Task 2", "Task 5", "Task 7"]), scenario: "target-local tool" }],
  ["test/bus/bus.test.ts", { tasks: new Set(["Task 2", "Task 3", "Task 6"]), scenario: "generation event" }],
  ["test/bus/subscription-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "subscription retirement" }],
  ["test/effect/instance-state-registry.test.ts", { tasks: new Set(["Task 3"]), scenario: "state scope" }],
  ["test/effect/runner.test.ts", { tasks: new Set(["Task 4"]), scenario: "runner retirement" }],
  ["test/effect/cross-spawn-spawner-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "caller scope shutdown" }],
  ["test/config/dependency-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "dependency installs" }],
  ["test/history/backfill-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "backfill settlement" }],
  ["test/project/instance-producer-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "producer retirement" }],
  ["test/server/instance-stream-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "stream retirement" }],
  ["test/file/watcher-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "watcher retirement" }],
  ["test/pty/retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "PTY retirement" }],
  ["test/session/checkpoint-drain.test.ts", { tasks: new Set(["Task 5"]), scenario: "checkpoint drain" }],
  ["test/session/processor-summary-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "processor summary" }],
  ["test/session/prompt-background-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "prompt jobs" }],
  ["test/session/prompt-shell-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "shell output retirement" }],
  ["test/session/prompt-cancel-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "bridge cancel retirement" }],
  ["test/session/auto-memory-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "auto memory jobs" }],
  ["test/session/cron-bridge-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "cron retirement" }],
  ["test/server/tui-control-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "TUI control" }],
  ["test/workflow/runtime-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "workflow producer" }],
  ["test/inbox/wake-matrix.test.ts", { tasks: new Set(["Task 5"]), scenario: "inbox wake" }],
  ["test/plugin/oauth-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "OAuth retirement" }],
  ["test/plugin/generation-retirement.test.ts", { tasks: new Set(["Task 5"]), scenario: "plugin channel" }],
  ["test/mcp/lifecycle.test.ts", { tasks: new Set(["Task 5"]), scenario: "instance generation retirement" }],
  ["test/mcp/sampling-e2e.test.ts", { tasks: new Set(["Task 5"]), scenario: "sampling generation retirement" }],
  ["test/lsp/lifecycle.test.ts", { tasks: new Set(["Task 5"]), scenario: "instance generation retirement" }],
  ["test/tool/read-lifecycle.test.ts", { tasks: new Set(["Task 5"]), scenario: "LSP late work" }],
  ["test/server/global-event-generation.test.ts", { tasks: new Set(["Task 6"]), scenario: "generation event" }],
  ["test/server/instance-openapi-lifecycle.test.ts", { tasks: new Set(["Task 6"]), scenario: "lifecycle schema" }],
  ["test/server/workspace-instance-generation.test.ts", { tasks: new Set(["Task 6"]), scenario: "workspace generation" }],
  ["test/cli/tui/instance-generation-order.test.tsx", { tasks: new Set(["Task 6"]), scenario: "TUI generation" }],
  ["test/control-plane/workspace-remove.test.ts", { tasks: new Set(["Task 7"]), scenario: "maintenance reservation" }],
  ["test/plugin/workspace-adaptor-remove.test.ts", { tasks: new Set(["Task 7"]), scenario: "maintenance adapter" }],
  ["test/project/worktree.test.ts", { tasks: new Set(["Task 7"]), scenario: "worktree maintenance" }],
  ["test/server/project-init-git.test.ts", { tasks: new Set(["Task 6", "Task 7"]), scenario: "worktree metadata" }],
  ["test/cli/server-shutdown-entrypoints.test.ts", { tasks: new Set(["Task 8"]), scenario: "shutdown entrypoints" }],
  ["test/server/shutdown-streams.test.ts", { tasks: new Set(["Task 8"]), scenario: "shutdown streams" }],
  ["test/cli/bootstrap-retirement.test.ts", { tasks: new Set(["Task 7"]), scenario: "headless shutdown" }],
  ["test/cli/tui/bootstrap-race.test.tsx", { tasks: new Set(["Task 6"]), scenario: "TUI shutdown" }],
  ["test/session/run-state-dispose.test.ts", { tasks: new Set(["Task 4"]), scenario: "run state shutdown" }],
])

const rawHelperAllowlist: Record<string, ReadonlySet<string>> = {
  registerLifecycleOwner: new Set(["src/effect/instance-ref.ts", "src/project/instance.ts"]),
  transferLifecycleOwner: new Set(["src/effect/instance-ref.ts", "src/project/instance.ts"]),
  captureInstanceExecution: new Set([
    "src/effect/instance-ref.ts",
    "src/effect/bootstrap-runtime.ts",
    "src/effect/run-service.ts",
    "src/project/instance.ts",
  ]),
  captureInstanceExecutionEffect: new Set([
    "src/effect/instance-ref.ts",
    "src/effect/bridge.ts",
  ]),
  restoreInstanceExecutionSync: new Set([
    "src/effect/instance-ref.ts",
    "src/effect/bootstrap-runtime.ts",
    "src/effect/run-service.ts",
    "src/project/instance.ts",
  ]),
  enterInstanceExecutionEffect: new Set([
    "src/effect/instance-ref.ts",
    "src/effect/bootstrap-runtime.ts",
    "src/effect/bridge.ts",
    "src/effect/run-service.ts",
  ]),
  registerDirectoryRootLifecycleOwner: new Set([
    "src/effect/instance-ref.ts",
    "src/effect/instance-state.ts",
    "src/project/instance.ts",
  ]),
}

const privateJoinAllowlist: Record<string, ReadonlySet<string>> = {
  disposeDirectorySettled: new Set([
    "src/project/instance.ts",
    "src/cli/bootstrap.ts",
    "src/workflow/runtime.ts",
    "test/fixture/instance-lifecycle.ts",
  ]),
  disposeAllSettled: new Set([
    "src/project/instance.ts",
    "src/server/shutdown.ts",
    "test/fixture/instance-lifecycle.ts",
  ]),
}

const rawHelperSymbolAllowlist: Record<string, ReadonlySet<string>> = {
  registerLifecycleOwner: new Set([
    "src/project/instance.ts:runNestedGenerationProducer",
    "src/project/instance.ts:registerNestedGenerationChannel",
    "src/project/instance.ts:acquireGenerationLease",
    "src/project/instance.ts:acquireChildGenerationLease",
  ]),
  transferLifecycleOwner: new Set([
    "src/project/instance.ts:registerTransferredGenerationProducer",
    "src/project/instance.ts:registerTransferredGenerationChannel",
    "src/project/instance.ts:registerGenerationBody",
  ]),
  captureInstanceExecution: new Set([
    "src/effect/bootstrap-runtime.ts:bootstrap",
    "src/effect/bootstrap-runtime.ts:BootstrapRuntime",
    "src/effect/run-service.ts:attachWith",
    "src/project/instance.ts:bind",
  ]),
  captureInstanceExecutionEffect: new Set([
    "src/effect/bridge.ts:make",
  ]),
  restoreInstanceExecutionSync: new Set([
    "src/effect/bootstrap-runtime.ts:bootstrap",
    "src/effect/bootstrap-runtime.ts:BootstrapRuntime",
    "src/effect/run-service.ts:attachWith",
    "src/project/instance.ts:bind",
  ]),
  enterInstanceExecutionEffect: new Set([
    "src/effect/bootstrap-runtime.ts:bootstrap",
    "src/effect/bootstrap-runtime.ts:BootstrapRuntime",
    "src/effect/bridge.ts:make",
    "src/effect/run-service.ts:attachWith",
  ]),
  registerDirectoryRootLifecycleOwner: new Set([
    "src/effect/instance-state.ts:make",
    "src/project/instance.ts:provide",
    "src/project/instance.ts:disposeCached",
    "src/project/instance.ts:reload",
    "src/project/instance.ts:dispose",
  ]),
}

const rawHelperCallContracts = new Map<string, ReadonlySet<string>>(
  Object.entries(rawHelperSymbolAllowlist).flatMap(([helper, anchors]) =>
    [...anchors].map((anchor) => {
      const fingerprints = helper === "registerLifecycleOwner" || helper === "registerDirectoryRootLifecycleOwner"
        ? new Set([`${helper}({kind,target})`, `${helper}({abort,kind,target})`])
        : helper === "transferLifecycleOwner"
          ? new Set([
              `${helper}({handoffFrom,kind})`,
              `${helper}({abort,handoffFrom,kind})`,
              `${helper}({handoffFrom,kind,onArmed})`,
              `${helper}({abort,handoffFrom,kind,onArmed})`,
            ])
          : helper === "captureInstanceExecution" || helper === "captureInstanceExecutionEffect"
            ? new Set([`${helper}()`])
            : new Set([`${helper}(value,value)`])
      return [`${helper}:${anchor}`, fingerprints] as const
    }),
  ),
)

const privateJoinCallContracts = new Map<string, readonly string[]>([
  [
    "disposeDirectorySettled:src/project/instance.ts:disposeDirectory",
    ["disposeDirectorySettled(input)", "disposeDirectorySettled(directory)"],
  ],
  ["disposeDirectorySettled:src/cli/bootstrap.ts:bootstrap", ["disposeDirectorySettled(directory)"]],
  ["disposeDirectorySettled:src/workflow/runtime.ts:spawnIsolated", ["disposeDirectorySettled(info.directory)"]],
  ["disposeDirectorySettled:test/fixture/instance-lifecycle.ts:disposeDirectory", ["disposeDirectorySettled(directory)"]],
  ["disposeAllSettled:src/project/instance.ts:disposeAll", ["disposeAllSettled()"]],
  ["disposeAllSettled:src/server/shutdown.ts:shutdown", ["disposeAllSettled()"]],
  ["disposeAllSettled:test/fixture/instance-lifecycle.ts:disposeAll", ["disposeAllSettled()"]],
])

function listFiles(root: string): string[] {
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name)
    if (entry.isDirectory()) return entry.name === ".bundle" ? [] : listFiles(target)
    if (!entry.isFile() || (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx"))) return []
    return [target]
  })
}

function hasStringDisposeInstanceDeclaration(root: string) {
  return listFiles(root).some((file) => {
    const text = readFileSync(file, "utf8")
    if (!text.includes("disposeInstance")) return false
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    let found = false
    const containsStringKeyword = (node: ts.Node) => {
      if (node.kind === ts.SyntaxKind.StringKeyword) found = true
      if (!found) node.forEachChild(containsStringKeyword)
    }
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === "disposeInstance" && node.parameters[0]?.type) {
        containsStringKeyword(node.parameters[0].type)
      }
      if (!found) node.forEachChild(visit)
    }
    visit(source)
    return found
  })
}

function parseSources(
  root: string,
  prefix: "src" | "test",
  context: ParsedSourceContext = defaultParsedSourceContext,
): ParsedSource[] {
  const cacheKey =
    (prefix === "src" && root === context.roots.src) || (prefix === "test" && root === context.roots.test)
      ? `${prefix}:${root}`
      : undefined
  const cached = cacheKey ? context.cache.get(cacheKey) : undefined
  if (cached) return cached
  const files = listFiles(root).sort()
  const defaultSource = prefix === "src" && root === defaultSourceRoot
  const defaultTest = prefix === "test" && root === defaultTestRoot
  const program = ts.createProgram({
    rootNames: files,
    options: defaultSource
      ? { ...projectCompilerOptions, noResolve: false }
      : {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          jsx: ts.JsxEmit.Preserve,
          noResolve: true,
          skipLibCheck: true,
          ...(!defaultTest && { noLib: true, types: [] }),
        },
  })
  const checker = program.getTypeChecker()
  const parsed = files.map((file) => {
    const source = program.getSourceFile(file)
    const text = source?.text ?? readFileSync(file, "utf8")
    return {
      file,
      relative: `${prefix}/${path.relative(root, file).split(path.sep).join("/")}`,
      text,
      source:
        source ??
        ts.createSourceFile(
          file,
          text,
          ts.ScriptTarget.Latest,
          true,
          file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        ),
      checker,
    }
  })
  if (cacheKey) context.cache.set(cacheKey, parsed)
  return parsed
}

export function createParsedSourceReaderForTest(roots: ParsedSourceRoots) {
  const context = { roots, cache: new Map<string, ParsedSource[]>() }
  return (root: string, prefix: "src" | "test") => parseSources(root, prefix, context).map((source) => source.text)
}

function nameText(name: ts.PropertyName | ts.BindingName | undefined): string | undefined {
  if (!name) return undefined
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    return name.elements
      .flatMap((element) => (ts.isOmittedExpression(element) ? [] : [nameText(element.name)]))
      .filter((item): item is string => !!item)
      .join("+")
  }
  return name.getText()
}

function effectFnLabel(node: ts.Node) {
  if (!ts.isCallExpression(node) || !ts.isCallExpression(node.expression)) return undefined
  const factory = node.expression
  if (!ts.isPropertyAccessExpression(factory.expression)) return undefined
  if (factory.expression.expression.getText() !== "Effect") return undefined
  if (factory.expression.name.text !== "fn" && factory.expression.name.text !== "fnUntraced") return undefined
  const label = factory.arguments[0]
  return label && ts.isStringLiteral(label) ? label.text : undefined
}

function enclosingSymbol(node: ts.Node): string {
  let current: ts.Node | undefined = node
  let role: string | undefined
  const combine = (base: string) => (role && role !== base ? `${base}.${role}` : base)
  while (current) {
    const label = effectFnLabel(current)
    if (label) return combine(label)
    if (ts.isFunctionDeclaration(current) && current.name) return combine(current.name.text)
    if (ts.isMethodDeclaration(current) || ts.isMethodSignature(current)) {
      const name = nameText(current.name)
      if (name) return combine(name)
    }
    if (ts.isPropertyAssignment(current) || ts.isPropertyDeclaration(current)) {
      const name = nameText(current.name)
      if (
        name &&
        !role &&
        current.initializer &&
        (ts.isArrowFunction(current.initializer) || ts.isFunctionExpression(current.initializer))
      ) {
        return name
      }
    }
    if (ts.isVariableDeclaration(current)) {
      const name = nameText(current.name)
      const statement = current.parent.parent
      if (name && current.initializer && (ts.isArrowFunction(current.initializer) || ts.isFunctionExpression(current.initializer))) {
        return combine(name)
      }
      if (name && !role) role = name
      if (
        name &&
        ts.isVariableStatement(statement) &&
        !!ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        return combine(name)
      }
    }
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isCallExpression(current.parent) &&
      current.parent.arguments.includes(current)
    ) {
      const route = callProperty(current.parent)
      const routePath = current.parent.arguments[0]
      if (
        route &&
        new Set(["get", "post", "put", "patch", "delete", "all", "use"]).has(route.name) &&
        routePath &&
        ts.isStringLiteral(routePath)
      ) {
        const segment = `${route.name}_${routePath.text.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "root"}`
        role = role ? `${segment}.${role}` : segment
      }
    }
    if (ts.isClassDeclaration(current) && current.name) return combine(current.name.text)
    current = current.parent
  }
  return role ?? "module"
}

function enclosingDeclarationSymbol(node: ts.Node): string {
  let current: ts.Node | undefined = node
  while (current) {
    const label = effectFnLabel(current)
    if (label) return label
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text
    if (ts.isMethodDeclaration(current) || ts.isMethodSignature(current)) {
      const name = nameText(current.name)
      if (name) return name
    }
    if (
      (ts.isPropertyAssignment(current) || ts.isPropertyDeclaration(current)) &&
      current.initializer &&
      (ts.isArrowFunction(current.initializer) || ts.isFunctionExpression(current.initializer))
    ) {
      const name = nameText(current.name)
      if (name) return name
    }
    if (
      ts.isVariableDeclaration(current) &&
      current.initializer &&
      (ts.isArrowFunction(current.initializer) || ts.isFunctionExpression(current.initializer))
    ) {
      const name = nameText(current.name)
      if (name) return name
    }
    if (ts.isClassDeclaration(current) && current.name) return current.name.text
    current = current.parent
  }
  return "*"
}

function callProperty(node: ts.CallExpression) {
  if (ts.isPropertyAccessExpression(node.expression)) {
    return {
      receiver: normalize(node.expression.expression),
      name: node.expression.name.text,
    }
  }
  if (
    ts.isElementAccessExpression(node.expression) &&
    ts.isStringLiteralLike(node.expression.argumentExpression)
  ) {
    return {
      receiver: normalize(node.expression.expression),
      name: node.expression.argumentExpression.text,
    }
  }
  return undefined
}

const normalizedNodeCache = new WeakMap<ts.Node, string>()

function normalize(node: ts.Node) {
  const cached = normalizedNodeCache.get(node)
  if (cached) return cached
  const value = canonicalPrinter.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()).replace(/\s+/g, " ").trim()
  normalizedNodeCache.set(node, value)
  return value
}

function owningNode(node: ts.Node) {
  let current = node
  while (current.parent) {
    if (
      ts.isExpressionStatement(current) ||
      ts.isVariableStatement(current) ||
      ts.isReturnStatement(current) ||
      ts.isThrowStatement(current) ||
      ts.isPropertyDeclaration(current) ||
      ts.isFunctionDeclaration(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isForStatement(current) ||
      ts.isForOfStatement(current) ||
      ts.isWhileStatement(current) ||
      ts.isDoStatement(current)
    ) {
      return current
    }
    current = current.parent
  }
  return current
}

function owningRole(node: ts.Node) {
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.map((declaration) => nameText(declaration.name) ?? "binding").join("+")
  }
  if (ts.isReturnStatement(node)) return "return"
  if (ts.isThrowStatement(node)) return "throw"
  if (ts.isPropertyDeclaration(node)) return nameText(node.name) ?? "property"
  if (ts.isExpressionStatement(node)) {
    let expression: ts.Expression = node.expression
    while (ts.isAwaitExpression(expression) || ts.isVoidExpression(expression)) expression = expression.expression
    if (ts.isCallExpression(expression)) {
      const property = callProperty(expression)
      if (property) return property.name
      if (ts.isIdentifier(expression.expression)) return expression.expression.text
    }
  }
  return ts.SyntaxKind[node.kind].replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()
}

type OwnershipFunction =
  | ts.ArrowFunction
  | ts.FunctionExpression
  | ts.FunctionDeclaration
  | ts.MethodDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration
  | ts.ConstructorDeclaration

function ownershipFunction(node: ts.Node): node is OwnershipFunction {
  return ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
}

function ownershipExpression(node: ts.Expression): ts.Expression {
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    return ownershipExpression(node.expression)
  }
  return node
}

function expressionYieldsOwnershipFunction(expression: ts.Expression, fn: OwnershipFunction): boolean {
  const value = ownershipExpression(expression)
  if (value === fn) return true
  if (ts.isConditionalExpression(value)) {
    return expressionYieldsOwnershipFunction(value.whenTrue, fn) || expressionYieldsOwnershipFunction(value.whenFalse, fn)
  }
  if (
    ts.isBinaryExpression(value) &&
    new Set([ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken]).has(value.operatorToken.kind)
  ) {
    return expressionYieldsOwnershipFunction(value.right, fn)
  }
  if (
    ts.isBinaryExpression(value) &&
    new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(value.operatorToken.kind)
  ) {
    return expressionYieldsOwnershipFunction(value.left, fn) || expressionYieldsOwnershipFunction(value.right, fn)
  }
  if (ts.isCallExpression(value) && callProperty(value)?.name === "bind") {
    if (ts.isPropertyAccessExpression(value.expression) || ts.isElementAccessExpression(value.expression)) {
      return expressionYieldsOwnershipFunction(value.expression.expression, fn)
    }
  }
  if (!ts.isPropertyAccessExpression(value) && !ts.isElementAccessExpression(value)) return false
  const property = ts.isPropertyAccessExpression(value)
    ? value.name.text
    : ts.isStringLiteralLike(value.argumentExpression)
      ? value.argumentExpression.text
      : undefined
  const receiver = ownershipExpression(value.expression)
  if (!property || !ts.isObjectLiteralExpression(receiver)) return false
  const selected = receiver.properties.find(
    (item) =>
      (ts.isMethodDeclaration(item) || ts.isPropertyAssignment(item)) &&
      nameText(item.name) === property,
  )
  if (selected === fn) return ts.isMethodDeclaration(fn) && !fn.asteriskToken
  return !!selected &&
    ts.isPropertyAssignment(selected) &&
    expressionYieldsOwnershipFunction(selected.initializer, fn)
}

type LifecycleOwnershipTarget = {
  receiver: string
  name: "runSync" | "enter" | "bind"
  boundArgs: readonly ts.Expression[]
}

function lifecycleOwnershipTarget(
  expression: ts.Expression,
  checker: ts.TypeChecker,
  seen = new Set<ts.Node>(),
): LifecycleOwnershipTarget | undefined {
  const value = ownershipExpression(expression)
  if (seen.has(value)) return undefined
  seen.add(value)
  if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
    const name = ts.isPropertyAccessExpression(value)
      ? value.name.text
      : ts.isStringLiteralLike(value.argumentExpression)
        ? value.argumentExpression.text
        : undefined
    const receiver = normalize(value.expression)
    if (name === "runSync" || name === "enter" || (name === "bind" && receiver === "Instance")) {
      return { receiver, name, boundArgs: [] }
    }
  }
  if (
    ts.isCallExpression(value) &&
    callProperty(value)?.name === "bind" &&
    (ts.isPropertyAccessExpression(value.expression) || ts.isElementAccessExpression(value.expression))
  ) {
    const target = lifecycleOwnershipTarget(value.expression.expression, checker, seen)
    return target ? { ...target, boundArgs: [...target.boundArgs, ...value.arguments.slice(1)] } : undefined
  }
  if (!ts.isIdentifier(value)) return undefined
  const symbol = checker.getSymbolAtLocation(value)
  const target = symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol
  const directStatement = (node: ts.Node) => {
    let current = node
    while (current.parent) {
      if (ts.isSourceFile(current.parent) || ts.isBlock(current.parent)) return current
      if (ownershipFunction(current)) return undefined
      current = current.parent
    }
    return undefined
  }
  type LifecycleOwnershipDefinition = {
    node: ts.Node
    expression?: ts.Expression
    resolved?: LifecycleOwnershipTarget
  }
  const definitions: LifecycleOwnershipDefinition[] = [
    ...(target?.declarations ?? []).flatMap<LifecycleOwnershipDefinition>((declaration) => {
      if (declaration.getStart(declaration.getSourceFile()) >= value.getStart(value.getSourceFile())) return []
      if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
        return [{ node: declaration as ts.Node, expression: declaration.initializer }]
      }
      if (!ts.isBindingElement(declaration) || !ts.isObjectBindingPattern(declaration.parent)) return []
      const binding = declaration.parent.parent
      const name = nameText(declaration.propertyName ?? declaration.name)
      if (
        !ts.isVariableDeclaration(binding) ||
        !binding.initializer ||
        (name !== "runSync" && name !== "enter" && !(name === "bind" && normalize(binding.initializer) === "Instance"))
      ) {
        return []
      }
      return [{
        node: declaration as ts.Node,
        resolved: { receiver: normalize(binding.initializer), name, boundArgs: [] as ts.Expression[] },
      }]
    }),
    ...(() => {
      const items: Array<{ node: ts.Node; expression: ts.Expression }> = []
      const visit = (node: ts.Node) => {
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isIdentifier(node.left) &&
          checker.getSymbolAtLocation(node.left) === symbol &&
          node.getStart(node.getSourceFile()) < value.getStart(value.getSourceFile())
        ) {
          items.push({ node, expression: node.right })
        }
        node.forEachChild(visit)
      }
      visit(value.getSourceFile())
      return items
    })(),
  ].sort((left, right) => right.node.getStart(right.node.getSourceFile()) - left.node.getStart(left.node.getSourceFile()))
  const referenceStatement = directStatement(value)
  const dominant = definitions.findIndex((definition) => {
    const statement = directStatement(definition.node)
    return !!statement && !!referenceStatement && statement.parent === referenceStatement.parent &&
      (ts.isVariableStatement(statement) ||
        (ts.isExpressionStatement(statement) && statement.expression === definition.node))
  })
  return (dominant === -1 ? definitions : definitions.slice(0, dominant + 1))
    .map((definition) => definition.resolved ??
      (definition.expression
        ? lifecycleOwnershipTarget(definition.expression, checker, new Set(seen))
        : undefined))
    .find((resolved) => !!resolved)
}

function lifecycleOwnershipCall(call: ts.CallExpression, checker: ts.TypeChecker) {
  const property = callProperty(call)
  if (
    property?.name === "bind" &&
    (ts.isPropertyAccessExpression(call.expression) || ts.isElementAccessExpression(call.expression))
  ) {
    const target = lifecycleOwnershipTarget(call.expression.expression, checker)
    if (target) return { target, callback: call.arguments[1] }
  }
  if (
    property &&
    new Set(["call", "apply"]).has(property.name) &&
    (ts.isPropertyAccessExpression(call.expression) || ts.isElementAccessExpression(call.expression))
  ) {
    const target = lifecycleOwnershipTarget(call.expression.expression, checker)
    if (!target) return undefined
    const applied = call.arguments[1]
    const callback = property.name === "call"
      ? call.arguments[1]
      : applied && ts.isArrayLiteralExpression(applied) && applied.elements[0] &&
          !ts.isOmittedExpression(applied.elements[0]) && !ts.isSpreadElement(applied.elements[0])
        ? applied.elements[0]
        : undefined
    return { target, callback: target.boundArgs[0] ?? callback }
  }
  const target = lifecycleOwnershipTarget(call.expression, checker)
  return target ? { target, callback: target.boundArgs[0] ?? call.arguments[0] } : undefined
}

function ownershipConsumer(call: ts.CallExpression | ts.NewExpression, fn: OwnershipFunction, checker: ts.TypeChecker) {
  if ((ts.isFunctionExpression(fn) || ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn)) && fn.asteriskToken) {
    return false
  }
  if (ts.isNewExpression(call)) {
    const expression = ownershipExpression(call.expression)
    if (!ts.isIdentifier(expression) || expression.text !== "Promise" || !call.arguments?.[0]) return false
    const declarations = checker.getSymbolAtLocation(expression)?.declarations ?? []
    if (declarations.some((declaration) => declaration.getSourceFile() === expression.getSourceFile())) return false
    return expressionYieldsOwnershipFunction(call.arguments[0], fn)
  }
  if (expressionYieldsOwnershipFunction(call.expression, fn)) return true
  const property = callProperty(call)
  if (
    property &&
    new Set(["call", "apply"]).has(property.name) &&
    (ts.isPropertyAccessExpression(call.expression) || ts.isElementAccessExpression(call.expression)) &&
    expressionYieldsOwnershipFunction(call.expression.expression, fn)
  ) {
    return true
  }
  const lifecycle = lifecycleOwnershipCall(call, checker)
  return !!lifecycle?.callback && expressionYieldsOwnershipFunction(lifecycle.callback, fn)
}

function ownershipBoundary(node: ts.Node, owner: ts.Node, checker: ts.TypeChecker) {
  const boundaries: string[] = []
  const pending: OwnershipFunction[] = []
  let current: ts.Node | undefined = node.parent
  while (current && !ts.isSourceFile(current)) {
    if (ownershipFunction(current)) pending.push(current)
    if (ts.isCallExpression(current)) {
      for (let index = pending.length - 1; index >= 0; index--) {
        if (ownershipConsumer(current, pending[index]!, checker)) pending.splice(index, 1)
      }
      const lifecycle = lifecycleOwnershipCall(current, checker)
      if (pending.length === 0 && lifecycle) {
        boundaries.push(`${lifecycle.target.receiver}.${lifecycle.target.name}`)
      }
    }
    if (ts.isNewExpression(current)) {
      for (let index = pending.length - 1; index >= 0; index--) {
        if (ownershipConsumer(current, pending[index]!, checker)) pending.splice(index, 1)
      }
    }
    if (ts.isIfStatement(current)) {
      const branch = current.elseStatement && nodeInside(current.elseStatement, node) ? "else" : "then"
      const condition = createHash("sha256").update(normalize(current.expression)).digest("hex").slice(0, 6)
      boundaries.push(`if:${condition}:${branch}`)
    }
    if (ts.isCaseClause(current)) boundaries.push(`case:${normalize(current.expression)}`)
    if (ts.isDefaultClause(current)) boundaries.push("case:default")
    if (ts.isTryStatement(current)) {
      const phase = current.catchClause && nodeInside(current.catchClause, node)
        ? "catch"
        : current.finallyBlock && nodeInside(current.finallyBlock, node)
          ? "finally"
          : "try"
      boundaries.push(`try:${phase}`)
    }
    current = current.parent
  }
  return `${boundaries.reverse().join(">") || "direct"}@${owningRole(owner)}`
}

function candidateRole(node: ts.Node, source: ts.SourceFile) {
  if (ts.isCallExpression(node)) {
    const property = callProperty(node)
    if (property) {
      const literal = node.arguments[0]
      return literal && ts.isStringLiteral(literal) ? `${property.name}:${literal.text}` : property.name
    }
    return node.expression.getText(source)
  }
  if (ts.isNewExpression(node)) return `new:${node.expression.getText(source)}`
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  if (ts.isForOfStatement(node)) return "for-await"
  if (ts.isVoidExpression(node)) return "void"
  return ts.SyntaxKind[node.kind]
}

function scanCandidates(input: ParsedSource): Candidate[] {
  const found: Candidate[] = []
  const scanLowConfidence = isGenerationProducerSurface(input.relative)
  const declarations: Array<ts.ParameterDeclaration | ts.VariableDeclaration> = []
  const functions: ts.FunctionDeclaration[] = []
  const timerAssignments: Array<{
    node: ts.BinaryExpression
    binding: ts.Identifier
    source: ts.Expression
    member?: string
    symbol?: ts.Symbol
  }> = []
  const asyncQueueBindings = new Set<string>()
  const websocketUpgradeBindings = new Set(["upgradeWebSocket"])
  const timerMemberName = (name: ts.PropertyName) =>
    ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)
      ? name.expression.text
      : nameText(name)
  const collectDeclarations = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name) functions.push(node)
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (ts.isIdentifier(node.left)) {
        timerAssignments.push({ node, binding: node.left, source: node.right })
      }
      if (ts.isObjectLiteralExpression(node.left)) {
        for (const property of node.left.properties) {
          const binding = ts.isShorthandPropertyAssignment(property)
            ? property.name
            : ts.isPropertyAssignment(property) && ts.isIdentifier(property.initializer)
              ? property.initializer
              : ts.isPropertyAssignment(property) &&
                  ts.isBinaryExpression(property.initializer) &&
                  property.initializer.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
                  ts.isIdentifier(property.initializer.left)
                ? property.initializer.left
                : undefined
          const member = ts.isShorthandPropertyAssignment(property) || ts.isPropertyAssignment(property)
            ? timerMemberName(property.name)
            : undefined
          if (binding && member) {
            timerAssignments.push({
              node,
              binding,
              source: node.right,
              member,
              symbol: ts.isShorthandPropertyAssignment(property)
                ? input.checker.getShorthandAssignmentValueSymbol(property)
                : undefined,
            })
          }
        }
      }
    }
    if ((ts.isParameter(node) || ts.isVariableDeclaration(node)) && ts.isIdentifier(node.name)) {
      declarations.push(node)
      if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        ts.isNewExpression(node.initializer) &&
        node.initializer.expression.getText(input.source) === "AsyncQueue"
      ) {
        asyncQueueBindings.add(node.name.text)
      }
      if (
        ts.isParameter(node) &&
        node.type &&
        /\bUpgradeWebSocket\b/.test(node.type.getText(input.source))
      ) {
        websocketUpgradeBindings.add(node.name.text)
      }
    }
    node.forEachChild(collectDeclarations)
  }
  collectDeclarations(input.source)
  const lexicalScope = (node: ts.Node) => {
    let current: ts.Node | undefined = node.parent
    while (current) {
      if (
        ts.isBlock(current) ||
        ts.isSourceFile(current) ||
        ts.isFunctionDeclaration(current) ||
        ts.isFunctionExpression(current) ||
        ts.isArrowFunction(current) ||
        ts.isMethodDeclaration(current)
      ) {
        return current
      }
      current = current.parent
    }
    return input.source
  }
  const containsNode = (ancestor: ts.Node, node: ts.Node) =>
    ancestor.getStart(input.source) <= node.getStart(input.source) && ancestor.end >= node.end
  const declarationFor = (node: ts.Identifier) =>
    declarations
      .filter(
        (declaration) =>
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === node.text &&
          declaration.getStart(input.source) <= node.getStart(input.source) &&
          containsNode(lexicalScope(declaration), node),
      )
      .sort((left, right) => right.getStart(input.source) - left.getStart(input.source))[0]
  const resolveAlias = (node: ts.Expression | undefined, seen = new Set<ts.Node>()): ts.Expression | undefined => {
    if (!node || seen.has(node)) return node
    seen.add(node)
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      return resolveAlias(node.expression, seen)
    }
    if (!ts.isIdentifier(node)) return node
    const declaration = declarationFor(node)
    return declaration?.initializer ? resolveAlias(declaration.initializer, seen) : node
  }
  const resolvedText = (node: ts.Expression | undefined): string | undefined => {
    const resolved = resolveAlias(node)
    if (!resolved) return undefined
    if (ts.isPropertyAccessExpression(resolved)) {
      return `${resolvedText(resolved.expression) ?? normalize(resolved.expression)}.${resolved.name.text}`
    }
    if (ts.isElementAccessExpression(resolved) && ts.isStringLiteralLike(resolved.argumentExpression)) {
      return `${resolvedText(resolved.expression) ?? normalize(resolved.expression)}.${resolved.argumentExpression.text}`
    }
    if (ts.isIdentifier(resolved)) {
      const symbol = input.checker.getSymbolAtLocation(resolved)
      const target = symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? input.checker.getAliasedSymbol(symbol) : symbol
      if (target && target.name !== "unknown") return target.name
    }
    return normalize(resolved)
  }
  const timerKinds = {
    setTimeout: "timer-timeout",
    setInterval: "timer-interval",
    setImmediate: "timer-immediate",
    queueMicrotask: "microtask",
  } as const satisfies Record<string, CandidateKind>
  const importBinding = (identifier: ts.Identifier) => {
    const symbol = input.checker.getSymbolAtLocation(identifier)
    for (const declaration of symbol?.declarations ?? []) {
      let current: ts.Node | undefined = declaration
      while (current && !ts.isImportDeclaration(current) && !ts.isSourceFile(current)) current = current.parent
      if (!current || !ts.isImportDeclaration(current) || !ts.isStringLiteralLike(current.moduleSpecifier)) continue
      if (ts.isImportSpecifier(declaration)) {
        return {
          module: current.moduleSpecifier.text,
          name: declaration.propertyName?.text ?? declaration.name.text,
          namespace: false,
        }
      }
      if (ts.isNamespaceImport(declaration)) {
        return { module: current.moduleSpecifier.text, name: "*", namespace: true }
      }
    }
    return undefined
  }
  const sourceDeclaration = (identifier: ts.Identifier) =>
    input.checker.getSymbolAtLocation(identifier)?.declarations?.some(
      (declaration) => declaration.getSourceFile() === input.source,
    ) ?? false
  const timerModules = new Set(["node:timers", "timers"])
  const globalTimerRoots = new Set(["globalThis", "window", "global", "self"])
  const timerStatementListParent = (node: ts.Node) => {
    const parent = node.parent
    return ts.isSourceFile(parent) ||
      ts.isBlock(parent) ||
      ts.isModuleBlock(parent) ||
      ts.isCaseClause(parent) ||
      ts.isDefaultClause(parent)
      ? parent
      : undefined
  }
  const timerDirectDefinitionStatement = (definition: ts.Node) => {
    const variable = ts.isVariableDeclaration(definition)
      ? definition
      : ts.isBindingElement(definition) &&
          ts.isObjectBindingPattern(definition.parent) &&
          ts.isVariableDeclaration(definition.parent.parent)
        ? definition.parent.parent
        : undefined
    if (
      variable &&
      ts.isVariableDeclarationList(variable.parent) &&
      ts.isVariableStatement(variable.parent.parent) &&
      timerStatementListParent(variable.parent.parent)
    ) {
      return variable.parent.parent
    }
    if (!ts.isBinaryExpression(definition) || definition.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
      return undefined
    }
    let current: ts.Node = definition
    while (
      ts.isParenthesizedExpression(current.parent) ||
      ts.isAsExpression(current.parent) ||
      ts.isTypeAssertionExpression(current.parent) ||
      ts.isSatisfiesExpression(current.parent) ||
      ts.isNonNullExpression(current.parent)
    ) {
      current = current.parent
    }
    return ts.isExpressionStatement(current.parent) && timerStatementListParent(current.parent)
      ? current.parent
      : undefined
  }
  const timerDirectReferenceStatement = (reference: ts.Identifier) => {
    let current: ts.Node = reference
    while (current.parent) {
      if (timerStatementListParent(current)) return current
      if (ownershipFunction(current)) return undefined
      current = current.parent
    }
    return undefined
  }
  const timerDirectStatementContext = (statement: ts.Node) => {
    let entry = statement
    let list = timerStatementListParent(entry)
    if (!list) return undefined
    while (ts.isBlock(list)) {
      const parent = timerStatementListParent(list)
      if (!parent) break
      entry = list
      list = parent
    }
    return list ? { entry, list } : undefined
  }
  const timerDominatesReference = (definition: ts.Node, reference: ts.Identifier) => {
    const statement = timerDirectDefinitionStatement(definition)
    const use = timerDirectReferenceStatement(reference)
    const definitionContext = statement && timerDirectStatementContext(statement)
    const useContext = use && timerDirectStatementContext(use)
    return !!statement &&
      !!use &&
      !!definitionContext &&
      !!useContext &&
      statement.getSourceFile() === use.getSourceFile() &&
      definitionContext.list === useContext.list &&
      definition.getStart(definition.getSourceFile()) < reference.getStart(reference.getSourceFile())
  }
  const unwrapTimerExpression = (expression: ts.Expression): ts.Expression => {
    if (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isTypeAssertionExpression(expression) ||
      ts.isSatisfiesExpression(expression) ||
      ts.isNonNullExpression(expression)
    ) {
      return unwrapTimerExpression(expression.expression)
    }
    return expression
  }
  type TimerDefinition = { node: ts.Node; source?: ts.Expression; member?: string }
  const timerReachingDefinitions = (value: ts.Identifier) => {
    const symbol = input.checker.getSymbolAtLocation(value)
    const definitions: TimerDefinition[] = [
      ...(symbol?.declarations ?? []).flatMap<TimerDefinition>((declaration) => {
        if (declaration.getSourceFile() !== input.source) return []
        if (declaration.getStart(input.source) >= value.getStart(input.source)) return []
        if (ts.isVariableDeclaration(declaration)) {
          return declaration.initializer ? [{ node: declaration, source: declaration.initializer }] : []
        }
        if (!ts.isBindingElement(declaration) || !ts.isObjectBindingPattern(declaration.parent)) return []
        const binding = declaration.parent.parent
        const member = declaration.propertyName
          ? timerMemberName(declaration.propertyName)
          : ts.isIdentifier(declaration.name)
            ? declaration.name.text
            : undefined
        return ts.isVariableDeclaration(binding)
          ? [{ node: declaration, source: binding.initializer, member }]
          : []
      }),
      ...timerAssignments.filter(
        (assignment) =>
          assignment.node.getStart(input.source) < value.getStart(input.source) &&
          (assignment.symbol ?? input.checker.getSymbolAtLocation(assignment.binding)) === symbol,
      ),
    ]
    const dominant = definitions
      .filter((definition) => timerDominatesReference(definition.node, value))
      .sort((left, right) => right.node.getStart(input.source) - left.node.getStart(input.source))[0]
    return {
      symbol,
      definitions: dominant
        ? definitions.filter(
            (definition) => definition.node.getStart(input.source) >= dominant.node.getStart(input.source),
          )
        : definitions,
    }
  }
  const timerRoot = (
    expression: ts.Expression,
    seen = new Set<ts.Node>(),
    allowTimerModule = true,
  ): boolean => {
    const value = unwrapTimerExpression(expression)
    if (seen.has(value)) return false
    seen.add(value)
    if (ts.isConditionalExpression(value)) {
      return timerRoot(value.whenTrue, new Set(seen), allowTimerModule) ||
        timerRoot(value.whenFalse, new Set(seen), allowTimerModule)
    }
    if (
      ts.isBinaryExpression(value) &&
      new Set([ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken]).has(value.operatorToken.kind)
    ) {
      return timerRoot(value.right, new Set(seen), allowTimerModule)
    }
    if (
      ts.isBinaryExpression(value) &&
      new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(value.operatorToken.kind)
    ) {
      return timerRoot(value.left, new Set(seen), allowTimerModule) ||
        timerRoot(value.right, new Set(seen), allowTimerModule)
    }
    if (!ts.isIdentifier(value)) return false
    const imported = importBinding(value)
    if (allowTimerModule && imported?.namespace && timerModules.has(imported.module)) return true
    const resolved = timerReachingDefinitions(value)
    if (resolved.definitions.length > 0) {
      return resolved.definitions.some(
        (definition) =>
          !definition.member &&
          !!definition.source &&
          timerRoot(definition.source, new Set(seen), allowTimerModule),
      )
    }
    const declarations = resolved.symbol?.declarations ?? []
    if (declarations.length === 0 || declarations.every((declaration) => declaration.getSourceFile() !== input.source)) {
      return globalTimerRoots.has(value.text)
    }
    return false
  }
  const timerKind = (expression: ts.Expression, seen = new Set<ts.Node>()): ReadonlySet<CandidateKind> => {
    const value = unwrapTimerExpression(expression)
    if (seen.has(value)) return new Set()
    seen.add(value)
    if (ts.isConditionalExpression(value)) {
      return new Set([
        ...timerKind(value.whenTrue, new Set(seen)),
        ...timerKind(value.whenFalse, new Set(seen)),
      ])
    }
    if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.CommaToken) {
      return timerKind(value.right, new Set(seen))
    }
    if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return timerKind(value.right, new Set(seen))
    }
    if (
      ts.isBinaryExpression(value) &&
      new Set([
        ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.QuestionQuestionToken,
      ]).has(value.operatorToken.kind)
    ) {
      return new Set([
        ...timerKind(value.left, new Set(seen)),
        ...timerKind(value.right, new Set(seen)),
      ])
    }
    if (ts.isCallExpression(value) && callProperty(value)?.name === "bind") {
      if (ts.isPropertyAccessExpression(value.expression) || ts.isElementAccessExpression(value.expression)) {
        return timerKind(value.expression.expression, new Set(seen))
      }
    }
    if (ts.isIdentifier(value)) {
      const imported = importBinding(value)
      if (imported && timerModules.has(imported.module)) {
        const kind = timerKinds[imported.name as keyof typeof timerKinds]
        return new Set(kind && kind !== "microtask" ? [kind] : [])
      }
      const resolved = timerReachingDefinitions(value)
      const kinds = resolved.definitions.flatMap<CandidateKind>((definition) => {
        if (definition.member && definition.source) {
          if (!(definition.member in timerKinds)) return []
          const kind = timerKinds[definition.member as keyof typeof timerKinds]
          if (!timerRoot(definition.source, new Set(seen), kind !== "microtask")) return []
          return [kind]
        }
        return definition.source ? [...timerKind(definition.source, new Set(seen))] : []
      })
      if (kinds.length > 0) return new Set(kinds)
      if (sourceDeclaration(value)) return new Set()
      const kind = timerKinds[value.text as keyof typeof timerKinds]
      return new Set(kind ? [kind] : [])
    }
    if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
      const property = ts.isPropertyAccessExpression(value)
        ? value.name.text
        : ts.isStringLiteralLike(value.argumentExpression)
          ? value.argumentExpression.text
          : undefined
      if (property && new Set(["call", "apply"]).has(property)) {
        return timerKind(value.expression, new Set(seen))
      }
      if (!property || !(property in timerKinds)) return new Set()
      const kind = timerKinds[property as keyof typeof timerKinds]
      if (!timerRoot(value.expression, new Set(seen), kind !== "microtask")) return new Set()
      return new Set([kind])
    }
    return new Set()
  }
  const includesStringType = (node: ts.Expression) => {
    const seen = new Set<ts.Type>()
    const visit = (type: ts.Type): boolean => {
      if (seen.has(type)) return false
      seen.add(type)
      if (type.isUnionOrIntersection() && type.types.some(visit)) return true
      if ((type.flags & ts.TypeFlags.StringLike) !== 0 || input.checker.typeToString(type) === "string") return true
      const constraint = input.checker.getBaseConstraintOfType(type)
      return !!constraint && constraint !== type && visit(constraint)
    }
    return visit(input.checker.getTypeAtLocation(node))
  }
  const legacyStringArgument = (node: ts.Expression | undefined, seen = new Set<ts.Node>()): boolean => {
    if (!node) return true
    if (seen.has(node)) return false
    seen.add(node)
    if (includesStringType(node)) return true
    if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) return true
    if (ts.isIdentifier(node)) {
      const declaration = declarationFor(node)
      if (!declaration) return false
      return !!declaration.initializer && legacyStringArgument(declaration.initializer, seen)
    }
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      return legacyStringArgument(node.expression)
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      return legacyStringArgument(node.left, seen) || legacyStringArgument(node.right, seen)
    }
    if (ts.isConditionalExpression(node)) {
      return legacyStringArgument(node.whenTrue, seen) || legacyStringArgument(node.whenFalse, seen)
    }
    if (ts.isCallExpression(node)) {
      const callee = resolvedText(node.expression) ?? node.expression.getText(input.source)
      const identifier = ts.isIdentifier(node.expression) ? node.expression : undefined
      const declaration = identifier
        ? functions.find((item) => item.name?.text === identifier.text && item.getStart(input.source) <= node.getStart(input.source))
        : undefined
      return /(?:^|\.)(?:resolve|join|dirname|normalize)$/.test(callee) ||
        callee === "String" ||
        !!declaration?.type && /\bstring\b/.test(declaration.type.getText(input.source))
    }
    return false
  }
  const add = (kind: CandidateKind, node: ts.Node) => {
    const owner = owningNode(node)
    found.push({
      file: input.relative,
      symbol: enclosingSymbol(node),
      kind,
      form: ts.isCallExpression(node)
        ? "call"
        : ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)
          ? "declaration"
          : "reference",
      line: input.source.getLineAndCharacterOfPosition(node.getStart(input.source)).line + 1,
      start: node.getStart(input.source),
      end: node.end,
      signature: normalize(node),
      ownerKey: `${input.relative}:${owner.getStart(input.source)}:${owner.end}`,
      ownerRole: owningRole(owner),
      ownerSignature: normalize(owner),
      boundary: ownershipBoundary(node, owner, input.checker),
      candidateRole: candidateRole(node, input.source),
    })
  }
  const addLowConfidence = (kind: CandidateKind, node: ts.Node) => {
    if (scanLowConfidence) add(kind, node)
  }
  const discardedPromiseContinuation = (node: ts.CallExpression) => {
    let current: ts.Node = node
    while (current.parent) {
      if (
        ts.isPropertyAccessExpression(current.parent) &&
        current.parent.expression === current &&
        ts.isCallExpression(current.parent.parent) &&
        current.parent.parent.expression === current.parent
      ) {
        current = current.parent.parent
        continue
      }
      if (ts.isParenthesizedExpression(current.parent)) {
        current = current.parent
        continue
      }
      if (ts.isVoidExpression(current.parent) && current.parent.expression === current) {
        current = current.parent
        continue
      }
      return ts.isExpressionStatement(current.parent)
    }
    return false
  }
  const visit = (node: ts.Node) => {
    if (ts.isVoidExpression(node)) addLowConfidence("naked-void", node)
    if (ts.isForOfStatement(node) && node.awaitModifier) addLowConfidence("async-iterator", node)
    if (ts.isNewExpression(node) && node.expression.getText(input.source) === "ReadableStream") addLowConfidence("readable-body", node)
    if (
      input.relative === "src/server/proxy.ts" &&
      ts.isNewExpression(node) &&
      node.expression.getText(input.source) === "Response" &&
      node.arguments?.[0] &&
      ts.isPropertyAccessExpression(node.arguments[0]) &&
      node.arguments[0].name.text === "body"
    ) {
      addLowConfidence("readable-body", node)
    }
    if (ts.isNewExpression(node) && node.expression.getText(input.source) === "WritableStream") addLowConfidence("writable-body", node)
    if (ts.isNewExpression(node) && node.expression.getText(input.source) === "TransformStream") addLowConfidence("transform-body", node)
    if (ts.isNewExpression(node) && node.expression.getText(input.source) === "WebSocket") addLowConfidence("websocket-client", node)
    if (ts.isNewExpression(node) && node.expression.getText(input.source) === "Worker") addLowConfidence("native-process", node)
    if (
      (ts.isMethodDeclaration(node) || ts.isPropertyAssignment(node)) &&
      new Set(["onOpen", "onMessage", "onClose", "onError", "onData", "onExit"]).has(nameText(node.name) ?? "") &&
      (ts.isMethodDeclaration(node) ||
        (!!node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))))
    ) {
      addLowConfidence("native-callback", node)
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      /^(?:onopen|onmessage|onclose|onerror|ondata|onexit)$/.test(node.left.name.text) &&
      (ts.isArrowFunction(node.right) || ts.isFunctionExpression(node.right))
    ) {
      addLowConfidence("native-callback", node)
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText(input.source) === "Effect" &&
      (node.name.text === "runFork" || node.name.text.startsWith("fork")) &&
      !(ts.isCallExpression(node.parent) && node.parent.expression === node)
    ) {
      const continuation =
        ts.isCallExpression(node.parent) && node.parent.arguments.includes(node) ? node.parent : node
      add(node.name.text === "runFork" ? "effect-run-fork" : "effect-fork", continuation)
    }
    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "disposeInstance" &&
      !!node.parameters[0]?.type &&
      /\bstring\b/.test(node.parameters[0].type.getText(input.source))
    ) {
      add("dispose-target", node)
    }
    if (ts.isMethodDeclaration(node)) {
      const name = nameText(node.name)
      if (name === "disposeDirectory" || name === "disposeAll") add("legacy-settled-facade", node)
    }
    if (ts.isCallExpression(node)) {
      const property = callProperty(node)
      const callee = node.expression.getText(input.source)
      const resolvedCallee = resolveAlias(node.expression)
      const resolvedProperty = resolvedCallee && ts.isPropertyAccessExpression(resolvedCallee)
        ? { receiver: resolvedText(resolvedCallee.expression) ?? normalize(resolvedCallee.expression), name: resolvedCallee.name.text }
        : resolvedCallee && ts.isElementAccessExpression(resolvedCallee) && ts.isStringLiteralLike(resolvedCallee.argumentExpression)
          ? { receiver: resolvedText(resolvedCallee.expression) ?? normalize(resolvedCallee.expression), name: resolvedCallee.argumentExpression.text }
          : undefined
      const effectiveProperty = resolvedProperty ?? property
      if (
        property &&
        new Set(["then", "catch", "finally"]).has(property.name) &&
        discardedPromiseContinuation(node)
      ) {
        addLowConfidence("detached-promise", node)
      }
      if (property?.receiver === "Effect" && property.name === "runFork") add("effect-run-fork", node)
      if (property?.receiver === "Effect" && property.name.startsWith("fork")) add("effect-fork", node)
      if (
        property?.name === "fork" &&
        property.receiver !== "Effect" &&
        !ts.isYieldExpression(node.parent) &&
        !ts.isAwaitExpression(node.parent)
      ) {
        addLowConfidence("effect-fork", node)
      }
      for (const timer of timerKind(node.expression)) addLowConfidence(timer, node)
      if (effectiveProperty?.receiver === "Instance" && effectiveProperty.name === "bind") add("instance-bind", node)
      if (effectiveProperty?.name === "provideService" && resolvedText(node.arguments[0]) === "InstanceRef") {
        add("instance-ref-provider", node)
      }
      if (effectiveProperty?.name === "provideService" && resolvedText(node.arguments[0]) === "InstanceAdmissionRef") {
        add("admission-ref-provider", node)
      }
      if (
        property?.receiver === "GlobalBus" &&
        property.name === "emit" &&
        node.arguments[0] &&
        ts.isStringLiteralLike(node.arguments[0]) &&
        node.arguments[0].text === "event"
      ) {
        add("global-event-publisher", node)
      }
      if (callee === "streamSSE") addLowConfidence("sse-body", node)
      if (callee === "stream") addLowConfidence("readable-body", node)
      if (websocketUpgradeBindings.has(callee)) addLowConfidence("websocket-upgrade", node)
      if (property && new Set(["getReader", "getWriter", "pipeThrough", "pipeTo"]).has(property.name)) {
        addLowConfidence("stream-continuation", node)
      }
      if (property?.name === "next" && asyncQueueBindings.has(property.receiver)) add("tui-long-poll", node)
      if (property?.receiver === "Bun" && property.name === "spawn") addLowConfidence("native-process", node)
      const callbackAt = (index: number) => {
        const argument = node.arguments[index]
        return !!argument && (ts.isIdentifier(argument) || ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))
      }
      const callbackMethod = property?.name
      const callbackPosition = callbackMethod && new Set([
        "on",
        "addEventListener",
        "addListener",
        "once",
        "onNotification",
        "onRequest",
        "setNotificationHandler",
        "setRequestHandler",
      ]).has(callbackMethod)
        ? 1
        : callbackMethod &&
            new Set(["onAbort", "onData", "onExit", "subscribe", "subscribeAll", "subscribeCallback"]).has(callbackMethod)
          ? 0
          : undefined
      if (property?.receiver !== "Effect" && callbackPosition !== undefined && callbackAt(callbackPosition)) {
        addLowConfidence("native-callback", node)
      }
      if (
        input.relative === "src/server/adapter.node.ts" &&
        property?.name === "close" &&
        callbackAt(0)
      ) {
        addLowConfidence("native-callback", node)
      }
      if (effectiveProperty?.receiver === "Instance" && new Set(["disposeDirectory", "disposeAll"]).has(effectiveProperty.name)) {
        add("legacy-settled-facade", node)
      }
      const resolvedCallName = resolvedText(node.expression)
      if (resolvedCallName === "disposeInstance" && legacyStringArgument(node.arguments[0])) add("dispose-target", node)
    }
    node.forEachChild(visit)
  }
  visit(input.source)
  return found
}

function formatSignals(candidates: Candidate[]) {
  const counts = candidates.reduce((result, candidate) => {
    result.set(candidate.kind, (result.get(candidate.kind) ?? 0) + 1)
    return result
  }, new Map<CandidateKind, number>())
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, count]) => `${kind}=${count}`)
    .join(";")
}

function fingerprint(candidates: Candidate[]) {
  return createHash("sha256")
    .update(
      [
        ...candidates
          .map(
            (candidate) =>
              `owner:${candidate.ownerSignature}:${candidate.kind}:${candidate.form}:${candidate.symbol}:${candidate.boundary}:${candidate.candidateRole}:${candidate.signature}`,
          )
          .sort(),
      ].join("\n"),
    )
    .digest("hex")
    .slice(0, 16)
}

function summarizeCandidates(candidates: Candidate[]): Summary[] {
  const leaderKinds = new Set<CandidateKind>([
    "admission-ref-provider",
    "async-iterator",
    "detached-promise",
    "instance-bind",
    "instance-ref-provider",
    "microtask",
    "naked-void",
    "native-callback",
    "native-process",
    "readable-body",
    "sse-body",
    "stream-continuation",
    "timer-interval",
    "timer-immediate",
    "timer-timeout",
    "transform-body",
    "tui-long-poll",
    "websocket-client",
    "websocket-upgrade",
    "writable-body",
  ])
  const leaderFor = (candidate: Candidate) =>
    candidates
      .filter(
        (possible) =>
          possible.file === candidate.file &&
          leaderKinds.has(possible.kind) &&
          possible.start <= candidate.start &&
          possible.end >= candidate.end,
      )
      .sort(
        (left, right) =>
          right.end - right.start - (left.end - left.start) ||
          left.start - right.start ||
          left.kind.localeCompare(right.kind),
      )[0]
  const grouped = candidates.reduce((result, candidate) => {
    const leader = leaderFor(candidate) ?? candidate
    const key = `${leader.file}:${leader.symbol}:${leader.kind}:${leader.boundary}:${leader.candidateRole}:${leader.ownerSignature}:${leader.signature}`
    const current = result.get(key) ?? []
    current.push(candidate)
    result.set(key, current)
    return result
  }, new Map<string, Candidate[]>())
  const pending = [...grouped.values()]
    .sort((left, right) => left[0]!.file.localeCompare(right[0]!.file) || left[0]!.line - right[0]!.line)
    .map((matches) => {
      const leader = leaderFor(matches[0]!) ?? matches[0]!
      const kind = leader.kind
      const role = leader.ownerRole.replace(/[^a-zA-Z0-9_+.-]+/g, "_")
      const identity = [
        leader.symbol,
        kind,
        role,
        leader.boundary,
        leader.candidateRole,
        leader.ownerSignature,
        leader.signature,
      ].join(":")
      const ownerHash = createHash("sha256").update(identity).digest("hex").slice(0, 10)
      return {
        base: `${leader.file}:${leader.symbol}#${kind}-${role}-${ownerHash}`,
        matches,
      }
    })
  const byBase = pending.reduce((result, item) => {
    const current = result.get(item.base) ?? []
    current.push(...item.matches)
    result.set(item.base, current)
    return result
  }, new Map<string, Candidate[]>())
  return [...byBase.entries()].map(([anchor, matches]) => {
    return {
      anchor,
      file: matches[0]!.file,
      symbol: matches[0]!.symbol,
      signals: formatSignals(matches),
      fingerprint: fingerprint(matches),
      candidates: matches,
    }
  })
}

function productionAnalysis(sourceRoot = defaultSourceRoot): ProductionAnalysis {
  const build = () => {
    const sources = parseSources(sourceRoot, "src")
    const rawSummaries = summarizeCandidates(sources.flatMap(scanCandidates))
    return Object.freeze({
      sources,
      rawSummaries,
      summaries: rawSummaries.filter(
        (summary) => rendererOnlyExclusions.get(summary.anchor) !== summary.fingerprint,
      ),
    })
  }
  if (sourceRoot !== defaultSourceRoot) return build()
  if (defaultProductionAnalysisCache.value) return defaultProductionAnalysisCache.value
  defaultProductionAnalysisCache.value = build()
  defaultAnalysisBuildCounts.production++
  return defaultProductionAnalysisCache.value
}

export function inspectCandidateSummaries(sourceRoot = defaultSourceRoot): Summary[] {
  return productionAnalysis(sourceRoot).summaries.map((summary) => ({
    ...summary,
    candidates: summary.candidates.map((candidate) => ({ ...candidate })),
  }))
}

export function rendererOnlyExclusionErrors(
  sourceRoot: string,
  summaries: Summary[],
  enforceFrozenContracts = sourceRoot === defaultSourceRoot,
) {
  const errors: string[] = []
  for (const [anchor, expectedFingerprint] of rendererOnlyExclusions) {
    const separator = anchor.lastIndexOf(":")
    const relative = anchor.slice(0, separator).replace(/^src\//, "")
    if (!existsSync(path.join(sourceRoot, relative))) {
      if (enforceFrozenContracts) errors.push(`renderer-only exclusion source file is missing: ${anchor.split(":", 1)[0]}`)
      continue
    }
    if (summaries.some((summary) => summary.anchor === anchor && summary.fingerprint === expectedFingerprint)) continue
    errors.push(`renderer-only exclusion is missing or changed: ${anchor}`)
  }
  return errors
}

function stripCell(value: string) {
  const trimmed = value.trim()
  if (trimmed.startsWith("`") && trimmed.endsWith("`")) return trimmed.slice(1, -1)
  return trimmed
}

function structuredFields(value: string) {
  return new Map(
    value
      .split(";")
      .map((item) => item.trim())
      .flatMap((item) => {
        const separator = item.indexOf("=")
        return separator > 0 ? [[item.slice(0, separator), item.slice(separator + 1)] as const] : []
      }),
  )
}

function producerConsumerRelation(row: InventoryRow) {
  const fields = structuredFields(row.cells[6])
  const handoff = fields.get("handoff") ?? ""
  const parent = fields.get("parent") ?? ""
  const ownerID = fields.get("ownerID") ?? ""
  if (!handoff && !parent && !ownerID) return undefined
  return `handoff=${handoff};parent=${parent};ownerID=${ownerID}`
}

function producerConsumerRelationErrors(
  rows: InventoryRow[],
  frozen: ReadonlyMap<string, string> = frozenProducerConsumerRelations,
) {
  const actual = rows.reduce((result, row) => {
    const relation = producerConsumerRelation(row)
    if (!relation) return result
    result.set(row.anchor, createHash("sha256").update(relation).digest("hex").slice(0, 16))
    return result
  }, new Map<string, string>())
  const errors = [...actual]
    .filter(([anchor, relation]) => frozen.get(anchor) !== relation)
    .map(([anchor]) => `frozen producer consumer relation changed: ${anchor}`)
  errors.push(
    ...[...frozen.keys()]
      .filter((anchor) => !actual.has(anchor))
      .map((anchor) => `frozen producer consumer relation changed: ${anchor}`),
  )
  return errors
}

function logicalOwnerGroupErrors(rows: InventoryRow[]) {
  const errors: string[] = []
  const byAnchor = new Map(rows.map((row) => [row.anchor, row]))
  const groups = new Map<string, InventoryRow[]>()

  for (const row of rows) {
    const fields = structuredFields(row.cells[6])
    const ownerID = fields.get("ownerID")
    const parent = fields.get("parent")
    if (ownerID) groups.set(ownerID, [...(groups.get(ownerID) ?? []), row])
    if (!parent) continue
    if (!ownerID) {
      errors.push(`nested owner parent requires ownerID at line ${row.line}: ${row.anchor}`)
      continue
    }

    const actual = byAnchor.get(parent)
    if (actual) {
      const actualFields = structuredFields(actual.cells[6])
      if (actualFields.get("ownerID") !== ownerID) {
        errors.push(`nested owner parent ownerID does not match at line ${row.line}: ${parent}`)
      }
      if (actualFields.get("target") !== fields.get("target")) {
        errors.push(`nested owner parent target does not match at line ${row.line}: ${parent}`)
      }
      if (actual.cells[9] !== row.cells[9]) {
        errors.push(`nested owner parent Task does not match at line ${row.line}: ${parent}`)
      }
      if (actual.cells[8] === "nested") {
        errors.push(`nested owner parent must resolve to a non-nested leader at line ${row.line}: ${parent}`)
      }
      continue
    }

    const planned = plannedOwnerParentAnchors.get(parent)
    if (!planned) {
      errors.push(`nested owner parent is not frozen or resolvable at line ${row.line}: ${parent}`)
      continue
    }
    if (planned.ownerID !== ownerID) {
      errors.push(`nested owner parent ownerID does not match at line ${row.line}: ${parent}`)
    }
    if (planned.target !== fields.get("target")) {
      errors.push(`nested owner parent target does not match at line ${row.line}: ${parent}`)
    }
    if (planned.task !== row.cells[9]) {
      errors.push(`nested owner parent Task does not match at line ${row.line}: ${parent}`)
    }
  }

  for (const [ownerID, group] of groups) {
    const leaders = group.filter((row) => row.cells[8] !== "nested")
    const nested = group.filter((row) => row.cells[8] === "nested")
    const plannedParents = new Set(
      nested
        .map((row) => structuredFields(row.cells[6]).get("parent"))
        .filter((parent): parent is string => !!parent && plannedOwnerParentAnchors.has(parent)),
    )
    if (leaders.length === 1) {
      for (const row of nested) {
        if (structuredFields(row.cells[6]).get("parent") === leaders[0]!.anchor) continue
        errors.push(`logical owner group nested row must name its exact leader: ${ownerID} ${row.anchor}`)
      }
      continue
    }
    if (leaders.length === 0 && nested.length === group.length && plannedParents.size === 1) {
      const parent = [...plannedParents][0]!
      for (const row of nested) {
        if (structuredFields(row.cells[6]).get("parent") === parent) continue
        errors.push(`logical owner group nested row must name its exact planned parent: ${ownerID} ${row.anchor}`)
      }
      continue
    }
    errors.push(`logical owner group requires exactly one leader: ${ownerID}`)
  }
  return errors
}

function parseInventory(file: string): { rows: InventoryRow[]; errors: string[] } {
  if (!existsSync(file)) return { rows: [], errors: [`inventory file is missing: ${file}`] }
  const text = readFileSync(file, "utf8")
  const errors = placeholders.test(text) ? ["placeholder inventory cell"] : []
  const rows = text
    .split("\n")
    .map((line, index) => ({ line, number: index + 1 }))
    .filter((entry) => entry.line.trim().startsWith("|") && !/^\|\s*(?:Anchor|-)/.test(entry.line.trim()))
    .flatMap((entry) => {
      const cells = entry.line
        .trim()
        .slice(1, -1)
        .split("|")
        .map(stripCell)
      if (cells.length === 3) return []
      if (cells.length !== 11) {
        errors.push(`inventory row ${entry.number} has ${cells.length} cells; expected 11`)
        return []
      }
      if (cells.some((cell) => cell.length === 0)) errors.push(`empty inventory cell at line ${entry.number}`)
      if (cells.some((cell) => placeholders.test(cell))) errors.push(`placeholder inventory cell at line ${entry.number}`)
      const separator = cells[0].lastIndexOf(":")
      if (separator <= 0 || separator === cells[0].length - 1) {
        errors.push(`invalid inventory anchor at line ${entry.number}: ${cells[0]}`)
        return []
      }
      return [
        {
          anchor: cells[0],
          file: cells[0].slice(0, separator),
          symbol: cells[0].slice(separator + 1),
          signals: cells[1],
          fingerprint: cells[2],
          cells,
          line: entry.number,
        },
      ]
    })
  return { rows, errors }
}

function rendererOnlyExclusionDocumentErrors(inventory: string, sourceRoot: string, enforceFrozenContracts: boolean) {
  if (!existsSync(inventory)) return []
  const errors: string[] = []
  const rows = readFileSync(inventory, "utf8")
    .split("\n")
    .map((line) =>
      line.trim().startsWith("|")
        ? line
            .trim()
            .slice(1, -1)
            .split("|")
            .map(stripCell)
        : [],
    )
    .filter((cells) => cells.length === 3 && cells[0] !== "Excluded anchor" && !cells.every((cell) => /^-+$/.test(cell)))

  const documented = new Map<string, string>()
  for (const cells of rows) {
    const anchor = cells[0]!
    const fingerprint = cells[1]!
    if (documented.has(anchor)) errors.push(`duplicate renderer-only exclusion document row: ${anchor}`)
    documented.set(anchor, fingerprint)
    if (rendererOnlyExclusions.get(anchor) !== fingerprint) {
      errors.push(`renderer-only exclusion document row is not frozen or changed: ${anchor}`)
    }
    if (!/^renderer-local .+ generation ownership$/.test(cells[2]!)) {
      errors.push(`renderer-only exclusion document reason is not explicit: ${anchor}`)
    }
  }

  for (const [anchor, fingerprint] of rendererOnlyExclusions) {
    const separator = anchor.lastIndexOf(":")
    const relative = anchor.slice(0, separator).replace(/^src\//, "")
    if (!existsSync(path.join(sourceRoot, relative))) {
      if (enforceFrozenContracts) errors.push(`renderer-only exclusion source file is missing: ${anchor.split(":", 1)[0]}`)
      continue
    }
    if (documented.get(anchor) === fingerprint) continue
    errors.push(`renderer-only exclusion is missing from inventory document: ${anchor}`)
  }
  return errors
}

function validateInventory(
  inventory: string,
  sources: ParsedSource[],
  tests: ParsedSource[],
  summaries: Summary[],
  enforceFrozenContracts = false,
) {
  const parsed = parseInventory(inventory)
  const errors = [...parsed.errors]
  if (enforceFrozenContracts && !readFileSync(inventory, "utf8").includes(remoteRelayContract)) {
    errors.push("planned RemoteRelayOwner contract is missing or changed")
  }
  const sourceByPath = new Map(sources.map((source) => [source.relative, source]))
  const summaryByAnchor = new Map(summaries.map((summary) => [summary.anchor, summary]))
  const inventoryByAnchor = new Map(parsed.rows.map((row) => [row.anchor, row]))
  const rowsByAnchor = new Map<string, InventoryRow>()
  const referencedPlannedHandoffs = new Set<string>()
  const referencedPlannedParents = new Set<string>()
  for (const row of parsed.rows) {
    if (rowsByAnchor.has(row.anchor)) errors.push(`duplicate inventory anchor: ${row.anchor}`)
    rowsByAnchor.set(row.anchor, row)
    const source = sourceByPath.get(row.file)
    const baseSymbol = row.symbol.split("#", 1)[0]!
    if (!summaryByAnchor.has(row.anchor) && (!source || (baseSymbol !== "module" && !source.text.includes(baseSymbol)))) {
      errors.push(`inventory anchor no longer resolves: ${row.anchor}`)
    }
    if (!ownerKinds.has(row.cells[7])) errors.push(`invalid owner kind at line ${row.line}: ${row.cells[7]}`)
    if (!ownershipModes.has(row.cells[8])) errors.push(`invalid ownership mode at line ${row.line}: ${row.cells[8]}`)
    if (!/^(?:instance|filesystem|database|transport|event|none):/.test(row.cells[3])) {
      errors.push(`invalid mutation surface at line ${row.line}: ${row.cells[3]}`)
    }
    if (!/^cancel=\S.*$/.test(row.cells[4])) errors.push(`invalid cancellation input at line ${row.line}: ${row.cells[4]}`)
    if (!/^settle=\S.*$/.test(row.cells[5])) errors.push(`invalid settlement receipt at line ${row.line}: ${row.cells[5]}`)
    if (!/^Task [0-9]$/.test(row.cells[9])) errors.push(`invalid implementing task at line ${row.line}: ${row.cells[9]}`)
    if (row.cells[7] === "process_exempt") {
      if (!/^none:mutation-free\([^)]+\)$/.test(row.cells[3]) || !row.cells[6].includes("process lifetime")) {
        errors.push(`process exemption must be mutation-free at line ${row.line}: ${row.anchor}`)
      }
      if (processExemptions.get(row.anchor) !== row.fingerprint) {
        errors.push(`process exemption is not in the frozen anchor and fingerprint allowlist: ${row.anchor}`)
      }
    } else if (!row.cells[6].includes("target=")) {
      errors.push(`instance-owned row requires a canonical target source at line ${row.line}: ${row.anchor}`)
    }
    if (row.cells[8] === "transferred") {
      const fields = structuredFields(row.cells[6])
      const target = fields.get("target")
      const lease = fields.get("lease")
      const handoff = fields.get("handoff")
      const handoffTarget = fields.get("handoffTarget")
      const wrappers = transferredAuthorityWrappers.get(row.cells[7])
      if (!wrappers?.has(fields.get("replacement") ?? "")) {
        errors.push(`transferred owner replacement wrapper does not match at line ${row.line}: ${row.anchor}`)
      }
      if (!handoff || handoff === row.anchor) {
        errors.push(`transferred row requires an exact independent handoff lease anchor at line ${row.line}: ${row.anchor}`)
      }
      const conditionalTargetLease =
        row.anchor === "src/actor/spawn.ts:forkWork.boundWork#instance-ref-provider-boundWork-91987c3ae1" &&
        lease === "current-or-child-by-target-equality" &&
        fields.get("same-target") === "current-first" &&
        fields.get("cross-target") === "short-child-first"
      if (lease !== "current" && lease !== "child" && !conditionalTargetLease) {
        errors.push(`transferred row requires a target-local lease kind at line ${row.line}: ${row.anchor}`)
      }
      if (!target || handoffTarget !== target) {
        errors.push(`transferred row handoff target must exactly match its canonical target at line ${row.line}: ${row.anchor}`)
      }
      if ((lease === "child" || conditionalTargetLease) && fields.get("cross-target") !== "short-child-first") {
        errors.push(`cross-target transferred row requires short-child-first proof at line ${row.line}: ${row.anchor}`)
      }
      if (handoff) {
        const planned = plannedHandoffAnchors.get(handoff)
        const actual = inventoryByAnchor.get(handoff)
        if (planned) {
          referencedPlannedHandoffs.add(handoff)
          if (planned.task !== row.cells[9] || planned.lease !== lease || planned.target !== target) {
            errors.push(`planned handoff lease metadata does not match transferred row at line ${row.line}: ${handoff}`)
          }
        } else if (actual) {
          const actualFields = structuredFields(actual.cells[6])
          if (actual.cells[7] !== "lease" || actualFields.get("target") !== target) {
            errors.push(`handoff anchor must resolve to a same-target lease row at line ${row.line}: ${handoff}`)
          }
        } else {
          errors.push(`transferred row handoff anchor is not frozen or resolvable at line ${row.line}: ${handoff}`)
        }
      }
    }
    const fields = structuredFields(row.cells[6])
    const ownerID = fields.get("ownerID")
    const parent = fields.get("parent")
    if (parent?.startsWith("planned:")) referencedPlannedParents.add(parent)
    const remoteTarget = ownerID?.startsWith("remote-relay.")
      ? "RemoteRelayOwner.fromProvenance(workspaceID,sourceSlot,serverIncarnation)"
      : undefined
    if (remoteTarget && fields.get("target") !== remoteTarget) {
      errors.push(`RemoteRelayOwner row must use the frozen canonical target at line ${row.line}: ${row.anchor}`)
    }
    if (remoteTarget && /(?:^|\.)Instance\.current/.test(fields.get("target") ?? "")) {
      errors.push(`RemoteRelayOwner row cannot relabel a local Instance generation at line ${row.line}: ${row.anchor}`)
    }
    const test = /^(existing|planned)=(test\/[^:]+\.test\.tsx?):(.{8,})$/.exec(row.cells[10])
    if (!test) {
      errors.push(`invalid deterministic test anchor at line ${row.line}: ${row.cells[10]}`)
    } else if (test[1] === "planned") {
      const planned = plannedDeterministicTests.get(test[2]!)
      if (!planned) {
        errors.push(`planned deterministic test path is not frozen at line ${row.line}: ${row.cells[10]}`)
      } else {
        if (!planned.tasks.has(row.cells[9])) {
          errors.push(`planned deterministic test does not belong to ${row.cells[9]} at line ${row.line}: ${row.cells[10]}`)
        }
        const scenarios = typeof planned.scenario === "string" ? new Set([planned.scenario]) : planned.scenario
        if (!scenarios.has(test[3]!)) {
          errors.push(`planned deterministic scenario is not frozen at line ${row.line}: ${row.cells[10]}`)
        }
      }
    } else if (test[1] === "existing") {
      const source = tests.find((item) => item.relative === test[2])
      if (!source || !source.text.includes(test[3]!)) {
        errors.push(`existing deterministic test anchor no longer resolves at line ${row.line}: ${row.cells[10]}`)
      }
    }
  }
  errors.push(...logicalOwnerGroupErrors(parsed.rows))
  for (const summary of summaries) {
    const row = rowsByAnchor.get(summary.anchor)
    if (!row) {
      errors.push(`unrepresented producer candidates: ${summary.anchor} ${summary.signals}`)
      continue
    }
    if (row.signals !== summary.signals) {
      errors.push(`inventory signals changed for ${summary.anchor}: expected ${row.signals}, found ${summary.signals}`)
    }
    if (row.fingerprint !== summary.fingerprint) {
      errors.push(
        `inventory fingerprint changed for ${summary.anchor}: expected ${row.fingerprint}, found ${summary.fingerprint}`,
      )
    }
    if (summary.candidates.some((candidate) => candidate.kind === "instance-ref-provider")) {
      const migration = task2ProviderMigrations.get(summary.anchor)
      if (
        !migration ||
        row.cells[9] !== "Task 2" ||
        structuredFields(row.cells[6]).get("replacement") !== migration.replacement ||
        row.cells[10] !== migration.test
      ) {
        errors.push(`Task 2 raw provider row requires a replacement wrapper: ${summary.anchor}`)
      }
    }
  }
  for (const row of parsed.rows) {
    if (!summaryByAnchor.has(row.anchor)) errors.push(`inventory row has no matching producer candidate: ${row.anchor}`)
  }
  if (enforceFrozenContracts) {
    errors.push(...producerConsumerRelationErrors(parsed.rows))
    errors.push(...plannedHandoffClosureErrors(referencedPlannedHandoffs))
    errors.push(...plannedOwnerParentClosureErrors(referencedPlannedParents))
    const logicalGroups = new Map<string, Set<string>>()
    for (const row of parsed.rows) {
      const ownerID = structuredFields(row.cells[6]).get("ownerID")
      if (!ownerID) continue
      const anchors = logicalGroups.get(ownerID) ?? new Set<string>()
      anchors.add(row.anchor)
      logicalGroups.set(ownerID, anchors)
    }
    errors.push(...logicalOwnerGroupMembershipErrors(logicalGroups))
  }
  return errors
}

function checkAllowedShapes(
  summaries: Summary[],
  kind: CandidateKind,
  expected: ReadonlyMap<string, string>,
  unauthorized: string,
) {
  const errors: string[] = []
  const actual = new Map(
    summaries
      .filter((summary) => summary.candidates.some((candidate) => candidate.kind === kind))
      .map((summary) => [summary.anchor, summary.fingerprint]),
  )
  for (const summary of summaries) {
    if (!summary.candidates.some((candidate) => candidate.kind === kind)) continue
    if (expected.get(summary.anchor) === summary.fingerprint) continue
    errors.push(`${unauthorized}: ${summary.anchor} (fingerprint ${summary.fingerprint})`)
  }
  for (const [anchor, expectedFingerprint] of expected) {
    if (actual.get(anchor) === expectedFingerprint) continue
    errors.push(`${unauthorized}: frozen anchor is missing or changed: ${anchor}`)
  }
  return errors
}

function helperAllowlist(name: string) {
  if (Object.hasOwn(rawHelperAllowlist, name)) return rawHelperAllowlist[name]
  if (Object.hasOwn(privateJoinAllowlist, name)) return privateJoinAllowlist[name]
  return undefined
}

function exported(node: ts.Node) {
  return ts.canHaveModifiers(node) &&
    !!ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
}

function rawHelperName(node: ts.CallExpression) {
  if (ts.isIdentifier(node.expression)) return node.expression.text
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text
  return undefined
}

function rawHelperCallFingerprint(name: string, node: ts.CallExpression) {
  if (!ts.isIdentifier(node.expression) || node.expression.text !== name) return undefined
  return `${name}(${node.arguments
    .map((argument) => {
      if (!ts.isObjectLiteralExpression(argument)) return "value"
      const names = argument.properties.map((property) => nameText(property.name))
      if (names.some((item) => !item)) return "invalid-object"
      return `{${names.filter((item): item is string => !!item).sort().join(",")}}`
    })
    .join(",")})`
}

function containsAwait(node: ts.Node) {
  let found = false
  const visit = (current: ts.Node) => {
    if (ts.isAwaitExpression(current)) found = true
    if (!found) current.forEachChild(visit)
  }
  visit(node)
  return found
}

function objectProperty(input: ts.ObjectLiteralExpression, name: string) {
  return input.properties.find((property) => nameText(property.name) === name)
}

function propertyExpression(property: ts.ObjectLiteralElementLike | undefined): ts.Expression | undefined {
  if (!property) return undefined
  if (ts.isPropertyAssignment(property)) return property.initializer
  if (ts.isShorthandPropertyAssignment(property)) return property.name
  return undefined
}

function releaseShape(node: ts.CallExpression) {
  const value = node.arguments[0]
  if (!value || !ts.isObjectLiteralExpression(value)) return "invalid" as const
  const ok = propertyExpression(objectProperty(value, "ok"))
  const error = objectProperty(value, "error")
  if (ok?.kind === ts.SyntaxKind.TrueKeyword && value.properties.length === 1) return "success" as const
  if (ok?.kind === ts.SyntaxKind.FalseKeyword && !!error && value.properties.length === 2) return "failure" as const
  return "invalid" as const
}

function returnsPromiseLike(
  callback: ts.Expression | undefined,
  checker: ts.TypeChecker,
  resolve?: (node: ts.Identifier) => readonly ts.Expression[],
  callbacks = new Set<ts.Node>(),
): boolean {
  if (!callback || callbacks.has(callback)) return false
  callbacks.add(callback)
  const typed = checker
    .getTypeAtLocation(callback)
    .getCallSignatures()
    .some((signature) => {
      const result = checker.getReturnTypeOfSignature(signature)
      const hasThen = (type: ts.Type): boolean => {
        if (type.isUnionOrIntersection()) return type.types.some(hasThen)
        if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never)) !== 0) return false
        return !!checker.getPropertyOfType(checker.getApparentType(type), "then")
      }
      return hasThen(result)
    })
  if (typed) return true
  if (ts.isIdentifier(callback)) {
    return (resolve?.(callback) ?? []).some((value) =>
      returnsPromiseLike(value, checker, resolve, new Set(callbacks)),
    )
  }
  if (ts.isConditionalExpression(callback)) {
    return returnsPromiseLike(callback.whenTrue, checker, resolve, new Set(callbacks)) ||
      returnsPromiseLike(callback.whenFalse, checker, resolve, new Set(callbacks))
  }
  if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) return false
  if (callback.modifiers?.some((item) => item.kind === ts.SyntaxKind.AsyncKeyword)) return true
  const seen = new Set<ts.Node>()
  const promiseExpression = (node: ts.Expression): boolean => {
    if (seen.has(node)) return false
    seen.add(node)
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node)
    ) {
      return promiseExpression(node.expression)
    }
    if (ts.isIdentifier(node)) {
      return (resolve?.(node) ?? []).some((value) => promiseExpression(value))
    }
    if (ts.isConditionalExpression(node)) {
      return promiseExpression(node.whenTrue) || promiseExpression(node.whenFalse)
    }
    if (
      ts.isBinaryExpression(node) &&
      new Set([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(
        node.operatorToken.kind,
      )
    ) {
      return promiseExpression(node.left) || promiseExpression(node.right)
    }
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.some((element) => !ts.isOmittedExpression(element) && promiseExpression(element))
    }
    if (ts.isNewExpression(node)) return node.expression.getText(node.getSourceFile()) === "Promise"
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(node.getSourceFile())
      return callee === "Promise" || callee.startsWith("Promise.")
    }
    if (ts.isObjectLiteralExpression(node)) return node.properties.some((property) => nameText(property.name) === "then")
    return false
  }
  if (!ts.isBlock(callback.body)) return promiseExpression(callback.body)
  let found = false
  const visit = (node: ts.Node) => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isClassExpression(node)
    ) {
      return
    }
    if (ts.isReturnStatement(node) && node.expression && promiseExpression(node.expression)) found = true
    if (!found) node.forEachChild(visit)
  }
  visit(callback.body)
  return found
}

function nearestFunction(node: ts.Node) {
  let current: ts.Node | undefined = node
  while (current) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current)
    ) {
      return current
    }
    current = current.parent
  }
  return undefined
}

function nodeInside(ancestor: ts.Node, node: ts.Node) {
  return ancestor.getStart(ancestor.getSourceFile()) <= node.getStart(node.getSourceFile()) && ancestor.end >= node.end
}

function nonThrowingDirectReturn(expression: ts.Expression | undefined): boolean {
  if (!expression) return true
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isNonNullExpression(expression)
  ) {
    return nonThrowingDirectReturn(expression.expression)
  }
  return ts.isIdentifier(expression) ||
    ts.isStringLiteralLike(expression) ||
    ts.isNumericLiteral(expression) ||
    ts.isBigIntLiteral(expression) ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.NullKeyword
}

function authorityErrors(files: ParsedSource[]) {
  const errors: string[] = []
  const relativeBySource = new Map(files.map((file) => [file.source, file.relative]))
  const sourceByRelative = new Map(files.map((file) => [file.relative, file]))
  const localBindingDefinitionCache = new Map<string, Array<{ node: ts.Node; value: ts.Expression }>>()
  const moduleExportDefinitionCache = new Map<string, Array<{ node: ts.Node; value: ts.Expression }>>()
  const moduleSourceCache = new Map<string, ParsedSource | undefined>()
  const propertyValueCache = new WeakMap<ts.Node, ts.Expression[]>()
  const symbolAtLocationCache = new WeakMap<ts.Node, ts.Symbol | null>()
  const aliasedSymbolCache = new WeakMap<ts.Symbol, ts.Symbol>()
  const symbolAt = (node: ts.Node, checker: ts.TypeChecker) => {
    if (symbolAtLocationCache.has(node)) return symbolAtLocationCache.get(node) ?? undefined
    const symbol = checker.getSymbolAtLocation(node)
    symbolAtLocationCache.set(node, symbol ?? null)
    return symbol
  }
  const aliasedSymbol = (symbol: ts.Symbol, checker: ts.TypeChecker) => {
    if ((symbol.flags & ts.SymbolFlags.Alias) === 0) return symbol
    const cached = aliasedSymbolCache.get(symbol)
    if (cached) return cached
    const target = checker.getAliasedSymbol(symbol)
    aliasedSymbolCache.set(symbol, target)
    return target
  }
  for (const file of files) {
    const calls: ts.CallExpression[] = []
    const assignments: ts.BinaryExpression[] = []
    const forOfBindings: Array<{ binding: ts.Identifier; node: ts.ForOfStatement; value: ts.Expression }> = []
    const leaseDeclarations: ts.VariableDeclaration[] = []
    const rawHelperCalls = new Map<string, ts.CallExpression[]>()
    const privateJoinCalls = new Map<string, string[]>()
    const collect = (node: ts.Node) => {
      if (ts.isCallExpression(node)) calls.push(node)
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) assignments.push(node)
      if (ts.isForOfStatement(node)) {
        if (ts.isVariableDeclarationList(node.initializer)) {
          for (const declaration of node.initializer.declarations) {
            if (ts.isIdentifier(declaration.name)) {
              forOfBindings.push({ binding: declaration.name, node, value: node.expression })
            }
          }
        } else if (ts.isIdentifier(node.initializer)) {
          forOfBindings.push({ binding: node.initializer, node, value: node.expression })
        }
      }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isCallExpression(node.initializer) &&
        new Set(["acquireGenerationLease", "acquireChildGenerationLease"]).has(
          node.initializer.expression.getText(file.source),
        )
      ) {
        leaseDeclarations.push(node)
      }
      node.forEachChild(collect)
    }
    collect(file.source)
    const ownerOf = (node: ts.Node) => sourceByRelative.get(relativeBySource.get(node.getSourceFile()) ?? "")
    const checkerFor = (node: ts.Node) => ownerOf(node)?.checker ?? file.checker
    const resolveSymbol = (identifier: ts.Identifier) => {
      const checker = checkerFor(identifier)
      const symbol = ts.isShorthandPropertyAssignment(identifier.parent)
        ? checker.getShorthandAssignmentValueSymbol(identifier.parent)
        : symbolAt(identifier, checker)
      return symbol ? aliasedSymbol(symbol, checker) : undefined
    }
    const resolveSymbolDeclarations = (identifier: ts.Identifier) => {
      return [...(resolveSymbol(identifier)?.declarations ?? [])]
        .filter(
          (declaration) =>
            (declaration.getSourceFile() !== identifier.getSourceFile() ||
              declaration.getStart(declaration.getSourceFile()) < identifier.getStart(identifier.getSourceFile())) &&
            (!ts.isVariableDeclaration(declaration) ||
              !declaration.initializer ||
              declaration.getSourceFile() !== identifier.getSourceFile() ||
              !nodeInside(declaration.initializer, identifier)),
        )
        .sort(
          (left, right) =>
            right.getStart(right.getSourceFile()) - left.getStart(left.getSourceFile()),
        )
    }
    const statementListParent = (node: ts.Node) => {
      const parent = node.parent
      return ts.isSourceFile(parent) ||
        ts.isBlock(parent) ||
        ts.isModuleBlock(parent) ||
        ts.isCaseClause(parent) ||
        ts.isDefaultClause(parent)
        ? parent
        : undefined
    }
    const directDefinitionStatement = (definition: ts.Node) => {
      if (
        ts.isVariableDeclaration(definition) &&
        ts.isVariableDeclarationList(definition.parent) &&
        ts.isVariableStatement(definition.parent.parent) &&
        statementListParent(definition.parent.parent)
      ) {
        return definition.parent.parent
      }
      if (!ts.isBinaryExpression(definition) || definition.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
        return undefined
      }
      let current: ts.Node = definition
      while (
        ts.isParenthesizedExpression(current.parent) ||
        ts.isAsExpression(current.parent) ||
        ts.isTypeAssertionExpression(current.parent) ||
        ts.isSatisfiesExpression(current.parent) ||
        ts.isNonNullExpression(current.parent)
      ) {
        current = current.parent
      }
      return ts.isExpressionStatement(current.parent) && statementListParent(current.parent)
        ? current.parent
        : undefined
    }
    const directReferenceStatement = (reference: ts.Node) => {
      let current: ts.Node = reference
      while (current.parent) {
        if (statementListParent(current)) return current
        if (
          ts.isFunctionDeclaration(current) ||
          ts.isFunctionExpression(current) ||
          ts.isArrowFunction(current) ||
          ts.isMethodDeclaration(current) ||
          ts.isGetAccessorDeclaration(current) ||
          ts.isSetAccessorDeclaration(current) ||
          ts.isConstructorDeclaration(current)
        ) {
          return undefined
        }
        current = current.parent
      }
      return undefined
    }
    const directStatementContext = (statement: ts.Node) => {
      let entry = statement
      let list = statementListParent(entry)
      if (!list) return undefined
      while (ts.isBlock(list)) {
        const parent = statementListParent(list)
        if (!parent) break
        entry = list
        list = parent
      }
      return list ? { entry, list } : undefined
    }
    const dominatesReference = (definition: ts.Node, reference: ts.Node) => {
      const statement = directDefinitionStatement(definition)
      const use = directReferenceStatement(reference)
      const definitionContext = statement && directStatementContext(statement)
      const useContext = use && directStatementContext(use)
      return !!statement &&
        !!use &&
        !!definitionContext &&
        !!useContext &&
        statement.getSourceFile() === use.getSourceFile() &&
        definitionContext.list === useContext.list &&
        definition.getStart(definition.getSourceFile()) < reference.getStart(reference.getSourceFile())
    }
    const resolveVariableDeclarations = (identifier: ts.Identifier) =>
      resolveSymbolDeclarations(identifier).filter(
        (declaration): declaration is ts.VariableDeclaration => ts.isVariableDeclaration(declaration),
      )
    const resolveModuleSource = (importer: string, specifier: string) => {
      const cacheKey = `${importer}:${specifier}`
      if (moduleSourceCache.has(cacheKey)) return moduleSourceCache.get(cacheKey)
      const base = specifier.startsWith("@/")
        ? `src/${specifier.slice(2)}`
        : specifier.startsWith(".")
          ? path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier))
          : undefined
      if (!base) return undefined
      const stem = /\.(?:[cm]?js|jsx)$/.test(base) ? base.replace(/\.(?:[cm]?js|jsx)$/, "") : base
      const resolved = [...new Set([
        base,
        stem,
        `${stem}.ts`,
        `${stem}.tsx`,
        `${stem}.mts`,
        `${stem}.cts`,
        `${stem}.d.ts`,
        `${stem}/index.ts`,
        `${stem}/index.tsx`,
        `${stem}/index.mts`,
        `${stem}/index.cts`,
      ])].map((candidate) => sourceByRelative.get(candidate)).find((candidate) => !!candidate)
      moduleSourceCache.set(cacheKey, resolved)
      return resolved
    }
    function localBindingDefinitions(
      source: ParsedSource,
      name: string,
      seen = new Set<string>(),
      limit: ts.Node = source.source,
    ) {
      const limitPosition = ts.isSourceFile(limit) ? limit.end : limit.getStart(limit.getSourceFile())
      const cacheKey = `${source.relative}:${name}:${limitPosition}`
      const cacheable = seen.size === 0
      if (cacheable && localBindingDefinitionCache.has(cacheKey)) {
        return localBindingDefinitionCache.get(cacheKey)!
      }
      const key = `binding:${source.relative}:${name}`
      if (seen.has(key)) return []
      seen.add(key)
      const bindings = source.source.statements.flatMap((statement) => {
        if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return [statement.name]
        if (ts.isVariableStatement(statement)) {
          return statement.declarationList.declarations.flatMap((declaration) =>
            ts.isIdentifier(declaration.name) && declaration.name.text === name ? [declaration.name] : [],
          )
        }
        if (!ts.isImportDeclaration(statement)) return []
        if (statement.importClause?.name?.text === name) return [statement.importClause.name]
        if (statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
          return statement.importClause.namedBindings.elements.flatMap((element) =>
            element.name.text === name ? [element.name] : [],
          )
        }
        if (
          statement.importClause?.namedBindings &&
          ts.isNamespaceImport(statement.importClause.namedBindings) &&
          statement.importClause.namedBindings.name.text === name
        ) {
          return [statement.importClause.namedBindings.name]
        }
        return []
      })
      const symbol = bindings.map((binding) => symbolAt(binding, source.checker)).find((binding) => !!binding)
      const sameBinding = (identifier: ts.Identifier) => {
        const candidate = symbolAt(identifier, source.checker)
        if (!symbol || !candidate) return identifier.text === name
        return candidate === symbol
      }
      const definitions: Array<{ node: ts.Node; value: ts.Expression }> = []
      const visit = (node: ts.Node) => {
        if (node.getStart(node.getSourceFile()) >= limitPosition && node !== source.source) return
        if (ts.isFunctionDeclaration(node)) {
          if (node.name && sameBinding(node.name)) definitions.push({ node, value: node.name })
          return
        }
        if (
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isGetAccessorDeclaration(node) ||
          ts.isSetAccessorDeclaration(node) ||
          ts.isConstructorDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isClassExpression(node)
        ) {
          return
        }
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && sameBinding(node.name) && node.initializer) {
          definitions.push({ node, value: node.initializer })
        }
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isIdentifier(node.left) &&
          sameBinding(node.left)
        ) {
          definitions.push({ node, value: node.right })
        }
        if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
          const namespace = node.importClause?.namedBindings &&
            ts.isNamespaceImport(node.importClause.namedBindings) &&
            sameBinding(node.importClause.namedBindings.name)
            ? node.importClause.namedBindings.name
            : undefined
          if (namespace) {
            definitions.push({ node, value: namespace })
            return
          }
          const imported = node.importClause?.name && sameBinding(node.importClause.name)
            ? "default"
            : node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
              ? node.importClause.namedBindings.elements.find((element) => sameBinding(element.name))?.propertyName?.text ??
                node.importClause.namedBindings.elements.find((element) => sameBinding(element.name))?.name.text
              : undefined
          const target = imported ? resolveModuleSource(source.relative, node.moduleSpecifier.text) : undefined
          if (target && imported) {
            definitions.push(...moduleExportDefinitions(target, imported, new Set(seen)).map((item) => ({
              node,
              value: item.value,
            })))
          }
          return
        }
        node.forEachChild(visit)
      }
      visit(source.source)
      definitions.sort(
        (left, right) => right.node.getStart(right.node.getSourceFile()) - left.node.getStart(left.node.getSourceFile()),
      )
      const dominant = definitions.find((definition) => {
        if (
          (ts.isImportDeclaration(definition.node) || ts.isFunctionDeclaration(definition.node)) &&
          definition.node.parent === source.source
        ) {
          return true
        }
        const statement = directDefinitionStatement(definition.node)
        return !!statement && directStatementContext(statement)?.list === source.source
      })
      const result = dominant
        ? definitions.filter(
            (definition) =>
              definition.node.getStart(definition.node.getSourceFile()) >=
              dominant.node.getStart(dominant.node.getSourceFile()),
          )
        : definitions
      if (cacheable) localBindingDefinitionCache.set(cacheKey, result)
      return result
    }
    function moduleExportDefinitions(
      source: ParsedSource,
      name: string,
      seen = new Set<string>(),
    ): Array<{ node: ts.Node; value: ts.Expression }> {
      const cacheKey = `${source.relative}:${name}`
      const cacheable = seen.size === 0
      if (cacheable && moduleExportDefinitionCache.has(cacheKey)) {
        return moduleExportDefinitionCache.get(cacheKey)!
      }
      const key = `${source.relative}:${name}`
      if (seen.has(key)) return []
      seen.add(key)
      const definitions = source.source.statements.flatMap<{ node: ts.Node; value: ts.Expression }>((statement) => {
        if (name === "default" && ts.isExportAssignment(statement) && !statement.isExportEquals) {
          return ts.isIdentifier(statement.expression)
            ? localBindingDefinitions(source, statement.expression.text, new Set(seen), statement)
            : [{ node: statement, value: statement.expression }]
        }
        if (
          ts.isFunctionDeclaration(statement) &&
          statement.name &&
          ((name === "default" && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) ||
            (statement.name.text === name && exported(statement)))
        ) {
          return [{ node: statement, value: statement.name }]
        }
        if (ts.isVariableStatement(statement) && exported(statement) && name !== "default") {
          return statement.declarationList.declarations.flatMap((declaration) =>
            ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer
              ? localBindingDefinitions(source, name, new Set(seen))
              : [],
          )
        }
        if (!ts.isExportDeclaration(statement) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
          return []
        }
        return statement.exportClause.elements.flatMap((element) => {
          if (element.name.text !== name) return []
          const imported = element.propertyName?.text ?? element.name.text
          if (!statement.moduleSpecifier || !ts.isStringLiteralLike(statement.moduleSpecifier)) {
            return localBindingDefinitions(source, imported, new Set(seen))
          }
          const target = resolveModuleSource(source.relative, statement.moduleSpecifier.text)
          return target ? moduleExportDefinitions(target, imported, new Set(seen)) : []
        })
      })
      if (cacheable) moduleExportDefinitionCache.set(cacheKey, definitions)
      return definitions
    }
    const importedBindingDefinitions = (identifier: ts.Identifier) => {
      const symbol = symbolAt(identifier, checkerFor(identifier))
      if (!symbol || (symbol.flags & ts.SymbolFlags.Alias) === 0) return []
      return [...(symbol.declarations ?? [])].flatMap<{ node: ts.Node; value: ts.Expression }>((declaration) => {
        let current: ts.Node | undefined = declaration
        while (current && !ts.isImportDeclaration(current) && !ts.isSourceFile(current)) current = current.parent
        if (!current || !ts.isImportDeclaration(current)) return []
        const imported = current.importClause?.name?.text === identifier.text
          ? "default"
          : current.importClause?.namedBindings && ts.isNamedImports(current.importClause.namedBindings)
            ? current.importClause.namedBindings.elements.find((element) => element.name.text === identifier.text)
                ?.propertyName?.text ??
              current.importClause.namedBindings.elements.find((element) => element.name.text === identifier.text)?.name.text
            : undefined
        if (!imported) return []
        if (!ts.isStringLiteralLike(current.moduleSpecifier)) return []
        const importer = relativeBySource.get(identifier.getSourceFile()) ?? file.relative
        const target = resolveModuleSource(importer, current.moduleSpecifier.text)
        return target ? moduleExportDefinitions(target, imported) : []
      })
    }
    const valueDefinitionCache = new WeakMap<ts.Identifier, Array<{ node: ts.Node; value: ts.Expression }>>()
    const resolveValueDefinitions = (identifier: ts.Identifier) => {
      const cached = valueDefinitionCache.get(identifier)
      if (cached) return cached
      const owner = sourceByRelative.get(relativeBySource.get(identifier.getSourceFile()) ?? "")
      if (owner && owner.source !== file.source) {
        const definitions = localBindingDefinitions(owner, identifier.text, new Set(), identifier).filter(
          (definition) => definition.value !== identifier,
        )
        valueDefinitionCache.set(identifier, definitions)
        return definitions
      }
      const symbol = resolveSymbol(identifier)
      const imported = importedBindingDefinitions(identifier)
      const definitions: Array<{ node: ts.Node; value: ts.Expression }> = [
        ...(imported.length > 0
          ? []
          : resolveSymbolDeclarations(identifier).flatMap<{ node: ts.Node; value: ts.Expression }>((declaration) => {
              if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
                return [{ node: declaration, value: declaration.initializer }]
              }
              if (ts.isExportAssignment(declaration)) return [{ node: declaration, value: declaration.expression }]
              return []
            })),
        ...imported,
        ...assignments.flatMap((assignment) =>
          ts.isIdentifier(assignment.left) &&
          assignment.getSourceFile() === identifier.getSourceFile() &&
          resolveSymbol(assignment.left) === symbol &&
          assignment.getStart(file.source) < identifier.getStart(identifier.getSourceFile()) &&
          !nodeInside(assignment.right, identifier)
            ? [{ node: assignment, value: assignment.right }]
            : [],
        ),
        ...forOfBindings.flatMap((binding) =>
          binding.node.getSourceFile() === identifier.getSourceFile() &&
          resolveSymbol(binding.binding) === symbol &&
          binding.node.getStart(binding.node.getSourceFile()) < identifier.getStart(identifier.getSourceFile())
            ? [{ node: binding.node, value: binding.value }]
            : [],
        ),
      ].sort(
        (left, right) =>
          (right.node.getSourceFile() === identifier.getSourceFile()
            ? right.node.getStart(right.node.getSourceFile())
            : -1) -
          (left.node.getSourceFile() === identifier.getSourceFile()
            ? left.node.getStart(left.node.getSourceFile())
            : -1),
      )
      const dominant = definitions.findIndex((definition) => dominatesReference(definition.node, identifier))
      const resolved = dominant === -1 ? definitions : definitions.slice(0, dominant + 1)
      valueDefinitionCache.set(identifier, resolved)
      return resolved
    }
    const resolveValues = (identifier: ts.Identifier) =>
      resolveValueDefinitions(identifier).map((definition) => definition.value)
    const resolveLease = (expression: ts.Expression | undefined) => {
      if (!expression || !ts.isIdentifier(expression)) return undefined
      const definitions = resolveValueDefinitions(expression)
      const declaration = definitions[0]?.node
      return definitions.length === 1 && declaration && ts.isVariableDeclaration(declaration) && leaseDeclarations.includes(declaration)
        ? declaration
        : undefined
    }
    const propertySymbol = (expression: ts.PropertyAccessExpression | ts.ElementAccessExpression) => {
      const checker = checkerFor(expression)
      if (ts.isPropertyAccessExpression(expression)) return symbolAt(expression.name, checker)
      if (!ts.isStringLiteralLike(expression.argumentExpression)) return undefined
      return checker.getPropertyOfType(
        checker.getApparentType(checker.getTypeAtLocation(expression.expression)),
        expression.argumentExpression.text,
      )
    }
    const namespacePropertyDefinitions = (
      expression: ts.PropertyAccessExpression | ts.ElementAccessExpression,
    ) => {
      const member = ts.isPropertyAccessExpression(expression)
        ? expression.name.text
        : ts.isStringLiteralLike(expression.argumentExpression)
          ? expression.argumentExpression.text
          : undefined
      if (!member || !ts.isIdentifier(expression.expression)) return []
      const receiver = expression.expression
      const owner = ownerOf(expression)
      const symbol = symbolAt(receiver, checkerFor(expression))
      if (!symbol || (symbol.flags & ts.SymbolFlags.Alias) === 0) return []
      return [...(symbol.declarations ?? [])].flatMap<{ node: ts.Node; value: ts.Expression }>((declaration) => {
        let current: ts.Node | undefined = declaration
        while (current && !ts.isImportDeclaration(current) && !ts.isSourceFile(current)) current = current.parent
        if (
          !current ||
          !ts.isImportDeclaration(current) ||
          !current.importClause?.namedBindings ||
          !ts.isNamespaceImport(current.importClause.namedBindings) ||
          current.importClause.namedBindings.name.text !== receiver.text ||
          !ts.isStringLiteralLike(current.moduleSpecifier)
        ) {
          return []
        }
        const target = resolveModuleSource(owner?.relative ?? file.relative, current.moduleSpecifier.text)
        return target ? moduleExportDefinitions(target, member) : []
      })
    }
    const returnedExpressions = (body: ts.Block) => {
      const values: ts.Expression[] = []
      const visit = (node: ts.Node) => {
        if (
          node !== body &&
          (ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) ||
            ts.isSetAccessorDeclaration(node) ||
            ts.isConstructorDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isClassExpression(node))
        ) {
          return
        }
        if (ts.isReturnStatement(node) && node.expression) {
          values.push(node.expression)
          return
        }
        node.forEachChild(visit)
      }
      visit(body)
      return values
    }
    const propertyValues = (expression: ts.PropertyAccessExpression | ts.ElementAccessExpression) => {
      if (propertyValueCache.has(expression)) return propertyValueCache.get(expression)!
      const symbol = propertySymbol(expression)
      const values = [
        ...[...(symbol?.declarations ?? [])].flatMap((declaration) => {
        if (ts.isShorthandPropertyAssignment(declaration)) return resolveValues(declaration.name)
        if (
          (ts.isPropertyAssignment(declaration) || ts.isPropertyDeclaration(declaration)) &&
          declaration.initializer
        ) {
          return [declaration.initializer]
        }
        if (ts.isGetAccessorDeclaration(declaration) && declaration.body) {
          return returnedExpressions(declaration.body)
        }
        if (ts.isExportAssignment(declaration)) return [declaration.expression]
        return []
        }),
        ...namespacePropertyDefinitions(expression).map((definition) => definition.value),
      ]
      propertyValueCache.set(expression, values)
      return values
    }
    const helperNameFromSymbol = (
      symbol: ts.Symbol | undefined,
      fallback: string,
      checker = file.checker,
    ) => {
      if (!symbol) return fallback
      const target = aliasedSymbol(symbol, checker)
      const canonical = Object.hasOwn(privateJoinAllowlist, fallback)
        ? "src/project/instance.ts"
        : Object.hasOwn(rawHelperAllowlist, fallback)
          ? "src/effect/instance-ref.ts"
          : transferredHelpers.has(fallback)
            ? "src/project/instance.ts"
            : undefined
      if (!canonical) return undefined
      return target.declarations?.some((declaration) => relativeBySource.get(declaration.getSourceFile()) === canonical)
        ? fallback
        : undefined
    }
    const helperNameFromIdentifier = (expression: ts.Identifier, fallback: string) =>
      helperNameFromSymbol(symbolAt(expression, checkerFor(expression)), fallback, checkerFor(expression))
    const namespaceHelperNames = (expression: ts.Identifier) => {
      const checker = checkerFor(expression)
      const symbol = symbolAt(expression, checker)
      if (
        !symbol ||
        (symbol.flags & ts.SymbolFlags.Alias) === 0 ||
        !symbol.declarations?.some((declaration) => ts.isNamespaceImport(declaration))
      ) {
        return []
      }
      const module = aliasedSymbol(symbol, checker)
      return checker.getExportsOfModule(module).flatMap((candidate) => {
        const target = aliasedSymbol(candidate, checker)
        const declared = [...(target.declarations ?? [])].flatMap((declaration) => {
          if (
            (ts.isFunctionDeclaration(declaration) ||
              ts.isFunctionExpression(declaration) ||
              ts.isVariableDeclaration(declaration)) &&
            declaration.name
          ) {
            const name = nameText(declaration.name)
            return name ? [name] : []
          }
          if (ts.isExportAssignment(declaration) && ts.isIdentifier(declaration.expression)) {
            return [declaration.expression.text]
          }
          return []
        })
        return [...new Set([candidate.getName(), target.getName(), ...declared])].flatMap((name) => {
          const helper = helperNameFromSymbol(target, name, checker)
          return helper ? [helper] : []
        })
      })
    }
    const resolvedHelperNames = (expression: ts.Expression | undefined, seen = new Set<ts.Node>()): string[] => {
      if (!expression || seen.has(expression)) return []
      seen.add(expression)
      if (
        ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) ||
        ts.isSatisfiesExpression(expression) ||
        ts.isNonNullExpression(expression)
      ) {
        return resolvedHelperNames(expression.expression, seen)
      }
      if (ts.isConditionalExpression(expression)) {
        return [...new Set([
          ...resolvedHelperNames(expression.whenTrue, new Set(seen)),
          ...resolvedHelperNames(expression.whenFalse, new Set(seen)),
        ])]
      }
      if (
        ts.isBinaryExpression(expression) &&
        new Set([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(
          expression.operatorToken.kind,
        )
      ) {
        return [...new Set([
          ...resolvedHelperNames(expression.left, new Set(seen)),
          ...resolvedHelperNames(expression.right, new Set(seen)),
        ])]
      }
      if (ts.isArrayLiteralExpression(expression)) {
        return [...new Set(expression.elements.flatMap((element) =>
          ts.isOmittedExpression(element) ? [] : resolvedHelperNames(element, new Set(seen)),
        ))]
      }
      if (ts.isPropertyAccessExpression(expression)) {
        const values = propertyValues(expression)
        const names = values.flatMap((value) => resolvedHelperNames(value, new Set(seen)))
        if (values.length > 0) return [...new Set(names)]
        if (!ts.isIdentifier(expression.name)) return []
        const name = helperNameFromIdentifier(expression.name, expression.name.text)
        return name ? [name] : []
      }
      if (ts.isElementAccessExpression(expression) && ts.isStringLiteralLike(expression.argumentExpression)) {
        const values = propertyValues(expression)
        const names = values.flatMap((value) => resolvedHelperNames(value, new Set(seen)))
        if (values.length > 0) return [...new Set(names)]
        const name = helperNameFromSymbol(
          propertySymbol(expression),
          expression.argumentExpression.text,
          checkerFor(expression),
        )
        return name ? [name] : []
      }
      if (!ts.isIdentifier(expression)) return []
      const namespace = namespaceHelperNames(expression)
      if (namespace.length > 0) return [...new Set(namespace)]
      const resolvedValues = resolveValues(expression)
      const values = resolvedValues.flatMap((value) => resolvedHelperNames(value, new Set(seen)))
      if (resolvedValues.length > 0) return [...new Set(values)]
      const name = helperNameFromIdentifier(expression, expression.text)
      return name ? [name] : []
    }
    const transferredHelpers = new Set([
      "registerTransferredGenerationProducer",
      "registerTransferredGenerationChannel",
      "registerGenerationBody",
    ])
    const resolvedHelperName = (expression: ts.Expression | undefined) => {
      const names = resolvedHelperNames(expression)
      return names.find((name) => !!helperAllowlist(name) || transferredHelpers.has(name)) ?? names[0]
    }
    const captureHelpers = new Set(["captureInstanceExecution", "captureInstanceExecutionEffect"])
    const invokedHelperNames = (expression: ts.Expression, seen = new Set<ts.Node>()): string[] => {
      const value = ownershipExpression(expression)
      if (seen.has(value)) return []
      seen.add(value)
      if (ts.isConditionalExpression(value)) {
        return [...new Set([
          ...invokedHelperNames(value.whenTrue, new Set(seen)),
          ...invokedHelperNames(value.whenFalse, new Set(seen)),
        ])]
      }
      if (ts.isBinaryExpression(value)) {
        if (
          new Set([ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.EqualsToken]).has(
            value.operatorToken.kind,
          )
        ) {
          return invokedHelperNames(value.right, new Set(seen))
        }
        if (
          new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(value.operatorToken.kind)
        ) {
          return [...new Set([
            ...invokedHelperNames(value.left, new Set(seen)),
            ...invokedHelperNames(value.right, new Set(seen)),
          ])]
        }
      }
      if (ts.isCallExpression(value) && callProperty(value)?.name === "bind") {
        if (ts.isPropertyAccessExpression(value.expression) || ts.isElementAccessExpression(value.expression)) {
          return invokedHelperNames(value.expression.expression, new Set(seen))
        }
      }
      if (ts.isIdentifier(value)) {
        return [...new Set([
          ...resolvedHelperNames(value),
          ...resolveValueDefinitions(value).flatMap((definition) =>
            invokedHelperNames(definition.value, new Set(seen))
          ),
        ])]
      }
      return resolvedHelperNames(value)
    }
    const invokedCaptureHelpers = (call: ts.CallExpression) => {
      const invocation = callProperty(call)?.name
      if (invocation === "bind") return []
      const target = new Set(["call", "apply"]).has(invocation ?? "") &&
          (ts.isPropertyAccessExpression(call.expression) || ts.isElementAccessExpression(call.expression))
        ? call.expression.expression
        : call.expression
      return invokedHelperNames(target).filter((name) => captureHelpers.has(name))
    }
    const fileCapturesExecution = calls.some((call) => invokedCaptureHelpers(call).length > 0)
    const resolvedMethodNames = (
      expression: ts.Expression | undefined,
      seen = new Set<ts.Node>(),
    ): string[] => {
      if (!expression || seen.has(expression)) return []
      seen.add(expression)
      if (
        ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) ||
        ts.isSatisfiesExpression(expression) ||
        ts.isNonNullExpression(expression)
      ) {
        return resolvedMethodNames(expression.expression, seen)
      }
      if (ts.isConditionalExpression(expression)) {
        return [...new Set([
          ...resolvedMethodNames(expression.whenTrue, new Set(seen)),
          ...resolvedMethodNames(expression.whenFalse, new Set(seen)),
        ])]
      }
      if (
        ts.isBinaryExpression(expression) &&
        new Set([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(
          expression.operatorToken.kind,
        )
      ) {
        return [...new Set([
          ...resolvedMethodNames(expression.left, new Set(seen)),
          ...resolvedMethodNames(expression.right, new Set(seen)),
        ])]
      }
      if (ts.isArrayLiteralExpression(expression)) {
        return [...new Set(expression.elements.flatMap((element) =>
          ts.isOmittedExpression(element) ? [] : resolvedMethodNames(element, new Set(seen)),
        ))]
      }
      if (ts.isPropertyAccessExpression(expression)) {
        if (expression.name.text === "runSync") return [expression.name.text]
        return [...new Set(propertyValues(expression).flatMap((value) =>
          resolvedMethodNames(value, new Set(seen)),
        ))]
      }
      if (ts.isElementAccessExpression(expression) && ts.isStringLiteralLike(expression.argumentExpression)) {
        if (expression.argumentExpression.text === "runSync") return [expression.argumentExpression.text]
        return [...new Set(propertyValues(expression).flatMap((value) =>
          resolvedMethodNames(value, new Set(seen)),
        ))]
      }
      if (ts.isCallExpression(expression) && callProperty(expression)?.name === "bind") {
        if (ts.isPropertyAccessExpression(expression.expression)) {
          return resolvedMethodNames(expression.expression.expression, seen)
        }
        if (ts.isElementAccessExpression(expression.expression)) {
          return resolvedMethodNames(expression.expression.expression, seen)
        }
      }
      if (!ts.isIdentifier(expression)) return []
      const bindings = resolveSymbolDeclarations(expression).flatMap((binding) =>
        ts.isBindingElement(binding) && ts.isObjectBindingPattern(binding.parent)
          ? [nameText(binding.propertyName ?? binding.name)]
          : [],
      ).filter((name): name is string => !!name)
      const values = resolveValues(expression).flatMap((value) => resolvedMethodNames(value, new Set(seen)))
      return [...new Set([...bindings, ...values])]
    }
    const resolvedMethodName = (expression: ts.Expression | undefined) => {
      const names = resolvedMethodNames(expression)
      return names.includes("runSync") ? "runSync" : names[0]
    }
    const sameContainer = (
      value: ts.Expression | undefined,
      declaration: ts.VariableDeclaration,
      seen = new Set<ts.Node>(),
    ): boolean => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      if (
        ts.isParenthesizedExpression(value) ||
        ts.isAsExpression(value) ||
        ts.isTypeAssertionExpression(value) ||
        ts.isSatisfiesExpression(value) ||
        ts.isNonNullExpression(value)
      ) {
        return sameContainer(value.expression, declaration, seen)
      }
      if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
        return sameContainer(value.expression, declaration, seen)
      }
      if (!ts.isIdentifier(value)) return false
      const resolved = resolveVariableDeclarations(value)
      if (resolved.includes(declaration)) return true
      return resolved.some(
        (candidate) => !!candidate.initializer && sameContainer(candidate.initializer, declaration, new Set(seen)),
      )
    }
    type ContainerIdentity = {
      root: ts.VariableDeclaration
      path: readonly string[]
      capturedAt?: ts.Node
    }
    const canonicalContainerIdentities = (
      value: ts.Expression,
      seen = new Set<ts.Node>(),
    ): ContainerIdentity[] => {
      if (seen.has(value)) return []
      seen.add(value)
      if (
        ts.isParenthesizedExpression(value) ||
        ts.isAsExpression(value) ||
        ts.isTypeAssertionExpression(value) ||
        ts.isSatisfiesExpression(value) ||
        ts.isNonNullExpression(value)
      ) {
        return canonicalContainerIdentities(value.expression, seen)
      }
      if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
        const member = ts.isPropertyAccessExpression(value)
          ? value.name.text
          : ts.isStringLiteralLike(value.argumentExpression) || ts.isNumericLiteral(value.argumentExpression)
            ? value.argumentExpression.text
            : undefined
        return member
          ? canonicalContainerIdentities(value.expression, seen).map((identity) => ({
              root: identity.root,
              path: [...identity.path, member],
              capturedAt: identity.capturedAt,
            }))
          : []
      }
      if (!ts.isIdentifier(value)) return []
      const definitions = resolveValueDefinitions(value)
      const resolved = definitions.flatMap((definition) =>
        canonicalContainerIdentities(definition.value, new Set(seen)).map((identity) => ({
          ...identity,
          capturedAt: identity.capturedAt ?? definition.node,
        }))
      )
      const identities: ContainerIdentity[] = resolved.length > 0
        ? resolved
        : resolveVariableDeclarations(value).map((root) => ({ root, path: [], capturedAt: undefined }))
      return identities.filter(
        (identity, index) =>
          identities.findIndex((candidate) =>
            candidate.root === identity.root &&
            candidate.path.join("\0") === identity.path.join("\0") &&
            candidate.capturedAt === identity.capturedAt
          ) === index,
      )
    }
    const propertyName = (expression: ts.PropertyAccessExpression | ts.ElementAccessExpression) =>
      ts.isPropertyAccessExpression(expression)
        ? expression.name.text
        : ts.isStringLiteralLike(expression.argumentExpression) || ts.isNumericLiteral(expression.argumentExpression)
          ? expression.argumentExpression.text
          : undefined
    type ContainerAssignment = {
      assignment: ts.BinaryExpression
      identity: ContainerIdentity
      path: readonly string[]
    }
    let indexedContainerAssignments: readonly ContainerAssignment[] | undefined
    const containerAssignments = () => {
      if (indexedContainerAssignments) return indexedContainerAssignments
      indexedContainerAssignments = assignments.flatMap((assignment) => {
        if (!ts.isPropertyAccessExpression(assignment.left) && !ts.isElementAccessExpression(assignment.left)) {
          return []
        }
        const name = propertyName(assignment.left)
        if (!name) return []
        return canonicalContainerIdentities(assignment.left.expression).map((identity) => ({
          assignment,
          identity,
          path: [...identity.path, name],
        }))
      })
      return indexedContainerAssignments
    }
    const containerVersionCache = new Map<string, ReadonlySet<ts.BinaryExpression | undefined>>()
    const containerVersions = (identity: ContainerIdentity, at: ts.Node) => {
      const reference = identity.capturedAt ?? at
      const key = `${identity.root.getStart(file.source)}\0${identity.path.join("\0")}\0${reference.getStart(file.source)}`
      const cached = containerVersionCache.get(key)
      if (cached) return cached
      const matching = [...new Set(containerAssignments()
        .filter((item) =>
          item.assignment.getStart(file.source) < reference.getStart(file.source) &&
          item.identity.root === identity.root &&
          item.path.length <= identity.path.length &&
          item.path.every((part, index) => identity.path[index] === part)
        )
        .map((item) => item.assignment))]
        .sort((left, right) => right.getStart(file.source) - left.getStart(file.source))
      const dominant = matching.findIndex((assignment) => dominatesReference(assignment, reference))
      const versions = new Set<ts.BinaryExpression | undefined>([
        ...(dominant === -1 ? matching : matching.slice(0, dominant + 1)),
        ...(dominant === -1 ? [undefined] : []),
      ])
      containerVersionCache.set(key, versions)
      return versions
    }
    const sharesContainerVersion = (
      left: ContainerIdentity,
      leftAt: ts.Node,
      right: ContainerIdentity,
      rightAt: ts.Node,
    ) => {
      const versions = containerVersions(left, leftAt)
      return [...containerVersions(right, rightAt)].some((version) => versions.has(version))
    }
    function staticValueCandidates(value: ts.Expression, seen = new Set<ts.Node>()): ts.Expression[] {
      const expression = ownershipExpression(value)
      if (seen.has(expression)) return []
      seen.add(expression)
      if (ts.isIdentifier(expression)) {
        const definitions = resolveValueDefinitions(expression)
        return definitions.length > 0
          ? definitions.flatMap((definition) => staticValueCandidates(definition.value, new Set(seen)))
          : [expression]
      }
      if (ts.isConditionalExpression(expression)) {
        return [
          ...staticValueCandidates(expression.whenTrue, new Set(seen)),
          ...staticValueCandidates(expression.whenFalse, new Set(seen)),
        ]
      }
      if (
        ts.isBinaryExpression(expression) &&
        new Set([ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.EqualsToken]).has(
          expression.operatorToken.kind,
        )
      ) {
        return staticValueCandidates(expression.right, new Set(seen))
      }
      if (
        ts.isBinaryExpression(expression) &&
        new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(expression.operatorToken.kind)
      ) {
        return [
          ...staticValueCandidates(expression.left, new Set(seen)),
          ...staticValueCandidates(expression.right, new Set(seen)),
        ]
      }
      return [expression]
    }
    function staticArrayTuples(value: ts.Expression, seen = new Set<ts.Node>()): ts.Expression[][] {
      return staticValueCandidates(value, seen).flatMap((candidate) => {
        const source = ownershipExpression(candidate)
        if (!ts.isArrayLiteralExpression(source)) return []
        return source.elements.reduce<ts.Expression[][]>((tuples, element) => {
          const options = ts.isOmittedExpression(element)
            ? [[ts.factory.createVoidZero()]]
            : ts.isSpreadElement(element)
              ? staticArrayTuples(element.expression, new Set(seen))
              : [[element]]
          return tuples.flatMap((tuple) => options.map((option) => [...tuple, ...option]))
        }, [[]])
      })
    }
    function staticPropertyValues(value: ts.Expression, name: string, seen = new Set<ts.Node>()): ts.Expression[] {
      return staticValueCandidates(value, seen).flatMap((candidate) => {
        const source = ownershipExpression(candidate)
        if (ts.isArrayLiteralExpression(source) && /^\d+$/.test(name)) {
          return staticArrayTuples(source).flatMap((tuple) =>
            tuple[Number(name)] ? [tuple[Number(name)]!] : []
          )
        }
        if (!ts.isObjectLiteralExpression(source)) return []
        for (const property of [...source.properties].reverse()) {
          if (ts.isSpreadAssignment(property)) {
            const spread = staticPropertyValues(property.expression, name, new Set(seen))
            if (spread.length > 0) return spread
            continue
          }
          if (nameText(property.name) !== name) continue
          const selected = propertyExpression(property)
          if (selected) return [selected]
          if (ts.isGetAccessorDeclaration(property) && property.body) return returnedExpressions(property.body)
          return []
        }
        return []
      })
    }
    const staticPropertyPathValues = (value: ts.Expression, path: readonly string[]) =>
      path.reduce<ts.Expression[]>((values, name) =>
        values.flatMap((candidate) => staticPropertyValues(candidate, name)), staticValueCandidates(value))
    const assignedPropertyValues = (expression: ts.PropertyAccessExpression | ts.ElementAccessExpression) => {
      const name = propertyName(expression)
      const identities = canonicalContainerIdentities(expression.expression)
      if (!name || identities.length === 0) return { values: [] as ts.Expression[], replacesStatic: false }
      const matching = containerAssignments().flatMap((item) => {
        const assignment = item.assignment
        if (assignment.getStart(file.source) >= expression.getStart(file.source)) return []
        const mutationScope = nearestFunction(assignment)
        const readScope = nearestFunction(expression)
        const match = identities.flatMap((identity) => {
          const declarationScope = nearestFunction(identity.root)
          if (!(
            mutationScope === declarationScope ||
            mutationScope === readScope ||
            (!!mutationScope && nodeInside(mutationScope, expression))
          )) return []
          const targetPath = [...identity.path, name]
          const candidate = item.identity
          const assignedPath = item.path
          if (
            candidate.root !== identity.root ||
            assignedPath.some((part, index) => targetPath[index] !== part)
          ) {
            return []
          }
          if (
            assignedPath.length < targetPath.length
              ? !containerVersions(identity, expression).has(assignment)
              : !sharesContainerVersion(candidate, assignment, identity, expression)
          ) {
            return []
          }
          return [{ assignment, values: staticPropertyPathValues(assignment.right, targetPath.slice(assignedPath.length)) }]
        })
        return match.slice(0, 1)
      })
        .filter((item, index, items) => items.findIndex((candidate) => candidate.assignment === item.assignment) === index)
        .sort((left, right) => right.assignment.getStart(file.source) - left.assignment.getStart(file.source))
      const dominant = matching.findIndex((item) => dominatesReference(item.assignment, expression))
      return {
        values: (dominant === -1 ? matching : matching.slice(0, dominant + 1)).flatMap((item) => item.values),
        replacesStatic: dominant !== -1,
      }
    }
    type CapturedBindings = ReadonlyMap<ts.Symbol, readonly ts.Expression[]>
    const capturedArgumentIsUndefined = (value: ts.Expression | undefined) => {
      if (!value) return true
      const argument = ownershipExpression(value)
      if (ts.isVoidExpression(argument)) return true
      if (!ts.isIdentifier(argument) || argument.text !== "undefined") return false
      return resolveSymbolDeclarations(argument).every(
        (declaration) => declaration.getSourceFile() !== file.source,
      )
    }
    const capturedReachingValues = (identifier: ts.Identifier, bindings: CapturedBindings) => {
      const definitions = resolveValueDefinitions(identifier)
      const initial = bindings.get(resolveSymbol(identifier)!) ?? []
      return [
        ...(initial.length > 0 && !definitions.some((definition) => dominatesReference(definition.node, identifier))
          ? initial
          : []),
        ...definitions.map((definition) => definition.value),
      ]
    }
    const capturedArgumentValues = (
      value: ts.Expression,
      bindings: CapturedBindings,
      seen = new Set<ts.Node>(),
    ): ts.Expression[] => {
      const argument = ownershipExpression(value)
      if (seen.has(argument)) return []
      seen.add(argument)
      if (ts.isIdentifier(argument)) {
        const resolved = capturedReachingValues(argument, bindings)
        return (resolved.length > 0 ? resolved : [argument]).flatMap((candidate) =>
          staticValueCandidates(candidate, new Set(seen))
        )
      }
      if (ts.isConditionalExpression(argument)) {
        return [
          ...capturedArgumentValues(argument.whenTrue, bindings, new Set(seen)),
          ...capturedArgumentValues(argument.whenFalse, bindings, new Set(seen)),
        ]
      }
      if (
        ts.isBinaryExpression(argument) &&
        new Set([ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.EqualsToken]).has(
          argument.operatorToken.kind,
        )
      ) {
        return capturedArgumentValues(argument.right, bindings, new Set(seen))
      }
      if (
        ts.isBinaryExpression(argument) &&
        new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(argument.operatorToken.kind)
      ) {
        return [
          ...capturedArgumentValues(argument.left, bindings, new Set(seen)),
          ...capturedArgumentValues(argument.right, bindings, new Set(seen)),
        ]
      }
      return [argument]
    }
    const capturedCallBindings = (
      callable: { parameters: ts.NodeArray<ts.ParameterDeclaration> },
      args: readonly ts.Expression[],
      bindings: CapturedBindings,
    ) => {
      const result = new Map(bindings)
      const bind = (name: ts.BindingName, value: ts.Expression | undefined) => {
        if (!value) return
        if (ts.isIdentifier(name)) {
          const symbol = resolveSymbol(name)
          if (symbol) result.set(symbol, [...(result.get(symbol) ?? []), value])
          return
        }
        const candidates = capturedArgumentValues(value, bindings)
        if (ts.isObjectBindingPattern(name)) {
          for (const element of name.elements) {
            if (element.dotDotDotToken) continue
            const member = nameText(element.propertyName ?? element.name)
            const values = member
              ? candidates.flatMap((candidate) => staticPropertyValues(candidate, member))
              : []
            for (const item of values.length > 0 ? values : [element.initializer]) {
              bind(element.name, capturedArgumentIsUndefined(item) ? element.initializer ?? item : item)
            }
          }
          return
        }
        if (!ts.isArrayBindingPattern(name)) return
        const tuples = candidates.flatMap((candidate) => staticArrayTuples(candidate))
        name.elements.forEach((element, index) => {
          if (!ts.isBindingElement(element)) return
          if (element.dotDotDotToken) {
            for (const tuple of tuples) {
              bind(element.name, ts.factory.createArrayLiteralExpression(tuple.slice(index)))
            }
            return
          }
          for (const tuple of tuples) {
            const selected = tuple[index]
            bind(element.name, selected && !capturedArgumentIsUndefined(selected) ? selected : element.initializer)
          }
        })
      }
      const expanded = args.reduce<ts.Expression[][]>((tuples, argument) => {
        const options = ts.isSpreadElement(argument)
          ? capturedArgumentValues(argument.expression, bindings).flatMap((value) => staticArrayTuples(value))
          : [[argument]]
        return tuples.flatMap((tuple) => options.map((option) => [...tuple, ...option]))
      }, [[]])
      callable.parameters.filter((parameter) =>
        !ts.isIdentifier(parameter.name) || parameter.name.text !== "this"
      ).forEach((parameter, index) => {
        if (parameter.dotDotDotToken) {
          for (const tuple of expanded) {
            bind(parameter.name, ts.factory.createArrayLiteralExpression(tuple.slice(index)))
          }
          return
        }
        for (const tuple of expanded) {
          const argument = tuple[index]
          const values = !argument || capturedArgumentIsUndefined(argument)
            ? [parameter.initializer ?? argument]
            : capturedArgumentValues(argument, bindings)
          for (const value of values) {
            bind(parameter.name, capturedArgumentIsUndefined(value) ? parameter.initializer ?? value : value)
          }
        }
      })
      return result
    }
    const publicationThis = Symbol("publication this")
    type PublicationCandidate = {
      value: ts.Expression
      fresh: boolean
      exposure?: ts.Expression
      properties?: ReadonlyMap<string, readonly PublicationCandidate[]>
    }
    type PublicationBindings = ReadonlyMap<ts.Symbol | typeof publicationThis, readonly PublicationCandidate[]>
    const publicationIdentifierCandidates = (identifier: ts.Identifier, bindings: PublicationBindings) => {
      const definitions = resolveValueDefinitions(identifier)
      const symbol = resolveSymbol(identifier)
      const bound = symbol ? bindings.get(symbol) ?? [] : []
      return [
        ...(definitions.some((definition) => dominatesReference(definition.node, identifier)) ? [] : bound),
        ...definitions.map((definition) => ({
          value: definition.value,
          fresh: false,
          exposure: identifier,
        })),
      ]
    }
    const publicationExpressionCandidates = (
      value: ts.Expression,
      bindings: PublicationBindings,
      fresh = false,
      seen = new Set<ts.Node>(),
    ): PublicationCandidate[] => {
      const expression = ownershipExpression(value)
      if (seen.has(expression)) return []
      seen.add(expression)
      if (ts.isIdentifier(expression)) {
        const resolved = publicationIdentifierCandidates(expression, bindings)
        return resolved.length > 0 ? resolved : [{ value: expression, fresh: false }]
      }
      if (ts.isConditionalExpression(expression)) {
        return [
          ...publicationExpressionCandidates(expression.whenTrue, bindings, fresh, new Set(seen)),
          ...publicationExpressionCandidates(expression.whenFalse, bindings, fresh, new Set(seen)),
        ]
      }
      if (
        ts.isBinaryExpression(expression) &&
        expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        return publicationExpressionCandidates(expression.right, bindings, fresh, new Set(seen)).map((candidate) => ({
          ...candidate,
          exposure: expression.left,
        }))
      }
      if (
        ts.isBinaryExpression(expression) &&
        new Set([ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken]).has(
          expression.operatorToken.kind,
        )
      ) {
        return publicationExpressionCandidates(expression.right, bindings, fresh, new Set(seen))
      }
      if (
        ts.isBinaryExpression(expression) &&
        new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(expression.operatorToken.kind)
      ) {
        return [
          ...publicationExpressionCandidates(expression.left, bindings, fresh, new Set(seen)),
          ...publicationExpressionCandidates(expression.right, bindings, fresh, new Set(seen)),
        ]
      }
      return [{
        value: expression,
        fresh: fresh && (
          ts.isObjectLiteralExpression(expression) ||
          ts.isArrayLiteralExpression(expression) ||
          ts.isNewExpression(expression)
        ),
      }]
    }
    const publicationArrayTuples = (
      candidate: PublicationCandidate,
      bindings: PublicationBindings,
      seen = new Set<ts.Node>(),
    ): PublicationCandidate[][] => {
      const indexes = [...(candidate.properties?.keys() ?? [])]
        .filter((name) => /^\d+$/.test(name))
        .map(Number)
      if (indexes.length > 0) {
        const maximum = Math.max(...indexes)
        return Array.from({ length: maximum + 1 }).reduce<PublicationCandidate[][]>((tuples, _, index) => {
          const options = candidate.properties?.get(String(index)) ?? [{
            value: ts.factory.createVoidZero(),
            fresh: false,
          }]
          return tuples.flatMap((tuple) => options.map((option) => [...tuple, option]))
        }, [[]])
      }
      return publicationExpressionCandidates(
        candidate.value,
        bindings,
        candidate.fresh,
        seen,
      ).map((resolved) => ({
        ...resolved,
        exposure: resolved.exposure ?? candidate.exposure,
        properties: resolved.properties ?? candidate.properties,
      })).flatMap((resolved) => {
      const source = ownershipExpression(resolved.value)
      if (!ts.isArrayLiteralExpression(source)) return []
      return source.elements.reduce<PublicationCandidate[][]>((tuples, element) => {
        const options = ts.isOmittedExpression(element)
          ? [[{ value: ts.factory.createVoidZero(), fresh: false }]]
          : ts.isSpreadElement(element)
            ? publicationExpressionCandidates(element.expression, bindings, resolved.fresh, new Set(seen))
                .map((spread) => ({ ...spread, exposure: spread.exposure ?? resolved.exposure }))
                .flatMap((spread) => publicationArrayTuples(spread, bindings, new Set(seen)))
            : publicationExpressionCandidates(element, bindings, resolved.fresh, new Set(seen))
                .map((item) => [{ ...item, exposure: item.exposure ?? resolved.exposure }])
        return tuples.flatMap((tuple) => options.map((option) => [...tuple, ...option]))
      }, [[]])
    })
    }
    function publicationPropertyCandidates(
      candidate: PublicationCandidate,
      name: string,
      bindings: PublicationBindings,
      seen = new Set<ts.Node>(),
    ): PublicationCandidate[] {
      const inherited = (value: PublicationCandidate) => ({
        ...value,
        exposure: value.exposure ?? candidate.exposure,
      })
      const stored = candidate.properties?.get(name)
      if (stored) return stored.map(inherited)
      return publicationExpressionCandidates(candidate.value, bindings, candidate.fresh, seen).flatMap((resolved) => {
        const source = ownershipExpression(resolved.value)
        if (ts.isArrayLiteralExpression(source) && /^\d+$/.test(name)) {
          return publicationArrayTuples(resolved, bindings, new Set(seen))
            .flatMap((tuple) => tuple[Number(name)] ? [inherited(tuple[Number(name)]!)] : [])
        }
        if (!ts.isObjectLiteralExpression(source)) return []
        for (const property of [...source.properties].reverse()) {
          if (ts.isSpreadAssignment(property)) {
            const spread = publicationExpressionCandidates(
              property.expression,
              bindings,
              resolved.fresh,
              new Set(seen),
            ).flatMap((value) => publicationPropertyCandidates(value, name, bindings, new Set(seen)))
            if (spread.length > 0) return spread.map(inherited)
            continue
          }
          if (nameText(property.name) !== name) continue
          const selected = propertyExpression(property)
          if (selected) {
            return publicationExpressionCandidates(selected, bindings, resolved.fresh, new Set(seen)).map(inherited)
          }
          if (ts.isGetAccessorDeclaration(property) && property.body) {
            return returnedExpressions(property.body).flatMap((value) =>
              publicationExpressionCandidates(value, bindings, resolved.fresh, new Set(seen)).map(inherited)
            )
          }
          return []
        }
        return []
      })
    }
    function publicationPropertyNames(
      candidate: PublicationCandidate,
      bindings: PublicationBindings,
      seen = new Set<ts.Node>(),
    ): string[] {
      const names = [...(candidate.properties?.keys() ?? [])]
      return [...new Set([
        ...names,
        ...publicationExpressionCandidates(candidate.value, bindings, candidate.fresh, seen).flatMap((resolved) => {
          const source = ownershipExpression(resolved.value)
          if (!ts.isObjectLiteralExpression(source)) return []
          return source.properties.flatMap((property) => {
            if (ts.isSpreadAssignment(property)) {
              return publicationExpressionCandidates(
                property.expression,
                bindings,
                resolved.fresh,
                new Set(seen),
              ).flatMap((value) => publicationPropertyNames(value, bindings, new Set(seen)))
            }
            const name = nameText(property.name)
            return name ? [name] : []
          })
        }),
      ])]
    }
    type PublicationPath = { root: ts.Symbol | typeof publicationThis; parts: readonly string[] }
    const publicationPaths = (value: ts.Expression, seen = new Set<ts.Node>()): PublicationPath[] => {
      const expression = ownershipExpression(value)
      if (seen.has(expression)) return []
      seen.add(expression)
      if (ts.isIdentifier(expression)) {
        const symbol = resolveSymbol(expression)
        return [
          ...(symbol ? [{ root: symbol, parts: [] }] : []),
          ...resolveValueDefinitions(expression).flatMap((definition) =>
            publicationPaths(definition.value, new Set(seen))
          ),
        ]
      }
      if (expression.kind === ts.SyntaxKind.ThisKeyword) return [{ root: publicationThis, parts: [] }]
      if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
        const name = propertyName(expression)
        if (!name) return []
        return publicationPaths(expression.expression, new Set(seen)).map((path) => ({
          root: path.root,
          parts: [...path.parts, name],
        }))
      }
      return []
    }
    const publicationAssignedPropertyValues = (
      expression: ts.PropertyAccessExpression | ts.ElementAccessExpression,
    ) => {
      const paths = publicationPaths(expression)
      const matches = assignments.filter((assignment) => {
        if (assignment.getStart(file.source) >= expression.getStart(file.source)) return false
        if (nearestFunction(assignment) !== nearestFunction(expression)) return false
        const assigned = publicationPaths(assignment.left)
        return assigned.some((left) => paths.some((right) =>
          left.root === right.root &&
          left.parts.length === right.parts.length &&
          left.parts.every((part, index) => right.parts[index] === part)
        ))
      }).sort((left, right) => right.getStart(file.source) - left.getStart(file.source))
      const dominant = matches.findIndex((assignment) => dominatesReference(assignment, expression))
      return {
        values: (dominant === -1 ? matches : matches.slice(0, dominant + 1)).map((assignment) => assignment.right),
        replacesStatic: dominant !== -1,
      }
    }
    const publicationTargetCandidates = (
      value: ts.Expression,
      bindings: PublicationBindings,
      fresh = false,
      seen = new Set<ts.Node>(),
    ): PublicationCandidate[] => {
      const expression = ownershipExpression(value)
      if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
        if (seen.has(expression)) return []
        seen.add(expression)
        const name = propertyName(expression)
        if (!name) return []
        const structural = assignedPropertyValues(expression)
        const direct = publicationAssignedPropertyValues(expression)
        const assigned = {
          replacesStatic: structural.replacesStatic || direct.replacesStatic,
          values: [...new Set([...structural.values, ...direct.values])],
        }
        return [
          ...(assigned.replacesStatic
            ? []
            : publicationTargetCandidates(expression.expression, bindings, fresh, new Set(seen))
                .flatMap((candidate) => publicationPropertyCandidates(candidate, name, bindings))),
          ...assigned.values.flatMap((value) =>
            publicationExpressionCandidates(value, bindings).map((candidate) => ({
              ...candidate,
              exposure: expression,
            }))
          ),
        ]
      }
      if (expression.kind === ts.SyntaxKind.ThisKeyword) {
        return [...(bindings.get(publicationThis) ?? [])]
      }
      return publicationExpressionCandidates(expression, bindings, fresh, seen)
    }
    const publicationInvocationThis = (bindings: PublicationBindings, value: ts.Expression | undefined) =>
      value ? publicationExpressionCandidates(value, bindings, true) : []
    const publicationCallBindings = (
      callable: { parameters: ts.NodeArray<ts.ParameterDeclaration> },
      args: readonly ts.Expression[],
      bindings: PublicationBindings,
      supplied?: readonly PublicationCandidate[][],
    ) => {
      const result = new Map(bindings)
      const bind = (name: ts.BindingName, candidates: readonly PublicationCandidate[]) => {
        if (ts.isIdentifier(name)) {
          const symbol = resolveSymbol(name)
          if (symbol) result.set(symbol, [...(result.get(symbol) ?? []), ...candidates])
          return
        }
        if (ts.isObjectBindingPattern(name)) {
          const used = new Set(name.elements.flatMap((element) => {
            if (element.dotDotDotToken) return []
            const member = nameText(element.propertyName ?? element.name)
            return member ? [member] : []
          }))
          for (const element of name.elements) {
            if (element.dotDotDotToken) {
              const properties = new Map<string, PublicationCandidate[]>()
              const names = candidates.flatMap((candidate) =>
                publicationPropertyNames(candidate, bindings).filter((member) => !used.has(member))
              )
              for (const member of new Set(names)) {
                properties.set(
                  member,
                  candidates.flatMap((candidate) => publicationPropertyCandidates(candidate, member, bindings)),
                )
              }
              bind(element.name, [{
                value: ts.factory.createObjectLiteralExpression(),
                fresh: true,
                properties,
              }])
              continue
            }
            const member = nameText(element.propertyName ?? element.name)
            const values = member
              ? candidates.flatMap((candidate) => publicationPropertyCandidates(candidate, member, bindings))
              : []
            bind(
              element.name,
              values.flatMap((value) =>
                capturedArgumentIsUndefined(value.value) && element.initializer
                  ? publicationExpressionCandidates(element.initializer, bindings, true)
                  : [value]
              ).concat(
                values.length === 0 && element.initializer
                  ? publicationExpressionCandidates(element.initializer, bindings, true)
                  : [],
              ),
            )
          }
          return
        }
        if (!ts.isArrayBindingPattern(name)) return
        const tuples = candidates.flatMap((candidate) => publicationArrayTuples(candidate, bindings))
        name.elements.forEach((element, index) => {
          if (!ts.isBindingElement(element)) return
          if (element.dotDotDotToken) {
            for (const tuple of tuples) {
              const rest = tuple.slice(index)
              bind(element.name, [{
                value: ts.factory.createArrayLiteralExpression(rest.map((item) => item.value)),
                fresh: true,
                properties: new Map(rest.map((item, offset) => [String(offset), [item]])),
              }])
            }
            return
          }
          for (const tuple of tuples) {
            const selected = tuple[index]
            bind(
              element.name,
              selected && !capturedArgumentIsUndefined(selected.value)
                ? [selected]
                : element.initializer
                  ? publicationExpressionCandidates(element.initializer, bindings, true)
                  : [],
            )
          }
        })
      }
      const expanded = supplied ?? args.reduce<PublicationCandidate[][]>((tuples, argument) => {
        const options = ts.isSpreadElement(argument)
          ? publicationExpressionCandidates(argument.expression, bindings, true)
              .flatMap((candidate) => publicationArrayTuples(candidate, bindings))
          : publicationExpressionCandidates(argument, bindings, true).map((candidate) => [candidate])
        return tuples.flatMap((tuple) => options.map((option) => [...tuple, ...option]))
      }, [[]])
      callable.parameters.filter((parameter) =>
        !ts.isIdentifier(parameter.name) || parameter.name.text !== "this"
      ).forEach((parameter, index) => {
        if (parameter.dotDotDotToken) {
          for (const tuple of expanded) {
            const rest = tuple.slice(index)
            bind(parameter.name, [{
              value: ts.factory.createArrayLiteralExpression(rest.map((item) => item.value)),
              fresh: true,
              properties: new Map(rest.map((item, offset) => [String(offset), [item]])),
            }])
          }
          return
        }
        for (const tuple of expanded) {
          const argument = tuple[index]
          bind(
            parameter.name,
            !argument || capturedArgumentIsUndefined(argument.value)
              ? parameter.initializer
                ? publicationExpressionCandidates(parameter.initializer, bindings, true)
                : []
              : [argument],
          )
        }
      })
      return result
    }
    const capturedProjectedValues = (
      expression: ts.PropertyAccessExpression | ts.ElementAccessExpression,
      bindings: CapturedBindings,
    ) => {
      const name = propertyName(expression)
      const receiver = ownershipExpression(expression.expression)
      if (!name || !ts.isIdentifier(receiver) || !bindings.has(resolveSymbol(receiver)!)) return []
      return capturedReachingValues(receiver, bindings).flatMap((value) => staticPropertyValues(value, name))
    }
    const capturedValue = (
      value: ts.Expression | undefined,
      seen = new Set<ts.Node>(),
      at: ts.Node | undefined = value,
      bindings: CapturedBindings = new Map(),
    ): boolean => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      if (
        ts.isParenthesizedExpression(value) ||
        ts.isAsExpression(value) ||
        ts.isTypeAssertionExpression(value) ||
        ts.isSatisfiesExpression(value) ||
        ts.isNonNullExpression(value) ||
        ts.isAwaitExpression(value)
      ) {
        return capturedValue(value.expression, seen, at, bindings)
      }
      if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
        return ts.isBlock(value.body)
          ? returnedCapturedValue(value.body, seen, bindings)
          : capturedValue(value.body, seen, at, bindings)
      }
      if (ts.isIdentifier(value)) {
        if (
          capturedReachingValues(value, bindings).some((resolved) =>
            capturedValue(resolved, new Set(seen), at, bindings)
          )
        ) {
          return true
        }
        if (
          resolveSymbolDeclarations(value).some(
            (declaration) =>
              ts.isFunctionDeclaration(declaration) &&
              !!declaration.body &&
              returnedCapturedValue(declaration.body, new Set(seen), bindings),
          )
        ) {
          return true
        }
        const declarations = resolveVariableDeclarations(value)
        return declarations.some((declaration) => {
          const beforeUse = (mutation: ts.Node) =>
            declaration.getSourceFile() === file.source &&
            mutation.getStart(file.source) > declaration.getStart(file.source) &&
            mutation.getStart(file.source) < (at?.getStart(file.source) ?? file.source.end) &&
            nearestFunction(mutation) === nearestFunction(declaration)
          const assigned = assignments.some((assignment) => {
            if (!beforeUse(assignment)) return false
            const receiver = ts.isPropertyAccessExpression(assignment.left) || ts.isElementAccessExpression(assignment.left)
              ? assignment.left.expression
              : undefined
            return sameContainer(receiver, declaration) &&
              capturedValue(assignment.right, new Set(seen), assignment, bindings)
          })
          if (assigned) return true
          return calls.some((call) => {
            if (!beforeUse(call) || !new Set(["push", "unshift", "splice", "add", "set"]).has(callProperty(call)?.name ?? "")) {
              return false
            }
            const receiver = ts.isPropertyAccessExpression(call.expression) || ts.isElementAccessExpression(call.expression)
              ? call.expression.expression
              : undefined
            return sameContainer(receiver, declaration) &&
              call.arguments.some((argument) => capturedValue(argument, new Set(seen), call, bindings))
          })
        })
      }
      if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
        const assigned = assignedPropertyValues(value)
        return [
          ...capturedProjectedValues(value, bindings),
          ...(assigned.replacesStatic ? [] : propertyValues(value)),
          ...assigned.values,
        ].some((resolved) => capturedValue(resolved, new Set(seen), at, bindings))
      }
      if (ts.isObjectLiteralExpression(value)) {
        return value.properties.some((property) => {
          if (ts.isPropertyAssignment(property)) return capturedValue(property.initializer, seen, at, bindings)
          if (ts.isShorthandPropertyAssignment(property)) return capturedValue(property.name, seen, at, bindings)
          if (ts.isSpreadAssignment(property)) return capturedValue(property.expression, seen, at, bindings)
          if (
            (ts.isMethodDeclaration(property) || ts.isGetAccessorDeclaration(property)) &&
            property.body
          ) {
            return returnedCapturedValue(property.body, new Set(seen), bindings)
          }
          return false
        })
      }
      if (ts.isArrayLiteralExpression(value)) {
        return value.elements.some((element) => {
          if (ts.isOmittedExpression(element)) return false
          if (ts.isSpreadElement(element)) return capturedValue(element.expression, seen, at, bindings)
          return capturedValue(element, seen, at, bindings)
        })
      }
      if (ts.isConditionalExpression(value)) {
        return capturedValue(value.whenTrue, seen, at, bindings) ||
          capturedValue(value.whenFalse, seen, at, bindings)
      }
      if (
        ts.isBinaryExpression(value) &&
        new Set([ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.EqualsToken]).has(
          value.operatorToken.kind,
        )
      ) {
        return capturedValue(value.right, seen, at, bindings)
      }
      if (
        ts.isBinaryExpression(value) &&
        new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(value.operatorToken.kind)
      ) {
        return capturedValue(value.left, new Set(seen), at, bindings) ||
          capturedValue(value.right, new Set(seen), at, bindings)
      }
      if (!ts.isCallExpression(value)) return false
      if (invokedCapturedValue(value, new Set(seen), bindings)) return true
      return invokedCaptureHelpers(value).length > 0
    }
    function callableCapturedValue(
      value: ts.Expression,
      seen: Set<ts.Node>,
      args: readonly ts.Expression[] = [],
      bindings: CapturedBindings = new Map(),
    ): boolean {
      const callable = ownershipExpression(value)
      if (seen.has(callable)) return false
      seen.add(callable)
      if (ts.isConditionalExpression(callable)) {
        return callableCapturedValue(callable.whenTrue, new Set(seen), args, bindings) ||
          callableCapturedValue(callable.whenFalse, new Set(seen), args, bindings)
      }
      if (
        ts.isBinaryExpression(callable) &&
        new Set([ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.EqualsToken]).has(
          callable.operatorToken.kind,
        )
      ) {
        return callableCapturedValue(callable.right, new Set(seen), args, bindings)
      }
      if (
        ts.isBinaryExpression(callable) &&
        new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(callable.operatorToken.kind)
      ) {
        return callableCapturedValue(callable.left, new Set(seen), args, bindings) ||
          callableCapturedValue(callable.right, new Set(seen), args, bindings)
      }
      if (ts.isArrowFunction(callable) || ts.isFunctionExpression(callable)) {
        if (ts.isFunctionExpression(callable) && callable.asteriskToken) return false
        const callBindings = capturedCallBindings(callable, args, bindings)
        return ts.isBlock(callable.body)
          ? returnedCapturedValue(callable.body, new Set(seen), callBindings)
          : capturedValue(callable.body, new Set(seen), callable, callBindings)
      }
      if (ts.isCallExpression(callable) && callProperty(callable)?.name === "bind") {
        if (ts.isPropertyAccessExpression(callable.expression) || ts.isElementAccessExpression(callable.expression)) {
          return callableCapturedValue(
            callable.expression.expression,
            new Set(seen),
            [...callable.arguments.slice(1), ...args],
            bindings,
          )
        }
      }
      if (ts.isIdentifier(callable)) {
        if (
          resolveValueDefinitions(callable).some((definition) =>
            callableCapturedValue(definition.value, new Set(seen), args, bindings),
          )
        ) {
          return true
        }
        const symbol = resolveSymbol(callable)
        const dominantAssignment = assignments.some(
          (assignment) =>
            ts.isIdentifier(assignment.left) &&
            resolveSymbol(assignment.left) === symbol &&
            assignment.getStart(assignment.getSourceFile()) < callable.getStart(callable.getSourceFile()) &&
            dominatesReference(assignment, callable),
        )
        if (dominantAssignment) return false
        return resolveSymbolDeclarations(callable).some(
          (declaration) =>
            ts.isFunctionDeclaration(declaration) &&
            !declaration.asteriskToken &&
            !!declaration.body &&
            returnedCapturedValue(
              declaration.body,
              new Set(seen),
              capturedCallBindings(declaration, args, bindings),
            ),
        )
      }
      if (ts.isPropertyAccessExpression(callable) || ts.isElementAccessExpression(callable)) {
        const assigned = assignedPropertyValues(callable)
        const values = [
          ...(assigned.replacesStatic ? [] : propertyValues(callable)),
          ...assigned.values,
        ]
        if (values.some((resolved) => callableCapturedValue(resolved, new Set(seen), args, bindings))) return true
        if (assigned.replacesStatic) return false
        return [...(propertySymbol(callable)?.declarations ?? [])].some(
          (declaration) =>
            ts.isMethodDeclaration(declaration) &&
            !declaration.asteriskToken &&
            !!declaration.body &&
            returnedCapturedValue(
              declaration.body,
              new Set(seen),
              capturedCallBindings(declaration, args, bindings),
            ),
        )
      }
      return false
    }
    function invokedCapturedValue(call: ts.CallExpression, seen: Set<ts.Node>, bindings: CapturedBindings) {
      const property = callProperty(call)
      if (
        property &&
        new Set(["call", "apply"]).has(property.name) &&
        (ts.isPropertyAccessExpression(call.expression) || ts.isElementAccessExpression(call.expression))
      ) {
        const target = call.expression.expression
        if (property.name === "call") {
          return callableCapturedValue(target, seen, call.arguments.slice(1), bindings)
        }
        return !!call.arguments[1] && capturedArgumentValues(call.arguments[1], bindings)
          .flatMap((value) => staticArrayTuples(value))
          .some((args) => callableCapturedValue(target, new Set(seen), args, bindings))
      }
      return callableCapturedValue(call.expression, seen, call.arguments, bindings)
    }
    function returnedCapturedValue(body: ts.Block, seen: Set<ts.Node>, bindings: CapturedBindings = new Map()) {
      let captured = false
      const visit = (node: ts.Node) => {
        if (captured) return
        if (
          node !== body &&
          (ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) ||
            ts.isSetAccessorDeclaration(node) ||
            ts.isConstructorDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isClassExpression(node))
        ) {
          return
        }
        if (ts.isReturnStatement(node)) {
          captured = capturedValue(node.expression, new Set(seen), node, bindings)
          return
        }
        node.forEachChild(visit)
      }
      visit(body)
      return captured
    }
    type CaptureWrapper =
      | ts.FunctionDeclaration
      | ts.FunctionExpression
      | ts.ArrowFunction
      | ts.MethodDeclaration
      | ts.GetAccessorDeclaration
      | ts.SetAccessorDeclaration
    const directRestParameter = (value: ts.Identifier) => resolveSymbolDeclarations(value).some(
      (declaration) =>
        ts.isParameter(declaration) &&
        !!declaration.dotDotDotToken &&
        ts.isIdentifier(declaration.name) &&
        resolveSymbol(declaration.name) === resolveSymbol(value),
    )
    function externalCaptureStorage(
      target: ts.Expression,
      wrapper: CaptureWrapper,
      bindings: PublicationBindings,
    ): boolean {
      const value = ownershipExpression(target)
      if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        return externalCaptureStorage(value.left, wrapper, bindings)
      }
      if (ts.isObjectLiteralExpression(value)) {
        return value.properties.some((property) => {
          if (ts.isPropertyAssignment(property)) {
            return externalCaptureStorage(property.initializer, wrapper, bindings)
          }
          if (ts.isShorthandPropertyAssignment(property)) {
            return externalCaptureStorage(property.name, wrapper, bindings)
          }
          if (ts.isSpreadAssignment(property)) {
            return externalCaptureStorage(property.expression, wrapper, bindings)
          }
          return false
        })
      }
      if (ts.isArrayLiteralExpression(value)) {
        return value.elements.some((element) =>
          !ts.isOmittedExpression(element) &&
          externalCaptureStorage(ts.isSpreadElement(element) ? element.expression : element, wrapper, bindings)
        )
      }
      if (ts.isIdentifier(value)) {
        const declarations = resolveSymbolDeclarations(value)
        return declarations.length === 0 || declarations.some((declaration) => !nodeInside(wrapper, declaration))
      }
      if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
        return externalCaptureTarget(value.expression, wrapper, new Set(), bindings)
      }
      if (value.kind === ts.SyntaxKind.ThisKeyword) {
        return externalCaptureTarget(value, wrapper, new Set(), bindings)
      }
      return true
    }
    const externalCaptureTarget = (
      target: ts.Expression,
      wrapper: CaptureWrapper,
      seen = new Set<ts.Node>(),
      bindings: PublicationBindings = new Map(),
      assignmentPattern = false,
      freshArgument = false,
      exposure?: ts.Expression,
    ): boolean => {
      const value = ownershipExpression(target)
      if (exposure && externalCaptureStorage(exposure, wrapper, bindings)) return true
      if (seen.has(value)) return true
      seen.add(value)
      if (ts.isConditionalExpression(value)) {
        return externalCaptureTarget(value.whenTrue, wrapper, new Set(seen), bindings, assignmentPattern, freshArgument) ||
          externalCaptureTarget(value.whenFalse, wrapper, new Set(seen), bindings, assignmentPattern, freshArgument)
      }
      if (
        ts.isBinaryExpression(value) &&
        new Set([ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken]).has(value.operatorToken.kind)
      ) {
        return externalCaptureTarget(value.right, wrapper, new Set(seen), bindings, assignmentPattern, freshArgument)
      }
      if (
        ts.isBinaryExpression(value) &&
        new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(value.operatorToken.kind)
      ) {
        return externalCaptureTarget(value.left, wrapper, new Set(seen), bindings, assignmentPattern, freshArgument) ||
          externalCaptureTarget(value.right, wrapper, new Set(seen), bindings, assignmentPattern, freshArgument)
      }
      if (assignmentPattern && ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        return externalCaptureTarget(value.left, wrapper, new Set(seen), bindings, true)
      }
      if (assignmentPattern && ts.isObjectLiteralExpression(value)) {
        return value.properties.some((property) => {
          if (ts.isPropertyAssignment(property)) {
            return externalCaptureTarget(property.initializer, wrapper, new Set(seen), bindings, true)
          }
          if (ts.isShorthandPropertyAssignment(property)) {
            return externalCaptureTarget(property.name, wrapper, new Set(seen), bindings, true)
          }
          if (ts.isSpreadAssignment(property)) {
            return externalCaptureTarget(property.expression, wrapper, new Set(seen), bindings, true)
          }
          return false
        })
      }
      if (assignmentPattern && ts.isArrayLiteralExpression(value)) {
        return value.elements.some((element) => {
          if (ts.isOmittedExpression(element)) return false
          return externalCaptureTarget(
            ts.isSpreadElement(element) ? element.expression : element,
            wrapper,
            new Set(seen),
            bindings,
            true,
          )
        })
      }
      if (
        ts.isObjectLiteralExpression(value) ||
        ts.isArrayLiteralExpression(value) ||
        ts.isNewExpression(value)
      ) {
        return freshArgument ? false : value.pos < 0 || !nodeInside(wrapper, value)
      }
      if (ts.isIdentifier(value)) {
        const declarations = resolveSymbolDeclarations(value)
        if (declarations.some((declaration) => !nodeInside(wrapper, declaration))) return true
        const definitions = resolveValueDefinitions(value)
        const dominant = definitions.some((definition) => dominatesReference(definition.node, value))
        const symbol = resolveSymbol(value)
        const bound = symbol ? bindings.get(symbol) ?? [] : []
        const candidates = publicationIdentifierCandidates(value, bindings)
        if (candidates.length > 0) {
          if (
            candidates.some((candidate) =>
              externalCaptureTarget(
                candidate.value,
                wrapper,
                new Set(seen),
                bindings,
                false,
                candidate.fresh,
                candidate.exposure,
              )
            )
          ) {
            return true
          }
          return !dominant && bound.length === 0 &&
            declarations.some((declaration) => ts.isParameter(declaration)) &&
            !directRestParameter(value)
        }
        if (directRestParameter(value)) return false
        return declarations.length === 0 || declarations.some(
          (declaration) => ts.isParameter(declaration) || !nodeInside(wrapper, declaration),
        )
      }
      if (value.kind === ts.SyntaxKind.ThisKeyword) {
        const candidates = bindings.get(publicationThis) ?? []
        return candidates.length === 0 || candidates.some((candidate) =>
          externalCaptureTarget(
            candidate.value,
            wrapper,
            new Set(seen),
            bindings,
            false,
            candidate.fresh,
            candidate.exposure,
          )
        )
      }
      if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
        const name = propertyName(value)
        if (name) {
          const projected = publicationTargetCandidates(value, bindings, freshArgument)
          if (projected.length > 0) {
            return projected.some((candidate) =>
              externalCaptureTarget(
                candidate.value,
                wrapper,
                new Set(seen),
                bindings,
                false,
                candidate.fresh,
                candidate.exposure,
              )
            )
          }
        }
        const receiver = ownershipExpression(value.expression)
        if (ts.isIdentifier(receiver) && directRestParameter(receiver)) return true
        return externalCaptureTarget(value.expression, wrapper, new Set(seen), bindings)
      }
      return true
    }
    function wrapperPublishesCapturedValue(
      wrapper: CaptureWrapper,
      seen: Set<ts.Node>,
      publicationRoot: CaptureWrapper = wrapper,
      bindings: CapturedBindings = new Map(),
      publicationBindings: PublicationBindings = new Map(),
    ) {
      if (!wrapper.body) return false
      let published = false
      const visit = (node: ts.Node) => {
        if (published) return
        if (
          node !== wrapper.body &&
          (ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) ||
            ts.isSetAccessorDeclaration(node) ||
            ts.isConstructorDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isClassExpression(node))
        ) {
          return
        }
        if (
          ts.isBinaryExpression(node) &&
          new Set([
            ts.SyntaxKind.EqualsToken,
            ts.SyntaxKind.AmpersandAmpersandEqualsToken,
            ts.SyntaxKind.BarBarEqualsToken,
            ts.SyntaxKind.QuestionQuestionEqualsToken,
          ]).has(node.operatorToken.kind) &&
          capturedValue(node.right, new Set(seen), node, bindings) &&
          externalCaptureStorage(node.left, publicationRoot, publicationBindings)
        ) {
          published = true
          return
        }
        if (ts.isCallExpression(node)) {
          const property = callProperty(node)
          if (
            property &&
            new Set(["push", "unshift", "splice", "add", "set"]).has(property.name) &&
            node.arguments.some((argument) => capturedValue(argument, new Set(seen), node, bindings)) &&
            (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) &&
            externalCaptureTarget(node.expression.expression, publicationRoot, new Set(), publicationBindings)
          ) {
            published = true
            return
          }
          const ambientObjectAssign =
            property?.name === "assign" &&
            (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) &&
            ts.isIdentifier(node.expression.expression) &&
            node.expression.expression.text === "Object" &&
            resolveSymbolDeclarations(node.expression.expression).every(
              (declaration) => declaration.getSourceFile() !== file.source,
            )
          if (
            ambientObjectAssign &&
            !!node.arguments[0] &&
            externalCaptureTarget(node.arguments[0], publicationRoot, new Set(), publicationBindings) &&
            node.arguments.slice(1).some((argument) => capturedValue(argument, new Set(seen), node, bindings))
          ) {
            published = true
            return
          }
          if (publishedCapturedValue(node, new Set(seen), publicationRoot, bindings, publicationBindings)) {
            published = true
            return
          }
        }
        if (
          ts.isReturnStatement(node) &&
          publishedCapturedValue(node.expression, new Set(seen), publicationRoot, bindings, publicationBindings)
        ) {
          published = true
          return
        }
        node.forEachChild(visit)
      }
      visit(wrapper.body)
      if (
        !published &&
        !ts.isBlock(wrapper.body) &&
        publishedCapturedValue(wrapper.body, new Set(seen), publicationRoot, bindings, publicationBindings)
      ) {
        published = true
      }
      return published
    }
    function publishedCapturedValue(
      value: ts.Expression | CaptureWrapper | undefined,
      seen = new Set<ts.Node>(),
      publicationRoot?: CaptureWrapper,
      bindings: CapturedBindings = new Map(),
      publicationBindings: PublicationBindings = new Map(),
      args?: readonly ts.Expression[],
      publicationArgs?: readonly PublicationCandidate[][],
      invokedThis?: readonly PublicationCandidate[],
    ): boolean {
      if (!fileCapturesExecution) return false
      if (!value || seen.has(value)) return false
      seen.add(value)
      if (
        ts.isFunctionDeclaration(value) ||
        ts.isFunctionExpression(value) ||
        ts.isArrowFunction(value) ||
        ts.isMethodDeclaration(value) ||
        ts.isGetAccessorDeclaration(value) ||
        ts.isSetAccessorDeclaration(value)
      ) {
        const callablePublicationBindings = !ts.isArrowFunction(value) && invokedThis && invokedThis.length > 0
          ? new Map(publicationBindings).set(publicationThis, invokedThis)
          : publicationBindings
        return wrapperPublishesCapturedValue(
          value,
          seen,
          publicationRoot ?? value,
          args === undefined ? bindings : capturedCallBindings(value, args, bindings),
          args === undefined
            ? callablePublicationBindings
            : publicationCallBindings(value, args, callablePublicationBindings, publicationArgs),
        )
      }
      if (
        ts.isParenthesizedExpression(value) ||
        ts.isAsExpression(value) ||
        ts.isTypeAssertionExpression(value) ||
        ts.isSatisfiesExpression(value) ||
        ts.isNonNullExpression(value)
      ) {
        return publishedCapturedValue(
          value.expression,
          seen,
          publicationRoot,
          bindings,
          publicationBindings,
          args,
          publicationArgs,
          invokedThis,
        )
      }
      if (ts.isIdentifier(value)) {
        return resolveValueDefinitions(value).some((definition) =>
          publishedCapturedValue(
            definition.value,
            new Set(seen),
            publicationRoot,
            bindings,
            publicationBindings,
            args,
            publicationArgs,
            invokedThis,
          )
        ) || resolveSymbolDeclarations(value).some((declaration) =>
          ts.isFunctionDeclaration(declaration) &&
          publishedCapturedValue(
            declaration,
            new Set(seen),
            publicationRoot,
            bindings,
            publicationBindings,
            args,
            publicationArgs,
            invokedThis,
          )
        )
      }
      if (ts.isConditionalExpression(value)) {
        return publishedCapturedValue(
          value.whenTrue,
          new Set(seen),
          publicationRoot,
          bindings,
          publicationBindings,
          args,
          publicationArgs,
          invokedThis,
        ) || publishedCapturedValue(
          value.whenFalse,
          new Set(seen),
          publicationRoot,
          bindings,
          publicationBindings,
          args,
          publicationArgs,
          invokedThis,
        )
      }
      if (
        ts.isBinaryExpression(value) &&
        new Set([ts.SyntaxKind.CommaToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.EqualsToken]).has(
          value.operatorToken.kind,
        )
      ) {
        return publishedCapturedValue(
          value.right,
          seen,
          publicationRoot,
          bindings,
          publicationBindings,
          args,
          publicationArgs,
          invokedThis,
        )
      }
      if (
        ts.isBinaryExpression(value) &&
        new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]).has(value.operatorToken.kind)
      ) {
        return publishedCapturedValue(
          value.left,
          new Set(seen),
          publicationRoot,
          bindings,
          publicationBindings,
          args,
          publicationArgs,
          invokedThis,
        ) || publishedCapturedValue(
          value.right,
          new Set(seen),
          publicationRoot,
          bindings,
          publicationBindings,
          args,
          publicationArgs,
          invokedThis,
        )
      }
      if (ts.isObjectLiteralExpression(value)) {
        return value.properties.some((property) => {
          if (ts.isPropertyAssignment(property)) {
            return publishedCapturedValue(
              property.initializer,
              new Set(seen),
              publicationRoot,
              bindings,
              publicationBindings,
            )
          }
          if (ts.isShorthandPropertyAssignment(property)) {
            return publishedCapturedValue(property.name, new Set(seen), publicationRoot, bindings, publicationBindings)
          }
          if (ts.isSpreadAssignment(property)) {
            return publishedCapturedValue(
              property.expression,
              new Set(seen),
              publicationRoot,
              bindings,
              publicationBindings,
            )
          }
          return (ts.isMethodDeclaration(property) ||
              ts.isGetAccessorDeclaration(property) ||
              ts.isSetAccessorDeclaration(property)) &&
            publishedCapturedValue(property, new Set(seen), publicationRoot, bindings, publicationBindings)
        })
      }
      if (ts.isArrayLiteralExpression(value)) {
        return value.elements.some((element) =>
          !ts.isOmittedExpression(element) &&
          publishedCapturedValue(
            ts.isSpreadElement(element) ? element.expression : element,
            new Set(seen),
            publicationRoot,
            bindings,
            publicationBindings,
          )
        )
      }
      if (ts.isClassExpression(value)) {
        return value.members.some(
          (member) =>
            (ts.isMethodDeclaration(member) ||
              ts.isGetAccessorDeclaration(member) ||
              ts.isSetAccessorDeclaration(member)) &&
            publishedCapturedValue(member, new Set(seen), publicationRoot, bindings, publicationBindings),
        )
      }
      if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
        const assigned = assignedPropertyValues(value)
        const resolved = [
          ...(assigned.replacesStatic ? [] : propertyValues(value)),
          ...assigned.values,
        ]
        if (resolved.some((candidate) =>
          publishedCapturedValue(
            candidate,
            new Set(seen),
            publicationRoot,
            bindings,
            publicationBindings,
            args,
            publicationArgs,
            invokedThis,
          )
        )) {
          return true
        }
        if (assigned.replacesStatic) return false
        return [...(propertySymbol(value)?.declarations ?? [])].some(
          (declaration) =>
            ts.isMethodDeclaration(declaration) &&
            publishedCapturedValue(
              declaration,
              new Set(seen),
              publicationRoot,
              bindings,
              publicationBindings,
              args,
              publicationArgs,
              invokedThis,
            ),
        )
      }
      if (ts.isCallExpression(value)) {
        const property = callProperty(value)
        if (
          property &&
          new Set(["bind", "call", "apply"]).has(property.name) &&
          (ts.isPropertyAccessExpression(value.expression) || ts.isElementAccessExpression(value.expression))
        ) {
          const target = value.expression.expression
          const invocationThis = publicationInvocationThis(publicationBindings, value.arguments[0])
          if (property.name === "bind") {
            return publishedCapturedValue(
              target,
              new Set(seen),
              publicationRoot,
              bindings,
              publicationBindings,
              [...value.arguments.slice(1), ...(args ?? [])],
              undefined,
              invocationThis,
            )
          }
          if (property.name === "call") {
            return publishedCapturedValue(
              target,
              new Set(seen),
              publicationRoot,
              bindings,
              publicationBindings,
              value.arguments.slice(1),
              undefined,
              invocationThis,
            )
          }
          return !!value.arguments[1] && publicationExpressionCandidates(
            value.arguments[1],
            publicationBindings,
            true,
          )
            .flatMap((candidate) => publicationArrayTuples(candidate, publicationBindings))
            .some((callArgs) =>
              publishedCapturedValue(
                target,
                new Set(seen),
                publicationRoot,
                bindings,
                publicationBindings,
                callArgs.map((candidate) => candidate.value),
                [callArgs],
                invocationThis,
              )
            )
        }
        const invocationThis =
          (ts.isPropertyAccessExpression(value.expression) || ts.isElementAccessExpression(value.expression))
            ? publicationInvocationThis(publicationBindings, value.expression.expression)
            : undefined
        return publishedCapturedValue(
          value.expression,
          new Set(seen),
          publicationRoot,
          bindings,
          publicationBindings,
          value.arguments,
          undefined,
          invocationThis,
        )
      }
      return false
    }
    const returnedRawHelperNames = (body: ts.Block, seen: Set<ts.Node>) => {
      const names: string[] = []
      const visit = (node: ts.Node) => {
        if (
          node !== body &&
          (ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) ||
            ts.isSetAccessorDeclaration(node) ||
            ts.isConstructorDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isClassExpression(node))
        ) {
          return
        }
        if (ts.isReturnStatement(node)) {
          names.push(...rawHelperValueNames(node.expression, new Set(seen)))
          return
        }
        node.forEachChild(visit)
      }
      visit(body)
      return [...new Set(names)]
    }
    function rawHelperValueNames(
      value: ts.Expression | undefined,
      seen = new Set<ts.Node>(),
    ): string[] {
      if (!value || seen.has(value)) return []
      seen.add(value)
      if (
        ts.isParenthesizedExpression(value) ||
        ts.isAsExpression(value) ||
        ts.isTypeAssertionExpression(value) ||
        ts.isSatisfiesExpression(value) ||
        ts.isNonNullExpression(value)
      ) {
        return rawHelperValueNames(value.expression, seen)
      }
      if (ts.isIdentifier(value) || ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
        return resolvedHelperNames(value).filter((name) => !!helperAllowlist(name))
      }
      if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
        return ts.isBlock(value.body)
          ? returnedRawHelperNames(value.body, seen)
          : rawHelperValueNames(value.body, seen)
      }
      if (ts.isObjectLiteralExpression(value)) {
        return [...new Set(value.properties.flatMap((property) => {
          if (ts.isPropertyAssignment(property)) return rawHelperValueNames(property.initializer, new Set(seen))
          if (ts.isShorthandPropertyAssignment(property)) return rawHelperValueNames(property.name, new Set(seen))
          if (ts.isSpreadAssignment(property)) return rawHelperValueNames(property.expression, new Set(seen))
          if (
            (ts.isMethodDeclaration(property) ||
              ts.isGetAccessorDeclaration(property) ||
              ts.isSetAccessorDeclaration(property)) &&
            property.body
          ) {
            return returnedRawHelperNames(property.body, new Set(seen))
          }
          return []
        }))]
      }
      if (ts.isArrayLiteralExpression(value)) {
        return [...new Set(value.elements.flatMap((element) =>
          ts.isOmittedExpression(element)
            ? []
            : rawHelperValueNames(ts.isSpreadElement(element) ? element.expression : element, new Set(seen)),
        ))]
      }
      if (ts.isConditionalExpression(value)) {
        return [...new Set([
          ...rawHelperValueNames(value.whenTrue, new Set(seen)),
          ...rawHelperValueNames(value.whenFalse, new Set(seen)),
        ])]
      }
      if (ts.isBinaryExpression(value)) {
        if (value.operatorToken.kind === ts.SyntaxKind.CommaToken) {
          return rawHelperValueNames(value.right, new Set(seen))
        }
        if (
          new Set([
            ts.SyntaxKind.AmpersandAmpersandToken,
            ts.SyntaxKind.BarBarToken,
            ts.SyntaxKind.QuestionQuestionToken,
          ]).has(value.operatorToken.kind)
        ) {
          return [...new Set([
            ...rawHelperValueNames(value.left, new Set(seen)),
            ...rawHelperValueNames(value.right, new Set(seen)),
          ])]
        }
      }
      if (ts.isCallExpression(value) && callProperty(value)?.name === "bind") {
        if (ts.isPropertyAccessExpression(value.expression) || ts.isElementAccessExpression(value.expression)) {
          return rawHelperValueNames(value.expression.expression, new Set(seen))
        }
      }
      return []
    }
    const privateJoinTarget = (node: ts.CallExpression) => {
      if (!new Set(["call", "apply"]).has(callProperty(node)?.name ?? "")) return undefined
      if (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) {
        return node.expression.expression
      }
      return undefined
    }
    const privateJoinCallSignature = (helper: string, node: ts.CallExpression) => {
      if (ts.isIdentifier(node.expression) && node.expression.text === helper) return normalize(node)
      const target = privateJoinTarget(node)
      if (!target || !ts.isIdentifier(target) || target.text !== helper) return undefined
      const invocation = callProperty(node)?.name
      const args = invocation === "call"
        ? [...node.arguments].slice(1)
        : invocation === "apply" && node.arguments.length === 2 && ts.isArrayLiteralExpression(node.arguments[1]!) &&
            node.arguments[1]!.elements.every(
              (element) => !ts.isOmittedExpression(element) && !ts.isSpreadElement(element),
            )
          ? [...node.arguments[1]!.elements]
          : undefined
      if (!args) return undefined
      return `${helper}(${args.map((argument) => normalize(argument)).join(",")})`
    }
    const lifecycleReceiver = (expression: ts.Expression | undefined) => {
      if (!expression) return false
      const type = file.checker.typeToString(
        file.checker.getTypeAtLocation(expression),
        undefined,
        ts.TypeFormatFlags.NoTruncation,
      )
      return /\b(?:GenerationLease|LifecycleOwnerHandle|TransferredLifecycleOwnerHandle|GenerationOwnedHandle|TransferredGenerationHandle)\b/.test(
        type,
      )
    }
    const exportedFunction = (node: ReturnType<typeof nearestFunction>) => {
      if (!node) return false
      if (ts.isFunctionDeclaration(node)) return exported(node)
      if (ts.isMethodDeclaration(node)) {
        let current: ts.Node | undefined = node.parent
        while (current && !ts.isSourceFile(current)) {
          if (ts.isClassDeclaration(current)) return exported(current)
          current = current.parent
        }
        return false
      }
      if (ts.isVariableDeclaration(node.parent)) {
        const statement = node.parent.parent.parent
        return ts.isVariableStatement(statement) && exported(statement)
      }
      return false
    }
    const transfers = new Map<ts.VariableDeclaration, ts.CallExpression[]>()
    const transferRunSyncs = new Map<ts.VariableDeclaration, Set<ts.CallExpression>>()
    const checkMembers = (container: ts.DeclarationStatement, members: ts.NodeArray<ts.TypeElement | ts.ClassElement>) => {
      if (!exported(container)) return
      const containerName = container.name?.getText(file.source) ?? "lifecycle"
      if (!/^(?:Transferred)?(?:Generation|Lifecycle|InstanceGeneration|DirectoryRoot).*(?:Handle|Lease|Owner|Channel)$/.test(containerName)) return
      for (const member of members) {
        if (
          ts.canHaveModifiers(member) &&
          ts.getModifiers(member)?.some(
            (modifier) =>
              modifier.kind === ts.SyntaxKind.PrivateKeyword || modifier.kind === ts.SyntaxKind.ProtectedKeyword,
          )
        ) {
          continue
        }
        const name = nameText(member.name)
        if (!name) continue
        const text = member.getText(file.source)
        if (/^(?:token|execution|ownerStack|stack|admissionRef)$/.test(name)) {
          errors.push(`public lifecycle capability field: ${file.relative}:${containerName}.${name}`)
        }
        const typeNode = ts.isPropertySignature(member) ||
            ts.isMethodSignature(member) ||
            ts.isPropertyDeclaration(member) ||
            ts.isMethodDeclaration(member) ||
            ts.isGetAccessorDeclaration(member) ||
            ts.isSetAccessorDeclaration(member)
          ? member.type
          : undefined
        const type = typeNode?.getText(file.source) ?? ""
        if (
          /Promise(?:Like)?\s*</.test(type) &&
          (name !== "enter" || /^(?:ready|settled|receipt|awaitReady|awaitSettled|settlement)$/.test(name))
        ) {
          errors.push(`public lifecycle readiness or settlement thenable: ${file.relative}:${containerName}.${name}`)
        }
        if (name === "runSync" && !text.includes("RejectPromiseLike")) {
          errors.push(`runSync signature must reject PromiseLike results: ${file.relative}:${containerName}`)
        }
        if (name === "release" && !text.includes("OwnerReleaseResult")) {
          errors.push(`release requires a discriminated result: ${file.relative}:${containerName}`)
        }
      }
    }
    const visit = (node: ts.Node) => {
      if (
        exported(node) &&
        ((ts.isVariableStatement(node) &&
          node.declarationList.declarations.some((declaration) => nameText(declaration.name) === "InstanceAdmissionRef")) ||
          ((ts.isClassDeclaration(node) ||
            ts.isFunctionDeclaration(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isTypeAliasDeclaration(node)) &&
            node.name?.text === "InstanceAdmissionRef"))
      ) {
        errors.push(`InstanceAdmissionRef must remain module-private: ${file.relative}`)
      }
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
        const lifecycleModule = !!node.moduleSpecifier &&
          ts.isStringLiteralLike(node.moduleSpecifier) &&
          /(?:^|\/)instance-ref(?:\.[cm]?[jt]s)?$/.test(node.moduleSpecifier.text)
        for (const element of node.exportClause.elements) {
          const name = element.propertyName?.text ?? element.name.text
          if (name === "InstanceAdmissionRef") {
            errors.push(`InstanceAdmissionRef must remain module-private: ${file.relative}`)
          }
          if (node.isTypeOnly || element.isTypeOnly) continue
          const target = node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)
            ? resolveModuleSource(file.relative, node.moduleSpecifier.text)
            : undefined
          const imported = element.propertyName?.text ?? element.name.text
          const definitions = target || !node.moduleSpecifier
            ? (target ? moduleExportDefinitions(target, imported) : localBindingDefinitions(file, imported))
            : []
          const helper = definitions
            .flatMap((definition) => resolvedHelperNames(definition.value))
            .find((candidate) => !!helperAllowlist(candidate)) ??
            (ts.isIdentifier(element.name) ? helperNameFromIdentifier(element.name, name) : undefined) ??
            (lifecycleModule && helperAllowlist(name) ? name : undefined)
          if (helper && helperAllowlist(helper)) {
            errors.push(`raw lifecycle helper cannot be re-exported: ${file.relative}:${helper}`)
          }
          if (
            file.relative !== "src/effect/instance-ref.ts" &&
            definitions.some((definition) => capturedValue(definition.value))
          ) {
            errors.push(`captured InstanceExecution cannot be re-exported: ${file.relative}`)
          }
          if (
            file.relative !== "src/effect/instance-ref.ts" &&
            definitions.some((definition) => publishedCapturedValue(definition.value))
          ) {
            errors.push(`captured InstanceExecution cannot be published through external state: ${file.relative}`)
          }
        }
      }
      if (
        ts.isExportDeclaration(node) &&
        node.exportClause &&
        ts.isNamespaceExport(node.exportClause) &&
        !!node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        /(?:^|\/)instance-ref(?:\.[cm]?[jt]s)?$/.test(node.moduleSpecifier.text)
      ) {
        errors.push(`lifecycle authority module cannot be namespace re-exported: ${file.relative}`)
      }
      if (
        ts.isExportDeclaration(node) &&
        !node.exportClause &&
        !!node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        /(?:^|\/)instance-ref(?:\.[cm]?[jt]s)?$/.test(node.moduleSpecifier.text)
      ) {
        errors.push(`lifecycle authority module cannot be star re-exported: ${file.relative}`)
      }
      if (ts.isExportAssignment(node)) {
        const helper = rawHelperValueNames(node.expression)[0]
        if (helper) errors.push(`raw lifecycle helper cannot be re-exported: ${file.relative}:${helper}`)
        if (file.relative !== "src/effect/instance-ref.ts" && capturedValue(node.expression)) {
          errors.push(`captured InstanceExecution cannot be re-exported: ${file.relative}`)
        }
        if (file.relative !== "src/effect/instance-ref.ts" && publishedCapturedValue(node.expression)) {
          errors.push(`captured InstanceExecution cannot be published through external state: ${file.relative}`)
        }
      }
      if (exported(node)) {
        const helper = ts.isVariableStatement(node)
          ? node.declarationList.declarations.flatMap((declaration) =>
              rawHelperValueNames(declaration.initializer),
            )[0]
          : ts.isFunctionDeclaration(node) && node.body
            ? returnedRawHelperNames(node.body, new Set())[0]
            : undefined
        if (helper) errors.push(`raw lifecycle helper cannot be re-exported: ${file.relative}:${helper}`)
      }
      if (file.relative !== "src/effect/instance-ref.ts" && exported(node)) {
        if (
          (ts.isVariableStatement(node) &&
            node.declarationList.declarations.some((declaration) => capturedValue(declaration.initializer))) ||
          ((ts.isPropertyDeclaration(node) || ts.isPropertyAssignment(node)) && capturedValue(node.initializer))
        ) {
          errors.push(`captured InstanceExecution cannot be re-exported: ${file.relative}`)
        }
        if (ts.isFunctionDeclaration(node) && node.body) {
          const returned = node.body.statements.some(
            (statement) => ts.isReturnStatement(statement) && capturedValue(statement.expression),
          )
          if (returned) errors.push(`captured InstanceExecution cannot be re-exported: ${file.relative}`)
        }
        const published = ts.isVariableStatement(node)
          ? node.declarationList.declarations.some((declaration) => publishedCapturedValue(declaration.initializer))
          : ts.isFunctionDeclaration(node)
            ? publishedCapturedValue(node)
            : ts.isClassDeclaration(node)
              ? node.members.some(
                  (member) =>
                    (ts.isMethodDeclaration(member) ||
                      ts.isGetAccessorDeclaration(member) ||
                      ts.isSetAccessorDeclaration(member)) &&
                    publishedCapturedValue(member),
                )
              : false
        if (published) {
          errors.push(`captured InstanceExecution cannot be published through external state: ${file.relative}`)
        }
      }
      if (
        file.relative !== "src/effect/instance-ref.ts" &&
        ts.isReturnStatement(node) &&
        capturedValue(node.expression) &&
        exportedFunction(nearestFunction(node))
      ) {
        errors.push(`captured InstanceExecution cannot be re-exported: ${file.relative}`)
      }
      if (
        file.relative !== "src/effect/instance-ref.ts" &&
        ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) &&
          /\b(?:InstanceExecution|LifecycleOwnerToken|LifecycleOwnerStack)\b/.test(node.type.getText(file.source)))
      ) {
        errors.push(`InstanceExecution cannot be cast or reconstructed: ${file.relative}`)
      }
      if (
        file.relative !== "src/effect/instance-ref.ts" &&
        ts.isReturnStatement(node) &&
        !!node.expression &&
        ts.isObjectLiteralExpression(node.expression)
      ) {
        const fn = nearestFunction(node)
        if (fn?.type && /\b(?:InstanceExecution|LifecycleOwnerToken|LifecycleOwnerStack)\b/.test(fn.type.getText(file.source))) {
          errors.push(`InstanceExecution cannot be cast or reconstructed: ${file.relative}`)
        }
      }
      if (
        file.relative !== "src/effect/instance-ref.ts" &&
        ts.isVariableDeclaration(node) &&
        !!node.type &&
        /\b(?:InstanceExecution|LifecycleOwnerToken|LifecycleOwnerStack)\b/.test(node.type.getText(file.source)) &&
        !!node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        errors.push(`InstanceExecution cannot be cast or reconstructed: ${file.relative}`)
      }
      if (ts.isImportDeclaration(node) && node.importClause?.name) {
        const helper = resolvedHelperNames(node.importClause.name).find((candidate) => !!helperAllowlist(candidate))
        const allowed = helper ? helperAllowlist(helper) : undefined
        if (helper && allowed && (!allowed.has(file.relative) || node.importClause.name.text !== helper)) {
          errors.push(`raw lifecycle helper is not allowlisted: ${file.relative}:${helper}`)
        }
      }
      if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        const lifecycleModule = ts.isStringLiteralLike(node.moduleSpecifier) &&
          /(?:^|\/)instance-ref(?:\.[cm]?[jt]s)?$/.test(node.moduleSpecifier.text)
        for (const element of node.importClause.namedBindings.elements) {
          const name = element.propertyName?.text ?? element.name.text
          if (name === "InstanceAdmissionRef") {
            errors.push(`InstanceAdmissionRef must remain module-private: ${file.relative}`)
          }
          const resolved = resolvedHelperNames(element.name).find((candidate) => !!helperAllowlist(candidate)) ??
            helperNameFromIdentifier(element.name, name) ??
            (lifecycleModule && helperAllowlist(name) ? name : undefined)
          const allowed = resolved ? helperAllowlist(resolved) : undefined
          if (allowed && (!allowed.has(file.relative) || !!element.propertyName)) {
            errors.push(`raw lifecycle helper is not allowlisted: ${file.relative}:${resolved}`)
          }
        }
      }
      if (ts.isInterfaceDeclaration(node)) {
        checkMembers(node, node.members)
      }
      if (ts.isClassDeclaration(node) && node.name) checkMembers(node, node.members)
      if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
        checkMembers(node, node.type.members)
      }
      if (ts.isMethodDeclaration(node) || ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) {
        const name = nameText(node.name)
        const initializer = "initializer" in node ? node.initializer : undefined
        const asyncInitializer =
          !!initializer &&
          (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) &&
          !!initializer.modifiers?.some((item) => item.kind === ts.SyntaxKind.AsyncKeyword)
        if (
          name === "enter" &&
          ((ts.isMethodDeclaration(node) &&
            !!node.modifiers?.some((item) => item.kind === ts.SyntaxKind.AsyncKeyword)) ||
            asyncInitializer ||
            containsAwait(node))
        ) {
          errors.push(`enter must be non-async and contain no readiness await: ${file.relative}:${enclosingSymbol(node)}`)
        }
      }
      if (
        ts.isVariableDeclaration(node) &&
        nameText(node.name) === "enter" &&
        !!node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
        (!!node.initializer.modifiers?.some((item) => item.kind === ts.SyntaxKind.AsyncKeyword) || containsAwait(node.initializer))
      ) {
        errors.push(`enter must be non-async and contain no readiness await: ${file.relative}:${enclosingSymbol(node)}`)
      }
      if (
        file.relative !== "src/effect/instance-ref.ts" &&
        ts.isPropertyAccessExpression(node) &&
        /^(?:token|execution|ownerStack|stack|admissionRef)$/.test(node.name.text) &&
        /(?:lease|owner|handle|handoff|channel|execution|admission)/i.test(node.expression.getText(file.source))
      ) {
        errors.push(`raw lifecycle capability access is forbidden: ${file.relative}:${enclosingSymbol(node)}`)
      }
      if (
        file.relative !== "src/effect/instance-ref.ts" &&
        ts.isElementAccessExpression(node) &&
        ts.isStringLiteralLike(node.argumentExpression) &&
        /^(?:token|execution|ownerStack|stack|admissionRef)$/.test(node.argumentExpression.text) &&
        /(?:lease|owner|handle|handoff|channel|execution|admission)/i.test(node.expression.getText(file.source))
      ) {
        errors.push(`raw lifecycle capability access is forbidden: ${file.relative}:${enclosingSymbol(node)}`)
      }
      if (ts.isCallExpression(node)) {
        if (
          file.relative !== "src/effect/instance-ref.ts" &&
          callProperty(node)?.name === "provideService" &&
          node.arguments[0]?.getText(file.source) === "InstanceAdmissionRef"
        ) {
          errors.push(`InstanceAdmissionRef cannot be provided outside its module: ${file.relative}`)
        }
        const equivalentPrivateJoin = privateJoinTarget(node)
        const equivalentPrivateJoinHelper = resolvedHelperName(equivalentPrivateJoin)
        const helper = equivalentPrivateJoinHelper && helperAllowlist(equivalentPrivateJoinHelper)
          ? equivalentPrivateJoinHelper
          : resolvedHelperName(node.expression)
        const allowed = helper ? helperAllowlist(helper) : undefined
        if (helper && Object.hasOwn(rawHelperSymbolAllowlist, helper)) {
          const symbol = enclosingDeclarationSymbol(node)
          const key = `${helper}:${file.relative}:${symbol}`
          rawHelperCalls.set(key, [...(rawHelperCalls.get(key) ?? []), node])
          const contract = rawHelperCallContracts.get(key)
          if (!contract) {
            errors.push(`raw lifecycle helper is not allowlisted: ${file.relative}:${symbol}:${helper}`)
          } else if (!contract.has(rawHelperCallFingerprint(helper, node) ?? "")) {
            errors.push(`raw lifecycle helper call is not exact-allowlisted: ${file.relative}:${symbol}:${helper}`)
          }
        } else if (helper && Object.hasOwn(privateJoinAllowlist, helper)) {
          const key = `${helper}:${file.relative}:${enclosingSymbol(node)}`
          const signature = privateJoinCallSignature(helper, node)
          privateJoinCalls.set(key, [...(privateJoinCalls.get(key) ?? []), signature ?? normalize(node)])
          if (!signature || !privateJoinCallContracts.get(key)?.includes(signature)) {
            errors.push(`private lifecycle join call is not exact-allowlisted: ${file.relative}:${enclosingSymbol(node)}:${helper}`)
          }
        } else if (helper && allowed && !allowed.has(file.relative)) {
          errors.push(`raw lifecycle helper is not allowlisted: ${file.relative}:${enclosingSymbol(node)}:${helper}`)
        }
        const property = callProperty(node)
        const releaseReceiver = ts.isPropertyAccessExpression(node.expression) ? node.expression.expression : undefined
        const acquiredRelease = property?.name === "release" ? resolveLease(releaseReceiver) : undefined
        if (
          property?.name === "release" &&
          (acquiredRelease || lifecycleReceiver(releaseReceiver) || /(?:lease|owner|handle|handoff|child)/i.test(property.receiver))
        ) {
          if (node.arguments.length === 0) {
            errors.push(`release requires a discriminated result: ${file.relative}:${enclosingSymbol(node)}`)
          } else if (releaseShape(node) === "invalid") {
            errors.push(`release result must be exactly one discriminated shape: ${file.relative}:${enclosingSymbol(node)}`)
          }
        }
        if (
          (property?.name === "runSync" || resolvedMethodName(node.expression) === "runSync") &&
          returnsPromiseLike(node.arguments[0], file.checker, resolveValues)
        ) {
          errors.push(`runSync cannot accept async or PromiseLike callbacks: ${file.relative}:${enclosingSymbol(node)}`)
        }
        if (
          helper &&
          new Set([
            "registerTransferredGenerationProducer",
            "registerTransferredGenerationChannel",
            "registerGenerationBody",
          ]).has(helper)
        ) {
          const input = node.arguments[0]
          const handoff = input && ts.isObjectLiteralExpression(input) ? objectProperty(input, "handoffFrom") : undefined
          if (!handoff) {
            errors.push(`transferred producer requires explicit handoffFrom: ${file.relative}:${enclosingSymbol(node)}`)
          } else {
            if (
              ts.isObjectLiteralExpression(input!) &&
              (objectProperty(input!, "target") || objectProperty(input!, "context") || objectProperty(input!, "directory"))
            ) {
              errors.push(`transferred producer target must derive from handoffFrom: ${file.relative}:${enclosingSymbol(node)}`)
            }
            const handoffExpression = propertyExpression(handoff)
            const lease = resolveLease(handoffExpression)
            if (!lease) {
              errors.push(`transferred producer requires an acquired generation handoff lease: ${file.relative}:${enclosingSymbol(node)}`)
            } else {
              const current = transfers.get(lease) ?? []
              current.push(node)
              transfers.set(lease, current)
            }
            let current: ts.Node | undefined = node.parent
            let runSync: ts.CallExpression | undefined
            while (current) {
              if (ts.isCallExpression(current) && callProperty(current)?.name === "runSync") {
                runSync = current
                break
              }
              current = current.parent
            }
            if (!runSync) {
              errors.push(`transferred producer registration must be inside handoffFrom.runSync: ${file.relative}:${enclosingSymbol(node)}`)
            } else if (
              !handoffExpression ||
              !ts.isIdentifier(handoffExpression) ||
              callProperty(runSync)?.receiver !== handoffExpression.text
            ) {
              errors.push(`transferred producer registration must use the exact handoffFrom.runSync: ${file.relative}:${enclosingSymbol(node)}`)
            } else if (lease && nearestFunction(runSync) !== (nearestFunction(lease) ?? undefined)) {
              errors.push(`transferred producer registration must stay in the acquisition function: ${file.relative}:${enclosingSymbol(node)}`)
            } else if (lease) {
              const current = transferRunSyncs.get(lease) ?? new Set<ts.CallExpression>()
              current.add(runSync)
              transferRunSyncs.set(lease, current)
            }
          }
        }
      }
      node.forEachChild(visit)
    }
    visit(file.source)
    for (const [key, matches] of rawHelperCalls) {
      if (matches.length <= 1) continue
      errors.push(`raw lifecycle helper call is not exact-allowlisted: ${key}`)
    }
    for (const [key, matches] of privateJoinCalls) {
      const contract = privateJoinCallContracts.get(key)
      if (!contract) continue
      const expected = contract.reduce(
        (result, signature) => result.set(signature, (result.get(signature) ?? 0) + 1),
        new Map<string, number>(),
      )
      const actual = matches.reduce((result, signature) => {
        return result.set(signature, (result.get(signature) ?? 0) + 1)
      }, new Map<string, number>())
      if (
        matches.length !== contract.length ||
        [...expected].some(([signature, count]) => actual.get(signature) !== count)
      ) {
        errors.push(`private lifecycle join call is not exact-allowlisted: ${key}`)
      }
    }

    const shortSetupLeases = new Set([
      ...transfers.keys(),
      ...leaseDeclarations.filter((lease) => {
        const name = ts.isIdentifier(lease.name) ? lease.name.text : ""
        const scope = nearestFunction(lease) ?? file.source
        return calls.some(
          (call) =>
            nodeInside(scope, call) &&
            callProperty(call)?.receiver === name &&
            new Set(["runSync", "release"]).has(callProperty(call)?.name ?? ""),
        )
      }),
    ])
    for (const lease of shortSetupLeases) {
      const registrations = transfers.get(lease) ?? []
      const name = ts.isIdentifier(lease.name) ? lease.name.text : "handoff"
      const scope = nearestFunction(lease) ?? file.source
      const releases = calls.filter((call) => {
        const property = callProperty(call)
        return property?.name === "release" && property.receiver === name && nodeInside(scope, call)
      })
      const success = releases.filter((call) => releaseShape(call) === "success")
      const failure = releases.filter((call) => releaseShape(call) === "failure")
      let setupTry: ts.TryStatement | undefined
      if (registrations.length === 0) {
        errors.push(`generation handoff lease must register at least one transferred owner: ${file.relative}:${name}`)
      }
      if ((transferRunSyncs.get(lease)?.size ?? 0) > 1) {
        errors.push(`generation handoff transfers must share one exact runSync setup: ${file.relative}:${name}`)
      }
      if (success.length !== 1 || failure.length !== 1 || releases.length !== 2) {
        errors.push(`transferred producer setup requires one success and one failure release path: ${file.relative}:${name}`)
      } else {
        const tryFor = (call: ts.CallExpression, phase: "try" | "catch") => {
          let current: ts.Node | undefined = call.parent
          while (current && current !== scope) {
            if (ts.isTryStatement(current)) {
              if (phase === "try" && nodeInside(current.tryBlock, call)) return current
              if (phase === "catch" && current.catchClause && nodeInside(current.catchClause, call)) return current
            }
            current = current.parent
          }
          return undefined
        }
        setupTry = tryFor(success[0]!, "try")
        if (setupTry !== tryFor(failure[0]!, "catch") || !setupTry) {
          errors.push(`transferred producer success and failure release paths must be structurally exclusive: ${file.relative}:${name}`)
        }
      }
      if (setupTry && success[0] && failure[0]) {
        const successStatement = setupTry.tryBlock.statements.find((statement) => nodeInside(statement, success[0]!))
        if (!successStatement || successStatement !== success[0].parent || !ts.isExpressionStatement(successStatement)) {
          errors.push(`success release must dominate every normal exit: ${file.relative}:${name}`)
        }
        const statementsAfterSuccess = successStatement
          ? setupTry.tryBlock.statements
              .slice(setupTry.tryBlock.statements.indexOf(successStatement) + 1)
              .filter((statement) => !ts.isEmptyStatement(statement))
          : []
        if (
          statementsAfterSuccess.length > 1 ||
          (statementsAfterSuccess[0] &&
            (!ts.isReturnStatement(statementsAfterSuccess[0]) ||
              !nonThrowingDirectReturn(statementsAfterSuccess[0].expression)))
        ) {
          errors.push(
            `successful release must be the last potentially throwing action protected by catch: ${file.relative}:${name}`,
          )
        }

        const catchClause = setupTry.catchClause
        const catchBinding = catchClause?.variableDeclaration?.name
        const failureStatement = catchClause?.block.statements.find((statement) => nodeInside(statement, failure[0]!))
        const failureIndex = failureStatement && catchClause ? catchClause.block.statements.indexOf(failureStatement) : -1
        const rethrow = catchClause?.block.statements[failureIndex + 1]
        if (
          !catchClause ||
          !catchBinding ||
          !ts.isIdentifier(catchBinding) ||
          failureIndex !== 0 ||
          failureStatement !== failure[0].parent ||
          !ts.isExpressionStatement(failureStatement) ||
          catchClause.block.statements.length !== 2 ||
          !rethrow ||
          !ts.isThrowStatement(rethrow) ||
          !rethrow.expression ||
          !ts.isIdentifier(rethrow.expression) ||
          rethrow.expression.text !== catchBinding.text
        ) {
          errors.push(
            `failure release must dominate every exceptional exit and rethrow the original error: ${file.relative}:${name}`,
          )
        }
        let finallyOverrides = false
        const scanFinally = (node: ts.Node) => {
          if (node !== setupTry!.finallyBlock && nearestFunction(node) !== nearestFunction(setupTry!)) return
          if (
            ts.isReturnStatement(node) ||
            ts.isThrowStatement(node) ||
            ts.isBreakStatement(node) ||
            ts.isContinueStatement(node) ||
            ts.isAwaitExpression(node)
          ) {
            finallyOverrides = true
          }
          node.forEachChild(scanFinally)
        }
        if (setupTry.finallyBlock) scanFinally(setupTry.finallyBlock)
        if (finallyOverrides) {
          errors.push(
            `failure release must dominate every exceptional exit and rethrow the original error: ${file.relative}:${name}`,
          )
        }
      }
      const firstRelease = releases.map((call) => call.getStart(file.source)).sort((left, right) => left - right)[0] ?? scope.end
      if (
        registrations.length > 0 &&
        firstRelease < Math.max(...registrations.map((call) => call.end))
      ) {
        errors.push(`transferred producer release must follow registration: ${file.relative}:${name}`)
      }
      const scanRegion = (node: ts.Node) => {
        if (node !== scope && nearestFunction(node) !== scope) return
        const position = node.getStart(file.source)
        if (position > lease.end && position < firstRelease) {
          if (ts.isAwaitExpression(node)) {
            errors.push(`transferred producer setup must not await before release: ${file.relative}:${name}`)
          }
          if (ts.isReturnStatement(node)) {
            errors.push(`transferred producer setup must not return before release: ${file.relative}:${name}`)
          }
          if (ts.isThrowStatement(node)) {
            errors.push(`transferred producer setup must not throw before release: ${file.relative}:${name}`)
          }
          if (setupTry && (ts.isBreakStatement(node) || ts.isContinueStatement(node))) {
            const bypassesSuccessRelease = (() => {
              if (node.label) return true
              let current: ts.Node | undefined = node.parent
              while (current && current !== scope) {
                if (
                  ts.isForStatement(current) ||
                  ts.isForInStatement(current) ||
                  ts.isForOfStatement(current) ||
                  ts.isWhileStatement(current) ||
                  ts.isDoStatement(current) ||
                  ts.isSwitchStatement(current)
                ) {
                  return nodeInside(current, setupTry)
                }
                current = current.parent
              }
              return true
            })()
            if (bypassesSuccessRelease) {
              errors.push(`success release must dominate every normal exit: ${file.relative}:${name}`)
            }
          }
          if (
            ts.isBinaryExpression(node) &&
            node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isIdentifier(node.right) &&
            node.right.text === name
          ) {
            errors.push(`generation handoff lease must not escape before release: ${file.relative}:${name}`)
          }
          if (
            ts.isCallExpression(node) &&
            node.arguments.some((argument) => ts.isIdentifier(argument) && argument.text === name)
          ) {
            errors.push(`generation handoff lease must not escape before release: ${file.relative}:${name}`)
          }
        }
        node.forEachChild(scanRegion)
      }
      scanRegion(scope)

      const successPosition = success[0]?.getStart(file.source) ?? firstRelease
      const runSyncs = transferRunSyncs.get(lease) ?? new Set<ts.CallExpression>()
      const runSyncCallbacks = new Map(
        [...runSyncs].flatMap((runSync) => {
          const callback = runSync.arguments[0]
          return callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
            ? [[runSync, callback] as const]
            : []
        }),
      )
      const childDeclarations = new Set<ts.VariableDeclaration>()
      const declarationBefore = (node: ts.Node, boundary: ts.Node) => {
        let current: ts.Node | undefined = node.parent
        while (current && current !== boundary) {
          if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) return current
          if (
            ts.isFunctionDeclaration(current) ||
            ts.isFunctionExpression(current) ||
            ts.isArrowFunction(current) ||
            ts.isMethodDeclaration(current)
          ) {
            return undefined
          }
          current = current.parent
        }
        return undefined
      }
      for (const registration of registrations) {
        const runSync = [...runSyncs].find((candidate) => nodeInside(candidate, registration))
        const callback = runSync ? runSyncCallbacks.get(runSync) : undefined
        const declaration = callback ? declarationBefore(registration, callback) : undefined
        if (declaration) childDeclarations.add(declaration)
        if (!callback || declaration) continue

        let current: ts.Node = registration
        let allowedReturn = false
        while (current.parent && current.parent !== callback) {
          if (ts.isCallExpression(current.parent) && current.parent !== runSync) break
          if (ts.isReturnStatement(current.parent)) {
            allowedReturn = nearestFunction(current.parent) === callback
            break
          }
          current = current.parent
        }
        if (ts.isArrowFunction(callback) && callback.body === current) allowedReturn = true
        if (!allowedReturn) {
          errors.push(`transferred child handle must not escape before successful release: ${file.relative}:${name}`)
        }
      }
      for (const runSync of runSyncs) {
        const declaration = declarationBefore(runSync, scope)
        if (declaration && ts.isIdentifier(declaration.name)) {
          childDeclarations.add(declaration)
          continue
        }
        if (declaration) {
          errors.push(`transferred child handle must not escape before successful release: ${file.relative}:${name}`)
          continue
        }
        let current: ts.Node = runSync
        let discarded = false
        while (current.parent && current.parent !== scope) {
          const parent = current.parent
          if (ts.isExpressionStatement(parent)) {
            discarded = true
            break
          }
          if (
            ts.isParenthesizedExpression(parent) ||
            ts.isAsExpression(parent) ||
            ts.isTypeAssertionExpression(parent) ||
            ts.isSatisfiesExpression(parent) ||
            ts.isNonNullExpression(parent) ||
            ts.isVoidExpression(parent)
          ) {
            current = parent
            continue
          }
          break
        }
        if (!discarded) {
          errors.push(`transferred child handle must not escape before successful release: ${file.relative}:${name}`)
        }
      }

      const allowedRunSyncReturn = (identifier: ts.Identifier, declaration: ts.VariableDeclaration) => {
        const callback = [...runSyncCallbacks.values()].find(
          (candidate) => nodeInside(candidate, declaration) && nodeInside(candidate, identifier),
        )
        if (!callback || nearestFunction(identifier) !== callback) return false
        let current: ts.Node = identifier
        while (current.parent && current.parent !== callback) {
          if (
            ts.isCallExpression(current.parent) ||
            ts.isFunctionExpression(current.parent) ||
            ts.isArrowFunction(current.parent)
          ) {
            return false
          }
          if (ts.isReturnStatement(current.parent)) return nearestFunction(current.parent) === callback
          current = current.parent
        }
        return ts.isArrowFunction(callback) && callback.body === current
      }
      const scanChildEscapes = (node: ts.Node) => {
        if (
          ts.isIdentifier(node) &&
          node.getStart(file.source) < successPosition &&
          !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) &&
          !(ts.isPropertyAssignment(node.parent) && node.parent.name === node)
        ) {
          const declaration = [...childDeclarations].find(
            (candidate) =>
              ts.isIdentifier(candidate.name) &&
              candidate.name.text === node.text &&
              candidate.getStart(file.source) <= node.getStart(file.source) &&
              nodeInside(nearestFunction(candidate) ?? scope, node),
          )
          if (
            declaration &&
            declaration.name !== node &&
            !allowedRunSyncReturn(node, declaration)
          ) {
            errors.push(`transferred child handle must not escape before successful release: ${file.relative}:${name}`)
          }
        }
        node.forEachChild(scanChildEscapes)
      }
      scanChildEscapes(scope)
    }
  }
  const central = files.find((file) => file.relative === "src/effect/instance-ref.ts")
  if (central) {
    const maps: string[] = []
    const callableBody = (declaration: ts.Declaration) => {
      if (ts.isFunctionDeclaration(declaration)) return declaration.body
      if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) return undefined
      const value = ownershipExpression(declaration.initializer)
      return ts.isArrowFunction(value) || ts.isFunctionExpression(value) ? value.body : undefined
    }
    const moduleSymbol = central.checker.getSymbolAtLocation(central.source)
    const moduleExports = moduleSymbol ? central.checker.getExportsOfModule(moduleSymbol) : []
    const exportedCallableBodies = (matches: (name: string) => boolean) => {
      return moduleExports.filter((symbol) => matches(symbol.getName())).map((binding) => ({
        binding,
        bodies: [...(aliasedSymbol(binding, central.checker).declarations ?? [])]
          .map(callableBody)
          .filter((body): body is ts.ConciseBody => !!body),
      }))
    }
    const captures = exportedCallableBodies((name) => name.startsWith("captureInstanceExecution"))
    const restores = exportedCallableBodies((name) =>
      /^(?:restoreInstanceExecution|enterInstanceExecution)/.test(name)
    )
    const collect = (node: ts.Node) => {
      if (
        ts.isVariableStatement(node) &&
        !exported(node) &&
        ts.isSourceFile(node.parent)
      ) {
        for (const declaration of node.declarationList.declarations) {
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.initializer &&
            ts.isNewExpression(declaration.initializer) &&
            declaration.initializer.expression.getText(central.source) === "WeakMap"
          ) {
            maps.push(declaration.name.text)
          }
        }
      }
      node.forEachChild(collect)
    }
    collect(central.source)
    const valid = captures.length > 0 && restores.length > 0 && maps.some(
      (name) =>
        captures.every((entry) =>
          entry.bodies.some((body) => new RegExp(`\\b${name}\\.set\\s*\\(`).test(body.getText(central.source)))
        ) &&
        restores.every((entry) =>
          entry.bodies.some((body) => new RegExp(`\\b${name}\\.get\\s*\\(`).test(body.getText(central.source)))
        ),
    )
    if (captures.length > 0 && !valid) {
      errors.push("InstanceExecution capture requires module-private WeakMap provenance: src/effect/instance-ref.ts")
    }
  }
  return [...new Set(errors)]
}

function inventoryAnalysis(
  production: ProductionAnalysis,
  sourceRoot: string,
  testRoot: string,
): InventoryAnalysis {
  const build = () => {
    const tests = parseSources(testRoot, "test")
    return Object.freeze({
      tests,
      testFacades: tests.flatMap(scanCandidates).filter((candidate) => candidate.kind === "legacy-settled-facade"),
      authorityErrorMessages: authorityErrors([...production.sources, ...tests]),
    })
  }
  if (sourceRoot !== defaultSourceRoot || testRoot !== defaultTestRoot) return build()
  if (defaultInventoryAnalysisCache.value) return defaultInventoryAnalysisCache.value
  defaultInventoryAnalysisCache.value = build()
  defaultAnalysisBuildCounts.inventory++
  return defaultInventoryAnalysisCache.value
}

function parseArgs(args: string[]): { mode?: Mode; enabled: Set<Flag>; errors: string[] } {
  const errors: string[] = []
  const known = new Set<string>([...modes, ...flags])
  for (const arg of args) if (!known.has(arg)) errors.push(`unknown flag: ${arg}`)
  const selected = modes.filter((mode) => args.includes(mode))
  if (selected.length !== 1) errors.push("exactly one checker mode is required")
  const mode = selected[0]
  const enabled = new Set(flags.filter((flag) => args.includes(flag)))
  if (mode === "--check") {
    if (enabled.has("--allow-task1-adapter")) errors.push("--allow-task1-adapter is not valid with --check")
  }
  if (mode === "--check-disposer-targets") {
    for (const flag of ["--allow-legacy-instance-settled-facades", "--allow-task2-legacy-instance-ref-providers"] as const) {
      if (enabled.has(flag)) errors.push(`${flag} is not valid with --check-disposer-targets`)
    }
  }
  return { mode, enabled, errors }
}

export function check(args: string[], env: NodeJS.ProcessEnv = process.env) {
  const parsed = parseArgs(args)
  if (!parsed.mode || parsed.errors.length > 0) return parsed.errors
  const sourceRoot = env.MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT ?? defaultSourceRoot
  const testRoot = env.MIMOCODE_INSTANCE_GENERATION_TEST_ROOT ?? defaultTestRoot
  const inventory = env.MIMOCODE_INSTANCE_GENERATION_INVENTORY ?? defaultInventory
  if (
    parsed.mode === "--check-disposer-targets" &&
    !parsed.enabled.has("--allow-task1-adapter") &&
    sourceRoot === defaultSourceRoot &&
    hasStringDisposeInstanceDeclaration(sourceRoot)
  ) {
    return ["legacy disposeInstance target requires --allow-task1-adapter"]
  }
  const production = productionAnalysis(sourceRoot)
  const sources = production.sources
  const rawSummaries = production.rawSummaries
  const summaries = production.summaries

  if (parsed.mode === "--check-disposer-targets") {
    const disposeTargets = summaries.filter((summary) =>
      summary.candidates.some((candidate) => candidate.kind === "dispose-target"),
    )
    if (!parsed.enabled.has("--allow-task1-adapter") && disposeTargets.length > 0) {
      return ["legacy disposeInstance target requires --allow-task1-adapter"]
    }
    if (!parsed.enabled.has("--allow-task1-adapter")) return []
    return checkAllowedShapes(summaries, "dispose-target", task1DisposerTargets, "unauthorized disposeInstance target")
  }

  const inventoryState = inventoryAnalysis(production, sourceRoot, testRoot)
  const tests = inventoryState.tests
  const errors = [...inventoryState.authorityErrorMessages]
  const enforceFrozenContracts = sourceRoot === defaultSourceRoot
  errors.push(...rendererOnlyExclusionErrors(sourceRoot, rawSummaries, enforceFrozenContracts))
  errors.push(...rendererOnlyExclusionDocumentErrors(inventory, sourceRoot, enforceFrozenContracts))
  const productionFacades = summaries.filter((summary) =>
    summary.candidates.some((candidate) => candidate.kind === "legacy-settled-facade"),
  )
  const testFacades = inventoryState.testFacades
  if (!parsed.enabled.has("--allow-legacy-instance-settled-facades")) {
    if (productionFacades.length > 0 || testFacades.length > 0) {
      errors.push("legacy settled facade requires --allow-legacy-instance-settled-facades")
    }
  } else {
    errors.push(
      ...checkAllowedShapes(
        summaries,
        "legacy-settled-facade",
        legacyFacadeProduction,
        "unauthorized legacy settled facade caller",
      ),
    )
    for (const candidate of testFacades) {
      if (
        candidate.form === "call" &&
        /^(?:Instance\.disposeDirectory\(|Instance\.disposeAll\()/.test(candidate.signature)
      ) {
        continue
      }
      errors.push(`unauthorized legacy settled facade test use: ${candidate.file}:${candidate.symbol}`)
    }
  }
  const providers = summaries.filter((summary) =>
    summary.candidates.some((candidate) => candidate.kind === "instance-ref-provider"),
  )
  if (!parsed.enabled.has("--allow-task2-legacy-instance-ref-providers")) {
    if (providers.length > 0) errors.push("raw InstanceRef provider requires --allow-task2-legacy-instance-ref-providers")
  } else {
    errors.push(
      ...checkAllowedShapes(
        summaries,
        "instance-ref-provider",
        task2InstanceRefProviders,
        "unauthorized raw InstanceRef provider",
      ),
    )
  }
  errors.push(...validateInventory(inventory, sources, tests, summaries, enforceFrozenContracts))
  return [...new Set(errors)]
}

if (import.meta.main) {
  const rootOverrides = [
    "MIMOCODE_INSTANCE_GENERATION_SOURCE_ROOT",
    "MIMOCODE_INSTANCE_GENERATION_TEST_ROOT",
    "MIMOCODE_INSTANCE_GENERATION_INVENTORY",
  ].filter((key) => process.env[key] !== undefined)
  const errors = rootOverrides.length > 0
    ? [`production checker roots are fixed; environment overrides are test-internal only: ${rootOverrides.join(", ")}`]
    : check(process.argv.slice(2))
  if (errors.length > 0) {
    for (const error of errors) console.error(`instance generation producer check failed: ${error}`)
    process.exitCode = 1
  }
}
