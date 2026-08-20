import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import ts from "typescript"

const canonicalPrinter = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: true })

const packageRoot = path.resolve(import.meta.dir, "..")
const defaultSourceRoot = path.join(packageRoot, "src")
const defaultTestRoot = path.join(packageRoot, "test")
const defaultInventory = path.resolve(packageRoot, "../../docs/compose/spec/instance-generation-producer-inventory.md")

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
      "src/bus/index.ts:subscribe#native-callback-return-c66f66fa00",
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
  ["test/workflow/runtime.test.ts", { tasks: new Set(["Task 9"]), scenario: "workflow shutdown" }],
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

function listFiles(root: string): string[] {
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name)
    if (entry.isDirectory()) return entry.name === ".bundle" ? [] : listFiles(target)
    if (!entry.isFile() || (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx"))) return []
    return [target]
  })
}

function parseSources(root: string, prefix: "src" | "test"): ParsedSource[] {
  return listFiles(root)
    .sort()
    .map((file) => {
      const text = readFileSync(file, "utf8")
      return {
        file,
        relative: `${prefix}/${path.relative(root, file).split(path.sep).join("/")}`,
        text,
        source: ts.createSourceFile(
          file,
          text,
          ts.ScriptTarget.Latest,
          true,
          file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        ),
      }
    })
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

function normalize(node: ts.Node) {
  return canonicalPrinter.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()).replace(/\s+/g, " ").trim()
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

function ownershipBoundary(node: ts.Node, owner: ts.Node) {
  const boundaries: string[] = []
  let current: ts.Node | undefined = node.parent
  while (current && !ts.isSourceFile(current)) {
    if (ts.isCallExpression(current)) {
      const property = callProperty(current)
      if (property && new Set(["runSync", "enter", "bind"]).has(property.name)) {
        boundaries.push(`${property.receiver}.${property.name}`)
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
  const asyncQueueBindings = new Set<string>()
  const websocketUpgradeBindings = new Set(["upgradeWebSocket"])
  const collectDeclarations = (node: ts.Node) => {
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
  const legacyStringArgument = (node: ts.Expression | undefined, seen = new Set<ts.Node>()): boolean => {
    if (!node) return true
    if (seen.has(node)) return false
    seen.add(node)
    if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) return true
    if (ts.isIdentifier(node)) {
      const declaration = declarationFor(node)
      if (!declaration) return false
      if (declaration.type && /\bstring\b/.test(declaration.type.getText(input.source))) return true
      return !!declaration.initializer && legacyStringArgument(declaration.initializer, seen)
    }
    if (ts.isPropertyAccessExpression(node)) return node.name.text === "directory"
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      return /\bstring\b/.test(node.type.getText(input.source)) || legacyStringArgument(node.expression)
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      return legacyStringArgument(node.left, seen) || legacyStringArgument(node.right, seen)
    }
    if (ts.isConditionalExpression(node)) {
      return legacyStringArgument(node.whenTrue, seen) || legacyStringArgument(node.whenFalse, seen)
    }
    if (ts.isCallExpression(node)) {
      return /(?:^|\.)(?:resolve|join|dirname|normalize)$/.test(node.expression.getText(input.source)) ||
        node.expression.getText(input.source) === "String"
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
      boundary: ownershipBoundary(node, owner),
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
      if (callee === "setTimeout") addLowConfidence("timer-timeout", node)
      if (callee === "setInterval") addLowConfidence("timer-interval", node)
      if (callee === "setImmediate") addLowConfidence("timer-immediate", node)
      if (callee === "queueMicrotask") addLowConfidence("microtask", node)
      if (property?.receiver === "Instance" && property.name === "bind") add("instance-bind", node)
      if (property?.name === "provideService" && node.arguments[0]?.getText(input.source) === "InstanceRef") {
        add("instance-ref-provider", node)
      }
      if (property?.name === "provideService" && node.arguments[0]?.getText(input.source) === "InstanceAdmissionRef") {
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
      const callbackPosition = callbackMethod && new Set(["on", "addEventListener", "addListener", "once"]).has(callbackMethod)
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
      if (property?.receiver === "Instance" && (property.name === "disposeDirectory" || property.name === "disposeAll")) {
        add("legacy-settled-facade", node)
      }
      if (callee === "disposeInstance" && legacyStringArgument(node.arguments[0])) add("dispose-target", node)
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

function inspectRawCandidateSummaries(sourceRoot = defaultSourceRoot): Summary[] {
  const candidates = parseSources(sourceRoot, "src").flatMap(scanCandidates)
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

export function inspectCandidateSummaries(sourceRoot = defaultSourceRoot): Summary[] {
  return inspectRawCandidateSummaries(sourceRoot).filter(
    (summary) => rendererOnlyExclusions.get(summary.anchor) !== summary.fingerprint,
  )
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

function returnsPromiseLike(callback: ts.Expression | undefined, resolve?: (node: ts.Identifier) => ts.Expression | undefined) {
  if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) return false
  if (callback.modifiers?.some((item) => item.kind === ts.SyntaxKind.AsyncKeyword)) return true
  const seen = new Set<ts.Node>()
  const promiseExpression = (node: ts.Expression): boolean => {
    if (seen.has(node)) return false
    seen.add(node)
    if (ts.isParenthesizedExpression(node)) return promiseExpression(node.expression)
    if (ts.isIdentifier(node)) {
      const value = resolve?.(node)
      return !!value && promiseExpression(value)
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

function authorityErrors(files: ParsedSource[]) {
  const errors: string[] = []
  for (const file of files) {
    const calls: ts.CallExpression[] = []
    const leaseDeclarations: ts.VariableDeclaration[] = []
    const valueDeclarations: ts.VariableDeclaration[] = []
    const collect = (node: ts.Node) => {
      if (ts.isCallExpression(node)) calls.push(node)
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) valueDeclarations.push(node)
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
    const resolveValue = (identifier: ts.Identifier) =>
      valueDeclarations
        .filter(
          (declaration) =>
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === identifier.text &&
            declaration.getStart(file.source) < identifier.getStart(file.source) &&
            (!nearestFunction(declaration) || nodeInside(nearestFunction(declaration)!, identifier)),
        )
        .sort((left, right) => right.getStart(file.source) - left.getStart(file.source))[0]?.initializer
    const resolveLease = (expression: ts.Expression | undefined, at: ts.Node) => {
      if (!expression || !ts.isIdentifier(expression)) return undefined
      return leaseDeclarations
        .filter((declaration) => {
          if (!ts.isIdentifier(declaration.name) || declaration.name.text !== expression.text) return false
          if (declaration.getStart(file.source) > at.getStart(file.source)) return false
          const scope = nearestFunction(declaration)
          return !scope || nodeInside(scope, at)
        })
        .sort((left, right) => right.getStart(file.source) - left.getStart(file.source))[0]
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
        for (const element of node.exportClause.elements) {
          const name = element.propertyName?.text ?? element.name.text
          if (name === "InstanceAdmissionRef") {
            errors.push(`InstanceAdmissionRef must remain module-private: ${file.relative}`)
          }
          if (helperAllowlist(name)) errors.push(`raw lifecycle helper cannot be re-exported: ${file.relative}:${name}`)
        }
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
      if (file.relative !== "src/effect/instance-ref.ts" && exported(node)) {
        const directCapture = (value: ts.Node | undefined) =>
          !!value &&
          ts.isCallExpression(value) &&
          new Set(["captureInstanceExecution", "captureInstanceExecutionEffect"]).has(rawHelperName(value) ?? "")
        if (
          (ts.isVariableStatement(node) &&
            node.declarationList.declarations.some((declaration) => directCapture(declaration.initializer))) ||
          ((ts.isPropertyDeclaration(node) || ts.isPropertyAssignment(node)) && directCapture(node.initializer))
        ) {
          errors.push(`captured InstanceExecution cannot be re-exported: ${file.relative}`)
        }
        if (ts.isFunctionDeclaration(node) && node.body) {
          const returned = node.body.statements.some(
            (statement) => ts.isReturnStatement(statement) && directCapture(statement.expression),
          )
          if (returned) errors.push(`captured InstanceExecution cannot be re-exported: ${file.relative}`)
        }
      }
      if (
        file.relative !== "src/effect/instance-ref.ts" &&
        ((ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) &&
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
      if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const element of node.importClause.namedBindings.elements) {
          const name = element.propertyName?.text ?? element.name.text
          if (name === "InstanceAdmissionRef") {
            errors.push(`InstanceAdmissionRef must remain module-private: ${file.relative}`)
          }
          const allowed = helperAllowlist(name)
          if (allowed && (!allowed.has(file.relative) || !!element.propertyName)) {
            errors.push(`raw lifecycle helper is not allowlisted: ${file.relative}:${name}`)
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
        const helper = rawHelperName(node)
        const allowed = helper ? helperAllowlist(helper) : undefined
        if (helper && allowed && !allowed.has(file.relative)) {
          errors.push(`raw lifecycle helper is not allowlisted: ${file.relative}:${enclosingSymbol(node)}:${helper}`)
        }
        const property = callProperty(node)
        const releaseReceiver = ts.isPropertyAccessExpression(node.expression) ? node.expression.expression : undefined
        const acquiredRelease = property?.name === "release" ? resolveLease(releaseReceiver, node) : undefined
        if (property?.name === "release" && (acquiredRelease || /(?:lease|owner|handle|handoff|child)/i.test(property.receiver))) {
          if (node.arguments.length === 0) {
            errors.push(`release requires a discriminated result: ${file.relative}:${enclosingSymbol(node)}`)
          } else if (releaseShape(node) === "invalid") {
            errors.push(`release result must be exactly one discriminated shape: ${file.relative}:${enclosingSymbol(node)}`)
          }
        }
        if (property?.name === "runSync" && returnsPromiseLike(node.arguments[0], resolveValue)) {
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
            const lease = resolveLease(handoffExpression, node)
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
        if (tryFor(success[0]!, "try") !== tryFor(failure[0]!, "catch") || !tryFor(success[0]!, "try")) {
          errors.push(`transferred producer success and failure release paths must be structurally exclusive: ${file.relative}:${name}`)
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
    }
  }
  const central = files.find((file) => file.relative === "src/effect/instance-ref.ts")
  if (central && /export function captureInstanceExecution/.test(central.text)) {
    const maps: string[] = []
    const captures: ts.FunctionDeclaration[] = []
    const restores: ts.FunctionDeclaration[] = []
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
      if (ts.isFunctionDeclaration(node) && node.name?.text.startsWith("captureInstanceExecution")) captures.push(node)
      if (
        ts.isFunctionDeclaration(node) &&
        /^(?:restoreInstanceExecution|enterInstanceExecution)/.test(node.name?.text ?? "")
      ) {
        restores.push(node)
      }
      node.forEachChild(collect)
    }
    collect(central.source)
    const valid = maps.some(
      (name) =>
        captures.some((fn) => fn.body && new RegExp(`\\b${name}\\.set\\s*\\(`).test(fn.body.getText(central.source))) &&
        restores.some((fn) => fn.body && new RegExp(`\\b${name}\\.get\\s*\\(`).test(fn.body.getText(central.source))),
    )
    if (!valid) {
      errors.push("InstanceExecution capture requires module-private WeakMap provenance: src/effect/instance-ref.ts")
    }
  }
  return [...new Set(errors)]
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
  const sources = parseSources(sourceRoot, "src")
  const tests = parseSources(testRoot, "test")
  const candidates = sources.flatMap(scanCandidates)
  const rawSummaries = inspectRawCandidateSummaries(sourceRoot)
  const summaries = rawSummaries.filter(
    (summary) => rendererOnlyExclusions.get(summary.anchor) !== summary.fingerprint,
  )

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

  const errors = authorityErrors([...sources, ...tests])
  const enforceFrozenContracts = sourceRoot === defaultSourceRoot
  errors.push(...rendererOnlyExclusionErrors(sourceRoot, rawSummaries, enforceFrozenContracts))
  errors.push(...rendererOnlyExclusionDocumentErrors(inventory, sourceRoot, enforceFrozenContracts))
  const productionFacades = summaries.filter((summary) =>
    summary.candidates.some((candidate) => candidate.kind === "legacy-settled-facade"),
  )
  const testFacades = tests.flatMap(scanCandidates).filter((candidate) => candidate.kind === "legacy-settled-facade")
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
