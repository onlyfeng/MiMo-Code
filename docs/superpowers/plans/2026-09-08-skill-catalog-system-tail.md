# Frozen skill catalog system tail

POLICY-04 moves the authorized skill catalog from generated user reminder parts
to the frozen system tail, after environment/format and before instruction files.
Loaded skill bodies remain in their existing messages and tool results. This
local branch starts from reviewed POLICY-01 head eb4ab66; formal publication
must inherit accepted main and follow POLICY-01 propagation.

Keep the stable prefix profile key. Add nullable internal catalog metadata with
layout schema 3, canonical text, content version and originating user ID. SQL
NULL represents an existing legacy system/messages pair, not an empty catalog.
Pin and rotate save the complete pair; advancing the message watermark never
changes the catalog's turn identity. Tool schema rotation retains the selected
catalog. A later direct user may refresh it, including to an explicitly empty
catalog; retries, recovery and synthetic continuations reuse it.

Warm capture and compaction consume the stored layout with the frozen system.
Cold capture constructs a complete system/messages pair. Existing full-context
Actors retain their copied pair and never acquire live catalog or native-tool
authority during migration. A normal legacy session migrates on a new direct
turn; continuing the interrupted legacy turn preserves its complete old pair.
Only the new layout suppresses strictly recognized generated catalog parts in
model projection. Historical rows remain unchanged; loaded content and user
quotations of the old markers are preserved.

Validate real old-database migration and reopen, old HTTP recovery and a later
direct turn, same-turn provider/tool continuation, cold capture, compaction's
third profile consumer, and frozen native Actor authority. Use package tests
with six ambient selectors cleared and the package preload retained. Update
the owning FD/FC records and later adapt compat's active-tool membership,
loaded MCP hashing, turnContext and request accounting without replacing files.
Every published head requires completed Codex review, resolved feedback and
successful exact-head CI before merge.
