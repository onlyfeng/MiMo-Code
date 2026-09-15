# 2026-09-15 compat 差异审计实施

本页记录 [共享实施清单](audit-followups-2026-09-15.md) 中 compat 自有的 F04/F10 与后续 main 继承。原始完整差异审计仍保留固定快照；实现完成不回写旧清单。

## 固定源码与继承范围

第一批运行时/测试快照 `3cf9deb353c214edb53d096d7e655cebb9ed2bec` 包含 F04 `6bbe65956a40238358488814fbaa0213b34c9db0` 和 F10 `3cf9deb3`，文档整合基线为 `199286decd7881737493c35ac6ffea30fc6e00c9`。

当前本地源码/测试快照为 `0d568184e304666f7129388f2e0d3b9e353f2178`。`d8f6578b` 合入共享 main `8cfc6eca`；`31192b26` 继续合入 `5b34ad08`，统一 F07 的消息身份边界；`0d568184` 合入 `313ca1dd` 的两项动态 gate 回归。这些均为保留双亲的 merge，当前图中包含已接受 main `f10fddb6`。生产文件自 `31192b26` 未变，最后一轮只改变测试。最终接受分支合并、配置描述及其标准生成产物的收敛、当前 head 回归和接受 SHA CI 仍待完成；本页不以旧快照的绿灯替代这些步骤。

## 已实现的语义

F04 取消工具 schema 估算的 80 KiB 截断，使用完整 JSON 语义计算重复引用的每次出现。预检只计算请求实际启用的工具描述，遇到 descriptor/请求序列化错误时返回终态错误，不发模型请求或进入压缩恢复。`auto=false`、未知 context 容量和 bounded hidden agent 的原有旁路保留。UTF-8 omission marker 与分隔符计入内容预算，极小 Actor state 预算不再被 marker 自身突破。内容 wrapper 和后续 provider 转换仍不属于严格总线长保证；更早的回放 helper 也没有统一改成不抛异常。

F10 停止 `active_tools` 双写，新快照只写 tools JSON 的完整 active 标记。旧 nullable 列与 migration 保留，旧行/混合行/显式空 mask 仍能读，完整 JSON 标记优先于旧列。删除无生产调用的 `restoreTools` 二参过滤形式；实际执行保留完整已授权工具池，模型可见集合另行选择，MCP hash 与成员绑定不变。compaction 的请求参数及尾部估算继续通过 `restoreActiveTools(tools, active_tools)` 兼容旧行。

F06 已从 main 继承原子用户提交、同 actor 单调提交时间及 UTF-8 BINARY ID 排序。debug/inbox/prompt/compaction 生产者和 fork/revert/checkpoint、loop-streak、TUI 消费者共同遵循提交顺序；重复请求只接受等价内容，消息或 part 身份冲突回滚。Inbox 删除不在该消息/parts 事务内，未声明整个 drain crash-atomic。无效 checkpoint 水位在临时视图中清除 marker digest，防止后续 collapse 再误裁；持久对象保持原值。TUI 对已加载的撤销边界保留既有桶容量，revert 活跃时禁止消息事件淘汰。完整 coverage route/schema/SDK/cache 继续属于 compat 的 F08 协议，不作为 main 的新增 API。

F06 的严格 `usageRecovered` 只认真实持久化水位。compat 的 preflight 空 cancelled placeholder 可能晚于有效 digest，因此 `d8f6578b` 另将本轮 `skipOverflowCheck` 成功恢复收据传给 `recoverOverflowPlaceholder`。收据只在成功创建 compaction 或 checkpoint rebuild 后置位，在构造下一实际请求前复位；分类仍要求 existing assistant、cancelled、`MessageAbortedError`、精确 overflow-recovery 文本及零 parts。真实取消、近似错误或已有 text/reasoning 内容的中断不会因此恢复。下一轮预检仍执行无进展检查和最多两次恢复的 episode 上限；收据既不放宽水位，也不跳过请求预检。原无进展用例恢复为终态 ModelError，未把 cancelled 占位消息误当作任务完成。

F07 已共享 `afterSnapshot`：按持久消息顺序中的快照 ID 端点识别压缩期间到达的消息，不再以输入数组长度切片，避免过滤掉旧行的投影把已有请求误算成新请求。经既有大工具结果缩减后，summarizer 未见的首个新 `source=user/spawn` 请求及其后全部消息是必留后缀；旧版无 source 行仅按真实、非 synthetic 的文本/文件判为外部请求。可选旧轮次只使用扣除必留后缀后的剩余预算。必留后缀允许超过可选预算；缺 frozen prefix 导致可选预算为零时也不能丢弃新请求。超大请求继续交 compat preflight 和既有 overflow 路由处理，这不是整个尾部必然小于配置预算的承诺。

F07 在同 session/actor 的外部 admission 登记后等待其 settle，在 synthetic continuation 插入前后各检查一次，并删除本轮已过期的 continuation 及 parts。失败或中断的 admission 释放等待；另一 actor 的 pending 请求不阻塞本 actor。新请求不会继承旧 run 的批准收据。最新两项 gate 测试分别固定“hook 已插入而 MCP admission 尚未提交”和“资源仍未释放但 admission fiber 已中断”的真实入口，检查准确删除和后续压缩可继续；当前 compat 只完成静态继承，尚未重跑这两项。

