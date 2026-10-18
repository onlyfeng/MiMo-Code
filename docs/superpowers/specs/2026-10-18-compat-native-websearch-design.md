# 模型原生 Web Search 与分层兜底设计

目标分支：`dev/compat`，起点 `9b9747259d0bff9a4407ea3ba5b3e1a5d17c22a0`。
归属：新增 compat owner DC-WEBSEARCH-001，不修改 main 拥有的 FD/FC 注册表。

## 背景

MiMo-Code 的 `websearch` 只是客户端函数工具：

- `providerID === "xiaomi"` 时向 Xiaomi API 单独发一次带 `web_search` 的 Chat
  请求（`src/tool/websearch/mimo.ts`），否则走 Exa 的匿名 MCP
  （`src/tool/mcp-exa.ts`）。
- 只有 opencode / xiaomi provider，或打开 `MIMOCODE_ENABLE_EXA`（也被
  `MIMOCODE_EXPERIMENTAL` 打开）时才暴露（`src/tool/registry.ts`）。
- 请求链路从不注入 provider 原生搜索工具。`@ai-sdk/openai@3.0.113` 的
  `openai.web_search`、`@ai-sdk/anthropic@3.0.82` 的
  `anthropic.web_search_20250305` 都没有被使用，尽管 `processor.ts` /
  `message-v2.ts` 已能保存和回放服务端执行（`providerExecuted`）的工具。

omo native（`@code-yeongyu/senpi` #3122）的做法是：会话模型支持就在本轮请求里
用 provider 的服务端搜索；搜索相关失败时记住「会话 × 模型」并退回独立
`web_search` 工具；独立工具再走配置的 provider 链（含 Codex/Responses 搜索）
和免费引擎。

## 实测（2026-10-18，gz4399 网关）

两层验证：原始 HTTP（看是否真的搜索、返回来源），以及 MiMo 实际依赖的
`ai@6.0.168` + `@ai-sdk/openai@3.0.113` / `@ai-sdk/anthropic@3.0.82`
`streamText`。每个模型两轮：搜索，再带上第一轮历史追问。

| provider（协议） | 模型 | 结果 | 归类 |
| --- | --- | --- | --- |
| gz4399-codex（Responses `web_search`） | 10/10 | 两层通过，12–32 条来源；回放正常（`store:false` 时 SDK 不回放搜索项） | 原生 |
| gz4399-grok（Responses `web_search`） | 6/6 | 两层通过；回放正常 | 原生 |
| gz4399-claude（Messages `web_search_20250305`） | fable-5、fable-5-1 | 两层通过；但回放加密结果间歇被拒（见下方「端到端补充」） | 原生 + 文本回放 |
| gz4399-claude | opus-5-5 | 首轮能搜；回放加密结果稳定 400 `Invalid encrypted_content in search_result block`（raw 2/2，SDK 1/1） | 原生 + 文本回放 |
| gz4399-kimi | 5 个 | 带工具后 120–240s 零字节（流式/非流式），不带工具 5.8s 正常 | 兜底 |
| gz4399-glm | 5 个可用 | 网关改用自有 `web_search_prime` 并返回非标准 `tool_result` 块；SDK `Type validation failed` | 兜底 |
| gz4399-macaron | 2 个 | 网关把原始搜索结果当回答吐出；SDK 同样解析失败 | 兜底 |
| gz4399-deepseek | deepseek-flash | 工具被网关静默丢弃（输入仅 58 token），模型不搜索直到 `max_tokens` | 兜底 |

另：`glm-5v-turbo` 返回 404 `model_not_found`（与搜索无关）；gpt-5.4 系仍被网关映射到
5.6 系。

成本与现状对照（gpt-6-luna，同一问题）：

| 方式 | 耗时 | 输入 token（缓存） | 结果 |
| --- | --- | --- | --- |
| 无工具基线 | 2.4s | 3556（3328） | 答不出 |
| 本轮原生搜索 | 7–12s | ~12.1K（4.1K） | 27–30 条来源，附引用 |
| Codex 独立搜索（low effort） | 8.8s | 18.6K（4.0K） | 30 条来源 |
| Exa 匿名 MCP（现状） | 0.3s | — | 返回 "You've hit Exa's free MCP rate limit" |

