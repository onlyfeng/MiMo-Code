/** @jsxImportSource @opentui/solid */
import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { testRender, type JSX } from "@opentui/solid"
import { onMount } from "solid-js"
import fs from "fs/promises"
import path from "path"
import { Global } from "../../../src/global"
import { App } from "../../../src/cli/cmd/tui/app"
import { ArgsProvider } from "../../../src/cli/cmd/tui/context/args"
import { ExitProvider } from "../../../src/cli/cmd/tui/context/exit"
import { KVProvider } from "../../../src/cli/cmd/tui/context/kv"
import { LanguageProvider } from "../../../src/cli/cmd/tui/context/language"
import { LocalProvider, useLocal } from "../../../src/cli/cmd/tui/context/local"
import { ProjectProvider } from "../../../src/cli/cmd/tui/context/project"
import { RouteProvider, useRoute } from "../../../src/cli/cmd/tui/context/route"
import { SDKProvider, type EventSource } from "../../../src/cli/cmd/tui/context/sdk"
import { SyncProvider } from "../../../src/cli/cmd/tui/context/sync"
import { ThemeProvider } from "../../../src/cli/cmd/tui/context/theme"
import { TuiConfigProvider } from "../../../src/cli/cmd/tui/context/tui-config"
import type { TuiConfig } from "../../../src/cli/cmd/tui/config/tui"
import { ToastProvider } from "../../../src/cli/cmd/tui/ui/toast"
import { DialogProvider } from "../../../src/cli/cmd/tui/ui/dialog"
import { CommandProvider } from "../../../src/cli/cmd/tui/component/dialog-command"
import { FrecencyProvider } from "../../../src/cli/cmd/tui/component/prompt/frecency"
import { PromptHistoryProvider } from "../../../src/cli/cmd/tui/component/prompt/history"
import { PromptRefProvider } from "../../../src/cli/cmd/tui/context/prompt"
import { KeybindProvider } from "../../../src/cli/cmd/tui/context/keybind"
import { PromptStashProvider } from "../../../src/cli/cmd/tui/component/prompt/stash"
import { TuiPluginRuntime } from "../../../src/cli/cmd/tui/plugin"
import { setupSlots } from "../../../src/cli/cmd/tui/plugin/slots"

// FC-030: resuming a session (`-s`) shows the variant its last main-lane user
// message ran at, keeps model.json — the saved choice every TUI process shares —
// as it was, and falls back to that choice when the message records none.

const DIR = "/tmp/example-variant-resume"
const SESSION = "ses_resume"
const OTHER = "ses_other"
const MODEL_FILE = path.join(Global.Path.state, "model.json")
// The fallback model before a restore is recent[0]; the history names the other
// one, so the restore is observable as a model change.
const FALLBACK = { providerID: "test", modelID: "test-model" }
const RESUMED = { providerID: "test", modelID: "other-model" }

const AGENTS = [
  { name: "build", mode: "primary", hidden: false, permission: [], options: {}, color: "#fff" },
  { name: "plan", mode: "primary", hidden: false, permission: [], options: {}, color: "#fff" },
]

function model(id: string) {
  return {
    id,
    providerID: "test",
    name: id,
    release_date: "2025-01-01",
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: true,
    limit: { context: 100000, output: 10000 },
    cost: { input: 0, output: 0 },
    options: {},
    variants: { low: { reasoningEffort: "low" }, high: { reasoningEffort: "high" } },
  }
}

const PROVIDERS = [
  {
    id: "test",
    name: "Test",
    source: "config",
    env: [],
    options: { apiKey: "k", baseURL: "http://127.0.0.1:0" },
    models: { "test-model": model("test-model"), "other-model": model("other-model") },
  },
]

type Entry = { agent?: string; model: { providerID: string; modelID: string; variant?: string } }

function history(sessionID: string, entries: Entry[]) {
  return entries.map((entry, i) => ({
    info: {
      id: `msg_${i + 1}`,
      sessionID,
      role: "user",
      agent: entry.agent ?? "build",
      model: entry.model,
      time: { created: i + 1 },
    },
    parts: [{ id: `prt_${i + 1}`, type: "text", text: `turn ${i + 1}`, synthetic: false }],
  }))
}

