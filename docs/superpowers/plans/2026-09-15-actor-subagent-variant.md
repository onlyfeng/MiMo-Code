# Actor 子代理 variant 选择 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让主代理在 `actor run|spawn` 上显式、安全地为子代理指定模型 variant。

**Architecture:** actor 工具在准入前按解析出的子模型校验 `variant`，再通过
`SpawnInput.variant` 传给同一次 spawn 驱动的每个 `SessionPrompt.prompt` turn。
`actor models` 暴露合法取值，工具描述教大模型正确使用，DC-ACTOR-002 记录 compat
所有权。

**Tech Stack:** TypeScript、Effect、zod、`bun test`、测试 LLM 服务器（`test/lib/llm-server.ts`）。

**Spec:** `docs/superpowers/specs/2026-09-15-actor-subagent-variant-design.md`

## Global Constraints

- 工作区 `.worktrees/feat-example`，分支 `feat/example`，基点 `3ff9794a0b5a2568e819b4876f2448f9d666dc15`；PR 只发往 `onlyfeng/MiMo-Code` 的 `dev/compat`。
- 依赖只用 `bun ci` 安装。
- 测试在 `packages/opencode` 下运行，不在仓库根；类型检查在 `packages/opencode` 用 `bun typecheck`；lint 在仓库根用 `bun lint`（oxlint，要求 0 errors）。
- 默认路径验证的命令前缀记为 `$T`：`env -u MIMOCODE_EXPERIMENTAL -u MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL -u MIMOCODE_EXPERIMENTAL_MCP_TOOL_SEARCH -u MIMOCODE_CODEX_MODE bun test --timeout 30000`。package preload 自带 `MIMOCODE_EXPERIMENTAL_ORCHESTRATOR=true`，作为基线报告。
- 不对整个文件运行 prettier；手工匹配周边风格（无分号、双引号）。
- 文档与测试只用合成值。
- 风格：新代码不用 `any`（测试文件里沿用的既有写法除外）、优先 `const`、不用 `else`、只用一次的值内联。
- `bun test -t` 按正则匹配测试名，名字含括号时用不含元字符的子串。
- `actor.txt` 和 `actor.shell.txt` 不得出现 `checkpoint`；两个文件里 `spawn` 的词频都必须多于 `run`；`actor.txt` 的 Examples 段最多一个 run 示例；不得出现 `sub-agent`、`Background task` 等旧术语。
- 注册表条目必须与它描述的行为在同一个提交里，所以 Task 1 不单独提交。
- 变异检查：先在同一棵树上跑一个已知通过的用例；变异后的失败必须是断言失败，输出里不能有 `timed out`。

## File Structure

- `packages/opencode/src/actor/spawn.ts`：新增 `SpawnInput.variant`，经 `forkWork`、`runAgentLoop` 传入 `SessionPrompt.prompt`。
- `packages/opencode/src/tool/actor.ts`：schema、shell 解析、无脚本参数恢复、准入前校验、工具元数据、`actor models` 标注。
- `packages/opencode/src/tool/actor.txt`、`packages/opencode/src/tool/actor.shell.txt`：面向模型的使用说明。
- `docs/dev-compat-overrides.md`：DC-ACTOR-002。
- 测试：`test/actor/spawn.test.ts`（集成）、`test/inbox/drain-seed-variant.test.ts`（新建）、`test/tool/actor.shell.test.ts`、`test/tool/actor-recover.test.ts`、`test/tool/actor.test.ts`、`test/tool/actor-models.test.ts`、`test/tool/actor-variant-guidance.test.ts`（新建）。

---

### Task 1: 通过 Actor.spawn 传递显式 variant

**Files:**
- Modify: `packages/opencode/src/actor/spawn.ts`（`SpawnInput`、`runAgentLoop`、`forkWork` 输入类型，以及 peer/subagent 两处 `forkWork` 调用）
- Test: `packages/opencode/test/actor/spawn.test.ts`
- Create: `packages/opencode/test/inbox/drain-seed-variant.test.ts`

**Interfaces:**
- Produces: `SpawnInput.variant?: string`。调用方必须先校验；它会进入该 spawn 的每个 prompt turn。

- [ ] **Step 1: 写失败的集成测试**

在 `test/actor/spawn.test.ts` 的 `gptProviderCfg` 之后加入：

```ts
function variantProviderCfg(url: string) {
  const config = providerCfg(url)
  return {
    ...config,
    provider: {
      ...config.provider,
      test: {
        ...config.provider.test,
        models: {
          "test-model": {
            ...config.provider.test.models["test-model"],
            variants: { high: { reasoningEffort: "high" } },
          },
        },
      },
    },
  }
}
```

作为 `describe("Actor.spawn subagent mode", () => {` 里的第一个用例加入：

