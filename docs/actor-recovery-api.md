# 外部 API 恢复已注册 actor

`GET /session/{sessionID}/recovery` 和 `POST /session/{sessionID}/turn/{assistantMessageID}/resume` 支持可选 query 参数 `agentID`。省略或设为 `main` 时，仍使用原有主会话恢复流程；TUI 的默认恢复行为不变。

## 可恢复的 actor

非 `main` 目标必须是当前服务进程已经注册、生命周期为 `persistent`、上下文为 `full` 的 actor，并且仍持有原运行代的冻结上下文。API 不会凭数据库记录重建 actor，也不会在服务重启、原接收实例释放、actor 取消或上下文退休后重新获得恢复资格。模型或 harness 身份与捕获时不一致时拒绝恢复。

`sessionID` 表示控制会话，`directory` 表示该控制会话所属目录：

- 同会话已注册 actor：`agentID` 使用其注册 ID，允许由该会话中另一个已注册管理者创建的目标；不再限于直属 `main`。
- 子会话 peer：可从直接父会话寻址，也可使用 peer 自己的会话 ID 和注册 ID。请求的 `directory` 必须属于所寻址的会话；peer 继续在原接收实例、独立目录或工作树中执行。

陌生会话不能借用其他 peer 的冻结上下文。服务沿用已有 HTTP 认证和目录访问规则；`agentID` 是目标选择参数。普通 subagent 工具调用者仍不能获得恢复操作权限。
完整上下文的持久 actor 可通过 `actor spawn` 的显式 `--lifecycle persistent --context full` 创建。普通 spawn 的默认生命周期不变；API 不会将已有短生命周期或无完整上下文的 actor 自动升级。

## 请求与结果

先列出目标当前可恢复的 assistant，再把返回的确切 ID 用于恢复：

```http
GET /session/ses_parent/recovery?directory=%2Fpath%2Fproject&agentID=explore-1
```

```json
[
  {
    "assistantMessageID": "msg_interrupted",
    "parentMessageID": "msg_original_user",
    "created": 1780000000000
  }
]
```

```http
POST /session/ses_parent/turn/msg_interrupted/resume?directory=%2Fpath%2Fproject&agentID=explore-1
```

POST 不需要请求体。恢复继续使用原持久化用户消息，不创建替代用户任务。POST 和 `actor resume --task T1` 接受可选 `task_id`；SDK/OpenAPI 使用相同参数。GET 始终只读，不接受 `task_id`。

| 持久化用户消息 | POST `task_id` | 处理 |
| --- | --- | --- |
| 任意 | 省略 | 沿用原值；缺失时仍不绑定。 |
| 已绑定 T1 | T1 | 校验一致后恢复，不重写用户消息或任务状态。历史已归档或没有任务表记录不额外阻止此路径。 |
| 已绑定 T1 | T2 | `409`，拒绝覆盖。 |
| 未绑定 | 合法 T1 | 仅在可信任务所属会话内查找；任务必须为 open/in_progress，且未被其他 actor 持有。通过后补绑定原用户消息并声明该 actor 为 owner。 |
| 未绑定 | 不存在或无法证明来源的任务 | `404`，不跨会话搜索同名任务。 |

主会话的任务属于自身会话；peer 的任务来源是实际创建它的父会话，subagent 沿用实际 spawn 的任务所属会话。客户端不能覆盖此内部来源。补绑定、发生实际 claim 状态变化时的任务 started 事件与旧 assistant 结算在一个事务中提交，失败全部回滚；blocked、done、abandoned 或其他 owner 的新绑定返回 `409`。`titleLocale` 仍可传入，但仅对 `main` 的标题处理有效，非 main 恢复忽略该参数。

| 结果                 | 含义                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| GET `200` + 候选数组 | 当前目标存在可恢复的未完成 assistant；不保证之后 POST 仍能准入。                              |
| GET `200` + `[]`     | 合法目标正在运行，或当前没有未完成候选。                                                      |
| POST `202`           | 已完成原子准入、资格/候选/任务复核、可选补绑定和旧 assistant 结算，原 actor 生命周期已接管后续执行。           |
| POST `409`           | 已有运行占用、绑定冲突或任务不允许声明；并发恢复只允许一个请求准入。                                            |
| `404`                | 目标不可寻址、资格失效、模型身份变化、候选变化或补绑定的任务不存在。 |
| `400`                | 参数验证失败（任务 ID 格式为 Tn 或 Tn.m），或 GET 传入 task_id。                                                    |

`202` 不代表任务完成。后续成功或失败沿 actor 既有状态和终态通知流程报告；HTTP 路由不会为 actor 另加主会话失败上报。底层 processor 的既有错误事件仍使用该 actor 的 sessionID，同会话 subagent 与主会话共享此 ID。通过 actor 状态和父会话通知观察结果；持久 actor 成功后回到 idle，原 `actor wait` 的成功空闲语义不变。

## JavaScript SDK

使用重新生成的 v2 SDK；恢复参数均在 query 中发送。

```ts
import { createOpencodeClient } from "@mimo-ai/sdk/v2"

const client = createOpencodeClient({
  baseUrl: "http://127.0.0.1:4096",
  directory: "/path/project",
})
const target = { sessionID: "ses_parent", agentID: "explore-1" }
const result = await client.session.recovery(target)
const candidate = result.data?.[0]
if (candidate) {
  const accepted = await client.session.resume({
    ...target,
    assistantMessageID: candidate.assistantMessageID,
    // task_id: "T1", // 可选：校验原绑定，或在验证任务后补齐缺失绑定。
  })
  // 检查 accepted.response.status；列表与恢复之间资格可能已改变。
}
```

## 取消与来源边界

main 与非 main 恢复均检查 HTTP 请求的取消信号。事务提交前的请求取消会撤回尚未接管的恢复，不能补绑定任务或提前结算旧 assistant。事务提交后，运行器（main）或 Actor 生命周期已接管执行，即使调用方尚未收到 `202`；此时调用方断开不会释放正在执行的运行代。停止执行仍由 actor 原有取消、接收实例释放和生命周期收尾机制负责。API 没有增加独立的通用后台恢复入口。

main 与非 main 恢复都固定到已提交的原用户消息，只有本运行器成功提交的续行可推进该来源。恢复期间 inbox 消息等待本轮结束；成功或失败收尾后会通过现有生命周期自动唤醒仍然排队的消息，即使原唤醒任务已经消失。唤醒跟踪当时的队尾，超过每批 100 条且前批失败时也继续处理剩余消息。取消或实例释放不会重新唤醒已停止的运行。不能替换正在恢复的持久任务。运行器自己成功提交的压缩或续行消息可沿既有收据继续执行，外部新用户消息不能仅凭 `source: hook` 获得恢复来源权限。冻结模型身份、工具和权限边界仍在恢复步骤中执行原有校验。
