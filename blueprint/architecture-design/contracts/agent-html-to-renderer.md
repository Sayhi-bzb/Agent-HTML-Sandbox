# agent-html through sanitize to renderer Contract

本文规定 agent-html 和 render config header 经 parse / sanitize 后到 renderer 的边界。

## Provider

parse / sanitize 层提供已检查的 agent-html 结构和 RenderConfig。

## Consumer

renderer 消费已检查结构和 RenderConfig，并生成页面。

## Rules

- renderer 只接收 parse / sanitize 后的结构。
- renderer 只接收 parse / sanitize 后的 RenderConfig。
- renderer 只渲染已注册积木。
- renderer 只按已注册 presentation profile 应用渲染风格。
- 未知标签不得绕过安全边界执行。
- 未知 render config key / value 不得绕过安全边界成为样式或脚本入口。
- script、危险属性和不受控外部资源默认不可进入 renderer。
- raw escape hatch 必须显式标记，并经过安全边界。

## Forbidden

- renderer 直接接收未检查的 agent 输出。
- renderer 直接接收未检查的 render config header。
- renderer 默认执行 agent 输出中的脚本。
- renderer 将 render config header 映射为任意 CSS、Tailwind class、shadcn props 或外部资源。
- renderer 将未知标签当作自由 HTML 执行。
