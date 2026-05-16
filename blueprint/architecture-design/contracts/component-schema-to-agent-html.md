# Component Schema to agent-html Contract

本文规定 standardized component schema 到 agent-html 和文档级视觉配置入口的边界。

## Provider

standardized component schema 提供 agent-facing 组件能力、props schema、slot 结构和受控视觉配置 schema。它可以把通用 ui / slot capability 包装成更易写的标准语法。

## Consumer

agent 使用 schema 编写标准 agent-html，并选择受控视觉配置入口。详细组件样式规则留在独立配置层，不进入正文积木协议。

## Rules

- schema 是 agent-facing 组件能力入口。
- agent-html 只能使用 schema 暴露的标准组件。
- agent-html 必须遵守标准组件的固定结构和 slot 规则。
- agent 可以填写 props 和 slots / children。
- prompt schema 应优先把 shadcn-backed 组件表达为通用 ui / slot 选择题，便捷标签也必须能归一到同一 capability model。
- render config header 或等价文档级配置入口只能选择 schema 暴露的 DocumentStyleConfigReference，或在兼容期选择 PresentationProfile alias。
- schema / prompt 对视觉选择的默认叙事应是 document style config reference；如果具体示例暂时仍使用 `profile`，必须把它标记为 compatibility alias，而不是独立长期 profile 系统。
- schema 不暴露组件源码、内部样式和实现依赖。
- Tailwind class、`className`、Radix props 和完整 shadcn/ui props 不属于 schema 主接口。
- 组件能力变化必须同步 schema 和 agent-facing 示例。
- schema 默认只能暴露通用 renderer registry / resolver 已支持的组件。planned 或 unsupported 组件必须显式标记，不能作为默认可用组件诱导 agent 使用。
- schema 中每个非纯文本 prop 必须有通用 safe prop mapping 或明确的 no-op 说明；不得让 renderer 静默丢弃语义 props。
- 组件级样式配置若存在，应通过独立配置层或外部引用进入，不应和正文语义节点混写。
- 未经单独产品决策，不得在这一迁移 lane 中再发明新的 component-level public config keys 或平行 visual syntax。

## Forbidden

- agent 通过读取组件源码发现常规用法。
- agent-html 依赖未登记的组件。
- agent 改标准组件的内部结构、间距、布局规则或样式实现。
- render config header 写入 CSS、Tailwind class、shadcn props、script、外部 URL 或内联组件样式规则。
- agent-facing 示例泄漏 `className`、Tailwind class、Radix props、完整 shadcn/ui props 或内部结构。
- schema 把安装过的 shadcn 组件等同于 agent-facing 组件能力。
- schema 为每个 shadcn 组件发明互不相通的私有语法，而不是归一到通用 ui / slot capability。
