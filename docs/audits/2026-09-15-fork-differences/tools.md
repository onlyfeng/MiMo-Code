> 本文保留固定代码快照的审计发现。起点登记的“漏记／过期”已在本轮文档修订中对账；实现缺口与建议仍未实施。逐文件证据见 [coverage.json](coverage.json) 的 `scope: "main"`、`review_group: "tools"` 记录。原始临时补丁、探针运行目录和构建脚本未随本文入库；固定 SHA 的差异可按文末命令重建。当前结论与处置以 [总报告](../../fork-difference-audit-2026-09-15.md) 为准。

# main_tools 固定代码差异审计

本分组已经覆盖 manifest 的全部 178 个文件。主要发现是：FD-005 的 debug 工具发现入口遗漏可信 `harness_model`，导致同一模型在 debug 与真实请求中的工具集不同；FD-004 的旧 model API 已被上游替代，但旧保证仍散落于多个登记项和三个无调用者测试 helper；history SQL 投影的 NUL 保真和预览上界需要独立 owner，本轮父任务已确定补为 FC-017。除此之外，TUI voice 所有权、删除授权、MCP 信任、嵌套工具执行、Actor 恢复及清理的主要差异仍有明确行为理由，不能按目录整体恢复上游。

## 审计边界与覆盖

- upstream：`5198ff540efb5ca9fff2baa64555324d43a721b9`。
- fork main：`648f7cdf100b30ff046db7518d8f832473b61481`。
- compat：`90abf6e447d7a5e5b405aba301bf1a951f469bf6`，本报告只用作分支边界背景，不把 compat 独有实现混入 main 结论。
- 范围：统一覆盖表中 tools 分组的 178 个 TUI、CLI、tool、provider、config、MCP、permission、skill、server、util、history 及相应测试文件；涉及的跨文件调用链另作只读核查。该集合与审计时的临时 manifest 一致。
- 每个文件的具体差异、owner、分类和建议见 [coverage.json](coverage.json) 的 tools 分组。所有分组文件均已读其 diff，测试按相关测试名、断言和 setup 变化合理分组核查，重要运行时实现追踪调用者；没有以路径归属自动替代语义审计。
- 分类：behavior 68、test 94、docs 15、mechanical 1；登记判断：准确 159、漏记 5、过期 14、待核 0。这里“准确”表示差异与登记语义相符，不代表代码无缺陷或运行验证已通过；“过期”也可能只是登记、注释或无消费者接口过期。
- `FC-017` 是父任务确认的本轮补登记 owner。其四条 coverage 保持“漏记”，用于呈现锁定 main 基线的登记缺口。修改登记后无需把历史发现抹去。
- 所有代码与行号均指上述固定 main Git tree；读取工作区分支不作为 main 证据。本分组代码审读未 fetch、改 refs、改源码、发布或发送外部消息；初始报告写入临时目录，随后将本文与逐文件记录归档到仓库。

## 需要处理的发现

### 1. debug 工具发现遗漏可信模型声明，FD-005 的统一身份尚有一个消费者缺口

证据：`packages/opencode/src/cli/cmd/debug/agent.ts:76` 的 `getAvailableTools()` 已 resolve 模型，但传给 `registry.tools()` 的对象只有 providerID、modelID、modelAPIID、modelFamily，遗漏 `harnessModel: model.harness_model`。相邻完整消费者 `src/server/routes/instance/experimental.ts:240` 至 247 已传该字段，Agent.generate 与正常请求工具选择也使用完整身份。

可观察差异：自定义 provider 下不带 GPT 字样的配置模型，通过可信 `harness_model: "gpt-5"` 声明应走 Codex；debug 入口丢失这一声明后会走 default。`debug agent` 因而显示不同工具，`--tool exec` 也可能因工具列表缺项被拒绝。该问题在 session/process 未显式强制 harness 的默认路径成立。

验证：从固定 main 提取原始 `tool/gpt.ts`、`flag/flag.ts` 到隔离临时目录，运行真实 resolver 模块，未改其实现。去掉 `MIMOCODE_EXPERIMENTAL`、`MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`、`MIMOCODE_CODEX_MODE` 后，两种入口输入的结果为：

```json
{ "debugInput": "default", "requestInput": "codex" }
```

本轮记录的退出码为 0，上述输出与固定 SHA 来自临时探针结果；探针运行目录及结果文件未随本文入库。这是实际 resolver 的输入差异证明，不是 debug CLI 端到端运行证明，也不宣称仅凭本文即可复跑该探针。

