# Frozen skill catalog layout (historical)

> **Superseded on 2026-11-21.** Upstream `128adcb7` moved the catalog to
> persisted user-turn reminders (one entry per context window, then
> fingerprinted deltas) and made discovery a live rescan. The system prompt no
> longer carries a catalog and new prefixes record no schema-3 catalog. This
> page describes the layout older sessions were written with, so they can still
> be read. The current contract is FC-005 in
> [fork-capabilities.md](fork-capabilities.md); the change is recorded in
> [the 2026-11-21 synchronization](upstream-sync-2026-11-21.md).
>
> What still applies to stored data:
>
> - The shipped `20260908000000_session_prefix_skill_catalog` migration is
>   unchanged. The nullable `skill_catalog` column is read only.
> - On the first read of a frozen prefix, `SessionPrefixSnapshot.getFrozen`
>   removes the catalog once. A schema-3 row whose content version verifies has
>   exactly its recorded managed range removed, including the format prefix
>   (the structured-output instruction a JSON-mode turn pinned there, which the
>   request now appends only in JSON mode), and the record is cleared. A row
>   without a usable record
>   falls back to the generated block pattern, keeping any copies the
>   host-supplied system contains. A schema-3 position that is ambiguous or
>   stale also uses that strict block-pattern fallback.
> - In history, generated v2 snapshots and recognized metadata-free legacy
>   catalogs are dropped from model input. Stored messages are never rewritten.
>   User quotations, loaded `<skill_content>` bodies and tagged reminders still
>   reach the model.
>
> The rest of this page is the original description, kept for reference.

The model receives the authorized skill catalog in the system tail, after the
environment and structured-output blocks and before instruction files. Loading
a skill still places its full instructions in the existing message or tool
result. Catalog placement does not grant permission to load or invoke a skill;
effective permissions, agent allowlists, user tool toggles and model-invocation
filters continue to apply.

Within one authorized prefix profile, the catalog is selected for a user turn.
Tool continuations, repeated requests, recovery and synthetic continuations
reuse that selection. A later direct user turn may refresh it from the current
skill directory. Removing skills or disabling access can therefore produce an
explicitly empty catalog on that later turn. A new permission/model/agent
profile has its own prefix; freezing does not authorize reuse across profiles.

The internal nullable `session_prefix_snapshot.skill_catalog` column stores
schema 3, canonical text, a SHA-256 content version and the originating user
turn ID. It is stored with the frozen system, independent of the stable profile
key and tool-schema hash. Updating the message watermark does not update that
turn ID. Tool-schema rotation retains the already selected catalog. This is
internal database metadata, not an added public HTTP or SDK field.

A refreshed directory replaces only its verified position inside the frozen
system. Environment text, instruction files and plugin system transformations retain
their original bytes, including when tool schemas rotate. The caller-owned
structured-output instruction has its own recorded prefix inside the managed
range: JSON-to-text transitions update it without refreshing other instructions
or changing the directory content version. A legacy structured tool snapshot
and a verified adjacent or unique instruction position identify its old range. An optional internal position is persisted with the catalog; temporary
construction markers are removed before either persistence or model dispatch.

Older schema-3 rows without a position can infer it from one exact occurrence of
the saved catalog. A legacy or empty catalog can append its first nonempty text
to the frozen system. Clearing a standalone catalog removes that entry rather
than sending an empty system message. If an old catalog occurs more than once,
or its saved position no longer matches, the original system/catalog pair is
retained and the reason logged; that turn may keep the old directory rather
than guess which instruction text to replace. Loaded skill bodies are unaffected.

An older row with SQL NULL represents the legacy system/history layout. When
an interrupted old turn resumes, its system and generated catalog messages
remain a pair. A new direct user turn migrates to system-tail layout. Model
projection then omits only known generated catalog parts: historical wrapper,
synthetic status and, for v2, matching version metadata must agree. Stored
messages are not rewritten or deleted. A valid v2 catalog description may itself
mention `<skill_content>`; its schema/hash is verified before the loaded-content
substring safeguard used for metadata-free legacy candidates. Loaded `<skill_content>` bodies and
ordinary user quotations of catalog markers remain visible.

Cold prefix capture constructs and pins a complete pair. Warm capture uses the
existing frozen layout. Checkpoint writers and full-context Actors inherit the
captured system/history pair and frozen native tool contracts; they do not gain
live catalog or tool authority through migration. Compaction reads the same
profile and layout, reuses its catalog despite later disk changes, and retains
`toolChoice: "none"`. The compaction trigger remains
`floor(effective window * ratio)`, with the existing default ratio of 90%.

This is POLICY-04 alone, selected from release
`2a0eb706e95a77cba34a319e9f11f33f26d4450c` and upstream snapshot
`0abfeba186191c1a361cf3f27b802e9d29bf0fdc`. The overall upstream review baseline
remains `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`. Runtime/test reference:
`0b665c7e681e44cac6f1a6acf18732015fb2bf86`. This description records the local implementation;
publication, exact-head CI and compat propagation require their own evidence.
Instruction enablement and the other selected policies are unchanged.
