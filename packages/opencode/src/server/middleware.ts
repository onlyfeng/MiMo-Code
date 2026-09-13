import { Provider } from "../provider"
import { NamedError } from "@mimo-ai/shared/util/error"
import { NotFoundError } from "../storage"
import { Session } from "../session"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { ErrorHandler, MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { Log } from "../util"
import { Flag } from "@/flag/flag"
import { basicAuth } from "hono/basic-auth"
import { cors } from "hono/cors"
import { compress } from "hono/compress"
import { isPtyConnectPath, PTY_CONNECT_TICKET_QUERY } from "./pty-ticket"
import { CAPABILITY_PREFIX, presentedToken } from "./routes/instance/capability"
import { requestedDirectory } from "./routes/instance/middleware"
import { LLMServerTokens } from "@/llm-server/tokens"

const log = Log.create({ service: "server" })

export const ErrorMiddleware: ErrorHandler = (err, c) => {
  log.error("failed", {
    error: err,
  })
  if (err instanceof NamedError) {
    let status: ContentfulStatusCode
    if (err instanceof NotFoundError) status = 404
    else if (err instanceof Provider.ModelNotFoundError) status = 400
    else if (err.name === "ProviderAuthValidationFailed") status = 400
    else if (err.name.startsWith("Worktree")) status = 400
    else status = 500
    return c.json(err.toObject(), { status })
  }
  if (err instanceof Session.TitleConflictError) return c.json(err.toObject(), { status: 409 })
  if (err instanceof Session.TitleRevisionError) return c.json({ success: false, data: { message: err.message }, errors: [{ message: err.message }] }, { status: 400 })
  if (err instanceof Session.BusyError || err instanceof Session.RecoveryConflictError) {
    return c.json(new NamedError.Unknown({ message: err.message }).toObject(), { status: 409 })
  }
  if (err instanceof HTTPException) return err.getResponse()
  const message = err instanceof Error ? err.message : "Internal Server Error"
  return c.json(new NamedError.Unknown({ message }).toObject(), {
    status: 500,
  })
}

/**
 * Any of the headers a task token may ride in. Presence, not validity — the
 * capability handler validates it; this only decides whether basic auth applies.
 */
function presentsToken(...headers: (string | undefined)[]) {
  return headers.some((value) => (value ?? "").trim().length > 0)
}

export const AuthMiddleware: MiddlewareHandler = async (c, next) => {
  if (c.req.method === "OPTIONS") return next()
  const password = Flag.MIMOCODE_SERVER_PASSWORD
  if (!password) return next()

  // PTY websocket connect with a ticket skips basic auth; the handler validates the ticket.
  const path = new URL(c.req.url).pathname
  if (isPtyConnectPath(path) && c.req.query(PTY_CONNECT_TICKET_QUERY)) return next()

  // Same carve-out, same reason: the model routes are authenticated by a minted task token,
  // which the handler validates ALWAYS — including when no server password is set, where
  // this middleware waves everything through. A task holds that token and not the server
  // password, so requiring basic auth here would make the surface unreachable by the only
  // clients it exists for.
  if (
    path.startsWith(CAPABILITY_PREFIX + "/") &&
    presentsToken(c.req.header("authorization"), c.req.header("x-api-key"), c.req.header("api-key"))
  ) {
    // Presence is not enough to wave a request past basic auth. `InstanceMiddleware`
    // runs next, and on an operator-secured server its cwd containment is off by
    // design — so a junk bearer would otherwise pick any `?directory=` on the
    // machine and pay for a full `InstanceBootstrap` (config, plugins, LSP, watcher,
    // index) before the capability route finally answered 401. Verifying here keeps
    // FD-004's "authenticate before bootstrap" boundary, which the fork's retired
    // model API enforced by owning its own listener.
    const token = presentedToken(c)
    const verdict = token ? await LLMServerTokens.verify(requestedDirectory(c), token) : undefined
    if (!verdict?.ok) {
      c.header("WWW-Authenticate", "Bearer")
      return c.json(
        {
          error: {
            message: "Invalid or expired model API credential",
            type: "invalid_request_error",
            code: "invalid_api_key",
          },
        },
        401,
      )
    }
    return next()
  }

  const username = Flag.MIMOCODE_SERVER_USERNAME ?? "mimocode"

  return basicAuth({ username, password })(c, next)
}

export const LoggerMiddleware: MiddlewareHandler = async (c, next) => {
  const skip = c.req.path === "/log"
  if (!skip) {
    log.info("request", {
      method: c.req.method,
      path: c.req.path,
    })
  }
  const timer = log.time("request", {
    method: c.req.method,
    path: c.req.path,
  })
  await next()
  if (!skip) timer.stop()
}

export function CorsMiddleware(opts?: { cors?: string[] }): MiddlewareHandler {
  return cors({
    maxAge: 86_400,
    origin(input) {
      if (!input) return

      if (input.startsWith("http://localhost:")) return input
      if (input.startsWith("http://127.0.0.1:")) return input
      if (input === "tauri://localhost" || input === "http://tauri.localhost" || input === "https://tauri.localhost")
        return input

      if (/^https:\/\/([a-z0-9-]+\.)*opencode\.ai$/.test(input)) return input
      if (opts?.cors?.includes(input)) return input
    },
  })
}

const zipped = compress()
export const CompressionMiddleware: MiddlewareHandler = (c, next) => {
  const path = c.req.path
  const method = c.req.method
  if (path === "/event" || path === "/global/event") return next()
  if (method === "POST" && /\/session\/[^/]+\/(message|prompt_async)$/.test(path)) return next()
  return zipped(c, next)
}
