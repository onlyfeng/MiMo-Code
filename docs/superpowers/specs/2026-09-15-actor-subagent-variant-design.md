# Actor 子代理 variant 选择设计

目标分支：`dev/compat`，起点 `3ff9794a0b5a2568e819b4876f2448f9d666dc15`。
归属：新增 compat owner DC-ACTOR-002，不修改 main 拥有的 FD/FC 注册表。

## 背景

`actor run|spawn` 目前只能用 `model` 选择子代理模型（分组名或
`provider/model`）。子会话请求的 variant 只来自
`SessionPrompt.createUserMessage` 的 agent 兜底：agent 同时配置了 `model` 和
`variant`，解析出的请求模型与 agent 模型相同，且该模型定义了这个 variant
时才生效。父会话当前的 variant 不会继承。

因此主代理无法按任务难度给子代理指定推理档位（如 `high`、`max`），只能为每种
「模型 + variant」组合预先配置专用 agent。

## 目标

1. 主代理可以在 `run`/`spawn` 上显式指定 variant；JSON、shell、无脚本参数恢复
   三个入口行为一致。
2. 不传 variant 时，模型选择、variant 结果、SpawnInput、prompt 输入和工具元数据
   与现状一致。
3. 大模型能发现合法取值，出错时能自我纠正，并理解优先级与生命周期。

## 非目标

- 默认继承父会话 variant：会改变默认行为，而且父 variant 往往不存在于子模型。
- 把 variant 编码进 `model` 字符串。
- workflow `agent()` 选项、session 工具创建的 peer、`resume` 覆盖。
- 修改 agent 配置 variant 的兜底规则，包括已有的分组 ref 差异：actor 按父
  provider 优先解析分组，prompt 侧比较 agent 模型时不带 provider 上下文。
- 修改 main、upstream、SDK 或 OpenAPI。

## 方案比较

- **A. 独立可选参数 `variant`（采用）。** 语义单一，校验点明确，与
  `SessionPrompt.prompt` 已有的 `variant` 输入一一对应。
- **B. `model: "provider/model#high"`。** `parseModel` 只按 `/` 切分，模型 ID
  可以包含 `:`、`@` 等字符，分组名也要另行解析；这会改变既有 `model` 语义。
- **C. 默认继承父 variant。** 破坏兼容，跨模型时经常无效。
- **D. 非法值静默忽略（类似 `task_id` 降级）。** `task_id` 失效是无害的，
  variant 失效却会以不同的成本和质量静默运行，违背调用意图。启动前失败的代价
  低，而且模型可以自行纠正。

## 行为

### 入口

- JSON：`run`/`spawn` 的 strict schema 增加 `variant`（非空字符串，可选）。
  其他动作继续由 strict schema 拒绝该字段。
- Shell：`--variant <name>` 与 `--variant=<name>`，只用于 run/spawn。缺值时报
  `--variant requires a value`；arity 提示包含 `[--variant <name>]`。
- 无脚本恢复：`recoverActorArgs` 保留显式给出的 `variant`，无论它在平铺字段中，
  还是在 `operation` 信封（对象或 JSON 字符串）旁的根级；格式错误的值也保留，交给
  strict schema 拒绝。根级与信封内取值不同时，两份都留在外层，由 strict schema
  拒绝，不会静默选用其中一个。

### 解析与校验

校验在 `actor.ts` 中进行，位于准入之前：

1. 按现有规则解析子模型：`op.model ?? agent.modelRef` 交给
   `resolveModelRef(ref, 父 providerID)`；否则用 agent 的字面 `model`；否则用
   父消息的模型。
2. 提供 `variant` 时，读取该模型的 `variants` 自有键。分组或字面 ref 的解析结果
   本身就是完整模型，其余情况用 `provider.getModel`。这些键已经合并了配置并去掉
   了 `disabled` 项。不在其中就返回 `RecoverableError`：
   - 模型有 variants：`Model "p/m" has no variant "x". Valid variants: a, b. ...`
   - 模型没有 variants：`Model "p/m" defines no variants, so variant "x" cannot apply. ...`
