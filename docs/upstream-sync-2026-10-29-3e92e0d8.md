# Upstream sync 2026-10-29: supplied session ids and Xiaomi credential split

## Scope and immutable baselines

Full live sync authorized by `同步 upstream 更新`, upstream/main -> main -> dev/compat.
Selected upstream `3e92e0d8f0308603180ad03dbc67828c94c09ec4`; prior reviewed upstream `ebd06ee2fafad8f20d358aaac68200536ff9be65`.
Starting main `ad8387f9093a94c075df22a2c535929ec73bce17`; starting compat `b01a3be82a44f376f94e5810da7f16bb845771cf`.
Both remotes use fresh branch-only fetches without tags. Original checkout is on compat with untracked `.omo/`, preserved.
Operation resources: dedicated Git worktrees and local branches `sync/upstream-20261029-main` and `sync/upstream-20261029-compat`; operation-only Bun/node-gyp executable links; logs outside checkouts.

## Capability inventory (N=4)

The audit range is ebd06ee2..3e92e0d8: two upstream commits (45edd96f, 3e92e0d8) and 27 paths. No owner retires or moves.

| ID | Selected behavior, producers and tests | Main counterpart, relationship and drift | Compat counterpart | Owners and disposition | Evidence |
| --- | --- | --- | --- | --- | --- |
| C01 | 45edd96f: `Session.CreateInput.id` accepts only `ses_` plus 26 base62 characters (regex before `pipe(SessionID.zod)`, so OpenAPI publishes the bound); `Interface.create`/`create` forward it to `createNext`, which rejects an existing id by name before any write. Spec `docs/compose/spec/client-supplied-session-id.md`; `test/session/client-supplied-id.test.ts`; SDK `id?` body field. | Fork `session.ts` diverges widely but `createNext` keeps upstream's shape; the duplicate check precedes the worktree-ownership write, `Created` projection and main actor registration. `POST /session` forwards the validated body through `SessionShare.create`. In-process callers (spawnPeer, fork) pass no id. Clean adoption; regenerated SDK equals the merge. | Inherit; compat `session.ts` equals main. SDK regenerated from compat source equals the merge, keeping DC API extensions. | FC-001 main actor registration and FC-007 deletion boundaries adjacent; DC-CONTEXT-001/DC-ACTOR-001 treat session ids as opaque keys. Adopt unchanged. | `client-supplied-id` 4/4 on both branches; `session.test.ts`, `session-create-registers-main.test.ts`, `openapi-refs.test.ts`, `effect-zod.test.ts`. |
| C02 | 3e92e0d8 credential placement: `provider/xiaomi-family.ts` gateway table (token-plan cn/ams/sgp before `xiaomi`); the MiMo plugin returns `provider` from the login endpoint; `ProviderAuth.callback` and CLI `mimoLogin` write through `saveCredential`, which drops a legacy same-cluster `xiaomi` api alias (never oauth); `providers whoami` lists every family entry. Tests `provider-auth-write`, `xiaomi-family`, `plugin/mimo`, fixture `mimo-encrypt.ts`. | Fork has no delta on `provider/auth.ts`, `plugin/mimo.ts` or `cli/cmd/providers.ts`. Clean adoption. Remaining hard-coded `"xiaomi"` consumers in merged main equal upstream's own set. | Inherit; no compat delta on these paths. | No FD/FC/DC lists these surfaces; FD-005 identity is unaffected because harness classification reads model identity, not the credential key. Adopt unchanged. | Same files pass on both branches (matrix below). |
| C03 | 3e92e0d8 WebSearch: the Xiaomi sidecar serves every `xiaomi`/`xiaomi-*` model with its own provider's key and `model.api.id`; the tool gate exposes `websearch` to the family. Tests: websearch token-plan sidecar, registry-toolset family exposure. | Clean adoption. FD-005's sidecar contract (resolved `model.api.id`, no hard-coded MiMo id) holds for the whole family. | Adapt DC-WEBSEARCH-001: keep sidecar -> configured fallbacks -> Exa (non-family only) -> WEBFETCH hint; the sidecar gate and key come from the family/model provider; family sessions still skip Exa; registry keeps `NativeWebSearch.exposed` beside the family check. Upstream token-plan test gains compat Config/Provider layers; new regression: a keyless token-plan session is served by a fallback, and when the fallback fails returns the hint with zero Exa calls. | FD-005 (shared), DC-WEBSEARCH-001 (compat). Main adopt; compat adapt. | Compat mutations: reverting the Exa gate fails the new regression; reverting gate/key to hard-coded `xiaomi` fails both token-plan tests. Restored source passes 9/9. |
| C04 | 3e92e0d8 family consumers: in-house vision ordering, large-model output defaults, `X-Mimo-Source` header, TUI logout clears every family key, login dialog and TUI `fallback` pick the keyed family member via `familyDefaultModel`, voice `resolveCredentials` walks the family when the configured provider lacks a key. Tests `model.test.ts`, `voice.test.ts`, `transform.test.ts`. | Fork `util/model.ts` delta (context budget/usage) is disjoint from `fallback`; `voice.ts` has no fork delta. Only conflict: `model.test.ts` imports, resolved as a union. FC-016 Prompt ownership and grapheme offsets are untouched. | Inherit; DC-TUI-001 display helpers and DC-CONTEXT-001 checkpoint coverage keep their imports (test import union). DC-PROVIDER-001 xAI routing and `forceReasoning` merge cleanly beside the family checks. | FC-016 (voice), DC-TUI-001, DC-CONTEXT-001, DC-PROVIDER-001 adjacent. Adopt unchanged. | `model.test.ts`, `voice.test.ts`, `transform.test.ts`, `provider.test.ts` pass on both branches. |

