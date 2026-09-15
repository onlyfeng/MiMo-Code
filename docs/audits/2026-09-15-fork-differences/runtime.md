> 本文记录固定代码快照的审计发现。起点登记的“漏记／过期”已在本轮文档修订中对账；旧入口裁剪与验证欠账仍未实施。逐文件记录已归档至 [coverage.json](coverage.json) 的 runtime 分组，无需依赖临时附件。当前结论与处置以 [总报告](../../fork-difference-audit-2026-09-15.md) 为准。

# main 运行时差异审计

本组覆盖 manifest 中全部 **130 个文件**。结论是：Actor/Runner 的取消与恢复所有权、冻结请求权限、compaction 的摘要接受规则仍有明确保留理由；当前可继续收敛的是无生产调用的旧 wake 入口、已经共享的算法与提示，以及登记中被宽泛 owner 隐藏的重试和 system/telemetry 行为。没有把测试文件存在或历史 CI 通过当成本轮运行通过。

审计固定在 upstream `5198ff540efb5ca9fff2baa64555324d43a721b9` → main `648f7cdf100b30ff046db7518d8f832473b61481`；compat 仅参考固定 `90abf6e447d7a5e5b405aba301bf1a951f469bf6` 的独立分组结论，不扩大为最新 upstream 或当前远端同步结论。只读 Git 对象与调用链，没有改源码、refs、安装依赖或运行测试。仓库地址仅用于定位本地证据。

审计从目标 SHA 的 AGENTS.md、upstream-deviations.md、fork-capabilities.md 开始，但以全部 manifest 文件的实际 diff 反查 owner。生产文件检查差异及相关调用者；大型 Actor/Prompt/测试文件按 admission、取消、恢复、冻结 prefix、权限、投影和销毁分组检查增删 hunk 与关键断言，并不声称逐行重读了所有未变化代码。130 个路径均有语义审计记录，未审文件为 0。完整逐项结果见 [coverage.json](coverage.json) 中 `review_group` 为 `runtime` 的条目，每路径一条，含具体差异、归属、登记偏移和建议。

`drift` 记录固定 main 文档起点；其中本轮已补的登记仍保留“漏记”，已补内容及当前处置以总报告和登记正文为准。旧 wake 专属实现和测试标为“过期”，表示已经退役的入口仍留有载体，不是重开已关闭的 C07 行为缺口。本文不会把当前有理由保留的功能，因为路径很大就统称为不可对齐。

## 1. 旧 wake 入口已失去生产调用，可以继续裁剪，但不能连带删 resume

**建议：下一轮统一入口；代码收敛机会，尚不是已证明的运行故障。**

main `packages/opencode/src/actor/spawn.ts:1543` 定义 `runPersistentTurnImpl`，`:1645` 包装为 `runPersistentTurn`，`:2222` 仍导出服务方法；`continueTurn` 在 `:1474` 定义，仅由这条旧路由调用。对固定 main 的 `src` 和 `test` 搜索 `runPersistentTurn`：生产调用点只有定义、导出与 `session/prompt.ts:5756` 的退役说明，真正调用者均为测试。当前唤醒生产路径使用 Inbox → SessionPrompt.loop/runSharedLoop → ActorExecution；它不会再进入这个旧入口。

这使“维护一套不被生产使用的 lifecycle 路由，并以其测试增加维护成本”成为明确收敛对象。`cancel-notification.test.ts` 多处直调旧方法，`spawn-notification.test.ts:619`、`spawn.test.ts:2768` 等也是内部旧入口覆盖；它们不能替代现入口的 queue/admission 证据。新增的真实 Inbox、Actor 工具和两 Actor 隔离回归仍有价值，应保留。

删除边界必须收窄：`finishPersistentTurn`（`:1366`）和 `lifecycle.acquireWake` 并未整体退役，`Actor.resume` 在 `:1713`、`:1770` 仍依赖它们。`inbox/wake-source.ts` 的 sender-disposal Context 也应跟随消费者调用链决定去留，而不能把接收实例的 `RunDisposal` 一并移除。可先把仍有价值的旧入口断言迁至生产入口，再删除 `runPersistentTurn` 及其专属分支。FC-001 已正确记录生产 wake-routing 退役；后续应明确区分残留 helper 与仍在使用的 generation primitive。

静态复核命令：

