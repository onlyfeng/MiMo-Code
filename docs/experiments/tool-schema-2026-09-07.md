# FD-006 数据工具声明精简实验

本实验仅在 `packages/opencode/script/experiments/tool-schema*.ts` 中运行，不修改
普通 TUI、默认注册表、权限、工具执行、配置或模型提示。候选只有 `read`、`glob`、
`grep` 的顶层描述和明确字段描述；原 Zod validator、字段名、required、enum、数值
限制、provider schema 转换及所有非候选工具声明保持不变。

## 设计与证据边界

两臂均取真实 `ToolRegistry.tools`，显式使用 `harness: default`。这让 `read/glob/grep`
可直接调用；默认 Codex harness 原本隐藏这三个工具，因此结果不能代表默认 Codex
工具集合的节省。报告另外记录 auto/codex/default 的成员列表。`exec` 的声明与分发
以及 `TOOL_SCRIPT_EXCLUDED` 均未更改；不能把“可嵌套”理解成“只读”。

注册表接收实际 `modelID`、API ID、family 与 `harness_model`；报告 `modelIdentity`
和 `seed`，以便复查别名和 harness 选择。API 地址、密钥与 transport 配置不进入报告。

所有权限/控制工具仍直接可见，描述和 schema 在两臂中完全一致。实验执行只接受
`read/glob/grep`，调用真实工具与 `Permission.Service.ask`；路径必须位于本轮合成
fixture，读取已存在文件时还必须属于任务声明；fixture 内合法缺失路径交给原工具
报告 not_found，避免误计为权限拒绝。拒绝绝对或越界 glob/include，拒绝符号链接
逃逸。合成 fixture 不包含用户源码、会话、记忆或配置内容。

六个任务覆盖 glob 后 read、grep 后 read、1-based 窗口、include 文件过滤、两个文件
之间的依赖、缺失条目的如实回答。每个重复使用固定 seed；同一对 A/B 共享问题和文件，
执行顺序交替 AB/BA。确定性 oracle 同时检查 JSON 答案与所需文件的成功读取；未读取
证据、provider 错误或耗尽预算均不能通过。
报告中的 `seed` 只控制合成 fixture 内容，不是发送给 provider 的采样 seed，不能据此
声称模型采样过程可复现。

默认 6 任务 × 2 臂 × 2 次，最多每次 3 个模型请求、每请求 1024 个输出 token，
`maxRetries: 0`，单请求和工具各有 30 秒取消期限。最大 72 个模型请求；建议先运行
1 任务 × 2 臂 × 1 次 pilot，并把小样本结果视为探索性证据。

## 离线运行

从 `packages/opencode` 运行以下命令。它使用仓库既有测试 preload 的隔离目录、
内存数据库和默认 `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`，不设置新的 HOME。

```sh
env -u MIMOCODE_EXPERIMENTAL -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH -u MIMOCODE_CODEX_MODE \
  MIMOCODE_SCHEMA_REPORT=/absolute/output/schema-offline.json \
  bun test test/experiments/tool-schema.test.ts test/experiments/tool-schema-runner.test.ts
```

离线使用真实供应商 SDK 向本地 HTTP stub 发请求，捕获完整序列化工具参数。
stub 按预设脚本回复工具调用与答案，仅验证执行/校验链和报告来源。`stubUsage` 是
刻意构造的数据；`providerUsage` 与 `liveTaskCompleted` 为 null。通过率只能称
`replayCompleted`，不能称 LLM 任务完成率。

`catalog.*Measure` 给出序列化 UTF-8 字节、字符数及字符数除四的估算 token，
`exactTokens` 为 null。可对报告的 `wire[].body.tools` 使用外部已核验词表计数，
但必须记录编码名称、版本和词表 hash，不能把该计数称为目标模型的计费 token。