```ts
  it.live("carries an explicit variant into every child user and request", () =>
    provideTmpdirServer(
      Effect.fnUntraced(function* ({ llm }) {
        const actor = yield* Actor.Service
        const session = yield* Session.Service
        const parent = yield* session.create({ title: "Variant subagent" })

        yield* llm.text("done")
        const result = yield* actor.spawn({
          mode: "subagent",
          sessionID: parent.id,
          agentType: "general",
          task: "verify the requested variant",
          context: "none",
          tools: "INHERIT",
          background: false,
          model: ref,
          variant: "high",
        })
        yield* Deferred.await(result.outcome)

        const users = (yield* session.messages({ sessionID: parent.id, agentID: result.actorID })).flatMap((msg) =>
          msg.info.role === "user" ? [msg.info] : [],
        )
        expect(users.length).toBeGreaterThan(0)
        expect(users.map((user) => user.model.variant)).toEqual(users.map(() => "high"))

        const request = (yield* llm.hits).find((hit) => JSON.stringify(hit.body).includes("verify the requested variant"))
        expect(request?.body.reasoning_effort ?? request?.body.reasoningEffort).toBe("high")
      }),
      { git: true, config: variantProviderCfg },
    ),
    30000,
  )
```

- [ ] **Step 2: 确认它失败**

Run: `cd packages/opencode && $T test/actor/spawn.test.ts -t "carries an explicit variant"`
Expected: FAIL，断言是 `toEqual`：实际 `[undefined]`，期望 `["high"]`。

- [ ] **Step 3: 写 drain seed 刻画测试**

新建 `test/inbox/drain-seed-variant.test.ts`：

```ts
import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { ActorRegistry } from "../../src/actor/registry"
import { resolveDrainSeed } from "../../src/inbox/inbox"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Session } from "../../src/session"
import { MessageID } from "../../src/session/schema"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"

const it = testEffect(Layer.mergeAll(Session.defaultLayer, ActorRegistry.defaultLayer))

describe("inbox drain seed", () => {
  it.live("keeps the receiver's persisted variant for a woken turn", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const actors = yield* ActorRegistry.Service
        const session = yield* sessions.create({ title: "Drain seed variant" })
        yield* actors.register({
          sessionID: session.id,
          actorID: "general-1",
          mode: "subagent",
          parentActorID: "main",
          agent: "general",
          description: "Variant receiver",
          contextMode: "none",
          background: true,
          lifecycle: "ephemeral",
        })
        const model = { providerID: ProviderID.make("test"), modelID: ModelID.make("model"), variant: "high" }
        yield* sessions.updateMessage({
          id: MessageID.ascending(),
          role: "user",
          sessionID: session.id,
          agentID: "general-1",
          agent: "general",
          model,
          time: { created: Date.now() },
        })

        expect(yield* resolveDrainSeed(sessions, actors, session.id, "general-1")).toEqual({ agent: "general", model })
      }),
    ),
  )
})
```

Run: `cd packages/opencode && $T test/inbox/drain-seed-variant.test.ts`
Expected: PASS。这是在锁定既有行为：面向模型的说明依赖它（`send` 唤醒的 turn 保留 variant）。Task 2 会对它做变异检查。

- [ ] **Step 4: 实现传递**

`src/actor/spawn.ts`，`SpawnInput` 中紧接 `model?: { providerID: ProviderID; modelID: ModelID }` 之后加入：

```ts
  /**
   * Named variant of `model`, already validated by the caller against that
   * model's variants. Every prompt turn this spawn drives carries it, so it
   * outranks the agent's configured variant; omitted → that fallback applies.
   */
  variant?: string
```

`runAgentLoop` 的输入类型中，在 `model?: { providerID: ProviderID; modelID: ModelID }` 后加 `variant?: string`；它的 `sessionPrompt.prompt({...})` 调用中，在 `model: input.model,` 后加 `variant: input.variant,`。

`forkWork` 的输入类型中，在 `model?: { providerID: ProviderID; modelID: ModelID }` 后加 `variant?: string`。

`spawnPeer` 和 `spawnSubagent` 各自的 `forkWork({...})` 调用中，在 `model: input.model,` 后加 `variant: input.variant,`。

这三个 `model?:` 类型行和三个 `model: input.model,` 调用行文字相同，编辑时必须带上下文锚点。`runAgentLoop` 的三个调用点都展开 `...input`，不需要额外改动。

- [ ] **Step 5: 确认通过**

Run: `cd packages/opencode && $T test/actor/spawn.test.ts -t "carries an explicit variant" && $T test/inbox/drain-seed-variant.test.ts`
Expected: 两者 PASS。如果请求体里没有 `reasoning_effort` 或 `reasoningEffort`，先检查 `llm.ts` 与 `ProviderTransform.providerOptions` 对 openai-compatible 的映射，把断言改到实际键上。不得删除请求体断言。

- [ ] **Step 6: 暂不提交**

Run: `git status --short`
Expected: 只有 `src/actor/spawn.ts`、`test/actor/spawn.test.ts`、`test/inbox/drain-seed-variant.test.ts`。它们随 Task 2 的注册表条目一起提交。

---

### Task 2: 面向模型的 variant 选择器、发现、说明与注册表

