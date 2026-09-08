import { expect, test } from "bun:test"
import path from "node:path"
import { tmpdir } from "../fixture/fixture"

const OLD = "CATALOG_BEFORE_PROCESS_EXIT_38c9"
const NEW = "CATALOG_AFTER_PROCESS_REOPEN_a473"

test("two non-test processes preserve the same user frozen catalog and refresh only on a new direct turn", async () => {
  await using tmp = await tmpdir({ git: true })
  const requests: { messages?: { role: string; content: unknown }[] }[] = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      requests.push(await request.json())
      const chunk = (delta: Record<string, string>, finish_reason: string | null) =>
        `data: ${JSON.stringify({ id: "catalog-reopen", object: "chat.completion.chunk", created: 1, model: "gpt-5-reopen", choices: [{ index: 0, delta, finish_reason }] })}\n\n`
      return new Response(
        chunk({ role: "assistant", content: "New turn completed." }, null) + chunk({}, "stop") + "data: [DONE]\n\n",
        {
          headers: { "content-type": "text/event-stream" },
        },
      )
    },
  })
  const skill = path.join(tmp.path, ".mimocode/skill/reopen-probe/SKILL.md")
  const writeSkill = (description: string) =>
    Bun.write(
      skill,
      `---\nname: reopen-probe\ndescription: ${description}\n---\n\nBody stays loaded only on invocation.\n`,
    )
  const config = {
    checkpoint: { thresholds: [] },
    agent: { build: { prompt: "Catalog process reopen fixture." } },
    experimental: { predict_next_prompt: false },
    permission: { "*": "allow" },
    provider: {
      "reopen-test": {
        npm: "@ai-sdk/openai-compatible",
        options: { baseURL: `http://127.0.0.1:${server.port}/v1`, apiKey: "fixture" },
        models: {
          "gpt-5-reopen": { name: "Reopen fixture", tool_call: true, limit: { context: 256000, output: 10000 } },
        },
      },
    },
  }
  const module = (file: string) => JSON.stringify(new URL(`../../src/${file}`, import.meta.url).href)
  // Neither child imports bun:test or test/preload. Both use the real application
  // runtime and the same on-disk database; no session state crosses via globals.
  const script = `
    import { Effect } from "effect";
    const { Instance } = await import(${module("project/instance.ts")});
    const { AppRuntime } = await import(${module("effect/app-runtime.ts")});
    const { Session } = await import(${module("session/index.ts")});
    const { SessionPrompt } = await import(${module("session/prompt.ts")});
    const { prefixCaptureRef } = await import(${module("session/prefix-capture-ref.ts")});
    const { SessionPrefixSnapshot } = await import(${module("session/prefix-snapshot.ts")});
    const { SessionPrefixSnapshotTable } = await import(${module("session/session.sql.ts")});
    const { Database, eq } = await import(${module("storage/index.ts")});
    const { initProjectors } = await import(${module("server/projectors.ts")});
    const { Log } = await import(${module("util/index.ts")});
    await Log.init({ print: false });
    initProjectors();
    try {
      const result = await Instance.provide({ directory: ${JSON.stringify(tmp.path)}, fn: () => AppRuntime.runPromise(Effect.gen(function* () {
        const sessions = yield* Session.Service;
        const prompt = yield* SessionPrompt.Service;
        const model = { providerID: "reopen-test", modelID: "gpt-5-reopen" };
        const rows = (id) => Database.use(db => db.select().from(SessionPrefixSnapshotTable).where(eq(SessionPrefixSnapshotTable.session_id, id)).all());
        const capture = (sessionID) => Effect.gen(function* () {
          if (!prefixCaptureRef.current) throw new Error("Missing real prefix capture");
          const prefix = yield* prefixCaptureRef.current({ sessionID, agentName: "build", ...model, msgs: yield* sessions.messages({ sessionID }) });
          return {
            system: prefix.system,
            messages: prefix.inheritedMessages,
            tools: yield* Effect.promise(() => SessionPrefixSnapshot.snapshotTools(prefix.tools, [...prefix.activeTools])),
            row: rows(sessionID)[0],
          };
        });
        if (process.env.CATALOG_REOPEN_PHASE === "first") {
          const session = yield* sessions.create({ title: "Cross-process catalog" });
          const user = yield* prompt.prompt({ sessionID: session.id, agent: "build", model, harness: "codex", noReply: true, parts: [{ type: "text", text: "Keep this same user frozen" }] });
          const captured = yield* capture(session.id);
          return { pid: process.pid, sessionID: session.id, userID: user.info.id, captured };
        }
        const sessionID = process.env.CATALOG_REOPEN_SESSION;
        const before = yield* sessions.messages({ sessionID });
        const captured = yield* capture(sessionID);
        const response = yield* prompt.prompt({ sessionID, agent: "build", model, parts: [{ type: "text", text: "A new direct user now requests work" }] });
        const after = yield* sessions.messages({ sessionID });
        return { pid: process.pid, sessionID, captured, before, after, row: rows(sessionID)[0], response };
      })) });
      console.log("CATALOG_REOPEN_RESULT=" + JSON.stringify(result));
    } finally {
      await Instance.disposeAll();
      await AppRuntime.dispose();
      Database.close();
    }
  `
  const run = async (phase: string, sessionID?: string) => {
    const child = Bun.spawn([process.execPath, "--eval", script], {
      cwd: path.resolve(import.meta.dirname, "../.."),
      env: {
        ...process.env,
        MIMOCODE_DB: path.join(tmp.path, "persistent.db"),
        MIMOCODE_SKIP_MIGRATIONS: undefined,
        MIMOCODE_CONFIG_CONTENT: JSON.stringify(config),
        MIMOCODE_DISABLE_BUILTIN_SKILLS: "true",
        MIMOCODE_DISABLE_COMPOSE_SKILLS: "true",
        MIMOCODE_DISABLE_INSTRUCTIONS: "true",
        MIMOCODE_EXPERIMENTAL: undefined,
        MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH: undefined,
        MIMOCODE_CODEX_MODE: undefined,
        MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL: undefined,
        MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS: undefined,
        MIMOCODE_AUTO_APPROVE_DELETE: undefined,
        CATALOG_REOPEN_PHASE: phase,
        CATALOG_REOPEN_SESSION: sessionID,
      },
      stdout: "pipe",
      stderr: "pipe",
    })
    const timer = setTimeout(() => child.kill("SIGKILL"), 25_000)
    try {
      const [exit, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect({ exit, stderr: exit ? stderr : "" }).toEqual({ exit: 0, stderr: "" })
      const result = stdout.split("\n").find((line) => line.startsWith("CATALOG_REOPEN_RESULT="))
      expect(result).toBeDefined()
      return JSON.parse(result!.slice("CATALOG_REOPEN_RESULT=".length))
    } finally {
      clearTimeout(timer)
      if (child.exitCode === null) {
        child.kill("SIGKILL")
        await child.exited
      }
    }
  }
  try {
    await writeSkill(OLD)
    const first = await run("first")
    expect(requests).toHaveLength(0)
    expect(first.captured.row.skill_catalog).toMatchObject({ schema: 3, turnID: first.userID })
    expect(first.captured.system.join("\n")).toContain(OLD)
    expect(
      first.captured.row.tools.find((tool: { name: string }) => tool.name === "actor").native_input_schema,
    ).toBeDefined()
    await writeSkill(NEW)
    const reopened = await run("second", first.sessionID)
    expect(reopened.pid).not.toBe(first.pid)
    expect(reopened.before.find((message: { info: { role: string } }) => message.info.role === "user").info.id).toBe(
      first.userID,
    )
    expect(reopened.captured).toEqual(first.captured)
    expect(reopened.captured.system.join("\n")).not.toContain(NEW)
    expect(reopened.after.find((message: { info: { id: string } }) => message.info.id === first.userID).parts).toEqual(
      reopened.before.find((message: { info: { id: string } }) => message.info.id === first.userID).parts,
    )
    expect(reopened.row.skill_catalog.version).not.toBe(first.captured.row.skill_catalog.version)
    expect(reopened.row.skill_catalog.turnID).not.toBe(first.userID)
    expect(reopened.row.skill_catalog.text).toContain(NEW)
    expect(reopened.row.skill_catalog.text).not.toContain(OLD)
    expect(reopened.response.info.finish).toBe("stop")
    expect(requests).toHaveLength(1)
    const system = JSON.stringify(requests[0].messages?.filter((message) => message.role === "system"))
    expect(system).toContain(NEW)
    expect(system).not.toContain(OLD)
    expect(JSON.stringify(requests[0].messages?.filter((message) => message.role === "user"))).not.toContain(NEW)
  } finally {
    server.stop(true)
  }
}, 60_000)
