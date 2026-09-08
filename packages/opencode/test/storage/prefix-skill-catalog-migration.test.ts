import { expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { tmpdir } from "../fixture/fixture"

test("runtime migration upgrades a real legacy prefix database without replacing its native schemas", async () => {
  await using tmp = await tmpdir()
  const file = path.join(tmp.path, "legacy.db")
  const dir = path.resolve(import.meta.dirname, "../../migration")
  // Use the actual historical SQL and the runtime UTC journal timestamps.
  // A current table definition with a field deleted is not an old database.
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name < "20260908000000")
    .map((entry) => {
      const tag = entry.name.slice(0, 14)
      return {
        name: entry.name,
        sql: readFileSync(path.join(dir, entry.name, "migration.sql"), "utf8"),
        timestamp: Date.UTC(
          +tag.slice(0, 4),
          +tag.slice(4, 6) - 1,
          +tag.slice(6, 8),
          +tag.slice(8, 10),
          +tag.slice(10, 12),
          +tag.slice(12, 14),
        ),
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)
  const old = new Database(file, { create: true })
  const tools = JSON.stringify([
    {
      name: "actor",
      active: true,
      input_schema: { type: "object", properties: { script: { type: "string" } } },
      native_input_schema: { type: "object", properties: { action: { enum: ["spawn", "resume"] } } },
    },
  ])
  const before = (() => {
    try {
      old.run("PRAGMA foreign_keys = ON")
      migrate(drizzle({ client: old }), entries)
      expect(
        old
          .query<{ name: string }, []>("PRAGMA table_info(session_prefix_snapshot)")
          .all()
          .map((x) => x.name),
      ).not.toContain("skill_catalog")
      old.run("INSERT INTO project (id, worktree, time_created, time_updated, sandboxes) VALUES (?, ?, ?, ?, ?)", [
        "project_old",
        tmp.path,
        1,
        2,
        "[]",
      ])
      old.run(
        "INSERT INTO session (id, project_id, slug, directory, title, version, time_created, time_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ["session_old", "project_old", "old", tmp.path, "Legacy", "0.1.14", 1, 2],
      )
      old.run(
        "INSERT INTO session_prefix_snapshot (session_id, profile_key, system, system_hash, tools_hash, tools, loaded_mcp_tools, watermark_message_id, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          "session_old",
          "profile_old",
          '["legacy system"]',
          "system-old",
          "tools-old",
          tools,
          '["mcp_old"]',
          "message_old",
          7,
          11,
          12,
        ],
      )
      return old.query<Record<string, string | number | null>, []>("SELECT * FROM session_prefix_snapshot").get()
    } finally {
      old.close()
    }
  })()
  const script = `
    const { Client, close } = await import(${JSON.stringify(new URL("../../src/storage/db.ts", import.meta.url).href)});
    const db = Client();
    console.log(JSON.stringify({
      row: db.$client.query("SELECT * FROM session_prefix_snapshot").get(),
      columns: db.$client.query("PRAGMA table_info(session_prefix_snapshot)").all(),
      journal: db.$client.query("SELECT * FROM __drizzle_migrations ORDER BY created_at").all(),
    }));
    close();
  `
  const upgrade = async () => {
    const child = Bun.spawn([process.execPath, "--eval", script], {
      cwd: path.resolve(import.meta.dirname, "../.."),
      env: { ...process.env, MIMOCODE_DB: file, MIMOCODE_SKIP_MIGRATIONS: undefined },
      stdout: "pipe",
      stderr: "pipe",
    })
    const timer = setTimeout(() => child.kill("SIGKILL"), 20_000)
    try {
      const [exit, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect({ exit, stderr }).toEqual({ exit: 0, stderr: "" })
      return JSON.parse(stdout)
    } finally {
      clearTimeout(timer)
    }
  }
  const migrated = await upgrade()
  expect(migrated.columns).toContainEqual(
    expect.objectContaining({ name: "skill_catalog", type: "TEXT", notnull: 0, dflt_value: null }),
  )
  expect(migrated.row).toEqual({ ...before, skill_catalog: null })
  expect(migrated.journal).toHaveLength(entries.length + 1)
  expect(await upgrade()).toEqual(migrated)
}, 60_000)