function createFetch(input: { entries: Entry[]; other?: Entry[]; history?: Promise<void> }) {
  const row = (id: string) => ({ id, projectID: "p", directory: DIR, title: "t", version: "test", time: { created: 1, updated: 1 } })
  const entries: Record<string, Entry[]> = { [SESSION]: input.entries, [OTHER]: input.other ?? [] }
  const handle = async (target: string | URL | Request) => {
    const request = target instanceof Request ? target : new Request(target)
    const url = new URL(request.url)
    const ok = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } })
    if (url.pathname === "/path")
      return ok({ home: "/home", state: "/state", config: "/config", worktree: "", directory: DIR })
    if (url.pathname === "/project/current") return ok({ id: "p" })
    if (url.pathname === "/config/providers") return ok({ providers: PROVIDERS, default: {} })
    if (url.pathname === "/provider") return ok({ all: PROVIDERS, default: {}, connected: [], authenticated: [] })
    if (url.pathname === "/agent") return ok(AGENTS)
    if (url.pathname === "/vcs") return ok({ branch: "main" })
    if (url.pathname === "/command") return ok([])
    if (url.pathname === "/experimental/workspace" || url.pathname === "/experimental/workspace/status") return ok([])
    if (url.pathname === "/session") return ok([row(SESSION), row(OTHER)])
    const session = url.pathname.match(/^\/session\/(ses_[a-z]+)$/)?.[1]
    if (session && request.method === "GET") return ok(row(session))
    const messages = url.pathname.match(/^\/session\/(ses_[a-z]+)\/message$/)?.[1]
    if (messages && request.method === "GET") {
      await input.history
      return ok(history(messages, entries[messages] ?? []))
    }
    if (url.pathname.match(/^\/session\/[^/]+\/(todo|diff|actors|task|children|recovery)$/)) return ok([])
    return ok({})
  }
  return Object.assign(handle, { preconnect: fetch.preconnect })
}

const events: EventSource = {
  subscribe: async () => () => {},
}

const tuiConfig: TuiConfig.Info = { theme: "mimocode" }

function Providers(props: { fetch: typeof fetch; children: JSX.Element }) {
  return (
    <ArgsProvider sessionID={SESSION}>
      <ExitProvider onBeforeExit={async () => {}} onExit={async () => {}}>
        <KVProvider>
          <LanguageProvider>
            <ToastProvider>
              <RouteProvider>
                <TuiConfigProvider config={tuiConfig}>
                  <SDKProvider url="http://test" directory={DIR} fetch={props.fetch} events={events}>
                    <ProjectProvider>
                      <SyncProvider>
                        <ThemeProvider mode="dark">
                          <LocalProvider>
                            <KeybindProvider>
                              <PromptStashProvider>
                                <DialogProvider>
                                  <CommandProvider>
                                    <FrecencyProvider>
                                      <PromptHistoryProvider>
                                        <PromptRefProvider>{props.children}</PromptRefProvider>
                                      </PromptHistoryProvider>
                                    </FrecencyProvider>
                                  </CommandProvider>
                                </DialogProvider>
                              </PromptStashProvider>
                            </KeybindProvider>
                          </LocalProvider>
                        </ThemeProvider>
                      </SyncProvider>
                    </ProjectProvider>
                  </SDKProvider>
                </TuiConfigProvider>
              </RouteProvider>
            </ToastProvider>
          </LanguageProvider>
        </KVProvider>
      </ExitProvider>
    </ArgsProvider>
  )
}

async function mount(input: { entries: Entry[]; other?: Entry[]; history?: Promise<void> }) {
  // App renders once the plugin runtime settles; stub the plugin load but keep
  // the slots, which host the session Prompt.
  const initSpy = spyOn(TuiPluginRuntime, "init").mockImplementation(async (init) => {
    setupSlots(init.api)
  })
  let ctx!: {
    local: ReturnType<typeof useLocal>
    route: ReturnType<typeof useRoute>
  }
  let done!: () => void
  const ready = new Promise<void>((resolve) => {
    done = resolve
  })
  function Probe() {
    const local = useLocal()
    const route = useRoute()
    onMount(() => {
      ctx = { local, route }
      done()
    })
    return <App />
  }
  try {
    const app = await testRender(() => (
      <Providers fetch={createFetch(input)}>
        <Probe />
      </Providers>
    ))
    await ready
    return {
      app,
      ...ctx,
      destroy() {
        try {
          app.renderer.destroy()
        } finally {
          initSpy.mockRestore()
        }
      },
    }
  } catch (error) {
    initSpy.mockRestore()
    throw error
  }
}

