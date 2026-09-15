> 本文是固定代码快照的审计发现。起点登记的“漏记／过期”已在本轮文档修订中对账；实现缺口与建议仍未实施。逐路径记录随 [coverage.json](coverage.json) 交付，原始补丁可由文末固定 SHA 命令重建。当前结论与处置以 [总报告](../../fork-difference-audit-2026-09-15.md) 为准。

# dev/compat 完整差异审计（固定 SHA，2026-09-15）

本次按 `main=648f7cdf100b30ff046db7518d8f832473b61481` 到 `dev/compat=90abf6e447d7a5e5b405aba301bf1a951f469bf6` 的树差异核对全部 107 个 manifest 路径。共同已选上游为 `5198ff540efb5ca9fff2baa64555324d43a721b9`；没有 fetch、更新 refs、改源码或声明对齐更新的上游。源码行号均对应这个 compat SHA，而非后来改变的工作目录。登记判断基于同 SHA 的 FD/FC/DC 文档。

结果：107 条逐路径记录见 [coverage.json](coverage.json) 的 `files` 数组中 `scope: "compat"` 的记录，其中 44 个行为载体、54 个测试/fixture、9 个文档/工具说明载体；起点登记中 90 条基本准确、7 条局部漏记、10 条含待收紧的契约/证据边界。这里的“准确”仅表示差异与所列归属匹配，不代表本轮测试通过或没有其他 bug。交付记录的 path、classification、summary、drift、recommendation 五个字段与原始 107 条覆盖逐项相同；仅 prompt.ts 的当前 owners 去除了已补登记的 `UNREGISTERED`，原数组保存在 `audit_start_owners`，处置记在 `documentation_resolution`。临时 diff、测试索引和探针脚本属于本地审读过程，不作为本报告附件发布。

## 总体结论

现有七个 owner 大体仍成立，不能按数量全部退休，也不应把七个 owner 当成七个生产分叉：DC-NET-002 只有额外契约和 mock 哨兵，生产 MCP 字节与 main 相同；DC-CONTEXT-001 混合了环境策略、通用正确性修正、旧数据兼容和共享不变量，最值得拆清。模型可调用的 Actor none/state/full 及 persistent/full 创建是明确保留的 compat 政策；main 保留 FD-009 系统级 full runtime，因此不能写成“main 没有 full-context 能力”。

建议优先把通用 SDK 示例生成修正、消息提交/时序、并发压缩不丢新请求等链条提升 main，再在 compat 中删除已共享的对应实现差异。不能先删 compat 再假设 main 局部修正等价。C07 最终生命周期整合没有因为上述保留策略被回滚；本次 diff 中没有 Actor coordinator/lifecycle/runner 等完整生产实现分叉，Actor `spawn.ts` 的剩余生产差异是 `turnContext` 字段，另有 watermark 注释修正。

## 七个 DC 的当前判定

