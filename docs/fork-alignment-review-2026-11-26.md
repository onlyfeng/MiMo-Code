# Fork 与 upstream 对齐复核（2026-11-26）

## 基线（均为本次刷新后的远端 SHA）

| 端点 | SHA |
| --- | --- |
| upstream/main | `c538fab349373356623acea5bb80defa7fc279c0`（未前进，= 上次同步基线） |
| fork main | `6fe784092fed596eea8d5382d85c9713ed96a378` |
| fork dev/compat | `071d9f408790a7c2332b89b409d1955e3422bd45` |

祖先关系：upstream → main 为 merge-base 相等；main 已完全包含于 compat（`compat..main` = 0）。
规模：main 比 upstream 多 974 个提交，非 docs/非测试源码 208 个文件 +15163/−5104；compat 比 main 多 811 个提交，源码 80 个文件 +4635/−612。
fork 未删除任何 upstream 文件（main、compat 均无 D 状态）。

## 方法

1. 三份登记表（FD 10、FC 54、DC 13，共 N=77）逐条抽取状态与退役条件。
2. 对可确定判定的退役条件直接查 upstream 代码或依赖版本（FC-019/039/055 依赖版本、FC-022 `clone()`、FC-049 `chunkTimeout`、FD-011 `toolChoice`）。
3. 孤儿扫描：upstream 导出/开关在 upstream 有调用、fork 无调用（main 对 upstream、compat 对 main 两个方向）。
4. fork 新增文件的调用方计数（死代码）。
5. 近两月 upstream 提交与登记表/同步记录的处置对照（942de16e、3de989f4、91872284、e37f2c2d、c9c91d7b、2491aae5、6f83cd0e、128adcb7、33943835）。
6. 登记表体积：日期型注记占比。

## 处置结果

审计本身只读；下列动作经用户同意后执行。

| # | 归属 | 动作 | 结果 |
| --- | --- | --- | --- |
| A1 | FD-004 | `flag/flag.ts` 密码块恢复 upstream 原文；非回环绑定守卫改读 upstream 的 `MIMOCODE_SERVER_PASSWORD_SUPPLIED`；删除 `MIMOCODE_SERVER_OPERATOR_PASSWORD`、加载时快照与测试用 setter；`project-init-git.test.ts` 回到 upstream 文本（保留 `root: "cwd"`） | PR #273。守卫行为不变：旧 getter 与 `SUPPLIED` 读同一变量；守卫改回 `MIMOCODE_SERVER_PASSWORD` 的突变会使 worker-listener 测试在 `Refusing to bind` 断言处失败 |
| A2 | FD-006 | 删除 `script/experiments/tool-schema*.ts` 与 `test/experiments/tool-schema*.test.ts`；`tsconfig.scripts.json` 回到 upstream 文本 | PR #273。实验记录保留在 `docs/experiments/tool-schema-2026-09-07.md`，代码可从 `6fe784092fed596eea8d5382d85c9713ed96a378` 取回 |
| A3 | FC-008 | 评估 CI 改用 upstream 的按耗时分片（`script/test-shard.ts`） | **不改。** FC-008 在 2026-11-16 同步时已决定保留路径哈希分片（审计时漏看）。本次实测（`fe97a67a` 的绿色运行）：哈希分片 372/245/175/348 s，按耗时分片为每片 288 s，墙钟约快 84 s，runner 分钟数不变；代价是每新增测试文件或刷新权重都会让文件换分片。实测数据已补进 FC-008 |
| A4 | FC-013 | 记录 upstream 开关 `MIMOCODE_EMPTY_STEP_DROP_LIMIT` 在 fork 中无读取方 | FC-013 注记；代码保持 upstream 文本 |
| A5 | FC-001 / FC-005 | 记录生产路径不调用、但 upstream 测试仍在测的辅助函数 | FC-001/FC-005 注记。复核时发现缺口：fork 的 `/summarize` 走 `startSummarize` 内联查找，upstream 回归测试只测未被调用的 `resolveCurrentAgent`。新增 `test/server/summarize-agent-main-slice.test.ts` 驱动真实路由；只改 agent 取值的突变会使它在 agent 断言处失败 |
| A6 | FD/FC/DC 登记表 | 把 2026-10-01 之前的日期注记迁到 history | **不执行。** 逐条核对发现，现行规则常常只写在日期注记里，没写进 Observable contract：FD-009 的“main 的 actor spawn/run 不暴露 `context`”和“非 main agent 的 resume 拒绝模型覆盖”，FC-008 2026-09-17 的测试根目录机制，FC-001 2026-09-15 的消息原子提交与准入。整段迁移会把这些规则移出同步必读范围；要安全地做，等于重写正文。建议以后逐条把仍然有效的注记合并进正文，每条单独审查 |
| A7 | FC-052 / DC-BUILD-001 | 把 local 版本时间戳上提到 main | 不执行：会增加 main 相对 upstream 的偏离 |

