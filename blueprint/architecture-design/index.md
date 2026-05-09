# Architecture Design Index

本索引用于路由 agent-html architecture 设计上下文。

## Documents

- `constitution.md`: 长期原则。
- `architecture.md`: 系统主干。
- `invariants.md`: 不可破坏假设。
- `contracts/index.md`: 层间契约入口。
- `type-surface.md`: 公共类型表面。
- `implementation-rules.md`: coder 实现约束。
- `tool-candidates.md`: 工具候选和依赖评估。

## Reading Order

实现任务：读取 `architecture.md` -> `invariants.md` -> `implementation-rules.md`。

边界变更：读取 `contracts/index.md` -> `type-surface.md` -> `invariants.md`。

架构理解：读取 `constitution.md` -> `architecture.md`。

工具候选和依赖评估：读取 `tool-candidates.md`。
