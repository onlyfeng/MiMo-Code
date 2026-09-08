# Full nested Actor and interaction implementation

The approved POLICY-01 adopts the released full Actor and question capabilities
inside exec and makes plan_exit terminate the current script and switch the TUI.
The base is accepted main `bfa3c2466d07da01881b252a0337ac444b4ae927` (POLICY-06).
Its live run-approval ownership must survive valid continuations and remain
separate from frozen model context. POLICY-06 compat publication must complete
before this policy merges. POLICY-02 recovery eligibility and task replacement
are separate work; do not broaden them here.

Sources are the selected upstream snapshot
`0abfeba186191c1a361cf3f27b802e9d29bf0fdc` and released v0.1.14
`2a0eb706e95a77cba34a319e9f11f33f26d4450c`. This is specified capability adoption,
not a full upstream sync. FD-006 owns nested authority, FC-001 Actor ownership,
FC-008 cleanup and FC-011 model guidance. FD-009 frozen recovery stays in force.

## Actor schema and lifecycle

Use the initialized Actor definition's canonical native schema for both JSON
and shell nested invocation. Capture that schema with the existing request
snapshot; hooks, model labels or a refreshed registry cannot widen it. Keep
ordinary subagent send-only/real-parent gating and the positive Actor identity
checks. Expose existing resume without changing its eligibility.

Separate spawn admission from foreground waiting for ActorTool callers while
preserving other callers' defaults. Acquire cancellation ownership before
registration, record admitted IDs through onActorID, and pass the actual
ctx.actorID as parentActorID. Foreground interruption cancels and joins the
owned child; wait interruption only stops the waiter. Preserve the existing
explicit run timeout result and discoverable actor ID. Background actors belong
to the supervisor after handoff, including when exec's VM closes.

## Question lifecycle and routing

Question registration/Asked publication and cancellation cleanup must have one
resource ownership boundary. A still-pending request publishes the existing
Rejected terminal event once when interrupted or disposed; normal reply/reject
must not double-publish. Route foreground questions to their session and
interactive peer questions to the parent. System/non-interactive actors return
the existing autonomous-decision guidance without creating an unanswerable ask.
The model registry's question availability flag remains unchanged.

## plan_exit and exec

Share a resolved Tool.Context interaction target between question and plan_exit.
Only a foreground main plan turn may switch the session. plan_exit requires an
exclusive point with no outstanding sibling calls; decline returns normally.
Approval atomically commits the build continuation, preserving task/provenance,
then records an internal host-owned receipt. Once committed, close tool intake
and terminate the guest before it can resume, including through catch/finally
or raw filesystem access. Finish admitted host calls and their cleanup.

Keep the small committed receipt in outer exec metadata outside truncatable
subparts, including when a later hook fails or the outer call is interrupted.
TUI switching consumes this receipt and retains direct plan_exit support. The
next SessionPrompt turn rebuilds build permissions; the current frozen tool pool
does not mutate. Prefer existing message/Question events over a new public API.

## Validation and propagation

Use real Effect services, actor/provider fixtures and TUI event consumers.
Demonstrate cancellation and gating regressions before fixes. Cover both
invocation styles, full action schemas, hooks/disabled/frozen negative cases,
foreground versus background cancellation, real parent notifications, question
terminal cleanup, and plan_exit approval/decline/exclusivity/guest termination.
Receipts must survive truncated subparts and post-commit failures.

Run package tests and bun typecheck with default-path ambient selectors removed;
preserve the package preload baseline. Generate SDK/OpenAPI only if the final
public contract changes. Update FD/FC and model guidance together. On compat,
preserve createMessage chronology and frozen turnContext rather than copying
whole files. Both PRs require current-head Codex Completed with all feedback
handled and exact-head CI success before merge. Verify final branch push CI,
ancestry, remote tips and protected worktrees, then proceed to POLICY-04.
