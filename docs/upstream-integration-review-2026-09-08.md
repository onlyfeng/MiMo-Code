# 2026-09-08 已确认 upstream 能力融合复核

## 范围与基线

本次接续上一轮明确确认的三项能力：exec 内 Actor 编排、Claude MCP 导入后自动连接、外部 API 指定 Actor 恢复。原 Agent 的未提交实现先备份并复制到独立工作树；原工作树保留。其他新候选仅列出供确认。

- 复核起点：fork main `588d183d5e8b944fa613205e55b41d805d7d5231`；dev/compat `9d076e1bd1ec13d6a5f1a62459d13585c25f2b55`。
- 已选 upstream 行为基线：`6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`。本次按指定能力接续，不推进 upstream/main 引用或整体同步审查基线。
- 正式发布核查：2026-09-08 通过 GitHub Releases API 核对；最新仍为 [v0.1.14](https://github.com/XiaomiMiMo/MiMo-Code/releases/tag/v0.1.14)，发布于 2026-09-02，标签 commit `2a0eb706e95a77cba34a319e9f11f33f26d4450c`。
- 音频 API、模型发现与临时令牌代理、可信 harness 别名、内部 Actor 恢复、Codex compact 工具注册均已在起点提交中存在；不能重复计作待融合。

## Capability inventory (3)

| ID            | 选定能力及实现                                                                               | main 结果            | dev/compat 结果      | Owner 与决定性证据                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------- | -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EXEC-ACTOR-01 | 已获授权的 exec 以窄接口调用 actor send/status，完整生命周期操作仍由直接 actor 提供          | 已实现；本地验证通过 | 已继承；本地验证通过 | main；FD-006、FC-001、DC-ACTOR-001；tool/actor.ts、tool-script.ts；actor-exec、codex-compact、tool-script 回归                                                                 |
| MCP-AUTO-01   | MiMoCode 按名称配置 auto_connect:true，显式选择 Claude 导入项；enabled:false 优先            | 已实现；本地验证通过 | 已继承；本地验证通过 | main；FC-004、DC-NET-002；config/config.ts、config/mcp.ts、mcp/index.ts；config、claude-auto-connect、lifecycle 回归                                                           |
| API-ACTOR-01  | recovery/resume 的 agentID 仅选择直属已注册 persistent/full-context Actor；拒绝 task_id 替换 | 已实现；本地验证通过 | 已继承；本地验证通过 | main；FC-001、FD-009、DC-CONTEXT-001、DC-ACTOR-001；server/routes/instance/session.ts、actor/spawn.ts、session/prompt.ts；session-actor-recovery、session-recovery、spawn 回归 |

实际行为与操作方式见 [compact 工具](codex-compact-tools.md)、[Claude MCP 自动连接](claude-mcp-autoconnect.md)、[Actor 恢复 API](actor-recovery-api.md)。没有新增 compat 专属能力；传播时保留其冻结 turnContext、请求 preflight、UTF-8 内容上限、每 agent MaxMode 和生成契约。

## 复核发现与修正

- 原未提交实现中，nested Actor 校验直接比较注册配置键与显示名，合法重命名 subagent 会被拒绝。接续修正为解析注册身份后校验同一 Agent 对象，并加入先失败后通过的回归。
- 外层 exec Effect 被直接中断时，原正常返回/错误路径的清理不会运行，独立 bridge fiber 可遗留。接续补局部 scope finalizer，关闭接收、取消并等待嵌套调用清理；进一步复核发现纯 guest 未完成 Promise 不会触发字节码轮询，补主动 AbortSignal 并等待虚拟机释放，覆盖真实 hook finalizer、挂起脚本及 timer/listener 清理。
- 补齐 main recovery 的 task_id 拒绝测试，分别覆盖省略 agentID 和显式 main，确认旧候选不变。
- 收敛 Actor 错误事件文案：HTTP 不新增主会话失败上报，不声称底层同 sessionID 的 processor 事件被隔离。
- MCP 自动连接使用真实 HTTP/stdio transport 验证；保留默认 pending、手动连接、禁用优先、实例隔离及原进程清理。
- 首次远端 CI 发现两处旧测试仍排除所有 nested actor，已改为精确校验仅 send/status，完整生命周期仍在直接 actor；新增普通 subagent 即使配置 actor:allow 也不能取得该接口的回归。
- 新 HTTP 恢复测试与同分片的独立 SessionPrompt 单元测试共享全局 captor，后者退出会清空已预热 AppRuntime 的引用。已用两个真实 producer 复现；常规应用入口复用单例 AppRuntime，未发现同样运行路径。按已有 stdio 测试模式，为 HTTP 整个文件设置独立 CI 进程，保留 main 8 项、compat 9 项逐项 JUnit 校验、发现检查和零执行拒绝；没有伪造冻结上下文或修改运行时协议。

## 验证与发布证据

主实现为 `cedd542f215424ccde54d0a779b6747dc2b34d28`，compat 行为为 `972b3b3195e1ef3b9cba7ab4e3989046164c7aad`；行为证据另见两份 registry history。默认路径清除环境中的 MIMOCODE_EXPERIMENTAL、MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH、MIMOCODE_CODEX_MODE，并额外清除当前环境的 MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL。上下文/压缩验证另清除 MIMOCODE_COMPACTION_MAX_CONTEXT、MIMOCODE_COMPACTION_TRIGGER_RATIO、MIMOCODE_DISABLE_CHECKPOINT。保留包 preload 的 MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true、MIMOCODE_DISABLE_DEFAULT_PLUGINS=true 和隔离数据库、home、模型 fixture；选择器专项测试仅在其子进程启用目标项。

主分支四个 exec/actor 文件 135 项、sandbox 全文件 31 项、MCP 配置及真实传输 88 项、MCP 生命周期/OAuth 37 项、接口/前缀 13 项通过；Actor recovery/spawn 审计 79 项通过。若干聚焦复跑与这些组重叠，不把它们相加为独立测试总量。早期 Actor 审计仍带 `MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL=1`，最终工具/config/contract 检查清除此变量；远端默认环境结果以最终 SHA 的 CI 为准。opencode 和 SDK 的包级 typecheck 通过，lint 零错误；SDK/OpenAPI 已从各分支源码生成。

compat 工具与 sandbox 矩阵 168 项、MCP 矩阵 126 项、API/生成契约 16 项、HTTP Actor 冻结上下文 9 项全部通过。完整上下文/Actor/prefix/overflow/checkpoint 矩阵为 303 pass、2 个原有 skip、0 fail；两个 skip 是已有 Bash 取消计时夹具，本次未新增跳过。HTTP 回归覆盖 append/replace-agent 和同目录/独立目录 peer，并验证修改 live context 后 Unicode 冻结内容只出现一次。

首次发布的 main `9b3823b7` 和 compat `a03186c0` 均为 lint/typecheck 通过、test 第四分片失败，不能视为交付成功。后续测试/CI 修正来源为 main `224920e08eb3506214f540f1411cc7bd9f26a87e`、compat `100abd923867627ac9de7998993b5d4e51e92d92`，本地整分片结果追加于 registry history；最终交付以修正后远端精确 SHA 的 test/typecheck/lint 结果为准。

本次只有功能与生命周期验证，没有真实模型 token、错误率、任务完成率的对照实验，不据此声明效率提升。

## 已正式发布、仍待再次确认的候选

以下均在 [v0.1.13](https://github.com/XiaomiMiMo/MiMo-Code/releases/tag/v0.1.13)（2026-08-19，`67c9cf1e26288d03c65fb844be71f39581ffc1de`）已存在，v0.1.14 仍保留；本次不实施。

| 候选                                    | 已发布源码证据                                                              | fork 差异与建议                                                                                                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 聊天请求 input_audio，直接理解音频      | v0.1.14 llm-server/protocol.ts 的 ContentPart/audioPart/toModelMessages     | fork llm-server/protocol.ts 仅 text/image_url；ASR 转文字不等于音频理解。建议优先确认，中等成本，补显式入口的格式、大小和能力验证                                     |
| 非 OpenAI 形状多模态模型的 ASR SDK 回退 | v0.1.14 llm-server/completions.ts 的 transcribe()/start() SDK 分支          | fork audio/service.ts 的 resolveTransport 仅支持 OpenAI/Azure/OpenAI-compatible ASR 聊天路径。建议与 input_audio 合并设计，逐 provider 验证，不能泛称所有音频模型可用 |
| 音色设计与参考音频克隆                  | v0.1.14 llm-server/protocol.ts 与 completions.ts 的 voice design/clone 分支 | fork audio/protocol.ts 的 voice 仅字符串预设，现有文档明确排除。低优先，先确认实际用途，中高成本                                                                      |

开发分支已在 [#2336](https://github.com/XiaomiMiMo/MiMo-Code/pull/2336)（main `534f32d86f38e0a69f8804eb6e7f7a83674eed1d`，2026-09-07）删除 `/v1/audio/*` 和 voice design/clone。该调整尚未正式发布，既不能列为新发布能力，也不作为本次删除 fork 已适配音频功能的授权。

以下是仍保留的已发布行为差异，需具体产品需求后才能重新评估：隐式额外监听、API 远程图片 URL/自由 provider_options、多模型或永久令牌、任意 agent/task 恢复、固定 90% 忽略 reserve、yolo 连带开启删除自动批准。它们有 FD/FC 对应记录，并非遗漏。Web/App/Desktop 按当前仓库范围不作为本轮融合目标。