```sh
git grep -n 'runPersistentTurn' 648f7cdf100b30ff046db7518d8f832473b61481 -- packages/opencode/src packages/opencode/test
git grep -n -e continueTurn -e finishPersistentTurn -e acquireWake 648f7cdf100b30ff046db7518d8f832473b61481 -- packages/opencode/src/actor/spawn.ts
```

## 2. 共享重试解析是实质新行为，不能仅记成 MaxMode 末步限制

**起点漏记；本轮已扩展 FC-013。建议保留通用修正并与 MaxMode 最后一步的强制规则分开描述。**

`session/retry.ts:147` 的 `configuredBudget` 将以前没有下沉的顶层 jitter 应用到各预算。覆盖顺序从低到高是 **base → global jitter → global per-budget → provider jitter → provider per-budget**。`:175` 的选择顺序先按 request/max-candidate/max-judge scope，再按 network/server/rate_limit/unknown kind；否则一次 MaxMode 网络错误可能错误落入持久 network 预算。`decide` 同时确保 request scope 的 phase 仍为 request，使 setup 中的 SSE 类错误不被标成流式预算/遥测。

新增 `NETWORK_MAX_RETRIES=5` 只是给显式 `mode: "bounded"`、但未指定次数时提供 fallback。`mergeBudget` 在 `:144` 对 persistent 模式仍移除 maxRetries，因此**默认 network 仍是 persistent，不能登记成“网络重试统一限制五次”**。`retry.test.ts` 的新增用例分别保护 jitter 覆盖、bounded fallback、scope 优先级与 request phase。这个行为跨普通请求和 MaxMode，原 FC-013 只强调 MaxMode final-step/bounded retry 的摘要不够具体。

## 3. GitLab workflow 的 per-turn system 与 telemetry 现在对齐了实际 providerSystem

**起点漏记；本轮已补 FD-002。建议保留，可作为通用 provider 修正继续对齐。**

`session/llm.ts:551` 为 OAuth/workflow 构造含 per-turn `user.system` 的 `providerSystem`；workflow model 在 `:674` 从 `system.join` 改为 `providerSystem.join`，request telemetry 在 `:790` 也改为相同数组。旧版本在 append 场景中可能记录/传递一份缺少这段每轮指令的 system，而请求组装已经使用另一份 system。replace-agent 场景须保持已解析替换基底，并避免重复 tail。

新 `llm-gitlab-workflow-system.test.ts` 分 append/replace 检查 AGENT/CALL/TURN 内容及 telemetry 与 workflow 对象相等。它用真实 GitLabWorkflowLanguageModel 类型并替换 doStream 来观察参数，证据到本地模型对象与 telemetry 为止，**不是外部 GitLab 服务的端到端 wire 验证**。起点 FD-002 的 disable parity、immutable retry、正向 actor identity 三项没有把这项修正单列；本轮补为该 owner 下的独立契约，避免“大文件已有人认领”掩盖漏记。

## 4. 错误摘要不再序列化整个 NamedError；证据不能扩展成全局日志脱敏

**起点漏记；本轮已补 FC-009。建议保留并限定表述。**

`session/trajectory.ts:43` 的 `sessionErrorText` 现在识别 `{data:{message:string}}`，直接返回 `data.message`；否则保留 JSON fallback。`trajectory.test.ts` 用合成 response body/headers/metadata 检查这个摘要只输出错误 message。该差异超出原 FC-009 的合成来源、text part 和重放边界摘要，虽位于它列出的 watch surface，仍应明记。它只收窄这一 helper 的输出，不能据此声称 provider 错误全链或全部 telemetry 已统一删去敏感字段。

## 5. FC-006 实现符合实例配置目标，但原测试描述超过实际测试层级

**起点证据描述过期；本轮已缩窄。建议保留实现。**

`plugin/index.ts:650` 的 `triggerActorPostStop` 使用该服务捕获的 `config.get()`，在 `:656` 注入 `memoryWriteEnabled`。`subagent-progress-checker.ts` 删除经 HTTP client 获取配置的逻辑，只在输入严格等于 false 时跳过，缺字段继续执行，符合 instance-local 与旧 hook 输入兼容的契约。