建议：补 debug 消费者的 `harnessModel`，增加使用 opaque 配置模型的实际 debug 入口回归；保留 FD-005 的配置可信来源、负向身份检查与单一 resolver。不要通过宽松识别 API alias 掩盖此遗漏。源码修复不属于本轮 docs 审计授权范围。

### 2. model API 退役只更新了部分登记，旧约束仍在其他 owner 中被写成当前保证

FD-004 当前已采纳上游常驻 `/v1` capability API。真实剩余差异是三项修正，以及两个保留的部署边界：

| 当前差异                               | 固定 main 证据                                                                             | 建议                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| completion 合并 `model.options`        | `src/llm-server/completions.ts:183`；streaming 测试覆盖模型、variant、调用者 override 顺序 | 保留，并向上游收敛同一修正                           |
| IPv6 advertised URL 括号               | `src/server/server.ts:164`；serve-advertise 真实 IPv6 listener 回归                        | 保留正确通告地址                                     |
| revoke 的 id 与 `--all` 互斥           | `src/cli/cmd/llm-server.ts`；真实 yargs/token store 回归还覆盖空 id、`--` 后位置参数       | 保留 fail-closed CLI 语法                            |
| 生成密码不能替代操作员非 loopback 授权 | `src/server/server.ts:123`                                                                 | 保留 operator-origin 边界；`noAuth` 仍是显式退出选项 |
| TUI worker 的 `advertiseDirectory`     | `src/server/server.ts:155`、`tui/worker-listener.ts:34`                                    | 保留启动目录与进程 cwd 不同的发现路径                |

锁定登记存在以下漂移：

- FD-004 正文第 189 行仍写 `apart from the two corrections`；第 338 行仍写 `Two were taken`，遗漏第三项 revoke 修正。最新同步摘要已写三项，正文应统一。
- FD-004 第 365 至 368 行把 upstream llm-server 与 advertise 测试概称 `inherited verbatim`。实际 `streaming.test.ts` 增加 model.options wire 回归、`serve-advertise.test.ts` 增加 IPv6 回归，`implicit-listener.test.ts` 还有 fork fixture root 适配。应写“主体断言继承，列出 fork 追加和 fixture 适配”。
- FC-007 第 634 至 646 行的 2026-09-07 段仍引用已删除的 `server/model-api.ts`、`api-request.ts`，声称 tokens 永远固定启动目录并拒绝 workspace 切换，且 Basic 不能扩大目录。它描述退役实现，不能作为当前 `/v1` 的承诺；保留时必须明确历史 superseded。
- FC-008 第 831 至 835 行仍把 bounded upload、cancel-aware bootstrap、SSE admission/instance lease 写成保证。该登记稍后又明确承認这些边界已退休，内部矛盾应消除。POLICY-03 的 worker stop/join 仍有效，不能连同旧 API 硬化一起删除。
- FC-011 第 989 至 991 行把 TUI-owned listener 也列入“no longer exist”。当前 fork-only `tui/worker-listener.ts` 仍实际启动监听器并由 TUI worker 管理；退役的是旧并行 model API，不能写成监听器也消失。

建议：以 FD-004 当前实现为唯一行为基线，按具体边界更新 FC-007/008/011 与当前指南；旧审计保留为历史差异记录，不恢复已退休的 upload、admission、token scope、启动不初始化等约束。父任务正在修订相关登记与 audio/model API 指南，本分组不重复修改。

### 3. 三个测试 helper 已没有调用者，文件存在不再提供活跃验证证据

固定 main 全树在 `packages/opencode` 内搜索三种 helper 文件名，零匹配（`git grep` 退出码 1）：

| 文件                                      | 遗留语义                                                                             | 建议                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `test/fixture/llm-server-cli-child.ts`    | CLI 后按 `MIMOCODE_TEST_NO_INSTANCE` 断言尚未初始化实例                              | 删除或明确重接当前支持的契约；不能据此声称当前 CLI 不初始化 |
| `test/fixture/model-api-default-child.ts` | 使用 `MIMOCODE_AUDIO_API_KEY`，探测旧 speech/transcriptions/default 路径与 bootstrap | 随已退休 API helper 删除，避免误导默认路径证明              |
| `test/llm-server/tokens-child.ts`         | 旧并发 issue/verify/revoke 子进程载体                                                | 删除或重新连接明确测试；当前无调用方                        |

当前仍被调用的 `tui-worker-default-child.ts` 和 worker listener 测试是独立证据，不能与这些旧 helper 混为一类。三个遗留文件的处置只列建议，未改源码。

