import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import { networkInterfaces } from "node:os"
import { Effect, ManagedRuntime } from "effect"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { OAuthClientMetadataSchema } from "@modelcontextprotocol/sdk/shared/auth.js"
import z from "zod/v4"

// This is a non-test application process: no bun:test, test preload, mocked
// transport, browser launch, or credentials from the user's data directory.
const bind = process.env.MIMOCODE_TEST_MCP_LAB_BIND ?? "127.0.0.1"
if (bind !== "127.0.0.1") {
  const octets = bind.split(".").map(Number)
  assert.ok(
    octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168),
    "The optional bind must be RFC1918",
  )
  assert.ok(
    Object.values(networkInterfaces())
      .flat()
      .some((address) => address?.family === "IPv4" && !address.internal && address.address === bind),
    "Bind only a local interface",
  )
}
const directory = process.env.MIMOCODE_TEST_MCP_LAB_DIRECTORY
const resultFile = process.env.MIMOCODE_TEST_MCP_LAB_RESULT
assert.ok(directory)
assert.ok(resultFile)
assert.ok(process.env.MIMOCODE_HOME?.startsWith(directory))

const evidence = {
  origin: "",
  resourceMetadata: 0,
  issuerMetadata: 0,
  registrations: 0,
  grants: [] as string[],
  calls: 0,
  pkceVerified: false,
  accessToken: "",
  refreshToken: "",
}
const codes = new Map<string, { challenge: string; redirectUri: string }>()
const sessions = new Map<string, { server: McpServer; transport: WebStandardStreamableHTTPServerTransport }>()
const failures: unknown[] = []
const http = Bun.serve({
  hostname: bind,
  port: 0,
  async fetch(request) {
    try {
      const url = new URL(request.url)
      if (url.pathname === "/.well-known/oauth-protected-resource/mcp") {
        evidence.resourceMetadata++
        return Response.json({
          resource: `${evidence.origin}/mcp`,
          authorization_servers: [evidence.origin],
          scopes_supported: ["lab:read"],
          bearer_methods_supported: ["header"],
        })
      }
      if (url.pathname === "/.well-known/oauth-authorization-server") {
        evidence.issuerMetadata++
        return Response.json({
          issuer: evidence.origin,
          authorization_endpoint: `${evidence.origin}/authorize`,
          token_endpoint: `${evidence.origin}/token`,
          registration_endpoint: `${evidence.origin}/register`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          token_endpoint_auth_methods_supported: ["none"],
          code_challenge_methods_supported: ["S256"],
        })
      }
      if (url.pathname === "/register") {
        assert.equal(request.method, "POST")
        const metadata = OAuthClientMetadataSchema.parse(await request.json())
        assert.deepEqual(metadata.redirect_uris, [redirectUri])
        assert.equal(metadata.token_endpoint_auth_method, "none")
        evidence.registrations++
        return Response.json({ ...metadata, client_id: "lab-client" }, { status: 201 })
      }
      if (url.pathname === "/authorize") {
        assert.equal(url.searchParams.get("client_id"), "lab-client")
        assert.equal(url.searchParams.get("response_type"), "code")
        assert.equal(url.searchParams.get("redirect_uri"), redirectUri)
        assert.equal(url.searchParams.get("code_challenge_method"), "S256")
        assert.equal(url.searchParams.get("resource"), `${evidence.origin}/mcp`)
        assert.equal(url.searchParams.get("scope"), "lab:read")
        const state = url.searchParams.get("state")
        const challenge = url.searchParams.get("code_challenge")
        assert.match(state ?? "", /^[a-f0-9]{64}$/)
        assert.ok(challenge)
        const code = `lab-code-${randomUUID()}`
        codes.set(code, { challenge, redirectUri })
        const callback = new URL(redirectUri)
        callback.searchParams.set("state", state!)
        callback.searchParams.set("code", code)
        return Response.redirect(callback, 302)
      }
      if (url.pathname === "/token") {
        assert.equal(request.method, "POST")
        const form = new URLSearchParams(await request.text())
        assert.equal(form.get("client_id"), "lab-client")
        assert.equal(form.get("resource"), `${evidence.origin}/mcp`)
        const grant = form.get("grant_type")
        if (grant === "authorization_code") {
          const authorization = codes.get(form.get("code") ?? "")
          assert.ok(authorization, "Only this issuer's authorization code may be exchanged")
          assert.equal(form.get("redirect_uri"), authorization.redirectUri)
          const verifier = form.get("code_verifier")
          assert.ok(verifier)
          assert.equal(createHash("sha256").update(verifier).digest("base64url"), authorization.challenge)
          codes.delete(form.get("code")!)
          evidence.pkceVerified = true
        } else {
          assert.equal(grant, "refresh_token")
          assert.equal(form.get("refresh_token"), evidence.refreshToken)
        }
        evidence.grants.push(grant)
        evidence.accessToken = `lab-access-${evidence.grants.length}`
        evidence.refreshToken = `lab-refresh-${evidence.grants.length}`
        return Response.json({
          access_token: evidence.accessToken,
          refresh_token: evidence.refreshToken,
          token_type: "Bearer",
          expires_in: 3600,
          scope: "lab:read",
        })
      }
      if (url.pathname !== "/mcp") return new Response(null, { status: 404 })
      if (!evidence.accessToken || request.headers.get("authorization") !== `Bearer ${evidence.accessToken}`) {
        return new Response(null, {
          status: 401,
          headers: {
            "www-authenticate": `Bearer resource_metadata="${evidence.origin}/.well-known/oauth-protected-resource/mcp", scope="lab:read"`,
          },
        })
      }
      const existing = sessions.get(request.headers.get("mcp-session-id") ?? "")
      if (existing) return existing.transport.handleRequest(request)
      if (request.method !== "POST") return new Response(null, { status: 405 })
      const server = new McpServer({ name: "read-only-laboratory", version: "1.0.0" })
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        enableJsonResponse: true,
        onsessioninitialized: (id) => {
          sessions.set(id, { server, transport })
        },
      })
      server.registerTool(
        "read_value",
        {
          description: "Read one synthetic laboratory value",
          inputSchema: {},
          outputSchema: { value: z.string() },
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        () => {
          evidence.calls++
          return {
            content: [{ type: "text", text: "laboratory-value" }],
            structuredContent: { value: "laboratory-value" },
          }
        },
      )
      await server.connect(transport)
      return transport.handleRequest(request)
    } catch (error) {
      failures.push(error)
      return Response.json({ error: "laboratory assertion failed" }, { status: 500 })
    }
  },
})
// Keep the laboratory bound while selecting the callback port. Releasing the
// callback reservation before starting the laboratory can hand it that port.
const reservation = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response(null) })
const redirectUri = `http://127.0.0.1:${reservation.port}/mcp/oauth/callback`
assert.ok(bind !== "127.0.0.1" || reservation.port !== http.port)
await reservation.stop(true)
evidence.origin = `http://${bind}:${http.port}`
process.env.MIMOCODE_CONFIG_CONTENT = JSON.stringify({
  mcp: {
    laboratory: {
      type: "remote",
      url: `${evidence.origin}/mcp`,
      auto_connect: false,
      timeout: 5000,
      oauth: { redirectUri, scope: "lab:read" },
    },
  },
})

