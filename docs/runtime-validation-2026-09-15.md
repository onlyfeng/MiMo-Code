# 2026-09-15 插件、MCP/OAuth 与 Windows 验收

本轮先完成 Inbox 崩溃一致性修正，再补充实际调用链与目标平台证据。
不追加 upstream 提交，不整体合并 dev/compat 能力到 main。
main 继续承载共享正确性修正；compat 的产品保证和环境适配保留各自归属。

## 固定来源与归属（N = 3）

- 选定 upstream：`b4cc11cd652195af9a80297ed543218f3172e6c4`。
- 起始 main：`370d12295f4c4628e10012ae46f3bcb454a5b587`；compat：`49dce5816792e95050cd64561080d3257b714b7f`。
- Inbox 实现：`74d4bfb6008071fca87c245c7791530660d64876`，经 [PR #134](https://github.com/onlyfeng/MiMo-Code/pull/134) 接受为 main `d11a9652981e7b5953584205474249775ee54236`。
- 本批测试/CI：`b23c278e51ab0cc34c47c2d20406d69e57d24f2f`；继承已接受 Inbox 后的集成源码/测试：`a9e4458e62632d65ccdef38152e757730ac102db`。
- PR #136 复审后的测试源码：`5165307c8a97c448de252a33b9eb2a1feb393545`，为新增插件 child 设置明确的 15 秒测试预算，25 秒进程 watchdog 和 30 秒 wrapper 预算保持原值。
- PR #137 复审后的共享插件夹具源码：`15ca0f83a466f0581ce4e1add6883e0e204318ed`，使用 Effect-aware 多实例夹具，按作用域释放两个测试实例与临时资源。
- 共享 CI 安装修正：`9bf2b8bcc696abf8797487b090c342a5a64f7a7c`，从 `package.json` 选择 Bun 并使用 `bun ci`；该安装提交不改变 runtime/test；当前夹具引用为上面的 `15ca0f83`。
- 本批新增两个测试 wrapper、两个子进程夹具和共享 Windows job，并收敛共享安装步骤；没有插件、MCP 或平台生产实现改动。

| ID | 能力及归属 | main 结果 | dev/compat 处理与证据归属 |
| --- | --- | --- | --- |
| RV01 | FC-006：实例配置、内置插件、Actor、Write 整链 | 三个实际应用场景通过，模型由 scripted SSE 服务驱动 | 继承同一入口；分支执行及发布记录由 compat 当前登记维护 |
| RV02 | FC-004：实际 MCP SDK HTTP/OAuth 协议链 | Loopback 与本机自有 RFC1918 接口通过 | 保留 DC-NET-002 的 compat 保证；不因实验结果自动退休或上移政策 |
| RV03 | FC-008：共享 Windows 调度设施；DC-PLATFORM-001：compat 平台能力 | 工作流静态检查通过；main 不运行 compat 专属平台入口 | 实际 Windows 结果由 [compat 平台登记](https://github.com/onlyfeng/MiMo-Code/blob/dev/compat/docs/dev-compat-overrides.md#dc-platform-001--restricted-network-and-windows-ripgreparchive-fallback)维护；本 main 报告不把设施就绪称为平台验收通过 |

这是一份固定源码的验收记录。它不改写[此前完整差异审计](https://github.com/onlyfeng/MiMo-Code/blob/370d12295f4c4628e10012ae46f3bcb454a5b587/docs/fork-difference-closure-2026-09-15.md)的树、inventory 数量或历史结论。
Inbox 的实际进程崩溃/重启边界见[专项记录](inbox-crash-consistency-2026-09-15.md)。

## RV01：实际插件链

入口为 `packages/opencode/test/plugin/subagent-progress-chain.test.ts`，显式启动
`test/fixture/subagent-progress-chain-child.ts` 的三个隔离应用测试进程。
夹具创建真实 checkout A 和相邻 worktree B，设置相反的 memory 禁写配置，
固定进程 cwd 在 A。真实 `/config?directory=B` 返回 403；通过当前实例的
Config.Service 和已注册内置插件按 A → B → A → B 调用仍得到正确结果。
Config、Plugin、Actor 和 Write 均未替换。

- 禁写：Actor 的实际 Write 调用失败，journal 不落地，postStop 不重复要求写入。
- 允许写入：缺少 journal 时发生一次 postStop 重入，实际 Write 写入五节内容，
  插件补 `written-at` 后成功结束。
- 只读 Actor：权限解析后的模型工具列表不含 Write，不因缺少 journal 重入。

Actor 终态、hook 事件、调用次数与落盘文件均有断言。明确的 hook 回调 barrier
等待异步 Bus 观察完成；订阅、Instance、cwd 与 Git worktree 按作用域清理。
首轮失败是测试过早读取异步观察结果，修正了夹具，未发现插件生产缺陷。
模型是自有 scripted OpenAI-compatible SSE 服务，不代表外部模型的随机行为或认证。

## RV02：实际 MCP/OAuth 协议与私网接口

入口为 `packages/opencode/test/mcp/real-transport-oauth.test.ts`，夹具为
`test/fixture/mcp-real-transport-child.ts`。非 test 子进程使用实际 MCP.Service、
SDK McpServer 和 WebStandardStreamableHTTPServerTransport；自有 issuer 提供
resource/issuer metadata、动态客户端注册、authorize 和 token 端点。

实际链为 401 → discovery → DCR → PKCE S256/state → authorize 的 302 → 生产
callback → token exchange → MCP initialize/tools.list/tools.call。issuer 校验
verifier 哈希、client、redirect URI 和 resource。错误 state 被拒绝且不兑换 token；
正确 callback 完成授权。issuer 拒绝旧 access token 后，第二次只读工具调用触发
实际 SDK refresh 并保留 structuredContent。`removeAuth` 取消下一次 pending callback，
迟到 callback 返回 400，没有额外兑换。

同一测试分别连接 loopback 和本机现有 RFC1918 NIC 上的自有临时服务；夹具要求
绑定地址确实属于当前本机。没有扫描网段或连接未知服务，没有读取用户认证配置，
没有启动用户浏览器。凭据、code、token、工具返回值均为合成值，报告不记录实际接口地址。

用户明确选择本机隔离服务作为本轮私网/OAuth 验收范围。本次证明该实验环境的协议链
与私网 HTTP 连通；企业 IdP、代理、DNS/TLS 部署及企业 MCP 不在本轮范围。取消证据限定为 `removeAuth`
的 pending callback 终态，不泛称任意 token exchange fiber 中断。DC-NET-002 的
compat 私网承诺保留；共享 MCP 生产源码没有分叉。

## RV03：实际 Windows 验收设施

`.github/workflows/test.yml` 的 `windows-runtime` job 使用 `windows-latest`，
自动覆盖 dev/compat push 及以 dev/compat 为 base 的 PR；main push/PR 不执行
compat 入口。布尔 `workflow_dispatch.windows_runtime` 默认 false，可对指定 ref
启用。原 Linux 测试任务、分片、时限、既有触发和 concurrency 保持原逻辑。
共享 setup-bun composite 原先使用最新 Bun 和 `bun install`；CI 复核后改为读取
packageManager 并执行 `bun ci`，与独立 Windows job 和仓库依赖安装规范一致。
本机 frozen install exit 0、锁文件无变化；实际 Linux 安装结果由最终 CI 验证。

Bun 版本取自 `package.json`，核对实际版本后执行 `bun ci`。job 有 15 分钟预算，
分别记录事件 SHA、实际 checkout SHA、PR head SHA 与 OS/Bun/PowerShell 信息。
非 Windows 或缺少入口直接失败；始终尝试上传 `.artifacts/windows-runtime/`。
YAML、格式、diff-check 和十种触发条件组合均已静态核对。

compat 入口为 `packages/opencode/script/verify-windows-runtime.ts`，实际调用生产
指定的 `powershell` 和 `extractZip`，并执行精确选择的 no-rg 测试。真实运行结果、
产物和所检 SHA 由 compat 记录。macOS 的字符串/ZIP 编码检查与非 Windows 拒绝门
不是 Windows 执行证据；即使 hosted runner 通过，也不代替未知企业受限镜像验收。

## 验证矩阵与复现

本机为 macOS 15.7.9 x86_64，Bun 1.3.14，MCP SDK 1.27.1。安装在仓库根执行
`bun ci`；测试和 typecheck 从 `packages/opencode` 执行。清除八个 ambient selector，
保留包拥有的 Solid/test preload 和其中 Orchestrator=true 基线。Plugin child 使用
独立 test preload；MCP child 不导入 bun:test/test preload，使用独立 HOME、应用目录、
数据库和合成配置。两个 wrapper 都清除额外 MIMOCODE_CONFIG 系列配置覆盖。

```sh
runtime_clean() {
  env -u MIMOCODE_EXPERIMENTAL \
    -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH \
    -u MIMOCODE_CODEX_MODE \
    -u MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL \
    -u MIMOCODE_EXPERIMENTAL_WORKSPACES \
    -u MIMOCODE_COMPACTION_MAX_CONTEXT \
    -u MIMOCODE_COMPACTION_TRIGGER_RATIO \
    -u MIMOCODE_DISABLE_CHECKPOINT "$@"
}
runtime_clean bun test test/plugin/subagent-progress-chain.test.ts test/mcp/real-transport-oauth.test.ts
runtime_clean bun typecheck
```

私网复验执行同一 MCP 入口，`MIMOCODE_TEST_MCP_LAB_BIND` 来自本机接口清单，
由子进程重新校验；不把机器地址写入源码或命令示例。

| 固定快照与运行 | 结果及界限 |
| --- | --- |
| M370 + 原始插件夹具 | 新 wrapper 3 pass / 6 assertions；六个相关旧文件 115 pass / 200 assertions |
| M370 + 原始 MCP 夹具 | Loopback 1 pass；自有私网接口 1 pass；新入口加五个旧文件 48 pass / 163 assertions |
| b23 测试/CI 提交 | 三个纯 lint 警告收敛后，新 wrapper 组合 4 pass / 8 assertions，26.74 秒；focused lint 0 warnings / 0 errors |
| a9e 集成已接受 Inbox | 新 wrapper 组合 4 pass / 0 fail / 8 assertions，30.59 秒；同一私网入口复验 exit 0；包 typecheck exit 0 |
| 516 复审后的插件测试 | 三个 plugin wrapper 3 pass / 0 fail / 6 assertions，46.93 秒；包 typecheck exit 0。只调整新增 child 的测试预算，未改变生产 deadline |

wrapper 计数只汇总子进程退出和完成回执；具体应用及协议断言在 child 内执行，
不将这些计数与历史矩阵相加伪装成一次全新运行。早期夹具 API/观察错误没有被记为
生产缺陷。上表是源码运行证据；fork PR 审核、合并后准确 SHA 的 CI、远端 tip 与
main → compat 祖先关系属于独立发布验收，记录在相应 PR 与 compat 当前登记中。

PR #136 的 P2 指出新启动的 Bun test 不继承 wrapper 的预算。实际 compat 候选
`289f63163e71a0c058ece11ff16755efeb1c6879` 的复验中，三个 plugin child 均触发
默认 5 秒上限，MCP child 通过；这证实了测试运行器的预算缺口。修正将 child
限定为 15 秒，保留外层终止与清理余量，不放宽已有测试或应用时限。
同 PR 的首轮 stdio job 因固定依赖下载返回 HTTP 504 而未执行测试，属于独立安装失败；
同源成功运行的 stdio JUnit 为 6 pass / 0 fail / 20 assertions，未修改 stdio 代码。

## 多实例夹具复审收敛

PR #137 的 [scoped fixture 反馈](https://github.com/onlyfeng/MiMo-Code/pull/137#discussion_r4015271088) 指出共享子测试应遵循 `test/AGENTS.md` 的多目录 Effect 夹具约定。`15ca0f83` 使用 `testEffect`/`it.live`、真实 `AppLayer` 与 `tmpdirScoped`/`provideInstance`，替换手写 `AppRuntime.runPromise` 嵌套和进程全局 `Instance.disposeAll`。低层 `provideInstance` 只绑定上下文，不负责释放，因此分别捕获两个 owned instance 并登记释放；订阅先结束，实例在恢复 cwd、关闭 scripted server、删除相邻 worktree 和 checkout 前释放。

三个应用场景和 35 处既有断言保留，15/25/30 秒预算不变，无生产服务替换或新增生产改动。最终同一 wrapper 复验为 3 pass、0 fail、6 次外层断言，30.69 秒；包 `bun typecheck` exit 0，focused lint 为 0 warnings / 0 errors。原隔离进程中未证明存在生产泄漏；本次修正处理仓库测试约定与资源作用域，不把结构调整写成已发现的应用缺陷。此前固定 SHA 的运行结果仍有效，不移称为该夹具重构后的重跑。共享修正先在 main 接受，再传播到 compat。