Recommendations, not acted on: `provider/error.ts` `isMimoGatewayProvider` already accepts any `xiaomi-*` id and duplicates `isXiaomiFamilyProvider`; a duplicate supplied session id is an untyped defect rather than a typed 4xx (upstream's documented choice). Both are upstream-owned.

## Validation

Runtime/test snapshots: main `61a589679a10968dfad60280eb4aa2c4993765fd`; compat `6bc84001a223e12306d0c39796c24bff2747b3c9`.
Pinned Bun 1.3.14, dependencies installed with bun ci and npm bundled node-gyp exposed on the operation PATH; `bun.lock` and package manifests are unchanged by the range. Every ambient `MIMOCODE_*` variable is removed (the shell carried `MIMOCODE_EXPERIMENTAL`, which also enables Exa and would mask the WebSearch exposure assertions). Package preload retains isolated HOME/XDG, in-memory DB and disabled default plugins, without experimental selectors.
The SDK was regenerated on each branch from its merged source; neither regeneration changes the merged output.
CLI bun run typecheck and root bun run lint validate both branches: typecheck exits 0; lint has zero errors (main 3,691 warnings, compat 3,776 warnings).

Shared matrix (bun test --timeout 120000): `test/provider/{xiaomi-family,provider-auth-write,transform,provider,error}.test.ts`, `test/plugin/{mimo,auth-override}.test.ts`, `test/auth/auth.test.ts`, `test/cli/tui/{model,voice}.test.ts`, `test/tool/{registry-toolset,registry,websearch,harness-alias}.test.ts`, `test/session/{client-supplied-id,session,session-create-registers-main}.test.ts`, `test/server/openapi-refs.test.ts`, `test/util/effect-zod.test.ts`. Compat adds `test/tool/websearch-native.test.ts` and `test/session/llm-native-websearch.test.ts`.

| Branch | Final matrix | Assertions / duration |
| --- | --- | --- |
| main | 19 files: 608 pass, 0 skip, 0 fail | 1,679 / 56.41 s |
| compat | 21 files: 667 pass, 0 skip, 0 fail | 1,850 / 76.27 s |

Both matrices ran on the exact merge trees later committed. The compat production overlay path set under packages remains 54 paths excluding tests, identical before and after the merge.

## Exact-SHA CI evidence

All six source-snapshot workflows pass on their first attempts; no rerun is used.

| Branch / source snapshot | lint | typecheck | complete test |
| --- | --- | --- | --- |
| main 61a589679a10968dfad60280eb4aa2c4993765fd | [40732530844](https://github.com/onlyfeng/MiMo-Code/actions/runs/40732530844) | [40732531241](https://github.com/onlyfeng/MiMo-Code/actions/runs/40732531241) | [40732530800](https://github.com/onlyfeng/MiMo-Code/actions/runs/40732530800): nine jobs successful; Windows skipped as configured |
| compat 6bc84001a223e12306d0c39796c24bff2747b3c9 | [40732536301](https://github.com/onlyfeng/MiMo-Code/actions/runs/40732536301) | [40732536328](https://github.com/onlyfeng/MiMo-Code/actions/runs/40732536328) | [40732536216](https://github.com/onlyfeng/MiMo-Code/actions/runs/40732536216): all ten jobs successful, including [Windows runtime and launcher](https://github.com/onlyfeng/MiMo-Code/actions/runs/40732536216/job/122972368962) |

The shared FD/FC review, history and report are main-owned and inherited unchanged.
Compat records its eleven retained DC owners separately. Final docs-only pushes
start no workflow; source-SHA CI above is reusable only with these proofs:

```sh
git diff --quiet 61a589679a10968dfad60280eb4aa2c4993765fd origin/main -- . ':(exclude)docs'
git diff --quiet 6bc84001a223e12306d0c39796c24bff2747b3c9 origin/dev/compat -- . ':(exclude)docs'
git merge-base --is-ancestor upstream/main origin/main
git merge-base --is-ancestor origin/main origin/dev/compat
```

No PR or remote temporary branch is created. Local main and compat may
fast-forward only after proving no unique work. Remove the two clean integrated
operation worktrees/branches and operation executable links; keep operation logs
as evidence and preserve the original untracked .omo/ directory.
