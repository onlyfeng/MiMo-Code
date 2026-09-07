# 指定别名、schema 实验和 actor 恢复实施计划

> **For agentic workers:** Use compose:subagent or compose:execute task by task, with independent review before integration.

**Goal:** 按用户指定范围融合三个能力，并维护 main / dev/compat 的行为与审核证据。

**Architecture:** 三个独立交付单元：模型信任声明由统一 resolver 消费；schema 精简仅在
实验运行器中出现；actor 恢复由 actor 生命周期拥有并调用严格 session runner 准入。

**Tech Stack:** TypeScript、Bun、Effect、AI SDK、现有 SQLite 与测试 fixture。

## Global Constraints

- 设计依据：[S1–S5](../specs/2026-09-07-selected-harness-schema-recovery-design.md)。
- 指定来源 `6203ea2e`，不推进 upstream/main，不融合未指定能力。
- `bun ci` 安装；测试及 typecheck 在 packages/opencode 运行。
- `session → process → inference`、MiMo/GPT-4/OSS 排除、直接权限工具均保留。
- 不增加公开恢复 agentID/task_id selector，不增加 resumeBackground。
- 所有实验数据区分真实 usage、估算、回放以及真实模型任务结果。

默认路径的包级验证在导入 flag 模块前移除以下外部选择器：
`MIMOCODE_EXPERIMENTAL`、`MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`、
`MIMOCODE_CODEX_MODE`、`MIMOCODE_DISABLE_CHECKPOINT`、
`MIMOCODE_COMPACTION_MAX_CONTEXT`、`MIMOCODE_ENABLE_EXEC_TOOL`、
`MIMOCODE_EXPERIMENTAL_TOKEN_EFFICIENCY`。保留包 preload 的
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`；独立非测试默认关闭验证还移除该值。

### Task 1: 显式别名与缓存传播

**Covers:** S1, S2, S5

**Files:** config/config.ts、config/provider.ts；provider/provider.ts；tool/gpt.ts；session/system.ts、
llm-request-prefix.ts、prefix-snapshot.ts、compaction.ts；tool/registry.ts、tool-script-ref.ts、tool-script.ts；
agent/agent.ts；server/routes/instance/experimental.ts；对应 config/provider/gpt/registry/prefix 测试。

**Interfaces:** ConfigProvider.Model / Provider.Model 增加 `harness_model?: string`；
HarnessResolutionInput 增加 `harnessModel?: string`。所有工具/捕获调用传递该值。
session/prompt.ts 的五处传播由 Task 3 文件所有者统一应用，避免同文件并行修改。

- [x] 写并运行 RED：显式部署别名选 Codex；无声明不推断；排除及 session/process 优先级。
- [x] 校验配置 schema 拒绝无效声明，最终 Provider 从配置定权，插件替换不丢失或伪造信任。
- [x] 实现统一 resolver 和全调用链传递；捕获、runLoop 和 compaction 三处 prefix key 携带可选 harnessModel。
- [x] 运行 GPT、provider、系统提示、工具集、MCP、prefix snapshot 与重试相关测试，证明缓存旋转。
- [x] 独立检查需求覆盖，再审代码与调用链；root 统一生成公开 schema 和使用文档。

### Task 2: 可重复工具声明实验

**Covers:** S1, S3, S5

**Files:** script/experiments/tool-schema*.ts；test/experiments/tool-schema*.test.ts；
docs/experiments/tool-schema-2026-09-07.md。

**Interfaces:** 显式 `offline|live` 模式；指定模型、harness、次数、步数/输出上限、结果目录。
候选 read/glob/grep；oracle、访问轨迹、预算和 usage 独立记录。生产 runtime 不依赖实验模块。

- [x] RED：约束与业务字段 description 不丢失；非候选不变；不修改原参数或执行器。
- [x] 实现注释位置白名单和真实 registry/provider/wire 体积记录。
- [x] 用本地 scripted provider 验证任务 oracle、错误分类、步骤上限和输出 usage 归因。
- [x] 隔离配置与 fixture，执行固定 live pair；最终两臂均超时，停止扩大样本，缺失实测字段显式为空。
- [x] 发布实验结果及范围限制，不将离线成功外推为 LLM 完成率，不自动启用生产精简。

### Task 3: 同代 actor 恢复

**Covers:** S1, S4, S5

**Files:** actor/spawn.ts、lifecycle.ts 及必要类型；tool/actor.ts 与帮助文本；
session/prompt.ts；actor 生命周期、恢复、工具及 session runner 测试。

**Interfaces:** actor 边界内显式 resume；候选与持久化父用户由内部解析。保留原公开
SessionPrompt recovery/resume 输入；冻结 context 绑定接收方 Instance/RunDisposal。

- [x] 先应用 Task 1 在 prompt.ts 的五处字段传播，让别名验证独立完成。
- [x] 显式 spawn lifecycle=persistent 仅允许 context=full；验证真实工具创建、中断、恢复及调用者边界，默认 ephemeral 与 run 不变。
- [x] RED：持久 full-context actor 中断后可恢复且 task/system/tools/permissions 不漂移。
- [x] RED：未知 actor、ephemeral 释放、cancel、dispose、换代、过时候选及 busy 均拒绝且不写消息。
- [x] 实现严格准入、候选父用户固定和冻结上下文同代验证，不重新捕获上下文。
- [x] 验证 resume/send/cancel/dispose 竞态，inbox 保留与后继唤醒，旧代完成和通知不能污染新代。
- [x] 独立需求与代码审查；保持 HTTP 主 agent 恢复、现有 actor 生命周期和 task 来源回归通过。

### Task 4: 分支传播和证据收尾

**Covers:** S1, S5

**Files:** SDK/OpenAPI 生成物；FD/FC/DC 登记；fork 与 compat 追加式历史；使用和迁移文档。

以下为发布验收顺序。各分支最终行为基准和本地证据写入追加式台账；远端、CI 与清理
结果按最终提交核验，不以本计划中的实现勾选代替。

- 核对三项 inventory 的最终源码、测试、文档与兼容对应。
- 执行最终受影响测试矩阵、包级 typecheck、lint、Node 与生成幂等检查。
- 提交源码，更新全部相关登记的行为基准，文档-only 提交不改变源码基准。
- 创建兼容工作区，语义传播并保留七个 DC；compat 自行生成、测试与记录。
- 推送 fork main 和 dev/compat，验证最终精确 SHA 的全部 CI、远端和祖先关系。
- 核对并清理本轮临时资源，保留用户其他分支，报告三项各自结果和实验结论。
