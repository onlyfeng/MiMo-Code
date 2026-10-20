# 2026-10-20 upstream synchronization through 4e58a801

## 范围与不可变基线

本轮为完整同步，流向为只读 `upstream/main` → fork `main` → fork `dev/compat`。选定审计范围为 `bf0563ddc201b44e3f59c35b18dba17c4386564d..4e58a80184794d52d913d4b886b96f496f2c7020`：12 个提交（11 个非 merge 提交），178 个变更路径、18,008 行增加、3,875 行删除。起始 fork tips 为 `main=aaa53f4e56136ee1bf845b02ff080716ea2a0c66`、`dev/compat=97fce708b8dc9353d274b83f718e1a3c7d27416a`。

首批 runtime 与 bundled MCP prompt 提交为 `1b2bb10c930997c6c58da89fe7720e2e1c71db5d`，测试适配为 `aa625ef0bf685b58ce4644f7700c7f4cc53d462c`。C13 实时补审的 runtime/tests 提交为 `b18a1207cd66c312216698c175441b8c49778907`，bundled prompt 文件没有新增修改。十三项能力已全部传播到 compat，保留 11 个 DC owner 与 52 个生产 overlay 路径。下列本地验证与精确 SHA CI 分开记录；OpenAPI follow-up 后的最终源码引用为 `d2f22b8d293dfb16d28e609c8f6d58047a5ee369` / `dcc13401331125450c1cdf39308bdefa5994e86f`，两支的新 SHA CI 均已成功。当前记录覆盖上述完整选定 upstream。

操作使用独立临时分支和工作树，保留原工作区已有修改及无关资源。文档路径示例统一使用 `/tmp/example`；它不是实际操作路径。资源清理只覆盖本轮创建的两个临时分支和工作树；原 `.omo/`、无关分支和既有工作树受保护，实际清理回执与最终 tips 由任务执行回报给出。

## Capability inventory (N=13)

下表是唯一的处置表，每项能力恰好一行；能力传播、OpenAPI 修正与两支新 SHA CI 已完成。共享 owner 均在 `main`，compat 只保留已有 DC overlay；没有把 compat 独有能力提升为共享能力。