然而起点 FC-006 声称 `subagent-progress-checker.test.ts` 覆盖 instance-local configuration paths。该测试通过 `getHooks()` 和 `makeInput(..., memoryWriteEnabled)` 手工送入三态，不实例化 Plugin.Service 到 config 注入链。源码能静态证明调用了同实例配置；消费者测试能证明 enabled/disabled/absent 分支。两者不是跨 cwd 的整链运行证明。本轮缩窄登记已足够，不应无依据报成生产 bug；若需要更强证明，可另安排双实例配置不同的窄服务集成用例。

## 6. FD-012 的“固定一次”与当前配置解析冲突

**起点登记过期；本轮已修正为默认一次、可配非负整数，0 可关闭。重试实现未变，成本理由按默认值解释。**

`flag/flag.ts:183` 是 `nonNegativeNumber("MIMOCODE_COMPACTION_RETRY_LIMIT") ?? 1`；解析只接受非负整数，0 可关闭，2 及以上有效，非法值回退到 1。`compaction.ts:571` 按这个值循环，而不是写死一次。起点 index 的 “Keep the bound at one” 不准确；正文/源码里“一次区分瞬时空响应、第二次只烧成本”的话只能解释默认选择，不能当作不可改变的运行不变量。

保留理由仍然成立：重试严格限于 `result === "continue"`、非 error/content-filter 终态、没有非空 text/reasoning 的步骤。重试前在 `:594` **删除** `time.completed` 键，让中断后恢复能够看见未完成的摘要；赋 undefined 不等价。每次 attempt 的 step-finish 保存用量，总成本累计，而 assistant.tokens 表示最后一次请求的上下文占用；不能把总重试花费和当前 context footprint 混为一谈。

## 7. workflow deadline + worktree 组合仍有明确验证欠账

**登记准确，仍应保留为未关闭项。**

main `test/workflow/runtime-worktree.test.ts:23` 为 `const deadline = it.live.skip`，`:203` 用它包裹 “deadline-fired run reclaims ... worktree”。固定 upstream 的同场景在 `:196` 直接 `it.live` 执行。当前 `runtime-timeout-cleanup.test.ts`、sandbox abort、相邻 cancel 和 per-agent timeout 场景能覆盖有界返回、后台 cleanup、部分 worktree 回收，但不能证明这个被跳过的组合没有回归。

源注释把隔离原因归于断言完成后的 test server/child Instance teardown 卡住；本轮没有复现，故只确认“历史 fixture 原因仍未获得关闭证据”，不把注释当成已证明的现时根因。建议安排单独 fixture teardown 调查后解除 skip；不要因其他 suites 存在就宣称全部 deadline/worktree 清理验证完成。`runtime-nested.test.ts` 的 25→60 秒只是等待预算适配，也不证明新的运行语义。

## 已收敛边界与仍有理由保留的历史决策