3. 失败发生在注册 actor、捕获 fork 上下文和启动子会话 turn 之前。
4. 不提供 `variant` 时不做额外的 provider 查询，SpawnInput 也不含 `variant` 键。

使用自有键判断，避免 `constructor` 这类原型属性被当成合法 variant。

### 传递

- 链路：`SpawnInput.variant` → `forkWork` → `runAgentLoop` →
  `SessionPrompt.prompt({ variant })`。
- 同一次 spawn 驱动的所有 turn 都会带上它：初始 turn、preStop 重入、completion
  gate 重入、postStop 重入。这些调用都展开同一个 `input`。
- `prompt.ts` 的既有优先级为：显式 `input.variant` > agent 兜底 > 无。该值持久化
  在子 user 消息的 `model.variant` 上，`llm.ts` 据此合并 variant 选项，assistant
  消息记录 `variant`。
- `send` 唤醒时，drain seed 从该 actor 切片中已持久化的 user 消息复制 `model`
  （包含 variant），所以后续 turn 保持同一 variant。`resume` 不接受 variant，
  它重试原来的 user 消息。
- 工具元数据只在显式指定时增加 `variant`。
- TUI：DC-TUI-001 的子代理 footer 读取持久化元数据，不需要改动。

### 发现

`actor models` 的每一行在模型有 variants 时追加 ` [variants: a, b]`，顺序与
模型定义一致；结尾提示同时说明 `--variant`。

### 面向模型的说明

- schema 的 `variant` 描述包括：用途、合法取值来源（`actor models`）、非法值在
  启动前失败并列出合法值、省略时的默认值、不继承父 variant、在 actor 生命周期内
  固定。
- `actor.txt` 新增 “Choosing a model and variant” 小节和 JSON 示例，`resume`
  说明补充“不接受 variant”。
- `actor.shell.txt` 在 run/spawn 语法、示例、flags 汇总、models 说明和 resume
  说明中加入 `--variant`。

## 兼容性

- 不带 variant 的旧调用：schema 结果、shell 解析结果、SpawnInput、prompt 输入、
  工具元数据、模型与 variant 选择均不变。可见变化只有描述文本，以及 `actor models`
  对有 variants 的模型追加标注。
- 新字段对 strict schema 是纯加法，不影响 resume、status、wait、cancel、send。
- mimo 使用的扁平化 schema 只多一个可选属性。

## 测试

- Shell 解析：run 的空格形式、spawn 的等号形式、缺值报错。
- 参数恢复：平铺的 `variant` 被保留，垃圾字段被丢弃。
- Schema：run/spawn 接受 variant，拒绝空串；resume 带 variant 被拒绝。
- 执行（mock spawn + 真实 Provider 配置）：
  - 合法值进入 SpawnInput 和元数据，并按覆盖后的 `model` 校验；
  - 未知值和无 variants 的模型都在 spawn 前失败并给出可纠正的信息；
  - 省略时 SpawnInput 没有 `variant` 键。
- `actor models`：有 variants 的模型行带标注，没有 variants 的不带。
- 集成（真实 prompt 循环 + 测试 LLM 服务器）：子 user 消息持久化 `model.variant`，
  请求体带上 variant 选项。对该断言做变异检查：去掉 `runAgentLoop` 的传递后必须
  因断言失败，而不是超时。
- Drain seed：actor 切片中带 variant 的 user 消息被 `resolveDrainSeed` 原样复制。
- 默认路径验证时清除 `MIMOCODE_EXPERIMENTAL*` 和 `MIMOCODE_CODEX_MODE`，并报告
  preload 基线。

## 注册表

在 `docs/dev-compat-overrides.md` 中新增 DC-ACTOR-002，与行为放在同一个提交：
sync index 行、完整条目，以及在当前记录中说明新增了第八个 owner。
`docs/fork-capabilities.md` 由 main 拥有，compat 不修改。
