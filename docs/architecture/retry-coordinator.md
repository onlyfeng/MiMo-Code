# Retry Coordinator

Retry 必须区分两个问题：错误是否可能恢复，以及当前 scope 还允许多少次尝试。transport retry 不做语义修复，只在预算内重建同一次请求。

## 目标

Retry 必须区分两个问题：错误是否可能恢复，以及当前 scope 是否应该继续等待。事实归一化、终态判断、预算选择和 UI 通知必须分离。

- 用户取消、鉴权、额度、上下文溢出和确定性请求错误立即停止。
- 网络连接失败、服务端故障和限流默认持续等待恢复，适合 long-running harness。
- 普通 stream 错误默认使用有限预算；network、server 和 rateLimit 分别使用自己的预算。
- 已执行 tool side effect 后禁止自动重放整个 model step。
- 所有 retry scope 使用同一个分类器、退避算法、Retry-After 解析器和事件模型。
- 次数、deadline、退避和 persistent 模式可以配置，provider 可以覆盖全局默认值。

请求、candidate 和 judge 优先使用对应 scope 的预算；其余按错误类型选择。network、server 和 rateLimit 的 live-step 默认均为 persistent 且无 deadline；request、stream、unknown、maxCandidate 和 maxJudge 保留有限预算。顶层 jitter 与 bounded 模式的默认次数保持 FC-013。

## 配置

全局配置提供默认预算，provider.<id>.retry 对同名字段做覆盖。顶层 jitterRatio 是各预算的默认值，同层的预算级 jitterRatio 优先，provider 层再覆盖 global 层。maxRetries 是初始 attempt 之外的重试次数，schema 硬上限为 100；deadlineMs 必须是正整数，且不能与 noDeadline: true 同时出现。覆盖已有 wall-clock deadline 为无限时使用 noDeadline: true；该选项不会取消 bounded budget 的 maxRetries 限制。persistent 模式忽略 maxRetries，maxElapsedMs=0 表示无 deadline。

用户级配置通常放在 `~/.config/mimocode/mimocode.jsonc`；设置 `XDG_CONFIG_HOME` 时使用其下的 `mimocode/mimocode.jsonc`，设置 `MIMOCODE_HOME` 时使用 `$MIMOCODE_HOME/config/mimocode.jsonc`。项目配置仍可覆盖用户配置。普通对话等待服务端或限流恢复已是内置默认行为，无需添加配置；以下只是可选的显式配置：

```json
{
  "retry": {
    "server": { "mode": "persistent", "noDeadline": true },
    "rateLimit": { "mode": "persistent", "noDeadline": true }
  }
}
```

上例保留其他预算；也可将相同的 `retry` 对象放在某个 provider 的配置内。`mode: "persistent"` 只控制次数上限，不清除其他配置层设置的 deadline；没有 deadline 覆盖时，server/rateLimit 默认不再继承 15 分钟限制。

若要恢复原先有限次数和 15 分钟窗口，使用以下替代配置，并移除同一预算的 `noDeadline: true`：

```json
{
  "retry": {
    "server": { "mode": "bounded", "deadlineMs": 900000 },
    "rateLimit": { "mode": "bounded", "deadlineMs": 900000 }
  }
}
```

切换为 bounded 且省略 maxRetries 时，network/server/rateLimit 分别使用 5/8/5 次。仅设置 `mode: "bounded"` 会恢复次数限制，仍无默认 deadline；需要 15 分钟窗口必须显式设置 `deadlineMs: 900000`。

server/rateLimit 保留已有次数配置的兼容性：全局和 provider 均未显式设置该预算的 mode，但任一层设置了 maxRetries 时，按 bounded 处理，因此 `maxRetries: 0` 仍关闭重试。两层都未设置 mode 或 maxRetries 时才使用新的 persistent 默认值。任一层显式设置 mode 时，按 provider 覆盖全局的原优先级选择；显式 persistent 仍忽略 maxRetries。这项兼容规则不改变 network 的既有语义。

若希望将 server/rateLimit 的重试窗口限制为一小时，使用下面的替代配置，并移除同一预算的 `noDeadline: true`：

```json
{
  "retry": {
    "server": { "mode": "persistent", "deadlineMs": 3600000 },
    "rateLimit": { "mode": "persistent", "deadlineMs": 3600000 }
  }
}
```

