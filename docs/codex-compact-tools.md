# Codex 紧凑工具模式

最终 harness 为 `codex` 时自动启用，无需单独实验开关。此能力融合自 upstream
v0.1.14 的紧凑声明与隐藏工具注册实现，并保留 fork 的权限、冻结上下文和交互流程。

## 如何启用

- 会话显式选择 `codex`：启用。会话显式选择 `default`：使用原生工具列表。
- 会话为 `auto` 时，启动进程的 `MIMOCODE_CODEX_MODE=true` / `false` 分别强制
  Codex / 原生 harness；未设置时由模型身份自动判断。
- 自动识别支持 GPT-5 及更新模型、已配置的可信 `harness_model` 别名；继续排除
  MiMo、GPT-4 和 OSS。优先级仍是 **session → process → inference**。
- `MIMOCODE_ENABLE_EXEC_TOOL=true` 只给非 Codex 模式额外提供 `exec`，不精简其
  顶层工具。MCP 搜索与 Bash 输出过滤开关也不控制此模式。

## 使用表现

模型通常通过 `exec` 接收精简的 TypeScript 工具声明，运行时仍保留完整参数校验和
已授权工具的执行实现。工具名称不在顶层声明中，也不意味着执行权限被移除。

| 能力                              | Codex 调用方式                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------- |
| shell                             | `exec` 内 `tools.exec_command({cmd: "git status"})`，或原参数形态的 `tools.bash` |
| 修改文件、查看图片                | `tools.apply_patch`、`tools.view_image`                                          |
| 任务、技能、已启用的定时任务      | `tools.task`、`tools.skill`、`tools.skill_search`、`tools.cron`                  |
| MCP                               | 查询 `ALL_TOOLS`，按实际名称调用 `tools[name](args)`                             |
| actor 创建、发送、恢复等          | 保留直接 `actor` 工具及其完整合同                                                |
| 提问、计划确认、session、workflow | 已启用且获准时保留直接工具                                                       |

`wait` 是上游预留名称，本 fork 没有新增独立 `wait` 工具。结构化输出请求仍单独暴露
`StructuredOutput`。工具的 `invocation_style` 决定实际输入形态，按当前声明调用；例如
配置为 shell 形态的任务工具使用其 `{script: ...}` 声明。

```js
const result = await tools.exec_command({
  cmd: "git status --short",
  yield_time_ms: 10000,
})
return result.output
```

这里 `yield_time_ms` 是命令超时，单位毫秒；到期终止命令，不生成可恢复的后台终端。
默认命令超时及输出预算分别为 10000 毫秒、10000 token。外层 `exec.timeout_seconds`
仍表示秒数的计算时间预算；等待工具不消耗计算时间，另有 30 分钟总时限。

每条嵌套 shell 命令仍经过 Bash 的路径、权限和删除确认。TUI 审批显示实际命令。
任务和技能等工具同样受进程本次请求的权限、agent/actor 白名单和用户工具开关限制。
`exec` 结束时先停止接收调用，再取消执行并等待清理完成。

图片等附件由宿主转发给模型，不穿过脚本的 JSON 返回值；每次 `exec` 最多转发
8 项附件、总计 10 MiB 编码数据。超额会给出未转发提示。原有 128 KiB 代码、
256 KiB 文字结果及嵌套记录限制继续生效。

## 与 upstream 及历史实验的关系

采用 upstream 的生产紧凑声明、隐藏实现注册和 shell 适配思路；保留少量直接控制入口，
以支持 fork 的完整 actor 恢复与 TUI 交互。隐藏工具的直接调用仍可兼容；Codex 的
隐藏 MCP 直接调用不再要求先调用不可见的搜索工具，权限检查仍执行。非 Codex 显式
MCP 搜索模式继续要求先加载再直接调用。

完整工具池和模型可见名单分别冻结。插件重载不能向已经发出的请求或旧 actor 上下文
增加工具；隐藏工具 schema 与冻结版本不同则拒绝重绑，需要新上下文。compaction
保持禁止执行工具，并仅按实际可见声明计算工具预算。actor 的原接收方、取消、持久化
任务来源及恢复准入规则继续生效。

[2026-09-07 数据工具实验](experiments/tool-schema-2026-09-07.md)继续作为独立实验保留。
其 read/glob/grep 的 2.67% 估算不能作为此次 Codex 模式的节省比例；本轮功能测试也
不证明真实模型 token、错误率或任务完成率改善。
