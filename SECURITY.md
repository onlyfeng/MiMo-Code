# Security

## Threat Model

### Overview

MiMoCode is an AI coding assistant that runs locally and can use powerful tools, including shell execution, file operations, and network access.

### No Sandbox

MiMoCode does **not** treat its permission system as a security sandbox. Permissions help users review and control actions, but they are not an isolation boundary.

If you need isolation, run MiMoCode in a disposable container, virtual machine, or similarly restricted environment. Review project instructions and third-party tool or MCP server configuration before allowing them to execute.

### Server Mode

Server mode is opt-in. By default it binds to a loopback address and may be accessed by other processes on the same machine. Set `MIMOCODE_SERVER_PASSWORD` to enable HTTP Basic Authentication. MiMoCode refuses to bind to a non-loopback address without a password unless the user explicitly passes `--no-auth`.

Do not expose server mode to an untrusted network without authentication and appropriate transport security, such as an HTTPS reverse proxy.

### Out of Scope

| Category                       | Rationale                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Authorized server access**   | API access with valid credentials, or after explicitly passing `--no-auth`, is expected behavior. Bypassing authentication is in scope. |
| **Sandbox escapes**            | The permission system is not a sandbox (see above)                                                                                      |
| **LLM provider data handling** | Data sent to your configured LLM provider is governed by their policies                                                                 |
| **MCP server behavior**        | External MCP servers you configure are outside our trust boundary                                                                       |
| **Malicious config files**     | Users control their own configuration; editing it is not an attack vector                                                               |

---

## Reporting Security Issues

Do not report a suspected vulnerability in a public GitHub issue, discussion, or pull request.

This fork does not currently expose a public private-reporting endpoint. For a vulnerability that reproduces on upstream `XiaomiMiMo/MiMo-Code`, use upstream's private [vulnerability reporting form](https://github.com/XiaomiMiMo/MiMo-Code/security/advisories/new). That report goes to the upstream maintainers, not the maintainers of this fork.

If you cannot use the upstream GitHub form, contact the upstream team privately at [support-mimo@xiaomi.com](mailto:support-mimo@xiaomi.com) with the subject `[MiMoCode Security] <brief summary>`. This address is a general upstream support mailbox rather than a dedicated security response service; do not use it for vulnerabilities that exist only in this fork.

For a fork-only vulnerability, use an existing private channel with the fork maintainer. If no such channel is available, request one without disclosing vulnerability details; do not publish the report in a pull request or an upstream tracker.

Include the affected version, environment, impact, reproduction steps, and any suggested mitigation. The initial message should not include credentials, personal data, or exploit code beyond what is needed to reproduce the issue. If the report requires sensitive supporting material, first send a minimal description and ask the team to coordinate a suitable transfer method.

Reports must describe a concrete, reproducible security impact. Automated scanner output or model-generated speculation without validation may not receive a response.

We will make a reasonable effort to acknowledge valid reports, but we cannot promise a specific response or remediation timeline.
