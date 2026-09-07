# 指定能力融合：GPT 别名、工具声明实验与 actor 恢复

## [S1] 范围与来源

用户指定继续处理三个推荐能力。来源保持 upstream
`6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`；本轮不推进 upstream 审核基线。
起始 main 为 `4d876d54a304689db1f86e5f6f8f0da577d0f5d4`，起始 dev/compat 为
`a6cbcb3b61a98eb9abbe5e1aa2a06880f1c5f286`。实现由 fork main 持有，再传播至 dev/compat。

Capability inventory N=3：

| ID | 指定行为 | 主体与关系 | 约束与兼容检查 |
| --- | --- | --- | --- |
| ALIAS-01 | 显式可信 GPT 别名选择 Codex harness | FD-005；适配 upstream 的 API/family 别名推断，使用配置声明而非宽泛子串 | FD-002、FC-002/004/013 与 DC-MODEL/CONTEXT/ACTOR；统一调用及缓存键 |
| SCHEMA-01 | 数据工具声明精简实验 | FD-006；仅实验工具描述和 schema 注释，保留直接工具模式 | FC-003/005/007；权限、控制工具、参数校验和执行实现不变 |
| RECOVERY-01 | 持有同代冻结上下文的已注册 actor 恢复 | FC-001 / FD-009；在 fork 生命周期内适配恢复能力 | FC-002/013、DC-CONTEXT/ACTOR；task 来源、原子准入、取消与冻结成员不变 |

## [S2] 可信别名

每个 provider 模型可配置 `harness_model`，例如 `gpt-5.6-sol`。它声明本地模型
应采用的可信 GPT harness 身份，不替换实际 API 模型标识、传输、认证或价格。
字段只接受完整小写 GPT-5 及之后家族标识；不接受路径、通配符、MiMo、GPT-4 或 OSS。

解析顺序仍为显式 session、显式 process、模型推断。推断时完整实际模型身份的
MiMo / GPT-4 / OSS 排除优先于别名。未配置时不凭显示名、API 名或 family 获得新的
Codex 推断。Provider 最终归一化从显式模型配置定权，目录和插件返回的同名字段不能
自行成为信任来源。所有 prompt、MCP、工具注册、exec、prefix capture、agent generation
路径传递相同声明。重试沿用同一请求模型与工具集，不增加独立重试资格判断。

捕获、runLoop 和 compaction 三处 prefix profile key 都包含可选 `harnessModel`；未配置的 undefined 不改变原缓存键。
修改声明必须使旧提示词/工具缓存失效。公开 Config/Provider schema 与 SDK/OpenAPI
从最终源码生成；compat 自行生成并保留其字段。

## [S3] 工具声明实验

实验代码仅在 `packages/opencode/script/experiments/` 中使用，不加生产默认开关。
候选明确限定为 read/glob/grep 的模型可见描述和人工审核的 JSON Schema 注释位置。
不得递归删除所有同名字段；不得改变参数的 required、enum、const、联合类型、引用、
默认值、格式、数值限制或 actual validator/execute。非候选、权限和控制工具的声明
与可见成员保持一致，不能以 `!TOOL_SCRIPT_EXCLUDED` 推断只读权限。

记录真实 registry、provider transform 和 SDK wire 的序列化体积；字符估算与 tokenizer
统计均须标注方法，不充当供应商计费 usage。离线回放不能报告真实模型完成率。
显式 live 模式仅发送合成 system、任务、工具描述和隔离 fixture 内容，固定 oracle 检查
最终答案以及所需文件访问，不由模型自评。默认使用六个任务、两臂、两次重复、最多
三轮和每轮 1024 输出 token、零自动重试，先以一个 pair 做试运行。记录实际模型、
harness、参数、预算耗尽和失败，不调大预算掩盖失败。

Codex 工具成员可能不包含 read/glob/grep。受控数据工具实验显式使用 default harness，
同时报告 auto/codex/default 的实际成员；不能外推为 Codex 默认流量收益。实验先保留为
可重复的评估工具，实际证据决定后续是否将精简纳入请求路径。

## [S4] actor 恢复

新增 actor 边界内的显式恢复操作，只针对可管理的已注册 persistent actor。恢复必须
仍持有原冻结上下文，并证明上下文属于同一接收方 Instance 和未处置的 RunDisposal。
捕获时的 API 模型、family 和 harness 身份发生漂移时也拒绝恢复。
为使用户工具可以创建符合条件的 actor，仅 `spawn` 增加显式 `--lifecycle persistent`，
并要求 `--context full`；它映射已有内部 persistent 生命周期。默认 ephemeral 和 `run`
行为不变，none/state 不接受该选择。不为已结束 ephemeral actor 重建上下文，不从 live context
重新捕获，不支持跨进程恢复，也不恢复已明确取消的 actor。

恢复选取该 actor 最后的有效中断候选，沿用其持久化父用户及 task_id，不接受调用方
提供 task 来源、不创建替代的外部用户请求。内部重试和自动压缩可在本恢复 runner 成功
CAS 写入后，用实际新消息 ID 回执推进当前父用户；回执必须保持原 session、actor、agent、
task 和模型来源。仅有 `source="hook"` 标签不构成授权，CAS 失败不推进。严格原子准入而非 join：并发恢复、send、cancel、dispose
不能重复执行或在拒绝时改写消息。旧 assistant 仅在有效准入及候选验证后结算。
待收 inbox 消息不得抢走恢复父用户，退出后仍须由已有唤醒路径处理，不能丢失。

公开 session recovery/resume HTTP 输入仍只面向 main，不新增 agentID/task_id selector；
不增加 detached resumeBackground。恢复继续使用冻结 system、工具/MCP 成员、权限、
模型及 watermark。运行中的新代不能接收旧代的完成或通知写回。

## [S5] 验证与发布

对每项功能先记录真实失败的回归再实现。默认路径清除外部实验、MCP 搜索和 Codex
选择器；保留并记录包 preload 的 orchestrator baseline。涉及 actor/context 的外部
选择器按原有约束清除，单项 opt-in 测试仅启用所测选项。

执行包级测试、bun typecheck、仓库 lint、必要 Node 运行验证、SDK/OpenAPI 幂等检查，
再完成独立需求与代码审查。复核全部六个 FD、十六个 FC 和 compat 的七个 DC，追加历史
记录，更新本轮推进的行为基准。文档提交不推进源码基准。提交推送后分别证明两条分支
精确 SHA 的 CI 成功、远端一致、main→compat 祖先关系及未纳入其他 upstream 提交。
仅清理本次拥有且已集成的干净工作区和分支。
