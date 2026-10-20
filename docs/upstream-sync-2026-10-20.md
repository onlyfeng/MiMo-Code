# 2026-10-20 upstream synchronization through 113e3192

## 范围与不可变基线

本轮为完整同步，流向为只读 `upstream/main` → fork `main` → fork `dev/compat`。选定审计范围为 `bf0563ddc201b44e3f59c35b18dba17c4386564d..113e3192568a342076e68c70d55b99bd67869dcf`：11 个提交（10 个非 merge 提交），176 个变更路径、16,826 行增加、3,727 行删除。起始 fork tips 为 `main=aaa53f4e56136ee1bf845b02ff080716ea2a0c66`、`dev/compat=97fce708b8dc9353d274b83f718e1a3c7d27416a`。

共享 runtime/tests 与已改 MCP prompt 的行为提交为 `1b2bb10c930997c6c58da89fe7720e2e1c71db5d`。下列本地验证与发布证明分开记录；compat 传播、远端 tip、精确 SHA CI 和重新刷新后的 upstream 选择仍待收尾补证，当前记录只覆盖上述选定 upstream。

操作使用独立临时分支和工作树，保留原工作区已有修改及无关资源。文档路径示例统一使用 `/tmp/example`；它不是实际操作路径。最终资源清单、原工作区状态及本轮临时资源清理证明仍为 pending。

## Capability inventory (N=12)

下表是唯一的最终处置表，每项能力恰好一行。共享 owner 均在 `main`，compat 只保留已有 DC overlay；没有把 compat 独有能力提升为共享能力。

