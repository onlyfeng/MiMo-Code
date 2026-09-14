# 模型 API（Capability API）

每个 MiMoCode 服务都会在 `/v1` 上提供 OpenAI 兼容的模型列表与聊天接口，路由随
`InstanceRoutes` 一起挂载，始终存在。访问**始终**需要一枚已签发的作用域令牌：
该校验由路由自身完成，与服务器的 Basic 认证无关，即使未设置
`MIMOCODE_SERVER_PASSWORD` 也不会放行。

完整的接口说明、请求形态与客户端示例见随内置技能分发的
`mimocode-docs/reference/capability-api.md`。本文只记录 fork 与 upstream 的差别。

## 与 upstream 的差别

行为与 upstream 完全一致,仅保留两项本 PR 之前就存在的 fork 边界:

- 非 loopback 绑定守卫读取 `MIMOCODE_SERVER_OPERATOR_PASSWORD`,因此 worker
  自生成的凭据无法满足它。
- `Server.listen` 接受 `advertiseDirectory`。upstream 以 `process.cwd()` 作通告键
  (它假设进程已 chdir 进项目);fork 的 TUI worker 服务的是启动时选定的目录,
  未必等于 cwd,通告落错桶会让 `mimo llm-server issue` 找不到它。

`--llm-server` 仍然只控制是否通告,不控制路由是否存在——路由始终挂载,且始终要求
已签发的令牌。

upstream 在这条路径上的若干已知行为(无界请求体、无并发上限与超时、provider 异常
原文透出、远程图片 URL 未校验即交给 SDK 等)按上游原样保留,理由与取舍记录在
[upstream-deviations.md](upstream-deviations.md) 的 FD-004。

## 令牌

```sh
mimo llm-server issue --model provider/model --ttl 1d --json
mimo llm-server list
mimo llm-server revoke <id>
```

- 令牌按目录绑定：为 A 目录签发的令牌在 B 目录无效。
- 存储只保存哈希，不保存令牌本身。
- `ttl` 为从最后一次使用起算的滑动有效期，`maxAge` 为自签发起的绝对上限；两者都
  可写 `none`。默认值可在 `mimocode.json` 的 `llmServer` 中配置。
- **空的 `models` 列表表示「全部已配置模型」**（upstream 的设计）。需要限定范围时
  必须显式传 `--model`。

## 2026-09-14 变更

fork 原有的并行实现（`server/model-api.ts` 与 `src/llm-server/` 下的六个模块）已退役，
改用 upstream 的 capability 路由。**此前签发的令牌全部失效**：fork 写入的是
`version: 2` 记录，而 upstream 按 `version: 1` 读取，遇到未知版本视为空存储。
令牌本身是短期凭据（默认 1 天滑动有效期），重新 `issue` 即可。

背景与完整取舍见 [upstream-deviations.md](upstream-deviations.md) 的 FD-004。