**Files:**
- Modify: `packages/opencode/src/tool/actor.ts`
- Modify: `packages/opencode/src/tool/actor.txt`
- Modify: `packages/opencode/src/tool/actor.shell.txt`
- Modify: `docs/dev-compat-overrides.md`
- Test: `packages/opencode/test/tool/actor.shell.test.ts`
- Test: `packages/opencode/test/tool/actor-recover.test.ts`
- Test: `packages/opencode/test/tool/actor.test.ts`
- Test: `packages/opencode/test/tool/actor-models.test.ts`
- Create: `packages/opencode/test/tool/actor-variant-guidance.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `SpawnInput.variant?: string`。
- Produces: run/spawn 的 `operation.variant?: string`（JSON）、`--variant <name>`（shell），以及工具元数据中的 `variant`（仅在指定时出现）。

- [ ] **Step 1: shell 解析测试**

在 `test/tool/actor.shell.test.ts` 的 `describe("actor.shell.parse: --model flag", ...)` 之后加入：

```ts
describe("actor.shell.parse: --variant flag", () => {
  test("run with --model and --variant (space form)", async () => {
    const out = await parse('actor run explore "d" "p" --model lite --variant high')
    expect(out).toEqual([
      { operation: { action: "run", subagent_type: "explore", description: "d", prompt: "p", model: "lite", variant: "high" } },
    ])
  })

  test("spawn with --variant=<name> (equals form) and no --model", async () => {
    const out = await parse('actor spawn general "d" "p" --variant=max')
    expect(out).toEqual([
      { operation: { action: "spawn", subagent_type: "general", description: "d", prompt: "p", variant: "max" } },
    ])
  })

  test("--variant with no value fails with kind: flag", async () => {
    const exit = await Effect.runPromise(Effect.exit(parseActorScript('actor spawn general "d" "p" --variant')))
    expect(exit._tag).toBe("Failure")
    const cause: any = (exit as any).cause
    const fail = cause.reasons?.find?.((r: any) => r._tag === "Fail") ?? cause
    const err = fail.error ?? fail
    expect(err.kind).toBe("flag")
    expect(err.detail).toContain("--variant requires a value")
  })

  test("arity errors advertise --variant on run and spawn", async () => {
    for (const verb of ["run", "spawn"]) {
      const exit = await Effect.runPromise(Effect.exit(parseActorScript(`actor ${verb} general "only a description"`)))
      expect(exit._tag).toBe("Failure")
      const cause: any = (exit as any).cause
      const fail = cause.reasons?.find?.((r: any) => r._tag === "Fail") ?? cause
      const err = fail.error ?? fail
      expect(err.kind).toBe("arity")
      expect(err.detail).toContain("[--model <ref>] [--variant <name>]")
    }
  })
})
```

- [ ] **Step 2: 参数恢复测试**

在 `test/tool/actor-recover.test.ts` 的 `"optional model/task_id carried; junk dropped"` 之后加入：

```ts
  test("an explicit variant survives recovery, even malformed, for strict validation", () => {
    expect(
      recoverActorArgs({ action: "spawn", subagent_type: "general", description: "d", prompt: "p", model: "lite", variant: "high" }),
    ).toEqual({ operation: { action: "spawn", subagent_type: "general", description: "d", prompt: "p", model: "lite", variant: "high" } })
    expect(recoverActorArgs({ subagent_type: "general", description: "d", prompt: "p", variant: 3 }) as unknown).toEqual({
      operation: { action: "run", subagent_type: "general", description: "d", prompt: "p", variant: 3 },
    })
  })
```

- [ ] **Step 3: schema 与执行测试**

在 `test/tool/actor.test.ts` 的 `describe("tool.actor", ...)` 中，紧接 `"schema rejects empty strings, unknown fields, and per-action missing required fields"` 之后加入：

```ts
  it.live("schema accepts a non-empty variant on run and spawn only", () =>
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const def = yield* (yield* ActorTool).init()
        const wrap = (operation: Record<string, unknown>) => def.parameters.safeParse({ operation })
        const launch = { description: "x", prompt: "y", subagent_type: "general" }

        expect(wrap({ action: "run", ...launch, variant: "high" }).success).toBe(true)
        expect(wrap({ action: "spawn", ...launch, model: "lite", variant: "high" }).success).toBe(true)
        expect(wrap({ action: "spawn", ...launch, variant: "" }).success).toBe(false)
        expect(wrap({ action: "spawn", ...launch, variant: 3 }).success).toBe(false)
        expect(wrap({ action: "resume", actor_id: "general-1", variant: "high" }).success).toBe(false)
        expect(wrap({ action: "models", variant: "high" }).success).toBe(false)
      }),
    ),
  )