| ID | 选定行为、生产者与 owner | main 结果 | dev/compat 结果 | 决定性路径与测试 |
| --- | --- | --- | --- | --- |
| C01 | Durable inbox input receipts、迁移、受理/认领/结算/GC；FC-001、FC-009 | 采用并适配。完整 user/parts 与 receipt 原子提交；保留重放身份、task、provenance、permission 和 ownership 检查。`accepted/claimed/settled/cancelled/rejected` 替代取走即删除的 send/drain。 | 待传播；继承共享 receipt/迁移合同，保留 compat task/context 限制。 | `src/inbox/{controller,schema,inbox,sync}.ts`、`inbox.sql.ts`；queue-controller、queue-spec-points、queue-migration-contracts。 |
| C02 | Unified lane scheduling、取消 epoch、执行所有权、main 自动等待子任务；FC-001、FC-008、FD-001 | 适配。busy HTTP prompt 返回持久 202 receipt；严格 exclusive entry 仍原子拒绝占用。取消先隔离旧 epoch，未运行输入为 never-ran；保留 admission/approval/task/recovery 边界。 | 待传播；继承共享 lane/cancel/wait，不削弱 DC-MODEL-001 的 final-step/status 隔离。 | `src/session/{prompt,run-state,execution-ownership}.ts`、`src/effect/runner.ts`；turn-queue-admission、main-wait、wake-instance-handoff、server/session-prompt-busy。 |
| C03 | Actor 显式 wait、input revision observation、terminal notification；FC-001、FD-006、FD-009 | 适配。保持 generation、retired peer、frozen schema、owned cancellation 和 terminal join；timeout 返回可发现的执行状态，观察者取消不终止 child。accepted-only receipt 事件替代 InboxArrived 观测。 | 待传播；保留 DC-ACTOR-001 full-context 与 DC-ACTOR-002 variant 合同。 | `src/actor/{spawn,execution,notification,waiter,registry}.ts`、`src/tool/actor.ts`；actor wait/send/spawn/ownership/cancel、actor-owned-lifecycle、plugin/actor-hooks。 |
| C04 | Queue-aware sync/export/import/fork/history projection；FC-001、FC-002、FC-009、FC-017 | 采用并适配。保持 first-delivery order、消息引用、未消费输入隐藏和完整 history；fork 不复制可执行 receipt。checkpoint、session.post 与 goal judge 使用相同 queue view。 | 待传播；保留 DC-CONTEXT-001 的 chronology/coverage/caps 和 DC-ACTOR-001 frozen 视图。 | `src/session/{session,message-v2,checkpoint,prompt}.ts`、sync/restore 与 CLI import/export；fork-queue、external-import-queue、sync-restore、restore-order。 |
| C05 | Workspace/project identity、scoped refs、Runner acquisition ownership；FC-001、FC-005、FC-007、FC-008 | 采用并适配。保持 exact roots、fixed cwd、可选 ref owner、generation 和有界 workflow teardown；夹具使用隔离实例。 | 待传播；保留 DC-PLATFORM-001 fallback 和现有 context/workspace 边界。 | `src/project/`、`src/effect/{runner,scoped-ref}.ts`、workflow/runtime、skill discovery、Bash；project/workspace/scoped-ref/runtime suites。 |
| C06 | Sticky deferred MCP catalog 与固定 mcp_tool_use；FD-005、FD-006、FC-004 | 适配。live 与 prefix capture 共用 resolved harness/sticky evidence；不把搜索结果加入 active schemas。保留 escaping、post-hook 参数检查、real-tool权限/metrics、settlement；新快照 fixed dispatcher/loaded=[]，旧 direct 快照仅在 captured membership/schema 交集内执行；Codex hidden direct/exec 保持既有授权合同。 | 待传播；保留 current-turn projection、active mask/toolsHash 与动态 wire preflight，不能将 dispatcher 变成 frozen pool 扩权入口。 | `src/session/{prompt,llm,llm-request-prefix}.ts`、`src/tool/mcp-tool-search.ts`、三种 harness prompt；mcp-tool-search、prefix、prompt-effect、codex-compact、tool-script。 |
| C07 | InvalidOutputError 与真正空输出重试；FC-009、FC-013，FD-010/FD-011/FD-012 仍独立 | 适配。仅 replay-safe、无 tool residue 的纯空会删除空 attempt 后由 bounded unknown policy 重试，无 repair user；reasoning-only、checkpoint 未完成和已结算工具保留 bounded continuation/atomic source。summary 的接受、no-tool 与独立空重试界限不退役。 | 待传播；保留 per-agent MaxMode、bounded scopes 和 main-only retry status。 | `src/session/{retry,processor,prompt,compaction}.ts`；retry、invalid-output-continuation、processor-effect、compaction-reasoning-fallback/tool-choice。 |
| C08 | Mid-turn user text 原样传递以保留 thinking signature binding；FC-009、FC-011 | 采用。删除依赖 moving lastFinished 的 user wrap；保留 stored source/attachment/system 与 summary 合同。其他 history rewrite 和已损坏签名不在此修复声明内。 | 待传播；保留 content caps 与 current-turn边界，不能恢复每轮变化的 wrapper。 | `src/session/prompt.ts`、message-v2/LLM消费者；steer-message-render-stable。 |
| C09 | TUI actor send 不再固定 Delegating pending；FC-001 | 采用。按 action 显示 pending/body/terminal，send 不挂接 receiver 的 live tool stream；保留失败/timeout显示、title/plan恢复。 | 待传播；保留 request metadata 与 Actor variant 的事实来源。 | `src/cli/cmd/tui/routes/session/actor-tool-state.ts`、`index.tsx` 及 actor/workflow projection；actor-tool-state、session-recover-flow。 |
| C10 | finish=tool-calls 时 completion footer 保持挂载 | 采用。统一 final-finish predicate，保留 recovering/aborted footer 和现有字段。 | 待传播；DC-TUI-001 的 provider/model/variant显示保持。 | `src/cli/cmd/tui/util/assistant-footer.ts`、session UI；assistant-footer。 |
| C11 | Login tips 根据已计算 provider 的 credentials 判断 | 采用。检查 key、env source 或 options.apiKey，provider存在本身不等于具备凭据。 | 待传播；provider路由及 DC-PROVIDER-001 不变。 | home/tips-view；tips-view。 |
| C12 | npm trusted publish permission、FDS canary、完整 tarball preflight；FC-012 | 采用。发布前检查 SDK/plugin/CLI tarball身份/版本及 FDS signed write；保留 mandatory GH_REPO/fork routing。未调用 trust、preflight上传或任何发布 stage。 | 待传播；共享发布治理保持，不因继承 workflow 获得 upstream 发布授权。 | `.github/workflows/release.yml`、`script/release.ts`、registry sync/launcher；root script/release.test.ts、launcher tests。 |