结论：现状在 gz4399 会话里实际不可用（Exa 匿名被限流，且依赖实验开关）。原生搜索
在同一步内完成，省掉一次「工具调用 → 结果 → 再推理」的往返；代价是每次搜索约
8–9K 输入 token 按会话模型价格计费。Codex 独立搜索把这部分成本放在便宜模型上，
但多一次模型往返，结果文本还会进入会话上下文。

与 omo native 的差异：同一原则，但以实测决定开关。按代码推断，omo 当前配置在
gz4399 上有两处会出问题：kimi 开了原生搜索（现挂起）；opus 回放 400 的报错文本
不匹配 senpi 的失败识别正则，不会触发兜底。

### 端到端补充（实现后）

- 首轮 `mimo run` 暴露了一个既有 bug：`ProviderTransform.message` 的 Anthropic
  tool_use 重排把服务端 `web_search` 调用也挪到了结果之后，网关以 400
  “`web_search_tool_result` block must have a corresponding `server_tool_use`”拒绝。
  已修复为只移动客户端调用。
- 修复后抓包确认：MiMo 回放的搜索块与网关返回的逐字节一致，但 gz4399 仍间歇拒绝
  `encrypted_content`（原样重放 6/6 失败；新的 fable 两轮探测 6 次失败 2 次，与
  thinking/effort 参数无关），判断为网关侧（上游账号绑定）。运行期 `replay` 标记 + 文本
  回放已在端到端中验证可用；配置上 gz4399-claude 整体使用 `replay: "text"`，省掉每个
  会话一次失败请求。
- kimi 在流式下也可能返回缺 id/input 的 `server_tool_use`（SDK 类型校验失败），同样走
  `search` 兜底。

## 目标

1. 会话模型在配置里声明支持时，使用 provider 本轮原生搜索。
2. 原生不可用或出问题时，同一轮内自动兜底，不需要用户重发：先 Codex 搜索，再现有
   的 Xiaomi / Exa。
3. 兜底模型和原生开关都可配置。不写配置时，行为与现状完全一致。
4. 回放历史中的原生搜索永远不会让后续请求失败（换模型、关闭原生、网关拒绝回放）。

## 非目标

- 默认对任何 provider（包括一手直连 Anthropic/OpenAI）自动开启原生搜索。
- 新增 DuckDuckGo 等免费引擎；改 WebFetch；main、upstream 的任何改动。
- `nativeModel`（在更便宜的同路由模型上跑原生搜索）。原生开启时，搜索就用会话模型。
- 原生搜索的逐次权限确认（服务端执行，无法询问）。
- 在 Codex harness 的 `exec` 目录里隐藏 `websearch`（见「工具暴露」）。
- 更新 bundled `mimocode-docs`（FC-011 面）。

## 配置

`mimocode.jsonc` 新增顶层 `websearch`（`src/config/config.ts`，需重新生成 SDK）：

```jsonc
"websearch": {
  // 本轮原生搜索。key 为 provider 或 provider/model，后者优先。
  // true 开启；false 关闭；{ "replay": "text" } 开启且历史搜索按文本回放。
  "native": {
    "gz4399-codex": true,
    "gz4399-grok": true,
    "gz4399-claude": { "replay": "text" }
  },
  // websearch 工具的独立搜索模型，按顺序尝试。
  // 字符串为 provider/model；对象可指定该模型已配置的 variant。
  "fallback": [{ "model": "gz4399-codex/gpt-6-luna", "variant": "low" }]
}
```

- `native` 只对 `@ai-sdk/openai`（Responses）与 `@ai-sdk/anthropic` 模型生效；其他
  SDK 的条目被忽略，并记录一次 warn 日志。
- `fallback` 条目必须解析为 `@ai-sdk/openai` 模型；无法解析、SDK 不符或 variant 不存在
  的条目被跳过，并记录 warn 日志，然后继续下一条。variant 取 `Provider` 解析后模型上的
  `variants`（自动生成的与配置的合并结果），与会话 `--variant` 同源。（实现者决定）
