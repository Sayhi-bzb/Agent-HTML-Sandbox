# Catalog to agent-html Contract

本文规定 Agent Component Catalog 到 agent-html 和 render config header 的边界。

## Provider

Agent Component Catalog 提供 agent-facing 组件能力和 render config schema。

## Consumer

agent 使用 Catalog 编写 agent-html，并选择受控 render config。

## Rules

- Catalog 是 agent-facing 组件能力入口。
- Catalog 包含 base blocks 和 custom blocks。
- Catalog 包含允许的 render config key / value 枚举。
- agent-html 只能使用 Catalog 暴露的 base / custom blocks。
- render config header 只能选择 Catalog 暴露的 presentation profile。
- Catalog 不暴露组件源码、内部样式和实现依赖。
- Tailwind class 和完整 shadcn/ui props 不属于 Catalog 主接口。
- 组件能力变化必须同步 Catalog。

## Forbidden

- agent 通过读取组件源码发现常规用法。
- agent-html 依赖未登记的积木。
- render config header 写入 CSS、Tailwind class、shadcn props、script 或外部 URL。
- agent-facing 示例泄漏 `className`、Tailwind class 或内部 props。