结果行数：12。Active owners 保持 9 FD、17 FC；没有 owner 退役或重新编号。表中 `src/` 与 `test/` 路径均相对于 `packages/cli/`，明确标为 root 的脚本除外。

## 保留与替换的合同

旧的 async-only queue、`Inbox.send`/drain 删除、wakePending 和 `InboxArrived` 不是新实现的当前入口。所有被受理的 queue input 都引用同一事务写入的完整 user/parts；后续 claim、first delivery、settlement 与 retained receipt 分开。actor结果里的 `inboxID` 兼容字段仍表示该 durable receipt。旧行转换、运行中认领输入的启动协调和 terminal-only GC 各自有测试，不能概括成跨崩溃 exactly-once 模型执行。

持久化不等于受理：`noReply` 只保存消息，不能凭“比 queued user 更新”替代其任务、format、权限或运行归属。未运行而被 Stop 取消的 receipt 保留原 user、`never_ran` 和无 delivery；不会伪造 assistant。严格 resume/recovery 仍在原子入场后才结算精确候选；actor frozen identity、task namespace、外部 pending-question/permission 检查以及执行取消 epoch 同时生效。

新 MCP 快照分别保留完整授权实现池和固定 wire subset。`mcp_tool_use` 自身的通用参数 schema 不授予任意名字调用权；底层工具仍须通过 request/frozen/permission/schema 检查。旧无 dispatcher 快照只兼容原 active/loaded 名字与 membership 的交集。连接变化不会把搜索结果 schema 添到前缀；空 catalog 初始 defer、auto sticky 和回合边界公告保持 live/capture一致。

checkpoint、post-hook、goal judge、fork/history 的消费视图需要隐藏未消费receipt并保留已消费输入的位置，同时不能让回补的旧输入覆盖 checkpoint continuation 的父消息/approval authority。前台结构化完成和后续queued用户可同属一个lane run，但各自caller仍读取自己的完成结果。工作区generation、scoped reference和Runner退出所有权继续防止旧清理释放新generation。

## 已核查的本地验证

这些是本轮执行过程中已查看完成的子矩阵；并非所有数字均来自同一最终源树，不能相加为一个全量通过数。最终 runtime 的收口矩阵单独列出；compat 仍需独立验证。默认路径清除 ambient `MIMOCODE_EXPERIMENTAL`、`MIMOCODE_MCP_TOOL_SEARCH`、`MIMOCODE_CODEX_MODE`，保留 package-owned preload；opt-in用例只在自身scope启用selector。CLI测试从 `packages/cli` 执行，root script测试从repo root执行；依赖只用 `bun ci`。