```

在 `describe("Actor tool task_id degradation", ...)` 之前加入：

```ts
const variantModels = {
  provider: {
    test: {
      name: "Test",
      id: "test",
      env: [],
      npm: "@ai-sdk/openai-compatible",
      options: { apiKey: "test-key", baseURL: "http://localhost:1/v1" },
      models: {
        "test-model": {
          id: "test-model",
          name: "Test Model",
          attachment: false,
          reasoning: false,
          temperature: false,
          tool_call: true,
          release_date: "2025-01-01",
          limit: { context: 100000, output: 10000 },
          cost: { input: 0, output: 0 },
          options: {},
        },
        reasoner: {
          id: "reasoner",
          name: "Reasoner",
          attachment: false,
          reasoning: false,
          temperature: false,
          tool_call: true,
          release_date: "2025-01-01",
          limit: { context: 100000, output: 10000 },
          cost: { input: 0, output: 0 },
          options: {},
          variants: {
            low: { reasoningEffort: "low" },
            high: { reasoningEffort: "high" },
            max: { disabled: true },
          },
        },
      },
    },
  },
}

describe("Actor tool variant selection", () => {
  const execute = (selection: { model?: string; variant?: string }) =>
    Effect.gen(function* () {
      const { chat, assistant } = yield* seed()
      const def = yield* (yield* ActorTool).init()
      return yield* def.execute(
        {
          operation: {
            action: "run",
            description: "review",
            prompt: "review the change",
            subagent_type: "general",
            ...selection,
          },
        },
        {
          sessionID: chat.id,
          messageID: assistant.id,
          agent: "build",
          abort: new AbortController().signal,
          extra: {},
          messages: [],
          metadata: () => Effect.void,
          ask: () => Effect.void,
        },
      )
    })

  it.live("forwards a variant the resolved model defines", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          const result = yield* execute({ model: "test/reasoner", variant: "high" })

          expect(spawned.map((input) => [input.model, input.variant])).toEqual([
            [{ providerID: ProviderID.make("test"), modelID: ModelID.make("reasoner") }, "high"],
          ])
          expect(result.metadata.variant).toBe("high")
        }),
      { config: variantModels },
    ),
  )

  for (const variant of ["ultra", "max"]) {
    it.live(`rejects variant ${variant} before spawning and lists the valid ones`, () =>
      provideTmpdirInstance(
        () =>
          Effect.gen(function* () {
            const spawned: SpawnInput[] = []
            yield* installMockSpawn((input) => spawned.push(input))
            const exit = yield* Effect.exit(execute({ model: "test/reasoner", variant }))

            expect(Exit.isFailure(exit)).toBe(true)
            expect(String(Exit.isFailure(exit) ? exit.cause : "")).toContain(
              `Model "test/reasoner" has no variant "${variant}". Valid variants: low, high.`,
            )
            expect(spawned).toEqual([])
          }),
        { config: variantModels },
      ),
    )
  }

  it.live("rejects a variant when the parent's model defines none", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          const exit = yield* Effect.exit(execute({ variant: "high" }))

          expect(Exit.isFailure(exit)).toBe(true)
          expect(String(Exit.isFailure(exit) ? exit.cause : "")).toContain(
            `Model "test/test-model" defines no variants, so variant "high" cannot apply.`,
          )
          expect(spawned).toEqual([])
        }),
      { config: variantModels },
    ),
  )

  it.live("omitting variant leaves the spawn input and metadata without one", () =>
    provideTmpdirInstance(
      () =>
        Effect.gen(function* () {
          const spawned: SpawnInput[] = []
          yield* installMockSpawn((input) => spawned.push(input))
          const result = yield* execute({ model: "test/reasoner" })

          expect(spawned.map((input) => Object.hasOwn(input, "variant"))).toEqual([false])
          expect(Object.hasOwn(result.metadata, "variant")).toBe(false)
        }),
      { config: variantModels },
    ),
  )
})
```

- [ ] **Step 4: models 列表测试**

`test/tool/actor-models.test.ts`：在 `textModel` 的 `ProviderTest.model({...})` 里、`capabilities` 之后加入
`variants: { low: { reasoningEffort: "low" }, high: { reasoningEffort: "high" } },`。
然后在 describe 末尾加入：

```ts
  it.live(
    "models lists each model's variants and says how to pass one",
    provideTmpdirInstance(() =>
      Effect.gen(function* () {
        const sessions = yield* Session.Service
        const chat = yield* sessions.create({ title: "chat" })
        const def = yield* (yield* ActorTool).init()

        const result = yield* def.execute({ operation: { action: "models" } }, ctxFor(chat.id))

        expect(result.output).toContain(`${textRef} [variants: low, high]`)
        expect(result.output).not.toContain(`${visionRef} (vision) [variants`)
        expect(result.output).toContain("--variant")
      }),
    ),
  )
```

- [ ] **Step 5: 面向模型说明测试**

新建 `test/tool/actor-variant-guidance.test.ts`：

```ts
import { describe, expect, test } from "bun:test"
import ACTOR_DESCRIPTION from "../../src/tool/actor.txt"
import ACTOR_SHELL_DESCRIPTION from "../../src/tool/actor.shell.txt"