| Owner           | 实际差异与 main 等价情况                                                                                                                                                                                                                                                               | 建议及退出条件                                                                                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DC-NET-001      | `tool/webfetch.ts` 恰好删除 `assertSafeUrl` import 与 initial/redirect 两处调用；`util/ssrf.ts` 字节同 main。HTTP(S)、逐目标权限、manual redirects 与 10 hop 仍继承；timeout 包围响应获取/重定向，5 MiB 检查在 Content-Length 预拒或完整正文缓冲之后，不保证正文流式内存或总时长上界。 | 保留已授权私网策略。未来只有共享、显式配置的私网策略同时维持逐跳权限与资源限制，才可统一。现有新测试仅证明批准后 mock 私网 fetch，原私网 redirect 拒绝测试被删除；可补允许私网 redirect 仍逐跳 ask 的正向用例。             |
| DC-NET-002      | `src/mcp/index.ts` 与 main 同 blob；唯一差异是 `oauth:false` 的 RFC1918 mock-client connected/创建次数哨兵。                                                                                                                                                                           | 保留“契约/测试 owner”，不得描述为独立网络实现。可把 characterization test 提升 main；是否把私网支持正式升为共享承诺需明确政策。没有真实私网、代理、DNS、redirect、OAuth 互通证据。                                          |
| DC-PLATFORM-001 | 无 rg 时仅简单文件枚举可走 Node walker；高级 glob/follow/maxDepth、祖先/子树 ignore 标记、读错误等保持失败闭合。Windows ZIP 通过 .NET 逐 entry 解压、overwrite 和 Ordinal 路径前缀检查。main 无该套 fallback。                                                                         | 按部署要求保留。代码共用 Windows 命令生成已减少重复；现有 archive test 仅检查字符串，不是 PowerShell 执行/zip-slip 整体验收。保留真实 cwd 语义；不要把 no-rg 支持写成 grep/glob 全功能替代。                                |
| DC-MODEL-001    | `ConfigAgent.maxMode` → `Agent.Info.maxMode` → `shouldRunMaxModeStep` → 普通/full actor 共用 `runStep`；要求 experimental 配置存在，跳过 json_schema 和 final step，子agent不发布全局retry状态。main 已有专用 max、bounded retry、final step 和 title隔离。                            | 保留 per-agent opt-in 策略；若产品决定普遍支持，可成组提升schema/装配/路由/SDK/README/测试。judge caps 是通用硬化，可独立评估提升，不应把共享 title 与重试底座计算成新增 compat 实现。                                      |
| DC-CONTEXT-001  | 每块内容 cap、请求 current-turn floor、active tools materialization、最多2轮预检恢复、原子/单调消息创建、checkpoint覆盖与全局revert等仍为真实差异。main 已有局部 parentID关联、`commitUserMessageIfLatest`/recovery事务、budgeted projection、ratio/window，未等价覆盖整套剩余链。     | 保留能力，但按“内容边界/预检、时序事务、coverage协议、旧snapshot数据兼容、SDK示例”拆成子契约。本轮已收紧预检与序列化表述；通用正确性部分优先提升main。                                                                      |
| DC-ACTOR-001    | compat明确恢复模型schema、shell、recover形态、none/state/full、spawn persistent(full-only)，同时 full捕获包括turnContext；runtime/HTTP recovery及full执行继承共享生命周期。                                                                                                            | 明确保留。不要因为main模型入口收窄就删compat能力，也不要将共享系统full当compat新实现。冻结turnContext/子session消息筛选等通用正确性可单独评估提升FD-009。退出需等效捕获/执行/恢复/取消释放以及static overflow边界全部满足。 |
| DC-TUI-001      | 单行alias/providerID/modelID/variant、subagent持久元数据与窄终端收缩仍独有；locale提交与标题生成已共享。默认tier未配置或会话内切agent时仍可能低报 `variant:none`。                                                                                                                     | 保留显示政策与已有known limits。最佳统一方向是server给出待发请求权威selection，再让客户端渲染；不要再复制一份server defaultModel选择。checkpoint usage属于DC-CONTEXT，不应吸进展示owner。                                   |

## 值得继续对齐的完整行为链

### 1. 消息 ID 不是时间：应该成组提升 main

具体载体为 `session/session.ts:781` 的 `createMessage`、`:822` 的原子用户提交、`:930` 的公开 `commitUserMessage`，加上普通prompt、compaction、debug、inbox生产者。新增内容包括提交时分配 `max(Date.now(), latest.created+1)`、现有row保持created、assistant completed不早于created、拒绝别的session/actor占用MessageID、parts owner与重复ID检查，以及幂等重试必须具有同内容/同parts。

消费端同步改变 `Session.fork`、`lastMainMessageID`、revert diff/cleanup、prompt续turn包裹、checkpoint digest/collapse、TUI排序/undo/redo/queued。main 已有 `parentID` 精确关联及部分事务边界，但仍不能代替这些消费者的完整时序语义。

