import { Effect } from "effect"
import { prefixCaptureRef, type PrefixCaptureFn } from "../../src/session/prefix-capture-ref"

// Checkpoint writers require a captured request prefix before spawning. Tests
// focused on writer lifecycle install this minimal capture so they exercise the
// real fork-context gate without depending on SessionPrompt's provider wiring.
export const bindCheckpointPrefixCapture = Effect.gen(function* () {
  const previous = prefixCaptureRef.current
  const capture: PrefixCaptureFn = () =>
    Effect.succeed({
      system: [],
      tools: {},
      inheritedMessages: [{ role: "user", content: "checkpoint fixture" }],
      parentPermission: [],
    })
  prefixCaptureRef.current = capture
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      if (prefixCaptureRef.current === capture) prefixCaptureRef.current = previous
    }),
  )
})
