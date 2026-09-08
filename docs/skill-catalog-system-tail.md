# Frozen skill catalog layout

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