request 应保留有限预算：普通对话的内层 request 重试耗尽（默认 4 次、30 秒）后，会将原错误交给 processor 外层 live-step，后者按 network/server/rateLimit 等类别继续等待；30 秒不是整个会话的总停止线。MaxMode candidate/judge 也共用这个内层 request，再在外层应用各自预算（默认 3 次、3 分钟）。将 request 设为无限重试会使外层长期收不到失败，从而无法执行 candidate/judge 的停止策略。`deadlineMs` 从首次失败后的重试调度开始计时，仅限制后续重试，不会强制中断正在进行的单次请求。

Persistent 仍保留用户取消、进程退出及工具副作用边界；鉴权、额度和其他终态错误不会因配置而变得可重试。provider 的 request/header/chunk timeout 仍约束单次请求，不应为长等待而一并关闭；默认 chunkTimeout 为 8 分钟，可通过 `provider.<id>.options.chunkTimeout` 调整。main processor 还有精确的 GPT overload 特例：错误 body 同时匹配 `type: "error"`、`error.type: "service_unavailable_error"` 和 `error.code: "server_is_overloaded"` 时，silent retry 最多 3 次，persistent 配置不会取消此上限；普通 HTTP 503 不等同于该特例。

## 退避

无服务端 retry hint 时使用 min(maxDelay, initialDelay \* 2^(attempt - 1))，再乘以 budget jitter。request/stream/server 等普通 budget 默认使用 10% jitter，network budget 默认不使用 jitter。Retry-After header 优先于指数退避；自然语言 retry hint 使用严格格式解析并设置独立上限，防止错误文本把 session 挂起数天。

## 副作用边界

普通 live-step 在收到 tool-call 后将 replaySafe 设为 false。之后即使 stream error 属于 network/server，也只能保存当前工具状态并终止本次 step，不能重放整个请求。max candidate/judge 不执行工具，可以独立重建内存 accumulator。

## 可观测性

每次实际 retry 可发布 `Session.Event.RetryAttempt`，包含 phase、scope、kind、attempt、phaseAttempt、maxAttempts、nextDelayMs 和 reason。

- **processor stream 阶段**（`isMain`）：`status.setRetry` 同时维护 session 级 `retryAttempts` 计数并写入 `session.status{type:"retry"}` 的 `attempt`——该计数跨 request/stream 在 **processor 可见 status** 上连续，session 回到 idle 时清零。
- **llm request 阶段**：仅 durable main 且非 quietRetryDiagnostics 时发 `RetryAttempt` 作诊断，**不**写 session.status；其 `attempt`/`phaseAttempt` 是 **phase 局部序号**（每个 processor 外层周期从 1 起），不是 session 全局连续序号。

maxAttempts 为 0 表示 persistent retry。terminal UI notice 使用独立的 session status notice，不伪装成 retry attempt。Persistent retry 不重复创建 transcript message；UI 只更新当前状态。成功、终止、取消都必须清理 retry 状态并回到 idle。

`session.status{type:"retry"}` 是 **session 维度** 的展示状态，不是 per-model-call 计数。

**发布归属**：`session.status{retry}` 只由 **processor stream 阶段**（`isMain`）通过 `status.setRetry` 发布，对应用户可见等待。`llm.ts` **request 阶段** 退避只发布 `Session.Event.RetryAttempt`（诊断），**不再**写 session.status——否则每个 processor 外层周期会重置 200ms×4 的 request 阶梯，在上游不可达时实测约 32s 内叠满 ~20 条 UI「正在重新连接」帧（`Cannot connect to API` 时 stream 侧按 ~2s 起步的 server/stream 阶梯，多轮 `4 request + 1 stream` 打包），观感上完全不像指数退避。

**request 阶段对 TUI 更安静**：在 request 微退避期间没有 `session.status{retry}`，界面保持 busy，直到 processor stream 重试才出现重连/倒计时。这是 ownership 契约的刻意取舍（用户可见等待 = stream 阶梯），不是回归。

max-mode propose-only ensemble（candidates/judge）共用 sessionID 并行跑 `llm.stream`：request 阶段已不写 session.status；ensemble 传 `quietRetryDiagnostics: true` 以抑制 N 路 request `RetryAttempt` 总线噪音。**不要**为此设置 `ephemeral`（还会跳过 plugin trigger、session-affinity 头、OTel functionId、system 组装）。ensemble 内部退避走 max-candidate / max-judge budget + `onRetry`。

## 兼容性

语义 retry（structured output、invalid output、text tool call、length recovery）不是 transport retry，不进入本 coordinator；它们有自己的 prompt-level bounded loop。LoadAPIKeyError 仍由 MessageV2.fromError() 识别，外部消费者只检查归一化后的 provider auth error 或 401/403 APIError。
