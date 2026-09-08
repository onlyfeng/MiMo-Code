# 显式音频 API

`mimo serve --audio-api` 在现有服务端口上提供基础语音合成和转写。
ACP、嵌入式实例以及不带显式 API 参数的 `serve` 默认不开放音频接口。
普通 TUI 会自动启动 [模型 API](model-api.md)，其音频端点使用显式签发、限制模型范围
的访问令牌；无 TUI 时也可用 `serve --llm-server`。这两者都不自动启用这里的
`--audio-api` 静态密钥模式；显式服务的两种模式互斥。
仅设置静态音频密钥环境变量不会开启接口。

## 启动与调用

在包含供应商配置的项目目录启动。使用独立随机密钥，并让调用端通过自己的
秘密管理方式取得同一个值；不要把密钥提交到项目配置或写进 URL。

```sh
export MIMOCODE_AUDIO_API_KEY="$(openssl rand -hex 32)"
mimo serve --port 4096 --audio-api
```

密钥要求 32–4096 个非空白 ASCII 字符。更换密钥后重启服务生效。
它只用于音频接口；普通服务 API 继续遵循 `MIMOCODE_SERVER_PASSWORD` 的
Basic 认证规则。未设置服务器密码时，普通 API 的原有本机免密行为仍然存在。

调用方必须明确提供当前项目配置中的 `provider/model`。以下示例中的
`audio/tts`、`audio/asr` 是占位模型名，需要替换为自己的配置。静态密钥模式不提供
自动选模或聊天代理；能力发现、模型列表和访问令牌见 [模型 API](model-api.md)。

```sh
curl --fail-with-body http://127.0.0.1:4096/v1/audio/speech \
  -H "Authorization: Bearer $MIMOCODE_AUDIO_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"audio/tts","input":"你好，世界","response_format":"wav"}' \
  --output speech.wav

curl --fail-with-body http://127.0.0.1:4096/v1/audio/transcriptions \
  -H "Authorization: Bearer $MIMOCODE_AUDIO_API_KEY" \
  -F model=audio/asr -F file=@speech.wav -F response_format=json
```

使用 OpenAI 形状的客户端时，`base_url` 是 `http://127.0.0.1:4096/v1`，
`api_key` 是音频专用密钥；请求的 `model` 同样使用完整的 `provider/model`。

## 支持范围

| 接口                            | 输入与输出                                                      | 供应商协议                                                                                         |
| ------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `POST /v1/audio/speech`         | JSON 文本，返回完整音频二进制；可指定预设 `voice` 和音频格式    | 支持 SDK 的原生 speech factory；没有 factory 时，可使用明确配置 baseURL 的 OpenAI 形状音频聊天协议 |
| `POST /v1/audio/transcriptions` | multipart 的 `model`、`file`；返回 `{ "text": "..." }` 或纯文本 | OpenAI 形状音频聊天协议；支持音频输入和文本输出的 Google/Vertex 语言模型可通过 SDK 转写 |

模型的 `modalities` 必须与用途一致：TTS 为文本输入、音频输出；专用 ASR 为
音频输入、文本输出。支持音频输入的多模态聊天模型可进行尽力转写，但仅有
reasoning 而无正文时会报错，不会把推理内容当成转写结果，也不会自动重试计费。

对外的标准 multipart 转写协议不等于所有供应商的原生转写协议均受支持。
本次没有加入 Whisper 风格 `/audio/transcriptions` 供应商适配。音频聊天适配支持 `@ai-sdk/openai`、
`@ai-sdk/azure`、`@ai-sdk/openai-compatible`，要求显式 HTTP(S) `baseURL`，
且 URL 不含用户名/密码、查询参数或 fragment。它使用配置的
供应商凭据和 headers，并合并模型 headers；不依赖聊天专用插件钩子。
这条原始 HTTP 路径不复用 SDK 的自定义 `fetch`、URL 变量替换或 OAuth
传输适配；依赖这些机制的配置需要独立的供应商适配，不能直接视为已支持。

非 OpenAI 形状的多模态语言模型可走已验证的 Google/Vertex GenerateContent SDK 路径。
模型须声明音频输入和文本输出，且实际语言模型 factory 与音频格式可用；能力发现复用
相同判断，但不会发送生成请求。此路径保留 SDK 传输、项目模型选项、`chat.params`
和 `chat.headers` 插件，发送原始音频及转写指令，支持可选 `language`。
SDK 转写默认最多输出 4096 token，受已知模型输出上限约束；只返回完整结束的非空正文。
因长度截断、纯推理、空白正文、工具调用或缺少结束事件而无法取得完整转写时，明确失败，
不会自动重试或把推理当作转写。指令要求逐字转写，但不保证任意模型的识别质量。

只支持预设音色名称，不包含音色设计或克隆。SSE、未知请求字段、
`provider_options`、转写的 `prompt`/`temperature`、字幕及 verbose JSON
均返回 400。`speed` 仅在原生 SDK TTS 路径支持；音频聊天路径明确拒绝。
原生 `instructions`、`speed` 和格式仍取决于所选 SDK/模型的支持范围。

## 请求边界与关闭

Bearer 校验先于请求体读取和项目实例初始化。接口固定使用启动目录，拒绝
切换到其他目录或 workspace；音频密钥不会授予普通 API 的 Basic 认证权限。

- 请求体总计最多 25 MiB（包含 multipart 包装，按实际读取字节数检查）。
- 合成文本及 `instructions` 各最多 4096 个 UTF-16 代码单元；预设音色名称最多
  128 个字符；每个监听器最多接受两个并发音频请求。
- 请求的取消期限为 120 秒，客户端断开和服务关闭同样向供应商传播取消信号。
- 音频聊天供应商的响应 JSON 最多 32 MiB。不进行自动重试。
- SDK 转写单个音频解码后最多 20 MiB；支持 WAV、MP3/MPEG、MP4/M4A、FLAC、OGG、
  WebM，实际支持仍受模型与适配器限制。累计 SDK 输出事件最多 16 MiB，不重复计算
  SDK 回带的输入请求。
- `SIGINT`/`SIGTERM` 先停止接受请求并取消、等待在途音频调用，再销毁项目实例。

音频路径的 401/403/413/429 分别表示凭据、目录范围、请求体大小和并发限制。
供应商异常返回脱敏错误。协议验证使用本地 HTTP 供应商夹具；这不代替对每个
真实供应商、模型版本及音色的可用性验证。

普通实例的 OpenAPI/生成 SDK 不包含这个可选音频接口；当前使用上述 HTTP
协议调用。来源为 upstream `6203ea2e` 的基础音频实现，按 FD-004 的显式入口、
鉴权顺序和关闭边界进行适配。
