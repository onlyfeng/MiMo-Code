# MiMoCode Permissions Reference

Permissions gate what the agent may do without asking. Configure them under the top-level `permission` key.

## Actions

Every rule resolves to one of three actions:

| Action | Meaning |
|--------|---------|
| `allow` | Run without prompting |
| `ask` | Prompt the user for confirmation (default for risky ops) |
| `deny` | Block entirely |

## Two shapes

A permission rule is **either** a single action string, **or** a glob-keyed map of action strings (for tools whose argument is a path, a command, or another name worth matching on):

```jsonc
{
  "permission": {
    // whole-tool action
    "webfetch": "allow",
    // glob-keyed: match on the tool's path/command argument.
    // Later rules win, so put the catch-all FIRST and specifics after it.
    "bash": {
      "*": "ask",
      "git *": "allow",
      "rm -rf *": "deny"
    }
  }
}
```

A bare string at the top level (`"permission": "allow"`) becomes `{ "*": action }` — a blanket default for everything.

## Configurable tools

Glob-keyed (accept the glob-map form): `read`, `edit`, `glob`, `grep`, `list`, `bash`, `task`, `actor`, `external_directory`, `lsp`, `skill`, `mcp_sampling`. The key is the tool's path or command argument, except for `mcp_sampling`, where it is the MCP server name.

Simple action-only: `question`, `webfetch`, `websearch`, `codesearch`, `doom_loop`.

`doom_loop` is the safety gate raised when repeated identical tool calls look like an infinite loop. Keep it at `ask` (the default) unless the surrounding automation has another reliable stop condition.

`mcp_sampling` gates MCP **client-side sampling**: an MCP server asking MiMoCode to run a model call on its behalf (`sampling/createMessage`), so the server needs no API key of its own. The glob argument is the MCP server name, so you can allow one server and keep the rest at `ask`:

```jsonc
{
  "permission": {
    "mcp_sampling": { "*": "ask", "mimo-cut": "allow" }
  }
}
```

The prompt shows which server asked, the model that will run, the content types and audio size, and previews of the system and user prompts. A per-server `mcp.<name>.sampling` value of `deny` refuses before any prompt or model work; `allow` skips the prompt but still enforces size caps, the request timeout, and model capability checks. A `deny` from either control wins: `mcp.<name>.sampling: "allow"` does **not** override `permission.mcp_sampling` denying that server. See @mcp-sampling.md.

Unknown keys fall through to a catch-all record, so future/custom tools can be named too.

## Common recipes

Auto-allow read-only git and block destructive shell:
```jsonc
{ "permission": { "bash": { "git status": "allow", "git log *": "allow", "git diff *": "allow", "rm -rf *": "deny" } } }
```

Allow the system temp dir (opt-in; has known risks — temp is world-writable):
```jsonc
{ "permission": { "external_directory": { "/tmp/**": "allow" } } }
```

Ask before every file edit:
```jsonc
{ "permission": { "edit": "ask" } }
```

## Skipping permission prompts

For trusted, disposable environments (containers, sandboxes, CI) you can auto-approve everything the agent does.

| Surface | How |
|---------|-----|
| TUI (`mimo`) | `mimo --dangerously-skip-permissions` or `mimo --yolo` |
| TUI at runtime | `/skip-permissions` — toggle mid-session, instance-wide, inherited by subagents |
| Headless (`mimo run`) | `mimo run --dangerously-skip-permissions "<prompt>"` or `mimo run --yolo "<prompt>"` |
| Any surface (env) | `MIMOCODE_PERMISSION='"allow"'` or `MIMOCODE_DANGEROUSLY_SKIP_PERMISSIONS=1` |

Startup `--yolo` / `--dangerously-skip-permissions` includes deletion confirmation. Bash still checks explicit `bash`, `bash_delete`, and external-directory denies before execution. `MIMOCODE_AUTO_APPROVE_DELETE=1` can enable deletion approval independently; it also preserves explicit denies.

The TUI startup flag injects an **allow-all base UNDER your config** for ordinary tools. A matching explicit `ask` still prompts for an ordinary operation, and a `deny` still blocks. Deletion confirmation uses the separate startup grant after deny checks, so an ordinary `*: ask` is not a way to turn that deletion grant off.

`mimo run --yolo` and `mimo run --attach <url> --yolo` answer approval requests from their own active invocation with a one-time reply. They do not change the server's shared delete-approval switch. Current continuations and newly created interactive child actors retain the invocation identity; an unrelated run, an old actor generation, an already pending unowned ask, or a disconnected client cannot borrow it. Existing system/background non-interactive routing still applies. Run correlation is not a persisted permission grant.

The runtime `/skip-permissions` toggle remains independent of deletion approval: it auto-allows ordinary asks after deny checks, while forced deletion asks still require confirmation unless deletion approval was separately enabled. Permission-ask timeout is configured independently; without a timeout, an ask can wait indefinitely. The legacy `MIMOCODE_SKIP_ALL_FORCED_ASK_TIMEOUT_MS` initializes that timeout when set.

In the TUI the flag is gated by a one-time red confirmation on startup (you must explicitly accept the risk); the prompt is skipped when there is no TTY, so in CI / piped-stdin the dangerous mode activates with no confirmation. This is dangerous — a malicious prompt, file, or plugin can then run arbitrary commands without confirmation. Only use it where you fully trust the workspace.

## Notes

- Rules are evaluated in your original insertion order and **the last matching rule wins**. Put the `*` catch-all **first** and more specific patterns after it — a `*` placed last would shadow everything above it (e.g. a trailing `"*": "ask"` makes preceding `allow`/`deny` rules dead code).
- `external_directory` governs reads/writes outside the project working directory — by default these prompt, so MiMoCode never silently widens scope.
- Permissions cannot be modified by custom tools/hooks — they are the one system the self-extension surface can't override.
