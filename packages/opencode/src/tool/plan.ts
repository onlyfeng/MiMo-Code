import z from "zod"
import path from "path"
import { Effect } from "effect"
import * as Tool from "./tool"
import { Question } from "../question"
import { Session } from "../session"
import { MessageV2 } from "../session/message-v2"
import { Instance } from "../project/instance"
import { MessageID, PartID } from "../session/schema"
import EXIT_DESCRIPTION from "./plan-exit.txt"

export const PlanExitTool = Tool.define(
  "plan_exit",
  Effect.gen(function* () {
    const session = yield* Session.Service
    const question = yield* Question.Service

    return {
      control: Tool.PlanExitControl,
      description: EXIT_DESCRIPTION,
      parameters: z.object({}),
      execute: (_params: {}, ctx: Tool.Context) =>
        Effect.gen(function* () {
          if (ctx.agent !== "plan") {
            return {
              title: "Not in plan mode",
              output: "You are not in plan mode. This tool is only effective in plan mode.",
              metadata: { switched: false, feedback: "" },
            }
          }

          const info = yield* session.get(ctx.sessionID)
          if (
            !ctx.interaction?.planExit ||
            ctx.interaction.sessionID !== ctx.sessionID ||
            (ctx.actorID ?? "main") !== "main" ||
            info.parentID ||
            (yield* question.neverAsk())
          ) {
            return {
              title: "Plan approval unavailable",
              output: "Switching to build requires approval in the foreground plan session. Stay in plan mode until the user can approve the plan.",
              metadata: { switched: false, feedback: "" },
            }
          }
          const assistant = MessageV2.get({ sessionID: ctx.sessionID, messageID: ctx.messageID }).info
          if (assistant.role !== "assistant" || (assistant.agentID ?? "main") !== "main") {
            throw new Error("Plan approval requires the current foreground assistant message")
          }
          const user = MessageV2.get({ sessionID: ctx.sessionID, messageID: assistant.parentID }).info
          if (user.role !== "user" || (user.agentID ?? "main") !== "main") {
            throw new Error("Plan approval requires the current foreground user turn")
          }
          const plan = path.relative(Instance.worktree, Session.plan(info))
          const answers = yield* question.ask({
            sessionID: ctx.sessionID,
            questions: [
              {
                key: "plan_exit",
                params: { plan },
                question: `Plan at ${plan} is complete. Would you like to switch to the build agent and start implementing?`,
                header: "Plan",
                options: [
                  { label: "Yes", description: "Switch to build agent and start implementing the plan" },
                  { label: "No", description: "Stay with plan agent to continue refining the plan" },
                ],
              },
            ],
            tool: ctx.callID ? { messageID: ctx.messageID, callID: ctx.callID } : undefined,
          }, ctx.abort)

          const answer = answers[0]?.[0]
          if (answer === "No") {
            return {
              title: "Staying in plan mode",
              output:
                "User chose to stay in plan mode and continue refining the plan. Plan mode is still active — do NOT start implementing. Use the question tool to ask the user which aspects of the plan they want to refine or change, then update the plan file accordingly and call plan_exit again when ready.",
              metadata: { switched: false, feedback: "" },
            }
          }

          if (answer !== "Yes") {
            return {
              title: "User provided feedback",
              output: `User chose not to switch yet and provided feedback: ${answer}\n\nPlan mode is still active — do NOT start implementing. Address the feedback by refining the plan file, then call plan_exit again when the plan is ready.`,
              metadata: { switched: false, feedback: answer },
            }
          }

          const msg: MessageV2.User = {
            id: MessageID.ascending(),
            sessionID: ctx.sessionID,
            role: "user",
            time: { created: Date.now() },
            agent: "build",
            model: user.model,
            task_id: ctx.taskId ?? user.task_id,
            tools: user.tools,
            format: user.format,
            system: user.system,
            systemMode: user.systemMode,
            harness: user.harness,
            provenance: user.provenance,
            source: "hook",
          }
          // Commit the complete continuation and its host receipt together. An
          // interrupt may leave neither or both, never a half-written user turn.
          const committed = yield* Effect.gen(function* () {
            if (ctx.abort.aborted) return yield* Effect.interrupt
            const committed = yield* session.commitUserMessageIfLatest({
              expectedUserID: user.id,
              message: msg,
              parts: [{
                id: PartID.ascending(),
                messageID: msg.id,
                sessionID: ctx.sessionID,
                type: "text",
                text: `The plan at ${plan} has been approved, you can now edit files. Execute the plan`,
                synthetic: true,
              } satisfies MessageV2.TextPart],
            })
            if (committed && ctx.planExitCommitted) yield* ctx.planExitCommitted(msg.id)
            if (committed && !ctx.planExitCommitted && ctx.callID) {
              yield* ctx.metadata({ metadata: {
                switched: true,
                feedback: "",
                plan_exit: { version: 1, sessionID: ctx.sessionID, callID: ctx.callID, messageID: msg.id, agent: "build" },
              } })
            }
            return committed
          }).pipe(Effect.uninterruptible)
          if (!committed) {
            return {
              title: "Plan approval superseded",
              output: "A newer user turn arrived while plan approval was pending. Follow that turn; this approval did not switch agents.",
              metadata: { switched: false, feedback: "" },
            }
          }

          return {
            title: "Switching to build agent",
            output: "User approved switching to build agent. Wait for further instructions.",
            metadata: { switched: true, feedback: "" },
          }
        }).pipe(Effect.orDie),
    }
  }),
)
