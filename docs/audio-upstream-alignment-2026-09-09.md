# 2026-09-09 音频行为统一

用户在完成本日 upstream 同步后，明确要求音频处理与 upstream 一致。本次是指定行为
融合，采纳已在仓库中的 `534f32d8`，基准为
`1c13f05105b7c671a3e201b61410ccbfa8acf96e`。不获取或引入新的 upstream 提交。
本记录替代 [本日完整同步](upstream-sync-2026-09-09.md) 中 SYNC-03 的音频保留决定，
旧记录保留其当时结论。

## Capability inventory（N=1）

| ID | 指定行为与载体 | main 处理 | dev/compat 处理 | Owner / 证据 |
| --- | --- | --- | --- | --- |
| AUDIO-ALIGN-01 | 退休独立 speech/transcription、静态音频服务和能力选模；模型发现采用有效 registry；保留聊天内音频 | 共享主实现统一，不另建音频后端 | 从 main 直接继承；没有音频专用 override | FD-004；FC-007/008/011 邻接，FC-016 保留；HTTP、CLI、模型发现、聊天音频、provider、TUI voice、MCP sampling 回归 |

起点：main `f4146b1a2feccaa224d7f7c8fde0c826161bdd90`，
dev/compat `6b6a36698c3a66b826586d6d2512cc54bcf6f8a8`。
上游差异审计范围为 `534f32d8^..534f32d8`；fork 实施仅包含上述行为及其
测试、现行文档、登记和历史指针，不扩大同步基准。

## 最终行为与归属

- `/v1/audio/speech`、`/v1/audio/transcriptions` 不再服务；有效模型令牌也不能
  恢复接口。路由在请求体读取和项目初始化之前返回 404；缺失/无效令牌仍遵守原鉴权。
- 删除 `serve --audio-api`、`MIMOCODE_AUDIO_API_KEY`、`Server.listen` 的 `audio`
  选项、`issue --capability`、provider speech 工厂/缓存、模态分类及配套专用实现。
  原先静态密钥与模型服务的互斥分支随静态模式一起删除。
- `GET /v1/models` 从当前项目经过插件和配置过滤的 registry 枚举，按令牌范围过滤并
  排序。不实例化 SDK 工厂，不按语音能力筛选或承诺传输可用；CLI 显式模型签发检查
  同一登记。有限模型范围、显式全部范围、续签和独立期限沿用原契约。
- 聊天 `input_audio` 继续使用严格 Base64、格式别名、单项 20 MiB、总媒体 25 MiB
  及实际 SDK 传输验证。相关帮助函数移到 `llm-server/input-audio.ts`，不保留废弃
  转录模块作为依赖。`llm-server/error.ts` 承载共享请求错误，解除 HTTP 准入对音频服务
  的依赖；SDK 中转录专用输出参数和工厂入口一并清理。
- TUI voice、MCP sampling、TUI-owned listener、提前鉴权、固定目录、并发/体积限制、
  取消和关闭路径保留。聊天代理仍不执行 Actor、工具或压缩工作流。
- 审阅全部 active FD/FC/DC；DC-MODEL-001、DC-CONTEXT-001、DC-ACTOR-001 只有请求
  语义邻接，DC-NET-001/002、DC-PLATFORM-001、DC-TUI-001 无音频实现覆盖。
  音频改动由 main 唯一拥有；compat 的 WebFetch 私网政策不进入聊天媒体下载。
- 普通 API schema、生成 SDK/OpenAPI、依赖/lockfile 和 CI workflow 输入未改变；
  不复制或无故重生成上游产物。不删除用户既有 worktree。

当前指南为 [Model API](model-api.md) 和 [音频迁移](audio-api.md)；bundled
`mimocode-docs` 同步修改。旧计划/发布审计保留历史内容，并明确指向本次取代记录。

## 验证记录

移除端点的回归先在旧实现失败（预期 404，实际 400），然后在新实现通过。
最终验证结果和源提交由本次发布前审计补齐；远端最终 SHA 的 CI 与祖先关系独立验证，
不以本地检查替代。测试采用包自有 preload baseline：
`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`；默认路径清除 AGENTS 指定的 ambient
experimental/MCP-search/Codex selectors 及 compaction/checkpoint、tool-name-case selectors。
隔离的非 test 子进程另清 preload 的 opt-in flags，验证旧静态 key 不会启用 plain serve。