离线 `wire` 来源是本地 HTTP 实际请求；live 来源是 SDK 的序列化 `request.body`，
仅保留 `tools` 字段，绝不保存完整请求、header、URL 或 providerOptions。
`wireEvidence` 记录来源、范围、捕获/缺失请求数与 complete/partial/missing 状态。
失败请求或不提供 request metadata 的供应商可能无法捕获；缺失不能当作零 token，
也不能用 catalog 字段冒充实际 wire。

## 显式 live 入口

live 不负责寻找、复制或打印密钥。调用者先准备专用隔离目录和 0600 配置，只包含
选定 provider/model 与必要 transport 选项；通过现有 `Provider.Service` 加载模型。
不运行 `LLM.stream` 的用户记忆/指令系统提示，也不调用聊天插件。仅发送固定合成
system、任务、工具声明与合成工具结果。

模型请求选项沿用生产 `ProviderTransform.options`：用实际 model、合成 session ID
和 provider 选项生成默认值，深度合并 `model.options`，再经 `providerOptions` 转换。
不会直接把 provider 的 transport 配置（如 apiKey、baseURL、header）复制成模型请求选项。
本地真实 OpenAI Responses SDK 回归验证 store、reasoning、include、cache key 的默认传播
与模型覆盖；它不证明当前 live 模型可达，也不改变单请求 30 秒期限。

CLI 在导入生产 Global/Config/Provider 前检查：

- `MIMOCODE_SCHEMA_ISOLATION_ROOT` 指向现存专用目录。
- `MIMOCODE_CONFIG`、`MIMOCODE_HOME`、`MIMOCODE_TEST_MANAGED_CONFIG_DIR` 位于该目录。
- 设置 `MIMOCODE_DISABLE_PROJECT_CONFIG=true`、`MIMOCODE_DISABLE_DEFAULT_PLUGINS=true`、
  `MIMOCODE_DISABLE_EXTERNAL_SKILLS=true`、`MIMOCODE_DISABLE_CLAUDE_CODE=true`。
- 未设置 `MIMOCODE_CONFIG_CONTENT`；可选 XDG 与 `MIMOCODE_CONFIG_DIR` 也必须留在隔离目录。
- 操作系统隔离必须使真实 `~/.mimocode`、`~/.claude`、`~/.config/mimocode` 与
  `/Library/Managed Preferences` 不可读取（不存在也可）。单设 XDG/MIMOCODE_HOME
  不足以满足此条件。脚本不自动修改系统沙箱或用户配置。

在满足这些前提的环境中，从 `packages/opencode` 执行：

```sh
bun script/experiments/tool-schema.ts --mode live --model provider/model \
  --cases 1 --repeats 1 --max-steps 3 --max-output-tokens 1024 \
  --out /absolute/output/schema-live-pilot.json
```

不传 `--mode` 时默认 offline，CLI 同样要求隔离前提。预检函数
`checkIsolation()` 可独立调用；实验不会输出 provider/config 异常体，以免带出凭据。
CLI 结束时等待项目实例清理，再释放全局 Effect runtime 并关闭数据库；不强制退出进程。

## 评估

逐次记录模型请求数、工具调用数、validator 错误、越权尝试、执行错误、终止原因、
文件访问及 oracle 结果。live 的 `providerUsage` 保留 SDK 原始 usage，分别分析
首请求输入 token、整任务输入/输出、缓存与推理 token；usage 缺失不得当作零。
不要把断流/超时误归类为 schema 错误，也不要用修复后的最终成功掩盖首次参数错误。

provider 失败只记录白名单 `errorCategory`（timeout/http/network/response_parse/unknown）
与数字 `statusCode`，不保存任何原始异常 message、body、header 或 URL。SDK 已生成的
非法 JSON/未知工具错误结果保留一次，同一调用 ID 不重复回复；此类调用计入参数错误。
本地回归覆盖错误后的下一轮恢复、响应解析失败及子进程自然退出。完全没有成功模型
响应的 pilot 属于 transport/协议失败证据，不能用于比较两臂的任务完成率。

