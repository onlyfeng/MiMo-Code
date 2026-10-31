# Session process ownership — design

## Problem

Several MiMo processes (one per TUI window, plus `serve`, `run` and others) share
one `mimocode.db`. Before this change a session had no process owner: any process
that accepted input for a session could start it. A cross-session `actor send`
therefore ran the receiver's turn inside the sender's process, which caused three
problems:

- the receiver's own window showed nothing;
- the receiver's process and the sender's process could both drive the session,
  interleaving turns in one history;
- both processes wrote that history at once, which raised SQLite lock contention.

Execution ownership was checked by directory and workspace only. Run state, the
event bus and the TUI live in each process's memory, so nothing in the database
told one process that another was running a session.

The actor abandon sweep had the same blind spot. It settled any other process's
actor that had been quiet for longer than the abandon threshold, even while that
process was alive and its tool call was still running.

## Goals

- A session is driven by at most one live process at a time.
- A message sent to another session runs in the process that has that session
  open, as if it had been typed into that window: it is visible there, queues
  behind a running turn, and uses that session's model and variant.
- When no process has the receiver open, the message waits durably and the sender
  is told, so it can ask the user to open the session.
- A crashed or killed process never blocks a session. A paused, sleeping or busy
  process never loses one.

## Non-goals

- Opening a window automatically for a receiver nobody has open. This is a
  follow-up behind an explicit setting. Today the sender gets a "not open" result
  with the command to run.
- Taking a session over from a live process. The other window has to be closed
  first.
- Protecting processes that still run a binary from before this change. Old
  binaries ignore ownership, so every window has to be restarted.

## Design

### Process liveness

Each process holds an exclusive SQLite lock on its own file,
`<data dir>/instances/<instance id>.lock`. It opens the file with
`locking_mode=EXCLUSIVE` and makes one write, and the connection keeps the lock
until it closes. The operating system releases the lock when the process exits
for any reason. To ask whether another instance is alive, a process tries
`BEGIN EXCLUSIVE` on that instance's file with no busy timeout:

- `SQLITE_BUSY` means the process is alive;
- success means it is gone, and the prober deletes the file. Instance ids are
  random per process and never reused, so deleting the file is safe.

There is no heartbeat and no expiry. The same primitive works under Bun
(`bun:sqlite`) and Node (`node:sqlite`) through the existing `#db` import. The
connection must stay strongly referenced, because Bun closes an unreachable
database when it is garbage-collected, and closing it would drop the lock.

A starting process creates and locks its file while holding the directory's
coordination lock (`coordination.db`, taken with `BEGIN EXCLUSIVE`). A prober
that finds a file free looks again under the same lock before it deletes the
file. Without this, a prober could see a starting process's file in the instant
between its creation and its lock, delete it, and leave that process holding a
lock on a file nobody can find.

A process takes its lock before it writes its instance id anywhere other
processes read: on its first session claim, and when the actor registry layer is
built. A prober never sees a referenced but not-yet-locked id.

### Session ownership

The `session_owner` table records `session_id`, `instance_id`, `pid` and
`time_claimed`. A row counts only while its instance is alive.

- **Status.** Viewed from one process, a session is `self`, `other(pid)` or
  `unowned`. Reading status never writes.
- **Claim.** Claiming adopts the session unless another live process owns it.
  It uses a compare-and-set against the row it read, so two adopters cannot both
  win. Ownership lasts until the owner process exits; there is no release.
- **Gates.** These claim with adoption:
  - every run entry in `SessionRunState`, through `claimExecution`, which checks
    instance ownership first;
  - `preparePrompt`, before it writes anything.

  When another live process owns the session, they fail with
  `OwnedElsewhereError`. The error names that process's pid and tells the user to
  continue there.
- **Opening a window.** A TUI started with `-s <session>` (without `--fork`)
  claims that session through the worker's `claimSession` RPC. Queued input then
  starts without waiting for a keystroke.

### Delivery

`Inbox` still accepts every message durably. Only the kick that starts a lane
depends on ownership:

- If this process owns the receiver, or may adopt it and nobody else owns it,
  the lane starts here as before.
- If ownership stops it, because another live process owns the receiver or the
  input may not adopt an unowned one, the process writes an `inbox_wake` row for
  the lane and stops.
- A process without a lane scheduler still leaves adoptable input for the
  session's next run, as before.

`AcceptInput.adoptReceiver` defaults to true, which keeps every internal flow
unchanged. Examples are notifications from child actors to their parent, prompts
and workflow messages. A cross-session `actor send` passes false, so the sender's
process never adopts a session that nobody has open.

Each process's inbox controller polls about once a second (1–1.5 s, jittered) for
wakes on sessions it owns. It kicks each lane inside the session's own instance
and clears the wake only after that run settles, unless another process rang it
again in the meantime. If the owner exits mid-run, the wake survives for the next
owner. Before the first woken lane of a session this process has not run yet,
it runs that session's `reconcileOnBoot`. Otherwise a later first prompt would
reconcile then and cancel the woken run's claimed receipts as crashed work. Only
the process's current controller takes wakes, matching the current lane
scheduler. Each wake also releases the owner's `observeInput` waiters, so input
from another process reaches an actor wait or a retry backoff the way local
input does.

Events reach a TUI only from its own process, and the default configuration
records none in the database. The accepting process writes the input message, so
only that process's bus announces it. When the owner takes a wake, it reads the
accepted input messages for that lane and announces each one once with
`SyncEvent.announce`, which publishes bus events without projecting anything. The
receiving window then shows the delivered message before the reply. The woken
lane runs with the controller's own context, so its Effect logs go to the log
file. A bare runtime would print them over the TUI. The query joins two small tables and is usually empty.

The `actor send` result for another session says where the message will run:

- `this_process`;
- `queued_for_owner` with `owner_pid`;
- `receiver_not_open`, with a hint that names `mimo -s <session>`.

### Abandon sweep

`sweepAbandonedZombies` still settles a quiet actor once it passes the abandon
threshold. It now skips actors whose instance is alive, whatever their age. The
registry uses the liveness instance id as its process id.

## Alternatives considered

- **Database lease with heartbeat and expiry.** Rejected.
  - A process that is paused, asleep or overloaded for longer than the expiry is
    taken over while it is still running. That recreates two drivers.
  - Heartbeats write to the shared database continuously.
  - Without a heartbeat, an idle owner loses its lease and stops picking up input.
- **One shared daemon that runs every session, with windows as clients.**
  Rejected for now. All sessions would share one process's fate and CPU, and
  upgrading one window would restart every session.
- **Notifying the owner directly over a per-process socket.** Deferred. It saves
  about a second of latency on turns that take minutes, but needs an endpoint
  registry and authentication. The durable inbox plus a cheap wake poll keeps one
  source of truth.

## Remaining limits

- **Windows on old binaries are unprotected.** A window that still runs a binary
  from before this change neither claims sessions nor honours claims.
- **Switching sessions inside a window does not claim.** A session opened that way
  becomes owned on its first turn. Until then, messages to it wait.
- **Wakes need a new-binary sender.** Input accepted by an old binary leaves no
  wake. It starts at the owner's next turn, when `reconcileOnBoot` kicks surviving
  accepted input.
