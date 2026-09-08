# Yolo and run approval

Startup yolo includes deletion approval. Explicit permission denies still win.
The mechanism differs between a TUI that starts its own instance and a CLI run
that may be attached to an already shared server.

| Entry or control | Behavior |
| --- | --- |
| TUI `--yolo` / `--dangerously-skip-permissions` | Initializes deletion auto-approval for that instance; ordinary tools use the existing allow-all base underneath configured rules |
| `mimo run --yolo` | Answers each permission request belonging to the active invocation with `once`, including deletion |
| `mimo run --attach <url> --yolo` | Uses the same invocation correlation on the attached server; does not enable a shared delete switch |
| Non-yolo `mimo run` | Rejects its own correlated asks; does not answer unrelated requests |
| Runtime `/skip-permissions` | Remains independent of deletion approval; it does not itself grant forced deletion asks |
| `MIMOCODE_AUTO_APPROVE_DELETE` or the explicit instance delete control | Remains an independent deletion control, still subject to explicit denies |

An explicit ordinary `ask` can still prompt under TUI startup because it
overrides the injected ordinary allow rule. Startup's separate deletion grant
is evaluated after deny checks; an ordinary catch-all `ask` does not turn that
deletion grant off. A CLI yolo invocation instead replies once to its own asks.
Neither path removes configured denies.

Automatic CLI rejections use `scope: "request"`, so rejecting this invocation's
ask does not cancel another pending ask in the same session. Omitting that
optional reply field preserves the existing session-wide human rejection.

## Deletion authorization

For a command requiring deletion approval, Bash checks explicit denies for
its ordinary Bash patterns and external-directory effects before requesting
`bash_delete`. The Permission service then checks deletion denies before any
automatic grant. A command receives one deletion confirmation rather than
duplicated Bash, external-directory, and deletion prompts for the same action.

The existing temporary-only exemption remains separate: every target must be
provably temporary, and overlapping the active project/worktree excludes that
exemption. Its ordinary Bash and external-directory authorization still runs.
This change does not broaden protected-root or temporary-target classification.

## Invocation identity and ownership

Each CLI invocation creates a fresh UUID and sends it with its prompt or command.
The server installs a live scope inside the work that actually wins runner
admission. `Permission.ask` takes correlation from that live execution context,
not from an arbitrary `runID` supplied by a tool. A waiting caller that joins an
existing runner cannot relabel the runner's requests.

The UUID is an event correlation field, **not a credential or permission grant**.
It never replaces permission evaluation. The scope and its authority are kept
in memory; messages, actor records, and continuation history do not persist a
reusable approval. SDK/OpenAPI expose an optional `runID` on prompt/command
inputs and permission events so the CLI can associate the two ends.

The initial user and successfully committed atomic continuations belong to the
active scope. An unrelated user queued into the same session does not. When the
runner selects that user, it closes the old scope even if it is still executing
in the same fiber. A CLI cannot use session identity alone to approve the new
user's work.

Current interactive child work receives the same live scope object through its
execution bridge. Closing the parent scope invalidates old captured bridges
and cancels pending permission asks, including asks already waiting in children.
It does not turn those children into owners of a later invocation. Persistent
inbox wakes, recovered actor generations, and other background work retain their
existing independent permission routing. Correlation does not make system or
non-interactive work interactive and does not auto-approve it.

## Completion, cancellation, and independent producers

The CLI stops replying when its request finishes, fails, disconnects, or is
cancelled, even if output is still draining. Its replies use the approval
cancellation signal. The server closes the corresponding scope on runner
completion or request cancellation; scope closure also retires outstanding
asks. No shared Boolean needs to be restored, and no subsequent run inherits
the previous run's approval.

MCP server-initiated sampling is an independent producer. A long-lived MCP
connection may have been initialized during an earlier CLI run, and its last
session is not proof of current invocation ownership. The sampling entry clears
any captured run scope before entering its own approval flow. It keeps its own
signal, permission checks, and human approval; cancelling an unrelated old run
does not approve or cancel that sampling request. Ordinary MCP tool execution
still uses its actual current invocation context.

## Scope of this change

This policy adopts startup yolo's deletion behavior while retaining live
invocation isolation for local and attached CLI runs. It does not change
ordinary non-interactive/background routing, model selection, model API
listener defaults, media handling, compaction, or other pending policy choices.
FD-001 owns the shared-state residual, FC-001 owns runner and atomic-continuation
lifetimes, and FC-007 owns Bash/path deletion checks.

Focused coverage is in `test/cli/run-approval.test.ts`,
`test/session/run-approval.test.ts`, `test/session/prompt-effect.test.ts`,
`test/permission/auto-approve-delete.test.ts`,
`test/tool/bash-delete-permission.test.ts`, and
`test/mcp/sampling-e2e.test.ts` under `packages/opencode`. Publication records
the final source SHA and verification evidence separately.
