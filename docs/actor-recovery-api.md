# 外部 API 恢复已注册 actor

`GET /session/{sessionID}/recovery` 和 `POST /session/{sessionID}/turn/{assistantMessageID}/resume` 支持可选 query 参数 `agentID`。省略或设为 `main` 时，仍使用原有主会话恢复流程；TUI 的默认恢复行为不变。

## 可恢复的 actor

非 `main` 目标必须是当前服务进程已经注册、生命周期为 `persistent`、上下文为 `full` 的 actor，并且仍持有原运行代的冻结上下文。API 不会凭数据库记录重建 actor，也不会在服务重启、原接收实例释放、actor 取消或上下文退休后重新获得恢复资格。模型或 harness 身份与捕获时不一致时拒绝恢复。

`sessionID` 表示控制会话，`directory` 表示该控制会话所属目录：

- 同会话 subagent：`agentID` 使用该 subagent 的注册 ID，且它的直接管理者是该会话的 `main`。
- 子会话 peer：`sessionID` 使用直接父会话 ID，`agentID` 使用 peer 的注册 ID。peer 必须由该父会话的 `main` 管理。peer 可以继续在原来的独立目录或工作树实例中执行；请求仍选择父会话目录。

不能通过其他会话、其他目录实例、peer 自己的会话路径，或另一 actor 管理的目标，借用这些冻结上下文。服务沿用已有 HTTP 认证和目录访问规则；`agentID` 是目标选择参数，不是授权凭据。

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

POST 不需要请求体。恢复继续使用原持久化用户消息及其 `task_id`，不创建替代用户任务。`task_id` query 明确返回 `400`，包括对 `main` 的请求；它也不会出现在 SDK/OpenAPI 的参数中。`titleLocale` 仍可传入，但仅对 `main` 的标题处理有效，非 main 恢复忽略该参数。

| 结果                 | 含义                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| GET `200` + 候选数组 | 当前目标存在可恢复的未完成 assistant；不保证之后 POST 仍能准入。                              |
| GET `200` + `[]`     | 合法目标正在运行，或当前没有未完成候选。                                                      |
| POST `202`           | 已完成原子准入、资格/候选复核和旧 assistant 结算，原 actor 生命周期已接管后续执行。           |
| POST `409`           | 已有运行占用该 actor；并发恢复只允许一个请求准入。                                            |
| `404`                | 目标不受该控制会话管理、恢复资格已失效、模型身份变化，或指定的 assistant 不是当前可恢复候选。 |
| `400`                | 参数验证失败，或传入了不支持的 `task_id`。                                                    |

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
  })
  // 检查 accepted.response.status；列表与恢复之间资格可能已改变。
}
```

## 取消与来源边界

准入前的请求取消会撤回尚未接管的恢复，不能提前结算旧 assistant；准入后调用方断开不会释放正在执行的 actor 运行代。停止执行仍由 actor 原有取消、接收实例释放和生命周期收尾机制负责。API 没有增加独立的通用后台恢复入口。

恢复期间 inbox 消息仍由原队列规则等待本轮结束；不能替换正在恢复的持久任务。运行器自己成功提交的压缩或续行消息可沿既有收据继续执行，外部新用户消息不能仅凭 `source: hook` 获得恢复来源权限。冻结模型身份、工具和权限边界仍在恢复步骤中执行原有校验。
