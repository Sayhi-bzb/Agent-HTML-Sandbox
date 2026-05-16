# agent-html through Core to Renderer Adapter Contract

本文规定 agent-html 和文档级视觉配置入口经 core parse / sanitize 后到 renderer adapter 的边界。

## Provider

core parse / sanitize 层提供已检查的标准组件结构、语义 props、slot 结构和已批准的视觉配置选择。

## Consumer

renderer adapter 消费已检查结构和 RenderConfig，通过通用 registry / resolver 生成内部 shadcn/native/composite React output 和最终 HTML output。

## Rules

- renderer adapter 只接收 parse / sanitize 后的结构。
- renderer adapter 只接收 parse / sanitize 后的 RenderConfig。
- renderer adapter 只渲染已注册标准组件。
- renderer adapter 只按已批准的 document style config reference，或在兼容期按其映射到的 profile alias 应用渲染风格。
- compatibility `profile` alias 到 checked RenderConfig 的归一化必须在 core 完成；renderer adapter 不应分辨 public header 的原始 spelling。
- renderer adapter 必须通过通用 resolver 为每个 registered component 提供明确渲染能力，输出 shadcn/native/composite React 结构或明确 unsupported diagnostics。
- shadcn-backed component 的正常路径应由语义 schema、ui / slot schema、required registry items、safe prop mapping 和 recursive slot resolution 驱动。
- renderer adapter 负责把语义节点映射到内部 UI 实现，而不是把 agent 当作 shadcn 组件作者。
- renderer adapter 不得把 registered component 的正常路径静默渲染为 generic section fallback。
- parse / sanitize 必须校验组件名、props、slot 结构、children 边界和视觉配置选择。
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
- renderer adapter 静默忽略 registered component 的语义 props。
- renderer adapter 把 compatibility profile alias 展开为 agent 必须理解的低层 shadcn 视觉参数。
- renderer adapter 为每个 shadcn-backed component 编写独立手搓 adapter 作为主路径。