| ID | 选定行为、生产者与 owner | main 结果 | dev/compat 结果 | 决定性路径与测试 |
| --- | --- | --- | --- | --- |
| C01 | Durable inbox input receipts、迁移、受理/认领/结算/GC；FC-001、FC-009 | 采用并适配。完整 user/parts 与 receipt 原子提交；保留重放身份、task、provenance、permission 和 ownership 检查。`accepted/claimed/settled/cancelled/rejected` 替代取走即删除的 send/drain。 | 已继承并适配；继承共享 receipt/迁移合同，保留 compat task/context 限制。 | `src/inbox/{controller,schema,inbox,sync}.ts`、`inbox.sql.ts`；queue-controller、queue-spec-points、queue-migration-contracts。 |
| C02 | Unified lane scheduling、取消 epoch、执行所有权、main 自动等待子任务；FC-001、FC-008、FD-001 | 适配。busy HTTP prompt 返回持久 202 receipt；严格 exclusive entry 仍原子拒绝占用。取消先隔离旧 epoch，未运行输入为 never-ran；保留 admission/approval/task/recovery 边界。 | 已继承并适配；继承共享 lane/cancel/wait，不削弱 DC-MODEL-001 的 final-step/status 隔离。 | `src/session/{prompt,run-state,execution-ownership}.ts`、`src/effect/runner.ts`；turn-queue-admission、main-wait、wake-instance-handoff、server/session-prompt-busy。 |
| C03 | Actor 显式 wait、input revision observation、terminal notification；FC-001、FD-006、FD-009 | 适配。保持 generation、retired peer、frozen schema、owned cancellation 和 terminal join；timeout 返回可发现的执行状态，观察者取消不终止 child。accepted-only receipt 事件替代 InboxArrived 观测。 | 已继承并适配；保留 DC-ACTOR-001 full-context 与 DC-ACTOR-002 variant 合同。 | `src/actor/{spawn,execution,notification,waiter,registry}.ts`、`src/tool/actor.ts`；actor wait/send/spawn/ownership/cancel、actor-owned-lifecycle、plugin/actor-hooks。 |
| C04 | Queue-aware sync/export/import/fork/history projection；FC-001、FC-002、FC-009、FC-017 | 采用并适配。保持 first-delivery order、消息引用、未消费输入隐藏和完整 history；fork 不复制可执行 receipt。checkpoint、session.post 与 goal judge 使用相同 queue view。 | 已继承并适配；保留 DC-CONTEXT-001 的 chronology/coverage/caps 和 DC-ACTOR-001 frozen 视图。 | `src/session/{session,message-v2,checkpoint,prompt}.ts`、sync/restore 与 CLI import/export；fork-queue、external-import-queue、sync-restore、restore-order。 |
| C05 | Workspace/project identity、scoped refs、Runner acquisition ownership；FC-001、FC-005、FC-007、FC-008 | 采用并适配。保持 exact roots、fixed cwd、可选 ref owner、generation 和有界 workflow teardown；夹具使用隔离实例。 | 已继承并适配；保留 DC-PLATFORM-001 fallback 和现有 context/workspace 边界。 | `src/project/`、`src/effect/{runner,scoped-ref}.ts`、workflow/runtime、skill discovery、Bash；project/workspace/scoped-ref/runtime suites。 |
| C06 | Sticky deferred MCP catalog 与固定 mcp_tool_use；FD-005、FD-006、FC-004 | 适配。live 与 prefix capture 共用 resolved harness 和真实 reminder/call evidence；silent auto 无此证据时可重判，不写辅助标记，不把搜索结果加入 active schemas。保留 escaping、post-hook 参数检查、real-tool权限/metrics、settlement；新快照 fixed dispatcher/loaded=[]，旧 direct 快照仅在 captured membership/schema 交集内执行；Codex hidden direct/exec 保持既有授权合同。 | 已继承并适配；保留 current-turn projection、active mask/toolsHash 与动态 wire preflight，不能将 dispatcher 变成 frozen pool 扩权入口。 | `src/session/{prompt,llm,llm-request-prefix}.ts`、`src/tool/mcp-tool-search.ts`、三种 harness prompt；mcp-tool-search、prefix、prompt-effect、codex-compact、tool-script。 |
| C07 | InvalidOutputError 与真正空输出重试；FC-009、FC-013，FD-010/FD-011/FD-012 仍独立 | 适配。仅 replay-safe、无 tool residue 的纯空会删除空 attempt 后由 bounded unknown policy 重试，无 repair user；reasoning-only、checkpoint 未完成和已结算工具保留 bounded continuation/atomic source。summary 的接受、no-tool 与独立空重试界限不退役。 | 已继承并适配；保留 per-agent MaxMode、bounded scopes 和 main-only retry status。 | `src/session/{retry,processor,prompt,compaction}.ts`；retry、invalid-output-continuation、processor-effect、compaction-reasoning-fallback/tool-choice。 |
| C08 | Mid-turn user text 原样传递以保留 thinking signature binding；FC-009、FC-011 | 采用。删除依赖 moving lastFinished 的 user wrap；保留 stored source/attachment/system 与 summary 合同。其他 history rewrite 和已损坏签名不在此修复声明内。 | 已继承并适配；保留 content caps 与 current-turn边界，不能恢复每轮变化的 wrapper。 | `src/session/prompt.ts`、message-v2/LLM消费者；steer-message-render-stable。 |
| C09 | TUI actor send 不再固定 Delegating pending；FC-001 | 采用。按 action 显示 pending/body/terminal，send 不挂接 receiver 的 live tool stream；保留失败/timeout显示、title/plan恢复。 | 已继承并适配；保留 request metadata 与 Actor variant 的事实来源。 | `src/cli/cmd/tui/routes/session/actor-tool-state.ts`、`index.tsx` 及 actor/workflow projection；actor-tool-state、session-recover-flow。 |
| C10 | finish=tool-calls 时 completion footer 保持挂载 | 采用。统一 final-finish predicate，保留 recovering/aborted footer 和现有字段。 | 已继承并适配；DC-TUI-001 的 provider/model/variant显示保持。 | `src/cli/cmd/tui/util/assistant-footer.ts`、session UI；assistant-footer。 |
| C11 | Login tips 根据已计算 provider 的 credentials 判断 | 采用。检查 key、env source 或 options.apiKey，provider存在本身不等于具备凭据。 | 已继承并适配；provider路由及 DC-PROVIDER-001 不变。 | home/tips-view；tips-view。 |
| C12 | npm trusted publish permission、FDS canary、完整 tarball preflight；FC-012 | 采用。发布前检查 SDK/plugin/CLI tarball身份/版本及 FDS signed write；保留 mandatory GH_REPO/fork routing。未调用 trust、preflight上传或任何发布 stage。 | 已继承并适配；共享发布治理保持，不因继承 workflow 获得 upstream 发布授权。 | `.github/workflows/release.yml`、`script/release.ts`、registry sync/launcher；root script/release.test.ts、launcher tests。 |
| C13 | Deferred MCP readiness 与 request-visible server/tool outcomes；FD-005、FD-006、FD-009、FC-004 | 采用并适配实时新增 `4e58a801`：non-blocking readiness、entry/server 最新状态、恢复/移除/工具集回归、共享 reminder 预算与安全 search-miss diagnostics；保留 live/capture identity 和 frozen authority。 | 已继承并适配；保留 current-turn caps、active mask/hash、native wire 和 frozen membership，保持 DC-NET-002 与 pending-import lifecycle。 | `src/mcp/index.ts`、`src/session/{prompt,llm-request-prefix}.ts`、`src/tool/mcp-tool-search.ts`；readiness/prompt/search/lifecycle/frozen-prefix suites。 |

