# Blueprint Roadmap

本文记录 blueprint 文档交付清单。它不承载具体设计内容。

## Status

- todo: 尚未创建
- draft: 已创建但仍在设计
- stable: 可作为实现锚点

## Existing Documents

| Document | Purpose | Status |
|---|---|---|
| `blueprint_rule.md` | blueprint 写作规则 | stable |
| `index.md` | blueprint 上下文路由 | stable |
| `architecture-design/constitution.md` | agent-html 架构原则 | stable |
| `architecture-design/draft.md` | 架构设计草案 | draft |

## Delivery List

| Order | Document | Purpose | Status |
|---|---|---|---|
| 1 | `architecture-design/architecture.md` | 系统分层与依赖方向 | draft |
| 2 | `architecture-design/invariants.md` | 不可破坏的系统假设 | draft |
| 3 | `architecture-design/contracts/` | 层间契约 | draft |
| 4 | `architecture-design/type-surface.md` | 公共类型表面 | draft |
| 5 | `architecture-design/implementation-rules.md` | coder 实现约束 | draft |

## Future Notes

- 后续可考虑 `install-sandbox-skill`，作为 agent-html sandbox 的安装和配置入口。
- 后续可考虑 `agent-html-authoring-skill`，作为 agent 编写 artifact 时的协作使用入口。

后续新增或稳定 blueprint 文档时，应同步更新本清单状态。
