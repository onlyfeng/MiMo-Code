# 显式 harness 选择与 legacy GPT 别名

Codex 提示词、紧凑工具集和 MCP 发现方式现在只由显式 session 或进程选择启用。
模型名称、API ID、family 和 `harness_model` 都不再自动选择 Codex。
已有模型配置仍可保留 `harness_model`，例如：

```jsonc
{
  "provider": {
    "my-gateway": {
      "models": {
        "coding": {
          "id": "deployment-prod",
          "harness_model": "gpt-5.6-sol"
        }
      }
    }
  }
}
```

选择 `my-gateway/coding` 时，API 请求仍使用 `deployment-prod`。
`harness_model` 是为旧配置保留的身份元数据，不再产生 harness 选择效果，也不用于
API 模型、传输、认证或价格选择；它不会探测供应商实际运行的模型。

`harness_model` 接受完整小写 GPT-5 及之后的标识，如 `gpt-5`、`gpt-5.6-sol`、
`gpt-6-astra`；路径前缀、空白、通配符以及 MiMo、GPT-4、OSS 标识不合法。
此格式校验继续保留，以兼容已有配置。填写有效值也不会启用 Codex。

优先级为：

1. session 显式 `codex` 或 `default`，分别启用 Codex 或默认 harness；即使进程值为 false，session 显式 `codex` 仍生效。
2. session 为 `auto` 或未指定时，进程 `MIMOCODE_CODEX_MODE=true` / `false` 分别选择 Codex / 默认 harness。
3. 两者均未显式选择时，所有模型使用统一的默认 harness，不再按模型身份推断。

第一条真实用户请求持久化 session 的 harness 选择；普通聊天文本不会修改该选择。
独立的 MCP Tool Search 显式开关继续独立生效。为兼容旧配置，别名元数据仍来自
已解析的 provider 模型配置快照；目录或插件返回的同名字段不能自行新增或替换声明。
正常重新加载配置会建立新快照。

提示词、工具注册、MCP、冻结前缀捕获和 exec 共用解析规则，重试沿用原请求的决定。
别名声明仍参与前缀缓存隔离，但不决定 harness。前缀 profile key 统一包含 harness
策略版本，捕获、运行循环和 compaction 会同步避开旧策略的提示词与工具快照。
普通会话在新策略下重新捕获前缀；已有冻结 Actor 的工具合同不匹配时仍拒绝重绑，
需要新建上下文，不能借策略升级扩大旧 Actor 的工具权限。

行为边界及测试记录见 [FD-005](upstream-deviations.md#fd-005--one-resolved-mimo-identity-selects-prompt-discovery-and-tools)。