`packages/shared/src/util/encode.ts` 不是无意义冲突：`compareUtf8Bytes` 保证JS同毫秒ID排序与SQLite UTF-8 BINARY一致，特别是补充平面Unicode字符。它有多处生产调用，不能只把 `.localeCompare` 换回去。邻接的 TextEncoder复用才是机械改动。

建议迁移验证：客户端预分配低ID但迟提交、同毫秒Unicode、重复receipt同PartID、冲突PartID回滚、cross-actor与global revert、缺失边界、回填checkpoint与分页。单独提升单调生产者而不审消费者，或只提升客户端排序，都不充分。

### 2. 并发 compaction 的新请求保护：通用正确性，不依赖内网策略

`buildProjectionTail` 把summarizer未见的 `source=user/spawn` 新请求及其后内容当必保部分，旧完整round才消费剩余tail budget。prompt记录同一session/actor的pending外部admission；compaction等待它们settle，然后在synthetic continuation前后各查一次，必要时删除自己写入的过期continuation。failed admission、成功失败混合、另一个actor、不足预算等均有差异测试。

应连同原子用户提交/单调chronology一起提升。main 的旧 `createIfLatest` 只保护边界创建时的用户snapshot；有budget的普通projection也不等价于保住summary期间后来到达的新请求。

### 3. HTTP / SDK / OpenAPI 差异已经拆清

结构化比较全部OpenAPI methods（去除 `x-codeSamples` 后）显示，唯一新增route是 `/session/{sessionID}/checkpoint-coverage`；唯一schema内容变化是 `Agent.maxMode`、`AgentConfig.maxMode` 和新增 `CheckpointCoverage`。既有route除sample外没有语义变化。`CompactionPart` 整个schema与main相等，故 `projection` 是共享回归不变量，不是现在仍独立的schema实现。

`SessionCheckpoint.coverage` 在事务中验证session、只看main slice，通过JOIN按精确 `digestUpTo ?? coveredUpTo` 找watermark，缺失标unresolved；排序移到JS用SQLite等价UTF8比较，避免长session bind参数和planner问题。TUI independent cache配请求序号、provisional marker、删除和directory切换失效，解决回填marker不在latest-100时上下文读数回活的问题。SDK的新增方法与类型因此是行为协议的一部分，不可单独归类成可丢弃生成噪音。

另有141个带代码示例的当前operation。`generate.ts:5` 修正全部示例的 `@mimo-ai/sdk/v2` 导入与underscore→camelCase方法名；这是通用发布文档正确性，应优先提升main，重新标准生成两侧产物。当前归在DC-CONTEXT的理由只是此次修正从coverage endpoint暴露，并非它依赖compat上下文政策。

### 4. Active tools：新格式已有等价能力，旧行兼容仍需保留

main新格式已在每个 `tools` snapshot上记录 boolean `active`。compat仍保留额外 `active_tools` 数据列和双写。`restoreActiveTools` 正确按“全部JSON active flags完整→旧列（包括空数组）→全工具”顺序读取，因此main新writer写JSON后不会被旧compat掩码覆盖。这是历史数据兼容，不是两套独立的新工具权限系统。

可评估停止新增记录的旧列双写并保留历史迁移/read fallback；不能删除已应用migration或直接删旧列读取。`toolsHash`额外纳入 `loadedMcpTools` 是另一个身份维度，尤其compact discovery模式下wire集合可能不变，不能随旧列一起移除。`restoreTools(items, activeTools)` 的新增过滤重载在当前生产仅见全pool调用；新增二参使用出现在test，因此可以评估删除无生产消费者的重载及镜像测试，保留真正执行集/广告集区分。

### 5. 全文 Actor 与请求冻结：保留政策，通用冻结补强可共享

