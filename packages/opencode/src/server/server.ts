import { generateSpecs } from "hono-openapi"
import { Hono } from "hono"
import { adapter } from "#hono"
import { lazy } from "@/util/lazy"
import { Log } from "@/util"
import { Flag } from "@/flag/flag"
import { WorkspaceID } from "@/control-plane/schema"
import { MDNS } from "./mdns"
import { AuthMiddleware, CompressionMiddleware, CorsMiddleware, ErrorMiddleware, LoggerMiddleware } from "./middleware"
import { FenceMiddleware } from "./fence"
import { initProjectors } from "./projectors"
import { InstanceRoutes } from "./routes/instance"
import { ControlPlaneRoutes } from "./routes/control"
import { UIRoutes } from "./routes/ui"
import { GlobalRoutes } from "./routes/global"
import { WorkspaceRouterMiddleware } from "./workspace"
import { InstanceMiddleware } from "./routes/instance/middleware"
import { WorkspaceRoutes } from "./routes/control/workspace"
import { setChildProcessEnv } from "@/util/child-process-env"
import { createAudio, type AudioOptions } from "./audio"
import { createModelAPI, type ModelAPIOptions } from "./model-api"
import { LLMServerTokens } from "@/llm-server/tokens"

// @ts-ignore This global is needed to prevent ai-sdk from logging warnings to stdout https://github.com/vercel/ai/blob/2dc67e0ef538307f21368db32d5a12345d98831b/packages/ai/src/logger/log-warnings.ts#L85
globalThis.AI_SDK_LOG_WARNINGS = false

initProjectors()

const log = Log.create({ service: "server" })

export type Listener = {
  hostname: string
  port: number
  url: URL
  stop: (close?: boolean) => Promise<void>
}

export const Default = lazy(() => create({}))

function create(opts: { cors?: string[]; audio?: AudioOptions; llm?: ModelAPIOptions }) {
  if (opts.audio && opts.llm) throw new Error("audio-api and llm-server are mutually exclusive")
  const llm = createModelAPI(opts.llm)
  const audio = createAudio(opts.audio)
  const optional = new Hono()
  if (opts.llm) optional.route("/v1", llm.app)
  else optional.route("/v1/audio", audio.app).route("/v1", llm.app)
  const app = new Hono()
    .onError(ErrorMiddleware)
    .use(CorsMiddleware(opts))
    .use(LoggerMiddleware)
    .route("/", optional)
    .use(AuthMiddleware)
    .use(CompressionMiddleware)
    .route("/global", GlobalRoutes())

  const runtime = adapter.create(app)

  if (Flag.MIMOCODE_WORKSPACE_ID) {
    return {
      app: app
        .use(InstanceMiddleware(Flag.MIMOCODE_WORKSPACE_ID ? WorkspaceID.make(Flag.MIMOCODE_WORKSPACE_ID) : undefined))
        .use(FenceMiddleware)
        .route("/", InstanceRoutes(runtime.upgradeWebSocket)),
      runtime,
      audio,
      llm,
    }
  }

  return {
    app: app
      .route("/", ControlPlaneRoutes())
      .route(
        "/",
        new Hono()
          .use(InstanceMiddleware())
          .route("/experimental/workspace", WorkspaceRoutes())
          .use(WorkspaceRouterMiddleware(runtime.upgradeWebSocket))
          .route("/", InstanceRoutes(runtime.upgradeWebSocket)),
      )
      .route("/", UIRoutes()),
    runtime,
    audio,
    llm,
  }
}

export async function openapi() {
  // Build a fresh app with all routes registered directly so
  // hono-openapi can see describeRoute metadata (`.route()` wraps
  // handlers when the sub-app has a custom errorHandler, which
  // strips the metadata symbol).
  const { app } = create({})
  const result = await generateSpecs(app, {
    documentation: {
      info: {
        title: "opencode",
        version: "1.0.0",
        description: "opencode api",
      },
      openapi: "3.1.1",
    },
  })
  return result
}

export let url: URL

export async function listen(opts: {
  port: number
  hostname: string
  mdns?: boolean
  mdnsDomain?: string
  cors?: string[]
  noAuth?: boolean
  childEnv?: NodeJS.ProcessEnv
  audio?: AudioOptions
  llm?: ModelAPIOptions
}): Promise<Listener> {
  if (opts.childEnv) setChildProcessEnv(opts.childEnv)
  const isLoopback = opts.hostname === "127.0.0.1" || opts.hostname === "localhost" || opts.hostname === "::1"
  if (!isLoopback && !Flag.MIMOCODE_SERVER_PASSWORD && !opts.noAuth) {
    throw new Error(
      "Refusing to bind to non-loopback address without MIMOCODE_SERVER_PASSWORD. " +
        "Set the environment variable or pass noAuth to explicitly allow unauthenticated access.",
    )
  }

  const built = create(opts)
  const server = await built.runtime.listen(opts)
  if (opts.llm) {
    await LLMServerTokens.publish({
      directory: opts.llm.directory,
      listenerID: built.llm.id,
      hostname: opts.hostname,
      port: server.port,
    }).catch(async (error) => {
      await Promise.all([built.llm.close(), server.stop(true)])
      throw error
    })
  }

  const next = new URL("http://localhost")
  next.hostname = opts.hostname
  next.port = String(server.port)
  url = next

  const mdns =
    opts.mdns &&
    server.port &&
    opts.hostname !== "127.0.0.1" &&
    opts.hostname !== "localhost" &&
    opts.hostname !== "::1"
  if (mdns) {
    MDNS.publish(server.port, opts.mdnsDomain)
  } else if (opts.mdns) {
    log.warn("mDNS enabled but hostname is loopback; skipping mDNS publish")
  }

  let closing: Promise<void> | undefined
  return {
    hostname: opts.hostname,
    port: server.port,
    url: next,
    stop(close?: boolean) {
      closing ??= (async () => {
        if (mdns) MDNS.unpublish()
        // Close optional API admission before socket shutdown and instance retirement.
        await Promise.all([
          built.audio.close(),
          built.llm.close(),
          opts.llm ? LLMServerTokens.unpublish({ directory: opts.llm.directory, listenerID: built.llm.id }) : undefined,
          server.stop(close),
        ])
      })()
      return closing
    },
  }
}

export * as Server from "./server"
