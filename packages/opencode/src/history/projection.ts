import { sql } from "drizzle-orm"
import { PartTable } from "../session/session.sql"

// Project in SQLite so unused media and metadata never cross the driver boundary.
export function projection(preview = false) {
  const field = (path: string) => {
    // Keep JSON escapes until the final JSON.parse: older SQLite versions
    // truncate strings at NUL when json_extract converts them to SQL text.
    const value = sql`${PartTable.data} -> ${path}`
    if (!preview) return sql`json(${value})`
    // Count decoded bytes on a disposable copy, replacing NUL with an equally
    // sized control character. The original value, including literal escape
    // sequences, is preserved in the output below.
    const size = sql`length(CAST(json_extract(replace(${value}, ${"\\u0000"}, ${"\\u0001"}), '$') AS BLOB))`
    return sql`json(CASE WHEN ${size} > 4000 THEN '"[large field omitted; use history get part_id]"' ELSE ${value} END)`
  }
  const attachments = sql`(SELECT json_group_array(json_object(
    'filename', json(value -> '$.filename'),
    'mime', json(value -> '$.mime'),
    'source', json(value -> '$.source'),
    'url', CASE WHEN lower(substr(json_extract(value, '$.url'), 1, 5)) != 'data:' THEN json(value -> '$.url') END
  )) FROM json_each(${PartTable.data}, '$.state.attachments'))`
  // Preview bounds the entire serialized metadata list below: even tiny
  // attachments form an unbounded driver payload when the list is long. Keep
  // an array-shaped notice for preview consumers; get reads original parts.
  return {
    id: PartTable.id,
    message_id: PartTable.message_id,
    session_id: PartTable.session_id,
    time_created: PartTable.time_created,
    data: sql<string>`json_object(
      'type', json_extract(${PartTable.data}, '$.type'),
      'text', ${field("$.text")},
      'filename', ${field("$.filename")},
      'mime', ${field("$.mime")},
      'url', CASE WHEN lower(substr(json_extract(${PartTable.data}, '$.url'), 1, 5)) != 'data:' THEN ${field("$.url")} END,
      'source', ${field("$.source")},
      'prompt', ${field("$.prompt")},
      'description', ${field("$.description")},
      'agent', ${field("$.agent")},
      'command', ${field("$.command")},
      'name', ${field("$.name")},
      'files', ${field("$.files")},
      'projection', json_object('summary', ${field("$.projection.summary")}, 'manifest', ${field("$.projection.manifest")}),
      'error', json_object('data', json_object('message', ${field("$.error.data.message")}, 'responseBody', ${field("$.error.data.responseBody")})),
      'snapshot', ${field("$.snapshot")},
      'checkpointDir', ${field("$.checkpointDir")},
      'checkpointNumber', ${field("$.checkpointNumber")},
      'coveredUpTo', ${field("$.coveredUpTo")},
      'reason', ${field("$.reason")},
      'cost', ${field("$.cost")},
      'tokens', ${field("$.tokens")},
      'tool', ${field("$.tool")},
      'state', json_object(
        'status', json_extract(${PartTable.data}, '$.state.status'),
        'input', ${field("$.state.input")},
        'output', ${field("$.state.output")},
        'error', ${field("$.state.error")},
        'attachments', json(${preview
          ? sql`CASE WHEN length(CAST(${attachments} AS BLOB)) > 4000
              THEN json_array(json_object('mime', '[large attachment list omitted; use history get part_id]'))
              ELSE ${attachments} END`
          : attachments})
      ))`.mapWith((value: string) => JSON.parse(value) as typeof PartTable.$inferSelect.data),
  }
}
