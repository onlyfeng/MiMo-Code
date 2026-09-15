# 2026-09-15 差异审计实施收尾

本轮 F01–F11 已完成修正、共享收敛或明确的保留决定。upstream 的选定最新提交为 `b4cc11cd652195af9a80297ed543218f3172e6c4`；fork 通过 main 接受后，再由 dev/compat 真实继承。当前有意保留的差异由 FD/FC/DC 继续维护。

## 固定代码与完整清单

| 端点                | 本次审计固定 SHA                           |
| ------------------- | ------------------------------------------ |
| upstream            | `b4cc11cd652195af9a80297ed543218f3172e6c4` |
| main 接受代码       | `89866569ee21e106f3c31c39072d8ec3e976d20a` |
| dev/compat 接受代码 | `ab81af7293ac5ea1ee219bb6aab491d4fd665307` |

本报告审计以上固定 Git 树；报告自身及后续纯文档提交不伪装成已包含在自己的源码快照内。收尾文档的精确增量、祖先关系及路径允许清单在最终接受时另行核验，见文末复现方法。

| 完整差异范围             | 原审计 | 本轮固定快照 |
| ------------------------ | -----: | -----------: |
| upstream → main 文件对   |    422 |          449 |
| main → dev/compat 文件对 |    107 |           96 |
| 合计文件对               |    529 |          545 |
| 去重路径                 |    470 |          487 |

完整清单为 [inventory.json](audits/2026-09-15-followups/inventory.json)。不排除文档、测试、生成产物、二进制或文件模式变化；rename 按删除和新增枚举。原始 [529 对清单](audits/2026-09-15-fork-differences/coverage.json) 保持原 SHA 与哈希，不改写为本轮结果。

与原审计比较，441 条身份不变、72 条变化、32 条新增、16 条消失；变化/新增/消失共 120 条均经显式审阅，待审为 0。545 是当前文件对数量，另外保留 16 条消失项以说明处置。完整清单 SHA-256 为 `69459c43712abe9d55ba7eba822295a607b4f82bc47a36a950ad8e4abe5d0290`。

相同 scope/path 的前后 blob 和 mode 全部相同才继承原证据，且不冒称本轮重新执行了它的全部运行验证。变化、新增、消失项均有明确 owner、处理决定和证据；人工归属通过不等于工具自动证明了语义正确。独立验证器重读原始及当前 Git raw/numstat，核对所有条目、指纹、review 和汇总；紧凑格式完整保留原记录引用和人工结论。

## 已处理内容

- F01/F02/F05：采纳网关错误别名，补 debug 的可信模型身份传递，统一可调用的 SDK v2 import 与 camelCase 示例。
- F03：恢复 workflow deadline 用例；修复 worktree 删除 defect 跳过终态持久化和完成通知的问题，保留原始取消/失败结果、生产时限与实例清理。
- F06/F07：共享提交时间/UTF-8 顺序、prompt/compaction 经 `commitUserMessage*` 提交的用户及派生用户消息与 parts 原子准入、有限匿名 ID 重试、严格 checkpoint 水位，以及压缩期间新外部请求保护。撤销结束后恢复每 actor 缓存上限，compat 同步保留批量淘汰时的晚到 checkpoint 候选。重建从最新已提交消息冻结范围；continuation 写入前后均处理同 actor 的未结束请求。
- F04/F08：compat 完整 schema 估算与序列化失败策略已修；checkpoint coverage 的 route/schema/SDK/TUI 缓存作为完整协议留在 compat。
- F09/F10/F11：删除退役 wake 入口及无消费者旧 helper/参数；停止 active_tools 双写并保留旧数据读取；根生成脚本取消隐式全仓格式化，SDK/OpenAPI 生成器自身格式化保留。

12 个原 compat 文件对已确认共享至 main，包括 Session、Inbox、revert、debug/generate、TUI session 和 UTF-8 比较器及相应测试；具体路径见清单的 reviewed_promotions_to_main。该判断同时核对历史与当前三端 blob，不能由路径消失直接推出。四个退役文件及其处理原因也逐项保留。

## 仍有意保留的差异

当前为 9 项有效 FD、16 项有效 FC、7 项 DC；另保留已退役 FC-003 的历史条目。登记项数量不等于独有生产实现数量。

| 归属                        | 保留内容                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| FD-001/002/005/006/009      | run 批准与共享权限隔离、禁用事件/载荷一致及固定重试指令集、可信模型身份、请求固定工具权限、冻结上下文与受限恢复                 |
| FD-004                      | capability API 主体已采 upstream，仅保留登记的少量参数/IPv6 修正及凭据和目录广告边界；旧行为清单是历史/边界记录，不是待同步任务 |
| FD-010/011/012、FC-013/015  | 摘要恢复、禁止摘要工具调用、有界空响应重试、压缩预算与 MaxMode 终止约束                                                         |
| 其他有效 FC                 | Actor/Inbox/checkpoint 生命周期，MCP/skill/插件隔离，WebFetch 资源和授权边界，TUI voice/history 修正及 fork 发布/测试基础设施   |
| DC-NET-001、DC-PLATFORM-001 | compat 经授权的私网 WebFetch 与受限网络/Windows fallback                                                                        |
| DC-NET-002                  | MCP 的生产实现已经共享；compat 保留契约和测试哨兵                                                                               |
| DC-MODEL-001、DC-ACTOR-001  | 每 Agent MaxMode、模型侧 none/state/full Actor、冻结 turnContext 与有界 state                                                   |
| DC-CONTEXT-001、DC-TUI-001  | 内容上限、请求预检、current-turn/coverage 全协议，以及请求模型元数据展示                                                        |

