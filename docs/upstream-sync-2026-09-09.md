# Upstream synchronization — 2026-09-09

- Upstream audit range: `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85..1c13f05105b7c671a3e201b61410ccbfa8acf96e` (17 commits, 8 first-parent commits, 43 paths).
- Selected fork main: `9d26949e36c178d723a60b5664f7b31162ad64d8`.
- Selected compat: `8e4da1a2ebd6e5a8f019da52098707429c08aa8d`; already contains selected main.
- Resolved main runtime/test/content snapshot: `f3200d2ab9baa4ea2788b33b11d9236e18b29b71`.
- Scope: full synchronization. Upstream is read-only; publication targets only `onlyfeng/MiMo-Code`.
- Main source resolution: 22 changed paths, 743 insertions and 111 deletions plus two image assets.
- This record establishes the main resolution and compat owner mapping. Compat publication and its final validation are recorded in the compat ledger.

## Capability inventory (6)

All rows use the immutable range above. Canonical owner is shared main; compat inherits the same implementation at the listed paths. Existing compat-only overlays retain their DC owners.

| ID | Selected behavior / evidence | Owner IDs | Relationship and drift | Main disposition | Compat counterpart / required disposition |
| --- | --- | --- | --- | --- | --- |
| SYNC-01 | Tool-name case flag; `src/flag/flag.ts; src/util/tool-compat.ts; test/util/tool-compat.test.ts` | FD-005, FD-006, FC-004 | complementary; runtime/tests | adopt default leniency and strict opt-out; retain frozen tool authority | Same shared paths; retain DC overlays and validate inherited behavior |
| SYNC-02 | Image MIME sniffing and BMP transcode; `src/provider/image.ts; src/provider/transform.ts; test/provider/{image,transform}.test.ts; test/tool/read.test.ts; test/session/{message-v2,prompt,system}.test.ts` | FD-004, FD-006, FC-007, FC-009; DC-CONTEXT-001 | complementary; runtime/tests | adopt image exit transform; retain model API DNS/resource admission and compat caps | Same shared paths; retain DC overlays and validate inherited behavior |
| SYNC-03 | Chat-only server and audio removal; `src/{llm-server,audio,provider,config}; SDK/OpenAPI; bundled mimocode-docs` | FD-004, FC-011; DC-MODEL-001, DC-CONTEXT-001 | conflicting; runtime/contract/test/docs | retain bounded fork audio and capability/token contracts; keep unsupported voice design/clone absent; do not restore deleted legacy routes/docs/fixtures | Same shared paths; retain DC overlays and validate inherited behavior |
| SYNC-04 | Missing provider/auth plugin protection; `src/provider/provider.ts; src/plugin/codex.ts; test/provider/provider.test.ts; test/plugin/codex.test.ts` | FD-005, FC-006 | complementary; runtime/tests | adopt catalog/auth guards without changing model identity or plugin config | Same shared paths; retain DC overlays and validate inherited behavior |
| SYNC-05 | Synthetic examples and portable research guidance; `AGENTS.md; bundled deep-research/SKILL.md; test/cli/tui/session-list-visibility.test.ts` | FC-008, FC-011, FC-012; DC-TUI-001 | complementary; content/tests | adopt synthetic values and remove absent machine-local workflow reference; retain fork governance | Same shared paths; retain DC overlays and validate inherited behavior |
| SYNC-06 | Desktop beta README and screenshots; `README.md; README.zh.md; assets/readme/*.jpg` | FC-012 | no overlap; content/tests | adopt upstream announcement, retaining fork destinations and TUI focus | Same shared paths; retain DC overlays and validate inherited behavior |

## Semantic reconciliation

- Tool repair still resolves only against the registered request pool. Exact names win, case matches precede canonical aliases, strict mode keeps separator repair, and SDK-prefixed MCP names remain case-insensitive. `canonical()` remains case-folded by default for nested control-name protection and argument normalization; no authority is acquired from an alias.
- Image preparation reaches ordinary LLM requests, multimodal titles, tool-result attachments and the fork model proxy through `ProviderTransform.message`. Existing provider byte/dimension limits remain. The model API continues its separate HTTP(S)/data-URL admission, public DNS validation, pinning, cancellation and total-media budget. This does not broaden the API to accept a claimed BMP data URL.
- Accepted-image validation is container-header/dimension validation, not a full pixel decode for PNG/JPEG/GIF/WebP. BMP conversion supports uncompressed 24/32-bit input; other encodings may become text errors. Tests and claims do not establish that every possible corrupt container is rejected.
- Audio retirement is rejected under FD-004 across every carrier. The shared `src/audio` implementation, bounded `src/llm-server` protocol/SDK adapter, capability selection, CLI model scope/lifetimes, provider `getSpeech` interface/cache/factory, and fake provider remain intact. Removed legacy capability route/docs/demo/protocol tests stay removed. Voice-design/clone config fields were already absent.
- Missing catalog entries skip only the auth loader, and absent/revoked Codex auth is handled before dereference. Resolved model identity, harness precedence, speech factories and plugin configuration remain unchanged.
- Portable research guidance removes a reference to an unavailable machine-local workflow. Synthetic example policy is added alongside the fork CI/publication/worktree rules. README beta announcements and language-specific assets are inherited; fork ownership and TUI focus remain.
- All active FD/FC/DC records were checked. No owned production path changes for the actor lifecycle, checkpoint/frozen-prefix, instruction delivery, skill catalog, retry, voice-editor ownership, WebFetch/MCP networking, platform fallbacks, per-agent MaxMode or TUI metadata overlays. The image request boundary is adjacent to DC-CONTEXT-001; existing caps and active-tool preflight stay in place.
- There are no dependency, lockfile, migration, workflow or resolved API/schema-input changes. SDK/OpenAPI blobs remain unchanged; no generation is required. Compat retains its additional schema/SDK operations and the same lockfile. No duplicate-owner consolidation is included.