describe("actor variant guidance", () => {
  test("JSON guidance shows the selector, its discovery, default, and lifetime", () => {
    expect(ACTOR_DESCRIPTION).toContain("## Choosing a model and variant")
    expect(ACTOR_DESCRIPTION).toContain('"model":"ultra","variant":"high"')
    expect(ACTOR_DESCRIPTION).toContain('{"operation":{"action":"models"}}')
    expect(ACTOR_DESCRIPTION).toContain("Your own current variant is not inherited")
    expect(ACTOR_DESCRIPTION).toContain("It accepts no new prompt, model, or variant.")
  })

  test("shell guidance advertises --variant for both launch forms and resume", () => {
    expect(ACTOR_SHELL_DESCRIPTION).toMatch(/^\s*actor spawn <subagent_type>[^\n]*\[--model <ref>\] \[--variant <name>\]/m)
    expect(ACTOR_SHELL_DESCRIPTION).toMatch(/^\s*actor run <subagent_type>[^\n]*\[--model <ref>\] \[--variant <name>\]/m)
    expect(ACTOR_SHELL_DESCRIPTION).toMatch(/^\s*actor spawn [^\n]*--variant high$/m)
    expect(ACTOR_SHELL_DESCRIPTION).toContain("No model/variant/prompt overrides.")
  })
})
```

- [ ] **Step 6: 确认新测试失败**

Run: `cd packages/opencode && $T test/tool/actor.shell.test.ts test/tool/actor-recover.test.ts test/tool/actor-models.test.ts test/tool/actor-variant-guidance.test.ts && $T test/tool/actor.test.ts -t "variant"`
Expected: 新用例 FAIL（`variant` 未被解析、schema 拒绝未知字段、models 输出无标注、说明缺失），既有用例保持 PASS。

- [ ] **Step 7: 实现入口（类型、shell、恢复、schema）**

`src/tool/actor.ts`，在 `MODEL_PARAM_DESCRIPTION` 之后加入：

```ts
const VARIANT_PARAM_DESCRIPTION =
  "(optional) Named variant of this subagent's model, usually a reasoning-effort level (e.g. low/high/max). It must be one the resolved model lists — run `actor models` to see each model's variants; an unknown name fails before the subagent starts and lists the valid ones. Omit it for the default: the agent's configured variant when the subagent uses the agent's configured model, otherwise none. Your own current variant is not inherited, and the variant stays fixed for the actor's lifetime."
```

`ActorShellArgs` 的 run 与 spawn 分支：`model?: string;` 之后加入 `variant?: string;`。

`mapActorVerb` 的 `run` 分支：

```ts
      const { flags, rest } = yield* extractNamedFlags(
        args,
        ["model", "variant", "task", "timeout", "command", "context", "output-schema"],
        line,
      )
      if (rest.length !== 3) return yield* actorArityError("run", '<subagent_type> "<description>" "<prompt>" [--model <ref>] [--variant <name>] [--task <TID>] [--timeout <ms>] [--command <cmd>] [--context none|state|full] [--output-schema <json>]', rest, line)
```

并在 `...(flags.model ? { model: flags.model } : {}),` 之后加入 `...(flags.variant ? { variant: flags.variant } : {}),`。

`spawn` 分支同理：

```ts
      const { flags, rest } = yield* extractNamedFlags(
        args,
        ["model", "variant", "task", "command", "context", "lifecycle", "output-schema"],
        line,
      )
      if (rest.length !== 3) return yield* actorArityError("spawn", '<subagent_type> "<description>" "<prompt>" [--model <ref>] [--variant <name>] [--task <TID>] [--command <cmd>] [--context none|state|full] [--lifecycle persistent] [--output-schema <json>]', rest, line)
```

也在 `...(flags.model ? { model: flags.model } : {}),` 之后加入 `...(flags.variant ? { variant: flags.variant } : {}),`。

`recoverActorArgs`：在 `if (typeof obj.model === "string") op.model = obj.model` 之后加入：

```ts
    // Like context and lifecycle, keep an explicit variant even when malformed:
    // the strict schema rejects it instead of silently using the default.
    if (Object.hasOwn(obj, "variant")) op.variant = obj.variant
```

run 与 spawn 的 zod schema：在 `model: z...describe(MODEL_PARAM_DESCRIPTION),` 之后加入：

```ts
        variant: z
          .string()
          .min(1)
          .optional()
          .describe(VARIANT_PARAM_DESCRIPTION),
```

- [ ] **Step 8: 实现校验、传递与元数据**

替换 `execute` 中的模型解析块：

```ts
        const modelRef = op.model ?? next.modelRef
        const resolved = modelRef ? yield* provider.resolveModelRef(modelRef, msg.info.providerID) : undefined
        const model = resolved
          ? { modelID: resolved.id, providerID: resolved.providerID }
          : (next.model ?? {
              modelID: msg.info.modelID,
              providerID: msg.info.providerID,
            })
        // Validate before admission so a wrong variant never starts a child at a
        // different cost or quality than the caller asked for. Own keys only: the
        // provider has already merged configured variants and removed disabled ones.
        if (op.variant) {
          const variants = Object.keys((resolved ?? (yield* provider.getModel(model.providerID, model.modelID))).variants ?? {})
          if (!variants.includes(op.variant))
            return yield* Effect.fail(
              new RecoverableError(
                variants.length > 0
                  ? `Model "${model.providerID}/${model.modelID}" has no variant "${op.variant}". Valid variants: ${variants.join(", ")}. Pass one of these, or omit variant to use the default.`
                  : `Model "${model.providerID}/${model.modelID}" defines no variants, so variant "${op.variant}" cannot apply. Omit variant, or choose a model that lists variants in \`actor models\`.`,
              ),
            )
        }
        const selection = op.variant ? { model, variant: op.variant } : { model }
