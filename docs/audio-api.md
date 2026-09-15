# 音频接口现状

截至已接受的 upstream `5198ff54`，fork 使用 upstream 的 capability 路由。
独立语音合成与转录端点 `/v1/audio/speech`、`/v1/audio/transcriptions` 未提供；
它们不能通过旧音频密钥或令牌恢复。响应由现行鉴权、实例与 UI fallback 中间件
决定，不承诺固定的 404 状态，也不承诺在实例初始化之前拒绝请求。

`mimo serve --audio-api`、`MIMOCODE_AUDIO_API_KEY` 静态密钥模式和
`mimo llm-server issue --capability` 已退役。后续 capability API 对齐又移除了
`--all-models`、`--directory`；在目标项目目录内签发令牌，使用可重复的
`--model provider/model` 限定模型，空模型列表表示全部已配置模型。

聊天音频使用 [模型 API](model-api.md) 的 `POST /v1/chat/completions`，在用户消息中
传 `input_audio`。支持范围以现行协议和供应商 SDK 为准：不再承诺已退役 fork
音频 API 的独立上传上限、入场校验或完整传输保护。FD-004 记录了原样接受的
upstream 限制，包括无服务器自有请求体上限和截止时间。

2026-09-14 替换令牌存储实现后，旧 fork `version: 2` 令牌失效，应重新运行
`mimo llm-server issue`。TUI 语音输入及 MCP sampling 保留；独立 TTS/ASR 客户端
应直接使用供应商接口。

[2026-09-09 音频统一审计](audio-upstream-alignment-2026-09-09.md) 是较早阶段的
历史证据，其中旧令牌、启动参数与上传约束不能作为本页之后的当前接口契约。
当前行为由 [FD-004](upstream-deviations.md#fd-004--upstreams-capability-route-adopted-whole) 维护。
