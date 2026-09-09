# 已发布模型 API 能力融合设计

> Historical snapshot: dedicated audio endpoints and capability selection described here
> were superseded by the [2026-09-09 audio convergence](../../audio-upstream-alignment-2026-09-09.md).
> Use the current Model API guide for supported behavior.

用户已批准按 1 → 2 → 3 → 5 → 6 → 7 实施，跳过第 4 项音色设计与克隆。
这是指定能力整合：源码依据 upstream 正式版 v0.1.14
`2a0eb706e95a77cba34a319e9f11f33f26d4450c`，不推进整体 upstream
审计基线 `6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85`。
main 起点为 `2d90dfd732a95dc5e5e601e783994860abddde1f`，dev/compat
起点为 `3737e4d32a3cfd61a843ef55fd11c6b8dbc35d12`。

## 行为与边界

1. 远程图片：聊天 image_url 同时接收现有 data URL 和 HTTP(S) URL。下载在认证、
   模型范围、输入能力及参数校验之后。每图解码后最多 5 MiB，每请求所有内嵌与远程
   媒体合计最多 25 MiB。URL 禁止用户凭据，逐跳验证公网 DNS 地址并固定连接地址，
   保留原 Host/TLS 校验；最多五次重定向，不携带客户端或供应商请求头，拒绝压缩
   响应并验证支持的图片格式。取消或失败关闭连接。此策略不继承 compat 的 WebFetch
   私网特例，也不修改全局 WebFetch 行为。
2. 聊天音频：新增 input_audio，校验格式、规范 base64、实际大小和模型音频输入能力。
   通过 AI SDK 文件媒体部件传递；仅支持对应 SDK 能实际表达的格式，拒绝静默降级为
   文本。复用媒体总量限制。不增加远程音频 URL、生成语音或音色克隆。
3. ASR SDK fallback：保留已有 OpenAI 兼容传输，为有音频输入能力的其他语言模型增加
   AI SDK 转写路径。发现与执行共用可用性判定，保留 provider 配置、插件、取消、
   输出限额及无自动重试，转写仅取正文。专用 transcription 模型不借此虚报 SDK 支持。
5. provider_options：仅开放实际 SDK 消费且有范围校验的推理和文本表现选项，依据
   SDK 家族映射。未知字段、错误家族、任意请求体/网络参数均拒绝。客户端选项应用于
   可信模型默认值之后；顶层 reasoning_effort 及既有可信插件覆盖顺序保持明确。
6. 多模型令牌：重复 --model 授权非空有限列表；--all-models 显式授权固定目录当前及
   后续配置且可用的全部模型。两者与 --capability 互斥；能力选择仍固定为选中的模型。
   聊天、音频、发现和列表共用范围判定。旧 v1 单模型记录严格验证并等价迁移，不扩大
   权限。无效或空范围不能隐式表示全部。续发参数完整保留授权范围。
7. 令牌期限：--ttl none 与 --max-age none 分别取消闲置及绝对期限；缺省仍为一小时和
   一天。只有两者均为 none 才永久。持久化使用显式 number|null，缺失字段不能表示
   无期限。保留撤销、固定目录、记录上限和并发原子更新；输出与续发保留每个期限。

FD-004 是显式监听、认证先于 bootstrap 和关闭收敛的所有者。FC-008 负责测试隔离与
生命周期证据。FC-010/DC-NET-001 的 WebFetch 合约不因新增图片下载而变化。
普通 TUI/serve/ACP 默认不启用监听，既有静态音频 key 权限保持。

## 验证与发布

逐项先加入失败回归，再实现和独立审查，前一项确认后才修改下一项。
协议、真实本地 HTTP/SDK 请求、取消、限额、鉴权顺序、跨进程令牌一致性均在范围内。
默认测试清除外部实验选择器，保留 package-owned preload。补充 Node 构建运行验证，
因为核心同时发行 Node 包。最终将 main 传播至 dev/compat，复核全部活动 FD/FC/DC，
以远端精确 SHA 的 CI、祖先关系及六项结果表交付。仅清理本轮创建且已集成的工作树。
