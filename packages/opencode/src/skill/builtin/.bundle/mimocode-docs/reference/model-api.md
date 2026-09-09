# Model API

The model API lets external clients use the providers configured for one project.
Ordinary `mimo` TUI startup runs a worker-owned listener for the startup project,
using loopback and an automatically selected port by default. It closes with
that TUI. `mimo attach` connects to an existing server and starts no local
listener. ACP, embedded instances and plain `mimo serve` retain explicit API
enablement. Provider credentials and issued tokens alone never start a server;
TUI startup never automatically issues a model token.

## Start and authorize

```sh
# Ordinary TUI starts the project model API automatically.
mimo /absolute/project/path

# Alternatively, start an explicit server from that project without a TUI.
mimo serve --llm-server --port 4096

# In another terminal, issue a token for the same project.
mimo llm-server issue --directory /absolute/project/path --model provider/chat --json
```

The JSON result contains `api_key`, `scope`, `base_url`, and `renew_argv`. A finite
scope also has `models`, and a single-model scope has `model`. An all-model scope
is explicitly `{"type":"all"}` and does not invent an empty `models` list.
Use the key as `Authorization: Bearer ...`; the base URL already
ends in `/v1`. A `null` base URL means a matching local listener was not found;
issuing a token does not start one. Use the exact `provider/model` identifier.
Renewal issues a new token and does not revoke the old token.

The TUI worker uses an in-memory random Basic password for ordinary server API
requests unless operator credentials are configured. Internal RPC adds that
header; explicit HTTP transport obtains it only through trusted worker/host
RPC. Automatic credentials are not written to the environment, address records,
project configuration or token store, and are not printed. They neither grant
model access nor relax ordinary directory containment or non-loopback binding.
Operator credentials take priority; explicit network options retain their
existing admission rules. Configure an operator password before starting a
server if another TUI needs to attach with that password. Model Bearer tokens
cannot authorize attach or ordinary server routes.

Multiple TUI workers own separate listeners and automatic credentials. Default
listener startup failure reports an error while internal RPC remains usable;
explicit HTTP startup failure exits through cleanup. Shutdown stops model API
admission and joins pending listener startup before checkpoint/instance teardown,
then releases automatic credentials. It does not revoke persisted model tokens.

Discovery follows upstream: enumerate the current project's post-plugin,
post-configuration provider registry, filter by token scope, and sort model refs.
It does not classify audio models, initialize SDK factories, or generate output.
Registry membership does not prove chat transport support or remote availability.

Choose exactly one selection mode: repeat `--model` for a finite list, use
`--all-models`. Finite lists contain 1–64 unique, explicit
`provider/model` identifiers checked for registry membership at issue time. Empty
lists and wildcard authorization are rejected.

```sh
mimo llm-server issue --directory /absolute/project/path --model provider/chat --model provider/other-chat --json
mimo llm-server issue --directory /absolute/project/path --all-models --json
```

All-model scope applies to registered models in this project's effective
configuration, including later additions; removed models cease to be listed.
It is not expanded into a snapshot when issued and never grants another
directory. Query `GET /v1/models` to discover the current registry selection.
Renewal preserves all repeated models or `--all-models`.
```sh
mimo llm-server list --directory /absolute/project/path --json
mimo llm-server revoke TOKEN_ID --directory /absolute/project/path
```

List and revoke do not initialize the project or its plugins. Revocation blocks
later admission; requests already admitted keep their request lifecycle.
Client credentials are never forwarded as provider authorization headers.

Legacy v1 single-model records retain their exact scope and expiry. Reading a
record does not migrate the file; a real mutation validates and atomically
writes v2 under the existing lock. Queries, unknown tokens, and no-op revocation
do not rewrite a file merely to upgrade it. Legacy literal `*` characters remain
exact identifiers, never wildcards; new issue requests reject them. Disk records
store canonical `scope`; finite public library results also retain `models`.
Consumers of a result that may be all-model scope must check `scope.type` before
assuming a `models` array exists.

## Token lifetime

The default idle window is one hour and the absolute lifetime is one day.
Successful token verification refreshes idle time; absolute time starts at issue.
`--ttl` and `--max-age` accept positive, safe durations or independent `none`
values. Zero, negative, invalid, and overflowing durations are rejected.

| Issue flags | Expiry |
| --- | --- |
| Omit both, or `--ttl 1h --max-age 24h` | One hour idle or one day after issue, whichever comes first |
| `--ttl none --max-age 24h` | One day after issue only |
| `--ttl 1h --max-age none` | One hour idle only; use refreshes it |
| `--ttl none --max-age none` | No expiry; revocation still works |

```sh
mimo llm-server issue --directory /absolute/project/path --all-models --ttl none --max-age none --json
```

Issue/list JSON exposes `idle_ms` and `max_age_ms` separately, using explicit
`null` for each cancelled limit. `expires_at` is `null` only when both are
cancelled. Terminal output uses `never` for no expiry and shows both limits.
Renewal preserves each `none` independently. Request deadlines and resource
limits still apply to permanent tokens.

Embedding uses `expiry:{idleMs:null,maxAgeMs:null}`. Version 2 stores require
both lifetime fields, each a positive safe integer or explicit `null`; missing
fields never mean permanent. Legacy version 1 remains finite-only. Public
`expiresAt`/`expires_at` values are numbers or explicit `null`, including the
successful verification result, which also exposes both lifetime fields.

## Endpoints and media

| Endpoint                        | Behavior                                                              |
| ------------------------------- | --------------------------------------------------------------------- |
| `GET /v1/models`                | Authorized models currently registered in the fixed project          |
| `POST /v1/chat/completions`     | JSON or SSE; text, images, input audio, and client tool-call protocol |

