# CLI to Managed Runtime Contract

本文规定 ahtml CLI 到 managed runtime、template 和 renderer adapter 的边界。

## Provider

ahtml CLI 提供 runtime 初始化、检查和渲染编排。

## Consumer

managed runtime 消费 CLI 生成或安装的配置、renderer adapter 和 shadcn 组件。

## Rules

- 默认 runtime 位于用户级 `.ahtml` 目录，不位于当前工作目录。
- `ahtml init` 默认初始化或检查 managed runtime。
- 首次 `build` / `preview` 可以触发 runtime bootstrap，或给出明确初始化命令。
- shadcn components、theme、CSS variables 和 Tailwind 配置属于 managed runtime。
- CLI 必须能检查 renderer adapter 所需 runtime 组件是否存在。
- CLI 生成或安装的 renderer adapter 必须消费 `SanitizedAgentHtml`。
- Vite 可以作为 managed runtime template，不得成为 core engine 依赖。
- 当前工作目录默认只保留 agent-html 输入、配置和 portable artifact 输出。
- local-project mode、`init --scaffold`、`init --apply` 和 `agent-html.project.json` readiness 已删除。

## Forbidden

- CLI 默认把 Vite、React、Tailwind、shadcn/ui 或 renderer files 写入当前工作目录。
- CLI 把 shadcn component source 写入 core package。
- CLI 把 Tailwind class、完整 shadcn props 或 CSS token 任意值暴露给 ComponentSchema。
- CLI 隐式或显式覆盖用户项目 scaffold 文件。
- CLI 让 managed runtime 绕过 parse / sanitize 直接渲染 agent 输出。