| 归属            | 固定 SHA 的现状                                                                                                                                                                                         | 当前建议与风险                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| FC-001 / FC-008 | ActorExecution、Runner、lifecycle 分别承担 admission、取消提交、generation/terminal owner；postStop 后再落结果、结算与父通知。C07 claim/cancel/postStop 与两 Actor 隔离已有真实回归，不能重新列为缺口。 | 保留这些现行边界。继续统一入口时，不能将“取消已提交”误作“所有 finalizer 已结束”，也不能让旧 idle 覆盖替代实例 busy。                          |
| FD-001          | RunApproval bridge 随 invocation/scope/断连关闭，子调用只继承本次有效 context；恢复消息提交与审批登记处于受约束入口。                                                                                   | 拒绝跨 run 修改共享开关仍有理由；不能以减少上下文对象为由恢复共享全局授权。                                                                   |
| FD-002          | 禁用 UI/payload 一致性、首步 frozen schema 重试、正向 registered peer 身份仍为残余；GitLab/providerSystem 是本轮补出的第四类具体行为。                                                                  | 保留独立边界；上游已经默认交付指令，不应继续把“默认不送指令”当现时拒绝理由。                                                                  |
| FD-005 / FD-006 | 完整解析身份贯穿 prompt、工具声明、native schemas、snapshot；exec 内每个工具仍受权限/冻结成员限制，合法观察子 parts 不产生执行权限。                                                                    | 保留。上游 compact 工具外壳可以共享，但“全授权定义”和“本次 advertised subset”不可合并成一个无权限列表。                                       |
| FD-009          | Actor/checkpoint 冷热捕获缺失、身份不明或空继承 prefix 在子执行前失败；保存并重用冻结成员。                                                                                                             | 拒绝实时上下文 fallback 仍有理由；工具名称一致不等于 schema/权限/identity 一致。                                                              |
| FC-002          | upstream 已有 canonical writer、隔离 child、默认 fork 与显式 fork:false 的模式骨架；当前残余包括失败关闭、完整 identity/成员、writer whitelist 文本一致与字面 memory placeholder 的工具边界解析。       | 保留真实残余，差异描述可更清楚地区分共享骨架。不能因上游也有 writer 就删除 FD-009；也不应为共享骨架继续维护平行实现。                         |
| FD-010 / FD-011 | 合法 reasoning-only summary 可恢复，error/content-filter 仍拒绝；main 请求 toolChoice=none。upstream compaction.ts:499 仍为 auto，而 processor.ts:466/:495 对 summary tool call 抛错。                  | think-only 扩展和拒绝 auto 均有当前代码理由；在摘要 processor 能处理该事件之前，恢复 auto 会引入可避免失败。                                  |
| FD-012          | 空步骤默认一次重试但可配非负整数；其他失败形状不进入这个重试分支。                                                                                                                                      | 保留；本轮文档已按默认值及可配范围修正，不能宣称硬编码上限一。                                                                                |
| FC-005          | 直接用户轮 catalog 更新、v3 managed slot 与严格 legacy provenance；冻结的其他 system 字节保持；冷捕获/重开/compaction 共享 catalog pair。                                                               | 保留；按类似文本删除 legacy catalog 会误删用户内容，刷新 catalog 不能顺带刷新旧 AGENTS/plugin 字节。                                          |
| FC-009          | user/source/task 来源、text hook 生命周期与任何输出后不整体重试，避免副作用重复执行；错误摘要由本轮补记。                                                                                               | 保留，普通文字输出也构成 replay boundary，不能只检测工具完成。                                                                                |
| FC-015          | **overflow.ts 仅数字格式差异**，当前 ratio/max_context/reserves 算法与 upstream 相同。起点 FC-015 正文已明确共享 ratio-only trigger，登记本身准确。                                                     | 旧额外 reserve cutoff 的拒绝理由已经退役；保留的是限定 tail 预算、冻结 advertised tools/identity、nested effect manifest 和 no-tool summary。 |
| FC-011          | **default.txt 仅尾随空白差异**；actionable task/Actor 提示上游已共享，新 system.test 在保护共享文本。GPT 提示仍有 nested exec/交互授权说明，MiniMax 仅去重并补 dev/compat CI 分支。                     | 机械格式继续对齐；不要把测试新增断言误当成对应默认提示新增功能。                                                                              |
| FC-003          | read-before-edit owner 已退役。                                                                                                                                                                         | 不恢复旧检查，不把 instance-state generation 隔离误归该 owner。                                                                               |

main 的 `classify.ts` 与相关运行判断已改为 parentID 相等，恢复提交也有 immediate transaction，但这只是局部消除 ID 字典序依赖。[compat 分组](compat.md)另识别到完整 message 创建/提交幂等、单调时间、projection/admission 保护，以及 StructuredOutput 回填等通用修正；不能从 main 的局部变化推断已经全部合并。它们是后续向 main 提取通用修正的候选，具体证据和差异见该分组，当前处置见总报告；本组没有据此扩大 130 文件覆盖范围。

## 验证与交付边界

本组验证为固定 Git 对象 diff、生产调用者查找、测试设计和断言审计；没有新增运行探针、没有执行 bun test/typecheck，也没有使用远端 CI 代替本地证据。产物机器检查确认 manifest 130 个路径与 coverage 一一相等、无重复、字段齐全；分类机械差异与测试 fixture 适配，不把它们计成新产品行为。

原始差异可从 coverage 条目的 `base`、`target` 与 `path` 重建。例如下面命令复现共享重试文件的差异；替换最后的路径即可检查本组其他条目：

```sh
git diff --no-ext-diff 5198ff540efb5ca9fff2baa64555324d43a721b9 648f7cdf100b30ff046db7518d8f832473b61481 -- packages/opencode/src/session/retry.ts
```

无需为完成本审计实现修复。后续若进入实现，优先做旧 wake 入口及测试迁移的有界裁剪，其次处理唯一仍跳过的 workflow deadline/worktree fixture；其余保留项应在上游具备同等语义和行为证据时逐项统一。