[共享偏离](upstream-deviations.md)、[共享能力](fork-capabilities.md)与 compat 登记是当前行为的权威入口；每个文件对的 owner 和证据可从完整清单反查。

## 验证与 PR 审查

| 接受代码                                                                                                   | 最终 PR head / 审查                                                                                                        | 接受 SHA 的 test / typecheck / lint                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| main `89866569ee21e106f3c31c39072d8ec3e976d20a` / [#131](https://github.com/onlyfeng/MiMo-Code/pull/131)   | `3a12d180` 八项成功；[Codex 完成且无 findings](https://github.com/onlyfeng/MiMo-Code/pull/131#issuecomment-5676094607)     | [test](https://github.com/onlyfeng/MiMo-Code/actions/runs/34939913124) / [typecheck](https://github.com/onlyfeng/MiMo-Code/actions/runs/34939913097) / [lint](https://github.com/onlyfeng/MiMo-Code/actions/runs/34939913166) 均成功         |
| compat `ab81af7293ac5ea1ee219bb6aab491d4fd665307` / [#129](https://github.com/onlyfeng/MiMo-Code/pull/129) | `c407439f` 八项成功；[Codex 完成且无新增 findings](https://github.com/onlyfeng/MiMo-Code/pull/129#issuecomment-5674809678) | [test 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948422) / [typecheck 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948433) / [lint 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948413) |

#129 的有效缓存 P2 已修，早期 ancestry 反馈有实际 Git 图/API 反证。旧讨论的 UI 状态与技术结论分开：P1 尚未手动解决，P2 已 outdated。收尾文档的 PR/接受提交在以上固定代码之后，其发布验收另存外部回执。

具体默认/opt-in 环境、原失败、修正和各阶段测试范围见 [共享实施记录](audit-followups-2026-09-15.md) 与 [compat 实施记录（dev/compat）](https://github.com/onlyfeng/MiMo-Code/blob/dev/compat/docs/compat-audit-followups-2026-09-15.md)。不同矩阵有重叠，不相加成独立测试总数。原先两个 actor 隔离用例已恢复；本轮没有新增 skip。

workflow 的真实删除后故障注入形成稳定红绿，并另用真实 Git 双删除门控复现 RemoveFailedError。Linux 原失败观测到 child Instance 已释放而 runtime.wait 未完成；该次具体 Git 异常没有直接捕获，机制实验与该次观测分开记录。两个较长的 catalog/四 Actor 集成用例经阶段测量后各设明确 15 秒测试壳，保留全部真实工作和断言，没有整体放宽测试或生产时限。

SDK 的 pipe fixture 在完整输出 141 operations 后仍超时退出 137。单变量文件捕获对照通过，测试现与真实构建重定向一致，并保留所有生成/调用/HTTP断言和原时限；生产生成器未改，具体 Bun 回调/退出内部机制未直接捕获。TUI 状态 helper/事件接线、命令 fallback 和 mock 测试不扩大解释为交互终端、真实 Windows 或私网/OAuth 部署验收。

## 后续候选

以下属于另行评估的增强或验证，不是漏同步的 upstream 提交：

1. FC-001 的 Inbox drain 仍依次创建消息、写入 parts、删除队列；取消检查与回滚已有，但崩溃间隙仍可能重放通知。`commitUserMessage*` 的原子事务没有覆盖它；shell 仍分步创建用户消息和 part，assistant/tool 流式写入也不是整体原子提交。
2. FC-006、DC-NET-002、DC-PLATFORM-001 可补实例插件整链、真实私网/OAuth 和 Windows 环境证据。
3. 若需要正文流式内存/完整时限、权威 pending-request variant 或更强持久幂等 receipt，应另定产品契约。coverage 上移和 compat 策略退役同样不在本次共享修正中推定执行。

## 复现边界

在拥有所列 Git 对象的仓库运行：

```sh
python3 docs/audits/2026-09-15-followups/verify_inventory.py \
  --repo . \
  --artifact docs/audits/2026-09-15-followups/inventory.json
```

验证器不需要 Bun，不 fetch、不 checkout、不修改仓库。它核对固定快照的全部差异和归属门；机器核验无法代替人的语义审阅和运行验证。

报告发布后的纯文档增量，通过外部 closing review 绑定实际接受 SHA，并使用同一验证器的 `--closing-review` 核验。允许清单必须与 Git 实际 delta 完全相同，只能包含 docs 下普通非可执行的 md/json/txt 文本；源码、测试、脚本、schema 或模式变化必须生成新审计快照。该外部回执不提交进它描述的 commit，避免循环自证。

收尾 main 文档范围限定为本报告、`inventory.json`、共享实施记录、FD、FC、原审计入口提示和共享 registry history，共七个路径。compat 继承这七个路径，并更新自身 overrides、实施记录和 registry history。每个实际发布端点的完整路径与 blob/mode 将保留在外部核验回执；这些记录不改变上述固定源码清单的计数。
