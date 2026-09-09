# 已发布模型 API 能力融合审查

> Historical snapshot: dedicated audio endpoints and capability selection described here
> were superseded by the [2026-09-09 audio convergence](audio-upstream-alignment-2026-09-09.md).
> Use the current Model API guide for supported behavior.

本轮只融合用户批准的 **1 → 2 → 3 → 5 → 6 → 7**，第 4 项音色设计与克隆跳过。
这是指定能力整合，不是全量 upstream 同步。

## 固定审查范围

- 正式版本来源：`v0.1.14`，`2a0eb706e95a77cba34a319e9f11f33f26d4450c`。
- fork main 起点：`2d90dfd732a95dc5e5e601e783994860abddde1f`。
- fork compat 起点：`3737e4d32a3cfd61a843ef55fd11c6b8dbc35d12`。
- 最终运行时/测试实现：`07ca6cea1ac8a3231701d4ec07b489b713741cd7`。
- 内置说明内容：`3cb9d8df7d453d8995de22f3242eee4bc81f6e97`。
- 整体 upstream 审查基线保持 `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`。
  本轮没有推进该 ref，也没有合并其后的未发布 upstream 变更。

六项均由 main 持有，compat 继承同一实现；以下是待发布代码的审查结果。
实际传播、远端 tip 与对应 CI 必须在发布后另行核对，不能由本页的本地结果推定。

## 能力清单（N=6）

| ID | 采用结果 | 决定性实现与测试（相对 `packages/opencode`） |
| --- | --- | --- |
| MEDIA-01 | 接受公网 HTTP(S) 图片；每跳检查所有 DNS 地址并固定实际连接 IP，保留原 Host/SNI；最多 5 次跳转，5 MiB/图、25 MiB 总媒体限制 | `src/llm-server/images.ts`；`test/llm-server/images.test.ts`、`chat-completions.test.ts`；真实 Node HTTP/TLS/取消专项 |
| AUDIO-02 | 支持严格内联 `input_audio`，与图片共享总预算；格式、模型能力及实际 SDK 传输均需支持 | `src/audio/input.ts`；`test/llm-server/chat-protocol.test.ts`、`chat-completions.test.ts` |
| ASR-03 | Google/Vertex 音频语言模型可经 SDK 转写；发现与执行同门；保留旧 raw ASR/native TTS；仅完整非空正文、无工具调用成功 | `src/audio/service.ts`、`src/llm-server/sdk.ts`；`test/audio/sdk-transcription.test.ts`、`test/server/model-api.test.ts` |
| OPTIONS-05 | 客户端 `provider_options` 限于真实模型/传输白名单；拒绝未知/保留键；保留默认值、顶层 variant 和可信插件钩子；校验先于图片下载 | `src/llm-server/provider-options.ts`、`sdk.ts`；`test/llm-server/chat-completions.test.ts` 中真实供应商 wire、预算、优先级及共享对象隔离测试 |
| SCOPE-06 | 显式单/多模型或全部模型；空列表不是全部；重复 CLI `--model`、`--all-models` 和续签全链一致；v1 保持等价范围，仅真实变更时锁内原子升级 | `src/llm-server/scope.ts`、`tokens.ts`、capability/HTTP/audio/CLI 消费方；`test/llm-server/token-scope.test.ts`、`test/server/model-api.test.ts`、`test/cli/llm-server.test.ts` |
| EXPIRY-07 | 默认 1h 闲置/24h 绝对期限；每个 `none` 独立取消，仅两项均取消才永久；v1 仍严格有限，v2 必须显式存储数值或 null；撤销仍有效 | `src/llm-server/tokens.ts`、`src/cli/cmd/llm-server.ts`；`test/llm-server/token-expiry.test.ts`、真实 HTTP 永久令牌撤销与跨目录 CLI 续签 |

## 保留的边界

