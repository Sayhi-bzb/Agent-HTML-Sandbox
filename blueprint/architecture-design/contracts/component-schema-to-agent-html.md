# Component Schema to agent-html Contract

本文规定 standardized component schema 到 agent-html 和 render config header 的边界。

## Provider

standardized component schema 提供 agent-facing 组件能力、props schema、slot 结构和 render config schema。它可以把通用 ui / slot capability 包装成更易写的标准语法。

## Consumer

agent 使用 schema 编写标准 agent-html，并选择受控 render config。

## Rules

- schema 是 agent-facing 组件能力入口。
- agent-html 只能使用 schema 暴露的标准组件。
- agent-html 必须遵守标准组件的固定结构和 slot 规则。
- agent 可以填写 props 和 slots / children。
- prompt schema 应优先把 shadcn-backed 组件表达为通用 ui / slot 选择题，便捷标签也必须能归一到同一 capability model。
- render config header 只能选择 schema 暴露的 presentation profile。
- schema 不暴露组件源码、内部样式和实现依赖。
- Tailwind class、`className`、Radix props 和完整 shadcn/ui props 不属于 schema 主接口。
- 组件能力变化必须同步 schema 和 agent-facing 示例。
- schema 默认只能暴露通用 renderer registry / resolver 已支持的组件。planned 或 unsupported 组件必须显式标记，不能作为默认可用组件诱导 agent 使用。
- schema 中每个非纯文本 prop 必须有通用 safe prop mapping 或明确的 no-op 说明；不得让 renderer 静默丢弃语义 props。

## Forbidden

- agent 通过读取组件源码发现常规用法。
- agent-html 依赖未登记的组件。
- agent 改标准组件的内部结构、间距、布局规则或样式实现。
- render config header 写入 CSS、Tailwind class、shadcn props、script 或外部 URL。
- agent-facing 示例泄漏 `className`、Tailwind class、Radix props、完整 shadcn/ui props 或内部结构。
- schema 把安装过的 shadcn 组件等同于 agent-facing 组件能力。
- schema 为每个 shadcn 组件发明互不相通的私有语法，而不是归一到通用 ui / slot capability。
