import { expect, test } from "bun:test"
import path from "node:path"
import { tmpdir } from "../fixture/fixture"

const moduleURL = (file: string) => JSON.stringify(new URL(`../../src/${file}`, import.meta.url).href)

// The children import application modules, never bun:test or test/preload. A
// SQLite statement wrapper kills the writer between writes; the publication listener
// kills it after the transaction has committed. Neither invokes a disposer.
const script = `
  import { writeFileSync } from "node:fs";
  import { Effect, Layer, ManagedRuntime } from "effect";
  const { InboxController } = await import(${moduleURL("inbox/index.ts")});
  const { InboxTable } = await import(${moduleURL("inbox/inbox.sql.ts")});
  const { Session } = await import(${moduleURL("session/index.ts")});
  const { MessageID, PartID } = await import(${moduleURL("session/schema.ts")});
  const { GlobalBus } = await import(${moduleURL("bus/global.ts")});
  const { Instance } = await import(${moduleURL("project/instance.ts")});
  const { Database, eq } = await import(${moduleURL("storage/index.ts")});
  const { initProjectors } = await import(${moduleURL("server/projectors.ts")});
  const { Log } = await import(${moduleURL("util/index.ts")});
  await Log.init({ print: false });
  initProjectors();
  const runtime = ManagedRuntime.make(Layer.mergeAll(InboxController.defaultLayer, Session.defaultLayer));
  const crash = () => {
    writeFileSync(process.env.INBOX_CRASH_STAGE_FILE, JSON.stringify({ pid: process.pid, window: process.env.INBOX_CRASH_WINDOW }));
    process.kill(process.pid, "SIGKILL");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
  };
  try {
    const result = await Instance.provide({ directory: process.env.INBOX_CRASH_DIRECTORY, fn: () =>
      runtime.runPromise(Effect.gen(function* () {
        const controller = yield* InboxController.Service;
        const sessions = yield* Session.Service;
        if (process.env.INBOX_CRASH_PHASE === "write") {
          const session = yield* sessions.create({ title: "Inbox crash recovery" });
          const message = { id: MessageID.ascending(), sessionID: session.id, agentID: "main", role: "user", source: "spawn",
            agent: "general", model: { providerID: "test", modelID: "test-model" }, time: { created: Date.now() } };
          const parts = ["first notification", "second notification", "third notification"].map(text => ({
            id: PartID.ascending(), messageID: message.id, sessionID: session.id, type: "text", synthetic: true, text,
          }));
          const input = { lane: { sessionID: session.id, agentID: "main" }, message, parts, type: "actor_notification", idempotencyKey: message.id };
          writeFileSync(process.env.INBOX_CRASH_STATE_FILE, JSON.stringify(input));
          const sqlite = Database.Client().$client;
          const prepare = sqlite.prepare.bind(sqlite);
          let writtenParts = 0;
          sqlite.prepare = (sql, ...options) => {
            const statement = prepare(sql, ...options);
            return new Proxy(statement, { get(target, property) {
              const value = Reflect.get(target, property, target);
              if (!["run", "get", "all"].includes(property)) return typeof value === "function" ? value.bind(target) : value;
              return (...args) => {
                if (process.env.INBOX_CRASH_WINDOW === "before-receipt" && sql.startsWith('insert into "inbox"')) crash();
                const result = value.apply(target, args);
                if (sql.startsWith('insert into "part"')) writtenParts++;
                if (process.env.INBOX_CRASH_WINDOW === "partial-parts" && writtenParts === 2) crash();
                return result;
              };
            }});
          };
          if (process.env.INBOX_CRASH_WINDOW === "after-commit") GlobalBus.on("event", event => {
            const info = event.payload?.syncEvent?.data?.info;
            if (info?.sessionID === session.id && info?.source === "spawn") crash();
          });
          yield* controller.accept(input, { deferKick: true });
          throw new Error("The selected crash boundary was not reached");
        }
        const input = yield* Effect.promise(() => Bun.file(process.env.INBOX_CRASH_STATE_FILE).json());
        const snapshot = Effect.gen(function* () {
          const receipts = Database.use(db => db.select().from(InboxTable)
            .where(eq(InboxTable.receiver_session_id, input.lane.sessionID)).orderBy(InboxTable.id).all());
          const messages = (yield* sessions.messages({ sessionID: input.lane.sessionID }))
            .map(message => ({ id: message.info.id, parts: message.parts.map(part => ({ type: part.type, synthetic: part.synthetic, text: part.text })) }));
          return { receipts, messages };
        });
        const before = yield* snapshot;
        const accepted = yield* controller.accept(input, { deferKick: true });
        const after = yield* snapshot;
        const repeated = yield* controller.accept(input, { deferKick: true });
        return { pid: process.pid, before, accepted, after, repeated, final: yield* snapshot };
      }))
    });
    await Bun.write(process.env.INBOX_CRASH_RESULT_FILE, JSON.stringify(result));
  } finally {
    await runtime.dispose();
    await Instance.disposeAll();
    Database.close();
  }
`

