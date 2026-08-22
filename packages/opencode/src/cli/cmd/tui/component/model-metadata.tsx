import type { RGBA } from "@opentui/core"

export function ModelMetadata(props: {
  metadata: { alias: string; detail: string }
  aliasColor: RGBA
  detailColor: RGBA
}) {
  return (
    <text flexShrink={1} overflow="hidden" wrapMode="none" fg={props.detailColor}>
      · <span style={{ fg: props.aliasColor }}>{props.metadata.alias}</span> · {props.metadata.detail}
    </text>
  )
}
