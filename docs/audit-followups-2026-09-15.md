# 2026-09-15 差异审计后续实施

用户批准依次实施[差异审计](fork-difference-audit-2026-09-15.md)的建议，并完成文档发布。本文记录后续操作；原审计的固定文件清单与发现保留原快照，不回写成新源码清单。

## 范围与基线

- 模式：执行。正常 upstream 同步使用实时刷新；同时实施已经批准的缺口修复和通用能力收敛。
- 初始接受 main：`648f7cdf100b30ff046db7518d8f832473b61481`；compat：`90abf6e447d7a5e5b405aba301bf1a951f469bf6`。
- 选定 upstream：`b4cc11cd652195af9a80297ed543218f3172e6c4`，相对已接受 `5198ff540efb5ca9fff2baa64555324d43a721b9` 只有一个提交、一个生产文件 `provider/error.ts`。最终发布时仍须重新检查实时 refs。
- 文档先进入 main，再由 compat 继承相同的 FD/FC 与审计内容。通用修正先 main 后 compat；compat 特定的预检与产品策略由其自身分支维护。
- 保留主工作区和另一 Agent 原工作树。实现与验证在本操作的独立工作树进行；资源台账不把个人路径写入产品文档。

## 实施清单（N = 11）

| ID  | 选定行为与归属                                | main 结果        | dev/compat 结果      | 决定性载体/验证                                                           |
| --- | --------------------------------------------- | ---------------- | -------------------- | ------------------------------------------------------------------------- |
| F01 | upstream 网关错误别名                         | 本地采纳，待发布 | 待继承               | provider/error.ts；别名、大小写、421/441与非网关隔离                      |
| F02 | 可信模型身份传到 debug；FD-005                | 待集成           | 待继承               | debug agent真实入口、harness resolver及负向/显式模式                      |
| F03 | workflow deadline真实执行与释放；FC-008       | 正在验证         | 待继承               | runtime-worktree、LLM进入、child Instance释放、进程自然退出               |
| F04 | 请求估算及序列化失败策略；DC-CONTEXT-001      | 无对应预检扩展   | 正在修复             | 完整tool schema、实际prompt预检、有效工具集合及保守失败                   |
| F05 | 通用SDK示例生成正确性；FC-008                 | 待提升           | 待继承并删除重复差异 | 生成器、OpenAPI code samples、实际v2调用；不混入compat schema             |
| F06 | 消息时序与原子用户提交；FC-001/DC-CONTEXT-001 | 待提升           | 待以共享实现收敛     | createMessage、UTF8排序、producer、fork/revert/checkpoint及TUI消费        |
| F07 | 并发压缩保留新请求；FC-015/DC-CONTEXT-001     | 待提升           | 待以共享实现收敛     | compaction、pending external admission、continuation前后检查              |
| F08 | checkpoint coverage协议归属；DC-CONTEXT-001   | 待评估共享必要性 | 保留完整现有协议     | route/schema/SDK/TUI缓存；不允许只移动单边载体                            |
| F09 | 退役入口及无调用残留；FC-001/008、FD-004/005  | 待清理           | 待继承               | 旧wake入口、三helper、loader参数、worker与Actor注释；保留resume仍使用路径 |
| F10 | 旧工具mask存储及无用重载；DC-CONTEXT-001      | 不引入旧扩展     | 待收敛               | tools.active、旧行读取、空mask、migration和独立MCP hash                   |
| F11 | 机械差异与生成格式化策略；FC-008/015          | 待收敛           | 待继承               | root generate与已收敛overflow/default prompt；不改运行策略                |

私网 WebFetch、每 Agent MaxMode、模型侧 full Actor 和 TUI 元数据仍按七项 DC 的现有政策保留；NET-002 的生产 MCP 实现已经共享。通用正确性上移不能顺带改变这些产品选择。

## 已取得的验证

F01 新增六组 gateway alias 回归在旧源码上失败，四组近似但非网关的 provider 保持原错误处理。采纳 upstream 后，provider error完整测试集为25 pass、0 fail、45断言。默认命令移除 MIMOCODE_EXPERIMENTAL、MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH、MIMOCODE_CODEX_MODE，保留包级 Orchestrator preload。package bun typecheck通过。定向lint为0 error、6 warning，警告位于继承的upstream源码；不把退出0描述成零警告。

F01源/测试快照为 `874f198b5f25fdd1bc21f73bc58553ba82a2938d`。这些本地证据不等于最终分支CI或其他条目的通过。

## 发布与审查

文档 PR [#126](https://github.com/onlyfeng/MiMo-Code/pull/126) 已创建。后续合并、compat传播、自动审查处置及最终SHA的CI结果仍待完成，不能引用旧接受SHA的绿灯替代。