for (const window of ["partial-parts", "before-receipt", "after-commit"] as const) {
  test(`Inbox acceptance survives SIGKILL at ${window} and reopens without duplicate notifications`, async () => {
    await using tmp = await tmpdir({ git: true })
    const run = async (phase: "write" | "recover") => {
      const stderr = Bun.file(path.join(tmp.path, `${phase}.stderr`))
      const child = Bun.spawn([process.execPath, "--eval", script], {
        cwd: path.resolve(import.meta.dirname, "../.."),
        env: {
          ...process.env,
          MIMOCODE_DB: path.join(tmp.path, "persistent.db"),
          MIMOCODE_SKIP_MIGRATIONS: undefined,
          MIMOCODE_CONFIG_CONTENT: "{}",
          MIMOCODE_EXPERIMENTAL: undefined,
          MIMOCODE_MCP_TOOL_SEARCH: undefined,
          MIMOCODE_CODEX_MODE: undefined,
          MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL: undefined,
          MIMOCODE_COMPACTION_MAX_CONTEXT: undefined,
          MIMOCODE_COMPACTION_TRIGGER_RATIO: undefined,
          MIMOCODE_DISABLE_CHECKPOINT: undefined,
          MIMOCODE_EXPERIMENTAL_WORKSPACES: undefined,
          INBOX_CRASH_WINDOW: window,
          INBOX_CRASH_PHASE: phase,
          INBOX_CRASH_DIRECTORY: tmp.path,
          INBOX_CRASH_STATE_FILE: path.join(tmp.path, "state.json"),
          INBOX_CRASH_STAGE_FILE: path.join(tmp.path, "stage.json"),
          INBOX_CRASH_RESULT_FILE: path.join(tmp.path, "result.json"),
        },
        stdin: "ignore",
        stdout: Bun.file(path.join(tmp.path, `${phase}.stdout`)),
        stderr,
      })
      const timer = setTimeout(() => child.kill("SIGKILL"), 15_000)
      try {
        const exit = await child.exited
        expect({ exit, stderr: exit === 1 ? await stderr.text() : "" }).toEqual({
          exit: phase === "write" ? 137 : 0,
          stderr: "",
        })
      } finally {
        clearTimeout(timer)
        if (child.exitCode === null) {
          child.kill("SIGKILL")
          await child.exited
        }
      }
    }
    await run("write")
    const stage = await Bun.file(path.join(tmp.path, "stage.json")).json()
    expect(stage.window).toBe(window)
    await run("recover")
    const result = await Bun.file(path.join(tmp.path, "result.json")).json()
    expect(result.pid).not.toBe(stage.pid)
    expect(result.before.receipts).toHaveLength(window === "after-commit" ? 1 : 0)
    expect(result.before.messages).toHaveLength(window === "after-commit" ? 1 : 0)
    expect(result.after.receipts).toHaveLength(1)
    expect(result.after.receipts[0].state).toBe("accepted")
    expect(result.after.messages).toHaveLength(1)
    expect(result.after.messages[0].parts.map((part: { text: string }) => part.text)).toEqual([
      "first notification", "second notification", "third notification",
    ])
    expect(result.after.messages[0].parts.every((part: { type: string; synthetic: boolean }) => part.type === "text" && part.synthetic)).toBe(true)
    expect(result.repeated.id).toBe(result.accepted.id)
    expect(result.final).toEqual(result.after)
    if (window === "after-commit") expect(result.before).toEqual(result.after)
  }, 35_000)
}
