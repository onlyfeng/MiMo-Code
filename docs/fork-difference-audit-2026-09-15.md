# 2026-09-15 upstream / fork 代码差异审计

本轮完成差异文档收尾，并从实际 Git 树反查当前登记。确实存在漏记、过期保证和实现/验证缺口；下文分别记录修正文档与后续代码建议，不把登记修正当作代码修复。

## 范围与证据

| 对比                         | 固定源                                     | 固定目标                                   | 文件比较项 |
| ---------------------------- | ------------------------------------------ | ------------------------------------------ | ---------: |
| 已接受 upstream → main       | `5198ff540efb5ca9fff2baa64555324d43a721b9` | `648f7cdf100b30ff046db7518d8f832473b61481` |        422 |
| main → dev/compat            | `648f7cdf100b30ff046db7518d8f832473b61481` | `90abf6e447d7a5e5b405aba301bf1a951f469bf6` |        107 |
| 最新 upstream 增量，尚未采纳 | `5198ff540efb5ca9fff2baa64555324d43a721b9` | `b4cc11cd652195af9a80297ed543218f3172e6c4` |          1 |

前两组共 **529 条文件比较项，470 个不同路径**，同一路径在两个区间出现时分别核查。逐项状态、归属、建议、文件 mode 与 blob 固定在 [coverage.json](audits/2026-09-15-fork-differences/coverage.json)。这不是按提交信息或文件名自动认定语义：代码分组审读实际 hunks、关键调用链和测试变化；生成 SDK/OpenAPI另做结构化比较。历史计划/实施档案按范围及当前权威引用归档，没有重新执行其中的旧测试。

[复核命令与探针边界](audits/2026-09-15-fork-differences/verification.md)记录本轮实际检查及其可复现范围。

分组报告：[运行时与会话](audits/2026-09-15-fork-differences/runtime.md)、[工具、TUI、网络及服务](audits/2026-09-15-fork-differences/tools.md)、[compat 全量覆盖](audits/2026-09-15-fork-differences/compat.md)。分组内的“漏记/过期”描述审计起点；本轮已更正的登记仍保留这一发现历史。