结果行数：13。compat 已全部继承并适配，保留 11 个 DC owner、52 个生产 overlay 路径。Active owners 保持 9 FD、17 FC；没有 owner 退役或重新编号。表中 `src/` 与 `test/` 路径均相对于 `packages/cli/`，明确标为 root 的脚本除外。

## 保留与替换的合同

旧的 async-only queue、`Inbox.send`/drain 删除、wakePending 和 `InboxArrived` 不是新实现的当前入口。所有被受理的 queue input 都引用同一事务写入的完整 user/parts；后续 claim、first delivery、settlement 与 retained receipt 分开。actor结果里的 `inboxID` 兼容字段仍表示该 durable receipt。旧行转换、运行中认领输入的启动协调和 terminal-only GC 各自有测试，不能概括成跨崩溃 exactly-once 模型执行。

持久化不等于受理：`noReply` 只保存消息，不能凭“比 queued user 更新”替代其任务、format、权限或运行归属。未运行而被 Stop 取消的 receipt 保留原 user、`never_ran` 和无 delivery；不会伪造 assistant。严格 resume/recovery 仍在原子入场后才结算精确候选；actor frozen identity、task namespace、外部 pending-question/permission 检查以及执行取消 epoch 同时生效。

新 MCP 快照分别保留完整授权实现池和固定 wire subset。`mcp_tool_use` 自身的通用参数 schema 不授予任意名字调用权；底层工具仍须通过 request/frozen/permission/schema 检查。旧无 dispatcher 快照只兼容原 active/loaded 名字与 membership 的交集。连接变化不会把搜索结果 schema 添到前缀；空 catalog 初始 defer，真实 reminder/search/use call（含 legacy announcement）使 auto sticky，silent auto 无此证据时允许重判。回合边界公告与证据识别保持 live/capture 一致，不为缓存选择写辅助 user part。

