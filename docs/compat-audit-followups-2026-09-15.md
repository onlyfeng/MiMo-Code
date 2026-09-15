# 2026-09-15 compat 差异审计实施

本页记录 [共享实施清单](audit-followups-2026-09-15.md) 中 compat 自有的 F04/F10 与后续 main 继承。原始完整差异审计仍保留固定快照；实现完成不回写旧清单。

## 第一批自有修正

运行时/测试快照 `3cf9deb353c214edb53d096d7e655cebb9ed2bec` 包含 F04 `6bbe65956a40238358488814fbaa0213b34c9db0` 和 F10 `3cf9deb3`。第一批 main PR #128 已接受为 `f10fddb67d830b82890206759c53cef4d8710460`，本地继承提交为 `f48b6e918d683688348d0c8bfc59cd0199fc7fc8`，也是本批完整 compat 运行时/测试快照。FD/FC 与共享报告保持和 main 一致。文档接受点 `b3b32061` 的精确 SHA CI 均已成功。

F04 取消工具 schema 估算的 80 KiB 截断，使用完整 JSON 语义计算重复引用的每次出现。预检遇到 descriptor/请求序列化错误时返回终态错误，不发模型请求或进入压缩恢复。`auto=false`、未知 context 容量和 bounded hidden agent 的原有旁路保留。UTF-8 omission marker 与分隔符计入内容预算，极小 Actor state 预算不再被 marker 自身突破。内容 wrapper 和后续 provider 转换仍不属于严格总线长保证；更早的回放 helper 也没有统一改成不抛异常。

F10 停止 `active_tools` 双写，新快照以 tools JSON 的完整 active 标记为准。旧 nullable 列与 migration 保留，旧行/混合行/显式空 mask 仍能读，完整 JSON 标记优先于旧列。删除无生产调用的 `restoreTools` 二参过滤形式；实际执行保留完整已授权工具池，模型可见集合另行选择，MCP hash 与成员绑定不变。

## 验证

默认环境显式清除共享实施报告列出的七项 selector，保留包 preload 的 Orchestrator、内存数据库与隔离配置。MCP 测试内部需要搜索模式时只显式开启该目标 selector。

- F04 默认四文件（overflow、UTF-8 truncation、Actor、safe-stringify）：173 pass、0 fail、789 断言；真实 prompt 的 request preflight 子集：12 pass、0 fail、68 断言。包含 1 MiB active/inactive/auto-disabled MCP schema、无模型调用的非法插件元数据和隐藏 agent 旁路。
- F10 独立默认六文件（prefix、capture、compat capture、reopen、frozen refresh、compat projection）：25 pass、0 fail、182 断言；真实 warm legacy、pinned full-context MCP、structuredContent 三例：3 pass、0 fail、52 断言。
- package typecheck 通过。早期只清前三项的较大矩阵继承 workflow 开关，属于 opt-in 补充证据，不改称默认。

两项已完成独立代码复核。继承 main 后的默认六文件回归（provider error、debug CLI、harness、Runner tuple、overflow、prefix snapshot）150 pass、0 fail、459 断言、78.97 秒；package typecheck 通过。workflow 继承回归与接受 SHA CI 待确认，本地通过不等于远端完成。

## 七项归属

| ID              | 本轮处理                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| DC-NET-001      | 保留批准后私网 WebFetch；无此次生产改动                                                                    |
| DC-NET-002      | 继承共享 MCP 实现；无新私网/OAuth 实网验收声明                                                             |
| DC-PLATFORM-001 | 保留受限网络与 Windows fallback；无此次生产改动                                                            |
| DC-MODEL-001    | 保留每 Agent MaxMode；预检旁路契约仍在                                                                     |
| DC-CONTEXT-001  | 修正完整估算/序列化失败与新快照双写；通用时序/压缩保护待共享继承；coverage route/schema/SDK/cache 整套保留 |
| DC-ACTOR-001    | 保留模型侧 none/state/full，修正极小 state 预算；系统 full 与恢复仍在                                      |
| DC-TUI-001      | 保留模型元数据展示；时序消费修正待共享继承                                                                 |
