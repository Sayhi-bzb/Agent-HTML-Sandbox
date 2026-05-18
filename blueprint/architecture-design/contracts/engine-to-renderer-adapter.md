# Engine to Renderer Adapter Contract

本文规定 ahtml core engine 到 renderer adapter 的边界。

## Provider

ahtml core 提供 `SanitizedAgentHtml`、RenderConfig、ComponentSchema 和 diagnostics。

## Consumer

renderer adapter 消费 `SanitizedAgentHtml`，并使用 managed runtime 中的 UI 实现生成页面。

## Rules

- `SanitizedAgentHtml` 是 renderer adapter 的输入权威。
- renderer adapter 只能渲染已注册标准组件。
- renderer adapter 只按已验证 RenderConfig 选择 document style config，并消费其解析后的全局样式层与组件样式层结果。
- core engine 负责把 public visual config spelling 解析并归一为 checked RenderConfig；renderer adapter 不消费 raw header wording。
- renderer adapter 可以依赖 managed runtime 中的 React、shadcn/ui、Tailwind 或 Vite template。
- core engine 不反向依赖 renderer adapter、React、shadcn/ui、Tailwind 或 Vite。

## Forbidden

- renderer adapter 接收未检查的 agent 输出。
- renderer adapter 接收 cleaned HTML string 作为主输入。
- renderer adapter 将 render config header 映射为任意 CSS、Tailwind class、shadcn props、script 或外部资源。
- core engine import adapter、React component、shadcn component 或 Vite config。
