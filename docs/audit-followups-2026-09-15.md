# 2026-09-15 差异审计后续实施

用户批准依次实施[差异审计](fork-difference-audit-2026-09-15.md)的建议，并完成文档发布。本文记录实施与分阶段验证；当前完整差异和残差决定见[收尾报告](fork-difference-closure-2026-09-15.md)。原审计的固定文件清单与发现保留原快照，不回写成新源码清单。

## 范围与基线

- 模式：执行。正常 upstream 同步使用实时刷新；同时实施已经批准的缺口修复和通用能力收敛。
- 初始接受 main：`648f7cdf100b30ff046db7518d8f832473b61481`；compat：`90abf6e447d7a5e5b405aba301bf1a951f469bf6`。
- 选定 upstream：`b4cc11cd652195af9a80297ed543218f3172e6c4`，相对已接受 `5198ff540efb5ca9fff2baa64555324d43a721b9` 只有一个提交、一个生产文件 `provider/error.ts`。本轮固定代码接受时已确认无遗漏的 upstream 提交；收尾文档发布后另核对最终 refs。
- 文档先进入 main，再由 compat 继承相同的 FD/FC 与审计内容。通用修正先 main 后 compat；compat 特定的预检与产品策略由其自身分支维护。
- 保留主工作区和另一 Agent 原工作树。实现与验证在本操作的独立工作树进行；资源台账不把个人路径写入产品文档。

main 第一批经 PR #128、共享修正经 PR #130 接受；撤销缓存修正经 PR #131 接受为 `89866569ee21e106f3c31c39072d8ec3e976d20a`，当前 runtime/test 快照为 `3a12d1800d9bfd002f543764e4ec72047e6e6bb3`。compat PR #129 最终 head 为 `c407439ff4d213977acf3986d79a4e31627cf9db`，接受点为 `ab81af7293ac5ea1ee219bb6aab491d4fd665307`；接受合并的 Git 树与 compat runtime/test `02cd25b5385dbaffcc629693ca1df2da15af68f2` 完全相同。各阶段验证保留其原始范围。

## 实施清单（N = 11）

| ID  | 选定行为与归属                                | main 结果                   | dev/compat 结果                | 决定性载体/验证                                                           |
| --- | --------------------------------------------- | --------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| F01 | upstream 网关错误别名                         | 已接受 #128                 | 已继承，已接受 #129            | provider/error.ts；别名、大小写、421/441与非网关隔离                      |
| F02 | 可信模型身份传到 debug；FD-005                | 已接受 #128                 | 已继承，已接受 #129            | debug agent真实入口、harness resolver及负向/显式模式                      |
| F03 | workflow deadline真实执行与释放；FC-008       | 已接受 #128/#130            | 已继承修正，已接受 #129        | runtime-worktree、真实清理 defect、终态持久化/通知与 Instance 释放        |
| F04 | 请求估算及序列化失败策略；DC-CONTEXT-001      | 无对应预检扩展              | 已修正，已接受 #129            | 完整tool schema、实际prompt预检、有效工具集合及保守失败                   |
| F05 | 通用SDK示例生成正确性；FC-008                 | 已接受 #130                 | 已继承，已接受 #129            | 生成器、OpenAPI code samples、实际v2调用；不混入compat schema             |
| F06 | 消息时序与原子用户提交；FC-001/DC-CONTEXT-001 | 已接受 #130                 | 已收敛，已接受 #129            | createMessage、UTF8排序、producer、fork/revert/checkpoint及TUI消费        |
| F07 | 并发压缩保留新请求；FC-015/DC-CONTEXT-001     | 已接受 #130                 | 已继承及验证 gate，已接受 #129 | compaction、pending external admission、continuation前后检查              |
| F08 | checkpoint coverage协议归属；DC-CONTEXT-001   | 归属决定已接受 #130，不上移 | 保留完整协议，已接受 #129      | route/schema/SDK/TUI缓存；不允许只移动单边载体                            |
| F09 | 退役入口及无调用残留；FC-001/008、FD-004/005  | 已接受 #130                 | 已继承清理，已接受 #129        | 旧wake入口、三helper、loader参数、worker与Actor注释；保留resume仍使用路径 |
| F10 | 旧工具mask存储及无用重载；DC-CONTEXT-001      | 不引入旧扩展                | 已收敛，已接受 #129            | tools.active、旧行读取、空mask、migration和独立MCP hash                   |
| F11 | 机械差异与生成格式化策略；FC-008/015          | 已接受 #130                 | 已继承，已接受 #129            | root generate与已收敛overflow/default prompt；不改运行策略                |

