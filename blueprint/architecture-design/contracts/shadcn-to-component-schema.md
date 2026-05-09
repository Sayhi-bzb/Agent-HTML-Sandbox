# shadcn/ui implementation to Component Schema Contract

本文规定 shadcn/ui 实现到标准组件 schema 的边界。

## Provider

UI implementation layer 基于 shadcn/ui 提供组件实现。

## Consumer

schema generation / maintenance layer 消费 shadcn registry、组件源码、`components.json` 和 explicit schema overlay，并产出 standardized component schema。

## Rules

- shadcn/ui 是 UI 实现底座。
- 标准组件必须固定结构、固定风格和固定组合边界。
- GeneratedShadcnIntrospection 可自动抽取 exports、`data-slot`、`cva` variants、literal union props、registry metadata、dependencies 和 docs links。
- ComponentSchemaOverlay 必须显式声明 expose、语义 props、slot 合法结构、children 边界和隐藏 props。
- ComponentSchema 必须由 GeneratedShadcnIntrospection 和 ComponentSchemaOverlay 合成。
- ComponentSchema 只描述 agent-facing 信息。
- ComponentSchema 必须包含允许 props、允许 slots / children 和使用禁忌。
- 组件实现可使用 Tailwind、Radix props 和 shadcn/ui props。
- 内部 props、Tailwind class、`className`、Radix props 和完整 shadcn/ui props 不进入 ComponentSchema 主接口。
- generated introspection、overlay 合成、schema 生成或同步失败不能静默通过。
- drift check 失败不能静默通过。

## Forbidden

- 自建独立 UI 底座来替代 shadcn/ui。
- GeneratedShadcnIntrospection 直接成为 agent-facing 协议。
- ComponentSchema 通过复制组件源码成为 agent-facing 文档。
- ComponentSchema 暴露内部样式、布局实现或源码结构。
- ComponentSchema 直接暴露完整 shadcn/ui props 作为 agent-facing 主接口。
- 组件能力变化后 schema 继续保持旧描述。
