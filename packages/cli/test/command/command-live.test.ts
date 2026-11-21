import { describe, expect } from "bun:test"
import { Deferred, Effect, Layer } from "effect"
import path from "path"
import { Bus } from "../../src/bus"
import { Command } from "../../src/command"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { provideTmpdirInstance, tmpdirScoped } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { withEnv } from "../lib/env"

withEnv({ MIMOCODE_DISABLE_BUILTIN_SKILLS: "true" })

const it = testEffect(Layer.mergeAll(Command.defaultLayer, CrossSpawnSpawner.defaultLayer, Bus.layer))

const writeSkill = (dir: string, name: string) =>
  Effect.promise(() =>
    Bun.write(
      path.join(dir, ".mimocode", "skill", name, "SKILL.md"),
      `---\nname: ${name}\ndescription: ${name} for live command tests.\n---\n\n# ${name}\n`,
    ),
  )

describe("command list", () => {
  // [skill-catalog-live T5] Slash completion lists skills while an MCP server is
  // still connecting (a stdio server that never answers initialize), and picks
  // up a skill created afterwards without a restart.
  it.live("lists live skills without waiting for MCP servers to settle", () =>
    provideTmpdirInstance(
      (dir) =>
        Effect.gen(function* () {
          yield* writeSkill(dir, "first-skill")
          const command = yield* Command.Service

          const names = command.list().pipe(
            Effect.timeout("5 seconds"),
            Effect.map((list) => list.filter((item) => item.source === "skill").map((item) => item.name).toSorted()),
          )
          expect(yield* names).toEqual(["first-skill"])

          yield* writeSkill(dir, "second-skill")
          expect(yield* names).toEqual(["first-skill", "second-skill"])
          expect((yield* command.get("second-skill").pipe(Effect.timeout("5 seconds")))?.source).toBe("skill")
        }),
      {
        git: true,
        config: { mcp: { pending: { type: "local", command: ["sleep", "60"] } } },
      },
    ),
    30_000,
  )

  // FC-005: listing does not wait for MCP, so a client that cached it (the
  // TUI's slash completion) must hear when MCP prompt commands arrive.
  it.live("announces MCP prompt commands that arrive after the listing", () =>
    Effect.gen(function* () {
      const fixture = yield* tmpdirScoped()
      const script = path.join(fixture, "server.mjs")
      const gate = path.join(fixture, "mcp-ready")
      // Answers initialize only once the test opens the gate.
      yield* Effect.promise(() => Bun.write(script, LATE_PROMPT_SERVER))
      return yield* provideTmpdirInstance(
        () =>
          Effect.gen(function* () {
            const bus = yield* Bus.Service
            const updated = yield* Deferred.make<void>()
            const off = yield* bus.subscribeCallback(Command.Event.Updated, () => {
              Deferred.doneUnsafe(updated, Effect.void)
            })
            yield* Effect.addFinalizer(() => Effect.sync(off))
            const command = yield* Command.Service
            const mcpNames = command.list().pipe(
              Effect.timeout("5 seconds"),
              Effect.map((list) => list.filter((item) => item.source === "mcp").map((item) => item.name)),
            )
            expect(yield* mcpNames).toEqual([])
            expect(yield* Deferred.isDone(updated)).toBe(false)

            yield* Effect.promise(() => Bun.write(gate, "ready"))
            yield* Deferred.await(updated).pipe(Effect.timeout("20 seconds"))
            expect(yield* mcpNames).toEqual(["late:late-prompt"])
          }),
        {
          git: true,
          config: {
            mcp: { late: { type: "local", command: [process.execPath, script], environment: { GATE: gate } } },
          },
        },
      )
    }),
    30_000,
  )
})

const LATE_PROMPT_SERVER = `
import readline from 'node:readline';
import fs from 'node:fs';
const lines = readline.createInterface({ input: process.stdin });
lines.on('close', () => process.exit(0));
lines.on('line', async line => {
  const req = JSON.parse(line);
  if (req.id == null) return;
  if (req.method === 'initialize') while (!fs.existsSync(process.env.GATE)) await new Promise(r => setTimeout(r, 20));
  const result = req.method === 'initialize'
    ? { protocolVersion: '2024-11-05', capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: { name: 'late', version: '1' } }
    : req.method === 'prompts/list'
    ? { prompts: [{ name: 'late-prompt', description: 'arrives after listing' }] }
    : req.method === 'tools/list'
    ? { tools: [] }
    : req.method === 'resources/list'
    ? { resources: [] }
    : {};
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result }) + '\\n');
});
`