```

在 `actor.spawn({...})` 调用中，把 `model,` 换成 `...selection,`（不要改动 forkContext 返回对象中的 `model,`）。三处 `metadata: { sessionId: ..., actorId: ..., model }` 中的 `model` 都换成 `...selection`。

- [ ] **Step 9: 实现 models 标注**

替换 models 分支的 `lines` 与结尾提示：

```ts
          const lines = shown.map((m) => {
            const variants = Object.keys(m.variants ?? {})
            return `${m.providerID}/${m.id}${m.capabilities.input.image ? " (vision)" : ""}${variants.length > 0 ? ` [variants: ${variants.join(", ")}]` : ""}`
          })
```

结尾提示由 `Pass any of these to actor --model.` 改为
`Pass any of these to actor --model, and optionally one of that model's listed variants to --variant.`

- [ ] **Step 10: 更新面向模型的说明**

`src/tool/actor.txt`：
- spawn 的 `optional: command, context, lifecycle="persistent" (requires context="full")` 改为 `optional: model, variant, command, context, lifecycle="persistent" (requires context="full")`。
- run 的 `optional: timeout_ms, command, context` 改为 `optional: timeout_ms, model, variant, command, context`。
- 在 `## Actor ID vs Task ID` 之前插入：

```text
## Choosing a model and variant

Both launch actions accept two optional selectors:

- `model`: a tier/group name (e.g. `lite`) or a literal `provider/model`. Omit it to use the agent's configured model, else yours.
- `variant`: a named variant of that resolved model, usually a reasoning-effort level. It must be one the model lists: call `{"operation":{"action":"models"}}` to see each model's variants. An unknown name fails before the subagent starts, and the error lists the valid ones.
- Omitting `variant` keeps the default: the agent's configured variant when the subagent uses the agent's configured model, otherwise none. Your own current variant is not inherited, so pass it explicitly when the subagent needs the same reasoning level.
- The variant stays fixed for the actor's lifetime: `send` follow-ups keep it, and `resume` cannot change it.

{"operation":{"action":"spawn","subagent_type":"general","description":"Deep review","prompt":"<full task>","model":"ultra","variant":"high"}}

```

- `It accepts no new prompt or model.` 改为 `It accepts no new prompt, model, or variant.`

`src/tool/actor.shell.txt`：
- spawn 与 run 语法行中，把 `[--model <ref>]` 替换为 `[--model <ref>] [--variant <name>]`。
- `No model/prompt overrides.` 改为 `No model/variant/prompt overrides.`
- `# list available models (optionally vision-only) to pick a --model value:` 改为 `# list available models with their variants (optionally vision-only) to pick --model/--variant values:`
- 在 `actor spawn explore "Quick scan" "find catch blocks" --model lite` 之后插入：

```text

# pick a variant the resolved model lists in `actor models` (e.g. a reasoning level). It is not inherited
# from you, an unknown name fails before the subagent starts, and it stays fixed for the actor's lifetime:
    actor spawn general "Deep review" "review the auth flow end to end" --model ultra --variant high
```

- flags 汇总中，把 `#   triggered this; --context none|state|full` 改为两行：
  `#   triggered this; --variant one of the resolved model's variants from \`actor models\`;` 与 `#   --context none|state|full`。
- `models — discover which models you can pass to --model (use --vision ...)` 改为 `models — discover which models, and each model's variants, you can pass to --model/--variant (use --vision ...)`（括号内原文保留）。

- [ ] **Step 11: 确认通过（含措辞约束套件）**

Run: `cd packages/opencode && $T test/tool/actor.shell.test.ts test/tool/actor-recover.test.ts test/tool/actor-models.test.ts test/tool/actor-variant-guidance.test.ts test/tool/actor.test.ts test/tool/actor-prompt-spawn-first.test.ts test/tool/checkpoint-tool-description.test.ts test/actor/terminology.test.ts test/tool/registry-invocation-style.test.ts test/actor/spawn.test.ts test/inbox/drain-seed-variant.test.ts`
Expected: 全部 PASS。

- [ ] **Step 12: 变异检查**

先确认树是健康的：`$T test/actor/spawn.test.ts -t "exposes the full GPT-specific tool set"` → PASS。

1. 删掉 `runAgentLoop` 中 `sessionPrompt.prompt({...})` 里的 `variant: input.variant,` → `$T test/actor/spawn.test.ts -t "carries an explicit variant"` 必须因断言失败（无 `timed out`）→ 恢复。
2. 把 `if (!variants.includes(op.variant))` 改为 `if (false)` → `$T test/tool/actor.test.ts -t "Actor tool variant selection"` 中两个 rejects 用例必须因断言失败 → 恢复。
3. 把 `src/inbox/inbox.ts` Tier 1 的 `return { agent: info.agent, model: info.model }` 改为 `return { agent: info.agent, model: { providerID: info.model.providerID, modelID: info.model.modelID } }` → `$T test/inbox/drain-seed-variant.test.ts` 必须因断言失败 → 恢复。
4. 在 schema 中暂时删掉 run 的 `variant` 字段 → `$T test/tool/actor.test.ts -t "schema accepts a non-empty variant"` 必须失败 → 恢复。