## Validation

- Bun 1.3.14; `bun ci` completed with an unchanged `bun.lock`.
- Package `bun typecheck` passed. Repository `bun lint` completed with 0 errors (4523 existing/reported warnings; no claim that lint is warning-free).
- Focused image/transform/tool-name/provider/Codex/read matrix: 473 passed across 6 files.
- Changed session/message/title/system, nested exec, TUI visibility and bundled-skill matrix: 204 passed across 7 files.
- Model/audio API matrix: 451 passed, one 5-second child-exit deadline failure across 16 files. The unchanged non-test default-path fixture passed in an isolated rerun (1 passed; child case 2.52 seconds), proving API-key presence alone still leaves both explicit APIs disabled and creates no instance. The first timeout is retained as a validation limitation; final CI must independently pass.
- Default-path commands unset `MIMOCODE_EXPERIMENTAL`, `MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`, `MIMOCODE_CODEX_MODE`, `MIMOCODE_COMPACTION_MAX_CONTEXT`, `MIMOCODE_COMPACTION_TRIGGER_RATIO`, `MIMOCODE_DISABLE_CHECKPOINT`, and the new `MIMOCODE_IGNORE_TOOL_NAME_CASE` selector. Package preload retains `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`; strict-name tests locally set only `MIMOCODE_IGNORE_TOOL_NAME_CASE=false`. The default-path API child additionally removes preload feature selectors before importing production modules.
- Source and resolved diff checks passed; API schema inputs, generated SDK/OpenAPI blobs, workflow files and the lockfile are unchanged. No local binary build is claimed.

## Complete incoming path ownership (43)

| Path | Inventory ID |
| --- | --- |
| `AGENTS.md` | SYNC-05 |
| `README.md` | SYNC-06 |
| `README.zh.md` | SYNC-06 |
| `assets/readme/mimo-desktop-cn.jpg` | SYNC-06 |
| `assets/readme/mimo-desktop-en.jpg` | SYNC-06 |
| `packages/opencode/src/cli/cmd/llm-server.ts` | SYNC-03 |
| `packages/opencode/src/config/provider.ts` | SYNC-03 |
| `packages/opencode/src/flag/flag.ts` | SYNC-01 |
| `packages/opencode/src/llm-server/audio-chat.ts` | SYNC-03 |
| `packages/opencode/src/llm-server/capability.ts` | SYNC-03 |
| `packages/opencode/src/llm-server/completions.ts` | SYNC-03 |
| `packages/opencode/src/llm-server/protocol.ts` | SYNC-03 |
| `packages/opencode/src/plugin/codex.ts` | SYNC-04 |
| `packages/opencode/src/provider/image.ts` | SYNC-02 |
| `packages/opencode/src/provider/models.ts` | SYNC-03 |
| `packages/opencode/src/provider/provider.ts` | SYNC-03, SYNC-04 |
| `packages/opencode/src/provider/transform.ts` | SYNC-02 |
| `packages/opencode/src/server/routes/instance/capability.ts` | SYNC-03 |
| `packages/opencode/src/skill/builtin/.bundle/deep-research/SKILL.md` | SYNC-05 |
| `packages/opencode/src/skill/builtin/.bundle/mimocode-docs/SKILL.md` | SYNC-03 |
| `packages/opencode/src/skill/builtin/.bundle/mimocode-docs/reference/capability-api.md` | SYNC-03 |
| `packages/opencode/src/skill/builtin/.bundle/mimocode-docs/reference/providers.md` | SYNC-03 |
| `packages/opencode/src/util/tool-compat.ts` | SYNC-01 |
| `packages/opencode/test/cli/tui/session-list-visibility.test.ts` | SYNC-05 |
| `packages/opencode/test/fake/provider.ts` | SYNC-03 |
| `packages/opencode/test/fixture/skills/llm-endpoint-demo/SKILL.md` | SYNC-03 |
| `packages/opencode/test/fixture/skills/llm-endpoint-demo/speak.mjs` | SYNC-03 |
| `packages/opencode/test/fixture/skills/llm-endpoint-demo/transcribe.mjs` | SYNC-03 |
| `packages/opencode/test/llm-server/audio-chat.test.ts` | SYNC-03 |
| `packages/opencode/test/llm-server/capability.test.ts` | SYNC-03 |
| `packages/opencode/test/llm-server/e2e-audio.test.ts` | SYNC-03 |
| `packages/opencode/test/llm-server/protocol.test.ts` | SYNC-03 |
| `packages/opencode/test/plugin/codex.test.ts` | SYNC-04 |
| `packages/opencode/test/provider/image.test.ts` | SYNC-02 |
| `packages/opencode/test/provider/provider.test.ts` | SYNC-04 |
| `packages/opencode/test/provider/transform.test.ts` | SYNC-02 |
| `packages/opencode/test/session/message-v2.test.ts` | SYNC-02 |
| `packages/opencode/test/session/prompt.test.ts` | SYNC-02 |
| `packages/opencode/test/session/system.test.ts` | SYNC-05 |
| `packages/opencode/test/tool/read.test.ts` | SYNC-02 |
| `packages/opencode/test/util/tool-compat.test.ts` | SYNC-01 |
| `packages/sdk/js/src/v2/gen/types.gen.ts` | SYNC-03 |
| `packages/sdk/openapi.json` | SYNC-03 |