### 4. Provider loader 的第四参数已经没有消费者，可以继续机械对齐

`src/provider/provider.ts:265` 的私有 `CustomModelLoader` 仍接收第四个 `model?: Model`，`getLanguage()` 第 1809 至 1817 行仍传完整 model。逐个检查私有 `CUSTOM_LOADERS` 的 `getModel` 实现，最多使用三个参数；loader 注册只来自这些私有工厂，没有外部注入路径。该参数原先服务的 MiMo/PTC transport 分叉已经退休。

建议：后续把私有接口和调用恢复上游三参数形态，作为低风险机械收敛；保留 Model schema 中可信 `harness_model` 及 config/provider 传递。不要把“删除无消费者 transport 接口”误写成“退休统一模型身份”。此处未改代码。

### 5. history 投影新增独立行为，不能只挂宽泛 FC-009

`src/history/projection.ts:7` 至 16 用 SQLite `->` 保留 JSON escapes，避免旧 SQLite 的 `json_extract` 转 SQL 文本时截断 NUL。预览统计使用临时替换 NUL 的副本，按 decoded UTF-8 bytes 限制 4000 字节，输出仍保持原值。第 18 至 26、60 至 64 行进一步限制整个序列化附件 metadata 列表，超界时返回 array-shaped sentinel，避免许多小附件在 driver 边界形成无界数据。

`src/history/media.ts` 识别该 sentinel，避免伪造 attachment locator。`history get` 保留原始 part/定位信息；这是预览投影与详情读取的不同边界，不能说原始历史内容被截断。`test/history/details.test.ts` 有真实 SQL、NUL/literal escapes、UTF-8 边界、附件列表和原文读取回归；backfill 测试另有全局资源清理和目标 session 隔离变化，不是迁移算法被改写。

锁定基线只在 latest sync 摘要提及该修正，没有独立活跃 observable/watch/tests/retire owner。FC-009 的 synthetic messages/retry 职责不覆盖这一行为。父任务已明确补登记 `FC-017`，覆盖两个 source 和两个 test 文件。建议保留并以该 owner 管理后续上游等价性。

### 6. 两处清理建议与一个证据边界

- `src/tool/actor.ts:963` 至 968 的注释仍称 outcome 在 `fire-and-forget postStop` 前完成。当前 FC-001 已要求执行完成和 postStop join；本轮检查的是过期注释，不是发现当前 postStop 仍 fire-and-forget。建议更新注释，避免维护者恢复旧顺序。
- `tui/worker-listener.ts:1` 有未用 `Flag` import，第 5 行 `Omit` 仍列已不存在的 `llm`/`audio` 参数。可随邻近变更清理，不构成继续保留旧 API 的理由。辅助 `test/AGENTS.md` 的 opencode/system tmp fixture 描述也已落后于当前 mimocode/安全根策略，父任务已获告知。
- FC-010 的每跳 URL 分类和 permission ask 有真实差异，但 `src/tool/webfetch.ts:110` 至 122 的 timeout 仅包 fetch/redirect 到响应对象；正文 `arrayBuffer` 在外。5 MiB 在 Content-Length 已知时提前拒绝，否则完整读取后再拒绝。这不是流式内存上界，也不是正文总时限。建议保留每跳 SSRF/授权；若未来要求资源上界，应单独实现并增加慢正文、无 Content-Length、超大流测试。本轮没有运行这些场景，也未证明 DNS 解析与实际请求地址绑定。

## 仍需保留或统一的主要代码差异

