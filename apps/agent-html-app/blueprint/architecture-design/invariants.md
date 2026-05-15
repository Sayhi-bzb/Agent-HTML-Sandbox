# Invariants

以下约束是 `agent-html-app` 的实现不变量。

## Source Invariants

- `source.agent.html` 是 session 唯一主文档。
- 任何可持久化修改都必须最终反映到 `source.agent.html`。
- `Preview` 不能直接编辑。
- `Inspect` 不能直接修改 source。

## Session Invariants

- 每个 session 都必须对应一个独立目录。
- session 骨架至少包含 `source.agent.html`、`session.json`、`build/`、`logs/`。
- 删除、重命名、pin 或状态变化都不得破坏目录骨架。
- session 必须可被单独备份和恢复。

## Build Invariants

- 正式 preview 只能读取最近一次成功 build 的输出。
- build 失败时不得覆盖上一次成功 preview。
- 任一 build 都必须留下可读日志与退出状态。
- build 结果与 inspect 结果必须能追溯到对应 session。

## Boundary Invariants

- UI 不能绕过 Rust 层直接读写 session 文件。
- 应用只能通过稳定 CLI 边界调用 `ahtml`。
- 禁止从 `agent-html` 仓库内部源码直接复制或 import 运行逻辑。

## Agent Invariants

- `Agent Shell` 在 v1 只是壳。
- 未来 agent 自动修改也必须表现为可追踪 proposal 或 patch，而不是静默覆盖 source。
- agent 不得成为 session 真相源。
