# 审计复核与证据边界

[总报告](../../fork-difference-audit-2026-09-15.md)区分文档修订、实现缺口和后续建议。本目录是固定代码快照的审计附件。`coverage.json` 包含 529 条比较项、470 个不同路径；它不是运行测试的覆盖率。历史计划和实施档案只按范围及当前权威引用归档，不声称重新验证全部旧结论。

## 清单复现

从具有清单中三个固定 Git 对象的仓库根目录执行以下命令。脚本独立重建两个区间的完整路径集合，拒绝缺失/重复项，并校验每条原/目标 blob 与文件 mode。新文档提交不进入被审计的旧代码快照。

```sh
python3 - <<'PY'
import collections
import json
import subprocess
from pathlib import Path

report = json.loads(Path('docs/audits/2026-09-15-fork-differences/coverage.json').read_text())

def git(*args):
    return subprocess.check_output(['git', *args], text=True)

trees = {}
for sha in [report['snapshots'][key] for key in ['upstream', 'main', 'compat']]:
    tree = {}
    for line in git('ls-tree', '-r', sha).splitlines():
        meta, path = line.split('\t', 1)
        mode, kind, blob = meta.split()
        tree[path] = (mode, blob)
    trees[sha] = tree

for scope, source, target, expected in [
    ('main', 'upstream', 'main', 422),
    ('compat', 'main', 'compat', 107),
]:
    base, head = (report['snapshots'][key] for key in [source, target])
    paths = git('diff', '--no-renames', '--name-only', base, head).splitlines()
    rows = [row for row in report['files'] if row['scope'] == scope]
    assert len(rows) == expected
    assert collections.Counter(paths) == collections.Counter(row['path'] for row in rows)
    assert len(rows) == len({row['path'] for row in rows})
    for row in rows:
        assert (row['base'], row['target']) == (base, head)
        assert all(row.get(key) for key in ['owners', 'classification', 'summary', 'drift', 'recommendation'])
        for sha, side in [(base, 'before'), (head, 'after')]:
            assert trees[sha].get(row['path'], (None, None)) == (row[side + '_mode'], row[side + '_blob'])
    print(scope, len(rows), 'path/blob/mode checks passed')

assert len(report['files']) == 529
assert len({row['path'] for row in report['files']}) == 470
print('529 comparisons; 470 distinct paths')
PY
```

`owners` 为本轮修订后的登记归属；唯一原未登记子契约保留在 `audit_start_owners`，对应的 `documentation_resolution` 说明已补入 DC-CONTEXT-001。`drift` 保留审计起点文档状态。不能把这次归属补齐解释为源码缺口已修复。

## 本轮执行的窄探针

执行环境为 Bun 1.3.14；SQLite 投影探针使用 SQLite 3.43.2。输入为合成数据，没有真实模型请求。

| 探针               | 实际对象/结果                                                                                                                                                         | 证据限制                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Debug harness 身份 | 固定 main 的实际 resolver：同一可信 opaque alias，debug 现有参数得到 default，真实请求参数得到 codex                                                                  | 验证参数与 resolver 差异；未运行整个 debug CLI                                |
| compat 序列化      | 固定 compat 的实际 helper：Simple 的 BigInt 抛错；safeStringify 的抛错 toJSON 抛错；NoThrow 返回占位                                                                  | 不能据此推导任意 HTTP JSON 可产生 getter、BigInt 或直接崩溃                   |
| compat 工具估算    | 从固定 overflow.ts 原文提取 estimateRequestTokens，使用同 SHA 的实际 token/truncate/stringify helpers：40/80/256/1024 KiB 输入分别估算 13706/27323/27324/27323 tokens | 只证明超过 80 KiB 后估算平台化，未运行 Config/Provider 整链或测真实模型 token |
| SQLite JSON 投影   | 4000 个 NUL、双引号、ASCII 字符的 JSON 分别为 24011、8011、4011 字节，roundtrip 保真                                                                                  | 区分解码字段字节预算与序列化 JSON 字节数；不是新执行整个 history 测试集       |

输入和源码说明以对应分组报告列出的内容为限。审计临时副本、原始 diff 和链接依赖目录未作为产品文件提交；固定 SHA 与输入概要可供另行构造同类检查，仓库未提供原始探针的完整可执行复现包。临时路径不是仓库内附件承诺。

## 静态与结构化检查

- 原始 main 差异分为 runtime 130、tools 178、other 114 项；compat 全量 107 项。分组覆盖与 Git 清单逐项校验，汇总后再校验 blob/mode；独立复核保留原始发现字段和证据限制。
- 能力结果为 9 项 FD、16 项有效 FC、7 项 DC 和 1 项新 upstream 增量，合计 33 行，每项恰好一次。FC-003 已退役，只能作为历史载体归属。
- OpenAPI 解析后分别比较 routes、schema 和代码示例：compat 有 141 个 operation 示例调整；剔除示例后，新增 checkpoint-coverage route、CheckpointCoverage schema、Agent/AgentConfig.maxMode；CompactionPart 与 main 相同。main 生成产物包含上游源码已有但上游产物陈旧的刷新，不能全算作 fork 功能。
- Markdown 格式、文件链接/新增锚点、JSON 有效性、`git diff --check` 及改动范围单独检查。主工作区和另一个 Agent 的工作树保留。
- 本轮只修改文档和内置 Markdown 指南，没有修改 runtime、tests、bun.lock 或生成 SDK，故未重跑完整运行时测试与 typecheck。`bun ci` 按锁文件成功安装检查依赖，没有改锁。

## CI 与发布边界

接受的 main `648f7cdf100b30ff046db7518d8f832473b61481` 与 compat `90abf6e447d7a5e5b405aba301bf1a951f469bf6` 的六个 test/typecheck/lint 结果已实时复核，链接由[同步记录](../../upstream-sync-2026-09-15-5198ff54.md#accepted-result-and-publication-evidence)维护。该证据属于旧接受 SHA，不属于本轮新文档提交。

审计阶段结束时，交付保存在隔离的文档分支中，尚未推送或合并 PR，也未更改历史 review thread 状态。随后用户批准依次实施建议及文档发布；这些后续操作需要各自范围的检查和提交证据，不能把本清单完整写成已经与最新 upstream 完全一致。