私网 WebFetch、每 Agent MaxMode、模型侧 full Actor 和 TUI 元数据仍按七项 DC 的现有政策保留；NET-002 的生产 MCP 实现已经共享。通用正确性上移不能顺带改变这些产品选择。

## 已取得的验证

### 第一批 main 修正

源码/测试快照：`0b12e39ebfae5e0a01e623de1b4f58e96c86cb09`。F01 采纳的生产文件与 upstream `b4cc11cd` 完全一致。六组 alias 回归在旧实现上失败，新实现 provider error 集为 25 pass、45 断言，涵盖四组非网关近似名称。定向 lint 为 0 error、6 warning（继承的 upstream 源码），不宣称零警告。

F02 将可信 `harness_model` 传入 debug 工具发现。八个真实 CLI 子进程检查 agent/default 模型、可信与不可信 alias、模型家族 veto 及显式开关。F03 恢复 deadline 实例回收测试，新增真实启动、准确 deadline 原因及 Instance 释放断言；当时本地没有复现历史 disposer hang，未修改生产清理策略。四个 workflow/disposal 文件同进程 44 pass、0 skip、262 断言、64.08 秒自然退出。该矩阵显式启用 workflow 开关，属于 opt-in 验证。

随后 PR #129 的 `eaf99b8b` 在 Linux [shard 1](https://github.com/onlyfeng/MiMo-Code/actions/runs/34929548424/job/104254710256) 复现该用例 120 秒超时，之后其他测试仍在执行，最终触及分片八分钟总时限。没有据此认定进程退出或 Instance disposer 就是根因。独立观察提交 `e2713ca1` 仅记录原执行及 fixture/layer 的阶段，不改变挂起方式、取消策略或时限；[同工作流诊断](https://github.com/onlyfeng/MiMo-Code/actions/runs/34931078604) 用于定位，临时观察代码不进入接受分支。当时 PR #129 在原因和修复验证完成前暂缓合并；后续修正和接受记录见下文。

PR #126 初始 CI 暴露 Runner 重入测试的 5/50ms 竞争：父测试被调度晚时首执行可能已结束。现在通过 started/reentered/finish 信号确保正在执行时重入，再放行首任务；生产 Runner 未改。

