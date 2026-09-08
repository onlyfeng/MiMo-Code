# 已发布模型 API 能力融合实施计划

依据：[设计](../specs/2026-09-08-released-model-api-design.md)。用户已批准六项及顺序。
实施工作树 `codex/released-model-api-20260908`；不修改或清理此前 Agent 的工作树。
所有测试在 packages/opencode 运行，清除 MIMOCODE_EXPERIMENTAL、
MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH、MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL、
MIMOCODE_CODEX_MODE，保留 package preload。依赖使用 bun ci。

## 能力清单（N=6）

| ID | 用户编号 | 正式版能力 | main 表面 | compat 处理 | 所有者 |
| --- | --- | --- | --- | --- | --- |
| MEDIA-01 | 1 | HTTP(S) 图片 URL | llm-server protocol/completions/images | 继承同一受控下载策略 | FD-004；FC-008/010 核查 |
| AUDIO-02 | 2 | 聊天 input_audio | llm-server protocol/completions | 继承 | FD-004 |
| ASR-03 | 3 | 多模态语言模型 ASR SDK fallback | audio service、共享 SDK 调用、capability | 继承 | FD-004 |
| OPTIONS-05 | 5 | 客户端 provider_options | llm-server 参数校验和 SDK options | 继承白名单 | FD-004 |
| SCOPE-06 | 6 | 多模型或全部模型 token | tokens、CLI、model-api、audio、capability | 继承显式范围 | FD-004 |
| EXPIRY-07 | 7 | 独立取消 token 两种期限 | tokens、CLI | 继承显式 null | FD-004 |

## Task 1: MEDIA-01 受控远程图片

- 新增下载模块及协议识别，避免修改 WebFetch 的共享策略。
- 先校验模型图片能力，再解析有界媒体；每跳 DNS/IP 固定、类型、长度、取消及清理。
- 回归：远程图片进入实际 SDK body；inline 兼容；SSRF/redirect/超限/错误类型/取消；
  不支持图片或未授权时不连接图片服务器；Node 可用。
- 独立审查，修正后提交。

## Task 2: AUDIO-02 聊天音频

- 严格 input_audio schema、base64 和解码限额；复用媒体总预算。
- 根据真实 SDK 传输校验格式和模型能力，正确构造文件 part。
- 回归实际供应商请求、无音频能力/非法格式/超限/取消，以及文本和图片兼容。
- 独立审查，修正后提交。

## Task 3: ASR-03 语言模型 SDK 转写

- 提取最小共享 SDK 启动/收集接口，避免 audio 与 completions 循环依赖。
- 非 OpenAI 家族音频语言模型使用 SDK，发现和执行同门；既有路径保持。
- 回归真实非 OpenAI SDK wire、语言提示、仅正文、输出限额、取消、无重试和错误脱敏。
- 独立审查，修正后提交。

## Task 4: OPTIONS-05 白名单选项

- 按已安装 SDK 的 schema 和实际请求生成确定字段，不允许任意 providerOptions 注入。
- 明确家族及 chat/responses 差异，校验所有字段和值以及覆盖顺序。
- 回归允许字段的实际 wire、错误字段/族/值、保留字段覆盖攻击及 trusted plugin 顺序。
- 独立审查，修正后提交。

## Task 5: SCOPE-06 显式模型范围

- 新增显式有限列表/全部模型联合类型，严格 v1 等价读取与锁内原子迁移。
- CLI 重复 --model 或 --all-models；能力选择仍固定模型；续发和显示保持范围。
- 传播全部 scope 消费方。回归列表/聊天/音频/发现、空列表/通配符拒绝、配置增加模型、
  v1 迁移、撤销重载、跨进程写入。顺带修复已证实的多次真实 CLI 启动测试期限不足。
- 独立审查，修正后提交。

## Task 6: EXPIRY-07 显式期限取消

- number|null 明确表示每个期限；缺省有限，--ttl none/--max-age none 可独立选择。
- 严格磁盘记录，迁移不延长旧 token；list/issue/verify/renew 保持语义与 JSON 合法。
- 回归四种期限组合、精确边界、默认值、缺字段拒绝、永久令牌撤销及跨进程一致性。
- 独立审查，修正后提交。

## 集成与完成

更新模型/音频 API 及内置文档、活动 registry，并追加审计历史；跳过音色设计/克隆。
六项均完成后运行相关整套测试、package typecheck、lint、Node build/smoke、默认关闭
非测试子进程验证和必要 SDK/OpenAPI 重生成。main 经 fork PR 合并后传播至 dev/compat，
复核全部七个 DC，验证两个远端 tip 的成功 CI 及祖先关系；清理仅本轮资源。
