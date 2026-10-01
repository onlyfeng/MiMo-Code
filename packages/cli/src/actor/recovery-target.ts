import { Effect } from "effect"
import { InstanceState } from "@/effect"
import { Session } from "@/session"
import { SessionID } from "@/session/schema"
import { NotFoundError } from "@/storage"
import { ActorRegistry } from "./registry"

export * as ActorRecoveryTarget from "./recovery-target"

// Resolve only the authenticated session's registered actors or its canonical
// peer child. Live context and lifecycle eligibility remain Actor.resume's job.
export const resolve = Effect.fn("ActorRecoveryTarget.resolve")(function* (input: {
  sessionID: SessionID
  actorID: string
}) {
  const sessions = yield* Session.Service
  const addressed = yield* sessions.get(input.sessionID)
  if (addressed.directory !== (yield* InstanceState.context).directory || input.actorID === "main")
    return yield* Effect.fail(new NotFoundError({ message: "Actor recovery target is unavailable" }))
  const registry = yield* ActorRegistry.Service
  const local = yield* registry.get(input.sessionID, input.actorID)
  if (local) {
    if (local.mode === "main")
      return yield* Effect.fail(new NotFoundError({ message: "Actor recovery target is unavailable" }))
    return { sessionID: local.sessionID, actorID: local.actorID }
  }
  const peer = yield* registry.get(SessionID.make(input.actorID), input.actorID)
  if (!peer || peer.mode !== "peer" || (yield* sessions.get(peer.sessionID)).parentID !== addressed.id)
    return yield* Effect.fail(new NotFoundError({ message: "Actor recovery target is unavailable" }))
  return { sessionID: peer.sessionID, actorID: peer.actorID }
})
