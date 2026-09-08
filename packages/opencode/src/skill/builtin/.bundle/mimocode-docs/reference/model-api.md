# Model API

The model API lets external clients use the providers configured for one project.
It is disabled in ordinary TUI, ACP, embedded instances, and `mimo serve`.
Provider credentials and issued tokens alone never start it.

## Start and authorize

```sh
# Start in the configured project directory.
mimo serve --llm-server --port 4096

# In another terminal, issue a token for the same project.
mimo llm-server issue --directory /absolute/project/path --capability chat --json
```

The JSON result contains `api_key`, the selected `model`, `base_url`, and
`renew_argv`. Use the key as `Authorization: Bearer ...`; the base URL already
ends in `/v1`. A `null` base URL means a matching local listener was not found;
issuing a token does not start one. Use the exact `provider/model` identifier.
Renewal issues a new token and does not revoke the old token.

`--capability chat|speech|transcription` selects an available model. It is a
selection rule, not an endpoint permission: the selected model can serve any of
its supported API operations. Discovery checks configuration and supported
transports without sending a generation request; it cannot prove availability,
credit, or remote acceptance of every parameter.

```sh
mimo llm-server list --directory /absolute/project/path --json
mimo llm-server revoke TOKEN_ID --directory /absolute/project/path
```

List and revoke do not initialize the project or its plugins. Revocation blocks
later admission; requests already admitted keep their request lifecycle.
Client credentials are never forwarded as provider authorization headers.

## Endpoints and media

| Endpoint                        | Behavior                                                              |
| ------------------------------- | --------------------------------------------------------------------- |
| `GET /v1/models`                | Authorized models currently serviceable in the fixed project          |
| `POST /v1/chat/completions`     | JSON or SSE; text, images, input audio, and client tool-call protocol |
| `POST /v1/audio/speech`         | Basic speech synthesis with supported preset voices                   |
| `POST /v1/audio/transcriptions` | Multipart upload; JSON or plain-text transcript                       |

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

The transcription endpoint supports existing raw OpenAI-shaped ASR and verified
Google/Vertex audio-input, text-output language models through their SDK. It
accepts an audio file up to 20 MiB and an optional language hint. SDK transcription
returns only complete, nonblank text; tool calls, truncated output, and missing
completion events fail the request. It does not implement voice design, voice
cloning, or a Whisper-native provider adapter. Ordinary speech synthesis remains
available through its supported preset-voice transports.

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
or acceptance of every combination. Speech and transcription endpoints still
reject client `provider_options`.

## Admission and resource limits

Authorization fixes the project directory; HTTP parameters cannot switch it.
Each listener admits at most two concurrent requests with a 120-second request
deadline. Cancellation and server shutdown reach the underlying request and
drain its resources before releasing admission. SDK chat output events have a
16 MiB limit, excluding the SDK's repeated input request body. Provider errors
are sanitized; chat and audio do not automatically retry.

`mimo serve --audio-api` is a separate, mutually exclusive mode with a static
audio key. Its key cannot authorize model proxy access, and model tokens cannot
authorize that static-key mode. Neither replaces generic server Basic auth via
`MIMOCODE_SERVER_PASSWORD`.

Ordinary generated OpenAPI and the JavaScript SDK omit these optional routes.
Use a compatible client or direct HTTP. The Node entry exports `LLMServerTokens`
for explicit embedding; only `Server.listen({ ..., llm: { directory } })`
enables the model API.