- 没有 `websearch` 块时，所有行为与现状逐字节一致。

## 行为

### 第一层：本轮原生搜索

`LLM.stream` 在每次尝试（`attempt` → `run`）里决定是否启用。下列条件全部成立时启用：

- 非 `ephemeral`、非 `small` 请求（标题、摘要、压缩、结构化输出不带原生工具）；
- 当前模型命中 `native` 且 SDK 受支持；
- 已解析工具集（权限与 user/agent 过滤之后）含 `websearch`，且 `websearch` 权限对
  该 agent 为 `allow`。`ask` / `deny` 时按原逻辑走客户端工具；
- 当前「会话 × 模型」没有被标记为原生搜索失败。

启用时向 `tools` 加入 provider 工具，key 为 `web_search`（Responses 用
`openai.tools.webSearch({})`，Messages 用 `anthropic.tools.webSearch_20250305({})`）。
同时加入 `activeTools`，并从 `activeTools` 移除 `websearch`。`websearch` 仍保留在
`tools` 里，以便失败重试时恢复。

请求预估（DC-CONTEXT-001 的 preflight，`prompt.ts` 调用
`materializeWireToolDescriptors` 处）必须调用同一函数，保证预估与发送的工具成员一致。

### 失败识别与运行期兜底

状态按「会话 × 模型」（provider、model、api id）存在进程内存，分两类：

- `search`：原生搜索不可用。之后的请求不注入原生工具，恢复 `websearch`，历史搜索按
  文本回放。
- `replay`：只是回放被拒。原生搜索继续使用，历史搜索按文本回放。

失败类别（均来自实测）：

| 现象 | 识别 | 标记 | 处理 |
| --- | --- | --- | --- |
| 请求因工具被拒（4xx 且报错提到 `web_search` / 工具类型 / server tool） | 产出前错误 | `search` | `LLM.stream` 立即单次重试，仿照 prefill 拒绝的处理 |
| 回放被拒（报错提到 `encrypted_content` 或 `search_result`） | 产出前错误 | `replay` | 同上，单次重试 |
| 原生请求长时间无响应（产出前超时） | 产出前错误，且本次启用了原生 | `search` | 同上，单次重试 |
| 流解析失败（SDK 类型校验报错，内容涉及服务端工具块） | 流内错误 | `search` | 交给 processor 现有重试；下次尝试自动无原生 |
| 原生搜索结果报错（`web_search_tool_result_error`、`web_search_call` failed、服务端工具的 `tool-error`） | 流内事件 | `search` | 本步不重试，后续步骤恢复 `websearch` |

- 401/402/429、配额、鉴权类错误不算搜索失败。
- 单次重试与现有重试预算分开计；单次重试仍失败时，错误按原有梯级处理。
- 单次重试放在 `stream` 重试梯级里 `input.retryScope` 提前返回之前（与 prefill 修复同位），
  MaxMode 候选/裁判请求也能兜底。（实现者决定）
- 挂起依赖 provider 现有的首包超时，不新增专门时限。gz4399 当前未配 `headerTimeout`，
  首包等待受 `timeout`（600000）约束；建议在开启原生搜索的 provider `options` 里配置
  `headerTimeout`（如 60000）。流式响应在服务端搜索开始前就会返回首个事件，60s 足够。
  （实现者决定）
- 新会话没有任何标记；进程重启后标记清空（最多再试一次原生）。
- 每次标记都写 warn 日志。主会话的单次重试通过现有 `onRetryStatus` /
  `Session.Event.RetryAttempt` 显示原因。

### 历史回放

`LLM.stream` 在消息转换（`ProviderTransform.message` 的同一 `transformParams` 处）把
provider 执行的 `web_search` tool-call / tool-result 对改写为一段 assistant 文本，
列出查询和结果（标题、URL，不含加密内容）。只有同时满足下列条件时才保留原样回放：

- 本次请求启用了原生搜索；
- 该会话 × 模型没有 `replay` / `search` 标记，配置也没有 `replay: "text"`；
- tool-result 的 output 是可回放的 JSON（跨模型时 `message-v2` 会去掉
  `providerOutput`，此时 output 为文本，必须降级）。