The chat proxy returns tool calls to the client. It does not execute TUI tools,
actors, MaxMode, checkpoints, or compaction, and does not persist a chat session.

Chat images use `image_url.url` with a canonical `data:image/...;base64,...` value
or an HTTP(S) URL. Supported formats are PNG, JPEG, WebP, and GIF, up to 5 MiB
per decoded image. Remote downloads validate public destinations at every hop,
pin the checked address, validate HTTPS hostnames, and check MIME/signature.
Private, loopback, special addresses, URL credentials, compressed responses, and
more than five redirects are rejected. Downloaded bytes go to the SDK without
client or provider credentials. This applies on dev/compat too, independently
of that branch's WebFetch rules.

User messages can interleave text, images, and audio:

```json
{
  "model": "provider/audio-capable-chat-model",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Transcribe this recording." },
        { "type": "input_audio", "input_audio": { "data": "<base64 WAV>", "format": "wav" } }
      ]
    }
  ]
}
```

Bare audio Base64 requires `format`; an `audio/*` data URL can supply the format.
If both are supplied they must agree. Formats are
`wav/mp3/mpeg/mpga/m4a/mp4/flac/ogg/webm`, with aliases normalized. Remote audio
URLs are not accepted. Each decoded audio input is limited to 20 MiB; all chat
media together share a 25 MiB limit. The HTTP body independently has a 25 MiB
limit including Base64 overhead. The model must declare audio input, and its
actual transport must encode the format. OpenAI/Azure/compatible Chat supports
WAV/MP3; verified Google/Vertex GenerateContent supports the listed containers.
Responses and unverified audio transports reject the input before generation.
An OpenAI/Azure package name alone does not select Chat transport.

Upstream `1c13f051` removed standalone speech and transcription. This fork
also returns 404 for `/v1/audio/speech` and `/v1/audio/transcriptions`, even
with a valid model token. `serve --audio-api`, `MIMOCODE_AUDIO_API_KEY`, and
`issue --capability` are removed. Chat `input_audio`, TUI voice input, and
MCP sampling keep their existing behavior.

## Client provider options

Chat accepts a flat `provider_options` object with the following whitelist.
Unknown fields (including unknown keys inside nested objects), wrong types, and unsupported model/transport pairs
return 400 before remote image download or generation. It cannot override the
model, URL, credentials, messages, or tools. Do not add a provider namespace.

| Actual provider/transport         | Allowed fields                                                                                                                                                                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI / Azure Chat or Responses  | `reasoningEffort`: `none/minimal/low/medium/high/xhigh`; `textVerbosity`: `low/medium/high`. The SDK must recognize the model for the option. Responses additionally accepts `reasoningSummary:auto/detailed`; Chat rejects summary |
| Supported Anthropic Claude models | `thinking:{type:"enabled",budgetTokens:N}`, `{type:"disabled"}`, or supported adaptive models' `{type:"adaptive",display?:"omitted"\|"summarized"}`; `effort` only from that model's existing adaptive variants                     |
| Google / Vertex Gemini 2.5        | `thinkingConfig.thinkingBudget`: Pro `-1` or `128..32768`; Flash `-1` or `0..24576`; Flash-Lite `-1`, `0`, or `512..24576`; boolean `includeThoughts`                                                                               |
| Google / Vertex Gemini 3 / 3.1    | `thinkingConfig.thinkingLevel`: 3 Pro `low/high`; 3.1 Pro `low/medium/high`; 3 Flash `minimal/low/medium/high`; boolean `includeThoughts`                                                                                           |
| Xiaomi MiMo Chat                  | Provider `xiaomi`, API model `mimo-v2.5` or `mimo-v2.5-pro`: `thinking:{type:"enabled"\|"disabled"}`. Local MiMo Responses is unsupported                                                                                           |
| DeepSeek v4 Chat                  | Provider `deepseek`, API model `deepseek-v4-pro` or `deepseek-v4-flash`: `thinking` toggle and `reasoningEffort:low/high/max`                                                                                                       |

Anthropic enabled budgets are integers from 1024 to 31999, additionally bounded
by the model's output capacity. The SDK adds the budget to the output-token
limit. Their total must fit both configured and known SDK caps: explicit excess
returns 400; an omitted output limit reserves space for the budget. Gemini
budget and level are mutually exclusive; switching clears the old selector
while preserving independent `includeThoughts` settings.

For nonempty options, precedence is provider defaults → model configuration →
validated client options → the existing variant selected by top-level
`reasoning_effort` → trusted project plugins. A variant's associated defaults,
including summary, also override client fields. To choose effort and summary
independently, use only `provider_options`, for example
`{"reasoningEffort":"high","reasoningSummary":"detailed"}` on a supported
Responses model. A thinking-mode change replaces the old mode's fields.
MiMo top-level low/medium/high all enable thinking on this path; they do not
promise distinct strengths. DeepSeek disabled thinking conflicts with an
explicit effort unless a top-level variant enables thinking.

Omitting the object or passing `{}` keeps the earlier configuration/variant
behavior. This whitelist verifies local encoding, not remote model availability
or acceptance of every combination.

## Admission and resource limits

Authorization fixes the project directory; HTTP parameters cannot switch it.
Each listener admits at most two concurrent requests with a 120-second request
deadline. Cancellation and server shutdown reach the underlying request and
drain its resources before releasing admission. SDK chat output events have a
16 MiB limit, excluding the SDK's repeated input request body. Provider errors
are sanitized; chat requests do not automatically retry.

Ordinary generated OpenAPI and the JavaScript SDK omit these optional routes.
Use a compatible client or direct HTTP. The Node entry exports `LLMServerTokens`
for explicit embedding; `Server.listen({ ..., llm: { directory } })` enables
the model API. The TUI worker supplies this option automatically; other
entrypoints retain explicit enabling.