未做逐段溯源的热点：`session/prompt.ts`、`actor/spawn.ts`、`tool/tool-script.ts`。建议每次只取一个面，逐 hunk 找到引入提交与登记项，确认理由是否仍然成立。

## 完整清单（N=77）

“保留”表示：退役条件经 11-25 同步复核，本次未发现 upstream 已满足；标注“抽查”的条目本次又直接查了 upstream 代码或版本。compat 列中的“继承”表示与 main 相同。

| ID | 能力 | main 结论 | dev/compat 结论 | 决定性证据 |
| --- | --- | --- | --- | --- |
| FD-001 | 运行审批不切换共享删除状态 | 保留 | 继承 | 退役条件未满足 |
| FD-002 | 指令内容默认送达与重试一致性 | 保留 | 继承 | 同上 |
| FD-004 | upstream capability 路由整体采纳 + 3 处修正 | 保留；A1 已对齐（PR #273） | 继承 | `flag.ts` OPERATOR≡SUPPLIED；`project-init-git.test.ts` 被改写 |
| FD-005 | 单一 harness 解析 | 保留 | 继承 | e3592f0e 已采纳 opt-in；会话优先级仍是 fork 契约 |
| FD-006 | exec 为组合工具 | 保留；A2 已退役实验载体（PR #273） | 继承（tsconfig exclude 一并删除） | `script/experiments/**` 无生产调用方 |
| FD-009 | 冻结上下文捕获失败即关闭 | 保留 | 继承 | 退役条件未满足 |
| FD-010 | 只有思考内容的压缩步骤被恢复 | 保留 | 继承 | 2491aae5 已按 10-30 记录适配 |
| FD-011 | 压缩请求禁用工具调用 | 保留（抽查） | 继承 | upstream `compaction.ts:484` 仍为 `toolChoice: "auto"` |
| FD-012 | 空压缩步骤重试 1 次 | 保留 | 继承 | upstream 无压缩专用重试 |
| FD-013 | 模型配置保留存储源语义 | 保留 | 继承 | 防止 `{env:}` 被展开写回，属正确性修复 |
| FC-001 | actor 代际与持久 peer 生命周期 | 保留；A5 补登记并补 fork 路径回归测试 | 继承 | 孤儿扫描 |
| FC-024 | 启动对账：已投递的 claim 记为 interrupted | 保留 | 继承 | 91872284 处理的是存活 run 的 claim，属于另一问题 |
| FC-031 | actor send 记录发送 lane | 保留 | 继承 | 退役条件未满足 |
| FC-037 | actor 回执 | 保留 | 继承 | 同上 |
| FC-038 | 带 key 的 actor send 幂等 | 保留 | 继承 | 同上 |
| FC-043 | actor cancel 有界等待 | 保留 | 继承 | upstream `tool/actor.ts:395` 仍直接 cancel |
| FC-002 | 规范 checkpoint writer | 保留 | 继承 | 退役条件未满足 |
| FC-021 | writer 溢出、视图、步数预算 | 保留（无效开关记在 FC-013） | 继承 | 942de16e 已按 11-13 C04 适配 |
| FC-027 | writer 收尾一行 | 保留 | 继承 | 退役条件未满足 |
| FC-028 | 阶梯跨重启 | 保留 | 继承 | 同上 |
| FC-029 | writer 获得文件正文 | 保留（11-13 Codex 改为 opt-in 后，必要性主要在 Codex harness） | 继承 | `checkpoint.ts:1014` |
| FC-036 | no-fork writer 溢出时 fork 父视图 | 保留 | 继承 | 退役条件未满足 |
| FC-044 | writer 只返回 exec 的 `.output` | 保留（同样主要在 Codex harness 下生效） | 继承 | `checkpoint.ts:61` |
| FC-045 | 超预算裁剪目标 85% | 保留 | 继承 | 退役条件未满足 |
| FC-046 | 重建后阶梯 | 保留 | 继承 | 同上 |
| FC-047 | no-fork writer 独立模型 | 保留 | 继承 | 同上 |
| FC-004 | MCP 配置与连接生命周期 | 保留 | 继承 | 11-25 C03 已补 `directToolNames` 校验 |
| FC-005 | 技能发现与调用权限一致 | 保留；A5 已注明 `isSkillCatalogReminder` | 继承 | 孤儿扫描 |
| FC-006 | 插件写记忆的实例内决策 | 保留 | 继承 | 退役条件未满足 |
| FC-007 | 受保护根、固定 cwd 等 | 保留 | 继承 | 同上 |
| FC-008 | 有界清理与 CI 隔离 | 保留；A2 已完成；A3 实测后维持路径哈希分片 | 继承（compat 另有 Windows 运行时入口） | `run-cli-tests.sh` 为 path-hash，未使用 `test-shard.ts` |
| FC-009 | 合成消息来源标记 | 保留 | 继承 | 退役条件未满足 |
| FC-010 | WebFetch/SSRF 分类 | 保留 | 继承（DC-NET-001 覆盖） | 同上 |
| FC-011 | fork 面向的提示与技能指引 | 保留 | 继承 | 内容契约 |
| FC-012 | 发布与安全路由 | 保留 | 继承 | 治理契约 |
| FC-013 | 重试预算与 MaxMode 最后一步 | 保留；A4 已注明 | 继承（DC-MODEL-001 扩展） | `MIMOCODE_EMPTY_STEP_DROP_LIMIT` 无读取方 |
| FC-014 | Cloud Agent 环境 | 保留 | 继承 | fork 专属基础设施 |
| FC-015 | 有界压缩上下文 | 保留 | 继承 | 6f83cd0e 已采纳 |
| FC-016 | 语音结果归属、字素安全编辑 | 保留 | 继承 | 退役条件未满足 |
| FC-017 | 历史预览保真与旧 retry 行读取 | 保留 | 继承 | upstream 无旧行归一化 |
| FC-019 | QuickJS 堆视图补丁 | 保留（抽查） | 继承 | npm 最新仍为 0.32.0 |
| FC-020 | 字符串化容器参数解码 | 保留 | 继承 | 退役条件未满足 |
| FC-022 | `Log.clone` 独立 tag | 保留（抽查） | 继承 | upstream `clone()` 仍经 `create()` 返回缓存 logger |
| FC-023 | 无模型轮次保留 variant | 保留 | 继承 | 3de989f4 处理的是父 variant 传递，不同问题 |
| FC-025 | Grok 扁平 operation | 保留 | 继承 | 退役条件未满足 |
| FC-026 | cron bridge 跨实例回收 | 保留 | 继承（compat cron-bridge 另有 DC-SESSION-001） | 同上 |
| FC-030 | 恢复会话显示 variant 不覆盖 | 保留 | 继承 | 同上 |
| FC-032 | ssh 超时提示 | 保留 | 继承 | upstream bash 超时说明不区分远端 |
| FC-033 | 工具运行起始时间 | 保留 | 继承 | 退役条件未满足 |
| FC-034 | 持久 cron 锁接管 | 保留 | 继承 | 同上 |
| FC-035 | 撤销只回滚本会话写入 | 保留 | 继承 | 同上 |
| FC-039 | opentui 分段终端回复 | 保留（抽查） | 继承 | upstream 仍锁 0.1.101（npm 已到 0.9.9，fork 不应单独升级） |
| FC-040 | 只读 subagent 不被要求写 journal | 保留 | 继承 | 退役条件未满足 |
| FC-041 | exec 可读 memory 目录 | 保留 | 继承 | upstream `tool-script.ts` 无 memory 放行 |
| FC-042 | 有界 agent 以拒绝为准而非触发阈值 | 保留 | 继承 | 退役条件未满足 |
| FC-048 | 步骤摘要成本恒定 | 保留 | 继承 | 同上 |
| FC-049 | SSE 注释不算进度 | 保留（抽查） | 继承 | upstream `chunkTimeout` 只看字节 |
| FC-050 | 旧超大环境前缀重建 | 保留（遗留数据兼容） | 继承 | 仍需读取 11-13 之前的冻结前缀 |
| FC-051 | 撤销与 prompt 准入互斥 | 保留 | 继承 | 退役条件未满足 |
| FC-052 | 构建来源记录 | 保留；A7 可选、不推荐 | compat 由 DC-BUILD-001 扩展 | upstream 无构建 commit 记录 |
| FC-053 | xai 配置 provider 与推理选项 | 保留 | 继承 | c9c91d7b 已采纳，3 处修正仍需要 |
| FC-054 | 日志 sink 有界 | 保留 | 继承 | 根因仍未定位 |
| FC-055 | Gemini xhigh 补丁 | 保留（抽查） | 继承 | upstream 仍锁 3.0.73 |
| FC-056 | Windows 二进制文件 hook 从磁盘加载 | 保留 | 继承 | 取决于 Bun 版本 |
| DC-BUILD-001 | local 版本时间戳 | 不适用 | 保留（A7 可选） | compat 4 行 |
| DC-RESOURCE-001 | ripgrep/fps 选项 | 不适用 | 保留 | upstream 无等价配置 |
| DC-NET-001 | 内网 WebFetch | 不适用 | 保留 | 用户部署需要 |
| DC-NET-002 | RFC1918 MCP 可达 | 不适用 | 保留（只有测试） | 无生产分叉 |
| DC-PLATFORM-001 | ripgrep/archive 回退 | 不适用 | 保留 | 受限网络/Windows |
| DC-MODEL-001 | 按 agent 的 MaxMode | 不适用 | 保留 | upstream 只有全局 `experimental.maxMode` |
| DC-CONTEXT-001 | 内容上限与请求预检 | 不适用 | 保留 | 退役条件未满足 |
| DC-ACTOR-001 | 全上下文 actor | 不适用 | 保留 | 同上 |
| DC-ACTOR-002 | 显式 subagent variant | 不适用 | 保留 | 3de989f4 只传父 variant |
| DC-TUI-001 | 请求 provider/model/variant 显示 | 不适用 | 保留 | main 无等价显示 |
| DC-WEBSEARCH-001 | 原生搜索与回退 | 不适用 | 保留 | upstream 只有 copilot responses 内部类型 |
| DC-WEBFETCH-001 | 网关托管 fetch | 不适用 | 保留 | upstream 无 |
| DC-SESSION-001 | 单进程驱动会话 | 不适用 | 保留 | upstream 仍假定一个数据库对应一个进程 |

行数核对：FD 10 + FC 54 + DC 13 = 77。
