# CLI to Artifact Contract

本文规定 CLI 到 agent-html、renderer adapter 和 artifact 的边界。

## Provider

CLI 提供 `schema`、`validate`、`build`、`preview`、`inspect`、`doctor`、`config get`。

## Consumer

agent、developer 和 artifact delivery flow 消费 CLI。

## Rules

- `schema` 只输出 agent-facing contract。
- `validate` 必须经过 parse / validate / sanitize。
- `build` 必须经过 parse / validate / sanitize。
- `build` 必须复用 managed runtime、renderer adapter 和 portable output。
- `preview` 必须复用 build artifact 或同一 managed runtime renderer adapter。
- `config get` 只读取 schema 派生的默认视觉配置视图，不写入独立配置状态。
- `.agent.html` 是唯一 agent-facing document 输入和可检查中间表示。
- file document 必须进入同一 sanitize path。
- CLI 不改变 ComponentSchema、RenderConfig、renderer adapter 和 artifact 的权威边界。
- 默认 `build` / `preview` 不要求当前工作目录存在 `components.json`、Vite config 或 shadcn components。

## Forbidden

- CLI 直接渲染未检查 agent 输出。
- CLI 直接拼接自由 HTML 为交付物。
- CLI 暴露 shadcn props、Radix props、Tailwind class、`className`、`style` 或 event handlers。
- CLI 把 `config` 映射为任意 CSS、script、HTML attribute 或外部资源。
- CLI 使用独立 renderer 生成与 dev preview 不一致的 artifact。
- CLI 默认把 renderer runtime 写入当前工作目录。
