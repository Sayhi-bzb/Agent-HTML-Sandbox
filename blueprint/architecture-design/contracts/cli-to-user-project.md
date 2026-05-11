# CLI to User Project Contract

本文规定 ahtml CLI 到用户项目、template 和 renderer adapter 的边界。

## Provider

ahtml CLI 提供项目初始化、检查和渲染编排。

## Consumer

用户项目消费 CLI 生成或安装的配置、renderer adapter 和 shadcn 组件。

## Rules

- `ahtml init` 可以创建新项目或接入现有项目。
- 用户选择 template / preset 后，CLI 才能调用 shadcn CLI 写入用户项目。
- shadcn components、theme、CSS variables 和 Tailwind 配置属于用户项目。
- CLI 必须能检查 renderer adapter 所需 shadcn components 是否存在。
- CLI 生成或安装的 renderer adapter 必须消费 `SanitizedAgentHtml`。
- Vite 可以作为默认 template，不得成为 core engine 依赖。
- 用户项目配置只能记录有限 project integration 信息，不得保存 agent-facing CSS、Tailwind class 或完整 shadcn props。

## Forbidden

- CLI 把 shadcn component source 写入 core package。
- CLI 把 Tailwind class、完整 shadcn props 或 CSS token 任意值暴露给 ComponentSchema。
- CLI 在未显式选择 template / preset 时隐式覆盖用户项目样式。
- CLI 让 generated project 绕过 parse / sanitize 直接渲染 agent 输出。