| 验证范围 | 实际已见结果 | 证据记录标识与界限 |
| --- | --- | --- |
| Frozen install | 1059 packages installed，161.48秒；bun.lock无本地安装变更 | `install`；与runtime提交及起始origin/main对照确认。 |
| SDK重生成 | exit 0，packages/sdk diff为空 | `sdk-final`；最终重生成未产生额外变更。 |
| Repository lint | 0 errors、3636 warnings，15.3秒 | `lint-final`；最终 runtime 收口检查。 |
| CLI typecheck | exit 0 | `typecheck-runtime`；owning-package `bun run typecheck`，运行会话 72031 已确认成功。 |
| Prompt完整文件 | 194 pass、2 existing skip、0 fail，353.71秒 | `prompt-final`；保留原有跳过项。 |
| Queue/inbox/admission/checkpoint/run-state/recovery/renderer | 211 pass、0 fail、1166 assertions，113.83秒 | `queue-stable-matrix`；26个文件，最终 runtime 收口矩阵。 |
| Release脚本 | 11 pass、0 fail、30 assertions | `release`；本地tarball/credential guard测试，不执行真实发布或canary上传。 |
| MCP完整定向子集 | 47 pass、0 fail、345 assertions，73.18秒 | `mcp-focus-stable`；含dispatcher/legacy frozen、schema拒绝、sticky/churn、lifecycle/admission。 |
| Sync restore + fork queue | 54 pass、0 fail、441 assertions | `history-fix`；不把更早history总矩阵的失败隐藏为全绿。 |
| Project/workspace/scoped-ref/Bash | 142 pass、5 existing skip、0 fail | `project-matrix`；11个文件，147例。 |
| Main自动等待 | 46 pass、0 fail | `main-wait-stable`；在最后 lane-tail/frozen-outcome 修正前完成，后续定向回归另列。 |
| Runtime最终定向回归 | missing digest真实DB 1/1；frozen success→error 2/2；resume 28/28；recovery-task 11/11；stop ownership 1/1；seed admission 5/5 | 收口执行确认全部通过；与早轮子矩阵不累加。 |
| Checkpoint/compaction continuation与resume epoch | 3 pass、0 fail、14 assertions | `prefix-epoch`；修正后窄回归。 |
| Structured caller结果与superseded APIError | 2 pass、0 fail、10 assertions | `receipt-result`；保留原structured/settlement断言。 |
| Queued raw-loop cancellation、seedless main | 分别1 pass、0 fail | `loop-cancel`、`seedless`；独立用例，不代表全queue矩阵。 |

复现示例（测试名称是regex；使用不含未转义括号的片段）：

```sh
# cwd: packages/cli
env -u MIMOCODE_EXPERIMENTAL -u MIMOCODE_MCP_TOOL_SEARCH -u MIMOCODE_CODEX_MODE \
  bun test test/session/prompt-effect.test.ts --timeout 30000 -t 'MCP|deferred|mcp_tool|exec can call'
env -u MIMOCODE_EXPERIMENTAL -u MIMOCODE_MCP_TOOL_SEARCH -u MIMOCODE_CODEX_MODE \
  bun test test/server/sync-restore.test.ts test/session/fork-queue.test.ts --timeout 30000
```

初轮验证曾暴露旧Inbox测试接口、已移除的Runner-follower屏障、noReply任务语义、per-caller structured结果、旧error completion、checkpoint父消息重排及epoch fence等问题。fixture改为真实accepted receipt观测，保留Runner owner退出边界；noReply/cancel断言按新的受理状态精确迁移。结果回传、上下文和epoch问题通过产品修正及上述窄回归处理，不以跳过或删除原语义断言掩盖。一次默认五秒预算的MCP子集在并行负载下超时，随后使用矩阵的30秒测试预算完成47例；这不证明所有早轮失败都是环境flake。

## 最终验收与发布：pending

- 最终 runtime 的 owning-package typecheck、lint、完整 prompt 与 queue 收口矩阵已通过，结果见上表。早轮 workflow Reference/typecheck 问题已修正；SDK最终重生成 exit 0 且 SDK diff 为空；bun.lock 无本地安装变更。
- `main` runtime commit：`1b2bb10c930997c6c58da89fe7720e2e1c71db5d`；最终main/compat tips及compat验证 pending。共享registry在compat应保持逐字一致，DC差异由compat登记拥有。
- 最终远端branch-tip相等、选定upstream→main→dev/compat ancestry、各精确最终SHA的lint/typecheck/test CI URL/headSha/conclusion均 pending。只改docs导致workflow跳过时，需证明所引用已绿ancestor在docs之外tree一致。
- 发布前若新刷upstream推进，须扩大清单审查并完成后续传播/验证；此文当前不能宣称跟随未审计的新upstream tip。
- 最终资源清理与原工作区保留证明 pending。未验证的Windows/远端执行和实际npm/FDS发布不由本地测试结果推断。
