# CLI to Artifact Contract

本文规定 CLI 到 agent-html、renderer adapter 和 artifact 的边界。

## Provider

CLI 提供 `schema`、`compose`、`validate`、`build`、`preview`、`inspect`、`doctor`、`config`。

## Consumer

agent、developer 和 artifact delivery flow 消费 CLI。

## Rules

- `schema` 只输出 agent-facing contract。
- `compose` 只产出标准 document。
- `validate` 必须经过 parse / validate / sanitize。
- `build` 必须经过 parse / validate / sanitize。
- `build` 必须复用 renderer adapter 和 portable output。
- `preview` 必须复用 build artifact 或同一 renderer adapter。
- `config` 只管理有限 presentation / output 配置。
- `.agent.html` 只是可检查中间表示。
- stdin、file 和 generated document 必须进入同一 sanitize path。
- CLI 不改变 ComponentSchema、RenderConfig、renderer adapter 和 artifact 的权威边界。

## Forbidden

- CLI 直接渲染未检查 agent 输出。
- CLI 直接拼接自由 HTML 为交付物。
- CLI 暴露 shadcn props、Radix props、Tailwind class、`className`、`style` 或 event handlers。
- CLI 把 `config` 映射为任意 CSS、script、HTML attribute 或外部资源。
- CLI 使用独立 renderer 生成与 dev preview 不一致的 artifact。
