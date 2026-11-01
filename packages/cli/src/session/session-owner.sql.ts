import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { SessionTable } from "./session.sql"
import type { SessionID } from "./schema"

/** The process that runs a session; valid only while that process holds its liveness lock. */
export const SessionOwnerTable = sqliteTable(
  "session_owner",
  {
    session_id: text()
      .$type<SessionID>()
      .primaryKey()
      .references(() => SessionTable.id, { onDelete: "cascade" }),
    instance_id: text().notNull(),
    pid: integer().notNull(),
    time_claimed: integer().notNull(),
  },
  (t) => [index("session_owner_instance_idx").on(t.instance_id)],
)
