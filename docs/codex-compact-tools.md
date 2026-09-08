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
| actor 创建、发送、等待、取消、恢复等 | 直接 `actor` 或 `exec` 内 `tools.actor`；按调用者身份和当前声明授权              |
| 提问、计划确认                    | 保留直接 `question` / `plan_exit`，也可在获准时嵌套调用；计划确认遵循下述终端规则 |
| session、workflow                 | 已启用且获准时保留直接工具，不在 `exec` 内调用                                  |

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
主 Actor 和已注册 peer 可通过嵌套 actor 调用当前声明中的完整既有动作：
`run/spawn/status/wait/cancel/send/models/resume`。现有恢复准入和 task 绑定范围不扩大。
普通 subagent 不会因此自动获得 actor 工具；已获授权的 subagent 仍只能向真实注册的父 actor 发送消息，不能查询状态或调用其他动作。
调用者身份、目标权限、冻结工具池及禁用开关继续生效；入站参数与工具钩子修改后的参数
都必须通过本次请求捕获的原生 Actor schema，不能借脚本或钩子扩大授权。
使用直接或嵌套 `actor spawn` 返回的实际 actor ID，例如：

```js
await tools.actor({
  operation: { action: "send", to_actor_id: "explore-1", content: "请回报当前进度" },
})
return tools.actor({ operation: { action: "status", actor_id: "explore-1" } })
```

此处始终使用 `operation` 对象，直接 actor 工具配置为 shell 形态时也相同。
任务和技能等工具同样受进程本次请求的权限、agent/actor 白名单和用户工具开关限制。

已声明且获准的 `question` 可在脚本中调用；前台问题发往当前会话，可交互 peer 的问题
按既有交互目标转发，非交互或 system Actor 不创建无人可答的问题。
`plan_exit` 只允许真正的前台 main plan 回合切换为 build，不能借 peer 转发绕过身份限制。
它是独占终端操作：先 `await` 所有其他调用，再请求计划确认。用户批准后，宿主持久提交
build 续跑消息，立即终止脚本并切换 TUI；后续代码（包括 `catch/finally`）不再运行。
拒绝或反馈则返回脚本继续处理。新 build 权限由下一轮重建，不修改当前冻结工具池。

`exec` 结束时先停止接收调用，再取消执行并等待嵌套调用与脚本虚拟机清理完成。
外层运行被中断、脚本等待自身未完成的 Promise 时也走相同清理流程。
中断前台 `actor run` 会取消并等待其拥有的 child 收尾；中断 `actor wait` 只结束等待，
不会取消目标 Actor。已完成交接的后台 Actor 由 supervisor 管理，可跨脚本结束继续运行。

图片等附件由宿主转发给模型，不穿过脚本的 JSON 返回值；每次 `exec` 最多转发
8 项附件、总计 10 MiB 编码数据。超额会给出未转发提示。原有 128 KiB 代码、
256 KiB 脚本序列化返回值及嵌套记录限制继续生效；日志、调用摘要和警告另有原有上限。
记录超限时，每条子记录最多保留 8 KiB 的指定证据字段，数组最多 32 项；过大的字段
或整条记录可能省略。保留下来的有效记录用于文件清单、工作区提示、重试检测和技能
剪枝保护；缺失路径不会被猜成当前工作区发生了修改。

## 与 upstream 及历史实验的关系

采用 upstream 的生产紧凑声明、隐藏实现注册和 shell 适配思路；保留少量直接控制入口，
以支持 fork 的完整 actor 恢复与 TUI 交互。隐藏工具的直接调用仍可兼容；Codex 的
隐藏 MCP 直接调用不再要求先调用不可见的搜索工具，权限检查仍执行。非 Codex 显式
MCP 搜索模式继续要求先加载再直接调用。

完整工具池和模型可见名单分别冻结。插件重载不能向已经发出的请求或旧 actor 上下文
增加工具；隐藏工具 schema 与冻结版本不同则拒绝重绑，需要新上下文。Actor 的原生
动作 schema 与 shell 外层参数分别冻结。旧 JSON 快照只有在其已保存的完整 schema
与当前原生合同精确相等时才可重绑；旧 shell 快照只保存 `script`，无法证明原生合同，
需新建并重新捕获上下文后使用 Actor，不会从 live 工具池补权限。普通主会话的新回合
按变化后的工具快照重建；已冻结 Actor 的 resume 不会自动升级旧快照。compaction
保持禁止执行工具，并仅按实际可见声明计算工具预算。actor 的原接收方、取消、持久化
任务来源及恢复准入规则继续生效。

[2026-09-07 数据工具实验](experiments/tool-schema-2026-09-07.md)继续作为独立实验保留。
其 read/glob/grep 的 2.67% 估算不能作为此次 Codex 模式的节省比例；本轮功能测试也
不证明真实模型 token、错误率或任务完成率改善。
