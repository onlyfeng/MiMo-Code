# 2026-09-15 dev/compat 实际运行验收

本轮在接受 Inbox 崩溃一致性修正后，补齐插件实际调用链、本机隔离 MCP/OAuth 和 Windows 平台证据，并修复验证中发现的独立实验日志清理遗漏。main 承载共享正确性修正与通用验证设施；dev/compat 保留自己的产品保证和平台适配，七项 DC 均继续 active。本轮没有追加 upstream 提交，也没有将 dev/compat 整体合并到 main。

本报告补充[共享运行验收](runtime-validation-2026-09-15.md)，由 compat 维护分支执行和平台证据。共享 FD/FC、共享 history 和公共验收报告按 main 继承；此前[完整差异审计](fork-difference-closure-2026-09-15.md)的固定树与计数不回写。

## 来源、集成与实际运行

| 引用 | 固定来源与含义 |
| --- | --- |
| 选定 upstream | `b4cc11cd652195af9a80297ed543218f3172e6c4`，本轮不推进 |
| 已接受 Inbox main | `d11a9652981e7b5953584205474249775ee54236`，[PR #134](https://github.com/onlyfeng/MiMo-Code/pull/134) |
| 已接受 Inbox compat | `78f65017acacae66dfccc1ec28338e131492a929`，[PR #135](https://github.com/onlyfeng/MiMo-Code/pull/135)；本轮集成以此为已接受基础 |
| 共享插件测试修正 | `5165307c8a97c448de252a33b9eb2a1feb393545`，明确嵌套测试预算 |
| 共享安装设施修正 | `9bf2b8bcc696abf8797487b090c342a5a64f7a7c`，按 packageManager 选择 Bun 并执行 `bun ci`，不推进入口的 runtime/test 行为引用 |
| 共享运行验收的已接受 main | `c643adf9dffa57191153cc4452003ba03e3cab32`，由 [PR #136](https://github.com/onlyfeng/MiMo-Code/pull/136) 接受；评审候选为 `d40e8afc48f29a8faa3f4a7e1eae17afaed47a3a` |
| compat 集成源码 | `24fc2224bd7041957eac0335310d1286170626ef`，继承已接受 Inbox 和共享运行验收；它是集成引用，不表示下方所有测试在此 SHA 重跑 |
| 共享作用域夹具修正 | `15ca0f83a466f0581ce4e1add6883e0e204318ed`，main [PR #138](https://github.com/onlyfeng/MiMo-Code/pull/138)，接受提交 `2bbd3c0b20f2fb9c005c593585bd320c0e0a91d8` |
| 作用域修正后的 compat 源码 | `3f65c815168af2ac75de3433018c9d8ccac4b7ac`，三个插件场景实际复验；接受 main 后的最终集成为 `302a1727fd2e3462738719656bc521641f525812` |
| 独立实验日志清理 | 共享源码 `f20e91358da8ba4feef8d669ae1b105486e2566f`；compat 实验复验源码 `c7b2fdc59d5852c97131f4a4db4b809d1cc06d88` |
| Windows 与初次 compat 运行 | `289f63163e71a0c058ece11ff16755efeb1c6879`，实际 Windows 候选以及插件超时红例 |
| 插件预算修正后的 compat 运行 | `3bd11622851a985f1d84d5f67081efb85e2354bf`，只重跑三个插件 wrapper 的绿例 |

上表区分源码运行、main 接受和 compat 集成。对应 PR 的审核、实际合并 SHA 的 CI、远端 tip 与 main → compat 祖先关系，由发布回执记录；候选运行不能替代这些检查。共享运行验收 main 已接受为 `c643adf9`；compat 集成 `24fc2224` 同时继承它与 Inbox compat `78f65017`。历史运行 SHA 保持原值。

PR #135 的中间接受点有分片预算失败，详见[审核与中间发布记录](#审核与中间发布记录)。后续 compat PR 及最终接受 SHA 的 CI 独立验收。

## 能力清单（N = 4）

| ID | 能力和归属 | compat 处理 | 已有实际证据 |
| --- | --- | --- | --- |
| RV01 | FC-006：Config → 内置 Plugin → Actor → Write | 继承 main 的同一验证入口与 15 秒子测试预算 | `3f65c815`：3 pass、0 fail、6 次 wrapper 断言；早期预算修正记录仍为 `3bd11622` |
| RV02 | FC-004：实际 MCP/OAuth；DC-NET-002：compat 私网准入保证 | MCP 生产源码保持共享；保留 compat 准入 sentinel | `289f6316`：loopback 与自有 RFC1918 接口分别通过；准入 sentinel 独立通过 |
| RV03 | FC-008：共享 CI 调度；DC-PLATFORM-001：compat 平台适配 | 保留 no-rg 与 Windows 解压实现，新增真实平台验收入口 | `289f6316` 与 PR 候选 `b7e3f850` 分别实际通过 Windows 11 个解压场景与 8 个 no-rg 用例 |
| RV04 | FD-006：独立实验载体拥有的全局日志流 | 继承 standalone 清理修正及真实日志回归断言 | `c7b2fdc5`：完整实验文件 11 pass、0 fail、69 assertions |

## RV01：插件实际调用链与预算修正

`packages/opencode/test/plugin/subagent-progress-chain.test.ts` 启动三个隔离应用测试进程，执行真实 Config、内置 Plugin、Actor 和 Write。夹具用真实 checkout A 和相邻 worktree B 设置相反的 memory 写入配置，固定进程 cwd，在 A → B → A → B 切换时核对实例配置。真实跨目录 `/config` 请求被拒绝，但插件通过当前实例正确读取配置。

三个场景分别验证：禁写时实际 Write 失败且 journal 不落地；允许写入时缺少 journal 触发一次 postStop 重入，实际写入完整五节内容并补上 `written-at`；只读 Actor 的工具列表不含 Write，也不会被要求完成不可能的写入。模型由自有 scripted SSE 服务驱动，未接外部模型账号。

PR #136 的 P2 指出新启动的 Bun test 有独立默认预算。`289f6316` 上两个 wrapper 的组合复验得到 1 pass、3 fail：MCP 通过，三个 plugin child 均触发 5000ms 上限；其中只读场景已打印完成哨兵，仍在子测试结束前越界。这是嵌套测试预算缺口，不能以早期成功日志覆盖。

继承 `5165307c` 后，`3bd11622` 仅重跑三个 plugin wrapper：**3 pass、0 fail、6 次外层断言，28.35 秒，exit 0**。子测试显式采用 15000ms，进程 watchdog 仍为 25000ms，wrapper 仍为 30000ms；子场景实现未变。运行前后 SHA 一致、工作树干净。六次断言校验真实子进程成功退出及场景完成哨兵，未虚构或累计未输出的内部断言数。

PR #137 随后的作用域夹具反馈由共享 `15ca0f83` 修正，使用 `testEffect`/`it.live`、真实 AppLayer 和 `tmpdirScoped`/`provideInstance`。两个实例被捕获并单独释放，订阅、实例、cwd、scripted server 和目录依次随 Effect scope 清理，不再调用全局 `disposeAll`。所有 35 处现有断言及 15/25/30 秒预算保留。compat 候选 `3f65c815` 的三个 wrapper 复验为 **3 pass、0 fail、6 次外层断言，24.57 秒**；运行前后源码一致。这里是仓库夹具约定与生命周期收敛，未证明原隔离进程存在生产泄漏；没有新增服务 mock 或生产修改。

## RV02：本机隔离 MCP/OAuth 与私网接口

`packages/opencode/test/mcp/real-transport-oauth.test.ts` 启动非 test 应用子进程，使用真实 MCP.Service 和 SDK HTTP transport。自有临时 issuer 驱动 401 discovery、resource/issuer metadata、动态注册、PKCE S256/state、authorize 302、生产 callback、token exchange、MCP initialize/tools.list/tools.call。错误 state 被拒绝；旧 access token 被拒后，第二次只读工具调用完成实际 refresh。`removeAuth` 取消后续 pending callback，迟到 callback 返回 400，不发生额外兑换。

在 `289f6316` 上，组合中的 loopback MCP 用例通过；同一入口在本机自有 RFC1918 接口上的独立运行也通过：**1 pass、0 fail、2 次 wrapper 断言，10.74 秒**。另一个独立 Bun test 进程执行既有 `compat permits an RFC1918 remote MCP endpoint` sentinel，得到 **1 pass、0 fail、2 次断言，33 项筛选排除**。该 sentinel 使用 mock client，只证明 compat 准入政策；实际协议与网络证据来自前面的独立应用子进程。

用户明确选择本机隔离测试服务作为本轮范围。地址由本机接口清单取得，子进程再次验证其归属；报告不包含实际 IP。issuer、账号、code、token 和工具数据均为合成值，应用目录与认证状态独立，不读取用户认证配置、不打开用户浏览器。企业 IdP、代理、DNS/TLS 部署和企业 MCP 不在本轮范围；取消证据限定于 pending callback 的终态，不扩展为任意 token exchange 中断保证。

共享 MCP 源码不因该实验分叉，DC-NET-002 的 compat 产品保证也不因共享测试通过而自动上移或退休。

## RV03：真实 Windows 解压与 no-rg

[运行 34958196675](https://github.com/onlyfeng/MiMo-Code/actions/runs/34958196675) 的 [Windows job 104345235279](https://github.com/onlyfeng/MiMo-Code/actions/runs/34958196675/job/104345235279) 已成功，[工件 10392840599](https://github.com/onlyfeng/MiMo-Code/actions/runs/34958196675/artifacts/10392840599) 已下载核对。该运行的七个 job 均成功。事件为 `workflow_dispatch`，run head、`GITHUB_SHA` 和实际 checkout 均为 `289f63163e71a0c058ece11ff16755efeb1c6879`；PR head 字段为空，因为这是手动运行事件，没有 PR payload。

实际环境为 Windows Server 2025 Datacenter 10.0.26100、x64，runner image 为 `windows-2025-vs2026` 20260907.229.1，Bun 1.3.14 与 packageManager 一致。工作流 shell 使用 pwsh 7.6.5；生产解压调用的是 Windows PowerShell 5.1.26100.33296、CLR 4.0.30319.42000 和 `System.IO.Compression.FileSystem`。Windows job 执行 `bun ci`；安装日志显示 Bun 的 `bun install` banner 不改变实际命令的 frozen-lockfile 语义。

入口 `packages/opencode/script/verify-windows-runtime.ts` 在非 Windows 直接失败，并通过 `test/fixture/windows-archive-runtime.ts` 调用实际生产 `extractZip`。11 个场景全部通过：普通/嵌套路径、覆盖与重复解压、空格与单引号、正反斜杠父路径、根绝对路径、驱动器绝对/相对路径、前缀相邻目录、损坏 ZIP 和目标路径冲突。恶意 ZIP 先写入合法条目，证明实际打开并执行了 ZIP，再验证拒绝危险条目且外部哨兵文件保持原内容。所有场景均重命名并删除 ZIP 与目标目录，验证成功和失败路径的句柄释放。

no-rg 入口精确选中 8 项，全部执行，**8 pass、0 fail、15 次断言，选中项 0 skip**。JUnit 另有 15 个筛选排除项，不能计为通过。其中三个 POSIX symlink/权限场景明确不在 Windows 覆盖内。测试在实际 Windows 文件系统使用空 PATH、清除缓存 rg，并以合成 offline HttpClient 阻止下载，验证生产 fallback 的简单列举与拒绝边界。

工件保存的三个生产源 SHA256 来自 Windows CRLF checkout。对 `289f6316` 的 Git LF 原文逐一转换为 CRLF 后，哈希精确相等；不是原始字节相同。

| 生产文件（相对 `packages/opencode`） | Git blob | Windows checkout SHA256 |
| --- | --- | --- |
| `src/util/archive.ts` | `130f7f3472c42c29bec9d4428adb69675f4d5e40` | `698bf959bc5825664eed242f1cd5b2735946770fc4902f45562f0e67b5ad671d` |
| `src/util/process.ts` | `d448316b6f50814bc5aa2fe73a43821bfdb5ff7f` | `27819a7f59fc9653d53f69f260dd2188848b7b52aad815e275d31a8a9ded4b45` |
| `src/file/ripgrep.ts` | `85210dc2cae12877dac0a18ea4cec19fc05ce607` | `c3f3eadfe75241ab0e18d4ce5612022e49aca9d033244a64f8f3fb586ddc037e` |

以上三个 Git blob 在 `3bd11622` 不变，但这不表示 Windows 在 `3bd11622` 重跑过。上传 ZIP 的 digest 由 GitHub job 日志提供；下载后独立计算了各解压文件的 hash，未保留并重算 ZIP 容器本身。

该 runner 上 `Microsoft.PowerShell.Archive` 模块可用，实际生产路径调用 .NET ZipFile；未验证移除该模块后的环境。有效条目可能在后续危险条目被拒绝前已写入，不能声称整个 ZIP 解压具备事务回滚。企业限制镜像、junction/symlink 竞态和任意 Windows 配置不在本轮证明范围。

PR #137 的候选 `b7e3f8504af58ea007ac71b4d9886865d7f14146` 再次通过真实 Windows 验证：[run 34965350598](https://github.com/onlyfeng/MiMo-Code/actions/runs/34965350598)、[job 104368372097](https://github.com/onlyfeng/MiMo-Code/actions/runs/34965350598/job/104368372097)、[artifact 10395038696](https://github.com/onlyfeng/MiMo-Code/actions/runs/34965350598/artifacts/10395038696)。11 个解压场景和 8 个 no-rg 用例全部通过，15 次 no-rg 断言，选中项 0 skip。事件是 `pull_request`，`GITHUB_SHA` 和 checkout 为合并提交 `7f5994af`，PR head 字段为 `b7e3f850`；合并父提交对应 base `78f65017` 和该 head，合并树与 head 相同，三个生产源的 CRLF hash 逐一核对。该候选九项 CI 全绿，但因上面的 scoped fixture 审核反馈保留 draft；Windows 成功不能代替修正后的审核和接受。原 `289f6316` 记录不被改写，两个 Windows 运行也不相加为一轮测试。

## RV04：独立实验日志资源清理

共享修正 `f20e9135` 在 standalone CLI 的 AppRuntime、数据库清理之后等待 `Log.shutdown()`；复用的 `runExperiment` 不关闭全局运行时。新增断言仍在已有隔离子进程内，验证排队日志落盘、active 文件转为 completed、原 active 路径消失、清理后写入不再追加。父进程并行读取 stdout/stderr，保留自然 exit 0、15 秒 watchdog 和 30 秒外层预算。

旧实现的子进程自然 exit 0，但三项日志关闭断言确定失败；修正后的 main 完整实验文件 11 pass / 69 assertions。compat `c7b2fdc59d5852c97131f4a4db4b809d1cc06d88` 的同一完整文件复验为 **11 pass、0 fail、69 assertions，13.00 秒**，standalone 用例为 4.040 秒，运行前后源码一致。此处是确定的文件日志所有权修正，范围不扩为异常路径上的所有全局资源关闭保证。

此前 main PR #138 候选 `31365b8a` 的一次 CI 退出 143 未在本机复现；唯一一次同 SHA 失败分片重跑成功，standalone 用例 3.630 秒，1422 pass / 21 skip / 0 fail。重跑工件按 ID `10396023297` 核对，未误用同名首轮工件 `10395761714`。该旧结果不验证日志新修正，也不证明原 CI 失败根因；更强的新回归与旧间歇现象分别记录。实验载体仍独立于生产 Codex exec 权限和 token 收益，详见共享[RV04](runtime-validation-2026-09-15.md#rv04独立实验日志资源清理)。

## 七项 DC 的处理

| Owner | 状态 | 本轮处理 |
| --- | --- | --- |
| DC-NET-001 | active | 保留明确批准的私网 WebFetch；本轮 MCP lab 不是 WebFetch 新证据 |
| DC-NET-002 | active | 保留 RFC1918 MCP 准入保证，补入共享真实协议链及本机接口证据；无生产分叉 |
| DC-PLATFORM-001 | active | 保留 compat 的 no-rg/Windows 适配，补真实平台脚本、夹具和工件 |
| DC-MODEL-001 | active | 保留 per-agent MaxMode；未新增该能力的运行验证或生产改动 |
| DC-CONTEXT-001 | active | 保留通知 UTF-8 cap、preflight、coverage；继承共享 Inbox 事务，未扩大其原子范围 |
| DC-ACTOR-001 | active | 保留 full/persistent actor 和 frozen context；插件链验收不替代该能力完整恢复矩阵 |
| DC-TUI-001 | active | 保留 provider/model/variant 显示；本轮未新增 TUI 行为 |

## 环境与复现边界

本机插件和 MCP 验证运行在 macOS 15.7.9 x86_64、Bun 1.3.14；MCP SDK 为 1.27.1。所有包测试从 `packages/opencode` 执行，清除 `MIMOCODE_EXPERIMENTAL`、`MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH`、`MIMOCODE_CODEX_MODE`、`MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL`、`MIMOCODE_EXPERIMENTAL_WORKSPACES`、`MIMOCODE_COMPACTION_MAX_CONTEXT`、`MIMOCODE_COMPACTION_TRIGGER_RATIO`、`MIMOCODE_DISABLE_CHECKPOINT`。保留包拥有的 Solid/test preload 及 `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true` 基线；非默认私网 lab bind 单独启用且不写死地址。

复现命令和隔离说明继承[共享运行验收](runtime-validation-2026-09-15.md#验证矩阵与复现)。Windows 使用同一工作流的 `windows_runtime` 输入或 compat PR/push 触发。每次后续执行均绑定它自己的 event、checkout、PR head 与工件，不能沿用旧候选的 CI 为新提交背书。本文不将各阶段重叠运行相加为一轮测试，也不将测试设施本身算作新的产品政策。

## 审核与中间发布记录

PR #135 的祖先关系 P1 引用了不属于当前 head 的提交。实际发布 head `059a88b3` 的父提交为 `31e904ff`，后者的父提交为起始 compat `49dce581` 和已接受 main `d11a9652`；本地 Git 与 GitHub commit API 均确认这一关系，因此无需修复正确的合并历史。该线程在 UI 中未被标记 resolved。

PR #135 head 的八项检查通过；首轮 shard 1 因整个分片超过八分钟而失败，唯一一次同 SHA 重跑成功（1,756 pass、9 skip、0 fail、6,185 assertions，460.95 秒）。已接受 `78f65017` 的合并后 [test run 34963998102](https://github.com/onlyfeng/MiMo-Code/actions/runs/34963998102) 仍失败：同一分片已输出完整通过汇总，耗时 488.27 秒，随后被 step 上限取消。JUnit 已上传，下载后使用仓库 verifier 独立核对全部预期文件覆盖，exit 0；CI 中该 verifier 未完成，仍保留 run failure。其他五个 test jobs、lint 和 typecheck 通过；不能将该中间接受 SHA 记为全部 CI 成功。本轮不放宽分片预算，最终 compat PR 和实际接受 SHA 独立验证完整 CI。

PR #136 的 P2 嵌套预算问题由 `5165307c` 修正，最终 head `d40e8afc` 的八项检查通过，Codex 于 2026-09-15 11:42:03Z 完成复审，没有新 finding；旧 P2 为 outdated，UI 仍未 resolved。最终 Linux job 确认使用 Bun 1.3.14 和 `bun ci`，JUnit 中新插件场景 3 pass、MCP 场景 1 pass，均无跳过。其 main Windows job 按条件跳过，平台证明仍来自上面的实际 Windows 运行。