完整入口：shell/parser及JSON recover保留context/lifecycle显式值 → strict schema → persistent要求full → PrefixCapture取得同一模型identity/system/tools/permission/inherited messages/turnContext → Spawn `ForkContext` → `runStep` 用 `user.system=forkCtx.turnContext`，把frozen inherited history纳入不可压缩floor。子session新消息按actor归属筛选，父watermark不是子消息ID大小门槛。checkpoint两种writer模式及session forkQuery也传turnContext。

与main系统full runtime相比，模型可调用context/persistent是政策差异；turnContext冻结、防旧ID消息被遗漏、StructuredOutput请求本地结果等是通用正确性问题。不要为了统一入口而撤掉用户要求保留的全文上下文。

## 需要补登记或收紧的边界

### A. 预检工具schema估算在80 KiB后平台化

`overflow.ts:134` 在 `estimateRequestTokens` 内先把serialized tools截成80KiB再估token，实际 `LLM` dispatch只选active membership，不截相同schema。因而“只算active descriptors”成立，“完整真实请求大小已保证”不成立。`LLM`还可能随后加 `_noop`、做provider转换，预检不是最终wire字节/模型tokenizer的精确计算。

本轮从固定SHA提取原 `estimateRequestTokens` 函数和实际utility，仅改import路径进行纯函数探针：

| 单个description字节 | 完整descriptor字节 | 估算tokens |
| ------------------: | -----------------: | ---------: |
|              40,960 |             41,060 |     13,706 |
|              81,920 |             82,020 |     27,323 |
|             262,144 |            262,244 |     27,324 |
|           1,048,576 |          1,048,676 |     27,323 |

探针使用 Bun 1.3.14，保留原 `estimateRequestTokens` 函数体、80 × 1024 常量及同 SHA 的 `token`、`text-truncate`、`safe-stringify` helper，仅改依赖路径。输入为 `{ messages: [], tools: [{ type: "function", name: "test", description: "x".repeat(bytes), inputSchema: { type: "object", properties: {} } }] }`；descriptor 字节数按 `Buffer.byteLength(JSON.stringify(tools))` 计。表中四个输入均成功返回。这证明估算器平台化，不是provider真实请求验收或生产溢出复现。本轮已把登记收窄为启发式估计、工具schema采样上限及残余低估可能；后续实现可对超上限descriptor保守判超限或保留完整字节计数，必须连active/inactive、compact/MCP和static floor测试评估。隐藏原生bounded agents跳过预检，`compaction.auto=false`与`model.limit.context===0`也禁用该预检，属于适用范围限制。

### B. “所有model-visible boundary都不抛序列化异常”不符合调用链

`safeStringifyNoThrow` 只在MaxMode judge被用作可靠兜底；overflow调用 `safeStringifySimple`，message replay input/providerOutput调用 `safeStringify`。实际helper探针显示：`Simple({x:1n})`抛BigInt异常；`safeStringify({toJSON(){throw...}}, {bigint:true})`仍抛；NoThrow返回`[unserializable]`。循环与BigInt（可选开启）转换不是对所有getter/toJSON错误的兜底。

这不是已证明的任意外部HTTP payload可触发崩溃：持久JSON和schema验证限制了可达输入，插件内存对象另需针对性验证。起点登记的无条件承诺过强，本轮已按实际调用层收紧。现有safe-stringify测试本身明确写BigInt关闭会抛、DAG共享对象重复引用会误当circular。后续是否扩no-throw必须决定无法估算时的失败语义，不能简单返回短placeholder导致进一步低估。

### C. 截断限额不是任意小预算的严格总字节界

50KiB固定内容cap在常规label下会给marker预留空间；但generic helper在marker自身超过maxBytes时仍返回完整marker，Actor `capStateContext`同样在极小token budget时保留完整marker，wrapper另在cap外。现有byte helper测试部分允许cap+20，而不是严格任意预算。本轮登记已明确具体调用点/固定正文上限及例外，撤销全局硬总量承诺。历史Actor设计/计划明确为旧阶段记录，写60/40；当前源码是65/35，不能把旧计划当当前验收标准。

