import { expect, test } from "bun:test"
import type { Effect as EffectType } from "effect"

// Other MCP suites mock the SDK at module scope. Run this real transport proof
// in its own Bun test process, retaining the package's isolation preload.
if (!process.env.MIMOCODE_TEST_CLAUDE_MCP_CHILD) {
  test("Claude MCP startup controls use real isolated transports", async () => {
    const env: NodeJS.ProcessEnv = { ...process.env, MIMOCODE_TEST_CLAUDE_MCP_CHILD: "1" }
    delete env.MIMOCODE_EXPERIMENTAL
    delete env.MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH
    delete env.MIMOCODE_CODEX_MODE
    const child = Bun.spawn([process.execPath, "test", import.meta.path, "--timeout", "30000"], {
      cwd: import.meta.dir + "/../..",
      env,
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    expect({ code, output: stdout + stderr }).toEqual({ code: 0, output: expect.any(String) })
  }, 90_000)
} else {
  const { Effect, Layer } = await import("effect")
  const { NodeFileSystem, NodePath } = await import("@effect/platform-node")
  const CrossSpawnSpawner = await import("../../src/effect/cross-spawn-spawner")
  const { MCP } = await import("../../src/mcp")
  const { provideTmpdirInstance } = await import("../fixture/fixture")
  const { testEffect } = await import("../lib/effect")
  const infra = CrossSpawnSpawner.defaultLayer.pipe(
    Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, NodePath.layer)),
  )
  const it = testEffect(MCP.defaultLayer.pipe(Layer.provideMerge(infra)))
  const withConfig = <A, E, R>(
    self: (dir: string) => EffectType.Effect<A, E, R>,
    options: { init: (dir: string) => Promise<unknown> },
  ) => provideTmpdirInstance((dir) => Effect.promise(() => options.init(dir)).pipe(Effect.andThen(() => self(dir))))

  const server = () =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const requests: string[] = []
        const http = Bun.serve({
          hostname: "127.0.0.1",
          port: 0,
          async fetch(req) {
            if (req.method !== "POST") return new Response(null, { status: 405 })
            const body = await req.json()
            requests.push(body.method)
            if (body.id == null) return new Response(null, { status: 202 })
            const result =
              body.method === "initialize"
                ? {
                    protocolVersion: "2024-11-05",
                    capabilities: { tools: {} },
                    serverInfo: { name: "fixture", version: "1" },
                  }
                : body.method === "tools/list"
                  ? { tools: [{ name: "echo", inputSchema: { type: "object", properties: {} } }] }
                  : { content: [{ type: "text", text: "fixture-result" }] }
            return Response.json({ jsonrpc: "2.0", id: body.id, result })
          },
        })
        return { requests, url: http.url.href, stop: () => http.stop(true) }
      }),
      (fixture) => Effect.promise(() => fixture.stop()),
    )

  it.live("Claude import stays pending despite its own auto_connect and permits manual connection", () =>
    Effect.gen(function* () {
      const fixture = yield* server()
      yield* withConfig(
        () =>
          Effect.gen(function* () {
            const mcp = yield* MCP.Service
            expect((yield* mcp.status()).selected).toEqual({ status: "pending" })
            expect(fixture.requests).toEqual([])
            yield* mcp.connect("selected")
            expect((yield* mcp.status()).selected).toEqual({ status: "connected" })
            expect(fixture.requests.filter((method) => method === "initialize")).toHaveLength(1)
            expect(Object.keys(yield* mcp.tools())).toEqual(["selected_echo"])
          }),
        {
          init: (dir) =>
            Bun.write(
              `${dir}/.claude.json`,
              JSON.stringify({
                mcpServers: {
                  selected: { type: "http", url: fixture.url, oauth: false, auto_connect: true },
                },
              }),
            ),
        },
      )
    }),
  )

  it.live("Claude import explicitly auto-connects only the selected server and keeps tools instance-local", () =>
    Effect.gen(function* () {
      const fixture = yield* server()
      yield* withConfig(
        () =>
          Effect.gen(function* () {
            const mcp = yield* MCP.Service
            expect((yield* mcp.status()).selected).toEqual({ status: "connected" })
            expect((yield* mcp.status()).other).toEqual({ status: "pending" })
            const client = (yield* mcp.clients()).selected
            expect((yield* Effect.promise(() => client.callTool({ name: "echo", arguments: {} }))).content).toEqual([
              { type: "text", text: "fixture-result" },
            ])
            yield* withConfig(
              () =>
                Effect.gen(function* () {
                  expect((yield* mcp.status()).selected).toEqual({ status: "pending" })
                  expect(Object.keys(yield* mcp.tools())).toEqual([])
                }),
              {
                init: (dir) =>
                  Bun.write(
                    `${dir}/.claude.json`,
                    JSON.stringify({
                      mcpServers: {
                        selected: { type: "http", url: fixture.url, oauth: false },
                      },
                    }),
                  ),
              },
            )
            expect((yield* mcp.status()).selected).toEqual({ status: "connected" })
            expect(fixture.requests.filter((method) => method === "initialize")).toHaveLength(1)
            yield* mcp.disconnect("selected")
            expect(Object.keys(yield* mcp.clients())).toEqual([])
          }),
        {
          init: async (dir) => {
            await Bun.write(
              `${dir}/.claude.json`,
              JSON.stringify({
                mcpServers: {
                  selected: { type: "http", url: fixture.url, oauth: false },
                  other: { type: "http", url: fixture.url, oauth: false },
                },
              }),
            )
            await Bun.write(`${dir}/mimocode.json`, JSON.stringify({ mcp: { selected: { auto_connect: true } } }))
          },
        },
      )
    }),
  )

  for (const disabled of ["native", "claude"] as const) {
    it.live(`Claude import auto_connect cannot override ${disabled} disabled status`, () =>
      Effect.gen(function* () {
        const fixture = yield* server()
        yield* withConfig(
          () =>
            Effect.gen(function* () {
              const mcp = yield* MCP.Service
              expect((yield* mcp.status()).selected).toEqual({ status: "disabled" })
              expect(fixture.requests).toEqual([])
              expect(Object.keys(yield* mcp.clients())).toEqual([])
            }),
          {
            init: async (dir) => {
              await Bun.write(
                `${dir}/.claude.json`,
                JSON.stringify({
                  mcpServers: {
                    selected: { type: "http", url: fixture.url, oauth: false, disabled: disabled === "claude" },
                  },
                }),
              )
              await Bun.write(
                `${dir}/mimocode.json`,
                JSON.stringify({
                  mcp: {
                    selected: { auto_connect: true, ...(disabled === "native" && { enabled: false }) },
                  },
                }),
              )
            },
          },
        )
      }),
    )
  }

  it.live("native MCP with auto_connect false stays pending and permits manual connection", () =>
    Effect.gen(function* () {
      const fixture = yield* server()
      yield* withConfig(
        () =>
          Effect.gen(function* () {
            const mcp = yield* MCP.Service
            expect((yield* mcp.status()).selected).toEqual({ status: "pending" })
            expect(fixture.requests).toEqual([])
            yield* mcp.connect("selected")
            expect((yield* mcp.status()).selected).toEqual({ status: "connected" })
            expect(fixture.requests).toContain("tools/list")
          }),
        {
          init: (dir) =>
            Bun.write(
              `${dir}/mimocode.json`,
              JSON.stringify({
                mcp: {
                  selected: { type: "remote", url: fixture.url, oauth: false, auto_connect: false },
                },
              }),
            ),
        },
      )
    }),
  )

  it.live("Claude local auto-connect owns the real process and closes it on disconnect", () =>
    withConfig(
      (dir) =>
        Effect.gen(function* () {
          const mcp = yield* MCP.Service
          expect(yield* Effect.promise(() => Bun.file(`${dir}/started`).exists())).toBe(false)
          expect((yield* mcp.status()).selected).toEqual({ status: "connected" })
          const pid = Number(yield* Effect.promise(() => Bun.file(`${dir}/started`).text()))
          expect(Number.isSafeInteger(pid)).toBe(true)
          expect(() => process.kill(pid, 0)).not.toThrow()
          expect(Object.keys(yield* mcp.tools())).toEqual(["selected_echo"])
          yield* mcp.disconnect("selected")
          expect((yield* mcp.status()).selected).toEqual({ status: "disabled" })
          expect(() => process.kill(pid, 0)).toThrow()
        }),
      {
        init: async (dir) => {
          await Bun.write(
            `${dir}/server.mjs`,
            `
          import { createInterface } from "node:readline";
          import { writeFileSync } from "node:fs";
          writeFileSync(${JSON.stringify(`${dir}/started`)}, String(process.pid));
          createInterface({ input: process.stdin }).on("line", (line) => {
            const request = JSON.parse(line);
            if (request.id == null) return;
            const result = request.method === "initialize"
              ? { protocolVersion: request.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "stdio-fixture", version: "1" } }
              : { tools: [{ name: "echo", inputSchema: { type: "object", properties: {} } }] };
            process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }) + "\\n");
          });
        `,
          )
          await Bun.write(
            `${dir}/.claude.json`,
            JSON.stringify({
              mcpServers: {
                selected: { command: process.execPath, args: [`${dir}/server.mjs`] },
              },
            }),
          )
          await Bun.write(`${dir}/mimocode.json`, JSON.stringify({ mcp: { selected: { auto_connect: true } } }))
        },
      },
    ),
  )
}
