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
  const { Inbox } = await import(${moduleURL("inbox/index.ts")});
  const { InboxTable } = await import(${moduleURL("inbox/inbox.sql.ts")});
  const { ActorRegistry } = await import(${moduleURL("actor/registry.ts")});
  const { Session } = await import(${moduleURL("session/index.ts")});
  const { MessageID } = await import(${moduleURL("session/schema.ts")});
  const { Bus } = await import(${moduleURL("bus/index.ts")});
  const { GlobalBus } = await import(${moduleURL("bus/global.ts")});
  const { Instance } = await import(${moduleURL("project/instance.ts")});
  const { Database, and, eq } = await import(${moduleURL("storage/index.ts")});
  const { initProjectors } = await import(${moduleURL("server/projectors.ts")});
  const { Log } = await import(${moduleURL("util/index.ts")});
  await Log.init({ print: false });
  initProjectors();
  const base = Layer.mergeAll(Session.defaultLayer, ActorRegistry.defaultLayer, Bus.defaultLayer);
  const runtime = ManagedRuntime.make(Inbox.layer.pipe(Layer.provide(base), Layer.provideMerge(base)));
  const crash = () => {
    writeFileSync(process.env.INBOX_CRASH_STAGE_FILE, JSON.stringify({ pid: process.pid, window: process.env.INBOX_CRASH_WINDOW }));
    process.kill(process.pid, "SIGKILL");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
  };
  try {
    const result = await Instance.provide({ directory: process.env.INBOX_CRASH_DIRECTORY, fn: () =>
      runtime.runPromise(Effect.gen(function* () {
        const inbox = yield* Inbox.Service;
        const sessions = yield* Session.Service;
        const registry = yield* ActorRegistry.Service;
        const actorID = "crash-receiver";
        if (process.env.INBOX_CRASH_PHASE === "write") {
          const session = yield* sessions.create({ title: "Inbox crash recovery" });
          yield* registry.register({ sessionID: session.id, actorID, mode: "subagent", agent: "general",
            description: "Crash recovery fixture", contextMode: "none", background: false, lifecycle: "ephemeral" });
          yield* sessions.updateMessage({ id: MessageID.ascending(), sessionID: session.id, agentID: actorID,
            role: "user", agent: "general", model: { providerID: "test", modelID: "test-model" }, time: { created: Date.now() } });
          const sent = [];
          for (const content of ["first notification", "second notification", "third notification"]) {
            sent.push({ ...(yield* inbox.send({ receiverSessionID: session.id, receiverActorID: actorID, content })), content });
          }
          sent.sort((a, b) => a.inboxID < b.inboxID ? -1 : a.inboxID > b.inboxID ? 1 : 0);
          writeFileSync(process.env.INBOX_CRASH_STATE_FILE, JSON.stringify({ sessionID: session.id,
            ids: sent.map(row => row.inboxID), contents: sent.map(row => row.content) }));
          const sqlite = Database.Client().$client;
          const prepare = sqlite.prepare.bind(sqlite);
          let parts = 0;
          sqlite.prepare = (sql, ...options) => {
            const statement = prepare(sql, ...options);
            return new Proxy(statement, { get(target, property) {
              const value = Reflect.get(target, property, target);
              if (property !== "run") return typeof value === "function" ? value.bind(target) : value;
              return (...args) => {
                if (process.env.INBOX_CRASH_WINDOW === "before-delete" && sql.startsWith('delete from "inbox"')) crash();
                const result = value.apply(target, args);
                if (sql.startsWith('insert into "part"')) parts++;
                if (process.env.INBOX_CRASH_WINDOW === "partial-parts" && parts === 2) crash();
                return result;
              };
            }});
          };
          if (process.env.INBOX_CRASH_WINDOW === "after-commit") {
            GlobalBus.on("event", event => {
              const info = event.payload?.syncEvent?.data?.info;
              if (info?.sessionID === session.id && info?.source === "spawn") crash();
            });
          }
          yield* inbox.drain(session.id, actorID);
          throw new Error("The selected crash boundary was not reached");
        }
        const state = yield* Effect.promise(() => Bun.file(process.env.INBOX_CRASH_STATE_FILE).json());
        const snapshot = Effect.gen(function* () {
          const queued = Database.use(db => db.select({ id: InboxTable.id }).from(InboxTable)
            .where(and(eq(InboxTable.receiver_session_id, state.sessionID), eq(InboxTable.receiver_actor_id, actorID)))
            .orderBy(InboxTable.id).all()).map(row => row.id);
          const messages = (yield* sessions.messages({ sessionID: state.sessionID, agentID: actorID }))
            .filter(message => message.info.role === "user" && message.info.source === "spawn")
            .map(message => ({ id: message.info.id, parts: message.parts.map(part => ({ type: part.type, synthetic: part.synthetic, text: part.text })) }));
          return { queued, messages };
        });
        const before = yield* snapshot;
        const drained = yield* inbox.drain(state.sessionID, actorID);
        const after = yield* snapshot;
        const repeated = yield* inbox.drain(state.sessionID, actorID);
        return { pid: process.pid, ids: state.ids, contents: state.contents, before, drained, after, repeated, final: yield* snapshot };
      }))
    });
    await Bun.write(process.env.INBOX_CRASH_RESULT_FILE, JSON.stringify(result));
  } finally {
    await runtime.dispose();
    await Instance.disposeAll();
    Database.close();
  }
`

for (const window of ["partial-parts", "before-delete", "after-commit"] as const) {
  test(`Inbox drain survives SIGKILL at ${window} and reopens without duplicate notifications`, async () => {
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
          MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH: undefined,
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
    expect(result.before.queued).toEqual(window === "after-commit" ? [] : result.ids)
    expect(result.before.messages).toHaveLength(window === "after-commit" ? 1 : 0)
    expect(result.drained).toBe(window === "after-commit" ? 0 : 3)
    expect(result.after.queued).toEqual([])
    expect(result.after.messages).toHaveLength(1)
    expect(result.after.messages[0].parts).toHaveLength(3)
    expect([...result.contents].sort((a, b) => String(a).localeCompare(String(b)))).toEqual([
      "first notification",
      "second notification",
      "third notification",
    ])
    for (const [index, text] of result.contents.entries()) {
      expect(result.after.messages[0].parts[index]).toMatchObject({ type: "text", synthetic: true })
      expect(result.after.messages[0].parts[index].text).toContain(text)
    }
    expect(result.repeated).toBe(0)
    expect(result.final).toEqual(result.after)
    if (window === "after-commit") expect(result.before).toEqual(result.after)
  }, 35_000)
}
