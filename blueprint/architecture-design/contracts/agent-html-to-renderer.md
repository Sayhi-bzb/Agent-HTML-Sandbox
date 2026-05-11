# agent-html through Core to Renderer Adapter Contract

本文规定 agent-html 和 render config header 经 core parse / sanitize 后到 renderer adapter 的边界。

## Provider

core parse / sanitize 层提供已检查的标准组件结构和 RenderConfig。

## Consumer

renderer adapter 消费已检查结构和 RenderConfig，并生成 React output 和 HTML output。

## Rules

- renderer adapter 只接收 parse / sanitize 后的结构。
- renderer adapter 只接收 parse / sanitize 后的 RenderConfig。
- renderer adapter 只渲染已注册标准组件。
- renderer adapter 只按已注册 presentation profile 应用渲染风格。
- parse / sanitize 必须校验组件名、props、slot 结构和 children 边界。
- 未知标签不得绕过安全边界执行。
- 未知 render config key / value 不得绕过安全边界成为样式或脚本入口。
- script、危险属性和不受控外部资源默认不可进入 renderer adapter。
- raw escape hatch 必须显式标记，并经过安全边界。

## Forbidden

- renderer adapter 直接接收未检查的 agent 输出。
- renderer adapter 直接接收未检查的 render config header。
- renderer adapter 默认执行 agent 输出中的脚本。
- renderer adapter 将 render config header 映射为任意 CSS、Tailwind class、shadcn props 或外部资源。
- renderer adapter 将未知标签当作自由 HTML 执行。
- renderer adapter 接受绕过 schema 的任意 props passthrough。
