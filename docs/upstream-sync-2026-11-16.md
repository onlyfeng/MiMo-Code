# Upstream synchronization — 2026-11-16

## Scope and immutable baselines

Full synchronization authorized by “同步 upstream 更新”: `upstream/main -> main -> dev/compat`.
Branch-only, no-tag fetches on 2026-11-16 selected upstream `5e9579b66bae8cbcd73205c98dd5b5fdfae088ec`.
Reviewed range: `c9c91d7b6fff20164629475218fa0a58e16d14b8..5e9579b66bae8cbcd73205c98dd5b5fdfae088ec` (11 commits, 47 paths).
Starting main: `d65ee6e1e26fc7a17f46dfdc93733605d4971097`; compat: `7100a8705a2fd8b0bf97552266b1fd3ab9a534e9`.
The existing checkout was clean on dev/compat. Dedicated Orca worktrees/branches `upstream-sync-20261116-main` / `sync/upstream-20261116-main` and `upstream-sync-20261116-compat` / `sync/upstream-20261116-compat` are operation-owned; preserve all other resources. No upstream writes or release publication are authorized by this operation.

## Capability inventory (8)

All rows audit the immutable range above, against both starting fork trees. Shared owner is main; compat inherits with its registered overlays. FD/FC/DC active indices and contracts were reviewed before merging. Unchanged owners retain their implementations and exit conditions; no owner retires.

| ID | Selected behavior and producers/consumers/tests | Relationship and owners | Planned disposition |
| --- | --- | --- | --- |
| C01 | Mutable MCP `alwaysDirectTools`; `src/config/mcp.ts` -> OpenAPI -> SDK v2 generated types; MCP config/deferred-tool consumers | FC-004, FD-005/006/009; DC-NET-002, DC-CONTEXT-001; existing main/compat schema with missing SDK fields | Already implemented on both fork branches: source schema is mutable and generated fields are present. Merge changes neither input nor generated output; no regeneration needed; retain fork extensions and authorization |
| C02 | Categorized builtin skills, provider/config/variant references, README and CONTRIBUTING | FC-005/011/012, FD-005; DC-ACTOR-002/DC-CONTEXT-001; existing fork guidance | Adopt accurate additions; correct process-false/session-codex precedence and retain fork contribution routing |
| C03 | 0.1.17 workspace versions/lock; Ubuntu release build, build-only dispatch, registry sync of published packages; release script tests | FC-008/012/052; existing fork release guard and provenance | Adopt without executing publication; preserve explicit GH_REPO guard and provenance |
| C04 | MiMoCode/mimo ACP terminal authentication, provider 401 and MCP hints; ACP/provider-error tests | FC-004/011; DC-NET-002; existing auth and MCP lifecycle | Adopt names and hints without changing admission/auth policies |
| C05 | Repeated model option keeps last string across run, agent create and TUI; model-option tests | FC-023/030, FD-001; DC-MODEL-001/DC-TUI-001; existing model selection and approval boundaries | Adopt shared parser; preserve downstream model/variant and run approval behavior |
| C06 | SDK v1/v2 launches mimo and recognizes mimocode readiness; server-launch tests | FC-007/012; no compat-only launcher counterpart | Adopt binary/readiness corrections; retain public API names and fixed-cwd semantics |
| C07 | Weighted CI shards, isolated resume-negative polluter, bounded test log flush, targeted catalog spy, unique checkpoint fixture sessions, three incoming test skips | FC-001/002/008/024/026; DC-SESSION-001/DC-CONTEXT-001; existing strict JUnit discovery and Windows acceptance | Retain FC-008 stable path-hash assignment and strict discovery/reporting; adopt the sharding utility as an available tool and proven resume-negative isolation; keep all three regressions executable |
| C08 | Worker rpc.ready handshake, queued requests, error/close settlement and intentional disposal; real-worker RPC and TUI-thread tests | FD-004, FC-008; DC-SESSION-001/DC-TUI-001; existing TUI claim/listener behavior | Adopt handshake/disposal; preserve listener advertisement and compat process ownership |

## Validation and publication

Pending. Record source snapshots, exact commands/environment/counts, final-SHA workflow evidence, remote tips, ancestry and cleanup after execution. Initial host Bun is 1.4.4; repository pins 1.3.14. Actions permissions currently report enabled, so the prior synchronization’s HTTP 422 blocker must not be assumed current.
