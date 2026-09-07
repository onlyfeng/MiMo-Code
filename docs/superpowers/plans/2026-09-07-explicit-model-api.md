# 显式模型 API 与能力发现整合计划

本轮在 `f45bbccddb5d6d532f6ad8ff2acc2c93a625dddb` 上提取 upstream
`6203ea2e292b86e0f45d2ff2043f19bcfdcfbc85` 的两个指定能力；不推进 upstream
基线。用户已授权整合，已有音频接口继续保留。

## [S1] 可核对的行为与清单（N=2）

| ID       | 选定行为                                            | 主体与边界                                                                                                                              |
| -------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| MODEL-01 | 按 chat / speech / transcription 能力发现和选择模型 | 当前实例已配置 provider；解析后的模型能力与可服务 transport；专用模型优先；令牌只授权选定模型                                           |
| MODEL-02 | 显式模型代理及临时令牌                              | `serve --llm-server`；`llm-server issue/list/revoke`；非流式/SSE chat、受模型范围约束的已有音频；固定目录、提前鉴权、有限期限、关闭收敛 |

普通 TUI、serve、ACP、嵌入式默认不开启能力 API。新标志与 `--audio-api`
互斥，使用同一 serve socket；新令牌不代替普通 API 的 Basic auth，旧音频静态
key 不授予新代理权限。令牌按目录和模型授权，能力参数只负责选模，不限制端点。
签发不启动服务；闲置期限默认一小时，绝对期限默认一天，均可设为有限正时长。
模型代理只传递客户端 tool_calls，不执行代理工具或创建持久化聊天会话。

## [S2] 实现分工与接口

1. 令牌及 CLI：复用哈希存储与锁，严格校验持久化记录、原子写入、取消和有界锁等待；
   明文只出现在签发结果。地址按 listener ID 登记，使用无凭据身份探测，续发固定目录和模型。
2. 能力发现：从 Provider.Service.list 获取候选；与音频执行共用 transport 判定；不依据
   模型名称或非空 API key 推测能力。CLI 选择和 `/v1/models` 共用结果。
3. 协议和聊天执行：复用 upstream 协议转换，沿用 fork provider 配置和插件契约；对
   不支持的影响行为字段返回 400；图片只接收有界 data URL；异常和截断不伪报 stop。
4. HTTP 准入：认证和固定目录校验先于 body 与 bootstrap；复用音频有界 body 和可取消
   instance 等待；最多两个请求、120 秒期限；流式占位和 instance lease 保留至 EOF/cancel。
   停止先关准入、取消请求与 socket，再清理 instance；不取消其他调用者拥有的共享 bootstrap。
5. 文档：缩小 FD-004 的拒绝范围，核对全部 FD/FC 和 compat 的七个 DC；保留历史审计。

## [S3] 验证与完成条件

各实现先增加实际失败的回归，再复用实现使之通过。覆盖 token 期限/撤销/跨目录/损坏记录/
跨进程更新，能力与实际执行一致，真实本地 HTTP chat/tools/SSE/audio，鉴权先于 body 和
bootstrap，目录/通道隔离，并发、取消、停止及流截断。保留已有音频回归。

默认路径测试移除仓库要求的外部实验选择器，保留并报告 package preload；独立非测试
子进程证明默认关闭。运行 package `bun typecheck`、仓库 lint、Node 构建及真实运行、SDK
与 OpenAPI 重生成。主分支通过后传播到 dev/compat 并复验；最终报告远端精确 SHA、对应
CI、选定 upstream → main → compat 祖先关系。仅清理本轮创建且确认干净的工作区与分支。