第二轮同 head 的[Linux 观察](https://github.com/onlyfeng/MiMo-Code/actions/runs/34932109523/job/104262298746) 捕获 child Instance 在约 10 秒释放，但 `runtime.wait` 未返回，直到 120 秒测试时限。第三轮[深层观察](https://github.com/onlyfeng/MiMo-Code/actions/runs/34933167224/job/104265451092) 完整退出，同时证实 reclaim 与 isolated disposer 会并行删除 worktree。该轮没有捕获 Git 缺陷异常，不能把具体竞争错误写成直接观察事实。

独立真实 Git 门控让两次 remove 都先读到同一 worktree，实际执行的 `git branch -D` 返回 `[0,1]`，第二次从真实删除分支抛出 `WorktreeRemoveFailedError`；1 pass、4 断言。探针只控制真实命令调度，没有伪造输出或退出码。这验证竞争机制能够产生该缺陷，仍不冒称捕获了原 Linux 那一次的异常。

源码确认 `Worktree.remove` 的 Git/文件错误以 Effect defect 抛出，原 `Effect.ignore` 只吞 typed error，缺陷会跳过后续终态持久化和 Deferred 完成。真实删除目录后注入同类 `RemoveFailedError`，旧实现稳定复现 deadline 等待超时及 cancel 直接抛错。修复 `a748c5f0`（main 整合 `97b69a20`）只在该清理项捕获并记录 defect，保留原始终态、纯中断和所有生产时限。两例由 0 pass/2 fail 转为 2 pass、26 断言，检查 outcome、DB、WorkflowFinished、真实目录和完整 Instance 释放；fixture 仅在全部断言之后释放挂起响应，不代替生产取消。

作者完整 worktree 文件为 8 pass、49 断言、39.03 秒；runtime 取消/失败/代际/deadline 五例为 5 pass、17 断言、9.37 秒，package typecheck 通过。两组清除八项 selector 后仅显式启用 workflow，属于 opt-in。诊断分支保持独立，不合入生产。另一个纯挂起 HTTP fixture 的失败清理会遮盖原断言，但它发生在资源清理阶段，不能用于解释第二轮已定位的 `runtime.wait` 卡住。

root 在 `97b69a20` 清除八项 selector 后独立运行完整 worktree 文件，默认路径 8 pass、0 fail、49 断言、39.63 秒自然退出。该结果与作者的 opt-in 矩阵分开记录。

第一批 main 的最终默认矩阵为 provider error、debug agent、harness alias、tuple key、Runner 五文件，88 pass、0 fail、335 断言、84.40 秒；package `bun typecheck` 通过。独立复核其中三文件为 37 pass、101 断言。默认验证显式清除 `MIMOCODE_EXPERIMENTAL`、`MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`、`MIMOCODE_CODEX_MODE`、`MIMOCODE_COMPACTION_MAX_CONTEXT`、`MIMOCODE_COMPACTION_TRIGGER_RATIO`、`MIMOCODE_DISABLE_CHECKPOINT`、`MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`，保留包 preload 的 Orchestrator、内存数据库和隔离配置。早期仅清前三项的运行继承了 workflow 开关，不能作为默认路径证据。

另有本地 shard 4 同分组的 126 文件矩阵：1417 pass、20 skip、4123 断言、459.63 秒。该轮 `CI=true` 但继承 workflow 开关，是 opt-in 共享进程补充证据，不等同默认 CI。这是当时的本地补充证据；后续接受 SHA 的 CI 见发布记录，不将此矩阵改称远端验收。

### SDK 与退役路径收敛

F05/F09/F11 整合源码快照 `99297fa6`。SDK 示例改用 `@mimo-ai/sdk/v2` 和生成客户端的 camelCase 方法。默认两文件验证为 5 pass、1154 断言：同时检查实际生成与发布的全部 140 个 operation samples 可调用，并执行 `prompt_async` 示例核对 HTTP 方法、路径和请求体。根 `bun script/generate.ts` 在整合后完整运行两次，SDK/OpenAPI 均没有额外差异；没有引入 compat 的 coverage 或每 Agent MaxMode 字段。

F09 删除仅供旧测试调用的 Actor wake 入口及其专属上下文注入，保留 resume 仍用的执行/通知路径。旧十例逐项映射至真实 Inbox 路径或明确退役旧 DTO 注入/owner-follower 结果共享语义。当前真实 continuation 向父 Inbox 通知且不发 toast，没有伪称保留已删除入口的 toast。作者默认 Actor 矩阵 143 pass、工具/worker/provider 消费者 131 pass、Inbox 24 pass、串行 main/队列 6 pass（其中两例与 Actor 组重复）；独立十目标例为 10 pass、64 断言。package typecheck 通过。main late-row 用例在并发负载下曾超时，未改源码，独立复跑和最终串行矩阵通过；保留该时序敏感性记录。

F11 取消根生成脚本隐式全仓格式化，保留 SDK 及 OpenAPI 自身格式化。隔离探针执行真实脚本并替换生成子命令，前后成功码均 0、任一步失败码均 1，SDK→OpenAPI 顺序、cwd 和重定向不变。`0.5/0.7` 与 upstream `0.50/0.70` 等价，保留 formatter 规范；default prompt 也保留无尾空格写法。这些机械差异没有额外行为待同步。

冻结 catalog 的五轮真实请求测试还移除了无关 npm 安装等待：通过既有 `prepareConfigDependencies` 准备隔离的配置目录，保留真实插件、Git 与五次模型请求。原默认 5 秒先在依赖等待处零断言失败；准备依赖后推进到 13 个断言仍超时。有界阶段观察确认测试体约 6.54 秒、15 个断言自然完成，因此仅本用例使用 15 秒测试壳，生产时限不变。`df02208e` 只调整该测试。root 在当时完整运行时/测试快照 `37b97a7b` 无观察器运行 SDK samples 与 frozen catalog 两文件，2 pass、1139 断言、14.44 秒自然退出；SDK 保留原 child 30 秒、test 45 秒限制，catalog 使用明确的 15 秒测试壳。

SDK 的 pipe 捕获在 compat 42 文件矩阵及同路径仅 SDK 目标中仍复现原 30 秒退出 137。仅在退出后读取父进程已有输出的探针确认 553,610 字节为完整 JSON、含全部 141 operations，生成/格式化已经完成；不能再归因为 frozen 的依赖安装。保持真实 child 和原时限，只把 stdout 指向临时文件的对照通过，与根 `script/generate.ts` 和 SDK build 原有重定向方式一致。`cdfd1a80` 因此仅让测试按真实构建路径捕获完整文件，并自动清理；生成器生产代码、30 秒 child/45 秒测试时限及所有 callable/HTTP 断言不变。具体 Bun 回调/退出内部机制未被直接捕获，没有声称修复全部生产 pipe 场景。root 在 `cdfd1a80` 独立运行 SDK 生成/发布调用测试，1 pass、1124 断言、5.82 秒自然退出。

### 共享消息时序

F06 原提交 `b2dad34ea1cde4509d9f6ce4143c8b6a0094f858`，整合为 `8cfc6eca`。消息提交、fork/revert/checkpoint、usage recovery、loop-streak 和 TUI 统一按提交时间与 UTF-8 ID tie-break 处理；经 `commitUserMessage*` 提交的用户及派生用户消息与 parts 原子提交并拒绝身份冲突。新增行为不包含 compat 的内容上限、预检、MaxMode 或模型侧 full Actor。

独立审核发现并修复两项组合问题：缺失 checkpoint watermark 不得被后续 collapse 当作有效范围；撤销分页加载的边界不得被 live message update 挤出缓存。最终相关十文件 155 pass，真实 prompt 子矩阵 19 pass；独立六文件 103 pass、287 断言，以及原子准入六例 6 pass、34 断言。整合后 root 默认五文件再验证 85 pass、239 断言。两个 package typecheck 通过。更早全量相关矩阵为 356 pass、2 个既有 skip；最后补丁后按影响范围复验，未把旧全量结果移称为最终完整矩阵。TUI 证据是状态 helper 测试和事件接线核验，未运行交互终端。

PR #130 初始 head `3836da63` 的 CI 又发现两项组合回归，均已在原失败条件下复现并修正：

- `1efa8ff9`：provider 返回 overflow 时，checkpoint 重建此前读取流式执行前的消息快照，遗漏刚提交的高用量 assistant；下轮因水位没有覆盖该行再次重建。现在在准备重建时读取同 session/actor 的最新已提交消息，并在异步渲染前冻结该范围。原 50,000-token 用例从两个 marker 失败恢复为一个，新增断言同时检查真实 assistant、水位和 usage recovery。没有放宽恢复判定，也没有把 writer stub 改成不真实的边界。
- `d726a454`：同一 prompt message ID 的重试会为未指定 ID 的 parts 再生成身份，触发 F06 的严格冲突检查。producer 现在标记自身生成的 part IDs，在事务中按匿名 parts 的相对顺序匹配当前持久 parts，再完整比较内容；返回持久身份。匿名 parts 换序、显式 ID 冲突、不同内容/metadata、跨消息与跨 actor 仍拒绝；显式 ID 已确定身份时，输入数组换序可以在规范排序后等价。若执行期间追加了 parts 或修改 metadata，旧输入也可能不再匹配；这是相同当前内容的有限幂等，不是整个消息生命周期的重放保证。并发相同请求验证仅提交一份 user/parts，并仅触发一次标题生成。

作者最终准入子矩阵为 10 pass、102 断言。root 在 `d726a454` 独立运行完整 title-first-turn、auto-overflow-writer-first、usage recovery、tail digest、checkpoint unify、rebuild reset 和 on-the-spot 七文件：49 pass、0 fail、298 断言、38.49 秒自然退出。使用原测试时限，清除上述七项环境 selector 及 `MIMOCODE_EXPERIMENTAL_WORKSPACES`，保留包 preload；没有把先前矩阵当作新修复后的全量重跑。

原子提交范围限于 prompt/compaction 经 `commitUserMessage*` 提交的用户及派生用户消息与 parts。shell 仍分步创建用户消息和 part，assistant/tool 流式写入也不是整体原子事务；Inbox 当前消息、parts 与队列删除仍分步执行，未声称 Inbox drain 已具备跨这些步骤的 crash-atomic 保证。

### 并发压缩与请求准入

F07 生产实现由 `7fd795db` 整合为 `79df88f0`，额外 gate 测试由 `f5750b6a` 整合为 `313ca1dd`。新外部 user/spawn 请求与其后缀必须保留，即使可选旧轮次预算为零；其成本先占用可选预算。synthetic/hook 消息不因此获得外部请求身份。压缩按同 session/actor 等待尚未结束的外部准入，并在自动 continuation 写入前后核对，精确清除被新请求替代的消息及 parts。失败和中断释放等待，其他 actor 不受阻塞。

真实 MCP gate 覆盖同 actor 成功/失败、其他 actor、写入后清理和中断后连续两次压缩。补充测试在删除 post-insert 清理和 admission 完成通知的受控反例中分别捕获残留消息与 join 超时；反例源码已恢复。作者最终默认 admission 矩阵 11 pass、96 断言、18.02 秒，package typecheck 通过。root 在 `313ca1dd` 的默认五文件整合矩阵为 183 pass、2 个既有 skip、892 断言、197.63 秒自然退出，包含完整 prompt-effect、projection、message filter、revert 和 loop-streak。两个 skip 为 upstream 已有的 Bash 取消与排队 shell 取消用例，未新增 skip。

`c6e30d0b` 同步配置 schema、内置指南及生成 SDK/OpenAPI，明确必留新请求不受可选预算截断；标准生成正常完成，变动限定为描述。随后 SDK/OpenAPI 两文件验证 5 pass、1154 断言，opencode、sdk、shared 三包 typecheck 通过。运行与生成描述分开记录，没有把此前源码测试移称为描述改动后的整套重跑。

四个串行 Actor 的 approval 集成用例在 compat `c2607746` 的完整 prompt 矩阵和原 5 秒定向运行均超时。单例阶段观察确认四个 child 全部成功、测试体 7.33 秒、17 断言，随后无观察器通过。`8d5ac893` 只为该用例明确 15 秒壳，保留 subagent/peer × 继承/不继承的四组真实工具/模型执行及全部断言，不调整整份 prompt 的默认预算。root 在 main 独立定向验证 1 pass、17 断言、11.87 秒自然退出。该阶段 runtime/test 引用为 `8d5ac893cafafa529abf0644c6d68de615374d93`。

### 协议归属决定

F08 的 checkpoint-coverage route、schema、SDK 与 TUI 缓存作为完整协议留在 compat。没有 core engine 对该查询 API 的依赖；共享正确性所需的消息时序、checkpoint 边界及 main 现有 TUI 水位判断由 F06/F07 修正，不要求新增 main API。私网和 Actor 等原有产品策略继续保留。

## 发布与审查

文档 PR [#126](https://github.com/onlyfeng/MiMo-Code/pull/126) 已合并至 main `818457d08e9d39f561cdd2bcb86ee4a73bcf5fbf`。Codex 提出的 FD-004 历史锚点问题通过显式保留旧锚点修复；最终 PR head 的八项检查和自动复审通过，合并 SHA 的 test/lint/typecheck 均成功。文档传播 PR [#127](https://github.com/onlyfeng/MiMo-Code/pull/127) 的八项检查和自动审核通过，已合并为 `b3b32061cfcf997d3fb1cac0a73302e551678a96`；合并后的 test/lint/typecheck 均通过。第一批 main PR [#128](https://github.com/onlyfeng/MiMo-Code/pull/128) 已接受为 `f10fddb67d830b82890206759c53cef4d8710460`；最终 head `6eb559b86b10b5e6bcf7eea50b873eb714c9b137` 的八项检查通过。Codex 在旧 head 指出的两处 runtime 快照引用已于 `6eb559b8` 修正到完整 `0b12e39e`，当前内容已复核；该 discussion 的 UI 状态仍未手动解决。没有把旧 head 审查描述成新 head 的自动复审。第一批 compat PR 为 [#129](https://github.com/onlyfeng/MiMo-Code/pull/129)，当时本地完整快照 `f48b6e918d683688348d0c8bfc59cd0199fc7fc8`。

PR #129 的早期 Codex ancestry 反馈经当时实际 Git 图核查不成立。当时 head `eaf99b8bf34aa791df0d7c921d610a581c4c4e9d` 含 `f48b6e918d683688348d0c8bfc59cd0199fc7fc8`，其父提交为 `199286decd7881737493c35ac6ffea30fc6e00c9` 与已接受 main `f10fddb67d830b82890206759c53cef4d8710460`。本地两项 ancestry 检查通过，GitHub commits API 确认相同父列表，compare 返回 behind_by=0 且 merge_base 为该 main。反馈引用的 `78337bd` 不是当时实际 PR head；没有为此重写历史。[原讨论](https://github.com/onlyfeng/MiMo-Code/pull/129#discussion_r4011989981) 的 UI 状态单独保留。

共享修正 PR [#130](https://github.com/onlyfeng/MiMo-Code/pull/130) 已接受为 main `806a11e430ae7f90d6a9c50143cb11e6f4123adc`，最终 PR head 为 `555598ab4c257aa0b99d337366cd56e6886aa6e9`，八项 CI 检查成功，Codex 审查完成且无发现（[head 检查](https://github.com/onlyfeng/MiMo-Code/pull/130/checks)、[Codex](https://github.com/onlyfeng/MiMo-Code/pull/130#issuecomment-5675438358)）。接受合并未改变该 head 的 Git 树。main 接受 SHA 的 test/typecheck/lint 均已成功；精确链接见下表，不把 PR-head 检查移称为合并 SHA 检查。

compat PR #129 最终 head `c407439ff4d213977acf3986d79a4e31627cf9db` 的八项检查成功，Codex 于 2026-09-15 07:15 UTC 完成复审，未新增 findings。该 PR 已接受为 `ab81af7293ac5ea1ee219bb6aab491d4fd665307`；`89866569` 是其祖先，符合 main → compat 路径。此前 `eaf99b8b` 的失败和 `bb6d4049` 的 P2 属于各自历史阶段，具体修正见下节。P1 讨论 UI 仍未解决，P2 已 outdated；没有手动回复或改变讨论状态。

接受提交的 CI 证据：

| PR / 分支              | 接受 SHA                                   | test                                                                        | typecheck                                                                        | lint                                                                        |
| ---------------------- | ------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| #126 / main 文档       | `818457d0`                                 | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34927357463)      | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34927357520)           | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34927357464)      |
| #127 / compat 文档     | `b3b32061`                                 | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34928314593)      | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34928314523)           | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34928314603)      |
| #128 / main 第一批     | `f10fddb6`                                 | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34929143930)      | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34929143952)           | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34929144107)      |
| #130 / main 共享修正   | `806a11e4`                                 | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34937048963)      | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34937048999)           | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34937048944)      |
| #131 / main 缓存修正   | `89866569`                                 | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34939913124)      | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34939913097)           | [成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34939913166)      |
| #129 / compat 最终继承 | `ab81af7293ac5ea1ee219bb6aab491d4fd665307` | [test 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948422) | [typecheck 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948433) | [lint 成功](https://github.com/onlyfeng/MiMo-Code/actions/runs/34940948413) |

PR #129 的最终 head 检查与审查单独记录为 [head 检查](https://github.com/onlyfeng/MiMo-Code/pull/129/checks)、[Codex](https://github.com/onlyfeng/MiMo-Code/pull/129#issuecomment-5674809678)。本页区分 PR head 与各自接受 SHA 的 CI；收尾文档后续发布也需要其自身的接受证据。

### PR #129 复审的共享缓存修正

`bb6d40491757eeee3bcd52ede94b89d8b02fab02` 的八项 CI 均成功，但 Codex [新增 P2](https://github.com/onlyfeng/MiMo-Code/pull/129#discussion_r4012707035) 指出撤销分页缓存解除后不能恢复正常上限。该问题也存在于 main `806a11e4`：默认 upsert 的现有消息更新不淘汰，新消息只淘汰一个，且 session 更新没有补充裁切。CI 成功未覆盖这一缺口；PR #129 因而暂缓接受，按共享 main → compat 先修代码并补回归。

main 源码/测试提交 `3a12d1800d9bfd002f543764e4ec72047e6e6bb3` 将默认 upsert 裁切恢复为完整超额前缀，并在 `applySession` / `applySessions` 权威状态不再含 revert 时立即裁切该 session 的各 actor 桶及相应 parts。活动 revert 仍保留分页边界；其他 session 不受影响。四项有效回归在旧实现失败；修正后默认七文件 43 pass、313 断言，package typecheck 通过。root 在相同源码独立运行 helper 与真实 SyncProvider 两文件，23 pass、253 断言、4.36 秒自然退出。八项 selector 清除、包 preload 保留，未调整测试或生产时限；真实 Provider 验证不扩大为人工交互终端验收。

该修正通过 [PR #131](https://github.com/onlyfeng/MiMo-Code/pull/131) 先进入 main，接受 SHA `89866569ee21e106f3c31c39072d8ec3e976d20a`；最终 head `3a12d180` 八项检查成功，[Codex 复审](https://github.com/onlyfeng/MiMo-Code/pull/131#issuecomment-5676094607)完成且无 findings，接受 SHA 的三个工作流成功（见上表）。

compat 的批量淘汰在删除 parts 前保存所需晚到 checkpoint 候选，仍使用全局上限 100 的候选 Map；已有独立 coverage 在 marker 消息淘汰后保留，实际 PartRemoved 再清理并刷新。旧实现新增回归为 6 pass/3 fail；仅合入共享修正为 7 pass/2 fail，定位到候选未保存；`02cd25b5` 适配后为 9 pass、53 断言。最终默认九文件 61 pass、390 断言、11.66 秒和 package typecheck 通过；root 独立真实 Provider/coverage 两文件 11 pass、241 断言、4.26 秒。`c407439f` 真实合入已接受 main `89866569`，全树仍与 `02cd25b5` 相同。
