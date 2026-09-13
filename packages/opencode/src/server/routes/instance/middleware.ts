import type { Context, MiddlewareHandler } from "hono"
import { Instance } from "@/project/instance"
import { InstanceBootstrap } from "@/project/bootstrap"
import { AppRuntime } from "@/effect/app-runtime"
import { AppFileSystem } from "@mimo-ai/shared/filesystem"
import { WorkspaceContext } from "@/control-plane/workspace-context"
import { WorkspaceID } from "@/control-plane/schema"
import { Flag } from "@/flag/flag"
import { Filesystem } from "@/util"
import { Global } from "@/global"
import path from "node:path"
import { DIRECTORY_DENIED_CODE } from "./access"
import { CAPABILITY_PREFIX, presentedToken } from "./capability"
import { LLMServerTokens } from "@/llm-server/tokens"

/**
 * The directory a request addresses, resolved exactly as this middleware does.
 *
 * Exported so `AuthMiddleware` can authenticate a capability token against it
 * BEFORE this middleware bootstraps an instance for it.
 */
export function requestedDirectory(c: Context) {
  const raw = c.req.query("directory") || c.req.header("x-mimocode-directory") || process.cwd()
  return AppFileSystem.resolve(
    (() => {
      try {
        return decodeURIComponent(raw)
      } catch {
        return raw
      }
    })(),
  )
}

export function InstanceMiddleware(workspaceID?: WorkspaceID): MiddlewareHandler {
  return async (c, next) => {
    const directory = requestedDirectory(c)

    if (!Flag.MIMOCODE_SERVER_OPERATOR_PASSWORD) {
      const cwd = Filesystem.resolve(process.cwd())
      // The fixed global Orchestrator workspace is app-owned (under Global.Path.data),
      // not user-supplied, so entering Orchestrator mode may switch to it even though
      // it lives outside the server's cwd. Allow it explicitly — but only when the
      // Orchestrator feature is enabled (otherwise no escape hatch exists).
      const orchestrator =
        Flag.MIMOCODE_EXPERIMENTAL_ORCHESTRATOR
          ? Filesystem.resolve(path.join(Global.Path.data, "orchestrator"))
          : undefined
      if (!Filesystem.contains(cwd, directory) && directory !== orchestrator) {
        // Keep the 403 and the prose message; add a stable `code` so a client can
        // tell this policy rejection apart from a transport failure and surface it
        // instead of dying (see ./access.ts).
        return c.json(
          {
            code: DIRECTORY_DENIED_CODE,
            error: "Access denied: directory must be within the server's working directory",
            directory,
          },
          403,
        )
      }
    }

    // Authenticate a capability request BEFORE the bootstrap below, which starts
    // config, plugins, LSP, watcher and index work. Upstream verifies inside the
    // route, which sits after that bootstrap, so on an operator-secured server —
    // where the containment check above is off by design — `Bearer junk` bought a
    // full instance start for any directory on the machine before being refused.
    // Deliberately after containment, so an outside directory is still refused
    // first and answers 403 rather than 401 (FD-004 residual).
    if (c.req.path.startsWith(CAPABILITY_PREFIX + "/")) {
      const token = presentedToken(c)
      const verdict = token ? await LLMServerTokens.verify(directory, token) : undefined
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
    }

    return WorkspaceContext.provide({
      workspaceID,
      async fn() {
        return Instance.provide({
          directory,
          init: () => AppRuntime.runPromise(InstanceBootstrap),
          async fn() {
            return next()
          },
        })
      },
    })
  }
}
