# 恢复持有冻结上下文的 actor

需要为新子任务保留恢复能力时，在创建时显式选择已有的 persistent 生命周期：

```text
actor spawn general "检查实现" "检查指定模块并报告结果" --context full --lifecycle persistent
```

`--lifecycle persistent` 仅支持 `spawn`，且必须与 `--context full` 一起使用。
省略时仍创建原来的 ephemeral 子 actor；`run` 不接受该参数。持久 actor 会保留冻结上下文，
不再需要它时使用 `actor cancel <actor-id>` 释放。该参数不启用跨进程恢复。
持久 actor 成功后回到可复用的 idle 状态，通过完成通知读取结果、`actor status` 查看状态；
已有 `wait` 契约仅在失败、取消或等待超时时返回，不把成功 idle 当作终止。

当这样的 actor 因执行错误留下中断回合时，可以通过 actor 工具执行：

```text
actor resume <actor-id>
```

该命令继续原来的持久化任务，不接收新的任务文本、`task_id` 或可替换的用户来源。
新工作仍使用 `actor send`；`spawn` 和 `run` 仍创建新 actor。

恢复要求 actor 仍已注册、调用者可管理，而且原接收方实例及运行作用域仍有效。
支持同会话 subagent 和当前会话的直接 peer 子会话；未知 actor、其他父会话的 actor、
main、已明确取消的 actor，以及已经释放上下文的 ephemeral actor 均不符合条件。
进程重启后不能借此重建 actor。隔离 peer 按自己的接收方实例判断，不把父会话通知目标
误当作其运行上下文。

恢复继续使用已冻结的 system、工具和 MCP 成员、权限、模型身份与 watermark。
实际 API 模型、模型 family 或解析后的 harness 决定变化时会拒绝恢复。命令不会重新
捕获当前主会话。并发恢复或其他运行已经占用 actor 时会返回 busy。

原中断 assistant 只在取得运行所有权并验证候选后结算。恢复期间收到的 inbox 消息
排队等待，恢复退出后由已有唤醒流程处理；恢复本身始终属于原来的父用户及 task。
准入前取消调用会撤回请求；准入成功后，中断等待者不会提前释放 actor 的运行代，
停止 actor 仍使用其取消命令。

公开 session recovery/resume HTTP 接口仍只面向 main，不增加 `agentID` 或 `task_id`
选择器，也不增加 `resumeBackground`。这是一项受限的 actor 能力融合，不表示整个
[实例代迁移计划](superpowers/plans/2026-08-19-instance-generation-retirement.md)已经完成。

约束登记见 [FC-001](fork-capabilities.md#fc-001--linearized-actor-generations-and-persistent-peer-lifecycle)
和 [FD-009](upstream-deviations.md#fd-009--frozen-context-capture-fails-closed-before-actor-execution)。
