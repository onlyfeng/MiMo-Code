# 显式模型 API 与临时令牌

在有供应商配置的项目目录中执行 `mimo serve --llm-server`，即可在现有服务端口
提供模型列表、聊天补全以及基础音频接口。普通 TUI、ACP、嵌入式实例和不带显式 API 参数
的 `serve` 默认关闭这些接口；配置供应商凭据或签发令牌不会启动服务。

## 启动、选模与签发

```sh
# 终端一：在项目目录中启动
mimo serve --port 4096 --llm-server

# 终端二：选择同一个项目，按能力签发
mimo llm-server issue --directory /absolute/project/path --capability chat --json

# 也可明确选择自己的 provider/model
mimo llm-server issue --directory /absolute/project/path --model provider/model --ttl 1h --max-age 24h --json
```

`--capability` 接受 `chat`、`speech` 或 `transcription`。候选来自该项目当前生效
的 provider 和模型配置，按解析后的模型能力及已支持的调用方式筛选。专用模型优先，
其后优先配置的默认模型，再按模型标识稳定排序。发现不会发送生成请求，因此不证明
供应商当前在线、账户余额或具体模型支持的所有参数。

`--model` 与 `--capability` 必须且只能选择一个。`--json` 签发结果包含 `api_key`、选定的
`model`、`base_url` 和固定目录/模型/期限的 `renew_argv`；按能力签发时还返回
备选模型。调用方应使用
结果中的完整 `provider/model`，不把备选模型自动当作已授权模型。找不到该目录对应的
存活监听器时，`base_url` 为 `null`；命令不会自动启动监听器。

地址发现只探测本机地址，使用不携带令牌的监听器身份检查，拒绝旧登记和重定向。
绑定指定局域网地址时，请手动填写服务地址。`GET /v1/_mimocode` 只返回随机监听器
标识，不读取项目配置或返回模型、令牌；这是地址确认专用的无凭据端点。

## 调用与授权范围

| 接口                            | 行为                                             |
| ------------------------------- | ------------------------------------------------ |
| `GET /v1/models`                | 返回该令牌授权且当前配置可服务的模型             |
| `POST /v1/chat/completions`     | 非流式 JSON 或 SSE，支持文本和客户端工具调用协议 |
| `POST /v1/audio/speech`         | 使用已融合的基础语音合成实现，返回完整音频       |
| `POST /v1/audio/transcriptions` | 使用已融合的标准 multipart 转写入口              |

把签发结果中的 `api_key` 作为 `Authorization: Bearer ...`，将 `base_url`
配置为客户端的 API 基址（已经包含 `/v1`）。例如将签发结果保存在调用方的秘密配置
中，再传入客户端；不要提交令牌到项目文件。

令牌只授权**固定项目目录和一个明确模型**。`--capability` 是选模条件，不是端点
权限：如果选中的多模态模型同时支持聊天与转写，同一令牌可调用这两种接口。空模型
范围不表示全部模型，不支持通配授权。HTTP 参数不能切换目录或 workspace。

代理使用项目已有供应商凭据；客户端令牌不会成为供应商请求的认证头。聊天路径沿用
provider 配置和聊天插件钩子，构造不持久化的请求上下文；只把工具调用返回给客户端，
不执行 TUI 的工具、MaxMode、actor、checkpoint 或压缩工作流。

现有 `serve --audio-api` 仍使用独立静态音频密钥。它与 `--llm-server` 互斥；
静态音频密钥不能授权模型代理，临时模型令牌也不能授权静态密钥模式。两者均不代替
普通服务 API 的 `MIMOCODE_SERVER_PASSWORD` Basic 认证。

## 有效期、查询与撤销

默认闲置期限为一小时，绝对期限为一天。每次有效准入刷新闲置期限，但不能越过绝对
期限。`--ttl` 和 `--max-age` 可调整为有限正时长，不接受 `none`、零或无限期限。
新签发令牌的明文仅在签发结果中返回，磁盘只保存 SHA-256 哈希；查询不返回明文。

```sh
mimo llm-server list --directory /absolute/project/path --json
mimo llm-server revoke TOKEN_ID --directory /absolute/project/path
```

撤销阻止之后的请求准入，已经授权的在途请求由请求取消/期限/服务关闭管理。重新
签发产生新的令牌，旧令牌不会自动撤销。列表与撤销直接操作该目录的令牌存储，
不初始化项目或插件。

## 协议范围与资源限制

请求体按实际读取量限制为 25 MiB；同一监听器最多两个在途请求，每个请求的取消
期限为 120 秒。流式请求直到响应结束或取消被底层处理后才释放名额。客户端断开和
服务关闭传播取消信号；关闭先停止接收并取消在途工作。`serve` CLI 收到
SIGINT/SIGTERM 后再清理项目实例；嵌入宿主调用 `Server.stop()` 后仍负责实例生命周期。

聊天图片支持请求体内的 `data:image/...;base64,...` 和 HTTP(S) `image_url`，每张
解码后最多 5 MiB，支持 PNG、JPEG、WebP、GIF；全部图片合计最多 25 MiB。
远程图片在认证、模型范围、图片能力和参数校验之后下载，逐跳检查所有 DNS 结果并
固定连接到已校验的公网 IP，保留原 Host 与 TLS 主机名校验。最多五次重定向，拒绝
URL 用户凭据、私网/回环/特殊地址、压缩响应及图片类型不匹配；取消后清理连接。
下载请求不携带客户端或供应商凭据，SDK 只收到下载后的图片数据。此限制同样适用于
dev/compat，独立于它的 WebFetch 私网规则。

客户端 `provider_options` 整包返回 400，避免透传参数覆盖授权模型；
项目配置中的模型选项和显式 `reasoning_effort` 变体仍然有效。其他影响行为但未支持
的参数也明确拒绝。聊天处理累计 SDK 事件限制为 16 MiB（含事件字段）。
供应商错误脱敏；未收到
有效结束事件的流不会被标成正常 `stop`。聊天和音频均不自动重试。

音频后端、格式、预设音色及参数限制见 [音频 API](audio-api.md)。本轮未加入音色
设计、克隆或 Whisper 原生转写供应商适配。

普通 OpenAPI 和生成 SDK 仍不包含这组可选接口；可使用兼容客户端或直接 HTTP
调用。Node 入口导出 `LLMServerTokens` 供嵌入端显式管理令牌，只有传入
`Server.listen({ ..., llm: { directory } })` 才开启代理。实现提取自 upstream `6203ea2e`，按 [FD-004](upstream-deviations.md)
保留显式开启、提前鉴权、固定目录与可取消关闭的要求。