### D. 起点漏记的载体/子契约已补入登记

- `migration/20260901000001_session_prefix_active_tools/migration.sql` 与 `session/session.sql.ts` 已补列为旧snapshot兼容载体。
- `session/llm-request-prefix.ts` 是current-turn source-ID转换的关键生产载体，起点Source surfaces漏列，本轮已补。
- `cli/cmd/debug/agent.ts` 与 `inbox/inbox.ts` 的 `createMessage` 已补列为chronology传播点；后者还有message+part与inbox DELETE之间崩溃重复窗口，不能误写成全链原子。
- `prompt.ts:194` 在json_schema禁止active recall，`prompt.ts:5132` 从completed `StructuredOutput` part回填结果，都是实际行为；起点未明确登记这些局部修正，本轮已纳入 DC-CONTEXT-001 的结构化输出子契约。coverage在prompt的 `audit_start_owners` 中保留 `UNREGISTERED` 起点局部hunk标记，当前 `owners` 已移除该标记；这不是新增第八个DC。适用场景验证及提升main仍是后续工作。

## 固定源码复核入口

在仓库内运行以下只读命令即可重建路径清单、指定文件的实际补丁和探针所用原始函数；把第二条命令的路径替换为 coverage 中任一路径即可复核其他载体。

```sh
git diff --no-ext-diff --no-renames --name-only 648f7cdf100b30ff046db7518d8f832473b61481 90abf6e447d7a5e5b405aba301bf1a951f469bf6
git diff --no-ext-diff --no-renames 648f7cdf100b30ff046db7518d8f832473b61481 90abf6e447d7a5e5b405aba301bf1a951f469bf6 -- packages/opencode/src/session/prompt.ts
git show 90abf6e447d7a5e5b405aba301bf1a951f469bf6:packages/opencode/src/session/overflow.ts
git show 90abf6e447d7a5e5b405aba301bf1a951f469bf6:packages/opencode/src/util/safe-stringify.ts
```

估算器另使用同一 SHA 下的 `packages/opencode/src/util/token.ts` 与 `packages/opencode/src/util/text-truncate.ts`。A、B 节记录了纯函数探针的输入、方法和结果；固定源码、覆盖记录与正文是可持久复核的证据，不依赖审计时的临时文件仍然存在。

## 测试与证据范围

本轮读取实际生产diff、关键上下游调用及测试差异。`prompt-effect.test.ts`的大hunk有大量整块移动：静态提取live/effect名称后没有旧匹配名称消失，新增35项匹配名称（含模板用例名称；不是本轮执行测试数量）。不能用4552新增行推导新增4552行能力，也不能把旧测试块移位视为删除测试。

本分组代码审计未安装依赖、未跑包级测试/typecheck、未启动provider/HTTP服务、未跑TUI、未做真实私网/OAuth/Windows验收。后续文档复核确认了已接受SHA的远端CI，链接与范围见[总报告](../../fork-difference-audit-2026-09-15.md)；该发布证据不等于本分组重跑了测试。执行的只有固定SHA源码helper/估算器纯函数探针和结构化OpenAPI/blob/manifest核验；没有从历史文档的“303 tests”或“CI passed”继承当前通过声明。完整后续迁移应从package目录运行相关测试与typecheck，按AGENTS清除ambient三个实验selector并报告test harness预载baseline；WebFetch私网/Windows等实际平台保证需要对应现场验证。

本轮已收紧登记并标明历史条款。后续建议先单独提升SDK示例生成；再成组提升通用message chronology/atomic admission/compaction新请求保护与coverage；最后按真实部署决定per-agent MaxMode、TUI显示、platform和私网策略是否共享。full-context模型Actor明确保留，直到用户策略或共享等价实现改变。