声明精简是否有价值由真实 A/B 的输入量、调用错误率和任务通过率共同判断。
离线通过、描述缩小或少量任务通过，均不足以自动将实验接入默认产品行为。

## 本轮结果（2026-09-07）

可复核的汇总、工具声明 hash、词表 hash 与逐臂终止原因见
[结果数据](tool-schema-2026-09-07-results.json)。两臂各有 20 个直接可见工具，
非候选声明和参数约束均保持相等。

| 指标                                  | 原声明 | 精简声明 | 解释                                                     |
| ------------------------------------- | -----: | -------: | -------------------------------------------------------- |
| registry 描述对象 UTF-8 字节          | 78,802 |   76,761 | 减少 2,041 字节（2.59%），尚未包含 SDK 包装              |
| 本地 HTTP stub 的 SDK tools 字节      | 79,422 |   77,381 | 减少 2,041 字节（2.57%）；仅 tools JSON，不是整次请求    |
| 同一 tools JSON 的 `o200k_base` token | 18,342 |   17,852 | 减少 490（2.67%）；tiktoken 0.12.0，不是供应商计费 usage |

离线固定任务共 24 次回放、64 个实际本地 SDK HTTP 请求，24 次 oracle 全部通过，
validator 错误、越权调用和执行错误均为 0；每臂 32 个请求携带相同的工具声明 hash。
本表取自最终 actor spawn `lifecycle` 声明与生命周期说明（含 wait/idle）定稿后的
`schema-offline-release.json`，
声明 hash 和报告 hash 见结果数据。包 preload 的 orchestrator 为 true；这是执行链回放，
不是模型能力评估。运行器的 19 项回归另外覆盖坏 JSON、未知工具后恢复、错误分类、
请求默认选项及 CLI 自然退出，本次重跑为 19 pass、0 fail、113 个断言。
随后仅补充 shell 帮助的 wait/idle 说明，未改变 default harness 的 JSON actor 声明；
定向重跑 24 次回放并比较完整 catalog 和 64 个 tools payload，声明哈希均未改变，
因此上表计数继续适用于最终声明。

真实 pilot 使用当前配置模型 `gz4399-codex/gpt-6-astra`，实际 API ID 为 `gpt-6-astra`、
adapter 为 `@ai-sdk/openai-compatible`，显式 default harness，未启用实验环境选择器。
最终运行器的两臂均在第一次请求的 30 秒期限内超时，工具调用数为 0，usage 缺失，
也未取得成功响应中的 SDK wire metadata。因此有效工具评估样本为 0，schema 错误率和
模型任务完成率均记录为 null，不能归因于声明精简。

该 live pilot 发生在后续 actor spawn `lifecycle` 声明与说明补齐之前，其 registry 声明快照为
77,830 / 75,789 字节，原声明 hash 与原始报告 hash 独立保存在结果数据的
`liveFinalPilot.catalogSnapshot`；这不是成功捕获的 wire。上表的最终声明仅做了离线
重测，未再发送真实请求，不能称为已 live 验证。
两版声明的差异位于 actor 顶层描述及 spawn 分支新增的可选 `lifecycle: "persistent"`
字段；旧 live 快照不含该字段。其余工具声明未变，各版本内部 A/B 的非候选声明仍相同。

本轮总共尝试 6 个真实请求：运行器审查前的 2 个未分类失败、请求默认选项修正前的
2 个已分类超时、最终运行器的 2 个超时。前两组不纳入最终对照；没有提高 30 秒或输出
预算来掩盖失败。专用配置副本与隔离目录已删除，原用户配置未修改。

结论：声明体积有小幅下降，但真实模型收益尚未证实。保留独立实验入口，生产路径继续
使用原声明；后续需要在可完成请求的评估环境中补充调用错误率及任务完成率证据。
