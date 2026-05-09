# Component Schema to agent-html Contract

本文规定 standardized component schema 到 agent-html 和 render config header 的边界。

## Provider

standardized component schema 提供 agent-facing 组件能力、props schema、slot 结构和 render config schema。

## Consumer

agent 使用 schema 编写标准 agent-html，并选择受控 render config。

## Rules

- schema 是 agent-facing 组件能力入口。
- agent-html 只能使用 schema 暴露的标准组件。
- agent-html 必须遵守标准组件的固定结构和 slot 规则。
- agent 可以填写 props 和 slots / children。
- render config header 只能选择 schema 暴露的 presentation profile。
- schema 不暴露组件源码、内部样式和实现依赖。
- Tailwind class、`className`、Radix props 和完整 shadcn/ui props 不属于 schema 主接口。
- 组件能力变化必须同步 schema 和 agent-facing 示例。

## Forbidden

- agent 通过读取组件源码发现常规用法。
- agent-html 依赖未登记的组件。
- agent 改标准组件的内部结构、间距、布局规则或样式实现。
- render config header 写入 CSS、Tailwind class、shadcn props、script 或外部 URL。
- agent-facing 示例泄漏 `className`、Tailwind class、Radix props、完整 shadcn/ui props 或内部结构。
