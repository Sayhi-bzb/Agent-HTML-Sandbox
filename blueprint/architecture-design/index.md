# Architecture Design Index

本索引用于路由 agent-html architecture 设计上下文。

## Documents

- `architecture.md`: 系统主干。
- `invariants.md`: 不可破坏假设。
- `contracts/index.md`: 层间契约入口。
- `type-surface.md`: 公共类型表面。

## Reading Order

实现任务：读取 `architecture.md` -> `invariants.md` -> `contracts/index.md`。

边界变更：读取 `contracts/index.md` -> `type-surface.md` -> `invariants.md`。

架构理解：读取 `../constitution.md` -> `architecture.md`。