Responses 路由在 `store:false` 下本就由 SDK 丢弃搜索项，降级只会补上文本。

### 第二、三层：客户端 `websearch`

执行顺序：

1. 会话 provider 自带的独立搜索：`xiaomi` 时走现有 Xiaomi 搜索请求（保持原行为）；
2. `fallback` 列表：通过 `Provider` 服务取该模型，用 `generateText` 发一次带
   `openai.tools.webSearch({})` 的请求。providerOptions 与主链路相同（含
   `store:false`），并合并模型 options 和条目 variant。输出为回答文本加来源列表，
   来源只取搜索真实返回的项（`url_citation` 注解与 `web_search_call` sources），不采用
   模型自己写出的 URL。没有搜索调用或没有来源时视为失败，换下一条；
3. Exa（现有逻辑）。

任一层成功即返回；全部失败返回现有的 `WEBFETCH_FALLBACK` 提示。工具标题与
`metadata` 记录实际服务的层，如 `gz4399-codex/gpt-6-luna`。

### 工具暴露

`registry.ts` 在现有条件之外增加：配置了任何 `websearch.native` 开启项或非空
`fallback` 时暴露 `websearch`。Codex harness 中 `websearch` 本就只能经 `exec` 调用，
原生开启时它仍留在 `exec` 目录里；原生 `web_search` 作为顶层 provider 工具出现。

### 显示

- processor 对 provider 执行的 `web_search` 结果：显示用 `output` 改为可读列表（查询 +
  标题 — URL），`providerOutput` 保留原始结构供回放。不再显示约 21KB 的加密内容 JSON。
- TUI 为 `web_search` 增加一行渲染，如 `Native Web Search "query" (N results)`。

## 测试与验证

- 单元：配置解析（provider / provider/model 优先级、false、replay、非法条目）；失败分类
  （以上每一类，以及 401/429 不算）；回放降级（同模型、跨模型、标记、配置）；注入条件
  （ephemeral、small、权限 ask/deny、无 websearch、标记后）。
- 集成：本地 HTTP 服务模拟 Responses 与 Messages 网关（不用 mock），覆盖：成功原生搜索
  的两步回合；400 拒绝工具后单次重试成功；回放 400 后降级成功；非标准 `tool_result`
  流在同一用户回合内经重试完成；挂起超时后兜底；fallback 链（Codex 失败 → Exa）。
  每个新集成测试做变异校验：撤掉对应改动，确认它在断言处失败。
- 现有：`websearch`、`registry*`、`llm*`、`message-v2*`、`retry`、`processor-effect`、
  `transform` 测试保持通过（基线 `retry.test.ts` 的 "eight HTTP timeouts" 本机超时，
  CI 在 `9b974725` 通过，属既有）。
- 端到端：`mimo run` 分别在 gz4399-codex、gz4399-grok、gz4399-claude（fable 与 opus）、
  gz4399-kimi、gz4399-glm 上跑一个需要搜索且有后续步骤的任务，确认原生或兜底路径符合
  上表。
- `bun run typecheck`、lint；SDK 重新生成后只多出 `websearch` 配置类型。

## 注册与同步

- 新增 DC-WEBSEARCH-001（`docs/dev-compat-overrides.md`），与行为同一提交，列出源文件、
  测试面和与 main 的差异。
- 观察面：`src/session/llm.ts`（`run`、`attempt`、`stream` 重试梯级、
  `transformParams`）、`src/session/processor.ts`（provider 工具结果显示）、
  `src/session/prompt.ts`（preflight 调用点）、`src/tool/websearch/`、
  `src/tool/registry.ts`、`src/config/config.ts`、TUI 渲染、SDK 生成类型。

## 留给实现者

- 失败分类的具体匹配写法，以单元测试固定。
- 文本回放的确切格式（需包含查询、标题、URL，且不含加密内容）。
- 状态的容量上限或清理时机（进程内、有界即可）。
- Codex 独立搜索的提示词（参考 senpi `searchOnlyPrompt`，但要返回回答 + 来源）。
