# Catalog to agent-html Contract

本文规定 Agent Component Catalog 到 agent-html 的边界。

## Provider

Agent Component Catalog 提供 agent-facing 组件能力。

## Consumer

agent 使用 Catalog 编写 agent-html。

## Rules

- Catalog 是 agent-facing 组件能力入口。
- agent-html 只能使用 Catalog 暴露的语义积木。
- Catalog 不暴露组件源码、内部样式和实现依赖。
- Tailwind class 和 shadcn/ui props 不属于 Catalog 主接口。
- 组件能力变化必须同步 Catalog。

## Forbidden

- agent 通过读取组件源码发现常规用法。
- agent-html 依赖未登记的语义积木。
- agent-facing 示例泄漏 `className`、Tailwind class 或内部 props。
