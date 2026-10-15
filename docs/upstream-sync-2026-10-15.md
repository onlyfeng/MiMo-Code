# 2026-10-15 upstream synchronization through 496bb8cb

## Scope, baseline and capability inventory (1)

Full sync against freshly fetched refs (2026-10-15): upstream `6ba6a6254a6d040bb81ec9453962a52fc46c9c6d..496bb8cbe614aecea27623457d143600cc12c275`, one commit (`f82fa60a`, "preserve instance ownership across queued wakes", 3 paths). Starting fork tips: `main=a7d242df8c0651038827ac99e434ef0e815f3885`, `dev/compat=1d066a86b589f028625eb7a6fa596a18894c0878`. Main runtime merge: `076db1db726b7d0d7eaaaae4c29ea830be73d027`, with one conflict in `packages/cli/src/inbox/inbox.ts`. The range changes no manifest, lockfile, migration or SDK/OpenAPI input.

| ID | Upstream content | Main result | dev/compat result | Relationship, owner, disposition and evidence |
| --- | --- | --- | --- | --- |
| C01 | `f82fa60a`: an inbox delivery that schedules a receiver loop holds an `Instance.claim` on the current service instance from before scheduling until the wake fiber exits, so ordinary configuration disposal cannot close the scope holding already scheduled receiver work. Claim, fork and exit-observer registration form one uninterruptible handoff; the wake starts immediately; `wake: false` and a missing loop binding take no claim. Adds `docs/compose/spec/provider-local-refresh.md` § "Inbox wake ownership during ordinary disposal" and `test/inbox/wake-instance-handoff.test.ts` (six cases). | Adapted. FC-001 routes every wake through one `Inbox.wake` (used by `send` and `wakePending`) that prepares the receiver instance and forks the loop through `EffectBridge`; the claim, that preparation, the fork and the observer now form the uninterruptible handoff there, so recovery rearms carry the claim too. Upstream spec adopted unchanged. Five test cases adopted; the before-body interruption case binds its interrupting loop through the fork's `bindPrompt` port, which the fork resolves before `sessionPromptRef`. The sixth case ("abort immediately after send cannot let a queued wake restart the receiver") is not adopted by owner decision: see FC-001's 2026-10-15 note. Two fork-side tests that raced the now-immediate wake were made deterministic (`test/actor/cancel-notification.test.ts` reads the envelope at `InboxArrived` with the existing `captureParentInbox`; `test/inbox/empty-notification-part.test.ts` sends with `wake: false` because only drain is under test). | Inherited through the main merge. | FC-001 (inbox/actor runtime). Known gap recorded in FC-001: a cancel issued after `send` returns but before the bridged loop reaches Runner admission does not prevent that wake from running. Reproduced on the pre-merge main `a7d242df` without any pending disposal (two model requests), so it predates this range; upstream closes it by synchronous admission, which the fork's asynchronous bridge and `InstanceState` lookup do not provide. |

Inventory count: 1 capability and 1 result row.

## Validation

Default-path runs unset the ambient `MIMOCODE_EXPERIMENTAL` and `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL` (and `MIMOCODE_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE`, absent); the package preload is unchanged. `bun ci` installs from `bun.lock`. On the merged main tree:

- Package `bun run typecheck` exits 0; root lint exits 0 with 3536 warnings and no errors.
- `test/inbox/` 77/77 in one process, twice. `test/inbox/wake-instance-handoff.test.ts` 5/5.
- `test/actor/` 272 pass, 8 fail. The eight are the `test/actor/subagent-resume-negatives.test.ts` cascade cases, which fail identically with the pre-merge `inbox.ts` on this host; exact-tip CI is their gate.
- Inbox-touching session/server files (`server/session-recovery-task`, `session/codex-compact`, `message-v2`, `prompt-effect`, `snapshot-tool-race`, `text-loop-integration`, `title-input`): 274 pass, 2 skip, 0 fail.
- Baseline comparisons: with the pre-merge `inbox.ts`, upstream's wake test fails its two pending-disposal cases (no claim) and passes the abort case only because disposal tears the wake down; `test/inbox/` without the new file passes 72/72 on both the pre-merge and merged sources.

## Publication gates

Completion requires successful lint, typecheck and test CI on the exact final branch-tip SHAs, both remote tips equal to the published commits, and ancestry from `496bb8cb` through fork `main` to `dev/compat`. These are checked after publication.