| 分组                                    | 从实际代码确认的当前行为                                                                                                                                                                                                               | 当前建议与主要风险                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| FD-001 / FC-007 CLI 与删除授权          | 每次 run 独立 live runID；`--yolo` 只回复自己 scope 的 ask once；request-scope reject 不取消其他 run；自动删除授权不代替普通 Bash/external ask；只有真实完整命令 reply receipt 才可抵扣重复 ask                                        | 保留。恢复共享 autoApproveDelete 或依据预先授权伪造 receipt，会串联并发运行权限                                        |
| FC-007 路径边界                         | 固定 Instance cwd；Bash 删除先检查显式 bash/external deny；tmp 豁免按真实路径拒绝与项目自身、祖先/后代重叠；拒绝动态 shell 路径扩展；apply_patch/MultiEdit/NotebookEdit 记录已完成绝对路径供 worktree 判断                             | 保留。不能把系统临时目录整体视作可删除，也不能从未执行 patch 文本推断文件变更                                          |
| FD-005 config/provider/registry         | session > process 三态 > auto；配置层快照授予 harness_model，provider 清除 plugin/catalog 伪造；多维身份对 MiMo/GPT4/OSS 的否定优先；MCP search 独立 opt-in                                                                            | 保留身份单一来源；修 debug 遗漏。API/family alias 单独存在不能自动授予 Codex                                           |
| FD-006 tool execution                   | 请求 pool 冻结、显式空 pool 保持空；native Actor/control symbol 穿 wrapper；same-name custom/MCP 无权冒充；nested 参数严格，子 ask 使用 post-hook 实际参数                                                                             | 保留已采纳的完整授权 Actor/question/plan_exit；上游也需满足 authority 来自定义身份与当前请求这一边界                   |
| FD-006 取消和输出                       | compute 秒预算与 shell 毫秒预算分离；停止新调用后 abort/join 已准入子调用、finalizers、guest VM；128 KiB code、256 KiB return/subparts、最多 8 个去重附件与 encoded 10 MiB 上界；TUI outer output 最多 10 行去 ANSI                    | 保留。仅 guest Promise 被拒绝不证明 host 子任务已停止；测试应继续覆盖真实 Actor/Question 消费者                        |
| FD-006 / FC-001 plan_exit               | 有交互授权的前台 root/main、最新 parent user 才提交；复制用户 model/task/tools/format/system/harness/provenance；Yes 通过可信 receipt 独占终态并结束 guest，No 可继续；TUI 从 running/error/completed 都能读取已提交 receipt           | 保留。不要以旧 direct-only 限制拒绝授权嵌套，也不要只依赖 tool 名或 terminal status 判断是否提交                       |
| FC-001 / FD-009 Actor 与 session/server | Actor resume 只允许仍注册、live、同实例模型/任务归属的 retained actor；main spawn/run 仍为 context none 且严格拒绝已撤字段；spawn 准入有 ownership，handoff 后 wait 取消仅取消观察者；HTTP 同步准入冲突 409，prompt_async 忙时排队 204 | 保留。不能把 compat 的 context/lifecycle selector 当 main 合同；恢复不是跨进程重启恢复                                 |
| FC-001 owned worktree                   | SessionTool 只保存和清理自己创建的 path+branch；失败回滚；取消不清理外部已有 worktree；setmode 只 patch metadata 避免覆盖并发 recovery task                                                                                            | 保留。清理权限来自实际创建记录，不来自同名分支或当前 cwd                                                               |
| FC-002 / FC-003                         | 冻结指令保留 `{current_session_id}`，文件工具在路径边界解析；prior-read gate 已退役，Edit 测试去掉 withRead 假历史；checkpoint writer 以运行时工具集合为准                                                                             | 保留路径映射，继续对齐已采纳的 prior-read 退休。没有理由重建旧读状态门禁                                               |
| FC-004 MCP                              | URL 在创建 client 前只接受 HTTP(S)；Claude imported 默认 pending，只接受 MiMo 配置显式 auto_connect 或人工连接；enabled false 优先；sampling 清除连接捕获的 run scope；恢复 search membership 校验 catalogKey                          | 保留。来源、连接和当前请求授权不能由 imported 配置或持久连接自行升级                                                   |
| FC-005 skill                            | load/search 共用 permission、agent allowlist、用户 toggle；禁止内容不出现在 not-found 枚举；共享 discovery producer 归 layer scope，单个 joiner 中断不杀共享扫描，失败可重试、generation 失效                                          | 保留。只缓存 Promise 或 TTL 无法表达同等取消/重试边界                                                                  |
| FC-007 / FC-008 生命周期                | Instance generation、disposing、peek 不 bootstrap、reload/dispose 串行、stale continuation 不清新实例；Question 注册/等待有资源释放且向旧 generation 发一次终态；TUI stop listener 后 drain checkpoint/dispose，再清认证               | 保留。普通 Bus publish 在 disposing 时静默 no-op，不是抛错；disposeDirectory 的 2 秒是等待边界，不等于底层工作一定结束 |
| FC-010 SSRF                             | 手动 redirect 每跳先检查 URL/IP 再 ask，最多 10 跳；IPv6 link-local 覆盖整个 fe80::/10                                                                                                                                                 | 保留。资源上界与 DNS pinning 未由该差异解决，不夸大验证范围                                                            |
| FC-011 发布提示与 i18n                  | mimocode-docs 技能键统一；Actor heredoc flag 教学；PPTX image_gen 条件化，WebFetch 可返回图片但不提供本地文件路径；工具名单以实际授权为准                                                                                              | 保留正确内容。退休 API 的描述需要一起更新，不能只改 owner 摘要                                                         |
| FC-015 context budget                   | TUI preview/save 均用实际 resolver；ratio headroom 替代旧固定 reserve 近似；usable=0 拒绝                                                                                                                                              | 保留 fork bounded projection/配置优先级，继续统一上游 ratio trigger；旧 reserve-trigger 拒绝理由已失效                 |
| FC-016 TUI voice                        | Prompt 绑定 alive/session 身份并在每次 await 后重新验证；切会话、同文本 remount、更新录音均使旧 ASR/edit 失效；stop/drain/pending 共同控制 finishing；UTF-16/显示宽度按 grapheme 处理                                                  | 保留。协议层音频已收敛不能替代编辑归属保护；本轮没实录或调用 ASR，测试有 helper 归属模拟与真实 OpenTUI 选区两种证据    |
| FC-017 history                          | SQL JSON escapes/NUL 保真、字段与整份 attachment metadata preview 上界、原文 get 与 locator 保留                                                                                                                                       | 本轮补 owner 后保留，避免再用宽泛 history/retry owner 掩盖独立行为                                                     |

