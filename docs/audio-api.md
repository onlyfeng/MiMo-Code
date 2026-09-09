# 音频接口调整

2026-09-09 按用户要求统一到 upstream `1c13f051` 中 `534f32d8` 的音频边界。
独立语音合成与转录接口已移除：`/v1/audio/speech`、`/v1/audio/transcriptions`
即使使用有效模型令牌也返回 404，不读取音频请求体、不初始化项目或调用供应商。

`mimo serve --audio-api`、`MIMOCODE_AUDIO_API_KEY` 静态密钥模式以及
`mimo llm-server issue --capability` 不再支持。旧模型令牌保留原目录、模型范围和期限，
但不能恢复已移除的端点；新令牌使用 `--model provider/model`（可重复）或 `--all-models`。

需要让聊天模型理解音频时，使用 [模型 API](model-api.md) 的
`POST /v1/chat/completions` 和用户消息中的 `input_audio`。原有格式、字节上限和
实际 SDK 传输验证继续生效；TUI 语音输入及 MCP sampling 不受本次接口移除影响。
独立 TTS/ASR 客户端应迁移到供应商提供的接口，不再经 fork 的音频代理。

本页替代旧启动和调用指南。实施范围与验证记录见
[音频统一审计](audio-upstream-alignment-2026-09-09.md)。
