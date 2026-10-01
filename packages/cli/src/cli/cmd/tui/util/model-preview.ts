import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js"

type Selection = { providerID: string; modelID: string; variant?: string }
type Input = { agent?: string; model: Omit<Selection, "variant">; variant?: string; workspace?: string }
type Preview = { status: "ready"; selection: Selection } | { status: "pending" | "unavailable"; selection?: never }

export function createModelPreview(
  source: Accessor<Input | undefined>,
  resolve: (input: Input, signal: AbortSignal) => Promise<Selection>,
  refresh?: Accessor<unknown>,
) {
  const [preview, setPreview] = createSignal<Preview>({ status: "pending" })
  createEffect(() => {
    refresh?.()
    const input = source()
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    setPreview({ status: input ? "pending" : "unavailable" })
    if (!input) return
    void resolve(input, controller.signal).then(
      (selection) => {
        if (!controller.signal.aborted) setPreview({ status: "ready", selection })
      },
      () => {
        if (!controller.signal.aborted) setPreview({ status: "unavailable" })
      },
    )
  })
  return preview
}