普通 TUI、ACP、嵌入实例和未显式开启的服务仍不开放模型 API；持有 token 不会开启接口。
鉴权先于 body/实例 bootstrap，目录固定，Basic auth 独立，静态音频密钥模式互斥。
共享 SDK 保留 ProviderTransform、模型配置、可信 params/headers hooks、零 SDK 重试及取消/drain。
输出计数只排除 `start-step.request` 中回带的输入，其他事件继续受 16 MiB 上限约束。
永久令牌不会取消任何请求期限、并发、媒体或输出限制。

`provider_options` 按本地安装 SDK 的实际 wire 支持确定；它不保证所有远程服务或同名模型都可用。
MiMo 的本地 Responses 传输仍不支持客户端 thinking 选项；没有为此修改共享 provider/SDK。
Google thinking budget/level 切换保留独立字段，Anthropic output 与 thinking 总额在可信钩子后再次校验。

本轮没有恢复音色设计/克隆，也没有扩大 actor/task 权限、TUI MaxMode 或 session 编排能力。
图片下载器独立于 WebFetch：compat 的 WebFetch 私网特例不会授权图片访问私网。

## 全部活动登记复核

分类 D 为既有生产/内置内容路径直接重叠，E 为既有证据路径直接重叠，S 为语义相邻，N 为无相关重叠。
全部 6 FD、16 FC 均完成最终增量静态审查；更新活动 Review basis 不表示这些能力全部改源或重跑测试。
已有日期历史保持原样。

| 分类 | 活动条目 | 本轮结论 |
| --- | --- | --- |
| D+E | FD-004 | 显式 API 主 owner，更新媒体、SDK、options、scope 与有限默认/显式期限取消合同 |
| N | FD-001；FC-001、FC-002、FC-012、FC-014 | 既有授权、actor/checkpoint、发布路由、Cloud Agent bootstrap 语义保持 |
| S | FD-002、FD-005、FD-006、FD-009；FC-003、FC-004、FC-005、FC-006、FC-009、FC-010、FC-013、FC-015、FC-016 | 核对身份、hooks、网络、取消和预算邻接；没有借 API 整合改写这些 owner 的生产合同 |
| E+S | FC-007 | 既有 model-api 测试文件直接修改；生产固定 cwd 与受保护根保持 |
| S | FC-008 | API 资源取消及 CLI 测试生命周期邻接；子进程 20 秒、finally kill/2 秒 drain、多启动 case 60 秒；不是完整 workflow 重测 |
| D | FC-011 | 内置 SKILL/commands/model-api 内容直接变化，与源实现逐项对齐；单列内容 SHA |

全部 7 个 compat DC 已按起点 overlay 预审：DC-PLATFORM-001 无重叠，其余 DC-NET-001/002、
DC-MODEL-001、DC-CONTEXT-001、DC-ACTOR-001、DC-TUI-001 为语义相邻。
真正传播后仍需核对实际 overlay、私网 WebFetch/MCP 哨兵和图片公网限制。
MCP 配置哨兵只验证客户端构造，不应描述为真实私网连接验证。

## 验证边界

逐项实现均有另一 Agent 独立审查。最终相关矩阵、类型检查、lint 及 Node 结果见本轮追加的
[登记历史](fork-registry-history.md)。测试清除实验、MCP tool search、workflow tool、Codex mode、
compaction max-context/trigger-ratio、disable-checkpoint 七个环境选择器，保留包自带 preload
（包括 orchestrator、隔离 HOME/数据库、固定模型目录和禁用默认插件）。包内 preload 不是生产默认关闭证据。

单独 Node v24.16.0 构建/运行不加载 Bun test preload，并额外清除 orchestrator，使用新隔离
`MIMOCODE_HOME`、固定本地模型目录、禁用模型抓取/默认插件。完整 bundle 的 token scope、
四种期限、撤销、普通四路由 404、runtime/published OpenAPI 省略均通过；图片 Node 专项 7 例通过。
HTTP/TLS 图片测试使用临时本地服务器与受控传输注入，不是线上供应商生成或真实公网图片可用性测试。

本轮未改 SDK/OpenAPI 生成输入，默认 runtime 与已发布 schema 仍同时省略可选 API；不复制 upstream 生成物。
本地工作只在本轮独立工作树完成，旧 Agent 的两处工作树及其 dirty/untracked 内容按起点哈希保护。
