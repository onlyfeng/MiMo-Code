/** @jsxImportSource @opentui/solid */
import type { RGBA } from "@opentui/core"
import type { JSX } from "@opentui/solid"
import { createMemo, Show } from "solid-js"
import stripAnsi from "strip-ansi"
import * as Collapse from "../../util/collapse"

const EXEC_OUTER_OUTPUT_MAX_ROWS = 10

export function ExecExpandedBody(props: {
  code?: string
  output?: string
  columns: number
  failed: boolean
  colors: { muted: RGBA; text: RGBA; error: RGBA }
  children?: JSX.Element
}) {
  const output = createMemo(() =>
    Collapse.clip(stripAnsi(props.output?.trim() ?? ""), props.columns, EXEC_OUTER_OUTPUT_MAX_ROWS),
  )
  return (
    <box gap={1}>
      <text fg={props.colors.muted}>{props.code?.trim() ?? ""}</text>
      {props.children}
      <Show when={output()}>
        <text fg={props.failed ? props.colors.error : props.colors.text}>{output()}</text>
      </Show>
      <text fg={props.colors.muted}>Click to collapse</text>
    </box>
  )
}