async function wait(fn: () => boolean | Promise<boolean>, timeout = 5000) {
  const start = Date.now()
  while (!(await fn())) {
    if (Date.now() - start > timeout) throw new Error("timed out waiting for condition")
    await Bun.sleep(5)
  }
}

// model.json is written without being awaited, so "not rewritten" is checked
// over a window long enough for a write to land.
async function stays(fn: () => Promise<boolean>, window = 300) {
  const start = Date.now()
  while (Date.now() - start < window) {
    if (!(await fn())) throw new Error("condition stopped holding")
    await Bun.sleep(5)
  }
}

async function saveChoice(variant: Record<string, string>) {
  await fs.mkdir(path.dirname(MODEL_FILE), { recursive: true })
  await Bun.write(MODEL_FILE, JSON.stringify({ recent: [FALLBACK], favorite: [], variant }))
}

async function savedChoice(): Promise<Record<string, string>> {
  const saved = await Bun.file(MODEL_FILE).json()
  return saved.variant
}

const unchanged = (variant: Record<string, string>) =>
  stays(async () => Bun.deepEquals(await savedChoice(), variant))

// The saved choice has loaded and the restore has switched to the history's model.
const resumed = (h: Awaited<ReturnType<typeof mount>>) =>
  h.local.model.ready && h.local.model.current()?.modelID === RESUMED.modelID

// Mounts with the history held back until the saved choice has loaded — the
// order a real server's slower history load gives.
async function mountAfterLoad(entries: Entry[], other?: Entry[]) {
  let release!: () => void
  const history = new Promise<void>((resolve) => {
    release = resolve
  })
  const h = await mount({ entries, other, history })
  try {
    await wait(() => h.local.model.ready)
  } finally {
    release()
  }
  return h
}

describe("resuming a session's variant (FC-030)", () => {
  afterEach(async () => {
    await fs.rm(MODEL_FILE, { force: true })
  })

  test("a last message without a variant keeps the saved choice", async () => {
    await saveChoice({ "test/other-model": "high" })
    // The last user message is the kind a delivery leaves: no variant, after a
    // turn that ran at another one.
    const h = await mountAfterLoad([{ model: { ...RESUMED, variant: "low" } }, { model: RESUMED }])
    try {
      await wait(() => resumed(h))
      expect(h.local.model.variant.current()).toBe("high")
      await unchanged({ "test/other-model": "high" })
    } finally {
      h.destroy()
    }
  }, 20000)

  test("a recorded variant shows without replacing the saved choice, and a later choice replaces it", async () => {
    await saveChoice({ "test/other-model": "high" })
    const h = await mountAfterLoad([{ model: { ...RESUMED, variant: "low" } }])
    try {
      await wait(() => resumed(h))
      expect(h.local.model.variant.current()).toBe("low")
      await unchanged({ "test/other-model": "high" })

      // Choosing Default is a choice: it is saved and shows instead.
      h.local.model.variant.set(undefined)
      expect(h.local.model.variant.current()).toBeUndefined()
      expect(h.local.model.variant.selected()).toBe("default")
      await wait(async () => (await savedChoice())["test/other-model"] === "default")
    } finally {
      h.destroy()
    }
  }, 20000)

  test("switching to a session whose last message has no variant shows the saved choice again", async () => {
    await saveChoice({ "test/other-model": "high" })
    const h = await mountAfterLoad([{ model: { ...RESUMED, variant: "low" } }], [{ agent: "plan", model: RESUMED }])
    try {
      await wait(() => resumed(h))
      expect(h.local.model.variant.current()).toBe("low")
      h.route.navigate({ type: "session", sessionID: OTHER })
      await wait(() => h.local.agent.current()?.name === "plan")
      expect(h.local.model.current()).toEqual(RESUMED)
      expect(h.local.model.variant.current()).toBe("high")
    } finally {
      h.destroy()
    }
  }, 20000)

  test("the variant of a model that is not available is not given to the fallback model", async () => {
    await saveChoice({ "test/test-model": "high" })
    const h = await mountAfterLoad([{ agent: "plan", model: { providerID: "gone", modelID: "missing", variant: "low" } }])
    try {
      await wait(() => h.local.model.ready && h.local.agent.current()?.name === "plan")
      expect(h.local.model.current()).toEqual(FALLBACK)
      expect(h.local.model.variant.current()).toBe("high")
      await unchanged({ "test/test-model": "high" })
    } finally {
      h.destroy()
    }
  }, 20000)
})