## 旧拒绝理由现在是否仍成立

| 旧方向                                                                              | 当前判断                                                                                               |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 保留旧 parallel model API、静态音频 key、旧 CLI flags、no-bootstrap/upload/SSE 硬化 | 不成立。FD-004 已有明确采纳上游决定；记录剩余风险与三项修正，不恢复退役实现                            |
| 拒绝分散 GPT/harness 身份判定                                                       | 仍成立。可信配置别名与负向身份边界实际存在；但必须补齐 debug 消费者。MiMo/PTC transport 的旧拒绝已退役 |
| 拒绝所有 nested Actor/question/plan_exit，仅许直接调用                              | 不成立。当前 POLICY-01 已采用完整授权组合、trusted control、取消 join 与独占 plan commit               |
| 保留 prior-read 编辑 gate                                                           | 不成立。FC-003 已退休，当前 diff 的剩余文件路径处理并不代表 gate 仍存在                                |
| 拒绝上游 ratio trigger，坚持预留差值                                                | 不成立。当前 TUI/resolver 已按 ratio；仍保留 bounded projection 和配置优先级                           |
| 音频已对齐所以删除 TUI voice 所有权保护                                             | 不成立。voice 文本编辑绑定与 ASR transport 是不同可观察行为                                            |
| 用普通自动批准代替 Bash 删除完整命令许可                                            | 仍不成立。默认/预先 grant 与当前真实用户批准的授权范围不同                                             |
| 以统一上游为由删除 imported MCP pending、每跳 SSRF、Question/Instance 代际清理      | 仍不成立。上游当前差异没有提供同等来源、授权或终态清理合同                                             |

## 验证范围与交付

本轮执行了固定 SHA diff/source 阅读、调用链和 helper 引用搜索、178 条覆盖集合与字段验证，以及前述真实 resolver 隔离微探针。没有执行完整包测试、CI、真实 ASR、浏览器或 Windows/PowerShell 目标运行；报告中“测试覆盖”指已阅读的测试实现，不能当成本轮跑绿结果。

仓库交付为本文和 [coverage.json](coverage.json) 的 tools 分组。合并时逐项核对了 178 条原始记录的 path、owners、classification、summary、drift、recommendation，均保持一致；各条目的 before/after mode 与 blob 也与固定 Git tree 相符。

原始补丁、人工矩阵构建脚本、登记副本与探针附件只保存在本轮临时工作目录，不作为仓库内的可用相对路径。可在仓库中用以下命令重建任一已登记路径的原始差异，将示例路径替换为覆盖表中的 path：

```sh
git diff --no-ext-diff -U3 5198ff540efb5ca9fff2baa64555324d43a721b9 648f7cdf100b30ff046db7518d8f832473b61481 -- packages/opencode/src/cli/cmd/debug/agent.ts
```

登记文档的起点内容可通过 `git show 648f7cdf100b30ff046db7518d8f832473b61481:docs/upstream-deviations.md` 与同 SHA 的 `docs/fork-capabilities.md` 读取。本轮登记修订的最终状态见总报告；后续 debug 消费者修复和无消费者代码清理应分别验证对应入口，避免把本轮静态审计等同于修改后的运行验收。