F05/F09/F11 同步继承共享生成器、退役入口清理与生成格式化策略。SDK 保留 compat 的 141 个 operations、coverage 和每 Agent MaxMode schema；code samples 使用共享 callable-v2 生成规则。旧 Actor wake 入口退役，resume 仍使用的执行/通知路径保留。caps、preflight、per-agent MaxMode、模型侧 full Actor、currentTurn/frozen turnContext、TUI 模型元数据和网络/平台政策继续保留。

## 合并检查与验证边界

默认环境显式清除共享实施报告列出的七项 selector，保留包 preload 的 Orchestrator、内存数据库与隔离配置。MCP 测试内部需要搜索模式时只显式开启该目标 selector。各矩阵存在重叠，不汇总成独立测试总数。

第一批 F04/F10 固定快照的证据：

- F04 默认四文件（overflow、UTF-8 truncation、Actor、safe-stringify）：173 pass、0 fail、789 断言；真实 prompt 的 request preflight 子集：12 pass、0 fail、68 断言。包含 1 MiB active/inactive/auto-disabled MCP schema、无模型调用的非法插件元数据和隐藏 agent 旁路。
- F10 独立默认六文件（prefix、capture、compat capture、reopen、frozen refresh、compat projection）：25 pass、0 fail、182 断言；真实 warm legacy、pinned full-context MCP、structuredContent 三例：3 pass、0 fail、52 断言。package typecheck 通过，两项完成独立代码复核。

F06 传播期间的分组证据，包含 `d8f6578b` 收据修正后的受影响回归；不将所有组重称为最终 head 的完整复跑：

- 初轮 chronology、rebuild、loop-streak、分页、TUI coverage/模型元数据和 server/OpenAPI 共 12 文件：159 pass、0 fail、1581 断言。
- overflow、prefix snapshot、UTF-8 truncation、MaxMode、classification integration、checkpoint rebuild 共 6 文件：162 pass、0 fail、537 断言。
- 收据修正后，prompt 的 preflight/overflow/compaction/current-turn/approval/admission 等 53 例：53 pass、0 fail、357 断言，79.26 秒。classify 与 fork/createMessage 子集：38 pass、0 fail、48 断言。opencode 与 SDK package typecheck 通过。
- 按 `./packages/sdk/js/script/build.ts` 标准生成 SDK 并重新导出 OpenAPI；141 个 operations 与 JS samples，coverage/MaxMode schema 保留，产物与 `199286de` 相同。后续 F07 源码与测试合并没有改这些生成输入；配置描述的下一次生成仍需另验。

收据适配前的真实无进展用例曾提前返回 cancelled；修复后定向两例通过。修复后的第一次 53 例矩阵在并发负载下出现三项默认 5 秒测试门超时，不能据历史通过直接排除回归。释放并发窗口后，这三例在原 5 秒门下串行全部通过；最后 53 例矩阵显式使用 15 秒测试壳预算，未改变生产 deadline。早期只清前三项 selector 的较大矩阵继承 workflow 开关，仍归为 opt-in 补充证据。

`31192b26` 和 `0d568184` 只完成静态合并检查：TypeScript 解析及 `git diff --check` 通过，按团队串行窗口安排未启动测试/typecheck。合并产生的相同测试在移除格式差异和纯类型 `as any` 后逐对比较，确认等价才去重：F06 的 fork、迟提交 direct、旧 ID run loop、原子回滚、重复 message/update timestamp、part ownership 六项，以及 F07 的成功 admission、失败 admission、同 actor 成功失败混合、另一 actor 隔离四项。全部保留各一份，新增 post-insert/interruption gate 两项保留；不把重复执行当作新增覆盖。

F04/F10 独占的 overflow、prefix-snapshot、session.sql、llm-request-prefix 和 text-truncate 文件与 `199286de` 无差异；prompt、message-v2 等共享文件按上述运行契约与具体 hunk 保留，不能称整文件未改。后续当前源码回归、最终 PR 审查和接受 SHA CI 另行记录；本地静态继承或早期运行通过不等于远端完成。

## 七项归属

| ID              | 本轮处理                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| DC-NET-001      | 保留批准后私网 WebFetch；无此次生产改动                                                                                |
| DC-NET-002      | 继承共享 MCP 实现；无新私网/OAuth 实网验收声明                                                                         |
| DC-PLATFORM-001 | 保留受限网络与 Windows fallback；无此次生产改动                                                                        |
| DC-MODEL-001    | 保留每 Agent MaxMode；预检旁路与完整 schema 仍在                                                                       |
| DC-CONTEXT-001  | 保留 F04 完整估算/预检与 F10 旧行回读，继承 F06/F07 共享契约并窄适配恢复收据；coverage route/schema/SDK/cache 整套保留 |
| DC-ACTOR-001    | 保留模型侧 none/state/full、currentTurn/frozen turnContext 和极小 state 预算修正；系统 full 与恢复仍在                 |
| DC-TUI-001      | 保留模型元数据展示，消费共享时序、revert 缓存保护与 compat 完整 coverage 协议                                          |
