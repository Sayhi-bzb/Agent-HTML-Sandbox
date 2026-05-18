# CLI to Managed Runtime Contract

本文规定 ahtml CLI 到 managed runtime、template 和 renderer adapter 的边界。

## Provider

ahtml CLI 提供 runtime 初始化、检查和渲染编排。

## Consumer

managed runtime 消费 CLI 生成或安装的配置、renderer adapter 和 shadcn-native UI surface。

## Rules

- 默认 runtime 位于用户级 `.ahtml` 目录，不位于当前工作目录。
- `ahtml setup` 默认初始化或检查 managed runtime，并可记录 shadcn preset、template、style、base、iconLibrary 和 registry item 选择。
- managed runtime UI surface 必须来自 shadcn template / init / registry。这里的 UI surface 包括 `components.json`、component files、CSS entry、theme tokens、base layer、Tailwind entry、dependencies、aliases、style、base 和 iconLibrary。
- ahtml 可以向 shadcn-native managed runtime 注入 renderer app、SSR/build glue、sanitized document、rendererSpec、verification data、diagnostics 和 output wiring，但不得替换 shadcn template surface。
- shadcn 组件 catalog、preset 名称和 preset code 校验应来自 shadcn 官方 package API，不由 ahtml 维护平行硬编码名单。
- 首次 `status` / `doctor` / `build` / `preview` 可以触发默认 runtime bootstrap，或给出明确初始化命令。
- CLI 生成 prompt-ui manifest，供 agent 读取可用 UI 底座、组件清单和安全边界。
- CLI 必须能检查 renderer adapter 所需 runtime 组件是否存在。
- CLI 必须能检查 shadcn runtime surface 是否完整：`shadcn info` 可识别项目、`components.json` 存在且字段有效、CSS path 存在、base/style/iconLibrary 与 runtime 支持一致、required registry items 已安装、required exports 存在、built CSS 包含 shadcn base layer 所需的 background/foreground/border surface。
- CLI 生成或安装的 renderer adapter 必须消费 `SanitizedAgentHtml`。
- Vite 可以作为 shadcn template 选择或 managed runtime 构建器，不得成为 core engine 依赖。
- 当前工作目录默认只保留 agent-html 输入、配置和 portable artifact 输出。
- local-project mode、`init --scaffold`、`init --apply` 和 `agent-html.project.json` readiness 已删除。

## Forbidden

- CLI 默认把 Vite、React、Tailwind、shadcn/ui 或 renderer files 写入当前工作目录。
- CLI 把 shadcn component source、global CSS、base layer 或 template files 写入 core package 作为主路径。
- CLI 维护平行的 shadcn UI kit、截断 global CSS、手写 shadcn base layer 或 pseudo runtime template。
- CLI 用 `shadcn apply --only theme` + `shadcn add` 替代完整 shadcn template / init。
- CLI 隐式或显式覆盖用户项目 scaffold 文件。
- CLI 让 managed runtime 绕过 parse / sanitize 直接渲染 agent 输出。