`5198ff54 → main → compat` 祖先关系成立，没有遗漏此前的 upstream 提交。最新只多出网关错误别名分类提交。提交覆盖不等于行为完全相同。main/compat 上述两个接受 SHA 的 test/typecheck/lint 均已实时复核成功，完整链接见 [已接受同步结果](upstream-sync-2026-09-15-5198ff54.md#accepted-result-and-publication-evidence)。这不将旧 CI 转移给本轮新增的文档提交。

本轮未更改运行时、测试、锁文件或生成 SDK，也未同步最新 upstream。内置 capability API 指南属于交付给模型的 Markdown 内容，单独提交为 `3fa41ad98ac15668b2b3be899767c6498772ad4b`；共享登记据此更新指导内容快照，源码/测试快照不变。执行的窄探针是：真实 harness resolver 输入差异、实际序列化 helper、从固定源码提取的请求估算函数，以及 SQLite 投影计量。它们不替代真实模型调用、HTTP/TUI全链、workflow disposer、私网/OAuth或 Windows 运行验证。文件清单完整不等于证明没有其他 bug。

## 文档收尾与校正

- 同步总览和生命周期记录改为已接受的 main/compat SHA、精确 CI 及最终七项结果；旧候选/待发布叙述明确属于历史阶段。
- FD-004 列清三项修正与保留部署边界，撤销“测试全部原样继承”；FC-007/008 的旧模型 API 保证标为退役，FC-011明确 TUI listener 仍存在。
- 当前 audio/model API 指南不再宣传 `--all-models`、旧令牌兼容、独立上传校验或初始化前固定404。未注册音频端点不代表必然404：鉴权、实例和 UI fallback 仍决定响应。
- FD-012明确“默认一次，可配置、零关闭”。FD-002补 GitLab Workflow 与遥测使用完整 providerSystem；FC-013补共享重试预算优先级；FC-009补 NamedError 摘要提取。
- 新增 **FC-017**，登记已存在的 history NUL 保真、SQL投影与附件定位符修正。字段按解码值计4000字节，附件列表按序列化JSON计4000字节；不是整行或转义后字段的4000字节传输界。
- FC-006区分手工hook测试与服务注入源码证据；FC-010/DC-NET-001明确 WebFetch 检查发生在响应获取或完整正文读完后，不能承诺流式内存或完整正文时限。
- DC-CONTEXT-001补真实载体与子契约，收紧序列化、估算器、极小截断预算的保证；`CompactionPart.projection` 已共享，不能再计算成 compat 新API。

## 当前实现或验证缺口

| 项目                          | 实际证据与当前状态                                                                                                                                     | 后续需要的验证                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Debug 模型身份漏传            | `cli/cmd/debug/agent.ts` 没向 registry 传 `harnessModel`，真实请求和 experimental 工具列表已传；opaque alias 探针得到 debug=`default`、request=`codex` | 修调用方；用可信配置别名跑实际 debug 入口，包含负向身份和显式模式                                         |
| Workflow deadline 测试仍隔离  | `runtime-worktree.test.ts` 的 `deadline=it.live.skip`；upstream正常执行。两个 Actor 隔离已关闭，不代表此项关闭                                         | 修/验证测试服务器与child Instance退出，分别用有界独立进程验证；不能直接删skip声明已修                     |
| compat 超大工具 schema 被低估 | 估算器只保留80KiB schema，dispatch没有同样截断；40/80/256/1024KiB描述的估算为13706/27323/27324/27323 tokens                                            | 对超上限 schema保守计数或拒绝；覆盖active/inactive、compact/MCP与不可压缩前缀，不能把短错误占位当真实成本 |
| compat 序列化非全局不抛       | Simple遇BigInt会抛；safeStringify遇抛错getter/toJSON会抛；judge的NoThrow会兜底                                                                         | 核实际可达输入与失败策略；完整请求预检不能因兜底缩短文本而误放行                                          |
| 验证证据仍有限                | FC-006缺服务注入整链测试；NET-002是禁OAuth的mock私网哨兵；Windows归档是命令字符串检查                                                                  | 补有针对性的服务/平台/真实网络证据，不把已有单元测试扩大为部署保证                                        |

序列化探针只证实helper行为，未证明任意HTTP输入能触发崩溃。WebFetch缓冲/超时边界与上游共有，不列为本轮新增fork回归。Inbox改用createMessage也不等于消息/parts/队列删除已成为一个事务。

## 可以继续同步或统一的顺序

| 优先级 | 建议                                                 | 范围与前置条件                                                                                                                                                                                                                                  |
| ------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | 同步 `b4cc11cd`                                      | 只有 `provider/error.ts`，main当前与旧upstream该文件相同；覆盖`mimo-desktop`、大小写、`xiaomi-*`及其他provider。它只决定错误文案，不应扩张为工具或harness授权规则                                                                               |
| 1      | 修 debug 身份传递、处理预检/序列化缺口               | 各自独立验证；先确定估算失败的保守处理，避免“防异常”引入低估                                                                                                                                                                                    |
| 1      | 关闭剩余 workflow disposer 验证欠账                  | 先复现当前源码退出问题；与已完成的postStop业务时序分开，不回滚C07                                                                                                                                                                               |
| 2      | 把 SDK 示例生成修正提升 main                         | compat为141个operation统一`@mimo-ai/sdk/v2`和underscore→camelCase；属于通用生成正确性，连生成器、产物及callable验证一起迁移                                                                                                                     |
| 2      | 把消息时序/原子提交与并发压缩新请求保护成组提升 main | main已有部分事务/parentID修正，尚不等价于完整链。一起核生产者、SQLite等价UTF8排序、fork/revert、checkpoint分页与continuation；不能仅复制一个排序函数                                                                                            |
| 2      | 评估共享 checkpoint-coverage 协议                    | 服务端覆盖查询、SDK与TUI独立缓存/请求序号成组处理；先定义共享产品范围，避免端点或客户端单边迁移                                                                                                                                                 |
| 3      | 清理已退役的实现残留                                 | main `runPersistentTurn`/私有continueTurn仅测试调用；三个旧model API helper无调用者；CustomModelLoader第四参数无消费者；worker listener遗留类型/导入和Actor旧postStop注释。保留resume仍使用的finishPersistentTurn/acquireWake，并迁移有价值测试 |
| 3      | 收敛旧active_tools双写与无用重载                     | 新tools JSON已有active；先保留旧行读取/迁移和空mask语义，再评估停双写；二参restoreTools目前仅测试调用；MCP成员hash是独立维度，不能一起删除                                                                                                      |
| 3      | 统一机械与工具策略差异                               | overflow/default prompt的剩余空白/数字格式不是能力；root generate自动全仓格式化与upstream不同，可在一次小范围维护中决定是否对齐                                                                                                                 |

这些是评估结果，尚未实施。通用正确性建议先进入 main，再由 compat 继承并删除等价实现差异；显式产品政策不因代码相似就自动提升或退役。

## 能力结果（N = 33）

9项FD、16项有效FC（含本轮补登记FC-017）、7项DC，以及1项未采纳upstream增量。每项一行；重复载体可由不同契约共同维护。

| ID              | 选定行为                    | main 结果                         | dev/compat 结果               | 决定性载体/证据                                            |
| --------------- | --------------------------- | --------------------------------- | ----------------------------- | ---------------------------------------------------------- |
| FD-001          | 调用级删除批准              | 保留deny优先与run隔离             | 继承                          | run-approval、permission、bash；真实批准范围测试           |
| FD-002          | 指令/身份/完整system传递    | 保留；补GitLab/遥测漏记           | 继承并带内容边界              | llm、prompt、llm-gitlab-workflow-system测试                |
| FD-004          | upstream capability API     | 已采纳主体；保留三修正及部署边界  | 继承                          | completions、server、revoke；streaming/IPv6/CLI测试        |
| FD-005          | 统一可信模型身份            | 保留；debug漏传待修               | 继承同缺口                    | gpt、provider、debug/experimental；resolver探针            |
| FD-006          | 授权nested执行与compact声明 | 已采纳完整组合，保留请求权限/终态 | 继承                          | tool-script、plan、question、actor及生命周期测试           |
| FD-009          | 冻结上下文捕获/恢复         | 系统full保留且失败终止            | 加模型侧full入口与turnContext | prefix-capture、checkpoint、spawn、HTTP恢复                |
| FD-010          | think-only摘要恢复          | 保留过滤/错误回滚                 | 继承                          | compaction、reasoning-fallback测试                         |
| FD-011          | 禁止摘要工具调用            | 保留none                          | 继承                          | compaction请求与processor tool-call拒绝路径                |
| FD-012          | 真空响应有限重试            | 默认1，可配置，0关闭              | 继承                          | flag、compaction、重试完成标记测试                         |
| FC-001          | Actor/会话代际与原子准入    | C07已完成；旧测试入口待清理       | 继承并增加时序事务链          | execution/spawn/run-state/task/notification及真实inbox测试 |
| FC-002          | checkpoint writer与冻结前缀 | 保留writer模式；memory注入已收敛  | 继承并冻结turnContext         | checkpoint、prefix及writer模式测试                         |
| FC-004          | MCP来源/连接/成员隔离       | 保留显式导入自动连接与隔离        | 继承                          | config/mcp、sampling、真实stdio及导入测试                  |
| FC-005          | skill权限与冻结catalog      | 保留统一发现/执行和旧snapshot迁移 | 继承并增加catalog限额         | skill、skill-catalog、迁移与权限测试                       |
| FC-006          | plugin实例级记忆开关        | 保留；收紧整链测试承诺            | 继承                          | plugin服务注入、plugin API、手工hook测试                   |
| FC-007          | 根目录/cwd/删除边界         | 保留；旧model API条款退役         | 继承                          | instance、filesystem tools、权限/path测试                  |
| FC-008          | 清理、测试与发布证据        | Actor隔离关闭；workflow隔离仍在   | 继承                          | workflow、fixture、CI/JUnit、退出边界                      |
| FC-009          | 消息来源/重试/错误摘要      | 保留；补trajectory摘要漏记        | 继承并适配回放                | message-v2、processor、trajectory及source schema           |
| FC-010          | WebFetch授权与SSRF分类      | 保留每跳授权和完整fe80/10         | 私网策略只删除分类调用        | webfetch、ssrf；资源限制按实际读体阶段描述                 |
| FC-011          | 模型与内置技能说明          | 保留；纠正仍存在的TUI listener    | 继承                          | prompt、bundled skills、TUI说明                            |
| FC-012          | fork发布/贡献路由           | 保留                              | 继承                          | AGENTS、PR模板、CONTRIBUTING、SECURITY                     |
| FC-013          | 重试预算与MaxMode末步       | 保留；补层级jitter和bounded缺省   | 继承并增加per-agent opt-in    | retry、max-mode、prompt与预算测试                          |
| FC-014          | Cloud Agent环境             | fork专属保留                      | 继承                          | .cursor/environment.json；Bun与只读upstream配置            |
| FC-015          | 压缩投影/冻结/窗口          | ratio已收敛；保留投影与冻结差异   | 另有请求预检和新请求保护      | overflow仅机械差异；compaction/prefix有实质差异            |
| FC-016          | TUI voice归属与字符边界     | 保留owner/drain/grapheme保护      | 继承                          | Prompt、voice-edit、offset及OpenTUI测试                    |
| FC-017          | history投影保真与预算       | 原修正保留；本轮新增明确owner     | 继承相同实现                  | projection/media、details/backfill；NUL/locator测试        |
| DC-NET-001      | 经批准私网WebFetch          | 无该策略                          | 保留                          | 删除assertSafeUrl import和两调用；逐跳权限仍在             |
| DC-NET-002      | RFC1918 MCP兼容契约         | 生产实现已经共享                  | 只增加契约/mock哨兵           | mcp相同blob；oauth=false测试非真实网络验收                 |
| DC-PLATFORM-001 | 无rg/Windows归档回退        | 无该回退                          | 保留窄支持范围                | ripgrep、archive及受限枚举/命令测试                        |
| DC-MODEL-001    | 每Agent MaxMode             | 共享专用MaxMode底座               | 保留per-agent opt-in          | Agent配置→装配→runStep→SDK                                 |
| DC-CONTEXT-001  | 内容/预检/时序/coverage     | 已有部分公共底座，尚未完全等价    | 保留并拆清子契约/限制         | 44行为载体中的上下文、时序、覆盖链及探针                   |
| DC-ACTOR-001    | 模型侧none/state/full Actor | 模型入口none；系统full仍在        | 明确保留完整入口与恢复        | actor JSON/shell/recovery、turnContext与HTTP测试           |
| DC-TUI-001      | 请求模型元数据显示          | locale/title已经共享              | 保留展示策略与known limits    | Prompt/subagent metadata、variant回退与窄终端测试          |
| UP-NEXT         | 网关错误provider别名        | `b4cc11cd`未采纳，建议同步        | 待main采纳后继承              | provider/error.ts；upstream #2395仅一文件                  |

FC-003已退役，不计入有效能力数；两个Actor隔离和旧FD-004已接受行为也不重新列为待同步任务。main是共享修正层，compat保留明确产品扩展；是否提升某项由实际依赖和验证决定，不由文件名或最初在哪条分支实现决定。

## 复核方式与后续边界

从固定SHA重建清单可用 `git diff --no-renames --name-only <base> <target>`；将结果与coverage中相应scope的path集合比较，并检查重复项。每条记录保存原/目标blob与mode，可独立验证审读对象；新增文档文件不回写成旧源码比较项。OpenAPI比较必须区分新增schema/route、源代码已有但上游产物陈旧的字段、纯code samples和排序变化。

本轮修正登记，不自动实施表中的源码建议。新的源码变更需要对应真实入口/调用链回归及package typecheck；小函数探针不替代它们。正文中引用的接受CI只证明所列SHA。历史计划和外部审查讨论保留历史状态，不应被读成当前运行时保证或已解决UI讨论。