const { MCP } = await import("../../src/mcp")
const { McpOAuthCallback } = await import("../../src/mcp/oauth-callback")
const { Instance } = await import("../../src/project/instance")
const { Database } = await import("../../src/storage")
const { Log } = await import("../../src/util")
await Log.init({ print: false })
const runtime = ManagedRuntime.make(MCP.defaultLayer)
try {
  await Instance.provide({
    directory,
    fn: async () => {
      const mcp = await runtime.runPromise(MCP.Service.use(Effect.succeed))
      assert.equal((await runtime.runPromise(mcp.status())).laboratory.status, "pending")
      const started = await runtime.runPromise(mcp.startAuth("laboratory"))
      assert.ok(started.authorizationUrl)
      const pending = McpOAuthCallback.waitForCallback(started.oauthState, "laboratory")
      // An unrelated state must not settle the real pending flow or reach /token.
      const invalid = await fetch(`${redirectUri}?state=wrong-laboratory-state&code=wrong-code`)
      assert.equal(invalid.status, 400)
      assert.deepEqual(evidence.grants, [])
      const authorization = await fetch(started.authorizationUrl, { redirect: "manual" })
      assert.equal(authorization.status, 302)
      const callback = authorization.headers.get("location")
      assert.ok(callback)
      assert.equal(new URL(callback).searchParams.get("state"), started.oauthState)
      assert.equal((await fetch(callback)).status, 200)
      assert.equal((await runtime.runPromise(mcp.finishAuth("laboratory", await pending))).status, "connected")
      assert.equal(await runtime.runPromise(mcp.getAuthStatus("laboratory")), "authenticated")
      const tools = await runtime.runPromise(mcp.tools())
      assert.deepEqual(Object.keys(tools), ["laboratory_read_value"])
      const call = async () => {
        assert.ok(tools.laboratory_read_value.execute)
        const output = await tools.laboratory_read_value.execute({}, { toolCallId: "lab-call", messages: [] })
        assert.deepEqual(output, {
          content: [{ type: "text", text: "laboratory-value" }],
          structuredContent: { value: "laboratory-value" },
        })
      }
      await call()
      evidence.accessToken = "lab-access-revoked"
      await call()
      assert.deepEqual(evidence.grants, ["authorization_code", "refresh_token"])
      assert.equal(evidence.calls, 2)
      assert.ok(evidence.pkceVerified)
      assert.ok(evidence.resourceMetadata > 0 && evidence.issuerMetadata > 0)
      assert.equal(evidence.registrations, 1)
      await runtime.runPromise(mcp.disconnect("laboratory"))
      await runtime.runPromise(mcp.removeAuth("laboratory"))
      const cancelled = await runtime.runPromise(mcp.startAuth("laboratory"))
      const cancelledResult = McpOAuthCallback.waitForCallback(cancelled.oauthState, "laboratory").then(
        () => "unexpected success",
        (error) => (error instanceof Error ? error.message : String(error)),
      )
      await runtime.runPromise(mcp.removeAuth("laboratory"))
      assert.equal(await cancelledResult, "Authorization cancelled")
      assert.equal((await fetch(`${redirectUri}?state=${cancelled.oauthState}&code=late-code`)).status, 400)
      assert.equal(await runtime.runPromise(mcp.getAuthStatus("laboratory")), "not_authenticated")
      assert.deepEqual(evidence.grants, ["authorization_code", "refresh_token"])
      assert.deepEqual(failures, [])
      await Bun.write(
        resultFile,
        JSON.stringify({
          transport: bind === "127.0.0.1" ? "loopback" : "private-interface",
          resourceDiscovery: true,
          issuerDiscovery: true,
          dynamicRegistration: true,
          pkce: true,
          invalidStateRejected: true,
          callback: true,
          toolCalls: evidence.calls,
          refresh: true,
          cancelled: true,
          lateCallbackRejected: true,
          tokenGrants: evidence.grants,
        }),
      )
    },
  })
} finally {
  await runtime.dispose()
  await Instance.disposeAll()
  await McpOAuthCallback.stop()
  await Promise.all([...sessions.values()].map((session) => session.server.close()))
  await http.stop(true)
  Database.close()
}