Run: `git diff --stat -- src/inbox/inbox.ts`
Expected: 无输出（变异已全部恢复）。

- [ ] **Step 13: 注册表 DC-ACTOR-002**

在 `docs/dev-compat-overrides.md` 中：

1. 把 `- Status: active; all seven DC owners remain compat-owned.` 改为
   `- Status: active; the seven DC owners reviewed in this synchronization remain compat-owned. DC-ACTOR-002 was added afterwards, so eight owners are now active.`
2. 在 Sync index 表格中、以 `| DC-ACTOR-001    | Actor context, default-fork checkpoint` 开头的行之后，插入按表头单元格宽度补齐的行：

```bash
bun -e '
const file = "docs/dev-compat-overrides.md"
const lines = (await Bun.file(file).text()).split("\n")
const header = lines.findIndex((l) => l.startsWith("| ID ") && l.includes("Relationship to inherited"))
const anchor = lines.findIndex((l, i) => i > header && l.startsWith("| DC-ACTOR-001 "))
if (header < 0 || anchor < 0) throw new Error("sync index anchors not found")
const widths = lines[header].split("|").slice(1, -1).map((c) => c.length - 2)
const cells = ["DC-ACTOR-002", "Actor run/spawn `variant`, shell `--variant`, argument recovery, `actor models` listing, spawn-to-prompt propagation", "Model-facing extension over inherited actor model selection", "Preserve pre-admission validation, explicit precedence, non-inheritance, and actor-lifetime persistence"]
lines.splice(anchor + 1, 0, "| " + cells.map((c, i) => c.padEnd(widths[i])).join(" | ") + " |")
await Bun.write(file, lines.join("\n"))
'
```

3. 在 `## DC-TUI-001 — request provider/model/variant display` 之前插入：

```markdown
## DC-ACTOR-002 — explicit subagent model variant

- Status: active
- Canonical owner: `dev/compat` model-facing actor creation
- Base: inherited main behavior
  `0b8c5d634077f19c2d8c03179f2c869a01a18cec` lets actor `run`/`spawn` choose
  only `model`. A child request's variant then comes solely from the prompt-side
  agent fallback: the agent's configured `variant`, applied only when the request
  uses the agent's configured model and that model defines it. The caller's own
  variant is never inherited.
- Overrides: compat adds an optional `variant` selector to `run`/`spawn` across
  the strict JSON schema, shell `--variant`, no-script argument recovery, tool
  descriptions and `actor models`, starting from compat
  `3ff9794a0b5a2568e819b4876f2448f9d666dc15`.
- Delta: the tool resolves the child model exactly as before, then requires the
  variant to be an own key of that model's merged, non-disabled `variants`.
  Otherwise it fails with a recoverable error before admission (no registry row,
  fork capture or child turn), naming the valid variants or stating that the
  model defines none. A valid value travels through `SpawnInput.variant` into
  every prompt turn the spawn drives (initial, pre-stop, completion-gate and
  post-stop re-entry), outranks the agent fallback, and is persisted on each
  child user message. Woken `send` turns reuse it through the drain seed's
  persisted user model; `resume` accepts no variant and retries the original
  user. Without a variant, the spawn input, prompt input, tool metadata and
  model/variant selection are unchanged and no extra provider lookup runs. Tool
  metadata adds `variant` only when set. `actor models` appends
  `[variants: …]` to models that define variants. DC-TUI-001 renders the
  persisted value in the subagent footer without a TUI change.
- Boundaries: no parent-variant inheritance, no variant inside `model`, no
  workflow `agent()` or session-tool peer selector, and no resume override. The
  agent fallback is unchanged, including its pre-existing group-reference gap:
  actor model selection resolves a group provider-aware, while the prompt-side
  comparison resolves the agent's group without provider context, so a member on
  the caller's provider can miss the agent's configured variant.
- Source surfaces: `packages/opencode/src/tool/actor.ts`,
  `packages/opencode/src/tool/actor.txt`,
  `packages/opencode/src/tool/actor.shell.txt`, and
  `packages/opencode/src/actor/spawn.ts`.
- Test surfaces: `packages/opencode/test/tool/actor.test.ts`,
  `packages/opencode/test/tool/actor.shell.test.ts`,
  `packages/opencode/test/tool/actor-recover.test.ts`,
  `packages/opencode/test/tool/actor-models.test.ts`,
  `packages/opencode/test/tool/actor-variant-guidance.test.ts`,
  `packages/opencode/test/actor/spawn.test.ts`, and
  `packages/opencode/test/inbox/drain-seed-variant.test.ts`.
- Evidence: shell, recovery and strict-schema tests cover the entry points.
  Actor tool tests prove forwarding against an overridden model, rejection of
  unknown and disabled variants and of models without variants before any
  spawn, and an unchanged spawn input when omitted. A real prompt-loop test
  proves the persisted child variant and the request's reasoning effort, and the
  drain-seed test proves a woken turn keeps the variant. Forwarding, validation,
  schema and drain-seed assertions were each mutation-checked.
- Exit condition: retire when shared `main` exposes an equivalent validated
  per-actor variant selector for model-created actors with the same precedence,
  pre-admission validation and actor lifetime. If this capability is propagated
  to `main`, move its contract to the shared registry instead of duplicating it.
```