checkpoint、post-hook、goal judge、fork/history 的消费视图需要隐藏未消费receipt并保留已消费输入的位置，同时不能让回补的旧输入覆盖 checkpoint continuation 的父消息/approval authority。前台结构化完成和后续queued用户可同属一个lane run，但各自caller仍读取自己的完成结果。工作区generation、scoped reference和Runner退出所有权继续防止旧清理释放新generation。

## 已核查的本地验证

下表主要记录首批 `113e3192` 的源码/测试快照；新增 C13 的定向验证单独记录。它们是本轮执行过程中已查看完成的子矩阵；并非所有数字均来自同一最终源树，不能相加为一个全量通过数。各源码快照的收口矩阵单独列出；compat 的独立结果和最终 OpenAPI 验收门槛见后文。默认路径清除 ambient `MIMOCODE_EXPERIMENTAL`、`MIMOCODE_MCP_TOOL_SEARCH`、`MIMOCODE_CODEX_MODE`，保留 package-owned preload；opt-in用例只在自身scope启用selector。CLI测试从 `packages/cli` 执行，root script测试从repo root执行；依赖只用 `bun ci`。

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

## 首轮 CI 与测试适配

[首轮精确 SHA 测试运行](https://github.com/onlyfeng/MiMo-Code/actions/runs/39407392419) 绑定 `1b2bb10c930997c6c58da89fe7720e2e1c71db5d`：lint 与 typecheck 成功，test 失败。失败来自迁移测试仍使用旧 Inbox content、busy ledger、Runner 全局序号、结果文案、缺失的 HTTP 202 和不完整消息夹具，以及纯空输出/摘要独立重试的旧调用次数假设。取消 Actor 的两个测试期望不一致；保留原运行行为与既有 negatives 合同，统一新增断言，未改变恢复权限。

测试提交 `aa625ef0bf685b58ce4644f7700c7f4cc53d462c` 保留正文、sender/provenance、ownership、取消、原 context 与空 text 删除断言。Actor execution 改用真实 session；prefix 夹具直接按 `MessageV2.Info` 构造完整消息，不再用 cast 绕过 schema。两条 processor cleanup 测试显式配置 `retry.unknown.maxRetries=0` 并断言仅调用一次，以隔离单次清理；默认重试由独立 InvalidOutputError 测试验证。空 compaction 摘要仍执行 FD-012 的一次独立重试，精确调用两次。

修正后的本地整组结果：四文件 HTTP/Actor recovery 23/23、waiter 32/32、execution ownership 与 Actor tool 42/42、Actor exec 11/11、execution cancellation 3/3、OpenAPI 4/4、prefix invariant 1/1、overflow/processor 32 pass 与两个原有 skip，均零失败。owning-package typecheck 通过；产品源码与 SDK 没有额外修改。下一最终 SHA 仍须获得独立 CI，首轮失败没有通过同 SHA 重跑抹去。

## 实时 upstream 推进补审

初次选定 `113e3192568a342076e68c70d55b99bd67869dcf` 后，发布期间 live `upstream/main` 推进至 `4e58a80184794d52d913d4b886b96f496f2c7020`（单个 readiness-hint 提交，七个路径）。这不是冻结基线；因此范围扩大为上述完整区间并新增 C13，不把对旧 SHA 的 CI 当作当前 upstream 对齐证明。前批 main `f6632fb8085b4005df4abeb36933b30ee9d74811` 和 compat `00f40d329cf26e19dbaff131158494aec8b19e82` 的发布与 CI 仅属于中间快照。main 的 lint/typecheck/test 已全部成功，分别绑定运行 `39409072280`、`39409071997`、`39409071967`；compat 的 lint/typecheck/test（`39409350318`、`39409350296`、`39409350305`）也全部成功，包括 Windows runtime。两支旧 SHA 的成功不替代 C13 后的新 SHA 验收。

新增 readiness 与授权 catalog 分开：连接状态不推断调用权限；展示工具须与当前 search/dispatch catalog 取交集。entry 和 server outcomes 共用预算，只在 user-turn boundary 追加真实 reminder。按最新语义状态比较，支持失败后恢复、缩小后恢复、disabled/removed；错误文案变化不重复通知。没有真实 reminder、search/use call 或 legacy announcement 时，silent auto 允许重新判定 deferral；不为缓存选择持久化辅助 user part。这更新了 C06 的 silent-auto 边界，固定 dispatcher 和 frozen implementation authority 保持。main 与 compat 已完成该能力传播；最终 OpenAPI follow-up 和新 SHA CI 已成功，分别记录于下节。

C13 main 稳定提交 `b18a1207cd66c312216698c175441b8c49778907`：MCP/prompt/prefix 专项 95 pass、0 fail（587 assertions，三个文件）；工具完整文件 34/34、prefix 完整文件 12/12、Actor 完整文件 31/31、MCP lifecycle/Claude pending 34/34；owning-package typecheck exit 0；root lint 为 3,639 warnings、0 errors。新增真实 malformed-history 回归覆盖十类无效 metadata，忽略坏记录但保留先前有效状态；live/capture 共用 deferral evidence helper。C13 本身没有 lockfile、manifest、公开 HTTP schema 或 SDK 输入变化，因此当时无需重复依赖安装和 SDK 生成。后续 OpenAPI CI 暴露的生成器缺陷属于独立共享修正，见下节；不能继续用此前的 SDK 零 diff 代替该修正的验证。

## Compat 传播与精确 SHA CI 历史

compat 已完成 C01–C13 的继承和语义适配，保留 11 个 DC owner 与 52 个生产 overlay 路径。共享 registry 保持 main 所有并传播；DC 差异仍由 compat 登记拥有。C13 的 compat MCP/prompt/prefix 矩阵为 102 pass、0 fail、630 assertions（223.82 秒）；关键 frozen/readiness/capture 回归 10/10，native search/wire preflight 两文件 39/39。上述目标执行均清除三个 ambient selector 并使用 30 秒预算，没有辅助 MCP history marker。

| 已验收或失败的源码快照 | 精确 SHA CI | 已知结论与边界 |
| --- | --- | --- |
| main `3d9527fd667de159110f594ea79c25dfbf2c5401` | [lint 39410487995](https://github.com/onlyfeng/MiMo-Code/actions/runs/39410487995)、[typecheck 39410488054](https://github.com/onlyfeng/MiMo-Code/actions/runs/39410488054)、[test 39410488082](https://github.com/onlyfeng/MiMo-Code/actions/runs/39410488082) | 三个 workflow 均 completed/success，headSha 均为该 SHA。这是 OpenAPI follow-up 前的已绿快照。 |
| compat `dcb6160f59e09031a9e21bb562bed328b40ba7c5` | [lint 39410900761](https://github.com/onlyfeng/MiMo-Code/actions/runs/39410900761)、[typecheck 39410900748](https://github.com/onlyfeng/MiMo-Code/actions/runs/39410900748)、[test 39410900737](https://github.com/onlyfeng/MiMo-Code/actions/runs/39410900737) | lint/typecheck 成功；test 为 failure：九个 test jobs 成功，unit shard 1 因两条 OpenAPI 断言失败。该 SHA 不能标为全绿。 |

compat 的失败没有通过跳过断言或重跑同 SHA 抹去。进一步本地复现表明 OpenAPI 生成器会修改 lazy route 的 metadata；同进程连续生成时，第二次结果出现 22 个 dangling schema references。main 的连续生成回归已先复现失败；最终合入 `every $ref in the generated OpenAPI document resolves`，对每份文档检查所有引用及相同组件集合，说明它是共享生产缺陷，不能当作 compat 的平台问题或测试噪声。修正只在 `Server.openapi()` 的 fresh app 上复制 response/content/media 对象，保留 resolver 函数与 lazy route 原数据，不缓存文档输出、不改变运行中的路由。修正已落 main 并合并到 compat；两支均启动新 SHA CI。它不增加 upstream capability inventory 项，也不退役 FD/FC/DC owner。

## 最终源码与发布证据

| 分支与已绿源码 SHA | lint | typecheck | test |
| --- | --- | --- | --- |
| main `d2f22b8d293dfb16d28e609c8f6d58047a5ee369` | [39412986868](https://github.com/onlyfeng/MiMo-Code/actions/runs/39412986868) | [39412986931](https://github.com/onlyfeng/MiMo-Code/actions/runs/39412986931) | [39412987052](https://github.com/onlyfeng/MiMo-Code/actions/runs/39412987052) |
| dev/compat `dcc13401331125450c1cdf39308bdefa5994e86f` | [39413089967](https://github.com/onlyfeng/MiMo-Code/actions/runs/39413089967) | [39413089966](https://github.com/onlyfeng/MiMo-Code/actions/runs/39413089966) | [39413089981](https://github.com/onlyfeng/MiMo-Code/actions/runs/39413089981) |

六个 workflow 均 completed/success，headSha 与各行完整 SHA 一致；main 的九个适用 test jobs 成功，Windows 按 workflow 跳过；compat 的十个 test jobs 全部成功，包括实际 Windows runtime。此前失败 SHA 保留在历史节，没有同 SHA 盲目重跑或删除断言。

OpenAPI 修正的本地证据：main 完整 5/5、相邻六文件 49/49；compat OpenAPI 与 model-selection 组合 17/17、完整八文件邻接组合 63/63（948 assertions，72.01 秒），均零失败。两支 owning-package typecheck exit 0，分别重生成 SDK exit 0，`packages/sdk` 与 `bun.lock` 均无额外 diff。新增并发生成检查也对每份文档解析全部引用；保留 compat checkpoint coverage 与真实 SDK 方法断言。

发布收口使用新取的 upstream/fork refs：选定 upstream `4e58a801` 是 main 的 ancestor，main 是 compat 的 ancestor，远端源码 tips 与上述 SHA 相等。验收后只提交 `docs/` 记录；这类 push 由 workflow paths-ignore 跳过，不借用历史源码结果：最终执行检查必须以 `git diff --quiet <green-source> <final-tip> -- . ':(exclude)docs'` 对每支证明 docs 之外 tree 完全一致，并验证新的远端 tips、完整 ancestry 与四份共享文档逐字相同。最终提交号和该检查的实际结果在任务执行回报中提供。

资源边界为仅移除本轮两个临时分支和工作树，检查其无用户修改并已集成；保留原 `.omo/` 与无关分支 `docs/instance-generation-producer-inventory`。实际清理后的 worktree/branch 清单由执行回报核实。没有执行 npm/FDS 发布。

## 2026-10-20 复审后的指定收敛

本节是用户批准的五项复审处理，不是新一轮 upstream 同步。选定 upstream
仍为 `4e58a80184794d52d913d4b886b96f496f2c7020`，没有 fetch 或合入更新的
upstream。起点 main 为 `a9da5e1e53bcc5b7e17eb1e26de6b8e81053faa9`，
compat 为 `13fba6a1eb12a430f080d82836d857fdb985be74`。保留现有
FD/FC/DC 能力、OpenAPI 修复和无关工作区状态。

指定变更清单 N=5；下表与前面的 C01–C13 同步清单分别计数。

| ID | 行为与归属 | main 结果 | dev/compat 结果 | 决定性证据 |
| --- | --- | --- | --- | --- |
| S01 | 退役的 inbox wake 接口；FC-001、FC-008、FD-001 | 删除无生产消费者的 join/admit、deferInbox、epoch hold；保留同步取消和执行所有权 | 待继承 | `runner.ts`、`run-state.ts`、`cancel-epoch.ts`、`prompt.ts`；六处 runLoop 调用仅移除原来 false/undefined 的参数 |
| S02 | Session.fork 历史读取；FC-001、FC-017 | 复用 sourceMsgs，保留建目标前拒绝无效 cutoff 和事务内 rendered-order 读取 | 待继承 | `session.ts`、`fork-queue.test.ts` 的 absent/foreign cutoff、processor fork freshness |
| S03 | MCP 当前合同；FC-004、FD-005、FD-006 | 文档改为请求授权目录和固定 dispatcher，旧 loaded membership 仅用于历史冻结快照 | 待继承相同文档 | FC-004 Observable contract；没有 MCP 产品源码改动 |
| S04 | 会话级重试诊断；FC-013 | processor 通知回调仅由 main 发布状态和 RetryAttempt，actor 仍实际重试 | 待继承 | `processor.ts`、`invalid-output-continuation.test.ts` 的真实 HTTP/SSE 与 Bus 对照 |
| S05 | Inbox 渲染布局；DC-CONTEXT-001 | 不适用，保持上游布局 | 待独立 compat PR | 恢复 blankTo 位置与结构注释，保留 UTF-8 caps、完整通知标签及空内容回退 |

共享代码/测试提交依次为 `a2d1cded3db6d2bd8881252c465767748bab7b63`
（S01）、`17260db2e9a8ef4b35e66e0521ef25f4af10b0b3`（S02）和
`a53165b4f0584a487c5090962bdf5d9123b9c1cd`（S04）。S03 及本节属于
文档提交，不改变 runtime/test 快照。PR、集成分支精确 SHA CI、compat
继承和最终资源清理仍待发布验收，不能由下列本地结果替代。

本地使用 `bun ci`，lockfile 不变；Bun 为 1.4.3。测试从 `packages/cli`
运行，移除环境中的 `MIMOCODE_EXPERIMENTAL`、`MIMOCODE_MCP_TOOL_SEARCH`、
`MIMOCODE_CODEX_MODE`，保留包 preload 的隔离 HOME/XDG、内存数据库和禁用
默认插件。CLI `bun run typecheck` exit 0；root `bun run lint` 为
3,638 warnings、0 errors。

- Runner/生命周期八文件：修改前 107 pass，修改后 106 pass；仅删除已经没有
  生产调用的 epoch hold 用例。prompt 定向组从 11 pass 到 10 pass，仅删除
  显式 joinRunning=true 的旧接口专属用例，保留迟到输入、取消和 ownership 用例。
- fork 验证共 8 pass：fork-queue 五例、processor fork 两例及 chronological
  cutoff 一例。新增 absent/foreign cutoff 断言在重构前也通过，证明保留已有拒绝边界。
- 重试通知先 RED：main 通过，ordinary actor 因收到不应发布的事件失败。
  修正后 invalid-output 全部十例通过。相邻五文件组为 159 pass、2 个原有
  skip、1 个 30 秒超时；后者是既有八次 request 退避用例，按 CI 的
  `--timeout 120000` 定点复测通过（48.35 秒），没有修改退避策略或测试时限。
- 并行重型检查期间，late-row 和 cancel-hook 两条时序用例超时；降低本地并行度后
  同一源码独立复测 2 pass，保持原测试内置时限。主动终止的宽文件运行不计为
  完整通过，完整验证以最终源码 CI 为准。

复审中的终态 receipt 重放挂起假设没有成为修复项：两次真实入口探针均先被
完整内容校验拒绝，观察到持久化 user 已增加 summary 元数据，未进入假设中的
Deferred 等待。这里不宣称已证明用户可达挂起，也不放松重放一致性校验。
