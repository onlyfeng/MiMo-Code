# 显式模型 API 与访问令牌

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

# 有限模型列表：重复 --model
mimo llm-server issue --directory /absolute/project/path --model provider/chat --model provider/asr --json

# 显式授权该项目当前及后续生效配置中可服务的全部模型
mimo llm-server issue --directory /absolute/project/path --all-models --json
```

`--capability` 接受 `chat`、`speech` 或 `transcription`。候选来自该项目当前生效
的 provider 和模型配置，按解析后的模型能力及已支持的调用方式筛选。专用模型优先，
其后优先配置的默认模型，再按模型标识稳定排序。发现不会发送生成请求，因此不证明
供应商当前在线、账户余额或具体模型支持的所有参数。

重复 `--model`、`--all-models` 与 `--capability` 三种选择方式必须且只能使用一种。
有限列表接受 1 至 64 个不重复的完整 `provider/model`，签发时逐个检查是否可用，
拒绝空列表和通配符。`--all-models` 使用显式全部范围，不把当前目录的模型展开成快照。

`--json` 签发结果包含 `api_key`、`scope`、`base_url` 和固定目录/范围/期限的
`renew_argv`。有限范围继续返回 `models`，仅单模型时返回 `model`；全部范围使用
`scope:{"type":"all"}`，不伪造空 `models`。按能力签发时还返回备选模型，但它们不自动
获得授权；续签始终保留实际选中的模型，不重新按能力选模。调用方应使用完整
`provider/model`；全部范围可从 `GET /v1/models` 查询当前可用列表。找不到该目录对应的
存活监听器时，`base_url` 为 `null`；命令不会自动启动监听器。

地址发现只探测本机地址，使用不携带令牌的监听器身份检查，拒绝旧登记和重定向。
绑定指定局域网地址时，请手动填写服务地址。`GET /v1/_mimocode` 只返回随机监听器
标识，不读取项目配置或返回模型、令牌；这是地址确认专用的无凭据端点。

## 调用与授权范围

| 接口                            | 行为                                             |
| ------------------------------- | ------------------------------------------------ |
| `GET /v1/models`                | 返回该令牌授权且当前配置可服务的模型             |
| `POST /v1/chat/completions`     | 非流式 JSON 或 SSE，支持文本、图片、输入音频和客户端工具调用协议 |
| `POST /v1/audio/speech`         | 使用已融合的基础语音合成实现，返回完整音频       |
| `POST /v1/audio/transcriptions` | 使用已融合的标准 multipart 转写入口              |

把签发结果中的 `api_key` 作为 `Authorization: Bearer ...`，将 `base_url`
配置为客户端的 API 基址（已经包含 `/v1`）。例如将签发结果保存在调用方的秘密配置
中，再传入客户端；不要提交令牌到项目文件。

令牌授权**固定项目目录及显式模型范围**。有限范围精确匹配模型标识；全部范围只包含
该目录当前生效配置中可服务的模型，后续增加或删除模型也随有效配置变化，不扩大到
其他目录。`--capability` 是选模条件，不是端点权限：如果选中的多模态模型同时支持
聊天与转写，同一令牌可调用这两种接口。空范围和通配符都不表示全部模型。
HTTP 参数不能切换目录或 workspace。

代理使用项目已有供应商凭据；客户端令牌不会成为供应商请求的认证头。聊天路径沿用
provider 配置和聊天插件钩子，构造不持久化的请求上下文；只把工具调用返回给客户端，
不执行 TUI 的工具、MaxMode、actor、checkpoint 或压缩工作流。

现有 `serve --audio-api` 仍使用独立静态音频密钥。它与 `--llm-server` 互斥；
静态音频密钥不能授权模型代理，模型令牌也不能授权静态密钥模式。两者均不代替
普通服务 API 的 `MIMOCODE_SERVER_PASSWORD` Basic 认证。

## 有效期、查询与撤销

默认闲置期限为一小时，绝对期限为一天。有效令牌验证会刷新闲置期限；绝对期限从签发
时间计算，不随使用刷新。`--ttl` 和 `--max-age` 可设为正安全整数毫秒对应的时长，或
分别使用 `none` 取消该期限。零、负值、无效时长及时间戳溢出仍会拒绝。

| 签发参数 | 到期规则 |
| --- | --- |
| 省略两项，或 `--ttl 1h --max-age 24h` | 闲置一小时或签发一天，先到者生效 |
| `--ttl none --max-age 24h` | 仅签发后一天到期 |
| `--ttl 1h --max-age none` | 仅闲置一小时到期，使用会刷新 |
| `--ttl none --max-age none` | 无到期时间，仍可撤销 |

例如显式签发固定项目的永久全部模型令牌：

```sh
mimo llm-server issue --directory /absolute/project/path --all-models --ttl none --max-age none --json
```

签发和列表 JSON 分别用 `idle_ms`、`max_age_ms` 的 `null` 表示已取消的期限；只有两项
都取消，`expires_at` 才为 `null`。终端用 `never` 显示无到期时间，并列出两项期限。
`renew_argv` 分别保留每个 `none`。无到期时间不会取消每次请求的资源和超时限制。
嵌入库对应 `expiry:{idleMs:null,maxAgeMs:null}`；v2 存储的两项期限必须存在且为正安全
整数或显式 `null`，缺字段不代表永久，v1 记录仍只接受原来的有限期限。
新签发令牌的明文仅在签发结果中返回，磁盘只保存 SHA-256 哈希；查询不返回明文。

```sh
mimo llm-server list --directory /absolute/project/path --json
mimo llm-server revoke TOKEN_ID --directory /absolute/project/path
```

撤销阻止之后的请求准入，已经授权的在途请求由请求取消/期限/服务关闭管理。重新
签发产生新的令牌，旧令牌不会自动撤销。列表与撤销直接操作该目录的令牌存储，
不初始化项目或插件。

旧 v1 单模型令牌可等价读取，范围与期限不变；只有真正修改记录时才在同一文件锁内
原子写成 v2。查询、未知令牌及无变化的撤销不会仅因版本旧而改写存储。旧记录中合法的
字面 `*` 模型标识仍按原字符串精确匹配，不变成通配授权；新签发不接受该字符。
磁盘只保存 canonical `scope`，有限范围的公共库结果保留旧 `models` 投影；读取可能是
全部范围的结果时，应按 `scope.type` 区分，不能假设始终存在 `models` 数组。

## 协议范围与资源限制

请求体按实际读取量限制为 25 MiB；同一监听器最多两个在途请求，每个请求的取消
期限为 120 秒。流式请求直到响应结束或取消被底层处理后才释放名额。客户端断开和
服务关闭传播取消信号；关闭先停止接收并取消在途工作。`serve` CLI 收到
SIGINT/SIGTERM 后再清理项目实例；嵌入宿主调用 `Server.stop()` 后仍负责实例生命周期。

聊天图片支持请求体内的 `data:image/...;base64,...` 和 HTTP(S) `image_url`，每张
解码后最多 5 MiB，支持 PNG、JPEG、WebP、GIF；全部图片与音频合计最多 25 MiB。
远程图片在认证、模型范围、图片能力和参数校验之后下载，逐跳检查所有 DNS 结果并
固定连接到已校验的公网 IP，保留原 Host 与 TLS 主机名校验。最多五次重定向，拒绝
URL 用户凭据、私网/回环/特殊地址、压缩响应及图片类型不匹配；取消后清理连接。
下载请求不携带客户端或供应商凭据，SDK 只收到下载后的图片数据。此限制同样适用于
dev/compat，独立于它的 WebFetch 私网规则。

聊天的用户消息还可包含音频，与文字、图片按原顺序交给模型：

```json
{
  "model": "provider/audio-capable-chat-model",
  "messages": [{ "role": "user", "content": [
    { "type": "text", "text": "请说明这段音频的内容。" },
    { "type": "input_audio", "input_audio": { "data": "<WAV 文件的 Base64>", "format": "wav" } }
  ] }]
}
```

`data` 接受规范 Base64；裸 Base64 必须提供 `format`，`data:audio/...;base64,...`
可以推断格式，同时提供 `format` 时两者必须一致。不接受远程音频 URL。格式集合为
`wav/mp3/mpeg/mpga/m4a/mp4/flac/ogg/webm`，其中别名会归一化。单个音频解码后最多
20 MiB，所有媒体共用上述 25 MiB 总额；HTTP 请求体的 25 MiB 额度另计 Base64 开销。
模型必须声明音频输入能力，且实际 SDK 传输支持该格式：OpenAI/Azure Chat 和
OpenAI-compatible Chat 只接收 WAV/MP3；Google/Vertex GenerateContent 可承载上述容器。
这里要求配置实际选中 Chat 传输，仅使用 OpenAI/Azure 包名并不代表启用了 Chat。
OpenAI Responses、已知不支持音频的适配器及未经验证的适配器会提前拒绝。SDK 能编码
音频不代表供应商当前在线或每个模型都能理解该音频。

聊天累计 SDK 输出事件限制为 16 MiB（含事件字段，不重复计算 SDK 回带的输入请求）。
供应商错误脱敏；未收到有效结束事件的流不会被标成正常 `stop`。聊天和音频均不自动重试。

## 客户端供应商选项

聊天请求的 `provider_options` 接受下列按模型和实际 SDK 传输验证的白名单，字段直接
放在该对象内，不再套 `openai` 等供应商命名空间。未知字段（包括嵌套对象中的未知键）、错误类型或
不支持的模型/传输组合返回 400；校验发生在图片下载和生成之前。模型、消息、工具、
URL、认证头及 `forceReasoning` 等保留字段不能由此覆盖。

| 模型及传输                       | 可用字段与范围                                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI / Azure Chat 或 Responses | `reasoningEffort`: `none/minimal/low/medium/high/xhigh`；`textVerbosity`: `low/medium/high`。要求实际 SDK 能消费该模型的字段；Responses 另支持 `reasoningSummary`: `auto/detailed`，Chat 拒绝 summary |
| 已支持的 Anthropic Claude        | `thinking`: `{type:"enabled",budgetTokens:N}`、`{type:"disabled"}`，或支持模型上的 `{type:"adaptive",display?:"omitted"\|"summarized"}`；`effort` 只能取该模型已有 adaptive 变体支持的值              |
| Google / Vertex Gemini 2.5       | `thinkingConfig.thinkingBudget`：Pro 为 `-1` 或 `128..32768`；Flash 为 `-1` 或 `0..24576`；Flash-Lite 为 `-1`、`0` 或 `512..24576`。另支持布尔 `includeThoughts`                                      |
| Google / Vertex Gemini 3 / 3.1   | `thinkingConfig.thinkingLevel`：3 Pro 为 `low/high`；3.1 Pro 为 `low/medium/high`；3 Flash 为 `minimal/low/medium/high`。另支持布尔 `includeThoughts`                                                 |
| Xiaomi MiMo Chat                 | 实际 `xiaomi` 供应商的 `mimo-v2.5` / `mimo-v2.5-pro`：`thinking:{type:"enabled"\|"disabled"}`；本地 Responses 传输不在此白名单中                                                                      |
| DeepSeek v4 Chat                 | 实际 `deepseek` 供应商的 `deepseek-v4-pro` / `deepseek-v4-flash`：`thinking` 开关及 `reasoningEffort:low/high/max`                                                                                    |

例如支持推理的 OpenAI Responses 模型可以使用：

```json
{ "provider_options": { "reasoningEffort": "high", "reasoningSummary": "detailed" } }
```

Anthropic 显式思考预算为 `1024..31999`，还受模型可用输出容量限制。SDK 会把预算加进
输出令牌上限，因此两者合计不能超过模型配置与 SDK 已知上限；显式输出超限返回 400，
省略输出上限时为思考预算预留容量。Gemini 的 budget 与 level 互斥，切换时清除旧选择器，
独立的 `includeThoughts` 设置会保留。

非空选项的覆盖顺序为供应商默认 → 模型配置 → 已校验客户端选项 → 顶层
`reasoning_effort` 对应的既有模型变体 → 可信项目插件。顶层变体仍需存在，其附带的
summary 等默认值也会覆盖客户端字段；要独立组合推理强度和摘要，可只使用
`provider_options`。切换 thinking 类型会替换旧类型的字段。MiMo 的顶层 low/medium/high
在这条路径都表示开启 thinking，不承诺不同强度；DeepSeek 显式关闭 thinking 时不能
同时指定 effort，若顶层变体开启 thinking 则按该变体处理。

省略 `provider_options` 或传 `{}` 保持此前的配置和变体合并行为，不自动启用新参数。
白名单证明本地 SDK 的编码和校验范围，不保证远端接受所有模型与参数组合。音频
转写和语音合成端点仍拒绝客户端 `provider_options`。其他影响行为但未支持的参数也
明确拒绝。

音频后端、格式、预设音色及参数限制见 [音频 API](audio-api.md)。本轮未加入音色
设计、克隆或 Whisper 原生转写供应商适配。

普通 OpenAPI 和生成 SDK 仍不包含这组可选接口；可使用兼容客户端或直接 HTTP
调用。Node 入口导出 `LLMServerTokens` 供嵌入端显式管理令牌，只有传入
`Server.listen({ ..., llm: { directory } })` 才开启代理。接口按 [FD-004](upstream-deviations.md)
保留显式开启、提前鉴权、固定目录与可取消关闭的要求。
