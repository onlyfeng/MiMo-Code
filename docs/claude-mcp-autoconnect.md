# Claude MCP 导入后的自动连接

Claude Code 的 MCP 配置仍默认导入为 `pending`，不会仅因被发现就启动进程或连接服务器。
可以在 MiMoCode 配置中按名称显式开启自动连接，不必复制 Claude 配置中的命令、URL 或凭据。

例如，`~/.claude.json` 或当前工作目录的 `.claude.json` 已有名为 `filesystem` 的
`mcpServers` 项，在该工作目录的 `mimocode.json` 或 `mimocode.jsonc` 中添加：

```json
{
  "mcp": {
    "filesystem": {
      "auto_connect": true
    }
  }
}
```

重启该工作目录的 MiMoCode 实例后，MCP 初始化时会尝试连接 `filesystem`；其他导入项仍为
`pending`。本地类型会启动配置中的命令，远程类型会建立 MCP 连接。需要 OAuth 的服务器仍走
现有授权流程，可能显示 `needs_auth`，不会因为打开此选项就跳过登录。

在 TUI 输入 `/mcps` 查看状态，选中服务器后按空格可手动连接或断开。
`mimo mcp list` 也可以查看状态；这个命令会初始化 MCP，因此会尝试连接显式开启的服务器。
远程 OAuth 授权使用 `mimo mcp auth <名称>`。手动断开不修改配置，下次实例初始化仍按配置执行。

| 配置                  | Claude 导入项                  | MiMoCode 原生项                |
| --------------------- | ------------------------------ | ------------------------------ |
| 未设置 `auto_connect` | `pending`，等待手动连接        | 保留原有自动连接行为           |
| `auto_connect: true`  | 尝试连接                       | 尝试连接                       |
| `auto_connect: false` | `pending`                      | `pending`                      |
| `enabled: false`      | `disabled`，优先于自动连接设置 | `disabled`，优先于自动连接设置 |

这些选项控制初始化行为；显式手动连接仍可连接 `pending` 或 `disabled` 项。连接后工具仍受
现有权限、agent 工具范围及请求内工具开关约束，自动连接不授予额外工具权限。

要停止后续自动连接，可以设为：

```json
{
  "mcp": {
    "filesystem": {
      "auto_connect": false
    }
  }
}
```

也可使用原有的 `{ "enabled": false }`。如果同时设置两者，`enabled: false` 优先。
Claude 来源本身的 `disabled: true` 或 `enabled: false` 也会保留，单独设置
`auto_connect: true` 不会把它改成启用。

配置合并遵循以下规则：

- 同名的完整 MiMoCode `type` 加 `command`/`url` 配置优先于 Claude 导入项。
- Claude 当前目录配置覆盖同名 Claude home 配置；MiMoCode 的单项 `enabled`、`auto_connect`
  控制叠加到最终导入项上。授权以服务器名称为单位，实际启动的是这条来源优先级选中的配置。
- 单项控制不创建服务器；没有对应原生或 Claude 定义时不会启动任何内容。
- Claude 文件中的 `auto_connect` 字段不会被导入为授权；该选项必须写在 MiMoCode 配置中。
- 若已用 `MIMOCODE_DISABLE_CLAUDE_CODE_MCP` 或 `MIMOCODE_DISABLE_CLAUDE_CODE` 禁用导入，
  `auto_connect` 不会重新启用导入。

自动连接复用现有连接、超时、错误脱敏和实例清理流程。不同工作目录的实例分别维护连接状态，
不会因为一个目录开启某个服务器，就在另一目录自动连接同名导入项。
