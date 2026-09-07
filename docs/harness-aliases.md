# 显式 GPT harness 别名

自定义部署名可以通过模型配置的 `harness_model` 声明其 GPT 身份，让自动模式选用
Codex 提示词、工具集和 MCP 发现方式。例如：

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

在已有供应商配置中加入该模型声明后，选择 `my-gateway/coding` 即可。API 请求仍使用
`deployment-prod`。声明用于选择交互方式，不探测供应商实际运行的模型。

`harness_model` 接受完整小写 GPT-5 及之后的标识，如 `gpt-5`、`gpt-5.6-sol`、
`gpt-6-astra`；路径前缀、空白、通配符以及 MiMo、GPT-4、OSS 标识不合法。
未配置时，显示名称或 API/family 别名不会单独触发新的 Codex 推断。

优先级为：

1. session 显式 `codex` 或 `default`。
2. 进程 `MIMOCODE_CODEX_MODE` 的显式 true / false。
3. 自动推断：完整实际模型身份中的 MiMo、GPT-4、OSS 排除优先；然后考虑可信声明与原有模型标识。

第一条真实用户请求持久化 session 的 harness 选择；普通聊天文本不会修改该选择。
独立的 MCP Tool Search 显式开关继续独立生效。别名配置只从已解析的 provider 模型配置
定权，目录或插件返回的同名字段不能自行开启。配置解析完成时会保留声明快照；
插件配置钩子随后修改同名字段，也不会新增或替换信任。正常重新加载配置会建立新快照。

提示词、工具注册、MCP、冻结前缀捕获和 exec 共用解析规则，重试沿用原请求的决定。
别名声明也参与前缀缓存标识，修改声明后不会误用之前的提示词与工具快照。

行为边界及测试记录见 [FD-005](upstream-deviations.md#fd-005--one-resolved-mimo-identity-selects-prompt-discovery-and-tools)。