Run: `grep -n "DC-ACTOR-002" docs/dev-compat-overrides.md`
Expected: 状态行、Sync index 行、条目标题各至少命中一次。

- [ ] **Step 14: 提交**

```bash
set -euo pipefail
git add packages/opencode/src/actor/spawn.ts packages/opencode/src/tool/actor.ts packages/opencode/src/tool/actor.txt packages/opencode/src/tool/actor.shell.txt packages/opencode/test/actor/spawn.test.ts packages/opencode/test/inbox/drain-seed-variant.test.ts packages/opencode/test/tool/actor.shell.test.ts packages/opencode/test/tool/actor-recover.test.ts packages/opencode/test/tool/actor.test.ts packages/opencode/test/tool/actor-models.test.ts packages/opencode/test/tool/actor-variant-guidance.test.ts docs/dev-compat-overrides.md
test -z "$(git status --porcelain --untracked-files=all | grep -v '^[AM] ')" || { git status --short; echo "ABORT: unexpected changes"; exit 1; }
git commit -q -F - <<'MSG'
feat(compat): let actor subagents select a validated model variant

Add an optional `variant` to actor run/spawn (JSON schema, shell --variant,
argument recovery). The tool validates it against the resolved child model
before admission and forwards it through SpawnInput to every prompt turn the
spawn drives. `actor models` lists each model's variants and the tool
descriptions explain discovery, defaults, non-inheritance and lifetime.
Omitting variant keeps existing behavior. Registered as DC-ACTOR-002.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
git log --oneline -1
```

---

### Task 3: 全面验证

**Files:** 无新增；只有在发现问题时才修复，修复使用新提交。

- [ ] **Step 1: 类型检查**

Run: `cd packages/opencode && bun typecheck`
Expected: 0 errors。

- [ ] **Step 2: Lint**

Run: `bun lint`（仓库根）
Expected: 0 errors（已有 warnings 不计）。

- [ ] **Step 3: 默认路径回归**

Run: `cd packages/opencode && $T test/tool/actor.test.ts test/tool/actor.shell.test.ts test/tool/actor-recover.test.ts test/tool/actor-models.test.ts test/tool/actor-variant-guidance.test.ts test/tool/actor-prompt-spawn-first.test.ts test/tool/checkpoint-tool-description.test.ts test/tool/registry-invocation-style.test.ts test/tool/tool-validation-error.test.ts test/tool/actor-exec.test.ts test/tool/actor-exec-lifecycle.test.ts test/tool/actor-owned-lifecycle.test.ts test/actor/ test/inbox/`
Expected: 全部 PASS。

Run: `cd packages/opencode && $T test/session/prompt.test.ts -t "agent variant"`
Expected: PASS（prompt 侧的 agent 兜底与显式 variant 优先级未变）。

- [ ] **Step 4: diff 卫生**

Run: `git diff --stat 3ff9794a0b5a2568e819b4876f2448f9d666dc15..HEAD`
Expected: 只包含 spec、plan、Task 1/2 列出的文件，行数与改动规模相称，没有格式化噪音。

---

### Task 4: 发布 PR 到 dev/compat

- [ ] **Step 1: 推送并核对远端**

```bash
set -euo pipefail
git push -q -u origin feat/example
[ "$(git rev-parse HEAD)" = "$(git ls-remote origin refs/heads/feat/example | cut -f1)" ] || { echo "ABORT: remote != local"; exit 1; }
```

- [ ] **Step 2: 创建 PR 并核对目标仓库**

`gh pr create --repo onlyfeng/MiMo-Code --base dev/compat --head feat/example --title "feat(compat): let actor subagents select a validated model variant" --body-file <body>`。
正文包括：动机、设计要点（校验、优先级、生命周期、发现）、兼容性、非目标、验证证据（含变异检查与环境基线）、DC-ACTOR-002，结尾附 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`。

Run: `gh api repos/onlyfeng/MiMo-Code/pulls/<N> -q '.base.repo.full_name + " " + .base.ref'`
Expected: `onlyfeng/MiMo-Code dev/compat`。

- [ ] **Step 3: CI**

Run: `gh pr checks <N> -R onlyfeng/MiMo-Code --watch`
Expected: 全部通过。若只有已知的 shard 4 `onReentryWarn` 5ms 竞态失败，重跑该 job，不做二分定位；其他失败先确认是否在基点上已存在，再决定是否修复。
