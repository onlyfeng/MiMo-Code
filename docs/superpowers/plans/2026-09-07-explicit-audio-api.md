# Explicit audio API integration

> Historical snapshot: dedicated audio endpoints and capability selection described here
> were superseded by the [2026-09-09 audio convergence](../../audio-upstream-alignment-2026-09-09.md).
> Use the current Model API guide for supported behavior.

The approved scope is upstream's basic speech synthesis and transcription API.
Source: upstream `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`; the audio sources are
unchanged in upstream main `9061f90b94dfe0339616aada7019d1c2e70709ba`.
The unrelated tool-name case flag in that newer main is outside this change.

## Contract

- `mimo serve --audio-api` enables two endpoints on the existing explicit server:
  `POST /v1/audio/speech` and `POST /v1/audio/transcriptions`.
- `MIMOCODE_AUDIO_API_KEY` supplies a dedicated Bearer secret of at least 32
  characters. Neither the flag alone nor the environment variable alone exposes
  an audio API. Ordinary TUI, ACP, embedded and plain serve remain disabled.
- Authenticate before consuming the body or bootstrapping an instance. Use the
  startup directory, reject directory/workspace redirection, and do not grant
  generic server API access with the audio credential.
- Require an explicit configured `provider/model`; do not restore model discovery,
  general chat proxy, temporary-token management, voice design or voice cloning.
- Bound the complete request body to 25 MiB, synthesis input to 4096 characters,
  concurrent audio requests to two, and request execution to 120 seconds. Closing
  the listener first closes audio admission and cancels/drains accepted requests.
- Reuse native SDK speech and upstream audio-over-chat adapters. Transcription
  returns JSON `{text}` or plain text. Native Whisper-style provider adapters and
  non-OpenAI-shaped multimodal fallback are not included.
- Reject unsupported fields/formats before provider calls. Preset voices only;
  no SSE, subtitles or verbose transcription. Raw TTS must reject options it
  cannot carry instead of silently ignoring them.

## Work and verification

Capability inventory (1):

| ID | Selected behavior and source | Main / compat counterpart | Owners | Disposition |
| --- | --- | --- | --- | --- |
| AUDIO-01 | Basic speech and standard multipart transcription from upstream `6203ea2e`: audio protocol, transport, provider speech factory and two handlers | Previously absent under FD-004 on main `774a7956` and compat `bf85673a`; existing TUI voice is separate | Shared main FD-004; FD-005 provider identity and FC-007 directory semantics are adjacent; seven DC owners retain their existing behavior | Extract the two protocols with explicit audio-only admission; inherit unchanged into compat; leave general discovery/proxy/token and newer upstream tool-case work out |

1. Preserve the root checkout; create a native managed workspace from fork main
   `774a795682c648b7f3637b9159c063ef6a2a4018` and install with `bun ci`.
2. Add failing protocol, transport, service and HTTP tests. Local HTTP provider
   fixtures must inspect actual wire requests, credentials, model IDs and output.
3. Extract `src/audio/{protocol,audio-chat,service}.ts`, minimally extend Provider's
   speech factory/cache, and update its fake interface. Keep Node-compatible core.
4. Add audio admission/auth/body handling ahead of generic middleware. Wire only
   the serve flag into the optional listener configuration; handle graceful signals
   by stopping intake before disposing instances.
5. Cover disabled non-test child behavior, authentication and directory boundaries,
   invalid fields, request limits, concurrency and cancellation/shutdown. Run the
   audio tests plus affected server/provider/TUI voice regressions and typecheck
   from `packages/opencode`, with ambient opt-in selectors removed.
6. Document actual provider support and examples; narrow FD-004 to permit the
   explicit audio-only exception. Generate OpenAPI/SDK from source and check that
   ordinary generated contracts do not acquire a general capability surface.
7. Independently review the diff, propagate accepted main behavior to dev/compat,
   validate affected DC entries, and verify final branch SHAs and CI before calling
   the integration complete. Clean only this operation's managed workspaces.

Package test preload flags remain harness configuration, not evidence that an
optional feature is disabled in a normal process. No live paid provider calls are
required for protocol verification; any untested provider behavior must be stated.
