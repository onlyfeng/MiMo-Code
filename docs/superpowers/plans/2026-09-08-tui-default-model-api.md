# TUI default model API implementation plan

The user approved POLICY-03 after POLICY-04. Local preparation starts from
`d415822c29539a4b6eebeafb59de1b88da18b95c`; accepted POLICY-04 must be inherited
before this change is published. Overall upstream review stays at
`6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; selected behavior comes from
`0abfeba186191c1a361cf3f27b802e9d29bf0fdc` / release `v0.1.14`.

1. Keep operator authentication separate from an in-memory worker credential.
   Authentication uses the effective password; directory and non-loopback
   policy only treat an operator-provided password as explicit authorization.
2. Own the existing model API listener in the TUI worker. Concurrent start
   shares one resource; startup failures return a typed RPC result; shutdown
   rejects new starts and closes late-arriving sockets before instance cleanup.
   Preserve checkpoint draining and Question terminal-event publication.
3. Every ordinary TUI startup requests the listener. Default TUI transport
   remains RPC; explicit network transport receives Basic headers through the
   trusted host connection. Startup/config failures must still clean up the
   worker. Attach continues using the supplied remote server.
4. Verify real socket lifecycle, isolated non-test worker RPC/HTTP, and ordinary
   TUI plus attach through a POSIX PTY. Keep wiring tests distinct from actual
   startup evidence. Preserve model tokens, directory scopes, registered
   listener identity, media URLs, provider options, transcription and aborts.
5. Run focused regressions, package typecheck, lint and source-derived public
   artifact comparison. Reconcile FD-004 and adjacent FC owners, then wait for
   current-head Codex completion and all CI before main/compat publication.
